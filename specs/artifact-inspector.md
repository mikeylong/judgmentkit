# JudgmentKit Artifact Inspector Interaction Model

Status: proposed interaction-model and contract release

Audience: JudgmentKit product, design, and engineering

Scope: JudgmentKit interaction-model selection, workflow and implementation
contracts, serialized handoffs, and fail-closed review. This release does not
provide the trusted interactive-attestation runtime required to accept an
Artifact Inspector implementation.

## Decision

Add `artifact_inspector` as a first-class JudgmentKit surface type with a
versioned interaction profile and a scoped design-system authority contract.

The model supports work in which one rendered artifact is the primary object,
the participant acts on a specific locus within it, and supporting evidence,
authority, actions, state changes, and receipts only make sense in relation to
that locus.

The surrounding product chrome and inspection overlay use JudgmentKit. The
artifact may use an independent design system. JudgmentKit must validate its
two layers without claiming visual authority over the artifact.

## Why JudgmentKit Needs This Model

The current taxonomy creates three predictable errors for artifact-centered
work:

1. Words such as `thread` can route a bounded visual relation to
   `conversation`, even when no message exchange exists.
2. `workbench` can recover the operational intent but defaults toward
   master-detail, queue-detail, or tool-centric structure.
3. A whole-candidate design-system gate cannot validate quiet product chrome
   around an independently styled artifact without either rejecting the
   artifact or forcing it into JudgmentKit styling.

`operator_review` is also insufficient. It tends to make the case, evidence,
risk, and decision controls primary. Artifact inspection reverses that
relationship: the artifact remains primary, and the surrounding context earns
space only through its relation to the artifact.

## Goals

- Select `artifact_inspector` from activity evidence rather than keywords.
- Generate an artifact-dominant interaction topology rather than a dashboard,
  form, case file, dossier, or conversation.
- Keep observations, evidence, authority, actions, and results spatially or
  contextually attached to the artifact.
- Support direct manipulation without requiring drag, hover, or precise
  pointing.
- Keep restrained product chrome deliberate, legible, responsive, accessible,
  and visibly complete.
- Allow JudgmentKit design-system enforcement for the product chrome while an
  embedded artifact retains declared external visual authority.
- Require explicit commitment, recovery, and receipts when the activity has
  consequential state changes.
- Preserve the existing surface taxonomy for activities that are not
  artifact-centered.

## Non-Goals

- Defining the artifact's visual design.
- Turning JudgmentKit into a general-purpose drawing or artifact-authoring
  tool.
- Treating every review surface as an artifact inspector.
- Replacing `workbench`, `operator_review`, `content_report`, or
  `conversation`.
- Hard-coding one product's authority taxonomy, decision labels, or automation
  rules into the base model.
- Waiving accessibility, state coverage, or review evidence because part of
  the candidate has external visual authority.
- Treating an externally styled artifact as JudgmentKit-conformant when
  JudgmentKit did not review that artifact.

## Canonical Identifiers

Use one concept consistently across the current MCP fields:

| Contract location | Value |
| --- | --- |
| `surface_type` | `artifact_inspector` |
| Workflow profile | `artifact-inspector-ui` |
| Frontend surface profile | `judgmentkit.artifact-inspector.v1` |
| Interaction topology kind | `artifact_centered` |

The separate identifiers preserve the existing tool interfaces while pointing
to one versioned definition.

## Terms

- **Artifact:** The rendered object being inspected. It may be a product UI,
  document, composition, diagram, generated result, or another bounded object
  that can be meaningfully rendered.
- **Artifact locus:** A selectable region, object, state, or semantic feature
  within the artifact.
- **Inspector chrome:** JudgmentKit-owned controls, status, annotations,
  connectors, supporting context, and recovery affordances around the
  artifact.
- **Inspection overlay:** JudgmentKit-owned selections, pins, connectors,
  handles, and local feedback rendered over the artifact without becoming part
  of the artifact's visual authority.
- **Support object:** Evidence, authority, rule, comparison, diagnostic, or
  another object whose meaning is attached to an artifact locus.
- **Relation:** The visible connection between a locus and a support object or
  action. A relation may be provisional or committed.
- **Consequential action:** An action that changes governed state, publishes,
  approves, rejects, commits, or creates a reusable rule.
- **Receipt:** A durable, inspectable result of a consequential action.
- **External artifact authority:** A declared visual and component authority
  that owns the artifact but not the surrounding inspector chrome.

## Activity Definition

### Purpose

Help a participant inspect one rendered artifact in place, select the part
that matters, bring the right supporting context to that location, and leave
the artifact in an explicit, inspectable state.

### Primary object

