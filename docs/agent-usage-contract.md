# Agent Usage Contract

Use JudgmentKit before UI generation, UI critique, implementation planning, or handoff review when the work depends on understanding an activity.

## Default Order

1. Read the user's brief and any local source context that is already available.
2. Call `create_activity_model_review`.
3. Use the review packet to decide whether to proceed, ask targeted questions, or review a model-proposed activity candidate.
4. Call `recommend_surface_types` to classify the activity purpose before workflow or frontend implementation guidance.
5. If a model or agent proposes a UI workflow, call `review_ui_workflow_candidate` before treating it as acceptable.
6. Call `review_cognitive_dimensions_candidate` when a workflow or implementation candidate needs Cognitive Dimensions review for mapping, visibility, hidden dependencies, premature commitment, progressive evaluation, change cost, mental operations, or disclosure.
7. Call `create_ui_implementation_contract`. Use the default JudgmentKit design-system source, or pass a complete `design_system_adapter` when an external design system should own tokens, typography, icons, and renderer components.
8. Call `create_ui_generation_handoff` on the reviewed workflow with the implementation contract before generating UI. Pass the Cognitive Dimensions review when it should block handoff until ready.
9. Call `create_frontend_generation_context` when frontend implementation guidance needs a selected surface type, project frontend context, and verification expectations.
10. Call `create_frontend_implementation_skill_context` when the implementing agent needs a compiled frontend skill packet that is portable across MCP clients.
11. Generate or critique UI from the frontend context and skill context only after the activity, decision, outcome, disclosure boundary, workflow candidate, surface type, and implementation contract are clear enough.
12. Call `review_ui_implementation_candidate` on generated code or evidence before accepting the result.

## Rules For Agents

- Do not ask broad discovery questions before using JudgmentKit when a brief is available.
- Treat `ready_for_review` as permission to proceed with UI concept work, not final product approval.
- Treat `needs_source_context` as a prompt to gather source context or ask the packet's targeted questions.
- Treat surface type as activity-purpose guidance, not visual styling.
- Treat the implementation contract as the authority for allowed primitives, control semantics, states, static checks, browser QA, visual asset handling, and accessibility evidence.
- Treat `implementation_contract.design_system_source` as the active authority for visual tokens, typography, icon assets, and renderer components. `judgmentkit_default` uses JudgmentKit `/design-system/` exports; `external_design_system` requires a complete adapter and has no implicit JudgmentKit fallback. `external_authority` is trace metadata unless paired with `design_system_adapter`.
- Treat `visual_token_adapter` as the token/font/icon evidence envelope for the active design-system source. Asset guidance cannot replace activity fit, primitive coverage, state coverage, accessibility evidence, static checks, or browser QA.
- Keep implementation terms out of product UI unless the activity is setup, debugging, auditing, integration, or explicit source inspection.
- When a model proposes an activity model, call `review_activity_model_candidate` before trusting it.
- When a model proposes a UI workflow, call `review_ui_workflow_candidate` before implementing it.
- Use Cognitive Dimensions findings as review diagnostics and repair guidance; do not copy Cognitive Dimensions terminology into product UI unless the product surface is design review, setup, debugging, auditing, or integration.
- Do not generate UI directly from a raw workflow review packet when `create_ui_generation_handoff` is available.
- Do not expose raw skill files through MCP; use the compiled frontend skill context after the frontend context is ready.
- Do not emit raw form controls or invent new UI variants when an approved primitive/helper is available.
- When the spec calls for substantive visuals, use `imagegen` or premium Three.js/WebGL/D3-style rendering; keep deterministic CSS/SVG/JS for layout, exact text, icons, state, simple diagrams, and fallback structure.
- For visual-heavy pages with text over images, canvas, WebGL, video, gradients, or generated visuals, provide browser-rendered contrast/readability evidence against WCAG AA targets, not screenshots alone.
- Treat the accessibility policy as WCAG 2.2 AA adapter-layer guidance: provide core evidence for semantics, landmarks/headings, name-role-value, keyboard navigation, focus order, focus-visible, responsive reflow/no-overflow, and automated checks.
- Add conditional accessibility evidence when the UI uses meaningful non-text visuals, custom widgets, forms, status messages, overlays, motion, media, dense controls, or hover/focus-triggered content.
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
- workflow topology, work units, surface set, primary actions, decision support, and handoff are named
- implementation contract names approved primitives and required states
- token, font, icon, and renderer component guidance comes from `implementation_contract.design_system_source`, with no implied font CDN, remote icon package, or fallback from external systems to JudgmentKit defaults
- substantive visual requirements have an image-generation, premium 3D/rendering, or high-quality visualization path when present
- static checks, browser QA, core accessibility evidence, and any conditional visual-background contrast, non-text contrast, forced-colors, target-size, focus-not-obscured, no-keyboard-trap, reduced-motion, pause/stop/hide, form/error/status, media alternative, or semantic fallback evidence are specified when required
- review-packet terms are not copied into the product UI
- targeted questions resolved or explicitly accepted as open

## Status Interpretation

`ready_for_review` means the packet is usable for the next design or implementation pass.

`ready_for_generation` means a reviewed workflow has passed the handoff gate and can be used as the immediate input to UI generation.

`needs_source_context` means the agent should pause product UI generation and resolve the smallest set of missing facts.

The packet is not a product approval. It is a guardrail for the next agent step.
