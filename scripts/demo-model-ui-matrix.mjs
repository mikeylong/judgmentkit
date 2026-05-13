import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import createEmotionServer from "@emotion/server/create-instance";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CssBaseline,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import React from "react";
import { renderToString } from "react-dom/server";

import {
  createActivityModelReview,
  createUiGenerationHandoff,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "examples/model-ui/refund-system-map");
const ARTIFACTS_DIR = path.join(OUTPUT_DIR, "artifacts");
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, "screenshots");
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
    title: "Deterministic renderer with Material UI adapter",
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
        "Rendered from the same reviewed JudgmentKit handoff with the Material UI adapter applied.",
    },
  },
  {
    id: "gemma4-without-design-system",
    model_label: "Gemma 4 (local LLM)",
    title: "Gemma 4 local LLM capture",
    generation_source: "captured_model_output",
    design_system_mode: "without_design_system",
    capture_file: "captures/gemma4-without-design-system.json",
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
    title: "Gemma 4 local LLM capture with Material UI adapter",
    generation_source: "captured_model_output",
    design_system_mode: "with_design_system",
    capture_file: "captures/gemma4-with-design-system.json",
    capture_provenance: {
      status: "capture-required",
      capture_type: "model-output-slot",
      captured_at: null,
      intended_provider: "ollama",
      intended_model: "gemma4:e2b",
      model_label: "Gemma 4 (local LLM)",
      notes:
        "No real Gemma 4 capture transcript is committed yet. Apply the Material UI adapter only after a real output is captured.",
    },
  },
  {
    id: "gpt55-without-design-system",
    model_label: "GPT-5.5",
    title: "GPT-5.5 capture",
    generation_source: "captured_model_output",
    design_system_mode: "without_design_system",
    capture_file: "captures/gpt55-without-design-system.json",
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
    title: "GPT-5.5 capture with Material UI adapter",
    generation_source: "captured_model_output",
    design_system_mode: "with_design_system",
    capture_file: "captures/gpt55-with-design-system.json",
    capture_provenance: {
      status: "capture-required",
      capture_type: "model-output-slot",
      captured_at: null,
      intended_provider: "openai-responses",
      intended_model: "gpt-5.5",
      model_label: "GPT-5.5",
      notes:
        "No real GPT-5.5 capture transcript is committed yet. Apply the Material UI adapter only after a real output is captured.",
    },
  },
];

