import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTRACT_PATH = path.resolve(
  __dirname,
  "../contracts/ai-ui-generation.activity-contract.json",
);

export class JudgmentKitInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "JudgmentKitInputError";
    this.code = "invalid_input";
  }
}

export function loadActivityContract(contractPath = DEFAULT_CONTRACT_PATH) {
  return JSON.parse(fs.readFileSync(contractPath, "utf8"));
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
          "You propose a reviewable JudgmentKit 2 activity model candidate.",
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
