// Integration route, not a scheduler. Shared by React Flow and the static fallback.
export const SYSTEM_MAP_VIEWBOX = { width: 1760, height: 1700 };

const zone = (id, x, y, width, height, boundary, title, tone = "default") => ({
  id, type: "zoneNode", position: { x, y }, style: { width, height },
  data: { boundary, title, tone }, className: "rf-zone-wrapper", zIndex: 0,
});
const stage = (id, x, y, width, height, title, tools, lines, tone = "kernel") => ({
  id, type: "mapNode", position: { x, y }, style: { width, height },
  data: { title, tools, lines, tone }, className: "rf-map-wrapper", zIndex: 2,
});

export const SYSTEM_MAP_NODES = [
  zone("zone-client", 36, 64, 330, 1570, "Outside the deterministic core", "Builder and agent"),
  zone("zone-kernel", 430, 64, 700, 1570, "JudgmentKit kernel", "Contracts and review", "kernel"),
  zone("zone-generation", 1212, 64, 500, 1570, "Outside the deterministic core", "Build, measure, and try", "output"),
  stage("agent-client", 60, 170, 282, 110, "Client owns execution", [], [
    "Builder supplies the task.", "Agent calls tools, builds, and repairs.",
  ], "default"),
  stage("source-context", 60, 330, 282, 138, "Source brief + product context", [], [
    "Current brief and attributed facts.", "Resupply raw source at validating", "boundaries; receipts are continuity.",
  ], "default"),
  stage("access", 60, 520, 282, 180, "Library and MCP access", [], [
    "MCP and library expose the review route.", "CLI: activity review + evidence preflight.", "Full packets or compact continuation.", "MCP wires bounded browser checks.",
  ], "default"),
  stage("proposals", 60, 735, 282, 166, "Optional model proposals", [], [
    "Client or explicit library helper", "invokes an injected model caller.", "Activity/workflow candidates return", "to deterministic review.",
  ], "llm"),
  stage("repair", 60, 1460, 282, 170, "Agent resolves and resubmits", [], [
    "Repair packets before UI judgment.", "Repair failed UI after review.", "Changed premise: refresh source", "and dependent review packets.", "Human resolves escalated decisions.",
  ], "blocked"),
  stage("activity-review", 462, 170, 292, 180, "1. Ground the activity", [
    "create_activity_model_review", "review_activity_model_candidate",
  ], ["Baseline includes brief analysis.", "Negation and clause scope stay intact.", "Review external candidates before use."]),
  stage("surface", 804, 170, 292, 180, "2. Select the surface", [
    "recommend_surface_types", "recommend_ui_workflow_profiles",
  ], ["Purpose, confidence, origin, and conflicts.", "No evidence: review_required, no surface.", "Selection provenance is not authority."]),
  stage("workflow-review", 804, 398, 292, 170, "3. Review the workflow", [
    "review_ui_workflow_candidate", "review_cognitive_dimensions_candidate",
  ], ["Source, actions, completion, disclosure.", "Cognitive Dimensions is optional;", "if supplied, it must be ready."]),
  stage("implementation-contract", 462, 398, 292, 170, "4. Set implementation authority", [
    "create_ui_implementation_contract",
  ], ["Default or complete external adapter.", "Required states and verification checks.", "Chart promise binds expected data.", "Incomplete external authority fails."]),
  stage("handoff", 462, 650, 292, 158, "5. Gate the handoff", [
    "create_ui_generation_handoff",
  ], ["Ready workflow + implementation contract.", "Revalidate current source and authority.", "Blocked readiness prevents generation."]),
  stage("frontend", 804, 650, 292, 200, "6. Prepare frontend guidance", [
    "create_frontend_generation_context", "create_frontend_implementation_skill_context",
  ], ["Ready handoff + resolved surface.", "Project context and verification plan.", "Portable instructions are optional."]),
  stage("ui-pass", 1240, 650, 434, 158, "7. Agent implements the interface", [], [
    "Uses the reviewed handoff and active authority.", "Client chooses the renderer; root is framework-neutral.", "React adapter is an optional candidate.",
  ], "output"),
  stage("evidence", 1240, 890, 434, 190, "Run checks and collect evidence", [], [
    "Agent runs application/browser task checks.", "Trusted runtime measures eligible self-contained HTML.", "Chart labels, clipping, and selected data are observed.", "Expected data comes from the active contract.", "Static snapshots do not attest live transitions.",
  ], "output"),
  stage("preflight", 804, 890, 292, 190, "8. Preflight the evidence", [
    "preflight_ui_implementation_candidate",
  ], ["Shape and selectors before UI judgment.", "Packet repairs use no attempt.", "Runtime unavailable: retry_preflight."]),
  stage("implementation-review", 804, 1150, 292, 170, "9. Review implementation", [
    "review_ui_implementation_candidate",
  ], ["Contract, authority, states, evidence.", "Failed candidates are repair diagnostics.", "No automatic agent repair or publication."]),
  stage("verdict", 462, 1150, 292, 158, "Review verdict", [], [
    "accept / repair_and_resubmit", "stop_for_human / review_required", "Acceptance is bounded to checked claims."]),
  stage("limits", 462, 1460, 634, 156, "Deferred Inspector verification", [], [
    "No trusted interactive-attestation producer or verifier exists.", "Otherwise valid: review_required; next_agent_action: none.", "Primary artifact: external_not_reviewed. No automatic repair can close this limit.",
  ], "blocked"),
  stage("human-task", 1240, 1460, 434, 156, "Person tries the real task", [], [
    "Observe completion, confusion, and recovery.", "Record usefulness separately from contract acceptance.", "Task findings guide the next iteration.",
  ], "output"),
];

