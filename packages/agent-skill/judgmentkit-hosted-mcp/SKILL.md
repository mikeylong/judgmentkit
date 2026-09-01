---
name: judgmentkit-hosted-mcp
description: Use JudgmentKit when explicitly requested or a project opts in to infer and review an activity-centered UI case, show a concrete first design direction, prepare a Figma or code handoff, review generated UI, enforce design-system acceptance, or create a JudgmentKit slide deck from allowed source material.
---

# JudgmentKit

## Purpose

Use JudgmentKit to carry design intent from a rough brief or existing artifact into a reviewed activity case and, when requested, a design or implementation handoff. Start from the user's activity and domain language, not a component catalog, implementation schema, or discovery questionnaire.

MCP and server details belong only in setup, diagnostics, audit, or integration work. Keep them out of ordinary designer-facing responses and product UI.

## Authorization And Privacy

- Use JudgmentKit only when the user explicitly asks for it or current project instructions opt in to JudgmentKit for the task.
- Check active user, project, and workspace instructions before calling tools.
- Do not use JudgmentKit for unrelated backend work, factual answers, docs-only edits, or general code review unless the task depends on UI activity fit.

The hosted endpoint processes the MCP request payload and records sanitized usage events such as event type and tool name. It does not intentionally store submitted briefs, design context, generated code, or review packets, but hosted requests still leave the local environment.

Use sanitized inputs for confidential work. For unreleased designs, proprietary design-system details, source code, customer data, or internal roadmaps, prefer a local checkout, local stdio server, or self-hosted JudgmentKit MCP endpoint instead of `https://judgmentkit.ai/mcp`.

## Inference-First Activity Case

Default to **propose, show, then refine**:

1. Read the brief and all already-available source context, including relevant artifacts, Figma context, code, research, and project instructions.
2. Represent non-brief evidence as attributed `context_items` with stable ids, an allowed kind, content, and a `source_ref` when available. A `source_ref` is required for every `authoritative_source`. Use that kind only for a source that actually governs the safety, legal, clinical, regulatory, compliance, sensitive-disclosure, or irreversible boundary at issue; never upgrade an ordinary brief, user answer, workspace observation, or provided artifact to authoritative evidence. Do not flatten context into unattributed prose.
3. Call `create_activity_model_review({ brief, context_items })` first. Treat its deterministic candidate, evidence, and questions as a baseline, not as the limit of model inference.
4. Have the host model infer a complete best-current activity case from the brief, attributed context items, and deterministic baseline. Cover the activity, participants, objective and outcomes, existing tools and artifacts, rules and rituals, division of labor, vocabulary, primary decisions, meaningful state changes, disclosure boundaries, and completion state. Attribute directly supported claims and label candidate-only inferences.
5. Call `review_activity_model_candidate({ brief, candidate, context_items })` with the same attributed context items before trusting the inferred case.
6. Use the reviewed candidate and assumptions to form a one-sentence working premise and the consequential design decisions. For UI work, obtain purpose-based surface guidance before naming the first surface or workflow direction.
7. If `activity_case.readiness.decision` is `stop`, do not show a potentially misleading design direction. State the authoritative or safety boundary and the one source needed to continue. Otherwise, show the premise, decisions, and direction before asking a question, and continue without confirmation when the review is ready and the requested work is authorized.
8. When source context is still needed, inspect available context first. Ask at most one consequential question at a time, and only when the answer would materially change the interaction, uncertainty is genuine, and reversal would be costly or unsafe. State the design consequence, recommend a default, and allow the user to say **Use your best judgment**.
9. Incorporate the answer as an attributed `context_items` entry, update the complete case, and run the baseline, inference, and review sequence again. Do not merely fill one missing field.

Do not begin with an intake checklist or ask the user to populate activity-model fields. The dimensions above are an internal inference and completeness model, not a questionnaire. Keep reversible uncertainty as an explicit assumption and continue. A provisional direction may illustrate an unresolved choice, but do not claim an implementation-ready or accepted artifact until its gates pass.

An activity-case integrity receipt proves content continuity, not action authority, and never replaces raw source context. Pass the exact current `brief` and the same attributed `context_items` through workflow review, handoff, frontend-context creation, and frontend implementation skill-context creation so each validating boundary can independently recheck protected risk and workflow authority. Never promote recommendation, review, or routing language into approve, authorize, commit, execute, publish, release, prescribe, or other protected controls. Participant action authority must be stated directly and affirmatively in the current brief or in an exact, relevant, affirmative `user_answer` or `authoritative_source` resupplied at the validating boundary. Workspace evidence and provided artifacts are not action credentials. Safety, legal, clinical, regulatory, compliance, sensitive-disclosure, and irreversible authority requires the relevant governing `authoritative_source` and its `source_ref`.

## Pacing Modes

- **Proceed** is the default. Complete the requested path using safe, reversible assumptions and pause only for a genuine blocker.
- **Quick** front-loads the working premise and first design direction and compresses explanation. It does not skip review or acceptance gates.
- **Guided** still infers and reviews the complete best-current case first, then pauses at a small number of high-impact forks, one at a time.

These modes change pacing, not inference depth, model capability, evidence requirements, or acceptance gates. If the client has no mode controls, accept `Proceed`, `Quick`, or `Guided` in ordinary language.

## Present Results

`structuredContent` is the authority for follow-up tool calls and implementation decisions. In ordinary designer-facing conversation, translate it into:

- **Working premise** — one sentence describing the activity and desired progress
- **Decisions inferred** — only the decisions that shape the proposed design
- **First direction** — the surface or workflow consequence
- **One thing to resolve** — only when a consequential question is truly needed

Do not dump targeted questions or expose `activity_model`, `review_status`, `ready_for_review`, schemas, resource ids, tool names, traces, or model configuration. Use raw `content[0].text` only for explicit setup, audit, debugging, or integration work.

## Conditional Routes

- For UI planning, generation, Figma or code handoff, workflow review, or implementation acceptance, read [references/ui-handoff-and-acceptance.md](references/ui-handoff-and-acceptance.md).
- For a slide deck, presentation, PowerPoint, or PPTX request, read [references/deck-creation.md](references/deck-creation.md).
- Read both references only when the request genuinely includes both routes.

## Fallback

If the JudgmentKit MCP endpoint is unavailable, state that JudgmentKit results could not be created. Offer a concise, deterministic activity-first summary only if the user wants to continue, and do not label that fallback as a JudgmentKit packet or review.
