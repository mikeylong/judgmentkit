import assert from "node:assert/strict";
import { reviewActivityModelCandidate } from "../src/index.mjs";

const brief = "A reviewer inspects a correction, previews it, then cancels, leaving the saved artifact unchanged.";
const candidate = () => ({
  activity_model: {
    activity: "Reviewers inspect a proposed artifact correction.",
    participants: ["reviewers"],
    objective: "Understand and preview the correction without adopting a change.",
    outcomes: ["The reviewer cancels the preview and leaves the saved artifact unchanged."],
    domain_vocabulary: ["artifact", "correction", "preview", "Apply suggestion"],
  },
  interaction_contract: {
    primary_decision: "Choose which correction to inspect.",
    next_actions: ["Read the correction evidence.", "Preview correction.", "Cancel preview."],
    completion: "The saved artifact remains unchanged.",
    make_easy: ["Compare the original and proposed artifact."],
  },
  disclosure_policy: {
    terms_to_use: ["artifact", "correction", "preview"],
    hidden_implementation_terms: [],
    translation_candidates: [],
    diagnostic_contexts: [],
  },
});
const lifecycle = {
  id: "artifact-lifecycle",
  kind: "workspace_evidence",
  content: "Reviewers inspect the artifact and read correction evidence. Preview temporarily renders the correction. Apply suggestion commits a new artifact version. Cancel preview leaves the saved artifact unchanged.",
};

for (const kind of ["workspace_evidence", "authoritative_source"]) {
  const source = { ...lifecycle, kind, ...(kind === "authoritative_source" ? { source_ref: "policy://artifact-lifecycle/v1" } : {}) };
  const packet = reviewActivityModelCandidate(brief, candidate(), { context_items: [source] });
  assert.equal(packet.activity_case.readiness.decision, "proceed", "An explicitly non-executing task must not inherit a separate commit activity.");
  assert.equal(packet.activity_case.readiness.commitment, "not_authorized");
  assert.ok(!packet.activity_case.claims.some((claim) => claim.risk_category === "authoritative_irreversible_action"));
  assert.equal(packet.source.context_items[0].id, source.id, "The unedited lifecycle source remains bound to downstream review.");
}

for (const separator of [". ", " and ", ", and ", ", then ", ", but ", ", whereas ", ", while ", "; however, "]) {
  const source = { ...lifecycle, content: `Preview temporarily renders the correction${separator}Apply suggestion commits a new artifact version. Cancel preview leaves the saved artifact unchanged.` };
  const packet = reviewActivityModelCandidate(brief, candidate(), { context_items: [source] });
  assert.equal(packet.activity_case.readiness.decision, "proceed", `A separate Apply action must remain outside Preview: ${separator}`);
}

for (const kind of ["workspace_evidence", "authoritative_source"]) {
  for (const cancellation of [
    "Reviewers may cancel customer subscriptions.",
    "Reviewers cancel customer subscriptions by deleting artifact records.",
    "Reviewers cancel selected customer subscriptions by deleting artifact records.",
  ]) {
    const source = {
      ...lifecycle, kind,
      content: `Reviewers inspect artifact corrections and read their evidence. ${cancellation}`,
      ...(kind === "authoritative_source" ? { source_ref: "policy://separate-subscription-cancellation/v1" } : {}),
    };
    for (const qualified of [false, true]) {
      const changed = candidate();
      if (qualified) changed.interaction_contract.next_actions[2] = "Reviewers cancel the selected preview.";
      const packet = reviewActivityModelCandidate(brief, changed, { context_items: [source] });
      assert.equal(packet.activity_case.readiness.decision, "proceed", "Cancel preview cannot inherit authority for cancelling a different object.");
      assert.equal(packet.activity_case.readiness.commitment, "not_authorized");
    }
  }
}

