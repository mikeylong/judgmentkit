# Hosted MCP Rate Limits

JudgmentKit currently keeps the hosted MCP endpoint open and capped. The goal is abuse protection, not monetization friction.

## Active Limits

- Endpoint: `POST https://judgmentkit.ai/mcp`
- Vercel project: `surfaces-platform/judgmentkit-ai`
- WAF rule name: `Rate limit JudgmentKit MCP POST`
- Limit: `60` requests per `60` seconds per IP
- Action: rate-limit response with `429` when the limit is exceeded

Static pages, `/install`, and `GET /mcp` metadata remain open. Vercel's CLI-backed WAF rate-limit window currently supports up to one hour, so the optional `1,000 requests/day/IP` guard is deferred unless a durable app-level quota store is added.

## App-Level Guards

The hosted MCP handler also rejects:

- non-JSON `POST /mcp` requests with `415`
- request bodies over `128KB` with `413`
- malformed JSON with the existing JSON-RPC parse error

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
