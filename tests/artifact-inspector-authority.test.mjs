import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {
  JudgmentKitInputError,
  createUiImplementationContract,
  reviewUiImplementationCandidate,
} from "../src/index.mjs";

import {
  ARTIFACT_INSPECTOR_CANONICAL_BOUNDARY_CONTRACTS,
  ARTIFACT_INSPECTOR_CANONICAL_SCOPES,
  ARTIFACT_INSPECTOR_CANONICAL_STATE_GROUPS,
  ARTIFACT_INSPECTOR_DIAGNOSTIC_CODES,
  ARTIFACT_INSPECTOR_SCOPE_IDS,
  ARTIFACT_INSPECTOR_STATE_GROUP_IDS,
  createArtifactInspectorFinding,
  normalizeArtifactInspectorBoundaryContracts,
  normalizeArtifactInspectorScopes,
  normalizeArtifactInspectorStateConfig,
  reviewArtifactInspectorAuthorityEvidence,
  validateArtifactInspectorAuthorityContract,
} from "../src/artifact-inspector-authority.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const contract = JSON.parse(
  fs.readFileSync(
    path.join(root, "contracts/ai-ui-generation.activity-contract.json"),
    "utf8",
  ),
);
const schema = JSON.parse(
  fs.readFileSync(
    path.join(root, "contracts/judgmentkit-kernel.schema.json"),
    "utf8",
  ),
);
const model = contract.interaction_models.artifact_inspector;
const ajv = new Ajv2020({ allErrors: true });
const validateKernelContract = ajv.compile(schema);

const EXPECTED_COMPONENT_ROLES = [
  "ArtifactViewport",
  "ArtifactBoundary",
  "ArtifactStatus",
  "ObservationMarker",
  "LocusSelection",
  "ContextAnchor",
  "AuthorityAnchor",
  "AnchorRail",
  "RelationPreview",
  "RelationConnector",
  "InlineReason",
  "ContextTray",
  "CommitBoundary",
  "ReceiptMarker",
  "BackAction",
  "ResetAction",
  "ZoomAndPanControls",
];

function canonicalArtifactImplementationContract() {
  return {
    design_system_scopes: structuredClone(model.design_system.scopes),
    boundary_contracts: structuredClone(
      model.design_system.boundary_contracts,
    ),
    artifact_inspector: {
      registry_id: model.id,
      registry_version: model.version,
      ...structuredClone(model.canonical_identifiers),
      active_state_groups: ["core"],
      state_groups: structuredClone(model.state_groups),
      trusted_runtime_evidence_required: true,
      external_artifact_review_status: "external_not_reviewed",
    },
  };
}

function contractWithArtifactImplementation() {
  const candidate = structuredClone(contract);
  Object.assign(
    candidate.implementation_contract,
    canonicalArtifactImplementationContract(),
  );
  return candidate;
}

function completeExternalDesignSystemAdapter() {
  return {
    design_system_name: "Material UI",
    design_system_package: "@mui/material",
    token_guidance: {
      token_families: ["color", "type", "spacing", "radius"],
      token_roles: [
        {
          role: "surface",
          families: ["color"],
          usage: "Material UI surface colors",
        },
        {
          role: "decision",
          families: ["color"],
          usage: "Material UI action states",
        },
      ],
      css_custom_properties: [
        {
          name: "--mui-palette-background-paper",
          role: "surface",
          family: "color",
          value: "theme.palette.background.paper",
          usage: "Material UI surfaces",
        },
        {
          name: "--mui-font-family",
          role: "text",
          family: "type",
          value: "theme.typography.fontFamily",
          usage: "Material UI typography",
        },
      ],
    },
    font_guidance: {
      font_roles: {
        body: {
          stack: "var(--mui-font-family)",
          usage: "Material UI body typography",
        },
        heading: {
          stack: "var(--mui-font-family)",
          usage: "Material UI headings",
        },
      },
    },
    icon_guidance: {
      icon_roles: ["status", "action"],
      icon_catalog: {
        source: "external_design_system",
        library: "mui-icons-material",
        package: "@mui/icons-material",
        version: "repo-approved",
        icon_count: 2000,
        license: "MIT",
        notice: "Repo-approved Material UI icon adapter.",
        mcp_tools: [],
      },
    },
    components: ["Stack", "Button", "Alert"],
  };
}

