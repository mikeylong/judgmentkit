import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const kitDir = path.dirname(fileURLToPath(import.meta.url));
const text = value => typeof value === "string" && value.trim().length > 0;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const nonnegative = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const timestamp = value => text(value) && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
const unique = values => new Set(values).size === values.length;
const sameSet = (actual, expected) => actual.length === expected.length && unique(actual) && expected.every(value => actual.includes(value));

export function validateManifest(manifest) {
  const errors = [];
  if (!object(manifest)) return ["manifest must be an object"];
  const tasks = Array.isArray(manifest.tasks) ? manifest.tasks : [];
  const conditions = Array.isArray(manifest.conditions) ? manifest.conditions : [];
  const builders = Array.isArray(manifest.builder_slots) ? manifest.builder_slots : [];
  const episodes = Array.isArray(manifest.episodes) ? manifest.episodes : [];
  const taskIds = tasks.map(task => task?.id);
  if (tasks.length !== 3 || !unique(taskIds) || !taskIds.every(text)) errors.push("three distinct tasks are required");
  if (!sameSet(conditions, ["ordinary_agent", "activity_checklist", "full_judgmentkit"])) errors.push("all three comparison conditions are required");
  if (builders.length !== 3 || !unique(builders) || !builders.every(text)) errors.push("three distinct builder slots are required");
  if (episodes.length !== 9 || !unique(episodes.map(episode => episode?.id))) errors.push("nine distinct episodes are required");
  for (const episode of episodes) {
    if (!object(episode) || !text(episode.id) || !taskIds.includes(episode.task_id) || !conditions.includes(episode.condition_id) || !builders.includes(episode.builder_slot) || ![1, 2, 3].includes(episode.order)) errors.push(`invalid episode ${episode?.id ?? "unknown"}`);
  }
  const pairs = episodes.map(episode => `${episode?.task_id}/${episode?.condition_id}`);
  if (pairs.length !== 9 || !unique(pairs)) errors.push("each task-condition pair must occur exactly once");
  for (const builder of builders) {
    const assigned = episodes.filter(episode => episode?.builder_slot === builder);
    if (!sameSet(assigned.map(episode => episode.task_id), taskIds) || !sameSet(assigned.map(episode => episode.condition_id), conditions) || !sameSet(assigned.map(episode => episode.order), [1, 2, 3])) errors.push(`${builder} must receive each task, condition, and order once`);
  }
  for (const order of [1, 2, 3]) {
    const assigned = episodes.filter(episode => episode?.order === order);
    if (!sameSet(assigned.map(episode => episode.task_id), taskIds) || !sameSet(assigned.map(episode => episode.condition_id), conditions)) errors.push(`order ${order} must contain every task and condition once`);
  }
  return errors;
}

export function configurationErrors(configuration, builderSlots) {
  if (!object(configuration)) return ["configuration is missing"];
  const errors = [];
  if (configuration.status !== "configured") errors.push("configuration has not been locked");
  for (const key of ["agent", "model", "implementation_system", "repair_policy"]) if (!text(configuration[key])) errors.push(`${key} is unconfigured`);
  if (!object(configuration.model_settings) || !Object.keys(configuration.model_settings).length || !Object.values(configuration.model_settings).every(value => text(value) || nonnegative(value))) errors.push("actual model settings are required");
  if (!Array.isArray(configuration.underlying_tools) || !configuration.underlying_tools.length || !configuration.underlying_tools.every(text)) errors.push("underlying tool versions are required");
  const budget = configuration.matched_generation_budget;
  if (!object(budget) || !text(budget.unit) || !nonnegative(budget.limit) || budget.limit === 0 || !text(budget.enforcement)) errors.push("generation budget needs an actual unit, positive limit, and enforcement policy");
  if (!nonnegative(configuration.total_elapsed_limit_minutes) || configuration.total_elapsed_limit_minutes === 0) errors.push("elapsed-time limit is unconfigured");
  if (!object(configuration.judgmentkit_versions) || !["skill", "runtime", "contract"].every(key => text(configuration.judgmentkit_versions[key]))) errors.push("actual JudgmentKit versions are required");
  if (!object(configuration.builder_overhead_limits) || !builderSlots.every(builder => nonnegative(configuration.builder_overhead_limits[builder]))) errors.push("each builder must specify tolerable extra minutes");
  if (!timestamp(configuration.preregistered_at)) errors.push("preregistration timestamp is required");
  return errors;
}

