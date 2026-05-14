#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "examples/model-ui/refund-system-map");
const CAPTURES_DIR = path.join(OUTPUT_DIR, "captures");
const SOURCE_BRIEF_FILE = path.join(ROOT_DIR, "examples/demo/refund-ops-implementation-heavy.brief.txt");
const HANDOFF_FILE = path.join(OUTPUT_DIR, "reviewed-handoff.fixture.json");
const DESIGN_SYSTEM_FILE = path.join(OUTPUT_DIR, "design-system-adapter.json");
const MODEL_CAPTURE_TIMEOUT_MS = Number.parseInt(
  process.env.MODEL_UI_CAPTURE_TIMEOUT_MS ?? "900000",
  10,
);

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

const ROWS = [
  {
    id: "gemma4-lms",
    label: "Gemma 4 via LM Studio lms",
    model_label: "Gemma 4 (local LLM)",
    provider: "lmstudio",
    cli: "lms",
    model: "google/gemma-4-e2b",
    reasoning_effort: null,
  },
  {
    id: "gpt55-xhigh-codex",
    label: "GPT-5.5 xhigh via codex exec",
    model_label: "GPT-5.5",
    provider: "codex-cli",
    cli: "codex",
    model: "gpt-5.5",
    reasoning_effort: "xhigh",
  },
];

const COLUMNS = [
  {
    id: "no-judgmentkit",
    label: "Raw brief",
    judgmentkit_mode: "no_judgmentkit",
    design_system_mode: "none",
    render_mode: "html",
  },
  {
    id: "with-judgmentkit",
    label: "JudgmentKit handoff",
    judgmentkit_mode: "with_judgmentkit",
    design_system_mode: "none",
    render_mode: "html",
  },
  {
    id: "material-ui-only",
    label: "Material UI only",
    judgmentkit_mode: "no_judgmentkit",
    design_system_mode: "material_ui",
    render_mode: "material_ui",
  },
  {
    id: "judgmentkit-material-ui",
    label: "JudgmentKit + Material UI",
    judgmentkit_mode: "with_judgmentkit",
    design_system_mode: "material_ui",
    render_mode: "material_ui",
  },
];

const LEGACY_CAPTURE_ALIASES = [
  {
    legacy_file: "gemma4-without-design-system.json",
    canonical_file: "gemma4-lms-with-judgmentkit.json",
    legacy_artifact_id: "gemma4-without-design-system",
  },
  {
    legacy_file: "gemma4-with-design-system.json",
    canonical_file: "gemma4-lms-judgmentkit-material-ui.json",
    legacy_artifact_id: "gemma4-with-design-system",
  },
  {
    legacy_file: "gpt55-without-design-system.json",
    canonical_file: "gpt55-xhigh-codex-with-judgmentkit.json",
    legacy_artifact_id: "gpt55-without-design-system",
  },
  {
    legacy_file: "gpt55-with-design-system.json",
    canonical_file: "gpt55-xhigh-codex-judgmentkit-material-ui.json",
    legacy_artifact_id: "gpt55-with-design-system",
  },
];

