import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FileBlob, Presentation, PresentationFile, layers, shape, table, text } from "@oai/artifact-tool";
import {
  JUDGMENTKIT_PPTX_THEME_COLORS,
  JUDGMENTKIT_STYLE_NAMES,
  createJudgmentKitPresentation,
  createJudgmentKitPresentationAcceptanceEvidence,
} from "judgmentkit/presentation-theme";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = __dirname;
const previewRoot = path.join(outputDir, "artifact-previews");
const layoutRoot = path.join(outputDir, "layouts");
const importedLayoutRoot = path.join(outputDir, "imported-layouts");
const inspectRoot = path.join(outputDir, "inspect");
const evidenceRoot = path.join(outputDir, "evidence");
const helpers = { layers, shape, table, text };

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function composeSlide(slide, kit, name, children) {
  slide.background.fill = "bg1";
  slide.compose(layers({ name, width: "fill", height: "fill" }, children), {
    frame: kit.layout.fullSlide(),
    baseUnit: 8,
  });
}

function frame(kit, x, y, width, height) {
  return kit.layout.frame(x, y, width, height);
}

async function saveDeck(name, deck, slidesEvidence) {
  const source = await fs.readFile(new URL(import.meta.url), "utf8");
  const pptxPath = path.join(outputDir, `${name}.pptx`);
  const previewDir = path.join(previewRoot, name);
  const layoutDir = path.join(layoutRoot, name);
  const importedLayoutDir = path.join(importedLayoutRoot, name);
  await fs.rm(previewDir, { recursive: true, force: true });
  await fs.rm(layoutDir, { recursive: true, force: true });
  await fs.rm(importedLayoutDir, { recursive: true, force: true });
  await fs.mkdir(previewDir, { recursive: true });
  await fs.mkdir(layoutDir, { recursive: true });
  await fs.mkdir(importedLayoutDir, { recursive: true });

  for (const [index, slide] of deck.presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(
      path.join(previewDir, `${stem}.png`),
      await deck.presentation.export({ slide, format: "png", scale: 1 }),
    );
    await fs.writeFile(
      path.join(layoutDir, `${stem}.layout.json`),
      await (await slide.export({ format: "layout" })).text(),
    );
  }

  await writeBlob(
    path.join(previewRoot, `${name}.webp`),
    await deck.presentation.export({ format: "webp", montage: true, scale: 1 }),
  );

  const inspect = await deck.presentation.inspect({
    kind: "slide,textbox,shape,table,chart,layout",
    maxChars: 40000,
  });
  await fs.writeFile(path.join(inspectRoot, `${name}.ndjson`), inspect.ndjson);

  await (await PresentationFile.exportPptx(deck.presentation)).save(pptxPath);

  const imported = await PresentationFile.importPptx(await FileBlob.load(pptxPath));
  for (const [index, slide] of imported.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await fs.writeFile(
      path.join(importedLayoutDir, `${stem}.layout.json`),
      await (await slide.export({ format: "layout" })).text(),
    );
  }

  const importedInspect = await imported.inspect({
    kind: "slide,textbox,shape,table,chart,layout",
    maxChars: 40000,
  });
  await fs.writeFile(path.join(inspectRoot, `${name}.imported.ndjson`), importedInspect.ndjson);

  await writeJson(
    path.join(evidenceRoot, `${name}.acceptance.json`),
    createJudgmentKitPresentationAcceptanceEvidence({
      source,
      artifact: { path: pptxPath, kind: "pptx" },
      theme: {
        colorScheme: { themeColors: JUDGMENTKIT_PPTX_THEME_COLORS },
        styleIds: Object.values(JUDGMENTKIT_STYLE_NAMES),
      },
      checks: {
        actual_slide_size: deck.kit.layout.fullSlide(),
        artifact_preview_directory: previewDir,
        artifact_preview_pngs: deck.presentation.slides.items.length,
        layout_json_exports: deck.presentation.slides.items.length,
        imported_layout_json_exports: imported.slides.items.length,
        imported_inspect_path: path.join(inspectRoot, `${name}.imported.ndjson`),
        rendered_pptx_png_directory: path.join(outputDir, name),
        rendered_pptx_pngs_expected: deck.presentation.slides.items.length,
      },
      slides: slidesEvidence,
    }),
  );

  return pptxPath;
}

