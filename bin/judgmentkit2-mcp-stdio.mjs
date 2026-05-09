#!/usr/bin/env node
import process from "node:process";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createJudgmentKitMcpServer } from "../src/mcp.mjs";

async function main() {
  const server = createJudgmentKitMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`JudgmentKit 2 stdio MCP failed: ${message}\n`);
  process.exit(1);
});
