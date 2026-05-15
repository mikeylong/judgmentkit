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
4. `create_ui_implementation_contract`
5. `create_ui_generation_handoff`
6. `create_frontend_generation_context`
7. `create_frontend_implementation_skill_context` when the agent cannot read this local skill directly
8. `review_ui_implementation_candidate` after implementation evidence exists

## Workflow

1. Read the ready UI generation handoff and confirm `handoff_status` is `ready_for_generation`.
2. Read the selected `surface_type` and `surface_guidance`.
3. Read local frontend context: runtime, UI library, existing primitives, project rules, entrypoints, and verification commands.
4. Read the UI implementation contract for approved primitives, required states, static checks, and browser QA.
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
8. Verify required states, responsive behavior, static enforcement, browser QA, and disclosure boundaries.

## Guardrails

- Preserve the activity and domain vocabulary from the handoff.
- Keep implementation terms out of primary UI unless `setup_debug_tool` or the disclosure policy explicitly allows them.
- Treat surface type as activity-purpose guidance, not as a visual theme.
- Prefer existing project primitives and patterns before introducing new ones.
- Do not emit raw controls when approved primitives exist.
- Do not invent new variants unless the implementation contract is updated first.
- Do not make design-system compliance a substitute for activity fit.
- Do not expose raw skill text through MCP; use the compiled frontend implementation skill context.
- Keep JudgmentKit packet terms such as `review_status`, `activity_model`, and `ready_for_review` out of product UI.

## Output

Report:

- source handoff and selected surface type
- implementation contract used
- frontend context used
- compiled frontend implementation skill context used when applicable
- surfaces, states, primitives, and controls implemented or reviewed
- disclosure boundary checked
- static checks, verification commands, and browser checks run
- remaining gaps or assumptions
