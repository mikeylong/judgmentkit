# JudgmentKit header release

Implemented [specs/site-header.md](../../specs/site-header.md), following the activity and disclosure rules in DESIGN.md and contracts/ai-ui-generation.activity-contract.json.

JudgmentKit uses its own favicon mark beside the wordmark. The ecosystem selector is removed, and a direct surfaces.systems link follows the six retained JudgmentKit destinations. The header matches Surfaces’ height, gutters, typography, mark placement, and mobile Menu geometry.

## Release

[PR #60](https://github.com/mikeylong/judgmentkit/pull/60) merged at `4cbbed69c0c40ac10169c43eb942e7dff7bddf6b`. Vercel production deployment `dpl_8gZn9uLxndXW4ejRrLriSKUphDnr` is READY from that exact commit, with https://judgmentkit.ai/ assigned as an alias. The build took 23.323 seconds.

Both final-commit GitHub CI runs passed the full tests, site build, benchmark, and MCP smoke checks. Focused diff review found no remaining in-scope issues. Vercel Agent Review was skipped with a neutral result.

Local main matches origin/main with zero commits ahead or behind. The three preexisting edits in docs/daily-agent-workflows.md, scripts/verify-public-release.mjs, and tests/site-local-server.test.mjs were preserved byte-for-byte.

## Live verification

On production, the real JudgmentKit → Surfaces → JudgmentKit links were followed at 1280 × 720 and 390 × 844. Header, shell, mark, and Menu rectangles matched exactly. Wordmark start position, baseline, and height matched. Back/Forward preserved alignment, the JudgmentKit menu returned closed, the favicon mark loaded, and neither page had horizontal overflow.

- [production-desktop.jpg](production-desktop.jpg) and [production-mobile.jpg](production-mobile.jpg): live screenshots.
- [production-alignment.json](production-alignment.json): live geometry and navigation results.
- [release.json](release.json): exact production commit, deployment, aliases, and CI runs.
- [production-release-verify.json](production-release-verify.json): public routes, redirects, and MCP verification returned `ok: true`. Hosted installation was explicitly skipped.

## Local checks

`npm run test:site` passed. This includes static site checks, local server checks, 14 header browser cases across seven widths in light/dark modes, and desktop/mobile marketing-pattern checks with zero axe violations and zero overflow. Header checks cover logo and font loading, keyboard focus, menu dismissal, sticky positioning, page navigation, and Back restoration. The site build and diff whitespace check passed.

CI exposed classic scrollbar sizing, which is now measured against available layout width and reserved to keep shorter pages stable. It also exposed an existing marketing test’s CSS serialization mismatch. That assertion now compares the same two background-layer dimensions, accepting equivalent implicit or explicit auto height without changing the marketing UI.

The earlier desktop.jpg, mobile.jpg, and alignment.json files record the local comparison before release.
