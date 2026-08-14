#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { handleJudgmentKitMcpNodeRequest } from "../src/mcp-http.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_SITE_DIR = path.join(ROOT, "site", "dist");
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4173;

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".vtt", "text/vtt; charset=utf-8"],
  [".webp", "image/webp"],
]);

function parseArgs(argv) {
  const options = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    siteDir: DEFAULT_SITE_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--host") {
      options.host = argv[++index];
    } else if (arg === "--port") {
      options.port = Number.parseInt(argv[++index], 10);
    } else if (arg === "--dir" || arg === "--site-dir") {
      options.siteDir = path.resolve(argv[++index]);
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }

  if (!options.help && (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535)) {
    throw new Error("--port must be an integer from 0 to 65535.");
  }

  if (!options.help && (!options.host || typeof options.host !== "string")) {
    throw new Error("--host must be a non-empty string.");
  }

  return options;
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node scripts/site-local-server.mjs [--host 127.0.0.1] [--port 4173] [--dir site/dist]",
      "",
      "Serves site/dist and routes /mcp to the local Streamable HTTP MCP handler.",
      "",
    ].join("\n"),
  );
}

function sendText(res, statusCode, text, headers = {}) {
  res.statusCode = statusCode;

  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }

  if (!res.hasHeader("Content-Type")) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
  }

  res.end(text);
}

function sendMethodNotAllowed(res, allowedMethods) {
  res.setHeader("Allow", allowedMethods.join(", "));
  sendText(res, 405, "Method not allowed.\n");
}

function isMcpPath(pathname) {
  return pathname === "/mcp" || pathname === "/mcp/" || pathname === "/api/mcp";
}

function isLocalAnalyticsScriptPath(pathname) {
  return pathname === "/_vercel/insights/script.js";
}

function serveLocalAnalyticsScript(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendMethodNotAllowed(res, ["GET", "HEAD"]);
    return;
  }

  const body = [
    "window.va=window.va||function(){",
    "(window.vaq=window.vaq||[]).push(arguments);",
    "};",
    "",
  ].join("");
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(body));

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(body);
}

function decodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function resolveInsideSite(siteDir, decodedPathname) {
  if (!decodedPathname || decodedPathname.includes("\0")) {
    return null;
  }

  const relativePath = decodedPathname.replace(/^\/+/, "");
  const resolvedPath = path.resolve(siteDir, relativePath);
  const siteDirWithSeparator = siteDir.endsWith(path.sep) ? siteDir : `${siteDir}${path.sep}`;

  if (resolvedPath !== siteDir && !resolvedPath.startsWith(siteDirWithSeparator)) {
    return null;
  }

  return resolvedPath;
}

async function resolveStaticFile(siteDir, pathname) {
  const decodedPathname = decodePathname(pathname);
  const basePath = resolveInsideSite(siteDir, decodedPathname);

  if (!basePath) {
    return null;
  }

  const candidates = [];

  if (decodedPathname === "/") {
    candidates.push(path.join(siteDir, "index.html"));
  } else if (decodedPathname.endsWith("/")) {
    candidates.push(path.join(basePath, "index.html"));
  } else {
    candidates.push(basePath);
  }

  for (const candidate of candidates) {
    let stat;

    try {
      stat = await fsp.stat(candidate);
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") {
        throw error;
      }

      continue;
    }

    if (stat.isDirectory()) {
      const indexFile = path.join(candidate, "index.html");

      try {
        const indexStat = await fsp.stat(indexFile);

        if (indexStat.isFile()) {
          return { filePath: indexFile, stat: indexStat };
        }
      } catch (error) {
        if (error.code !== "ENOENT" && error.code !== "ENOTDIR") {
          throw error;
        }
      }

      continue;
    }

    if (stat.isFile()) {
      return { filePath: candidate, stat };
    }
  }

  return null;
}

function contentTypeFor(filePath) {
  if (path.basename(filePath) === "install") {
    return "text/x-shellscript; charset=utf-8";
  }

  return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function parseByteRange(rangeHeader, size) {
  if (typeof rangeHeader !== "string" || !rangeHeader.startsWith("bytes=")) {
    return null;
  }

  const value = rangeHeader.slice("bytes=".length).trim();
  if (!value || value.includes(",")) {
    return false;
  }

  const match = /^(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || size <= 0) {
    return false;
  }

  let start;
  let end;

  if (!match[1]) {
    const suffixLength = Number.parseInt(match[2], 10);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return false;
    }
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number.parseInt(match[1], 10);
    end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  }

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  ) {
    return false;
  }

  return { start, end: Math.min(end, size - 1) };
}

async function serveStaticFile(req, res, siteDir, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendMethodNotAllowed(res, ["GET", "HEAD"]);
    return;
  }

  const file = await resolveStaticFile(siteDir, pathname);

  if (!file) {
    sendText(res, 404, "Not found.\n");
    return;
  }

  const requestedRange = req.headers.range
    ? parseByteRange(req.headers.range, file.stat.size)
    : null;

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", contentTypeFor(file.filePath));

  if (requestedRange === false) {
    res.statusCode = 416;
    res.setHeader("Content-Range", `bytes */${file.stat.size}`);
    res.setHeader("Content-Length", 0);
    res.end();
    return;
  }

  const start = requestedRange?.start ?? 0;
  const end = requestedRange?.end ?? file.stat.size - 1;
  const contentLength = end >= start ? end - start + 1 : 0;

  res.statusCode = requestedRange ? 206 : 200;
  res.setHeader("Content-Length", contentLength);
  if (requestedRange) {
    res.setHeader("Content-Range", `bytes ${start}-${end}/${file.stat.size}`);
  }

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  if (contentLength === 0) {
    res.end();
    return;
  }

  const stream = fs.createReadStream(file.filePath, { start, end });
  stream.on("error", (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    sendText(res, 500, "Internal server error.\n");
  });
  stream.pipe(res);
}

export function createSiteLocalServer(options = {}) {
  const siteDir = path.resolve(options.siteDir ?? DEFAULT_SITE_DIR);

  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");

    if (isMcpPath(requestUrl.pathname)) {
      handleJudgmentKitMcpNodeRequest(req, res).catch((error) => {
        if (res.headersSent) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        sendText(
          res,
          500,
          `${JSON.stringify(
            {
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message: "Internal server error",
                data: message,
              },
              id: null,
            },
            null,
            2,
          )}\n`,
          { "Content-Type": "application/json; charset=utf-8" },
        );
      });
      return;
    }

    if (isLocalAnalyticsScriptPath(requestUrl.pathname)) {
      serveLocalAnalyticsScript(req, res);
      return;
    }

    serveStaticFile(req, res, siteDir, requestUrl.pathname).catch((error) => {
      if (res.headersSent) {
        return;
      }

      sendText(res, 500, `${error instanceof Error ? error.message : String(error)}\n`);
    });
  });
}

export function listenSiteLocalServer(options = {}) {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const server = createSiteLocalServer(options);

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      const resolvedPort = typeof address === "object" && address ? address.port : port;
      resolve({
        server,
        url: `http://${host}:${resolvedPort}`,
      });
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
  } else {
    const { url } = await listenSiteLocalServer(options);
    process.stdout.write(`JudgmentKit local site server listening at ${url}\n`);
  }
}
