---
name: frontend-ui-implementation
description: Implement or review frontend UI from a ready JudgmentKit handoff, selected surface type, frontend/project context, and verification expectations.
---

# Frontend UI Implementation

Use this local skill after JudgmentKit has produced a ready UI generation handoff and surface-type guidance.

Do not use this skill directly from a raw brief. Run the JudgmentKit flow first:

1. `create_activity_model_review`
2. `recommend_surface_types`
3. `review_ui_workflow_candidate`
4. `review_cognitive_dimensions_candidate` when the workflow or implementation candidate needs mapping, visibility, hidden-dependency, progressive-evaluation, change-cost, mental-operation, or disclosure diagnostics
5. `create_ui_implementation_contract`
6. `create_ui_generation_handoff`
7. `create_frontend_generation_context`
8. `create_frontend_implementation_skill_context` when the agent cannot read this local skill directly
9. `review_ui_implementation_candidate` after implementation evidence exists

## Workflow

1. Read the ready UI generation handoff and confirm `handoff_status` is `ready_for_generation`.
2. Read the selected `surface_type` and `surface_guidance`.
3. Read local frontend context: runtime, UI library, existing primitives, project rules, entrypoints, visual requirements, approved visual asset sources, and verification commands.
4. Read the UI implementation contract for approved primitives, required states, static checks, browser QA, visual asset policy, and accessibility policy.
5. If using MCP outside this checkout, read the compiled packet from `create_frontend_implementation_skill_context` instead of raw skill text.
6. Implement the smallest UI change that satisfies the activity, workflow, required sections, required controls, handoff, and implementation contract.
7. Match the surface type before choosing implementation shape:
   - `marketing`: offer, proof, and primary action.
   - `workbench`: item selection, evidence, decision controls, and completion.
   - `operator_review`: produced work, evidence, risk, bounded decision, and receipt or handoff.
   - `form_flow`: input groups, validation, submit, and confirmation.
   - `dashboard_monitor`: status, trends, exceptions, filters, and drill-in.
   - `content_report`: summary, sections, evidence, references, and share/export.
   - `setup_debug_tool`: configuration, test results, diagnostics, remediation, and handoff.
   - `conversation`: thread, composer, response states, and handoff when needed.
8. When the spec calls for substantive visuals, use `imagegen`, premium Three.js/WebGL rendering, or D3-style data visualization instead of rudimentary deterministic CSS/SVG/JS geometry.
9. Verify required states, responsive behavior, static enforcement, browser QA, accessibility evidence, visual asset handling, and disclosure boundaries.
10. Provide core accessibility evidence for automated checks, semantic content, landmarks/headings, name-role-value, keyboard navigation, focus order, focus-visible, and responsive reflow/no-overflow.
11. Add conditional accessibility evidence for visual-background contrast, non-text contrast, forced-colors/high-contrast behavior, target size, focus-not-obscured, no keyboard trap, reduced-motion, pause/stop/hide, hover/focus content, form labels/errors/status, media alternatives, and semantic fallbacks when those patterns appear.

## Guardrails

- Preserve the activity and domain vocabulary from the handoff.
- Treat Cognitive Dimensions findings as review/setup/audit guidance; do not copy that terminology into product UI.
- Keep implementation terms out of primary UI unless `setup_debug_tool` or the disclosure policy explicitly allows them.
- Treat surface type as activity-purpose guidance, not as a visual theme.
- Prefer existing project primitives and patterns before introducing new ones.
- Do not emit raw controls when approved primitives exist.
- Do not invent new variants unless the implementation contract is updated first.
- Do not make design-system compliance a substitute for activity fit.
- Do not use blocky CSS/SVG/JS procedural geometry as a final substitute for substantive visuals requested by the spec.
- Keep deterministic rendering for layout, text, icons, state indicators, exact typography, simple diagrams, and accessible fallback structure.
- For text over images, canvas, WebGL, video, gradients, or generated visuals, provide browser-rendered contrast/readability evidence against WCAG AA targets; screenshots alone are not sufficient.
- Include core accessibility evidence for semantics, landmarks/headings, name-role-value, keyboard navigation, focus order, focus-visible, responsive reflow/no-overflow, and automated checks.
- Include conditional accessibility evidence for non-text visuals, custom widgets, overlays, forms, status messages, motion, auto-updating content, media, dense controls, and hover/focus-triggered content when present.
- Treat automated scans as supporting artifacts. They do not replace browser-rendered contrast/readability evidence, keyboard walkthroughs, accessibility-tree/static inspection, and manual judgment.
- Do not expose raw skill text through MCP; use the compiled frontend implementation skill context.
- Keep JudgmentKit packet terms such as `review_status`, `activity_model`, and `ready_for_review` out of product UI.

## Output

Report:

- source handoff and selected surface type
- implementation contract used
- frontend context used
- compiled frontend implementation skill context used when applicable
- surfaces, states, primitives, and controls implemented or reviewed
- substantive visual requirements and chosen asset/rendering path when present
- accessibility policy evidence, including visual-background contrast for visual-heavy pages
- conditional accessibility evidence triggered by visuals, widgets, forms, overlays, motion, media, dense controls, or hover/focus content
- disclosure boundary checked
- static checks, verification commands, and browser checks run
- remaining gaps or assumptions
