import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createActivityModelReview,
  createFrontendGenerationContext,
  createUiGenerationHandoff,
  createUiImplementationContract,
  deriveOwnedChartReviewObligation,
  recommendSurfaceTypes,
  reviewActivityModelCandidate,
  reviewUiWorkflowCandidate,
  resolveProvidedSurfaceSelectionOrigin,
} from "../src/index.mjs";

const ready = { review_status: "ready_for_review", candidate: {} };
const completeCases = [
  ["form_flow", "An attendee completes a registration form, enters required contact fields, resolves validation errors, and submits the registration. Completion is a saved registration confirmation."],
  ["content_report", "An executive reads a narrative quarterly report, understands the summary, cites reference sections, and shares the briefing. No operational decision is required."],
  ["conversation", "A customer participates in an open-ended live chat, asks questions, replies with context, and continues the conversation after failed sends. Completion is a continuing message thread."],
  ["workbench", "A customer advocate evaluates several reimbursement petitions, weighs policy evidence, chooses which petitions proceed or return for more evidence, and records their disposition."],
];
for (const [expected, brief] of completeCases) {
  const packet = recommendSurfaceTypes(brief, { activity_review: ready });
  assert.equal(packet.recommended_surface_type, expected);
  assert.equal(packet.confidence, "high", `${expected} must not require more matching rules than the pattern defines.`);
  assert.equal(packet.selection_origin, "inferred");
  assert.deepEqual(packet.confidence_evidence.missing_required_evidence, []);
}

const ambiguous = recommendSurfaceTypes(
  "A support lead reviews a queue of refund requests, compares evidence, and decides which requests advance with a handoff. The lead also uses a setup tool to configure connection details, test the API endpoint, and save a validated configuration.",
  { activity_review: ready },
);
assert.notEqual(ambiguous.confidence, "high", "A tied, independently supported activity cannot get high confidence from trigger-count differences.");
assert.ok(ambiguous.confidence_evidence.competing_surface_types.some((entry) => entry.surface_type === "setup_debug_tool"));
const unequalRuleCounts = recommendSurfaceTypes(
  "A support lead reviews a queue of refund requests, compares evidence, and decides which requests advance with a handoff. They also configure an API integration and test its endpoint. Completion includes both a chosen refund path and a working integration.",
  { activity_review: ready },
);
assert.notEqual(unequalRuleCounts.confidence, "high", "Independent complete purposes remain competitors even when their optional-rule counts differ.");

const unknown = recommendSurfaceTypes("Surface.", { activity_review: ready });
assert.equal(unknown.recommended_surface_type, null);
assert.equal(unknown.status, "review_required");
assert.equal(unknown.confidence, "low");
assert.deepEqual(unknown.interaction_implications, {});

const reviewedObjects = recommendSurfaceTypes("Build the reviewed interface.", { activity_review: {
  review_status: "ready_for_review",
  candidate: {
    activity_model: { activity: "Evaluate submissions.", participants: ["A coordinator"], existing_tools_artifacts: ["Application review queue"] },
    interaction_contract: { primary_decision: "Choose the next action.", next_actions: ["Compare supporting evidence.", "Record the chosen path."], completion: "The chosen disposition is recorded." },
  },
} });
assert.equal(reviewedObjects.recommended_surface_type, "workbench");
assert.equal(reviewedObjects.confidence, "high", "Reviewed work objects must participate alongside actions and completion, without exposing their implementation structure.");

for (const origin of [undefined, "caller", "agent", "user"]) {
  assert.equal(resolveProvidedSurfaceSelectionOrigin(origin), origin ?? "caller");
}
assert.throws(() => resolveProvidedSurfaceSelectionOrigin("inferred"), (error) => error.code === "invalid_surface_selection_origin");

