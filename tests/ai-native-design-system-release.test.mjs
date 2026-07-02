import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  createUiImplementationContract,
  reviewUiImplementationCandidate,
} from "../src/index.mjs";
import { getMcpMetadata } from "../src/mcp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
    ...options,
  });

  assert.equal(
    result.status,
    0,
    [
      `${command} ${args.join(" ")} failed with status ${result.status}`,
      result.stdout,
      result.stderr,
    ].join("\n"),
  );

  return result;
}

function assertGroupSet(review, expectedGroups, label) {
  const groups = Object.keys(review.repair_instructions.groups ?? {});

  for (const expectedGroup of expectedGroups) {
    assert.ok(
      groups.includes(expectedGroup),
      `${label} should include repair group ${expectedGroup}; got ${groups.join(", ")}`,
    );
  }
}

function assertRepairLoop({ contractInput, failingCandidate, repairedCandidate, expectedGroups, label }) {
  const contractPacket = createUiImplementationContract(contractInput);
  const implementationContract = contractPacket.implementation_contract;

  assert.equal(
    contractPacket.version,
    EXPECTED_RELEASE_VERSION,
    `${label} contract should use release version`,
  );
  assert.equal(implementationContract.iteration_policy.default_max_attempts, 3);
  assert.equal(implementationContract.visual_token_adapter.mode, "boundary_only");
  assert.equal(
    implementationContract.visual_token_adapter.appearance_policy.default_mode,
    "system",
  );
  assert.equal(
    implementationContract.visual_token_adapter.appearance_policy.visible_toggle_default,
    false,
  );
  assert.ok(
    implementationContract.visual_token_adapter.appearance_token_sets.some(
      (entry) =>
        entry.mode === "dark" &&
        entry.css_custom_properties.some(
          (token) => token.name === "--jk-color-surface" && token.value === "#181d1b",
        ),
    ),
  );
  assert.equal(
    implementationContract.visual_token_adapter.deferred_renderer.renderer_package,
    "deferred",
  );

  const failingReview = reviewUiImplementationCandidate(failingCandidate, {
    implementation_contract: implementationContract,
    iteration_context: { current_attempt: 1 },
  });

  assert.equal(
    failingReview.implementation_review_status,
    "failed",
    `${label} first attempt should fail`,
  );
  assert.equal(failingReview.candidate_artifact_status, "not_an_artifact");
  assert.equal(failingReview.next_agent_action, "repair_and_resubmit");
  assert.equal(failingReview.autofix_loop.current_attempt, 1);
  assert.equal(
    failingReview.generation_gates.find((gate) => gate.id === "implementation_gate")
      ?.status,
    "failed",
  );
  assertGroupSet(failingReview, expectedGroups, label);

  const repairedReview = reviewUiImplementationCandidate(repairedCandidate, {
    implementation_contract: implementationContract,
    iteration_context: { current_attempt: 2 },
  });

  assert.equal(
    repairedReview.implementation_review_status,
    "passed",
    `${label} repaired candidate should pass: ${JSON.stringify(repairedReview.findings)}`,
  );
  assert.equal(repairedReview.candidate_artifact_status, "accepted_artifact");
  assert.equal(repairedReview.next_agent_action, "accept");
  assert.equal(repairedReview.autofix_loop.status, "passed");
  assert.deepEqual(repairedReview.findings, []);

  return { failingReview, repairedReview };
}

function withoutDesignSystemProvenance(candidate) {
  const copy = JSON.parse(JSON.stringify(candidate));
  delete copy.design_system_provenance;
  return copy;
}

const packageJson = readJson("package.json");
const activityContract = readJson("contracts/ai-ui-generation.activity-contract.json");
const firstUse = readJson("examples/ai-native-design-system/first-use.json");
const canonicalExamples = readJson("examples/ai-native-design-system/canonical-examples.json");
const EXPECTED_RELEASE_VERSION = packageJson.version;

assert.equal(packageJson.version, "0.6.5");
assert.equal(activityContract.version, EXPECTED_RELEASE_VERSION);
assert.equal(getMcpMetadata("streamable-http").version, EXPECTED_RELEASE_VERSION);
assert.equal(
  activityContract.implementation_contract.visual_token_adapter.appearance_policy.default_mode,
  "system",
);
assert.equal(
  activityContract.implementation_contract.visual_token_adapter.appearance_policy.visible_toggle_default,
  false,
);
assert.ok(
  activityContract.implementation_contract.visual_token_adapter.appearance_token_sets.some(
    (entry) => entry.mode === "dark",
  ),
);

