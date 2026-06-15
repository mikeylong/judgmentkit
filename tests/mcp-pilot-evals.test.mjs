import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildEvidencePacketFromFiles,
} from "../evals/build-mcp-pilot-evidence-packet.mjs";
import {
  CODEX_MODEL_CONFIG_ID,
  GEMMA_LMSTUDIO_MODEL_CONFIG_ID,
  HIDDEN_TREATMENT_TERMS,
  METRIC_IDS,
  MODEL_CONFIGS,
  REPAIR_ACCESSIBILITY_CONDITIONAL_EVIDENCE_KEYS,
  REPAIR_ACCESSIBILITY_CORE_EVIDENCE_KEYS,
  REPAIR_ACCESSIBILITY_EVIDENCE_KEYS,
  REPAIR_CANDIDATE_OUTPUT_SCHEMA,
  REQUIRED_MCP_VERSION,
  VARIANT_IDS,
  buildCapturePrompt,
  buildRepairObservationPrompt,
  buildMcpContextForCase,
  captureFilePath,
  createMcpRuntime,
  readCases,
  repairObservationFilePath,
  resolveModelConfigs,
  resolvePrimaryModelConfig,
  runLmStudioChatCompletion,
  runMcpPilotEval,
  scoreCase,
  validateCases,
  verifyLmStudioModelAvailable,
  verifyMcpVersion,
} from "../evals/run-mcp-pilot-evals.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cases = readCases();

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function allRequiredText(testCase) {
  return [
    Object.values(testCase.required_terms).flat().join(" "),
    testCase.required_handoff_fields.join(" "),
    testCase.expected_next_action,
  ].join(" ");
}

function mockCapture(testCase, variantId, overrides = {}) {
  const modelConfig = MODEL_CONFIGS[overrides.modelConfigId ?? CODEX_MODEL_CONFIG_ID];
  const handoff = Object.fromEntries(
    testCase.required_handoff_fields.map((field) => [field.replace(/\s+/g, "_"), field]),
  );
  const response =
    overrides.response ??
    `${allRequiredText(testCase)}. Decision reason is grounded in source evidence.`;

  return {
    case_id: testCase.id,
    variant_id: variantId,
    treatment: variantId,
    mcp_version: overrides.mcpVersion ?? REQUIRED_MCP_VERSION,
    mcp_url: overrides.mcpUrl ?? "http://127.0.0.1:12345/mcp",
    mcp_metadata_sha256: overrides.mcpMetadataSha256 ?? "mcp-metadata-sha",
    mcp_tool_sequence: variantId === "judgmentkit_mcp" ? testCase.expected_mcp_tools : [],
    mcp_tool_transcript_sha256: variantId === "judgmentkit_mcp" ? `${testCase.id}-tools-sha` : null,
    model_config_id: modelConfig.id,
    provider: modelConfig.provider,
    runtime: modelConfig.provider,
    local: modelConfig.local,
    model: modelConfig.model,
    duration_ms: overrides.duration_ms ?? 100,
    output_valid: overrides.output_valid ?? true,
    parse_error: overrides.parse_error ?? null,
    usage: overrides.usage ?? null,
    raw_response_sha256: `${testCase.id}-${variantId}-sha`,
    prompt_sha256: `${testCase.id}-${variantId}-prompt`,
    mcp_context_sha256: variantId === "judgmentkit_mcp" ? `${testCase.id}-mcp` : null,
    raw_response: overrides.raw_response ?? JSON.stringify({ response }),
    parsed:
      overrides.parsed === null
        ? null
        : {
            response,
            next_action: overrides.next_action ?? testCase.expected_next_action,
            questions: overrides.questions ?? [],
            handoff: overrides.handoff ?? handoff,
            rationale: overrides.rationale ?? "Grounded in source evidence with a clear required fix or handoff.",
          },
  };
}

