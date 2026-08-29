# JudgmentKit component library implementation plan

Status: Reference accounting and local candidate complete; full expanded evidence pending; PR preparation authorized, release and promotion remain unauthorized

Date: 2026-08-27

Source audit: [`figma-component-inventory-audit-2026-08-27.md`](./figma-component-inventory-audit-2026-08-27.md)

## Recommendation

Use the Simple Design System as the complete reference denominator for component families and variants, not as JudgmentKit's visual style.

JudgmentKit must account for all 122 public and six hidden Figma families, including all 354 variants. Every family receives one explicit disposition: public component, variant of another component, internal compound part, reusable pattern, template, or Figma authoring helper. Patterns and templates remain part of parity even when a standalone runtime export would be the wrong result.

Keep four claims separate:

1. Inventory parity: every Simple Design System family and variant is recorded.
2. Family disposition: every recorded family has a JudgmentKit classification and owner.
3. Variant semantics: every documented variant axis has a JudgmentKit semantic classification; singleton masters introduce no axis combinations.
4. Runtime and evidence: local implementations, represented scenarios, and currently verified behavior are reported separately.

Runtime work proceeds in dependency order. It does not copy Simple Design System colors, typography, spacing, radii, or brand styling, and it does not create one React export per Figma family.

Standalone icons are outside this plan. Under `judgmentkit_default`, JudgmentKit's existing icon library remains complete for this work. A complete `external_design_system` remains authoritative for its own icons and receives no JudgmentKit fallback. Icon-bearing controls still need accessible names and control behavior, but this plan includes no glyph, catalog, mapping, adapter, or parity work.

## Historical Phase 0 decision

On 2026-08-28, before the later reference-parity expansion was approved, the product owner authorized correcting the contract and specimen authority and building a bounded five-component runtime pilot.

- Package boundary: optional in-package React adapter at `judgmentkit/react`; stylesheet at `judgmentkit/react/styles.css`.
- Isolation: the root `judgmentkit` export, CLI, and MCP remain framework-neutral and must not load React, React DOM, browser globals, or component CSS.
- Framework: React 19 as a consumer-supplied peer. The adapter uses native DOM semantics and plain CSS rather than MUI or Emotion.
- First consumer: `/design-system/components/`, replacing hand-authored pilot specimens with the shipped adapter.
- Pilot: `FormField`, `TextField`, `ActionButton`, `Toggle`, and `StatusMessage`.
- Browser claim: Chromium automation at 1365×900 and 390×844, with the exact `Browser.getVersion` value recorded in each evidence run. Firefox, WebKit, and assistive-technology support are not claimed without later evidence.
- Proof: truthful scenario coverage, one React runtime in a packed consumer, real keyboard and pointer behavior, visible focus, responsive reflow, zero automated accessibility violations in the verified scenarios, and a separate reviewer-authored accessibility receipt.
- Release authority: Mike approves any commit, push, PR, package publish, deployment, promotion, release, or consumer migration beyond the site. None is authorized by this plan execution.
- Standalone icons remain unchanged.

## Approved reference-parity expansion

On 2026-08-28, the product owner approved expanding JudgmentKit's design system with the Simple Design System as the component-and-variant reference.

- Denominator: 122 public families with 336 variants, plus six hidden families with 18 variants.
- Styling boundary: component taxonomy, anatomy, meaningful properties, states, variants, and responsive conditions are reference inputs; Simple Design System styling is not imported.
- Normalization: all 128 families stay in the canonical inventory, including patterns, templates, internal parts, and authoring helpers.
- Runtime: admitted components are implemented in dependency-ordered tranches and verified against JudgmentKit's own contracts.
- Icons: standalone icons remain excluded because JudgmentKit's icon library is already complete. Icon-bearing components remain in scope.
- Release boundary: the product owner separately authorized commit, push, and a review PR on 2026-08-28. Package publish, deployment, promotion, release, and consumer migration remain separate decisions.

## Local execution result

The current worktree contains an unreleased adapter candidate:

