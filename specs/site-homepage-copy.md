# Public website copy provenance

The homepage describes JudgmentKit’s interface guidance and contract checks. The [website family copy contract](website-family-copy.md) governs public copy and metadata alongside [the layout contract](website-family-layout.md). The shared composition reference is https://www.surfaces.systems/, reviewed on October 16, 2026 at 1280 × 720 and 390 × 844. Main content must stay at or below 220 words; there is no minimum.

Mike requested the masthead wording below be restored from `site/build-site.mjs` at `231a50acc3aa39a1d72df009f24cbca8bbc2cd93`, lines 5902–5905. The restored masthead is an intentional masthead-only exception to the newer copy guidance. The current lens artwork, family layout, page and social titles, metadata, footer and remaining copy are preserved.

| Homepage text | First-party source | Claim scope |
| --- | --- | --- |
| The judgment layer for AI-generated UI | Prior masthead at `231a50acc3aa39a1d72df009f24cbca8bbc2cd93:site/build-site.mjs:5902`; owner-requested restoration | Restored positioning copy. |
| Stop AI from building the wrong interface. | Prior masthead at `231a50acc3aa39a1d72df009f24cbca8bbc2cd93:site/build-site.mjs:5903`; owner-requested restoration | Restored headline; no new outcome measurements are asserted. |
| A design system tells an agent how interface elements should look and behave. JudgmentKit tells it which interface the user’s work requires, what should stay hidden, and what must be repaired. | Prior masthead at `231a50acc3aa39a1d72df009f24cbca8bbc2cd93:site/build-site.mjs:5904`; owner-requested restoration | Restored lead describing the intended interaction and disclosure role. |
| Use JudgmentKit’s design system—or bring your own. | Prior masthead at `231a50acc3aa39a1d72df009f24cbca8bbc2cd93:site/build-site.mjs:5905`; owner-requested restoration | Restored emphasized support line, rendered as `<p><strong>…</strong></p>`. |
| Guide interface design with your AI agent. | docs/product-claims-and-evidence.md:17–19; VISION.md:31 | Preserved footer copy; guidance and checks, with the caller’s agent retaining execution. |
| JudgmentKit gives your AI agent interaction guidance, implementation checks, and repair instructions. | docs/product-claims-and-evidence.md:17–19; src/index.mjs:23229–23257 | Preserved homepage metadata describing returned guidance and review results. |
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

The hero retains one eyebrow, one heading, one lead, one emphasized support line and exactly two actions. The lower page retains one three-item problem row and one five-step workflow. Historical reports, captured examples, reference specimens, artwork and CSS remain unchanged. The adversarial audit and corrections are recorded in the task’s `copy-adversarial/judgmentkit-audit.md`.
