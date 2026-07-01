# Surface-Type Prompting Smoke Test - 2026-07-01

## Scope

This smoke test used the hosted JudgmentKit MCP workflow requested by Mike:

1. `create_activity_model_review({ brief })`
2. `recommend_surface_types({ brief, activity_review })`

The goal was to verify that every JudgmentKit surface type can be elicited from user-activity evidence, using synthetic but real-world domain contexts. An observer agent first defined prompt ingredients and confounders. One target agent then probed each surface type with three prompts: an obvious case and two confounder cases.

No source code was edited for the smoke run. This document is the durable prompt ledger.

## Baseline Surface Coverage

This table records the hosted smoke run before the source fixes from the follow-up improvement pass. It is useful for understanding the miss patterns; it is not the current expected behavior after the regression fixes.

| Target surface | Passes | Misses | Main result |
|---|---:|---:|---|
| `marketing` | 2 | 1 | Clean offer/proof/conversion prompts route correctly; detailed form-field language can reroute to `form_flow`. |
| `workbench` | 3 | 0 | Repeated item review plus evidence comparison and bounded action routes cleanly. |
| `operator_review` | 3 | 0 | AI/system-produced work before advancement is a strong and stable cue. |
| `form_flow` | 3 | 0 | Structured submission, validation, submit/save, and confirmation routes cleanly. |
| `dashboard_monitor` | 1 | 2 | Fragile when prompts mention work orders, follow-up actions, executive updates, or briefing/report language. |
| `content_report` | 3 | 0 | Reading, citation, export, and sharing routes cleanly, even with charts or public-guide framing. |
| `setup_debug_tool` | 1 | 2 | Fragile when configuration is phrased as a wizard/form or when debug is phrased as AI/system review. |
| `conversation` | 3 | 0 | Thread-first prompts route cleanly; "choose the next reply" is enough decision evidence without creating a workflow. |

Baseline result: 19/24 target prompts selected the expected surface type.

## Post-Fix Validation

The follow-up improvement pass added paired regressions for the smoke-run misses and neighboring surfaces. Current expected behavior:

| Close-call pair | Expected repair |
|---|---|
| Marketing page with a short lead form vs. true signup form | Lead capture stays `marketing` when it is only a CTA; structured application completion stays `form_flow`. |
| Monitor alert drill-in vs. workbench item processing | Drill-in that explains status, exceptions, or whether follow-up is needed stays `dashboard_monitor`; assigning, prioritizing, closing, editing, approving, routing, recording a decision, or leaving a handoff stays `workbench`. |
| KPI monitor before an executive update vs. narrative executive update report | KPI awareness stays `dashboard_monitor`; writing, citing, exporting, or sharing a fixed artifact stays `content_report`. |
| HL7 setup/debug wizard vs. ordinary setup form | Machinery validation, traces, root cause, or next fix stays `setup_debug_tool`; organization/contact/billing setup submission stays `form_flow`. |
| AI-agent run debug audit vs. AI-produced work approval | Debugging prompts, tool calls, schema failures, replay, or configuration stays `setup_debug_tool`; pre-release approval of produced work stays `operator_review`. |

## Hosted v0.6.3 Canary Finding

The broad one-prompt-per-surface hosted smoke against `https://judgmentkit.ai/mcp` on v0.6.3 passed 7 of 8 checks. The miss was a cold-chain logistics monitor that routed to `workbench` because alert drill-in and investigation language looked like item processing while `dashboard_monitor` scored 0. Treat this as a canary finding for future prompt and regression design, not a rewrite of the historical baseline above.

The checked-in `npm run mcp:smoke:hosted-surface` command is a smaller paired canary for this miss and its nearest confounders. It validates surface routing by default and reports `review_status`/`activity_review_ready` separately. A passing surface canary does not mean the brief has enough source context for product-design workflow generation; use `-- --require-ready-review` when the test should also fail on `needs_source_context`.

## Observer Rubric

