import assert from "node:assert/strict";
import fs from "node:fs";

import {
  WORKBENCH_SURFACE_PROFILE,
  WORKBENCH_SURFACE_PROFILE_ID,
  JudgmentKitInputError,
  createFrontendGenerationContext as createFrontendGenerationContextRaw,
  createFrontendImplementationSkillContext as createFrontendImplementationSkillContextRaw,
  createUiGenerationHandoff,
  createUiImplementationContract,
  listSurfacePresentationProfiles,
  recommendSurfaceTypes,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";
import { handleToolCall, listTools } from "../src/mcp.mjs";

const EXPECTED_WORKBENCH_PROFILE_ID = "judgmentkit.workbench.operational-v1";
const SPECIMEN_ROOT = new URL(
  "../experiments/workbench-surface-variant/",
  import.meta.url,
);

function normalizeCssValue(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function rootCssCustomProperties(css) {
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  return Object.fromEntries(
    [...rootBlock.matchAll(/(--jk-[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map(
      ([, name, value]) => [name, normalizeCssValue(value)],
    ),
  );
}

const GROUNDED_WORKBENCH_BRIEF = `
  A dispatch lead repeatedly reviews service exceptions in a work queue,
  compares route and customer evidence, decides whether to reassign, hold, or
  escalate each visit, and leaves a handoff receipt for the next owner.
`;

const GROUNDED_REPORT_BRIEF = `
  A policy researcher reads a long report, follows its sections and citations,
  and shares a summary of the findings without taking an operational action.
`;

function readyHandoff(surfaceType = "workbench", implementationContract = {}) {
  const workflowReview = reviewUiWorkflowCandidate(
    GROUNDED_WORKBENCH_BRIEF,
    workbenchWorkflowCandidate(),
    surfaceType ? { surface_type: surfaceType } : {},
  );
  return createUiGenerationHandoff(workflowReview, {
    brief: GROUNDED_WORKBENCH_BRIEF,
    implementation_contract: implementationContract,
  });
}

function createFrontendGenerationContext(options = {}) {
  return createFrontendGenerationContextRaw({
    ...options,
    brief: options.brief ?? GROUNDED_WORKBENCH_BRIEF,
    context_items: options.context_items ?? [],
  });
}

function createFrontendImplementationSkillContext(options = {}) {
  return createFrontendImplementationSkillContextRaw({
    ...options,
    brief: options.brief ?? GROUNDED_WORKBENCH_BRIEF,
    context_items: options.context_items ?? [],
  });
}

function completeExternalDesignSystemAdapter() {
  return {
    design_system_name: "Example UI",
    design_system_package: "@example/ui",
    token_guidance: {
      css_custom_properties: [
        {
          name: "--example-surface",
          role: "surface",
          family: "color",
          value: "#ffffff",
          usage: "Example UI surfaces",
        },
      ],
    },
    font_guidance: {
      font_roles: {
        body: {
          stack: "Inter, sans-serif",
          usage: "Example UI body text",
        },
      },
    },
    icon_guidance: {
      icon_roles: ["action"],
      icon_catalog: {
        source: "external_design_system",
        library: "example-icons",
        package: "@example/icons",
        version: "1.0.0",
        icon_count: 1,
        license: "MIT",
        notice: "Test-only external icon authority.",
        mcp_tools: [],
      },
    },
    components: ["Button"],
  };
}

function externalImplementationContract() {
  return createUiImplementationContract({
    design_system_adapter: completeExternalDesignSystemAdapter(),
  }).implementation_contract;
}

function neutralFallbackReview() {
  return recommendSurfaceTypes("Surface.", {
    activity_review: {
      review_status: "ready_for_review",
      guardrails: {
        source_missing_evidence: { decision: true },
      },
      candidate: {
        activity_model: {},
        interaction_contract: {},
        disclosure_policy: {},
      },
    },
  });
}

function workbenchWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Service exception workspace",
      topology: "workspace",
      work_units: ["Inspect evidence", "Choose action", "Leave handoff"],
      primary_actions: ["Reassign", "Hold", "Escalate"],
      decision_points: ["Choose the next operational action."],
      completion_state: "The next owner receives a reasoned handoff.",
    },
    surface_set: [
      {
        name: "Service exception workspace",
        purpose: "Keep the selected exception, evidence, decision, and handoff together.",
        sections: ["Work queue", "Detail workspace", "Evidence", "Handoff"],
        controls: ["Select exception", "Choose action", "Complete handoff"],
        relationship_to_workflow: "Supports repeated exception review.",
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
  };
}

function assertSelectedWorkbenchProfile(frontendContext, message) {
  assert.ok(frontendContext.selected_surface_profile, message);
  assert.equal(
    frontendContext.selected_surface_profile.id,
    EXPECTED_WORKBENCH_PROFILE_ID,
  );
  assert.equal(frontendContext.selected_surface_profile.status, "supported");
}

function assertNoSelectedSurfaceProfile(frontendContext, message) {
  assert.equal("selected_surface_profile" in frontendContext, false, message);
}

function assertInputError(callback, message) {
  assert.throws(
    callback,
    (error) => error instanceof JudgmentKitInputError,
    message,
  );
}

// Stable package exports are immutable authority; catalog callers receive clones.
assert.equal(WORKBENCH_SURFACE_PROFILE_ID, EXPECTED_WORKBENCH_PROFILE_ID);
assert.equal(WORKBENCH_SURFACE_PROFILE.id, EXPECTED_WORKBENCH_PROFILE_ID);
assert.equal(WORKBENCH_SURFACE_PROFILE.surface_type, "workbench");
assert.equal(WORKBENCH_SURFACE_PROFILE.status, "supported");
assert.equal(WORKBENCH_SURFACE_PROFILE.authority.public_contract, true);
assert.equal(WORKBENCH_SURFACE_PROFILE.authority.runtime_renderer, false);
assert.ok(Object.isFrozen(WORKBENCH_SURFACE_PROFILE));
assert.ok(Object.isFrozen(WORKBENCH_SURFACE_PROFILE.authority));
assert.deepEqual(
  new Set(WORKBENCH_SURFACE_PROFILE.activation.accepted_requests),
  new Set(["auto", "none", EXPECTED_WORKBENCH_PROFILE_ID]),
);
assert.equal(
  JSON.stringify(WORKBENCH_SURFACE_PROFILE).includes("Agent Workflow Builder"),
  false,
);
assert.equal(
  "required_regions" in WORKBENCH_SURFACE_PROFILE.composition,
  false,
  "The Workbench pattern contract, not the presentation profile, owns required regions.",
);
assert.equal(
  "expected_controls" in WORKBENCH_SURFACE_PROFILE.composition,
  false,
  "The Workbench pattern contract, not the presentation profile, owns expected controls.",
);

{
  const listedProfiles = listSurfacePresentationProfiles();
  const listedWorkbench = listedProfiles.find(
    (entry) => entry.id === EXPECTED_WORKBENCH_PROFILE_ID,
  );

  assert.ok(listedWorkbench, "The supported profile catalog must include Workbench.");
  assert.notStrictEqual(listedWorkbench, WORKBENCH_SURFACE_PROFILE);
  assert.deepEqual(listedWorkbench, WORKBENCH_SURFACE_PROFILE);

  listedWorkbench.name = "Tampered catalog clone";
  assert.notEqual(WORKBENCH_SURFACE_PROFILE.name, "Tampered catalog clone");
  assert.notEqual(
    listSurfacePresentationProfiles().find(
      (entry) => entry.id === EXPECTED_WORKBENCH_PROFILE_ID,
    ).name,
    "Tampered catalog clone",
  );
}

// Omitted profile selection defaults to auto for an explicitly selected Workbench.
{
  const omitted = createFrontendGenerationContext({
    ui_generation_handoff: readyHandoff(),
  });
  const explicitlyAutomatic = createFrontendGenerationContext({
    ui_generation_handoff: readyHandoff(),
    surface_profile: "auto",
  });
  const explicitlyUndefined = createFrontendGenerationContext({
    ui_generation_handoff: readyHandoff(),
    surface_profile: undefined,
  });

  assertSelectedWorkbenchProfile(
    omitted,
    "Omission must default to the supported automatic Workbench profile.",
  );
  assertSelectedWorkbenchProfile(explicitlyAutomatic);
  assertSelectedWorkbenchProfile(explicitlyUndefined);
  assert.equal(omitted.source.surface_type_source, "provided_surface_type");
  assert.equal(omitted.source.surface_profile_request, "auto");
}

// None is a deliberate opt-out even when Workbench is otherwise eligible.
{
  const optedOut = createFrontendGenerationContext({
    ui_generation_handoff: readyHandoff(),
    surface_profile: "none",
  });

  assertNoSelectedSurfaceProfile(
    optedOut,
    "surface_profile none must preserve an unprofiled frontend context.",
  );
  assert.equal(optedOut.source.surface_profile_request, "none");
}

// Auto accepts grounded medium/high Workbench evidence without a supplied type.
{
  const groundedReview = recommendSurfaceTypes(GROUNDED_WORKBENCH_BRIEF);
  assert.equal(groundedReview.recommended_surface_type, "workbench");
  assert.ok(["medium", "high"].includes(groundedReview.confidence));

  for (const confidence of ["medium", "high"]) {
    const frontendContext = createFrontendGenerationContext({
      ui_generation_handoff: readyHandoff(null),
      surface_review: { ...structuredClone(groundedReview), confidence },
      surface_profile: "auto",
    });

    assert.equal(frontendContext.source.surface_type_source, "surface_review");
    assertSelectedWorkbenchProfile(
      frontendContext,
      `Auto must select a ${confidence}-confidence Workbench recommendation.`,
    );
    assert.equal(frontendContext.selected_surface_profile.selection.confidence, confidence);
  }
}

// A neutral low-confidence fallback never supplies Workbench presentation authority.
{
  const neutralFallback = neutralFallbackReview();
  assert.equal(neutralFallback.recommended_surface_type, "workbench");
  assert.equal(neutralFallback.confidence, "low");

  for (const request of [undefined, "auto"]) {
    const frontendContext = createFrontendGenerationContext({
      ui_generation_handoff: readyHandoff(null),
      surface_review: neutralFallback,
      ...(request === undefined ? {} : { surface_profile: request }),
    });

    assertNoSelectedSurfaceProfile(
      frontendContext,
      "Low-confidence fallback must not activate the supported profile.",
    );
  }

  assertInputError(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: readyHandoff(null),
        surface_review: neutralFallback,
        surface_profile: EXPECTED_WORKBENCH_PROFILE_ID,
      }),
    "An exact profile id must not turn low-only fallback evidence into Workbench authority.",
  );
}

// Low-confidence lineage remains intact across the real workflow handoff boundary.
{
  const workflowReview = reviewUiWorkflowCandidate(
    GROUNDED_WORKBENCH_BRIEF,
    workbenchWorkflowCandidate(),
    { surface_review: neutralFallbackReview() },
  );
  assert.equal(workflowReview.review_status, "ready_for_review");
  assert.equal(workflowReview.surface_type, "workbench");
  assert.equal(workflowReview.surface_guidance.confidence, "low");

  const handoff = createUiGenerationHandoff(workflowReview, {
    brief: GROUNDED_WORKBENCH_BRIEF,
  });
  assert.equal(handoff.surface_type, "workbench");
  assert.equal(handoff.surface_guidance.confidence, "low");

  const frontendContext = createFrontendGenerationContext({
    ui_generation_handoff: handoff,
    brief: GROUNDED_WORKBENCH_BRIEF,
  });
  assert.equal(
    frontendContext.source.surface_type_source,
    "ui_generation_handoff",
  );
  assertNoSelectedSurfaceProfile(
    frontendContext,
    "A low-confidence fallback must remain unprofiled after a real handoff.",
  );

  assertInputError(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: handoff,
        brief: GROUNDED_WORKBENCH_BRIEF,
        surface_profile: EXPECTED_WORKBENCH_PROFILE_ID,
      }),
    "An exact profile request must not upgrade low-confidence handoff lineage.",
  );
}

// Auto is inert for other surfaces; the exact Workbench id rejects a mismatch.
{
  for (const request of [undefined, "auto"]) {
    const frontendContext = createFrontendGenerationContext({
      ui_generation_handoff: readyHandoff("content_report"),
      ...(request === undefined ? {} : { surface_profile: request }),
    });

    assert.equal(frontendContext.surface_type, "content_report");
    assertNoSelectedSurfaceProfile(frontendContext);
  }

  assertInputError(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: readyHandoff("content_report"),
        surface_profile: EXPECTED_WORKBENCH_PROFILE_ID,
      }),
    "The exact Workbench profile must reject a mismatched surface type.",
  );
}