const SYSTEM_PROMPT = [
  "You generate one static product UI candidate for a JudgmentKit comparison fixture.",
  "Return one valid JSON object only. Do not use Markdown fences.",
  "Do not include scripts, external assets, remote fonts, or external image URLs.",
  "Respect the context boundary described in the user prompt.",
].join(" ");

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stripAnsi(value) {
  return String(value).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function sanitizeModelResponse(value) {
  return stripAnsi(value)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

function decodeLooseJsonString(value) {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
    timeout: options.timeout ?? 600_000,
    input: options.input,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with status ${result.status}\n${result.stderr}`,
    );
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
}

function parseJsonPayload(raw) {
  const trimmed = String(raw).trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const candidates = [];
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = 0; index < withoutFence.length; index += 1) {
      const character = withoutFence[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }

      if (character === '"') {
        inString = true;
      } else if (character === "{") {
        if (depth === 0) start = index;
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          candidates.push(withoutFence.slice(start, index + 1));
          start = -1;
        }
      }
    }

    for (const candidate of candidates.reverse()) {
      try {
        const parsed = JSON.parse(candidate);
        if (typeof parsed?.summary === "string") return parsed;
      } catch {
        // Keep scanning; LM Studio may echo JSON snippets from the prompt before the answer.
      }
    }

    const summaryMatch = withoutFence.match(/"summary"\s*:\s*"((?:\\.|[^"\\])*)"/s);
    const htmlKeyIndex = withoutFence.indexOf('"html"');
    if (summaryMatch && htmlKeyIndex !== -1) {
      const colonIndex = withoutFence.indexOf(":", htmlKeyIndex);
      const firstQuoteIndex = withoutFence.indexOf('"', colonIndex + 1);
      let endIndex = withoutFence.length - 1;
      while (endIndex >= 0 && /\s/.test(withoutFence[endIndex])) endIndex -= 1;
      if (withoutFence[endIndex] === "}") {
        endIndex -= 1;
        while (endIndex >= 0 && /\s/.test(withoutFence[endIndex])) endIndex -= 1;
      }
      if (withoutFence[endIndex] === '"' && firstQuoteIndex !== -1 && firstQuoteIndex < endIndex) {
        return {
          summary: decodeLooseJsonString(summaryMatch[1]),
          html: decodeLooseJsonString(withoutFence.slice(firstQuoteIndex + 1, endIndex)),
        };
      }
    }

    throw new Error("No model response JSON object found.");
  }
}

function sanitizeCss(css) {
  return String(css ?? "")
    .replace(/@import[^;]+;/gi, "")
    .replace(/url\([^)]*\)/gi, "none")
    .replace(/<\/?style[^>]*>/gi, "")
    .trim();
}

function sanitizeHtml(html) {
  return String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .trim();
}

function validateParsed(parsed, target) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${target.artifact_id} did not return a JSON object.`);
  }
  if (typeof parsed.summary !== "string" || !parsed.summary.trim()) {
    throw new Error(`${target.artifact_id} did not return summary.`);
  }

  if (target.render_mode === "material_ui") {
    if (!parsed.surface || typeof parsed.surface !== "object") {
      throw new Error(`${target.artifact_id} did not return surface data.`);
    }
    if (!String(parsed.surface.heading ?? parsed.surface.title ?? "").trim()) {
      throw new Error(`${target.artifact_id} surface is missing heading.`);
    }
    return;
  }

  if (typeof parsed.html !== "string" || !parsed.html.includes("data-primary-surface")) {
    throw new Error(`${target.artifact_id} did not return html with data-primary-surface.`);
  }
}

function contextIncluded(target) {
  return {
    source_brief: true,
    sample_case: true,
    reviewed_handoff: target.judgmentkit_mode === "with_judgmentkit",
    material_ui_adapter: target.design_system_mode === "material_ui",
  };
}

function buildContextPayload({ target, sourceBrief, reviewedHandoff, designSystemAdapter }) {
  const included = contextIncluded(target);
  return {
    matrix_id: "refund-system-map-model-ui-v2",
    artifact_id: target.artifact_id,
    row_id: target.row_id,
    column_id: target.column_id,
    context_included: included,
    source_brief: sourceBrief,
    sample_case: {
      selected_case: SELECTED_CASE,
      queue: QUEUE,
    },
    reviewed_handoff: included.reviewed_handoff ? reviewedHandoff : null,
    material_ui_adapter: included.material_ui_adapter ? designSystemAdapter : null,
  };
}

function buildTarget(row, column) {
  const artifactId = `${row.id}-${column.id}`;
  return {
    ...row,
    ...column,
    artifact_id: artifactId,
    row_id: row.id,
    row_label: row.label,
    column_id: column.id,
    column_label: column.label,
    output_file: `${artifactId}.json`,
  };
}

function buildTargets() {
  return ROWS.flatMap((row) => COLUMNS.map((column) => buildTarget(row, column)));
}

