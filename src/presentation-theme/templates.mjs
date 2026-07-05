import { createJudgmentKitDeckKit } from "./components.mjs";
import layoutApi from "./layout.mjs";
import { JUDGMENTKIT_STYLE_NAMES } from "./styles.mjs";
import { createJudgmentKitPresentation } from "./theme.mjs";
import {
  JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
  cloneJudgmentKitPresentationValue,
} from "./tokens.mjs";
import { JUDGMENTKIT_TEMPLATE_LAYOUT_SPECS } from "./template-layout-data.mjs";

const REGISTRY_SCHEMA = "judgmentkit.presentation-theme.template-registry/v1";
const PUBLIC_IMPORT = "judgmentkit/presentation-theme";
const OUTPUT_ROOT = "outputs/presentation-theme-actual-tests";
const GENERATOR_REF = "scripts/presentation-theme/build-actual-fixtures.mjs";
const EVIDENCE_CHECKER_REF = "scripts/presentation-theme/actual-evidence-check.mjs";
const STRUCTURAL_INSPECTOR_REF = "scripts/presentation-theme/pptx-structural-inspector.mjs";
const CANONICAL_SIZE = { width: 1280, height: 720 };
const CUSTOM_FOUR_BY_THREE_SIZE = { width: 1024, height: 768 };
const COMPACT_SIZE = { width: 960, height: 540 };

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

function clone(value) {
  return cloneJudgmentKitPresentationValue(value);
}

function frame(kit, x, y, width, height) {
  return kit.layout.frame(x, y, width, height);
}

function createEvidenceRefs(caseId, slideNumber) {
  const stem = `slide-${String(slideNumber).padStart(2, "0")}`;

  return {
    pptx: `${OUTPUT_ROOT}/${caseId}.pptx`,
    preview_png: `${OUTPUT_ROOT}/artifact-previews/${caseId}/${stem}.png`,
    rendered_png: `${OUTPUT_ROOT}/${caseId}/slide-${slideNumber}.png`,
    layout_json: `${OUTPUT_ROOT}/layouts/${caseId}/${stem}.layout.json`,
    imported_layout_json: `${OUTPUT_ROOT}/imported-layouts/${caseId}/${stem}.layout.json`,
    acceptance_json: `${OUTPUT_ROOT}/evidence/${caseId}.acceptance.json`,
    structural_json: `${OUTPUT_ROOT}/structural/${caseId}.structural.json`,
    acceptance_status: "accepted",
  };
}

function slot(name, role, component, required = true, extra = {}) {
  return {
    name,
    role,
    source: "caller_content",
    required,
    component,
    ...extra,
  };
}

function commonComposeContract(entrypoint, componentFactories, extra = {}) {
  return {
    public_import: PUBLIC_IMPORT,
    entrypoint,
    builder_visibility: "private",
    layout_helpers: extra.layout_helpers ?? ["frame", "contentFrame"],
    component_factories: componentFactories,
    artifact_tool_helpers: extra.artifact_tool_helpers ?? ["layers", "shape", "text"],
    native_surfaces: extra.native_surfaces ?? [],
  };
}

const PARITY_TEMPLATE_SPECS = JUDGMENTKIT_TEMPLATE_LAYOUT_SPECS;

const TEMPLATE_USE_SURFACE_TYPES = {
  agenda: "content_report",
  chart: "dashboard_monitor",
  content: "content_report",
  cover: "content_report",
  "data-table": "operator_review",
  "image-hero": "content_report",
  metrics: "dashboard_monitor",
  process: "operator_review",
  "two-column": "content_report",
};

const TEMPLATE_USE_DECISION_MOMENTS = {
  agenda: "sequence_the_discussion",
  chart: "inspect_visual_evidence",
  content: "orient_reader",
  cover: "orient_reader",
  "data-table": "review_structured_evidence",
  "image-hero": "anchor_visual_context",
  metrics: "compare_measures",
  process: "explain_progression",
  "two-column": "compare_two_regions",
};

const TEMPLATE_USE_COMPONENTS = {
  agenda: ["sectionHeader", "evidencePanel", "handoffReceipt"],
  chart: ["sectionHeader", "mediaFrame", "evidencePanel"],
  content: ["sectionHeader", "evidencePanel"],
  cover: ["titleBlock", "mediaFrame", "statusPill"],
  "data-table": ["sectionHeader", "evidenceTable", "handoffReceipt"],
  "image-hero": ["titleBlock", "mediaFrame", "evidencePanel"],
  metrics: ["sectionHeader", "metricTile", "evidencePanel"],
  process: ["sectionHeader", "evidencePanel", "handoffReceipt"],
  "two-column": ["sectionHeader", "evidencePanel", "riskCallout"],
};

function padTemplateNumber(number) {
  return String(number).padStart(2, "0");
}

