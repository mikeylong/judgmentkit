const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function frozenRecord(value) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        Array.isArray(entry) ? Object.freeze([...entry]) : entry,
      ]),
    ),
  );
}

export const ARTIFACT_INSPECTOR_SCOPE_IDS = Object.freeze([
  "inspector_chrome",
  "inspection_overlay",
  "primary_artifact",
]);

export const ARTIFACT_INSPECTOR_STATE_GROUP_IDS = Object.freeze([
  "core",
  "consequential",
  "reusable_guidance",
  "automation",
]);

export const ARTIFACT_INSPECTOR_CANONICAL_SCOPES = Object.freeze([
  Object.freeze({
    scope_id: "inspector_chrome",
    root_selector: "[data-jk-scope='inspector-chrome']",
    authority: "judgmentkit_default",
    enforcement: "required",
    style_isolation: "required",
  }),
  Object.freeze({
    scope_id: "inspection_overlay",
    root_selector: "[data-jk-scope='inspection-overlay']",
    authority: "judgmentkit_default",
    enforcement: "required",
    style_isolation: "required",
  }),
  Object.freeze({
    scope_id: "primary_artifact",
    root_selector: "[data-artifact-root]",
    authority: "external_declared",
    enforcement: "external_not_reviewed",
    style_isolation: "required",
  }),
]);

export const ARTIFACT_INSPECTOR_CANONICAL_BOUNDARY_CONTRACTS = Object.freeze([
  Object.freeze({
    from_scope: "inspection_overlay",
    to_scope: "primary_artifact",
    allowed_roles: Object.freeze([
      "locus_target",
      "annotation_overlay",
      "connector_endpoint",
    ]),
    event_contract_required: true,
  }),
]);

export const ARTIFACT_INSPECTOR_CANONICAL_STATE_GROUPS = frozenRecord({
  core: [
    "artifact loading",
    "artifact ready",
    "artifact unavailable or failed",
    "no active locus",
    "locus focused or selected",
    "context loading",
    "context ready",
    "relation or action preview",
    "supported",
    "incompatible",
    "unavailable",
    "stale",
    "ambiguous",
    "blocked",
    "cancelled or Back",
    "local error and retry",
  ],
  consequential: [
    "no option preselected",
    "outcome pending",
    "committing",
    "commit succeeded",
    "known failure",
    "unknown result",
    "receipt reconciliation",
    "immutable receipt",
    "concurrent result",
    "superseding action when reversal is allowed",
  ],
  reusable_guidance: [
    "inactive draft after the current result exists",
    "correcting",
    "explicit confirmation with no default affirmative",
    "accepting",
    "accepted version",
    "declined or Back with no active guidance",
    "acceptance failure",
    "conflict",
    "supersession",
    "revocation",
  ],
  automation: [
    "match preflight",
    "exact match",
    "near or partial match",
    "automatic resolution pending",
    "automatic resolution complete",
    "inline causal receipt",
    "changed authority or evidence",
    "failed or uncertain automation",
    "exception returned to human review",
  ],
});

export const ARTIFACT_INSPECTOR_DIAGNOSTIC_CODES = Object.freeze([
  "JK_ARTIFACT_INSPECTOR_PRIMARY_ARTIFACT_MISSING",
  "JK_ARTIFACT_INSPECTOR_LOCUS_MODEL_MISSING",
  "JK_ARTIFACT_INSPECTOR_TOPOLOGY_CONTRACT_MISSING",
  "JK_ARTIFACT_INSPECTOR_TOPOLOGY_KIND_INVALID",
  "JK_ARTIFACT_INSPECTOR_WORK_UNIT_ID_MISSING",
  "JK_ARTIFACT_INSPECTOR_WORK_UNIT_CONTRACT_INVALID",
  "JK_ARTIFACT_INSPECTOR_ENTRY_REFERENCE_INVALID",
  "JK_ARTIFACT_INSPECTOR_COMPLETION_REFERENCE_INVALID",
  "JK_ARTIFACT_INSPECTOR_TRANSITION_REFERENCE_INVALID",
  "JK_ARTIFACT_INSPECTOR_RECOVERY_PATH_MISSING",
  "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
  "JK_ARTIFACT_INSPECTOR_ARTIFACT_NOT_DOMINANT",
  "JK_ARTIFACT_INSPECTOR_CONTEXT_DETACHED",
  "JK_ARTIFACT_INSPECTOR_DRAG_ONLY",
  "JK_ARTIFACT_INSPECTOR_LOCAL_FEEDBACK_MISSING",
  "JK_ARTIFACT_INSPECTOR_UNCOMMITTED_STATE_AMBIGUOUS",
  "JK_ARTIFACT_INSPECTOR_DEFAULT_COMMIT",
  "JK_ARTIFACT_INSPECTOR_RECEIPT_MISSING",
  "JK_ARTIFACT_INSPECTOR_GUIDANCE_COUPLED",
  "JK_ARTIFACT_INSPECTOR_MOBILE_ARTIFACT_OBSCURED",
  "JK_ARTIFACT_INSPECTOR_CHROME_SCOPE_MISSING",
  "JK_ARTIFACT_INSPECTOR_ARTIFACT_SCOPE_MISSING",
  "JK_ARTIFACT_INSPECTOR_SCOPE_OVERLAP",
  "JK_ARTIFACT_INSPECTOR_STYLE_LEAK",
  "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED",
  "JK_ARTIFACT_INSPECTOR_NATIVE_ACTION_INTERCEPTED",
  "JK_ARTIFACT_INSPECTOR_TARGET_DRIFT",
  "JK_ARTIFACT_INSPECTOR_ARTIFACT_MUTATED",
  "JK_ARTIFACT_INSPECTOR_EXTERNAL_AUTHORITY_OVERCLAIM",
  "JK_ARTIFACT_INSPECTOR_KEYWORD_ROUTING_CONFLICT",
  "JK_ARTIFACT_INSPECTOR_TRUSTED_RUNTIME_EVIDENCE_MISSING",
]);

