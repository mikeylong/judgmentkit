import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "scripts/demo-music-comparison.mjs");
const outputDir = path.join(root, "examples/comparison/music");
const briefPath = path.join(outputDir, "dinner-playlist-implementation-heavy.brief.txt");
const versionAPath = path.join(outputDir, "version-a.html");
const versionBPath = path.join(outputDir, "version-b.html");
const manifestPath = path.join(outputDir, "manifest.json");
const scorecardPath = path.join(outputDir, "facilitator-scorecard.md");

const IMPLEMENTATION_TERMS = [
  "data model",
  "track table field",
  "JSON schema",
  "prompt template",
  "tool call",
  "resource id",
  "API endpoint",
  "CRUD",
];

const REVIEW_PACKET_TERMS = [
  "ready_for_review",
  "activity_model",
  "interaction_contract",
  "review_status",
  "guardrails",
  "JudgmentKit",
  "candidate",
];

function sectionBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);

  assert.notEqual(start, -1, `Missing section start: ${startMarker}`);
  assert.notEqual(end, -1, `Missing section end: ${endMarker}`);

  return text.slice(start, end);
}

function primarySurface(html) {
  return sectionBetween(html, "data-primary-surface", "comparison-metadata");
}

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");
}

function readMetadata(html) {
  const match = html.match(
    /<script type="application\/json" id="comparison-metadata">([\s\S]*?)<\/script>/,
  );
  assert.ok(match, "Missing comparison metadata script.");
  return JSON.parse(match[1]);
}

const result = spawnSync(process.execPath, [scriptPath], {
  encoding: "utf8",
});

assert.equal(result.status, 0, result.stderr);
assert.equal(result.stderr, "");
assert.ok(result.stdout.includes("# JudgmentKit Music Standalone Comparison"));
assert.ok(
  result.stdout.includes(
    "Source brief: examples/comparison/music/dinner-playlist-implementation-heavy.brief.txt",
  ),
);
assert.ok(result.stdout.includes("Version A: examples/comparison/music/version-a.html"));
assert.ok(result.stdout.includes("Version B: examples/comparison/music/version-b.html"));
assert.ok(
  result.stdout.includes("Scorecard: examples/comparison/music/facilitator-scorecard.md"),
);
assert.ok(result.stdout.includes("Guided handoff status: ready_for_generation"));
assert.ok(result.stdout.includes("Guided skill context status: ready"));

assert.equal(fs.existsSync(briefPath), true);
assert.equal(fs.existsSync(versionAPath), true);
assert.equal(fs.existsSync(versionBPath), true);
assert.equal(fs.existsSync(manifestPath), true);
assert.equal(fs.existsSync(scorecardPath), true);

