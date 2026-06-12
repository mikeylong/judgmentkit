#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getMcpMetadata, handleToolCall } from "../src/mcp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

export const CASES_PATH = path.join(__dirname, "mcp-pilot-cases.json");
export const DEFAULT_CAPTURE_DIR = path.join(__dirname, "mcp-pilot-captures");
export const DEFAULT_REPORTS_DIR = path.join(__dirname, "reports", "mcp-pilot");
export const REPORT_JSON_FILENAME = "mcp-pilot-report.json";
export const REPORT_HTML_FILENAME = "mcp-pilot-report.html";
export const CATALOG_JSON_FILENAME = "index.json";
export const CATALOG_HTML_FILENAME = "index.html";
export const EVAL_ID = "judgmentkit-mcp-private-pilot-v1";
export const CATALOG_ID = "judgmentkit-mcp-private-pilot-runs";
export const MODEL_ID = "gpt-5.5";
export const REASONING_EFFORT = "xhigh";
export const VARIANT_IDS = ["baseline_no_mcp", "judgmentkit_mcp"];
export const METRIC_IDS = [
  "activity_fit",
  "decision_support",
  "evidence_grounding",
  "disclosure_discipline",
  "handoff_quality",
  "rework_risk",
];
export const HIDDEN_TREATMENT_TERMS = [
  "baseline_no_mcp",
  "judgmentkit_mcp",
  "JudgmentKit MCP",
  "Baseline without MCP",
];

