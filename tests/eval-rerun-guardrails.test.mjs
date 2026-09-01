import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CODEX_MODEL_CONFIG_ID,
  MODEL_CONFIGS,
  REQUIRED_MCP_VERSION,
  mcpPilotPublicationAssessment,
  scoreCase,
} from "../evals/run-mcp-pilot-evals.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function caseById(cases, id, file) {
  const testCase = cases.find((candidate) => candidate.id === id);
  assert.ok(testCase, `${file} should include ${id}`);
  return testCase;
}

function assertWeightsCover(testCase, metricIds) {
  for (const metricId of metricIds) {
    assert.equal(
      typeof testCase.scoring_weights?.[metricId],
      "number",
      `${testCase.id} should score ${metricId}`,
    );
  }
}

function assertHasAll(value, expected, message) {
  for (const item of expected) {
    assert.ok(value.includes(item), `${message}: missing ${item}`);
  }
}

const STATIC_UI_GENERATION_POLICY =
  "Scores committed standalone artifacts only. Does not call providers or generate apps.";
const DATED_RUN_PATH_PATTERN =
  /^\d{4}-\d{2}-\d{2}\/mcp-\d+\.\d+\.\d+\/run-\d{3}(?:\/|$)/;
const DATED_GENERATED_ARTIFACT_PATH_PATTERN =
  /^\d{4}-\d{2}-\d{2}\/mcp-\d+\.\d+\.\d+\/run-\d{3}\/generated-artifacts\/[^/]+\/[^/]+\.html$/;
const DATED_SCREENSHOT_PATH_PATTERN =
  /^\d{4}-\d{2}-\d{2}\/mcp-\d+\.\d+\.\d+\/run-\d{3}\/screenshots\/[^/]+\/[^/]+\.png$/;

function findReportFiles(relativeDir, predicate) {
  const start = path.join(root, relativeDir);
  const matches = [];
  const pending = [start];

  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(filePath);
        continue;
      }

      const relativePath = path.relative(root, filePath);
      if (predicate(relativePath)) {
        matches.push(relativePath);
      }
    }
  }

  return matches.sort();
}

function collectForbiddenKeys(value, forbiddenKeys, trail = "report", matches = []) {
  if (!value || typeof value !== "object") {
    return matches;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectForbiddenKeys(item, forbiddenKeys, `${trail}[${index}]`, matches);
    });
    return matches;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const keyPath = `${trail}.${key}`;
    if (forbiddenKeys.has(key)) {
      matches.push(keyPath);
    }
    collectForbiddenKeys(nestedValue, forbiddenKeys, keyPath, matches);
  }

  return matches;
}

function assertNoLiveGenerationMetadata(report, label) {
  const forbiddenKeys = new Set([
    "live_generation",
    "live_generation_policy",
    "provider",
    "provider_metadata",
    "model",
    "model_config_id",
    "runtime",
    "capture_dir",
    "capture_required",
    "generated_artifact",
    "generated_artifact_path",
    "generated_artifacts",
  ]);
  const matches = collectForbiddenKeys(report, forbiddenKeys);
  assert.deepEqual(matches, [], `${label} should not carry live-generation metadata`);
}

function assertProviderMetadata(metadata, label) {
  assert.equal(typeof metadata, "object", `${label} should include provider metadata`);
  assert.equal(Array.isArray(metadata), false, `${label} provider metadata should be an object`);
  for (const field of ["provider", "model_config_id", "model", "runtime"]) {
    assert.equal(typeof metadata[field], "string", `${label} should include provider ${field}`);
    assert.ok(metadata[field].length > 0, `${label} provider ${field} should not be empty`);
  }
  assert.equal(typeof metadata.local, "boolean", `${label} should include provider local flag`);
}

function liveGenerationPolicy(report) {
  return report.live_generation_policy ?? report.live_generation?.policy ?? report.generation_policy;
}

function liveProviderMetadata(report) {
  return (
    report.provider_metadata ??
    report.live_generation?.provider_metadata ??
    report.live_generation?.provider
  );
}

