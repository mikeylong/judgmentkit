# Daily Agent Workflows

JudgmentKit2 should run before an agent turns a brief into UI, critiques an interface, or accepts model-proposed interaction logic.

The daily path is MCP-first. Use the CLI when scripting, debugging, or checking a fixture from the terminal.

## Before Generating UI

Call `create_activity_model_review` with the source brief.

Use the returned packet this way:

- If `review_status` is `ready_for_review`, use `candidate.activity_model`, `candidate.interaction_contract`, and `candidate.disclosure_policy` as the working activity model.
- If `review_status` is `needs_source_context`, ask only the questions in `review.targeted_questions` unless repo or product context can answer them.
- Keep `guardrails` available for debugging, but do not turn guardrail terms into primary UI language.

CLI equivalent:

```bash
judgmentkit2 review --input examples/refund-triage.brief.txt
```

From an unlinked checkout, use:

```bash
node bin/judgmentkit2.mjs review --input examples/refund-triage.brief.txt
```

## Before Accepting A Model Activity Candidate

Call `review_activity_model_candidate` with the original brief and the proposed candidate.

Use this when another model or agent has already drafted an activity model. JudgmentKit2 does not treat that candidate as source of truth. The original brief still has to contain enough evidence.

CLI equivalent:

```bash
judgmentkit2 review-candidate \
  --input examples/refund-triage.brief.txt \
  --candidate examples/refund-triage.candidate.json
```

From an unlinked checkout, use `node bin/judgmentkit2.mjs` with the same arguments.

## Before Accepting A Model UI Workflow

Call `review_ui_workflow_candidate` with the original brief and the proposed workflow candidate.

Use this after activity review and before turning a model-proposed workflow into UI implementation. The candidate should name workflow steps, primary actions, decision points, completion or handoff, primary UI sections, controls, user-facing terms, and diagnostics.

JudgmentKit2 accepts the workflow only when:

- the source activity review is `ready_for_review`
- workflow steps, actions, decision support, and completion or handoff are present
- implementation terms stay out of workflow, `primary_ui`, and handoff
- review-packet terms such as `ready_for_review`, `activity_model`, `review_status`, `Primary user`, and `Main decision` stay out of the product UI

There is no CLI command for this slice. Use MCP or the library API.

## When The Brief Is Vague

Do not ask a broad discovery interview first. Start from the packet.

If the packet says `needs_source_context`, ask the smallest useful set of questions from `review.targeted_questions`. Keep the question count tight. The goal is to unlock activity, participants, decision, outcome, or disclosure boundary.

Useful next action:

```text
JudgmentKit needs a little more source context before UI work. The blocking questions are:
...
```

## When Implementation Terms Appear

Implementation terms such as `JSON schema`, `prompt template`, `tool call`, `resource id`, and `API endpoint` belong in diagnostics unless the user is doing setup, debugging, auditing, integration, or explicit source inspection.

Primary UI work should use domain language:

- Use `refund request`, not `database table`.
- Use `handoff reason`, not `tool call result`.
- Use `policy review`, not `prompt template`.

The terms may remain in:

- `candidate.disclosure_policy`
- `candidate.diagnostics`
- `review.evidence`
- `guardrails`

They should not leak into activity-model primary fields or UI workflow primary fields.

## Quick Checks

Run this before relying on the MCP server in a fresh setup:

```bash
npm run mcp:smoke
```

Run the full local validation before committing behavior changes:

```bash
npm test
npm run benchmark
```
