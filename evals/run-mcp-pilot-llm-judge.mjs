#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const CASES_PATH = path.join(__dirname, "mcp-pilot-cases.json");

export const LLM_EVIDENCE_JSON_FILENAME = "mcp-pilot-llm-evidence.json";
export const LLM_EVIDENCE_MD_FILENAME = "mcp-pilot-llm-evidence.md";

export const DEFAULT_JUDGE_MODEL_CONFIG = {
  id: "gpt-5.5-codex",
  label: "GPT-5.5 Codex",
  provider: "codex",
  model: "gpt-5.5",
  reasoning_effort: "xhigh",
};

export const JUDGE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "winner",
    "confidence",
    "rationale",
    "decisive_differences",
    "evidence",
    "output_a_quality",
    "output_b_quality",
  ],
  properties: {
    winner: { type: "string", enum: ["output_a", "output_b", "tie"] },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    rationale: { type: "string" },
    decisive_differences: { type: "array", items: { type: "string" } },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["output", "quote", "why_it_matters"],
        properties: {
          output: { type: "string", enum: ["output_a", "output_b"] },
          quote: { type: "string" },
          why_it_matters: { type: "string" },
        },
      },
    },
    output_a_quality: {
      type: "object",
      additionalProperties: false,
      required: ["score", "strengths", "risks"],
      properties: {
        score: { type: "number", minimum: 0, maximum: 10 },
        strengths: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
      },
    },
    output_b_quality: {
      type: "object",
      additionalProperties: false,
      required: ["score", "strengths", "risks"],
      properties: {
        score: { type: "number", minimum: 0, maximum: 10 },
        strengths: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
      },
    },
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

function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
}

