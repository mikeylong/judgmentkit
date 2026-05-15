import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTRACT_PATH = path.resolve(
  __dirname,
  "../contracts/ai-ui-generation.activity-contract.json",
);
const DEFAULT_WORKFLOW_ID = "workflow.ai-ui-generation";
const OPERATOR_REVIEW_PROFILE_ID = "operator-review-ui";
const SURFACE_TYPE_IDS = [
  "marketing",
  "workbench",
  "operator_review",
  "form_flow",
  "dashboard_monitor",
  "content_report",
  "setup_debug_tool",
  "conversation",
];

export class JudgmentKitInputError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "JudgmentKitInputError";
    this.code = options.code ?? "invalid_input";
    if (options.details !== undefined) {
      this.details = options.details;
    }
  }
}

export function loadActivityContract(contractPath = DEFAULT_CONTRACT_PATH) {
  return JSON.parse(fs.readFileSync(contractPath, "utf8"));
}

function getContractWorkflowId(contract) {
  return contract.workflow?.id ?? DEFAULT_WORKFLOW_ID;
}

function getUiWorkflowProfiles(contract) {
  return isPlainObject(contract.profiles) ? contract.profiles : {};
}

function getSurfaceTypes(contract) {
  if (isPlainObject(contract.surface_types)) {
    return contract.surface_types;
  }

  return {};
}

function normalizeOptionalSurfaceType(surfaceType) {
  if (surfaceType === undefined || surfaceType === null) {
    return null;
  }

  if (typeof surfaceType !== "string" || surfaceType.trim().length === 0) {
    throw new JudgmentKitInputError(
      "surface_type must be a non-empty string when provided.",
    );
  }

  return surfaceType.trim();
}

function resolveSurfaceType(contract, surfaceType) {
  const resolvedSurfaceType = normalizeOptionalSurfaceType(surfaceType);

  if (!resolvedSurfaceType) {
    return null;
  }

  const surfaceTypes = getSurfaceTypes(contract);

  if (!surfaceTypes[resolvedSurfaceType]) {
    throw new JudgmentKitInputError(`Unknown surface_type: ${resolvedSurfaceType}.`, {
      details: {
        surface_type: resolvedSurfaceType,
        available_surface_types: Object.keys(surfaceTypes),
      },
    });
  }

  return {
    surface_type: resolvedSurfaceType,
    workflow_id: getContractWorkflowId(contract),
    ...surfaceTypes[resolvedSurfaceType],
  };
}

function normalizeOptionalProfileId(profileId) {
  if (profileId === undefined || profileId === null) {
    return null;
  }

  if (typeof profileId !== "string" || profileId.trim().length === 0) {
    throw new JudgmentKitInputError("profile_id must be a non-empty string when provided.");
  }

  return profileId.trim();
}

function resolveUiWorkflowGuidanceProfile(contract, profileId) {
  const resolvedProfileId = normalizeOptionalProfileId(profileId);

  if (!resolvedProfileId) {
    return null;
  }

  const profiles = getUiWorkflowProfiles(contract);
  const profile = profiles[resolvedProfileId];

  if (!profile) {
    throw new JudgmentKitInputError(
      `Unknown UI workflow guidance profile: ${resolvedProfileId}.`,
      {
        details: {
          profile_id: resolvedProfileId,
          available_profile_ids: Object.keys(profiles),
        },
      },
    );
  }

  return {
    profile_id: resolvedProfileId,
    workflow_id: getContractWorkflowId(contract),
    ...profile,
  };
}

function normalizeText(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countTerm(text, term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) {
    return 0;
  }

  const pattern = new RegExp(`\\b${escapeRegExp(normalizedTerm)}s?\\b`, "g");
  return text.match(pattern)?.length ?? 0;
}

const CONTEXTUAL_IMPLEMENTATION_TERMS = new Map([
  [
    "field",
    [
      "api",
      "attribute",
      "backend",
      "column",
      "crud",
      "data model",
      "database",
      "json",
      "object",
      "property",
      "record",
      "schema",
      "table",
    ],
  ],
  [
    "resource",
    [
      "bundle",
      "id",
      "integration",
      "mcp",
      "prompt",
      "schema",
      "server",
      "tool",
      "workflow",
    ],
  ],
]);

function countContextualTerm(text, term, contextTerms) {
  const normalizedTerm = normalizeText(term);
  const pattern = new RegExp(`\\b${escapeRegExp(normalizedTerm)}s?\\b`, "g");
  let count = 0;

  for (const match of text.matchAll(pattern)) {
    const start = Math.max(0, match.index - 80);
    const end = Math.min(text.length, match.index + match[0].length + 80);
    const window = text.slice(start, end);

    if (
      contextTerms.some((contextTerm) => {
        const contextPattern = new RegExp(`\\b${escapeRegExp(contextTerm)}s?\\b`, "i");
        return contextPattern.test(window);
      })
    ) {
      count += 1;
    }
  }

  return count;
}

function countImplementationTerm(text, term) {
  const normalizedTerm = normalizeText(term);
  const contextTerms = CONTEXTUAL_IMPLEMENTATION_TERMS.get(normalizedTerm);

  if (contextTerms) {
    return countContextualTerm(text, normalizedTerm, contextTerms);
  }

  return countTerm(text, normalizedTerm);
}

function collectImplementationTerms(contract) {
  return unique([
    ...contract.activity_model.implementation_concepts_to_hide,
    ...contract.disclosure_policy.primary_ui_must_not_show,
    ...contract.disclosure_policy.term_replacements.map((entry) => entry.avoid),
  ]);
}

function detectImplementationTerms(input, contract) {
  const normalized = normalizeText(input);

  return collectImplementationTerms(contract)
    .map((term) => ({
      term,
      count: countImplementationTerm(normalized, term),
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => left.term.localeCompare(right.term));
}

function hasAny(text, patterns) {
  const normalized = normalizeText(text);
  return patterns.some((pattern) => normalized.includes(pattern));
}

function hasPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function matchedEvidence(id, label, matched, reason) {
  return {
    id,
    label,
    matched,
    reason,
  };
}

function buildOperatorReviewTriggerEvidence(input, contract) {
  const normalized = normalizeText(input);
  const implementationTermsDetected = detectImplementationTerms(input, contract);
  const hasReviewActor = /\b(?:human|operator|reviewer|lead|manager|approver)\b/.test(normalized) ||
    /\b(?:review|reviews|reviewing|approve|approval|authorize|authorization)\b/.test(normalized);
  const hasProducedWork = /\b(?:ai|system|model|generated|output|workstream|candidate|finding|agent finding|agent output|ai agent)\b/.test(normalized);
  const hasDecision = /\b(?:decision|decide|deciding|approve|block|defer|tighten|handoff|authorize|return|escalate)\b/.test(normalized);
  const hasEvidenceOrRisk = /\b(?:evidence|risk|compare|comparing|confidence|finding|reason|policy|source)\b/.test(normalized);
  const hasAdvancementAction = /\b(?:approve(?:d)?|block(?:ed)?|defer(?:red)?|tighten(?:ed)?|handoff|handed off|return(?:ed)?|escalate(?:d)?|authorize(?:d)?)\b/.test(normalized);
  const hasClosure = /\b(?:handoff|receipt|audit|closure|closed|complete|completion|done|accepted|rejected)\b/.test(normalized);
  const hasRawMechanics = implementationTermsDetected.length > 0 ||
    /\b(?:raw system|internal mechanics|system mechanics|trace|prompt|schema|tool call|resource id|api endpoint|model configuration)\b/.test(normalized);

  return {
    implementationTermsDetected,
    triggers: [
      matchedEvidence(
        "human_review_before_advance",
        "A human reviews AI- or system-produced work before it advances.",
        hasReviewActor && hasProducedWork,
        hasReviewActor && hasProducedWork
          ? "The brief names human review of AI/system/agent/model output."
          : "Human review of produced work is not clear.",
      ),
      matchedEvidence(
        "competing_work_items",
        "Multiple work items, agents, workstreams, candidates, or findings compete for attention.",
        /\b(?:multiple|several|queue|list|items|cases|agents|workstreams|candidates|findings)\b/.test(normalized),
        "Looked for competing items, agents, workstreams, candidates, findings, queues, or lists.",
      ),
      matchedEvidence(
        "evidence_risk_decision",
        "The user compares evidence, understands risk, and makes a bounded decision.",
        hasDecision && hasEvidenceOrRisk,
        hasDecision && hasEvidenceOrRisk
          ? "The brief combines decision language with evidence or risk language."
          : "Decision support with evidence or risk is not clear.",
      ),
      matchedEvidence(
        "bounded_next_step",
        "The next step may be approved, blocked, deferred, tightened, or handed off.",
        hasAdvancementAction,
        "Looked for approve, block, defer, tighten, return, escalate, authorize, or handoff language.",
      ),
      matchedEvidence(
        "handoff_receipt_audit_closure",
        "Completion requires a trustworthy handoff, receipt, audit, or closure state.",
        hasClosure,
        "Looked for handoff, receipt, audit, closure, completion, accepted, or rejected states.",
      ),
      matchedEvidence(
        "raw_mechanics_secondary",
        "Raw system mechanics exist, but should not drive the primary UI.",
        hasRawMechanics,
        implementationTermsDetected.length > 0
          ? "Implementation terms were detected and should stay diagnostic."
          : "Looked for raw or internal system mechanics.",
      ),
    ],
  };
}

function buildOperatorReviewExclusionEvidence(input) {
  const normalized = normalizeText(input);
  const hasDecisionOrReview = /\b(?:review|reviewing|decision|decide|approve|block|handoff|authorize)\b/.test(normalized);

  return [
    matchedEvidence(
      "simple_single_action_form",
      "Simple single-action forms should not use operator-review.",
      /\b(?:single-action form|single action form|simple form|submit form)\b/.test(normalized),
      "Looked for simple form language.",
    ),
    matchedEvidence(
      "passive_dashboard_no_decision",
      "Passive dashboards with no decision should not use operator-review.",
      /\bpassive dashboard\b/.test(normalized) ||
        /\bno decision\b/.test(normalized) ||
        (/\bdashboard\b/.test(normalized) && !hasDecisionOrReview),
      "Looked for passive dashboard or dashboard language without review or decision work.",
    ),
    matchedEvidence(
      "reading_only_content",
      "Content pages and reports meant only for reading should not use operator-review.",
      /\b(?:content page|only for reading|read-only report|reading only|report meant only)\b/.test(normalized),
      "Looked for reading-only page or report language.",
    ),
    matchedEvidence(
      "open_ended_live_chat",
      "Open-ended live chat should not use operator-review.",
      /\b(?:open-ended live chat|open ended live chat|live chat|primary activity is conversation|open-ended conversation|open ended conversation)\b/.test(normalized),
      "Looked for open-ended conversation or live chat language.",
    ),
    matchedEvidence(
      "fully_automated_no_human_review",
      "Fully automated workflows without human review or authorization should not use operator-review.",
      /\bfully automated\b/.test(normalized) ||
        /\bno human review\b/.test(normalized) ||
        /\bno human authorization\b/.test(normalized),
      "Looked for fully automated workflow language or absence of human review.",
    ),
    matchedEvidence(
      "debugging_primary_mechanics",
      "Debugging tools where raw system mechanics are primary should not use operator-review.",
      /\b(?:debugging tool|debug console|raw system mechanics are the primary|system mechanics are the primary|diagnostic console)\b/.test(normalized),
      "Looked for debugging-primary or raw-mechanics-primary language.",
    ),
  ];
}

export function recommendUiWorkflowProfiles(input, options = {}) {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new JudgmentKitInputError(
      "recommendUiWorkflowProfiles requires non-empty text input.",
    );
  }

  const contract = options.contract ?? loadActivityContract(options.contractPath);
  const profile = resolveUiWorkflowGuidanceProfile(contract, OPERATOR_REVIEW_PROFILE_ID);
  const triggerEvidence = buildOperatorReviewTriggerEvidence(input, contract);
  const exclusions = buildOperatorReviewExclusionEvidence(input);
  const matchedTriggers = triggerEvidence.triggers.filter((entry) => entry.matched);
  const matchedExclusions = exclusions.filter((entry) => entry.matched);
  const triggerThreshold = Math.floor(triggerEvidence.triggers.length / 2) + 1;
  const status = matchedExclusions.length > 0
    ? "blocked"
    : matchedTriggers.length >= triggerThreshold
      ? "recommended"
      : "not_recommended";
  const profileSummary = {
    profile_id: profile.profile_id,
    workflow_id: profile.workflow_id,
    pattern_id: profile.pattern_id,
    status,
    trigger_threshold: triggerThreshold,
    trigger_match_count: matchedTriggers.length,
    matched_triggers: matchedTriggers.map((entry) => entry.id),
    matched_exclusions: matchedExclusions.map((entry) => entry.id),
  };

  return {
    version: contract.version,
    contract_id: contract.id,
    workflow_id: getContractWorkflowId(contract),
    recommended_profile_ids: status === "recommended" ? [profile.profile_id] : [],
    blocked_profile_ids: status === "blocked" ? [profile.profile_id] : [],
    recommendations: [profileSummary],
    evidence: {
      [profile.profile_id]: {
        triggers: triggerEvidence.triggers,
        exclusions,
        implementation_terms_detected: triggerEvidence.implementationTermsDetected,
      },
    },
  };
}

function surfaceEvidence(id, label, matched, reason) {
  return matchedEvidence(id, label, matched, reason);
}

function buildSurfaceTypeInputs(input, activityReview, contract) {
  const reviewCandidate = activityReview?.candidate ?? {};
  const activityModel = reviewCandidate.activity_model ?? {};
  const interactionContract = reviewCandidate.interaction_contract ?? {};
  const disclosurePolicy = reviewCandidate.disclosure_policy ?? {};
  const sourceText = [
    input,
    activityModel.activity,
    activityModel.objective,
    ...(toStringArray(activityModel.participants)),
    ...(toStringArray(activityModel.outcomes)),
    ...(toStringArray(activityModel.domain_vocabulary)),
    interactionContract.primary_decision,
    ...(toStringArray(interactionContract.next_actions)),
    interactionContract.completion,
    ...(toStringArray(disclosurePolicy.terms_to_use)),
  ].filter(Boolean).join(" ");
  const implementationTermsDetected = detectImplementationTerms(sourceText, contract);

  return {
    source_text: sourceText,
    normalized: normalizeText(sourceText),
    implementation_terms_detected: implementationTermsDetected,
  };
}

function makeSurfaceScore(surfaceType, triggers, exclusions, definition) {
  const matchedTriggers = triggers.filter((entry) => entry.matched);
  const matchedExclusions = exclusions.filter((entry) => entry.matched);
  const score = Math.max(0, matchedTriggers.length - matchedExclusions.length * 2);

  return {
    surface_type: surfaceType,
    label: definition?.label ?? surfaceType,
    purpose: definition?.purpose ?? "",
    score,
    trigger_match_count: matchedTriggers.length,
    exclusion_match_count: matchedExclusions.length,
    matched_triggers: matchedTriggers.map((entry) => entry.id),
    matched_exclusions: matchedExclusions.map((entry) => entry.id),
    triggers,
    exclusions,
  };
}

function buildSurfaceTypeScore(surfaceType, inputContext, contract) {
  const text = inputContext.normalized;
  const implementationTermsDetected = inputContext.implementation_terms_detected;
  const hasReviewDecision =
    /\b(?:review|reviewing|compare|comparing|decide|deciding|approve|approval|block|handoff|triage|prioritize)\b/.test(text);
  const hasDecision =
    /\b(?:decision|decide|deciding|choose|compare|approve|block|return|handoff|prioritize|resolve)\b/.test(text);
  const hasMarketing =
    /\b(?:marketing|landing page|homepage|home page|campaign|pricing|signup|sign up|trial|demo|conversion|convert|lead|prospect|visitor|buyer|offer|value prop|value proposition|positioning|launch)\b/.test(text);
  const hasSetupDebug =
    /\b(?:setup|configure|configuration|debug|debugging|diagnostic|troubleshoot|test connection|integration setup|audit integration|safe to ship|schema change|prompt template|api endpoint|tool call trace|raw system mechanics)\b/.test(text) ||
    implementationTermsDetected.length > 0;
  const hasConversation =
    /\b(?:chat|conversation|thread|message composer|assistant exchange|live chat|open-ended|open ended)\b/.test(text);
  const definitions = getSurfaceTypes(contract);
  const definition = definitions[surfaceType] ?? {};

  if (surfaceType === "marketing") {
    const triggers = [
      surfaceEvidence(
        "persuade_or_convert",
        "The surface persuades, orients, converts, or explains an offer.",
        hasMarketing,
        "Looked for marketing, landing page, offer, conversion, pricing, signup, or audience language.",
      ),
      surfaceEvidence(
        "public_audience",
        "The audience is a visitor, prospect, buyer, or public reader.",
        /\b(?:visitor|prospect|buyer|public audience|new customer|lead)\b/.test(text),
        "Looked for external audience language.",
      ),
      surfaceEvidence(
        "offer_proof_action",
        "The work needs message, proof, and a primary call to action.",
        /\b(?:benefit|proof|testimonial|case study|cta|call to action|signup|sign up|book a demo|get started)\b/.test(text),
        "Looked for offer, proof, and call-to-action language.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "bounded_work_decision",
        "Workbench decision work should not be treated as marketing.",
        /\b(?:review|reviewing|compare|comparing|approve|approval|block|handoff|triage|queue|workbench|workspace)\b/.test(text),
        "Review, comparison, approval, triage, queue, or handoff language implies work support.",
      ),
      surfaceEvidence(
        "setup_or_debugging",
        "Setup and debugging tools should not be treated as marketing.",
        hasSetupDebug && !hasMarketing,
        "Setup, debugging, integration, or implementation mechanics are primary.",
      ),
    ];

    return makeSurfaceScore(surfaceType, triggers, exclusions, definition);
  }

  if (surfaceType === "workbench") {
    const triggers = [
      surfaceEvidence(
        "inspect_compare_decide_act",
        "The user inspects, compares, decides, and acts.",
        hasReviewDecision,
        "Looked for review, compare, decision, approval, prioritization, triage, or handoff language.",
      ),
      surfaceEvidence(
        "repeated_work_items",
        "The surface supports repeated work across items.",
        /\b(?:queue|list|multiple|several|cases|items|records|requests|findings|workstreams|candidates|workspace|workbench)\b/.test(text),
        "Looked for queues, lists, cases, requests, findings, workstreams, or workbench language.",
      ),
      surfaceEvidence(
        "domain_operator",
        "A domain operator, analyst, manager, lead, or team uses the surface.",
        /\b(?:operator|analyst|manager|lead|reviewer|team|support|operations|planner)\b/.test(text),
        "Looked for operational participant language.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "marketing_primary",
        "Marketing persuasion should not become a workbench.",
        hasMarketing && !hasReviewDecision,
        "Marketing or conversion language is present without work decisions.",
      ),
      surfaceEvidence(
        "conversation_primary",
        "Open-ended conversation should not become a workbench.",
        hasConversation && !hasReviewDecision,
        "Conversation or chat is the primary activity.",
      ),
      surfaceEvidence(
        "passive_monitoring",
        "Passive monitoring should stay a dashboard monitor.",
        /\b(?:passive dashboard|monitor|monitoring|status overview|trend dashboard|health dashboard)\b/.test(text) && !hasReviewDecision,
        "Monitoring or dashboard language appears without decision work.",
      ),
    ];

    return makeSurfaceScore(surfaceType, triggers, exclusions, definition);
  }

  if (surfaceType === "operator_review") {
    const profileRecommendation = recommendUiWorkflowProfiles(inputContext.source_text, {
      contract,
    });
    const profile = profileRecommendation.recommendations[0] ?? {};
    const evidence = profileRecommendation.evidence[OPERATOR_REVIEW_PROFILE_ID] ?? {};
    const triggers = (evidence.triggers ?? []).map((entry) =>
      surfaceEvidence(entry.id, entry.label, entry.matched, entry.reason),
    );
    const exclusions = (evidence.exclusions ?? []).map((entry) =>
      surfaceEvidence(entry.id, entry.label, entry.matched, entry.reason),
    );
    const score = makeSurfaceScore(surfaceType, triggers, exclusions, definition);

    return {
      ...score,
      score:
        profile.status === "recommended"
          ? Math.max(score.score, 4)
          : profile.status === "blocked"
            ? 0
            : Math.min(score.score, 1),
      profile_id: OPERATOR_REVIEW_PROFILE_ID,
      profile_status: profile.status,
    };
  }

  if (surfaceType === "form_flow") {
    const triggers = [
      surfaceEvidence(
        "collect_or_change_structured_information",
        "The surface collects or changes structured information.",
        /\b(?:form|submit|intake|application|onboarding|settings|profile|checkout|edit|update|create|enter|collect|structured information)\b/.test(text),
        "Looked for form, submit, intake, onboarding, settings, profile, edit, update, or collect language.",
      ),
      surfaceEvidence(
        "validation_or_required_inputs",
        "Completion depends on validation or required inputs.",
        /\b(?:validation|required|invalid|input|field|error state|save changes|confirm)\b/.test(text),
        "Looked for validation, required inputs, save, confirm, or input language.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "multi_item_review",
        "Multi-item review belongs in a workbench or operator review surface.",
        /\b(?:queue|multiple|several|compare|review findings|triage)\b/.test(text),
        "Reviewing multiple items is not primarily a form flow.",
      ),
      surfaceEvidence(
        "marketing_primary",
        "Marketing pages may contain forms but are not primarily form flows.",
        hasMarketing && !/\b(?:settings|profile|application|intake)\b/.test(text),
        "Marketing conversion language is dominant.",
      ),
    ];

    return makeSurfaceScore(surfaceType, triggers, exclusions, definition);
  }

  if (surfaceType === "dashboard_monitor") {
    const triggers = [
      surfaceEvidence(
        "monitor_status_or_trends",
        "The surface tracks status, exceptions, trends, or operational health.",
        /\b(?:dashboard|monitor|monitoring|metrics|status|trend|trends|health|kpi|alert|alerts|overview|analytics)\b/.test(text),
        "Looked for dashboard, monitor, metrics, status, trends, health, alerts, overview, or analytics language.",
      ),
      surfaceEvidence(
        "passive_or_periodic_read",
        "The surface is used for passive or periodic status reading.",
        /\b(?:passive|overview|at a glance|track|tracking|watch|weekly|daily status|no decision)\b/.test(text),
        "Looked for passive, overview, tracking, watching, or no-decision language.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "bounded_decision_work",
        "Bounded review decisions should not be reduced to a dashboard.",
        /\b(?:approve|block|return|handoff|decide whether|triage)\b/.test(text),
        "Approval, blocking, return, handoff, or triage language implies work support.",
      ),
      surfaceEvidence(
        "marketing_primary",
        "Marketing analytics pages should not become dashboards unless monitoring is primary.",
        hasMarketing && !/\b(?:monitor|metrics|dashboard|analytics)\b/.test(text),
        "Marketing language is present without monitoring language.",
      ),
    ];

    return makeSurfaceScore(surfaceType, triggers, exclusions, definition);
  }

  if (surfaceType === "content_report") {
    const triggers = [
      surfaceEvidence(
        "read_understand_or_share",
        "The surface is for reading, understanding, citing, or sharing information.",
        /\b(?:content page|report|article|doc|docs|documentation|guide|read|learn|cite|share|publish|reference|case study)\b/.test(text),
        "Looked for report, article, docs, guide, reading, citing, sharing, publishing, reference, or case-study language.",
      ),
      surfaceEvidence(
        "linear_narrative",
        "The information is primarily narrative or explanatory.",
        /\b(?:narrative|summary|briefing|analysis report|explain|explanation|writeup)\b/.test(text),
        "Looked for narrative, summary, briefing, report, explanation, or writeup language.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "active_decision_work",
        "Active decisions should not become reading-only content.",
        hasDecision && !/\b(?:report decision|share decision)\b/.test(text),
        "Decision, comparison, approval, or handoff language is present.",
      ),
      surfaceEvidence(
        "marketing_primary",
        "Marketing persuasion should use marketing guidance rather than a generic report.",
        hasMarketing,
        "Marketing or conversion language is present.",
      ),
    ];

    return makeSurfaceScore(surfaceType, triggers, exclusions, definition);
  }

  if (surfaceType === "setup_debug_tool") {
    const rawMechanicsPrimary =
      /\b(?:setup|configure|configuration|debug|debugging|diagnostic|troubleshoot|test connection|integration setup|audit integration|safe to ship|release risk|schema change|prompt template|api endpoint|tool call|trace|mcp server)\b/.test(text);
    const triggers = [
      surfaceEvidence(
        "configure_inspect_test_or_troubleshoot",
        "The surface configures, inspects, tests, or troubleshoots machinery.",
        rawMechanicsPrimary,
        "Looked for setup, configuration, debugging, diagnostics, troubleshooting, integration, or test language.",
      ),
      surfaceEvidence(
        "implementation_terms_are_task_material",
        "Implementation details are part of the task material.",
        implementationTermsDetected.length > 0,
        implementationTermsDetected.length > 0
          ? "Implementation terms were detected in the source."
          : "No implementation terms were detected.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "raw_mechanics_are_diagnostic_only",
        "If raw mechanics are diagnostic only, do not make them the primary setup surface.",
        /\b(?:stay diagnostic|diagnostic only|remain diagnostic|should not drive the primary ui)\b/.test(text) &&
          !/\b(?:setup|configure|debug|troubleshoot|test connection|safe to ship)\b/.test(text),
        "The brief says raw mechanics should stay diagnostic.",
      ),
      surfaceEvidence(
        "marketing_primary",
        "Marketing pages should not become setup tools.",
        hasMarketing && !rawMechanicsPrimary,
        "Marketing language is present without setup or debugging language.",
      ),
    ];

    return makeSurfaceScore(surfaceType, triggers, exclusions, definition);
  }

  if (surfaceType === "conversation") {
    const triggers = [
      surfaceEvidence(
        "thread_is_primary_surface",
        "The thread or message exchange is the primary surface.",
        hasConversation,
        "Looked for chat, conversation, thread, message composer, live chat, or open-ended exchange language.",
      ),
      surfaceEvidence(
        "open_ended_exchange",
        "The activity is open-ended exchange rather than a bounded handoff.",
        /\b(?:open-ended|open ended|back and forth|ask questions|respond|reply)\b/.test(text),
        "Looked for open-ended exchange language.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "bounded_completion",
        "Bounded decision and handoff work should not become conversation-first.",
        /\b(?:approve|block|handoff|submit|complete|completion state|decide whether)\b/.test(text),
        "Bounded decision, completion, or handoff language is present.",
      ),
      surfaceEvidence(
        "marketing_primary",
        "Marketing pages should not become conversation-first unless chat is the main offer.",
        hasMarketing && !/\b(?:chat|conversation|assistant)\b/.test(text),
        "Marketing language is present without conversation language.",
      ),
    ];

    return makeSurfaceScore(surfaceType, triggers, exclusions, definition);
  }

  return makeSurfaceScore(surfaceType, [], [], definition);
}

function chooseSurfaceType(scores) {
  const priority = [
    "setup_debug_tool",
    "operator_review",
    "workbench",
    "form_flow",
    "dashboard_monitor",
    "marketing",
    "content_report",
    "conversation",
  ];

  return [...scores].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return priority.indexOf(left.surface_type) - priority.indexOf(right.surface_type);
  })[0];
}