One current artifact or artifact revision. Observations, evidence, authority,
actions, guidance, and receipts are subordinate objects.

### Participant completion

The participant can see what required attention, understand the relevant
supporting context, complete the bounded action when one exists, and verify
the resulting state on or immediately beside the artifact.

### Applies when most are true

- The artifact must remain visible for the participant to complete the work.
- The work begins by inspecting or selecting a locus within the artifact.
- Supporting context only becomes meaningful in relation to that locus.
- The participant must compare, relate, validate, decide, or act in place.
- The completion state is legible on or directly beside the artifact.
- Persistent global controls would compete with the object being inspected.
- The artifact may have visual authority independent from the host product.

The first three conditions are mandatory. A keyword match is never sufficient.

When mandatory and exclusion evidence are both materially present,
`recommend_surface_types` should return `review_required` with the conflicting
signals. It must not break the tie from layout vocabulary.

### Do not use when

- The participant is primarily creating or freely editing the artifact.
- A queue, case list, record set, or many-item comparison is the primary
  object.
- The work can be completed without seeing or selecting anything on the
  artifact.
- A linear document or report is sufficient.
- The exchange between participants is the primary object.
- The task is primarily monitoring status, trends, or operational health.
- The task is primarily setup, configuration, or debugging.
- The artifact cannot be rendered meaningfully and the supporting dossier must
  become primary.

## Surface-Type Routing

### Positive evidence

`recommend_surface_types` should score the following activity evidence:

- `rendered_artifact_is_primary`
- `locus_selection_required`
- `support_context_is_locus_relative`
- `completion_is_artifact_local`
- `direct_or_spatial_interaction_required`
- `external_artifact_visual_authority`

### Exclusion evidence

- `queue_or_case_is_primary`
- `many_items_are_primary`
- `open_ended_creation_is_primary`
- `conversation_turns_are_primary`
- `linear_reading_is_completion`
- `monitoring_is_completion`
- `configuration_is_completion`

### Tie-break rules

| Competing type | Choose `artifact_inspector` when | Choose the competing type when |
| --- | --- | --- |
| `workbench` | One artifact stays primary and locus-specific inspection is required. | The participant creates, arranges, or operates across many objects or tools. |
| `operator_review` | The participant must act directly on the produced artifact and context is attached to a locus. | The case, evidence, risk, and bounded decision can be reviewed without artifact-local interaction. |
| `content_report` | Reading leads to locus-specific inspection or state change. | Linear reading, understanding, citation, or sharing is completion. |
| `conversation` | Language is subordinate to a persistent artifact. | Turns, messages, and response continuity are the primary objects. |
| `dashboard_monitor` | The participant investigates one artifact and acts locally. | Status, exceptions, or trends across items are the primary completion. |
| `form_flow` | Structured values are contextual to an artifact locus. | Collecting or changing structured information is the activity. |

The token `thread` must not independently trigger `conversation`. A visual
connection, causal trace, annotation thread, or authority thread is not a
conversation without message turns, exchange continuity, and a response
activity.

### Expected recommendation output

```json
{
  "recommended_surface_type": "artifact_inspector",
  "profile_id": "artifact-inspector-ui",
  "confidence": "high",
  "primary_structure": "persistent artifact, selectable loci, contextual support, local feedback, and artifact-local completion",
  "density": "artifact-first contextual",
  "navigation_shape": "artifact persistent; supporting context revealed from the active locus"
}
```

## Interaction Topology

### Core loop

```text
orient to artifact
  -> select a locus
  -> reveal relevant support or actions
  -> preview a relation or change
  -> validate locally
  -> commit when consequential, or complete when non-consequential
  -> show the result on or beside the artifact
  -> recover to the last safe state when cancelled or invalid
```

### Required work units

| Work unit | Participant intent | System responsibility |
| --- | --- | --- |
| `orient` | Understand the artifact's current state. | Keep the artifact dominant and expose only essential status. |
| `select_locus` | Identify the part that matters. | Provide a visible selected state and equivalent pointer, touch, and keyboard paths. |
| `inspect_context` | Understand what supports or constrains the locus. | Reveal context progressively and keep its relation to the locus visible. |
| `preview` | Test a relation or action before commitment. | Distinguish provisional state from committed state. |
| `validate` | Know whether the relation or action is supported. | Explain valid, invalid, unavailable, stale, and ambiguous conditions locally. |
| `complete` | Finish the bounded non-consequential task or enter an explicit commit boundary. | Change only the state authorized by the activity contract. |
| `verify_result` | Confirm what changed. | Attach a stable result or receipt to the artifact when required. |
| `recover` | Cancel, go back, retry, or reconcile. | Reverse only uncommitted state and preserve committed results. |

