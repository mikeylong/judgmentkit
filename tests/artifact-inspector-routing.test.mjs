import assert from "node:assert/strict";

import {
  recommendSurfaceTypes,
  recommendUiWorkflowProfiles,
} from "../src/index.mjs";

const MANDATORY_EVIDENCE_IDS = [
  "rendered_artifact_is_primary",
  "locus_selection_required",
  "support_context_is_locus_relative",
];

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

function artifactEvidence(review) {
  return review.evidence.artifact_inspector;
}

function surfaceScore(review, surfaceType) {
  return review.evidence.surface_type_scores.find(
    (entry) => entry.surface_type === surfaceType,
  );
}

function workflowProfile(review, profileId) {
  return review.recommendations.find(
    (entry) => entry.profile_id === profileId,
  );
}

{
  const review = recommendSurfaceTypes(ARTIFACT_ACTIVITY);
  const evidence = artifactEvidence(review);
  const score = surfaceScore(review, "artifact_inspector");

  assert.equal(review.status, "ready");
  assert.equal(review.recommended_surface_type, "artifact_inspector");
  assert.equal(review.profile_id, "artifact-inspector-ui");
  assert.equal(
    review.primary_structure,
    "persistent artifact, selectable loci, contextual support, local feedback, and artifact-local completion",
  );
  assert.equal(review.density, "artifact-first contextual");
  assert.equal(
    review.navigation_shape,
    "artifact persistent; supporting context revealed from the active locus",
  );
  assert.equal(review.routing_conflict, undefined);
  assert.deepEqual(evidence.mandatory_evidence_ids, MANDATORY_EVIDENCE_IDS);
  assert.deepEqual(evidence.matched_mandatory_evidence, MANDATORY_EVIDENCE_IDS);
  assert.deepEqual(evidence.missing_mandatory_evidence, []);
  assert.equal(evidence.status, "matched");
  assert.equal(evidence.conflict, false);
  assert.equal(score.profile_id, "artifact-inspector-ui");
  assert.equal(score.profile_status, "recommended");
  assert.ok(
    review.interaction_implications.primary_structure.includes(
      "Persistent artifact",
    ),
  );

  const profiles = recommendUiWorkflowProfiles(ARTIFACT_ACTIVITY);
  const artifactProfile = workflowProfile(profiles, "artifact-inspector-ui");
  assert.deepEqual(profiles.recommended_profile_ids, ["artifact-inspector-ui"]);
  assert.equal(artifactProfile.status, "recommended");
  assert.equal(artifactProfile.pattern_id, "artifact-inspector");
  assert.equal(artifactProfile.trigger_match_count, 3);
  assert.deepEqual(
    artifactProfile.matched_triggers.slice(0, 3),
    MANDATORY_EVIDENCE_IDS,
  );
}

const ADDITIONAL_POSITIVE_FIXTURES = [
  `
    A fact checker inspects one rendered document that remains the primary
    artifact. They must select a passage inside the document. A source-backed
    correction attaches to that selected passage. They preview the correction
    and verify the local result beside the passage.
  `,
  `
    An analyst inspects one rendered diagram that remains the primary artifact.
    They must select a specific node. The rule and evidence that produced it
    attach to that selected node. They preview the relation and verify the local
    result beside the diagram.
  `,
  `
    A designer inspects one rendered composition that remains the primary
    artifact. They must mark a specific region. Evidence and a bounded change
    attach to that selected region. They preview the change and verify its local
    result beside the composition.
  `,
];

for (const fixture of ADDITIONAL_POSITIVE_FIXTURES) {
  const first = recommendSurfaceTypes(fixture);
  const second = recommendSurfaceTypes(fixture);

  assert.equal(first.recommended_surface_type, "artifact_inspector");
  assert.deepEqual(
    artifactEvidence(first).matched_mandatory_evidence,
    MANDATORY_EVIDENCE_IDS,
  );
  assert.deepEqual(
    second,
    first,
    "Repeated routing from the same fixture must remain deterministic.",
  );
}