function surfaceConfidence(activityReview, bestScore) {
  if (activityReview?.review_status && activityReview.review_status !== "ready_for_review") {
    return "low";
  }

  if (bestScore >= 3) {
    return "high";
  }

  if (bestScore >= 1) {
    return "medium";
  }

  return "low";
}

function buildSurfaceImplications(surfaceType) {
  const implications = {
    marketing: {
      interaction_implications: {
        primary_structure: "Audience need, offer, proof, and primary action.",
        make_easy: ["Understand the offer", "Trust the proof", "Take the next step"],
        make_harder: ["Expose implementation mechanics", "Force operational review behavior"],
        completion_focus: "The visitor knows the offer and has a clear next action.",
      },
      disclosure_implications: {
        primary_ui_rule: "Keep implementation details out of the public-facing message.",
        reveal_implementation_terms: false,
        diagnostic_contexts: ["setup", "auditing"],
      },
      frontend_posture: {
        density: "editorial",
        navigation_shape: "section sequence with clear primary action",
        state_coverage: ["responsive header", "primary action states", "lead capture validation when present"],
        responsive_expectations: "Mobile must preserve the offer, proof, and action without hiding the next step.",
        component_families: ["hero", "proof points", "testimonial or evidence band", "call-to-action"],
      },
    },
    workbench: {
      interaction_implications: {
        primary_structure: "Item selection, detail evidence, decision controls, and completion state.",
        make_easy: ["Scan work", "Compare evidence", "Make a bounded decision", "Complete the next action"],
        make_harder: ["Turn work into passive metrics", "Separate actions from evidence"],
        completion_focus: "The user advances the selected work with a clear result.",
      },
      disclosure_implications: {
        primary_ui_rule: "Primary UI uses domain terms; diagnostics stay secondary.",
        reveal_implementation_terms: false,
        diagnostic_contexts: ["debugging", "auditing", "explicit source inspection"],
      },
      frontend_posture: {
        density: "operational",
        navigation_shape: "master-detail, split workspace, or queue-detail flow",
        state_coverage: ["loading", "empty queue", "selected item", "decision pending", "completed handoff", "error"],
        responsive_expectations: "Small screens need an explicit path between list, detail, decision, and completion.",
        component_families: ["queue", "detail panel", "evidence list", "decision controls", "handoff receipt"],
      },
    },
    operator_review: {
      interaction_implications: {
        primary_structure: "Produced work, evidence, risk, bounded decision, and audit or handoff.",
        make_easy: ["Identify current item", "Compare evidence", "Understand risk", "Choose approve/block/return/handoff"],
        make_harder: ["Let raw system mechanics dominate", "Approve without evidence adjacency"],
        completion_focus: "The review leaves a receipt or handoff with the chosen path and reason.",
      },
      disclosure_implications: {
        primary_ui_rule: "System mechanics are diagnostic unless the activity is explicitly auditing them.",
        reveal_implementation_terms: false,
        diagnostic_contexts: ["auditing", "debugging", "explicit source inspection"],
      },
      frontend_posture: {
        density: "dense but bounded",
        navigation_shape: "review queue with evidence-adjacent actions",
        state_coverage: ["queued", "selected", "needs evidence", "approved", "blocked", "returned", "handoff sent"],
        responsive_expectations: "Mobile must keep evidence and action context together before a decision is submitted.",
        component_families: ["review queue", "evidence panel", "risk indicators", "decision bar", "receipt"],
      },
    },
    form_flow: {
      interaction_implications: {
        primary_structure: "Input groups, validation, review, submit, and confirmation.",
        make_easy: ["Enter required information", "Resolve validation", "Submit confidently"],
        make_harder: ["Hide errors", "Mix unrelated decisions into the form"],
        completion_focus: "The user knows the submission or change succeeded.",
      },
      disclosure_implications: {
        primary_ui_rule: "Fields are named in user/domain language, not storage or schema language.",
        reveal_implementation_terms: false,
        diagnostic_contexts: ["debugging", "integration"],
      },
      frontend_posture: {
        density: "guided",
        navigation_shape: "single form or stepped flow",
        state_coverage: ["initial", "dirty", "validating", "invalid", "submitting", "submitted", "failed"],
        responsive_expectations: "Mobile input order must follow the task and keep validation messages adjacent.",
        component_families: ["input group", "validation message", "stepper", "summary", "confirmation"],
      },
    },
    dashboard_monitor: {
      interaction_implications: {
        primary_structure: "Status summary, trends, exceptions, filters, and escalation paths.",
        make_easy: ["See current status", "Notice exceptions", "Track changes over time"],
        make_harder: ["Imply a decision when the task is only monitoring", "Hide stale data"],
        completion_focus: "The user knows status, exceptions, and whether follow-up is needed.",
      },
      disclosure_implications: {
        primary_ui_rule: "Metrics and statuses use domain language; source mechanics remain diagnostic.",
        reveal_implementation_terms: false,
        diagnostic_contexts: ["auditing", "debugging"],
      },
      frontend_posture: {
        density: "scannable",
        navigation_shape: "overview with drill-in filters",
        state_coverage: ["loading", "empty data", "stale data", "healthy", "warning", "critical", "drill-in"],
        responsive_expectations: "Mobile must preserve status priority and exception access before secondary charts.",
        component_families: ["status summary", "trend chart", "exception list", "filter controls", "drill-in panel"],
      },
    },
    content_report: {
      interaction_implications: {
        primary_structure: "Title, summary, sections, evidence, references, and share or export action.",
        make_easy: ["Read the argument", "Find evidence", "Share or cite the result"],
        make_harder: ["Turn reading into unnecessary operational controls"],
        completion_focus: "The reader understands the information and can cite or share it.",
      },
      disclosure_implications: {
        primary_ui_rule: "Expose source/provenance only when it helps trust, citation, or audit.",
        reveal_implementation_terms: false,
        diagnostic_contexts: ["auditing", "explicit source inspection"],
      },
      frontend_posture: {
        density: "readable",
        navigation_shape: "document outline or report sections",
        state_coverage: ["loading", "empty", "section anchor", "citation copy", "share/export failed"],
        responsive_expectations: "Mobile must keep reading order, anchors, and citations usable.",
        component_families: ["summary", "section", "evidence callout", "reference list", "share action"],
      },
    },
    setup_debug_tool: {
      interaction_implications: {
        primary_structure: "Configuration, test result, diagnostic evidence, remediation, and handoff.",
        make_easy: ["Inspect configuration", "Run or review checks", "Identify failure cause", "Apply next fix"],
        make_harder: ["Hide details needed for debugging", "Present diagnostics as product copy"],
        completion_focus: "The user knows whether setup is valid or what to fix next.",
      },
      disclosure_implications: {
        primary_ui_rule: "Implementation details may be primary when the task is explicitly setup, debugging, auditing, or integration.",
        reveal_implementation_terms: true,
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration", "explicit source inspection"],
      },
      frontend_posture: {
        density: "diagnostic",
        navigation_shape: "configuration and results with expandable evidence",
        state_coverage: ["unchecked", "running", "passed", "warning", "failed", "retrying", "details expanded"],
        responsive_expectations: "Mobile must keep the current check, result, and remediation visible before raw logs.",
        component_families: ["configuration panel", "checklist", "test result", "log detail", "remediation action"],
      },
    },
    conversation: {
      interaction_implications: {
        primary_structure: "Thread, composer, context, response states, and handoff when needed.",
        make_easy: ["Read the exchange", "Respond", "Recover from failed sends", "Preserve context"],
        make_harder: ["Force a rigid workflow when conversation is the work"],
        completion_focus: "The participant can continue or close the exchange with context intact.",
      },
      disclosure_implications: {
        primary_ui_rule: "System instructions and tool traces stay hidden unless the conversation is explicitly diagnostic.",
        reveal_implementation_terms: false,
        diagnostic_contexts: ["debugging", "auditing", "explicit source inspection"],
      },
      frontend_posture: {
        density: "threaded",
        navigation_shape: "conversation thread with persistent composer",
        state_coverage: ["empty thread", "sending", "streaming", "sent", "failed", "retry", "handoff"],
        responsive_expectations: "Mobile must keep the latest message and composer usable together.",
        component_families: ["message thread", "composer", "attachment affordance", "status indicator", "handoff action"],
      },
    },
  };

  return implications[surfaceType] ?? implications.workbench;
}

