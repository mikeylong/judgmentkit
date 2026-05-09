# JudgmentKit 2 Kernel Spec

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

- Do not make v2 a design-system enforcement project.
- Do not make v2 a cleaner-output aesthetic wrapper.
- Do not make v2 a prompt catalog or schema browser.
- Do not copy JudgmentKit v1 source, docs, contracts, or examples into this kernel.

## Contract Stack

1. Activity Model
2. Interaction Contract
3. Disclosure Policy
4. Judgment Example
5. Optional visual-system adapter

## First Acceptance Test

Given implementation-heavy input, JudgmentKit 2 should produce guidance that names the activity, the user's decisions, the domain vocabulary, and the disclosure boundaries before it suggests any screen structure or visual treatment.
