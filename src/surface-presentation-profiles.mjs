export const WORKBENCH_SURFACE_PROFILE_ID =
  "judgmentkit.workbench.operational-v1";
export const ARTIFACT_INSPECTOR_SURFACE_PROFILE_ID =
  "judgmentkit.artifact-inspector.v1";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

function clone(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => clone(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, clone(nested)]),
    );
  }

  return value;
}

export const WORKBENCH_SURFACE_PROFILE = deepFreeze({
  id: WORKBENCH_SURFACE_PROFILE_ID,
  version: "1.0.0",
  status: "supported",
  name: "JudgmentKit Workbench Operational",
  surface_type: "workbench",
  purpose:
    "Give grounded Workbench activities a quiet, compact, evidence-adjacent presentation without changing the Workbench activity contract.",
  authority: {
    mode: "judgmentkit_default_surface_profile",
    public_contract: true,
    runtime_renderer: false,
    design_system_source_mode: "judgmentkit_default",
    design_system_source_id: "judgmentkit.design-system.source-v1",
    visual_token_adapter_id: "judgmentkit.visual-token-adapter.boundary-v1",
    pattern_contract_id: "workbench",
  },
  activation: {
    default_request: "auto",
    accepted_requests: [
      "auto",
      "none",
      WORKBENCH_SURFACE_PROFILE_ID,
    ],
    accepted_confidence: ["medium", "high", "provided"],
    explicit_profile_request_requires_grounded_surface: true,
    low_confidence_neutral_fallback: "do_not_activate",
    external_design_system_fallback: "none",
  },
  appearance: {
    supported_modes: ["light", "dark", "system"],
    default_mode: "system",
    visible_toggle_default: false,
    token_source:
      "implementation_contract.visual_token_adapter.appearance_token_sets",
    extension_token_source:
      "selected_surface_profile.typography.css_custom_properties and selected_surface_profile.density.css_custom_properties",
  },
  typography: {
    font_source: "implementation_contract.visual_token_adapter.font_roles",
    font_roles: ["body", "heading", "label", "numeric"],
    css_custom_properties: [
      {
        name: "--jk-type-family-body",
        value:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        usage: "body, heading, label, and control text",
      },
      {
        name: "--jk-type-family-numeric",
        value:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        usage: "tabular identifiers, counts, dates, and metadata",
      },
      {
        name: "--jk-type-size-title",
        value: "1.5rem",
        usage: "workbench page or decision title",
      },
      {
        name: "--jk-type-size-section",
        value: "1rem",
        usage: "workbench region heading",
      },
      {
        name: "--jk-type-size-body",
        value: "0.875rem",
        usage: "dense operational body text",
      },
      {
        name: "--jk-type-size-label",
        value: "0.75rem",
        usage: "metadata and compact control label",
      },
      {
        name: "--jk-type-size-meta",
        value: "0.6875rem",
        usage: "dense identifiers, counts, timestamps, and region indexes",
      },
      {
        name: "--jk-type-line-body",
        value: "1.45",
        usage: "dense operational body line height",
      },
      {
        name: "--jk-type-line-tight",
        value: "1.2",
        usage: "workbench headings and compact labels",
      },
    ],
  },
  density: {
    css_custom_properties: [
      {
        name: "--jk-density-panel-padding",
        value: "1rem",
        usage: "desktop work-region inset",
      },
      {
        name: "--jk-density-row-padding",
        value: "0.75rem",
        usage: "queue, evidence, and decision row inset",
      },
      {
        name: "--jk-density-control-height",
        value: "2.5rem",
        usage: "compact desktop controls",
      },
      {
        name: "--jk-density-icon-size",
        value: "1rem",
        usage: "inline status and action icons",
      },
      {
        name: "--jk-density-shell-gap",
        value: "0.75rem",
        usage: "space between coordinated work regions",
      },
      {
        name: "--jk-workbench-max-width",
        value: "96rem",
        usage: "maximum operational workspace width",
      },
      {
        name: "--jk-workbench-control-border",
        value:
          "color-mix(in srgb, var(--jk-color-muted) 72%, var(--jk-color-surface))",
        usage:
          "control boundaries derived from canonical appearance tokens with non-text contrast",
      },
    ],
  },
  composition: {
    density: "operational",
    hierarchy: "flat_border_led",
    navigation_shapes: [
      "master-detail",
      "split workspace",
      "queue-detail flow",
    ],
    rules: [
      "Keep the selected work item, its evidence, the bounded decision, and completion state adjacent.",
      "Use one visually primary action per decision context.",
      "Pair status color and iconography with a visible label and plain-language reason.",
      "Prefer dividers and bounded regions over nested decorative cards or elevation.",
      "Keep diagnostics secondary unless source inspection is the activity.",
    ],
  },
  state_coverage: [
    "loading",
    "empty queue",
    "selected item",
    "decision pending",
    "completed handoff",
    "disabled with reason",
    "error",
    "focus-visible",
  ],
  responsive: {
    desktop:
      "Keep queue, detail evidence, and decision or handoff context visible in a stable operational workspace.",
    compact:
      "Provide an explicit, reversible path between list, detail, decision, and completion without horizontal overflow.",
    required_evidence: [
      "desktop viewport",
      "mobile viewport",
      "keyboard focus order",
      "responsive no overflow",
    ],
  },
  product_adapter_boundary: {
    generic_profile_owns: [
      "density",
      "type hierarchy",
      "region hierarchy",
      "status treatment",
      "action emphasis",
      "responsive workbench transitions",
    ],
    product_adapter_owns: [
      "domain vocabulary",
      "domain-specific components",
      "graph or spatial visualization",
      "product-specific geometry",
      "runtime state and authorization truth",
    ],
    excluded_from_generic_profile: [
      "consumer-specific vocabulary",
      "consumer-specific workflow topology or graph layout",
      "consumer-specific geometry",
      "spatial renderer selection",
    ],
  },
  evidence_expectations: [
    "Name this profile id and the selected Workbench surface type.",
    "Prove canonical JudgmentKit light and dark token inheritance.",
    "Show queue, detail, evidence, decision or handoff, and completion behavior.",
    "Verify selected, disabled, error, completed, and focus-visible states.",
    "Verify desktop and mobile reflow, keyboard order, overflow, and forced-colors behavior.",
  ],
  provenance: {
    decision_id: "ADR-0001",
    reference_specimen_id:
      "judgmentkit.workbench-surface-variant.specimen-v1",
    promotion_status: "supported",
    runtime_evidence_policy: "required_per_consumer",
  },
});