const DIAGNOSTIC_DEFAULTS = Object.freeze({
  JK_ARTIFACT_INSPECTOR_PRIMARY_ARTIFACT_MISSING: Object.freeze({
    message: "No bounded rendered artifact is declared.",
    repair_instruction:
      "Declare one primary artifact scope with external visual authority.",
  }),
  JK_ARTIFACT_INSPECTOR_LOCUS_MODEL_MISSING: Object.freeze({
    message: "The participant cannot select a semantic artifact locus.",
    repair_instruction:
      "Expose stable semantic locus identifiers and equivalent pointer, touch, and keyboard paths.",
  }),
  JK_ARTIFACT_INSPECTOR_TOPOLOGY_CONTRACT_MISSING: Object.freeze({
    message:
      "The artifact-centered workflow has no explicit structured topology contract.",
    repair_instruction:
      "Provide workflow.topology as the explicit artifact_centered topology object instead of a compatibility string.",
  }),
  JK_ARTIFACT_INSPECTOR_TOPOLOGY_KIND_INVALID: Object.freeze({
    message: "The artifact-centered workflow declares an invalid topology kind.",
    repair_instruction:
      "Set workflow.topology.kind to artifact_centered and preserve the canonical topology fields.",
  }),
  JK_ARTIFACT_INSPECTOR_WORK_UNIT_ID_MISSING: Object.freeze({
    message: "A structured artifact work unit has no stable identifier.",
    repair_instruction:
      "Give every Artifact Inspector work unit its canonical stable id.",
  }),
  JK_ARTIFACT_INSPECTOR_WORK_UNIT_CONTRACT_INVALID: Object.freeze({
    message:
      "A required artifact work unit is duplicated or does not preserve its canonical participant intent or system responsibility.",
    repair_instruction:
      "Keep exactly one work unit per canonical id and restore it from the versioned Artifact Inspector registry definition.",
  }),
  JK_ARTIFACT_INSPECTOR_ENTRY_REFERENCE_INVALID: Object.freeze({
    message: "The topology entry does not reference a declared work unit.",
    repair_instruction:
      "Point entry_work_unit_id at the declared orient work unit.",
  }),
  JK_ARTIFACT_INSPECTOR_COMPLETION_REFERENCE_INVALID: Object.freeze({
    message: "Artifact-local completion does not reference declared work units.",
    repair_instruction:
      "Use only declared work-unit ids in completion_work_unit_ids and retain artifact-local completion.",
  }),
  JK_ARTIFACT_INSPECTOR_TRANSITION_REFERENCE_INVALID: Object.freeze({
    message: "A topology transition does not connect declared work units.",
    repair_instruction:
      "Make every transition from and to reference declared Artifact Inspector work-unit ids.",
  }),
  JK_ARTIFACT_INSPECTOR_RECOVERY_PATH_MISSING: Object.freeze({
    message: "The artifact workflow has no explicit connected recovery work unit.",
    repair_instruction:
      "Declare recover and connect both an inbound recovery transition and an outbound return to a safe work unit.",
  }),
  JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID: Object.freeze({
    message:
      "The artifact workflow does not declare the canonical active state groups.",
    repair_instruction:
      "Declare core and only the conditional groups activated by the activity, using the exact registry state sets.",
  }),
  JK_ARTIFACT_INSPECTOR_ARTIFACT_NOT_DOMINANT: Object.freeze({
    message: "Persistent chrome or supporting context visually displaces the artifact.",
    repair_instruction:
      "Keep the artifact as the largest persistent work region at wide and narrow viewports.",
  }),
  JK_ARTIFACT_INSPECTOR_CONTEXT_DETACHED: Object.freeze({
    message: "Supporting context has no visible or semantic relation to the active locus.",
    repair_instruction:
      "Attach evidence, authority, actions, and feedback to the active semantic locus.",
  }),
  JK_ARTIFACT_INSPECTOR_DRAG_ONLY: Object.freeze({
    message: "A required interaction has no tap, select, and keyboard alternative.",
    repair_instruction:
      "Provide equivalent pointer, touch, and keyboard interaction paths.",
  }),
  JK_ARTIFACT_INSPECTOR_LOCAL_FEEDBACK_MISSING: Object.freeze({
    message: "Validation or status appears away from the action that caused it.",
    repair_instruction:
      "Render feedback on or immediately beside the active artifact locus.",
  }),
  JK_ARTIFACT_INSPECTOR_UNCOMMITTED_STATE_AMBIGUOUS: Object.freeze({
    message: "Preview and committed state are not distinguishable.",
    repair_instruction:
      "Declare and render distinct preview, validation, commitment, result, and recovery states.",
  }),
  JK_ARTIFACT_INSPECTOR_DEFAULT_COMMIT: Object.freeze({
    message: "A consequential affirmative or outcome is preselected.",
    repair_instruction:
      "Remove the default affirmative and require an explicit commitment action.",
  }),
  JK_ARTIFACT_INSPECTOR_RECEIPT_MISSING: Object.freeze({
    message: "A consequential result has no inspectable local receipt.",
    repair_instruction:
      "Attach a durable receipt to the artifact locus after commitment.",
  }),
  JK_ARTIFACT_INSPECTOR_GUIDANCE_COUPLED: Object.freeze({
    message: "Current-item commitment and reusable-guidance acceptance occur in one action.",
    repair_instruction:
      "Separate the current result from reusable-guidance acceptance and its lifecycle.",
  }),
  JK_ARTIFACT_INSPECTOR_MOBILE_ARTIFACT_OBSCURED: Object.freeze({
    message: "Narrow-layout chrome covers the active locus or essential artifact content.",
    repair_instruction:
      "Move contextual chrome without obscuring the active locus at narrow widths.",
  }),
  JK_ARTIFACT_INSPECTOR_CHROME_SCOPE_MISSING: Object.freeze({
    message: "JudgmentKit-owned chrome has no enforceable design-system scope.",
    repair_instruction:
      "Declare canonical inspector_chrome and inspection_overlay scopes with required isolation.",
  }),
  JK_ARTIFACT_INSPECTOR_ARTIFACT_SCOPE_MISSING: Object.freeze({
    message: "The artifact's visual authority is undeclared.",
    repair_instruction:
      "Declare the canonical primary_artifact external scope and keep it external_not_reviewed.",
  }),
  JK_ARTIFACT_INSPECTOR_SCOPE_OVERLAP: Object.freeze({
    message: "Authority scopes overlap or duplicate an ownership claim.",
    repair_instruction:
      "Give every visible region one authority owner and use the declared overlay boundary only.",
  }),
  JK_ARTIFACT_INSPECTOR_STYLE_LEAK: Object.freeze({
    message: "Styles or tokens cross an authority boundary.",
    repair_instruction:
      "Isolate JudgmentKit chrome and overlay styles from external artifact styles in both directions.",
  }),
  JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED: Object.freeze({
    message: "Chrome interacts with an artifact locus without a semantic boundary contract.",
    repair_instruction:
      "Declare the overlay-to-artifact event contract and use semantic locus identifiers.",
  }),
  JK_ARTIFACT_INSPECTOR_NATIVE_ACTION_INTERCEPTED: Object.freeze({
    message: "Inspector behavior captures a live artifact action without explicit inspection mode.",
    repair_instruction:
      "Restore native interaction precedence until inspection mode is explicitly active.",
  }),
  JK_ARTIFACT_INSPECTOR_TARGET_DRIFT: Object.freeze({
    message: "An overlay silently moved to a different artifact target.",
    repair_instruction:
      "Re-anchor to the same semantic target or mark the target stale or unavailable.",
  }),
  JK_ARTIFACT_INSPECTOR_ARTIFACT_MUTATED: Object.freeze({
    message: "A chrome transition changed artifact content or presentation.",
    repair_instruction:
      "Preserve the artifact render fingerprint across every chrome-only transition.",
  }),
  JK_ARTIFACT_INSPECTOR_EXTERNAL_AUTHORITY_OVERCLAIM: Object.freeze({
    message: "The review describes the external artifact as JudgmentKit-conformant.",
    repair_instruction:
      "Report the external artifact as external_not_reviewed and state only which owned scopes passed.",
  }),
  JK_ARTIFACT_INSPECTOR_KEYWORD_ROUTING_CONFLICT: Object.freeze({
    message:
      "Artifact Inspector routing conflicts with mandatory activity evidence, exclusions, the selected surface, or the workflow profile.",
    repair_instruction:
      "Resolve routing from mandatory activity evidence, exclusions, and canonical surface and profile selections; do not let metadata override grounded evidence.",
  }),
  JK_ARTIFACT_INSPECTOR_TRUSTED_RUNTIME_EVIDENCE_MISSING: Object.freeze({
    message: "Trusted scope, preservation, and boundary runtime evidence is absent or incomplete.",
    repair_instruction:
      "Run the trusted browser review and supply separate scope, preservation, and boundary results.",
  }),
});