for (const path of ["division_of_labor", "state_changes"]) {
  const changed = candidate();
  if (path === "division_of_labor") {
    changed.activity_model.division_of_labor = [{ participant: "AI agent", responsibility: "Apply the correction." }];
  } else {
    changed.interaction_contract.state_changes = ["Apply the correction."];
  }
  const packet = reviewActivityModelCandidate(brief, changed, { context_items: [lifecycle] });
  assert.notEqual(packet.activity_case.readiness.decision, "proceed", `An executing ${path} cannot use a preview-only exemption.`);
}

for (const action of [
  "Commit a new artifact version.", "Apply suggestion.", "Adopt the correction.", "Revert the artifact version.",
  "Apply", "Inspect and Apply.", "Read the proposal, then Apply.",
  "Save the correction to the artifact.", "Replace the saved artifact with the proposed version.",
  "Update the saved artifact.", "Write the correction to the original artifact.", "Merge the correction into the artifact.",
]) {
  const changed = candidate();
  changed.interaction_contract.next_actions.push(action);
  for (const kind of ["workspace_evidence", "authoritative_source"]) {
    const source = { ...lifecycle, kind, ...(kind === "authoritative_source" ? { source_ref: "policy://artifact-lifecycle/v1" } : {}) };
    const packet = reviewActivityModelCandidate(brief, changed, { context_items: [source] });
    assert.notEqual(packet.activity_case.readiness.decision, "proceed", `Authority to read cannot support an executing candidate: ${action}`);
    assert.ok(packet.activity_case.unresolved_ambiguities.some((entry) => entry.category === "authoritative_irreversible_action"));
  }
}

for (const field of ["objective", "outcomes", "division_of_labor", "primary_decision", "state_changes", "completion"]) {
  const changed = candidate();
  const target = ["objective", "outcomes", "division_of_labor"].includes(field)
    ? changed.activity_model : changed.interaction_contract;
  target[field] = field === "division_of_labor"
    ? [{ participant: "reviewers", responsibility: "Apply" }]
    : ["outcomes", "state_changes"].includes(field) ? ["Apply"] : "Apply";
  const packet = reviewActivityModelCandidate(brief, changed, { context_items: [lifecycle] });
  assert.notEqual(packet.activity_case.readiness.decision, "proceed", `Standalone Apply in ${field} must retain its authority boundary.`);
}

for (const content of [
  "Artifact correction records are permanently deleted when reviewers preview the correction.",
  "A new artifact version is committed when Preview runs.",
  "Reviewers commit a new artifact version by selecting Preview correction.",
  "A new artifact version is saved when Preview runs.",
  "Preview correction will inspect the artifact and apply the correction.",
  "Preview will select the correction and apply changes to the saved artifact.",
  "Preview will inspect the artifact, and apply the correction.",
  "Preview will inspect the artifact, then apply the correction.",
  "Cancel preview deletes artifact correction records.",
  "Artifact correction records are deleted when preview is cancelled.",
]) {
  const source = { ...lifecycle, content };
  const packet = reviewActivityModelCandidate(brief, candidate(), { context_items: [source] });
  assert.notEqual(packet.activity_case.readiness.decision, "proceed", `An effect preceding Preview must retain its authority boundary: ${content}`);
  assert.ok(packet.activity_case.unresolved_ambiguities.some((entry) => entry.category === "authoritative_irreversible_action"));
}

{
  const changed = candidate();
  changed.interaction_contract.next_actions = ["Read the correction evidence.", "Return to findings."];
  const source = { ...lifecycle, content: "Preview correction commits a new artifact version. Reviewers read the correction evidence." };
  const packet = reviewActivityModelCandidate(brief, changed, { context_items: [source] });
  assert.notEqual(packet.activity_case.readiness.decision, "proceed", "Omitting Preview from next actions cannot discard the brief and objective's source effect.");
}