- Reference accounting is complete: 128/128 families and 354/354 Figma masters are present; standalone icons are excluded.
- Family disposition is complete: 128/128 families are classified as components, variants, internal parts, patterns, templates, typography roles, or authoring helpers.
- Variant semantics cover the 304 masters in documented variant sets across 105/105 classified axes. The remaining 50 are validated singleton masters, with one partial and 49 lacking axis metadata.
- The canonical registry has local implementation candidates for all 17 contract IDs. `judgmentkit/react` exposes 18 named symbols because `CheckboxField` is a supporting primitive.
- All 65 required-state scenarios are represented on `/design-system/components/`; no parallel `jk-sample-*` controls remain.
- Current bound verification remains 0/65. Inventory, contract, unit, site-integration, packed-consumer, focused mobile interaction, desktop light/dark, mobile-light static, and direct desktop-light/mobile-dark visual checks pass, but the aggregate browser run stopped on one nondeterministic `dialog.ready` reopen and produced no 260-presentation candidate. The earlier five-component receipt is historical baseline evidence only.
- Twenty-five reference families / 114 source variants map to implemented contracts. Exact Figma variant runtime evidence remains 0/354 because contract mapping is not tuple-level Figma proof.
- Firefox, WebKit, screen-reader compatibility, forced-colors support, reduced-motion support, and Figma styling parity are not claimed without current evidence.
- Commit, push, and a review PR are authorized for this candidate. Package publish, deployment, promotion, release, broader migration, and icon work have not been authorized or performed.

## Activity

The activity is deciding, and when authorized implementing, how JudgmentKit supplies trustworthy interface components to agents and frontend teams.

Participants:

- Product owner: decides runtime ownership, component admission, and promotion.
- Kernel maintainer: owns canonical component meaning, state requirements, and generated projections.
- Frontend implementer: owns any approved runtime package and browser behavior.
- Designer or design-system reviewer: checks anatomy, useful variants, responsive behavior, and relevant Figma alignment.
- Accessibility reviewer: checks keyboard, focus, name-role-value, reflow, status, and overlay behavior.
- Consuming product team: owns product vocabulary, data, geometry, authorization, and domain-specific state.

Objective:

Expand JudgmentKit into a complete, behaviorally honest design system whose reference inventory is traceable to every Simple Design System family and variant. Preserve the framework-neutral kernel boundary, normalize composition families without inventing fake primitives, and expose runtime claims only when implementations and current evidence exist.

## Completion definition

| Layer | Completion definition |
| --- | --- |
| Inventory | All 128 reference families and 354 variants are present in one machine-readable source; standalone icons are explicitly excluded. |
| Family disposition | Every reference family is classified and mapped to a JudgmentKit component, variant, internal part, pattern, template, typography role, or authoring helper. |
| Variant semantics | Every documented axis is classified and every non-Cartesian combination is enumerated; singleton masters are validated separately. |
| Runtime and evidence | Every admitted runtime contract has a local export and complete required-state scenarios; verified coverage requires current package, browser, accessibility, and reviewer evidence. |

Neither 128 reference families nor the current semantic contracts imply the same number of public exports. The normalization kind decides whether a family belongs in the component API, inside a compound component, or in the composition catalog.

## Baseline authority and constraints at audit time

- The renderer and component package were deferred in `README.md:83` and `src/index.mjs:6220-6224` before the Phase 0 decision amended those authorities.
- Runtime renderers and reusable components stayed with the implementing product under `DESIGN.md:26-32` before the approved optional-adapter boundary was added.
- The canonical component contracts live in `contracts/ai-ui-generation.activity-contract.json:554-1285`.
- A second `renderer_components` list uses a different namespace at `contracts/ai-ui-generation.activity-contract.json:1665-1684`.
- The package exports no component entry point at `package.json:18-22`.
- Required state, browser, and accessibility evidence is defined at `contracts/ai-ui-generation.activity-contract.json:498-531`.
- Public specimens are generated separately in `site/build-site.mjs:5346-5683`; their state markers are not interaction proof.

## Phase applicability

- Phases 0-2 run for both outcomes.
- Phases 3-7 require explicit runtime-package authorization.
- Publishing, deployment, consumer migration, and promotion remain separate release decisions.

## Scope

Always in scope:

- Maintain complete Simple Design System family-and-variant accounting.
- Normalize every reference family without copying its styling.
- Reconcile component authority and classify the 17 semantic contracts.
- Repair false or overstated specimen evidence.
- Define an evidence gate for component admission.
- Expand the approved runtime in dependency order.

Runtime path only:

- Select a package boundary, framework, dependency contract, browser support matrix, and first consumer.
- Build a browser harness and package-consumer test path.
- Implement an approved pilot and later component tranches.
- Migrate public specimens to real implementations where authorized.

Out of scope:

