import * as layout from "./layout.mjs";
import { JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST } from "./tokens.mjs";
import { JUDGMENTKIT_STYLE_NAMES } from "./styles.mjs";

function toPx(value) {
  return typeof value === "number" ? `${value}px` : value;
}

function toComposeFrame(frameValue = layout.contentFrame()) {
  return {
    left: toPx(frameValue.left ?? frameValue.x ?? 0),
    top: toPx(frameValue.top ?? frameValue.y ?? 0),
    width: toPx(frameValue.width ?? frameValue.w ?? 0),
    height: toPx(frameValue.height ?? frameValue.h ?? 0),
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

export function createJudgmentKitComponentFactories(options = {}) {
  const helpers = options.helpers ?? options;
  const factories = {
    titleBlock({
      name = "judgmentkit-title-block",
      eyebrow,
      title,
      subtitle,
      frame = layout.contentFrame(),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const text = requireHelper(helpers, "text");
      const titleFrame = layout.inset(frame, { top: 42, right: 0, bottom: 0, left: 0 });
      const subtitleFrame = layout.frame(
        titleFrame.x,
        titleFrame.y + 170,
        Math.min(680, titleFrame.width),
        100,
      );

      return layers({ name, width: "fill", height: "fill" }, [
        ...(eyebrow
          ? [
              text(textLines(eyebrow), {
                name: `${name}-eyebrow`,
                ...toComposeFrame(layout.frame(frame.x, frame.y, frame.width, 28)),
                style: JUDGMENTKIT_STYLE_NAMES.label,
              }),
            ]
          : []),
        text(textLines(title), {
          name: `${name}-title`,
          ...toComposeFrame(layout.frame(titleFrame.x, titleFrame.y, titleFrame.width, 150)),
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
      frame = layout.frame(72, 48, 1136, 88),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const text = requireHelper(helpers, "text");

      return layers({ name, width: "fill", height: "fill" }, [
        ...(label
          ? [
              text(textLines(label), {
                name: `${name}-label`,
                ...toComposeFrame(layout.frame(frame.x, frame.y, frame.width, 24)),
                style: JUDGMENTKIT_STYLE_NAMES.label,
              }),
            ]
          : []),
        text(textLines(title), {
          name: `${name}-title`,
          ...toComposeFrame(layout.frame(frame.x, frame.y + (label ? 30 : 0), frame.width, 58)),
          style: JUDGMENTKIT_STYLE_NAMES.title,
        }),
      ]);
    },

    evidencePanel({
      name = "judgmentkit-evidence-panel",
      title,
      body,
      frame = layout.contentFrame(),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const shape = requireHelper(helpers, "shape");
      const text = requireHelper(helpers, "text");
      const inner = layout.inset(frame, 18);

      return layers({ name, width: "fill", height: "fill" }, [
        shape({
          name: `${name}-surface`,
          geometry: "rect",
          ...toComposeFrame(frame),
          fill: "bg2",
          line: { style: "solid", fill: "lt2", width: 1 },
          borderRadius: 8,
        }),
        text(textLines(title), {
          name: `${name}-title`,
          ...toComposeFrame(layout.frame(inner.x, inner.y, inner.width, 34)),
          style: JUDGMENTKIT_STYLE_NAMES.sectionTitle,
        }),
        text(textLines(body), {
          name: `${name}-body`,
          ...toComposeFrame(layout.frame(inner.x, inner.y + 48, inner.width, inner.height - 48)),
          style: JUDGMENTKIT_STYLE_NAMES.body,
        }),
      ]);
    },

    metricTile({
      name = "judgmentkit-metric-tile",
      label,
      value,
      detail,
      frame = layout.contentFrame(),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const shape = requireHelper(helpers, "shape");
      const text = requireHelper(helpers, "text");
      const inner = layout.inset(frame, 16);

      return layers({ name, width: "fill", height: "fill" }, [
        shape({
          name: `${name}-surface`,
          geometry: "rect",
          ...toComposeFrame(frame),
          fill: "bg2",
          line: { style: "solid", fill: "lt2", width: 1 },
          borderRadius: 8,
        }),
        text(textLines(label), {
          name: `${name}-label`,
          ...toComposeFrame(layout.frame(inner.x, inner.y, inner.width, 24)),
          style: JUDGMENTKIT_STYLE_NAMES.label,
        }),
        text(textLines(value), {
          name: `${name}-value`,
          ...toComposeFrame(layout.frame(inner.x, inner.y + 34, inner.width, 62)),
          style: JUDGMENTKIT_STYLE_NAMES.metric,
        }),
        ...(detail
          ? [
              text(textLines(detail), {
                name: `${name}-detail`,
                ...toComposeFrame(layout.frame(inner.x, inner.y + 104, inner.width, 46)),
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
      frame = layout.frame(0, 0, 180, 34),
    } = {}) {
      const layers = requireHelper(helpers, "layers");
      const shape = requireHelper(helpers, "shape");
      const text = requireHelper(helpers, "text");
      const accent = statusAccent(status);

      return layers({ name, width: "fill", height: "fill" }, [
        shape({
          name: `${name}-surface`,
          geometry: "roundRect",
          ...toComposeFrame(frame),
          fill: "bg2",
          line: { style: "solid", fill: accent, width: 1 },
          borderRadius: 8,
        }),
        text(textLines(label), {
          name: `${name}-label`,
          ...toComposeFrame(layout.inset(frame, { top: 7, right: 12, bottom: 6, left: 12 })),
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
      frame = layout.contentFrame(),
    } = {}) {
      const table = helpers.table;

      if (typeof table === "function") {
        return table(rows, {
          name,
          ...toComposeFrame(frame),
          textStyle: JUDGMENTKIT_STYLE_NAMES.bodySmall,
        });
      }

      return factories.evidencePanel({
        name,
        title: "Evidence",
        body: rows.map((row) => row.join("  ")),
        frame,
      });
    },

    mediaFrame({
      name = "judgmentkit-media-frame",
      frame = layout.contentFrame(),
      fill = "bg2",
    } = {}) {
      const shape = requireHelper(helpers, "shape");

      return shape({
        name,
        geometry: "rect",
        ...toComposeFrame(frame),
        fill,
        line: { style: "solid", fill: "lt2", width: 1 },
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

  return {
    manifest: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
    presentation,
    layout,
    styleNames: JUDGMENTKIT_STYLE_NAMES,
    components: createJudgmentKitComponentFactories(
      normalizedOptions.helpers ?? normalizedOptions,
    ),
  };
}
