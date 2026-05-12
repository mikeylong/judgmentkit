# Standalone Comparison Experiment

Use this when you want an early read on whether JudgmentKit improves generated UI compared with a raw one-shot generation path.

The default experiment uses two independently runnable apps from the same refund-triage brief:

- Version A: raw implementation-heavy brief baseline.
- Version B: JudgmentKit activity review, UI workflow review, and UI generation handoff.

There is also a music-app experiment using the same paired-app structure:

- Version A: track-library implementation baseline.
- Version B: dinner-playlist activity review, UI workflow review, and UI generation handoff.

The apps do not show treatment labels in the primary surface. Use the manifest only for facilitator setup and analysis.

## Run It

```bash
npm run demo:comparison
```

For the music-app comparison:

```bash
npm run demo:comparison:music
```

The command writes:

```text
examples/comparison/version-a.html
examples/comparison/version-b.html
examples/comparison/manifest.json
examples/comparison/music/dinner-playlist-implementation-heavy.brief.txt
examples/comparison/music/version-a.html
examples/comparison/music/version-b.html
examples/comparison/music/manifest.json
examples/comparison/music/facilitator-scorecard.md
```

Open the two HTML files as separate apps. Randomize order for each participant.

For the music-app comparison, use `examples/comparison/music/facilitator-scorecard.md` to record order, timing, constraint misses, implementation leakage, confidence, rework, and preference rationale.

To run the deterministic artifact scorer over the committed comparison apps:

```bash
npm run eval:ui
```

The scorer writes `evals/reports/ui-generation-report.json` and `evals/reports/ui-generation-report.html`. It checks activity-fit terms, decision support, disclosure discipline, handoff completeness, task-success support, and confidence/rework signals. Treat the output as paired-artifact evidence, not as a statistically powered benchmark.

## Evaluation Task

Ask the participant to review the selected refund request and prepare the next handoff.

For the music-app comparison, ask the participant to build a 10-song dinner playlist that starts mellow, lifts in the middle, avoids disliked artists and explicit tracks, and leaves a sequence note.

Observe:

- whether they can identify the correct next action
- whether they can explain the reason for the handoff
- how long it takes to reach a defensible decision
- which terms or controls distract them
- how much cleanup they would need before using the generated app
- for the music app, whether they miss content, disliked-artist, genre-balance, or energy-flow constraints

Score the result on task success, time to correct decision, implementation leakage noticed, reviewer confidence, and required rework before usable.

For the music app, also score time to playable playlist, constraint misses, host confidence, and participant preference with rationale.

## Interpretation

This is a qualitative calibration harness, not a statistically powered A/B test. It should show whether JudgmentKit changes the generated app toward activity fit, domain language, decision support, and disclosure discipline.

Do not use this slice to judge visual polish, component quality, or design-system compliance. Those remain later adapter-layer concerns.
