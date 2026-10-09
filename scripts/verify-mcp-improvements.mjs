import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { expandCompactPacket, compactPacket, compactImplementationCandidate } from "../src/portable-packets.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const output = path.resolve(root, "outputs/mcp-improvements");
const fixture = JSON.parse(await fs.readFile(path.join(root, "tests/fixtures/tide-workflow.json"), "utf8"));
const records = [];
const sizes = [];
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const client = new Client({ name: "judgmentkit-mcp-improvements-verifier", version: "1.0.0" });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, "bin/judgmentkit-mcp-stdio.mjs")], cwd: root, stderr: "pipe" });
let stderr = "";
transport.stderr?.on("data", (data) => { stderr += data; });
async function call(name, args, label) {
  const start = performance.now();
  const request = { name, arguments: args };
  const result = await client.callTool(request);
  records.push({ label, transport: "local_stdio", fresh_model_generation: false,
    request, response: result });
  sizes.push({ label, request_bytes: Buffer.byteLength(JSON.stringify(request)),
    response_bytes: Buffer.byteLength(JSON.stringify(result)),
    elapsed_ms: Math.round((performance.now() - start) * 100) / 100 });
  return result.structuredContent;
}

try {
  await client.connect(transport);
  const listing = await client.listTools();
  records.push({ label: "tools", response: listing });
  const base = { brief: fixture.brief, candidate: fixture.activity_candidate, context_items: fixture.paragraph_context };
  const fullActivity = await call("review_activity_model_candidate", base, "full_activity");
  const activity = await call("review_activity_model_candidate", { ...base, packet_format: "compact" }, "compact_activity");
  assert.deepEqual(expandCompactPacket(activity), fullActivity);
  const surface = await call("recommend_surface_types", {
    brief: fixture.brief, activity_review: activity, packet_format: "compact",
  }, "compact_surface");
  assert.equal(surface.active_guidance.recommended_surface_type, "dashboard_monitor");
  const workflowArgs = { brief: fixture.brief, candidate: fixture.workflow_candidate,
    activity_review: activity, surface_review: surface, context_items: fixture.paragraph_context,
    packet_format: "compact" };
  const workflow = await call("review_ui_workflow_candidate", workflowArgs, "compact_workflow");
  assert.equal(expandCompactPacket(workflow).review_status, "ready_for_review");
  const omitted = await call("review_ui_workflow_candidate", { ...workflowArgs, context_items: [] }, "missing_raw_context");
  assert.ok(omitted.error);
  const conflict = await call("review_ui_workflow_candidate", { ...workflowArgs, surface_type: "workbench" }, "conflicting_selection");
  assert.equal(conflict.error?.code, "conflicting_surface_selection");
  const agentSelected = await call("review_ui_workflow_candidate", {
    ...workflowArgs, surface_review: undefined, surface_type: "dashboard_monitor",
    surface_selection_origin: "agent",
  }, "agent_selection_origin");
  assert.equal(expandCompactPacket(agentSelected).surface_guidance.selection_origin, "agent");
  const contract = await call("create_ui_implementation_contract", { packet_format: "compact" }, "compact_contract");
  const handoff = await call("create_ui_generation_handoff", {
    brief: fixture.brief, context_items: fixture.paragraph_context,
    workflow_review: workflow, implementation_contract: contract, packet_format: "compact",
  }, "compact_handoff");
  assert.equal(expandCompactPacket(handoff).handoff_status, "ready_for_generation");
  const frontend = await call("create_frontend_generation_context", {
    brief: fixture.brief, context_items: fixture.paragraph_context,
    ui_generation_handoff: handoff, packet_format: "compact",
  }, "compact_frontend");
  const skill = await call("create_frontend_implementation_skill_context", {
    brief: fixture.brief, context_items: fixture.paragraph_context,
    frontend_generation_context: frontend, packet_format: "compact",
  }, "compact_skill");
  assert.equal(expandCompactPacket(skill).skill_context_status, "ready");
  assert.ok(skill.active_guidance.instruction_markdown);

  if (listing.tools.some((tool) => tool.name === "preflight_ui_implementation_candidate")) {
    const malformed = { states_covered: "loading", primitives_used: 42 };
    const preflight = await call("preflight_ui_implementation_candidate", {
      candidate: malformed, implementation_contract: contract, packet_format: "compact",
    }, "preflight_malformed_evidence");
    const decoded = expandCompactPacket(preflight);
    assert.equal(decoded.attempt_consumed, false);
    assert.equal(decoded.substantive_review_performed, false);
    const admission = await call("review_ui_implementation_candidate", {
      candidate: malformed, implementation_contract: contract,
      iteration_context: { attempt: 1 }, packet_format: "compact",
    }, "review_malformed_admission");
    assert.equal(expandCompactPacket(admission).attempt_consumed, false);
  } else {
    throw new Error("The required preflight MCP tool is absent.");
  }

  // A synthetic chart oracle makes transport/runtime behavior reproducible without
  // treating a historical application as a new generation or product target.
  const chartHtml = `<main><svg id="chart" width="300" height="180" viewBox="0 0 300 180"><rect id="plot" x="30" y="30" width="240" height="100" fill="none"/><path id="series" d="M30 130 L270 30" stroke="black" fill="none"/><text x="30" y="160">start</text><text x="240" y="160">end</text></svg><!--${"frozen snapshot transport regression ".repeat(1300)}--></main>`;
  const chartDataCases = Array.from({ length: 14 }, (_, index) => ({ state_id: `chart-${index}`,
    source_ref: "scripts/verify-mcp-improvements.mjs#synthetic-chart-oracle",
    points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], x_domain: [0, 1], y_domain: [0, 1],
    required_labels: [{ text: "start", role: "x_axis" }, { text: "end", role: "x_axis" }] }));
  const chartContract = await call("create_ui_implementation_contract", {
    chart_review_policy: { data_cases: chartDataCases }, packet_format: "compact",
  }, "chart_contract");
  const chartCandidate = { primitives_used: ["chart_view"], states_covered: [], static_checks: [],
    rendered_html: chartHtml, chart_review_manifest: { chart_selector: "#chart", plot_selector: "#plot", series_selector: "#series",
      states: chartDataCases.map(({ state_id }) => ({ state_id, rendered_html: chartHtml })) } };
  const chartArgs = { candidate: compactImplementationCandidate(chartCandidate), implementation_contract: chartContract, packet_format: "compact" };
  const chartFullRequestBytes = Buffer.byteLength(JSON.stringify({ ...chartArgs, candidate: chartCandidate }));
  const chartCompactRequestBytes = Buffer.byteLength(JSON.stringify(chartArgs));
  assert.ok(chartFullRequestBytes > 128 * 1024);
  assert.ok(chartCompactRequestBytes < 128 * 1024);
  const chartReview = expandCompactPacket(await call("review_ui_implementation_candidate", chartArgs, "compact_chart_runtime"));
  assert.equal(chartReview.checks?.chart_review?.outcome, "pass");
  assert.equal(chartReview.checks.chart_review.observations.length, 28);
  const chartTransport = { full_request_bytes: chartFullRequestBytes,
    compact_request_bytes: chartCompactRequestBytes, snapshot_observations: 28,
    chart_outcome: chartReview.checks.chart_review.outcome,
    overall_review: chartReview.implementation_review_status,
    scope: "Synthetic chart transport/runtime regression; absent UI behavior evidence deliberately remains a substantive failure." };

  const inspectorSource = process.argv.find((value) => value.startsWith("--inspector-request="))?.split("=").slice(1).join("=");
  let historicalInspector = null;
  if (inspectorSource) {
    const originalBytes = await fs.readFile(inspectorSource);
    const rpc = JSON.parse(originalBytes);
    const canonicalFullBytes = Buffer.byteLength(JSON.stringify(rpc));
    for (const [field, tool] of [["implementation_contract", "create_ui_implementation_contract"],
      ["frontend_generation_context", "create_frontend_generation_context"]]) {
      const fullPacket = rpc.params.arguments[field];
      const packed = compactPacket(fullPacket, tool);
      assert.deepEqual(expandCompactPacket(packed), fullPacket);
      rpc.params.arguments[field] = packed;
    }
    const originalCandidate = rpc.params.arguments.candidate;
    rpc.params.arguments.candidate = compactImplementationCandidate(originalCandidate);
    assert.deepEqual(expandCompactPacket(rpc.params.arguments.candidate), originalCandidate);
    const compactRequestBytes = Buffer.byteLength(JSON.stringify(rpc));
    assert.ok(compactRequestBytes < 128 * 1024);
    const result = await call("review_ui_implementation_candidate", rpc.params.arguments, "historical_inspector_request_replay");
    historicalInspector = { source_path: path.resolve(inspectorSource), source_sha256: digest(originalBytes),
      original_file_bytes: originalBytes.length, full_request_serialized_bytes: canonicalFullBytes,
      compact_request_serialized_bytes: compactRequestBytes,
      result: result.implementation_review_status ?? result.error?.code ?? result.admission_status,
      scope: "Historical request replay against current local stdio. No fresh generation or hosted acceptance." };
  }
  await fs.mkdir(output, { recursive: true });
  const transcript = records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  await fs.writeFile(path.join(output, "stdio-transcript.jsonl"), transcript);
  const summary = { kind: "current_local_stdio_regression_verification", fresh_model_generation: false,
    hosted_acceptance: false, tool_count: listing.tools.length, packet_sizes: sizes,
    historical_inspector: historicalInspector, chart_transport: chartTransport, transcript_sha256: digest(transcript),
    provider_usage: { tokens: "unavailable; no model generation was performed", monetary_cost: "unavailable" },
    stderr };
  await fs.writeFile(path.join(output, "stdio-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, output, historical_inspector: historicalInspector, calls: sizes.length }));
} finally {
  await client.close();
  await transport.close();
}
