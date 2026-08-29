import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  COMPONENT_IMPLEMENTATION_REGISTRY,
  COMPONENT_RUNTIME_ADAPTER,
  coveredStatesForContract,
  createComponentScenarioManifest,
  createUiImplementationContract,
} from "../../src/index.mjs";
import {
  ActionGroup,
  ActionButton,
  Alert,
  Card,
  CheckboxField,
  CheckboxGroup,
  Dialog,
  FormField,
  Menu,
  Panel,
  RadioGroup,
  SelectField,
  StatusMessage,
  Table,
  Tabs,
  TextArea,
  TextField,
  Toggle,
} from "judgmentkit/react";

for (const component of [
  ActionGroup,
  ActionButton,
  Alert,
  Card,
  CheckboxField,
  CheckboxGroup,
  Dialog,
  FormField,
  Menu,
  Panel,
  RadioGroup,
  SelectField,
  StatusMessage,
  Table,
  Tabs,
  TextArea,
  TextField,
  Toggle,
]) {
  assert.equal(typeof component, "function");
}

const componentContracts = createUiImplementationContract()
  .implementation_contract.default_ai_native_design_system.component_contracts;
const expectedScenarioCount = componentContracts.reduce(
  (total, contract) => total + contract.required_states.length,
  0,
);
assert.equal(expectedScenarioCount, 65);
const implementedStateCount = COMPONENT_IMPLEMENTATION_REGISTRY.reduce(
  (total, entry) => total + entry.supported_states.length,
  0,
);
assert.equal(implementedStateCount, 65);

const noEvidenceManifest = createComponentScenarioManifest(componentContracts);
assert.equal(noEvidenceManifest.length, expectedScenarioCount);
assert.equal(
  new Set(noEvidenceManifest.map((scenario) => scenario.id)).size,
  expectedScenarioCount,
);
assert.ok(noEvidenceManifest.every((scenario) => scenario.status === "unverified"));
assert.deepEqual(
  coveredStatesForContract("action_button", noEvidenceManifest),
  [],
);

const contractHashes = Object.fromEntries(
  componentContracts.map((contract) => [contract.id, `contract:${contract.id}`]),
);
const implementationHashes = Object.fromEntries(
  COMPONENT_IMPLEMENTATION_REGISTRY
    .filter((entry) => entry.implementation_status === "implemented")
    .map((entry) => [entry.contract_id, "implementation:pilot"]),
);
const fixtureOutputHashes = Object.fromEntries(
  COMPONENT_IMPLEMENTATION_REGISTRY
    .filter((entry) => entry.implementation_status === "implemented")
    .map((entry) => [entry.contract_id, `fixture:${entry.contract_id}`]),
);
const evidenceScenarios = COMPONENT_IMPLEMENTATION_REGISTRY.flatMap((entry) =>
  entry.evidence_scenario_ids.map((id) => ({
    id,
    status: "verified",
    contract_hash: contractHashes[entry.contract_id],
    implementation_hash: implementationHashes[entry.contract_id],
    fixture_output_hash: fixtureOutputHashes[entry.contract_id],
    evidence_refs: [
      "tests/components/component-browser.test.mjs",
      "docs/evidence/component-library-pilot-accessibility-2026-08-28.md",
    ],
    viewport_results: COMPONENT_RUNTIME_ADAPTER.verified_viewports.map(
      (viewport) => ({
        viewport,
        status: "pass",
        appearances: COMPONENT_RUNTIME_ADAPTER.verified_appearances.map(
          (appearance) => ({ appearance, status: "pass" }),
        ),
      }),
    ),
  })),
);
const evidence = {
  bundle: {
    run_id: "component-pilot-test-run",
    browser_version: "Chromium/test",
    package_status: "pass",
    automated_accessibility_status: "pass",
    automated_evidence_hash: "automated:test-run",
    unsupported_claims: [...COMPONENT_RUNTIME_ADAPTER.support_limits],
    reviewer_receipt: {
      path: "docs/evidence/component-library-pilot-accessibility-2026-08-28.md",
      status: "pass",
      hash: "receipt:component-pilot-test",
      run_id: "component-pilot-test-run",
      browser_version: "Chromium/test",
      implementation_hash: "implementation:pilot",
      automated_evidence_hash: "automated:test-run",
      component_ids: COMPONENT_IMPLEMENTATION_REGISTRY.map(
        (entry) => entry.contract_id,
      ),
      scenario_ids: evidenceScenarios.map((scenario) => scenario.id),
      scenario_count: 65,
      presentation_count: 260,
      required_viewports: [...COMPONENT_RUNTIME_ADAPTER.verified_viewports],
      required_appearances: [
        ...COMPONENT_RUNTIME_ADAPTER.verified_appearances,
      ],
      contract_hashes: contractHashes,
      fixture_output_hashes: { ...fixtureOutputHashes },
      unsupported_claims: [...COMPONENT_RUNTIME_ADAPTER.support_limits],
    },
    fixture_output_hashes: { ...fixtureOutputHashes },
    scenarios: evidenceScenarios,
  },
  contract_hashes: contractHashes,
  implementation_hashes: implementationHashes,
  implementation_hash: "implementation:pilot",
  fixture_output_hashes: { ...fixtureOutputHashes },
};

const verifiedManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  evidence,
);
assert.equal(
  verifiedManifest.filter((scenario) => scenario.status === "verified").length,
  implementedStateCount,
);
assert.deepEqual(
  coveredStatesForContract("action_button", verifiedManifest),
  ["ready", "disabled", "focus-visible", "loading"],
);
assert.deepEqual(
  coveredStatesForContract("table", verifiedManifest),
  ["empty", "ready", "loading", "error", "focus-visible"],
);
assert.deepEqual(
  coveredStatesForContract("panel", verifiedManifest),
  ["ready", "loading", "error"],
);
assert.ok(
  verifiedManifest
    .filter((scenario) => scenario.status === "verified")
    .every(
      (scenario) =>
        scenario.contract_hash &&
        scenario.implementation_hash &&
        scenario.evidence_run_id === "component-pilot-test-run" &&
        scenario.viewport_results.length === 2,
    ),
);
assert.ok(
  verifiedManifest
    .filter((scenario) => scenario.contract_id === "dialog")
    .every((scenario) => scenario.status === "verified"),
);

const staleEvidence = structuredClone(evidence);
staleEvidence.bundle.scenarios.find(
  (scenario) => scenario.id === "action_button.ready",
).implementation_hash = "implementation:stale";
const staleManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  staleEvidence,
);
const staleScenario = staleManifest.find(
  (scenario) => scenario.id === "action_button.ready",
);
assert.equal(staleScenario.status, "unverified");
assert.match(staleScenario.rationale, /stale or incomplete/);

const missingReceiptHashEvidence = structuredClone(evidence);
delete missingReceiptHashEvidence.bundle.reviewer_receipt.hash;
const missingReceiptHashManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  missingReceiptHashEvidence,
);
assert.ok(
  missingReceiptHashManifest.every(
    (scenario) => scenario.status === "unverified",
  ),
  "A receipt path without a bound content hash must not verify scenarios.",
);

const staleReceiptScopeEvidence = structuredClone(evidence);
staleReceiptScopeEvidence.bundle.reviewer_receipt.scenario_ids.pop();
staleReceiptScopeEvidence.bundle.reviewer_receipt.scenario_count = 64;
const staleReceiptScopeManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  staleReceiptScopeEvidence,
);
assert.ok(
  staleReceiptScopeManifest.every(
    (scenario) => scenario.status === "unverified",
  ),
  "A receipt for fewer than all current scenarios must not verify any state.",
);

const staleReceiptImplementationEvidence = structuredClone(evidence);
staleReceiptImplementationEvidence.bundle.reviewer_receipt.implementation_hash =
  "implementation:stale";
const staleReceiptImplementationManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  staleReceiptImplementationEvidence,
);
assert.ok(
  staleReceiptImplementationManifest.every(
    (scenario) => scenario.status === "unverified",
  ),
  "A receipt for a different implementation must not verify any state.",
);

const staleAutomatedEvidenceBinding = structuredClone(evidence);
staleAutomatedEvidenceBinding.bundle.reviewer_receipt.automated_evidence_hash =
  "automated:stale";
const staleAutomatedEvidenceManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  staleAutomatedEvidenceBinding,
);
assert.ok(
  staleAutomatedEvidenceManifest.every(
    (scenario) => scenario.status === "unverified",
  ),
  "A receipt for a different automated evidence payload must not verify any state.",
);

const broadenedUnsupportedClaims = structuredClone(evidence);
broadenedUnsupportedClaims.bundle.unsupported_claims.pop();
const broadenedUnsupportedClaimsManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  broadenedUnsupportedClaims,
);
assert.ok(
  broadenedUnsupportedClaimsManifest.every(
    (scenario) => scenario.status === "unverified",
  ),
  "Removing an unsupported claim must invalidate all state verification.",
);

const staleFixtureOutputEvidence = structuredClone(evidence);
staleFixtureOutputEvidence.bundle.scenarios.find(
  (scenario) => scenario.id === "action_button.ready",
).fixture_output_hash = "fixture:stale";
const staleFixtureOutputManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  staleFixtureOutputEvidence,
);
assert.equal(
  staleFixtureOutputManifest.find(
    (scenario) => scenario.id === "action_button.ready",
  ).status,
  "unverified",
  "A scenario rendered from a stale fixture output must not verify.",
);

const staleReceiptFixtureOutputEvidence = structuredClone(evidence);
staleReceiptFixtureOutputEvidence.bundle.reviewer_receipt.fixture_output_hashes
  .action_button = "fixture:stale";
const staleReceiptFixtureOutputManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  staleReceiptFixtureOutputEvidence,
);
assert.ok(
  staleReceiptFixtureOutputManifest.every(
    (scenario) => scenario.status === "unverified",
  ),
  "A receipt for stale fixture output must not verify any state.",
);

const missingExpectedHashes = structuredClone(evidence);
delete missingExpectedHashes.contract_hashes;
delete missingExpectedHashes.implementation_hashes;
const missingExpectedHashManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  missingExpectedHashes,
);
assert.ok(
  missingExpectedHashManifest.every(
    (scenario) => scenario.status === "unverified",
  ),
  "Omitted expected hashes must never verify by comparing undefined values.",
);

const missingViewportEvidence = structuredClone(evidence);
missingViewportEvidence.bundle.scenarios.find(
  (scenario) => scenario.id === "toggle.ready",
).viewport_results.pop();
const missingViewportManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  missingViewportEvidence,
);
assert.equal(
  missingViewportManifest.find((scenario) => scenario.id === "toggle.ready")
    .status,
  "unverified",
);

const missingAppearanceEvidence = structuredClone(evidence);
missingAppearanceEvidence.bundle.scenarios.find(
  (scenario) => scenario.id === "status_message.error",
).viewport_results[0].appearances.pop();
const missingAppearanceManifest = createComponentScenarioManifest(
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  missingAppearanceEvidence,
);
assert.equal(
  missingAppearanceManifest.find(
    (scenario) => scenario.id === "status_message.error",
  ).status,
  "unverified",
);

const fieldMarkup = renderToStaticMarkup(
  createElement(
    FormField,
    {
      id: "reason",
      label: "Reason",
      helpText: "Use policy language.",
      errorMessage: "Reason is required.",
      required: true,
    },
    createElement("input", { type: "text" }),
  ),
);
assert.match(fieldMarkup, /data-jk-component="form_field"/);
assert.match(fieldMarkup, /for="reason"/);
assert.match(fieldMarkup, /aria-describedby="reason-help reason-error"/);
assert.match(fieldMarkup, /aria-errormessage="reason-error"/);
assert.match(fieldMarkup, /aria-invalid="true"/);

const childDisabledFieldMarkup = renderToStaticMarkup(
  createElement(
    FormField,
    {
      id: "locked-reason",
      label: "Reason",
      disabledReason: "The reason is locked after approval.",
    },
    createElement("input", { type: "text", disabled: true }),
  ),
);
assert.match(childDisabledFieldMarkup, /data-jk-base-state="disabled"/);
assert.match(childDisabledFieldMarkup, /data-jk-disabled="true"/);
assert.match(childDisabledFieldMarkup, /locked-reason-disabled-reason/);
assert.match(childDisabledFieldMarkup, /The reason is locked after approval/);

const textFieldMarkup = renderToStaticMarkup(
  createElement(TextField, {
    id: "policy",
    label: "Policy",
    defaultValue: "Review",
    disabled: true,
    disabledReason: "Evidence is incomplete.",
  }),
);
assert.match(textFieldMarkup, /data-jk-component="text_field"/);
assert.match(textFieldMarkup, /data-jk-base-state="disabled"/);
assert.match(textFieldMarkup, /disabled=""/);
assert.match(textFieldMarkup, /Evidence is incomplete/);

const buttonMarkup = renderToStaticMarkup(
  createElement(ActionButton, { loading: true, loadingLabel: "Saving decision" }, "Save"),
);
assert.match(buttonMarkup, /aria-busy="true"/);
assert.match(buttonMarkup, /disabled=""/);
assert.match(buttonMarkup, /Saving decision/);

const toggleMarkup = renderToStaticMarkup(
  createElement(Toggle, {
    id: "approval",
    label: "Require approval",
    defaultChecked: true,
  }),
);
assert.match(toggleMarkup, /role="switch"/);
assert.match(toggleMarkup, /aria-checked="true"/);
assert.match(toggleMarkup, /aria-labelledby="approval-label"/);

const externallyLabelledToggleMarkup = renderToStaticMarkup(
  createElement(Toggle, {
    id: "approval-external",
    label: "Require approval",
    "aria-labelledby": "workflow-label approval-context",
  }),
);
assert.match(
  externallyLabelledToggleMarkup,
  /aria-labelledby="workflow-label approval-context"/,
);
assert.doesNotMatch(
  externallyLabelledToggleMarkup,
  /aria-labelledby="approval-external-label"/,
);

const statusMarkup = renderToStaticMarkup(
  createElement(StatusMessage, { state: "error" }, "Receipt is missing."),
);
assert.match(statusMarkup, /role="alert"/);
assert.match(statusMarkup, /aria-live="assertive"/);
assert.match(statusMarkup, /data-jk-state="error"/);

console.log("component state model tests passed");
