import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import {
  createJudgmentKitMcpServer,
  getMcpMetadata,
} from "./mcp.mjs";

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

function parsedBodyFromRequest(req) {
  if (req.body === undefined) {
    return undefined;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  return req.body;
}

export async function handleJudgmentKitMcpNodeRequest(req, res) {
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

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createJudgmentKitMcpServer();

  await server.connect(transport);
  await transport.handleRequest(req, res, parsedBodyFromRequest(req));
}
