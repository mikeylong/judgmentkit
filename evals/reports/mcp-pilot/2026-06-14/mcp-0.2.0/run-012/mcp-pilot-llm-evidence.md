# JudgmentKit MCP LLM Preference Evidence

Blinded LLM preference judging of saved baseline and JudgmentKit-guided model outputs. This is product evidence, not deterministic scoring.

Source report: `evals/reports/mcp-pilot/2026-06-14/mcp-0.2.0/run-012/mcp-pilot-report.json`
Model under test: `gemma-4-e4b-it-lmstudio`
Judge: `gpt-5.5-codex` (gpt-5.5)

## Summary

Valid judgments: 20/20
Guided preferred: 14
Baseline preferred: 6
Ties: 0
Guided preference rate: 0.7
Average guided quality delta: 0.55

## Cases

| Case | LLM winner | Confidence | Guided/Baseline quality | Deterministic delta |
| --- | --- | --- | --- | --- |
| refund-schema-admin-translation | Guided | high | 7.2 / 3.1 | 59.51 |
| agent-trace-review-console | Guided | medium | 7.2 / 5.8 | 46.64 |
| crm-json-import-translation | Baseline | high | 5.2 / 7.8 | 24.52 |
| billing-webhook-debug-boundary | Baseline | high | 4.2 / 7.8 | 8.55 |
| vague-system-dashboard | Guided | high | 8.5 / 6.5 | 26.67 |
| review-queue-without-decision | Guided | high | 8 / 5.5 | 32.01 |
| api-list-workflow | Guided | medium | 6.2 / 3.4 | 36.99 |
| unclear-compliance-report | Guided | medium | 7.5 / 6.5 | 6.69 |
| clinical-intake-operator-review | Guided | medium | 6.4 / 5.7 | 29.61 |
| b2b-renewal-risk-review | Guided | high | 7 / 5.5 | 8.5 |
| field-dispatch-review | Guided | medium | 6.5 / 4.5 | 12.5 |
| moderation-escalation-review | Guided | medium | 7.1 / 5.6 | 13.89 |
| invented-activity-candidate | Baseline | high | 6 / 8 | 17.5 |
| schema-leaking-workflow | Baseline | high | 5.6 / 7.2 | 24.02 |
| surface-type-mismatch | Baseline | high | 6.5 / 7.5 | 25 |
| missing-handoff-workflow | Guided | high | 7.6 / 6.2 | 23.94 |
| raw-form-controls-implementation | Guided | medium | 7.3 / 6.8 | 7 |
| missing-accessibility-evidence | Guided | medium | 7.5 / 6.5 | 7 |
| modal-action-order-review | Baseline | medium | 3 / 6.5 | -8.01 |
| implementation-term-leakage-review | Guided | high | 8 / 5 | 28.76 |

## Representative Rationale

### refund-schema-admin-translation
Winner: judgmentkit_mcp; confidence: high

Output A is closer to the expected next move: it translates the source brief into the support lead's refund triage activity, names the three operational decisions, and frames the work as user-facing decision support rather than exposing raw schema/API/tool traces. Output B over-blocks on missing context even though the brief already supplies enough to plan the next response, and its questions drift toward generic UI fixture discovery instead of refund triage handoff design. Output A is not perfect because it leaks internal context with "MCP indicates" and its next action is a bit generic, but it would still better guide a downstream agent.

- output_a: "review a refund case and make one of three decisions: approve the refund, escalate it for policy review, or send it back" (This matches the source brief's real user and decision outcomes, making it activity-fit and operationally useful.)
- output_a: "Evidence Gap: Specific details on the required output state" (It at least frames missing information as an evidence/disclosure issue relevant to a handoff.)

### agent-trace-review-console
Winner: judgmentkit_mcp; confidence: medium

Output B better matches the expected next move: translating trace artifacts into an escalation review workflow organized around Advance, Tighten, and Return. It is more useful for a downstream agent deciding what response to plan next. Its main weakness is internal leakage in the rationale and some generic questions, so the win is not high confidence. Output A is more leak-free and grounded in the trace inputs, but it steers the next action toward data visualization and technical trace sections rather than the operator's escalation judgment workflow.

- output_b: "Design the core workflow steps around the three possible outcomes of the review process: Advance, Tighten, or Return." (This directly matches the expected next action: translate traces into an escalation review workflow.)
- output_b: "Decision/Action: Design the core UI workflow for reviewing AI-generated escalations." (The handoff is operational and tells the downstream agent what to do next and why.)

### crm-json-import-translation
Winner: baseline_no_mcp; confidence: high

Output A better supports the expected next move: converting raw import mechanics into a record acceptance review for an account operations user. It names the core decision categories and gives a usable next action. It has some invented workflow details, especially rejected records, individual accept/reject, and manual correction, but it stays closer to the source brief than Output B. Output B is restrained but too generic, asks for context the brief already provides, and does not operationalize the owner-fix and import-summary decisions.

- output_a: "present the overall summary of records (Accepted, Needs Fixes, Rejected)" (This is close to the needed record acceptance review, though 'Rejected' is not explicitly in the brief.)
- output_a: "Present the initial summary dashboard showing counts for Accepted, Needs Fixes, and Rejected records." (This gives the downstream agent an actionable next UI move grounded in triage decisions.)

### billing-webhook-debug-boundary
Winner: baseline_no_mcp; confidence: high

Output A would better help the downstream agent because it stays anchored to the supplied billing/webhook evidence and frames the UI around deciding whether an invoice issue is customer-visible, escalatable, or retry-resolvable. It is imperfect: it leans into ingestion/workflow implementation language and asks for rules instead of directly translating the mechanics into an incident triage model. Output B is more generic and retreats to foundational discovery even though the brief already supplies the activity, participant, evidence types, and decision outcomes.

- output_a: "trace an invoice issue's lifecycle from initial webhook receipt through processing attempts, pinpointing where it stalled or failed" (This is grounded in the webhook/retry/request-ID evidence and moves toward operational diagnosis.)
- output_a: "determine if an invoice issue is 'customer-visible' versus requiring engineering escalation" (This directly matches the decision boundary in the source brief.)

### vague-system-dashboard
Winner: judgmentkit_mcp; confidence: high

Output A better matches the expected next move: it refuses to plan from the vague brief and asks directly about the supported activity, the decision or next action the dashboard should enable, and the outcome the user should leave with. Output B is valid but more generic and dashboard-template driven, introducing users, metrics, monitoring, and business questions instead of centering the activity-decision-outcome gap.

- output_a: "What primary activity should this dashboard support?" (This directly targets the missing activity context required before planning a dashboard.)
- output_a: "What key decision or next action do you want the user to make easier by looking at this screen?" (This matches the expected focus on the decision or outcome the dashboard should support.)

### review-queue-without-decision
Winner: judgmentkit_mcp; confidence: high

Output B better matches the expected next move because it asks what decision or action the review queue must support before planning scanability. Output A stays centered on generic scan criteria and layout examples, which could lead a downstream agent into premature UI design without the missing activity decision.

- output_b: "What specific decision or next action should the interface make easier for the user when viewing items in the review queue?" (This is the targeted missing-context question the benchmark expects.)
- output_a: "Could you clarify what 'easy to scan' means in this context?" (This focuses on presentation quality rather than the decision the queue supports.)