const DIAGNOSTIC_CODE_SET = new Set(ARTIFACT_INSPECTOR_DIAGNOSTIC_CODES);
const DIAGNOSTIC_ORDER = new Map(
  ARTIFACT_INSPECTOR_DIAGNOSTIC_CODES.map((code, index) => [code, index]),
);
const SCOPE_BY_ID = new Map(
  ARTIFACT_INSPECTOR_CANONICAL_SCOPES.map((scope) => [scope.scope_id, scope]),
);
const CANONICAL_BOUNDARY = ARTIFACT_INSPECTOR_CANONICAL_BOUNDARY_CONTRACTS[0];
const CANONICAL_BOUNDARY_ROLES = new Set(CANONICAL_BOUNDARY.allowed_roles);

function authorityError(message, details = {}) {
  const error = new TypeError(message);
  error.name = "ArtifactInspectorAuthorityError";
  error.code = "invalid_artifact_inspector_authority_contract";
  error.details = details;
  return error;
}

function requirePlainObject(value, field) {
  if (!isPlainObject(value)) {
    throw authorityError(`${field} must be an object.`, {
      field,
      observed: value,
    });
  }
}

function assertOnlyKeys(value, allowedKeys, field) {
  const unexpected = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (unexpected.length > 0) {
    throw authorityError(`${field} contains unsupported fields: ${unexpected.join(", ")}.`, {
      field,
      unexpected_fields: unexpected.sort(),
    });
  }
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw authorityError(`${field} must be a non-empty string.`, {
      field,
      observed: value,
    });
  }
  return value.trim();
}

