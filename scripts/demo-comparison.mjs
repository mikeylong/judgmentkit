import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createActivityModelReview,
  createFrontendGenerationContext,
  createFrontendImplementationSkillContext,
  createUiGenerationHandoff,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const BRIEF_PATH = path.join(
  ROOT_DIR,
  "examples/demo/refund-ops-implementation-heavy.brief.txt",
);
const OUTPUT_DIR = path.join(ROOT_DIR, "examples/comparison");
const VERSION_A_PATH = path.join(OUTPUT_DIR, "version-a.html");
const VERSION_B_PATH = path.join(OUTPUT_DIR, "version-b.html");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");

const COMPARISON_ID = "refund-triage-standalone-v1";
const TASK_PROMPT =
  "Review the selected refund request and prepare the next handoff.";
const SELECTED_CASE_ID = "R-1842";

const IMPLEMENTATION_TERMS = [
  "database table",
  "JSON schema",
  "prompt template",
  "tool call",
  "resource id",
  "API endpoint",
  "CRUD",
];

const REVIEW_PACKET_TERMS = [
  "ready_for_review",
  "activity_model",
  "interaction_contract",
  "review_status",
  "guardrails",
  "JudgmentKit",
];

const CASES = [
  {
    id: SELECTED_CASE_ID,
    customer: "Nora Diaz",
    amount: "$184.20",
    reason: "Subscription renewal disputed after agent escalation.",
    evidence: [
      "Purchase history confirms the renewal date.",
      "Support agent note explains the customer request.",
      "Receipt photo is still needed before final approval.",
    ],
    policy:
      "Renewal is inside the exception window. Manager approval is allowed when evidence is complete; unclear duplicate-charge cases go to policy review.",
  },
  {
    id: "R-1843",
    customer: "Jun Park",
    amount: "$89.00",
    reason: "Customer reports duplicate monthly charge.",
    evidence: ["Payment history present.", "Agent note added."],
    policy: "Duplicate-charge requests need policy review when evidence conflicts.",
  },
  {
    id: "R-1844",
    customer: "Amara Blake",
    amount: "$312.75",
    reason: "Late cancellation after renewal.",
    evidence: ["Cancellation date present.", "Customer message attached."],
    policy: "Late cancellation exceptions require manager approval.",
  },
];

