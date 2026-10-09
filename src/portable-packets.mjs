import { createHash } from "node:crypto";
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";

export const COMPACT_PACKET_SCHEMA = "judgmentkit.compact-packet/v1";
export const MAX_CONTINUATION_BYTES = 4 * 1024 * 1024;
export const COMPACT_PACKET_TOOLS = new Set([
  "analyze_implementation_brief",
  "create_activity_model_review",
  "review_activity_model_candidate",
  "recommend_surface_types",
  "recommend_ui_workflow_profiles",
  "review_ui_workflow_candidate",
  "review_cognitive_dimensions_candidate",
  "create_ui_implementation_contract",
  "preflight_ui_implementation_candidate",
  "review_ui_implementation_candidate",
  "create_ui_generation_handoff",
  "create_frontend_generation_context",
  "create_frontend_implementation_skill_context",
]);

const COMPACT_PACKET_KINDS = new Set([...COMPACT_PACKET_TOOLS, "ui_implementation_candidate"]);

const CONTINUATION_FIELDS = {
  candidate: ["ui_implementation_candidate"],
  activity_review: ["create_activity_model_review", "review_activity_model_candidate"],
  activityReview: ["create_activity_model_review", "review_activity_model_candidate"],
  surface_review: ["recommend_surface_types"],
  surfaceReview: ["recommend_surface_types"],
  workflow_review: ["review_ui_workflow_candidate"],
  implementation_contract: ["create_ui_implementation_contract"],
  ui_generation_handoff: ["create_ui_generation_handoff"],
  frontend_generation_context: ["create_frontend_generation_context"],
  frontendGenerationContext: ["create_frontend_generation_context"],
  cognitive_dimensions_review: ["review_cognitive_dimensions_candidate"],
};

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function pick(object, keys) {
  return Object.fromEntries(keys.filter((key) => object?.[key] !== undefined)
    .map((key) => [key, object[key]]));
}

/** Active instructions stay readable; the continuation retains the exact full packet. */
export function activePacketGuidance(packet) {
  const guidance = pick(packet, [
    "error", "status", "review_status", "surface_guidance", "routing_conflict", "confidence_evidence", "guardrails", "implementation_review_status", "evidence_preflight_status",
    "admission_status", "diagnostics", "selector_observation_status", "verification_limits", "candidate_artifact_status", "design_system_acceptance_status", "next_agent_action",
    "substantive_review_performed", "attempt_consumed", "autofix_loop",
    "repair_instructions", "findings", "handoff_status", "frontend_context_status",
    "skill_context_status", "implementation_contract_status", "recommended_surface_type",
    "recommended_surface_types", "confidence", "selection_origin", "alternatives",
    "next_recommended_tool", "instruction_markdown", "must_do", "must_not_do",
    "verification_checklist", "targeted_questions", "activity_model", "interaction_contract",
    "disclosure_policy", "surface_type", "surface_type_guidance", "product_terms",
  ]);
  if (packet.chart_review_manifest || packet.rendered_html || packet.primitives_used) {
    guidance.evidence_summary = {
      ...pick(packet, ["primitives_used", "states_covered", "covered_states", "static_checks"]),
      rendered_source_sha256: typeof packet.rendered_html === "string" ? digest(packet.rendered_html) : null,
      chart_manifest: packet.chart_review_manifest ? {
        ...pick(packet.chart_review_manifest, ["chart_selector", "plot_selector", "series_selector", "selection_selectors"]),
        states: packet.chart_review_manifest.states?.map((state) => ({
          state_id: state.state_id,
          rendered_source_sha256: typeof state.rendered_html === "string" ? digest(state.rendered_html) : null,
        })),
      } : null,
    };
  }
  if (Array.isArray(packet.findings)) guidance.findings = packet.findings.map((finding, index) => ({
    ...pick(finding, ["severity", "check", "code", "message", "path", "expected", "observed"]),
    full_evidence_path: `continuation.findings[${index}]`,
  }));
  if (packet.repair_instructions?.groups) guidance.repair_instructions = {
    status: packet.repair_instructions.status,
    groups: Object.fromEntries(Object.entries(packet.repair_instructions.groups).map(([group, items]) => [group,
      items.map((item, index) => ({ ...pick(item, ["check", "issue", "code", "path", "required_change", "expected", "observed"]),
        full_evidence_path: `continuation.repair_instructions.groups.${group}[${index}]` }))])),
  };
  const activityCase = packet.activity_case ?? packet.review?.activity_case;
  if (activityCase?.readiness) guidance.readiness = activityCase.readiness;
  if (packet.review) guidance.review = pick(packet.review, [
    "status", "readiness", "missing_fields", "targeted_questions", "confidence",
    "guardrail_findings", "next_agent_action",
  ]);
  if (packet.candidate) guidance.candidate = pick(packet.candidate, [
    "activity_model", "interaction_contract", "disclosure_policy", "workflow", "surface_set",
  ]);
  const implementation = packet.implementation_contract ?? packet;
  if (implementation.design_system_source) {
    guidance.implementation_authority = pick(implementation, [
      "id", "design_system_source", "local_component_authority", "approved_primitives",
      "state_coverage", "static_enforcement", "browser_qa", "iteration_policy",
      "visual_composition_policy", "chart_review_required", "chart_review_policy", "design_system_scopes",
      "boundary_contracts", "artifact_inspector",
    ]);
  }
  if (guidance.implementation_authority?.visual_composition_policy) {
    const policy = guidance.implementation_authority.visual_composition_policy;
    guidance.implementation_authority.visual_composition_policy = {
      ...pick(policy, ["id", "version", "enforcement", "sha256", "authority"]),
      active_rules: Array.isArray(policy.rules) ? policy.rules.map((rule) => pick(rule, ["id", "rule_id", "purpose"])) : Object.keys(policy.rules ?? {}),
      full_policy_path: "continuation.implementation_contract.visual_composition_policy",
      instruction: "Use the contract-declared rule and family calibration; candidate claims do not satisfy trusted browser observation. Expand the lossless continuation for exact thresholds and declarations.",
    };
  }
  if (packet.implementation_guidance) guidance.implementation_guidance = pick(
    packet.implementation_guidance, [
      "interaction_implications", "disclosure_implications", "frontend_posture",
      "required_surfaces", "required_sections", "required_controls", "verification_expectations",
      "chart_review_required", "chart_review_policy",
    ],
  );
  if (packet.implementation_guidance?.evidence_field_mapping) {
    guidance.implementation_guidance.evidence_fields = Object.fromEntries(
      Object.entries(packet.implementation_guidance.evidence_field_mapping).map(([key, value]) => [key,
        pick(value, ["field", "candidate_field", "accepted_values", "required", "required_when"])]),
    );
    guidance.implementation_guidance.authority_path = "active_guidance.implementation_authority";
  }
  if (packet.checks) guidance.check_outcomes = Object.fromEntries(
    Object.entries(packet.checks).map(([id, value]) => [id,
      typeof value === "object" && value !== null
        ? { ...pick(value, ["status", "outcome", "applicable"]),
            ...(value.coverage ? { coverage: {
              ...pick(value.coverage, ["untested", "unsupported", "source_authenticity", "label_geometry_scope"]),
              declared_count: value.coverage.declared?.length ?? 0,
              observed_count: value.coverage.observed?.length ?? 0,
              full_coverage_path: `continuation.checks.${id}.coverage`,
            } } : {}),
            full_check_path: `continuation.checks.${id}`,
          }
        : value]),
  );
  return guidance;
}

