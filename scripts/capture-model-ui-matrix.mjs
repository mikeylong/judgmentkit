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

const TARGETS = [
  {
    artifact_id: "gemma4-without-design-system",
    model_label: "Gemma 4 (local LLM)",
    provider: "lmstudio",
    cli: "lms",
    model: "google/gemma-4-e2b",
    design_system_mode: "without_design_system",
    output_file: "gemma4-without-design-system.json",
  },
  {
    artifact_id: "gemma4-with-design-system",
    model_label: "Gemma 4 (local LLM)",
    provider: "lmstudio",
    cli: "lms",
    model: "google/gemma-4-e2b",
    design_system_mode: "with_design_system",
    output_file: "gemma4-with-design-system.json",
  },
  {
    artifact_id: "gpt55-without-design-system",
    model_label: "GPT-5.5",
    provider: "codex-cli",
    cli: "codex",
    model: "gpt-5.5",
    design_system_mode: "without_design_system",
    output_file: "gpt55-without-design-system.json",
  },
  {
    artifact_id: "gpt55-with-design-system",
    model_label: "GPT-5.5",
    provider: "codex-cli",
    cli: "codex",
    model: "gpt-5.5",
    design_system_mode: "with_design_system",
    output_file: "gpt55-with-design-system.json",
  },
];

const CASE_CONTEXT = {
  selected_case: {
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
  },
  queue: [
    { id: "R-1842", customer: "Nora Diaz", state: "Needs receipt", amount: "$184.20" },
    { id: "R-1843", customer: "Jun Park", state: "Policy question", amount: "$89.00" },
    { id: "R-1844", customer: "Amara Blake", state: "Manager review", amount: "$312.75" },
  ],
};

const SYSTEM_PROMPT = [
  "You generate one static product UI artifact for a JudgmentKit comparison fixture.",
  "Return one minified valid JSON object only. Do not use Markdown fences.",
  "The html value must be one compact string with escaped quotes and no literal newlines.",
  "Do not include <script>, external assets, or implementation/debugging vocabulary in visible UI.",
  "Design-system variants are captured with Material UI adapter context, but the visible site artifact is rendered later from the reviewed handoff.",
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
    maxBuffer: 50 * 1024 * 1024,
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
        if (typeof parsed?.summary === "string" && typeof parsed?.html === "string") {
          return parsed;
        }
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

    throw new Error("No model response JSON object with summary and html found.");
  }
}

