import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getMcpMetadata } from "../src/mcp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const CASES_PATH = path.join(__dirname, "ui-generation-cases.json");
const DEFAULT_REPORTS_DIR = path.join(__dirname, "reports");
const REPORT_BASENAME = "ui-generation-report";
const JSON_REPORT_FILENAME = `${REPORT_BASENAME}.json`;
const HTML_REPORT_FILENAME = `${REPORT_BASENAME}.html`;
const CATALOG_JSON_FILENAME = "index.json";
const CATALOG_HTML_FILENAME = "index.html";
const STALE_MARKDOWN_REPORT_FILENAME = `${REPORT_BASENAME}.md`;

const EVAL_ID = "judgmentkit-ui-generation-paired-artifact-v1";
const CATALOG_ID = "judgmentkit-ui-generation-eval-runs";
const METRIC_IDS = [
  "activity_fit",
  "decision_support",
  "disclosure_discipline",
  "handoff_completeness",
  "task_success_support",
  "confidence_rework_signals",
];
const CLAIM_LEVELS = [
  "contract_only",
  "single_pair_signal",
  "repeated_pair_signal",
  "benchmark_supported",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath);
}

function repoRelativeOrAbsolute(filePath) {
  const relative = relativePath(filePath);
  return relative.startsWith("..") ? filePath : relative;
}

function resolveRepoPath(repoPath) {
  return path.join(ROOT_DIR, repoPath);
}

function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ");
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ");
}

function collapseWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function stripTrailingWhitespace(text) {
  return text.replace(/[ \t]+$/gm, "");
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function visibleText(html) {
  return collapseWhitespace(decodeHtmlEntities(stripTags(stripScripts(html))));
}

function primarySurfaceHtml(html) {
  const start = html.indexOf("data-primary-surface");
  if (start === -1) {
    throw new Error("Artifact is missing data-primary-surface marker.");
  }

  const metadataStart = html.indexOf(
    '<script type="application/json" id="comparison-metadata"',
    start,
  );
  if (metadataStart === -1) {
    throw new Error("Artifact is missing comparison metadata script.");
  }

  return html.slice(start, metadataStart);
}

function readComparisonMetadata(html) {
  const match = html.match(
    /<script type="application\/json" id="comparison-metadata">([\s\S]*?)<\/script>/,
  );

  if (!match) {
    throw new Error("Artifact is missing comparison metadata.");
  }

  return JSON.parse(match[1]);
}

function includesTerm(text, term) {
  return text.toLowerCase().includes(term.toLowerCase());
}

function uniquePresentTerms(text, terms) {
  return [...new Set(terms.filter((term) => includesTerm(text, term)))];
}

function scoreCoverage(text, terms) {
  const present = uniquePresentTerms(text, terms);
  const missing = terms.filter((term) => !present.includes(term));
  const score = terms.length === 0 ? 5 : (present.length / terms.length) * 5;

  return {
    score: round(score),
    present,
    missing,
  };
}

function scoreDisclosure(text, implementationTerms, reviewPacketTerms) {
  const implementation_leakage = uniquePresentTerms(text, implementationTerms);
  const review_packet_leakage = uniquePresentTerms(text, reviewPacketTerms);
  const penalty =
    implementation_leakage.length * 0.75 + review_packet_leakage.length;
  const score = Math.max(0, 5 - penalty);

  return {
    score: round(score),
    implementation_leakage,
    review_packet_leakage,
    leakage_count: implementation_leakage.length + review_packet_leakage.length,
  };
}

function round(value) {
  return Number(value.toFixed(2));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function reportRelativeHref(repoPath, reportDir) {
  return path.relative(reportDir, resolveRepoPath(repoPath));
}

function variantHref(variant, reportDir) {
  return variant.public_artifact ?? reportRelativeHref(variant.artifact, reportDir);
}

function scoreVariant(testCase, variant) {
  const artifactPath = resolveRepoPath(variant.artifact);
  const html = fs.readFileSync(artifactPath, "utf8");
  const metadata = readComparisonMetadata(html);
  const primaryText = visibleText(primarySurfaceHtml(html));
  const metric_results = {};

  for (const metricId of METRIC_IDS) {
    if (metricId === "disclosure_discipline") {
      metric_results[metricId] = scoreDisclosure(
        primaryText,
        testCase.implementation_leakage_terms,
        testCase.review_packet_terms,
      );
    } else {
      metric_results[metricId] = scoreCoverage(
        primaryText,
        testCase.rubric_terms[metricId] ?? [],
      );
    }
  }

  const weightedScore = METRIC_IDS.reduce((sum, metricId) => {
    const metricScore = metric_results[metricId].score;
    const weight = testCase.scoring_weights[metricId];
    return sum + (metricScore / 5) * weight * 100;
  }, 0);

  return {
    id: variant.id,
    label: variant.label,
    treatment: variant.treatment,
    artifact: variant.artifact,
    public_artifact: variant.public_artifact,
    metadata_treatment: metadata.treatment,
    metadata_comparison_id: metadata.comparison_id,
    score: round(weightedScore),
    metric_results,
  };
}

function validateCase(testCase) {
  if (!testCase.id || !testCase.title || !testCase.task_prompt) {
    throw new Error("UI generation eval case missing id, title, or task_prompt.");
  }
  if (!CLAIM_LEVELS.includes(testCase.claim_level)) {
    throw new Error(`${testCase.id} has unsupported claim level ${testCase.claim_level}.`);
  }
  if (!["raw_brief_baseline", "judgmentkit_handoff", "tie"].includes(testCase.expected_winner)) {
    throw new Error(`${testCase.id} has unsupported expected_winner.`);
  }
  if (typeof testCase.minimum_score_delta !== "number") {
    throw new Error(`${testCase.id} must define minimum_score_delta.`);
  }
  if (!Array.isArray(testCase.variants) || testCase.variants.length !== 2) {
    throw new Error(`${testCase.id} must define exactly two variants.`);
  }
  if (!Array.isArray(testCase.hidden_treatment_terms)) {
    throw new Error(`${testCase.id} must define hidden_treatment_terms.`);
  }
  for (const metricId of METRIC_IDS) {
    if (typeof testCase.scoring_weights?.[metricId] !== "number") {
      throw new Error(`${testCase.id} missing scoring weight for ${metricId}.`);
    }
    if (metricId !== "disclosure_discipline" && !Array.isArray(testCase.rubric_terms?.[metricId])) {
      throw new Error(`${testCase.id} missing rubric terms for ${metricId}.`);
    }
  }

  const weightTotal = METRIC_IDS.reduce(
    (sum, metricId) => sum + testCase.scoring_weights[metricId],
    0,
  );
  if (Math.abs(weightTotal - 1) > 0.001) {
    throw new Error(`${testCase.id} scoring weights must sum to 1, got ${weightTotal}.`);
  }

  const manifestPath = resolveRepoPath(testCase.comparison_manifest);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`${testCase.id} manifest not found: ${testCase.comparison_manifest}`);
  }
  const manifest = readJson(manifestPath);
  if (manifest.comparison_id !== testCase.id) {
    throw new Error(
      `${testCase.id} manifest comparison_id mismatch: ${manifest.comparison_id}`,
    );
  }

  for (const hiddenTerm of testCase.hidden_treatment_terms) {
    if (includesTerm(testCase.task_prompt, hiddenTerm)) {
      throw new Error(`${testCase.id} participant prompt leaks treatment term ${hiddenTerm}.`);
    }
  }

  for (const variant of testCase.variants) {
    if (!["raw_brief_baseline", "judgmentkit_handoff"].includes(variant.treatment)) {
      throw new Error(`${testCase.id} has unsupported treatment ${variant.treatment}.`);
    }
    const artifactPath = resolveRepoPath(variant.artifact);
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`${testCase.id} artifact not found: ${variant.artifact}`);
    }
    if (variant.public_artifact && !variant.public_artifact.startsWith("/examples/")) {
      throw new Error(`${testCase.id} public_artifact must start with /examples/.`);
    }
  }
}

function evaluateCase(testCase) {
  validateCase(testCase);

  const variants = testCase.variants.map((variant) => scoreVariant(testCase, variant));
  for (const variant of variants) {
    if (variant.metadata_treatment !== variant.treatment) {
      throw new Error(
        `${testCase.id}/${variant.id} metadata treatment mismatch: ${variant.metadata_treatment}`,
      );
    }
    if (variant.metadata_comparison_id !== testCase.id) {
      throw new Error(
        `${testCase.id}/${variant.id} metadata comparison_id mismatch: ${variant.metadata_comparison_id}`,
      );
    }
  }

  const baseline = variants.find((variant) => variant.treatment === "raw_brief_baseline");
  const guided = variants.find((variant) => variant.treatment === "judgmentkit_handoff");
  const score_delta = round(guided.score - baseline.score);
  const winner =
    score_delta > 0 ? "judgmentkit_handoff" : score_delta < 0 ? "raw_brief_baseline" : "tie";
  const expectedDelta =
    testCase.expected_winner === "judgmentkit_handoff"
      ? score_delta
      : testCase.expected_winner === "raw_brief_baseline"
        ? -score_delta
        : Math.abs(score_delta);
  const passed =
    winner === testCase.expected_winner && expectedDelta >= testCase.minimum_score_delta;

  return {
    id: testCase.id,
    title: testCase.title,
    task_prompt: testCase.task_prompt,
    claim_level: testCase.claim_level,
    expected_outcomes: testCase.expected_outcomes,
    winner,
    expected_winner: testCase.expected_winner,
    score_delta,
    minimum_score_delta: testCase.minimum_score_delta,
    passed,
    variants,
    rationale: buildCaseRationale(baseline, guided, score_delta),
  };
}