| Surface type | Prompt ingredients that help | Confounders to avoid |
|---|---|---|
| `marketing` | Visitor/prospect/buyer audience; offer, value, proof, pricing; signup, demo, purchase, inquiry, or trial completion. | Private operational work, setup/debug work, detailed form validation, queues, reviews, bounded internal decisions. |
| `workbench` | Domain user handles repeated cases/items/requests/candidates; compares evidence/context; takes bounded actions; leaves handoff or receipt. | Passive monitoring, public persuasion, open-ended conversation, pure data entry. |
| `operator_review` | Human reviews AI- or system-produced work before it advances; evidence and risk; approve/block/return/defer/handoff; audit receipt. | Simple forms, passive dashboards, raw machinery as the primary task. |
| `form_flow` | Enter/edit/confirm/submit structured information; required fields and validation; saved change, submitted request, or confirmation. | Evidence comparison across items, monitoring, marketing where lead capture is secondary. |
| `dashboard_monitor` | Status, metrics, trends, alerts, exceptions, operational health; periodic/passive monitoring; know current state or whether follow-up is needed. | Approvals, assignments, handoffs, record editing, reports, briefings, citations, persuasion. |
| `content_report` | Read, learn, understand, cite, export, print, or share explanatory/reference material. | Work queues, bounded decisions, conversion CTAs, configuration/debugging. |
| `setup_debug_tool` | Configure, inspect, test, troubleshoot machinery; implementation details are the task material; valid setup, failed check with cause, or next fix. | Wizard/form language, review/audit/handoff language, AI-produced work review, public marketing, open-ended chat. |
| `conversation` | Message thread or live chat is the primary object; open-ended exchange; reply with context; recover failed sends; continue or close with context intact. | Structured forms, queues/cases/prioritization, bounded approval workflows, public conversion chat. |

## Prompt Ledger

### Marketing

| Domain | Prompt | Expected | Actual | Confidence | Target score | Top competitor | Status | Lesson |
|---|---|---|---|---|---:|---|---|---|
| B2B fraud API | Public ClearSignal landing page for ecommerce prospects/buyers from ads/search/referrals; present offer, value, proof, outcomes, integrations, pricing, and CTAs to start trial or book demo; not fraud ops/config. | `marketing` | `marketing` | Low | 3 | `workbench` 0 | Pass | Audience, offer/proof/pricing, and trial/demo conversion are enough when private operations are excluded. |
| Childcare benefits signup | Public BloomPass campaign page for parent and HR-buyer prospects; sell plans, benefits, testimonials, proof, and conversion; include request-a-quote/join-waitlist form with fields, validation, submit confirmation; not admin/intake queue. | `marketing` | `form_flow` | Low | 1 | `form_flow` 2 | Miss | Detailed field, validation, and submit language can overpower marketing even when the form is intended as lead capture. |
| Sustainability benchmark resource | Public Northstar Climate resource page for manufacturing CFO/ops prospects browsing a decarbonization benchmark; summarize findings/charts/methodology, show proof and packages, CTA to download report or book paid assessment; not report reader/citation workspace. | `marketing` | `marketing` | Low | 2 | `content_report` 0 | Pass | Report-like content stays marketing when findings are framed as trust-building proof for inquiry or assessment conversion. |

Best practice: for marketing, keep the form as a CTA and avoid describing required fields, validation, or submission mechanics unless `form_flow` is intended.

### Workbench