function buildHtmlPrompt({ target, contextPayload }) {
  const usingJudgmentKit = target.judgmentkit_mode === "with_judgmentkit";
  const boundary = usingJudgmentKit
    ? "You receive a reviewed JudgmentKit handoff. Use it as the source of truth for activity, workflow, domain vocabulary, and disclosure boundaries."
    : "You receive only the raw source brief and sample case. Do not assume a reviewed JudgmentKit handoff exists.";
  const disclosure = usingJudgmentKit
    ? "Keep implementation details out of the visible UI unless the activity explicitly needs diagnostics."
    : "You may reflect the raw brief's implementation-heavy framing if that is what the brief implies.";

  return [
    `Artifact id: ${target.artifact_id}`,
    `Generation path: ${target.row_label}`,
    `Column: ${target.column_label}`,
    "",
    "Task: Generate one static browser-renderable product UI candidate for the refund escalation case.",
    boundary,
    disclosure,
    "Return JSON only with this shape:",
    '{ "summary": "one sentence", "css": "optional static CSS", "html": "<main data-primary-surface>...</main>" }',
    "",
    "Hard constraints:",
    "- The html field must include exactly one primary <main ... data-primary-surface> root.",
    "- Static CSS is allowed in the css field. Do not include <style> inside html.",
    "- Do not include <script>, external assets, remote fonts, image URLs, or network references.",
    "- Use visible UI copy, buttons, and sections that reflect the provided context boundary.",
    "- Keep it readable at a 1365x900 desktop viewport.",
    "",
    "Context JSON:",
    JSON.stringify(contextPayload, null, 2),
  ].join("\n");
}

function buildMaterialUiPrompt({ target, contextPayload }) {
  const usingJudgmentKit = target.judgmentkit_mode === "with_judgmentkit";
  const boundary = usingJudgmentKit
    ? "You receive a reviewed JudgmentKit handoff. Use it as the source of truth for the surface data."
    : "You receive only raw source brief context plus a Material UI adapter. Do not assume JudgmentKit reviewed the activity.";
  const disclosure = usingJudgmentKit
    ? "Keep implementation details out of user-facing labels unless the handoff allows diagnostics."
    : "Material UI can structure the interface, but it does not fix the raw brief's activity or disclosure problems.";

  return [
    `Artifact id: ${target.artifact_id}`,
    `Generation path: ${target.row_label}`,
    `Column: ${target.column_label}`,
    "",
    "Task: Produce structured surface data for a static Material UI SSR renderer.",
    boundary,
    disclosure,
    "Do not return HTML or CSS for this column.",
    "Return JSON only with this shape:",
    '{ "summary": "one sentence", "surface": { "eyebrow": "...", "heading": "...", "status": "...", "queue_title": "...", "queue": [{ "id": "...", "customer": "...", "state": "...", "amount": "..." }], "selected": { "id": "...", "customer": "...", "amount": "...", "plan": "...", "request": "...", "status": "..." }, "info": [{ "label": "...", "value": "..." }], "evidence": ["..."], "policy_title": "...", "policy": "...", "decision_title": "...", "actions": ["..."], "primary_action": "...", "handoff": { "owner": "...", "title": "...", "reason": "...", "action": "..." } } }',
    "",
    "Context JSON:",
    JSON.stringify(contextPayload, null, 2),
  ].join("\n");
}

function buildPrompt(args) {
  return args.target.render_mode === "material_ui"
    ? buildMaterialUiPrompt(args)
    : buildHtmlPrompt(args);
}

async function ensureBaseFiles() {
  run(process.execPath, [path.join(ROOT_DIR, "scripts/demo-model-ui-matrix.mjs")], {
    timeout: 120_000,
  });
}

async function captureWithLms(target, prompt) {
  const args = [
    "chat",
    target.model,
    "--system-prompt",
    SYSTEM_PROMPT,
    "--prompt",
    prompt,
    "--ttl",
    "300",
    "--yes",
  ];
  const execution = run("lms", args, { timeout: 900_000 });
  return {
    command_display: `lms ${args.map((arg) => (arg === prompt ? "<prompt>" : arg)).join(" ")}`,
    raw_response: execution.stdout,
    execution,
  };
}

