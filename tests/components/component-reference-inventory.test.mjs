import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { COMPONENT_IMPLEMENTATION_REGISTRY } from "../../src/component-registry.mjs";
import {
  listComponentReferenceInventory,
  summarizeComponentReferenceCoverage,
  validateComponentReferenceInventory,
} from "../../src/component-reference-inventory.mjs";

const activityContract = JSON.parse(
  readFileSync(
    new URL("../../contracts/ai-ui-generation.activity-contract.json", import.meta.url),
    "utf8",
  ),
);
const componentContracts = activityContract.implementation_contract
  .default_ai_native_design_system.component_contracts;

const inventory = listComponentReferenceInventory();
assert.equal(validateComponentReferenceInventory(inventory, componentContracts), true);
assert.deepEqual(inventory.totals.public, {
  folders: 19,
  families: 122,
  variants: 336,
});
assert.deepEqual(inventory.totals.hidden, { families: 6, variants: 18 });
assert.deepEqual(inventory.totals.all, { families: 128, variants: 354 });
assert.equal(inventory.families.length, 128);
assert.equal(
  inventory.families.reduce((total, family) => total + family.variant_count, 0),
  354,
);
assert.equal(
  inventory.variant_normalization_policy
    .family_disposition_is_variant_semantic_normalization,
  false,
);
assert.deepEqual(
  inventory.families.find((family) => family.id === "sections.header")
    .variant_combinations,
  [
    { platform: "Desktop", state: "Default" },
    { platform: "Mobile", state: "Default" },
    { platform: "Mobile", state: "Open" },
  ],
);
const parentedFamilies = inventory.families.filter(
  (family) =>
    family.normalization_kind === "variant" ||
    family.normalization_kind === "internal_part",
);
assert.equal(parentedFamilies.length, 26);
assert.equal(
  parentedFamilies.filter((family) => typeof family.parent_family_id === "string")
    .length,
  26,
);

const secondInventory = listComponentReferenceInventory();
inventory.families[0].figma_name = "Changed by consumer";
assert.notEqual(secondInventory.families[0].figma_name, "Changed by consumer");

const duplicateIdInventory = structuredClone(secondInventory);
duplicateIdInventory.families[1].id = duplicateIdInventory.families[0].id;
assert.throws(
  () => validateComponentReferenceInventory(duplicateIdInventory, componentContracts),
  /Duplicate component reference family id/,
);

const emptyVariantInventory = structuredClone(secondInventory);
emptyVariantInventory.families[0].variant_count = 0;
assert.throws(
  () => validateComponentReferenceInventory(emptyVariantInventory, componentContracts),
  /positive integer variant_count/,
);

const wrongDeclaredTotals = structuredClone(secondInventory);
wrongDeclaredTotals.totals.public.variants = 335;
assert.throws(
  () => validateComponentReferenceInventory(wrongDeclaredTotals, componentContracts),
  /Declared public variant total must be 336/,
);

const invalidKindInventory = structuredClone(secondInventory);
invalidKindInventory.families[0].normalization_kind = "decorative_port";
assert.throws(
  () => validateComponentReferenceInventory(invalidKindInventory, componentContracts),
  /Invalid normalization kind/,
);

const missingDeclaredEnumInventory = structuredClone(secondInventory);
delete missingDeclaredEnumInventory.validation_contract.allowed_values
  .mapping_confidence;
assert.throws(
  () =>
    validateComponentReferenceInventory(
      missingDeclaredEnumInventory,
      componentContracts,
    ),
  /declare exactly the supported enums/,
);

const invalidFamilyEnumCases = [
  ["visibility", "private", /Invalid component reference visibility/],
  ["audit_status", "guessed", /Invalid audit status/],
  ["normalization_owner", "vendor", /Invalid normalization owner/],
  ["variant_metadata_status", "assumed", /Invalid variant metadata status/],
  ["mapping_relation", "similar", /Invalid mapping relation/],
  ["mapping_confidence", "likely", /Invalid mapping confidence/],
  ["runtime_status", "claimed", /Invalid runtime status/],
];
for (const [field, value, expectedError] of invalidFamilyEnumCases) {
  const invalidEnumInventory = structuredClone(secondInventory);
  invalidEnumInventory.families[0][field] = value;
  assert.throws(
    () =>
      validateComponentReferenceInventory(
        invalidEnumInventory,
        componentContracts,
      ),
    expectedError,
  );
}