export function recommendSurfaceTypes(input, options = {}) {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new JudgmentKitInputError(
      "recommendSurfaceTypes requires non-empty text input.",
    );
  }

  const contract = options.contract ?? loadActivityContract(options.contractPath);
  const activityReview = isPlainObject(options.activity_review)
    ? options.activity_review
    : isPlainObject(options.activityReview)
      ? options.activityReview
      : createActivityModelReview(input, options);
  const inputContext = buildSurfaceTypeInputs(input.trim(), activityReview, contract);
  const scores = SURFACE_TYPE_IDS.map((surfaceType) =>
    buildSurfaceTypeScore(surfaceType, inputContext, contract),
  );
  const recommended = chooseSurfaceType(scores);
  const confidence = surfaceConfidence(activityReview, recommended.score);
  const blockedSurfaceTypes = scores
    .filter((entry) => entry.surface_type !== recommended.surface_type)
    .filter((entry) => entry.exclusion_match_count > 0 || entry.profile_status === "blocked")
    .map((entry) => entry.surface_type);
  const implications = buildSurfaceImplications(recommended.surface_type);
  const packet = {
    version: contract.version,
    contract_id: contract.id,
    workflow_id: getContractWorkflowId(contract),
    status: activityReview.review_status === "ready_for_review" ? "ready" : "needs_source_context",
    recommended_surface_type: recommended.surface_type,
    blocked_surface_types: unique(blockedSurfaceTypes),
    confidence,
    evidence: {
      activity_review_status: activityReview.review_status,
      input_excerpt: input.trim().slice(0, 240),
      implementation_terms_detected: inputContext.implementation_terms_detected,
      surface_type_scores: scores.map((entry) => ({
        surface_type: entry.surface_type,
        label: entry.label,
        purpose: entry.purpose,
        score: entry.score,
        trigger_match_count: entry.trigger_match_count,
        exclusion_match_count: entry.exclusion_match_count,
        matched_triggers: entry.matched_triggers,
        matched_exclusions: entry.matched_exclusions,
        ...(entry.profile_id
          ? {
              profile_id: entry.profile_id,
              profile_status: entry.profile_status,
            }
          : {}),
      })),
      selected_definition: resolveSurfaceType(contract, recommended.surface_type),
    },
    interaction_implications: implications.interaction_implications,
    disclosure_implications: implications.disclosure_implications,
    frontend_posture: implications.frontend_posture,
  };

  return packet;
}

function summarizeSurfaceReview(surfaceReview, { includeFrontendPosture = false } = {}) {
  if (!isPlainObject(surfaceReview)) {
    return null;
  }

  const summary = {
    recommended_surface_type: optionalString(surfaceReview.recommended_surface_type),
    blocked_surface_types: toStringArray(surfaceReview.blocked_surface_types),
    confidence: optionalString(surfaceReview.confidence),
    interaction_implications: isPlainObject(surfaceReview.interaction_implications)
      ? surfaceReview.interaction_implications
      : {},
    disclosure_implications: isPlainObject(surfaceReview.disclosure_implications)
      ? surfaceReview.disclosure_implications
      : {},
  };

  if (includeFrontendPosture) {
    summary.frontend_posture = isPlainObject(surfaceReview.frontend_posture)
      ? surfaceReview.frontend_posture
      : {};
  }

  return summary;
}

function inferActivityEvidence(input) {
  return {
    hasActivity: hasAny(input, [
      "activity",
      "workflow",
      "reviewing",
      "review",
      "deciding",
      "handoff",
      "approving",
      "guiding",
    ]),
    hasDomain: hasAny(input, [
      "domain",
      "customer",
      "patient",
      "designer",
      "operator",
      "support",
      "analyst",
      "manager",
      "reviewer",
      "planner",
    ]),
    hasDecision: hasAny(input, [
      "decision",
      "decide",
      "deciding",
      "choose",
      "approve",
      "triage",
      "prioritize",
      "compare",
      "resolve",
    ]),
    hasOutcome: hasAny(input, [
      "outcome",
      "complete",
      "done",
      "handoff",
      "next action",
      "finish",
      "submit",
      "publish",
      "ship",
    ]),
  };
}

function splitSentences(input) {
  return input
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim().replace(/[.!?]$/, ""))
    .filter(Boolean) ?? [];
}

function cleanClause(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:]+|[\s,;:.]+$/g, "")
    .trim();
}

function cleanDomainTerm(value) {
  let term = cleanClause(value).toLowerCase();

  for (let index = 0; index < 4; index += 1) {
    const previous = term;
    term = term
      .replace(/^(?:activity|outcome)\s+is\s+/i, "")
      .replace(
        /^(?:is|are|was|were|during|with|for|then|and|or|to|sent to|returned to|approving|comparing|reviewing|auditing|producing|leaving)\s+/i,
        "",
      )
      .replace(/^(?:is\s+)?deciding\s+(?:whether|which)\s+/i, "")
      .replace(/^should\s+handle\s+/i, "")
      .replace(/^(?:a|an|the|which|what|whether|that|this)\s+/i, "")
      .replace(/^(?:clear|completed)\s+/i, "")
      .trim();

    if (term === previous) {
      break;
    }
  }

  return term.replace(/\s+should\b.*$/i, "").trim();
}

function textIncludesTerm(text, term) {
  return normalizeText(text).includes(normalizeText(term));
}

function containsDetectedImplementationTerm(value, implementationTermsDetected) {
  return implementationTermsDetected.some(({ term }) => textIncludesTerm(value, term));
}

function isUsefulObservedTerm(term, implementationTermsDetected) {
  return (
    term.length > 2 &&
    !containsDetectedImplementationTerm(term, implementationTermsDetected) &&
    !["admin screen", "ui", "system"].includes(term)
  );
}

function extractPatternMatches(input, pattern, formatter = (match) => match[1]) {
  const values = [];

  for (const match of input.matchAll(pattern)) {
    const value = cleanClause(formatter(match));

    if (value) {
      values.push(value);
    }
  }

  return values;
}

function extractObservedActivity(input) {
  const explicitActivity = input.match(/\bactivity\s+(?:is|supports|being supported is)\s+([^.!?]+)/i);

  if (explicitActivity) {
    return cleanClause(explicitActivity[1].replace(/\bthen\b.*$/i, ""));
  }

  const activitySentence = splitSentences(input).find((sentence) =>
    /\b(?:reviewing|auditing|deciding|approving|guiding|triaging|planning|evaluating|checking|handling)\b/i.test(
      sentence,
    ),
  );

  if (!activitySentence) {
    return null;
  }

  const actorAction = activitySentence.match(
    /\b(?:is|are)\s+((?:reviewing|auditing|deciding|approving|guiding|triaging|planning|evaluating|checking|handling)\b[^.!?]+)/i,
  );

  return cleanClause(actorAction?.[1] ?? activitySentence);
}

function extractObservedParticipants(input) {
  const participants = extractPatternMatches(
    input,
    /\b(?:a|an|the)\s+((?:[a-z]+(?: [a-z]+){0,3} )?(?:lead|manager|reviewer|designer|engineer|expert|operator|analyst|planner|agent|team))\b/gi,
  ).map(cleanDomainTerm);

  return unique(participants);
}

function extractObservedDecisions(input) {
  const decisions = [
    ...extractPatternMatches(
      input,
      /\bdecid(?:e|ing)\s+(whether|which)\s+([^.!?]+)/gi,
      (match) => `${match[1]} ${match[2]}`.replace(/,?\s+then\b.*$/i, ""),
    ),
    ...extractPatternMatches(
      input,
      /\bchoos(?:e|ing)\s+([^.!?]+)/gi,
      (match) => match[1].replace(/,?\s+then\b.*$/i, ""),
    ),
  ];

  return unique(decisions);
}

function extractObservedOutcomes(input) {
  const outcomes = [
    ...extractPatternMatches(input, /\boutcome\s+is\s+([^.!?]+)/gi),
    ...extractPatternMatches(input, /\bproducing\s+([^.!?]*\bhandoff\b[^.!?]*)/gi),
    ...extractPatternMatches(input, /\bleav(?:e|es|ing)\s+[^.!?]*?\s+with\s+([^.!?]+)/gi),
  ];

  return unique(outcomes);
}

function extractObservedNextActions(input) {
  return unique(
    splitSentences(input)
      .filter((sentence) => /\b(?:next action|handoff)\b/i.test(sentence))
      .map(cleanClause),
  );
}

function extractObservedDomainTerms(input, participants, implementationTermsDetected) {
  const candidateTerms = [
    ...participants,
    ...extractPatternMatches(
      input,
      /\b(?:reviewing|auditing|comparing|approving|checking|triaging|planning|evaluating)\s+([^,.]+?)(?:\s+during|,|\.|$)/gi,
    ),
    ...extractPatternMatches(input, /\bduring\s+(?:the\s+)?([^,.]+?workflow)\b/gi),
    ...extractPatternMatches(
      input,
      /\b([a-z]+(?: [a-z]+){0,3} (?:requests|workflow|case|review|evidence|handoff|action|decision|team|visits|technician|job|constraints|lead|manager|agent))\b/gi,
    ),
  ]
    .map(cleanDomainTerm)
    .filter((term) => isUsefulObservedTerm(term, implementationTermsDetected));

  return unique(candidateTerms).slice(0, 12);
}

function safePrimaryText(value, implementationTermsDetected, fallback) {
  if (!value || containsDetectedImplementationTerm(value, implementationTermsDetected)) {
    return fallback;
  }

  return value;
}

function sentenceCase(value) {
  const cleaned = cleanClause(value);

  if (!cleaned) {
    return cleaned;
  }

  return `${cleaned[0].toUpperCase()}${cleaned.slice(1)}`;
}