function normalizeStringSet(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw authorityError(`${field} must be a non-empty array.`, {
      field,
      observed: value,
    });
  }

  const normalized = value.map((entry, index) =>
    requiredString(entry, `${field}[${index}]`),
  );
  if (new Set(normalized).size !== normalized.length) {
    throw authorityError(`${field} must not contain duplicates.`, {
      field,
      observed: normalized,
    });
  }
  return normalized;
}

function assertExactSet(actual, expected, field, diagnosticCode) {
  const actualSet = new Set(actual);
  const missing = expected.filter((entry) => !actualSet.has(entry));
  const unexpected = actual.filter((entry) => !expected.includes(entry));
  if (missing.length > 0 || unexpected.length > 0 || actual.length !== expected.length) {
    throw authorityError(`${field} does not match the canonical Artifact Inspector contract.`, {
      field,
      missing,
      unexpected,
      diagnostic_code: diagnosticCode,
    });
  }
}

function cloneStateGroups() {
  return Object.fromEntries(
    ARTIFACT_INSPECTOR_STATE_GROUP_IDS.map((groupId) => [
      groupId,
      [...ARTIFACT_INSPECTOR_CANONICAL_STATE_GROUPS[groupId]],
    ]),
  );
}

export function normalizeArtifactInspectorScopes(value, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw authorityError("design_system_scopes is required for Artifact Inspector.", {
        field: "design_system_scopes",
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_CHROME_SCOPE_MISSING",
      });
    }
    return [];
  }

  if (!Array.isArray(value)) {
    throw authorityError("design_system_scopes must be an array.", {
      field: "design_system_scopes",
      observed: value,
      diagnostic_code: "JK_ARTIFACT_INSPECTOR_CHROME_SCOPE_MISSING",
    });
  }

  const byId = new Map();
  for (const [index, entry] of value.entries()) {
    const field = `design_system_scopes[${index}]`;
    requirePlainObject(entry, field);
    assertOnlyKeys(
      entry,
      ["scope_id", "root_selector", "authority", "enforcement", "style_isolation"],
      field,
    );

    const scopeId = requiredString(entry.scope_id, `${field}.scope_id`);
    const canonical = SCOPE_BY_ID.get(scopeId);
    if (!canonical) {
      throw authorityError(`${field}.scope_id is not a canonical Artifact Inspector scope.`, {
        field: `${field}.scope_id`,
        observed: scopeId,
        expected: ARTIFACT_INSPECTOR_SCOPE_IDS,
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_SCOPE_OVERLAP",
      });
    }
    if (byId.has(scopeId)) {
      throw authorityError(`design_system_scopes declares ${scopeId} more than once.`, {
        field: "design_system_scopes",
        scope_id: scopeId,
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_SCOPE_OVERLAP",
      });
    }

    const normalized = {
      scope_id: scopeId,
      root_selector: requiredString(entry.root_selector, `${field}.root_selector`),
      authority: requiredString(entry.authority, `${field}.authority`),
      enforcement: requiredString(entry.enforcement, `${field}.enforcement`),
      style_isolation: requiredString(entry.style_isolation, `${field}.style_isolation`),
    };

    for (const key of ["root_selector", "authority", "enforcement", "style_isolation"]) {
      if (normalized[key] !== canonical[key]) {
        throw authorityError(`${field}.${key} conflicts with the canonical authority boundary.`, {
          field: `${field}.${key}`,
          scope_id: scopeId,
          expected: canonical[key],
          observed: normalized[key],
          diagnostic_code:
            scopeId === "primary_artifact"
              ? "JK_ARTIFACT_INSPECTOR_ARTIFACT_SCOPE_MISSING"
              : "JK_ARTIFACT_INSPECTOR_CHROME_SCOPE_MISSING",
        });
      }
    }
    byId.set(scopeId, normalized);
  }

  if (required) {
    const missing = ARTIFACT_INSPECTOR_SCOPE_IDS.filter((scopeId) => !byId.has(scopeId));
    if (missing.length > 0) {
      throw authorityError("Artifact Inspector requires all canonical authority scopes.", {
        field: "design_system_scopes",
        missing,
        diagnostic_code: missing.includes("primary_artifact")
          ? "JK_ARTIFACT_INSPECTOR_ARTIFACT_SCOPE_MISSING"
          : "JK_ARTIFACT_INSPECTOR_CHROME_SCOPE_MISSING",
      });
    }
  }

  return ARTIFACT_INSPECTOR_SCOPE_IDS.filter((scopeId) => byId.has(scopeId)).map(
    (scopeId) => byId.get(scopeId),
  );
}

