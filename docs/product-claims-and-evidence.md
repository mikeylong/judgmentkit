# Product claims and evidence

JudgmentKit's chosen purpose is to help people build useful interfaces with AI agents. The [vision](../VISION.md) defines the intended result. This map separates that result from the evidence currently available.

Sources were inspected on October 7 and 8, 2026. The reports below distinguish local regression checks, historical evaluations, and the observed task. Public pages describe the public experience and its limits.

## What the public product promises

The [homepage](https://judgmentkit.ai/) presents activity judgment before component composition, with examples of avoiding the wrong interface concept. The [docs](https://judgmentkit.ai/docs/) introduce first use through a replayable contract and repair fixture, document the agent workflow, and retain required implementation review for Artifact Inspector.

The promise and the demonstrated first-use path differ in scope. A fixture explains the review mechanism. A builder encounter must establish whether that mechanism helps someone finish real interface work. The [examples](https://judgmentkit.ai/examples/) and [evals](https://judgmentkit.ai/evals/) remain supporting references; their hosted content was unavailable to this inspection, so the historical findings below come from local reports.

## Capability claims

| Claim | Current evidence | Honest wording and limit |
| --- | --- | --- |
| Guide the agent from the activity to interaction responsibilities. | [Kernel spec](../specs/judgmentkit-kernel.md), [usage contract](agent-usage-contract.md), and [activity review tests](../tests/activity-model-review.test.mjs). | JudgmentKit structures and reviews the working premise. Correctness still depends on the source and the builder's corrections. |
| Check declared implementation requirements and return repair guidance. | [Implementation contract](../contracts/ai-ui-generation.activity-contract.json) and [handoff and implementation tests](../tests/ui-generation-handoff.test.mjs). | Checks apply to the active contract and evidence supplied. Acceptance is bounded to those checks. |
| Verify supported rendered observations. | [Browser measurement runtime](../src/visual-composition-browser-runtime.mjs) and [runtime tests](../tests/visual-composition-browser-runtime.test.mjs). | Trusted measurements can establish specific rendered facts for a bound candidate and tested conditions. They do not establish every interaction or task outcome. |
| Preserve source grounding and participant authority. | [Activity contract](../contracts/ai-ui-generation.activity-contract.json), [usage rules](agent-usage-contract.md), and [authority tests](../tests/activity-model-review.test.mjs). | Exact attributed source travels through downstream review. Content continuity grants no action authority. Governing protected boundaries require their relevant authoritative source. |
| Avoid unsupported surface choices and contradictory routing. | [Local regression evidence](../outputs/activity-routing-review/README.md) and [regression tests](../tests/tide-workflow-regressions.test.mjs). | Saved-input replay checks the routing behavior. That report records no fresh generation or deployed verification. |
| Guide the selected CLEAR preview/cancel task while retaining its sources. | [Encounter summary](builder-encounter-evidence.md) and [task-scope spec](../specs/builder-task-scope-reliability.md). | Direct-kernel rehearsal reached frontend guidance. The existing interface passed 48 automated browser assertions, and Mike reported understanding the proposal and cancelling its preview. No fresh implementation, matched builder comparison, or trusted interactive acceptance was produced. |
| Verify the complete Artifact Inspector interaction. | [Current design boundary](../DESIGN.md) and the [public guide](https://judgmentkit.ai/docs/#artifact-inspector). | Not established. Keep `review_required`; caller-authored evidence and static screenshots cannot replace trusted interactive attestation. |

The three verbs have different evidence requirements:

1. **Guide:** identify the source, the inferred design choice, and the assumptions the builder can correct.
2. **Check:** identify the requirement, the artifact or evidence checked, and whether the requirement passed.
3. **Verify:** identify the trusted observer, the exact artifact, the tested state and conditions, and the observed result. Report missing coverage alongside passing observations.

## Outcome hypotheses

| Hypothesis | Existing evidence | Evidence needed next |
| --- | --- | --- |
| Builders need fewer manual corrections. | Contracts and repair fixtures show how correction works. | A complete real episode compared with the builder's usual approach, including setup, questions, repairs, and abandoned work. |
| Intended users complete tasks more correctly. | [August report](../evals/reports/2026-08-08/mcp-0.7.0/run-001/ui-generation-report.json) scores saved artifacts, without fresh generation or observed user completion. | Representative users attempt predefined tasks on hidden-condition artifacts. Record correct results, misunderstandings, interaction failures, and accessibility of essential paths. |
| Full JudgmentKit adds value beyond concise activity-first guidance. | [July catalog](../evals/reports/mcp-pilot/index.json) records 25 guided wins under internal scoring, while saved-output model preference favored guided output in 14 of 30 cases. | A bounded three-condition pilot: ordinary agent instructions, concise activity-first guidance, and full JudgmentKit. Include total overhead and matched generation budgets. |
| Builders return for another task. | No inspected source establishes repeat use or adoption. | Observe voluntary use on a subsequent real task and record why the builder returned or stopped. |

The historical scoring disagreement makes evaluation validity a question to investigate. Those reports describe older saved outputs and do not establish current product superiority.

The first CLEAR task supplied a successful self-report and two false stops to repair in JudgmentKit. The encounter did not observe a full build episode, measure builder time or assistance, compare conditions, or establish return use. The [nine-episode pilot kit](../evals/builder-usefulness/README.md) is prepared; its human study remains `not_run`.

## Rules for examples and conclusions

1. Label evidence as a curated fixture, saved-input replay, generated artifact, observed task, or repeated use.
2. Keep engineering checks, model preference, builder progress, and end-user completion as separate results.
3. Name untested states, unavailable measurements, failed attempts, and abandoned episodes. Retain the original artifacts.
4. Update claims when new evidence changes the conclusion. A successful local prototype cannot establish a hosted release or a general performance claim.

The [builder workflow spec](../specs/build-useful-interfaces.md) supplies the acceptance cases. The [product plan](product-vision-and-improvement-plan.md) defines when to expand the research and choose further implementation work.
