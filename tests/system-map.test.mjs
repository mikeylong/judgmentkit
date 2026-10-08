import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";

import * as kernel from "../src/index.mjs";
import { listTools } from "../src/mcp.mjs";
import {
  SYSTEM_MAP_EDGES,
  SYSTEM_MAP_NODES,
  SYSTEM_MAP_VIEWBOX,
  systemMapEdgePath,
} from "../site/system-map-model.mjs";

// The map is an integration contract. Check its claims against public behavior,
// rather than freezing coordinates or every sentence in the illustration.
const nodes = new Map(SYSTEM_MAP_NODES.map((node) => [node.id, node]));
assert.equal(nodes.size, SYSTEM_MAP_NODES.length, "Map node ids must be unique.");
assert.equal(new Set(SYSTEM_MAP_EDGES.map((edge) => edge.id)).size, SYSTEM_MAP_EDGES.length);
const toolInventory = new Set(listTools().map((tool) => tool.name));
const depictedTools = new Set();
for (const node of SYSTEM_MAP_NODES) {
  for (const tool of node.data.tools ?? []) {
    assert.ok(toolInventory.has(tool), `${tool} must be an available MCP tool.`);
    const exportName = tool.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    assert.equal(typeof kernel[exportName], "function", `${tool} must expose a library function.`);
    depictedTools.add(tool);
  }
}
for (const tool of [
  "create_activity_model_review", "review_activity_model_candidate",
  "recommend_surface_types", "review_ui_workflow_candidate",
  "create_ui_implementation_contract", "create_ui_generation_handoff",
  "create_frontend_generation_context", "create_frontend_implementation_skill_context",
  "review_ui_implementation_candidate",
]) assert.ok(depictedTools.has(tool), `The integration route must depict ${tool}.`);
assert.equal(depictedTools.has("create_slide_deck"), false, "Presentation tools are a separate route.");

function insideZone(node, zoneId) {
  const zone = nodes.get(zoneId);
  assert.ok(zone, `The ${zoneId} ownership boundary must exist.`);
  return node.position.x >= zone.position.x && node.position.y >= zone.position.y &&
    node.position.x + node.style.width <= zone.position.x + zone.style.width &&
    node.position.y + node.style.height <= zone.position.y + zone.style.height;
}
for (const node of SYSTEM_MAP_NODES.filter((node) => node.data.tools?.length)) {
  assert.ok(insideZone(node, "zone-kernel"), `${node.id} is deterministic review or guidance.`);
}
for (const id of ["agent-client", "source-context", "proposals", "repair"]) {
  assert.ok(insideZone(nodes.get(id), "zone-client"), `${id} belongs to caller execution.`);
}
for (const id of ["ui-pass", "evidence", "human-task"]) {
  assert.ok(insideZone(nodes.get(id), "zone-generation"), `${id} is outside the deterministic kernel.`);
}
const hasLink = (source, target) => SYSTEM_MAP_EDGES.some((edge) => edge.source === source && edge.target === target);
for (const [source, target] of [
  ["activity-review", "surface"], ["surface", "workflow-review"],
  ["workflow-review", "implementation-contract"], ["implementation-contract", "handoff"],
  ["workflow-review", "handoff"], ["handoff", "frontend"], ["frontend", "ui-pass"],
  ["ui-pass", "evidence"], ["evidence", "implementation-review"],
  ["implementation-review", "verdict"], ["evidence", "human-task"], ["human-task", "repair"],
  ["proposals", "activity-review"], ["proposals", "workflow-review"],
  ["repair", "source-context"], ["repair", "ui-pass"], ["verdict", "limits"],
]) assert.ok(hasLink(source, target), `The route must connect ${source} to ${target}.`);
assert.equal(SYSTEM_MAP_EDGES.some((edge) =>
  edge.target === "proposals" && insideZone(nodes.get(edge.source), "zone-kernel")), false,
"A deterministic review must not request a provider candidate.");
assert.equal(hasLink("verdict", "human-task"), false,
  "A human task observation must not depend on an acceptance verdict.");
assert.equal(hasLink("limits", "repair"), false,
  "A missing trusted Inspector verifier must not be presented as an ordinary agent repair.");
for (const edge of SYSTEM_MAP_EDGES) {
  assert.ok(nodes.has(edge.source) && nodes.has(edge.target), `${edge.id} must connect existing nodes.`);
  assert.ok(edge.data.points.length >= 2);
  assert.ok(edge.data.points.every((point) => point.length === 2 && point.every(Number.isFinite)));
  assert.ok(/^M [\d.]+ [\d.]+ L /.test(systemMapEdgePath(edge.data.points)));
}
assert.ok(SYSTEM_MAP_VIEWBOX.width > 0 && SYSTEM_MAP_VIEWBOX.height > 0);