export const ARTIFACT_INSPECTOR_SURFACE_PROFILE = deepFreeze({
  id: ARTIFACT_INSPECTOR_SURFACE_PROFILE_ID,
  version: "1.0.0",
  status: "proposed",
  name: "JudgmentKit Artifact Inspector",
  surface_type: "artifact_inspector",
  workflow_profile_id: "artifact-inspector-ui",
  interaction_topology_kind: "artifact_centered",
  purpose:
    "Keep one rendered artifact primary while JudgmentKit-owned chrome and overlays attach context, actions, state, and receipts to a selected artifact locus.",
  authority: {
    mode: "scoped_mixed_visual_authority",
    public_contract: true,
    runtime_renderer: false,
    design_system_source_mode: "judgmentkit_default",
    design_system_source_id: "judgmentkit.design-system.source-v1",
    visual_token_adapter_id: "judgmentkit.visual-token-adapter.boundary-v1",
    pattern_contract_id: "artifact-inspector",
    design_system_scopes: [
      {
        scope_id: "inspector_chrome",
        root_selector: "[data-jk-scope='inspector-chrome']",
        authority: "judgmentkit_default",
        enforcement: "required",
        style_isolation: "required",
      },
      {
        scope_id: "inspection_overlay",
        root_selector: "[data-jk-scope='inspection-overlay']",
        authority: "judgmentkit_default",
        enforcement: "required",
        style_isolation: "required",
      },
      {
        scope_id: "primary_artifact",
        root_selector: "[data-artifact-root]",
        authority: "external_declared",
        enforcement: "external_not_reviewed",
        style_isolation: "required",
      },
    ],
    boundary_contracts: [
      {
        from_scope: "inspection_overlay",
        to_scope: "primary_artifact",
        allowed_roles: [
          "locus_target",
          "annotation_overlay",
          "connector_endpoint",
        ],
        event_contract_required: true,
      },
    ],
    review_result_policy:
      "Report chrome, overlay, external artifact, and boundary results separately; never describe the external artifact as JudgmentKit-conformant.",
  },
  activation: {
    default_request: "auto",
    accepted_requests: [
      "auto",
      "none",
      ARTIFACT_INSPECTOR_SURFACE_PROFILE_ID,
    ],
    accepted_confidence: ["medium", "high", "provided"],
    explicit_profile_request_requires_grounded_surface: true,
    low_confidence_neutral_fallback: "do_not_activate",
    external_artifact_authority: "allowed_when_scoped",
    whole_candidate_external_design_system_fallback: "none",
  },
  appearance: {
    supported_modes: ["light", "dark", "system"],
    default_mode: "system",
    visible_toggle_default: false,
    token_source:
      "implementation_contract.visual_token_adapter.appearance_token_sets",
    scope_rule:
      "JudgmentKit appearance tokens apply only to inspector_chrome and inspection_overlay.",
  },
  typography: {
    font_source: "implementation_contract.visual_token_adapter.font_roles",
    font_roles: ["body", "heading", "label", "numeric"],
    css_custom_properties: [
      {
        name: "--jk-artifact-inspector-type-body",
        value: "0.875rem",
        usage: "restrained inspector context and local feedback",
      },
      {
        name: "--jk-artifact-inspector-type-label",
        value: "0.75rem",
        usage: "sparse locus, authority, state, and receipt labels",
      },
    ],
  },
  density: {
    css_custom_properties: [
      {
        name: "--jk-artifact-inspector-chrome-gap",
        value: "0.75rem",
        usage: "space between the artifact boundary and contextual chrome",
      },
      {
        name: "--jk-artifact-inspector-target-size",
        value: "2.75rem",
        usage: "minimum JudgmentKit-owned locus and action target size",
      },
      {
        name: "--jk-artifact-inspector-overlay-offset",
        value: "0.5rem",
        usage: "minimum offset for overlay feedback from essential artifact content",
      },
    ],
  },
  composition: {
    density: "artifact-first contextual",
    hierarchy: "artifact_dominant",
    navigation_shape:
      "artifact persistent; supporting context revealed from the active locus",
    allowed_variants: [
      "peripheral anchors",
      "contextual tray",
      "inline annotation",
      "inspection lens",
      "responsive hybrid",
    ],
    rules: [
      "Keep the artifact as the largest and most persistent visual region.",
      "Keep the active locus visible while its supporting context is open.",
      "Attach evidence, authority, actions, feedback, and receipts visibly or semantically to the active locus.",
      "Distinguish reversible preview from consequential commitment and durable result.",
      "Keep JudgmentKit-owned overlay marks distinguishable from artifact content.",
      "Use the least persistent chrome that preserves target, context, action, recovery, and result together.",
    ],
    avoid_by_default: [
      "master-detail",
      "queue-detail",
      "dashboard summaries",
      "persistent evidence dossiers",
      "stacked labeled panels",
      "form-like step progression",
      "chat composer or message history",
      "drag-only, hover-only, or color-only interaction",
    ],
  },
  state_coverage: [
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
  responsive: {
    wide:
      "Keep the artifact central and persistent, reveal sparse support at the periphery or from the active locus, and route connectors around the inspected locus and essential content.",
    narrow:
      "Keep the artifact primary, move support into a temporary edge affordance or contextual tray, and preserve the active locus, feedback, recovery, zoom, reflow, and non-drag alternatives together without obstruction.",
    invariant:
      "Wide and narrow placements use the same state machine, actions, completion, and recovery semantics.",
    required_evidence: [
      "wide viewport",
      "narrow viewport",
      "pointer path",
      "touch path without hover",
      "keyboard path",
      "focus order and focus return",
      "responsive no obstruction",
      "zoom and reflow",
    ],
  },
  component_roles: [
    { id: "ArtifactViewport", scope_id: "inspector_chrome" },
    { id: "ArtifactBoundary", scope_id: "inspector_chrome" },
    { id: "ArtifactStatus", scope_id: "inspector_chrome" },
    { id: "ObservationMarker", scope_id: "inspection_overlay" },
    { id: "LocusSelection", scope_id: "inspection_overlay" },
    { id: "ContextAnchor", scope_id: "inspection_overlay" },
    { id: "AuthorityAnchor", scope_id: "inspection_overlay" },
    { id: "AnchorRail", scope_id: "inspector_chrome" },
    { id: "RelationPreview", scope_id: "inspection_overlay" },
    { id: "RelationConnector", scope_id: "inspection_overlay" },
    { id: "InlineReason", scope_id: "inspection_overlay" },
    { id: "ContextTray", scope_id: "inspector_chrome" },
    { id: "CommitBoundary", scope_id: "inspector_chrome" },
    { id: "ReceiptMarker", scope_id: "inspection_overlay" },
    { id: "BackAction", scope_id: "inspector_chrome" },
    { id: "ResetAction", scope_id: "inspector_chrome" },
    {
      id: "ZoomAndPanControls",
      scope_id: "inspector_chrome",
      conditional: "artifact_requires_zoom_or_pan",
    },
  ],
  product_adapter_boundary: {
    generic_profile_owns: [
      "inspector chrome density and hierarchy",
      "selection and overlay state treatment",
      "context, action, recovery, and receipt relationships",
      "responsive artifact-inspection transitions",
      "cross-boundary focus and announcement contract",
    ],
    external_artifact_authority_owns: [
      "artifact typography",
      "artifact components",
      "artifact color and elevation",
      "artifact internal layout",
      "artifact internal semantics and controls",
    ],
    boundary_contract_owns: [
      "semantic locus identifiers",
      "artifact target geometry",
      "cross-boundary event precedence",
      "overlay obstruction and target drift",
      "focus order and focus return",
    ],
    excluded_from_generic_profile: [
      "artifact restyling",
      "visual inference presented as artifact truth",
      "silent interception of native artifact actions",
      "whole-candidate JudgmentKit conformance claims",
    ],
  },
  evidence_expectations: [
    "Name this profile id, artifact_inspector surface type, artifact-inspector-ui workflow profile, and artifact_centered topology.",
    "Provide an exact region and authority map for inspector chrome, inspection overlay, primary artifact, and their boundary.",
    "Prove style isolation in both directions without restyling the external artifact.",
    "Provide the artifact render fingerprint before and after every chrome state transition.",
    "Verify pointer, touch, keyboard, and assistive-technology crossings through declared semantic locus identifiers.",
    "Verify focus order, focus stability, inspection-mode announcements, and focus return.",
    "Verify overlay occlusion, target re-anchoring, stale targets, and target-drift prevention.",
    "Show wide and narrow rest, selection, preview, invalid, supported, unavailable, recovery, and local-result states.",
    "Report chrome conformance, overlay conformance, external artifact preservation, and boundary behavior separately.",
  ],
  provenance: {
    definition_id: ARTIFACT_INSPECTOR_SURFACE_PROFILE_ID,
    promotion_status: "proposed",
    runtime_evidence_policy: "required_per_consumer",
    external_artifact_review_status: "external_not_reviewed",
  },
});

const SURFACE_PRESENTATION_PROFILES = deepFreeze({
  [WORKBENCH_SURFACE_PROFILE_ID]: WORKBENCH_SURFACE_PROFILE,
  [ARTIFACT_INSPECTOR_SURFACE_PROFILE_ID]:
    ARTIFACT_INSPECTOR_SURFACE_PROFILE,
});

export function cloneSurfacePresentationProfile(profileId) {
  const normalizedProfileId =
    typeof profileId === "string" ? profileId.trim() : "";
  const profile = SURFACE_PRESENTATION_PROFILES[normalizedProfileId];

  return profile ? clone(profile) : null;
}

export function getSurfacePresentationProfile(profileId) {
  return cloneSurfacePresentationProfile(profileId);
}

export function cloneWorkbenchSurfaceProfile() {
  return cloneSurfacePresentationProfile(WORKBENCH_SURFACE_PROFILE_ID);
}

export function cloneArtifactInspectorSurfaceProfile() {
  return cloneSurfacePresentationProfile(
    ARTIFACT_INSPECTOR_SURFACE_PROFILE_ID,
  );
}

export function listSurfacePresentationProfiles() {
  return Object.keys(SURFACE_PRESENTATION_PROFILES).map((profileId) =>
    cloneSurfacePresentationProfile(profileId),
  );
}
