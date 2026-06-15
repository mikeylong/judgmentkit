# JudgmentKit MCP Pilot Evidence Packet

## Summary

Primary run: `run-001` (capture-required)
Result: 0/0 passed, average guided delta 0, guided leaks 0, invalid outputs 0.

## Methodology

Deterministic scoring of saved baseline and JudgmentKit-guided model captures. JudgmentKit MCP supplies context but is not used as the judge.

## MCP Version Lock

Required version: `0.2.0`
Actual version: `0.2.0`
Package version: `0.2.0`
Metadata SHA256: `72c5f5bca45bf96254e02c42ddbebb69dbee9e79f536c8fbb358cd89ff641d53`

## Model Runtime

| ID | Label | Provider | Model | Local |
| --- | --- | --- | --- | --- |
| gpt-5.5-codex | GPT-5.5 Codex | codex | gpt-5.5 | no |

## Before/After

| Run | Status | Passed | Avg Delta | Guided Wins | Invalid | Guided Leaks |
| --- | --- | --- | --- | --- | --- | --- |
| run-001 | capture-required | 0/0 | 0 | 0 | 0 | 0 |

## Scoring Calibration

Standard delta passes: 0
Calibrated-only passes: 0
Pass reason counts: `{}`

## Proof Summary

Repair loop: 3/4 converged, 1 stopped, average attempts to pass 2.
Live observation: 4/4 converged, 0 stopped, 0 failed.
Visual token adapter: 4/4 proof cases passed, 0 failed.

## Remaining Failures

| Case | Type | Winner | Delta | Guided/Baseline |
| --- | --- | --- | --- | --- |
| none |  |  |  |  |

## Artifact Paths

Primary report: `evals/reports/mcp-pilot/2026-06-15/mcp-0.2.0/run-001/mcp-pilot-report.json`
Primary capture dir: `evals/mcp-pilot-captures`
Comparison reports:

## Scoped Changed Files

Intentional proof-package scope. Existing unrelated capture/report artifacts are preserved outside this manifest.

| Path |
| --- |
| contracts/ai-ui-generation.activity-contract.json |
| contracts/judgmentkit-kernel.schema.json |
| src/index.mjs |
| src/mcp.mjs |
| evals/run-mcp-pilot-evals.mjs |
| evals/mcp-pilot-cases.json |
| evals/build-mcp-pilot-evidence-packet.mjs |
| tests/kernel-contract.test.mjs |
| tests/ui-generation-handoff.test.mjs |
| tests/mcp.test.mjs |
| tests/mcp-stdio.test.mjs |
| tests/mcp-http.test.mjs |
| tests/mcp-pilot-evals.test.mjs |

## Next Milestone

Status: `deferred_planning_only`
Default renderer/component package driven by implementation_contract.visual_token_adapter.

| Constraint |
| --- |
| renderer consumes contract primitives and visual token semantics |
| renderer does not create approved primitives |
| renderer cannot satisfy or bypass implementation gates |
| renderer does not introduce A2UI, a catalog compiler, or protocol compiler |
| renderer is not visual-quality scoring |
