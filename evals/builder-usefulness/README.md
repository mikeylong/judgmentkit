# Builder usefulness pilot

Use this kit to learn whether JudgmentKit helps a builder and their AI agent reach an interface that someone can use. The kit supplies three synthetic tasks, three comparison conditions, nine planned episodes, and blank observation records. **The human study has not run.** No candidates, observations, model calls, or adoption results are included.

The [product plan](../../docs/product-vision-and-improvement-plan.md) calls for a first encounter with a builder's recent real task before this pilot. Start with [first-encounter.md](first-encounter.md). The supplied tasks are candidates for the later pilot. Confirm that participants understand the activities before locking the brief and source files. Keep unfamiliar-domain effects in the record. These fixtures describe fictional people and organizations.

## Prepare the comparison

1. Recruit three builders who use AI agents, plus people who can attempt the resulting interfaces' target tasks. Record builder experience under pseudonyms. Obtain permission to observe and retain session evidence. Keep personal participant details outside this repository.
2. Choose the same agent, model version, effort setting, implementation stack, and underlying build/test tools for every condition. Record exact versions. Agree on the generation budget, maximum elapsed time, repair policy, and each builder's tolerable overhead before the first episode. `configuration` in [manifest.json](manifest.json) contains unconfigured placeholders. Enter the actual settings before starting.
3. Supply the same brief, source fixture, and starter files for each comparison. Apply the condition instruction below. Keep the facilitator's [task outcomes](task-outcomes.json) away from the generation agent. The outcome list guides observation; all required behavior appears in the brief and sources.
4. Assign participants to the reserved builder slots in `manifest.json`. Each person encounters each task and condition once. Every order position contains all three activities and treatments. The schedule reduces order imbalance but does not remove differences in experience or task difficulty.
5. Create blank records in a fresh local run directory. Record failures and abandonment where they happen. Retain original candidates and repair history as private diagnostic evidence; do not publish failed implementation candidates as accepted examples.

| Condition | Instruction added to the shared brief and sources |
| --- | --- |
| `ordinary_agent` | Use your usual AI-agent process to build or improve this interface. |
| `activity_checklist` | Use the same agent process and the six items in [activity-checklist.md](activity-checklist.md). Do not use JudgmentKit tools or its skill. |
| `full_judgmentkit` | Use the installed JudgmentKit skill to build or improve this interface. Keep the builder's choices visible and handle tool inputs yourself. Record the exact skill, runtime, and contract versions. |

The agent's normal implementation tools remain available in all conditions. JudgmentKit calls and their cost belong to the full-JudgmentKit treatment. Record matched generation work and total work separately, including setup, tool requests, waiting, repairs, and manual corrections. If the runtime is unavailable, retain that episode and the actual workaround. Do not silently change its treatment label.

## Run and observe

1. Start timing before setup. Record each manual correction, question, stop, and review attempt as a timestamped event with its reason. Record observed setup and total elapsed minutes. Capture the generation transcript and candidate revisions under their actual identities. A premature stop, failed build, and abandoned build are study outcomes.
2. Assign neutral artifact labels. Give assessors the task instructions, source data, and interface without the condition label. Record whether treatment became apparent. Assessors should not review their own builds. Distribute assessment order separately and record it; the builder schedule does not counterbalance assessor order.
3. Observe each outcome in `task-outcomes.json`. Record the participant's action, the result, and a reference to a recording, timestamped session note, or interaction log. Observe keyboard completion and error recovery for the essential path. A screenshot or a checkbox labelled “complete” does not establish task completion.
4. Ask builders to bring a subsequent task after the pilot. Leave `repeat_use` empty until a return episode actually happens. Record invitations and stated interest separately from observed return use.

Records bind observations to the episode, task, condition, candidate id, and SHA256. A repair needs a new identity and new outcome observations. A failed attempt that produced no artifact still needs an attempt id, with both artifact reference and hash set to null. Its builder observation binds to that id and null hash; it cannot carry end-user completion evidence. The report rejects mismatched records; it cannot establish whether an observer's account is truthful. Retain the source evidence so a reviewer can inspect it. Keep earlier attempts in the session archive, then record the final build or abandoned attempt in `run.json`.

## Produce a record and report

Run these commands from the repository root. `init` creates a new directory and refuses to overwrite an existing one. Both commands are local and call no provider or browser.

```bash
node evals/builder-usefulness/report.mjs init --dir /private/tmp/jk-builder-pilot-run
node evals/builder-usefulness/report.mjs report --dir /private/tmp/jk-builder-pilot-run
node tests/builder-usefulness.test.mjs
```

Review the generated `run.json`, enter the actual settings, and fill episode records as observation happens. [recording-template.json](recording-template.json) shows the fields to capture. Keep evidence worth preserving in a local project folder; `/private/tmp` is for rehearsing the format. `report` prints JSON to stdout and does not overwrite evidence. Invalid records produce a nonzero exit and specific errors. Missing observations remain missing. The blank kit reports `needs_configuration` and `not_run`.

## Interpret the results

Read builder effort and end-user task results separately. Look at setup minutes, total time, manual corrections, questions, false stops, and substantive review attempts beside the observed failures and completions. Automatic contract checks and model preferences are supporting evidence. They cannot substitute for people attempting the task.

JudgmentKit can **guide** a decision, **check** a declared requirement, or **verify** a supported behavior with a named method and scope. Record those claims in `supporting_evidence`, with their source and limitations. A model preference is guidance evidence. A deterministic contract check covers its declared requirement. A browser measurement covers only the behavior and states it measured. Understanding and task completion require observation of a person using the interface.

The report deliberately emits no overall product pass or winner. Nine heterogeneous episodes help select the next product change; they do not establish broad superiority. Before running, agree on what task benefit would justify each builder's overhead. Afterwards, inspect failures as well as successful artifacts. Consider simplifying the workflow if the checklist produces comparable outcomes with less effort. Consider a narrower offer if the benefit occurs in only one activity. Preserve an unresolved decision when human evidence or a comparison is missing.
