# Daily Agent Workflows

JudgmentKit should run before an agent turns a brief into UI, critiques an interface, or accepts model-proposed interaction logic.

The daily path is MCP-first. Use the CLI when scripting, debugging, or checking a fixture from the terminal.

## Installing For Codex, Claude Code, Or Cursor

Use the hosted installer after deployment:

```bash
curl -fsSL https://judgmentkit.ai/install | bash
curl -fsSL https://judgmentkit.ai/install | bash -s -- --client claude
curl -fsSL https://judgmentkit.ai/install | bash -s -- --client cursor
```

From a local checkout, use:

```bash
npm run install:mcp -- --client codex
npm run install:mcp -- --client claude
npm run install:mcp -- --client cursor
```

Codex is the default when no `--client` is supplied. The installer registers the hosted Streamable HTTP endpoint as `judgmentkit` and verifies that tools/list returns the current JudgmentKit review and handoff tools. Local stdio remains a repo-local dev check through `npm run mcp:smoke`.

## Local Site And MCP Preview

Use the repo-native local server when reviewing the website from a checkout:

```bash
npm run site:dev -- --host 127.0.0.1 --port 4173
```

This rebuilds `site/dist`, serves the static website, and routes localhost `/mcp` through the same Streamable HTTP handler used by the hosted endpoint. Do not use `python3 -m http.server` for MCP route review; it cannot emulate the `/mcp` server route.

## MCP Planning Cards

MCP tool responses include two surfaces:

- `structuredContent` is the stable machine-readable contract for agents and integrations.
- `content[0].text` is a concise Markdown planning card for Codex-style planning chat.

Use the planning card to explain the current status, next step, blocking questions, and compact diagnostics to the human collaborator. Use `structuredContent` for implementation decisions, data extraction, and follow-up MCP calls.

In planning mode, show the card-level takeaway, ask only the listed blocking questions when source context is missing, and keep raw guardrails or diagnostic terms out of product UI language.

## Planning Mode Examples

Use these examples to review whether an agent is using JudgmentKit well. A good planning response should make the activity, decision, outcome, and disclosure boundary clearer before it proposes UI structure.

### Ready Brief

Human prompt:

```text
Plan a UI for a support lead reviewing refund requests during daily triage. They decide whether each case is approved, sent to policy review, or returned for missing evidence. The outcome is a clear handoff with the next action and reason.
```

Good agent behavior:

- Proceeds to concept planning because the activity, participant, decision, and outcome are clear.
- Names the activity as refund triage or refund request review, not as a generic dashboard.
- Keeps the plan centered on evidence review, decision options, and handoff.

Reviewer should accept:

- A plan that makes approval, policy review, return for evidence, and handoff reasons easy to compare and complete.

Reviewer should reject:

- A plan that starts with charts, widgets, or visual polish before naming the refund review work.

### Vague Brief

Human prompt:

```text
Plan a dashboard for the system.
```

Good agent behavior:

- Pauses instead of inventing a dashboard.
- Asks targeted questions about the activity, primary decision or next action, and outcome.
- Keeps the question count small.

Reviewer should accept:

- A response that asks what work the dashboard supports, what decision it should make easier, and what the user should leave knowing or having done.

Reviewer should reject:

- A full dashboard plan with metrics, cards, charts, and navigation invented from no source context.

### Implementation-Heavy Brief

Human prompt:

```text
Plan an admin UI from our JSON schema, database tables, tool call traces, prompt template, and API endpoints.
```

Good agent behavior:

- Treats schemas, tables, traces, prompts, and endpoints as diagnostic details unless the task is explicitly setup, debugging, auditing, or integration work.
- Translates toward the user's activity before proposing a primary surface.
- Asks what decision, workflow, or handoff those technical details are meant to support.

Reviewer should accept:

- A response that moves implementation terms into diagnostics and asks for the domain activity or decision behind the admin surface.

Reviewer should reject:

- A plan that exposes tables, schemas, prompt templates, tool calls, or API endpoints as the main product UI.

## Before Generating UI

Call `create_activity_model_review` with the source brief.

Use the returned packet this way:

- If `review_status` is `ready_for_review`, use `candidate.activity_model`, `candidate.interaction_contract`, and `candidate.disclosure_policy` as the working activity model.
- If `review_status` is `needs_source_context`, ask only the questions in `review.targeted_questions` unless repo or product context can answer them.
- Keep `guardrails` available for debugging, but do not turn guardrail terms into primary UI language.