const DESIGN_SYSTEM_ADAPTER = {
  id: "material-ui-refund-ops-adapter",
  name: "Material UI Refund Ops Review Adapter",
  scope: "example-only",
  role: "visual layer after JudgmentKit handoff",
  design_system_name: "Material UI",
  design_system_package: "@mui/material",
  render_mode: "static-ssr",
  renderer: "React server rendering with Emotion critical CSS inlined into the artifact.",
  theme: {
    palette: {
      primary: "#245f73",
      success: "#2e6b48",
      warning: "#8a5a16",
      background: "#f5f3ed",
    },
    density: "operational",
    shape: {
      border_radius: 8,
    },
  },
  components: [
    "ThemeProvider",
    "CssBaseline",
    "AppBar",
    "Toolbar",
    "Paper",
    "Stack",
    "List",
    "ListItemButton",
    "ListItemText",
    "Chip",
    "Button",
    "Card",
    "CardContent",
    "Typography",
    "Alert",
  ],
  constraint:
    "Material UI changes the visual/component layer only; it does not change the activity, decision, evidence, or handoff.",
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

function screenshotPath(output) {
  return `screenshots/${output.id}.png`;
}

function adapterLabel(output) {
  return output.design_system_mode === "with_design_system"
    ? "With Material UI adapter"
    : "Without design system";
}

function approachTitle(output) {
  const suffix = output.design_system_mode === "with_design_system"
    ? "with Material UI adapter"
    : "without design system";

  if (output.generation_source === "deterministic") {
    return `Deterministic renderer · ${suffix}`;
  }

  if (output.model_label === "Gemma 4 (local LLM)") {
    return `Gemma 4 via LM Studio lms · ${suffix}`;
  }

  return `GPT-5.5 via codex exec · ${suffix}`;
}

function approachCaption(output) {
  const withDesignSystem = output.design_system_mode === "with_design_system";

  if (output.generation_source === "deterministic") {
    return withDesignSystem
      ? "The visible snapshot is rendered from the reviewed JudgmentKit handoff through a build-time Material UI adapter."
      : "The visible snapshot is rendered from the reviewed JudgmentKit handoff with simple HTML primitives and no provider or model call.";
  }

  if (output.model_label === "Gemma 4 (local LLM)") {
    return withDesignSystem
      ? "A local Gemma 4 transcript captured through LM Studio lms with Material UI context is committed as provenance; the visible snapshot is rendered from the reviewed handoff through the Material UI adapter."
      : "A local Gemma 4 transcript captured through LM Studio lms is committed as provenance; the visible snapshot is rendered from the reviewed handoff with simple UI primitives.";
  }

  return withDesignSystem
    ? "A GPT-5.5 transcript captured through codex exec with Material UI context is committed as provenance; the visible snapshot is rendered from the reviewed handoff through the Material UI adapter."
    : "A GPT-5.5 transcript captured through codex exec is committed as provenance; the visible snapshot is rendered from the reviewed handoff with simple UI primitives.";
}

function visibleRenderSource(output) {
  return output.design_system_mode === "with_design_system"
    ? "reviewed_handoff_material_ui_adapter"
    : "reviewed_handoff_simple_renderer";
}

function renderingPolicy(output) {
  const withDesignSystem = output.design_system_mode === "with_design_system";

  if (output.generation_source === "captured_model_output") {
    return withDesignSystem
      ? "The raw model transcript is committed as provenance after capture with Material UI adapter context; the visible UI is rendered from the reviewed JudgmentKit handoff through the Material UI adapter."
      : "The raw model transcript is committed as provenance; the visible UI is rendered from the reviewed JudgmentKit handoff with simple UI primitives.";
  }

  return withDesignSystem
    ? "The visible UI is rendered directly from the reviewed JudgmentKit handoff through the Material UI adapter; no provider or model call is used."
    : "The visible UI is rendered directly from the reviewed JudgmentKit handoff with simple UI primitives; no provider or model call is used.";
}

function designSystemName(output) {
  return output.design_system_mode === "with_design_system"
    ? DESIGN_SYSTEM_ADAPTER.design_system_name
    : null;
}

function designSystemPackage(output) {
  return output.design_system_mode === "with_design_system"
    ? DESIGN_SYSTEM_ADAPTER.design_system_package
    : null;
}

function stripUnsafeModelHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
}

async function readCapture(output) {
  if (!output.capture_file) return null;

  try {
    const capturePath = path.join(OUTPUT_DIR, output.capture_file);
    const capture = JSON.parse(await fs.readFile(capturePath, "utf8"));

    if (capture.artifact_id !== output.id) {
      throw new Error(`Capture artifact mismatch: ${capture.artifact_id} != ${output.id}`);
    }
    if (capture.design_system_mode !== output.design_system_mode) {
      throw new Error(
        `Capture design-system mode mismatch for ${output.id}: ${capture.design_system_mode}`,
      );
    }
    if (!capture.parsed?.html) {
      throw new Error(`Capture ${output.id} does not include parsed.html`);
    }

    return {
      ...capture,
      parsed: {
        ...capture.parsed,
        html: stripUnsafeModelHtml(capture.parsed.html),
      },
    };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function captureProvenance(output, capture, sourceContextHash) {
  if (!capture) return output.capture_provenance;

  return {
    status: "captured",
    capture_type: "model-output-transcript",
    captured_at: capture.captured_at,
    runner: capture.runner,
    provider: capture.provider,
    model: capture.model,
    cli: capture.cli,
    transcript_file: output.capture_file,
    prompt_sha256: capture.prompt_sha256,
    raw_response_sha256: capture.raw_response_sha256,
    source_context_sha256: sourceContextHash,
    design_system_name: capture.design_system_name ?? null,
    design_system_package: capture.design_system_package ?? null,
    design_system_render_mode: capture.design_system_render_mode ?? null,
    notes: capture.notes,
  };
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

const MATERIAL_UI_THEME = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#245f73",
      dark: "#174352",
    },
    success: {
      main: "#2e6b48",
    },
    warning: {
      main: "#8a5a16",
    },
    background: {
      default: "#f5f3ed",
      paper: "#ffffff",
    },
    text: {
      primary: "#17231f",
      secondary: "#65726d",
    },
    divider: "#d9d3c7",
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h3: {
      fontWeight: 850,
      letterSpacing: 0,
    },
    h5: {
      fontWeight: 820,
      letterSpacing: 0,
    },
    h6: {
      fontWeight: 820,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 820,
      letterSpacing: 0,
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 800,
        },
      },
    },
  },
});