const invalidAxisClassificationInventory = structuredClone(secondInventory);
invalidAxisClassificationInventory.variant_normalization_policy
  .axis_semantic_classifications["buttons.button"].state = "decoration";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      invalidAxisClassificationInventory,
      componentContracts,
    ),
  /Invalid axis semantic classification/,
);

const stylingParityInventory = structuredClone(secondInventory);
stylingParityInventory.scope.styling_parity = "included";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      stylingParityInventory,
      componentContracts,
    ),
  /styling parity must remain excluded/,
);

const invalidInspectionDateInventory = structuredClone(secondInventory);
invalidInspectionDateInventory.source.inspected_at = "2026-02-30";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      invalidInspectionDateInventory,
      componentContracts,
    ),
  /inspected_at must be an ISO calendar date/,
);

const incoherentMappingInventory = structuredClone(secondInventory);
incoherentMappingInventory.families.find(
  (family) => family.id === "buttons.button",
).mapping_confidence = "medium";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      incoherentMappingInventory,
      componentContracts,
    ),
  /mapping relation and confidence must agree with audit status/,
);

const missingMappedTargetInventory = structuredClone(secondInventory);
missingMappedTargetInventory.families.find(
  (family) => family.id === "buttons.button-group",
).mapped_contract_ids = [];
assert.throws(
  () =>
    validateComponentReferenceInventory(
      missingMappedTargetInventory,
      componentContracts,
    ),
  /mapped targets must agree with audit status/,
);

const consumerRuntimeClaimInventory = structuredClone(secondInventory);
consumerRuntimeClaimInventory.families.find(
  (family) => family.id === "sections.header",
).runtime_status = "implemented";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      consumerRuntimeClaimInventory,
      componentContracts,
    ),
  /Consumer-owned.*must not claim JudgmentKit runtime status/,
);

const figmaRuntimeClaimInventory = structuredClone(secondInventory);
figmaRuntimeClaimInventory.families.find(
  (family) => family.id === "hidden.component-note",
).runtime_status = "implemented";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      figmaRuntimeClaimInventory,
      componentContracts,
    ),
  /Figma-owned.*must not claim JudgmentKit runtime status/,
);

const missingParentInventory = structuredClone(secondInventory);
delete missingParentInventory.families.find(
  (family) => family.id === "accordion.accordion-item",
).parent_family_id;
assert.throws(
  () =>
    validateComponentReferenceInventory(
      missingParentInventory,
      componentContracts,
    ),
  /needs parent_family_id/,
);

const unknownParentInventory = structuredClone(secondInventory);
unknownParentInventory.families.find(
  (family) => family.id === "accordion.accordion-item",
).parent_family_id = "accordion.missing";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      unknownParentInventory,
      componentContracts,
    ),
  /references unknown parent/,
);

const selfParentInventory = structuredClone(secondInventory);
selfParentInventory.families.find(
  (family) => family.id === "accordion.accordion-item",
).parent_family_id = "accordion.accordion-item";
assert.throws(
  () =>
    validateComponentReferenceInventory(selfParentInventory, componentContracts),
  /must not parent itself/,
);

const implausibleParentInventory = structuredClone(secondInventory);
implausibleParentInventory.families.find(
  (family) => family.id === "buttons.icon-button",
).parent_family_id = "buttons.button-group";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      implausibleParentInventory,
      componentContracts,
    ),
  /mapping action_button must be inherited from parent buttons.button-group/,
);

const cyclicParentInventory = structuredClone(secondInventory);
cyclicParentInventory.families.find(
  (family) => family.id === "menu.header",
).parent_family_id = "menu.item";
cyclicParentInventory.families.find(
  (family) => family.id === "menu.item",
).parent_family_id = "menu.header";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      cyclicParentInventory,
      componentContracts,
    ),
  /parent relationships contain a cycle/,
);

