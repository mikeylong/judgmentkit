# JudgmentKit MCP Pilot Evidence Packet

## Summary

Primary run: `run-012` (passed)
Result: 17/20 passed, average guided delta 21.56, guided leaks 0, invalid outputs 0.

## Methodology

Deterministic scoring of saved baseline and JudgmentKit-guided model captures. JudgmentKit MCP supplies context but is not used as the judge.

## MCP Version Lock

Required version: `0.2.0`
Actual version: `0.2.0`
Package version: `0.2.0`
Metadata SHA256: `82ee2578ad8ec7998f319195bfa18603a93b9f7b848d2cb24984623397506ee2`

## Model Runtime

| ID | Label | Provider | Model | Local |
| --- | --- | --- | --- | --- |
| gemma-4-e4b-it-lmstudio | Gemma 4 E4B LM Studio | lmstudio-openai-chat | gemma-4-e4b-it@q4_k_m | yes |

## Before/After

| Run | Status | Passed | Avg Delta | Guided Wins | Invalid | Guided Leaks |
| --- | --- | --- | --- | --- | --- | --- |
| run-012 | passed | 17/20 | 21.56 | 19 | 0 | 0 |
| run-008 | failed | 9/20 | 12.76 | 14 | 0 | 17 |
| run-011 | failed | 14/20 | 21.56 | 19 | 0 | 0 |

## Scoring Calibration

Standard delta passes: 14
Calibrated-only passes: 3
Pass reason counts: `{"delta_threshold":14,"high_absolute_guided_score":1,"implementation_repair_loop_verified":2}`

## Remaining Failures

| Case | Type | Winner | Delta | Guided/Baseline |
| --- | --- | --- | --- | --- |
| billing-webhook-debug-boundary | activity_translation | judgmentkit_mcp | 8.55 | 42.83/34.28 |
| unclear-compliance-report | missing_context_restraint | judgmentkit_mcp | 6.69 | 66.69/60 |
| modal-action-order-review | implementation_review | baseline_no_mcp | -8.01 | 54.99/63 |

## Artifact Paths

Primary report: `evals/reports/mcp-pilot/2026-06-14/mcp-0.2.0/run-012/mcp-pilot-report.json`
Primary capture dir: `evals/mcp-pilot-captures-gemma-20case-hardening-v2`
Comparison reports: `evals/reports/mcp-pilot/2026-06-14/mcp-0.2.0/run-008/mcp-pilot-report.json`, `evals/reports/mcp-pilot/2026-06-14/mcp-0.2.0/run-011/mcp-pilot-report.json`
