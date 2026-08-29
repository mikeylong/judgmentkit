import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  JudgmentKitInputError,
  buildUiWorkflowCandidateRequest,
  createActivityModelReview,
  createFrontendGenerationContext,
  createFrontendImplementationSkillContext,
  createUiGenerationHandoff,
  createUiImplementationContract,
  recommendSurfaceTypes,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const contract = JSON.parse(
  fs.readFileSync(
    path.join(root, "contracts/ai-ui-generation.activity-contract.json"),
    "utf8",
  ),
);
const model = contract.interaction_models.artifact_inspector;

const ARTIFACT_ACTIVITY = `
  An accessibility specialist inspects one rendered interface that remains the
  primary artifact during an accessibility audit. They must select a specific
  control inside the artifact. Evidence and corrective actions attach to that
  selected control. They preview the correction, decide whether it is supported,
  complete the correction, and verify the local result beside the artifact. The
  outcome is a verified local result and a handoff receipt for the accessibility
  team. The artifact retains its own independent visual authority while
  implementation details remain diagnostic.
`;

const activityReview = createActivityModelReview(ARTIFACT_ACTIVITY);
const surfaceReview = recommendSurfaceTypes(ARTIFACT_ACTIVITY, {
  activity_review: activityReview,
});

assert.equal(activityReview.review_status, "ready_for_review");
assert.equal(surfaceReview.status, "ready");
assert.equal(surfaceReview.recommended_surface_type, "artifact_inspector");

function createCandidate() {
  return {
    workflow: {
      surface_name: "Accessibility review",
      topology: structuredClone(model.topology),
      work_units: structuredClone(model.work_units),
      artifact: {
        id: "artifact",
        boundary: "Rendered interface under audit",
      },
      target_model: {
        ...structuredClone(model.target_model),
        artifact_id: "artifact",
      },
      state_groups: {
        core: structuredClone(model.state_groups.core),
      },
      primary_actions: [
        "Select control",
        "Preview correction",
        "Apply correction",
        "Verify result",
        "Back",
      ],
      decision_points: ["Is the correction supported?"],
      completion_state:
        "Verified result is visible beside the selected control.",
    },
    surface_set: [
      {
        name: "Accessibility review",
        purpose: "Inspect the rendered interface in place.",
        sections: [
          "Rendered interface",
          "Control context",
          "Local result",
        ],
        controls: [
          "Select control",
          "Preview correction",
          "Apply correction",
          "Back",
        ],
        relationship_to_workflow:
          "Keeps context and the local result attached to the interface.",
      },
    ],
    handoff: {
      next_owner: "Accessibility team",
      reason: "Correction was verified locally.",
      next_action: "Review the receipt.",
    },
    diagnostics: {
      implementation_terms: [],
      reveal_contexts: ["auditing"],
    },
  };
}

function reviewCandidate(candidate) {
  return reviewUiWorkflowCandidate(ARTIFACT_ACTIVITY, candidate, {
    activity_review: activityReview,
    profile_id: "artifact-inspector-ui",
    surface_review: surfaceReview,
  });
}

const validWorkflowReview = reviewCandidate(createCandidate());

{
  const review = validWorkflowReview;
  const artifactGuardrail = review.guardrails.artifact_inspector;

  assert.equal(review.review_status, "ready_for_review");
  assert.equal(artifactGuardrail.selected, true);
  assert.equal(artifactGuardrail.valid, true);
  assert.deepEqual(artifactGuardrail.diagnostics, []);
  assert.equal(artifactGuardrail.surface_type, "artifact_inspector");
  assert.equal(artifactGuardrail.workflow_profile, "artifact-inspector-ui");
  assert.equal(artifactGuardrail.topology_kind, "artifact_centered");

  assert.equal(review.candidate.workflow.topology, "artifact_centered");
  assert.deepEqual(
    review.candidate.workflow.topology_contract,
    model.topology,
    "The structured candidate topology must remain available beside the compatibility string.",
  );
  assert.deepEqual(
    review.candidate.workflow.work_units.map((entry) => entry.id),
    [
      "orient",
      "select_locus",
      "inspect_context",
      "preview",
      "validate",
      "complete",
      "verify_result",
      "recover",
    ],
  );
  assert.equal(review.candidate.workflow.artifact.id, "artifact");
  assert.equal(
    review.candidate.workflow.target_model.artifact_id,
    "artifact",
  );
  assert.deepEqual(
    review.candidate.workflow.target_model.target_kinds,
    model.target_model.target_kinds,
  );
  assert.deepEqual(
    Object.keys(review.candidate.workflow.state_groups),
    ["core"],
    "Conditional state groups must remain omitted when the activity does not use them.",
  );
}

