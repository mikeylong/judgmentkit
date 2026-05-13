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
const DESIGN_SYSTEM_FILE = "examples/model-ui/refund-system-map/design-system-adapter.json";
const MATRIX_ID = "refund-system-map-model-ui-v2";

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

const COMPARISON_ROWS = [
  {
    id: "deterministic",
    label: "Deterministic",
    model_label: "Deterministic renderer",
    generation_source: "deterministic",
    provider: "none",
    model: "none",
    cli: null,
    reasoning_effort: null,
    summary:
      "Scripted renderer paths show the controlled baseline for each context combination.",
  },
  {
    id: "gemma4-lms",
    label: "Gemma 4 via LM Studio lms",
    model_label: "Gemma 4 (local LLM)",
    generation_source: "captured_model_output",
    provider: "lmstudio",
    model: "google/gemma-4-e2b",
    cli: "lms",
    reasoning_effort: null,
    summary:
      "Local Gemma 4 captures show how a smaller local model responds to the same four context boundaries.",
  },
  {
    id: "gpt55-xhigh-codex",
    label: "GPT-5.5 xhigh via codex exec",
    model_label: "GPT-5.5",
    generation_source: "captured_model_output",
    provider: "codex-cli",
    model: "gpt-5.5",
    cli: "codex",
    reasoning_effort: "xhigh",
    summary:
      "GPT-5.5 captures use extra-high reasoning to show the same matrix with a stronger model path.",
  },
];

const COMPARISON_COLUMNS = [
  {
    id: "no-judgmentkit",
    label: "Raw brief",
    short_label: "No JudgmentKit",
    judgmentkit_mode: "no_judgmentkit",
    design_system_mode: "none",
    render_mode: "html",
    summary:
      "Raw source brief and sample case only. No reviewed handoff and no Material UI.",
  },
  {
    id: "with-judgmentkit",
    label: "JudgmentKit handoff",
    short_label: "With JudgmentKit",
    judgmentkit_mode: "with_judgmentkit",
    design_system_mode: "none",
    render_mode: "html",
    summary:
      "Reviewed JudgmentKit handoff and sample case. No Material UI adapter.",
  },
  {
    id: "material-ui-only",
    label: "Material UI only",
    short_label: "Design system",
    judgmentkit_mode: "no_judgmentkit",
    design_system_mode: "material_ui",
    render_mode: "material_ui",
    summary:
      "Raw source brief plus Material UI adapter. No reviewed JudgmentKit handoff.",
  },
  {
    id: "judgmentkit-material-ui",
    label: "JudgmentKit + Material UI",
    short_label: "JudgmentKit + design system",
    judgmentkit_mode: "with_judgmentkit",
    design_system_mode: "material_ui",
    render_mode: "material_ui",
    summary:
      "Reviewed JudgmentKit handoff rendered through the Material UI adapter.",
  },
];

const LEGACY_ALIASES = [
  {
    id: "deterministic-without-design-system",
    canonical_id: "deterministic-with-judgmentkit",
    artifact_path: "artifacts/deterministic-without-design-system.html",
    screenshot_path: "screenshots/deterministic-without-design-system.png",
  },
  {
    id: "deterministic-with-design-system",
    canonical_id: "deterministic-judgmentkit-material-ui",
    artifact_path: "artifacts/deterministic-with-design-system.html",
    screenshot_path: "screenshots/deterministic-with-design-system.png",
  },
  {
    id: "gemma4-without-design-system",
    canonical_id: "gemma4-lms-with-judgmentkit",
    artifact_path: "artifacts/gemma4-without-design-system.html",
    screenshot_path: "screenshots/gemma4-without-design-system.png",
    capture_file: "captures/gemma4-without-design-system.json",
  },
  {
    id: "gemma4-with-design-system",
    canonical_id: "gemma4-lms-judgmentkit-material-ui",
    artifact_path: "artifacts/gemma4-with-design-system.html",
    screenshot_path: "screenshots/gemma4-with-design-system.png",
    capture_file: "captures/gemma4-with-design-system.json",
  },
  {
    id: "gpt55-without-design-system",
    canonical_id: "gpt55-xhigh-codex-with-judgmentkit",
    artifact_path: "artifacts/gpt55-without-design-system.html",
    screenshot_path: "screenshots/gpt55-without-design-system.png",
    capture_file: "captures/gpt55-without-design-system.json",
  },
  {
    id: "gpt55-with-design-system",
    canonical_id: "gpt55-xhigh-codex-judgmentkit-material-ui",
    artifact_path: "artifacts/gpt55-with-design-system.html",
    screenshot_path: "screenshots/gpt55-with-design-system.png",
    capture_file: "captures/gpt55-with-design-system.json",
  },
];

const DESIGN_SYSTEM_ADAPTER = {
  id: "material-ui-refund-ops-adapter",
  name: "Material UI Refund Ops Review Adapter",
  scope: "example-only",
  role: "visual renderer after context selection",
  design_system_name: "Material UI",
  design_system_package: "@mui/material",
  render_mode: "static-ssr",
  renderer: "React server rendering with Emotion critical CSS inlined into each artifact.",
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
    "Material UI changes the visual/component layer only; it does not supply activity fit, workflow fit, or disclosure discipline.",
};

