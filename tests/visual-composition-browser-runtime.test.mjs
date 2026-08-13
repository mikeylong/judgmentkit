import assert from "node:assert/strict";

import { createUiImplementationContract } from "../src/index.mjs";
import { measureVisualCompositionInBrowser } from "../src/visual-composition-browser-runtime.mjs";

const runtimeSource = await import("node:fs/promises").then((fs) =>
  fs.readFile(
    new URL("../src/visual-composition-browser-runtime.mjs", import.meta.url),
    "utf8",
  ),
);
assert.ok(
  runtimeSource.includes('"--disable-dev-shm-usage"'),
  "Serverless Chromium must use /tmp when /dev/shm is unavailable.",
);

const implementationContract = createUiImplementationContract({
  repo_name: "Visual Composition Runtime Test",
  target_stack: "HTML",
}).implementation_contract;

const measured = await measureVisualCompositionInBrowser({
  implementationContract,
  candidate: {
    rendered_html: `<!doctype html>
      <html>
        <head>
          <style>
            body { font: 16px/20px Arial, sans-serif; padding: 24px; }
            button { display: inline-flex; gap: 8px; padding: 12px; }
            button svg { width: 20px; height: 20px; transform: translateY(7px); }
            button span { display: inline-block; line-height: 20px; }
            .brand-row { display: flex; gap: 10px; margin-top: 28px; }
            .brand-row svg { width: 28px; height: 28px; transform: translateY(8px); }
            .brand-row span { display: inline-block; font-size: 24px; line-height: 28px; }
            select { display: block; margin-top: 32px; width: 240px; height: 40px; }
            .custom-select { display: flex; align-items: center; box-sizing: border-box; width: 480px; height: 64px; margin-top: 32px; padding: 0 4px 0 32px; border: 1px solid; }
            .custom-select svg { width: 20px; height: 20px; margin-left: auto; }
            .ambiguous-listbox { display: flex; width: 320px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <button type="button" aria-label="Create report">
            <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /></svg>
            <span>Create report</span>
          </button>
          <div class="brand-row">
            <svg aria-hidden="true" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" /></svg>
            <span>Brownfield safety design</span>
          </div>
          <div style="display:flex">
            <svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /></svg>
            <div><span>Complex parent</span><span>must not become a direct pair</span></div>
          </div>
          <select aria-label="Board">
            <option>kanban.cards</option>
          </select>
          <div class="custom-select" role="combobox" aria-expanded="false" aria-label="Board type">
            <span data-part="label">kanban.cards</span>
            <svg data-part="indicator" aria-hidden="true" viewBox="0 0 20 20"><path d="M4 7l6 6 6-6" /></svg>
          </div>
          <div class="ambiguous-listbox" role="listbox" aria-label="Layout">
            <span>Layout</span><span>Compact</span>
          </div>
        </body>
      </html>`,
    visual_composition_manifest: {
      applicability: "none",
      rationale: "Caller-authored no-applicable claims are not trusted.",
      inspection: { root_selector: "html", declared_relationship_count: 0 },
      samples: [],
    },
  },
});

assert.equal(measured.reason, undefined);
assert.equal(measured.manifest.applicability, "declared");
assert.equal(measured.receipt.environment.issuer, "judgmentkit_browser_runtime");
assert.equal(measured.receipt.environment.measurement, "dom_geometry");
assert.equal(measured.receipt.environment.fonts_ready, true);
assert.equal(measured.receipt.sample_count, measured.receipt.samples.length);
assert.ok(measured.receipt.samples.length >= 10);

const iconTextSamples = measured.receipt.samples.filter(
  (sample) => sample.rule_id === "inline_pair.box_center",
);
assert.equal(iconTextSamples.length, 4);
assert.ok(iconTextSamples.every((sample) => sample.actual === "fail"));
assert.ok(
  iconTextSamples.every((sample) => sample.code === "inline_pair_box_center_delta_exceeded"),
);
assert.ok(
  iconTextSamples.every((sample) => sample.evidence.box_center_delta_css_px > 1),
);

const nativeSelectSamples = measured.receipt.samples.filter(
  (sample) =>
    sample.rule_id === "presentation_owner.select_indicator" &&
    sample.presentation_owner === "browser",
);
assert.equal(nativeSelectSamples.length, 2);
assert.ok(nativeSelectSamples.every((sample) => sample.actual === "pass_with_warning"));
assert.ok(
  nativeSelectSamples.every(
    (sample) => sample.code === "browser_owned_indicator_unmeasured",
  ),
);

const ownedSelectSamples = measured.receipt.samples.filter(
  (sample) =>
    sample.rule_id === "presentation_owner.select_indicator" &&
    sample.presentation_owner === "design_system",
);
assert.equal(ownedSelectSamples.length, 2);
assert.ok(ownedSelectSamples.every((sample) => sample.actual === "fail"));
assert.ok(
  ownedSelectSamples.every((sample) => sample.code === "owned_select_composition_mismatch"),
);

const ambiguousCustomSelectSamples = measured.receipt.samples.filter(
  (sample) => sample.evidence?.classification === "owned_select_parts_ambiguous",
);
assert.equal(ambiguousCustomSelectSamples.length, 2);
assert.ok(ambiguousCustomSelectSamples.every((sample) => sample.actual === "review"));
assert.ok(
  ambiguousCustomSelectSamples.every(
    (sample) => sample.code === "presentation_owner_undeclared",
  ),
);
assert.equal(measured.receipt.outcome, "fail");
for (const document of measured.receipt.documents) {
  assert.match(document.artifact_sha256, /^[a-f0-9]{64}$/);
  assert.equal(
    document.sample_count,
    measured.receipt.samples.filter((sample) => sample.document_id === document.document_id).length,
  );
}

