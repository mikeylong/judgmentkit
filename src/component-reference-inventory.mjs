import { readFileSync } from "node:fs";

const REFERENCE_INVENTORY_URL = new URL(
  "../contracts/simple-design-system.component-inventory.json",
  import.meta.url,
);
const COMPONENT_CONTRACT_URL = new URL(
  "../contracts/ai-ui-generation.activity-contract.json",
  import.meta.url,
);

const EXPECTED_TOTALS = Object.freeze({
  public: Object.freeze({ folders: 19, families: 122, variants: 336 }),
  hidden: Object.freeze({ families: 6, variants: 18 }),
  all: Object.freeze({ families: 128, variants: 354 }),
});

const REQUIRED_FAMILY_FIELDS = Object.freeze([
  "id",
  "folder",
  "figma_name",
  "visibility",
  "variant_count",
  "audit_status",
  "normalization_kind",
  "normalization_owner",
  "variant_metadata_status",
  "variant_axes",
  "properties",
  "mapped_contract_ids",
  "mapping_relation",
  "mapping_confidence",
  "runtime_status",
  "rationale",
  "uncertainty",
]);

const NORMALIZATION_KINDS = Object.freeze([
  "component",
  "variant",
  "internal_part",
  "pattern",
  "template",
  "typography_role",
  "authoring_helper",
]);
const NORMALIZATION_KIND_SET = new Set(NORMALIZATION_KINDS);
const VARIANT_METADATA_STATUSES = Object.freeze([
  "documented",
  "partially_documented",
  "not_documented_in_audit",
]);
const VARIANT_METADATA_STATUS_SET = new Set(VARIANT_METADATA_STATUSES);
const AXIS_SEMANTIC_CLASSIFICATIONS = Object.freeze([
  "authoring_context",
  "compound_state",
  "content_configuration",
  "interaction_state",
  "layout_configuration",
  "presentation_only",
  "responsive_context",
  "selection_state",
  "semantic_tone",
  "size_configuration",
  "structural_configuration",
  "value_state",
  "visual_emphasis",
]);
const AXIS_SEMANTIC_CLASSIFICATION_SET = new Set(
  AXIS_SEMANTIC_CLASSIFICATIONS,
);
const VISIBILITY_VALUES = Object.freeze(["public", "hidden"]);
const AUDIT_STATUSES = Object.freeze([
  "direct_contract_mapping",
  "partial_contract_mapping",
  "missing_canonical_contract",
  "product_template_composition",
  "hidden_internal_helper",
]);
const NORMALIZATION_OWNERS = Object.freeze([
  "judgmentkit",
  "consumer",
  "design_system_semantics",
  "figma_authoring",
]);
const MAPPING_RELATIONS = Object.freeze(["direct", "partial", "none"]);
const MAPPING_CONFIDENCES = Object.freeze(["high", "medium", "none"]);
const RUNTIME_STATUSES = Object.freeze([
  "implemented",
  "partially_implemented",
  "not_implemented",
  "consumer_owned",
  "not_applicable",
]);
const DECLARED_ENUM_VALUES = Object.freeze({
  visibility: VISIBILITY_VALUES,
  audit_status: AUDIT_STATUSES,
  normalization_kind: NORMALIZATION_KINDS,
  normalization_owner: NORMALIZATION_OWNERS,
  variant_metadata_status: VARIANT_METADATA_STATUSES,
  axis_semantic_classification: AXIS_SEMANTIC_CLASSIFICATIONS,
  mapping_relation: MAPPING_RELATIONS,
  mapping_confidence: MAPPING_CONFIDENCES,
  runtime_status: RUNTIME_STATUSES,
});
const VISIBILITIES = new Set(VISIBILITY_VALUES);
const AUDIT_STATUS_SET = new Set(AUDIT_STATUSES);
const NORMALIZATION_OWNER_SET = new Set(NORMALIZATION_OWNERS);
const MAPPING_RELATION_SET = new Set(MAPPING_RELATIONS);
const MAPPING_CONFIDENCE_SET = new Set(MAPPING_CONFIDENCES);
const RUNTIME_STATUS_SET = new Set(RUNTIME_STATUSES);
const MAPPING_COHERENCE_BY_AUDIT_STATUS = Object.freeze({
  direct_contract_mapping: Object.freeze({
    relation: "direct",
    confidence: "high",
    requires_targets: true,
  }),
  partial_contract_mapping: Object.freeze({
    relation: "partial",
    confidence: "medium",
    requires_targets: true,
  }),
  missing_canonical_contract: Object.freeze({
    relation: "none",
    confidence: "none",
    requires_targets: false,
  }),
  product_template_composition: Object.freeze({
    relation: "none",
    confidence: "none",
    requires_targets: false,
  }),
  hidden_internal_helper: Object.freeze({
    relation: "none",
    confidence: "none",
    requires_targets: false,
  }),
});
const REQUIRED_ICON_BEARING_FAMILIES = Object.freeze([
  "buttons.icon-button",
  "sections.card-grid-icon",
]);

function readJson(url) {
  return JSON.parse(readFileSync(url, "utf8"));
}

