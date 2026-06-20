# Cognitive Dimensions Review

## Activity

Reviewing an AI-proposed workflow or UI implementation candidate with the Cognitive Dimensions of Notations vocabulary before trusting it for UI generation or handoff.

## Objective

Make Cognitive Dimensions employable by agents and executable by JudgmentKit without turning the framework into a numeric UX score. The review should identify concrete friction, cite candidate evidence, name the user cost, and produce repair instructions.

## Capability

Library API:

- `reviewCognitiveDimensionsCandidate(brief, candidate, options)`

MCP tool:

- `review_cognitive_dimensions_candidate`

The tool may review a raw UI workflow candidate, a workflow review packet, implementation evidence, or visible surface evidence. It should run after activity/workflow review when a candidate exists, and again near implementation review when rendered or structured evidence exists.

## Status

- `ready_for_review`: no blocking Cognitive Dimensions failures were found.
- `repair_required`: at least one dimension found a blocking issue.
- `needs_source_context`: source activity evidence is not ready enough to apply the dimensions responsibly.

## Finding Shape

Every finding must include:

- `dimension`
- `severity`
- `evidence`
- `user_cost`
- `repair_instruction`
- `acceptance_check`

The review must not emit a single score. Cognitive Dimensions are tradeoff vocabulary; failures should stay evidence-bearing and repairable.

## Dimensions And Executable Checks

- Closeness of mapping: primary terms and workflow structure match the user's domain work, not source mechanics.
- Visibility and juxtaposability: evidence, object, decision, and action are visible or persistently linked together.
- Hidden dependencies: policy, risk, freshness, consent, impact, or model-derived concerns that can change the decision are visible in domain language.
- Premature commitment: risky or final actions have evidence, reason, review, confirmation, return path, undo, or receipt.
- Progressive evaluation: partial work, validation, setup, monitoring, formulas, or imports can be previewed, checked, or followed up before final action.
- Viscosity: likely corrections or repeated comparisons do not require disconnected repeated edits.
- Hard mental operations: users do not have to remember, transpose, or reconstruct selected-item context across surfaces.
- Role-expressiveness: sections, controls, and states reveal what they help the user decide, inspect, correct, or hand off.
- Disclosure discipline: prompts, schemas, tools, APIs, servers, traces, and model configuration stay diagnostic unless setup, debugging, audit, or integration is the activity.

## Handoff Gate

`create_ui_generation_handoff` may receive an optional `cognitive_dimensions_review`. If supplied, it must be `ready_for_review`; otherwise the handoff blocks. If omitted, existing handoff behavior remains unchanged.

## Evaluation Fixtures

The targeted pilot cases cover:

- refund approval detached from policy evidence
- field dispatch context lost between map, list, and detail
- clinical routing with hidden stale-vitals or consent dependency
- dashboard metrics with no exception meaning or follow-up path
- setup/debug surface where diagnostic machinery is allowed
- spreadsheet formula editing without preview or validation before apply

These fixtures are report-only evidence for Cognitive Dimensions coverage; they do not replace the existing MCP pilot pass/fail policy.
