#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { handleJudgmentKitMcpNodeRequest } from "../src/mcp-http.mjs";
import { getMcpMetadata, handleToolCall } from "../src/mcp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

export const CASES_PATH = path.join(__dirname, "mcp-pilot-cases.json");
export const PACKAGE_PATH = path.join(ROOT_DIR, "package.json");
export const DEFAULT_CAPTURE_DIR = path.join(__dirname, "mcp-pilot-captures");
export const DEFAULT_REPORTS_DIR = path.join(__dirname, "reports", "mcp-pilot");
export const REPORT_JSON_FILENAME = "mcp-pilot-report.json";
export const REPORT_HTML_FILENAME = "mcp-pilot-report.html";
export const CATALOG_JSON_FILENAME = "index.json";
export const CATALOG_HTML_FILENAME = "index.html";
export const EVAL_ID = "judgmentkit-mcp-private-pilot-v1";
export const CATALOG_ID = "judgmentkit-mcp-private-pilot-runs";
export const REQUIRED_MCP_VERSION = "0.4.0";
export const MODEL_ID = "gpt-5.5";
export const REASONING_EFFORT = "xhigh";
export const CODEX_MODEL_CONFIG_ID = "gpt-5.5-codex";
export const GEMMA_LMSTUDIO_MODEL_CONFIG_ID = "gemma-4-e4b-it-lmstudio";
export const MODEL_CONFIGS = {
  [CODEX_MODEL_CONFIG_ID]: {
    id: CODEX_MODEL_CONFIG_ID,
    label: "GPT-5.5 Codex",
    provider: "codex",
    model: MODEL_ID,
    reasoning_effort: REASONING_EFFORT,
    local: false,
  },
  [GEMMA_LMSTUDIO_MODEL_CONFIG_ID]: {
    id: GEMMA_LMSTUDIO_MODEL_CONFIG_ID,
    label: "Gemma 4 E4B LM Studio",
    provider: "lmstudio-openai-chat",
    model: "gemma-4-e4b-it@q4_k_m",
    base_url: "http://localhost:1234/v1",
    local: true,
  },
};
export const MODEL_MATRICES = {
  "gemma-local": [CODEX_MODEL_CONFIG_ID, GEMMA_LMSTUDIO_MODEL_CONFIG_ID],
};
export const MODEL_MATRIX_PRIMARY_MODELS = {
  "gemma-local": GEMMA_LMSTUDIO_MODEL_CONFIG_ID,
};
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

const TERM_ALIASES = new Map([
  ["block", ["reject", "failed", "blocks acceptance", "cannot accept"]],
  ["candidate evidence", ["candidate", "candidate provides", "candidate also omits"]],
  ["candidate leaks", ["candidate exposes", "exposes internal", "implementation wording", "internal configuration"]],
  ["case evidence", ["case evidence", "case context", "evidence needed", "evidence completeness"]],
  ["clear next step", ["accountable next step", "next action", "handoff receipt"]],
  ["clinical intake", ["intake review", "intake"]],
  ["custom controls", ["custom control", "custom-control"]],
  ["decision controls", ["decision choices", "bounded decisions", "review workflow"]],
  ["evidence gate", ["acceptance gate", "implementation gate"]],
  ["implementation terms", ["implementation wording", "internal mechanics"]],
  ["needs source context", ["source context", "source evidence", "source request"]],
  ["next action", ["action"]],
  ["next owner", ["owner"]],
  ["operator review", ["operator screen", "review workflow"]],
  ["refund request", ["refund case", "refund"]],
  ["review decision", ["decision"]],
  ["routing handoff", ["handoff receipt", "route"]],
  ["source brief", ["source request", "source context", "brief"]],
  ["verification", ["supply passing", "re-review"]],
]);

const CAPTURE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["response", "next_action", "questions", "handoff", "rationale"],
  properties: {
    response: { type: "string" },
    next_action: { type: "string" },
    questions: { type: "array", items: { type: "string" } },
    handoff: { type: "string" },
    rationale: { type: "string" },
  },
};

export const REPAIR_ACCESSIBILITY_CORE_EVIDENCE_KEYS = [
  "automated_checks",
  "semantic_content",
  "landmarks_headings",
  "name_role_value",
  "keyboard_navigation",
  "focus_order",
  "focus_visible",
  "responsive_no_overflow",
];

export const REPAIR_ACCESSIBILITY_CONDITIONAL_EVIDENCE_KEYS = [
  "visual_background_contrast",
  "non_text_contrast",
  "forced_colors",
  "target_size",
  "focus_not_obscured",
  "no_keyboard_trap",
  "reduced_motion",
  "pause_stop_hide",
  "content_on_hover_focus",
  "form_labels_instructions",
  "form_errors",
  "status_messages",
  "media_alternatives",
  "semantic_fallbacks",
  "reflow_zoom",
];

export const REPAIR_ACCESSIBILITY_EVIDENCE_KEYS = [
  ...REPAIR_ACCESSIBILITY_CORE_EVIDENCE_KEYS,
  ...REPAIR_ACCESSIBILITY_CONDITIONAL_EVIDENCE_KEYS,
];

function stringProperties(keys) {
  return Object.fromEntries(keys.map((key) => [key, { type: "string" }]));
}

function accessibilityEvidenceProperties() {
  const properties = {};
  for (const key of REPAIR_ACCESSIBILITY_CORE_EVIDENCE_KEYS) {
    properties[key] = {
      type: "string",
      description:
        "Required core accessibility evidence. Use a concise pass, passed, or verified statement.",
    };
  }
  for (const key of REPAIR_ACCESSIBILITY_CONDITIONAL_EVIDENCE_KEYS) {
    properties[key] = {
      type: "string",
      description:
        "Conditional accessibility evidence. Use an empty string unless this exact key is named in the failed accessibility evidence list or already applies to the current candidate.",
    };
  }
  return properties;
}

