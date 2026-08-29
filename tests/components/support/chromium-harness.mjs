import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import chromium from "@sparticuz/chromium";

const BROWSER_START_TIMEOUT_MS = 12_000;
const CONFIGURED_BROWSER_START_ATTEMPTS = 2;
const BROWSER_GRACEFUL_CLOSE_TIMEOUT_MS = 1_000;
const BROWSER_SHUTDOWN_TIMEOUT_MS = 1_000;
const BROWSER_PROFILE_REMOVE_RETRIES = 10;
const BROWSER_PROFILE_REMOVE_RETRY_DELAY_MS = 100;
const CDP_TIMEOUT_MS = 15_000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isExecutable(filePath) {
  if (!filePath) return false;
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
        .filter(
          (entry) =>
            entry.isDirectory() &&
            /^chromium(?:_headless_shell)?-/u.test(entry.name),
        )
        .map((entry) => entry.name)
        .sort((left, right) =>
          right.localeCompare(left, undefined, { numeric: true }),
        );
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

async function resolveBrowserLaunch() {
  const configured =
    process.env.JUDGMENTKIT_COMPONENT_CHROME_PATH ??
    process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH ??
    process.env.CHROME_BIN;

  if (configured) {
    const executable = executableFromPath(configured);
    if (!executable) {
      throw Object.assign(
        new Error(
          `Configured component-test Chrome executable is unavailable: ${configured}`,
        ),
        { code: "configured_chrome_unavailable" },
      );
    }
    return {
      executable,
      startupAttempts: CONFIGURED_BROWSER_START_ATTEMPTS,
      args: [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
      ],
    };
  }

  if (process.platform === "linux") {
    const executable = await chromium.executablePath();
    if (!isExecutable(executable)) {
      throw new Error(
        "The @sparticuz/chromium executable required by component browser tests is unavailable.",
      );
    }
    return {
      executable,
      startupAttempts: 1,
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

    if (!executable) {
      throw new Error(
        "No local Chromium executable is available; component browser evidence cannot be skipped.",
      );
    }
    return {
      executable,
      startupAttempts: 1,
      args: [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
      ],
    };
  }

  throw new Error(
    `Unsupported component browser-test platform: ${process.platform}`,
  );
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port =
        typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port) resolve(port);
        else reject(new Error("Unable to allocate a Chrome debugging port."));
      });
    });
  });
}

function processHasExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

function browserProcessTreeHasExited(child) {
  if (process.platform === "win32" || !Number.isInteger(child.pid)) {
    return processHasExited(child);
  }

  try {
    process.kill(-child.pid, 0);
    return false;
  } catch (error) {
    if (error?.code === "ESRCH") return true;
    if (error?.code === "EPERM") return false;
    throw error;
  }
}

function signalBrowserProcessTree(child, signal) {
  if (process.platform !== "win32" && Number.isInteger(child.pid)) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if (error?.code === "ESRCH") return;
      throw error;
    }
  }
  if (!processHasExited(child)) child.kill(signal);
}

async function waitForProcessTreeExit(child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (browserProcessTreeHasExited(child)) return true;
    await delay(50);
  }
  return browserProcessTreeHasExited(child);
}

async function stopBrowserProcess(child) {
  if (browserProcessTreeHasExited(child)) return;
  signalBrowserProcessTree(child, "SIGTERM");
  if (await waitForProcessTreeExit(child, BROWSER_SHUTDOWN_TIMEOUT_MS)) return;
  signalBrowserProcessTree(child, "SIGKILL");
  await waitForProcessTreeExit(child, BROWSER_SHUTDOWN_TIMEOUT_MS);
}

async function waitForBrowser(port, stderr, child) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const deadline = Date.now() + BROWSER_START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (processHasExited(child)) {
      throw Object.assign(
        new Error(
          `Chrome exited before its DevTools endpoint started. ${stderr().trim()}`,
        ),
        { code: "browser_exited_before_debugging" },
      );
    }

    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }

  throw Object.assign(
    new Error(
      `Chrome DevTools endpoint did not start. ${stderr().trim()}`,
    ),
    { code: "browser_start_timeout" },
  );
}