function versionedCapturePath(captureDir, testCase, variantId, modelConfigId = CODEX_MODEL_CONFIG_ID) {
  return captureFilePath(captureDir, REQUIRED_MCP_VERSION, modelConfigId, testCase.id, variantId);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mockReport({ runId, mcpVersion = REQUIRED_MCP_VERSION, summary = {}, results = [] }) {
  const defaultSummary = {
    cases: 24,
    evaluated_cases: 24,
    capture_required_cases: 0,
    passed: 17,
    failed: 3,
    calibrated_passes: 17,
    standard_delta_passed: 14,
    calibrated_only_passes: 3,
    calibrated_pass_reason_counts: {
      delta_threshold: 14,
      high_absolute_guided_score: 1,
      implementation_repair_loop_verified: 2,
    },
    guided_wins: 19,
    baseline_wins: 1,
    ties: 0,
    average_guided_delta: 21.56,
    invalid_outputs: 0,
    guided_critical_disclosure_leaks: 0,
    loop_cases: 4,
    converged_cases: 3,
    stopped_cases: 1,
    average_attempts_to_pass: 2,
    failure_category_counts: {
      action_boundaries: 1,
      accessibility: 4,
      data_visibility: 1,
    },
    observation_cases: 4,
    observation_converged_cases: 4,
    observation_stopped_cases: 0,
    observation_failed_cases: 0,
    observation_average_attempts_to_pass: 3,
    visual_token_cases: 4,
    visual_token_passed_cases: 4,
    visual_token_failed_cases: 0,
    visual_token_failure_category_counts: {
      visual_tokens: 2,
      accessibility: 1,
    },
    pilot_passed: true,
    pilot_status: "passed",
    models: 1,
  };

  return {
    eval_id: "judgmentkit-mcp-private-pilot-v1",
    benchmark_policy: "Private saved-capture pilot.",
    capture_policy: "Saved captures only.",
    metric_scale: {
      metric_score: "0-5",
      total_score: "0-100 weighted",
    },
    comparison: {
      baseline: "baseline_no_mcp",
      guided: "judgmentkit_mcp",
      models: [MODEL_CONFIGS[GEMMA_LMSTUDIO_MODEL_CONFIG_ID]],
    },
    mcp: {
      required_version: mcpVersion,
      actual_version: mcpVersion,
      package_version: mcpVersion,
      local_metadata_sha256: "local-sha",
      endpoint_metadata_sha256: "endpoint-sha",
    },
    run: {
      date: "2026-06-14",
      mcp_release: mcpVersion,
      mcp_release_segment: `mcp-${mcpVersion}`,
      run_id: runId,
      run_path: `2026-06-14/mcp-${mcpVersion}/${runId}`,
      html_report: `2026-06-14/mcp-${mcpVersion}/${runId}/mcp-pilot-report.html`,
      json_report: `2026-06-14/mcp-${mcpVersion}/${runId}/mcp-pilot-report.json`,
    },
    summary: {
      ...defaultSummary,
      ...summary,
    },
    capture_dir: `evals/mcp-pilot-captures-${runId}`,
    results,
  };
}

function schemaErrors(schema, value, location = "$") {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;

  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [`${location} must be object`];
    }

    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${location}.${key} is required`);
    }

    const properties = schema.properties ?? {};
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) errors.push(`${location}.${key} is not allowed`);
      }
    }

    for (const [key, childSchema] of Object.entries(properties)) {
      if (key in value) {
        errors.push(...schemaErrors(childSchema, value[key], `${location}.${key}`));
      }
    }
  }

  if (schema.type === "array") {
    if (!Array.isArray(value)) return [`${location} must be array`];
    for (const [index, item] of value.entries()) {
      errors.push(...schemaErrors(schema.items, item, `${location}[${index}]`));
    }
  }

  if (schema.type === "string" && typeof value !== "string") {
    errors.push(`${location} must be string`);
  }

  return errors;
}

function passingAccessibilityEvidence(extra = {}) {
  return {
    automated_checks: "pass: axe and manual checks completed.",
    semantic_content: "pass: meaningful content is available in semantic HTML.",
    landmarks_headings: "pass: landmarks and heading order are verified.",
    name_role_value: "pass: controls expose names, roles, states, and values.",
    keyboard_navigation: "pass: all actions are reachable by keyboard.",
    focus_order: "pass: focus order follows the modal and page workflow.",
    focus_visible: "pass: visible focus indicators are present.",
    responsive_no_overflow:
      "pass: reflow verified at 375px and 200% zoom with single-axis reading and reachable controls.",
    ...extra,
  };
}

function schemaAccessibilityEvidence(extra = {}) {
  return {
    ...Object.fromEntries(REPAIR_ACCESSIBILITY_EVIDENCE_KEYS.map((key) => [key, ""])),
    ...passingAccessibilityEvidence(),
    ...extra,
  };
}

function repairedModalCandidate(accessibilityEvidence = {}) {
  return {
    primitives_used: ["modal", "decision controls", "handoff receipt"],
    states_covered: ["empty", "ready", "loading", "error", "disabled", "focus-visible"],
    static_checks: ["npm test"],
    browser_qa: {
      desktop: "passed",
      mobile: "passed",
      keyboard_focus_check: "passed",
    },
    accessibility_evidence: passingAccessibilityEvidence(accessibilityEvidence),
    actions: ["Cancel", "Send policy escalation handoff"],
    action_boundary_evidence: {
      approval_boundary:
        "Send policy escalation handoff requires explicit user confirmation before submission.",
      completion_receipt:
        "After submission, the screen leaves a handoff receipt with destination, decision, and reason.",
      modal_action_order:
        "Cancel remains before the final Send handoff action and focus returns to the opener after close.",
    },
    data_visibility_evidence: {
      primary_language: "Uses policy escalation and handoff language.",
      diagnostic_terms: "No internal implementation terms are visible.",
    },
    visible_text: ["Policy escalation handoff", "Cancel", "Send handoff", "Handoff receipt"],
  };
}

validateCases(cases);
assert.equal(cases.length, 24);
assert.equal(cases.filter((testCase) => testCase.repair_loop).length, 4);
assert.equal(cases.filter((testCase) => testCase.visual_token_adapter_proof).length, 4);

{
  const accessibilitySchema =
    REPAIR_CANDIDATE_OUTPUT_SCHEMA.properties.candidate.properties.accessibility_evidence;
  assert.deepEqual(accessibilitySchema.required, REPAIR_ACCESSIBILITY_EVIDENCE_KEYS);
  for (const key of REPAIR_ACCESSIBILITY_CORE_EVIDENCE_KEYS) {
    assert.ok(accessibilitySchema.properties[key], `${key} is allowed in repair schema`);
  }
  for (const key of REPAIR_ACCESSIBILITY_CONDITIONAL_EVIDENCE_KEYS) {
    assert.ok(accessibilitySchema.properties[key], `${key} is allowed in repair schema`);
  }

  const validOutput = {
    candidate: {
      ...repairedModalCandidate(),
      accessibility_evidence: schemaAccessibilityEvidence({
        focus_not_obscured: "pass: modal focus remains visible throughout navigation.",
        no_keyboard_trap: "pass: Escape and Cancel leave the modal and return focus to the opener.",
        target_size:
          "not_applicable: modal actions are text buttons with equivalent keyboard controls.",
      }),
    },
    rationale: "Added conditional modal accessibility evidence.",
  };
  assert.deepEqual(schemaErrors(REPAIR_CANDIDATE_OUTPUT_SCHEMA, validOutput), []);

  const invalidOutput = structuredClone(validOutput);
  invalidOutput.candidate.accessibility_evidence.unrelated_accessibility_claim = "pass";
  assert.ok(
    schemaErrors(REPAIR_CANDIDATE_OUTPUT_SCHEMA, invalidOutput).some((error) =>
      error.includes("unrelated_accessibility_claim is not allowed"),
    ),
  );
}

{
  const versionInfo = verifyMcpVersion(REQUIRED_MCP_VERSION);
  assert.equal(versionInfo.actual_mcp_version, REQUIRED_MCP_VERSION);
  assert.equal(versionInfo.package_version, REQUIRED_MCP_VERSION);
  assert.throws(() => verifyMcpVersion("0.0.0"), /MCP pilot version check failed/);
  await assert.rejects(
    () =>
      runMcpPilotEval({
        reportsDir: fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-")),
        captureDir: fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-")),
        requiredMcpVersion: "0.0.0",
        cases: [cases[0].id],
      }),
    /MCP pilot version check failed/,
  );
}

assert.deepEqual(
  resolveModelConfigs({ matrix: "gemma-local" }).map((modelConfig) => modelConfig.id),
  [CODEX_MODEL_CONFIG_ID, GEMMA_LMSTUDIO_MODEL_CONFIG_ID],
);
assert.equal(
  resolvePrimaryModelConfig(
    { matrix: "gemma-local" },
    resolveModelConfigs({ matrix: "gemma-local" }),
  ).id,
  GEMMA_LMSTUDIO_MODEL_CONFIG_ID,
);
assert.deepEqual(
  resolveModelConfigs({ models: [GEMMA_LMSTUDIO_MODEL_CONFIG_ID] }).map((modelConfig) => modelConfig.id),
  [GEMMA_LMSTUDIO_MODEL_CONFIG_ID],
);
assert.equal(
  resolvePrimaryModelConfig(
    { models: [GEMMA_LMSTUDIO_MODEL_CONFIG_ID] },
    resolveModelConfigs({ models: [GEMMA_LMSTUDIO_MODEL_CONFIG_ID] }),
  ).id,
  GEMMA_LMSTUDIO_MODEL_CONFIG_ID,
);
assert.equal(
  resolvePrimaryModelConfig(
    {
      models: [CODEX_MODEL_CONFIG_ID, GEMMA_LMSTUDIO_MODEL_CONFIG_ID],
      primaryModel: CODEX_MODEL_CONFIG_ID,
    },
    resolveModelConfigs({ models: [CODEX_MODEL_CONFIG_ID, GEMMA_LMSTUDIO_MODEL_CONFIG_ID] }),
  ).id,
  CODEX_MODEL_CONFIG_ID,
);
assert.throws(
  () => resolveModelConfigs({ matrix: "gemma-local", models: [CODEX_MODEL_CONFIG_ID] }),
  /cannot be used together/,
);
assert.throws(
  () =>
    resolvePrimaryModelConfig(
      {
        models: [GEMMA_LMSTUDIO_MODEL_CONFIG_ID],
        primaryModel: CODEX_MODEL_CONFIG_ID,
      },
      resolveModelConfigs({ models: [GEMMA_LMSTUDIO_MODEL_CONFIG_ID] }),
    ),
  /Primary MCP pilot model/,
);
await assert.rejects(
  () =>
    runMcpPilotEval({
      reportsDir: fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-")),
      captureDir: fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-")),
      requiredMcpVersion: REQUIRED_MCP_VERSION,
      models: [GEMMA_LMSTUDIO_MODEL_CONFIG_ID],
      primaryModel: CODEX_MODEL_CONFIG_ID,
      cases: [cases[0].id],
    }),
  /Primary MCP pilot model/,
);

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-packet-"));
  const reportsDir = path.join(tempDir, "reports");
  const outputDir = path.join(tempDir, "packet");
  const primaryReportPath = path.join(reportsDir, "run-012.json");
  const run008Path = path.join(reportsDir, "run-008.json");
  const run011Path = path.join(reportsDir, "run-011.json");
  const primaryReport = mockReport({
    runId: "run-012",
    results: [
      {
        id: "billing-webhook-debug-boundary",
        title: "Billing webhook debug boundary",
        case_type: "activity_translation",
        status: "evaluated",
        passed: false,
        winner: "judgmentkit_mcp",
        score_delta: 8.55,
        minimum_score_delta: 10,
        calibrated_pass_reason: null,
        guided_critical_disclosure_leaks: [],
        variants: [
          { id: "baseline_no_mcp", score: 34.28 },
          { id: "judgmentkit_mcp", score: 42.83 },
        ],
      },
    ],
  });
  writeJson(primaryReportPath, primaryReport);
  writeJson(
    run008Path,
    mockReport({
      runId: "run-008",
      summary: {
        passed: 9,
        failed: 11,
        average_guided_delta: 12.76,
        guided_critical_disclosure_leaks: 17,
        pilot_passed: false,
        pilot_status: "failed",
      },
    }),
  );
  writeJson(
    run011Path,
    mockReport({
      runId: "run-011",
      summary: {
        passed: 14,
        failed: 6,
        average_guided_delta: 21.56,
        guided_critical_disclosure_leaks: 0,
        pilot_passed: false,
        pilot_status: "failed",
      },
    }),
  );

  const first = buildEvidencePacketFromFiles({
    primaryReportPath,
    comparisonReportPaths: [run008Path, run011Path],
    outputDir,
    changedFiles: [
      "evals/run-mcp-pilot-evals.mjs",
      "evals/mcp-pilot-cases.json",
      "evals/build-mcp-pilot-evidence-packet.mjs",
    ],
  });
  const firstJson = fs.readFileSync(first.jsonPath, "utf8");
  const firstMarkdown = fs.readFileSync(first.markdownPath, "utf8");
  const second = buildEvidencePacketFromFiles({
    primaryReportPath,
    comparisonReportPaths: [run008Path, run011Path],
    outputDir,
    changedFiles: [
      "evals/run-mcp-pilot-evals.mjs",
      "evals/mcp-pilot-cases.json",
      "evals/build-mcp-pilot-evidence-packet.mjs",
    ],
  });
  assert.equal(fs.readFileSync(second.jsonPath, "utf8"), firstJson);
  assert.equal(fs.readFileSync(second.markdownPath, "utf8"), firstMarkdown);
  assert.equal(first.packet.primary.passed, 17);
  assert.equal(first.packet.primary.standard_delta_passed, 14);
  assert.equal(first.packet.primary.calibrated_only_passes, 3);
  assert.equal(first.packet.primary.remaining_failures[0].id, "billing-webhook-debug-boundary");
  assert.equal(first.packet.comparisons.length, 2);
  assert.equal(first.packet.comparisons[0].passed, 9);
  assert.equal(first.packet.mcp.actual_version, REQUIRED_MCP_VERSION);
  assert.equal(first.packet.primary.models[0].id, GEMMA_LMSTUDIO_MODEL_CONFIG_ID);
  assert.equal(first.packet.primary.proofs.repair_loop.loop_cases, 4);
  assert.equal(first.packet.primary.proofs.repair_loop.converged_cases, 3);
  assert.equal(first.packet.primary.proofs.live_repair_observation.observation_converged_cases, 4);
  assert.equal(first.packet.primary.proofs.visual_token_adapter.visual_token_cases, 4);
  assert.equal(first.packet.primary.proofs.visual_token_adapter.visual_token_passed_cases, 4);
  assert.ok(
    first.packet.scoped_changed_file_manifest.files.includes(
      "evals/run-mcp-pilot-evals.mjs",
    ),
  );
  assert.equal(
    first.packet.next_milestone.id,
    "milestone-4-default-renderer-component-package",
  );
  assert.equal(first.packet.next_milestone.status, "deferred_planning_only");
  assert.match(firstMarkdown, /Run-012|run-012/i);
  assert.match(firstMarkdown, /Calibrated-only passes: 3/);
  assert.match(firstMarkdown, /Visual token adapter: 4\/4 proof cases passed/);
  assert.match(firstMarkdown, /Default renderer\/component package/);

  const mismatchPath = path.join(reportsDir, "run-mismatch.json");
  writeJson(mismatchPath, mockReport({ runId: "run-mismatch", mcpVersion: "9.9.9" }));
  assert.throws(
    () =>
      buildEvidencePacketFromFiles({
        primaryReportPath,
        comparisonReportPaths: [mismatchPath],
        outputDir,
      }),
    /MCP version mismatch/,
  );
  assert.throws(
    () =>
      buildEvidencePacketFromFiles({
        primaryReportPath: path.join(reportsDir, "missing.json"),
        comparisonReportPaths: [],
        outputDir,
      }),
    /report not found/,
  );
}

for (const testCase of cases) {
  assert.ok(testCase.id);
  assert.ok(testCase.title);
  assert.ok(testCase.task_prompt);
  assert.deepEqual(
    testCase.variants.map((variant) => variant.id),
    VARIANT_IDS,
  );
  assert.ok(testCase.minimum_score_delta > 0);
  assert.equal(
    Math.round(
      METRIC_IDS.reduce((sum, metricId) => sum + testCase.scoring_weights[metricId], 0) * 1000,
    ),
    1000,
  );

  for (const metricId of METRIC_IDS) {
    assert.ok(Array.isArray(testCase.required_terms[metricId]));
  }

  for (const hiddenTerm of HIDDEN_TREATMENT_TERMS) {
    assert.equal(
      normalizeText(testCase.task_prompt).includes(normalizeText(hiddenTerm)),
      false,
      `${testCase.id} task prompt leaked treatment term ${hiddenTerm}`,
    );
  }
}

{
  const mcpRuntime = await createMcpRuntime({ requiredMcpVersion: REQUIRED_MCP_VERSION });
  const testCase = cases.find((candidate) => candidate.id === "vague-system-dashboard");

  try {
    assert.equal(mcpRuntime.endpoint_metadata.name, "JudgmentKit");
    assert.equal(mcpRuntime.endpoint_metadata.version, REQUIRED_MCP_VERSION);

    const context = await buildMcpContextForCase(testCase, mcpRuntime);
    assert.equal(context.mcp_version, REQUIRED_MCP_VERSION);
    assert.ok(context.mcp_url.startsWith("http://127.0.0.1:"));
    assert.equal(typeof context.mcp_metadata_sha256, "string");
    assert.deepEqual(context.tool_sequence, testCase.expected_mcp_tools);
    assert.deepEqual(
      context.tool_calls.map((call) => call.summary.status),
      ["needs_source_context", "needs_source_context", "ok"],
    );
    assert.ok(Array.isArray(context.tool_calls[0].summary.targeted_questions));
    assert.ok(context.tool_calls[0].summary.targeted_questions.length > 0);
    assert.ok(context.tool_calls[0].response.structuredContent);

    for (const candidateCase of cases) {
      const candidateContext = await buildMcpContextForCase(candidateCase, mcpRuntime);
      assert.deepEqual(
        candidateContext.tool_sequence,
        candidateCase.expected_mcp_tools,
        `${candidateCase.id} MCP tool sequence`,
      );
    }

    const missingHandoffCase = cases.find((candidate) => candidate.id === "missing-handoff-workflow");
    const missingHandoffContext = await buildMcpContextForCase(missingHandoffCase, mcpRuntime);
    assert.deepEqual(missingHandoffContext.tool_sequence, missingHandoffCase.expected_mcp_tools);
    assert.equal(missingHandoffContext.tool_sequence.includes("create_ui_generation_handoff"), false);

    const riskyActionCase = cases.find((candidate) => candidate.id === "raw-form-controls-implementation");
    const riskyActionContext = await buildMcpContextForCase(riskyActionCase, mcpRuntime);
    assert.deepEqual(riskyActionContext.tool_sequence, riskyActionCase.expected_mcp_tools);
    assert.equal(riskyActionContext.repair_loop_summary.attempts, 2);
    assert.equal(riskyActionContext.repair_loop_summary.final_action, "accept");
    assert.equal(riskyActionContext.repair_loop_summary.attempts_to_pass, 2);
    assert.deepEqual(
      riskyActionContext.repair_loop_summary.attempt_summaries.map(
        (attempt) => attempt.next_agent_action,
      ),
      ["repair_and_resubmit", "accept"],
    );
    assert.ok(
      riskyActionContext.repair_loop_summary.failure_categories.includes(
        "action_boundaries",
      ),
    );

    const stoppedCase = cases.find((candidate) => candidate.id === "modal-action-order-review");
    const stoppedContext = await buildMcpContextForCase(stoppedCase, mcpRuntime);
    assert.equal(stoppedContext.repair_loop_summary.attempts, 3);
    assert.equal(stoppedContext.repair_loop_summary.final_action, "stop_for_human");
    assert.equal(stoppedContext.repair_loop_summary.stopped_for_human, true);
  } finally {
    await mcpRuntime.close();
  }
}

{
  const testCase = cases.find((candidate) => candidate.id === "refund-schema-admin-translation");
  const prompt = buildCapturePrompt(testCase, testCase.variants[0], null);
  assert.equal(prompt.includes("Expected next action for scoring"), false);
  assert.equal(prompt.includes("Required handoff fields"), false);
  assert.equal(prompt.includes("Forbidden terms for primary response"), false);

  const guidedPrompt = buildCapturePrompt(testCase, testCase.variants[1], {
    case_id: testCase.id,
    mcp_version: REQUIRED_MCP_VERSION,
    tool_sequence: ["create_activity_model_review"],
    tool_calls: [
      {
        name: "create_activity_model_review",
        summary: {
          status: "needs_source_context",
          targeted_questions: ["Which outcome does the operator need to decide?"],
          failure_categories: ["accessibility"],
          repair_guidance: { accessibility: ["Provide keyboard and focus evidence."] },
        },
        response: { structuredContent: { large: "x".repeat(10_000) } },
        result: { large: "x".repeat(10_000) },
      },
    ],
    repair_loop_summary: {
      final_action: "repair_and_resubmit",
      failure_categories: ["accessibility"],
    },
  });
  assert.ok(guidedPrompt.includes("needs_source_context"));
  assert.ok(guidedPrompt.includes("do not reconstruct, name, or quote them"));
  assert.ok(guidedPrompt.includes("write ask, request, or guide"));
  assert.ok(guidedPrompt.includes("Use MCP context as diagnostic guidance"));
  assert.ok(guidedPrompt.includes("Which outcome does the operator need to decide?"));
  assert.ok(guidedPrompt.includes("repair-loop outcome"));
  assert.ok(guidedPrompt.includes("Provide keyboard and focus evidence."));
  assert.equal(guidedPrompt.includes("structuredContent"), false);
  assert.equal(guidedPrompt.includes("create_activity_model_review"), false);
  assert.ok(guidedPrompt.length < 4_000);

  const traceCase = cases.find((candidate) => candidate.id === "agent-trace-review-console");
  const traceGuidedPrompt = buildCapturePrompt(traceCase, traceCase.variants[1], {
    case_id: traceCase.id,
    mcp_version: REQUIRED_MCP_VERSION,
    tool_sequence: traceCase.expected_mcp_tools,
    tool_calls: [
      {
        name: "create_activity_model_review",
        summary: { status: "ready_for_review" },
      },
    ],
  });
  assert.ok(traceGuidedPrompt.includes("[internal detail]"));
  for (const term of traceCase.forbidden_terms) {
    assert.equal(traceGuidedPrompt.includes(term), false, `guided prompt leaked ${term}`);
  }

  const leakingCase = cases.find((candidate) => candidate.id === "schema-leaking-workflow");
  const leakingGuidedPrompt = buildCapturePrompt(leakingCase, leakingCase.variants[1], {
    case_id: leakingCase.id,
    mcp_version: REQUIRED_MCP_VERSION,
    tool_sequence: ["review_ui_workflow_candidate"],
    tool_calls: [
      {
        name: "review_ui_workflow_candidate",
        summary: { status: "needs_source_context" },
      },
    ],
  });
  assert.ok(leakingGuidedPrompt.includes("[internal detail]"));
  assert.equal(leakingGuidedPrompt.includes("JSON schema"), false);
  assert.equal(leakingGuidedPrompt.includes("database field"), false);
  assert.equal(leakingGuidedPrompt.includes("API endpoint"), false);

  const implementationCase = cases.find(
    (candidate) => candidate.id === "raw-form-controls-implementation",
  );
  const implementationGuidedPrompt = buildCapturePrompt(
    implementationCase,
    implementationCase.variants[1],
    {
      case_id: implementationCase.id,
      mcp_version: REQUIRED_MCP_VERSION,
      tool_sequence: implementationCase.expected_mcp_tools,
      tool_calls: [
        {
          name: "create_ui_implementation_contract",
          summary: { status: "created" },
        },
        {
          name: "review_ui_implementation_candidate",
          summary: {
            status: "failed",
            next_agent_action: "repair_and_resubmit",
            failure_categories: ["action_boundaries"],
          },
        },
      ],
      repair_loop_summary: {
        final_action: "accept",
        stopped_for_human: false,
        failure_categories: ["action_boundaries"],
        attempt_summaries: [
          {
            implementation_review_status: "failed",
            next_agent_action: "repair_and_resubmit",
          },
          {
            implementation_review_status: "passed",
            next_agent_action: "accept",
          },
        ],
      },
    },
  );
  assert.ok(implementationGuidedPrompt.includes("implementation_response_directive"));
  assert.ok(implementationGuidedPrompt.includes("reject original implementation"));
  assert.ok(implementationGuidedPrompt.includes("later repaired attempt passed"));
  assert.equal(implementationGuidedPrompt.includes("expected_final_action"), false);
  assert.equal(implementationGuidedPrompt.includes("create_ui_implementation_contract"), false);
  assert.equal(implementationGuidedPrompt.includes("review_ui_implementation_candidate"), false);

  const termLeakageCase = cases.find(
    (candidate) => candidate.id === "implementation-term-leakage-review",
  );
  const termLeakageGuidedPrompt = buildCapturePrompt(
    termLeakageCase,
    termLeakageCase.variants[1],
    {
      case_id: termLeakageCase.id,
      mcp_version: REQUIRED_MCP_VERSION,
      tool_sequence: termLeakageCase.expected_mcp_tools,
      tool_calls: [
        {
          name: "create_ui_implementation_contract",
          summary: { status: "created" },
        },
        {
          name: "review_ui_implementation_candidate",
          summary: {
            status: "failed",
            next_agent_action: "repair_and_resubmit",
            failure_categories: ["data_visibility"],
            failed_checks: ["data_visibility"],
            failed_findings: [
              "data_visibility: Visible product labels expose internal review packet terms.",
            ],
          },
        },
      ],
      repair_loop_summary: {
        final_action: "accept",
        stopped_for_human: false,
        failure_categories: ["data_visibility"],
        attempt_summaries: [
          {
            implementation_review_status: "failed",
            next_agent_action: "repair_and_resubmit",
          },
          {
            implementation_review_status: "passed",
            next_agent_action: "accept",
          },
        ],
      },
    },
  );
  assert.ok(termLeakageGuidedPrompt.includes("Submitted evidence"));
  for (const term of termLeakageCase.forbidden_terms) {
    assert.equal(termLeakageGuidedPrompt.includes(term), false, `guided prompt leaked ${term}`);
  }
  assert.equal(termLeakageGuidedPrompt.includes("create_ui_implementation_contract"), false);
  assert.equal(termLeakageGuidedPrompt.includes("review_ui_implementation_candidate"), false);

  const hardenedPrompts = new Map();
  for (const caseId of [
    "crm-json-import-translation",
    "billing-webhook-debug-boundary",
    "invented-activity-candidate",
    "schema-leaking-workflow",
    "surface-type-mismatch",
    "modal-action-order-review",
  ]) {
    const hardenedCase = cases.find((candidate) => candidate.id === caseId);
    hardenedPrompts.set(
      caseId,
      buildCapturePrompt(hardenedCase, hardenedCase.variants[1], {
        case_id: hardenedCase.id,
        mcp_version: REQUIRED_MCP_VERSION,
        tool_sequence: hardenedCase.expected_mcp_tools,
        tool_calls: [
          {
            name: hardenedCase.expected_mcp_tools[0],
            summary: { status: "needs_source_context" },
          },
        ],
        repair_loop_summary:
          hardenedCase.case_type === "implementation_review"
            ? {
                final_action: "stop_for_human",
                stopped_for_human: true,
                failure_categories: ["accessibility"],
                attempt_summaries: [
                  {
                    implementation_review_status: "failed",
                    next_agent_action: "repair_and_resubmit",
                    failure_categories: ["accessibility"],
                  },
                ],
              }
            : null,
      }),
    );
  }

  assert.ok(
    hardenedPrompts
      .get("crm-json-import-translation")
      .includes("account-operations record acceptance review"),
  );
  assert.ok(
    hardenedPrompts
      .get("crm-json-import-translation")
      .includes("do not invent rejected-record or manual-correction workflows"),
  );
  assert.ok(
    hardenedPrompts
      .get("billing-webhook-debug-boundary")
      .includes("produce billing incident triage"),
  );
  assert.ok(
    hardenedPrompts
      .get("billing-webhook-debug-boundary")
      .includes("customer-visible, engineering escalation, and retry-resolution decisions"),
  );
  for (const caseId of [
    "invented-activity-candidate",
    "schema-leaking-workflow",
    "surface-type-mismatch",
  ]) {
    assert.ok(hardenedPrompts.get(caseId).includes("questions must be []"));
    assert.ok(hardenedPrompts.get(caseId).includes("reject"));
  }
  assert.ok(
    hardenedPrompts
      .get("schema-leaking-workflow")
      .includes("reject and discard the submitted workflow"),
  );
  assert.ok(
    hardenedPrompts
      .get("surface-type-mismatch")
      .includes("return to product landing-page intent"),
  );
  assert.ok(
    hardenedPrompts
      .get("modal-action-order-review")
      .includes("block until modal action order and focus behavior evidence are verified"),
  );
  assert.ok(
    hardenedPrompts
      .get("modal-action-order-review")
      .includes("do not add unsupported broad claims about primitives"),
  );
  for (const promptText of hardenedPrompts.values()) {
    assert.equal(promptText.includes("Expected next action for scoring"), false);
    assert.equal(promptText.includes("Required handoff fields"), false);
    assert.equal(promptText.includes("Forbidden terms for primary response"), false);
  }
}

{
  const testCase = cases.find((candidate) => candidate.id === "modal-action-order-review");
  const prompt = buildRepairObservationPrompt({
    testCase,
    implementationContract: { implementation_contract: testCase.implementation_contract_args },
    currentCandidate: testCase.implementation_candidate,
    currentAttempt: 1,
    maxAttempts: 3,
    review: {
      implementation_review_status: "failed",
      next_agent_action: "repair_and_resubmit",
      autofix_loop: { status: "repairable" },
      repair_instructions: {
        groups: {
          accessibility: [
            "Add modal focus and keyboard-trap evidence to the implementation candidate.",
          ],
        },
      },
      findings: [
        {
          severity: "fail",
          check: "accessibility_evidence.focus_not_obscured",
          message: "Missing focus not obscured evidence.",
        },
        {
          severity: "fail",
          check: "accessibility_evidence.no_keyboard_trap",
          message: "Missing no keyboard trap evidence.",
        },
      ],
    },
  });

  assert.ok(prompt.includes("Failed accessibility_evidence keys for this attempt"));
  assert.ok(prompt.includes("accessibility_evidence.focus_not_obscured"));
  assert.ok(prompt.includes("accessibility_evidence.no_keyboard_trap"));
  assert.ok(prompt.includes("candidate.accessibility_evidence.<key>"));
  assert.ok(prompt.includes("Do not only mention accessibility fixes in rationale"));
  assert.ok(prompt.includes("Do not proactively fill conditional accessibility fields"));
  assert.ok(prompt.includes("Adding extra conditional evidence can introduce new review obligations"));
  assert.ok(prompt.includes("Preferred wording"));
}

{
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });

    if (String(url).endsWith("/models")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: [{ id: MODEL_CONFIGS[GEMMA_LMSTUDIO_MODEL_CONFIG_ID].model }] };
        },
      };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  response: "Use refund triage evidence.",
                  next_action: "translate the request into a refund triage handoff surface",
                  questions: [],
                  handoff: "owner: support lead; action: approve or review; reason: evidence",
                  rationale: "Grounded in source evidence.",
                }),
              },
            },
          ],
          usage: { total_tokens: 42 },
        };
      },
    };
  };

  const modelConfig = MODEL_CONFIGS[GEMMA_LMSTUDIO_MODEL_CONFIG_ID];
  assert.equal(await verifyLmStudioModelAvailable(modelConfig, { fetchImpl }), true);
  const completion = await runLmStudioChatCompletion("Return JSON.", modelConfig, { fetchImpl });
  assert.equal(completion.provider, "lmstudio-openai-chat");
  assert.equal(completion.usage.total_tokens, 42);
  assert.equal(calls[1].url, "http://localhost:1234/v1/chat/completions");
  assert.equal(calls[1].body.model, modelConfig.model);
  assert.equal(calls[1].body.response_format.type, "json_schema");
  assert.equal(calls[1].body.response_format.json_schema.name, "judgmentkit_mcp_pilot_capture");
}

{
  const testCase = cases.find((candidate) => candidate.id === "refund-schema-admin-translation");
  const baseline = mockCapture(testCase, "baseline_no_mcp", {
    response: `Generic admin console with ${testCase.forbidden_terms.join(", ")}.`,
    handoff: {},
  });
  const guided = mockCapture(testCase, "judgmentkit_mcp");
  const result = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: guided,
  });

  assert.equal(result.status, "evaluated");
  assert.equal(result.winner, "judgmentkit_mcp");
  assert.equal(result.passed, true);
  assert.equal(result.standard_delta_passed, true);
  assert.equal(result.calibrated_pass_reason, "delta_threshold");
  assert.ok(result.score_delta >= testCase.minimum_score_delta);

  const guidedVariant = result.variants.find((variant) => variant.id === "judgmentkit_mcp");
  assert.equal(guidedVariant.metric_results.activity_fit.score, 5);
  assert.equal(guidedVariant.metric_results.handoff_quality.score, 5);
  assert.deepEqual(guidedVariant.critical_disclosure_leaks, []);

  const stringHandoffGuided = mockCapture(testCase, "judgmentkit_mcp", {
    handoff: "next owner: support lead; next action: approve or review; reason: source evidence",
  });
  const stringHandoffResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: stringHandoffGuided,
  });
  const stringHandoffVariant = stringHandoffResult.variants.find(
    (variant) => variant.id === "judgmentkit_mcp",
  );
  assert.equal(stringHandoffVariant.metric_results.handoff_quality.score, 5);

  const leakyGuided = mockCapture(testCase, "judgmentkit_mcp", {
    response: `${allRequiredText(testCase)} ${testCase.forbidden_terms[0]}`,
  });
  const leakyResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: leakyGuided,
  });
  assert.equal(leakyResult.passed, false);
  assert.equal(leakyResult.standard_delta_passed, false);
  assert.equal(leakyResult.calibrated_pass_reason, null);
  assert.deepEqual(leakyResult.guided_critical_disclosure_leaks, [testCase.forbidden_terms[0]]);

  const tooManyQuestions = mockCapture(testCase, "judgmentkit_mcp", {
    questions: ["Question one?", "Question two?", "Question three?", "Question four?"],
  });
  const questionResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: tooManyQuestions,
  });
  const questionVariant = questionResult.variants.find((variant) => variant.id === "judgmentkit_mcp");
  assert.ok(questionVariant.metric_results.rework_risk.score < 5);

  const missingHandoff = mockCapture(testCase, "judgmentkit_mcp", {
    handoff: {},
  });
  const missingHandoffResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: missingHandoff,
  });
  const missingHandoffVariant = missingHandoffResult.variants.find(
    (variant) => variant.id === "judgmentkit_mcp",
  );
  assert.ok(missingHandoffVariant.metric_results.handoff_quality.score < 5);

  const invalidGuided = mockCapture(testCase, "judgmentkit_mcp", {
    output_valid: false,
    parse_error: "Unexpected token",
    raw_response: "not json",
    parsed: null,
  });
  const invalidResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: invalidGuided,
  });
  const invalidVariant = invalidResult.variants.find((variant) => variant.id === "judgmentkit_mcp");
  assert.equal(invalidVariant.invalid_output, true);
  assert.equal(invalidVariant.score, 0);

  const weakGuided = mockCapture(testCase, "judgmentkit_mcp", {
    response: "Generic admin console.",
    next_action: "Create the page.",
    handoff: {},
  });
  const weakResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: weakGuided,
  });
  assert.equal(weakResult.passed, false);
  assert.ok(weakResult.score_delta < testCase.minimum_score_delta);

  const highBaselineCase = {
    ...cases.find((candidate) => candidate.id === "b2b-renewal-risk-review"),
    minimum_score_delta: 200,
  };
  const highBaseline = mockCapture(highBaselineCase, "baseline_no_mcp", {
    handoff: "owner: customer success; next action: renewal action; reason: risk signal",
  });
  const highGuided = mockCapture(highBaselineCase, "judgmentkit_mcp");
  const highAbsoluteResult = scoreCase(highBaselineCase, {
    baseline_no_mcp: highBaseline,
    judgmentkit_mcp: highGuided,
  });
  const highGuidedVariant = highAbsoluteResult.variants.find(
    (variant) => variant.id === "judgmentkit_mcp",
  );
  assert.equal(highAbsoluteResult.standard_delta_passed, false);
  assert.equal(highAbsoluteResult.passed, true);
  assert.equal(highAbsoluteResult.calibrated_pass_reason, "high_absolute_guided_score");
  assert.ok(highGuidedVariant.score >= 90);
  assert.ok(highAbsoluteResult.score_delta > 0);

  const highLeakyGuided = mockCapture(highBaselineCase, "judgmentkit_mcp", {
    response: `${allRequiredText(highBaselineCase)} ${highBaselineCase.forbidden_terms[0]}`,
  });
  const highLeakyResult = scoreCase(highBaselineCase, {
    baseline_no_mcp: highBaseline,
    judgmentkit_mcp: highLeakyGuided,
  });
  assert.equal(highLeakyResult.passed, false);
  assert.equal(highLeakyResult.calibrated_pass_reason, null);

  const implementationCase = {
    ...cases.find((candidate) => candidate.id === "raw-form-controls-implementation"),
    minimum_score_delta: 200,
  };
  const implementationBaseline = mockCapture(implementationCase, "baseline_no_mcp", {
    response: "Reject raw controls.",
    handoff: "decision: reject; reason: raw controls; required fix: approved primitives",
  });
  const implementationGuided = mockCapture(implementationCase, "judgmentkit_mcp");
  const repairLoop = {
    enabled: true,
    expectation_status: "passed",
  };
  const implementationResult = scoreCase(
    implementationCase,
    {
      baseline_no_mcp: implementationBaseline,
      judgmentkit_mcp: implementationGuided,
    },
    undefined,
    { repairLoop },
  );
  const implementationGuidedVariant = implementationResult.variants.find(
    (variant) => variant.id === "judgmentkit_mcp",
  );
  assert.equal(implementationResult.standard_delta_passed, false);
  assert.equal(implementationResult.passed, true);
  assert.equal(implementationResult.calibrated_pass_reason, "implementation_repair_loop_verified");
  assert.ok(implementationGuidedVariant.score >= 75);
  assert.equal(implementationGuidedVariant.question_count, 0);

  const stoppedModalCase = cases.find((candidate) => candidate.id === "modal-action-order-review");
  const stoppedModalResult = scoreCase(
    stoppedModalCase,
    {
      baseline_no_mcp: mockCapture(stoppedModalCase, "baseline_no_mcp"),
      judgmentkit_mcp: mockCapture(stoppedModalCase, "judgmentkit_mcp", {
        response: "block",
        next_action: "human_review",
        handoff: "Decision: block; Reason: modal evidence missing; Required fix: human verification",
      }),
    },
    undefined,
    {
      repairLoop: {
        enabled: true,
        expectation_status: "passed",
        stopped_for_human: true,
      },
    },
  );
  assert.equal(stoppedModalResult.passed, false);
  assert.equal(stoppedModalResult.calibrated_pass_reason, null);
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = cases.slice(0, 2);
  const uiCatalogPath = path.join(root, "evals", "reports", "index.json");
  const uiCatalogBefore = fs.existsSync(uiCatalogPath)
    ? fs.readFileSync(uiCatalogPath, "utf8")
    : null;

  for (const testCase of selected) {
    writeJson(
      versionedCapturePath(captureDir, testCase, "baseline_no_mcp"),
      mockCapture(testCase, "baseline_no_mcp", {
        response: `Generic implementation page with ${testCase.forbidden_terms.join(", ")}.`,
        handoff: {},
      }),
    );
    writeJson(
      versionedCapturePath(captureDir, testCase, "judgmentkit_mcp"),
      mockCapture(testCase, "judgmentkit_mcp"),
    );
  }

  const first = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    cases: selected.map((testCase) => testCase.id),
  });
  assert.equal(first.report.eval_id, "judgmentkit-mcp-private-pilot-v1");
  assert.equal(first.report.summary.cases, 2);
  assert.equal(first.report.summary.evaluated_cases, 2);
  assert.equal(first.report.summary.capture_required_cases, 0);
  assert.equal(first.report.summary.pilot_status, "passed");
  assert.equal(first.report.summary.raw_aggregate, undefined);
  assert.equal(first.report.summary.calibrated_passes, 2);
  assert.equal(first.report.summary.standard_delta_passed, 2);
  assert.equal(first.report.summary.calibrated_only_passes, 0);
  assert.equal(first.report.mcp.required_version, REQUIRED_MCP_VERSION);
  assert.equal(first.report.mcp.actual_version, REQUIRED_MCP_VERSION);
  assert.equal(fs.existsSync(first.runInfo.jsonReportPath), true);
  assert.equal(fs.existsSync(first.runInfo.htmlReportPath), true);
  assert.match(fs.readFileSync(first.runInfo.htmlReportPath, "utf8"), /Calibrated reason/);
  assert.equal(fs.existsSync(path.join(reportsDir, "index.json")), true);
  assert.equal(fs.existsSync(path.join(reportsDir, "index.html")), true);

  const firstJson = fs.readFileSync(first.runInfo.jsonReportPath, "utf8");
  const second = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    cases: selected.map((testCase) => testCase.id),
  });
  assert.equal(fs.readFileSync(first.runInfo.jsonReportPath, "utf8"), firstJson);
  assert.equal(second.report.run.run_id, "run-002");
  assert.equal(
    second.catalog.latest.json_report,
    `2026-06-12/mcp-${REQUIRED_MCP_VERSION}/run-002/mcp-pilot-report.json`,
  );

  if (uiCatalogBefore !== null) {
    assert.equal(fs.readFileSync(uiCatalogPath, "utf8"), uiCatalogBefore);
  }
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = [cases[0]];

  for (const testCase of selected) {
    for (const modelConfigId of [CODEX_MODEL_CONFIG_ID, GEMMA_LMSTUDIO_MODEL_CONFIG_ID]) {
      writeJson(
        versionedCapturePath(captureDir, testCase, "baseline_no_mcp", modelConfigId),
        mockCapture(testCase, "baseline_no_mcp", {
          modelConfigId,
          response: `Generic implementation page with ${testCase.forbidden_terms.join(", ")}.`,
          handoff: {},
        }),
      );
      writeJson(
        versionedCapturePath(captureDir, testCase, "judgmentkit_mcp", modelConfigId),
        mockCapture(testCase, "judgmentkit_mcp", { modelConfigId }),
      );
    }
  }

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    models: [CODEX_MODEL_CONFIG_ID, GEMMA_LMSTUDIO_MODEL_CONFIG_ID],
    cases: selected.map((testCase) => testCase.id),
  });

  assert.equal(result.report.summary.cases, 2);
  assert.equal(result.report.summary.unique_cases, 1);
  assert.equal(result.report.summary.models, 2);
  assert.equal(result.report.summary.per_model[CODEX_MODEL_CONFIG_ID].evaluated_cases, 1);
  assert.equal(result.report.summary.per_model[GEMMA_LMSTUDIO_MODEL_CONFIG_ID].evaluated_cases, 1);
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = [cases[0]];

  writeJson(
    versionedCapturePath(captureDir, selected[0], "baseline_no_mcp", CODEX_MODEL_CONFIG_ID),
    mockCapture(selected[0], "baseline_no_mcp", { modelConfigId: CODEX_MODEL_CONFIG_ID }),
  );
  writeJson(
    versionedCapturePath(captureDir, selected[0], "judgmentkit_mcp", CODEX_MODEL_CONFIG_ID),
    mockCapture(selected[0], "judgmentkit_mcp", { modelConfigId: CODEX_MODEL_CONFIG_ID }),
  );
  writeJson(
    versionedCapturePath(captureDir, selected[0], "baseline_no_mcp", GEMMA_LMSTUDIO_MODEL_CONFIG_ID),
    mockCapture(selected[0], "baseline_no_mcp", {
      modelConfigId: GEMMA_LMSTUDIO_MODEL_CONFIG_ID,
      response: `Generic implementation page with ${selected[0].forbidden_terms.join(", ")}.`,
      handoff: {},
    }),
  );
  writeJson(
    versionedCapturePath(captureDir, selected[0], "judgmentkit_mcp", GEMMA_LMSTUDIO_MODEL_CONFIG_ID),
    mockCapture(selected[0], "judgmentkit_mcp", { modelConfigId: GEMMA_LMSTUDIO_MODEL_CONFIG_ID }),
  );

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    matrix: "gemma-local",
    cases: selected.map((testCase) => testCase.id),
  });

  assert.equal(result.report.summary.models, 2);
  assert.equal(result.report.summary.raw_aggregate.pilot_status, "failed");
  assert.equal(result.report.summary.pilot_status, "passed");
  assert.equal(result.report.summary.matrix_status, "primary-passed/control-observed");
  assert.equal(result.report.summary.primary_model_id, GEMMA_LMSTUDIO_MODEL_CONFIG_ID);
  assert.deepEqual(result.report.summary.control_model_ids, [CODEX_MODEL_CONFIG_ID]);
  assert.equal(result.report.summary.control_sanity_passed, true);
  assert.equal(result.report.summary.per_model[CODEX_MODEL_CONFIG_ID].pilot_status, "failed");
  assert.equal(result.report.summary.per_model[GEMMA_LMSTUDIO_MODEL_CONFIG_ID].pilot_status, "passed");
  assert.equal(
    result.report.comparison.models.find((model) => model.id === GEMMA_LMSTUDIO_MODEL_CONFIG_ID).role,
    "primary",
  );
  assert.equal(
    result.report.comparison.models.find((model) => model.id === CODEX_MODEL_CONFIG_ID).role,
    "control",
  );
  const html = fs.readFileSync(result.runInfo.htmlReportPath, "utf8");
  assert.match(html, /Primary proof/);
  assert.match(html, /Ceiling\/control/);
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = [cases[0]];

  writeJson(
    captureFilePath(captureDir, selected[0].id, "baseline_no_mcp"),
    mockCapture(selected[0], "baseline_no_mcp"),
  );
  writeJson(
    captureFilePath(captureDir, selected[0].id, "judgmentkit_mcp"),
    mockCapture(selected[0], "judgmentkit_mcp"),
  );

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    cases: selected.map((testCase) => testCase.id),
  });

  assert.equal(result.report.summary.capture_required_cases, 1);
  assert.equal(result.report.summary.evaluated_cases, 0);
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = cases.filter((testCase) => testCase.repair_loop);

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    cases: selected.map((testCase) => testCase.id),
  });

  assert.equal(result.report.summary.capture_required_cases, 4);
  assert.equal(result.report.summary.evaluated_cases, 0);
  assert.equal(result.report.summary.loop_cases, 4);
  assert.equal(result.report.summary.converged_cases, 3);
  assert.equal(result.report.summary.stopped_cases, 1);
  assert.equal(result.report.summary.average_attempts_to_pass, 2);
  assert.match(result.report.repair_loop_proof_policy, /deterministic fixture proof/i);
  assert.match(result.report.repair_loop_proof_policy, /not measure visual quality/i);
  assert.equal(result.report.summary.failure_category_counts.action_boundaries, 1);
  assert.equal(result.report.summary.failure_category_counts.data_visibility, 1);
  assert.ok(result.report.summary.failure_category_counts.accessibility >= 1);

  const stoppedResult = result.report.results.find(
    (testCase) => testCase.id === "modal-action-order-review",
  );
  assert.equal(stoppedResult.repair_loop.final_action, "stop_for_human");
  assert.equal(stoppedResult.repair_loop.expectation_status, "passed");

  const htmlReport = fs.readFileSync(result.runInfo.htmlReportPath, "utf8");
  assert.ok(htmlReport.includes("Attempts to pass"));
  assert.ok(htmlReport.includes("Converged"));
  assert.ok(htmlReport.includes("Repair loop"));
  assert.ok(htmlReport.includes("Deterministic fixture proof"));
  assert.equal(result.report.repair_loop_observation_policy, undefined);
  assert.equal(result.report.summary.observation_cases, undefined);
  assert.equal(stoppedResult.repair_loop_observation, undefined);
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = cases.filter((testCase) => testCase.visual_token_adapter_proof);

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    cases: selected.map((testCase) => testCase.id),
  });

  assert.equal(result.report.summary.capture_required_cases, 4);
  assert.equal(result.report.summary.evaluated_cases, 0);
  assert.equal(result.report.summary.loop_cases, 0);
  assert.equal(result.report.summary.visual_token_cases, 4);
  assert.equal(result.report.summary.visual_token_passed_cases, 4);
  assert.equal(result.report.summary.visual_token_failed_cases, 0);
  assert.equal(result.report.summary.visual_token_failure_category_counts.visual_tokens, 2);
  assert.equal(result.report.summary.visual_token_failure_category_counts.accessibility, 1);
  assert.match(result.report.visual_token_adapter_proof_policy, /deterministic boundary proof/i);
  assert.match(result.report.visual_token_adapter_proof_policy, /component libraries/i);

  const validResult = result.report.results.find(
    (testCase) => testCase.id === "visual-token-valid-metadata-review",
  );
  const accessibilityResult = result.report.results.find(
    (testCase) => testCase.id === "visual-token-accessibility-bypass-review",
  );
  assert.equal(validResult.visual_token_adapter_proof.implementation_review_status, "passed");
  assert.equal(validResult.visual_token_adapter_proof.visual_token_status, "pass");
  assert.equal(accessibilityResult.visual_token_adapter_proof.visual_token_status, "pass");
  assert.ok(
    accessibilityResult.visual_token_adapter_proof.failure_categories.includes(
      "accessibility",
    ),
  );

  const htmlReport = fs.readFileSync(result.runInfo.htmlReportPath, "utf8");
  assert.ok(htmlReport.includes("Visual token adapter proof"));
  assert.ok(htmlReport.includes("Token cases"));
  assert.ok(htmlReport.includes("Token passed"));
  assert.ok(htmlReport.includes("Deterministic boundary proof"));
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = [cases.find((testCase) => testCase.id === "missing-accessibility-evidence")];
  let providerCalls = 0;

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    observeRepairLoop: true,
    freshObservation: true,
    cases: selected.map((testCase) => testCase.id),
    repairCandidateProvider: async ({ testCase, review }) => {
      providerCalls += 1;
      assert.equal(review.next_agent_action, "repair_and_resubmit");
      return {
        output_valid: true,
        candidate: testCase.repair_loop.attempts[1].candidate,
        rationale: "Added the missing accessibility evidence.",
        prompt_sha256: "repair-prompt-sha",
        raw_response_sha256: "repair-response-sha",
        duration_ms: 1,
        execution: { runtime: "injected", status: 0 },
      };
    },
  });

  assert.equal(providerCalls, 1);
  assert.match(result.report.repair_loop_observation_policy, /Codex CLI dogfood/i);
  assert.equal(result.report.summary.loop_cases, 1);
  assert.equal(result.report.summary.converged_cases, 1);
  assert.equal(result.report.summary.observation_cases, 1);
  assert.equal(result.report.summary.observation_converged_cases, 1);
  assert.equal(result.report.summary.observation_failed_cases, 0);
  assert.equal(result.report.summary.observation_average_attempts_to_pass, 2);

  const observation = result.report.results[0].repair_loop_observation;
  assert.equal(observation.capture_status, "captured");
  assert.equal(observation.attempts, 2);
  assert.equal(observation.final_action, "accept");
  assert.equal(observation.converged, true);
  assert.equal(observation.attempts_to_pass, 2);
  assert.deepEqual(observation.unresolved_categories, []);
  assert.ok(observation.followed_repair_categories.includes("accessibility"));
  assert.equal(observation.candidate_hashes.length, 2);
  assert.ok(
    observation.attempt_summaries[0].failed_accessibility_evidence_keys.includes(
      "semantic_content",
    ),
  );
  assert.ok(
    observation.attempt_summaries[0].repair_candidate_accessibility_evidence_keys.includes(
      "semantic_content",
    ),
  );
  assert.deepEqual(
    observation.attempt_summaries[0].repair_candidate_missing_failed_accessibility_evidence_keys,
    [],
  );

  const observationPath = repairObservationFilePath(
    captureDir,
    REQUIRED_MCP_VERSION,
    CODEX_MODEL_CONFIG_ID,
    selected[0].id,
  );
  assert.equal(fs.existsSync(observationPath), true);
  const transcript = JSON.parse(fs.readFileSync(observationPath, "utf8"));
  assert.equal(transcript.capture_type, "repair-loop-observation-transcript");
  assert.match(transcript.observation_policy, /not a deterministic fixture proof/i);
  assert.ok(transcript.attempts[0].provided_accessibility_evidence_keys.length === 0);
  assert.ok(
    transcript.attempts[0].repair_candidate_accessibility_evidence_keys.includes(
      "responsive_no_overflow",
    ),
  );

  const cached = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    observeRepairLoop: true,
    cases: selected.map((testCase) => testCase.id),
    repairCandidateProvider: async () => {
      throw new Error("cached observation should not call provider");
    },
  });
  assert.equal(cached.report.results[0].repair_loop_observation.capture_status, "cached");

  const htmlReport = fs.readFileSync(result.runInfo.htmlReportPath, "utf8");
  assert.ok(htmlReport.includes("Live repair-loop observation"));
  assert.ok(htmlReport.includes("Codex CLI dogfood observation"));
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = [cases.find((testCase) => testCase.id === "modal-action-order-review")];
  let providerCalls = 0;

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    observeRepairLoop: true,
    freshObservation: true,
    cases: selected.map((testCase) => testCase.id),
    repairCandidateProvider: async ({ testCase }) => {
      providerCalls += 1;
      return {
        output_valid: true,
        candidate: repairedModalCandidate({
          focus_not_obscured:
            "pass: verified active focus remains fully visible throughout modal navigation.",
          no_keyboard_trap:
            "pass: verified Escape and Cancel close the modal and return focus to the opener.",
          forced_colors:
            "pass: system color mode verified for authored focus treatment and control boundaries.",
        }),
        rationale: "Added the conditional modal accessibility evidence.",
        prompt_sha256: `repair-prompt-${providerCalls}`,
        raw_response_sha256: `repair-response-${providerCalls}`,
      };
    },
  });

  assert.equal(providerCalls, 1);
  const observation = result.report.results[0].repair_loop_observation;
  assert.equal(observation.capture_status, "captured");
  assert.equal(observation.attempts, 2);
  assert.equal(observation.final_action, "accept");
  assert.equal(observation.converged, true);
  assert.equal(observation.attempts_to_pass, 2);
  assert.deepEqual(observation.unresolved_accessibility_evidence_keys, []);
  assert.ok(observation.followed_repair_categories.includes("accessibility"));
  assert.ok(
    observation.attempt_summaries[0].failed_accessibility_evidence_keys.includes(
      "focus_not_obscured",
    ),
  );
  assert.ok(
    observation.attempt_summaries[0].repair_candidate_accessibility_evidence_keys.includes(
      "focus_not_obscured",
    ),
  );
  assert.deepEqual(
    observation.attempt_summaries[0].repair_candidate_missing_failed_accessibility_evidence_keys,
    [],
  );
  assert.equal(result.report.summary.observation_converged_cases, 1);
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = [cases.find((testCase) => testCase.id === "modal-action-order-review")];
  let providerCalls = 0;

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    observeRepairLoop: true,
    freshObservation: true,
    cases: selected.map((testCase) => testCase.id),
    repairCandidateProvider: async () => {
      providerCalls += 1;
      return {
        output_valid: true,
        candidate: repairedModalCandidate(),
        rationale: "Returned core accessibility evidence but no modal-specific accessibility evidence.",
        prompt_sha256: `repair-prompt-${providerCalls}`,
        raw_response_sha256: `repair-response-${providerCalls}`,
      };
    },
  });

  assert.equal(providerCalls, 2);
  const observation = result.report.results[0].repair_loop_observation;
  assert.equal(observation.capture_status, "captured");
  assert.equal(observation.attempts, 3);
  assert.equal(observation.final_action, "stop_for_human");
  assert.equal(observation.converged, false);
  assert.equal(observation.stopped_for_human, true);
  assert.equal(observation.attempts_to_pass, null);
  assert.deepEqual(observation.unresolved_categories, ["accessibility"]);
  assert.deepEqual(observation.unresolved_accessibility_evidence_keys, [
    "focus_not_obscured",
    "no_keyboard_trap",
  ]);
  assert.deepEqual(
    observation.attempt_summaries[1].repair_candidate_missing_failed_accessibility_evidence_keys,
    ["focus_not_obscured", "no_keyboard_trap"],
  );
  assert.equal(result.report.summary.observation_stopped_cases, 1);
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = [cases.find((testCase) => testCase.id === "raw-form-controls-implementation")];

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    observeRepairLoop: true,
    freshObservation: true,
    cases: selected.map((testCase) => testCase.id),
    repairCandidateProvider: async () => {
      throw new Error("repair provider unavailable");
    },
  });

  assert.equal(result.report.summary.loop_cases, 1);
  assert.equal(result.report.summary.converged_cases, 1);
  assert.equal(result.report.summary.observation_cases, 1);
  assert.equal(result.report.summary.observation_failed_cases, 1);
  const observation = result.report.results[0].repair_loop_observation;
  assert.equal(observation.capture_status, "failed");
  assert.equal(observation.attempts, 1);
  assert.equal(observation.final_action, "repair_and_resubmit");
  assert.match(observation.error, /repair provider unavailable/);
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = [cases[0]];

  writeJson(
    versionedCapturePath(captureDir, selected[0], "baseline_no_mcp"),
    mockCapture(selected[0], "baseline_no_mcp", { mcpVersion: "0.1.0" }),
  );
  writeJson(
    versionedCapturePath(captureDir, selected[0], "judgmentkit_mcp"),
    mockCapture(selected[0], "judgmentkit_mcp", { mcpVersion: "0.1.0" }),
  );

  const result = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    requiredMcpVersion: REQUIRED_MCP_VERSION,
    cases: selected.map((testCase) => testCase.id),
  });

  assert.equal(result.report.summary.capture_required_cases, 1);
  assert.equal(result.report.summary.evaluated_cases, 0);
}

console.log("MCP pilot eval checks passed.");