function templateLabel(value) {
  return String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function layoutIdForSpec(spec) {
  return `slide-${padTemplateNumber(spec.number)}`;
}

function publicFrameRef(frameValue) {
  if (!frameValue) {
    return undefined;
  }

  return {
    left: frameValue.left,
    top: frameValue.top,
    width: frameValue.width,
    height: frameValue.height,
  };
}

function publicTextFlows(spec) {
  return (spec.textFlows ?? []).map((flow) => ({
    kind: flow.kind,
    content_count: (flow.contentKeys ?? flow.tokenIds ?? []).length,
    frame: publicFrameRef(flow.frame),
    rationale: flow.rationale,
  }));
}

function publicMajorRegions(spec) {
  return (spec.majorRegions ?? []).map((region) => ({
    role: region.role,
    frame: publicFrameRef(region.frame),
  }));
}

function publicTypographyBudget(spec) {
  const typography = spec.typographyBudget ?? {};

  return {
    title_min_px: typography.titleMinPx ?? 33,
    body_min_px: typography.bodyMinPx ?? 14,
    preferred_body_px_range: typography.preferredBodyPxRange,
    table_body_min_px: typography.tableBodyMinPx ?? 12,
    footnote_min_px: typography.footnoteMinPx ?? typography.sourceFootnoteMinPx,
    font_size_range_px: (typography.fontSizeRangePx ?? typography.sourceFontSizeRangePx)
      ? {
          min: (typography.fontSizeRangePx ?? typography.sourceFontSizeRangePx).min,
          max: (typography.fontSizeRangePx ?? typography.sourceFontSizeRangePx).max,
        }
      : undefined,
    guidance: typography.guidance,
  };
}

function publicAssetSlots(assetSlots = [], fallbackSurfaces = []) {
  if (!Array.isArray(assetSlots) || assetSlots.length === 0) {
    return clone(fallbackSurfaces.filter((surface) => surface !== "table"));
  }

  return assetSlots.map((assetSlot) => {
    if (!assetSlot || typeof assetSlot !== "object") {
      return assetSlot;
    }

    return compactObject({
      role: assetSlot.role,
      alt: assetSlot.alt,
      frame: publicFrameRef(assetSlot.frame),
    });
  });
}

function compactTemplateContext(spec) {
  return {
    use_when: spec.useWhen,
    avoid_when: spec.avoidWhen,
    density_guidance: spec.densityGuidance,
    typography_guidance: spec.typographyBudget?.guidance,
    preview_ref: spec.previewRef,
  };
}

function createParitySlots(spec) {
  if (Array.isArray(spec.slots) && spec.slots.length > 0) {
    return spec.slots.map((entry, index) => {
      const role = entry.role ?? "region";
      const slotKind = entry.slotKind ?? entry.source;
      const component =
        spec.templateUse === "data-table" && (role === "body" || role === "region")
          ? "evidenceTable"
          : role === "hero" || slotKind === "image" || slotKind === "image-placeholder" || spec.templateUse === "chart"
            ? "mediaFrame"
            : role === "stat"
              ? "metricTile"
              : role === "label" || role === "footer" || role === "title"
                ? "sectionHeader"
                : "evidencePanel";

      return slot(
        entry.name ?? `slot_${String(index + 1).padStart(2, "0")}`,
        role,
        component,
        entry.required === true,
        {
          slot_kind: slotKind ?? "layout",
          content_key: entry.contentKey ?? entry.token,
          description: entry.description,
          text_role: entry.textRole,
          frame: entry.frame,
        },
      );
    });
  }

  const slots = [];
  const rolesByUse = {
    agenda: ["title", "agenda", "agenda", "agenda", "handoff", "footer"],
    chart: ["title", "chart", "evidence", "evidence", "handoff", "footer"],
    content: ["title", "evidence", "summary", "footer"],
    cover: ["eyebrow", "title", "subtitle", "image", "status", "footer"],
    "data-table": ["title", "table", "handoff", "footer"],
    "image-hero": ["eyebrow", "title", "subtitle", "image", "evidence", "footer"],
    metrics: ["title", "metrics", "metrics", "metrics", "evidence", "footer"],
    process: ["title", "evidence", "risk", "handoff", "footer"],
    "two-column": ["title", "evidence", "risk", "handoff", "footer"],
  };
  const roles = rolesByUse[spec.templateUse] ?? rolesByUse.content;

  for (let index = 0; index < spec.slotCount; index += 1) {
    const role = roles[index % roles.length];
    const component =
      role === "table"
        ? "evidenceTable"
        : role === "image" || role === "chart"
          ? "mediaFrame"
          : role === "metrics"
            ? "metricTile"
            : role === "risk"
              ? "riskCallout"
              : role === "handoff"
                ? "handoffReceipt"
                : role === "eyebrow" || role === "subtitle" || role === "title"
                  ? "sectionHeader"
                  : "evidencePanel";
    slots.push(slot(`slot_${String(index + 1).padStart(2, "0")}`, role, component, index < spec.maxTextTokens));
  }

  return slots;
}

function createParityMetadata(spec) {
  const layoutId = layoutIdForSpec(spec);
  const contentRoles = [...new Set(createParitySlots(spec).map((entry) => entry.role))];
  const sourceContentRoles = spec.contentRoles?.length ? spec.contentRoles : contentRoles;
  const majorRegions = publicMajorRegions(spec);
  const textFlows = publicTextFlows(spec);
  const components = TEMPLATE_USE_COMPONENTS[spec.templateUse] ?? TEMPLATE_USE_COMPONENTS.content;
  const hasTable = spec.templateUse === "data-table";
  const nativeSurfaces = [
    ...(hasTable ? ["table"] : []),
    ...(spec.templateUse === "chart" ? ["chart"] : []),
    ...(spec.maxImageSlots > 0 ? ["image"] : []),
  ];

  return {
    fixture_backed: false,
    layout_id: layoutId,
    registry_aliases: [`jk-${layoutId}`],
    case_id: "judgmentkit-template-library-80",
    slide_number: spec.number,
    source_compose_name: `judgmentkit-template-${layoutId}`,
    slide_size: CANONICAL_SIZE,
    selection: {
      activity_use: spec.templateUse,
      template_use: spec.templateUse,
      surface_type: TEMPLATE_USE_SURFACE_TYPES[spec.templateUse] ?? "content_report",
      layout_family: spec.layoutFamily,
      decision_moment: TEMPLATE_USE_DECISION_MOMENTS[spec.templateUse] ?? "orient_reader",
      content_roles: sourceContentRoles,
      slot_roles: contentRoles,
      major_regions: majorRegions,
      text_flows: textFlows,
      density_budget: {
        level: spec.densityLevel,
        max_text_tokens: spec.maxTextTokens,
        max_image_slots: spec.maxImageSlots,
        guidance: spec.densityGuidance,
      },
      typography_budget: publicTypographyBudget(spec),
      canvas_profile: "widescreen",
      asset_slots: publicAssetSlots(spec.assetSlots, nativeSurfaces),
      use_when:
        spec.useWhen ??
        `Use for ${templateLabel(spec.templateUse).toLowerCase()} content with a ${templateLabel(spec.layoutFamily).toLowerCase()} structure.`,
      avoid_when:
        spec.avoidWhen ?? "Avoid when the content exceeds the density budget or needs a different canvas.",
    },
    agent_context: compactTemplateContext(spec),
    slots: createParitySlots(spec),
    source_slot_count: spec.slots?.length ?? spec.slotCount,
    source_text_flow_count: textFlows.length,
    source_region_count: majorRegions.length,
    preview_ref: spec.previewRef,
    compose_contract: commonComposeContract(
      "composeJudgmentKitPresentationTemplate",
      components,
      {
        layout_helpers: ["frame", "contentFrame", "columns", "rows", "split"],
        artifact_tool_helpers: hasTable ? ["layers", "shape", "text", "table"] : ["layers", "shape", "text"],
        native_surfaces: nativeSurfaces,
      },
    ),
    parity: {
      family: spec.layoutFamily,
      use: spec.templateUse,
      ordinal: spec.number,
    },
  };
}

function splitColumns(kit, area, count, gap = 22) {
  return kit.layout.columns(area, count, { gap });
}

function defaultRowsForTemplate(spec) {
  return [
    ["Item", "Expected", "Status"],
    [`Template ${padTemplateNumber(spec.number)}`, templateLabel(spec.layoutFamily), "Ready"],
    ["Density", spec.densityLevel, `${spec.maxTextTokens} text slots`],
    ["Handoff", "Owner named", "Ready"],
  ];
}

function toComposeFrameValue(frameValue) {
  return {
    position: { left: frameValue.x, top: frameValue.y },
    width: frameValue.width,
    height: frameValue.height,
  };
}

function scaleSlotFrame(kit, sourceFrame) {
  const full = kit.layout.fullSlide();
  const scaleX = full.width / CANONICAL_SIZE.width;
  const scaleY = full.height / CANONICAL_SIZE.height;
  const left = Math.max(0, (sourceFrame?.left ?? 0) * scaleX);
  const top = Math.max(0, (sourceFrame?.top ?? 0) * scaleY);

  return frame(
    kit,
    left,
    top,
    Math.max(0, Math.min((sourceFrame?.width ?? 0) * scaleX, full.width - left)),
    Math.max(0, Math.min((sourceFrame?.height ?? 0) * scaleY, full.height - top)),
  );
}

function textStyleForSlot(slotValue) {
  if (slotValue.role === "stat") return JUDGMENTKIT_STYLE_NAMES.metric;
  if (slotValue.role === "label" || slotValue.role === "footer") return JUDGMENTKIT_STYLE_NAMES.label;
  if (slotValue.role === "title") return JUDGMENTKIT_STYLE_NAMES.sectionTitle;
  return JUDGMENTKIT_STYLE_NAMES.body;
}

function slotTextLines(content, spec, slotValue) {
  const explicitValue =
    content?.[slotValue.name] ??
    content?.[slotValue.content_key] ??
    (slotValue.role === "title" ? content?.title : undefined) ??
    (slotValue.role === "body" ? content?.body : undefined) ??
    (slotValue.role === "stat" ? content?.stat : undefined) ??
    (slotValue.role === "label" ? content?.label : undefined) ??
    (slotValue.role === "footer" ? content?.footer : undefined);
  const fallback =
    slotValue.role === "stat"
      ? String(spec.maxTextTokens)
      : slotValue.role === "label"
        ? templateLabel(spec.templateUse).toUpperCase()
        : slotValue.role === "footer"
          ? `Template ${padTemplateNumber(spec.number)}`
          : slotValue.role === "title"
            ? `${templateLabel(spec.templateUse)} template ${padTemplateNumber(spec.number)}`
            : `${templateLabel(spec.layoutFamily)} ${slotValue.name}`;
  const value = explicitValue ?? fallback;

  if (Array.isArray(value)) {
    return value.filter((line) => line !== undefined && line !== null).map((line) => String(line));
  }

  if (value && typeof value === "object") {
    return Object.values(value)
      .filter((line) => line !== undefined && line !== null)
      .map((line) => String(line));
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [String(value)];
}

function buildFrameDrivenTemplate({ kit, content, helpers }, spec) {
  const slots = createParitySlots(spec);
  const nodes = [];
  const text = helpers?.text;
  let tableRendered = false;
  let visualRendered = false;

  for (const slotValue of slots) {
    if (!slotValue.frame) {
      continue;
    }

    const slotFrame = scaleSlotFrame(kit, slotValue.frame);
    if (spec.templateUse === "data-table" && !tableRendered && slotValue.role !== "title" && slotValue.role !== "footer") {
      nodes.push(
        kit.components.evidenceTable({
          name: `judgmentkit-template-${padTemplateNumber(spec.number)}-table`,
          rows: contentValue(content, "rows", defaultRowsForTemplate(spec)),
          frame: slotFrame,
        }),
      );
      tableRendered = true;
      continue;
    }

    if (
      !visualRendered &&
      (slotValue.slot_kind === "image" ||
        slotValue.slot_kind === "image-placeholder" ||
        slotValue.role === "hero" ||
        spec.templateUse === "chart")
    ) {
      nodes.push(
        kit.components.mediaFrame({
          name: `judgmentkit-template-${padTemplateNumber(spec.number)}-${slotValue.name}-media`,
          frame: slotFrame,
        }),
      );
      visualRendered = true;
      continue;
    }

    if (slotValue.role === "region" || typeof text !== "function") {
      continue;
    }

    const lines = slotTextLines(content, spec, slotValue);
    if (lines.length === 0 || slotFrame.width <= 0 || slotFrame.height <= 0) {
      continue;
    }

    nodes.push(
      text(lines, {
        name: `judgmentkit-template-${padTemplateNumber(spec.number)}-${slotValue.name}`,
        ...toComposeFrameValue(slotFrame),
        style: textStyleForSlot(slotValue),
      }),
    );
  }

  if (nodes.length === 0) {
    return buildTextReviewTemplate({ kit, content }, spec);
  }

  return nodes;
}

function buildTextReviewTemplate({ kit, content }, spec) {
  const c = kit.layout.contentFrame();
  const title = contentValue(
    content,
    "title",
    `${templateLabel(spec.templateUse)} template ${padTemplateNumber(spec.number)}`,
  );
  const body = contentValue(content, "evidence", [
    `${templateLabel(spec.layoutFamily)} structure.`,
    `${templateLabel(spec.densityLevel)} density budget.`,
    `${spec.maxTextTokens} primary text slots.`,
  ]);
  const columns = splitColumns(kit, frame(kit, c.x, c.y + 140, c.width, 260), 2);

  return [
    kit.components.sectionHeader({
      label: contentValue(content, "label", templateLabel(spec.templateUse).toUpperCase()),
      title,
      frame: frame(kit, c.x, c.y, c.width, 104),
    }),
    kit.components.evidencePanel({
      title: contentValue(content, "evidenceTitle", "Primary read"),
      body,
      frame: columns[0],
    }),
    kit.components.riskCallout({
      title: contentValue(content, "riskTitle", "Supporting read"),
      body: contentValue(content, "risk", [
        `Use when the slide can stay within ${spec.maxTextTokens} text slots.`,
        "Split dense copy before reducing readable text roles.",
      ]),
      frame: columns[1],
    }),
    kit.components.handoffReceipt({
      title: contentValue(content, "handoffTitle", "Exit state"),
      body: contentValue(content, "handoff", "Reader leaves with the main comparison and next action."),
      frame: frame(kit, c.x, c.y + 424, c.width, 126),
    }),
  ];
}

function buildAgendaTemplate({ kit, content }, spec) {
  const c = kit.layout.contentFrame();
  const panels = splitColumns(kit, frame(kit, c.x, c.y + 142, c.width, 330), 3);
  const items = contentValue(content, "items", [
    "Open with the decision context.",
    "Review the strongest evidence.",
    "Close with the next action.",
  ]);

  return [
    kit.components.sectionHeader({
      label: contentValue(content, "label", "AGENDA"),
      title: contentValue(content, "title", `Agenda template ${padTemplateNumber(spec.number)}`),
      frame: frame(kit, c.x, c.y, c.width, 106),
    }),
    ...panels.map((panel, index) =>
      kit.components.evidencePanel({
        name: `judgmentkit-template-${padTemplateNumber(spec.number)}-agenda-${index + 1}`,
        title: `Step ${index + 1}`,
        body: items[index] ?? items[items.length - 1],
        frame: panel,
      }),
    ),
    kit.components.handoffReceipt({
      title: "Meeting outcome",
      body: contentValue(content, "handoff", "The sequence ends with a clear owner and follow-up."),
      frame: frame(kit, c.x, c.y + 498, c.width, 94),
    }),
  ];
}

function buildTableTemplate({ kit, content }, spec) {
  const c = kit.layout.contentFrame();

  return [
    kit.components.sectionHeader({
      label: contentValue(content, "label", "TABLE"),
      title: contentValue(content, "title", `Table evidence template ${padTemplateNumber(spec.number)}`),
      frame: frame(kit, c.x, c.y, c.width, 104),
    }),
    kit.components.evidenceTable({
      name: `judgmentkit-template-${padTemplateNumber(spec.number)}-table`,
      rows: contentValue(content, "rows", defaultRowsForTemplate(spec)),
      frame: frame(kit, c.x, c.y + 132, c.width, 334),
    }),
    kit.components.handoffReceipt({
      title: "Table outcome",
      body: contentValue(content, "handoff", "Structured evidence stays aligned with the decision."),
      frame: frame(kit, c.x, c.y + 488, c.width, 104),
    }),
  ];
}

function buildMediaTemplate({ kit, content }, spec) {
  const c = kit.layout.contentFrame();
  const imageLed = spec.maxImageSlots > 0;
  const textWidth = imageLed ? Math.max(0, c.width * 0.44) : c.width;
  const mediaX = imageLed ? c.x + textWidth + 34 : c.x;
  const mediaWidth = imageLed ? Math.max(0, c.width - textWidth - 34) : c.width;

  return [
    kit.components.titleBlock({
      eyebrow: contentValue(content, "eyebrow", templateLabel(spec.templateUse).toUpperCase()),
      title: contentValue(content, "title", `${templateLabel(spec.layoutFamily)} template ${padTemplateNumber(spec.number)}`),
      subtitle: contentValue(
        content,
        "subtitle",
        imageLed ? "Visual context carries the slide while copy stays bounded." : "The visual evidence stays in a fixed review frame.",
      ),
      frame: frame(kit, c.x, c.y, imageLed ? textWidth : c.width, imageLed ? 300 : 118),
    }),
    kit.components.mediaFrame({
      name: `judgmentkit-template-${padTemplateNumber(spec.number)}-media`,
      frame: frame(kit, mediaX, imageLed ? c.y : c.y + 146, mediaWidth, imageLed ? 500 : 322),
    }),
    ...(imageLed
      ? [
          kit.components.statusPill({
            label: contentValue(content, "status", "Visual ready"),
            status: contentValue(content, "statusTone", "success"),
            frame: frame(kit, c.x, c.y + 332, 154, 34),
          }),
        ]
      : [
          kit.components.handoffReceipt({
            title: "Visual evidence",
            body: contentValue(content, "handoff", "Use pixels for review and structured data for exact color intent."),
            frame: frame(kit, c.x, c.y + 492, c.width, 100),
          }),
        ]),
  ];
}

function buildMetricTemplate({ kit, content }, spec) {
  const c = kit.layout.contentFrame();
  const headerHeight = Math.min(112, Math.max(80, c.height * 0.2));
  const tileTop = c.y + headerHeight + 28;
  const tileHeight = Math.min(214, Math.max(120, c.height * 0.34));
  const evidenceTop = tileTop + tileHeight + 26;
  const evidenceHeight = Math.max(0, c.y + c.height - evidenceTop);
  const metrics = contentValue(content, "metrics", [
    { label: "Read", value: String(spec.maxTextTokens), detail: "Text slots" },
    { label: "Density", value: templateLabel(spec.densityLevel), detail: "Budget" },
    { label: "Layout", value: padTemplateNumber(spec.number), detail: templateLabel(spec.layoutFamily) },
  ]);
  const count = Math.min(4, Math.max(3, metrics.length));
  const tiles = splitColumns(kit, frame(kit, c.x, tileTop, c.width, tileHeight), count);

  return [
    kit.components.sectionHeader({
      label: contentValue(content, "label", "METRICS"),
      title: contentValue(content, "title", `Metric-led template ${padTemplateNumber(spec.number)}`),
      frame: frame(kit, c.x, c.y, c.width, headerHeight),
    }),
    ...tiles.map((tile, index) => {
      const metric = metrics[index] ?? metrics[metrics.length - 1];
      return kit.components.metricTile({
        name: `judgmentkit-template-${padTemplateNumber(spec.number)}-metric-${index + 1}`,
        label: metric.label,
        value: metric.value,
        detail: metric.detail,
        frame: tile,
      });
    }),
    kit.components.evidencePanel({
      title: contentValue(content, "evidenceTitle", "Metric interpretation"),
      body: contentValue(content, "evidence", [
        "Lead with the number the reader should compare.",
        "Keep supporting copy below the metric row.",
      ]),
      frame: frame(kit, c.x, evidenceTop, c.width, evidenceHeight),
    }),
  ];
}

function buildCoverTemplate({ kit, content }, spec) {
  const c = kit.layout.contentFrame();
  const mediaWidth = Math.max(0, c.width * 0.38);

  return [
    kit.components.mediaFrame({
      name: `judgmentkit-template-${padTemplateNumber(spec.number)}-cover-media`,
      frame: frame(kit, c.x + c.width - mediaWidth, c.y, mediaWidth, 508),
      fill: "bg2",
    }),
    kit.components.titleBlock({
      eyebrow: contentValue(content, "eyebrow", "REVIEW DECK"),
      title: contentValue(content, "title", `Cover template ${padTemplateNumber(spec.number)}`),
      subtitle: contentValue(content, "subtitle", "Use this opening slide when scope and ownership need to be clear immediately."),
      frame: frame(kit, c.x, c.y, Math.max(0, c.width - mediaWidth - 44), 350),
    }),
    kit.components.statusPill({
      label: contentValue(content, "status", "Ready"),
      status: contentValue(content, "statusTone", "success"),
      frame: frame(kit, c.x, c.y + 388, 132, 34),
    }),
  ];
}

function buildParityTemplate(context, spec) {
  if (Array.isArray(spec.slots) && spec.slots.length > 0) {
    return buildFrameDrivenTemplate(context, spec);
  }

  if (spec.templateUse === "agenda") return buildAgendaTemplate(context, spec);
  if (spec.templateUse === "data-table") return buildTableTemplate(context, spec);
  if (spec.templateUse === "chart" || spec.templateUse === "image-hero") return buildMediaTemplate(context, spec);
  if (spec.templateUse === "metrics") return buildMetricTemplate(context, spec);
  if (spec.templateUse === "cover") return buildCoverTemplate(context, spec);
  return buildTextReviewTemplate(context, spec);
}

function afterComposeParityTemplate({ slide, kit, content }, spec) {
  if (spec.templateUse !== "chart" || !slide?.charts?.add) {
    return;
  }

  const c = kit.layout.contentFrame();
  slide.charts.add(content?.chartType ?? "bar", {
    name: contentValue(content, "chartName", `judgmentkit-template-${padTemplateNumber(spec.number)}-chart`),
    position: { left: c.x + 72, top: c.y + 194, width: c.width - 144, height: 250 },
    categories: clone(contentValue(content, "categories", ["Evidence", "Risk", "Handoff"])),
    series: clone(contentValue(content, "series", [{ name: "Coverage", values: [8, 5, 7], fill: "accent1" }])),
    hasLegend: false,
  });
}

function createParityTemplateDefinitions() {
  return PARITY_TEMPLATE_SPECS.map((spec) =>
    defineTemplate(
      createParityMetadata(spec),
      (context) => buildParityTemplate(context, spec),
      (context) => afterComposeParityTemplate(context, spec),
    ),
  );
}

function defineTemplate(metadata, build, afterCompose) {
  return {
    metadata: deepFreeze({
      fixture_backed: true,
      public_import: PUBLIC_IMPORT,
      ...metadata,
    }),
    build,
    afterCompose,
  };
}

function contentValue(content, key, fallback) {
  return content?.[key] ?? fallback;
}

const LEGACY_TEMPLATE_DEFINITIONS = [
  defineTemplate(
    {
      layout_id: "canonical-cover",
      registry_aliases: ["jk-canonical-cover"],
      case_id: "jk-theme-canonical-16x9",
      slide_number: 1,
      source_compose_name: "canonical-cover",
      slide_size: CANONICAL_SIZE,
      selection: {
        activity_use: "orientation_with_metrics",
        surface_type: "content_report",
        layout_family: "cover_metrics_status",
        decision_moment: "orient_reader",
        content_roles: ["eyebrow", "title", "subtitle", "status", "metrics"],
        major_regions: ["title_field", "status_badge", "metric_row"],
        text_flow: "hero_title_then_metric_row",
        density_budget: { level: "moderate", max_text_tokens: 8 },
        typography_budget: { title_min_px: 38, body_min_px: 16 },
        canvas_profile: "widescreen",
        asset_slots: [],
        use_when: "Introduce a review deck, summarize evidence readiness, and show a small metric row.",
        avoid_when: "Avoid for dense evidence review or tabular detail that needs more than one primary region.",
      },
      slots: [
        slot("eyebrow", "label", "titleBlock", false),
        slot("title", "title", "titleBlock"),
        slot("subtitle", "summary", "titleBlock", false),
        slot("status", "status", "statusPill", false),
        slot("metrics", "metrics", "metricTile", false, { repeats: true }),
      ],
      compose_contract: commonComposeContract(
        "composeJudgmentKitPresentationTemplate",
        ["titleBlock", "statusPill", "metricTile"],
      ),
      evidence_refs: createEvidenceRefs("jk-theme-canonical-16x9", 1),
    },
    ({ kit, content }) => {
      const c = kit.layout.contentFrame();
      const metricFrame = frame(kit, c.x, c.y + 430, Math.min(300, c.width), 164);
      const metrics =
        Array.isArray(content?.metrics) && content.metrics.length > 0
          ? content.metrics
          : [
              { label: "Layouts", value: "6", detail: "Fixture-backed patterns" },
              { label: "Palette", value: "16", detail: "Reusable color roles" },
              { label: "Text", value: "14", detail: "Readable text roles" },
            ];
      const metricFrames = kit.layout.columns(
        frame(kit, metricFrame.x, metricFrame.y, Math.min(c.width, 952), metricFrame.height),
        Math.min(3, metrics.length),
        { gap: 26 },
      );

      return [
        kit.components.titleBlock({
          eyebrow: contentValue(content, "eyebrow", "PRESENTATION THEME"),
          title: contentValue(content, "title", "The review deck gives readers a clear structure"),
          subtitle: contentValue(
            content,
            "subtitle",
            "Use this layout when a reader needs orientation, scope, and a compact readiness signal.",
          ),
          frame: c,
        }),
        kit.components.statusPill({
          label: contentValue(content, "status", "Ready"),
          status: contentValue(content, "statusTone", "success"),
          frame: frame(kit, c.x + c.width - 132, c.y, 132, 34),
        }),
        ...metrics.slice(0, 3).map((metric, index) =>
          kit.components.metricTile({
            name: `judgmentkit-template-cover-metric-${index + 1}`,
            label: metric.label,
            value: metric.value,
            detail: metric.detail,
            frame: metricFrames[index],
          }),
        ),
      ];
    },
  ),
  defineTemplate(
    {
      layout_id: "canonical-evidence",
      registry_aliases: ["jk-canonical-evidence"],
      case_id: "jk-theme-canonical-16x9",
      slide_number: 2,
      source_compose_name: "canonical-evidence",
      slide_size: CANONICAL_SIZE,
      selection: {
        activity_use: "evidence_risk_handoff",
        surface_type: "operator_review",
        layout_family: "two_panel_review_receipt",
        decision_moment: "compare_evidence_and_risk",
        content_roles: ["section_label", "title", "evidence", "risk", "handoff"],
        major_regions: ["header", "evidence_panel", "risk_panel", "receipt_band"],
        text_flow: "header_then_two_panels_then_receipt",
        density_budget: { level: "moderate", max_text_tokens: 10 },
        typography_budget: { title_min_px: 38, body_min_px: 16 },
        canvas_profile: "widescreen",
        asset_slots: [],
        use_when: "Compare supporting evidence against risk and leave a handoff receipt.",
        avoid_when: "Avoid when the main content is a native table, chart, or media artifact.",
      },
      slots: [
        slot("label", "label", "sectionHeader", false),
        slot("title", "title", "sectionHeader"),
        slot("evidence", "evidence", "evidencePanel"),
        slot("risk", "risk", "riskCallout", false),
        slot("handoff", "handoff", "handoffReceipt", false),
      ],
      compose_contract: commonComposeContract(
        "composeJudgmentKitPresentationTemplate",
        ["sectionHeader", "evidencePanel", "riskCallout", "handoffReceipt"],
      ),
      evidence_refs: createEvidenceRefs("jk-theme-canonical-16x9", 2),
    },
    ({ kit, content }) => {
      const c = kit.layout.contentFrame();

      return [
        kit.components.sectionHeader({
          label: contentValue(content, "label", "WHAT TO CHECK"),
          title: contentValue(
            content,
            "title",
            "The review components should read as deck content, not UI chrome",
          ),
        }),
        kit.components.evidencePanel({
          title: contentValue(content, "evidenceTitle", "Evidence checked"),
          body: contentValue(content, "evidence", [
            "Theme colors render without raw color literals.",
            "Text roles stay readable after export.",
            "Frames stay inside the slide after PowerPoint export.",
          ]),
          frame: frame(kit, c.x, c.y + 140, 530, 220),
        }),
        kit.components.riskCallout({
          title: contentValue(content, "riskTitle", "Risk"),
          body: contentValue(content, "risk", [
            "Dense layouts can make status and small body text harder to scan.",
            "Long labels should be tested against exported previews.",
          ]),
          frame: frame(kit, c.x + 560, c.y + 140, Math.max(0, c.width - 560), 220),
        }),
        kit.components.handoffReceipt({
          title: contentValue(content, "handoffTitle", "Handoff receipt"),
          body: contentValue(
            content,
            "handoff",
            "Accept this deck only if rendered previews preserve margins, hierarchy, and readable evidence copy.",
          ),
          frame: frame(kit, c.x, c.y + 386, c.width, 134),
        }),
      ];
    },
  ),
  defineTemplate(
    {
      layout_id: "canonical-chart",
      registry_aliases: ["jk-canonical-chart"],
      case_id: "jk-theme-canonical-16x9",
      slide_number: 3,
      source_compose_name: "canonical-chart",
      slide_size: CANONICAL_SIZE,
      selection: {
        activity_use: "visual_evidence_frame",
        surface_type: "dashboard_monitor",
        layout_family: "header_native_chart",
        decision_moment: "inspect_visual_evidence",
        content_roles: ["section_label", "title", "chart"],
        major_regions: ["header", "media_frame"],
        text_flow: "header_then_visual_frame",
        density_budget: { level: "low", max_text_tokens: 4 },
        typography_budget: { title_min_px: 38, body_min_px: 16 },
        canvas_profile: "widescreen",
        asset_slots: ["chart"],
        use_when: "Place a chart or visual evidence object inside a bounded frame.",
        avoid_when: "Avoid for text-heavy review or handoff content.",
      },
      slots: [
        slot("label", "label", "sectionHeader", false),
        slot("title", "title", "sectionHeader"),
        slot("chart", "chart", "mediaFrame", false),
      ],
      compose_contract: commonComposeContract(
        "composeJudgmentKitPresentationTemplate",
        ["sectionHeader", "mediaFrame"],
        { native_surfaces: ["chart"] },
      ),
      evidence_refs: createEvidenceRefs("jk-theme-canonical-16x9", 3),
    },
    ({ kit, content }) => {
      const c = kit.layout.contentFrame();

      return [
        kit.components.sectionHeader({
          label: contentValue(content, "label", "CHART FRAME"),
          title: contentValue(
            content,
            "title",
            "A visual evidence object should sit cleanly inside a bounded frame",
          ),
        }),
        kit.components.mediaFrame({
          frame: frame(kit, c.x, c.y + 126, c.width, 382),
        }),
      ];
    },
    ({ slide, kit, content }) => {
      if (!slide?.charts?.add) {
        return;
      }

      const c = kit.layout.contentFrame();
      const categories = clone(contentValue(content, "categories", ["Theme", "Layout", "QA"]));
      const series = clone(contentValue(content, "series", [
        { name: "Coverage", values: [16, 6, 7], fill: "accent1" },
      ]));

      slide.charts.add(content?.chartType ?? "bar", {
        name: contentValue(content, "chartName", "judgmentkit-template-chart"),
        position: { left: c.x + 56, top: c.y + 184, width: c.width - 112, height: 270 },
        categories,
        series,
        hasLegend: false,
      });
    },
  ),
  defineTemplate(
    {
      layout_id: "canonical-table",
      registry_aliases: ["jk-canonical-table"],
      case_id: "jk-theme-canonical-16x9",
      slide_number: 4,
      source_compose_name: "canonical-table",
      slide_size: CANONICAL_SIZE,
      selection: {
        activity_use: "table_evidence_handoff",
        surface_type: "operator_review",
        layout_family: "header_table_receipt",
        decision_moment: "review_structured_evidence",
        content_roles: ["section_label", "title", "table", "handoff"],
        major_regions: ["header", "table_region", "receipt_band"],
        text_flow: "header_then_table_then_receipt",
        density_budget: { level: "high", max_text_tokens: 14 },
        typography_budget: { title_min_px: 38, body_min_px: 16, table_body_min_px: 12 },
        canvas_profile: "widescreen",
        asset_slots: ["table"],
        use_when: "Use for structured evidence that must stay aligned after PPTX export.",
        avoid_when: "Avoid when freeform narrative or visual evidence is the primary content.",
      },
      slots: [
        slot("label", "label", "sectionHeader", false),
        slot("title", "title", "sectionHeader"),
        slot("rows", "table", "evidenceTable"),
        slot("handoff", "handoff", "handoffReceipt", false),
      ],
      compose_contract: commonComposeContract(
        "composeJudgmentKitPresentationTemplate",
        ["sectionHeader", "evidenceTable", "handoffReceipt"],
        { artifact_tool_helpers: ["layers", "shape", "text", "table"], native_surfaces: ["table"] },
      ),
      evidence_refs: createEvidenceRefs("jk-theme-canonical-16x9", 4),
    },
    ({ kit, content }) => {
      const c = kit.layout.contentFrame();

      return [
        kit.components.sectionHeader({
          label: contentValue(content, "label", "EVIDENCE TABLE"),
          title: contentValue(
            content,
            "title",
            "Evidence tables should stay aligned through review handoff",
          ),
        }),
        kit.components.evidenceTable({
          rows: contentValue(content, "rows", [
            ["Check", "Expected", "Observed"],
            ["Theme aliases", "bg1/lt1 and bg2/lt2 match", "Matched"],
            ["Frame export", "Elements keep absolute positions", "Matched"],
            ["Readability", "Dense copy stays inside panels", "Matched"],
          ]),
          frame: frame(kit, c.x, c.y + 126, c.width, 310),
        }),
        kit.components.handoffReceipt({
          title: contentValue(content, "handoffTitle", "Table outcome"),
          body: contentValue(
            content,
            "handoff",
            "This slide keeps structured evidence aligned with the handoff outcome.",
          ),
          frame: frame(kit, c.x, c.y + 452, c.width, 124),
        }),
      ];
    },
  ),
  defineTemplate(
    {
      layout_id: "four-by-three-layout",
      registry_aliases: ["jk-custom-4x3-summary"],
      case_id: "jk-theme-custom-4x3",
      slide_number: 1,
      source_compose_name: "four-by-three-layout",
      slide_size: CUSTOM_FOUR_BY_THREE_SIZE,
      selection: {
        activity_use: "custom_canvas_compatibility",
        surface_type: "content_report",
        layout_family: "title_metrics_evidence",
        decision_moment: "confirm_canvas_fit",
        content_roles: ["eyebrow", "title", "subtitle", "metrics", "evidence"],
        major_regions: ["title_field", "metric_row", "evidence_panel"],
        text_flow: "title_then_three_metrics_then_evidence",
        density_budget: { level: "moderate", max_text_tokens: 9 },
        typography_budget: { title_min_px: 38, body_min_px: 16 },
        canvas_profile: "standard_4x3",
        asset_slots: [],
        use_when: "Check a standard 4:3 canvas and make scoped margins visible.",
        avoid_when: "Avoid when the deck must be widescreen or image-led.",
      },
      slots: [
        slot("eyebrow", "label", "titleBlock", false),
        slot("title", "title", "titleBlock"),
        slot("subtitle", "summary", "titleBlock", false),
        slot("metrics", "metrics", "metricTile", false, { repeats: true }),
        slot("evidence", "evidence", "evidencePanel"),
      ],
      compose_contract: commonComposeContract(
        "composeJudgmentKitPresentationTemplate",
        ["titleBlock", "metricTile", "evidencePanel"],
        { layout_helpers: ["frame", "contentFrame", "columns"] },
      ),
      evidence_refs: createEvidenceRefs("jk-theme-custom-4x3", 1),
    },
    ({ kit, content }) => {
      const c = kit.layout.contentFrame();
      const columns = kit.layout.columns(frame(kit, c.x, c.y + 288, c.width, 164), 3, { gap: 22 });
      const metrics = contentValue(content, "metrics", [
        { label: "Canvas", value: "4:3", detail: "1024 by 768" },
        { label: "Content", value: String(Math.round(c.width)), detail: "Scoped frame width" },
        { label: "Margin", value: "72", detail: "Equal left and right" },
      ]);

      return [
        kit.components.titleBlock({
          eyebrow: contentValue(content, "eyebrow", "CUSTOM SIZE CHECK"),
          title: contentValue(
            content,
            "title",
            "A 4:3 deck should not inherit widescreen component defaults",
          ),
          subtitle: contentValue(
            content,
            "subtitle",
            "Default content frames and component widths should match the current canvas.",
          ),
          frame: frame(kit, c.x, c.y, c.width, 260),
        }),
        ...metrics.slice(0, 3).map((metric, index) =>
          kit.components.metricTile({
            name: `judgmentkit-template-4x3-metric-${index + 1}`,
            label: metric.label,
            value: metric.value,
            detail: metric.detail,
            frame: columns[index],
          }),
        ),
        kit.components.evidencePanel({
          title: contentValue(content, "evidenceTitle", "Expected visual result"),
          body: contentValue(content, "evidence", [
            "The three tiles should align within the narrower canvas.",
            "The evidence panel should end before the right edge.",
            "No text should wrap into adjacent elements.",
          ]),
          frame: frame(kit, c.x, c.y + 476, c.width, 180),
        }),
      ];
    },
  ),
  defineTemplate(
    {
      layout_id: "compact-decision-slide",
      registry_aliases: ["jk-compact-decision-review"],
      case_id: "jk-theme-compact-review",
      slide_number: 1,
      source_compose_name: "compact-decision-slide",
      slide_size: COMPACT_SIZE,
      selection: {
        activity_use: "compact_decision_review",
        surface_type: "operator_review",
        layout_family: "compact_evidence_risk_status_receipt",
        decision_moment: "make_bounded_decision",
        content_roles: ["section_label", "title", "evidence", "risk", "status", "handoff"],
        major_regions: ["compact_header", "evidence_panel", "risk_panel", "status", "receipt"],
        text_flow: "compact_header_then_two_panels_then_status_receipt",
        density_budget: { level: "high", max_text_tokens: 12 },
        typography_budget: { title_min_px: 34, body_min_px: 16 },
        canvas_profile: "compact_widescreen",
        asset_slots: [],
        use_when: "Use for a compact decision review where evidence, watch-outs, status, and exit state must fit on one slide.",
        avoid_when: "Avoid for large tables, charts, or long narrative copy.",
      },
      slots: [
        slot("label", "label", "sectionHeader", false),
        slot("title", "title", "sectionHeader"),
        slot("evidence", "evidence", "evidencePanel"),
        slot("risk", "risk", "riskCallout", false),
        slot("status", "status", "statusPill", false),
        slot("handoff", "handoff", "handoffReceipt", false),
      ],
      compose_contract: commonComposeContract(
        "composeJudgmentKitPresentationTemplate",
        ["sectionHeader", "evidencePanel", "riskCallout", "statusPill", "handoffReceipt"],
      ),
      evidence_refs: createEvidenceRefs("jk-theme-compact-review", 1),
    },
    ({ kit, content }) => {
      const c = kit.layout.contentFrame();

      return [
        kit.components.sectionHeader({
          label: contentValue(content, "label", "COMPACT REVIEW"),
          title: contentValue(content, "title", "Compact review needs density controls"),
          frame: frame(kit, c.x, 42, c.width, 80),
        }),
        kit.components.evidencePanel({
          title: contentValue(content, "evidenceTitle", "Decision evidence"),
          body: contentValue(content, "evidence", [
            "Primary claim is supported.",
            "Temperature trace stayed within bounds.",
            "Handoff owner is named.",
          ]),
          frame: frame(kit, c.x, 150, Math.min(396, c.width), 198),
        }),
        kit.components.riskCallout({
          title: contentValue(content, "riskTitle", "Watch"),
          body: contentValue(content, "risk", [
            "Longer evidence copy can run close to the panel edge.",
            "Small labels become hard to read on the compact canvas.",
          ]),
          frame: frame(kit, c.x + 424, 150, Math.max(0, c.width - 424), 198),
        }),
        kit.components.statusPill({
          label: contentValue(content, "status", "Needs readback"),
          status: contentValue(content, "statusTone", "warning"),
          frame: frame(kit, c.x, 374, 182, 34),
        }),
        kit.components.handoffReceipt({
          title: contentValue(content, "handoffTitle", "Exit state"),
          body: contentValue(
            content,
            "handoff",
            "Reviewer leaves with a clear decision, a named owner, and a short evidence trail.",
          ),
          frame: frame(kit, c.x + 210, 366, Math.max(0, c.width - 210), 124),
        }),
      ];
    },
  ),
];

const TEMPLATE_DEFINITIONS = createParityTemplateDefinitions();
const ALL_TEMPLATE_DEFINITIONS = [...TEMPLATE_DEFINITIONS, ...LEGACY_TEMPLATE_DEFINITIONS];

function createTemplateLookup(definitions) {
  const lookup = new Map();

  for (const entry of definitions) {
    const keys = new Set([
      entry.metadata.layout_id,
      ...(entry.metadata.registry_aliases ?? []),
    ]);

    for (const key of keys) {
      if (lookup.has(key) && lookup.get(key) !== entry) {
        throw new Error(`Duplicate JudgmentKit presentation template id or alias: ${key}`);
      }

      lookup.set(key, entry);
    }
  }

  return lookup;
}

const TEMPLATE_BY_ID = createTemplateLookup(ALL_TEMPLATE_DEFINITIONS);

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined));
}

