# One-Shot Before/After Demo

This demo shows the same implementation-heavy brief handled two ways:

- a scripted baseline one-shot generation without JudgmentKit2
- a scripted JudgmentKit2-guided generation using the review packet

It is deterministic. It does not call a model, use provider configuration, or claim that the fixture text came from an LLM.

The primary artifact is a static HTML visual demo. The Markdown transcript is still printed for terminal review.

## Run It

```bash
npm run demo:one-shot
```

The command prints a Markdown transcript and writes:

```text
examples/demo/one-shot-demo.html
```

Open that HTML file in a browser to inspect the visual before/after.

The script reads this source brief:

```text
examples/demo/refund-ops-implementation-heavy.brief.txt
```

## What To Compare

Look for the order of operations.

Without JudgmentKit2, the concept starts from the implementation request: data model, database fields, JSON schema, prompt template, tool call result, resource id, API endpoint, and CRUD.

With JudgmentKit2, the concept starts from the work:

- selected refund escalation case
- customer and refund context
- evidence checklist
- policy review context
- decision buttons
- handoff reason and next owner

The JudgmentKit2 branch still uses the review packet, but the product UI does not render the packet as interface copy. The demo renderer translates the packet into a familiar refund triage workflow. Review status, source grounding, and implementation terms stay in the collapsed demo diagnostics area.

In the visual demo, implementation terms are allowed in the baseline UI and in the JudgmentKit2 diagnostic area. They should not appear in the JudgmentKit2 primary work surface. Review-packet vocabulary such as activity, primary user, outcome, and review status should also stay out of the primary product UI.

## What The Demo Is For

Use this to explain why JudgmentKit2 sits before UI generation. The point is not final UI quality. The point is that the agent starts from a better model of the activity before it names screens, controls, or data structures.

The demo is still deterministic. It uses a curated workflow fixture to show what a better order of operations should produce.

That curated renderer is today's stand-in for the next model-assisted workflow layer. In daily agent use, a model or external agent can propose the workflow candidate, then JudgmentKit2 reviews that candidate before it is accepted. The guardrail stays the same: JudgmentKit2 reviews and constrains the candidate instead of trusting model output as source truth.

## What It Is Not

- Not a live model benchmark.
- Not a component or design-system demo.
- Not a provider integration test.
