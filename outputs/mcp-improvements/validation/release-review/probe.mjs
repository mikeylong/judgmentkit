import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { observeChartInBrowser } from "/Users/mike/.codex/worktrees/mcp-improvements/JudgmentKit2/src/chart-review.mjs";
import { createUiImplementationContract } from "/Users/mike/.codex/worktrees/mcp-improvements/JudgmentKit2/src/index.mjs";

const output = "/private/tmp/judgmentkit-chart-ancestor-fix";
const source = "/Users/mike/.codex/worktrees/mcp-improvements/JudgmentKit2";
const sourceHashes = Object.fromEntries(["src/chart-review.mjs", "tests/chart-review-browser.test.mjs"].map((name) => [name, createHash("sha256").update(readFileSync(`${source}/${name}`)).digest("hex")]));
const results = [];
for (const [state, height] of [["outer-clipped", 80], ["outer-visible", 180]]) {
  const html = `<!doctype html><html><body style="margin:0"><div style="height:${height}px;width:300px;overflow:hidden"><svg id="chart" width="300" height="180" viewBox="0 0 300 180"><rect id="plot" x="30" y="30" width="240" height="100" fill="none"/><path id="series" d="M30 130 L270 30" stroke="black" fill="none"/><text x="30" y="160">start</text><text x="240" y="160">end</text></svg></div></body></html>`;
  const implementationContract = createUiImplementationContract({ chart_review_policy: { data_cases: [{ state_id: state, source_ref: "review:synthetic-known-line", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], x_domain: [0, 1], y_domain: [0, 1], required_labels: [{ text: "start", role: "x_axis" }, { text: "end", role: "x_axis" }] }] } }).implementation_contract;
  const candidate = { chart_review_manifest: { chart_selector: "#chart", plot_selector: "#plot", series_selector: "#series", states: [{ state_id: state, rendered_html: html }] } };
  const receipt = await observeChartInBrowser({ candidate, implementationContract });
  assert.equal(receipt.outcome, state === "outer-clipped" ? "fail" : "pass");
  assert.equal(receipt.observations.length, 2);
  for (const { observation } of receipt.observations) {
    const clipping = observation.checks.find(({ id }) => id === "label_clipping");
    assert.equal(clipping.status, "observed");
    assert.equal(clipping.outcome, state === "outer-clipped" ? "fail" : "pass");
    assert.equal(clipping.findings.length, state === "outer-clipped" ? 2 : 0);
  }
  writeFileSync(`${output}/${state}.json`, JSON.stringify({ source_sha256: sourceHashes, implementation_contract: implementationContract, candidate, receipt }, null, 2) + "\n");
  results.push({ state_id: state, outcome: receipt.outcome, observations: receipt.observations.length });
}
console.log(JSON.stringify({ source_sha256: sourceHashes, results }));
