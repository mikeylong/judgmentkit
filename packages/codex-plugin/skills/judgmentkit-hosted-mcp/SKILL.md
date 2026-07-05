---
name: judgmentkit-hosted-mcp
description: Use JudgmentKit when the user explicitly asks or the project opts in to clarify what a UI must support, choose the right surface type, review workflow fit, set disclosure boundaries, enforce design-system acceptance gates, or prepare design-system handoff criteria before product UI is planned, generated, reviewed, or accepted.
---

# JudgmentKit Hosted MCP

## Overview

Use this skill to help product designers working with Codex clarify the job a product UI must do before screens, components, or styling are chosen. Start from a brief, Figma or Adobe handoff, design mockup, generated screen, or local source context and make the design decision set explicit: participants, outcomes, workflow, surface type, domain language, disclosure boundaries, required states, and evidence needed for handoff or acceptance.

MCP and server details belong only in setup, diagnostics, audit, or integration work. Keep them out of product-facing UI and copy.

## Design-System Acceptance Gate

Treat the active design system as an existential gate for generated UI:

- A generated UI that does not pass the active design system is not an artifact. It is a failed candidate.
- If no complete external design-system adapter is supplied and intended, the active authority is the internal JudgmentKit design system returned by `create_ui_implementation_contract`.
- Do not accept, render, publish, summarize as successful, or preserve a generated UI candidate until `review_ui_implementation_candidate` passes against the active implementation contract.
- Do not repair design-system failures in the renderer or downstream glue code. Send the failed candidate back through JudgmentKit MCP review and use the returned hard constraints and repair instructions.
- Do not treat "mostly uses tokens", wrapper normalization, fallback styling, visual cleanup, or post-hoc token rewriting as design-system compliance.
- Reject strict JudgmentKit candidates that carry visual authority outside the active design system, including inline `style` attributes, model-defined visual custom properties, local aliases, literal colors, literal shadows, undeclared token names, external fonts, or unsupported component semantics.
- Legacy, stale, or previously accepted captures must be re-reviewed against the active implementation contract before they can be used as current artifacts.
- If the active design-system review fails, the next action is repair or regeneration against the MCP-returned constraints, not acceptance with caveats.

## Privacy Boundary

The hosted endpoint processes the MCP request payload and records sanitized usage events such as event type and tool name. It does not intentionally store submitted briefs, design context, generated code, or review packets, but hosted requests still leave the local environment.

Use sanitized inputs for confidential work. For unreleased designs, proprietary design-system details, source code, customer data, or internal roadmaps, prefer a local checkout, local stdio server, or self-hosted JudgmentKit MCP endpoint instead of `https://judgmentkit.ai/mcp`.

## Policy Check

Before calling MCP tools, check the active user, project, and AGENTS instructions.

- Use JudgmentKit only when the user explicitly asks for it or the current project instructions opt into JudgmentKit for the task.
- Do not send confidential briefs, unreleased designs, proprietary design-system details, source code, customer data, or internal roadmap context to the hosted endpoint unless workspace policy allows it.
- When allowed, use JudgmentKit for UI generation, UI critique, implementation planning, workflow review, handoff review, and generated UI acceptance.
- Do not use JudgmentKit for unrelated backend work, factual answers, docs-only edits, or general code review unless the task depends on UI activity fit.
- If the activity is setup, debugging, auditing, or integration work, implementation details may be visible. Otherwise, keep prompts, schemas, resource ids, MCP servers, tool names, traces, and model configuration out of product UI.
- When ranking findings, use `High`, `Medium`, and `Low` labels.

## Default Workflow