function buildCanonicalDeck() {
  const deck = createJudgmentKitPresentation({
    Presentation,
    helpers,
    slideSize: { width: 1280, height: 720 },
  });
  const { presentation, kit } = deck;
  const c = kit.layout.contentFrame();

  composeSlide(presentation.slides.add(), kit, "canonical-cover", [
    kit.components.titleBlock({
      eyebrow: "PRESENTATION THEME ACTUAL TEST",
      title: "The theme adapter gives decks a usable review structure",
      subtitle: "Fixture deck for checking rendered size, component spacing, theme slots, and named text styles.",
      frame: c,
    }),
    kit.components.statusPill({
      label: "Ready",
      status: "success",
      frame: frame(kit, c.x + c.width - 132, c.y, 132, 34),
    }),
    kit.components.metricTile({
      name: "canonical-metric-1",
      label: "Layouts",
      value: "3",
      detail: "Cover, evidence, and chart slides",
      frame: frame(kit, c.x, c.y + 430, 300, 164),
    }),
    kit.components.metricTile({
      name: "canonical-metric-2",
      label: "Theme slots",
      value: "16",
      detail: "PowerPoint color slots available",
      frame: frame(kit, c.x + 326, c.y + 430, 300, 164),
    }),
    kit.components.metricTile({
      name: "canonical-metric-3",
      label: "Styles",
      value: "14",
      detail: "Named text styles registered",
      frame: frame(kit, c.x + 652, c.y + 430, 300, 164),
    }),
  ]);

  composeSlide(presentation.slides.add(), kit, "canonical-evidence", [
    kit.components.sectionHeader({
      label: "WHAT TO CHECK",
      title: "The review components should read as deck content, not UI chrome",
    }),
    kit.components.evidencePanel({
      title: "Evidence checked",
      body: [
        "Theme colors render without raw color literals.",
        "Named text styles stay readable after export.",
        "Frames stay inside the slide after PowerPoint export.",
      ],
      frame: frame(kit, c.x, c.y + 140, 530, 220),
    }),
    kit.components.riskCallout({
      body: [
        "Dense layouts can make status and small body text harder to scan.",
        "Long labels should be tested against exported previews.",
      ],
      frame: frame(kit, c.x + 560, c.y + 140, 576, 220),
    }),
    kit.components.handoffReceipt({
      body: "Accept this deck only if rendered previews preserve margins, hierarchy, and readable evidence copy.",
      frame: frame(kit, c.x, c.y + 386, c.width, 134),
    }),
  ]);

  const chartSlide = presentation.slides.add();
  composeSlide(chartSlide, kit, "canonical-chart", [
    kit.components.sectionHeader({
      label: "CHART FRAME",
      title: "A native chart should sit cleanly inside an adapter media frame",
    }),
    kit.components.mediaFrame({ frame: frame(kit, c.x, c.y + 126, c.width, 382) }),
  ]);
  chartSlide.charts.add("bar", {
    name: "fixture-token-chart",
    position: { left: c.x + 56, top: c.y + 184, width: c.width - 112, height: 270 },
    categories: ["Theme", "Layout", "QA"],
    series: [{ name: "Coverage", values: [16, 9, 7], fill: "accent1" }],
    hasLegend: false,
    dataLabels: { showValue: true, position: "outEnd" },
    yAxis: { majorGridlines: { style: "solid", fill: "accent6", width: 1 } },
  });

  composeSlide(presentation.slides.add(), kit, "canonical-table", [
    kit.components.sectionHeader({
      label: "EVIDENCE TABLE",
      title: "Native tables should export through the adapter without helper errors",
    }),
    kit.components.evidenceTable({
      rows: [
        ["Check", "Expected", "Observed"],
        ["Theme aliases", "bg1/lt1 and bg2/lt2 match", "Matched"],
        ["Frame export", "Elements keep absolute positions", "Matched"],
        ["Readability", "Dense copy stays inside panels", "Matched"],
      ],
      frame: frame(kit, c.x, c.y + 126, c.width, 310),
    }),
    kit.components.handoffReceipt({
      title: "Table outcome",
      body: "This slide exercises the real artifact-tool table helper and exported PPTX import path.",
      frame: frame(kit, c.x, c.y + 452, c.width, 124),
    }),
  ]);

  return {
    deck,
    slides: [
      { title: "The theme adapter gives decks a usable review structure", body: "Fixture deck for checking rendered size, component spacing, theme slots, and named text styles." },
      { title: "The review components should read as deck content, not UI chrome", body: "Evidence checked. Accept this deck only if rendered previews preserve margins, hierarchy, and readable evidence copy." },
      { title: "A native chart should sit cleanly inside an adapter media frame", body: "Theme, layout, and QA coverage values are plotted inside the frame." },
      { title: "Native tables should export through the adapter without helper errors", body: "Theme aliases, frame export, and readability checks are shown in a native table." },
    ],
  };
}

