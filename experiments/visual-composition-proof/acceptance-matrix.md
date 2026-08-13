# Visual composition proof acceptance matrix

This proof tests declared relationships in rendered DOM geometry. It does not score taste or infer a component's intended composition from a screenshot.

## Result model

The checker must return exactly one outcome per fixture and viewport:

- `fail`: a declared, mechanically measurable relationship is outside tolerance.
- `pass`: every applicable hard relationship is within tolerance and no diagnostic boundary is active.
- `pass_with_warning`: hard relationships pass, but browser-owned rendering or another named limitation prevents complete measurement.
- `review`: intent, asset authority, or optical calibration is missing, so a correct hard result cannot be inferred.
- `not_applicable`: the declared relationship is intentionally inactive after a documented responsive recomposition; this is neither a pass nor a review.

Run every paired fixture at `1365x900` and `390x844`, DPR 1, after `document.fonts.ready` and two animation frames. Record raw CSS-pixel rectangles and derived deltas. Every blocking tolerance comes from the named component calibration in `policy.json`; the checker has no universal pixel default. No value may be rounded before comparison. At 390px, a documented responsive composition may replace the desktop composition, but clipped, overlapping, or silently missing parts always fail.

Fixture hooks are semantic test instrumentation:

```html
data-composition="<declared rule>"
data-part="control|label|value|indicator|atom|description|icon|text|lockup"
```

Production selectors below are corpus provenance, not the fixture API.

## Executable matrix

| ID | Declared relationship and executable assertion | Bad fixture | Good fixture | Expected result | False-positive boundary |
| --- | --- | --- | --- | --- | --- |
| VC-01 | `comparison-row`: for all `[data-part="value"]` in one declared row, compare `max(rect.top) - min(rect.top)` to its `calibration_ref`. Also require every value to be visible and non-overlapping. | One label wraps and each label/value pair lays itself out independently, pushing only its value down. | A shared row reserves the same label rail for every value; wrapped labels do not move individual values. | bad `fail`; good `pass` on desktop; documented stacked mobile composition `not_applicable` | Do not compare unrelated facts or rows not declared comparable. A deliberately stacked 390px composition has no cross-column relationship to check. |
| VC-02 | `shared-columns`: convert each `[data-part="description"]` edge to logical inline-start using computed `direction`; compare spread across repeated rows to its `calibration_ref`. Parts must not overlap. | Each repeated row owns an `auto` status column, so different badge widths move its description start. | The list owns shared tracks, or each row reserves one common status-rail width. | bad `fail`; good `pass` on desktop; documented stacked mobile composition `not_applicable` | Do not require shared starts for independent cards, intentionally ragged prose, or a documented 390px stacked variant. Content length alone is not a defect. |
| VC-03 | `semantic-atom`: every `[data-part="atom"]` must stay within the line-box count allowed by its component calibration and remain inside its container. | A state atom such as `Selected` inherits arbitrary wrapping and breaks inside the word. | The atom is kept intact or the parent recomposes before it would break. | bad `fail`; good `pass` at both viewports | Only declared atoms are protected. Ordinary labels and descriptions may wrap at word boundaries. Long localization that cannot fit must trigger a documented recomposition, not forced overflow. |
| VC-04 | `edge-affordance-balanced`: for an author-owned control, compute logical label-start and indicator-end rails, then compare their delta to its component calibration. | An author-owned indicator is edge-pinned while the label uses a materially different inset, or a centered label shares an asymmetric indicator rail. | Explicit balanced edge rails, or explicit symmetric rails for the centered-label variant. | bad `fail`; good `pass` at both viewports | Apply only when the fixture declares the variant and the indicator is author-owned. Do not infer that a compact grouped trigger, reserved-end-rail field, or edge-affordance field should use another variant. |
| VC-05 | `native-select`: verify only the select's own visibility, non-overlap, and declared outer box. Do not manufacture an indicator rectangle. Emit warning code `browser_owned_indicator_unmeasured`. | Native `<select>` with visually unequal text/indicator whitespace. | Native `<select>` with otherwise valid outer geometry. | both `pass_with_warning` | The browser/OS paints the disclosure indicator; DOM geometry cannot prove its visible inset. It becomes VC-04 only after appearance is author-owned and explicit indicator markup exists. |
| VC-06 | `icon-text-mechanical-center`: `abs(iconRect.centerY - textRect.centerY) <= 1` for a declared single-line pair. Emit optical measurements only when the icon registry supplies an approved anchor. | Mechanically displaced pair. | Mechanically centered pair. | bad `fail`; good `pass`; uncalibrated optical concern `review` | A glyph's bounding box is not its visible ink. Multiline copy, asymmetric icons, emoji, and script-specific baselines require a different declared rule or human review. Do not fail a pair from raster centroid alone. |
| VC-07 | `canonical-lockup`: when policy supplies `assetId` and `sha256`, the rendered lockup must be one referenced canonical asset whose identity and hash match. | Mark plus live/reconstructed wordmark presented as an approved lockup. | The approved atomic lockup asset with matching identity and hash. | bad `fail`; good `pass`; no approved asset `review` | New identity exploration and unapproved lockups are review work. Geometric or raster centroids cannot establish brand correctness, and a hash match does not by itself prove accessible naming or minimum-size fitness. |
| VC-08 | `parallel-choice-rails`: only when explicitly declared, title starts, indicator centers, copy starts, and card block-ends must each have spread `<= 1`; otherwise return `review` with the measured spreads. | Parallel cards drift because wrapping changes per-card rails. | Shared rails or a responsive stack declared by the fixture. | declared bad `fail`; declared good `pass`; undeclared corpus case `review` | Equal card heights and aligned inner rails are not universal. Cards with intentionally variable content must not fail without this contract. |

