import fs from "node:fs";
import crypto from "node:crypto";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";

import { getMcpMetadata } from "../src/mcp.mjs";
import {
  createActivityModelReview,
  createFrontendGenerationContext,
  createFrontendImplementationSkillContext,
  createUiGenerationHandoff,
  createUiImplementationContract,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

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
const STATIC_EVALUATION_TYPE = "deterministic_static_artifact_scoring";
const LIVE_EVALUATION_TYPE = "live_provider_ui_generation_scoring";
const STATIC_GENERATION_POLICY =
  "Scores committed standalone artifacts only. Does not call providers or generate apps.";
const LIVE_GENERATION_POLICY =
  "Calls a live provider for each baseline and JudgmentKit-guided variant, writes dated generated HTML artifacts, then scores those artifacts.";
const FIXTURE_GENERATION_POLICY =
  "Test fixture mode writes deterministic generated artifacts for harness verification only. It is not live provider evidence.";
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
const SCREENSHOT_VIEWPORTS = [
  {
    id: "desktop",
    label: "Desktop",
    width: 1365,
    height: 900,
    device_scale_factor: 1,
    mobile: false,
  },
  {
    id: "mobile",
    label: "Mobile",
    width: 390,
    height: 844,
    device_scale_factor: 1,
    mobile: true,
  },
];
const SCREENSHOT_ENGINE = "chrome_devtools_protocol";
const SCREENSHOT_POLICY =
  "Initial viewport screenshots captured from committed static artifacts. Visual evidence is not used for scoring.";
const LIVE_SCREENSHOT_POLICY =
  "Initial viewport screenshots captured from dated live-generated artifacts. Visual evidence is not used for scoring.";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const LIVE_UI_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    body_html: { type: "string" },
    css: { type: "string" },
    generation_notes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["title", "body_html", "css", "generation_notes"],
  additionalProperties: false,
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function compactJson(value) {
  return JSON.stringify(value, null, 2);
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

function repoRelativePath(filePath) {
  return relativePath(filePath).split(path.sep).join("/");
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveCommandFromPath(command) {
  if (!command) {
    return null;
  }
  if (command.includes("/") || command.includes("\\")) {
    return isExecutable(command) ? command : null;
  }

  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir) {
      continue;
    }
    const candidate = path.join(dir, command);
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

function configuredChromePath(envName) {
  const value = process.env[envName];
  if (!value) {
    return null;
  }

  const resolved = resolveCommandFromPath(value);
  if (!resolved) {
    throw new Error(
      `${envName} is set to ${value}, but that Chrome executable could not be found or run.`,
    );
  }

  return resolved;
}

function resolveChromeExecutable() {
  const configured =
    configuredChromePath("JUDGMENTKIT_UI_EVAL_CHROME_PATH") ??
    configuredChromePath("CHROME_BIN");
  if (configured) {
    return configured;
  }

  for (const command of [
    "google-chrome-stable",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "chrome",
  ]) {
    const resolved = resolveCommandFromPath(command);
    if (resolved) {
      return resolved;
    }
  }

  for (const candidate of [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Chrome is required to capture UI eval screenshots. Install Chrome/Chromium or set JUDGMENTKIT_UI_EVAL_CHROME_PATH to an executable Chrome path.",
  );
}

function createChromeUserDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-ui-eval-chrome-"));
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error("Unable to allocate a Chrome debugging port."));
        }
      });
    });
  });
}

async function waitForChromeVersion(port, getStderr) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }

  throw new Error(`Chrome DevTools endpoint did not start. ${getStderr().trim()}`);
}

function connectCdp(webSocketDebuggerUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketDebuggerUrl);
    let nextId = 1;
    const pending = new Map();
    const listeners = new Map();

    const client = {
      send(method, params = {}, sessionId = undefined) {
        if (socket.readyState !== WebSocket.OPEN) {
          return Promise.reject(new Error("Chrome DevTools socket is closed."));
        }

        const id = nextId;
        nextId += 1;
        socket.send(JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }));

        return new Promise((res, rej) => {
          pending.set(id, { res, rej });
        });
      },
      waitFor(method, sessionId = undefined, timeoutMs = 10_000) {
        return new Promise((res, rej) => {
          const key = `${sessionId ?? ""}:${method}`;
          const callback = {
            res(params) {
              clearTimeout(timer);
              res(params);
            },
          };
          const timer = setTimeout(() => {
            const callbacks = listeners.get(key) ?? [];
            listeners.set(
              key,
              callbacks.filter((entry) => entry !== callback),
            );
            rej(new Error(`Timed out waiting for Chrome event ${method}.`));
          }, timeoutMs);
          const callbacks = listeners.get(key) ?? [];
          callbacks.push(callback);
          listeners.set(key, callbacks);
        });
      },
      close() {
        socket.close();
      },
    };

    socket.addEventListener("open", () => {
      resolve(client);
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { res, rej } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
          rej(new Error(message.error.message));
        } else {
          res(message.result);
        }
        return;
      }

      if (message.method) {
        const key = `${message.sessionId ?? ""}:${message.method}`;
        const callbacks = listeners.get(key);
        if (callbacks?.length) {
          const callback = callbacks.shift();
          callback.res(message.params);
        }
      }
    });
    socket.addEventListener("error", reject);
    socket.addEventListener("close", () => {
      for (const { rej } of pending.values()) {
        rej(new Error("Chrome DevTools socket closed."));
      }
      pending.clear();
    });
  });
}

