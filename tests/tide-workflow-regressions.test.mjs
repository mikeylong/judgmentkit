import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createActivityModelReview,
  createUiImplementationContract,
  createUiGenerationHandoff,
  createFrontendGenerationContext,
  createFrontendImplementationSkillContext,
  recommendSurfaceTypes,
  reviewActivityModelCandidate,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/tide-workflow.json", import.meta.url), "utf8"));
assert.equal(fixture.paragraph_context[1].content, fixture.sentence_context.slice(1).map((item) => item.content).join(""), "Attribution variants must preserve every source byte.");

const readiness = [];
const replay = [];
for (const context_items of [fixture.paragraph_context, fixture.sentence_context]) {
  const baseline = createActivityModelReview(fixture.brief, { context_items });
  assert.notEqual(baseline.activity_case.readiness.decision, "stop", "Excluded safety claims and delegated design choices must not create a safety-policy requirement.");
  if (baseline.activity_case.readiness.decision === "ask") {
    assert.ok(baseline.activity_case.readiness.next_question, "A clarification must name the material question.");
    assert.ok(baseline.activity_case.unresolved_ambiguities.length > 0);
  }
  const review = reviewActivityModelCandidate(fixture.brief, fixture.activity_candidate, { context_items });
  assert.equal(review.review_status, "ready_for_review");
  readiness.push(review.activity_case.readiness.decision);
  const surface = recommendSurfaceTypes(fixture.brief, { activity_review: review });
  assert.equal(surface.recommended_surface_type, "dashboard_monitor", "Reading selected measurements and their day curve is a monitor, not a queue/handoff.");
  assert.equal(surface.status, "ready");
  const workflow = reviewUiWorkflowCandidate(fixture.brief, fixture.workflow_candidate, { activity_review: review, context_items, surface_review: surface });
  assert.equal(workflow.review_status, "ready_for_review");
  assert.equal(workflow.surface_type, "dashboard_monitor");
  assert.equal(workflow.candidate.workflow.work_units.length, fixture.workflow_candidate.workflow.work_units.length);
  const implementation = createUiImplementationContract();
  const handoff = createUiGenerationHandoff(workflow, { brief: fixture.brief, context_items, implementation_contract: implementation.implementation_contract });
  assert.equal(handoff.handoff_status, "ready_for_generation");
  const frontend = createFrontendGenerationContext({ ui_generation_handoff: handoff, brief: fixture.brief, context_items });
  assert.equal(frontend.frontend_context_status, "ready_for_frontend_implementation");
  const skill = createFrontendImplementationSkillContext({ frontend_generation_context: frontend, brief: fixture.brief, context_items });
  assert.equal(skill.skill_context_status, "ready");
  replay.push({
    attribution: context_items === fixture.paragraph_context ? "paragraph" : "sentences",
    baseline: baseline.activity_case.readiness,
    activity: review.review_status,
    surface: surface.recommended_surface_type,
    workflow: workflow.review_status,
    handoff: handoff.handoff_status,
    frontend: frontend.frontend_context_status,
    skill: skill.skill_context_status,
    work_units: handoff.workflow.work_units,
  });
  assert.ok(!JSON.stringify(workflow.candidate.workflow.primary_actions).includes("handoff"));
  assert.throws(() => reviewUiWorkflowCandidate(fixture.brief, fixture.workflow_candidate, { activity_review: review, context_items, surface_review: surface, surface_type: "workbench" }), (error) => error.code === "conflicting_surface_selection");
  const explicit = reviewUiWorkflowCandidate(fixture.brief, fixture.workflow_candidate, { activity_review: review, context_items, surface_type: "dashboard_monitor" });
  assert.equal(explicit.surface_guidance.confidence, "provided");
  assert.equal(explicit.surface_guidance.selection_origin, "caller");
}
assert.deepEqual(readiness, ["proceed", "proceed"]);

const unknown = recommendSurfaceTypes("Surface.", { activity_review: { review_status: "ready_for_review", candidate: {} } });
assert.equal(unknown.status, "review_required");
assert.equal(unknown.recommended_surface_type, null);
assert.deepEqual(unknown.interaction_implications, {});
assert.equal(unknown.routing_conflict.reason, "no_positive_surface_evidence");

const readyReview = { review_status: "ready_for_review", candidate: {} };
assert.equal(recommendSurfaceTypes("A sensor operator chooses a location and day, reads temperature measurements and their chart, and leaves knowing the selected conditions.", { activity_review: readyReview }).recommended_surface_type, "dashboard_monitor");
assert.equal(recommendSurfaceTypes("A reader selects a location and day in a published report, reads measurements and the chart, and cites the report in a memo.", { activity_review: readyReview }).recommended_surface_type, "content_report");
assert.equal(recommendSurfaceTypes("An engineer chooses a location and day, edits measurement records shown in a chart, and saves changes.", { activity_review: readyReview }).recommended_surface_type, "workbench");

// Exclusion handling must never turn real safety work into unprotected exploration.
const clinical = createActivityModelReview("A nurse decides whether a patient may be discharged safely and records the discharge approval.");
assert.equal(clinical.activity_case.readiness.decision, "stop");
const restriction = createActivityModelReview("An operator checks an emergency shutdown. The operator must not ignore safety requirements when approving the equipment.");
assert.equal(restriction.activity_case.readiness.decision, "stop");

console.log(process.argv.includes("--report")
  ? JSON.stringify({ kind: "saved_input_kernel_replay", fresh_generation: false, implementation_acceptance: "not_run", replay }, null, 2)
  : "Tide workflow regression tests passed.");