function schemaForTarget(target) {
  if (target.render_mode === "material_ui") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["summary", "surface"],
      properties: {
        summary: { type: "string" },
        surface: {
          type: "object",
          additionalProperties: false,
          required: [
            "eyebrow",
            "heading",
            "status",
            "queue_title",
            "queue",
            "selected",
            "info",
            "evidence",
            "policy_title",
            "policy",
            "decision_title",
            "actions",
            "primary_action",
            "handoff",
          ],
          properties: {
            eyebrow: { type: "string" },
            heading: { type: "string" },
            status: { type: "string" },
            queue_title: { type: "string" },
            queue: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "customer", "state", "amount"],
                properties: {
                  id: { type: "string" },
                  customer: { type: "string" },
                  state: { type: "string" },
                  amount: { type: "string" },
                },
              },
            },
            selected: {
              type: "object",
              additionalProperties: false,
              required: ["id", "customer", "amount", "plan", "request", "status"],
              properties: {
                id: { type: "string" },
                customer: { type: "string" },
                amount: { type: "string" },
                plan: { type: "string" },
                request: { type: "string" },
                status: { type: "string" },
              },
            },
            info: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["label", "value"],
                properties: {
                  label: { type: "string" },
                  value: { type: "string" },
                },
              },
            },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
            policy_title: { type: "string" },
            policy: { type: "string" },
            decision_title: { type: "string" },
            actions: {
              type: "array",
              items: { type: "string" },
            },
            primary_action: { type: "string" },
            handoff: {
              type: "object",
              additionalProperties: false,
              required: ["owner", "title", "reason", "action"],
              properties: {
                owner: { type: "string" },
                title: { type: "string" },
                reason: { type: "string" },
                action: { type: "string" },
              },
            },
          },
        },
      },
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "css", "html"],
    properties: {
      summary: { type: "string" },
      css: { type: "string" },
      html: { type: "string" },
    },
  };
}

async function captureWithCodex(target, prompt) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-codex-capture-"));
  const outputFile = path.join(tempDir, `${target.artifact_id}.json`);
  const schemaFile = path.join(tempDir, "schema.json");

  await fs.writeFile(schemaFile, JSON.stringify(schemaForTarget(target), null, 2));

  const args = [
    "exec",
    "--model",
    target.model,
    "-c",
    'model_reasoning_effort="xhigh"',
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
    "--ephemeral",
    "--color",
    "never",
    "--output-schema",
    schemaFile,
    "--output-last-message",
    outputFile,
    "-",
  ];
  const execution = run("codex", args, { input: prompt, timeout: MODEL_CAPTURE_TIMEOUT_MS });
  const rawResponse = await fs.readFile(outputFile, "utf8");

  return {
    command_display: `codex ${args.map((arg) => (arg === schemaFile ? "<schema>" : arg === outputFile ? "<output>" : arg)).join(" ")}`,
    raw_response: rawResponse,
    execution,
  };
}

function buildCompactRetryPrompt(target, contextPayload) {
  const caseSummary = `${SELECTED_CASE.id} ${SELECTED_CASE.customer} ${SELECTED_CASE.amount}: ${SELECTED_CASE.status}. Missing receipt photo.`;
  const contextBoundary = contextPayload.context_included.reviewed_handoff
    ? "Use JudgmentKit handoff language: review evidence, choose next action, leave handoff."
    : "Use raw brief language if useful: refund_case, schema, API status, CRUD.";
  const designBoundary = contextPayload.context_included.material_ui_adapter
    ? "Return surface data for Material UI SSR, not HTML."
    : "Return HTML and optional CSS.";

  if (target.render_mode === "material_ui") {
    const compactSurface = {
      summary: "one sentence",
      surface: {
        eyebrow: "Refund review",
        heading: "Refund Review Workspace",
        status: "Evidence incomplete",
        queue_title: "Escalation queue",
        queue: QUEUE,
        selected: SELECTED_CASE,
        info: [
          { label: "Case", value: SELECTED_CASE.id },
          { label: "Amount", value: SELECTED_CASE.amount },
          { label: "Plan", value: SELECTED_CASE.plan },
        ],
        evidence: SELECTED_CASE.evidence,
        policy_title: "Policy context",
        policy: SELECTED_CASE.policy,
        decision_title: "Decision path",
        actions: ["Approve refund", "Send to policy review", "Return for missing evidence"],
        primary_action: "Return for missing evidence",
        handoff: {
          owner: "Support agent",
          title: "Missing evidence handoff",
          reason: "Receipt photo is missing before manager approval.",
          action: "Ask the agent to collect the receipt photo before approval.",
        },
      },
    };
    return [
      SYSTEM_PROMPT,
      "",
      `Artifact id: ${target.artifact_id}`,
      contextBoundary,
      designBoundary,
      `Case: ${caseSummary}`,
      "Return one compact JSON object only:",
      JSON.stringify(compactSurface),
    ].join("\n");
  }

  return [
    SYSTEM_PROMPT,
    "",
    `Artifact id: ${target.artifact_id}`,
    contextBoundary,
    designBoundary,
    `Case: ${caseSummary}`,
    "Return one compact JSON object only:",
    '{"summary":"one sentence","css":"main{font-family:system-ui;padding:24px}.panel{border:1px solid #ddd;padding:12px}","html":"<main data-primary-surface><h1>Refund Review Workspace</h1><section class=\\"panel\\"><h2>Evidence</h2><p>Receipt photo missing.</p></section><section class=\\"panel\\"><h2>Decision path</h2><button>Return for evidence</button></section><section class=\\"panel\\"><h2>Handoff</h2><p>Send to support agent.</p></section></main>"}',
  ].join("\n");
}