const CANONICAL_REFERENCE_INVENTORY = readJson(REFERENCE_INVENTORY_URL);
const CANONICAL_COMPONENT_CONTRACTS = readJson(COMPONENT_CONTRACT_URL)
  .implementation_contract.default_ai_native_design_system.component_contracts;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function idsFromEntries(entries) {
  if (entries === undefined || entries === null) return [];
  if (entries instanceof Set) return [...entries].flatMap(idsFromEntries);
  if (entries instanceof Map) return [...entries.keys()].flatMap(idsFromEntries);
  if (!Array.isArray(entries)) entries = [entries];

  return entries.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (!entry || typeof entry !== "object") return [];
    if (nonEmptyString(entry.id)) return [entry.id];
    if (nonEmptyString(entry.contract_id)) return [entry.contract_id];
    return [];
  });
}

function normalizeAuthorities(authorities) {
  if (authorities === undefined) {
    return {
      resolved: new Set(idsFromEntries(CANONICAL_COMPONENT_CONTRACTS)),
      planned: new Set(),
    };
  }

  if (
    Array.isArray(authorities) ||
    authorities instanceof Set ||
    authorities instanceof Map ||
    typeof authorities === "string"
  ) {
    return { resolved: new Set(idsFromEntries(authorities)), planned: new Set() };
  }

  assert(
    authorities && typeof authorities === "object",
    "Component reference authorities must be an array, set, map, string, or object.",
  );

  const nestedContracts =
    authorities.implementation_contract?.default_ai_native_design_system
      ?.component_contracts ??
    authorities.default_ai_native_design_system?.component_contracts;
  const resolvedSources = [
    authorities.contracts,
    authorities.component_contracts,
    authorities.contract_ids,
    authorities.registry,
    authorities.resolved,
    nestedContracts,
  ];
  const plannedSources = [
    authorities.planned_contract_ids,
    authorities.planned_target_ids,
    authorities.planned_ids,
    authorities.planned,
  ];

  return {
    resolved: new Set(resolvedSources.flatMap(idsFromEntries)),
    planned: new Set(plannedSources.flatMap(idsFromEntries)),
  };
}

function sameStringSet(actual, expected) {
  return (
    new Set(actual).size === actual.length &&
    new Set(expected).size === expected.length &&
    actual.length === expected.length &&
    actual.every((value) => expected.includes(value)) &&
    expected.every((value) => actual.includes(value))
  );
}

function validateDeclaredEnums(inventory) {
  const declared = inventory.validation_contract?.allowed_values;
  assert(
    declared && typeof declared === "object" && !Array.isArray(declared),
    "Component reference inventory must declare allowed enum values.",
  );
  assert(
    sameStringSet(Object.keys(declared), Object.keys(DECLARED_ENUM_VALUES)),
    "Component reference inventory must declare exactly the supported enums.",
  );
  for (const [enumId, expectedValues] of Object.entries(
    DECLARED_ENUM_VALUES,
  )) {
    assert(
      Array.isArray(declared[enumId]) &&
        sameStringSet(declared[enumId], expectedValues),
      `Component reference inventory must declare exactly the allowed ${enumId} values.`,
    );
  }
}

function isIsoCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function countFamilies(families) {
  return {
    families: families.length,
    variants: families.reduce((total, family) => total + family.variant_count, 0),
  };
}

function compareCount(label, actual, expected) {
  assert(
    actual === expected,
    `${label} must be ${expected}; received ${actual}.`,
  );
}

function validateDeclaredTotals(inventory, recomputed) {
  assert(inventory.totals && typeof inventory.totals === "object", "Component reference inventory totals are required.");

  for (const visibility of ["public", "hidden", "all"]) {
    const declared = inventory.totals[visibility];
    const expected = EXPECTED_TOTALS[visibility];
    assert(declared && typeof declared === "object", `Missing declared ${visibility} inventory totals.`);

    compareCount(
      `Declared ${visibility} family total`,
      declared.families,
      expected.families,
    );
    compareCount(
      `Declared ${visibility} variant total`,
      declared.variants,
      expected.variants,
    );
    compareCount(
      `Recomputed ${visibility} family total`,
      recomputed[visibility].families,
      expected.families,
    );
    compareCount(
      `Recomputed ${visibility} variant total`,
      recomputed[visibility].variants,
      expected.variants,
    );
  }

  compareCount(
    "Declared public folder total",
    inventory.totals.public.folders,
    EXPECTED_TOTALS.public.folders,
  );
  compareCount(
    "Recomputed public folder total",
    recomputed.public.folders,
    EXPECTED_TOTALS.public.folders,
  );
}

function validateFolderAccounting(inventory, recomputed) {
  assert(Array.isArray(inventory.folders), "Component reference inventory folders must be an array.");
  const declaredFolders = new Map();

  for (const folder of inventory.folders) {
    assert(nonEmptyString(folder?.name), "Every component reference folder needs a name.");
    assert(VISIBILITIES.has(folder.visibility), `Invalid folder visibility: ${folder.visibility}.`);
    assert(Number.isInteger(folder.families) && folder.families > 0, `Folder ${folder.name} needs a positive family count.`);
    assert(Number.isInteger(folder.variants) && folder.variants > 0, `Folder ${folder.name} needs a positive variant count.`);

    const key = `${folder.visibility}:${folder.name}`;
    assert(!declaredFolders.has(key), `Duplicate component reference folder: ${key}.`);
    declaredFolders.set(key, folder);
  }

  for (const [key, count] of recomputed.byFolder) {
    const declared = declaredFolders.get(key);
    assert(declared, `Component reference family folder is not declared: ${key}.`);
    compareCount(`${key} family total`, declared.families, count.families);
    compareCount(`${key} variant total`, declared.variants, count.variants);
  }

  for (const key of declaredFolders.keys()) {
    assert(recomputed.byFolder.has(key), `Declared component reference folder has no families: ${key}.`);
  }
}