function generatedArtifactPathsForVariant(variant) {
  const paths = [];

  if (typeof variant.generated_artifact_path === "string") {
    paths.push(variant.generated_artifact_path);
  }
  if (typeof variant.generated_artifact?.path === "string") {
    paths.push(variant.generated_artifact.path);
  }
  for (const artifact of variant.generated_artifacts ?? []) {
    if (typeof artifact === "string") {
      paths.push(artifact);
    } else if (typeof artifact?.path === "string") {
      paths.push(artifact.path);
    }
  }

  return paths;
}

function screenshotPathsForVariant(variant) {
  return (variant.screenshots ?? [])
    .map((screenshot) => screenshot?.path)
    .filter((screenshotPath) => typeof screenshotPath === "string");
}

function assertLiveUiGenerationReport(report, label) {
  assert.match(
    report.evaluation_type,
    /live.*ui.*generation|ui.*generation.*live/i,
    `${label} should identify live UI generation in evaluation_type`,
  );
  assert.notEqual(
    report.evaluation_type,
    "deterministic_static_artifact_scoring",
    `${label} must not use deterministic static artifact scoring as its evaluation type`,
  );

  const policy = liveGenerationPolicy(report);
  assert.equal(typeof policy, "string", `${label} should include a live generation policy`);
  assert.match(policy, /\blive\b/i, `${label} policy should name live generation`);
  assert.match(policy, /\bprovider\b/i, `${label} policy should name provider involvement`);
  assert.match(policy, /generated.*artifact/i, `${label} policy should name generated artifacts`);
  assert.notEqual(policy, STATIC_UI_GENERATION_POLICY, `${label} policy should not be static policy`);

  assertProviderMetadata(liveProviderMetadata(report), label);
  assert.match(report.run?.run_path ?? "", DATED_RUN_PATH_PATTERN, `${label} should have a dated run path`);

  const variants = (report.results ?? []).flatMap((result) => result.variants ?? []);
  assert.ok(variants.length > 0, `${label} should include generated variants`);

  for (const [index, variant] of variants.entries()) {
    const variantLabel = `${label} variant ${variant.id ?? index}`;
    const generatedArtifactPaths = generatedArtifactPathsForVariant(variant);
    assert.ok(
      generatedArtifactPaths.length > 0,
      `${variantLabel} should include a generated artifact path`,
    );
    for (const artifactPath of generatedArtifactPaths) {
      assert.match(
        artifactPath,
        DATED_GENERATED_ARTIFACT_PATH_PATTERN,
        `${variantLabel} generated artifact path should be dated and report-local`,
      );
      assert.ok(
        artifactPath.startsWith(`${report.run.run_path}/generated-artifacts/`),
        `${variantLabel} generated artifact path should live under its report run`,
      );
    }

    const screenshotPaths = screenshotPathsForVariant(variant);
    assert.ok(screenshotPaths.length > 0, `${variantLabel} should include screenshot paths`);
    for (const screenshotPath of screenshotPaths) {
      assert.match(
        screenshotPath,
        DATED_SCREENSHOT_PATH_PATTERN,
        `${variantLabel} screenshot path should be dated and report-local`,
      );
      assert.ok(
        screenshotPath.startsWith(`${report.run.run_path}/screenshots/`),
        `${variantLabel} screenshot path should live under its report run`,
      );
    }
  }
}