function publicSlotMetadata(slotValue) {
  return compactObject({
    name: slotValue.name,
    role: slotValue.role,
    required: slotValue.required,
    component: slotValue.component,
    text_role: slotValue.text_role,
    frame: clone(slotValue.frame),
    description: slotValue.description,
  });
}

function publicSelectionMetadata(selection = {}) {
  return compactObject({
    activity_use: selection.activity_use,
    template_use: selection.template_use,
    surface_type: selection.surface_type,
    layout_family: selection.layout_family,
    decision_moment: selection.decision_moment,
    content_roles: clone(selection.content_roles),
    slot_roles: clone(selection.slot_roles),
    major_regions: clone(selection.major_regions),
    text_flows: clone(selection.text_flows),
    density_budget: clone(selection.density_budget),
    typography_budget: clone(selection.typography_budget),
    canvas_profile: selection.canvas_profile,
    asset_slots: clone(selection.asset_slots),
    use_when: selection.use_when,
    avoid_when: selection.avoid_when,
  });
}

function publicTemplateMetadata(metadata, options = {}) {
  if (options.includeDiagnostics) {
    return clone(metadata);
  }

  return compactObject({
    fixture_backed: metadata.fixture_backed,
    layout_id: metadata.layout_id,
    registry_aliases: clone(metadata.registry_aliases),
    case_id: metadata.case_id,
    slide_number: metadata.slide_number,
    slide_size: clone(metadata.slide_size),
    selection: publicSelectionMetadata(metadata.selection),
    agent_context: clone(metadata.agent_context),
    slots: (metadata.slots ?? []).map(publicSlotMetadata),
    preview_ref: metadata.preview_ref,
    evidence: {
      fixture_backed: metadata.fixture_backed,
      acceptance_status: metadata.evidence_refs?.acceptance_status ?? "not_applicable",
    },
  });
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null))].sort();
}