| Domain | Prompt | Expected | Actual | Confidence | Target score | Top competitor | Status | Lesson |
|---|---|---|---|---|---:|---|---|---|
| Healthcare prior authorization | Hospital prior-auth nurse reviews specialty medication queue; compares chart, policy, labs, notes, denials; decides approve/request evidence/physician review/deny; leaves pharmacy handoff. | `workbench` | `workbench` | High | 3 | `operator_review` 0 | Pass | Repeated case review plus evidence comparison and bounded action gives a clean workbench match. |
| Higher-ed financial aid | Financial-aid officer reviews scholarship appeals; compares statement, FAFSA change, transcript, recommendation, policy exceptions, fund pool; captures award amount/reason/missing-doc/notification fields to close appeal. | `workbench` | `workbench` | Low | 3 | `form_flow` 0 | Pass | Structured fields are safe when framed as decision capture after review, not primary intake. |
| Logistics dispatch | Delivery planner sees aging, capacity, SLA risk, weather, then opens each shipment exception; compares scan history, driver notes, promise, constraints; chooses reroute/hold/credit/escalate/resolve with dispatch handoff. | `workbench` | `workbench` | High | 3 | `dashboard_monitor` 0 | Pass | Metrics can appear if they support per-item action and handoff rather than passive monitoring. |

Best practice: lead with the domain actor, repeated work items, evidence comparison, finite actions, and receipt or handoff.

### Operator Review

| Domain | Prompt | Expected | Actual | Confidence | Target score | Top competitor | Status | Lesson |
|---|---|---|---|---|---:|---|---|---|
| Loan underwriting QC | Senior underwriters inspect AI-generated mortgage exception decisions before applicant release; compare documents, policy clauses, confidence, missing evidence, fairness/compliance risk; approve/block/return/defer/handoff with audit receipt. | `operator_review` | `operator_review` | Low | 4 | `workbench` 2 | Pass | "System-produced work before release" plus evidence, risk, bounded decision, and receipt is the clearest route. |
| Marketplace trust and safety | Review mode inside an investigator workbench for policy specialists checking system-generated enforcement packets before suspension/takedown; workbench queues/notes/tags are present, but reviewer decides approve/block/return/defer/handoff and records audit receipt. | `operator_review` | `operator_review` | Low | 4 | `workbench` 3 | Pass | Workbench language is safe when produced recommendations are the object of review. |
| Cloud incident response | On-call leads review an automated remediation plan before production traffic changes; logs, config checks, traces, runbook diffs, rollback readiness, and blast radius are evidence, not the primary setup/debug task; approve/block/return/defer/handoff with audit receipt. | `operator_review` | `operator_review` | Low | 5 | `setup_debug_tool` 2 | Pass | Setup/debug terms need an explicit boundary: raw mechanics are evidence, while the activity is pre-advance review. |

Best practice: name the AI/system artifact early, include approve/block/return/defer/handoff, and require an audit receipt.

### Form Flow

| Domain | Prompt | Expected | Actual | Confidence | Target score | Top competitor | Status | Lesson |
|---|---|---|---|---|---:|---|---|---|
| Healthcare prior authorization | Nurse submits a new medication authorization with patient, insurer, prescriber, diagnosis, dosage, prior therapies, notes, attachments, required-field validation, draft save, submit, confirmation number. | `form_flow` | `form_flow` | Low | 2 | `workbench` 0 | Pass | Submission outcome and validation path are strong cues. |
| Municipal permit renewal | Staff opens a pending-packets list only to find one permit renewal, then enters applicant, site, contractor, scope, waiver, uploads, certification, validation, draft save, submit, confirmation receipt; not comparing or monitoring the list. | `form_flow` | `form_flow` | Low | 2 | `workbench` 0 | Pass | If a list exists, state it is only for locating one item, not repeated comparison. |
| Regional theater membership signup | Public campaign visitors complete a structured membership signup: level, household contact, accessibility preferences, billing, donation, payment, agreement checkboxes, required fields, payment validation, review, submit, receipt. | `form_flow` | `form_flow` | Low | 2 | `marketing` 0 | Pass | Signup routes to form flow when bounded application completion is primary and persuasion is secondary. |

Best practice: use field groups, required fields, validation, review, submit/save, and confirmation. Avoid evidence comparison and ongoing status monitoring.

### Dashboard Monitor