export function compactPacket(packet, toolName) {
  if (!COMPACT_PACKET_KINDS.has(toolName) || packet?.error) return packet;
  const serialized = JSON.stringify(packet);
  const bytes = Buffer.from(serialized, "utf8");
  if (bytes.length > MAX_CONTINUATION_BYTES) {
    throw new RangeError("The full packet exceeds the compact continuation size limit.");
  }
  const envelope = {
    schema: COMPACT_PACKET_SCHEMA,
    packet_kind: toolName,
    active_guidance: activePacketGuidance(packet),
    continuation: {
      encoding: "brotli-base64",
      uncompressed_bytes: bytes.length,
      sha256: digest(bytes),
      data: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 8 } }).toString("base64"),
    },
    continuity: "Lossless transport only. Raw brief and attributed context are still required at validating boundaries. The hash does not authenticate authority.",
    serialization_metrics: {
      full_packet_bytes: bytes.length,
      compact_packet_bytes: 0,
      measurement: "UTF-8 JSON serialized bytes; no token or monetary estimate",
    },
  };
  // Count the metrics themselves and converge after the number of digits stabilizes.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    envelope.serialization_metrics.compact_packet_bytes = Buffer.byteLength(JSON.stringify(envelope));
  }
  return envelope;
}

export function expandCompactPacket(packet, expectedTools) {
  if (packet?.schema !== COMPACT_PACKET_SCHEMA) return packet;
  const continuation = packet.continuation;
  if (!COMPACT_PACKET_KINDS.has(packet.packet_kind) ||
      (expectedTools && !expectedTools.includes(packet.packet_kind)) ||
      continuation?.encoding !== "brotli-base64" ||
      !Number.isInteger(continuation.uncompressed_bytes) ||
      continuation.uncompressed_bytes < 1 ||
      continuation.uncompressed_bytes > MAX_CONTINUATION_BYTES ||
      typeof continuation.data !== "string" ||
      continuation.data.length > MAX_CONTINUATION_BYTES * 2 ||
      !/^[a-f0-9]{64}$/.test(continuation.sha256 ?? "") ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(continuation.data)) {
    throw new TypeError("Compact continuation has an invalid kind, encoding, size, or digest.");
  }
  let bytes;
  try {
    bytes = brotliDecompressSync(Buffer.from(continuation.data, "base64"), { maxOutputLength: MAX_CONTINUATION_BYTES });
  } catch {
    throw new TypeError("Compact continuation could not be decoded within its size limit.");
  }
  if (bytes.length !== continuation.uncompressed_bytes || digest(bytes) !== continuation.sha256) {
    throw new TypeError("Compact continuation bytes do not match their continuity receipt.");
  }
  const serialized = bytes.toString("utf8");
  if (!Buffer.from(serialized, "utf8").equals(bytes)) {
    throw new TypeError("Compact continuation must contain valid UTF-8 JSON bytes.");
  }
  let expanded;
  try { expanded = JSON.parse(serialized); }
  catch { throw new TypeError("Compact continuation must contain a JSON object."); }
  if (!expanded || typeof expanded !== "object" || Array.isArray(expanded) ||
      expanded.schema === COMPACT_PACKET_SCHEMA) {
    throw new TypeError("Compact continuations cannot be arrays, primitives, or nested envelopes.");
  }
  return expanded;
}

export function compactImplementationCandidate(candidate) {
  return compactPacket(candidate, "ui_implementation_candidate");
}

export function expandToolContinuations(args, { toolName } = {}) {
  const expanded = { ...args };
  for (const [field, kinds] of Object.entries(CONTINUATION_FIELDS)) {
    if (field === "candidate" && toolName && !["preflight_ui_implementation_candidate", "review_ui_implementation_candidate"].includes(toolName)) continue;
    if (args[field]?.schema === COMPACT_PACKET_SCHEMA) {
      expanded[field] = expandCompactPacket(args[field], kinds);
    }
  }
  return expanded;
}
