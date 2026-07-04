import * as layout from "./layout.mjs";
import {
  JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
  JUDGMENTKIT_SLIDE_SIZE,
} from "./tokens.mjs";
import { JUDGMENTKIT_STYLE_NAMES } from "./styles.mjs";

const BORDER_COLOR_SLOT = "accent6";

function toComposeFrame(frameValue = layout.contentFrame()) {
  const frame = layout.normalizeFrame(frameValue);

  return {
    position: { left: frame.x, top: frame.y },
    width: frame.width,
    height: frame.height,
  };
}

function requireHelper(helpers, name) {
  if (typeof helpers?.[name] !== "function") {
    throw new Error(
      `JudgmentKit presentation component factories require artifact-tool helper "${name}". Pass helpers from @oai/artifact-tool to createJudgmentKitDeckKit({ helpers }).`,
    );
  }

  return helpers[name];
}

function textLines(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => entry !== undefined && entry !== null).map(String);
  }

  return value === undefined || value === null ? [] : [String(value)];
}

function estimateLineCount(lines, width, fontSize) {
  const content = textLines(lines);
  const charactersPerLine = Math.max(1, Math.floor(width / (fontSize * 0.54)));

  return Math.max(
    1,
    ...content.map((line) => Math.max(1, Math.ceil(line.length / charactersPerLine))),
  );
}

function normalizeTableRows(rows = []) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const values = sourceRows.map((row) => {
    const cells = Array.isArray(row) ? row : [row];
    return cells.map((cell) => (cell === undefined || cell === null ? "" : String(cell)));
  });
  const columns = Math.max(1, ...values.map((row) => row.length), 1);
  const normalizedValues =
    values.length > 0 ? values : [Array.from({ length: columns }, () => "")];

  return {
    rows: normalizedValues.length,
    columns,
    values: normalizedValues.map((row) => [
      ...row,
      ...Array.from({ length: columns - row.length }, () => ""),
    ]),
  };
}

function statusStyle(status = "receipt") {
  if (status === "success") {
    return JUDGMENTKIT_STYLE_NAMES.statusSuccess;
  }

  if (status === "warning") {
    return JUDGMENTKIT_STYLE_NAMES.statusWarning;
  }

  if (status === "risk") {
    return JUDGMENTKIT_STYLE_NAMES.statusRisk;
  }

  return JUDGMENTKIT_STYLE_NAMES.statusReceipt;
}

function statusAccent(status = "receipt") {
  if (status === "success") {
    return "accent3";
  }

  if (status === "warning") {
    return "accent4";
  }

  if (status === "risk") {
    return "accent5";
  }

  return "accent2";
}

function isLayoutApi(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.contentFrame === "function" &&
      typeof value.frame === "function" &&
      typeof value.normalizeFrame === "function",
  );
}

function resolveKitSlideSize(options = {}, presentation) {
  return (
    options.slideSize ??
    options.slide_size ??
    presentation?.slideSize ??
    presentation?.slide_size ??
    presentation?.createOptions?.slideSize ??
    options.presentationOptions?.slideSize ??
    options.presentationOptions?.slide_size ??
    JUDGMENTKIT_SLIDE_SIZE
  );
}

