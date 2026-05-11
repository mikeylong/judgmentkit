# Changelog

## Unreleased

- Relaunched public surfaces under the canonical JudgmentKit name, including CLI/bin names, MCP identity, contract IDs, installer path, and website build.
- Added daily-agent workflow docs, examples, and a repo-local agent usage contract.
- Added CLI parity for review packets and candidate review:
  - `judgmentkit review`
  - `judgmentkit review-candidate --candidate <file>`
- Added `npm run mcp:smoke` for local MCP stdio verification.
- Added eval tags for workflow type, failure mode, and expected next action.
- Added GitHub Actions CI for tests, benchmark, and MCP smoke.
- Added deterministic visual one-shot before/after demo comparing baseline generation with JudgmentKit-guided generation.
- Added a standalone comparison harness for qualitative paired review of raw-brief and JudgmentKit handoff app variants.
- Added a music-app standalone comparison fixture and facilitator scorecard for dinner-playlist curation.
- Added model-assisted UI workflow candidate review as a library and MCP seam, with deterministic checks for workflow completeness, source grounding, implementation leakage, and review-packet term leakage.
- Added an optional OpenAI Responses UI workflow proposer provider with fake-fetch coverage and an env-gated smoke command.
- Added a UI generation handoff gate so only ready workflow reviews can become generation handoffs.

## 0.1.0

- Initial fresh-start JudgmentKit kernel.
- Added deterministic implementation-brief analyzer.
- Added reviewable activity model packets.
- Added model-assisted candidate review seam.
- Added provider-neutral proposer adapter.
- Added MCP stdio tools for analysis, review packet creation, and candidate review.