- Standalone icons and icon-library work.
- Pixel-for-pixel Figma parity.
- Copying Simple Design System colors, typography, spacing, radii, or brand styling.
- Treating AI Chat, form, example, section, and specialized-card compositions as public primitives when they belong as patterns or templates.
- Calendar or date-picker runtime implementation before locale, range, disabled-date, keyboard, and timezone behavior is explicit.
- Product-specific navigation information architecture.
- A component API for every typography style.
- Release actions without separate authorization.

## Phase 0: make the product and architecture decisions

Priority: High

Write a short feature spec and ADR that resolve these decisions separately:

1. **Runtime ownership:** contract-only, optional JudgmentKit runtime package, or both as separate workstreams.
2. **Package boundary:** a separate workspace package or a subpath module inside the existing package. Do not call an in-package module separate from the kernel.
3. **Framework:** React, another framework adapter, or framework-neutral runtime. Choose from first-consumer requirements rather than current dependencies alone.
4. **Design-system source:** a JudgmentKit runtime package can serve `judgmentkit_default`; complete external adapters remain isolated and authoritative.
5. **Browser support:** name the supported browsers and viewports before making coverage claims.
6. **Pilot tranche and proof:** approve a small set of existing contracts and measurable consumer-proof thresholds, such as duplicated controls avoided, integration and review effort against a recorded baseline, adapter exceptions, and unresolved behavior or accessibility findings.
7. **Release ownership:** name who can approve versioning, publishing, migration, and promotion.
8. **Canonical authority update:** if runtime ownership is approved, amend `README.md`, `DESIGN.md`, the contract's adapter/deferred-renderer boundary, and `src/index.mjs` so they agree before runtime implementation begins. An ADR alone does not override those sources.

If React is selected, define it as a peer dependency with a supported version range and verify that the consumer does not receive a bundled duplicate.

Exit criteria:

- The product owner has approved the outcome and ownership model.
- The ADR names the first consumer, package/API boundary, framework, design-system-source mode, browser support, styling boundary, pilot, proof thresholds, and release owner.
- Standalone icons are explicitly excluded.
- A contract-only decision stops before Phase 3.
- A runtime decision does not enter Phase 3 until every canonical deferred-authority source reflects the approved boundary.

## Phase 1: establish one component authority

Priority: High

1. Reconcile `component_contracts` and `renderer_components` into one canonical registry.
2. Classify each of the 17 contracts as a public runtime component, composed behavior, internal primitive, or contract-only guidance.
3. Define `renderer_components` as an implementation-availability projection, not a semantic-capability list. Under the contract-only outcome it is empty; canonical semantic guidance remains in `component_contracts`.
4. For runtime components, map only shipped exports to canonical IDs and include `implementation_status`, package/export provenance, and declared evidence scenarios. Keep current verified results in the scenario manifest rather than making installed export availability depend on a repository-local receipt.
5. Generate public projections instead of maintaining duplicate lists.
6. Keep `local_component_authority.mode` at `none` unless a consuming repository independently declares its own repo-local component authority. JudgmentKit's default package belongs under `design_system_source`, not that consumer field.
7. Define admission metadata: purpose, use and avoid conditions, anatomy, meaningful states, accessibility checks, review checks, failure signals, implementation status, and evidence scenarios.

Exit criteria:

- All 17 contracts have an explicit classification.
- One ID taxonomy drives every generated projection.
- No duplicate or mismatched names remain.
- `renderer_components` never claims an implementation without shipped-export provenance and declared evidence scenarios; `covered_states` stays empty when current evidence is absent or stale.
- Runtime mappings, when present, fail validation on missing IDs, undocumented exports, duplicate semantics, unapproved states, or stale provenance.
- Figma is the complete family-and-variant reference denominator; JudgmentKit's normalized contracts remain the behavior authority.

## Phase 2: make current evidence truthful

Priority: High

1. Repair the false `radio_group` empty specimen so empty means no selected option.
2. Stop copying `required_states` directly into public `covered_states`.
3. Create a scenario manifest derived from the canonical `contract_id × required_state` keys. Each scenario is `visual_only`, `unverified`, `verified`, or `not_applicable` with a rationale.
4. Emit a covered state only from a `verified` scenario ID bound to the current contract and rendered artifact or implementation hash. Contract-only, internal, and not-yet-implemented items default to `visual_only` or `unverified`.
5. Remove or downgrade focus and interaction claims that the static specimens cannot prove. A marker on a non-focusable wrapper does not count.
6. Label remaining static examples as visual specimens until runtime behavior exists.
7. Add static regression tests for corrected claims. Actual computed focus and interaction evidence begins with the Phase 3 browser harness.