async function captureTarget(target, prompt) {
  return target.cli === "lms"
    ? captureWithLms(target, prompt)
    : captureWithCodex(target, prompt);
}

async function readReusableCapture(target, sourceContextHash) {
  try {
    const filePath = path.join(CAPTURES_DIR, target.output_file);
    const capture = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (capture.artifact_id !== target.artifact_id) return null;
    if (capture.source_context_sha256 !== sourceContextHash) return null;
    validateParsed(capture.parsed, target);
    return capture;
  } catch {
    return null;
  }
}

async function writeLegacyCaptureAliases() {
  for (const alias of LEGACY_CAPTURE_ALIASES) {
    const canonicalPath = path.join(CAPTURES_DIR, alias.canonical_file);
    const legacyPath = path.join(CAPTURES_DIR, alias.legacy_file);
    const canonical = JSON.parse(await fs.readFile(canonicalPath, "utf8"));
    const legacy = {
      ...canonical,
      artifact_id: alias.legacy_artifact_id,
      canonical_artifact_id: canonical.artifact_id,
      compatibility_alias: true,
      notes: `${canonical.notes} Compatibility alias for the previous six-artifact matrix URL.`,
    };
    await fs.writeFile(legacyPath, `${JSON.stringify(legacy, null, 2)}\n`);
  }
}