// Exercise provenance at the validating public boundaries, using only the
// existing saved-input fixture, not regenerated experiment applications.
const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/tide-workflow.json", import.meta.url), "utf8"));
const context_items = fixture.paragraph_context;
const activity_review = reviewActivityModelCandidate(fixture.brief, fixture.activity_candidate, { context_items });
const surface_review = recommendSurfaceTypes(fixture.brief, { activity_review });
const implementation_contract = createUiImplementationContract().implementation_contract;
const chartObligation = deriveOwnedChartReviewObligation({ activity_review });
assert.equal(chartObligation.required, true);
assert.equal(chartObligation.scope, "owned_interface");
assert.ok(chartObligation.source_paths.length);
assert.equal(deriveOwnedChartReviewObligation({ activity_review, surface_type: "artifact_inspector" }), null, "An external primary artifact cannot inherit owned UI conformance from chart content.");
assert.equal(deriveOwnedChartReviewObligation({ activity_review: { ...activity_review, review_status: "review_required" } }), null, "Only a ready reviewed promise establishes a chart obligation.");
assert.equal(deriveOwnedChartReviewObligation({ activity_review: { review_status: "ready_for_review", candidate: { activity_model: { existing_tools_artifacts: ["A crowd chart"], domain_vocabulary: ["chart"] }, interaction_contract: { next_actions: ["Read the crowd summary without a chart."], completion: "The visitor knows the selected crowd conditions." } } } }), null, "Background artifacts and a negated chart promise do not create obligations.");
assert.equal(deriveOwnedChartReviewObligation({ workflow_review: { review_status: "ready_for_review", candidate: { workflow: { steps: [{ label: "Read selected measurements in the chart", purpose: "Understand the selected day curve." }], completion_state: "The visitor has read the selected chart." } } } }).required, true);
assert.equal(deriveOwnedChartReviewObligation({ workflow_review: { review_status: "ready_for_review", candidate: { workflow: { work_units: ["Read selected measurements in the chart"], completion_state: "Selected conditions are understood." } } } }).required, true, "Normalized reviewed work units preserve the promised chart activity.");
assert.equal(deriveOwnedChartReviewObligation({ workflow_review: { review_status: "ready_for_review", surface_type: "artifact_inspector", candidate: { workflow: { work_units: ["Read selected measurements in the external chart"] } } } }), null, "An inherited Inspector surface retains external artifact authority.");
for (const action of ["The visitor does not yet read the chart.", "Read selected crowd measurements; a chart is outside this prototype scope."]) {
  assert.equal(deriveOwnedChartReviewObligation({ activity_review: { review_status: "ready_for_review", candidate: { interaction_contract: { next_actions: [action] } } } }), null, action);
}
for (const origin of ["caller", "agent", "user"]) {
  const workflow = reviewUiWorkflowCandidate(fixture.brief, fixture.workflow_candidate, {
    activity_review, context_items, surface_review,
    surface_type: "dashboard_monitor", surface_selection_origin: origin,
  });
  assert.equal(workflow.surface_guidance.selection_origin, origin);
  assert.equal(workflow.surface_guidance.confidence, "provided");
  const handoff = createUiGenerationHandoff(workflow, { brief: fixture.brief, context_items, implementation_contract });
  assert.equal(handoff.surface_guidance.selection_origin, origin);
  const frontend = createFrontendGenerationContext({ ui_generation_handoff: handoff, brief: fixture.brief, context_items });
  assert.equal(frontend.surface_guidance.selection_origin, origin);
  const explicitlySelected = createFrontendGenerationContext({ ui_generation_handoff: handoff, brief: fixture.brief, context_items, surface_type: "dashboard_monitor", surface_selection_origin: "agent" });
  assert.equal(explicitlySelected.surface_guidance.selection_origin, "agent");
  const unresolvedInherited = structuredClone(handoff);
  unresolvedInherited.surface_guidance.status = "review_required";
  unresolvedInherited.surface_guidance.routing_conflict = { status: "review_required", reason: "inherited_activity_conflict" };
  assert.throws(() => createFrontendGenerationContext({ ui_generation_handoff: unresolvedInherited, brief: fixture.brief, context_items, surface_review }), (error) => error.code === "frontend_context_blocked" && error.details.field === "ui_generation_handoff.surface_guidance");
}
assert.throws(() => reviewUiWorkflowCandidate(fixture.brief, fixture.workflow_candidate, { activity_review, context_items, surface_review, surface_selection_origin: "user" }), (error) => error.code === "invalid_surface_selection_origin");