function buildCaseRationale(baseline, guided, scoreDelta) {
  const baselineLeakage =
    baseline.metric_results.disclosure_discipline.implementation_leakage.length;
  const guidedLeakage =
    guided.metric_results.disclosure_discipline.implementation_leakage.length;
  const guidedActivity =
    guided.metric_results.activity_fit.present.length;
  const baselineActivity =
    baseline.metric_results.activity_fit.present.length;

  return [
    `JudgmentKit-guided artifact scored ${scoreDelta} points above baseline.`,
    `Implementation leakage changed from ${baselineLeakage} baseline terms to ${guidedLeakage} guided terms.`,
    `Activity-fit evidence changed from ${baselineActivity} matched terms to ${guidedActivity} matched terms.`,
  ];
}

function summarizeClaimLevel(results) {
  const guidedWins = results.filter((result) => result.winner === "judgmentkit_handoff").length;
  if (guidedWins === 0) {
    return "contract_only";
  }
  if (guidedWins === 1) {
    return "single_pair_signal";
  }
  return "repeated_pair_signal";
}

function currentLocalDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.TZ ?? "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((value) => value.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function runDate() {
  return process.env.JUDGMENTKIT_UI_EVAL_RUN_DATE ?? currentLocalDate();
}

function reportsDir() {
  const configured = process.env.JUDGMENTKIT_UI_EVAL_REPORTS_DIR;
  return configured ? path.resolve(configured) : DEFAULT_REPORTS_DIR;
}

function mcpReleaseVersion() {
  return process.env.JUDGMENTKIT_UI_EVAL_MCP_VERSION ?? getMcpMetadata("streamable-http").version;
}

