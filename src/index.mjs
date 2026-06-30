import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LUCIDE_ICON_CATALOG,
  LUCIDE_ICON_INDEX,
  LUCIDE_ICON_SOURCE,
} from "./lucide-icon-catalog.generated.mjs";

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
const WORKFLOW_TOPOLOGY_IDS = [
  "workspace",
  "multi_surface",
  "staged_flow",
  "dashboard",
  "report",
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

function getWorkflowTopologyPolicy(contract) {
  const policy = contract.workflow?.topology_policy;

  if (isPlainObject(policy)) {
    return policy;
  }

  return {
    allowed_topologies: WORKFLOW_TOPOLOGY_IDS,
    preferred_default: "workspace",
    work_units_guidance: [
      "Name domain work units without implying a numbered sequence.",
    ],
    surface_set_guidance: [
      "Use coordinated surfaces when the activity needs them.",
    ],
    stepper_eligibility: {
      policy: "strong_intent",
      allowed_when: [],
      not_allowed_when: [],
      failure_signals: [],
    },
  };
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

function toGlobalPattern(pattern) {
  return pattern.flags.includes("g")
    ? pattern
    : new RegExp(pattern.source, `${pattern.flags}g`);
}

function isNegatedMatch(text, start, end) {
  const prefix = text.slice(Math.max(0, start - 72), start);
  const suffix = text.slice(end, Math.min(text.length, end + 56));

  if (/\bnot\s+only[\s/,-]+$/.test(prefix)) {
    return false;
  }

  return (
    /(?:^|[\s([{:;,.!?/-])(?:no|not(?!\s+only\b)|without|never|avoid|avoids|avoiding|exclude|excludes|excluding|do not(?!\s+only\b)|does not(?!\s+only\b)|don't(?!\s+only\b)|doesn't(?!\s+only\b)|did not(?!\s+only\b)|should not|shouldn't|must not|cannot|can't|won't|no need to|need not|not required to)(?:[\s/,-]+\w+){0,6}(?:[\s/,-]+(?:or|and))?[\s/,-]*$/.test(prefix) ||
    /^[\s/,-]+(?:(?:is|are|was|were|be|being|to be|should be|must be|can be|remain|remains)[\s/,-]+)?(?:not required|not needed|never required|never needed|unneeded|unnecessary|optional|absent|disabled|excluded|not included|not present|not part of|not the primary)\b/.test(suffix)
  );
}

function hasAffirmedPattern(text, pattern) {
  const globalPattern = toGlobalPattern(pattern);

  for (const match of text.matchAll(globalPattern)) {
    if (!isNegatedMatch(text, match.index, match.index + match[0].length)) {
      return true;
    }
  }

  return false;
}

function hasAffirmedAny(text, patterns) {
  return patterns.some((pattern) => hasAffirmedPattern(text, pattern));
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
    ...contract.disclosure_policy.product_ui_must_not_show,
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

function hasOperatorReviewProducedWork(text) {
  return hasAffirmedAny(text, [
    /\b(?:ai|model|agent)[- ](?:generated|produced)\b/,
    /\b(?:ai|model)\s+(?:generated\s+)?(?:outputs?|workstreams?|candidates?|findings?|recommendations?|artifacts?|variants?|responses?|drafts?|work)\b/,
    /\bai agents?\s+(?:outputs?|findings?|recommendations?|artifacts?|variants?|responses?|drafts?|work)\b/,
    /\bagent (?:outputs?|findings?|recommendations?)\b/,
    /(?<!design[- ])\bsystem[- ](?:produced|generated)\b/,
    /(?<!design[- ])\bsystem\s+(?:outputs?|work|findings?|recommendations?|artifacts?|variants?|responses?|drafts?)\b/,
    /\b(?:ai|model|agent|system)[- ](?:generated|produced)\s+(?:artifacts?|variants?|responses?|drafts?)\b/,
    /\b(?:artifacts?|variants?|responses?|drafts?)\s+(?:generated|produced) by (?:the )?(?:system|ai|model|agent)\b/,
    /\b(?:produced|generated) by (?:the )?(?:system|ai|model|agent)\b/,
  ]);
}

function buildOperatorReviewTriggerEvidence(input, contract) {
  const normalized = normalizeText(input);
  const implementationTermsDetected = detectImplementationTerms(input, contract);
  const hasReviewActor = hasAffirmedAny(normalized, [
    /\b(?:human|operator|reviewer|lead|manager|approver)\b/,
    /\b(?:review|reviews|reviewing|approve|approval|authorize|authorization)\b/,
  ]);
  const hasProducedWork = hasOperatorReviewProducedWork(normalized);
  const hasDecision = hasAffirmedAny(normalized, [
    /\b(?:decision|decide|decides|deciding|choose|chooses|choosing|approve|block|blocking|defer|tighten|handoff|authorize|return|escalate|accept|reject)\b/,
  ]);
  const hasEvidenceOrRisk = hasAffirmedAny(normalized, [
    /\b(?:evidence|risk|compare|compares|comparing|confidence|finding|reason|policy|source|artifact|artifacts|variant|variants|response|responses|draft|drafts)\b/,
  ]);
  const hasAdvancementAction = hasAffirmedAny(normalized, [
    /\b(?:approve(?:d|s|ing)?|block(?:ed|s|ing)?|defer(?:red|s|ring)?|tighten(?:ed|s|ing)?|handoff|hand off|handed off|return(?:ed|s|ing)?|escalat(?:e|ed|es|ing)|authoriz(?:e|ed|es|ing)|accept(?:ed|s|ing)?|reject(?:ed|s|ing)?)\b/,
  ]);
  const hasClosure = hasAffirmedAny(normalized, [
    /\b(?:handoff|receipt|audit|closure|closed|complete|completion|done|accepted|rejected)\b/,
  ]);
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
        hasAffirmedAny(normalized, [
          /\b(?:multiple|several|queue|list|items|cases|agents|workstreams|candidates|findings|artifacts|variants|responses|drafts|outputs)\b/,
          /\b(?:two|three|four|five|\d+)\s+(?:artifacts?|variants?|responses?|drafts?|outputs?|findings?|candidates?|items?)\b/,
        ]),
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
        "Raw system mechanics exist, but should not drive the product UI.",
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
  const hasDecisionOrReview = hasAffirmedAny(normalized, [
    /\b(?:review|reviewing|decision|decide|approve|block|handoff|authorize)\b/,
  ]);
  const hasProducedWork = hasOperatorReviewProducedWork(normalized);
  const hasOperationalWorkbenchShape =
    (/\b(?:workbench|workspace)\b/.test(normalized) &&
      /\b(?:review|reviews|reviewing|decide|deciding|handoff|assign|reassign|escalate|triage|compare|comparing)\b/.test(normalized)) ||
    (/\b(?:dispatcher|dispatch|field-service|field service|exceptions?|visits?|selected visit)\b/.test(normalized) &&
      /\b(?:review|reviews|reviewing|decide|deciding|handoff|assign|reassign|escalate)\b/.test(normalized));

  return [
    matchedEvidence(
      "operational_workbench_shape",
      "Explicit operational workbench activity should use workbench unless produced AI/system work is the object.",
      hasOperationalWorkbenchShape && !hasProducedWork,
      "Looked for workbench, dispatch, exceptions, visits, selected visit, and operational decision language.",
    ),
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
        /\bno (?:\w+\s+){0,3}decision\b/.test(normalized) ||
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
  const hasProducedWorkReview = triggerEvidence.triggers.some(
    (entry) => entry.id === "human_review_before_advance" && entry.matched,
  );
  const triggerThreshold = Math.floor(triggerEvidence.triggers.length / 2) + 1;
  const status = matchedExclusions.length > 0
    ? "blocked"
    : hasProducedWorkReview && matchedTriggers.length >= triggerThreshold
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

function buildSurfaceTypeInputs(input, activityReview, contract, options = {}) {
  const reviewCandidate = activityReview?.candidate ?? {};
  const activityModel = reviewCandidate.activity_model ?? {};
  const interactionContract = reviewCandidate.interaction_contract ?? {};
  const disclosurePolicy = reviewCandidate.disclosure_policy ?? {};
  const sourceMissingEvidence =
    activityReview?.guardrails?.source_missing_evidence ?? {};
  const hasAffirmedSourceDecision = hasAffirmedAny(normalizeText(input), [
    /\b(?:decision|decide|decides|deciding|choose|chooses|choosing|compare|compares|comparing|approve|block|blocking|return|handoff|prioritize|resolve|submit|complete)\b/,
  ]);
  const hasSourceDecision =
    sourceMissingEvidence.decision === false &&
    (hasAffirmedSourceDecision || options.hasExplicitActivityReview);
  const sourceText = [
    input,
    activityModel.activity,
    hasSourceDecision ? activityModel.objective : "",
    ...(toStringArray(activityModel.participants)),
    ...(hasSourceDecision ? toStringArray(activityModel.outcomes) : []),
    ...(toStringArray(activityModel.domain_vocabulary)),
    hasSourceDecision ? interactionContract.primary_decision : "",
    ...(hasSourceDecision ? toStringArray(interactionContract.next_actions) : []),
    hasSourceDecision ? interactionContract.completion : "",
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
  const hasReviewDecision = hasAffirmedAny(text, [
    /\b(?:review|reviews|reviewing|compare|compares|comparing|decide|decides|deciding|approve|approval|block|blocking|handoff|prioritize|return|escalate)\b/,
  ]);
  const hasDecision = hasAffirmedAny(text, [
    /\b(?:decision|decide|decides|deciding|choose|chooses|choosing|compare|compares|comparing|approve|block|blocking|return|handoff|prioritize|resolve|submit|complete)\b/,
  ]);
  const hasBoundedDecisionAction = hasAffirmedAny(text, [
    /\b(?:decision|decide|decides|deciding|choose|chooses|choosing|approve|block|blocking|return|handoff|prioritize|resolve|submit|complete|save|saving)\b/,
  ]);
  const hasNoDecisionRequired =
    /\bno (?:operational |active |bounded |human |user )?decision(?:\s+(?:is|are))?\s+(?:required|needed|necessary|expected)\b/.test(text) ||
    /\b(?:without|requires no|needs no) (?:operational |active |bounded |human |user )?decision\b/.test(text);
  const hasMarketing = hasAffirmedAny(text, [
    /\b(?:marketing|landing page|homepage|home page|campaign|pricing|signup|sign up|trial|demo|conversion|convert|prospect|visitor|buyer|offer|value prop|value proposition|positioning)\b/,
    /\b(?:lead capture|lead form|lead gen|lead generation|qualified lead|sales lead)\b/,
    /\b(?:launch campaign|launch page|go-to-market|go to market|product launch page)\b/,
  ]);
  const hasFormDataEntryIntent =
    hasAffirmedAny(text, [
      /\b(?:form|submit|submission|intake|application|onboarding|settings|profile|checkout|edit|update|enter|collect|structured information)\b/,
      /\b(?:submits|submitting|edits|editing|updates|updating|enters|entering|collects|collecting)\b/,
      /\bcreate (?:a |an )?(?:account|profile|application|intake|request|record|case|ticket|entry)\b/,
    ]);
  const hasFormValidationIntent =
    hasAffirmedAny(text, [
      /\b(?:validation|invalid|input|error state|save changes|confirm|confirmation|saved settings)\b/,
      /\b(?:required|form|input) fields?\b/,
      /\brequired (?:\w+\s+){0,3}(?:information|details|data|fields?|inputs?|documents?)\b/,
    ]);
  const hasStructuredFormFlow =
    hasFormDataEntryIntent && hasFormValidationIntent;
  const hasSpecificWorkbenchItems =
    hasAffirmedAny(text, [
      /\b(?:queue|multiple|several|cases|requests|findings|workstreams|candidates|exceptions|visits|selected visit|route impact|decision state|handoff owner|next-action receipt|cohorts|playlists?|tracks?|songs?|sequence)\b/,
    ]);
  const hasGenericWorkbenchItems =
    hasAffirmedAny(text, [/\b(?:list|items|records)\b/]);
  const hasExplicitWorkbench =
    hasAffirmedAny(text, [/\b(?:workbench|workspace|queue)\b/]);
  const hasOperationalActor =
    hasAffirmedAny(text, [
      /\b(?:operator|analyst|manager|lead|reviewer|team|support|operations|planner|dispatcher|officer|coordinator)\b/,
    ]);
  const hasEvidenceComparison =
    hasAffirmedAny(text, [
      /\b(?:evidence|compare|compares|comparing|context|risk|reason|documents?|route impact|selected|policy|cohorts|conflicts?|constraints?|sequence|energy flow|guest preference|dinner mood|genre balance)\b/,
    ]);
  const hasFormPrimary =
    hasStructuredFormFlow ||
    (hasFormDataEntryIntent &&
      hasAffirmedAny(text, [
        /\b(?:submit|submission|enter|collect|update|edit|onboarding|settings|profile|checkout|intake|required|validation|input|save changes|confirmation)\b/,
        /\b(?:submits|submitting|edits|editing|updates|updating|enters|entering|collects|collecting)\b/,
      ]));
  const hasInternalFormContext =
    hasFormPrimary &&
    hasAffirmedAny(text, [
      /\b(?:internal|admin|operations|crm|record|settings|profile|application|intake|checkout|purchase|shipping|payment)\b/,
    ]);
  const hasRawSetupDebugIntent = hasAffirmedAny(text, [
    /\b(?:setup|configure|configuration|debug|debugging|troubleshoot|test connection|integration setup|audit integration|safe to ship|release risk|diagnostic (?:console|status|evidence|handoff)|run diagnostics)\b/,
  ]);
  const hasSetupDebugActivityContext = hasAffirmedAny(text, [
    /\b(?:setup|configure|configuration|configured|debug|debugging|troubleshoot|troubleshooting|test connection|integration setup|integration (?:test|testing|diagnostics?|troubleshooting|configuration)|audit integration|audit|auditing|safe to ship|release risk|diagnostic (?:console|status|evidence|handoff)|run diagnostics)\b/,
  ]);
  const hasImplementationMachineryCue =
    implementationTermsDetected.length > 0 ||
    hasAffirmedAny(text, [
      /\b(?:schema change|prompt template|api endpoint|tool call trace|raw system mechanics|mcp server|json schema)\b/,
    ]);
  const hasConversationPrimary = hasAffirmedAny(text, [
    /\b(?:chat|conversation|thread|message composer|assistant exchange|live chat|open-ended|open ended|reply|respond|back and forth)\b/,
  ]);
  const hasReadingOrReportPrimary =
    hasAffirmedAny(text, [
      /\b(?:content page|report|memo|article|doc|docs|documentation|guide|read|reads|reading|understand|understanding|learn|cite|citing|share|sharing|reference|summary|narrative)\b/,
    ]) && (!hasBoundedDecisionAction || hasNoDecisionRequired);
  const hasWorkbenchWorkShape =
    (hasExplicitWorkbench &&
      hasAffirmedAny(text, [
        /\b(?:review|reviews|reviewing|compare|compares|comparing|triage|prioritize|decide|decides|deciding|handoff|assign|reassign|escalate)\b/,
      ]) &&
      (hasSpecificWorkbenchItems ||
        (hasGenericWorkbenchItems && !hasFormPrimary))) ||
    (hasAffirmedAny(text, [
      /\b(?:review|reviews|reviewing|compare|compares|comparing|triage|prioritize)\b/,
    ]) &&
      (hasSpecificWorkbenchItems ||
        (hasGenericWorkbenchItems && !hasFormPrimary))) ||
    (hasOperationalActor && hasReviewDecision && hasEvidenceComparison && !hasFormPrimary);
  const hasSetupDebug =
    hasRawSetupDebugIntent ||
    (hasSetupDebugActivityContext && hasImplementationMachineryCue);
  const hasConversation =
    hasAffirmedAny(text, [
      /\b(?:chat|conversation|thread|message composer|assistant exchange|live chat|open-ended|open ended)\b/,
    ]);
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
        hasAffirmedAny(text, [
          /\b(?:visitor|prospect|buyer|public audience|new customer)\b/,
          /\b(?:lead capture|lead form|lead gen|lead generation|qualified lead|sales lead)\b/,
        ]),
        "Looked for external audience language.",
      ),
      surfaceEvidence(
        "offer_proof_action",
        "The work needs message, proof, and a primary call to action.",
        hasAffirmedAny(text, [
          /\b(?:benefit|proof|testimonial|case study|cta|call to action|signup|sign up|book a demo|get started)\b/,
        ]),
        "Looked for offer, proof, and call-to-action language.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "bounded_work_decision",
        "Workbench decision work should not be treated as marketing.",
        hasAffirmedAny(text, [
          /\b(?:review|reviews|reviewing|compare|compares|comparing|approve|approval|block|blocking|handoff|triaging|queue|workbench|workspace)\b/,
        ]),
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
        hasSpecificWorkbenchItems || hasGenericWorkbenchItems,
        "Looked for queues, lists, cases, requests, findings, workstreams, exceptions, visits, or workbench language.",
      ),
      surfaceEvidence(
        "domain_operator",
        "A domain operator, analyst, manager, lead, or team uses the surface.",
        hasOperationalActor && hasReviewDecision,
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
        hasConversationPrimary &&
          (!hasWorkbenchWorkShape || !hasSpecificWorkbenchItems),
        "Conversation or chat is the primary activity.",
      ),
      surfaceEvidence(
        "passive_monitoring",
        "Passive monitoring should stay a dashboard monitor.",
        /\b(?:passive dashboard|monitor|monitoring|status overview|trend dashboard|health dashboard)\b/.test(text) && !hasReviewDecision,
        "Monitoring or dashboard language appears without decision work.",
      ),
      surfaceEvidence(
        "reading_or_report_primary",
        "Reading, citing, or sharing a report should not become a workbench.",
        hasReadingOrReportPrimary,
        "Report, documentation, reading, citing, sharing, or narrative language is primary without bounded action.",
      ),
      surfaceEvidence(
        "structured_form_flow",
        "Structured form and validation work should stay a form flow.",
        hasFormPrimary &&
          !(hasSpecificWorkbenchItems && hasReviewDecision && hasEvidenceComparison),
        "Form, validation, required input, submit, or confirmation language is primary.",
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
      score: profile.status === "recommended" ? Math.max(score.score, 4) : 0,
      profile_id: OPERATOR_REVIEW_PROFILE_ID,
      profile_status: profile.status,
    };
  }

  if (surfaceType === "form_flow") {
    const triggers = [
      surfaceEvidence(
        "collect_or_change_structured_information",
        "The surface collects or changes structured information.",
        hasFormDataEntryIntent,
        "Looked for form, submit, intake, onboarding, settings, profile, edit, update, explicit create-record, or collect language.",
      ),
      surfaceEvidence(
        "validation_or_required_inputs",
        "Completion depends on validation or required inputs.",
        hasFormValidationIntent && hasFormDataEntryIntent,
        "Looked for validation, required inputs, save, confirm, or input language.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "multi_item_review",
        "Multi-item review belongs in a workbench or operator review surface.",
        hasAffirmedAny(text, [
          /\b(?:queue|multiple|several|compare|review findings|triage)\b/,
        ]) && !hasFormPrimary,
        "Reviewing multiple items is not primarily a form flow.",
      ),
      surfaceEvidence(
        "marketing_primary",
        "Marketing pages may contain forms but are not primarily form flows.",
        hasMarketing &&
          !hasInternalFormContext,
        "Marketing conversion language is dominant.",
      ),
    ];

    return makeSurfaceScore(surfaceType, triggers, exclusions, definition);
  }

  if (surfaceType === "dashboard_monitor") {
    const hasDashboardMonitoringContext = hasAffirmedAny(text, [
      /\b(?:dashboard|monitor|monitoring|metrics|status|trend|trends|health|kpi|alert|alerts|overview|analytics|tracking|watch)\b/,
    ]);
    const hasPassiveOrPeriodicRead =
      hasAffirmedAny(text, [
        /\b(?:passive|overview|at a glance|tracking|watch|weekly|daily status)\b/,
      ]) ||
      (hasDashboardMonitoringContext && /\bno decision\b/.test(text));
    const triggers = [
      surfaceEvidence(
        "monitor_status_or_trends",
        "The surface tracks status, exceptions, trends, or operational health.",
        hasDashboardMonitoringContext,
        "Looked for dashboard, monitor, metrics, status, trends, health, alerts, overview, or analytics language.",
      ),
      surfaceEvidence(
        "passive_or_periodic_read",
        "The surface is used for passive or periodic status reading.",
        hasPassiveOrPeriodicRead,
        "Looked for passive, overview, tracking, watching, or no-decision language.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "bounded_decision_work",
        "Bounded review decisions should not be reduced to a dashboard.",
        hasAffirmedAny(text, [
          /\b(?:approve|block|return|handoff|decide whether|triaging)\b/,
        ]),
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
        /\b(?:content page|report|memo|article|doc|docs|documentation|guide|read|reads|reading|understand|understanding|learn|cite|citing|share|sharing|publish|reference|case study)\b/.test(text),
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
        hasBoundedDecisionAction &&
          !hasNoDecisionRequired &&
          !/\b(?:report decision|share decision|decision memo)\b/.test(text),
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
      hasRawSetupDebugIntent ||
      (hasSetupDebugActivityContext && hasImplementationMachineryCue);
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
        implementationTermsDetected.length > 0 && rawMechanicsPrimary,
        implementationTermsDetected.length > 0
          ? "Implementation terms were detected in the source."
          : "No implementation terms were detected.",
      ),
    ];
    const exclusions = [
      surfaceEvidence(
        "raw_mechanics_are_diagnostic_only",
        "If raw mechanics are diagnostic only, do not make them the primary setup surface.",
        /\b(?:stay diagnostic|diagnostic only|remain diagnostic|should not drive the product ui)\b/.test(text) &&
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
        "thread_is_product_surface",
        "The thread or message exchange is the product surface.",
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
        hasAffirmedAny(text, [
          /\b(?:approve|block|handoff|submit|complete|completion state|decide whether)\b/,
        ]),
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
  const positivePriority = [
    "setup_debug_tool",
    "operator_review",
    "workbench",
    "form_flow",
    "dashboard_monitor",
    "marketing",
    "content_report",
    "conversation",
  ];
  const neutralPriority = [
    "workbench",
    "operator_review",
    "form_flow",
    "dashboard_monitor",
    "content_report",
    "conversation",
    "marketing",
    "setup_debug_tool",
  ];

  return [...scores].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.score > 0) {
      const leftCoverage = left.triggers?.length
        ? left.trigger_match_count / left.triggers.length
        : 0;
      const rightCoverage = right.triggers?.length
        ? right.trigger_match_count / right.triggers.length
        : 0;

      if (rightCoverage !== leftCoverage) {
        return rightCoverage - leftCoverage;
      }

      if (right.exclusion_match_count !== left.exclusion_match_count) {
        return left.exclusion_match_count - right.exclusion_match_count;
      }
    }

    const priority = right.score > 0 ? positivePriority : neutralPriority;

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
        product_ui_rule: "Keep implementation details out of the public-facing message.",
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
        product_ui_rule: "Product UI uses domain terms; diagnostics stay secondary.",
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
        product_ui_rule: "System mechanics are diagnostic unless the activity is explicitly auditing them.",
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
        product_ui_rule: "Fields are named in user/domain language, not storage or schema language.",
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
        product_ui_rule: "Metrics and statuses use domain language; source mechanics remain diagnostic.",
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
        product_ui_rule: "Expose source/provenance only when it helps trust, citation, or audit.",
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
        product_ui_rule: "Implementation details may be primary when the task is explicitly setup, debugging, auditing, or integration.",
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
        product_ui_rule: "System instructions and tool traces stay hidden unless the conversation is explicitly diagnostic.",
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
  const hasExplicitActivityReview =
    isPlainObject(options.activity_review) || isPlainObject(options.activityReview);
  const inputContext = buildSurfaceTypeInputs(input.trim(), activityReview, contract, {
    hasExplicitActivityReview,
  });
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

function selectedSurfaceTypeFromImplementationReviewOptions(options = {}) {
  const surfaceReview = options.surface_review ?? options.surfaceReview;
  const frontendGenerationContext =
    options.frontend_generation_context ?? options.frontendGenerationContext;
  const candidates = [
    options.surface_type,
    options.surfaceType,
    surfaceReview?.recommended_surface_type,
    surfaceReview?.recommendedSurfaceType,
    surfaceReview?.surface_type,
    surfaceReview?.surfaceType,
    frontendGenerationContext?.surface_type,
    frontendGenerationContext?.surfaceType,
    frontendGenerationContext?.surface_guidance?.recommended_surface_type,
    frontendGenerationContext?.surfaceGuidance?.recommendedSurfaceType,
    frontendGenerationContext?.implementation_guidance?.surface_type,
    frontendGenerationContext?.implementationGuidance?.surfaceType,
    frontendGenerationContext?.surface_review?.recommended_surface_type,
    frontendGenerationContext?.surfaceReview?.recommendedSurfaceType,
  ];
  const selected = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );

  return selected ? normalizeOptionalSurfaceType(selected) : null;
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
    product_ui_can_show: contract.disclosure_policy.product_ui_can_show,
    product_ui_must_not_show: contract.disclosure_policy.product_ui_must_not_show,
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
      : "Clarify the activity before proposing a product surface.",
    primary_user_action: evidence.hasDecision
      ? "Make the next meaningful decision visible and easy to complete."
      : "Identify the decision or next action the surface should support.",
    activity_focus: safePrimaryText(
      observed.observed_activity,
      implementationTermsDetected,
      evidence.hasActivity
        ? "Support the named activity without exposing source mechanics."
        : "Clarify the activity before proposing a product surface.",
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
      "Keep source mechanics out of the product surface.",
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
      "Clarify the activity before proposing a product surface",
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
      "Adjust vocabulary before implementation detail reaches the product UI.",
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

function optionalRawString(value) {
  return typeof value === "string" ? value.trim() : "";
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
              "Adjust vocabulary before implementation detail reaches the product UI.",
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
    surface_set: candidate.surface_set,
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

function toSurfaceSetArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPlainObject);
}

function rawWorkflowTopology(value) {
  const topology = optionalString(value);

  return WORKFLOW_TOPOLOGY_IDS.includes(topology) ? topology : "";
}

function inferWorkflowTopology(candidate, surfaceGuidance, contract) {
  const explicitTopology = rawWorkflowTopology(candidate.workflow?.topology);

  if (explicitTopology) {
    return explicitTopology;
  }

  const surfaceSet = toSurfaceSetArray(candidate.surface_set);

  if (surfaceSet.length > 1) {
    return "multi_surface";
  }

  const surfaceType = optionalString(surfaceGuidance?.recommended_surface_type);

  if (surfaceType === "dashboard_monitor") {
    return "dashboard";
  }

  if (surfaceType === "content_report") {
    return "report";
  }

  if (surfaceType === "conversation") {
    return "conversation";
  }

  const policy = getWorkflowTopologyPolicy(contract);
  const preferredDefault = optionalString(policy.preferred_default);

  return WORKFLOW_TOPOLOGY_IDS.includes(preferredDefault)
    ? preferredDefault
    : "workspace";
}

function aggregateSurfaceSet(surfaceSet) {
  const sections = [];
  const controls = [];

  for (const surface of surfaceSet) {
    sections.push(...toStringArray(surface.sections));
    controls.push(...toStringArray(surface.controls));
  }

  return {
    sections: unique(sections),
    controls: unique(controls),
  };
}

function normalizeUiWorkflowSurfaceSet(candidate, implementationTermsDetected) {
  const providedSurfaceSet = toSurfaceSetArray(candidate.surface_set);

  return providedSurfaceSet.map((surface, index) => ({
    name: sanitizeUiWorkflowString(
      surface.name,
      implementationTermsDetected,
      `Surface ${index + 1}`,
    ),
    purpose: sanitizeUiWorkflowString(
      surface.purpose,
      implementationTermsDetected,
      "Support a coordinated part of the workflow.",
    ),
    sections: sanitizeUiWorkflowList(surface.sections, implementationTermsDetected),
    controls: sanitizeUiWorkflowList(surface.controls, implementationTermsDetected),
    relationship_to_workflow: sanitizeUiWorkflowString(
      surface.relationship_to_workflow,
      implementationTermsDetected,
      "Coordinates with the rest of the workflow.",
    ),
  }));
}

function collectStepperEligibilityText(activityReview, candidate, surfaceGuidance) {
  const activityCandidate = activityReview?.candidate ?? {};
  const workflow = candidate.workflow ?? {};

  return [
    activityReview?.source?.input_excerpt,
    activityCandidate.activity_model?.activity,
    activityCandidate.activity_model?.objective,
    ...(toStringArray(activityCandidate.activity_model?.participants)),
    ...(toStringArray(activityCandidate.activity_model?.outcomes)),
    ...(toStringArray(activityCandidate.activity_model?.domain_vocabulary)),
    activityCandidate.interaction_contract?.primary_decision,
    ...(toStringArray(activityCandidate.interaction_contract?.next_actions)),
    activityCandidate.interaction_contract?.completion,
    surfaceGuidance?.recommended_surface_type,
    workflow.surface_name,
    workflow.topology,
    ...(toStringArray(workflow.work_units)),
    ...(toSurfaceSetArray(candidate.surface_set).flatMap((surface) => [
      surface.name,
      surface.purpose,
      surface.relationship_to_workflow,
      ...(toStringArray(surface.sections)),
      ...(toStringArray(surface.controls)),
    ])),
  ].filter(Boolean).join(" ");
}

function buildStepperEligibility(activityReview, candidate, surfaceGuidance, contract) {
  const topology = rawWorkflowTopology(candidate.workflow?.topology);
  const surfaceType = optionalString(surfaceGuidance?.recommended_surface_type);
  const text = normalizeText(
    collectStepperEligibilityText(activityReview, candidate, surfaceGuidance),
  );
  const explicitStagedRequest =
    /\b(?:wizard|stepper|stepped|step by step|step-by-step|multi-step|multistep|staged flow|guided flow|guided setup|setup wizard|onboarding sequence)\b/.test(text);
  const stagedDependencyOrder =
    /\b(?:strict dependency|dependency order|ordered stages|must complete|complete .* before|before continuing|after completing|prerequisite|sequential|sequence|previous stage|next stage|first .* then)\b/.test(text);
  const formOrSetupSequence =
    ["form_flow", "setup_debug_tool"].includes(surfaceType) &&
    /\b(?:form|submit|submission|validation|required|invalid|confirmation|checkout|application|intake|onboarding|setup|configure|configuration|install|installation|test connection|verification)\b/.test(text);
  const blockedSurfaceType = [
    "workbench",
    "operator_review",
    "dashboard_monitor",
    "content_report",
    "conversation",
  ].includes(surfaceType);
  const allowed =
    explicitStagedRequest ||
    (formOrSetupSequence && stagedDependencyOrder) ||
    (formOrSetupSequence && !blockedSurfaceType);
  const requested = topology === "staged_flow";
  const blocked = requested && !allowed;
  const policy = getWorkflowTopologyPolicy(contract).stepper_eligibility ?? {};

  return {
    policy: optionalString(policy.policy) || "strong_intent",
    allowed,
    requested,
    blocked,
    surface_type: surfaceType,
    reason: allowed
      ? "Source evidence supports staged progression."
      : requested
        ? "Staged-flow topology needs explicit wizard intent, setup/form sequence, or strict dependency order."
        : "No staged-flow intent detected; use topology, work units, and coordinated surfaces instead.",
    evidence: {
      explicit_staged_request: explicitStagedRequest,
      staged_dependency_order: stagedDependencyOrder,
      form_or_setup_sequence: formOrSetupSequence,
      blocked_surface_type: blockedSurfaceType,
    },
  };
}

function assertUiWorkflowCandidateShape(candidate) {
  if (!isPlainObject(candidate)) {
    throw new JudgmentKitInputError("UI workflow candidate must be an object.");
  }

  if (!isPlainObject(candidate.workflow)) {
    throw new JudgmentKitInputError("UI workflow candidate requires workflow.");
  }

  if (Object.prototype.hasOwnProperty.call(candidate.workflow, "steps")) {
    throw new JudgmentKitInputError(
      "UI workflow candidate no longer accepts workflow.steps. Use workflow.work_units.",
    );
  }

  if (Object.prototype.hasOwnProperty.call(candidate, "primary_ui")) {
    throw new JudgmentKitInputError(
      "UI workflow candidate no longer accepts primary_ui. Use surface_set.",
    );
  }

  if (!rawWorkflowTopology(candidate.workflow.topology)) {
    throw new JudgmentKitInputError(
      "UI workflow candidate requires workflow.topology.",
    );
  }

  if (toStringArray(candidate.workflow.work_units).length === 0) {
    throw new JudgmentKitInputError(
      "UI workflow candidate requires workflow.work_units.",
    );
  }

  if (toSurfaceSetArray(candidate.surface_set).length === 0) {
    throw new JudgmentKitInputError("UI workflow candidate requires surface_set.");
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
  const handoff = candidate.handoff;
  const completionState = optionalString(workflow.completion_state);
  const handoffCompletion =
    optionalString(handoff.next_action).length > 0 &&
    optionalString(handoff.reason).length > 0;
  const workUnits = toStringArray(workflow.work_units);
  const surfaceSet = toSurfaceSetArray(candidate.surface_set);
  const hasSurfaceStructure =
    surfaceSet.some((surface) => toStringArray(surface.sections).length > 0);

  return {
    workflow_structure: workUnits.length === 0 && !hasSurfaceStructure,
    primary_actions: toStringArray(workflow.primary_actions).length === 0,
    decision_support: toStringArray(workflow.decision_points).length === 0,
    surface_sections: !hasSurfaceStructure,
    completion_or_handoff:
      completionState.length === 0 && !handoffCompletion,
  };
}

function buildUiWorkflowCandidateGuardrails(
  candidate,
  contract,
  activityReview,
  surfaceGuidance,
) {
  return {
    candidate_primary_terms_detected: buildUiWorkflowPrimaryTermsDetected(
      candidate,
      contract,
    ),
    candidate_primary_meta_terms_detected:
      buildCandidatePrimaryMetaTermsDetected(candidate),
    candidate_missing_fields: buildUiWorkflowCandidateMissingFields(candidate),
    stepper_eligibility: buildStepperEligibility(
      activityReview,
      candidate,
      surfaceGuidance,
      contract,
    ),
  };
}

function hasUiWorkflowMissingField(candidateMissingFields) {
  return Object.values(candidateMissingFields).some(Boolean);
}

function normalizeUiWorkflowCandidate(
  candidate,
  activityReview,
  candidatePrimaryTermsDetected,
  {
    contract,
    surfaceGuidance,
    stepperEligibility,
  } = {},
) {
  const workflow = candidate.workflow;
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
  const sanitizedUserTerms = sanitizeUiWorkflowList(
    defaultTerms,
    candidatePrimaryTermsDetected,
  );
  const surfaceSet = normalizeUiWorkflowSurfaceSet(
    candidate,
    candidatePrimaryTermsDetected,
  );
  const workUnits = sanitizeUiWorkflowList(
    workflow.work_units,
    candidatePrimaryTermsDetected,
  );
  const topology = inferWorkflowTopology(candidate, surfaceGuidance, contract);

  return {
    workflow: {
      surface_name: sanitizeUiWorkflowString(
        workflow.surface_name,
        candidatePrimaryTermsDetected,
        "Workflow review",
      ),
      topology,
      work_units: workUnits,
      stepper_eligibility: stepperEligibility,
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
    surface_set: surfaceSet,
    product_terms: sanitizedUserTerms,
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

  if (missing.workflow_structure) {
    questions.push(
      "What workflow topology, work units, or coordinated surfaces should the UI candidate support?",
    );
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

  if (missing.surface_sections) {
    questions.push("What surface sections or coordinated surfaces should the UI candidate show?");
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

  if (candidateGuardrails.stepper_eligibility?.blocked) {
    questions.push(
      "What source evidence makes this a staged wizard or stepper instead of a workspace, dashboard, report, conversation, or multi-surface workflow?",
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
    candidateGuardrails.stepper_eligibility?.blocked ||
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
  const surfaceGuidance = summarizeSurfaceReview(surfaceReview);
  const candidateGuardrails = buildUiWorkflowCandidateGuardrails(
    candidate,
    contract,
    activityReview,
    surfaceGuidance,
  );
  const candidateReady =
    !hasUiWorkflowMissingField(candidateGuardrails.candidate_missing_fields) &&
    !candidateGuardrails.stepper_eligibility?.blocked &&
    candidateGuardrails.candidate_primary_terms_detected.length === 0 &&
    candidateGuardrails.candidate_primary_meta_terms_detected.length === 0;
  const normalizedCandidate = normalizeUiWorkflowCandidate(
    candidate,
    activityReview,
    candidateGuardrails.candidate_primary_terms_detected,
    {
      contract,
      surfaceGuidance,
      stepperEligibility: candidateGuardrails.stepper_eligibility,
    },
  );
  const sourceMissingEvidence =
    activityReview.guardrails?.source_missing_evidence ??
    activityReview.guardrails?.missing_evidence ??
    {};
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
        workflow_structure:
          !candidateGuardrails.candidate_missing_fields.workflow_structure,
        workflow_topology: normalizedCandidate.workflow.topology,
        work_units: normalizedCandidate.workflow.work_units.length > 0,
        surface_set: normalizedCandidate.surface_set.length > 0,
        primary_actions: !candidateGuardrails.candidate_missing_fields.primary_actions,
        decision_support: !candidateGuardrails.candidate_missing_fields.decision_support,
        completion_or_handoff:
          !candidateGuardrails.candidate_missing_fields.completion_or_handoff,
        stepper_eligibility: candidateGuardrails.stepper_eligibility,
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
      stepper_eligibility: candidateGuardrails.stepper_eligibility,
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
      surface_name: "Short domain name for the workflow.",
      topology:
        "One of: workspace, multi_surface, staged_flow, dashboard, report, conversation.",
      work_units: [
        "Domain work units, checkpoints, or objects the UI must support without implying numbered order.",
      ],
      primary_actions: ["Actions the user can take to move the work forward."],
      decision_points: ["Decisions the workflow helps the user resolve."],
      completion_state: "What done means for this workflow.",
    },
    surface_set: [
      {
        name: "Domain name for a coordinated surface.",
        purpose: "What this surface helps the user do.",
        sections: ["Sections needed on this surface."],
        controls: ["Named controls or commands in user-facing language."],
        relationship_to_workflow:
          "How this surface coordinates with other workflow surfaces.",
      },
    ],
    handoff: {
      next_owner: "Who receives the next action.",
      reason: "Reason the decision or handoff is being made.",
      next_action: "Next action after the workflow decision.",
    },
    diagnostics: {
      implementation_terms: ["Implementation terms allowed only outside product UI."],
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
          "Ground topology, work units, coordinated surfaces, actions, decisions, handoff, and user-facing terms in the source brief and activity review.",
          "Do not use staged_flow or numbered wizard/stepper framing unless the source has strong staged-flow intent such as explicit wizard wording, ordered setup/onboarding, form validation sequence, or strict dependency order.",
          "Keep implementation terms and JudgmentKit review-packet terms out of workflow, surface_set, and handoff.",
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
        "surface_set",
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

const COGNITIVE_DIMENSION_DEFINITIONS = [
  {
    id: "closeness_of_mapping",
    label: "Closeness of mapping",
    requirement:
      "Primary terms and workflow structure should match the user's domain work instead of source mechanics.",
  },
  {
    id: "visibility_juxtaposability",
    label: "Visibility and juxtaposability",
    requirement:
      "Decision, work object, evidence, and action should be visible or persistently linked together.",
  },
  {
    id: "hidden_dependencies",
    label: "Hidden dependencies",
    requirement:
      "Decision-changing policy, freshness, consent, risk, or model evidence should not be hidden from the user.",
  },
  {
    id: "premature_commitment",
    label: "Premature commitment",
    requirement:
      "Risky or final actions should not be available before evidence, reason, review, confirmation, or receipt.",
  },
  {
    id: "progressive_evaluation",
    label: "Progressive evaluation",
    requirement:
      "Users should be able to inspect partial state, validation, preview, or follow-up before final action.",
  },
  {
    id: "viscosity",
    label: "Viscosity",
    requirement:
      "Likely corrections or repeated comparisons should not require disconnected repeated edits.",
  },
  {
    id: "hard_mental_operations",
    label: "Hard mental operations",
    requirement:
      "The UI should not force users to remember, transpose, or reconstruct key context across surfaces.",
  },
  {
    id: "role_expressiveness",
    label: "Role-expressiveness",
    requirement:
      "Sections, controls, and states should make their purpose in the work legible.",
  },
  {
    id: "disclosure_discipline",
    label: "Disclosure discipline",
    requirement:
      "Implementation machinery belongs in diagnostics unless setup, debugging, audit, or integration is the activity.",
  },
];

const COGNITIVE_DIMENSION_IDS = COGNITIVE_DIMENSION_DEFINITIONS.map(
  (dimension) => dimension.id,
);

function fieldText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(fieldText).filter(Boolean).join(" ");
  }

  if (isPlainObject(value)) {
    return Object.values(value).map(fieldText).filter(Boolean).join(" ");
  }

  return "";
}

function cognitiveCandidatePayload(candidate) {
  if (isPlainObject(candidate?.candidate)) {
    return candidate.candidate;
  }

  return candidate;
}

function cognitivePrimaryPayload(candidate) {
  const payload = cognitiveCandidatePayload(candidate);

  if (isPlainObject(payload?.workflow)) {
    return uiWorkflowPrimaryFields(payload);
  }

  if (isPlainObject(payload)) {
    return {
      visible_text: payload.visible_text,
      actions: payload.actions,
      primitives_used: payload.primitives_used,
      states_covered: payload.states_covered ?? payload.covered_states,
      surface_evidence: payload.surface_evidence,
      action_boundary_evidence: payload.action_boundary_evidence,
      data_visibility_evidence: payload.data_visibility_evidence,
      browser_qa: payload.browser_qa,
    };
  }

  return payload;
}

function workflowSurfaceSetFromCognitiveCandidate(candidate) {
  const payload = cognitiveCandidatePayload(candidate);
  return toSurfaceSetArray(payload?.surface_set);
}

function cognitiveActivityReview(input, candidate, options) {
  if (isPlainObject(options.activity_review)) {
    return options.activity_review;
  }

  if (isPlainObject(candidate?.activity_review)) {
    return candidate.activity_review;
  }

  return createActivityModelReview(input, options);
}

function cognitiveSurfaceType(candidate, options = {}) {
  return optionalString(
    options.surface_type ??
      options.surfaceType ??
      candidate?.surface_type ??
      candidate?.surface_guidance?.recommended_surface_type,
  );
}

function isSetupDiagnosticContext(text, surfaceType) {
  if (surfaceType === "setup_debug_tool") {
    return true;
  }

  return /\b(?:setup|debug|debugging|audit|auditing|integration|configure|configuration|troubleshoot|troubleshooting|diagnostic|inspect|test connection|webhook)\b/.test(
    normalizeText(text),
  );
}

function cognitiveTermPresent(text, terms) {
  const normalized = normalizeText(text);
  return toStringArray(terms).some((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm.length > 2 && normalized.includes(normalizedTerm);
  });
}

function cognitiveHasAny(text, patterns) {
  const normalized = normalizeText(text);
  return patterns.some((pattern) => pattern.test(normalized));
}

function cognitiveEvidenceTerms() {
  return [
    /\bevidence\b/,
    /\breason\b/,
    /\brisk\b/,
    /\bpolicy\b/,
    /\bcontext\b/,
    /\bsummary\b/,
    /\bchecklist\b/,
    /\bvalidation\b/,
    /\bmissing\b/,
    /\bcomplete(?:ness)?\b/,
    /\breceipt\b/,
    /\bimpact\b/,
    /\bconsent\b/,
    /\bfresh(?:ness)?\b/,
    /\bstatus\b/,
    /\bexception\b/,
  ];
}

function cognitiveDecisionSupportTerms() {
  return [
    /\bevidence\b/,
    /\breason\b/,
    /\brationale\b/,
    /\brisk\b/,
    /\bcontext\b/,
    /\bsummary\b/,
    /\bchecklist\b/,
    /\bvalidation\b/,
    /\bmissing\b/,
    /\bcomplete(?:ness)?\b/,
    /\breceipt\b/,
    /\bimpact\b/,
    /\bconsent\b/,
    /\bfresh(?:ness)?\b/,
    /\bstatus\b/,
    /\bexception\b/,
  ];
}

function cognitiveDecisionActionTerms() {
  return [
    /\bapprove\b/,
    /\bapply\b/,
    /\baccept\b/,
    /\bconfirm\b/,
    /\bsubmit\b/,
    /\bsave\b/,
    /\bcommit\b/,
    /\bcomplete\b/,
    /\bresolve\b/,
    /\bretry\b/,
    /\breturn\b/,
    /\bescalate\b/,
    /\bhandoff\b/,
    /\bsend\b/,
    /\broute\b/,
    /\bblock\b/,
  ];
}

function cognitiveCommitmentBoundaryTerms() {
  return [
    /\bevidence\b/,
    /\breason\b/,
    /\bconfirm\b/,
    /\breview\b/,
    /\breturn\b/,
    /\bcancel\b/,
    /\bundo\b/,
    /\breceipt\b/,
    /\bapproval boundary\b/,
    /\bmissing\b/,
    /\bpolicy\b/,
    /\bcheck\b/,
  ];
}

function cognitiveProgressTerms() {
  return [
    /\bpreview\b/,
    /\bvalidate\b/,
    /\bvalidation\b/,
    /\bstatus\b/,
    /\breview\b/,
    /\bcheck\b/,
    /\btest\b/,
    /\bsummary\b/,
    /\bfollow[- ]?up\b/,
    /\bnext action\b/,
    /\bexception\b/,
    /\bpartial\b/,
    /\bprogress\b/,
  ];
}

function cognitiveGenericControlTerms() {
  return [
    /\bbutton\b/,
    /\bcard\b/,
    /\bpanel\b/,
    /\btable\b/,
    /\bform\b/,
    /\bfield\b/,
    /\bwidget\b/,
    /\bcomponent\b/,
  ];
}

function cognitiveDiagnosticMachineryTerms(text) {
  const normalized = normalizeText(text);
  const terms = [];

  for (const [term, pattern] of Object.entries({
    API: /\bapi\b/,
    endpoint: /\bendpoint\b/,
    "request ID": /\brequest\s+id\b/,
    retry: /\bretry\b/,
    webhook: /\bwebhook\b/,
    trace: /\btrace\b/,
    schema: /\bschema\b/,
    server: /\bserver\b/,
    prompt: /\bprompt\b/,
    model: /\bmodel\b/,
    "tool call": /\btool\s+call\b/,
  })) {
    if (pattern.test(normalized)) {
      terms.push(term);
    }
  }

  return terms;
}

function cognitiveDependencyTerms(text) {
  const normalized = normalizeText(text);
  const dependencies = [];

  for (const [id, patterns] of Object.entries({
    policy: [/\bpolicy\b/, /\brule\b/],
    risk: [/\brisk\b/, /\bsafety\b/, /\bseverity\b/],
    freshness: [/\bfresh(?:ness)?\b/, /\bstale\b/, /\bexpired\b/],
    consent: [/\bconsent\b/, /\bauthorization\b/],
    model: [/\bmodel\b/, /\bscore\b/, /\bconfidence\b/],
    impact: [/\bimpact\b/, /\bcustomer visible\b/, /\bcustomer-visible\b/],
  })) {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      dependencies.push(id);
    }
  }

  return dependencies;
}

function createCognitiveFinding({
  dimension,
  severity = "fail",
  evidence,
  user_cost,
  repair_instruction,
  acceptance_check,
}) {
  return {
    dimension,
    check: dimension,
    severity,
    evidence,
    user_cost,
    repair_instruction,
    acceptance_check,
    message: `${COGNITIVE_DIMENSION_DEFINITIONS.find((entry) => entry.id === dimension)?.label ?? dimension}: ${repair_instruction}`,
  };
}

function summarizeCognitiveFindings(findings) {
  if (findings.length === 0) {
    return "Candidate preserves the reviewed Cognitive Dimensions constraints.";
  }

  return findings
    .slice(0, 3)
    .map((finding) => `${finding.dimension}: ${finding.repair_instruction}`)
    .join(" ");
}

function cognitiveChecksFromFindings(findings) {
  return COGNITIVE_DIMENSION_DEFINITIONS.map((dimension) => {
    const dimensionFindings = findings.filter(
      (finding) => finding.dimension === dimension.id,
    );
    const hasFail = dimensionFindings.some((finding) => finding.severity === "fail");
    const hasWarn = dimensionFindings.some((finding) => finding.severity === "warn");

    return {
      id: dimension.id,
      dimension: dimension.label,
      status: hasFail ? "fail" : hasWarn ? "warn" : "pass",
      requirement: dimension.requirement,
      findings: dimensionFindings,
    };
  });
}

function buildCognitiveDimensionsTargetedQuestions(findings, activityReview) {
  const questions = [...(activityReview.review?.targeted_questions ?? [])];

  if (findings.some((finding) => finding.dimension === "visibility_juxtaposability")) {
    questions.push(
      "What minimum evidence must stay visible beside the critical decision controls?",
    );
  }

  if (findings.some((finding) => finding.dimension === "hidden_dependencies")) {
    questions.push(
      "Which policy, risk, freshness, consent, or impact details can change the user's decision?",
    );
  }

  if (findings.some((finding) => finding.dimension === "progressive_evaluation")) {
    questions.push(
      "How should the user preview, validate, or follow up before final commitment?",
    );
  }

  return selectTargetedQuestionsFromCandidates(questions);
}

function buildCognitiveDimensionsReviewFindings({
  brief,
  candidate,
  activityReview,
  surfaceType,
  contract,
}) {
  const primaryPayload = cognitivePrimaryPayload(candidate);
  const primaryText = fieldText(primaryPayload);
  const normalizedBrief = normalizeText(brief);
  const normalizedPrimary = normalizeText(primaryText);
  const setupDiagnosticContext = isSetupDiagnosticContext(
    [brief, primaryText].join(" "),
    surfaceType,
  );
  const implementationTermsDetected = detectImplementationTerms(
    primaryText,
    contract,
  );
  const diagnosticMachineryTerms = cognitiveDiagnosticMachineryTerms(primaryText);
  const activityCandidate = activityReview.candidate ?? {};
  const activityModel = activityCandidate.activity_model ?? {};
  const interactionContract = activityCandidate.interaction_contract ?? {};
  const domainTerms = unique([
    ...toStringArray(activityModel.domain_vocabulary),
    ...toStringArray(activityModel.participants),
    optionalString(activityModel.activity),
    optionalString(interactionContract.primary_decision),
  ]).filter(Boolean);
  const findings = [];

  if (implementationTermsDetected.length > 0 && !setupDiagnosticContext) {
    findings.push(createCognitiveFinding({
      dimension: "closeness_of_mapping",
      evidence: `Primary candidate text includes implementation terms: ${implementationTermsDetected.map((entry) => entry.term).join(", ")}.`,
      user_cost:
        "The user must translate source machinery before understanding the work.",
      repair_instruction:
        "Replace implementation terms in primary UI fields with domain terms from the activity and move raw mechanics to diagnostics.",
      acceptance_check:
        "Primary workflow, surface, action, and handoff text use domain language while diagnostics hold source mechanics.",
    }));
  }

  if (
    domainTerms.length > 0 &&
    primaryText.length > 0 &&
    !cognitiveTermPresent(primaryText, domainTerms) &&
    !setupDiagnosticContext
  ) {
    findings.push(createCognitiveFinding({
      dimension: "closeness_of_mapping",
      severity: "warn",
      evidence: "Primary candidate text does not reuse clear domain vocabulary from the activity review.",
      user_cost:
        "The UI may read as generic structure rather than the user's specific work.",
      repair_instruction:
        "Name the domain work object, user, or decision in the workflow and surface text.",
      acceptance_check:
        "A reviewer can identify the domain activity without reading diagnostics.",
    }));
  }

  const hasDecisionAction = cognitiveHasAny(primaryText, cognitiveDecisionActionTerms());
  const hasEvidence = cognitiveHasAny(primaryText, cognitiveDecisionSupportTerms());
  if (hasDecisionAction && !hasEvidence) {
    findings.push(createCognitiveFinding({
      dimension: "visibility_juxtaposability",
      evidence: "Candidate provides decision or handoff actions without nearby evidence, reason, risk, policy, status, or receipt language.",
      user_cost:
        "The user must remember or hunt for the basis of the decision before acting.",
      repair_instruction:
        "Keep the critical evidence summary, rationale, or completeness state adjacent to the decision controls.",
      acceptance_check:
        "A reviewer can see the work object, evidence, decision choices, and handoff reason together.",
    }));
  }

  const dependencies = cognitiveDependencyTerms(brief);
  const hiddenDependencies = dependencies.filter((dependency) => {
    if (dependency === "model" && setupDiagnosticContext) return false;
    if (
      dependency === "policy" &&
      /\bpolicy\s+(?:evidence|risk|rule|criteria|constraint|exception|status|check)\b/.test(
        normalizedBrief,
      )
    ) {
      return !/\bpolicy\s+(?:evidence|risk|rule|criteria|constraint|exception|status|check)\b/.test(
        normalizedPrimary,
      );
    }
    return !normalizeText(primaryText).includes(dependency);
  });

  if (hiddenDependencies.length > 0) {
    findings.push(createCognitiveFinding({
      dimension: "hidden_dependencies",
      evidence: `Source brief names decision-changing dependencies not visible in primary candidate text: ${hiddenDependencies.join(", ")}.`,
      user_cost:
        "The user may make a decision without seeing a constraint that can change the outcome.",
      repair_instruction:
        "Surface decision-changing dependencies as domain rationale or status; keep only raw source mechanics diagnostic.",
      acceptance_check:
        "Policy, risk, freshness, consent, impact, or model-derived concerns that affect the decision are visible in domain language.",
    }));
  }

  if (
    hasDecisionAction &&
    cognitiveHasAny(primaryText, [
      /\bapprove\b/,
      /\bapply\b/,
      /\bsave\b/,
      /\bcommit\b/,
      /\bsubmit\b/,
      /\bconfirm\b/,
      /\bcomplete\b/,
      /\bresolve\b/,
      /\bretry\b/,
    ]) &&
    !cognitiveHasAny(primaryText, cognitiveCommitmentBoundaryTerms())
  ) {
    findings.push(createCognitiveFinding({
      dimension: "premature_commitment",
      evidence:
        "Candidate exposes final or risky action language without evidence, reason, review, confirmation, return, undo, or receipt language.",
      user_cost:
        "The user can commit before the interface supports the judgment behind the commitment.",
      repair_instruction:
        "Add evidence, reason, confirmation, return path, or receipt requirements near final actions.",
      acceptance_check:
        "Final actions are bounded by visible evidence and a clear after-action receipt or recovery path.",
    }));
  }

  const asksForProgressiveEvaluation =
    /\b(?:dashboard|metric|metrics|formula|calculation|spreadsheet|import|validation|form|setup|configure|preview|partial|draft)\b/.test(
      normalizedBrief,
    ) ||
    /\b(?:dashboard|metric|metrics|formula|calculation|spreadsheet|import|validation|form|setup|configure)\b/.test(
      normalizedPrimary,
    );
  const hasProgressiveEvaluation = cognitiveHasAny(primaryText, cognitiveProgressTerms());

  if (asksForProgressiveEvaluation && !hasProgressiveEvaluation) {
    findings.push(createCognitiveFinding({
      dimension: "progressive_evaluation",
      evidence:
        "Source or candidate implies monitoring, validation, setup, formula, import, or partial-work review without preview, validation, status, exception, or follow-up language.",
      user_cost:
        "The user cannot check intermediate state before committing or handing off.",
      repair_instruction:
        "Add preview, validation, status, exception meaning, or follow-up paths before final action.",
      acceptance_check:
        "The user can evaluate partial work or current status before deciding what happens next.",
    }));
  }

  const surfaceSet = workflowSurfaceSetFromCognitiveCandidate(candidate);
  const multiSurface = surfaceSet.length > 1 ||
    /\b(?:map|list|detail|queue|drawer|tab|tabs|surface|surfaces|screen|screens)\b/.test(normalizedBrief);
  const hasContextAnchor = /\b(?:selected|current|context|summary|persistent|linked|same case|same item)\b/.test(
    normalizedPrimary,
  );

  if (multiSurface && !hasContextAnchor) {
    findings.push(createCognitiveFinding({
      dimension: "hard_mental_operations",
      evidence:
        "Candidate or source implies movement across surfaces without selected-item, current-context, summary, or relationship anchors.",
      user_cost:
        "The user must remember which item, decision, or evidence set they were working on across surfaces.",
      repair_instruction:
        "Preserve selected item, evidence summary, and decision context across coordinated surfaces.",
      acceptance_check:
        "Moving between surfaces keeps the same work object and decision context visible or persistently linked.",
    }));
  }

  if (
    /\b(?:change|correct|edit|fix|owner fixes|return|missing evidence|validation error|rework)\b/.test(
      [normalizedBrief, normalizedPrimary].join(" "),
    ) &&
    !/\b(?:fix list|owner|return|batch|single place|summary|selected|inline|reason)\b/.test(
      normalizedPrimary,
    )
  ) {
    findings.push(createCognitiveFinding({
      dimension: "viscosity",
      severity: "warn",
      evidence:
        "Source implies likely corrections or rework, but candidate does not name a fix list, owner, return path, inline edit, or summary.",
      user_cost:
        "Small corrections may require repeated disconnected work or unclear handoff loops.",
      repair_instruction:
        "Add a correction path, owner, fix list, or return-for-evidence loop for likely changes.",
      acceptance_check:
        "Routine corrections can be made or routed from a single clear context.",
    }));
  }

  if (
    cognitiveHasAny(primaryText, cognitiveGenericControlTerms()) &&
    !cognitiveHasAny(primaryText, [
      /\bpurpose\b/,
      /\breason\b/,
      /\bdecision\b/,
      /\bevidence\b/,
      /\bhandoff\b/,
      /\breview\b/,
    ])
  ) {
    findings.push(createCognitiveFinding({
      dimension: "role_expressiveness",
      severity: "warn",
      evidence:
        "Candidate uses generic UI object language without enough activity purpose language.",
      user_cost:
        "A downstream agent may preserve chrome instead of making the work legible.",
      repair_instruction:
        "Rename sections and controls by the role they play in the user's work.",
      acceptance_check:
        "Sections and controls explain what they help the user decide, inspect, correct, or hand off.",
    }));
  }

  if (implementationTermsDetected.length > 0 && !setupDiagnosticContext) {
    findings.push(createCognitiveFinding({
      dimension: "disclosure_discipline",
      evidence: `Primary UI candidate text includes machinery outside a diagnostic activity: ${implementationTermsDetected.map((entry) => entry.term).join(", ")}.`,
      user_cost:
        "Implementation vocabulary can become the user's product vocabulary.",
      repair_instruction:
        "Move implementation terms to diagnostics and translate primary UI into domain language.",
      acceptance_check:
        "Primary user-facing fields do not expose prompts, schemas, tools, APIs, servers, traces, or model configuration.",
    }));
  }

  if (setupDiagnosticContext && (implementationTermsDetected.length > 0 || diagnosticMachineryTerms.length > 0)) {
    const diagnosticTerms = unique([
      ...implementationTermsDetected.map((entry) => entry.term),
      ...diagnosticMachineryTerms,
    ]);

    findings.push(createCognitiveFinding({
      dimension: "disclosure_discipline",
      severity: "warn",
      evidence: `Implementation or diagnostic terms appear in a setup, debugging, audit, or integration activity where machinery can be task material: ${diagnosticTerms.join(", ")}.`,
      user_cost:
        "The user still needs remediation or next-fix framing around raw diagnostics.",
      repair_instruction:
        "Keep raw mechanics tied to status, cause, remediation, and next fix rather than product copy.",
      acceptance_check:
        "Diagnostic terms are paired with test status, cause, remediation, or audit purpose.",
    }));
  }

  return findings;
}

function cognitiveHasRepairableSourceContext(input, candidate, activityReview) {
  const evidence = activityReview.review?.evidence ?? {};
  const payload = cognitiveCandidatePayload(candidate);
  const workflow = isPlainObject(payload?.workflow) ? payload.workflow : {};
  const primaryText = fieldText(cognitivePrimaryPayload(candidate));
  const sourceAndCandidateText = [input, primaryText].join(" ");
  const candidateMissingFields = activityReview.guardrails?.candidate_missing_fields ?? {};
  const workflowCandidateReviewable = Boolean(
    isPlainObject(workflow) &&
      toStringArray(workflow.work_units).length > 0 &&
      toStringArray(workflow.primary_actions).length > 0 &&
      toStringArray(workflow.decision_points).length > 0 &&
      (optionalString(workflow.completion_state) || isPlainObject(payload?.handoff)),
  );
  const candidateHasReviewableWorkflow =
    workflowCandidateReviewable ||
    (candidateMissingFields.activity === false &&
      candidateMissingFields.primary_decision === false &&
      candidateMissingFields.completion_or_outcome === false &&
      cognitiveHasAny(primaryText, cognitiveDecisionActionTerms()));
  const diagnosticContext = isSetupDiagnosticContext(sourceAndCandidateText, null);
  const hasDomainContext =
    evidence.domain_vocabulary ||
    (diagnosticContext &&
      cognitiveHasAny(primaryText, [
        /\bendpoint\b/,
        /\bstatus\b/,
        /\bapi\b/,
        /\brequest\b/,
        /\bevent\b/,
        /\berror\b/,
        /\bfix\b/,
        /\bretry\b/,
        /\bwebhook\b/,
        /\bsetup\b/,
      ]));

  return Boolean(
    candidateHasReviewableWorkflow ||
      (evidence.activity &&
        hasDomainContext &&
        evidence.decision &&
        (evidence.outcome ||
          cognitiveHasAny(sourceAndCandidateText, [
            /\boutcome\b/,
            /\bcomplete\b/,
            /\bcompletion\b/,
            /\bdone\b/,
            /\bhandoff\b/,
            /\breceipt\b/,
            /\bsubmitted\b/,
            /\bnext action\b/,
            /\bnext fix\b/,
            /\bstatus\b/,
            /\brecorded\b/,
            /\breturn\b/,
            /\bapprove\b/,
            /\bresolution\b/,
          ]))),
  );
}

export function reviewCognitiveDimensionsCandidate(input, candidate, options = {}) {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new JudgmentKitInputError(
      "reviewCognitiveDimensionsCandidate requires non-empty brief text.",
    );
  }

  if (
    (typeof candidate !== "string" || candidate.trim().length === 0) &&
    !isPlainObject(candidate)
  ) {
    throw new JudgmentKitInputError(
      "reviewCognitiveDimensionsCandidate requires candidate text or an object.",
    );
  }

  const contract = options.contract ?? loadActivityContract(options.contractPath);
  const activityReview = cognitiveActivityReview(input, candidate, {
    ...options,
    contract,
  });
  const surfaceType = cognitiveSurfaceType(candidate, options);
  const sourceReady =
    activityReview.review_status === "ready_for_review" ||
    cognitiveHasRepairableSourceContext(input, candidate, activityReview);
  const findings = buildCognitiveDimensionsReviewFindings({
    brief: input.trim(),
    candidate,
    activityReview,
    surfaceType,
    contract,
  });
  const failed = findings.some((finding) => finding.severity === "fail");
  const status = !sourceReady
    ? "needs_source_context"
    : failed
      ? "repair_required"
      : "ready_for_review";
  const checks = cognitiveChecksFromFindings(findings);
  const targetedQuestions = status === "ready_for_review"
    ? []
    : buildCognitiveDimensionsTargetedQuestions(findings, activityReview);
  const packet = {
    version: contract.version,
    contract_id: contract.id,
    cognitive_dimensions_review_status: status,
    status,
    source: {
      mode: options.proposer ? "model_assisted" : "deterministic",
      proposer: optionalString(options.proposer) || "external_candidate",
      input_excerpt: input.trim().slice(0, 280),
    },
    surface_type: surfaceType || null,
    activity_review: activityReview,
    cognitive_dimensions: COGNITIVE_DIMENSION_DEFINITIONS,
    reviewed_dimensions: COGNITIVE_DIMENSION_IDS,
    checks,
    findings,
    blockers: findings.filter((finding) => finding.severity === "fail"),
    targeted_questions: targetedQuestions,
    repair_instructions: findings.map((finding) => finding.repair_instruction),
    review: {
      confidence: status === "ready_for_review" ? "medium" : "low",
      summary: summarizeCognitiveFindings(findings),
      targeted_questions: targetedQuestions,
      findings,
    },
    next_agent_action:
      status === "ready_for_review"
        ? "continue_to_handoff_or_implementation"
        : status === "needs_source_context"
          ? "resolve_source_context"
          : "repair_and_resubmit",
  };

  assertNoStyleFields(packet);

  return packet;
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

  if (toSurfaceSetArray(workflowReview.candidate.surface_set).length === 0) {
    throw new JudgmentKitInputError(
      "createUiGenerationHandoff requires candidate.surface_set.",
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
    stepper_eligibility: workflowReview.guardrails?.stepper_eligibility ?? {},
    source_missing_evidence: workflowReview.guardrails?.source_missing_evidence ?? {},
    implementation_leakage_terms:
      workflowReview.guardrails?.candidate_primary_terms_detected ?? [],
    review_packet_leakage_terms:
      workflowReview.guardrails?.candidate_primary_meta_terms_detected ?? [],
    activity_review_status: workflowReview.guardrails?.activity_review_status,
  };
}

function buildCognitiveDimensionsHandoffBlockDetails(cognitiveDimensionsReview) {
  return {
    cognitive_dimensions_review_status:
      cognitiveDimensionsReview?.cognitive_dimensions_review_status,
    status: cognitiveDimensionsReview?.status,
    next_agent_action: cognitiveDimensionsReview?.next_agent_action,
    blockers: cognitiveDimensionsReview?.blockers ?? [],
    targeted_questions:
      cognitiveDimensionsReview?.targeted_questions ??
      cognitiveDimensionsReview?.review?.targeted_questions ??
      [],
  };
}

function buildTermsToKeepOutOfProductUi(workflowReview) {
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

const DEFAULT_VISUAL_ASSET_POLICY = {
  applies_when: [
    "the UI or design spec calls for substantive visuals, imagery, media, domain scenes, product/place/object visuals, or spatial/data visualization where visual quality is part of the expected result",
  ],
  preferred_paths: [
    "use imagegen for substantive bitmap imagery, scenes, product/place/object visuals, and media assets",
    "use premium Three.js or WebGL rendering when the visual is an interactive or spatial 3D experience",
    "use D3 or an equivalent high-quality visualization renderer when the visual is data-driven and clarity depends on the visualization",
  ],
  deterministic_safe_uses: [
    "layout and responsive structure",
    "text and exact typography",
    "UI chrome, icons, controls, and state indicators",
    "simple diagrams or charts where clarity is the goal",
    "accessible fallback structure and alt text",
  ],
  failure_signals: [
    "rudimentary CSS, SVG, canvas, or JavaScript geometry is used as a final substitute for substantive imagery",
    "decorative procedural blocks stand in for a real product, place, object, domain scene, or media asset",
    "image generation or premium rendering is skipped without rationale when the spec calls for substantive visuals",
  ],
};

const DEFAULT_ACCESSIBILITY_POLICY = {
  standards_profile: {
    baseline: "WCAG 2.2 AA",
    evidence_model_version: "judgmentkit-accessibility-evidence-v1",
    sources: [
      {
        id: "wcag-1.4.3",
        label: "Contrast (Minimum)",
        level: "AA",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html",
      },
      {
        id: "wcag-1.4.10",
        label: "Reflow",
        level: "AA",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/reflow.html",
      },
      {
        id: "wcag-1.4.11",
        label: "Non-text Contrast",
        level: "AA",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html",
      },
      {
        id: "wcag-2.1.1",
        label: "Keyboard",
        level: "A",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html",
      },
      {
        id: "wcag-2.1.2",
        label: "No Keyboard Trap",
        level: "A",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html",
      },
      {
        id: "wcag-2.4.3",
        label: "Focus Order",
        level: "A",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html",
      },
      {
        id: "wcag-2.4.7",
        label: "Focus Visible",
        level: "AA",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html",
      },
      {
        id: "wcag-2.4.11",
        label: "Focus Not Obscured (Minimum)",
        level: "AA",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html",
      },
      {
        id: "wcag-2.3.3",
        label: "Animation from Interactions",
        level: "AAA",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html",
      },
      {
        id: "wcag-2.5.8",
        label: "Target Size (Minimum)",
        level: "AA",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html",
      },
      {
        id: "wcag-3.3.1",
        label: "Error Identification",
        level: "A",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html",
      },
      {
        id: "wcag-3.3.2",
        label: "Labels or Instructions",
        level: "A",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html",
      },
      {
        id: "wcag-4.1.2",
        label: "Name, Role, Value",
        level: "A",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html",
      },
      {
        id: "wcag-4.1.3",
        label: "Status Messages",
        level: "AA",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html",
      },
      {
        id: "wai-aria-apg-keyboard",
        label: "WAI-ARIA APG Keyboard Interface",
        level: "practice",
        url: "https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/",
      },
    ],
  },
  contrast_targets: {
    normal_text_min_ratio: 4.5,
    large_text_min_ratio: 3,
    non_text_min_ratio: 3,
  },
  rendered_background_readability: {
    applies_to: [
      "images",
      "canvas",
      "WebGL or Three.js",
      "video",
      "gradients",
      "generated visuals",
    ],
    requirement:
      "Text over rendered visual backgrounds must provide browser-rendered contrast/readability evidence, not screenshots alone.",
  },
  required_evidence: [
    "accessibility_evidence.semantic_content",
    "accessibility_evidence.landmarks_headings",
    "accessibility_evidence.name_role_value",
    "accessibility_evidence.keyboard_navigation",
    "accessibility_evidence.focus_order",
    "accessibility_evidence.focus_visible",
    "accessibility_evidence.responsive_no_overflow",
    "accessibility_evidence.automated_checks",
  ],
  conditional_evidence: {
    visual_background_contrast: {
      applies_when: [
        "text appears over images, canvas, WebGL, video, gradients, generated visuals, or other rendered backgrounds",
      ],
      wcag_criteria: ["1.4.3", "1.4.11"],
    },
    non_text_contrast: {
      applies_when: [
        "icons, charts, state indicators, custom control boundaries, or graphical objects convey meaning",
      ],
      wcag_criteria: ["1.4.11"],
    },
    forced_colors: {
      applies_when: [
        "custom colors, gradients, overlays, or authored focus indicators are used",
      ],
      wcag_criteria: ["1.4.3", "1.4.11", "2.4.7"],
    },
    target_size: {
      applies_when: [
        "dense controls, icon-only controls, touch targets, toolbar actions, or pointer targets are present",
      ],
      wcag_criteria: ["2.5.8"],
    },
    focus_not_obscured: {
      applies_when: [
        "sticky layers, overlays, dialogs, modals, popovers, or persistent disclosed panels can cover focusable content",
      ],
      wcag_criteria: ["2.4.11"],
    },
    no_keyboard_trap: {
      applies_when: [
        "custom widgets, dialogs, modals, canvas/WebGL interactions, rich editors, or embedded experiences can receive focus",
      ],
      wcag_criteria: ["2.1.2"],
    },
    reduced_motion: {
      applies_when: [
        "animation, reveal transitions, parallax, WebGL motion, canvas motion, or generated visual motion is present",
      ],
      wcag_criteria: ["2.3.3"],
    },
    pause_stop_hide: {
      applies_when: [
        "moving, blinking, scrolling, auto-updating, or auto-advancing content starts without direct user control",
      ],
      wcag_criteria: ["2.2.2"],
    },
    content_on_hover_focus: {
      applies_when: [
        "tooltips, popovers, hover cards, or focus-triggered content appears",
      ],
      wcag_criteria: ["1.4.13"],
    },
    form_labels_instructions: {
      applies_when: [
        "forms, data-entry controls, required fields, or validation constraints are present",
      ],
      wcag_criteria: ["3.3.2", "4.1.2"],
    },
    form_errors: {
      applies_when: [
        "forms can reject input, show validation errors, or require correction",
      ],
      wcag_criteria: ["3.3.1", "3.3.3"],
    },
    status_messages: {
      applies_when: [
        "success, error, loading, progress, results, or async updates are shown without moving focus",
      ],
      wcag_criteria: ["4.1.3"],
    },
    media_alternatives: {
      applies_when: [
        "audio, video, generated media, animated media, or time-based media appears",
      ],
      wcag_criteria: ["1.1.1", "1.2.1", "1.2.2", "1.2.3"],
    },
    semantic_fallbacks: {
      applies_when: [
        "canvas, WebGL, Three.js, D3, generated imagery, charts, or custom-rendered visuals convey content or controls",
      ],
      wcag_criteria: ["1.1.1", "1.3.1", "4.1.2"],
    },
  },
  contracts: {
    readability_and_contrast: {
      requirements: [
        "normal text meets 4.5:1 and large text meets 3:1 contrast targets",
        "meaningful non-text visual information meets 3:1 contrast against adjacent colors",
        "text over rendered visual backgrounds uses browser-rendered or computed evidence",
        "custom colors and authored focus styles remain usable in forced-colors or high-contrast modes",
      ],
      evidence: [
        "accessibility_evidence.visual_background_contrast",
        "accessibility_evidence.non_text_contrast",
        "accessibility_evidence.forced_colors",
      ],
    },
    keyboard_and_focus: {
      requirements: [
        "all functionality has a keyboard path",
        "focus order preserves meaning and operation",
        "focus indicators remain visible and are not obscured by authored content",
        "custom widgets honor expected WAI-ARIA APG keyboard behavior",
        "focus can leave focused regions by standard keyboard methods or documented equivalents",
      ],
      evidence: [
        "accessibility_evidence.keyboard_navigation",
        "accessibility_evidence.focus_order",
        "accessibility_evidence.focus_visible",
        "accessibility_evidence.focus_not_obscured",
        "accessibility_evidence.no_keyboard_trap",
      ],
    },
    semantics_and_structure: {
      requirements: [
        "content structure uses semantic HTML or equivalent accessible structure",
        "landmarks and headings support orientation",
        "interactive controls expose accessible names, roles, states, and values",
        "non-text content has equivalent text alternatives or semantic fallbacks",
      ],
      evidence: [
        "accessibility_evidence.semantic_content",
        "accessibility_evidence.landmarks_headings",
        "accessibility_evidence.name_role_value",
        "accessibility_evidence.semantic_fallbacks",
      ],
    },
    forms_status_and_errors: {
      requirements: [
        "inputs provide visible labels or instructions",
        "detected input errors identify the field and describe the problem in text",
        "known correction suggestions are provided unless they would undermine security or purpose",
        "status messages are programmatically determinable without requiring focus",
      ],
      evidence: [
        "accessibility_evidence.form_labels_instructions",
        "accessibility_evidence.form_errors",
        "accessibility_evidence.status_messages",
      ],
    },
    motion_media_and_timing: {
      requirements: [
        "non-essential interaction-triggered animation can be disabled or follows reduced-motion preferences",
        "auto-starting motion, blinking, scrolling, or updating content can be paused, stopped, hidden, or controlled",
        "media includes captions, transcripts, audio descriptions, or equivalent alternatives when applicable",
      ],
      evidence: [
        "accessibility_evidence.reduced_motion",
        "accessibility_evidence.pause_stop_hide",
        "accessibility_evidence.media_alternatives",
      ],
    },
    responsive_and_input: {
      requirements: [
        "content reflows without two-dimensional scrolling at narrow widths unless two-dimensional layout is essential",
        "zoom and responsive states preserve information, operation, and readable text",
        "pointer targets meet minimum target size or valid spacing/equivalent-control exceptions",
        "drag and complex pointer gestures have keyboard or simple pointer alternatives unless path-dependent input is essential",
      ],
      evidence: [
        "accessibility_evidence.responsive_no_overflow",
        "accessibility_evidence.reflow_zoom",
        "accessibility_evidence.target_size",
      ],
    },
  },
  evidence_model: {
    entry_shape: [
      "status",
      "method",
      "tool",
      "viewports",
      "states",
      "artifacts",
      "failures",
      "notes",
    ],
    accepted_statuses: ["pass", "passed", "verified", "not_applicable", "fail", "failed"],
    not_applicable_requires_rationale: true,
    automated_only_insufficient: true,
    core_required: [
      "automated_checks",
      "semantic_content",
      "landmarks_headings",
      "name_role_value",
      "keyboard_navigation",
      "focus_order",
      "focus_visible",
      "responsive_no_overflow",
    ],
    conditional_required: [
      "visual_background_contrast",
      "non_text_contrast",
      "forced_colors",
      "target_size",
      "focus_not_obscured",
      "no_keyboard_trap",
      "reduced_motion",
      "pause_stop_hide",
      "content_on_hover_focus",
      "form_labels_instructions",
      "form_errors",
      "status_messages",
      "media_alternatives",
      "semantic_fallbacks",
    ],
  },
  failure_signals: [
    "text over images, canvas, WebGL, video, gradients, or generated visuals is illegible",
    "opacity-based reveal transitions pass through low-contrast states",
    "browser-rendered contrast/readability evidence is skipped for text over visual backgrounds",
    "automated accessibility scans are provided without browser-rendered or manual evidence for keyboard, focus, semantics, responsive behavior, or rendered backgrounds",
    "forms or status messages rely on visual-only error or success cues",
    "custom widgets expose roles without matching keyboard behavior, focus management, or state/value semantics",
  ],
};

const DEFAULT_COMPONENT_CONTRACTS = [
  {
    id: "action_button",
    label: "Action button",
    purpose: "Trigger one bounded user action.",
    use_when: ["the user can commit, cancel, navigate, disclose, or retry a clear action"],
    avoid_when: ["the action is a passive label, status, or unsupported shortcut"],
    anatomy: ["visible label", "optional icon", "state affordance"],
    required_states: ["ready", "disabled", "focus-visible", "loading"],
    token_bindings: ["text", "border", "focus", "decision", "risk"],
    accessibility_checks: ["accessible name", "keyboard activation", "focus visible", "target size"],
    review_checks: ["action comes from the workflow", "risky actions have approval-boundary evidence"],
    failure_signals: ["icon-only button has no accessible name", "destructive action appears without confirmation evidence"],
  },
  {
    id: "action_group",
    label: "Action group",
    purpose: "Group related actions with clear priority and boundaries.",
    use_when: ["several actions affect the same object or decision"],
    avoid_when: ["unrelated actions compete for primary emphasis"],
    anatomy: ["primary action", "secondary actions", "group label or context"],
    required_states: ["ready", "disabled", "focus-visible"],
    token_bindings: ["decision", "risk", "border", "spacing"],
    accessibility_checks: ["logical tab order", "visible grouping", "target size"],
    review_checks: ["primary action is singular", "secondary actions remain adjacent to their object"],
    failure_signals: ["multiple primary actions compete", "actions are detached from the evidence they affect"],
  },
  {
    id: "form_field",
    label: "Form field",
    purpose: "Collect one labeled value with help, error, and disabled affordances.",
    use_when: ["the user enters or changes structured information"],
    avoid_when: ["the value is read-only evidence or status"],
    anatomy: ["label", "control", "help text", "error text"],
    required_states: ["empty", "ready", "error", "disabled", "focus-visible"],
    token_bindings: ["text", "border", "focus", "status", "disabled"],
    accessibility_checks: ["programmatic label", "error association", "instructions available"],
    review_checks: ["label uses domain vocabulary", "disabled reason is readable"],
    failure_signals: ["placeholder is the only label", "error is color-only"],
  },
  {
    id: "text_field",
    label: "Text field",
    purpose: "Collect short text or numeric values.",
    use_when: ["the input is short, single-line, and directly editable"],
    avoid_when: ["long-form text, selection, or multi-value choice is required"],
    anatomy: ["label", "input", "help text", "error text"],
    required_states: ["empty", "ready", "error", "disabled", "focus-visible"],
    token_bindings: ["text", "border", "focus", "status"],
    accessibility_checks: ["programmatic label", "input purpose when known", "error association"],
    review_checks: ["input type matches the value", "validation is visible and textual"],
    failure_signals: ["raw input replaces approved primitive", "invalid state lacks text feedback"],
  },
  {
    id: "text_area",
    label: "Text area",
    purpose: "Collect longer written input.",
    use_when: ["the user writes notes, reasons, instructions, or descriptions"],
    avoid_when: ["a short value or fixed selection is enough"],
    anatomy: ["label", "multi-line control", "help text", "error text"],
    required_states: ["empty", "ready", "error", "disabled", "focus-visible"],
    token_bindings: ["text", "border", "focus", "spacing"],
    accessibility_checks: ["programmatic label", "resize or stable height", "error association"],
    review_checks: ["expected content is clear", "long content does not collapse nearby controls"],
    failure_signals: ["text area is used for structured choices", "long text overlaps following content"],
  },
  {
    id: "select_field",
    label: "Select field",
    purpose: "Choose one value from a bounded option set.",
    use_when: ["options are known and one option is selected"],
    avoid_when: ["free text or multiple independent choices are needed"],
    anatomy: ["label", "trigger or native select", "options", "help or error text"],
    required_states: ["empty", "ready", "error", "disabled", "focus-visible"],
    token_bindings: ["text", "border", "focus", "surface"],
    accessibility_checks: ["name role value", "keyboard operation", "error association"],
    review_checks: ["empty option is clear when optional", "selected value is visible"],
    failure_signals: ["custom select lacks keyboard evidence", "unassigned state is ambiguous"],
  },
  {
    id: "checkbox_group",
    label: "Checkbox group",
    purpose: "Choose independent options from a set.",
    use_when: ["multiple options can be selected independently"],
    avoid_when: ["the user must choose exactly one option"],
    anatomy: ["legend", "checkbox options", "help or error text"],
    required_states: ["ready", "error", "disabled", "focus-visible"],
    token_bindings: ["text", "border", "focus", "spacing"],
    accessibility_checks: ["fieldset and legend", "checked state", "keyboard operation"],
    review_checks: ["long labels wrap cleanly", "options remain independent"],
    failure_signals: ["checkboxes behave like radios", "group has no legend"],
  },
  {
    id: "radio_group",
    label: "Radio group",
    purpose: "Choose exactly one option from a set.",
    use_when: ["the options are mutually exclusive"],
    avoid_when: ["multiple choices can be selected"],
    anatomy: ["legend", "radio options", "help or error text"],
    required_states: ["empty", "ready", "error", "disabled", "focus-visible"],
    token_bindings: ["text", "border", "focus", "spacing"],
    accessibility_checks: ["fieldset and legend", "selected state", "arrow-key operation"],
    review_checks: ["option labels are comparable", "default selection is intentional"],
    failure_signals: ["mutually exclusive options are shown as checkboxes", "selected state is visual-only"],
  },
  {
    id: "toggle",
    label: "Toggle",
    purpose: "Switch a binary setting on or off.",
    use_when: ["the setting changes between two persistent states"],
    avoid_when: ["the action is one-time, destructive, or requires explanation before commit"],
    anatomy: ["visible label", "switch control", "current state text"],
    required_states: ["ready", "disabled", "focus-visible"],
    token_bindings: ["status", "focus", "disabled"],
    accessibility_checks: ["name role value", "keyboard operation", "state text"],
    review_checks: ["label names the setting", "state change is reversible or bounded"],
    failure_signals: ["toggle hides the current state", "toggle performs a destructive action"],
  },
  {
    id: "tabs",
    label: "Tabs",
    purpose: "Switch between peer sections without changing the task object.",
    use_when: ["sections are peers and the user compares or switches views"],
    avoid_when: ["the flow is ordered or requires completion before the next step"],
    anatomy: ["tab list", "tabs", "active tab", "tab panels"],
    required_states: ["ready", "disabled", "focus-visible"],
    token_bindings: ["surface", "border", "focus", "text"],
    accessibility_checks: ["tablist semantics", "keyboard operation", "active panel association"],
    review_checks: ["tabs are peers", "active state is visible"],
    failure_signals: ["tabs are used as a wizard", "inactive panels are unreachable by keyboard"],
  },
  {
    id: "menu",
    label: "Menu",
    purpose: "Reveal a compact set of contextual commands.",
    use_when: ["secondary commands need disclosure near their object"],
    avoid_when: ["primary decisions or required information are hidden"],
    anatomy: ["trigger", "menu", "menu items", "dismiss behavior"],
    required_states: ["ready", "disabled", "focus-visible"],
    token_bindings: ["surface", "border", "focus", "text"],
    accessibility_checks: ["trigger name", "keyboard operation", "dismissal", "focus return"],
    review_checks: ["commands are contextual", "primary path remains visible"],
    failure_signals: ["required action is hidden in a menu", "menu traps focus"],
  },
  {
    id: "dialog",
    label: "Dialog",
    purpose: "Interrupt the current surface for a bounded decision or focused form.",
    use_when: ["the user must confirm, complete, or inspect a focused task before returning"],
    avoid_when: ["content can stay inline or the decision is not blocking"],
    anatomy: ["title", "body", "dismiss action", "primary action"],
    required_states: ["ready", "loading", "error", "focus-visible"],
    token_bindings: ["surface", "border", "focus", "decision", "risk"],
    accessibility_checks: ["dialog semantics", "focus management", "escape or dismiss", "no keyboard trap"],
    review_checks: ["primary action is visually final", "cancel or dismiss precedes primary action"],
    failure_signals: ["dialog lacks dismiss path", "focus is not returned after close"],
  },
  {
    id: "alert",
    label: "Alert",
    purpose: "Call attention to important status, risk, or required action.",
    use_when: ["the user needs immediate status, warning, error, or success context"],
    avoid_when: ["the message is ordinary helper text"],
    anatomy: ["status indicator", "message", "optional action"],
    required_states: ["ready", "focus-visible"],
    token_bindings: ["status", "risk", "receipt", "text"],
    accessibility_checks: ["status or alert semantics", "non-color cue", "readable message"],
    review_checks: ["severity matches the action needed", "message explains next step"],
    failure_signals: ["color is the only severity cue", "alert repeats unrelated information"],
  },
  {
    id: "table",
    label: "Table",
    purpose: "Compare structured rows and columns.",
    use_when: ["the user scans, compares, sorts, or verifies tabular records"],
    avoid_when: ["cards or prose better support the activity"],
    anatomy: ["caption or heading", "headers", "rows", "cells", "empty state"],
    required_states: ["empty", "ready", "loading", "error", "focus-visible"],
    token_bindings: ["surface", "border", "text", "spacing"],
    accessibility_checks: ["header associations", "caption or label", "keyboard reachable controls"],
    review_checks: ["columns support decisions", "empty and loading states are clear"],
    failure_signals: ["fields are shown only because they exist", "wide table overflows without review"],
  },
  {
    id: "panel",
    label: "Panel",
    purpose: "Group related work, evidence, or controls in a bounded region.",
    use_when: ["a region needs a readable boundary and heading"],
    avoid_when: ["nested cards or decorative wrappers add noise"],
    anatomy: ["heading", "content region", "optional actions"],
    required_states: ["ready", "loading", "error"],
    token_bindings: ["surface", "border", "spacing", "text"],
    accessibility_checks: ["heading hierarchy", "region label when useful", "responsive no overflow"],
    review_checks: ["panel groups one coherent concern", "actions are adjacent to content"],
    failure_signals: ["card inside card nesting creates visual clutter", "panel title is generic"],
  },
  {
    id: "card",
    label: "Card",
    purpose: "Summarize one repeated item or choice.",
    use_when: ["items repeat and each needs a compact summary"],
    avoid_when: ["the layout becomes a decorative page section"],
    anatomy: ["item title", "summary", "metadata", "optional action"],
    required_states: ["ready", "disabled", "focus-visible"],
    token_bindings: ["surface", "border", "spacing", "text"],
    accessibility_checks: ["clear heading", "focus target when clickable", "non-text contrast"],
    review_checks: ["card represents one object", "interactive area is clear"],
    failure_signals: ["page sections are styled as cards", "clickable card lacks keyboard evidence"],
  },
  {
    id: "status_message",
    label: "Status message",
    purpose: "Report progress, result, validation, or completion.",
    use_when: ["the user needs to know what happened or what to do next"],
    avoid_when: ["status is decorative or duplicates nearby text"],
    anatomy: ["status text", "severity or result", "optional next action"],
    required_states: ["ready", "loading", "error"],
    token_bindings: ["status", "risk", "receipt", "text"],
    accessibility_checks: ["live-region behavior when async", "non-color cue", "plain-language message"],
    review_checks: ["message names the user-relevant result", "completion leaves a receipt"],
    failure_signals: ["spinner has no status text", "success state lacks receipt or next action"],
  },
];

const DEFAULT_PATTERN_CONTRACTS = [
  {
    id: "marketing",
    label: "Marketing surface",
    surface_type: "marketing",
    purpose: "Orient a visitor to an offer and move them to a clear next step.",
    required_regions: ["offer", "proof", "primary next step"],
    expected_controls: ["primary call to action", "secondary information path"],
    completion_or_handoff: "visitor understands the offer and can take the next step",
    disclosure_boundary: "implementation detail stays out of public persuasion copy",
    accessibility_expectations: ["readable media text", "semantic headings", "keyboard reachable calls to action"],
    failure_signals: ["decorative polish replaces proof", "primary offer is unclear"],
  },
  {
    id: "workbench",
    label: "Workbench",
    surface_type: "workbench",
    purpose: "Help a user repeatedly inspect, compare, decide, and act.",
    required_regions: ["work queue", "detail workspace", "evidence", "decision or handoff"],
    expected_controls: ["selection", "filter or sort", "decision action", "handoff action"],
    completion_or_handoff: "selected work item advances or leaves a clear handoff",
    disclosure_boundary: "diagnostics stay secondary unless the activity is inspection",
    accessibility_expectations: ["selection state", "focus order across regions", "responsive no overflow"],
    failure_signals: ["queue rows explain too much while detail lacks evidence", "decision controls are detached from evidence"],
  },
  {
    id: "operator_review",
    label: "Operator review",
    surface_type: "operator_review",
    purpose: "Review produced work, evidence, risk, and a bounded next action.",
    required_regions: ["produced work", "evidence", "risk", "decision", "receipt"],
    expected_controls: ["approve or accept", "return or request changes", "handoff action"],
    completion_or_handoff: "review produces a decision reason and receipt",
    disclosure_boundary: "raw system mechanics appear only as diagnostic evidence",
    accessibility_expectations: ["risk is not color-only", "decision controls have approval boundaries", "receipt is textual"],
    failure_signals: ["system output is trusted without evidence", "risky action has no approval boundary"],
  },
  {
    id: "form_flow",
    label: "Form flow",
    surface_type: "form_flow",
    purpose: "Collect or change structured information with validation.",
    required_regions: ["inputs", "validation", "review or submit", "confirmation"],
    expected_controls: ["field controls", "submit action", "cancel or back action"],
    completion_or_handoff: "valid information is saved or submitted with confirmation",
    disclosure_boundary: "field labels use domain language instead of schema names",
    accessibility_expectations: ["programmatic labels", "text errors", "status messages"],
    failure_signals: ["validation is color-only", "schema fields are exposed as product labels"],
  },
  {
    id: "dashboard_monitor",
    label: "Dashboard monitor",
    surface_type: "dashboard_monitor",
    purpose: "Track status, exceptions, trends, or operational health.",
    required_regions: ["status summary", "exceptions", "trend or comparison", "follow-up path"],
    expected_controls: ["filter", "time range", "drill in"],
    completion_or_handoff: "user knows current state and whether follow-up is needed",
    disclosure_boundary: "metrics explain operational meaning, not storage or API mechanics",
    accessibility_expectations: ["chart alternatives", "non-color status cues", "keyboard reachable filters"],
    failure_signals: ["metrics lack decision meaning", "charts carry meaning without text fallback"],
  },
  {
    id: "content_report",
    label: "Content or report",
    surface_type: "content_report",
    purpose: "Help the user read, understand, cite, or share information.",
    required_regions: ["summary", "sections", "evidence or references", "share or export"],
    expected_controls: ["table of contents", "copy or export", "reference navigation"],
    completion_or_handoff: "reader understands, cites, exports, or shares the material",
    disclosure_boundary: "source mechanics appear only when provenance is part of the report",
    accessibility_expectations: ["semantic headings", "link purpose", "readable long-form text"],
    failure_signals: ["report is broken into app chrome without reading hierarchy", "references are missing"],
  },
  {
    id: "setup_debug_tool",
    label: "Setup or debugging tool",
    surface_type: "setup_debug_tool",
    purpose: "Configure, inspect, test, or troubleshoot machinery.",
    required_regions: ["configuration", "test result", "diagnostic detail", "next fix"],
    expected_controls: ["run test", "copy diagnostic", "retry or repair"],
    completion_or_handoff: "setup is valid or failure has a cause and next fix",
    disclosure_boundary: "implementation detail is allowed because it is the work material",
    accessibility_expectations: ["log text is readable", "test status has text", "keyboard reachable diagnostics"],
    failure_signals: ["diagnostics appear without remediation", "raw logs replace user-facing result"],
  },
  {
    id: "conversation",
    label: "Conversation",
    surface_type: "conversation",
    purpose: "Support open-ended exchange where the thread is the product surface.",
    required_regions: ["message history", "composer", "context or attachments", "status"],
    expected_controls: ["send", "attach or reference", "recover or retry"],
    completion_or_handoff: "conversation continues, recovers, or closes with context intact",
    disclosure_boundary: "system traces stay hidden unless explicitly requested",
    accessibility_expectations: ["message order", "composer label", "status updates"],
    failure_signals: ["message state is visual-only", "composer lacks recovery after failure"],
  },
];

const DEFAULT_AI_NATIVE_DESIGN_SYSTEM = {
  id: "judgmentkit.ai-native-default.contract-v1",
  mode: "contract_defaults",
  purpose:
    "Govern agent-generated UI at the contract layer before any adapter-layer renderer choices.",
  primitive_defaults: [
    "use only approved implementation primitives or documented repo-local equivalents",
    "new primitives require contract evidence before use",
    "raw controls stay behind approved helper primitives",
  ],
  surface_patterns: [
    "activity-first structure before renderer choices",
    "workbench surfaces keep selection, evidence, decision, and completion state adjacent",
    "operator review surfaces keep produced work, evidence, risk, bounded decision, and receipt together",
    "form flows keep labels, validation, review, submit, and confirmation in task order",
    "setup and debug surfaces may expose implementation detail only when that is the activity",
  ],
  state_rules: [
    "cover required states from implementation_contract.state_coverage.required_states",
    "show disabled, error, loading, empty, ready, and focus-visible states with readable reasons",
    "state names must describe user-visible work state instead of internal lifecycle mechanics",
  ],
  component_contracts: DEFAULT_COMPONENT_CONTRACTS,
  pattern_contracts: DEFAULT_PATTERN_CONTRACTS,
  action_boundaries: {
    required: [
      "primary actions must come from the workflow, domain decision, or explicit handoff path",
      "committing, destructive, financial, publishing, or external side-effect actions require an explicit approval boundary",
      "diagnostic or setup actions stay secondary unless the activity is setup, debugging, auditing, or integration",
      "completion actions leave a receipt, result, or handoff reason",
    ],
    risky_action_terms: [
      "approve",
      "auto approve",
      "charge",
      "delete",
      "deploy",
      "execute",
      "issue refund",
      "pay",
      "publish",
      "refund",
      "release",
      "submit order",
    ],
    failure_signals: [
      "a risky action is exposed without explicit user approval or confirmation evidence",
      "an unauthorized action is listed in the generated UI candidate",
      "a diagnostic action is promoted as a primary work action outside setup, debugging, auditing, or integration",
      "completion can occur without a receipt, result, or handoff reason",
    ],
  },
  data_visibility: {
    primary_data_roles: [
      "work item identity",
      "domain evidence",
      "decision options",
      "validation and disabled reasons",
      "completion result or handoff receipt",
    ],
    diagnostic_only_terms: [
      "MCP server",
      "tool call",
      "prompt template",
      "JSON schema",
      "resource id",
      "trace",
      "model configuration",
    ],
    allowed_diagnostic_contexts: [
      "setup",
      "debugging",
      "auditing",
      "integration",
      "explicit source inspection",
    ],
    failure_signals: [
      "product UI text exposes diagnostic-only terms outside an allowed diagnostic context",
      "source identifiers, prompts, schemas, traces, or tool mechanics appear as user-facing work vocabulary",
      "data fields are listed because they exist rather than because they support the activity",
    ],
  },
  accessibility: {
    baseline: "WCAG 2.2 AA",
    evidence_source: "implementation_contract.accessibility_policy",
  },
  evidence_gates: [
    "activity gate before implementation",
    "workflow review before implementation",
    "approved primitive evidence",
    "state coverage evidence",
    "action boundary evidence when risky actions are present",
    "data visibility evidence when primary text or fields are supplied",
    "static enforcement evidence",
    "desktop and mobile browser QA evidence",
    "accessibility evidence",
  ],
  adapter_boundary: {
    visual_token_adapter:
      "boundary-only metadata lives at implementation_contract.visual_token_adapter; renderer use remains deferred",
    renderer_package:
      "deferred until a token adapter can drive rendered primitives without changing the activity contract",
  },
};

const DEFAULT_TOKEN_ROLES = [
  {
    role: "surface",
    families: ["color", "elevation"],
    usage: "backgrounds, panels, overlays, and work-surface regions",
  },
  {
    role: "text",
    families: ["color", "type"],
    usage: "body copy, headings, labels, and dense operational text",
  },
  {
    role: "border",
    families: ["color", "radius"],
    usage: "control boundaries, dividers, panels, and grouped evidence",
  },
  {
    role: "focus",
    families: ["color", "motion"],
    usage: "visible focus indicators and keyboard navigation affordances",
  },
  {
    role: "status",
    families: ["color", "semantic"],
    usage: "success, warning, error, loading, and empty states",
  },
  {
    role: "decision",
    families: ["color", "density"],
    usage: "primary decision controls and bounded action groups",
  },
  {
    role: "risk",
    families: ["color", "semantic"],
    usage: "risk, escalation, destructive, or externally committing actions",
  },
  {
    role: "disabled",
    families: ["color", "semantic"],
    usage: "disabled controls and unavailable state reasons",
  },
  {
    role: "receipt",
    families: ["color", "semantic"],
    usage: "completion, confirmation, and handoff receipt states",
  },
];

const DEFAULT_CSS_CUSTOM_PROPERTIES = [
  {
    name: "--jk-color-canvas",
    role: "surface",
    family: "color",
    value: "#f8f7f2",
    usage: "page canvas and application background",
  },
  {
    name: "--jk-color-surface",
    role: "surface",
    family: "color",
    value: "#ffffff",
    usage: "panels, cards, overlays, and work regions",
  },
  {
    name: "--jk-color-text",
    role: "text",
    family: "color",
    value: "#171717",
    usage: "primary readable text",
  },
  {
    name: "--jk-color-muted",
    role: "text",
    family: "color",
    value: "#61615c",
    usage: "secondary labels and supporting text",
  },
  {
    name: "--jk-color-border",
    role: "border",
    family: "color",
    value: "#d7d3c8",
    usage: "dividers, control outlines, and grouped evidence",
  },
  {
    name: "--jk-color-focus",
    role: "focus",
    family: "color",
    value: "#245f73",
    usage: "visible focus rings and active affordances",
  },
  {
    name: "--jk-color-success",
    role: "status",
    family: "color",
    value: "#2e6b48",
    usage: "approved, completed, and successful states",
  },
  {
    name: "--jk-color-warning",
    role: "status",
    family: "color",
    value: "#8a5a16",
    usage: "warning, waiting, and needs-attention states",
  },
  {
    name: "--jk-color-risk",
    role: "risk",
    family: "color",
    value: "#8f342f",
    usage: "risk, escalation, and destructive action states",
  },
  {
    name: "--jk-color-disabled",
    role: "disabled",
    family: "color",
    value: "#8a8f93",
    usage: "disabled controls with visible rationale",
  },
  {
    name: "--jk-color-receipt",
    role: "receipt",
    family: "color",
    value: "#23615f",
    usage: "handoff receipts and completion confirmation",
  },
  {
    name: "--jk-space-2",
    role: "surface",
    family: "spacing",
    value: "0.5rem",
    usage: "compact gaps inside dense controls",
  },
  {
    name: "--jk-space-3",
    role: "surface",
    family: "spacing",
    value: "0.75rem",
    usage: "row gaps and adjacent evidence spacing",
  },
  {
    name: "--jk-space-4",
    role: "surface",
    family: "spacing",
    value: "1rem",
    usage: "panel padding and section rhythm",
  },
  {
    name: "--jk-radius-control",
    role: "border",
    family: "radius",
    value: "4px",
    usage: "buttons, inputs, and compact controls",
  },
  {
    name: "--jk-radius-panel",
    role: "surface",
    family: "radius",
    value: "8px",
    usage: "cards, panels, and bounded work areas",
  },
  {
    name: "--jk-focus-ring",
    role: "focus",
    family: "semantic",
    value: "0 0 0 3px rgba(36, 95, 115, 0.28)",
    usage: "focus-visible outline around interactive controls",
  },
];

const DEFAULT_DARK_CSS_CUSTOM_PROPERTIES = [
  {
    name: "--jk-color-canvas",
    role: "surface",
    family: "color",
    value: "#101312",
    usage: "page canvas and application background",
  },
  {
    name: "--jk-color-surface",
    role: "surface",
    family: "color",
    value: "#181d1b",
    usage: "panels, cards, overlays, and work regions",
  },
  {
    name: "--jk-color-text",
    role: "text",
    family: "color",
    value: "#f2f4ef",
    usage: "primary readable text",
  },
  {
    name: "--jk-color-muted",
    role: "text",
    family: "color",
    value: "#b8c0bb",
    usage: "secondary labels and supporting text",
  },
  {
    name: "--jk-color-border",
    role: "border",
    family: "color",
    value: "#39423f",
    usage: "dividers, control outlines, and grouped evidence",
  },
  {
    name: "--jk-color-focus",
    role: "focus",
    family: "color",
    value: "#7db6c7",
    usage: "visible focus rings and active affordances",
  },
  {
    name: "--jk-color-success",
    role: "status",
    family: "color",
    value: "#82c99a",
    usage: "approved, completed, and successful states",
  },
  {
    name: "--jk-color-warning",
    role: "status",
    family: "color",
    value: "#e0b15d",
    usage: "warning, waiting, and needs-attention states",
  },
  {
    name: "--jk-color-risk",
    role: "risk",
    family: "color",
    value: "#e37d76",
    usage: "risk, escalation, and destructive action states",
  },
  {
    name: "--jk-color-disabled",
    role: "disabled",
    family: "color",
    value: "#7d8580",
    usage: "disabled controls with visible rationale",
  },
  {
    name: "--jk-color-receipt",
    role: "receipt",
    family: "color",
    value: "#80cbc7",
    usage: "handoff receipts and completion confirmation",
  },
  {
    name: "--jk-space-2",
    role: "surface",
    family: "spacing",
    value: "0.5rem",
    usage: "compact gaps inside dense controls",
  },
  {
    name: "--jk-space-3",
    role: "surface",
    family: "spacing",
    value: "0.75rem",
    usage: "row gaps and adjacent evidence spacing",
  },
  {
    name: "--jk-space-4",
    role: "surface",
    family: "spacing",
    value: "1rem",
    usage: "panel padding and section rhythm",
  },
  {
    name: "--jk-radius-control",
    role: "border",
    family: "radius",
    value: "4px",
    usage: "buttons, inputs, and compact controls",
  },
  {
    name: "--jk-radius-panel",
    role: "surface",
    family: "radius",
    value: "8px",
    usage: "cards, panels, and bounded work areas",
  },
  {
    name: "--jk-focus-ring",
    role: "focus",
    family: "semantic",
    value: "0 0 0 3px rgba(125, 182, 199, 0.38)",
    usage: "focus-visible outline around interactive controls",
  },
];

const DEFAULT_APPEARANCE_POLICY = {
  supported_modes: ["light", "dark", "system"],
  default_mode: "system",
  visible_toggle_default: false,
  mode_resolution:
    "system follows the user's operating-system or browser color-scheme preference",
  visible_toggle_policy:
    "Do not show an appearance toggle by default; add one only when the product activity requires a persistent user preference.",
  persistence_policy:
    "Do not store an appearance preference by default; system detection is the portable default.",
  css_strategy: {
    default_selector: ":root",
    dark_query: "@media (prefers-color-scheme: dark)",
    dark_selector: ":root",
  },
};

const DEFAULT_APPEARANCE_TOKEN_SETS = [
  {
    mode: "light",
    color_scheme: "light",
    css_custom_properties: DEFAULT_CSS_CUSTOM_PROPERTIES,
  },
  {
    mode: "dark",
    color_scheme: "dark",
    css_custom_properties: DEFAULT_DARK_CSS_CUSTOM_PROPERTIES,
  },
];

const DEFAULT_FONT_ROLES = [
  {
    role: "body",
    stack:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    usage: "primary product text and work-surface copy",
  },
  {
    role: "heading",
    stack:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    usage: "section titles and hierarchy labels",
  },
  {
    role: "label",
    stack:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    usage: "form labels, metadata labels, tabs, and compact control text",
  },
  {
    role: "numeric",
    stack:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    usage: "counts, prices, times, IDs, and values that need stable width",
    feature_settings: ["font-variant-numeric: tabular-nums"],
  },
  {
    role: "diagnostic",
    stack:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    usage:
      "diagnostic-only identifiers, logs, code, and implementation details in allowed contexts",
  },
];

const DEFAULT_ICON_ROLES = [
  "action",
  "status",
  "navigation",
  "disclosure",
  "decision",
  "risk",
  "receipt",
];

const ICON_CATALOG_TOOL_NAMES = [
  "list_icon_catalog",
  "search_icon_catalog",
  "get_icon_svg",
];

const DEFAULT_ICON_CATALOG = {
  source: "committed_generated_catalog",
  library: LUCIDE_ICON_SOURCE.library,
  package: LUCIDE_ICON_SOURCE.package,
  version: LUCIDE_ICON_SOURCE.version,
  icon_count: LUCIDE_ICON_SOURCE.icon_count,
  license: LUCIDE_ICON_SOURCE.license,
  notice: LUCIDE_ICON_SOURCE.notice,
  style_system: "Lucide 24px outline icons with round caps and joins",
  style_attributes: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    stroke_width: "2",
    stroke_linecap: "round",
    stroke_linejoin: "round",
  },
  mcp_tools: ICON_CATALOG_TOOL_NAMES,
  default_include_svg: false,
};

const DEFAULT_ICON_SELECTION_POLICY = {
  source_library: "lucide",
  selection_flow: [
    "Use search_icon_catalog to find candidate Lucide icons by activity meaning, source icon name, alias, or tag.",
    "Use get_icon_svg for the selected canonical Lucide icon id before rendering inline SVG.",
    "Use list_icon_catalog for pagination or category browsing; existing context tools intentionally return only this catalog summary.",
  ],
  semantic_guidance:
    "JudgmentKit may recommend roles such as status icon, handoff icon, or risk icon; agents choose concrete Lucide icon ids through the catalog tools.",
  accessibility_guidance: [
    "Icon use never satisfies accessibility evidence by itself.",
    "Icon-only controls require accessible names plus target-size and keyboard/focus evidence.",
    "Meaningful icons require adjacent visible text when possible and non-text contrast evidence.",
  ],
  failure_signals: [
    "selected icon ids are not canonical ids in the Lucide catalog",
    "icons are used as a substitute for required labels, states, activity evidence, workflow evidence, accessibility evidence, or QA gates",
    "icons are fetched from a runtime CDN or remote source instead of the committed MCP catalog",
  ],
};

const DEFAULT_VISUAL_TOKEN_ADAPTER = {
  id: "judgmentkit.visual-token-adapter.boundary-v1",
  mode: "boundary_only",
  purpose:
    "Define semantic token, font, and icon evidence after contract governance without selecting renderer components.",
  token_families: [
    "color",
    "type",
    "spacing",
    "radius",
    "density",
    "elevation",
    "motion",
    "semantic",
  ],
  token_roles: DEFAULT_TOKEN_ROLES,
  css_custom_properties: DEFAULT_CSS_CUSTOM_PROPERTIES,
  appearance_policy: DEFAULT_APPEARANCE_POLICY,
  appearance_token_sets: DEFAULT_APPEARANCE_TOKEN_SETS,
  semantic_roles: [
    "surface",
    "text",
    "border",
    "focus",
    "status",
    "decision",
    "risk",
    "disabled",
    "receipt",
  ],
  font_roles: DEFAULT_FONT_ROLES,
  font_rules: [
    "judgmentkit_design_system uses system font stacks and does not load remote font files",
    "diagnostic font roles may appear only in setup, debugging, auditing, integration, or explicit source-inspection contexts",
    "numeric font roles should preserve readable alignment with tabular numbers when supported",
  ],
  icon_roles: DEFAULT_ICON_ROLES,
  icon_catalog: DEFAULT_ICON_CATALOG,
  icon_selection_policy: DEFAULT_ICON_SELECTION_POLICY,
  icon_rules: [
    "default icons come from the committed Lucide catalog exposed through MCP icon tools",
    "normal implementation context includes catalog summary and policy only, not the full catalog payload",
    "icons that convey meaning require adjacent text or an accessible name",
    "icon-only controls require target-size and keyboard/focus evidence",
    "meaningful icons require non-text contrast evidence",
  ],
  adapter_rules: [
    "visual token, font, and icon evidence describes semantic roles and constraints; it does not create approved primitives",
    "visual token, font, and icon evidence cannot satisfy missing activity, primitive, state, action-boundary, data-visibility, accessibility, static-check, or browser-QA gates",
    "token, font, and icon names stay adapter metadata and must not become product UI vocabulary",
    "renderer and component packages remain deferred until the token adapter can drive rendered primitives without changing the activity contract",
  ],
  evidence_expectations: [
    "name visual token families used by the candidate",
    "map token semantics to approved primitives, states, and surface patterns",
    "name font roles and confirm system stacks or repo-approved font assets",
    "name icon roles and selected canonical Lucide icon ids or repo-approved icon assets",
    "include accessibility-relevant token evidence when color, motion, density, focus, or status roles affect readability or input",
  ],
  deferred_renderer: {
    renderer_package: "deferred",
    component_package: "deferred",
    catalog_compiler: "deferred",
  },
  failure_signals: [
    "visual token, font, or icon evidence is used as a substitute for approved primitives or required states",
    "visual token, font, or icon evidence claims to pass accessibility, action, data-visibility, static, or browser gates without the required evidence",
    "unsupported token families, font roles, or icon roles are introduced without adapter evidence",
    "renderer, component package, catalog, compiler, or A2UI work is introduced in the boundary-only slice",
  ],
};

const DESIGN_SYSTEM_REQUIRED_AUTHORITIES = [
  "tokens",
  "fonts",
  "icons",
  "components",
];

const DEFAULT_DESIGN_SYSTEM_SOURCE = {
  id: "judgmentkit.design-system.source-v1",
  mode: "judgmentkit_default",
  name: "JudgmentKit",
  package: "judgmentkit",
  definition_point: "implementation_contract",
  required_authorities: DESIGN_SYSTEM_REQUIRED_AUTHORITIES,
  fallback_policy: "fail_incomplete",
  provenance_required: true,
  source_exports: {
    overview: "/design-system/",
    manifest: "/design-system/manifest.json",
    visual_token_adapter: "/design-system/visual-token-adapter.json",
    component_contracts: "/design-system/component-contracts.json",
    pattern_contracts: "/design-system/pattern-contracts.json",
    accessibility_policy: "/design-system/accessibility-policy.json",
    icon_catalog: "/design-system/icons/",
    icon_tools: ICON_CATALOG_TOOL_NAMES,
  },
  token_prefixes: ["--jk-"],
  icon_catalog: DEFAULT_ICON_CATALOG,
  component_contract_source:
    "implementation_contract.default_ai_native_design_system.component_contracts",
  provenance_rules: [
    "visual tokens, fonts, icons, and renderer components must come from this active design-system source",
    "local CSS may define layout and UI structure but must not become the source of visual tokens, typography, icon assets, or renderer components",
    "external design systems must be supplied as complete contract-time adapters; missing authorities do not fall back to JudgmentKit defaults",
  ],
};

const DEFAULT_LOCAL_COMPONENT_AUTHORITY = {
  mode: "none",
  enforcement: "optional",
  families: [],
  selector_boundary: {
    allowed: [
      "layout-only selectors may arrange approved primitives and repo-local components",
      "component-specific selectors must not recreate visual identity",
    ],
    component_selector_examples: [
      ".card",
      ".panel",
      ".button",
      "[data-component]",
    ],
    layout_only_declarations: [
      "display",
      "grid",
      "flex",
      "gap",
      "margin",
      "width",
      "height",
      "position",
      "overflow",
      "align",
      "justify",
    ],
    blocked_visual_identity_declarations: [
      "color",
      "background",
      "border",
      "box-shadow",
      "font",
      "padding",
      "text-transform",
      "letter-spacing",
      "outline",
      "fill",
      "stroke",
    ],
  },
  token_boundary: {
    direct_token_prefixes: ["--jk-"],
    layout_token_exceptions: ["--jk-space-"],
    rule:
      "One-off component selectors must not consume JudgmentKit visual tokens directly; use repo-local components or the active design-system source.",
  },
  computed_style_evidence: {
    required_when:
      "mode is repo_local or enforcement is required and component-specific visual styling changes",
    expectations: [
      "name the local component family or selector being verified",
      "include computed style evidence for visual identity supplied by repo-local authority",
      "cover affected states and desktop/mobile viewports when selectors alter component presentation",
    ],
  },
};

const DEFAULT_ITERATION_POLICY = {
  owner: "agent",
  default_max_attempts: 3,
  loop: ["generate", "review", "repair", "resubmit"],
  pass_status: "accept",
  failure_statuses: ["repair_and_resubmit", "stop_for_human"],
  judgmentkit_role:
    "review generated UI evidence and return structured failures; do not mutate files or call a provider model",
};

function normalizeVisualAssetPolicy(sourcePolicy, fallbackPolicy) {
  const source = isPlainObject(sourcePolicy) ? sourcePolicy : {};
  const fallback = isPlainObject(fallbackPolicy)
    ? fallbackPolicy
    : DEFAULT_VISUAL_ASSET_POLICY;

  return {
    applies_when: normalizePrimitiveList(
      source.applies_when ?? source.appliesWhen,
      fallback.applies_when ?? DEFAULT_VISUAL_ASSET_POLICY.applies_when,
    ),
    preferred_paths: normalizePrimitiveList(
      source.preferred_paths ?? source.preferredPaths,
      fallback.preferred_paths ?? DEFAULT_VISUAL_ASSET_POLICY.preferred_paths,
    ),
    deterministic_safe_uses: normalizePrimitiveList(
      source.deterministic_safe_uses ?? source.deterministicSafeUses,
      fallback.deterministic_safe_uses ??
        DEFAULT_VISUAL_ASSET_POLICY.deterministic_safe_uses,
    ),
    failure_signals: normalizePrimitiveList(
      source.failure_signals ?? source.failureSignals,
      fallback.failure_signals ?? DEFAULT_VISUAL_ASSET_POLICY.failure_signals,
    ),
  };
}

function numberOrFallback(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clonePolicyValue(value) {
  if (Array.isArray(value)) {
    return value.map(clonePolicyValue);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, clonePolicyValue(child)]),
    );
  }

  return value;
}

function mergePolicyObject(sourceValue, fallbackValue) {
  if (Array.isArray(fallbackValue)) {
    return normalizePrimitiveList(sourceValue, fallbackValue);
  }

  if (typeof fallbackValue === "number") {
    return numberOrFallback(sourceValue, fallbackValue);
  }

  if (typeof fallbackValue === "boolean") {
    return typeof sourceValue === "boolean" ? sourceValue : fallbackValue;
  }

  if (typeof fallbackValue === "string") {
    return optionalRawString(sourceValue) || fallbackValue;
  }

  if (isPlainObject(fallbackValue)) {
    const source = isPlainObject(sourceValue) ? sourceValue : {};
    const result = {};

    for (const key of unique([
      ...Object.keys(fallbackValue),
      ...Object.keys(source),
    ])) {
      result[key] =
        key in fallbackValue
          ? mergePolicyObject(source[key], fallbackValue[key])
          : clonePolicyValue(source[key]);
    }

    return result;
  }

  return sourceValue === undefined ? fallbackValue : sourceValue;
}

function normalizeContractEntryList(sourceValue, fallbackValue, fieldSpecs) {
  const fallbackEntries = Array.isArray(fallbackValue)
    ? fallbackValue.filter(isPlainObject).map(clonePolicyValue)
    : [];
  const sourceEntries = Array.isArray(sourceValue)
    ? sourceValue.filter(isPlainObject)
    : isPlainObject(sourceValue)
      ? Object.entries(sourceValue).map(([id, entry]) =>
          isPlainObject(entry) ? { id, ...entry } : { id },
        )
      : [];
  const entries = sourceEntries.length > 0 ? sourceEntries : fallbackEntries;
  const fallbackById = new Map(
    fallbackEntries.map((entry) => [normalizeText(entry.id), entry]),
  );
  const seen = new Set();

  return entries
    .map((entry) => {
      const id = optionalString(entry.id);
      const fallbackEntry = fallbackById.get(normalizeText(id)) ?? {};
      const normalized = { ...fallbackEntry, ...entry, id };

      for (const field of fieldSpecs.stringFields ?? []) {
        normalized[field] =
          optionalString(
            normalized[field] ??
              normalized[field.replace(/_([a-z])/g, (_, letter) =>
                letter.toUpperCase(),
              )],
          ) || optionalString(fallbackEntry[field]);
      }

      for (const field of fieldSpecs.arrayFields ?? []) {
        normalized[field] = normalizePrimitiveList(
          normalized[field] ??
            normalized[field.replace(/_([a-z])/g, (_, letter) =>
              letter.toUpperCase(),
            )],
          fallbackEntry[field],
        );
      }

      return normalized;
    })
    .filter((entry) => {
      const id = normalizeText(entry.id);

      if (!id || seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    });
}

function normalizeComponentContracts(sourceValue, fallbackValue = DEFAULT_COMPONENT_CONTRACTS) {
  return normalizeContractEntryList(sourceValue, fallbackValue, {
    stringFields: ["label", "purpose"],
    arrayFields: [
      "use_when",
      "avoid_when",
      "anatomy",
      "required_states",
      "token_bindings",
      "accessibility_checks",
      "review_checks",
      "failure_signals",
    ],
  });
}

function normalizePatternContracts(sourceValue, fallbackValue = DEFAULT_PATTERN_CONTRACTS) {
  return normalizeContractEntryList(sourceValue, fallbackValue, {
    stringFields: [
      "label",
      "surface_type",
      "purpose",
      "completion_or_handoff",
      "disclosure_boundary",
    ],
    arrayFields: [
      "required_regions",
      "expected_controls",
      "accessibility_expectations",
      "failure_signals",
    ],
  });
}

function normalizeDefaultAiNativeDesignSystem(sourcePolicy, fallbackPolicy) {
  const fallback = isPlainObject(fallbackPolicy)
    ? fallbackPolicy
    : DEFAULT_AI_NATIVE_DESIGN_SYSTEM;
  const source = isPlainObject(sourcePolicy) ? sourcePolicy : {};
  const sourceForMerge = { ...source };
  const fallbackForMerge = { ...fallback };
  delete sourceForMerge.component_contracts;
  delete sourceForMerge.componentContracts;
  delete sourceForMerge.pattern_contracts;
  delete sourceForMerge.patternContracts;
  delete sourceForMerge.local_component_authority;
  delete sourceForMerge.localComponentAuthority;
  delete fallbackForMerge.component_contracts;
  delete fallbackForMerge.pattern_contracts;
  delete fallbackForMerge.local_component_authority;
  const merged = mergePolicyObject(
    sourceForMerge,
    fallbackForMerge,
  );

  return {
    ...merged,
    component_contracts: normalizeComponentContracts(
      source.component_contracts ?? source.componentContracts,
      fallback.component_contracts ?? DEFAULT_COMPONENT_CONTRACTS,
    ),
    pattern_contracts: normalizePatternContracts(
      source.pattern_contracts ?? source.patternContracts,
      fallback.pattern_contracts ?? DEFAULT_PATTERN_CONTRACTS,
    ),
  };
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function roleEntriesFromValue(value, valueKey = "value") {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => roleEntriesFromValue(entry, valueKey));
  }

  if (typeof value === "string") {
    return [{ role: cleanClause(value) }];
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const directRole = optionalString(value.role ?? value.id ?? value.name);

  if (directRole) {
    return [{ ...value, role: directRole }];
  }

  return Object.entries(value).map(([role, child]) => {
    const normalizedRole = cleanClause(role);

    if (isPlainObject(child)) {
      return {
        ...child,
        role: optionalString(child.role ?? child.id ?? child.name) || normalizedRole,
      };
    }

    return {
      role: normalizedRole,
      [valueKey]: typeof child === "string" ? cleanClause(child) : child,
    };
  });
}

function normalizeRoleEntries(sourceValue, fallbackValue, options = {}) {
  const fallbackEntries = roleEntriesFromValue(fallbackValue, options.valueKey)
    .filter((entry) => optionalString(entry.role))
    .map(clonePolicyValue);
  const sourceEntries = roleEntriesFromValue(sourceValue, options.valueKey).filter(
    (entry) => optionalString(entry.role),
  );
  const entries = sourceEntries.length > 0 ? sourceEntries : fallbackEntries;
  const fallbackByRole = new Map(
    fallbackEntries.map((entry) => [normalizeText(entry.role), entry]),
  );
  const seen = new Set();

  return entries
    .map((entry) => {
      const role = optionalString(entry.role);
      const fallbackEntry = fallbackByRole.get(normalizeText(role)) ?? {};
      const merged = { ...fallbackEntry, ...entry, role };

      for (const key of options.arrayKeys ?? []) {
        merged[key] = normalizePrimitiveList(
          merged[key] ?? merged[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())],
          fallbackEntry[key],
        );
      }

      for (const key of options.stringKeys ?? []) {
        merged[key] = optionalString(merged[key]) || optionalString(fallbackEntry[key]);
      }

      return merged;
    })
    .filter((entry) => {
      const role = normalizeText(entry.role);

      if (!role || seen.has(role)) {
        return false;
      }

      seen.add(role);
      return true;
    });
}

function normalizeIconCatalog(sourceValue, fallbackValue) {
  const fallback = isPlainObject(fallbackValue)
    ? fallbackValue
    : DEFAULT_ICON_CATALOG;
  const source = isPlainObject(sourceValue) ? sourceValue : {};
  const policy = mergePolicyObject(source, fallback);
  const hasSource = Object.keys(source).length > 0;

  return {
    ...policy,
    source:
      optionalString(source.source ?? policy.source) ||
      (hasSource ? "external_design_system" : fallback.source),
    library: optionalString(policy.library) || fallback.library,
    package: optionalString(policy.package) || fallback.package,
    version: optionalString(policy.version) || fallback.version,
    icon_count: numberOrFallback(policy.icon_count ?? policy.iconCount, fallback.icon_count),
    license: optionalString(policy.license) || fallback.license,
    notice: optionalString(policy.notice) || fallback.notice,
    style_system:
      optionalString(policy.style_system ?? policy.styleSystem) ||
      fallback.style_system,
    style_attributes: mergePolicyObject(
      policy.style_attributes ?? policy.styleAttributes,
      fallback.style_attributes,
    ),
    mcp_tools: normalizePrimitiveList(
      policy.mcp_tools ?? policy.mcpTools ?? policy.tools,
      fallback.mcp_tools,
    ),
    default_include_svg:
      typeof (policy.default_include_svg ?? policy.defaultIncludeSvg) === "boolean"
        ? policy.default_include_svg ?? policy.defaultIncludeSvg
        : fallback.default_include_svg,
  };
}

function normalizeIconSelectionPolicy(sourceValue, fallbackValue) {
  const fallback = isPlainObject(fallbackValue)
    ? fallbackValue
    : DEFAULT_ICON_SELECTION_POLICY;
  const source = isPlainObject(sourceValue) ? sourceValue : {};
  const policy = mergePolicyObject(source, fallback);

  return {
    ...policy,
    source_library:
      optionalString(policy.source_library ?? policy.sourceLibrary) ||
      fallback.source_library,
    selection_flow: normalizePrimitiveList(
      policy.selection_flow ?? policy.selectionFlow,
      fallback.selection_flow,
    ),
    semantic_guidance:
      optionalString(policy.semantic_guidance ?? policy.semanticGuidance) ||
      fallback.semantic_guidance,
    accessibility_guidance: normalizePrimitiveList(
      policy.accessibility_guidance ?? policy.accessibilityGuidance,
      fallback.accessibility_guidance,
    ),
    failure_signals: normalizePrimitiveList(
      policy.failure_signals ?? policy.failureSignals,
      fallback.failure_signals,
    ),
  };
}

function normalizeCssCustomProperties(sourceValue, fallbackValue) {
  const fallback = Array.isArray(fallbackValue)
    ? fallbackValue
    : DEFAULT_CSS_CUSTOM_PROPERTIES;
  const rawEntries = Array.isArray(sourceValue) ? sourceValue : fallback;
  const fallbackByName = new Map(
    fallback
      .map((entry) => [normalizeText(entry.name), entry])
      .filter(([name]) => Boolean(name)),
  );
  const seen = new Set();

  return rawEntries
    .map((entry) => {
      if (!isPlainObject(entry)) {
        return null;
      }

      const name = optionalString(entry.name ?? entry.property ?? entry.token);
      const fallbackEntry = fallbackByName.get(normalizeText(name)) ?? {};
      const normalized = {
        name: name || optionalString(fallbackEntry.name),
        role: optionalString(entry.role) || optionalString(fallbackEntry.role),
        family: optionalString(entry.family) || optionalString(fallbackEntry.family),
        value: optionalString(entry.value) || optionalString(fallbackEntry.value),
        usage: optionalString(entry.usage) || optionalString(fallbackEntry.usage),
      };
      const normalizedName = normalizeText(normalized.name);

      if (!normalizedName || !normalized.value || seen.has(normalizedName)) {
        return null;
      }

      seen.add(normalizedName);
      return normalized;
    })
    .filter(Boolean);
}

function normalizeAppearancePolicy(sourceValue, fallbackValue) {
  const fallback = isPlainObject(fallbackValue)
    ? fallbackValue
    : DEFAULT_APPEARANCE_POLICY;
  const source = isPlainObject(sourceValue) ? sourceValue : {};
  const policy = mergePolicyObject(source, fallback);
  const sourceCssStrategy = isPlainObject(source.css_strategy ?? source.cssStrategy)
    ? source.css_strategy ?? source.cssStrategy
    : {};
  const fallbackCssStrategy = isPlainObject(fallback.css_strategy)
    ? fallback.css_strategy
    : DEFAULT_APPEARANCE_POLICY.css_strategy;

  return {
    ...policy,
    supported_modes: normalizePrimitiveList(
      policy.supported_modes ?? policy.supportedModes,
      fallback.supported_modes,
    ),
    default_mode:
      optionalString(policy.default_mode ?? policy.defaultMode) ||
      fallback.default_mode,
    visible_toggle_default:
      typeof (policy.visible_toggle_default ?? policy.visibleToggleDefault) === "boolean"
        ? policy.visible_toggle_default ?? policy.visibleToggleDefault
        : fallback.visible_toggle_default,
    mode_resolution:
      optionalString(policy.mode_resolution ?? policy.modeResolution) ||
      fallback.mode_resolution,
    visible_toggle_policy:
      optionalString(policy.visible_toggle_policy ?? policy.visibleTogglePolicy) ||
      fallback.visible_toggle_policy,
    persistence_policy:
      optionalString(policy.persistence_policy ?? policy.persistencePolicy) ||
      fallback.persistence_policy,
    css_strategy: {
      default_selector:
        optionalRawString(
          sourceCssStrategy.default_selector ?? sourceCssStrategy.defaultSelector,
        ) || fallbackCssStrategy.default_selector,
      dark_query:
        optionalRawString(sourceCssStrategy.dark_query ?? sourceCssStrategy.darkQuery) ||
        fallbackCssStrategy.dark_query,
      dark_selector:
        optionalRawString(
          sourceCssStrategy.dark_selector ?? sourceCssStrategy.darkSelector,
        ) || fallbackCssStrategy.dark_selector,
    },
  };
}

function normalizeAppearanceTokenSets(sourceValue, fallbackValue) {
  const fallback = Array.isArray(fallbackValue)
    ? fallbackValue
    : DEFAULT_APPEARANCE_TOKEN_SETS;
  const rawSets = Array.isArray(sourceValue) ? sourceValue : fallback;
  const fallbackByMode = new Map(
    fallback
      .map((entry) => [normalizeText(entry.mode), entry])
      .filter(([mode]) => Boolean(mode)),
  );
  const seen = new Set();

  return rawSets
    .map((entry) => {
      if (!isPlainObject(entry)) {
        return null;
      }

      const mode = optionalString(entry.mode);
      const fallbackEntry = fallbackByMode.get(normalizeText(mode)) ?? {};
      const normalizedMode = mode || optionalString(fallbackEntry.mode);
      const normalizedModeKey = normalizeText(normalizedMode);

      if (!normalizedModeKey || seen.has(normalizedModeKey)) {
        return null;
      }

      seen.add(normalizedModeKey);
      return {
        mode: normalizedMode,
        color_scheme:
          optionalString(entry.color_scheme ?? entry.colorScheme) ||
          optionalString(fallbackEntry.color_scheme) ||
          normalizedMode,
        css_custom_properties: normalizeCssCustomProperties(
          firstDefined(entry.css_custom_properties, entry.cssCustomProperties),
          fallbackEntry.css_custom_properties ?? DEFAULT_CSS_CUSTOM_PROPERTIES,
        ),
      };
    })
    .filter(Boolean);
}

function normalizeVisualTokenAdapter(sourcePolicy, fallbackPolicy) {
  const policy = mergePolicyObject(
    sourcePolicy,
    isPlainObject(fallbackPolicy) ? fallbackPolicy : DEFAULT_VISUAL_TOKEN_ADAPTER,
  );
  const source = isPlainObject(sourcePolicy) ? sourcePolicy : {};
  const fallback = isPlainObject(fallbackPolicy)
    ? fallbackPolicy
    : DEFAULT_VISUAL_TOKEN_ADAPTER;

  return {
    ...policy,
    id: optionalString(policy.id) || DEFAULT_VISUAL_TOKEN_ADAPTER.id,
    mode:
      optionalString(policy.mode) ||
      optionalString(fallback.mode) ||
      DEFAULT_VISUAL_TOKEN_ADAPTER.mode,
    purpose:
      optionalString(policy.purpose) ||
      optionalString(fallback.purpose) ||
      DEFAULT_VISUAL_TOKEN_ADAPTER.purpose,
    token_families: normalizePrimitiveList(
      policy.token_families ?? policy.tokenFamilies,
      fallback.token_families ?? DEFAULT_VISUAL_TOKEN_ADAPTER.token_families,
    ),
    token_roles: normalizeRoleEntries(
      firstDefined(source.token_roles, source.tokenRoles, policy.token_roles, policy.tokenRoles),
      fallback.token_roles ?? DEFAULT_VISUAL_TOKEN_ADAPTER.token_roles,
      { arrayKeys: ["families"], stringKeys: ["usage"] },
    ),
    css_custom_properties: normalizeCssCustomProperties(
      firstDefined(
        source.css_custom_properties,
        source.cssCustomProperties,
        policy.css_custom_properties,
        policy.cssCustomProperties,
      ),
      fallback.css_custom_properties ??
        DEFAULT_VISUAL_TOKEN_ADAPTER.css_custom_properties,
    ),
    appearance_policy: normalizeAppearancePolicy(
      firstDefined(
        source.appearance_policy,
        source.appearancePolicy,
      ),
      fallback.appearance_policy ??
        DEFAULT_VISUAL_TOKEN_ADAPTER.appearance_policy,
    ),
    appearance_token_sets: normalizeAppearanceTokenSets(
      firstDefined(
        source.appearance_token_sets,
        source.appearanceTokenSets,
      ),
      fallback.appearance_token_sets ??
        DEFAULT_VISUAL_TOKEN_ADAPTER.appearance_token_sets,
    ),
    semantic_roles: normalizePrimitiveList(
      policy.semantic_roles ?? policy.semanticRoles,
      fallback.semantic_roles ?? DEFAULT_VISUAL_TOKEN_ADAPTER.semantic_roles,
    ),
    font_roles: normalizeRoleEntries(
      firstDefined(source.font_roles, source.fontRoles, policy.font_roles, policy.fontRoles),
      fallback.font_roles ?? DEFAULT_VISUAL_TOKEN_ADAPTER.font_roles,
      {
        valueKey: "stack",
        arrayKeys: ["feature_settings"],
        stringKeys: ["stack", "usage"],
      },
    ),
    font_rules: normalizePrimitiveList(
      policy.font_rules ?? policy.fontRules,
      fallback.font_rules ?? DEFAULT_VISUAL_TOKEN_ADAPTER.font_rules,
    ),
    icon_roles: normalizePrimitiveList(
      policy.icon_roles ?? policy.iconRoles,
      fallback.icon_roles ?? DEFAULT_VISUAL_TOKEN_ADAPTER.icon_roles,
    ),
    icon_catalog: normalizeIconCatalog(
      firstDefined(
        source.icon_catalog,
        source.iconCatalog,
        policy.icon_catalog,
        policy.iconCatalog,
      ),
      fallback.icon_catalog ?? DEFAULT_VISUAL_TOKEN_ADAPTER.icon_catalog,
    ),
    icon_selection_policy: normalizeIconSelectionPolicy(
      firstDefined(
        source.icon_selection_policy,
        source.iconSelectionPolicy,
        policy.icon_selection_policy,
        policy.iconSelectionPolicy,
      ),
      fallback.icon_selection_policy ??
        DEFAULT_VISUAL_TOKEN_ADAPTER.icon_selection_policy,
    ),
    icon_rules: normalizePrimitiveList(
      policy.icon_rules ?? policy.iconRules,
      fallback.icon_rules ?? DEFAULT_VISUAL_TOKEN_ADAPTER.icon_rules,
    ),
    adapter_rules: normalizePrimitiveList(
      policy.adapter_rules ?? policy.adapterRules,
      fallback.adapter_rules ?? DEFAULT_VISUAL_TOKEN_ADAPTER.adapter_rules,
    ),
    evidence_expectations: normalizePrimitiveList(
      policy.evidence_expectations ?? policy.evidenceExpectations,
      fallback.evidence_expectations ??
        DEFAULT_VISUAL_TOKEN_ADAPTER.evidence_expectations,
    ),
    deferred_renderer: mergePolicyObject(
      policy.deferred_renderer ?? policy.deferredRenderer,
      DEFAULT_VISUAL_TOKEN_ADAPTER.deferred_renderer,
    ),
    failure_signals: normalizePrimitiveList(
      policy.failure_signals ?? policy.failureSignals,
      fallback.failure_signals ?? DEFAULT_VISUAL_TOKEN_ADAPTER.failure_signals,
    ),
  };
}

function designSystemAdapterFromInput(source) {
  return isPlainObject(source)
    ? source.design_system_adapter ?? source.designSystemAdapter
    : null;
}

function requestedRawExternalDesignSystemSource(source) {
  if (!isPlainObject(source) || isPlainObject(designSystemAdapterFromInput(source))) {
    return false;
  }

  const designSystemSource =
    source.design_system_source ?? source.designSystemSource;

  if (!isPlainObject(designSystemSource)) {
    return false;
  }

  const mode = optionalString(designSystemSource.mode);

  if (mode !== "external_design_system") {
    return false;
  }

  return true;
}

function throwIncompleteDesignSystemAuthority() {
  throw new JudgmentKitInputError(
    "external_design_system mode requires a complete design_system_adapter.",
    {
      code: "incomplete_design_system_authority",
      details: {
        missing_authorities: DESIGN_SYSTEM_REQUIRED_AUTHORITIES,
        fallback_policy: "fail_incomplete",
      },
    },
  );
}

function externalAdapterName(adapter) {
  return optionalDesignSystemName(
    adapter.design_system_name,
    adapter.designSystemName,
    adapter.name,
  );
}

function externalAdapterPackage(adapter) {
  return optionalString(
    adapter.design_system_package ?? adapter.designSystemPackage ?? adapter.package,
  );
}

function externalAdapterTokenSource(adapter) {
  return isPlainObject(adapter)
    ? firstDefined(adapter.token_guidance, adapter.tokenGuidance, adapter.tokens)
    : null;
}

function externalAdapterFontSource(adapter) {
  return isPlainObject(adapter)
    ? firstDefined(
        adapter.font_guidance,
        adapter.fontGuidance,
        adapter.fonts,
        adapter.typography,
      )
    : null;
}

function externalAdapterIconSource(adapter) {
  return isPlainObject(adapter)
    ? firstDefined(adapter.icon_guidance, adapter.iconGuidance, adapter.icons)
    : null;
}

function externalAdapterComponentSource(adapter) {
  return isPlainObject(adapter)
    ? firstDefined(
        adapter.component_contracts,
        adapter.componentContracts,
        adapter.components,
        adapter.approved_component_families,
      )
    : null;
}

function hasTokenAuthority(source) {
  if (!isPlainObject(source)) {
    return false;
  }

  return (
    normalizePrimitiveList(source.token_families ?? source.tokenFamilies).length > 0 ||
    normalizeRoleEntries(source.token_roles ?? source.tokenRoles, [], {
      arrayKeys: ["families"],
      stringKeys: ["usage"],
    }).length > 0 ||
    normalizeCssCustomProperties(
      source.css_custom_properties ?? source.cssCustomProperties,
      [],
    ).length > 0
  );
}

function hasFontAuthority(source) {
  if (!isPlainObject(source)) {
    return false;
  }

  return (
    normalizeRoleEntries(
      firstDefined(source.font_roles, source.fontRoles, source.roles, source),
      [],
      {
        valueKey: "stack",
        arrayKeys: ["feature_settings"],
        stringKeys: ["stack", "usage"],
      },
    ).length > 0
  );
}

function hasIconAuthority(source) {
  if (!isPlainObject(source)) {
    return false;
  }

  const catalog = firstDefined(
    source.icon_catalog,
    source.iconCatalog,
    source.catalog,
  );

  return (
    normalizePrimitiveList(source.icon_roles ?? source.iconRoles ?? source.roles)
      .length > 0 &&
    isPlainObject(catalog) &&
    optionalString(catalog.library).length > 0 &&
    optionalString(catalog.package).length > 0
  );
}

function hasComponentAuthority(source) {
  if (Array.isArray(source)) {
    return source.length > 0;
  }

  if (isPlainObject(source)) {
    return Object.keys(source).length > 0;
  }

  return false;
}

function validateExternalDesignSystemAdapter(adapter) {
  if (!isPlainObject(adapter)) {
    return null;
  }

  const tokenSource = externalAdapterTokenSource(adapter);
  const fontSource = externalAdapterFontSource(adapter);
  const iconSource = externalAdapterIconSource(adapter);
  const componentSource = externalAdapterComponentSource(adapter);
  const missingAuthorities = [
    !hasTokenAuthority(tokenSource) ? "tokens" : "",
    !hasFontAuthority(fontSource) ? "fonts" : "",
    !hasIconAuthority(iconSource) ? "icons" : "",
    !hasComponentAuthority(componentSource) ? "components" : "",
  ].filter(Boolean);

  if (missingAuthorities.length > 0) {
    throw new JudgmentKitInputError(
      "External design-system adapters must define complete token, font, icon, and component authority.",
      {
        code: "incomplete_design_system_authority",
        details: {
          missing_authorities: missingAuthorities,
          fallback_policy: "fail_incomplete",
        },
      },
    );
  }

  return {
    tokenSource,
    fontSource,
    iconSource,
    componentSource,
  };
}

function externalComponentContractsFromAdapter(adapter, componentSource) {
  const explicitContracts =
    adapter.component_contracts ?? adapter.componentContracts;

  if (hasComponentAuthority(explicitContracts)) {
    return normalizeComponentContracts(explicitContracts, []);
  }

  return toStringArray(componentSource).map((component) => ({
    id: component,
    label: component,
    purpose: `Use ${component} from the active external design system.`,
    use_when: ["the external design system defines this renderer component"],
    avoid_when: ["the component is not available in the active external design system"],
    anatomy: ["as defined by the active external design system"],
    required_states: ["ready", "disabled", "focus-visible", "loading"],
    token_bindings: ["external_design_system"],
    accessibility_checks: ["accessible name", "keyboard and focus behavior"],
    review_checks: ["component is imported from the active design-system package"],
    failure_signals: [
      "component is reimplemented locally instead of sourced from the active design system",
    ],
  }));
}

function validateExternalPatternContracts(explicitPatternContracts, baseDesignSystem) {
  if (!hasComponentAuthority(explicitPatternContracts)) {
    return;
  }

  const canonicalById = new Map(
    normalizePatternContracts(
      baseDesignSystem?.pattern_contracts,
      DEFAULT_PATTERN_CONTRACTS,
    ).map((contract) => [normalizeText(contract.id), contract]),
  );
  const conflicts = normalizePatternContracts(explicitPatternContracts, [])
    .map((contract) => {
      const canonical = canonicalById.get(normalizeText(contract.id));
      const surfaceType = optionalString(contract.surface_type);

      if (
        !canonical ||
        !surfaceType ||
        normalizeText(surfaceType) === normalizeText(canonical.surface_type)
      ) {
        return null;
      }

      return {
        id: contract.id,
        selected_surface_type: surfaceType,
        required_surface_type: canonical.surface_type,
      };
    })
    .filter(Boolean);

  if (conflicts.length > 0) {
    throw new JudgmentKitInputError(
      "External design-system pattern contracts cannot redefine known pattern ids with conflicting surface types.",
      {
        code: "invalid_input",
        details: {
          conflicts,
          repair:
            "Use a new pattern id for external patterns, or keep the canonical surface_type for known JudgmentKit pattern ids.",
        },
      },
    );
  }
}

function externalVisualTokenAdapterFallback(adapter, iconSource) {
  const iconCatalog = firstDefined(
    iconSource.icon_catalog,
    iconSource.iconCatalog,
    iconSource.catalog,
  ) ?? {};
  const iconLibrary = optionalString(iconCatalog.library);

  return {
    id: "external.visual-token-adapter",
    mode: "external_design_system",
    purpose:
      "Define token, font, and icon evidence from the active external design system.",
    token_families: [],
    token_roles: [],
    css_custom_properties: [],
    appearance_policy: DEFAULT_APPEARANCE_POLICY,
    appearance_token_sets: [],
    semantic_roles: [],
    font_roles: [],
    font_rules: [
      "font roles must come from the active external design system",
    ],
    icon_roles: [],
    icon_catalog: {
      source: "external_design_system",
      library: iconLibrary || "external-design-system",
      package: optionalString(iconCatalog.package) || externalAdapterPackage(adapter),
      version: optionalString(iconCatalog.version) || "repo-approved",
      icon_count: numberOrFallback(iconCatalog.icon_count ?? iconCatalog.iconCount, 1),
      license: optionalString(iconCatalog.license) || "repo-approved",
      notice:
        optionalString(iconCatalog.notice) ||
        "Icon assets are governed by the active external design system.",
      style_system:
        optionalString(iconCatalog.style_system ?? iconCatalog.styleSystem) ||
        "Active external design-system icons",
      style_attributes: isPlainObject(
        iconCatalog.style_attributes ?? iconCatalog.styleAttributes,
      )
        ? iconCatalog.style_attributes ?? iconCatalog.styleAttributes
        : {},
      mcp_tools: normalizePrimitiveList(
        iconCatalog.mcp_tools ?? iconCatalog.mcpTools ?? iconCatalog.tools,
        [],
      ),
      default_include_svg:
        typeof (iconCatalog.default_include_svg ?? iconCatalog.defaultIncludeSvg) ===
        "boolean"
          ? iconCatalog.default_include_svg ?? iconCatalog.defaultIncludeSvg
          : false,
    },
    icon_selection_policy: {
      source_library: iconLibrary || "external-design-system",
      selection_flow: [
        "Use icon assets from the active external design system.",
      ],
      semantic_guidance:
        "JudgmentKit may name icon roles, but concrete icon assets must come from the active external design system.",
      accessibility_guidance:
        DEFAULT_ICON_SELECTION_POLICY.accessibility_guidance,
      failure_signals: [
        "icons bypass the active external design-system source",
        "icons are mixed with JudgmentKit defaults without explicit external authority",
      ],
    },
    icon_rules: [
      "default JudgmentKit icon assets are not used while an external design system is active",
      "meaningful icons still require adjacent text or an accessible name",
    ],
    adapter_rules: [
      "external design-system evidence cannot replace activity, workflow, disclosure, state, accessibility, static, or browser-QA gates",
      "token, font, icon, and component provenance must point to the active external design system",
    ],
    evidence_expectations: [
      "name the active external design system token, font, icon, and component source",
      "confirm no JudgmentKit default assets are mixed into the rendered UI unless the external adapter explicitly provides them",
    ],
    deferred_renderer: {
      renderer_package: externalAdapterPackage(adapter) || "external_design_system",
      component_package: externalAdapterPackage(adapter) || "external_design_system",
      catalog_compiler: "external_design_system",
    },
    failure_signals: [
      "local CSS or icon packages replace active external design-system assets",
      "JudgmentKit default tokens, fonts, icons, or components appear under external mode without explicit adapter authority",
    ],
  };
}

function externalVisualTokenAdapterFromAdapter(adapter, sources) {
  const tokenSource = isPlainObject(sources.tokenSource) ? sources.tokenSource : {};
  const fontSource = isPlainObject(sources.fontSource) ? sources.fontSource : {};
  const iconSource = isPlainObject(sources.iconSource) ? sources.iconSource : {};

  return normalizeVisualTokenAdapter(
    {
      id:
        optionalString(adapter.visual_token_adapter?.id) ||
        `${normalizeText(externalAdapterName(adapter) || "external").replaceAll(" ", "-")}.visual-token-adapter`,
      mode: "external_design_system",
      purpose:
        optionalString(adapter.purpose) ||
        "Define token, font, and icon evidence from the active external design system.",
      token_families: tokenSource.token_families ?? tokenSource.tokenFamilies,
      token_roles: tokenSource.token_roles ?? tokenSource.tokenRoles,
      css_custom_properties:
        tokenSource.css_custom_properties ?? tokenSource.cssCustomProperties,
      appearance_policy: tokenSource.appearance_policy ?? tokenSource.appearancePolicy,
      appearance_token_sets:
        tokenSource.appearance_token_sets ?? tokenSource.appearanceTokenSets,
      semantic_roles: tokenSource.semantic_roles ?? tokenSource.semanticRoles,
      adapter_rules:
        tokenSource.rules ?? tokenSource.adapter_rules ?? tokenSource.adapterRules,
      font_roles: firstDefined(
        fontSource.font_roles,
        fontSource.fontRoles,
        fontSource.roles,
        fontSource,
      ),
      font_rules: fontSource.rules ?? fontSource.font_rules ?? fontSource.fontRules,
      icon_roles: iconSource.icon_roles ?? iconSource.iconRoles ?? iconSource.roles,
      icon_catalog: firstDefined(
        iconSource.icon_catalog,
        iconSource.iconCatalog,
        iconSource.catalog,
      ),
      icon_selection_policy: firstDefined(
        iconSource.icon_selection_policy,
        iconSource.iconSelectionPolicy,
        iconSource.selection_policy,
        iconSource.selectionPolicy,
      ),
      icon_rules: iconSource.rules ?? iconSource.icon_rules ?? iconSource.iconRules,
    },
    externalVisualTokenAdapterFallback(adapter, iconSource),
  );
}

function tokenPrefixesFromCssProperties(cssCustomProperties) {
  return unique(
    (Array.isArray(cssCustomProperties) ? cssCustomProperties : [])
      .map((entry) => optionalString(entry.name))
      .map((name) => name.match(/^--[a-z0-9]+-/i)?.[0])
      .filter(Boolean),
  );
}

function normalizeDesignSystemSource(sourceValue, context = {}) {
  const source = isPlainObject(sourceValue) ? sourceValue : {};
  const fallback = DEFAULT_DESIGN_SYSTEM_SOURCE;
  const visualTokenAdapter =
    context.visualTokenAdapter ?? DEFAULT_VISUAL_TOKEN_ADAPTER;
  const componentContracts =
    context.componentContracts ?? DEFAULT_COMPONENT_CONTRACTS;
  const requestedMode =
    optionalString(source.mode) ||
    optionalString(context.mode) ||
    fallback.mode;
  const mode = ["judgmentkit_default", "external_design_system"].includes(
    requestedMode,
  )
    ? requestedMode
    : fallback.mode;
  const tokenPrefixes = unique([
    ...normalizePrimitiveList(source.token_prefixes ?? source.tokenPrefixes),
    ...tokenPrefixesFromCssProperties(visualTokenAdapter.css_custom_properties),
    ...(mode === "judgmentkit_default" ? fallback.token_prefixes : []),
  ]);

  return {
    id: optionalString(source.id) || fallback.id,
    mode,
    name:
      optionalString(source.name) ||
      (mode === "judgmentkit_default" ? fallback.name : ""),
    package:
      optionalString(source.package) ||
      (mode === "judgmentkit_default" ? fallback.package : ""),
    definition_point:
      optionalString(source.definition_point ?? source.definitionPoint) ||
      fallback.definition_point,
    required_authorities: normalizePrimitiveList(
      source.required_authorities ?? source.requiredAuthorities,
      DESIGN_SYSTEM_REQUIRED_AUTHORITIES,
    ),
    fallback_policy:
      optionalString(source.fallback_policy ?? source.fallbackPolicy) ||
      "fail_incomplete",
    provenance_required:
      typeof (source.provenance_required ?? source.provenanceRequired) === "boolean"
        ? source.provenance_required ?? source.provenanceRequired
        : true,
    source_exports: mergePolicyObject(
      source.source_exports ?? source.sourceExports,
      mode === "judgmentkit_default" ? fallback.source_exports : {},
    ),
    token_prefixes: tokenPrefixes,
    icon_catalog: normalizeIconCatalog(
      source.icon_catalog ?? source.iconCatalog,
      visualTokenAdapter.icon_catalog ?? fallback.icon_catalog,
    ),
    renderer_components: normalizePrimitiveList(
      source.renderer_components ?? source.rendererComponents,
      componentContracts.map((contract) => contract.id),
    ),
    component_contract_source:
      optionalString(
        source.component_contract_source ?? source.componentContractSource,
      ) || fallback.component_contract_source,
    provenance_rules: normalizePrimitiveList(
      source.provenance_rules ?? source.provenanceRules,
      fallback.provenance_rules,
    ),
  };
}

function externalDesignSystemFromAdapter(adapter, baseDesignSystem) {
  const sources = validateExternalDesignSystemAdapter(adapter);
  const visualTokenAdapter = externalVisualTokenAdapterFromAdapter(adapter, sources);
  const componentContracts = externalComponentContractsFromAdapter(
    adapter,
    sources.componentSource,
  );
  const explicitPatternContracts =
    adapter.pattern_contracts ?? adapter.patternContracts;
  validateExternalPatternContracts(explicitPatternContracts, baseDesignSystem);
  const defaultDesignSystem = normalizeDefaultAiNativeDesignSystem(
    {
      component_contracts: componentContracts,
      ...(hasComponentAuthority(explicitPatternContracts)
        ? { pattern_contracts: explicitPatternContracts }
        : {}),
    },
    baseDesignSystem,
  );
  const name = externalAdapterName(adapter);
  const packageName = externalAdapterPackage(adapter);
  const source = normalizeDesignSystemSource(
    {
      id:
        optionalString(adapter.id) ||
        `${normalizeText(name || "external").replaceAll(" ", "-")}.design-system.source-v1`,
      mode: "external_design_system",
      name,
      package: packageName,
      definition_point: "implementation_contract.design_system_adapter",
      source_exports: adapter.source_exports ?? adapter.sourceExports ?? {},
      token_prefixes: adapter.token_prefixes ?? adapter.tokenPrefixes,
      icon_catalog: visualTokenAdapter.icon_catalog,
      renderer_components: componentContracts.map((contract) => contract.id),
      component_contract_source: hasComponentAuthority(
        adapter.component_contracts ?? adapter.componentContracts,
      )
        ? "implementation_contract.design_system_adapter.component_contracts"
        : "implementation_contract.design_system_adapter.components",
      provenance_rules: [
        "visual tokens, fonts, icons, and components must come from the active external design system",
        "JudgmentKit default assets must not be mixed in unless the external adapter explicitly names them",
        "local CSS may define layout and structure but not the visual token source",
      ],
    },
    {
      mode: "external_design_system",
      visualTokenAdapter,
      componentContracts,
    },
  );

  return {
    defaultDesignSystem,
    visualTokenAdapter,
    designSystemSource: source,
  };
}

function resolveImplementationDesignSystem(source, base) {
  const sourceDefaultDesignSystem = normalizeDefaultAiNativeDesignSystem(
    source.default_ai_native_design_system ??
      source.defaultAiNativeDesignSystem,
    base.default_ai_native_design_system,
  );
  const designSystemAdapter = designSystemAdapterFromInput(source);

  if (isPlainObject(designSystemAdapter)) {
    return externalDesignSystemFromAdapter(
      designSystemAdapter,
      sourceDefaultDesignSystem,
    );
  }

  const visualTokenAdapter = normalizeVisualTokenAdapter(
    source.visual_token_adapter ?? source.visualTokenAdapter,
    base.visual_token_adapter,
  );
  const designSystemSource = normalizeDesignSystemSource(
    source.design_system_source ??
      source.designSystemSource ??
      base.design_system_source,
    {
      visualTokenAdapter,
      componentContracts: sourceDefaultDesignSystem.component_contracts,
    },
  );

  return {
    defaultDesignSystem: sourceDefaultDesignSystem,
    visualTokenAdapter,
    designSystemSource,
  };
}

function normalizeIterationPolicy(sourcePolicy, fallbackPolicy) {
  const policy = mergePolicyObject(
    sourcePolicy,
    isPlainObject(fallbackPolicy) ? fallbackPolicy : DEFAULT_ITERATION_POLICY,
  );

  return {
    ...policy,
    default_max_attempts: Math.max(
      1,
      numberOrFallback(
        policy.default_max_attempts ?? policy.max_attempts,
        DEFAULT_ITERATION_POLICY.default_max_attempts,
      ),
    ),
    owner: optionalString(policy.owner) || DEFAULT_ITERATION_POLICY.owner,
    loop: normalizePrimitiveList(policy.loop, DEFAULT_ITERATION_POLICY.loop),
    pass_status:
      optionalString(policy.pass_status) || DEFAULT_ITERATION_POLICY.pass_status,
    failure_statuses: normalizePrimitiveList(
      policy.failure_statuses,
      DEFAULT_ITERATION_POLICY.failure_statuses,
    ),
    judgmentkit_role:
      optionalString(policy.judgmentkit_role) ||
      DEFAULT_ITERATION_POLICY.judgmentkit_role,
  };
}

function normalizeAccessibilityPolicy(sourcePolicy, fallbackPolicy) {
  const source = isPlainObject(sourcePolicy) ? sourcePolicy : {};
  const fallback = isPlainObject(fallbackPolicy)
    ? fallbackPolicy
    : DEFAULT_ACCESSIBILITY_POLICY;
  const fallbackStandardsProfile = isPlainObject(fallback.standards_profile)
    ? fallback.standards_profile
    : DEFAULT_ACCESSIBILITY_POLICY.standards_profile;
  const sourceTargets = isPlainObject(source.contrast_targets ?? source.contrastTargets)
    ? source.contrast_targets ?? source.contrastTargets
    : {};
  const fallbackTargets = isPlainObject(fallback.contrast_targets)
    ? fallback.contrast_targets
    : DEFAULT_ACCESSIBILITY_POLICY.contrast_targets;
  const sourceReadability = isPlainObject(
    source.rendered_background_readability ?? source.renderedBackgroundReadability,
  )
    ? source.rendered_background_readability ?? source.renderedBackgroundReadability
    : {};
  const fallbackReadability = isPlainObject(
    fallback.rendered_background_readability,
  )
    ? fallback.rendered_background_readability
    : DEFAULT_ACCESSIBILITY_POLICY.rendered_background_readability;
  const fallbackConditionalEvidence = isPlainObject(fallback.conditional_evidence)
    ? fallback.conditional_evidence
    : DEFAULT_ACCESSIBILITY_POLICY.conditional_evidence;
  const fallbackContracts = isPlainObject(fallback.contracts)
    ? fallback.contracts
    : DEFAULT_ACCESSIBILITY_POLICY.contracts;
  const fallbackEvidenceModel = isPlainObject(fallback.evidence_model)
    ? fallback.evidence_model
    : DEFAULT_ACCESSIBILITY_POLICY.evidence_model;

  return {
    standards_profile: mergePolicyObject(
      source.standards_profile ?? source.standardsProfile,
      fallbackStandardsProfile,
    ),
    contrast_targets: {
      normal_text_min_ratio: numberOrFallback(
        sourceTargets.normal_text_min_ratio ?? sourceTargets.normalTextMinRatio,
        numberOrFallback(
          fallbackTargets.normal_text_min_ratio,
          DEFAULT_ACCESSIBILITY_POLICY.contrast_targets.normal_text_min_ratio,
        ),
      ),
      large_text_min_ratio: numberOrFallback(
        sourceTargets.large_text_min_ratio ?? sourceTargets.largeTextMinRatio,
        numberOrFallback(
          fallbackTargets.large_text_min_ratio,
          DEFAULT_ACCESSIBILITY_POLICY.contrast_targets.large_text_min_ratio,
        ),
      ),
      non_text_min_ratio: numberOrFallback(
        sourceTargets.non_text_min_ratio ?? sourceTargets.nonTextMinRatio,
        numberOrFallback(
          fallbackTargets.non_text_min_ratio,
          DEFAULT_ACCESSIBILITY_POLICY.contrast_targets.non_text_min_ratio,
        ),
      ),
    },
    rendered_background_readability: {
      applies_to: normalizePrimitiveList(
        sourceReadability.applies_to ?? sourceReadability.appliesTo,
        fallbackReadability.applies_to ??
          DEFAULT_ACCESSIBILITY_POLICY.rendered_background_readability.applies_to,
      ),
      requirement:
        optionalString(sourceReadability.requirement) ||
        optionalString(fallbackReadability.requirement) ||
        DEFAULT_ACCESSIBILITY_POLICY.rendered_background_readability.requirement,
    },
    required_evidence: normalizePrimitiveList(
      source.required_evidence ?? source.requiredEvidence,
      fallback.required_evidence ?? DEFAULT_ACCESSIBILITY_POLICY.required_evidence,
    ),
    conditional_evidence: mergePolicyObject(
      source.conditional_evidence ?? source.conditionalEvidence,
      fallbackConditionalEvidence,
    ),
    contracts: mergePolicyObject(source.contracts, fallbackContracts),
    evidence_model: mergePolicyObject(
      source.evidence_model ?? source.evidenceModel,
      fallbackEvidenceModel,
    ),
    failure_signals: normalizePrimitiveList(
      source.failure_signals ?? source.failureSignals,
      fallback.failure_signals ?? DEFAULT_ACCESSIBILITY_POLICY.failure_signals,
    ),
  };
}

function normalizeLocalComponentAuthority(sourcePolicy, fallbackPolicy) {
  const fallback = isPlainObject(fallbackPolicy)
    ? fallbackPolicy
    : DEFAULT_LOCAL_COMPONENT_AUTHORITY;
  const source = isPlainObject(sourcePolicy) ? sourcePolicy : {};
  const legacyRequired = source.required === true;
  const legacyAuthorityPresent = Boolean(
    legacyRequired ||
      optionalString(source.component) ||
      optionalString(source.required_family ?? source.requiredFamily) ||
      optionalString(
        source.component_specific_selector ?? source.componentSpecificSelector,
      ) ||
      toStringArray(
        source.accepted_family_selectors ?? source.acceptedFamilySelectors,
      ).length > 0,
  );
  const sourceMode = optionalString(source.mode);
  const sourceEnforcement = optionalString(source.enforcement);
  const sourceFamilies = toStringArray(source.families);
  const legacyRequiredFamily = optionalString(
    source.required_family ?? source.requiredFamily,
  );
  const legacyFamilySelectors = toStringArray(
    source.accepted_family_selectors ?? source.acceptedFamilySelectors,
  );
  const familyEntries = unique([
    ...sourceFamilies,
    ...toStringArray(fallback.families),
    ...(legacyRequiredFamily ? [legacyRequiredFamily] : []),
    ...legacyFamilySelectors,
  ]);
  const legacySelectorExamples = normalizePrimitiveList([
    source.component_specific_selector ?? source.componentSpecificSelector,
    ...legacyFamilySelectors,
  ]);
  const selectorBoundarySource = mergePolicyObject(
    source.selector_boundary ?? source.selectorBoundary,
    {
      ...fallback.selector_boundary,
      ...(legacySelectorExamples.length > 0
        ? { component_selector_examples: legacySelectorExamples }
        : {}),
      ...(toStringArray(
        source.forbidden_component_specific_visual_identity ??
          source.forbiddenComponentSpecificVisualIdentity,
      ).length > 0
        ? {
            blocked_visual_identity_declarations: toStringArray(
              source.forbidden_component_specific_visual_identity ??
                source.forbiddenComponentSpecificVisualIdentity,
            ),
          }
        : {}),
    },
  );
  const tokenBoundarySource = mergePolicyObject(
    source.token_boundary ?? source.tokenBoundary,
    fallback.token_boundary,
  );
  const computedStyleEvidenceSource = mergePolicyObject(
    source.computed_style_evidence ??
      source.computedStyleEvidence ??
      fallback.computed_style_evidence,
    fallback.computed_style_evidence,
  );

  return {
    mode: ["none", "repo_local"].includes(sourceMode)
      ? sourceMode
      : legacyAuthorityPresent
        ? "repo_local"
        : fallback.mode,
    enforcement: ["optional", "required"].includes(sourceEnforcement)
      ? sourceEnforcement
      : legacyRequired
        ? "required"
      : fallback.enforcement,
    families: familyEntries,
    selector_boundary: {
      allowed: normalizePrimitiveList(
        selectorBoundarySource.allowed,
        fallback.selector_boundary?.allowed,
      ),
      component_selector_examples: normalizePrimitiveList(
        selectorBoundarySource.component_selector_examples ??
          selectorBoundarySource.componentSelectorExamples,
        fallback.selector_boundary?.component_selector_examples,
      ),
      layout_only_declarations: normalizePrimitiveList(
        selectorBoundarySource.layout_only_declarations ??
          selectorBoundarySource.layoutOnlyDeclarations,
        fallback.selector_boundary?.layout_only_declarations,
      ),
      blocked_visual_identity_declarations: normalizePrimitiveList(
        selectorBoundarySource.blocked_visual_identity_declarations ??
          selectorBoundarySource.blockedVisualIdentityDeclarations,
        fallback.selector_boundary?.blocked_visual_identity_declarations,
      ),
    },
    token_boundary: {
      direct_token_prefixes: normalizePrimitiveList(
        tokenBoundarySource.direct_token_prefixes ??
          tokenBoundarySource.directTokenPrefixes,
        fallback.token_boundary?.direct_token_prefixes,
      ),
      layout_token_exceptions: normalizePrimitiveList(
        tokenBoundarySource.layout_token_exceptions ??
          tokenBoundarySource.layoutTokenExceptions,
        fallback.token_boundary?.layout_token_exceptions,
      ),
      rule:
        optionalRawString(tokenBoundarySource.rule) ||
        optionalRawString(fallback.token_boundary?.rule),
    },
    computed_style_evidence: {
      required_when:
        optionalString(
          computedStyleEvidenceSource.required_when ??
            computedStyleEvidenceSource.requiredWhen,
        ) || optionalString(fallback.computed_style_evidence?.required_when),
      expectations: normalizePrimitiveList(
        computedStyleEvidenceSource.expectations,
        fallback.computed_style_evidence?.expectations,
      ),
    },
  };
}

function localComponentAuthorityIsActive(authority) {
  const policy = normalizeLocalComponentAuthority(
    authority,
    DEFAULT_LOCAL_COMPONENT_AUTHORITY,
  );

  return policy.mode === "repo_local" || policy.enforcement === "required";
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
  const {
    defaultDesignSystem,
    visualTokenAdapter,
    designSystemSource,
  } = resolveImplementationDesignSystem(source, base);

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
    default_ai_native_design_system: defaultDesignSystem,
    iteration_policy: normalizeIterationPolicy(
      source.iteration_policy ?? source.iterationPolicy,
      base.iteration_policy,
    ),
    design_system_source: designSystemSource,
    local_component_authority: normalizeLocalComponentAuthority(
      source.local_component_authority ??
        source.localComponentAuthority ??
        source.default_ai_native_design_system?.local_component_authority ??
        source.default_ai_native_design_system?.localComponentAuthority ??
        source.defaultAiNativeDesignSystem?.local_component_authority ??
        source.defaultAiNativeDesignSystem?.localComponentAuthority,
      base.local_component_authority,
    ),
    visual_token_adapter: visualTokenAdapter,
    visual_asset_policy: normalizeVisualAssetPolicy(
      source.visual_asset_policy ?? source.visualAssetPolicy,
      base.visual_asset_policy,
    ),
    accessibility_policy: normalizeAccessibilityPolicy(
      source.accessibility_policy ?? source.accessibilityPolicy,
      base.accessibility_policy,
    ),
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
  if (isPlainObject(input) && isPlainObject(designSystemAdapterFromInput(input))) {
    return "external_design_system";
  }

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

  return "judgmentkit_default";
}

export function createUiImplementationContract(input = {}, options = {}) {
  if (input !== undefined && input !== null && !isPlainObject(input)) {
    throw new JudgmentKitInputError(
      "createUiImplementationContract requires an object when input is provided.",
    );
  }

  if (requestedRawExternalDesignSystemSource(input ?? {})) {
    throwIncompleteDesignSystemAuthority();
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
          "action boundaries",
          "data visibility",
          "static enforcement",
          "browser QA",
          "accessibility evidence",
          "local component authority",
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

function candidateImplementationSourceText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (!isPlainObject(value)) {
    return "";
  }

  const sourceKeys = new Set([
    "code",
    "content",
    "contents",
    "css",
    "cssText",
    "css_text",
    "diff",
    "markup",
    "newText",
    "new_text",
    "patch",
    "renderedMarkup",
    "rendered_markup",
    "source",
    "style",
    "styleText",
    "style_text",
    "stylesheet",
    "styles",
    "text",
  ]);
  const containerKeys = new Set([
    "changes",
    "cssFiles",
    "css_files",
    "files",
    "sourceFiles",
    "source_files",
    "stylesheets",
  ]);

  function collectSourceEntries(entry, depth = 0) {
    if (typeof entry === "string") {
      return [entry];
    }

    if (depth > 4 || !entry) {
      return [];
    }

    if (Array.isArray(entry)) {
      return entry.flatMap((child) => collectSourceEntries(child, depth + 1));
    }

    if (!isPlainObject(entry)) {
      return [];
    }

    const values = [];

    for (const [key, child] of Object.entries(entry)) {
      if (sourceKeys.has(key)) {
        values.push(...collectSourceEntries(child, depth + 1));
      } else if (containerKeys.has(key)) {
        values.push(...collectSourceEntries(child, depth + 1));
      }
    }

    return values;
  }

  return unique(collectSourceEntries(value)).join("\n");
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

function candidateAccessibilityEvidence(candidate) {
  if (!isPlainObject(candidate)) {
    return {};
  }

  const evidence =
    candidate.accessibility_evidence ??
    candidate.accessibilityEvidence ??
    candidate.a11y_evidence ??
    candidate.a11yEvidence;

  const normalized = isPlainObject(evidence) ? { ...evidence } : {};
  const hasAutomatedChecks =
    normalized.automated_checks !== undefined || normalized.automatedChecks !== undefined;
  const topLevelStaticEvidence =
    candidate.static_checks ??
    candidate.static_evidence ??
    candidate.static_check_commands ??
    candidate.checks_run;

  if (!hasAutomatedChecks && toStringArray(topLevelStaticEvidence).length > 0) {
    normalized.automated_checks = {
      status: "pass",
      method: "static enforcement",
      artifacts: toStringArray(topLevelStaticEvidence),
    };
  }

  return normalized;
}

function candidateHasVisualBackgroundSignal(candidate, text) {
  if (!isPlainObject(candidate)) {
    return false;
  }

  for (const key of [
    "visual_heavy",
    "visualHeavy",
    "text_over_visuals",
    "textOverVisuals",
    "substantive_visuals",
    "substantiveVisuals",
  ]) {
    if (candidate[key] === true || optionalString(candidate[key]).toLowerCase() === "true") {
      return true;
    }
  }

  for (const key of [
    "visual_backgrounds",
    "visualBackgrounds",
    "visual_background_surfaces",
    "visualBackgroundSurfaces",
    "visual_assets",
    "visualAssets",
    "visual_assets_used",
    "visualAssetsUsed",
    "generated_visuals",
    "generatedVisuals",
    "visual_requirements",
    "visualRequirements",
    "visual_asset_evidence",
    "visualAssetEvidence",
  ]) {
    if (toStringArray(candidate[key]).length > 0) {
      return true;
    }
  }

  return /(?:text[\s-]+over[\s-]+(?:image|visual|video|canvas|gradient)|background-image|linear-gradient|radial-gradient|<\s*canvas\b|webgl|three\.?js|d3(?:\.js)?|<\s*video\b|imagegen|generated visual|substantive visual)/i.test(
    text,
  );
}

function candidateHasTruthySignal(candidate, keys) {
  if (!isPlainObject(candidate)) {
    return false;
  }

  return keys.some((key) => {
    const value = candidate[key];
    return value === true || optionalString(value).toLowerCase() === "true";
  });
}

function candidateHasListSignal(candidate, keys) {
  if (!isPlainObject(candidate)) {
    return false;
  }

  return keys.some((key) => toStringArray(candidate[key]).length > 0);
}

function candidateTextMatches(text, pattern) {
  return pattern.test(text);
}

function candidateHasFormSignal(candidate, text) {
  return candidateHasTruthySignal(candidate, [
    "forms",
    "has_forms",
    "hasForms",
    "form_flow",
    "formFlow",
    "validation",
    "has_validation",
    "hasValidation",
  ]) ||
    candidateHasListSignal(candidate, [
      "form_fields",
      "formFields",
      "required_fields",
      "requiredFields",
      "validation_rules",
      "validationRules",
    ]) ||
    candidateTextMatches(
      text,
      /(?:<\s*form\b|FormField|TextField|TextArea|SelectField|CheckboxGroup|radio|checkbox|validation|invalid|required field|aria-invalid|error message)/i,
    );
}

function candidateHasCustomWidgetSignal(candidate, text) {
  return candidateHasTruthySignal(candidate, [
    "custom_widgets",
    "customWidgets",
    "custom_controls",
    "customControls",
    "custom_interactions",
    "customInteractions",
  ]) ||
    candidateHasListSignal(candidate, [
      "widgets",
      "custom_widgets",
      "customWidgets",
      "widget_patterns",
      "widgetPatterns",
    ]) ||
    candidateTextMatches(
      text,
      /(?:role=["']?(?:button|tab|tabpanel|menu|menuitem|listbox|option|tree|slider|switch|dialog|combobox)|tablist|accordion|carousel|custom widget|rich editor|contenteditable|canvas interaction|webgl interaction)/i,
    );
}

function candidateHasOverlaySignal(candidate, text) {
  return candidateHasTruthySignal(candidate, [
    "overlay",
    "overlays",
    "modal",
    "modals",
    "dialog",
    "dialogs",
    "popover",
    "popovers",
    "sticky",
    "has_overlay",
    "hasOverlay",
  ]) ||
    candidateHasListSignal(candidate, [
      "modal_actions",
      "modalActions",
      "dialog_actions",
      "dialogActions",
      "overlays",
      "sticky_regions",
      "stickyRegions",
    ]) ||
    candidateTextMatches(
      text,
      /(?:modal|dialog|popover|tooltip|sticky header|sticky footer|fixed-position|position:\s*fixed|ui overlay|screen overlay|overlay panel|overlay dialog|drawer|slide-out|lightbox)/i,
    );
}

function candidateHasMotionSignal(candidate, text) {
  return candidateHasTruthySignal(candidate, [
    "motion",
    "animated",
    "animation",
    "animations",
    "has_motion",
    "hasMotion",
    "reveal_animation",
    "revealAnimation",
  ]) ||
    candidateHasListSignal(candidate, [
      "animations",
      "motion_effects",
      "motionEffects",
      "transitions",
    ]) ||
    candidateTextMatches(
      text,
      /(?:animation|animated|transition|parallax|motion|auto-advance|autoplay|marquee|scrolling ticker|opacity-based reveal|reveal transition|requestAnimationFrame)/i,
    );
}

function candidateHasAutoUpdatingSignal(candidate, text) {
  return candidateHasTruthySignal(candidate, [
    "auto_updating",
    "autoUpdating",
    "auto_advance",
    "autoAdvance",
    "autoplay",
    "moving_content",
    "movingContent",
  ]) ||
    candidateTextMatches(
      text,
      /(?:auto-updat|auto updat|auto-advanc|auto advanc|autoplay|ticker|marquee|live update|polling|progress bar|spinner|loading animation|carousel)/i,
    );
}

function candidateHasMediaSignal(candidate, text) {
  return candidateHasTruthySignal(candidate, [
    "media",
    "has_media",
    "hasMedia",
    "video",
    "audio",
  ]) ||
    candidateHasListSignal(candidate, [
      "media_assets",
      "mediaAssets",
      "videos",
      "audio_tracks",
      "audioTracks",
    ]) ||
    candidateTextMatches(text, /(?:<\s*(?:video|audio)\b|video|audio|captions?|transcript|media alternative|time-based media)/i);
}

function candidateHasDenseControlSignal(candidate, text) {
  return candidateHasTruthySignal(candidate, [
    "dense_controls",
    "denseControls",
    "touch_targets",
    "touchTargets",
    "icon_buttons",
    "iconButtons",
  ]) ||
    candidateHasListSignal(candidate, [
      "toolbar_actions",
      "toolbarActions",
      "icon_buttons",
      "iconButtons",
      "touch_targets",
      "touchTargets",
    ]) ||
    candidateTextMatches(
      text,
      /(?:icon-only|icon button|toolbar|dense controls|target size|touch target|pointer target|drag(?:ging)?|small button)/i,
    );
}

function candidateHasHoverFocusContentSignal(candidate, text) {
  return candidateHasTruthySignal(candidate, [
    "hover_content",
    "hoverContent",
    "focus_content",
    "focusContent",
    "tooltips",
  ]) ||
    candidateHasListSignal(candidate, [
      "tooltips",
      "hover_cards",
      "hoverCards",
      "popover_content",
      "popoverContent",
    ]) ||
    candidateTextMatches(text, /(?:tooltip|hover card|content on hover|content on focus|popover)/i);
}

function candidateHasCustomColorSignal(candidate, text, visualBackgroundRequired) {
  return visualBackgroundRequired ||
    candidateHasTruthySignal(candidate, [
      "custom_colors",
      "customColors",
      "authored_colors",
      "authoredColors",
      "forced_colors",
      "forcedColors",
      "high_contrast",
      "highContrast",
    ]) ||
    candidateTextMatches(
      text,
      /(?:#[0-9a-f]{3,8}\b|rgb\(|hsl\(|background-color|color:|linear-gradient|radial-gradient|forced-colors|high contrast|custom color|overlay gradient|focus ring|outline:)/i,
    );
}

function buildAccessibilityEvidenceContext(candidate, text) {
  const visualBackgroundRequired = candidateHasVisualBackgroundSignal(candidate, text);
  const formRequired = candidateHasFormSignal(candidate, text);
  const customWidgetRequired = candidateHasCustomWidgetSignal(candidate, text);
  const overlayRequired = candidateHasOverlaySignal(candidate, text);
  const motionRequired = candidateHasMotionSignal(candidate, text);
  const autoUpdatingRequired = candidateHasAutoUpdatingSignal(candidate, text);
  const mediaRequired = candidateHasMediaSignal(candidate, text);
  const denseControlRequired = candidateHasDenseControlSignal(candidate, text);
  const hoverFocusContentRequired = candidateHasHoverFocusContentSignal(candidate, text);
  const customColorRequired = candidateHasCustomColorSignal(
    candidate,
    text,
    visualBackgroundRequired,
  );

  return {
    visual_background: visualBackgroundRequired,
    non_text_contrast:
      visualBackgroundRequired ||
      customWidgetRequired ||
      denseControlRequired ||
      candidateTextMatches(text, /(?:icon|chart|graph|svg|canvas|d3|state indicator|custom control|checkbox|radio|toggle|slider)/i),
    forced_colors: customColorRequired,
    target_size: denseControlRequired,
    focus_not_obscured: overlayRequired,
    no_keyboard_trap:
      overlayRequired ||
      customWidgetRequired ||
      candidateTextMatches(text, /(?:canvas interaction|webgl interaction|three\.?js interaction|rich editor|contenteditable|iframe|embedded experience)/i),
    reduced_motion: motionRequired,
    pause_stop_hide: autoUpdatingRequired,
    content_on_hover_focus: hoverFocusContentRequired,
    forms: formRequired,
    status_messages:
      formRequired ||
      autoUpdatingRequired ||
      candidateTextMatches(text, /(?:status message|aria-live|role=["']?(?:status|alert|log)|toast|progress message|progress bar|success message|loading message|loading status|results returned|async status)/i),
    media_alternatives: mediaRequired,
    semantic_fallbacks:
      visualBackgroundRequired ||
      mediaRequired ||
      candidateTextMatches(text, /(?:canvas|webgl|three\.?js|d3|generated image|generated visual|chart|graph|visualization)/i),
  };
}

function evidenceValue(source, snakeKey, camelKey) {
  if (!isPlainObject(source)) {
    return undefined;
  }

  for (const key of [snakeKey, camelKey].flat().filter(Boolean)) {
    if (source[key] !== undefined) {
      return source[key];
    }
  }

  return undefined;
}

function evidenceToText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function evidenceHasExplicitFailure(value) {
  if (value === false) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some(evidenceHasExplicitFailure);
  }

  if (isPlainObject(value)) {
    const status = optionalString(value.status ?? value.result ?? value.outcome).toLowerCase();

    if (["fail", "failed", "failing", "blocked", "missing", "skipped"].includes(status)) {
      return true;
    }

    if (value.passed === false || value.pass === false || value.passes === false) {
      return true;
    }

    return Object.values(value).some(evidenceHasExplicitFailure);
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = normalizeText(value);

  if (
    /\b(?:no|without)\s+(?:(?:[a-z]+|contrast)\s+){0,3}(?:failures?|low contrast|overflow)\b/.test(
      normalized,
    )
  ) {
    return false;
  }

  return /\b(?:fail(?:ed|ing)?|failure|low contrast|illegible|insufficient contrast|below aa|below target|skipped|not checked|missing|overflow)\b/.test(
    normalized,
  );
}

function evidenceHasPositiveSignal(value) {
  if (value === true) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0 && value.every(evidenceHasPositiveSignal);
  }

  if (isPlainObject(value)) {
    const status = optionalString(value.status ?? value.result ?? value.outcome).toLowerCase();

    if (["pass", "passed", "verified", "checked", "ok"].includes(status)) {
      return true;
    }

    if (value.passed === true || value.pass === true || value.passes === true) {
      return true;
    }

    return Object.values(value).some(evidenceHasPositiveSignal);
  }

  if (typeof value !== "string") {
    return false;
  }

  return /\b(?:pass(?:ed)?|verified|checked|confirmed|meets|ratio|readable)\b/i.test(value);
}

function evidenceDeclaredStatus(value) {
  if (value === true) {
    return "pass";
  }

  if (value === false) {
    return "fail";
  }

  if (!isPlainObject(value)) {
    return "";
  }

  return optionalString(value.status ?? value.result ?? value.outcome).toLowerCase();
}

function evidenceIsNotApplicable(value) {
  const status = evidenceDeclaredStatus(value);
  return [
    "not_applicable",
    "not applicable",
    "n/a",
    "na",
    "inapplicable",
  ].includes(status);
}

function evidenceHasNotApplicableRationale(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return Boolean(
    optionalString(
      value.rationale ??
        value.reason ??
        value.justification ??
        value.exception ??
        value.not_applicable_reason ??
        value.notApplicableReason,
    ),
  );
}

function evidenceHasVisualOnlyFailure(value) {
  const normalized = normalizeText(evidenceToText(value));

  if (/\b(?:no|not|without)\s+(?:visual-only|visual only|color-only|color only)\b/.test(normalized)) {
    return false;
  }

  return /\b(?:visual-only|visual only|color-only|color only|red border only|icon only|visual cue only|no text error|without text|not programmatic|not announced|screen reader cannot|aria missing|missing label|missing alt|no fallback)\b/.test(
    normalized,
  );
}

function evidenceHasKeyboardFailure(value) {
  const normalized = normalizeText(evidenceToText(value));

  if (/\b(?:no|without)\s+(?:keyboard trap|blocked keyboard path)\b/.test(normalized)) {
    return false;
  }

  return /\b(?:keyboard trap|focus trapped|tab stuck|mouse only|pointer only|not keyboard accessible|no keyboard path|blocked keyboard|cannot tab|focus lost)\b/.test(
    normalized,
  );
}

function evidenceHasFocusObscuredFailure(value) {
  const normalized = normalizeText(evidenceToText(value));

  if (/\b(?:not|never|no)\s+(?:obscured|hidden)\b/.test(normalized)) {
    return false;
  }

  return /\b(?:focus hidden|focus obscured|obscured by|covered by|behind overlay|outline none|invisible focus|not visible focus|focus indicator hidden)\b/.test(
    normalized,
  );
}

function parseRatioNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/(\d+(?:\.\d+)?)(?:\s*:?\s*1)?/);
  return match ? Number(match[1]) : null;
}

function ratioTargetForKey(key, entry, accessibilityPolicy) {
  const keyText = optionalString(key).toLowerCase();
  const entryText = evidenceToText({
    text_size: entry?.text_size,
    textSize: entry?.textSize,
    size: entry?.size,
    category: entry?.category,
  }).toLowerCase();
  const targets = accessibilityPolicy.contrast_targets;

  return keyText.includes("large") || entryText.includes("large")
    ? targets.large_text_min_ratio
    : targets.normal_text_min_ratio;
}

function collectContrastRatioProblems(
  value,
  accessibilityPolicy,
  path = "evidence",
  targetOverride,
) {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectContrastRatioProblems(
        entry,
        accessibilityPolicy,
        `${path}[${index}]`,
        targetOverride,
      ),
    );
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const problems = [];

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();

    if (
      [
        "contrast_ratio",
        "contrastratio",
        "computed_contrast_ratio",
        "computedcontrastratio",
        "min_contrast_ratio",
        "mincontrastratio",
        "minimum_contrast_ratio",
        "minimumcontrastratio",
        "ratio",
      ].includes(normalizedKey)
    ) {
      const ratio = parseRatioNumber(child);
      const target = numberOrFallback(
        targetOverride,
        ratioTargetForKey(key, value, accessibilityPolicy),
      );

      if (ratio !== null && ratio < target) {
        problems.push(`${path}.${key} ${ratio}:1 is below ${target}:1`);
      }
    }

    problems.push(
      ...collectContrastRatioProblems(
        child,
        accessibilityPolicy,
        `${path}.${key}`,
        targetOverride,
      ),
    );
  }

  return problems;
}

function hasBrowserRenderedContrastEvidence(value) {
  if (value === undefined || value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(hasBrowserRenderedContrastEvidence);
  }

  if (isPlainObject(value)) {
    if (
      value.browser_rendered === true ||
      value.browserRendered === true ||
      value.rendered === true ||
      value.computed === true
    ) {
      return true;
    }

    return Object.values(value).some(hasBrowserRenderedContrastEvidence);
  }

  const text = evidenceToText(value).toLowerCase();
  return /browser[-\s]?rendered|rendered|computed|pixel|contrast ratio|sampled|playwright|chrome|canvas pixel/.test(
    text,
  );
}

function reviewAccessibilityEvidence(candidate, implementationContract, text) {
  const accessibilityPolicy =
    implementationContract.accessibility_policy ?? DEFAULT_ACCESSIBILITY_POLICY;
  const evidence = candidateAccessibilityEvidence(candidate);
  const context = buildAccessibilityEvidenceContext(candidate, text);
  const policyRequiredEvidence = new Set(
    [
      ...toStringArray(accessibilityPolicy.required_evidence),
      ...toStringArray(accessibilityPolicy.evidence_model?.core_required).map(
        (key) => `accessibility_evidence.${key}`,
      ),
    ]
      .map((entry) => optionalString(entry).replace(/^accessibility_evidence\./, ""))
      .filter(Boolean),
  );
  const checks = {};
  const findings = [];
  const evidenceSpecs = [
    {
      key: "automated_checks",
      camel: "automatedChecks",
      label: "automated accessibility checks",
      criteria: ["W3C evaluation tools guidance"],
      required: policyRequiredEvidence.has("automated_checks"),
    },
    {
      key: "semantic_content",
      camel: "semanticContent",
      label: "semantic content",
      criteria: ["1.1.1", "1.3.1"],
      required: policyRequiredEvidence.has("semantic_content"),
      visualOnlyFails: true,
    },
    {
      key: "landmarks_headings",
      camel: "landmarksHeadings",
      label: "landmarks and headings",
      criteria: ["1.3.1", "2.4.6"],
      required: policyRequiredEvidence.has("landmarks_headings"),
      visualOnlyFails: true,
    },
    {
      key: "name_role_value",
      camel: "nameRoleValue",
      label: "name, role, value",
      criteria: ["4.1.2"],
      required: policyRequiredEvidence.has("name_role_value"),
      visualOnlyFails: true,
    },
    {
      key: "keyboard_navigation",
      camel: "keyboardNavigation",
      label: "keyboard navigation",
      criteria: ["2.1.1"],
      required: policyRequiredEvidence.has("keyboard_navigation"),
      keyboardFails: true,
    },
    {
      key: "focus_order",
      camel: "focusOrder",
      label: "focus order",
      criteria: ["2.4.3"],
      required: policyRequiredEvidence.has("focus_order"),
      keyboardFails: true,
    },
    {
      key: "visual_background_contrast",
      camel: "visualBackgroundContrast",
      label: "visual background contrast",
      criteria: ["1.4.3", "1.4.11"],
      required:
        policyRequiredEvidence.has("visual_background_contrast") ||
        context.visual_background,
      requireRendered: true,
      contrast: "text",
    },
    {
      key: "non_text_contrast",
      camel: "nonTextContrast",
      label: "non-text contrast",
      criteria: ["1.4.11"],
      required:
        policyRequiredEvidence.has("non_text_contrast") ||
        context.non_text_contrast,
      contrast: "non_text",
    },
    {
      key: "forced_colors",
      camel: "forcedColors",
      label: "forced-colors/high-contrast behavior",
      criteria: ["1.4.3", "1.4.11", "2.4.7"],
      required:
        policyRequiredEvidence.has("forced_colors") ||
        context.forced_colors,
      visualOnlyFails: true,
    },
    {
      key: "focus_visible",
      camel: "focusVisible",
      label: "focus-visible",
      criteria: ["2.4.7", "1.4.11"],
      required: policyRequiredEvidence.has("focus_visible"),
      focusFails: true,
    },
    {
      key: "focus_not_obscured",
      camel: "focusNotObscured",
      label: "focus not obscured",
      criteria: ["2.4.11"],
      required:
        policyRequiredEvidence.has("focus_not_obscured") ||
        context.focus_not_obscured,
      focusFails: true,
      focusObscuredFails: true,
    },
    {
      key: "no_keyboard_trap",
      camel: "noKeyboardTrap",
      label: "no keyboard trap",
      criteria: ["2.1.2"],
      required:
        policyRequiredEvidence.has("no_keyboard_trap") ||
        context.no_keyboard_trap,
      keyboardFails: true,
    },
    {
      key: "reduced_motion",
      camel: "reducedMotion",
      label: "reduced motion",
      criteria: ["2.3.3"],
      required:
        policyRequiredEvidence.has("reduced_motion") ||
        context.reduced_motion,
    },
    {
      key: "pause_stop_hide",
      camel: "pauseStopHide",
      label: "pause, stop, hide",
      criteria: ["2.2.2"],
      required:
        policyRequiredEvidence.has("pause_stop_hide") ||
        context.pause_stop_hide,
    },
    {
      key: "content_on_hover_focus",
      camel: "contentOnHoverFocus",
      label: "content on hover or focus",
      criteria: ["1.4.13"],
      required:
        policyRequiredEvidence.has("content_on_hover_focus") ||
        context.content_on_hover_focus,
      keyboardFails: true,
    },
    {
      key: "form_labels_instructions",
      camel: "formLabelsInstructions",
      label: "form labels and instructions",
      criteria: ["3.3.2", "4.1.2"],
      required:
        policyRequiredEvidence.has("form_labels_instructions") ||
        context.forms,
      visualOnlyFails: true,
    },
    {
      key: "form_errors",
      camel: "formErrors",
      label: "form errors",
      criteria: ["3.3.1", "3.3.3"],
      required:
        policyRequiredEvidence.has("form_errors") ||
        context.forms,
      visualOnlyFails: true,
    },
    {
      key: "status_messages",
      camel: "statusMessages",
      label: "status messages",
      criteria: ["4.1.3"],
      required:
        policyRequiredEvidence.has("status_messages") ||
        context.status_messages,
      visualOnlyFails: true,
    },
    {
      key: "responsive_no_overflow",
      camel: ["responsiveNoOverflow", "reflow_zoom", "reflowZoom"],
      label: "responsive no-overflow and reflow",
      criteria: ["1.4.10", "1.4.4"],
      required: policyRequiredEvidence.has("responsive_no_overflow"),
    },
    {
      key: "target_size",
      camel: "targetSize",
      label: "target size",
      criteria: ["2.5.8"],
      required:
        policyRequiredEvidence.has("target_size") ||
        context.target_size,
    },
    {
      key: "media_alternatives",
      camel: "mediaAlternatives",
      label: "media alternatives",
      criteria: ["1.1.1", "1.2.1", "1.2.2", "1.2.3"],
      required:
        policyRequiredEvidence.has("media_alternatives") ||
        context.media_alternatives,
      visualOnlyFails: true,
    },
    {
      key: "semantic_fallbacks",
      camel: "semanticFallbacks",
      label: "semantic fallbacks",
      criteria: ["1.1.1", "1.3.1", "4.1.2"],
      required:
        policyRequiredEvidence.has("semantic_fallbacks") ||
        context.semantic_fallbacks,
      visualOnlyFails: true,
    },
  ];

  for (const spec of evidenceSpecs) {
    const value = evidenceValue(evidence, spec.key, spec.camel);
    const present = value !== undefined && value !== null && evidenceToText(value).length > 0;
    const notApplicable = present && evidenceIsNotApplicable(value);
    const failures = [];

    if (spec.required && !present) {
      failures.push(`Missing ${spec.label} evidence.`);
    }

    if (present && notApplicable && !evidenceHasNotApplicableRationale(value)) {
      failures.push(`${spec.label} evidence marked not applicable without a rationale.`);
    }

    if (present && evidenceHasExplicitFailure(value)) {
      failures.push(`${spec.label} evidence reports a failure.`);
    }

    if (
      spec.required &&
      present &&
      !notApplicable &&
      !evidenceHasExplicitFailure(value) &&
      !evidenceHasPositiveSignal(value)
    ) {
      failures.push(
        `${spec.label} evidence must report pass/verified status or a not_applicable status with rationale.`,
      );
    }

    if (present && !notApplicable && spec.requireRendered) {
      if (!hasBrowserRenderedContrastEvidence(value)) {
        failures.push(
          "Visual-background contrast evidence must be browser-rendered or computed from rendered output.",
        );
      }
    }

    if (present && !notApplicable && spec.contrast === "text") {
      failures.push(...collectContrastRatioProblems(value, accessibilityPolicy));
    }

    if (present && !notApplicable && spec.contrast === "non_text") {
      failures.push(
        ...collectContrastRatioProblems(
          value,
          accessibilityPolicy,
          "evidence",
          accessibilityPolicy.contrast_targets?.non_text_min_ratio ??
            DEFAULT_ACCESSIBILITY_POLICY.contrast_targets.non_text_min_ratio,
        ),
      );
    }

    if (present && !notApplicable && spec.visualOnlyFails && evidenceHasVisualOnlyFailure(value)) {
      failures.push(`${spec.label} evidence cannot rely on visual-only cues.`);
    }

    if (present && !notApplicable && spec.keyboardFails && evidenceHasKeyboardFailure(value)) {
      failures.push(`${spec.label} evidence reports a blocked keyboard path.`);
    }

    if (present && !notApplicable && spec.focusFails && evidenceHasFocusObscuredFailure(value)) {
      failures.push(`${spec.label} evidence reports hidden or obscured focus.`);
    }

    if (
      present &&
      !notApplicable &&
      spec.focusObscuredFails &&
      evidenceHasFocusObscuredFailure(value)
    ) {
      failures.push(`${spec.label} evidence reports focus obscured by authored content.`);
    }

    const status = failures.length > 0
      ? "fail"
      : notApplicable
        ? "not_applicable"
        : present
        ? evidenceHasPositiveSignal(value)
          ? "pass"
          : "provided"
        : spec.required
          ? "fail"
          : "not_applicable";

    checks[spec.key] = {
      status,
      required: spec.required,
      provided: present,
      criteria: spec.criteria,
      evidence: value,
      failures,
    };

    for (const failure of failures) {
      findings.push({
        severity: "fail",
        check: `accessibility_evidence.${spec.key}`,
        message:
          spec.key === "visual_background_contrast" && !present
            ? "Visual-heavy candidate does not provide browser-rendered visual background contrast evidence."
            : failure,
        evidence: {
          criteria: spec.criteria,
          required_evidence: accessibilityPolicy.required_evidence,
          conditional_evidence: accessibilityPolicy.conditional_evidence,
          value,
        },
      });
    }
  }

  return {
    status: findings.length > 0 ? "fail" : "pass",
    visual_background_contrast_required: context.visual_background,
    required_conditions: context,
    contrast_targets: accessibilityPolicy.contrast_targets,
    required_evidence: accessibilityPolicy.required_evidence,
    conditional_evidence: accessibilityPolicy.conditional_evidence,
    ...checks,
    findings,
  };
}

function collectStrings(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }

  if (isPlainObject(value)) {
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

function collectCandidateValuesByKey(candidate, keyNames) {
  if (!isPlainObject(candidate)) {
    return [];
  }

  const wanted = new Set(keyNames);
  const values = [];

  function visit(value) {
    if (!isPlainObject(value)) {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (wanted.has(key)) {
        values.push(...collectStrings(child));
      }

      if (isPlainObject(child)) {
        visit(child);
      }
    }
  }

  visit(candidate);
  return unique(values.map(cleanClause).filter(Boolean));
}

function reviewActionBoundaries(candidate, implementationContract) {
  const system = implementationContract.default_ai_native_design_system ?? {};
  const policy = isPlainObject(system.action_boundaries)
    ? system.action_boundaries
    : DEFAULT_AI_NATIVE_DESIGN_SYSTEM.action_boundaries;
  const actionTexts = unique([
    ...normalizeCandidateList(candidate, [
      "actions",
      "primary_actions",
      "actions_exposed",
      "user_actions",
      "controls",
      "primary_controls",
    ]),
    ...collectCandidateValuesByKey(candidate, [
      "actions",
      "primary_actions",
      "actions_exposed",
      "user_actions",
      "controls",
      "primary_controls",
    ]),
  ]);
  const riskyTerms = normalizePrimitiveList(
    policy.risky_action_terms,
    DEFAULT_AI_NATIVE_DESIGN_SYSTEM.action_boundaries.risky_action_terms,
  );
  const riskyActions = actionTexts.filter((action) => {
    const normalized = normalizeText(action);
    return riskyTerms.some((term) => normalized.includes(normalizeText(term)));
  });
  const unauthorizedActions = unique([
    ...normalizeCandidateList(candidate, [
      "unauthorized_actions",
      "unapproved_actions",
    ]),
    ...collectCandidateValuesByKey(candidate, [
      "unauthorized_actions",
      "unapproved_actions",
    ]),
  ]);
  const boundaryEvidence = isPlainObject(candidate)
    ? candidate.action_boundary_evidence ??
      candidate.action_boundaries ??
      candidate.actions_evidence ??
      candidate.approval_boundary
    : null;
  const boundaryEvidenceText = evidenceToText(boundaryEvidence).toLowerCase();
  const approvalBoundaryProvided =
    /approval|approve before|confirm|confirmation|explicit user|review before|user submits|consent/.test(
      boundaryEvidenceText,
    );
  const completionEvidenceProvided =
    /receipt|handoff|result|completion|decision reason/.test(boundaryEvidenceText);
  const findings = [];

  if (unauthorizedActions.length > 0) {
    findings.push({
      severity: "fail",
      check: "action_boundaries",
      message: "Candidate exposes actions that are not authorized by the implementation contract.",
      evidence: unauthorizedActions,
    });
  }

  if (riskyActions.length > 0 && !approvalBoundaryProvided) {
    findings.push({
      severity: "fail",
      check: "action_boundaries",
      message:
        "Risky or externally committing actions require explicit approval-boundary evidence.",
      evidence: {
        risky_actions: riskyActions,
        required: policy.required,
      },
    });
  }

  return {
    status: findings.length > 0 ? "fail" : "pass",
    reviewed: actionTexts.length > 0 || Boolean(boundaryEvidence),
    actions: actionTexts,
    risky_actions: riskyActions,
    unauthorized_actions: unauthorizedActions,
    approval_boundary_provided: approvalBoundaryProvided,
    completion_evidence_provided: completionEvidenceProvided,
    required: policy.required,
    findings,
  };
}

function reviewDataVisibility(candidate, implementationContract) {
  const system = implementationContract.default_ai_native_design_system ?? {};
  const policy = isPlainObject(system.data_visibility)
    ? system.data_visibility
    : DEFAULT_AI_NATIVE_DESIGN_SYSTEM.data_visibility;
  const visibleText = collectCandidateValuesByKey(candidate, [
    "visible_text",
    "primary_text",
    "product_ui_text",
    "rendered_text",
    "screen_text",
    "user_facing_text",
    "labels",
    "headings",
    "copy",
    "fields",
    "primary_fields",
    "visible_fields",
    "data_fields",
  ]);
  const visibleTextBlob = visibleText.join("\n").toLowerCase();
  const diagnosticOnlyTerms = normalizePrimitiveList(
    policy.diagnostic_only_terms,
    DEFAULT_AI_NATIVE_DESIGN_SYSTEM.data_visibility.diagnostic_only_terms,
  );
  const leakedTerms = diagnosticOnlyTerms.filter((term) =>
    visibleTextBlob.includes(normalizeText(term)),
  );
  const evidence = isPlainObject(candidate)
    ? candidate.data_visibility_evidence ?? candidate.data_visibility
    : null;
  const evidenceText = evidenceToText(evidence).toLowerCase();
  const diagnosticContextAllowed =
    /setup|debugging|debug|audit|auditing|integration|source inspection/.test(
      evidenceText,
    );
  const findings = [];

  if (leakedTerms.length > 0 && !diagnosticContextAllowed) {
    findings.push({
      severity: "fail",
      check: "data_visibility",
      message:
        "Product UI text exposes diagnostic-only implementation terms without an allowed diagnostic context.",
      evidence: {
        diagnostic_only_terms: leakedTerms,
        allowed_contexts: policy.allowed_diagnostic_contexts,
      },
    });
  }

  return {
    status: findings.length > 0 ? "fail" : "pass",
    reviewed: visibleText.length > 0 || Boolean(evidence),
    visible_text: visibleText,
    diagnostic_only_terms_detected: leakedTerms,
    diagnostic_context_allowed: diagnosticContextAllowed,
    primary_data_roles: policy.primary_data_roles,
    findings,
  };
}

function candidateVisualTokenEvidence(candidate) {
  if (!isPlainObject(candidate)) {
    return null;
  }

  return (
    candidate.visual_token_evidence ??
    candidate.visualTokenEvidence ??
    candidate.visual_token_adapter_evidence ??
    candidate.visualTokenAdapterEvidence ??
    candidate.token_adapter_evidence ??
    candidate.tokenAdapterEvidence ??
    null
  );
}

function evidenceHasAnyValue(value) {
  if (Array.isArray(value)) {
    return value.some(evidenceHasAnyValue);
  }

  if (isPlainObject(value)) {
    return Object.values(value).some(evidenceHasAnyValue);
  }

  return optionalString(value).length > 0;
}

function collectRoleNamesFromEvidenceValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap(collectRoleNamesFromEvidenceValue);
  }

  if (typeof value === "string") {
    return [cleanClause(value)];
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const directRole = optionalString(value.role ?? value.semantic_role ?? value.semanticRole);

  if (directRole) {
    return [directRole];
  }

  for (const key of [
    "roles",
    "font_roles",
    "fontRoles",
    "icon_roles",
    "iconRoles",
    "token_roles",
    "tokenRoles",
  ]) {
    if (value[key] !== undefined) {
      return collectRoleNamesFromEvidenceValue(value[key]);
    }
  }

  if (
    value.source !== undefined ||
    value.mode !== undefined ||
    value.rules !== undefined ||
    value.icon_catalog !== undefined ||
    value.iconCatalog !== undefined ||
    value.icon_selection_policy !== undefined ||
    value.iconSelectionPolicy !== undefined
  ) {
    return [];
  }

  return Object.keys(value).map(cleanClause);
}

function collectEvidenceRoleNames(evidence, keyNames) {
  if (!isPlainObject(evidence)) {
    return [];
  }

  const wanted = new Set(keyNames);
  const values = [];

  function visit(value) {
    if (!isPlainObject(value)) {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (wanted.has(key)) {
        values.push(...collectRoleNamesFromEvidenceValue(child));
      }

      if (isPlainObject(child)) {
        visit(child);
      }
    }
  }

  visit(evidence);

  return unique(values.map(cleanClause).filter(Boolean));
}

function collectIconIdsFromEvidenceValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap(collectIconIdsFromEvidenceValue);
  }

  if (typeof value === "string") {
    return [cleanClause(value)];
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const directId = optionalString(
    value.icon_id ??
      value.iconId ??
      value.lucide_icon_id ??
      value.lucideIconId ??
      value.id,
  );

  if (directId) {
    return [directId];
  }

  return [
    ...collectIconIdsFromEvidenceValue(value.icon_ids ?? value.iconIds),
    ...collectIconIdsFromEvidenceValue(value.selected_icons ?? value.selectedIcons),
    ...collectIconIdsFromEvidenceValue(value.lucide_icons ?? value.lucideIcons),
    ...collectIconIdsFromEvidenceValue(value.catalog_icon_ids ?? value.catalogIconIds),
  ];
}

function collectEvidenceIconIds(evidence) {
  if (!isPlainObject(evidence)) {
    return [];
  }

  const values = [];
  const wantedKeys = new Set([
    "icon_ids",
    "iconIds",
    "selected_icons",
    "selectedIcons",
    "lucide_icons",
    "lucideIcons",
    "catalog_icon_ids",
    "catalogIconIds",
  ]);

  function visit(value) {
    if (!isPlainObject(value)) {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (wantedKeys.has(key)) {
        values.push(...collectIconIdsFromEvidenceValue(child));
      }

      if (isPlainObject(child)) {
        const directId = optionalString(
          child.icon_id ??
            child.iconId ??
            child.lucide_icon_id ??
            child.lucideIconId,
        );
        if (directId) {
          values.push(directId);
        }
        visit(child);
      }
    }
  }

  visit(evidence);

  return unique(values.map((value) => value.trim()).filter(Boolean));
}

function reviewVisualTokenEvidence(candidate, implementationContract) {
  const adapter =
    implementationContract.visual_token_adapter ?? DEFAULT_VISUAL_TOKEN_ADAPTER;
  const evidence = candidateVisualTokenEvidence(candidate);
  const evidenceText = evidenceToText(evidence).toLowerCase();
  const allowedFamilies = normalizePrimitiveList(
    adapter.token_families,
    DEFAULT_VISUAL_TOKEN_ADAPTER.token_families,
  );
  const allowedFamilySet = new Set(allowedFamilies.map((family) => normalizeText(family)));
  const families = unique([
    ...normalizeCandidateList(evidence, [
      "token_families",
      "tokenFamilies",
      "families",
      "categories",
      "visual_token_families",
      "visualTokenFamilies",
    ]),
    ...collectCandidateValuesByKey(evidence, [
      "token_families",
      "tokenFamilies",
      "families",
      "categories",
      "visual_token_families",
      "visualTokenFamilies",
    ]),
  ]);
  const unsupportedFamilies = families.filter(
    (family) => !allowedFamilySet.has(normalizeText(family)),
  );
  const allowedFontRoles = normalizeRoleEntries(
    adapter.font_roles,
    DEFAULT_VISUAL_TOKEN_ADAPTER.font_roles,
  ).map((entry) => entry.role);
  const allowedFontRoleSet = new Set(
    allowedFontRoles.map((role) => normalizeText(role)),
  );
  const fontRoles = collectEvidenceRoleNames(evidence, [
    "font_roles",
    "fontRoles",
    "fonts",
    "font_guidance",
    "fontGuidance",
    "typography_roles",
    "typographyRoles",
  ]);
  const unsupportedFontRoles = fontRoles.filter(
    (role) => !allowedFontRoleSet.has(normalizeText(role)),
  );
  const allowedIconRoles = normalizePrimitiveList(
    adapter.icon_roles,
    DEFAULT_VISUAL_TOKEN_ADAPTER.icon_roles,
  );
  const allowedIconRoleSet = new Set(
    allowedIconRoles.map((role) => normalizeText(role)),
  );
  const iconRoles = collectEvidenceRoleNames(evidence, [
    "icon_roles",
    "iconRoles",
    "icons",
    "icon_guidance",
    "iconGuidance",
  ]);
  const unsupportedIconRoles = iconRoles.filter(
    (role) => !allowedIconRoleSet.has(normalizeText(role)),
  );
  const selectedIconIds = collectEvidenceIconIds(evidence);
  const normalizedIconCatalog = normalizeIconCatalog(
    adapter.icon_catalog,
    DEFAULT_VISUAL_TOKEN_ADAPTER.icon_catalog,
  );
  const validatesAgainstLucideCatalog =
    normalizeText(normalizedIconCatalog.library) === "lucide" ||
    normalizeText(normalizedIconCatalog.source).includes("lucide");
  const unsupportedIconIds = validatesAgainstLucideCatalog
    ? selectedIconIds.filter((id) => !LUCIDE_ICON_INDEX.has(id))
    : [];
  const deferredRendererTerms = [
    "renderer package",
    "component package",
    "component library",
    "catalog compiler",
    "protocol compiler",
    "a2ui",
  ];
  const deferredRendererClaims = deferredRendererTerms.filter((term) =>
    evidenceText.includes(term),
  );
  const substitutesGateEvidence =
    /(token|visual token|font|icon|design asset).{0,60}(satisf|pass|replace|substitute|instead).{0,80}(approved primitive|primitive|state|accessibility|action boundary|data visibility|static|browser qa|implementation gate)/i.test(
      evidenceText,
    ) ||
    /(skip|without|no need for).{0,80}(approved primitive|state|accessibility|browser qa|static check|action boundary|data visibility)/i.test(
      evidenceText,
    );
  const findings = [];

  if (unsupportedFamilies.length > 0) {
    findings.push({
      severity: "fail",
      check: "visual_tokens",
      message:
        "Candidate visual token evidence uses token families outside the boundary adapter.",
      evidence: {
        unsupported_families: unsupportedFamilies,
        allowed_families: allowedFamilies,
      },
    });
  }

  if (unsupportedFontRoles.length > 0) {
    findings.push({
      severity: "fail",
      check: "visual_tokens",
      message:
        "Candidate font evidence uses font roles outside the boundary adapter.",
      evidence: {
        unsupported_font_roles: unsupportedFontRoles,
        allowed_font_roles: allowedFontRoles,
      },
    });
  }

  if (unsupportedIconRoles.length > 0) {
    findings.push({
      severity: "fail",
      check: "visual_tokens",
      message:
        "Candidate icon evidence uses icon roles outside the boundary adapter.",
      evidence: {
        unsupported_icon_roles: unsupportedIconRoles,
        allowed_icon_roles: allowedIconRoles,
      },
    });
  }

  if (unsupportedIconIds.length > 0) {
    findings.push({
      severity: "fail",
      check: "visual_tokens",
      message:
        "Candidate icon evidence cites icon ids outside the committed Lucide catalog.",
      evidence: {
        unsupported_icon_ids: unsupportedIconIds,
        catalog_library: adapter.icon_catalog?.library,
        catalog_version: adapter.icon_catalog?.version,
        catalog_tools: adapter.icon_catalog?.mcp_tools,
      },
    });
  }

  if (deferredRendererClaims.length > 0) {
    findings.push({
      severity: "fail",
      check: "visual_tokens",
      message:
        "Candidate visual token evidence introduces renderer, component, catalog, compiler, or A2UI work that is deferred.",
      evidence: {
        deferred_terms: deferredRendererClaims,
        deferred_renderer: adapter.deferred_renderer,
      },
    });
  }

  if (substitutesGateEvidence) {
    findings.push({
      severity: "fail",
      check: "visual_tokens",
      message:
        "Candidate visual token evidence is being used as a substitute for required implementation gate evidence.",
      evidence: {
        adapter_rules: adapter.adapter_rules,
      },
    });
  }

  return {
    status: findings.length > 0 ? "fail" : "pass",
    reviewed: evidenceHasAnyValue(evidence),
    mode: adapter.mode,
    allowed_families: allowedFamilies,
    families,
    unsupported_families: unsupportedFamilies,
    allowed_font_roles: allowedFontRoles,
    font_roles: fontRoles,
    unsupported_font_roles: unsupportedFontRoles,
    allowed_icon_roles: allowedIconRoles,
    icon_roles: iconRoles,
    unsupported_icon_roles: unsupportedIconRoles,
    selected_icon_ids: selectedIconIds,
    unsupported_icon_ids: unsupportedIconIds,
    icon_catalog: normalizeIconCatalog(
      normalizedIconCatalog,
      DEFAULT_VISUAL_TOKEN_ADAPTER.icon_catalog,
    ),
    icon_selection_policy: normalizeIconSelectionPolicy(
      adapter.icon_selection_policy,
      DEFAULT_VISUAL_TOKEN_ADAPTER.icon_selection_policy,
    ),
    deferred_renderer: adapter.deferred_renderer,
    findings,
  };
}

function candidateDesignSystemProvenance(candidate) {
  if (!isPlainObject(candidate)) {
    return null;
  }

  return (
    candidate.design_system_provenance ??
    candidate.designSystemProvenance ??
    candidate.design_system_evidence ??
    candidate.designSystemEvidence ??
    candidate.provenance ??
    null
  );
}

function collectImportedPackages(text) {
  const packages = [];
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const packageName = optionalString(match[1]);

      if (
        packageName &&
        !packageName.startsWith(".") &&
        !packageName.startsWith("/") &&
        !packageName.startsWith("#")
      ) {
        packages.push(packageName);
      }
    }
  }

  return unique(packages);
}

function packageMatchesAuthority(packageName, authorityPackage) {
  const name = optionalString(packageName);
  const authority = optionalString(authorityPackage);

  return Boolean(
    name &&
      authority &&
      (name === authority || name.startsWith(`${authority}/`)),
  );
}

function activeDesignSystemPackages(source, adapter) {
  const iconCatalog = normalizeIconCatalog(
    adapter.icon_catalog,
    DEFAULT_VISUAL_TOKEN_ADAPTER.icon_catalog,
  );
  const renderer = adapter.deferred_renderer ?? {};

  return unique([
    source.package,
    iconCatalog.package,
    renderer.renderer_package,
    renderer.component_package,
  ].map(optionalString));
}

function extractCssCustomPropertyNames(text) {
  return unique(
    [...text.matchAll(/--[a-z0-9][a-z0-9-]*/gi)].map((match) => match[0]),
  );
}

function isVisualTokenName(name) {
  return /surfaceops|mui|color|surface|canvas|text|muted|border|focus|success|warning|risk|disabled|receipt|space|gap|radius|shadow|font|type|brand|accent|status|density/i.test(
    name,
  );
}

function allowedDesignSystemTokenPrefixes(source, adapter) {
  return unique([
    ...normalizePrimitiveList(source.token_prefixes ?? source.tokenPrefixes),
    ...tokenPrefixesFromCssProperties(adapter.css_custom_properties),
  ]);
}

function tokenAllowedByPrefix(name, prefixes) {
  return prefixes.some((prefix) => name.startsWith(prefix));
}

function usesJudgmentKitIconTools(text) {
  return ICON_CATALOG_TOOL_NAMES.some((tool) =>
    new RegExp(`\\b${escapeRegExp(tool)}\\b`).test(text),
  );
}

function reviewDesignSystemProvenance(candidate, implementationContract, text) {
  const visualTokenAdapter = normalizeVisualTokenAdapter(
    implementationContract.visual_token_adapter,
    DEFAULT_VISUAL_TOKEN_ADAPTER,
  );
  const designSystemContract = normalizeDefaultAiNativeDesignSystem(
    implementationContract.default_ai_native_design_system,
    DEFAULT_AI_NATIVE_DESIGN_SYSTEM,
  );
  const source = normalizeDesignSystemSource(
    implementationContract.design_system_source,
    {
      visualTokenAdapter,
      componentContracts: designSystemContract.component_contracts,
    },
  );
  const provenanceEvidence = candidateDesignSystemProvenance(candidate);
  const evidenceText = evidenceToText(provenanceEvidence);
  const searchableText = `${text}\n${evidenceText}`.toLowerCase();
  const imports = collectImportedPackages(text);
  const allowedPackages = activeDesignSystemPackages(source, visualTokenAdapter);
  const disallowedDesignImports = imports.filter((packageName) => {
    const normalizedPackage = normalizeText(packageName);
    const isDesignPackage =
      normalizedPackage === "lucide-react" ||
      normalizedPackage.startsWith("@mui/material") ||
      normalizedPackage.startsWith("@mui/icons-material") ||
      normalizedPackage.startsWith("@fortawesome/") ||
      normalizedPackage.startsWith("react-icons") ||
      normalizedPackage.startsWith("@fontsource/");

    if (!isDesignPackage) {
      return false;
    }

    if (source.mode === "judgmentkit_default") {
      return true;
    }

    return !allowedPackages.some((authorityPackage) =>
      packageMatchesAuthority(packageName, authorityPackage),
    );
  });
  const remoteFontOrIconSources = unique(
    [
      /fonts\.googleapis\.com/i.test(searchableText) ? "fonts.googleapis.com" : "",
      /fonts\.gstatic\.com/i.test(searchableText) ? "fonts.gstatic.com" : "",
      /use\.typekit\.net/i.test(searchableText) ? "use.typekit.net" : "",
      /kit\.fontawesome\.com/i.test(searchableText) ? "kit.fontawesome.com" : "",
      /@font-face/i.test(searchableText) ? "@font-face" : "",
      /(unpkg\.com|cdn\.jsdelivr\.net).{0,80}(lucide|fontawesome|@mui|icons?)/i.test(
        searchableText,
      )
        ? "remote icon CDN"
        : "",
    ],
  );
  const cssCustomProperties = extractCssCustomPropertyNames(searchableText);
  const allowedPrefixes = allowedDesignSystemTokenPrefixes(
    source,
    visualTokenAdapter,
  );
  const disallowedLocalVisualTokens = cssCustomProperties.filter(
    (name) =>
      isVisualTokenName(name) && !tokenAllowedByPrefix(name, allowedPrefixes),
  );
  const explicitJudgmentKitTokens = cssCustomProperties.filter((name) =>
    name.startsWith("--jk-"),
  );
  const externalAllowsJudgmentKitTokens = allowedPrefixes.some((prefix) =>
    "--jk-".startsWith(prefix) || prefix.startsWith("--jk-"),
  );
  const iconCatalog = normalizeIconCatalog(
    visualTokenAdapter.icon_catalog,
    DEFAULT_VISUAL_TOKEN_ADAPTER.icon_catalog,
  );
  const externalAllowsJudgmentKitIconAssets =
    source.mode === "external_design_system" &&
    (normalizeText(iconCatalog.library) === "lucide" ||
      normalizeText(iconCatalog.package) === "lucide-react" ||
      normalizeText(iconCatalog.source).includes("lucide"));
  const judgmentKitIconAssetUse =
    source.mode === "external_design_system" &&
    !externalAllowsJudgmentKitIconAssets &&
    (imports.includes("lucide-react") || usesJudgmentKitIconTools(searchableText));
  const findings = [];

  if (disallowedDesignImports.length > 0) {
    findings.push({
      severity: "fail",
      check: "design_system_provenance",
      message:
        "Candidate imports visual, icon, typography, or component packages outside the active design-system source.",
      evidence: {
        imports: disallowedDesignImports,
        active_source: {
          mode: source.mode,
          name: source.name,
          package: source.package,
          allowed_packages: allowedPackages,
        },
      },
    });
  }

  if (remoteFontOrIconSources.length > 0) {
    findings.push({
      severity: "fail",
      check: "design_system_provenance",
      message:
        "Candidate uses remote font or icon sources instead of the active design-system authority.",
      evidence: {
        remote_sources: remoteFontOrIconSources,
        active_source: source.mode,
      },
    });
  }

  if (disallowedLocalVisualTokens.length > 0) {
    findings.push({
      severity: "fail",
      check: "design_system_provenance",
      message:
        "Candidate defines or uses local visual token namespaces outside the active design-system source.",
      evidence: {
        custom_properties: disallowedLocalVisualTokens,
        allowed_prefixes: allowedPrefixes,
      },
    });
  }

  if (
    source.mode === "external_design_system" &&
    explicitJudgmentKitTokens.length > 0 &&
    !externalAllowsJudgmentKitTokens
  ) {
    findings.push({
      severity: "fail",
      check: "design_system_provenance",
      message:
        "External design-system mode cannot mix in JudgmentKit visual tokens unless the external adapter explicitly names them.",
      evidence: {
        judgmentkit_custom_properties: explicitJudgmentKitTokens,
        token_prefixes: allowedPrefixes,
      },
    });
  }

  if (judgmentKitIconAssetUse) {
    findings.push({
      severity: "fail",
      check: "design_system_provenance",
      message:
        "External design-system mode cannot use JudgmentKit/Lucide icon assets unless the external adapter explicitly names that icon source.",
      evidence: {
        active_icon_catalog: iconCatalog,
        imports,
        judgmentkit_icon_tools: ICON_CATALOG_TOOL_NAMES,
      },
    });
  }

  return {
    status: findings.length > 0 ? "fail" : "pass",
    reviewed:
      source.provenance_required ||
      evidenceHasAnyValue(provenanceEvidence) ||
      imports.length > 0 ||
      cssCustomProperties.length > 0,
    mode: source.mode,
    name: source.name,
    package: source.package,
    required_authorities: source.required_authorities,
    fallback_policy: source.fallback_policy,
    provenance_required: source.provenance_required,
    allowed_packages: allowedPackages,
    token_prefixes: allowedPrefixes,
    detected_imports: imports,
    detected_visual_tokens: cssCustomProperties,
    findings,
  };
}

function candidateLocalComponentAuthorityEvidence(candidate) {
  if (!isPlainObject(candidate)) {
    return null;
  }

  return (
    candidate.local_component_authority_evidence ??
    candidate.localComponentAuthorityEvidence ??
    candidate.local_component_evidence ??
    candidate.localComponentEvidence ??
    null
  );
}

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseCssDeclarations(body) {
  return body
    .split(";")
    .map((entry) => {
      const separator = entry.indexOf(":");

      if (separator === -1) {
        return null;
      }

      const property = entry.slice(0, separator).trim().toLowerCase();
      const value = entry.slice(separator + 1).trim();

      return property && value ? { property, value } : null;
    })
    .filter(Boolean);
}

function scanCssRules(text) {
  const source = stripCssComments(optionalString(text));
  const rules = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const selector = match[1].trim();
    const body = match[2].trim();

    if (
      !selector ||
      selector.startsWith("@") ||
      /(?:^|,)\s*(?:from|to|\d+%)\s*(?:,|$)/i.test(selector)
    ) {
      continue;
    }

    const declarations = parseCssDeclarations(body);

    if (declarations.length > 0) {
      rules.push({ selector, declarations });
    }
  }

  return rules;
}

const DEFAULT_COMPONENT_SELECTOR_TERMS = [
  "action",
  "alert",
  "badge",
  "button",
  "btn",
  "card",
  "checkbox",
  "chip",
  "dialog",
  "field",
  "input",
  "menu",
  "modal",
  "panel",
  "popover",
  "radio",
  "select",
  "status",
  "summary",
  "tab",
  "table",
  "toast",
  "toggle",
  "tooltip",
];

function selectorContainsClassOrId(selector) {
  const selectorWithoutAttributeValues = optionalString(selector).replace(
    /\[[^\]]*\]/g,
    (attributeSelector) => attributeSelector.replace(/(["']).*?\1/g, ""),
  );

  return (
    /(?:^|[^\w-])(?:\.|#)-?[_a-zA-Z][\w-]*/.test(
      selectorWithoutAttributeValues,
    ) ||
    /(?:^|[\s>+~,(])[a-zA-Z][\w-]*(?:\.|#)-?[_a-zA-Z][\w-]*/.test(
      selectorWithoutAttributeValues,
    )
  );
}

function selectorIsGlobalRootSelector(selector) {
  const selectorParts = optionalString(selector)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (selectorParts.length === 0) {
    return false;
  }

  return selectorParts.every((part) => {
    if (["html", "body", ":root", "*"].includes(part)) {
      return true;
    }

    return /^(?:html|body|:root)(?:(?:[.#][\w-]+)|(?:\[[^\]]+\])|(?::[\w-]+(?:\([^)]*\))?))*$/.test(
      part,
    );
  });
}

function selectorIsComponentSpecific(selector, authority) {
  const normalizedSelector = optionalString(selector).toLowerCase();

  if (!normalizedSelector) {
    return false;
  }

  if (selectorIsGlobalRootSelector(selector)) {
    return false;
  }

  if (selectorContainsClassOrId(selector)) {
    return true;
  }

  if (/\[(?:data-component|data-ui|data-slot|data-part)\b/.test(normalizedSelector)) {
    return true;
  }

  if (
    /\[(?:aria-[a-z-]+|data-state|data-status|data-variant|role|type)\b/.test(
      normalizedSelector,
    )
  ) {
    return true;
  }

  const selectorExamples = toStringArray(
    authority.selector_boundary?.component_selector_examples,
  );
  if (
    selectorExamples.some((example) => {
      const normalizedExample = optionalString(example).toLowerCase();

      return (
        normalizedExample &&
        (normalizedSelector === normalizedExample ||
          normalizedSelector.includes(normalizedExample))
      );
    })
  ) {
    return true;
  }

  const familyTerms = unique([
    ...toStringArray(authority.families),
    ...DEFAULT_COMPONENT_SELECTOR_TERMS,
  ])
    .map(normalizeText)
    .filter(Boolean);

  if (familyTerms.length === 0) {
    return /(?:^|[\s>+~,])(?:\.|#)[a-z][a-z0-9_-]*(?:[a-z][A-Z]|__[a-z]|--[a-z])/i.test(
      selector,
    );
  }

  return familyTerms.some((term) => {
    const escaped = escapeRegExp(term).replaceAll(" ", "[-_\\s]");
    const boundary = "[\\s>+~,.#_:\\[\\]\\(\\)=-]";

    return new RegExp(
      `(?:^|${boundary})${escaped}(?:$|${boundary})`,
      "i",
    ).test(selector);
  });
}

function localAuthorityBlockedVisualDeclarations(authority) {
  return normalizePrimitiveList(
    authority.selector_boundary?.blocked_visual_identity_declarations,
    DEFAULT_LOCAL_COMPONENT_AUTHORITY.selector_boundary
      .blocked_visual_identity_declarations,
  );
}

function declarationMatchesPrefix(property, prefixes) {
  return prefixes.some((prefix) => property === prefix || property.startsWith(prefix));
}

function declarationRecreatesVisualIdentity(declaration, authority) {
  const blockedPrefixes = localAuthorityBlockedVisualDeclarations(authority);

  return declarationMatchesPrefix(declaration.property, blockedPrefixes);
}

function localAuthorityDirectTokenPrefixes(authority) {
  const tokenBoundary = authority.token_boundary ?? {};

  return normalizePrimitiveList(
    tokenBoundary.direct_token_prefixes ?? tokenBoundary.directTokenPrefixes,
    DEFAULT_LOCAL_COMPONENT_AUTHORITY.token_boundary.direct_token_prefixes,
  );
}

function directLocalTokensInDeclaration(declaration, authority) {
  const tokenBoundary = authority.token_boundary ?? {};
  const prefixes = localAuthorityDirectTokenPrefixes(authority);
  const layoutExceptions = normalizePrimitiveList(
    tokenBoundary.layout_token_exceptions ?? tokenBoundary.layoutTokenExceptions,
    DEFAULT_LOCAL_COMPONENT_AUTHORITY.token_boundary.layout_token_exceptions,
  );
  const tokenNames = extractCssCustomPropertyNames(
    `${declaration.property}: ${declaration.value}`,
  ).filter((name) => prefixes.some((prefix) => name.startsWith(prefix)));
  const isLayoutOnlyTokenUse =
    declarationMatchesPrefix(
      declaration.property,
      normalizePrimitiveList(
        authority.selector_boundary?.layout_only_declarations,
        DEFAULT_LOCAL_COMPONENT_AUTHORITY.selector_boundary
          .layout_only_declarations,
      ),
    ) &&
    tokenNames.every((name) =>
      layoutExceptions.some((prefix) => name.startsWith(prefix)),
    );

  return isLayoutOnlyTokenUse ? [] : tokenNames;
}

function localAuthorityEvidenceValue(evidence, keys) {
  if (!isPlainObject(evidence)) {
    return undefined;
  }

  for (const key of keys) {
    if (evidence[key] !== undefined) {
      return evidence[key];
    }
  }

  return undefined;
}

function localAuthorityEvidenceValues(evidence, keys) {
  if (!isPlainObject(evidence)) {
    return [];
  }

  return unique([
    ...keys.flatMap((key) => collectStrings(evidence[key])),
    ...collectEvidenceValuesByKeys(evidence, keys),
  ]);
}

function structuredSelectorEntryHasRuleShape(value) {
  return (
    isPlainObject(value) &&
    [
      "selector",
      "css_selector",
      "cssSelector",
      "component_selector",
      "componentSelector",
      "declarations",
      "css_declarations",
      "cssDeclarations",
      "properties",
      "visual_identity_declarations",
      "visualIdentityDeclarations",
      "direct_token_uses",
      "directTokenUses",
      "rule_categories",
      "ruleCategories",
    ].some((key) => value[key] !== undefined)
  );
}

function normalizeStructuredSelectorEvidenceEntries(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(normalizeStructuredSelectorEvidenceEntries);
  }

  if (typeof value === "string") {
    const selector = optionalString(value);

    return selector ? [{ selector }] : [];
  }

  if (!isPlainObject(value)) {
    return [];
  }

  if (structuredSelectorEntryHasRuleShape(value)) {
    return [value];
  }

  return Object.entries(value).flatMap(([selector, child]) => {
    const normalizedSelector = optionalString(selector);

    if (!normalizedSelector) {
      return [];
    }

    if (isPlainObject(child)) {
      return structuredSelectorEntryHasRuleShape(child)
        ? [{ selector: normalizedSelector, ...child }]
        : [{ selector: normalizedSelector, declarations: child }];
    }

    return [{ selector: normalizedSelector, declarations: child }];
  });
}

function structuredSelectorDeclarationHasShape(value) {
  return (
    isPlainObject(value) &&
    [
      "declaration",
      "css_declaration",
      "cssDeclaration",
      "property",
      "property_name",
      "propertyName",
      "css_property",
      "cssProperty",
      "name",
      "value",
      "css_value",
      "cssValue",
      "custom_properties",
      "customProperties",
      "tokens",
      "token",
    ].some((key) => value[key] !== undefined)
  );
}

function collectStructuredSelectorDeclarationInputs(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStructuredSelectorDeclarationInputs);
  }

  if (typeof value === "string") {
    return [value];
  }

  if (!isPlainObject(value)) {
    return [];
  }

  if (structuredSelectorDeclarationHasShape(value)) {
    return [value];
  }

  return Object.entries(value).flatMap(([property, child]) => {
    const normalizedProperty = optionalString(property);

    if (!normalizedProperty) {
      return collectStructuredSelectorDeclarationInputs(child);
    }

    if (typeof child === "string") {
      return [`${normalizedProperty}: ${child}`];
    }

    if (Array.isArray(child)) {
      return child.flatMap((entry) =>
        typeof entry === "string"
          ? [`${normalizedProperty}: ${entry}`]
          : isPlainObject(entry)
            ? collectStructuredSelectorDeclarationInputs({
                property: normalizedProperty,
                ...entry,
              })
            : collectStructuredSelectorDeclarationInputs(entry),
      );
    }

    if (isPlainObject(child)) {
      return collectStructuredSelectorDeclarationInputs({
        property: normalizedProperty,
        ...child,
      });
    }

    return [normalizedProperty];
  });
}

function normalizeStructuredSelectorDeclaration(value) {
  if (typeof value === "string") {
    const text = optionalString(value);

    if (!text || /^(?:none|n\/a|not applicable)$/i.test(text)) {
      return null;
    }

    const separator = text.indexOf(":");

    if (separator !== -1) {
      const property = text.slice(0, separator).trim().toLowerCase();
      const declarationValue = text.slice(separator + 1).trim();

      return property || declarationValue
        ? { property, value: declarationValue, raw: text, explicit_tokens: [] }
        : null;
    }

    const propertyLike =
      /^--[a-z0-9][a-z0-9-]*$/i.test(text) ||
      /^[a-z][a-z0-9-]*$/i.test(text);

    return {
      property: propertyLike ? text.toLowerCase() : "",
      value: propertyLike ? "" : text,
      raw: text,
      explicit_tokens: [],
    };
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const declarationText = optionalString(
    value.declaration ?? value.css_declaration ?? value.cssDeclaration,
  );
  const explicitTokens = unique([
    ...collectStrings(
      value.custom_properties ??
        value.customProperties ??
        value.tokens ??
        value.token,
    ),
  ]);

  if (declarationText) {
    const declaration = normalizeStructuredSelectorDeclaration(declarationText);

    return declaration
      ? {
          ...declaration,
          explicit_tokens: unique([
            ...(declaration.explicit_tokens ?? []),
            ...explicitTokens,
          ]),
        }
      : null;
  }

  const property = optionalString(
    value.property ??
      value.property_name ??
      value.propertyName ??
      value.css_property ??
      value.cssProperty ??
      value.name,
  ).toLowerCase();
  const declarationValue = optionalString(
    value.value ?? value.css_value ?? value.cssValue,
  );

  if (!property && !declarationValue && explicitTokens.length === 0) {
    return null;
  }

  return {
    property,
    value: declarationValue || explicitTokens.join(" "),
    raw:
      property && declarationValue
        ? `${property}: ${declarationValue}`
        : property || declarationValue || explicitTokens.join(" "),
    explicit_tokens: explicitTokens,
  };
}

function structuredSelectorDeclarations(entry, keys) {
  return unique(
    keys
      .flatMap((key) =>
        collectStructuredSelectorDeclarationInputs(
          localAuthorityEvidenceValue(entry, [key]),
        ),
      )
      .map(normalizeStructuredSelectorDeclaration)
      .filter(Boolean),
  );
}

function localAuthorityDeclarationText(declaration) {
  const property = optionalString(declaration.property).toLowerCase();
  const value = optionalString(declaration.value);

  if (property && value) {
    return `${property}: ${value}`;
  }

  return property || value || optionalString(declaration.raw);
}

function directLocalTokensInStructuredDeclaration(declaration, authority) {
  const prefixes = localAuthorityDirectTokenPrefixes(authority);
  const explicitTokens = toStringArray(declaration.explicit_tokens).filter((name) =>
    prefixes.some((prefix) => name.startsWith(prefix)),
  );

  return unique([
    ...directLocalTokensInDeclaration(declaration, authority),
    ...explicitTokens,
  ]);
}

function structuredLocalComponentSelectorEvidence(evidence, authority) {
  const selectorEvidence = localAuthorityEvidenceValue(evidence, [
    "component_specific_selectors",
    "componentSpecificSelectors",
  ]);

  return normalizeStructuredSelectorEvidenceEntries(selectorEvidence)
    .map((entry) => {
      const selector = optionalString(
        entry.selector ??
          entry.css_selector ??
          entry.cssSelector ??
          entry.component_selector ??
          entry.componentSelector,
      );

      if (!selector || selectorIsGlobalRootSelector(selector)) {
        return null;
      }

      const declarations = structuredSelectorDeclarations(entry, [
        "declarations",
        "css_declarations",
        "cssDeclarations",
        "properties",
        "component_declarations",
        "componentDeclarations",
      ]);
      const explicitVisualDeclarations = structuredSelectorDeclarations(entry, [
        "visual_identity_declarations",
        "visualIdentityDeclarations",
        "visual_declarations",
        "visualDeclarations",
        "visual_identity_overrides",
        "visualIdentityOverrides",
      ]);
      const tokenCandidateDeclarations = [
        ...declarations,
        ...explicitVisualDeclarations,
        ...structuredSelectorDeclarations(entry, [
          "direct_token_uses",
          "directTokenUses",
          "direct_tokens",
          "directTokens",
          "token_uses",
          "tokenUses",
        ]),
      ];
      const visualDeclarations = unique([
        ...declarations.filter((declaration) =>
          declarationRecreatesVisualIdentity(declaration, authority),
        ),
        ...explicitVisualDeclarations,
      ]);
      const tokenDeclarations = tokenCandidateDeclarations
        .map((declaration) => ({
          declaration,
          tokens: directLocalTokensInStructuredDeclaration(declaration, authority),
        }))
        .filter((entry) => entry.tokens.length > 0);

      return {
        selector,
        declarations,
        visual_declarations: visualDeclarations,
        token_declarations: tokenDeclarations,
      };
    })
    .filter(Boolean);
}

function expectedLocalAuthorityFamilies(evidence, authority) {
  const contractFamilies = toStringArray(authority.families);

  if (contractFamilies.length > 0) {
    return contractFamilies;
  }

  const evidenceFamilies = localAuthorityEvidenceValues(evidence, [
    "required_family",
    "requiredFamily",
    "expected_family",
    "expectedFamily",
    "local_family",
    "localFamily",
    "family_id",
    "familyId",
  ]);

  return authority.enforcement === "optional" ? evidenceFamilies : [];
}

function inheritedLocalAuthorityFamilies(evidence) {
  return localAuthorityEvidenceValues(evidence, [
    "inherited_families",
    "inheritedFamilies",
    "inherited_family",
    "inheritedFamily",
    "applied_families",
    "appliedFamilies",
    "applied_family",
    "appliedFamily",
  ]);
}

function familyTextVariants(family) {
  const text = optionalString(family);

  if (!text) {
    return [];
  }

  const withoutLeadingDot = text.replace(/^\./, "");

  const variants = text.startsWith(".")
    ? [text]
    : [
        text,
        withoutLeadingDot,
        text.replaceAll(".", " "),
        withoutLeadingDot.replaceAll(".", " "),
      ];

  return unique(variants).map((entry) => entry.toLowerCase());
}

function classSelectorTokenAppearsInSource(family, sourceText) {
  const text = optionalString(family);

  if (!text.startsWith(".")) {
    return false;
  }

  const className = text.slice(1);

  if (!className) {
    return false;
  }

  const classAttributePattern = new RegExp(
    `class(?:Name)?\\s*=\\s*(?:"[^"]*(?:^|\\s)${escapeRegExp(className)}(?:\\s|$)[^"]*"|'[^']*(?:^|\\s)${escapeRegExp(className)}(?:\\s|$)[^']*')`,
    "i",
  );

  return classAttributePattern.test(sourceText);
}

function localFamilyIsInherited(family, inheritedFamilies, sourceText) {
  const familyText = optionalString(family);
  const normalizedInherited = inheritedFamilies.map((entry) =>
    optionalString(entry).toLowerCase(),
  );
  const searchableSource = optionalString(sourceText).toLowerCase();
  const explicitEvidenceMatches = familyTextVariants(familyText).some((variant) =>
    normalizedInherited.includes(variant),
  );

  if (explicitEvidenceMatches) {
    return true;
  }

  if (familyText.startsWith(".")) {
    return classSelectorTokenAppearsInSource(familyText, sourceText);
  }

  return familyTextVariants(familyText).some(
    (variant) => variant && searchableSource.includes(variant),
  );
}

function computedStyleEvidenceIsPassing(evidence) {
  if (!evidenceHasAnyValue(evidence)) {
    return false;
  }

  if (evidenceHasExplicitFailure(evidence)) {
    return false;
  }

  return evidenceHasPositiveSignal(evidence);
}

function reviewLocalComponentAuthority(candidate, implementationContract) {
  const authority = normalizeLocalComponentAuthority(
    implementationContract.local_component_authority,
    DEFAULT_LOCAL_COMPONENT_AUTHORITY,
  );
  const evidence = candidateLocalComponentAuthorityEvidence(candidate);
  const computedStyleEvidence = evidenceValue(
    evidence,
    "computed_style_evidence",
    "computedStyleEvidence",
  );
  const sourceText = candidateImplementationSourceText(candidate);
  const cssRules = scanCssRules(sourceText);
  const active = localComponentAuthorityIsActive(authority);
  const componentRules = active
    ? cssRules.filter((rule) => selectorIsComponentSpecific(rule.selector, authority))
    : [];
  const structuredComponentSelectors = active
    ? structuredLocalComponentSelectorEvidence(evidence, authority)
    : [];
  const expectedFamilies = active
    ? expectedLocalAuthorityFamilies(evidence, authority)
    : [];
  const inheritedFamilies = inheritedLocalAuthorityFamilies(evidence);
  const missingInheritedFamilies = expectedFamilies.filter(
    (family) => !localFamilyIsInherited(family, inheritedFamilies, sourceText),
  );
  const computedStyleEvidencePassing =
    computedStyleEvidenceIsPassing(computedStyleEvidence);
  const visualIdentityRecreations = [];
  const directTokenUses = [];

  for (const rule of componentRules) {
    const visualDeclarations = rule.declarations.filter((declaration) =>
      declarationRecreatesVisualIdentity(declaration, authority),
    );
    const tokenDeclarations = rule.declarations
      .map((declaration) => ({
        declaration,
        tokens: directLocalTokensInDeclaration(declaration, authority),
      }))
      .filter((entry) => entry.tokens.length > 0);

    if (visualDeclarations.length > 0) {
      visualIdentityRecreations.push({
        selector: rule.selector,
        source: "parsed_css",
        declarations: visualDeclarations.map(
          (declaration) => `${declaration.property}: ${declaration.value}`,
        ),
      });
    }

    if (tokenDeclarations.length > 0) {
      directTokenUses.push({
        selector: rule.selector,
        source: "parsed_css",
        declarations: tokenDeclarations.map((entry) => ({
          property: entry.declaration.property,
          value: entry.declaration.value,
          custom_properties: entry.tokens,
        })),
      });
    }
  }

  for (const entry of structuredComponentSelectors) {
    if (entry.visual_declarations.length > 0) {
      visualIdentityRecreations.push({
        selector: entry.selector,
        source:
          "local_component_authority_evidence.component_specific_selectors",
        declarations: entry.visual_declarations.map(localAuthorityDeclarationText),
      });
    }

    if (entry.token_declarations.length > 0) {
      directTokenUses.push({
        selector: entry.selector,
        source:
          "local_component_authority_evidence.component_specific_selectors",
        declarations: entry.token_declarations.map((tokenDeclaration) => ({
          property: tokenDeclaration.declaration.property,
          value: tokenDeclaration.declaration.value,
          custom_properties: tokenDeclaration.tokens,
        })),
      });
    }
  }

  const findings = [];

  if (
    active &&
    authority.enforcement === "required" &&
    expectedFamilies.length > 0 &&
    missingInheritedFamilies.length === expectedFamilies.length
  ) {
    findings.push({
      severity: "fail",
      check: "local_component_authority",
      message:
        "Candidate does not show that the target control inherits the required local component family.",
      evidence: {
        expected_families: expectedFamilies,
        inherited_families: inheritedFamilies,
        evidence_field: "local_component_authority_evidence.inherited_families",
      },
    });
  }

  if (
    active &&
    authority.enforcement === "required" &&
    !computedStyleEvidencePassing
  ) {
    findings.push({
      severity: "fail",
      check: "local_component_authority",
      message:
        "Required local component authority needs passing computed-style evidence against a representative local primitive.",
      evidence: {
        expected: authority.computed_style_evidence,
        evidence_field: "local_component_authority_evidence.computed_style_evidence",
        supplied_status: evidenceDeclaredStatus(computedStyleEvidence),
      },
    });
  }

  if (active && visualIdentityRecreations.length > 0) {
    findings.push({
      severity: "fail",
      check: "local_component_authority",
      message:
        "Component-specific selectors recreate visual identity outside local component authority.",
      evidence: {
        selectors: visualIdentityRecreations,
        selector_boundary: authority.selector_boundary,
      },
    });
  }

  if (active && directTokenUses.length > 0) {
    findings.push({
      severity: "fail",
      check: "local_component_authority",
      message:
        "Component-specific selectors use direct JudgmentKit tokens instead of repo-local component authority.",
      evidence: {
        selectors: directTokenUses,
        token_boundary: authority.token_boundary,
      },
    });
  }

  return {
    status: findings.length > 0 ? "fail" : "pass",
    reviewed: active || evidenceHasAnyValue(evidence) || cssRules.length > 0,
    mode: authority.mode,
    enforcement: authority.enforcement,
    families: authority.families,
    expected_families: expectedFamilies,
    inherited_families: inheritedFamilies,
    missing_inherited_families: missingInheritedFamilies,
    selector_boundary: authority.selector_boundary,
    token_boundary: authority.token_boundary,
    computed_style_evidence_expected: authority.computed_style_evidence,
    computed_style_evidence_present: evidenceHasAnyValue(computedStyleEvidence),
    computed_style_evidence_passing: computedStyleEvidencePassing,
    scanned_rules: cssRules.length,
    component_specific_selectors: unique(
      [
        ...componentRules.map((rule) => rule.selector),
        ...structuredComponentSelectors.map((entry) => entry.selector),
      ],
    ),
    structured_component_specific_selectors: unique(
      structuredComponentSelectors.map((entry) => entry.selector),
    ),
    visual_identity_recreations: visualIdentityRecreations,
    direct_token_uses: directTokenUses,
    findings,
  };
}

function candidateComponentContractEvidence(candidate) {
  if (!isPlainObject(candidate)) {
    return null;
  }

  return (
    candidate.component_contract_evidence ??
    candidate.componentContractEvidence ??
    candidate.component_contracts_evidence ??
    candidate.componentContractsEvidence ??
    candidate.component_evidence ??
    candidate.componentEvidence ??
    null
  );
}

function candidatePatternContractEvidence(candidate) {
  if (!isPlainObject(candidate)) {
    return null;
  }

  return (
    candidate.pattern_contract_evidence ??
    candidate.patternContractEvidence ??
    candidate.pattern_contracts_evidence ??
    candidate.patternContractsEvidence ??
    candidate.pattern_evidence ??
    candidate.patternEvidence ??
    null
  );
}

function collectIdsFromEvidenceValue(value, idKeys) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectIdsFromEvidenceValue(entry, idKeys));
  }

  if (typeof value === "string") {
    return [cleanClause(value)];
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const directId = idKeys
    .map((key) => optionalString(value[key]))
    .find(Boolean);

  if (directId) {
    return [directId];
  }

  return idKeys.flatMap((key) => collectIdsFromEvidenceValue(value[key], idKeys));
}

function collectEvidenceValuesByKeys(evidence, keyNames) {
  if (!isPlainObject(evidence)) {
    return [];
  }

  const wanted = new Set(keyNames);
  const values = [];

  function visit(value) {
    if (!isPlainObject(value)) {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (wanted.has(key)) {
        values.push(...collectStrings(child));
      }

      if (isPlainObject(child)) {
        visit(child);
      }
    }
  }

  visit(evidence);

  return unique(values.map(cleanClause).filter(Boolean));
}

function normalizeEvidenceStateMap(evidence) {
  if (!isPlainObject(evidence)) {
    return new Map();
  }

  const source =
    evidence.states_by_component ??
    evidence.statesByComponent ??
    evidence.component_states ??
    evidence.componentStates ??
    evidence.states_covered_by_component ??
    evidence.statesCoveredByComponent;
  const entries = [];

  if (isPlainObject(source)) {
    for (const [id, states] of Object.entries(source)) {
      entries.push([id, toStringArray(states)]);
    }
  }

  for (const key of [
    "components",
    "component_contracts",
    "componentContracts",
    "component_evidence",
    "componentEvidence",
  ]) {
    const value = evidence[key];

    if (!Array.isArray(value)) {
      continue;
    }

    for (const entry of value) {
      if (!isPlainObject(entry)) {
        continue;
      }

      const id = optionalString(
        entry.id ?? entry.component_id ?? entry.componentId,
      );

      if (!id) {
        continue;
      }

      entries.push([
        id,
        toStringArray(
          entry.states_covered ??
            entry.statesCovered ??
            entry.states ??
            entry.required_states_covered ??
            entry.requiredStatesCovered,
        ),
      ]);
    }
  }

  return new Map(
    entries
      .filter(([, states]) => states.length > 0)
      .map(([id, states]) => [normalizeText(id), unique(states)]),
  );
}

function missingValues(requiredValues, suppliedValues) {
  const suppliedSet = new Set(suppliedValues.map((value) => normalizeText(value)));
  return requiredValues.filter((value) => !suppliedSet.has(normalizeText(value)));
}

function reviewComponentContractEvidence(candidate, implementationContract) {
  const system = normalizeDefaultAiNativeDesignSystem(
    implementationContract.default_ai_native_design_system,
    DEFAULT_AI_NATIVE_DESIGN_SYSTEM,
  );
  const contracts = normalizeComponentContracts(system.component_contracts);
  const evidence = candidateComponentContractEvidence(candidate);
  const evidenceText = evidenceToText(evidence).toLowerCase();
  const reviewed = evidenceHasAnyValue(evidence);
  const contractById = new Map(
    contracts.map((contract) => [normalizeText(contract.id), contract]),
  );
  const componentIds = unique([
    ...normalizeCandidateList(evidence, [
      "component_ids",
      "componentIds",
      "components_used",
      "componentsUsed",
      "used_components",
      "usedComponents",
    ]),
    ...collectIdsFromEvidenceValue(evidence?.components, [
      "id",
      "component_id",
      "componentId",
    ]),
    ...collectIdsFromEvidenceValue(evidence?.component_contracts, [
      "id",
      "component_id",
      "componentId",
    ]),
    ...collectIdsFromEvidenceValue(evidence?.componentContracts, [
      "id",
      "component_id",
      "componentId",
    ]),
  ]);
  const stateMap = normalizeEvidenceStateMap(evidence);
  const unsupportedComponentIds = componentIds.filter(
    (id) => !contractById.has(normalizeText(id)),
  );
  const substitutesGateEvidence =
    /(component|component contract|design-system component|design system component).{0,80}(satisf|pass|replace|substitute|instead).{0,80}(accessibility|state|browser qa|activity|workflow|disclosure|implementation gate)/i.test(
      evidenceText,
    );
  const missingStateEvidence = [];
  const findings = [];

  for (const id of componentIds) {
    const contractEntry = contractById.get(normalizeText(id));

    if (!contractEntry) {
      continue;
    }

    const coveredStates = stateMap.get(normalizeText(id)) ?? [];
    const missingStates = missingValues(
      contractEntry.required_states ?? [],
      coveredStates,
    );

    if (missingStates.length > 0) {
      missingStateEvidence.push({
        component_id: id,
        missing_states: missingStates,
        required_states: contractEntry.required_states ?? [],
      });
    }
  }

  if (unsupportedComponentIds.length > 0) {
    findings.push({
      severity: "fail",
      check: "component_contracts",
      message:
        "Candidate component evidence uses component ids outside the design-system contract.",
      evidence: {
        unsupported_component_ids: unsupportedComponentIds,
        allowed_component_ids: contracts.map((contract) => contract.id),
      },
    });
  }

  if (missingStateEvidence.length > 0) {
    findings.push({
      severity: "fail",
      check: "component_contracts",
      message:
        "Candidate component evidence is missing required state coverage for used components.",
      evidence: missingStateEvidence,
    });
  }

  if (substitutesGateEvidence) {
    findings.push({
      severity: "fail",
      check: "component_contracts",
      message:
        "Candidate component evidence is being used as a substitute for required implementation gate evidence.",
      evidence: {
        rule: "component contracts cannot replace activity, workflow, disclosure, state, accessibility, static, or browser-QA evidence",
      },
    });
  }

  return {
    status: findings.length > 0 ? "fail" : "pass",
    reviewed,
    allowed_component_ids: contracts.map((contract) => contract.id),
    used_component_ids: componentIds,
    unsupported_component_ids: unsupportedComponentIds,
    missing_state_evidence: missingStateEvidence,
    findings,
  };
}

function reviewPatternContractEvidence(
  candidate,
  implementationContract,
  { selectedSurfaceType: selectedSurfaceTypeOverride } = {},
) {
  const system = normalizeDefaultAiNativeDesignSystem(
    implementationContract.default_ai_native_design_system,
    DEFAULT_AI_NATIVE_DESIGN_SYSTEM,
  );
  const contracts = normalizePatternContracts(system.pattern_contracts);
  const evidence = candidatePatternContractEvidence(candidate);
  const evidenceText = evidenceToText(evidence).toLowerCase();
  const contractById = new Map(
    contracts.map((contract) => [normalizeText(contract.id), contract]),
  );
  const topLevelPatternId = optionalString(
    candidate?.pattern_id ?? candidate?.patternId,
  );
  const patternId = optionalString(
    evidence?.pattern_id ??
      evidence?.patternId ??
      evidence?.id ??
      topLevelPatternId,
  );
  const topLevelSurfaceType = optionalString(
    candidate?.surface_type ?? candidate?.surfaceType,
  );
  const selectedSurfaceType = optionalString(
    selectedSurfaceTypeOverride ??
      evidence?.surface_type ??
      evidence?.surfaceType ??
      topLevelSurfaceType,
  );
  const reviewed = evidenceHasAnyValue(evidence) || Boolean(topLevelPatternId);
  const pattern = contractById.get(normalizeText(patternId));
  const regionsPresent = unique([
    ...normalizeCandidateList(evidence, [
      "regions_present",
      "regionsPresent",
      "required_regions_present",
      "requiredRegionsPresent",
    ]),
    ...collectEvidenceValuesByKeys(evidence, [
      "regions_present",
      "regionsPresent",
      "regions",
      "sections",
      "required_regions_present",
      "requiredRegionsPresent",
    ]),
  ]);
  const controlsPresent = unique([
    ...normalizeCandidateList(evidence, [
      "controls_present",
      "controlsPresent",
      "expected_controls_present",
      "expectedControlsPresent",
    ]),
    ...collectEvidenceValuesByKeys(evidence, [
      "controls_present",
      "controlsPresent",
      "controls",
      "expected_controls_present",
      "expectedControlsPresent",
    ]),
  ]);
  const missingRegions = pattern
    ? missingValues(pattern.required_regions ?? [], regionsPresent)
    : [];
  const missingControls = pattern
    ? missingValues(pattern.expected_controls ?? [], controlsPresent)
    : [];
  const surfaceMismatch =
    pattern &&
    selectedSurfaceType &&
    normalizeText(selectedSurfaceType) !== normalizeText(pattern.surface_type);
  const substitutesGateEvidence =
    /(pattern|surface pattern|pattern contract).{0,80}(satisf|pass|replace|substitute|instead).{0,80}(accessibility|state|browser qa|activity|workflow|disclosure|implementation gate)/i.test(
      evidenceText,
    );
  const findings = [];

  if (reviewed && !pattern) {
    findings.push({
      severity: "fail",
      check: "pattern_contracts",
      message:
        "Candidate pattern evidence uses a pattern id outside the design-system contract.",
      evidence: {
        selected_pattern_id: patternId,
        allowed_pattern_ids: contracts.map((contract) => contract.id),
      },
    });
  }

  if (surfaceMismatch) {
    findings.push({
      severity: "fail",
      check: "pattern_contracts",
      message:
        "Candidate pattern evidence does not match the selected surface type.",
      evidence: {
        selected_pattern_id: patternId,
        selected_surface_type: selectedSurfaceType,
        required_surface_type: pattern.surface_type,
      },
    });
  }

  if (missingRegions.length > 0) {
    findings.push({
      severity: "fail",
      check: "pattern_contracts",
      message:
        "Candidate pattern evidence is missing required regions for the selected surface pattern.",
      evidence: {
        selected_pattern_id: patternId,
        missing_regions: missingRegions,
        required_regions: pattern.required_regions ?? [],
      },
    });
  }

  if (missingControls.length > 0) {
    findings.push({
      severity: "fail",
      check: "pattern_contracts",
      message:
        "Candidate pattern evidence is missing expected controls for the selected surface pattern.",
      evidence: {
        selected_pattern_id: patternId,
        missing_controls: missingControls,
        expected_controls: pattern.expected_controls ?? [],
      },
    });
  }

  if (substitutesGateEvidence) {
    findings.push({
      severity: "fail",
      check: "pattern_contracts",
      message:
        "Candidate pattern evidence is being used as a substitute for required implementation gate evidence.",
      evidence: {
        rule: "pattern contracts cannot replace activity, workflow, disclosure, state, accessibility, static, or browser-QA evidence",
      },
    });
  }

  return {
    status: findings.length > 0 ? "fail" : "pass",
    reviewed,
    allowed_pattern_ids: contracts.map((contract) => contract.id),
    selected_pattern_id: patternId,
    selected_surface_type: selectedSurfaceType,
    required_surface_type: pattern?.surface_type ?? "",
    regions_present: regionsPresent,
    controls_present: controlsPresent,
    missing_regions: missingRegions,
    missing_controls: missingControls,
    findings,
  };
}

function contractIds(sourceContracts) {
  return normalizePrimitiveList(
    sourceContracts.map((contract) => contract.id),
  );
}

function contractIdsEqual(leftContracts, rightContracts) {
  const leftIds = contractIds(leftContracts);
  const rightIds = contractIds(rightContracts);

  return (
    leftIds.length === rightIds.length &&
    leftIds.every((id, index) => id === rightIds[index])
  );
}

function componentContractSourcePath(designSystemSource) {
  const sourcePath =
    optionalString(designSystemSource.component_contract_source) ||
    DEFAULT_DESIGN_SYSTEM_SOURCE.component_contract_source;

  if (
    designSystemSource.definition_point ===
      "frontend_skill_context.design_system_adapter_compat" &&
    sourcePath.startsWith("implementation_contract.design_system_adapter")
  ) {
    return sourcePath.replace(
      "implementation_contract.design_system_adapter",
      "frontend_skill_context.design_system_adapter_compat",
    );
  }

  return sourcePath;
}

function patternContractSourcePath(designSystemSource, patternContracts) {
  const defaultSourcePath =
    "implementation_contract.default_ai_native_design_system.pattern_contracts";
  const usesDefaultPatternContracts = contractIdsEqual(
    patternContracts,
    DEFAULT_PATTERN_CONTRACTS,
  );

  if (usesDefaultPatternContracts) {
    return defaultSourcePath;
  }

  if (
    designSystemSource.definition_point ===
    "frontend_skill_context.design_system_adapter_compat"
  ) {
    return "frontend_skill_context.design_system_adapter_compat.pattern_contracts";
  }

  if (designSystemSource.mode === "external_design_system") {
    return "implementation_contract.design_system_adapter.pattern_contracts";
  }

  return defaultSourcePath;
}

function selectedPatternContractForSurface(patternContracts, selectedSurfaceType) {
  const normalizedSurfaceType = normalizeText(optionalString(selectedSurfaceType));

  if (!normalizedSurfaceType) {
    return null;
  }

  return (
    patternContracts.find(
      (contract) => normalizeText(contract.surface_type) === normalizedSurfaceType,
    ) ?? null
  );
}

function reviewEvidenceFieldMapping(
  implementationContract = {},
  designSystemContractInput,
  {
    designSystemSource: designSystemSourceOverride,
    visualTokenAdapter: visualTokenAdapterOverride,
    selectedSurfaceType,
  } = {},
) {
  const sourceContract = isPlainObject(implementationContract)
    ? implementationContract
    : {};
  const visualTokenAdapter = normalizeVisualTokenAdapter(
    visualTokenAdapterOverride ?? sourceContract.visual_token_adapter,
    DEFAULT_VISUAL_TOKEN_ADAPTER,
  );
  const designSystemContract = normalizeDefaultAiNativeDesignSystem(
    designSystemContractInput ?? sourceContract.default_ai_native_design_system,
    DEFAULT_AI_NATIVE_DESIGN_SYSTEM,
  );
  const componentContracts = normalizeComponentContracts(
    designSystemContract.component_contracts,
  );
  const patternContracts = normalizePatternContracts(
    designSystemContract.pattern_contracts,
  );
  const designSystemSource = normalizeDesignSystemSource(
    designSystemSourceOverride ?? sourceContract.design_system_source,
    {
      visualTokenAdapter,
      componentContracts,
    },
  );
  const localComponentAuthority = normalizeLocalComponentAuthority(
    sourceContract.local_component_authority,
    DEFAULT_LOCAL_COMPONENT_AUTHORITY,
  );
  const componentSourcePath = componentContractSourcePath(designSystemSource);
  const patternSourcePath = patternContractSourcePath(
    designSystemSource,
    patternContracts,
  );
  const selectedPatternContract = selectedPatternContractForSurface(
    patternContracts,
    selectedSurfaceType,
  );

  return {
    purpose:
      "Route implementation-review evidence to the field reviewed by review_ui_implementation_candidate without weakening approved primitive validation.",
    strict_boundary:
      "primitives_used may contain only implementation_contract.approved_primitives. Design-system component ids, pattern ids, token/font/icon proof, renderer proof, imports, and package provenance are not approved primitives.",
    route_summary: [
      "implementation_contract.approved_primitives -> primitives_used",
      "design-system component contract ids -> component_contract_evidence.components[].id with component_contract_evidence.components[].states_covered",
      "design-system pattern contract ids -> pattern_contract_evidence.pattern_id",
      "token family, font role, icon role, and catalog icon-id boundary proof -> visual_token_evidence",
      "visual-token, typography, icon asset, renderer component, import, package, and source-export proof -> design_system_provenance",
      "repo-local component selector and computed-style proof -> local_component_authority_evidence",
    ],
    primitives_used: {
      field: "primitives_used",
      reviewed_by: "checks.approved_primitives",
      source_path: "implementation_contract.approved_primitives",
      accepts: "Only ids from implementation_contract.approved_primitives.",
      allowed_values: toStringArray(sourceContract.approved_primitives),
      rejects:
        "Design-system component contract ids and pattern contract ids still fail when listed as primitives.",
    },
    component_contract_evidence: {
      field: "component_contract_evidence",
      id_field: "component_contract_evidence.components[].id",
      state_field: "component_contract_evidence.components[].states_covered",
      reviewed_by: "checks.component_contracts",
      source_path:
        componentSourcePath,
      accepts:
        "Design-system component contract ids with state coverage for each used component.",
      allowed_component_ids: componentContracts.map((contract) => contract.id),
      required_state_source:
        `${componentSourcePath}[].required_states`,
    },
    pattern_contract_evidence: {
      field: "pattern_contract_evidence",
      id_field: "pattern_contract_evidence.pattern_id",
      reviewed_by: "checks.pattern_contracts",
      source_path: patternSourcePath,
      accepts:
        "One design-system pattern contract id, plus surface type, required regions, expected controls, and handoff evidence.",
      allowed_pattern_ids: patternContracts.map((contract) => contract.id),
      selected_pattern_contract: selectedPatternContract
        ? {
            id: selectedPatternContract.id,
            surface_type: selectedPatternContract.surface_type,
            required_regions: selectedPatternContract.required_regions ?? [],
            expected_controls: selectedPatternContract.expected_controls ?? [],
            completion_or_handoff:
              selectedPatternContract.completion_or_handoff ?? "",
          }
        : null,
      selected_pattern_evidence_template: selectedPatternContract
        ? {
            pattern_id: selectedPatternContract.id,
            surface_type: selectedPatternContract.surface_type,
            regions_present: selectedPatternContract.required_regions ?? [],
            controls_present: selectedPatternContract.expected_controls ?? [],
            completion_or_handoff:
              selectedPatternContract.completion_or_handoff ?? "",
          }
        : null,
      required_region_source:
        `${patternSourcePath}[].required_regions`,
      expected_control_source:
        `${patternSourcePath}[].expected_controls`,
    },
    visual_token_evidence: {
      field: "visual_token_evidence",
      reviewed_by: "checks.visual_tokens",
      source_path: "implementation_contract.visual_token_adapter",
      accepts:
        "Boundary proof for token families, token roles, font roles, icon roles, and catalog icon ids from implementation_contract.visual_token_adapter.",
      allowed_token_families: normalizePrimitiveList(
        visualTokenAdapter.token_families,
        DEFAULT_VISUAL_TOKEN_ADAPTER.token_families,
      ),
      allowed_font_roles: normalizeRoleEntries(
        visualTokenAdapter.font_roles,
        DEFAULT_VISUAL_TOKEN_ADAPTER.font_roles,
      ).map((entry) => entry.role),
      allowed_icon_roles: normalizePrimitiveList(
        visualTokenAdapter.icon_roles,
        DEFAULT_VISUAL_TOKEN_ADAPTER.icon_roles,
      ),
      icon_catalog: normalizeIconCatalog(
        visualTokenAdapter.icon_catalog,
        DEFAULT_VISUAL_TOKEN_ADAPTER.icon_catalog,
      ),
      not_for:
        "Do not use visual_token_evidence as proof of approved primitives, component ids, pattern ids, imports, packages, renderer authority, static checks, browser QA, or accessibility.",
    },
    design_system_provenance: {
      field: "design_system_provenance",
      reviewed_by: "checks.design_system_provenance",
      source_path: "implementation_contract.design_system_source",
      accepts:
        "Source proof for visual tokens, typography, icon assets, renderer components, imports, packages, token prefixes, and design-system source exports.",
      active_source: {
        mode: designSystemSource.mode,
        name: designSystemSource.name,
        package: designSystemSource.package,
        definition_point: designSystemSource.definition_point,
        token_prefixes: designSystemSource.token_prefixes,
        renderer_components: designSystemSource.renderer_components,
        required_authorities: designSystemSource.required_authorities,
      },
      source_export_fields: Object.keys(designSystemSource.source_exports ?? {}),
    },
    local_component_authority_evidence: {
      field: "local_component_authority_evidence",
      reviewed_by: "checks.local_component_authority",
      source_path: "implementation_contract.local_component_authority",
      accepts:
        "Repo-local component family, selector-boundary, token-boundary, and computed-style evidence when local component authority is active.",
      active_authority: {
        mode: localComponentAuthority.mode,
        enforcement: localComponentAuthority.enforcement,
        families: localComponentAuthority.families,
      },
      selector_boundary: localComponentAuthority.selector_boundary,
      token_boundary: localComponentAuthority.token_boundary,
      computed_style_evidence_expected:
        localComponentAuthority.computed_style_evidence,
      not_for:
        "Do not use local_component_authority_evidence as component contract evidence, approved primitive evidence, accessibility evidence, static evidence, or browser QA evidence.",
    },
  };
}

function primitiveRoutingDiagnostics(inventedPrimitives, implementationContract) {
  const system = normalizeDefaultAiNativeDesignSystem(
    implementationContract.default_ai_native_design_system,
    DEFAULT_AI_NATIVE_DESIGN_SYSTEM,
  );
  const componentById = new Map(
    normalizeComponentContracts(system.component_contracts).map((contract) => [
      normalizeText(contract.id),
      contract.id,
    ]),
  );
  const patternById = new Map(
    normalizePatternContracts(system.pattern_contracts).map((contract) => [
      normalizeText(contract.id),
      contract.id,
    ]),
  );
  const componentContractIds = unique(
    inventedPrimitives
      .filter((primitive) => componentById.has(normalizeText(primitive)))
      .map((primitive) => componentById.get(normalizeText(primitive))),
  );
  const patternContractIds = unique(
    inventedPrimitives
      .filter((primitive) => patternById.has(normalizeText(primitive)))
      .map((primitive) => patternById.get(normalizeText(primitive))),
  );
  const componentSet = new Set(componentContractIds.map(normalizeText));
  const patternSet = new Set(patternContractIds.map(normalizeText));

  return {
    invalid_primitives: inventedPrimitives,
    known_component_contract_ids: componentContractIds,
    known_pattern_contract_ids: patternContractIds,
    other_invented_primitives: inventedPrimitives.filter((primitive) => {
      const normalized = normalizeText(primitive);
      return !componentSet.has(normalized) && !patternSet.has(normalized);
    }),
  };
}

function buildImplementationCandidateChecks(
  candidate,
  implementationContract,
  { selectedSurfaceType } = {},
) {
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
  const primitiveRouting = primitiveRoutingDiagnostics(
    inventedPrimitives,
    implementationContract,
  );
  const statesCovered = normalizeCandidateList(candidate, [
    "states_covered",
    "covered_states",
    "states_verified",
    "state_coverage",
  ]);
  const requiredStates = implementationContract.state_coverage.required_states;
  const missingStates = requiredStates.filter((state) => !statesCovered.includes(state));
  const staticChecks = normalizeCandidateList(candidate, [
    "static_checks",
    "static_evidence",
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
  const actionBoundaries = reviewActionBoundaries(candidate, implementationContract);
  const dataVisibility = reviewDataVisibility(candidate, implementationContract);
  const accessibilityEvidence = reviewAccessibilityEvidence(
    candidate,
    implementationContract,
    text,
  );
  const visualTokenEvidence = reviewVisualTokenEvidence(
    candidate,
    implementationContract,
  );
  const designSystemProvenance = reviewDesignSystemProvenance(
    candidate,
    implementationContract,
    text,
  );
  const localComponentAuthority = reviewLocalComponentAuthority(
    candidate,
    implementationContract,
  );
  const componentContracts = reviewComponentContractEvidence(
    candidate,
    implementationContract,
  );
  const patternContracts = reviewPatternContractEvidence(
    candidate,
    implementationContract,
    { selectedSurfaceType },
  );
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
      message:
        primitiveRouting.known_component_contract_ids.length > 0 ||
        primitiveRouting.known_pattern_contract_ids.length > 0
          ? "Candidate lists design-system component or pattern contract ids as approved primitives. They remain invalid in primitives_used and must move to their review evidence fields."
          : "Candidate uses primitives that are not in the implementation contract.",
      evidence: inventedPrimitives,
      routing_diagnostics: {
        ...primitiveRouting,
        allowed_approved_primitives: implementationContract.approved_primitives,
        evidence_field_routing: {
          primitives_used:
            "Only implementation_contract.approved_primitives belong here.",
          component_contract_ids:
            "Move design-system component ids to component_contract_evidence.components[].id and provide component_contract_evidence.components[].states_covered.",
          pattern_contract_ids:
            "Move design-system pattern ids to pattern_contract_evidence.pattern_id.",
        },
      },
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

  findings.push(...accessibilityEvidence.findings);
  findings.push(...actionBoundaries.findings);
  findings.push(...dataVisibility.findings);
  findings.push(...visualTokenEvidence.findings);
  findings.push(...designSystemProvenance.findings);
  findings.push(...localComponentAuthority.findings);
  findings.push(...componentContracts.findings);
  findings.push(...patternContracts.findings);

  return {
    raw_controls: {
      status: rawControls.length === 0 ? "pass" : "fail",
      detected: rawControls,
    },
    approved_primitives: {
      status: inventedPrimitives.length === 0 ? "pass" : "fail",
      used: primitivesUsed,
      invented: inventedPrimitives,
      known_component_contract_ids:
        primitiveRouting.known_component_contract_ids,
      known_component_ids: primitiveRouting.known_component_contract_ids,
      known_component_ids_in_primitives_used:
        primitiveRouting.known_component_contract_ids,
      known_component_contract_ids_in_primitives_used:
        primitiveRouting.known_component_contract_ids,
      component_contract_ids_in_primitives_used:
        primitiveRouting.known_component_contract_ids,
      component_ids_in_primitives_used:
        primitiveRouting.known_component_contract_ids,
      known_pattern_contract_ids: primitiveRouting.known_pattern_contract_ids,
      known_pattern_ids: primitiveRouting.known_pattern_contract_ids,
      known_pattern_ids_in_primitives_used:
        primitiveRouting.known_pattern_contract_ids,
      known_pattern_contract_ids_in_primitives_used:
        primitiveRouting.known_pattern_contract_ids,
      pattern_contract_ids_in_primitives_used:
        primitiveRouting.known_pattern_contract_ids,
      pattern_ids_in_primitives_used: primitiveRouting.known_pattern_contract_ids,
      other_invented_primitives: primitiveRouting.other_invented_primitives,
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
    action_boundaries: actionBoundaries,
    data_visibility: dataVisibility,
    accessibility_evidence: accessibilityEvidence,
    visual_tokens: visualTokenEvidence,
    design_system_provenance: designSystemProvenance,
    local_component_authority: localComponentAuthority,
    component_contracts: componentContracts,
    pattern_contracts: patternContracts,
    findings,
  };
}

function normalizeIterationContext(iterationContext, iterationPolicy) {
  const source = isPlainObject(iterationContext) ? iterationContext : {};
  const maxAttempts = Math.max(
    1,
    numberOrFallback(
      source.max_attempts ?? source.maxAttempts,
      iterationPolicy.default_max_attempts,
    ),
  );
  const currentAttempt = Math.max(
    1,
    numberOrFallback(
      source.current_attempt ??
        source.currentAttempt ??
        source.attempt ??
        source.attempt_number,
      1,
    ),
  );

  return {
    current_attempt: currentAttempt,
    max_attempts: maxAttempts,
    previous_findings: Array.isArray(source.previous_findings)
      ? source.previous_findings
      : Array.isArray(source.previousFindings)
        ? source.previousFindings
        : [],
  };
}

function findingContractArea(check) {
  if (["raw_controls", "approved_primitives"].includes(check)) {
    return "primitive_defaults";
  }

  if (check === "state_coverage") {
    return "state_rules";
  }

  if (check === "action_boundaries" || check === "modal_actions") {
    return "action_boundaries";
  }

  if (check === "data_visibility") {
    return "data_visibility";
  }

  if (String(check).startsWith("accessibility_evidence")) {
    return "accessibility";
  }

  if (check === "visual_tokens") {
    return "visual_tokens";
  }

  if (check === "design_system_provenance") {
    return "design_system_source";
  }

  if (check === "local_component_authority") {
    return "local_component_authority";
  }

  if (check === "component_contracts") {
    return "component_contracts";
  }

  if (check === "pattern_contracts") {
    return "pattern_contracts";
  }

  return "evidence_gates";
}

function repairInstructionForFinding(finding, implementationContract) {
  const check = optionalString(finding.check);

  if (check === "raw_controls") {
    return "Replace raw form controls with approved primitives or repo-local helpers before resubmitting.";
  }

  if (check === "approved_primitives") {
    const evidence = isPlainObject(finding.routing_diagnostics)
      ? finding.routing_diagnostics
      : isPlainObject(finding.evidence)
        ? finding.evidence
        : {};
    const misroutedComponentIds = toStringArray(
      evidence.known_component_contract_ids,
    );
    const misroutedPatternIds = toStringArray(
      evidence.known_pattern_contract_ids,
    );
    const reroutes = [
      misroutedComponentIds.length > 0
        ? `Move design-system component ids (${misroutedComponentIds.join(", ")}) to component_contract_evidence.components[].id with component_contract_evidence.components[].states_covered`
        : "",
      misroutedPatternIds.length > 0
        ? `Move pattern ids (${misroutedPatternIds.join(", ")}) to pattern_contract_evidence.pattern_id`
        : "",
    ].filter(Boolean);
    const routeInstruction =
      reroutes.length > 0 ? ` ${reroutes.join("; ")}.` : "";

    return `Use only approved primitives in primitives_used: ${implementationContract.approved_primitives.join(", ")}.${routeInstruction}`;
  }

  if (check === "state_coverage") {
    return `Cover required states: ${implementationContract.state_coverage.required_states.join(", ")}.`;
  }

  if (check === "static_enforcement") {
    return "Add local static check evidence or an equivalent inspection command.";
  }

  if (check === "browser_qa") {
    return "Add desktop and mobile browser QA evidence before resubmitting.";
  }

  if (check === "modal_actions") {
    return "Put cancel or dismiss before the primary completion action and make the primary action visually final.";
  }

  if (check === "action_boundaries") {
    return "Add explicit approval-boundary evidence for risky actions, or remove unauthorized actions.";
  }

  if (check === "data_visibility") {
    return "Move diagnostic-only terms out of product UI text unless the activity is setup, debugging, auditing, integration, or explicit source inspection.";
  }

  if (check.startsWith("accessibility_evidence")) {
    return "Provide passing accessibility evidence for the failed accessibility contract.";
  }

  if (check === "visual_tokens") {
    return "Keep visual token evidence boundary-only: use supported token families, avoid renderer/component/catalog/compiler work, and do not use tokens as a substitute for required implementation gates.";
  }

  if (check === "design_system_provenance") {
    return "Use implementation_contract.design_system_source as the source for visual tokens, typography, icon assets, and renderer components; remove local visual token namespaces, remote font/icon sources, and direct packages outside the active source.";
  }

  if (check === "local_component_authority") {
    const evidence = isPlainObject(finding.evidence) ? finding.evidence : {};
    const expectedFamilies = toStringArray(evidence.expected_families);
    const selectorBoundary = isPlainObject(evidence.selector_boundary)
      ? evidence.selector_boundary
      : {};
    const tokenBoundary = isPlainObject(evidence.token_boundary)
      ? evidence.token_boundary
      : {};
    const familyText =
      expectedFamilies.length > 0
        ? ` inherit ${expectedFamilies.join(", ")};`
        : "";
    const selectorText = toStringArray(
      selectorBoundary.component_selector_examples,
    ).length
      ? ` known local selectors include ${toStringArray(selectorBoundary.component_selector_examples).join(", ")};`
      : "";
    const tokenPrefixes = toStringArray(tokenBoundary.direct_token_prefixes);
    const tokenText =
      tokenPrefixes.length > 0
        ? ` remove direct ${tokenPrefixes.join(", ")} token use from one-off selectors;`
        : " remove direct JudgmentKit token use from one-off selectors;";

    return `Use the existing local component family for the target control;${familyText}${selectorText}${tokenText} keep component-specific selectors layout/overflow only, and put computed-style proof in local_component_authority_evidence.`;
  }

  if (check === "component_contracts") {
    return "Use only known design-system component contract ids and provide required state evidence for each used component.";
  }

  if (check === "pattern_contracts") {
    return "Select the pattern that matches the chosen surface type and provide evidence for required regions and expected controls.";
  }

  return "Repair the failed implementation contract evidence before resubmitting.";
}

function buildRepairInstructions(findings, implementationContract) {
  const groups = {};

  for (const finding of findings) {
    const area = findingContractArea(finding.check);

    if (!groups[area]) {
      groups[area] = [];
    }

    groups[area].push({
      check: finding.check,
      issue: finding.message,
      required_change: repairInstructionForFinding(finding, implementationContract),
      evidence: finding.evidence,
    });
  }

  return {
    status: findings.length > 0 ? "repair_required" : "none",
    groups,
  };
}

function buildAutofixLoop(failed, iterationContext, iterationPolicy) {
  const currentAttempt = iterationContext.current_attempt;
  const maxAttempts = iterationContext.max_attempts;
  const remainingAttempts = Math.max(0, maxAttempts - currentAttempt);
  const stopForHuman = failed && currentAttempt >= maxAttempts;

  return {
    owner: iterationPolicy.owner,
    status: failed ? (stopForHuman ? "stopped" : "repairable") : "passed",
    current_attempt: currentAttempt,
    max_attempts: maxAttempts,
    remaining_attempts: failed ? remainingAttempts : maxAttempts - currentAttempt,
    loop: iterationPolicy.loop,
    judgmentkit_role: iterationPolicy.judgmentkit_role,
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
  const selectedSurfaceType =
    selectedSurfaceTypeFromImplementationReviewOptions(options);
  const checks = buildImplementationCandidateChecks(
    candidate,
    implementationContract,
    { selectedSurfaceType },
  );
  const failed = checks.findings.some((finding) => finding.severity === "fail");
  const iterationPolicy = implementationContract.iteration_policy;
  const iterationContext = normalizeIterationContext(
    options.iteration_context ?? options.iterationContext,
    iterationPolicy,
  );
  const autofixLoop = buildAutofixLoop(failed, iterationContext, iterationPolicy);
  const nextAgentAction = failed
    ? autofixLoop.status === "stopped"
      ? "stop_for_human"
      : "repair_and_resubmit"
    : "accept";
  const packet = {
    version: contract.version,
    contract_id: contract.id,
    workflow_id: getContractWorkflowId(contract),
    implementation_review_status: failed ? "failed" : "passed",
    implementation_contract_id: implementationContract.id,
    next_agent_action: nextAgentAction,
    autofix_loop: autofixLoop,
    repair_instructions: buildRepairInstructions(
      failed ? checks.findings : [],
      implementationContract,
    ),
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
          "Generated UI must use approved primitives, respect local component authority, and provide static plus browser QA evidence.",
      },
    ],
    checks: {
      raw_controls: checks.raw_controls,
      approved_primitives: checks.approved_primitives,
      state_coverage: checks.state_coverage,
      static_enforcement: checks.static_enforcement,
      browser_qa: checks.browser_qa,
      modal_actions: checks.modal_actions,
      action_boundaries: checks.action_boundaries,
      data_visibility: checks.data_visibility,
      accessibility_evidence: checks.accessibility_evidence,
      visual_tokens: checks.visual_tokens,
      design_system_provenance: checks.design_system_provenance,
      local_component_authority: checks.local_component_authority,
      component_contracts: checks.component_contracts,
      pattern_contracts: checks.pattern_contracts,
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
    default_ai_native_design_system:
      implementationContract.default_ai_native_design_system,
    iteration_policy: implementationContract.iteration_policy,
    design_system_source: implementationContract.design_system_source,
    local_component_authority: implementationContract.local_component_authority,
    visual_token_adapter: implementationContract.visual_token_adapter,
    visual_asset_policy: implementationContract.visual_asset_policy,
    accessibility_policy: implementationContract.accessibility_policy,
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

  const cognitiveDimensionsReview =
    options.cognitive_dimensions_review ?? options.cognitiveDimensionsReview;

  if (
    isPlainObject(cognitiveDimensionsReview) &&
    cognitiveDimensionsReview.cognitive_dimensions_review_status !== "ready_for_review"
  ) {
    throw new JudgmentKitInputError(
      "UI generation handoff requires a ready_for_review Cognitive Dimensions review when one is supplied.",
      {
        code: "handoff_blocked",
        details: buildCognitiveDimensionsHandoffBlockDetails(
          cognitiveDimensionsReview,
        ),
      },
    );
  }

  const activityCandidate = workflowReview.activity_review.candidate;
  const workflowCandidate = workflowReview.candidate;
  const contract = options.contract ?? loadActivityContract(options.contractPath);
  const implementationContract = normalizeUiImplementationContract(
    options.implementation_contract ??
      options.ui_implementation_contract ??
      contract.implementation_contract,
    { contract },
  );
  const workflowSurfaceSet = toSurfaceSetArray(workflowCandidate.surface_set);
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
      topology: optionalString(workflowCandidate.workflow.topology),
      work_units: toStringArray(workflowCandidate.workflow.work_units),
      stepper_eligibility:
        workflowCandidate.workflow.stepper_eligibility ?? workflowReview.guardrails?.stepper_eligibility,
      primary_actions: toStringArray(workflowCandidate.workflow.primary_actions),
      decision_points: toStringArray(workflowCandidate.workflow.decision_points),
      completion_state: optionalString(workflowCandidate.workflow.completion_state),
    },
    surface_set: workflowSurfaceSet.map((surface) => ({
      name: optionalString(surface.name),
      purpose: optionalString(surface.purpose),
      sections: toStringArray(surface.sections),
      controls: toStringArray(surface.controls),
      relationship_to_workflow: optionalString(surface.relationship_to_workflow),
    })),
    product_terms: toStringArray(workflowCandidate.product_terms),
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
      terms_to_keep_out_of_product_ui: buildTermsToKeepOutOfProductUi(workflowReview),
      product_ui_rule:
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
      ...(isPlainObject(cognitiveDimensionsReview)
        ? [
            {
              id: "cognitive_dimensions_gate",
              status: "passed",
              evidence: [
                "Cognitive Dimensions review ready",
                "decision, evidence, commitment, dependency, and disclosure checks reviewed",
              ],
            },
          ]
        : []),
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
    ...(isPlainObject(cognitiveDimensionsReview)
      ? {
          cognitive_dimensions_review: {
            status:
              cognitiveDimensionsReview.cognitive_dimensions_review_status,
            findings: cognitiveDimensionsReview.findings ?? [],
            checked_dimensions:
              cognitiveDimensionsReview.reviewed_dimensions ?? [],
          },
        }
      : {}),
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
    handoff.workflow?.topology,
    ...(toStringArray(handoff.workflow?.work_units)),
    ...(toStringArray(handoff.workflow?.primary_actions)),
    ...(toStringArray(handoff.workflow?.decision_points)),
    handoff.workflow?.completion_state,
    ...(toSurfaceSetArray(handoff.surface_set).flatMap((surface) => [
      surface.name,
      surface.purpose,
      surface.relationship_to_workflow,
      ...(toStringArray(surface.sections)),
      ...(toStringArray(surface.controls)),
    ])),
    ...(toStringArray(handoff.product_terms)),
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

function hasDesignGuidanceValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return isPlainObject(value) && Object.keys(value).length > 0;
}

function hasCompleteExternalImplementationAuthority({
  designSystemSource,
  visualTokenAdapter,
  designSystemContract,
}) {
  if (designSystemSource?.mode !== "external_design_system") {
    return true;
  }

  const definitionPoint = optionalString(designSystemSource.definition_point);
  const iconCatalog = isPlainObject(visualTokenAdapter.icon_catalog)
    ? visualTokenAdapter.icon_catalog
    : {};
  const tokenPrefixes = toStringArray(designSystemSource.token_prefixes);
  const hasExternalTokenAuthority =
    visualTokenAdapter.mode === "external_design_system" &&
    (normalizePrimitiveList(visualTokenAdapter.token_families).length > 0 ||
      normalizeCssCustomProperties(visualTokenAdapter.css_custom_properties, [])
        .length > 0 ||
      tokenPrefixes.some((prefix) => prefix && prefix !== "--jk-"));
  const hasExternalIconAuthority =
    optionalString(iconCatalog.source) === "external_design_system" ||
    (optionalString(iconCatalog.package) &&
      optionalString(iconCatalog.package) !== DEFAULT_ICON_CATALOG.package);
  const hasExternalComponentAuthority =
    normalizeComponentContracts(
      designSystemContract.component_contracts,
      [],
    ).length > 0 && toStringArray(designSystemSource.renderer_components).length > 0;

  return (
    definitionPoint.includes("design_system_adapter") &&
    hasExternalTokenAuthority &&
    hasExternalIconAuthority &&
    hasExternalComponentAuthority
  );
}

function formatRoleEntries(entries, formatter) {
  return (Array.isArray(entries) ? entries : [])
    .map(formatter)
    .map(cleanClause)
    .filter(Boolean)
    .join("; ");
}

function guidanceSourceName(hasSource, designSystemMode) {
  if (designSystemMode === "external_design_system" || hasSource) {
    return "external_design_system";
  }

  return "judgmentkit_design_system";
}

function normalizeAdapterTokenGuidance(
  source,
  visualTokenAdapter,
  designSystemMode = "judgmentkit_default",
) {
  const hasSource = hasDesignGuidanceValue(source);
  const sourceObject = isPlainObject(source) ? source : {};

  return {
    source: guidanceSourceName(hasSource, designSystemMode),
    token_families: normalizePrimitiveList(
      sourceObject.token_families ?? sourceObject.tokenFamilies,
      visualTokenAdapter.token_families,
    ),
    token_roles: normalizeRoleEntries(
      firstDefined(sourceObject.token_roles, sourceObject.tokenRoles),
      visualTokenAdapter.token_roles,
      { arrayKeys: ["families"], stringKeys: ["usage"] },
    ),
    css_custom_properties: normalizeCssCustomProperties(
      firstDefined(
        sourceObject.css_custom_properties,
        sourceObject.cssCustomProperties,
      ),
      visualTokenAdapter.css_custom_properties,
    ),
    appearance_policy: normalizeAppearancePolicy(
      firstDefined(
        sourceObject.appearance_policy,
        sourceObject.appearancePolicy,
      ),
      visualTokenAdapter.appearance_policy,
    ),
    appearance_token_sets: normalizeAppearanceTokenSets(
      firstDefined(
        sourceObject.appearance_token_sets,
        sourceObject.appearanceTokenSets,
      ),
      visualTokenAdapter.appearance_token_sets,
    ),
    semantic_roles: normalizePrimitiveList(
      sourceObject.semantic_roles ?? sourceObject.semanticRoles,
      visualTokenAdapter.semantic_roles,
    ),
    rules: normalizePrimitiveList(
      sourceObject.rules ?? sourceObject.adapter_rules ?? sourceObject.adapterRules,
      visualTokenAdapter.adapter_rules,
    ),
  };
}

function normalizeAdapterFontGuidance(
  source,
  visualTokenAdapter,
  designSystemMode = "judgmentkit_default",
) {
  const hasSource = hasDesignGuidanceValue(source);
  const sourceObject = isPlainObject(source) ? source : {};

  return {
    source: guidanceSourceName(hasSource, designSystemMode),
    font_roles: normalizeRoleEntries(
      firstDefined(
        sourceObject.font_roles,
        sourceObject.fontRoles,
        sourceObject.roles,
        source,
      ),
      visualTokenAdapter.font_roles,
      {
        valueKey: "stack",
        arrayKeys: ["feature_settings"],
        stringKeys: ["stack", "usage"],
      },
    ),
    rules: normalizePrimitiveList(
      sourceObject.rules ?? sourceObject.font_rules ?? sourceObject.fontRules,
      visualTokenAdapter.font_rules,
    ),
  };
}

function normalizeAdapterIconGuidance(
  source,
  visualTokenAdapter,
  designSystemMode = "judgmentkit_default",
) {
  const hasSource = hasDesignGuidanceValue(source);
  const sourceObject = isPlainObject(source) ? source : {};

  return {
    source: guidanceSourceName(hasSource, designSystemMode),
    icon_roles: normalizePrimitiveList(
      sourceObject.icon_roles ?? sourceObject.iconRoles ?? sourceObject.roles,
      visualTokenAdapter.icon_roles,
    ),
    icon_catalog: normalizeIconCatalog(
      firstDefined(
        sourceObject.icon_catalog,
        sourceObject.iconCatalog,
        sourceObject.catalog,
      ),
      visualTokenAdapter.icon_catalog,
    ),
    icon_selection_policy: normalizeIconSelectionPolicy(
      firstDefined(
        sourceObject.icon_selection_policy,
        sourceObject.iconSelectionPolicy,
        sourceObject.selection_policy,
        sourceObject.selectionPolicy,
      ),
      visualTokenAdapter.icon_selection_policy,
    ),
    rules: normalizePrimitiveList(
      sourceObject.rules ?? sourceObject.icon_rules ?? sourceObject.iconRules,
      visualTokenAdapter.icon_rules,
    ),
  };
}

const DEFAULT_ICON_CATALOG_LIST_LIMIT = 50;
const DEFAULT_ICON_CATALOG_SEARCH_LIMIT = 24;
const MAX_ICON_CATALOG_LIMIT = 100;

function normalizeIconCatalogLimit(value, fallback) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(numberValue), MAX_ICON_CATALOG_LIMIT);
}

function normalizeIconCatalogCursor(cursor) {
  if (cursor === undefined || cursor === null || cursor === "") {
    return 0;
  }

  const offset = Number(cursor);
  if (!Number.isInteger(offset) || offset < 0) {
    throw new JudgmentKitInputError("cursor must be a non-negative integer offset.");
  }
  return offset;
}

function iconRecordForResponse(icon, includeSvg = false) {
  if (includeSvg) {
    return clonePolicyValue(icon);
  }

  const { svg, elements, paths, ...metadata } = icon;

  return {
    ...metadata,
    element_count: Array.isArray(elements) ? elements.length : 0,
    path_count: Array.isArray(paths) ? paths.length : 0,
    has_svg: true,
  };
}

function iconCatalogLicenseSummary() {
  return {
    license: LUCIDE_ICON_SOURCE.license,
    notice: LUCIDE_ICON_SOURCE.notice,
    feather_mit_derived_count: LUCIDE_ICON_SOURCE.feather_mit_derived_count,
    notices_file: "THIRD_PARTY_NOTICES.md",
  };
}

export function listIconCatalog({
  limit,
  cursor,
  category,
  include_svg: includeSvg,
  includeSvg: includeSvgCamel,
} = {}) {
  const resolvedLimit = normalizeIconCatalogLimit(
    limit,
    DEFAULT_ICON_CATALOG_LIST_LIMIT,
  );
  const offset = normalizeIconCatalogCursor(cursor);
  const normalizedCategory = normalizeText(optionalString(category));
  const includeFullSvg = Boolean(includeSvg ?? includeSvgCamel);
  const filteredIcons = normalizedCategory
    ? LUCIDE_ICON_CATALOG.filter((icon) =>
        icon.categories.some(
          (iconCategory) => normalizeText(iconCategory) === normalizedCategory,
        ),
      )
    : LUCIDE_ICON_CATALOG;
  const page = filteredIcons.slice(offset, offset + resolvedLimit);
  const nextOffset = offset + page.length;

  return {
    icon_catalog_status: "ready",
    source: LUCIDE_ICON_SOURCE,
    license_summary: iconCatalogLicenseSummary(),
    total_count: filteredIcons.length,
    catalog_count: LUCIDE_ICON_CATALOG.length,
    category: optionalString(category) || null,
    limit: resolvedLimit,
    cursor: String(offset),
    next_cursor: nextOffset < filteredIcons.length ? String(nextOffset) : null,
    include_svg: includeFullSvg,
    icons: page.map((icon) => iconRecordForResponse(icon, includeFullSvg)),
  };
}

function iconSearchTerms(query) {
  return unique(
    normalizeText(query)
      .split(/[^a-z0-9]+/g)
      .map((term) => term.trim())
      .filter(Boolean),
  );
}

function scoreIconForQuery(icon, query, terms) {
  const normalizedQuery = normalizeText(query);
  const dashedQuery = normalizedQuery.replaceAll(" ", "-");
  const id = normalizeText(icon.id);
  const name = normalizeText(icon.name);
  const aliases = toStringArray(icon.aliases).map(normalizeText);
  const tags = toStringArray(icon.tags).map(normalizeText);
  const searchTerms = toStringArray(icon.search_terms).map(normalizeText);
  const categories = toStringArray(icon.categories).map(normalizeText);
  let score = 0;

  if (id === dashedQuery || id === normalizedQuery) {
    score += 160;
  } else if (id.startsWith(dashedQuery)) {
    score += 90;
  } else if (id.includes(dashedQuery)) {
    score += 55;
  }

  if (name === normalizedQuery) {
    score += 130;
  } else if (name.startsWith(normalizedQuery)) {
    score += 70;
  } else if (name.includes(normalizedQuery)) {
    score += 40;
  }

  for (const alias of aliases) {
    if (alias === dashedQuery || alias === normalizedQuery) {
      score += 120;
    } else if (alias.includes(dashedQuery) || alias.includes(normalizedQuery)) {
      score += 50;
    }
  }

  for (const tag of tags) {
    if (tag === normalizedQuery) {
      score += 85;
    } else if (tag.includes(normalizedQuery)) {
      score += 32;
    }
  }

  for (const term of terms) {
    if (id.split("-").includes(term)) {
      score += 35;
    }
    if (id.includes(term)) {
      score += 20;
    }
    if (name.split(" ").includes(term)) {
      score += 25;
    }
    if (aliases.some((alias) => alias.split("-").includes(term) || alias.includes(term))) {
      score += 24;
    }
    if (tags.some((tag) => tag === term || tag.includes(term))) {
      score += 22;
    }
    if (searchTerms.some((searchTerm) => searchTerm === term || searchTerm.includes(term))) {
      score += 18;
    }
    if (categories.some((iconCategory) => iconCategory === term)) {
      score += 10;
    }
  }

  return score;
}

export function searchIconCatalog({
  query,
  limit,
  include_svg: includeSvg,
  includeSvg: includeSvgCamel,
} = {}) {
  const normalizedQuery = optionalString(query);
  if (!normalizedQuery) {
    throw new JudgmentKitInputError("query is required for search_icon_catalog.");
  }

  const resolvedLimit = normalizeIconCatalogLimit(
    limit,
    DEFAULT_ICON_CATALOG_SEARCH_LIMIT,
  );
  const includeFullSvg = Boolean(includeSvg ?? includeSvgCamel);
  const terms = iconSearchTerms(normalizedQuery);
  const matches = LUCIDE_ICON_CATALOG
    .map((icon) => ({
      icon,
      score: scoreIconForQuery(icon, normalizedQuery, terms),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.icon.id.localeCompare(right.icon.id);
    })
    .slice(0, resolvedLimit);

  return {
    icon_catalog_status: "ready",
    source: LUCIDE_ICON_SOURCE,
    license_summary: iconCatalogLicenseSummary(),
    query: normalizedQuery,
    limit: resolvedLimit,
    include_svg: includeFullSvg,
    total_count: LUCIDE_ICON_CATALOG.length,
    match_count: matches.length,
    icons: matches.map((match) => ({
      ...iconRecordForResponse(match.icon, includeFullSvg),
      score: match.score,
    })),
  };
}

export function getIconSvg({ id } = {}) {
  const normalizedId = optionalString(id);
  if (!normalizedId) {
    throw new JudgmentKitInputError("id is required for get_icon_svg.");
  }

  const icon = LUCIDE_ICON_INDEX.get(normalizedId);
  if (!icon) {
    throw new JudgmentKitInputError(`Unknown Lucide icon id: ${normalizedId}.`, {
      details: {
        id: normalizedId,
        catalog_library: LUCIDE_ICON_SOURCE.library,
        catalog_version: LUCIDE_ICON_SOURCE.version,
        catalog_count: LUCIDE_ICON_SOURCE.icon_count,
      },
    });
  }

  return {
    icon_catalog_status: "ready",
    source: LUCIDE_ICON_SOURCE,
    license_summary: iconCatalogLicenseSummary(),
    id: icon.id,
    icon: iconRecordForResponse(icon, true),
    inline_svg: icon.svg,
  };
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
                terms_to_use: uiGenerationHandoff.product_terms ?? [],
              },
            },
          },
        });
  const surfaceGuidance = summarizeSurfaceReview(inferredSurfaceReview, {
    includeFrontendPosture: true,
  });
  const normalizedFrontendContext = normalizeFrontendContext(frontendContext);
  const normalizedVerification = normalizeVerificationContext(verification);
  const requiredSurfaces = toSurfaceSetArray(uiGenerationHandoff.surface_set);
  const requiredSurfaceAggregate = aggregateSurfaceSet(requiredSurfaces);
  const designSystemContract = normalizeDefaultAiNativeDesignSystem(
    uiGenerationHandoff.implementation_contract?.default_ai_native_design_system,
    DEFAULT_AI_NATIVE_DESIGN_SYSTEM,
  );
  const localComponentAuthority = normalizeLocalComponentAuthority(
    uiGenerationHandoff.implementation_contract?.local_component_authority,
    DEFAULT_LOCAL_COMPONENT_AUTHORITY,
  );
  const evidenceFieldMapping = reviewEvidenceFieldMapping(
    uiGenerationHandoff.implementation_contract,
    designSystemContract,
    { selectedSurfaceType: surfaceGuidance.recommended_surface_type },
  );

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
    surface_set: requiredSurfaces,
    product_terms: toStringArray(uiGenerationHandoff.product_terms),
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
      visual_requirements: toStringArray(
        normalizedFrontendContext.visual_requirements ??
          normalizedFrontendContext.visualRequirements,
      ),
      approved_visual_asset_sources: toStringArray(
        normalizedFrontendContext.approved_visual_asset_sources ??
          normalizedFrontendContext.approvedVisualAssetSources,
      ),
    },
    implementation_guidance: {
      surface_type: surfaceGuidance.recommended_surface_type,
      interaction_implications: surfaceGuidance.interaction_implications,
      disclosure_implications: surfaceGuidance.disclosure_implications,
      frontend_posture: surfaceGuidance.frontend_posture,
      implementation_contract: uiGenerationHandoff.implementation_contract,
      design_system_source:
        uiGenerationHandoff.implementation_contract?.design_system_source ??
        DEFAULT_DESIGN_SYSTEM_SOURCE,
      local_component_authority:
        localComponentAuthority,
      visual_asset_policy:
        uiGenerationHandoff.implementation_contract?.visual_asset_policy ??
        DEFAULT_VISUAL_ASSET_POLICY,
      accessibility_policy:
        uiGenerationHandoff.implementation_contract?.accessibility_policy ??
        DEFAULT_ACCESSIBILITY_POLICY,
      evidence_field_mapping: evidenceFieldMapping,
      component_contracts: designSystemContract.component_contracts,
      pattern_contracts: designSystemContract.pattern_contracts,
      required_surfaces: requiredSurfaces,
      required_sections: requiredSurfaceAggregate.sections,
      required_controls: requiredSurfaceAggregate.controls,
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
      terms_to_keep_out_of_product_ui:
        uiGenerationHandoff.disclosure_reminders?.terms_to_keep_out_of_product_ui ?? [],
      diagnostic_contexts:
        uiGenerationHandoff.disclosure_reminders?.diagnostic_contexts ?? [],
      approved_primitives:
        uiGenerationHandoff.implementation_contract?.approved_primitives ?? [],
      design_system_source:
        uiGenerationHandoff.implementation_contract?.design_system_source ??
        DEFAULT_DESIGN_SYSTEM_SOURCE,
      ...(localComponentAuthorityIsActive(localComponentAuthority)
        ? { local_component_authority: localComponentAuthority }
        : {}),
    },
  };
}

function buildFrontendImplementationInstructionMarkdown({
  frontendGenerationContext,
  designSystemPolicy,
  targetClient,
  evidenceFieldMapping,
}) {
  const implementationGuidance = frontendGenerationContext.implementation_guidance ?? {};
  const reviewEvidenceMapping =
    evidenceFieldMapping ?? implementationGuidance.evidence_field_mapping ?? {};
  const primitiveEvidenceMapping = reviewEvidenceMapping.primitives_used ?? {};
  const componentEvidenceMapping =
    reviewEvidenceMapping.component_contract_evidence ?? {};
  const patternEvidenceMapping =
    reviewEvidenceMapping.pattern_contract_evidence ?? {};
  const visualTokenEvidenceMapping =
    reviewEvidenceMapping.visual_token_evidence ?? {};
  const provenanceEvidenceMapping =
    reviewEvidenceMapping.design_system_provenance ?? {};
  const localAuthorityEvidenceMapping =
    reviewEvidenceMapping.local_component_authority_evidence ?? {};
  const verification = implementationGuidance.verification_expectations ?? {};
  const frontendContext = frontendGenerationContext.frontend_context ?? {};
  const workflow = frontendGenerationContext.workflow ?? {};
  const requiredSurfaces = toSurfaceSetArray(implementationGuidance.required_surfaces);
  const visualAssetPolicy =
    implementationGuidance.visual_asset_policy ?? DEFAULT_VISUAL_ASSET_POLICY;
  const accessibilityPolicy =
    implementationGuidance.accessibility_policy ?? DEFAULT_ACCESSIBILITY_POLICY;
  const localComponentAuthority = normalizeLocalComponentAuthority(
    implementationGuidance.local_component_authority ??
      frontendGenerationContext.implementation_contract?.local_component_authority,
    DEFAULT_LOCAL_COMPONENT_AUTHORITY,
  );
  const localComponentAuthorityActive =
    localComponentAuthorityIsActive(localComponentAuthority);
  const contrastTargets =
    accessibilityPolicy.contrast_targets ?? DEFAULT_ACCESSIBILITY_POLICY.contrast_targets;
  const standardsProfile =
    accessibilityPolicy.standards_profile ??
    DEFAULT_ACCESSIBILITY_POLICY.standards_profile;
  const accessibilityContractNames = Object.keys(
    accessibilityPolicy.contracts ?? DEFAULT_ACCESSIBILITY_POLICY.contracts,
  );
  const conditionalEvidenceKeys = Object.keys(
    accessibilityPolicy.conditional_evidence ??
      DEFAULT_ACCESSIBILITY_POLICY.conditional_evidence,
  ).map((key) => `accessibility_evidence.${key}`);
  const lines = [
    "# Frontend Implementation Skill Context",
    "",
    "Use this only after a ready JudgmentKit frontend context. Implement from the activity, workflow, required sections, controls, and implementation contract before applying renderer choices.",
    "",
    "## Source",
    `- Target client: ${targetClient || "agent"}`,
    `- Surface type: ${frontendGenerationContext.surface_type || "unspecified"}`,
    `- Workflow topology: ${workflow.topology || "workspace"}`,
    `- Runtime: ${frontendContext.target_runtime || "unspecified"}`,
    `- UI library: ${frontendContext.ui_library || "unspecified"}`,
    "",
    "## Implementation Sequence",
    "- Confirm the activity, primary decision, workflow topology, work units, coordinated surfaces, and handoff are represented.",
    "- Shape the interface around the selected surface type and surface set before choosing section layout.",
    "- Use numbered wizard or stepper UI only when workflow.stepper_eligibility.allowed is true.",
    "- Put only implementation_contract.approved_primitives in primitives_used; put design-system component ids in component_contract_evidence.components[].id with states_covered, and pattern ids in pattern_contract_evidence.pattern_id.",
    "- Use approved component families and documented design-system component contracts before introducing new UI helpers.",
    "- Use implementation_contract.design_system_source as the active source for visual tokens, typography, icon assets, renderer components, imports, and packages.",
    "- Put token/font/icon role and catalog-id boundary proof in visual_token_evidence; put renderer, import, package, source-export, and token-prefix provenance in design_system_provenance.",
    ...(localComponentAuthorityActive
      ? [
          "- When implementation_contract.local_component_authority is active, keep one-off component selectors layout-only; do not recreate visual identity or use direct --jk-* tokens in component-specific selectors.",
          "- Put repo-local selector-boundary and computed-style proof in local_component_authority_evidence when local authority is active.",
        ]
      : []),
    "- Use JudgmentKit design-system exports by default; when external_design_system is active, do not mix in JudgmentKit default assets unless the external adapter explicitly names them.",
    "- Verify core accessibility evidence for semantics, landmarks/headings, name/role/value, keyboard navigation, focus order, focus-visible, responsive reflow/no-overflow, and automated checks.",
    "- Add conditional accessibility evidence for visuals, custom widgets, forms, status messages, overlays, motion, media, dense controls, and hover/focus content when those patterns appear.",
    "- For text over substantive visuals or rendered backgrounds, verify WCAG AA contrast from browser-rendered output, not screenshots alone.",
    "- Verify required states, static checks, browser checks, accessibility evidence, and disclosure boundaries.",
    "- Review generated code or evidence with review_ui_implementation_candidate before final handoff.",
    "",
    "## Review Evidence Fields",
    `- ${primitiveEvidenceMapping.field || "primitives_used"}: only implementation_contract.approved_primitives. Allowed values: ${toStringArray(primitiveEvidenceMapping.allowed_values).join("; ") || "none supplied"}`,
    `- ${componentEvidenceMapping.id_field || "component_contract_evidence.components[].id"}: design-system component contract ids. Include ${componentEvidenceMapping.state_field || "component_contract_evidence.components[].states_covered"} for each used component. Allowed ids: ${toStringArray(componentEvidenceMapping.allowed_component_ids).join("; ") || "none supplied"}`,
    `- ${patternEvidenceMapping.id_field || "pattern_contract_evidence.pattern_id"}: selected design-system pattern contract id. Include matching surface type, regions_present, controls_present, and handoff evidence. Allowed ids: ${toStringArray(patternEvidenceMapping.allowed_pattern_ids).join("; ") || "none supplied"}`,
    `- ${visualTokenEvidenceMapping.field || "visual_token_evidence"}: token families, token roles, font roles, icon roles, and catalog icon ids from implementation_contract.visual_token_adapter. This is boundary proof only, not primitive, component, pattern, renderer, static, browser, or accessibility proof.`,
    `- ${provenanceEvidenceMapping.field || "design_system_provenance"}: source proof for visual tokens, typography, icon assets, renderer components, imports, packages, token prefixes, and design-system exports. Active source: ${[
      provenanceEvidenceMapping.active_source?.mode,
      provenanceEvidenceMapping.active_source?.name,
      provenanceEvidenceMapping.active_source?.package,
    ].filter(Boolean).join(" / ") || "unspecified"}`,
    ...(localComponentAuthorityActive
      ? [
          `- ${localAuthorityEvidenceMapping.field || "local_component_authority_evidence"}: repo-local component family, selector-boundary, token-boundary, and computed-style proof. Active mode: ${localAuthorityEvidenceMapping.active_authority?.mode || localComponentAuthority.mode || "none"}`,
        ]
      : []),
    "",
    "## Required Surface",
    `- Topology: ${workflow.topology || "workspace"}`,
    `- Work units: ${toStringArray(workflow.work_units).join("; ") || "none supplied"}`,
    `- Stepper eligibility: ${workflow.stepper_eligibility?.allowed ? "allowed" : "not allowed"}`,
    `- Surfaces: ${requiredSurfaces.map((surface) => `${surface.name}: ${surface.purpose}`).join("; ") || "none supplied"}`,
    `- Sections: ${toStringArray(implementationGuidance.required_sections).join("; ") || "none supplied"}`,
    `- Controls: ${toStringArray(implementationGuidance.required_controls).join("; ") || "none supplied"}`,
    "",
    "## Design System Policy",
    `- Mode: ${designSystemPolicy.mode}`,
    `- Source: ${[designSystemPolicy.name, designSystemPolicy.package].filter(Boolean).join(" / ") || "unspecified"}`,
    `- Definition point: ${designSystemPolicy.definition_point || "implementation_contract"}`,
    `- Authority: ${designSystemPolicy.authority}`,
    `- Constraint: ${designSystemPolicy.constraint}`,
    `- Token families: ${toStringArray(designSystemPolicy.token_guidance?.token_families).join("; ") || "none supplied"}`,
    `- Token roles: ${
      formatRoleEntries(
        designSystemPolicy.token_guidance?.token_roles,
        (entry) => `${entry.role}: ${toStringArray(entry.families).join(", ")}`,
      ) || "none supplied"
    }`,
    `- CSS custom properties: ${
      formatRoleEntries(
        designSystemPolicy.token_guidance?.css_custom_properties,
        (entry) => `${entry.name}: ${entry.value} (${entry.role})`,
      ) || "none supplied"
    }`,
    `- Appearance default: ${designSystemPolicy.token_guidance?.appearance_policy?.default_mode || "system"}`,
    `- Visible appearance toggle: ${
      designSystemPolicy.token_guidance?.appearance_policy?.visible_toggle_default
        ? "allowed by default"
        : "not shown by default"
    }`,
    `- Appearance token sets: ${
      formatRoleEntries(
        designSystemPolicy.token_guidance?.appearance_token_sets,
        (entry) => `${entry.mode}: ${entry.color_scheme}`,
      ) || "none supplied"
    }`,
    `- Font roles: ${
      formatRoleEntries(
        designSystemPolicy.font_guidance?.font_roles,
        (entry) => `${entry.role}: ${entry.stack}`,
      ) || "none supplied"
    }`,
    `- Icon roles: ${toStringArray(designSystemPolicy.icon_guidance?.icon_roles).join("; ") || "none supplied"}`,
    `- Icon catalog: ${[
      designSystemPolicy.icon_guidance?.icon_catalog?.library,
      designSystemPolicy.icon_guidance?.icon_catalog?.version,
      designSystemPolicy.icon_guidance?.icon_catalog?.icon_count
        ? `${designSystemPolicy.icon_guidance.icon_catalog.icon_count} icons`
        : "",
    ].filter(Boolean).join(" ") || "none supplied"}`,
    `- Icon tools: ${toStringArray(designSystemPolicy.icon_guidance?.icon_catalog?.mcp_tools).join("; ") || "none supplied"}`,
    `- Component contracts: ${
      formatRoleEntries(
        designSystemPolicy.component_contracts,
        (entry) => `${entry.id}: ${entry.purpose}`,
      ) || "none supplied"
    }`,
    `- Pattern contracts: ${
      formatRoleEntries(
        designSystemPolicy.pattern_contracts,
        (entry) => `${entry.id}: ${entry.surface_type}`,
      ) || "none supplied"
    }`,
    ...(localComponentAuthorityActive
      ? [
          "",
          "## Local Component Authority",
          `- Mode: ${localComponentAuthority.mode || "none"}`,
          `- Enforcement: ${localComponentAuthority.enforcement || "optional"}`,
          `- Families: ${toStringArray(localComponentAuthority.families).join("; ") || "none supplied"}`,
          `- Selector boundary: ${toStringArray(localComponentAuthority.selector_boundary?.allowed).join("; ") || "layout-only selectors allowed"}`,
          `- Token boundary: ${localComponentAuthority.token_boundary?.rule || "direct JudgmentKit tokens stay out of one-off component selectors"}`,
          `- Computed style evidence: ${toStringArray(localComponentAuthority.computed_style_evidence?.expectations).join("; ") || "none supplied"}`,
        ]
      : []),
    "",
    "## Visual Asset Policy",
    `- Applies when: ${toStringArray(visualAssetPolicy.applies_when).join("; ") || "no substantive visual requirements supplied"}`,
    `- Preferred paths: ${toStringArray(visualAssetPolicy.preferred_paths).join("; ") || "none supplied"}`,
    `- Deterministic safe uses: ${toStringArray(visualAssetPolicy.deterministic_safe_uses).join("; ") || "none supplied"}`,
    `- Failure signals: ${toStringArray(visualAssetPolicy.failure_signals).join("; ") || "none supplied"}`,
    "",
    "## Accessibility Policy",
    `- Baseline: ${standardsProfile.baseline || "WCAG 2.2 AA"}`,
    `- Contrast targets: normal text ${contrastTargets.normal_text_min_ratio}:1; large text ${contrastTargets.large_text_min_ratio}:1`,
    `- Non-text contrast target: ${contrastTargets.non_text_min_ratio ?? DEFAULT_ACCESSIBILITY_POLICY.contrast_targets.non_text_min_ratio}:1`,
    `- Contract groups: ${accessibilityContractNames.join("; ") || "none supplied"}`,
    `- Rendered backgrounds: ${toStringArray(accessibilityPolicy.rendered_background_readability?.applies_to).join("; ") || "none supplied"}`,
    `- Background readability: ${accessibilityPolicy.rendered_background_readability?.requirement || "none supplied"}`,
    `- Core required evidence: ${toStringArray(accessibilityPolicy.required_evidence).join("; ") || "none supplied"}`,
    `- Conditional evidence: ${conditionalEvidenceKeys.join("; ") || "none supplied"}`,
    `- Failure signals: ${toStringArray(accessibilityPolicy.failure_signals).join("; ") || "none supplied"}`,
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
  const workflow = frontendGenerationContext.workflow ?? {};
  const requiredSurfaces = toSurfaceSetArray(implementationGuidance.required_surfaces);
  const visualAssetPolicy =
    implementationGuidance.visual_asset_policy ??
    implementationContract.visual_asset_policy ??
    DEFAULT_VISUAL_ASSET_POLICY;
  const accessibilityPolicy =
    implementationGuidance.accessibility_policy ??
    implementationContract.accessibility_policy ??
    DEFAULT_ACCESSIBILITY_POLICY;
  const localComponentAuthority = normalizeLocalComponentAuthority(
    implementationGuidance.local_component_authority ??
      implementationContract.local_component_authority,
    DEFAULT_LOCAL_COMPONENT_AUTHORITY,
  );
  const localComponentAuthorityActive =
    localComponentAuthorityIsActive(localComponentAuthority);
  let visualTokenAdapter = normalizeVisualTokenAdapter(
    implementationContract.visual_token_adapter ?? {},
    DEFAULT_VISUAL_TOKEN_ADAPTER,
  );
  let designSystemContract = normalizeDefaultAiNativeDesignSystem(
    implementationContract.default_ai_native_design_system,
    DEFAULT_AI_NATIVE_DESIGN_SYSTEM,
  );
  let designSystemSource = normalizeDesignSystemSource(
    implementationContract.design_system_source ??
      implementationGuidance.design_system_source,
    {
      visualTokenAdapter,
      componentContracts: designSystemContract.component_contracts,
    },
  );
  const hasInlineDesignSystemAdapter = hasDesignGuidanceValue(
    normalizedDesignSystemAdapter,
  );

  if (
    designSystemSource.mode === "external_design_system" &&
    !hasInlineDesignSystemAdapter &&
    !hasCompleteExternalImplementationAuthority({
      designSystemSource,
      visualTokenAdapter,
      designSystemContract,
    })
  ) {
    throwIncompleteDesignSystemAuthority();
  }

  if (hasInlineDesignSystemAdapter) {
    const externalDesignSystem = externalDesignSystemFromAdapter(
      normalizedDesignSystemAdapter,
      designSystemContract,
    );
    visualTokenAdapter = externalDesignSystem.visualTokenAdapter;
    designSystemContract = externalDesignSystem.defaultDesignSystem;
    designSystemSource = {
      ...externalDesignSystem.designSystemSource,
      definition_point: "frontend_skill_context.design_system_adapter_compat",
    };
  }

  const designSystemName = optionalDesignSystemName(
    designSystemSource.name,
    frontendContext.ui_library,
  );
  const designSystemPackage = optionalString(designSystemSource.package);
  const designSystemComponents = toStringArray(designSystemSource.renderer_components);
  const tokenGuidance = normalizeAdapterTokenGuidance(
    normalizedDesignSystemAdapter.token_guidance ??
      normalizedDesignSystemAdapter.tokenGuidance ??
      normalizedDesignSystemAdapter.tokens,
    visualTokenAdapter,
    designSystemSource.mode,
  );
  const fontGuidance = normalizeAdapterFontGuidance(
    normalizedDesignSystemAdapter.font_guidance ??
      normalizedDesignSystemAdapter.fontGuidance ??
      normalizedDesignSystemAdapter.fonts ??
      normalizedDesignSystemAdapter.typography,
    visualTokenAdapter,
    designSystemSource.mode,
  );
  const iconGuidance = normalizeAdapterIconGuidance(
    normalizedDesignSystemAdapter.icon_guidance ??
      normalizedDesignSystemAdapter.iconGuidance ??
      normalizedDesignSystemAdapter.icons,
    visualTokenAdapter,
    designSystemSource.mode,
  );
  const designSystemPolicy = {
    mode: designSystemSource.mode,
    name: designSystemName,
    package: designSystemPackage,
    id: designSystemSource.id,
    definition_point: designSystemSource.definition_point,
    required_authorities: designSystemSource.required_authorities,
    fallback_policy: designSystemSource.fallback_policy,
    provenance_required: designSystemSource.provenance_required,
    source_exports: designSystemSource.source_exports,
    role:
      optionalString(normalizedDesignSystemAdapter.role) ||
      "active design-system implementation authority",
    authority:
      "The implementation contract design_system_source is authoritative for visual tokens, typography, icon assets, and renderer components.",
    renderer_components: designSystemComponents,
    constraint:
      optionalString(normalizedDesignSystemAdapter.constraint) ||
      "Local CSS may define structure and layout, but visual tokens, typography, icon assets, and renderer components must come from the active design-system source.",
    token_guidance: tokenGuidance,
    font_guidance: fontGuidance,
    icon_guidance: iconGuidance,
    token_prefixes: designSystemSource.token_prefixes,
    provenance_rules: designSystemSource.provenance_rules,
    component_contracts: designSystemContract.component_contracts,
    pattern_contracts: designSystemContract.pattern_contracts,
  };
  const evidenceFieldMapping = reviewEvidenceFieldMapping(
    implementationContract,
    designSystemContract,
    {
      designSystemSource,
      visualTokenAdapter,
      selectedSurfaceType: frontendGenerationContext.surface_type,
    },
  );
  const verificationChecklist = unique([
    ...toStringArray(verificationExpectations.commands).map(
      (command) => `Run ${command}`,
    ),
    ...toStringArray(implementationContract.static_enforcement?.default_rules),
    ...(localComponentAuthorityActive
      ? [
          "When local component authority is active, scan component-specific selectors for visual identity declarations and direct --jk-* token use.",
        ]
      : []),
    "Verify substantive visuals use imagegen or premium Three.js/WebGL/D3-style rendering when the spec calls for them.",
    "Provide browser-rendered visual-background contrast evidence for text over images, canvas, WebGL, video, gradients, or generated visuals.",
    "Verify non-text contrast for meaningful icons, charts, state indicators, custom controls, and authored focus indicators.",
    "Verify forced-colors or high-contrast behavior when custom colors, gradients, overlays, or authored focus styles are used.",
    "Verify focus-visible evidence for interactive controls.",
    "Verify focus order, keyboard navigation, focus-not-obscured behavior, and no keyboard trap for custom widgets, overlays, dialogs, and embedded experiences.",
    "Verify reduced-motion behavior for animation and rendered visuals.",
    "Verify pause, stop, hide, or update-frequency control for auto-moving or auto-updating content.",
    "Verify form labels, instructions, text errors, correction suggestions, and status/live-region messages when forms or async states are present.",
    "Verify semantic content or accessible fallback for images, canvas, WebGL, video, generated visuals, and D3-style visualization.",
    "Verify captions, transcripts, descriptions, or media alternatives when audio or video is present.",
    "Verify target size or valid target spacing/equivalent-control exceptions for dense or touch-oriented controls.",
    "Verify responsive no-overflow evidence at desktop and mobile sizes.",
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
      evidenceFieldMapping,
    }),
    implementation_sequence: [
      "Confirm the activity, primary decision, workflow topology, work units, coordinated surfaces, and handoff from the ready frontend context.",
      "Map the selected surface type to the surface set, required sections, controls, density, navigation, and responsive expectations.",
      "Use numbered wizard or stepper UI only when workflow.stepper_eligibility.allowed is true.",
      "Put only implementation_contract.approved_primitives in primitives_used; put design-system component ids in component_contract_evidence.components[].id with states_covered, and pattern ids in pattern_contract_evidence.pattern_id.",
      "Use approved component families and documented design-system component contracts before introducing new UI helpers.",
      "Use implementation_contract.design_system_source as the active source for visual tokens, typography, icon assets, renderer components, imports, and packages.",
      "Put token/font/icon role and catalog-id boundary proof in visual_token_evidence; put renderer, import, package, source-export, and token-prefix provenance in design_system_provenance.",
      ...(localComponentAuthorityActive
        ? [
            "When implementation_contract.local_component_authority is active, keep one-off component selectors layout-only; do not recreate visual identity or use direct --jk-* tokens in component-specific selectors.",
            "Put repo-local selector-boundary and computed-style proof in local_component_authority_evidence when local authority is active.",
          ]
        : []),
      "Use JudgmentKit design-system exports by default; when external_design_system is active, do not mix in JudgmentKit default assets unless the external adapter explicitly names them.",
      "When the spec calls for substantive visuals, use imagegen or premium Three.js/WebGL/D3-style rendering instead of rudimentary deterministic geometry.",
      "Verify core accessibility evidence: automated checks, semantic content, landmarks/headings, name-role-value, keyboard navigation, focus order, focus-visible, and responsive reflow/no-overflow.",
      "Add conditional accessibility evidence for visuals, custom widgets, forms, status messages, overlays, motion, media, dense controls, and hover/focus content when those patterns appear.",
      "Check text over substantive visuals against the accessibility policy with browser-rendered contrast evidence before accepting screenshots.",
      "Verify required states, static checks, browser checks, accessibility evidence, and disclosure boundaries.",
      "Call review_ui_implementation_candidate with generated code or evidence before final handoff.",
    ],
    surface_type_guidance: {
      surface_type: frontendGenerationContext.surface_type,
      workflow_topology: optionalString(workflow.topology) || "workspace",
      work_units: toStringArray(workflow.work_units),
      stepper_eligibility: workflow.stepper_eligibility ?? {},
      surface_set: requiredSurfaces,
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
    visual_requirements: toStringArray(frontendContext.visual_requirements),
    approved_visual_asset_sources: toStringArray(
      frontendContext.approved_visual_asset_sources,
    ),
    visual_asset_policy: visualAssetPolicy,
    accessibility_policy: accessibilityPolicy,
    local_component_authority: localComponentAuthority,
    design_system_source: designSystemSource,
    visual_token_adapter: visualTokenAdapter,
    design_system_policy: designSystemPolicy,
    evidence_field_mapping: evidenceFieldMapping,
    token_guidance: tokenGuidance,
    font_guidance: fontGuidance,
    icon_guidance: iconGuidance,
    component_contracts: designSystemContract.component_contracts,
    pattern_contracts: designSystemContract.pattern_contracts,
    verification_checklist: verificationChecklist,
    guardrails: {
      adapter_layer: true,
      requires_ready_frontend_context: true,
      activity_first: true,
      raw_skill_dump: false,
      design_system_is_adapter: false,
      design_system_contract_first: true,
      design_system_source: designSystemSource,
      ...(localComponentAuthorityActive
        ? { local_component_authority: localComponentAuthority }
        : {}),
      visual_asset_policy: visualAssetPolicy,
      accessibility_policy: accessibilityPolicy,
      product_ui_rule:
        "Do not copy JudgmentKit review-packet terms or implementation machinery into the product UI.",
      terms_to_keep_out_of_product_ui:
        frontendGenerationContext.guardrails?.terms_to_keep_out_of_product_ui ?? [],
      diagnostic_contexts:
        frontendGenerationContext.guardrails?.diagnostic_contexts ?? [],
    },
    next_recommended_tool: "review_ui_implementation_candidate",
  };

  return packet;
}