function ensureSentence(value) {
  const cleaned = cleanClause(value);

  if (!cleaned) {
    return cleaned;
  }

  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function buildTranslationCandidates(contract, implementationTermsDetected) {
  const replacements = new Map(
    contract.disclosure_policy.term_replacements.map((entry) => [
      normalizeText(entry.avoid),
      entry.prefer,
    ]),
  );

  return implementationTermsDetected.map(({ term, count }) => ({
    detected_term: term,
    count,
    prefer: replacements.get(normalizeText(term)) ?? "domain language",
  }));
}

function extractObservedBriefDetails(input, contract, implementationTermsDetected) {
  const observedParticipants = extractObservedParticipants(input);
  const observedActivity = extractObservedActivity(input);
  const observedOutcomes = extractObservedOutcomes(input);
  const observedPrimaryDecisions = extractObservedDecisions(input);
  const observedNextActions = extractObservedNextActions(input);
  const observedDomainTerms = extractObservedDomainTerms(
    input,
    observedParticipants,
    implementationTermsDetected,
  );

  return {
    observed_activity: observedActivity,
    observed_participants: observedParticipants,
    observed_domain_terms: observedDomainTerms,
    observed_outcomes: observedOutcomes,
    observed_primary_decisions: observedPrimaryDecisions,
    observed_next_actions: observedNextActions,
    observed_completion: observedOutcomes[0] ?? observedNextActions[0] ?? null,
    diagnostic_terms_detected: implementationTermsDetected.map(({ term, count }) => ({
      detected_term: term,
      count,
    })),
    translation_candidates: buildTranslationCandidates(contract, implementationTermsDetected),
  };
}

function buildReviewQuestions(evidence, implementationTermsDetected) {
  const questions = [];

  if (!evidence.hasActivity) {
    questions.push("What activity should this UI support before any screen structure is proposed?");
  }

  if (!evidence.hasDomain) {
    questions.push("What domain vocabulary should appear in the primary interface?");
  }

  if (!evidence.hasDecision) {
    questions.push("What decision or next action should the UI make easier for the user?");
  }

  if (!evidence.hasOutcome) {
    questions.push("What should the user leave the surface knowing or having done?");
  }

  if (implementationTermsDetected.length > 0) {
    questions.push(
      "Which detected implementation details are diagnostic only, and which should be translated into domain language?",
    );
  }

  return questions;
}

function buildActivityModel(contract, input, evidence, observed) {
  return {
    activity_supported: evidence.hasActivity
      ? "A stated user activity from the brief, translated before screen structure."
      : contract.activity_model.activity_supported,
    participants: contract.activity_model.participants,
    objective: contract.activity_model.objective,
    outcomes: contract.activity_model.outcomes,
    observed_activity: observed.observed_activity,
    observed_participants: observed.observed_participants,
    observed_domain_terms: observed.observed_domain_terms,
    observed_outcomes: observed.observed_outcomes,
    evidence: {
      activity: evidence.hasActivity,
      domain_vocabulary: evidence.hasDomain,
      decision: evidence.hasDecision,
      outcome: evidence.hasOutcome,
      input_excerpt: input.slice(0, 240),
    },
  };
}

function buildInteractionContract(contract, evidence, observed) {
  return {
    user_is_trying_to: contract.interaction_contract.user_is_trying_to,
    user_thinks_about_work_as: contract.interaction_contract.user_thinks_about_work_as,
    user_does_not_think_about_work_as:
      contract.interaction_contract.user_does_not_think_about_work_as,
    primary_decisions: contract.interaction_contract.primary_decisions,
    make_easy: contract.interaction_contract.make_easy,
    make_harder: contract.interaction_contract.make_harder,
    state_changes: evidence.hasActivity
      ? ["activity modeled", "interaction contract ready", "disclosure boundary ready"]
      : ["activity unknown", "blocked for review questions"],
    leave_screen_knowing_or_done:
      contract.interaction_contract.leave_screen_knowing_or_done,
    observed_primary_decisions: observed.observed_primary_decisions,
    observed_next_actions: observed.observed_next_actions,
    observed_completion: observed.observed_completion,
  };
}

function buildDisclosurePolicy(contract, observed) {
  return {
    primary_ui_can_show: contract.disclosure_policy.primary_ui_can_show,
    primary_ui_must_not_show: contract.disclosure_policy.primary_ui_must_not_show,
    diagnostic_contexts: contract.disclosure_policy.diagnostic_contexts,
    term_replacements: contract.disclosure_policy.term_replacements,
    diagnostic_terms_detected: observed.diagnostic_terms_detected,
    translation_candidates: observed.translation_candidates,
  };
}

function buildUiBrief(contract, evidence, status, observed, implementationTermsDetected) {
  return {
    purpose: evidence.hasActivity
      ? "Support the named activity with a concise surface focused on decisions and next actions."
      : "Clarify the activity before proposing a primary surface.",
    primary_user_action: evidence.hasDecision
      ? "Make the next meaningful decision visible and easy to complete."
      : "Identify the decision or next action the surface should support.",
    activity_focus: safePrimaryText(
      observed.observed_activity,
      implementationTermsDetected,
      evidence.hasActivity
        ? "Support the named activity without exposing source mechanics."
        : "Clarify the activity before proposing a primary surface.",
    ),
    primary_decision: safePrimaryText(
      observed.observed_primary_decisions[0],
      implementationTermsDetected,
      evidence.hasDecision
        ? "Make the next meaningful decision visible and easy to complete."
        : "Identify the decision or next action the surface should support.",
    ),
    outcome: safePrimaryText(
      observed.observed_completion,
      implementationTermsDetected,
      evidence.hasOutcome
        ? "A clear handoff with the next action."
        : "Clarify what the user should leave knowing or having done.",
    ),
    terms_to_use: evidence.hasActivity
      ? observed.observed_domain_terms.filter(
          (term) => !containsDetectedImplementationTerm(term, implementationTermsDetected),
        )
      : [],
    decisions_supported: contract.interaction_contract.primary_decisions.slice(0, 4),
    domain_terms: contract.activity_model.domain_vocabulary.filter(
      (term) => term !== "diagnostic detail",
    ),
    handoff_notes: [
      "Keep source mechanics out of the primary surface.",
      "Reveal source mechanics only for setup, debugging, auditing, integration, or explicit inspection.",
      status === "ready"
        ? "Proceed to a UI brief after confirming the domain terms."
        : "Answer review questions before generating screens.",
    ],
  };
}

function primaryCandidateValue(value, implementationTermsDetected, fallback) {
  return sentenceCase(safePrimaryText(value, implementationTermsDetected, fallback));
}

function safeCandidateList(values, implementationTermsDetected) {
  return values.filter((value) => !containsDetectedImplementationTerm(value, implementationTermsDetected));
}

function buildCandidateActivity(analyzerPacket) {
  const { activity_model: activityModel, implementation_terms_detected: termsDetected } =
    analyzerPacket;
  const participant = safeCandidateList(activityModel.observed_participants, termsDetected)[0];
  const terms = analyzerPacket.ui_brief.terms_to_use;
  const workflow = terms.find((term) => term.includes("workflow"));
  const reviewObject = terms.find((term) =>
    /\b(?:requests|visits|cases|case|handoff|review)\b/.test(term),
  );

  if (participant && reviewObject && workflow) {
    return ensureSentence(sentenceCase(`${participant} reviews ${reviewObject} during ${workflow}`));
  }

  if (participant && reviewObject) {
    return ensureSentence(sentenceCase(`${participant} reviews ${reviewObject}`));
  }

  if (participant && workflow) {
    return ensureSentence(sentenceCase(`${participant} reviews ${workflow}`));
  }

  return ensureSentence(
    primaryCandidateValue(
      analyzerPacket.ui_brief.activity_focus,
      termsDetected,
      "Clarify the activity before proposing a primary surface",
    ),
  );
}

function buildCandidateObjective(analyzerPacket) {
  return ensureSentence(
    primaryCandidateValue(
      analyzerPacket.ui_brief.primary_decision,
      analyzerPacket.implementation_terms_detected,
      "Clarify the decision or next action the surface should support",
    ),
  );
}

function buildCandidateActivityModel(analyzerPacket) {
  const termsDetected = analyzerPacket.implementation_terms_detected;

  return {
    activity: buildCandidateActivity(analyzerPacket),
    participants: safeCandidateList(analyzerPacket.activity_model.observed_participants, termsDetected),
    objective: buildCandidateObjective(analyzerPacket),
    outcomes: [
      ensureSentence(
        primaryCandidateValue(
          analyzerPacket.ui_brief.outcome,
          termsDetected,
          "Clarify what the user should leave knowing or having done",
        ),
      ),
    ],
    domain_vocabulary: analyzerPacket.ui_brief.terms_to_use,
  };
}

function buildCandidateInteractionContract(analyzerPacket) {
  const termsDetected = analyzerPacket.implementation_terms_detected;
  const nextActions = safeCandidateList(
    analyzerPacket.interaction_contract.observed_next_actions,
    termsDetected,
  ).map((action) => ensureSentence(sentenceCase(action)));

  return {
    primary_decision: ensureSentence(
      primaryCandidateValue(
        analyzerPacket.ui_brief.primary_decision,
        termsDetected,
        "Identify the decision or next action the surface should support",
      ),
    ),
    next_actions: nextActions,
    completion: ensureSentence(
      primaryCandidateValue(
        analyzerPacket.ui_brief.outcome,
        termsDetected,
        "Clarify what the user should leave knowing or having done",
      ),
    ),
    make_easy: [
      "Confirm the activity model before screen structure.",
      "Review the primary decision and outcome in domain language.",
      "Adjust vocabulary before implementation detail reaches the primary UI.",
    ],
  };
}

function buildCandidateDisclosurePolicy(analyzerPacket) {
  return {
    terms_to_use: analyzerPacket.ui_brief.terms_to_use,
    hidden_implementation_terms: analyzerPacket.disclosure_policy.diagnostic_terms_detected,
    translation_candidates: analyzerPacket.disclosure_policy.translation_candidates,
    diagnostic_contexts: analyzerPacket.disclosure_policy.diagnostic_contexts,
  };
}

function selectTargetedQuestions(reviewQuestions) {
  const priorities = [
    /activity/i,
    /decision|next action/i,
    /leave the surface|knowing|done|outcome/i,
    /diagnostic|implementation details|translated/i,
  ];
  const selected = [];

  for (const priority of priorities) {
    const question = reviewQuestions.find(
      (candidate) => priority.test(candidate) && !selected.includes(candidate),
    );

    if (question) {
      selected.push(question);
    }

    if (selected.length === 3) {
      return selected;
    }
  }

  return selected;
}

function selectTargetedQuestionsFromCandidates(questions) {
  return unique(questions).slice(0, 3);
}

function buildReviewAssumptions(analyzerPacket, source) {
  const assumptions = [
    "Treat this as a draft activity model for review, not a final source of truth.",
  ];

  if (source.mode === "model_assisted") {
    assumptions.push(
      "Model-assisted candidates are reviewed against deterministic guardrails before UI generation.",
    );
  }

  if (analyzerPacket.implementation_terms_detected.length > 0) {
    assumptions.push(
      "Detected implementation terms are diagnostic unless the work is setup, debugging, auditing, or integration.",
    );
  }

  if (analyzerPacket.review_questions.length > 0) {
    assumptions.push(
      "Targeted questions identify the highest-impact gaps before UI generation.",
    );
  }

  return assumptions;
}

function hasMissingCandidateField(candidateMissingFields) {
  return Object.values(candidateMissingFields).some(Boolean);
}

function buildReviewConfidence(evidence, implementationTermsDetected, candidateGuardrails) {
  const presentEvidenceCount = [
    evidence.activity,
    evidence.domain_vocabulary,
    evidence.decision,
    evidence.outcome,
  ].filter(Boolean).length;

  if (
    presentEvidenceCount < 3 ||
    hasMissingCandidateField(candidateGuardrails.candidate_missing_fields) ||
    candidateGuardrails.candidate_primary_terms_detected.length > 0
  ) {
    return "low";
  }

  if (presentEvidenceCount === 4 && implementationTermsDetected.length === 0) {
    return "high";
  }

  return "medium";
}

function buildMissingEvidence(evidence) {
  return {
    activity: !evidence.activity,
    domain_vocabulary: !evidence.domain_vocabulary,
    decision: !evidence.decision,
    outcome: !evidence.outcome,
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => typeof entry === "string")
    .map(cleanClause)
    .filter(Boolean);
}

function optionalString(value) {
  return typeof value === "string" ? cleanClause(value) : "";
}

function assertCandidateShape(candidate) {
  if (!isPlainObject(candidate)) {
    throw new JudgmentKitInputError("Activity model candidate must be an object.");
  }

  if (!isPlainObject(candidate.activity_model)) {
    throw new JudgmentKitInputError("Activity model candidate requires activity_model.");
  }

  if (!isPlainObject(candidate.interaction_contract)) {
    throw new JudgmentKitInputError("Activity model candidate requires interaction_contract.");
  }
}

function buildCandidatePrimaryTermsDetected(candidate, contract) {
  return detectImplementationTerms(
    JSON.stringify({
      activity_model: candidate.activity_model,
      interaction_contract: candidate.interaction_contract,
    }),
    contract,
  );
}

function buildCandidateMissingFields(candidate) {
  const activityModel = candidate.activity_model;
  const interactionContract = candidate.interaction_contract;
  const participants = toStringArray(activityModel.participants);
  const vocabulary = toStringArray(activityModel.domain_vocabulary);
  const outcomes = toStringArray(activityModel.outcomes);
  const disclosureTerms = toStringArray(candidate.disclosure_policy?.terms_to_use);

  return {
    activity: optionalString(activityModel.activity).length === 0,
    participants_or_domain_vocabulary:
      participants.length === 0 && vocabulary.length === 0 && disclosureTerms.length === 0,
    primary_decision: optionalString(interactionContract.primary_decision).length === 0,
    completion_or_outcome:
      optionalString(interactionContract.completion).length === 0 && outcomes.length === 0,
  };
}

function sanitizePrimaryString(value, implementationTermsDetected, fallback) {
  return ensureSentence(primaryCandidateValue(value, implementationTermsDetected, fallback));
}

function sanitizePrimaryList(values, implementationTermsDetected) {
  return safeCandidateList(toStringArray(values), implementationTermsDetected);
}

function normalizeActivityModelCandidate(candidate, analyzerPacket, candidatePrimaryTermsDetected) {
  const activityModel = candidate.activity_model;
  const interactionContract = candidate.interaction_contract;
  const disclosurePolicy = isPlainObject(candidate.disclosure_policy)
    ? candidate.disclosure_policy
    : {};
  const participants = sanitizePrimaryList(activityModel.participants, candidatePrimaryTermsDetected);
  const domainVocabulary = unique([
    ...sanitizePrimaryList(activityModel.domain_vocabulary, candidatePrimaryTermsDetected),
    ...sanitizePrimaryList(disclosurePolicy.terms_to_use, candidatePrimaryTermsDetected),
  ]);
  const outcomes = sanitizePrimaryList(activityModel.outcomes, candidatePrimaryTermsDetected);
  const nextActions = sanitizePrimaryList(
    interactionContract.next_actions,
    candidatePrimaryTermsDetected,
  ).map((action) => ensureSentence(sentenceCase(action)));
  const makeEasy = sanitizePrimaryList(
    interactionContract.make_easy,
    candidatePrimaryTermsDetected,
  );

  return {
    activity_model: {
      activity: sanitizePrimaryString(
        activityModel.activity,
        candidatePrimaryTermsDetected,
        analyzerPacket.ui_brief.activity_focus,
      ),
      participants,
      objective: sanitizePrimaryString(
        activityModel.objective,
        candidatePrimaryTermsDetected,
        analyzerPacket.ui_brief.primary_decision,
      ),
      outcomes:
        outcomes.length > 0
          ? outcomes.map((outcome) => ensureSentence(sentenceCase(outcome)))
          : [],
      domain_vocabulary: domainVocabulary,
    },
    interaction_contract: {
      primary_decision: sanitizePrimaryString(
        interactionContract.primary_decision,
        candidatePrimaryTermsDetected,
        analyzerPacket.ui_brief.primary_decision,
      ),
      next_actions: nextActions,
      completion: sanitizePrimaryString(
        interactionContract.completion,
        candidatePrimaryTermsDetected,
        analyzerPacket.ui_brief.outcome,
      ),
      make_easy:
        makeEasy.length > 0
          ? makeEasy
          : [
              "Confirm the activity model before screen structure.",
              "Review the primary decision and outcome in domain language.",
              "Adjust vocabulary before implementation detail reaches the primary UI.",
            ],
    },
    disclosure_policy: {
      terms_to_use: domainVocabulary,
      hidden_implementation_terms:
        Array.isArray(disclosurePolicy.hidden_implementation_terms)
          ? disclosurePolicy.hidden_implementation_terms
          : analyzerPacket.disclosure_policy.diagnostic_terms_detected,
      translation_candidates:
        Array.isArray(disclosurePolicy.translation_candidates)
          ? disclosurePolicy.translation_candidates
          : analyzerPacket.disclosure_policy.translation_candidates,
      diagnostic_contexts:
        Array.isArray(disclosurePolicy.diagnostic_contexts)
          ? disclosurePolicy.diagnostic_contexts
          : analyzerPacket.disclosure_policy.diagnostic_contexts,
    },
  };
}

function buildCandidateGuardrails(candidate, analyzerPacket, contract) {
  const candidatePrimaryTermsDetected = buildCandidatePrimaryTermsDetected(candidate, contract);
  const candidateMissingFields = buildCandidateMissingFields(candidate);

  return {
    candidate_primary_terms_detected: candidatePrimaryTermsDetected,
    candidate_missing_fields: candidateMissingFields,
  };
}

function buildCandidateQuestions(candidateGuardrails) {
  const questions = [];
  const missing = candidateGuardrails.candidate_missing_fields;

  if (missing.activity) {
    questions.push("What activity should the model candidate name in domain language?");
  }

  if (missing.primary_decision) {
    questions.push("What primary decision should the model candidate help the user review?");
  }

  if (missing.completion_or_outcome) {
    questions.push("What outcome or completion state should the model candidate make clear?");
  }

  if (missing.participants_or_domain_vocabulary) {
    questions.push("Which participants or domain vocabulary should the model candidate include?");
  }

  if (candidateGuardrails.candidate_primary_terms_detected.length > 0) {
    questions.push(
      "Which implementation terms in the model candidate should move to disclosure or be translated into domain language?",
    );
  }

  return questions;
}

function buildActivityModelReviewPacket(analyzerPacket, candidate, source, contract) {
  const evidence = analyzerPacket.activity_model.evidence;
  const sourceMissingEvidence = buildMissingEvidence(evidence);
  const candidateGuardrails = buildCandidateGuardrails(candidate, analyzerPacket, contract);
  const normalizedCandidate = normalizeActivityModelCandidate(
    candidate,
    analyzerPacket,
    candidateGuardrails.candidate_primary_terms_detected,
  );
  const hasRequiredEvidence =
    evidence.activity && evidence.domain_vocabulary && evidence.decision && evidence.outcome;
  const candidateReady =
    !hasMissingCandidateField(candidateGuardrails.candidate_missing_fields) &&
    candidateGuardrails.candidate_primary_terms_detected.length === 0;
  const sourceQuestions = selectTargetedQuestions(analyzerPacket.review_questions);
  const candidateQuestions = buildCandidateQuestions(candidateGuardrails);
  const packet = {
    version: analyzerPacket.version,
    contract_id: analyzerPacket.contract_id,
    review_status: hasRequiredEvidence && candidateReady
      ? "ready_for_review"
      : "needs_source_context",
    collaboration_mode: "propose_then_review",
    source: {
      ...source,
      input_excerpt: evidence.input_excerpt,
    },
    candidate: normalizedCandidate,
    review: {
      evidence: {
        activity: evidence.activity,
        domain_vocabulary: evidence.domain_vocabulary,
        decision: evidence.decision,
        outcome: evidence.outcome,
        implementation_terms_detected: analyzerPacket.implementation_terms_detected,
      },
      assumptions: buildReviewAssumptions(analyzerPacket, source),
      confidence: buildReviewConfidence(
        evidence,
        analyzerPacket.implementation_terms_detected,
        candidateGuardrails,
      ),
      targeted_questions: selectTargetedQuestionsFromCandidates([
        ...sourceQuestions,
        ...candidateQuestions,
      ]),
    },
    guardrails: {
      analyzer_status: analyzerPacket.status,
      missing_evidence: sourceMissingEvidence,
      source_missing_evidence: sourceMissingEvidence,
      candidate_primary_terms_detected:
        candidateGuardrails.candidate_primary_terms_detected,
      candidate_missing_fields: candidateGuardrails.candidate_missing_fields,
      implementation_terms_detected: analyzerPacket.implementation_terms_detected,
      disclosure_translation_candidates:
        analyzerPacket.disclosure_policy.translation_candidates,
      original_review_questions: analyzerPacket.review_questions,
    },
  };

  assertNoStyleFields(packet);

  return packet;
}

function assertNoStyleFields(packet) {
  const blockedKeys = new Set([
    "style",
    "styles",
    "styling",
    "aesthetic",
    "aesthetics",
    "visual",
    "visual_direction",
    "tokens",
    "components",
    "layout_polish",
    "design_system",
  ]);

  function visit(value, pathParts = []) {
    if (!value || typeof value !== "object") {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (blockedKeys.has(key)) {
        throw new Error(`Analyzer returned forbidden styling field: ${[...pathParts, key].join(".")}`);
      }

      visit(child, [...pathParts, key]);
    }
  }

  visit(packet);
}

export function analyzeImplementationBrief(input, options = {}) {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new JudgmentKitInputError("analyzeImplementationBrief requires non-empty text input.");
  }

  const contract = options.contract ?? loadActivityContract(options.contractPath);
  const implementationTermsDetected = detectImplementationTerms(input, contract);
  const observed = extractObservedBriefDetails(input, contract, implementationTermsDetected);
  const evidence = inferActivityEvidence(input);
  const reviewQuestions = buildReviewQuestions(evidence, implementationTermsDetected);
  const status = reviewQuestions.length === 0 ? "ready" : "needs_review";
  const packet = {
    version: contract.version,
    contract_id: contract.id,
    status,
    activity_model: buildActivityModel(contract, input.trim(), evidence, observed),
    interaction_contract: buildInteractionContract(contract, evidence, observed),
    disclosure_policy: buildDisclosurePolicy(contract, observed),
    implementation_terms_detected: implementationTermsDetected,
    review_questions: reviewQuestions,
    ui_brief: buildUiBrief(contract, evidence, status, observed, implementationTermsDetected),
  };

  assertNoStyleFields(packet);

  return packet;
}