Exit criteria:

- No public specimen claims behavior it has not exercised.
- The radio empty-state regression test passes.
- Every covered-state claim resolves to a current `verified` scenario; other statuses cannot satisfy coverage.
- Static visual examples and interactive examples are clearly distinguished.
- The contract-only outcome is complete when Phase 1 authority work and these truth corrections are documented and passing.

## Phase 3: build the approved package spine and test harness

Priority: High

Entry condition: runtime-package authorization from Phase 0 and amended canonical sources that no longer describe the approved runtime work as deferred or product-owned elsewhere.

1. Implement the approved package or subpath boundary and stylesheet contract.
2. Keep product state, product data, authorization, geometry, and vocabulary with consumers.
3. Prefer native DOM semantics and existing semantic tokens for the pilot.
4. Do not adopt MUI or Emotion as the component foundation simply because they support current comparison work.
5. Add a small local fixture gallery bundled with the existing `esbuild` dependency.
6. Add a trusted component-browser harness. Reuse the repository's Chromium startup, connection, viewport, and cleanup patterns without weakening the CSP used for untrusted visual-composition candidates.
7. Add and pin `axe-core` as a local test dependency. Combine it with accessibility-tree assertions and real keyboard input. Axe violations fail the gate; the initial package has no accessibility-waiver path. A reproducible tool false positive must be fixed in the test or handled under a separately authorized exception policy without waiving required behavior.
8. Add package-consumer smoke coverage using the existing `npm pack`, temporary install, and import pattern. If React is selected, require the packed manifest to declare React as a peer, let the fixture supply it, exclude React from the adapter bundle, and verify that the installed fixture resolves one compatible React runtime.
9. If an in-package adapter is selected, add a clean non-React consumer smoke test. Importing the root library or running CLI/MCP paths must not load React, React DOM, browser globals, component CSS, or adapter side effects.

Proposed test surface:

| Layer | Proposed file | Proposed command |
| --- | --- | --- |
| Registry | `tests/components/component-contract-registry.test.mjs` | `npm run test:components:contracts` |
| State model | `tests/components/component-state-model.test.mjs` | `npm run test:components:unit` |
| Browser | `tests/components/component-browser.test.mjs` | `npm run test:components:browser` |
| Site | `tests/components/component-site-integration.test.mjs` | `npm run test:components:site` |
| Package | `tests/components/component-package-surface.test.mjs` | `npm run test:components:pack` |

Add `npm run test:components` as the component pull-request gate. Make `npm test` invoke it and require it in CI so the repository cannot pass while skipping component behavior. Keep `npm run test:site` as the site integration gate.

Browser evidence starts with the approved support matrix. `test:components:browser` must exit nonzero when a supported engine is unavailable, a required component/state/viewport is skipped, or the harness cannot produce evidence. If automation covers Chromium only, documentation must say Chromium rather than implying Firefox or WebKit coverage. Add those browser gates before claiming their support. The existing 1365×900 and 390×844 sizes are proposed desktop and mobile fixture defaults, not product requirements.

Appearance scenarios should emulate light/dark preference and, when applicable, forced colors and reduced motion. Tests should inspect computed behavior and semantics rather than relying on screenshots alone.

### Interaction-substrate gate

Before implementing focus-managed composites, run a bounded spike and choose one shared approach: platform behavior, one approved maintained headless dependency, or custom state machines. Native Select can remain independent.

The spike must decide:

- Tabs activation, orientation, arrow-key, Home/End, wrapping, and disabled-tab behavior.
- Menu Home/End, typeahead, Tab, dismissal, and focus-return behavior.
- Dialog modal versus nonmodal support, initial focus, containment, dismissal, and focus return.

Exit criteria:

- A temporary consumer can install, import, bundle, and render the pilot package boundary.
- Framework peer/runtime dependencies behave as approved; if React is selected, the packed consumer proves one peer-supplied compatible runtime and no bundled duplicate.
- The stylesheet subpath resolves in a clean consumer.
- Root imports and CLI/MCP paths remain framework-neutral and side-effect free when the adapter is an in-package subpath.
- External network access is blocked during component tests.
- The scenario manifest, accessibility scanner, browser harness, and CI component gate all run and fail closed on missing required evidence.
- One interaction substrate is approved before Tabs, Dialog, or Menu implementation.

