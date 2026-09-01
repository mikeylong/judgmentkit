# Activity Case Architecture

JudgmentKit turns a brief into a **reviewable activity case**, then carries that case through surface selection, workflow review, generation handoff, and implementation review.

The activity case is the smallest durable unit of judgment. It contains:

- the activity model, interaction contract, and disclosure policy
- claims with provenance
- visible assumptions
- unresolved material ambiguities
- exploration readiness: `proceed`, `ask`, or `stop`

Context remains attributed as a user answer, workspace evidence, provided artifact, or authoritative source. An `authoritative_source` must name its `source_ref` and actually govern the protected boundary; the kind is not a confidence label an agent may assign to ordinary context.

## Default Experience

The default interaction is **propose, show, then refine**.

1. Use the short prompt and any already-available context.
2. Run the deterministic activity review as a baseline.
3. Let the host model infer a complete best-current case.
4. Review the inferred case with JudgmentKit.
5. Show the working premise and a first direction.
6. Ask at most one question, and only when its answer would materially change the direction.
7. Preserve the reviewed case through every downstream tool call.

The user may always say “use your best judgment.” A visible reversible assumption is preferable to an intake checklist.

The reviewed activity case, UI handoff, and frontend context use versioned content-addressed integrity receipts. The receipts are deterministic across processes and cold starts, so stateless MCP clients can carry packets forward without a server-side interview session. When retained, they detect accidental stale or transport-mutated packets; because anyone can recompute them, they do not authenticate packet origin or the authority of an external source and are never treated as action-authorization credentials.

## Pacing Modes

- **Proceed from brief** uses available context and interrupts only for a protected boundary or a genuinely consequential, costly-to-reverse fork.
- **Quick framing** surfaces the working premise and, when needed, one consequential question.
- **Guided interview** works through material uncertainties one at a time and presents the resulting case for correction.

These modes change pacing and disclosure. They do not disable model inference or create separate contract semantics.

## Responsibility Boundary

### Contract kernel

Defines claim provenance, materiality, reversibility, ambiguity, readiness, disclosure, and downstream acceptance rules.

### MCP

Provides stateless deterministic analysis and validation. It accepts attributed context and reviewed activity packets, but it does not manage an interview session or conversational memory.

### Portable skill

Orchestrates host-model inference, chooses pacing, presents the working premise in ordinary language, asks the one material question when necessary, and supports correction.

### Client adapters

Codex and Claude packages expose the same canonical skill and MCP endpoint using only the metadata and manifest format each client requires. Client-specific capability should not fork the product behavior.

The same reviewed activity case continues through workflow review, UI generation handoff, frontend generation context, and portable frontend implementation skill context. Its activity model, interaction contract, disclosure policy, evidence, assumptions, ambiguities, and readiness remain bound together by the propagation receipts. A downstream workflow may narrow an action, but it may not promote recommendation, review, or routing authority into approval, authorization, commitment, release, or a protected safety action.

The exact current `brief` and attributed `context_items` are resupplied at workflow review, handoff, frontend-context creation, and frontend implementation skill-context creation so the kernel can independently revalidate protected risk and workflow authority from raw source. The portable receipt proves only that a retained packet is unchanged; it never substitutes for that source.

Participant action authority may come only from direct affirmative language in the current brief or an exact, relevant, affirmative `user_answer` or `authoritative_source` resupplied at the validating boundary. Recommendation and negated language cannot grant authority, and workspace evidence or a provided artifact is never promoted into an action credential. Safety, legal, clinical, regulatory, compliance, sensitive-disclosure, and irreversible boundaries require the relevant governing `authoritative_source` and its `source_ref`.

## Readiness Boundary

`proceed` authorizes concept exploration with visible assumptions. `ask` permits a provisional first direction with the material ambiguity visible, then asks one consequential question before that direction is treated as implementation-ready. `stop` requires an authoritative source.

None of these states authorizes approval policy, safety rules, sensitive disclosure, release, or irreversible external action. Those remain explicit human or authoritative-source boundaries.

Implementation vocabulary remains hidden from ordinary product UI. When setup, debugging, auditing, or integration machinery is itself the user activity, relevant server, endpoint, schema, trace, or connection terms remain available as domain vocabulary rather than being stripped as leakage.
