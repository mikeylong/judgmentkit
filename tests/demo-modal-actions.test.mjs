import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "scripts/demo-modal-actions.mjs");
const htmlPath = path.join(root, "examples/demo/modal-actions-evidence-demo.html");
const evidenceCaveat =
  "pass with reviewed: 0 means no modal-action evidence was inspected, not proof that the UI has no dialogs.";

function scenarioSection(transcript, scenarioId) {
  const start = transcript.indexOf(`### ${scenarioId}`);
  assert.notEqual(start, -1, `Missing scenario section: ${scenarioId}`);

  const next = transcript.indexOf("\n### ", start + 1);

  return next === -1 ? transcript.slice(start) : transcript.slice(start, next);
}

const result = spawnSync(process.execPath, [scriptPath], {
  encoding: "utf8",
});

assert.equal(result.status, 0, result.stderr);
assert.equal(result.stderr, "");

const transcript = result.stdout;
assert.ok(transcript.includes("# JudgmentKit Modal Action Evidence Demo"));
assert.ok(transcript.includes("This is a scripted fixture demo."));
assert.ok(
  transcript.includes(
    "Static report: examples/demo/modal-actions-evidence-demo.html",
  ),
);
assert.ok(transcript.includes(evidenceCaveat));

const expectations = [
  ["omittedEvidence", "passed", "pass", "0"],
  ["validEvidence", "passed", "pass", "1"],
  ["invalidOrder", "failed", "fail", "1"],
  ["primaryNotFinal", "failed", "fail", "1"],
  ["wrongSubmit", "failed", "fail", "1"],
  ["destructive", "passed", "not_applicable", "1"],
  ["rtl", "passed", "not_applicable", "1"],
];

for (const [
  scenarioId,
  implementationStatus,
  modalStatus,
  reviewedCount,
] of expectations) {
  const section = scenarioSection(transcript, scenarioId);

  assert.ok(
    section.includes(`Implementation review status: ${implementationStatus}`),
    `${scenarioId} should report implementation status`,
  );
  assert.ok(
    section.includes(`modal_actions.status: ${modalStatus}`),
    `${scenarioId} should report modal status`,
  );
  assert.ok(
    section.includes(`modal_actions.reviewed: ${reviewedCount}`),
    `${scenarioId} should report reviewed count`,
  );
}

assert.ok(
  scenarioSection(transcript, "invalidOrder").includes(
    'Secondary action "Cancel" must precede primary action "Create card".',
  ),
);
assert.ok(
  scenarioSection(transcript, "primaryNotFinal").includes(
    "Primary completion action must be visually final in LTR dialogs.",
  ),
);
assert.ok(
  scenarioSection(transcript, "wrongSubmit").includes(
    "Form submit/default Enter action must match the primary completion action.",
  ),
);
assert.ok(
  scenarioSection(transcript, "destructive").includes(
    "Destructive dialogs require separate destructive-action review.",
  ),
);
assert.ok(
  scenarioSection(transcript, "rtl").includes(
    "RTL dialogs invert final visual position and need direction-specific review.",
  ),
);

assert.equal(fs.existsSync(htmlPath), true);
const html = fs.readFileSync(htmlPath, "utf8");

assert.ok(html.includes("JudgmentKit Modal Action Evidence Demo"));
assert.ok(html.includes(evidenceCaveat));
assert.ok(html.includes("modal_actions.status"));
assert.ok(html.includes("Findings / problems"));

for (const [scenarioId] of expectations) {
  assert.ok(
    html.includes(`data-scenario-id="${scenarioId}"`),
    `HTML should include row for ${scenarioId}`,
  );
  assert.ok(
    html.includes(`id="${scenarioId}-detail"`),
    `HTML should include details for ${scenarioId}`,
  );
}

assert.equal(/<script\b/i.test(html), false, "HTML must not include scripts");
assert.equal(
  /(?:src|href)=["']https?:/i.test(html),
  false,
  "HTML must not load external assets",
);
assert.equal(/@import/i.test(html), false, "HTML must not import external CSS");
assert.equal(
  /url\(/i.test(html),
  false,
  "HTML must not reference external CSS URLs",
);

console.log("Modal action evidence demo checks passed.");
