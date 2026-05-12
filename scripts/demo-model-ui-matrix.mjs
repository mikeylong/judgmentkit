import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createActivityModelReview,
  createUiGenerationHandoff,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "examples/model-ui/refund-system-map");
const ARTIFACTS_DIR = path.join(OUTPUT_DIR, "artifacts");
const SOURCE_BRIEF_FILE = "examples/demo/refund-ops-implementation-heavy.brief.txt";
const HANDOFF_FILE = "examples/model-ui/refund-system-map/reviewed-handoff.fixture.json";
const DESIGN_SYSTEM_FILE =
  "examples/model-ui/refund-system-map/design-system-adapter.json";
const MATRIX_ID = "refund-system-map-model-ui-v1";

const SELECTED_CASE = {
  id: "R-1842",
  customer: "Nora Diaz",
  plan: "Pro annual",
  amount: "$184.20",
  request: "Subscription renewal disputed after agent escalation.",
  status: "Evidence incomplete",
  evidence: [
    "Renewal date confirmed in purchase history.",
    "Support note captures the customer's refund reason.",
    "Receipt photo is missing before manager approval.",
  ],
  policy:
    "Inside exception window. Manager approval is allowed when evidence is complete; unclear duplicate-charge cases go to policy review.",
};

const QUEUE = [
  { id: "R-1842", customer: "Nora Diaz", state: "Needs receipt", amount: "$184.20" },
  { id: "R-1843", customer: "Jun Park", state: "Policy question", amount: "$89.00" },
  { id: "R-1844", customer: "Amara Blake", state: "Manager review", amount: "$312.75" },
];

const OUTPUTS = [
  {
    id: "deterministic-without-design-system",
    model_label: "Deterministic renderer",
    title: "Deterministic renderer",
    generation_source: "deterministic",
    design_system_mode: "without_design_system",
    capture_provenance: {
      status: "captured",
      capture_type: "deterministic-renderer",
      captured_at: "2026-05-12",
      runner: "scripts/demo-model-ui-matrix.mjs",
      provider: "none",
      model: "none",
      notes:
        "Rendered from the reviewed JudgmentKit handoff with no provider or model call.",
    },
  },
  {
    id: "deterministic-with-design-system",
    model_label: "Deterministic renderer",
    title: "Deterministic renderer with design-system adapter",
    generation_source: "deterministic",
    design_system_mode: "with_design_system",
    capture_provenance: {
      status: "captured",
      capture_type: "deterministic-renderer",
      captured_at: "2026-05-12",
      runner: "scripts/demo-model-ui-matrix.mjs",
      provider: "none",
      model: "none",
      notes:
        "Rendered from the same reviewed JudgmentKit handoff with the example-only design-system adapter applied.",
    },
  },
  {
    id: "gemma4-without-design-system",
    model_label: "Gemma 4 (local LLM)",
    title: "Gemma 4 local LLM capture",
    generation_source: "captured_model_output",
    design_system_mode: "without_design_system",
    capture_provenance: {
      status: "capture-required",
      capture_type: "model-output-slot",
      captured_at: null,
      intended_provider: "ollama",
      intended_model: "gemma4:e2b",
      model_label: "Gemma 4 (local LLM)",
      notes:
        "No real Gemma 4 capture transcript is committed yet. This artifact keeps the public matrix wired without claiming benchmark evidence.",
    },
  },
  {
    id: "gemma4-with-design-system",
    model_label: "Gemma 4 (local LLM)",
    title: "Gemma 4 local LLM capture with design-system adapter",
    generation_source: "captured_model_output",
    design_system_mode: "with_design_system",
    capture_provenance: {
      status: "capture-required",
      capture_type: "model-output-slot",
      captured_at: null,
      intended_provider: "ollama",
      intended_model: "gemma4:e2b",
      model_label: "Gemma 4 (local LLM)",
      notes:
        "No real Gemma 4 capture transcript is committed yet. Apply the example-only design-system adapter only after a real output is captured.",
    },
  },
  {
    id: "gpt55-without-design-system",
    model_label: "GPT-5.5",
    title: "GPT-5.5 capture",
    generation_source: "captured_model_output",
    design_system_mode: "without_design_system",
    capture_provenance: {
      status: "capture-required",
      capture_type: "model-output-slot",
      captured_at: null,
      intended_provider: "openai-responses",
      intended_model: "gpt-5.5",
      model_label: "GPT-5.5",
      notes:
        "No real GPT-5.5 capture transcript is committed yet. This artifact is a provenance slot, not a generated-output claim.",
    },
  },
  {
    id: "gpt55-with-design-system",
    model_label: "GPT-5.5",
    title: "GPT-5.5 capture with design-system adapter",
    generation_source: "captured_model_output",
    design_system_mode: "with_design_system",
    capture_provenance: {
      status: "capture-required",
      capture_type: "model-output-slot",
      captured_at: null,
      intended_provider: "openai-responses",
      intended_model: "gpt-5.5",
      model_label: "GPT-5.5",
      notes:
        "No real GPT-5.5 capture transcript is committed yet. Apply the example-only design-system adapter only after a real output is captured.",
    },
  },
];