export function blankRun(manifest, sourceIdentity) {
  return {
    kind: "builder_usefulness_observations",
    source_identity: sourceIdentity,
    configuration: structuredClone(manifest.configuration),
    episodes: manifest.episodes.map(episode => ({
      episode_id: episode.id, task_id: episode.task_id, condition_id: episode.condition_id,
      builder_slot: episode.builder_slot, status: "not_run", candidate: null,
      builder_observation: null, end_user_observations: [], supporting_evidence: [], execution_accounting: null,
      termination_reason: null,
    })),
    repeat_use: [],
  };
}

function observationErrors(observation, episode, label) {
  if (!object(observation)) return [`${label} must be a recorded observation object`];
  const errors = [];
  for (const [key, value] of Object.entries({ episode_id: episode.episode_id, task_id: episode.task_id, condition_id: episode.condition_id, candidate_id: episode.candidate?.id, candidate_sha256: episode.candidate?.sha256 })) if (observation[key] !== value) errors.push(`${label}.${key} does not match the episode candidate`);
  for (const key of ["observer_id", "source_ref"]) if (!text(observation[key])) errors.push(`${label}.${key} is required`);
  if (!timestamp(observation.observed_at)) errors.push(`${label}.observed_at is required`);
  return errors;
}

export function buildReport(manifest, outcomes, run, expectedSourceIdentity) {
  const errors = validateManifest(manifest);
  const rows = [];
  if (!object(run)) return { valid: false, errors: [...errors, "run must be an object"], human_study_status: "not_run", product_value: "unmeasured" };
  if (!text(expectedSourceIdentity) || !text(run.source_identity) || run.source_identity !== expectedSourceIdentity) errors.push("run sources do not match a supplied current-kit identity; preserve the old kit or create a new run");
  const episodeRecords = Array.isArray(run.episodes) ? run.episodes : [];
  if (!sameSet(episodeRecords.map(episode => episode?.episode_id), manifest.episodes.map(episode => episode.id))) errors.push("run must retain all nine episode records exactly once");
  for (const assigned of manifest.episodes) {
    const episode = episodeRecords.find(record => record?.episode_id === assigned.id);
    if (!episode) continue;
    const previousErrorCount = errors.length;
    const label = assigned.id;
    for (const key of ["task_id", "condition_id", "builder_slot"]) if (episode[key] !== assigned[key]) errors.push(`${label}.${key} does not match the assignment`);
    if (!["not_run", "in_progress", "completed", "failed", "abandoned"].includes(episode.status)) errors.push(`${label}.status is invalid`);
    if (!Array.isArray(episode.end_user_observations) || !Array.isArray(episode.supporting_evidence)) { errors.push(`${label} needs observation and supporting-evidence arrays`); continue; }
    if (episode.status === "not_run") {
      if (episode.candidate !== null || episode.builder_observation !== null || episode.end_user_observations.length || episode.supporting_evidence.length || episode.execution_accounting != null) errors.push(`${label} has captured evidence despite not_run status`);
    } else {
      const candidate = episode.candidate;
      if (!object(candidate) || !text(candidate.id)) errors.push(`${label} needs a candidate or no-artifact attempt identity`);
      const hasArtifact = text(candidate?.artifact_ref) && /^[a-f0-9]{64}$/.test(candidate?.sha256 ?? "");
      const noArtifact = candidate?.artifact_ref === null && candidate?.sha256 === null;
      if (!hasArtifact && !noArtifact) errors.push(`${label} candidate needs an artifact reference and SHA256, or two nulls for a no-artifact attempt`);
      if (episode.status === "completed" && !hasArtifact) errors.push(`${label} completed build needs an exact artifact identity`);
      if (["failed", "abandoned"].includes(episode.status) && !text(episode.termination_reason)) errors.push(`${label} needs its failure or abandonment reason`);
      const observation = episode.builder_observation;
      errors.push(...observationErrors(observation, episode, `${label}.builder_observation`));
      if (object(observation)) {
        if (!text(observation.observed_actions)) errors.push(`${label} must describe observed builder actions`);
        if (!nonnegative(observation.setup_minutes) || !nonnegative(observation.total_minutes) || observation.setup_minutes > observation.total_minutes) errors.push(`${label} needs consistent observed setup and total minutes`);
        if (!["full_episode", "partial_episode"].includes(observation.log_coverage) || !Array.isArray(observation.events)) errors.push(`${label} needs an event log and its coverage`);
        for (const event of Array.isArray(observation.events) ? observation.events : []) {
          if (!object(event) || !["manual_correction", "question", "unnecessary_question", "false_stop", "substantive_review_attempt", "infrastructure_failure"].includes(event.type) || !timestamp(event.observed_at) || !text(event.description) || !text(event.source_ref)) errors.push(`${label} has an incomplete builder event`);
          if (["unnecessary_question", "false_stop"].includes(event?.type) && !text(event.assessment_reason)) errors.push(`${label} needs the reason for the observer's event assessment`);
        }
      }
    }
    const requiredChecks = outcomes.tasks.find(task => task.id === assigned.task_id)?.checks.map(check => check.id) ?? [];
    if (!requiredChecks.length) errors.push(`${label} has no task outcome criteria`);
    if (episode.end_user_observations.length && (!text(episode.candidate?.artifact_ref) || !/^[a-f0-9]{64}$/.test(episode.candidate?.sha256 ?? ""))) errors.push(`${label} end-user observations require an exact artifact identity`);
    const observedChecks = [];
    for (const observation of episode.end_user_observations) {
      errors.push(...observationErrors(observation, episode, `${label}.end_user_observation`));
      if (!object(observation)) continue;
      if (!text(observation.participant_id) || observation.participant_id === episode.builder_slot) errors.push(`${label} needs an independent end-user participant`);
      if (observation.observer_id === episode.builder_slot) errors.push(`${label} needs an assessor who did not build the candidate`);
      if (!Number.isInteger(observation.assessment_order) || observation.assessment_order < 1 || !["concealed", "revealed", "uncertain"].includes(observation.treatment_disclosure)) errors.push(`${label} must record assessment order and treatment disclosure`);
      if (!requiredChecks.includes(observation.check_id)) errors.push(`${label} has an unknown task check`);
      if (!["succeeded", "failed", "not_observed"].includes(observation.result)) errors.push(`${label} needs an observed result, not a completion boolean`);
      if (!text(observation.observed_action) || !text(observation.observed_result)) errors.push(`${label} must describe the action and result`);
      observedChecks.push(observation.check_id);
    }
    if (!unique(observedChecks)) errors.push(`${label} repeats a task check; retain repeated attempts in separate candidate records`);
    for (const evidence of episode.supporting_evidence) {
      errors.push(...observationErrors(evidence, episode, `${label}.supporting_evidence`));
      const levels = { model_judgment: "guide", declared_requirement_check: "check", supported_behavior_verification: "verify" };
      if (!object(evidence) || evidence.capability_level !== levels[evidence.kind] || !Object.hasOwn(levels, evidence.kind)) errors.push(`${label} supporting evidence has an invalid kind or capability level`);
      if (!["scope", "method", "result", "limitations"].every(key => text(evidence?.[key]))) errors.push(`${label} supporting evidence must name scope, method, result, and limitations`);
    }
    const accounting = episode.execution_accounting;
    if (accounting != null) {
      errors.push(...observationErrors(accounting, episode, `${label}.execution_accounting`));
      for (const key of ["generation_tokens", "total_tokens", "generation_requests", "total_requests", "tool_calls"]) if (accounting?.[key] !== null && !nonnegative(accounting?.[key])) errors.push(`${label} ${key} must be observed numeric usage or null when unavailable`);
      for (const [subset, total] of [["generation_tokens", "total_tokens"], ["generation_requests", "total_requests"]]) if (nonnegative(accounting?.[subset]) && nonnegative(accounting?.[total]) && accounting[subset] > accounting[total]) errors.push(`${label} total usage cannot exclude generation usage`);
      if (!text(accounting?.limitations)) errors.push(`${label} execution accounting must state coverage limits`);
    }
    const covered = sameSet(observedChecks, requiredChecks) && episode.end_user_observations.every(observation => ["succeeded", "failed"].includes(observation.result));
    const recordValid = errors.length === previousErrorCount;
    const taskResult = !recordValid ? "invalid_record" : covered ? (episode.end_user_observations.every(observation => observation.result === "succeeded") ? "observed_completion" : "observed_failure") : "unobserved_or_incomplete";
    const fullLog = episode.builder_observation?.log_coverage === "full_episode" && Array.isArray(episode.builder_observation?.events);
    const eventCounts = Object.fromEntries(["manual_correction", "question", "unnecessary_question", "false_stop", "substantive_review_attempt", "infrastructure_failure"].map(type => [type, fullLog ? episode.builder_observation.events.filter(event => event.type === type).length : null]));
    rows.push({ episode_id: label, task_id: assigned.task_id, condition_id: assigned.condition_id, record_valid: recordValid, build_status: episode.status, candidate_id: episode.candidate?.id ?? null, task_result: taskResult, setup_minutes: episode.builder_observation?.setup_minutes ?? null, total_minutes: episode.builder_observation?.total_minutes ?? null, event_counts: eventCounts, execution_accounting: accounting ?? null, supporting_evidence_count: episode.supporting_evidence.length, termination_reason: episode.termination_reason });
  }
  if (!Array.isArray(run.repeat_use)) errors.push("repeat_use must be an array");
  const returnEpisodeIds = new Set();
  for (const observation of Array.isArray(run.repeat_use) ? run.repeat_use : []) {
    if (!object(observation) || !["return_episode_id", "builder_slot", "task_id", "condition_id", "candidate_id", "observer_id", "source_ref", "observed_actions"].every(key => text(observation[key])) || !timestamp(observation.observed_at) || !/^[a-f0-9]{64}$/.test(observation.candidate_sha256 ?? "")) {
      errors.push("repeat use needs an observed return episode, exact artifact identity, actions, and evidence reference");
      continue;
    }
    const returnEpisodeId = observation.return_episode_id.trim();
    if (returnEpisodeIds.has(returnEpisodeId)) errors.push(`repeat use repeats return_episode_id ${returnEpisodeId}; record each return episode once`);
    returnEpisodeIds.add(returnEpisodeId);
  }
  const started = rows.filter(row => row.build_status !== "not_run").length;
  const observed = rows.filter(row => ["observed_completion", "observed_failure"].includes(row.task_result)).length;
  const configuration = configurationErrors(run.configuration, manifest.builder_slots);
  return {
    valid: errors.length === 0, errors,
    run_readiness: configuration.length ? "needs_configuration" : "configured",
    configuration_errors: configuration,
    comparison_ready: errors.length === 0 && configuration.length === 0,
    human_study_status: errors.length ? "invalid_records" : started === 0 ? "not_run" : observed === 9 ? "observed_round" : "in_progress",
    product_value: errors.length || started === 0 || observed === 0 ? "unmeasured" : "requires_human_interpretation",
    overall_pass: null,
    episodes_started: started, episodes_with_complete_task_observations: observed,
    failed_builds: rows.filter(row => row.build_status === "failed").length,
    abandoned_builds: rows.filter(row => row.build_status === "abandoned").length,
    observed_return_episodes: returnEpisodeIds.size,
    episodes: rows,
  };
}