function parseList(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    judge: false,
    reportPath: null,
    outputDir: null,
    modelId: null,
    judgeModel: DEFAULT_JUDGE_MODEL_CONFIG.model,
    judgeModelId: DEFAULT_JUDGE_MODEL_CONFIG.id,
    judgeReasoningEffort: DEFAULT_JUDGE_MODEL_CONFIG.reasoning_effort,
    cases: [],
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--judge") args.judge = true;
    else if (arg === "--report") args.reportPath = argv[++index];
    else if (arg === "--output-dir") args.outputDir = argv[++index];
    else if (arg === "--model-id") args.modelId = argv[++index];
    else if (arg === "--judge-model") args.judgeModel = argv[++index];
    else if (arg === "--judge-model-id") args.judgeModelId = argv[++index];
    else if (arg === "--judge-reasoning-effort") args.judgeReasoningEffort = argv[++index];
    else if (arg === "--cases") args.cases = parseList(argv[++index]);
    else if (arg === "--strict") args.strict = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function caseById(cases) {
  return new Map(cases.map((testCase) => [testCase.id, testCase]));
}

function reportDirFromPath(reportPath) {
  return path.dirname(path.resolve(ROOT_DIR, reportPath));
}

function resolveModelId(report, modelId) {
  if (modelId) return modelId;
  if (report.summary?.primary_model_id) return report.summary.primary_model_id;
  const modelIds = Object.keys(report.summary?.per_model ?? {});
  if (modelIds.length === 1) return modelIds[0];
  const resultModelIds = [...new Set((report.results ?? []).map((result) => result.model_config_id))];
  if (resultModelIds.length === 1) return resultModelIds[0];
  throw new Error("--model-id is required for multi-model reports without primary_model_id.");
}

function capturePathForVariant(report, variant) {
  const captureFile = variant.capture?.capture_file;
  if (!captureFile) return null;
  return path.resolve(ROOT_DIR, report.capture_dir, captureFile);
}

function compactCaptureForJudge(capture) {
  if (!capture) return { output_valid: false, parse_error: "missing capture" };
  return {
    output_valid: capture.output_valid !== false,
    response: capture.parsed?.response ?? null,
    next_action: capture.parsed?.next_action ?? null,
    questions: capture.parsed?.questions ?? [],
    handoff: capture.parsed?.handoff ?? null,
    rationale: capture.parsed?.rationale ?? null,
    parse_error: capture.parse_error ?? null,
  };
}

export function blindedOrder(caseId) {
  const firstByte = Number.parseInt(hash(caseId).slice(0, 2), 16);
  return firstByte % 2 === 0
    ? { output_a: "baseline_no_mcp", output_b: "judgmentkit_mcp" }
    : { output_a: "judgmentkit_mcp", output_b: "baseline_no_mcp" };
}

export function buildLlmJudgePrompt({ testCase, result, outputA, outputB }) {
  const sourceBrief = testCase?.source_context?.brief ?? "";
  const expectedAction = result.expected_next_action ?? testCase?.expected_next_action ?? "";

  return [
    "You are judging two blinded agent outputs for the same private benchmark case.",
    "Pick the output that would better help a downstream agent make the right judgment and next move.",
    "Do not try to infer which output had access to JudgmentKit or MCP context. Judge only the written outputs.",
    "Prefer outputs that are activity-fit, grounded in the source, restrained when context is missing, free of internal leakage, and operationally useful.",
    "Penalize invented workflow details, generic questions, missing handoff/action/reason fields, unsafe acceptance, and implementation-only language exposed to the user.",
    "Use output_a_quality.score and output_b_quality.score as 0-10 quality ratings, where 10 is excellent and 0 is unusable.",
    "Return JSON only. Do not include Markdown fences.",
    "",
    `Case title: ${result.title}`,
    `Case type: ${result.case_type}`,
    `Task: ${testCase?.task_prompt ?? ""}`,
    `Expected next action: ${expectedAction}`,
    `Source brief: ${sourceBrief}`,
    "",
    `Output A:\n${JSON.stringify(outputA, null, 2)}`,
    "",
    `Output B:\n${JSON.stringify(outputB, null, 2)}`,
  ].join("\n");
}

export function parseJudgeOutput(rawResponse) {
  try {
    const parsed = JSON.parse(rawResponse);
    for (const field of JUDGE_OUTPUT_SCHEMA.required) {
      if (parsed[field] === undefined) throw new Error(`missing required field ${field}`);
    }
    if (!["output_a", "output_b", "tie"].includes(parsed.winner)) {
      throw new Error("winner must be output_a, output_b, or tie");
    }
    if (!["low", "medium", "high"].includes(parsed.confidence)) {
      throw new Error("confidence must be low, medium, or high");
    }
    const scoreA = Number(parsed.output_a_quality?.score);
    const scoreB = Number(parsed.output_b_quality?.score);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
      throw new Error("output quality scores must be numbers");
    }
    return { output_valid: true, parsed, parse_error: null };
  } catch (error) {
    return {
      output_valid: false,
      parsed: null,
      parse_error: error instanceof Error ? error.message : String(error),
    };
  }
}

function runCodexJudge(prompt, judgeModelConfig, outputSchemaPath, outputFilePath) {
  const args = [
    "exec",
    "--model",
    judgeModelConfig.model,
    "-c",
    `model_reasoning_effort="${judgeModelConfig.reasoning_effort}"`,
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
    timeout: Number(process.env.JUDGMENTKIT_MCP_PILOT_JUDGE_TIMEOUT_MS ?? 900_000),
  });

  if (execution.error) throw execution.error;
  if (execution.status !== 0) {
    throw new Error(`codex judge failed with status ${execution.status}\n${execution.stderr}`);
  }

  return {
    provider: judgeModelConfig.provider,
    runtime: "codex exec",
    status: execution.status,
    stdout_sha256: hash(execution.stdout ?? ""),
    stderr_sha256: hash(execution.stderr ?? ""),
    command_display: `codex ${args
      .map((arg) => (arg === outputSchemaPath ? "<schema>" : arg === outputFilePath ? "<output>" : arg))
      .join(" ")}`,
  };
}

function judgeCapturePath(outputDir, judgeModelConfig, modelId, caseId) {
  return path.join(outputDir, "mcp-pilot-llm-judge", judgeModelConfig.id, modelId, `${caseId}.json`);
}

function treatmentForWinner(mapping, winner) {
  if (winner === "tie") return "tie";
  return mapping[winner] ?? null;
}

function qualityForTreatment(parsed, mapping, treatment) {
  if (!parsed || treatment === "tie") return null;
  const scores = normalizedQualityScores(parsed);
  if (mapping.output_a === treatment) return scores.output_a;
  if (mapping.output_b === treatment) return scores.output_b;
  return null;
}