| Domain | Prompt | Expected | Actual | Confidence | Target score | Top competitor | Status | Lesson |
|---|---|---|---|---|---:|---|---|---|
| Hospital ED operations | Live ED operations monitor for charge nurses showing occupancy, waiting count, acuity mix, arrivals, lab trends, staffing, boarding, alerts, exceptions; refreshes wall/desk; completion is knowing operational health and whether investigation is needed; not approvals, assignment, or documentation. | `dashboard_monitor` | `dashboard_monitor` | Low | 1 | `workbench` 0 | Pass | Periodic refresh, operational health, exceptions, and explicit non-approval boundaries route cleanly. |
| Fleet maintenance | Fleet health monitor for supervisors showing downtime, faults, overdue inspections, capacity, SLA-risk trends, route-impact exceptions, thresholds; may open work-order system; monitors health and whether follow-up is needed; not approvals, assignments, prioritization, or record editing. | `dashboard_monitor` | `workbench` | Low | 1 | `workbench` 2 | Miss | Work-order, supervisor follow-up, and action language can dominate monitor cues. |
| Investor-relations KPI | Daily IR KPI monitor for CFO/comms before an executive update; resembles briefing source but shows ARR, pipeline, churn, burn, forecast variance, runway, stale-data warnings, deltas, exceptions, alerts; completion is knowing if business is on track; not writing/reporting/persuasion. | `dashboard_monitor` | `content_report` | Low | 1 | `content_report` 2 | Miss | Briefing/update/report language activates `content_report` even when negated. |

Best practice: put status, metrics, trends, alerts, exceptions, operational health, and passive/periodic monitoring in the first sentence. Omit report/briefing/update and work-order/action terms when possible.

### Content Report

| Domain | Prompt | Expected | Actual | Confidence | Target score | Top competitor | Status | Lesson |
|---|---|---|---|---|---:|---|---|---|
| Housing policy research | Build a web-based reading and reference report for state housing policy analysts and legislative staff studying a published evidence synthesis on zoning reform, rent burden, and displacement risk. Support executive summary/sections, caveats/methods, footnotes, citation-ready passages, PDF appendix export, and summary sharing. Completion is understanding plus citation-ready notes/reference appendix; no forms, operational controls, sales CTA, troubleshooting panels, or cases to process. | `content_report` | `content_report` | Low | 2 | `workbench` 0 | Pass | Reports work when completion is understanding, citation, export, or sharing. |
| Public health chart report | Create a quarterly community health findings report for county public health communicators. Chart-heavy: static chart plates, map figures, annotated captions, methods notes, footnotes, and source tables explain vaccination equity and respiratory illness after the quarter closes. Readers read narrative interpretation, understand figures, quote captions, cite figure sources in a board packet, export chart bundle/PDF, and share a summary. Completion is understanding, citation, export, and sharing; figures are frozen publication exhibits rather than a live operational dashboard. | `content_report` | `content_report` | Low | 2 | `dashboard_monitor` 1 | Pass | Chart confounders pass when charts are static explanatory exhibits and citation/export is the endpoint. |
| Energy incentives public guide | Create a public-facing guide and report for homeowners, librarians, and local energy advisors explaining heat-pump rebates/weatherization incentives. Polished consumer guide with title, plain-language sections, examples, source notes, citation links, printable checklist, PDF export, and shareable chapter links. Readers learn rules, understand caveats, cite official sources, and share with a contractor/neighbor. Completion is understanding, citation, printing, exporting, or sharing; no quote request, signup funnel, campaign conversion goal, or sales CTA. | `content_report` | `content_report` | Low | 1 | `marketing` 1 | Pass | Public-guide language can tie marketing; non-commercial completion keeps `content_report` selected. |

Best practice: make citation/export/share the completion state. For charts, say static publication exhibits, not live operational dashboard.

### Setup Debug Tool