{
  const handoff = createUiGenerationHandoff(validWorkflowReview);
  const frontendContext = createFrontendGenerationContext({
    ui_generation_handoff: handoff,
    frontend_context: {
      target_runtime: "browser",
      ui_library: "none",
    },
    verification: {
      commands: ["npm test"],
      browser_checks: ["desktop artifact inspection", "narrow artifact inspection"],
      states_to_verify: ["artifact ready", "locus focused or selected"],
    },
  });
  const skillContext = createFrontendImplementationSkillContext({
    frontend_generation_context: frontendContext,
    target_client: "codex",
  });

  assert.equal(handoff.handoff_status, "ready_for_generation");
  assert.equal(handoff.surface_type, "artifact_inspector");
  assert.equal(handoff.workflow.topology, "artifact_centered");
  assert.deepEqual(handoff.workflow.topology_contract, model.topology);
  assert.deepEqual(
    handoff.workflow.work_units.map((entry) => entry.id),
    model.work_units.map((entry) => entry.id),
  );
  assert.deepEqual(handoff.workflow.artifact, {
    id: "artifact",
    boundary: "Rendered interface under audit",
  });
  assert.equal(handoff.workflow.target_model.artifact_id, "artifact");
  assert.deepEqual(Object.keys(handoff.workflow.state_groups), ["core"]);
  assert.deepEqual(
    handoff.implementation_contract.artifact_inspector.active_state_groups,
    ["core"],
    "Conditional state groups must not activate from the registry alone.",
  );
  assert.deepEqual(
    handoff.implementation_contract.design_system_scopes,
    model.design_system.scopes,
    "A default implementation contract must auto-activate scoped authority for the selected surface.",
  );
  assert.deepEqual(
    handoff.implementation_contract.boundary_contracts,
    model.design_system.boundary_contracts,
  );
  assert.equal(
    handoff.implementation_contract.artifact_inspector
      .external_artifact_review_status,
    "external_not_reviewed",
  );
  assert.deepEqual(
    handoff.artifact_inspector.design_system_scopes,
    model.design_system.scopes,
  );
  assert.deepEqual(
    handoff.artifact_inspector.boundary_contracts,
    model.design_system.boundary_contracts,
  );

  assert.equal(
    frontendContext.frontend_context_status,
    "ready_for_frontend_implementation",
  );
  assert.equal(frontendContext.surface_type, "artifact_inspector");
  assert.equal(
    frontendContext.selected_surface_profile.id,
    "judgmentkit.artifact-inspector.v1",
  );
  assert.ok(
    frontendContext.source.supported_surface_profiles.includes(
      "judgmentkit.artifact-inspector.v1",
    ),
    "Omitting caller capabilities must use the built-in supported profile registry.",
  );
  assert.deepEqual(frontendContext.workflow.topology_contract, model.topology);
  assert.deepEqual(
    frontendContext.workflow.work_units,
    handoff.workflow.work_units,
  );
  assert.deepEqual(
    frontendContext.implementation_guidance.artifact_inspector.artifact,
    handoff.workflow.artifact,
  );
  assert.deepEqual(
    frontendContext.implementation_guidance.artifact_inspector.target_model,
    handoff.workflow.target_model,
  );
  assert.deepEqual(
    frontendContext.implementation_guidance.artifact_inspector.state_groups,
    handoff.workflow.state_groups,
  );
  assert.deepEqual(
    frontendContext.implementation_guidance.artifact_inspector
      .active_state_groups,
    ["core"],
  );
  assert.deepEqual(
    frontendContext.implementation_guidance.artifact_inspector
      .design_system_scopes,
    model.design_system.scopes,
  );
  assert.deepEqual(
    frontendContext.implementation_guidance.artifact_inspector
      .boundary_contracts,
    model.design_system.boundary_contracts,
  );
  assert.equal(
    frontendContext.guardrails.artifact_inspector_authority
      .external_artifact_review_status,
    "external_not_reviewed",
  );
  assert.equal(
    frontendContext.guardrails.artifact_inspector_authority
      .trusted_runtime_evidence_required,
    true,
  );

  assert.equal(skillContext.skill_context_status, "ready");
  assert.equal(
    skillContext.selected_surface_profile.id,
    "judgmentkit.artifact-inspector.v1",
  );
  assert.equal(
    skillContext.surface_type_guidance.workflow_topology,
    "artifact_centered",
  );
  assert.deepEqual(
    skillContext.surface_type_guidance.topology_contract,
    model.topology,
  );
  assert.deepEqual(
    skillContext.surface_type_guidance.work_units,
    handoff.workflow.work_units,
  );
  assert.deepEqual(
    skillContext.surface_type_guidance.artifact,
    handoff.workflow.artifact,
  );
  assert.deepEqual(
    skillContext.surface_type_guidance.target_model,
    handoff.workflow.target_model,
  );
  assert.deepEqual(
    skillContext.surface_type_guidance.state_groups,
    handoff.workflow.state_groups,
  );
  assert.deepEqual(
    skillContext.artifact_inspector.artifact,
    handoff.workflow.artifact,
  );
  assert.deepEqual(
    skillContext.artifact_inspector.target_model,
    handoff.workflow.target_model,
  );
  assert.deepEqual(
    skillContext.artifact_inspector.state_groups,
    handoff.workflow.state_groups,
  );
  assert.deepEqual(
    skillContext.artifact_inspector.active_state_groups,
    ["core"],
  );
  assert.deepEqual(
    skillContext.artifact_inspector.design_system_scopes,
    model.design_system.scopes,
  );
  assert.deepEqual(
    skillContext.artifact_inspector.boundary_contracts,
    model.design_system.boundary_contracts,
  );
  assert.equal(
    skillContext.artifact_inspector.external_artifact_review_status,
    "external_not_reviewed",
  );
  assert.ok(
    skillContext.instruction_markdown.includes("external_not_reviewed"),
  );
  assert.ok(
    skillContext.instruction_markdown.includes(
      "trusted browser-runtime receipt",
    ),
  );
  assert.ok(
    skillContext.verification_checklist.some((entry) =>
      entry.includes("trusted runtime evidence"),
    ),
  );

  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: handoff,
        supported_surface_profiles: [
          "judgmentkit.workbench.operational-v1",
        ],
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "artifact_inspector_profile_unsupported");
      assert.equal(error.details.fallback_applied, false);
      assert.equal(
        error.details.required_surface_profile,
        "judgmentkit.artifact-inspector.v1",
      );
      return true;
    },
  );
}