function normalizedQualityScores(parsed) {
  const outputA = Number(parsed?.output_a_quality?.score);
  const outputB = Number(parsed?.output_b_quality?.score);
  if (!Number.isFinite(outputA) || !Number.isFinite(outputB)) {
    return { output_a: null, output_b: null };
  }
  if (outputA <= 1 && outputB <= 1 && (outputA < 1 || outputB < 1)) {
    return {
      output_a: Number((outputA * 10).toFixed(2)),
      output_b: Number((outputB * 10).toFixed(2)),
    };
  }
  return { output_a: outputA, output_b: outputB };
}

function summarizeJudgments(judgments) {
  const valid = judgments.filter((judgment) => judgment.output_valid);
  const guidedPreferred = valid.filter((judgment) => judgment.treatment_winner === "judgmentkit_mcp");
  const baselinePreferred = valid.filter((judgment) => judgment.treatment_winner === "baseline_no_mcp");
  const ties = valid.filter((judgment) => judgment.treatment_winner === "tie");
  const qualityDeltas = valid
    .map((judgment) => judgment.guided_quality_score - judgment.baseline_quality_score)
    .filter(Number.isFinite);

  return {
    total_cases: judgments.length,
    valid_judgments: valid.length,
    invalid_judgments: judgments.length - valid.length,
    judge_required: judgments.filter((judgment) => judgment.status === "judge-required").length,
    guided_preferred: guidedPreferred.length,
    baseline_preferred: baselinePreferred.length,
    ties: ties.length,
    guided_preference_rate:
      valid.length === 0 ? 0 : Number((guidedPreferred.length / valid.length).toFixed(3)),
    high_confidence_guided_preferred: guidedPreferred.filter(
      (judgment) => judgment.confidence === "high",
    ).length,
    average_guided_quality_delta:
      qualityDeltas.length === 0
        ? 0
        : Number(
            (qualityDeltas.reduce((sum, value) => sum + value, 0) / qualityDeltas.length).toFixed(
              2,
            ),
          ),
  };
}