const NEGATIVE_ROUTING_FIXTURES = [
  [
    "operator_review",
    `A release lead reviews a queue of AI-generated cases. The queue is the
     primary work surface. They compare evidence and risk, approve, reject,
     return, or hand off each case, and leave an audit receipt.`,
  ],
  [
    "workbench",
    `A studio lead uses a creation workspace with a canvas and persistent tools
     to compare multiple objects, decide their arrangement, edit the
     composition, and leave a project handoff.`,
  ],
  [
    "content_report",
    `A policy analyst reads a linear evidence memo. The activity is
     understanding the narrative, citing references, and sharing the memo.
     Completion means reading and sharing the report.`,
  ],
  [
    "conversation",
    `A support agent handles an open-ended live chat with attachments.
     Participants send messages, reply with context, and keep the conversation
     thread active until it can be closed.`,
  ],
  [
    "dashboard_monitor",
    `An operations lead monitors a status dashboard across many items. The
     activity is tracking health, trends, and alerts. Completion means status
     awareness and knowing whether follow-up is needed.`,
  ],
  [
    "form_flow",
    `An intake coordinator completes a structured submission form. The activity
     is entering required fields, resolving validation errors, submitting the
     record, and seeing confirmation.`,
  ],
  [
    "form_flow",
    `An operations admin updates a structured record-entry form while an
     incidental rendered artifact preview remains visible. The activity is
     entering required fields, resolving validation errors, submitting the
     record, and seeing confirmation; no artifact locus is selected.`,
  ],
  [
    "setup_debug_tool",
    `A platform engineer uses a setup and debugging tool for an integration.
     The activity is configuring connection details, inspecting a JSON schema
     and API endpoint, testing the connection, resolving setup errors, and
     saving a validated configuration.`,
  ],
];

for (const [expectedSurfaceType, fixture] of NEGATIVE_ROUTING_FIXTURES) {
  const review = recommendSurfaceTypes(fixture);

  assert.equal(review.recommended_surface_type, expectedSurfaceType);
  assert.notEqual(review.recommended_surface_type, "artifact_inspector");
  assert.equal(surfaceScore(review, "artifact_inspector"), undefined);
}

{
  const incidentalSelectablePreview = `
    A clinic coordinator completes a structured intake form that is the primary
    work surface. Completion means required field entry, validation, and
    submission of the intake record. An incidental rendered-interface preview
    remains visible; the coordinator may select a control in that preview and
    supporting evidence attaches to the selected control, but the preview does
    not determine completion.
  `;
  const first = recommendSurfaceTypes(incidentalSelectablePreview);
  const second = recommendSurfaceTypes(incidentalSelectablePreview);
  const profiles = recommendUiWorkflowProfiles(incidentalSelectablePreview);
  const evidence = artifactEvidence(first);
  const renderedPrimary = evidence.positives.find(
    (entry) => entry.id === "rendered_artifact_is_primary",
  );

  assert.equal(first.recommended_surface_type, "form_flow");
  assert.notEqual(first.recommended_surface_type, "artifact_inspector");
  assert.equal(renderedPrimary.matched, false);
  assert.ok(
    evidence.missing_mandatory_evidence.includes(
      "rendered_artifact_is_primary",
    ),
  );
  assert.ok(
    !profiles.recommended_profile_ids.includes("artifact-inspector-ui"),
  );
  assert.deepEqual(
    second,
    first,
    "An incidental selectable preview must route deterministically.",
  );
}

{
  const partialActivity = `
    Build an artifact inspector for one rendered interface that remains the
    primary artifact. The specialist must select a specific control. Supporting
    reference material is shown in a detached global library with no relation to
    the selected control.
  `;
  const review = recommendSurfaceTypes(partialActivity);
  const evidence = artifactEvidence(review);

  assert.ok(evidence, "Explicit inspector intent should expose partial evidence.");
  assert.equal(evidence.status, "partial");
  assert.equal(evidence.mandatory_evidence_ids.length, 3);
  assert.ok(
    evidence.missing_mandatory_evidence.includes(
      "support_context_is_locus_relative",
    ),
  );
  assert.notEqual(review.recommended_surface_type, "artifact_inspector");
  assert.equal(
    surfaceScore(review, "artifact_inspector").profile_status,
    "not_recommended",
  );

  const profiles = recommendUiWorkflowProfiles(partialActivity);
  assert.equal(
    workflowProfile(profiles, "artifact-inspector-ui").status,
    "not_recommended",
  );
  assert.ok(!profiles.recommended_profile_ids.includes("artifact-inspector-ui"));
}

