# Preserved chart evidence replay

The new JudgmentKit chart observer rejects every original snapshot with overlapping labels and accepts every repaired snapshot. The preserved applications were read without modification.

The report covers 14 locations, two days, and two viewports for each version: 56 original and 56 repaired snapshots. Every original has label collisions; 28 also have clipping. All repaired snapshots pass collision, clipping, and selected-data correspondence checks. The report records each observation, candidate/contract bindings, source hashes, and unsupported claims.

The source fixture remains at `/Users/mike/Codex/tide-abcd-14-locations-2026-10-07/opus-a/repair-cycle-2`. `snapshot-R1-accepted-before-label-fix` preserves the original. Expected series values come from the unchanged `dist/data.js`; plot coordinates are attributed to the respective `src/TideChart.jsx` and scale helper. The report retains source paths and hashes.

An isolated headless Playwright CLI session served those files at localhost port 4326. `capture.js` is the exact browser callback used. It serialized the current selected values, inlined the existing CSS, and removed executable scripts from cloned documents. It captured 112 inert HTML snapshots in `/private/tmp/judgmentkit-mcp-chart-replay/snapshots.json`. Temporary browser profiles and the large snapshot bundle are not part of this change.

To replay captured snapshots against the current observer:

```sh
node scripts/replay-preserved-chart-evidence.mjs /Users/mike/Codex/tide-abcd-14-locations-2026-10-07/opus-a/repair-cycle-2 /private/tmp/judgmentkit-mcp-chart-replay/snapshots.json /private/tmp/judgmentkit-chart-replay-new
```

Static observations verify the supplied snapshots. They do not attest application selection transitions, human task completion, or Artifact Inspector authority. The report records local measurements; the hosted service has not been updated.