function assertPng(buffer, filePath) {
  if (buffer.length < 4096 || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`Screenshot capture failed or produced an invalid PNG: ${filePath}`);
  }
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
    live_generation: variant.live_generation,
    generated_artifact_path: variant.live_generation?.generated_artifact_path,
    generated_artifact: variant.live_generation
      ? {
          path: variant.live_generation.generated_artifact_path,
          repo_path: variant.live_generation.artifact,
        }
      : undefined,
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

function liveGeneratedAt() {
  return new Date().toISOString();
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function readSourceBrief(testCase) {
  if (!testCase.source_brief_file) {
    throw new Error(`${testCase.id} must define source_brief_file for live UI generation.`);
  }

  const sourcePath = resolveRepoPath(testCase.source_brief_file);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`${testCase.id} source brief not found: ${testCase.source_brief_file}`);
  }

  return fs.readFileSync(sourcePath, "utf8").trim();
}

function liveModelConfig() {
  if (liveFixtureMode()) {
    return {
      id: "fixture-live-ui",
      label: "Fixture Live UI",
      provider: "fixture",
      model: "deterministic-test-fixture",
      reasoning_effort: null,
      local: true,
      fixture: true,
    };
  }

  const model =
    process.env.JUDGMENTKIT_UI_EVAL_MODEL ??
    process.env.JUDGMENTKIT_UI_LIVE_MODEL ??
    "gpt-5.5";
  const reasoningEffort =
    process.env.JUDGMENTKIT_UI_EVAL_REASONING_EFFORT ??
    process.env.JUDGMENTKIT_UI_LIVE_REASONING_EFFORT ??
    "high";

  return {
    id: slug(`${model}-codex`) || "codex-live-ui",
    label: `${model} Codex`,
    provider: "codex",
    model,
    reasoning_effort: reasoningEffort,
    local: false,
    fixture: false,
  };
}