async function buildJudgment({
  report,
  testCase,
  result,
  modelId,
  outputDir,
  judgeModelConfig,
  judge,
  judgeFn,
}) {
  const variants = Object.fromEntries(result.variants.map((variant) => [variant.id, variant]));
  const baselinePath = capturePathForVariant(report, variants.baseline_no_mcp);
  const guidedPath = capturePathForVariant(report, variants.judgmentkit_mcp);
  const baselineCapture = baselinePath && fs.existsSync(baselinePath) ? readJson(baselinePath) : null;
  const guidedCapture = guidedPath && fs.existsSync(guidedPath) ? readJson(guidedPath) : null;
  const mapping = blindedOrder(result.id);
  const capturesByTreatment = {
    baseline_no_mcp: compactCaptureForJudge(baselineCapture),
    judgmentkit_mcp: compactCaptureForJudge(guidedCapture),
  };
  const outputA = capturesByTreatment[mapping.output_a];
  const outputB = capturesByTreatment[mapping.output_b];
  const prompt = buildLlmJudgePrompt({ testCase, result, outputA, outputB });
  const filePath = judgeCapturePath(outputDir, judgeModelConfig, modelId, result.id);
  const transcriptFile = relativePath(filePath);

  let transcript;
  if (fs.existsSync(filePath)) {
    transcript = readJson(filePath);
  } else if (!judge) {
    return {
      case_id: result.id,
      title: result.title,
      case_type: result.case_type,
      status: "judge-required",
      output_valid: false,
      parse_error: "missing LLM judge transcript",
      treatment_winner: null,
      confidence: null,
      transcript_file: transcriptFile,
    };
  } else {
    const startedAt = Date.now();
    let rawResponse;
    let execution;
    if (judgeFn) {
      rawResponse = await judgeFn({ prompt, testCase, result, mapping, outputA, outputB });
      execution = { provider: "injected", runtime: "injected", status: 0 };
    } else {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-llm-judge-"));
      const outputSchemaPath = path.join(tempDir, "judge-output-schema.json");
      const outputFilePath = path.join(tempDir, `${result.id}-judge.json`);
      fs.writeFileSync(outputSchemaPath, JSON.stringify(JUDGE_OUTPUT_SCHEMA, null, 2));
      execution = runCodexJudge(prompt, judgeModelConfig, outputSchemaPath, outputFilePath);
      rawResponse = fs.readFileSync(outputFilePath, "utf8");
    }
    const parsed = parseJudgeOutput(rawResponse);
    transcript = {
      capture_type: "mcp-pilot-llm-preference-judge",
      case_id: result.id,
      title: result.title,
      case_type: result.case_type,
      model_config_id: modelId,
      judge_model_config_id: judgeModelConfig.id,
      judge_provider: judgeModelConfig.provider,
      judge_model: judgeModelConfig.model,
      judge_reasoning_effort: judgeModelConfig.reasoning_effort,
      captured_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      treatment_mapping: mapping,
      prompt_sha256: hash(prompt),
      raw_response_sha256: hash(rawResponse),
      raw_response: rawResponse,
      output_valid: parsed.output_valid,
      parse_error: parsed.parse_error,
      parsed: parsed.parsed,
      execution,
    };
    writeJson(filePath, transcript);
  }

  const parsed = transcript.parsed;
  const treatmentWinner = transcript.output_valid
    ? treatmentForWinner(transcript.treatment_mapping, parsed.winner)
    : null;
  return {
    case_id: result.id,
    title: result.title,
    case_type: result.case_type,
    status: transcript.output_valid ? "judged" : "invalid-judge-output",
    output_valid: transcript.output_valid,
    parse_error: transcript.parse_error ?? null,
    blinded_winner: parsed?.winner ?? null,
    treatment_winner: treatmentWinner,
    confidence: parsed?.confidence ?? null,
    rationale: parsed?.rationale ?? null,
    decisive_differences: parsed?.decisive_differences ?? [],
    evidence: parsed?.evidence ?? [],
    baseline_quality_score: qualityForTreatment(
      parsed,
      transcript.treatment_mapping,
      "baseline_no_mcp",
    ),
    guided_quality_score: qualityForTreatment(
      parsed,
      transcript.treatment_mapping,
      "judgmentkit_mcp",
    ),
    deterministic_winner: result.winner,
    deterministic_delta: result.score_delta,
    deterministic_passed: result.passed,
    transcript_file: transcriptFile,
  };
}

export async function buildLlmEvidenceReport(rawOptions = {}) {
  const options = {
    ...parseArgs([]),
    ...rawOptions,
  };
  if (!options.reportPath) throw new Error("--report is required.");

  const reportPath = path.resolve(ROOT_DIR, options.reportPath);
  if (!fs.existsSync(reportPath)) throw new Error(`Report not found: ${options.reportPath}`);

  const report = readJson(reportPath);
  const cases = options.casesData ?? readJson(CASES_PATH);
  const casesById = caseById(cases);
  const modelId = resolveModelId(report, options.modelId);
  const outputDir = path.resolve(ROOT_DIR, options.outputDir ?? reportDirFromPath(reportPath));
  const judgeModelConfig = {
    ...DEFAULT_JUDGE_MODEL_CONFIG,
    id: options.judgeModelId ?? DEFAULT_JUDGE_MODEL_CONFIG.id,
    model: options.judgeModel ?? DEFAULT_JUDGE_MODEL_CONFIG.model,
    reasoning_effort: options.judgeReasoningEffort ?? DEFAULT_JUDGE_MODEL_CONFIG.reasoning_effort,
  };
  const selectedCaseIds = new Set(options.cases ?? []);
  const results = (report.results ?? [])
    .filter((result) => result.model_config_id === modelId)
    .filter((result) => selectedCaseIds.size === 0 || selectedCaseIds.has(result.id));

  if (results.length === 0) {
    throw new Error(`No report results found for model ${modelId}.`);
  }

  const judgments = [];
  for (const result of results) {
    const testCase = casesById.get(result.id);
    if (!testCase) throw new Error(`Case ${result.id} not found in ${CASES_PATH}.`);
    judgments.push(
      await buildJudgment({
        report,
        testCase,
        result,
        modelId,
        outputDir,
        judgeModelConfig,
        judge: options.judge,
        judgeFn: options.judgeFn,
      }),
    );
  }

  const evidence = {
    evidence_type: "mcp-pilot-llm-preference-evidence",
    benchmark_policy:
      "Blinded LLM preference judging of saved baseline and JudgmentKit-guided model outputs. This is product evidence, not deterministic scoring.",
    source_report: relativePath(reportPath),
    source_capture_dir: report.capture_dir,
    mcp: report.mcp,
    model_under_test: {
      id: modelId,
      summary: report.summary?.per_model?.[modelId] ?? report.summary,
    },
    judge: judgeModelConfig,
    summary: summarizeJudgments(judgments),
    judgments,
  };

  writeJson(path.join(outputDir, LLM_EVIDENCE_JSON_FILENAME), evidence);
  fs.writeFileSync(
    path.join(outputDir, LLM_EVIDENCE_MD_FILENAME),
    `${renderLlmEvidenceMarkdown(evidence)}\n`,
  );
  return evidence;
}

