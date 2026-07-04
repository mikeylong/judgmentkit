const THEME_COLOR_SLOTS = [
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "bg1",
  "bg2",
  "tx1",
  "tx2",
  "dk1",
  "dk2",
  "lt1",
  "lt2",
  "hlink",
  "folHlink",
];

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

export function cloneJudgmentKitPresentationValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneJudgmentKitPresentationValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        cloneJudgmentKitPresentationValue(entry),
      ]),
    );
  }

  return value;
}

export const JUDGMENTKIT_SLIDE_SIZE = deepFreeze({
  width: 1280,
  height: 720,
});

export const JUDGMENTKIT_COLOR_TOKENS = deepFreeze({
  light: {
    canvas: "#f8f7f2",
    surface: "#ffffff",
    text: "#171717",
    muted: "#61615c",
    border: "#d7d3c8",
    focus: "#245f73",
    success: "#2e6b48",
    warning: "#8a5a16",
    risk: "#8f342f",
    disabled: "#8a8f93",
    receipt: "#23615f",
  },
  dark: {
    canvas: "#101312",
    surface: "#181d1b",
    text: "#f2f4ef",
    muted: "#b8c0bb",
    border: "#39423f",
    focus: "#7db6c7",
    success: "#82c99a",
    warning: "#e0b15d",
    risk: "#e37d76",
    disabled: "#7d8580",
    receipt: "#80cbc7",
  },
});

export const JUDGMENTKIT_CSS_CUSTOM_PROPERTIES = deepFreeze({
  light: {
    "--jk-color-canvas": JUDGMENTKIT_COLOR_TOKENS.light.canvas,
    "--jk-color-surface": JUDGMENTKIT_COLOR_TOKENS.light.surface,
    "--jk-color-text": JUDGMENTKIT_COLOR_TOKENS.light.text,
    "--jk-color-muted": JUDGMENTKIT_COLOR_TOKENS.light.muted,
    "--jk-color-border": JUDGMENTKIT_COLOR_TOKENS.light.border,
    "--jk-color-focus": JUDGMENTKIT_COLOR_TOKENS.light.focus,
    "--jk-color-success": JUDGMENTKIT_COLOR_TOKENS.light.success,
    "--jk-color-warning": JUDGMENTKIT_COLOR_TOKENS.light.warning,
    "--jk-color-risk": JUDGMENTKIT_COLOR_TOKENS.light.risk,
    "--jk-color-disabled": JUDGMENTKIT_COLOR_TOKENS.light.disabled,
    "--jk-color-receipt": JUDGMENTKIT_COLOR_TOKENS.light.receipt,
  },
  dark: {
    "--jk-color-canvas": JUDGMENTKIT_COLOR_TOKENS.dark.canvas,
    "--jk-color-surface": JUDGMENTKIT_COLOR_TOKENS.dark.surface,
    "--jk-color-text": JUDGMENTKIT_COLOR_TOKENS.dark.text,
    "--jk-color-muted": JUDGMENTKIT_COLOR_TOKENS.dark.muted,
    "--jk-color-border": JUDGMENTKIT_COLOR_TOKENS.dark.border,
    "--jk-color-focus": JUDGMENTKIT_COLOR_TOKENS.dark.focus,
    "--jk-color-success": JUDGMENTKIT_COLOR_TOKENS.dark.success,
    "--jk-color-warning": JUDGMENTKIT_COLOR_TOKENS.dark.warning,
    "--jk-color-risk": JUDGMENTKIT_COLOR_TOKENS.dark.risk,
    "--jk-color-disabled": JUDGMENTKIT_COLOR_TOKENS.dark.disabled,
    "--jk-color-receipt": JUDGMENTKIT_COLOR_TOKENS.dark.receipt,
  },
});

export const JUDGMENTKIT_THEME_COLOR_SLOTS = deepFreeze([
  ...THEME_COLOR_SLOTS,
]);

