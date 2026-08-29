# Figma component inventory audit

Date: 2026-08-27

Figma source inspected: `Simple Design System (Community)`

JudgmentKit source inspected: this repository

## Local execution update

On 2026-08-28, the product owner approved using this entire inventory as JudgmentKit's component-and-variant reference denominator and authorized local dependency-ordered implementation. The current worktree accounts for 128/128 families and 354/354 Figma masters, classifies 128/128 families, and normalizes the 304 masters in documented variant sets across 105/105 semantic axes. The remaining 50 are singleton masters, with one partial and 49 lacking axis metadata.

The unreleased `judgmentkit/react` adapter candidate has local implementations for all 17 canonical contract IDs and represents all 65 required-state scenarios on `/design-system/components/`. Its React subpath exposes 18 named symbols because `CheckboxField` is a supporting primitive. Current expanded verification remains 0/65 until fresh browser, package, accessibility, and machine-readable reviewer evidence is bound. The earlier five-component receipt and evidence bundle remain immutable historical baseline evidence; they do not verify this expanded candidate.

Proportional verification on 2026-08-28 passed the inventory, contract, unit, site-integration, and packed-consumer checks. Chrome `152.0.7977.65` completed desktop light and dark checks, mobile-light static checks, and a focused 390×844 keyboard and pointer pass. The aggregate run then stopped when `dialog.ready` did not remain open after one pointer activation, despite the same isolated Dialog group passing immediately beforehand; no 260-presentation evidence candidate was recorded. Axe 4.13 also produced seven raw `elmPartiallyObscuring` incomplete nodes for wrapped text inside the native mobile Dialog. Live hit-testing showed identical, unobstructed paint stacks, independent WCAG contrast checks passed, and zero findings remained unresolved. Direct desktop-light and mobile-dark visual review covered all 17 specimen families; the Table specimen was changed to a readable one-column layout and the component now preserves a 32rem table width inside its existing horizontal scroll region. These checks support inspection of the local candidate, not a full-browser or release claim.

Twenty-five reference families / 114 source variants map to implemented contracts. Exact Figma-variant runtime evidence remains 0/354 because a contract mapping does not prove an exact Figma axis tuple. The approved scope and evidence boundary are recorded in [`component-library-pilot.md`](../specs/component-library-pilot.md) and [`ADR-0002`](./decisions/ADR-0002-optional-react-component-adapter.md). On 2026-08-28, the product owner separately authorized committing, pushing, and opening a review PR for the candidate. Package publish, deployment, promotion, release, broader migration, and icon work remain unauthorized.

## Reference-parity inspection update

On 2026-08-28, every non-icon public family and every hidden family was opened individually in Figma's Assets panel. The selected component's exposed properties and variant dropdown values were read from the Design sidebar without changing them. This second pass confirmed the 128-family, 354-variant arithmetic and supplied the exact axes used by the machine-readable inventory.

The normalization denominator is now explicit:

- 122 public families / 336 variants
- six hidden families / 18 variants
- 128 total families / 354 variants
- standalone icon glyphs excluded
- icon-bearing component families included
- Simple Design System visual styling excluded

## Baseline verdict

At the time of the audit, JudgmentKit did not ship a reusable web UI component library. It had 17 canonical framework-neutral UI component contracts and generated static specimens, while the renderer and component package were explicitly deferred. Therefore, even the closest Figma-to-JudgmentKit matches were **contract-only**, not reusable implementation parity.

The Figma file contains:

- **122 public component families** across 19 folders, excluding standalone icons.
- **336 component variants** inside those 122 families.
- **6 hidden families** with 18 variants.
- `AI Chat`, `Calendar`, and `Inputs` are the only pages marked **Ready for dev** in the page list.

JudgmentKit contains:

- **17 generated component specimens** covering **65 required component-state combinations**.
- **No exported web renderer or component package**.
- A separate 17-name `renderer_components` list that overlaps the canonical contract IDs on only `action_button`, `tabs`, and `dialog`.

Standalone icon glyphs are out of scope. JudgmentKit's existing icon library is treated as complete for this audit; there are no icon additions, mappings, adapter recommendations, or parity findings. `Icon Button` and `Card Grid Icon` remain in the inventory because they are component families, not standalone glyphs.

## Audit contract

This is an audit and integration activity, so implementation names are intentionally visible. The objective is to distinguish four materially different conditions:

1. A Figma family maps to an existing JudgmentKit contract, but no reusable implementation exists.
2. A Figma subcomponent or variant is only partially represented by an existing contract.
3. A Figma family has no canonical JudgmentKit contract.
4. A Figma family is a product/template composition that should not become kernel scope without repeated cross-domain evidence.

