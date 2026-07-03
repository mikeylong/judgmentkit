# JudgmentKit MCP LLM Preference Evidence

Blinded LLM preference judging of saved baseline and JudgmentKit-guided model outputs. This is product evidence, not deterministic scoring.

Source report: `evals/reports/mcp-pilot/2026-07-03/mcp-0.6.5/run-001/mcp-pilot-report.json`
Model under test: `gpt-5.5-codex`
Judge: `gpt-5.5-codex` (gpt-5.5)

## Summary

Valid judgments: 30/30
Guided preferred: 14
Baseline preferred: 16
Ties: 0
Guided preference rate: 0.467
Average guided quality delta: -0.31

## Cases

| Case | LLM winner | Confidence | Guided/Baseline quality | Deterministic delta |
| --- | --- | --- | --- | --- |
| refund-schema-admin-translation | Guided | medium | 9 / 8 | 25.01 |
| agent-trace-review-console | Guided | medium | 9.1 / 8.4 | 33.32 |
| crm-json-import-translation | Guided | high | 8.8 / 8 | 7.83 |
| billing-webhook-debug-boundary | Baseline | medium | 8.2 / 8.6 | 50 |
| vague-system-dashboard | Guided | high | 9.4 / 8.1 | 5.36 |
| review-queue-without-decision | Guided | medium | 9.1 / 8.4 | 0 |
| api-list-workflow | Guided | medium | 8.4 / 7.8 | 42 |
| unclear-compliance-report | Guided | high | 8.7 / 7.4 | 10 |
| clinical-intake-operator-review | Baseline | medium | 8.3 / 8.8 | 0 |
| b2b-renewal-risk-review | Guided | medium | 8.5 / 8 | 3.32 |
| field-dispatch-review | Baseline | high | 4.5 / 8 | -11.25 |
| moderation-escalation-review | Baseline | medium | 7.8 / 8.2 | 13.32 |
| invented-activity-candidate | Guided | high | 9.1 / 8.4 | 18.36 |
| schema-leaking-workflow | Guided | medium | 9.1 / 8.6 | -2.52 |
| surface-type-mismatch | Baseline | medium | 8.4 / 8.8 | 29.32 |
| missing-handoff-workflow | Guided | medium | 8.5 / 8 | 8.56 |
| raw-form-controls-implementation | Baseline | high | 4 / 8 | 22 |
| missing-accessibility-evidence | Baseline | high | 6.5 / 9 | 22 |
| modal-action-order-review | Baseline | medium | 7.2 / 8 | 22.52 |
| implementation-term-leakage-review | Baseline | medium | 7 / 8 | 21.27 |
| visual-token-valid-metadata-review | Guided | medium | 8.6 / 8 | 14.99 |
| visual-token-unsupported-family-review | Baseline | medium | 7.2 / 8 | 16.11 |
| visual-token-accessibility-bypass-review | Baseline | high | 8 / 8.8 | 9.98 |
| visual-token-renderer-boundary-review | Baseline | medium | 7.1 / 8.2 | 15.01 |
| cognitive-refund-action-detached | Baseline | medium | 8.4 / 9 | 3.32 |
| cognitive-field-dispatch-transition-loss | Guided | high | 9.2 / 8 | 23.77 |
| cognitive-clinical-hidden-dependency | Guided | high | 9 / 8 | 6.09 |
| cognitive-dashboard-no-follow-up | Baseline | high | 8 / 9 | 17.51 |
| cognitive-setup-debug-diagnostic-exception | Baseline | high | 7.5 / 9 | -4.98 |
| cognitive-spreadsheet-progressive-evaluation-gap | Baseline | high | 7.5 / 9 | 21.23 |

## Representative Rationale

### refund-schema-admin-translation
Winner: judgmentkit_mcp; confidence: medium

Both outputs correctly reframe the request around refund adjudication rather than schema-shaped administration. Output A is stronger because it more directly translates the brief into the expected refund triage handoff surface and includes a complete owner/action/reason/verification handoff. Output B is grounded and appropriately cautious, but its handoff centers artifact verification and lacks an explicit reason field there, making it slightly less useful as the next agent's response plan.