export function createActivityModelReview(input, options = {}) {
  const analyzerPacket = analyzeImplementationBrief(input, options);
  const contract = options.contract ?? loadActivityContract(options.contractPath);

  return buildActivityModelReviewPacket(
    analyzerPacket,
    {
      activity_model: buildCandidateActivityModel(analyzerPacket),
      interaction_contract: buildCandidateInteractionContract(analyzerPacket),
      disclosure_policy: buildCandidateDisclosurePolicy(analyzerPacket),
    },
    { mode: "deterministic" },
    contract,
  );
}

export function reviewActivityModelCandidate(input, candidate, options = {}) {
  const { proposer = "external_candidate", ...analysisOptions } = options;

  assertCandidateShape(candidate);

  const analyzerPacket = analyzeImplementationBrief(input, analysisOptions);
  const contract = analysisOptions.contract ?? loadActivityContract(analysisOptions.contractPath);

  return buildActivityModelReviewPacket(
    analyzerPacket,
    candidate,
    { mode: "model_assisted", proposer },
    contract,
  );
}

function buildCandidateShapeGuide() {
  return {
    activity_model: {
      activity: "One sentence naming the activity in domain language.",
      participants: ["Domain participants named in the brief or deterministic review."],
      objective: "One sentence describing the decision or work objective.",
      outcomes: ["Observable outcomes or handoff states for the activity."],
      domain_vocabulary: ["Terms the user would naturally use for the work."],
    },
    interaction_contract: {
      primary_decision: "The main decision or next action the surface should support.",
      next_actions: ["Concrete next actions the user can review or take."],
      completion: "What the user should leave knowing or having done.",
      make_easy: ["Responsibilities the interaction should make easy."],
    },
    disclosure_policy: {
      terms_to_use: ["Domain terms suitable for the primary user-facing surface."],
      hidden_implementation_terms: [
        "Diagnostic implementation terms from the deterministic review, if any.",
      ],
      translation_candidates: [
        "Implementation-to-domain translations from the deterministic review, if any.",
      ],
      diagnostic_contexts: ["Contexts where diagnostic terms may be revealed."],
    },
  };
}

function buildDeterministicReviewContext(deterministicReview) {
  return {
    review_status: deterministicReview.review_status,
    contract_id: deterministicReview.contract_id,
    evidence: deterministicReview.review?.evidence ?? {},
    targeted_questions: deterministicReview.review?.targeted_questions ?? [],
    candidate_draft: deterministicReview.candidate,
    guardrails: {
      missing_evidence: deterministicReview.guardrails?.source_missing_evidence ??
        deterministicReview.guardrails?.missing_evidence,
      implementation_terms_detected:
        deterministicReview.guardrails?.implementation_terms_detected ?? [],
      disclosure_translation_candidates:
        deterministicReview.guardrails?.disclosure_translation_candidates ?? [],
    },
  };
}

export function buildActivityModelCandidateRequest({ brief, deterministic_review: deterministicReview } = {}) {
  if (typeof brief !== "string" || brief.trim().length === 0) {
    throw new JudgmentKitInputError(
      "buildActivityModelCandidateRequest requires non-empty brief text.",
    );
  }

  if (!isPlainObject(deterministicReview)) {
    throw new JudgmentKitInputError(
      "buildActivityModelCandidateRequest requires a deterministic_review object.",
    );
  }

  return {
    messages: [
      {
        role: "system",
        content: [
          "You propose a reviewable JudgmentKit activity model candidate.",
          "Return only JSON whose root object matches the candidate shape.",
          "Ground every primary field in the source brief and deterministic review evidence.",
          "Keep implementation terms out of candidate.activity_model and candidate.interaction_contract.",
          "Implementation terms may appear only in candidate.disclosure_policy when they are diagnostic.",
          "Do not propose UI layout, styling, components, tokens, visual direction, provider configuration, or network behavior.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            brief: brief.trim(),
            deterministic_review: buildDeterministicReviewContext(deterministicReview),
            candidate_shape: buildCandidateShapeGuide(),
          },
          null,
          2,
        ),
      },
    ],
    response_format: {
      type: "json_object",
      root: "candidate",
      required_top_level_keys: [
        "activity_model",
        "interaction_contract",
        "disclosure_policy",
      ],
    },
    metadata: {
      request_kind: "activity_model_candidate",
      contract_id: deterministicReview.contract_id,
      version: deterministicReview.version,
      source_review_status: deterministicReview.review_status,
      collaboration_mode: deterministicReview.collaboration_mode,
    },
  };
}

function parseCandidateResponse(response) {
  if (typeof response === "string") {
    try {
      return JSON.parse(response);
    } catch {
      throw new JudgmentKitInputError(
        "callModel returned invalid JSON. Expected a candidate object JSON string.",
      );
    }
  }

  return response;
}

export function createActivityModelProposer({ callModel } = {}) {
  if (typeof callModel !== "function") {
    throw new JudgmentKitInputError(
      "createActivityModelProposer requires a callModel function.",
    );
  }

  return async function proposeActivityModelCandidate({
    brief,
    deterministic_review: deterministicReview,
  } = {}) {
    const request = buildActivityModelCandidateRequest({
      brief,
      deterministic_review: deterministicReview,
    });
    const candidate = parseCandidateResponse(await callModel(request));

    assertCandidateShape(candidate);

    return candidate;
  };
}

export async function createModelAssistedActivityModelReview(input, options = {}) {
  const { propose, ...analysisOptions } = options;

  if (typeof propose !== "function") {
    throw new JudgmentKitInputError(
      "createModelAssistedActivityModelReview requires a propose function.",
    );
  }

  const deterministicReview = createActivityModelReview(input, analysisOptions);
  const candidate = await propose({
    brief: input,
    deterministic_review: deterministicReview,
  });

  return reviewActivityModelCandidate(input, candidate, {
    ...analysisOptions,
    proposer: "injected",
  });
}

const REVIEW_PACKET_MACHINE_TERMS = [
  "activity_model",
  "candidate",
  "guardrails",
  "interaction_contract",
  "needs_source_context",
  "ready_for_review",
  "review_status",
];

const REVIEW_PACKET_LABEL_TERMS = [
  "Activity",
  "Main decision",
  "Outcome",
  "Primary user",
  "Review status",
];

function collectStringValues(value, values = []) {
  if (typeof value === "string") {
    values.push(value);
    return values;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectStringValues(entry, values);
    }
    return values;
  }

  if (value && typeof value === "object") {
    for (const child of Object.values(value)) {
      collectStringValues(child, values);
    }
  }

  return values;
}

function uiWorkflowPrimaryFields(candidate) {
  return {
    workflow: candidate.workflow,
    primary_ui: candidate.primary_ui,
    handoff: candidate.handoff,
  };
}

function textContainsReviewPacketMetaTerm(value) {
  const normalized = normalizeText(value);

  if (
    REVIEW_PACKET_MACHINE_TERMS.some((term) =>
      normalized.includes(normalizeText(term)),
    )
  ) {
    return true;
  }

  return REVIEW_PACKET_LABEL_TERMS.some((term) => {
    const normalizedTerm = normalizeText(term);

    return (
      normalized === normalizedTerm ||
      normalized.startsWith(`${normalizedTerm}:`) ||
      normalized.startsWith(`${normalizedTerm} `)
    );
  });
}