const sourceBrief = fs.readFileSync(briefPath, "utf8");
const versionA = fs.readFileSync(versionAPath, "utf8");
const versionB = fs.readFileSync(versionBPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const scorecard = fs.readFileSync(scorecardPath, "utf8");
const versionAPrimary = visibleText(primarySurface(versionA));
const versionBPrimary = visibleText(primarySurface(versionB));
const versionAMetadata = readMetadata(versionA);
const versionBMetadata = readMetadata(versionB);

assert.ok(sourceBrief.includes("track_library data model"));
assert.ok(sourceBrief.includes("10-song dinner playlist"));
assert.ok(sourceBrief.includes("explicit-content"));

assert.ok(versionA.startsWith("<!doctype html>"));
assert.ok(versionB.startsWith("<!doctype html>"));
assert.ok(versionA.includes('data-variant="A"'));
assert.ok(versionB.includes('data-variant="B"'));
assert.equal(manifest.comparison_id, "dinner-playlist-standalone-v1");
assert.equal(manifest.randomized_order_required, true);
assert.equal(manifest.variants.length, 2);
assert.equal(
  manifest.source_brief_file,
  "examples/comparison/music/dinner-playlist-implementation-heavy.brief.txt",
);
assert.equal(
  manifest.scorecard_file,
  "examples/comparison/music/facilitator-scorecard.md",
);
assert.deepEqual(manifest.metrics, [
  "task success",
  "time to playable playlist",
  "constraint misses",
  "implementation leakage noticed",
  "host confidence",
  "required rework before usable",
  "participant preference with rationale",
]);

assert.ok(scorecard.includes("# Dinner Playlist Comparison Scorecard"));
assert.ok(scorecard.includes("Order shown: AB / BA"));
assert.ok(scorecard.includes("First app file"));
assert.ok(scorecard.includes("Second app file"));
assert.ok(scorecard.includes("Stop the task when they say the playlist is ready"));

const participantPrompt = sectionBetween(
  scorecard,
  "## Participant Prompt",
  "## Observation Notes",
);

assert.ok(participantPrompt.includes(manifest.task_prompt));

for (const treatmentTerm of [
  "raw_brief_baseline",
  "judgmentkit_handoff",
  "Version A",
  "Version B",
]) {
  assert.equal(
    participantPrompt.toLowerCase().includes(treatmentTerm.toLowerCase()),
    false,
    `participant prompt leaked treatment label: ${treatmentTerm}`,
  );
}

for (const metric of manifest.metrics) {
  assert.ok(
    scorecard.toLowerCase().includes(metric.toLowerCase()),
    `scorecard missing manifest metric: ${metric}`,
  );
}

for (const html of [versionA, versionB]) {
  assert.equal(
    /<link\b|<script\b(?![^>]*type="application\/json")|src=|href=/i.test(html),
    false,
    "music comparison apps should be standalone and avoid external assets or scripts",
  );
}

for (const primary of [versionAPrimary, versionBPrimary]) {
  assert.ok(primary.includes("Dinner Playlist Builder"));
  assert.ok(
    primary.includes(
      "Build a 10-song dinner playlist that starts mellow, lifts in the middle, avoids disliked artists and explicit tracks, and leaves a sequence note.",
    ),
  );
}

assert.equal(versionAMetadata.treatment, "raw_brief_baseline");
assert.equal(versionBMetadata.treatment, "judgmentkit_handoff");
assert.equal(versionBMetadata.generation_source.handoff_status, "ready_for_generation");
assert.equal(versionBMetadata.generation_source.workflow_review_status, "ready_for_review");
assert.equal(
  versionBMetadata.generation_source.frontend_context_status,
  "ready_for_frontend_implementation",
);
assert.equal(versionBMetadata.generation_source.frontend_skill_context_status, "ready");
assert.equal(versionBMetadata.frontend_skill_context.source_skill, "frontend-ui-implementation");
assert.equal(versionBMetadata.frontend_skill_context.raw_skill_exposed, false);
assert.equal(
  versionBMetadata.frontend_skill_context.design_system_mode,
  "no_design_system_adapter_provided",
);
assert.equal(
  versionBMetadata.frontend_skill_context.next_recommended_tool,
  "review_ui_implementation_candidate",
);
assert.ok(
  versionBMetadata.frontend_skill_context.verification_checklist.includes(
    "Run npm run eval:ui",
  ),
);
assert.equal(versionBMetadata.selected_playlist_id, "DINNER-10");

for (const term of IMPLEMENTATION_TERMS) {
  assert.ok(
    versionAPrimary.toLowerCase().includes(term.toLowerCase()),
    `baseline primary surface should expose implementation term: ${term}`,
  );
  assert.equal(
    versionBPrimary.toLowerCase().includes(term.toLowerCase()),
    false,
    `JudgmentKit primary surface leaked implementation term: ${term}`,
  );
}

for (const term of REVIEW_PACKET_TERMS) {
  assert.equal(
    versionBPrimary.toLowerCase().includes(term.toLowerCase()),
    false,
    `JudgmentKit primary surface leaked review-packet term: ${term}`,
  );
}

for (const phrase of [
  "Dinner brief",
  "Guest preferences",
  "Suggested tracks",
  "Playlist sequence",
  "Conflict checks",
  "Sequence note",
  "Add to playlist",
  "Move earlier",
  "Move later",
  "Remove track",
  "Save playlist",
  "Share playlist",
  "explicit track",
  "disliked artist",
  "genre balance",
  "energy flow",
  "mellow opener",
  "warm middle",
  "closing track",
]) {
  assert.ok(
    versionBPrimary.toLowerCase().includes(phrase.toLowerCase()),
    `JudgmentKit primary surface missing music activity phrase: ${phrase}`,
  );
}

for (const phrase of [
  "track_library data model",
  "Refresh JSON schema",
  "Save CRUD update",
  "Tool call result",
  "resource id",
  "API endpoint",
]) {
  assert.ok(
    versionAPrimary.toLowerCase().includes(phrase.toLowerCase()),
    `baseline primary surface missing implementation phrase: ${phrase}`,
  );
}

assert.equal(
  primarySurface(versionB).match(/class="track-row/g)?.length,
  12,
  "music comparison should include exactly 12 suggested tracks",
);

for (const trackTitle of [
  "Lantern Hour",
  "Table Glow",
  "Window Seat",
  "Apricot Static",
  "Second Serving",
  "Kitchen Lights",
  "Low Tide Signal",
  "Porch Current",
  "Afterglow Maps",
  "Nightcap Sketch",
  "Midnight Spill",
  "Velvet Return",
]) {
  assert.ok(
    versionBPrimary.includes(trackTitle),
    `music comparison should include suggested track: ${trackTitle}`,
  );
}

console.log("music standalone comparison demo checks passed.");