function connectCdp(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const onceListeners = new Map();
    const listeners = new Map();

    const keyFor = (method, sessionId) => `${sessionId ?? ""}:${method}`;

    const client = {
      send(method, params = {}, sessionId = undefined) {
        if (socket.readyState !== WebSocket.OPEN) {
          return Promise.reject(new Error("Chrome DevTools socket is closed."));
        }

        const id = nextId;
        nextId += 1;
        socket.send(
          JSON.stringify({
            id,
            method,
            params,
            ...(sessionId ? { sessionId } : {}),
          }),
        );

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

      waitFor(method, sessionId = undefined, timeoutMs = CDP_TIMEOUT_MS) {
        return new Promise((res, rej) => {
          const key = keyFor(method, sessionId);
          const entry = { res, rej };
          const timer = setTimeout(() => {
            const current = onceListeners.get(key) ?? [];
            onceListeners.set(
              key,
              current.filter((candidate) => candidate !== entry),
            );
            rej(new Error(`Timed out waiting for Chrome event ${method}.`));
          }, timeoutMs);
          entry.res = (value) => {
            clearTimeout(timer);
            res(value);
          };
          entry.rej = (error) => {
            clearTimeout(timer);
            rej(error);
          };
          const current = onceListeners.get(key) ?? [];
          current.push(entry);
          onceListeners.set(key, current);
        });
      },

      on(method, callback, sessionId = undefined) {
        const key = keyFor(method, sessionId);
        const current = listeners.get(key) ?? new Set();
        current.add(callback);
        listeners.set(key, current);
        return () => current.delete(callback);
      },

      close() {
        socket.close();
      },
    };

    socket.addEventListener("open", () => resolve(client));
    socket.addEventListener("error", (event) =>
      reject(event.error ?? new Error("Chrome DevTools socket error.")),
    );
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
      const key = keyFor(message.method, message.sessionId);
      const once = onceListeners.get(key);
      if (once?.length) once.shift().res(message.params);
      for (const callback of listeners.get(key) ?? []) {
        callback(message.params);
      }
    });
    socket.addEventListener("close", () => {
      const error = new Error("Chrome DevTools socket closed.");
      for (const waiting of pending.values()) waiting.rej(error);
      pending.clear();
      for (const waiting of onceListeners.values()) {
        for (const entry of waiting) entry.rej(error);
      }
      onceListeners.clear();
    });
  });
}

async function closeBrowserClient(client) {
  if (!client) return;
  await Promise.race([
    client.send("Browser.close").catch(() => {}),
    delay(BROWSER_GRACEFUL_CLOSE_TIMEOUT_MS),
  ]);
  client.close();
}

async function withBrowserAttempt(callback, launch) {
  const port = await availablePort();
  const userDataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "judgmentkit-components-chrome-"),
  );
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
      "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
      "--metrics-recording-only",
      "--mute-audio",
      "--proxy-bypass-list=127.0.0.1;localhost",
      "--proxy-server=http://127.0.0.1:9",
      "--remote-allow-origins=*",
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {
      detached: process.platform !== "win32",
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  child.stderr.on("data", (chunk) => {
    if (stderr.length < 32_768) stderr += chunk.toString();
  });

  let client;
  try {
    const endpoint = await waitForBrowser(port, () => stderr, child);
    client = await connectCdp(endpoint.webSocketDebuggerUrl);
    const browserGetVersion = await client.send("Browser.getVersion");
    if (!browserGetVersion?.product) {
      throw new Error("Browser.getVersion did not return a product value.");
    }
    return await callback(client, browserGetVersion);
  } finally {
    await closeBrowserClient(client);
    await stopBrowserProcess(child);
    fs.rmSync(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: BROWSER_PROFILE_REMOVE_RETRIES,
      retryDelay: BROWSER_PROFILE_REMOVE_RETRY_DELAY_MS,
    });
  }
}

