# Changelog

## Unreleased

- Added daily-agent workflow docs, examples, and a repo-local agent usage contract.
- Added CLI parity for review packets and candidate review:
  - `judgmentkit2 review`
  - `judgmentkit2 review-candidate --candidate <file>`
- Added `npm run mcp:smoke` for local MCP stdio verification.
- Added eval tags for workflow type, failure mode, and expected next action.
- Added GitHub Actions CI for tests, benchmark, and MCP smoke.
- Added deterministic visual one-shot before/after demo comparing baseline generation with JudgmentKit2-guided generation.
- Added model-assisted UI workflow candidate review as a library and MCP seam, with deterministic checks for workflow completeness, source grounding, implementation leakage, and review-packet term leakage.

## 0.1.0

- Initial fresh v2 JudgmentKit kernel.
- Added deterministic implementation-brief analyzer.
- Added reviewable activity model packets.
- Added model-assisted candidate review seam.
- Added provider-neutral proposer adapter.
- Added MCP stdio tools for analysis, review packet creation, and candidate review.