function assertStaticUiGenerationReport(report, label) {
  assert.equal(
    report.evaluation_type,
    "deterministic_static_artifact_scoring",
    `${label} should remain deterministic static artifact scoring`,
  );
  assert.equal(
    report.generation_policy,
    STATIC_UI_GENERATION_POLICY,
    `${label} should clearly state the non-live static policy`,
  );
  if (report.visual_evidence) {
    assert.match(
      report.visual_evidence.capture_policy ?? "",
      /committed static artifacts/i,
      `${label} screenshot policy should name committed static artifacts`,
    );
  }
  assert.match(
    report.benchmark_policy ?? "",
    /not a statistically powered benchmark/i,
    `${label} should avoid benchmark claims`,
  );
  assertNoLiveGenerationMetadata(report, label);

  const runPath = report.run?.run_path;
  assert.match(runPath ?? "", DATED_RUN_PATH_PATTERN, `${label} should have a dated run path`);

  for (const result of report.results ?? []) {
    for (const variant of result.variants ?? []) {
      const variantLabel = `${label} ${result.id}/${variant.id}`;
      assert.equal(typeof variant.artifact, "string", `${variantLabel} should keep static artifact`);
      assert.doesNotMatch(
        variant.artifact,
        DATED_RUN_PATH_PATTERN,
        `${variantLabel} static artifact should not be a dated generated artifact`,
      );
      assert.equal(
        fs.existsSync(path.join(root, variant.artifact)),
        true,
        `${variantLabel} static artifact should exist`,
      );

      if ("screenshots" in variant) {
        const screenshotPaths = screenshotPathsForVariant(variant);
        assert.ok(screenshotPaths.length > 0, `${variantLabel} should include screenshot paths`);
        for (const screenshotPath of screenshotPaths) {
          assert.match(
            screenshotPath,
            DATED_SCREENSHOT_PATH_PATTERN,
            `${variantLabel} screenshot path should be dated and report-local`,
          );
          assert.ok(
            screenshotPath.startsWith(`${runPath}/screenshots/`),
            `${variantLabel} screenshot path should live under its report run`,
          );
          assert.equal(
            fs.existsSync(path.join(root, "evals/reports", screenshotPath)),
            true,
            `${variantLabel} screenshot should exist`,
          );
        }
      }
    }
  }
}

const coreCases = readJson("evals/cases.json");
const mcpCases = readJson("evals/mcp-pilot-cases.json");
const uiCases = readJson("evals/ui-generation-cases.json");
const activityContract = readJson("contracts/ai-ui-generation.activity-contract.json");
const mcpPilotCatalog = readJson("evals/reports/mcp-pilot/index.json");

assert.equal(activityContract.version, "0.8.0");

