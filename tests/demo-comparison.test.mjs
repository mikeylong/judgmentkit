import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "scripts/demo-comparison.mjs");
const versionAPath = path.join(root, "examples/comparison/version-a.html");
const versionBPath = path.join(root, "examples/comparison/version-b.html");
const manifestPath = path.join(root, "examples/comparison/manifest.json");

const IMPLEMENTATION_TERMS = [
  "database table",
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
  "JudgmentKit2",
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
assert.ok(result.stdout.includes("# JudgmentKit2 Standalone Comparison"));
assert.ok(result.stdout.includes("Version A: examples/comparison/version-a.html"));
assert.ok(result.stdout.includes("Version B: examples/comparison/version-b.html"));
assert.ok(result.stdout.includes("Guided handoff status: ready_for_generation"));

assert.equal(fs.existsSync(versionAPath), true);
assert.equal(fs.existsSync(versionBPath), true);
assert.equal(fs.existsSync(manifestPath), true);

const versionA = fs.readFileSync(versionAPath, "utf8");
const versionB = fs.readFileSync(versionBPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const versionAPrimary = visibleText(primarySurface(versionA));
const versionBPrimary = visibleText(primarySurface(versionB));
const versionAMetadata = readMetadata(versionA);
const versionBMetadata = readMetadata(versionB);

assert.ok(versionA.startsWith("<!doctype html>"));
assert.ok(versionB.startsWith("<!doctype html>"));
assert.ok(versionA.includes('data-variant="A"'));
assert.ok(versionB.includes('data-variant="B"'));
assert.equal(manifest.comparison_id, "refund-triage-standalone-v1");
assert.equal(manifest.randomized_order_required, true);
assert.equal(manifest.variants.length, 2);

for (const html of [versionA, versionB]) {
  assert.equal(
    /<link\b|<script\b(?![^>]*type="application\/json")|src=|href=/i.test(html),
    false,
    "comparison apps should be standalone and avoid external assets or scripts",
  );
}

for (const primary of [versionAPrimary, versionBPrimary]) {
  assert.ok(primary.includes("Refund Review Workspace"));
  assert.ok(
    primary.includes("Review the selected refund request and prepare the next handoff."),
  );
  assert.ok(primary.includes("R-1842"));
}

assert.equal(versionAMetadata.treatment, "raw_brief_baseline");
assert.equal(versionBMetadata.treatment, "judgmentkit2_handoff");
assert.equal(versionBMetadata.generation_source.handoff_status, "ready_for_generation");
assert.equal(versionBMetadata.generation_source.workflow_review_status, "ready_for_review");

for (const term of IMPLEMENTATION_TERMS) {
  assert.ok(
    versionAPrimary.toLowerCase().includes(term.toLowerCase()),
    `baseline primary surface should expose implementation term: ${term}`,
  );
  assert.equal(
    versionBPrimary.toLowerCase().includes(term.toLowerCase()),
    false,
    `JudgmentKit2 primary surface leaked implementation term: ${term}`,
  );
}

for (const term of REVIEW_PACKET_TERMS) {
  assert.equal(
    versionBPrimary.toLowerCase().includes(term.toLowerCase()),
    false,
    `JudgmentKit2 primary surface leaked review-packet term: ${term}`,
  );
}

for (const phrase of [
  "Evidence checklist",
  "Policy review context",
  "Approve refund",
  "Return for evidence",
  "Handoff reason",
  "Support agent",
]) {
  assert.ok(
    versionBPrimary.toLowerCase().includes(phrase.toLowerCase()),
    `JudgmentKit2 primary surface missing activity phrase: ${phrase}`,
  );
}

for (const phrase of [
  "database table",
  "Refresh JSON schema",
  "Save CRUD update",
  "Tool call result",
]) {
  assert.ok(
    versionAPrimary.toLowerCase().includes(phrase.toLowerCase()),
    `baseline primary surface missing implementation phrase: ${phrase}`,
  );
}

console.log("standalone comparison demo checks passed.");
