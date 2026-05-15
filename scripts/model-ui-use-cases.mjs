export const MODEL_UI_ROOT = "examples/model-ui";
export const MODEL_UI_INDEX_FILE = `${MODEL_UI_ROOT}/index.json`;

export const COMPARISON_ROWS = [
  {
    id: "deterministic",
    label: "Deterministic",
    model_label: "Deterministic renderer",
    generation_source: "deterministic",
    provider: "none",
    model: "none",
    cli: null,
    reasoning_effort: null,
    summary:
      "Scripted renderer paths show the controlled baseline for each context combination.",
  },
  {
    id: "gemma4-lms",
    label: "Gemma 4 via LM Studio lms",
    model_label: "Gemma 4 (local LLM)",
    generation_source: "captured_model_output",
    provider: "lmstudio",
    model: "google/gemma-4-e2b",
    cli: "lms",
    reasoning_effort: null,
    summary:
      "Local Gemma 4 captures show how a smaller local model responds to the same four context boundaries.",
  },
  {
    id: "gpt55-xhigh-codex",
    label: "GPT-5.5 xhigh via codex exec",
    model_label: "GPT-5.5",
    generation_source: "captured_model_output",
    provider: "codex-cli",
    model: "gpt-5.5",
    cli: "codex",
    reasoning_effort: "xhigh",
    summary:
      "GPT-5.5 captures use extra-high reasoning to show the same matrix with a stronger model path.",
  },
];

export const COMPARISON_COLUMNS = [
  {
    id: "no-judgmentkit",
    label: "Raw brief",
    short_label: "No JudgmentKit",
    judgmentkit_mode: "no_judgmentkit",
    design_system_mode: "none",
    render_mode: "html",
    summary:
      "Raw source brief and sample case only. No reviewed handoff and no Material UI.",
  },
  {
    id: "with-judgmentkit",
    label: "JudgmentKit skill context",
    short_label: "JudgmentKit skill",
    judgmentkit_mode: "with_judgmentkit",
    design_system_mode: "none",
    render_mode: "html",
    summary:
      "Reviewed handoff plus compiled frontend implementation skill context. No Material UI.",
  },
  {
    id: "material-ui-only",
    label: "Material UI only",
    short_label: "Design system",
    judgmentkit_mode: "no_judgmentkit",
    design_system_mode: "material_ui",
    render_mode: "material_ui",
    summary:
      "Raw source brief plus Material UI adapter. No reviewed JudgmentKit handoff.",
  },
  {
    id: "judgmentkit-material-ui",
    label: "JudgmentKit skill + Material UI",
    short_label: "Skill + design system",
    judgmentkit_mode: "with_judgmentkit",
    design_system_mode: "material_ui",
    render_mode: "material_ui",
    summary:
      "Reviewed handoff plus compiled frontend skill context rendered through Material UI.",
  },
];

export const LEGACY_ALIASES = [
  {
    id: "deterministic-without-design-system",
    canonical_id: "deterministic-with-judgmentkit",
    artifact_path: "artifacts/deterministic-without-design-system.html",
    screenshot_path: "screenshots/deterministic-without-design-system.png",
  },
  {
    id: "deterministic-with-design-system",
    canonical_id: "deterministic-judgmentkit-material-ui",
    artifact_path: "artifacts/deterministic-with-design-system.html",
    screenshot_path: "screenshots/deterministic-with-design-system.png",
  },
  {
    id: "gemma4-without-design-system",
    canonical_id: "gemma4-lms-with-judgmentkit",
    artifact_path: "artifacts/gemma4-without-design-system.html",
    screenshot_path: "screenshots/gemma4-without-design-system.png",
    capture_file: "captures/gemma4-without-design-system.json",
  },
  {
    id: "gemma4-with-design-system",
    canonical_id: "gemma4-lms-judgmentkit-material-ui",
    artifact_path: "artifacts/gemma4-with-design-system.html",
    screenshot_path: "screenshots/gemma4-with-design-system.png",
    capture_file: "captures/gemma4-with-design-system.json",
  },
  {
    id: "gpt55-without-design-system",
    canonical_id: "gpt55-xhigh-codex-with-judgmentkit",
    artifact_path: "artifacts/gpt55-without-design-system.html",
    screenshot_path: "screenshots/gpt55-without-design-system.png",
    capture_file: "captures/gpt55-without-design-system.json",
  },
  {
    id: "gpt55-with-design-system",
    canonical_id: "gpt55-xhigh-codex-judgmentkit-material-ui",
    artifact_path: "artifacts/gpt55-with-design-system.html",
    screenshot_path: "screenshots/gpt55-with-design-system.png",
    capture_file: "captures/gpt55-with-design-system.json",
  },
];

