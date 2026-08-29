# Component library unreleased adapter candidate

Status: 17 canonical implementations and 65 scenarios represented locally; expanded evidence pending; not released

Date: 2026-08-28

Decision record: [`../docs/decisions/ADR-0002-optional-react-component-adapter.md`](../docs/decisions/ADR-0002-optional-react-component-adapter.md)

## Activity

Agents and frontend teams are implementing interfaces from JudgmentKit's semantic component contracts. They need to know which contracts are guidance and which components actually exist, then use a small trusted runtime without copying specimen markup or importing kernel machinery into product UI.

## Participants

- Product owner: admits components, evaluates the candidate, and authorizes any release.
- Kernel maintainer: owns canonical component meaning, classification, required states, and generated projections.
- Adapter maintainer: owns the optional React exports, stylesheet, browser behavior, and evidence binding.
- Accessibility reviewer: authors the keyboard, focus, semantics, reflow, and assistive-technology receipt.
- Consuming frontend team: owns product vocabulary, data, authorization, geometry, and domain state.

## Objective

Make JudgmentKit's component authority honest and usable. A consumer must be able to distinguish semantic guidance, local implementation candidates, and currently verified behavior; import the optional adapter through an isolated React boundary; and trace every public behavior claim to current evidence.

## Outcomes

- One canonical registry classifies all 17 semantic contracts.
- `renderer_components` lists only local runtime exports with package and declared evidence-scenario provenance; verified state coverage remains a separate current-evidence claim.
- Static specimens never present required states as verified behavior by default.
- The public component page consumes the same candidate exports available to a packed consumer.
- Root library, CLI, and MCP paths remain framework-neutral and side-effect free.
- Standalone icons and the existing icon catalog remain unchanged.
- The historical five-component pilot remains baseline evidence; it does not verify the expanded candidate.
- Simple Design System supplies the complete family-and-variant reference denominator without supplying JudgmentKit's styling.

## Existing tools and artifacts

- Canonical semantic contracts in `contracts/ai-ui-generation.activity-contract.json`.
- Kernel schema in `contracts/judgmentkit-kernel.schema.json`.
- Public component route and specimen generator in `site/build-site.mjs`.
- Existing React/esbuild site-island pattern.
- Existing Chromium startup and cleanup utilities in the browser verification paths.
- Existing `npm pack` consumer-smoke pattern used by the presentation theme.
- Canonical Simple Design System reference inventory for complete family-and-variant accounting and normalization.

## Rules and rituals

- Activity and interaction contracts remain upstream of presentation choices.
- A semantic contract does not imply a public runtime export.
- A covered state requires a current `verified` scenario bound to the contract, implementation, viewport, and evidence run.
- `visual_only`, `unverified`, and `not_applicable` scenarios cannot satisfy runtime coverage.
- External design-system adapters remain complete and authoritative; they receive no implicit JudgmentKit component fallback.
- Product-specific state, data, vocabulary, geometry, authorization, and side effects stay with the consumer.
- Browser and accessibility tests fail closed when required evidence is skipped or unavailable.
- Commit, push, PR, publishing, deployment, promotion, release, and migration beyond the public component page require separate product-owner approval. Local dependency-ordered expansion was approved on 2026-08-28.

## Division of labor

- JudgmentKit supplies semantic contracts, the runtime registry, optional React primitives, styling roles, and component evidence.
- The public component page proves that the local adapter candidate is usable without a parallel specimen implementation.
- A clean packed fixture proves package isolation and peer-runtime behavior.
- Automated checks prove bounded mechanics; the accessibility reviewer records human walkthroughs and any unsupported claims.
- Mike owns the final promote, expand, correct, or stop decision.

## Interaction contract

The consumer is trying to select a supported JudgmentKit component, understand its meaningful states, integrate it without pulling the kernel into the UI, and know what evidence is current.

They think about the work as components, props, states, validation, and user outcomes. They do not think about it as contract-internal object paths, MCP tools, resource ids, or renderer bookkeeping.

Primary decisions:

- Is this contract implemented, composed, internal, or guidance-only?
- Which public export maps to it?
- Which states are currently verified?
- What remains the consumer's responsibility?

Make easy:

- Importing only the optional React adapter and its explicit stylesheet.
- Finding purpose, use and avoid guidance, anatomy, states, and evidence together.
- Using native labels, buttons, switch semantics, status regions, and disabled behavior.
- Seeing honest unsupported or unverified states.

Make harder:

- Treating a static visual as behavior proof.
- Reimplementing the candidate beside its public exports.
- Loading React or CSS through root, CLI, or MCP entry points.
- Smuggling product authorization or domain policy into generic components.
- Claiming Firefox, WebKit, assistive-technology, or standalone-icon coverage without evidence.