const parentOnComponentInventory = structuredClone(secondInventory);
parentOnComponentInventory.families.find(
  (family) => family.id === "buttons.button",
).parent_family_id = "buttons.button-group";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      parentOnComponentInventory,
      componentContracts,
    ),
  /must not declare parent_family_id/,
);

const unknownTargetInventory = structuredClone(secondInventory);
unknownTargetInventory.families.find(
  (family) => family.id === "buttons.button-group",
)
  .mapped_contract_ids = ["future_action"];
assert.throws(
  () => validateComponentReferenceInventory(unknownTargetInventory, componentContracts),
  /neither resolved nor explicitly planned/,
);
assert.equal(
  validateComponentReferenceInventory(unknownTargetInventory, {
    contracts: componentContracts,
    planned_contract_ids: ["future_action"],
  }),
  true,
);

const unexplainedHelperInventory = structuredClone(secondInventory);
unexplainedHelperInventory.families.find(
  (family) => family.id === "hidden.component-annotation",
).rationale = "";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      unexplainedHelperInventory,
      componentContracts,
    ),
  /requires a rationale/,
);

const standaloneIconInventory = structuredClone(secondInventory);
standaloneIconInventory.families.find(
  (family) => family.id === "hidden.component-note",
).folder = "Icons";
assert.throws(
  () => validateComponentReferenceInventory(standaloneIconInventory, componentContracts),
  /Standalone icon family is outside component reference scope/,
);

const missingIconBearingInventory = structuredClone(secondInventory);
const iconButton = missingIconBearingInventory.families.find(
  (family) => family.id === "buttons.icon-button",
);
iconButton.id = "buttons.icon-control";
iconButton.figma_name = "Button";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      missingIconBearingInventory,
      componentContracts,
    ),
  /Icon-bearing component family must remain in scope/,
);

const wrongAxisProductInventory = structuredClone(secondInventory);
wrongAxisProductInventory.families
  .find((family) => family.id === "buttons.button")
  .variant_axes.find((axis) => axis.id === "size").values.push("Large");
assert.throws(
  () =>
    validateComponentReferenceInventory(
      wrongAxisProductInventory,
      componentContracts,
    ),
  /variant-axis product must be 18/,
);

const familyDispositionOverclaimInventory = structuredClone(secondInventory);
familyDispositionOverclaimInventory.variant_normalization_policy
  .family_disposition_is_variant_semantic_normalization = true;
assert.throws(
  () =>
    validateComponentReferenceInventory(
      familyDispositionOverclaimInventory,
      componentContracts,
    ),
  /family normalization disposition must not be treated as variant semantic normalization/i,
);

const missingAxisClassificationInventory = structuredClone(secondInventory);
delete missingAxisClassificationInventory.variant_normalization_policy
  .axis_semantic_classifications["inputs.input-field"].value_type;
assert.throws(
  () =>
    validateComponentReferenceInventory(
      missingAxisClassificationInventory,
      componentContracts,
    ),
  /must cover exactly its documented axes/,
);

const undocumentedMultiVariantInventory = structuredClone(secondInventory);
undocumentedMultiVariantInventory.families.find(
  (family) => family.variant_metadata_status === "not_documented_in_audit",
).variant_count = 2;
assert.throws(
  () =>
    validateComponentReferenceInventory(
      undocumentedMultiVariantInventory,
      componentContracts,
    ),
  /must be a singleton master without variant axes/,
);

const partialAxisInventory = structuredClone(secondInventory);
partialAxisInventory.families.find(
  (family) => family.variant_metadata_status === "partially_documented",
).variant_axes = [{ id: "state", values: ["Default"] }];
assert.throws(
  () =>
    validateComponentReferenceInventory(partialAxisInventory, componentContracts),
  /must be a singleton master without variant axes/,
);

const incompleteCombinationInventory = structuredClone(secondInventory);
incompleteCombinationInventory.families.find(
  (family) => family.id === "sections.header",
).variant_combinations.pop();
assert.throws(
  () =>
    validateComponentReferenceInventory(
      incompleteCombinationInventory,
      componentContracts,
    ),
  /exact variant-combination total must be 3/,
);