// JudgmentKit profiles never fall back into external design-system authority.
{
  const externalHandoff = readyHandoff(
    "workbench",
    externalImplementationContract(),
  );

  for (const request of [undefined, "auto"]) {
    const frontendContext = createFrontendGenerationContext({
      ui_generation_handoff: externalHandoff,
      ...(request === undefined ? {} : { surface_profile: request }),
    });

    assertNoSelectedSurfaceProfile(
      frontendContext,
      "Automatic selection must remain inert for an external design system.",
    );
  }

  assertInputError(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: externalHandoff,
        surface_profile: EXPECTED_WORKBENCH_PROFILE_ID,
      }),
    "An exact JudgmentKit profile request must reject external design-system authority.",
  );
}

// Conflicting surface evidence must not silently change profile eligibility.
{
  const workbenchReview = recommendSurfaceTypes(GROUNDED_WORKBENCH_BRIEF);
  const reportReview = recommendSurfaceTypes(GROUNDED_REPORT_BRIEF);

  assert.equal(workbenchReview.recommended_surface_type, "workbench");
  assert.equal(reportReview.recommended_surface_type, "content_report");

  assertInputError(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: readyHandoff(null),
        surface_type: "content_report",
        surface_review: workbenchReview,
      }),
    "An explicit surface type that conflicts with the review must reject.",
  );
  assertInputError(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: readyHandoff("workbench"),
        surface_review: reportReview,
      }),
    "A selected handoff surface that conflicts with the review must reject.",
  );
}