const link = (id, source, target, points, options = {}) => ({
  id, source, target, type: "mapEdge", zIndex: 1,
  sourceHandle: options.sourceHandle ?? "right-source",
  targetHandle: options.targetHandle ?? "left-target",
  label: options.label,
  data: { points, tone: options.tone ?? "default", dashed: options.dashed ?? false,
    labelPosition: options.labelPosition },
});
export const SYSTEM_MAP_EDGES = [
  link("client-to-source", "agent-client", "source-context", [[201,280],[201,330]], {sourceHandle:"bottom-source",targetHandle:"top-target"}),
  link("source-to-access", "source-context", "access", [[201,468],[201,520]], {sourceHandle:"bottom-source",targetHandle:"top-target"}),
  link("access-to-activity", "access", "activity-review", [[342,592],[400,592],[400,250],[462,250]]),
  link("activity-to-surface", "activity-review", "surface", [[754,250],[804,250]]),
  link("surface-to-workflow", "surface", "workflow-review", [[950,330],[950,398]], {sourceHandle:"bottom-source",targetHandle:"top-target"}),
  link("workflow-to-contract", "workflow-review", "implementation-contract", [[804,483],[754,483]], {sourceHandle:"left-source",targetHandle:"right-target"}),
  link("contract-to-handoff", "implementation-contract", "handoff", [[608,568],[608,650]], {sourceHandle:"bottom-source",targetHandle:"top-target"}),
  link("workflow-to-handoff", "workflow-review", "handoff", [[950,568],[950,610],[714,610],[714,650]], {sourceHandle:"bottom-source",targetHandle:"top-target",dashed:true}),
  link("handoff-to-frontend", "handoff", "frontend", [[754,729],[804,729]]),
  link("frontend-to-ui", "frontend", "ui-pass", [[1096,737],[1160,737],[1160,729],[1240,729]], {tone:"output"}),
  link("ui-to-evidence", "ui-pass", "evidence", [[1457,808],[1457,890]], {sourceHandle:"bottom-source",targetHandle:"top-target",tone:"output"}),
  link("evidence-to-preflight", "evidence", "preflight", [[1240,985],[1096,985]], {sourceHandle:"left-source",targetHandle:"right-target"}),
  link("preflight-to-review", "preflight", "implementation-review", [[950,1080],[950,1150]], {sourceHandle:"bottom-source",targetHandle:"top-target",label:"ready_for_review",labelPosition:{x:1030,y:1115}}),
  link("preflight-to-repair", "preflight", "repair", [[804,1010],[784,1010],[784,1380],[320,1380],[320,1460]], {sourceHandle:"left-source",targetHandle:"top-target",tone:"warning",dashed:true,label:"Packet repair / runtime retry; no attempt",labelPosition:{x:590,y:1380}}),
  link("review-to-verdict", "implementation-review", "verdict", [[804,1235],[754,1229]], {sourceHandle:"left-source",targetHandle:"right-target"}),
  link("client-to-proposals", "agent-client", "proposals", [[60,225],[45,225],[45,818],[60,818]], {sourceHandle:"left-source",tone:"warning",dashed:true}),
  link("proposal-to-activity", "proposals", "activity-review", [[342,795],[380,795],[380,310],[462,310]], {tone:"warning",dashed:true}),
  link("proposal-to-workflow", "proposals", "workflow-review", [[342,850],[414,850],[414,360],[1140,360],[1140,483],[1096,483]], {tone:"warning",dashed:true,targetHandle:"right-target"}),
  link("handoff-to-repair", "handoff", "repair", [[462,750],[442,750],[442,1100],[201,1100],[201,1460]], {sourceHandle:"left-source",targetHandle:"top-target",tone:"warning",dashed:true,label:"Blocked readiness",labelPosition:{x:300,y:1100}}),
  link("verdict-to-limits", "verdict", "limits", [[608,1308],[608,1460]], {sourceHandle:"bottom-source",targetHandle:"top-target",tone:"warning",dashed:true,label:"Inspector: review_required",labelPosition:{x:675,y:1420}}),
  link("verdict-to-repair", "verdict", "repair", [[462,1229],[250,1229],[250,1460]], {sourceHandle:"left-source",targetHandle:"top-target",tone:"warning",dashed:true,label:"repair_and_resubmit / stop_for_human",labelPosition:{x:265,y:1280}}),
  link("repair-to-source", "repair", "source-context", [[60,1512],[20,1512],[20,420],[60,420]], {sourceHandle:"left-source",tone:"warning",dashed:true}),
  link("repair-to-ui", "repair", "ui-pass", [[201,1630],[201,1680],[1696,1680],[1696,729],[1674,729]], {sourceHandle:"bottom-source",targetHandle:"right-target",tone:"warning",dashed:true,label:"UI and evidence repair",labelPosition:{x:1040,y:1680}}),
  link("evidence-to-human", "evidence", "human-task", [[1580,1080],[1580,1460]], {sourceHandle:"bottom-source",targetHandle:"top-target",tone:"output",dashed:true}),
  link("human-to-repair", "human-task", "repair", [[1320,1616],[1320,1650],[300,1650],[300,1630]], {sourceHandle:"bottom-source",targetHandle:"bottom-target",tone:"warning",dashed:true,label:"Task findings",labelPosition:{x:700,y:1650}}),
];

export function systemMapEdgePath(points) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}
