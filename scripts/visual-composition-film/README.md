# Visual composition film

`visual-composition-runtime-demo.html` is the editable source for the light and dark homepage films. The story starts with Draftling assembling a plausible first draft too quickly, then hands the same artifact to the Judgment agent for browser review and measured repair.

`generate-draftling-prelude.mjs` produces the original opening music used for Draftling's entrance and three build actions. The published, caption-free films and posters remain under `site/assets/releases/`.

Keep the light and dark captures on the same 38.2-second timeline so the homepage can switch themes without moving the playhead to a different story beat.

Keep a continuous musical bed through the Draftling-to-Judgment handoff. The repaired candidate track was rendered from `output/playwright/public-mcp-demo/judgmentkit-draftling-soundtrack-handoff-repaired.wav` (SHA-256 `454efb9ae47b78fa7b9363c9db48a2cb5daa5328a6785c9614e87a9168a750ee`) with a localized gain envelope from 5.3–6.3 seconds, encoded once as 48 kHz stereo AAC, and muxed unchanged into both theme videos. `tests/site.test.mjs` checks the contiguous 5.5–6.4 second transition with overlapping 100 ms and 200 ms windows, so a short dropout cannot hide inside a passing whole-window average. It also rejects an over-loud repair bump, out-of-range integrated loudness, insufficient true-peak headroom, or different encoded audio between the two films.

Opening the authored HTML directly autoplays and loops the full cinematic; the bottom-left control pauses and resumes that motion. Add `?autoplay=0` when you need the manual authoring surface. Homepage embeds remain parent-controlled so the synchronized soundtrack stays the single playback clock.

When the live HTML replaces the native visual, keep the playing MP4 full-size and rendered behind the opaque stage. That is a structural safeguard, not proof of uninterrupted audible output. The controller makes one recovery attempt with a one-second deadline after an unexpected live-media pause; if it fails, the independent visual clock continues in a truthful gesture-required audio state and Unmute can reattach the soundtrack at the current playhead.
