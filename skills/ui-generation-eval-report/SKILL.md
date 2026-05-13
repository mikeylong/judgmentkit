---
name: ui-generation-eval-report
description: Refresh and QA JudgmentKit UI-generation eval reports, including deterministic report generation, local HTML review, and optional JudgmentKit MCP review when eval cases or evidence change.
---

# UI Generation Eval Report

Use this project skill when refreshing the deterministic UI-generation eval report or changing the eval cases that feed it.

## Ground Rules

- Run the existing eval harness; do not create another report generator.
- Do not regenerate comparison demos unless the user explicitly asks.
- Treat each immutable `evals/reports/<date>/mcp-<version>/run-NNN/ui-generation-report.json` file as the structured source of truth.
- Treat each colocated `ui-generation-report.html` file as the human review artifact.
- Treat colocated `screenshots/` PNGs as visual evidence only; they do not affect scoring.
- Treat `evals/reports/index.json` and `evals/reports/index.html` as catalogs; they may update when new runs are added.
- Keep production release checks out of routine refreshes unless the user asks to publish or deploy.

## Refresh Workflow

1. Generate the reports:

   ```bash
   npm run eval:ui
   ```

2. Run deterministic QA:

   ```bash
   node tests/ui-generation-evals.test.mjs
   npm run site:build
   ```

3. Run local browser QA against the built site:

   ```bash
   npm run site:dev -- --host 127.0.0.1 --port 4173
   ```

   Open `http://127.0.0.1:4173/evals/`, then open the latest archived report and confirm the pages show:

   - the `JudgmentKit UI Eval Runs` index
   - the latest run link
   - the `JudgmentKit UI-Generation Eval` report heading
   - the benchmark disclaimer
   - the claim level
   - run date, MCP release, and run id
   - each case title and pass/fail status
   - score delta and threshold
   - visual evidence screenshots for baseline and guided variants
   - screenshot links that open PNG files from the run archive
   - per-variant score tables
   - activity-fit evidence
   - implementation leakage findings and counts
   - links to the compared HTML artifacts and JSON report
   - no horizontal overflow at desktop or mobile widths

4. Stop the local server when QA is complete.

## MCP-Aware Case Changes

For simple report refreshes, use the static artifacts and local commands only.

When adding or changing eval cases, rubrics, expected outcomes, or UI-generation evidence, use JudgmentKit MCP when available:

- Call `create_activity_model_review` on the source brief or task prompt.
- Call `review_ui_workflow_candidate` before trusting a proposed workflow or activity-fit rationale.
- Call `create_ui_generation_handoff` before treating a reviewed workflow as ready generation evidence.

If JudgmentKit MCP tools are unavailable, continue the deterministic eval workflow and state that MCP review was skipped.

## Handoff

Report the generated archive path, screenshot archive path, catalog paths, commands run, local browser QA result, whether JudgmentKit MCP was used or skipped, and any remaining risk or open question.
