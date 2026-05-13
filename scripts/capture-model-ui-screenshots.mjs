#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "examples/model-ui/refund-system-map");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const VIEWPORT = {
  width: 1365,
  height: 900,
  device_scale_factor: 1,
  mobile: false,
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
  if (!command) return null;
  if (command.includes("/") || command.includes("\\")) {
    return isExecutable(command) ? command : null;
  }

  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, command);
    if (isExecutable(candidate)) return candidate;
  }

  return null;
}

function configuredChromePath(envName) {
  const value = process.env[envName];
  if (!value) return null;

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
  if (configured) return configured;

  for (const command of [
    "google-chrome-stable",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "chrome",
  ]) {
    const resolved = resolveCommandFromPath(command);
    if (resolved) return resolved;
  }

  for (const candidate of [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]) {
    if (isExecutable(candidate)) return candidate;
  }

  throw new Error(
    "Chrome is required to capture model UI screenshots. Install Chrome/Chromium or set JUDGMENTKIT_UI_EVAL_CHROME_PATH to an executable Chrome path.",
  );
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port) resolve(port);
        else reject(new Error("Unable to allocate a Chrome debugging port."));
      });
    });
  });
}

async function waitForChromeVersion(port, getStderr) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
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

    socket.addEventListener("open", () => resolve(client));
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { res, rej } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rej(new Error(message.error.message));
        else res(message.result);
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

async function captureArtifactScreenshot(client, artifact) {
  const artifactPath = path.join(OUTPUT_DIR, artifact.artifact_path);
  const screenshotPath = path.join(OUTPUT_DIR, artifact.screenshot_path);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

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
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: VIEWPORT.device_scale_factor,
      mobile: VIEWPORT.mobile,
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
    process.stdout.write(`Captured ${artifact.id} -> ${artifact.screenshot_path}\n`);
  } finally {
    await client.send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
  }
}

async function withChromeClient(callback) {
  const chromeExecutable = resolveChromeExecutable();
  const port = await findAvailablePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-model-ui-chrome-"));
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
    if (client) client.close();
    chrome.kill("SIGTERM");
    await delay(150);
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

async function main() {
  const manifest = readJson(MANIFEST_PATH);
  await withChromeClient(async (client) => {
    for (const artifact of manifest.artifacts) {
      if (!artifact.screenshot_path) {
        throw new Error(`Manifest artifact ${artifact.id} is missing screenshot_path.`);
      }
      await captureArtifactScreenshot(client, artifact);
    }
  });

  for (const alias of manifest.legacy_aliases ?? []) {
    if (!alias.screenshot_path) continue;
    const canonical = manifest.artifacts.find((artifact) => artifact.id === alias.canonical_id);
    if (!canonical) {
      throw new Error(`Missing canonical screenshot for legacy alias ${alias.id}.`);
    }
    const sourcePath = path.join(OUTPUT_DIR, canonical.screenshot_path);
    const aliasPath = path.join(OUTPUT_DIR, alias.screenshot_path);
    fs.mkdirSync(path.dirname(aliasPath), { recursive: true });
    fs.copyFileSync(sourcePath, aliasPath);
    process.stdout.write(`Copied ${canonical.screenshot_path} -> ${alias.screenshot_path}\n`);
  }
}

await main();
