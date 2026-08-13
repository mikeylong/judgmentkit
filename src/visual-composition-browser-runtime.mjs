import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

import chromium from "@sparticuz/chromium";

const MAX_HTML_BYTES = 128 * 1024;
const MAX_SAMPLES = 100;
const MAX_SAMPLES_PER_VIEWPORT = MAX_SAMPLES / 2;
const BROWSER_START_TIMEOUT_MS = 12_000;
const CDP_TIMEOUT_MS = 15_000;
const VIEWPORTS = Object.freeze([
  Object.freeze({
    id: "desktop",
    width: 1365,
    height: 900,
    device_scale_factor: 1,
    mobile: false,
  }),
  Object.freeze({
    id: "mobile",
    width: 390,
    height: 844,
    device_scale_factor: 1,
    mobile: true,
  }),
]);

const CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "connect-src 'none'",
  "font-src data:",
  "form-action 'none'",
  "frame-src 'none'",
  "img-src data: blob:",
  "media-src data: blob:",
  "object-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "worker-src 'none'",
].join("; ");

const SETTLE_EXPRESSION = `
  (async () => {
    const timeout = new Promise((resolve) => setTimeout(resolve, 5000));
    if (document.fonts?.ready) await Promise.race([document.fonts.ready, timeout]);
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)
    ));
    window.scrollTo(0, 0);
    return {
      fonts_ready: !document.fonts || document.fonts.status === "loaded",
      scroll_x: window.scrollX,
      scroll_y: window.scrollY,
    };
  })()
`;

const HTML_FIELD_NAMES = [
  "rendered_html",
  "renderedHtml",
  "rendered_markup",
  "renderedMarkup",
  "markup",
];