const filesWithAxisCoverage = new Set();
const activeContractAxisCommitments = [
  {
    axis: "activity_fit",
    commitments: [
      {
        file: "evals/cases.json",
        id: "activity-rich-refund-triage",
        assert(testCase) {
          assert.equal(testCase.expect.evidence.activity, true);
          assert.ok(testCase.tags.includes("activity-rich"));
        },
      },
      {
        file: "evals/mcp-pilot-cases.json",
        id: "refund-schema-admin-translation",
        assert(testCase) {
          assert.equal(testCase.case_type, "activity_translation");
          assertWeightsCover(testCase, ["activity_fit", "evidence_grounding"]);
        },
      },
      {
        file: "evals/ui-generation-cases.json",
        id: "refund-triage-standalone-v1",
        assert(testCase) {
          assertWeightsCover(testCase, ["activity_fit"]);
          assert.ok(testCase.rubric_terms.activity_fit.length > 0);
        },
      },
    ],
  },
  {
    axis: "decision_support",
    commitments: [
      {
        file: "evals/cases.json",
        id: "field-operations-false-positive",
        assert(testCase) {
          assert.equal(testCase.expect.evidence.decision, true);
          assert.ok(testCase.expect.observed_includes.primary_decisions.length > 0);
        },
      },
      {
        file: "evals/mcp-pilot-cases.json",
        id: "clinical-intake-operator-review",
        assert(testCase) {
          assert.equal(testCase.case_type, "operator_review_handoff");
          assertWeightsCover(testCase, ["decision_support"]);
        },
      },
      {
        file: "evals/ui-generation-cases.json",
        id: "dinner-playlist-standalone-v1",
        assert(testCase) {
          assertWeightsCover(testCase, ["decision_support"]);
          assert.ok(testCase.rubric_terms.decision_support.length > 0);
        },
      },
    ],
  },
  {
    axis: "missing_context_restraint",
    commitments: [
      {
        file: "evals/cases.json",
        id: "vague-dashboard-request",
        assert(testCase) {
          assert.ok(testCase.tags.includes("missing-source-context"));
          assert.equal(testCase.expect.review.status, "needs_source_context");
        },
      },
      {
        file: "evals/mcp-pilot-cases.json",
        id: "vague-system-dashboard",
        assert(testCase) {
          assert.equal(testCase.case_type, "missing_context_restraint");
          assert.ok(testCase.max_questions <= 3);
        },
      },
    ],
  },
  {
    axis: "disclosure_discipline",
    commitments: [
      {
        file: "evals/cases.json",
        id: "diagnostic-integration-audit",
        assert(testCase) {
          assert.ok(
            testCase.tags.includes(
              "implementation-terms-allowed-in-setup-activity",
            ),
          );
          assertHasAll(
            testCase.expect.review.guardrail_terms_includes,
            ["JSON schema", "prompt template"],
            testCase.id,
          );
        },
      },
      {
        file: "evals/mcp-pilot-cases.json",
        id: "schema-leaking-workflow",
        assert(testCase) {
          assert.equal(testCase.case_type, "candidate_validation");
          assertWeightsCover(testCase, ["disclosure_discipline"]);
        },
      },
      {
        file: "evals/ui-generation-cases.json",
        id: "refund-triage-standalone-v1",
        assert(testCase) {
          assertWeightsCover(testCase, ["disclosure_discipline"]);
          assertHasAll(
            testCase.implementation_leakage_terms,
            ["JSON schema", "prompt template", "tool call"],
            testCase.id,
          );
        },
      },
    ],
  },
  {
    axis: "handoff_and_outcome",
    commitments: [
      {
        file: "evals/cases.json",
        id: "activity-rich-refund-triage",
        assert(testCase) {
          assert.equal(testCase.expect.evidence.outcome, true);
          assert.ok(testCase.expect.observed_includes.outcomes.includes("clear handoff"));
        },
      },
      {
        file: "evals/mcp-pilot-cases.json",
        id: "b2b-renewal-risk-review",
        assert(testCase) {
          assert.equal(testCase.case_type, "operator_review_handoff");
          assertHasAll(
            testCase.required_handoff_fields,
            ["owner", "next action", "reason", "evidence gap"],
            testCase.id,
          );
        },
      },
      {
        file: "evals/ui-generation-cases.json",
        id: "refund-triage-standalone-v1",
        assert(testCase) {
          assertWeightsCover(testCase, ["handoff_completeness"]);
          assert.ok(testCase.expected_outcomes.some((outcome) => outcome.includes("handoff")));
        },
      },
    ],
  },
  {
    axis: "workflow_topology",
    commitments: [
      {
        file: "evals/cases.json",
        id: "multi-surface-workbench-staged-flow-block",
        assert(testCase) {
          assert.ok(testCase.tags.includes("workflow-topology"));
          assert.equal(
            testCase.expect.ui_workflow.candidate_equals["workflow.stepper_eligibility.blocked"],
            true,
          );
        },
      },
      {
        file: "evals/cases.json",
        id: "staged-setup-form-eligible",
        assert(testCase) {
          assert.ok(testCase.tags.includes("stepper-eligibility"));
          assert.equal(
            testCase.expect.ui_workflow.candidate_equals["workflow.stepper_eligibility.allowed"],
            true,
          );
        },
      },
      {
        file: "evals/mcp-pilot-cases.json",
        id: "missing-handoff-workflow",
        assert(testCase) {
          assert.equal(testCase.candidate_kind, "ui_workflow");
          assert.ok(testCase.expected_mcp_tools.includes("review_ui_workflow_candidate"));
        },
      },
    ],
  },
  {
    axis: "implementation_contract",
    commitments: [
      {
        file: "evals/mcp-pilot-cases.json",
        id: "raw-form-controls-implementation",
        assert(testCase) {
          assert.equal(testCase.case_type, "implementation_review");
          assert.ok(testCase.expected_mcp_tools.includes("create_ui_implementation_contract"));
          assert.ok(testCase.expected_mcp_tools.includes("review_ui_implementation_candidate"));
        },
      },
    ],
  },
  {
    axis: "accessibility_evidence",
    commitments: [
      {
        file: "evals/mcp-pilot-cases.json",
        id: "missing-accessibility-evidence",
        assert(testCase) {
          assert.equal(testCase.case_type, "implementation_review");
          assert.ok(testCase.expected_next_action.includes("accessibility evidence"));
          assert.ok(testCase.repair_loop);
        },
      },
    ],
  },
  {
    axis: "visual_token_adapter_boundary",
    commitments: [
      {
        file: "evals/mcp-pilot-cases.json",
        id: "visual-token-renderer-boundary-review",
        assert(testCase) {
          assert.equal(testCase.visual_token_adapter_proof.proof_type, "renderer_boundary");
          assert.equal(
            testCase.visual_token_adapter_proof.expected_next_agent_action,
            "repair_and_resubmit",
          );
        },
      },
    ],
  },
  {
    axis: "cognitive_dimensions_review",
    commitments: [
      {
        file: "evals/mcp-pilot-cases.json",
        id: "cognitive-refund-action-detached",
        assert(testCase) {
          assert.equal(testCase.cognitive_dimensions_review.enabled, true);
          assert.ok(testCase.expected_mcp_tools.includes("review_cognitive_dimensions_candidate"));
        },
      },
    ],
  },
  {
    axis: "static_paired_artifact_regression",
    commitments: [
      {
        file: "evals/ui-generation-cases.json",
        id: "refund-triage-standalone-v1",
        assert(testCase) {
          assert.equal(testCase.claim_level, "single_pair_signal");
          assert.equal(testCase.variants.length, 2);
        },
      },
      {
        file: "evals/ui-generation-cases.json",
        id: "dinner-playlist-standalone-v1",
        assert(testCase) {
          assert.equal(testCase.claim_level, "single_pair_signal");
          assert.equal(testCase.variants.length, 2);
        },
      },
    ],
  },
];

