const BASE_IMPLEMENTATION_SOURCES = Object.freeze([
  "src/react/index.mjs",
  "src/react/styles.css",
]);

const NATIVE_IMPLEMENTATION_SOURCES = Object.freeze([
  "src/react/index.mjs",
  "src/react/native-components.mjs",
  "src/react/styles.css",
]);

const INTERACTIVE_IMPLEMENTATION_SOURCES = Object.freeze([
  "src/react/index.mjs",
  "src/react/interactive-components.mjs",
  "src/react/styles.css",
]);

export const COMPONENT_RUNTIME_ADAPTER = Object.freeze({
  id: "judgmentkit.react-components.candidate-v1",
  status: "unreleased_candidate",
  framework: "react",
  package_export: "judgmentkit/react",
  stylesheet_export: "judgmentkit/react/styles.css",
  peer_dependencies: Object.freeze({
    react: ">=19 <20",
    "react-dom": ">=19 <20",
  }),
  browser_support: Object.freeze([
    "Chromium automation with Browser.getVersion recorded per evidence run",
  ]),
  verified_viewports: Object.freeze([
    "1365x900",
    "390x844",
  ]),
  verified_appearances: Object.freeze([
    "light",
    "dark",
  ]),
  support_limits: Object.freeze([
    "Firefox and WebKit are not claimed by the unreleased candidate.",
    "Screen-reader and assistive-technology compatibility are not claimed by this Chromium automation and visual-review evidence.",
    "Standalone icons are outside the component adapter scope.",
    "Product templates are not claimed as generic runtime components.",
    "Pixel, token, or styling parity with the Simple Design System Figma file is not claimed.",
    "Exact Figma master-to-runtime tuple evidence remains outside this adapter evidence scope.",
  ]),
});

const IMPLEMENTED_COMPONENTS = Object.freeze({
  action_button: Object.freeze({
    public_export: "ActionButton",
    supported_states: Object.freeze([
      "ready",
      "disabled",
      "focus-visible",
      "loading",
    ]),
  }),
  action_group: Object.freeze({
    public_export: "ActionGroup",
    supported_states: Object.freeze([
      "ready",
      "disabled",
      "focus-visible",
    ]),
    implementation_sources: NATIVE_IMPLEMENTATION_SOURCES,
  }),
  form_field: Object.freeze({
    public_export: "FormField",
    supported_states: Object.freeze([
      "empty",
      "ready",
      "error",
      "disabled",
      "focus-visible",
    ]),
  }),
  text_field: Object.freeze({
    public_export: "TextField",
    supported_states: Object.freeze([
      "empty",
      "ready",
      "error",
      "disabled",
      "focus-visible",
    ]),
  }),
  text_area: Object.freeze({
    public_export: "TextArea",
    supported_states: Object.freeze([
      "empty",
      "ready",
      "error",
      "disabled",
      "focus-visible",
    ]),
    implementation_sources: NATIVE_IMPLEMENTATION_SOURCES,
  }),
  select_field: Object.freeze({
    public_export: "SelectField",
    supported_states: Object.freeze([
      "empty",
      "ready",
      "error",
      "disabled",
      "focus-visible",
    ]),
    implementation_sources: NATIVE_IMPLEMENTATION_SOURCES,
  }),
  checkbox_group: Object.freeze({
    public_export: "CheckboxGroup",
    supported_states: Object.freeze([
      "ready",
      "error",
      "disabled",
      "focus-visible",
    ]),
    implementation_sources: NATIVE_IMPLEMENTATION_SOURCES,
  }),
  radio_group: Object.freeze({
    public_export: "RadioGroup",
    supported_states: Object.freeze([
      "empty",
      "ready",
      "error",
      "disabled",
      "focus-visible",
    ]),
    implementation_sources: NATIVE_IMPLEMENTATION_SOURCES,
  }),
  toggle: Object.freeze({
    public_export: "Toggle",
    supported_states: Object.freeze([
      "ready",
      "disabled",
      "focus-visible",
    ]),
  }),
  tabs: Object.freeze({
    public_export: "Tabs",
    supported_states: Object.freeze([
      "ready",
      "disabled",
      "focus-visible",
    ]),
    implementation_sources: INTERACTIVE_IMPLEMENTATION_SOURCES,
  }),
  menu: Object.freeze({
    public_export: "Menu",
    supported_states: Object.freeze([
      "ready",
      "disabled",
      "focus-visible",
    ]),
    implementation_sources: INTERACTIVE_IMPLEMENTATION_SOURCES,
  }),
  dialog: Object.freeze({
    public_export: "Dialog",
    supported_states: Object.freeze([
      "ready",
      "loading",
      "error",
      "focus-visible",
    ]),
    implementation_sources: INTERACTIVE_IMPLEMENTATION_SOURCES,
  }),
  alert: Object.freeze({
    public_export: "Alert",
    supported_states: Object.freeze([
      "ready",
      "focus-visible",
    ]),
    implementation_sources: NATIVE_IMPLEMENTATION_SOURCES,
  }),
  table: Object.freeze({
    public_export: "Table",
    supported_states: Object.freeze([
      "empty",
      "ready",
      "loading",
      "error",
      "focus-visible",
    ]),
    implementation_sources: NATIVE_IMPLEMENTATION_SOURCES,
  }),
  panel: Object.freeze({
    public_export: "Panel",
    supported_states: Object.freeze([
      "ready",
      "loading",
      "error",
    ]),
    implementation_sources: NATIVE_IMPLEMENTATION_SOURCES,
  }),
  card: Object.freeze({
    public_export: "Card",
    supported_states: Object.freeze([
      "ready",
      "disabled",
      "focus-visible",
    ]),
    implementation_sources: NATIVE_IMPLEMENTATION_SOURCES,
  }),
  status_message: Object.freeze({
    public_export: "StatusMessage",
    supported_states: Object.freeze([
      "ready",
      "loading",
      "error",
    ]),
  }),
});