export function readKit(directory = kitDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
  const outcomes = JSON.parse(fs.readFileSync(path.join(directory, "task-outcomes.json"), "utf8"));
  const inputs = ["manifest.json", "task-outcomes.json", "activity-checklist.md", ...manifest.tasks.flatMap(task => task.inputs)];
  const sourceIdentity = digest(inputs.map(input => `${input}\n${digest(fs.readFileSync(path.join(directory, input)))}`).join("\n"));
  return { manifest, outcomes, sourceIdentity };
}

function main(args) {
  const [command, option, directory] = args;
  if (!["init", "report"].includes(command) || option !== "--dir" || !text(directory) || args.length !== 3) throw new Error("Usage: node evals/builder-usefulness/report.mjs <init|report> --dir <fresh-local-run-directory>");
  const kit = readKit();
  const manifestErrors = validateManifest(kit.manifest);
  if (manifestErrors.length) throw new Error(manifestErrors.join("\n"));
  if (command === "init") {
    fs.mkdirSync(directory); // Refuse to overwrite any existing run directory.
    fs.writeFileSync(path.join(directory, "run.json"), `${JSON.stringify(blankRun(kit.manifest, kit.sourceIdentity), null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ created: path.resolve(directory, "run.json"), human_study_status: "not_run", run_readiness: "needs_configuration" }, null, 2));
  } else {
    const run = JSON.parse(fs.readFileSync(path.join(directory, "run.json"), "utf8"));
    const report = buildReport(kit.manifest, kit.outcomes, run, kit.sourceIdentity);
    console.log(JSON.stringify(report, null, 2));
    if (!report.valid) process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