const DECLARATION_FIELDS = [
  "rule_id",
  "calibration_ref",
  "component_family",
  "selector",
  "target_selector",
  "member_selector",
  "presentation_owner",
  "composition_variant",
  "container_selector",
  "label_selector",
  "indicator_selector",
  "asset_selector",
  "lockup_id",
  "active_query",
  "state_id",
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function sha256(...parts) {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function nonRenderable(reason = "visual_composition_candidate_not_renderable") {
  return { manifest: null, receipt: null, reason };
}

function htmlLike(value) {
  if (typeof value !== "string") return false;
  return /<(!doctype\s+html|html|head|body|style|script|main|section|article|div|button|select|label|a|h[1-6]|svg)\b/i.test(
    value,
  );
}

function unsafeHtml(source) {
  return [
    /<\s*script\b/i,
    /\s+on[a-z][a-z0-9_-]*\s*=/i,
    /javascript\s*:/i,
    /<\s*(?:iframe|object|embed|base)\b/i,
    /<\s*meta\b[^>]*http-equiv\s*=\s*(?:["']\s*)?refresh\b/i,
    /@import\b/i,
    /(?:src|href)\s*=\s*(?:["']\s*)?(?:https?:|file:|wss?:|ftp:|\/\/)/i,
    /url\(\s*(?:["']\s*)?(?:https?:|file:|wss?:|ftp:|\/\/)/i,
  ].some((pattern) => pattern.test(source));
}

function candidateHtml(candidate) {
  if (typeof candidate === "string") {
    return htmlLike(candidate) && !unsafeHtml(candidate) ? candidate : null;
  }
  if (!isPlainObject(candidate)) return null;

  const candidates = [];
  for (const key of HTML_FIELD_NAMES) {
    if (htmlLike(candidate[key])) candidates.push(candidate[key]);
  }

  const code = candidate.code;
  if (
    htmlLike(code) &&
    !/(?:^|\n)\s*(?:import|export)\s/m.test(code) &&
    !/<[A-Z][A-Za-z0-9]*(?:\s|\/?>)/.test(code)
  ) {
    candidates.push(code);
  }
  if (candidates.length !== 1 || unsafeHtml(candidates[0])) return null;
  return candidates[0];
}

function securedHtml(source) {
  const security = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
  const settleStyles =
    "<style data-judgmentkit-runtime>*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}</style>";
  if (/<html\b/i.test(source)) {
    if (/<head\b[^>]*>/i.test(source)) {
      return source.replace(/<head\b[^>]*>/i, (head) => `${head}${security}${settleStyles}`);
    }
    return source.replace(
      /<html\b[^>]*>/i,
      (html) => `${html}<head>${security}${settleStyles}</head>`,
    );
  }
  return `<!doctype html><html><head>${security}${settleStyles}</head><body>${source}</body></html>`;
}

function inputManifest(candidate) {
  if (!isPlainObject(candidate)) return null;
  const browserQa = isPlainObject(candidate.browser_qa)
    ? candidate.browser_qa
    : isPlainObject(candidate.browserQa)
      ? candidate.browserQa
      : {};
  return (
    candidate.visual_composition_manifest ??
    candidate.visualCompositionManifest ??
    browserQa.visual_composition_manifest ??
    browserQa.visualCompositionManifest ??
    null
  );
}

function explicitDeclarations(candidate) {
  const manifest = inputManifest(candidate);
  const source = Array.isArray(manifest?.samples)
    ? manifest.samples
    : Array.isArray(manifest?.relationships)
      ? manifest.relationships
      : [];
  return source.map((manifestSample, index) => {
    const sample = isPlainObject(manifestSample) ? manifestSample : {};
    const declaredRuleId = optionalString(sample.rule_id ?? sample.ruleId);
    const declaration = {
      sample_id: optionalString(sample.sample_id ?? sample.sampleId ?? sample.id) ||
        `declared-${index + 1}`,
      rule_id: declaredRuleId || "manifest.rule.invalid",
      ...(!isPlainObject(manifestSample) || !declaredRuleId
        ? {
            manifest_declaration_invalid: true,
            manifest_declaration_index: index,
            manifest_rule_id: sample.rule_id ?? sample.ruleId ?? null,
          }
        : {}),
    };
    for (const field of DECLARATION_FIELDS) {
      const camel = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = sample[field] ?? sample[camel];
      if (typeof value === "string" && value.trim()) declaration[field] = value.trim();
    }
    return declaration;
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

function executableFromPath(command) {
  if (!command) return null;
  if (path.isAbsolute(command)) return isExecutable(command) ? command : null;
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!directory) continue;
    const candidate = path.join(directory, command);
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

function playwrightChromeOnMac() {
  const roots = [
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
    path.join(os.homedir(), ".cache", "ms-playwright"),
  ];
  const suffixes = [
    path.join("chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
    path.join("chrome-headless-shell-mac-x64", "chrome-headless-shell"),
    path.join(
      "chrome-mac-arm64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing",
    ),
    path.join(
      "chrome-mac-x64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing",
    ),
  ];

  for (const root of roots) {
    let releases;
    try {
      releases = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^chromium(?:_headless_shell)?-/.test(entry.name))
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
    } catch {
      continue;
    }
    for (const release of releases) {
      for (const suffix of suffixes) {
        const candidate = path.join(root, release, suffix);
        if (isExecutable(candidate)) return candidate;
      }
    }
  }
  return null;
}

async function browserLaunch() {
  const configured =
    process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH ??
    process.env.CHROME_BIN;
  if (configured) {
    const executable = executableFromPath(configured);
    if (!executable) {
      throw Object.assign(
        new Error("Configured Chrome executable is unavailable."),
        { code: "configured_chrome_unavailable" },
      );
    }
    return {
      executable,
      args: [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
      ],
    };
  }

  if (process.platform === "linux") {
    return {
      executable: await chromium.executablePath(),
      args: [...chromium.args],
    };
  }

  if (process.platform === "darwin") {
    const executable = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      executableFromPath("google-chrome"),
      executableFromPath("chromium"),
      playwrightChromeOnMac(),
    ]
      .map(executableFromPath)
      .find(Boolean);
    if (!executable) throw new Error("No local Chrome executable is available.");
    return {
      executable,
      args: ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check"],
    };
  }

  throw new Error(`Unsupported browser runtime platform: ${process.platform}`);
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port) resolve(port);
        else reject(new Error("Unable to allocate a browser debugging port."));
      });
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForBrowser(port, stderr) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const deadline = Date.now() + BROWSER_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch {
      // The debugging endpoint is still starting.
    }
    await delay(100);
  }
  throw new Error(`Chrome DevTools endpoint did not start. ${stderr().trim()}`);
}

function connectCdp(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
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
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
        return new Promise((res, rej) => {
          const timer = setTimeout(() => {
            pending.delete(id);
            rej(new Error(`Timed out sending Chrome command ${method}.`));
          }, CDP_TIMEOUT_MS);
          pending.set(id, {
            res(value) {
              clearTimeout(timer);
              res(value);
            },
            rej(error) {
              clearTimeout(timer);
              rej(error);
            },
          });
        });
      },
      waitFor(method, sessionId = undefined) {
        return new Promise((res, rej) => {
          const key = `${sessionId ?? ""}:${method}`;
          const listener = { res, rej };
          const timer = setTimeout(() => {
            const current = listeners.get(key) ?? [];
            listeners.set(key, current.filter((entry) => entry !== listener));
            rej(new Error(`Timed out waiting for Chrome event ${method}.`));
          }, CDP_TIMEOUT_MS);
          listener.res = (value) => {
            clearTimeout(timer);
            res(value);
          };
          (listeners.get(key) ?? listeners.set(key, []).get(key)).push(listener);
        });
      },
      close() {
        socket.close();
      },
    };

    socket.addEventListener("open", () => resolve(client));
    socket.addEventListener("error", (event) => reject(event.error ?? new Error("CDP socket error.")));
    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.id && pending.has(message.id)) {
        const waiting = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) waiting.rej(new Error(message.error.message));
        else waiting.res(message.result);
        return;
      }
      if (!message.method) return;
      const key = `${message.sessionId ?? ""}:${message.method}`;
      const waiting = listeners.get(key);
      if (waiting?.length) waiting.shift().res(message.params);
    });
    socket.addEventListener("close", () => {
      for (const waiting of pending.values()) waiting.rej(new Error("CDP socket closed."));
      pending.clear();
    });
  });
}