function validateAuditStatusAccounting(inventory, recomputed) {
  const declaredByVisibility = inventory.totals?.audit_status;
  if (!declaredByVisibility) return;

  for (const visibility of ["public", "hidden"]) {
    const declared = declaredByVisibility[visibility];
    assert(declared && typeof declared === "object", `Missing ${visibility} audit-status totals.`);
    const actual = recomputed.auditStatus[visibility];
    const statusIds = new Set([...Object.keys(declared), ...Object.keys(actual)]);

    for (const statusId of statusIds) {
      compareCount(
        `${visibility} ${statusId} audit-status total`,
        actual[statusId] ?? 0,
        declared[statusId] ?? 0,
      );
    }
  }
}

function variantCombinationKey(family, axisValues) {
  return JSON.stringify(
    family.variant_axes.map((axis) => [axis.id, axisValues[axis.id]]),
  );
}

function cartesianVariantCombinations(family) {
  return family.variant_axes.reduce(
    (combinations, axis) =>
      combinations.flatMap((combination) =>
        axis.values.map((value) => ({ ...combination, [axis.id]: value })),
      ),
    [{}],
  );
}

function documentedVariantCombinationKeys(family) {
  assert(
    family.variant_metadata_status === "documented",
    `Component reference family ${family.id} must be documented before exact variant combinations can be resolved.`,
  );
  assert(
    family.variant_axes.length > 0,
    `Documented component reference family ${family.id} needs at least one variant axis.`,
  );

  let combinations;
  if (family.axis_product_matches_variant_count === true) {
    assert(
      family.variant_combinations === undefined,
      `Cartesian component reference family ${family.id} must inherit combinations from its axes instead of declaring a second combination list.`,
    );
    combinations = cartesianVariantCombinations(family);
  } else {
    assert(
      family.axis_product_matches_variant_count === false,
      `Documented component reference family ${family.id} must declare whether its axes form the exact variant product.`,
    );
    assert(
      Array.isArray(family.variant_combinations),
      `Non-Cartesian component reference family ${family.id} needs an explicit variant_combinations list.`,
    );
    combinations = family.variant_combinations;
  }

  compareCount(
    `${family.id} exact variant-combination total`,
    combinations.length,
    family.variant_count,
  );

  const axisIds = family.variant_axes.map((axis) => axis.id);
  const combinationKeys = new Set();
  for (const combination of combinations) {
    assert(
      combination && typeof combination === "object" && !Array.isArray(combination),
      `Component reference family ${family.id} has an invalid variant combination.`,
    );
    const combinationAxisIds = Object.keys(combination);
    assert(
      sameStringSet(combinationAxisIds, axisIds),
      `Component reference family ${family.id} variant combination must declare exactly ${axisIds.join(", ")}.`,
    );
    for (const axis of family.variant_axes) {
      assert(
        axis.values.includes(combination[axis.id]),
        `Component reference family ${family.id} variant combination has an unknown ${axis.id} value: ${combination[axis.id]}.`,
      );
    }
    const key = variantCombinationKey(family, combination);
    assert(
      !combinationKeys.has(key),
      `Component reference family ${family.id} repeats an exact variant combination.`,
    );
    combinationKeys.add(key);
  }

  return combinationKeys;
}

function validateVariantNormalizationPolicy(inventory) {
  const policy = inventory.variant_normalization_policy;
  assert(
    policy && typeof policy === "object",
    "Component reference inventory needs a variant normalization policy.",
  );
  assert(
    policy.family_disposition_is_variant_semantic_normalization === false,
    "A family normalization disposition must not be treated as variant semantic normalization.",
  );
  assert(
    policy.fully_documented_status === "documented",
    "Variant semantic normalization must require documented metadata.",
  );
  assert(
    policy.documented_families_require_variant_axes === true &&
      policy.non_documented_families_must_be_singleton_without_variant_axes ===
        true,
    "Variant normalization policy must distinguish axis-bearing families from singleton masters.",
  );
  const inheritance = policy.combination_inheritance;
  assert(
    inheritance?.mode ===
      "cartesian_axis_tuple_or_explicit_combination_list" &&
      inheritance.cartesian_inheritance_requires_axis_product_match === true &&
      inheritance.explicit_non_cartesian_combinations_allowed === true &&
      inheritance.requires_every_axis_classified === true &&
      inheritance.runtime_evidence_inferred === false,
    "Variant combination inheritance must require exact combination accounting and must not infer runtime evidence.",
  );

  const classifications = policy.axis_semantic_classifications;
  assert(
    classifications &&
      typeof classifications === "object" &&
      !Array.isArray(classifications),
    "Variant normalization policy needs per-family axis semantic classifications.",
  );

  const familyById = new Map(
    inventory.families.map((family) => [family.id, family]),
  );
  let classifiedAxisCount = 0;
  for (const [familyId, axisClassifications] of Object.entries(
    classifications,
  )) {
    const family = familyById.get(familyId);
    assert(
      family,
      `Axis semantic classifications reference unknown family ${familyId}.`,
    );
    assert(
      family.variant_metadata_status === "documented",
      `Axis semantic classifications may only claim documented family ${familyId}.`,
    );
    assert(
      axisClassifications &&
        typeof axisClassifications === "object" &&
        !Array.isArray(axisClassifications),
      `Axis semantic classifications for ${familyId} must be an object.`,
    );
    const axisIds = family.variant_axes.map((axis) => axis.id);
    assert(
      sameStringSet(Object.keys(axisClassifications), axisIds),
      `Axis semantic classifications for ${familyId} must cover exactly its documented axes.`,
    );
    for (const [axisId, classification] of Object.entries(
      axisClassifications,
    )) {
      assert(
        AXIS_SEMANTIC_CLASSIFICATION_SET.has(classification),
        `Invalid axis semantic classification for ${familyId}.${axisId}: ${classification}.`,
      );
      classifiedAxisCount += 1;
    }
  }

  const documentedFamilies = inventory.families.filter(
    (family) => family.variant_metadata_status === "documented",
  );
  for (const family of documentedFamilies) {
    assert(
      family.variant_axes.length > 0,
      `Documented component reference family ${family.id} must be axis-bearing.`,
    );
    assert(
      Object.hasOwn(classifications, family.id),
      `Documented component reference family ${family.id} needs per-axis semantic classifications.`,
    );
    documentedVariantCombinationKeys(family);
  }

  const partiallyDocumentedFamilies = inventory.families.filter(
    (family) => family.variant_metadata_status === "partially_documented",
  );
  const undocumentedFamilies = inventory.families.filter(
    (family) => family.variant_metadata_status === "not_documented_in_audit",
  );
  for (const family of [
    ...partiallyDocumentedFamilies,
    ...undocumentedFamilies,
  ]) {
    assert(
      family.variant_count === 1 && family.variant_axes.length === 0,
      `Non-documented component reference family ${family.id} must be a singleton master without variant axes.`,
    );
  }

  return {
    documented: countFamilies(documentedFamilies),
    partiallyDocumented: countFamilies(partiallyDocumentedFamilies),
    undocumented: countFamilies(undocumentedFamilies),
    axes: {
      eligible: documentedFamilies.reduce(
        (total, family) => total + family.variant_axes.length,
        0,
      ),
      classified: classifiedAxisCount,
    },
  };
}