export function normalizeArtifactInspectorBoundaryContracts(
  value,
  { scopes = [], required = false } = {},
) {
  if (value === undefined || value === null) {
    if (required) {
      throw authorityError("boundary_contracts is required for Artifact Inspector.", {
        field: "boundary_contracts",
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED",
      });
    }
    return [];
  }

  if (!Array.isArray(value)) {
    throw authorityError("boundary_contracts must be an array.", {
      field: "boundary_contracts",
      observed: value,
      diagnostic_code: "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED",
    });
  }
  if (required && value.length !== 1) {
    throw authorityError("Artifact Inspector requires exactly one canonical boundary contract.", {
      field: "boundary_contracts",
      observed_count: value.length,
      diagnostic_code: "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED",
    });
  }

  const knownScopes = new Set(scopes.map((scope) => scope.scope_id));
  const normalized = value.map((entry, index) => {
    const field = `boundary_contracts[${index}]`;
    requirePlainObject(entry, field);
    assertOnlyKeys(
      entry,
      ["from_scope", "to_scope", "allowed_roles", "event_contract_required"],
      field,
    );

    const fromScope = requiredString(entry.from_scope, `${field}.from_scope`);
    const toScope = requiredString(entry.to_scope, `${field}.to_scope`);
    if (
      fromScope !== CANONICAL_BOUNDARY.from_scope ||
      toScope !== CANONICAL_BOUNDARY.to_scope
    ) {
      throw authorityError(`${field} is not the canonical overlay-to-artifact boundary.`, {
        field,
        expected: {
          from_scope: CANONICAL_BOUNDARY.from_scope,
          to_scope: CANONICAL_BOUNDARY.to_scope,
        },
        observed: { from_scope: fromScope, to_scope: toScope },
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED",
      });
    }
    if (
      knownScopes.size > 0 &&
      (!knownScopes.has(fromScope) || !knownScopes.has(toScope))
    ) {
      throw authorityError(`${field} references an undeclared authority scope.`, {
        field,
        observed: { from_scope: fromScope, to_scope: toScope },
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED",
      });
    }

    const roles = normalizeStringSet(entry.allowed_roles, `${field}.allowed_roles`);
    const unsupportedRoles = roles.filter((role) => !CANONICAL_BOUNDARY_ROLES.has(role));
    if (unsupportedRoles.length > 0) {
      throw authorityError(`${field}.allowed_roles contains unsupported boundary roles.`, {
        field: `${field}.allowed_roles`,
        unexpected: unsupportedRoles,
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED",
      });
    }
    if (entry.event_contract_required !== true) {
      throw authorityError(`${field}.event_contract_required must be true.`, {
        field: `${field}.event_contract_required`,
        observed: entry.event_contract_required,
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED",
      });
    }

    return {
      from_scope: fromScope,
      to_scope: toScope,
      allowed_roles: CANONICAL_BOUNDARY.allowed_roles.filter((role) => roles.includes(role)),
      event_contract_required: true,
    };
  });

  const identities = normalized.map(
    (entry) => `${entry.from_scope}->${entry.to_scope}`,
  );
  if (new Set(identities).size !== identities.length) {
    throw authorityError("boundary_contracts contains a duplicate authority boundary.", {
      field: "boundary_contracts",
      diagnostic_code: "JK_ARTIFACT_INSPECTOR_SCOPE_OVERLAP",
    });
  }

  return normalized;
}

function normalizeArtifactInspectorStateConfigUnchecked(
  value,
  { required = false } = {},
) {
  if (value === undefined || value === null) {
    if (required) {
      throw authorityError("Artifact Inspector state configuration is required.", {
        field: "artifact_inspector.state_groups",
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
      });
    }
    return null;
  }

  requirePlainObject(value, "artifact_inspector.state_config");
  assertOnlyKeys(
    value,
    ["active_state_groups", "state_groups"],
    "artifact_inspector.state_config",
  );

  const activeStateGroups = normalizeStringSet(
    value.active_state_groups,
    "artifact_inspector.active_state_groups",
  );
  const unexpectedActiveGroups = activeStateGroups.filter(
    (groupId) => !ARTIFACT_INSPECTOR_STATE_GROUP_IDS.includes(groupId),
  );
  if (unexpectedActiveGroups.length > 0 || !activeStateGroups.includes("core")) {
    throw authorityError(
      "active_state_groups must contain core and only canonical conditional groups.",
      {
        field: "artifact_inspector.active_state_groups",
        unexpected: unexpectedActiveGroups,
        missing: activeStateGroups.includes("core") ? [] : ["core"],
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
      },
    );
  }

  requirePlainObject(value.state_groups, "artifact_inspector.state_groups");
  assertOnlyKeys(
    value.state_groups,
    ARTIFACT_INSPECTOR_STATE_GROUP_IDS,
    "artifact_inspector.state_groups",
  );
  for (const groupId of ARTIFACT_INSPECTOR_STATE_GROUP_IDS) {
    const states = normalizeStringSet(
      value.state_groups[groupId],
      `artifact_inspector.state_groups.${groupId}`,
    );
    assertExactSet(
      states,
      ARTIFACT_INSPECTOR_CANONICAL_STATE_GROUPS[groupId],
      `artifact_inspector.state_groups.${groupId}`,
      "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
    );
  }

  return {
    active_state_groups: ARTIFACT_INSPECTOR_STATE_GROUP_IDS.filter((groupId) =>
      activeStateGroups.includes(groupId),
    ),
    state_groups: cloneStateGroups(),
  };
}