const DESIGN_SYSTEM_ADAPTER = {
  id: "refund-ops-review-adapter",
  name: "Refund Ops Review Adapter",
  scope: "example-only",
  role: "visual layer after JudgmentKit handoff",
  tokens: {
    color: {
      canvas: "#f7f4ee",
      surface: "#ffffff",
      ink: "#182521",
      muted: "#64716b",
      accent: "#0f766e",
      warning: "#9a5b16",
      line: "#d9d3c5",
    },
    radius: {
      control: "6px",
      panel: "8px",
    },
    density: "operational",
  },
  components: [
    "queue row",
    "evidence checklist",
    "decision group",
    "handoff receipt",
  ],
  constraint:
    "The adapter changes visual treatment and control grouping only; it does not change the activity, decision, evidence, or handoff.",
};

function readSourceBrief() {
  return fs.readFile(path.join(ROOT_DIR, SOURCE_BRIEF_FILE), "utf8");
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonForScript(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function artifactPath(output) {
  return `artifacts/${output.id}.html`;
}

function buildUiWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Refund escalation review",
      steps: [
        "Choose the active refund request",
        "Review customer context and evidence",
        "Choose the next refund path",
        "Send a clear handoff",
      ],
      primary_actions: [
        "Approve refund",
        "Send to policy review",
        "Return for evidence",
        "Send handoff",
      ],
      decision_points: [
        "Decide whether the refund can be approved, needs policy review, or must return to the support agent for missing evidence.",
      ],
      completion_state:
        "The next owner receives a handoff with the chosen path and the reason.",
    },
    primary_ui: {
      sections: [
        "Refund queue",
        "Selected request",
        "Evidence checklist",
        "Policy context",
        "Decision path",
        "Handoff reason",
      ],
      controls: [
        "Select request",
        "Approve refund",
        "Send to policy review",
        "Return for evidence",
        "Choose next owner",
        "Send handoff",
      ],
      user_facing_terms: [
        "refund escalation",
        "selected request",
        "evidence checklist",
        "policy review",
        "handoff reason",
        "support agent",
      ],
    },
    handoff: {
      next_owner: "Support agent",
      reason:
        "Receipt photo is missing. Ask the customer to attach proof before approval.",
      next_action:
        "Return the request to the support agent with the missing evidence request.",
    },
    diagnostics: {
      implementation_terms: [
        "database table",
        "JSON schema",
        "prompt template",
        "tool call",
        "resource id",
        "API endpoint",
        "CRUD",
      ],
      reveal_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

function buildReviewedHandoff(brief) {
  const activityReview = createActivityModelReview(brief);
  const workflowReview = reviewUiWorkflowCandidate(brief, buildUiWorkflowCandidate());
  const handoff = createUiGenerationHandoff(workflowReview);

  return {
    source_brief_file: SOURCE_BRIEF_FILE,
    activity_review_status: activityReview.review_status,
    workflow_review_status: workflowReview.review_status,
    handoff_status: handoff.handoff_status,
    activity_model: handoff.activity_model,
    interaction_contract: handoff.interaction_contract,
    workflow: handoff.workflow,
    primary_surface: handoff.primary_surface,
    handoff: handoff.handoff,
    disclosure_reminders: handoff.disclosure_reminders,
  };
}

function renderQueue() {
  return QUEUE.map(
    (item) => `
      <button class="queue-item${item.id === SELECTED_CASE.id ? " is-selected" : ""}" type="button">
        <span>${escapeHtml(item.id)}</span>
        <strong>${escapeHtml(item.customer)}</strong>
        <small>${escapeHtml(item.state)} · ${escapeHtml(item.amount)}</small>
      </button>`,
  ).join("");
}

function renderEvidence() {
  return SELECTED_CASE.evidence
    .map(
      (item, index) => `
        <li>
          <span class="check">${index === 2 ? "!" : "OK"}</span>
          <span>${escapeHtml(item)}</span>
        </li>`,
    )
    .join("");
}

function renderPrimarySurface(output) {
  const withDesignSystem = output.design_system_mode === "with_design_system";
  const needsCapture = output.capture_provenance.status !== "captured";
  const captureBanner = needsCapture
    ? `<p class="capture-warning">Capture required before this slot can be described as ${escapeHtml(output.model_label)} generated UI.</p>`
    : "";

  return `
    <main class="app-shell${withDesignSystem ? " design-system" : ""}" data-primary-surface>
      <header class="app-header">
        <div>
          <p class="eyebrow">${escapeHtml(output.model_label)}</p>
          <h1>Refund Review Workspace</h1>
        </div>
        <span class="status">${withDesignSystem ? "Adapter applied" : "Simple primitives"}</span>
      </header>
      ${captureBanner}
      <section class="workspace">
        <aside class="queue" aria-label="Refund queue">
          <div class="section-heading">
            <p class="eyebrow">Queue</p>
            <h2>Refund escalations</h2>
          </div>
          ${renderQueue()}
        </aside>
        <section class="detail">
          <div class="case-header">
            <div>
              <p class="eyebrow">Selected request</p>
              <h2>${escapeHtml(SELECTED_CASE.id)} · ${escapeHtml(SELECTED_CASE.customer)}</h2>
              <p>${escapeHtml(SELECTED_CASE.request)}</p>
            </div>
            <strong>${escapeHtml(SELECTED_CASE.amount)}</strong>
          </div>
          <div class="info-grid">
            <div>
              <span>Plan</span>
              <strong>${escapeHtml(SELECTED_CASE.plan)}</strong>
            </div>
            <div>
              <span>Review state</span>
              <strong>${escapeHtml(SELECTED_CASE.status)}</strong>
            </div>
          </div>
          <section>
            <div class="section-heading">
              <p class="eyebrow">Evidence</p>
              <h3>Checklist</h3>
            </div>
            <ul class="evidence-list">${renderEvidence()}</ul>
          </section>
          <section class="policy">
            <div class="section-heading">
              <p class="eyebrow">Policy context</p>
              <h3>Exception window</h3>
            </div>
            <p>${escapeHtml(SELECTED_CASE.policy)}</p>
          </section>
          <section>
            <div class="section-heading">
              <p class="eyebrow">Decision path</p>
              <h3>Choose next action</h3>
            </div>
            <div class="actions">
              <button type="button">Approve refund</button>
              <button type="button">Send to policy review</button>
              <button type="button" class="primary">Return for evidence</button>
            </div>
          </section>
          <section class="handoff">
            <div>
              <p class="eyebrow">Handoff</p>
              <h3>Support agent</h3>
              <p>Receipt photo is missing. Ask the customer to attach proof before approval.</p>
            </div>
            <button type="button" class="primary">Send handoff</button>
          </section>
        </section>
      </section>
    </main>`;
}

function artifactCss() {
  return `
    :root {
      color-scheme: light;
      --canvas: #f5f3ed;
      --panel: #ffffff;
      --ink: #17231f;
      --muted: #65726d;
      --line: #d9d3c7;
      --accent: #245f73;
      --accent-strong: #174352;
      --warning: #8a5a16;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--canvas);
      color: var(--ink);
      font: 15px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    button { font: inherit; }
    .app-shell {
      min-height: 100vh;
      padding: 24px;
    }
    .app-header,
    .case-header,
    .handoff {
      display: flex;
      gap: 18px;
      align-items: start;
      justify-content: space-between;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 0; font-size: clamp(28px, 4vw, 42px); letter-spacing: 0; }
    h2 { margin-bottom: 8px; font-size: 22px; letter-spacing: 0; }
    h3 { margin-bottom: 8px; font-size: 18px; letter-spacing: 0; }
    p { color: var(--muted); }
    .eyebrow {
      margin-bottom: 6px;
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .status,
    .capture-warning {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #eef6f7;
      color: var(--accent-strong);
      font-size: 13px;
      font-weight: 800;
    }
    .capture-warning {
      display: block;
      margin: 18px 0;
      background: #fff7e8;
      color: var(--warning);
    }
    .workspace {
      display: grid;
      grid-template-columns: minmax(210px, 280px) minmax(0, 1fr);
      gap: 18px;
      margin-top: 24px;
    }
    .queue,
    .detail,
    .detail > section,
    .handoff {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    .queue,
    .detail {
      padding: 16px;
    }
    .queue {
      display: grid;
      gap: 10px;
      align-content: start;
    }
    .queue-item {
      display: grid;
      gap: 3px;
      width: 100%;
      padding: 11px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #ffffff;
      color: var(--ink);
      text-align: left;
    }
    .queue-item small {
      color: var(--muted);
    }
    .queue-item.is-selected {
      border-color: var(--accent);
      background: #edf6f7;
    }
    .detail {
      display: grid;
      gap: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .info-grid > div,
    .detail > section {
      padding: 14px;
    }
    .info-grid > div {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #faf9f5;
    }
    .info-grid span {
      display: block;
      margin-bottom: 4px;
      color: var(--muted);
      font-size: 13px;
    }
    .evidence-list {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .evidence-list li {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 8px;
      align-items: start;
    }
    .check {
      display: inline-grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--accent-strong);
      font-size: 11px;
      font-weight: 900;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .actions button,
    .handoff button {
      min-height: 40px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #ffffff;
      color: var(--ink);
      cursor: pointer;
      font-weight: 800;
    }
    button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #ffffff;
    }
    .handoff {
      padding: 14px;
      background: #f3f8f8;
    }
    .provenance {
      padding: 16px 24px 24px;
      color: var(--muted);
      font-size: 13px;
    }
    .provenance code {
      color: var(--ink);
    }
    .design-system {
      --canvas: #f7f4ee;
      --panel: #ffffff;
      --ink: #182521;
      --muted: #64716b;
      --line: #d9d3c5;
      --accent: #0f766e;
      --accent-strong: #0f4f49;
      --warning: #9a5b16;
    }
    .design-system .app-header {
      padding: 14px 16px;
      border-bottom: 3px solid var(--accent);
      background: #ffffff;
    }
    .design-system .queue,
    .design-system .detail,
    .design-system .detail > section,
    .design-system .handoff {
      box-shadow: 0 1px 0 rgba(24, 37, 33, 0.04);
    }
    .design-system .queue-item.is-selected {
      border-left: 5px solid var(--accent);
    }
    @media (max-width: 760px) {
      .app-shell { padding: 16px; }
      .app-header,
      .case-header,
      .handoff {
        display: grid;
      }
      .workspace,
      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

function renderArtifact(output, manifestEntry) {
  const provenance = {
    matrix_id: MATRIX_ID,
    artifact_id: output.id,
    model_label: output.model_label,
    generation_source: output.generation_source,
    design_system_mode: output.design_system_mode,
    source_brief_file: SOURCE_BRIEF_FILE,
    handoff_source: HANDOFF_FILE,
    design_system_adapter_file:
      output.design_system_mode === "with_design_system" ? DESIGN_SYSTEM_FILE : null,
    capture_provenance: output.capture_provenance,
    artifact_path: manifestEntry.artifact_path,
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(output.title)}</title>
    <style>${artifactCss()}</style>
  </head>
  <body data-artifact-id="${escapeHtml(output.id)}" data-design-system-mode="${escapeHtml(output.design_system_mode)}">
    ${renderPrimarySurface(output)}
    <aside class="provenance" aria-label="Artifact provenance">
      <strong>Provenance:</strong>
      <span>${escapeHtml(output.capture_provenance.status)}</span>
      <span> · ${escapeHtml(output.generation_source)}</span>
      <span> · ${escapeHtml(output.design_system_mode)}</span>
      <p>This static snapshot is part of the JudgmentKit system-map examples. Build-time site generation copies this file and does not call a model.</p>
      <p>Manifest entry: <code>${escapeHtml(manifestEntry.artifact_path)}</code></p>
    </aside>
    <script type="application/json" id="model-ui-provenance">${jsonForScript(provenance)}</script>
  </body>
</html>
`;
}

function renderMatrixIndex(manifest) {
  const rows = manifest.artifacts
    .map(
      (artifact) => `
        <tr>
          <td>${escapeHtml(artifact.model_label)}</td>
          <td>${escapeHtml(artifact.design_system_mode === "with_design_system" ? "With design system" : "Without design system")}</td>
          <td>${escapeHtml(artifact.capture_provenance.status)}</td>
          <td><a href="${escapeHtml(artifact.artifact_path)}">${escapeHtml(artifact.title)}</a></td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Model UI generation matrix</title>
    <style>
      :root {
        --canvas: #f8f7f2;
        --panel: #ffffff;
        --ink: #17231f;
        --muted: #64716b;
        --line: #d9d3c5;
        --accent: #245f73;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--canvas);
        color: var(--ink);
        font: 15px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        max-width: 1080px;
        margin: 0 auto;
        padding: clamp(24px, 5vw, 52px);
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(32px, 5vw, 56px);
        letter-spacing: 0;
      }
      p {
        max-width: 760px;
        color: var(--muted);
      }
      .eyebrow {
        margin-bottom: 8px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin: 28px 0;
      }
      .summary div,
      table {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
      }
      .summary div {
        padding: 14px;
      }
      .summary strong,
      .summary span {
        display: block;
      }
      .summary span {
        color: var(--muted);
        font-size: 13px;
      }
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        overflow: hidden;
      }
      th,
      td {
        padding: 12px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
      }
      th {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
      }
      tr:last-child td {
        border-bottom: 0;
      }
      a {
        color: var(--accent);
        font-weight: 800;
      }
      .note {
        margin-top: 18px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fff8ea;
      }
      @media (max-width: 760px) {
        .summary {
          grid-template-columns: 1fr;
        }
        table,
        thead,
        tbody,
        tr,
        th,
        td {
          display: block;
        }
        thead {
          display: none;
        }
        td {
          border-bottom: 0;
        }
        tr {
          border-bottom: 1px solid var(--line);
        }
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">System-map example pack</p>
      <h1>Model UI generation matrix</h1>
      <p>One refund-triage handoff moves through the system-map branches: deterministic generation, optional model assistance, and the later design-system adapter. The site build copies these static artifacts and does not call a provider.</p>
      <div class="summary" aria-label="Matrix summary">
        <div><span>Source brief</span><strong>${escapeHtml(manifest.source_brief_file)}</strong></div>
        <div><span>Reviewed handoff</span><strong>${escapeHtml(manifest.reviewed_handoff_file)}</strong></div>
        <div><span>Artifacts</span><strong>${manifest.artifacts.length} snapshots</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Generation branch</th>
            <th>Adapter branch</th>
            <th>Provenance</th>
            <th>Artifact</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="note">Entries marked <strong>capture-required</strong> are wired as truthful provenance slots until real Gemma 4 and GPT-5.5 run transcripts are captured and committed.</p>
    </main>
    <script type="application/json" id="model-ui-manifest">${jsonForScript(manifest)}</script>
  </body>
</html>
`;
}

async function main() {
  const brief = await readSourceBrief();
  const reviewedHandoff = buildReviewedHandoff(brief);
  const promptHash = hash(
    [
      brief,
      JSON.stringify(reviewedHandoff, null, 2),
      JSON.stringify(DESIGN_SYSTEM_ADAPTER, null, 2),
    ].join("\n"),
  );

  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

  const artifacts = OUTPUTS.map((output) => ({
    ...output,
    source_brief_file: SOURCE_BRIEF_FILE,
    reviewed_handoff_file: HANDOFF_FILE,
    design_system_adapter_file:
      output.design_system_mode === "with_design_system" ? DESIGN_SYSTEM_FILE : null,
    handoff_source: HANDOFF_FILE,
    prompt_sha256: promptHash,
    artifact_path: artifactPath(output),
  }));

  const manifest = {
    matrix_id: MATRIX_ID,
    title: "Model UI generation matrix",
    source_brief_file: SOURCE_BRIEF_FILE,
    reviewed_handoff_file: HANDOFF_FILE,
    design_system_adapter_file: DESIGN_SYSTEM_FILE,
    generation_policy:
      "Static captured-fixture pack. Website builds copy committed artifacts and never call a live model.",
    system_map_branches: [
      "JudgmentKit reviewed handoff",
      "LLM / agent UI pass",
      "with design system",
      "without design system",
    ],
    model_labels: ["Deterministic renderer", "Gemma 4 (local LLM)", "GPT-5.5"],
    artifacts,
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, "reviewed-handoff.fixture.json"),
    `${JSON.stringify(reviewedHandoff, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(OUTPUT_DIR, "design-system-adapter.json"),
    `${JSON.stringify(DESIGN_SYSTEM_ADAPTER, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(OUTPUT_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  for (const artifact of artifacts) {
    const html = renderArtifact(artifact, artifact);
    await fs.writeFile(path.join(OUTPUT_DIR, artifact.artifact_path), html);
  }

  await fs.writeFile(path.join(OUTPUT_DIR, "index.html"), renderMatrixIndex(manifest));

  process.stdout.write("# JudgmentKit Model UI Matrix\n\n");
  process.stdout.write(`Source brief: ${SOURCE_BRIEF_FILE}\n`);
  process.stdout.write(`Matrix: examples/model-ui/refund-system-map/index.html\n`);
  process.stdout.write(`Manifest: examples/model-ui/refund-system-map/manifest.json\n`);
  process.stdout.write(`Artifacts: ${artifacts.length}\n`);
}

await main();