function buildCandidatePrimaryMetaTermsDetected(candidate) {
  const counts = new Map();

  for (const value of collectStringValues(uiWorkflowPrimaryFields(candidate))) {
    const normalized = normalizeText(value);

    for (const term of REVIEW_PACKET_MACHINE_TERMS) {
      if (normalized.includes(normalizeText(term))) {
        counts.set(term, (counts.get(term) ?? 0) + 1);
      }
    }

    for (const term of REVIEW_PACKET_LABEL_TERMS) {
      const normalizedTerm = normalizeText(term);

      if (
        normalized === normalizedTerm ||
        normalized.startsWith(`${normalizedTerm}:`) ||
        normalized.startsWith(`${normalizedTerm} `)
      ) {
        counts.set(term, (counts.get(term) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((left, right) => left.term.localeCompare(right.term));
}

function buildUiWorkflowPrimaryTermsDetected(candidate, contract) {
  return detectImplementationTerms(
    JSON.stringify(uiWorkflowPrimaryFields(candidate)),
    contract,
  );
}

function containsPrimaryWorkflowLeak(value, implementationTermsDetected) {
  return (
    containsDetectedImplementationTerm(value, implementationTermsDetected) ||
    textContainsReviewPacketMetaTerm(value)
  );
}

function sanitizeUiWorkflowString(value, implementationTermsDetected, fallback = "") {
  const cleaned = optionalString(value);

  if (!cleaned || containsPrimaryWorkflowLeak(cleaned, implementationTermsDetected)) {
    return fallback;
  }

  return cleaned;
}

function sanitizeUiWorkflowList(values, implementationTermsDetected) {
  return toStringArray(values).filter(
    (value) => !containsPrimaryWorkflowLeak(value, implementationTermsDetected),
  );
}

function toDiagnosticTermArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return cleanClause(entry);
      }

      if (isPlainObject(entry)) {
        return cleanClause(entry.term ?? entry.detected_term ?? "");
      }

      return "";
    })
    .filter(Boolean);
}

function assertUiWorkflowCandidateShape(candidate) {
  if (!isPlainObject(candidate)) {
    throw new JudgmentKitInputError("UI workflow candidate must be an object.");
  }

  if (!isPlainObject(candidate.workflow)) {
    throw new JudgmentKitInputError("UI workflow candidate requires workflow.");
  }

  if (!isPlainObject(candidate.primary_ui)) {
    throw new JudgmentKitInputError("UI workflow candidate requires primary_ui.");
  }

  if (!isPlainObject(candidate.handoff)) {
    throw new JudgmentKitInputError("UI workflow candidate requires handoff.");
  }

  if (!isPlainObject(candidate.diagnostics)) {
    throw new JudgmentKitInputError("UI workflow candidate requires diagnostics.");
  }
}

function buildUiWorkflowCandidateMissingFields(candidate) {
  const workflow = candidate.workflow;
  const primaryUi = candidate.primary_ui;
  const handoff = candidate.handoff;
  const completionState = optionalString(workflow.completion_state);
  const handoffCompletion =
    optionalString(handoff.next_action).length > 0 &&
    optionalString(handoff.reason).length > 0;

  return {
    workflow_steps: toStringArray(workflow.steps).length === 0,
    primary_actions: toStringArray(workflow.primary_actions).length === 0,
    decision_support: toStringArray(workflow.decision_points).length === 0,
    primary_ui_sections: toStringArray(primaryUi.sections).length === 0,
    completion_or_handoff:
      completionState.length === 0 && !handoffCompletion,
  };
}

function buildUiWorkflowCandidateGuardrails(candidate, contract) {
  return {
    candidate_primary_terms_detected: buildUiWorkflowPrimaryTermsDetected(
      candidate,
      contract,
    ),
    candidate_primary_meta_terms_detected:
      buildCandidatePrimaryMetaTermsDetected(candidate),
    candidate_missing_fields: buildUiWorkflowCandidateMissingFields(candidate),
  };
}

function hasUiWorkflowMissingField(candidateMissingFields) {
  return Object.values(candidateMissingFields).some(Boolean);
}

function normalizeUiWorkflowCandidate(candidate, activityReview, candidatePrimaryTermsDetected) {
  const workflow = candidate.workflow;
  const primaryUi = candidate.primary_ui;
  const handoff = candidate.handoff;
  const diagnostics = candidate.diagnostics;
  const activityCandidate = activityReview.candidate;
  const defaultTerms =
    activityCandidate?.disclosure_policy?.terms_to_use ??
    activityCandidate?.activity_model?.domain_vocabulary ??
    [];
  const defaultDiagnosticTerms =
    activityReview.guardrails?.implementation_terms_detected?.map((entry) => entry.term) ?? [];
  const defaultDiagnosticContexts =
    activityCandidate?.disclosure_policy?.diagnostic_contexts ?? [
      "setup",
      "debugging",
      "auditing",
      "integration",
    ];
  const sanitizedUserTerms = unique([
    ...sanitizeUiWorkflowList(primaryUi.user_facing_terms, candidatePrimaryTermsDetected),
    ...sanitizeUiWorkflowList(defaultTerms, candidatePrimaryTermsDetected),
  ]);

  return {
    workflow: {
      surface_name: sanitizeUiWorkflowString(
        workflow.surface_name,
        candidatePrimaryTermsDetected,
        "Workflow review",
      ),
      steps: sanitizeUiWorkflowList(workflow.steps, candidatePrimaryTermsDetected),
      primary_actions: sanitizeUiWorkflowList(
        workflow.primary_actions,
        candidatePrimaryTermsDetected,
      ),
      decision_points: sanitizeUiWorkflowList(
        workflow.decision_points,
        candidatePrimaryTermsDetected,
      ),
      completion_state: sanitizeUiWorkflowString(
        workflow.completion_state,
        candidatePrimaryTermsDetected,
        activityCandidate?.interaction_contract?.completion ?? "",
      ),
    },
    primary_ui: {
      sections: sanitizeUiWorkflowList(primaryUi.sections, candidatePrimaryTermsDetected),
      controls: sanitizeUiWorkflowList(primaryUi.controls, candidatePrimaryTermsDetected),
      user_facing_terms: sanitizedUserTerms,
    },
    handoff: {
      next_owner: sanitizeUiWorkflowString(
        handoff.next_owner,
        candidatePrimaryTermsDetected,
      ),
      reason: sanitizeUiWorkflowString(handoff.reason, candidatePrimaryTermsDetected),
      next_action: sanitizeUiWorkflowString(
        handoff.next_action,
        candidatePrimaryTermsDetected,
        activityCandidate?.interaction_contract?.next_actions?.[0] ?? "",
      ),
    },
    diagnostics: {
      implementation_terms:
        toDiagnosticTermArray(diagnostics.implementation_terms).length > 0
          ? toDiagnosticTermArray(diagnostics.implementation_terms)
          : defaultDiagnosticTerms,
      reveal_contexts:
        toStringArray(diagnostics.reveal_contexts).length > 0
          ? toStringArray(diagnostics.reveal_contexts)
          : defaultDiagnosticContexts,
    },
  };
}

function buildUiWorkflowQuestions(activityReview, candidateGuardrails) {
  const questions = [...(activityReview.review?.targeted_questions ?? [])];
  const missing = candidateGuardrails.candidate_missing_fields;

  if (missing.workflow_steps) {
    questions.push("What workflow steps should the UI candidate support?");
  }

  if (missing.primary_actions) {
    questions.push("What primary actions should the UI make available?");
  }

  if (missing.decision_support) {
    questions.push("What decision points should the workflow help the user resolve?");
  }

  if (missing.completion_or_handoff) {
    questions.push("What completion state or handoff should the workflow make clear?");
  }

  if (candidateGuardrails.candidate_primary_terms_detected.length > 0) {
    questions.push(
      "Which implementation terms in the workflow candidate should move to diagnostics or be translated?",
    );
  }

  if (candidateGuardrails.candidate_primary_meta_terms_detected.length > 0) {
    questions.push(
      "Which JudgmentKit review terms in the workflow candidate should be removed from the product UI?",
    );
  }

  return selectTargetedQuestionsFromCandidates(questions);
}

function buildUiWorkflowReviewAssumptions(
  activityReview,
  source,
  guidanceProfile,
  surfaceGuidance,
) {
  const assumptions = [
    "Treat this as a reviewable UI workflow candidate, not final product approval.",
    "Activity review remains the source of truth for grounding and disclosure.",
  ];

  if (source.mode === "model_assisted") {
    assumptions.push(
      "Model-assisted workflow candidates are reviewed before implementation.",
    );
  }

  if (activityReview.review_status !== "ready_for_review") {
    assumptions.push(
      "The UI workflow cannot be accepted until source activity evidence is resolved.",
    );
  }

  if (guidanceProfile) {
    assumptions.push(
      "Selected guidance profiles shape review expectations but remain outside product UI copy.",
    );
  }

  if (surfaceGuidance) {
    assumptions.push(
      "Selected surface guidance shapes interaction purpose before frontend implementation.",
    );
  }

  return assumptions;
}

function buildUiWorkflowConfidence(activityReview, candidateGuardrails) {
  if (
    activityReview.review_status !== "ready_for_review" ||
    hasUiWorkflowMissingField(candidateGuardrails.candidate_missing_fields) ||
    candidateGuardrails.candidate_primary_terms_detected.length > 0 ||
    candidateGuardrails.candidate_primary_meta_terms_detected.length > 0
  ) {
    return "low";
  }

  if ((activityReview.guardrails?.implementation_terms_detected ?? []).length > 0) {
    return "medium";
  }

  return "high";
}

function buildUiWorkflowReviewPacket(
  activityReview,
  candidate,
  source,
  contract,
  guidanceProfile = null,
  surfaceReview = null,
) {
  const sourceReady = activityReview.review_status === "ready_for_review";
  const candidateGuardrails = buildUiWorkflowCandidateGuardrails(candidate, contract);
  const candidateReady =
    !hasUiWorkflowMissingField(candidateGuardrails.candidate_missing_fields) &&
    candidateGuardrails.candidate_primary_terms_detected.length === 0 &&
    candidateGuardrails.candidate_primary_meta_terms_detected.length === 0;
  const normalizedCandidate = normalizeUiWorkflowCandidate(
    candidate,
    activityReview,
    candidateGuardrails.candidate_primary_terms_detected,
  );
  const sourceMissingEvidence =
    activityReview.guardrails?.source_missing_evidence ??
    activityReview.guardrails?.missing_evidence ??
    {};
  const surfaceGuidance = summarizeSurfaceReview(surfaceReview);
  const packet = {
    version: activityReview.version,
    contract_id: activityReview.contract_id,
    review_status: sourceReady && candidateReady
      ? "ready_for_review"
      : "needs_source_context",
    collaboration_mode: "propose_then_review",
    source: {
      ...source,
      input_excerpt: activityReview.source?.input_excerpt,
    },
    ...(guidanceProfile ? { guidance_profile: guidanceProfile } : {}),
    ...(surfaceGuidance
      ? {
          surface_type: surfaceGuidance.recommended_surface_type,
          surface_guidance: surfaceGuidance,
        }
      : {}),
    activity_review: activityReview,
    candidate: normalizedCandidate,
    review: {
      evidence: {
        activity_review_ready: sourceReady,
        workflow_steps: !candidateGuardrails.candidate_missing_fields.workflow_steps,
        primary_actions: !candidateGuardrails.candidate_missing_fields.primary_actions,
        decision_support: !candidateGuardrails.candidate_missing_fields.decision_support,
        completion_or_handoff:
          !candidateGuardrails.candidate_missing_fields.completion_or_handoff,
        implementation_terms_detected:
          activityReview.guardrails?.implementation_terms_detected ?? [],
        candidate_primary_terms_detected:
          candidateGuardrails.candidate_primary_terms_detected,
        candidate_primary_meta_terms_detected:
          candidateGuardrails.candidate_primary_meta_terms_detected,
      },
      assumptions: buildUiWorkflowReviewAssumptions(
        activityReview,
        source,
        guidanceProfile,
        surfaceGuidance,
      ),
      confidence: buildUiWorkflowConfidence(activityReview, candidateGuardrails),
      targeted_questions: buildUiWorkflowQuestions(activityReview, candidateGuardrails),
    },
    guardrails: {
      activity_review_status: activityReview.review_status,
      source_missing_evidence: sourceMissingEvidence,
      candidate_missing_fields: candidateGuardrails.candidate_missing_fields,
      candidate_primary_terms_detected:
        candidateGuardrails.candidate_primary_terms_detected,
      candidate_primary_meta_terms_detected:
        candidateGuardrails.candidate_primary_meta_terms_detected,
      implementation_terms_detected:
        activityReview.guardrails?.implementation_terms_detected ?? [],
      disclosure_translation_candidates:
        activityReview.guardrails?.disclosure_translation_candidates ?? [],
      ...(guidanceProfile ? { guidance_profile_id: guidanceProfile.profile_id } : {}),
      ...(surfaceGuidance
        ? { recommended_surface_type: surfaceGuidance.recommended_surface_type }
        : {}),
    },
  };

  assertNoStyleFields(packet);

  return packet;
}

function buildUiWorkflowCandidateShapeGuide() {
  return {
    workflow: {
      surface_name: "Short domain name for the workflow surface.",
      steps: ["Ordered workflow steps in user-facing language."],
      primary_actions: ["Actions the user can take to move the work forward."],
      decision_points: ["Decisions the workflow helps the user resolve."],
      completion_state: "What done means for this workflow.",
    },
    primary_ui: {
      sections: ["Primary sections the user needs for the work."],
      controls: ["Named controls or commands in user-facing language."],
      user_facing_terms: ["Domain terms suitable for the primary UI."],
    },
    handoff: {
      next_owner: "Who receives the next action.",
      reason: "Reason the decision or handoff is being made.",
      next_action: "Next action after the workflow decision.",
    },
    diagnostics: {
      implementation_terms: ["Implementation terms allowed only outside primary UI."],
      reveal_contexts: ["Contexts where diagnostics may be shown."],
    },
  };
}

function buildUiWorkflowReviewContext(activityReview) {
  return {
    review_status: activityReview.review_status,
    contract_id: activityReview.contract_id,
    candidate_activity_model: activityReview.candidate?.activity_model,
    candidate_interaction_contract: activityReview.candidate?.interaction_contract,
    candidate_disclosure_policy: activityReview.candidate?.disclosure_policy,
    targeted_questions: activityReview.review?.targeted_questions ?? [],
    guardrails: {
      source_missing_evidence:
        activityReview.guardrails?.source_missing_evidence ??
        activityReview.guardrails?.missing_evidence,
      implementation_terms_detected:
        activityReview.guardrails?.implementation_terms_detected ?? [],
      disclosure_translation_candidates:
        activityReview.guardrails?.disclosure_translation_candidates ?? [],
    },
  };
}

export function buildUiWorkflowCandidateRequest({
  brief,
  activity_review: activityReview,
  profile_id: profileId,
  surface_review: surfaceReview,
  contract,
  contractPath,
} = {}) {
  if (typeof brief !== "string" || brief.trim().length === 0) {
    throw new JudgmentKitInputError(
      "buildUiWorkflowCandidateRequest requires non-empty brief text.",
    );
  }

  if (!isPlainObject(activityReview)) {
    throw new JudgmentKitInputError(
      "buildUiWorkflowCandidateRequest requires an activity_review object.",
    );
  }

  const guidanceProfile = profileId === undefined || profileId === null
    ? null
    : resolveUiWorkflowGuidanceProfile(
        contract ?? loadActivityContract(contractPath),
        profileId,
      );
  const userPayload = {
    brief: brief.trim(),
    activity_review: buildUiWorkflowReviewContext(activityReview),
    candidate_shape: buildUiWorkflowCandidateShapeGuide(),
  };
  const surfaceGuidance = summarizeSurfaceReview(surfaceReview);

  if (guidanceProfile) {
    userPayload.guidance_profile = guidanceProfile;
  }

  if (surfaceGuidance) {
    userPayload.surface_guidance = surfaceGuidance;
  }

  return {
    messages: [
      {
        role: "system",
        content: [
          "You propose a reviewable JudgmentKit UI workflow candidate.",
          "Return only JSON whose root object matches the UI workflow candidate shape.",
          "Ground workflow steps, actions, decisions, handoff, and user-facing terms in the source brief and activity review.",
          "Keep implementation terms and JudgmentKit review-packet terms out of workflow, primary_ui, and handoff.",
          "Implementation terms may appear only in diagnostics when they are diagnostic.",
          guidanceProfile
            ? "Apply the selected guidance_profile as activity guidance; do not copy guardrail ids or internal mechanics into product UI copy."
            : "",
          surfaceGuidance
            ? "Apply the selected surface_guidance as interaction-purpose guidance; do not treat it as styling or a component inventory."
            : "",
          "Do not propose styling, components, design tokens, framework code, provider configuration, or network behavior.",
        ].filter(Boolean).join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(userPayload, null, 2),
      },
    ],
    response_format: {
      type: "json_object",
      root: "candidate",
      required_top_level_keys: [
        "workflow",
        "primary_ui",
        "handoff",
        "diagnostics",
      ],
    },
    metadata: {
      request_kind: "ui_workflow_candidate",
      contract_id: activityReview.contract_id,
      version: activityReview.version,
      source_review_status: activityReview.review_status,
      collaboration_mode: activityReview.collaboration_mode,
      ...(guidanceProfile
        ? {
            guidance_profile_id: guidanceProfile.profile_id,
            guidance_profile: guidanceProfile,
          }
        : {}),
      ...(surfaceGuidance
        ? {
            recommended_surface_type: surfaceGuidance.recommended_surface_type,
          }
        : {}),
    },
  };
}

export function createUiWorkflowProposer({
  callModel,
  profile_id: defaultProfileId,
  contract,
  contractPath,
} = {}) {
  if (typeof callModel !== "function") {
    throw new JudgmentKitInputError(
      "createUiWorkflowProposer requires a callModel function.",
    );
  }

  return async function proposeUiWorkflowCandidate({
    brief,
    activity_review: activityReview,
    profile_id: requestProfileId,
    surface_review: surfaceReview,
  } = {}) {
    const request = buildUiWorkflowCandidateRequest({
      brief,
      activity_review: activityReview,
      profile_id: requestProfileId ?? defaultProfileId,
      surface_review: surfaceReview,
      contract,
      contractPath,
    });
    const candidate = parseCandidateResponse(await callModel(request));

    assertUiWorkflowCandidateShape(candidate);

    return candidate;
  };
}

export function reviewUiWorkflowCandidate(input, candidate, options = {}) {
  const {
    proposer = "external_candidate",
    activity_review: providedActivityReview,
    profile_id: profileId,
    surface_review: providedSurfaceReview,
    surface_type: providedSurfaceType,
    ...analysisOptions
  } = options;

  assertUiWorkflowCandidateShape(candidate);

  const activityReview =
    providedActivityReview ?? createActivityModelReview(input, analysisOptions);
  const contract = analysisOptions.contract ?? loadActivityContract(analysisOptions.contractPath);
  const guidanceProfile = resolveUiWorkflowGuidanceProfile(contract, profileId);
  const resolvedSurfaceType = providedSurfaceType
    ? resolveSurfaceType(contract, providedSurfaceType).surface_type
    : null;
  const surfaceReview = isPlainObject(providedSurfaceReview)
    ? providedSurfaceReview
    : resolvedSurfaceType
      ? {
          recommended_surface_type: resolvedSurfaceType,
          confidence: "user_selected",
          blocked_surface_types: [],
          ...buildSurfaceImplications(resolvedSurfaceType),
        }
      : null;

  return buildUiWorkflowReviewPacket(
    activityReview,
    candidate,
    { mode: "model_assisted", proposer },
    contract,
    guidanceProfile,
    surfaceReview,
  );
}

export async function createModelAssistedUiWorkflowReview(input, options = {}) {
  const { propose, profile_id: profileId, surface_review: surfaceReview, ...analysisOptions } = options;

  if (typeof propose !== "function") {
    throw new JudgmentKitInputError(
      "createModelAssistedUiWorkflowReview requires a propose function.",
    );
  }

  const activityReview = createActivityModelReview(input, analysisOptions);
  const candidate = await propose({
    brief: input,
    activity_review: activityReview,
    profile_id: profileId,
    surface_review: surfaceReview,
  });

  return reviewUiWorkflowCandidate(input, candidate, {
    ...analysisOptions,
    activity_review: activityReview,
    profile_id: profileId,
    surface_review: surfaceReview,
    proposer: "injected",
  });
}

function assertReadyUiWorkflowReviewShape(workflowReview) {
  if (!isPlainObject(workflowReview.candidate)) {
    throw new JudgmentKitInputError(
      "createUiGenerationHandoff requires a workflow_review with candidate.",
    );
  }

  if (!isPlainObject(workflowReview.candidate.workflow)) {
    throw new JudgmentKitInputError(
      "createUiGenerationHandoff requires candidate.workflow.",
    );
  }

  if (!isPlainObject(workflowReview.candidate.primary_ui)) {
    throw new JudgmentKitInputError(
      "createUiGenerationHandoff requires candidate.primary_ui.",
    );
  }

  if (!isPlainObject(workflowReview.candidate.handoff)) {
    throw new JudgmentKitInputError(
      "createUiGenerationHandoff requires candidate.handoff.",
    );
  }

  if (!isPlainObject(workflowReview.activity_review?.candidate)) {
    throw new JudgmentKitInputError(
      "createUiGenerationHandoff requires activity_review.candidate.",
    );
  }
}

function termEntriesToNames(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => {
      if (typeof entry === "string") {
        return cleanClause(entry);
      }

      if (isPlainObject(entry)) {
        return cleanClause(entry.term ?? entry.detected_term ?? "");
      }

      return "";
    })
    .filter(Boolean);
}

function buildUiGenerationHandoffBlockDetails(workflowReview) {
  return {
    review_status: workflowReview.review_status,
    confidence: workflowReview.review?.confidence,
    targeted_questions: workflowReview.review?.targeted_questions ?? [],
    missing_fields: workflowReview.guardrails?.candidate_missing_fields ?? {},
    source_missing_evidence: workflowReview.guardrails?.source_missing_evidence ?? {},
    implementation_leakage_terms:
      workflowReview.guardrails?.candidate_primary_terms_detected ?? [],
    review_packet_leakage_terms:
      workflowReview.guardrails?.candidate_primary_meta_terms_detected ?? [],
    activity_review_status: workflowReview.guardrails?.activity_review_status,
  };
}

function buildTermsToKeepOutOfPrimaryUi(workflowReview) {
  return unique([
    ...termEntriesToNames(workflowReview.guardrails?.implementation_terms_detected),
    ...termEntriesToNames(workflowReview.guardrails?.candidate_primary_terms_detected),
    ...termEntriesToNames(workflowReview.guardrails?.candidate_primary_meta_terms_detected),
  ]);
}

function getContractUiImplementationContract(contract) {
  return isPlainObject(contract.implementation_contract)
    ? contract.implementation_contract
    : {};
}

function normalizePrimitiveList(values, fallback = []) {
  const entries = toStringArray(values);
  return entries.length > 0 ? unique(entries) : unique(fallback);
}

function normalizeUiImplementationContract(input = {}, options = {}) {
  const contract = options.contract ?? loadActivityContract(options.contractPath);
  const base = getContractUiImplementationContract(contract);
  const source = isPlainObject(input) ? input : {};
  const approvedPrimitives = normalizePrimitiveList(
    source.approved_primitives,
    base.approved_primitives,
  );
  const requiredStates = normalizePrimitiveList(
    source.state_coverage?.required_states ?? source.required_states,
    base.state_coverage?.required_states,
  );
  const requiredStateEvidence = normalizePrimitiveList(
    source.state_coverage?.required_evidence ?? source.required_state_evidence,
    base.state_coverage?.required_evidence,
  );
  const browserQaChecks = normalizePrimitiveList(
    source.browser_qa?.checks ?? source.browser_qa_checks,
    base.browser_qa?.checks,
  );
  const staticRules = normalizePrimitiveList(
    source.static_enforcement?.default_rules ?? source.static_rules,
    base.static_enforcement?.default_rules,
  );
  const primitiveRules = Array.isArray(source.primitive_rules)
    ? source.primitive_rules
    : Array.isArray(base.primitive_rules)
      ? base.primitive_rules
      : [];

  return {
    id: optionalString(source.id) || optionalString(base.id) || "judgmentkit.ui-implementation-contract.portable",
    purpose:
      optionalString(source.purpose) ||
      optionalString(base.purpose) ||
      "Enforce approved UI primitives after activity and workflow judgment.",
    authority_order: normalizePrimitiveList(
      source.authority_order,
      base.authority_order,
    ),
    approved_primitives: approvedPrimitives,
    primitive_rules: primitiveRules
      .filter(isPlainObject)
      .map((rule) => ({
        primitive: optionalString(rule.primitive),
        required: toStringArray(rule.required),
      }))
      .filter((rule) => rule.primitive),
    state_coverage: {
      required_states: requiredStates,
      required_evidence: requiredStateEvidence,
    },
    static_enforcement: {
      default_rules: staticRules,
    },
    browser_qa: {
      required:
        typeof source.browser_qa?.required === "boolean"
          ? source.browser_qa.required
          : typeof base.browser_qa?.required === "boolean"
            ? base.browser_qa.required
            : true,
      checks: browserQaChecks,
    },
    repo_scaffold_outputs: normalizePrimitiveList(
      source.repo_scaffold_outputs,
      base.repo_scaffold_outputs,
    ),
    failure_signals: normalizePrimitiveList(
      source.failure_signals,
      base.failure_signals,
    ),
  };
}

