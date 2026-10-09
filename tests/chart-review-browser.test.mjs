import assert from "node:assert/strict";
import {
  chartEvidenceDigest,
  chartReviewCandidateDigest,
  normalizeChartReviewPolicy,
  observeChartInBrowser,
} from "../src/chart-review.mjs";
import { createUiImplementationContract, reviewUiImplementationCandidate } from "../src/index.mjs";

const cases = ["correct", "collision", "clipping", "wrong-data", "wrong-selection", "unsupported-series", "hidden-series", "hidden-axis", "collapsed-series", "transparent-series", "complex-clip", "mobile-collision", "source-plot", "no-labels", "outer-card-clipping", "outer-card-visible"];
const outerCardLabels = [{ text: "start", role: "x_axis" }, { text: "end", role: "x_axis" }];
function snapshot(kind) {
  if (kind.startsWith("outer-card-")) {
    const height = kind === "outer-card-clipping" ? 80 : 180;
    const visible = kind === "outer-card-visible";
    const wrapper = visible ? '<div style="width:80px;overflow-x:visible;overflow-y:clip">' : "";
    return '<!doctype html><html><body style="margin:0"><select id="period" aria-label="Day"><option value="today" selected>today</option></select>' + wrapper + '<div style="width:300px;height:' + height + 'px;border-bottom:100px solid black;overflow:hidden"><svg id="chart" width="300" height="180" viewBox="0 0 300 180"><rect id="plot" x="30" y="30" width="240" height="100" fill="none"/><path id="series" d="M30 130 L150 30 L270 130" stroke="black" fill="none"/><text x="30" y="160">start</text><text x="240" y="160">end</text></svg></div>' + (visible ? '</div>' : '') + '</body></html>';
  }
  const selected = kind === "wrong-selection" ? "yesterday" : "today";
  const line = kind === "wrong-data" ? "M30 160 L150 90 L270 160" : "M30 160 L150 30 L270 160";
  const series = kind === "unsupported-series"
    ? '<rect id="series" x="30" y="30" width="240" height="130" fill="blue"/>'
    : '<g style="' + (kind === "hidden-series" ? "opacity:0" : kind === "collapsed-series" ? "visibility:collapse" : "") + '"><path id="series" d="' + line + '" fill="none" stroke="' + (kind === "transparent-series" ? "none" : "blue") + '" stroke-width="2"/></g>';
  const unit = '<g style="' + (kind === "hidden-axis" ? "opacity:0" : "") + '"' + (kind === "complex-clip" ? ' clip-path="url(#cut)"' : "") + '><text x="30" y="20">Height (m)</text></g>';
  const labels = kind === "no-labels" ? "" : unit + '<text x="130" y="190">Time</text><text x="190" y="20">Selected day</text>';
  const extra = kind === "collision" ? '<text x="30" y="20">Overlap</text>'
    : kind === "clipping" ? '<text x="295" y="20">Clipped</text>'
    : kind === "mobile-collision" ? '<text class="mobile-label" x="30" y="20">Mobile overlap</text>' : "";
  return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:12px Arial}svg{display:block;width:300px;max-width:100%;height:auto}text{font:12px Arial}.mobile-label{display:none}@media(max-width:600px){.mobile-label{display:inline}}</style></head><body><select id="period" aria-label="Day"><option value="' + selected + '" selected>' + selected + '</option></select><svg id="chart" role="img" aria-label="Selected height by time" viewBox="0 0 300 200"><defs><clipPath id="cut"><rect width="10" height="10"/></clipPath></defs>' + (kind === "source-plot" ? "" : '<rect id="plot" x="30" y="30" width="240" height="130" fill="none"/>') + series + labels + extra + '</svg></body></html>';
}
const requiredLabels = [{ text: "Height (m)", role: "y_axis_units" }, { text: "Time", role: "x_axis" }];
const dataCases = cases.map((state_id) => ({
  state_id,
  source_ref: "fixture:triangular-series",
  selection: { period: "today" },
  points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }],
  x_domain: [0, 2], y_domain: [0, 1],
  ...(state_id === "no-labels" ? {} : { required_labels: state_id.startsWith("outer-card-") ? outerCardLabels : requiredLabels }),
  ...(state_id === "source-plot" ? {
    plot_by_viewport: { desktop: { x: 30, y: 30, width: 240, height: 130 }, mobile: { x: 30, y: 30, width: 240, height: 130 } },
    plot_source_ref: "fixture:original-svg-coordinate-layout",
  } : {}),
}));
const policy = normalizeChartReviewPolicy({
  required_viewports: [{ id: "desktop", width: 1280, height: 800 }, { id: "mobile", width: 390, height: 844 }],
  data_cases: dataCases,
});
const implementationContract = createUiImplementationContract({ chart_review_policy: policy }).implementation_contract;
const candidate = {
  primitives_used: [], states_covered: [], static_checks: [],
  chart_review_manifest: {
    chart_selector: "#chart", plot_selector: "#plot", series_selector: "#series",
    selection_selectors: { period: "#period" },
    states: cases.map((state_id) => ({ state_id, rendered_html: snapshot(state_id) })),
    expected_points: [{ x: 0, y: 1000 }, { x: 2, y: 1000 }],
  },
  chart_review_evidence: { outcome: "pass", coverage: { observed: ["everything"] } },
};
const receipt = await observeChartInBrowser({ candidate, implementationContract });
assert.equal(receipt.diagnostics.length, 0, JSON.stringify(receipt));
assert.equal(receipt.outcome, "fail");
assert.equal(receipt.environment.issuer, "judgmentkit_browser_runtime");
assert.equal(receipt.environment.scripts, "prohibited");
assert.equal(receipt.environment.external_network, "blocked");
assert.equal(receipt.observations.length, cases.length * 2);
assert.equal(receipt.coverage.declared.length, cases.length * 2 * 3);
assert.equal(receipt.coverage.source_authenticity, "attributed_contract_input_not_independently_verified");
for (const claim of ["interactive_selection_transitions", "artifact_inspector_interactive_attestation", "chart_accessibility_compliance", "axis_label_unit_semantics"]) assert.ok(receipt.coverage.unsupported.includes(claim));
assert.equal(receipt.candidate_sha256, chartReviewCandidateDigest(candidate));
assert.equal(receipt.contract_sha256, chartEvidenceDigest(implementationContract));
assert.equal(receipt.policy_sha256, chartEvidenceDigest(implementationContract.chart_review_policy));
assert.equal(receipt.manifest_sha256, chartEvidenceDigest(candidate.chart_review_manifest));
for (const entry of receipt.observations) assert.match(entry.artifact_sha256, /^[a-f0-9]{64}$/);
const observation = (state, viewport = "desktop") => receipt.observations.find((entry) => entry.state_id === state && entry.viewport.id === viewport).observation;
const check = (state, id, viewport) => observation(state, viewport).checks.find((entry) => entry.id === id);
for (const viewport of ["desktop", "mobile"]) assert.ok(observation("correct", viewport).checks.every(({ outcome }) => outcome === "pass"));
for (const viewport of ["desktop", "mobile"]) {
  const clipping = check("outer-card-clipping", "label_clipping", viewport);
  assert.equal(clipping.status, "observed");
  assert.equal(clipping.outcome, "fail", "An enclosing card can fully clip required labels inside the chart and outer border bounds.");
  assert.deepEqual(clipping.findings.map(({ text }) => text).sort(), ["end", "start"]);
  assert.ok(clipping.findings.every(({ rect, clip }) => rect.top > clip.bottom));
  assert.equal(check("outer-card-clipping", "label_collision", viewport).outcome, "pass");
  assert.equal(check("outer-card-clipping", "selected_data_correspondence", viewport).outcome, "pass");
  assert.ok(receipt.findings.some((finding) => finding.state_id === "outer-card-clipping" && finding.viewport_id === viewport && finding.code === "chart_label_clipping_fail"));
  assert.ok(observation("outer-card-visible", viewport).checks.every(({ outcome }) => outcome === "pass"), "A visible chart must pass when its narrow ancestor permits horizontal overflow and clips only vertically.");
}
assert.equal(check("collision", "label_collision").outcome, "fail");
assert.ok(check("collision", "label_collision").findings.some(({ first, second }) => [first, second].includes("Height (m)")));
assert.equal(check("clipping", "label_clipping").outcome, "fail");
assert.equal(check("wrong-data", "selected_data_correspondence").outcome, "fail");
assert.equal(check("wrong-selection", "selected_data_correspondence").outcome, "fail");
assert.equal(check("wrong-selection", "selected_data_correspondence").selected_values.period, "yesterday");
assert.equal(check("unsupported-series", "selected_data_correspondence").status, "untested");
for (const state of ["hidden-series", "collapsed-series", "transparent-series"]) assert.equal(check(state, "selected_data_correspondence").outcome, "fail", state);
assert.equal(check("hidden-axis", "label_collision").outcome, "fail");
assert.deepEqual(check("hidden-axis", "label_collision").missing_required_labels, [requiredLabels[0]]);
assert.equal(check("complex-clip", "label_clipping").status, "untested");
assert.equal(check("complex-clip", "label_clipping").outcome, "review_required");
assert.equal(check("mobile-collision", "label_collision", "desktop").outcome, "pass");
assert.equal(check("mobile-collision", "label_collision", "mobile").outcome, "fail");
assert.equal(observation("source-plot").plot_geometry_origin, "contract_owned_svg_coordinates");
assert.equal(check("source-plot", "selected_data_correspondence").outcome, "pass");
assert.equal(check("no-labels", "label_collision").status, "untested");
assert.equal(observation("no-labels").label_visibility, "not_tested_without_contract_required_labels");
assert.ok(receipt.coverage.untested.some(({ state_id, check }) => state_id === "unsupported-series" && check === "selected_data_correspondence"));

const sync = reviewUiImplementationCandidate(candidate, { implementation_contract: implementationContract });
assert.equal(sync.checks.chart_review.outcome, "review_required", "Caller-authored receipts cannot establish observed coverage.");
assert.equal(sync.checks.chart_review.coverage.observed.length, 0);
const missingState = await observeChartInBrowser({ candidate: { ...candidate, chart_review_manifest: { ...candidate.chart_review_manifest, states: candidate.chart_review_manifest.states.slice(1) } }, implementationContract });
assert.equal(missingState.outcome, "not_reviewed");
assert.ok(missingState.diagnostics.some(({ code }) => code === "chart_required_state_missing"));
console.log("Trusted chart browser checks passed: " + receipt.observations.length + " snapshots, geometry and data regressions, truthful unsupported coverage.");