1. Read the user's brief and available local source context.
2. Call `create_activity_model_review` with the source brief.
3. If the packet needs source context, ask only the targeted blocking questions unless local context answers them.
4. Call `recommend_surface_types({ brief, activity_review })` before workflow or frontend implementation guidance.
5. When a model or agent proposes an activity model, call `review_activity_model_candidate` before trusting it.
6. When a UI workflow is proposed, call `recommend_ui_workflow_profiles` for specialized review fit when useful, then call `review_ui_workflow_candidate`.
7. Call `review_cognitive_dimensions_candidate` when mapping, visibility, hidden dependencies, premature commitment, progressive evaluation, change cost, mental operations, or disclosure risks matter.
8. Call `create_ui_implementation_contract`. Use the default JudgmentKit design-system source unless a complete external design-system adapter is available and intended.
9. Call `create_ui_generation_handoff` with the reviewed workflow and implementation contract before generating UI.
10. Call `create_frontend_generation_context` when implementation needs project runtime, UI library, approved component families, visual requirements, verification commands, or browser checks.
11. Call `create_frontend_implementation_skill_context` when the implementing agent needs portable frontend guidance.
12. After implementation, call `review_ui_implementation_candidate` with the generated code or evidence and the active implementation contract before accepting the result.
13. If design-system authority fails, stop treating the output as generated UI. Use the MCP review result to issue hard constraints and regenerate or repair before any acceptance step.

Use the MCP response `structuredContent` for follow-up tool calls and implementation decisions. Use `content[0].text` as the concise human-facing planning card.

## Activity Contract

Before suggesting screens, components, or styling, establish:

- activity being supported
- participants
- objective and outcomes
- existing tools and artifacts
- rules and rituals
- division of labor
- domain vocabulary
- implementation concepts that must stay hidden
- diagnostics that may be revealed only when useful

Then produce or verify the interaction contract:

- what the user is trying to do
- how they think about the work
- primary decisions
- what should be easy or harder
- terms to use and avoid
- state changes that matter to the activity
- what the user should leave knowing or having done

## Surface Types

Treat surface type as activity-purpose guidance, not visual theme guidance:

- `marketing`: persuade, orient, convert, or explain an offer
- `workbench`: inspect, compare, decide, and act across work items
- `operator_review`: review AI- or system-produced work, evidence, risk, and handoff
- `form_flow`: collect or change structured information with validation
- `dashboard_monitor`: track status, exceptions, trends, or operational health
- `content_report`: read, understand, cite, or share information
- `setup_debug_tool`: configure, inspect, test, or troubleshoot machinery
- `conversation`: support open-ended exchange where the thread is primary

If two surface types are plausible, choose from the user's completion state before choosing components. For example, a monitor stays a monitor when tickets are downstream drill-in, while an operator review surface is appropriate when a human reviews AI- or system-produced work before it advances.

## Disclosure Rules

Product UI should use domain language and hide implementation machinery unless the user is doing setup, debugging, auditing, integration, or explicit source inspection.

Avoid copying these terms into product UI:

- `ready_for_review`
- `activity_model`
- `review_status`
- `Primary user`
- `Main decision`
- prompt template
- resource id
- schema
- tool call
- MCP server
- trace
- model configuration

Translate implementation language into activity language:

- Use `refund request`, not `database table`.
- Use `handoff reason`, not `tool call result`.
- Use `policy review`, not `prompt template`.

## Implementation Gate

Generate or accept frontend work only after the activity, target participant, primary decision, outcome, domain language, disclosure boundary, workflow candidate, surface type, and implementation contract are explicit enough for review.

Design-system compliance is mandatory:

- The generated UI must pass the active implementation contract's design-system source.
- If no external adapter is active, generated UI must use the internal JudgmentKit design-system authority exactly as returned by the contract.
- A failed design-system check blocks acceptance, publishing, screenshots, examples, release evidence, and handoff completion.
- Renderer-side cleanup may make failed work easier to inspect, but it must not convert failed work into an accepted artifact.

Require evidence appropriate to the surface:

- approved primitives and required states from the implementation contract
- static checks
- desktop and mobile browser QA
- accessibility evidence for semantics, keyboard navigation, focus order, focus-visible, responsive reflow/no-overflow, and automated checks
- conditional evidence for meaningful non-text visuals, custom widgets, forms, status messages, overlays, motion, dense controls, hover or focus content, and text over generated or rendered visuals

When substantive visuals are required, use image generation, Three.js/WebGL, or D3-style visualization rather than rudimentary CSS/SVG/JS geometry as the final visual asset.

## Fallback

If the hosted MCP server is unavailable, say that JudgmentKit results could not be created and ask whether to continue with the deterministic activity-first checklist. Do not label checklist output as a JudgmentKit packet.
