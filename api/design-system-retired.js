const CANONICAL_SURFACES_DESIGN_SYSTEM_URL =
  "https://surfaces.systems/design-system";
const DESIGN_SYSTEM_MIGRATION_CODE = "judgmentkit_design_system_retired";

function requestedPath(req) {
  const queryPath = req.query?.requestedPath;

  if (Array.isArray(queryPath)) {
    return queryPath[0] ?? "/design-system";
  }

  if (typeof queryPath === "string" && queryPath.length > 0) {
    return queryPath;
  }

  return req.url ?? "/design-system";
}

export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end("Method not allowed.\n");
    return;
  }

  const payload = {
    code: DESIGN_SYSTEM_MIGRATION_CODE,
    message:
      "judgmentkit.ai/design-system is retired. Use the canonical Surfaces design-system contract.",
    canonicalUrl: CANONICAL_SURFACES_DESIGN_SYSTEM_URL,
    requestedPath: requestedPath(req),
  };
  const body = `${JSON.stringify(payload, null, 2)}\n`;

  res.statusCode = 410;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("Content-Length", Buffer.byteLength(body));

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(body);
}