### Artifact target and interactivity model

Every workflow declares one artifact boundary and one target model:

- target kinds: whole artifact, element, text range, region, or point;
- target identity: artifact-supplied or explicit participant selection;
- geometry: read-only and stable for the current artifact revision;
- label: artifact-supplied, artifact-authorized proxy, or `Unavailable`;
- artifact interactivity: `static`, `live`, or `hybrid`.

Native artifact interaction has precedence for `live` and `hybrid` artifacts.
JudgmentKit may capture a gesture only after the participant enters an explicit
inspection mode, uses a declared inspection handle, or invokes a declared
keyboard command. Artifact inspection cannot silently replace an artifact's
native action.

If artifact geometry changes, the overlay must re-anchor to the same semantic
target or mark the target stale. It cannot silently drift to another element.

### Normative topology shape

`review_ui_workflow_candidate` should accept and validate this explicit shape:

```json
{
  "workflow": {
    "topology": {
      "kind": "artifact_centered",
      "primary_object_id": "artifact",
      "entry_work_unit_id": "orient",
      "completion_work_unit_ids": ["verify_result", "orient"],
      "transitions": [
        {"from": "orient", "to": "select_locus"},
        {"from": "select_locus", "to": "inspect_context"},
        {"from": "inspect_context", "to": "preview"},
        {"from": "preview", "to": "validate"},
        {"from": "validate", "to": "complete", "when": "supported"},
        {"from": "validate", "to": "recover", "when": "invalid_or_ambiguous"},
        {"from": "recover", "to": "inspect_context", "when": "retry_or_reconcile"},
        {"from": "complete", "to": "verify_result"},
        {"from": "select_locus", "to": "orient", "when": "back"}
      ]
    },
    "work_units": []
  }
}
```

The reviewer should return a field-specific diagnostic when topology is
malformed. It must not collapse all topology errors into `workflow.topology is
required`.

## Generation Procedure

JudgmentKit should choose a composition after the activity and topology are
valid. Styling and component selection come later.

1. Confirm that one rendered artifact is the primary object.
2. Establish whether targets are whole-artifact, element, text-range, region,
   or point selections.
3. Establish whether the artifact is static, live, or hybrid and protect its
   native interactions.
4. Identify the support objects that must remain related to the active target.
5. Separate reversible preview, consequential commitment, and durable result.
6. Activate only the conditional state groups required by the activity.
7. Choose the least persistent chrome that keeps the target, context, action,
   and result understandable together.
8. Project the same state machine to wide and narrow viewports.
9. Declare visual-authority scopes and cross-boundary behavior before frontend
   generation.
10. Generate and review the chrome, overlay, artifact-preservation, and boundary
    evidence separately.

### Allowed composition variants

- **Peripheral anchors:** Use when a small, stable set of support objects must
  remain visible around the artifact.
- **Contextual tray:** Use when support objects are numerous, conditional, or
  need a narrow-viewport home.
- **Inline annotation:** Use when short context can remain beside a text range,
  element, region, or point without obscuring it.
- **Inspection lens:** Use when temporary magnification or focused context is
  necessary to understand a dense locus.
- **Responsive hybrid:** Use a peripheral form on wide viewports and a
  contextual tray on narrow viewports while preserving identical states and
  actions.

JudgmentKit selects a variant from target density, artifact interactivity,
support-object count, consequence, and viewport evidence. The variant is not a
visual theme and cannot change the participant's completion state.

## Composition Grammar

### Required relationships

- The artifact is the largest and most persistent visual region.
- Inspector chrome surrounds, overlays, or attaches to the artifact without
  turning it into a card within a larger case screen.
- The active locus remains visible while its supporting context is open.
- Supporting context is adjacent to the locus, connected to it, or invoked
  directly from it.
- Feedback appears at the action or relation that caused it.
- Consequential controls appear only when their preconditions are met.
- Receipts remain visibly connected to the result they describe.
- The participant can return to the previous safe state without searching for
  global navigation.
- Host-owned overlay marks remain distinguishable from artifact content.

### Chrome posture

The chrome should be reduced but finished:

- flat or low-elevation surfaces;
- precise alignment and spacing;
- restrained type hierarchy;
- semantic color rather than decorative color;
- sparse labels and domain language;
- contextual controls rather than persistent toolbars;
- clear focus, hover, selected, unavailable, invalid, committing, and complete
  states;
- no styling that competes with the artifact.

Reduced styling is a role distinction. It is not permission for weak hierarchy,
browser-default controls, low contrast, ambiguous targets, or unfinished
states.

### Artifact posture

- The artifact preserves its own visual language.
- The artifact may be richer, more dimensional, or more product-like than the
  chrome.