const unknownCombinationInventory = structuredClone(secondInventory);
unknownCombinationInventory.families.find(
  (family) => family.id === "sections.header",
).variant_combinations[2].state = "Expanded";
assert.throws(
  () =>
    validateComponentReferenceInventory(
      unknownCombinationInventory,
      componentContracts,
    ),
  /unknown state value: Expanded/,
);

const implementedContractIds = new Set(
  COMPONENT_IMPLEMENTATION_REGISTRY
    .filter((entry) => entry.implementation_status === "implemented")
    .map((entry) => entry.contract_id),
);
const scenarios = componentContracts.flatMap((contract) =>
  contract.required_states.map((state) => ({
    id: `${contract.id}.${state}`,
    contract_id: contract.id,
    state,
    status:
      implementedContractIds.has(contract.id) &&
      COMPONENT_IMPLEMENTATION_REGISTRY.find(
        (entry) => entry.contract_id === contract.id,
      ).supported_states.includes(state)
        ? "verified"
        : "unverified",
  })),
);
const summary = summarizeComponentReferenceCoverage(
  secondInventory,
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  scenarios,
);

assert.deepEqual(summary.accounting, {
  status: "complete",
  public: { families: 122, variants: 336 },
  hidden: { families: 6, variants: 18 },
  all: { families: 128, variants: 354 },
  public_folders: 19,
  standalone_icon_families: 0,
  icon_bearing: { families: 2, variants: 20 },
});
assert.deepEqual(summary.normalization.families, {
  total: 128,
  dispositioned: 128,
});
assert.deepEqual(summary.normalization.variants, {
  total: 354,
  semantically_normalized: 304,
  partially_documented: 1,
  not_documented: 49,
});
assert.equal(summary.normalization.status, "partial");
assert.deepEqual(summary.normalization.semantic_axes, {
  eligible: 105,
  classified: 105,
});
assert.deepEqual(summary.normalization.metadata, {
  documented: { families: 78, variants: 304 },
  partially_documented: { families: 1, variants: 1 },
  not_documented: { families: 49, variants: 49 },
});
assert.deepEqual(summary.normalization.by_kind, {
  component: { families: 31, variants: 148 },
  variant: { families: 4, variants: 33 },
  internal_part: { families: 22, variants: 42 },
  pattern: { families: 33, variants: 62 },
  template: { families: 22, variants: 38 },
  typography_role: { families: 13, variants: 16 },
  authoring_helper: { families: 3, variants: 15 },
});
assert.deepEqual(summary.normalization.mapped_to_contracts, {
  families: 25,
  variants: 114,
});
assert.deepEqual(summary.normalization.missing_canonical_contract_at_audit, {
  families: 46,
  variants: 129,
});
assert.deepEqual(summary.normalization.consumer_owned, {
  families: 54,
  variants: 96,
});
const implementedRegistryEntries = COMPONENT_IMPLEMENTATION_REGISTRY.filter(
  (entry) => entry.implementation_status === "implemented",
);
const implementedRegistryIds = new Set(
  implementedRegistryEntries.map((entry) => entry.contract_id),
);
const supportedRegistryStateCount = implementedRegistryEntries.reduce(
  (total, entry) => total + entry.supported_states.length,
  0,
);
const fullyVerifiedRegistryContractCount = implementedRegistryEntries.filter(
  (entry) => entry.supported_states.length > 0,
).length;
const mappedToImplementedFamilies = secondInventory.families.filter((family) =>
  family.mapped_contract_ids.some((id) => implementedRegistryIds.has(id)),
);
assert.deepEqual(summary.runtime, {
  status:
    implementedRegistryEntries.length === 17 &&
    supportedRegistryStateCount === 65
      ? "complete"
      : "partial",
  contracts: {
    total: 17,
    implemented: implementedRegistryEntries.length,
    not_implemented: 17 - implementedRegistryEntries.length,
    fully_verified: fullyVerifiedRegistryContractCount,
  },
  states: {
    total: 65,
    supported: supportedRegistryStateCount,
    verified: supportedRegistryStateCount,
    unverified_supported: 0,
    not_implemented: 65 - supportedRegistryStateCount,
  },
  scenarios: {
    records: 65,
    verified_records: supportedRegistryStateCount,
    unverified_records: 65 - supportedRegistryStateCount,
    missing_required_records: 0,
  },
  reference_mapping: {
    mapped_to_implemented_contract: {
      families: mappedToImplementedFamilies.length,
      source_variants: mappedToImplementedFamilies.reduce(
        (total, family) => total + family.variant_count,
        0,
      ),
    },
    exact_variant_evidence: {
      records: 0,
      verified_records: 0,
      families: 0,
      variants: 0,
    },
  },
});

