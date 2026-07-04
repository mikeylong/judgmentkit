import {
  JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
  JUDGMENTKIT_THEME_COLOR_SLOTS,
  assertCompleteThemeColors,
} from "./tokens.mjs";
import { JUDGMENTKIT_STYLE_NAMES } from "./styles.mjs";

const HEX_COLOR_PATTERN = /(^|[^\w])#(?:[0-9a-fA-F]{3,8})\b/g;
const CSS_COLOR_FUNCTION_PATTERN = /\b(?:rgb|rgba|hsl|hsla|oklch|color)\s*\(/gi;
const TAILWIND_COLOR_CLASS_PATTERN = /\b(?:bg|text|border|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
const DIRECT_FONT_PATTERN = /\bfont(?:Face|Family)\s*[:=]\s*["'][^"']+["']/g;
const PUBLIC_ADAPTER_IMPORT = "judgmentkit/presentation-theme";
const SLIDE_DISCLOSURE_PATTERNS = [
  { term: "ready_for_review", pattern: /\bready(?:[_ -]+)for(?:[_ -]+)review\b/i },
  { term: "activity_model", pattern: /\bactivity(?:[_ -]+)model\b/i },
  { term: "Primary user", pattern: /\bPrimary(?:[_ -]+)user\b/i },
  { term: "Main decision", pattern: /\bMain(?:[_ -]+)decision\b/i },
  { term: "JSON schema", pattern: /\bJSON\s+schema\b/i },
  { term: "MCP server", pattern: /\bMCP\s+servers?\b/i },
  { term: "prompt template", pattern: /\bprompt\s+templates?\b/i },
  { term: "resource id", pattern: /\bresource\s+ids?\b/i },
  { term: "review_status", pattern: /\breview(?:[_ -]+)status\b/i },
  { term: "system mechanics", pattern: /\b(?:raw(?:[_ -]+))?system(?:[_ -]+)mechanics?\b/i },
  {
    term: "trace",
    pattern:
      /\b(?:agent|tool|tool(?:[_ -]+)call|debug|execution|export|implementation|schema|system)(?:[_ -]+)traces?\b|\btraces?\s+(?:details?|ids?|identifiers?|logs?|outputs?|payloads?)\b/i,
  },
  { term: "tool call", pattern: /\btool(?:[_ -]+)calls?\b/i },
];

function finding(id, severity, message, evidence = {}) {
  return { id, severity, message, evidence };
}

function collectMatches(pattern, source) {
  return [...String(source).matchAll(pattern)].map((match) => match[0].trim());
}

function isIdentifierChar(char) {
  return /[\w$]/.test(char ?? "");
}

function isWordAt(source, index, word) {
  return (
    source.slice(index, index + word.length) === word &&
    !isIdentifierChar(source[index - 1]) &&
    !isIdentifierChar(source[index + word.length])
  );
}

function skipQuoted(source, index) {
  const quote = source[index];
  let current = index + 1;
  let escaped = false;

  while (current < source.length) {
    const char = source[current];

    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === quote) {
      return current + 1;
    }

    current += 1;
  }

  return current;
}

function skipLineComment(source, index) {
  let current = index + 2;

  while (current < source.length && source[current] !== "\n") {
    current += 1;
  }

  return current;
}

function skipBlockComment(source, index) {
  let current = index + 2;

  while (
    current < source.length &&
    !(source[current] === "*" && source[current + 1] === "/")
  ) {
    current += 1;
  }

  return Math.min(source.length, current + 2);
}

function skipWhitespaceAndComments(source, index) {
  let current = index;

  while (current < source.length) {
    const char = source[current];
    const next = source[current + 1];

    if (/\s/.test(char)) {
      current += 1;
    } else if (char === "/" && next === "/") {
      current = skipLineComment(source, current);
    } else if (char === "/" && next === "*") {
      current = skipBlockComment(source, current);
    } else {
      break;
    }
  }

  return current;
}

function readStringLiteral(source, index) {
  const quote = source[index];

  if (quote !== "\"" && quote !== "'") {
    return null;
  }

  let value = "";
  let current = index + 1;
  let escaped = false;

  while (current < source.length) {
    const char = source[current];

    if (escaped) {
      value += char;
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === quote) {
      return { value, end: current + 1 };
    } else {
      value += char;
    }

    current += 1;
  }

  return null;
}

function scanStaticImportSpecifier(source, index) {
  let current = skipWhitespaceAndComments(source, index);
  const bareSpecifier = readStringLiteral(source, current);

  if (bareSpecifier) {
    return bareSpecifier;
  }

  while (current < source.length) {
    const char = source[current];
    const next = source[current + 1];

    if (char === "\"" || char === "'" || char === "`") {
      current = skipQuoted(source, current);
      continue;
    }

    if (char === "/" && next === "/") {
      current = skipLineComment(source, current);
      continue;
    }

    if (char === "/" && next === "*") {
      current = skipBlockComment(source, current);
      continue;
    }

    if (char === ";") {
      return null;
    }

    if (isWordAt(source, current, "from")) {
      return readStringLiteral(source, skipWhitespaceAndComments(source, current + 4));
    }

    current += 1;
  }

  return null;
}

function scanDynamicImportSpecifier(source, index) {
  const current = skipWhitespaceAndComments(source, index + 1);
  return readStringLiteral(source, current);
}

function collectImportSpecifiers(source) {
  const sourceText = String(source ?? "");
  const specifiers = [];
  let index = 0;

  while (index < sourceText.length) {
    const char = sourceText[index];
    const next = sourceText[index + 1];

    if (char === "\"" || char === "'" || char === "`") {
      index = skipQuoted(sourceText, index);
      continue;
    }

    if (char === "/" && next === "/") {
      index = skipLineComment(sourceText, index);
      continue;
    }

    if (char === "/" && next === "*") {
      index = skipBlockComment(sourceText, index);
      continue;
    }

    if (isWordAt(sourceText, index, "import")) {
      const afterImport = skipWhitespaceAndComments(sourceText, index + "import".length);
      const result =
        sourceText[afterImport] === "("
          ? scanDynamicImportSpecifier(sourceText, afterImport)
          : scanStaticImportSpecifier(sourceText, afterImport);

      if (result) {
        specifiers.push(result.value);
        index = result.end;
        continue;
      }
    }

    index += 1;
  }

  return specifiers;
}

function hasPublicAdapterImport(source) {
  return collectImportSpecifiers(source).includes(PUBLIC_ADAPTER_IMPORT);
}

function statusFromFindings(findings) {
  return findings.length > 0 ? "failed" : "passed";
}

export function lintJudgmentKitPresentationSource(source, options = {}) {
  const sourceText = String(source ?? "");
  const findings = [];

  if (options.requireAdapterImport !== false && !hasPublicAdapterImport(sourceText)) {
    findings.push(
      finding(
        "missing_adapter_import",
        "High",
        "Generated deck source must import the JudgmentKit presentation-theme adapter.",
      ),
    );
  }

  const hexColors = collectMatches(HEX_COLOR_PATTERN, sourceText);
  if (hexColors.length > 0) {
    findings.push(
      finding(
        "raw_hex_color",
        "High",
        "Generated deck source must not use raw hex colors outside the adapter.",
        { matches: hexColors },
      ),
    );
  }

  const colorFunctions = collectMatches(CSS_COLOR_FUNCTION_PATTERN, sourceText);
  if (colorFunctions.length > 0) {
    findings.push(
      finding(
        "raw_css_color_function",
        "High",
        "Generated deck source must not use raw CSS color functions outside the adapter.",
        { matches: colorFunctions },
      ),
    );
  }

  const tailwindColors = collectMatches(TAILWIND_COLOR_CLASS_PATTERN, sourceText);
  if (tailwindColors.length > 0) {
    findings.push(
      finding(
        "tailwind_color_class",
        "Medium",
        "Generated deck source must use JudgmentKit PPTX theme slots instead of Tailwind color classes.",
        { matches: tailwindColors },
      ),
    );
  }

  const directFonts = collectMatches(DIRECT_FONT_PATTERN, sourceText);
  if (directFonts.length > 0) {
    findings.push(
      finding(
        "direct_font_family",
        "Medium",
        "Generated deck source must use registered JudgmentKit named styles instead of direct font families.",
        { matches: directFonts },
      ),
    );
  }

  return {
    status: statusFromFindings(findings),
    findings,
  };
}

function styleIdsFromEvidence(evidence) {
  return evidence.theme?.style_ids ?? evidence.theme?.styleIds ?? null;
}

function slideStringEntries(value, path = []) {
  if (typeof value === "string") {
    return [{ path: path.join("."), value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => slideStringEntries(entry, [...path, index]));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) =>
      slideStringEntries(entry, [...path, key]),
    );
  }

  return [];
}