function buildSyntheticWorkflowCandidate(testCase) {
  const activityTerms = arrayOrEmpty(testCase.rubric_terms?.activity_fit);
  const decisionTerms = arrayOrEmpty(testCase.rubric_terms?.decision_support);
  const handoffTerms = arrayOrEmpty(testCase.rubric_terms?.handoff_completeness);
  const taskTerms = arrayOrEmpty(testCase.rubric_terms?.task_success_support);

  return {
    workflow: {
      surface_name: testCase.title,
      topology: "workspace",
      work_units: [...new Set([...activityTerms, ...taskTerms])].slice(0, 6),
      primary_actions: [...new Set([...decisionTerms, ...handoffTerms])].slice(0, 7),
      decision_points: arrayOrEmpty(testCase.expected_outcomes).slice(0, 2),
      completion_state:
        arrayOrEmpty(testCase.expected_outcomes).find((outcome) =>
          outcome.toLowerCase().includes("handoff") ||
          outcome.toLowerCase().includes("playlist"),
        ) ?? testCase.task_prompt,
    },
    surface_set: [
      {
        name: `${testCase.title} workspace`,
        purpose: testCase.task_prompt,
        sections: [...new Set([...activityTerms, ...taskTerms, ...handoffTerms])].slice(0, 8),
        controls: [...new Set([...decisionTerms, ...handoffTerms])].slice(0, 8),
        relationship_to_workflow:
          "Keeps domain evidence, primary decisions, and completion handoff in one review workspace.",
      },
    ],
    handoff: {
      next_owner: handoffTerms.find((term) => /owner|agent|reviewer|host/i.test(term)) ?? "Domain owner",
      reason:
        arrayOrEmpty(testCase.expected_outcomes)[0] ??
        "The generated UI must support the activity outcome.",
      next_action:
        handoffTerms.find((term) => /handoff|save|share|ready/i.test(term)) ??
        testCase.task_prompt,
    },
    diagnostics: {
      implementation_terms: arrayOrEmpty(testCase.implementation_leakage_terms),
      reveal_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

function buildGuidedGenerationContext(testCase, sourceBrief) {
  const activityReview = createActivityModelReview(sourceBrief);
  const workflowReview = reviewUiWorkflowCandidate(
    sourceBrief,
    buildSyntheticWorkflowCandidate(testCase),
    { activity_review: activityReview },
  );
  const handoff = createUiGenerationHandoff(workflowReview);
  const implementationContract = createUiImplementationContract({
    repo_name: "JudgmentKit live UI eval",
    target_stack: "standalone HTML/CSS",
  });
  const frontendContext = createFrontendGenerationContext({
    ui_generation_handoff: handoff,
    frontend_context: {
      target_runtime: "standalone HTML/CSS",
      ui_library: "none",
      approved_component_families: [
        "queue or list",
        "detail workspace",
        "decision controls",
        "handoff or completion panel",
      ],
      files_or_entrypoints: ["live-generated-artifact.html"],
    },
    verification: {
      commands: ["npm run eval:ui:live"],
      browser_checks: ["desktop screenshot", "mobile screenshot"],
      states_to_verify: ["selected work item", "primary decision", "completion handoff"],
    },
  });
  const frontendSkillContext = createFrontendImplementationSkillContext({
    frontend_generation_context: frontendContext,
    target_client: "live-ui-generation-eval",
  });

  return {
    activity_model: handoff.activity_model,
    interaction_contract: handoff.interaction_contract,
    workflow: handoff.workflow,
    surface_set: handoff.surface_set,
    handoff: handoff.handoff,
    disclosure_reminders: handoff.disclosure_reminders,
    generation_gates: handoff.generation_gates,
    implementation_contract: {
      status: implementationContract.implementation_contract_status,
      approved_primitives: implementationContract.implementation_contract.approved_primitives,
      design_system_source: implementationContract.implementation_contract.design_system_source,
      browser_qa: implementationContract.implementation_contract.browser_qa,
      accessibility_policy: implementationContract.implementation_contract.accessibility_policy,
    },
    frontend_context: {
      status: frontendContext.frontend_context_status,
      target_runtime: frontendContext.frontend_context?.target_runtime,
      verification: frontendContext.verification,
    },
    frontend_skill_context: {
      status: frontendSkillContext.frontend_skill_context_status,
      design_system_mode: frontendSkillContext.design_system_mode,
      verification_checklist: frontendSkillContext.verification_checklist,
    },
  };
}

function liveGenerationPrompt(testCase, variant, sourceBrief, guidedContext) {
  const hiddenTerms = arrayOrEmpty(testCase.hidden_treatment_terms);
  const sourcePacket = {
    task_prompt: testCase.task_prompt,
    source_brief: sourceBrief,
    source_facts: arrayOrEmpty(testCase.live_generation?.source_facts),
    expected_outcomes: arrayOrEmpty(testCase.expected_outcomes),
  };
  const treatmentGuidance =
    variant.treatment === "judgmentkit_handoff"
      ? [
          "Use the JudgmentKit handoff context below as generation constraints.",
          "The primary UI must translate implementation details into domain language.",
          "Primary structure should support the user's activity, decisions, evidence, and completion handoff.",
          "Do not expose prompts, schemas, resource ids, tool calls, MCP, JudgmentKit, review packets, or benchmark language in the product surface.",
          `JudgmentKit handoff context:\n${compactJson(guidedContext)}`,
        ]
      : [
          "Follow the source request as written, including implementation-heavy framing when it appears in the source.",
          "Do not use JudgmentKit handoff context. Work from the source brief only.",
        ];

  return [
    "Generate one standalone product UI surface for a live UI-generation eval.",
    "Return JSON only. Do not include Markdown fences.",
    "Output fields: title, body_html, css, generation_notes.",
    "body_html must be the contents that will be wrapped inside <main data-primary-surface>; do not include html, head, body, script, or style tags.",
    "css must be scoped plain CSS for this standalone artifact; do not import fonts, packages, images, or external assets.",
    "Use semantic HTML controls where useful. Keep all text ASCII.",
    "Do not write benchmark commentary, treatment labels, scoring language, or evaluator notes into body_html.",
    `Never include these hidden terms in body_html: ${hiddenTerms.join(", ")}.`,
    "",
    ...treatmentGuidance,
    "",
    `Case id: ${testCase.id}`,
    `Case title: ${testCase.title}`,
    `Source packet:\n${compactJson(sourcePacket)}`,
  ].join("\n");
}

function normalizeGeneratedBodyHtml(bodyHtml) {
  let html = String(bodyHtml ?? "");
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    html = bodyMatch[1];
  }

  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").trim();
}

function normalizeGeneratedCss(css) {
  return String(css ?? "")
    .replace(/<style[^>]*>/gi, "")
    .replace(/<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .trim();
}

function escapeScriptJson(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function buildLiveStandaloneHtml({ testCase, variant, generated, metadata }) {
  const title = generated.title?.trim() || `${testCase.title} ${variant.label}`;
  const bodyHtml = normalizeGeneratedBodyHtml(generated.body_html);
  const css = normalizeGeneratedCss(generated.css);

  if (!bodyHtml) {
    throw new Error(`${testCase.id}/${variant.id} generated empty body_html.`);
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 320px; }
    button, input, select, textarea { font: inherit; }
${css}
  </style>
</head>
<body data-comparison-id="${escapeHtml(testCase.id)}" data-live-generated="true">
  <main data-primary-surface>
${bodyHtml}
  </main>
  <script type="application/json" id="comparison-metadata">${escapeScriptJson(metadata)}</script>
</body>
</html>
`;
}

function fixtureGeneratedUi(testCase, variant) {
  const guided = variant.treatment === "judgmentkit_handoff";
  const activityTerms = arrayOrEmpty(testCase.rubric_terms?.activity_fit);
  const decisionTerms = arrayOrEmpty(testCase.rubric_terms?.decision_support);
  const handoffTerms = arrayOrEmpty(testCase.rubric_terms?.handoff_completeness);
  const taskTerms = arrayOrEmpty(testCase.rubric_terms?.task_success_support);
  const confidenceTerms = arrayOrEmpty(testCase.rubric_terms?.confidence_rework_signals);
  const implementationTerms = arrayOrEmpty(testCase.implementation_leakage_terms).slice(0, 8);
  const domainTerms = [...activityTerms, ...decisionTerms, ...handoffTerms, ...taskTerms, ...confidenceTerms];
  const bodyTerms = guided ? domainTerms : implementationTerms;

  return {
    title: `${testCase.title} ${guided ? "guided" : "baseline"} fixture`,
    body_html: `
      <section class="fixture-shell">
        <header>
          <p>${guided ? "Domain workspace" : "Admin generator console"}</p>
          <h1>${escapeHtml(testCase.title)}</h1>
          <p>${escapeHtml(testCase.task_prompt)}</p>
        </header>
        <section>
          <h2>${guided ? "Work evidence" : "Implementation record"}</h2>
          <ul>${bodyTerms.map((term) => `<li>${escapeHtml(term)}</li>`).join("")}</ul>
        </section>
        <section>
          <h2>${guided ? "Completion" : "System fields"}</h2>
          <p>${escapeHtml(arrayOrEmpty(testCase.expected_outcomes).join(" "))}</p>
        </section>
      </section>
    `,
    css: `
      :root { color-scheme: light; font-family: system-ui, sans-serif; color: #1d2730; background: #f6f8fa; }
      .fixture-shell { min-height: 100vh; padding: 28px; display: grid; gap: 18px; }
      section { border: 1px solid #cbd5df; border-radius: 8px; background: #fff; padding: 18px; }
      header { border-bottom: 1px solid #d7dee7; padding-bottom: 18px; }
      h1, h2, p { margin-top: 0; }
      li { margin-top: 8px; }
    `,
    generation_notes: ["Deterministic fixture artifact for live harness tests."],
  };
}

function runCodexLiveGeneration(prompt, modelConfig, outputSchemaPath, outputFilePath) {
  const args = [
    "exec",
    "--model",
    modelConfig.model,
    "-c",
    `model_reasoning_effort="${modelConfig.reasoning_effort}"`,
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
    "--ephemeral",
    "--color",
    "never",
    "--output-schema",
    outputSchemaPath,
    "--output-last-message",
    outputFilePath,
    "-",
  ];
  const execution = spawnSync("codex", args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    input: prompt,
    maxBuffer: 80 * 1024 * 1024,
    timeout: Number(process.env.JUDGMENTKIT_UI_LIVE_GENERATION_TIMEOUT_MS ?? 900_000),
  });

  if (execution.error) throw execution.error;
  if (execution.status !== 0) {
    throw new Error(`codex live UI generation failed with status ${execution.status}\n${execution.stderr}`);
  }

  return {
    runtime: "codex exec",
    status: execution.status,
    stdout_sha256: hash(execution.stdout ?? ""),
    stderr_sha256: hash(execution.stderr ?? ""),
    command_display: `codex ${args
      .map((arg) => (arg === outputSchemaPath ? "<schema>" : arg === outputFilePath ? "<output>" : arg))
      .join(" ")}`,
  };
}

function parseGeneratedUi(rawResponse, testCase, variant) {
  let parsed;
  try {
    parsed = JSON.parse(rawResponse);
  } catch (error) {
    throw new Error(`${testCase.id}/${variant.id} live UI output was not JSON: ${error.message}`);
  }

  for (const field of LIVE_UI_OUTPUT_SCHEMA.required) {
    if (parsed[field] === undefined) {
      throw new Error(`${testCase.id}/${variant.id} live UI output missing ${field}.`);
    }
  }

  return parsed;
}

async function generateLiveVariant(testCase, variant, sourceBrief, guidedContext, runInfo, modelConfig) {
  const prompt = liveGenerationPrompt(testCase, variant, sourceBrief, guidedContext);
  const startedAt = Date.now();
  let rawResponse;
  let execution;
  let generated;

  if (modelConfig.fixture) {
    generated = fixtureGeneratedUi(testCase, variant);
    rawResponse = JSON.stringify(generated);
    execution = {
      runtime: "fixture",
      status: 0,
      stdout_sha256: null,
      stderr_sha256: null,
      command_display: "fixture live UI generation",
    };
  } else {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-live-ui-generation-"));
    const outputSchemaPath = path.join(tempDir, "live-ui-output-schema.json");
    const outputFilePath = path.join(tempDir, `${testCase.id}-${variant.id}.json`);
    fs.writeFileSync(outputSchemaPath, JSON.stringify(LIVE_UI_OUTPUT_SCHEMA, null, 2));
    execution = runCodexLiveGeneration(prompt, modelConfig, outputSchemaPath, outputFilePath);
    rawResponse = fs.readFileSync(outputFilePath, "utf8");
    generated = parseGeneratedUi(rawResponse, testCase, variant);
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }

  const durationMs = Date.now() - startedAt;
  const generatedAt = liveGeneratedAt();
  const artifactDir = path.join(runInfo.runDir, "generated-artifacts", testCase.id);
  fs.mkdirSync(artifactDir, { recursive: true });
  const artifactPath = path.join(artifactDir, `${variant.id}.html`);
  const metadata = {
    comparison_id: testCase.id,
    variant: variant.id,
    treatment: variant.treatment,
    task_prompt: testCase.task_prompt,
    generation_source: {
      mode: modelConfig.fixture ? "fixture" : "live_provider",
      provider: modelConfig.provider,
      model: modelConfig.model,
      model_config_id: modelConfig.id,
      reasoning_effort: modelConfig.reasoning_effort,
      generated_at: generatedAt,
      duration_ms: durationMs,
      prompt_sha256: hash(prompt),
      raw_response_sha256: hash(rawResponse),
      runner: "evals/run-ui-generation-evals.mjs",
    },
  };

  fs.writeFileSync(
    artifactPath,
    stripTrailingWhitespace(buildLiveStandaloneHtml({
      testCase,
      variant,
      generated,
      metadata,
    })),
  );

  return {
    artifact: repoRelativePath(artifactPath),
    live_generation: {
      mode: modelConfig.fixture ? "fixture" : "live_provider",
      provider: modelConfig.provider,
      model: modelConfig.model,
      model_config_id: modelConfig.id,
      reasoning_effort: modelConfig.reasoning_effort,
      generated_at: generatedAt,
      duration_ms: durationMs,
      prompt_sha256: hash(prompt),
      raw_response_sha256: hash(rawResponse),
      artifact: repoRelativePath(artifactPath),
      generated_artifact_path: runRelativePath(runInfo.baseReportsDir, artifactPath),
      generation_notes: generated.generation_notes,
      execution,
    },
  };
}

async function prepareLiveGeneratedCases(cases, runInfo, modelConfig) {
  const liveArtifacts = [];
  const preparedCases = [];

  for (const testCase of cases) {
    validateCase(testCase);
    const sourceBrief = readSourceBrief(testCase);
    const guidedContext = buildGuidedGenerationContext(testCase, sourceBrief);
    const variants = [];

    for (const variant of testCase.variants) {
      const generatedVariant = await generateLiveVariant(
        testCase,
        variant,
        sourceBrief,
        guidedContext,
        runInfo,
        modelConfig,
      );
      const preparedVariant = {
        ...variant,
        artifact: generatedVariant.artifact,
        public_artifact: null,
        live_generation: generatedVariant.live_generation,
      };
      variants.push(preparedVariant);
      liveArtifacts.push({
        case_id: testCase.id,
        variant_id: variant.id,
        treatment: variant.treatment,
        artifact: generatedVariant.live_generation.generated_artifact_path,
        repo_artifact: generatedVariant.artifact,
        provider: modelConfig.provider,
        model: modelConfig.model,
        generated_at: generatedVariant.live_generation.generated_at,
        duration_ms: generatedVariant.live_generation.duration_ms,
        prompt_sha256: generatedVariant.live_generation.prompt_sha256,
        raw_response_sha256: generatedVariant.live_generation.raw_response_sha256,
      });
    }

    preparedCases.push({
      ...testCase,
      variants,
    });
  }

  return {
    cases: preparedCases,
    live_generation: {
      enabled: true,
      mode: modelConfig.fixture ? "fixture" : "live_provider",
      provider: modelConfig.provider,
      model: modelConfig.model,
      model_config_id: modelConfig.id,
      reasoning_effort: modelConfig.reasoning_effort,
      runtime: modelConfig.fixture ? "fixture" : "codex exec",
      local: modelConfig.local,
      generated_artifacts_dir: runRelativePath(
        runInfo.baseReportsDir,
        path.join(runInfo.runDir, "generated-artifacts"),
      ),
      artifacts: liveArtifacts,
    },
  };
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

function uiPublicationAssessment(summary, generationMode) {
  const blockers = [];
  if ((summary.failed ?? 0) > 0) blockers.push("failed-cases");
  if ((summary.baseline_wins ?? 0) > 0) blockers.push("baseline-wins");
  if ((summary.ties ?? 0) > 0) blockers.push("ties");
  if (generationMode === "fixture") blockers.push("fixture-generation");

  return {
    publishable: blockers.length === 0,
    publishability_status: blockers.length === 0 ? "publishable" : "not-publishable",
    publish_blockers: blockers,
    publishability_policy:
      "Conservative UI eval publication requires no failed cases, baseline wins, or ties; fixture runs are never publishable as live evidence.",
  };
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

function evalMode() {
  if (
    process.argv.includes("--live") ||
    process.argv.includes("--live-generate") ||
    process.env.JUDGMENTKIT_UI_EVAL_MODE === "live"
  ) {
    return "live";
  }

  return "static";
}

function liveFixtureMode() {
  return process.env.JUDGMENTKIT_UI_EVAL_LIVE_FIXTURE === "1";
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

function screenshotViewportMetadata(viewport) {
  return {
    id: viewport.id,
    label: viewport.label,
    width: viewport.width,
    height: viewport.height,
    device_scale_factor: viewport.device_scale_factor,
    mobile: viewport.mobile,
  };
}

async function captureArtifactScreenshot(client, variant, viewport, screenshotPath) {
  const artifactPath = resolveRepoPath(variant.artifact);
  const target = await client.send("Target.createTarget", { url: "about:blank" });
  const attached = await client.send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  });
  const sessionId = attached.sessionId;

  try {
    await client.send("Page.enable", {}, sessionId);
    await client.send("Runtime.enable", {}, sessionId);
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.device_scale_factor,
      mobile: viewport.mobile,
    }, sessionId);

    const loadEvent = client.waitFor("Page.loadEventFired", sessionId);
    await client.send("Page.navigate", {
      url: pathToFileURL(artifactPath).href,
    }, sessionId);
    await loadEvent;
    await client.send("Runtime.evaluate", {
      expression:
        "document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true",
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    await delay(150);

    const capture = await client.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    }, sessionId);
    const png = Buffer.from(capture.data, "base64");
    assertPng(png, screenshotPath);
    fs.writeFileSync(screenshotPath, png);
  } finally {
    await client.send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
  }
}

async function withChromeClient(callback) {
  const chromeExecutable = resolveChromeExecutable();
  const port = await findAvailablePort();
  const userDataDir = createChromeUserDataDir();
  let stderr = "";
  const chrome = spawn(chromeExecutable, [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--force-color-profile=srgb",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  });

  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  let client;
  try {
    const version = await waitForChromeVersion(port, () => stderr);
    client = await connectCdp(version.webSocketDebuggerUrl);
    return await callback(client);
  } finally {
    if (client) {
      client.close();
    }
    chrome.kill("SIGTERM");
    await delay(150);
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

async function attachVisualEvidence(results, runInfo) {
  await withChromeClient(async (client) => {
    for (const result of results) {
      const screenshotDir = path.join(runInfo.runDir, "screenshots", result.id);
      fs.mkdirSync(screenshotDir, { recursive: true });

      for (const variant of result.variants) {
        const screenshots = [];

        for (const viewport of SCREENSHOT_VIEWPORTS) {
          const filename = `${variant.id}-${viewport.id}.png`;
          const screenshotPath = path.join(screenshotDir, filename);
          await captureArtifactScreenshot(client, variant, viewport, screenshotPath);
          screenshots.push({
            id: `${variant.id}-${viewport.id}`,
            label: `${variant.label} ${viewport.label}`,
            viewport: screenshotViewportMetadata(viewport),
            path: runRelativePath(runInfo.baseReportsDir, screenshotPath),
            artifact: variant.public_artifact ?? variant.artifact,
          });
        }

        variant.screenshots = screenshots;
      }
    }
  });
}

function buildReport(results, runInfo, options = {}) {
  const guidedWins = results.filter((result) => result.winner === "judgmentkit_handoff").length;
  const baselineWins = results.filter((result) => result.winner === "raw_brief_baseline").length;
  const ties = results.filter((result) => result.winner === "tie").length;
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const generationMode = options.liveGeneration?.mode ?? "static";
  const summary = {
    cases: results.length,
    passed,
    failed,
    guided_wins: guidedWins,
    baseline_wins: baselineWins,
    ties,
  };
  const generation = options.liveGeneration
    ? {
        mode: generationMode,
        live: true,
        provider: options.liveGeneration.provider,
        model: options.liveGeneration.model,
        model_config_id: options.liveGeneration.model_config_id,
        reasoning_effort: options.liveGeneration.reasoning_effort,
        runtime: options.liveGeneration.runtime,
        local: options.liveGeneration.local,
        generated_artifacts_dir: options.liveGeneration.generated_artifacts_dir,
        artifacts: options.liveGeneration.artifacts,
      }
    : {
        mode: "static",
        live: false,
        static_artifact_scoring: true,
      };
  const providerMetadata = options.liveGeneration
    ? {
        provider: options.liveGeneration.provider,
        model_config_id: options.liveGeneration.model_config_id,
        model: options.liveGeneration.model,
        runtime: options.liveGeneration.runtime,
        local: options.liveGeneration.local,
      }
    : null;

  return {
    eval_id: EVAL_ID,
    evaluation_type: options.liveGeneration ? LIVE_EVALUATION_TYPE : STATIC_EVALUATION_TYPE,
    generation_policy: options.liveGeneration
      ? generationMode === "fixture"
        ? FIXTURE_GENERATION_POLICY
        : LIVE_GENERATION_POLICY
      : STATIC_GENERATION_POLICY,
    visual_evidence: {
      capture_engine: SCREENSHOT_ENGINE,
      capture_policy: options.liveGeneration ? LIVE_SCREENSHOT_POLICY : SCREENSHOT_POLICY,
      viewports: SCREENSHOT_VIEWPORTS.map(screenshotViewportMetadata),
    },
    benchmark_policy:
      options.liveGeneration
        ? "Qualitative paired-artifact evidence from live provider-generated artifacts only; not a statistically powered benchmark."
        : "Qualitative paired-artifact evidence only; not a statistically powered benchmark.",
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
      ...summary,
      ...uiPublicationAssessment(summary, generationMode),
    },
    metric_scale: {
      metric_score: "0-5",
      total_score: "0-100 weighted",
    },
    generation,
    ...(options.liveGeneration
      ? {
          live_generation: {
            policy: generationMode === "fixture" ? FIXTURE_GENERATION_POLICY : LIVE_GENERATION_POLICY,
            provider_metadata: providerMetadata,
            generated_artifacts_dir: options.liveGeneration.generated_artifacts_dir,
            artifacts: options.liveGeneration.artifacts,
          },
          provider_metadata: providerMetadata,
        }
      : {}),
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

function screenshotForViewport(variant, viewportId) {
  return variant.screenshots?.find((screenshot) => screenshot.viewport.id === viewportId);
}

function screenshotHref(screenshot, runInfo) {
  return path
    .relative(runInfo.runDir, path.join(runInfo.baseReportsDir, screenshot.path))
    .split(path.sep)
    .join("/");
}

function htmlScreenshotCard(result, variant, screenshot, runInfo) {
  const href = screenshotHref(screenshot, runInfo);
  const alt = `${result.title} ${treatmentLabel(variant.treatment)} ${screenshot.viewport.label} screenshot`;

  return `
    <article class="screenshot-card ${variant.treatment === "judgmentkit_handoff" ? "guided" : "baseline"}">
      <div class="screenshot-card-header">
        <div>
          <p class="eyebrow">${escapeHtml(treatmentLabel(variant.treatment))}</p>
          <h4>${escapeHtml(screenshot.label)}</h4>
        </div>
        <span>${escapeHtml(screenshot.viewport.width)}x${escapeHtml(screenshot.viewport.height)}</span>
      </div>
      <a class="screenshot-frame" href="${escapeHtml(href)}" aria-label="Open ${escapeHtml(alt)}">
        <img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}" loading="eager">
      </a>
      <div class="screenshot-actions">
        <a href="${escapeHtml(href)}">Open screenshot</a>
        <a href="${escapeHtml(variantHref(variant, runInfo.runDir))}">Open artifact</a>
      </div>
    </article>
  `;
}

function htmlVisualEvidence(result, runInfo, report) {
  const baseline = variantByTreatment(result, "raw_brief_baseline");
  const guided = variantByTreatment(result, "judgmentkit_handoff");
  const desktopScreenshots = [baseline, guided].map((variant) => ({
    variant,
    screenshot: screenshotForViewport(variant, "desktop"),
  }));
  const mobileScreenshots = [baseline, guided].map((variant) => ({
    variant,
    screenshot: screenshotForViewport(variant, "mobile"),
  }));

  return `
    <section class="visual-evidence" aria-label="${escapeHtml(result.title)} visual evidence">
      <div class="section-heading">
        <h3>Visual evidence</h3>
        <p>${escapeHtml(report.visual_evidence.capture_policy)}</p>
      </div>
      <div class="screenshot-grid desktop-screenshots">
        ${desktopScreenshots.map(({ variant, screenshot }) => htmlScreenshotCard(result, variant, screenshot, runInfo)).join("")}
      </div>
      <details class="mobile-screenshots">
        <summary>Mobile screenshots</summary>
        <div class="screenshot-grid">
          ${mobileScreenshots.map(({ variant, screenshot }) => htmlScreenshotCard(result, variant, screenshot, runInfo)).join("")}
        </div>
      </details>
    </section>
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

function htmlCase(result, runInfo, report) {
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
        ${htmlVariantScore(baseline, runInfo.runDir)}
        <div class="score-delta">
          <span>${escapeHtml(signedNumber(result.score_delta))}</span>
          <small>guided delta</small>
        </div>
        ${htmlVariantScore(guided, runInfo.runDir)}
      </div>
      ${htmlVisualEvidence(result, runInfo, report)}
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

function reportLede(report) {
  if (report.generation?.live) {
    return "Live provider-generated paired UI evidence for dated standalone artifacts. Use this report to review winner, delta, leakage, activity-fit evidence, and generation provenance by case.";
  }

  return "Deterministic paired-artifact scoring for existing standalone comparison apps. Use this report to review winner, delta, leakage, and activity-fit evidence by case.";
}

function htmlGenerationSummary(report, runInfo) {
  const generation = report.generation ?? {};
  const artifacts = generation.artifacts ?? [];
  const artifactRows = artifacts
    .map(
      (artifact) => `
        <tr>
          <td>${escapeHtml(artifact.case_id)}</td>
          <td>${escapeHtml(treatmentLabel(artifact.treatment))}</td>
          <td><a href="${escapeHtml(path.relative(runInfo.runDir, resolveRepoPath(artifact.repo_artifact ?? artifact.artifact)).split(path.sep).join("/"))}">${escapeHtml(artifact.artifact)}</a></td>
          <td>${escapeHtml(artifact.generated_at)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <section class="generation-panel" aria-label="Generation provenance">
      <div>
        <p class="eyebrow">Generation policy</p>
        <h2>${escapeHtml(generation.live ? "Live provider artifacts" : "Static artifact scoring")}</h2>
        <p>${escapeHtml(report.generation_policy)}</p>
      </div>
      <dl class="generation-meta">
        <div><dt>Mode</dt><dd>${escapeHtml(generation.mode ?? "static")}</dd></div>
        <div><dt>Provider</dt><dd>${escapeHtml(generation.provider ?? "none")}</dd></div>
        <div><dt>Model</dt><dd>${escapeHtml(generation.model ?? "none")}</dd></div>
        <div><dt>Publishable</dt><dd>${escapeHtml(report.summary.publishability_status)}</dd></div>
      </dl>
      ${
        artifacts.length > 0
          ? `<div class="table-wrap generation-artifacts">
        <table>
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th scope="col">Variant</th>
              <th scope="col">Artifact</th>
              <th scope="col">Generated</th>
            </tr>
          </thead>
          <tbody>${artifactRows}</tbody>
        </table>
      </div>`
          : ""
      }
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
    h1, h2, h3, h4, p { margin-top: 0; }
    h1 { max-width: 760px; margin-bottom: 10px; font-size: 2rem; line-height: 1.08; }
    h2 { margin-bottom: 8px; font-size: 1.3rem; line-height: 1.2; }
    h3 { margin-bottom: 6px; font-size: 1rem; line-height: 1.25; }
    h4 { margin-bottom: 0; font-size: 0.95rem; line-height: 1.25; }
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
	    .generation-panel {
	      display: grid;
	      gap: 14px;
	      padding: 18px;
	      border: 1px solid var(--line);
	      border-radius: 8px;
	      background: var(--panel);
	    }
	    .generation-panel p:last-child { margin-bottom: 0; color: var(--muted); }
	    .generation-meta {
	      display: grid;
	      grid-template-columns: repeat(4, minmax(0, 1fr));
	      border: 1px solid var(--line);
	      border-radius: 8px;
	      overflow: hidden;
	    }
	    .generation-meta div {
	      min-width: 0;
	      padding: 12px;
	      border-right: 1px solid var(--line);
	    }
	    .generation-meta div:last-child { border-right: 0; }
	    .generation-artifacts table { min-width: 820px; }
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
    .visual-evidence {
      display: grid;
      gap: 12px;
    }
    .screenshot-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .screenshot-card {
      min-width: 0;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    .screenshot-card.guided { border-color: #a8d5c8; background: #fbfffd; }
    .screenshot-card-header {
      display: flex;
      gap: 12px;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .screenshot-card-header > div { min-width: 0; }
    .screenshot-card-header span {
      color: var(--muted);
      font-size: 0.8rem;
      font-weight: 760;
      white-space: nowrap;
    }
    .screenshot-frame {
      display: block;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #ffffff;
    }
    .screenshot-frame img {
      display: block;
      width: 100%;
      max-height: 420px;
      object-fit: contain;
      background: #ffffff;
    }
    .screenshot-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      margin-top: 10px;
      font-size: 0.9rem;
    }
    .mobile-screenshots {
      padding-top: 4px;
    }
    .mobile-screenshots .screenshot-grid {
      margin-top: 12px;
    }
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
      .screenshot-grid,
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
	        <p class="lede">${escapeHtml(reportLede(report))}</p>
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
	          <div><dt>Generation</dt><dd>${escapeHtml(report.generation?.mode ?? "static")}</dd></div>
	          <div><dt>Publication</dt><dd>${escapeHtml(report.summary.publishability_status)}</dd></div>
	        </dl>
	      </section>
	      ${htmlGenerationSummary(report, runInfo)}
	      <p class="notice">${escapeHtml(report.generation_policy)}</p>
	      <p class="notice">${escapeHtml(report.benchmark_policy)}</p>
	    </header>
	    ${report.results.map((result) => htmlCase(result, runInfo, report)).join("")}
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

async function main() {
  const cases = readJson(CASES_PATH);
  const mode = evalMode();
  const baseReportsDir = reportsDir();
  const runInfo = createRunPaths({
    baseReportsDir,
    date: runDate(),
    mcpVersion: mcpReleaseVersion(),
  });

  try {
    const modelConfig = mode === "live" ? liveModelConfig() : null;
    const prepared = mode === "live"
      ? await prepareLiveGeneratedCases(cases, runInfo, modelConfig)
      : { cases, live_generation: null };
    const results = prepared.cases.map(evaluateCase);
    await attachVisualEvidence(results, runInfo);
    const report = buildReport(results, runInfo, {
      liveGeneration: prepared.live_generation,
    });
    const catalog = writeReport(report, runInfo);

    console.log("# JudgmentKit UI-Generation Eval");
    console.log(`Mode: ${report.generation.mode}`);
    if (report.generation.live) {
      console.log(`Live provider: ${report.generation.provider} ${report.generation.model}`);
      console.log(`Generated artifacts: ${repoRelativeOrAbsolute(path.join(runInfo.runDir, "generated-artifacts"))}`);
    }
    console.log(`Report: ${repoRelativeOrAbsolute(runInfo.jsonReportPath)}`);
    console.log(`HTML: ${repoRelativeOrAbsolute(runInfo.htmlReportPath)}`);
    console.log(`Catalog: ${repoRelativeOrAbsolute(path.join(baseReportsDir, CATALOG_JSON_FILENAME))}`);
    console.log(`Catalog HTML: ${repoRelativeOrAbsolute(path.join(baseReportsDir, CATALOG_HTML_FILENAME))}`);
    console.log(`Screenshots: ${repoRelativeOrAbsolute(path.join(runInfo.runDir, "screenshots"))}`);
    console.log(
      `Summary: ${report.summary.guided_wins}/${report.summary.cases} JudgmentKit-guided wins, ${report.summary.failed} failed thresholds, claim level ${report.claim_level}, publication ${report.summary.publishability_status}, ${runInfo.date}/${runInfo.releaseSegment}/${runInfo.runId}`,
    );
    console.log(`Latest: ${catalog.latest?.html_report ?? "none"}`);

    if (report.summary.failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    fs.rmSync(runInfo.runDir, { recursive: true, force: true });
    throw error;
  }
}

main().catch((error) => {
  console.error(`UI eval report generation failed: ${error.message}`);
  process.exitCode = 1;
});