const noEvidenceSummary = summarizeComponentReferenceCoverage(
  secondInventory,
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  scenarios.map((scenario) => ({ ...scenario, status: "unverified" })),
);
assert.equal(noEvidenceSummary.runtime.states.verified, 0);
assert.equal(noEvidenceSummary.runtime.contracts.fully_verified, 0);
assert.equal(
  noEvidenceSummary.runtime.reference_mapping.exact_variant_evidence.variants,
  0,
);

const exactVariantEvidence = [
  {
    id: "figma.buttons.button.primary-default-medium",
    family_id: "buttons.button",
    axis_values: {
      variant: "Primary",
      state: "Default",
      size: "Medium",
    },
    contract_id: "action_button",
    state: "ready",
    status: "verified",
  },
];
const exactEvidenceSummary = summarizeComponentReferenceCoverage(
  secondInventory,
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  scenarios,
  exactVariantEvidence,
);
assert.deepEqual(
  exactEvidenceSummary.runtime.reference_mapping.exact_variant_evidence,
  {
    records: 1,
    verified_records: 1,
    families: 1,
    variants: 1,
  },
);

const invalidExactVariantEvidence = structuredClone(exactVariantEvidence);
invalidExactVariantEvidence[0].axis_values.state = "Pressed";
assert.throws(
  () =>
    summarizeComponentReferenceCoverage(
      secondInventory,
      componentContracts,
      COMPONENT_IMPLEMENTATION_REGISTRY,
      scenarios,
      invalidExactVariantEvidence,
    ),
  /does not identify an audited combination/,
);

assert.throws(
  () =>
    summarizeComponentReferenceCoverage(
      secondInventory,
      componentContracts,
      COMPONENT_IMPLEMENTATION_REGISTRY,
      scenarios.map((scenario) => ({ ...scenario, status: "unverified" })),
      exactVariantEvidence,
    ),
  /cannot be verified without verified supported contract-state evidence/,
);

const registryWithUnsupportedState = structuredClone(
  COMPONENT_IMPLEMENTATION_REGISTRY,
);
const registryEntryWithState = registryWithUnsupportedState.find(
  (entry) =>
    entry.implementation_status === "implemented" &&
    entry.supported_states.length > 0,
);
const unsupportedState = registryEntryWithState.supported_states.pop();
const unsupportedScenarioId = `${registryEntryWithState.contract_id}.${unsupportedState}`;
const unsupportedVerifiedScenarios = scenarios.map((scenario) => ({
  ...scenario,
  status: scenario.id === unsupportedScenarioId ? "verified" : scenario.status,
}));
const unsupportedVerifiedSummary = summarizeComponentReferenceCoverage(
  secondInventory,
  componentContracts,
  registryWithUnsupportedState,
  unsupportedVerifiedScenarios,
);
assert.equal(
  unsupportedVerifiedSummary.runtime.scenarios.verified_records,
  supportedRegistryStateCount,
);
assert.equal(
  unsupportedVerifiedSummary.runtime.states.verified,
  supportedRegistryStateCount - 1,
  "A scenario claim without an implemented registry state must not advance runtime coverage.",
);

const overstatedInventory = structuredClone(secondInventory);
for (const family of overstatedInventory.families) {
  if (family.normalization_owner === "judgmentkit") {
    family.runtime_status = "implemented";
  }
}
const registryDerivedSummary = summarizeComponentReferenceCoverage(
  overstatedInventory,
  componentContracts,
  COMPONENT_IMPLEMENTATION_REGISTRY,
  scenarios,
);
assert.deepEqual(
  registryDerivedSummary.runtime,
  summary.runtime,
  "Reference metadata must not substitute for registry and scenario runtime evidence.",
);

console.log("component reference inventory tests passed");