{
  const candidate = createCandidate();
  candidate.workflow.topology_contract = structuredClone(
    candidate.workflow.topology,
  );
  candidate.workflow.topology = "artifact_centered";
  const review = reviewCandidate(candidate);

  assert.equal(review.review_status, "ready_for_review");
  assert.equal(review.guardrails.artifact_inspector.valid, true);
  assert.equal(review.candidate.workflow.topology, "artifact_centered");
  assert.deepEqual(review.candidate.workflow.topology_contract, model.topology);
}

{
  const candidate = createCandidate();
  candidate.workflow.topology = "artifact_centered";
  const review = reviewCandidate(candidate);
  const diagnostic = review.guardrails.artifact_inspector.diagnostics.find(
    (entry) =>
      entry.code === "JK_ARTIFACT_INSPECTOR_TOPOLOGY_CONTRACT_MISSING",
  );

  assert.equal(review.review_status, "needs_source_context");
  assert.equal(review.guardrails.artifact_inspector.valid, false);
  assert.ok(diagnostic);
  assert.equal(diagnostic.field, "workflow.topology_contract");
  assert.equal(review.candidate.workflow.topology, "artifact_centered");
  assert.equal(
    "topology_contract" in review.candidate.workflow,
    false,
    "The reviewer must not synthesize the normative topology from the registry.",
  );
}