Static Figma presence is not behavior proof, and a JudgmentKit specimen is not a renderer implementation.

## Coverage accounting

| Status | Count | Meaning |
| --- | ---: | --- |
| Direct public contract mapping | 11 | A public Figma family has a clear canonical JudgmentKit contract, but only as contract/static-specimen coverage. |
| Direct hidden contract mapping | 2 | Hidden `Checkbox Group` and `Radio Group` map to canonical contracts. |
| Partial public mapping | 11 | The Figma item is a variant, field-level primitive, or subcomponent folded into a broader JudgmentKit contract without its own API/state model. |
| Partial hidden mapping | 1 | Hidden `Menu Shortcut` is folded into the broader `menu` contract without its own API/state model. |
| Missing canonical contract | 46 | The public Figma family has no canonical JudgmentKit component contract. |
| Product/template composition | 54 | The Figma item is a domain or page composition; consumer ownership is the safer default. |
| Hidden internal helper | 3 | `_Component Annotation`, `_Component Note`, and `.Slot` are authoring helpers, not public product gaps. |

The 122 public families reconcile as 11 direct + 11 partial + 46 missing + 54 composition/template. The 6 hidden families reconcile separately as 2 direct + 1 partial + 3 internal.

## Baseline direct contract mappings: implementation was missing

| Figma family | Figma variants | JudgmentKit contract | Audit result |
| --- | ---: | --- | --- |
| Button | 18 | `action_button` | Contract/static specimen only; no reusable button API. |
| Button Group | 5 | `action_group` | Contract/static specimen only. |
| Card | 8 | `card` | Contract/static specimen only. |
| Dialog | 1 | `dialog` | Static inline specimen; no focus lifecycle implementation. |
| Input Field | 6 | `text_field` | Static specimen; `form_field` and `text_field` also overlap in the static specimen generator. |
| Textarea Field | 6 | `text_area` | Static specimen only. |
| Select Field | 6 | `select_field` | Static collapsed combobox specimen; no open/select keyboard behavior. |
| Switch Field | 4 | `toggle` | Static `role="switch"` specimen; no change behavior. |
| Menu | 1 | `menu` | Static command list; no focus/open/close model. |
| Notification | 2 | `alert`, `status_message` | Figma combines Message/Alert variants; JudgmentKit splits two overlapping contracts. |
| Tabs | 1 | `tabs` | Static tabs specimen; no association or arrow-key behavior. |
| Checkbox Group (hidden) | 1 | `checkbox_group` | Contract/static specimen only. |
| Radio Group (hidden) | 1 | `radio_group` | Contract/static specimen only; the claimed `empty` specimen is not actually empty. |

Canonical `form_field`, `table`, and `panel` do not have exact public Figma-family counterparts. Figma has specific fields and card/section compositions, but not direct families with those semantics.

## Partial mappings

| Figma family | Variants | Existing JudgmentKit scope | Missing parity |
| --- | ---: | --- | --- |
| Button Danger | 12 | `action_button` | Destructive tone/confirmation state is not a reusable variant API. |
| Icon Button | 18 | `action_button` | No dedicated icon-button contract despite explicit accessible-name failure rules. |
| Card (Slot) | 1 | `card` | Slot/composition API is absent. |
| Dialog Body | 2 | `dialog` | Card/Sheet body types and dismissibility are not modeled as renderer props. |
| Checkbox Field | 6 | `checkbox_group` / approved `CheckboxOption` anatomy | No standalone field-level contract or state API. |
| Radio Field | 4 | `radio_group` | No standalone field-level contract or state API. |
| Menu Header | 1 | `menu` | No reusable subcomponent. |
| Menu Heading | 1 | `menu` | No reusable subcomponent. |
| Menu Item | 3 | `menu` | Default/Hover/Disabled item states are not independently implemented. |
| Menu Separator | 1 | `menu` | No reusable subcomponent. |
| Tab | 4 | `tabs` | Default/Hover × Active Off/On is not an independently implemented primitive. |
| Menu Shortcut (hidden) | 1 | `menu` | Hidden authoring subcomponent only. |

## Missing canonical component contracts

These 46 public Figma families have no direct canonical JudgmentKit component contract.

