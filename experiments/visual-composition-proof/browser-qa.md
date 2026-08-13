# Browser QA

Status: **Passed for the experimental proof**

Run date: 2026-08-12

Decision: **GO for a wider implementation-adapter spike; no kernel promotion**

## Command

```bash
npm run proof:visual-composition
```

Result:

```text
Visual composition proof passed.
```

The first sandboxed attempt could not allocate Chrome's localhost debugging port (`listen EPERM 127.0.0.1`). The same command passed when run with the scoped local-browser permission. That sandbox error is not counted as a product failure.

## Environment

- Engine: headless Chromium through the repository's Chrome DevTools Protocol harness
- Product: `Chrome/151.0.7922.110`
- Browser revision: `2ccadf9e6d760667310dc510c978ded23d99be67`
- JavaScript engine: `15.1.206.16`
- Desktop fixture and corpus viewport: `1365x900`, DPR 1
- Mobile paired-fixture viewport: `390x844`, DPR 1
- Fonts: awaited through `document.fonts.ready`
- Motion: animations and transitions disabled; two animation frames awaited before measurement
- Measurement: unrounded DOM geometry in CSS pixels

## Receipt summary

| Outcome | Count |
| --- | ---: |
| `pass` | 8 |
| `fail` | 11 |
| `pass_with_warning` | 8 |
| `review` | 0 |
| `not_applicable` | 4 |
| Expectation mismatches | **0** |

The eleven `fail` results are expected detections, not test failures: five bad desktop fixtures, three still-applicable bad mobile fixtures, and the three confirmed corpus defects. The eight warnings are six corpus-native selects plus the fixture native select at desktop and mobile.

## Decisive observations

- Paired metadata value spread: bad `16.688px`; repaired `0px`.
- Paired readiness-description start spread: bad `7.578px`; repaired `0px`.
- Clinical corpus metadata value spread: `16.234px`, correctly failed.
- Clinical corpus readiness-description start spread: `11.234px`, correctly failed.
- Refund corpus `Selected` atom: two line boxes, correctly failed.
- Owned centered-label select: bad label-center delta `6.5px` and rail delta `15.828px`; repaired deltas `0px` and `0.828px`.
- Six corpus-native selects retained computed `appearance: auto` and symmetric authored padding. Each returned `pass_with_warning: browser_owned_indicator_unmeasured`; none was hard-failed from invented indicator geometry.
- The reconstructed lockup failed; the approved atomic SVG asset passed with its policy-bound SHA-256 digest.
- The healthy Material UI document had zero declared samples and returned `no_applicable_contract`, not an inferred visual-quality pass.
- The desktop-only shared-anchor rules returned `not_applicable` after the paired fixture recomposed at mobile width. Protected atoms, owned-select rails, and canonical assets remained discriminating there.

## Evidence

The latest local receipt and annotated renders are generated under:

```text
output/playwright/visual-composition-proof/receipt.json
output/playwright/visual-composition-proof/paired-fixtures-desktop-desktop.png
output/playwright/visual-composition-proof/paired-fixtures-desktop-mobile.png
```

`output/` is ignored and is local run evidence, not committed authority. The committed policy, specimen, fixture, checker, acceptance matrix, and this QA record define how to reproduce it.

## Remaining boundary

- This proves declared DOM relationships, not generalized taste, visible-ink centroids, typography quality, or brand suitability.
- Browser-owned native indicator geometry remains unmeasurable through DOM rectangles.
- The corpus run is desktop-only; RTL, vertical writing, localization stress, forced colors, zoom, and cross-browser variation remain untested.
- The synthetic canonical asset proves identity and digest enforcement, not accessible naming, contrast, or minimum-size fitness.
- A wider spike should expose this policy through the active design-system source and existing browser-QA/repair seam. It should remain outside the kernel until a second domain validates the same rule families without new false positives.