function validateParentRelationships(inventory) {
  const policy = inventory.validation_contract?.parent_family_id_policy;
  assert(
    policy && typeof policy === "object" && !Array.isArray(policy),
    "Component reference inventory needs a parent_family_id policy.",
  );
  assert(
    Array.isArray(policy.required_for_normalization_kinds) &&
      sameStringSet(policy.required_for_normalization_kinds, [
        "variant",
        "internal_part",
      ]) &&
      policy.forbidden_for_other_kinds === true &&
      policy.same_folder_required === true &&
      policy.same_owner_required === true &&
      policy.child_mappings_must_be_parent_subset === true &&
      policy.acyclic === true,
    "Component reference parent policy must require bounded, acyclic variant and internal-part ownership.",
  );
  assert(
    policy.allowed_parent_kinds &&
      typeof policy.allowed_parent_kinds === "object" &&
      sameStringSet(Object.keys(policy.allowed_parent_kinds), [
        "variant",
        "internal_part",
      ]) &&
      Array.isArray(policy.allowed_parent_kinds.variant) &&
      sameStringSet(policy.allowed_parent_kinds.variant, [
        "component",
        "pattern",
      ]) &&
      Array.isArray(policy.allowed_parent_kinds.internal_part) &&
      sameStringSet(policy.allowed_parent_kinds.internal_part, [
        "component",
        "pattern",
        "internal_part",
      ]),
    "Component reference parent policy must constrain semantically plausible parent kinds.",
  );
  const crossFolderExceptions = policy.cross_folder_exceptions;
  assert(
    crossFolderExceptions &&
      typeof crossFolderExceptions === "object" &&
      !Array.isArray(crossFolderExceptions) &&
      sameStringSet(Object.keys(crossFolderExceptions), [
        "hidden.menu-shortcut",
      ]) &&
      crossFolderExceptions["hidden.menu-shortcut"] === "menu.item",
    "Component reference parent policy must declare exactly the audited cross-folder relationship.",
  );

  const familyById = new Map(
    inventory.families.map((family) => [family.id, family]),
  );
  const childKinds = new Set(policy.required_for_normalization_kinds);
  for (const family of inventory.families) {
    if (!childKinds.has(family.normalization_kind)) {
      assert(
        !Object.hasOwn(family, "parent_family_id"),
        `Component reference family ${family.id} must not declare parent_family_id for normalization kind ${family.normalization_kind}.`,
      );
      continue;
    }

    assert(
      nonEmptyString(family.parent_family_id),
      `Component reference family ${family.id} needs parent_family_id.`,
    );
    assert(
      family.parent_family_id !== family.id,
      `Component reference family ${family.id} must not parent itself.`,
    );
    const parent = familyById.get(family.parent_family_id);
    assert(
      parent,
      `Component reference family ${family.id} references unknown parent ${family.parent_family_id}.`,
    );
    assert(
      policy.allowed_parent_kinds[family.normalization_kind].includes(
        parent.normalization_kind,
      ),
      `Component reference family ${family.id} has implausible ${parent.normalization_kind} parent ${parent.id}.`,
    );
    assert(
      !policy.same_owner_required ||
        family.normalization_owner === parent.normalization_owner,
      `Component reference family ${family.id} must share normalization ownership with parent ${parent.id}.`,
    );
    const crossFolderParentId = crossFolderExceptions[family.id];
    if (family.folder !== parent.folder) {
      assert(
        crossFolderParentId === parent.id,
        `Component reference family ${family.id} must share a folder with parent ${parent.id} or use the audited exception.`,
      );
    } else {
      assert(
        crossFolderParentId === undefined,
        `Component reference family ${family.id} declares an unnecessary cross-folder parent exception.`,
      );
    }
    for (const targetId of family.mapped_contract_ids) {
      assert(
        parent.mapped_contract_ids.includes(targetId),
        `Component reference family ${family.id} mapping ${targetId} must be inherited from parent ${parent.id}.`,
      );
    }
  }

  for (const family of inventory.families) {
    const ancestry = new Set([family.id]);
    let current = family;
    while (nonEmptyString(current.parent_family_id)) {
      assert(
        !ancestry.has(current.parent_family_id),
        `Component reference parent relationships contain a cycle at ${current.parent_family_id}.`,
      );
      ancestry.add(current.parent_family_id);
      current = familyById.get(current.parent_family_id);
    }
  }
}