const h = React.createElement;

function renderSimplePrimarySurface(output) {
  const withDesignSystem = output.design_system_mode === "with_design_system";
  const needsCapture = output.capture_provenance.status !== "captured";
  const captureBanner = needsCapture
    ? `
      <p class="capture-warning">Capture required before this slot can be described as ${escapeHtml(output.model_label)} generated UI.</p>`
    : "";
  const renderLabel = output.generation_source === "captured_model_output"
    ? "Transcript-backed"
    : withDesignSystem
      ? "Adapter applied"
      : "Simple primitives";

  return `
    <main class="app-shell${withDesignSystem ? " design-system" : ""}" data-primary-surface>
      <header class="app-header">
        <div>
          <p class="eyebrow">${escapeHtml(output.model_label)}</p>
          <h1>Refund Review Workspace</h1>
        </div>
        <span class="status">${escapeHtml(renderLabel)}</span>
      </header>${captureBanner}
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

function renderLabelFor(output) {
  if (output.generation_source === "captured_model_output") return "Transcript-backed";
  if (output.design_system_mode === "with_design_system") return "Material UI adapter";
  return "Simple primitives";
}

function SectionHeading({ eyebrow, title, level = "h3" }) {
  return h(
    "div",
    { className: "section-heading" },
    h(Typography, { className: "eyebrow", component: "p", variant: "caption" }, eyebrow),
    h(Typography, { component: level, variant: level === "h2" ? "h6" : "subtitle1" }, title),
  );
}

function MaterialRefundWorkspace({ output }) {
  const needsCapture = output.capture_provenance.status !== "captured";

  return h(
    "main",
    { className: "app-shell design-system", "data-primary-surface": "" },
    h(
      "header",
      { className: "app-header" },
      h(
        AppBar,
        {
          position: "static",
          color: "transparent",
          elevation: 0,
          sx: {
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          },
        },
        h(
          Toolbar,
          {
            sx: {
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              py: 1,
            },
          },
          h(
            Box,
            null,
            h(Typography, { className: "eyebrow", component: "p", variant: "caption" }, output.model_label),
            h(Typography, { component: "h1", variant: "h3" }, "Refund Review Workspace"),
          ),
          h(Chip, { className: "status", color: "primary", label: renderLabelFor(output), variant: "outlined" }),
        ),
      ),
    ),
    needsCapture
      ? h(Alert, { className: "capture-warning", severity: "warning" }, `Capture required before this slot can be described as ${output.model_label} generated UI.`)
      : null,
    h(
      "section",
      { className: "workspace" },
      h(
        "aside",
        { className: "queue", "aria-label": "Refund queue" },
        h(
          Paper,
          { variant: "outlined", sx: { p: 2 } },
          h(SectionHeading, { eyebrow: "Queue", title: "Refund escalations", level: "h2" }),
          h(
            List,
            { component: "div", disablePadding: true, sx: { display: "grid", gap: 1 } },
            QUEUE.map((item) =>
              h(
                ListItemButton,
                {
                  className: `queue-item${item.id === SELECTED_CASE.id ? " is-selected" : ""}`,
                  component: "button",
                  key: item.id,
                  selected: item.id === SELECTED_CASE.id,
                  sx: {
                    alignItems: "flex-start",
                    border: 1,
                    borderColor: item.id === SELECTED_CASE.id ? "primary.main" : "divider",
                    borderRadius: 1,
                    display: "grid",
                    gap: 0.25,
                    textAlign: "left",
                  },
                  type: "button",
                },
                h(ListItemText, {
                  primary: `${item.id} · ${item.customer}`,
                  secondary: `${item.state} · ${item.amount}`,
                  slotProps: { primary: { sx: { fontWeight: 850 } } },
                }),
              ),
            ),
          ),
        ),
      ),
      h(
        "section",
        { className: "detail" },
        h(
          Paper,
          { variant: "outlined", sx: { p: 2 } },
          h(
            Stack,
            { spacing: 2 },
            h(
              "div",
              { className: "case-header" },
              h(
                Box,
                null,
                h(Typography, { className: "eyebrow", component: "p", variant: "caption" }, "Selected request"),
                h(Typography, { component: "h2", variant: "h5" }, `${SELECTED_CASE.id} · ${SELECTED_CASE.customer}`),
                h(Typography, { color: "text.secondary" }, SELECTED_CASE.request),
              ),
              h(Chip, { color: "primary", label: SELECTED_CASE.amount, variant: "outlined" }),
            ),
            h(
              "div",
              { className: "info-grid" },
              h(Card, { variant: "outlined" }, h(CardContent, null, h(Typography, { color: "text.secondary", variant: "body2" }, "Plan"), h(Typography, { sx: { fontWeight: 850 } }, SELECTED_CASE.plan))),
              h(Card, { variant: "outlined" }, h(CardContent, null, h(Typography, { color: "text.secondary", variant: "body2" }, "Review state"), h(Typography, { sx: { fontWeight: 850 } }, SELECTED_CASE.status))),
            ),
            h(
              "section",
              null,
              h(SectionHeading, { eyebrow: "Evidence", title: "Checklist" }),
              h(
                "ul",
                { className: "evidence-list" },
                SELECTED_CASE.evidence.map((item, index) =>
                  h(
                    "li",
                    { key: item },
                    h("span", { className: "check" }, index === 2 ? "!" : "OK"),
                    h(ListItemText, { primary: item, slotProps: { primary: { variant: "body2" } } }),
                  ),
                ),
              ),
            ),
            h(Divider, null),
            h(
              "section",
              { className: "policy" },
              h(SectionHeading, { eyebrow: "Policy context", title: "Exception window" }),
              h(Typography, { color: "text.secondary" }, SELECTED_CASE.policy),
            ),
            h(
              "section",
              null,
              h(SectionHeading, { eyebrow: "Decision path", title: "Choose next action" }),
              h(
                "div",
                { className: "actions" },
                h(Button, { type: "button", variant: "outlined" }, "Approve refund"),
                h(Button, { type: "button", variant: "outlined" }, "Send to policy review"),
                h(Button, { className: "primary", color: "primary", type: "button", variant: "contained" }, "Return for evidence"),
              ),
            ),
            h(
              "section",
              { className: "handoff" },
              h(
                Box,
                null,
                h(Typography, { className: "eyebrow", component: "p", variant: "caption" }, "Handoff"),
                h(Typography, { component: "h3", variant: "h6" }, "Support agent"),
                h(Typography, { color: "text.secondary" }, "Receipt photo is missing. Ask the customer to attach proof before approval."),
              ),
              h(Button, { className: "primary", color: "primary", type: "button", variant: "contained" }, "Send handoff"),
            ),
          ),
        ),
      ),
    ),
  );
}

function renderMaterialUiPrimarySurface(output) {
  const cache = createCache({ key: "mui" });
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);
  const app = h(
    CacheProvider,
    { value: cache },
    h(
      ThemeProvider,
      { theme: MATERIAL_UI_THEME },
      h(CssBaseline, null),
      h(MaterialRefundWorkspace, { output }),
    ),
  );
  const html = renderToString(app);
  const styleTags = constructStyleTagsFromChunks(extractCriticalToChunks(html));

  return { html, styleTags };
}

function renderArtifactSurface(output) {
  if (output.design_system_mode === "with_design_system") {
    return renderMaterialUiPrimarySurface(output);
  }

  return {
    html: renderSimplePrimarySurface(output),
    styleTags: "",
  };
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
  const renderingPolicy = manifestEntry.rendering_policy;
  const surface = renderArtifactSurface(output);
  const styleTags = surface.styleTags ? `    ${surface.styleTags}\n` : "";
  const provenance = {
    matrix_id: MATRIX_ID,
    artifact_id: output.id,
    model_label: output.model_label,
    generation_source: output.generation_source,
    visible_render_source: manifestEntry.visible_render_source,
    rendering_policy: renderingPolicy,
    design_system_mode: output.design_system_mode,
    design_system_name: manifestEntry.design_system_name,
    design_system_package: manifestEntry.design_system_package,
    source_brief_file: SOURCE_BRIEF_FILE,
    handoff_source: HANDOFF_FILE,
    design_system_adapter_file:
      output.design_system_mode === "with_design_system" ? DESIGN_SYSTEM_FILE : null,
    capture_file: output.capture_file ?? null,
    model_response_summary: output.capture?.parsed?.summary ?? null,
    capture_provenance: output.capture_provenance,
    artifact_path: manifestEntry.artifact_path,
    screenshot_path: manifestEntry.screenshot_path,
    approach_title: manifestEntry.approach_title,
    approach_caption: manifestEntry.approach_caption,
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(output.title)}</title>
    <style>${artifactCss()}</style>
${styleTags}
  </head>
  <body data-artifact-id="${escapeHtml(output.id)}" data-design-system-mode="${escapeHtml(output.design_system_mode)}">
    ${surface.html}
    <aside class="provenance" aria-label="Artifact provenance">
      <strong>Provenance:</strong>
      <span>${escapeHtml(output.capture_provenance.status)}</span>
      <span> · ${escapeHtml(output.generation_source)}</span>
      <span> · ${escapeHtml(output.design_system_mode)}</span>
      <p>This static snapshot is part of the JudgmentKit system-map examples. Build-time site generation copies this file and does not call a model.</p>
      <p>${escapeHtml(renderingPolicy)}</p>
      <p>Manifest entry: <code>${escapeHtml(manifestEntry.artifact_path)}</code></p>
    </aside>
    <script type="application/json" id="model-ui-provenance">${jsonForScript(provenance)}</script>
  </body>
</html>
`;
}

