# Agent Usage Contract

Use JudgmentKit before UI generation, UI critique, implementation planning, or handoff review when the work depends on understanding an activity.

## Default Order

1. Read the user's brief and any local source context that is already available.
2. Call `create_activity_model_review`.
3. Use the review packet to decide whether to proceed, ask targeted questions, or review a model-proposed activity candidate.
4. Call `recommend_surface_types` to classify the activity purpose before workflow or frontend implementation guidance.
5. If a model or agent proposes a UI workflow, call `review_ui_workflow_candidate` before treating it as acceptable.
6. Call `create_ui_implementation_contract` using repo evidence, external UI authority evidence, or JudgmentKit's portable defaults.
7. Call `create_ui_generation_handoff` on the reviewed workflow with the implementation contract before generating UI.
8. Call `review_ui_implementation_candidate` on generated code or evidence before accepting the result.
9. Call `create_frontend_generation_context` when frontend implementation guidance needs a selected surface type, project frontend context, and verification expectations.
10. Generate or critique UI from the frontend context only after the activity, decision, outcome, disclosure boundary, workflow candidate, surface type, and implementation contract are clear enough.

## Rules For Agents

- Do not ask broad discovery questions before using JudgmentKit when a brief is available.
- Treat `ready_for_review` as permission to proceed with UI concept work, not final product approval.
- Treat `needs_source_context` as a prompt to gather source context or ask the packet's targeted questions.
- Treat surface type as activity-purpose guidance, not visual styling.
- Treat the implementation contract as the authority for allowed primitives, control semantics, states, static checks, and browser QA.
- Keep implementation terms out of primary UI unless the activity is setup, debugging, auditing, integration, or explicit source inspection.
- When a model proposes an activity model, call `review_activity_model_candidate` before trusting it.
- When a model proposes a UI workflow, call `review_ui_workflow_candidate` before implementing it.
- Do not generate UI directly from a raw workflow review packet when `create_ui_generation_handoff` is available.
- Do not emit raw form controls or invent new UI variants when an approved primitive/helper is available.
- Keep JudgmentKit review-packet terms such as `ready_for_review`, `activity_model`, `review_status`, `Primary user`, and `Main decision` out of product UI.
- Do not use visual polish, components, tokens, or design-system compliance as a substitute for activity fit.

## Handoff Checklist

Before handing off UI work, confirm:

- activity named
- surface type selected when frontend implementation guidance is needed
- participants named
- primary decision named
- outcome or completion state named
- domain vocabulary available
- implementation terms contained in disclosure, evidence, or guardrails
- workflow steps, primary actions, decision support, and handoff are named
- implementation contract names approved primitives and required states
- static checks and browser QA are specified
- review-packet terms are not copied into the primary UI
- targeted questions resolved or explicitly accepted as open

## Status Interpretation

`ready_for_review` means the packet is usable for the next design or implementation pass.

`ready_for_generation` means a reviewed workflow has passed the handoff gate and can be used as the immediate input to UI generation.

`needs_source_context` means the agent should pause primary UI generation and resolve the smallest set of missing facts.

The packet is not a product approval. It is a guardrail for the next agent step.