function passingEvidence(method = "inspection") {
  return {
    status: "pass",
    method,
    notes: "Verified.",
  };
}

function artifactImplementationCandidate(implementationContract) {
  const activeArtifactStates = implementationContract.artifact_inspector
    .active_state_groups.flatMap(
      (groupId) =>
        implementationContract.artifact_inspector.state_groups[groupId],
  );
  return {
    code: `
      <section data-jk-scope="inspector-chrome"><button type="button">Back</button></section>
      <div data-jk-scope="inspection-overlay" role="status">Selected locus</div>
      <div data-artifact-root><input name="external-inline-title" /></div>
      <style>[data-jk-scope='inspector-chrome'] { color: var(--jk-color-text); }</style>
      <style>[data-artifact-root] input { --mui-color-primary: red; color: var(--mui-color-primary); }</style>
    `,
    primary_artifact: {
      code: 'import { TextField } from "@mui/material";',
      markup:
        '<form data-artifact-root><input name="external-title" /></form>',
      css: "[data-artifact-root] { --artifact-brand: rebeccapurple; color: var(--artifact-brand); }",
    },
    primitives_used: [],
    states_covered: [
      ...implementationContract.state_coverage.required_states,
      ...activeArtifactStates,
    ],
    static_checks: ["npm run check"],
    browser_qa: {
      desktop: "desktop viewport checked",
      mobile: "mobile viewport checked",
    },
    accessibility_evidence: {
      automated_checks: passingEvidence(),
      semantic_content: passingEvidence(),
      landmarks_headings: passingEvidence(),
      name_role_value: passingEvidence(),
      keyboard_navigation: passingEvidence(),
      focus_order: passingEvidence(),
      focus_visible: passingEvidence(),
      responsive_no_overflow: passingEvidence(),
      semantic_fallbacks: passingEvidence(),
      non_text_contrast: {
        status: "pass",
        method: "computed style inspection",
        samples: [{ target: "selection boundary", contrast_ratio: 3.2 }],
      },
      forced_colors: {
        status: "pass",
        method: "forced-colors emulation",
        notes:
          "Owned chrome, overlays, focus indicators, and state labels remain visible.",
      },
      form_labels_instructions: passingEvidence(),
      form_errors: passingEvidence(),
      status_messages: passingEvidence(),
    },
    design_system_provenance: {
      source: "judgmentkit_default",
      token_source: "/design-system/visual-token-adapter.json",
      typography_source: "/design-system/visual-token-adapter.json",
      icon_source: "JudgmentKit icon catalog via get_icon_svg",
      renderer_component_source:
        "implementation_contract.default_ai_native_design_system.component_contracts",
      import_boundary:
        "No visual, typography, icon, or component package imports outside the active design-system source.",
      token_prefix_source:
        "implementation_contract.design_system_source.token_prefixes",
      source_exports:
        "implementation_contract.design_system_source.source_exports",
    },
    pattern_contract_evidence: {
      pattern_id: "artifact-inspector",
      surface_type: "artifact_inspector",
      regions_present: [
        "persistent rendered artifact",
        "selectable artifact loci",
        "locus-relative context",
        "artifact-local feedback",
        "artifact-local completion or recovery",
      ],
      controls_present: [
        "locus selection",
        "context disclosure",
        "preview and validation",
        "Back or reset",
        "commit and receipt when consequential",
      ],
      completion_or_handoff:
        "participant verifies the result on or immediately beside the artifact locus",
    },
    artifact_inspector_runtime_evidence: structuredClone(trustedReceipt),
  };
}