const IMPLEMENTATION_TERMS = [
  "database table",
  "JSON schema",
  "prompt template",
  "tool call",
  "resource id",
  "API endpoint",
  "CRUD",
  "refund_case",
];

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

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonForScript(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function kebab(value) {
  return String(value).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function readSourceBrief() {
  return fs.readFile(path.join(ROOT_DIR, SOURCE_BRIEF_FILE), "utf8");
}

function artifactPath(id) {
  return `artifacts/${id}.html`;
}

function screenshotPath(id) {
  return `screenshots/${id}.png`;
}

function captureFile(output) {
  if (output.generation_source !== "captured_model_output") return null;
  return `captures/${output.id}.json`;
}

function buildOutput(row, column) {
  const id = `${row.id}-${column.id}`;
  return {
    ...row,
    ...column,
    id,
    row_id: row.id,
    row_label: row.label,
    column_id: column.id,
    column_label: column.label,
    model_label: row.model_label,
    generation_source: row.generation_source,
    provider: row.provider,
    model: row.model,
    cli: row.cli,
    reasoning_effort: row.reasoning_effort,
    title: `${row.label} - ${column.label}`,
    capture_file: row.generation_source === "captured_model_output" ? `captures/${id}.json` : null,
  };
}

function buildOutputs() {
  return COMPARISON_ROWS.flatMap((row) => COMPARISON_COLUMNS.map((column) => buildOutput(row, column)));
}

function contextIncluded(output) {
  return {
    source_brief: true,
    sample_case: true,
    reviewed_handoff: output.judgmentkit_mode === "with_judgmentkit",
    material_ui_adapter: output.design_system_mode === "material_ui",
  };
}

function buildContextPayload({ output, brief, reviewedHandoff }) {
  const included = contextIncluded(output);
  return {
    matrix_id: MATRIX_ID,
    artifact_id: output.id,
    row_id: output.row_id,
    column_id: output.column_id,
    context_included: included,
    source_brief: brief,
    sample_case: {
      selected_case: SELECTED_CASE,
      queue: QUEUE,
    },
    reviewed_handoff: included.reviewed_handoff ? reviewedHandoff : null,
    material_ui_adapter: included.material_ui_adapter ? DESIGN_SYSTEM_ADAPTER : null,
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
      implementation_terms: IMPLEMENTATION_TERMS,
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

function rawBriefSurfaceData() {
  return {
    eyebrow: "Raw source brief",
    heading: "refund_case Admin Console",
    status: "Implementation-first",
    queue_title: "Database records",
    queue: QUEUE.map((item) => ({
      ...item,
      state: `${item.state} - CRUD row`,
    })),
    selected: {
      id: SELECTED_CASE.id,
      customer: SELECTED_CASE.customer,
      amount: SELECTED_CASE.amount,
      plan: SELECTED_CASE.plan,
      request: SELECTED_CASE.request,
      status: "API endpoint status: pending evidence",
    },
    info: [
      { label: "Data model", value: "refund_case" },
      { label: "Schema", value: "JSON schema + database fields" },
    ],
    evidence: [
      "database table fields mapped to editable controls",
      "prompt template output copied into reviewer notes",
      "tool call results and resource id visible for debugging",
    ],
    policy_title: "Implementation context",
    policy:
      "Show refund_case data model, database fields, JSON schema, prompt template, tool call results, resource id, API endpoint status, and CRUD.",
    decision_title: "CRUD actions",
    actions: ["Update field", "Run tool call", "Save JSON"],
    primary_action: "Save JSON",
    handoff: {
      owner: "API endpoint",
      title: "Implementation handoff",
      reason: "Resource id and prompt template state are ready for the next CRUD operation.",
      action: "Send to endpoint",
    },
  };
}

function reviewedSurfaceData() {
  return {
    eyebrow: "JudgmentKit handoff",
    heading: "Refund Review Workspace",
    status: "Activity-fit",
    queue_title: "Refund escalations",
    queue: QUEUE,
    selected: {
      id: SELECTED_CASE.id,
      customer: SELECTED_CASE.customer,
      amount: SELECTED_CASE.amount,
      plan: SELECTED_CASE.plan,
      request: SELECTED_CASE.request,
      status: SELECTED_CASE.status,
    },
    info: [
      { label: "Plan", value: SELECTED_CASE.plan },
      { label: "Review state", value: SELECTED_CASE.status },
    ],
    evidence: SELECTED_CASE.evidence,
    policy_title: "Exception window",
    policy: SELECTED_CASE.policy,
    decision_title: "Choose next action",
    actions: ["Approve refund", "Send to policy review", "Return for evidence"],
    primary_action: "Return for evidence",
    handoff: {
      owner: "Support agent",
      title: "Handoff",
      reason: "Receipt photo is missing. Ask the customer to attach proof before approval.",
      action: "Send handoff",
    },
  };
}

function defaultSurfaceData(output) {
  return output.judgmentkit_mode === "with_judgmentkit"
    ? reviewedSurfaceData()
    : rawBriefSurfaceData();
}

function normalizeString(value, fallback) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return normalizeString(item.text ?? item.body ?? item.label ?? item.title, "");
      }
      return "";
    })
    .filter(Boolean);
  return normalized.length ? normalized : fallback;
}

function normalizeSurfaceData(value, fallback) {
  const source = value && typeof value === "object" ? value : {};
  const selected = source.selected && typeof source.selected === "object" ? source.selected : {};
  const handoff = source.handoff && typeof source.handoff === "object" ? source.handoff : {};
  const info = Array.isArray(source.info)
    ? source.info
        .map((item) => ({
          label: normalizeString(item?.label, ""),
          value: normalizeString(item?.value, ""),
        }))
        .filter((item) => item.label && item.value)
    : fallback.info;
  const queue = Array.isArray(source.queue)
    ? source.queue
        .map((item, index) => ({
          id: normalizeString(item?.id, fallback.queue[index % fallback.queue.length]?.id ?? "Case"),
          customer: normalizeString(
            item?.customer,
            fallback.queue[index % fallback.queue.length]?.customer ?? "Customer",
          ),
          state: normalizeString(item?.state, fallback.queue[index % fallback.queue.length]?.state ?? "Review"),
          amount: normalizeString(item?.amount, fallback.queue[index % fallback.queue.length]?.amount ?? ""),
        }))
        .slice(0, 4)
    : fallback.queue;

  return {
    eyebrow: normalizeString(source.eyebrow, fallback.eyebrow),
    heading: normalizeString(source.heading ?? source.title, fallback.heading),
    status: normalizeString(source.status, fallback.status),
    queue_title: normalizeString(source.queue_title, fallback.queue_title),
    queue,
    selected: {
      id: normalizeString(selected.id, fallback.selected.id),
      customer: normalizeString(selected.customer, fallback.selected.customer),
      amount: normalizeString(selected.amount, fallback.selected.amount),
      plan: normalizeString(selected.plan, fallback.selected.plan),
      request: normalizeString(selected.request, fallback.selected.request),
      status: normalizeString(selected.status, fallback.selected.status),
    },
    info,
    evidence: normalizeList(source.evidence, fallback.evidence),
    policy_title: normalizeString(source.policy_title, fallback.policy_title),
    policy: normalizeString(source.policy, fallback.policy),
    decision_title: normalizeString(source.decision_title, fallback.decision_title),
    actions: normalizeList(source.actions, fallback.actions).slice(0, 4),
    primary_action: normalizeString(source.primary_action, fallback.primary_action),
    handoff: {
      owner: normalizeString(handoff.owner, fallback.handoff.owner),
      title: normalizeString(handoff.title, fallback.handoff.title),
      reason: normalizeString(handoff.reason, fallback.handoff.reason),
      action: normalizeString(handoff.action, fallback.handoff.action),
    },
  };
}

