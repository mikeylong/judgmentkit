import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildSite,
  hashComponentAutomatedEvidence,
} from "../../site/build-site.mjs";
import { RUNTIME_COMPONENT_IDS } from "../../site/component-specimen-runtime.mjs";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

const automatedEvidenceProbe = {
  run_id: "probe",
  package_status: "pass",
  scenarios: [{ id: "action_button.ready", status: "verified" }],
  automated_evidence_hash: "excluded-from-its-own-hash",
  reviewer_receipt: { status: "pass", hash: "excluded-reviewer-data" },
};
const automatedEvidenceProbeHash = hashComponentAutomatedEvidence(
  automatedEvidenceProbe,
);
assert.equal(
  automatedEvidenceProbeHash,
  hashComponentAutomatedEvidence({
    ...automatedEvidenceProbe,
    reviewer_receipt: { status: "stale" },
    automated_evidence_hash: "another-excluded-value",
  }),
);
assert.notEqual(
  automatedEvidenceProbeHash,
  hashComponentAutomatedEvidence({
    ...automatedEvidenceProbe,
    package_status: "failed",
  }),
);

const outDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "judgmentkit-component-site-"),
);

try {
  await buildSite(outDir);

  const componentPagePath = path.join(
    outDir,
    "design-system",
    "components",
    "index.html",
  );
  const componentPage = fs.readFileSync(componentPagePath, "utf8");
  const componentPageMarkdown = fs.readFileSync(
    path.join(outDir, "design-system", "components", "index.html.md"),
    "utf8",
  );
  const patternPage = fs.readFileSync(
    path.join(outDir, "design-system", "patterns", "index.html"),
    "utf8",
  );
  const siteCss = fs.readFileSync(
    path.join(outDir, "assets", "site.css"),
    "utf8",
  );
  const referenceInventory = readJson(
    path.join(outDir, "design-system", "component-inventory.json"),
  );
  const specimens = readJson(
    path.join(outDir, "design-system", "component-specimens.json"),
  );
  const patternSpecimens = readJson(
    path.join(outDir, "design-system", "pattern-specimens.json"),
  );
  const registry = readJson(
    path.join(outDir, "design-system", "component-registry.json"),
  );
  const contracts = readJson(
    path.join(outDir, "design-system", "component-contracts.json"),
  );
  const manifest = readJson(
    path.join(outDir, "design-system", "manifest.json"),
  );

  assert.equal(contracts.contracts.length, 17);
  assert.equal(registry.registry.length, 17);
  assert.equal(registry.scenarios.length, 65);
  assert.deepEqual(registry.renderer_components, RUNTIME_COMPONENT_IDS);
  const verifiedScenarioCount = registry.scenarios.filter(
    (scenario) => scenario.status === "verified",
  ).length;
  const unverifiedScenarioCount = registry.scenarios.filter(
    (scenario) => scenario.status !== "verified",
  ).length;
  assert.equal(verifiedScenarioCount + unverifiedScenarioCount, 65);
  assert.equal(typeof registry.evidence.current, "boolean");
  const reviewerReceipt = registry.evidence.reviewer_receipt;
  if (registry.evidence.current) {
    assert.equal(registry.evidence.package_status, "pass");
    assert.equal(registry.evidence.automated_accessibility_status, "pass");
    assert.ok(registry.evidence.run_id);
    assert.ok(reviewerReceipt?.path?.startsWith("docs/evidence/"));
    assert.equal(
      reviewerReceipt.hash,
      sha256(fs.readFileSync(path.resolve(reviewerReceipt.path), "utf8")),
    );
    assert.equal(reviewerReceipt.status, "pass");
    assert.equal(verifiedScenarioCount, 65);
    assert.equal(reviewerReceipt.scenario_count, 65);
    assert.equal(reviewerReceipt.presentation_count, 260);
    assert.equal(reviewerReceipt.component_ids.length, 17);
    assert.equal(reviewerReceipt.scenario_ids.length, 65);
    assert.equal(
      reviewerReceipt.automated_evidence_hash,
      registry.evidence.automated_evidence_hash,
    );
    assert.deepEqual(
      reviewerReceipt.unsupported_claims,
      registry.evidence.unsupported_claims,
    );
    assert.deepEqual(
      reviewerReceipt.fixture_output_hashes,
      registry.evidence.fixture_output_hashes,
    );
  } else {
    assert.equal(registry.evidence.package_status, "unverified");
    assert.equal(registry.evidence.automated_accessibility_status, "unverified");
    assert.equal(registry.evidence.run_id, null);
    assert.equal(verifiedScenarioCount, 0);
  }
  assert.equal(
    manifest.exports.component_inventory,
    "/design-system/component-inventory.json",
  );
  assert.equal(
    manifest.exports.component_registry,
    "/design-system/component-registry.json",
  );

  assert.deepEqual(referenceInventory.totals.public, {
    folders: 19,
    families: 122,
    variants: 336,
  });
  assert.deepEqual(referenceInventory.totals.hidden, {
    families: 6,
    variants: 18,
  });
  assert.deepEqual(referenceInventory.totals.all, {
    families: 128,
    variants: 354,
  });
  assert.equal(referenceInventory.families.length, 128);

  assert.equal(
    (componentPage.match(/data-component-coverage="(?:inventory|normalization|runtime)"/g) ?? [])
      .length,
    3,
  );
  for (const coverageId of ["inventory", "normalization", "runtime"]) {
    assert.match(
      componentPage,
      new RegExp(`data-component-coverage="${coverageId}"`),
    );
  }
  const inventorySection = componentPage.match(
    /<section class="design-system-section design-system-inventory"[\s\S]*?<\/section>/,
  )?.[0];
  assert.ok(inventorySection, "The component page must lead with a reader-facing inventory.");
  const primaryInventory = inventorySection.split(
    '<details class="design-system-inventory-details">',
  )[0];
  for (const implementationTerm of [
    "Semantic normalization",
    "Runtime candidate",
    "contract IDs",
    "Audit metadata",
    "Scenario representation",
    "Current evidence",
  ]) {
    assert.equal(
      primaryInventory.includes(implementationTerm),
      false,
      `${implementationTerm} must remain behind the inventory disclosure.`,
    );
  }
  assert.match(
    inventorySection,
    /<details class="design-system-inventory-details">\s*<summary>How the reference maps to JudgmentKit<\/summary>/,
  );
  for (const content of [
    "128/128 families",
    "354/354 variants",
    "122 public families / 336 public variants",
    "6 hidden families / 18 hidden variants",
    "128/128 families classified",
    "304/354 reference variants",
    "105/105 classified",
    "17/17 contract IDs have local implementation candidates",
    "65/65 required-state scenarios",
    `${verifiedScenarioCount}/65 required states currently verified`,
  ]) {
    assert.ok(componentPage.includes(content), `component page should show ${content}`);
    assert.ok(
      componentPageMarkdown.includes(content),
      `component Markdown should show ${content}`,
    );
  }
  for (const disposition of [
    "component: 31 families",
    "internal part: 22 families",
    "pattern: 33 families",
    "variant: 4 families",
    "template: 22 families",
    "typography role: 13 families",
    "authoring helper: 3 families",
  ]) {
    assert.ok(
      componentPage.includes(disposition),
      `component page should show the ${disposition} disposition`,
    );
    assert.ok(
      componentPageMarkdown.includes(disposition),
      `component Markdown should show the ${disposition} disposition`,
    );
  }
  assert.ok(
    componentPage.includes(
      "Standalone icons are excluded; icon-bearing component families remain in the accounting.",
    ),
  );
  for (const prohibitedClaim of [
    "five-component pilot",
    "These five specimens",
    "354/354 variants semantically normalized",
    "65/65 required states supported",
  ]) {
    assert.equal(
      componentPage.includes(prohibitedClaim),
      false,
      `component page must not overclaim ${prohibitedClaim}`,
    );
    assert.equal(
      componentPageMarkdown.includes(prohibitedClaim),
      false,
      `component Markdown must not overclaim ${prohibitedClaim}`,
    );
  }

  assert.equal(specimens.specimens.length, 17);
  assert.equal(specimens.contract_coverage.length, 17);
  assert.deepEqual(
    specimens.specimens.map((specimen) => specimen.contract_id),
    RUNTIME_COMPONENT_IDS,
  );

  for (const specimen of specimens.specimens) {
    assert.equal(specimen.renderer_id, "judgmentkit.react-components.candidate-v1");
    assert.equal(specimen.package_export, "judgmentkit/react");
    assert.equal(specimen.stylesheet_export, "judgmentkit/react/styles.css");
    assert.ok(specimen.public_export);
    assert.equal(specimen.output_hash, sha256(specimen.rendered_html));
    assert.equal(
      specimen.fixture_output_hash,
      registry.evidence.fixture_output_hashes[specimen.contract_id],
    );
    assert.deepEqual(
      specimen.covered_states,
      specimen.scenarios
        .filter((scenario) => scenario.status === "verified")
        .map((scenario) => scenario.state),
    );
    assert.deepEqual(
      specimen.unverified_states,
      specimen.scenarios
        .filter((scenario) => scenario.status !== "verified")
        .map((scenario) => scenario.state),
    );
    assert.deepEqual(
      [...specimen.covered_states, ...specimen.unverified_states].sort(),
      [...specimen.required_states].sort(),
    );
    assert.match(
      specimen.rendered_html,
      new RegExp(`data-component-runtime="judgmentkit/react"`),
    );
    assert.match(
      componentPage,
      new RegExp(`data-component-specimen-runtime="${specimen.contract_id}"`),
    );
  }

  assert.equal(
    (componentPage.match(/data-specimen-id="component\.[^"]+"/g) ?? []).length,
    17,
    "The component page must render one live specimen root per component.",
  );
  assert.equal(
    (componentPage.match(/class="jk-specimen-preview jk-component-preview"/g) ?? [])
      .length,
    17,
    "The component page must not wrap a live preview in another preview shell.",
  );
  assert.equal(
    (componentPage.match(/<details class="design-system-specimen-details">/g) ?? [])
      .length,
    17,
    "Each component must expose one collapsed metadata disclosure.",
  );
  assert.doesNotMatch(
    componentPage,
    /class="design-system-specimen-support"/,
    "Component evidence must not occupy a permanent side panel beside the UI.",
  );

  for (const contract of contracts.contracts) {
    assert.match(
      componentPage,
      new RegExp(`data-component-contract="${contract.id}"`),
    );
  }

  for (const runtimeId of RUNTIME_COMPONENT_IDS) {
    assert.match(
      componentPage,
      new RegExp(`data-component-specimen-runtime="${runtimeId}"`),
    );
    assert.match(
      componentPage,
      new RegExp(
        `data-component-contract="${runtimeId}" data-component-runtime-status="implemented"`,
      ),
    );
  }
  assert.doesNotMatch(componentPage, /data-component-runtime-status="not_implemented"/);

  assert.doesNotMatch(componentPage, /jk-sample-/);
  assert.match(componentPage, /\/assets\/component-specimens\.js/);
  assert.match(componentPage, /\/assets\/component-specimens\.css/);
  assert.ok(
    fs.statSync(path.join(outDir, "assets", "component-specimens.js")).size > 0,
  );
  assert.ok(
    fs.statSync(path.join(outDir, "assets", "component-specimens.css")).size > 0,
  );

  const expectedPatternControlCount = patternSpecimens.specimens.reduce(
    (count, specimen) => count + specimen.covered_controls.length,
    0,
  );
  const renderedPatternControlMarkers = patternPage.match(
    /data-pattern-control="[^"]+"/g,
  ) ?? [];
  assert.equal(
    renderedPatternControlMarkers.length,
    expectedPatternControlCount,
    "Every expected control must appear exactly once in its rendered surface.",
  );
  const renderedPatternActionButtons = patternPage.match(
    /<button\b(?=[^>]*data-pattern-control="[^"]+")(?=[^>]*data-jk-component="action_button")[^>]*>[\s\S]*?<\/button>/g,
  ) ?? [];
  assert.ok(
    renderedPatternActionButtons.length > 0,
    "Action-oriented surfaces should still use the real ActionButton component.",
  );
  for (const controlMarkup of renderedPatternActionButtons) {
    assert.match(controlMarkup, /class="[^"]*\bjk-action-button\b[^"]*"/);
    assert.match(controlMarkup, /data-jk-component="action_button"/);
    assert.match(controlMarkup, /data-jk-state="disabled"/);
    assert.match(controlMarkup, /data-jk-base-state="disabled"/);
    assert.match(controlMarkup, /\sdisabled=""/);
    assert.match(controlMarkup, /data-jk-tone="(?:decision|secondary)"/);
    assert.match(
      controlMarkup,
      /<span class="jk-action-button__label">[^<]+<\/span>/,
    );
    assert.doesNotMatch(controlMarkup, /class="is-primary"/);
  }
  assert.doesNotMatch(
    patternPage,
    /<span\b[^>]*data-pattern-control=/,
    "Pattern control evidence must be attached to a semantic control, not a styled span.",
  );
  assert.doesNotMatch(
    patternPage,
    /<a\b(?=[^>]*href=)(?=[^>]*aria-disabled="true")[^>]*>/,
    "Static links must resolve safely instead of combining href with aria-disabled.",
  );
  const renderedPatternActionGroups = patternPage.match(
    /<div\b(?=[^>]*data-jk-component="action_group")(?=[^>]*aria-label="[^"]+")[^>]*>/g,
  ) ?? [];
  assert.ok(
    renderedPatternActionGroups.length >= 4,
    "Related pattern actions should use labeled ActionGroup components.",
  );
  const patternPageIds = [...patternPage.matchAll(/\sid="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(
    new Set(patternPageIds).size,
    patternPageIds.length,
    "The pattern page must not repeat generated component IDs.",
  );
  for (const specimen of patternSpecimens.specimens) {
    assert.match(specimen.rendered_html, /data-pattern-surface="[^"]+"/);
    assert.doesNotMatch(specimen.rendered_html, /jk-pattern-region-grid/);
    const staticInteractiveTags = specimen.rendered_html.match(
      /<(?:a|button|input|select|textarea)\b[^>]*>/g,
    ) ?? [];
    assert.ok(
      staticInteractiveTags.length > 0,
      `${specimen.contract_id} should render recognizable surface controls`,
    );
    for (const tag of staticInteractiveTags) {
      assert.match(
        tag,
        /tabindex="-1"|\sdisabled(?:="")?/,
        `${specimen.contract_id} static preview controls must stay out of the tab order`,
      );
    }
    const fieldTags = specimen.rendered_html.match(
      /<(?:input|select|textarea)\b[^>]*>/g,
    ) ?? [];
    for (const tag of fieldTags) {
      assert.match(
        tag,
        /data-jk-component="(?:text_field|select_field|text_area)"/,
        `${specimen.contract_id} fields should use JudgmentKit field components`,
      );
    }
    for (const control of specimen.covered_controls) {
      const controlId = control
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      assert.match(
        specimen.rendered_html,
        new RegExp(`data-pattern-control="${controlId}"`),
        `${specimen.contract_id}.${controlId} should render in the surface UI`,
      );
    }
  }
  assert.doesNotMatch(
    siteCss,
    /\.jk-pattern-controls button(?:\.|\s|\{)/,
    "Pattern controls must not imitate ActionButton with page-local button CSS.",
  );
  assert.match(
    siteCss,
    /\.design-system-specimen\[data-pattern-specimen\] \.design-system-specimen-body \{\s*display: block;/,
    "Pattern specimens must retain the full-width preview layout.",
  );
  assert.match(
    siteCss,
    /\.jk-pattern-surface \[aria-disabled="true"\] \{\s*pointer-events: none;/,
    "Static surface controls must not expose no-op pointer interactions.",
  );
  assert.doesNotMatch(
    siteCss,
    /\.jk-pattern-surface \.jk-action-button\[data-jk-tone=/,
    "Pattern specimens must not override component-owned disabled button colors.",
  );
  assert.match(
    patternPage,
    /<input\b(?=[^>]*id="grocery-phone")(?=[^>]*type="tel")(?=[^>]*required="")[^>]*>/,
    "The grocery phone field should expose telephone input purpose and required state.",
  );
  assert.equal(
    (patternPage.match(/<details class="design-system-specimen-details">/g) ?? [])
      .length,
    patternSpecimens.specimens.length,
    "Each pattern must retain one collapsed details disclosure.",
  );
  assert.doesNotMatch(
    patternPage,
    /<details class="design-system-specimen-details"[^>]*\sopen(?:\s|>|=)/,
  );
  assert.match(patternPage, /\/assets\/component-specimens\.css/);
  assert.doesNotMatch(patternPage, /\/assets\/component-specimens\.js/);

  for (const otherPage of [
    path.join(outDir, "index.html"),
    path.join(outDir, "docs", "index.html"),
    path.join(outDir, "design-system", "index.html"),
  ]) {
    const html = fs.readFileSync(otherPage, "utf8");
    assert.doesNotMatch(html, /component-specimens\.(?:js|css)/);
  }

  console.log("component site integration tests passed");
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