const CAPTURE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["response", "next_action", "questions", "handoff", "rationale"],
  properties: {
    response: { type: "string" },
    next_action: { type: "string" },
    questions: { type: "array", items: { type: "string" } },
    handoff: {
      type: "object",
      additionalProperties: { type: "string" },
    },
    rationale: { type: "string" },
  },
};

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactJson(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function round(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hasPhrase(text, phrase) {
  return normalizeText(text).includes(normalizeText(phrase));
}

function coverageScore(text, terms) {
  const expected = terms ?? [];
  const present = expected.filter((term) => hasPhrase(text, term));
  const missing = expected.filter((term) => !hasPhrase(text, term));
  const score = expected.length === 0 ? 5 : (present.length / expected.length) * 5;

  return {
    score: round(score),
    present,
    missing,
  };
}

function questionCount(capture) {
  const parsed = capture?.parsed ?? {};
  if (Array.isArray(parsed.questions)) return parsed.questions.length;
  const text = captureText(capture);
  return (text.match(/\?/g) ?? []).length;
}

function captureText(capture) {
  if (!capture) return "";
  const parsed = capture.parsed ?? capture;
  return [
    parsed.response,
    parsed.next_action,
    parsed.rationale,
    Array.isArray(parsed.questions) ? parsed.questions.join("\n") : "",
    parsed.handoff ? compactJson(parsed.handoff) : "",
    capture.raw_response,
  ]
    .filter(Boolean)
    .join("\n");
}

function captureHandoffText(capture) {
  return compactJson(capture?.parsed?.handoff ?? {});
}

function expectedActionScore(testCase, capture) {
  if (!testCase.expected_next_action) {
    return { score: 5, present: [], missing: [] };
  }

  const text = captureText(capture);
  const actionTerms = normalizeText(testCase.expected_next_action)
    .split(" ")
    .filter((term) => term.length > 3);
  const present = actionTerms.filter((term) => hasPhrase(text, term));
  const coverage = actionTerms.length === 0 ? 1 : present.length / actionTerms.length;

  return {
    score: round(coverage * 5),
    present,
    missing: actionTerms.filter((term) => !present.includes(term)),
  };
}

function disclosureScore(testCase, capture) {
  const text = captureText(capture);
  const leaks = (testCase.forbidden_terms ?? []).filter((term) => hasPhrase(text, term));
  const penalty = leaks.length * 1.25;

  return {
    score: round(Math.max(0, 5 - penalty)),
    leaks,
    critical_leak_count: leaks.length,
  };
}

function handoffScore(testCase, capture) {
  return coverageScore(captureHandoffText(capture), testCase.required_handoff_fields ?? []);
}

function reworkScore(testCase, capture) {
  const text = captureText(capture);
  const required = coverageScore(text, testCase.required_terms?.rework_risk ?? []);
  const overQuestionLimit = Math.max(0, questionCount(capture) - Number(testCase.max_questions ?? 0));
  const questionPenalty = Math.min(2, overQuestionLimit);
  const score = Math.max(0, required.score - questionPenalty);

  return {
    ...required,
    score: round(score),
    question_count: questionCount(capture),
    max_questions: testCase.max_questions,
    question_penalty: questionPenalty,
  };
}

function metricScore(testCase, capture, metricId) {
  if (metricId === "disclosure_discipline") {
    return disclosureScore(testCase, capture);
  }

  if (metricId === "handoff_quality") {
    return handoffScore(testCase, capture);
  }

  if (metricId === "rework_risk") {
    return reworkScore(testCase, capture);
  }

  if (metricId === "decision_support") {
    const coverage = coverageScore(captureText(capture), testCase.required_terms?.decision_support ?? []);
    const action = expectedActionScore(testCase, capture);
    return {
      score: round((coverage.score + action.score) / 2),
      present: coverage.present,
      missing: coverage.missing,
      expected_action_score: action.score,
    };
  }

  return coverageScore(captureText(capture), testCase.required_terms?.[metricId] ?? []);
}

export function readCases(filePath = CASES_PATH) {
  return readJson(filePath);
}

export function validateCases(cases) {
  const failures = [];
  if (!Array.isArray(cases)) {
    throw new Error("mcp pilot cases must be an array.");
  }

  if (cases.length !== 20) {
    failures.push(`expected exactly 20 cases, got ${cases.length}`);
  }

  const seenIds = new Set();
  for (const testCase of cases) {
    if (!testCase.id) failures.push("case missing id");
    if (seenIds.has(testCase.id)) failures.push(`duplicate case id ${testCase.id}`);
    seenIds.add(testCase.id);

    for (const field of [
      "title",
      "task_prompt",
      "case_type",
      "source_context",
      "expected_next_action",
      "required_terms",
      "forbidden_terms",
      "required_handoff_fields",
      "scoring_weights",
      "minimum_score_delta",
    ]) {
      if (testCase[field] === undefined) {
        failures.push(`${testCase.id} missing ${field}`);
      }
    }

    const variantIds = (testCase.variants ?? []).map((variant) => variant.id);
    if (JSON.stringify(variantIds) !== JSON.stringify(VARIANT_IDS)) {
      failures.push(`${testCase.id} variants must be ${VARIANT_IDS.join(", ")}`);
    }

    for (const hiddenTerm of HIDDEN_TREATMENT_TERMS) {
      if (hasPhrase(testCase.task_prompt, hiddenTerm)) {
        failures.push(`${testCase.id} task_prompt leaked treatment term ${hiddenTerm}`);
      }
    }

    for (const metricId of METRIC_IDS) {
      if (typeof testCase.scoring_weights?.[metricId] !== "number") {
        failures.push(`${testCase.id} missing scoring weight for ${metricId}`);
      }
      if (!Array.isArray(testCase.required_terms?.[metricId])) {
        failures.push(`${testCase.id} missing required_terms.${metricId}`);
      }
    }

    const weightTotal = METRIC_IDS.reduce(
      (sum, metricId) => sum + (testCase.scoring_weights?.[metricId] ?? 0),
      0,
    );
    if (Math.round(weightTotal * 1000) !== 1000) {
      failures.push(`${testCase.id} scoring weights must sum to 1, got ${weightTotal}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`mcp pilot case validation failed:\n${failures.join("\n")}`);
  }

  return true;
}

function summarizeToolResult(result) {
  if (!result || typeof result !== "object") return { status: "unknown" };
  if ("error" in result) return { status: "error", code: result.error?.code, message: result.error?.message };

  const status =
    result.review_status ??
    result.handoff_status ??
    result.implementation_contract_status ??
    result.implementation_review_status ??
    result.recommendation_status ??
    result.status ??
    "ok";

  return {
    status,
    surface_type: result.recommended_surface_type ?? result.surface_type,
    profile_id: result.guidance_profile?.profile_id,
    targeted_questions_count: result.review?.targeted_questions?.length,
  };
}

async function recordToolCall(toolCalls, name, args) {
  const result = await handleToolCall(name, args);
  toolCalls.push({
    name,
    args_sha256: hash(compactJson(args)),
    summary: summarizeToolResult(result),
    result,
  });

  return result;
}

export async function buildMcpContextForCase(testCase) {
  const toolCalls = [];
  const brief = testCase.source_context?.brief ?? "";

  if (testCase.case_type === "activity_translation" || testCase.case_type === "missing_context_restraint") {
    const activityReview = await recordToolCall(toolCalls, "create_activity_model_review", { brief });
    await recordToolCall(toolCalls, "recommend_surface_types", {
      brief,
      activity_review: activityReview,
    });
    await recordToolCall(toolCalls, "recommend_ui_workflow_profiles", { brief });
  } else if (testCase.case_type === "candidate_validation") {
    const toolName =
      testCase.candidate_kind === "activity_model"
        ? "review_activity_model_candidate"
        : "review_ui_workflow_candidate";
    await recordToolCall(toolCalls, toolName, {
      brief,
      candidate: testCase.candidate,
      ...(toolName === "review_ui_workflow_candidate"
        ? { profile_id: "operator-review-ui", surface_type: "workbench" }
        : {}),
    });
  } else if (testCase.case_type === "operator_review_handoff") {
    const workflowReview = await recordToolCall(toolCalls, "review_ui_workflow_candidate", {
      brief,
      candidate: testCase.candidate,
      profile_id: "operator-review-ui",
      surface_type: "workbench",
    });
    const implementationContract = await recordToolCall(
      toolCalls,
      "create_ui_implementation_contract",
      {
        target_stack: "React",
        approved_primitives: ["queue", "detail panel", "decision controls", "handoff receipt"],
        static_rules: ["npm test"],
        browser_qa_checks: ["desktop review", "mobile review"],
      },
    );

    if (workflowReview?.review_status === "ready_for_review") {
      await recordToolCall(toolCalls, "create_ui_generation_handoff", {
        workflow_review: workflowReview,
        implementation_contract: implementationContract,
      });
    }
  } else if (testCase.case_type === "implementation_review") {
    const implementationContract = await recordToolCall(
      toolCalls,
      "create_ui_implementation_contract",
      testCase.implementation_contract_args ?? {},
    );
    await recordToolCall(toolCalls, "review_ui_implementation_candidate", {
      implementation_contract: implementationContract,
      candidate: testCase.implementation_candidate,
    });
  } else {
    throw new Error(`${testCase.id} has unsupported case_type ${testCase.case_type}.`);
  }

  return {
    case_id: testCase.id,
    tool_sequence: toolCalls.map((call) => call.name),
    tool_calls: toolCalls,
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    capture: false,
    strict: false,
    cases: null,
    captureDir: process.env.JUDGMENTKIT_MCP_PILOT_CAPTURE_DIR ?? DEFAULT_CAPTURE_DIR,
    reportsDir: process.env.JUDGMENTKIT_MCP_PILOT_REPORTS_DIR ?? DEFAULT_REPORTS_DIR,
    runDate:
      process.env.JUDGMENTKIT_MCP_PILOT_RUN_DATE ??
      process.env.JUDGMENTKIT_UI_EVAL_RUN_DATE ??
      new Date().toISOString().slice(0, 10),
    mcpVersion:
      process.env.JUDGMENTKIT_MCP_PILOT_MCP_VERSION ??
      process.env.JUDGMENTKIT_UI_EVAL_MCP_VERSION ??
      getMcpMetadata().version,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--capture") args.capture = true;
    else if (arg === "--strict") args.strict = true;
    else if (arg === "--cases") args.cases = argv[++index]?.split(",").filter(Boolean) ?? [];
    else if (arg === "--capture-dir") args.captureDir = argv[++index];
    else if (arg === "--reports-dir") args.reportsDir = argv[++index];
    else throw new Error(`Unsupported argument: ${arg}`);
  }

  return args;
}

function filterCases(cases, selectedCaseIds) {
  if (!selectedCaseIds) return cases;
  const selected = new Set(selectedCaseIds);
  const filtered = cases.filter((testCase) => selected.has(testCase.id));
  const missing = selectedCaseIds.filter((caseId) => !cases.some((testCase) => testCase.id === caseId));
  if (missing.length > 0) {
    throw new Error(`Unknown mcp pilot case id(s): ${missing.join(", ")}`);
  }
  return filtered;
}

export function captureFilePath(captureDir, caseId, variantId) {
  return path.join(captureDir, caseId, `${variantId}.json`);
}

function loadCapture(captureDir, testCase, variant) {
  const filePath = captureFilePath(captureDir, testCase.id, variant.id);
  if (!fs.existsSync(filePath)) return null;
  const capture = readJson(filePath);
  if (capture.case_id !== testCase.id || capture.variant_id !== variant.id) {
    throw new Error(`Capture mismatch in ${filePath}.`);
  }
  return capture;
}

function buildCapturePrompt(testCase, variant, mcpContext) {
  return [
    "You are producing one private JudgmentKit MCP pilot benchmark response.",
    "Return JSON only. Do not include Markdown fences.",
    "Shape: response, next_action, questions, handoff, rationale.",
    "Questions must be targeted and only used when source context is missing.",
    "",
    `Case: ${testCase.title}`,
    `Task: ${testCase.task_prompt}`,
    `Source brief: ${testCase.source_context?.brief}`,
    testCase.candidate ? `Candidate fixture:\n${compactJson(testCase.candidate)}` : "",
    testCase.implementation_candidate
      ? `Implementation candidate:\n${compactJson(testCase.implementation_candidate)}`
      : "",
    `Expected next action for scoring: ${testCase.expected_next_action}`,
    `Required handoff fields: ${(testCase.required_handoff_fields ?? []).join(", ")}`,
    `Forbidden terms for primary response: ${(testCase.forbidden_terms ?? []).join(", ")}`,
    "",
    variant.id === "judgmentkit_mcp"
      ? `JudgmentKit MCP context to use:\n${compactJson(mcpContext)}`
      : "No JudgmentKit MCP context is available. Work only from the source brief and fixture.",
  ]
    .filter(Boolean)
    .join("\n");
}

function runCodexCapture(prompt, testCase, variant, outputSchemaPath, outputFilePath) {
  const args = [
    "exec",
    "--model",
    MODEL_ID,
    "-c",
    `model_reasoning_effort="${REASONING_EFFORT}"`,
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
    "--ephemeral",
    "--color",
    "never",
    "--output-schema",
    outputSchemaPath,
    "--output-last-message",
    outputFilePath,
    "-",
  ];

  const execution = spawnSync("codex", args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    input: prompt,
    maxBuffer: 80 * 1024 * 1024,
    timeout: Number(process.env.JUDGMENTKIT_MCP_PILOT_CAPTURE_TIMEOUT_MS ?? 900_000),
  });

  if (execution.error) throw execution.error;
  if (execution.status !== 0) {
    throw new Error(
      `codex capture failed for ${testCase.id}/${variant.id} with status ${execution.status}\n${execution.stderr}`,
    );
  }

  return {
    status: execution.status,
    stdout_sha256: hash(execution.stdout ?? ""),
    stderr_sha256: hash(execution.stderr ?? ""),
    command_display: `codex ${args
      .map((arg) => (arg === outputSchemaPath ? "<schema>" : arg === outputFilePath ? "<output>" : arg))
      .join(" ")}`,
  };
}

async function captureVariant(testCase, variant, mcpContext, captureDir) {
  const prompt = buildCapturePrompt(testCase, variant, mcpContext);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-capture-"));
  const outputSchemaPath = path.join(tempDir, "schema.json");
  const outputFilePath = path.join(tempDir, `${testCase.id}-${variant.id}.json`);
  fs.writeFileSync(outputSchemaPath, JSON.stringify(CAPTURE_OUTPUT_SCHEMA, null, 2));

  const execution = runCodexCapture(prompt, testCase, variant, outputSchemaPath, outputFilePath);
  const rawResponse = fs.readFileSync(outputFilePath, "utf8");
  const parsed = JSON.parse(rawResponse);
  const sourceContext = compactJson({
    source_context: testCase.source_context,
    candidate: testCase.candidate,
    implementation_candidate: testCase.implementation_candidate,
    mcp_context: variant.id === "judgmentkit_mcp" ? mcpContext : null,
  });

  const capture = {
    capture_type: "codex-output-transcript",
    case_id: testCase.id,
    variant_id: variant.id,
    treatment: variant.treatment,
    model: MODEL_ID,
    cli: "codex",
    reasoning_effort: REASONING_EFFORT,
    runner: "evals/run-mcp-pilot-evals.mjs",
    captured_at: new Date().toISOString(),
    source_context_sha256: hash(sourceContext),
    prompt_sha256: hash(prompt),
    mcp_context_sha256: variant.id === "judgmentkit_mcp" ? hash(compactJson(mcpContext)) : null,
    raw_response_sha256: hash(rawResponse),
    raw_response: rawResponse,
    parsed,
    execution,
  };

  writeJson(captureFilePath(captureDir, testCase.id, variant.id), capture);
  return capture;
}

export function scoreVariant(testCase, variant, capture) {
  if (!capture) {
    return {
      id: variant.id,
      label: variant.label,
      treatment: variant.treatment,
      status: "capture-required",
      score: null,
      metric_results: {},
      critical_disclosure_leaks: [],
    };
  }

  const metric_results = {};
  let total = 0;
  for (const metricId of METRIC_IDS) {
    const metric = metricScore(testCase, capture, metricId);
    metric_results[metricId] = metric;
    total += metric.score * 20 * testCase.scoring_weights[metricId];
  }

  return {
    id: variant.id,
    label: variant.label,
    treatment: variant.treatment,
    status: "evaluated",
    score: round(total),
    metric_results,
    question_count: questionCount(capture),
    critical_disclosure_leaks: metric_results.disclosure_discipline.leaks ?? [],
    capture: {
      capture_file: path.join(testCase.id, `${variant.id}.json`),
      model: capture.model ?? MODEL_ID,
      raw_response_sha256: capture.raw_response_sha256 ?? hash(capture.raw_response ?? ""),
      prompt_sha256: capture.prompt_sha256 ?? null,
      mcp_context_sha256: capture.mcp_context_sha256 ?? null,
    },
  };
}

export function scoreCase(testCase, capturesByVariant) {
  const variants = testCase.variants.map((variant) =>
    scoreVariant(testCase, variant, capturesByVariant?.[variant.id] ?? null),
  );
  const baseline = variants.find((variant) => variant.id === "baseline_no_mcp");
  const guided = variants.find((variant) => variant.id === "judgmentkit_mcp");
  const captureRequired = variants.some((variant) => variant.status === "capture-required");

  if (captureRequired) {
    return {
      id: testCase.id,
      title: testCase.title,
      case_type: testCase.case_type,
      status: "capture-required",
      passed: false,
      expected_next_action: testCase.expected_next_action,
      minimum_score_delta: testCase.minimum_score_delta,
      variants,
    };
  }

  const score_delta = round(guided.score - baseline.score);
  const winner =
    score_delta > 0 ? "judgmentkit_mcp" : score_delta < 0 ? "baseline_no_mcp" : "tie";
  const guidedCriticalLeaks = guided.critical_disclosure_leaks ?? [];
  const passed = score_delta >= testCase.minimum_score_delta && guidedCriticalLeaks.length === 0;

  return {
    id: testCase.id,
    title: testCase.title,
    case_type: testCase.case_type,
    status: "evaluated",
    passed,
    winner,
    expected_winner: "judgmentkit_mcp",
    score_delta,
    minimum_score_delta: testCase.minimum_score_delta,
    guided_critical_disclosure_leaks: guidedCriticalLeaks,
    expected_next_action: testCase.expected_next_action,
    variants,
  };
}

function summarizeResults(results) {
  const evaluated = results.filter((result) => result.status === "evaluated");
  const captureRequired = results.filter((result) => result.status === "capture-required");
  const passed = evaluated.filter((result) => result.passed);
  const failed = evaluated.filter((result) => !result.passed);
  const guidedWins = evaluated.filter((result) => result.winner === "judgmentkit_mcp").length;
  const baselineWins = evaluated.filter((result) => result.winner === "baseline_no_mcp").length;
  const ties = evaluated.filter((result) => result.winner === "tie").length;
  const averageGuidedDelta =
    evaluated.length === 0
      ? 0
      : round(evaluated.reduce((sum, result) => sum + result.score_delta, 0) / evaluated.length);
  const guidedCriticalDisclosureLeaks = evaluated.reduce(
    (sum, result) => sum + (result.guided_critical_disclosure_leaks?.length ?? 0),
    0,
  );
  const passRate = evaluated.length === 0 ? 0 : passed.length / evaluated.length;
  const pilotPassed =
    evaluated.length === results.length &&
    results.length > 0 &&
    passRate >= 0.75 &&
    averageGuidedDelta >= 10 &&
    guidedCriticalDisclosureLeaks === 0;

  return {
    cases: results.length,
    evaluated_cases: evaluated.length,
    capture_required_cases: captureRequired.length,
    passed: passed.length,
    failed: failed.length,
    guided_wins: guidedWins,
    baseline_wins: baselineWins,
    ties,
    average_guided_delta: averageGuidedDelta,
    guided_critical_disclosure_leaks: guidedCriticalDisclosureLeaks,
    pilot_passed: pilotPassed,
    pilot_status:
      captureRequired.length > 0 ? "capture-required" : pilotPassed ? "passed" : "failed",
  };
}

function nextRunId(baseReportsDir, date, releaseSegment) {
  const runRoot = path.join(baseReportsDir, date, releaseSegment);
  if (!fs.existsSync(runRoot)) return "run-001";
  const existing = fs
    .readdirSync(runRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^run-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (existing.length === 0) return "run-001";
  const last = existing.at(-1);
  const next = Number(last.replace("run-", "")) + 1;
  return `run-${String(next).padStart(3, "0")}`;
}

function runRelativePath(baseReportsDir, filePath) {
  return path.relative(baseReportsDir, filePath).split(path.sep).join("/");
}

function createRunInfo({ reportsDir, runDate, mcpVersion }) {
  const releaseSegment = `mcp-${mcpVersion}`;
  const runId = nextRunId(reportsDir, runDate, releaseSegment);
  const runPath = path.join(reportsDir, runDate, releaseSegment, runId);
  const jsonReportPath = path.join(runPath, REPORT_JSON_FILENAME);
  const htmlReportPath = path.join(runPath, REPORT_HTML_FILENAME);

  return {
    baseReportsDir: reportsDir,
    date: runDate,
    mcp_release: mcpVersion,
    mcp_release_segment: releaseSegment,
    run_id: runId,
    runPath,
    jsonReportPath,
    htmlReportPath,
  };
}

export function buildReport(results, runInfo, options = {}) {
  return {
    eval_id: EVAL_ID,
    evaluation_type: "private_saved_capture_scoring",
    benchmark_policy:
      "Private repo-local pilot. Scores are deterministic checks against saved Codex captures; JudgmentKit is not used as the judge.",
    capture_policy:
      "Default mode scores existing captures only. Missing captures are reported as capture-required. Live capture is opt-in with --capture.",
    comparison: {
      baseline: "baseline_no_mcp",
      guided: "judgmentkit_mcp",
      model: MODEL_ID,
      reasoning_effort: REASONING_EFFORT,
    },
    run: {
      date: runInfo.date,
      mcp_release: runInfo.mcp_release,
      mcp_release_segment: runInfo.mcp_release_segment,
      run_id: runInfo.run_id,
      run_path: runRelativePath(runInfo.baseReportsDir, runInfo.runPath),
      html_report: runRelativePath(runInfo.baseReportsDir, runInfo.htmlReportPath),
      json_report: runRelativePath(runInfo.baseReportsDir, runInfo.jsonReportPath),
    },
    summary: summarizeResults(results),
    metric_scale: {
      metric_score: "0-5",
      total_score: "0-100 weighted",
    },
    capture_dir: path.relative(ROOT_DIR, options.captureDir ?? DEFAULT_CAPTURE_DIR),
    results,
  };
}

function treatmentLabel(value) {
  if (value === "baseline_no_mcp") return "Baseline";
  if (value === "judgmentkit_mcp") return "JudgmentKit MCP";
  if (value === "tie") return "Tie";
  return value ?? "";
}

function htmlCase(result) {
  const statusLabel = result.status === "capture-required" ? "Capture required" : result.passed ? "Passed" : "Failed";
  const variantHtml = result.variants
    .map((variant) => {
      const metrics = METRIC_IDS.map((metricId) => {
        const metric = variant.metric_results?.[metricId];
        return `<li><span>${escapeHtml(metricId)}</span><strong>${escapeHtml(metric?.score ?? "n/a")}</strong></li>`;
      }).join("");

      return `
        <article class="variant ${escapeHtml(variant.id)}">
          <h3>${escapeHtml(variant.label)}</h3>
          <p class="score">${variant.score === null ? "capture-required" : `${escapeHtml(variant.score)}/100`}</p>
          <ul>${metrics}</ul>
          ${
            variant.critical_disclosure_leaks?.length
              ? `<p class="leaks">Leaks: ${escapeHtml(variant.critical_disclosure_leaks.join(", "))}</p>`
              : ""
          }
        </article>`;
    })
    .join("");

  return `
    <section class="case">
      <header>
        <p>${escapeHtml(result.case_type)}</p>
        <h2>${escapeHtml(result.title)}</h2>
        <strong>${escapeHtml(statusLabel)}</strong>
      </header>
      <dl>
        <div><dt>Winner</dt><dd>${escapeHtml(treatmentLabel(result.winner))}</dd></div>
        <div><dt>Delta</dt><dd>${escapeHtml(result.score_delta ?? "n/a")}</dd></div>
        <div><dt>Threshold</dt><dd>${escapeHtml(result.minimum_score_delta)}</dd></div>
      </dl>
      <div class="variants">${variantHtml}</div>
    </section>`;
}

function buildHtmlReport(report) {
  const cases = report.results.map(htmlCase).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JudgmentKit MCP Pilot Report</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17201b; background: #f7f8f5; }
    main { max-width: 1120px; margin: 0 auto; padding: 40px 20px 64px; }
    .hero, .case { background: #fff; border: 1px solid #d9ded7; border-radius: 8px; padding: 24px; box-shadow: 0 10px 30px rgba(23, 32, 27, 0.06); }
    .hero { margin-bottom: 20px; }
    h1, h2, h3, p { margin-top: 0; }
    .lede { max-width: 780px; color: #526058; }
    .summary, .case dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1px; background: #d9ded7; border: 1px solid #d9ded7; border-radius: 8px; overflow: hidden; }
    .summary div, .case dl div { background: #fff; padding: 14px; }
    dt { color: #66736b; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    dd { margin: 4px 0 0; font-size: 1.25rem; font-weight: 800; }
    .case { margin-top: 16px; }
    .case header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
    .case header p { color: #66736b; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; }
    .case header strong { border: 1px solid #bdc8bf; border-radius: 999px; padding: 6px 10px; white-space: nowrap; }
    .variants { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 16px; }
    .variant { border: 1px solid #d9ded7; border-radius: 8px; padding: 16px; }
    .judgmentkit_mcp { border-color: #9ac6b4; background: #fbfffd; }
    .score { font-size: 1.8rem; font-weight: 850; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
    li { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #edf0eb; padding-top: 6px; }
    .leaks { margin-top: 12px; color: #8a2424; font-weight: 700; }
    a { color: #245f73; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <p><a href="${REPORT_JSON_FILENAME}">JSON report</a> · <a href="../../../../${CATALOG_JSON_FILENAME}">Catalog JSON</a></p>
      <h1>JudgmentKit MCP Private Pilot</h1>
      <p class="lede">${escapeHtml(report.benchmark_policy)} ${escapeHtml(report.capture_policy)}</p>
      <dl class="summary">
        <div><dt>Status</dt><dd>${escapeHtml(report.summary.pilot_status)}</dd></div>
        <div><dt>Cases</dt><dd>${escapeHtml(report.summary.evaluated_cases)}/${escapeHtml(report.summary.cases)}</dd></div>
        <div><dt>Passed</dt><dd>${escapeHtml(report.summary.passed)}</dd></div>
        <div><dt>Average delta</dt><dd>${escapeHtml(report.summary.average_guided_delta)}</dd></div>
        <div><dt>Guided leaks</dt><dd>${escapeHtml(report.summary.guided_critical_disclosure_leaks)}</dd></div>
        <div><dt>Run</dt><dd>${escapeHtml(report.run.run_id)}</dd></div>
      </dl>
    </section>
    ${cases}
  </main>
</body>
</html>
`;
}

function catalogEntry(report) {
  return {
    date: report.run.date,
    mcp_release: report.run.mcp_release,
    mcp_release_segment: report.run.mcp_release_segment,
    run_id: report.run.run_id,
    run_path: report.run.run_path,
    html_report: report.run.html_report,
    json_report: report.run.json_report,
    eval_id: report.eval_id,
    summary: report.summary,
  };
}

function readCatalog(baseReportsDir) {
  const catalogPath = path.join(baseReportsDir, CATALOG_JSON_FILENAME);
  if (!fs.existsSync(catalogPath)) {
    return { catalog_id: CATALOG_ID, latest: null, runs: [] };
  }
  return readJson(catalogPath);
}

function buildCatalogHtml(catalog) {
  const rows = (catalog.runs ?? [])
    .map(
      (run) => `
        <tr>
          <td>${escapeHtml(run.date)}</td>
          <td>${escapeHtml(run.mcp_release)}</td>
          <td>${escapeHtml(run.run_id)}</td>
          <td>${escapeHtml(run.summary?.pilot_status)}</td>
          <td>${escapeHtml(run.summary?.passed ?? 0)}/${escapeHtml(run.summary?.evaluated_cases ?? 0)}</td>
          <td><a href="${escapeHtml(run.html_report)}">HTML</a> · <a href="${escapeHtml(run.json_report)}">JSON</a></td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JudgmentKit MCP Pilot Runs</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; color: #17201b; background: #f7f8f5; }
    main { max-width: 960px; margin: 0 auto; padding: 40px 20px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d9ded7; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e4e8e2; }
    th { font-size: 0.78rem; text-transform: uppercase; color: #66736b; }
    a { color: #245f73; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>JudgmentKit MCP Pilot Runs</h1>
    <p>Private saved-capture pilot reports. This catalog is separate from the UI-generation eval catalog.</p>
    <table>
      <thead><tr><th>Date</th><th>MCP</th><th>Run</th><th>Status</th><th>Passed</th><th>Links</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

function writeReport(report, runInfo) {
  fs.mkdirSync(runInfo.runPath, { recursive: true });
  writeJson(runInfo.jsonReportPath, report);
  fs.writeFileSync(runInfo.htmlReportPath, buildHtmlReport(report));

  const catalog = readCatalog(runInfo.baseReportsDir);
  const entry = catalogEntry(report);
  catalog.runs = [entry, ...(catalog.runs ?? []).filter((run) => run.run_path !== entry.run_path)];
  catalog.latest = entry;
  writeJson(path.join(runInfo.baseReportsDir, CATALOG_JSON_FILENAME), catalog);
  fs.writeFileSync(path.join(runInfo.baseReportsDir, CATALOG_HTML_FILENAME), buildCatalogHtml(catalog));

  return catalog;
}

async function buildResults(cases, options) {
  const results = [];

  for (const testCase of cases) {
    const mcpContext = await buildMcpContextForCase(testCase);
    const capturesByVariant = {};

    for (const variant of testCase.variants) {
      if (options.capture) {
        capturesByVariant[variant.id] = await captureVariant(
          testCase,
          variant,
          mcpContext,
          options.captureDir,
        );
      } else {
        capturesByVariant[variant.id] = loadCapture(options.captureDir, testCase, variant);
      }
    }

    const result = scoreCase(testCase, capturesByVariant);
    result.mcp_context = {
      tool_sequence: mcpContext.tool_sequence,
      tool_summaries: mcpContext.tool_calls.map((call) => ({
        name: call.name,
        args_sha256: call.args_sha256,
        summary: call.summary,
      })),
    };
    results.push(result);
  }

  return results;
}

export async function runMcpPilotEval(rawOptions = {}) {
  const cases = readCases();
  validateCases(cases);
  const options = {
    ...parseArgs([]),
    ...rawOptions,
  };
  const selectedCases = filterCases(cases, options.cases);
  const runInfo = createRunInfo(options);
  const results = await buildResults(selectedCases, options);
  const report = buildReport(results, runInfo, options);
  const catalog = writeReport(report, runInfo);
  return { report, catalog, runInfo };
}

async function main() {
  const options = parseArgs();
  const { report, runInfo, catalog } = await runMcpPilotEval(options);

  console.log("# JudgmentKit MCP Pilot Eval");
  console.log(
    `Summary: ${report.summary.passed}/${report.summary.evaluated_cases} evaluated cases passed, ${report.summary.capture_required_cases} capture-required, average guided delta ${report.summary.average_guided_delta}, status ${report.summary.pilot_status}.`,
  );
  console.log(`Run: ${report.run.run_path}`);
  console.log(`HTML: ${runInfo.htmlReportPath}`);
  console.log(`JSON: ${runInfo.jsonReportPath}`);
  console.log(`Latest: ${catalog.latest?.html_report ?? "none"}`);

  if (
    options.strict ||
    (report.summary.evaluated_cases > 0 &&
      report.summary.capture_required_cases === 0 &&
      !report.summary.pilot_passed)
  ) {
    process.exitCode = report.summary.pilot_passed ? 0 : 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`MCP pilot eval failed: ${error.message}`);
    process.exitCode = 1;
  });
}