Use these terms in the component surface: component, state, implementation, verified, visual specimen, accessibility, package export.

Keep these terms out of primary component previews: prompt, resource id, MCP server, tool trace, schema path, model configuration.

State changes that matter:

- A field moves between empty, ready, error, disabled, and focus-visible presentation.
- An action moves between ready, loading, disabled, and focus-visible presentation without duplicate activation.
- A toggle exposes and changes one persistent binary value.
- A status message communicates progress, result, or error with the right announcement policy.
- A scenario moves to `verified` only after its bound evidence passes.

The consumer should leave knowing what can be imported, what behavior is verified, and what remains their responsibility.

## Runtime history and current scope

The historical baseline pilot contained five canonical exports and 20 scenarios: `ActionButton`, `FormField`, `TextField`, `Toggle`, and `StatusMessage`. Its evidence remains historical and cannot verify later implementations.

The current unreleased candidate contains local implementations for all 17 canonical contracts:

- `ActionButton`, `ActionGroup`, `Alert`, and `Card`
- `CheckboxGroup`, `Dialog`, `FormField`, and `Menu`
- `Panel`, `RadioGroup`, `SelectField`, and `StatusMessage`
- `Table`, `Tabs`, `TextArea`, `TextField`, and `Toggle`

`CheckboxField` is an additional supporting primitive, so `judgmentkit/react` exposes 18 named symbols for 17 canonical contract IDs. Styles remain opt-in through `judgmentkit/react/styles.css`. React `>=19 <20` is supplied by the consumer as one peer runtime.

All 65 canonical required-state scenarios are represented locally. Until a fresh expanded gate and machine-readable reviewer receipt are bound, none counts as currently verified.

Not claimed by the candidate:

- Firefox or WebKit support.
- Screen-reader or assistive-technology compatibility beyond a current reviewer receipt.
- Product templates as generic runtime components.
- Standalone icon parity, glyph work, icon mappings, or icon API changes.
- Pixel or styling parity with Figma.

## Acceptance criteria

- All 128 reference families and 354 Figma masters are present in the machine-readable inventory; standalone icons remain excluded.
- All 128 families have a JudgmentKit disposition. The 304 masters in documented variant sets have 105 classified semantic axes; the remaining 50 are validated singleton masters.
- All 17 canonical contracts have one explicit classification, one resolvable public implementation candidate, and one required-state scenario list.
- No runtime projection contains an ID without a local implementation and declared scenario provenance. Missing or stale evidence empties `covered_states`; it does not pretend the implementation disappeared.
- The component page imports the adapter and keeps no parallel hand-authored controls as a second implementation.
- Every public `covered_state` resolves to a `verified` scenario; all other states are labeled accurately.
- A packed fixture supplies React, resolves the adapter and stylesheet, renders all 18 named symbols, and proves one compatible React runtime.
- Importing `judgmentkit`, running the CLI, and loading MCP entry points does not load React, React DOM, browser globals, or component CSS.
- Browser tests exercise all 65 scenarios across 1365×900 and 390×844 in light and dark, for 260 unique presentations.
- The browser gate uses real keyboard and pointer input, verifies controlled acceptance and refusal, focus lifecycle, disabled and loading suppression, native semantics, announcements, responsive overflow, appearance behavior, and relevant accessibility-tree state.
- Every verified presentation has zero automated accessibility violations and zero unresolved incomplete results.
- A machine-readable reviewer receipt binds the exact run ID, browser, 17 component IDs, 65 scenario IDs, 260 presentations, contract hashes, implementation-and-fixture hash, viewports, appearances, and unsupported claims.
- `npm run test:components` and the full relevant regression suite pass.

## Candidate proof thresholds

- The public component page uses all 17 canonical implementations from `judgmentkit/react`.
- There is no parallel control implementation beside the public adapter.
- The packed consumer needs no adapter exception and resolves exactly one React runtime.
- Every required state is either verified by current evidence or explicitly shown as unverified; none is silently counted.
- Automated component checks have zero unresolved failures.
- The reviewer receipt has zero unresolved required-behavior or visual-legibility findings.

## Risks

- Contract metadata, runtime exports, site specimens, and evidence can drift if projections remain hand-maintained.
- React can leak into framework-neutral paths through an accidental root re-export.
- Simulated focus styling can be mistaken for actual keyboard focus.
- Automated accessibility checks can be mistaken for assistive-technology support.
- Inventory parity can be mistaken for runtime parity if normalization and evidence remain hidden.
- Figma variant combinations can become fake public props unless semantic variants, interaction states, content conditions, and responsive conditions stay separate.

## Release boundary

Local implementation and verification are authorized. On 2026-08-28, the product owner separately authorized committing, pushing, and opening a review PR for this candidate. Package publish, deployment, promotion, release, and migration beyond `/design-system/components/` are not authorized.
