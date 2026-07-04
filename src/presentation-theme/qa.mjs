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
const ADAPTER_IMPORT_PATTERN = /(?:from\s+["'][^"']*presentation-theme[^"']*["']|import\s*\([^)]*["'][^"']*presentation-theme[^"']*["'][^)]*\))/;

function finding(id, severity, message, evidence = {}) {
  return { id, severity, message, evidence };
}

function collectMatches(pattern, source) {
  return [...String(source).matchAll(pattern)].map((match) => match[0].trim());
}

function statusFromFindings(findings) {
  return findings.length > 0 ? "failed" : "passed";
}

export function lintJudgmentKitPresentationSource(source, options = {}) {
  const sourceText = String(source ?? "");
  const findings = [];

  if (options.requireAdapterImport !== false && !ADAPTER_IMPORT_PATTERN.test(sourceText)) {
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
