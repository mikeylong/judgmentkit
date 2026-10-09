# Activity interpretation and routing reliability

## Activity and outcome

An implementing agent translates a short product brief and attributed context into
an activity case, an appropriate interaction, and a generation handoff. The person
should receive the requested interface without an unnecessary interview or
unrelated workflow controls.

The Tide experiment supplies the regression case: choose a location and day,
read supplied measurements and upcoming extremes, and inspect a 24-hour chart.
Completion is understanding the selected conditions. There is no product handoff,
submission, or safety verdict.

## Responsibilities and rules

- The user supplies intent and governing sources; the agent may infer reversible
  interaction choices. A caller's selection must not be attributed to a human.
- Context remains attributed and byte-preserved. Negation and sentence scope must
  prevent unrelated design authorization from becoming a safety-policy claim.
- Contrast clauses start a new assertion; comma-separated exclusions keep their
  negation. Temporal "not yet" retains its negation. Excluding safety advice or
  rules from a prototype does not authorize safety decisions, and prohibitions
  against ignoring safety requirements remain gated.
- Actual clinical, safety, disclosure, and irreversible boundaries remain gated.
- A clarification names a material ambiguity and its question.
- Surface patterns follow work and completion; available controls and layout
  vocabulary do not establish the activity.

## Interaction contract

- Selected measurement reading with a chart can be a Dashboard monitor without
  an operational decision, queue, or handoff action.
- No positive surface evidence returns `review_required`, a null recommendation,
  a diagnostic question, and no interaction or presentation guidance.
- Unresolved routing blocks workflow handoff and frontend generation.
- Conflicting explicit and recommended surface choices fail with
  `conflicting_surface_selection`; the caller must reconcile the inputs.
- A surface explicitly supplied by a caller uses confidence `provided` and
  `selection_origin: "caller"` by default. The caller may declare
  `surface_selection_origin: "user"` or `"agent"` with an explicit surface type;
  a recommendation uses `selection_origin: "inferred"`. These describe declared
  provenance, not evidence of permission or action authority.
- Confidence follows each pattern's core activity evidence, not a global count
  that prevents patterns with two rules from reaching high confidence. A
  competing complete activity without exclusion evidence reduces confidence;
  differing numbers of optional rules do not make that activity less credible.
  `confidence_evidence` names missing core evidence, competitors, and the margin.
- Reviewed actions, work objects, and completion participate in selection.
  Existing tools or artifacts do not independently establish a primary activity.
- Every inherited unresolved selection blocks frontend generation. A supplied
  recommendation cannot conceal an unresolved selection inherited from handoff.
- Valid object-form work units retain their domain labels through normalization,
  handoff, frontend context, and portable skill preparation.
- `deriveOwnedChartReviewObligation` identifies affirmative chart-reading
  promises in ready reviewed actions, work units, and completion. Background
  artifacts and excluded charts do not establish the promise. Artifact Inspector
  content remains external; its chart content cannot create an owned UI obligation.

## Verification

`tests/fixtures/tide-workflow.json` preserves the experiment's paragraph and
sentence inputs plus proposed activity and workflow. Tests replay both through
fresh current-kernel reviews, verify a read-only monitor workflow, and protect
real safety stops, unresolved routing, conflict handling, selection provenance,
and work-unit continuity through frontend skill preparation. Nearby cases cover
sensor monitoring, report citation, and measurement editing.

`tests/context-routing-reliability.test.mjs` adds generic clause and contrast
scope, real safety restrictions, pattern-specific confidence, competing activity,
reviewed work-object use, declared selection origins, and inherited conflict
checks, plus scoped chart-promise derivation. All checks exercise kernel behavior
without regenerating experiment apps.

This scope does not add a chart-observation runtime or evidence preflight API.
Replaying saved inputs is a deterministic workflow regression, not a fresh model
generation, a hosted-service acceptance, or a participant study.