| Area | Missing Figma families | Count |
| --- | --- | ---: |
| Accordion | Accordion; Accordion Item | 2 |
| Avatars | Avatar; Avatar Block; Avatar Group | 3 |
| Calendar | Calendar; Calendar Button; Calendar Month Field; Calendar Select Group; Calendar Year Field | 5 |
| Inputs | Date Input Field; Date Picker Field; Search; Slider Field | 4 |
| Navigation | Navigation Button; Navigation Button List; Navigation Pill; Navigation Pill List | 4 |
| Pagination | Pagination; Pagination Gap; Pagination List; Pagination Next; Pagination Page; Pagination Previous | 6 |
| Tags | Tag; Tag Toggle; Tag Toggle Group | 3 |
| Text | Text; Text Code; Text Content Heading; Text Content Title; Text Emphasis; Text Heading; Text Link; Text Link List; Text Link List Item; Text List; Text List Item; Text Price; Text Small; Text Strong; Text Subheading; Text Subtitle; Text Title Hero; Text Title Page | 18 |
| Tooltip | Tooltip | 1 |

Not all 46 should automatically become kernel contracts. Typography components are more plausibly token/style authority; Calendar is a compound interaction; and Navigation semantics depend on the activity and product information architecture. The inventory establishes the gap, not automatic admission.

## Product/template compositions

These 54 public Figma families are present but should remain product- or adapter-owned unless repeated cross-domain evidence justifies promotion.

- **AI Chat (6):** AI -> Conversation; AI Chat -> Chat Response; AI Chat -> Code Block; AI Chat -> User message; AI Chat Box; AI Sidebar.
- **Specialized cards (5):** Pricing Card; Product Info Card; Review Card; Stats Card; Testimonial Card.
- **Examples (12):** About; AI Chat; Article; Contact Us; Home Page; Landing Page; Portfolio; Pricing; Product Detail Page; Shop; Slot; Waitlist.
- **Forms (7):** Form (Slot); Form Contact; Form Forgot Password; Form Log In; Form Newsletter; Form Register; Form Shipping.
- **Sections (24):** AI Chatbot; Card Grid Content List; Card Grid Icon; Card Grid Image; Card Grid Pricing; Card Grid Reviews; Card Grid Testimonials; Footer; Header; Header Auth; Hero (Slot); Hero Actions; Hero Basic; Hero Form; Hero Image; Hero Newsletter; Page Accordion; Page Newsletter; Page Product; Page Product Results; Panel Image; Panel Image Content; Panel Image Content Reverse; Panel Image Double.

## Figma property/state deltas that matter

The Figma canvas and component-set metadata expose richer variant axes than JudgmentKit's current contracts:

| Family | Figma metadata observed |
| --- | --- |
| Accordion Item | State: Closed/Open; Title; Content |
| AI Chat Box | State: Default/Active |
| Avatar | Type: Initial/Image; Size: Large/Medium/Small; Shape: Circle/Square |
| Avatar Group | Spacing: Overlap/Spaced; optional overflow count |
| Button | Variant: Primary/Neutral/Subtle; State: Default/Hover/Disabled; Size: Medium/Small; optional leading/trailing icons |
| Button Danger | Variant: Primary/Subtle; State: Default/Hover/Disabled; Size: Medium/Small |
| Icon Button | Variant: Primary/Neutral/Subtle; State: Default/Hover/Disabled; Size: Medium/Small |
| Button Group | Align: Justify/Start/End/Center/Stack |
| Calendar Button | State: Default/Hover/Active/Disabled/Range/Range Disabled/Hidden |
| Card | Asset Type: Icon/Image; Variant: Stroke/Default; Direction: Horizontal/Vertical |
| Pricing Card | Device: Desktop/Mobile; Variant: Stroke/Brand |
| Dialog Body | Type: Card/Sheet; Dismissible; Heading; Body; two slots |
| Checkbox Field | State: Default/Disabled; Value: Checked/Unchecked/Indeterminate |
| Date Input Field | State: Default/Error/Disabled; Value Type: Default/Placeholder; Day/Month/Year text; optional label/description |
| Date Picker Field | State: Default/Error/Disabled; Value Type: Default/Placeholder; value; optional label/description |
| Radio Field | State: Default/Disabled; Value: Unchecked/Checked; label/description |
| Input Field | State: Default/Error/Disabled; Value: Default/Placeholder; label/description/error properties |
| Textarea Field | State: Default/Error/Disabled; Value: Default/Placeholder; label/description/error properties |
| Select Field | State: Default/Error/Disabled; Value: Default/Placeholder; Open; label/description/error properties |
| Search | State: Default/Disabled; Value: Filled/Placeholder |
| Slider Field | State: Default/Disabled; label/description |
| Switch Field | State: Default/Disabled; Value: Unchecked/Checked; label/description |
| Menu Item | State: Default/Hover/Disabled; icon, label, description, shortcut toggles |
| Navigation Button | State: Default/Hover/Active; Direction: Column/Row; Type: Small/Medium |
| Navigation Pill | State: Default/Active/Hover; row/column list direction |
| Notification | Variant: Message/Alert; icon, title, body, dismissible, optional button |
| Pagination Page | State: Default/Hover/Current/Current Hover |
| Pagination Next / Previous | State: Default/Hover/Disabled |
| Tab | State: Default/Hover; Active: Off/On |
| Tag | Scheme: Brand/Neutral/Positive/Danger/Warning; State: Default/Hover; Variant: Primary/Secondary; removable |
| Tag Toggle | Boolean State: False/True; label; optional icon |
| Text Content Heading / Title | Align: Start/Center |
| Text Link List / Text List | Density: Default/Tight |
| Text Price | Size: Large/Small |
| Tooltip | Placement: Top/Left/Right/Bottom; title/body; slot |
| Responsive sections | Desktop/Mobile variants; Header also has Open/Default; Header Auth has Logged In/Logged Out/Logged In-Hover |
| _Component Annotation (hidden) | Direction: Right/Top/Bottom/Left; Type: Primary/Secondary/Group |
| _Component Note (hidden) | Type: Annotation/Documentation |