{
  const threadWordOnly = `${ARTIFACT_ACTIVITY}
    The verified receipt is also named in the project thread for later follow-up.
  `;
  const review = recommendSurfaceTypes(threadWordOnly);
  const evidence = artifactEvidence(review);
  const conversationExclusion = evidence.exclusions.find(
    (entry) => entry.id === "conversation_turns_are_primary",
  );

  assert.equal(review.recommended_surface_type, "artifact_inspector");
  assert.equal(conversationExclusion.matched, false);
  assert.equal(
    evidence.matched_exclusion_evidence.includes(
      "conversation_turns_are_primary",
    ),
    false,
  );
  assert.equal(surfaceScore(review, "conversation").trigger_match_count, 0);
}

const EXCLUSION_CASES = [
  [
    "queue_or_case_is_primary",
    "A review queue is the primary work surface and the team works through that queue.",
  ],
  [
    "many_items_are_primary",
    "Multiple artifacts are primary peers and must be reviewed side by side.",
  ],
  [
    "open_ended_creation_is_primary",
    "The primary activity is freely creating and editing the artifact.",
  ],
  [
    "conversation_turns_are_primary",
    "The activity is an open-ended live chat where participants send messages, reply with context, and keep the conversation thread active.",
  ],
  [
    "linear_reading_is_completion",
    "Completion means reading, understanding, citing, and sharing the report.",
  ],
  [
    "monitoring_is_completion",
    "The primary activity is monitoring status and tracking trends.",
  ],
  [
    "configuration_is_completion",
    "The primary activity is configuration and debugging; completion means a valid setup.",
  ],
];

for (const [exclusionId, conflictingStatement] of EXCLUSION_CASES) {
  const conflictingBrief = `${ARTIFACT_ACTIVITY}\n${conflictingStatement}`;
  const review = recommendSurfaceTypes(conflictingBrief);
  const evidence = artifactEvidence(review);

  assert.equal(
    review.status,
    "review_required",
    `${exclusionId} must force explicit routing review.`,
  );
  assert.equal(
    review.recommended_surface_type,
    null,
    `${exclusionId} must not be resolved by a keyword tie-break.`,
  );
  assert.equal(review.routing_conflict.status, "review_required");
  assert.deepEqual(
    review.routing_conflict.matched_mandatory_evidence,
    MANDATORY_EVIDENCE_IDS,
  );
  assert.ok(
    review.routing_conflict.matched_exclusion_evidence.includes(exclusionId),
    `${exclusionId} must appear in the conflict packet.`,
  );
  assert.equal(evidence.status, "review_required");
  assert.equal(evidence.conflict, true);

  const profiles = recommendUiWorkflowProfiles(conflictingBrief);
  const artifactProfile = workflowProfile(profiles, "artifact-inspector-ui");
  assert.equal(artifactProfile.status, "review_required");
  assert.ok(artifactProfile.matched_exclusions.includes(exclusionId));
  assert.deepEqual(profiles.review_required_profile_ids, [
    "artifact-inspector-ui",
  ]);
  assert.ok(!profiles.recommended_profile_ids.includes("artifact-inspector-ui"));
}