const manifests = {
  "evals/cases.json": coreCases,
  "evals/mcp-pilot-cases.json": mcpCases,
  "evals/ui-generation-cases.json": uiCases,
};

for (const axis of activeContractAxisCommitments) {
  assert.ok(axis.commitments.length > 0, `${axis.axis} should map to committed cases`);

  for (const commitment of axis.commitments) {
    filesWithAxisCoverage.add(commitment.file);
    const testCase = caseById(manifests[commitment.file], commitment.id, commitment.file);
    commitment.assert(testCase);
  }
}

assert.deepEqual(
  [...filesWithAxisCoverage].sort(),
  ["evals/cases.json", "evals/mcp-pilot-cases.json", "evals/ui-generation-cases.json"],
);

assert.equal(uiCases.length, 2, "public UI eval should remain a two-case regression set");
assert.deepEqual(
  uiCases.map((testCase) => testCase.id).sort(),
  ["dinner-playlist-standalone-v1", "refund-triage-standalone-v1"],
);

for (const testCase of uiCases) {
  assert.equal(testCase.claim_level, "single_pair_signal");
  assert.equal(testCase.expected_winner, "judgmentkit_handoff");
  assert.ok(
    testCase.minimum_score_delta > 0,
    `${testCase.id} should keep paired-artifact regression thresholding`,
  );
  assert.equal(
    ["case_type", "capture_dir", "capture_required", "model_config_id", "provider"].some(
      (field) => field in testCase,
    ),
    false,
    `${testCase.id} should not carry live-capture or provider metadata`,
  );
  assert.deepEqual(
    testCase.variants.map((variant) => variant.id),
    ["baseline", "guided"],
  );
  assert.deepEqual(
    testCase.variants.map((variant) => variant.treatment),
    ["raw_brief_baseline", "judgmentkit_handoff"],
  );

  for (const variant of testCase.variants) {
    assert.ok(variant.artifact.endsWith(".html"));
    assert.equal(fs.existsSync(path.join(root, variant.artifact)), true);
    assert.ok(variant.public_artifact.startsWith("/examples/"));
  }
}

assert.ok(
  uiCases.length < 10 && uiCases.every((testCase) => testCase.claim_level === "single_pair_signal"),
  "two static UI cases are regression evidence, not enough to support benchmark claims",
);