function createSelectionTaxonomy() {
  const selections = TEMPLATE_DEFINITIONS.map((entry) => entry.metadata.selection);

  return {
    activity_use: uniqueSorted(selections.map((selection) => selection.activity_use)),
    template_use: uniqueSorted(selections.map((selection) => selection.template_use)),
    surface_type: uniqueSorted(selections.map((selection) => selection.surface_type)),
    layout_family: uniqueSorted(selections.map((selection) => selection.layout_family)),
    content_roles: uniqueSorted(selections.flatMap((selection) => selection.content_roles ?? [])),
    density_levels: uniqueSorted(selections.map((selection) => selection.density_budget?.level)),
    canvas_profiles: uniqueSorted(selections.map((selection) => selection.canvas_profile)),
  };
}

function createRegistryValue(options = {}) {
  const includeDiagnostics = options.includeDiagnostics === true;
  const registry = {
    schema: REGISTRY_SCHEMA,
    registry_id: "judgmentkit.presentation-theme.templates",
    registry_version: "0.1.0",
    adapter_ref: {
      module: PUBLIC_IMPORT,
      manifest_id: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST.id,
    },
    evidence: {
      fixture_backed: false,
      case_count: 3,
      fixture_backed_legacy_alias_count: LEGACY_TEMPLATE_DEFINITIONS.length,
      layout_count: TEMPLATE_DEFINITIONS.length,
    },
    slide_sizes: [
      { name: "widescreen", ...CANONICAL_SIZE },
      { name: "standard_4x3", ...CUSTOM_FOUR_BY_THREE_SIZE },
      { name: "compact_widescreen", ...COMPACT_SIZE },
    ],
    selection_taxonomy: createSelectionTaxonomy(),
    layouts: [...TEMPLATE_DEFINITIONS]
      .map((entry) => publicTemplateMetadata(entry.metadata, { includeDiagnostics }))
      .sort((left, right) => left.layout_id.localeCompare(right.layout_id)),
  };

  if (includeDiagnostics) {
    registry.generated_by = "src/presentation-theme/templates.mjs";
    registry.source_refs = [
      { path: "src/presentation-theme/templates.mjs", kind: "source" },
      { path: GENERATOR_REF, kind: "fixture-generator-reference" },
    ];
    registry.adapter_ref = {
      ...registry.adapter_ref,
      package_export: "./presentation-theme",
      visual_token_authority: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST.visual_token_authority,
    };
    registry.fixture_manifest_ref = `${OUTPUT_ROOT}/manifest.json`;
    registry.review_summary_ref = `${OUTPUT_ROOT}/review-summary.json`;
    registry.evidence_policy_ref = EVIDENCE_CHECKER_REF;
    registry.structural_inspector_ref = STRUCTURAL_INSPECTOR_REF;
    registry.compose_helper_contract = {
      unframed_container: { helper: "layers", props: { width: "fill", height: "fill" } },
      framed_helpers: ["shape", "text", "table"],
      frame_shape: { position: { left: "number", top: "number" }, width: "number", height: "number" },
    };
  }

  return registry;
}