export function normalizeArtifactInspectorStateConfig(value, options = {}) {
  try {
    return normalizeArtifactInspectorStateConfigUnchecked(value, options);
  } catch (error) {
    if (error?.code === "invalid_artifact_inspector_authority_contract") {
      error.details = {
        ...(isPlainObject(error.details) ? error.details : {}),
        diagnostic_code:
          "JK_ARTIFACT_INSPECTOR_STATE_GROUP_CONTRACT_INVALID",
      };
    }
    throw error;
  }
}

function normalizeArtifactInspectorContract(value) {
  requirePlainObject(value, "artifact_inspector");
  assertOnlyKeys(
    value,
    [
      "registry_id",
      "registry_version",
      "surface_type",
      "workflow_profile",
      "frontend_surface_profile",
      "topology_kind",
      "active_state_groups",
      "state_groups",
      "trusted_runtime_evidence_required",
      "external_artifact_review_status",
    ],
    "artifact_inspector",
  );

  const expected = {
    registry_id: "artifact_inspector",
    registry_version: "1.0.0",
    surface_type: "artifact_inspector",
    workflow_profile: "artifact-inspector-ui",
    frontend_surface_profile: "judgmentkit.artifact-inspector.v1",
    topology_kind: "artifact_centered",
  };
  for (const [field, expectedValue] of Object.entries(expected)) {
    const observed = requiredString(value[field], `artifact_inspector.${field}`);
    if (observed !== expectedValue) {
      throw authorityError(`artifact_inspector.${field} is not canonical.`, {
        field: `artifact_inspector.${field}`,
        expected: expectedValue,
        observed,
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_PRIMARY_ARTIFACT_MISSING",
      });
    }
  }
  if (value.trusted_runtime_evidence_required !== true) {
    throw authorityError(
      "artifact_inspector.trusted_runtime_evidence_required must be true.",
      {
        field: "artifact_inspector.trusted_runtime_evidence_required",
        observed: value.trusted_runtime_evidence_required,
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_TRUSTED_RUNTIME_EVIDENCE_MISSING",
      },
    );
  }
  if (value.external_artifact_review_status !== "external_not_reviewed") {
    throw authorityError(
      "artifact_inspector.external_artifact_review_status must remain external_not_reviewed.",
      {
        field: "artifact_inspector.external_artifact_review_status",
        expected: "external_not_reviewed",
        observed: value.external_artifact_review_status,
        diagnostic_code: "JK_ARTIFACT_INSPECTOR_EXTERNAL_AUTHORITY_OVERCLAIM",
      },
    );
  }

  const stateConfig = normalizeArtifactInspectorStateConfig(
    {
      active_state_groups: value.active_state_groups,
      state_groups: value.state_groups,
    },
    { required: true },
  );

  return {
    ...expected,
    ...stateConfig,
    trusted_runtime_evidence_required: true,
    external_artifact_review_status: "external_not_reviewed",
  };
}

export function validateArtifactInspectorAuthorityContract(
  implementationContract = {},
) {
  requirePlainObject(implementationContract, "implementation_contract");
  const hasScopes = hasOwn(implementationContract, "design_system_scopes");
  const hasBoundaries = hasOwn(implementationContract, "boundary_contracts");
  const hasArtifactInspector = hasOwn(implementationContract, "artifact_inspector");

  if (!hasScopes && !hasBoundaries && !hasArtifactInspector) {
    return {
      active: false,
      design_system_scopes: [],
      boundary_contracts: [],
      artifact_inspector: null,
    };
  }

  if (!hasScopes || !hasBoundaries || !hasArtifactInspector) {
    throw authorityError(
      "Artifact Inspector authority is partial; scopes, boundaries, and artifact_inspector are all required when any one is declared.",
      {
        field: "implementation_contract",
        missing: [
          ...(hasScopes ? [] : ["design_system_scopes"]),
          ...(hasBoundaries ? [] : ["boundary_contracts"]),
          ...(hasArtifactInspector ? [] : ["artifact_inspector"]),
        ],
        diagnostic_code: !hasScopes
          ? "JK_ARTIFACT_INSPECTOR_CHROME_SCOPE_MISSING"
          : !hasBoundaries
            ? "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED"
            : "JK_ARTIFACT_INSPECTOR_PRIMARY_ARTIFACT_MISSING",
      },
    );
  }

  const designSystemScopes = normalizeArtifactInspectorScopes(
    implementationContract.design_system_scopes,
    { required: true },
  );
  const boundaryContracts = normalizeArtifactInspectorBoundaryContracts(
    implementationContract.boundary_contracts,
    { scopes: designSystemScopes, required: true },
  );
  const artifactInspector = normalizeArtifactInspectorContract(
    implementationContract.artifact_inspector,
  );

  return {
    active: true,
    design_system_scopes: designSystemScopes,
    boundary_contracts: boundaryContracts,
    artifact_inspector: artifactInspector,
  };
}

