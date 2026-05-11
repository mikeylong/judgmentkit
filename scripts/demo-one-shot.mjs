import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createActivityModelReview,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

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

function termNames(entries) {
  return entries.map((entry) => entry.term);
}

function buildAcceptedUiWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Refund Escalation Queue",
      steps: [
        "Review selected case",
        "Check evidence",
        "Choose refund path",
        "Send handoff",
      ],
      primary_actions: [
        "Approve refund",
        "Send to policy review",
        "Return for evidence",
        "Send handoff",
      ],
      decision_points: [
        "Choose whether the refund can be approved, needs policy review, or needs more evidence.",
      ],
      completion_state:
        "A clear handoff with the next action and reason is sent to the right owner.",
    },
    primary_ui: {
      sections: [
        "Selected case",
        "Customer refund summary",
        "Evidence checklist",
        "Policy review context",
        "Decision path",
        "Handoff",
      ],
      controls: [
        "Assign next case",
        "Approve refund",
        "Send to policy review",
        "Return for evidence",
        "Next owner",
        "Handoff reason",
        "Send handoff",
      ],
      user_facing_terms: [
        "refund escalation",
        "selected case",
        "evidence checklist",
        "policy review",
        "handoff reason",
        "next owner",
      ],
    },
    handoff: {
      next_owner: "Support agent",
      reason:
        "Receipt photo is missing. Ask the customer to attach proof before approval.",
      next_action:
        "Send handoff to the support agent requesting the missing receipt photo.",
    },
    diagnostics: {
      implementation_terms: IMPLEMENTATION_TERMS,
      reveal_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

function buildRejectedUiWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Refund case ready_for_review console",
      steps: [
        "Activity: inspect JSON schema errors",
        "Update CRUD row",
        "Check prompt template result",
      ],
      primary_actions: [
        "Save CRUD update",
        "Show ready_for_review status",
        "Refresh JSON schema",
      ],
      decision_points: [
        "Main decision: whether the database table field is valid.",
      ],
      completion_state:
        "review_status becomes ready_for_review after schema validation.",
    },
    primary_ui: {
      sections: [
        "Activity diagnostics",
        "JSON schema validation",
        "CRUD editor",
      ],
      controls: [
        "Rerun prompt template",
        "Save CRUD update",
        "Show ready_for_review",
      ],
      user_facing_terms: [
        "activity_model",
        "interaction_contract",
        "JSON schema",
      ],
    },
    handoff: {
      next_owner: "API endpoint owner",
      reason: "Schema field is missing from the CRUD update.",
      next_action: "Set review_status to ready_for_review.",
    },
    diagnostics: {
      implementation_terms: IMPLEMENTATION_TERMS,
      reveal_contexts: ["debugging", "auditing"],
    },
  };
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
      <div class="panel-kicker">Without JudgmentKit</div>
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

function renderWorkflowSteps(steps) {
  return steps
    .map(
      (step, index) =>
        `<li${index === 0 ? ' class="is-current"' : ""}><span>${index + 1}</span>${escapeHtml(step)}</li>`,
    )
    .join("");
}

function renderActionButtons(actions) {
  return actions
    .map(
      (action, index) =>
        `<button type="button"${index === 0 ? ' class="primary-action"' : ""}>${escapeHtml(action)}</button>`,
    )
    .join("");
}

function buildGuidedPrimaryConcept(workflowReview) {
  const candidate = workflowReview.candidate;

  return [
    "### Accepted Workflow UI Concept",
    "",
    `**${candidate.workflow.surface_name}**`,
    "",
    "- The support operations manager opens a selected case from the refund escalation queue.",
    `- The workspace keeps customer refund escalation cases organized around ${joinList(candidate.primary_ui.sections.map((section) => section.toLowerCase()))}.`,
    `- The main controls are ${joinList(candidate.workflow.primary_actions.map((action) => action.toLowerCase()))}.`,
    `- The handoff area captures next owner, handoff reason, and ${candidate.handoff.next_action.toLowerCase()}`,
    `- Done means ${candidate.workflow.completion_state.toLowerCase()}`,
  ].join("\n");
}

