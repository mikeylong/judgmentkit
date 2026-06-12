# Agent Instructions

## Operating Rules

- Treat this as a fresh-start project. Do not import, copy, or preserve old JudgmentKit concepts unless the user explicitly asks.
- Read `README.md`, `DESIGN.md`, relevant files in `specs/`, and relevant files in `contracts/` before making product or UI changes.
- Start with activity fit, domain appropriateness, succinct interaction, and disclosure discipline.
- Do not make aesthetics, design tokens, component novelty, or visual polish the primary contract.
- When a design spec calls for substantive visuals, use image generation or premium rendering such as Three.js/WebGL/D3-style visualization; do not use rudimentary deterministic CSS/SVG/JS geometry as final visual assets.
- Preserve user work. Do not overwrite existing files unless the user explicitly asks for replacement.
- Keep changes scoped to the active spec and avoid unrelated refactors.
- Add or update tests for behavior, contracts, and drift risks that change.

## Activity-First Rule

Before generating or critiquing a UI, establish:

- the activity being supported
- participants
- objective and outcomes
- existing tools and artifacts
- rules and rituals
- division of labor
- domain vocabulary
- implementation concepts that must stay hidden
- diagnostic details that may be revealed only when useful

Then produce the interaction contract:

- what the user is trying to do
- how they think about the work
- primary decisions
- what the UI should make easy or harder
- terms to use and avoid
- state changes that matter
- what the user should leave knowing or having done

## Disclosure Rule

Primary user-facing UI should not expose machinery such as prompts, schemas, resource ids, MCP servers, tool names, or implementation traces unless the activity is explicitly setup, debugging, auditing, or integration work.

## Visual Asset Rule

Use deterministic CSS, SVG, and JavaScript for layout, text, UI chrome, icons, state, exact typography, simple diagrams, and accessible fallback structure. When the approved spec calls for substantive visuals such as imagery, hero/media assets, product/place/object visuals, domain scenes, or spatial/data visualization, use the `imagegen` skill or a premium rendering path such as Three.js/WebGL/D3-style visualization.

## Local Skills

- Use `skills/write-tests/SKILL.md` for test planning and implementation.

## Daily JudgmentKit Usage

- Use `docs/agent-usage-contract.md` before applying JudgmentKit to UI generation, UI critique, implementation planning, or handoff review.
- Use `docs/daily-agent-workflows.md` for MCP and CLI recipes.
- Prefer `create_activity_model_review` before generating UI from a brief.
- Prefer `review_activity_model_candidate` before trusting an externally proposed activity model.

## Handoff

Summaries should name the spec followed, contracts checked, tests run, and open questions that remain.