const CONTRACT_CLASSIFICATIONS = Object.freeze({
  action_button: "public_runtime_component",
  action_group: "public_runtime_component",
  form_field: "public_runtime_component",
  text_field: "public_runtime_component",
  text_area: "public_runtime_component",
  select_field: "public_runtime_component",
  checkbox_group: "public_runtime_component",
  radio_group: "public_runtime_component",
  toggle: "public_runtime_component",
  tabs: "public_runtime_component",
  menu: "public_runtime_component",
  dialog: "public_runtime_component",
  alert: "public_runtime_component",
  table: "public_runtime_component",
  panel: "public_runtime_component",
  card: "public_runtime_component",
  status_message: "public_runtime_component",
});

const VALID_COMPONENT_CLASSIFICATIONS = new Set([
  "public_runtime_component",
  "composed_behavior",
  "internal_primitive",
  "contract_only",
]);

export const COMPONENT_IMPLEMENTATION_REGISTRY = Object.freeze(
  Object.entries(CONTRACT_CLASSIFICATIONS).map(([contractId, classification]) => {
    const implementation = IMPLEMENTED_COMPONENTS[contractId];

    return Object.freeze({
      contract_id: contractId,
      classification,
      implementation_status: implementation ? "implemented" : "not_implemented",
      public_export: implementation?.public_export ?? null,
      package_export: implementation
        ? COMPONENT_RUNTIME_ADAPTER.package_export
        : null,
      stylesheet_export: implementation
        ? COMPONENT_RUNTIME_ADAPTER.stylesheet_export
        : null,
      supported_states: implementation?.supported_states ?? Object.freeze([]),
      evidence_scenario_ids: implementation
        ? Object.freeze(
            implementation.supported_states.map(
              (state) => `${contractId}.${state}`,
            ),
          )
        : Object.freeze([]),
      implementation_sources: implementation
        ? implementation.implementation_sources ?? BASE_IMPLEMENTATION_SOURCES
        : Object.freeze([]),
    });
  }),
);

export function listComponentImplementationRegistry() {
  return structuredClone(COMPONENT_IMPLEMENTATION_REGISTRY);
}

export function listRendererComponentIds(registry = COMPONENT_IMPLEMENTATION_REGISTRY) {
  return registry
    .filter(
      (entry) =>
        entry.implementation_status === "implemented" &&
        Boolean(entry.public_export) &&
        Boolean(entry.package_export) &&
        entry.supported_states.length > 0 &&
        entry.evidence_scenario_ids.length > 0,
    )
    .map((entry) => entry.contract_id);
}

