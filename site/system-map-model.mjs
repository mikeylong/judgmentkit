// Integration route, not a scheduler. Shared by React Flow and the static fallback.
export const SYSTEM_MAP_VIEWBOX = { width: 1760, height: 1400 };

const zone = (id, x, y, width, height, boundary, title, tone = "default") => ({
  id, type: "zoneNode", position: { x, y }, style: { width, height },
  data: { boundary, title, tone }, className: "rf-zone-wrapper", zIndex: 0,
});
const stage = (id, x, y, width, height, title, tools, lines, tone = "kernel") => ({
  id, type: "mapNode", position: { x, y }, style: { width, height },
  data: { title, tools, lines, tone }, className: "rf-map-wrapper", zIndex: 2,
});

export const SYSTEM_MAP_NODES = [
  zone("zone-client", 36, 64, 330, 1270, "Outside the deterministic core", "Builder and agent"),
  zone("zone-kernel", 430, 64, 700, 1270, "JudgmentKit kernel", "Contracts and review", "kernel"),
  zone("zone-generation", 1212, 64, 500, 1270, "Outside the deterministic core", "Build, measure, and try", "output"),
  stage("agent-client", 60, 170, 282, 110, "Client owns execution", [], [
    "Builder supplies the task.", "Agent calls tools, builds, and repairs.",
  ], "default"),
  stage("source-context", 60, 330, 282, 138, "Source brief + product context", [], [
    "Current brief and attributed facts.", "Resupply raw source at validating", "boundaries; receipts are continuity.",
  ], "default"),
  stage("access", 60, 520, 282, 144, "Library and MCP access", [], [
    "MCP: tools/list + tools/call.", "MCP wires supported browser checks.", "CLI: activity analysis/review only.",
  ], "default"),
  stage("proposals", 60, 735, 282, 166, "Optional model proposals", [], [
    "Client or explicit library helper", "invokes an injected model caller.", "Activity/workflow candidates return", "to deterministic review.",
  ], "llm"),
  stage("repair", 60, 1138, 282, 156, "Agent resolves and resubmits", [], [
    "Repair UI and evidence as needed.", "Changed premise: refresh source", "and dependent review packets.", "Human resolves escalated decisions.",
  ], "blocked"),
  stage("activity-review", 462, 170, 292, 160, "1. Ground the activity", [
    "create_activity_model_review", "review_activity_model_candidate",
  ], ["Baseline includes brief analysis.", "Review external candidates before use."]),
  stage("surface", 804, 170, 292, 160, "2. Select the surface", [
    "recommend_surface_types", "recommend_ui_workflow_profiles",
  ], ["Nine activity purposes; profiles optional.", "No evidence: review_required, no surface."]),
  stage("workflow-review", 804, 398, 292, 170, "3. Review the workflow", [
    "review_ui_workflow_candidate", "review_cognitive_dimensions_candidate",
  ], ["Source, actions, completion, disclosure.", "Cognitive Dimensions is optional;", "if supplied, it must be ready."]),
  stage("implementation-contract", 462, 398, 292, 170, "4. Set implementation authority", [
    "create_ui_implementation_contract",
  ], ["Default or complete external adapter.", "Required states and verification checks.", "Incomplete external authority fails."]),
  stage("handoff", 462, 650, 292, 158, "5. Gate the handoff", [
    "create_ui_generation_handoff",
  ], ["Ready workflow + implementation contract.", "Revalidate current source and authority.", "Blocked readiness prevents generation."]),
  stage("frontend", 804, 650, 292, 200, "6. Prepare frontend guidance", [
    "create_frontend_generation_context", "create_frontend_implementation_skill_context",
  ], ["Ready handoff + resolved surface.", "Project context and verification plan.", "Portable instructions are optional."]),
  stage("ui-pass", 1240, 650, 434, 158, "7. Agent implements the interface", [], [
    "Uses the reviewed handoff and active authority.", "Client chooses the renderer; root is framework-neutral.", "React adapter is an optional candidate.",
  ], "output"),
  stage("evidence", 1240, 890, 434, 158, "Run checks and collect evidence", [], [
    "Agent runs application/browser task checks.", "Supported runtime independently measures qualifying", "self-contained HTML visual composition only.",
  ], "output"),
  stage("implementation-review", 804, 890, 292, 158, "8. Review implementation", [
    "review_ui_implementation_candidate",
  ], ["Contract, authority, states, evidence.", "Failed candidates are repair diagnostics.", "No automatic agent repair or publication."]),
  stage("verdict", 462, 890, 292, 158, "Review verdict", [], [
    "accept / repair_and_resubmit", "stop_for_human / review_required", "Acceptance is bounded to checked claims."]),
  stage("limits", 462, 1138, 634, 156, "Deferred Inspector verification", [], [
    "No trusted interactive-attestation producer or verifier exists.", "Otherwise valid: review_required; next_agent_action: none.", "Primary artifact: external_not_reviewed. No automatic repair can close this limit.",
  ], "blocked"),
  stage("human-task", 1240, 1138, 434, 156, "Person tries the real task", [], [
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
  link("evidence-to-review", "evidence", "implementation-review", [[1240,969],[1096,969]], {sourceHandle:"left-source",targetHandle:"right-target"}),
  link("review-to-verdict", "implementation-review", "verdict", [[804,969],[754,969]], {sourceHandle:"left-source",targetHandle:"right-target"}),
  link("client-to-proposals", "agent-client", "proposals", [[60,225],[45,225],[45,818],[60,818]], {sourceHandle:"left-source",tone:"warning",dashed:true}),
  link("proposal-to-activity", "proposals", "activity-review", [[342,795],[380,795],[380,310],[462,310]], {tone:"warning",dashed:true}),
  link("proposal-to-workflow", "proposals", "workflow-review", [[342,850],[414,850],[414,360],[1140,360],[1140,483],[1096,483]], {tone:"warning",dashed:true,targetHandle:"right-target"}),
  link("handoff-to-repair", "handoff", "repair", [[462,750],[442,750],[442,1080],[300,1080],[300,1138]], {sourceHandle:"left-source",targetHandle:"top-target",tone:"warning",dashed:true,label:"Blocked readiness",labelPosition:{x:372,y:1080}}),
  link("verdict-to-limits", "verdict", "limits", [[608,1048],[608,1138]], {sourceHandle:"bottom-source",targetHandle:"top-target",tone:"warning",dashed:true,label:"Inspector: review_required",labelPosition:{x:765,y:1095}}),
  link("verdict-to-repair", "verdict", "repair", [[462,969],[201,969],[201,1138]], {sourceHandle:"left-source",targetHandle:"top-target",tone:"warning",dashed:true,label:"repair_and_resubmit / stop_for_human",labelPosition:{x:201,y:1030}}),
  link("repair-to-source", "repair", "source-context", [[60,1190],[20,1190],[20,420],[60,420]], {sourceHandle:"left-source",tone:"warning",dashed:true}),
  link("repair-to-ui", "repair", "ui-pass", [[201,1294],[201,1360],[1696,1360],[1696,729],[1674,729]], {sourceHandle:"bottom-source",targetHandle:"right-target",tone:"warning",dashed:true,label:"UI and evidence repair",labelPosition:{x:1040,y:1360}}),
  link("evidence-to-human", "evidence", "human-task", [[1580,1048],[1580,1138]], {sourceHandle:"bottom-source",targetHandle:"top-target",tone:"output",dashed:true}),
  link("human-to-repair", "human-task", "repair", [[1320,1294],[1320,1340],[300,1340],[300,1294]], {sourceHandle:"bottom-source",targetHandle:"bottom-target",tone:"warning",dashed:true,label:"Task findings",labelPosition:{x:700,y:1340}}),
];

export function systemMapEdgePath(points) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}
