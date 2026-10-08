import React, { useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "./system-map-flow.css";
import { SYSTEM_MAP_NODES, SYSTEM_MAP_EDGES, systemMapEdgePath } from "./system-map-model.mjs";

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

const nodes = SYSTEM_MAP_NODES.map(withBaseNode);
const EDGE_TYPES = { mapEdge: MapEdge };
const edges = SYSTEM_MAP_EDGES.map((edge) => {
  const stroke = edge.data.tone === "warning"
    ? "var(--rf-map-edge-warning)"
    : edge.data.tone === "output" ? "var(--rf-map-edge-output)" : "var(--rf-map-edge)";
  return {
    ...edge,
    markerEnd: { ...ARROW, color: stroke },
    style: { stroke, strokeWidth: 2.5, strokeDasharray: edge.data.dashed ? "7 7" : undefined },
    selectable: false,
    focusable: false,
  };
});

function MapEdge({ id, data, markerEnd, style, label }) {
  return (
    <BaseEdge
      id={id}
      path={systemMapEdgePath(data.points)}
      markerEnd={markerEnd}
      style={style}
      label={label}
      labelX={data.labelPosition?.x}
      labelY={data.labelPosition?.y}
      labelBgPadding={[6, 4]}
      labelBgBorderRadius={4}
      labelBgStyle={{ fill: "var(--rf-map-label-bg)", fillOpacity: 0.96 }}
      labelStyle={{ fill: "var(--rf-map-muted)", fontSize: 12, fontWeight: 800 }}
    />
  );
}

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
      {data.title && <strong>{data.title}</strong>}
      {data.tools?.map((tool) => <code key={tool}>{tool}</code>)}
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
      edgeTypes={EDGE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.08 }}
      minZoom={0.16}
      maxZoom={1.8}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      panOnDrag
      panActivationKeyCode={null}
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