function stripUnsafeModelHtml(html) {
  return String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
}

function sanitizeModelCss(css) {
  return String(css ?? "")
    .replace(/@import[^;]+;/gi, "")
    .replace(/url\([^)]*\)/gi, "none")
    .replace(/<\/?style[^>]*>/gi, "")
    .trim();
}

function addClassToPrimaryRoot(html, className) {
  const value = stripUnsafeModelHtml(html).trim();
  if (/^<main\b/i.test(value)) {
    const openTag = value.slice(0, value.indexOf(">") + 1);
    if (/\bclass="/i.test(openTag)) {
      return value.replace(/\bclass="([^"]*)"/i, (_match, classes) =>
        `class="${escapeHtml(`${classes} ${className}`.trim())}"`,
      );
    }
    return value.replace(/^<main\b/i, `<main class="${escapeHtml(className)}"`);
  }

  return `<main class="app-shell ${escapeHtml(className)}" data-primary-surface>${value}</main>`;
}

async function readCapture(output, contextHash) {
  if (!output.capture_file) return null;

  try {
    const capturePath = path.join(OUTPUT_DIR, output.capture_file);
    const capture = JSON.parse(await fs.readFile(capturePath, "utf8"));

    if (capture.artifact_id !== output.id) {
      throw new Error(`Capture artifact mismatch: ${capture.artifact_id} != ${output.id}`);
    }
    if (capture.column_id !== output.column_id || capture.row_id !== output.row_id) {
      throw new Error(`Capture matrix coordinate mismatch for ${output.id}`);
    }
    if (capture.source_context_sha256 !== contextHash) return null;

    return {
      ...capture,
      parsed: {
        ...capture.parsed,
        html: capture.parsed?.html ? stripUnsafeModelHtml(capture.parsed.html) : undefined,
        css: capture.parsed?.css ? sanitizeModelCss(capture.parsed.css) : undefined,
      },
    };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function captureProvenance(output, capture) {
  if (output.generation_source !== "captured_model_output") {
    return {
      status: "captured",
      capture_type: "deterministic-renderer",
      captured_at: "2026-05-13",
      runner: "scripts/demo-model-ui-matrix.mjs",
      provider: "none",
      model: "none",
      cli: null,
      reasoning_effort: null,
      notes:
        "Rendered deterministically from the matrix context. No provider or model call is used.",
    };
  }

  if (!capture) {
    return {
      status: "capture-required",
      capture_type: "model-output-slot",
      captured_at: null,
      runner: "scripts/capture-model-ui-matrix.mjs",
      provider: output.provider,
      model: output.model,
      cli: output.cli,
      reasoning_effort: output.reasoning_effort,
      notes:
        "Capture transcript is missing or stale for this matrix cell. Run npm run capture:model-ui.",
    };
  }

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
    source_context_sha256: capture.source_context_sha256,
    reasoning_effort: capture.reasoning_effort ?? null,
    context_included: capture.context_included,
    design_system_name: capture.design_system_name ?? null,
    design_system_package: capture.design_system_package ?? null,
    design_system_render_mode: capture.design_system_render_mode ?? null,
    notes: capture.notes,
  };
}

function columnRenderLabel(output) {
  if (output.judgmentkit_mode === "with_judgmentkit" && output.design_system_mode === "material_ui") {
    return "JudgmentKit + Material UI";
  }
  if (output.judgmentkit_mode === "with_judgmentkit") return "JudgmentKit handoff";
  if (output.design_system_mode === "material_ui") return "Material UI only";
  return "Raw brief";
}

function renderSource(output) {
  if (output.generation_source === "deterministic") {
    if (output.design_system_mode === "material_ui") return "deterministic_material_ui_ssr";
    if (output.judgmentkit_mode === "with_judgmentkit") return "deterministic_judgmentkit_html";
    return "deterministic_raw_brief_html";
  }
  if (output.design_system_mode === "material_ui") return "model_structured_data_material_ui_ssr";
  return "model_static_html_css";
}

function approachTitle(output) {
  return `${output.row_label} - ${columnRenderLabel(output)}`;
}

function approachCaption(output) {
  const row = output.row_label;
  if (output.judgmentkit_mode === "no_judgmentkit" && output.design_system_mode === "none") {
    return `${row} receives only the raw brief and sample case. This tests what happens without JudgmentKit or Material UI.`;
  }
  if (output.judgmentkit_mode === "with_judgmentkit" && output.design_system_mode === "none") {
    return `${row} receives the reviewed JudgmentKit handoff but no design-system adapter. This isolates activity, workflow, and disclosure guidance.`;
  }
  if (output.judgmentkit_mode === "no_judgmentkit" && output.design_system_mode === "material_ui") {
    return `${row} is rendered through Material UI from raw-brief context only. This isolates visual/component consistency without JudgmentKit.`;
  }
  return `${row} receives the reviewed JudgmentKit handoff and is rendered through the Material UI adapter. This is the full intended path.`;
}

function renderingPolicy(output) {
  if (output.judgmentkit_mode === "no_judgmentkit" && output.design_system_mode === "none") {
    return "Visible artifact is generated from raw brief context only; no reviewed JudgmentKit handoff and no Material UI adapter are used.";
  }
  if (output.judgmentkit_mode === "with_judgmentkit" && output.design_system_mode === "none") {
    return "Visible artifact is generated from the reviewed JudgmentKit handoff with no Material UI adapter.";
  }
  if (output.judgmentkit_mode === "no_judgmentkit" && output.design_system_mode === "material_ui") {
    return "Visible artifact is rendered through Material UI using raw brief context only; design-system styling is not a substitute for JudgmentKit review.";
  }
  return "Visible artifact is rendered through Material UI from the reviewed JudgmentKit handoff.";
}

function renderQueue(surface) {
  return surface.queue.map(
    (item) => `
      <button class="queue-item${item.id === SELECTED_CASE.id ? " is-selected" : ""}" type="button">
        <span>${escapeHtml(item.id)}</span>
        <strong>${escapeHtml(item.customer)}</strong>
        <small>${escapeHtml(item.state)}${item.amount ? ` - ${escapeHtml(item.amount)}` : ""}</small>
      </button>`,
  ).join("");
}

function renderEvidence(surface) {
  return surface.evidence
    .map(
      (item, index) => `
        <li>
          <span class="check">${index === surface.evidence.length - 1 ? "!" : "OK"}</span>
          <span>${escapeHtml(item)}</span>
        </li>`,
    )
    .join("");
}

function renderHtmlSurfaceFromData(output, surface) {
  return `
    <main class="app-shell ${output.judgmentkit_mode === "with_judgmentkit" ? "reviewed-candidate" : "raw-brief-candidate"}" data-primary-surface>
      <header class="app-header">
        <div>
          <p class="eyebrow">${escapeHtml(surface.eyebrow)}</p>
          <h1>${escapeHtml(surface.heading)}</h1>
        </div>
        <span class="status">${escapeHtml(surface.status)}</span>
      </header>
      <section class="workspace">
        <aside class="queue" aria-label="${escapeHtml(surface.queue_title)}">
          <div class="section-heading">
            <p class="eyebrow">Queue</p>
            <h2>${escapeHtml(surface.queue_title)}</h2>
          </div>
          ${renderQueue(surface)}
        </aside>
        <section class="detail">
          <div class="case-header">
            <div>
              <p class="eyebrow">Selected request</p>
              <h2>${escapeHtml(surface.selected.id)} - ${escapeHtml(surface.selected.customer)}</h2>
              <p>${escapeHtml(surface.selected.request)}</p>
            </div>
            <strong>${escapeHtml(surface.selected.amount)}</strong>
          </div>
          <div class="info-grid">
            ${surface.info
              .map(
                (item) => `
            <div>
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </div>`,
              )
              .join("")}
          </div>
          <section>
            <div class="section-heading">
              <p class="eyebrow">Evidence</p>
              <h3>Review inputs</h3>
            </div>
            <ul class="evidence-list">${renderEvidence(surface)}</ul>
          </section>
          <section class="policy">
            <div class="section-heading">
              <p class="eyebrow">Context</p>
              <h3>${escapeHtml(surface.policy_title)}</h3>
            </div>
            <p>${escapeHtml(surface.policy)}</p>
          </section>
          <section>
            <div class="section-heading">
              <p class="eyebrow">Decision path</p>
              <h3>${escapeHtml(surface.decision_title)}</h3>
            </div>
            <div class="actions">
              ${surface.actions
                .map(
                  (action) =>
                    `<button type="button" class="${action === surface.primary_action ? "primary" : ""}">${escapeHtml(action)}</button>`,
                )
                .join("")}
            </div>
          </section>
          <section class="handoff">
            <div>
              <p class="eyebrow">Handoff</p>
              <h3>${escapeHtml(surface.handoff.owner)}</h3>
              <p>${escapeHtml(surface.handoff.reason)}</p>
            </div>
            <button type="button" class="primary">${escapeHtml(surface.handoff.action)}</button>
          </section>
        </section>
      </section>
    </main>`;
}

function SectionHeading({ eyebrow, title, level = "h3" }) {
  return h(
    "div",
    { className: "section-heading" },
    h(Typography, { className: "eyebrow", component: "p", variant: "caption" }, eyebrow),
    h(Typography, { component: level, variant: level === "h2" ? "h6" : "subtitle1" }, title),
  );
}

function MaterialRefundWorkspace({ output, surface }) {
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
            h(Typography, { className: "eyebrow", component: "p", variant: "caption" }, surface.eyebrow),
            h(Typography, { component: "h1", variant: "h3" }, surface.heading),
          ),
          h(Chip, { className: "status", color: "primary", label: surface.status, variant: "outlined" }),
        ),
      ),
    ),
    needsCapture
      ? h(Alert, { className: "capture-warning", severity: "warning" }, "Capture transcript is missing or stale for this matrix cell.")
      : null,
    h(
      "section",
      { className: "workspace" },
      h(
        "aside",
        { className: "queue", "aria-label": surface.queue_title },
        h(
          Paper,
          { variant: "outlined", sx: { p: 2 } },
          h(SectionHeading, { eyebrow: "Queue", title: surface.queue_title, level: "h2" }),
          h(
            List,
            { component: "div", disablePadding: true, sx: { display: "grid", gap: 1 } },
            surface.queue.map((item) =>
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
                  primary: `${item.id} - ${item.customer}`,
                  secondary: `${item.state}${item.amount ? ` - ${item.amount}` : ""}`,
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
                h(Typography, { component: "h2", variant: "h5" }, `${surface.selected.id} - ${surface.selected.customer}`),
                h(Typography, { color: "text.secondary" }, surface.selected.request),
              ),
              h(Chip, { color: "primary", label: surface.selected.amount, variant: "outlined" }),
            ),
            h(
              "div",
              { className: "info-grid" },
              surface.info.map((item) =>
                h(Card, { key: item.label, variant: "outlined" }, h(CardContent, null, h(Typography, { color: "text.secondary", variant: "body2" }, item.label), h(Typography, { sx: { fontWeight: 850 } }, item.value))),
              ),
            ),
            h(
              "section",
              null,
              h(SectionHeading, { eyebrow: "Evidence", title: "Review inputs" }),
              h(
                "ul",
                { className: "evidence-list" },
                surface.evidence.map((item, index) =>
                  h(
                    "li",
                    { key: `${item}-${index}` },
                    h("span", { className: "check" }, index === surface.evidence.length - 1 ? "!" : "OK"),
                    h(ListItemText, { primary: item, slotProps: { primary: { variant: "body2" } } }),
                  ),
                ),
              ),
            ),
            h(Divider, null),
            h(
              "section",
              { className: "policy" },
              h(SectionHeading, { eyebrow: "Context", title: surface.policy_title }),
              h(Typography, { color: "text.secondary" }, surface.policy),
            ),
            h(
              "section",
              null,
              h(SectionHeading, { eyebrow: "Decision path", title: surface.decision_title }),
              h(
                "div",
                { className: "actions" },
                surface.actions.map((action) =>
                  h(Button, {
                    className: action === surface.primary_action ? "primary" : "",
                    color: action === surface.primary_action ? "primary" : "inherit",
                    key: action,
                    type: "button",
                    variant: action === surface.primary_action ? "contained" : "outlined",
                  }, action),
                ),
              ),
            ),
            h(
              "section",
              { className: "handoff" },
              h(
                Box,
                null,
                h(Typography, { className: "eyebrow", component: "p", variant: "caption" }, "Handoff"),
                h(Typography, { component: "h3", variant: "h6" }, surface.handoff.owner),
                h(Typography, { color: "text.secondary" }, surface.handoff.reason),
              ),
              h(Button, { className: "primary", color: "primary", type: "button", variant: "contained" }, surface.handoff.action),
            ),
          ),
        ),
      ),
    ),
  );
}