## Phase 4: implement and evaluate the runtime pilot

Priority: High

Proposed pilot, subject to Phase 0 and Phase 1 classification:

- `form_field` plus `text_field`, proving shared label, help, error, disabled, and focus machinery.
- `action_button`, proving activation, accessible naming, disabled/loading suppression, and action copy.
- `toggle`, proving controlled state, keyboard behavior, and name-role-value.
- `status_message`, proving loading/error/result semantics and live-region policy.

The pilot is successful only when a real consumer uses it and meets the Phase 0 proof thresholds for duplicated controls avoided, integration and review effort against the recorded baseline, adapter exceptions, and unresolved behavior or accessibility findings.

Pilot evidence:

- Unit tests for values, callbacks, disabled behavior, and transitions.
- Real Enter, Space, Tab, and pointer input where applicable.
- Focused-element and computed focus-treatment checks.
- Accessibility-tree checks for names, roles, values, descriptions, errors, and live regions.
- A current reviewer-authored accessibility receipt covering keyboard and focus walkthroughs, supported browsers, applicable assistive-technology checks, unresolved findings, and not-applicable rationales. This receipt is separate from `npm test`.
- Long-label and mobile reflow scenarios.
- Light and dark presentation checks.
- Packed-consumer import, stylesheet, render, and representative interaction checks.

Exit criteria:

- The pilot maps cleanly to its canonical contract classifications.
- Every claimed state is backed by a current `verified` scenario bound to the current implementation hash and passing evidence.
- The first consumer can use the pilot without importing kernel machinery into product UI.
- The accessibility receipt contains no unresolved required-behavior failure.
- The component gate, packed-package smoke, and full repository regression gate pass before expansion.
- The product owner approves expansion, correction, or termination of the runtime path.

## Phase 5: expand existing contracts in dependency order

Priority: Medium

Entry condition: the pilot has passed and expansion is approved.

### Shared field and native-control work

- `text_area` and `select_field` compose the approved `form_field` label/help/error machinery.
- CheckboxOption and RadioOption reuse shared field infrastructure where it applies.
- CheckboxGroup and RadioGroup own group semantics and keyboard behavior.
- Native Select v1 tests label, selected value, error, disabled, and focus behavior without asserting inaccessible browser-popup internals.

### Actions, feedback, and content structures

- `action_group` composes the approved action-button behavior.
- `alert` aligns with the status-message announcement policy without duplicating it.
- `panel`, `card`, and `table` implement only the runtime responsibilities approved in Phase 1.

### Focus-managed composites

- `tabs`, `dialog`, and `menu` use the approved interaction substrate and the behavior decisions recorded in Phase 3.
- Keyboard walkthroughs prove actual movement, dismissal, containment, activation, and focus return.

The remaining canonical contracts move in reviewable tranches. Phase 1 classification may leave some as composed behavior, internal primitives, or contract-only guidance rather than public exports.

Exit criteria for each tranche:

- Approved runtime mappings trace to canonical IDs.
- Scenario expectations are derived from the current registry rather than a hard-coded state count.
- Keyboard and accessibility behavior passes for every interactive export.
- Packed-package smoke imports every public export in the tranche and renders at least one scenario per component.
- Long content does not overlap, truncate required text, or create unintended horizontal overflow.

## Phase 6: fold partial mappings and admit new families

Priority: Medium

Treat current partial mappings as existing-contract work unless consumer evidence proves otherwise:

| Figma family | Planned treatment |
| --- | --- |
| Button Danger | Destructive `action_button` variant with separate confirmation evidence. |
| Icon Button | `action_button` variant with accessible-name and target-size evidence. No icon-library work. |
| Card (Slot) | Composition API on `card`. |
| Dialog Body | Internal dialog body/sheet composition unless direct consumer use justifies export. |
| Checkbox Field | Compose `form_field` with CheckboxOption semantics. |
| Radio Field | RadioOption within RadioGroup; do not create a standalone field wrapper without evidence. |
| Menu Header, Heading, Item, Separator, Shortcut | Internal menu parts first; export only direct consumer needs. |
| Tab | Internal tabs item first; export only if direct composition is supported. |

For currently missing families, use this proposed governance rule: require evidence from at least two unrelated grounded activities before promoting a JudgmentKit-wide reusable component. The product owner must approve that threshold. One high-stakes activity may justify a product-owned implementation, but it does not by itself prove cross-domain JudgmentKit ownership.