async function withBrowser(callback) {
  const launch = await browserLaunch();
  const port = await availablePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-vc-runtime-"));
  let stderr = "";
  const child = spawn(
    launch.executable,
    [
      ...launch.args.filter(
        (argument) =>
          argument !== "--disable-web-security" &&
          argument !== "--allow-running-insecure-content",
      ),
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-dev-shm-usage",
      "--disable-sync",
      "--force-color-profile=srgb",
      "--hide-scrollbars",
      "--metrics-recording-only",
      "--mute-audio",
      "--remote-allow-origins=*",
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  child.stderr.on("data", (chunk) => {
    if (stderr.length < 32_768) stderr += chunk.toString();
  });

  let client;
  try {
    const versionEndpoint = await waitForBrowser(port, () => stderr);
    client = await connectCdp(versionEndpoint.webSocketDebuggerUrl);
    return await callback(client, versionEndpoint);
  } finally {
    if (client) client.close();
    child.kill("SIGTERM");
    await delay(100);
    if (child.exitCode === null) child.kill("SIGKILL");
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  }
}

function measurementExpression({ declarations, policy, viewport, documentId }) {
  return `
    (async () => {
      const declarations = ${JSON.stringify(declarations)};
      const policy = ${JSON.stringify(policy)};
      const viewport = ${JSON.stringify(viewport)};
      const documentId = ${JSON.stringify(documentId)};
      const ruleById = new Map((policy.rules || []).map((rule) => [rule.id, rule]));
      const calibrations = policy.calibrations || {};
      const results = [];
      let instrumentationId = 0;

      const nextSelector = (element, prefix) => {
        instrumentationId += 1;
        const id = prefix + "-" + viewport.id + "-" + instrumentationId;
        element.setAttribute("data-jk-vc-id", id);
        return '[data-jk-vc-id="' + id + '"]';
      };
      const rect = (value) => {
        const bounds = value.getBoundingClientRect();
        return {
          x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
          top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left,
        };
      };
      const rangeRect = (node) => {
        const range = document.createRange();
        if (node.nodeType === Node.TEXT_NODE) range.selectNodeContents(node);
        else range.selectNodeContents(node);
        const bounds = range.getBoundingClientRect();
        return {
          x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
          top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left,
        };
      };
      const rendered = (element) => {
        if (!element) return false;
        const bounds = rect(element);
        const style = getComputedStyle(element);
        return bounds.width > 0 && bounds.height > 0 && style.display !== "none" &&
          style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0;
      };
      const safeOne = (selector, root = document) => {
        try { return root.querySelector(selector); } catch { return null; }
      };
      const safeAll = (selector, root = document) => {
        try { return [...root.querySelectorAll(selector)]; } catch { return []; }
      };
      const calibrationFor = (declaration, ruleId) => {
        if (declaration.calibration_ref && calibrations[declaration.calibration_ref]) {
          return [declaration.calibration_ref, calibrations[declaration.calibration_ref]];
        }
        const candidates = Object.entries(calibrations).filter(([, calibration]) =>
          calibration.rule_id === ruleId
        );
        const familyMatch = declaration.component_family
          ? candidates.find(([, calibration]) =>
              declaration.component_family === calibration.component_family
            )
          : null;
        const found = familyMatch || (candidates.length === 1 ? candidates[0] : null);
        return found || [declaration.calibration_ref || "", null];
      };
      const base = (declaration, index) => ({
        document_id: documentId,
        viewport_id: viewport.id,
        state_id: declaration.state_id || "default",
        sample_id: (declaration.sample_id || "declared-" + (index + 1)) + "-" + viewport.id,
        rule_id: declaration.rule_id,
        ...(declaration.calibration_ref ? { calibration_ref: declaration.calibration_ref } : {}),
        ...(declaration.component_family ? { component_family: declaration.component_family } : {}),
        ...(declaration.selector ? { selector: declaration.selector } : {}),
        ...(declaration.target_selector ? { target_selector: declaration.target_selector } : {}),
        ...(declaration.member_selector ? { member_selector: declaration.member_selector } : {}),
        ...(declaration.presentation_owner ? { presentation_owner: declaration.presentation_owner } : {}),
        ...(declaration.composition_variant ? { composition_variant: declaration.composition_variant } : {}),
        ...(declaration.container_selector ? { container_selector: declaration.container_selector } : {}),
        ...(declaration.label_selector ? { label_selector: declaration.label_selector } : {}),
        ...(declaration.indicator_selector ? { indicator_selector: declaration.indicator_selector } : {}),
        ...(declaration.asset_selector ? { asset_selector: declaration.asset_selector } : {}),
        ...(declaration.lockup_id ? { lockup_id: declaration.lockup_id } : {}),
        ...(declaration.active_query ? { active_query: declaration.active_query } : {}),
      });
      const outcome = (sample, actual, code, evidence = {}, message = "") => ({
        ...sample,
        actual,
        code,
        evidence,
        ...(message ? { message } : {}),
      });
      const rootFailure = (sample, root) => {
        if (!root) return outcome(sample, "fail", "sample_root_missing", { selector: sample.selector });
        if (!rendered(root)) return outcome(sample, "fail", "sample_root_not_rendered", {
          selector: sample.selector, root_rect: rect(root),
        });
        return null;
      };
      const digest = async (text) => {
        const bytes = new TextEncoder().encode(text);
        const value = await crypto.subtle.digest("SHA-256", bytes);
        return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      };

      const evaluate = async (declaration, index) => {
        const rule = ruleById.get(declaration.rule_id);
        let sample = base(declaration, index);
        if (!rule) return outcome(sample, "review", "unsupported_rule_kind", {
          rule_id: declaration.rule_id,
          manifest_declaration_invalid: declaration.manifest_declaration_invalid === true,
          manifest_declaration_index: declaration.manifest_declaration_index ?? null,
          manifest_rule_id: declaration.manifest_rule_id ?? declaration.rule_id ?? null,
        });
        const [calibrationRef, calibration] = calibrationFor(declaration, rule.id);
        if (calibrationRef && !sample.calibration_ref) sample.calibration_ref = calibrationRef;
        if (calibration?.component_family && !sample.component_family) {
          sample.component_family = calibration.component_family;
        }
        const root = safeOne(declaration.selector);
        const failure = rootFailure(sample, root);
        if (failure) return failure;

        if (rule.kind === "inline_pair") {
          const members = safeAll(declaration.member_selector, root);
          if (members.length < 2) return outcome(sample, "fail", "relationship_members_missing", {
            member_selector: declaration.member_selector, count: members.length,
          });
          if (members.some((member) => !rendered(member))) {
            return outcome(sample, "fail", "relationship_member_not_rendered", {
              member_selector: declaration.member_selector,
            });
          }
          const rectangles = members.map(rect);
          const centers = rectangles.map((bounds) => (bounds.top + bounds.bottom) / 2);
          const delta = Math.max(...centers) - Math.min(...centers);
          const limit = calibration?.max_box_center_delta_css_px;
          if (!Number.isFinite(limit)) return outcome(sample, "review", "calibration_missing", {
            calibration_ref: sample.calibration_ref || null,
          });
          return delta <= limit
            ? outcome(sample, "pass", rule.id, { member_rects: rectangles, box_center_delta_css_px: delta, limit_css_px: limit })
            : outcome(sample, "fail", rule.failure_code, { member_rects: rectangles, box_center_delta_css_px: delta, limit_css_px: limit });
        }

        if (rule.kind === "shared_anchor") {
          if (declaration.active_query && !matchMedia(declaration.active_query).matches) {
            return {
              ...outcome(sample, "not_applicable", "relationship_inactive_at_viewport", {
                active_query: declaration.active_query,
                active_query_matches: false,
              }),
              rationale: "The declared responsive relationship is inactive at this viewport.",
            };
          }
          const members = safeAll(declaration.member_selector, root);
          if (members.length < 2) return outcome(sample, "fail", "relationship_members_missing", {
            member_selector: declaration.member_selector, count: members.length,
          });
          if (members.some((member) => !rendered(member))) {
            return outcome(sample, "fail", "relationship_member_not_rendered", {
              member_selector: declaration.member_selector,
            });
          }
          const rectangles = members.map(rect);
          const values = rectangles.map((bounds, memberIndex) => {
            if (rule.anchor === "block_start") return bounds.top;
            return getComputedStyle(members[memberIndex]).direction === "rtl"
              ? innerWidth - bounds.right
              : bounds.left;
          });
          const spread = Math.max(...values) - Math.min(...values);
          const limit = calibration?.max_spread_css_px;
          if (!Number.isFinite(limit)) return outcome(sample, "review", "calibration_missing", {
            calibration_ref: sample.calibration_ref || null,
          });
          return spread <= limit
            ? outcome(sample, "pass", rule.id, { member_rects: rectangles, values, spread_css_px: spread, limit_css_px: limit, active_query_matches: true })
            : outcome(sample, "fail", rule.failure_code, { member_rects: rectangles, values, spread_css_px: spread, limit_css_px: limit, active_query_matches: true });
        }

        if (rule.kind === "protected_atom") {
          const target = declaration.target_selector
            ? (root.matches(declaration.target_selector) ? root : safeOne(declaration.target_selector, root))
            : root;
          if (!target) return outcome(sample, "fail", "protected_atom_missing");
          if (!rendered(target)) return outcome(sample, "fail", "protected_atom_not_rendered");
          const range = document.createRange();
          range.selectNodeContents(target);
          const lineRects = [...range.getClientRects()].filter((bounds) => bounds.width > 0 && bounds.height > 0);
          const targetRect = rect(target);
          const containerRect = rect(root);
          const overflowsInline = targetRect.left < containerRect.left - 0.5 || targetRect.right > containerRect.right + 0.5;
          const limit = calibration?.max_text_line_boxes;
          if (!Number.isInteger(limit)) return outcome(sample, "review", "calibration_missing", {
            calibration_ref: sample.calibration_ref || null,
          });
          const evidence = {
            line_box_count: lineRects.length,
            overflows_inline: overflowsInline,
            max_line_box_count: limit,
            target_rect: targetRect,
            container_rect: containerRect,
          };
          return lineRects.length <= limit && !overflowsInline
            ? outcome(sample, "pass", rule.id, evidence)
            : outcome(sample, "fail", rule.failure_code, evidence);
        }

        if (rule.kind === "presentation_owner") {
          const owner = declaration.presentation_owner;
          if (owner === "browser") {
            const control = root.matches("select") ? root : safeOne("select", root);
            if (!control) return outcome(sample, "fail", "select_control_missing");
            if (!rendered(control)) return outcome(sample, "fail", "select_control_not_rendered");
            const style = getComputedStyle(control);
            const appearance = style.appearance || style.webkitAppearance || "auto";
            const evidence = {
              appearance,
              padding_inline_start: style.paddingInlineStart,
              padding_inline_end: style.paddingInlineEnd,
              control_rect: rect(control),
            };
            return appearance === "none"
              ? outcome(sample, "review", "presentation_owner_undeclared", evidence)
              : outcome(sample, "pass_with_warning", rule.warning_code, evidence,
                  "The browser owns native indicator painting, so its internal geometry is not a DOM hard gate.");
          }
          if (owner !== "design_system") {
            return outcome(sample, "review", "presentation_owner_undeclared");
          }
          const container = declaration.container_selector ? safeOne(declaration.container_selector, root) : root;
          const label = safeOne(declaration.label_selector, root);
          const indicator = safeOne(declaration.indicator_selector, root);
          if (!container || !label || !indicator) return outcome(sample, "fail", "owned_select_parts_missing");
          if (![container, label, indicator].every(rendered)) {
            return outcome(sample, "fail", "owned_select_part_not_rendered");
          }
          const containerRect = rect(container);
          const labelRect = rect(label);
          const indicatorRect = rect(indicator);
          const direction = getComputedStyle(container).direction;
          const containerCenter = (containerRect.left + containerRect.right) / 2;
          const labelCenter = (labelRect.left + labelRect.right) / 2;
          const labelCenterDelta = Math.abs(containerCenter - labelCenter);
          const endInset = direction === "rtl"
            ? indicatorRect.left - containerRect.left
            : containerRect.right - indicatorRect.right;
          const trailingRailWidth = endInset * 2 + indicatorRect.width;
          const expectedRailWidth = calibration?.accessory_rail_width_css_px;
          const railDelta = Number.isFinite(expectedRailWidth)
            ? Math.abs(trailingRailWidth - expectedRailWidth)
            : Number.POSITIVE_INFINITY;
          const centerLimit = calibration?.max_label_center_delta_css_px;
          const railLimit = calibration?.max_logical_rail_delta_css_px;
          if (![centerLimit, railLimit, expectedRailWidth].every(Number.isFinite)) {
            return outcome(sample, "review", "calibration_missing");
          }
          const evidence = {
            direction,
            container_rect: containerRect,
            label_rect: labelRect,
            indicator_rect: indicatorRect,
            label_center_delta_css_px: labelCenterDelta,
            trailing_rail_width_css_px: trailingRailWidth,
            expected_rail_width_css_px: expectedRailWidth,
            rail_delta_css_px: railDelta,
            center_limit_css_px: centerLimit,
            rail_limit_css_px: railLimit,
          };
          return labelCenterDelta <= centerLimit && railDelta <= railLimit
            ? outcome(sample, "pass", rule.id, evidence)
            : outcome(sample, "fail", rule.failure_code, evidence);
        }

        if (rule.kind === "canonical_lockup") {
          const expected = rule.lockups?.[declaration.lockup_id];
          if (!expected) return outcome(sample, "review", "canonical_lockup_undeclared");
          const asset = declaration.asset_selector
            ? (root.matches(declaration.asset_selector) ? root : safeOne(declaration.asset_selector, root))
            : root;
          if (!asset) return outcome(sample, "fail", rule.failure_code, {
            lockup_id: declaration.lockup_id,
          });
          if (!rendered(asset)) return outcome(sample, "fail", "canonical_lockup_not_rendered");
          const rawSource = asset.getAttribute("data-canonical-source") || asset.getAttribute("src") || "";
          let content = asset.outerHTML;
          const src = asset.getAttribute("src") || "";
          if (src.startsWith("data:")) {
            const comma = src.indexOf(",");
            const metadata = src.slice(0, comma);
            const payload = src.slice(comma + 1);
            content = metadata.endsWith(";base64") ? atob(payload) : decodeURIComponent(payload);
          }
          const observedSha256 = await digest(content);
          const evidence = { source: rawSource, sha256: observedSha256, lockup_id: declaration.lockup_id };
          return rawSource.endsWith(expected.asset_suffix) && observedSha256 === expected.sha256
            ? outcome(sample, "pass", rule.id, evidence)
            : outcome(sample, "fail", rule.failure_code, evidence);
        }

        return outcome(sample, "review", "unsupported_rule_kind", { kind: rule.kind });
      };

      const ICON_SELECTOR = "svg,img,picture,canvas,[data-icon],[data-part='icon'],[aria-hidden='true']";
      const iconLike = (element) => element?.matches?.(ICON_SELECTOR) === true;
      const explicitSelectControls = new Set();
      const explicitInlinePairRoots = new Set();
      for (const declaration of declarations) {
        const declaredRoot = safeOne(declaration.selector);
        if (!declaredRoot) continue;
        if (declaration.rule_id === "presentation_owner.select_indicator") {
          const control = declaredRoot.matches("select,[role='combobox'],[role='listbox']")
            ? declaredRoot
            : safeOne("select,[role='combobox'],[role='listbox']", declaredRoot);
          if (control) explicitSelectControls.add(control);
        }
        if (declaration.rule_id === "inline_pair.box_center") {
          explicitInlinePairRoots.add(declaredRoot);
        }
      }

      const auto = [];
      let relationshipLimitExceeded = declarations.length > ${MAX_SAMPLES_PER_VIEWPORT};
      let observedRelationshipCount = declarations.length;
      const addAuto = (declaration) => {
        const nextCount = declarations.length + auto.length + 1;
        observedRelationshipCount = Math.max(observedRelationshipCount, nextCount);
        if (nextCount > ${MAX_SAMPLES_PER_VIEWPORT}) {
          relationshipLimitExceeded = true;
          return false;
        }
        auto.push(declaration);
        return true;
      };

      const selectRule = ruleById.get("presentation_owner.select_indicator");
      if (selectRule && !relationshipLimitExceeded) {
        for (const select of [...document.querySelectorAll("select")].filter(rendered)) {
          if (explicitSelectControls.has(select)) continue;
          const selector = nextSelector(select, "select");
          if (!addAuto({
            sample_id: "auto-native-select-" + auto.length,
            rule_id: selectRule.id,
            selector,
            presentation_owner: "browser",
          })) break;
        }
      }

      if (selectRule && !relationshipLimitExceeded) {
        const customControls = safeAll("[role='combobox'],[role='listbox']").filter(rendered);
        for (const control of customControls) {
          if (explicitSelectControls.has(control)) continue;
          const selector = nextSelector(control, "owned-select");
          const directElements = [...control.children].filter(rendered);
          const strongIndicators = safeAll(
            "[data-part='indicator'],[data-select-indicator],[data-caret],[class*='caret' i],[class*='chevron' i],[class*='indicator' i]",
            control,
          ).filter(rendered);
          const directIndicators = directElements.filter((element) =>
            iconLike(element) ||
            /^(?:⌄|⌃|▾|▴|▼|▲|∨|˅)$/.test((element.textContent || "").trim())
          );
          const indicatorCandidates = strongIndicators.length > 0
            ? [...new Set(strongIndicators)]
            : directIndicators;
          const indicator = indicatorCandidates.length === 1 ? indicatorCandidates[0] : null;
          const strongLabels = safeAll(
            "[data-part='label'],[data-select-label],[data-label]",
            control,
          ).filter((element) => rendered(element) && element !== indicator);
          const directLabels = directElements.filter((element) =>
            element !== indicator &&
            !iconLike(element) &&
            element.childElementCount === 0 &&
            (element.innerText || "").trim().length > 0
          );
          const labelCandidates = strongLabels.length > 0
            ? [...new Set(strongLabels)]
            : directLabels;
          const directTextNodes = [...control.childNodes].filter((node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
          );
          const label = labelCandidates.length === 1 && directTextNodes.length === 0
            ? labelCandidates[0]
            : null;
          const labelTextNode = labelCandidates.length === 0 && directTextNodes.length === 1
            ? directTextNodes[0]
            : null;

          if (!indicator || (!label && !labelTextNode)) {
            const reviewSample = {
              document_id: documentId,
              viewport_id: viewport.id,
              state_id: "default",
              sample_id: "auto-owned-select-review-" + auto.length + "-" + viewport.id,
              rule_id: selectRule.id,
              selector,
            };
            if (!addAuto({
              __measured: outcome(
                reviewSample,
                "review",
                "presentation_owner_undeclared",
                {
                  classification: "owned_select_parts_ambiguous",
                  indicator_candidate_count: indicatorCandidates.length,
                  label_candidate_count: labelCandidates.length + directTextNodes.length,
                  control_rect: rect(control),
                },
                "A custom select-like control is rendered, but its label and caret cannot be safely classified.",
              ),
            })) break;
            continue;
          }

          const indicatorSelector = nextSelector(indicator, "owned-select-indicator");
          const labelSelector = label ? nextSelector(label, "owned-select-label") : "::direct-text";
          const [calibrationRef, calibration] = calibrationFor({}, selectRule.id);
          const sample = {
            document_id: documentId,
            viewport_id: viewport.id,
            state_id: "default",
            sample_id: "auto-owned-select-" + auto.length + "-" + viewport.id,
            rule_id: selectRule.id,
            ...(calibrationRef ? {
              calibration_ref: calibrationRef,
              component_family: calibration?.component_family,
            } : {}),
            selector,
            presentation_owner: "design_system",
            composition_variant: calibration?.composition_variant || "centered_label_symmetric_rails",
            container_selector: selector,
            label_selector: labelSelector,
            indicator_selector: indicatorSelector,
          };
          const containerRect = rect(control);
          const labelRect = label ? rect(label) : rangeRect(labelTextNode);
          const indicatorRect = rect(indicator);
          const direction = getComputedStyle(control).direction;
          const labelCenterDelta = Math.abs(
            (containerRect.left + containerRect.right) / 2 -
            (labelRect.left + labelRect.right) / 2
          );
          const endInset = direction === "rtl"
            ? indicatorRect.left - containerRect.left
            : containerRect.right - indicatorRect.right;
          const trailingRailWidth = endInset * 2 + indicatorRect.width;
          const expectedRailWidth = calibration?.accessory_rail_width_css_px;
          const railDelta = Number.isFinite(expectedRailWidth)
            ? Math.abs(trailingRailWidth - expectedRailWidth)
            : Number.POSITIVE_INFINITY;
          const centerLimit = calibration?.max_label_center_delta_css_px;
          const railLimit = calibration?.max_logical_rail_delta_css_px;
          const evidence = {
            direction,
            container_rect: containerRect,
            label_rect: labelRect,
            indicator_rect: indicatorRect,
            label_center_delta_css_px: labelCenterDelta,
            trailing_rail_width_css_px: trailingRailWidth,
            expected_rail_width_css_px: expectedRailWidth ?? null,
            rail_delta_css_px: Number.isFinite(railDelta) ? railDelta : null,
            center_limit_css_px: centerLimit ?? null,
            rail_limit_css_px: railLimit ?? null,
          };
          const measuredSample = ![
            expectedRailWidth,
            centerLimit,
            railLimit,
          ].every(Number.isFinite)
            ? outcome(sample, "review", "calibration_missing", evidence)
            : labelCenterDelta <= centerLimit && railDelta <= railLimit
              ? outcome(sample, "pass", selectRule.id, evidence)
              : outcome(sample, "fail", selectRule.failure_code, evidence);
          if (!addAuto({ __measured: measuredSample })) break;
        }
      }

      const inlineRule = ruleById.get("inline_pair.box_center");
      if (inlineRule && !relationshipLimitExceeded) {
        const containers = safeAll("body *").filter((container) => {
          if (!rendered(container) || explicitInlinePairRoots.has(container)) return false;
          if (container.matches("select,[role='combobox'],[role='listbox']")) return false;
          const directElements = [...container.children].filter(rendered);
          if (directElements.length < 1 || directElements.length > 3) return false;
          const iconCount = directElements.filter(iconLike).length;
          if (iconCount !== 1) return false;
          const display = getComputedStyle(container).display;
          const semanticPair = container.matches(
            "button,a,label,h1,h2,h3,h4,h5,h6,[role='button'],[data-brand-lockup]"
          );
          const brandCue = /(?:brand|logo|lockup|wordmark|masthead)/i.test([
            container.id,
            container.className,
            container.getAttribute("aria-label"),
            container.getAttribute("data-part"),
          ].filter((value) => typeof value === "string").join(" "));
          return semanticPair || brandCue || ["flex", "inline-flex", "grid", "inline-grid"].includes(display);
        });
        for (const container of containers) {
          const directElements = [...container.children].filter(rendered);
          const icon = directElements.find(iconLike);
          const textElements = directElements.filter((element) =>
            element !== icon &&
            !iconLike(element) &&
            element.childElementCount === 0 &&
            (element.innerText || "").trim().length > 0 &&
            (element.innerText || "").trim().length <= 160
          );
          const textNodes = [...container.childNodes].filter((node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
          );
          if (textElements.length + textNodes.length !== 1) continue;
          const textElement = textElements.length === 1 ? textElements[0] : null;
          const textNode = textElement ? null : textNodes[0];
          const range = document.createRange();
          range.selectNodeContents(textElement || textNode);
          const textLineRects = [...range.getClientRects()].filter((bounds) => bounds.width > 0 && bounds.height > 0);
          if (textLineRects.length !== 1) continue;
          const selector = nextSelector(container, "inline-pair");
          const iconSelector = nextSelector(icon, "icon");
          const textSelector = textElement ? nextSelector(textElement, "text") : "::direct-text";
          const declaredComponentFamily =
            container.getAttribute("data-component-family") ||
            container.getAttribute("data-visual-component-family") ||
            "";
          const [calibrationRef, inlineCalibration] = calibrationFor(
            { component_family: declaredComponentFamily },
            inlineRule.id,
          );
          const sample = {
            document_id: documentId,
            viewport_id: viewport.id,
            state_id: "default",
            sample_id: "auto-inline-pair-" + auto.length + "-" + viewport.id,
            rule_id: inlineRule.id,
            ...(calibrationRef ? {
              calibration_ref: calibrationRef,
              component_family: inlineCalibration?.component_family,
            } : {}),
            selector,
            member_selector: iconSelector + "," + textSelector,
          };
          const iconRect = rect(icon);
          const textRect = textElement ? rect(textElement) : rangeRect(textNode);
          const delta = Math.abs((iconRect.top + iconRect.bottom) / 2 - (textRect.top + textRect.bottom) / 2);
          const limit = inlineCalibration?.max_box_center_delta_css_px;
          const measuredSample = Number.isFinite(limit)
            ? (delta <= limit
                ? outcome(sample, "pass", inlineRule.id, { member_rects: [iconRect, textRect], box_center_delta_css_px: delta, limit_css_px: limit })
                : outcome(sample, "fail", inlineRule.failure_code, { member_rects: [iconRect, textRect], box_center_delta_css_px: delta, limit_css_px: limit }))
            : outcome(sample, "review", "calibration_missing");
          if (!addAuto({ __measured: measuredSample })) break;
        }
      }

      if (relationshipLimitExceeded) {
        results.push(outcome({
          document_id: documentId,
          viewport_id: viewport.id,
          state_id: "default",
          sample_id: "relationship-limit-" + viewport.id,
          rule_id: "inline_pair.box_center",
          calibration_ref: "judgmentkit.inline_pair.box_center",
          component_family: "judgmentkit.inline_pair",
          selector: "html",
          member_selector: "html",
        }, "fail", "relationship_limit_exceeded", {
          max_relationships_per_viewport: ${MAX_SAMPLES_PER_VIEWPORT},
          observed_relationship_count_at_least: observedRelationshipCount,
          explicit_relationship_count: declarations.length,
          auto_relationship_count_before_limit: auto.length,
        }, "The trusted browser runtime found more governed relationships than it can safely evidence."));
      } else {
        // Auto-discovered evidence is evaluated first so a caller cannot crowd a visible
        // native control or icon/text relationship out of the bounded receipt.
        for (const [index, declaration] of [...auto, ...declarations].entries()) {
          results.push(declaration.__measured || await evaluate(declaration, index));
        }
      }
      return { samples: results, dom: document.documentElement.outerHTML };
    })()
  `;
}

async function measureViewport(client, html, declarations, policy, viewport) {
  const target = await client.send("Target.createTarget", { url: "about:blank" });
  const attached = await client.send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  });
  const sessionId = attached.sessionId;
  const documentId = `candidate-${viewport.id}`;

  try {
    await client.send("Page.enable", {}, sessionId);
    await client.send("Runtime.enable", {}, sessionId);
    await client.send("Network.enable", {}, sessionId);
    await client.send("Network.setBlockedURLs", {
      urls: ["http://*", "https://*", "file://*", "ftp://*", "ws://*", "wss://*"],
    }, sessionId);
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.device_scale_factor,
      mobile: viewport.mobile,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    }, sessionId);

    const frameTree = await client.send("Page.getFrameTree", {}, sessionId);
    await client.send("Page.setDocumentContent", {
      frameId: frameTree.frameTree.frame.id,
      html,
    }, sessionId);
    const settled = await client.send("Runtime.evaluate", {
      expression: SETTLE_EXPRESSION,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    if (
      settled.exceptionDetails ||
      settled.result?.value?.fonts_ready !== true ||
      settled.result?.value?.scroll_x !== 0 ||
      settled.result?.value?.scroll_y !== 0
    ) {
      throw new Error("Candidate document did not settle for measurement.");
    }

    const evaluated = await client.send("Runtime.evaluate", {
      expression: measurementExpression({ declarations, policy, viewport, documentId }),
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    if (evaluated.exceptionDetails || !isPlainObject(evaluated.result?.value)) {
      throw new Error(evaluated.exceptionDetails?.text ?? "Browser measurement returned no value.");
    }
    const capture = await client.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    }, sessionId);
    const screenshot = Buffer.from(capture.data, "base64");
    const value = evaluated.result.value;
    const artifactSha256 = sha256(
      screenshot,
      value.dom,
      JSON.stringify(viewport),
    );
    const samples = (Array.isArray(value.samples) ? value.samples : []).map((sample) => ({
      ...sample,
      artifact_sha256: artifactSha256,
    }));
    return {
      documentId,
      viewport,
      artifactSha256,
      samples,
    };
  } finally {
    await client.send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
  }
}

