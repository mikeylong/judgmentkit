import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createActivityModelReview } from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const BRIEF_PATH = path.join(
  ROOT_DIR,
  "examples/demo/refund-ops-implementation-heavy.brief.txt",
);
const HTML_OUTPUT_PATH = path.join(ROOT_DIR, "examples/demo/one-shot-demo.html");

const IMPLEMENTATION_TERMS = [
  "database table",
  "JSON schema",
  "prompt template",
  "tool call",
  "resource id",
  "API endpoint",
  "CRUD",
];

function readBrief() {
  return fs.readFileSync(BRIEF_PATH, "utf8").trim();
}

function joinList(values) {
  return values.length > 0 ? values.join(", ") : "none";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderList(values) {
  return values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");
}

function renderPills(values) {
  return values
    .map((value) => `<span class="pill">${escapeHtml(value)}</span>`)
    .join("");
}

function buildBaselineOneShot() {
  return [
    "### One-Shot UI Concept",
    "",
    "**Refund Case Admin CRUD Console**",
    "",
    "- Primary surface: a `refund_case` database table grid with every field visible.",
    "- Header controls: create, read, update, delete, refresh schema, and rerun prompt.",
    "- Detail panel: JSON schema validation errors, prompt template version, tool call result, resource id, and API endpoint status.",
    "- Main decision: edit fields until the record looks valid, then save the CRUD update.",
    "- Completion state: record saved successfully or schema validation failed.",
  ].join("\n");
}

function buildBaselineVisualHtml() {
  return `
    <section class="demo-panel baseline-panel" data-demo-section="without-judgmentkit">
      <div class="panel-kicker">Without JudgmentKit2</div>
      <header class="panel-header">
        <div>
          <p class="eyebrow">Admin console</p>
          <h2>Refund Case CRUD Console</h2>
        </div>
        <button type="button">Save CRUD update</button>
      </header>

      <div class="toolbar" aria-label="Implementation controls">
        <span>Create</span>
        <span>Read</span>
        <span>Update</span>
        <span>Delete</span>
        <span>Refresh JSON schema</span>
        <span>Rerun prompt template</span>
      </div>

      <div class="schema-strip">
        <div>
          <span class="label">Data model</span>
          <strong>refund_case</strong>
        </div>
        <div>
          <span class="label">Resource id</span>
          <strong>rfc_87291</strong>
        </div>
        <div>
          <span class="label">API endpoint</span>
          <strong>/v1/refunds/escalations</strong>
        </div>
      </div>

      <table class="field-table">
        <thead>
          <tr>
            <th>database table field</th>
            <th>value</th>
            <th>JSON schema</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>refund_case.customer_id</td>
            <td>cus_1842</td>
            <td>valid</td>
          </tr>
          <tr>
            <td>refund_case.prompt_version</td>
            <td>refund_triage_v12</td>
            <td>warning</td>
          </tr>
          <tr>
            <td>refund_case.tool_call_result</td>
            <td>policy_check.pending</td>
            <td>missing field</td>
          </tr>
        </tbody>
      </table>

      <div class="debug-grid">
        <section>
          <h3>Prompt template</h3>
          <p>refund_triage_v12 runs before the CRUD save action.</p>
        </section>
        <section>
          <h3>Tool call result</h3>
          <p>policy_check.pending requires another tool call before update.</p>
        </section>
      </div>
    </section>
  `;
}

function buildGuidedPrimaryConcept(reviewPacket) {
  return [
    "### Primary UI Concept",
    "",
    "**Refund Escalation Queue**",
    "",
    "- The support operations manager opens a selected case from the refund escalation queue.",
    "- The workspace shows the customer refund escalation cases as customer, refund, support note, evidence checklist, and policy review context.",
    "- The manager can approve refund, send to policy review, or return for evidence.",
    "- The handoff area captures next owner, handoff reason, and a send handoff action.",
    "- The user leaves with a clear handoff, next action, and reason for the decision.",
  ].join("\n");
}

function buildGuidedVisualHtml(reviewPacket) {
  const diagnosticTerms =
    reviewPacket.guardrails.implementation_terms_detected.map((entry) => entry.term);
  const reviewEvidence = [
    reviewPacket.candidate.activity_model.activity,
    reviewPacket.candidate.interaction_contract.primary_decision,
    reviewPacket.candidate.interaction_contract.completion,
  ];

  return `
    <section class="demo-panel guided-panel" data-demo-section="with-judgmentkit">
      <div class="panel-kicker">With JudgmentKit2</div>
      <div data-demo-primary-ui>
        <header class="panel-header workflow-header">
          <div>
            <p class="eyebrow">Escalation review</p>
            <h2>Refund Escalation Queue</h2>
          </div>
          <button type="button" class="secondary-action">Assign next case</button>
        </header>

        <ol class="workflow-steps" aria-label="Refund escalation workflow">
          <li class="is-current"><span>1</span>Review evidence</li>
          <li><span>2</span>Choose path</li>
          <li><span>3</span>Prepare handoff</li>
        </ol>

        <div class="triage-shell">
          <aside class="case-queue" aria-label="Refund escalation cases">
            <div class="queue-header">
              <h3>Selected case</h3>
              <strong>3 pending</strong>
            </div>
            <button type="button" class="case-row is-selected">
              <strong>Nora Diaz</strong>
              <span>$184.20 refund</span>
              <small>Missing receipt photo</small>
            </button>
            <button type="button" class="case-row">
              <strong>Jun Park</strong>
              <span>$89.00 refund</span>
              <small>Policy review requested</small>
            </button>
            <button type="button" class="case-row">
              <strong>Amara Blake</strong>
              <span>$312.75 refund</span>
              <small>Agent note added</small>
            </button>
          </aside>

          <div class="case-workspace">
            <section class="case-summary">
              <div class="case-title">
                <div>
                  <p class="eyebrow">Customer refund escalation</p>
                  <h3>Nora Diaz refund request</h3>
                </div>
                <span class="due-badge">Due today</span>
              </div>
              <div class="case-facts">
                <div>
                  <span class="label">Request</span>
                  <strong>$184.20 refund</strong>
                  <p>Subscription renewal disputed after support agent escalation.</p>
                </div>
                <div>
                  <span class="label">Support note</span>
                  <strong>Customer reports duplicate charge</strong>
                  <p>Agent recommends review because purchase history is complete.</p>
                </div>
              </div>
            </section>

            <section class="evidence-card">
              <h3>Evidence checklist</h3>
              <ul class="checklist">
                ${renderList([
                  "Purchase history confirms renewal date",
                  "Support agent note explains customer request",
                  "Receipt photo still needed before final approval",
                ])}
              </ul>
            </section>

            <section class="policy-card">
              <h3>Policy review context</h3>
              <p>Renewal is inside the exception window. Manager approval is allowed when the evidence is complete; unclear duplicate-charge cases go to policy review.</p>
            </section>

            <section class="decision-panel workflow-decision">
              <h3>Choose a path</h3>
              <div class="decision-actions">
                <button type="button" class="primary-action">Approve refund</button>
                <button type="button">Send to policy review</button>
                <button type="button">Return for evidence</button>
              </div>
            </section>

            <section class="handoff-panel">
              <h3>Handoff</h3>
              <div class="handoff-grid">
                <label>
                  Next owner
                  <select>
                    <option>Support agent</option>
                    <option>Policy reviewer</option>
                    <option>Refund operations</option>
                  </select>
                </label>
                <label>
                  Handoff reason
                  <textarea rows="3">Receipt photo is missing. Ask the customer to attach proof before approval.</textarea>
                </label>
              </div>
              <button type="button" class="primary-action">Send handoff</button>
            </section>
          </div>
        </div>
      </div>

      <details class="diagnostic-drawer" data-demo-diagnostics>
        <summary>Demo diagnostics kept out of the product UI</summary>
        <p>Available for setup, debugging, auditing, integration, or source inspection.</p>
        <dl class="diagnostic-meta">
          <div>
            <dt>Review status</dt>
            <dd>${escapeHtml(reviewPacket.review_status)}</dd>
          </div>
          <div>
            <dt>Source grounding</dt>
            <dd>${escapeHtml(joinList(reviewEvidence))}</dd>
          </div>
        </dl>
        <div class="diagnostic-terms">${renderPills(diagnosticTerms)}</div>
      </details>
    </section>
  `;
}

function buildDisclosureBoundary(reviewPacket) {
  const diagnosticTerms =
    reviewPacket.guardrails.implementation_terms_detected.map((entry) => entry.term);

  return [
    "### Disclosure Boundary",
    "",
    `Diagnostic-only terms: ${joinList(diagnosticTerms)}`,
    "",
    "These terms can appear in setup, debugging, auditing, integration, or source inspection. They do not belong in the primary triage surface.",
  ].join("\n");
}

function buildVisualDemoHtml(brief, reviewPacket) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JudgmentKit2 One-Shot UI Demo</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #17212b;
      --muted: #617080;
      --line: #cbd5df;
      --surface: #f7f9fb;
      --panel: #ffffff;
      --bad: #9f2d2d;
      --bad-bg: #fff1ef;
      --good: #145f4a;
      --good-bg: #ecf8f2;
      --accent: #284f7f;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--surface);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }

    main {
      max-width: 1440px;
      margin: 0 auto;
      padding: 32px;
    }

    .intro {
      max-width: 980px;
      margin-bottom: 24px;
    }

    .intro h1 {
      margin: 0 0 8px;
      font-size: 32px;
      letter-spacing: 0;
    }

    .source-brief {
      padding: 16px 18px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: #304052;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
      margin-top: 18px;
    }

    .demo-panel {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
    }

    .panel-kicker {
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 700;
      border-bottom: 1px solid var(--line);
    }

    .baseline-panel .panel-kicker {
      color: var(--bad);
      background: var(--bad-bg);
    }

    .guided-panel .panel-kicker {
      color: var(--good);
      background: var(--good-bg);
    }

    .panel-header {
      display: flex;
      gap: 16px;
      align-items: start;
      justify-content: space-between;
      padding: 18px;
      border-bottom: 1px solid var(--line);
    }

    h2,
    h3,
    p {
      margin-top: 0;
    }

    h2 {
      margin-bottom: 0;
      font-size: 22px;
      letter-spacing: 0;
    }

    h3 {
      margin-bottom: 8px;
      font-size: 15px;
      letter-spacing: 0;
    }

    button,
    select,
    textarea {
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #ffffff;
      color: var(--ink);
      padding: 8px 10px;
      font: inherit;
      font-weight: 650;
      white-space: normal;
    }

    select,
    textarea {
      width: 100%;
      margin-top: 6px;
      font-weight: 500;
    }

    textarea {
      min-height: 78px;
      resize: vertical;
    }

    .guided-panel button {
      border-color: #b8c7d5;
      background: #ffffff;
      color: var(--ink);
    }

    .guided-panel .primary-action {
      border-color: var(--good);
      background: var(--good);
      color: #ffffff;
    }

    .guided-panel .secondary-action {
      border-color: #9ebad3;
      background: #eef6fb;
      color: var(--accent);
    }

    .eyebrow,
    .label {
      display: block;
      margin: 0 0 4px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .03em;
    }

    .toolbar,
    .schema-strip,
    .debug-grid,
    .workflow-steps,
    .triage-shell,
    .case-summary,
    .evidence-card,
    .policy-card,
    .decision-panel,
    .handoff-panel,
    .diagnostic-drawer {
      margin: 16px;
    }

    .toolbar,
    .decision-actions,
    .diagnostic-terms {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .toolbar span,
    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #f8fafc;
      padding: 6px 9px;
      font-size: 13px;
      font-weight: 650;
    }

    .baseline-panel .toolbar span {
      background: #fff7f5;
      color: var(--bad);
    }

    .schema-strip,
    .debug-grid,
    .case-facts,
    .triage-shell,
    .handoff-grid {
      display: grid;
      gap: 12px;
    }

    .schema-strip {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .schema-strip > div,
    .debug-grid section,
    .decision-panel,
    .case-queue,
    .case-summary,
    .evidence-card,
    .policy-card,
    .handoff-panel,
    .diagnostic-drawer {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
      padding: 14px;
    }

    .debug-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 14px;
    }

    .workflow-steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      padding: 0;
      list-style: none;
    }

    .workflow-steps li {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f8fafc;
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 750;
    }

    .workflow-steps span {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: #dce8f0;
      color: var(--accent);
      font-size: 12px;
    }

    .workflow-steps .is-current {
      border-color: #9fc9ba;
      background: var(--good-bg);
      color: var(--good);
    }

    .workflow-steps .is-current span {
      background: var(--good);
      color: #ffffff;
    }

    .triage-shell {
      grid-template-columns: minmax(150px, .72fr) minmax(0, 1.4fr);
      align-items: start;
    }

    .queue-header,
    .case-title {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 12px;
    }

    .queue-header h3,
    .case-title h3 {
      margin-bottom: 0;
    }

    .queue-header strong,
    .due-badge {
      border-radius: 999px;
      background: #eef6fb;
      color: var(--accent);
      padding: 4px 7px;
      font-size: 12px;
      font-weight: 750;
      white-space: nowrap;
    }

    .case-row {
      display: grid;
      gap: 3px;
      width: 100%;
      min-height: auto;
      margin-top: 10px;
      padding: 10px;
      text-align: left;
    }

    .case-row span,
    .case-row small {
      color: var(--muted);
      font-weight: 600;
    }

    .case-row.is-selected {
      border-color: var(--good);
      background: var(--good-bg);
    }

    .case-workspace {
      display: grid;
      gap: 12px;
    }

    .case-facts,
    .handoff-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 14px;
    }

    .case-facts > div {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f8fafc;
      padding: 12px;
    }

    .checklist {
      display: grid;
      gap: 8px;
      padding-left: 20px;
    }

    .handoff-panel label {
      display: grid;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .03em;
    }

    .field-table {
      width: calc(100% - 32px);
      margin: 16px;
      border-collapse: collapse;
      font-size: 13px;
    }

    .field-table th,
    .field-table td {
      border: 1px solid var(--line);
      padding: 9px;
      text-align: left;
      vertical-align: top;
    }

    .field-table th {
      background: #f2f5f8;
      color: #37485c;
    }

    ul {
      margin: 0;
      padding-left: 18px;
    }

    .diagnostic-drawer {
      color: #3d4d5d;
      background: #f8fafc;
    }

    .diagnostic-drawer summary {
      cursor: pointer;
      font-weight: 750;
    }

    .diagnostic-meta {
      display: grid;
      gap: 10px;
      margin: 12px 0;
    }

    .diagnostic-meta div {
      border-top: 1px solid var(--line);
      padding-top: 10px;
    }

    .diagnostic-meta dt {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .03em;
    }

    .diagnostic-meta dd {
      margin: 4px 0 0;
    }

    .compare {
      margin-top: 18px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 16px;
    }

    .compare table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .compare th,
    .compare td {
      border-top: 1px solid var(--line);
      padding: 10px;
      text-align: left;
      vertical-align: top;
    }

    .compare th {
      color: var(--muted);
    }

    @media (max-width: 980px) {
      main {
        padding: 18px;
      }

      .demo-grid,
      .schema-strip,
      .debug-grid,
      .workflow-steps,
      .triage-shell,
      .case-facts,
      .handoff-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="intro">
      <h1>JudgmentKit2 One-Shot UI Demo</h1>
      <p>This deterministic demo renders the same implementation-heavy brief as two UI concepts. It does not call a model or use provider configuration.</p>
      <div class="source-brief">
        <span class="label">Source brief</span>
        ${escapeHtml(brief)}
      </div>
    </section>

    <section class="demo-grid" aria-label="Before and after UI demo">
      ${buildBaselineVisualHtml()}
      ${buildGuidedVisualHtml(reviewPacket)}
    </section>

    <section class="compare" aria-label="What changed">
      <h2>What changed</h2>
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Without JudgmentKit2</th>
            <th>With JudgmentKit2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Starting point</td>
            <td>Data model and CRUD surface</td>
            <td>Refund triage workflow and handoff</td>
          </tr>
          <tr>
            <td>Decision</td>
            <td>Edit fields and save</td>
            <td>Approve, send to policy review, or return for missing evidence</td>
          </tr>
          <tr>
            <td>Outcome</td>
            <td>Record saved or validation failed</td>
            <td>Clear handoff with next action and reason</td>
          </tr>
          <tr>
            <td>Disclosure</td>
            <td>Implementation terms dominate the primary surface</td>
            <td>Implementation terms are contained in diagnostics</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

function writeVisualDemoHtml(brief, reviewPacket) {
  const html = buildVisualDemoHtml(brief, reviewPacket);
  fs.writeFileSync(HTML_OUTPUT_PATH, html);
  return HTML_OUTPUT_PATH;
}

function buildReviewSummary(reviewPacket) {
  const activity = reviewPacket.candidate.activity_model.activity;
  const participants = reviewPacket.candidate.activity_model.participants;
  const decision = reviewPacket.candidate.interaction_contract.primary_decision;
  const outcome = reviewPacket.candidate.interaction_contract.completion;
  const questions = reviewPacket.review.targeted_questions;

  return [
    "### Review Packet Summary",
    "",
    `- Review status: ${reviewPacket.review_status}`,
    `- Activity: ${activity}`,
    `- Participants: ${joinList(participants)}`,
    `- Primary decision: ${decision}`,
    `- Outcome: ${outcome}`,
    `- Targeted questions: ${questions.length > 0 ? joinList(questions) : "none"}`,
  ].join("\n");
}

function buildComparisonTable(reviewPacket) {
  const terms = reviewPacket.candidate.activity_model.domain_vocabulary.slice(0, 4);
  const diagnosticTerms =
    reviewPacket.guardrails.implementation_terms_detected.map((entry) => entry.term);

  return [
    "| Dimension | Without JudgmentKit2 | With JudgmentKit2 |",
    "| --- | --- | --- |",
    "| Starting point | Data model and CRUD surface | Refund triage workflow and handoff |",
    "| Primary user | Admin inspecting records | Support operations manager reviewing triage |",
    `| Activity | Managing refund_case records | ${reviewPacket.candidate.activity_model.activity} |`,
    "| Decision | Edit fields and save | Approve, send to policy review, or return for missing evidence |",
    "| Outcome | Record saved or validation failed | Clear handoff with next action and reason |",
    `| Terms used | ${joinList(IMPLEMENTATION_TERMS.slice(0, 4))} | ${joinList(terms)} |`,
    `| Implementation terms contained | No | Yes: ${joinList(diagnosticTerms)} |`,
  ].join("\n");
}

export function buildOneShotDemoTranscript() {
  const brief = readBrief();
  const reviewPacket = createActivityModelReview(brief);
  const htmlOutputPath = writeVisualDemoHtml(brief, reviewPacket);

  return [
    "# JudgmentKit2 One-Shot Before/After Demo",
    "",
    "This is a scripted fixture demo. It does not call a model or depend on provider configuration.",
    "",
    `Static visual demo: ${path.relative(ROOT_DIR, htmlOutputPath)}`,
    "",
    "## Source Brief",
    "",
    brief,
    "",
    "## Without JudgmentKit2",
    "",
    buildBaselineOneShot(),
    "",
    "## With JudgmentKit2",
    "",
    buildReviewSummary(reviewPacket),
    "",
    buildGuidedPrimaryConcept(reviewPacket),
    "",
    buildDisclosureBoundary(reviewPacket),
    "",
    "## What Changed",
    "",
    buildComparisonTable(reviewPacket),
    "",
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(buildOneShotDemoTranscript());
}
