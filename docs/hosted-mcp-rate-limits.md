# Hosted MCP Rate Limits

JudgmentKit currently keeps the hosted MCP endpoint open and capped. The goal is abuse protection, not monetization friction.

## Active Limits

- Public POST endpoints: `POST https://judgmentkit.ai/mcp` and `POST https://judgmentkit.ai/mcp/`
- Vercel project: `surfaces-platform/judgmentkit-ai`
- WAF rule name: `Rate limit JudgmentKit MCP POST`
- Limit: `60` requests per `60` seconds per IP
- Action: rate-limit response with `429` when the limit is exceeded

Static pages, `/install`, `GET /mcp` metadata, and `GET /mcp/` metadata remain open. Vercel's CLI-backed WAF rate-limit window currently supports up to one hour, so the optional `1,000 requests/day/IP` guard is deferred unless a durable app-level quota store is added. WAF and app-level guards should cover both public hosted MCP route spellings.

## App-Level Guards

The hosted MCP handler also rejects:

- non-JSON `POST /mcp` and `POST /mcp/` requests with `415`
- request bodies over `128KB` on `POST /mcp` and `POST /mcp/` with `413`
- malformed JSON on `POST /mcp` and `POST /mcp/` with `400` and JSON-RPC parse error code `-32700`
- more than one concurrent browser-backed visual-composition review in the same function instance with `visual_composition_browser_capacity_exceeded`
- browser-backed visual-composition reviews that exceed `25` seconds with `visual_composition_browser_timeout`

Browser admission is intentionally scoped to renderable, self-contained visual-review candidates. Code-only diagnostics and other MCP tools do not consume a browser slot. The concurrency guard is per warm function instance, not a distributed limit across autoscaled Vercel instances, so the WAF rule remains required and should be verified whenever the hosted browser path changes.

## Weekly Review

Review these signals weekly before adding commercial gating:

- Vercel Analytics page views
- MCP initialize, tools/list, and tools/call events
- Vercel usage for `judgmentkit-ai`
- Vercel WAF rate-limit events

Do not add API keys, Stripe, paid tiers, or automatic overage billing until there is sustained external usage. Revisit monetization when any of these are true:

- more than `500` external MCP tool calls per day for seven consecutive days
- projected JudgmentKit traffic exceeds `$5/month` in Vercel usage
- at least `5` distinct external users or teams ask to depend on hosted JudgmentKit
