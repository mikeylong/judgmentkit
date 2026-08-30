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

const WORKBENCH_ACTIVITY = `
  A dispatch lead repeatedly reviews service exceptions in a work queue,
  compares route and customer evidence, decides whether to reassign, hold, or
  escalate each visit, and leaves a handoff receipt for the next owner.
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

function renamePrimaryArtifact(workflow, id = "renamed_artifact") {
  const topology =
    workflow.topology && typeof workflow.topology === "object"
      ? workflow.topology
      : workflow.topology_contract;
  topology.primary_object_id = id;
  workflow.artifact.id = id;
  workflow.target_model.artifact_id = id;
}

function createWorkbenchWorkflowReview() {
  const workbenchActivityReview = createActivityModelReview(
    WORKBENCH_ACTIVITY,
  );
  const workbenchSurfaceReview = recommendSurfaceTypes(WORKBENCH_ACTIVITY, {
    activity_review: workbenchActivityReview,
  });
  const review = reviewUiWorkflowCandidate(
    WORKBENCH_ACTIVITY,
    {
      workflow: {
        surface_name: "Service exception workspace",
        topology: "workspace",
        work_units: [
          "Inspect evidence",
          "Choose action",
          "Leave handoff",
        ],
        primary_actions: ["Reassign", "Hold", "Escalate"],
        decision_points: ["Choose the next operational action."],
        completion_state: "The next owner receives a reasoned handoff.",
      },
      surface_set: [
        {
          name: "Service exception workspace",
          purpose:
            "Keep the selected exception, evidence, decision, and handoff together.",
          sections: [
            "Work queue",
            "Detail workspace",
            "Evidence",
            "Handoff",
          ],
          controls: [
            "Select exception",
            "Choose action",
            "Complete handoff",
          ],
          relationship_to_workflow:
            "Supports repeated exception review.",
        },
      ],
      product_terms: ["Exception", "Evidence", "Handoff"],
      handoff: {
        next_owner: "dispatch coordinator",
        reason: "The exception needs the selected operational action.",
        next_action: "Complete the handoff.",
      },
      diagnostics: {
        implementation_terms: [],
        reveal_contexts: ["debugging", "auditing"],
      },
    },
    {
      activity_review: workbenchActivityReview,
      surface_review: workbenchSurfaceReview,
    },
  );

  assert.equal(review.review_status, "ready_for_review");
  assert.equal(review.surface_type, "workbench");
  return review;
}

function completeExternalDesignSystemAdapter() {
  return {
    design_system_name: "External UI",
    design_system_package: "@example/ui",
    token_guidance: {
      token_families: ["color"],
      css_custom_properties: [
        {
          name: "--external-surface",
          role: "surface",
          family: "color",
          value: "#ffffff",
          usage: "External UI surfaces",
        },
      ],
    },
    font_guidance: {
      font_roles: {
        body: {
          stack: "system-ui",
          usage: "External UI body typography",
        },
      },
    },
    icon_guidance: {
      icon_roles: ["status"],
      icon_catalog: {
        source: "external_design_system",
        library: "example-icons",
        package: "@example/icons",
        version: "1.0.0",
        icon_count: 1,
        license: "MIT",
        notice: "Repo-approved external icon adapter.",
        mcp_tools: [],
      },
    },
    components: ["Button"],
  };
}

function disguiseExternalDesignAuthority(implementationContract) {
  implementationContract.design_system_source = {
    ...implementationContract.design_system_source,
    mode: "judgmentkit_default",
    id: "external-ui.source-v1",
    name: "External UI",
    package: "@example/ui",
    definition_point: "caller_serialized_contract",
    token_prefixes: ["--external-"],
    renderer_components: ["ExternalButton"],
  };
  implementationContract.visual_token_adapter = {
    ...implementationContract.visual_token_adapter,
    css_custom_properties: [
      {
        name: "--external-surface",
        role: "surface",
        family: "color",
        value: "#ffffff",
        usage: "External UI surfaces",
      },
    ],
  };
  implementationContract.default_ai_native_design_system = {
    ...implementationContract.default_ai_native_design_system,
    component_contracts: [
      {
        ...implementationContract.default_ai_native_design_system
          .component_contracts[0],
        id: "ExternalButton",
        label: "External button",
        purpose: "Supply external chrome authority",
      },
    ],
  };
}

function reviewCandidate(candidate) {
  return reviewUiWorkflowCandidate(ARTIFACT_ACTIVITY, candidate, {
    activity_review: activityReview,
    profile_id: "artifact-inspector-ui",
    surface_review: surfaceReview,
  });
}

function createAutomationWorkflowReview() {
  const automationActivity = `${ARTIFACT_ACTIVITY}
    A declared automation performs automatic resolution for an exact match and
    returns every uncertain result to human review.
  `;
  const automationActivityReview = createActivityModelReview(
    automationActivity,
  );
  const automationSurfaceReview = recommendSurfaceTypes(automationActivity, {
    activity_review: automationActivityReview,
  });
  const automationCandidate = createCandidate();
  automationCandidate.workflow.surface_name = "Automated accessibility review";
  automationCandidate.workflow.state_groups.automation = structuredClone(
    model.state_groups.automation,
  );
  automationCandidate.handoff.next_action =
    "Review the automated-resolution receipt.";

  return reviewUiWorkflowCandidate(
    automationActivity,
    automationCandidate,
    {
      activity_review: automationActivityReview,
      profile_id: "artifact-inspector-ui",
      surface_review: automationSurfaceReview,
    },
  );
}

const validWorkflowReview = reviewCandidate(createCandidate());

{
  const automationWorkflowReview = createAutomationWorkflowReview();
  assert.equal(automationWorkflowReview.review_status, "ready_for_review");
  assert.deepEqual(
    automationWorkflowReview.guardrails.artifact_inspector.active_state_groups,
    ["core", "automation"],
  );

  const mixedWorkflowReview = structuredClone(validWorkflowReview);
  mixedWorkflowReview.source = structuredClone(
    automationWorkflowReview.source,
  );
  mixedWorkflowReview.candidate.workflow.state_groups.automation =
    structuredClone(model.state_groups.automation);
  mixedWorkflowReview.review.evidence.artifact_inspector
    .active_state_groups = ["core", "automation"];
  mixedWorkflowReview.guardrails.artifact_inspector.active_state_groups = [
    "core",
    "automation",
  ];
  assert.throws(
    () => createUiGenerationHandoff(mixedWorkflowReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.ok(
        error.details.failures.some(
          (failure) =>
            failure.field ===
            "source.artifact_inspector_review_integrity",
        ),
      );
      return true;
    },
    "A seal from a different valid review cannot authorize a mixed activity, workflow, surface, or authority packet.",
  );

  const coreHandoff = createUiGenerationHandoff(validWorkflowReview);
  const automationHandoff = createUiGenerationHandoff(
    automationWorkflowReview,
  );
  const mixedHandoff = structuredClone(coreHandoff);
  mixedHandoff.source = structuredClone(automationHandoff.source);
  mixedHandoff.workflow.state_groups.automation = structuredClone(
    model.state_groups.automation,
  );
  mixedHandoff.implementation_contract.artifact_inspector
    .active_state_groups = ["core", "automation"];
  mixedHandoff.artifact_inspector.registry.active_state_groups = [
    "core",
    "automation",
  ];
  mixedHandoff.artifact_inspector.state_groups.automation = structuredClone(
    model.state_groups.automation,
  );
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: mixedHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "A handoff seal from a different valid packet cannot authorize mixed workflow and authority fields.",
  );

  const coreFrontendContext = createFrontendGenerationContext({
    ui_generation_handoff: JSON.parse(JSON.stringify(coreHandoff)),
  });
  const automationFrontendContext = createFrontendGenerationContext({
    ui_generation_handoff: JSON.parse(JSON.stringify(automationHandoff)),
  });
  assert.notEqual(
    coreHandoff.source.artifact_inspector_boundary_integrity,
    coreFrontendContext.source.artifact_inspector_boundary_integrity,
    "The frontend boundary must issue a stage-specific seal instead of copying the handoff seal.",
  );
  assert.equal(
    createFrontendImplementationSkillContext({
      frontend_generation_context: JSON.parse(
        JSON.stringify(coreFrontendContext),
      ),
      target_client: "codex",
    }).skill_context_status,
    "ready",
    "JSON round trips must preserve a legitimate frontend packet and its opaque seal.",
  );
  assert.equal(
    createFrontendImplementationSkillContext({
      frontend_generation_context: automationFrontendContext,
      target_client: "codex",
    }).skill_context_status,
    "ready",
    "A complete legitimate automation packet remains accepted.",
  );

  const mixedFrontendContext = structuredClone(coreFrontendContext);
  mixedFrontendContext.source = structuredClone(
    automationFrontendContext.source,
  );
  mixedFrontendContext.workflow.state_groups.automation = structuredClone(
    model.state_groups.automation,
  );
  mixedFrontendContext.implementation_contract.artifact_inspector
    .active_state_groups = ["core", "automation"];
  mixedFrontendContext.implementation_guidance.artifact_inspector
    .active_state_groups = ["core", "automation"];
  mixedFrontendContext.implementation_guidance.artifact_inspector
    .registry.active_state_groups = ["core", "automation"];
  mixedFrontendContext.implementation_guidance.artifact_inspector
    .state_groups.automation = structuredClone(model.state_groups.automation);
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: mixedFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "A frontend seal from a different valid packet cannot authorize mixed workflow and guidance fields.",
  );
}

{
  const contradictoryReview = structuredClone(validWorkflowReview);
  contradictoryReview.candidate.workflow.topology = "workspace";

  assert.throws(
    () => createUiGenerationHandoff(contradictoryReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(error.details.field, "workflow.topology");
      assert.equal(error.details.topology, "workspace");
      assert.equal(
        error.details.topology_contract_kind,
        "artifact_centered",
      );
      assert.equal(
        error.details.diagnostic_code,
        "JK_ARTIFACT_INSPECTOR_TOPOLOGY_KIND_INVALID",
      );
      return true;
    },
    "Handoff must reject contradictory serialized topology representations.",
  );

  const objectOnlyTopologyReview = structuredClone(validWorkflowReview);
  objectOnlyTopologyReview.candidate.workflow.topology = structuredClone(
    objectOnlyTopologyReview.candidate.workflow.topology_contract,
  );
  delete objectOnlyTopologyReview.candidate.workflow.topology_contract;
  assert.throws(
    () => createUiGenerationHandoff(objectOnlyTopologyReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(
        error.details.field,
        "artifact_inspector.boundary_consistency",
      );
      assert.equal(error.details.observed.topology, "artifact_centered");
      assert.equal(error.details.observed.topology_representation, "object");
      assert.equal(error.details.observed.topology_contract_kind, null);
      assert.equal(error.details.observed.canonical_topology_shape, false);
      return true;
    },
    "Handoff must reject an object-only Artifact Inspector topology that its serializer would drop.",
  );

  const missingArtifactReview = structuredClone(validWorkflowReview);
  delete missingArtifactReview.candidate.workflow.artifact;
  assert.throws(
    () => createUiGenerationHandoff(missingArtifactReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(error.details.field, "workflow.artifact");
      assert.equal(
        error.details.diagnostic_code,
        "JK_ARTIFACT_INSPECTOR_PRIMARY_ARTIFACT_MISSING",
      );
      assert.equal(
        error.details.reason,
        "artifact_inspector_required_structure_invalid",
      );
      return true;
    },
    "Handoff must reject a ready packet whose reviewed artifact identity was removed after review.",
  );

  const contradictoryProfileReview = structuredClone(validWorkflowReview);
  contradictoryProfileReview.guidance_profile.profile_id =
    "operator-review-ui";
  assert.throws(
    () => createUiGenerationHandoff(contradictoryProfileReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(
        error.details.field,
        "artifact_inspector.boundary_consistency",
      );
      assert.deepEqual(error.details.observed.workflow_profile_ids, [
        "operator-review-ui",
      ]);
      assert.equal(
        error.details.expected.workflow_profile,
        "artifact-inspector-ui",
      );
      return true;
    },
    "Handoff must reject a conflicting profile id on an otherwise canonical Artifact Inspector review.",
  );

  for (const [label, mutate] of [
    [
      "nested activity review status",
      (review) => {
        review.activity_review.review_status = "needs_source_context";
      },
    ],
    [
      "retained activity guardrail status",
      (review) => {
        review.guardrails.activity_review_status = "needs_source_context";
      },
    ],
    [
      "reviewed Artifact Inspector validity",
      (review) => {
        review.review.evidence.artifact_inspector.valid = false;
      },
    ],
    [
      "guardrail Artifact Inspector validity",
      (review) => {
        review.guardrails.artifact_inspector.valid = false;
      },
    ],
  ]) {
    const tamperedReview = structuredClone(validWorkflowReview);
    mutate(tamperedReview);
    assert.throws(
      () => createUiGenerationHandoff(tamperedReview),
      (error) => {
        assert.ok(error instanceof JudgmentKitInputError);
        assert.equal(error.code, "handoff_blocked");
        assert.equal(error.details.reason, "review_packet_no_longer_ready");
        return true;
      },
      `${label} cannot be relabeled into a ready handoff.`,
    );
  }

  const erasedActivityReview = structuredClone(validWorkflowReview);
  erasedActivityReview.activity_review.candidate.activity_model = {
    activity: "",
    participants: [],
    objective: "",
    outcomes: [],
    domain_vocabulary: [],
  };
  erasedActivityReview.activity_review.candidate.interaction_contract = {
    primary_decision: "",
    next_actions: [],
    completion: "",
    make_easy: [],
  };
  assert.throws(
    () => createUiGenerationHandoff(erasedActivityReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(error.details.reason, "review_packet_no_longer_ready");
      const failure = error.details.failures.find(
        (entry) => entry.field === "activity_review.candidate",
      );
      assert.ok(failure);
      assert.equal(failure.observed.activity, true);
      assert.equal(failure.observed.primary_decision, true);
      assert.equal(failure.observed.completion_or_outcome, true);
      return true;
    },
    "Erasing the nested reviewed activity must not produce a ready handoff.",
  );

  const renamedPrimaryArtifactReview = structuredClone(validWorkflowReview);
  renamePrimaryArtifact(renamedPrimaryArtifactReview.candidate.workflow);
  assert.throws(
    () => createUiGenerationHandoff(renamedPrimaryArtifactReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(
        error.details.field,
        "workflow.topology_contract.primary_object_id",
      );
      assert.equal(error.details.expected, "artifact");
      assert.equal(error.details.observed, "renamed_artifact");
      return true;
    },
    "A caller cannot coherently rename the canonical primary artifact after review.",
  );

  const workbenchGuidanceReview = structuredClone(validWorkflowReview);
  workbenchGuidanceReview.surface_guidance.interaction_implications = {
    primary_structure: "Workbench queue-detail",
  };
  workbenchGuidanceReview.surface_guidance.disclosure_implications = {
    product_ui_rule: "Expose queue machinery",
  };
  workbenchGuidanceReview.surface_guidance.frontend_posture = {
    navigation_shape: "queue-detail",
  };
  assert.throws(
    () => createUiGenerationHandoff(workbenchGuidanceReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.ok(
        error.details.failures.some(
          (failure) =>
            failure.field ===
            "source.artifact_inspector_review_integrity",
        ),
      );
      return true;
    },
    "Caller-replaced surface guidance cannot be canonicalized under a seal issued for different reviewed guidance.",
  );

  const jointlyBroadenedStateReview = structuredClone(validWorkflowReview);
  jointlyBroadenedStateReview.candidate.workflow.state_groups.automation =
    structuredClone(model.state_groups.automation);
  jointlyBroadenedStateReview.review.evidence.artifact_inspector
    .active_state_groups = ["core", "automation"];
  jointlyBroadenedStateReview.guardrails.artifact_inspector
    .active_state_groups = ["core", "automation"];
  assert.throws(
    () => createUiGenerationHandoff(jointlyBroadenedStateReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(error.details.reason, "review_packet_no_longer_ready");
      assert.ok(
        error.details.failures.some(
          (failure) =>
            failure.field ===
            "guardrails.artifact_inspector.active_state_groups",
        ),
      );
      return true;
    },
    "Mutating the workflow and both duplicated review arrays together must not activate a group absent from grounded activity evidence.",
  );

  const forgedReviewedSource = structuredClone(validWorkflowReview);
  forgedReviewedSource.source.reviewed_activity_input +=
    " Automation uses exact match and automatic resolution.";
  forgedReviewedSource.candidate.workflow.state_groups.automation =
    structuredClone(model.state_groups.automation);
  forgedReviewedSource.review.evidence.artifact_inspector
    .active_state_groups = ["core", "automation"];
  forgedReviewedSource.guardrails.artifact_inspector.active_state_groups = [
    "core",
    "automation",
  ];
  assert.throws(
    () => createUiGenerationHandoff(forgedReviewedSource),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(error.details.reason, "review_packet_no_longer_ready");
      assert.ok(
        error.details.failures.some(
          (failure) =>
            failure.field ===
            "source.artifact_inspector_review_integrity",
        ),
      );
      return true;
    },
    "A caller cannot rewrite both the reviewed source and its state ceiling.",
  );
}

{
  const workbenchReview = createWorkbenchWorkflowReview();
  const artifactContract = createUiImplementationContract({
    surface_type: "artifact_inspector",
  }).implementation_contract;

  assert.throws(
    () =>
      createUiGenerationHandoff(workbenchReview, {
        implementation_contract: artifactContract,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(
        error.details.field,
        "artifact_inspector.boundary_consistency",
      );
      assert.deepEqual(error.details.observed.surface_types, ["workbench"]);
      assert.equal(error.details.observed.topology, "workspace");
      assert.equal(error.details.observed.authority_bundle_active, true);
      return true;
    },
    "Handoff must reject Artifact Inspector authority attached to a Workbench workflow.",
  );

  const workbenchHandoff = createUiGenerationHandoff(workbenchReview);
  const legacyGuidanceReview = structuredClone(workbenchReview);
  const legacyInteractionSentinel = {
    primary_structure: "Legacy Workbench interaction sentinel",
  };
  const legacyDisclosureSentinel = {
    product_ui_rule: "Legacy Workbench disclosure sentinel",
  };
  legacyGuidanceReview.surface_guidance.interaction_implications =
    legacyInteractionSentinel;
  legacyGuidanceReview.surface_guidance.disclosure_implications =
    legacyDisclosureSentinel;
  const legacyGuidanceHandoff = createUiGenerationHandoff(
    legacyGuidanceReview,
  );
  assert.deepEqual(
    legacyGuidanceHandoff.surface_guidance.interaction_implications,
    legacyInteractionSentinel,
  );
  assert.deepEqual(
    legacyGuidanceHandoff.surface_guidance.disclosure_implications,
    legacyDisclosureSentinel,
  );
  const legacyGuidanceFrontendContext = createFrontendGenerationContext({
    ui_generation_handoff: legacyGuidanceHandoff,
  });
  assert.deepEqual(
    legacyGuidanceFrontendContext.implementation_guidance
      .interaction_implications,
    legacyInteractionSentinel,
  );
  assert.deepEqual(
    legacyGuidanceFrontendContext.implementation_guidance
      .disclosure_implications,
    legacyDisclosureSentinel,
  );
  const legacyGuidanceSkillContext = createFrontendImplementationSkillContext({
    frontend_generation_context: legacyGuidanceFrontendContext,
    target_client: "codex",
  });
  assert.deepEqual(
    legacyGuidanceSkillContext.surface_type_guidance.interaction_implications,
    legacyInteractionSentinel,
  );
  assert.deepEqual(
    legacyGuidanceSkillContext.surface_type_guidance.disclosure_implications,
    legacyDisclosureSentinel,
  );
  const authorityLeakingHandoff = structuredClone(workbenchHandoff);
  authorityLeakingHandoff.implementation_contract = structuredClone(
    artifactContract,
  );
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: authorityLeakingHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.deepEqual(error.details.observed.surface_types, ["workbench"]);
      assert.equal(error.details.observed.topology, "workspace");
      assert.equal(error.details.observed.authority_bundle_active, true);
      return true;
    },
    "Frontend generation must reject Artifact Inspector authority attached to serialized Workbench handoff.",
  );

  const workbenchFrontendContext = createFrontendGenerationContext({
    ui_generation_handoff: workbenchHandoff,
  });
  const authorityLeakingFrontendContext = structuredClone(
    workbenchFrontendContext,
  );
  authorityLeakingFrontendContext.implementation_contract = structuredClone(
    artifactContract,
  );
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: authorityLeakingFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.deepEqual(error.details.observed.surface_types, ["workbench"]);
      assert.equal(error.details.observed.topology, "workspace");
      assert.equal(error.details.observed.authority_bundle_active, true);
      return true;
    },
    "Skill compilation must reject Artifact Inspector authority attached to serialized Workbench context.",
  );
}

{
  const review = validWorkflowReview;
  const artifactGuardrail = review.guardrails.artifact_inspector;

  assert.equal(review.review_status, "ready_for_review");
  assert.equal(review.source.reviewed_activity_input, ARTIFACT_ACTIVITY.trim());
  assert.equal(
    typeof review.source.artifact_inspector_review_integrity,
    "string",
  );
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
  const topologyDerivedReview = reviewUiWorkflowCandidate(
    ARTIFACT_ACTIVITY,
    createCandidate(),
    { activity_review: activityReview },
  );
  const handoff = createUiGenerationHandoff(topologyDerivedReview);

  assert.equal(topologyDerivedReview.review_status, "ready_for_review");
  assert.equal(topologyDerivedReview.surface_type, "artifact_inspector");
  assert.equal(
    topologyDerivedReview.surface_guidance.recommended_surface_type,
    "artifact_inspector",
  );
  assert.equal(
    topologyDerivedReview.surface_guidance.confidence,
    "validated_workflow",
  );
  assert.equal(handoff.surface_type, "artifact_inspector");
  assert.deepEqual(
    handoff.implementation_contract.design_system_scopes,
    model.design_system.scopes,
    "Validated artifact topology must carry scoped authority even without caller-supplied surface evidence.",
  );

  const emptySurfaceReview = reviewUiWorkflowCandidate(
    ARTIFACT_ACTIVITY,
    createCandidate(),
    {
      activity_review: activityReview,
      surface_review: {},
    },
  );
  assert.equal(emptySurfaceReview.review_status, "ready_for_review");
  assert.equal(emptySurfaceReview.surface_type, "artifact_inspector");
  assert.equal(
    createUiGenerationHandoff(emptySurfaceReview).surface_type,
    "artifact_inspector",
    "An empty optional surface review must not suppress canonical topology-derived routing.",
  );

  const readyReviewWithoutSurfaceMetadata = structuredClone(
    topologyDerivedReview,
  );
  delete readyReviewWithoutSurfaceMetadata.surface_type;
  delete readyReviewWithoutSurfaceMetadata.surface_guidance;
  assert.throws(
    () => createUiGenerationHandoff(readyReviewWithoutSurfaceMetadata),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.ok(
        error.details.failures.some(
          (failure) =>
            failure.field ===
            "source.artifact_inspector_review_integrity",
        ),
      );
      return true;
    },
    "Handoff must reject a reviewed packet whose canonical surface metadata was removed after review.",
  );

  const internallyConflictingReview = structuredClone(topologyDerivedReview);
  internallyConflictingReview.surface_guidance = {
    ...internallyConflictingReview.surface_guidance,
    recommended_surface_type: "workbench",
  };
  assert.throws(
    () => createUiGenerationHandoff(internallyConflictingReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(error.details.surface_type, "artifact_inspector");
      assert.equal(error.details.surface_guidance_type, "workbench");
      return true;
    },
    "Handoff must reconcile both reviewed surface fields before deriving authority.",
  );

  const conflictingHandoffReview = structuredClone(topologyDerivedReview);
  conflictingHandoffReview.surface_type = "workbench";
  conflictingHandoffReview.surface_guidance = {
    ...conflictingHandoffReview.surface_guidance,
    recommended_surface_type: "workbench",
  };

  assert.throws(
    () => createUiGenerationHandoff(conflictingHandoffReview),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.equal(error.details.expected_surface_type, "artifact_inspector");
      assert.equal(error.details.observed_surface_type, "workbench");
      assert.equal(error.details.workflow_topology, "artifact_centered");
      return true;
    },
    "Handoff must defensively reject a conflicting surface on an artifact-centered reviewed workflow.",
  );

  assert.throws(
    () =>
      createUiGenerationHandoff(topologyDerivedReview, {
        implementation_contract: "not-an-object",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(error.details.field, "implementation_contract");
      return true;
    },
    "Malformed caller contract input must not remove the scoped authority bundle.",
  );

  const readyReviewWithDuplicateWorkUnit = structuredClone(
    topologyDerivedReview,
  );
  readyReviewWithDuplicateWorkUnit.candidate.workflow.work_units.push({
    ...structuredClone(
      readyReviewWithDuplicateWorkUnit.candidate.workflow.work_units[0],
    ),
    participant_intent: "Orient to an unrelated secondary artifact.",
  });
  assert.throws(
    () => createUiGenerationHandoff(readyReviewWithDuplicateWorkUnit),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      assert.deepEqual(error.details.duplicate_work_unit_ids, ["orient"]);
      return true;
    },
    "A serialized ready review cannot add a divergent duplicate work-unit id before handoff.",
  );
}

{
  const conflictingActivity = `${ARTIFACT_ACTIVITY}
    The primary activity is freely creating and editing the artifact.
  `;
  const strippedActivityReview = structuredClone(activityReview);
  delete strippedActivityReview.review.evidence.artifact_inspector;
  delete strippedActivityReview.guardrails.artifact_inspector;
  const review = reviewUiWorkflowCandidate(
    conflictingActivity,
    createCandidate(),
    {
      activity_review: strippedActivityReview,
      profile_id: "artifact-inspector-ui",
    },
  );
  const diagnostic = review.guardrails.artifact_inspector.diagnostics.find(
    (entry) =>
      entry.code === "JK_ARTIFACT_INSPECTOR_KEYWORD_ROUTING_CONFLICT",
  );

  assert.equal(review.review_status, "needs_source_context");
  assert.equal(review.guardrails.artifact_inspector.valid, false);
  assert.ok(
    diagnostic,
    "Grounded source evidence must restore a routing conflict stripped from supplied review metadata.",
  );
  assert.equal(diagnostic.field, "artifact_inspector.routing");
  assert.equal(diagnostic.observed.activity_conflict, true);
  assert.ok(
    diagnostic.observed.matched_exclusion_evidence.includes(
      "open_ended_creation_is_primary",
    ),
  );
}

{
  const legacyQueueActivity = `
    A support lead reviews refund cases in a shared queue during daily triage.
    They decide whether each case should be approved, escalated to policy, or
    returned for missing evidence. Completion is a clear case handoff with a
    reason and next owner.
  `;
  const legacyActivityReview = createActivityModelReview(legacyQueueActivity);
  const review = reviewUiWorkflowCandidate(
    legacyQueueActivity,
    createCandidate(),
    { activity_review: legacyActivityReview },
  );
  const diagnostic = review.guardrails.artifact_inspector.diagnostics.find(
    (entry) =>
      entry.code === "JK_ARTIFACT_INSPECTOR_KEYWORD_ROUTING_CONFLICT",
  );

  assert.equal(legacyActivityReview.review_status, "ready_for_review");
  assert.equal(review.review_status, "needs_source_context");
  assert.equal(review.guardrails.artifact_inspector.valid, false);
  assert.equal(diagnostic.observed.mandatory_evidence_satisfied, false);
  assert.ok(
    diagnostic.observed.missing_mandatory_evidence.includes(
      "rendered_artifact_is_primary",
    ),
  );
}

{
  const genericCandidate = createCandidate();
  genericCandidate.workflow.topology = "workspace";
  const review = reviewUiWorkflowCandidate(
    ARTIFACT_ACTIVITY,
    genericCandidate,
    { activity_review: activityReview },
  );

  assert.equal(review.review_status, "needs_source_context");
  assert.equal(review.guardrails.artifact_inspector.selected, true);
  assert.equal(review.guardrails.artifact_inspector.valid, false);
  assert.ok(
    review.guardrails.artifact_inspector.diagnostics.some(
      (entry) =>
        entry.code === "JK_ARTIFACT_INSPECTOR_TOPOLOGY_CONTRACT_MISSING" ||
        entry.code === "JK_ARTIFACT_INSPECTOR_TOPOLOGY_KIND_INVALID",
    ),
    "Grounded Artifact Inspector activity must require artifact topology and scoped authority.",
  );
  assert.throws(
    () => createUiGenerationHandoff(review),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "handoff_blocked");
      return true;
    },
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
  const renamedPrimaryArtifactHandoff = structuredClone(handoff);
  renamePrimaryArtifact(renamedPrimaryArtifactHandoff.workflow);
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: renamedPrimaryArtifactHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.equal(
        error.details.field,
        "workflow.topology_contract.primary_object_id",
      );
      return true;
    },
    "Frontend generation must reject a coherently renamed primary artifact.",
  );
  const renamedPrimaryArtifactFrontendContext = structuredClone(
    frontendContext,
  );
  renamePrimaryArtifact(renamedPrimaryArtifactFrontendContext.workflow);
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: renamedPrimaryArtifactFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(
        error.details.field,
        "workflow.topology_contract.primary_object_id",
      );
      return true;
    },
    "Skill compilation must reject a coherently renamed primary artifact.",
  );

  const workbenchGuidanceHandoff = structuredClone(handoff);
  workbenchGuidanceHandoff.surface_guidance.interaction_implications = {
    primary_structure: "Workbench queue-detail",
  };
  workbenchGuidanceHandoff.surface_guidance.disclosure_implications = {
    product_ui_rule: "Expose queue machinery",
  };
  workbenchGuidanceHandoff.surface_guidance.frontend_posture = {
    navigation_shape: "queue-detail",
  };
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: workbenchGuidanceHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "Frontend generation cannot canonicalize caller-replaced surface guidance under a seal issued for different handoff guidance.",
  );

  const workbenchGuidanceFrontendContext = structuredClone(frontendContext);
  workbenchGuidanceFrontendContext.implementation_guidance
    .interaction_implications = {
      primary_structure: "Workbench queue-detail",
    };
  workbenchGuidanceFrontendContext.implementation_guidance
    .disclosure_implications = {
      product_ui_rule: "Expose queue machinery",
    };
  workbenchGuidanceFrontendContext.implementation_guidance.frontend_posture = {
    navigation_shape: "queue-detail",
  };
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: workbenchGuidanceFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "Skill compilation cannot canonicalize caller-replaced guidance under a seal issued for different frontend guidance.",
  );
  const contradictoryHandoff = structuredClone(handoff);
  contradictoryHandoff.workflow.topology = "workspace";
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: contradictoryHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.equal(error.details.field, "workflow.topology");
      assert.equal(error.details.topology, "workspace");
      assert.equal(
        error.details.topology_contract_kind,
        "artifact_centered",
      );
      return true;
    },
    "Frontend generation must reject contradictory serialized topology representations.",
  );

  const objectOnlyTopologyHandoff = structuredClone(handoff);
  objectOnlyTopologyHandoff.workflow.topology = structuredClone(
    objectOnlyTopologyHandoff.workflow.topology_contract,
  );
  delete objectOnlyTopologyHandoff.workflow.topology_contract;
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: objectOnlyTopologyHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.equal(error.details.observed.topology, "artifact_centered");
      assert.equal(error.details.observed.topology_representation, "object");
      assert.equal(error.details.observed.topology_contract_kind, null);
      assert.equal(error.details.observed.canonical_topology_shape, false);
      return true;
    },
    "Frontend generation must reject object-only Artifact Inspector topology packets.",
  );

  const missingTargetModelHandoff = structuredClone(handoff);
  delete missingTargetModelHandoff.workflow.target_model;
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: missingTargetModelHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.equal(error.details.field, "workflow.target_model");
      assert.equal(
        error.details.diagnostic_code,
        "JK_ARTIFACT_INSPECTOR_LOCUS_MODEL_MISSING",
      );
      return true;
    },
    "Frontend generation must reject an Artifact Inspector handoff without its locus model.",
  );

  const contradictoryFrontendContext = structuredClone(frontendContext);
  contradictoryFrontendContext.workflow.topology = "workspace";
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: contradictoryFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(error.details.field, "workflow.topology");
      assert.equal(error.details.topology, "workspace");
      assert.equal(
        error.details.topology_contract_kind,
        "artifact_centered",
      );
      return true;
    },
    "Skill compilation must reject contradictory serialized topology representations.",
  );

  const objectOnlyTopologyFrontendContext = structuredClone(frontendContext);
  objectOnlyTopologyFrontendContext.workflow.topology = structuredClone(
    objectOnlyTopologyFrontendContext.workflow.topology_contract,
  );
  delete objectOnlyTopologyFrontendContext.workflow.topology_contract;
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: objectOnlyTopologyFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(error.details.observed.topology, "artifact_centered");
      assert.equal(error.details.observed.topology_representation, "object");
      assert.equal(error.details.observed.topology_contract_kind, null);
      assert.equal(error.details.observed.canonical_topology_shape, false);
      return true;
    },
    "Skill compilation must reject object-only Artifact Inspector topology packets.",
  );

  const missingStateGroupsFrontendContext = structuredClone(frontendContext);
  delete missingStateGroupsFrontendContext.workflow.state_groups;
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: missingStateGroupsFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(error.details.field, "workflow.state_groups");
      assert.equal(
        error.details.diagnostic_code,
        "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
      );
      return true;
    },
    "Skill compilation must reject an Artifact Inspector context without its active states.",
  );
  const tamperedHandoffGuidance = structuredClone(handoff);
  tamperedHandoffGuidance.artifact_inspector.registry
    .external_artifact_review_status = "pass";
  tamperedHandoffGuidance.artifact_inspector.design_system_scopes = [];
  tamperedHandoffGuidance.artifact_inspector.boundary_contracts = [];
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: tamperedHandoffGuidance,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "Frontend generation must reject a caller-modified authority summary instead of accepting it under a seal for different handoff authority.",
  );

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
      "deferred interactive attestation",
    ),
  );
  assert.ok(
    skillContext.instruction_markdown.includes(
      "artifact persistent; supporting context revealed from the active locus",
    ),
    "Skill serialization must consume the canonical singular navigation_shape key.",
  );
  assert.ok(
    skillContext.instruction_markdown.includes(
      "Keep the artifact central and persistent",
    ),
    "Skill serialization must consume responsive.wide.",
  );
  assert.ok(
    skillContext.instruction_markdown.includes(
      "Keep the artifact primary, move support into a temporary edge affordance",
    ),
    "Skill serialization must consume responsive.narrow.",
  );
  assert.ok(
    skillContext.instruction_markdown.includes("artifact internal semantics and controls"),
    "Skill serialization must consume external_artifact_authority_owns.",
  );
  assert.ok(
    skillContext.verification_checklist.some((entry) =>
      entry.includes("deferred attestation requirements"),
    ),
  );

  const omittedArtifactGuidanceContext = structuredClone(frontendContext);
  delete omittedArtifactGuidanceContext.implementation_guidance
    .artifact_inspector;
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: omittedArtifactGuidanceContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "Skill compilation must reject an authority-guidance omission under a seal for the complete frontend packet.",
  );

  const tamperedArtifactGuidanceContext = structuredClone(frontendContext);
  tamperedArtifactGuidanceContext.implementation_guidance.artifact_inspector
    .design_system_scopes = [
      structuredClone(
        model.design_system.scopes.find(
          (entry) => entry.scope_id === "primary_artifact",
        ),
      ),
    ];
  tamperedArtifactGuidanceContext.implementation_guidance.artifact_inspector
    .boundary_contracts = [];
  tamperedArtifactGuidanceContext.implementation_guidance.artifact_inspector
    .external_artifact_review_status = "pass";
  tamperedArtifactGuidanceContext.guardrails.artifact_inspector_authority
    .external_artifact_review_status = "pass";
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: tamperedArtifactGuidanceContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "Skill compilation must reject caller-modified authority guidance instead of reconstructing it under a seal for different content.",
  );

  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: frontendContext,
        design_system_adapter: completeExternalDesignSystemAdapter(),
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(error.details.field, "design_system_adapter");
      assert.deepEqual(error.details.judgmentkit_owned_scopes, [
        "inspector_chrome",
        "inspection_overlay",
      ]);
      assert.equal(error.details.external_artifact_scope, "primary_artifact");
      return true;
    },
    "A whole-context frontend adapter must not replace JudgmentKit authority inside Artifact Inspector.",
  );

  const serializedExternalHandoff = structuredClone(handoff);
  serializedExternalHandoff.implementation_contract.design_system_source = {
    ...serializedExternalHandoff.implementation_contract.design_system_source,
    mode: "external_design_system",
    name: "External UI",
    package: "@example/ui",
  };
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: serializedExternalHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(error.details.field, "design_system_source.mode");
      assert.equal(error.details.observed, "external_design_system");
      return true;
    },
    "Serialized external authority must not replace Artifact Inspector chrome authority at the frontend-context boundary.",
  );

  const disguisedExternalHandoff = structuredClone(handoff);
  disguiseExternalDesignAuthority(
    disguisedExternalHandoff.implementation_contract,
  );
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: disguisedExternalHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "Relabeling external authority as judgmentkit_default must invalidate the sealed handoff instead of preserving or canonicalizing caller-owned authority.",
  );

  const disguisedExternalContract = structuredClone(contract);
  disguiseExternalDesignAuthority(
    disguisedExternalContract.implementation_contract,
  );
  const canonicalizedCustomContractHandoff = createUiGenerationHandoff(
    validWorkflowReview,
    { contract: disguisedExternalContract },
  );
  assert.deepEqual(
    canonicalizedCustomContractHandoff.implementation_contract
      .design_system_source,
    handoff.implementation_contract.design_system_source,
  );
  assert.deepEqual(
    canonicalizedCustomContractHandoff.implementation_contract
      .visual_token_adapter,
    handoff.implementation_contract.visual_token_adapter,
  );
  assert.deepEqual(
    canonicalizedCustomContractHandoff.implementation_contract
      .default_ai_native_design_system,
    handoff.implementation_contract.default_ai_native_design_system,
    "A caller-supplied activity contract must not redefine JudgmentKit-owned Artifact Inspector design authority.",
  );

  const canonicalizedCustomContractFrontend =
    createFrontendGenerationContext({
      ui_generation_handoff: handoff,
      contract: disguisedExternalContract,
    });
  assert.deepEqual(
    canonicalizedCustomContractFrontend.implementation_contract
      .design_system_source,
    handoff.implementation_contract.design_system_source,
  );
  assert.deepEqual(
    canonicalizedCustomContractFrontend.implementation_contract
      .visual_token_adapter,
    handoff.implementation_contract.visual_token_adapter,
  );
  assert.equal(
    canonicalizedCustomContractFrontend.implementation_guidance
      .component_contracts.some((entry) => entry.id === "ExternalButton"),
    false,
  );

  const relabeledArtifactHandoff = structuredClone(
    serializedExternalHandoff,
  );
  relabeledArtifactHandoff.surface_type = "workbench";
  relabeledArtifactHandoff.surface_guidance.recommended_surface_type =
    "workbench";
  delete relabeledArtifactHandoff.implementation_contract
    .design_system_scopes;
  delete relabeledArtifactHandoff.implementation_contract.boundary_contracts;
  delete relabeledArtifactHandoff.implementation_contract.artifact_inspector;
  delete relabeledArtifactHandoff.artifact_inspector;
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: relabeledArtifactHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.details.surface_type_candidates[
          "ui_generation_handoff.workflow.topology"
        ],
        "artifact_inspector",
      );
      return true;
    },
    "Artifact-centered serialized handoffs cannot be relabeled to shed scoped authority.",
  );

  const serializedExternalFrontendContext = structuredClone(frontendContext);
  serializedExternalFrontendContext.implementation_contract.design_system_source = {
    ...serializedExternalFrontendContext.implementation_contract
      .design_system_source,
    mode: "external_design_system",
    name: "External UI",
    package: "@example/ui",
  };
  serializedExternalFrontendContext.implementation_guidance.design_system_source =
    structuredClone(
      serializedExternalFrontendContext.implementation_contract
        .design_system_source,
    );
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: serializedExternalFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(error.details.field, "design_system_source.mode");
      assert.equal(error.details.observed, "external_design_system");
      return true;
    },
    "Serialized frontend authority must not bypass the inline adapter guard.",
  );

  const disguisedExternalFrontendContext = structuredClone(frontendContext);
  disguiseExternalDesignAuthority(
    disguisedExternalFrontendContext.implementation_contract,
  );
  disguisedExternalFrontendContext.implementation_guidance
    .design_system_source = structuredClone(
      disguisedExternalFrontendContext.implementation_contract
        .design_system_source,
    );
  disguisedExternalFrontendContext.implementation_guidance
    .component_contracts = structuredClone(
      disguisedExternalFrontendContext.implementation_contract
        .default_ai_native_design_system.component_contracts,
    );
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: disguisedExternalFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "Skill compilation must reject disguised external authority under a seal for different frontend authority.",
  );

  const relabeledArtifactFrontendContext = structuredClone(
    serializedExternalFrontendContext,
  );
  relabeledArtifactFrontendContext.surface_type = "workbench";
  relabeledArtifactFrontendContext.surface_guidance.recommended_surface_type =
    "workbench";
  relabeledArtifactFrontendContext.implementation_guidance.surface_type =
    "workbench";
  delete relabeledArtifactFrontendContext.implementation_contract
    .design_system_scopes;
  delete relabeledArtifactFrontendContext.implementation_contract
    .boundary_contracts;
  delete relabeledArtifactFrontendContext.implementation_contract
    .artifact_inspector;
  delete relabeledArtifactFrontendContext.implementation_guidance
    .artifact_inspector;
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: relabeledArtifactFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(
        error.details.expected.surface_type,
        "artifact_inspector",
      );
      assert.deepEqual(error.details.observed.surface_types, ["workbench"]);
      assert.equal(error.details.observed.topology, "artifact_centered");
      assert.equal(error.details.observed.authority_bundle_active, false);
      return true;
    },
    "Artifact-centered serialized frontend contexts cannot be relabeled to shed scoped authority.",
  );

  const broadenedStateHandoff = structuredClone(handoff);
  broadenedStateHandoff.activity_model.objective +=
    " Automatic resolution for exact matches.";
  broadenedStateHandoff.workflow.state_groups.automation = structuredClone(
    model.state_groups.automation,
  );
  broadenedStateHandoff.implementation_contract.artifact_inspector
    .active_state_groups = ["core", "automation"];
  broadenedStateHandoff.artifact_inspector.registry.active_state_groups = [
    "core",
    "automation",
  ];
  broadenedStateHandoff.artifact_inspector.state_groups.automation =
    structuredClone(model.state_groups.automation);
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: broadenedStateHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "frontend_context_blocked",
      );
      assert.equal(
        error.details.diagnostic_code,
        "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
      );
      assert.deepEqual(error.details.expected, ["core"]);
      return true;
    },
    "Serialized handoff metadata must not broaden reviewed Artifact Inspector state groups.",
  );

  const forgedStateHandoff = structuredClone(handoff);
  forgedStateHandoff.source.reviewed_activity_input +=
    " Automation uses exact match and automatic resolution.";
  forgedStateHandoff.source.reviewed_active_state_groups = [
    "core",
    "automation",
  ];
  forgedStateHandoff.workflow.state_groups.automation = structuredClone(
    model.state_groups.automation,
  );
  forgedStateHandoff.implementation_contract.artifact_inspector
    .active_state_groups = ["core", "automation"];
  forgedStateHandoff.artifact_inspector.registry.active_state_groups = [
    "core",
    "automation",
  ];
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: forgedStateHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(error.code, "frontend_context_blocked");
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "Frontend generation must reject a jointly forged reviewed source and state ceiling.",
  );

  const broadenedStateFrontendContext = structuredClone(frontendContext);
  broadenedStateFrontendContext.activity_model.objective +=
    " Automatic resolution for exact matches.";
  broadenedStateFrontendContext.workflow.state_groups.automation =
    structuredClone(model.state_groups.automation);
  broadenedStateFrontendContext.implementation_contract.artifact_inspector
    .active_state_groups = ["core", "automation"];
  broadenedStateFrontendContext.implementation_guidance.artifact_inspector
    .active_state_groups = ["core", "automation"];
  broadenedStateFrontendContext.implementation_guidance.artifact_inspector
    .registry.active_state_groups = ["core", "automation"];
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: broadenedStateFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(
        error.details.diagnostic_code,
        "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
      );
      assert.deepEqual(error.details.expected, ["core"]);
      return true;
    },
    "Serialized frontend metadata must not broaden reviewed Artifact Inspector state groups.",
  );

  const forgedStateFrontendContext = structuredClone(frontendContext);
  forgedStateFrontendContext.source.reviewed_activity_input +=
    " Automation uses exact match and automatic resolution.";
  forgedStateFrontendContext.source.reviewed_active_state_groups = [
    "core",
    "automation",
  ];
  forgedStateFrontendContext.workflow.state_groups.automation =
    structuredClone(model.state_groups.automation);
  forgedStateFrontendContext.implementation_contract.artifact_inspector
    .active_state_groups = ["core", "automation"];
  forgedStateFrontendContext.implementation_guidance.artifact_inspector
    .active_state_groups = ["core", "automation"];
  forgedStateFrontendContext.implementation_guidance.artifact_inspector
    .registry.active_state_groups = ["core", "automation"];
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: forgedStateFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.equal(
        error.code,
        "invalid_artifact_inspector_authority_contract",
      );
      assert.equal(
        error.details.field,
        "source.artifact_inspector_boundary_integrity",
      );
      return true;
    },
    "Skill compilation must reject a jointly forged reviewed source and state ceiling.",
  );

  const duplicateWorkUnitHandoff = structuredClone(handoff);
  duplicateWorkUnitHandoff.workflow.work_units.push({
    ...structuredClone(duplicateWorkUnitHandoff.workflow.work_units[0]),
    participant_intent: "Orient to an unrelated secondary artifact.",
  });
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: duplicateWorkUnitHandoff,
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.deepEqual(error.details.duplicate_work_unit_ids, ["orient"]);
      return true;
    },
    "A serialized handoff cannot add a divergent duplicate work-unit id before frontend generation.",
  );

  const duplicateWorkUnitFrontendContext = structuredClone(frontendContext);
  duplicateWorkUnitFrontendContext.workflow.work_units.push({
    ...structuredClone(
      duplicateWorkUnitFrontendContext.workflow.work_units[0],
    ),
    participant_intent: "Orient to an unrelated secondary artifact.",
  });
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: duplicateWorkUnitFrontendContext,
        target_client: "codex",
      }),
    (error) => {
      assert.ok(error instanceof JudgmentKitInputError);
      assert.deepEqual(error.details.duplicate_work_unit_ids, ["orient"]);
      return true;
    },
    "A serialized frontend context cannot add a divergent duplicate work-unit id.",
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
  const callerBroadenedContract = createUiImplementationContract({
    surface_type: "artifact_inspector",
    artifact_inspector: {
      active_state_groups: [
        "core",
        "consequential",
        "reusable_guidance",
        "automation",
      ],
    },
  }).implementation_contract;
  const handoff = createUiGenerationHandoff(validWorkflowReview, {
    implementation_contract: callerBroadenedContract,
  });
  const frontendContext = createFrontendGenerationContext({
    ui_generation_handoff: handoff,
  });

  assert.deepEqual(
    callerBroadenedContract.artifact_inspector.active_state_groups,
    ["core", "consequential", "reusable_guidance", "automation"],
  );
  assert.deepEqual(
    handoff.implementation_contract.artifact_inspector.active_state_groups,
    ["core"],
    "Caller implementation metadata must not activate groups absent from the reviewed workflow.",
  );
  assert.deepEqual(
    handoff.artifact_inspector.registry.active_state_groups,
    ["core"],
  );
  assert.deepEqual(
    frontendContext.implementation_guidance.artifact_inspector
      .active_state_groups,
    ["core"],
  );
}

{
  const candidate = createCandidate();
  candidate.artifact = structuredClone(candidate.workflow.artifact);
  candidate.target_model = structuredClone(candidate.workflow.target_model);
  delete candidate.workflow.artifact;
  delete candidate.workflow.target_model;
  const review = reviewCandidate(candidate);
  const handoff = createUiGenerationHandoff(review);

  assert.equal(review.review_status, "ready_for_review");
  assert.deepEqual(review.candidate.workflow.artifact, candidate.artifact);
  assert.deepEqual(review.candidate.workflow.target_model, candidate.target_model);
  assert.equal("artifact" in review.candidate, false);
  assert.equal("target_model" in review.candidate, false);
  assert.equal(handoff.handoff_status, "ready_for_generation");
  assert.deepEqual(handoff.workflow.artifact, candidate.artifact);
  assert.deepEqual(handoff.workflow.target_model, candidate.target_model);
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
    label: "coherently renamed primary artifact",
    mutate(candidate) {
      renamePrimaryArtifact(candidate.workflow);
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
    label: "divergent duplicate work-unit id",
    mutate(candidate) {
      candidate.workflow.work_units.push({
        ...structuredClone(candidate.workflow.work_units[0]),
        participant_intent: "Orient to an unrelated secondary artifact.",
      });
    },
    code: "JK_ARTIFACT_INSPECTOR_WORK_UNIT_CONTRACT_INVALID",
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
    label: "noncanonical declared entry reference",
    mutate(candidate) {
      candidate.workflow.topology.entry_work_unit_id = "select_locus";
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
    label: "completion omits canonical return to orientation",
    mutate(candidate) {
      candidate.workflow.topology.completion_work_unit_ids = ["verify_result"];
    },
    code: "JK_ARTIFACT_INSPECTOR_COMPLETION_REFERENCE_INVALID",
    field: "workflow.topology.completion_work_unit_ids",
  },
  {
    label: "completion reverses canonical ordering",
    mutate(candidate) {
      candidate.workflow.topology.completion_work_unit_ids = [
        "orient",
        "verify_result",
      ];
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
