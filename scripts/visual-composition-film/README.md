# Visual composition film

`visual-composition-runtime-demo.html` is the editable source for the light and dark homepage films. The story starts with Draftling assembling a plausible first draft too quickly, then hands the same artifact to the Judgment agent for browser review and measured repair.

`generate-draftling-prelude.mjs` produces the original opening music used for Draftling's entrance and three build actions. The published, caption-free films and posters remain under `site/assets/releases/`.

Keep the light and dark captures on the same 38.2-second timeline so the homepage can switch themes without moving the playhead to a different story beat.

Keep a continuous musical bed through the Draftling-to-Judgment handoff. In the published mix, the 5.6–6.3 second window must average at least -24 dBFS so the intentional transition does not read as a playback dropout. The current release applies a smooth, localized lift centered at 6.0 seconds and muxes the same final AAC track into both theme videos; `tests/site.test.mjs` verifies that handoff level with FFmpeg.

Opening the authored HTML directly autoplays and loops the full cinematic; the bottom-left control pauses and resumes that motion. Add `?autoplay=0` when you need the manual authoring surface. Homepage embeds remain parent-controlled so the synchronized soundtrack stays the single playback clock.

When the live HTML replaces the native visual, keep the playing MP4 full-size and rendered behind the opaque stage. Safari pauses video made non-visible through CSS, which would otherwise hand the animation to its silent visual clock and permanently drop the music.
