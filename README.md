# JudgmentKit

JudgmentKit is a fresh activity-first kernel for AI-generated interface work.

It is not a beautifier, design-system compliance layer, prompt library, schema browser, or MCP reference surface. Those may exist later as adapters. The core job is to help an agent generate or critique UI that is relevant, succinct, and appropriate to the activity it supports.

## Product Thesis

AI-generated UI fails when the implementation model becomes the user experience. Tables become screens, schemas become forms, tool calls become buttons, and internal prompts become product vocabulary.

JudgmentKit gives the agent a better order of operations:

1. Understand the activity.
2. Translate the activity into interaction responsibilities.
3. Decide what implementation detail should stay hidden, be translated, or appear only as diagnostics.
4. Generate or critique the UI.
5. Apply visual system choices only after the activity and interaction model are sound.

Aesthetics are adapter-layer work. They should refine a relevant UI, not rescue a broken one.

## Kernel

- `ActivityModel`: the activity system the UI enters.
- `InteractionContract`: the specific user actions, decisions, state changes, and success criteria the UI must support.
- `DisclosurePolicy`: the vocabulary and visibility rules that prevent implementation leakage.
- `JudgmentExample`: a before/after case that calibrates what good and bad generated UI look like.

## Architecture

JudgmentKit keeps the core deterministic and lets model assistance enter through explicit seams:

1. Deterministic analyzer: extracts activity evidence, implementation terms, review questions, and disclosure risks from a brief.
2. Deterministic review packet: turns that evidence into a reviewable activity model candidate with guardrails.
3. Model-assisted candidate review seam: accepts a model-proposed candidate through dependency injection or MCP and runs the same guardrails.
4. Provider-neutral proposer adapter: builds a serializable activity-model request for an injected model caller and returns the proposed candidate to the review seam.
5. UI workflow candidate review seam: accepts a model- or agent-proposed workflow candidate and checks grounding, action support, handoff clarity, and disclosure containment before UI implementation.
6. UI generation handoff gate: turns only ready workflow reviews into compact handoffs for the next UI generation pass.
7. Optional provider adapters: provider configuration and network calls stay outside the kernel and feed proposed candidates back through the same review contract.

## Structure

- `AGENTS.md`: operating rules for agents working in this repository.
- `DESIGN.md`: activity-first judgment contract.
- `specs/`: product and interface specs for the kernel.
- `contracts/`: machine-readable activity and disclosure contracts.
- `docs/`: daily workflow guidance for agents and local usage.
- `examples/`: copyable briefs and candidate fixtures for CLI and MCP checks.
- `tests/`: checks that protect the kernel from drifting back to aesthetic-first or implementation-first work.

## First Workflow

The first workflow is AI UI generation. It starts with one contract:

- `contracts/ai-ui-generation.activity-contract.json`

The first validation command is:

```bash
npm test
```

For daily local use:

```bash
npm run mcp:smoke
judgmentkit review --input examples/refund-triage.brief.txt
```

For a Codex Streamable HTTP install from a checkout:

```bash
npm run install:mcp -- --client codex --dry-run
```

The installed Codex server is named `judgmentkit` and points at the hosted Streamable HTTP endpoint, `https://judgmentkit.ai/mcp`. The repo-local stdio transport remains available for development smoke checks through `npm run mcp:smoke`.

Optional OpenAI Responses smoke checks are opt-in:

```bash
JUDGMENTKIT_OPENAI_SMOKE=1 \
OPENAI_API_KEY=... \
JUDGMENTKIT_OPENAI_MODEL=... \
npm run smoke:openai-ui-workflow
```

For a deterministic one-shot before/after demo:

```bash
npm run demo:one-shot
```

That command also writes `examples/demo/one-shot-demo.html` for visual review.

For an early standalone comparison harness:

```bash
npm run demo:comparison
```

That command writes two independently runnable apps plus a manifest under `examples/comparison/`. Use it for qualitative paired comparisons of the raw brief baseline versus the JudgmentKit handoff path.

For a music-app standalone comparison:

```bash
npm run demo:comparison:music
```

That command writes a dinner-playlist brief, two independently runnable apps, a manifest, and a facilitator scorecard under `examples/comparison/music/`.

For the replacement website build:

```bash
npm run site:build
```

That command writes static routes for `/`, `/docs/`, `/examples/`, and `/install` under `site/dist/`. The public `/mcp` route is served by the hosted Streamable HTTP MCP function and returns metadata for browser GET requests.