function buildGuidedVisualHtml(activityReview, workflowReview, rejectedWorkflowReview) {
  const candidate = workflowReview.candidate;
  const decisionActions = candidate.workflow.primary_actions.filter(
    (action) => action.toLowerCase() !== "send handoff",
  );
  const diagnosticTerms =
    activityReview.guardrails.implementation_terms_detected.map((entry) => entry.term);
  const reviewEvidence = [
    activityReview.candidate.activity_model.activity,
    activityReview.candidate.interaction_contract.primary_decision,
    activityReview.candidate.interaction_contract.completion,
  ];
  const rejectedImplementationTerms = termNames(
    rejectedWorkflowReview.guardrails.candidate_primary_terms_detected,
  );
  const rejectedMetaTerms = termNames(
    rejectedWorkflowReview.guardrails.candidate_primary_meta_terms_detected,
  );
  const rejectedQuestions = rejectedWorkflowReview.review.targeted_questions;

  return `
    <section class="demo-panel guided-panel" data-demo-section="with-judgmentkit">
      <div class="panel-kicker">With JudgmentKit</div>
      <div data-demo-primary-ui>
        <header class="panel-header workflow-header">
          <div>
            <p class="eyebrow">Escalation review</p>
            <h2>${escapeHtml(candidate.workflow.surface_name)}</h2>
          </div>
          <button type="button" class="secondary-action">${escapeHtml(candidate.primary_ui.controls[0])}</button>
        </header>

        <ol class="workflow-steps" aria-label="Refund escalation workflow">
          ${renderWorkflowSteps(candidate.workflow.steps)}
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
                ${renderActionButtons(decisionActions)}
              </div>
            </section>

            <section class="handoff-panel">
              <h3>Handoff</h3>
              <div class="handoff-grid">
                <label>
                  Next owner
                  <select>
                    <option>${escapeHtml(candidate.handoff.next_owner)}</option>
                    <option>Policy reviewer</option>
                    <option>Refund operations</option>
                  </select>
                </label>
                <label>
                  Handoff reason
                  <textarea rows="3">${escapeHtml(candidate.handoff.reason)}</textarea>
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
            <dt>Activity review status</dt>
            <dd>${escapeHtml(activityReview.review_status)}</dd>
          </div>
          <div>
            <dt>Workflow review status</dt>
            <dd>${escapeHtml(workflowReview.review_status)}</dd>
          </div>
          <div>
            <dt>Source grounding</dt>
            <dd>${escapeHtml(joinList(reviewEvidence))}</dd>
          </div>
        </dl>
        <div class="diagnostic-terms">${renderPills(diagnosticTerms)}</div>
      </details>

      <section class="blocked-review" data-demo-rejected-review>
        <h3>Rejected candidate guardrail result</h3>
        <p>The same source brief also gets a model-like workflow candidate that exposes machinery. JudgmentKit blocks it before it becomes product UI.</p>
        <dl class="diagnostic-meta">
          <div>
            <dt>Workflow review status</dt>
            <dd>${escapeHtml(rejectedWorkflowReview.review_status)}</dd>
          </div>
          <div>
            <dt>Primary-field implementation terms</dt>
            <dd>${escapeHtml(joinList(rejectedImplementationTerms))}</dd>
          </div>
          <div>
            <dt>Primary-field review terms</dt>
            <dd>${escapeHtml(joinList(rejectedMetaTerms))}</dd>
          </div>
          <div>
            <dt>Targeted questions</dt>
            <dd>${escapeHtml(joinList(rejectedQuestions))}</dd>
          </div>
        </dl>
        <div class="diagnostic-terms">
          ${renderPills([...rejectedImplementationTerms, ...rejectedMetaTerms])}
        </div>
      </section>
    </section>
  `;
}

function buildDisclosureBoundary(activityReview, workflowReview, rejectedWorkflowReview) {
  const diagnosticTerms =
    activityReview.guardrails.implementation_terms_detected.map((entry) => entry.term);
  const rejectedTerms = [
    ...termNames(rejectedWorkflowReview.guardrails.candidate_primary_terms_detected),
    ...termNames(rejectedWorkflowReview.guardrails.candidate_primary_meta_terms_detected),
  ];

  return [
    "### Disclosure Boundary",
    "",
    `Accepted workflow review: ${workflowReview.review_status}`,
    "",
    `Rejected workflow review: ${rejectedWorkflowReview.review_status}`,
    "",
    `Diagnostic-only terms: ${joinList(diagnosticTerms)}`,
    "",
    `Blocked primary terms: ${joinList(rejectedTerms)}`,
    "",
    "These terms can appear in setup, debugging, auditing, integration, or source inspection. They do not belong in the primary triage surface.",
  ].join("\n");
}