- JudgmentKit must not restyle the artifact to make the surrounding chrome
  pass.
- Artifact content must not be duplicated into a stack of inspector panels
  merely to fit an existing surface pattern.

### Avoid by default

- queue-detail and master-detail layouts;
- dashboard summaries;
- persistent evidence dossiers;
- stacked labeled panels;
- form-like step progression;
- a chat composer or message history;
- action bars detached from the selected locus;
- generic approval panels that can be completed without inspecting the
  artifact;
- drag-only, hover-only, or color-only interaction.

## Responsive Model

### Wide viewports

- Keep the artifact central and persistent.
- Place sparse support anchors at the periphery or reveal them contextually.
- Route connectors without covering the inspected locus or essential artifact
  content.
- Keep global chrome subordinate to artifact-local controls.

### Narrow viewports

- Preserve the artifact as the primary viewport content.
- Move supporting context into a temporary edge affordance, anchored popover,
  or lightweight selection tray.
- Keep the selected locus, active relation, feedback, and recovery action
  visible together.
- Do not require drag; support select-then-target and keyboard-equivalent flows.
- Do not cover the inspected locus with the tray that explains it.
- Preserve zoom, text reflow, and target sizing requirements.

Responsive adaptation may change placement. It must not change the state
machine or require a different conceptual task.

## State Coverage

### Core states

- artifact loading;
- artifact ready;
- artifact unavailable or failed;
- no active locus;
- locus focused or selected;
- context loading;
- context ready;
- relation or action preview;
- supported;
- incompatible;
- unavailable;
- stale;
- ambiguous;
- blocked;
- cancelled or Back;
- local error and retry.

### Conditional consequential states

Require this group when the activity commits a decision or external effect:

- no option preselected;
- outcome pending;
- committing;
- commit succeeded;
- known failure;
- unknown result;
- receipt reconciliation;
- immutable receipt;
- concurrent result;
- superseding action when reversal is allowed.

### Conditional reusable-guidance states

Require this group when one decision can become future guidance:

- inactive draft after the current result exists;
- correcting;
- explicit confirmation with no default affirmative;
- accepting;
- accepted version;
- declined or Back with no active guidance;
- acceptance failure;
- conflict;
- supersession;
- revocation.

Current-item commitment and reusable-guidance acceptance are separate
consequential steps.

### Conditional automation states

Require this group when accepted guidance can resolve later matches:

- match preflight;
- exact match;
- near or partial match;
- automatic resolution pending;
- automatic resolution complete;
- inline causal receipt;
- changed authority or evidence;
- failed or uncertain automation;
- exception returned to human review.

## Mixed Visual Authority

### Required contract

`create_ui_implementation_contract` must support more than one declared visual
authority in a single rendered candidate.

```json
{
  "design_system_scopes": [
    {
      "scope_id": "inspector_chrome",
      "root_selector": "[data-jk-scope='inspector-chrome']",
      "authority": "judgmentkit_default",
      "enforcement": "required",
      "style_isolation": "required"
    },
    {
      "scope_id": "inspection_overlay",
      "root_selector": "[data-jk-scope='inspection-overlay']",
      "authority": "judgmentkit_default",
      "enforcement": "required",
      "style_isolation": "required"
    },
    {
      "scope_id": "primary_artifact",
      "root_selector": "[data-artifact-root]",
      "authority": "external_declared",
      "enforcement": "external_not_reviewed",
      "style_isolation": "required"
    }
  ],
  "boundary_contracts": [
    {
      "from_scope": "inspection_overlay",
      "to_scope": "primary_artifact",
      "allowed_roles": ["locus_target", "annotation_overlay", "connector_endpoint"],
      "event_contract_required": true
    }
  ]
}
```

### Ownership

| Concern | Owner |
| --- | --- |
| Chrome tokens, components, and interaction states | JudgmentKit |
| Artifact typography, components, color, elevation, and internal layout | Declared external authority |
| Observation markers, connectors, selection handles, and local overlay feedback | JudgmentKit |
| Artifact internal semantics, focus, contrast, and controls | Declared external authority |
| Cross-boundary focus order, overlays, obstruction, labels, and announcements | Host/Inspector contract |
| Artifact target geometry exposed to chrome | Boundary integration contract |

### Boundary rules

- Every visible region has one declared authority owner.
- Scope roots cannot overlap unless a named overlay exception declares which
  scope owns the overlay.
- JudgmentKit selectors, resets, fonts, and tokens cannot leak into the
  artifact scope.
- Artifact styles cannot leak into the chrome scope.
- Chrome annotations that appear over the artifact remain chrome-owned. They
  should be rendered through a declared overlay or portal rather than silently
  becoming artifact descendants.
