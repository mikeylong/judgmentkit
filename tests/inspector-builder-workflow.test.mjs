import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  checkInspectorSourceSnapshots,
  createInspectorWorkflowCandidate,
  loadInspectorBuilderCase,
  rehearseInspectorBuilderWorkflow,
} from "../scripts/rehearse-inspector-builder-workflow.mjs";
import { recommendSurfaceTypes, reviewActivityModelCandidate, reviewUiWorkflowCandidate } from "../src/index.mjs";

const fixture = loadInspectorBuilderCase();
const result = rehearseInspectorBuilderWorkflow(fixture);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceBytes = fs.readFileSync(new URL("../examples/builder-workflow/inspector-preview-cancel.source.md", import.meta.url));

// Public synthetic inputs exercise integration behavior without a private
// checkout, an existing product implementation, or a human encounter.
assert.equal(fixture.evidence_type, "synthetic_fixture");
assert.equal(fixture.source_origin, "authored_public_synthetic_fixture");
assert.equal(fixture.human_encounter, "not_run");
assert.equal(fixture.usefulness, "not_measured");
assert.doesNotMatch(JSON.stringify(fixture), /CLEAR|Velori|\/Users\/|clear-artifact-review/);
assert.equal(result.evidence_type, "synthetic_fixture_replay");
assert.equal(result.transport, "direct_kernel");
assert.equal(result.fresh_generation, false);
assert.equal(result.browser_checks, "not_run");
assert.equal(result.human_encounter, "not_run");
assert.equal(result.usefulness.status, "not_measured");
assert.equal(result.source_verification, "current_synthetic_excerpts_checked");
assert.deepEqual(result.application, {
  executed: false,
  decision_owner: "human_reviewer",
  preview_authorizes_apply: false,
});
assert.deepEqual(result.stages.map(({ stage, status }) => ({ stage, status })), [
  { stage: "baseline", status: "ready_for_review" },
  { stage: "activity", status: "ready_for_review" },
  { stage: "surface", status: "ready" },
  { stage: "workflow", status: "ready_for_review" },
  { stage: "implementation_contract", status: "ready" },
  { stage: "handoff", status: "ready_for_generation" },
  { stage: "frontend", status: "ready_for_frontend_implementation" },
  { stage: "skill", status: "ready" },
], "Inspection and preview cancellation must reach guidance without granting adoption authority.");
assert.equal(result.packets.surface.recommended_surface_type, "artifact_inspector");
assert.equal(recommendSurfaceTypes(fixture.brief).recommended_surface_type, "artifact_inspector");
assert.equal(result.packets.activity.activity_case.readiness.commitment, "not_authorized");
assert.ok(!result.packets.activity.activity_case.claims.some((claim) => claim.risk_category === "authoritative_irreversible_action"), "A separate Apply effect cannot expand this preview/cancel task.");
assert.equal(result.packets.implementation_contract.generation_gates.find((gate) => gate.id === "artifact_inspector_authority_gate").status, "review_required");
assert.equal(result.packets.handoff.implementation_contract.artifact_inspector.external_artifact_review_status, "external_not_reviewed");
assert.equal(result.packets.handoff.implementation_contract.design_system_scopes.find((scope) => scope.scope_id === "primary_artifact").authority, "external_declared");
assert.equal(result.implementation_acceptance.status, "not_run");
assert.equal(result.implementation_acceptance.boundary, "review_required");
assert.equal(result.artifact_authority.review_status, "external_not_reviewed");
assert.deepEqual(result.blockers, [{ stage: "implementation_acceptance", code: "trusted_interactive_attestation_unavailable", status: "review_required" }]);