// Stable selection validates malformed requests.
for (const invalidRequest of ["unknown.profile-v1", null, "", " ", 42]) {
  assertInputError(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: readyHandoff(),
        surface_profile: invalidRequest,
      }),
    `Invalid surface profile request ${JSON.stringify(invalidRequest)} must reject.`,
  );
}

const profiledFrontendContext = createFrontendGenerationContext({
  ui_generation_handoff: readyHandoff(),
});
const selectedProfile = profiledFrontendContext.selected_surface_profile;

assertSelectedWorkbenchProfile(profiledFrontendContext);
assert.equal(selectedProfile.surface_type, "workbench");
assert.equal(
  selectedProfile.authority.design_system_source_mode,
  "judgmentkit_default",
);
assert.equal(
  selectedProfile.authority.visual_token_adapter_id,
  "judgmentkit.visual-token-adapter.boundary-v1",
);
assert.deepEqual(
  new Set(selectedProfile.appearance.supported_modes),
  new Set(["light", "dark", "system"]),
);
assert.equal(selectedProfile.appearance.default_mode, "system");
assert.equal(
  selectedProfile.appearance.token_source,
  "implementation_contract.visual_token_adapter.appearance_token_sets",
);
assert.ok(
  selectedProfile.typography.css_custom_properties.some(
    (entry) => entry.name === "--jk-type-size-body",
  ),
);
assert.ok(
  selectedProfile.density.css_custom_properties.some(
    (entry) => entry.name === "--jk-density-panel-padding",
  ),
);