export function validateComponentImplementationRegistry(
  componentContracts,
  registry = COMPONENT_IMPLEMENTATION_REGISTRY,
) {
  const contractById = new Map(
    componentContracts.map((contract) => [contract.id, contract]),
  );
  const seenIds = new Set();
  const seenExports = new Set();

  for (const entry of registry) {
    if (seenIds.has(entry.contract_id)) {
      throw new Error(`Duplicate component registry id: ${entry.contract_id}`);
    }
    seenIds.add(entry.contract_id);

    const contract = contractById.get(entry.contract_id);
    if (!contract) {
      throw new Error(`Unknown component registry contract: ${entry.contract_id}`);
    }
    if (!VALID_COMPONENT_CLASSIFICATIONS.has(entry.classification)) {
      throw new Error(
        `Invalid component registry classification for ${entry.contract_id}: ${entry.classification}`,
      );
    }
    if (
      entry.implementation_status !== "implemented" &&
      entry.implementation_status !== "not_implemented"
    ) {
      throw new Error(
        `Invalid component implementation status for ${entry.contract_id}: ${entry.implementation_status}`,
      );
    }

    if (entry.implementation_status === "implemented") {
      if (entry.classification !== "public_runtime_component") {
        throw new Error(
          `Implemented component must be classified as public_runtime_component: ${entry.contract_id}`,
        );
      }
      if (
        !entry.public_export ||
        !entry.package_export ||
        !entry.stylesheet_export ||
        entry.evidence_scenario_ids.length === 0 ||
        entry.implementation_sources.length === 0
      ) {
        throw new Error(
          `Implemented component lacks public provenance: ${entry.contract_id}`,
        );
      }

      const exportKey = `${entry.package_export}#${entry.public_export}`;
      if (seenExports.has(exportKey)) {
        throw new Error(`Duplicate component public export: ${exportKey}`);
      }
      seenExports.add(exportKey);

      for (const state of entry.supported_states) {
        if (!contract.required_states.includes(state)) {
          throw new Error(
            `Component registry supports an unsupported state ${entry.contract_id}.${state}`,
          );
        }
      }
      if (new Set(entry.supported_states).size !== entry.supported_states.length) {
        throw new Error(
          `Duplicate supported component state: ${entry.contract_id}`,
        );
      }
      const expectedScenarioIds = entry.supported_states.map(
        (state) => `${entry.contract_id}.${state}`,
      );
      if (
        entry.evidence_scenario_ids.length !== expectedScenarioIds.length ||
        entry.evidence_scenario_ids.some(
          (scenarioId, index) => scenarioId !== expectedScenarioIds[index],
        )
      ) {
        throw new Error(
          `Component evidence scenarios do not match supported states: ${entry.contract_id}`,
        );
      }
    } else if (
      entry.public_export ||
      entry.package_export ||
      entry.stylesheet_export ||
      entry.supported_states.length > 0 ||
      entry.evidence_scenario_ids.length > 0 ||
      entry.implementation_sources.length > 0
    ) {
      throw new Error(
        `Unimplemented component claims runtime provenance: ${entry.contract_id}`,
      );
    } else if (entry.classification === "public_runtime_component") {
      throw new Error(
        `Public runtime component is not implemented: ${entry.contract_id}`,
      );
    }
  }

  for (const contractId of contractById.keys()) {
    if (!seenIds.has(contractId)) {
      throw new Error(`Component registry is missing contract: ${contractId}`);
    }
  }

  return true;
}