{
  assert.equal(firstUse.release_target, EXPECTED_RELEASE_VERSION);
  assert.equal(firstUse.target_time_minutes, 10);
  assert.ok(firstUse.claim.includes("review a generated UI candidate"));
  assert.equal(firstUse.transcript.length, 2);
  assert.equal(firstUse.transcript[0].expected_next_agent_action, "repair_and_resubmit");
  assert.equal(firstUse.transcript[1].expected_next_agent_action, "accept");

  const { failingReview } = assertRepairLoop({
    contractInput: firstUse.implementation_contract_input,
    failingCandidate: firstUse.failing_candidate,
    repairedCandidate: firstUse.repaired_candidate,
    expectedGroups: ["data_visibility"],
    label: "first-use repair loop",
  });

  assert.ok(
    failingReview.findings.some((finding) => finding.check === "data_visibility"),
    "first-use failure should be product-language leakage, not generic missing evidence",
  );
}

{
  const { failingReview, repairedReview } = assertRepairLoop({
    contractInput: firstUse.implementation_contract_input,
    failingCandidate: withoutDesignSystemProvenance(firstUse.repaired_candidate),
    repairedCandidate: firstUse.repaired_candidate,
    expectedGroups: ["design_system_source"],
    label: "first-use missing design-system provenance",
  });

  assert.ok(
    failingReview.findings.some(
      (finding) => finding.check === "design_system_provenance",
    ),
    "missing provenance failure should be diagnostic-only design-system repair evidence",
  );
  assert.equal(
    failingReview.generation_gates.find((gate) => gate.id === "design_system_gate")
      ?.status,
    "failed",
  );
  assert.equal(repairedReview.design_system_acceptance_status, "passed");
}

{
  assert.equal(canonicalExamples.release_target, EXPECTED_RELEASE_VERSION);
  assert.equal(canonicalExamples.examples.length, 3);
  assert.deepEqual(
    canonicalExamples.examples.map((example) => example.surface),
    [
      "setup/onboarding flow",
      "operational dashboard",
      "high-stakes review/refund workflow",
    ],
  );
  assert.equal(canonicalExamples.renderer_boundary.status, "deferred");
  assert.ok(
    canonicalExamples.renderer_boundary.constraints.some((constraint) =>
      constraint.includes("does not introduce A2UI"),
    ),
  );

  for (const example of canonicalExamples.examples) {
    const result = assertRepairLoop({
      contractInput: example.implementation_contract_input,
      failingCandidate: example.failing_candidate,
      repairedCandidate: example.repaired_candidate,
      expectedGroups: example.expected_failure_groups,
      label: example.id,
    });

    assert.equal(example.proof.expected_attempts_to_pass, 2);
    assert.equal(example.proof.expected_final_action, result.repairedReview.next_agent_action);
  }
}

