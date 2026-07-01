import { readFile } from "node:fs/promises";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const DEFAULT_ENDPOINT = "https://judgmentkit.ai/mcp";
const DEFAULT_TIMEOUT_MS = 10_000;
const REQUIRED_TOOLS = [
  "create_activity_model_review",
  "recommend_surface_types",
];
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const CANARIES = [
  {
    id: "dashboard-cold-chain-monitor",
    expected_surface_type: "dashboard_monitor",
    brief:
      "A cold-chain operations lead monitors a vaccine shipment dashboard showing lane temperature, dwell time, trailer health, route exceptions, threshold breaches, shipment alerts, custody gaps, and spoilage-risk trends. Shipment and alert drill-in panels give investigation context and follow-up awareness only; the primary surface is status monitoring. Completion is knowing current status and whether follow-up is needed.",
  },
  {
    id: "workbench-cold-chain-exception-processing",
    expected_surface_type: "workbench",
    brief:
      "A cold-chain operations coordinator uses an exception processing workbench for shipments that already breached temperature thresholds. The activity is reviewing each shipment's sensor evidence, carrier notes, product risk, customer SLA, and required handoff, then deciding whether to release, quarantine, re-route, or escalate the shipment. The outcome is an owner, next action, and reason for each exception.",
  },
  {
    id: "dashboard-kpi-monitor",
    expected_surface_type: "dashboard_monitor",
    brief:
      "An operations lead uses a KPI monitor before an executive update. The activity is watching weekly on-time delivery, spoilage risk, temperature excursion rate, stale-data warnings, deltas, thresholds, alerts, trends, and business health. The surface is for status awareness and spotting follow-up needs; the executive update is context, not a narrative report artifact.",
  },
  {
    id: "content-report-executive-update",
    expected_surface_type: "content_report",
    brief:
      "An operations lead prepares a narrative executive update report about cold-chain performance. The activity is reading KPI context, summarizing what changed, explaining variance, citing evidence, and sharing the written update with executives. The outcome is a report that can be read, referenced, and forwarded; it is not a live monitoring dashboard.",
  },
];

function parseArgs(argv) {
  const options = {
    endpoint:
      process.env.JUDGMENTKIT_MCP_ENDPOINT ||
      process.env.HOSTED_JUDGMENTKIT_MCP_ENDPOINT ||
      DEFAULT_ENDPOINT,
    expectedVersion: process.env.JUDGMENTKIT_MCP_EXPECTED_VERSION,
    requireReadyReview: TRUE_VALUES.has(
      (process.env.JUDGMENTKIT_MCP_REQUIRE_READY_REVIEW ?? "").toLowerCase(),
    ),
    timeoutMs:
      Number.parseInt(process.env.JUDGMENTKIT_MCP_TIMEOUT_MS ?? "", 10) ||
      DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--endpoint" && next) {
      options.endpoint = next;
      index += 1;
    } else if (arg === "--expected-version" && next) {
      options.expectedVersion = next;
      index += 1;
    } else if (arg === "--timeout-ms" && next) {
      options.timeoutMs = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--require-ready-review") {
      options.requireReadyReview = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (!arg.startsWith("--")) {
      options.endpoint = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer.");
  }

  return options;
}

function usage() {
  return [
    "Usage: node scripts/hosted-surface-smoke.mjs [--endpoint <url>] [--expected-version <semver>] [--timeout-ms <ms>] [--require-ready-review]",
    "",
    `Defaults: --endpoint ${DEFAULT_ENDPOINT}; --expected-version package.json version.`,
    "By default this is a surface-routing canary; activity review readiness is reported, not failed.",
  ].join("\n");
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function packageVersion() {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  return packageJson.version;
}

async function fetchMetadata(endpoint, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`metadata fetch timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Metadata fetch returned ${response.status}: ${text.slice(0, 200)}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Metadata response was not JSON: ${message}`);
  }
}

function requireTools(toolNames) {
  return REQUIRED_TOOLS.filter((toolName) => !toolNames.includes(toolName));
}

function summarizeScore(surfaceReview, surfaceType) {
  const score = surfaceReview?.diagnostics?.surface_type_scores?.find(
    (entry) => entry.surface_type === surfaceType,
  );

  if (!score) {
    return undefined;
  }

  return {
    score: score.score,
    matched_triggers: score.matched_triggers,
    matched_exclusions: score.matched_exclusions,
  };
}

