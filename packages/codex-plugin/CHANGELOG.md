# Changelog

## 0.2.0 - 2026-08-31

- Added a canonical, client-portable JudgmentKit skill with conditional UI handoff and deck-creation references.
- Changed the default activity-case experience to infer, review, and show a working premise before asking at most one consequential question.
- Added `Proceed`, `Quick`, and `Guided` pacing without changing model capability, evidence requirements, or acceptance gates.
- Repositioned Codex discovery metadata around inference-first UI design while preserving explicit invocation and truthful deck-export routing.
- Added static verification for the portable source, Codex mirror, conditional references, inference-first behavior, and discovery metadata.

## 0.1.0 - 2026-07-04

- Added versioned source package for the JudgmentKit Codex plugin under `packages/codex-plugin`.
- Bootstrapped plugin manifest, hosted MCP configuration, hosted MCP skill, and OpenAI agent metadata from the local personal plugin source.
- Normalized the committed plugin version to base semver `0.1.0` with no Codex cachebuster suffix.
- Documented the package-local version policy and hosted privacy/local boundary.