export function createArtifactInspectorFinding({
  code,
  severity = "fail",
  check = "artifact_inspector_authority",
  message,
  evidence = {},
  repair_instruction,
}) {
  if (!DIAGNOSTIC_CODE_SET.has(code)) {
    throw authorityError(`Unknown Artifact Inspector diagnostic code: ${code}.`, {
      field: "finding.code",
      observed: code,
    });
  }
  if (!["fail", "warn"].includes(severity)) {
    throw authorityError("Artifact Inspector finding severity must be fail or warn.", {
      field: "finding.severity",
      observed: severity,
    });
  }
  if (!isPlainObject(evidence)) {
    throw authorityError("Artifact Inspector finding evidence must be an object.", {
      field: "finding.evidence",
      observed: evidence,
    });
  }

  const defaults = DIAGNOSTIC_DEFAULTS[code];
  return {
    severity,
    check: requiredString(check, "finding.check"),
    code,
    message: message ? requiredString(message, "finding.message") : defaults.message,
    evidence: { ...evidence },
    repair_instruction: repair_instruction
      ? requiredString(repair_instruction, "finding.repair_instruction")
      : defaults.repair_instruction,
  };
}

function stableFindings(findings) {
  return [...findings].sort((left, right) => {
    const codeOrder =
      (DIAGNOSTIC_ORDER.get(left.code) ?? Number.MAX_SAFE_INTEGER) -
      (DIAGNOSTIC_ORDER.get(right.code) ?? Number.MAX_SAFE_INTEGER);
    if (codeOrder !== 0) return codeOrder;
    const checkOrder = left.check.localeCompare(right.check);
    if (checkOrder !== 0) return checkOrder;
    return left.message.localeCompare(right.message);
  });
}

function runtimeStatus(value) {
  const status = typeof value === "string" ? value : value?.status;
  if (status === "pass" || status === "passed") return "pass";
  if (status === "fail" || status === "failed") return "fail";
  if (status === "review_required") return "review_required";
  if (status === "external_not_reviewed") return "external_not_reviewed";
  return null;
}

function boundaryEvidence(receipt) {
  if (!Array.isArray(receipt?.boundary_results)) return null;
  return (
    receipt.boundary_results.find(
      (entry) =>
        isPlainObject(entry) &&
        entry.from_scope === CANONICAL_BOUNDARY.from_scope &&
        entry.to_scope === CANONICAL_BOUNDARY.to_scope,
    ) ?? null
  );
}

function missingRuntimeFinding(evidence = {}) {
  return createArtifactInspectorFinding({
    code: "JK_ARTIFACT_INSPECTOR_TRUSTED_RUNTIME_EVIDENCE_MISSING",
    evidence,
  });
}

function baseDesignSystemReview() {
  return {
    inspector_chrome: "review_required",
    inspection_overlay: "review_required",
    primary_artifact: "external_not_reviewed",
    boundary_contract: "review_required",
  };
}