- Cross-boundary events use declared semantic locus identifiers. Geometry alone
  is insufficient authority.
- A live artifact keeps native gesture precedence until explicit inspection
  mode is active.
- Entering and leaving inspection mode must be visible and announced.
- Artifact anchors remain stable for one artifact revision. Changed or missing
  targets become stale or unavailable rather than being inferred.
- The artifact cannot be marked external merely to hide nonconforming chrome.
- An external artifact declaration does not count as JudgmentKit artifact
  conformance.

### Review result in this release

The implementation review reports each scope separately and remains fail-closed:

```json
{
  "implementation_review_status": "review_required",
  "candidate_artifact_status": "review_required",
  "design_system_acceptance_status": "review_required",
  "next_agent_action": "none",
  "design_system_review": {
    "inspector_chrome": "review_required",
    "inspection_overlay": "review_required",
    "primary_artifact": "external_not_reviewed",
    "boundary_contract": "review_required"
  },
  "trusted_runtime_evidence": {
    "status": "unavailable_in_this_release",
    "producer_available": false
  }
}
```

Static or structural violations may still fail with precise diagnostics. An
otherwise valid candidate cannot pass: candidate-authored evidence and the
existing static browser-composition runtime are non-accepting. The
human-facing result must not describe any scope or the whole candidate as
JudgmentKit-conformant.

### Deferred interactive-attestation evidence

The following evidence is mandatory for a future accepting runtime, but no
producer or verifier for it exists in this release:

- exact region and authority map;
- style-isolation proof in both directions;
- artifact render fingerprint before and after every chrome state transition;
- declared pointer, touch, keyboard, and assistive-technology crossings;
- focus-order and focus-return trace;
- overlay occlusion and target-drift checks;
- desktop and narrow views for rest, selection, preview, invalid, supported,
  unavailable, and recovery states;
- separate results for chrome conformance, overlay conformance, artifact
  preservation, and boundary behavior.

## JudgmentKit Chrome Components

The default JudgmentKit design system needs semantic coverage for artifact
inspection. Exact visual treatment remains design-system-owned.

- `ArtifactViewport`
- `ArtifactBoundary`
- `ArtifactStatus`
- `ObservationMarker`
- `LocusSelection`
- `ContextAnchor`
- `AuthorityAnchor`
- `AnchorRail`
- `RelationPreview`
- `RelationConnector`
- `InlineReason`
- `ContextTray`
- `CommitBoundary`
- `ReceiptMarker`
- `BackAction`
- `ResetAction`
- `ZoomAndPanControls` when the artifact requires them

The implementation contract may allow semantic HTML and SVG for these roles
until dedicated components exist, but the contract must name the allowed role,
state coverage, token boundary, and accessibility requirements. It must not
fall back to form-field primitives as the only approved component family.

## Accessibility Contract

- Every selectable locus has an accessible name, role, and selected state.
- Every connector has a nonvisual relation description.
- Drag has a select-then-target alternative.
- Hover content is also available through focus and activation.
- Focus order follows the participant's activity, not the DOM accident of an
  overlay implementation.
- Focus remains stable when contextual chrome appears or disappears.
- Entering and leaving inspection mode is announced, and exiting returns focus
  to the initiating target or the nearest valid fallback.
- Invalid, unavailable, stale, committing, complete, and failed states are
  announced without stealing focus.
- Color is never the only indicator of relation or state.
- Zoom and reflow do not separate the active locus from its feedback.
- Touch targets and pointer cancellation meet the active accessibility policy.
- The host review verifies cross-boundary behavior. External artifact evidence
  verifies the artifact's internal accessibility.
- An artifact-authorized semantic proxy must retain artifact-authority
  provenance. JudgmentKit cannot create a semantic description from visual
  inference and present it as artifact truth.

## MCP Behavior Changes

| Tool | Required change |
| --- | --- |
| `create_activity_model_review` | Ask whether a rendered artifact is primary, whether locus selection is required, what completion looks like, and who owns artifact styling. |
| `recommend_surface_types` | Add `artifact_inspector`, positive and exclusion evidence, and tie-break rules. Remove keyword-only conversation routing. |
| `recommend_ui_workflow_profiles` | Return `artifact-inspector-ui` when the mandatory activity evidence is present. |
| `review_ui_workflow_candidate` | Accept and validate `artifact_centered` topology, work units, transitions, recovery, state groups, and local completion. Return field-specific errors. |
| `create_ui_implementation_contract` | Support `design_system_scopes`, external artifact authority, boundary contracts, and artifact-inspector components. |
| `create_ui_generation_handoff` | Carry the artifact identity, locus model, topology, state groups, authority scopes, and responsive posture without flattening them into workbench defaults. |
| `create_frontend_generation_context` | Accept `judgmentkit.artifact-inspector.v1` and emit the corresponding components, token rules, boundary rules, and browser checks. |
| `review_cognitive_dimensions_candidate` | Check locus-to-action mapping, hidden dependencies, preview versus commitment, progressive evaluation, recovery cost, and disclosure. |
| `review_ui_implementation_candidate` | Enforce structural and static failures; otherwise return `review_required` because the deferred interactive attestation is unavailable. Candidate-authored or static browser evidence cannot satisfy Artifact Inspector authority. |