function assertInvalidKernelContract(value, message) {
  assert.equal(validateKernelContract(value), false, message);
  assert.ok(
    (validateKernelContract.errors ?? []).length > 0,
    `${message}: schema errors must be available.`,
  );
}

assert.equal(validateKernelContract(contract), true, ajv.errorsText(validateKernelContract.errors));
assert.deepEqual(model.canonical_identifiers, {
  surface_type: "artifact_inspector",
  workflow_profile: "artifact-inspector-ui",
  frontend_surface_profile: "judgmentkit.artifact-inspector.v1",
  topology_kind: "artifact_centered",
});
assert.deepEqual(model.activity_evidence.mandatory, [
  "rendered_artifact_is_primary",
  "locus_selection_required",
  "support_context_is_locus_relative",
]);
assert.deepEqual(model.activity_evidence.positive.slice(0, 3), model.activity_evidence.mandatory);
assert.deepEqual(model.activity_evidence.exclusions, [
  "queue_or_case_is_primary",
  "many_items_are_primary",
  "open_ended_creation_is_primary",
  "conversation_turns_are_primary",
  "linear_reading_is_completion",
  "monitoring_is_completion",
  "configuration_is_completion",
]);
assert.equal(model.topology.kind, "artifact_centered");
assert.equal(model.topology.primary_object_id, "artifact");
assert.deepEqual(model.work_units.map((entry) => entry.id), [
  "orient",
  "select_locus",
  "inspect_context",
  "preview",
  "validate",
  "complete",
  "verify_result",
  "recover",
]);
assert.deepEqual(Object.keys(model.state_groups), ARTIFACT_INSPECTOR_STATE_GROUP_IDS);
assert.deepEqual(model.design_system.component_roles, EXPECTED_COMPONENT_ROLES);
assert.deepEqual(
  model.design_system.scopes.map((entry) => entry.scope_id),
  ARTIFACT_INSPECTOR_SCOPE_IDS,
);
assert.deepEqual(
  model.diagnostics.map((entry) => entry.code),
  ARTIFACT_INSPECTOR_DIAGNOSTIC_CODES,
);

const artifactComponentIds = new Set(
  contract.implementation_contract.default_ai_native_design_system
    .component_contracts.map((entry) => entry.id),
);
for (const componentRole of EXPECTED_COMPONENT_ROLES) {
  assert.ok(
    artifactComponentIds.has(componentRole),
    `Missing semantic component contract ${componentRole}.`,
  );
}
const artifactPattern =
  contract.implementation_contract.default_ai_native_design_system
    .pattern_contracts.find((entry) => entry.id === "artifact-inspector");
assert.equal(artifactPattern.surface_type, "artifact_inspector");
assert.ok(
  artifactPattern.failure_signals.some((entry) =>
    entry.includes("external artifact authority"),
  ),
);
assert.equal(
  contract.implementation_contract.design_system_scopes,
  undefined,
  "Mixed authority must be opt-in for Artifact Inspector, not a new global default.",
);
assert.equal(
  contract.implementation_contract.design_system_source.mode,
  "judgmentkit_default",
  "The established whole-candidate design-system source must remain unchanged.",
);

{
  const augmented = contractWithArtifactImplementation();
  assert.equal(
    validateKernelContract(augmented),
    true,
    ajv.errorsText(validateKernelContract.errors),
  );
}

