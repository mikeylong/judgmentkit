# Build or improve an interface with JudgmentKit

JudgmentKit helps a builder and an AI agent turn an intent into an interface that supports the intended work. The builder describes the work and corrects consequential product choices. The agent handles JudgmentKit's review packets, implementation, checks, and focused repairs.

The complete path is: describe or show the work, inspect a short working premise, build or revise the interface, check the important task, and repair failures. A build finishes with a working interface, a clear reason for its structure, and an account of what was checked. Planning and critique requests finish at their requested scope.

This workflow is a local prototype of the [product vision and improvement plan](product-vision-and-improvement-plan.md). The [portable skill](../packages/agent-skill/judgmentkit-hosted-mcp/SKILL.md) carries the agent instructions. The prototype uses the existing runtime; improved builder effort and end-user task completion remain hypotheses to test in observed encounters.

## Start with ordinary language

Use JudgmentKit only when the builder explicitly requests it or the current project instructions opt in. A new interface and an improvement to an existing interface enter the same workflow. The examples below are illustrative prompts, not generated or verified results.

To create an interface:

```text
Use JudgmentKit to build a room-booking request form for a community center.
Visitors choose a room, date, and group size, then review their request before
sending. Use synthetic data. Sending records the request locally for this
prototype; it does not book a real room.
```

To improve an existing interface:

```text
Use JudgmentKit to improve this reading-list editor. I rearrange books and mark
books finished. Preserve my saved lists. Make reordering and undo easy to use.
```

To create a read-only information interface:

```text
Use JudgmentKit to build a library opening-hours page from the supplied schedule.
Visitors choose a branch and date to see the opening hours. Keep the page read-only.
```

The agent reads the brief, source artifacts, code, and project instructions before asking for information. Existing behavior does not grant permission for protected actions. Confidential briefs, source code, customer data, and unreleased designs use a local or self-hosted JudgmentKit path. See the portable skill's authorization and privacy rules.

## Make the premise visible and correctable

The agent infers and reviews the activity, then shows a short premise and the design choices that matter. For the room-request example, an illustrative premise is:

> Visitors submit a room request after checking the room, date, and group size. I’ll keep those choices together, show a review before sending, and make the local request confirmation clear.

The agent derives a representative task and observable result from the brief. For that example: enter a valid request, check the review, submit once, and confirm that the local record matches the reviewed details. Invalid input should keep the visitor's entries and explain what needs correction. Additional requirements must come from the source or be identified as reversible assumptions.

The builder can correct the premise during any iteration, for example: “People usually know the date first. Start there.” The agent records the correction as an attributed `user_answer`, revises the complete activity case, and regenerates the affected workflow and handoff. A changed premise invalidates downstream packets derived from the old case. The agent resupplies the exact current brief and attributed raw context at every validating boundary.

A reversible assumption does not require an interview. An unresolved choice that materially changes the interaction can require one targeted question. Authority, safety, sensitive disclosure, and irreversible effects retain their source requirements. A content receipt proves continuity; the receipt cannot grant permission to approve, publish, execute, prescribe, or perform another protected action.

## Let the agent manage the review sequence

The builder should not have to assemble evidence packets or choose tool names. The existing sequence remains the authority:

| Agent responsibility | Existing boundary | Builder sees |
| --- | --- | --- |
| Infer and review the work | `create_activity_model_review`, then `review_activity_model_candidate` | Working premise, consequential assumptions, and one question if needed |
| Ground the interface structure | `recommend_surface_types`, then `review_ui_workflow_candidate`; Cognitive Dimensions review when relevant | Why the proposed structure supports the task |
| Bind implementation and prepare generation | `create_ui_implementation_contract`, `create_ui_generation_handoff`, `create_frontend_generation_context`, and portable skill context when needed | The first direction and the working result as the requested scope permits |
| Review implementation evidence | `review_ui_implementation_candidate` against the active contract | The failing task, required repair, or accepted result with verification limits |