{
  const consequentialAutomationActivity = `
    A policy reviewer inspects one rendered policy document that remains the
    primary artifact. They select a specific passage and supporting evidence
    attaches to that selected passage. They explicitly approve and publish the
    decision, then a declared automation automatically resolves exact matches.
    They preview the relation and verify the immutable local receipt
    beside the passage.
  `;
  const conditionalActivityReview = createActivityModelReview(
    consequentialAutomationActivity,
  );
  const conditionalSurfaceReview = recommendSurfaceTypes(
    consequentialAutomationActivity,
    { activity_review: conditionalActivityReview },
  );
  const candidate = createCandidate();
  candidate.workflow.state_groups = {
    core: structuredClone(model.state_groups.core),
    consequential: structuredClone(model.state_groups.consequential),
    automation: structuredClone(model.state_groups.automation),
  };
  const review = reviewUiWorkflowCandidate(
    consequentialAutomationActivity,
    candidate,
    {
      activity_review: conditionalActivityReview,
      profile_id: "artifact-inspector-ui",
      surface_review: conditionalSurfaceReview,
    },
  );
  const coreOnlyImplementationContract = createUiImplementationContract({
    surface_type: "artifact_inspector",
  }).implementation_contract;
  assert.deepEqual(
    coreOnlyImplementationContract.artifact_inspector.active_state_groups,
    ["core"],
  );
  const handoff = createUiGenerationHandoff(review, {
    implementation_contract: coreOnlyImplementationContract,
  });

  assert.equal(review.review_status, "ready_for_review");
  assert.deepEqual(
    review.guardrails.candidate_primary_meta_terms_detected,
    [],
    "The canonical consequential state 'outcome pending' is domain state, not review-packet leakage.",
  );
  assert.deepEqual(
    handoff.implementation_contract.artifact_inspector.active_state_groups,
    ["core", "consequential", "automation"],
  );
}

{
  const consequentialActivity = `
    A compliance reviewer inspects one rendered policy document that remains
    the primary artifact. They must select a specific passage, and the evidence
    for approval attaches to that selected passage. They preview the relation,
    explicitly approve and publish the decision, then verify the immutable
    receipt beside the passage.
  `;
  const consequentialActivityReview = createActivityModelReview(
    consequentialActivity,
  );
  const consequentialSurfaceReview = recommendSurfaceTypes(
    consequentialActivity,
    { activity_review: consequentialActivityReview },
  );
  const review = reviewUiWorkflowCandidate(
    consequentialActivity,
    createCandidate(),
    {
      activity_review: consequentialActivityReview,
      profile_id: "artifact-inspector-ui",
      surface_review: consequentialSurfaceReview,
    },
  );
  const diagnostic = review.guardrails.artifact_inspector.diagnostics.find(
    (entry) =>
      entry.code ===
      "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
  );

  assert.equal(review.review_status, "needs_source_context");
  assert.ok(diagnostic);
  assert.equal(diagnostic.field, "workflow.state_groups");
  assert.ok(diagnostic.expected_contract.includes("consequential"));
}

{
  const request = buildUiWorkflowCandidateRequest({
    brief: ARTIFACT_ACTIVITY,
    activity_review: activityReview,
    profile_id: "artifact-inspector-ui",
    surface_review: surfaceReview,
  });
  const payload = JSON.parse(request.messages.at(-1).content);

  assert.equal(
    payload.candidate_shape.workflow.topology.kind,
    "artifact_centered",
  );
  assert.equal(
    payload.candidate_shape.workflow.topology.primary_object_id,
    "artifact",
  );
  assert.deepEqual(
    payload.candidate_shape.workflow.work_units.map((entry) => entry.id),
    model.work_units.map((entry) => entry.id),
  );
  assert.deepEqual(
    payload.candidate_shape.workflow.target_model.target_kinds,
    model.target_model.target_kinds,
  );
  assert.deepEqual(
    Object.keys(payload.candidate_shape.workflow.state_groups),
    ["core"],
    "The generated candidate shape must not activate every conditional state group by default.",
  );
  assert.deepEqual(
    payload.artifact_inspector_state_group_catalog,
    model.state_groups,
    "Conditional state definitions remain available without becoming active candidate state by default.",
  );
  assert.ok(
    request.messages[0].content.includes(
      "stable structured work-unit ids",
    ),
  );
}

