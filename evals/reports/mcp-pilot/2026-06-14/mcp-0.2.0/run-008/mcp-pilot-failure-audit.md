# JudgmentKit MCP Pilot Failure Audit

Run: `2026-06-14/mcp-0.2.0/run-008`

Source artifacts:
- `evals/reports/mcp-pilot/2026-06-14/mcp-0.2.0/run-008/mcp-pilot-report.json`
- `evals/mcp-pilot-captures-gemma-20case-v1/mcp-0.2.0/gemma-4-e4b-it-lmstudio/*/*.json`

## Summary

The 20-case Gemma-only run completed cleanly from a harness perspective: 20 cases evaluated, 40 captures written, 0 capture-required results, and 0 invalid outputs. It failed the benchmark bar because only 9 of 20 cases passed and guided outputs had 17 critical disclosure leaks.

The useful signal is that the average guided delta was still positive at +12.76 and guided won 14 of 20 cases. The failure mode is not transport, JSON validity, or MCP versioning. It is primarily guided output discipline on source-only terms plus implementation-review response framing.

## Buckets

| Bucket | Case ids | Evidence | Assessment |
|---|---|---|---|
| Source-only diagnostic leakage | `agent-trace-review-console`, `crm-json-import-translation`, `billing-webhook-debug-boundary` | Guided outputs repeated `token counts`, `function calls`, `tool outputs`, `model messages`, `retry metadata`, `raw JSON`, and `webhook`. | Prompt/context leakage. Guided prompts exposed raw source mechanics and did not force Gemma to paraphrase them as operational evidence. |
| Candidate-validation leakage | `invented-activity-candidate`, `surface-type-mismatch` | Guided outputs repeated wrong-candidate/source-mismatch terms such as `treasury`, `cash reserves`, `incident queue`, `operator`, and `escalation handoff`. | Mixed. The rejection rationale needs mismatch evidence, but exact bad-candidate terms should be paraphrased for this benchmark. |
| High-baseline small delta | `b2b-renewal-risk-review` | Guided scored 93.32 with no leaks, but baseline was 88.18, so the delta was only +5.14. | Rubric pressure, not harness failure. Leave scoring unchanged for now. |
| Operator handoff context drop | `field-dispatch-review` | Guided focused on parts confirmation and lost required dispatch evidence such as location, SLA risk, technician, and assignment readiness. | Prompt/context weakness. Guided handoff needs to preserve critical evidence axes before naming a gap. |
| Implementation-review framing | `raw-form-controls-implementation`, `missing-accessibility-evidence`, `modal-action-order-review`, `implementation-term-leakage-review` | Repair-loop summaries passed their expectations, but guided benchmark responses under-scored or leaked terms. `raw-form-controls-implementation` incorrectly accepted the original implementation. | Prompt/context weakness. The outer response must distinguish original implementation rejection/blocking from later repaired-loop acceptance. |

## Hardening Applied Next

The follow-up patch should not change case thresholds, scoring, MCP pinning, or capture schema. It should:

1. Redact source-only leak terms from guided prompts, including the source brief and submitted fixtures.
2. Keep exact MCP tool sequences in captures, but omit raw tool names from the prompt context.
3. Add an implementation-response directive that tells the model whether to reject, block, or accept the original implementation evidence.
4. Preserve compact tool summaries and repair-loop summaries without adding full `structuredContent` back into prompts.