async function runCanary(client, canary, options) {
  const activityReviewResponse = await withTimeout(
    client.callTool({
      name: "create_activity_model_review",
      arguments: {
        brief: canary.brief,
      },
    }),
    options.timeoutMs,
    `${canary.id} activity review`,
  );

  if (activityReviewResponse.isError) {
    throw new Error(`${canary.id} activity review returned an MCP error.`);
  }

  const activityReview = activityReviewResponse.structuredContent;
  const surfaceResponse = await withTimeout(
    client.callTool({
      name: "recommend_surface_types",
      arguments: {
        brief: canary.brief,
        activity_review: activityReview,
      },
    }),
    options.timeoutMs,
    `${canary.id} surface recommendation`,
  );

  if (surfaceResponse.isError) {
    throw new Error(`${canary.id} surface recommendation returned an MCP error.`);
  }

  const surfaceReview = surfaceResponse.structuredContent;
  const actualSurfaceType = surfaceReview?.recommended_surface_type;
  const surfaceOk = actualSurfaceType === canary.expected_surface_type;
  const activityReviewReady = activityReview?.review_status === "ready_for_review";
  const ok = surfaceOk && (!options.requireReadyReview || activityReviewReady);

  return {
    id: canary.id,
    expected_surface_type: canary.expected_surface_type,
    actual_surface_type: actualSurfaceType,
    ok,
    surface_ok: surfaceOk,
    activity_review_ready: activityReviewReady,
    review_status: activityReview?.review_status,
    confidence: surfaceReview?.confidence,
    blocked_surface_types: surfaceReview?.blocked_surface_types ?? [],
    expected_surface_score: summarizeScore(surfaceReview, canary.expected_surface_type),
    actual_surface_score: summarizeScore(surfaceReview, actualSurfaceType),
  };
}

async function runHostedSurfaceSmoke(options) {
  const expectedVersion = options.expectedVersion || (await packageVersion());
  const metadata = await fetchMetadata(options.endpoint, options.timeoutMs);
  const metadataToolNames = metadata.capabilities?.tools?.map((tool) => tool.name) ?? [];
  const metadataFailures = [
    metadata.name === "JudgmentKit"
      ? null
      : `Expected metadata.name JudgmentKit, got ${metadata.name}.`,
    metadata.version === expectedVersion
      ? null
      : `Expected metadata.version ${expectedVersion}, got ${metadata.version}.`,
    metadata.transport === "streamable-http"
      ? null
      : `Expected metadata.transport streamable-http, got ${metadata.transport}.`,
    metadata.public_route?.hosted_mcp_endpoint === true
      ? null
      : "Expected metadata.public_route.hosted_mcp_endpoint to be true.",
    ...requireTools(metadataToolNames).map((toolName) => `Metadata is missing tool ${toolName}.`),
  ].filter(Boolean);

  let transport;
  let client;
  const canaries = [];
  let clientToolNames = [];

  try {
    transport = new StreamableHTTPClientTransport(new URL(options.endpoint));
    client = new Client({
      name: "judgmentkit-hosted-surface-smoke",
      version: "1.0.0",
    });

    await withTimeout(client.connect(transport), options.timeoutMs, "MCP connect");

    const toolsResponse = await withTimeout(
      client.listTools(),
      options.timeoutMs,
      "MCP tools/list",
    );
    clientToolNames = toolsResponse.tools.map((tool) => tool.name);

    for (const missingTool of requireTools(clientToolNames)) {
      metadataFailures.push(`Connected MCP server is missing tool ${missingTool}.`);
    }

    for (const canary of CANARIES) {
      canaries.push(await runCanary(client, canary, options));
    }
  } finally {
    await client?.close().catch(() => {});
    await transport?.close().catch(() => {});
  }

  const failedCanaries = canaries.filter((canary) => !canary.ok);
  const ok = metadataFailures.length === 0 && failedCanaries.length === 0;

  return {
    ok,
    endpoint: options.endpoint,
    smoke_scope: "surface_routing",
    require_ready_review: options.requireReadyReview,
    activity_review_status_policy: options.requireReadyReview
      ? "must_be_ready_for_review"
      : "reported_only",
    expected_version: expectedVersion,
    metadata: {
      name: metadata.name,
      version: metadata.version,
      transport: metadata.transport,
      hosted_mcp_endpoint: metadata.public_route?.hosted_mcp_endpoint,
      tool_count: metadataToolNames.length,
    },
    connected_tools: clientToolNames,
    canaries,
    failures: [
      ...metadataFailures,
      ...failedCanaries.map(
        (canary) => {
          const reasons = [
            canary.surface_ok
              ? null
              : `expected ${canary.expected_surface_type}, got ${canary.actual_surface_type}`,
            options.requireReadyReview && !canary.activity_review_ready
              ? `activity review status ${canary.review_status}`
              : null,
          ].filter(Boolean).join("; ");

          return `${canary.id} ${reasons}.`;
        },
      ),
    ],
  };
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
  } else {
    const result = await runHostedSurfaceSmoke(options);

    console.log(JSON.stringify(result, null, 2));

    if (!result.ok) {
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