function buildFourByThreeDeck() {
  const deck = createJudgmentKitPresentation({
    Presentation,
    helpers,
    presentationOptions: { slideSize: { width: 1024, height: 768 } },
  });
  const { presentation, kit } = deck;
  const c = kit.layout.contentFrame();
  const columns = kit.layout.columns(frame(kit, c.x, c.y + 288, c.width, 164), 3, { gap: 22 });

  composeSlide(presentation.slides.add(), kit, "four-by-three-layout", [
    kit.components.titleBlock({
      eyebrow: "CUSTOM SIZE CHECK",
      title: "A 4:3 deck should not inherit widescreen component defaults",
      subtitle: "Default content frames and component widths should match the 1024 by 768 canvas.",
      frame: frame(kit, c.x, c.y, c.width, 260),
    }),
    kit.components.metricTile({ label: "Canvas", value: "4:3", detail: "1024 by 768", frame: columns[0] }),
    kit.components.metricTile({ label: "Content", value: "880", detail: "Scoped frame width", frame: columns[1] }),
    kit.components.metricTile({ label: "Margin", value: "72", detail: "Equal left and right", frame: columns[2] }),
    kit.components.evidencePanel({
      title: "Expected visual result",
      body: [
        "The three tiles should align within the narrower canvas.",
        "The evidence panel should end before the right edge.",
        "No text should wrap into adjacent elements.",
      ],
      frame: frame(kit, c.x, c.y + 476, c.width, 180),
    }),
  ]);

  return {
    deck,
    slides: [{ title: "A 4:3 deck should not inherit widescreen component defaults", body: "Default content frames and component widths should match the 1024 by 768 canvas." }],
  };
}

function buildCompactDeck() {
  const deck = createJudgmentKitPresentation({
    Presentation,
    helpers,
    slideSize: { width: 960, height: 540 },
  });
  const { presentation, kit } = deck;
  const c = kit.layout.contentFrame();

  composeSlide(presentation.slides.add(), kit, "compact-decision-slide", [
    kit.components.sectionHeader({
      label: "COMPACT REVIEW",
      title: "Compact review needs density controls",
      frame: frame(kit, c.x, 42, c.width, 80),
    }),
    kit.components.evidencePanel({
      title: "Decision evidence",
      body: ["Primary claim is supported.", "Temperature trace stayed within bounds.", "Handoff owner is named."],
      frame: frame(kit, c.x, 150, 396, 198),
    }),
    kit.components.riskCallout({
      title: "Watch",
      body: ["Longer evidence copy can run close to the panel edge.", "Small labels become hard to read on the compact canvas."],
      frame: frame(kit, c.x + 424, 150, 392, 198),
    }),
    kit.components.statusPill({
      label: "Needs readback",
      status: "warning",
      frame: frame(kit, c.x, 374, 182, 34),
    }),
    kit.components.handoffReceipt({
      title: "Exit state",
      body: "Reviewer leaves with a clear decision, a named owner, and a short evidence trail.",
      frame: frame(kit, c.x + 210, 366, 606, 124),
    }),
  ]);

  return {
    deck,
    slides: [{ title: "Compact review needs density controls", body: "Decision evidence includes a temperature trace, handoff owner, and exit state." }],
  };
}

async function main() {
  for (const dir of [previewRoot, layoutRoot, importedLayoutRoot, inspectRoot, evidenceRoot]) {
    await fs.mkdir(dir, { recursive: true });
  }

  const canonical = buildCanonicalDeck();
  const fourByThree = buildFourByThreeDeck();
  const compact = buildCompactDeck();
  const outputs = [
    await saveDeck("jk-theme-canonical-16x9", canonical.deck, canonical.slides),
    await saveDeck("jk-theme-custom-4x3", fourByThree.deck, fourByThree.slides),
    await saveDeck("jk-theme-compact-review", compact.deck, compact.slides),
  ];
  await writeJson(path.join(outputDir, "manifest.json"), {
    source: fileURLToPath(import.meta.url),
    outputs,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