{
  const missingRegistry = structuredClone(contract);
  delete missingRegistry.interaction_models.artifact_inspector;
  assertInvalidKernelContract(
    missingRegistry,
    "The Artifact Inspector registry entry is required by this contract version.",
  );

  const registryWithUnknownField = structuredClone(contract);
  registryWithUnknownField.interaction_models.artifact_inspector.untrusted_extension = true;
  assertInvalidKernelContract(
    registryWithUnknownField,
    "The Artifact Inspector registry must remain strict.",
  );

  const partialAuthority = structuredClone(contract);
  partialAuthority.implementation_contract.design_system_scopes =
    structuredClone(model.design_system.scopes);
  assertInvalidKernelContract(
    partialAuthority,
    "Partial authority declarations must fail closed.",
  );

  const wrongArtifactAuthority = contractWithArtifactImplementation();
  wrongArtifactAuthority.implementation_contract.design_system_scopes.find(
    (entry) => entry.scope_id === "primary_artifact",
  ).authority = "judgmentkit_default";
  assertInvalidKernelContract(
    wrongArtifactAuthority,
    "The primary artifact cannot be claimed by JudgmentKit.",
  );

  const globalExternalAuthority = contractWithArtifactImplementation();
  globalExternalAuthority.implementation_contract.design_system_source.mode =
    "external_design_system";
  assertInvalidKernelContract(
    globalExternalAuthority,
    "Artifact Inspector chrome and overlays cannot inherit a global external design-system authority.",
  );

  const externalOverclaim = contractWithArtifactImplementation();
  externalOverclaim.implementation_contract.artifact_inspector
    .external_artifact_review_status = "passed";
  assertInvalidKernelContract(
    externalOverclaim,
    "The schema must reject whole-artifact conformance overclaims.",
  );
}

const canonicalAuthority = canonicalArtifactImplementationContract();
const normalizedAuthority = validateArtifactInspectorAuthorityContract(
  canonicalAuthority,
);
assert.equal(normalizedAuthority.active, true);
assert.deepEqual(
  normalizedAuthority.design_system_scopes,
  ARTIFACT_INSPECTOR_CANONICAL_SCOPES,
);
assert.deepEqual(
  normalizedAuthority.boundary_contracts,
  ARTIFACT_INSPECTOR_CANONICAL_BOUNDARY_CONTRACTS,
);
assert.equal(
  normalizedAuthority.artifact_inspector.external_artifact_review_status,
  "external_not_reviewed",
);
assert.deepEqual(
  validateArtifactInspectorAuthorityContract({}),
  {
    active: false,
    design_system_scopes: [],
    boundary_contracts: [],
    artifact_inspector: null,
  },
  "Legacy implementation contracts must remain not applicable.",
);

assert.deepEqual(
  normalizeArtifactInspectorScopes(model.design_system.scopes, {
    required: true,
  }),
  model.design_system.scopes,
);
assert.deepEqual(
  normalizeArtifactInspectorBoundaryContracts(
    model.design_system.boundary_contracts,
    {
      scopes: model.design_system.scopes,
      required: true,
    },
  ),
  model.design_system.boundary_contracts,
);
assert.deepEqual(
  normalizeArtifactInspectorStateConfig(
    {
      active_state_groups: ["core"],
      state_groups: model.state_groups,
    },
    { required: true },
  ),
  {
    active_state_groups: ["core"],
    state_groups: ARTIFACT_INSPECTOR_CANONICAL_STATE_GROUPS,
  },
);

assert.throws(
  () =>
    validateArtifactInspectorAuthorityContract({
      design_system_scopes: model.design_system.scopes,
    }),
  (error) => {
    assert.equal(error.code, "invalid_artifact_inspector_authority_contract");
    assert.deepEqual(error.details.missing, [
      "boundary_contracts",
      "artifact_inspector",
    ]);
    return true;
  },
);
assert.throws(
  () =>
    normalizeArtifactInspectorScopes(
      model.design_system.scopes.filter(
        (entry) => entry.scope_id !== "primary_artifact",
      ),
      { required: true },
    ),
  (error) => {
    assert.equal(
      error.details.diagnostic_code,
      "JK_ARTIFACT_INSPECTOR_ARTIFACT_SCOPE_MISSING",
    );
    assert.equal(error.details.field, "design_system_scopes");
    return true;
  },
);

