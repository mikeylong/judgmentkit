import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runVisualCompositionProof } from "../experiments/visual-composition-proof/checker.mjs";

const receiptPath = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-visual-composition-proof-")),
  "receipt.json",
);
const screenshotDir = path.join(path.dirname(receiptPath), "screenshots");

try {
  const receipt = await runVisualCompositionProof({ receiptPath, screenshotDir });

  assert.equal(receipt.kind, "visual_composition_evidence");
  assert.equal(receipt.policy_ref.version, "0.1.0-experimental");
  assert.equal(receipt.environment.measurement, "dom_geometry");
  assert.equal(receipt.outcome, "proof_passed");
  assert.equal(receipt.summary.expectation_mismatches, 0);
  assert.equal(receipt.screenshots.length, 2);
  assert.ok(
    receipt.screenshots.every((screenshot) => fs.statSync(screenshot.path).size > 4096),
    "The paired fixture should produce desktop and mobile overlay screenshots.",
  );
  assert.ok(receipt.summary.fail >= 4, "The proof must catch the paired mechanical failures.");
  assert.ok(receipt.summary.pass >= 4, "The proof must accept paired repairs.");
  assert.equal(
    receipt.summary.pass_with_warning,
    8,
    "Six corpus controls plus the two fixture viewports should warn without failing.",
  );

  const byId = new Map(
    receipt.samples.map((sample) => [
      `${sample.document_id}:${sample.viewport.id}:${sample.sample_id}`,
      sample,
    ]),
  );

  for (const [badId, goodId] of [
    ["metadata-bad", "metadata-good"],
    ["columns-bad", "columns-good"],
    ["atom-bad", "atom-good"],
    ["owned-select-bad", "owned-select-good"],
    ["lockup-bad", "lockup-good"],
  ]) {
    assert.equal(byId.get(`paired-fixtures-desktop:desktop:${badId}`)?.actual, "fail");
    assert.equal(byId.get(`paired-fixtures-desktop:desktop:${goodId}`)?.actual, "pass");
  }

  assert.equal(
    byId.get("corpus-clinical-intake-review:desktop:clinical-metadata-values")?.actual,
    "fail",
  );
  assert.equal(
    byId.get("corpus-clinical-intake-review:desktop:clinical-readiness-description-columns")?.actual,
    "fail",
  );
  assert.equal(
    byId.get("corpus-refund-protected-atom:desktop:refund-selected-state-atom")?.actual,
    "fail",
  );

  const nativeSamples = receipt.samples.filter(
    (sample) => sample.code === "browser_owned_indicator_unmeasured",
  );
  assert.equal(nativeSamples.length, 8);
  assert.ok(
    nativeSamples.every((sample) => sample.actual === "pass_with_warning"),
    "Browser-owned indicator geometry must never become a pixel hard gate.",
  );
  assert.equal(
    nativeSamples.filter((sample) => sample.document_id.startsWith("corpus-")).length,
    6,
    "The audited corpus contains six browser-owned native select controls.",
  );

  const healthyMui = receipt.documents.find(
    (document) => document.document_id === "corpus-healthy-mui-no-applicable-contract",
  );
  assert.equal(healthyMui?.sample_count, 0);
  assert.equal(healthyMui?.outcome, "no_applicable_contract");

  const mobileRelationshipSamples = receipt.samples.filter(
    (sample) =>
      sample.document_id === "paired-fixtures-desktop" &&
      sample.viewport.id === "mobile" &&
      ["metadata-bad", "metadata-good", "columns-bad", "columns-good"].includes(
        sample.sample_id,
      ),
  );
  assert.equal(mobileRelationshipSamples.length, 4);
  assert.ok(
    mobileRelationshipSamples.every((sample) => sample.actual === "not_applicable"),
    "Desktop shared-rail relationships should deactivate after the fixture stacks.",
  );

  assert.equal(fs.existsSync(receiptPath), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(receiptPath, "utf8")), receipt);
} finally {
  fs.rmSync(path.dirname(receiptPath), { recursive: true, force: true });
}

process.stdout.write("Visual composition proof passed.\n");