const liveUiGenerationReportExample = {
  eval_id: "judgmentkit-live-ui-generation-v1",
  evaluation_type: "live_ui_generation_provider_artifact_scoring",
  live_generation: {
    policy:
      "Live UI generation eval: calls the configured provider, records provider metadata, and scores generated artifacts from the dated report run.",
    provider_metadata: {
      provider: "codex",
      model_config_id: "gpt-5.5-codex",
      model: "gpt-5.5-codex",
      runtime: "codex_cli",
      local: false,
    },
  },
  run: {
    date: "2026-07-03",
    mcp_release: "0.6.5",
    mcp_release_segment: "mcp-0.6.5",
    run_id: "run-001",
    run_path: "2026-07-03/mcp-0.6.5/run-001",
  },
  results: [
    {
      id: "refund-triage-live-v1",
      variants: [
        {
          id: "judgmentkit_live",
          generated_artifact: {
            path: "2026-07-03/mcp-0.6.5/run-001/generated-artifacts/refund-triage-live-v1/judgmentkit-live.html",
          },
          screenshots: [
            {
              id: "judgmentkit-live-desktop",
              path: "2026-07-03/mcp-0.6.5/run-001/screenshots/refund-triage-live-v1/judgmentkit-live-desktop.png",
            },
          ],
        },
      ],
    },
  ],
};

assertLiveUiGenerationReport(liveUiGenerationReportExample, "live UI report guardrail example");

const staticScoringMasquerade = JSON.parse(JSON.stringify(liveUiGenerationReportExample));
staticScoringMasquerade.evaluation_type = "deterministic_static_artifact_scoring";
staticScoringMasquerade.generation_policy = STATIC_UI_GENERATION_POLICY;
assert.throws(
  () => assertLiveUiGenerationReport(staticScoringMasquerade, "static scoring masquerade"),
  /should identify live UI generation|must not use deterministic static artifact scoring/,
);

const missingGeneratedArtifactPath = JSON.parse(JSON.stringify(liveUiGenerationReportExample));
delete missingGeneratedArtifactPath.results[0].variants[0].generated_artifact;
missingGeneratedArtifactPath.results[0].variants[0].artifact = "examples/comparison/version-b.html";
assert.throws(
  () => assertLiveUiGenerationReport(missingGeneratedArtifactPath, "missing generated artifact"),
  /generated artifact path/,
);

const uiReportFiles = findReportFiles(
  "evals/reports",
  (relativePath) =>
    relativePath.endsWith("ui-generation-report.json") ||
    relativePath.endsWith("live-ui-generation-report.json"),
);
assert.ok(uiReportFiles.length > 0, "committed UI eval reports should be covered");

for (const reportFile of uiReportFiles) {
  const report = readJson(reportFile);
  const isLiveUiReport =
    /live/i.test(report.evaluation_type ?? "") ||
    /live-ui-generation/i.test(report.eval_id ?? "") ||
    reportFile.endsWith("live-ui-generation-report.json");

  if (isLiveUiReport) {
    assertLiveUiGenerationReport(report, reportFile);
  } else {
    assertStaticUiGenerationReport(report, reportFile);
  }
}

const mcpCaseTypeCounts = mcpCases.reduce((counts, testCase) => {
  counts[testCase.case_type] = (counts[testCase.case_type] ?? 0) + 1;
  return counts;
}, {});

assert.deepEqual(mcpCaseTypeCounts, {
  activity_translation: 4,
  missing_context_restraint: 4,
  operator_review_handoff: 4,
  candidate_validation: 10,
  implementation_review: 8,
});

const cognitiveCases = mcpCases.filter((testCase) => testCase.cognitive_dimensions_review);
assert.deepEqual(
  cognitiveCases.map((testCase) => testCase.id),
  [
    "cognitive-refund-action-detached",
    "cognitive-field-dispatch-transition-loss",
    "cognitive-clinical-hidden-dependency",
    "cognitive-dashboard-no-follow-up",
    "cognitive-setup-debug-diagnostic-exception",
    "cognitive-spreadsheet-progressive-evaluation-gap",
  ],
);

for (const testCase of cognitiveCases) {
  assert.equal(testCase.cognitive_dimensions_review.enabled, true);
  assert.equal(testCase.case_type, "candidate_validation");
  assert.equal(testCase.candidate_kind, "ui_workflow");
  assert.ok(testCase.expected_mcp_tools.includes("review_cognitive_dimensions_candidate"));
  assert.ok(testCase.cognitive_dimensions_review.expected_dimensions.length > 0);
  assert.equal(
    Object.keys(testCase.scoring_weights).some((metricId) =>
      metricId.includes("cognitive"),
    ),
    false,
    `${testCase.id} should keep Cognitive Dimensions as report-only evidence, not a score axis`,
  );
}

