# UI Handoff And Acceptance

Read this reference only when the task includes UI planning, generation, Figma or code handoff, workflow review, or implementation acceptance.

## Route From Activity To UI

1. Start from the reviewed activity case. Do not ask the user to restate dimensions that the brief, artifacts, or local context already answer.
2. Call `recommend_surface_types({ brief, activity_review })` before workflow or frontend implementation guidance. Surface type describes the activity purpose, not a visual theme.
3. When useful, call `recommend_ui_workflow_profiles`, then review a proposed workflow with `review_ui_workflow_candidate({ brief, candidate, activity_review, context_items })`, passing the exact reviewed activity packet from `review_activity_model_candidate` as `activity_review` and the same raw attributed context whenever it is relied on. Do not omit, summarize, or reconstruct that packet or context downstream.
4. Call `review_cognitive_dimensions_candidate` when mapping, visibility, hidden dependencies, premature commitment, progressive evaluation, change cost, mental operations, or disclosure risks could materially affect the workflow.
5. Call `create_ui_implementation_contract`. Use the default JudgmentKit design-system source unless a complete external design-system adapter is available and intended.
6. Call `create_ui_generation_handoff({ brief, workflow_review, implementation_contract, context_items })` before generating UI, resupplying the exact current brief and same raw attributed context. The activity receipt proves continuity but never replaces raw evidence at a protected boundary.
7. Call `create_frontend_generation_context({ brief, ui_generation_handoff, context_items, ... })` when implementation needs project runtime, UI library, approved component families, visual requirements, verification commands, or browser checks. Resupply the same raw brief and attributed context so the handoff is independently revalidated. When the implementing agent needs portable frontend guidance, call `create_frontend_implementation_skill_context({ brief, context_items, frontend_generation_context })` and resupply that exact source again; a portable receipt is a continuity check, not a substitute for boundary revalidation.
8. After implementation, call `review_ui_implementation_candidate` with generated code or evidence and the active implementation contract before accepting the result.

Use these surface types as activity-purpose guidance: `marketing`, `workbench`, `operator_review`, `artifact_inspector`, `form_flow`, `dashboard_monitor`, `content_report`, `setup_debug_tool`, and `conversation`. If two are plausible, decide from the participant's completion state before choosing components. Select `artifact_inspector` only when the rendered artifact is primary, semantic locus selection is required, and support is locus-relative.

## Design-System Acceptance Gate

Treat the active design system as an existential gate for generated UI:

- A generated UI that does not pass the active design system is not an artifact. It is a failed candidate.
- If no complete external design-system adapter is supplied and intended, the active authority is the internal JudgmentKit design system returned by `create_ui_implementation_contract`.
- Do not accept, render, publish, summarize as successful, or preserve a generated UI candidate until `review_ui_implementation_candidate` passes against the active implementation contract.
- Do not repair design-system failures in renderer or downstream glue code. Send the failed candidate back through JudgmentKit review and use the returned hard constraints and repair instructions.
- Do not treat "mostly uses tokens", wrapper normalization, fallback styling, visual cleanup, or post-hoc token rewriting as design-system compliance.
- Reject strict JudgmentKit candidates that carry visual authority outside the active design system, including inline `style` attributes, model-defined visual custom properties, local aliases, literal colors, literal shadows, undeclared token names, external fonts, or unsupported component semantics.
- Legacy, stale, or previously accepted captures must be re-reviewed against the active implementation contract before current use.
- If the active design-system review fails, the next action is repair or regeneration against the MCP-returned constraints, not acceptance with caveats.

## Disclosure And Evidence

Use domain language in product UI. Keep prompts, schemas, resource ids, MCP server names, tool names, traces, and model configuration out unless the activity is setup, debugging, auditing, integration, or explicit source inspection.

Require evidence appropriate to the surface:

- approved primitives and required states from the implementation contract
- relevant static checks and browser QA at desktop and mobile sizes
- accessibility evidence for semantics, keyboard navigation, focus order, focus-visible, responsive reflow, no overflow, and automated checks
- conditional evidence for meaningful non-text visuals, custom widgets, forms, status messages, overlays, motion, dense controls, hover or focus content, and text over generated or rendered visuals

When substantive visuals are required, use image generation, Three.js/WebGL, or D3-style visualization rather than rudimentary CSS, SVG, or JavaScript geometry as the final visual asset.

If an implementation review fails, repair or regenerate from the review constraints and run the affected checks again. Do not soften a failed candidate into an accepted artifact through caveats or presentation polish.
