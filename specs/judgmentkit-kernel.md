# JudgmentKit Kernel Spec

## Activity

Guiding and reviewing AI-generated interface work so the result supports the user's activity instead of exposing data structures, prompts, tool calls, or implementation machinery.

## Participants

- product designer
- product manager
- frontend engineer
- domain expert
- AI agent
- reviewer or approver

## Objective

Help an agent generate or critique UI that is relevant, succinct, and appropriate to the activity being supported.

## Outcomes

- The agent understands the activity before proposing UI.
- The UI concept uses domain language instead of implementation language.
- The interaction supports the user's decisions and next actions.
- Implementation details stay hidden unless they help setup, debugging, auditing, or explicit inspection.
- Visual styling can be applied later without changing the conceptual model.

## Non-Goals

- Do not make JudgmentKit a design-system enforcement project.
- Do not make JudgmentKit a cleaner-output aesthetic wrapper.
- Do not make JudgmentKit a prompt catalog or schema browser.
- Do not copy JudgmentKit v1 source, docs, contracts, or examples into this kernel.
- Do not let the optional React component adapter replace activity, interaction, disclosure, implementation, browser, or accessibility gates.

## Contract Stack

The first three contracts travel together as an **activity case**: a reviewable working premise with claim provenance, visible assumptions, unresolved material ambiguities, and an explicit readiness decision.

1. Activity Model
2. Interaction Contract
3. Disclosure Policy
4. Activity Case Evidence And Readiness
5. Judgment Example
6. Optional visual-system adapter

An activity case is not an intake form and completeness is not the same as certainty. The host model should infer low-risk, reversible gaps from the brief and available context, label those inferences, and let the designer correct the proposed direction. JudgmentKit should ask only when an ambiguity would materially change the interaction, and it should stop only when authority, safety, sensitive disclosure, or another irreversible boundary requires an authoritative source. An `authoritative_source` context item must actually govern that boundary and include a stable `source_ref`; it is not a confidence label for ordinary evidence.

Readiness has two distinct meanings:

- **Exploration readiness** answers whether the case can guide a first concept with visible assumptions.
- **Commitment authority** remains ungranted; an activity case never authorizes policy, approval, release, safety, or irreversible external action.

## Portable Runtime Boundary

- The contracts define portable judgment and evidence semantics.
- The MCP tools provide deterministic analysis and validation. They do not own a stateful interview session.
- The portable agent skill owns inference, pacing, presentation, and correction. Proceed, quick framing, and guided interview change pacing, not the model's ability to infer.
- Codex, Claude, and future client packages are thin adapters around the same canonical skill and MCP contract.
- When a retained claim relies on non-brief evidence, clients pass the exact attributed `context_items` through activity review, workflow review, handoff, frontend generation context, and frontend implementation skill-context creation. Integrity receipts establish continuity only; they are not authority credentials or substitutes for the raw source.

The `judgmentkit/react` pilot sits downstream of this stack under the active design-system source. It is optional presentation infrastructure, not a kernel layer, product-state owner, or fallback for an external design system.

## First Acceptance Test

Given either a short prompt or implementation-heavy input, JudgmentKit should propose a reviewable activity case that names the activity, the user's decisions, the domain vocabulary, and the disclosure boundaries before it suggests screen structure or visual treatment. It should proceed with visible reversible assumptions, ask at most one consequential question, and fail closed on authoritative boundaries.
