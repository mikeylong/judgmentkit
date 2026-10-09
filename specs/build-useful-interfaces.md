# Build useful interfaces with AI agents

## Purpose and status

Support one complete builder episode: turn a real intent into a working interface, try the important tasks, and repair failures that prevent completion. The [vision](../VISION.md) is the product direction. This spec defines the smallest experience to prototype using the existing portable skill and runtime; it does not claim that a builder encounter has been completed.

This spec follows [DESIGN.md](../DESIGN.md), the [kernel spec](judgmentkit-kernel.md), the [agent usage contract](../docs/agent-usage-contract.md), and the [AI UI generation contract](../contracts/ai-ui-generation.activity-contract.json). It preserves their authority and acceptance rules. Tide remains a regression fixture, with no special priority in the product roadmap.

## Activity and participants

The builder directs an AI agent to create or improve an interface needed for real work. The builder supplies intent and corrects product decisions. The agent reads the available project sources, operates JudgmentKit, builds the result, gathers evidence, and repairs failures. The intended user attempts the target tasks. A domain owner supplies governing rules where the activity requires authority.

The starting artifacts are the brief, existing interface when present, allowed project context, source data, and the builder's normal build tools. The resulting artifacts are the working interface, retained source decisions, focused repairs, and a readable account of the checks and remaining gaps.

The working rhythm is propose, inspect, correct, build, and try. The agent carries technical bookkeeping. The builder remains responsible for the product direction and consequential commitments.

## Interaction requirements

| Moment | What the builder sees | What the agent must do |
| --- | --- | --- |
| Describe or show the work. | A brief entry in the builder's existing agent conversation, including an existing interface when useful. | Read the brief and available context before asking. Establish participants, objective, decisions, outcomes, domain terms, and relevant authority. |
| Establish a working premise. | A short description of who needs to do what and the design consequence. Show consequential assumptions. | Infer reversible gaps, review the activity candidate, and distinguish source-supported claims from inference. |
| Resolve a material fork. | At most one consequential question at a time, with the reason its answer changes the interface. | Use available evidence first. Resolve competing activities explicitly. An unsupported route must remain unresolved. |
| Build or revise. | A usable result or concrete progress toward it, plus the decisions that matter. | Preserve the reviewed activity through workflow, implementation contract, handoff, and frontend context. Generate outside JudgmentKit using the chosen project implementation authority. |
| Try and repair. | The important task, the failure observed, and the focused change that addresses it. | Check declared requirements, gather supported runtime evidence, perform the task checks, and resubmit relevant repairs. |
| Finish the episode. | The working interface, what changed, what was checked, and what remains unresolved. | Separate contract acceptance, observed task completion, and unverified behavior. Preserve failed and repaired artifacts for comparison. |

Use the activity's terms for tasks, controls, decisions, and completion. Keep prompts, packet fields, schemas, resource identifiers, tools, review statuses, and implementation traces in diagnostics unless the builder is explicitly doing setup, debugging, auditing, or integration work.

## Correction and authority

1. A builder correction updates the current premise and affected source context. Retain the prior and revised decisions. The agent re-enters the existing review sequence and refreshes downstream artifacts that depend on the revision. An old acceptance receipt cannot validate the revised premise or implementation.
2. Reversible assumptions may support exploration when labelled. Missing permission, policy, safety rules, sensitive disclosure rules, or irreversible commitments cannot become established facts through inference.
3. The agent passes the exact current brief and attributed raw context across the boundaries required by the existing contract. Integrity receipts establish continuity, not permission. A protected boundary requires a source that governs that boundary and a stable source reference.
4. Surface patterns explain the interaction purpose. Unusual or mixed activities require an explicit grounded choice; layout vocabulary alone cannot select a pattern.
5. The active design-system source and local component authority govern implementation. An external design system receives no implicit JudgmentKit fallback. Product state, data, authorization truth, and side effects remain with the implementing product.
6. Artifact Inspector retains separate chrome, overlay, external-artifact, and boundary results. Its implementation remains `review_required` without trusted interactive attestation. The prototype must not bypass this limit to show a completed loop.

## Verification and completion

Before building, record one representative task, its correct completion condition, essential error or recovery states, and the accessibility paths needed to finish. Use source-backed expected results rather than candidate-authored assertions as the task oracle. Choose requirements that matter to the actual activity.

Completion has two separately reported parts:

1. **Engineering completion:** the active contract passes its supported checks, required evidence is present, and unresolved or unsupported behavior is named.
2. **Observed usefulness:** an intended user completes the representative task correctly and understands the result. Record assistance, errors, and recovery. A screenshot, model preference, or contract verdict cannot stand in for this observation.

The first encounter needs a builder with recent work, the builder's usual agent workflow, and a person able to perform the target activity. Observe setup through repairs. Compare a matched task using the usual approach and record differences between the tasks and order effects. Use the findings as product learning and select a contrasting-task pilot when a product decision needs further evidence.

## Acceptance cases

| Case | Required behavior | Evidence |
| --- | --- | --- |
| Clear real brief. | The agent proceeds with a short premise and builds through the existing sequence without a field-by-field interview. | Source, transcript, reviewed artifacts, and working result. |
| Existing interface improvement. | The agent names the task failure and revises the relevant interaction while preserving unrelated work. | Before/after artifacts and the task outcome. |
| Consequential ambiguity. | The agent states the design fork and asks one material question; no unsupported implementation-ready direction. | Question, response, and changed premise. |
| Mixed or unsupported routing. | The agent explains the unresolved purpose or reconciles supported choices. Conflicting selections fail visibly. | Routing result and grounded choice or explicit unresolved status. |
| Builder correction during iteration. | Changed decisions propagate through affected reviews; stale packets do not establish readiness. | Current raw context, refreshed artifacts, and checks of the affected behavior. |
| Missing governing authority. | The agent stops the affected commitment and requests the relevant authoritative source. Ordinary context cannot grant authority. | Blocked result and source validation. |
| Contract passes but the task fails. | The episode reports the task failure, repairs it or leaves it unresolved, and makes no usefulness claim from acceptance alone. | Actual task attempt, failure, and repair result. |
| Measurement unavailable or unsupported. | The agent names what was checked and leaves missing coverage unverified. | Bounded result and coverage gaps. |
| Artifact Inspector. | Static evidence cannot turn the current proposed interaction into an accepted implementation. | `review_required` and the missing-attestation diagnostic. |

Use the [testing skill](../skills/write-tests/SKILL.md) for changed behavior and contract drift. Existing source, authority, routing, handoff, browser, and adapter tests remain engineering acceptance. Prototype checks should assert the cases above without mirroring packet construction. Human task observation remains a separate acceptance requirement.

## Scope of the first implementation

Improve the canonical portable skill, its client adapters, and a first-use walkthrough around this loop. Reuse the existing runtime, review gates, and evidence capabilities. Do not introduce a stateful orchestration service or specialized verifier before the observed episode establishes the need.

The first-use walkthrough keeps the review mechanism in a native disclosure that opens and closes by click, Enter, and Space. Embedded diagrams must preserve those controls' keyboard behavior; map shortcuts must not consume keys used outside the map. Expanded replay text must wrap within narrow viewports without clipping long code terms.

Prepare a research record with task criteria, builder effort, questions, corrections, review attempts, end-user completion, and verification gaps. Completing the record requires an actual human encounter. Agent rehearsals may identify integration problems but must retain their rehearsal label.
