# JudgmentKit Slab J

Slab J is the selected JudgmentKit mark. Inter 780 at optical size 32 is the canonical wordmark typography, approved with the consistent family lockups on October 14, 2026. Its sloped cap, detached right upright, and nickel return follow the sharp planes and open cuts of surfaces.systems and kanban.cards. The canonical SVG preserves selected A exactly.

The separate 16px derivative aligns vertical edges to pixels, widens the mark from 9 to 10 visible pixels, and strengthens the nickel band from 2.5 to 3 pixels. The result has crisper edges and a more visible return. The detached construction can still read as a broken J or hook in isolation.

## Use the assets

1. Start with `judgmentkit.svg`, the canonical full-color mark on transparent ground. Use `svg/mark-reversed.svg` on ink. Both retain the nickel return.
2. Use the approved canonical horizontal lockups: `lockups/horizontal.svg` on light ground and `lockups/horizontal-reversed.svg` on dark ground. The wordmark contains outlined Inter 780 glyphs at optical size 32 and needs no installed font. `lockups/stacked.svg` and `lockups/stacked-reversed.svg` are the stacked derivatives. `lockups/horizontal-monochrome.svg` is available when only one color can be used.
3. Use `favicon/favicon.svg` for the responsive favicon and `favicon/favicon.ico` for the fallback. The SVG selects optical geometry at viewport widths up to 20px and canonical geometry above 20px. The optical derivative is designed for 16px; canonical use is recommended at 24px and above. The ICO stores optical 16px and canonical 32px/48px frames.
4. Use `app-icons/app-icon-1024.png` as the primary app source. The primary source is an opaque, square ink tile with ivory upper pieces and a nickel return. `app-icon-light-1024.png` provides an ivory tile. Platform masks supply corner rounding.
5. Use the Apple `AppIcon.appiconset`, macOS `judgmentkit.icns`/`.iconset`, or the 192px/512px maskable web icons for the corresponding platform. `web-head.html` and `web-manifest-icons.json` contain integration examples; adjust their static paths for the application.

## Color and size

| Role | Value |
| --- | --- |
| Ink | `#0B0D0E` |
| Ivory | `#F7F6F2` |
| Nickel return | `#8B9096` |
| Canonical minimum canvas | 24 × 24px |
| Optical minimum canvas | 16 × 16px |
| Clear space | 12 canonical units outward from visible bounds |

Keep the canonical 64 × 64 viewBox. Surrounding layout supplies clear space. The tightly framed favicon is the clear-space exception. Avoid sizes below 16px. Canonical 16px PNGs are comparison proofs; the dedicated optical derivative is the intended 16px favicon treatment.

Monochrome variants put all three pieces in one color. Use them where only one color is available. Nickel remains part of the primary identity.

## Lockup proportions

The canonical horizontal canvas is 425.013342449 × 109 units. The visible mark is 60 units tall, the type cap height is 38, and the gap between the mark and wordmark ink bounds is 20. The baseline is y=73. The type cap center and visible mark center both sit at y=54. Leave at least 24 units between visible ink and each canvas edge. Scale the complete lockup uniformly; keep the natural lowercase height and descenders. Do not stretch the mark, resize the wordmark independently, or replace the outlined type with live text.

The stacked derivative keeps the same 60-unit mark and 38-unit type cap height. It centers the mark and wordmark by their visible ink bounds, leaves a 20-unit vertical ink gap, and retains at least 24 units of outer padding. Its canvas is 369.013342449 × 178 units. The stacked arrangement is a derivative of the approved horizontal system.

Nickel stays on the lower Slab J plane in both primary lockup themes. The monochrome horizontal derivative puts every piece in ink. The website header's live Inter 600 text is a separate implementation; this asset update does not change the website or app.

`lockup-contract.json` records the exact dimensions, font fingerprint, approved sources, and export hashes. The immutable light/dark SVG and PNG references live under `source/approved-horizontal-*`.

## App placement

The app tile places a 640 × 640 mark viewport at (192, 192) on a 1024px canvas. The visible mark occupies x=332…692 and y=212…812. All vertices fit within the central maskable safe circle with a margin recorded in `placement.json`. Every app size uses canonical geometry.

The `composer` folder contains separate SVG foreground and background source layers. The two layers are flat source assets for Apple Icon Composer; no native `.icon` document is included.

## Motion and exclusions

`svg/mark-motion.svg` reveals the three fixed planes with opacity. Reduced-motion mode shows the complete static mark. Motion never moves, bends, or reassembles the geometry.

Keep the three planes separate and retain their slope directions. Do not add a dot, flatten the cap, join the cuts, round the corners, add outlines or bevels, or substitute a bracket or U. The direction lock records the exact selected proof and permitted optical correction.

## Review and rebuild

Open `index.html` through a local HTTP server to inspect the system. `proofs/asset-overview.png` shows the master, reversed mark, lockup, and app masks. `proofs/lockups.png` shows the canonical horizontal and stacked derivative in both themes. `proofs/pixel-proof.png` compares exported pixels at actual size and labels enlarged diagnostics. `proofs/family-fit.png` places the three approved family marks side by side.

Rebuild on macOS with Python 3, Pillow, ImageMagick, and the system Arial font for proof captions. Inter is not required because the wordmark is outlined:

```sh
python3 build_assets.py
python3 validate_assets.py
python3 package_assets.py
```

The included Inter outline and metrics are sufficient for rebuilding all lockups. The builder checks the canonical SVGs against the approved files, compares newly rendered PNG pixels, and preserves the approved PNG encoding. `tools/outline-wordmark.swift` can recreate the outlines with macOS CoreText from the exact Inter variable font recorded in `lockup-contract.json`; the tool verifies the font fingerprint, weight 780, optical size 32, and absence of fallback glyphs. Font binaries are not included. Proof captions use a system font and do not define wordmark typography.

`validate_assets.py` checks symbol geometry, outlined glyphs, actual path bounds, lockup proportions, primary colors, PNG render parity, and exact approved horizontal bytes. `validation.json` records the current results. `browser-verification.json` and `apple-catalog-validation.json` retain the earlier favicon and Apple catalog checks. The canonical symbol, favicon, and app icon geometry are preserved. Product integration has not been applied.