| Domain | Prompt | Expected | Actual | Confidence | Target score | Top competitor | Status | Lesson |
|---|---|---|---|---|---:|---|---|---|
| Fintech webhook integration | Design an internal setup console for a fintech operations engineer onboarding a new Stripe Connect webhook integration: configures API keys, webhook URL, event subscriptions, sandbox/live mode, and signature secret; sends test events; inspects request/response traces; finishes with either a validated connection or a failed check with the cause and next fix. | `setup_debug_tool` | `setup_debug_tool` | Low | 2 | `form_flow` 1, tied `dashboard_monitor` 1 | Pass | Machinery verbs plus validated connection or failed check with cause were enough. |
| Healthcare HL7 feed setup | Create a setup wizard for a hospital integration analyst configuring an HL7 lab-results feed: enters endpoint and authentication details, maps order/result codes, chooses message triggers, validates a sample ORU message, inspects ACK/NACK responses; leaves with either the interface marked ready for cutover or a failed validation. | `setup_debug_tool` | `form_flow` | Low | 1 | `form_flow` 2 | Miss | `wizard`, `enters`, required fields, and validation can dominate unless checks/traces/remediation are primary. |
| AI-agent run audit/debug | Design an audit console for a platform reliability lead investigating failed AI-agent tool runs: reviews a run only to debug the machinery; inspect prompt/tool-call trace, JSON schema validation, auth scope; replay the failing step; mark root cause; finish with either a validated fix, reproducible failure report, or next configuration change. | `setup_debug_tool` | `operator_review` | High | 2 | `operator_review` 5 | Miss | `audit console`, `reviews`, AI/system work, and handoff-like language can overpower explicit debug intent. |

Best practice: lead with configure, inspect, test, troubleshoot, and name the machinery. State completion as valid setup, failed check with cause, or next fix. Avoid wizard/form and review/audit/handoff language unless those surfaces are intended.

### Conversation

| Domain | Prompt | Expected | Actual | Confidence | Target score | Top competitor | Status | Lesson |
|---|---|---|---|---|---:|---|---|---|
| Support live chat | A support agent handles an open-ended live chat. The activity is continuing a customer conversation, replying with context, preserving prior messages, and recovering from failed sends. The agent must choose the next reply in the thread. The outcome is a thread the agent can continue or close with context intact. | `conversation` | `conversation` | Medium | 2 | `workbench` 0 | Pass | "Choose the next reply" satisfies decision evidence without making the chat a bounded workflow. |
| Incident triage chat | A support agent uses a triage chat during a field incident. The activity is an open-ended chat where crew members ask questions, respond, share photos and context, retry failed sends, and keep the thread active across shift changes. The agent must choose the next reply in the thread. The outcome is a continuing conversation the agent can later close with context intact. | `conversation` | `conversation` | Medium | 2 | `workbench` 0 | Pass | "Triage" is safe when it describes a chat context, not a queue or prioritization workspace. |
| Signup support chat | A signup support agent runs a private chat thread for people who are partway through account signup. The activity is an open-ended conversation: the person asks questions, the agent reviews prior messages, replies with context, keeps the thread active while signup confusion changes, and retries failed sends. The agent must choose the next reply in the thread. The outcome is a continuing private conversation the agent can later close with context intact. | `conversation` | `conversation` | Medium | 2 | `marketing` 0 | Pass | Keep signup as private support context, not public conversion, proof, lead capture, or CTA. |

Best practice: make the thread the primary object. Use messages, composer, context, failed-send recovery, and close/reopen continuity. Avoid complete, submit, handoff, approve, block, and "decide whether" language.

## Best-Practice Templates

Use these when drafting source briefs around the user's real activity. Do not force a type when the activity evidence disagrees.

