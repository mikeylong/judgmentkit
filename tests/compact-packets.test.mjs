import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { brotliCompressSync } from "node:zlib";
import {
  COMPACT_PACKET_SCHEMA, MAX_CONTINUATION_BYTES,
  compactPacket, compactImplementationCandidate, expandCompactPacket, expandToolContinuations,
} from "../src/portable-packets.mjs";
import { handleToolCall, listTools } from "../src/mcp.mjs";
import { MAX_MCP_POST_BODY_BYTES } from "../src/mcp-http.mjs";

const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/tide-workflow.json", import.meta.url)));
const full = await handleToolCall("review_activity_model_candidate", {
  brief: fixture.brief, candidate: fixture.activity_candidate, context_items: fixture.paragraph_context,
});
const compact = compactPacket(full, "review_activity_model_candidate");
assert.equal(compact.schema, COMPACT_PACKET_SCHEMA);
assert.deepEqual(expandCompactPacket(compact), full);
assert.deepEqual(compact.active_guidance.candidate.activity_model, full.candidate.activity_model);
assert.equal(compact.active_guidance.review_status, full.review_status);
assert.equal(compact.serialization_metrics.full_packet_bytes, Buffer.byteLength(JSON.stringify(full)));
assert.equal(compact.serialization_metrics.compact_packet_bytes, Buffer.byteLength(JSON.stringify(compact)));
assert.ok(!JSON.stringify(compact.serialization_metrics).includes("tokens"));

// Active guidance is a readable view, never authority for downstream validation.
const changedGuidance = structuredClone(compact);
changedGuidance.active_guidance.candidate.activity_model.objective = "Approve an emergency shutdown.";
assert.deepEqual(expandCompactPacket(changedGuidance), full);
const route = await handleToolCall("recommend_surface_types", { brief: fixture.brief, activity_review: compact, packet_format: "compact" });
assert.equal(route.active_guidance.recommended_surface_type, "dashboard_monitor");
const workflowArgs = { brief: fixture.brief, candidate: fixture.workflow_candidate,
  activity_review: compact, surface_review: route, context_items: fixture.paragraph_context };
const reviewed = await handleToolCall("review_ui_workflow_candidate", workflowArgs);
assert.equal(reviewed.review_status, "ready_for_review");
assert.deepEqual(reviewed, await handleToolCall("review_ui_workflow_candidate", {
  ...workflowArgs, activity_review: full, surface_review: expandCompactPacket(route), packet_format: "full",
}));
const missingRaw = await handleToolCall("review_ui_workflow_candidate", { ...workflowArgs, context_items: [] });
assert.ok(missingRaw.error, "A lossless continuation cannot substitute for required exact raw context.");
const changedRaw = await handleToolCall("review_ui_workflow_candidate", {
  ...workflowArgs, context_items: fixture.paragraph_context.map((item, index) => index ? { ...item, content: `${item.content} changed` } : item),
});
assert.ok(changedRaw.error, "The ordinary raw-source integrity check still applies after decode.");

for (const mutate of [
  (p) => { p.continuation.sha256 = "0".repeat(64); },
  (p) => { p.continuation.uncompressed_bytes += 1; },
  (p) => { p.continuation.data = "wrong!"; },
  (p) => { p.packet_kind = "create_ui_implementation_contract"; },
  (p) => { p.continuation.uncompressed_bytes = MAX_CONTINUATION_BYTES + 1; },
]) {
  const damaged = structuredClone(compact); mutate(damaged);
  const result = await handleToolCall("recommend_surface_types", { brief: fixture.brief, activity_review: damaged });
  assert.equal(result.error?.code, "invalid_compact_continuation");
  assert.equal(result.error.details.attempt_consumed, false);
}
const bombBytes = Buffer.alloc(MAX_CONTINUATION_BYTES + 1, "a");
const bomb = structuredClone(compact);
bomb.continuation.data = brotliCompressSync(bombBytes).toString("base64");
bomb.continuation.uncompressed_bytes = MAX_CONTINUATION_BYTES;
bomb.continuation.sha256 = createHash("sha256").update(bombBytes).digest("hex");
assert.throws(() => expandCompactPacket(bomb), /size limit/);
const invalidUtf8 = Buffer.concat([Buffer.from('{"source":"'), Buffer.from([255]), Buffer.from('"}')]);
const invalidSource = structuredClone(compact);
invalidSource.continuation.data = brotliCompressSync(invalidUtf8).toString("base64");
invalidSource.continuation.uncompressed_bytes = invalidUtf8.length;
invalidSource.continuation.sha256 = createHash("sha256").update(invalidUtf8).digest("hex");
assert.throws(() => expandCompactPacket(invalidSource), /UTF-8/);
assert.throws(() => expandCompactPacket(compactPacket(compact, "review_activity_model_candidate")), /nested/);
assert.deepEqual(expandToolContinuations({ activity_review: full }).activity_review, full);