{
  const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-pack-"));
  const installDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-install-smoke-"));
  const packResult = run("npm", ["pack", "--pack-destination", packDir, "--json"]);
  const [packInfo] = JSON.parse(packResult.stdout);
  const tarballPath = path.join(packDir, packInfo.filename);
  const packedFiles = new Set(packInfo.files.map((file) => file.path));

  assert.equal(packInfo.name, "judgmentkit");
  assert.equal(packInfo.version, EXPECTED_RELEASE_VERSION);
  assert.ok(packedFiles.has("src/index.mjs"));
  assert.ok(packedFiles.has("src/mcp.mjs"));
  assert.ok(packedFiles.has("bin/judgmentkit.mjs"));
  assert.ok(packedFiles.has("examples/ai-native-design-system/first-use.json"));
  assert.ok(packedFiles.has("examples/ai-native-design-system/canonical-examples.json"));

  fs.writeFileSync(
    path.join(installDir, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2),
  );

  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath], {
    cwd: installDir,
  });

  const smokeScript = `
import assert from "node:assert/strict";
import { createUiImplementationContract, reviewUiImplementationCandidate } from "judgmentkit";

const coreAccessibilityEvidence = {
  automated_checks: { status: "pass", method: "axe smoke", notes: "No violations." },
  semantic_content: { status: "pass", method: "manual DOM inspection", notes: "Semantic regions are present." },
  landmarks_headings: { status: "pass", method: "outline inspection", notes: "Headings support orientation." },
  name_role_value: { status: "pass", method: "accessibility tree inspection", notes: "Controls expose names, roles, and values." },
  keyboard_navigation: { status: "pass", method: "keyboard pass", notes: "Controls can be reached and activated by keyboard." },
  focus_order: { status: "pass", method: "tab order inspection", notes: "Focus follows task order." },
  focus_visible: { status: "pass", method: "browser focus inspection", notes: "Focus remains visible." },
  responsive_no_overflow: { status: "pass", method: "390px viewport check", notes: "Text wraps without horizontal overflow." },
  non_text_contrast: { status: "pass", method: "computed contrast review", notes: "Control boundaries and state indicators meet non-text contrast." },
  semantic_fallbacks: { status: "pass", method: "DOM inspection", notes: "Semantic HTML provides fallback structure for rendered content." }
};

const defaultDesignSystemProvenance = {
  source: "judgmentkit_default",
  token_source: "/design-system/visual-token-adapter.json",
  typography_source: "/design-system/visual-token-adapter.json",
  icon_source: "JudgmentKit icon catalog via get_icon_svg",
  renderer_component_source: "implementation_contract.default_ai_native_design_system.component_contracts",
  import_boundary: "No visual, typography, icon, or component package imports outside the active design-system source.",
  token_prefix_source: "implementation_contract.design_system_source.token_prefixes",
  source_exports: "implementation_contract.design_system_source.source_exports"
};

const contractPacket = createUiImplementationContract({
  repo_name: "package-smoke",
  target_stack: "static HTML",
  approved_primitives: ["FieldGrid"],
  static_rules: ["npm test"],
  browser_qa_checks: ["desktop viewport screenshot", "mobile viewport screenshot"]
});

const expectedVersion = ${JSON.stringify(EXPECTED_RELEASE_VERSION)};

assert.equal(contractPacket.version, expectedVersion);
assert.equal(contractPacket.implementation_contract.iteration_policy.default_max_attempts, 3);
assert.equal(contractPacket.implementation_contract.visual_token_adapter.mode, "boundary_only");
assert.equal(
  contractPacket.implementation_contract.visual_token_adapter.appearance_policy.default_mode,
  "system",
);
assert.equal(
  contractPacket.implementation_contract.visual_token_adapter.appearance_policy.visible_toggle_default,
  false,
);
assert.ok(
  contractPacket.implementation_contract.visual_token_adapter.appearance_token_sets.some(
    (entry) => entry.mode === "dark",
  ),
);

const failing = reviewUiImplementationCandidate({
  code: "renderReviewSummary({ FieldGrid })",
  primitives_used: ["FieldGrid"],
  states_covered: ["empty", "ready", "loading", "error", "disabled", "focus-visible"],
  static_checks: ["npm test"],
  browser_qa: { desktop: "checked", mobile: "checked" },
  accessibility_evidence: coreAccessibilityEvidence,
  design_system_provenance: defaultDesignSystemProvenance,
  visible_text: ["JSON schema", "Ready to review"],
  data_visibility_evidence: { primary_data_roles: ["completion result or handoff receipt"] }
}, {
  implementation_contract: contractPacket.implementation_contract,
  iteration_context: { current_attempt: 1 }
});

assert.equal(failing.next_agent_action, "repair_and_resubmit");
assert.ok(failing.repair_instructions.groups.data_visibility.length > 0);

const repaired = reviewUiImplementationCandidate({
  code: "renderReviewSummary({ FieldGrid })",
  primitives_used: ["FieldGrid"],
  states_covered: ["empty", "ready", "loading", "error", "disabled", "focus-visible"],
  static_checks: ["npm test"],
  browser_qa: { desktop: "checked", mobile: "checked" },
  accessibility_evidence: coreAccessibilityEvidence,
  design_system_provenance: defaultDesignSystemProvenance,
  visible_text: ["Ready to review", "Handoff receipt"],
  data_visibility_evidence: { primary_data_roles: ["completion result or handoff receipt"] }
}, {
  implementation_contract: contractPacket.implementation_contract,
  iteration_context: { current_attempt: 2 }
});

assert.equal(repaired.next_agent_action, "accept");
assert.equal(repaired.implementation_review_status, "passed");
`;

  fs.writeFileSync(path.join(installDir, "smoke.mjs"), smokeScript);
  run(process.execPath, ["smoke.mjs"], { cwd: installDir });
}

console.log("AI-native design system release checks passed.");