export const REPAIR_CANDIDATE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["candidate", "rationale"],
  properties: {
    candidate: {
      type: "object",
      additionalProperties: false,
      required: [
        "primitives_used",
        "states_covered",
        "static_checks",
        "browser_qa",
        "accessibility_evidence",
        "actions",
        "action_boundary_evidence",
        "data_visibility_evidence",
        "visible_text",
      ],
      properties: {
        primitives_used: { type: "array", items: { type: "string" } },
        states_covered: { type: "array", items: { type: "string" } },
        static_checks: { type: "array", items: { type: "string" } },
        browser_qa: {
          type: "object",
          additionalProperties: false,
          required: ["desktop", "mobile", "keyboard_focus_check"],
          properties: {
            desktop: { type: "string" },
            mobile: { type: "string" },
            keyboard_focus_check: { type: "string" },
          },
        },
        accessibility_evidence: {
          type: "object",
          additionalProperties: false,
          required: REPAIR_ACCESSIBILITY_EVIDENCE_KEYS,
          properties: accessibilityEvidenceProperties(),
        },
        actions: { type: "array", items: { type: "string" } },
        action_boundary_evidence: {
          type: "object",
          additionalProperties: false,
          required: ["approval_boundary", "completion_receipt", "modal_action_order"],
          properties: {
            approval_boundary: { type: "string" },
            completion_receipt: { type: "string" },
            modal_action_order: { type: "string" },
          },
        },
        data_visibility_evidence: {
          type: "object",
          additionalProperties: false,
          required: ["primary_language", "diagnostic_terms"],
          properties: {
            primary_language: { type: "string" },
            diagnostic_terms: { type: "string" },
          },
        },
        visible_text: { type: "array", items: { type: "string" } },
      },
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

function readPackageVersion() {
  return readJson(PACKAGE_PATH).version;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeToken(token) {
  const normalized = normalizeText(token);
  if (normalized.length > 4 && normalized.endsWith("ies")) return `${normalized.slice(0, -3)}y`;
  if (normalized.length > 4 && normalized.endsWith("es")) return normalized.slice(0, -2);
  if (normalized.length > 3 && normalized.endsWith("s")) return normalized.slice(0, -1);
  return normalized;
}

function textTokens(value) {
  return normalizeText(value).split(" ").filter(Boolean).map(normalizeToken);
}

function hasOrderedTokens(text, phrase) {
  const haystack = textTokens(text);
  const needles = textTokens(phrase);
  if (needles.length === 0) return true;

  let cursor = 0;
  for (const needle of needles) {
    const nextIndex = haystack.findIndex((token, index) => index >= cursor && token === needle);
    if (nextIndex === -1) return false;
    cursor = nextIndex + 1;
  }

  return true;
}

function compactJson(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function compactPromptItems(values, maxItems = 3) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      if (typeof value === "string") return value;
      if (!value || typeof value !== "object") return String(value ?? "");
      return (
        value.question ??
        value.prompt ??
        value.text ??
        value.summary ??
        value.required_change ??
        value.issue ??
        value.message ??
        value.title ??
        value.check ??
        compactJson(value)
      );
    })
    .map((value) => String(value ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function compactReviewFinding(finding) {
  if (!finding || typeof finding !== "object") return String(finding ?? "");
  const check = String(finding.check ?? "review_check").replace(/\s+/g, " ").trim();
  const detail = String(
    finding.required_change ??
      finding.issue ??
      finding.message ??
      finding.summary ??
      finding.reason ??
      "repair required",
  )
    .replace(/\s+/g, " ")
    .trim();
  return `${check}: ${detail}`;
}

function hashJson(value) {
  return hash(compactJson(value));
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
  const phraseVariants = [phrase, ...(TERM_ALIASES.get(normalizeText(phrase)) ?? [])];
  return phraseVariants.some((variant) => {
    const normalizedText = normalizeText(text);
    const normalizedVariant = normalizeText(variant);
    return normalizedText.includes(normalizedVariant) || hasOrderedTokens(text, variant);
  });
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

export function verifyMcpVersion(requiredMcpVersion = REQUIRED_MCP_VERSION) {
  const localMetadata = getMcpMetadata("streamable-http");
  const packageVersion = readPackageVersion();
  const failures = [];

  if (localMetadata.version !== requiredMcpVersion) {
    failures.push(
      `local MCP metadata version ${localMetadata.version} does not match required ${requiredMcpVersion}`,
    );
  }

  if (packageVersion !== requiredMcpVersion) {
    failures.push(`package version ${packageVersion} does not match required ${requiredMcpVersion}`);
  }

  if (packageVersion !== localMetadata.version) {
    failures.push(
      `package version ${packageVersion} does not match local MCP metadata version ${localMetadata.version}`,
    );
  }

  if (failures.length > 0) {
    throw new Error(`MCP pilot version check failed:\n${failures.join("\n")}`);
  }

  return {
    required_mcp_version: requiredMcpVersion,
    actual_mcp_version: localMetadata.version,
    package_version: packageVersion,
    local_metadata: localMetadata,
    local_metadata_sha256: hashJson(localMetadata),
  };
}

function validateMcpEndpointMetadata(metadata, requiredMcpVersion = REQUIRED_MCP_VERSION) {
  if (metadata?.name !== "JudgmentKit") {
    throw new Error(`MCP endpoint must identify as JudgmentKit, got ${metadata?.name ?? "unknown"}.`);
  }

  if (metadata?.version !== requiredMcpVersion) {
    throw new Error(
      `MCP endpoint version ${metadata?.version ?? "unknown"} does not match required ${requiredMcpVersion}.`,
    );
  }

  return metadata;
}

export async function fetchMcpEndpointMetadata(mcpUrl, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new Error("MCP pilot requires fetch to validate the MCP endpoint.");
  }

  const response = await fetchImpl(mcpUrl, {
    headers: { accept: "application/json" },
  });

  if (!response?.ok) {
    throw new Error(`MCP metadata request failed with status ${response?.status ?? "unknown"}.`);
  }

  return response.json();
}

export async function startEvalMcpServer(options = {}) {
  const host = options.host ?? "127.0.0.1";
  const server = http.createServer((req, res) => {
    handleJudgmentKitMcpNodeRequest(req, res, options).catch((error) => {
      if (res.headersSent) return;
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : String(error));
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const { port } = server.address();
  return {
    url: `http://${host}:${port}/mcp`,
    server,
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export async function createMcpRuntime(options = {}) {
  let ownedServer = null;
  const requiredMcpVersion = options.requiredMcpVersion ?? REQUIRED_MCP_VERSION;
  let mcpUrl = options.mcpUrl;

  if (!mcpUrl) {
    ownedServer = await startEvalMcpServer();
    mcpUrl = ownedServer.url;
  }

  const endpointMetadata = validateMcpEndpointMetadata(
    await fetchMcpEndpointMetadata(mcpUrl, options.fetchImpl),
    requiredMcpVersion,
  );
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
  const client = new Client({
    name: "judgmentkit-mcp-pilot-eval",
    version: "1.0.0",
  });

  await client.connect(transport);

  return {
    url: mcpUrl,
    endpoint_metadata: endpointMetadata,
    endpoint_metadata_sha256: hashJson(endpointMetadata),
    client,
    async close() {
      await client.close().catch(() => {});
      await transport.close().catch(() => {});
      await ownedServer?.close();
    },
  };
}

export function resolveModelConfigs(options = {}) {
  if (options.matrix && options.models) {
    throw new Error("--matrix and --models cannot be used together.");
  }

  const modelIds = options.models
    ? options.models
    : options.matrix
      ? MODEL_MATRICES[options.matrix]
      : [CODEX_MODEL_CONFIG_ID];

  if (!modelIds) {
    throw new Error(`Unknown MCP pilot model matrix: ${options.matrix}.`);
  }

  return modelIds.map((modelId) => {
    const modelConfig = MODEL_CONFIGS[modelId];
    if (!modelConfig) {
      throw new Error(`Unknown MCP pilot model id: ${modelId}.`);
    }
    return modelConfig;
  });
}

export function resolvePrimaryModelConfig(options = {}, modelConfigs = resolveModelConfigs(options)) {
  const primaryModelId =
    options.primaryModel ??
    (options.matrix ? MODEL_MATRIX_PRIMARY_MODELS[options.matrix] : null) ??
    (modelConfigs.length === 1 ? modelConfigs[0].id : null);

  if (!primaryModelId) {
    return null;
  }

  const primaryModelConfig = modelConfigs.find((modelConfig) => modelConfig.id === primaryModelId);
  if (!primaryModelConfig) {
    throw new Error(`Primary MCP pilot model ${primaryModelId} is not included in this run.`);
  }
  return primaryModelConfig;
}

export function readCases(filePath = CASES_PATH) {
  return readJson(filePath);
}

export function validateCases(cases) {
  const failures = [];
  if (!Array.isArray(cases)) {
    throw new Error("mcp pilot cases must be an array.");
  }

  if (cases.length !== 24) {
    failures.push(`expected exactly 24 cases, got ${cases.length}`);
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

    if (testCase.repair_loop !== undefined) {
      if (testCase.case_type !== "implementation_review") {
        failures.push(`${testCase.id} repair_loop is only supported for implementation_review cases`);
      }
      if (!Array.isArray(testCase.repair_loop?.attempts) || testCase.repair_loop.attempts.length === 0) {
        failures.push(`${testCase.id} repair_loop requires at least one attempt`);
      }
      for (const [attemptIndex, attempt] of (testCase.repair_loop?.attempts ?? []).entries()) {
        if (!attempt?.candidate || typeof attempt.candidate !== "object" || Array.isArray(attempt.candidate)) {
          failures.push(`${testCase.id} repair_loop attempt ${attemptIndex + 1} requires candidate`);
        }
      }
      if (
        testCase.repair_loop?.expected_final_action !== undefined &&
        !["accept", "repair_and_resubmit", "stop_for_human"].includes(
          testCase.repair_loop.expected_final_action,
        )
      ) {
        failures.push(`${testCase.id} repair_loop expected_final_action is invalid`);
      }
    }

    if (testCase.visual_token_adapter_proof !== undefined) {
      if (testCase.case_type !== "implementation_review") {
        failures.push(
          `${testCase.id} visual_token_adapter_proof is only supported for implementation_review cases`,
        );
      }
      if (!["passed", "failed"].includes(testCase.visual_token_adapter_proof.expected_review_status)) {
        failures.push(
          `${testCase.id} visual_token_adapter_proof expected_review_status is invalid`,
        );
      }
      if (!["pass", "fail"].includes(testCase.visual_token_adapter_proof.expected_visual_token_status)) {
        failures.push(
          `${testCase.id} visual_token_adapter_proof expected_visual_token_status is invalid`,
        );
      }
      if (
        testCase.visual_token_adapter_proof.expected_next_agent_action !== undefined &&
        !["accept", "repair_and_resubmit", "stop_for_human"].includes(
          testCase.visual_token_adapter_proof.expected_next_agent_action,
        )
      ) {
        failures.push(
          `${testCase.id} visual_token_adapter_proof expected_next_agent_action is invalid`,
        );
      }
      if (
        testCase.visual_token_adapter_proof.expected_failure_categories !== undefined &&
        !Array.isArray(testCase.visual_token_adapter_proof.expected_failure_categories)
      ) {
        failures.push(
          `${testCase.id} visual_token_adapter_proof expected_failure_categories must be an array`,
        );
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

  const review = result.review && typeof result.review === "object" ? result.review : result;
  const failureCategories = reviewFailureCategories(review).slice(0, 4);
  const repairGroups = review?.repair_instructions?.groups ?? {};
  const repair_guidance = Object.fromEntries(
    Object.entries(repairGroups)
      .slice(0, 3)
      .map(([category, instructions]) => [category, compactPromptItems(instructions, 2)]),
  );
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
    next_agent_action: result.next_agent_action,
    surface_type: result.recommended_surface_type ?? result.surface_type,
    profile_id: result.guidance_profile?.profile_id,
    targeted_questions_count: result.review?.targeted_questions?.length,
    targeted_questions: compactPromptItems(result.review?.targeted_questions ?? result.targeted_questions, 3),
    failure_categories: failureCategories,
    failed_checks: reviewFailedChecks(review).slice(0, 6),
    failed_findings: reviewFailedFindings(review).slice(0, 4).map(compactReviewFinding),
    finding_count: Array.isArray(review?.findings) ? review.findings.length : undefined,
    repair_guidance: Object.keys(repair_guidance).length > 0 ? repair_guidance : undefined,
  };
}

function reviewFailureCategories(review) {
  const groups = review?.repair_instructions?.groups ?? {};
  const categories = Object.entries(groups)
    .filter(([, instructions]) => Array.isArray(instructions) && instructions.length > 0)
    .map(([category]) => category);

  if (categories.length > 0) {
    return categories;
  }

  return [...new Set((review?.findings ?? []).map((finding) => finding.check).filter(Boolean))];
}

function reviewFailedFindings(review) {
  return (review?.findings ?? []).filter(
    (finding) => finding?.severity === undefined || finding.severity === "fail",
  );
}

function reviewFailedChecks(review) {
  return [
    ...new Set(
      reviewFailedFindings(review)
        .map((finding) => String(finding?.check ?? "").trim())
        .filter(Boolean),
    ),
  ];
}

function reviewFailedAccessibilityEvidenceKeys(review) {
  return reviewFailedChecks(review)
    .filter((check) => check.startsWith("accessibility_evidence."))
    .map((check) => check.replace(/^accessibility_evidence\./, ""));
}

function candidateAccessibilityEvidenceKeys(candidate) {
  const evidence =
    candidate?.accessibility_evidence ??
    candidate?.accessibilityEvidence ??
    {};
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return [];
  return Object.entries(evidence)
    .filter(([, value]) => String(value ?? "").trim().length > 0)
    .map(([key]) => key)
    .sort();
}

function missingFailedAccessibilityEvidenceKeys(candidate, review) {
  const provided = new Set(candidateAccessibilityEvidenceKeys(candidate));
  return reviewFailedAccessibilityEvidenceKeys(review).filter((key) => !provided.has(key));
}

function buildReviewRepairChecklist(review) {
  const findings = reviewFailedFindings(review);
  if (findings.length === 0) return ["- No failed checks reported."];

  return findings.map((finding) => {
    const check = String(finding?.check ?? "unknown_check").trim() || "unknown_check";
    const message = String(finding?.message ?? "Repair required.").replace(/\s+/g, " ").trim();
    return `- ${check}: ${message}`;
  });
}

function incrementCount(counts, key, amount = 1) {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + amount;
}

function summarizeRepairLoop(testCase, attemptReviews) {
  if (!testCase.repair_loop) return null;

  const attemptSummaries = attemptReviews.map((review, index) => {
    const failureCategories = reviewFailureCategories(review);
    return {
      attempt: index + 1,
      implementation_review_status: review.implementation_review_status,
      next_agent_action: review.next_agent_action,
      loop_status: review.autofix_loop?.status,
      failure_categories: failureCategories,
      finding_count: review.findings?.length ?? 0,
    };
  });
  const finalAttempt = attemptSummaries.at(-1) ?? null;
  const finalAction = finalAttempt?.next_agent_action ?? null;
  const converged = finalAction === "accept";
  const stoppedForHuman = finalAction === "stop_for_human";
  const failureCategoryCounts = {};

  for (const attempt of attemptSummaries) {
    for (const category of attempt.failure_categories) {
      incrementCount(failureCategoryCounts, category);
    }
  }

  const expectedFinalAction = testCase.repair_loop.expected_final_action ?? null;
  const expectedConverged = testCase.repair_loop.expected_converged;
  const expectationFailures = [];

  if (expectedFinalAction && finalAction !== expectedFinalAction) {
    expectationFailures.push(`expected final action ${expectedFinalAction}, got ${finalAction}`);
  }
  if (typeof expectedConverged === "boolean" && converged !== expectedConverged) {
    expectationFailures.push(`expected converged ${expectedConverged}, got ${converged}`);
  }

  return {
    enabled: true,
    attempts: attemptSummaries.length,
    final_action: finalAction,
    converged,
    stopped_for_human: stoppedForHuman,
    attempts_to_pass: converged ? finalAttempt.attempt : null,
    failure_categories: Object.keys(failureCategoryCounts),
    failure_category_counts: failureCategoryCounts,
    attempt_summaries: attemptSummaries,
    expected_final_action: expectedFinalAction,
    expected_converged: typeof expectedConverged === "boolean" ? expectedConverged : null,
    expectation_status: expectationFailures.length === 0 ? "passed" : "failed",
    expectation_failures: expectationFailures,
  };
}

function summarizeVisualTokenAdapterProof(testCase, review) {
  const proof = testCase.visual_token_adapter_proof;
  if (!proof) return null;

  const failureCategories = reviewFailureCategories(review);
  const visualTokenStatus = review?.checks?.visual_tokens?.status ?? null;
  const expectedFailureCategories = proof.expected_failure_categories ?? [];
  const missingExpectedCategories = expectedFailureCategories.filter(
    (category) => !failureCategories.includes(category),
  );
  const unexpectedCategories = failureCategories.filter(
    (category) => !expectedFailureCategories.includes(category),
  );
  const expectationFailures = [];

  if (review.implementation_review_status !== proof.expected_review_status) {
    expectationFailures.push(
      `expected review status ${proof.expected_review_status}, got ${review.implementation_review_status}`,
    );
  }
  if (visualTokenStatus !== proof.expected_visual_token_status) {
    expectationFailures.push(
      `expected visual token status ${proof.expected_visual_token_status}, got ${visualTokenStatus}`,
    );
  }
  if (
    proof.expected_next_agent_action &&
    review.next_agent_action !== proof.expected_next_agent_action
  ) {
    expectationFailures.push(
      `expected next action ${proof.expected_next_agent_action}, got ${review.next_agent_action}`,
    );
  }
  if (missingExpectedCategories.length > 0) {
    expectationFailures.push(
      `missing expected failure categories ${missingExpectedCategories.join(", ")}`,
    );
  }
  if (unexpectedCategories.length > 0 && proof.allow_additional_failure_categories !== true) {
    expectationFailures.push(
      `unexpected failure categories ${unexpectedCategories.join(", ")}`,
    );
  }

  return {
    enabled: true,
    proof_type: proof.proof_type ?? "visual_token_adapter_boundary",
    implementation_review_status: review.implementation_review_status,
    next_agent_action: review.next_agent_action,
    visual_token_status: visualTokenStatus,
    failure_categories: failureCategories,
    failed_checks: reviewFailedChecks(review),
    expected_review_status: proof.expected_review_status,
    expected_visual_token_status: proof.expected_visual_token_status,
    expected_next_agent_action: proof.expected_next_agent_action ?? null,
    expected_failure_categories: expectedFailureCategories,
    expectation_status: expectationFailures.length === 0 ? "passed" : "failed",
    expectation_failures: expectationFailures,
  };
}

async function recordToolCall(toolCalls, mcpRuntime, name, args) {
  if (!mcpRuntime?.client) {
    throw new Error("MCP pilot requires a localhost MCP client to build guided context.");
  }

  const response = await mcpRuntime.client.callTool({
    name,
    arguments: args,
  });
  const result = response.structuredContent ?? {};
  toolCalls.push({
    name,
    args_sha256: hash(compactJson(args)),
    summary: summarizeToolResult(result),
    response,
    result,
  });

  return result;
}

async function recordLocalToolCall(toolCalls, name, args) {
  const result = await handleToolCall(name, args);
  toolCalls.push({
    name,
    args_sha256: hash(compactJson(args)),
    summary: summarizeToolResult(result),
    response: { structuredContent: result },
    result,
  });

  return result;
}

export async function buildMcpContextForCase(testCase, mcpRuntime) {
  const toolCalls = [];
  const brief = testCase.source_context?.brief ?? "";
  let repairLoopSummary = null;
  let visualTokenAdapterProofSummary = null;

  if (testCase.case_type === "activity_translation" || testCase.case_type === "missing_context_restraint") {
    const activityReview = await recordToolCall(toolCalls, mcpRuntime, "create_activity_model_review", { brief });
    await recordToolCall(toolCalls, mcpRuntime, "recommend_surface_types", {
      brief,
      activity_review: activityReview,
    });
    await recordToolCall(toolCalls, mcpRuntime, "recommend_ui_workflow_profiles", { brief });
  } else if (testCase.case_type === "candidate_validation") {
    const toolName =
      testCase.candidate_kind === "activity_model"
        ? "review_activity_model_candidate"
        : "review_ui_workflow_candidate";
    await recordToolCall(toolCalls, mcpRuntime, toolName, {
      brief,
      candidate: testCase.candidate,
      ...(toolName === "review_ui_workflow_candidate"
        ? { profile_id: "operator-review-ui", surface_type: "workbench" }
        : {}),
    });
  } else if (testCase.case_type === "operator_review_handoff") {
    const workflowReview = await recordToolCall(toolCalls, mcpRuntime, "review_ui_workflow_candidate", {
      brief,
      candidate: testCase.candidate,
      profile_id: "operator-review-ui",
      surface_type: "workbench",
    });
    const implementationContract = await recordToolCall(
      toolCalls,
      mcpRuntime,
      "create_ui_implementation_contract",
      {
        target_stack: "React",
        approved_primitives: ["queue", "detail panel", "decision controls", "handoff receipt"],
        static_rules: ["npm test"],
        browser_qa_checks: ["desktop review", "mobile review"],
      },
    );

    if (workflowReview?.review_status === "ready_for_review") {
      await recordToolCall(toolCalls, mcpRuntime, "create_ui_generation_handoff", {
        workflow_review: workflowReview,
        implementation_contract: implementationContract,
      });
    }
  } else if (testCase.case_type === "implementation_review") {
    const implementationContract = await recordToolCall(
      toolCalls,
      mcpRuntime,
      "create_ui_implementation_contract",
      testCase.implementation_contract_args ?? {},
    );
    const repairAttempts = testCase.repair_loop?.attempts ?? null;
    const attemptReviews = [];

    if (repairAttempts) {
      const maxAttempts = Number(
        testCase.repair_loop.max_attempts ?? repairAttempts.length,
      );

      for (const [attemptIndex, attempt] of repairAttempts.entries()) {
        const review = await recordToolCall(toolCalls, mcpRuntime, "review_ui_implementation_candidate", {
          implementation_contract: implementationContract,
          candidate: attempt.candidate,
          iteration_context: {
            current_attempt: attemptIndex + 1,
            max_attempts: maxAttempts,
          },
        });

        attemptReviews.push(review);

        if (["accept", "stop_for_human"].includes(review.next_agent_action)) {
          break;
        }
      }
    } else {
      const review = await recordToolCall(toolCalls, mcpRuntime, "review_ui_implementation_candidate", {
        implementation_contract: implementationContract,
        candidate: testCase.implementation_candidate,
      });
      attemptReviews.push(review);
    }

    repairLoopSummary = summarizeRepairLoop(testCase, attemptReviews);
    visualTokenAdapterProofSummary = summarizeVisualTokenAdapterProof(
      testCase,
      attemptReviews.at(-1),
    );
  } else {
    throw new Error(`${testCase.id} has unsupported case_type ${testCase.case_type}.`);
  }

  return {
    case_id: testCase.id,
    mcp_url: mcpRuntime.url,
    mcp_version: mcpRuntime.endpoint_metadata?.version,
    mcp_metadata_sha256: mcpRuntime.endpoint_metadata_sha256,
    tool_sequence: toolCalls.map((call) => call.name),
    tool_transcript_sha256: hashJson(toolCalls),
    tool_calls: toolCalls,
    repair_loop_summary: repairLoopSummary ?? null,
    visual_token_adapter_proof_summary: visualTokenAdapterProofSummary ?? null,
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    capture: false,
    observeRepairLoop: false,
    freshObservation: false,
    strict: false,
    cases: null,
    matrix: null,
    models: null,
    primaryModel: process.env.JUDGMENTKIT_MCP_PILOT_PRIMARY_MODEL ?? null,
    mcpUrl: process.env.JUDGMENTKIT_MCP_PILOT_MCP_URL ?? null,
    requiredMcpVersion:
      process.env.JUDGMENTKIT_MCP_PILOT_REQUIRED_MCP_VERSION ?? REQUIRED_MCP_VERSION,
    captureDir: process.env.JUDGMENTKIT_MCP_PILOT_CAPTURE_DIR ?? DEFAULT_CAPTURE_DIR,
    reportsDir: process.env.JUDGMENTKIT_MCP_PILOT_REPORTS_DIR ?? DEFAULT_REPORTS_DIR,
    runDate:
      process.env.JUDGMENTKIT_MCP_PILOT_RUN_DATE ??
      process.env.JUDGMENTKIT_UI_EVAL_RUN_DATE ??
      new Date().toISOString().slice(0, 10),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--capture") args.capture = true;
    else if (arg === "--observe-repair-loop") args.observeRepairLoop = true;
    else if (arg === "--fresh-observation") args.freshObservation = true;
    else if (arg === "--strict") args.strict = true;
    else if (arg === "--cases") args.cases = argv[++index]?.split(",").filter(Boolean) ?? [];
    else if (arg === "--matrix") args.matrix = argv[++index];
    else if (arg === "--models") args.models = argv[++index]?.split(",").filter(Boolean) ?? [];
    else if (arg === "--primary-model") args.primaryModel = argv[++index];
    else if (arg === "--required-mcp-version") args.requiredMcpVersion = argv[++index];
    else if (arg === "--mcp-url") args.mcpUrl = argv[++index];
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

export function captureFilePath(captureDir, ...segments) {
  if (segments.length === 2) {
    const [caseId, variantId] = segments;
    return path.join(captureDir, caseId, `${variantId}.json`);
  }

  const [mcpVersion, modelConfigId, caseId, variantId] = segments;
  return path.join(captureDir, `mcp-${mcpVersion}`, modelConfigId, caseId, `${variantId}.json`);
}

export function repairObservationFilePath(captureDir, mcpVersion, modelConfigId, caseId) {
  return path.join(
    captureDir,
    `mcp-${mcpVersion}`,
    modelConfigId,
    caseId,
    "repair-loop-observation.json",
  );
}

function loadCapture(captureDir, testCase, variant, modelConfig, mcpVersion) {
  const filePath = captureFilePath(captureDir, mcpVersion, modelConfig.id, testCase.id, variant.id);
  if (!fs.existsSync(filePath)) return null;
  const capture = readJson(filePath);
  if (
    capture.case_id !== testCase.id ||
    capture.variant_id !== variant.id ||
    capture.model_config_id !== modelConfig.id
  ) {
    throw new Error(`Capture mismatch in ${filePath}.`);
  }
  if (capture.mcp_version !== mcpVersion) return null;
  return capture;
}

function internalTermsToAvoid(testCase) {
  const sourceBrief = normalizeText(testCase.source_context?.brief);
  const candidateTerms = testCase.candidate?.diagnostics?.implementation_terms ?? [];
  const commonTerms = [
    "JSON schema",
    "database field",
    "database",
    "API endpoint",
    "API",
    "CRUD",
    "prompt",
    "prompt template",
    "tool call",
    "tool trace",
  ];
  const uniqueTerms = [];

  for (const term of [...candidateTerms, ...commonTerms]) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm || sourceBrief.includes(normalizedTerm)) continue;
    if (!uniqueTerms.some((existing) => normalizeText(existing) === normalizedTerm)) {
      uniqueTerms.push(term);
    }
  }

  return uniqueTerms.slice(0, 8);
}

function outputTermsToAvoid(testCase) {
  const uniqueTerms = [];
  for (const term of [...(testCase.forbidden_terms ?? []), ...internalTermsToAvoid(testCase)]) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (!uniqueTerms.some((existing) => normalizeText(existing) === normalizedTerm)) {
      uniqueTerms.push(term);
    }
  }
  return uniqueTerms.slice(0, 12);
}

function redactInternalTermsForPrompt(value, terms) {
  if (!value || terms.length === 0) return value;
  if (typeof value === "string") {
    return terms
      .slice()
      .sort((left, right) => right.length - left.length)
      .reduce(
        (text, term) => text.replace(new RegExp(escapeRegExp(term), "gi"), "[internal detail]"),
        value,
      );
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactInternalTermsForPrompt(item, terms));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        redactInternalTermsForPrompt(entry, terms),
      ]),
    );
  }
  return value;
}

function promptSourceBrief(testCase, variant) {
  const brief = testCase.source_context?.brief ?? "";
  if (variant.id !== "judgmentkit_mcp") return brief;
  return redactInternalTermsForPrompt(brief, outputTermsToAvoid(testCase));
}

function promptTaskPrompt(testCase, variant) {
  if (variant.id !== "judgmentkit_mcp") return testCase.task_prompt;
  return redactInternalTermsForPrompt(testCase.task_prompt, outputTermsToAvoid(testCase));
}

function promptFixture(testCase, variant, fixture) {
  if (variant.id !== "judgmentkit_mcp") return fixture;
  return redactInternalTermsForPrompt(fixture, outputTermsToAvoid(testCase));
}

function promptFixtureLabel(testCase, variant, defaultLabel) {
  if (variant.id !== "judgmentkit_mcp") return defaultLabel;
  if ((testCase.forbidden_terms ?? []).some((term) => normalizeText(term) === "candidate")) {
    return "Submitted evidence";
  }
  if (defaultLabel === "Implementation candidate") return "Implementation evidence";
  return "Submitted fixture";
}

function buildImplementationResponseDirective(testCase, mcpContext) {
  if (testCase.case_type !== "implementation_review" || !mcpContext?.repair_loop_summary) {
    return null;
  }

  const repairLoop = mcpContext.repair_loop_summary;
  const firstAttempt = repairLoop.attempt_summaries?.[0] ?? null;
  const firstAttemptCategories = firstAttempt?.failure_categories ?? [];
  const originalFailed =
    firstAttempt &&
    (firstAttempt.implementation_review_status !== "passed" ||
      firstAttempt.next_agent_action !== "accept");
  const failedCategories =
    firstAttemptCategories.length > 0 ? firstAttemptCategories : repairLoop.failure_categories ?? [];
  const decisionForResponse = repairLoop.stopped_for_human
    ? "block original implementation and require human review"
    : originalFailed
      ? "reject original implementation and require repair"
      : "accept implementation evidence";

  return {
    decision_for_benchmark_response: decisionForResponse,
    original_implementation_status: originalFailed ? "failed" : "passed",
    first_attempt_action: firstAttempt?.next_agent_action ?? null,
    final_repair_loop_action: repairLoop.final_action,
    final_repair_loop_meaning:
      originalFailed && repairLoop.final_action === "accept"
        ? "a later repaired attempt passed; do not accept the original implementation evidence"
        : repairLoop.stopped_for_human
          ? "repeated failures require a human review stop"
          : "use the final action as verification context",
    failed_categories: failedCategories,
    evidence_scope:
      "Use only issues visible in the source brief, submitted implementation evidence, first failed review, and failed categories; do not invent broad primitive, state, browser QA, or accessibility findings.",
    required_handoff_focus: ["decision", "reason", "required fix", "verification"],
  };
}

function compactRepairLoopSummaryForPrompt(testCase, repairLoop) {
  if (!repairLoop) return null;
  if (testCase.case_type !== "implementation_review") return repairLoop;

  const firstAttempt = repairLoop.attempt_summaries?.[0] ?? null;
  const lastAttempt = repairLoop.attempt_summaries?.at(-1) ?? null;
  const originalFailed =
    firstAttempt &&
    (firstAttempt.implementation_review_status !== "passed" ||
      firstAttempt.next_agent_action !== "accept");

  return {
    attempts: repairLoop.attempts,
    original_implementation_status: originalFailed ? "failed" : "passed",
    first_attempt_action: firstAttempt?.next_agent_action ?? null,
    last_attempt_action: lastAttempt?.next_agent_action ?? null,
    loop_outcome: repairLoop.stopped_for_human
      ? "stopped_for_human_review"
      : originalFailed && repairLoop.final_action === "accept"
        ? "later_repair_attempt_passed_after_fixes"
        : repairLoop.final_action,
    stopped_for_human: repairLoop.stopped_for_human,
    failed_categories: repairLoop.failure_categories ?? [],
    attempt_summaries: (repairLoop.attempt_summaries ?? []).map((attempt) => ({
      attempt: attempt.attempt,
      status: attempt.implementation_review_status,
      next_action: attempt.next_agent_action,
      failure_categories: attempt.failure_categories,
      finding_count: attempt.finding_count,
    })),
  };
}

function guidedCaseGuidance(testCase) {
  const avoidTerms = outputTermsToAvoid(testCase);
  const guidance = [
    "Use MCP context as diagnostic guidance, not text to quote.",
    "Do not cite tool names, MCP, tool traces, or raw internal fixture fields in the response.",
  ];

  if (avoidTerms.length > 0) {
    guidance.push(
      "Some source or fixture details are source-only and may be redacted in the prompt; do not reconstruct, name, or quote them in the output. Paraphrase them as user-facing workflow, evidence, routing, or product-label issues.",
    );
    guidance.push(
      "For user questioning, write ask, request, or guide instead of the internal term prompt.",
    );
  }

  if (testCase.case_type === "activity_translation") {
    guidance.push(
      "Produce a concrete domain-facing handoff from the source brief; missing-context signals may add targeted questions but must not replace the next action.",
    );
    guidance.push(
      "If the brief already names the user, decision choices, and desired handoff or summary, treat it as sufficient; questions must be empty or limited to one narrow downstream-detail question.",
    );
  } else if (testCase.case_type === "missing_context_restraint") {
    guidance.push(
      "When the source brief is vague, do not invent the surface; ask targeted questions about activity, decision, and outcome.",
    );
  } else if (testCase.case_type === "candidate_validation") {
    guidance.push(
      "Make a clear trust/reject decision against the source brief; describe mismatches with source-domain language and a concise reason.",
    );
    guidance.push(
      "When the submitted fixture clearly conflicts with the source brief or exposes internal mechanics, reject it decisively, set questions to [], and make next_action the repair direction rather than another review.",
    );
  } else if (testCase.case_type === "operator_review_handoff") {
    guidance.push(
      "Prepare a routing handoff that names the owner, next action, reason, route options, and evidence gap; ask at most one clarification only if needed.",
    );
  } else if (testCase.case_type === "implementation_review") {
    guidance.push(
      "Make an accept/reject/block decision from the implementation evidence; do not ask questions when a required fix or verification is available.",
    );
    guidance.push(
      "Name the affected operator review, custom controls, decision controls, required fix, and verification when the source or submitted evidence provides them.",
    );
    guidance.push(
      "If the first implementation review attempt failed, reject or block the original implementation and name the required fix even when a later repair-loop attempt passed.",
    );
    guidance.push(
      "For implementation-review responses, cite only evidence present in the source brief, submitted implementation evidence, and first failed review; do not add unsupported broad claims about primitives, state coverage, browser QA, repeated failures, or accessibility scope.",
    );
    guidance.push(
      "If the repair loop stops for human review, do not soften it into generic repair; block and require human verification.",
    );
  }

  if (testCase.id === "crm-json-import-translation") {
    guidance.push(
      "Case focus: produce an account-operations record acceptance review. Name records ready for acceptance, records needing owner fixes, and the import summary to send; do not invent rejected-record or manual-correction workflows.",
    );
  } else if (testCase.id === "billing-webhook-debug-boundary") {
    guidance.push(
      "Case focus: produce billing incident triage. Use customer-visible, engineering escalation, and retry-resolution decisions; paraphrase technical event evidence as billing evidence without abandoning the decision workflow.",
    );
  } else if (testCase.id === "invented-activity-candidate") {
    guidance.push(
      "Case focus: reject the ungrounded activity and request a refund-triage-aligned replacement; questions must be [].",
    );
  } else if (testCase.id === "schema-leaking-workflow") {
    guidance.push(
      "Case focus: reject and discard the submitted workflow because it exposes internal mechanics instead of refund triage; questions must be [].",
    );
  } else if (testCase.id === "surface-type-mismatch") {
    guidance.push(
      "Case focus: reject the submitted workflow and return to product landing-page intent for AI tooling teams deciding whether to install JudgmentKit; questions must be [].",
    );
  } else if (testCase.id === "modal-action-order-review") {
    guidance.push(
      "Case focus: block until modal action order and focus behavior evidence are verified. Required fix should name final-action clarity and keyboard focus verification only.",
    );
  }

  guidance.push(
    "Use handoff as one concise labeled string with decision/action/reason; add owner, evidence gap, required fix, or verification when relevant.",
  );
  guidance.push(
    "If MCP context includes failure categories, repair guidance, or a repair-loop outcome, turn that into the required fix and verification in the handoff.",
  );

  return guidance;
}

export function buildCapturePrompt(testCase, variant, mcpContext) {
  const rawMcpPromptContext = mcpContext
    ? {
        case_id: mcpContext.case_id,
        mcp_version: mcpContext.mcp_version,
        tool_count: mcpContext.tool_calls.length,
        tool_summaries: mcpContext.tool_calls.map((call, index) => ({
          step: index + 1,
          summary: call.summary,
        })),
        repair_loop_summary: compactRepairLoopSummaryForPrompt(
          testCase,
          mcpContext.repair_loop_summary,
        ),
        implementation_response_directive: buildImplementationResponseDirective(testCase, mcpContext),
      }
    : null;
  const mcpPromptContext =
    variant.id === "judgmentkit_mcp" && rawMcpPromptContext
      ? redactInternalTermsForPrompt(rawMcpPromptContext, outputTermsToAvoid(testCase))
      : rawMcpPromptContext;
  const outputGuidance = [
    "Write the next agent-facing response plan, not a UI spec or benchmark commentary.",
  ];
  const mcpGuidance =
    variant.id === "judgmentkit_mcp"
      ? guidedCaseGuidance(testCase)
      : [];

  return [
    "You are producing one private JudgmentKit MCP pilot benchmark response.",
    "Return JSON only. Do not include Markdown fences.",
    "Shape: response, next_action, questions, handoff, rationale.",
    "Use handoff as one concise string when an owner, action, reason, fix, or evidence gap is needed.",
    "Questions must be targeted and only used when source context is missing.",
    "Do not mention the benchmark setup, scoring rubric, treatment labels, or evaluator.",
    ...outputGuidance,
    ...mcpGuidance,
    "",
    `Case: ${testCase.title}`,
    `Task: ${promptTaskPrompt(testCase, variant)}`,
    `Source brief: ${promptSourceBrief(testCase, variant)}`,
    testCase.candidate
      ? `${promptFixtureLabel(testCase, variant, "Candidate fixture")}:\n${compactJson(promptFixture(testCase, variant, testCase.candidate))}`
      : "",
    testCase.implementation_candidate
      ? `${promptFixtureLabel(testCase, variant, "Implementation candidate")}:\n${compactJson(promptFixture(testCase, variant, testCase.implementation_candidate))}`
      : "",
    "",
    variant.id === "judgmentkit_mcp"
      ? `JudgmentKit MCP context to use:\n${compactJson(mcpPromptContext)}`
      : "No JudgmentKit MCP context is available. Work only from the source brief and fixture.",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseCaptureOutput(rawResponse) {
  try {
    const parsed = JSON.parse(rawResponse);
    for (const field of CAPTURE_OUTPUT_SCHEMA.required) {
      if (parsed[field] === undefined) {
        throw new Error(`missing required field ${field}`);
      }
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

export function buildRepairObservationPrompt({
  testCase,
  implementationContract,
  currentCandidate,
  review,
  currentAttempt,
  maxAttempts,
}) {
  const failedChecks = reviewFailedChecks(review);
  const failedAccessibilityEvidenceKeys = reviewFailedAccessibilityEvidenceKeys(review);
  const reviewContext = {
    implementation_review_status: review?.implementation_review_status,
    next_agent_action: review?.next_agent_action,
    autofix_loop: review?.autofix_loop,
    failure_categories: reviewFailureCategories(review),
    failed_checks: failedChecks,
    failed_accessibility_evidence_keys: failedAccessibilityEvidenceKeys,
    repair_instructions: review?.repair_instructions ?? null,
    findings: review?.findings ?? [],
  };
  const failedAccessibilityKeyList =
    failedAccessibilityEvidenceKeys.length > 0
      ? failedAccessibilityEvidenceKeys.join(", ")
      : "none";

  return [
    "You are the calling agent in a JudgmentKit UI implementation repair loop.",
    "Return JSON only. Do not include Markdown fences or commentary.",
    "Shape: candidate, rationale.",
    "candidate must be the complete revised implementation_candidate object for the next review attempt.",
    "candidate must include primitives_used, states_covered, static_checks, browser_qa, accessibility_evidence, actions, action_boundary_evidence, data_visibility_evidence, and visible_text.",
    "candidate.accessibility_evidence must include every allowed accessibility key because the structured output schema is strict.",
    "Core accessibility keys require concise pass, passed, or verified evidence. Conditional accessibility keys require evidence only when the current review lists that exact key as failed or the current candidate already contains that exact pattern; otherwise set the conditional key to an empty string.",
    `Allowed accessibility_evidence keys: ${REPAIR_ACCESSIBILITY_EVIDENCE_KEYS.join(", ")}.`,
    `Failed accessibility_evidence keys for this attempt: ${failedAccessibilityKeyList}.`,
    "For every failed accessibility_evidence key, add or update candidate.accessibility_evidence.<key> with pass, passed, or verified evidence. Do not only mention accessibility fixes in rationale.",
    "Do not proactively fill conditional accessibility fields that are not in the failed accessibility key list. Adding extra conditional evidence can introduce new review obligations.",
    "Do not infer extra visual, motion, media, hover, tooltip, popover, chart, canvas, WebGL, gradient, or background behavior from contract examples.",
    "Use positive evidence wording and avoid failure-trigger words such as fail, failed, missing, skipped, blocked, hidden, obscured, covered, trap, trapped, overflow, overlapping, illegible, animation, moving, blinking, scrolling, image, canvas, WebGL, video, gradient, chart, graph, tooltip, popover, hover, and visual background unless that exact failed key requires the term.",
    "Preferred wording: responsive_no_overflow='pass: reflow verified at 375px and 200% zoom with single-axis reading and reachable controls'; focus_not_obscured='pass: active focus remains fully visible throughout modal navigation'; no_keyboard_trap='pass: keyboard users can leave the modal with Escape or Cancel and continue page traversal'.",
    "If a failed key is about contrast or rendered backgrounds, include browser-rendered or computed evidence and ratios where applicable.",
    "Use empty arrays or empty strings for non-accessibility fields that are not relevant to the case.",
    "Repair only the candidate evidence object; do not mutate files and do not describe a rendered UI.",
    "Use JudgmentKit repair instructions as constraints, not user-facing copy.",
    "Preserve domain language and avoid primary UI text that exposes internal implementation terms.",
    `Attempt: ${currentAttempt} of ${maxAttempts}`,
    "",
    `Case: ${testCase.title}`,
    `Source brief: ${testCase.source_context?.brief ?? ""}`,
    "",
    `Implementation contract:\n${compactJson(implementationContract?.implementation_contract ?? implementationContract)}`,
    "",
    `Current implementation_candidate:\n${compactJson(currentCandidate)}`,
    "",
    `Repair checklist:\n${buildReviewRepairChecklist(review).join("\n")}`,
    "",
    `JudgmentKit review result:\n${compactJson(reviewContext)}`,
  ].join("\n");
}

function parseRepairCandidateOutput(rawResponse) {
  try {
    const parsed = JSON.parse(rawResponse);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("repair output must be an object");
    }
    if (!parsed.candidate || typeof parsed.candidate !== "object" || Array.isArray(parsed.candidate)) {
      throw new Error("repair output requires object field candidate");
    }
    if (typeof parsed.rationale !== "string") {
      throw new Error("repair output requires string field rationale");
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

function runCodexCapture(prompt, modelConfig, testCase, variant, outputSchemaPath, outputFilePath) {
  const args = [
    "exec",
    "--model",
    modelConfig.model,
    "-c",
    `model_reasoning_effort="${modelConfig.reasoning_effort}"`,
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
    provider: modelConfig.provider,
    runtime: "codex exec",
    status: execution.status,
    stdout_sha256: hash(execution.stdout ?? ""),
    stderr_sha256: hash(execution.stderr ?? ""),
    usage: null,
    command_display: `codex ${args
      .map((arg) => (arg === outputSchemaPath ? "<schema>" : arg === outputFilePath ? "<output>" : arg))
      .join(" ")}`,
  };
}

async function runCodexRepairCandidateProvider(context) {
  const {
    testCase,
    implementationContract,
    currentCandidate,
    review,
    currentAttempt,
    maxAttempts,
    modelConfig,
  } = context;
  const prompt = buildRepairObservationPrompt({
    testCase,
    implementationContract,
    currentCandidate,
    review,
    currentAttempt,
    maxAttempts,
  });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-repair-"));
  const outputSchemaPath = path.join(tempDir, "repair-candidate-schema.json");
  const outputFilePath = path.join(tempDir, `${testCase.id}-repair-${currentAttempt}.json`);
  fs.writeFileSync(outputSchemaPath, JSON.stringify(REPAIR_CANDIDATE_OUTPUT_SCHEMA, null, 2));

  const startedAt = Date.now();
  const execution = runCodexCapture(
    prompt,
    modelConfig,
    testCase,
    { id: "repair_loop_observation" },
    outputSchemaPath,
    outputFilePath,
  );
  const rawResponse = fs.readFileSync(outputFilePath, "utf8");
  const durationMs = Date.now() - startedAt;
  const parsed = parseRepairCandidateOutput(rawResponse);

  return {
    provider: modelConfig.provider,
    runtime: execution.runtime,
    model_config_id: modelConfig.id,
    model: modelConfig.model,
    duration_ms: durationMs,
    prompt_sha256: hash(prompt),
    raw_response_sha256: hash(rawResponse),
    raw_response: rawResponse,
    output_valid: parsed.output_valid,
    parse_error: parsed.parse_error,
    candidate: parsed.parsed?.candidate ?? null,
    rationale: parsed.parsed?.rationale ?? null,
    execution,
  };
}

export async function verifyLmStudioModelAvailable(modelConfig, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("LM Studio capture requires fetch.");
  }

  const response = await fetchImpl(`${modelConfig.base_url}/models`, {
    headers: { accept: "application/json" },
  });

  if (!response?.ok) {
    throw new Error(`LM Studio model list failed with status ${response?.status ?? "unknown"}.`);
  }

  const body = await response.json();
  const modelIds = (body.data ?? []).map((entry) => entry.id);
  if (!modelIds.includes(modelConfig.model)) {
    throw new Error(
      `LM Studio model ${modelConfig.model} is not loaded. Loaded models: ${modelIds.join(", ") || "none"}.`,
    );
  }

  return true;
}

export async function runLmStudioChatCompletion(prompt, modelConfig, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("LM Studio capture requires fetch.");
  }

  const response = await fetchImpl(`${modelConfig.base_url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      model: modelConfig.model,
      temperature: 0,
      max_tokens: 1200,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "judgmentkit_mcp_pilot_capture",
          strict: true,
          schema: CAPTURE_OUTPUT_SCHEMA,
        },
      },
      messages: [
        {
          role: "system",
          content: "Return exactly one JSON object. Do not include Markdown fences or commentary.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response?.ok) {
    const failureText = typeof response?.text === "function" ? await response.text().catch(() => "") : "";
    const suffix = failureText ? `: ${failureText}` : "";
    throw new Error(`LM Studio chat completion failed with status ${response?.status ?? "unknown"}${suffix}`);
  }

  const body = await response.json();
  const rawResponse = body.choices?.[0]?.message?.content;
  if (typeof rawResponse !== "string") {
    throw new Error("LM Studio chat completion did not include choices[0].message.content.");
  }

  return {
    provider: modelConfig.provider,
    runtime: "lmstudio-openai-compatible",
    status: response.status ?? 200,
    raw_response: rawResponse,
    usage: body.usage ?? null,
    response_sha256: hashJson(body),
    request_model: modelConfig.model,
  };
}

async function runModelCapture(prompt, modelConfig, testCase, variant, outputSchemaPath, outputFilePath, options = {}) {
  if (modelConfig.provider === "codex") {
    const execution = runCodexCapture(prompt, modelConfig, testCase, variant, outputSchemaPath, outputFilePath);
    return {
      raw_response: fs.readFileSync(outputFilePath, "utf8"),
      execution,
    };
  }

  if (modelConfig.provider === "lmstudio-openai-chat") {
    const execution = await runLmStudioChatCompletion(prompt, modelConfig, options);
    return {
      raw_response: execution.raw_response,
      execution,
    };
  }

  throw new Error(`Unsupported MCP pilot capture provider: ${modelConfig.provider}.`);
}

async function captureVariant(testCase, variant, mcpContext, captureDir, modelConfig, mcpVersionInfo, options = {}) {
  const prompt = buildCapturePrompt(testCase, variant, mcpContext);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-capture-"));
  const outputSchemaPath = path.join(tempDir, "schema.json");
  const outputFilePath = path.join(tempDir, `${testCase.id}-${variant.id}.json`);
  fs.writeFileSync(outputSchemaPath, JSON.stringify(CAPTURE_OUTPUT_SCHEMA, null, 2));

  const startedAt = Date.now();
  const { raw_response: rawResponse, execution } = await runModelCapture(
    prompt,
    modelConfig,
    testCase,
    variant,
    outputSchemaPath,
    outputFilePath,
    options,
  );
  const durationMs = Date.now() - startedAt;
  const { output_valid, parsed, parse_error } = parseCaptureOutput(rawResponse);
  const sourceContext = compactJson({
    source_context: testCase.source_context,
    candidate: testCase.candidate,
    implementation_candidate: testCase.implementation_candidate,
    mcp_context: variant.id === "judgmentkit_mcp" ? mcpContext : null,
    model_config: modelConfig,
  });

  const capture = {
    capture_type: "model-output-transcript",
    case_id: testCase.id,
    variant_id: variant.id,
    treatment: variant.treatment,
    mcp_version: mcpVersionInfo.actual_mcp_version,
    mcp_url: mcpContext?.mcp_url ?? null,
    mcp_metadata_sha256: mcpContext?.mcp_metadata_sha256 ?? mcpVersionInfo.local_metadata_sha256,
    mcp_tool_sequence: variant.id === "judgmentkit_mcp" ? mcpContext?.tool_sequence ?? [] : [],
    mcp_tool_transcript_sha256:
      variant.id === "judgmentkit_mcp" ? mcpContext?.tool_transcript_sha256 ?? null : null,
    model_config_id: modelConfig.id,
    provider: modelConfig.provider,
    runtime: execution.runtime,
    local: modelConfig.local,
    model: modelConfig.model,
    cli: modelConfig.provider === "codex" ? "codex" : null,
    reasoning_effort: modelConfig.reasoning_effort ?? null,
    runner: "evals/run-mcp-pilot-evals.mjs",
    captured_at: new Date().toISOString(),
    duration_ms: durationMs,
    output_valid,
    parse_error,
    usage: execution.usage ?? null,
    source_context_sha256: hash(sourceContext),
    prompt_sha256: hash(prompt),
    mcp_context_sha256: variant.id === "judgmentkit_mcp" ? hash(compactJson(mcpContext)) : null,
    raw_response_sha256: hash(rawResponse),
    raw_response: rawResponse,
    parsed,
    execution,
  };

  writeJson(
    captureFilePath(captureDir, mcpVersionInfo.actual_mcp_version, modelConfig.id, testCase.id, variant.id),
    capture,
  );
  return capture;
}

function repairObservationSummary(transcript, captureStatus = transcript.capture_status) {
  const attempts = transcript.attempts ?? [];
  const finalAttempt = attempts.at(-1) ?? null;
  const finalAction = finalAttempt?.next_agent_action ?? transcript.final_action ?? null;
  const converged = finalAction === "accept";
  const stoppedForHuman = finalAction === "stop_for_human";
  const allCategories = new Set(attempts.flatMap((attempt) => attempt.failure_categories ?? []));
  const finalCategories = new Set(finalAttempt?.failure_categories ?? []);
  const unresolvedCategories = converged ? [] : [...finalCategories];
  const followedRepairCategories = [...allCategories].filter(
    (category) => !finalCategories.has(category),
  );
  const unresolvedAccessibilityEvidenceKeys = converged
    ? []
    : finalAttempt?.failed_accessibility_evidence_keys ?? [];

  return {
    enabled: true,
    observation_type: "codex_cli_live_dogfood",
    capture_status: captureStatus,
    transcript_file: transcript.transcript_file ?? null,
    model_config_id: transcript.model_config_id ?? CODEX_MODEL_CONFIG_ID,
    provider: transcript.provider ?? "codex",
    model: transcript.model ?? MODEL_ID,
    attempts: attempts.length,
    final_action: finalAction,
    converged,
    stopped_for_human: stoppedForHuman,
    attempts_to_pass: converged ? finalAttempt?.attempt ?? null : null,
    followed_repair_categories: followedRepairCategories,
    unresolved_categories: unresolvedCategories,
    unresolved_accessibility_evidence_keys: unresolvedAccessibilityEvidenceKeys,
    candidate_hashes: attempts.map((attempt) => attempt.candidate_sha256).filter(Boolean),
    attempt_summaries: attempts.map((attempt) => ({
      attempt: attempt.attempt,
      candidate_sha256: attempt.candidate_sha256,
      next_agent_action: attempt.next_agent_action,
      loop_status: attempt.loop_status,
      failure_categories: attempt.failure_categories ?? [],
      provided_accessibility_evidence_keys:
        attempt.provided_accessibility_evidence_keys ?? [],
      failed_accessibility_evidence_keys:
        attempt.failed_accessibility_evidence_keys ?? [],
      missing_failed_accessibility_evidence_keys:
        attempt.missing_failed_accessibility_evidence_keys ?? [],
      repair_capture_status: attempt.repair_capture_status ?? null,
      repair_candidate_sha256: attempt.repair_candidate_sha256 ?? null,
      repair_candidate_accessibility_evidence_keys:
        attempt.repair_candidate_accessibility_evidence_keys ?? [],
      repair_candidate_missing_failed_accessibility_evidence_keys:
        attempt.repair_candidate_missing_failed_accessibility_evidence_keys ?? [],
    })),
    error: transcript.error ?? null,
  };
}

async function captureRepairLoopObservation(testCase, mcpRuntime, options = {}) {
  const modelConfig = options.observationModelConfig ?? MODEL_CONFIGS[CODEX_MODEL_CONFIG_ID];
  const repairCandidateProvider = options.repairCandidateProvider ?? runCodexRepairCandidateProvider;
  const toolCalls = [];
  const implementationContract =
    options.mcpContext?.tool_calls?.find((call) => call.name === "create_ui_implementation_contract")
      ?.result ??
    (await recordLocalToolCall(
      toolCalls,
      "create_ui_implementation_contract",
      testCase.implementation_contract_args ?? {},
    ));
  const maxAttempts = Number(
    testCase.repair_loop?.max_attempts ??
      implementationContract.implementation_contract?.iteration_policy?.default_max_attempts ??
      3,
  );
  let currentCandidate = testCase.implementation_candidate;
  const attempts = [];
  let captureStatus = "captured";
  let observationError = null;

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const currentAttempt = attemptIndex + 1;
    const review = await recordLocalToolCall(toolCalls, "review_ui_implementation_candidate", {
      implementation_contract: implementationContract,
      candidate: currentCandidate,
      iteration_context: {
        current_attempt: currentAttempt,
        max_attempts: maxAttempts,
      },
    });
    const failureCategories = reviewFailureCategories(review);
    const failedAccessibilityEvidenceKeys = reviewFailedAccessibilityEvidenceKeys(review);
    const attemptSummary = {
      attempt: currentAttempt,
      candidate_sha256: hashJson(currentCandidate),
      implementation_review_status: review.implementation_review_status,
      next_agent_action: review.next_agent_action,
      loop_status: review.autofix_loop?.status ?? null,
      failure_categories: failureCategories,
      failed_checks: reviewFailedChecks(review),
      provided_accessibility_evidence_keys: candidateAccessibilityEvidenceKeys(currentCandidate),
      failed_accessibility_evidence_keys: failedAccessibilityEvidenceKeys,
      missing_failed_accessibility_evidence_keys: missingFailedAccessibilityEvidenceKeys(
        currentCandidate,
        review,
      ),
      finding_count: review.findings?.length ?? 0,
      review_sha256: hashJson(review),
    };
    attempts.push(attemptSummary);

    if (["accept", "stop_for_human"].includes(review.next_agent_action)) {
      break;
    }

    if (currentAttempt >= maxAttempts) {
      break;
    }

    try {
      const repairCapture = await repairCandidateProvider({
        testCase,
        implementationContract,
        currentCandidate,
        review,
        currentAttempt,
        maxAttempts,
        modelConfig,
      });

      attemptSummary.repair_capture_status = repairCapture.output_valid === false ? "failed" : "captured";
      attemptSummary.repair_prompt_sha256 = repairCapture.prompt_sha256 ?? null;
      attemptSummary.repair_raw_response_sha256 = repairCapture.raw_response_sha256 ?? null;
      attemptSummary.repair_duration_ms = repairCapture.duration_ms ?? null;
      attemptSummary.repair_rationale = repairCapture.rationale ?? null;
      attemptSummary.repair_parse_error = repairCapture.parse_error ?? null;
      attemptSummary.repair_execution = repairCapture.execution
        ? {
            runtime: repairCapture.execution.runtime ?? null,
            status: repairCapture.execution.status ?? null,
            stdout_sha256: repairCapture.execution.stdout_sha256 ?? null,
            stderr_sha256: repairCapture.execution.stderr_sha256 ?? null,
            command_display: repairCapture.execution.command_display ?? null,
          }
        : null;

      if (!repairCapture.candidate || repairCapture.output_valid === false) {
        captureStatus = "failed";
        observationError =
          repairCapture.parse_error ?? "repair candidate provider did not return a candidate";
        break;
      }

      currentCandidate = repairCapture.candidate;
      attemptSummary.repair_candidate_sha256 = hashJson(currentCandidate);
      attemptSummary.repair_candidate_accessibility_evidence_keys =
        candidateAccessibilityEvidenceKeys(currentCandidate);
      attemptSummary.repair_candidate_missing_failed_accessibility_evidence_keys =
        failedAccessibilityEvidenceKeys.filter(
          (key) => !attemptSummary.repair_candidate_accessibility_evidence_keys.includes(key),
        );
    } catch (error) {
      captureStatus = "failed";
      observationError = error instanceof Error ? error.message : String(error);
      attemptSummary.repair_capture_status = "failed";
      attemptSummary.repair_error = observationError;
      break;
    }
  }

  const finalAttempt = attempts.at(-1) ?? null;
  const sourceContext = compactJson({
    source_context: testCase.source_context,
    implementation_candidate: testCase.implementation_candidate,
    implementation_contract_args: testCase.implementation_contract_args,
    model_config: modelConfig,
  });

  return {
    capture_type: "repair-loop-observation-transcript",
    observation_type: "codex_cli_live_dogfood",
    observation_policy:
      "Live dogfood observation of agent-owned repair behavior; not a deterministic fixture proof, visual-quality score, or pass/fail gate.",
    capture_status: captureStatus,
    case_id: testCase.id,
    mcp_version: options.mcpVersionInfo.actual_mcp_version,
    mcp_url: mcpRuntime?.url ?? null,
    mcp_metadata_sha256: mcpRuntime?.endpoint_metadata_sha256 ?? options.mcpVersionInfo.local_metadata_sha256,
    mcp_tool_sequence: toolCalls.map((call) => call.name),
    mcp_tool_transcript_sha256: hashJson(toolCalls),
    model_config_id: modelConfig.id,
    provider: modelConfig.provider,
    runtime: "codex exec",
    local: modelConfig.local,
    model: modelConfig.model,
    cli: "codex",
    reasoning_effort: modelConfig.reasoning_effort ?? null,
    runner: "evals/run-mcp-pilot-evals.mjs",
    captured_at: new Date().toISOString(),
    source_context_sha256: hash(sourceContext),
    attempts,
    final_action: finalAttempt?.next_agent_action ?? null,
    error: observationError,
  };
}

async function buildRepairLoopObservation(testCase, mcpRuntime, options = {}) {
  const modelConfig = options.observationModelConfig ?? MODEL_CONFIGS[CODEX_MODEL_CONFIG_ID];
  const filePath = repairObservationFilePath(
    options.captureDir,
    options.mcpVersionInfo.actual_mcp_version,
    modelConfig.id,
    testCase.id,
  );
  const transcriptFile = path.relative(ROOT_DIR, filePath).split(path.sep).join("/");

  if (!options.freshObservation && fs.existsSync(filePath)) {
    const transcript = readJson(filePath);
    if (
      transcript.case_id !== testCase.id ||
      transcript.mcp_version !== options.mcpVersionInfo.actual_mcp_version ||
      transcript.model_config_id !== modelConfig.id
    ) {
      throw new Error(`Repair-loop observation mismatch in ${filePath}.`);
    }
    return repairObservationSummary({ ...transcript, transcript_file: transcriptFile }, "cached");
  }

  let transcript;
  try {
    transcript = await captureRepairLoopObservation(testCase, mcpRuntime, options);
  } catch (error) {
    transcript = {
      capture_type: "repair-loop-observation-transcript",
      observation_type: "codex_cli_live_dogfood",
      observation_policy:
        "Live dogfood observation of agent-owned repair behavior; not a deterministic fixture proof, visual-quality score, or pass/fail gate.",
      capture_status: "failed",
      case_id: testCase.id,
      mcp_version: options.mcpVersionInfo.actual_mcp_version,
      mcp_url: mcpRuntime?.url ?? null,
      mcp_metadata_sha256:
        mcpRuntime?.endpoint_metadata_sha256 ?? options.mcpVersionInfo.local_metadata_sha256,
      model_config_id: modelConfig.id,
      provider: modelConfig.provider,
      runtime: "codex exec",
      local: modelConfig.local,
      model: modelConfig.model,
      cli: "codex",
      reasoning_effort: modelConfig.reasoning_effort ?? null,
      runner: "evals/run-mcp-pilot-evals.mjs",
      captured_at: new Date().toISOString(),
      attempts: [],
      final_action: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  transcript.transcript_file = transcriptFile;
  writeJson(filePath, transcript);
  return repairObservationSummary(transcript);
}

function captureSummary(capture, testCase, variant) {
  const mcpVersion = capture.mcp_version ?? "unversioned";
  const modelConfigId = capture.model_config_id ?? CODEX_MODEL_CONFIG_ID;

  return {
    capture_file:
      capture.mcp_version && capture.model_config_id
        ? path.join(`mcp-${mcpVersion}`, modelConfigId, testCase.id, `${variant.id}.json`)
        : path.join(testCase.id, `${variant.id}.json`),
    model_config_id: modelConfigId,
    provider: capture.provider ?? "codex",
    model: capture.model ?? MODEL_ID,
    runtime: capture.runtime ?? capture.execution?.runtime ?? null,
    local: capture.local ?? false,
    mcp_version: capture.mcp_version ?? null,
    mcp_url: capture.mcp_url ?? null,
    mcp_metadata_sha256: capture.mcp_metadata_sha256 ?? null,
    mcp_tool_sequence: capture.mcp_tool_sequence ?? [],
    mcp_tool_transcript_sha256: capture.mcp_tool_transcript_sha256 ?? null,
    duration_ms: capture.duration_ms ?? null,
    output_valid: capture.output_valid !== false,
    parse_error: capture.parse_error ?? null,
    usage: capture.usage ?? null,
    raw_response_sha256: capture.raw_response_sha256 ?? hash(capture.raw_response ?? ""),
    prompt_sha256: capture.prompt_sha256 ?? null,
    mcp_context_sha256: capture.mcp_context_sha256 ?? null,
  };
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

  if (capture.output_valid === false) {
    const leaks = disclosureScore(testCase, capture).leaks ?? [];
    return {
      id: variant.id,
      label: variant.label,
      treatment: variant.treatment,
      status: "evaluated",
      score: 0,
      metric_results: Object.fromEntries(
        METRIC_IDS.map((metricId) => [
          metricId,
          { score: 0, output_valid: false, parse_error: capture.parse_error ?? "invalid output" },
        ]),
      ),
      question_count: 0,
      invalid_output: true,
      critical_disclosure_leaks: leaks,
      capture: captureSummary(capture, testCase, variant),
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
    invalid_output: false,
    critical_disclosure_leaks: metric_results.disclosure_discipline.leaks ?? [],
    capture: captureSummary(capture, testCase, variant),
  };
}

export function scoreCase(
  testCase,
  capturesByVariant,
  modelConfig = MODEL_CONFIGS[CODEX_MODEL_CONFIG_ID],
  options = {},
) {
  return scoreCaseWithCalibration(testCase, capturesByVariant, modelConfig, options);
}

function calibratedPassReason({
  testCase,
  baseline,
  guided,
  scoreDelta,
  guidedCriticalLeaks,
  standardDeltaPassed,
  repairLoop,
}) {
  if (guidedCriticalLeaks.length > 0) return null;
  if (standardDeltaPassed) return "delta_threshold";

  const guidedBeatsBaseline = scoreDelta > 0;
  const implementationRepairLoopVerified =
    testCase.case_type === "implementation_review" &&
    repairLoop?.expectation_status === "passed" &&
    guided.score >= 75 &&
    guidedBeatsBaseline &&
    guided.question_count === 0;

  if (implementationRepairLoopVerified) {
    return "implementation_repair_loop_verified";
  }

  if (guided.score >= 90 && guidedBeatsBaseline) {
    return "high_absolute_guided_score";
  }

  return null;
}

function scoreCaseWithCalibration(
  testCase,
  capturesByVariant,
  modelConfig = MODEL_CONFIGS[CODEX_MODEL_CONFIG_ID],
  options = {},
) {
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
      model_config_id: modelConfig.id,
      model_label: modelConfig.label,
      model_provider: modelConfig.provider,
      model: modelConfig.model,
      status: "capture-required",
      passed: false,
      standard_delta_passed: false,
      calibrated_pass_reason: null,
      expected_next_action: testCase.expected_next_action,
      minimum_score_delta: testCase.minimum_score_delta,
      ...(options.visualTokenAdapterProof
        ? { visual_token_adapter_proof: options.visualTokenAdapterProof }
        : {}),
      variants,
    };
  }

  const score_delta = round(guided.score - baseline.score);
  const winner =
    score_delta > 0 ? "judgmentkit_mcp" : score_delta < 0 ? "baseline_no_mcp" : "tie";
  const guidedCriticalLeaks = guided.critical_disclosure_leaks ?? [];
  const standard_delta_passed =
    score_delta >= testCase.minimum_score_delta && guidedCriticalLeaks.length === 0;
  const calibrated_pass_reason = calibratedPassReason({
    testCase,
    baseline,
    guided,
    scoreDelta: score_delta,
    guidedCriticalLeaks,
    standardDeltaPassed: standard_delta_passed,
    repairLoop: options.repairLoop ?? null,
  });
  const passed = calibrated_pass_reason !== null;

  return {
    id: testCase.id,
    title: testCase.title,
    case_type: testCase.case_type,
    model_config_id: modelConfig.id,
    model_label: modelConfig.label,
    model_provider: modelConfig.provider,
    model: modelConfig.model,
    status: "evaluated",
    passed,
    standard_delta_passed,
    calibrated_pass_reason,
    winner,
    expected_winner: "judgmentkit_mcp",
    score_delta,
    minimum_score_delta: testCase.minimum_score_delta,
    guided_critical_disclosure_leaks: guidedCriticalLeaks,
    expected_next_action: testCase.expected_next_action,
    ...(options.repairLoop ? { repair_loop: options.repairLoop } : {}),
    ...(options.visualTokenAdapterProof
      ? { visual_token_adapter_proof: options.visualTokenAdapterProof }
      : {}),
    variants,
  };
}

function average(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) return 0;
  return round(finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length);
}

function summarizeRepairLoops(results) {
  const loopResults = results.filter((result) => result.repair_loop?.enabled);
  const converged = loopResults.filter((result) => result.repair_loop.converged);
  const stopped = loopResults.filter((result) => result.repair_loop.stopped_for_human);
  const failureCategoryCounts = {};

  for (const result of loopResults) {
    for (const [category, count] of Object.entries(
      result.repair_loop.failure_category_counts ?? {},
    )) {
      incrementCount(failureCategoryCounts, category, count);
    }
  }

  return {
    loop_cases: loopResults.length,
    converged_cases: converged.length,
    stopped_cases: stopped.length,
    average_attempts_to_pass: average(
      converged.map((result) => Number(result.repair_loop.attempts_to_pass)),
    ),
    failure_category_counts: failureCategoryCounts,
  };
}

function summarizeRepairLoopObservations(results) {
  const observationResults = results.filter((result) => result.repair_loop_observation?.enabled);
  if (observationResults.length === 0) return {};

  const converged = observationResults.filter((result) => result.repair_loop_observation.converged);
  const stopped = observationResults.filter((result) => result.repair_loop_observation.stopped_for_human);
  const failed = observationResults.filter(
    (result) => result.repair_loop_observation.capture_status === "failed",
  );

  return {
    observation_cases: observationResults.length,
    observation_converged_cases: converged.length,
    observation_stopped_cases: stopped.length,
    observation_failed_cases: failed.length,
    observation_average_attempts_to_pass: average(
      converged.map((result) => Number(result.repair_loop_observation.attempts_to_pass)),
    ),
  };
}

function summarizeVisualTokenAdapterProofs(results) {
  const proofResults = results.filter((result) => result.visual_token_adapter_proof?.enabled);
  if (proofResults.length === 0) return {};

  const passed = proofResults.filter(
    (result) => result.visual_token_adapter_proof.expectation_status === "passed",
  );
  const failed = proofResults.filter(
    (result) => result.visual_token_adapter_proof.expectation_status !== "passed",
  );
  const failureCategoryCounts = {};

  for (const result of proofResults) {
    for (const category of result.visual_token_adapter_proof.failure_categories ?? []) {
      incrementCount(failureCategoryCounts, category);
    }
  }

  return {
    visual_token_cases: proofResults.length,
    visual_token_passed_cases: passed.length,
    visual_token_failed_cases: failed.length,
    visual_token_failure_category_counts: failureCategoryCounts,
  };
}

function summarizeResultSet(results) {
  const evaluated = results.filter((result) => result.status === "evaluated");
  const captureRequired = results.filter((result) => result.status === "capture-required");
  const passed = evaluated.filter((result) => result.passed);
  const failed = evaluated.filter((result) => !result.passed);
  const standardDeltaPassed = evaluated.filter((result) => result.standard_delta_passed).length;
  const calibratedOnlyPassed = evaluated.filter(
    (result) => result.passed && !result.standard_delta_passed,
  ).length;
  const calibratedPassReasonCounts = {};
  for (const result of evaluated) {
    if (result.calibrated_pass_reason) {
      incrementCount(calibratedPassReasonCounts, result.calibrated_pass_reason);
    }
  }
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
  const evaluatedVariants = evaluated.flatMap((result) => result.variants ?? []);
  const invalidOutputs = evaluatedVariants.filter((variant) => variant.invalid_output).length;
  const averageDurationMs = average(
    evaluatedVariants.map((variant) => Number(variant.capture?.duration_ms)).filter(Number.isFinite),
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
    calibrated_passes: passed.length,
    standard_delta_passed: standardDeltaPassed,
    calibrated_only_passes: calibratedOnlyPassed,
    calibrated_pass_reason_counts: calibratedPassReasonCounts,
    guided_wins: guidedWins,
    baseline_wins: baselineWins,
    ties,
    average_guided_delta: averageGuidedDelta,
    invalid_outputs: invalidOutputs,
    average_duration_ms: averageDurationMs,
    guided_critical_disclosure_leaks: guidedCriticalDisclosureLeaks,
    ...summarizeRepairLoops(results),
    ...summarizeRepairLoopObservations(results),
    ...summarizeVisualTokenAdapterProofs(results),
    pilot_passed: pilotPassed,
    pilot_status:
      captureRequired.length > 0 ? "capture-required" : pilotPassed ? "passed" : "failed",
  };
}

function controlModelSanity(summary) {
  const issues = [];
  if (summary.capture_required_cases > 0) issues.push("capture-required");
  if (summary.evaluated_cases === 0) issues.push("no-evaluated-cases");
  if (summary.invalid_outputs > 0) issues.push("invalid-output");
  if (summary.guided_critical_disclosure_leaks > 0) issues.push("guided-disclosure-leak");

  return {
    passed: issues.length === 0,
    issues,
  };
}

function summarizeResults(results, options = {}) {
  const rawSummary = summarizeResultSet(results);
  const modelIds = [...new Set(results.map((result) => result.model_config_id ?? CODEX_MODEL_CONFIG_ID))];
  const perModel = Object.fromEntries(
    modelIds.map((modelId) => [
      modelId,
      {
        label: results.find((result) => result.model_config_id === modelId)?.model_label ?? modelId,
        ...summarizeResultSet(results.filter((result) => result.model_config_id === modelId)),
      },
    ]),
  );
  const summary = {
    ...rawSummary,
    unique_cases: new Set(results.map((result) => result.id)).size,
    models: modelIds.length,
    per_model: perModel,
  };

  const primaryModelConfig = options.primaryModelConfig ?? null;
  if (!primaryModelConfig || modelIds.length <= 1) {
    return summary;
  }

  const primaryModelId = primaryModelConfig.id;
  const primarySummary = perModel[primaryModelId];
  if (!primarySummary) {
    throw new Error(`Primary MCP pilot model ${primaryModelId} is not included in this report.`);
  }

  const controlModelIds = modelIds.filter((modelId) => modelId !== primaryModelId);
  const controlSanity = Object.fromEntries(
    controlModelIds.map((modelId) => [modelId, controlModelSanity(perModel[modelId])]),
  );
  const controlSanityPassed = controlModelIds.every((modelId) => controlSanity[modelId].passed);
  const captureRequired =
    primarySummary.capture_required_cases > 0 ||
    primarySummary.evaluated_cases === 0 ||
    controlModelIds.some((modelId) => perModel[modelId].capture_required_cases > 0);
  const matrixPassed = primarySummary.pilot_passed && controlSanityPassed && !captureRequired;
  const matrixStatus = captureRequired
    ? "capture-required"
    : matrixPassed
      ? "primary-passed/control-observed"
      : primarySummary.pilot_passed
        ? "control-failed"
        : "primary-failed";

  return {
    ...summary,
    pilot_passed: matrixPassed,
    pilot_status: matrixPassed ? "passed" : matrixStatus,
    raw_aggregate: rawSummary,
    primary_model_id: primaryModelId,
    primary_model_label: primaryModelConfig.label,
    primary_model_status: primarySummary.pilot_status,
    primary_model_passed: primarySummary.pilot_passed,
    control_model_ids: controlModelIds,
    control_sanity: controlSanity,
    control_sanity_passed: controlSanityPassed,
    matrix_status: matrixStatus,
    matrix_status_policy:
      "Multi-model headline status follows the primary proof model pass/fail plus control sanity gates. Raw aggregate scoring is preserved in raw_aggregate.",
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
  const modelConfigs = options.modelConfigs ?? [MODEL_CONFIGS[CODEX_MODEL_CONFIG_ID]];
  const primaryModelConfig = options.primaryModelConfig ?? null;
  const hasModelFraming = primaryModelConfig && modelConfigs.length > 1;
  const roleForModel = (modelConfig) => {
    if (!hasModelFraming) return undefined;
    return modelConfig.id === primaryModelConfig.id ? "primary" : "control";
  };
  const roleLabelForModel = (modelConfig) => {
    const role = roleForModel(modelConfig);
    if (role === "primary") return "Primary proof";
    if (role === "control") return "Ceiling/control";
    return undefined;
  };

  return {
    eval_id: EVAL_ID,
    evaluation_type: "private_saved_capture_scoring",
    benchmark_policy:
      "Private repo-local pilot. Scores are deterministic checks against saved model captures; JudgmentKit is not used as the judge.",
    capture_policy:
      "Default mode scores existing versioned captures only. Missing or MCP-version-mismatched captures are reported as capture-required. Live capture is opt-in with --capture and reuses existing captures in the target capture directory.",
    repair_loop_proof_policy:
      "Repair-loop results are deterministic fixture proof of contract governance and agent-owned resubmission behavior; they do not measure visual quality or live-model repair quality.",
    visual_token_adapter_proof_policy:
      "Visual-token adapter results are deterministic boundary proof that token evidence is metadata only; they do not introduce renderer packages, component libraries, A2UI, or visual-quality scoring.",
    ...(options.observeRepairLoop
      ? {
          repair_loop_observation_policy:
            "Repair-loop observation is an opt-in Codex CLI dogfood pass of agent-owned repair behavior; it is not a deterministic fixture proof, visual-quality score, or pass/fail gate.",
        }
      : {}),
    comparison: {
      baseline: "baseline_no_mcp",
      guided: "judgmentkit_mcp",
      models: modelConfigs.map((modelConfig) => ({
        id: modelConfig.id,
        label: modelConfig.label,
        provider: modelConfig.provider,
        model: modelConfig.model,
        local: modelConfig.local,
        role: roleForModel(modelConfig),
        role_label: roleLabelForModel(modelConfig),
      })),
      ...(hasModelFraming
        ? {
            primary_model_id: primaryModelConfig.id,
            control_model_ids: modelConfigs
              .filter((modelConfig) => modelConfig.id !== primaryModelConfig.id)
              .map((modelConfig) => modelConfig.id),
            model_framing_policy:
              "Gemma is the primary proof target for gemma-local; GPT-5.5 Codex is a ceiling/control sanity check.",
          }
        : {}),
    },
    mcp: {
      required_version: options.requiredMcpVersion,
      actual_version: runInfo.mcp_release,
      package_version: options.packageVersion,
      local_metadata_sha256: options.localMcpMetadataSha256,
      endpoint_url: options.mcpRuntime?.url ?? options.mcpUrl ?? null,
      endpoint_metadata_sha256: options.mcpRuntime?.endpoint_metadata_sha256 ?? null,
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
    summary: summarizeResults(results, { ...options, primaryModelConfig }),
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

function reportRepairLoopProofLabel() {
  return "Deterministic fixture proof; not a visual-quality or live-model-quality measurement.";
}

function htmlCase(result) {
  const statusLabel = result.status === "capture-required" ? "Capture required" : result.passed ? "Passed" : "Failed";
  const repairLoop = result.repair_loop;
  const repairObservation = result.repair_loop_observation;
  const visualTokenProof = result.visual_token_adapter_proof;
  const repairLoopHtml = repairLoop
    ? `
      <div class="repair-loop">
        <h3>Repair loop</h3>
        <dl>
          <div><dt>Attempts</dt><dd>${escapeHtml(repairLoop.attempts)}</dd></div>
          <div><dt>Final action</dt><dd>${escapeHtml(repairLoop.final_action)}</dd></div>
          <div><dt>Converged</dt><dd>${escapeHtml(repairLoop.converged ? "yes" : "no")}</dd></div>
          <div><dt>Attempts to pass</dt><dd>${escapeHtml(repairLoop.attempts_to_pass ?? "n/a")}</dd></div>
          <div><dt>Stopped</dt><dd>${escapeHtml(repairLoop.stopped_for_human ? "yes" : "no")}</dd></div>
        </dl>
        <p>${escapeHtml(reportRepairLoopProofLabel())}</p>
        <p>Failure categories: ${escapeHtml(repairLoop.failure_categories?.join(", ") || "none")}</p>
      </div>`
    : "";
  const repairObservationHtml = repairObservation
    ? `
      <div class="repair-loop">
        <h3>Live repair-loop observation</h3>
        <dl>
          <div><dt>Status</dt><dd>${escapeHtml(repairObservation.capture_status)}</dd></div>
          <div><dt>Attempts</dt><dd>${escapeHtml(repairObservation.attempts)}</dd></div>
          <div><dt>Final action</dt><dd>${escapeHtml(repairObservation.final_action ?? "n/a")}</dd></div>
          <div><dt>Converged</dt><dd>${escapeHtml(repairObservation.converged ? "yes" : "no")}</dd></div>
          <div><dt>Attempts to pass</dt><dd>${escapeHtml(repairObservation.attempts_to_pass ?? "n/a")}</dd></div>
          <div><dt>Stopped</dt><dd>${escapeHtml(repairObservation.stopped_for_human ? "yes" : "no")}</dd></div>
        </dl>
        <p>Codex CLI dogfood observation; not a deterministic fixture proof or pass/fail gate.</p>
        <p>Followed categories: ${escapeHtml(repairObservation.followed_repair_categories?.join(", ") || "none")}</p>
        <p>Unresolved categories: ${escapeHtml(repairObservation.unresolved_categories?.join(", ") || "none")}</p>
        <p>Unresolved accessibility evidence: ${escapeHtml(repairObservation.unresolved_accessibility_evidence_keys?.join(", ") || "none")}</p>
        <p>Transcript: ${escapeHtml(repairObservation.transcript_file ?? "n/a")}</p>
      </div>`
    : "";
  const visualTokenProofHtml = visualTokenProof
    ? `
      <div class="repair-loop">
        <h3>Visual token adapter proof</h3>
        <dl>
          <div><dt>Review status</dt><dd>${escapeHtml(visualTokenProof.implementation_review_status)}</dd></div>
          <div><dt>Token evidence</dt><dd>${escapeHtml(visualTokenProof.visual_token_status)}</dd></div>
          <div><dt>Next action</dt><dd>${escapeHtml(visualTokenProof.next_agent_action)}</dd></div>
          <div><dt>Expectation</dt><dd>${escapeHtml(visualTokenProof.expectation_status)}</dd></div>
        </dl>
        <p>Deterministic boundary proof; not a renderer or visual-quality measurement.</p>
        <p>Failure categories: ${escapeHtml(visualTokenProof.failure_categories?.join(", ") || "none")}</p>
      </div>`
    : "";
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
        <p>${escapeHtml(result.model_label ?? result.model_config_id ?? "")} · ${escapeHtml(result.case_type)}</p>
        <h2>${escapeHtml(result.title)}</h2>
        <strong>${escapeHtml(statusLabel)}</strong>
      </header>
      <dl>
        <div><dt>Winner</dt><dd>${escapeHtml(treatmentLabel(result.winner))}</dd></div>
        <div><dt>Delta</dt><dd>${escapeHtml(result.score_delta ?? "n/a")}</dd></div>
        <div><dt>Threshold</dt><dd>${escapeHtml(result.minimum_score_delta)}</dd></div>
        <div><dt>Standard pass</dt><dd>${escapeHtml(result.status === "evaluated" ? (result.standard_delta_passed ? "yes" : "no") : "n/a")}</dd></div>
        <div><dt>Calibrated reason</dt><dd>${escapeHtml(result.calibrated_pass_reason ?? "none")}</dd></div>
      </dl>
      ${repairLoopHtml}
      ${repairObservationHtml}
      ${visualTokenProofHtml}
      <div class="variants">${variantHtml}</div>
    </section>`;
}

function buildHtmlReport(report) {
  const cases = report.results.map(htmlCase).join("");
  const observationPolicy = report.repair_loop_observation_policy
    ? ` ${report.repair_loop_observation_policy}`
    : "";
  const visualTokenPolicy = report.visual_token_adapter_proof_policy
    ? ` ${report.visual_token_adapter_proof_policy}`
    : "";
  const modelFramingHtml = report.summary.primary_model_id
    ? `
      <div class="model-roles">
        <article>
          <p>Primary proof</p>
          <h2>${escapeHtml(report.summary.primary_model_label ?? report.summary.primary_model_id)}</h2>
          <dl>
            <div><dt>Status</dt><dd>${escapeHtml(report.summary.primary_model_status)}</dd></div>
            <div><dt>Passed</dt><dd>${escapeHtml(report.summary.per_model?.[report.summary.primary_model_id]?.passed ?? 0)}/${escapeHtml(report.summary.per_model?.[report.summary.primary_model_id]?.evaluated_cases ?? 0)}</dd></div>
            <div><dt>Average delta</dt><dd>${escapeHtml(report.summary.per_model?.[report.summary.primary_model_id]?.average_guided_delta ?? 0)}</dd></div>
          </dl>
        </article>
        ${report.summary.control_model_ids
          .map((modelId) => {
            const modelSummary = report.summary.per_model?.[modelId] ?? {};
            const sanity = report.summary.control_sanity?.[modelId] ?? { passed: false, issues: [] };
            return `
              <article>
                <p>Ceiling/control</p>
                <h2>${escapeHtml(modelSummary.label ?? modelId)}</h2>
                <dl>
                  <div><dt>Sanity</dt><dd>${escapeHtml(sanity.passed ? "passed" : "failed")}</dd></div>
                  <div><dt>Status</dt><dd>${escapeHtml(modelSummary.pilot_status ?? "n/a")}</dd></div>
                  <div><dt>Issues</dt><dd>${escapeHtml(sanity.issues?.join(", ") || "none")}</dd></div>
                </dl>
              </article>`;
          })
          .join("")}
      </div>`
    : "";
  const observationSummary =
    report.summary.observation_cases !== undefined
      ? `
        <div><dt>Observed loops</dt><dd>${escapeHtml(report.summary.observation_cases)}</dd></div>
        <div><dt>Observed converged</dt><dd>${escapeHtml(report.summary.observation_converged_cases)}</dd></div>
        <div><dt>Observed stopped</dt><dd>${escapeHtml(report.summary.observation_stopped_cases)}</dd></div>
        <div><dt>Observed failed</dt><dd>${escapeHtml(report.summary.observation_failed_cases)}</dd></div>`
      : "";
  const visualTokenSummary =
    report.summary.visual_token_cases !== undefined
      ? `
        <div><dt>Token cases</dt><dd>${escapeHtml(report.summary.visual_token_cases)}</dd></div>
        <div><dt>Token passed</dt><dd>${escapeHtml(report.summary.visual_token_passed_cases)}</dd></div>
        <div><dt>Token failed</dt><dd>${escapeHtml(report.summary.visual_token_failed_cases)}</dd></div>`
      : "";

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
    .model-roles { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin: 18px 0; }
    .model-roles article { border: 1px solid #d9ded7; border-radius: 8px; padding: 16px; background: #fbfffd; }
    .model-roles article p { color: #66736b; font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
    .model-roles article h2 { font-size: 1.1rem; margin-bottom: 12px; }
    .model-roles article dl { display: grid; gap: 1px; background: #d9ded7; border: 1px solid #d9ded7; border-radius: 8px; overflow: hidden; }
    .model-roles article dl div { background: #fff; padding: 12px; }
    .model-roles article dd { font-size: 1rem; }
    dt { color: #66736b; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    dd { margin: 4px 0 0; font-size: 1.25rem; font-weight: 800; }
    .case { margin-top: 16px; }
    .case header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
    .case header p { color: #66736b; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; }
    .case header strong { border: 1px solid #bdc8bf; border-radius: 999px; padding: 6px 10px; white-space: nowrap; }
    .repair-loop { margin-top: 16px; border: 1px solid #c8d8d0; border-radius: 8px; padding: 16px; background: #fbfffd; }
    .repair-loop h3 { margin-bottom: 12px; }
    .repair-loop p { margin: 12px 0 0; color: #526058; font-weight: 700; }
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
      <p class="lede">${escapeHtml(report.benchmark_policy)} ${escapeHtml(report.capture_policy)} ${escapeHtml(report.repair_loop_proof_policy ?? reportRepairLoopProofLabel())}${escapeHtml(observationPolicy)}${escapeHtml(visualTokenPolicy)}</p>
      ${modelFramingHtml}
      <dl class="summary">
        <div><dt>Status</dt><dd>${escapeHtml(report.summary.pilot_status)}</dd></div>
        <div><dt>Cases</dt><dd>${escapeHtml(report.summary.evaluated_cases)}/${escapeHtml(report.summary.cases)}</dd></div>
        <div><dt>Passed</dt><dd>${escapeHtml(report.summary.passed)}</dd></div>
        <div><dt>Std delta passed</dt><dd>${escapeHtml(report.summary.standard_delta_passed)}</dd></div>
        <div><dt>Calibrated-only</dt><dd>${escapeHtml(report.summary.calibrated_only_passes)}</dd></div>
        <div><dt>Average delta</dt><dd>${escapeHtml(report.summary.average_guided_delta)}</dd></div>
        <div><dt>Loop cases</dt><dd>${escapeHtml(report.summary.loop_cases)}</dd></div>
        <div><dt>Converged loops</dt><dd>${escapeHtml(report.summary.converged_cases)}</dd></div>
        <div><dt>Avg attempts to pass</dt><dd>${escapeHtml(report.summary.average_attempts_to_pass)}</dd></div>
        <div><dt>Stopped loops</dt><dd>${escapeHtml(report.summary.stopped_cases)}</dd></div>
        ${observationSummary}
        ${visualTokenSummary}
        <div><dt>Invalid outputs</dt><dd>${escapeHtml(report.summary.invalid_outputs)}</dd></div>
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

async function validateCaptureModelRuntimes(modelConfigs, options = {}) {
  for (const modelConfig of modelConfigs) {
    if (modelConfig.provider === "lmstudio-openai-chat") {
      await verifyLmStudioModelAvailable(modelConfig, options);
    }
  }
}

async function buildResults(cases, options) {
  const results = [];
  const mcpContextsByCase = new Map();
  const repairObservationsByCase = new Map();

  for (const testCase of cases) {
    if (options.capture || testCase.repair_loop || testCase.visual_token_adapter_proof) {
      mcpContextsByCase.set(testCase.id, await buildMcpContextForCase(testCase, options.mcpRuntime));
    }
  }

  if (options.observeRepairLoop) {
    for (const testCase of cases.filter((candidate) => candidate.repair_loop)) {
      repairObservationsByCase.set(
        testCase.id,
        await buildRepairLoopObservation(testCase, options.mcpRuntime, {
          ...options,
          mcpContext: mcpContextsByCase.get(testCase.id) ?? null,
        }),
      );
    }
  }

  for (const modelConfig of options.modelConfigs) {
    for (const testCase of cases) {
      const mcpContext = mcpContextsByCase.get(testCase.id) ?? null;
      const capturesByVariant = {};

      for (const variant of testCase.variants) {
        if (options.capture) {
          const existingCapture = loadCapture(
            options.captureDir,
            testCase,
            variant,
            modelConfig,
            options.mcpVersionInfo.actual_mcp_version,
          );
          capturesByVariant[variant.id] =
            existingCapture ??
            (await captureVariant(
              testCase,
              variant,
              mcpContext,
              options.captureDir,
              modelConfig,
              options.mcpVersionInfo,
              options,
            ));
        } else {
          capturesByVariant[variant.id] = loadCapture(
            options.captureDir,
            testCase,
            variant,
            modelConfig,
            options.mcpVersionInfo.actual_mcp_version,
          );
        }
      }

      const result = scoreCase(testCase, capturesByVariant, modelConfig, {
        repairLoop: mcpContext?.repair_loop_summary ?? null,
        visualTokenAdapterProof:
          mcpContext?.visual_token_adapter_proof_summary ?? null,
      });
      if (mcpContext) {
        result.mcp_context = {
          mcp_url: mcpContext.mcp_url,
          mcp_version: mcpContext.mcp_version,
          mcp_metadata_sha256: mcpContext.mcp_metadata_sha256,
          tool_sequence: mcpContext.tool_sequence,
          tool_transcript_sha256: mcpContext.tool_transcript_sha256,
          tool_summaries: mcpContext.tool_calls.map((call) => ({
            name: call.name,
            args_sha256: call.args_sha256,
            summary: call.summary,
          })),
          repair_loop_summary: mcpContext.repair_loop_summary ?? null,
          visual_token_adapter_proof_summary:
            mcpContext.visual_token_adapter_proof_summary ?? null,
        };
        if (mcpContext.repair_loop_summary) {
          result.repair_loop = mcpContext.repair_loop_summary;
        }
        if (mcpContext.visual_token_adapter_proof_summary) {
          result.visual_token_adapter_proof =
            mcpContext.visual_token_adapter_proof_summary;
        }
      }
      if (repairObservationsByCase.has(testCase.id)) {
        result.repair_loop_observation = repairObservationsByCase.get(testCase.id);
      }
      results.push(result);
    }
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
  if (options.mcpVersion && !options.requiredMcpVersion) {
    options.requiredMcpVersion = options.mcpVersion;
  }
  const mcpVersionInfo = verifyMcpVersion(options.requiredMcpVersion);
  const modelConfigs = resolveModelConfigs(options);
  const primaryModelConfig = resolvePrimaryModelConfig(options, modelConfigs);
  if (
    options.observeRepairLoop &&
    (modelConfigs.length !== 1 || modelConfigs[0].id !== CODEX_MODEL_CONFIG_ID)
  ) {
    throw new Error(`--observe-repair-loop currently supports only ${CODEX_MODEL_CONFIG_ID}.`);
  }
  const selectedCases = filterCases(cases, options.cases);
  const runInfo = createRunInfo({
    ...options,
    mcpVersion: mcpVersionInfo.actual_mcp_version,
  });
  let mcpRuntime = null;

  try {
    if (
      options.capture ||
      selectedCases.some(
        (testCase) => testCase.repair_loop || testCase.visual_token_adapter_proof,
      )
    ) {
      mcpRuntime = await createMcpRuntime({
        mcpUrl: options.mcpUrl,
        requiredMcpVersion: options.requiredMcpVersion,
        fetchImpl: options.fetchImpl,
      });
    }

    if (options.capture) {
      await validateCaptureModelRuntimes(modelConfigs, options);
    }

    const resolvedOptions = {
      ...options,
      mcpVersionInfo,
      mcpRuntime,
      modelConfigs,
      primaryModelConfig,
      packageVersion: mcpVersionInfo.package_version,
      localMcpMetadataSha256: mcpVersionInfo.local_metadata_sha256,
    };
    const results = await buildResults(selectedCases, resolvedOptions);
    const report = buildReport(results, runInfo, resolvedOptions);
    const catalog = writeReport(report, runInfo);
    return { report, catalog, runInfo };
  } finally {
    await mcpRuntime?.close();
  }
}

async function main() {
  const options = parseArgs();
  const { report, runInfo, catalog } = await runMcpPilotEval(options);

  console.log("# JudgmentKit MCP Pilot Eval");
  console.log(
    `Summary: ${report.summary.passed}/${report.summary.evaluated_cases} evaluated cases passed, ${report.summary.capture_required_cases} capture-required, average guided delta ${report.summary.average_guided_delta}, status ${report.summary.pilot_status}.`,
  );
  if (report.summary.observation_cases !== undefined) {
    console.log(
      `Repair-loop observations: ${report.summary.observation_converged_cases}/${report.summary.observation_cases} converged, ${report.summary.observation_stopped_cases} stopped, ${report.summary.observation_failed_cases} failed.`,
    );
  }
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