function renderGalleryCard(artifact, index) {
  return `
        <article class="gallery-card">
          <a class="thumbnail-link" href="${escapeHtml(artifact.artifact_path)}" data-carousel-open="${index}" aria-label="Open larger view for ${escapeHtml(artifact.approach_title)}">
            <img src="${escapeHtml(artifact.screenshot_path)}" alt="${escapeHtml(artifact.approach_title)} screenshot" loading="${index < 2 ? "eager" : "lazy"}">
          </a>
          <div class="gallery-card-copy">
            <p class="eyebrow">${escapeHtml(artifact.model_label)}</p>
            <h2>${escapeHtml(artifact.approach_title)}</h2>
            <p>${escapeHtml(artifact.approach_caption)}</p>
            <dl>
              <div><dt>Adapter</dt><dd>${escapeHtml(adapterLabel(artifact))}</dd></div>
              <div><dt>Provenance</dt><dd>${escapeHtml(artifact.capture_provenance.status)}</dd></div>
            </dl>
            <div class="card-actions">
              <a href="${escapeHtml(artifact.artifact_path)}">Open live artifact</a>
              <a href="${escapeHtml(artifact.screenshot_path)}">Open image</a>
            </div>
          </div>
        </article>`;
}

function renderDetailsRow(artifact) {
  const captureLabel = artifact.capture_file
    ? `Transcript: ${artifact.capture_file}`
    : "Rendered deterministically from the reviewed handoff.";

  return `
        <article class="details-row">
          <div>
            <p class="eyebrow">${escapeHtml(artifact.model_label)}</p>
            <h3>${escapeHtml(adapterLabel(artifact))}</h3>
          </div>
          <p>${escapeHtml(captureLabel)}</p>
          <a href="${escapeHtml(artifact.artifact_path)}">Artifact</a>
        </article>`;
}

