import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import {
  createJudgmentKitMcpServer,
  getMcpMetadata,
} from "./mcp.mjs";
import { trackMcpAnalyticsEvents } from "./analytics.mjs";

export const MAX_MCP_POST_BODY_BYTES = 128 * 1024;

export function getHostedMcpMetadata() {
  return {
    ...getMcpMetadata("streamable-http"),
    public_route: {
      role: "mcp_endpoint_and_metadata",
      hosted_mcp_endpoint: true,
      usage:
        "Connect an MCP Streamable HTTP client to this URL. GET without an SSE Accept header returns this metadata.",
    },
  };
}

function getHeaderValue(req, name) {
  const header = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];

  if (Array.isArray(header)) {
    return header.join(", ");
  }

  return header ?? "";
}

function wantsMetadata(req) {
  const accept = getHeaderValue(req, "accept");

  return req.method === "GET" && !accept.includes("text/event-stream");
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Accept, Content-Type, Last-Event-ID, Mcp-Protocol-Version, Mcp-Session-Id",
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Protocol-Version, Mcp-Session-Id");
}

function sendJson(res, statusCode, value) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(`${JSON.stringify(value, null, 2)}\n`);
}

function isJsonContentType(req) {
  const contentType = getHeaderValue(req, "content-type").toLowerCase();

  return /(^|;|\s)application\/(?:json|[^;\s]+[+]json)(?:;|$|\s)/.test(contentType);
}

function contentLengthExceedsLimit(req) {
  const contentLength = Number.parseInt(getHeaderValue(req, "content-length"), 10);

  return Number.isFinite(contentLength) && contentLength > MAX_MCP_POST_BODY_BYTES;
}

function readStream(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let byteLength = 0;

    req.setEncoding?.("utf8");
    req.on("data", (chunk) => {
      byteLength += Buffer.byteLength(chunk, "utf8");

      if (byteLength > MAX_MCP_POST_BODY_BYTES) {
        const error = new Error("MCP request body exceeds the 128KB limit.");
        error.code = "MCP_BODY_TOO_LARGE";
        reject(error);
        req.destroy?.();
        return;
      }

      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function parsedBodyFromRequest(req) {
  if (req.body === undefined) {
    if (contentLengthExceedsLimit(req)) {
      const error = new Error("MCP request body exceeds the 128KB limit.");
      error.code = "MCP_BODY_TOO_LARGE";
      throw error;
    }

    const rawBody = await readStream(req);

    if (rawBody.trim().length === 0) {
      return undefined;
    }

    return JSON.parse(rawBody);
  }

  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > MAX_MCP_POST_BODY_BYTES) {
      const error = new Error("MCP request body exceeds the 128KB limit.");
      error.code = "MCP_BODY_TOO_LARGE";
      throw error;
    }

    return JSON.parse(req.body);
  }

  return req.body;
}

function sendJsonRpcParseError(res) {
  sendJson(res, 400, {
    jsonrpc: "2.0",
    error: {
      code: -32700,
      message: "Parse error: Invalid JSON",
    },
    id: null,
  });
}

function sendUnsupportedMediaType(res) {
  sendJson(res, 415, {
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Unsupported media type: POST /mcp requires application/json.",
    },
    id: null,
  });
}

function sendRequestTooLarge(res) {
  sendJson(res, 413, {
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Request body too large: POST /mcp is limited to 128KB.",
    },
    id: null,
  });
}

export async function handleJudgmentKitMcpNodeRequest(req, res, options = {}) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (wantsMetadata(req)) {
    sendJson(res, 200, getHostedMcpMetadata());
    return;
  }

  let parsedBody;

  if (req.method === "POST") {
    if (!isJsonContentType(req)) {
      sendUnsupportedMediaType(res);
      return;
    }

    try {
      parsedBody = await parsedBodyFromRequest(req);
    } catch (error) {
      if (error?.code === "MCP_BODY_TOO_LARGE") {
        sendRequestTooLarge(res);
        return;
      }

      sendJsonRpcParseError(res);
      return;
    }

    await trackMcpAnalyticsEvents(parsedBody, req, {
      tracker: options.analyticsTracker,
    });
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createJudgmentKitMcpServer();

  await server.connect(transport);
  await transport.handleRequest(req, res, parsedBody);
}