The detailed calls, accepted fields, and packet requirements live in [daily agent workflows](daily-agent-workflows.md) and the portable [UI handoff and acceptance reference](../packages/agent-skill/judgmentkit-hosted-mcp/references/ui-handoff-and-acceptance.md). Use `structuredContent` for follow-up calls. Keep tool names and internal packet vocabulary out of the generated product UI and ordinary builder updates.

Surface patterns guide activity purpose. If no pattern has positive evidence, resolve the activity before frontend guidance. If purposes combine, explain the primary completion state and supporting work instead of silently choosing a familiar layout. Reconcile conflicting selections; do not carry a stale surface recommendation into a new direction.

The active implementation contract governs approved controls, states, static checks, browser QA, accessibility evidence, and visual authority. JudgmentKit defaults apply unless a complete intended external design-system adapter owns that authority. An incomplete adapter cannot silently fall back to JudgmentKit styling.

## Repair the failure that matters to the task

Implementation acceptance and task inspection serve different purposes. The agent collects the required contract evidence and exercises the representative task where the environment permits. Useful checks include the primary success path, relevant error or recovery states, keyboard operation, and required desktop and mobile layouts. The agent records the candidate version and evidence used; stale screenshots or results cannot prove a repaired implementation works.

Explain a repair through the observable failure and correction. For the reading-list example, an illustrative update is: “Keyboard reordering changed the book's position but lost focus. I kept focus on the moved book and checked undo restores the order.” Such an update is appropriate only after those behaviors were actually observed.

Use JudgmentKit's returned constraints and repair instructions, then rerun the affected checks and implementation review. Keep unrelated behavior and user work intact. The iteration policy is agent-owned, with a default maximum of three attempts; follow the returned policy and pass accurate current-attempt context. JudgmentKit reviews submitted evidence and returns failures. The client owns attempt records, file changes, and any provider calls.

A failed candidate remains private repair evidence. The agent cannot present the candidate as an accepted result, publish a failed screenshot as release proof, or use visual cleanup to bypass the design-system gate. A request for human input ends automatic repair until the required input arrives. Missing or unsupported verification remains unresolved.

## Finish with the result and its limits

For an accepted build, provide the working interface's local path or authorized preview, the consequential design choices, and the important task paths actually checked. Keep the explanation short enough for the builder to assess the result. Provide full diagnostics on request.

Distinguish four types of evidence:

| Claim | Evidence needed |
| --- | --- |
| JudgmentKit guided a decision | The reviewed activity and workflow, with the reason for the choice |
| A declared requirement passed | The active contract check and its submitted evidence |
| A supported behavior was verified | Observed execution of that behavior on the identified candidate, including relevant environment and state |
| A person completed the intended task | An observed human task encounter with success criteria and recorded result |

Contract acceptance does not establish human usability or universal runtime coverage. Name the checks that ran, the behaviors observed, and material verification still unavailable. Artifact Inspector currently lacks an accepting interactive-attestation producer or verifier, so an otherwise valid implementation remains `review_required`; static browser evidence and candidate-authored claims cannot satisfy that authority requirement.

When a build remains blocked, provide the current failure and required next input or repair. A reviewed premise or ready handoff alone does not fulfill a request for a working interface. An accepted local prototype also does not authorize publication, deployment, or an irreversible external action.

## Learn from a complete encounter

The next evidence is one real builder episode, including setup, corrections, checks, and repairs, followed by an observed target task. Record time to the agreed result, manual corrections, false stops, unnecessary questions, review attempts, and workarounds. Compare with the builder's usual approach on a matched task and record differences between tasks and order effects.

Use that encounter to revise the workflow before the contrasting-task pilot in the product plan. Retain failed and abandoned episodes. Tide supplies one regression case; the roadmap follows recurring builder difficulty and failures to complete the intended task.