const repairLoopCases = mcpCases.filter((testCase) => testCase.repair_loop);
assert.deepEqual(
  repairLoopCases.map((testCase) => testCase.id),
  [
    "raw-form-controls-implementation",
    "missing-accessibility-evidence",
    "modal-action-order-review",
    "implementation-term-leakage-review",
  ],
);

for (const testCase of repairLoopCases) {
  assert.equal(testCase.case_type, "implementation_review");
  assert.equal(testCase.repair_loop.max_attempts, 3);
  assert.ok(testCase.repair_loop.attempts.length >= 2);
  assert.ok(["accept", "stop_for_human"].includes(testCase.repair_loop.expected_final_action));
  for (const attempt of testCase.repair_loop.attempts) {
    assert.equal(typeof attempt.candidate, "object");
    assert.equal(Array.isArray(attempt.candidate), false);
  }
}

const visualTokenProofCases = mcpCases.filter((testCase) => testCase.visual_token_adapter_proof);
assert.deepEqual(
  visualTokenProofCases.map((testCase) => [
    testCase.id,
    testCase.visual_token_adapter_proof.proof_type,
  ]),
  [
    ["visual-token-valid-metadata-review", "valid_metadata"],
    ["visual-token-unsupported-family-review", "unsupported_family"],
    ["visual-token-accessibility-bypass-review", "cannot_bypass_accessibility"],
    ["visual-token-renderer-boundary-review", "renderer_boundary"],
  ],
);

for (const testCase of visualTokenProofCases) {
  assert.equal(testCase.case_type, "implementation_review");
  assert.ok(testCase.expected_mcp_tools.includes("review_ui_implementation_candidate"));
  assert.ok(["passed", "failed"].includes(testCase.visual_token_adapter_proof.expected_review_status));
  assert.ok(["pass", "fail"].includes(testCase.visual_token_adapter_proof.expected_visual_token_status));
  assert.ok(
    ["accept", "repair_and_resubmit"].includes(
      testCase.visual_token_adapter_proof.expected_next_agent_action,
    ),
  );
}

assert.equal(REQUIRED_MCP_VERSION, "0.8.0");

function allRequiredTerms(testCase) {
  return [
    ...Object.values(testCase.required_terms).flat(),
    testCase.expected_next_action,
    ...testCase.required_handoff_fields,
  ].join(" ");
}

function savedCapture(testCase, variantId) {
  const modelConfig = MODEL_CONFIGS[CODEX_MODEL_CONFIG_ID];
  const guided = variantId === "judgmentkit_mcp";
  const response = `${allRequiredTerms(testCase)}. Grounded in the source brief with a concise handoff.`;
  return {
    capture_type: "model-output-transcript",
    case_id: testCase.id,
    variant_id: variantId,
    treatment: variantId,
    mcp_version: REQUIRED_MCP_VERSION,
    mcp_url: guided ? "http://127.0.0.1:12345/mcp" : null,
    mcp_metadata_sha256: guided ? "local-mcp-metadata-sha" : null,
    mcp_tool_sequence: guided ? testCase.expected_mcp_tools : [],
    mcp_tool_transcript_sha256: guided ? `${testCase.id}-tool-transcript-sha` : null,
    model_config_id: modelConfig.id,
    provider: modelConfig.provider,
    runtime: modelConfig.provider,
    local: modelConfig.local,
    model: modelConfig.model,
    duration_ms: 321,
    output_valid: true,
    parse_error: null,
    usage: { input_tokens: 100, output_tokens: 75 },
    raw_response_sha256: `${testCase.id}-${variantId}-raw-sha`,
    prompt_sha256: `${testCase.id}-${variantId}-prompt-sha`,
    mcp_context_sha256: guided ? `${testCase.id}-mcp-context-sha` : null,
    raw_response: JSON.stringify({ response }),
    parsed: {
      response,
      next_action: testCase.expected_next_action,
      questions: [],
      handoff: Object.fromEntries(
        testCase.required_handoff_fields.map((field) => [
          field.replace(/\s+/g, "_"),
          field,
        ]),
      ),
      rationale: "Source-grounded saved-capture metadata check.",
    },
  };
}

