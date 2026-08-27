# Visual composition film

`visual-composition-runtime-demo.html` is the editable source for the light and dark homepage films. The story starts with Draftling assembling a plausible first draft too quickly, then hands the same artifact to the Judgment agent for browser review and measured repair.

`generate-draftling-prelude.mjs` produces the original opening music used for Draftling's entrance and three build actions. The published, caption-free films and posters remain under `site/assets/releases/`.

Keep the light and dark captures on the same 38.2-second timeline so the homepage can switch themes without moving the playhead to a different story beat.

Keep a continuous musical bed through the Draftling-to-Judgment handoff. The repaired candidate track was rendered from `output/playwright/public-mcp-demo/judgmentkit-draftling-soundtrack-handoff-repaired.wav` (SHA-256 `454efb9ae47b78fa7b9363c9db48a2cb5daa5328a6785c9614e87a9168a750ee`) with a localized gain envelope from 5.3–6.3 seconds, encoded once as 48 kHz stereo AAC, and muxed unchanged into both theme videos. `tests/site.test.mjs` checks the contiguous 5.5–6.4 second transition with overlapping 100 ms and 200 ms windows, so a short dropout cannot hide inside a passing whole-window average. It also rejects an over-loud repair bump, out-of-range integrated loudness, insufficient true-peak headroom, or different encoded audio between the two films.

Opening the authored HTML directly autoplays and loops the full cinematic; the bottom-left control pauses and resumes that motion. Add `?autoplay=0` when you need the manual authoring surface. The homepage does not embed this HTML; it uses the captured light or dark MP4 as its sole picture, soundtrack, and timeline.

Keep the homepage video user-initiated and natively looping. Native controls must remain available until the compact custom controls bind successfully. Light and dark source changes must preserve the current playhead, playing or paused state, mute state, and volume. Do not reintroduce an iframe renderer, a separate soundtrack transport, or an independent visual clock.
