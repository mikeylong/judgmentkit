/** Admission checks inspect packet shape, never the quality or truth of a UI. */
const object = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;

const PATTERN_FIELDS = ["pattern_contract_evidence", "patternContractEvidence", "pattern_contracts_evidence", "patternContractsEvidence", "pattern_evidence", "patternEvidence"];
const COMPONENT_FIELDS = ["component_contract_evidence", "componentContractEvidence", "component_contracts_evidence", "componentContractsEvidence", "component_evidence", "componentEvidence"];
const MANIFEST_FIELDS = ["visual_composition_manifest", "visualCompositionManifest"];
const SELECTOR_FIELDS = ["selector", "target_selector", "member_selector", "container_selector", "label_selector", "value_selector", "indicator_slot_selector", "indicator_selector", "asset_selector"];

export function candidateCompositionManifest(candidate) {
  if (!object(candidate)) return null;
  for (const source of [candidate, candidate.browser_qa, candidate.browserQa]) {
    if (!object(source)) continue;
    for (const name of MANIFEST_FIELDS) if (source[name] !== undefined) return source[name];
  }
  return null;
}

function declaredField(candidate, names) {
  const name = names.find((key) => candidate[key] !== undefined);
  return name ? [name, candidate[name]] : [names[0], undefined];
}

export function evidenceAdmissionPacket(diagnostics, extra = {}) {
  const ready = diagnostics.length === 0;
  return {
    admission_status: ready ? "ready_for_review" : "repair_evidence_packet",
    substantive_review_performed: false,
    attempt_consumed: false,
    next_agent_action: ready ? "review_implementation" : "repair_packet_and_resubmit",
    diagnostics,
    repair_instructions: {
      status: ready ? "none" : "packet_repair_required",
      items: diagnostics.map(({ code, path, message, expected, observed }) => ({ code, path, required_change: message, ...(expected !== undefined ? { expected } : {}), ...(observed !== undefined ? { observed } : {}) })),
    },
    ...extra,
  };
}

export function retryEvidenceAdmission(reason) {
  return evidenceAdmissionPacket([], {
    admission_status: "retry_evidence_preflight",
    next_agent_action: "retry_preflight",
    retryable: true,
    code: "evidence_browser_runtime_unavailable",
    reason,
    diagnostics: [{ code: "evidence_browser_runtime_unavailable", path: "candidate.rendered_html", message: "Retry evidence admission when the isolated browser runtime is available; no implementation attempt was consumed." }],
    repair_instructions: { status: "runtime_retry_required", items: [] },
  });
}