function outcomeFor(samples, precedence) {
  if (samples.length === 0) return "not_applicable";
  const order = Array.isArray(precedence) && precedence.length
    ? precedence
    : ["fail", "review", "pass_with_warning", "pass", "not_applicable"];
  const rank = new Map(order.map((value, index) => [value, index]));
  return [...samples]
    .sort((left, right) => (rank.get(left.actual) ?? order.length) - (rank.get(right.actual) ?? order.length))[0]
    ?.actual ?? "not_applicable";
}

function manifestDeclaration(sample) {
  const {
    actual: _actual,
    artifact_sha256: _artifact,
    code: _code,
    evidence: _evidence,
    message: _message,
    rationale: _rationale,
    ...declaration
  } = sample;
  return declaration;
}

/**
 * Render and measure a self-contained UI candidate in the trusted browser runtime.
 * Binding references are intentionally added later by the core reviewer.
 */
export async function measureVisualCompositionInBrowser({
  candidate,
  implementationContract,
} = {}) {
  const source = candidateHtml(candidate);
  if (!source || Buffer.byteLength(source, "utf8") > MAX_HTML_BYTES) {
    return nonRenderable();
  }
  const policy = implementationContract?.visual_composition_policy;
  if (!isPlainObject(policy) || !Array.isArray(policy.rules)) {
    return nonRenderable("visual_composition_policy_unavailable");
  }

  const html = securedHtml(source);
  const declarations = explicitDeclarations(candidate);

  try {
    return await withBrowser(async (client, endpointVersion) => {
      const browserVersion = await client.send("Browser.getVersion").catch(() => ({}));
      const measured = [];
      for (const viewport of VIEWPORTS) {
        measured.push(await measureViewport(client, html, declarations, policy, viewport));
      }
      const samples = measured.flatMap((entry) => entry.samples);
      if (samples.length > MAX_SAMPLES) {
        throw new Error("Browser runtime exceeded its fail-closed visual-composition sample bound.");
      }
      const manifestSamples = samples.map(manifestDeclaration);
      const noApplicable = manifestSamples.length === 0;
      const manifest = noApplicable
        ? {
            applicability: "none",
            rationale: "The trusted browser runtime inspected both required viewports and found no declared or deterministically discoverable governed visual-composition relationships.",
            inspection: {
              root_selector: "html",
              declared_relationship_count: 0,
            },
            sample_count: 0,
            samples: [],
          }
        : {
            applicability: "declared",
            inspection: {
              root_selector: "html",
              declared_relationship_count: manifestSamples.length,
            },
            sample_count: manifestSamples.length,
            samples: manifestSamples,
          };
      const documents = measured
        .filter((entry) => noApplicable || samples.some((sample) => sample.document_id === entry.documentId))
        .map((entry) => {
        const documentSamples = samples.filter((sample) => sample.document_id === entry.documentId);
        const outcome = outcomeFor(documentSamples, policy.outcomes?.precedence);
        return {
          document_id: entry.documentId,
          viewport: {
            id: entry.viewport.id,
            width: entry.viewport.width,
            height: entry.viewport.height,
            device_scale_factor: entry.viewport.device_scale_factor,
          },
          artifact_sha256: entry.artifactSha256,
          sample_count: documentSamples.length,
          outcome,
          ...(documentSamples.length === 0
            ? {
                code: "no_applicable_contract",
                evidence: {
                  inspected_root_selector: "html",
                  declared_relationship_count: 0,
                },
              }
            : {}),
        };
      });
      return {
        manifest,
        receipt: {
          kind: policy.receipt_contract?.kind ?? "visual_composition_evidence",
          version: policy.receipt_contract?.version ?? "1.0.0",
          environment: {
            issuer: "judgmentkit_browser_runtime",
            engine: "chromium",
            browser_product: browserVersion.product ?? endpointVersion.Browser ?? null,
            browser_revision: browserVersion.revision ?? null,
            user_agent: browserVersion.userAgent ?? endpointVersion["User-Agent"] ?? null,
            javascript_version: browserVersion.jsVersion ?? null,
            measurement: "dom_geometry",
            fonts_ready: true,
            animations_settled_by: "two_animation_frames",
            external_network: "blocked",
            viewports: VIEWPORTS,
          },
          documents,
          samples,
          sample_count: samples.length,
          outcome: outcomeFor(samples, policy.outcomes?.precedence),
        },
      };
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "visual_composition_browser_runtime_unavailable",
        code: "visual_composition_browser_runtime_unavailable",
        error_name: error instanceof Error ? error.name : "UnknownError",
        error_code:
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : null,
        error_message:
          error instanceof Error ? error.message : "Unknown browser runtime error",
      }),
    );
    return nonRenderable("visual_composition_browser_runtime_unavailable");
  }
}
