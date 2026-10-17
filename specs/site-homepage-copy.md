# Public website copy provenance

The homepage describes JudgmentKit’s interface guidance and contract checks. The [website family copy contract](website-family-copy.md) governs public copy and metadata alongside [the layout contract](website-family-layout.md). The shared composition reference is https://www.surfaces.systems/, reviewed on October 16, 2026 at 1280 × 720 and 390 × 844. Main content must stay at or below 220 words; there is no minimum.

| Homepage text | First-party source | Claim scope |
| --- | --- | --- |
| Judgment before components. | README.md:16–24 | Activity and interaction choices precede component choices. |
| Guide interface design with your AI agent. | docs/product-claims-and-evidence.md:17–19; VISION.md:31 | Guidance and checks, with the caller’s agent retaining execution. Also used in the footer. |
| JudgmentKit gives your AI agent interaction guidance, implementation checks, and repair instructions. | docs/product-claims-and-evidence.md:17–19; src/index.mjs:23229–23257 | Describes returned guidance and review results. Also used in homepage metadata. |
| See a screen repaired; Explore examples | /value/; /examples/ | Selected curated repair artifacts and illustrative examples, not live generation. |
| Risks to check; Keep the interface in the language of the work. | docs/agent-usage-contract.md:42; README.md:11–13 | A review instruction, not a claim that every table, form or button is wrong. |
| Internal record labels; The user has to translate database terms into their own work. | docs/agent-usage-contract.md:42; tests/ui-generation-handoff.test.mjs:4525–4541 | Names the mismatch when source vocabulary obscures the intended activity. |
| Irrelevant form fields; The form asks for details the person’s task does not require. | README.md:11–13; DESIGN.md:7–10 | Names unnecessary fields, rather than condemning forms. |
| Tool names as actions; The control names an implementation command instead of the user’s action. | docs/agent-usage-contract.md:42 | Names a vocabulary mismatch. Setup and diagnostic activities may need technical terms. |
| From activity to interface; Build, check, and revise. | VISION.md:21–25; docs/builder-workflow.md:75–79 | Gives the intended sequence without a time or effort estimate. |
| Describe the work; Show what someone needs to do. | VISION.md:21 | Shortens step 1. |
| Correct the premise; Correct the agent’s task assumptions. | VISION.md:22 | Shortens step 2. |
| Build the interface; Your agent creates or revises the interface. | VISION.md:11,23 | Retains both starting conditions. The agent performs implementation. |
| Try important tasks; Repair specific failures. | VISION.md:24; docs/builder-workflow.md:75–79 | Instructions for the caller’s agent, subject to available checks. |
| Review the result; See what was checked and what remains unresolved. | docs/builder-workflow.md:98–111 | Requires an account of observed checks and unresolved work, not guaranteed completion. |
| The builder owns the product decisions. | VISION.md:17 | Names the division of responsibility. |

## Detailed public pages

The Value page labels selected curated refund artifacts and declared contract checks. The page does not generalize those artifacts into prevention before shipping. Accessibility review requires the declared evidence; it does not establish general accessibility compliance. The agent owns repairs, resubmission and attempt tracking. Required verification can remain unresolved. These limits follow [the claim map](../docs/product-claims-and-evidence.md), `src/index.mjs:18343–18465,22865–22893,23229–23257` and the implementation review tests.

Docs uses “First use” without a measured time estimate. Its Quickstart states that hosted requests leave the machine and points to the existing [authorization and privacy guidance](../packages/agent-skill/judgmentkit-hosted-mcp/SKILL.md#authorization-and-privacy) for sanitized, local or self-hosted inputs. The remaining instructions distinguish contract acceptance from observed user task completion. Artifact Inspector remains proposed and `review_required` where trusted interactive attestation is unavailable.

The hero retains one eyebrow, one heading, one supporting sentence and exactly two actions. The lower page retains one three-item problem row and one five-step workflow. Historical reports, captured examples, reference specimens, artwork and CSS remain unchanged. The adversarial audit and corrections are recorded in the task’s `copy-adversarial/judgmentkit-audit.md`.