export const JUDGMENTKIT_PPTX_THEME_COLOR_ROLE_MAP = deepFreeze({
  accent1: "focus",
  accent2: "receipt",
  accent3: "success",
  accent4: "warning",
  accent5: "risk",
  accent6: "border",
  bg1: "canvas",
  bg2: "surface",
  tx1: "text",
  tx2: "muted",
  dk1: "text",
  dk2: "muted",
  lt1: "canvas",
  lt2: "surface",
  hlink: "focus",
  folHlink: "receipt",
});

function createThemeColorsFromTokens(tokens) {
  return Object.fromEntries(
    THEME_COLOR_SLOTS.map((slot) => [
      slot,
      tokens[JUDGMENTKIT_PPTX_THEME_COLOR_ROLE_MAP[slot]],
    ]),
  );
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function normalizeThemeColorHex(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : value;
}

function normalizeThemeColorValues(themeColors) {
  return Object.fromEntries(
    Object.entries(themeColors ?? {}).map(([slot, value]) => [
      slot,
      normalizeThemeColorHex(value),
    ]),
  );
}

function syncPowerPointAliasPair(themeColors, overrides, primarySlot, aliasSlot) {
  const primaryOverridden = hasOwn(overrides, primarySlot);
  const aliasOverridden = hasOwn(overrides, aliasSlot);
  const primaryOverride = normalizeThemeColorHex(overrides?.[primarySlot]);
  const aliasOverride = normalizeThemeColorHex(overrides?.[aliasSlot]);

  if (
    primaryOverridden &&
    aliasOverridden &&
    typeof primaryOverride === "string" &&
    typeof aliasOverride === "string" &&
    primaryOverride !== aliasOverride
  ) {
    throw new Error(
      `JudgmentKit PPTX theme colors must keep PowerPoint alias slots ${primarySlot} and ${aliasSlot} equal. Override one slot, or set both to the same hex color.`,
    );
  }

  if (primaryOverridden) {
    themeColors[aliasSlot] = themeColors[primarySlot];
  } else if (aliasOverridden) {
    themeColors[primarySlot] = themeColors[aliasSlot];
  }
}

function syncPowerPointAliasSlots(themeColors, overrides) {
  syncPowerPointAliasPair(themeColors, overrides, "bg1", "lt1");
  syncPowerPointAliasPair(themeColors, overrides, "bg2", "lt2");
  syncPowerPointAliasPair(themeColors, overrides, "tx1", "dk1");
  syncPowerPointAliasPair(themeColors, overrides, "tx2", "dk2");

  return themeColors;
}

export const JUDGMENTKIT_PPTX_THEME_COLORS = deepFreeze(
  createThemeColorsFromTokens(JUDGMENTKIT_COLOR_TOKENS.light),
);

export const JUDGMENTKIT_PPTX_DARK_THEME_COLORS = deepFreeze(
  createThemeColorsFromTokens(JUDGMENTKIT_COLOR_TOKENS.dark),
);

export const JUDGMENTKIT_PPTX_THEME_COLOR_SCHEMES = deepFreeze({
  light: JUDGMENTKIT_PPTX_THEME_COLORS,
  dark: JUDGMENTKIT_PPTX_DARK_THEME_COLORS,
});

export const JUDGMENTKIT_PPTX_THEME_NAMES = deepFreeze({
  light: "JudgmentKit Light",
  dark: "JudgmentKit Dark",
});

export const JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST = deepFreeze({
  id: "judgmentkit.presentation-theme.adapter-v1",
  name: "JudgmentKit PPTX Theme Adapter",
  version: "0.1.0",
  source: "src/index.mjs DEFAULT_VISUAL_TOKEN_ADAPTER",
  visual_token_authority: {
    module_path: "src/index.mjs",
    symbol: "DEFAULT_VISUAL_TOKEN_ADAPTER",
    id: "judgmentkit.visual-token-adapter.boundary-v1",
    mode: "boundary_only",
  },
  runtime: "@oai/artifact-tool",
  dependency_policy:
    "dependency-free adapter; callers inject Presentation or presentation",
  slide_size: JUDGMENTKIT_SLIDE_SIZE,
  theme_color_slots: JUDGMENTKIT_THEME_COLOR_SLOTS,
  theme_color_role_map: JUDGMENTKIT_PPTX_THEME_COLOR_ROLE_MAP,
  token_sets: {
    light: JUDGMENTKIT_CSS_CUSTOM_PROPERTIES.light,
    dark: JUDGMENTKIT_CSS_CUSTOM_PROPERTIES.dark,
  },
  exports: [
    "createJudgmentKitPresentation",
    "applyJudgmentKitPptxTheme",
    "registerJudgmentKitStyles",
    "createJudgmentKitDeckKit",
    "createJudgmentKitLayout",
    "JUDGMENTKIT_SLIDE_SIZE",
    "JUDGMENTKIT_PPTX_THEME_COLORS",
    "JUDGMENTKIT_TEXT_STYLE_CONFIGS",
    "JUDGMENTKIT_STYLE_NAMES",
    "JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST",
    "JUDGMENTKIT_PPTX_THEME_ADAPTER_MANIFEST",
  ],
});

export const JUDGMENTKIT_PPTX_THEME_ADAPTER_MANIFEST =
  JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST;
export const adapterManifest = JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST;

export function resolveJudgmentKitThemeMode(options = {}) {
  const input =
    typeof options === "string"
      ? options
      : options.themeMode ??
        options.mode ??
        options.appearance ??
        options.colorMode ??
        (options.dark ? "dark" : "light");
  const normalized = String(input || "light").toLowerCase();

  if (normalized === "dark" || normalized === "night") {
    return "dark";
  }

  if (normalized === "system") {
    const resolved = String(
      options.resolvedThemeMode ?? options.resolvedMode ?? "light",
    ).toLowerCase();
    return resolved === "dark" ? "dark" : "light";
  }

  return "light";
}

export function assertCompleteThemeColors(
  themeColors,
  context = "themeColors",
) {
  const missingSlots = THEME_COLOR_SLOTS.filter((slot) => !themeColors?.[slot]);

  if (missingSlots.length > 0) {
    throw new Error(
      `${context} must define a complete artifact-tool color scheme. Missing: ${missingSlots.join(
        ", ",
      )}.`,
    );
  }

  const invalidSlots = THEME_COLOR_SLOTS.filter(
    (slot) =>
      typeof themeColors?.[slot] !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(themeColors[slot]),
  );

  if (invalidSlots.length > 0) {
    throw new Error(
      `${context} must define theme colors as 6-digit hex strings. Invalid: ${invalidSlots.join(
        ", ",
      )}.`,
    );
  }

  return themeColors;
}

export function createJudgmentKitColorScheme(options = {}) {
  const normalizedOptions =
    typeof options === "string" ? { mode: options } : options || {};
  const mode = resolveJudgmentKitThemeMode(normalizedOptions);
  const baseThemeColors = cloneJudgmentKitPresentationValue(
    JUDGMENTKIT_PPTX_THEME_COLOR_SCHEMES[mode],
  );
  const overrides =
    normalizedOptions.themeColors ??
    normalizedOptions.theme_colors ??
    normalizedOptions.colorScheme?.themeColors ??
    normalizedOptions.color_scheme?.themeColors ??
    {};
  const normalizedOverrides = normalizeThemeColorValues(
    cloneJudgmentKitPresentationValue(overrides),
  );
  const themeColors = syncPowerPointAliasSlots({
    ...normalizeThemeColorValues(baseThemeColors),
    ...normalizedOverrides,
  }, normalizedOverrides);

  assertCompleteThemeColors(themeColors, "JudgmentKit PPTX theme colors");

  return {
    name:
      normalizedOptions.themeName ??
      normalizedOptions.name ??
      JUDGMENTKIT_PPTX_THEME_NAMES[mode],
    themeColors,
  };
}