function readBrief() {
  return fs.readFileSync(BRIEF_PATH, "utf8").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeScriptJson(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function renderList(values) {
  return values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");
}

function renderQueueItems() {
  return CASES.map(
    (refundCase, index) => `
      <button type="button" class="queue-row${index === 0 ? " is-selected" : ""}">
        <span>${escapeHtml(refundCase.id)}</span>
        <strong>${escapeHtml(refundCase.customer)}</strong>
        <small>${escapeHtml(refundCase.amount)}</small>
      </button>
    `,
  ).join("");
}

function buildUiWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Refund escalation queue",
      steps: [
        "Review selected case",
        "Check evidence",
        "Choose refund path",
        "Prepare handoff",
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

function buildHandoff(brief) {
  const activityReview = createActivityModelReview(brief);
  const workflowReview = reviewUiWorkflowCandidate(brief, buildUiWorkflowCandidate());
  const handoff = createUiGenerationHandoff(workflowReview);
  const frontendContext = createFrontendGenerationContext({
    ui_generation_handoff: handoff,
    frontend_context: {
      target_runtime: "standalone HTML/CSS",
      ui_library: "none",
      approved_component_families: [
        "queue",
        "detail panel",
        "decision controls",
        "handoff panel",
      ],
      files_or_entrypoints: ["examples/comparison/version-b.html"],
    },
    verification: {
      commands: ["npm run demo:comparison", "npm run eval:ui"],
      browser_checks: ["desktop screenshot", "mobile screenshot"],
      states_to_verify: ["selected refund case", "handoff ready"],
    },
  });
  const frontendSkillContext = createFrontendImplementationSkillContext({
    frontend_generation_context: frontendContext,
    target_client: "deterministic-eval-harness",
  });

  return {
    activityReview,
    workflowReview,
    handoff,
    frontendContext,
    frontendSkillContext,
  };
}

function buildSharedHeader() {
  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Refund operations</p>
        <h1>Refund Review Workspace</h1>
      </div>
      <p class="task-prompt" data-study-task>${escapeHtml(TASK_PROMPT)}</p>
    </header>
  `;
}

function buildBaselinePrimarySurface() {
  const selectedCase = CASES[0];

  return `
    <main class="app-shell baseline-shell" data-primary-surface>
      ${buildSharedHeader()}

      <section class="toolbar" aria-label="Record actions">
        <button type="button">Create</button>
        <button type="button">Read</button>
        <button type="button">Update</button>
        <button type="button">Delete</button>
        <button type="button">Refresh JSON schema</button>
        <button type="button">Rerun prompt template</button>
      </section>

      <section class="record-grid">
        <div class="record-table">
          <div class="section-heading">
            <p class="eyebrow">Admin record</p>
            <h2>refund_case database table</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>database table field</th>
                <th>value</th>
                <th>JSON schema</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>refund_case.id</td>
                <td>${escapeHtml(selectedCase.id)}</td>
                <td>valid</td>
              </tr>
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
                <td>missing receipt field</td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside class="debug-panel">
          <h2>Record controls</h2>
          <dl>
            <div>
              <dt>resource id</dt>
              <dd>rfc_87291</dd>
            </div>
            <div>
              <dt>API endpoint</dt>
              <dd>/v1/refunds/escalations</dd>
            </div>
            <div>
              <dt>CRUD status</dt>
              <dd>Unsaved update</dd>
            </div>
          </dl>
          <button type="button" class="primary-action">Save CRUD update</button>
        </aside>
      </section>

      <section class="record-grid">
        <div class="debug-panel">
          <h2>Prompt template</h2>
          <p>refund_triage_v12 runs before the CRUD save action.</p>
        </div>
        <div class="debug-panel">
          <h2>Tool call result</h2>
          <p>policy_check.pending requires another tool call before the update can be saved.</p>
        </div>
      </section>
    </main>
  `;
}

function buildWorkflowSteps(steps) {
  return steps
    .map(
      (step, index) => `
        <li${index === 0 ? ' class="is-current"' : ""}>
          <span>${index + 1}</span>
          ${escapeHtml(step)}
        </li>
      `,
    )
    .join("");
}

function buildDecisionButtons(actions) {
  return actions
    .map((action, index) => {
      const className = index === 0 ? ' class="primary-action"' : "";
      return `<button type="button"${className}>${escapeHtml(action)}</button>`;
    })
    .join("");
}

function buildGuidedPrimarySurface(handoff) {
  const selectedCase = CASES[0];
  const decisionActions = handoff.workflow.primary_actions.filter(
    (action) => action.toLowerCase() !== "send handoff",
  );

  return `
    <main class="app-shell guided-shell" data-primary-surface>
      ${buildSharedHeader()}

      <section class="workflow-strip" aria-label="Refund workflow">
        <div class="section-heading">
          <p class="eyebrow">Daily triage</p>
          <h2>${escapeHtml(handoff.workflow.surface_name)}</h2>
        </div>
        <ol>${buildWorkflowSteps(handoff.workflow.steps)}</ol>
      </section>

      <section class="workspace-grid">
        <aside class="queue-panel" aria-label="Refund cases">
          <div class="section-heading">
            <p class="eyebrow">Queue</p>
            <h2>Selected case</h2>
          </div>
          ${renderQueueItems()}
        </aside>

        <div class="case-panel">
          <section class="case-summary">
            <div class="section-heading">
              <p class="eyebrow">Customer refund escalation</p>
              <h2>${escapeHtml(selectedCase.id)}: ${escapeHtml(selectedCase.customer)}</h2>
            </div>
            <dl class="case-facts">
              <div>
                <dt>Request</dt>
                <dd>${escapeHtml(selectedCase.amount)} refund</dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>${escapeHtml(selectedCase.reason)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2>Evidence checklist</h2>
            <ul class="checklist">${renderList(selectedCase.evidence)}</ul>
          </section>

          <section>
            <h2>Policy review context</h2>
            <p>${escapeHtml(selectedCase.policy)}</p>
          </section>

          <section>
            <h2>Choose a path</h2>
            <div class="decision-actions">
              ${buildDecisionButtons(decisionActions)}
            </div>
          </section>

          <section class="handoff-panel">
            <h2>Handoff</h2>
            <label>
              Next owner
              <select>
                <option>${escapeHtml(handoff.handoff.next_owner)}</option>
                <option>Policy reviewer</option>
                <option>Refund operations</option>
              </select>
            </label>
            <label>
              Handoff reason
              <textarea rows="3">${escapeHtml(handoff.handoff.reason)}</textarea>
            </label>
            <button type="button" class="primary-action">${escapeHtml(
              handoff.handoff.next_action,
            )}</button>
          </section>
        </div>
      </section>
    </main>
  `;
}

function buildStyles() {
  return `
    :root {
      color-scheme: light;
      --ink: #1d2730;
      --muted: #5c6b78;
      --line: #c9d3dc;
      --surface: #f6f8fa;
      --panel: #ffffff;
      --accent: #255f85;
      --accent-dark: #174461;
      --warning: #874c1d;
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--ink);
      background: var(--surface);
    }

    button,
    select,
    textarea {
      font: inherit;
    }

    button,
    select,
    textarea {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--ink);
    }

    button {
      min-height: 40px;
      padding: 0 14px;
      font-weight: 650;
      cursor: pointer;
    }

    .primary-action {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }

    .app-shell {
      min-height: 100vh;
      padding: 28px;
    }

    .app-header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: start;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }

    h1,
    h2,
    p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 0;
      font-size: 2rem;
      line-height: 1.1;
    }

    h2 {
      margin-bottom: 12px;
      font-size: 1.1rem;
      line-height: 1.25;
    }

    .eyebrow,
    dt {
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 0.75rem;
      font-weight: 760;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .task-prompt {
      max-width: 360px;
      margin-bottom: 0;
      color: var(--muted);
      line-height: 1.45;
      text-align: right;
    }

    section,
    aside,
    .record-table,
    .debug-panel,
    .case-panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    section,
    aside,
    .record-table,
    .debug-panel {
      padding: 18px;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 22px 0;
      border-color: #dfb98c;
      background: #fff8ef;
    }

    .record-grid,
    .workspace-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 18px;
      margin-top: 18px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.94rem;
    }

    th,
    td {
      padding: 13px 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
    }

    dl,
    dd {
      margin: 0;
    }

    dl div + div {
      margin-top: 14px;
    }

    dd {
      font-weight: 650;
    }

    .debug-panel p {
      color: var(--warning);
      line-height: 1.45;
    }

    .workflow-strip {
      margin: 22px 0;
    }

    .workflow-strip ol {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      padding: 0;
      margin: 0;
      list-style: none;
    }

    .workflow-strip li {
      display: flex;
      gap: 10px;
      align-items: center;
      min-height: 52px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 6px;
    }

    .workflow-strip li span {
      display: inline-grid;
      flex: 0 0 auto;
      width: 26px;
      height: 26px;
      place-items: center;
      border-radius: 50%;
      background: #e9f2f7;
      color: var(--accent-dark);
      font-weight: 760;
    }

    .workflow-strip li.is-current {
      border-color: var(--accent);
      background: #f0f7fb;
    }

    .queue-panel {
      align-self: start;
    }

    .queue-row {
      display: grid;
      width: 100%;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: center;
      min-height: 54px;
      margin-top: 10px;
      text-align: left;
    }

    .queue-row.is-selected {
      border-color: var(--accent);
      background: #f0f7fb;
    }

    .case-panel {
      display: grid;
      gap: 14px;
      padding: 0;
      border: 0;
      background: transparent;
    }

    .case-facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .checklist {
      display: grid;
      gap: 10px;
      padding-left: 20px;
      margin-bottom: 0;
      line-height: 1.45;
    }

    .decision-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .handoff-panel {
      display: grid;
      gap: 12px;
    }

    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-weight: 650;
    }

    select,
    textarea {
      width: 100%;
      padding: 10px 12px;
      color: var(--ink);
    }

    @media (max-width: 760px) {
      .app-shell {
        padding: 18px;
      }

      .app-header,
      .record-grid,
      .workspace-grid {
        display: block;
      }

      .task-prompt {
        max-width: none;
        margin-top: 10px;
        text-align: left;
      }

      .debug-panel,
      .record-table,
      .queue-panel,
      .workflow-strip,
      .case-panel {
        margin-top: 14px;
      }

      .workflow-strip ol,
      .case-facts {
        grid-template-columns: 1fr;
      }
    }
  `;
}

function buildStandaloneHtml({ variantLabel, primarySurfaceHtml, metadata }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Refund Review Workspace ${escapeHtml(variantLabel)}</title>
  <style>${buildStyles()}</style>
</head>
<body data-comparison-id="${COMPARISON_ID}" data-variant="${escapeHtml(
    variantLabel,
  )}">
  ${primarySurfaceHtml}
  <script type="application/json" id="comparison-metadata">${escapeScriptJson(
    metadata,
  )}</script>
</body>
</html>
`;
}

