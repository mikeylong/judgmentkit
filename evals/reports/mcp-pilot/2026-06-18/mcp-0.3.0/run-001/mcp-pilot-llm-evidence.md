# JudgmentKit MCP LLM Preference Evidence

Blinded LLM preference judging of saved baseline and JudgmentKit-guided model outputs. This is product evidence, not deterministic scoring.

Source report: `evals/reports/mcp-pilot/2026-06-18/mcp-0.3.0/run-001/mcp-pilot-report.json`
Model under test: `gemma-4-e4b-it-lmstudio`
Judge: `gpt-5.5-codex` (gpt-5.5)

## Summary

Valid judgments: 20/20
Guided preferred: 18
Baseline preferred: 2
Ties: 0
Guided preference rate: 0.9
Average guided quality delta: 1.56

## Cases

| Case | LLM winner | Confidence | Guided/Baseline quality | Deterministic delta |
| --- | --- | --- | --- | --- |
| refund-schema-admin-translation | Guided | high | 6.5 / 2 | 60.91 |
| agent-trace-review-console | Guided | medium | 7.2 / 6.4 | 56.64 |
| crm-json-import-translation | Guided | high | 8 / 5 | 35 |
| billing-webhook-debug-boundary | Baseline | high | 5 / 7.5 | 33.56 |
| vague-system-dashboard | Guided | high | 8.5 / 6.5 | 26.67 |
| review-queue-without-decision | Guided | high | 8 / 5.5 | 32.01 |
| api-list-workflow | Guided | high | 6.5 / 4 | 36.99 |
| unclear-compliance-report | Guided | medium | 7.5 / 6 | 6.69 |
| clinical-intake-operator-review | Guided | medium | 5.5 / 4.5 | 29.61 |
| b2b-renewal-risk-review | Guided | high | 7 / 5.5 | 5.14 |
| field-dispatch-review | Guided | medium | 5 / 4 | 12.5 |
| moderation-escalation-review | Guided | medium | 7 / 4.5 | 13.89 |
| invented-activity-candidate | Guided | high | 8.5 / 7 | 21.64 |
| schema-leaking-workflow | Guided | medium | 8 / 7 | 25.02 |
| surface-type-mismatch | Guided | high | 8.2 / 6.4 | 12.88 |
| missing-handoff-workflow | Guided | medium | 6.5 / 5 | 32.88 |
| raw-form-controls-implementation | Baseline | high | 4 / 7.2 | 7 |
| missing-accessibility-evidence | Guided | medium | 8 / 6.8 | -3 |
| modal-action-order-review | Guided | high | 7 / 4 | 9.53 |
| implementation-term-leakage-review | Guided | high | 8 / 4 | 16.24 |

## Representative Rationale

### refund-schema-admin-translation
Winner: judgmentkit_mcp; confidence: high

Output A is materially closer to the required activity translation: it identifies the support lead, the refund triage decisions, and a next step around shaping the admin decision surface. It is imperfect because it asks for clarification instead of directly translating the provided backend artifacts into a triage handoff surface, invents an owner, and leaks internal MCP framing. Output B incorrectly treats the supplied brief as insufficient and moves to request more context, so it would stall the downstream agent instead of making the expected next move.

- output_a: "support leads managing refund cases" (Correctly identifies the real participant and domain activity.)
- output_a: "approve the refund, escalate it for policy review, or send it back" (Tracks the three required decision outcomes from the source brief.)

### agent-trace-review-console
Winner: judgmentkit_mcp; confidence: medium

Output B is the better downstream handoff because it translates the trace console into the operator's escalation-review activity: choosing Advance, Refine, or Return for Evidence. Output A is more faithful to the trace-data inventory, but its next move drifts toward generic data visualization and information architecture instead of the expected escalation review workflow. Output B is not excellent because it leaks internal context by mentioning MCP, asks generic questions, and under-specifies how trace evidence should support each decision.

- output_b: "Present a structured review interface allowing the operator to select one of three paths: Advance Escalation, Refine Escalation, or Return for Evidence." (This directly matches the expected move: translate traces into an escalation review workflow.)
- output_a: "Design the core data visualization structure for the trace review console, prioritizing clear temporal flow and distinct sections for different data types" (This is grounded in trace artifacts but shifts the agent toward implementation structure rather than the operator's escalation judgment.)

### crm-json-import-translation
Winner: judgmentkit_mcp; confidence: high

Output B better matches the expected move: translate raw import mechanics into an account-operations record acceptance review. It centers the user's decision, separates acceptable records from owner-fix records, includes the summary to send, and provides a usable handoff with action, owner, and reason. Output A is directionally related but invents a rejected lane, manual correction workflow, click-through behavior, and blocking clarification questions that are not needed for the next agent move.

- output_b: "Action: Present Account Operations Record Acceptance Review; Owner: Agent; Reason: User needs a clear decision point" (This directly supports the benchmark's focus on activity, decision, evidence, and next step, and includes the required handoff/action/reason structure.)
- output_b: "records ready for acceptance... records requiring owner attention... final import summary" (These categories align with the source brief's core decisions: accept records, identify owner fixes, and prepare the import summary.)

### billing-webhook-debug-boundary
Winner: baseline_no_mcp; confidence: high

Output A is better because it keeps the billing specialist's activity centered on invoice triage and maps webhook artifacts into decision evidence. It asks relevant boundary questions about customer visibility, escalation, and retry thresholds. Output B has a stronger structured handoff, but its questions are generic, it repeats already supplied activity context, and it leaks internal MCP context.

- output_a: "trace an invoice issue's lifecycle from initial webhook receipt through processing attempts, pinpointing where it stalled or failed" (This translates raw webhook mechanics into billing incident triage evidence for the specialist.)
- output_a: "specific criteria used to determine if an invoice issue is 'customer-visible' versus requiring engineering escalation" (The question targets the missing decision boundary directly rather than asking generic discovery questions.)

### vague-system-dashboard
Winner: judgmentkit_mcp; confidence: high

Output A better matches the expected next move: it refuses to invent dashboard requirements and asks narrowly for the supported activity, the key decision or next action, and the intended outcome. Output B is reasonable but drifts toward generic dashboard discovery, especially metrics, personas, and business questions, and is less directly aligned with the activity-decision-outcome gap.

- output_a: "What primary activity should this dashboard support?" (This directly targets the activity-fit gap instead of assuming what the dashboard is for.)
- output_a: "What key decision or next action do you want the user to make easier by looking at this screen?" (This is exactly the decision/action context needed before planning the dashboard.)

### review-queue-without-decision
Winner: judgmentkit_mcp; confidence: high

Output B better matches the expected missing-context move because it asks for the decision or next action the review queue should support, while Output A mostly asks about scanability mechanics and examples. B is not perfect because it invents a Product Manager owner and uses a slightly internal-sounding "diagnostic context" phrase, but its core question and handoff are more operationally aligned with the case.

- output_b: "What specific decision or next action should the interface make easier for the user when viewing items in the review queue?" (This is the targeted clarification the benchmark expects before planning the queue.)
- output_a: "Could you clarify what 'easy to scan' means in this context?" (This asks about scanability but misses the more fundamental missing decision the review queue supports.)