const COMMON_COMPONENTS = [
  "ThemeProvider",
  "CssBaseline",
  "AppBar",
  "Toolbar",
  "Paper",
  "Stack",
  "List",
  "ListItemButton",
  "ListItemText",
  "Chip",
  "Button",
  "Card",
  "CardContent",
  "Typography",
  "Alert",
];

function materialUiAdapter(id, name) {
  return {
    id,
    name,
    scope: "example-only",
    role: "visual renderer after context selection",
    design_system_name: "Material UI",
    design_system_package: "@mui/material",
    render_mode: "static-ssr",
    renderer: "React server rendering with Emotion critical CSS inlined into each artifact.",
    theme: {
      palette: {
        primary: "#245f73",
        success: "#2e6b48",
        warning: "#8a5a16",
        background: "#f5f3ed",
      },
      density: "operational",
      shape: {
        border_radius: 8,
      },
    },
    components: COMMON_COMPONENTS,
    constraint:
      "Material UI changes the visual/component layer only; it does not supply activity fit, workflow fit, or disclosure discipline.",
  };
}

function caseBrief({
  participant,
  activity,
  sourceObject,
  mechanics,
  decision,
  outcome,
  disclosure,
  domainTerms,
}) {
  return [
    `A ${participant} is ${activity}.`,
    `The request says to build from the ${sourceObject}, ${mechanics}.`,
    `The activity is deciding ${decision}.`,
    `The outcome is ${outcome}.`,
    domainTerms ? `Use domain terms: ${domainTerms}.` : "",
    disclosure,
  ].filter(Boolean).join(" ");
}