// The compiled frontend packet propagates only canonical supported profile data.
const profiledSkillContext = createFrontendImplementationSkillContext({
  frontend_generation_context: profiledFrontendContext,
});

assert.equal(profiledSkillContext.design_system_policy.mode, "judgmentkit_default");
assert.deepEqual(profiledSkillContext.selected_surface_profile, selectedProfile);
assert.equal(
  profiledSkillContext.surface_type_guidance.presentation_profile_id,
  EXPECTED_WORKBENCH_PROFILE_ID,
);
assert.ok(profiledSkillContext.instruction_markdown.includes(EXPECTED_WORKBENCH_PROFILE_ID));
assert.equal(
  profiledSkillContext.instruction_markdown.includes("experimental surface profile"),
  false,
);

{
  const tamperedFrontendContext = structuredClone(profiledFrontendContext);
  tamperedFrontendContext.selected_surface_profile.name = "Injected profile";
  tamperedFrontendContext.selected_surface_profile.status = "experimental";
  tamperedFrontendContext.selected_surface_profile.authority.public_contract = false;

  assertInputError(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: tamperedFrontendContext,
      }),
    "Compiled context must reject profile metadata changed after the frontend boundary.",
  );
}

for (const [field, value] of [
  ["request", "none"],
  ["surface_type_source", "surface_review"],
  ["confidence", "low"],
]) {
  const tamperedFrontendContext = structuredClone(profiledFrontendContext);
  tamperedFrontendContext.selected_surface_profile.selection[field] = value;

  assertInputError(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: tamperedFrontendContext,
      }),
    `Compiled context must reject tampered profile selection ${field}.`,
  );
}