No new public MCP tool is required if these existing tools consume the versioned
registry definition. A separate registry resource is acceptable, but the same
definition must drive recommendation, handoff, generation, and review.

Artifact Inspector review packets carry a versioned, content-addressed
integrity receipt over the complete decision-bearing review packet, including
the reviewed activity, workflow, surface and profile selection, scoped
authority, and active-state ceiling. Each serialized handoff and frontend
boundary receives a stage-specific receipt over its complete packet. Handoff,
frontend, and skill boundaries must reject a missing, stale, modified, or
cross-stage replayed receipt. The receipts are deterministic across processes
and cold starts so stateless clients may continue a valid packet after a server
restart. They prove packet continuity only: they do not authenticate origin,
confer authority, or replace raw-source and canonical-packet revalidation.

## Review Diagnostics

Diagnostics must be stable, specific, and repairable.

| Code | Meaning |
| --- | --- |
| `JK_ARTIFACT_INSPECTOR_PRIMARY_ARTIFACT_MISSING` | No bounded rendered artifact is declared. |
| `JK_ARTIFACT_INSPECTOR_LOCUS_MODEL_MISSING` | The participant cannot select a semantic artifact locus. |
| `JK_ARTIFACT_INSPECTOR_TOPOLOGY_CONTRACT_MISSING` | No explicit structured artifact-centered topology is declared. |
| `JK_ARTIFACT_INSPECTOR_TOPOLOGY_KIND_INVALID` | The topology kind is not `artifact_centered`. |
| `JK_ARTIFACT_INSPECTOR_WORK_UNIT_ID_MISSING` | A structured work unit has no stable identifier. |
| `JK_ARTIFACT_INSPECTOR_WORK_UNIT_CONTRACT_INVALID` | A required work unit is duplicated or does not preserve its canonical intent and system responsibility. |
| `JK_ARTIFACT_INSPECTOR_ENTRY_REFERENCE_INVALID` | The topology entry does not reference a declared work unit. |
| `JK_ARTIFACT_INSPECTOR_COMPLETION_REFERENCE_INVALID` | Artifact-local completion references an undeclared work unit. |
| `JK_ARTIFACT_INSPECTOR_TRANSITION_REFERENCE_INVALID` | A topology transition references an undeclared work unit. |
| `JK_ARTIFACT_INSPECTOR_RECOVERY_PATH_MISSING` | The topology does not explicitly enter and leave the `recover` work unit. |
| `JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID` | The workflow does not declare the canonical active state groups. |
| `JK_ARTIFACT_INSPECTOR_ARTIFACT_NOT_DOMINANT` | Persistent chrome or supporting context visually displaces the artifact. |
| `JK_ARTIFACT_INSPECTOR_CONTEXT_DETACHED` | Evidence, authority, action, or feedback has no visible or semantic relation to the active locus. |
| `JK_ARTIFACT_INSPECTOR_DRAG_ONLY` | A required interaction has no tap/select and keyboard alternative. |
| `JK_ARTIFACT_INSPECTOR_LOCAL_FEEDBACK_MISSING` | Validation or status appears away from the action that caused it. |
| `JK_ARTIFACT_INSPECTOR_UNCOMMITTED_STATE_AMBIGUOUS` | Preview and committed state are not distinguishable. |
| `JK_ARTIFACT_INSPECTOR_DEFAULT_COMMIT` | A consequential affirmative or outcome is preselected. |
| `JK_ARTIFACT_INSPECTOR_RECEIPT_MISSING` | A consequential result has no inspectable local receipt. |
| `JK_ARTIFACT_INSPECTOR_GUIDANCE_COUPLED` | Current-item commitment and reusable-guidance acceptance occur in one action. |
| `JK_ARTIFACT_INSPECTOR_MOBILE_ARTIFACT_OBSCURED` | Narrow-layout chrome covers the active locus or essential artifact content. |
| `JK_ARTIFACT_INSPECTOR_CHROME_SCOPE_MISSING` | JudgmentKit-owned chrome has no enforceable design-system scope. |
| `JK_ARTIFACT_INSPECTOR_ARTIFACT_SCOPE_MISSING` | The artifact's visual authority is undeclared. |
| `JK_ARTIFACT_INSPECTOR_SCOPE_OVERLAP` | Two authority scopes claim the same visible node without a valid overlay exception. |
| `JK_ARTIFACT_INSPECTOR_STYLE_LEAK` | Styles or tokens cross an authority boundary. |
| `JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED` | Chrome interacts with an artifact locus without a semantic boundary contract. |
| `JK_ARTIFACT_INSPECTOR_NATIVE_ACTION_INTERCEPTED` | Inspector behavior captures a live artifact action without explicit inspection mode. |
| `JK_ARTIFACT_INSPECTOR_TARGET_DRIFT` | An overlay silently moved to a different artifact target. |
| `JK_ARTIFACT_INSPECTOR_ARTIFACT_MUTATED` | A chrome transition changed artifact content or presentation. |
| `JK_ARTIFACT_INSPECTOR_EXTERNAL_AUTHORITY_OVERCLAIM` | The review describes the external artifact as JudgmentKit-conformant. |
| `JK_ARTIFACT_INSPECTOR_KEYWORD_ROUTING_CONFLICT` | Artifact Inspector routing conflicts with mandatory activity evidence, exclusions, the selected surface, or the workflow profile. |

