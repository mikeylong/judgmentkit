# JudgmentKit MCP LLM Preference Evidence

Blinded LLM preference judging of saved baseline and JudgmentKit-guided model outputs. This is product evidence, not deterministic scoring.

Source report: `evals/reports/mcp-pilot/2026-06-15/mcp-0.2.0/run-002/mcp-pilot-report.json`
Model under test: `gemma-4-e4b-it-lmstudio`
Judge: `gpt-5.5-codex` (gpt-5.5)

## Summary

Valid judgments: 10/10
Guided preferred: 9
Baseline preferred: 1
Ties: 0
Guided preference rate: 0.9
Average guided quality delta: 1.79

## Cases

| Case | LLM winner | Confidence | Guided/Baseline quality | Deterministic delta |
| --- | --- | --- | --- | --- |
| refund-schema-admin-translation | Guided | high | 6.5 / 2 | 60.91 |
| crm-json-import-translation | Guided | high | 8 / 4.5 | 35 |
| billing-webhook-debug-boundary | Baseline | high | 3.1 / 7.4 | 2.13 |
| vague-system-dashboard | Guided | high | 8 / 6.3 | 26.67 |
| review-queue-without-decision | Guided | high | 8 / 5 | 32.01 |
| invented-activity-candidate | Guided | high | 8 / 6.5 | 21.64 |
| schema-leaking-workflow | Guided | medium | 8 / 7 | 25.02 |
| surface-type-mismatch | Guided | high | 8 / 6.5 | 12.88 |
| modal-action-order-review | Guided | medium | 6.5 / 4 | 9.53 |
| implementation-term-leakage-review | Guided | high | 8 / 5 | 16.24 |

## Representative Rationale

### refund-schema-admin-translation
Winner: judgmentkit_mcp; confidence: high

Output A is meaningfully closer to the expected next move: it translates the backend/source-material brief into the support lead's refund triage activity and names the core decision outcomes. It is imperfect because it stays generic, asks broad clarification questions, invents an owner, and leaks internal context in the rationale. Output B is too withholding: it treats the provided source brief as insufficient and redirects to requesting more context instead of planning the refund triage handoff surface.

- output_a: "approve the refund, escalate it for policy review, or send it back to the user/requester because evidence is missing" (This matches the source brief's triage decisions and helps a downstream agent center the UI on the support lead's judgment.)
- output_b: "I cannot generate the final agent response plan. I need the actual UI request or context" (This is the wrong next move because the supplied brief already states the activity, actor, evidence sources, and expected translation target.)

### crm-json-import-translation
Winner: judgmentkit_mcp; confidence: high

Output B is more useful for the downstream agent because it translates the raw import mechanics into the account operations activity: reviewing record acceptance, identifying owner-required fixes, and preparing the import summary. It stays closer to the source brief and provides an explicit handoff with Action, Owner, and Reason. Output A is directionally related but adds unsupported workflow details and asks generic clarification questions that would slow the next move.

- output_b: "Action: Present Account Operations Record Acceptance Review; Owner: Agent; Reason: User needs a clear decision point" (This gives the downstream agent an operational next move tied to the user's decision activity.)
- output_b: "records ready for acceptance... records requiring owner attention... final import summary" (These map directly to the source brief's required decisions.)

### billing-webhook-debug-boundary
Winner: baseline_no_mcp; confidence: high

Output A would better help a downstream agent because it treats the UI as billing incident triage and ties the supplied webhook evidence to operator decisions. It is not perfect: it leans into implementation language like ingestion and a rules engine, and it asks for clarification instead of proposing provisional triage boundaries. Output B is much weaker because it ignores the activity and role already present in the brief and falls back to generic discovery questions.

- output_a: "trace an invoice issue's lifecycle from initial webhook receipt through processing attempts, pinpointing where it stalled or failed" (This is grounded in the billing incident activity and helps define the UI around evidence-to-decision work.)
- output_a: "correlates data points (event name $\rightarrow$ payload $\rightarrow$ retry status $\rightarrow$ endpoint health) into actionable decision nodes" (This directly maps source inputs into decision support, though it is somewhat implementation-heavy.)

### vague-system-dashboard
Winner: judgmentkit_mcp; confidence: high

Output A better matches the expected next move: it stays restrained and asks targeted questions about the dashboard's supported activity, the key decision or action it should enable, and the outcome the user should leave with. Output B is acceptable, but it drifts toward generic dashboard discovery with personas, metrics, and business questions, which is less directly aligned with the missing context called out by the case.

- output_a: "What primary activity should this dashboard support?" (This targets the core missing activity context instead of assuming a dashboard type.)
- output_a: "What key decision or next action do you want the user to make easier by looking at this screen?" (This aligns precisely with the expected focus on decisions and outcomes.)

### review-queue-without-decision
Winner: judgmentkit_mcp; confidence: high

Output B is better because it identifies the missing activity contract: the review queue cannot be planned responsibly until the agent knows what decision or next action the queue supports. Output A stays restrained but drifts into scan mechanics and layout/filter dimensions, which are secondary before the decision context is known. Output B has minor issues: it invents a Product Manager owner and mentions diagnostic context, but those do not outweigh its stronger next move.

- output_b: "What specific decision or next action should the interface make easier for the user when viewing items in the review queue?" (This directly matches the expected next action and keeps the agent focused on the missing decision context.)
- output_a: "Could you clarify what 'easy to scan' means in this context? For example, should it involve visual grouping, sorting by urgency, or a specific layout?" (This asks a plausible clarification, but it prematurely frames the problem around presentation mechanics instead of the supported review decision.)

### invented-activity-candidate
Winner: judgmentkit_mcp; confidence: high

Output B better supports the expected next move: reject the ungrounded candidate and request a source-aligned replacement. Output A identifies the mismatch, but weakens the judgment by asking for clarification and framing the handoff as needing clarification despite the source brief being sufficient to reject. Output B is not perfect because it invents an owner and includes some fixture/internal language, but it is more operationally useful.

- output_a: "Need clarification on which parts of the source brief must be represented in the next candidate fixture" (This is unnecessary because the source already states the role, activity, and three decision outcomes needed to reject and replace the candidate.)
- output_a: "What specific aspects of the source brief need to be captured" (The question is generic and slows the downstream next move instead of cleanly rejecting the ungrounded candidate.)
