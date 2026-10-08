# System Map

## Purpose and activity

Help a builder understand how an AI agent uses JudgmentKit to build and review an interface. The builder supplies the task and product facts. The agent proposes candidates, calls tools, implements the interface, collects evidence, and makes repairs. JudgmentKit returns review packets and instructions. A person tries the resulting task to establish usefulness.

The diagram is an integration reference, so tool names and review states are appropriate. It must distinguish source facts, model proposals, deterministic review, generated interfaces, measured evidence, and human task results.

## Diagram contract

1. Show the recommended UI-building route and its artifact dependencies. Arrows do not imply an automatic orchestrator or require a separate analyzer call before activity review.
2. Show caller-owned orchestration outside the deterministic core. The library and MCP expose the broader review route. The CLI exposes activity analysis and activity review only. MCP also wires admission to the supported browser runtime.
3. Show optional activity or workflow proposals as caller/model-assisted-helper inputs to candidate review. A deterministic workflow review must never appear to request a model itself.
4. Show activity review, surface recommendation, workflow review, implementation contract, handoff, frontend generation context, portable implementation instructions, generation, evidence, and implementation review. Workflow profiles and Cognitive Dimensions are optional guidance; a supplied Cognitive Dimensions review must be ready before handoff.
5. Establish default or complete external design-system authority in the implementation contract before handoff. An incomplete external adapter must fail without fallback. Renderer choice stays with the implementing client. The root library remains framework-neutral; the React adapter is an optional candidate.
6. Show unresolved surface selection and failed readiness as non-generating paths. No positive surface evidence returns `review_required` with no selected surface.
7. Show implementation review outcomes as `accept`, `repair_and_resubmit`, `stop_for_human`, and `review_required`. The agent owns repair and resubmission. A changed premise requires current raw source and refreshed dependent packets; an implementation-only repair does not require a new premise.
8. Label independent browser checks as bounded visual-composition verification for qualifying self-contained HTML. Do not imply general application interaction, task success, or Artifact Inspector authority verification.
9. State the Inspector limit: no trusted interactive-attestation producer or verifier exists; an otherwise valid implementation remains `review_required`, and the primary artifact remains `external_not_reviewed`.
10. Keep human task completion separate from contract acceptance. Show slide-deck planning and local export as a separate capability outside the UI-building route.

## Drift and interaction checks

Use one shared node/edge model for the React Flow diagram and its static accessible fallback. Each depicted tool must match current exports and MCP inventory. Test the material source, authority, readiness, and acceptance claims against actual review behavior.

Preserve zoom, pan, fit, narrow viewport containment, appearance tokens, and native keyboard disclosure behavior. The expanded text summary must remain readable without manipulating the diagram. Browser checks must confirm mounted nodes and arrows, no clipped node content at readable zoom, and no runtime errors.