## Complete Figma component-family inventory

Standalone icon glyphs are excluded. `Variants` is Figma's count of component masters inside each family. Hidden families are listed separately.

| Folder | Families | Variants | Exact component families (variant count) |
| --- | ---: | ---: | --- |
| Accordion | 2 | 3 | Accordion (1), Accordion Item (2) |
| AI Chat | 6 | 7 | AI -> Conversation (1), AI Chat -> Chat Response (1), AI Chat -> Code Block (1), AI Chat -> User message (1), AI Chat Box (2), AI Sidebar (1) |
| Avatars | 3 | 15 | Avatar (12), Avatar Block (1), Avatar Group (2) |
| Buttons | 4 | 53 | Button (18), Button Danger (12), Button Group (5), Icon Button (18) |
| Calendar | 5 | 11 | Calendar (1), Calendar Button (7), Calendar Month Field (1), Calendar Select Group (1), Calendar Year Field (1) |
| Cards | 7 | 17 | Card (8), Card (Slot) (1), Pricing Card (4), Product Info Card (1), Review Card (1), Stats Card (1), Testimonial Card (1) |
| Dialog | 2 | 3 | Dialog (1), Dialog Body (2) |
| Examples | 12 | 24 | About (2), AI Chat (2), Article (2), Contact Us (2), Home Page (2), Landing Page (2), Portfolio (2), Pricing (2), Product Detail Page (2), Shop (2), Slot (2), Waitlist (2) |
| Forms | 7 | 7 | Form (Slot) (1), Form Contact (1), Form Forgot Password (1), Form Log In (1), Form Newsletter (1), Form Register (1), Form Shipping (1) |
| Inputs | 10 | 50 | Checkbox Field (6), Date Input Field (6), Date Picker Field (6), Input Field (6), Radio Field (4), Search (4), Select Field (6), Slider Field (2), Switch Field (4), Textarea Field (6) |
| Menu | 5 | 7 | Menu (1), Menu Header (1), Menu Heading (1), Menu Item (3), Menu Separator (1) |
| Navigation | 4 | 19 | Navigation Button (12), Navigation Button List (2), Navigation Pill (3), Navigation Pill List (2) |
| Notification | 1 | 2 | Notification (2) |
| Pagination | 6 | 13 | Pagination (1), Pagination Gap (1), Pagination List (1), Pagination Next (3), Pagination Page (4), Pagination Previous (3) |
| Tabs | 2 | 5 | Tab (4), Tabs (1) |
| Tags | 3 | 23 | Tag (20), Tag Toggle (2), Tag Toggle Group (1) |
| Text | 18 | 23 | Text (1), Text Code (1), Text Content Heading (2), Text Content Title (2), Text Emphasis (1), Text Heading (1), Text Link (1), Text Link List (2), Text Link List Item (1), Text List (2), Text List Item (1), Text Price (2), Text Small (1), Text Strong (1), Text Subheading (1), Text Subtitle (1), Text Title Hero (1), Text Title Page (1) |
| Tooltip | 1 | 4 | Tooltip (4) |
| Sections | 24 | 50 | AI Chatbot (2), Card Grid Content List (2), Card Grid Icon (2), Card Grid Image (2), Card Grid Pricing (2), Card Grid Reviews (2), Card Grid Testimonials (2), Footer (2), Header (3), Header Auth (3), Hero (Slot) (2), Hero Actions (2), Hero Basic (2), Hero Form (2), Hero Image (2), Hero Newsletter (2), Page Accordion (2), Page Newsletter (2), Page Product (2), Page Product Results (2), Panel Image (2), Panel Image Content (2), Panel Image Content Reverse (2), Panel Image Double (2) |
| Hidden | 6 | 18 | _Component Annotation (12), _Component Note (2), Checkbox Group (1), Radio Group (1), Menu Shortcut (1), .Slot (1) |