const MALFORMED_CASES = [
  {
    label: "wrong topology kind",
    mutate(candidate) {
      candidate.workflow.topology.kind = "workspace";
    },
    code: "JK_ARTIFACT_INSPECTOR_TOPOLOGY_KIND_INVALID",
    field: "workflow.topology.kind",
  },
  {
    label: "missing primary artifact reference",
    mutate(candidate) {
      delete candidate.workflow.topology.primary_object_id;
    },
    code: "JK_ARTIFACT_INSPECTOR_PRIMARY_ARTIFACT_MISSING",
    field: "workflow.topology.primary_object_id",
  },
  {
    label: "missing locus model",
    mutate(candidate) {
      delete candidate.workflow.target_model.target_kinds;
    },
    code: "JK_ARTIFACT_INSPECTOR_LOCUS_MODEL_MISSING",
    field: "workflow.target_model.target_kinds",
  },
  ...[
    "target_identity_sources",
    "geometry_policy",
    "label_sources",
    "artifact_interactivity",
    "native_interaction_precedence",
    "artifact_id",
  ].map((field) => ({
    label: `missing target model ${field}`,
    mutate(candidate) {
      delete candidate.workflow.target_model[field];
    },
    code: "JK_ARTIFACT_INSPECTOR_LOCUS_MODEL_MISSING",
    field: `workflow.target_model.${field}`,
  })),
  {
    label: "noncanonical inferred target model",
    mutate(candidate) {
      candidate.workflow.target_model = {
        target_kinds: ["pixel_guess"],
        target_identity_sources: ["visual_inference"],
        geometry_policy: "Infer the nearest element after every render.",
        label_sources: ["model_generated"],
        artifact_interactivity: ["live"],
        native_interaction_precedence:
          "The inspector always captures native actions.",
        artifact_id: "artifact",
      };
    },
    code: "JK_ARTIFACT_INSPECTOR_LOCUS_MODEL_MISSING",
    field: "workflow.target_model.target_kinds",
  },
  {
    label: "missing stable work-unit id",
    mutate(candidate) {
      delete candidate.workflow.work_units[0].id;
    },
    code: "JK_ARTIFACT_INSPECTOR_WORK_UNIT_ID_MISSING",
    field: "workflow.work_units[0].id",
  },
  {
    label: "missing required work units",
    mutate(candidate) {
      candidate.workflow.work_units = candidate.workflow.work_units.filter(
        (workUnit) => ["orient", "select_locus", "recover"].includes(workUnit.id),
      );
      candidate.workflow.topology.entry_work_unit_id = "orient";
      candidate.workflow.topology.completion_work_unit_ids = ["orient"];
      candidate.workflow.topology.transitions = [
        { from: "orient", to: "select_locus" },
        { from: "select_locus", to: "recover" },
        { from: "recover", to: "orient" },
      ];
    },
    code: "JK_ARTIFACT_INSPECTOR_WORK_UNIT_ID_MISSING",
    field: "workflow.work_units",
  },
  {
    label: "invalid work-unit contract",
    mutate(candidate) {
      candidate.workflow.work_units[0].participant_intent =
        "Open a generic workspace.";
    },
    code: "JK_ARTIFACT_INSPECTOR_WORK_UNIT_CONTRACT_INVALID",
    field: "workflow.work_units[0].participant_intent",
  },
  {
    label: "missing artifact declaration",
    mutate(candidate) {
      delete candidate.workflow.artifact;
    },
    code: "JK_ARTIFACT_INSPECTOR_PRIMARY_ARTIFACT_MISSING",
    field: "workflow.artifact.id",
  },
  {
    label: "missing artifact boundary",
    mutate(candidate) {
      delete candidate.workflow.artifact.boundary;
    },
    code: "JK_ARTIFACT_INSPECTOR_PRIMARY_ARTIFACT_MISSING",
    field: "workflow.artifact.boundary",
  },
  {
    label: "invalid entry reference",
    mutate(candidate) {
      candidate.workflow.topology.entry_work_unit_id = "missing_entry";
    },
    code: "JK_ARTIFACT_INSPECTOR_ENTRY_REFERENCE_INVALID",
    field: "workflow.topology.entry_work_unit_id",
  },
  {
    label: "invalid completion reference",
    mutate(candidate) {
      candidate.workflow.topology.completion_work_unit_ids = [
        "missing_completion",
      ];
    },
    code: "JK_ARTIFACT_INSPECTOR_COMPLETION_REFERENCE_INVALID",
    field: "workflow.topology.completion_work_unit_ids",
  },
  {
    label: "completion omits artifact-local verification",
    mutate(candidate) {
      candidate.workflow.topology.completion_work_unit_ids = ["orient"];
    },
    code: "JK_ARTIFACT_INSPECTOR_COMPLETION_REFERENCE_INVALID",
    field: "workflow.topology.completion_work_unit_ids",
  },
  {
    label: "invalid transition reference",
    mutate(candidate) {
      candidate.workflow.topology.transitions[0].from = "missing_work_unit";
    },
    code: "JK_ARTIFACT_INSPECTOR_TRANSITION_REFERENCE_INVALID",
    field: "workflow.topology.transitions",
  },
  {
    label: "disconnected canonical topology",
    mutate(candidate) {
      candidate.workflow.topology.transitions = [
        { from: "orient", to: "recover" },
        { from: "recover", to: "orient" },
      ];
    },
    code: "JK_ARTIFACT_INSPECTOR_TRANSITION_REFERENCE_INVALID",
    field: "workflow.topology.transitions",
  },
  {
    label: "missing recovery path",
    mutate(candidate) {
      candidate.workflow.topology.transitions =
        candidate.workflow.topology.transitions.filter(
          (transition) =>
            transition.from !== "recover" && transition.to !== "recover",
        );
    },
    code: "JK_ARTIFACT_INSPECTOR_RECOVERY_PATH_MISSING",
    field: "workflow.topology.transitions",
  },
  {
    label: "missing state-group contract",
    mutate(candidate) {
      delete candidate.workflow.state_groups;
    },
    code: "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
    field: "workflow.state_groups",
  },
  {
    label: "invalid core state set",
    mutate(candidate) {
      candidate.workflow.state_groups.core = ["artifact ready"];
    },
    code: "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
    field: "workflow.state_groups.core",
  },
  {
    label: "inactive conditional state groups",
    mutate(candidate) {
      candidate.workflow.state_groups = structuredClone(model.state_groups);
    },
    code: "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
    field: "workflow.state_groups",
  },
];

for (const malformedCase of MALFORMED_CASES) {
  const candidate = createCandidate();
  malformedCase.mutate(candidate);
  const review = reviewCandidate(candidate);
  const diagnostics = review.guardrails.artifact_inspector.diagnostics;
  const diagnostic = diagnostics.find(
    (entry) => entry.code === malformedCase.code,
  );

  assert.equal(
    review.review_status,
    "needs_source_context",
    `${malformedCase.label} must block workflow acceptance.`,
  );
  assert.equal(review.guardrails.artifact_inspector.valid, false);
  assert.ok(
    diagnostic,
    `${malformedCase.label} must emit ${malformedCase.code}.`,
  );
  assert.equal(diagnostic.field, malformedCase.field);
  assert.notEqual(diagnostic.expected_contract, undefined);
  assert.equal(typeof diagnostic.repair_instruction, "string");
  assert.ok(diagnostic.repair_instruction.length > 0);
  assert.ok(
    review.review.targeted_questions.includes(
      diagnostic.repair_instruction,
    ),
    `${malformedCase.label} repair must remain user-actionable.`,
  );
}

console.log("artifact inspector workflow checks passed.");