{
  const packet = createUiImplementationContract({
    surface_type: "artifact_inspector",
  });
  const implementationContract = packet.implementation_contract;

  assert.equal(packet.implementation_contract_status, "ready");
  assert.equal(packet.source.surface_type, "artifact_inspector");
  assert.deepEqual(
    implementationContract.design_system_scopes,
    ARTIFACT_INSPECTOR_CANONICAL_SCOPES,
  );
  assert.deepEqual(
    implementationContract.boundary_contracts,
    ARTIFACT_INSPECTOR_CANONICAL_BOUNDARY_CONTRACTS,
  );
  assert.equal(
    implementationContract.artifact_inspector.frontend_surface_profile,
    "judgmentkit.artifact-inspector.v1",
  );
  assert.equal(
    implementationContract.artifact_inspector.external_artifact_review_status,
    "external_not_reviewed",
  );
  assert.equal(
    implementationContract.design_system_source.mode,
    contract.implementation_contract.design_system_source.mode,
    "Scoped authority must not replace the existing whole-candidate authority model.",
  );
  assert.ok(
    packet.generation_gates.some(
      (gate) =>
        gate.id === "artifact_inspector_authority_gate" &&
        gate.status === "trusted_runtime_evidence_required",
    ),
  );

  const legacyPacket = createUiImplementationContract({
    surface_type: "workbench",
  });
  assert.equal(
    "design_system_scopes" in legacyPacket.implementation_contract,
    false,
  );
  assert.equal(
    "artifact_inspector" in legacyPacket.implementation_contract,
    false,
  );

  assert.throws(
    () =>
      createUiImplementationContract({
        surface_type: "workbench",
        design_system_scopes: model.design_system.scopes,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      return true;
    },
  );

  const legacyContractWithoutArtifactInspector = structuredClone(contract);
  delete legacyContractWithoutArtifactInspector.interaction_models
    .artifact_inspector;
  assert.throws(
    () =>
      createUiImplementationContract(
        { surface_type: "artifact_inspector" },
        { contract: legacyContractWithoutArtifactInspector },
      ),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "artifact_inspector_profile_unsupported");
      assert.equal(error.details.fallback_applied, false);
      return true;
    },
    "Older contracts must receive an explicit unsupported-profile diagnostic before generic surface validation.",
  );
}

{
  const review = reviewArtifactInspectorAuthorityEvidence(canonicalAuthority);
  assert.equal(review.status, "review_required");
  assert.equal(review.applicable, true);
  assert.equal(review.design_system_review.inspector_chrome, "review_required");
  assert.equal(review.design_system_review.inspection_overlay, "review_required");
  assert.equal(review.design_system_review.primary_artifact, "external_not_reviewed");
  assert.equal(review.trusted_runtime_evidence.status, "missing");
  assert.deepEqual(review.findings.map((entry) => entry.code), [
    "JK_ARTIFACT_INSPECTOR_TRUSTED_RUNTIME_EVIDENCE_MISSING",
  ]);
  assert.equal(
    review.findings[0].evidence.candidate_authored_evidence_accepted,
    false,
  );
}

const trustedReceipt = {
  issuer: "judgmentkit_browser_runtime",
  status: "pass",
  scope_results: {
    inspector_chrome: { status: "pass" },
    inspection_overlay: { status: "pass" },
    primary_artifact: {
      status: "external_not_reviewed",
      artifact_preservation: "pass",
    },
  },
  boundary_results: [
    {
      from_scope: "inspection_overlay",
      to_scope: "primary_artifact",
      status: "pass",
    },
  ],
};

