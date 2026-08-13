# Visual composition proof

This is a bounded experiment for testing declared presentation relationships in rendered UI. It is not part of the JudgmentKit kernel, not a general aesthetic score, and not authority to change existing product or design-system contracts.

## Activity and interaction

The activity is pre-acceptance review of AI-generated interface composition. A design-system or repo-local presentation owner declares a small set of relationships; an implementing agent renders the UI; a reviewer uses deterministic browser evidence to decide whether those declared relationships survived implementation.

The interaction contract is intentionally small:

1. The presentation owner selects a rule and a component-specific calibration in `policy.json`.
2. `specimen.json` binds that rule to explicit document and part selectors.
3. The runtime waits for fonts, measures the declared parts, and emits the observed geometry and outcome.
4. The reviewer accepts the evidence, requests a constrained repair, or stops for missing intent or authority.

The checker may evaluate only declared relationships. It must not infer that unrelated elements should align, treat a browser-painted select indicator as author-owned geometry, or derive universal optical thresholds from screenshots.

## Exact go/no-go decision

The experiment is **GO for a wider implementation-contract spike** when one runtime run proves all of the following:

- every paired `*-bad` fixture returns `fail` and its paired `*-good` fixture returns `pass`;
- the fixture native select returns `pass_with_warning` with `browser_owned_indicator_unmeasured`;
- both clinical corpus seeds and the refund protected-atom seed return their declared `fail` outcomes;
- all six native selects across the four corpus documents return `pass_with_warning` with `browser_owned_indicator_unmeasured` rather than a fabricated inset judgment;
- the healthy Material UI document returns `no_applicable_contract` from an empty sample set;
- every document, selector, rule, calibration, presentation owner, and canonical lockup reference resolves without fallback;
- the receipt preserves raw CSS-pixel measurements, derived values, named calibration, expected outcome, actual outcome, and any warning or review reason.

The experiment is **NO-GO** if any expected outcome differs, a required selector or authority is missing, the runtime silently invents a threshold or composition, a native select is hard-failed from an unmeasurable browser indicator, or a reconstructed lockup passes as the canonical asset.

**Result: GO for the wider adapter-layer spike.** The 2026-08-12 Chromium run returned `proof_passed` with zero expectation mismatches. This is not authorization to modify the kernel or promote these rules as universal UI standards.

## Authority boundary

`policy.json` models an experimental export that could later be referenced by `implementation_contract.design_system_source.source_exports`. It remains at the implementation-adapter layer:

- the active design system or declared repo-local component family owns presentation intent, component calibrations, protected atoms, and canonical assets;
- the runtime may measure, compare, and report only;
- JudgmentKit's activity model, interaction contract, disclosure policy, and kernel schema are unchanged;
- no fixture or corpus observation becomes a universal design rule;
- a missing composition, calibration, presentation owner, or approved asset requires review instead of inference.

## Running

The intended command is:

```bash
npm run proof:visual-composition
```

The command runs the dependency-free Chrome DevTools Protocol checker, measures the declared relationships, validates expected outcomes, and captures temporary desktop/mobile overlay screenshots. To preserve a receipt and overlays for review, call `runVisualCompositionProof` with `receiptPath` and `screenshotDir`; the latest local run is under the ignored `output/playwright/visual-composition-proof/` directory.

## Corpus coverage

The specimen contains:

- one local paired-fixture document covering two shared anchors, a protected atom, a design-system-owned select indicator, a canonical lockup, and a browser-owned native select control;
- the existing clinical metadata and readiness-column seeds;
- the existing refund selected-state atom seed;
- four existing corpus documents containing six browser-owned native selects;
- one healthy Material UI document with no declared applicable composition contract.

All corpus artifact paths are relative to this experiment directory.

## Limitations

- v0.1 covers the paired fixture at desktop `1365x900` and mobile `390x844`, plus the audited corpus at desktop `1365x900`; all runs use DPR 1, horizontal LTR layout, and the rendered ready state.
- It checks declared DOM geometry. It does not measure raster-ink centroids, optical taste, typography quality, or generalized visual polish.
- Browser/OS-native select indicators are not exposed as measurable DOM parts and therefore produce a warning, not an inset verdict.
- The canonical-lockup proof checks one declared asset reference; it does not prove minimum size, contrast, accessible naming, or brand suitability.
- Corpus files can drift. A missing or changed selector invalidates the evidence rather than silently retargeting it.
- User-supplied screenshots motivate the experiment but are not executable evidence because they lack inspectable DOM, asset provenance, font state, and presentation ownership.
- Responsive, RTL, vertical-writing, animated, canvas-only, and localization-stress cases are deferred.
