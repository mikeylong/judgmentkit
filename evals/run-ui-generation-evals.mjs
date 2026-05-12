import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const CASES_PATH = path.join(__dirname, "ui-generation-cases.json");
const REPORTS_DIR = path.join(__dirname, "reports");
const JSON_REPORT_PATH = path.join(REPORTS_DIR, "ui-generation-report.json");
const HTML_REPORT_PATH = path.join(REPORTS_DIR, "ui-generation-report.html");
const STALE_MARKDOWN_REPORT_PATH = path.join(REPORTS_DIR, "ui-generation-report.md");

const EVAL_ID = "judgmentkit-ui-generation-paired-artifact-v1";
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

function reportRelativeHref(repoPath) {
  return path.relative(REPORTS_DIR, resolveRepoPath(repoPath));
}

function variantHref(variant) {
  return variant.public_artifact ?? reportRelativeHref(variant.artifact);
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

function buildReport(results) {
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

function htmlMetricEvidence(metric) {
  if ("present" in metric) {
    return `
      <div><strong>Present:</strong> ${htmlList(metric.present)}</div>
      <div><strong>Missing:</strong> ${htmlList(metric.missing)}</div>
    `;
  }

  return `
    <div><strong>Implementation leakage:</strong> ${htmlList(metric.implementation_leakage)}</div>
    <div><strong>Review-packet leakage:</strong> ${htmlList(metric.review_packet_leakage)}</div>
  `;
}

function htmlMetricTable(variant) {
  const rows = METRIC_IDS.map((metricId) => {
    const metric = variant.metric_results[metricId];
    const evidenceSummary =
      "present" in metric ? `${metric.present.length} present` : `${metric.leakage_count} leaks`;
    return `
      <tr>
        <th scope="row">${escapeHtml(metricId)}</th>
        <td>${escapeHtml(metric.score)}</td>
        <td>${escapeHtml(evidenceSummary)}</td>
        <td>${htmlMetricEvidence(metric)}</td>
      </tr>
    `;
  }).join("");

  return `
    <section class="variant">
      <div class="variant-heading">
        <div>
          <h3>${escapeHtml(variant.label)}</h3>
          <p>${escapeHtml(variant.treatment)}</p>
        </div>
        <strong>${escapeHtml(variant.score)}/100</strong>
      </div>
      <p><a href="${escapeHtml(variantHref(variant))}">${escapeHtml(variant.artifact)}</a></p>
      <table>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Score</th>
            <th scope="col">Summary</th>
            <th scope="col">Evidence</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function htmlCase(result) {
  return `
    <section class="case">
      <div class="case-heading">
        <div>
          <h2>${escapeHtml(result.title)}</h2>
          <p>${escapeHtml(result.task_prompt)}</p>
        </div>
        <span class="status ${result.passed ? "passed" : "failed"}">${result.passed ? "Passed" : "Failed"}</span>
      </div>
      <dl class="summary-grid">
        <div><dt>Winner</dt><dd>${escapeHtml(result.winner)}</dd></div>
        <div><dt>Expected winner</dt><dd>${escapeHtml(result.expected_winner)}</dd></div>
        <div><dt>Score delta</dt><dd>${escapeHtml(result.score_delta)}</dd></div>
        <div><dt>Minimum delta</dt><dd>${escapeHtml(result.minimum_score_delta)}</dd></div>
      </dl>
      <div class="rationale">
        <h3>Rationale</h3>
        ${htmlList(result.rationale)}
      </div>
      <div class="expected">
        <h3>Expected Outcomes</h3>
        ${htmlList(result.expected_outcomes)}
      </div>
      <div class="variants">
        ${result.variants.map(htmlMetricTable).join("")}
      </div>
    </section>
  `;
}

function buildHtmlReport(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JudgmentKit UI-Generation Eval</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #17212b;
      --muted: #5c6875;
      --line: #d6dde5;
      --panel: #ffffff;
      --surface: #f6f8fa;
      --accent: #236458;
      --danger: #8a2f24;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--surface);
      line-height: 1.45;
    }
    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 10px; font-size: 2rem; line-height: 1.1; }
    h2 { margin-bottom: 8px; font-size: 1.35rem; }
    h3 { margin-bottom: 8px; font-size: 1rem; }
    a { color: #174d7a; }
    .lede { color: var(--muted); max-width: 760px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin: 20px 0;
    }
    .summary-grid div, .case, .variant, .notice {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    .summary-grid div { padding: 14px; }
    dt {
      color: var(--muted);
      font-size: 0.75rem;
      font-weight: 750;
      text-transform: uppercase;
    }
    dd { margin: 4px 0 0; font-weight: 700; }
    .notice {
      padding: 14px 16px;
      color: var(--muted);
    }
    .case {
      margin-top: 24px;
      padding: 20px;
    }
    .case-heading, .variant-heading {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
    }
    .status {
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 0.8rem;
      font-weight: 750;
    }
    .passed { background: #dff3e8; color: var(--accent); }
    .failed { background: #f8ded9; color: var(--danger); }
    .rationale, .expected { margin-top: 16px; }
    .variants {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 18px;
    }
    .variant { padding: 16px; overflow-x: auto; }
    .variant-heading p { margin-bottom: 0; color: var(--muted); }
    .variant-heading strong { font-size: 1.3rem; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 0.9rem;
    }
    th, td {
      border-top: 1px solid var(--line);
      padding: 9px 8px;
      text-align: left;
      vertical-align: top;
    }
    thead th { color: var(--muted); font-size: 0.78rem; text-transform: uppercase; }
    tbody th { font-weight: 700; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    .muted { color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <h1>JudgmentKit UI-Generation Eval</h1>
    <p class="lede">Deterministic paired-artifact scoring for existing standalone comparison apps.</p>
    <dl class="summary-grid">
      <div><dt>Eval id</dt><dd>${escapeHtml(report.eval_id)}</dd></div>
      <div><dt>Claim level</dt><dd>${escapeHtml(report.claim_level)}</dd></div>
      <div><dt>Cases</dt><dd>${escapeHtml(report.summary.cases)}</dd></div>
      <div><dt>Passed</dt><dd>${escapeHtml(report.summary.passed)}</dd></div>
      <div><dt>Guided wins</dt><dd>${escapeHtml(report.summary.guided_wins)}</dd></div>
      <div><dt>Baseline wins</dt><dd>${escapeHtml(report.summary.baseline_wins)}</dd></div>
    </dl>
    <p class="notice">${escapeHtml(report.benchmark_policy)}</p>
    ${report.results.map(htmlCase).join("")}
  </main>
</body>
</html>
`;
}

function writeReport(report) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(HTML_REPORT_PATH, buildHtmlReport(report));
  if (fs.existsSync(STALE_MARKDOWN_REPORT_PATH)) {
    fs.unlinkSync(STALE_MARKDOWN_REPORT_PATH);
  }
}

const cases = readJson(CASES_PATH);
const results = cases.map(evaluateCase);
const report = buildReport(results);

writeReport(report);

console.log("# JudgmentKit UI-Generation Eval");
console.log(`Report: ${relativePath(JSON_REPORT_PATH)}`);
console.log(`HTML: ${relativePath(HTML_REPORT_PATH)}`);
console.log(
  `Summary: ${report.summary.guided_wins}/${report.summary.cases} JudgmentKit-guided wins, ${report.summary.failed} failed thresholds, claim level ${report.claim_level}`,
);

if (report.summary.failed > 0) {
  process.exitCode = 1;
}
