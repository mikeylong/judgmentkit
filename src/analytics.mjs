import { track } from "@vercel/analytics/server";

import { listTools } from "./mcp.mjs";

export const ANALYTICS_EVENT_NAMES = {
  mcpInitialize: "JudgmentKit MCP initialize",
  mcpListTools: "JudgmentKit MCP list tools",
  mcpCallTool: "JudgmentKit MCP call tool",
};

const SAFE_TOOL_NAMES = new Set(listTools().map((tool) => tool.name));

function toMessages(parsedBody) {
  if (parsedBody === undefined || parsedBody === null) {
    return [];
  }

  return Array.isArray(parsedBody) ? parsedBody : [parsedBody];
}

function safeToolName(value) {
  return typeof value === "string" && SAFE_TOOL_NAMES.has(value) ? value : "unknown";
}

export function getMcpAnalyticsEvents(parsedBody) {
  return toMessages(parsedBody).flatMap((message) => {
    if (!message || typeof message !== "object" || typeof message.method !== "string") {
      return [];
    }

    if (message.method === "initialize") {
      return [{ name: ANALYTICS_EVENT_NAMES.mcpInitialize }];
    }

    if (message.method === "tools/list") {
      return [{ name: ANALYTICS_EVENT_NAMES.mcpListTools }];
    }

    if (message.method === "tools/call") {
      return [
        {
          name: ANALYTICS_EVENT_NAMES.mcpCallTool,
          properties: {
            tool_name: safeToolName(message.params?.name),
          },
        },
      ];
    }

    return [];
  });
}

function getHeaderValue(req, name) {
  const header = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];

  if (Array.isArray(header)) {
    return header[0] ?? "";
  }

  return header ?? "";
}

function getAnalyticsReferer(req) {
  const host =
    getHeaderValue(req, "x-forwarded-host") ||
    getHeaderValue(req, "host") ||
    "judgmentkit.ai";
  const protocol = getHeaderValue(req, "x-forwarded-proto") || "https";

  return `${protocol}://${host}/mcp`;
}

function createSanitizedAnalyticsHeaders(req) {
  return new Headers({
    referer: getAnalyticsReferer(req),
    "user-agent": "judgmentkit-mcp",
    "x-forwarded-for": "",
    cookie: "",
  });
}

export async function trackMcpAnalyticsEvents(parsedBody, req, options = {}) {
  const tracker = options.tracker ?? track;
  const events = getMcpAnalyticsEvents(parsedBody);

  await Promise.all(
    events.map(async (event) => {
      try {
        await tracker(event.name, event.properties, {
          headers: createSanitizedAnalyticsHeaders(req),
        });
      } catch {
        // Analytics must never affect MCP transport behavior.
      }
    }),
  );
}