export const JUDGMENTKIT_PRESENTATION_TEMPLATE_REGISTRY = deepFreeze(createRegistryValue());

function requireTemplate(layoutId) {
  const definition = TEMPLATE_BY_ID.get(layoutId);

  if (!definition) {
    throw new Error(`Unknown JudgmentKit presentation template: ${layoutId}`);
  }

  return definition;
}

function explicitSlideSize(options = {}, fallback) {
  if (options.slideSize || options.slide_size) {
    return layoutApi.resolveSlideSize([options.slideSize, options.slide_size], fallback);
  }

  const presentationOptionsSlideSize = layoutApi.resolveSlideSize(
    [options.presentationOptions?.slideSize, options.presentationOptions?.slide_size],
    null,
  );

  if (presentationOptionsSlideSize) {
    return undefined;
  }

  return fallback;
}

function resolveHelpers(options = {}) {
  return options.helpers ?? options.artifactTool ?? options;
}

function outerLayers(helpers, name, children) {
  if (typeof helpers?.layers === "function") {
    return helpers.layers({ name, width: "fill", height: "fill" }, children);
  }

  throw new Error(
    'composeJudgmentKitPresentationTemplate requires an artifact-tool compatible "layers" helper.',
  );
}

function assertRequiredTemplateHelpers(definition, helpers) {
  for (const helperName of definition.metadata.compose_contract.artifact_tool_helpers ?? []) {
    if (helperName === "table" && typeof helpers?.table !== "function") {
      throw new Error(
        `Presentation template ${definition.metadata.layout_id} requires artifact-tool helper "table".`,
      );
    }
  }
}