export function createComponentScenarioManifest(
  componentContracts,
  registry = COMPONENT_IMPLEMENTATION_REGISTRY,
  evidence = {},
) {
  const registryById = new Map(
    registry.map((entry) => [entry.contract_id, entry]),
  );
  const seenContractIds = new Set();
  const implementedEntries = registry.filter(
    (entry) => entry.implementation_status === "implemented",
  );
  const expectedReceiptComponentIds = implementedEntries.map(
    (entry) => entry.contract_id,
  );
  const expectedReceiptScenarioIds = implementedEntries.flatMap((entry) =>
    entry.supported_states.map((state) => `${entry.contract_id}.${state}`),
  );
  const receipt = evidence.bundle?.reviewer_receipt;
  const sameStringMembers = (actual, expected) =>
    Array.isArray(actual) &&
    actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
  const receiptContractHashesMatch =
    receipt?.contract_hashes &&
    typeof receipt.contract_hashes === "object" &&
    expectedReceiptComponentIds.every(
      (contractId) =>
        receipt.contract_hashes[contractId] ===
        evidence.contract_hashes?.[contractId],
    ) &&
    Object.keys(receipt.contract_hashes).length ===
      expectedReceiptComponentIds.length;
  const exactFixtureOutputHashes = (record) =>
    record &&
    typeof record === "object" &&
    expectedReceiptComponentIds.every(
      (contractId) =>
        typeof evidence.fixture_output_hashes?.[contractId] === "string" &&
        evidence.fixture_output_hashes[contractId].length > 0 &&
        record[contractId] === evidence.fixture_output_hashes[contractId],
    ) &&
    Object.keys(record).length === expectedReceiptComponentIds.length;
  const receiptFixtureOutputHashesMatch = exactFixtureOutputHashes(
    receipt?.fixture_output_hashes,
  );
  const bundleFixtureOutputHashesMatch = exactFixtureOutputHashes(
    evidence.bundle?.fixture_output_hashes,
  );
  const receiptUnsupportedClaimsMatch = sameStringMembers(
    receipt?.unsupported_claims,
    COMPONENT_RUNTIME_ADAPTER.support_limits,
  );
  const bundleUnsupportedClaimsMatch = sameStringMembers(
    evidence.bundle?.unsupported_claims,
    COMPONENT_RUNTIME_ADAPTER.support_limits,
  );
  const receiptScopeCurrent =
    receipt?.run_id === evidence.bundle?.run_id &&
    receipt?.browser_version === evidence.bundle?.browser_version &&
    receipt?.implementation_hash === evidence.implementation_hash &&
    typeof receipt?.automated_evidence_hash === "string" &&
    receipt.automated_evidence_hash.length > 0 &&
    receipt.automated_evidence_hash ===
      evidence.bundle?.automated_evidence_hash &&
    receipt?.scenario_count === expectedReceiptScenarioIds.length &&
    receipt?.presentation_count ===
      expectedReceiptScenarioIds.length *
        COMPONENT_RUNTIME_ADAPTER.verified_viewports.length *
        COMPONENT_RUNTIME_ADAPTER.verified_appearances.length &&
    sameStringMembers(receipt?.component_ids, expectedReceiptComponentIds) &&
    sameStringMembers(receipt?.scenario_ids, expectedReceiptScenarioIds) &&
    sameStringMembers(
      receipt?.required_viewports,
      COMPONENT_RUNTIME_ADAPTER.verified_viewports,
    ) &&
    sameStringMembers(
      receipt?.required_appearances,
      COMPONENT_RUNTIME_ADAPTER.verified_appearances,
    ) &&
    receiptContractHashesMatch &&
    receiptFixtureOutputHashesMatch &&
    receiptUnsupportedClaimsMatch;

  return componentContracts.flatMap((contract) => {
    if (seenContractIds.has(contract.id)) {
      throw new Error(`Duplicate component contract id: ${contract.id}`);
    }

    seenContractIds.add(contract.id);
    const implementation = registryById.get(contract.id);

    if (!implementation) {
      throw new Error(`Component registry is missing contract: ${contract.id}`);
    }

    const supportedStates = new Set(implementation.supported_states);

    for (const state of supportedStates) {
      if (!contract.required_states.includes(state)) {
        throw new Error(
          `Component registry supports an unsupported state ${contract.id}.${state}`,
        );
      }
    }

    return contract.required_states.map((state) => {
      const scenarioId = `${contract.id}.${state}`;
      const evidenceScenario = evidence.bundle?.scenarios?.find(
        (scenario) => scenario.id === scenarioId,
      );
      const expectedContractHash = evidence.contract_hashes?.[contract.id];
      const expectedImplementationHash =
        evidence.implementation_hashes?.[contract.id];
      const expectedFixtureOutputHash =
        evidence.fixture_output_hashes?.[contract.id];
      const currentHashBindings =
        typeof expectedContractHash === "string" &&
        expectedContractHash.length > 0 &&
        typeof expectedImplementationHash === "string" &&
        expectedImplementationHash.length > 0 &&
        typeof evidenceScenario?.contract_hash === "string" &&
        evidenceScenario.contract_hash.length > 0 &&
        typeof evidenceScenario?.implementation_hash === "string" &&
        evidenceScenario.implementation_hash.length > 0 &&
        typeof expectedFixtureOutputHash === "string" &&
        expectedFixtureOutputHash.length > 0 &&
        typeof evidenceScenario?.fixture_output_hash === "string" &&
        evidenceScenario.fixture_output_hash.length > 0 &&
        evidenceScenario.contract_hash === expectedContractHash &&
        evidenceScenario.implementation_hash === expectedImplementationHash &&
        evidenceScenario.fixture_output_hash === expectedFixtureOutputHash;
      const viewportResults = Array.isArray(evidenceScenario?.viewport_results)
        ? evidenceScenario.viewport_results
        : [];
      const requiredViewports = COMPONENT_RUNTIME_ADAPTER.verified_viewports;
      const requiredAppearances = COMPONENT_RUNTIME_ADAPTER.verified_appearances;
      const requiredPresentationsPassed = requiredViewports.every((viewport) => {
        const viewportResult = viewportResults.find(
          (result) => result.viewport === viewport && result.status === "pass",
        );
        const appearanceResults = Array.isArray(viewportResult?.appearances)
          ? viewportResult.appearances
          : [];
        const passedAppearances = new Set(
          appearanceResults
            .filter((result) => result.status === "pass")
            .map((result) => result.appearance),
        );

        return requiredAppearances.every((appearance) =>
          passedAppearances.has(appearance),
        );
      });
      const currentEvidence =
        Boolean(evidence.bundle?.run_id) &&
        Boolean(evidence.bundle?.browser_version) &&
        evidence.bundle?.package_status === "pass" &&
        evidence.bundle?.automated_accessibility_status === "pass" &&
        evidence.bundle?.reviewer_receipt?.status === "pass" &&
        receiptScopeCurrent &&
        bundleFixtureOutputHashesMatch &&
        bundleUnsupportedClaimsMatch &&
        Boolean(evidence.bundle?.reviewer_receipt?.path) &&
        typeof evidence.bundle?.reviewer_receipt?.hash === "string" &&
        evidence.bundle.reviewer_receipt.hash.length > 0 &&
        evidenceScenario?.status === "verified" &&
        Array.isArray(evidenceScenario?.evidence_refs) &&
        evidenceScenario.evidence_refs.length > 0 &&
        currentHashBindings &&
        requiredPresentationsPassed;
      const supported =
        implementation.implementation_status === "implemented" &&
        supportedStates.has(state);
      const verified = supported && currentEvidence;
      const staleEvidence =
        supported && Boolean(evidenceScenario) && !currentEvidence;

      return {
        id: scenarioId,
        contract_id: contract.id,
        state,
        status: verified ? "verified" : "unverified",
        rationale: verified
          ? "The current contract and implementation hashes passed the required browser, package, and accessibility evidence run."
          : staleEvidence
            ? "Evidence exists, but its contract, implementation, run, or viewport binding is stale or incomplete."
          : implementation.implementation_status === "implemented"
            ? "The runtime component exists, but this state has no current verified evidence."
            : "No JudgmentKit runtime implementation is shipped for this semantic contract.",
        evidence_refs: verified
          ? [...(evidenceScenario.evidence_refs ?? [])]
          : [],
        evidence_run_id: verified ? evidence.bundle.run_id : null,
        contract_hash: verified ? evidenceScenario.contract_hash : null,
        implementation_hash: verified
          ? evidenceScenario.implementation_hash
          : null,
        fixture_output_hash: verified
          ? evidenceScenario.fixture_output_hash
          : null,
        implementation_sources: verified
          ? [...implementation.implementation_sources]
          : [],
        viewport_results: verified ? structuredClone(viewportResults) : [],
      };
    });
  });
}

export function coveredStatesForContract(
  contractId,
  scenarioManifest,
) {
  return scenarioManifest
    .filter(
      (scenario) =>
        scenario.contract_id === contractId && scenario.status === "verified",
    )
    .map((scenario) => scenario.state);
}
