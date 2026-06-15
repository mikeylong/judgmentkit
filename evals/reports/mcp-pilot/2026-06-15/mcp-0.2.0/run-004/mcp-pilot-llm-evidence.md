# JudgmentKit MCP LLM Preference Evidence

Blinded LLM preference judging of saved baseline and JudgmentKit-guided model outputs. This is product evidence, not deterministic scoring.

Source report: `evals/reports/mcp-pilot/2026-06-15/mcp-0.2.0/run-004/mcp-pilot-report.json`
Model under test: `gemma-4-e4b-it-lmstudio`
Judge: `gpt-5.5-codex` (gpt-5.5)

## Summary

Valid judgments: 20/20
Guided preferred: 18
Baseline preferred: 2
Ties: 0
Guided preference rate: 0.9
Average guided quality delta: 1.49

## Cases

| Case | LLM winner | Confidence | Guided/Baseline quality | Deterministic delta |
| --- | --- | --- | --- | --- |
| refund-schema-admin-translation | Guided | high | 7 / 3 | 60.91 |
| agent-trace-review-console | Guided | medium | 7 / 5.5 | 46.64 |
| crm-json-import-translation | Guided | high | 8 / 5.5 | 35 |
| billing-webhook-debug-boundary | Baseline | high | 3 / 7.5 | 2.13 |
| vague-system-dashboard | Guided | high | 8.5 / 6.5 | 26.67 |
| review-queue-without-decision | Guided | high | 7 / 5.5 | 32.01 |
| api-list-workflow | Guided | high | 6.5 / 3 | 36.99 |
| unclear-compliance-report | Guided | medium | 7.4 / 6.2 | 6.69 |
| clinical-intake-operator-review | Guided | medium | 6.2 / 4.6 | 29.61 |
| b2b-renewal-risk-review | Guided | medium | 7 / 6 | 8.5 |
| field-dispatch-review | Guided | high | 5.8 / 4 | 12.5 |
| moderation-escalation-review | Guided | high | 7 / 4.8 | 13.89 |
| invented-activity-candidate | Guided | high | 8.5 / 7 | 21.64 |
| schema-leaking-workflow | Guided | high | 8.5 / 7 | 25.02 |
| surface-type-mismatch | Guided | high | 8 / 6.5 | 12.88 |
| missing-handoff-workflow | Guided | medium | 7 / 6 | 32.88 |
| raw-form-controls-implementation | Baseline | high | 5 / 7.5 | 7 |
| missing-accessibility-evidence | Guided | high | 8 / 6.5 | -3 |
| modal-action-order-review | Guided | high | 7 / 3 | 9.53 |
| implementation-term-leakage-review | Guided | high | 7 / 4 | 16.24 |

## Representative Rationale

### refund-schema-admin-translation
Winner: judgmentkit_mcp; confidence: high

Output A is better aligned with the source brief because it centers the support lead's refund triage decision and names the three relevant outcomes. It would help a downstream agent move toward a handoff/admin surface. Output B is overly blocked by alleged missing context even though the brief already supplies the real user, activity, decision set, and expected next action.

- output_a: "support leads managing refund cases" (Correctly identifies the real user and activity rather than focusing only on schemas or endpoints.)
- output_a: "approve the refund, escalate it for policy review, or send it back" (Grounds the plan in the decision options specified by the source brief.)

### agent-trace-review-console
Winner: judgmentkit_mcp; confidence: medium

Output B better matches the expected next action: translating raw trace artifacts into an escalation review workflow with explicit decision paths. Output A is more grounded in the listed trace data, but it defaults to data aggregation and temporal visualization rather than the operator's judgment activity. Output B is penalized for internal leakage in the rationale and some generic questions, but its decision framing and handoff are more operationally useful.

- output_a: "Design the core data visualization structure for the trace review console, prioritizing clear temporal flow and distinct sections for different data types" (This moves toward an implementation/information architecture view instead of the expected escalation review workflow.)
- output_a: "Conversation History, Tool Execution Log, Metadata Summary" (These categories expose trace machinery and do not yet translate evidence into the operator's decision process.)

### crm-json-import-translation
Winner: judgmentkit_mcp; confidence: high

Output B better matches the expected next action: it reframes the JSON import mechanics as an account-operations record acceptance review. It is more restrained, keeps the decision structure centered on acceptable records, owner-fix records, and the summary to send, and includes a usable Action/Owner/Reason handoff. Output A is directionally relevant but invents more workflow detail and asks generic clarification questions that would slow the next move.

- output_b: "Action: Present Account Operations Record Acceptance Review; Owner: Agent; Reason: User needs a clear decision point" (This gives the downstream agent a concrete next move tied to the user's activity and decision.)
- output_b: "records ready for acceptance... records requiring owner attention... final import summary" (This mirrors the brief's core decisions without overexposing JSON, schemas, or API mechanics.)

### billing-webhook-debug-boundary
Winner: baseline_no_mcp; confidence: high

Output A is substantially more useful because it uses the supplied billing context and translates webhook artifacts into a triage workflow for a billing specialist. It preserves the decision boundary around customer visibility, engineering escalation, and retry resolution. Output B mostly asks generic discovery questions that are already answered by the source brief and delays the expected next move.

- output_a: "trace an invoice issue's lifecycle from initial webhook receipt through processing attempts" (This ties the mechanics to incident evidence and helps a downstream agent shape a billing triage surface.)
- output_a: "actionable decision nodes for the specialist" (This aligns with the expected move: translate webhook mechanics into customer-visible/escalate/retry decisions.)

### vague-system-dashboard
Winner: judgmentkit_mcp; confidence: high

Output A better matches the expected next move: it refuses to plan from a vague brief and asks targeted questions about the supported activity, the decision or next action the dashboard should enable, and the outcome the user should leave with. Output B is reasonable but more generic and dashboard-conventional, leaning toward users, metrics, and monitoring before the activity and outcome are established.

- output_a: "What primary activity should this dashboard support?" (This is the central missing context for planning the dashboard without guessing.)
- output_a: "What key decision or next action do you want the user to make easier" (It asks for the exact decision/action the expected answer calls for.)

### review-queue-without-decision
Winner: judgmentkit_mcp; confidence: high

Output B is better because it identifies the core missing context: what decision or next action the review queue is meant to support. Output A is restrained and valid, but it shifts the clarification toward scanability mechanics and UI patterns before establishing the activity outcome, which is the expected next move in this case. Output B has flaws, especially the invented Product Manager owner and the phrase "diagnostic context," but its questions would better guide the downstream agent.

- output_a: "Could you clarify what 'easy to scan' means in this context?" (This is relevant but not the central missing context; scanability should follow from the review decision.)
- output_a: "What are the primary dimensions (e.g., priority, type, age) that users need to use to quickly filter or group items" (This assumes queue dimensions before establishing what users are deciding or doing.)
