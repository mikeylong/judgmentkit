export const WORKBENCH_SURFACE_PROFILE_ID =
  "judgmentkit.workbench.operational-v1";

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

export function cloneWorkbenchSurfaceProfile() {
  return clone(WORKBENCH_SURFACE_PROFILE);
}

export function listSurfacePresentationProfiles() {
  return [cloneWorkbenchSurfaceProfile()];
}