{
  const legacyContractWithoutVisualComposition = structuredClone(contract);
  delete legacyContractWithoutVisualComposition.implementation_contract
    .visual_composition_policy;
  delete legacyContractWithoutVisualComposition.implementation_contract
    .visual_composition_policy_authority;
  const implementationContract = createUiImplementationContract(
    { surface_type: "artifact_inspector" },
    { contract: legacyContractWithoutVisualComposition },
  ).implementation_contract;
  const candidate = artifactImplementationCandidate(implementationContract);
  const review = reviewUiImplementationCandidate(candidate, {
    contract: legacyContractWithoutVisualComposition,
    implementation_contract: implementationContract,
    surface_type: "artifact_inspector",
  });

  assert.equal(
    review.implementation_review_status,
    "review_required",
    JSON.stringify(review.findings),
  );
  assert.equal(review.candidate_artifact_status, "not_an_artifact");
  assert.equal(review.design_system_acceptance_status, "review_required");
  assert.equal(review.next_agent_action, "run_trusted_runtime_review");
  assert.equal(review.checks.design_system_provenance.status, "pass");
  assert.equal(review.checks.pattern_contracts.status, "pass");
  assert.equal(review.checks.accessibility_evidence.status, "pass");
  assert.equal(
    review.checks.raw_controls.status,
    "pass",
    "Raw controls owned by the declared external artifact are outside JudgmentKit primitive enforcement.",
  );
  assert.equal(
    review.checks.design_system_provenance.status,
    "pass",
    "External artifact imports and tokens are outside the JudgmentKit-owned provenance scan.",
  );
  assert.equal(review.checks.artifact_inspector.status, "review_required");
  assert.equal(
    review.checks.artifact_inspector.design_system_review.primary_artifact,
    "external_not_reviewed",
  );
  assert.deepEqual(review.findings.map((entry) => entry.code), [
    "JK_ARTIFACT_INSPECTOR_TRUSTED_RUNTIME_EVIDENCE_MISSING",
  ]);
  assert.equal(
    review.checks.artifact_inspector.findings[0].evidence
      .candidate_authored_evidence_accepted,
    false,
    "A candidate-authored trusted-looking receipt must be ignored.",
  );
  assert.ok(
    review.generation_gates.some(
      (gate) =>
        gate.id === "artifact_inspector_authority_gate" &&
        gate.status === "review_required",
    ),
  );

  const chromeRawControlCandidate = artifactImplementationCandidate(
    implementationContract,
  );
  chromeRawControlCandidate.code =
    '<section data-jk-scope="inspector-chrome"><input name="chrome-filter" /></section>';
  const chromeRawControlReview = reviewUiImplementationCandidate(
    chromeRawControlCandidate,
    {
      contract: legacyContractWithoutVisualComposition,
      implementation_contract: implementationContract,
      surface_type: "artifact_inspector",
    },
  );
  assert.equal(
    chromeRawControlReview.checks.raw_controls.status,
    "fail",
    "JudgmentKit-owned chrome must remain subject to primitive enforcement.",
  );
  assert.deepEqual(chromeRawControlReview.checks.raw_controls.detected, [
    "input",
  ]);

  const escapingArtifactSelectorCandidate = artifactImplementationCandidate(
    implementationContract,
  );
  escapingArtifactSelectorCandidate.code += `
    <style>
      [data-artifact-root] ~ [data-jk-scope='inspector-chrome'] {
        --mui-color-primary: red;
        color: var(--mui-color-primary);
      }
    </style>
  `;
  const escapingArtifactSelectorReview = reviewUiImplementationCandidate(
    escapingArtifactSelectorCandidate,
    {
      contract: legacyContractWithoutVisualComposition,
      implementation_contract: implementationContract,
      surface_type: "artifact_inspector",
    },
  );
  assert.equal(
    escapingArtifactSelectorReview.checks.design_system_provenance.status,
    "fail",
    "A selector that escapes the artifact root through a sibling combinator must remain inside the JudgmentKit provenance scan.",
  );
  assert.ok(
    escapingArtifactSelectorReview.checks.design_system_provenance
      .detected_visual_tokens.includes("--mui-color-primary"),
  );

  const genericStatesOnlyCandidate = artifactImplementationCandidate(
    implementationContract,
  );
  genericStatesOnlyCandidate.states_covered =
    implementationContract.state_coverage.required_states;
  const genericStatesOnlyReview = reviewUiImplementationCandidate(
    genericStatesOnlyCandidate,
    {
      contract: legacyContractWithoutVisualComposition,
      implementation_contract: implementationContract,
      surface_type: "artifact_inspector",
    },
  );
  assert.equal(genericStatesOnlyReview.checks.state_coverage.status, "fail");
  assert.deepEqual(
    genericStatesOnlyReview.checks.state_coverage.missing,
    implementationContract.artifact_inspector.state_groups.core,
    "Every state in each active Artifact Inspector state group must be implementation-review evidence, not metadata only.",
  );

  assert.throws(
    () =>
      createUiImplementationContract({
        surface_type: "artifact_inspector",
        design_system_adapter: completeExternalDesignSystemAdapter(),
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(error.details.field, "design_system_source.mode");
      assert.equal(error.details.expected, "judgmentkit_default");
      assert.equal(error.details.observed, "external_design_system");
      assert.equal(error.details.external_artifact_scope, "primary_artifact");
      return true;
    },
  );
}

{
  const untrustedReceipt = structuredClone(trustedReceipt);
  untrustedReceipt.issuer = "candidate_authored";
  const review = reviewArtifactInspectorAuthorityEvidence(canonicalAuthority, {
    trustedRuntimeEvidence: untrustedReceipt,
  });
  assert.equal(review.status, "review_required");
  assert.ok(
    review.findings.some(
      (entry) =>
        entry.code ===
          "JK_ARTIFACT_INSPECTOR_TRUSTED_RUNTIME_EVIDENCE_MISSING" &&
        entry.evidence.field === "trusted_runtime_evidence.issuer",
    ),
  );
}

{
  const review = reviewArtifactInspectorAuthorityEvidence(canonicalAuthority, {
    trustedRuntimeEvidence: trustedReceipt,
  });
  assert.equal(review.status, "passed_with_external_artifact_authority");
  assert.deepEqual(review.design_system_review, {
    inspector_chrome: "passed",
    inspection_overlay: "passed",
    primary_artifact: "external_not_reviewed",
    boundary_contract: "passed",
  });
  assert.equal(review.trusted_runtime_evidence.artifact_preservation, "passed");
  assert.deepEqual(review.findings, []);
}

{
  const overclaimReceipt = structuredClone(trustedReceipt);
  overclaimReceipt.scope_results.primary_artifact.status = "pass";
  const review = reviewArtifactInspectorAuthorityEvidence(canonicalAuthority, {
    trustedRuntimeEvidence: overclaimReceipt,
  });
  assert.equal(review.status, "fail");
  assert.equal(
    review.design_system_review.primary_artifact,
    "failed_external_authority_overclaim",
  );
  assert.ok(
    review.findings.some(
      (entry) =>
        entry.code ===
        "JK_ARTIFACT_INSPECTOR_EXTERNAL_AUTHORITY_OVERCLAIM",
    ),
  );
}

{
  const mutationReceipt = structuredClone(trustedReceipt);
  mutationReceipt.scope_results.primary_artifact.artifact_preservation = "fail";
  const review = reviewArtifactInspectorAuthorityEvidence(canonicalAuthority, {
    trustedRuntimeEvidence: mutationReceipt,
  });
  assert.equal(review.status, "fail");
  assert.ok(
    review.findings.some(
      (entry) => entry.code === "JK_ARTIFACT_INSPECTOR_ARTIFACT_MUTATED",
    ),
  );
}

const finding = createArtifactInspectorFinding({
  code: "JK_ARTIFACT_INSPECTOR_CONTEXT_DETACHED",
  evidence: {
    field: "[data-jk-scope='inspection-overlay']",
    expected: "semantic relation to active locus",
    observed: "detached panel",
  },
});
assert.equal(finding.severity, "fail");
assert.equal(finding.check, "artifact_inspector_authority");
assert.equal(finding.code, "JK_ARTIFACT_INSPECTOR_CONTEXT_DETACHED");
assert.equal(typeof finding.repair_instruction, "string");
assert.ok(finding.repair_instruction.length > 0);
assert.throws(
  () => createArtifactInspectorFinding({ code: "UNKNOWN_DIAGNOSTIC" }),
  /Unknown Artifact Inspector diagnostic code/,
);

console.log("artifact inspector authority checks passed.");