function releaseSegment(version) {
  return `mcp-${String(version).replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

function runNumber(runId) {
  const match = runId.match(/^run-(\d{3})$/);
  return match ? Number(match[1]) : 0;
}

function nextRunId(releaseDir) {
  let entries = [];
  try {
    entries = fs.readdirSync(releaseDir, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const maxRun = entries
    .filter((entry) => entry.isDirectory() && /^run-\d{3}$/.test(entry.name))
    .map((entry) => runNumber(entry.name))
    .reduce((max, value) => Math.max(max, value), 0);

  return `run-${String(maxRun + 1).padStart(3, "0")}`;
}

function createRunPaths({ baseReportsDir, date, mcpVersion }) {
  const segment = releaseSegment(mcpVersion);
  const releaseDir = path.join(baseReportsDir, date, segment);
  const runId = nextRunId(releaseDir);
  const runDir = path.join(releaseDir, runId);

  fs.mkdirSync(releaseDir, { recursive: true });
  fs.mkdirSync(runDir);

  return {
    baseReportsDir,
    date,
    mcpVersion,
    releaseSegment: segment,
    runId,
    runDir,
    jsonReportPath: path.join(runDir, JSON_REPORT_FILENAME),
    htmlReportPath: path.join(runDir, HTML_REPORT_FILENAME),
  };
}

function runRelativePath(baseReportsDir, filePath) {
  return path.relative(baseReportsDir, filePath).split(path.sep).join("/");
}

function buildReport(results, runInfo) {
  const guidedWins = results.filter((result) => result.winner === "judgmentkit_handoff").length;
  const baselineWins = results.filter((result) => result.winner === "raw_brief_baseline").length;
  const ties = results.filter((result) => result.winner === "tie").length;
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  return {
    eval_id: EVAL_ID,
    evaluation_type: "deterministic_static_artifact_scoring",
    generation_policy:
      "Scores committed standalone artifacts only. Does not call providers or generate apps.",
    benchmark_policy:
      "Qualitative paired-artifact evidence only; not a statistically powered benchmark.",
    claim_level: summarizeClaimLevel(results),
    run: {
      date: runInfo.date,
      mcp_release: runInfo.mcpVersion,
      mcp_release_segment: runInfo.releaseSegment,
      run_id: runInfo.runId,
      run_path: runRelativePath(runInfo.baseReportsDir, runInfo.runDir),
      html_report: runRelativePath(runInfo.baseReportsDir, runInfo.htmlReportPath),
      json_report: runRelativePath(runInfo.baseReportsDir, runInfo.jsonReportPath),
    },
    summary: {
      cases: results.length,
      passed,
      failed,
      guided_wins: guidedWins,
      baseline_wins: baselineWins,
      ties,
    },
    metric_scale: {
      metric_score: "0-5",
      total_score: "0-100 weighted",
    },
    results,
  };
}

function htmlList(values) {
  if (!values || values.length === 0) {
    return `<span class="muted">None</span>`;
  }

  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function htmlId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(value) {
  return String(value)
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function treatmentLabel(treatment) {
  if (treatment === "raw_brief_baseline") {
    return "Raw baseline";
  }
  if (treatment === "judgmentkit_handoff") {
    return "JudgmentKit guided";
  }
  if (treatment === "tie") {
    return "Tie";
  }
  return titleCase(treatment);
}

function signedNumber(value) {
  const rounded = round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function metricEvidenceSummary(metric) {
  if ("present" in metric) {
    return `${metric.present.length} present, ${metric.missing.length} missing`;
  }

  return `${metric.leakage_count} leaks`;
}

function scoreCell(metric) {
  return `
    <div class="score-cell">
      <span class="metric-score">${escapeHtml(metric.score)}/5</span>
      <span>${escapeHtml(metricEvidenceSummary(metric))}</span>
    </div>
  `;
}

function variantByTreatment(result, treatment) {
  return result.variants.find((variant) => variant.treatment === treatment);
}

function htmlVariantScore(variant, reportDir) {
  const isGuided = variant.treatment === "judgmentkit_handoff";
  const roleClass = isGuided ? "guided" : "baseline";

  return `
    <article class="variant-score ${roleClass}" data-treatment="${escapeHtml(variant.treatment)}">
      <div>
        <p class="eyebrow">${escapeHtml(treatmentLabel(variant.treatment))}</p>
        <h3>${escapeHtml(variant.label)}</h3>
      </div>
      <strong>${escapeHtml(variant.score)}<span>/100</span></strong>
      <a href="${escapeHtml(variantHref(variant, reportDir))}">Open artifact</a>
    </article>
  `;
}

function htmlMetricComparison(result) {
  const baseline = variantByTreatment(result, "raw_brief_baseline");
  const guided = variantByTreatment(result, "judgmentkit_handoff");
  const rows = METRIC_IDS.map((metricId) => {
    const baselineMetric = baseline.metric_results[metricId];
    const guidedMetric = guided.metric_results[metricId];
    const delta = guidedMetric.score - baselineMetric.score;

    return `
      <tr data-metric-row="${escapeHtml(metricId)}">
        <th scope="row">${escapeHtml(titleCase(metricId))}</th>
        <td data-label="Baseline">${scoreCell(baselineMetric)}</td>
        <td data-label="Guided">${scoreCell(guidedMetric)}</td>
        <td data-label="Delta"><span class="delta ${delta >= 0 ? "positive" : "negative"}">${escapeHtml(signedNumber(delta))}</span></td>
      </tr>
    `;
  }).join("");

  return `
    <section class="metric-comparison" aria-label="${escapeHtml(result.title)} metric comparison">
      <div class="section-heading">
        <h3>Metric comparison</h3>
        <p>Baseline and guided scores use the 0-5 metric scale; totals remain 0-100 weighted.</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Baseline</th>
              <th scope="col">Guided</th>
              <th scope="col">Delta</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function htmlEvidenceDetails(title, values) {
  return `
    <details>
      <summary>${escapeHtml(title)}</summary>
      ${htmlList(values)}
    </details>
  `;
}

function htmlEvidenceSummary(result) {
  const baseline = variantByTreatment(result, "raw_brief_baseline");
  const guided = variantByTreatment(result, "judgmentkit_handoff");
  const baselineActivity = baseline.metric_results.activity_fit;
  const guidedActivity = guided.metric_results.activity_fit;
  const baselineDisclosure = baseline.metric_results.disclosure_discipline;
  const guidedDisclosure = guided.metric_results.disclosure_discipline;

  return `
    <section class="evidence-grid" aria-label="${escapeHtml(result.title)} evidence">
      <article class="evidence-panel">
        <p class="eyebrow">Activity-fit evidence</p>
        <h3>${escapeHtml(baselineActivity.present.length)} to ${escapeHtml(guidedActivity.present.length)} matched terms</h3>
        <p>Guided output surfaced more of the task vocabulary reviewers need to judge activity fit.</p>
        ${htmlEvidenceDetails(
          `Baseline matched (${baselineActivity.present.length})`,
          baselineActivity.present,
        )}
        ${htmlEvidenceDetails(
          `Guided matched (${guidedActivity.present.length})`,
          guidedActivity.present,
        )}
        ${htmlEvidenceDetails(
          `Guided missing (${guidedActivity.missing.length})`,
          guidedActivity.missing,
        )}
      </article>
      <article class="evidence-panel">
        <p class="eyebrow">Implementation leakage</p>
        <h3>${escapeHtml(baselineDisclosure.leakage_count)} leaks to ${escapeHtml(guidedDisclosure.leakage_count)} leaks</h3>
        <p>Leakage findings count terms that make implementation mechanics visible in the primary artifact.</p>
        ${htmlEvidenceDetails(
          `Baseline leakage (${baselineDisclosure.leakage_count} leaks)`,
          [
            ...baselineDisclosure.implementation_leakage,
            ...baselineDisclosure.review_packet_leakage,
          ],
        )}
        ${htmlEvidenceDetails(
          `Guided leakage (${guidedDisclosure.leakage_count} leaks)`,
          [
            ...guidedDisclosure.implementation_leakage,
            ...guidedDisclosure.review_packet_leakage,
          ],
        )}
      </article>
    </section>
  `;
}

function htmlCase(result, reportDir) {
  const baseline = variantByTreatment(result, "raw_brief_baseline");
  const guided = variantByTreatment(result, "judgmentkit_handoff");
  const caseId = htmlId(result.id);

  return `
    <section class="case-review" id="${escapeHtml(caseId)}" aria-labelledby="${escapeHtml(caseId)}-title">
      <div class="case-heading">
        <div>
          <p class="eyebrow">Case review</p>
          <h2 id="${escapeHtml(caseId)}-title">${escapeHtml(result.title)}</h2>
          <p>${escapeHtml(result.task_prompt)}</p>
        </div>
        <span class="status ${result.passed ? "passed" : "failed"}">${result.passed ? "Passed" : "Failed"}</span>
      </div>
      <dl class="case-outcome">
        <div><dt>Winner</dt><dd>${escapeHtml(treatmentLabel(result.winner))}</dd></div>
        <div><dt>Expected winner</dt><dd>${escapeHtml(treatmentLabel(result.expected_winner))}</dd></div>
        <div><dt>Score delta</dt><dd>${escapeHtml(signedNumber(result.score_delta))}</dd></div>
        <div><dt>Threshold</dt><dd>${escapeHtml(result.minimum_score_delta)}</dd></div>
      </dl>
      <div class="score-strip" aria-label="${escapeHtml(result.title)} score comparison">
        ${htmlVariantScore(baseline, reportDir)}
        <div class="score-delta">
          <span>${escapeHtml(signedNumber(result.score_delta))}</span>
          <small>guided delta</small>
        </div>
        ${htmlVariantScore(guided, reportDir)}
      </div>
      ${htmlMetricComparison(result)}
      ${htmlEvidenceSummary(result)}
      <details class="case-notes">
        <summary>Expected outcomes and rationale</summary>
        <div>
          <h3>Expected outcomes</h3>
          ${htmlList(result.expected_outcomes)}
        </div>
        <div>
          <h3>Rationale</h3>
          ${htmlList(result.rationale)}
        </div>
      </details>
    </section>
  `;
}

function buildHtmlReport(report, runInfo) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JudgmentKit UI-Generation Eval</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #18202a;
      --muted: #5d6876;
      --line: #d7dee7;
      --panel: #ffffff;
      --surface: #f7f8fa;
      --accent: #1f635b;
      --accent-soft: #e5f2ee;
      --danger: #8a2f24;
      --danger-soft: #f8e3df;
      --warn: #8a621d;
      --warn-soft: #f6edda;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html { background: var(--surface); }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--surface);
      line-height: 1.45;
      overflow-x: hidden;
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 30px 24px 56px;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 { max-width: 760px; margin-bottom: 10px; font-size: 2rem; line-height: 1.08; }
    h2 { margin-bottom: 8px; font-size: 1.3rem; line-height: 1.2; }
    h3 { margin-bottom: 6px; font-size: 1rem; line-height: 1.25; }
    a { color: #174d7a; }
    a:hover { color: #0e385b; }
    dl { margin: 0; }
    dt {
      color: var(--muted);
      font-size: 0.72rem;
      font-weight: 760;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    dd { margin: 4px 0 0; font-weight: 760; overflow-wrap: anywhere; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    summary { cursor: pointer; font-weight: 760; }
    .muted { color: var(--muted); }
    .report-dashboard {
      display: grid;
      gap: 28px;
    }
    .report-header {
      display: grid;
      gap: 18px;
    }
    .report-links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 16px;
      margin: 0;
    }
    .lede {
      max-width: 780px;
      margin-bottom: 0;
      color: var(--muted);
    }
    .eyebrow {
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 0.74rem;
      font-weight: 780;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .outcome-band {
      display: grid;
      grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.4fr);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
    }
    .outcome-primary {
      padding: 20px;
      border-right: 1px solid var(--line);
    }
    .outcome-primary strong {
      display: block;
      margin-bottom: 6px;
      font-size: 2rem;
      line-height: 1;
    }
    .outcome-primary p:last-child { margin-bottom: 0; color: var(--muted); }
    .run-meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .run-meta div {
      min-width: 0;
      padding: 16px;
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    .run-meta div:nth-child(3n) { border-right: 0; }
    .run-meta div:nth-last-child(-n + 3) { border-bottom: 0; }
    .notice {
      margin: 0;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfd;
      color: var(--muted);
    }
    .case-review {
      display: grid;
      gap: 18px;
      padding: 30px 0 4px;
      border-top: 1px solid var(--line);
    }
    .case-heading {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
    }
    .status {
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 0.8rem;
      font-weight: 760;
      white-space: nowrap;
    }
    .passed { background: #dff3e8; color: var(--accent); }
    .failed { background: var(--danger-soft); color: var(--danger); }
    .case-outcome {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
    }
    .case-outcome div {
      min-width: 0;
      padding: 14px 16px;
      border-right: 1px solid var(--line);
    }
    .case-outcome div:last-child { border-right: 0; }
    .score-strip {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      gap: 12px;
      align-items: stretch;
    }
    .variant-score {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px 16px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    .variant-score.guided { border-color: #a8d5c8; background: #fbfffd; }
    .variant-score h3 { margin-bottom: 0; }
    .variant-score strong {
      align-self: start;
      font-size: 1.75rem;
      line-height: 1;
      text-align: right;
    }
    .variant-score strong span {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .variant-score a { grid-column: 1 / -1; width: fit-content; }
    .score-delta {
      display: grid;
      min-width: 94px;
      place-content: center;
      padding: 12px;
      border-radius: 8px;
      background: var(--accent-soft);
      color: var(--accent);
      text-align: center;
    }
    .score-delta span { font-size: 1.25rem; font-weight: 800; }
    .score-delta small { color: var(--muted); font-weight: 700; }
    .section-heading {
      display: flex;
      gap: 14px;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .section-heading p {
      margin-bottom: 0;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .table-wrap {
      overflow-x: auto;
      max-width: 100%;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 720px;
      font-size: 0.9rem;
    }
    th, td {
      border-top: 1px solid var(--line);
      padding: 11px 12px;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    thead th { border-top: 0; }
    thead th { color: var(--muted); font-size: 0.78rem; text-transform: uppercase; }
    tbody th { width: 22%; font-weight: 760; }
    .score-cell {
      display: grid;
      gap: 2px;
      color: var(--muted);
    }
    .metric-score {
      color: var(--ink);
      font-weight: 800;
    }
    .delta {
      display: inline-flex;
      min-width: 46px;
      justify-content: center;
      border-radius: 999px;
      padding: 3px 9px;
      font-weight: 800;
    }
    .delta.positive { background: var(--accent-soft); color: var(--accent); }
    .delta.negative { background: var(--danger-soft); color: var(--danger); }
    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .evidence-panel {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    .evidence-panel h3 { margin-bottom: 6px; }
    .evidence-panel p:not(.eyebrow) { color: var(--muted); }
    .evidence-panel details {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
    }
    .case-notes {
      border-top: 1px solid var(--line);
      padding-top: 12px;
    }
    .case-notes > div {
      display: grid;
      gap: 4px;
      margin-top: 12px;
    }
    @media (max-width: 760px) {
      main { padding: 22px 16px 40px; }
      h1 { font-size: 1.72rem; }
      .outcome-band,
      .score-strip,
      .evidence-grid {
        grid-template-columns: 1fr;
      }
      .outcome-primary { border-right: 0; border-bottom: 1px solid var(--line); }
      .run-meta { grid-template-columns: 1fr 1fr; }
      .run-meta div:nth-child(3n) { border-right: 1px solid var(--line); }
      .run-meta div:nth-child(2n) { border-right: 0; }
      .run-meta div:nth-last-child(-n + 3) { border-bottom: 1px solid var(--line); }
      .run-meta div:nth-last-child(-n + 2) { border-bottom: 0; }
      .case-heading,
      .section-heading {
        display: grid;
      }
      .case-outcome { grid-template-columns: 1fr 1fr; }
      .case-outcome div:nth-child(2n) { border-right: 0; }
      .case-outcome div:nth-child(-n + 2) { border-bottom: 1px solid var(--line); }
      .score-delta {
        min-width: 0;
        min-height: 68px;
      }
      .variant-score strong { font-size: 1.45rem; }
      .table-wrap { overflow-x: visible; }
      table,
      thead,
      tbody,
      tr,
      th,
      td {
        display: block;
        width: 100%;
        min-width: 0;
      }
      table { min-width: 0; }
      thead { display: none; }
      tbody tr {
        padding: 12px;
        border-top: 1px solid var(--line);
      }
      tbody tr:first-child { border-top: 0; }
      th,
      td {
        border-top: 0;
        padding: 4px 0;
      }
      tbody th {
        width: auto;
        margin-bottom: 6px;
      }
      td::before {
        display: block;
        margin-bottom: 2px;
        color: var(--muted);
        content: attr(data-label);
        font-size: 0.72rem;
        font-weight: 760;
        text-transform: uppercase;
      }
      .delta { min-width: 0; }
    }
  </style>
</head>
<body>
  <main class="report-dashboard">
    <header class="report-header">
      <nav class="report-links" aria-label="Report links">
        <a href="../../..">All eval runs</a>
        <a href="../../../${CATALOG_JSON_FILENAME}">Catalog JSON</a>
        <a href="${JSON_REPORT_FILENAME}">JSON report</a>
      </nav>
      <div>
        <p class="eyebrow">UI generation eval report</p>
        <h1>JudgmentKit UI-Generation Eval</h1>
        <p class="lede">Deterministic paired-artifact scoring for existing standalone comparison apps. Use this report to review winner, delta, leakage, and activity-fit evidence by case.</p>
      </div>
      <section class="outcome-band" aria-label="Run outcome summary">
        <div class="outcome-primary">
          <p class="eyebrow">Latest run outcome</p>
          <strong>${escapeHtml(report.summary.passed)}/${escapeHtml(report.summary.cases)} cases passed</strong>
          <p>${escapeHtml(report.summary.guided_wins)} guided wins, ${escapeHtml(report.summary.baseline_wins)} baseline wins, ${escapeHtml(report.summary.ties)} ties.</p>
        </div>
        <dl class="run-meta">
          <div><dt>Claim level</dt><dd>${escapeHtml(report.claim_level)}</dd></div>
          <div><dt>Run date</dt><dd>${escapeHtml(report.run.date)}</dd></div>
          <div><dt>MCP release</dt><dd>${escapeHtml(report.run.mcp_release)}</dd></div>
          <div><dt>Run</dt><dd>${escapeHtml(report.run.run_id)}</dd></div>
          <div><dt>Eval id</dt><dd>${escapeHtml(report.eval_id)}</dd></div>
          <div><dt>Metric scale</dt><dd>${escapeHtml(report.metric_scale.metric_score)}</dd></div>
        </dl>
      </section>
      <p class="notice">${escapeHtml(report.benchmark_policy)}</p>
    </header>
    ${report.results.map((result) => htmlCase(result, runInfo.runDir)).join("")}
  </main>
</body>
</html>
`;
}

function listDirectoryNames(dirPath) {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function collectRuns(baseReportsDir) {
  const runs = [];
  for (const date of listDirectoryNames(baseReportsDir).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))) {
    const dateDir = path.join(baseReportsDir, date);
    for (const segment of listDirectoryNames(dateDir).filter((name) => name.startsWith("mcp-"))) {
      const releaseDir = path.join(dateDir, segment);
      for (const runId of listDirectoryNames(releaseDir).filter((name) => /^run-\d{3}$/.test(name))) {
        const runDir = path.join(releaseDir, runId);
        const htmlReportPath = path.join(runDir, HTML_REPORT_FILENAME);
        const jsonReportPath = path.join(runDir, JSON_REPORT_FILENAME);

        if (!fs.existsSync(htmlReportPath) || !fs.existsSync(jsonReportPath)) {
          continue;
        }

        const report = readJson(jsonReportPath);
        runs.push({
          date,
          mcp_release: report.run?.mcp_release ?? segment.replace(/^mcp-/, ""),
          mcp_release_segment: segment,
          run_id: runId,
          run_path: runRelativePath(baseReportsDir, runDir),
          html_report: runRelativePath(baseReportsDir, htmlReportPath),
          json_report: runRelativePath(baseReportsDir, jsonReportPath),
          eval_id: report.eval_id,
          claim_level: report.claim_level,
          summary: report.summary,
        });
      }
    }
  }

  return runs.sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date);
    if (dateOrder !== 0) {
      return dateOrder;
    }
    const releaseOrder = right.mcp_release_segment.localeCompare(left.mcp_release_segment);
    if (releaseOrder !== 0) {
      return releaseOrder;
    }
    return runNumber(right.run_id) - runNumber(left.run_id);
  });
}

function buildCatalog(baseReportsDir) {
  const runs = collectRuns(baseReportsDir);

  return {
    catalog_id: CATALOG_ID,
    latest: runs[0] ?? null,
    runs,
  };
}

function catalogRunRow(run) {
  return `
      <tr>
        <td>${escapeHtml(run.date)}</td>
        <td>${escapeHtml(run.mcp_release)}</td>
        <td>${escapeHtml(run.run_id)}</td>
        <td>${escapeHtml(run.claim_level)}</td>
        <td>${escapeHtml(run.summary?.passed ?? 0)}/${escapeHtml(run.summary?.cases ?? 0)} passed</td>
        <td><a href="${escapeHtml(run.html_report)}">HTML</a> · <a href="${escapeHtml(run.json_report)}">JSON</a></td>
      </tr>`;
}

function buildCatalogHtml(catalog) {
  const latest = catalog.latest;
  const rows = catalog.runs.map(catalogRunRow).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JudgmentKit UI Eval Runs</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #17212b;
      --muted: #5c6875;
      --line: #d6dde5;
      --panel: #ffffff;
      --surface: #f6f8fa;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: var(--surface); line-height: 1.45; }
    main { max-width: 1100px; margin: 0 auto; padding: 32px 24px 48px; }
    h1, h2, p { margin-top: 0; }
    a { color: #174d7a; }
    .lede { color: var(--muted); max-width: 760px; }
    .panel {
      margin: 20px 0;
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; background: var(--panel); }
    th, td { border-top: 1px solid var(--line); padding: 10px 8px; text-align: left; vertical-align: top; }
    thead th { color: var(--muted); font-size: 0.78rem; text-transform: uppercase; }
  </style>
</head>
<body>
  <main>
    <h1>JudgmentKit UI Eval Runs</h1>
    <p class="lede">Immutable UI-generation eval reports organized by run date, JudgmentKit MCP release, and sequential run id.</p>
    <section class="panel">
      <h2>Latest run</h2>
      ${
        latest
          ? `<p><strong>${escapeHtml(latest.date)} / ${escapeHtml(latest.mcp_release_segment)} / ${escapeHtml(latest.run_id)}</strong></p>
      <p><a href="${escapeHtml(latest.html_report)}">Open HTML report</a> · <a href="${escapeHtml(latest.json_report)}">Open JSON report</a></p>`
          : `<p>No eval runs have been generated.</p>`
      }
    </section>
    <section class="panel">
      <h2>All runs</h2>
      <p><a href="${CATALOG_JSON_FILENAME}">Catalog JSON</a></p>
      <table>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">MCP release</th>
            <th scope="col">Run</th>
            <th scope="col">Claim level</th>
            <th scope="col">Result</th>
            <th scope="col">Reports</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  </main>
</body>
</html>
`;
}

function writeCatalog(baseReportsDir) {
  const catalog = buildCatalog(baseReportsDir);
  fs.writeFileSync(
    path.join(baseReportsDir, CATALOG_JSON_FILENAME),
    `${JSON.stringify(catalog, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(baseReportsDir, CATALOG_HTML_FILENAME),
    stripTrailingWhitespace(buildCatalogHtml(catalog)),
  );

  return catalog;
}

function removeLegacyReports(baseReportsDir) {
  for (const filename of [
    JSON_REPORT_FILENAME,
    HTML_REPORT_FILENAME,
    STALE_MARKDOWN_REPORT_FILENAME,
  ]) {
    const legacyPath = path.join(baseReportsDir, filename);
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
    }
  }
}

function writeReport(report, runInfo) {
  fs.writeFileSync(runInfo.jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(runInfo.htmlReportPath, stripTrailingWhitespace(buildHtmlReport(report, runInfo)));
  removeLegacyReports(runInfo.baseReportsDir);

  return writeCatalog(runInfo.baseReportsDir);
}

const cases = readJson(CASES_PATH);
const results = cases.map(evaluateCase);
const baseReportsDir = reportsDir();
const runInfo = createRunPaths({
  baseReportsDir,
  date: runDate(),
  mcpVersion: mcpReleaseVersion(),
});
const report = buildReport(results, runInfo);

const catalog = writeReport(report, runInfo);

console.log("# JudgmentKit UI-Generation Eval");
console.log(`Report: ${repoRelativeOrAbsolute(runInfo.jsonReportPath)}`);
console.log(`HTML: ${repoRelativeOrAbsolute(runInfo.htmlReportPath)}`);
console.log(`Catalog: ${repoRelativeOrAbsolute(path.join(baseReportsDir, CATALOG_JSON_FILENAME))}`);
console.log(`Catalog HTML: ${repoRelativeOrAbsolute(path.join(baseReportsDir, CATALOG_HTML_FILENAME))}`);
console.log(
  `Summary: ${report.summary.guided_wins}/${report.summary.cases} JudgmentKit-guided wins, ${report.summary.failed} failed thresholds, claim level ${report.claim_level}, ${runInfo.date}/${runInfo.releaseSegment}/${runInfo.runId}`,
);
console.log(`Latest: ${catalog.latest?.html_report ?? "none"}`);

if (report.summary.failed > 0) {
  process.exitCode = 1;
}