// Internal evaluator: callers cannot obtain the private, candidate-bound runtime
// receipt used by the public implementation-review entrypoints. Do not re-export
// this function from the package root.
export function reviewArtifactInspectorAuthorityEvidence(
  implementationContract = {},
  { trustedRuntimeEvidence = null } = {},
) {
  let authorityContract;
  try {
    authorityContract = validateArtifactInspectorAuthorityContract(
      implementationContract,
    );
  } catch (error) {
    const code = DIAGNOSTIC_CODE_SET.has(error?.details?.diagnostic_code)
      ? error.details.diagnostic_code
      : "JK_ARTIFACT_INSPECTOR_TRUSTED_RUNTIME_EVIDENCE_MISSING";
    return {
      status: "fail",
      applicable: true,
      design_system_review: baseDesignSystemReview(),
      trusted_runtime_evidence: {
        status: "not_evaluated",
      },
      findings: [
        createArtifactInspectorFinding({
          code,
          message: error instanceof Error ? error.message : undefined,
          evidence: isPlainObject(error?.details) ? error.details : {},
        }),
      ],
    };
  }

  if (!authorityContract.active) {
    return {
      status: "not_applicable",
      applicable: false,
      design_system_review: {},
      trusted_runtime_evidence: {
        status: "not_required",
      },
      findings: [],
    };
  }

  const designSystemReview = baseDesignSystemReview();
  if (!isPlainObject(trustedRuntimeEvidence)) {
    return {
      status: "review_required",
      applicable: true,
      design_system_review: designSystemReview,
      trusted_runtime_evidence: {
        status: "missing",
      },
      findings: stableFindings([
        missingRuntimeFinding({
          required_source: "judgmentkit_browser_runtime",
          candidate_authored_evidence_accepted: false,
        }),
      ]),
    };
  }

  const findings = [];
  let failed = false;
  let incomplete = false;
  const issuer =
    typeof trustedRuntimeEvidence.issuer === "string"
      ? trustedRuntimeEvidence.issuer.trim()
      : "";
  if (issuer !== "judgmentkit_browser_runtime") {
    incomplete = true;
    findings.push(
      missingRuntimeFinding({
        field: "trusted_runtime_evidence.issuer",
        expected: "judgmentkit_browser_runtime",
        observed: issuer || null,
      }),
    );
  }

  const receiptStatus = runtimeStatus(trustedRuntimeEvidence.status);
  if (receiptStatus === "fail") failed = true;
  else if (receiptStatus !== "pass") incomplete = true;

  const scopeResults = isPlainObject(trustedRuntimeEvidence.scope_results)
    ? trustedRuntimeEvidence.scope_results
    : {};
  for (const scopeId of ["inspector_chrome", "inspection_overlay"]) {
    const status = runtimeStatus(scopeResults[scopeId]);
    if (status === "pass") {
      designSystemReview[scopeId] = "passed";
    } else if (status === "fail") {
      designSystemReview[scopeId] = "failed";
      failed = true;
      findings.push(
        createArtifactInspectorFinding({
          code: "JK_ARTIFACT_INSPECTOR_STYLE_LEAK",
          evidence: {
            field: `trusted_runtime_evidence.scope_results.${scopeId}`,
            observed: scopeResults[scopeId],
          },
        }),
      );
    } else {
      incomplete = true;
      findings.push(
        missingRuntimeFinding({
          field: `trusted_runtime_evidence.scope_results.${scopeId}`,
          expected: "pass",
          observed: status,
        }),
      );
    }
  }

  const artifactResult = scopeResults.primary_artifact;
  const artifactStatus = runtimeStatus(artifactResult);
  if (artifactStatus === "pass") {
    failed = true;
    designSystemReview.primary_artifact = "failed_external_authority_overclaim";
    findings.push(
      createArtifactInspectorFinding({
        code: "JK_ARTIFACT_INSPECTOR_EXTERNAL_AUTHORITY_OVERCLAIM",
        evidence: {
          field: "trusted_runtime_evidence.scope_results.primary_artifact.status",
          expected: "external_not_reviewed",
          observed: "pass",
        },
      }),
    );
  } else if (artifactStatus !== "external_not_reviewed") {
    incomplete = true;
    findings.push(
      missingRuntimeFinding({
        field: "trusted_runtime_evidence.scope_results.primary_artifact.status",
        expected: "external_not_reviewed",
        observed: artifactStatus,
      }),
    );
  }

  const preservationStatus = runtimeStatus(
    isPlainObject(artifactResult)
      ? artifactResult.artifact_preservation ?? artifactResult.preservation_status
      : null,
  );
  if (preservationStatus === "fail") {
    failed = true;
    findings.push(
      createArtifactInspectorFinding({
        code: "JK_ARTIFACT_INSPECTOR_ARTIFACT_MUTATED",
        evidence: {
          field:
            "trusted_runtime_evidence.scope_results.primary_artifact.artifact_preservation",
          observed: artifactResult,
        },
      }),
    );
  } else if (preservationStatus !== "pass") {
    incomplete = true;
    findings.push(
      missingRuntimeFinding({
        field:
          "trusted_runtime_evidence.scope_results.primary_artifact.artifact_preservation",
        expected: "pass",
        observed: preservationStatus,
      }),
    );
  }

  const boundaryResult = boundaryEvidence(trustedRuntimeEvidence);
  const boundaryStatus = runtimeStatus(boundaryResult);
  if (boundaryStatus === "pass") {
    designSystemReview.boundary_contract = "passed";
  } else if (boundaryStatus === "fail") {
    failed = true;
    designSystemReview.boundary_contract = "failed";
    findings.push(
      createArtifactInspectorFinding({
        code: "JK_ARTIFACT_INSPECTOR_BOUNDARY_EVENT_UNDECLARED",
        evidence: {
          field: "trusted_runtime_evidence.boundary_results",
          observed: boundaryResult,
        },
      }),
    );
  } else {
    incomplete = true;
    findings.push(
      missingRuntimeFinding({
        field: "trusted_runtime_evidence.boundary_results",
        expected: {
          from_scope: CANONICAL_BOUNDARY.from_scope,
          to_scope: CANONICAL_BOUNDARY.to_scope,
          status: "pass",
        },
        observed: boundaryResult,
      }),
    );
  }

  if (Array.isArray(trustedRuntimeEvidence.diagnostics)) {
    for (const diagnostic of trustedRuntimeEvidence.diagnostics) {
      const reportedCode = isPlainObject(diagnostic) ? diagnostic.code : null;
      if (DIAGNOSTIC_CODE_SET.has(reportedCode)) {
        failed = true;
        findings.push(
          createArtifactInspectorFinding({
            code: reportedCode,
            message:
              isPlainObject(diagnostic) && typeof diagnostic.message === "string"
                ? diagnostic.message
                : undefined,
            evidence: {
              field: "trusted_runtime_evidence.diagnostics",
              diagnostic,
            },
          }),
        );
      } else {
        incomplete = true;
        findings.push(
          missingRuntimeFinding({
            field: "trusted_runtime_evidence.diagnostics",
            reported_code: reportedCode,
          }),
        );
      }
    }
  }

  if (failed && findings.length === 0) {
    findings.push(
      missingRuntimeFinding({
        field: "trusted_runtime_evidence.status",
        observed: trustedRuntimeEvidence.status,
      }),
    );
  }

  const status = failed
    ? "fail"
    : incomplete
      ? "review_required"
      : "passed_with_external_artifact_authority";

  return {
    status,
    applicable: true,
    design_system_review: designSystemReview,
    trusted_runtime_evidence: {
      status:
        status === "passed_with_external_artifact_authority"
          ? "passed"
          : failed
            ? "failed"
            : "incomplete",
      issuer: issuer || null,
      artifact_preservation:
        preservationStatus === "pass"
          ? "passed"
          : preservationStatus === "fail"
            ? "failed"
            : "review_required",
    },
    findings: stableFindings(findings),
  };
}