const brief = "A visitor chooses an exhibit and day, reads crowd measurements and their chart, and leaves knowing the selected conditions.";
const candidate = {
  activity_model: {
    activity: "Reading crowd conditions for an exhibit and day.",
    participants: ["A museum visitor"],
    objective: "Choose the exhibit and day and read the selected crowd conditions.",
    outcomes: ["The visitor knows the selected crowd conditions."],
    domain_vocabulary: ["exhibit", "day", "crowd measurements", "conditions", "chart"],
  },
  interaction_contract: {
    primary_decision: "Which exhibit and day to inspect.",
    next_actions: ["Choose an exhibit.", "Choose a day.", "Read crowd measurements and their chart."],
    completion: "The visitor knows the selected crowd conditions; nothing is submitted or saved.",
  },
  disclosure_policy: { terms_to_use: ["exhibit", "day", "crowd conditions"], hidden_implementation_terms: [], diagnostic_contexts: ["debugging"] },
};
const disclaimers = [
  "Safety advice is outside this exhibit crowd prototype's scope; design decisions are authorized.",
  "The exhibit crowd prototype does not provide safety advice, but the designer may approve the layout.",
  "The exhibit crowd prototype excludes safety advice. Its design decisions are authorized.",
  "This crowd chart prototype does not establish safety rules. A visitor chooses a date and reads crowd measurements. Design decisions are authorized.",
  "Safety rules are outside this crowd chart prototype scope; design decisions are authorized.",
  "The crowd chart prototype does not establish safety rules, but design decisions are authorized.",
];
for (const content of disclaimers) {
  const spans = content.match(/[^.!?]+[.!?]?\s*/g) ?? [content];
  const reviews = [
    [{ id: "scope", kind: "user_answer", content, source_ref: "scope.txt" }],
    spans.map((span, index) => ({ id: `scope-${index}`, kind: "user_answer", content: span, source_ref: `scope.txt#sentence-${index + 1}` })),
  ].map((context_items) => reviewActivityModelCandidate(brief, candidate, { context_items }));
  assert.deepEqual(reviews.map((packet) => packet.activity_case.readiness.decision), ["proceed", "proceed"], content);
}

for (const source of [
  "An operator checks reactor conditions. No safety requirements may be ignored when approving reactor operation.",
  "A nurse chooses whether a patient may be discharged safely and records discharge approval.",
  "An operator checks a reactor. Safety constraints govern reactor operation; these constraints must be met before operation is approved.",
  "An operator must not bypass safety rules before approving reactor operation.",
  "No safety rules may be ignored before approving reactor operation.",
]) {
  assert.equal(createActivityModelReview(source).activity_case.readiness.decision, "stop", "Safety restrictions remain governing boundaries.");
}

const contrasted = recommendSurfaceTypes("A reader uses an internal reference report with no data entry, but an editor may enter required fields, resolve validation, and submit a revised record.", { activity_review: ready });
assert.ok(contrasted.evidence.surface_type_scores.find((entry) => entry.surface_type === "form_flow").matched_triggers.includes("collect_or_change_structured_information"), "A contrast clause starts fresh affirmative action scope.");

const notYetForm = recommendSurfaceTypes("A reader does not yet enter required fields, resolve validation, or submit a record.", { activity_review: ready });
assert.equal(notYetForm.evidence.surface_type_scores.find((entry) => entry.surface_type === "form_flow").score, 0, "Not yet retains its negation across the action list.");

const refundDecision = {
  activity_model: { activity: "Support leads decide refund requests.", participants: ["support leads"], objective: "Support leads approve or deny refund requests.", outcomes: ["Each refund request has a decision."], domain_vocabulary: ["refund request"] },
  interaction_contract: { primary_decision: "Support leads approve or deny refund requests.", next_actions: ["Support leads approve refund requests.", "Support leads deny refund requests."], completion: "Each refund request has a decision." },
  disclosure_policy: { terms_to_use: ["refund request"], hidden_implementation_terms: [], diagnostic_contexts: [] },
};
for (const content of ["Support leads may not yet approve or deny refund requests.", "Refund requests may not yet be approved or denied by support leads."]) {
  const packet = reviewActivityModelCandidate("Design refund decisions for support leads.", refundDecision, { context_items: [{ id: "refund-authority", kind: "user_answer", content }] });
  assert.notEqual(packet.activity_case.readiness.decision, "proceed", content);
  assert.ok(packet.activity_case.unresolved_ambiguities.some((entry) => entry.category === "participant_authority"), "Not yet cannot grant participant authority.");
}

for (const source of ["Build a surface.", "An exhibit app."]) {
  const packet = createActivityModelReview(source);
  if (packet.activity_case.readiness.decision === "ask") {
    assert.ok(packet.activity_case.readiness.next_question);
    assert.ok(packet.activity_case.unresolved_ambiguities.some((entry) => entry.question === packet.activity_case.readiness.next_question));
  }
}

console.log("Context and routing reliability checks passed.");
