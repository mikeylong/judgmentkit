import {
  JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
  cloneJudgmentKitPresentationValue,
} from "./tokens.mjs";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

export const JUDGMENTKIT_STYLE_NAMES = deepFreeze({
  display: "JK.Display",
  title: "JK.SlideTitle",
  sectionTitle: "JK.SectionHeading",
  subtitle: "JK.Subtitle",
  body: "JK.Body",
  bodySmall: "JK.BodySmall",
  label: "JK.Label",
  caption: "JK.Caption",
  metric: "JK.Numeric",
  diagnostic: "JK.Diagnostic",
  link: "JK.Link",
  statusSuccess: "JK.Status.Success",
  statusWarning: "JK.Status.Warning",
  statusRisk: "JK.Status.Risk",
  statusReceipt: "JK.Status.Receipt",
});

export const JUDGMENTKIT_TEXT_STYLE_CONFIGS = deepFreeze({
  [JUDGMENTKIT_STYLE_NAMES.display]: {
    description: "JudgmentKit display title",
    usageHint: "Title slides, section openers, and major narrative pivots.",
    fontSize: 52,
    bold: true,
    color: "tx1",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.title]: {
    description: "JudgmentKit slide title",
    usageHint: "Primary title on a normal content slide.",
    fontSize: 38,
    bold: true,
    color: "tx1",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.sectionTitle]: {
    description: "JudgmentKit section title",
    usageHint: "Nested section headings and prominent work-area labels.",
    fontSize: 30,
    bold: true,
    color: "tx1",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.subtitle]: {
    description: "JudgmentKit subtitle",
    usageHint: "Deck subtitles, slide summaries, and supporting claims.",
    fontSize: 24,
    bold: false,
    color: "tx2",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.body]: {
    description: "JudgmentKit body",
    usageHint: "Readable explanatory text and evidence copy.",
    fontSize: 18,
    bold: false,
    color: "tx1",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.bodySmall]: {
    description: "JudgmentKit small body",
    usageHint: "Dense supporting text, notes, and table copy.",
    fontSize: 15,
    bold: false,
    color: "tx1",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.label]: {
    description: "JudgmentKit label",
    usageHint: "Metadata labels, eyebrow text, and compact controls.",
    fontSize: 12,
    bold: true,
    color: "tx2",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.caption]: {
    description: "JudgmentKit caption",
    usageHint: "Source notes, caveats, and secondary figure labels.",
    fontSize: 11,
    bold: false,
    color: "tx2",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.metric]: {
    description: "JudgmentKit metric",
    usageHint: "Large values, counts, and outcome numbers.",
    fontSize: 42,
    bold: true,
    color: "tx1",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.diagnostic]: {
    description: "JudgmentKit diagnostic",
    usageHint:
      "Diagnostic-only identifiers, logs, and code in allowed contexts.",
    fontSize: 13,
    bold: false,
    color: "tx2",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.link]: {
    description: "JudgmentKit link",
    usageHint: "Readable citations and linked references.",
    fontSize: 15,
    bold: false,
    color: "hlink",
    underline: "single",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.statusSuccess]: {
    description: "JudgmentKit success status",
    usageHint: "Approved, completed, and successful states.",
    fontSize: 14,
    bold: true,
    color: "accent3",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.statusWarning]: {
    description: "JudgmentKit warning status",
    usageHint: "Warning, waiting, and needs-attention states.",
    fontSize: 14,
    bold: true,
    color: "accent4",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.statusRisk]: {
    description: "JudgmentKit risk status",
    usageHint: "Risk, escalation, and destructive-action states.",
    fontSize: 14,
    bold: true,
    color: "accent5",
    alignment: "left",
  },
  [JUDGMENTKIT_STYLE_NAMES.statusReceipt]: {
    description: "JudgmentKit receipt status",
    usageHint: "Handoff receipts and completion confirmation.",
    fontSize: 14,
    bold: true,
    color: "accent2",
    alignment: "left",
  },
});

const NAMED_STYLE_FIELDS = [
  "description",
  "usageHint",
  "bold",
  "italic",
  "fontSize",
  "alignment",
  "underline",
  "color",
];

function isObject(value) {
  return Boolean(value && typeof value === "object");
}

function styleNameFromKey(key) {
  return JUDGMENTKIT_STYLE_NAMES[key] ?? key;
}

function assignNamedStyle(namedStyle, config) {
  for (const field of NAMED_STYLE_FIELDS) {
    if (Object.hasOwn(config, field)) {
      namedStyle[field] = config[field];
    }
  }

  return namedStyle;
}

function fallbackStyleRegistration(presentation, textStyleConfigs) {
  try {
    Object.defineProperty(presentation, "judgmentKitTextStyles", {
      value: cloneJudgmentKitPresentationValue(textStyleConfigs),
      configurable: true,
      enumerable: false,
      writable: true,
    });
    return true;
  } catch {
    return false;
  }
}

export function createJudgmentKitTextStyleConfigs(options = {}) {
  const textStyleConfigs = cloneJudgmentKitPresentationValue(
    JUDGMENTKIT_TEXT_STYLE_CONFIGS,
  );
  const overrides = options.textStyleConfigs ?? options.textStyles ?? {};

  for (const [key, value] of Object.entries(overrides)) {
    if (!isObject(value)) {
      continue;
    }

    const styleName = styleNameFromKey(key);
    textStyleConfigs[styleName] = {
      ...(textStyleConfigs[styleName] ?? {}),
      ...cloneJudgmentKitPresentationValue(value),
    };
  }

  return textStyleConfigs;
}

export function registerJudgmentKitStyles(presentation, options = {}) {
  if (!isObject(presentation)) {
    throw new Error(
      "registerJudgmentKitStyles requires an artifact-tool presentation object.",
    );
  }

  const textStyleConfigs = createJudgmentKitTextStyleConfigs(options);
  const registeredSurfaces = [];

  if (typeof presentation.theme?.textStyles === "function") {
    presentation.theme.textStyles(textStyleConfigs);
    registeredSurfaces.push("presentation.theme.textStyles");
  }

  if (typeof presentation.styles?.add === "function") {
    for (const [styleName, config] of Object.entries(textStyleConfigs)) {
      let namedStyle;

      if (typeof presentation.styles.get === "function") {
        try {
          namedStyle = presentation.styles.get(styleName);
        } catch {
          namedStyle = undefined;
        }
      }

      if (!namedStyle) {
        namedStyle = presentation.styles.add(styleName);
      }

      assignNamedStyle(namedStyle, config);
    }

    registeredSurfaces.push("presentation.styles");
  }

  if (registeredSurfaces.length === 0) {
    const registeredFallback = fallbackStyleRegistration(
      presentation,
      textStyleConfigs,
    );

    if (registeredFallback) {
      registeredSurfaces.push("presentation.judgmentKitTextStyles");
    } else if (options.strict) {
      throw new Error(
        "registerJudgmentKitStyles could not find artifact-tool style APIs on the presentation.",
      );
    }
  }

  try {
    Object.defineProperty(presentation, "judgmentKitStyleRegistration", {
      value: {
        manifest: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
        styleNames: cloneJudgmentKitPresentationValue(JUDGMENTKIT_STYLE_NAMES),
        registeredSurfaces,
      },
      configurable: true,
      enumerable: false,
      writable: true,
    });
  } catch {
    // Metadata is helpful for callers, but style registration is the contract.
  }

  return presentation;
}
