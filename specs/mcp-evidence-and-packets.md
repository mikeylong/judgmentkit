# MCP evidence admission, observed promises, and compact packets

## Activity and completion

An implementing agent carries reviewed product intent into a working interface,
submits evidence, and repairs the failures that matter to its intended user.
The builder supplies intent and consequential decisions. The agent owns packet
preparation and verification. A domain source supplies expected data or governing
rules. The reviewer distinguishes a malformed submission, a failed implementation,
and behavior that remains untested.

Completion means the agent receives an actionable review without losing the
activity's raw source, implementation authority, or verification limits. The
builder sees the working result and knows which important promises were observed.

## Evidence admission

1. `preflight_ui_implementation_candidate` and the CLI command
   `judgmentkit preflight-implementation --input evidence-request.json` use the same
   admission validator. Preflight checks evidence structure and declared selectors before substantive
   review. Repairs name the affected field or selector and the necessary change.
2. A malformed submission receives `repair_evidence_packet`, reports that no
   substantive review was performed, and consumes no implementation repair attempt.
   Admission is distinct from evidence that validly describes a failing interface.
3. Admission does not grant product acceptance, trust candidate claims, or waive
   an active design-system or authority requirement. Missing supported evidence
   remains visible in the subsequent review.
4. The kernel remains stateless. Attempt accounting is explicit in the returned
   packet; the implementing client retains its loop state.

## Observing an interface's promise

Chart review begins with the reviewed activity's promise and contract-attributed expected
data. The implementation contract owns that oracle and required snapshots. The
candidate supplies the render and selectors, not the expected truth. A source
reference attributes that oracle; the browser does not independently authenticate
the source or establish that its data is true.

The supported static browser path measures label collisions and clipping and
compares rendered chart data with the contract's expected selected dataset at the
required viewports. It binds observations to the exact candidate, contract, and
rendered document. Candidate-authored claims cannot produce trusted observations.

Coverage separates observed checks, declared evidence, and untested behavior.
A static snapshot cannot establish that a live location or day transition works.
This path does not certify usability or WCAG compliance and does not satisfy the
Artifact Inspector's deferred interactive-attestation requirement.

## Compact continuation contract

Planning and review tools accept optional `packet_format: "compact"`; `full` is the
compatible default. Compact output has schema `judgmentkit.compact-packet/v1` and
contains:

1. `active_guidance`: the current activity, interaction, selected authority,
   instructions, questions, outcomes, and focused repairs. Repeated catalogs and
   calibration tables stay in the continuation. Before implementing a rule that
   needs those details, expand the continuation.
2. `continuation`: a lossless Brotli-base64 encoding of the complete kernel packet,
   its exact uncompressed byte count, and its SHA-256 continuity digest.
3. `serialization_metrics`: actual UTF-8 JSON byte counts for the full and compact
   packet. Byte reductions do not establish token, monetary, or model-effort savings.

Named downstream packet fields accept the complete compact envelope.
`compactImplementationCandidate` prepares a bounded `ui_implementation_candidate`
continuation for the `candidate` field of preflight or implementation review,
including all exact frozen chart snapshots. Its readable summary names selectors,
state ids, and source hashes without repeating the HTML. The MCP
decodes it before ordinary kernel validation. Kind, encoding, JSON structure,
digest, and a four-MiB expansion limit are checked before review. Nested envelopes
are rejected. `active_guidance` is a readable projection and is never used as
downstream authority.

Exact current `brief` and attributed `context_items` still accompany validating
boundaries. Compression and a recomputable digest cannot authenticate authority
or replace raw-source revalidation. Full and compact paths must produce identical
kernel judgments after decoding.

Clients can use `compactPacket` and `expandCompactPacket` from `judgmentkit/packets`
to prepare or inspect continuations. Use `compactImplementationCandidate` for
implementation evidence that would otherwise exceed HTTP admission. Existing full packets remain valid. The
transport's 128-KiB request limit remains in place.

## Regression evidence

The Tide receipts exposed interpretation, unsupported routing, selector-only
repairs, and unreadable charts. The Artifact Inspector generation session exposed
a 345,901-byte request rejected at HTTP admission and subsequent evidence-only
repairs. They motivate general MCP behavior; neither application is a product
implementation target for this change.

Tests cover exact raw-source continuity, default-full compatibility, focused
guidance, bounded decoding, tampering, malformed packets, substantive failures,
chart geometry and contract-data comparisons, and separate observed/untested
coverage. Local stdio receipts demonstrate the new service, while replayed
historical requests remain labeled as historical evidence rather than new hosted
acceptance or new model generation.
