import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createUiImplementationContract } from "../src/index.mjs";
import { measureVisualCompositionInBrowser } from "../src/visual-composition-browser-runtime.mjs";

const previousTmpDir = process.env.TMPDIR;
const browserRuntimeTempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "judgmentkit-vc-runtime-test-"),
);
process.env.TMPDIR = browserRuntimeTempRoot;

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
assert.ok(ownedSelectSamples.every((sample) => sample.actual === "review"));
assert.ok(
  ownedSelectSamples.every((sample) => sample.code === "calibration_missing"),
);
assert.ok(
  ownedSelectSamples.every(
    (sample) =>
      sample.calibration_ref === undefined &&
      sample.composition_variant === undefined &&
      sample.evidence.classification ===
        "owned_select_composition_intent_undeclared",
  ),
  "Unannotated custom selects must require review without inheriting the compact calibration.",
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

const fieldCalibrationEntry = Object.entries(
  implementationContract.visual_composition_policy.calibrations,
).find(
  ([, calibration]) =>
    calibration.composition_variant === "field_value_trailing_indicator_slot",
);
const compactCalibrationEntry = Object.entries(
  implementationContract.visual_composition_policy.calibrations,
).find(
  ([, calibration]) =>
    calibration.composition_variant === "centered_label_symmetric_rails",
);
assert.ok(fieldCalibrationEntry);
assert.ok(compactCalibrationEntry);

const explicitSelectVariants = await measureVisualCompositionInBrowser({
  implementationContract,
  candidate: {
    rendered_html: `<!doctype html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font: 16px/20px Arial, sans-serif; }
            .control { position: relative; width: 320px; height: 64px; margin-block: 8px; }
            .field [data-part='value'] {
              position: absolute;
              inset-block-start: 22px;
              inset-inline: 0 48px;
              padding-inline-start: 16px;
              white-space: nowrap;
            }
            .field [data-part='indicator-slot'] {
              position: absolute;
              inset-block: 0;
              inset-inline-end: 0;
              width: 48px;
              display: grid;
              place-items: center;
            }
            .field [data-part='indicator'] { width: 16px; height: 16px; }
            #field-wrong-value [data-part='value'] { padding-inline-start: 28px; }
            #field-wrong-slot [data-part='indicator-slot'] { width: 28px; }
            #field-off-center [data-part='indicator-slot'] {
              place-items: center end;
              padding-inline-end: 6px;
            }
            #field-oversized [data-part='indicator'] { width: 20px; height: 20px; }
            #field-overlap { width: 200px; }
            #field-overlap [data-part='value'] {
              inset-inline-end: 40px;
              font-family: monospace;
            }
            #field-overflow [data-part='value'] {
              inset-inline: -8px auto;
              width: max-content;
              padding: 0;
            }
            #field-long-ltr-hidden [data-part='value'] {
              overflow: hidden;
              text-overflow: ellipsis;
            }
            #field-long-rtl-clip,
            #field-long-rtl-visible { direction: rtl; }
            #field-long-rtl-clip [data-part='value'] {
              overflow: clip;
              text-overflow: ellipsis;
            }
            #field-long-ltr-visible [data-part='value'],
            #field-long-rtl-visible [data-part='value'] {
              overflow: visible;
              text-overflow: ellipsis;
            }
            #field-centered [data-part='value'] {
              inset-inline: auto;
              left: 50%;
              transform: translateX(-50%);
              width: max-content;
              padding: 0;
            }
            #field-rtl { direction: rtl; }
            #compact-centered [data-part='label'] {
              position: absolute;
              top: 22px;
              left: 50%;
              transform: translateX(-50%);
            }
            #compact-centered [data-part='indicator'] {
              position: absolute;
              top: 22px;
              width: 20px;
              height: 20px;
              inset-inline-end: 8px;
            }
            #select-wrapper { position: relative; }
            #bad-real-select [data-part='value'],
            #exact-probe-select [data-part='value'] { padding-inline-start: 100px; }
            #bad-real-select [data-part='indicator-slot'],
            #exact-probe-select [data-part='indicator-slot'] { width: 28px; }
            #exact-probe-select .probe-value {
              position: absolute;
              inset-inline-start: 16px;
              top: 22px;
            }
            #exact-probe-select .probe-slot {
              position: absolute;
              inset-block: 0;
              inset-inline-end: 0;
              width: 48px;
              display: grid;
              place-items: center;
            }
            #exact-probe-select .probe-arrow {
              width: 16px;
              height: 16px;
            }
            #select-wrapper .probe {
              position: relative;
              width: 2px;
              height: 2px;
              overflow: hidden;
            }
            #select-wrapper .probe-value,
            #select-wrapper .probe-slot,
            #select-wrapper .probe-indicator {
              position: absolute;
              inset: 0;
              width: 1px;
              height: 1px;
            }
          </style>
        </head>
        <body>
          <div id="field-correct" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-wrong-value" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-wrong-slot" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-off-center" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-oversized" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 20 20"><path d="M4 7l6 6 6-6" /></svg></span>
          </div>
          <div id="field-overlap" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">abcdefghijklmnop</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-overflow" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-long-ltr-hidden" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">A very long board name that must truncate before entering the trailing indicator slot</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-long-rtl-clip" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">هذا اسم لوحة طويل للغاية ويجب اختصاره قبل منطقة مؤشر القائمة</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-long-ltr-visible" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">A very long board name that visibly overflows into the trailing indicator slot</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-long-rtl-visible" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">هذا اسم لوحة طويل للغاية ويظهر فوق منطقة مؤشر القائمة</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-centered" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="field-rtl" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="compact-centered" class="control" role="combobox" aria-label="Board">
            <span data-part="label">kanban.cards</span>
            <svg data-part="indicator" aria-hidden="true" viewBox="0 0 20 20"><path d="M4 7l6 6 6-6" /></svg>
          </div>
          <div id="intent-ref" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="intent-family" class="control field" role="combobox" aria-label="Board">
            <span data-part="value">kanban.cards</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="exact-probe-select" class="control field" role="combobox" aria-label="Adversarial board control">
            <span data-part="value">bad visible value</span>
            <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
            <span class="probe-value">good probe</span>
            <span class="probe-slot"><svg class="probe-arrow" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
          </div>
          <div id="select-wrapper">
            <div id="bad-real-select" class="control field" role="combobox" aria-label="Bad board control">
              <span data-part="value">kanban.cards</span>
              <span data-part="indicator-slot"><svg data-part="indicator" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg></span>
            </div>
            <div class="probe" aria-hidden="true">
              <span class="probe-value">x</span>
              <span class="probe-slot"><svg class="probe-indicator" viewBox="0 0 1 1"><path d="M0 0h1v1z" /></svg></span>
            </div>
          </div>
        </body>
      </html>`,
    visual_composition_manifest: {
      samples: [
        ...[
          ["field-correct", "field-correct"],
          ["field-wrong-value", "field-wrong-value"],
          ["field-wrong-slot", "field-wrong-slot"],
          ["field-off-center", "field-off-center"],
          ["field-oversized", "field-oversized"],
          ["field-overlap", "field-overlap"],
          ["field-overflow", "field-overflow"],
          ["field-long-ltr-hidden", "field-long-ltr-hidden"],
          ["field-long-rtl-clip", "field-long-rtl-clip"],
          ["field-long-ltr-visible", "field-long-ltr-visible"],
          ["field-long-rtl-visible", "field-long-rtl-visible"],
          ["field-centered", "field-centered"],
          ["field-rtl", "field-rtl"],
        ].map(([sampleId, selectorId]) => ({
          sample_id: sampleId,
          rule_id: "presentation_owner.select_indicator",
          calibration_ref: fieldCalibrationEntry[0],
          component_family: fieldCalibrationEntry[1].component_family,
          composition_variant: fieldCalibrationEntry[1].composition_variant,
          selector: `#${selectorId}`,
          presentation_owner: "design_system",
          value_selector: "[data-part='value']",
          indicator_slot_selector: "[data-part='indicator-slot']",
          indicator_selector: "[data-part='indicator']",
        })),
        {
          sample_id: "compact-centered",
          rule_id: "presentation_owner.select_indicator",
          calibration_ref: compactCalibrationEntry[0],
          component_family: compactCalibrationEntry[1].component_family,
          composition_variant: compactCalibrationEntry[1].composition_variant,
          selector: "#compact-centered",
          presentation_owner: "design_system",
          label_selector: "[data-part='label']",
          indicator_selector: "[data-part='indicator']",
        },
        {
          sample_id: "intent-ref",
          rule_id: "presentation_owner.select_indicator",
          calibration_ref: fieldCalibrationEntry[0],
          component_family: fieldCalibrationEntry[1].component_family,
          selector: "#intent-ref",
          presentation_owner: "design_system",
          value_selector: "[data-part='value']",
          indicator_slot_selector: "[data-part='indicator-slot']",
          indicator_selector: "[data-part='indicator']",
        },
        {
          sample_id: "intent-family",
          rule_id: "presentation_owner.select_indicator",
          component_family: fieldCalibrationEntry[1].component_family,
          selector: "#intent-family",
          presentation_owner: "design_system",
          value_selector: "[data-part='value']",
          indicator_slot_selector: "[data-part='indicator-slot']",
          indicator_selector: "[data-part='indicator']",
        },
        {
          sample_id: "exact-probe",
          rule_id: "presentation_owner.select_indicator",
          calibration_ref: fieldCalibrationEntry[0],
          component_family: fieldCalibrationEntry[1].component_family,
          composition_variant: fieldCalibrationEntry[1].composition_variant,
          selector: "#exact-probe-select",
          presentation_owner: "design_system",
          value_selector: ".probe-value",
          indicator_slot_selector: ".probe-slot",
          indicator_selector: ".probe-arrow",
        },
        {
          sample_id: "wrapper-probe",
          rule_id: "presentation_owner.select_indicator",
          calibration_ref: fieldCalibrationEntry[0],
          component_family: fieldCalibrationEntry[1].component_family,
          composition_variant: fieldCalibrationEntry[1].composition_variant,
          selector: "#select-wrapper",
          container_selector: ".probe",
          presentation_owner: "design_system",
          value_selector: ".probe-value",
          indicator_slot_selector: ".probe-slot",
          indicator_selector: ".probe-indicator",
        },
      ],
    },
  },
});

const selectVariantSamples = explicitSelectVariants.receipt.samples.filter(
  (sample) => sample.rule_id === "presentation_owner.select_indicator",
);
const samplesNamed = (sampleId) =>
  selectVariantSamples.filter((sample) => sample.sample_id.startsWith(`${sampleId}-`));

assert.equal(samplesNamed("field-correct").length, 2);
assert.equal(samplesNamed("field-wrong-value").length, 2);
assert.equal(samplesNamed("field-wrong-slot").length, 2);
assert.equal(samplesNamed("field-off-center").length, 2);
assert.equal(samplesNamed("field-oversized").length, 2);
assert.equal(samplesNamed("field-overlap").length, 2);
assert.equal(samplesNamed("field-overflow").length, 2);
assert.equal(samplesNamed("field-long-ltr-hidden").length, 2);
assert.equal(samplesNamed("field-long-rtl-clip").length, 2);
assert.equal(samplesNamed("field-long-ltr-visible").length, 2);
assert.equal(samplesNamed("field-long-rtl-visible").length, 2);
assert.equal(samplesNamed("field-centered").length, 2);
assert.equal(samplesNamed("field-rtl").length, 2);
assert.equal(samplesNamed("compact-centered").length, 2);
assert.equal(samplesNamed("intent-ref").length, 2);
assert.equal(samplesNamed("intent-family").length, 2);
assert.equal(samplesNamed("exact-probe").length, 2);
assert.equal(samplesNamed("wrapper-probe").length, 2);

for (const sample of samplesNamed("field-correct")) {
  assert.equal(sample.actual, "pass");
  assert.equal(sample.composition_variant, "field_value_trailing_indicator_slot");
  assert.equal(sample.evidence.value_start_inset_css_px, 16);
  assert.equal(sample.evidence.indicator_slot_width_css_px, 48);
  assert.equal(sample.evidence.indicator_slot_end_inset_css_px, 0);
  assert.equal(sample.evidence.indicator_inline_size_css_px, 16);
  assert.equal(sample.evidence.indicator_end_inset_css_px, 16);
  assert.equal(sample.evidence.indicator_slot_center_delta_css_px, 0);
  assert.equal(sample.evidence.value_start_delta_css_px, 0);
  assert.equal(sample.evidence.indicator_slot_width_delta_css_px, 0);
  assert.equal(sample.evidence.indicator_inline_size_delta_css_px, 0);
  assert.ok(sample.evidence.value_indicator_gap_css_px >= 16);
  assert.equal(sample.evidence.value_does_not_overlap_slot, true);
  assert.equal(sample.evidence.value_part_rect.left, sample.evidence.container_rect.left);
  assert.equal(
    sample.evidence.value_text_rect.left - sample.evidence.container_rect.left,
    16,
    "Field geometry must use the rendered text range, not the stretched value part.",
  );
}
for (const sample of samplesNamed("field-wrong-value")) {
  assert.equal(sample.actual, "fail");
  assert.equal(sample.code, "owned_select_composition_mismatch");
  assert.equal(sample.evidence.value_start_inset_css_px, 28);
  assert.equal(sample.evidence.value_start_delta_css_px, 12);
  assert.equal(sample.evidence.indicator_slot_width_css_px, 48);
}
for (const sample of samplesNamed("field-wrong-slot")) {
  assert.equal(sample.actual, "fail");
  assert.equal(sample.code, "owned_select_composition_mismatch");
  assert.equal(sample.evidence.indicator_slot_width_css_px, 28);
  assert.equal(sample.evidence.indicator_slot_width_delta_css_px, 20);
  assert.equal(sample.evidence.indicator_end_inset_css_px, 6);
}
for (const sample of samplesNamed("field-off-center")) {
  assert.equal(sample.actual, "fail");
  assert.equal(sample.evidence.indicator_slot_width_css_px, 48);
  assert.equal(sample.evidence.indicator_inline_size_css_px, 16);
  assert.equal(sample.evidence.indicator_end_inset_css_px, 6);
  assert.equal(sample.evidence.indicator_slot_center_delta_css_px, 10);
}
for (const sample of samplesNamed("field-oversized")) {
  assert.equal(sample.actual, "fail");
  assert.equal(sample.evidence.indicator_inline_size_css_px, 20);
  assert.equal(sample.evidence.indicator_inline_size_delta_css_px, 4);
}
for (const sample of samplesNamed("field-overlap")) {
  assert.equal(sample.actual, "fail");
  assert.ok(sample.evidence.value_slot_gap_css_px < 0);
  assert.ok(sample.evidence.value_indicator_gap_css_px < 16);
  assert.equal(sample.evidence.value_does_not_overlap_slot, false);
}
for (const sample of samplesNamed("field-overflow")) {
  assert.equal(sample.actual, "fail");
  assert.equal(sample.evidence.value_start_inset_css_px, -8);
  assert.equal(sample.evidence.logical_geometry_nonnegative, false);
  assert.equal(sample.evidence.value_part_contained_inline, false);
}
for (const sample of samplesNamed("field-long-ltr-hidden")) {
  assert.equal(sample.actual, "pass");
  assert.equal(sample.evidence.direction, "ltr");
  assert.equal(sample.evidence.value_start_inset_css_px, 16);
  assert.equal(sample.evidence.indicator_slot_width_css_px, 48);
  assert.equal(sample.evidence.indicator_inline_size_css_px, 16);
  assert.equal(sample.evidence.value_white_space, "nowrap");
  assert.equal(sample.evidence.value_overflow_x, "hidden");
  assert.equal(sample.evidence.value_text_overflow, "ellipsis");
  assert.equal(sample.evidence.raw_value_text_overflows_part, true);
  assert.equal(sample.evidence.value_overflow_governed, true);
  assert.equal(sample.evidence.value_part_contained_inline, true);
  assert.equal(sample.evidence.value_indicator_gap_css_px, 16);
  assert.equal(sample.evidence.value_slot_gap_css_px, 0);
}
for (const sample of samplesNamed("field-long-rtl-clip")) {
  assert.equal(sample.actual, "pass");
  assert.equal(sample.evidence.direction, "rtl");
  assert.equal(sample.evidence.value_start_inset_css_px, 16);
  assert.equal(sample.evidence.indicator_slot_width_css_px, 48);
  assert.equal(sample.evidence.indicator_inline_size_css_px, 16);
  assert.equal(sample.evidence.value_white_space, "nowrap");
  assert.equal(sample.evidence.value_overflow_x, "clip");
  assert.equal(sample.evidence.value_text_overflow, "ellipsis");
  assert.equal(sample.evidence.raw_value_text_overflows_part, true);
  assert.equal(sample.evidence.value_overflow_governed, true);
  assert.equal(sample.evidence.value_part_contained_inline, true);
  assert.equal(sample.evidence.value_indicator_gap_css_px, 16);
  assert.equal(sample.evidence.value_slot_gap_css_px, 0);
}
for (const sample of [
  ...samplesNamed("field-long-ltr-visible"),
  ...samplesNamed("field-long-rtl-visible"),
]) {
  assert.equal(sample.actual, "fail");
  assert.equal(sample.code, "owned_select_composition_mismatch");
  assert.equal(sample.evidence.value_start_inset_css_px, 16);
  assert.equal(sample.evidence.indicator_slot_width_css_px, 48);
  assert.equal(sample.evidence.indicator_inline_size_css_px, 16);
  assert.equal(sample.evidence.value_white_space, "nowrap");
  assert.equal(sample.evidence.value_overflow_x, "visible");
  assert.equal(sample.evidence.value_text_overflow, "ellipsis");
  assert.equal(sample.evidence.raw_value_text_overflows_part, true);
  assert.equal(sample.evidence.value_overflow_governed, false);
  assert.equal(sample.evidence.value_part_contained_inline, true);
}
for (const sample of samplesNamed("field-centered")) {
  assert.equal(sample.actual, "fail");
  assert.ok(sample.evidence.value_start_inset_css_px > 100);
  assert.ok(sample.evidence.value_start_delta_css_px > 80);
}
for (const sample of samplesNamed("field-rtl")) {
  assert.equal(sample.actual, "pass");
  assert.equal(sample.evidence.direction, "rtl");
  assert.equal(sample.evidence.value_start_inset_css_px, 16);
  assert.equal(sample.evidence.indicator_slot_width_css_px, 48);
  assert.equal(sample.evidence.indicator_slot_end_inset_css_px, 0);
  assert.equal(sample.evidence.indicator_end_inset_css_px, 16);
  assert.equal(sample.evidence.indicator_slot_center_delta_css_px, 0);
}
for (const sample of samplesNamed("compact-centered")) {
  assert.equal(sample.actual, "pass");
  assert.equal(sample.composition_variant, "centered_label_symmetric_rails");
  assert.equal(sample.evidence.label_center_delta_css_px, 0);
  assert.equal(sample.evidence.trailing_rail_width_css_px, 36);
}
for (const sample of [
  ...samplesNamed("intent-ref"),
  ...samplesNamed("intent-family"),
]) {
  assert.equal(sample.actual, "review");
  assert.equal(sample.code, "calibration_missing");
  assert.equal(sample.composition_variant, undefined);
  assert.equal(
    sample.evidence.classification,
    "owned_select_composition_intent_undeclared",
  );
  assert.equal(sample.calibration_ref, fieldCalibrationEntry[0]);
}
for (const sample of samplesNamed("wrapper-probe")) {
  assert.equal(sample.actual, "fail");
  assert.equal(sample.code, "select_control_missing");
  assert.equal(sample.evidence.classification, "declared_select_root_not_control");
}
for (const sample of samplesNamed("exact-probe")) {
  assert.equal(sample.actual, "fail");
  assert.equal(sample.code, "owned_select_parts_missing");
  assert.equal(
    sample.evidence.classification,
    "declared_select_parts_not_semantic_control_parts",
  );
}
const autoDiscoveredBadRealSelect = selectVariantSamples.filter(
  (sample) =>
    sample.sample_id.startsWith("auto-owned-select-review-") &&
    sample.evidence?.classification === "owned_select_composition_intent_undeclared",
);
assert.equal(autoDiscoveredBadRealSelect.length, 2);
assert.ok(autoDiscoveredBadRealSelect.every((sample) => sample.actual === "review"));

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

const leakedBrowserProfiles = fs
  .readdirSync(browserRuntimeTempRoot, { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && entry.name.startsWith("judgmentkit-vc-runtime-"),
  )
  .map((entry) => entry.name);
try {
  assert.deepEqual(
    leakedBrowserProfiles,
    [],
    "Completed browser measurements must not leave Chrome user-data directories behind.",
  );
} finally {
  if (previousTmpDir === undefined) delete process.env.TMPDIR;
  else process.env.TMPDIR = previousTmpDir;
  fs.rmSync(browserRuntimeTempRoot, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}

process.stdout.write("Visual composition browser runtime checks passed.\n");