assert.equal(sha256(sourceBytes), fixture.source_file_sha256);
for (const snapshot of fixture.source_snapshots) {
  const item = fixture.context_items.find((context) => context.id === snapshot.context_id);
  assert.ok(item);
  assert.equal(sha256(item.content), snapshot.content_sha256);
  assert.equal(sourceBytes.subarray(snapshot.start_byte, snapshot.end_byte).toString("utf8"), item.content);
  assert.ok(item.source_ref.includes(fixture.source_file_sha256));
}
assert.ok(result.source_snapshots.every((snapshot) => snapshot.whole_file_unchanged && snapshot.excerpt_matches_current_source));
for (const stage of ["baseline", "activity", "workflow", "handoff", "frontend", "skill"]) {
  assert.equal(result.requests[stage].brief, fixture.brief);
  assert.deepEqual(result.requests[stage].context_items, fixture.context_items, "Each validating boundary must receive the exact attributed raw source.");
}
assert.equal(result.requests.workflow.profile_id, result.packets.surface.profile_id);
assert.equal(result.requests.workflow.profile_id, "artifact-inspector-ui");
assert.throws(() => rehearseInspectorBuilderWorkflow({ ...fixture, evidence_type: "human_encounter" }), /explicitly synthetic inputs/);

const changedContext = structuredClone(fixture.context_items);
changedContext[0].content += " The selected target has changed.";
assert.throws(() => reviewUiWorkflowCandidate(fixture.brief, createInspectorWorkflowCandidate(), {
  context_items: changedContext,
  activity_review: result.packets.activity,
  surface_review: result.packets.surface,
}), (error) => /context/i.test(error.code ?? error.message), "A packet cannot carry an old review into changed source context.");

const appendedSource = Buffer.concat([sourceBytes, Buffer.from("\nAdditional unrelated text.\n")]);
assert.ok(checkInspectorSourceSnapshots(fixture, () => appendedSource).every((snapshot) => snapshot.excerpt_matches_current_source && !snapshot.whole_file_unchanged), "Matching excerpts must not claim that the entire source is unchanged.");
const driftedSource = Buffer.from(sourceBytes);
driftedSource[fixture.source_snapshots[0].start_byte] = 88;
assert.throws(() => rehearseInspectorBuilderWorkflow(fixture, { readFile: () => driftedSource }), /source excerpts changed/);
const invalidSnapshot = structuredClone(fixture);
invalidSnapshot.context_items[0].content += " Modified snapshot.";
assert.throws(() => checkInspectorSourceSnapshots(invalidSnapshot), /context snapshot is invalid/);
assert.throws(() => checkInspectorSourceSnapshots({ ...fixture, source_file: "/arbitrary/file.md" }), /only its accompanying public source fixture/);

for (const kind of ["workspace_evidence", "authoritative_source"]) {
  const context_items = structuredClone(fixture.context_items);
  const lifecycle = context_items.find((item) => item.id === "artifact-lifecycle");
  lifecycle.kind = kind;
  const packet = reviewActivityModelCandidate(fixture.brief, fixture.activity_candidate, { context_items });
  assert.equal(packet.review_status, "ready_for_review", "Ordinary or governing lifecycle text cannot transfer a separate Apply effect to preview/cancel.");
  for (const effect of ["saves a new artifact version", "commits a new artifact version", "permanently deletes artifact records"]) {
    const withPreviewEffect = structuredClone(context_items);
    withPreviewEffect.find((item) => item.id === "artifact-lifecycle").content = `Preview correction ${effect}. Cancel preview returns to the saved artifact. Apply suggestion is a separate reviewer decision.`;
    const reviewed = reviewActivityModelCandidate(fixture.brief, fixture.activity_candidate, { context_items: withPreviewEffect });
    assert.notEqual(reviewed.activity_case.readiness.decision, "proceed", "Preview's own protected effect must remain gated despite the non-executing task claim.");
    assert.ok(reviewed.activity_case.unresolved_ambiguities.some((ambiguity) => ambiguity.category === "authoritative_irreversible_action"));
  }
}
for (const activePath of ["next_actions", "state_changes", "division_of_labor"]) {
  const candidate = structuredClone(fixture.activity_candidate);
  if (activePath === "division_of_labor") {
    candidate.activity_model.division_of_labor[1].responsibility = "Apply the correction.";
  } else {
    candidate.interaction_contract[activePath].push("Apply the correction.");
  }
  const reviewed = reviewActivityModelCandidate(fixture.brief, candidate, { context_items: fixture.context_items });
  assert.notEqual(reviewed.activity_case.readiness.decision, "proceed", "Active adoption cannot borrow preview/cancel's scope exemption.");
}
assert.ok(!createInspectorWorkflowCandidate().workflow.primary_actions.some((action) => /apply|commit|adopt|release/i.test(action)));
console.log("Synthetic Inspector builder workflow tests passed.");