export async function withChromium(callback) {
  const launch = await resolveBrowserLaunch();
  for (let attempt = 1; attempt <= launch.startupAttempts; attempt += 1) {
    try {
      return await withBrowserAttempt(callback, launch);
    } catch (error) {
      if (
        error?.code !== "browser_start_timeout" ||
        attempt === launch.startupAttempts
      ) {
        throw error;
      }
    }
  }
  throw new Error("Configured Chrome failed to start.");
}

export async function evaluate(
  client,
  sessionId,
  expression,
  { awaitPromise = true, returnByValue = true } = {},
) {
  const response = await client.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise,
      returnByValue,
      userGesture: true,
    },
    sessionId,
  );

  if (response.exceptionDetails) {
    const detail =
      response.exceptionDetails.exception?.description ??
      response.exceptionDetails.text ??
      "unknown browser exception";
    throw new Error(`Browser evaluation failed: ${detail}`);
  }
  return returnByValue ? response.result?.value : response.result;
}

export async function waitForExpression(
  client,
  sessionId,
  expression,
  { timeoutMs = 10_000, label = "browser condition" } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await evaluate(client, sessionId, expression);
    if (lastValue) return lastValue;
    await delay(50);
  }
  throw new Error(
    `Timed out waiting for ${label}; last observed value was ${JSON.stringify(lastValue)}.`,
  );
}

