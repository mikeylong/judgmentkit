import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { blankRun, buildReport, configurationErrors, readKit, validateManifest } from "../evals/builder-usefulness/report.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { manifest, outcomes, sourceIdentity } = readKit();
const blank = () => blankRun(manifest, sourceIdentity);
const report = run => buildReport(manifest, outcomes, run, sourceIdentity);
const fakeHash = "a".repeat(64); // Test-only candidate. No human study is run by this test.
const observedAt = "2026-11-01T18:00:00Z";

function binding(episode) {
  return { episode_id: episode.episode_id, task_id: episode.task_id, condition_id: episode.condition_id, candidate_id: episode.candidate.id, candidate_sha256: episode.candidate.sha256, observer_id: "test-facilitator", observed_at: observedAt, source_ref: "test-only-session-note#10" };
}
function startEpisode(run, index = 0, status = "completed") {
  const episode = run.episodes[index];
  episode.status = status;
  episode.candidate = { id: `test-candidate-${episode.episode_id}`, artifact_ref: "test-only-candidate.html", sha256: fakeHash };
  episode.builder_observation = { ...binding(episode), observed_actions: "Test-only builder activity", setup_minutes: 2, total_minutes: 20, log_coverage: "full_episode", events: [] };
  return episode;
}
function observeTask(episode, failedCheck = null) {
  episode.end_user_observations = outcomes.tasks.find(task => task.id === episode.task_id).checks.map((check, index) => ({
    ...binding(episode), participant_id: "test-end-user", check_id: check.id,
    result: check.id === failedCheck ? "failed" : "succeeded",
    observed_action: "Test-only task action", observed_result: "Test-only task result",
    assessment_order: index + 1, treatment_disclosure: "concealed",
  }));
}

assert.deepEqual(validateManifest(manifest), []);
for (const task of manifest.tasks) for (const input of task.inputs) assert.ok(fs.existsSync(path.join(root, "evals/builder-usefulness", input)), `${input} should exist`);
assert.equal(manifest.human_study_status, "not_run");
assert.equal(manifest.configuration.status, "unconfigured");
const emptyReport = report(blank());
assert.equal(emptyReport.valid, true);
assert.equal(emptyReport.human_study_status, "not_run");
assert.equal(emptyReport.run_readiness, "needs_configuration");
assert.equal(emptyReport.product_value, "unmeasured");
assert.equal(emptyReport.overall_pass, null);
assert.equal(emptyReport.observed_return_episodes, 0);
assert.ok(emptyReport.episodes.every(episode => episode.total_minutes === null && episode.task_result === "unobserved_or_incomplete"));

const badSchedule = structuredClone(manifest);
badSchedule.episodes[0].condition_id = "full_judgmentkit";
assert.ok(validateManifest(badSchedule).some(error => error.includes("task-condition")));
const wrongOrder = structuredClone(manifest);
wrongOrder.episodes[0].order = 2;
assert.ok(validateManifest(wrongOrder).some(error => error.includes("order")));

const missing = blank();
const missingEpisode = startEpisode(missing);
missingEpisode.builder_observation = true;
missingEpisode.end_user_observations = [true];
const missingReport = report(missing);
assert.equal(missingReport.valid, false);
assert.equal(missingReport.product_value, "unmeasured");
assert.equal(missingReport.overall_pass, null);
assert.ok(missingReport.errors.some(error => error.includes("observation object")));

const supportingOnly = blank();
const supportingEpisode = startEpisode(supportingOnly);
supportingEpisode.supporting_evidence.push({ ...binding(supportingEpisode), kind: "declared_requirement_check", capability_level: "check", scope: "Declared keyboard path", method: "test-only static assertion", result: "pass", limitations: "No person attempted the task" });
assert.equal(report(supportingOnly).valid, true);
assert.equal(report(supportingOnly).product_value, "unmeasured");
assert.equal(report(supportingOnly).episodes[0].task_result, "unobserved_or_incomplete");

const observed = blank();
const observedEpisode = startEpisode(observed);
observeTask(observedEpisode);
assert.equal(report(observed).valid, true);
assert.equal(report(observed).episodes[0].task_result, "observed_completion");
assert.equal(report(observed).product_value, "requires_human_interpretation");
assert.equal(report(observed).overall_pass, null);

const wrongCandidate = structuredClone(observed);
wrongCandidate.episodes[0].end_user_observations[0].candidate_id = "earlier-candidate";
assert.equal(report(wrongCandidate).valid, false);
assert.ok(report(wrongCandidate).errors.some(error => error.includes("candidate_id")));
assert.equal(report(wrongCandidate).episodes[0].task_result, "invalid_record");
assert.equal(report(wrongCandidate).episodes_with_complete_task_observations, 0);
assert.equal(report(wrongCandidate).product_value, "unmeasured");
const changedHash = structuredClone(observed);
changedHash.episodes[0].candidate.sha256 = "b".repeat(64);
assert.equal(report(changedHash).valid, false);
assert.equal(report(changedHash).episodes[0].task_result, "invalid_record");
assert.ok(report(changedHash).errors.some(error => error.includes("candidate_sha256")));
const wrongTask = structuredClone(observed);
wrongTask.episodes[0].builder_observation.task_id = "room_guide";
assert.equal(report(wrongTask).valid, false);
const booleanCompletion = structuredClone(observed);
booleanCompletion.episodes[0].end_user_observations[0].result = true;
assert.equal(report(booleanCompletion).valid, false);
assert.equal(report(booleanCompletion).episodes[0].task_result, "invalid_record");