const captureHygieneCase = caseById(
  mcpCases,
  "refund-schema-admin-translation",
  "evals/mcp-pilot-cases.json",
);
const captureHygieneResult = scoreCase(
  captureHygieneCase,
  {
    baseline_no_mcp: savedCapture(captureHygieneCase, "baseline_no_mcp"),
    judgmentkit_mcp: savedCapture(captureHygieneCase, "judgmentkit_mcp"),
  },
  MODEL_CONFIGS[CODEX_MODEL_CONFIG_ID],
);

assert.equal(captureHygieneResult.status, "evaluated");
assert.equal(captureHygieneResult.variants.length, 2);

for (const variant of captureHygieneResult.variants) {
  assert.equal(variant.capture.capture_file, path.join(
    `mcp-${REQUIRED_MCP_VERSION}`,
    CODEX_MODEL_CONFIG_ID,
    captureHygieneCase.id,
    `${variant.id}.json`,
  ));
  assert.equal(variant.capture.mcp_version, REQUIRED_MCP_VERSION);
  assert.equal(variant.capture.model_config_id, CODEX_MODEL_CONFIG_ID);
  assert.equal(variant.capture.provider, MODEL_CONFIGS[CODEX_MODEL_CONFIG_ID].provider);
  assert.equal(typeof variant.capture.raw_response_sha256, "string");
  assert.equal(typeof variant.capture.prompt_sha256, "string");
  assert.equal(variant.capture.output_valid, true);

  if (variant.id === "judgmentkit_mcp") {
    assert.deepEqual(variant.capture.mcp_tool_sequence, captureHygieneCase.expected_mcp_tools);
    assert.equal(typeof variant.capture.mcp_metadata_sha256, "string");
    assert.equal(typeof variant.capture.mcp_tool_transcript_sha256, "string");
    assert.equal(typeof variant.capture.mcp_context_sha256, "string");
  } else {
    assert.deepEqual(variant.capture.mcp_tool_sequence, []);
    assert.equal(variant.capture.mcp_context_sha256, null);
  }
}

for (const run of (mcpPilotCatalog.runs ?? []).filter(
  (candidate) => candidate.mcp_release === REQUIRED_MCP_VERSION,
)) {
  const assessment = mcpPilotPublicationAssessment(run.summary ?? {});
  assert.deepEqual(run.summary?.publish_blockers, assessment.publish_blockers);
  assert.equal(run.summary?.publishable, assessment.publishable);
  assert.equal(run.summary?.publishability_status, assessment.publishability_status);

  if (!run.summary?.publishable) {
    assert.ok(
      run.summary.publish_blockers.length > 0,
      `${run.run_path} should name publishability blockers`,
    );
  }
}

if (mcpPilotCatalog.latest?.mcp_release === REQUIRED_MCP_VERSION) {
  const latest = mcpPilotCatalog.latest;
  const latestReport = readJson(path.join("evals/reports/mcp-pilot", latest.json_report));
  const latestHtml = readText(path.join("evals/reports/mcp-pilot", latest.html_report));

  assert.equal(latestReport.summary.publishable, false);
  assert.equal(latestReport.summary.publishability_status, "not-publishable");
  assert.ok(latestReport.summary.publish_blockers.includes("pilot-status-failed"));
  assert.ok(latestReport.summary.publish_blockers.includes("failed-cases"));
  assert.ok(latestReport.summary.publish_blockers.includes("baseline-wins"));
  assert.ok(latestReport.summary.publish_blockers.includes("ties"));
  assert.ok(latestReport.llm_evidence, "latest MCP pilot should link LLM evidence");
  assert.equal(latestReport.llm_evidence.summary.baseline_preferred > 0, true);
  assert.ok(latest.llm_evidence, "latest MCP pilot catalog entry should link LLM evidence");

  assert.ok(latestHtml.includes("Not publishable as benchmark win"));
  assert.ok(latestHtml.includes("LLM preference evidence attached"));
  assert.ok(latestHtml.includes("Baseline wins"));
  assert.ok(latestHtml.includes("Ties"));
  assert.ok(latestHtml.includes("LLM evidence Markdown"));
}