function validateParsed(parsed, target) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${target.artifact_id} did not return a JSON object.`);
  }
  if (typeof parsed.html !== "string" || !parsed.html.includes("data-primary-surface")) {
    throw new Error(`${target.artifact_id} did not return html with data-primary-surface.`);
  }
  if (!parsed.html.includes("Refund Review Workspace")) {
    throw new Error(`${target.artifact_id} is missing Refund Review Workspace.`);
  }
  if (!parsed.html.includes("Evidence") || !parsed.html.includes("Decision path") || !parsed.html.includes("Handoff")) {
    throw new Error(`${target.artifact_id} is missing required workflow sections.`);
  }
}

function buildPrompt({ target, sourceBrief, reviewedHandoff, designSystemAdapter, sourceContextHash }) {
  const withDesignSystem = target.design_system_mode === "with_design_system";

  return [
    SYSTEM_PROMPT,
    "",
    `Artifact id: ${target.artifact_id}`,
    `Model label: ${target.model_label}`,
    `Design-system mode: ${target.design_system_mode}`,
    withDesignSystem ? "Design-system adapter: Material UI (@mui/material), static SSR render path." : "Design-system adapter: none.",
    `Source context sha256: ${sourceContextHash}`,
    "",
    "Task: Generate the primary UI markup for a refund escalation review workspace from the reviewed JudgmentKit handoff.",
    "The output must be a product surface, not a diagnostics page.",
    "",
    "Return exactly this JSON shape:",
    '{ "summary": "one concise sentence", "html": "<main ... data-primary-surface>...</main>" }',
    "Return it as one line. The html string must be under 900 characters.",
    "",
    "HTML constraints:",
    `- Use <main class="app-shell${withDesignSystem ? " design-system" : ""}" data-primary-surface> as the root.`,
    "- Do not include <html>, <head>, <body>, <style>, or <script>.",
    "- Use plain HTML controls only. No JavaScript.",
    "- Keep the HTML compact: no whitespace-only formatting, no repeated explanatory prose.",
    "- Include these exact visible headings with this casing: Refund Review Workspace, Evidence, Decision path, Handoff.",
    "- Do not rename those headings to Evidence Checklist, Decision Path, Handoff Details, or similar variants.",
    "- Use the exact sample case and queue data provided below.",
    "- Keep implementation words out of visible UI: database table, JSON schema, prompt template, tool call, resource id, API endpoint, CRUD.",
    "- Prefer these existing CSS hooks when useful: app-header, eyebrow, status, workspace, queue, queue-item, is-selected, detail, case-header, info-grid, evidence-list, check, policy, actions, primary, handoff.",
    withDesignSystem
      ? "- Preserve a structure that can be rendered by the Material UI adapter; do not claim design-system compliance as the activity outcome."
      : "- Use simple primitives; do not mention or simulate a design system.",
    "",
    "Source brief:",
    sourceBrief,
    "",
    "Reviewed handoff JSON:",
    JSON.stringify(reviewedHandoff, null, 2),
    "",
    "Sample case data:",
    JSON.stringify(CASE_CONTEXT, null, 2),
    "",
    withDesignSystem
      ? `Design-system adapter JSON:\n${JSON.stringify(designSystemAdapter, null, 2)}`
      : "Design-system adapter JSON: not applied for this artifact.",
  ].join("\n");
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

async function captureWithCodex(target, prompt) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-codex-capture-"));
  const outputFile = path.join(tempDir, `${target.artifact_id}.json`);
  const schemaFile = path.join(tempDir, "schema.json");

  await fs.writeFile(
    schemaFile,
    JSON.stringify(
      {
        type: "object",
        additionalProperties: false,
        required: ["summary", "html"],
        properties: {
          summary: { type: "string" },
          html: { type: "string" },
        },
      },
      null,
      2,
    ),
  );

  const args = [
    "exec",
    "--model",
    target.model,
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
  const execution = run("codex", args, { input: prompt, timeout: 900_000 });
  const rawResponse = await fs.readFile(outputFile, "utf8");

  return {
    command_display: `codex ${args.map((arg) => (arg === schemaFile ? "<schema>" : arg === outputFile ? "<output>" : arg)).join(" ")}`,
    raw_response: rawResponse,
    execution,
  };
}

function buildCompactRetryPrompt(prompt) {
  return [
    prompt,
    "",
    "Retry requirement:",
    "Your prior response was not parseable as a complete JSON object.",
    "Return a shorter one-line JSON object only.",
    "Keep html under 750 characters.",
    "Use only these visible headings: Refund Review Workspace, Evidence, Decision path, Handoff.",
    "Use short elements and compact text. Do not add prose after the JSON.",
  ].join("\n");
}

async function main() {
  await ensureBaseFiles();
  await fs.mkdir(CAPTURES_DIR, { recursive: true });

  const [sourceBrief, reviewedHandoff, designSystemAdapter] = await Promise.all([
    fs.readFile(SOURCE_BRIEF_FILE, "utf8"),
    fs.readFile(HANDOFF_FILE, "utf8").then(JSON.parse),
    fs.readFile(DESIGN_SYSTEM_FILE, "utf8").then(JSON.parse),
  ]);
  const sourceContextHash = hash(
    [
      sourceBrief,
      JSON.stringify(reviewedHandoff, null, 2),
      JSON.stringify(designSystemAdapter, null, 2),
    ].join("\n"),
  );

  for (const target of TARGETS) {
    const prompt = buildPrompt({
      target,
      sourceBrief,
      reviewedHandoff,
      designSystemAdapter,
      sourceContextHash,
    });
    let promptForCapture = prompt;
    let promptSha = hash(promptForCapture);
    let capture =
      target.cli === "lms"
        ? await captureWithLms(target, promptForCapture)
        : await captureWithCodex(target, promptForCapture);
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
        promptForCapture = buildCompactRetryPrompt(prompt);
        promptSha = hash(promptForCapture);
        capture = await captureWithLms(target, promptForCapture);
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
      model_label: target.model_label,
      provider: target.provider,
      cli: target.cli,
      model: target.model,
      design_system_mode: target.design_system_mode,
      design_system_name:
        target.design_system_mode === "with_design_system"
          ? designSystemAdapter.design_system_name
          : null,
      design_system_package:
        target.design_system_mode === "with_design_system"
          ? designSystemAdapter.design_system_package
          : null,
      design_system_render_mode:
        target.design_system_mode === "with_design_system"
          ? designSystemAdapter.render_mode
          : null,
      runner: "scripts/capture-model-ui-matrix.mjs",
      captured_at: new Date().toISOString(),
      source_context_sha256: sourceContextHash,
      prompt_sha256: promptSha,
      raw_response_sha256: hash(rawResponse),
      command_display: capture.command_display,
      notes: `${target.model_label} output captured through ${target.cli} for the JudgmentKit model UI matrix.`,
      parsed,
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
    process.stdout.write(`Captured ${target.artifact_id} -> ${target.output_file}\n`);
  }

  await ensureBaseFiles();
  run(process.execPath, [path.join(ROOT_DIR, "scripts/capture-model-ui-screenshots.mjs")], {
    timeout: 180_000,
  });
}

await main();