for (const invalidId of [undefined, "auto", "none"]) {
  const tamperedFrontendContext = structuredClone(profiledFrontendContext);
  if (invalidId === undefined) {
    delete tamperedFrontendContext.selected_surface_profile.id;
  } else {
    tamperedFrontendContext.selected_surface_profile.id = invalidId;
  }

  assertInputError(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: tamperedFrontendContext,
      }),
    `Compiled context must reject non-canonical profile id ${String(invalidId)}.`,
  );
}

{
  const optedOutFrontendContext = createFrontendGenerationContext({
    ui_generation_handoff: readyHandoff(),
    surface_profile: "none",
  });
  optedOutFrontendContext.selected_surface_profile = structuredClone(selectedProfile);
  optedOutFrontendContext.selected_surface_profile.selection.request = "none";

  assertInputError(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: optedOutFrontendContext,
      }),
    "Compiled context must not restore a profile after an explicit opt-out.",
  );
}

{
  const lowConfidenceFrontendContext = createFrontendGenerationContext({
    ui_generation_handoff: readyHandoff(null),
    surface_review: neutralFallbackReview(),
  });
  lowConfidenceFrontendContext.selected_surface_profile = structuredClone(selectedProfile);
  lowConfidenceFrontendContext.selected_surface_profile.selection = {
    request: "auto",
    surface_type_source: "surface_review",
    confidence: "low",
  };

  assertInputError(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: lowConfidenceFrontendContext,
      }),
    "Compiled context must not restore a profile from low-confidence fallback evidence.",
  );
}

{
  const mismatchedFrontendContext = structuredClone(profiledFrontendContext);
  mismatchedFrontendContext.selected_surface_profile.surface_type = "content_report";

  assertInputError(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: mismatchedFrontendContext,
      }),
    "Compiled context must reject a surface-profile type mismatch.",
  );
}

{
  const unknownFrontendContext = structuredClone(profiledFrontendContext);
  unknownFrontendContext.selected_surface_profile.id = "unknown.profile-v1";

  assertInputError(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: unknownFrontendContext,
      }),
    "Compiled context must reject an unknown injected profile id.",
  );
}

{
  const skillContext = createFrontendImplementationSkillContext({
    frontend_generation_context: profiledFrontendContext,
    design_system_adapter: completeExternalDesignSystemAdapter(),
  });

  assert.equal(skillContext.design_system_policy.mode, "external_design_system");
  assert.equal("selected_surface_profile" in skillContext, false);
  assert.equal("presentation_profile_id" in skillContext.surface_type_guidance, false);
}

