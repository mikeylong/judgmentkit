import {
  JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
  JUDGMENTKIT_SLIDE_SIZE,
  cloneJudgmentKitPresentationValue,
  createJudgmentKitColorScheme,
} from "./tokens.mjs";
import layoutApi from "./layout.mjs";
import { createJudgmentKitDeckKit } from "./components.mjs";
import { registerJudgmentKitStyles } from "./styles.mjs";

function isObject(value) {
  return Boolean(value && typeof value === "object");
}

function normalizeOptions(options = {}) {
  if (isObject(options) && options.artifactTool) {
    return {
      ...options.artifactTool,
      ...options,
      helpers: options.helpers ?? options.artifactTool,
    };
  }

  if (isObject(options) && (options.Presentation || options.presentation)) {
    return options;
  }

  return options ?? {};
}

function assignPresentationMetadata(presentation, metadata) {
  try {
    Object.defineProperty(presentation, "judgmentKitPresentationTheme", {
      value: metadata,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  } catch {
    // Metadata is useful for audits, but theme application is the contract.
  }
}

function resolveCreateSlideSize(options, presentationOptions) {
  return layoutApi.resolveSlideSize(
    [
      options.slideSize,
      options.slide_size,
      presentationOptions.slideSize,
      presentationOptions.slide_size,
    ],
    JUDGMENTKIT_SLIDE_SIZE,
  );
}

function createPresentationInstance(options) {
  if (options.presentation) {
    return { presentation: options.presentation, requestedSlideSize: undefined };
  }

  const Presentation = options.Presentation;

  if (!Presentation || typeof Presentation.create !== "function") {
    throw new Error(
      "createJudgmentKitPresentation requires options.Presentation from @oai/artifact-tool, or an existing options.presentation.",
    );
  }

  const presentationOptions = { ...(options.presentationOptions ?? {}) };
  const slideSize = resolveCreateSlideSize(options, presentationOptions);

  delete presentationOptions.slide_size;

  return {
    presentation: Presentation.create({
      ...presentationOptions,
      slideSize: cloneJudgmentKitPresentationValue(slideSize),
    }),
    requestedSlideSize: slideSize,
  };
}

export function applyJudgmentKitPptxTheme(presentation, options = {}) {
  if (!isObject(presentation)) {
    throw new Error(
      "applyJudgmentKitPptxTheme requires an artifact-tool presentation object.",
    );
  }

  const colorScheme = createJudgmentKitColorScheme(options);

  if (!isObject(presentation.theme)) {
    if (options.strict) {
      throw new Error(
        "applyJudgmentKitPptxTheme could not find presentation.theme on the artifact-tool presentation.",
      );
    }

    presentation.theme = {};
  }

  presentation.theme.colorScheme = colorScheme;
  registerJudgmentKitStyles(presentation, options);

  assignPresentationMetadata(presentation, {
    adapter: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
    colorScheme,
    mode: colorScheme.name.toLowerCase().includes("dark") ? "dark" : "light",
    applied_at: new Date(0).toISOString(),
  });

  return presentation;
}

export function createJudgmentKitPresentation(options = {}) {
  const normalizedOptions = normalizeOptions(options);
  const { presentation, requestedSlideSize } = createPresentationInstance(normalizedOptions);

  applyJudgmentKitPptxTheme(presentation, normalizedOptions);

  return {
    presentation,
    manifest: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
    kit: createJudgmentKitDeckKit(presentation, {
      ...normalizedOptions,
      createdSlideSize: requestedSlideSize,
    }),
  };
}