function renderMatrixIndex(manifest) {
  const captureRequiredCount = manifest.artifacts.filter(
    (artifact) => artifact.capture_provenance.status !== "captured",
  ).length;
  const captureNote = captureRequiredCount
    ? `Entries marked <strong>capture-required</strong> are wired as truthful provenance slots until real Gemma 4 and GPT-5.5 run transcripts are captured and committed.`
    : `Model entries include committed capture transcripts. Material UI entries were captured with Material UI adapter context; visible artifacts are rendered from the reviewed handoff, and the site build does not call live providers.`;
  const galleryItems = manifest.artifacts.map((artifact) => ({
    id: artifact.id,
    title: artifact.approach_title,
    caption: artifact.approach_caption,
    model_label: artifact.model_label,
    adapter_label: adapterLabel(artifact),
    provenance: artifact.capture_provenance.status,
    rendering_policy: artifact.rendering_policy,
    image: artifact.screenshot_path,
    artifact: artifact.artifact_path,
  }));
  const galleryCards = manifest.artifacts.map(renderGalleryCard).join("");
  const detailsRows = manifest.artifacts.map(renderDetailsRow).join("");

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
      .gallery-card,
      .details-row {
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
      a {
        color: var(--accent);
        font-weight: 800;
      }
      .gallery-intro {
        display: flex;
        gap: 16px;
        align-items: end;
        justify-content: space-between;
        margin: 34px 0 14px;
      }
      .gallery-intro h2 {
        margin: 0 0 6px;
        font-size: 24px;
        letter-spacing: 0;
      }
      .gallery-intro p {
        margin: 0;
      }
      .gallery {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .gallery-card {
        display: grid;
        overflow: hidden;
      }
      .thumbnail-link {
        display: block;
        position: relative;
        aspect-ratio: 16 / 10;
        overflow: hidden;
        border-bottom: 1px solid var(--line);
        background: #edf3f4;
      }
      .thumbnail-link img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top left;
        display: block;
      }
      .thumbnail-link:focus-visible {
        outline: 3px solid var(--accent);
        outline-offset: -3px;
      }
      .gallery-card-copy {
        display: grid;
        gap: 10px;
        padding: 16px;
      }
      .gallery-card-copy h2 {
        margin: 0;
        font-size: 19px;
        letter-spacing: 0;
      }
      .gallery-card-copy p {
        margin: 0;
      }
      dl {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 0;
      }
      dl div {
        padding: 9px 10px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #faf9f5;
      }
      dt {
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }
      dd {
        margin: 2px 0 0;
        font-weight: 800;
      }
      .card-actions,
      .carousel-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .note {
        margin-top: 18px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fff8ea;
      }
      .details {
        margin-top: 20px;
      }
      .details summary {
        cursor: pointer;
        font-weight: 900;
      }
      .details-grid {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }
      .details-row {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(0, 2fr) auto;
        gap: 12px;
        align-items: center;
        padding: 12px;
      }
      .details-row h3,
      .details-row p {
        margin: 0;
      }
      .carousel {
        position: fixed;
        inset: 0;
        z-index: 20;
        display: grid;
        place-items: center;
        padding: 18px;
      }
      .carousel[hidden] {
        display: none;
      }
      .carousel-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(23, 35, 31, 0.72);
      }
      .carousel-panel {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.7fr);
        width: min(1180px, 100%);
        max-height: min(860px, calc(100vh - 36px));
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
      }
      .carousel-image {
        min-height: 0;
        overflow: auto;
        background: #edf3f4;
      }
      .carousel-image img {
        display: block;
        width: 100%;
        height: auto;
      }
      .carousel-copy {
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 16px;
        min-height: 0;
        padding: 18px;
      }
      .carousel-copy h2 {
        margin: 0 0 8px;
        font-size: 24px;
        letter-spacing: 0;
      }
      .carousel-copy p {
        margin: 0;
      }
      .carousel-meta {
        display: grid;
        gap: 8px;
      }
      .carousel-controls {
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
      }
      .carousel-buttons {
        display: flex;
        gap: 8px;
      }
      .carousel button {
        min-height: 38px;
        padding: 8px 11px;
        border: 1px solid var(--line);
        border-radius: 6px;
        background: #ffffff;
        color: var(--ink);
        cursor: pointer;
        font: inherit;
        font-weight: 900;
      }
      .carousel .carousel-backdrop {
        min-height: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: rgba(23, 35, 31, 0.72);
      }
      .carousel-close {
        justify-self: end;
      }
      html.carousel-open,
      html.carousel-open body {
        overflow: hidden;
      }
      @media (max-width: 760px) {
        main {
          padding: 20px;
        }
        .summary {
          grid-template-columns: 1fr;
        }
        .gallery-intro {
          display: grid;
          align-items: start;
        }
        .gallery,
        .carousel-panel {
          grid-template-columns: 1fr;
        }
        .carousel-panel {
          max-height: calc(100vh - 24px);
        }
        .details-row {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">System-map example pack</p>
      <h1>Model UI generation matrix</h1>
      <p>One refund-triage handoff moves through the system-map branches: deterministic generation, committed model transcripts, and the Material UI adapter. The visible artifacts are rendered from the reviewed handoff; the site build copies these static files and does not call a provider.</p>
      <div class="summary" aria-label="Matrix summary">
        <div><span>Source brief</span><strong>${escapeHtml(manifest.source_brief_file)}</strong></div>
        <div><span>Reviewed handoff</span><strong>${escapeHtml(manifest.reviewed_handoff_file)}</strong></div>
        <div><span>Artifacts</span><strong>${manifest.artifacts.length} snapshots</strong></div>
      </div>
      <div class="gallery-intro">
        <div>
          <h2>Thumbnail gallery</h2>
          <p>Each screenshot shows the first desktop viewport of a committed, adapter-rendered artifact. Select a thumbnail for a larger carousel view.</p>
        </div>
        <a href="${escapeHtml(manifest.artifacts[0].artifact_path)}">Open first live artifact</a>
      </div>
      <section class="gallery" aria-label="Model UI screenshot gallery">
${galleryCards}
      </section>
      <p class="note">${captureNote}</p>
      <details class="details">
        <summary>Provenance details</summary>
        <div class="details-grid">
${detailsRows}
        </div>
      </details>
      <section class="carousel" data-carousel hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="carousel-title">
        <button class="carousel-backdrop" type="button" data-carousel-close aria-label="Close larger screenshot view"></button>
        <div class="carousel-panel">
          <div class="carousel-image">
            <img data-carousel-image src="" alt="">
          </div>
          <aside class="carousel-copy">
            <button class="carousel-close" type="button" data-carousel-close>Close</button>
            <div class="carousel-meta">
              <p class="eyebrow" data-carousel-kicker></p>
              <h2 id="carousel-title" data-carousel-title></h2>
              <p data-carousel-caption></p>
              <dl>
                <div><dt>Adapter</dt><dd data-carousel-adapter></dd></div>
                <div><dt>Provenance</dt><dd data-carousel-provenance></dd></div>
              </dl>
              <div class="carousel-actions">
                <a data-carousel-artifact href="">Open live artifact</a>
                <a data-carousel-source href="">Open image</a>
              </div>
            </div>
            <div class="carousel-controls">
              <span data-carousel-count></span>
              <div class="carousel-buttons">
                <button type="button" data-carousel-prev>Previous</button>
                <button type="button" data-carousel-next>Next</button>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
    <script type="application/json" id="model-ui-gallery-data">${jsonForScript(galleryItems)}</script>
    <script type="application/json" id="model-ui-manifest">${jsonForScript(manifest)}</script>
    <script>
      (() => {
        const data = document.getElementById("model-ui-gallery-data");
        const carousel = document.querySelector("[data-carousel]");
        if (!data || !carousel) return;

        const items = JSON.parse(data.textContent);
        const image = carousel.querySelector("[data-carousel-image]");
        const kicker = carousel.querySelector("[data-carousel-kicker]");
        const title = carousel.querySelector("[data-carousel-title]");
        const caption = carousel.querySelector("[data-carousel-caption]");
        const adapter = carousel.querySelector("[data-carousel-adapter]");
        const provenance = carousel.querySelector("[data-carousel-provenance]");
        const artifact = carousel.querySelector("[data-carousel-artifact]");
        const source = carousel.querySelector("[data-carousel-source]");
        const count = carousel.querySelector("[data-carousel-count]");
        const closeButton = carousel.querySelector("[data-carousel-close]:not(.carousel-backdrop)");
        let activeIndex = 0;
        let lastFocus = null;

        function render(index) {
          activeIndex = (index + items.length) % items.length;
          const item = items[activeIndex];
          image.src = item.image;
          image.alt = item.title + " screenshot";
          kicker.textContent = item.model_label;
          title.textContent = item.title;
          caption.textContent = item.caption;
          adapter.textContent = item.adapter_label;
          provenance.textContent = item.provenance;
          artifact.href = item.artifact;
          source.href = item.image;
          count.textContent = String(activeIndex + 1) + " / " + String(items.length);
        }

        function open(index) {
          lastFocus = document.activeElement;
          render(index);
          carousel.hidden = false;
          carousel.setAttribute("aria-hidden", "false");
          document.documentElement.classList.add("carousel-open");
          closeButton.focus();
        }

        function close() {
          carousel.hidden = true;
          carousel.setAttribute("aria-hidden", "true");
          document.documentElement.classList.remove("carousel-open");
          if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
        }

        document.querySelectorAll("[data-carousel-open]").forEach((link) => {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            open(Number(link.getAttribute("data-carousel-open") || "0"));
          });
        });

        carousel.querySelectorAll("[data-carousel-close]").forEach((button) => {
          button.addEventListener("click", close);
        });
        carousel.querySelector("[data-carousel-prev]").addEventListener("click", () => render(activeIndex - 1));
        carousel.querySelector("[data-carousel-next]").addEventListener("click", () => render(activeIndex + 1));
        document.addEventListener("keydown", (event) => {
          if (carousel.hidden) return;
          if (event.key === "Escape") close();
          if (event.key === "ArrowLeft") render(activeIndex - 1);
          if (event.key === "ArrowRight") render(activeIndex + 1);
        });
      })();
    </script>
  </body>
