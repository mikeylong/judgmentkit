# JudgmentKit Codex Plugin Source

This package is the versioned source for the JudgmentKit Codex plugin. It was bootstrapped from the local personal plugin source, not from an installed Codex cache.

## Version Policy

- `package.json` is the committed plugin version source.
- `.codex-plugin/plugin.json` mirrors the same base semver version for Codex plugin metadata.
- Do not commit Codex timestamp or cachebuster suffixes in this source package.
- Cachebuster versions, if needed, belong only in local sync or install output outside this checked-in package.

Current committed plugin version: `0.1.0`.

## Package Contents

- `package.json`: package metadata and authoritative plugin version.
- `.codex-plugin/plugin.json`: Codex plugin manifest.
- `.mcp.json`: hosted JudgmentKit MCP endpoint configuration.
- `skills/judgmentkit-hosted-mcp/SKILL.md`: agent-facing hosted MCP usage policy and workflow.
- `skills/judgmentkit-hosted-mcp/agents/openai.yaml`: OpenAI agent metadata for the skill.
- `CHANGELOG.md`: package-local release history.

## Discoverable Triggers

Use the hosted skill when a user or agent asks JudgmentKit to review UI activity fit, set design-system acceptance gates, prepare handoff criteria, or create a slide deck, presentation, PowerPoint, or PPTX from an allowed brief, review packet, handoff, or implementation evidence.

Visible trigger examples:

- "Use JudgmentKit to create a slide deck from this product brief."
- "Make a JudgmentKit presentation from this workflow review."
- "Turn this handoff into a PPTX deck."

If the active JudgmentKit MCP server does not expose a deck creation tool yet, report that the current endpoint cannot create the deck and collect the deck audience, purpose, source material, confidentiality boundary, and desired output format without fabricating an MCP result.

## Hosted Privacy Boundary

The included MCP configuration points to `https://judgmentkit.ai/mcp`. Hosted requests leave the local environment and are appropriate only for allowed or sanitized work.

Do not send confidential briefs, unreleased designs, proprietary design-system details, source code, customer data, or internal roadmaps to the hosted endpoint unless the active workspace policy allows it. For that work, use a local checkout, local stdio server, or self-hosted JudgmentKit MCP endpoint instead.

## Source Boundary

Keep this package limited to plugin source files. Do not use it for generated install caches, root project scripts, root tests, repository-wide docs, or installed Codex cache contents.

Build output belongs under `dist/` and is ignored by git. Local personal plugin copies are sync targets, not source.
