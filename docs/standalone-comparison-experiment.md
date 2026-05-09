# Standalone Comparison Experiment

Use this when you want an early read on whether JudgmentKit2 improves generated UI compared with a raw one-shot generation path.

The experiment uses two independently runnable apps from the same refund-triage brief:

- Version A: raw implementation-heavy brief baseline.
- Version B: JudgmentKit2 activity review, UI workflow review, and UI generation handoff.

The apps do not show treatment labels in the primary surface. Use the manifest only for facilitator setup and analysis.

## Run It

```bash
npm run demo:comparison
```

The command writes:

```text
examples/comparison/version-a.html
examples/comparison/version-b.html
examples/comparison/manifest.json
```

Open the two HTML files as separate apps. Randomize order for each participant.

## Evaluation Task

Ask the participant to review the selected refund request and prepare the next handoff.

Observe:

- whether they can identify the correct next action
- whether they can explain the reason for the handoff
- how long it takes to reach a defensible decision
- which terms or controls distract them
- how much cleanup they would need before using the generated app

Score the result on task success, time to correct decision, implementation leakage noticed, reviewer confidence, and required rework before usable.

## Interpretation

This is a qualitative calibration harness, not a statistically powered A/B test. It should show whether JudgmentKit2 changes the generated app toward activity fit, domain language, decision support, and disclosure discipline.

Do not use this slice to judge visual polish, component quality, or design-system compliance. Those remain later adapter-layer concerns.