function reviewSlideDisclosure(slides) {
  if (!Array.isArray(slides) || slides.length === 0) {
    return [
      finding(
        "missing_slide_text",
        "High",
        "Presentation evidence must include extracted primary slide text so disclosure review can run.",
      ),
    ];
  }

  const entries = slides.flatMap((slide, slideIndex) =>
    slideStringEntries(slide).map((entry) => ({ ...entry, slideIndex })),
  ).filter((entry) => entry.value.trim().length > 0);

  if (entries.length === 0) {
    return [
      finding(
        "missing_slide_text",
        "High",
        "Presentation evidence must include extracted primary slide text so disclosure review can run.",
      ),
    ];
  }

  const matches = [];

  for (const entry of entries) {
    for (const rule of SLIDE_DISCLOSURE_PATTERNS) {
      if (rule.pattern.test(entry.value)) {
        matches.push({
          slide_index: entry.slideIndex,
          path: entry.path || String(entry.slideIndex),
          term: rule.term,
        });
      }
    }
  }

  if (matches.length === 0) {
    return [];
  }

  return [
    finding(
      "slide_disclosure_leak",
      "High",
      "Presentation slide evidence must not expose implementation or review machinery in primary slide copy.",
      {
        matches: matches.slice(0, 20),
        omitted: Math.max(0, matches.length - 20),
      },
    ),
  ];
}

