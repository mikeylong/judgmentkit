# First builder encounter

Mike selected CLEAR reviewer as the first interface for JudgmentKit's builder workflow. The task was to select a finding, inspect its proposed correction, preview it, then cancel with the saved artifact unchanged.

The encounter exposed two JudgmentKit failures. Background Apply requirements expanded a preview-only task into an execution task, and secondary discussion features competed with artifact inspection. The [task-scope spec](../specs/builder-task-scope-reliability.md) and [routing tests](../tests/artifact-inspector-routing.test.mjs) cover the resulting repairs.

## Results and limits

1. A direct local kernel rehearsal retained nine attributed source excerpts through activity review, surface routing, workflow, implementation contract, handoff, frontend context, and portable skill context. It reached frontend guidance. This was agent-authored task framing on an existing interface, with no fresh build or hosted MCP run.
2. An automated browser task passed 48 assertions across two desktop widths and light and dark appearance. It selected the finding, inspected the proposal, previewed, cancelled, and reloaded with committed version and history unchanged. This check did not produce trusted interactive attestation for JudgmentKit.
3. Mike answered “yes” when asked whether he understood the change and returned without applying it. This was a self-report. Timing, assistance, a matched builder comparison, and return use were not measured.

The original local source excerpts, browser records, and rehearsal outputs remain private. This summary does not include those files. The [synthetic Inspector rehearsal](../scripts/rehearse-inspector-builder-workflow.mjs) provides a portable source-continuity regression case; it records no human encounter or usefulness result.

Artifact Inspector remains `review_required` without trusted interactive attestation. The encounter supplies product learning and a successful task self-report. It does not establish full implementation acceptance or comparative builder benefit. The [nine-episode pilot kit](../evals/builder-usefulness/README.md) remains `not_run`.