// A representative large context exercises the hosted admission limit without
// importing the private Inspector session into the repository.
const implementation = await handleToolCall("create_ui_implementation_contract", {});
const repeatedContext = { implementation_contract: implementation.implementation_contract,
  implementation_guidance: { ...implementation.implementation_contract },
  activity_model: full.candidate.activity_model, interaction_contract: full.candidate.interaction_contract,
  source: { brief: fixture.brief, context_items: fixture.paragraph_context },
  inventory: Array.from({ length: 5 }, () => implementation.implementation_contract) };
const request = { jsonrpc: "2.0", id: 1, method: "tools/call", params: {
  name: "review_ui_implementation_candidate", arguments: {
    candidate: { code: "const view = 'read measurements';" },
    implementation_contract: implementation,
    frontend_generation_context: repeatedContext,
  } } };
const fullRequestBytes = Buffer.byteLength(JSON.stringify(request));
assert.ok(fullRequestBytes > MAX_MCP_POST_BODY_BYTES);
request.params.arguments.implementation_contract = compactPacket(implementation, "create_ui_implementation_contract");
request.params.arguments.frontend_generation_context = compactPacket(repeatedContext, "create_frontend_generation_context");
assert.ok(Buffer.byteLength(JSON.stringify(request)) < MAX_MCP_POST_BODY_BYTES);
assert.deepEqual(expandCompactPacket(request.params.arguments.frontend_generation_context), repeatedContext);

const chartCandidate = {
  primitives_used: ["chart_view"],
  chart_review_manifest: { chart_selector: "#chart", plot_selector: "#plot", series_selector: "#series",
    states: Array.from({ length: 14 }, (_, index) => ({ state_id: `state-${index}`,
      rendered_html: `<main><svg id="chart"><rect id="plot"/><path id="series"/></svg><!--${"frozen chart source ".repeat(2500)}--></main>` })) },
};
const packedCandidate = compactImplementationCandidate(chartCandidate);
assert.deepEqual(expandCompactPacket(packedCandidate, ["ui_implementation_candidate"]), chartCandidate);
assert.equal(packedCandidate.active_guidance.evidence_summary.chart_manifest.states.length, 14);
const fullCandidateBytes = Buffer.byteLength(JSON.stringify(chartCandidate));
const packedCandidateBytes = Buffer.byteLength(JSON.stringify(packedCandidate));
assert.ok(fullCandidateBytes > MAX_MCP_POST_BODY_BYTES);
assert.ok(packedCandidateBytes < MAX_MCP_POST_BODY_BYTES);
const malformedCandidate = { states_covered: "loading", primitives_used: 42 };
const candidateAdmissionArgs = { candidate: malformedCandidate, implementation_contract: implementation };
assert.deepEqual(await handleToolCall("preflight_ui_implementation_candidate", candidateAdmissionArgs),
  await handleToolCall("preflight_ui_implementation_candidate", { ...candidateAdmissionArgs,
    candidate: compactImplementationCandidate(malformedCandidate) }));
const wrongCandidateKind = await handleToolCall("preflight_ui_implementation_candidate", {
  ...candidateAdmissionArgs, candidate: compact,
});
assert.equal(wrongCandidateKind.error.code, "invalid_compact_continuation");
for (const name of ["create_activity_model_review", "review_ui_workflow_candidate", "create_ui_implementation_contract"])
  assert.deepEqual(listTools().find((tool) => tool.name === name).inputSchema.properties.packet_format.enum, ["full", "compact"]);

console.log("Compact packet compatibility, exact-source continuity, bounded decode, and hosted-size regression tests passed.");