Candidate queue after the pilot proves the runtime boundary:

- Accordion.
- Search Field, evaluated first as a TextField specialization.
- Slider/range field.
- Pagination.
- Tag as noninteractive labeling/status and TagToggle as a separate interactive choice decision.
- Tooltip.

Deferred until stronger activity evidence:

- Calendar, date input, and date picker: the admitted activity determines which locale, range, disabled-date, timezone, and keyboard requirements apply.
- Navigation families: wait for a grounded product information architecture.
- Avatars: keep product-owned unless repeated cross-domain behavior appears.
- All 18 Text families: use semantic HTML and typography/token authority rather than one component API per style.

The 54 AI Chat, form, example, section, and specialized-card compositions remain consumer-owned. Hidden annotations and slots remain authoring helpers.

Exit criteria:

- Every considered family has an admit, fold, defer, consumer-owned, or reject decision.
- Every admission includes approved governance evidence and a behavior contract.
- Figma presence or variant count alone never moves an item into implementation.
- Public exports remain smaller than the internal implementation surface.

## Phase 7: migrate specimens, dogfood, and release

Priority: Medium

Entry condition: runtime-package authorization and a passing pilot.

1. Migrate design-system pages one tranche at a time.
2. Keep static specimens during migration and remove them only after contract and state parity.
3. Derive public specimen metadata from the canonical registry.
4. Link each covered-state claim to its passing scenario ID and current hashes.
5. Exercise the packed package in the approved consumer set before promotion.
6. Import every public export from the tarball, resolve the stylesheet, render one scenario per component, and exercise representative focus-managed controls.
7. Pass the component gate, site gate, full repository tests, package smoke, responsive browser review, and visual QA.
8. Produce a current reviewer-authored accessibility receipt covering keyboard/focus walkthroughs, supported browsers, applicable assistive-technology checks, unresolved findings, and not-applicable rationales. Automated tests cannot replace this receipt.
9. Block promotion on any unresolved required failure. A release-owner decision cannot convert failed required evidence into a pass.
10. Treat versioning, publishing, deployment, and consumer migration as separate release-owner decisions.

Exit criteria:

- Runtime-backed design-system pages use the canonical registry.
- No duplicate hand-written implementation remains for migrated components.
- The approved consumer evidence and governance threshold are satisfied.
- Documentation names supported components, states, accessibility expectations, browser coverage, and migration boundaries.
- The release owner makes an explicit promotion decision.

## Release evidence for each runtime component

- Canonical contract classification and approved API mapping.
- Unit evidence for state and event behavior.
- Real-browser keyboard and pointer evidence.
- Focus order, focus visibility, and focus-return evidence where applicable.
- Accessibility-tree evidence plus a passing automated scan. Required failures have no waiver path in this plan.
- A current reviewer-authored accessibility receipt distinct from automated test output.
- Desktop and mobile content-stress evidence under the approved support matrix.
- Conditional forced-colors, reduced-motion, target-size, focus-obstruction, hover/focus-content, and status-announcement evidence when applicable.
- Packed-consumer import, stylesheet, render, and interaction evidence.
- Public specimen linked to the same registry and implementation.

## Main risks

| Risk | Response |
| --- | --- |
| The kernel becomes a generic design-system project. | Keep runtime ownership separately authorized and classify contracts before creating exports. |
| Figma parity replaces product judgment. | Treat Figma as reference evidence and require a behavior contract plus approved cross-domain use. |
| Two component registries drift again. | Generate every projection from one canonical registry. |
| Static markers continue to overstate behavior. | Derive covered states from current passing scenarios and hashes. |
| Composite controls ship with incomplete keyboard behavior. | Approve one interaction substrate and explicit behavior contracts before implementation. |
| The package surface grows faster than consumer need. | Start with a pilot and keep subcomponents internal until direct use justifies export. |

## First review decisions

The first review should decide, in order:

1. Contract-only work or JudgmentKit runtime ownership.
2. Separate workspace package or in-package adapter module.
3. Framework and consumer dependency contract.
4. Applicable `design_system_source` mode and external-adapter isolation.
5. Browser support matrix and test viewports.
6. Pilot contract classifications and first consumer.
7. Cross-domain admission threshold.

Phases 1-2 begin after the contract-only scope is accepted. Phase 3 begins only after the runtime decisions are approved.
