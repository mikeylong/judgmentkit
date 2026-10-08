# Activity and routing reliability review

The saved Tide inputs now pass fresh current-kernel activity review, Dashboard
monitor selection, workflow review, handoff, frontend context, and portable skill
preparation. Paragraph and sentence attribution produce the same readiness.
All four object-form work units retain their domain labels.

## Changes

- Excluded safety claims and unrelated design authorization no longer create a
  safety-policy stop. Real clinical and equipment-safety cases remain stopped.
- Deterministic clarification always includes a material ambiguity and question.
- Selected measurement reading routes to a monitor. Report citation and record
  editing retain their own patterns.
- Zero positive surface scores return `review_required` with no selected surface
  or interaction guidance. Workflow handoff and frontend generation are blocked.
- Conflicting explicit and recommended choices return
  `conflicting_surface_selection`. Caller choices use `provided` confidence and
  caller provenance, without claiming a human selection or action authority.
- Valid object-form work units no longer disappear before frontend preparation.

## Evidence

- Active spec: `specs/activity-routing-reliability.md`.
- Contracts checked: `specs/interface-contract.md`, `DESIGN.md`,
  `contracts/ai-ui-generation.activity-contract.json`, and kernel-schema tests.
- Self-contained saved inputs: `tests/fixtures/tide-workflow.json`.
- Regression tests: `tests/tide-workflow-regressions.test.mjs`, with existing
  surface and Workbench profile tests updated for unresolved routing.
- Replay: `replay.json`, produced by
  `node tests/tide-workflow-regressions.test.mjs --report`.
- Full suite: `npm test`, including browser, MCP, component, site, and eval checks.
  The activity, surface, and handoff tests were also rerun after the final changes.

## Compatibility and remaining work

Clients must handle a null surface recommendation with `review_required` instead
of assuming a Workbench. They must reconcile conflicting selections explicitly.

This is a replay of saved inputs through the local library. It does not include a
fresh model generation, implementation acceptance, hosted-service review, or user
study. Chart-observation verification and evidence-packet preflight remain separate
followups. No GitHub or deployment actions were performed.
