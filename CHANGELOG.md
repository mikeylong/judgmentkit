# Changelog

## Unreleased

- Preserved no-config UI implementation contracts with the JudgmentKit package-default design-system source while validating malformed explicit `design_system_source` values as failures.
- Retired public `/design-system` pages in favor of the canonical Surfaces contract without removing JudgmentKit's built-in package default.

## 0.5.0 - 2026-06-20

- Added `review_cognitive_dimensions_candidate` as a library and MCP tool for reviewing UI workflow or implementation candidates against activity mapping, evidence visibility, hidden dependencies, premature commitment, progressive evaluation, change cost, mental operations, role expressiveness, and disclosure discipline.
- Added an optional Cognitive Dimensions gate to `create_ui_generation_handoff`; if supplied, the review must be `ready_for_review` before generation handoff proceeds.
- Expanded the MCP pilot case set, deterministic eval harness, and model UI evidence with Cognitive Dimensions scenarios.
- Updated frontend and eval skills so agents use Cognitive Dimensions findings as diagnostic review guidance without copying those terms into product UI.
- Strengthened the design-system site dark-mode implementation and browser QA, including nav/menu/report/map/modal surfaces and step marker contrast.
- Added the ED flow board example and regression coverage for the current release surface.

## 0.3.0 - 2026-06-15

- Released the first shippable AI-native contract package with package, contract, MCP metadata, and MCP pilot required version sources aligned to `0.3.0`.
- Added replayable first-use fixtures for the generate, review, repair, resubmit loop.
- Added canonical setup/onboarding, operational dashboard, and high-stakes review examples for the contract-governed AI-native design system.
- Added package install/import smoke coverage from an `npm pack` artifact.
- Kept the visual token adapter boundary-only and the default renderer/component package deferred.

## 0.2.0 - 2026-06-12

- Expanded the UI implementation contract with `implementation_contract.accessibility_policy`.
- Defaulted accessibility policy metadata to a WCAG 2.2 AA profile with contrast targets for normal text, large text, and non-text UI.
- Added machine-readable accessibility contract groups for readability and contrast, keyboard and focus, semantics and structure, forms/status/errors, motion/media/timing, and responsive/input behavior.
- Added reviewer evidence gates for core accessibility evidence plus conditional visual-background contrast, non-text contrast, forced-colors, target size, motion, form/status, media alternative, and semantic fallback evidence.
- Extended `review_ui_implementation_candidate` to accept structured accessibility evidence, preserve `covered_states` and `static_evidence` aliases, fail reported accessibility failures, and reject below-target visual-background contrast.
- Carried accessibility policy expectations through frontend generation context, frontend implementation skill context, MCP structured content, planning cards, docs, and skill guidance.
- Added a search-page accessibility comparison demo showing an unguided baseline beside a JudgmentKit MCP-guided implementation.
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