function buildVisualDemoHtml(
  brief,
  activityReview,
  acceptedWorkflowReview,
  rejectedWorkflowReview,
) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JudgmentKit One-Shot UI Demo</title>
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
    .diagnostic-drawer,
    .blocked-review {
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
    .diagnostic-drawer,
    .blocked-review {
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
      grid-template-columns: repeat(4, minmax(0, 1fr));
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

    .blocked-review {
      border-color: #e0b5ad;
      background: #fff8f6;
      color: #4f3330;
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
      <h1>JudgmentKit One-Shot UI Demo</h1>
      <p>This deterministic demo renders the same implementation-heavy brief as two UI concepts. It does not call a model or use provider configuration.</p>
      <div class="source-brief">
        <span class="label">Source brief</span>
        ${escapeHtml(brief)}
      </div>
    </section>

    <section class="demo-grid" aria-label="Before and after UI demo">
      ${buildBaselineVisualHtml()}
      ${buildGuidedVisualHtml(
        activityReview,
        acceptedWorkflowReview,
        rejectedWorkflowReview,
      )}
    </section>

    <section class="compare" aria-label="What changed">
      <h2>What changed</h2>
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Without JudgmentKit</th>
            <th>With JudgmentKit</th>
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

function writeVisualDemoHtml(
  brief,
  activityReview,
  acceptedWorkflowReview,
  rejectedWorkflowReview,
) {
  const html = buildVisualDemoHtml(
    brief,
    activityReview,
    acceptedWorkflowReview,
    rejectedWorkflowReview,
  );
  fs.writeFileSync(HTML_OUTPUT_PATH, html);
  return HTML_OUTPUT_PATH;
}

function buildActivityReviewSummary(activityReview) {
  const activity = activityReview.candidate.activity_model.activity;
  const participants = activityReview.candidate.activity_model.participants;
  const decision = activityReview.candidate.interaction_contract.primary_decision;
  const outcome = activityReview.candidate.interaction_contract.completion;
  const questions = activityReview.review.targeted_questions;

  return [
    "### Activity Review Summary",
    "",
    `- Review status: ${activityReview.review_status}`,
    `- Activity: ${activity}`,
    `- Participants: ${joinList(participants)}`,
    `- Primary decision: ${decision}`,
    `- Outcome: ${outcome}`,
    `- Targeted questions: ${questions.length > 0 ? joinList(questions) : "none"}`,
  ].join("\n");
}

function buildWorkflowReviewSummary(label, workflowReview) {
  const implementationTerms = termNames(
    workflowReview.guardrails.candidate_primary_terms_detected,
  );
  const metaTerms = termNames(
    workflowReview.guardrails.candidate_primary_meta_terms_detected,
  );
  const questions = workflowReview.review.targeted_questions;

  return [
    `### ${label}`,
    "",
    `- Review status: ${workflowReview.review_status}`,
    `- Surface: ${workflowReview.candidate.workflow.surface_name}`,
    `- Workflow steps: ${joinList(workflowReview.candidate.workflow.steps)}`,
    `- Primary actions: ${joinList(workflowReview.candidate.workflow.primary_actions)}`,
    `- Implementation terms in primary fields: ${joinList(implementationTerms)}`,
    `- Review terms in primary fields: ${joinList(metaTerms)}`,
    `- Targeted questions: ${questions.length > 0 ? joinList(questions) : "none"}`,
  ].join("\n");
}

function buildComparisonTable(activityReview) {
  const terms = activityReview.candidate.activity_model.domain_vocabulary.slice(0, 4);
  const diagnosticTerms =
    activityReview.guardrails.implementation_terms_detected.map((entry) => entry.term);

  return [
    "| Dimension | Without JudgmentKit | With JudgmentKit |",
    "| --- | --- | --- |",
    "| Starting point | Data model and CRUD surface | Refund triage workflow and handoff |",
    "| Primary user | Admin inspecting records | Support operations manager reviewing triage |",
    `| Activity | Managing refund_case records | ${activityReview.candidate.activity_model.activity} |`,
    "| Decision | Edit fields and save | Approve, send to policy review, or return for missing evidence |",
    "| Outcome | Record saved or validation failed | Clear handoff with next action and reason |",
    `| Terms used | ${joinList(IMPLEMENTATION_TERMS.slice(0, 4))} | ${joinList(terms)} |`,
    `| Implementation terms contained | No | Yes: ${joinList(diagnosticTerms)} |`,
  ].join("\n");
}

export function buildOneShotDemoTranscript() {
  const brief = readBrief();
  const activityReview = createActivityModelReview(brief);
  const acceptedWorkflowReview = reviewUiWorkflowCandidate(
    brief,
    buildAcceptedUiWorkflowCandidate(),
    { activity_review: activityReview },
  );
  const rejectedWorkflowReview = reviewUiWorkflowCandidate(
    brief,
    buildRejectedUiWorkflowCandidate(),
    { activity_review: activityReview },
  );
  const htmlOutputPath = writeVisualDemoHtml(
    brief,
    activityReview,
    acceptedWorkflowReview,
    rejectedWorkflowReview,
  );

  return [
    "# JudgmentKit One-Shot Before/After Demo",
    "",
    "This is a scripted fixture demo. It does not call a model or depend on provider configuration.",
    "",
    `Static visual demo: ${path.relative(ROOT_DIR, htmlOutputPath)}`,
    "",
    "## Source Brief",
    "",
    brief,
    "",
    "## Without JudgmentKit",
    "",
    buildBaselineOneShot(),
    "",
    "## With JudgmentKit",
    "",
    buildActivityReviewSummary(activityReview),
    "",
    buildWorkflowReviewSummary("Accepted Workflow Review", acceptedWorkflowReview),
    "",
    buildWorkflowReviewSummary("Rejected Workflow Review", rejectedWorkflowReview),
    "",
    buildGuidedPrimaryConcept(acceptedWorkflowReview),
    "",
    buildDisclosureBoundary(
      activityReview,
      acceptedWorkflowReview,
      rejectedWorkflowReview,
    ),
    "",
    "## What Changed",
    "",
    buildComparisonTable(activityReview),
    "",
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(buildOneShotDemoTranscript());
}