const noApplicable = await measureVisualCompositionInBrowser({
  implementationContract,
  candidate: {
    rendered_markup: "<main><p>A plain self-contained document.</p></main>",
  },
});
assert.equal(noApplicable.manifest.applicability, "none");
assert.equal(noApplicable.manifest.inspection.declared_relationship_count, 0);
assert.equal(noApplicable.receipt.sample_count, 0);
assert.equal(noApplicable.receipt.outcome, "not_applicable");
assert.ok(noApplicable.receipt.documents.every((document) => document.sample_count === 0));

const protectedAtomCalibration = Object.entries(
  implementationContract.visual_composition_policy.calibrations,
).find(([, calibration]) => calibration.rule_id === "protected_atom.single_line");
assert.ok(protectedAtomCalibration);
const relationshipLimitCandidate = {
  rendered_html: `<main>${Array.from(
    { length: 51 },
    (_, index) => `<span id="atom-${index}">Atom ${index}</span>`,
  ).join("")}</main>`,
  visual_composition_manifest: {
    samples: Array.from({ length: 51 }, (_, index) => ({
      sample_id: `atom-${index}`,
      rule_id: "protected_atom.single_line",
      calibration_ref: protectedAtomCalibration[0],
      component_family: protectedAtomCalibration[1].component_family,
      selector: `#atom-${index}`,
      target_selector: `#atom-${index}`,
    })),
  },
};
const relationshipLimit = await measureVisualCompositionInBrowser({
  implementationContract,
  candidate: relationshipLimitCandidate,
});
assert.equal(relationshipLimit.receipt.outcome, "fail");
assert.equal(relationshipLimit.receipt.samples.length, 2);
assert.ok(
  relationshipLimit.receipt.samples.every(
    (sample) =>
      sample.code === "relationship_limit_exceeded" &&
      sample.evidence.explicit_relationship_count === 51 &&
      sample.evidence.observed_relationship_count_at_least === 51,
  ),
  "The 51st relationship must produce blocking evidence instead of truncation.",
);

const autoRelationshipLimit = await measureVisualCompositionInBrowser({
  implementationContract,
  candidate: {
    rendered_html: `<main>${Array.from(
      { length: 51 },
      (_, index) => `<select aria-label="Select ${index}"><option>Option ${index}</option></select>`,
    ).join("")}</main>`,
  },
});
assert.equal(autoRelationshipLimit.receipt.outcome, "fail");
assert.equal(autoRelationshipLimit.receipt.samples.length, 2);
assert.ok(
  autoRelationshipLimit.receipt.samples.every(
    (sample) =>
      sample.code === "relationship_limit_exceeded" &&
      sample.evidence.explicit_relationship_count === 0 &&
      sample.evidence.observed_relationship_count_at_least === 51,
  ),
  "The 51st auto-discovered relationship must fail closed instead of truncating.",
);

const invalidRules = await measureVisualCompositionInBrowser({
  implementationContract,
  candidate: {
    rendered_markup: "<main id=\"invalid-rule-root\"><p>Manifest validation</p></main>",
    visual_composition_manifest: {
      samples: [
        {
          sample_id: "unknown-rule",
          rule_id: "invented.visual.rule",
          selector: "#invalid-rule-root",
        },
        {
          sample_id: "missing-rule-id",
          selector: "#invalid-rule-root",
        },
      ],
    },
  },
});
assert.equal(invalidRules.receipt.outcome, "review");
assert.equal(invalidRules.receipt.samples.length, 4);
assert.ok(
  invalidRules.receipt.samples.every(
    (sample) => sample.actual === "review" && sample.code === "unsupported_rule_kind",
  ),
);
assert.deepEqual(
  new Set(invalidRules.receipt.samples.map((sample) => sample.rule_id)),
  new Set(["invented.visual.rule", "manifest.rule.invalid"]),
);

assert.deepEqual(
  await measureVisualCompositionInBrowser({
    implementationContract,
    candidate: { code: "export function App() { return <button>Not rendered</button>; }" },
  }),
  {
    manifest: null,
    receipt: null,
    reason: "visual_composition_candidate_not_renderable",
  },
);

const previousConfiguredChrome = process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH;
process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH = "/not/a/chrome/executable";
try {
  for (const candidate of [
    { rendered_html: "<main onclick=\"alert(1)\">Unsafe event</main>" },
    { rendered_html: "<main><script>document.body.textContent = 'unsafe'</script></main>" },
    { rendered_html: "<main style=\"background:url(https://example.com/a.png)\">Remote</main>" },
    { rendered_html: "<iframe srcdoc=\"<p>nested</p>\"></iframe>" },
    {
      rendered_html: "<main>First source</main>",
      rendered_markup: "<main>Ambiguous second source</main>",
    },
  ]) {
    assert.deepEqual(
      await measureVisualCompositionInBrowser({ candidate, implementationContract }),
      {
        manifest: null,
        receipt: null,
        reason: "visual_composition_candidate_not_renderable",
      },
      "Unsafe and ambiguous candidates must be rejected before resolving Chrome.",
    );
  }
} finally {
  if (previousConfiguredChrome === undefined) {
    delete process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH;
  } else {
    process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH = previousConfiguredChrome;
  }
}

process.stdout.write("Visual composition browser runtime checks passed.\n");