function composeIntoSlide(slide, kit, template, layers, content = {}) {
  if (!slide || typeof slide.compose !== "function") {
    return;
  }

  if (slide.background && typeof slide.background === "object") {
    slide.background.fill = "bg1";
  }

  slide.compose(layers, {
    frame: kit.layout.fullSlide(),
    baseUnit: 8,
  });

  template.afterCompose?.({ slide, kit, content });
}

function arrayIncludes(haystack = [], needle) {
  return Array.isArray(haystack) && haystack.includes(needle);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

const TEMPLATE_RANKING_SCHEMA = "judgmentkit.presentation-theme.template-ranking/v1";
const TEMPLATE_RANKING_TIE_BREAKING = [
  "score_desc",
  "public_catalog_before_legacy",
  "layout_id_ascending",
];

function templateLookupKeys(template) {
  return [template.layout_id, ...(template.registry_aliases ?? [])].filter(Boolean);
}

function contentRoleMatches(selection = {}, expected) {
  return (
    arrayIncludes(selection.content_roles, expected) ||
    arrayIncludes(selection.slot_roles, expected)
  );
}

function publicComponentMatches(template, expected) {
  if (!expected) {
    return false;
  }

  const selection = template.selection ?? {};

  return (
    template.slots?.some((slotValue) => slotValue.component === expected || slotValue.role === expected) ||
    selection.template_use === expected ||
    contentRoleMatches(selection, expected) ||
    (expected === "table" && selection.template_use === "data-table")
  );
}

function publicNativeSurfaceMatches(template, expected) {
  if (!expected) {
    return false;
  }

  const selection = template.selection ?? {};
  const assetSlots = selection.asset_slots ?? [];

  return (
    assetSlots.some((assetSlot) =>
      typeof assetSlot === "string" ? assetSlot === expected : assetSlot?.role === expected,
    ) ||
    publicComponentMatches(template, expected) ||
    (expected === "chart" && selection.template_use === "chart") ||
    (expected === "image" && selection.template_use === "image-hero")
  );
}

function resolveSelectionSlideSize(raw = {}) {
  const candidates = [
    raw.slideSize,
    raw.slide_size,
    raw.canvas && typeof raw.canvas === "object" ? raw.canvas : undefined,
    raw,
  ];

  return layoutApi.resolveSlideSize(candidates, null);
}

function normalizeSelectionCriteria(criteria = {}) {
  const raw = typeof criteria === "string" ? { id: criteria } : criteria && typeof criteria === "object" ? criteria : {};
  const slideSize = resolveSelectionSlideSize(raw);
  const recognizedKeys = new Set([
    "activityUse",
    "activity_use",
    "canvas",
    "canvasProfile",
    "canvas_profile",
    "contentRole",
    "content_role",
    "densityLevel",
    "density_level",
    "component",
    "height",
    "h",
    "id",
    "layoutFamily",
    "layoutId",
    "layout_family",
    "layout_id",
    "nativeSurface",
    "native_surface",
    "slideSize",
    "slide_size",
    "surfaceType",
    "surface_type",
    "templateId",
    "templateUse",
    "template_id",
    "template_use",
    "width",
    "w",
  ]);

  return {
    normalized: compactObject({
      id: firstDefined(raw.layoutId, raw.layout_id, raw.templateId, raw.template_id, raw.id),
      activity_use: firstDefined(raw.activityUse, raw.activity_use),
      template_use: firstDefined(raw.templateUse, raw.template_use),
      surface_type: firstDefined(raw.surfaceType, raw.surface_type),
      layout_family: firstDefined(raw.layoutFamily, raw.layout_family),
      canvas_profile: firstDefined(
        raw.canvasProfile,
        raw.canvas_profile,
        typeof raw.canvas === "string" ? raw.canvas : undefined,
      ),
      content_role: firstDefined(raw.contentRole, raw.content_role),
      component: firstDefined(raw.component),
      native_surface: firstDefined(raw.nativeSurface, raw.native_surface),
      density_level: firstDefined(raw.densityLevel, raw.density_level),
      slide_size: slideSize ? { width: slideSize.width, height: slideSize.height } : undefined,
    }),
    ignored: Object.keys(raw)
      .filter((key) => !recognizedKeys.has(key))
      .sort()
      .map((key) => ({
        key,
        reason:
          key === "includeDiagnostics"
            ? "diagnostics_are_not_selection_criteria"
            : "not_a_supported_selection_criteria",
      })),
  };
}

function recognizedSelectionCriteria(criteria = {}) {
  return normalizeSelectionCriteria(criteria).normalized;
}

function criterionMatch(name, expected, observed, weight, matched, reason) {
  return compactObject({
    criterion: name,
    expected,
    observed,
    weight,
    reason,
    matched,
  });
}

function evaluateTemplateSelection(template, criteria = {}) {
  const selection = template.selection;
  const normalized = recognizedSelectionCriteria(criteria);
  const evaluations = [];

  if (normalized.id) {
    evaluations.push(
      criterionMatch(
        "id",
        normalized.id,
        template.layout_id,
        10,
        templateLookupKeys(template).includes(normalized.id),
        "Template id or legacy alias matches.",
      ),
    );
  }

  if (normalized.activity_use) {
    evaluations.push(
      criterionMatch(
        "activity_use",
        normalized.activity_use,
        selection.activity_use,
        4,
        selection.activity_use === normalized.activity_use,
        "Template activity use matches the requested activity.",
      ),
    );
  }

  if (normalized.template_use) {
    evaluations.push(
      criterionMatch(
        "template_use",
        normalized.template_use,
        selection.template_use,
        4,
        selection.template_use === normalized.template_use,
        "Template use matches the requested layout intent.",
      ),
    );
  }

  if (normalized.surface_type) {
    evaluations.push(
      criterionMatch(
        "surface_type",
        normalized.surface_type,
        selection.surface_type,
        3,
        selection.surface_type === normalized.surface_type,
        "Surface type matches the requested presentation task.",
      ),
    );
  }

  if (normalized.layout_family) {
    evaluations.push(
      criterionMatch(
        "layout_family",
        normalized.layout_family,
        selection.layout_family,
        3,
        selection.layout_family === normalized.layout_family,
        "Layout family matches the requested structure.",
      ),
    );
  }

  if (normalized.canvas_profile) {
    evaluations.push(
      criterionMatch(
        "canvas_profile",
        normalized.canvas_profile,
        selection.canvas_profile,
        2,
        selection.canvas_profile === normalized.canvas_profile,
        "Canvas profile matches the requested deck shape.",
      ),
    );
  }

  if (normalized.content_role) {
    evaluations.push(
      criterionMatch(
        "content_role",
        normalized.content_role,
        selection.content_roles,
        1,
        contentRoleMatches(selection, normalized.content_role),
        "Template has a compatible content role or slot role.",
      ),
    );
  }

  if (normalized.component) {
    evaluations.push(
      criterionMatch(
        "component",
        normalized.component,
        template.slots?.map((slotValue) => slotValue.component).filter(Boolean),
        1,
        publicComponentMatches(template, normalized.component),
        "Template has a compatible public slot role or component family.",
      ),
    );
  }

  if (normalized.native_surface) {
    evaluations.push(
      criterionMatch(
        "native_surface",
        normalized.native_surface,
        selection.asset_slots,
        1,
        publicNativeSurfaceMatches(template, normalized.native_surface),
        "Template has a compatible public native surface slot.",
      ),
    );
  }

  if (normalized.density_level) {
    evaluations.push(
      criterionMatch(
        "density_level",
        normalized.density_level,
        selection.density_budget?.level,
        1,
        selection.density_budget?.level === normalized.density_level,
        "Template density matches the requested content amount.",
      ),
    );
  }

  if (normalized.slide_size) {
    evaluations.push(
      criterionMatch(
        "slide_size",
        normalized.slide_size,
        template.slide_size,
        3,
        template.slide_size.width === normalized.slide_size.width &&
          template.slide_size.height === normalized.slide_size.height,
        "Template slide size matches the requested dimensions.",
      ),
    );
  }

  const matched = evaluations.filter((entry) => entry.matched);
  const missing = evaluations.filter((entry) => !entry.matched);
  const score = matched.reduce((sum, entry) => sum + entry.weight, 0);
  const possible = evaluations.reduce((sum, entry) => sum + entry.weight, 0);

  return {
    score,
    possible,
    matched_criteria: matched.map(({ matched: _matched, ...entry }) => entry),
    missing_criteria: missing.map(({ matched: _matched, ...entry }) => entry),
    criteria: normalized,
  };
}

function scoreTemplate(template, criteria = {}) {
  return evaluateTemplateSelection(template, criteria).score;
}

function rankedTemplateCandidate(definition, evaluation, rank, tieCount = 0) {
  return {
    rank,
    template: publicTemplateMetadata(definition.metadata),
    score: {
      total: evaluation.score,
      possible: evaluation.possible,
      matched: evaluation.matched_criteria,
    },
    missing_criteria: evaluation.missing_criteria,
    tie_count: tieCount,
  };
}

function sortedTemplateEvaluations(criteria = {}, options = {}) {
  const includeZeroScore = options.includeZeroScore === true;
  return ALL_TEMPLATE_DEFINITIONS.map((definition, index) => ({
    definition,
    evaluation: evaluateTemplateSelection(definition.metadata, criteria),
    publicCatalog: index < TEMPLATE_DEFINITIONS.length,
  }))
    .filter((entry) => includeZeroScore || entry.evaluation.score > 0)
    .sort((left, right) => {
      if (right.evaluation.score !== left.evaluation.score) {
        return right.evaluation.score - left.evaluation.score;
      }

      if (left.publicCatalog !== right.publicCatalog) {
        return left.publicCatalog ? -1 : 1;
      }

      return left.definition.metadata.layout_id.localeCompare(right.definition.metadata.layout_id);
    });
}

function createTemplateRanking(criteria = {}, options = {}) {
  const normalizedCriteria = normalizeSelectionCriteria(criteria);
  const evaluations = sortedTemplateEvaluations(criteria, options);
  const scoreCounts = new Map();

  for (const entry of evaluations) {
    scoreCounts.set(entry.evaluation.score, (scoreCounts.get(entry.evaluation.score) ?? 0) + 1);
  }

  const candidates = evaluations.map((entry, index) =>
    rankedTemplateCandidate(
      entry.definition,
      entry.evaluation,
      index + 1,
      scoreCounts.get(entry.evaluation.score) ?? 1,
    ),
  );
  const maxAlternatives = Number.isInteger(options.maxAlternatives)
    ? Math.max(0, options.maxAlternatives)
    : Number.isInteger(options.limit)
      ? Math.max(0, options.limit - 1)
      : 3;

  return {
    schema: TEMPLATE_RANKING_SCHEMA,
    selected: candidates[0] ?? null,
    alternatives: candidates.slice(1, 1 + maxAlternatives),
    criteria: normalizedCriteria,
    tie_breaking: [...TEMPLATE_RANKING_TIE_BREAKING],
  };
}

export function createJudgmentKitPresentationTemplateRegistry(options = {}) {
  return clone(createRegistryValue(options));
}

export function listJudgmentKitPresentationTemplates(options = {}) {
  const caseId = options.caseId ?? options.case_id;
  const surfaceType = options.surfaceType ?? options.surface_type;
  const canvasProfile = options.canvasProfile ?? options.canvas_profile;
  const templateUse = options.templateUse ?? options.template_use ?? options.activityUse ?? options.activity_use;
  const layoutFamily = options.layoutFamily ?? options.layout_family;
  const layouts = TEMPLATE_DEFINITIONS.map((entry) => entry.metadata).filter((template) => {
    if (options.fixtureBacked !== undefined && template.fixture_backed !== options.fixtureBacked) {
      return false;
    }

    if (caseId && template.case_id !== caseId) {
      return false;
    }

    if (surfaceType && template.selection.surface_type !== surfaceType) {
      return false;
    }

    if (canvasProfile && template.selection.canvas_profile !== canvasProfile) {
      return false;
    }

    if (templateUse && template.selection.template_use !== templateUse && template.selection.activity_use !== templateUse) {
      return false;
    }

    if (layoutFamily && template.selection.layout_family !== layoutFamily) {
      return false;
    }

    return true;
  });

  return clone(
    [...layouts]
      .map((template) => publicTemplateMetadata(template, options))
      .sort((left, right) => left.layout_id.localeCompare(right.layout_id)),
  );
}

export function getJudgmentKitPresentationTemplate(layoutId, options = {}) {
  return clone(publicTemplateMetadata(requireTemplate(layoutId).metadata, options));
}

export function rankJudgmentKitPresentationTemplates(criteria = {}, options = {}) {
  return clone(createTemplateRanking(criteria, options));
}

export function selectJudgmentKitPresentationTemplate(criteria = {}) {
  if (typeof criteria === "string") {
    return getJudgmentKitPresentationTemplate(criteria);
  }

  const explicitId = criteria.layoutId ?? criteria.layout_id ?? criteria.templateId ?? criteria.template_id ?? criteria.id;
  if (explicitId) {
    return getJudgmentKitPresentationTemplate(explicitId);
  }

  return rankJudgmentKitPresentationTemplates(criteria).selected?.template ?? null;
}

export function composeJudgmentKitPresentationTemplate(layoutId, options = {}) {
  const definition = requireTemplate(layoutId);
  const helpers = resolveHelpers(options);
  const explicitTemplateSlideSize = explicitSlideSize(options, definition.metadata.slide_size);
  const deck =
    options.kit
      ? { kit: options.kit, presentation: options.presentation }
      : options.Presentation || options.presentation || options.artifactTool
        ? createJudgmentKitPresentation({
            ...options,
            helpers,
            slideSize: explicitTemplateSlideSize,
            slide_size: options.slide_size,
          })
        : {
            presentation: undefined,
            kit: createJudgmentKitDeckKit({
              presentation: options.presentation,
              helpers,
              layout: options.layout,
              presentationOptions: options.presentationOptions,
              slideSize: explicitTemplateSlideSize,
              slide_size: options.slide_size,
            }),
          };
  const kit = deck.kit;
  const presentation = deck.presentation ?? options.presentation;
  const slide =
    options.slide ??
    (typeof presentation?.slides?.add === "function" ? presentation.slides.add() : undefined);
  const content = options.content ?? {};
  assertRequiredTemplateHelpers(definition, helpers);
  const children = definition.build({ kit, content, slide, helpers });
  const layers = outerLayers(helpers, definition.metadata.source_compose_name, children);

  composeIntoSlide(slide, kit, definition, layers, content);

  return {
    template: publicTemplateMetadata(definition.metadata, {
      includeDiagnostics: options.includeDiagnostics === true,
    }),
    presentation,
    slide,
    layers,
    children,
    layout: kit.layout,
  };
}
