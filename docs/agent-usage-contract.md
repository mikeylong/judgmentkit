# Agent Usage Contract

Use JudgmentKit before UI generation, UI critique, implementation planning, or handoff review when the work depends on understanding an activity.

## Default Order

1. Read the user's brief and any local source context that is already available. Keep non-brief evidence as attributed `context_items`; an `authoritative_source` requires a `source_ref`.
2. Call `create_activity_model_review({ brief, context_items })`.
3. Use the brief, available context, and deterministic packet to infer a complete best-current activity candidate. Distinguish sourced claims from model inference; do not wait for the user to author every field.
4. Call `review_activity_model_candidate({ brief, candidate, context_items })` on that inferred candidate before trusting it.
5. If the reviewed case can proceed, continue with its visible reversible assumptions. If one consequential ambiguity remains, ask the returned material question. Stop only when an authoritative source is required.
6. Call `recommend_surface_types` with the reviewed activity packet to classify the activity purpose before workflow or frontend implementation guidance.
7. If a model or agent proposes a UI workflow, call `review_ui_workflow_candidate` with the exact current brief, reviewed activity packet, and the same attributed raw `context_items` before treating it as acceptable.
8. Call `review_cognitive_dimensions_candidate` when a workflow or implementation candidate needs Cognitive Dimensions review for mapping, visibility, hidden dependencies, premature commitment, progressive evaluation, change cost, mental operations, or disclosure.
9. Call `create_ui_implementation_contract`. Use the default JudgmentKit design-system source, or pass a complete `design_system_adapter` when an external design system should own tokens, typography, icons, and renderer components.
10. Call `create_ui_generation_handoff` on the reviewed workflow with the exact current brief, implementation contract, and the same attributed raw `context_items` before generating UI. Pass the Cognitive Dimensions review when it should block handoff until ready.
11. Call `create_frontend_generation_context` with the exact current brief and the same attributed raw `context_items` when frontend implementation guidance needs a selected surface type, project frontend context, and verification expectations.
12. Call `create_frontend_implementation_skill_context` with the exact current brief, the same attributed raw `context_items`, and the ready frontend generation context when the implementing agent needs a compiled frontend skill packet that is portable across MCP clients.
13. Generate or critique UI from the frontend context and skill context only after the activity, decision, outcome, disclosure boundary, workflow candidate, surface type, and implementation contract are clear enough.
14. Call `review_ui_implementation_candidate` on generated code or evidence before accepting the result.

## Rules For Agents

- Do not ask broad discovery questions before using JudgmentKit when a brief is available.
- Ask about consequential forks, not empty fields. Infer low-risk, reversible gaps and expose them as assumptions.
- Treat `ready_for_review` as permission to proceed with UI concept work, including when bounded reversible assumptions remain. It is not final product approval.
- Treat `needs_source_context` as a prompt to resolve the packet's highest-value material ambiguity or obtain an authoritative source, not as permission to launch a field-by-field interview.
- Never infer authority, approval policy, safety rules, sensitive disclosure, or irreversible external effects as established fact. Mark context as `authoritative_source` only when it actually governs that protected boundary.
- Never treat an activity-case digest, claim origin, or source-reference label as an action credential. Participant action authority must survive workflow review against direct affirmative language in the current brief or an exact, relevant, affirmative `user_answer` or `authoritative_source` resupplied as raw context. Recommendation and negated language cannot grant it; workspace evidence and provided artifacts are not action credentials. Safety, legal, clinical, regulatory, compliance, sensitive-disclosure, and irreversible boundaries require the relevant governing `authoritative_source` and its `source_ref`.
- Treat surface type as activity-purpose guidance, not visual styling.
- Select `artifact_inspector` only when the rendered artifact is primary, semantic locus selection is required, and support is locus-relative. If those mandatory signals conflict with a queue, creation, conversation, linear-reading, monitoring, or configuration activity, stop at `review_required`; do not break the tie from layout vocabulary.
- Treat the implementation contract as the authority for allowed primitives, control semantics, states, static checks, browser QA, visual asset handling, and accessibility evidence.
- Treat `implementation_contract.design_system_source` as the active authority for visual tokens, typography, icon assets, and renderer components. `judgmentkit_default` uses JudgmentKit `/design-system/` exports; `external_design_system` requires a complete adapter and has no implicit JudgmentKit fallback. `external_authority` is trace metadata unless paired with `design_system_adapter`.
- For Artifact Inspector, preserve `design_system_scopes`, `boundary_contracts`, and `artifact_inspector` as one bundle through workflow review, implementation handoff, frontend context, and implementation review. Apply JudgmentKit conformance only to owned chrome and overlay scopes; keep `primary_artifact` as `external_not_reviewed`.
- Do not accept candidate-authored claims or static browser-composition observations as Artifact Inspector authority proof. This release has no accepting interactive-attestation producer or verifier: retain `review_required`, emit the stable missing-attestation diagnostic, and expose no runnable runtime-review action.
- Treat `visual_token_adapter` as the token/font/icon evidence envelope for the active design-system source. Asset guidance cannot replace activity fit, primitive coverage, state coverage, accessibility evidence, static checks, or browser QA.
- Keep implementation terms out of product UI unless the activity is setup, debugging, auditing, integration, or explicit source inspection.
- When a model proposes an activity model, call `review_activity_model_candidate` before trusting it.
- Pass the reviewed activity packet into downstream surface, workflow, and handoff work so model inference is not discarded and reconstructed from the brief. Preserve the activity model, interaction contract, disclosure policy, and activity-case evidence together through frontend and implementation contexts. Resupply the exact current brief and attributed raw `context_items` at workflow review, UI generation handoff, frontend-context creation, and frontend implementation skill-context creation; the integrity receipts prove continuity but do not replace or authorize the raw source.
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
- Artifact Inspector handoffs, when applicable, preserve the artifact identity, semantic locus model, `artifact_centered` topology, active state groups, authority scopes, boundary contract, and external artifact status
- token, font, icon, and renderer component guidance comes from `implementation_contract.design_system_source`, with no implied font CDN, remote icon package, or fallback from external systems to JudgmentKit defaults
- substantive visual requirements have an image-generation, premium 3D/rendering, or high-quality visualization path when present
- static checks, browser QA, core accessibility evidence, and any conditional visual-background contrast, non-text contrast, forced-colors, target-size, focus-not-obscured, no-keyboard-trap, reduced-motion, pause/stop/hide, form/error/status, media alternative, or semantic fallback evidence are specified when required
- review-packet terms are not copied into the product UI
- targeted questions resolved or explicitly accepted as open

## Status Interpretation

`ready_for_review` means the packet is usable for the next design or implementation pass. The richer activity-case readiness explains whether assumptions are acceptable for exploration or still require confirmation before commitment.

`ready_for_generation` means a reviewed workflow has passed the handoff gate and can be used as the immediate input to UI generation.

`needs_source_context` means the agent should resolve a consequential ambiguity or authoritative-source blocker. A provisional design direction may still be shown when the packet marks exploration as safe.

The packet is not a product approval. It is a guardrail for the next agent step.