For applicable rules, outcome precedence is `fail` over `review` over `pass_with_warning` over `pass`. `not_applicable` is allowed only when the policy explicitly deactivates that relationship for the current composition. A missing required `[data-part]`, non-finite rectangle, clipped part, or overlap is a `fail`, not `review`.

## Corpus seeds

The paired fixtures must reproduce these mechanisms with deterministic local content. Corpus artifacts may be opened to confirm the reproduction, but committed screenshots are not pixel baselines.

| Corpus path | Region/selectors | Rule and seeded expectation |
| --- | --- | --- |
| `examples/model-ui/clinical-intake-review/artifacts/gpt56-sol-ultra-codex-with-judgmentkit.html` with `screenshots/gpt56-sol-ultra-codex-with-judgmentkit.png` | `.jk-metadata`, `.jk-metadata > div`, `dt`, `dd`; selected-packet metadata | VC-01 bad seed: wrapped `Requested appointment slot` moves `10:30 AM` about 16px below adjacent `I-4471`; paired reproduction must `fail`. |
| Same clinical artifact and screenshot | `.jk-readiness-list > li`, `.jk-badge`, `.jk-evidence-copy`; readiness checklist | VC-02 bad seed: independently resolved `auto` badge tracks move description starts by about 12px; paired reproduction must `fail`. |
| `examples/model-ui/refund-system-map/artifacts/gpt56-sol-ultra-codex-with-judgmentkit.html` with `screenshots/gpt56-sol-ultra-codex-with-judgmentkit.png` | `.decision-choice[aria-pressed="true"] .choice-title-row`, `.choice-selected` (source mechanism at lines 666-706; selected markup near 1100) | VC-03 bad seed: `Selected` may break under inherited `overflow-wrap:anywhere`; constrained reproduction must `fail`, repaired atom must `pass`. |
| `examples/model-ui/b2b-renewal-risk/artifacts/gpt56-sol-ultra-codex-no-judgmentkit.html` with `screenshots/gpt56-sol-ultra-codex-no-judgmentkit.png` | `.field select`; Next owner field | VC-05 seed: visible whitespace appears imbalanced, but the indicator is native; expected `pass_with_warning`, never a hard inset failure. |
| `examples/model-ui/refund-system-map/artifacts/gpt56-sol-ultra-codex-no-judgmentkit.html` | `.queue-filter` | VC-05 additional native-select seed; expected `pass_with_warning` when outer geometry passes. |
| `examples/model-ui/refund-system-map/artifacts/gpt56-sol-ultra-codex-with-judgmentkit.html` | `.queue-control select`, `.control-block select` | VC-05 additional native-select seeds; expected `pass_with_warning` when outer geometry passes. |
| `examples/model-ui/b2b-renewal-risk/artifacts/gpt56-sol-ultra-codex-no-judgmentkit.html` with its same-basename screenshot | `.decision-options`, `.option-top`, `.radio-mark`, `.option-body` | VC-08 ambiguity seed: measured wrapping produces different indicator/copy/bottom rails, but no shared-rail intent is declared; expected `review`, not `fail`. |
| `examples/model-ui/b2b-renewal-risk/artifacts/gpt56-sol-ultra-codex-material-ui-only.html` and `examples/model-ui/clinical-intake-review/artifacts/gpt56-sol-ultra-codex-material-ui-only.html`, with their same-basename screenshots | `.evidence-list li > .check` and adjacent evidence text | VC-06 negative seeds: observed mechanical center is within about 0-1px. A faithful declared single-line reproduction must `pass`; no claim of optical proof follows. |

## Evidence boundary

User-provided screenshots of the Codex-style lockup and Sol-style dropdown are image-only explanatory cases. They motivate VC-04, VC-05, and VC-07, but they have no inspectable DOM, declared composition, asset identity, font receipt, or browser-owned/author-owned boundary. They must not be loaded as executable fixtures, used to set tolerances, or counted as pass/fail evidence. Any numeric estimate taken from those images is descriptive only.

Acceptance requires all paired bad/good fixtures to produce the outcomes above at both viewports, all native-select seeds to produce `pass_with_warning`, all undeclared optical or parallel-rail cases to produce `review`, and the receipt to include rule id, viewport, selectors, raw rectangles, derived deltas, tolerance, outcome, and warning/review reason.