export const MODEL_UI_USE_CASES = [
  {
    id: "refund-system-map",
    label: "Support refund triage",
    short_label: "Refund triage",
    activity_summary:
      "A support operations manager reviews refund escalation cases and decides approve, policy review, or missing evidence.",
    output_dir: `${MODEL_UI_ROOT}/refund-system-map`,
    index_path: `${MODEL_UI_ROOT}/refund-system-map/index.html`,
    manifest_path: `${MODEL_UI_ROOT}/refund-system-map/manifest.json`,
    source_brief_file: "examples/demo/refund-ops-implementation-heavy.brief.txt",
    matrix_id: "refund-system-map-model-ui-v2",
    selected_case: {
      id: "R-1842",
      customer: "Nora Diaz",
      plan: "Pro annual",
      amount: "$184.20",
      request: "Subscription renewal disputed after agent escalation.",
      status: "Evidence incomplete",
      evidence: [
        "Renewal date confirmed in purchase history.",
        "Support note captures the customer's refund reason.",
        "Receipt photo is missing before manager approval.",
      ],
      policy:
        "Inside exception window. Manager approval is allowed when evidence is complete; unclear duplicate-charge cases go to policy review.",
    },
    queue: [
      { id: "R-1842", customer: "Nora Diaz", state: "Needs receipt", amount: "$184.20" },
      { id: "R-1843", customer: "Jun Park", state: "Policy question", amount: "$89.00" },
      { id: "R-1844", customer: "Amara Blake", state: "Manager review", amount: "$312.75" },
    ],
    implementation_terms: [
      "database table",
      "JSON schema",
      "prompt template",
      "tool call",
      "resource id",
      "API endpoint",
      "CRUD",
      "refund_case",
    ],
    design_system_adapter: materialUiAdapter(
      "material-ui-refund-ops-adapter",
      "Material UI Refund Ops Review Adapter",
    ),
    workflow_candidate: {
      workflow: {
        surface_name: "Refund escalation review",
        steps: [
          "Choose the active refund request",
          "Review customer context and evidence",
          "Choose the next refund path",
          "Send a clear handoff",
        ],
        primary_actions: [
          "Approve refund",
          "Send to policy review",
          "Return for evidence",
          "Send handoff",
        ],
        decision_points: [
          "Decide whether the refund can be approved, needs policy review, or must return to the support agent for missing evidence.",
        ],
        completion_state:
          "The next owner receives a handoff with the chosen path and the reason.",
      },
      primary_ui: {
        sections: [
          "Refund queue",
          "Selected request",
          "Evidence checklist",
          "Policy context",
          "Decision path",
          "Handoff reason",
        ],
        controls: [
          "Select request",
          "Approve refund",
          "Send to policy review",
          "Return for evidence",
          "Choose next owner",
          "Send handoff",
        ],
        user_facing_terms: [
          "refund escalation",
          "selected request",
          "evidence checklist",
          "policy review",
          "handoff reason",
          "support agent",
        ],
      },
      handoff: {
        next_owner: "Support agent",
        reason:
          "Receipt photo is missing. Ask the customer to attach proof before approval.",
        next_action:
          "Return the request to the support agent with the missing evidence request.",
      },
    },
    raw_surface: {
      eyebrow: "Raw source brief",
      heading: "refund_case Admin Console",
      status: "Implementation-first",
      queue_title: "Database records",
      selected_status: "API endpoint status: pending evidence",
      info: [
        { label: "Data model", value: "refund_case" },
        { label: "Schema", value: "JSON schema + database fields" },
      ],
      evidence: [
        "database table fields mapped to editable controls",
        "prompt template output copied into reviewer notes",
        "tool call results and resource id visible for debugging",
      ],
      policy_title: "Implementation context",
      policy:
        "Show refund_case data model, database fields, JSON schema, prompt template, tool call results, resource id, API endpoint status, and CRUD.",
      decision_title: "CRUD actions",
      actions: ["Update field", "Run tool call", "Save JSON"],
      primary_action: "Save JSON",
      handoff: {
        owner: "API endpoint",
        title: "Implementation handoff",
        reason: "Resource id and prompt template state are ready for the next CRUD operation.",
        action: "Send to endpoint",
      },
    },
    reviewed_surface: {
      eyebrow: "Refund escalation",
      heading: "Refund Review Workspace",
      status: "Evidence incomplete",
      queue_title: "Refund escalations",
      info: [
        { label: "Plan", value: "Pro annual" },
        { label: "Review state", value: "Evidence incomplete" },
      ],
      policy_title: "Exception window",
      decision_title: "Choose next action",
      actions: ["Approve refund", "Send to policy review", "Return for evidence"],
      primary_action: "Return for evidence",
      handoff: {
        owner: "Support agent",
        title: "Handoff",
        reason: "Receipt photo is missing. Ask the customer to attach proof before approval.",
        action: "Send handoff",
      },
    },
  },
  {
    id: "field-service-dispatch",
    label: "Field service dispatch",
    short_label: "Field dispatch",
    activity_summary:
      "A field operations manager assigns, reschedules, or escalates a repair visit using route, parts, and SLA constraints.",
    output_dir: `${MODEL_UI_ROOT}/field-service-dispatch`,
    index_path: `${MODEL_UI_ROOT}/field-service-dispatch/index.html`,
    manifest_path: `${MODEL_UI_ROOT}/field-service-dispatch/manifest.json`,
    source_brief_file: `${MODEL_UI_ROOT}/field-service-dispatch/source-brief.txt`,
    source_brief_text: caseBrief({
      participant: "field operations manager",
      activity: "reviewing same-day repair visits before dispatch",
      sourceObject: "repair_visit data model",
      mechanics:
        "route matrix, parts inventory API status, technician calendar fields, JSON schema, prompt template, tool call result, resource id, and CRUD",
      decision:
        "whether the visit should be assigned to the nearest qualified technician, rescheduled for parts, or escalated for SLA risk",
      outcome:
        "a dispatch handoff with the technician, next action, timing constraint, and reason",
      domainTerms:
        "repair visit, technician, parts readiness, site access, SLA risk, dispatch handoff",
      disclosure:
        "Route, parts, and SLA facts are useful; database fields, prompts, tool traces, and resource ids should stay out of the dispatcher surface.",
    }),
    matrix_id: "field-service-dispatch-model-ui-v1",
    selected_case: {
      id: "V-2187",
      customer: "Mallory Chen",
      plan: "Priority repair",
      amount: "SLA 4h",
      request: "Kitchen freezer repair needs dispatch before the service window closes.",
      status: "Parts check needed",
      evidence: [
        "Technician Reyes is 18 minutes from the site and certified for the freezer unit.",
        "Replacement fan motor is available at the west depot.",
        "Customer gate code is missing before dispatch.",
      ],
      policy:
        "Same-day SLA visits can be assigned when parts and site access are confirmed; missing access details return to dispatch support.",
    },
    queue: [
      { id: "V-2187", customer: "Mallory Chen", state: "Needs gate code", amount: "SLA 4h" },
      { id: "V-2188", customer: "Owen Patel", state: "Parts shortage", amount: "Tomorrow" },
      { id: "V-2189", customer: "Rae Wilson", state: "Route conflict", amount: "SLA 2h" },
    ],
    implementation_terms: [
      "repair_visit",
      "technician_calendar",
      "inventory_service",
      "route matrix",
      "JSON schema",
      "prompt template",
      "tool call",
      "resource id",
      "CRUD",
    ],
    design_system_adapter: materialUiAdapter(
      "material-ui-field-service-dispatch-adapter",
      "Material UI Field Service Dispatch Adapter",
    ),
    workflow_candidate: {
      workflow: {
        surface_name: "Repair visit dispatch review",
        steps: [
          "Choose the active repair visit",
          "Review route, certification, parts, and access readiness",
          "Choose assignment, reschedule, or escalation",
          "Send a dispatch handoff",
        ],
        primary_actions: [
          "Assign technician",
          "Reschedule for parts",
          "Escalate SLA risk",
          "Request access detail",
        ],
        decision_points: [
          "Decide whether the visit can be assigned now, needs rescheduling for parts, or should be escalated for SLA risk.",
        ],
        completion_state:
          "The dispatch team receives the next owner, timing constraint, and reason.",
      },
      primary_ui: {
        sections: [
          "Visit queue",
          "Selected visit",
          "Readiness checklist",
          "Dispatch policy",
          "Decision path",
          "Dispatch handoff",
        ],
        controls: [
          "Select visit",
          "Assign technician",
          "Reschedule for parts",
          "Escalate SLA risk",
          "Request gate code",
        ],
        user_facing_terms: [
          "repair visit",
          "technician",
          "parts readiness",
          "site access",
          "SLA risk",
          "dispatch handoff",
        ],
      },
      handoff: {
        next_owner: "Dispatch support",
        reason: "Gate code is missing before the qualified technician can be assigned.",
        next_action: "Request the gate code, then assign Reyes within the SLA window.",
      },
    },
    raw_surface: {
      eyebrow: "Raw source brief",
      heading: "repair_visit Dispatch Console",
      status: "Implementation-first",
      queue_title: "Route matrix rows",
      selected_status: "inventory_service API: access missing",
      info: [
        { label: "Data model", value: "repair_visit + technician_calendar" },
        { label: "Schema", value: "JSON schema + route fields" },
      ],
      evidence: [
        "resource id mapped to route matrix and editable technician_calendar fields",
        "inventory_service tool call result copied into the visit row",
        "prompt template output exposes SLA diagnostic fields",
      ],
      policy_title: "Implementation context",
      policy:
        "Show repair_visit fields, route matrix, inventory_service API status, JSON schema, prompt template output, resource id, and CRUD.",
      decision_title: "CRUD actions",
      actions: ["Patch route", "Run parts tool", "Save visit"],
      primary_action: "Save visit",
      handoff: {
        owner: "inventory_service endpoint",
        title: "Implementation handoff",
        reason: "Route and resource id fields are ready for the next patch operation.",
        action: "Send to endpoint",
      },
    },
    reviewed_surface: {
      eyebrow: "Dispatch review",
      heading: "Repair Dispatch Review",
      status: "Access detail needed",
      queue_title: "Repair visits",
      info: [
        { label: "Service window", value: "SLA 4h" },
        { label: "Parts readiness", value: "Fan motor available" },
      ],
      policy_title: "Dispatch rule",
      decision_title: "Choose dispatch path",
      actions: ["Assign technician", "Reschedule for parts", "Request gate code"],
      primary_action: "Request gate code",
      handoff: {
        owner: "Dispatch support",
        title: "Dispatch handoff",
        reason: "Gate code is missing before assignment can be completed.",
        action: "Send handoff",
      },
    },
  },
  {
    id: "clinical-intake-review",
    label: "Clinical intake review",
    short_label: "Intake review",
    activity_summary:
      "An intake coordinator reviews administrative appointment readiness and decides schedule, return missing forms, or escalate insurance verification.",
    output_dir: `${MODEL_UI_ROOT}/clinical-intake-review`,
    index_path: `${MODEL_UI_ROOT}/clinical-intake-review/index.html`,
    manifest_path: `${MODEL_UI_ROOT}/clinical-intake-review/manifest.json`,
    source_brief_file: `${MODEL_UI_ROOT}/clinical-intake-review/source-brief.txt`,
    source_brief_text: caseBrief({
      participant: "clinic intake coordinator",
      activity: "reviewing administrative readiness for a new appointment request",
      sourceObject: "intake_packet data model",
      mechanics:
        "eligibility API status, document fields, JSON schema, prompt template, tool call result, resource id, scheduling endpoint status, and CRUD",
      decision:
        "whether the packet is ready to schedule, should be returned for missing consent, or needs insurance verification escalation",
      outcome:
        "an intake handoff with the next administrative action and reason",
      domainTerms:
        "intake packet, referral, insurance verification, signed consent, appointment slot, administrative handoff",
      disclosure:
        "This use case is scheduling and intake administration only; it must not make diagnosis, triage, or treatment recommendations.",
    }),
    matrix_id: "clinical-intake-review-model-ui-v1",
    selected_case: {
      id: "I-4471",
      customer: "Avery Morgan",
      plan: "New patient consult",
      amount: "10:30 AM",
      request: "Appointment packet is pending administrative readiness review.",
      status: "Consent missing",
      evidence: [
        "Referral document is uploaded.",
        "Insurance card image is present.",
        "Signed consent form is missing before scheduling.",
      ],
      policy:
        "Schedule only when required administrative forms are complete; insurance uncertainty goes to verification staff. Do not diagnose, triage, or recommend treatment.",
    },
    queue: [
      { id: "I-4471", customer: "Avery Morgan", state: "Consent missing", amount: "10:30 AM" },
      { id: "I-4472", customer: "Sam Rivera", state: "Verify insurance", amount: "1:00 PM" },
      { id: "I-4473", customer: "Jules Kim", state: "Ready to schedule", amount: "3:15 PM" },
    ],
    implementation_terms: [
      "intake_packet",
      "eligibility API",
      "scheduling endpoint",
      "document fields",
      "JSON schema",
      "prompt template",
      "tool call",
      "resource id",
      "CRUD",
    ],
    design_system_adapter: materialUiAdapter(
      "material-ui-clinical-intake-adapter",
      "Material UI Clinical Intake Review Adapter",
    ),
    workflow_candidate: {
      workflow: {
        surface_name: "Administrative intake readiness review",
        steps: [
          "Choose the active intake packet",
          "Review referral, insurance, and required forms",
          "Choose schedule, return for forms, or insurance verification",
          "Send an administrative handoff",
        ],
        primary_actions: [
          "Ready to schedule",
          "Return for consent",
          "Escalate insurance verification",
          "Send handoff",
        ],
        decision_points: [
          "Decide whether the packet is administratively ready, missing required consent, or needs insurance verification.",
        ],
        completion_state:
          "The intake team receives the next administrative action and reason.",
      },
      primary_ui: {
        sections: [
          "Intake queue",
          "Selected packet",
          "Readiness checklist",
          "Administrative policy",
          "Decision path",
          "Intake handoff",
        ],
        controls: [
          "Select packet",
          "Ready to schedule",
          "Return for consent",
          "Escalate insurance verification",
          "Send handoff",
        ],
        user_facing_terms: [
          "intake packet",
          "referral",
          "insurance verification",
          "signed consent",
          "schedule readiness",
          "administrative handoff",
        ],
      },
      handoff: {
        next_owner: "Intake coordinator",
        reason: "Signed consent is missing before the appointment can be scheduled.",
        next_action: "Return the packet for consent and keep the request in administrative review.",
      },
    },
    raw_surface: {
      eyebrow: "Raw source brief",
      heading: "intake_packet Admin Console",
      status: "Implementation-first",
      queue_title: "Document records",
      selected_status: "scheduling endpoint status: blocked",
      info: [
        { label: "Data model", value: "intake_packet" },
        { label: "Schema", value: "JSON schema + document fields" },
      ],
      evidence: [
        "eligibility API result displayed beside editable document fields",
        "prompt template output copied into packet notes",
        "tool call result and resource id visible in the scheduler panel",
      ],
      policy_title: "Implementation context",
      policy:
        "Show intake_packet fields, eligibility API status, JSON schema, prompt template, tool call result, resource id, scheduling endpoint status, and CRUD.",
      decision_title: "CRUD actions",
      actions: ["Update field", "Run eligibility tool", "Save packet"],
      primary_action: "Save packet",
      handoff: {
        owner: "scheduling endpoint",
        title: "Implementation handoff",
        reason: "Resource id and document fields are ready for the next CRUD update.",
        action: "Send to endpoint",
      },
    },
    reviewed_surface: {
      eyebrow: "Intake readiness",
      heading: "Intake Readiness Review",
      status: "Consent missing",
      queue_title: "Intake packets",
      info: [
        { label: "Appointment type", value: "New patient consult" },
        { label: "Administrative state", value: "Consent missing" },
      ],
      policy_title: "Administrative boundary",
      decision_title: "Choose intake path",
      actions: ["Ready to schedule", "Escalate insurance", "Return for consent"],
      primary_action: "Return for consent",
      handoff: {
        owner: "Intake coordinator",
        title: "Administrative handoff",
        reason: "Signed consent is missing; no clinical recommendation is made.",
        action: "Send handoff",
      },
    },
  },
  {
    id: "b2b-renewal-risk",
    label: "B2B renewal risk review",
    short_label: "Renewal risk",
    activity_summary:
      "A customer success manager reviews renewal risk and decides save plan, executive escalation, or wait for usage evidence.",
    output_dir: `${MODEL_UI_ROOT}/b2b-renewal-risk`,
    index_path: `${MODEL_UI_ROOT}/b2b-renewal-risk/index.html`,
    manifest_path: `${MODEL_UI_ROOT}/b2b-renewal-risk/manifest.json`,
    source_brief_file: `${MODEL_UI_ROOT}/b2b-renewal-risk/source-brief.txt`,
    source_brief_text: caseBrief({
      participant: "customer success manager",
      activity: "reviewing at-risk B2B renewals before the weekly account meeting",
      sourceObject: "account_health data model",
      mechanics:
        "CRM fields, usage event JSON schema, prompt output, tool call results, resource id, billing API endpoint status, and CRUD",
      decision:
        "whether to start a save plan, escalate to an executive sponsor, or wait for stronger usage evidence",
      outcome:
        "a renewal handoff with the next owner, action, risk reason, and evidence gap",
      domainTerms:
        "renewal risk, account, usage trend, champion change, procurement timeline, save plan",
      disclosure:
        "Account facts and customer language belong on the surface; prompts, schemas, resource ids, and endpoint traces should stay diagnostic.",
    }),
    matrix_id: "b2b-renewal-risk-model-ui-v1",
    selected_case: {
      id: "AC-903",
      customer: "Northstar Labs",
      plan: "Enterprise annual",
      amount: "$84K ARR",
      request: "Renewal risk review before the account planning meeting.",
      status: "Champion change",
      evidence: [
        "Usage dropped 28 percent over the last two reporting periods.",
        "Primary champion left the account last month.",
        "Procurement timeline is missing before escalation.",
      ],
      policy:
        "Executive escalation is appropriate when sponsor risk and renewal timing are clear; missing procurement dates should be resolved before committing a save plan.",
    },
    queue: [
      { id: "AC-903", customer: "Northstar Labs", state: "Champion change", amount: "$84K ARR" },
      { id: "AC-904", customer: "Bright Arc", state: "Usage drop", amount: "$42K ARR" },
      { id: "AC-905", customer: "Harbor Grid", state: "Procurement risk", amount: "$120K ARR" },
    ],
    implementation_terms: [
      "account_health",
      "usage_event",
      "CRM fields",
      "billing API endpoint",
      "JSON schema",
      "prompt output",
      "tool call",
      "resource id",
      "CRUD",
    ],
    design_system_adapter: materialUiAdapter(
      "material-ui-b2b-renewal-risk-adapter",
      "Material UI B2B Renewal Risk Adapter",
    ),
    workflow_candidate: {
      workflow: {
        surface_name: "Renewal risk review",
        steps: [
          "Choose the active renewal account",
          "Review usage, sponsor, procurement, and renewal timing",
          "Choose save plan, executive escalation, or evidence follow-up",
          "Send a renewal handoff",
        ],
        primary_actions: [
          "Start save plan",
          "Escalate executive sponsor",
          "Request procurement date",
          "Send handoff",
        ],
        decision_points: [
          "Decide whether the account needs a save plan, executive escalation, or more usage/procurement evidence.",
        ],
        completion_state:
          "The customer success team receives the next owner, action, risk reason, and evidence gap.",
      },
      primary_ui: {
        sections: [
          "Renewal queue",
          "Selected account",
          "Risk evidence",
          "Renewal policy",
          "Decision path",
          "Renewal handoff",
        ],
        controls: [
          "Select account",
          "Start save plan",
          "Escalate executive sponsor",
          "Request procurement date",
          "Send handoff",
        ],
        user_facing_terms: [
          "renewal risk",
          "account",
          "usage trend",
          "champion change",
          "procurement timeline",
          "save plan",
        ],
      },
      handoff: {
        next_owner: "Customer success manager",
        reason: "Champion changed and usage dropped, but procurement timing is missing.",
        next_action: "Request the procurement date before committing the save plan.",
      },
    },
    raw_surface: {
      eyebrow: "Raw source brief",
      heading: "account_health CRM Console",
      status: "Implementation-first",
      queue_title: "CRM records",
      selected_status: "billing API endpoint status: renewal risk",
      info: [
        { label: "Data model", value: "account_health + usage_event" },
        { label: "Schema", value: "JSON schema + CRM fields" },
      ],
      evidence: [
        "CRM fields and usage_event rows exposed as editable controls",
        "prompt output copied into the renewal notes area",
        "tool call results and resource id displayed beside billing endpoint status",
      ],
      policy_title: "Implementation context",
      policy:
        "Show account_health fields, usage event JSON schema, prompt output, tool call results, resource id, billing API endpoint status, and CRUD.",
      decision_title: "CRUD actions",
      actions: ["Update CRM field", "Run usage tool", "Save account"],
      primary_action: "Save account",
      handoff: {
        owner: "billing API endpoint",
        title: "Implementation handoff",
        reason: "Resource id and account_health fields are ready for the next CRM update.",
        action: "Send to endpoint",
      },
    },
    reviewed_surface: {
      eyebrow: "Renewal review",
      heading: "Renewal Risk Review",
      status: "Procurement date missing",
      queue_title: "Renewal accounts",
      info: [
        { label: "Plan", value: "Enterprise annual" },
        { label: "Renewal value", value: "$84K ARR" },
      ],
      policy_title: "Escalation rule",
      decision_title: "Choose renewal path",
      actions: ["Start save plan", "Escalate executive sponsor", "Request procurement date"],
      primary_action: "Request procurement date",
      handoff: {
        owner: "Customer success manager",
        title: "Renewal handoff",
        reason: "Champion changed and usage dropped, but procurement timing is missing.",
        action: "Send handoff",
      },
    },
  },
];

export function modelUiUseCaseIndex() {
  return {
    version: 1,
    default_use_case_id: "refund-system-map",
    use_cases: MODEL_UI_USE_CASES.map((useCase) => ({
      id: useCase.id,
      label: useCase.label,
      short_label: useCase.short_label,
      activity_summary: useCase.activity_summary,
      index_path: useCase.index_path,
      manifest_path: useCase.manifest_path,
    })),
  };
}

export function modelUiUseCasesForArgs(args = []) {
  const onlyIndex = args.findIndex((arg) => arg === "--use-case");
  if (onlyIndex !== -1) {
    const id = args[onlyIndex + 1];
    const match = MODEL_UI_USE_CASES.find((useCase) => useCase.id === id);
    if (!match) {
      throw new Error(`Unknown model UI use case: ${id}`);
    }
    return [match];
  }

  return MODEL_UI_USE_CASES;
}