const failures = blank();
const failed = startEpisode(failures, 0, "failed");
failed.termination_reason = "Test-only build failure";
failed.candidate.artifact_ref = null;
failed.candidate.sha256 = null;
failed.builder_observation.candidate_sha256 = null;
const abandoned = startEpisode(failures, 1, "abandoned");
abandoned.termination_reason = "Test-only builder stopped after repeated repair";
const failedResult = startEpisode(failures, 2);
observeTask(failedResult, "empty_and_recovery");
const failureReport = report(failures);
assert.equal(failureReport.valid, true);
assert.equal(failureReport.failed_builds, 1);
assert.equal(failureReport.abandoned_builds, 1);
assert.equal(failureReport.episodes.length, 9);
assert.equal(failureReport.episodes[2].task_result, "observed_failure");
assert.equal(failureReport.overall_pass, null);
const missingEpisodeRecord = blank();
missingEpisodeRecord.episodes.pop();
assert.equal(report(missingEpisodeRecord).valid, false);

const partialLog = structuredClone(observed);
partialLog.episodes[0].builder_observation.log_coverage = "partial_episode";
assert.equal(report(partialLog).episodes[0].event_counts.manual_correction, null);
const modelAsVerification = structuredClone(supportingOnly);
modelAsVerification.episodes[0].supporting_evidence[0].kind = "model_judgment";
modelAsVerification.episodes[0].supporting_evidence[0].capability_level = "verify";
assert.equal(report(modelAsVerification).valid, false);
const fakeReturn = blank();
fakeReturn.repeat_use = [true];
assert.equal(report(fakeReturn).valid, false);
assert.equal(buildReport(manifest, outcomes, blank(), "changed-source").valid, false);
assert.equal(buildReport(manifest, outcomes, blank()).valid, false);
const invalidArrays = blank();
invalidArrays.episodes = true;
assert.equal(report(invalidArrays).valid, false);
const invalidEventLog = structuredClone(observed);
invalidEventLog.episodes[0].builder_observation.events = true;
assert.equal(report(invalidEventLog).valid, false);
const invalidRepeatList = blank();
invalidRepeatList.repeat_use = true;
assert.equal(report(invalidRepeatList).valid, false);
const invalidUsage = structuredClone(observed);
invalidUsage.episodes[0].execution_accounting = { ...binding(invalidUsage.episodes[0]), generation_tokens: 10, total_tokens: 5, generation_requests: 1, total_requests: 1, tool_calls: null, limitations: "Test-only inconsistent numbers" };
assert.equal(report(invalidUsage).valid, false);
const unknownUsage = structuredClone(observed);
unknownUsage.episodes[0].execution_accounting = { ...binding(unknownUsage.episodes[0]), generation_tokens: null, total_tokens: null, generation_requests: 1, total_requests: 4, tool_calls: 3, limitations: "Test-only provider did not report tokens" };
assert.equal(report(unknownUsage).valid, true);
assert.equal(report(unknownUsage).episodes[0].execution_accounting.total_tokens, null);

const configuration = {
  status: "configured", agent: "test-agent@1", model: "test-model@1", model_settings: { effort: "test-effort" },
  implementation_system: "test-local-html", underlying_tools: ["test-tool@1"],
  matched_generation_budget: { unit: "test-token", limit: 100, enforcement: "test hard cap" },
  total_elapsed_limit_minutes: 30, repair_policy: "test-only two repair limit",
  judgmentkit_versions: { skill: "test@1", runtime: "test@1", contract: "test@1" },
  builder_overhead_limits: { builder_1: 4, builder_2: 5, builder_3: 3 }, preregistered_at: observedAt,
};
assert.deepEqual(configurationErrors(configuration, manifest.builder_slots), []);
configuration.matched_generation_budget.limit = null;
assert.ok(configurationErrors(configuration, manifest.builder_slots).length > 0);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "jk-builder-kit-test-"));
try {
  const runDir = path.join(temp, "fresh-run");
  const command = (...args) => spawnSync(process.execPath, [path.join(root, "evals/builder-usefulness/report.mjs"), ...args], { cwd: root, encoding: "utf8" });
  assert.equal(command("init", "--dir", runDir).status, 0);
  assert.equal(command("init", "--dir", runDir).status, 1);
  const result = command("report", "--dir", runDir);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).human_study_status, "not_run");
  const retained = fs.readFileSync(path.join(runDir, "run.json"), "utf8");
  command("report", "--dir", runDir);
  assert.equal(fs.readFileSync(path.join(runDir, "run.json"), "utf8"), retained);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }

console.log("builder usefulness: balanced coverage, honest missing evidence, retained failures, candidate binding, capability limits, configuration, and non-overwriting CLI pass");