</html>
`;
}

async function main() {
  const brief = await readSourceBrief();
  const reviewedHandoff = buildReviewedHandoff(brief);
  const sourceContextHash = hash(
    [
      brief,
      JSON.stringify(reviewedHandoff, null, 2),
      JSON.stringify(DESIGN_SYSTEM_ADAPTER, null, 2),
    ].join("\n"),
  );

  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  const artifacts = await Promise.all(
    OUTPUTS.map(async (output) => {
      const capture = await readCapture(output);
      const currentCapture =
        capture?.source_context_sha256 === sourceContextHash ? capture : null;
      return {
        ...output,
        capture: currentCapture,
        capture_provenance: captureProvenance(output, currentCapture, sourceContextHash),
        source_brief_file: SOURCE_BRIEF_FILE,
        reviewed_handoff_file: HANDOFF_FILE,
        design_system_adapter_file:
          output.design_system_mode === "with_design_system" ? DESIGN_SYSTEM_FILE : null,
        design_system_name: designSystemName(output),
        design_system_package: designSystemPackage(output),
        handoff_source: HANDOFF_FILE,
        prompt_sha256: currentCapture?.prompt_sha256 ?? sourceContextHash,
        source_context_sha256: sourceContextHash,
        artifact_path: artifactPath(output),
        screenshot_path: screenshotPath(output),
        visible_render_source: visibleRenderSource(output),
        rendering_policy: renderingPolicy(output),
        approach_title: approachTitle(output),
        approach_caption: approachCaption(output),
      };
    }),
  );

  const manifestArtifacts = artifacts.map(({ capture, ...artifact }) => artifact);

  const manifest = {
    matrix_id: MATRIX_ID,
    title: "Model UI generation matrix",
    source_brief_file: SOURCE_BRIEF_FILE,
    reviewed_handoff_file: HANDOFF_FILE,
    design_system_adapter_file: DESIGN_SYSTEM_FILE,
    design_system_name: DESIGN_SYSTEM_ADAPTER.design_system_name,
    design_system_package: DESIGN_SYSTEM_ADAPTER.design_system_package,
    design_system_render_mode: DESIGN_SYSTEM_ADAPTER.render_mode,
    generation_policy:
      "Static captured-fixture pack. Website builds copy committed artifacts and never call a live model. Model transcripts are provenance; Material UI entries are captured with Material UI adapter context, and visible artifacts are rendered from the reviewed handoff through the selected renderer.",
    system_map_branches: [
      "JudgmentKit reviewed handoff",
      "LLM / agent UI pass",
      "with Material UI adapter",
      "without design system",
    ],
    model_labels: ["Deterministic renderer", "Gemma 4 (local LLM)", "GPT-5.5"],
    artifacts: manifestArtifacts,
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
    const manifestEntry = manifestArtifacts.find((entry) => entry.id === artifact.id);
    const html = renderArtifact(artifact, manifestEntry);
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