function implementationContractSource(input = {}) {
  if (isPlainObject(input) && toStringArray(input.repo_evidence).length > 0) {
    return "repo_evidence";
  }

  if (
    isPlainObject(input) &&
    (typeof input.external_authority === "string" ||
      typeof input.external_system_name === "string")
  ) {
    return "external_authority";
  }

  return "portable_defaults";
}

export function createUiImplementationContract(input = {}, options = {}) {
  if (input !== undefined && input !== null && !isPlainObject(input)) {
    throw new JudgmentKitInputError(
      "createUiImplementationContract requires an object when input is provided.",
    );
  }

  const contract = options.contract ?? loadActivityContract(options.contractPath);
  const normalized = normalizeUiImplementationContract(input ?? {}, { contract });
  const packet = {
    version: contract.version,
    contract_id: contract.id,
    workflow_id: getContractWorkflowId(contract),
    implementation_contract_status: "ready",
    source: {
      mode: implementationContractSource(input ?? {}),
      repo_name: optionalString(input?.repo_name),
      target_stack: optionalString(input?.target_stack),
      external_authority: optionalString(
        input?.external_authority ?? input?.external_system_name,
      ),
    },
    implementation_contract: normalized,
    generation_gates: [
      {
        id: "activity_gate",
        status: "required_before_implementation",
        checks: [
          "activity model",
          "workflow review",
          "disclosure boundary",
        ],
      },
      {
        id: "implementation_gate",
        status: "ready_for_candidate_review",
        checks: [
          "approved primitives",
          "state coverage",
          "static enforcement",
          "browser QA",
        ],
      },
    ],
  };

  assertNoStyleFields(packet);

  return packet;
}

function candidateText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (!isPlainObject(value)) {
    return "";
  }

  return [
    value.code,
    value.markup,
    value.patch,
    value.diff,
    value.rendered_markup,
    value.description,
    JSON.stringify(value),
  ]
    .filter((entry) => typeof entry === "string")
    .join("\n");
}

function normalizeCandidateList(candidate, keys) {
  if (!isPlainObject(candidate)) {
    return [];
  }

  for (const key of keys) {
    const values = toStringArray(candidate[key]);
    if (values.length > 0) {
      return unique(values);
    }
  }

  return [];
}

function detectRawControls(text) {
  const matches = [];
  const pattern = /<\s*(input|select|textarea)\b/gi;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    matches.push(match[1].toLowerCase());
  }

  if (/<\s*input\b[^>]*type=["']?checkbox/gi.test(text)) {
    matches.push("checkbox");
  }

  return unique(matches);
}

function normalizeModalActionEvidence(candidate) {
  if (!isPlainObject(candidate)) {
    return [];
  }

  const evidence =
    candidate.modal_actions ??
    candidate.modalActions ??
    candidate.dialog_actions ??
    candidate.dialogActions;

  if (Array.isArray(evidence)) {
    return evidence.filter(isPlainObject);
  }

  return isPlainObject(evidence) ? [evidence] : [];
}

function normalizedActionLabel(value) {
  return optionalString(value).toLowerCase();
}

function modalActionOrder(entry) {
  return toStringArray(
    entry.visual_order ??
      entry.visualOrder ??
      entry.order ??
      entry.actions,
  );
}

function modalSecondaryActions(entry, order) {
  const explicit = toStringArray(
    entry.secondary_actions ??
      entry.secondaryActions ??
      entry.dismiss_actions ??
      entry.dismissActions,
  );

  if (explicit.length > 0) {
    return explicit;
  }

  return order.filter((label) => /\b(?:cancel|dismiss|close)\b/i.test(label));
}

function modalActionIndex(order, label) {
  const normalized = normalizedActionLabel(label);
  return order.findIndex((candidate) => normalizedActionLabel(candidate) === normalized);
}

function isModalActionSkipped(entry) {
  const direction = optionalString(entry.direction).toLowerCase();

  if (direction === "rtl") {
    return "RTL dialogs invert final visual position and need direction-specific review.";
  }

  if (entry.destructive === true || optionalString(entry.destructive).toLowerCase() === "true") {
    return "Destructive dialogs require separate destructive-action review.";
  }

  return "";
}

function reviewModalActionEntry(entry, index) {
  const skippedReason = isModalActionSkipped(entry);
  const context = optionalString(entry.context) || `modal action set ${index + 1}`;

  if (skippedReason) {
    return {
      context,
      status: "not_applicable",
      reason: skippedReason,
    };
  }

  const order = modalActionOrder(entry);
  const primaryAction = optionalString(
    entry.primary_action ??
      entry.primaryAction ??
      entry.completion_action ??
      entry.completionAction,
  );
  const secondaryActions = modalSecondaryActions(entry, order);
  const formSubmitAction = optionalString(
    entry.form_submit_action ??
      entry.formSubmitAction ??
      entry.default_action ??
      entry.defaultAction,
  );
  const formBacked = entry.form_backed === true ||
    entry.formBacked === true ||
    entry.form === true ||
    Boolean(formSubmitAction);
  const problems = [];

  if (order.length === 0) {
    problems.push("Modal action evidence must include visual_order.");
  }

  if (!primaryAction) {
    problems.push("Modal action evidence must name primary_action.");
  }

  if (secondaryActions.length === 0) {
    problems.push("Modal action evidence must name cancel or dismiss secondary_actions.");
  }

  const primaryIndex = primaryAction ? modalActionIndex(order, primaryAction) : -1;
  if (primaryAction && order.length > 0 && primaryIndex === -1) {
    problems.push("Primary completion action must appear in visual_order.");
  }

  for (const secondaryAction of secondaryActions) {
    const secondaryIndex = modalActionIndex(order, secondaryAction);

    if (secondaryIndex === -1) {
      problems.push(`Secondary action "${secondaryAction}" must appear in visual_order.`);
      continue;
    }

    if (primaryIndex !== -1 && secondaryIndex > primaryIndex) {
      problems.push(
        `Secondary action "${secondaryAction}" must precede primary action "${primaryAction}".`,
      );
    }
  }

  if (
    primaryIndex !== -1 &&
    order.length > 0 &&
    normalizedActionLabel(order.at(-1)) !== normalizedActionLabel(primaryAction)
  ) {
    problems.push("Primary completion action must be visually final in LTR dialogs.");
  }

  if (formBacked && !formSubmitAction) {
    problems.push("Form dialogs must name form_submit_action.");
  }

  if (
    formSubmitAction &&
    primaryAction &&
    normalizedActionLabel(formSubmitAction) !== normalizedActionLabel(primaryAction)
  ) {
    problems.push("Form submit/default Enter action must match the primary completion action.");
  }

  return {
    context,
    status: problems.length > 0 ? "fail" : "pass",
    order,
    primary_action: primaryAction,
    secondary_actions: secondaryActions,
    form_submit_action: formSubmitAction,
    problems,
  };
}

function reviewModalActions(candidate) {
  const entries = normalizeModalActionEvidence(candidate);
  const reviewed = entries.map(reviewModalActionEntry);
  const failures = reviewed.filter((entry) => entry.status === "fail");
  const applicable = reviewed.filter((entry) => entry.status !== "not_applicable");

  return {
    status:
      failures.length > 0
        ? "fail"
        : entries.length > 0 && applicable.length === 0
          ? "not_applicable"
          : "pass",
    reviewed: reviewed.length,
    entries: reviewed,
    failures,
  };
}

function buildImplementationCandidateChecks(candidate, implementationContract) {
  const text = candidateText(candidate);
  const rawControls = detectRawControls(text);
  const primitivesUsed = normalizeCandidateList(candidate, [
    "primitives_used",
    "approved_primitives_used",
    "interface_primitives_used",
  ]);
  const approvedPrimitives = new Set(implementationContract.approved_primitives);
  const inventedPrimitives = primitivesUsed.filter(
    (primitive) => !approvedPrimitives.has(primitive),
  );
  const statesCovered = normalizeCandidateList(candidate, [
    "states_covered",
    "states_verified",
    "state_coverage",
  ]);
  const requiredStates = implementationContract.state_coverage.required_states;
  const missingStates = requiredStates.filter((state) => !statesCovered.includes(state));
  const staticChecks = normalizeCandidateList(candidate, [
    "static_checks",
    "static_check_commands",
    "checks_run",
  ]);
  const browserQa = isPlainObject(candidate)
    ? candidate.browser_qa ?? candidate.browser_qa_evidence
    : null;
  const browserQaText = isPlainObject(browserQa)
    ? JSON.stringify(browserQa).toLowerCase()
    : "";
  const hasDesktopQa = /desktop|wide|1024|1280|1440/.test(browserQaText);
  const hasMobileQa = /mobile|narrow|375|390|414/.test(browserQaText);
  const browserQaRequired = implementationContract.browser_qa.required;
  const missingBrowserQa = browserQaRequired && (!browserQaText || !hasDesktopQa || !hasMobileQa);
  const modalActions = reviewModalActions(candidate);
  const findings = [];

  if (rawControls.length > 0) {
    findings.push({
      severity: "fail",
      check: "raw_controls",
      message:
        "Feature UI emits raw form controls instead of approved primitives.",
      evidence: rawControls,
    });
  }

  if (inventedPrimitives.length > 0) {
    findings.push({
      severity: "fail",
      check: "approved_primitives",
      message: "Candidate uses primitives that are not in the implementation contract.",
      evidence: inventedPrimitives,
    });
  }

  if (missingStates.length > 0) {
    findings.push({
      severity: "fail",
      check: "state_coverage",
      message: "Candidate is missing required UI states.",
      evidence: missingStates,
    });
  }

  if (staticChecks.length === 0) {
    findings.push({
      severity: "fail",
      check: "static_enforcement",
      message: "Candidate does not provide local static enforcement evidence.",
      evidence: implementationContract.static_enforcement.default_rules,
    });
  }

  if (missingBrowserQa) {
    findings.push({
      severity: "fail",
      check: "browser_qa",
      message:
        "Candidate does not provide desktop and mobile browser QA evidence.",
      evidence: implementationContract.browser_qa.checks,
    });
  }

  for (const failure of modalActions.failures) {
    findings.push({
      severity: "fail",
      check: "modal_actions",
      message: "Non-destructive modal actions must put cancel/dismiss before the primary completion action, with the primary action visually final.",
      evidence: {
        context: failure.context,
        problems: failure.problems,
      },
    });
  }

  return {
    raw_controls: {
      status: rawControls.length === 0 ? "pass" : "fail",
      detected: rawControls,
    },
    approved_primitives: {
      status: inventedPrimitives.length === 0 ? "pass" : "fail",
      used: primitivesUsed,
      invented: inventedPrimitives,
    },
    state_coverage: {
      status: missingStates.length === 0 ? "pass" : "fail",
      required: requiredStates,
      covered: statesCovered,
      missing: missingStates,
    },
    static_enforcement: {
      status: staticChecks.length > 0 ? "pass" : "fail",
      evidence: staticChecks,
    },
    browser_qa: {
      status: missingBrowserQa ? "fail" : "pass",
      desktop: hasDesktopQa,
      mobile: hasMobileQa,
    },
    modal_actions: {
      status: modalActions.status,
      reviewed: modalActions.reviewed,
      entries: modalActions.entries,
    },
    findings,
  };
}

export function reviewUiImplementationCandidate(candidate, options = {}) {
  if (
    (typeof candidate !== "string" || candidate.trim().length === 0) &&
    !isPlainObject(candidate)
  ) {
    throw new JudgmentKitInputError(
      "reviewUiImplementationCandidate requires candidate text or an object.",
    );
  }

  const contract = options.contract ?? loadActivityContract(options.contractPath);
  const implementationContract = normalizeUiImplementationContract(
    options.implementation_contract ??
      options.ui_implementation_contract ??
      contract.implementation_contract,
    { contract },
  );
  const checks = buildImplementationCandidateChecks(candidate, implementationContract);
  const failed = checks.findings.some((finding) => finding.severity === "fail");
  const packet = {
    version: contract.version,
    contract_id: contract.id,
    workflow_id: getContractWorkflowId(contract),
    implementation_review_status: failed ? "failed" : "passed",
    implementation_contract_id: implementationContract.id,
    generation_gates: [
      {
        id: "activity_gate",
        status: "not_evaluated_by_this_tool",
        requirement:
          "Use activity and workflow review tools before implementation review.",
      },
      {
        id: "implementation_gate",
        status: failed ? "failed" : "passed",
        requirement:
          "Generated UI must use approved primitives and provide static plus browser QA evidence.",
      },
    ],
    checks: {
      raw_controls: checks.raw_controls,
      approved_primitives: checks.approved_primitives,
      state_coverage: checks.state_coverage,
      static_enforcement: checks.static_enforcement,
      browser_qa: checks.browser_qa,
      modal_actions: checks.modal_actions,
    },
    findings: checks.findings,
    implementation_contract: implementationContract,
  };

  assertNoStyleFields(packet);

  return packet;
}

function compactImplementationContractForHandoff(implementationContract) {
  return {
    id: implementationContract.id,
    purpose: implementationContract.purpose,
    authority_order: implementationContract.authority_order,
    approved_primitives: implementationContract.approved_primitives,
    state_coverage: implementationContract.state_coverage,
    static_enforcement: implementationContract.static_enforcement,
    browser_qa: implementationContract.browser_qa,
    failure_signals: implementationContract.failure_signals,
  };
}

export function createUiGenerationHandoff(workflowReview, options = {}) {
  if (!isPlainObject(workflowReview)) {
    throw new JudgmentKitInputError(
      "createUiGenerationHandoff requires a workflow_review object.",
    );
  }

  if (typeof workflowReview.review_status !== "string") {
    throw new JudgmentKitInputError(
      "createUiGenerationHandoff requires workflow_review.review_status.",
    );
  }

  if (workflowReview.review_status !== "ready_for_review") {
    throw new JudgmentKitInputError(
      "UI generation handoff requires a ready_for_review workflow review.",
      {
        code: "handoff_blocked",
        details: buildUiGenerationHandoffBlockDetails(workflowReview),
      },
    );
  }

  assertReadyUiWorkflowReviewShape(workflowReview);

  const activityCandidate = workflowReview.activity_review.candidate;
  const workflowCandidate = workflowReview.candidate;
  const contract = options.contract ?? loadActivityContract(options.contractPath);
  const implementationContract = normalizeUiImplementationContract(
    options.implementation_contract ??
      options.ui_implementation_contract ??
      contract.implementation_contract,
    { contract },
  );
  const handoff = {
    version: workflowReview.version,
    contract_id: workflowReview.contract_id,
    handoff_status: "ready_for_generation",
    source: {
      mode: workflowReview.source?.mode,
      proposer: workflowReview.source?.proposer,
      input_excerpt: workflowReview.source?.input_excerpt,
    },
    ...(workflowReview.guidance_profile
      ? { guidance_profile: workflowReview.guidance_profile }
      : {}),
    ...(workflowReview.surface_type ? { surface_type: workflowReview.surface_type } : {}),
    activity_model: {
      activity: optionalString(activityCandidate.activity_model?.activity),
      participants: toStringArray(activityCandidate.activity_model?.participants),
      objective: optionalString(activityCandidate.activity_model?.objective),
      outcomes: toStringArray(activityCandidate.activity_model?.outcomes),
      domain_vocabulary: toStringArray(
        activityCandidate.activity_model?.domain_vocabulary,
      ),
    },
    interaction_contract: {
      primary_decision: optionalString(
        activityCandidate.interaction_contract?.primary_decision,
      ),
      next_actions: toStringArray(activityCandidate.interaction_contract?.next_actions),
      completion: optionalString(activityCandidate.interaction_contract?.completion),
      make_easy: toStringArray(activityCandidate.interaction_contract?.make_easy),
    },
    workflow: {
      surface_name: optionalString(workflowCandidate.workflow.surface_name),
      steps: toStringArray(workflowCandidate.workflow.steps),
      primary_actions: toStringArray(workflowCandidate.workflow.primary_actions),
      decision_points: toStringArray(workflowCandidate.workflow.decision_points),
      completion_state: optionalString(workflowCandidate.workflow.completion_state),
    },
    primary_surface: {
      sections: toStringArray(workflowCandidate.primary_ui.sections),
      controls: toStringArray(workflowCandidate.primary_ui.controls),
      user_facing_terms: toStringArray(workflowCandidate.primary_ui.user_facing_terms),
    },
    handoff: {
      next_owner: optionalString(workflowCandidate.handoff.next_owner),
      reason: optionalString(workflowCandidate.handoff.reason),
      next_action: optionalString(workflowCandidate.handoff.next_action),
    },
    disclosure_reminders: {
      diagnostic_terms: termEntriesToNames(
        workflowReview.guardrails?.implementation_terms_detected,
      ),
      diagnostic_contexts: toStringArray(workflowCandidate.diagnostics?.reveal_contexts),
      translation_candidates:
        workflowReview.guardrails?.disclosure_translation_candidates ?? [],
      terms_to_keep_out_of_primary_ui: buildTermsToKeepOutOfPrimaryUi(workflowReview),
      primary_ui_rule:
        "Keep implementation details and JudgmentKit review-packet terms out of product UI.",
    },
    generation_gates: [
      {
        id: "activity_gate",
        status: "passed",
        evidence: [
          "activity model reviewed",
          "workflow candidate ready",
          "disclosure boundary checked",
        ],
      },
      {
        id: "implementation_gate",
        status: "required_before_final_handoff",
        evidence: [
          "use approved primitives",
          "run static enforcement",
          "complete desktop and mobile browser QA",
        ],
      },
    ],
    implementation_contract:
      compactImplementationContractForHandoff(implementationContract),
  };

  assertNoStyleFields(handoff);

  return handoff;
}

