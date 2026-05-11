import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "scripts/demo-one-shot.mjs");
const briefPath = path.join(
  root,
  "examples/demo/refund-ops-implementation-heavy.brief.txt",
);
const htmlPath = path.join(root, "examples/demo/one-shot-demo.html");

function sectionBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);

  assert.notEqual(start, -1, `Missing section start: ${startMarker}`);
  assert.notEqual(end, -1, `Missing section end: ${endMarker}`);

  return text.slice(start, end);
}

const result = spawnSync(process.execPath, [scriptPath], {
  encoding: "utf8",
});

assert.equal(result.status, 0, result.stderr);
assert.equal(result.stderr, "");

const transcript = result.stdout;
const sourceBrief = fs.readFileSync(briefPath, "utf8").trim();
const implementationTerms = [
  "database table",
  "JSON schema",
  "prompt template",
  "tool call",
  "resource id",
  "API endpoint",
  "CRUD",
];
const reviewPacketTerms = [
  "Activity",
  "Primary user",
  "Outcome",
  "Main decision",
  "ready_for_review",
  "activity_model",
  "interaction_contract",
  "review_status",
  "guardrails",
  "Terms on the surface",
  "Review status",
];
const workflowPhrases = [
  "selected case",
  "evidence checklist",
  "policy review",
  "approve refund",
  "return for evidence",
  "next owner",
  "handoff reason",
  "send handoff",
];

assert.ok(transcript.includes("# JudgmentKit One-Shot Before/After Demo"));
assert.ok(transcript.includes("This is a scripted fixture demo."));
assert.ok(transcript.includes("Static visual demo: examples/demo/one-shot-demo.html"));
assert.ok(transcript.includes("## Source Brief"));
assert.ok(transcript.includes(sourceBrief));
assert.ok(transcript.includes("## Without JudgmentKit"));
assert.ok(transcript.includes("## With JudgmentKit"));
assert.ok(transcript.includes("### Activity Review Summary"));
assert.ok(transcript.includes("### Accepted Workflow Review"));
assert.ok(transcript.includes("### Rejected Workflow Review"));
assert.ok(transcript.includes("### Accepted Workflow UI Concept"));
assert.ok(transcript.includes("## What Changed"));

const baselineSection = sectionBetween(
  transcript,
  "## Without JudgmentKit",
  "## With JudgmentKit",
);
const guidedPrimarySection = sectionBetween(
  transcript,
  "### Accepted Workflow UI Concept",
  "### Disclosure Boundary",
);
const acceptedWorkflowReviewSection = sectionBetween(
  transcript,
  "### Accepted Workflow Review",
  "### Rejected Workflow Review",
);
const rejectedWorkflowReviewSection = sectionBetween(
  transcript,
  "### Rejected Workflow Review",
  "### Accepted Workflow UI Concept",
);
const comparisonSection = transcript.slice(transcript.indexOf("## What Changed"));

assert.ok(
  acceptedWorkflowReviewSection.includes("Review status: ready_for_review"),
  "accepted workflow review should be ready",
);
assert.ok(
  acceptedWorkflowReviewSection.includes("Implementation terms in primary fields: none"),
  "accepted workflow review should not report implementation leakage",
);
assert.ok(
  acceptedWorkflowReviewSection.includes("Review terms in primary fields: none"),
  "accepted workflow review should not report review-packet leakage",
);
assert.ok(
  rejectedWorkflowReviewSection.includes("Review status: needs_source_context"),
  "rejected workflow review should be blocked",
);
for (const term of ["JSON schema", "CRUD", "ready_for_review"]) {
  assert.ok(
    rejectedWorkflowReviewSection.toLowerCase().includes(term.toLowerCase()),
    `rejected workflow review should include blocked term: ${term}`,
  );
}

for (const term of implementationTerms) {
  assert.ok(
    baselineSection.toLowerCase().includes(term.toLowerCase()),
    `baseline section should include implementation term: ${term}`,
  );
  assert.equal(
    guidedPrimarySection.toLowerCase().includes(term.toLowerCase()),
    false,
    `guided primary UI concept leaked implementation term: ${term}`,
  );
}

for (const term of reviewPacketTerms) {
  assert.equal(
    guidedPrimarySection.toLowerCase().includes(term.toLowerCase()),
    false,
    `guided primary UI concept leaked review-packet term: ${term}`,
  );
}

for (const phrase of [
  "customer refund escalation cases",
  "support operations manager",
  "clear handoff",
  ...workflowPhrases,
]) {
  assert.ok(
    guidedPrimarySection.toLowerCase().includes(phrase.toLowerCase()),
    `guided primary UI concept missing phrase: ${phrase}`,
  );
}

assert.ok(comparisonSection.includes("| Starting point |"));
assert.ok(comparisonSection.includes("Data model and CRUD surface"));
assert.ok(comparisonSection.includes("Refund triage workflow and handoff"));
assert.ok(comparisonSection.includes("Implementation terms contained"));

assert.equal(fs.existsSync(htmlPath), true);
const html = fs.readFileSync(htmlPath, "utf8");
const baselineHtml = sectionBetween(
  html,
  'data-demo-section="without-judgmentkit"',
  'data-demo-section="with-judgmentkit"',
);
const guidedPrimaryHtml = sectionBetween(
  html,
  "data-demo-primary-ui",
  "data-demo-diagnostics",
);
const diagnosticHtml = sectionBetween(
  html,
  "data-demo-diagnostics",
  "data-demo-rejected-review",
);
const rejectedHtml = sectionBetween(
  html,
  "data-demo-rejected-review",
  '<section class="compare"',
);

assert.ok(html.includes("JudgmentKit One-Shot UI Demo"));
assert.ok(html.includes(sourceBrief));
assert.ok(html.includes("Refund Case CRUD Console"));
assert.ok(html.includes("Refund Escalation Queue"));
assert.ok(html.includes("Rejected candidate guardrail result"));

for (const term of implementationTerms) {
  assert.ok(
    baselineHtml.toLowerCase().includes(term.toLowerCase()),
    `baseline visual should include implementation term: ${term}`,
  );
  assert.equal(
    guidedPrimaryHtml.toLowerCase().includes(term.toLowerCase()),
    false,
    `guided primary visual leaked implementation term: ${term}`,
  );
  assert.ok(
    diagnosticHtml.toLowerCase().includes(term.toLowerCase()),
    `diagnostic visual should include implementation term: ${term}`,
  );
}

for (const term of reviewPacketTerms) {
  assert.equal(
    guidedPrimaryHtml.toLowerCase().includes(term.toLowerCase()),
    false,
    `guided primary visual leaked review-packet term: ${term}`,
  );
}

for (const phrase of [
  "customer refund escalation",
  "refund escalation queue",
  ...workflowPhrases,
]) {
  assert.ok(
    guidedPrimaryHtml.toLowerCase().includes(phrase.toLowerCase()),
    `guided primary visual missing phrase: ${phrase}`,
  );
}

assert.ok(
  diagnosticHtml.toLowerCase().includes("review status"),
  "diagnostic visual should include review status",
);
assert.ok(
  diagnosticHtml.toLowerCase().includes("ready_for_review"),
  "diagnostic visual should include analyzer readiness",
);

assert.ok(
  rejectedHtml.toLowerCase().includes("needs_source_context"),
  "rejected visual should show blocked status",
);
for (const term of ["JSON schema", "CRUD", "ready_for_review"]) {
  assert.ok(
    rejectedHtml.toLowerCase().includes(term.toLowerCase()),
    `rejected visual should include blocked term: ${term}`,
  );
}

console.log("one-shot demo checks passed.");