const SECONDARY_ARTIFACT_MARKETING_BRIEFS = [
  `
    A growth marketer creates a public landing page for prospects. The primary
    activity is explaining the offer, proof, and benefits, then helping visitors
    request a demo. A secondary rendered interface remains visible. Visitors may
    select a specific control, and supporting evidence attaches to that selected
    control, but the interface only supports the offer. Completion is a qualified
    demo request.
  `,
  `
    A growth marketer creates a public landing page for prospects. The primary
    activity is explaining the offer and helping visitors request a demo. A
    rendered interface remains visible as supporting context. Visitors may select
    a control and evidence attaches there, but completion is the demo request.
  `,
  `
    A growth marketer creates a public landing page for prospects. The primary
    activity is explaining the offer and helping visitors request a demo. A
    rendered interface remains visible but is secondary to the offer. Visitors
    may select a control and evidence attaches there. Completion is the request.
  `,
  `
    A growth marketer creates a public landing page for prospects. The primary
    activity is explaining the offer and helping visitors request a demo. A
    rendered interface serves only as supporting context. Visitors may select a
    control and evidence attaches there. Completion is the request.
  `,
  `
    A growth marketer creates a public landing page for prospects. The primary
    activity is explaining the offer and helping visitors request a demo. A
    rendered interface remains visible only as supporting context. Visitors may
    select a control and evidence attaches there. Completion is the request.
  `,
  `
    A growth marketer creates a public landing page for prospects. The primary
    activity is explaining the offer and helping visitors request a demo. A
    rendered interface is merely supporting context. Visitors may select a
    control and evidence attaches there. Completion is the request.
  `,
  `
    A growth marketer creates a public landing page for prospects. The primary
    activity is explaining the offer and helping visitors request a demo. A
    rendered interface remains visible; it only supports the offer. Visitors may
    select a control and evidence attaches there. Completion is the request.
  `,
  `
    A growth marketer creates a public landing page for prospects. The primary
    activity is explaining the offer and helping visitors request a demo. A
    rendered interface supports the offer rather than serving as the primary
    object. Visitors may select a control and evidence attaches there.
  `,
];

for (const secondaryArtifactMarketingBrief of SECONDARY_ARTIFACT_MARKETING_BRIEFS) {
  const review = recommendSurfaceTypes(secondaryArtifactMarketingBrief);
  const evidence = artifactEvidence(review);

  assert.equal(review.recommended_surface_type, "marketing");
  if (evidence) {
    const renderedPrimary = evidence.positives.find(
      (entry) => entry.id === "rendered_artifact_is_primary",
    );
    assert.equal(renderedPrimary.matched, false);
    assert.equal(
      evidence.matched_mandatory_evidence.includes(
        "rendered_artifact_is_primary",
      ),
      false,
    );
    assert.ok(
      evidence.missing_mandatory_evidence.includes(
        "rendered_artifact_is_primary",
      ),
    );
    assert.equal(surfaceScore(review, "artifact_inspector").score, 0);
  } else {
    assert.equal(surfaceScore(review, "artifact_inspector"), undefined);
  }
}

{
  const review = recommendSurfaceTypes(`${ARTIFACT_ACTIVITY}
    A separate secondary rendered diagram remains visible as supporting context.
  `);

  assert.equal(review.recommended_surface_type, "artifact_inspector");
  assert.deepEqual(
    artifactEvidence(review).matched_mandatory_evidence,
    MANDATORY_EVIDENCE_IDS,
    "A distinct secondary artifact must not erase an explicitly primary rendered artifact.",
  );
}

{
  const legacyMarketingBrief = `
    A growth marketer is creating a public landing page for prospects. The
    activity is explaining the offer and proof, then helping visitors request a
    demo. The outcome is a qualified demo request.
  `;
  const review = recommendSurfaceTypes(legacyMarketingBrief);

  assert.equal(review.recommended_surface_type, "marketing");
  assert.equal(review.evidence.artifact_inspector, undefined);
  assert.deepEqual(
    review.evidence.surface_type_scores.map((entry) => entry.surface_type),
    [
      "marketing",
      "workbench",
      "operator_review",
      "form_flow",
      "dashboard_monitor",
      "content_report",
      "setup_debug_tool",
      "conversation",
    ],
    "Unrelated legacy routing must not gain an Artifact Inspector score.",
  );
}

console.log("artifact inspector routing checks passed.");