const cliHelp = spawnSync(process.execPath, ["bin/judgmentkit.mjs", "--help"], {
  encoding: "utf8", cwd: new URL("../", import.meta.url),
});
assert.equal(cliHelp.status, 0, cliHelp.stderr);
const cliUsage = cliHelp.stdout + cliHelp.stderr;
for (const command of ["analyze", "review", "review-candidate"]) {
  assert.ok(cliUsage.includes(`judgmentkit ${command}`));
}
assert.equal(/judgmentkit (?:handoff|generate|build|implement)\b/.test(cliUsage), false,
  "The CLI boundary must not imply a complete UI-building interface.");

const brief = "A dispatch lead repeatedly reviews service exceptions in a work queue, compares route and customer evidence, decides whether to reassign, hold, or escalate each visit, and leaves a handoff receipt for the next owner.";
const workflowCandidate = {
  workflow: {
    surface_name: "Service exception workspace", topology: "workspace",
    work_units: ["Inspect evidence", "Choose action", "Leave handoff"],
    primary_actions: ["Reassign", "Hold", "Escalate"],
    decision_points: ["Choose the next operational action."],
    completion_state: "The next owner receives a reasoned handoff.",
  },
  surface_set: [{
    name: "Service exception workspace",
    purpose: "Keep the selected exception, evidence, decision, and handoff together.",
    sections: ["Work queue", "Detail workspace", "Evidence", "Handoff"],
    controls: ["Select exception", "Choose action", "Complete handoff"],
    relationship_to_workflow: "Supports repeated exception review.",
  }],
  product_terms: ["Exception", "Evidence", "Handoff"],
  handoff: {
    next_owner: "dispatch coordinator", reason: "The exception needs the selected operational action.",
    next_action: "Complete the handoff.",
  },
  diagnostics: { implementation_terms: [], reveal_contexts: ["debugging", "auditing"] },
};
let modelCalls = 0;
const callModel = () => { modelCalls += 1; throw new Error("Deterministic review requested a model."); };
const activityReview = kernel.createActivityModelReview(brief, { callModel });
const surfaceReview = kernel.recommendSurfaceTypes(brief, { activity_review: activityReview, callModel });
const workflowReview = kernel.reviewUiWorkflowCandidate(brief, workflowCandidate, {
  activity_review: activityReview, surface_review: surfaceReview, callModel,
});
assert.equal(modelCalls, 0);
assert.equal(workflowReview.review_status, "ready_for_review");
assert.equal(typeof workflowReview.then, "undefined", "Deterministic review returns a packet directly.");

const defaultAuthority = kernel.createUiImplementationContract().implementation_contract;
assert.equal(defaultAuthority.design_system_source.mode, "judgmentkit_default");
const handoff = kernel.createUiGenerationHandoff(workflowReview, {
  brief, implementation_contract: defaultAuthority,
});
assert.equal(handoff.handoff_status, "ready_for_generation");
assert.equal(handoff.implementation_contract.design_system_source.mode, "judgmentkit_default");
const frontend = kernel.createFrontendGenerationContext({ brief, ui_generation_handoff: handoff });
assert.equal(frontend.frontend_context_status, "ready_for_frontend_implementation");
const skill = kernel.createFrontendImplementationSkillContext({ brief, frontend_generation_context: frontend });
assert.equal(skill.skill_context_status, "ready");
assert.deepEqual(skill.design_system_source, frontend.implementation_contract.design_system_source);
assert.throws(() => kernel.createUiGenerationHandoff(workflowReview, { brief: `${brief} The task changed.` }),
  (error) => error instanceof kernel.JudgmentKitInputError && error.code === "activity_review_source_invalid");
assert.throws(() => kernel.createUiGenerationHandoff(workflowReview, {
  brief, cognitive_dimensions_review: { cognitive_dimensions_review_status: "repair_required" },
}), (error) => error instanceof kernel.JudgmentKitInputError && error.code === "handoff_blocked");