## Baseline repository implementation audit

### High

1. **No reusable web UI component package exists.** `package.json` exports the kernel, presentation theme, and provider adapter only. `src/index.mjs` declares renderer, component package, and catalog compiler deferred. All 17 canonical components remain contract/static-specimen evidence.
2. **Existing state coverage is not behavior proof.** Generated `covered_states` are copied from contract requirements, and 9 of 15 focus-visible previews attach `data-focus-visible` to a non-focusable component container. Tests verify markers, not actual focus behavior.
3. **At least one claimed state is false.** `radio_group` requires `empty`, but every rendered radio-group specimen hard-codes its first option as checked.
4. **Interactive specimens are static.** Toggle lacks state-change behavior; select, tabs, menu, and dialog additionally lack their required keyboard, open/close, and focus behavior.
5. **Component authority is internally inconsistent.** `design_system_source.renderer_components` names a different 17-item namespace from the canonical `component_contracts`. Reconcile authority before admitting new Figma families.

### Medium

1. If a reusable renderer is authorized and cross-domain evidence supports promotion, consider contracts for broadly reusable, behaviorally distinct primitives: standalone checkbox/radio fields, search, slider/range, pagination, tag/badge, tooltip, accordion, and navigation primitives.
2. Define explicit action-button variants for destructive and icon-only usage, including accessible-name, confirmation, loading, and focus evidence.
3. Treat Calendar/date picker as a compound control with keyboard, locale, range, disabled-date, and focus requirements—not as a visual-only port.
4. Decide whether text/link/list components belong in renderer APIs or remain typography/token authority; do not duplicate both models.

### Low

Keep AI Chat, specialized cards, forms, examples, header/footer/hero/page/card-grid sections, and other page templates consumer-owned until repeated cross-domain evidence supports promotion. Their presence in Figma is not sufficient demand or kernel-fit evidence.

## Historical baseline evidence locations

The locations below support the point-in-time repository audit and may now contain later corrections. Current authority lives in `contracts/simple-design-system.component-inventory.json`, `src/component-registry.mjs`, the `judgmentkit/react` package surface, and the generated `/design-system/components/` exports.

- Activity-first and product-owned renderer boundary: `DESIGN.md:3-10`, `DESIGN.md:26-32`.
- Renderer explicitly deferred: `README.md:83`, `src/index.mjs:6220-6224`.
- Package exports omit a web component entry point: `package.json:18-22`.
- Approved helpers and browser-QA requirements: `contracts/ai-ui-generation.activity-contract.json:451-531`.
- Canonical 17 component contracts: `contracts/ai-ui-generation.activity-contract.json:554-1285`.
- Divergent `renderer_components`: `contracts/ai-ui-generation.activity-contract.json:1665-1684`.
- No local component authority: `contracts/ai-ui-generation.activity-contract.json:1691-1694`.
- Static specimen renderer: `site/build-site.mjs:5346-5530`.
- State coverage generation: `site/build-site.mjs:5632-5683`.
- Specimen provenance does not replace accessibility/browser QA: `site/build-site.mjs:5745-5751`.
- Public warning that specimens are not a renderer package: `site/build-site.mjs:6923-6929`.
- Generic outer-marker tests: `tests/site.test.mjs:2643-2671`.
- `radio_group` empty-state defect: `site/build-site.mjs:5437-5443`.

## Baseline verification and limits

- Figma was inspected read-only through the desktop UI. No Figma content or settings were changed.
- All public and hidden component-family folders were opened and their exact family/variant counts read from Figma's Assets panel. The standalone icon folder is excluded from this audit.
- Every component-bearing Figma page was checked. Cover and page-divider rows were excluded as navigation-only pages; Foundations contains style/token frames rather than additional public component families, Composition guide contains instructional frames, and Component Playground contains instances rather than new assets.
- JudgmentKit was inspected read-only except for this audit document. No product/runtime files were changed.
- No test suite was run because the change is documentation-only. Repository references and inventory arithmetic were checked directly.
