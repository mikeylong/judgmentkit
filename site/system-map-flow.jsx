import React, { useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "./system-map-flow.css";

const NODE_TYPES = {
  mapNode: MapNode,
  zoneNode: ZoneNode,
};

const ARROW = {
  type: MarkerType.ArrowClosed,
  color: "var(--rf-map-edge)",
};

function withBaseNode(node) {
  return {
    draggable: false,
    selectable: false,
    deletable: false,
    ...node,
  };
}

const nodes = [
  withBaseNode({
    id: "zone-mcp",
    type: "zoneNode",
    position: { x: 36, y: 64 },
    data: {
      boundary: "MCP boundary",
      title: "Agent / Client / MCP",
      tone: "default",
    },
    className: "rf-zone-wrapper",
    style: { width: 330, height: 470 },
    zIndex: 0,
  }),
  withBaseNode({
    id: "agent-client",
    type: "mapNode",
    position: { x: 60, y: 156 },
    data: {
      title: "Codex or agent client",
      lines: ["Calls tools; owns the turn."],
    },
    className: "rf-map-wrapper",
    style: { width: 282, height: 78 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "source-context",
    type: "mapNode",
    position: { x: 60, y: 258 },
    data: {
      title: "Source brief + product context",
      lines: ["Brief, product facts,", "current draft findings."],
    },
    className: "rf-map-wrapper",
    style: { width: 282, height: 112 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "mcp-server",
    type: "mapNode",
    position: { x: 60, y: 392 },
    data: {
      title: "MCP server",
      lines: ["Access and transport only.", "MCP is not the LLM."],
      code: "tools/list + tools/call",
    },
    className: "rf-map-wrapper",
    style: { width: 282, height: 116 },
    zIndex: 2,
  }),

  withBaseNode({
    id: "zone-kernel",
    type: "zoneNode",
    position: { x: 430, y: 64 },
    data: {
      boundary: "JudgmentKit kernel",
      title: "Deterministic review, guardrails, handoff",
      tone: "kernel",
    },
    className: "rf-zone-wrapper",
    style: { width: 700, height: 670 },
    zIndex: 0,
  }),
  withBaseNode({
    id: "analyze",
    type: "mapNode",
    position: { x: 462, y: 170 },
    data: {
      code: "analyze_implementation_brief",
      lines: ["Extract activity evidence, source gaps,", "implementation terms, disclosure risks."],
      tone: "kernel",
    },
    className: "rf-map-wrapper",
    style: { width: 292, height: 112 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "activity-review",
    type: "mapNode",
    position: { x: 804, y: 170 },
    data: {
      code: "create_activity_model_review",
      lines: ["Name activity, participant, objective,", "decision, outcome, vocabulary."],
      tone: "kernel",
    },
    className: "rf-map-wrapper",
    style: { width: 292, height: 112 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "candidate-review",
    type: "mapNode",
    position: { x: 462, y: 318 },
    data: {
      code: "review_activity_model_candidate",
      lines: ["Review model or agent candidates", "before trusting them."],
      tone: "kernel",
    },
    className: "rf-map-wrapper",
    style: { width: 292, height: 112 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "workflow-review",
    type: "mapNode",
    position: { x: 804, y: 318 },
    data: {
      code: "review_ui_workflow_candidate",
      lines: ["Check grounding, action support,", "handoff clarity, leakage containment."],
      tone: "kernel",
    },
    className: "rf-map-wrapper",
    style: { width: 292, height: 112 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "profiles",
    type: "mapNode",
    position: { x: 462, y: 466 },
    data: {
      code: "recommend_ui_workflow_profiles",
      lines: ["Optional guidance such as", "operator-review-ui; not styling."],
      tone: "kernel",
    },
    className: "rf-map-wrapper",
    style: { width: 292, height: 112 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "handoff",
    type: "mapNode",
    position: { x: 804, y: 466 },
    data: {
      code: "create_ui_generation_handoff",
      lines: ["Gate: only ready workflow reviews", "become generation handoffs."],
      tone: "kernel",
    },
    className: "rf-map-wrapper",
    style: { width: 292, height: 112 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "blocked",
    type: "mapNode",
    position: { x: 594, y: 606 },
    data: {
      title: "Blocked path",
      lines: ["Resolve targeted questions or leakage before UI generation."],
      tone: "blocked",
    },
    className: "rf-map-wrapper",
    style: { width: 420, height: 94 },
    zIndex: 2,
  }),

  withBaseNode({
    id: "zone-llm",
    type: "zoneNode",
    position: { x: 1212, y: 64 },
    data: {
      boundary: "LLM / provider seam",
      title: "Optional model assistance",
      tone: "llm",
    },
    className: "rf-zone-wrapper",
    style: { width: 500, height: 286 },
    zIndex: 0,
  }),
  withBaseNode({
    id: "provider",
    type: "mapNode",
    position: { x: 1240, y: 170 },
    data: {
      title: "Provider adapter",
      lines: ["OpenAI, local model,", "or injected caller."],
      tone: "llm",
    },
    className: "rf-map-wrapper",
    style: { width: 204, height: 116 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "candidate",
    type: "mapNode",
    position: { x: 1470, y: 170 },
    data: {
      title: "Candidate proposal",
      lines: ["Activity/workflow JSON.", "Reviewed before use."],
      tone: "llm",
    },
    className: "rf-map-wrapper",
    style: { width: 204, height: 116 },
    zIndex: 2,
  }),

  withBaseNode({
    id: "zone-generation",
    type: "zoneNode",
    position: { x: 1212, y: 412 },
    data: {
      boundary: "Outside JudgmentKit",
      title: "UI rendering from reviewed handoff",
      tone: "output",
    },
    className: "rf-zone-wrapper",
    style: { width: 500, height: 640 },
    zIndex: 0,
  }),
  withBaseNode({
    id: "ui-pass",
    type: "mapNode",
    position: { x: 1240, y: 518 },
    data: {
      title: "LLM / agent UI pass",
      lines: ["Generate from reviewed handoff,", "not raw brief."],
      tone: "output",
    },
    className: "rf-map-wrapper",
    style: { width: 434, height: 94 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "renderer-choice",
    type: "mapNode",
    position: { x: 1240, y: 640 },
    data: {
      title: "Renderer choice after reviewed handoff",
      lines: ["Renderer may vary; active", "design-system provenance is required."],
      tone: "output",
    },
    className: "rf-map-wrapper",
    style: { width: 434, height: 106 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "external-design-system-adapter",
    type: "mapNode",
    position: { x: 1240, y: 774 },
    data: {
      title: "External adapter",
      lines: ["Complete tokens, components,", "patterns, and provenance."],
      tone: "output",
    },
    className: "rf-map-wrapper",
    style: { width: 204, height: 112 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "judgmentkit-default-source",
    type: "mapNode",
    position: { x: 1470, y: 774 },
    data: {
      title: "JudgmentKit default source",
      lines: ["Use /design-system/ exports;", "failed adapters do not fall back."],
      tone: "output",
    },
    className: "rf-map-wrapper",
    style: { width: 204, height: 112 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "ui-draft",
    type: "mapNode",
    position: { x: 1240, y: 916 },
    data: {
      title: "UI draft",
      lines: ["Reviewed by human or agent", "for next iteration."],
      tone: "output",
    },
    className: "rf-map-wrapper",
    style: { width: 434, height: 82 },
    zIndex: 2,
  }),

  withBaseNode({
    id: "zone-iteration",
    type: "zoneNode",
    position: { x: 430, y: 780 },
    data: {
      boundary: "Iteration loop",
      title: "Draft findings become updated context",
      tone: "default",
    },
    className: "rf-zone-wrapper",
    style: { width: 700, height: 190 },
    zIndex: 0,
  }),
  withBaseNode({
    id: "review-findings",
    type: "mapNode",
    position: { x: 462, y: 884 },
    data: {
      title: "Review findings",
    },
    className: "rf-map-wrapper",
    style: { width: 292, height: 60 },
    zIndex: 2,
  }),
  withBaseNode({
    id: "updated-context",
    type: "mapNode",
    position: { x: 804, y: 884 },
    data: {
      title: "updated context",
      tone: "kernel",
    },
    className: "rf-map-wrapper",
    style: { width: 292, height: 60 },
    zIndex: 2,
  }),
];

function edge(id, source, target, options = {}) {
  const stroke = options.stroke ?? "var(--rf-map-edge)";
  return {
    id,
    source,
    target,
    type: options.type ?? "smoothstep",
    sourceHandle: options.sourceHandle ?? "right-source",
    targetHandle: options.targetHandle ?? "left-target",
    label: options.label,
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 4,
    labelBgStyle: { fill: "var(--rf-map-label-bg)", fillOpacity: 0.92 },
    labelStyle: { fill: "var(--rf-map-muted)", fontSize: 12, fontWeight: 800 },
    markerEnd: { ...ARROW, color: stroke },
    style: {
      stroke,
      strokeWidth: options.strokeWidth ?? 2.5,
      strokeDasharray: options.dashed ? "7 7" : undefined,
    },
    className: options.className,
    selectable: false,
    focusable: false,
  };
}

const edges = [
  edge("mcp-to-analyze", "mcp-server", "analyze", {
    label: "MCP tool call",
    strokeWidth: 3,
  }),
  edge("source-to-mcp", "source-context", "mcp-server", {
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    stroke: "var(--rf-map-edge-muted)",
  }),
  edge("analyze-to-activity", "analyze", "activity-review", { stroke: "var(--rf-map-edge-muted)" }),
  edge("activity-to-workflow", "activity-review", "workflow-review", {
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    stroke: "var(--rf-map-edge-muted)",
  }),
  edge("candidate-review-to-workflow", "candidate-review", "workflow-review", { stroke: "var(--rf-map-edge-muted)" }),
  edge("workflow-to-handoff", "workflow-review", "handoff", {
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    stroke: "var(--rf-map-edge-muted)",
  }),
  edge("handoff-to-blocked", "handoff", "blocked", {
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    stroke: "var(--rf-map-edge-warning)",
    dashed: true,
  }),
  edge("blocked-to-mcp", "blocked", "mcp-server", {
    sourceHandle: "left-source",
    targetHandle: "bottom-target",
    label: "needs source context",
    stroke: "var(--rf-map-edge-warning)",
    dashed: true,
  }),
  edge("workflow-to-provider", "workflow-review", "provider", {
    label: "request candidate",
    stroke: "var(--rf-map-edge-warning)",
    dashed: true,
  }),
  edge("candidate-to-workflow", "candidate", "workflow-review", {
    sourceHandle: "left-source",
    targetHandle: "right-target",
    label: "proposed JSON returns for review",
    stroke: "var(--rf-map-edge-warning)",
    dashed: true,
  }),
  edge("handoff-to-ui-pass", "handoff", "ui-pass", {
    label: "reviewed handoff",
    stroke: "var(--rf-map-edge-output)",
    strokeWidth: 3,
  }),
  edge("ui-pass-to-renderer", "ui-pass", "renderer-choice", {
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    stroke: "var(--rf-map-edge-output)",
    strokeWidth: 3,
  }),
  edge("renderer-to-external-adapter", "renderer-choice", "external-design-system-adapter", {
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    label: "external adapter",
    stroke: "var(--rf-map-edge-output)",
  }),
  edge("renderer-to-default-source", "renderer-choice", "judgmentkit-default-source", {
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    label: "default source",
    stroke: "var(--rf-map-edge-output)",
  }),
  edge("external-adapter-to-draft", "external-design-system-adapter", "ui-draft", {
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    stroke: "var(--rf-map-edge-output)",
  }),
  edge("default-source-to-draft", "judgmentkit-default-source", "ui-draft", {
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    stroke: "var(--rf-map-edge-output)",
  }),
  edge("ui-draft-to-review", "ui-draft", "review-findings", {
    sourceHandle: "left-source",
    targetHandle: "right-target",
    label: "review draft",
    strokeWidth: 3,
  }),
  edge("review-to-updated", "review-findings", "updated-context", {
    stroke: "var(--rf-map-edge-muted)",
  }),
  edge("updated-to-source", "updated-context", "source-context", {
    sourceHandle: "left-source",
    targetHandle: "right-target",
    label: "updated context returns to source/activity review",
    strokeWidth: 3,
  }),
];

function Handles() {
  return (
    <>
      <Handle className="rf-map-handle" id="top-target" type="target" position={Position.Top} isConnectable={false} />
      <Handle className="rf-map-handle" id="right-target" type="target" position={Position.Right} isConnectable={false} />
      <Handle className="rf-map-handle" id="bottom-target" type="target" position={Position.Bottom} isConnectable={false} />
      <Handle className="rf-map-handle" id="left-target" type="target" position={Position.Left} isConnectable={false} />
      <Handle className="rf-map-handle" id="top-source" type="source" position={Position.Top} isConnectable={false} />
      <Handle className="rf-map-handle" id="right-source" type="source" position={Position.Right} isConnectable={false} />
      <Handle className="rf-map-handle" id="bottom-source" type="source" position={Position.Bottom} isConnectable={false} />
      <Handle className="rf-map-handle" id="left-source" type="source" position={Position.Left} isConnectable={false} />
    </>
  );
}

function MapNode({ data }) {
  const tone = data.tone ? ` rf-map-node-${data.tone}` : "";
  return (
    <div className={`rf-map-node${tone}`}>
      <Handles />
      {data.code ? <code>{data.code}</code> : <strong>{data.title}</strong>}
      {data.lines?.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

function ZoneNode({ data }) {
  const tone = data.tone ? ` rf-zone-${data.tone}` : "";
  return (
    <div className={`rf-zone-node${tone}`}>
      <span>{data.boundary}</span>
      <strong>{data.title}</strong>
    </div>
  );
}

function SystemMapFlow({ root }) {
  const handleInit = useCallback(
    (instance) => {
      requestAnimationFrame(() => {
        instance.fitView({ padding: 0.08, duration: 0 });
        root.dataset.systemMapFlowMounted = "true";
        root
          .closest("[data-system-map-flow-viewer]")
          ?.querySelector("[data-system-map-fallback]")
          ?.setAttribute("hidden", "");
      });
    },
    [root],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.08 }}
      minZoom={0.3}
      maxZoom={1.8}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll={false}
      zoomOnPinch
      panOnScroll={false}
      preventScrolling={false}
      zoomOnDoubleClick={false}
      selectionOnDrag={false}
      proOptions={{ hideAttribution: true }}
      onInit={handleInit}
      aria-label="JudgmentKit React Flow system design map"
    >
      <Background color="var(--rf-map-grid)" gap={40} size={1} />
      <Controls showInteractive={false} position="bottom-left" fitViewOptions={{ padding: 0.08 }} />
    </ReactFlow>
  );
}

function mountSystemMaps() {
  const roots = document.querySelectorAll("[data-system-map-flow-root]");
  for (const root of roots) {
    createRoot(root).render(<SystemMapFlow root={root} />);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountSystemMaps, { once: true });
} else {
  mountSystemMaps();
}