const externalAdapter = {
  design_system_name: "Example UI", design_system_package: "@example/ui",
  token_guidance: { css_custom_properties: [{ name: "--example-surface", role: "surface", family: "color", value: "#fff", usage: "Example UI surfaces" }] },
  font_guidance: { font_roles: { body: { stack: "system-ui, sans-serif", usage: "Example UI body text" } } },
  icon_guidance: { icon_roles: ["action"], icon_catalog: {
    source: "external_design_system", library: "example-icons", package: "@example/icons",
    version: "1.0.0", icon_count: 1, license: "MIT", notice: "Test-only external icon authority.", mcp_tools: [],
  } },
  components: ["Button"],
};
const externalAuthority = kernel.createUiImplementationContract({ design_system_adapter: externalAdapter }).implementation_contract;
assert.equal(externalAuthority.design_system_source.mode, "external_design_system");
const externalHandoff = kernel.createUiGenerationHandoff(workflowReview, { brief, implementation_contract: externalAuthority });
const externalFrontend = kernel.createFrontendGenerationContext({ brief, ui_generation_handoff: externalHandoff });
assert.equal(externalFrontend.implementation_contract.design_system_source.mode, "external_design_system");
assert.equal("selected_surface_profile" in externalFrontend, false, "External authority cannot receive implicit JudgmentKit presentation guidance.");
assert.throws(() => kernel.createUiImplementationContract({ design_system_adapter: { design_system_name: "Example UI" } }),
  (error) => error instanceof kernel.JudgmentKitInputError && error.code === "incomplete_design_system_authority" && error.details.fallback_policy === "fail_incomplete");

const unresolvedSurface = kernel.recommendSurfaceTypes("Surface.");
assert.equal(unresolvedSurface.status, "review_required");
assert.equal(unresolvedSurface.recommended_surface_type, null);
const unresolvedWorkflow = kernel.reviewUiWorkflowCandidate("Surface.", workflowCandidate);
assert.throws(() => kernel.createUiGenerationHandoff(unresolvedWorkflow, { brief: "Surface." }),
  (error) => error instanceof kernel.JudgmentKitInputError && error.code === "handoff_blocked");

const fixture = JSON.parse(fs.readFileSync(new URL("../examples/ai-native-design-system/first-use.json", import.meta.url), "utf8"));
const implementationContract = kernel.createUiImplementationContract(fixture.implementation_contract_input).implementation_contract;
const originalCandidate = structuredClone(fixture.failing_candidate);
const failedReview = kernel.reviewUiImplementationCandidate(fixture.failing_candidate, { implementation_contract: implementationContract });
assert.equal(failedReview.next_agent_action, "repair_and_resubmit");
assert.equal(failedReview.candidate_artifact_status, "not_an_artifact");
assert.equal(failedReview.autofix_loop.owner, "agent");
assert.deepEqual(fixture.failing_candidate, originalCandidate, "Review returns instructions without repairing the supplied candidate.");
const stoppedReview = kernel.reviewUiImplementationCandidate(fixture.failing_candidate, {
  implementation_contract: implementationContract,
  iteration_context: { current_attempt: implementationContract.iteration_policy.default_max_attempts },
});
assert.equal(stoppedReview.next_agent_action, "stop_for_human");
assert.equal(stoppedReview.autofix_loop.status, "stopped");
const verdictStates = nodes.get("verdict").data.lines.join(" ");
for (const state of [implementationContract.iteration_policy.pass_status,
  failedReview.next_agent_action, stoppedReview.next_agent_action]) {
  assert.ok(verdictStates.includes(state), `The map must show the supported ${state} verdict.`);
}
assert.equal(failedReview.generation_gates.find((gate) => gate.id === "activity_gate").status,
  "not_evaluated_by_this_tool", "Implementation review cannot establish the whole builder outcome.");

const inspectorPacket = kernel.createUiImplementationContract({ surface_type: "artifact_inspector" });
assert.ok(inspectorPacket.generation_gates.some((gate) => gate.id === "artifact_inspector_authority_gate" && gate.status === "review_required"));
const inspectorReview = kernel.reviewUiImplementationCandidate(fixture.repaired_candidate, {
  implementation_contract: inspectorPacket.implementation_contract, surface_type: "artifact_inspector",
  trusted_runtime_evidence: { status: "pass", trusted: true },
});
// Other candidate checks can fail. The authority result stays unresolved even
// when the caller claims a passing attestation; it cannot become acceptance.
assert.equal(inspectorReview.checks.artifact_inspector.status, "review_required");
assert.ok(verdictStates.includes(inspectorReview.checks.artifact_inspector.status));
assert.equal(inspectorReview.checks.artifact_inspector.design_system_review.primary_artifact, "external_not_reviewed");
assert.equal(inspectorReview.checks.artifact_inspector.trusted_runtime_evidence.producer_available, false);
assert.equal(inspectorReview.checks.artifact_inspector.trusted_runtime_evidence.candidate_authored_evidence_accepted, false);
assert.equal(inspectorReview.checks.artifact_inspector.trusted_runtime_evidence.static_browser_evidence_accepted, false);
assert.notEqual(inspectorReview.next_agent_action, "accept");

console.log("System Map: public tools, ownership, dependencies, source continuity, authority, bounded repair, and Inspector limits passed.");