function textFromHandoff(handoff) {
  return [
    handoff.activity_model?.activity,
    handoff.activity_model?.objective,
    ...(toStringArray(handoff.activity_model?.participants)),
    ...(toStringArray(handoff.activity_model?.outcomes)),
    ...(toStringArray(handoff.activity_model?.domain_vocabulary)),
    handoff.interaction_contract?.primary_decision,
    ...(toStringArray(handoff.interaction_contract?.next_actions)),
    handoff.interaction_contract?.completion,
    handoff.workflow?.surface_name,
    ...(toStringArray(handoff.workflow?.steps)),
    ...(toStringArray(handoff.workflow?.primary_actions)),
    ...(toStringArray(handoff.workflow?.decision_points)),
    handoff.workflow?.completion_state,
    ...(toStringArray(handoff.primary_surface?.sections)),
    ...(toStringArray(handoff.primary_surface?.controls)),
    ...(toStringArray(handoff.primary_surface?.user_facing_terms)),
    handoff.handoff?.next_owner,
    handoff.handoff?.reason,
    handoff.handoff?.next_action,
  ].filter(Boolean).join(" ");
}

function normalizeFrontendContext(value) {
  return isPlainObject(value) ? value : {};
}

function normalizeVerificationContext(value) {
  return isPlainObject(value) ? value : {};
}

function normalizeDesignSystemAdapter(value) {
  return isPlainObject(value) ? value : {};
}

function normalizeInstructionFormat(value) {
  const format = optionalString(value);

  if (!format) {
    return "structured_markdown";
  }

  if (!["structured_markdown", "markdown"].includes(format)) {
    throw new JudgmentKitInputError(
      "instruction_format must be structured_markdown or markdown when provided.",
    );
  }

  return format;
}

function optionalDesignSystemName(...values) {
  for (const value of values) {
    const name = optionalString(value);

    if (!name) {
      continue;
    }

    if (
      ["none", "no external ui library", "no external library"].includes(
        name.toLowerCase(),
      )
    ) {
      continue;
    }

    return name;
  }

  return "";
}

export function createFrontendGenerationContext({
  ui_generation_handoff: uiGenerationHandoff,
  surface_review: surfaceReview,
  surface_type: surfaceType,
  frontend_context: frontendContext,
  verification,
  contract,
  contractPath,
} = {}) {
  if (!isPlainObject(uiGenerationHandoff)) {
    throw new JudgmentKitInputError(
      "createFrontendGenerationContext requires ui_generation_handoff.",
    );
  }

  if (uiGenerationHandoff.handoff_status !== "ready_for_generation") {
    throw new JudgmentKitInputError(
      "Frontend generation context requires a ready UI generation handoff.",
      {
        code: "frontend_context_blocked",
        details: {
          handoff_status: uiGenerationHandoff.handoff_status,
          review_status: uiGenerationHandoff.review_status,
        },
      },
    );
  }

  const resolvedContract = contract ?? loadActivityContract(contractPath);
  const selectedSurfaceType = normalizeOptionalSurfaceType(
    surfaceType ?? uiGenerationHandoff.surface_type ?? surfaceReview?.recommended_surface_type,
  );
  const inferredSurfaceReview = isPlainObject(surfaceReview)
    ? surfaceReview
    : selectedSurfaceType
      ? {
          recommended_surface_type: resolveSurfaceType(
            resolvedContract,
            selectedSurfaceType,
          ).surface_type,
          confidence: "provided",
          blocked_surface_types: [],
          ...buildSurfaceImplications(selectedSurfaceType),
        }
      : recommendSurfaceTypes(textFromHandoff(uiGenerationHandoff), {
          contract: resolvedContract,
          activity_review: {
            review_status: "ready_for_review",
            candidate: {
              activity_model: uiGenerationHandoff.activity_model,
              interaction_contract: uiGenerationHandoff.interaction_contract,
              disclosure_policy: {
                terms_to_use: uiGenerationHandoff.primary_surface?.user_facing_terms ?? [],
              },
            },
          },
        });
  const surfaceGuidance = summarizeSurfaceReview(inferredSurfaceReview, {
    includeFrontendPosture: true,
  });
  const normalizedFrontendContext = normalizeFrontendContext(frontendContext);
  const normalizedVerification = normalizeVerificationContext(verification);

  return {
    version: uiGenerationHandoff.version,
    contract_id: uiGenerationHandoff.contract_id,
    workflow_id: getContractWorkflowId(resolvedContract),
    frontend_context_status: "ready_for_frontend_implementation",
    source: {
      handoff_status: uiGenerationHandoff.handoff_status,
      surface_type_source: isPlainObject(surfaceReview)
        ? "surface_review"
        : selectedSurfaceType
          ? "provided_surface_type"
          : "inferred_from_handoff",
    },
    surface_type: surfaceGuidance.recommended_surface_type,
    surface_guidance: surfaceGuidance,
    activity_model: uiGenerationHandoff.activity_model,
    interaction_contract: uiGenerationHandoff.interaction_contract,
    workflow: uiGenerationHandoff.workflow,
    primary_surface: uiGenerationHandoff.primary_surface,
    handoff: uiGenerationHandoff.handoff,
    implementation_contract: uiGenerationHandoff.implementation_contract,
    disclosure_reminders: uiGenerationHandoff.disclosure_reminders,
    frontend_context: {
      target_runtime: optionalString(normalizedFrontendContext.target_runtime),
      ui_library: optionalString(normalizedFrontendContext.ui_library),
      project_rules: toStringArray(normalizedFrontendContext.project_rules),
      approved_component_families: toStringArray(
        normalizedFrontendContext.approved_component_families,
      ),
      files_or_entrypoints: toStringArray(normalizedFrontendContext.files_or_entrypoints),
    },
    implementation_guidance: {
      surface_type: surfaceGuidance.recommended_surface_type,
      interaction_implications: surfaceGuidance.interaction_implications,
      disclosure_implications: surfaceGuidance.disclosure_implications,
      frontend_posture: surfaceGuidance.frontend_posture,
      implementation_contract: uiGenerationHandoff.implementation_contract,
      required_sections: toStringArray(uiGenerationHandoff.primary_surface?.sections),
      required_controls: toStringArray(uiGenerationHandoff.primary_surface?.controls),
      verification_expectations: {
        commands: toStringArray(normalizedVerification.commands),
        browser_checks: toStringArray(normalizedVerification.browser_checks),
        states_to_verify: toStringArray(normalizedVerification.states_to_verify),
      },
    },
    guardrails: {
      adapter_layer: true,
      requires_ready_handoff: true,
      activity_first: true,
      terms_to_keep_out_of_primary_ui:
        uiGenerationHandoff.disclosure_reminders?.terms_to_keep_out_of_primary_ui ?? [],
      diagnostic_contexts:
        uiGenerationHandoff.disclosure_reminders?.diagnostic_contexts ?? [],
      approved_primitives:
        uiGenerationHandoff.implementation_contract?.approved_primitives ?? [],
    },
  };
}

function buildFrontendImplementationInstructionMarkdown({
  frontendGenerationContext,
  designSystemPolicy,
  targetClient,
}) {
  const implementationGuidance = frontendGenerationContext.implementation_guidance ?? {};
  const verification = implementationGuidance.verification_expectations ?? {};
  const frontendContext = frontendGenerationContext.frontend_context ?? {};
  const lines = [
    "# Frontend Implementation Skill Context",
    "",
    "Use this only after a ready JudgmentKit frontend context. Implement from the activity, workflow, required sections, controls, and implementation contract before applying renderer choices.",
    "",
    "## Source",
    `- Target client: ${targetClient || "agent"}`,
    `- Surface type: ${frontendGenerationContext.surface_type || "unspecified"}`,
    `- Runtime: ${frontendContext.target_runtime || "unspecified"}`,
    `- UI library: ${frontendContext.ui_library || "unspecified"}`,
    "",
    "## Implementation Sequence",
    "- Confirm the activity, primary decision, workflow, and handoff are represented in the surface.",
    "- Shape the interface around the selected surface type and required sections.",
    "- Use approved primitives and approved component families before introducing new UI helpers.",
    "- Apply any design system only as the renderer after the activity and workflow are clear.",
    "- Verify required states, static checks, browser checks, and disclosure boundaries.",
    "- Review generated code or evidence with review_ui_implementation_candidate before final handoff.",
    "",
    "## Required Surface",
    `- Sections: ${toStringArray(implementationGuidance.required_sections).join("; ") || "none supplied"}`,
    `- Controls: ${toStringArray(implementationGuidance.required_controls).join("; ") || "none supplied"}`,
    "",
    "## Design System Policy",
    `- Mode: ${designSystemPolicy.mode}`,
    `- Authority: ${designSystemPolicy.authority}`,
    `- Constraint: ${designSystemPolicy.constraint}`,
    "",
    "## Verification",
    `- Commands: ${toStringArray(verification.commands).join("; ") || "none supplied"}`,
    `- Browser checks: ${toStringArray(verification.browser_checks).join("; ") || "none supplied"}`,
    `- States: ${toStringArray(verification.states_to_verify).join("; ") || "none supplied"}`,
  ];

  return lines.join("\n");
}

export function createFrontendImplementationSkillContext({
  frontend_generation_context: frontendGenerationContext,
  design_system_adapter: designSystemAdapter,
  target_client: targetClient,
  instruction_format: instructionFormat,
} = {}) {
  if (!isPlainObject(frontendGenerationContext)) {
    throw new JudgmentKitInputError(
      "createFrontendImplementationSkillContext requires frontend_generation_context.",
    );
  }

  if (
    frontendGenerationContext.frontend_context_status !==
    "ready_for_frontend_implementation"
  ) {
    throw new JudgmentKitInputError(
      "Frontend implementation skill context requires a ready frontend generation context.",
      {
        code: "frontend_skill_context_blocked",
        details: {
          frontend_context_status: frontendGenerationContext.frontend_context_status,
          handoff_status: frontendGenerationContext.source?.handoff_status,
        },
      },
    );
  }

  const normalizedDesignSystemAdapter = normalizeDesignSystemAdapter(designSystemAdapter);
  const normalizedTargetClient = optionalString(targetClient);
  const normalizedInstructionFormat = normalizeInstructionFormat(instructionFormat);
  const frontendContext = frontendGenerationContext.frontend_context ?? {};
  const implementationGuidance =
    frontendGenerationContext.implementation_guidance ?? {};
  const implementationContract =
    frontendGenerationContext.implementation_contract ?? {};
  const verificationExpectations =
    implementationGuidance.verification_expectations ?? {};
  const designSystemName = optionalDesignSystemName(
    normalizedDesignSystemAdapter.design_system_name ??
      normalizedDesignSystemAdapter.name ??
      frontendContext.ui_library,
  );
  const designSystemPackage = optionalString(
    normalizedDesignSystemAdapter.design_system_package ??
      normalizedDesignSystemAdapter.package,
  );
  const designSystemComponents = toStringArray(
    normalizedDesignSystemAdapter.components ??
      normalizedDesignSystemAdapter.approved_component_families,
  );
  const designSystemPolicy = {
    mode: designSystemName
      ? "adapter_after_judgment"
      : "no_design_system_adapter_provided",
    name: designSystemName,
    package: designSystemPackage,
    role:
      optionalString(normalizedDesignSystemAdapter.role) ||
      "renderer after activity and workflow judgment",
    authority:
      "The ready handoff and implementation contract remain authoritative; renderer choices cannot replace activity fit.",
    renderer_components: designSystemComponents,
    constraint:
      optionalString(normalizedDesignSystemAdapter.constraint) ||
      "Design-system compliance refines the rendered UI only after activity, workflow, disclosure, and implementation gates are ready.",
  };
  const verificationChecklist = unique([
    ...toStringArray(verificationExpectations.commands).map(
      (command) => `Run ${command}`,
    ),
    ...toStringArray(implementationContract.static_enforcement?.default_rules),
    ...toStringArray(verificationExpectations.browser_checks),
    ...toStringArray(implementationContract.browser_qa?.checks),
    ...toStringArray(verificationExpectations.states_to_verify).map(
      (state) => `Verify state: ${state}`,
    ),
    ...toStringArray(implementationContract.state_coverage?.required_states).map(
      (state) => `Verify required state: ${state}`,
    ),
  ]);
  const packet = {
    version: frontendGenerationContext.version,
    contract_id: frontendGenerationContext.contract_id,
    workflow_id: frontendGenerationContext.workflow_id,
    skill_context_status: "ready",
    source_skill: {
      name: "frontend-ui-implementation",
      version: "compiled-from-project-skill",
      raw_skill_exposed: false,
    },
    source: {
      frontend_context_status: frontendGenerationContext.frontend_context_status,
      surface_type: frontendGenerationContext.surface_type,
      target_client: normalizedTargetClient,
      instruction_format: normalizedInstructionFormat,
    },
    instruction_markdown: buildFrontendImplementationInstructionMarkdown({
      frontendGenerationContext,
      designSystemPolicy,
      targetClient: normalizedTargetClient,
    }),
    implementation_sequence: [
      "Confirm the activity, primary decision, workflow, and handoff from the ready frontend context.",
      "Map the selected surface type to the required sections, controls, density, navigation, and responsive expectations.",
      "Use approved primitives and approved component families before introducing new UI helpers.",
      "Apply the design system only as a renderer adapter after the activity and workflow are represented.",
      "Verify required states, static checks, browser checks, and disclosure boundaries.",
      "Call review_ui_implementation_candidate with generated code or evidence before final handoff.",
    ],
    surface_type_guidance: {
      surface_type: frontendGenerationContext.surface_type,
      interaction_implications:
        implementationGuidance.interaction_implications ?? {},
      disclosure_implications:
        implementationGuidance.disclosure_implications ?? {},
      frontend_posture: implementationGuidance.frontend_posture ?? {},
    },
    approved_primitives: toStringArray(implementationContract.approved_primitives),
    approved_component_families: toStringArray(
      frontendContext.approved_component_families,
    ),
    files_or_entrypoints: toStringArray(frontendContext.files_or_entrypoints),
    design_system_policy: designSystemPolicy,
    verification_checklist: verificationChecklist,
    guardrails: {
      adapter_layer: true,
      requires_ready_frontend_context: true,
      activity_first: true,
      raw_skill_dump: false,
      design_system_is_adapter: true,
      primary_ui_rule:
        "Do not copy JudgmentKit review-packet terms or implementation machinery into the product UI.",
      terms_to_keep_out_of_primary_ui:
        frontendGenerationContext.guardrails?.terms_to_keep_out_of_primary_ui ?? [],
      diagnostic_contexts:
        frontendGenerationContext.guardrails?.diagnostic_contexts ?? [],
    },
    next_recommended_tool: "review_ui_implementation_candidate",
  };

  return packet;
}