async function main() {
  await ensureBaseFiles();
  await fs.mkdir(CAPTURES_DIR, { recursive: true });

  const [sourceBrief, reviewedHandoff, designSystemAdapter] = await Promise.all([
    fs.readFile(SOURCE_BRIEF_FILE, "utf8"),
    fs.readFile(HANDOFF_FILE, "utf8").then(JSON.parse),
    fs.readFile(DESIGN_SYSTEM_FILE, "utf8").then(JSON.parse),
  ]);

  for (const target of buildTargets()) {
    const contextPayload = buildContextPayload({
      target,
      sourceBrief,
      reviewedHandoff,
      designSystemAdapter,
    });
    const sourceContextHash = hash(JSON.stringify(contextPayload, null, 2));
    const prompt = buildPrompt({
      target,
      contextPayload,
    });
    const reusable = await readReusableCapture(target, sourceContextHash);
    if (reusable) {
      process.stdout.write(`Reused ${target.artifact_id} -> ${target.output_file}\n`);
      continue;
    }
    let promptForCapture = prompt;
    let promptSha = hash(promptForCapture);
    let capture;
    try {
      capture = await captureTarget(target, promptForCapture);
    } catch (error) {
      if (target.cli !== "codex" || error.code !== "ETIMEDOUT") {
        throw error;
      }
      const failureFile = path.join(CAPTURES_DIR, `${target.output_file}.failed.txt`);
      await fs.writeFile(
        failureFile,
        [
          `${target.artifact_id} full prompt capture timed out.`,
          `Error: ${error.message}`,
          "Retrying with compact prompt.",
          "",
          promptForCapture,
        ].join("\n"),
      );
      process.stdout.write(
        `${target.artifact_id} full prompt timed out; retrying with compact JSON prompt.\n`,
      );
      promptForCapture = buildCompactRetryPrompt(target, contextPayload);
      promptSha = hash(promptForCapture);
      capture = await captureTarget(target, promptForCapture);
    }
    let rawResponse = sanitizeModelResponse(capture.raw_response);
    let parsed;

    try {
      parsed = parseJsonPayload(rawResponse);
      validateParsed(parsed, target);
    } catch (error) {
      if (target.cli === "lms") {
        process.stdout.write(
          `${target.artifact_id} initial capture failed validation; retrying with compact JSON prompt.\n`,
        );
        promptForCapture = buildCompactRetryPrompt(target, contextPayload);
        promptSha = hash(promptForCapture);
        capture = await captureTarget(target, promptForCapture);
        rawResponse = sanitizeModelResponse(capture.raw_response);
        try {
          parsed = parseJsonPayload(rawResponse);
          validateParsed(parsed, target);
        } catch (retryError) {
          const failureFile = path.join(CAPTURES_DIR, `${target.output_file}.failed.txt`);
          await fs.writeFile(failureFile, rawResponse);
          throw new Error(
            `${target.artifact_id} capture failed validation: ${retryError.message}\nRaw response written to ${failureFile}`,
          );
        }
      } else {
        const failureFile = path.join(CAPTURES_DIR, `${target.output_file}.failed.txt`);
        await fs.writeFile(failureFile, rawResponse);
        throw new Error(
          `${target.artifact_id} capture failed validation: ${error.message}\nRaw response written to ${failureFile}`,
        );
      }
    }

    const transcript = {
      artifact_id: target.artifact_id,
      row_id: target.row_id,
      row_label: target.row_label,
      column_id: target.column_id,
      column_label: target.column_label,
      model_label: target.model_label,
      provider: target.provider,
      cli: target.cli,
      model: target.model,
      reasoning_effort: target.reasoning_effort,
      judgmentkit_mode: target.judgmentkit_mode,
      design_system_mode: target.design_system_mode,
      design_system_name:
        target.design_system_mode === "material_ui"
          ? designSystemAdapter.design_system_name
          : null,
      design_system_package:
        target.design_system_mode === "material_ui"
          ? designSystemAdapter.design_system_package
          : null,
      design_system_render_mode:
        target.design_system_mode === "material_ui"
          ? designSystemAdapter.render_mode
          : null,
      render_mode: target.render_mode,
      runner: "scripts/capture-model-ui-matrix.mjs",
      captured_at: new Date().toISOString(),
      context_included: contextPayload.context_included,
      source_context_sha256: sourceContextHash,
      prompt_sha256: promptSha,
      raw_response_sha256: hash(rawResponse),
      command_display: capture.command_display,
      notes: `${target.model_label} output captured through ${target.cli} for the JudgmentKit 3x4 model UI matrix.`,
      parsed: {
        ...parsed,
        html: parsed.html ? sanitizeHtml(parsed.html) : undefined,
        css: parsed.css ? sanitizeCss(parsed.css) : undefined,
      },
      raw_response: rawResponse,
      execution: {
        status: capture.execution.status,
        stdout_sha256: hash(capture.execution.stdout ?? ""),
        stderr_sha256: hash(capture.execution.stderr ?? ""),
      },
    };

    await fs.writeFile(
      path.join(CAPTURES_DIR, target.output_file),
      `${JSON.stringify(transcript, null, 2)}\n`,
    );
    await fs.rm(path.join(CAPTURES_DIR, `${target.output_file}.failed.txt`), { force: true });
    process.stdout.write(`Captured ${target.artifact_id} -> ${target.output_file}\n`);
  }

  await writeLegacyCaptureAliases();
  await ensureBaseFiles();
  run(process.execPath, [path.join(ROOT_DIR, "scripts/capture-model-ui-screenshots.mjs")], {
    timeout: 180_000,
  });
}

await main();