// The retained specimen remains drift-locked to the supported profile and tokens.
{
  const css = fs.readFileSync(new URL("styles.css", SPECIMEN_ROOT), "utf8");
  const specimen = JSON.parse(
    fs.readFileSync(new URL("specimen.json", SPECIMEN_ROOT), "utf8"),
  );
  const cssProperties = rootCssCustomProperties(css);
  const profileProperties = [
    ...WORKBENCH_SURFACE_PROFILE.typography.css_custom_properties,
    ...WORKBENCH_SURFACE_PROFILE.density.css_custom_properties,
  ];
  const specimenProperties = {
    ...specimen.visual_contract.profile_tokens.type,
    ...specimen.visual_contract.profile_tokens.density,
  };

  assert.equal(specimen.profile.id, WORKBENCH_SURFACE_PROFILE.id);
  assert.equal(specimen.profile.version, WORKBENCH_SURFACE_PROFILE.version);
  assert.equal(specimen.profile.status, WORKBENCH_SURFACE_PROFILE.status);
  assert.equal(
    specimen.profile.supported,
    WORKBENCH_SURFACE_PROFILE.status === "supported",
  );
  assert.equal(
    specimen.profile.public_contract,
    WORKBENCH_SURFACE_PROFILE.authority.public_contract,
  );
  assert.equal(
    specimen.profile.runtime_renderer,
    WORKBENCH_SURFACE_PROFILE.authority.runtime_renderer,
  );
  assert.equal(specimen.profile.surface_type, WORKBENCH_SURFACE_PROFILE.surface_type);
  assert.deepEqual(
    new Set(specimen.profile.activation.accepted_requests),
    new Set(WORKBENCH_SURFACE_PROFILE.activation.accepted_requests),
  );
  assert.deepEqual(
    specimen.profile.activation.auto_requires_confidence,
    WORKBENCH_SURFACE_PROFILE.activation.accepted_confidence,
  );

  for (const property of profileProperties) {
    assert.equal(
      cssProperties[property.name],
      normalizeCssValue(property.value),
      `${property.name} must not drift between the supported profile and specimen CSS.`,
    );
    assert.equal(
      normalizeCssValue(specimenProperties[property.name]),
      normalizeCssValue(property.value),
      `${property.name} must not drift between the supported profile and specimen metadata.`,
    );
  }

  for (const mode of ["light", "dark"]) {
    const tokenSet = profiledSkillContext.token_guidance.appearance_token_sets.find(
      (entry) => entry.mode === mode,
    );
    const canonicalTokens = Object.fromEntries(
      tokenSet.css_custom_properties.map((entry) => [entry.name, entry.value]),
    );

    for (const [name, value] of Object.entries(
      specimen.visual_contract.canonical_tokens[mode],
    )) {
      assert.equal(
        canonicalTokens[name],
        value,
        `${name} must inherit the canonical ${mode} JudgmentKit token exactly.`,
      );
    }
  }
}

// MCP exposes and forwards only the supported public input name.
{
  const tool = listTools().find(
    (entry) => entry.name === "create_frontend_generation_context",
  );
  const properties = tool.inputSchema.properties;

  assert.deepEqual(
    new Set(properties.surface_profile.enum),
    new Set([
      "auto",
      "none",
      EXPECTED_WORKBENCH_PROFILE_ID,
      "judgmentkit.artifact-inspector.v1",
    ]),
  );
  assert.equal("experimental_surface_profile" in properties, false);

  const automaticResult = await handleToolCall("create_frontend_generation_context", {
    brief: GROUNDED_WORKBENCH_BRIEF,
    ui_generation_handoff: readyHandoff(),
  });
  const explicitResult = await handleToolCall("create_frontend_generation_context", {
    brief: GROUNDED_WORKBENCH_BRIEF,
    ui_generation_handoff: readyHandoff(),
    surface_profile: EXPECTED_WORKBENCH_PROFILE_ID,
  });
  const optedOutResult = await handleToolCall("create_frontend_generation_context", {
    brief: GROUNDED_WORKBENCH_BRIEF,
    ui_generation_handoff: readyHandoff(),
    surface_profile: "none",
  });

  assert.equal(
    automaticResult.selected_surface_profile.id,
    EXPECTED_WORKBENCH_PROFILE_ID,
  );
  assert.equal(
    explicitResult.selected_surface_profile.id,
    EXPECTED_WORKBENCH_PROFILE_ID,
  );
  assertNoSelectedSurfaceProfile(optedOutResult);
}

console.log("supported Workbench surface profile checks passed.");