export function reviewJudgmentKitPresentationEvidence(evidence = {}) {
  const findings = [];

  if (!evidence.source) {
    findings.push(
      finding(
        "missing_source",
        "High",
        "Presentation evidence must include generated source so the adapter import and off-token styles can be audited.",
      ),
    );
  }

  const sourceReview = evidence.source
    ? lintJudgmentKitPresentationSource(evidence.source)
    : { status: "skipped", findings: [] };

  findings.push(...sourceReview.findings);
  findings.push(...reviewSlideDisclosure(evidence.slides));

  try {
    assertCompleteThemeColors(
      evidence.theme?.color_scheme ??
        evidence.theme?.colorScheme?.themeColors ??
        evidence.theme?.themeColors,
      "presentation evidence theme colors",
    );
  } catch (error) {
    findings.push(
      finding("incomplete_theme_colors", "High", error.message),
    );
  }

  const styleIds = styleIdsFromEvidence(evidence);
  if (!Array.isArray(styleIds) || styleIds.length === 0) {
    findings.push(
      finding(
        "missing_style_ids",
        "High",
        "Presentation evidence must include extracted JudgmentKit named style ids.",
      ),
    );
  } else {
    const styleNames = new Set(styleIds);

    for (const styleName of [JUDGMENTKIT_STYLE_NAMES.title, JUDGMENTKIT_STYLE_NAMES.body]) {
      if (!styleNames.has(styleName)) {
        findings.push(
          finding(
            "missing_required_text_style",
            "High",
            `Presentation evidence is missing required text style ${styleName}.`,
          ),
        );
      }
    }
  }

  if (!evidence.artifact?.path && !evidence.deck_path) {
    findings.push(
      finding(
        "missing_artifact_path",
        "High",
        "Presentation evidence must include the exported PPTX artifact path.",
      ),
    );
  }

  return {
    status: statusFromFindings(findings),
    acceptance_status: findings.length > 0 ? "rejected" : "accepted",
    source_lint: sourceReview,
    findings,
  };
}

export function createJudgmentKitPresentationEvidence(input = {}) {
  const styleIds = input.theme?.style_ids ?? input.theme?.styleIds;
  const evidence = {
    adapter: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
    artifact: input.artifact ?? { path: input.deck_path, kind: "pptx" },
    source: input.source,
    theme: {
      id: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST.id,
      color_scheme:
        input.theme?.color_scheme ??
        input.theme?.colorScheme?.themeColors ??
        input.theme?.themeColors,
      style_ids: styleIds,
      fallback_policy: "fail_incomplete",
    },
    checks: input.checks ?? {},
    slides: input.slides ?? [],
  };

  return {
    ...evidence,
    review: reviewJudgmentKitPresentationEvidence(evidence),
  };
}

export function createJudgmentKitPresentationAcceptanceEvidence(input = {}) {
  const evidence = createJudgmentKitPresentationEvidence(input);

  return {
    ...evidence,
    status: evidence.review.status,
    acceptance_status: evidence.review.acceptance_status,
  };
}

export const REQUIRED_JUDGMENTKIT_PPTX_THEME_SLOTS = JUDGMENTKIT_THEME_COLOR_SLOTS;