export function renderLlmEvidenceMarkdown(evidence) {
  const rows = evidence.judgments
    .map((judgment) => {
      const winner =
        judgment.treatment_winner === "judgmentkit_mcp"
          ? "Guided"
          : judgment.treatment_winner === "baseline_no_mcp"
            ? "Baseline"
            : judgment.treatment_winner ?? "n/a";
      return `| ${judgment.case_id} | ${winner} | ${judgment.confidence ?? "n/a"} | ${judgment.guided_quality_score ?? "n/a"} / ${judgment.baseline_quality_score ?? "n/a"} | ${judgment.deterministic_delta ?? "n/a"} |`;
    })
    .join("\n");
  const examples = evidence.judgments
    .filter((judgment) => judgment.output_valid)
    .slice(0, 6)
    .map((judgment) => {
      const evidenceLines = (judgment.evidence ?? [])
        .slice(0, 2)
        .map((entry) => `- ${entry.output}: "${entry.quote}" (${entry.why_it_matters})`)
        .join("\n");
      return `### ${judgment.case_id}\nWinner: ${judgment.treatment_winner}; confidence: ${judgment.confidence}\n\n${judgment.rationale}\n\n${evidenceLines}`;
    })
    .join("\n\n");

  return [
    "# JudgmentKit MCP LLM Preference Evidence",
    "",
    evidence.benchmark_policy,
    "",
    `Source report: \`${evidence.source_report}\``,
    `Model under test: \`${evidence.model_under_test.id}\``,
    `Judge: \`${evidence.judge.id}\` (${evidence.judge.model})`,
    "",
    "## Summary",
    "",
    `Valid judgments: ${evidence.summary.valid_judgments}/${evidence.summary.total_cases}`,
    `Guided preferred: ${evidence.summary.guided_preferred}`,
    `Baseline preferred: ${evidence.summary.baseline_preferred}`,
    `Ties: ${evidence.summary.ties}`,
    `Guided preference rate: ${evidence.summary.guided_preference_rate}`,
    `Average guided quality delta: ${evidence.summary.average_guided_quality_delta}`,
    "",
    "## Cases",
    "",
    "| Case | LLM winner | Confidence | Guided/Baseline quality | Deterministic delta |",
    "| --- | --- | --- | --- | --- |",
    rows,
    "",
    "## Representative Rationale",
    "",
    examples,
  ].join("\n");
}

async function main() {
  const options = parseArgs();
  const evidence = await buildLlmEvidenceReport(options);
  const outputDir = path.resolve(ROOT_DIR, options.outputDir ?? reportDirFromPath(options.reportPath));

  console.log("# JudgmentKit MCP LLM Preference Evidence");
  console.log(
    `Summary: guided preferred ${evidence.summary.guided_preferred}/${evidence.summary.valid_judgments}, baseline preferred ${evidence.summary.baseline_preferred}, ties ${evidence.summary.ties}, judge-required ${evidence.summary.judge_required}.`,
  );
  console.log(`JSON: ${path.join(outputDir, LLM_EVIDENCE_JSON_FILENAME)}`);
  console.log(`Markdown: ${path.join(outputDir, LLM_EVIDENCE_MD_FILENAME)}`);

  if (options.strict && evidence.summary.judge_required > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`MCP pilot LLM judge failed: ${error.message}`);
    process.exitCode = 1;
  });
}