function iconBearingFamily(family) {
  return /(^|[^a-z])icon([^a-z]|$)/iu.test(family.figma_name);
}

function standaloneIconFamily(family) {
  return family.folder.trim().toLowerCase() === "icons" || /^icons[.:-]/iu.test(family.id);
}

export function listComponentReferenceInventory() {
  const inventory = structuredClone(CANONICAL_REFERENCE_INVENTORY);
  validateComponentReferenceInventory(inventory);
  return inventory;
}

export function validateComponentReferenceInventory(inventory, authorities) {
  assert(inventory && typeof inventory === "object", "Component reference inventory must be an object.");
  assert(Array.isArray(inventory.families), "Component reference inventory families must be an array.");
  assert(
    inventory.scope?.styling_parity === "excluded",
    "Component reference inventory styling parity must remain excluded.",
  );
  assert(
    isIsoCalendarDate(inventory.source?.inspected_at),
    "Component reference inventory source inspected_at must be an ISO calendar date.",
  );
  validateDeclaredEnums(inventory);

  const { resolved, planned } = normalizeAuthorities(authorities);
  const seenIds = new Set();
  const publicFolders = new Set();
  const byFolder = new Map();
  const auditStatus = { public: {}, hidden: {} };

  for (const family of inventory.families) {
    assert(family && typeof family === "object", "Every component reference family must be an object.");
    for (const field of REQUIRED_FAMILY_FIELDS) {
      assert(Object.hasOwn(family, field), `Component reference family is missing ${field}: ${family.id ?? "unknown"}.`);
    }

    assert(nonEmptyString(family.id), "Every component reference family needs a non-empty id.");
    assert(!seenIds.has(family.id), `Duplicate component reference family id: ${family.id}.`);
    seenIds.add(family.id);

    assert(nonEmptyString(family.folder), `Component reference family ${family.id} needs a folder.`);
    assert(nonEmptyString(family.figma_name), `Component reference family ${family.id} needs a Figma name.`);
    assert(VISIBILITIES.has(family.visibility), `Invalid component reference visibility for ${family.id}: ${family.visibility}.`);
    assert(
      Number.isInteger(family.variant_count) && family.variant_count > 0,
      `Component reference family ${family.id} needs a positive integer variant_count.`,
    );
    assert(
      NORMALIZATION_KIND_SET.has(family.normalization_kind),
      `Invalid normalization kind for ${family.id}: ${family.normalization_kind}.`,
    );
    assert(
      VARIANT_METADATA_STATUS_SET.has(family.variant_metadata_status),
      `Invalid variant metadata status for ${family.id}: ${family.variant_metadata_status}.`,
    );
    assert(
      AUDIT_STATUS_SET.has(family.audit_status),
      `Invalid audit status for ${family.id}: ${family.audit_status}.`,
    );
    assert(
      NORMALIZATION_OWNER_SET.has(family.normalization_owner),
      `Invalid normalization owner for ${family.id}: ${family.normalization_owner}.`,
    );
    assert(
      MAPPING_RELATION_SET.has(family.mapping_relation),
      `Invalid mapping relation for ${family.id}: ${family.mapping_relation}.`,
    );
    assert(
      MAPPING_CONFIDENCE_SET.has(family.mapping_confidence),
      `Invalid mapping confidence for ${family.id}: ${family.mapping_confidence}.`,
    );
    assert(
      RUNTIME_STATUS_SET.has(family.runtime_status),
      `Invalid runtime status for ${family.id}: ${family.runtime_status}.`,
    );
    assert(
      nonEmptyString(family.rationale),
      `Component reference family ${family.id} requires a rationale for its normalization or exclusion.`,
    );
    assert(Array.isArray(family.variant_axes), `Component reference family ${family.id} variant_axes must be an array.`);
    assert(Array.isArray(family.properties), `Component reference family ${family.id} properties must be an array.`);
    assert(Array.isArray(family.mapped_contract_ids), `Component reference family ${family.id} mapped_contract_ids must be an array.`);

    if (standaloneIconFamily(family)) {
      throw new Error(`Standalone icon family is outside component reference scope: ${family.id}.`);
    }

    const familyTargetIds = new Set();
    for (const targetId of family.mapped_contract_ids) {
      assert(nonEmptyString(targetId), `Component reference family ${family.id} has an invalid target id.`);
      assert(!familyTargetIds.has(targetId), `Component reference family ${family.id} repeats target id ${targetId}.`);
      familyTargetIds.add(targetId);
      assert(
        resolved.has(targetId) || planned.has(targetId),
        `Component reference target ${targetId} for ${family.id} is neither resolved nor explicitly planned.`,
      );
    }

    const expectedMapping =
      MAPPING_COHERENCE_BY_AUDIT_STATUS[family.audit_status];
    assert(
      family.mapping_relation === expectedMapping.relation &&
        family.mapping_confidence === expectedMapping.confidence,
      `Component reference family ${family.id} mapping relation and confidence must agree with audit status ${family.audit_status}.`,
    );
    assert(
      expectedMapping.requires_targets
        ? family.mapped_contract_ids.length > 0
        : family.mapped_contract_ids.length === 0,
      `Component reference family ${family.id} mapped targets must agree with audit status ${family.audit_status}.`,
    );
    if (family.normalization_owner === "consumer") {
      assert(
        family.runtime_status === "consumer_owned",
        `Consumer-owned component reference family ${family.id} must not claim JudgmentKit runtime status.`,
      );
    }
    if (family.normalization_owner === "figma_authoring") {
      assert(
        family.runtime_status === "not_applicable",
        `Figma-owned component reference family ${family.id} must not claim JudgmentKit runtime status.`,
      );
    }
    if (family.runtime_status === "consumer_owned") {
      assert(
        family.normalization_owner === "consumer",
        `Component reference family ${family.id} may be consumer_owned only when normalization ownership is consumer.`,
      );
    }

    const seenAxisIds = new Set();
    for (const axis of family.variant_axes) {
      assert(nonEmptyString(axis?.id), `Component reference family ${family.id} has a variant axis without an id.`);
      assert(!seenAxisIds.has(axis.id), `Component reference family ${family.id} repeats variant axis ${axis.id}.`);
      seenAxisIds.add(axis.id);
      assert(Array.isArray(axis.values), `Component reference family ${family.id} axis ${axis.id} values must be an array.`);
      const valuesAreExplicitlyUnrecorded =
        axis.values.length === 0 &&
        axis.values_status === "not_recorded" &&
        family.variant_metadata_status === "partially_documented";
      assert(
        axis.values.length > 0 || valuesAreExplicitlyUnrecorded,
        `Component reference family ${family.id} axis ${axis.id} needs values or an explicit not-recorded disposition.`,
      );
      assert(axis.values.every(nonEmptyString), `Component reference family ${family.id} axis ${axis.id} has an invalid value.`);
      assert(new Set(axis.values).size === axis.values.length, `Component reference family ${family.id} axis ${axis.id} repeats a value.`);
    }

    if (family.axis_product_matches_variant_count === true) {
      const axisProduct = family.variant_axes.reduce(
        (product, axis) => product * axis.values.length,
        1,
      );
      compareCount(`${family.id} variant-axis product`, axisProduct, family.variant_count);
    }

    if (family.visibility === "public") publicFolders.add(family.folder);
    const folderKey = `${family.visibility}:${family.folder}`;
    const folderCount = byFolder.get(folderKey) ?? { families: 0, variants: 0 };
    folderCount.families += 1;
    folderCount.variants += family.variant_count;
    byFolder.set(folderKey, folderCount);

    assert(nonEmptyString(family.audit_status), `Component reference family ${family.id} needs an audit status.`);
    auditStatus[family.visibility][family.audit_status] =
      (auditStatus[family.visibility][family.audit_status] ?? 0) + 1;
  }

  for (const requiredId of REQUIRED_ICON_BEARING_FAMILIES) {
    const family = inventory.families.find((entry) => entry.id === requiredId);
    assert(
      family && iconBearingFamily(family),
      `Icon-bearing component family must remain in scope: ${requiredId}.`,
    );
  }

  validateParentRelationships(inventory);
  validateVariantNormalizationPolicy(inventory);

  const publicFamilies = inventory.families.filter((family) => family.visibility === "public");
  const hiddenFamilies = inventory.families.filter((family) => family.visibility === "hidden");
  const recomputed = {
    public: { ...countFamilies(publicFamilies), folders: publicFolders.size },
    hidden: countFamilies(hiddenFamilies),
    all: countFamilies(inventory.families),
    byFolder,
    auditStatus,
  };

  validateDeclaredTotals(inventory, recomputed);
  validateFolderAccounting(inventory, recomputed);
  validateAuditStatusAccounting(inventory, recomputed);

  assert(
    inventory.scope?.standalone_icon_policy ===
      "excluded_existing_judgmentkit_icon_library_treated_as_complete",
    "Component reference inventory must preserve the standalone-icon exclusion policy.",
  );

  return true;
}