for (const content of [
  "Preview correction does not commit a new artifact version.",
  "Artifact correction records are never deleted when reviewers preview the correction.",
  "The artifact version is not saved when Preview runs.",
]) {
  const changed = candidate();
  changed.interaction_contract.state_changes = ["Never Apply. Cancel preview leaves the artifact unchanged."];
  const packet = reviewActivityModelCandidate(brief, changed, { context_items: [{ ...lifecycle, content }] });
  assert.equal(packet.activity_case.readiness.decision, "proceed", `A negated effect must preserve a non-executing task: ${content}`);
}

for (const effect of [
  "commits a new artifact version", "deletes artifact records", "saves a new artifact version",
  "is an operation that permanently deletes artifact records",
]) {
  for (const kind of ["workspace_evidence", "authoritative_source"]) {
    const source = { ...lifecycle, kind, content: `Preview correction ${effect}. Reviewers read the correction evidence. Cancel preview leaves the saved artifact unchanged.`, ...(kind === "authoritative_source" ? { source_ref: "policy://preview-effect/v1" } : {}) };
    const packet = reviewActivityModelCandidate(brief, candidate(), { context_items: [source] });
    assert.notEqual(packet.activity_case.readiness.decision, "proceed", "A source effect of the retained Preview action cannot be discarded as background Apply.");
    assert.ok(packet.activity_case.unresolved_ambiguities.some((entry) => entry.category === "authoritative_irreversible_action"));
  }
}

{
  const qualified = candidate();
  qualified.interaction_contract.next_actions = ["Reviewers read the correction evidence.", "Reviewers preview the correction.", "Reviewers cancel the preview."];
  const packet = reviewActivityModelCandidate(brief, qualified, { context_items: [lifecycle] });
  assert.equal(packet.activity_case.readiness.decision, "proceed", "Naming the declared actor must preserve a non-executing task.");
}

const omitted = candidate();
omitted.activity_model.activity = "Reviewers resolve artifact corrections.";
omitted.activity_model.objective = "Resolve the artifact correction.";
omitted.activity_model.outcomes = ["The artifact correction is resolved."];
omitted.interaction_contract.completion = "The artifact correction is resolved.";
for (const task of ["Design an artifact correction workspace for reviewers.", "Reviewers commit a new artifact version after inspecting the correction."]) {
  const packet = reviewActivityModelCandidate(task, omitted, { context_items: [lifecycle] });
  assert.equal(packet.activity_case.readiness.decision, "stop", "An ambiguous task or euphemistic candidate must retain a source-only execution boundary.");
}

const destructiveSource = {
  id: "retention-rule", kind: "authoritative_source", source_ref: "policy://retention/v1",
  content: "Reviewers must not erase artifact correction records before approval.",
};
const vague = reviewActivityModelCandidate("Design an artifact correction workspace for reviewers.", omitted, { context_items: [destructiveSource] });
assert.notEqual(vague.activity_case.readiness.decision, "proceed", "A source restriction cannot disappear through omitted destructive verbs.");

for (const task of [
  "Reviewers preview a correction, apply the correction and cancel the preview, leaving the saved artifact unchanged.",
  "Reviewers inspect a correction and commit a new artifact version, leaving the previous artifact unchanged.",
]) {
  const packet = reviewActivityModelCandidate(task, candidate(), { context_items: [lifecycle] });
  assert.notEqual(packet.activity_case.readiness.decision, "proceed", "An executing brief cannot be laundered by a non-executing candidate.");
}

const privateCandidate = candidate();
privateCandidate.interaction_contract.next_actions = ["Reviewers read customer payment data."];
const disclosure = reviewActivityModelCandidate(brief, privateCandidate);
assert.equal(disclosure.activity_case.readiness.decision, "stop", "Non-execution never exempts protected disclosure.");
assert.ok(disclosure.activity_case.unresolved_ambiguities.some((entry) => entry.category === "sensitive_disclosure_boundary"));

console.log("Protected action scope checks passed.");