Every diagnostic should include the failing field or selector, the expected
contract, the observed value, and one bounded repair instruction.

## Deterministic Fixture Matrix

### Positive routing fixtures

1. A rendered interface where the participant selects one visible control and
   relates an observation to accepted authority.
2. A document where the participant selects a passage and attaches a
   source-backed correction.
3. A diagram where the participant selects one node and inspects the rule and
   evidence that produced it.
4. A generated composition where the participant marks one region, previews a
   bounded change, and verifies the local result.

Expected: `artifact_inspector` is primary. The artifact remains the primary
object in every generated workflow.

### Negative routing fixtures

1. A queue of generated cases with evidence and approve/reject controls.
   Expected: `operator_review`.
2. A multi-object creation canvas with persistent tools. Expected: `workbench`.
3. A linear evidence memo. Expected: `content_report`.
4. A live support exchange with attachments. Expected: `conversation`.
5. A status overview across many items. Expected: `dashboard_monitor`.
6. A structured submission sequence. Expected: `form_flow`.
7. A structured record-entry task with an incidental artifact preview.
   Expected: `form_flow`; the preview alone does not trigger
   `artifact_inspector`.

### Ambiguity fixtures

1. Queue plus artifact detail: choose `operator_review` when the queue and case
   decision are primary; choose `artifact_inspector` only when locus-specific
   artifact action is required for completion.
2. Whole-artifact approval without locus selection: choose `operator_review`.
3. Read-only artifact with citations but no local action: choose
   `content_report`.
4. A visual object called an `authority thread`: do not choose `conversation`
   unless message exchange is the activity.
5. Several artifacts compared side by side: choose `workbench` unless one
   artifact remains primary and every comparison is subordinate to it.

### Authority-boundary fixtures

1. JudgmentKit chrome plus externally styled artifact with isolated scopes.
   Expected in this release: chrome, overlay, and boundary remain
   `review_required`; the artifact remains `external_not_reviewed`.
2. Global JudgmentKit reset changes artifact typography. Expected:
   `JK_ARTIFACT_INSPECTOR_STYLE_LEAK`.
3. Artifact CSS changes chrome buttons. Expected:
   `JK_ARTIFACT_INSPECTOR_STYLE_LEAK`.
4. Annotation overlay is visually over the artifact but has no declared owner.
   Expected: `JK_ARTIFACT_INSPECTOR_SCOPE_OVERLAP` or missing scope.
5. Chrome is mislabeled as an external artifact to avoid token checks.
   Expected: external-authority overclaim or chrome-scope failure.
6. A chrome state transition changes artifact bytes or computed presentation.
   Expected: `JK_ARTIFACT_INSPECTOR_ARTIFACT_MUTATED`.
7. A live artifact's native action is intercepted without inspection mode.
   Expected: `JK_ARTIFACT_INSPECTOR_NATIVE_ACTION_INTERCEPTED`.
8. An artifact revision changes target geometry and the overlay attaches to a
   different target. Expected: `JK_ARTIFACT_INSPECTOR_TARGET_DRIFT`.

### Interaction fixtures

- pointer drag succeeds;
- select-then-target succeeds;
- keyboard-only succeeds;
- touch path succeeds without hover;
- invalid target explains itself locally;
- unavailable context cannot become accepted support;
- Back removes only the current preview;
- known failure preserves an uncommitted choice;
- unknown result reconciles before retry;
- narrow layout preserves the artifact, active locus, feedback, and recovery.