function contractList(contracts) {
  if (Array.isArray(contracts)) return contracts;
  return (
    contracts?.implementation_contract?.default_ai_native_design_system
      ?.component_contracts ??
    contracts?.default_ai_native_design_system?.component_contracts ??
    contracts?.component_contracts ??
    []
  );
}

function countByKind(families) {
  return Object.fromEntries(
    NORMALIZATION_KINDS.map((kind) => [
      kind,
      countFamilies(families.filter((family) => family.normalization_kind === kind)),
    ]),
  );
}

function verifiedScenarioIds(scenarios, requiredScenarioIds) {
  const seenIds = new Set();
  const verifiedIds = new Set();

  for (const scenario of scenarios) {
    assert(nonEmptyString(scenario?.id), "Every runtime scenario needs an id.");
    assert(!seenIds.has(scenario.id), `Duplicate runtime scenario id: ${scenario.id}.`);
    seenIds.add(scenario.id);
    assert(requiredScenarioIds.has(scenario.id), `Unknown runtime scenario id: ${scenario.id}.`);
    if (scenario.status === "verified") verifiedIds.add(scenario.id);
  }

  return { seenIds, verifiedIds };
}

function validateExactVariantEvidence(
  evidenceRecords,
  inventory,
  contractById,
  verifiedSupportedScenarioIds,
) {
  assert(
    Array.isArray(evidenceRecords),
    "Exact Figma variant evidence must be an array.",
  );
  const familyById = new Map(
    inventory.families.map((family) => [family.id, family]),
  );
  const seenEvidenceIds = new Set();
  const verifiedFamilyIds = new Set();
  const verifiedVariantKeys = new Set();
  let verifiedRecords = 0;

  for (const evidence of evidenceRecords) {
    assert(
      nonEmptyString(evidence?.id),
      "Every exact Figma variant evidence record needs an id.",
    );
    assert(
      !seenEvidenceIds.has(evidence.id),
      `Duplicate exact Figma variant evidence id: ${evidence.id}.`,
    );
    seenEvidenceIds.add(evidence.id);
    assert(
      evidence.status === "verified" || evidence.status === "unverified",
      `Exact Figma variant evidence ${evidence.id} needs verified or unverified status.`,
    );

    const family = familyById.get(evidence.family_id);
    assert(
      family,
      `Exact Figma variant evidence ${evidence.id} references unknown family ${evidence.family_id}.`,
    );
    assert(
      family.variant_metadata_status === "documented",
      `Exact Figma variant evidence ${evidence.id} requires documented variant combinations for ${family.id}.`,
    );
    const exactCombinationKeys = documentedVariantCombinationKeys(family);
    assert(
      evidence.axis_values &&
        typeof evidence.axis_values === "object" &&
        !Array.isArray(evidence.axis_values),
      `Exact Figma variant evidence ${evidence.id} needs axis_values.`,
    );
    assert(
      sameStringSet(
        Object.keys(evidence.axis_values),
        family.variant_axes.map((axis) => axis.id),
      ),
      `Exact Figma variant evidence ${evidence.id} must identify exactly the axes for ${family.id}.`,
    );
    const evidenceCombinationKey = variantCombinationKey(
      family,
      evidence.axis_values,
    );
    assert(
      exactCombinationKeys.has(evidenceCombinationKey),
      `Exact Figma variant evidence ${evidence.id} does not identify an audited combination for ${family.id}.`,
    );

    assert(
      family.mapped_contract_ids.includes(evidence.contract_id),
      `Exact Figma variant evidence ${evidence.id} must use a contract mapped by ${family.id}.`,
    );
    const contract = contractById.get(evidence.contract_id);
    assert(
      contract?.required_states.includes(evidence.state),
      `Exact Figma variant evidence ${evidence.id} references unknown contract state ${evidence.contract_id}.${evidence.state}.`,
    );

    if (evidence.status === "verified") {
      assert(
        verifiedSupportedScenarioIds.has(
          `${evidence.contract_id}.${evidence.state}`,
        ),
        `Exact Figma variant evidence ${evidence.id} cannot be verified without verified supported contract-state evidence.`,
      );
      verifiedRecords += 1;
      verifiedFamilyIds.add(family.id);
      verifiedVariantKeys.add(`${family.id}:${evidenceCombinationKey}`);
    }
  }

  return {
    records: evidenceRecords.length,
    verifiedRecords,
    verifiedFamilyIds,
    verifiedVariantKeys,
  };
}

