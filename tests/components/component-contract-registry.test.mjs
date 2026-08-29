import assert from "node:assert/strict";

import {
  COMPONENT_IMPLEMENTATION_REGISTRY,
  COMPONENT_RUNTIME_ADAPTER,
  createUiImplementationContract,
  listRendererComponentIds,
  validateComponentImplementationRegistry,
} from "../../src/index.mjs";

const implementationContract = createUiImplementationContract()
  .implementation_contract;
const componentContracts = implementationContract
  .default_ai_native_design_system.component_contracts;
const source = implementationContract.design_system_source;
const componentContractsById = new Map(
  componentContracts.map((contract) => [contract.id, contract]),
);

assert.equal(componentContracts.length, 17);
assert.equal(COMPONENT_IMPLEMENTATION_REGISTRY.length, 17);
assert.equal(
  validateComponentImplementationRegistry(
    componentContracts,
    COMPONENT_IMPLEMENTATION_REGISTRY,
  ),
  true,
);

assert.deepEqual(
  new Set(COMPONENT_IMPLEMENTATION_REGISTRY.map((entry) => entry.contract_id)),
  new Set(componentContracts.map((contract) => contract.id)),
);

const classifications = Object.fromEntries(
  COMPONENT_IMPLEMENTATION_REGISTRY.map((entry) => [
    entry.contract_id,
    entry.classification,
  ]),
);
assert.deepEqual(
  Object.entries(classifications)
    .filter(([, classification]) => classification === "public_runtime_component")
    .map(([id]) => id),
  [
    "action_button",
    "action_group",
    "form_field",
    "text_field",
    "text_area",
    "select_field",
    "checkbox_group",
    "radio_group",
    "toggle",
    "tabs",
    "menu",
    "dialog",
    "alert",
    "table",
    "panel",
    "card",
    "status_message",
  ],
);
assert.deepEqual(
  Object.entries(classifications)
    .filter(([, classification]) => classification === "composed_behavior")
    .map(([id]) => id),
  [],
);
assert.deepEqual(
  Object.entries(classifications)
    .filter(([, classification]) => classification === "contract_only")
    .map(([id]) => id),
  [],
);

const rendererComponentIds = listRendererComponentIds();
assert.deepEqual(rendererComponentIds, [
  "action_button",
  "action_group",
  "form_field",
  "text_field",
  "text_area",
  "select_field",
  "checkbox_group",
  "radio_group",
  "toggle",
  "tabs",
  "menu",
  "dialog",
  "alert",
  "table",
  "panel",
  "card",
  "status_message",
]);
assert.deepEqual(source.renderer_components, rendererComponentIds);

for (const entry of COMPONENT_IMPLEMENTATION_REGISTRY) {
  assert.equal(/icon/i.test(entry.contract_id), false);

  if (entry.implementation_status === "implemented") {
    assert.equal(entry.package_export, "judgmentkit/react");
    assert.equal(entry.stylesheet_export, "judgmentkit/react/styles.css");
    assert.ok(entry.public_export);
    assert.ok(entry.supported_states.length > 0);
    assert.deepEqual(
      entry.supported_states,
      componentContractsById.get(entry.contract_id).required_states,
      `${entry.contract_id} must implement every canonical required state`,
    );
    assert.deepEqual(
      entry.evidence_scenario_ids,
      entry.supported_states.map(
        (state) => `${entry.contract_id}.${state}`,
      ),
    );
  } else {
    assert.equal(entry.public_export, null);
    assert.equal(entry.package_export, null);
    assert.deepEqual(entry.supported_states, []);
    assert.deepEqual(entry.evidence_scenario_ids, []);
  }
}

const nativeComponentIds = new Set([
  "action_group",
  "text_area",
  "select_field",
  "checkbox_group",
  "radio_group",
  "alert",
  "table",
  "panel",
  "card",
]);
const interactiveComponentIds = new Set([
  "tabs",
  "menu",
  "dialog",
]);
for (const entry of COMPONENT_IMPLEMENTATION_REGISTRY) {
  assert.equal(
    entry.implementation_sources.includes("src/react/native-components.mjs"),
    nativeComponentIds.has(entry.contract_id),
    `${entry.contract_id} has the wrong native implementation provenance`,
  );
  assert.equal(
    entry.implementation_sources.includes("src/react/interactive-components.mjs"),
    interactiveComponentIds.has(entry.contract_id),
    `${entry.contract_id} has the wrong interactive implementation provenance`,
  );
}
assert.equal(
  COMPONENT_IMPLEMENTATION_REGISTRY.filter(
    (entry) => entry.implementation_status === "implemented",
  ).length,
  17,
);
assert.equal(
  COMPONENT_IMPLEMENTATION_REGISTRY.filter(
    (entry) => entry.implementation_status === "not_implemented",
  ).length,
  0,
);

assert.equal(COMPONENT_RUNTIME_ADAPTER.framework, "react");
assert.equal(COMPONENT_RUNTIME_ADAPTER.peer_dependencies.react, ">=19 <20");
assert.equal(source.source_exports.component_registry, "/design-system/component-registry.json");
assert.equal(source.source_exports.react_components, "judgmentkit/react");
assert.equal(source.source_exports.react_styles, "judgmentkit/react/styles.css");

const duplicateRegistry = [
  ...COMPONENT_IMPLEMENTATION_REGISTRY,
  COMPONENT_IMPLEMENTATION_REGISTRY[0],
];
assert.throws(
  () => validateComponentImplementationRegistry(componentContracts, duplicateRegistry),
  /Duplicate component registry id/,
);

const unsupportedStateRegistry = structuredClone(
  COMPONENT_IMPLEMENTATION_REGISTRY,
);
unsupportedStateRegistry.find(
  (entry) => entry.contract_id === "action_button",
).supported_states.push("imaginary");
assert.throws(
  () =>
    validateComponentImplementationRegistry(
      componentContracts,
      unsupportedStateRegistry,
    ),
  /unsupported state/,
);

const invalidClassificationRegistry = structuredClone(
  COMPONENT_IMPLEMENTATION_REGISTRY,
);
invalidClassificationRegistry[0].classification = "not-a-real-classification";
assert.throws(
  () =>
    validateComponentImplementationRegistry(
      componentContracts,
      invalidClassificationRegistry,
    ),
  /Invalid component registry classification/,
);

const mismatchedScenarioRegistry = structuredClone(
  COMPONENT_IMPLEMENTATION_REGISTRY,
);
mismatchedScenarioRegistry.find(
  (entry) => entry.contract_id === "action_button",
).evidence_scenario_ids[0] = "wrong.scenario";
assert.throws(
  () =>
    validateComponentImplementationRegistry(
      componentContracts,
      mismatchedScenarioRegistry,
    ),
  /evidence scenarios do not match supported states/,
);

console.log("component contract registry tests passed");