export async function openPage(
  client,
  {
    url,
    viewport,
    colorScheme,
    reducedMotion = "no-preference",
    forcedColors = "none",
  },
) {
  if (!viewport?.width || !viewport?.height) {
    throw new Error("A concrete component browser-test viewport is required.");
  }
  if (!new Set(["light", "dark"]).has(colorScheme)) {
    throw new Error(`Unsupported color scheme: ${colorScheme}`);
  }
  if (!new Set(["no-preference", "reduce"]).has(reducedMotion)) {
    throw new Error(`Unsupported reduced-motion preference: ${reducedMotion}`);
  }
  if (!new Set(["none", "active"]).has(forcedColors)) {
    throw new Error(`Unsupported forced-colors preference: ${forcedColors}`);
  }
  const pageUrl = new URL(url);
  if (
    pageUrl.protocol !== "http:" ||
    !new Set(["127.0.0.1", "localhost"]).has(pageUrl.hostname)
  ) {
    throw new Error(
      `Component browser tests may navigate only to a loopback HTTP origin: ${pageUrl.origin}`,
    );
  }

  const { targetId } = await client.send("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await client.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });

  const runtimeExceptions = [];
  const consoleErrors = [];
  client.on(
    "Runtime.exceptionThrown",
    (event) => runtimeExceptions.push(event.exceptionDetails),
    sessionId,
  );
  client.on(
    "Runtime.consoleAPICalled",
    (event) => {
      if (!new Set(["error", "assert"]).has(event.type)) return;
      consoleErrors.push({
        type: event.type,
        timestamp: event.timestamp,
        stackTrace: event.stackTrace ?? null,
        arguments: (event.args ?? []).map((argument) =>
          argument.value ?? argument.description ?? argument.type ?? "unknown"
        ),
      });
    },
    sessionId,
  );

  await Promise.all([
    client.send("Page.enable", {}, sessionId),
    client.send("Runtime.enable", {}, sessionId),
    client.send("DOM.enable", {}, sessionId),
    client.send("Accessibility.enable", {}, sessionId),
  ]);
  await client.send(
    "Emulation.setDeviceMetricsOverride",
    {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
      mobile: Boolean(viewport.mobile),
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    },
    sessionId,
  );
  await client.send(
    "Emulation.setEmulatedMedia",
    {
      media: "screen",
      features: [
        { name: "prefers-color-scheme", value: colorScheme },
        { name: "prefers-reduced-motion", value: reducedMotion },
        { name: "forced-colors", value: forcedColors },
      ],
    },
    sessionId,
  );

  const loaded = client.waitFor("Page.loadEventFired", sessionId);
  const navigation = await client.send("Page.navigate", { url }, sessionId);
  if (navigation.errorText) {
    throw new Error(`Chrome could not navigate to ${url}: ${navigation.errorText}`);
  }
  await loaded;

  return {
    targetId,
    sessionId,
    runtimeExceptions,
    consoleErrors,
    async close() {
      await client.send("Target.closeTarget", { targetId }).catch(() => {});
    },
  };
}

const KEY_DEFINITIONS = Object.freeze({
  Tab: { key: "Tab", code: "Tab", virtualKeyCode: 9 },
  Enter: {
    key: "Enter",
    code: "Enter",
    virtualKeyCode: 13,
    text: "\r",
  },
  Space: { key: " ", code: "Space", virtualKeyCode: 32, text: " " },
  Escape: { key: "Escape", code: "Escape", virtualKeyCode: 27 },
  Home: { key: "Home", code: "Home", virtualKeyCode: 36 },
  End: { key: "End", code: "End", virtualKeyCode: 35 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", virtualKeyCode: 37 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", virtualKeyCode: 38 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", virtualKeyCode: 39 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", virtualKeyCode: 40 },
  b: { key: "b", code: "KeyB", virtualKeyCode: 66, text: "b" },
  c: { key: "c", code: "KeyC", virtualKeyCode: 67, text: "c" },
  o: { key: "o", code: "KeyO", virtualKeyCode: 79, text: "o" },
  p: { key: "p", code: "KeyP", virtualKeyCode: 80, text: "p" },
});

export async function pressKey(client, sessionId, keyName, options = {}) {
  const definition = KEY_DEFINITIONS[keyName];
  if (!definition) throw new Error(`Unsupported browser-test key: ${keyName}`);
  const modifiers = options.shift ? 8 : 0;
  const common = {
    key: definition.key,
    code: definition.code,
    windowsVirtualKeyCode: definition.virtualKeyCode,
    nativeVirtualKeyCode: definition.virtualKeyCode,
    modifiers,
  };
  await client.send(
    "Input.dispatchKeyEvent",
    {
      type: definition.text ? "keyDown" : "rawKeyDown",
      ...common,
      ...(definition.text
        ? { text: definition.text, unmodifiedText: definition.text }
        : {}),
    },
    sessionId,
  );
  await client.send(
    "Input.dispatchKeyEvent",
    { type: "keyUp", ...common },
    sessionId,
  );
}

export async function insertText(client, sessionId, value) {
  await client.send("Input.insertText", { text: value }, sessionId);
}

async function remoteObjectForSelector(client, sessionId, selector) {
  const expression = `document.querySelector(${JSON.stringify(selector)})`;
  const result = await evaluate(client, sessionId, expression, {
    awaitPromise: false,
    returnByValue: false,
  });
  if (!result?.objectId || result.subtype === "null") {
    throw new Error(`Required browser element is missing: ${selector}`);
  }
  return result.objectId;
}

export async function pointerActivate(client, sessionId, selector) {
  const objectId = await remoteObjectForSelector(client, sessionId, selector);
  try {
    await client.send("DOM.scrollIntoViewIfNeeded", { objectId }, sessionId);
    const center = await evaluate(
      client,
      sessionId,
      `(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height
        };
      })()`,
    );
    if (!center || center.width <= 0 || center.height <= 0) {
      throw new Error(`Pointer target has no rendered box: ${selector}`);
    }

    await client.send(
      "Input.dispatchMouseEvent",
      { type: "mouseMoved", x: center.x, y: center.y },
      sessionId,
    );
    await client.send(
      "Input.dispatchMouseEvent",
      {
        type: "mousePressed",
        x: center.x,
        y: center.y,
        button: "left",
        buttons: 1,
        clickCount: 1,
      },
      sessionId,
    );
    await client.send(
      "Input.dispatchMouseEvent",
      {
        type: "mouseReleased",
        x: center.x,
        y: center.y,
        button: "left",
        buttons: 0,
        clickCount: 1,
      },
      sessionId,
    );
  } catch (error) {
    throw new Error(
      `Pointer activation failed for ${selector}: ${error.message}`,
      { cause: error },
    );
  } finally {
    await client
      .send("Runtime.releaseObject", { objectId }, sessionId)
      .catch(() => {});
  }
}

export async function tabUntil(
  client,
  sessionId,
  selector,
  { maxSteps = 80 } = {},
) {
  for (let step = 0; step <= maxSteps; step += 1) {
    const activeMatches = await evaluate(
      client,
      sessionId,
      `document.activeElement?.matches(${JSON.stringify(selector)}) === true`,
    );
    if (activeMatches) return step;
    if (step < maxSteps) await pressKey(client, sessionId, "Tab");
  }

  const active = await evaluate(
    client,
    sessionId,
    `(() => {
      const element = document.activeElement;
      return element ? {
        tag: element.tagName,
        id: element.id,
        scenario: element.closest("[data-scenario-id]")?.getAttribute("data-scenario-id") ?? null
      } : null;
    })()`,
  );
  throw new Error(
    `Real Tab input did not reach ${selector}; active element was ${JSON.stringify(active)}.`,
  );
}

export async function getAxNode(client, sessionId, selector) {
  const objectId = await remoteObjectForSelector(client, sessionId, selector);
  try {
    const result = await client.send(
      "Accessibility.getPartialAXTree",
      { objectId, fetchRelatives: true },
      sessionId,
    );
    const node = (result.nodes ?? []).find((entry) => !entry.ignored);
    if (!node) {
      throw new Error(`No unignored accessibility node exists for ${selector}.`);
    }
    return {
      role: node.role?.value ?? null,
      name: node.name?.value ?? "",
      description: node.description?.value ?? "",
      properties: Object.fromEntries(
        (node.properties ?? []).map((property) => [
          property.name,
          property.value?.value,
        ]),
      ),
    };
  } finally {
    await client
      .send("Runtime.releaseObject", { objectId }, sessionId)
      .catch(() => {});
  }
}

export async function captureScreenshot(client, sessionId, outputPath) {
  await evaluate(client, sessionId, "window.scrollTo(0, 0)");
  const result = await client.send(
    "Page.captureScreenshot",
    { format: "png", fromSurface: true, captureBeyondViewport: false },
    sessionId,
  );
  if (!result.data) throw new Error("Chrome returned an empty screenshot.");
  fs.writeFileSync(outputPath, Buffer.from(result.data, "base64"));
}

export async function captureElementScreenshot(
  client,
  sessionId,
  selector,
  outputPath,
) {
  const objectId = await remoteObjectForSelector(client, sessionId, selector);
  try {
    await client.send("DOM.scrollIntoViewIfNeeded", { objectId }, sessionId);
    const clip = await evaluate(
      client,
      sessionId,
      `(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + scrollX,
          y: rect.top + scrollY,
          width: rect.width,
          height: rect.height,
          scale: 1
        };
      })()`,
    );
    if (!clip || clip.width <= 0 || clip.height <= 0) {
      throw new Error(`Screenshot target has no rendered box: ${selector}`);
    }
    const result = await client.send(
      "Page.captureScreenshot",
      {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: true,
        clip,
      },
      sessionId,
    );
    if (!result.data) {
      throw new Error(`Chrome returned an empty screenshot for ${selector}.`);
    }
    fs.writeFileSync(outputPath, Buffer.from(result.data, "base64"));
  } finally {
    await client
      .send("Runtime.releaseObject", { objectId }, sessionId)
      .catch(() => {});
  }
}