### Compatibility and determinism fixtures

- Existing surface inputs produce their prior canonical outputs.
- An older schema receiving `artifact_inspector` returns an explicit
  unsupported-profile diagnostic with no silent fallback.
- Repeated generation from the same fixture produces byte-identical canonical
  contracts, diagnostics, reports, and hashes.

## Contract release acceptance criteria

The interaction-model and contract release is ready only when:

1. Positive, negative, and ambiguity routing fixtures select the expected
   surface without keyword-only overrides.
2. Queue-primary, creation, conversation, report, monitoring, configuration,
   and explicitly secondary-artifact activities retain their legacy surfaces.
3. Workflow review accepts only the canonical `artifact_centered` topology,
   eight work units, participant intent, system responsibility, transitions,
   entry, completion, and connected recovery path.
4. Compatible artifact and target aliases canonicalize into `workflow.*`;
   conflicting or malformed aliases fail during review.
5. Handoff, frontend context, and skill compilation revalidate the same
   surface, profile, topology, work-unit, artifact, target, state-group, and
   authority invariants.
6. Only activity-justified state groups can remain active; caller metadata or
   packet mutation cannot activate another group.
7. The scoped authority declaration requires exactly the three canonical
   scopes and exactly the three canonical boundary roles.
8. The profile serializes its canonical navigation, wide, narrow, and external
   artifact ownership guidance while remaining `runtime_renderer: false`.
9. Deterministic contract and static violations fail with bounded diagnostics
   and repair instructions.
10. An otherwise valid Artifact Inspector implementation always remains
    `review_required`, exposes no runnable attestation action, and emits no
    pass or accepted-artifact result.
11. The primary artifact always remains `external_not_reviewed`.
12. Existing routing, Workbench behavior, generic visual-composition review,
    component registry, and component specimens remain unchanged.
13. The same versioned registry definition drives recommendation, workflow
    review, implementation handoff, frontend context, skill context, and
    fail-closed implementation review.

## Deferred interactive-runtime acceptance criteria

A later dedicated project must satisfy every item below before an Artifact
Inspector implementation can pass:

- a runnable, deterministic state driver for every required state, transition,
  cancellation, recovery route, and artifact revision;
- real CDP pointer, touch, and keyboard traces with trusted event targets,
  paths, locus identifiers, and native behavior;
- accessibility-platform traces for names, roles, relationships,
  announcements, and assistive-technology crossings;
- focus order, focus entry, cancellation, recovery, and focus return;
- overlay geometry, obstruction, occlusion, and responsive safe areas;
- semantic target drift and re-anchoring to the same target, or explicit stale
  or unavailable behavior;
- native-action precedence outside explicit inspection mode;
- bidirectional style isolation and artifact fingerprints before and after each
  governed transition;
- all seven required states in both desktop and narrow viewports;
- separate chrome, overlay, artifact-preservation, and boundary results; and
- an opaque, replay-resistant attestation bound to trusted issuer/verifier
  versions, candidate digest, normalized contract digest, state-driver digest,
  artifact revision, observation digests, run identity, nonce, and timestamp.

Static roots, unchanged fingerprints, canonical metadata, or caller-authored
receipts cannot substitute for these observations.

## Contract release shape

This release adds:

- a versioned interaction-model registry entry;
- schemas for `artifact_centered` topology and mixed authority declarations;
- deterministic routing, workflow, serialization, profile, authority, MCP, and
  legacy-isolation tests;
- stable structural and missing-attestation diagnostics; and
- a fail-closed implementation-review result.

It deliberately does not add Artifact Inspector measurement logic to the
static visual-composition browser runtime, a runnable state driver, an
accepting receipt schema, or a public evidence-ingestion API.

## Compatibility and rollout

- Add the model as a versioned, additive registry entry.
- Preserve existing surface behavior unless all mandatory Artifact Inspector
  activity evidence is present.
- Return `artifact_inspector_profile_unsupported` when a caller cannot consume
  the profile; never silently downgrade it.
- Keep `judgmentkit.artifact-inspector.v1` immutable after release.
- Keep the 17 profile component roles conceptual and contract-only; they are
  not component-registry implementations or approved runtime primitives.
- Keep every current Artifact Inspector authority result `review_required`
  until the deferred interactive-attestation project is separately released.

## Definition of done for this release

JudgmentKit can identify an artifact-centered activity, validate and serialize
its canonical workflow, declare scoped authority without claiming the external
artifact, preserve the contract through every downstream boundary, and reject
structural drift. Implementation review remains honestly fail-closed at
`review_required` because trusted interactive attestation is outside this
release.
