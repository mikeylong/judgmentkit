# Presentation Theme Actual Evidence

This directory is committed replay evidence for `judgmentkit/presentation-theme` actual PPTX checks.
Runnable source lives in `scripts/presentation-theme/`; files here are inert outputs.

Review order:
1. `README.md`
2. `manifest.json`
3. `hashes.json`
4. Contact sheets (`*-montage.png`)
5. Full-size rendered slide PNG folders

Regenerate only through `npm run presentation-theme:actual:update` with `JUDGMENTKIT_PPTX_ACTUAL=1 JUDGMENTKIT_PPTX_UPDATE=1`.

Binary PPTX, PNG, and WEBP diffs are meaningful only when paired with updated hashes plus semantic evidence such as structural JSON, evidence JSON, manifest, or review-summary changes.