function renderMaterialUiPrimarySurface(output) {
  const fallback = defaultSurfaceData(output);
  const surface = normalizeSurfaceData(output.capture?.parsed?.surface, fallback);
  const cache = createCache({ key: "mui" });
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);
  const app = h(
    CacheProvider,
    { value: cache },
    h(
      ThemeProvider,
      { theme: MATERIAL_UI_THEME },
      h(CssBaseline, null),
      h(MaterialRefundWorkspace, { output, surface }),
    ),
  );
  const html = renderToString(app);
  const styleTags = constructStyleTagsFromChunks(extractCriticalToChunks(html));

  return { html, styleTags, modelCss: "" };
}

function renderModelHtmlSurface(output) {
  if (!output.capture?.parsed?.html) {
    return {
      html: renderHtmlSurfaceFromData(output, defaultSurfaceData(output)),
      styleTags: "",
      modelCss: "",
    };
  }

  return {
    html: addClassToPrimaryRoot(output.capture.parsed.html, "raw-model-candidate"),
    styleTags: "",
    modelCss: output.capture.parsed.css ?? "",
  };
}

function renderArtifactSurface(output) {
  if (output.design_system_mode === "material_ui") {
    return renderMaterialUiPrimarySurface(output);
  }
  if (output.generation_source === "captured_model_output") {
    return renderModelHtmlSurface(output);
  }

  return {
    html: renderHtmlSurfaceFromData(output, defaultSurfaceData(output)),
    styleTags: "",
    modelCss: "",
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
    .raw-model-candidate {
      max-width: 1120px;
      margin: 0 auto;
      background: var(--canvas);
    }
    .raw-model-candidate > section,
    .raw-model-candidate .card,
    .raw-model-candidate .panel {
      margin-top: 14px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    .raw-model-candidate ul {
      margin: 0;
      padding-left: 20px;
    }
    .app-shell .app-header,
    .app-shell .case-header,
    .app-shell .handoff {
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
    .app-shell .status,
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
    .app-shell .workspace {
      display: grid;
      grid-template-columns: minmax(210px, 280px) minmax(0, 1fr);
      gap: 18px;
      margin-top: 24px;
    }
    .app-shell .queue,
    .app-shell .detail,
    .app-shell .detail > section,
    .app-shell .handoff {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    .app-shell .queue,
    .app-shell .detail {
      padding: 16px;
    }
    .app-shell .queue {
      display: grid;
      gap: 10px;
      align-content: start;
    }
    .app-shell .queue-item {
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
    .app-shell .queue-item small {
      color: var(--muted);
    }
    .app-shell .queue-item.is-selected {
      border-color: var(--accent);
      background: #edf6f7;
    }
    .app-shell .detail {
      display: grid;
      gap: 14px;
    }
    .app-shell .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .app-shell .info-grid > div,
    .app-shell .detail > section {
      padding: 14px;
    }
    .app-shell .info-grid > div {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #faf9f5;
    }
    .app-shell .info-grid span {
      display: block;
      margin-bottom: 4px;
      color: var(--muted);
      font-size: 13px;
    }
    .app-shell .evidence-list {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .app-shell .evidence-list li {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 8px;
      align-items: start;
    }
    .app-shell .check {
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
    .app-shell .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .app-shell .actions button,
    .app-shell .handoff button {
      min-height: 40px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #ffffff;
      color: var(--ink);
      cursor: pointer;
      font-weight: 800;
    }
    .app-shell button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #ffffff;
    }
    .app-shell .handoff {
      padding: 14px;
      background: #f3f8f8;
    }
    .raw-brief-candidate .app-header {
      background: #fff8ea;
      border: 1px solid #e5c98f;
      border-radius: 8px;
      padding: 14px;
    }
    .reviewed-candidate .app-header {
      background: #eef6f7;
      border: 1px solid #b8d2d7;
      border-radius: 8px;
      padding: 14px;
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
    @media (max-width: 760px) {
      .app-shell { padding: 16px; }
      .app-shell .app-header,
      .app-shell .case-header,
      .app-shell .handoff {
        display: grid;
      }
      .app-shell .workspace,
      .app-shell .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

function stripLineTrailingWhitespace(value) {
  return String(value).replace(/[ \t]+$/gm, "");
}

function renderArtifact(output, manifestEntry) {
  const surface = renderArtifactSurface(output);
  const styleTags = surface.styleTags ? `    ${surface.styleTags}\n` : "";
  const modelCss = surface.modelCss
    ? `    <style data-model-css>${surface.modelCss}</style>\n`
    : "";
  const provenance = {
    matrix_id: MATRIX_ID,
    artifact_id: output.id,
    row_id: output.row_id,
    column_id: output.column_id,
    model_label: output.model_label,
    generation_source: output.generation_source,
    judgmentkit_mode: output.judgmentkit_mode,
    design_system_mode: output.design_system_mode,
    render_source: manifestEntry.render_source,
    rendering_policy: manifestEntry.rendering_policy,
    reasoning_effort: output.reasoning_effort,
    context_included: manifestEntry.context_included,
    design_system_name: manifestEntry.design_system_name,
    design_system_package: manifestEntry.design_system_package,
    source_brief_file: SOURCE_BRIEF_FILE,
    handoff_source: manifestEntry.context_included.reviewed_handoff ? HANDOFF_FILE : null,
    design_system_adapter_file: manifestEntry.context_included.material_ui_adapter
      ? DESIGN_SYSTEM_FILE
      : null,
    capture_file: output.capture_file ?? null,
    model_response_summary: output.capture?.parsed?.summary ?? null,
    capture_provenance: output.capture_provenance,
    artifact_path: manifestEntry.artifact_path,
    screenshot_path: manifestEntry.screenshot_path,
    approach_title: manifestEntry.approach_title,
    approach_caption: manifestEntry.approach_caption,
  };

  return stripLineTrailingWhitespace(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(output.title)}</title>
    <style>${artifactCss()}</style>
${modelCss}${styleTags}
  </head>
  <body data-artifact-id="${escapeHtml(output.id)}" data-row-id="${escapeHtml(output.row_id)}" data-column-id="${escapeHtml(output.column_id)}" data-judgmentkit-mode="${escapeHtml(output.judgmentkit_mode)}" data-design-system-mode="${escapeHtml(output.design_system_mode)}">
    ${surface.html}
    <aside class="provenance" aria-label="Artifact provenance">
      <strong>Provenance:</strong>
      <span>${escapeHtml(output.capture_provenance.status)}</span>
      <span> - ${escapeHtml(output.generation_source)}</span>
      <span> - ${escapeHtml(columnRenderLabel(output))}</span>
      <p>This static snapshot is part of the JudgmentKit system-map examples. Build-time site generation copies committed files and does not call a model.</p>
      <p>${escapeHtml(manifestEntry.rendering_policy)}</p>
      <p>Manifest entry: <code>${escapeHtml(manifestEntry.artifact_path)}</code></p>
    </aside>
    <script type="application/json" id="model-ui-provenance">${jsonForScript(provenance)}</script>
  </body>
</html>
`);
}

function galleryPhaseLabel(artifact) {
  return artifact.column_label;
}

function renderGalleryCard(artifact, index) {
  return `
        <article class="gallery-card">
          <a class="thumbnail-link" href="${escapeHtml(artifact.artifact_path)}" data-carousel-open="${index}" aria-label="Open larger view for ${escapeHtml(artifact.approach_title)}">
            <img src="${escapeHtml(artifact.screenshot_path)}" alt="${escapeHtml(artifact.approach_title)} screenshot" loading="${index < 4 ? "eager" : "lazy"}">
          </a>
          <div class="gallery-card-copy">
            <p class="eyebrow">${escapeHtml(galleryPhaseLabel(artifact))}</p>
            <h2>${escapeHtml(artifact.approach_title)}</h2>
            <p>${escapeHtml(artifact.approach_caption)}</p>
            <dl>
              <div><dt>Context</dt><dd>${escapeHtml(artifact.column_label)}</dd></div>
              <div><dt>Render</dt><dd>${escapeHtml(artifact.render_source)}</dd></div>
            </dl>
            <div class="card-actions">
              <a href="${escapeHtml(artifact.artifact_path)}">Open live artifact</a>
              <a href="${escapeHtml(artifact.screenshot_path)}">Open image</a>
            </div>
          </div>
        </article>`;
}

function renderComparisonRow(row, artifactsById) {
  const cards = COMPARISON_COLUMNS.map((column) => {
    const artifact = artifactsById.get(`${row.id}-${column.id}`);
    if (!artifact) throw new Error(`Missing artifact for ${row.id}/${column.id}`);
    return renderGalleryCard(artifact, artifact.gallery_index);
  }).join("\n");

  return `
      <article class="matrix-row">
        <div class="matrix-heading">
          <p class="eyebrow">Generation path</p>
          <h2>${escapeHtml(row.label)}</h2>
          <p>${escapeHtml(row.summary)}</p>
        </div>
        <div class="matrix-cells">
${cards}
        </div>
      </article>`;
}

function renderDetailsRow(artifact) {
  const captureLabel = artifact.capture_file
    ? `Transcript: ${artifact.capture_file}`
    : "Rendered deterministically; no provider call.";

  return `
        <article class="details-row">
          <div>
            <p class="eyebrow">${escapeHtml(artifact.row_label)}</p>
            <h3>${escapeHtml(artifact.column_label)}</h3>
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
    ? `Entries marked <strong>capture-required</strong> need fresh model transcripts. Run <code>npm run capture:model-ui</code>.`
    : `All model cells are committed captures. Material UI improves visual/component consistency; JudgmentKit improves activity fit, workflow fit, and disclosure discipline.`;
  const artifactsWithIndex = manifest.artifacts.map((artifact, index) => ({
    ...artifact,
    gallery_index: index,
  }));
  const artifactsById = new Map(artifactsWithIndex.map((artifact) => [artifact.id, artifact]));
  const galleryItems = artifactsWithIndex.map((artifact) => ({
    id: artifact.id,
    title: artifact.approach_title,
    caption: artifact.approach_caption,
    model_label: artifact.row_label,
    column_label: artifact.column_label,
    render_source: artifact.render_source,
    provenance: artifact.capture_provenance.status,
    rendering_policy: artifact.rendering_policy,
    prompt_context: artifact.context_summary,
    image: artifact.screenshot_path,
    artifact: artifact.artifact_path,
  }));
  const matrixRows = COMPARISON_ROWS.map((row) => renderComparisonRow(row, artifactsById)).join("");
  const columnHeaders = COMPARISON_COLUMNS.map(
    (column) => `
          <div>
            <strong>${escapeHtml(column.label)}</strong>
            <span>${escapeHtml(column.summary)}</span>
          </div>`,
  ).join("");
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
        max-width: 1320px;
        margin: 0 auto;
        padding: clamp(24px, 5vw, 52px);
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(32px, 5vw, 56px);
        letter-spacing: 0;
      }
      p {
        max-width: 780px;
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
        grid-template-columns: repeat(4, minmax(0, 1fr));
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
      .column-guide {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin: 26px 0;
      }
      .column-guide div {
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fbfaf6;
      }
      .column-guide strong,
      .column-guide span {
        display: block;
      }
      .column-guide span {
        margin-top: 4px;
        color: var(--muted);
        font-size: 13px;
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
      .matrix-list {
        display: grid;
        gap: 18px;
      }
      .matrix-row {
        display: grid;
        gap: 14px;
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fbfaf6;
      }
      .matrix-heading {
        display: grid;
        gap: 4px;
      }
      .matrix-heading h2,
      .matrix-heading p {
        margin: 0;
      }
      .matrix-cells {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
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
        padding: 14px;
      }
      .gallery-card-copy h2 {
        margin: 0;
        font-size: 17px;
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
        overflow-wrap: anywhere;
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
        grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.7fr);
        width: min(1240px, 100%);
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
      @media (max-width: 1020px) {
        .summary,
        .column-guide,
        .matrix-cells {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 760px) {
        main {
          padding: 20px;
        }
        .summary,
        .column-guide,
        .gallery-intro,
        .matrix-cells,
        .carousel-panel {
          display: grid;
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
      <p>Three generation paths are shown across four context boundaries. Material UI improves visual/component consistency; JudgmentKit improves activity fit, workflow fit, and disclosure discipline.</p>
      <div class="summary" aria-label="Matrix summary">
        <div><span>Source brief</span><strong>${escapeHtml(manifest.source_brief_file)}</strong></div>
        <div><span>Rows</span><strong>${manifest.comparison_rows.length} generation paths</strong></div>
        <div><span>Columns</span><strong>${manifest.comparison_columns.length} context modes</strong></div>
        <div><span>Artifacts</span><strong>${manifest.artifacts.length} canonical snapshots</strong></div>
      </div>
      <section class="column-guide" aria-label="Matrix column definitions">
${columnHeaders}
      </section>
      <div class="gallery-intro">
        <div>
          <h2>3 x 4 comparison gallery</h2>
          <p>Each row uses the same generation path. Each column changes only JudgmentKit and Material UI context.</p>
        </div>
        <a href="${escapeHtml(manifest.artifacts[0].artifact_path)}">Open first live artifact</a>
      </div>
      <section class="matrix-list" aria-label="Model UI 3 by 4 screenshot gallery">
${matrixRows}
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
                <div><dt>Context</dt><dd data-carousel-context></dd></div>
                <div><dt>Render</dt><dd data-carousel-render></dd></div>
                <div><dt>Prompt context</dt><dd data-carousel-prompt></dd></div>
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
        const context = carousel.querySelector("[data-carousel-context]");
        const render = carousel.querySelector("[data-carousel-render]");
        const prompt = carousel.querySelector("[data-carousel-prompt]");
        const provenance = carousel.querySelector("[data-carousel-provenance]");
        const artifact = carousel.querySelector("[data-carousel-artifact]");
        const source = carousel.querySelector("[data-carousel-source]");
        const count = carousel.querySelector("[data-carousel-count]");
        const closeButton = carousel.querySelector("[data-carousel-close]:not(.carousel-backdrop)");
        let activeIndex = 0;
        let lastFocus = null;

        function renderItem(index) {
          activeIndex = (index + items.length) % items.length;
          const item = items[activeIndex];
          image.src = item.image;
          image.alt = item.title + " screenshot";
          kicker.textContent = item.model_label;
          title.textContent = item.title;
          caption.textContent = item.caption;
          context.textContent = item.column_label;
          render.textContent = item.render_source;
          prompt.textContent = item.prompt_context;
          provenance.textContent = item.provenance;
          artifact.href = item.artifact;
          source.href = item.image;
          count.textContent = String(activeIndex + 1) + " / " + String(items.length);
        }

        function open(index) {
          lastFocus = document.activeElement;
          renderItem(index);
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
        carousel.querySelector("[data-carousel-prev]").addEventListener("click", () => renderItem(activeIndex - 1));
        carousel.querySelector("[data-carousel-next]").addEventListener("click", () => renderItem(activeIndex + 1));
        document.addEventListener("keydown", (event) => {
          if (carousel.hidden) return;
          if (event.key === "Escape") close();
          if (event.key === "ArrowLeft") renderItem(activeIndex - 1);
          if (event.key === "ArrowRight") renderItem(activeIndex + 1);
        });
      })();
    </script>
  </body>
</html>
`;
}

function contextSummary(output) {
  const parts = ["source brief", "sample case"];
  if (output.judgmentkit_mode === "with_judgmentkit") parts.push("reviewed handoff");
  if (output.design_system_mode === "material_ui") parts.push("Material UI adapter");
  return parts.join(" + ");
}

function buildManifestArtifact(output, capture, contextHash) {
  const context = contextIncluded(output);
  const designSystem = output.design_system_mode === "material_ui";
  return {
    id: output.id,
    row_id: output.row_id,
    row_label: output.row_label,
    column_id: output.column_id,
    column_label: output.column_label,
    title: output.title,
    model_label: output.model_label,
    generation_source: output.generation_source,
    provider: output.provider,
    model: output.model,
    cli: output.cli,
    reasoning_effort: output.reasoning_effort,
    judgmentkit_mode: output.judgmentkit_mode,
    design_system_mode: output.design_system_mode,
    context_included: context,
    context_summary: contextSummary(output),
    source_brief_file: SOURCE_BRIEF_FILE,
    reviewed_handoff_file: context.reviewed_handoff ? HANDOFF_FILE : null,
    design_system_adapter_file: context.material_ui_adapter ? DESIGN_SYSTEM_FILE : null,
    design_system_name: designSystem ? DESIGN_SYSTEM_ADAPTER.design_system_name : null,
    design_system_package: designSystem ? DESIGN_SYSTEM_ADAPTER.design_system_package : null,
    design_system_render_mode: designSystem ? DESIGN_SYSTEM_ADAPTER.render_mode : null,
    capture_file: output.capture_file,
    capture_provenance: captureProvenance(output, capture),
    prompt_sha256: capture?.prompt_sha256 ?? null,
    source_context_sha256: contextHash,
    raw_response_sha256: capture?.raw_response_sha256 ?? null,
    artifact_path: artifactPath(output.id),
    screenshot_path: screenshotPath(output.id),
    render_source: renderSource(output),
    visible_render_source: renderSource(output),
    rendering_policy: renderingPolicy(output),
    approach_title: approachTitle(output),
    approach_caption: approachCaption(output),
  };
}

function buildComparisonRows(artifacts) {
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  return COMPARISON_ROWS.map((row) => ({
    id: row.id,
    label: row.label,
    model_label: row.model_label,
    generation_source: row.generation_source,
    provider: row.provider,
    model: row.model,
    reasoning_effort: row.reasoning_effort,
    summary: row.summary,
    artifact_ids: COMPARISON_COLUMNS.map((column) => `${row.id}-${column.id}`),
    artifacts: COMPARISON_COLUMNS.map((column) => byId.get(`${row.id}-${column.id}`)),
  }));
}

async function copyLegacyAliases(manifestArtifacts) {
  const byId = new Map(manifestArtifacts.map((artifact) => [artifact.id, artifact]));
  for (const alias of LEGACY_ALIASES) {
    const canonical = byId.get(alias.canonical_id);
    if (!canonical) throw new Error(`Missing canonical artifact for legacy alias ${alias.id}`);
    const html = await fs.readFile(path.join(OUTPUT_DIR, canonical.artifact_path), "utf8");
    await fs.writeFile(path.join(OUTPUT_DIR, alias.artifact_path), html);
  }
}

async function main() {
  const brief = await readSourceBrief();
  const reviewedHandoff = buildReviewedHandoff(brief);
  const outputs = buildOutputs();

  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, "captures"), { recursive: true });

  const artifacts = await Promise.all(
    outputs.map(async (output) => {
      const contextPayload = buildContextPayload({ output, brief, reviewedHandoff });
      const contextHash = hash(JSON.stringify(contextPayload, null, 2));
      const capture = await readCapture(output, contextHash);
      return {
        ...output,
        capture,
        capture_provenance: captureProvenance(output, capture),
        source_context_sha256: contextHash,
      };
    }),
  );

  const manifestArtifacts = artifacts.map((artifact) =>
    buildManifestArtifact(artifact, artifact.capture, artifact.source_context_sha256),
  );

  const manifest = {
    matrix_id: MATRIX_ID,
    title: "Model UI 3x4 comparison matrix",
    source_brief_file: SOURCE_BRIEF_FILE,
    reviewed_handoff_file: HANDOFF_FILE,
    design_system_adapter_file: DESIGN_SYSTEM_FILE,
    design_system_name: DESIGN_SYSTEM_ADAPTER.design_system_name,
    design_system_package: DESIGN_SYSTEM_ADAPTER.design_system_package,
    design_system_render_mode: DESIGN_SYSTEM_ADAPTER.render_mode,
    comparison_rows: buildComparisonRows(manifestArtifacts),
    comparison_columns: COMPARISON_COLUMNS,
    legacy_aliases: LEGACY_ALIASES,
    model_labels: COMPARISON_ROWS.map((row) => row.model_label),
    artifacts: manifestArtifacts,
    generation_policy:
      "Static captured-fixture pack. Website builds copy committed artifacts and never call a live model. The 3x4 matrix separates raw brief context, JudgmentKit handoff context, Material UI rendering, and the combined JudgmentKit plus Material UI path.",
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
    await fs.writeFile(path.join(OUTPUT_DIR, manifestEntry.artifact_path), html);
  }

  await copyLegacyAliases(manifestArtifacts);
  await fs.writeFile(path.join(OUTPUT_DIR, "index.html"), renderMatrixIndex(manifest));

  process.stdout.write("# JudgmentKit Model UI Matrix\n\n");
  process.stdout.write(`Source brief: ${SOURCE_BRIEF_FILE}\n`);
  process.stdout.write(`Matrix: examples/model-ui/refund-system-map/index.html\n`);
  process.stdout.write(`Manifest: examples/model-ui/refund-system-map/manifest.json\n`);
  process.stdout.write(`Artifacts: ${artifacts.length}\n`);
}

await main();