export function createJudgmentKitComponentFactories(options = {}) {
  const helpers = options.helpers ?? options;
  const kitLayout =
    (isLayoutApi(options.layout) ? options.layout : undefined) ??
    layout.createJudgmentKitLayout({
      slideSize: resolveKitSlideSize(options),
    });
  const factories = {
    titleBlock({
      name = "judgmentkit-title-block",
      eyebrow,
      title,
      subtitle,
      frame = kitLayout.contentFrame(),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const text = requireHelper(helpers, "text");
      const blockFrame = kitLayout.normalizeFrame(frame);
      const titleFrame = kitLayout.inset(blockFrame, { top: 42, right: 0, bottom: 0, left: 0 });
      const blockBottom = blockFrame.y + blockFrame.height;
      const titleHeight = subtitle
        ? Math.min(150, Math.max(72, blockBottom - titleFrame.y - 120))
        : Math.min(150, Math.max(72, blockBottom - titleFrame.y));
      const subtitleTop = titleFrame.y + titleHeight + 20;
      const subtitleFrame = kitLayout.frame(
        titleFrame.x,
        subtitleTop,
        Math.min(680, titleFrame.width),
        Math.max(0, Math.min(100, blockBottom - subtitleTop)),
      );

      return layers({ name, width: "fill", height: "fill" }, [
        ...(eyebrow
          ? [
              text(textLines(eyebrow), {
                name: `${name}-eyebrow`,
                ...toComposeFrame(kitLayout.frame(blockFrame.x, blockFrame.y, blockFrame.width, 28)),
                style: JUDGMENTKIT_STYLE_NAMES.label,
              }),
            ]
          : []),
        text(textLines(title), {
          name: `${name}-title`,
          ...toComposeFrame(kitLayout.frame(titleFrame.x, titleFrame.y, titleFrame.width, titleHeight)),
          style: JUDGMENTKIT_STYLE_NAMES.display,
        }),
        ...(subtitle
          ? [
              text(textLines(subtitle), {
                name: `${name}-subtitle`,
                ...toComposeFrame(subtitleFrame),
                style: JUDGMENTKIT_STYLE_NAMES.subtitle,
              }),
            ]
          : []),
      ]);
    },

    sectionHeader({
      name = "judgmentkit-section-header",
      label,
      title,
      frame = kitLayout.frame(
        kitLayout.contentFrame().x,
        48,
        kitLayout.contentFrame().width,
        88,
      ),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const text = requireHelper(helpers, "text");
      const headerFrame = kitLayout.normalizeFrame(frame);
      const titleTop = headerFrame.y + (label ? 30 : 0);
      const titleHeight = Math.max(
        58,
        estimateLineCount(title, headerFrame.width, 38) * 48,
        headerFrame.y + headerFrame.height - titleTop,
      );

      return layers({ name, width: "fill", height: "fill" }, [
        ...(label
          ? [
              text(textLines(label), {
                name: `${name}-label`,
                ...toComposeFrame(kitLayout.frame(headerFrame.x, headerFrame.y, headerFrame.width, 24)),
                style: JUDGMENTKIT_STYLE_NAMES.label,
              }),
            ]
          : []),
        text(textLines(title), {
          name: `${name}-title`,
          ...toComposeFrame(
            kitLayout.frame(
              headerFrame.x,
              titleTop,
              headerFrame.width,
              titleHeight,
            ),
          ),
          style: JUDGMENTKIT_STYLE_NAMES.title,
        }),
      ]);
    },

    evidencePanel({
      name = "judgmentkit-evidence-panel",
      title,
      body,
      frame = kitLayout.contentFrame(),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const shape = requireHelper(helpers, "shape");
      const text = requireHelper(helpers, "text");
      const panelFrame = kitLayout.normalizeFrame(frame);
      const inner = kitLayout.inset(panelFrame, 18);
      const titleLines = textLines(title);
      const bodyLines = textLines(body);
      const bodyTop = inner.y + (titleLines.length > 0 ? 48 : 0);
      const bodyHeight = Math.max(0, inner.y + inner.height - bodyTop);
      const shouldRenderBody = bodyLines.length > 0 && bodyHeight >= 24;

      return layers({ name, width: "fill", height: "fill" }, [
        shape({
          name: `${name}-surface`,
          geometry: "rect",
          ...toComposeFrame(panelFrame),
          fill: "bg2",
          line: { style: "solid", fill: BORDER_COLOR_SLOT, width: 1 },
          borderRadius: 8,
        }),
        ...(titleLines.length > 0
          ? [
              text(titleLines, {
                name: `${name}-title`,
                ...toComposeFrame(kitLayout.frame(inner.x, inner.y, inner.width, 34)),
                style: JUDGMENTKIT_STYLE_NAMES.sectionTitle,
              }),
            ]
          : []),
        ...(shouldRenderBody
          ? [
              text(bodyLines, {
                name: `${name}-body`,
                ...toComposeFrame(kitLayout.frame(inner.x, bodyTop, inner.width, bodyHeight)),
                style: JUDGMENTKIT_STYLE_NAMES.body,
              }),
            ]
          : []),
      ]);
    },

    metricTile({
      name = "judgmentkit-metric-tile",
      label,
      value,
      detail,
      frame = kitLayout.contentFrame(),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const shape = requireHelper(helpers, "shape");
      const text = requireHelper(helpers, "text");
      const tileFrame = kitLayout.normalizeFrame(frame);
      const inner = kitLayout.inset(tileFrame, 16);
      const detailLines = textLines(detail);
      const detailTop = inner.y + 104;
      const detailHeight = Math.max(0, inner.y + inner.height - detailTop);

      return layers({ name, width: "fill", height: "fill" }, [
        shape({
          name: `${name}-surface`,
          geometry: "rect",
          ...toComposeFrame(tileFrame),
          fill: "bg2",
          line: { style: "solid", fill: BORDER_COLOR_SLOT, width: 1 },
          borderRadius: 8,
        }),
        text(textLines(label), {
          name: `${name}-label`,
          ...toComposeFrame(kitLayout.frame(inner.x, inner.y, inner.width, 24)),
          style: JUDGMENTKIT_STYLE_NAMES.label,
        }),
        text(textLines(value), {
          name: `${name}-value`,
          ...toComposeFrame(kitLayout.frame(inner.x, inner.y + 34, inner.width, 62)),
          style: JUDGMENTKIT_STYLE_NAMES.metric,
        }),
        ...(detailLines.length > 0 && detailHeight >= 24
          ? [
              text(detailLines, {
                name: `${name}-detail`,
                ...toComposeFrame(kitLayout.frame(inner.x, detailTop, inner.width, detailHeight)),
                style: JUDGMENTKIT_STYLE_NAMES.bodySmall,
              }),
            ]
          : []),
      ]);
    },

    statusPill({
      name = "judgmentkit-status-pill",
      label,
      status = "receipt",
      frame = kitLayout.frame(0, 0, 180, 34),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const shape = requireHelper(helpers, "shape");
      const text = requireHelper(helpers, "text");
      const accent = statusAccent(status);
      const pillFrame = kitLayout.normalizeFrame(frame);

      return layers({ name, width: "fill", height: "fill" }, [
        shape({
          name: `${name}-surface`,
          geometry: "roundRect",
          ...toComposeFrame(pillFrame),
          fill: "bg2",
          line: { style: "solid", fill: accent, width: 1 },
          borderRadius: 8,
        }),
        text(textLines(label), {
          name: `${name}-label`,
          ...toComposeFrame(kitLayout.inset(pillFrame, { top: 7, right: 12, bottom: 6, left: 12 })),
          style: statusStyle(status),
        }),
      ]);
    },

    riskCallout(options = {}) {
      return factories.evidencePanel({
        name: options.name ?? "judgmentkit-risk-callout",
        title: options.title ?? "Risk",
        body: options.body,
        frame: options.frame,
      });
    },

    handoffReceipt(options = {}) {
      return factories.evidencePanel({
        name: options.name ?? "judgmentkit-handoff-receipt",
        title: options.title ?? "Handoff receipt",
        body: options.body,
        frame: options.frame,
      });
    },

    evidenceTable({
      name = "judgmentkit-evidence-table",
      rows = [],
      frame = kitLayout.contentFrame(),
    } = {}) {
      const table = helpers.table;
      const tableFrame = kitLayout.normalizeFrame(frame);

      if (typeof table === "function") {
        return table({
          name,
          ...toComposeFrame(tableFrame),
          style: JUDGMENTKIT_STYLE_NAMES.bodySmall,
          ...normalizeTableRows(rows),
        });
      }

      return factories.evidencePanel({
        name,
        title: "Evidence",
        body: rows.map((row) => row.join("  ")),
        frame: tableFrame,
      });
    },

    mediaFrame({
      name = "judgmentkit-media-frame",
      frame = kitLayout.contentFrame(),
      fill = "bg2",
    } = {}) {
      const shape = requireHelper(helpers, "shape");
      const mediaFrameValue = kitLayout.normalizeFrame(frame);

      return shape({
        name,
        geometry: "rect",
        ...toComposeFrame(mediaFrameValue),
        fill,
        line: { style: "solid", fill: BORDER_COLOR_SLOT, width: 1 },
        borderRadius: 8,
      });
    },
  };

  return factories;
}

export function createJudgmentKitDeckKit(presentationOrOptions, options = {}) {
  const objectForm =
    arguments.length === 1 &&
    presentationOrOptions &&
    typeof presentationOrOptions === "object" &&
    ("helpers" in presentationOrOptions || "presentation" in presentationOrOptions);
  const presentation = objectForm
    ? presentationOrOptions.presentation
    : presentationOrOptions;
  const normalizedOptions = objectForm ? presentationOrOptions : options;
  const kitLayout =
    (isLayoutApi(normalizedOptions.layout) ? normalizedOptions.layout : undefined) ??
    layout.createJudgmentKitLayout({
      slideSize: resolveKitSlideSize(normalizedOptions, presentation),
    });

  return {
    manifest: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
    presentation,
    layout: kitLayout,
    styleNames: JUDGMENTKIT_STYLE_NAMES,
    components: createJudgmentKitComponentFactories({
      ...normalizedOptions,
      helpers: normalizedOptions.helpers ?? normalizedOptions,
      layout: kitLayout,
    }),
  };
}