export function inspectImplementationEvidenceShape(candidate, { implementationContract } = {}) {
  const diagnostics = [];
  const issue = (code, path, message, expected, observed) => diagnostics.push({ code, path, message, ...(expected !== undefined ? { expected } : {}), ...(observed !== undefined ? { observed } : {}) });
  if (implementationContract?.chart_review_required && !implementationContract.chart_review_policy) issue("chart_data_oracle_required", "implementation_contract.chart_review_policy", "The reviewed chart promise requires attributed expected data, selections, and required snapshots in the implementation contract before candidate review. Prepare the data oracle; do not invent source values or infer them from the rendered path.", "contract-owned chart review policy");
  if (typeof candidate === "string" && candidate.trim()) return evidenceAdmissionPacket(diagnostics);
  if (!object(candidate)) {
    issue("candidate_shape_invalid", "candidate", "Submit candidate text or an evidence object.", "string or object");
    return evidenceAdmissionPacket(diagnostics);
  }
  const lists = [
    { names: ["primitives_used", "approved_primitives_used", "interface_primitives_used"] },
    { names: ["states_covered", "covered_states", "states_verified", "state_coverage"], required: implementationContract?.state_coverage?.required_states?.length > 0 },
    { names: ["static_checks", "static_evidence", "static_check_commands", "checks_run"], required: implementationContract?.static_enforcement?.default_rules?.length > 0 },
  ];
  for (const { names, required } of lists) {
    const [key, value] = declaredField(candidate, names);
    if (value === undefined && required) issue("required_evidence_field_missing", `candidate.${key}`, "Provide this required evidence field before substantive review. An empty array is valid evidence of missing coverage and will fail the implementation check.", "string[]");
    for (const alias of names) if (candidate[alias] !== undefined && (!Array.isArray(candidate[alias]) || candidate[alias].some((entry) => !text(entry)))) {
      issue("evidence_string_array_required", `candidate.${alias}`, "Use an array of nonempty strings.", "string[]");
    }
  }
  for (const key of ["browser_qa", "browser_qa_evidence", "accessibility_evidence", "accessibilityEvidence", "a11y_evidence", "a11yEvidence", "design_system_provenance"]) {
    if (candidate[key] !== undefined && !object(candidate[key])) issue("evidence_object_required", `candidate.${key}`, "Use an evidence object.", "object");
  }
  const [patternName, pattern] = declaredField(candidate, PATTERN_FIELDS);
  if (pattern !== undefined) {
    if (!object(pattern)) issue("pattern_evidence_object_required", `candidate.${patternName}`, "Submit structured pattern evidence.", "object");
    else {
      for (const name of ["regions", "regions_present", "controls", "controls_present"]) {
        if (pattern[name] === undefined) continue;
        const entries = pattern[name];
        if (!Array.isArray(entries) || entries.some((entry) => !text(entry) && !(object(entry) && [entry.id, entry.name, entry.region_id, entry.control_id].some(text)))) {
          issue("pattern_evidence_array_required", `candidate.${patternName}.${name}`, "Use strings or entries with an id/name in an array; object keys are not region/control evidence.", "Array<string | {id, name?, evidence?}>");
        }
      }
      if (text(pattern.pattern_id ?? pattern.patternId)) {
        const contracts = implementationContract?.default_ai_native_design_system?.pattern_contracts ?? [];
        const active = contracts.find((entry) => entry.id === (pattern.pattern_id ?? pattern.patternId));
        if (active?.required_regions?.length && pattern.regions === undefined && pattern.regions_present === undefined) issue("pattern_regions_missing", `candidate.${patternName}.regions`, "Declare the regions that map the selected pattern to the rendered interface.", "array");
        if (active?.expected_controls?.length && pattern.controls === undefined && pattern.controls_present === undefined) issue("pattern_controls_missing", `candidate.${patternName}.controls`, "Declare the controls that map the selected pattern to the rendered interface.", "array");
      }
    }
  }
  const [componentName, component] = declaredField(candidate, COMPONENT_FIELDS);
  if (component !== undefined) {
    if (!object(component)) issue("component_evidence_object_required", `candidate.${componentName}`, "Submit structured component evidence.", "object");
    else if (component.components !== undefined && (!Array.isArray(component.components) || component.components.some((entry) => !object(entry) || ![entry.id, entry.component_id, entry.componentId].some(text)))) issue("component_entries_invalid", `candidate.${componentName}.components`, "Use an array of component entries with an id.", "Array<{id, states_covered?}>");
  }
  const [accessibilityName, accessibility] = declaredField(candidate, ["accessibility_evidence", "accessibilityEvidence", "a11y_evidence", "a11yEvidence"]);
  if (object(accessibility)) {
    for (const [name, evidence] of Object.entries(accessibility)) {
      if (object(evidence) && ["not_applicable", "not applicable", "n/a"].includes(String(evidence.status).toLowerCase()) && !text(evidence.rationale ?? evidence.reason)) {
        issue("not_applicable_rationale_missing", `candidate.${accessibilityName}.${name}.rationale`, "Put the explanation for non-applicability in rationale (notes alone do not satisfy this field).", "nonempty string");
      }
    }
  }
  const manifest = candidateCompositionManifest(candidate);
  if (manifest !== null) {
    if (!object(manifest)) issue("composition_manifest_object_required", "candidate.visual_composition_manifest", "Submit a structured relationship declaration.", "object");
    else {
      const samples = manifest.samples ?? manifest.relationships;
      if (samples !== undefined && (!Array.isArray(samples) || samples.some((entry) => !object(entry)))) issue("composition_samples_array_required", "candidate.visual_composition_manifest.samples", "Use an array of relationship objects.", "object[]");
      if (Array.isArray(samples)) samples.forEach((sample, index) => {
        if (!object(sample)) return;
        const base = `candidate.visual_composition_manifest.samples[${index}]`;
        if (!text(sample.rule_id ?? sample.ruleId)) issue("sample_rule_missing", `${base}.rule_id`, "Declare the governed relationship rule.", "nonempty string");
        if (!text(sample.selector)) issue("sample_selector_missing", `${base}.selector`, "Declare the actual rendered relationship root selector.", "nonempty CSS selector");
        for (const key of SELECTOR_FIELDS) if (sample[key] !== undefined && !text(sample[key])) issue("sample_selector_invalid", `${base}.${key}`, "Use a nonempty CSS selector.", "nonempty string");
      });
    }
  }
  return evidenceAdmissionPacket(diagnostics);
}

/** Only fixed, server-authored measurement code reaches the isolated renderer. */
export function selectorAdmissionExpression(candidate) {
  const manifest = candidateCompositionManifest(candidate);
  const samples = object(manifest) ? manifest.samples ?? manifest.relationships ?? [] : [];
  const declarations = Array.isArray(samples) ? samples : [];
  return `(() => {
    const diagnostics = [];
    const declarations = ${JSON.stringify(declarations)};
    for (const [index, declaration] of declarations.entries()) {
      if (declaration.viewport_id && declaration.viewport_id !== ${JSON.stringify("__VIEWPORT_ID__")}) continue;
      for (const key of ${JSON.stringify(SELECTOR_FIELDS)}) {
        const selector = declaration[key];
        if (typeof selector !== 'string' || !selector.trim() || selector === '::direct-text') continue;
        const path = 'candidate.visual_composition_manifest.samples[' + index + '].' + key;
        let matches;
        try { matches = [...document.querySelectorAll(selector)]; }
        catch { diagnostics.push({code:'selector_syntax_invalid',path,message:'Use a valid CSS selector.',observed:selector}); continue; }
        if (matches.length === 0) { diagnostics.push({code:'selector_target_missing',path,message:'Target an element in this submitted rendered document.',observed:selector}); continue; }
        if (key === 'selector' && declaration.rule_id === 'presentation_owner.select_indicator' && !matches.some((element) => element.matches('select,[role="combobox"],[role="listbox"]'))) diagnostics.push({code:'select_selector_not_control',path,message:'Target the native select or select-like control itself, not its wrapper.',observed:selector,expected:'select, [role="combobox"], or [role="listbox"]'});
      }
    }
    return { diagnostics };
  })()`;
}