| Surface type | Template |
|---|---|
| `marketing` | Plan a public page for [buyer/prospect audience] evaluating [offer]. The activity is orienting visitors to value, proof, pricing/plan fit, and a clear [demo/trial/purchase/inquiry] next step. If there is a quote/demo/waitlist form, it is only the CTA, not the primary structured task. |
| `workbench` | Plan an internal workspace for [domain actor] handling repeated [cases/items/requests]. The activity is comparing [evidence/context], choosing [bounded actions], and leaving [handoff/receipt]. Status metrics can support the decision, but the completion state is action on named work items. |
| `operator_review` | Plan a review surface for [human operator] checking [AI/system-produced work] before it advances. The activity is comparing evidence and risk, then approving, blocking, returning, deferring, or handing off with an audit receipt. Raw mechanics are evidence, not the primary task. |
| `form_flow` | Plan a guided [application/request/settings change] where [user] enters [structured field groups], resolves validation, reviews completeness, submits or saves, and receives confirmation. Completion is a valid submitted or saved record, not persuasion or diagnostics. |
| `dashboard_monitor` | Plan a passive/periodic monitor for [operator] tracking status, metrics, trends, alerts, exceptions, and operational health. Completion is knowing current state and whether investigation or follow-up is needed; drill-in explains the exception while downstream work orders, cases, or updates stay context only. |
| `content_report` | Plan a [report/guide/reference] for [reader] to understand [topic], read sections, cite sources, export/print, and share the material. Completion is understanding, citation, or sharing a fixed artifact, not live status monitoring. |
| `setup_debug_tool` | Plan a setup/debug tool for [technical user] to configure, inspect, test, and troubleshoot [machinery]. Completion is a valid setup, failed check with cause, reproducible failure report, root cause, or next fix. Fields and wizard steps support machinery validation. |
| `conversation` | Plan a [chat/thread] surface where [participants] exchange open-ended messages, preserve context, recover failed sends, choose the next reply, and continue or close with context intact. The thread is the primary object, not a queue, form, or approval workflow. |

## Miss Repair Patterns

| Miss pattern | Better prompt steering |
|---|---|
| Marketing page reroutes to `form_flow` because the prompt details fields and validation. | Lead with public audience, offer, proof, pricing/plan fit, and conversion. Mention quote/demo/waitlist capture only as the CTA. |
| Dashboard monitor reroutes to `workbench` because the prompt mentions work orders, alert drill-in, investigation, or follow-up. | Lead with status, metrics, trends, alerts, exceptions, operational health, and knowing current state. State that drill-in explains the exception and that work orders are downstream context, not assignment, prioritization, closure, editing, approval, routing, decision recording, or handoff. |
| KPI monitor reroutes to `content_report` because the prompt mentions an executive update or briefing. | Say the update is downstream context. Keep the completion state as knowing whether the business is on track unless the user is writing, exporting, citing, or sharing a report. |
| Setup/debug wizard reroutes to `form_flow` because the prompt emphasizes fields, wizard steps, and validation. | Lead with configure, inspect, test, troubleshoot, machinery, traces, ACK/NACK, sample validation, root cause, and next fix. Treat fields as controls for machinery validation. |
| AI-agent debug reroutes to `operator_review` because the prompt says audit or review. | Say the user is debugging the machinery: prompts, tool-call traces, schema failures, auth scope, replay, root cause, validated fix, reproducible failure, or next configuration change. Reserve approval/block/return for produced work before release. |

## Residual Prompting Risks

The miss modes below are now covered by paired regressions, but they remain useful pressure points when reviewing source briefs and generated UI plans.

High: `setup_debug_tool` is the most fragile target. Configuration prompts can become `form_flow`; audit/debug prompts involving AI/system runs can become `operator_review`.

High: `dashboard_monitor` is also fragile. Work-order/follow-up/action language can become `workbench`; executive update, briefing, and report language can become `content_report`.

Medium: `marketing` prompts with detailed form fields and validation can become `form_flow`. Keep lead capture subordinate when marketing is intended.

Medium: The classifier often returns Low confidence even for expected results. Confidence should be interpreted alongside score, trigger, exclusion, and prompt clarity.

Low: `content_report`, `workbench`, `operator_review`, `form_flow`, and `conversation` were stable when the prompt used the observer rubric directly.