- output_a: "Frame the work as a refund adjudication workbench for a support lead, not as an admin view over internal data." (Correctly reframes the request around the real activity and avoids exposing implementation machinery as the UI contract.)
- output_a: "Owner: Support operations; Action: build the refund decision workbench around approve, policy review, and missing-evidence return; Reason: the support lead needs evidence-backed routing" (Provides the handoff/action/reason structure the benchmark explicitly rewards.)

### agent-trace-review-console
Winner: judgmentkit_mcp; confidence: medium

Both outputs correctly shift the request from a raw trace viewer to an escalation-readiness review workflow. Output B is better for a downstream agent because it makes the next move more operational: it names the handoff owner, action, reason, and verification condition, includes the decision artifact that should result from review, and explicitly translates implementation mechanics into operator-facing evidence labels. Output A is strong and more concrete about trace artifacts, but its handoff is less complete and it stays slightly closer to telemetry categories than the resulting review record.

- output_b: "Owner: escalation review/product owner | Action: confirm evidence minimums and destination rules for Advance, Tighten, and Return | Reason:" (This directly satisfies the benchmark preference for handoff/action/reason fields and gives the next agent an actionable unresolved dependency.)
- output_b: "Verification: each reviewed item leaves with a decision, supporting evidence or gap reason, and the next destination." (This defines the operational success condition for the UI workflow, not just the screen contents.)

### crm-json-import-translation
Winner: judgmentkit_mcp; confidence: high

Output B is the better guide for the downstream agent because it turns the technical import materials into the expected record acceptance review: ready records, owner-fix records, evidence per record, and the sendable summary. Output A is strong and activity-aligned, but it stays closer to an implementation-plan framing and introduces broader states like blocked records and unresolved mapping questions, which may be useful but are less directly tied to the expected next action.

- output_b: "produce a decision summary with two lists: Ready for acceptance and Needs owner fix" (This matches the expected next action: translate import mechanics into a record acceptance review.)
- output_b: "responsible owner, plain-language validation issue, required fix, and evidence from the preview or validation result" (It gives the downstream agent concrete fields needed to make and justify the operational judgment.)

### billing-webhook-debug-boundary
Winner: baseline_no_mcp; confidence: medium

Output A is slightly better because it translates the exact webhook artifacts from the brief into billing-triage evidence categories and keeps the UI boundary clear: raw technical material supports customer visibility, escalation, or retry decisions rather than becoming the primary experience. Output B is strong and has a cleaner handoff format, but it is less specific about the source mechanics and introduces customer communication/account access details that are not in the brief.

- output_a: "Treat webhook event names and request IDs as correlation evidence, Stripe invoice/payment/customer fields as business-state evidence, and retry logs plus endpoint status as delivery-health evidence." (This is the clearest translation from webhook mechanics into billing incident triage, which is the expected next action.)
- output_a: "Keep raw payload detail in diagnostics unless it directly supports a decision or escalation." (This enforces disclosure discipline and avoids exposing integration traces as the main UI contract.)

### vague-system-dashboard
Winner: judgmentkit_mcp; confidence: high

Output A is the better fit for this missing-context restraint case. It stays tightly grounded in the sparse brief and the expected next action: clarify the activity, decision, and outcome before planning. Output B is competent, but it broadens the clarification set into users, data sources, reports, hidden technical details, monitoring, risks, and health signals, which is more likely to over-scaffold or imply a workflow not present in the source.

- output_a: "Request the missing activity, decision, and outcome context; wait for answers before proposing any dashboard structure." (This directly matches the expected next action and avoids premature dashboard planning.)
- output_a: "What activity should this dashboard support?" (The question is activity-first and grounded in the missing context rather than generic dashboard components.)

### review-queue-without-decision
Winner: judgmentkit_mcp; confidence: medium

Both outputs correctly refuse to design from the thin brief and identify that scanability depends on the review decision. Output B is the better next-move guide because its questions stay closest to the missing context expected by the case: what decision or action the queue supports and what completion means. Output A is also useful, but it asks a wider set of questions and supplies many candidate outcomes/signals, which is a small drift risk for a benchmark focused on restraint.

- output_b: "What decision or next action should each reviewed work item support?" (This directly matches the expected next action: ask what decision the review queue supports.)
- output_b: "Product owner must define the reviewer decision and completion outcome before design or implementation" (The handoff explains who must provide what and why design should wait.)