function writeJson(filePath, value) {
  fs.writeFileSync(`${filePath}.tmp`, `${escapeScriptJson(value)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function main() {
  const brief = readBrief();
  const { activityReview, workflowReview, handoff, frontendContext, frontendSkillContext } =
    buildHandoff(brief);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const baselineMetadata = {
    comparison_id: COMPARISON_ID,
    variant: "A",
    treatment: "raw_brief_baseline",
    task_prompt: TASK_PROMPT,
    selected_case_id: SELECTED_CASE_ID,
    source_brief_excerpt: brief,
    visible_leakage_terms_expected: IMPLEMENTATION_TERMS,
  };
  const guidedMetadata = {
    comparison_id: COMPARISON_ID,
    variant: "B",
    treatment: "judgmentkit_handoff",
    task_prompt: TASK_PROMPT,
    selected_case_id: SELECTED_CASE_ID,
    generation_source: {
      handoff_status: handoff.handoff_status,
      activity_review_status: activityReview.review_status,
      workflow_review_status: workflowReview.review_status,
      surface_name: handoff.workflow.surface_name,
      frontend_context_status: frontendContext.frontend_context_status,
      frontend_skill_context_status: frontendSkillContext.skill_context_status,
    },
    frontend_skill_context: {
      source_skill: frontendSkillContext.source_skill.name,
      raw_skill_exposed: frontendSkillContext.source_skill.raw_skill_exposed,
      surface_type: frontendSkillContext.surface_type_guidance.surface_type,
      design_system_mode: frontendSkillContext.design_system_policy.mode,
      next_recommended_tool: frontendSkillContext.next_recommended_tool,
      verification_checklist: frontendSkillContext.verification_checklist,
    },
    terms_kept_out_of_primary_ui: [
      ...handoff.disclosure_reminders.terms_to_keep_out_of_primary_ui,
      ...REVIEW_PACKET_TERMS,
    ],
  };

  fs.writeFileSync(
    VERSION_A_PATH,
    buildStandaloneHtml({
      variantLabel: "A",
      primarySurfaceHtml: buildBaselinePrimarySurface(),
      metadata: baselineMetadata,
    }),
  );
  fs.writeFileSync(
    VERSION_B_PATH,
    buildStandaloneHtml({
      variantLabel: "B",
      primarySurfaceHtml: buildGuidedPrimarySurface(handoff),
      metadata: guidedMetadata,
    }),
  );
  writeJson(MANIFEST_PATH, {
    comparison_id: COMPARISON_ID,
    task_prompt: TASK_PROMPT,
    selected_case_id: SELECTED_CASE_ID,
    randomized_order_required: true,
    variants: [
      {
        label: "Version A",
        file: path.relative(ROOT_DIR, VERSION_A_PATH),
        treatment: "raw_brief_baseline",
      },
      {
        label: "Version B",
        file: path.relative(ROOT_DIR, VERSION_B_PATH),
        treatment: "judgmentkit_handoff",
      },
    ],
    metrics: [
      "task success",
      "time to correct decision",
      "implementation leakage noticed",
      "reviewer confidence",
      "required rework before usable",
    ],
  });

  process.stdout.write(
    [
      "# JudgmentKit Standalone Comparison",
      "",
      `Comparison id: ${COMPARISON_ID}`,
      `Task: ${TASK_PROMPT}`,
      "",
      `Version A: ${path.relative(ROOT_DIR, VERSION_A_PATH)}`,
      `Version B: ${path.relative(ROOT_DIR, VERSION_B_PATH)}`,
      `Manifest: ${path.relative(ROOT_DIR, MANIFEST_PATH)}`,
      "",
      `Guided handoff status: ${handoff.handoff_status}`,
      `Guided skill context status: ${frontendSkillContext.skill_context_status}`,
      `Workflow review status: ${workflowReview.review_status}`,
      "",
    ].join("\n"),
  );
}

main();
