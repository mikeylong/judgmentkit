import { handleJudgmentKitMcpNodeRequest } from "../src/mcp-http.mjs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    await handleJudgmentKitMcpNodeRequest(req, res);
  } catch (error) {
    if (res.headersSent) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
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
    );
  }
}