export function summarizeComponentReferenceCoverage(
  inventory,
  contracts,
  registry,
  scenarios,
  exactVariantEvidence = [],
) {
  const componentContracts = contractList(contracts);
  assert(Array.isArray(registry), "Component implementation registry must be an array.");
  assert(Array.isArray(scenarios), "Component runtime scenarios must be an array.");
  validateComponentReferenceInventory(inventory, componentContracts);
  const variantNormalization = validateVariantNormalizationPolicy(inventory);

  const contractById = new Map();
  const requiredScenarioIds = new Set();
  for (const contract of componentContracts) {
    assert(nonEmptyString(contract?.id), "Every component contract needs an id.");
    assert(!contractById.has(contract.id), `Duplicate component contract id: ${contract.id}.`);
    assert(Array.isArray(contract.required_states), `Component contract ${contract.id} required_states must be an array.`);
    contractById.set(contract.id, contract);
    for (const state of contract.required_states) {
      requiredScenarioIds.add(`${contract.id}.${state}`);
    }
  }

  const registryById = new Map();
  for (const entry of registry) {
    assert(nonEmptyString(entry?.contract_id), "Every component registry entry needs a contract_id.");
    assert(contractById.has(entry.contract_id), `Unknown component registry contract: ${entry.contract_id}.`);
    assert(!registryById.has(entry.contract_id), `Duplicate component registry contract: ${entry.contract_id}.`);
    assert(Array.isArray(entry.supported_states), `Component registry ${entry.contract_id} supported_states must be an array.`);
    const contractStates = new Set(contractById.get(entry.contract_id).required_states);
    const seenSupportedStates = new Set();
    for (const state of entry.supported_states) {
      assert(nonEmptyString(state), `Component registry ${entry.contract_id} has an invalid supported state.`);
      assert(!seenSupportedStates.has(state), `Component registry ${entry.contract_id} repeats supported state ${state}.`);
      assert(contractStates.has(state), `Component registry ${entry.contract_id} supports unknown state ${state}.`);
      seenSupportedStates.add(state);
    }
    registryById.set(entry.contract_id, entry);
  }

  const { seenIds: scenarioIds, verifiedIds } = verifiedScenarioIds(
    scenarios,
    requiredScenarioIds,
  );
  const implementedEntries = [...registryById.values()].filter(
    (entry) => entry.implementation_status === "implemented",
  );
  const implementedContractIds = new Set(
    implementedEntries.map((entry) => entry.contract_id),
  );
  const supportedScenarioIds = new Set(
    implementedEntries.flatMap((entry) =>
      entry.supported_states.map((state) => `${entry.contract_id}.${state}`),
    ),
  );
  const verifiedSupportedScenarioIds = new Set(
    [...supportedScenarioIds].filter((scenarioId) => verifiedIds.has(scenarioId)),
  );
  const fullyVerifiedContractIds = new Set(
    implementedEntries
      .filter(
        (entry) =>
          entry.supported_states.length > 0 &&
          entry.supported_states.every((state) =>
            verifiedSupportedScenarioIds.has(`${entry.contract_id}.${state}`),
          ),
      )
      .map((entry) => entry.contract_id),
  );
  const exactVariantEvidenceCoverage = validateExactVariantEvidence(
    exactVariantEvidence,
    inventory,
    contractById,
    verifiedSupportedScenarioIds,
  );

  const publicFamilies = inventory.families.filter((family) => family.visibility === "public");
  const hiddenFamilies = inventory.families.filter((family) => family.visibility === "hidden");
  const iconBearingFamilies = inventory.families.filter(iconBearingFamily);
  const mappedFamilies = inventory.families.filter(
    (family) => family.mapped_contract_ids.length > 0,
  );
  const missingContractFamiliesAtAudit = inventory.families.filter(
    (family) => family.audit_status === "missing_canonical_contract",
  );
  const consumerOwnedFamilies = inventory.families.filter(
    (family) => family.normalization_owner === "consumer",
  );
  const runtimeNotApplicableFamilies = inventory.families.filter(
    (family) => family.runtime_status === "not_applicable",
  );
  const runtimeMappedFamilies = inventory.families.filter((family) =>
    family.mapped_contract_ids.some((id) => implementedContractIds.has(id)),
  );
  const runtimeMappedFamilyCounts = countFamilies(runtimeMappedFamilies);

  const requiredStateCount = requiredScenarioIds.size;
  const supportedStateCount = supportedScenarioIds.size;
  const verifiedStateCount = verifiedSupportedScenarioIds.size;
  const runtimeStatus =
    implementedEntries.length === componentContracts.length &&
    verifiedStateCount === requiredStateCount
      ? "complete"
      : implementedEntries.length > 0 || supportedStateCount > 0
        ? "partial"
        : "none";

  return {
    inventory_id: inventory.inventory_id,
    accounting: {
      status: "complete",
      public: countFamilies(publicFamilies),
      hidden: countFamilies(hiddenFamilies),
      all: countFamilies(inventory.families),
      public_folders: new Set(publicFamilies.map((family) => family.folder)).size,
      standalone_icon_families: 0,
      icon_bearing: countFamilies(iconBearingFamilies),
    },
    normalization: {
      status:
        variantNormalization.documented.variants === inventory.totals.all.variants
          ? "complete"
          : "partial",
      families: {
        total: inventory.families.length,
        dispositioned: inventory.families.length,
      },
      variants: {
        total: inventory.totals.all.variants,
        semantically_normalized: variantNormalization.documented.variants,
        partially_documented:
          variantNormalization.partiallyDocumented.variants,
        not_documented: variantNormalization.undocumented.variants,
      },
      semantic_axes: {
        eligible: variantNormalization.axes.eligible,
        classified: variantNormalization.axes.classified,
      },
      metadata: {
        documented: variantNormalization.documented,
        partially_documented: variantNormalization.partiallyDocumented,
        not_documented: variantNormalization.undocumented,
      },
      by_kind: countByKind(inventory.families),
      mapped_to_contracts: countFamilies(mappedFamilies),
      missing_canonical_contract_at_audit: countFamilies(
        missingContractFamiliesAtAudit,
      ),
      consumer_owned: countFamilies(consumerOwnedFamilies),
      runtime_not_applicable: countFamilies(runtimeNotApplicableFamilies),
    },
    runtime: {
      status: runtimeStatus,
      contracts: {
        total: componentContracts.length,
        implemented: implementedEntries.length,
        not_implemented: componentContracts.length - implementedEntries.length,
        fully_verified: fullyVerifiedContractIds.size,
      },
      states: {
        total: requiredStateCount,
        supported: supportedStateCount,
        verified: verifiedStateCount,
        unverified_supported: supportedStateCount - verifiedStateCount,
        not_implemented: requiredStateCount - supportedStateCount,
      },
      scenarios: {
        records: scenarioIds.size,
        verified_records: verifiedIds.size,
        unverified_records: scenarioIds.size - verifiedIds.size,
        missing_required_records: requiredStateCount - scenarioIds.size,
      },
      reference_mapping: {
        mapped_to_implemented_contract: {
          families: runtimeMappedFamilyCounts.families,
          source_variants: runtimeMappedFamilyCounts.variants,
        },
        exact_variant_evidence: {
          records: exactVariantEvidenceCoverage.records,
          verified_records: exactVariantEvidenceCoverage.verifiedRecords,
          families: exactVariantEvidenceCoverage.verifiedFamilyIds.size,
          variants: exactVariantEvidenceCoverage.verifiedVariantKeys.size,
        },
      },
    },
  };
}