CLI equivalent:

```bash
judgmentkit review --input examples/refund-triage.brief.txt
```

From an unlinked checkout, use:

```bash
node bin/judgmentkit.mjs review --input examples/refund-triage.brief.txt
```

## Before Accepting A Model Activity Candidate

Call `review_activity_model_candidate` with the original brief and the proposed candidate.

Use this when another model or agent has already drafted an activity model. JudgmentKit does not treat that candidate as source of truth. The original brief still has to contain enough evidence.

CLI equivalent:

```bash
judgmentkit review-candidate \
  --input examples/refund-triage.brief.txt \
  --candidate examples/refund-triage.candidate.json
```

From an unlinked checkout, use `node bin/judgmentkit.mjs` with the same arguments.

## Before Choosing Optional Workflow Guidance

Call `recommend_ui_workflow_profiles` when the brief sounds like a specialized review activity and you need to know whether an optional profile should guide the UI workflow candidate.

Use `operator-review-ui` when most of these are true:

- a human reviews AI- or system-produced work before it advances
- multiple items, agents, workstreams, candidates, or findings compete for attention
- the user compares evidence, understands risk, and makes a bounded decision
- the next step may be approved, blocked, deferred, tightened, returned, or handed off
- completion requires a handoff, receipt, audit, or closure state
- raw system mechanics exist but should not drive the primary UI

Do not use it for simple forms, passive dashboards with no decision, reading-only pages or reports, open-ended chat, fully automated workflows with no human review, or debugging tools where raw system mechanics are the primary task.

The recommendation only classifies the brief. It does not apply a profile automatically. If `operator-review-ui` appears in `recommended_profile_ids`, pass `profile_id: "operator-review-ui"` to `review_ui_workflow_candidate` or the library equivalent when reviewing the workflow candidate.

## Before Accepting A Model UI Workflow

Call `review_ui_workflow_candidate` with the original brief and the proposed workflow candidate.

Use this after activity review and before turning a model-proposed workflow into UI implementation. The candidate should name workflow steps, primary actions, decision points, completion or handoff, primary UI sections, controls, user-facing terms, and diagnostics.

JudgmentKit accepts the workflow only when:

- the source activity review is `ready_for_review`
- workflow steps, actions, decision support, and completion or handoff are present
- implementation terms stay out of workflow, `primary_ui`, and handoff
- review-packet terms such as `ready_for_review`, `activity_model`, `review_status`, `Primary user`, and `Main decision` stay out of the product UI

When `profile_id: "operator-review-ui"` is selected, JudgmentKit adds guidance that checks the workflow against operator-review expectations: activity-first structure, queue/detail density boundaries, evidence-adjacent actions, contextual help disclosure, readable label/value evidence, and restrained operational states. Guardrail ids remain guidance metadata; do not copy them into product UI text.

There is no CLI command for this slice. Use MCP or the library API.

## Before Generating UI From A Workflow

Call `create_ui_generation_handoff` with the ready workflow review packet.

Use the returned handoff as the immediate input to UI generation. It contains the activity model, interaction contract, workflow, primary surface responsibilities, handoff action, and disclosure reminders in one compact artifact.

If the tool returns `handoff_blocked`, do not generate UI. Resolve the returned targeted questions or leakage details first, then review a corrected workflow candidate.

Library equivalent:

```js
const workflowReview = reviewUiWorkflowCandidate(brief, workflowCandidate);
const handoff = createUiGenerationHandoff(workflowReview);
```

There is no CLI command for this gate. Use MCP or the library API.

## Optional OpenAI Workflow Provider

Use `createOpenAIResponsesUiWorkflowProposer` from `judgmentkit/providers/openai-responses` when a model should propose the UI workflow candidate. Pass that proposer to `createModelAssistedUiWorkflowReview`; do not use the provider output directly for UI generation.

The provider requires `OPENAI_API_KEY` and `JUDGMENTKIT_OPENAI_MODEL`, or explicit `apiKey` and `model` options. It has no default model and does not add CLI or MCP behavior.

Env-gated smoke check:

```bash
JUDGMENTKIT_OPENAI_SMOKE=1 \
OPENAI_API_KEY=... \
JUDGMENTKIT_OPENAI_MODEL=... \
npm run smoke:openai-ui-workflow
```

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

Run this after a production deploy to verify the public site, hosted `/mcp` Streamable HTTP endpoint, legacy redirects, hosted installer, and hosted MCP tool catalog:

```bash
npm run release:verify
```
