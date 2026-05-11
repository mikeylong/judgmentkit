# Agent Usage Contract

Use JudgmentKit before UI generation, UI critique, implementation planning, or handoff review when the work depends on understanding an activity.

## Default Order

1. Read the user's brief and any local source context that is already available.
2. Call `create_activity_model_review`.
3. Use the review packet to decide whether to proceed, ask targeted questions, or review a model-proposed activity candidate.
4. If a model or agent proposes a UI workflow, call `review_ui_workflow_candidate` before treating it as acceptable.
5. Call `create_ui_generation_handoff` on the reviewed workflow before generating UI.
6. Generate or critique UI from the handoff only after the activity, decision, outcome, disclosure boundary, and workflow candidate are clear enough.

## Rules For Agents

- Do not ask broad discovery questions before using JudgmentKit when a brief is available.
- Treat `ready_for_review` as permission to proceed with UI concept work, not final product approval.
- Treat `needs_source_context` as a prompt to gather source context or ask the packet's targeted questions.
- Keep implementation terms out of primary UI unless the activity is setup, debugging, auditing, integration, or explicit source inspection.
- When a model proposes an activity model, call `review_activity_model_candidate` before trusting it.
- When a model proposes a UI workflow, call `review_ui_workflow_candidate` before implementing it.
- Do not generate UI directly from a raw workflow review packet when `create_ui_generation_handoff` is available.
- Keep JudgmentKit review-packet terms such as `ready_for_review`, `activity_model`, `review_status`, `Primary user`, and `Main decision` out of product UI.
- Do not use visual polish, components, tokens, or design-system compliance as a substitute for activity fit.

## Handoff Checklist

Before handing off UI work, confirm:

- activity named
- participants named
- primary decision named
- outcome or completion state named
- domain vocabulary available
- implementation terms contained in disclosure, evidence, or guardrails
- workflow steps, primary actions, decision support, and handoff are named
- review-packet terms are not copied into the primary UI
- targeted questions resolved or explicitly accepted as open

## Status Interpretation

`ready_for_review` means the packet is usable for the next design or implementation pass.

`ready_for_generation` means a reviewed workflow has passed the handoff gate and can be used as the immediate input to UI generation.

`needs_source_context` means the agent should pause primary UI generation and resolve the smallest set of missing facts.

The packet is not a product approval. It is a guardrail for the next agent step.
