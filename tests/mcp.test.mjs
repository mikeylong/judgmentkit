import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  formatPlanningCard,
  getMcpMetadata,
  handleToolCall,
  listTools,
  runVisualCompositionBrowserAdmission,
} from "../src/mcp.mjs";

function withNoApplicableVisualComposition(candidate, implementationContract) {
  if (!implementationContract?.visual_composition_policy) return candidate;
  return {
    ...candidate,
    rendered_html:
      '<main data-primary-surface="fixture">No governed visual relationships</main>',
  };
}

const tools = listTools();
const metadata = getMcpMetadata("stdio");
const OLD_TOOL_NAMES = [
  "list_resources",
  "get_resource",
  "get_workflow_bundle",
  "get_page_markdown",
  "get_example",
  "resolve_related",
];
const WORKSPACE_ENV_KEYS = [
  "JUDGMENTKIT_WORKSPACE_ROOT",
  "CODEX_WORKSPACE_ROOT",
  "CODEX_WORKSPACE_DIR",
  "CODEX_WORKSPACE",
  "INIT_CWD",
];

function createFixtureArtifactToolPackage(root) {
  const packageRoot = path.join(root, "artifact-tool");
  const distDir = path.join(packageRoot, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify({ name: "@oai/artifact-tool", version: "2.0.0", type: "module" }, null, 2),
  );
  fs.writeFileSync(
    path.join(distDir, "artifact_tool.mjs"),
    `
import fs from "node:fs";

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = (value >>> 8) ^ CRC_TABLE[(value ^ byte) & 0xff];
  }
  return (value ^ 0xffffffff) >>> 0;
}

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function writeZip(filePath, entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [entryName, content] of entries) {
    const name = Buffer.from(entryName, "utf8");
    const data = Buffer.from(content, "utf8");
    const checksum = crc32(data);
    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(data.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      name,
      data,
    ]);
    const centralHeader = Buffer.concat([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(data.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      name,
    ]);

    localParts.push(localHeader);
    centralParts.push(centralHeader);
    offset += localHeader.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0),
  ]);

  fs.writeFileSync(filePath, Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]));
}

function createSlide() {
  return {
    background: {},
    layers: [],
    charts: { add() {} },
    compose(layer, options) {
      this.layers.push({ layer, options });
    },
  };
}

export const Presentation = {
  create(options = {}) {
    const presentation = {
      createOptions: options,
      slideSize: options.slideSize,
      theme: {},
      slides: {
        items: [],
        add() {
          const slide = createSlide();
          this.items.push(slide);
          return slide;
        },
      },
    };

    return presentation;
  },
};

export const PresentationFile = {
  async exportPptx(presentation) {
    return {
      async save(filePath) {
        const slideCount = Math.max(1, presentation?.slides?.items?.length ?? 0);
        const slideEntries = Array.from({ length: slideCount }, (_, index) => [
          "ppt/slides/slide" + String(index + 1) + ".xml",
          "<p:sld xmlns:p='http://schemas.openxmlformats.org/presentationml/2006/main'/>",
        ]);
        writeZip(filePath, [
          ["[Content_Types].xml", "<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'/>"],
          ["ppt/presentation.xml", "<p:presentation xmlns:p='http://schemas.openxmlformats.org/presentationml/2006/main'/>"],
          ...slideEntries,
        ]);
      },
    };
  },
};

export function layers(options, children = []) {
  return { type: "layers", options, children };
}

export function shape(options) {
  return { type: "shape", options };
}

export function table(options) {
  return { type: "table", options };
}

export function text(lines, options) {
  return { type: "text", lines, options };
}
`,
  );

  return packageRoot;
}

function captureWorkspaceEnv() {
  return Object.fromEntries(WORKSPACE_ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreWorkspaceEnv(values) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

assert.deepEqual(
  tools.map((tool) => tool.name),
  [
    "analyze_implementation_brief",
    "create_activity_model_review",
    "recommend_surface_types",
    "recommend_ui_workflow_profiles",
    "review_activity_model_candidate",
    "review_ui_workflow_candidate",
    "review_cognitive_dimensions_candidate",
    "create_ui_implementation_contract",
    "review_ui_implementation_candidate",
    "create_ui_generation_handoff",
    "create_frontend_generation_context",
    "create_frontend_implementation_skill_context",
    "create_slide_deck",
    "list_icon_catalog",
    "search_icon_catalog",
    "get_icon_svg",
  ],
);
assert.equal(metadata.name, "JudgmentKit");
assert.equal(metadata.version, "0.7.0");
assert.deepEqual(metadata.capabilities.prompts, []);

{
  let releaseFirstReview;
  const firstReview = runVisualCompositionBrowserAdmission(
    () =>
      new Promise((resolve) => {
        releaseFirstReview = resolve;
      }),
    { timeout_ms: 1_000 },
  );

  await assert.rejects(
    runVisualCompositionBrowserAdmission(() => Promise.resolve("not admitted")),
    (error) =>
      error?.code === "visual_composition_browser_capacity_exceeded" &&
      error?.details?.retryable === true &&
      error?.details?.max_in_process_concurrency === 1,
    "A second browser-backed review in one process must fail closed instead of launching another browser.",
  );

  releaseFirstReview("first admitted");
  assert.equal(await firstReview, "first admitted");
}

{
  let finishTimedOutReview;
  const timedOutReview = runVisualCompositionBrowserAdmission(
    () =>
      new Promise((resolve) => {
        finishTimedOutReview = resolve;
      }),
    { timeout_ms: 10 },
  );

  await assert.rejects(
    timedOutReview,
    (error) =>
      error?.code === "visual_composition_browser_timeout" &&
      error?.details?.retryable === true &&
      error?.details?.timeout_ms === 10,
    "Browser-backed review must return a stable fail-closed timeout before the hosted function deadline.",
  );
  await assert.rejects(
    runVisualCompositionBrowserAdmission(() => Promise.resolve("not admitted")),
    (error) => error?.code === "visual_composition_browser_capacity_exceeded",
    "A timed-out browser operation must continue holding its capacity slot until cleanup finishes.",
  );

  finishTimedOutReview("cleaned up");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    await runVisualCompositionBrowserAdmission(() => Promise.resolve("admitted")),
    "admitted",
    "Browser capacity must become available after the underlying operation finishes cleanup.",
  );
}

{
  const contractPacket = await handleToolCall(
    "create_ui_implementation_contract",
    {},
  );
  let releaseOccupiedSlot;
  const occupiedSlot = runVisualCompositionBrowserAdmission(
    () =>
      new Promise((resolve) => {
        releaseOccupiedSlot = resolve;
      }),
    { timeout_ms: 1_000 },
  );

  const codeOnlyReview = await handleToolCall(
    "review_ui_implementation_candidate",
    {
      implementation_contract: contractPacket.implementation_contract,
      candidate: {
        code: "export function App() { return <main>Not rendered HTML</main>; }",
      },
    },
  );
  assert.notEqual(
    codeOnlyReview.error?.code,
    "visual_composition_browser_capacity_exceeded",
    "Code-only diagnostic reviews must not consume hosted browser admission.",
  );

  const renderableReview = await handleToolCall(
    "review_ui_implementation_candidate",
    {
      implementation_contract: contractPacket.implementation_contract,
      candidate: { rendered_html: "<main>Rendered candidate</main>" },
    },
  );
  assert.equal(
    renderableReview.error?.code,
    "visual_composition_browser_capacity_exceeded",
    "Only a renderable visual-composition review should encounter occupied browser capacity.",
  );

  releaseOccupiedSlot("cleaned up");
  await occupiedSlot;
}

{
  const contractPacket = await handleToolCall(
    "create_ui_implementation_contract",
    {},
  );
  const priorChromePath =
    process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH;
  const originalConsoleError = console.error;
  const diagnostics = [];
  process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH =
    "/judgmentkit-test/missing-chrome";
  console.error = (...parts) => diagnostics.push(parts.join(" "));
  let unavailableReview;
  try {
    unavailableReview = await handleToolCall(
      "review_ui_implementation_candidate",
      {
        implementation_contract: contractPacket.implementation_contract,
        candidate: {
          rendered_html: "<main>Renderable candidate</main>",
        },
      },
    );
  } finally {
    console.error = originalConsoleError;
    if (priorChromePath === undefined) {
      delete process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH;
    } else {
      process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH = priorChromePath;
    }
  }

  assert.deepEqual(unavailableReview.error, {
    code: "visual_composition_browser_runtime_unavailable",
    message:
      "The trusted visual composition browser runtime is unavailable; retry the review.",
    details: { retryable: true },
  });
  assert.equal(
    JSON.stringify(unavailableReview).includes(
      "Configured Chrome executable is unavailable",
    ),
    false,
  );
  assert.equal(
    JSON.stringify(unavailableReview).includes(
      "missing_visual_composition_manifest",
    ),
    false,
  );
  const diagnostic = JSON.parse(diagnostics[0]);
  assert.equal(diagnostic.level, "error");
  assert.equal(
    diagnostic.code,
    "visual_composition_browser_runtime_unavailable",
  );
  assert.equal(diagnostic.error_code, "configured_chrome_unavailable");
}

const toolsJson = JSON.stringify(tools);
for (const legacyField of [
  "primary_ui",
  "primary_surface",
  "workflow.steps",
  "terms_to_keep_out_of_primary_ui",
]) {
  assert.equal(
    toolsJson.includes(legacyField),
    false,
    `MCP tool metadata must not expose legacy field ${legacyField}`,
  );
}
for (const oldToolName of OLD_TOOL_NAMES) {
  assert.equal(
    tools.some((tool) => tool.name === oldToolName),
    false,
    `MCP catalog must not expose old tool ${oldToolName}`,
  );
}
const toolByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
assert.equal(tools[0].inputSchema.required.includes("brief"), true);
assert.equal(tools[0].inputSchema.properties.brief.minLength, 1);
assert.equal(tools[1].inputSchema.required.includes("brief"), true);
assert.equal(tools[1].inputSchema.properties.brief.minLength, 1);
assert.equal(tools[2].inputSchema.required.includes("brief"), true);
assert.equal(toolByName.recommend_surface_types.inputSchema.properties.activity_review.type, "object");
assert.equal(toolByName.recommend_surface_types.inputSchema.properties.activityReview.type, "object");
assert.equal(
  toolByName.recommend_surface_types.inputSchema.required.includes("activityReview"),
  false,
);
assert.equal(tools[3].inputSchema.required.includes("brief"), true);
assert.equal(tools[4].inputSchema.required.includes("brief"), true);
assert.equal(tools[4].inputSchema.required.includes("candidate"), true);
assert.equal(tools[5].inputSchema.required.includes("brief"), true);
assert.equal(tools[5].inputSchema.required.includes("candidate"), true);
assert.equal(tools[5].inputSchema.properties.profile_id.type, "string");
assert.equal(tools[5].inputSchema.properties.surface_type.type, "string");
assert.equal(
  toolByName.review_cognitive_dimensions_candidate.inputSchema.required.includes("brief"),
  true,
);
assert.equal(
  toolByName.review_cognitive_dimensions_candidate.inputSchema.required.includes("candidate"),
  true,
);
assert.equal(
  toolByName.review_cognitive_dimensions_candidate.inputSchema.properties.surface_type.type,
  "string",
);
assert.equal(toolByName.create_ui_implementation_contract.inputSchema.properties.approved_primitives.type, "array");
assert.equal(toolByName.create_ui_implementation_contract.inputSchema.properties.accessibility_policy.type, "object");
assert.equal(toolByName.create_ui_implementation_contract.inputSchema.properties.default_ai_native_design_system.type, "object");
assert.equal(toolByName.create_ui_implementation_contract.inputSchema.properties.iteration_policy.type, "object");
assert.equal(toolByName.create_ui_implementation_contract.inputSchema.properties.design_system_adapter.type, "object");
assert.equal(toolByName.create_ui_implementation_contract.inputSchema.properties.design_system_source.type, "object");
assert.equal(toolByName.create_ui_implementation_contract.inputSchema.properties.visual_token_adapter.type, "object");
assert.equal(
  toolByName.create_ui_implementation_contract.inputSchema.properties.visual_composition_policy.type,
  "object",
);
assert.match(
  toolByName.create_ui_implementation_contract.inputSchema.properties.visual_composition_policy
    .description,
  /hosted MCP renders that artifact/i,
);
assert.ok(
  toolByName.create_ui_implementation_contract.inputSchema.properties.visual_token_adapter.description.includes(
    "font",
  ),
);
assert.ok(
  toolByName.create_frontend_implementation_skill_context.inputSchema.properties.design_system_adapter.description.includes(
    "Deprecated compatibility path",
  ),
);
assert.equal(toolByName.review_ui_implementation_candidate.inputSchema.required.includes("candidate"), true);
assert.equal(toolByName.review_ui_implementation_candidate.inputSchema.required.includes("implementation_contract"), true);
assert.equal(toolByName.review_ui_implementation_candidate.inputSchema.properties.surface_type.type, "string");
assert.equal(toolByName.review_ui_implementation_candidate.inputSchema.properties.surfaceType.type, "string");
assert.equal(toolByName.review_ui_implementation_candidate.inputSchema.properties.surface_review.type, "object");
assert.equal(toolByName.review_ui_implementation_candidate.inputSchema.properties.surfaceReview.type, "object");
assert.equal(
  toolByName.review_ui_implementation_candidate.inputSchema.properties.frontend_generation_context.type,
  "object",
);
assert.equal(
  toolByName.review_ui_implementation_candidate.inputSchema.properties.frontendGenerationContext.type,
  "object",
);
assert.equal(toolByName.review_ui_implementation_candidate.inputSchema.properties.iteration_context.type, "object");
const reviewImplementationCandidateHelp = JSON.stringify(
  toolByName.review_ui_implementation_candidate,
);
for (const evidenceField of [
  "visual_token_evidence",
  "component_contract_evidence",
  "pattern_contract_evidence",
  "local_component_authority_evidence",
  "design_system_provenance",
  "visual_composition_evidence",
]) {
  assert.ok(
    reviewImplementationCandidateHelp.includes(evidenceField),
    `review_ui_implementation_candidate help should mention ${evidenceField}`,
  );
}
assert.match(
  reviewImplementationCandidateHelp,
  /local_component_authority(?!_evidence)/,
  "review_ui_implementation_candidate help should mention checks.local_component_authority.",
);
assert.match(
  reviewImplementationCandidateHelp,
  /primitives_used[^.]*only[^.]*implementation_contract\.approved_primitives/i,
);
assert.match(
  reviewImplementationCandidateHelp,
  /failed candidates, not artifacts/i,
  "review_ui_implementation_candidate help should state failed design-system candidates are not artifacts.",
);
assert.match(
  reviewImplementationCandidateHelp,
  /String-only snippets that cannot render are diagnostic/i,
  "review_ui_implementation_candidate help should state text-only candidates cannot pass required provenance.",
);
assert.match(
  reviewImplementationCandidateHelp,
  /browser_qa\.visual_composition/,
  "review_ui_implementation_candidate help should name the nested visual-composition evidence alias.",
);
assert.match(
  reviewImplementationCandidateHelp,
  /self-contained HTML/i,
  "review_ui_implementation_candidate help should require a self-contained renderable artifact.",
);
assert.match(
  reviewImplementationCandidateHelp,
  /hosted MCP renders[^.]*isolated browser/i,
  "review_ui_implementation_candidate help should describe the trusted browser runtime.",
);
assert.match(
  reviewImplementationCandidateHelp,
  /Candidate-authored visual_composition_evidence[\s\S]*cannot pass/i,
  "review_ui_implementation_candidate help should reject caller-authored acceptance evidence.",
);
assert.equal(toolByName.create_ui_generation_handoff.inputSchema.required.includes("workflow_review"), true);
assert.equal(toolByName.create_ui_generation_handoff.inputSchema.required.includes("implementation_contract"), true);
assert.equal(toolByName.create_ui_generation_handoff.inputSchema.properties.cognitive_dimensions_review.type, "object");
assert.equal(toolByName.create_frontend_generation_context.inputSchema.required.includes("ui_generation_handoff"), true);
assert.equal(toolByName.create_frontend_implementation_skill_context.inputSchema.required.includes("frontend_generation_context"), true);
assert.equal(toolByName.create_slide_deck.inputSchema.required.includes("slides"), true);
assert.equal(toolByName.create_slide_deck.inputSchema.properties.slides.maxItems, 24);
assert.equal(toolByName.create_slide_deck.inputSchema.properties.output.properties.path.type, "string");
assert.equal(toolByName.create_slide_deck.inputSchema.properties.runtime.properties.artifact_tool_package.type, "string");
assert.equal(toolByName.create_slide_deck.inputSchema.properties.runtime.properties.workspace_root.type, "string");
assert.equal(toolByName.list_icon_catalog.inputSchema.properties.include_svg.type, "boolean");
assert.equal(toolByName.search_icon_catalog.inputSchema.required.includes("query"), true);
assert.equal(toolByName.get_icon_svg.inputSchema.required.includes("id"), true);

const deckPlan = await handleToolCall("create_slide_deck", {
  deck: {
    deck_id: "Quarterly review",
    title: "Quarterly review",
  },
  slides: [
    {
      template_id: "slide-21",
      content: {
        title: "Quarterly review",
        subtitle: "Evidence and decisions for the product team.",
      },
    },
    {
      selection: {
        template_use: "chart",
        layout_family: "chart-evidence",
      },
      content: {
        title: "Activation trend",
        metrics: [
          { label: "Activation", value: "68%", detail: "Current quarter" },
        ],
      },
    },
  ],
  dry_run: true,
});
assert.equal("error" in deckPlan, false);
assert.equal(deckPlan.schema, "judgmentkit.mcp.slide-deck/v1");
assert.equal(deckPlan.deck_creation_status, "planned");
assert.equal(deckPlan.deck.deck_id, "quarterly-review");
assert.equal(deckPlan.deck.slide_count, 2);
assert.equal(deckPlan.deck.template_registry_version, "0.1.0");
assert.equal(deckPlan.planned_output.path, "outputs/judgmentkit-slide-decks/quarterly-review.pptx");
assert.equal(deckPlan.slides[0].layout_id, "slide-21");
assert.equal(deckPlan.slides[0].selected_by, "template_id");
assert.equal(deckPlan.slides[0].content_keys.includes("title"), true);
assert.equal("content" in deckPlan.slides[0], false);
assert.equal(deckPlan.slides[1].layout_id, "slide-64");
assert.equal(deckPlan.slides[1].selected_by, "selection");

const deckPlanText = formatPlanningCard(deckPlan);
assert.ok(deckPlanText.includes("## JudgmentKit Slide Deck"));
assert.ok(deckPlanText.includes("**Status:** Deck plan ready"));
assert.ok(deckPlanText.includes("slide-21"));
assert.equal(deckPlanText.includes("Evidence and decisions for the product team."), false);

const inferredTemplateDeck = await handleToolCall("create_slide_deck", {
  deck: { deck_id: "inferred template deck" },
  slides: [
    { content: { title: "Case study", subtitle: "Decision context." } },
    {
      content: {
        title: "Evidence table",
        rows: [
          { signal: "Queue pressure", value: "High" },
          { signal: "Review debt", value: "Rising" },
        ],
      },
    },
    {
      content: {
        title: "Trend evidence",
        chart: { type: "line" },
        series: [{ label: "Cycle time", values: [4, 5, 7] }],
      },
    },
    {
      content: {
        title: "Outcome metrics",
        metrics: [{ label: "Saved time", value: "32%" }],
      },
    },
    {
      content: {
        title: "Before and after",
        comparison: {
          before: "Manual routing",
          after: "Evidence-led review",
        },
      },
    },
  ],
  dry_run: true,
});
assert.equal("error" in inferredTemplateDeck, false);
assert.deepEqual(
  inferredTemplateDeck.slides.map((slide) => slide.layout_id),
  ["slide-21", "slide-08", "slide-64", "slide-62", "slide-06"],
);
assert.equal(inferredTemplateDeck.slides.every((slide) => slide.selected_by === "default"), true);

const repeatedLayoutDeck = await handleToolCall("create_slide_deck", {
  deck: { deck_id: "repeated layout deck" },
  slides: Array.from({ length: 12 }, (_, index) => ({
    selection: {
      template_use: index === 0 ? "cover" : "process",
      layout_family: index === 0 ? "cover-image-field" : "two-column-content",
    },
    content: { title: `Repeated layout ${index + 1}` },
  })),
  dry_run: true,
});
assert.equal("error" in repeatedLayoutDeck, false);
assert.equal(
  repeatedLayoutDeck.warnings.some(
    (warning) => warning.code === "layout_repetition_warning" && warning.layout_id === "slide-01",
  ),
  true,
);
assert.ok(formatPlanningCard(repeatedLayoutDeck).includes("layout"));

const explicitTemplateDeck = await handleToolCall("create_slide_deck", {
  deck: { deck_id: "explicit template variety" },
  slides: [
    { template_id: "slide-21", content: { title: "Case study" } },
    { template_id: "slide-06", content: { title: "Problem and solution" } },
    { template_id: "slide-64", content: { title: "Trend", chart: { type: "line" } } },
    { template_id: "slide-08", content: { title: "Evidence", rows: [{ label: "A" }] } },
    { template_id: "slide-62", content: { title: "Metrics", metrics: [{ label: "A" }] } },
    { template_id: "slide-80", content: { title: "Close", body: "Next steps" } },
  ],
  dry_run: true,
});
assert.equal("error" in explicitTemplateDeck, false);
assert.deepEqual(
  explicitTemplateDeck.slides.map((slide) => slide.layout_id),
  ["slide-21", "slide-06", "slide-64", "slide-08", "slide-62", "slide-80"],
);
assert.equal(new Set(explicitTemplateDeck.slides.map((slide) => slide.layout_id)).size >= 5, true);
assert.equal(explicitTemplateDeck.slides.every((slide) => slide.selected_by === "template_id"), true);
assert.equal(
  explicitTemplateDeck.warnings.some((warning) => warning.code === "layout_repetition_warning"),
  false,
);

const missingSlidesDeck = await handleToolCall("create_slide_deck", {
  slides: [],
  dry_run: true,
});
assert.equal("error" in missingSlidesDeck, true);
assert.match(missingSlidesDeck.error.message, /at least one slide/i);

const unknownTemplateDeck = await handleToolCall("create_slide_deck", {
  slides: [
    {
      template_id: "not-a-template",
      content: { title: "Unknown" },
    },
  ],
  dry_run: true,
});
assert.equal("error" in unknownTemplateDeck, true);
assert.equal(unknownTemplateDeck.error.code, "slide_template_not_found");

const unsafeOutputDeck = await handleToolCall("create_slide_deck", {
  output: { path: "../unsafe.pptx" },
  slides: [
    {
      content: { title: "Unsafe path" },
    },
  ],
});
assert.equal("error" in unsafeOutputDeck, true);
assert.equal(unsafeOutputDeck.error.code, "unsafe_output_path");
assert.equal(unsafeOutputDeck.deck_creation_status, "export_failed");
assert.equal(unsafeOutputDeck.export_status, "failed");
assert.equal(unsafeOutputDeck.export_attempt.output_path, "../unsafe.pptx");

const absoluteOutputDeck = await handleToolCall("create_slide_deck", {
  output: { path: path.join(process.cwd(), "outputs/judgmentkit-slide-decks/absolute.pptx") },
  runtime: { workspace_root: process.cwd() },
  slides: [
    {
      content: { title: "Absolute path" },
    },
  ],
});
assert.equal("error" in absoluteOutputDeck, true);
assert.equal(absoluteOutputDeck.error.code, "unsafe_output_path");
assert.match(absoluteOutputDeck.error.message, /repo-relative/i);
assert.equal(absoluteOutputDeck.error.details.workspace_root, process.cwd());
assert.equal(absoluteOutputDeck.deck_creation_status, "export_failed");
assert.equal(absoluteOutputDeck.export_status, "failed");

const missingRuntimeWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-missing-runtime-"));
try {
  const missingRuntimeDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    output: { path: "outputs/judgmentkit-slide-decks/missing-runtime-test.pptx" },
    runtime: {
      artifact_tool_package: "/no/such/artifact-tool",
      workspace_root: missingRuntimeWorkspace,
    },
    slides: [
      {
        content: { title: "Needs runtime" },
      },
    ],
  });
  assert.equal("error" in missingRuntimeDeck, true);
  assert.equal(missingRuntimeDeck.error.code, "artifact_runtime_unavailable");
  assert.equal(missingRuntimeDeck.deck_creation_status, "export_failed");
  assert.equal(missingRuntimeDeck.export_status, "failed");
  assert.equal(missingRuntimeDeck.export_attempt.workspace_root, missingRuntimeWorkspace);
} finally {
  fs.rmSync(missingRuntimeWorkspace, { recursive: true, force: true });
}

const originalCwd = process.cwd();
const originalWorkspaceEnv = captureWorkspaceEnv();
const unsafeImplicitRoot = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-unsafe-cwd-"));
const unsafeExactCwd = path.join(unsafeImplicitRoot, ".codex");
const unsafeNestedCwd = path.join(unsafeExactCwd, "judgmentkit-mcp");
fs.mkdirSync(unsafeNestedCwd, { recursive: true });
try {
  for (const key of WORKSPACE_ENV_KEYS) {
    delete process.env[key];
  }
  process.chdir(unsafeNestedCwd);
  const missingWorkspaceDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    slides: [
      {
        content: { title: "Missing workspace" },
      },
    ],
  });
  assert.equal("error" in missingWorkspaceDeck, true);
  assert.equal(missingWorkspaceDeck.error.code, "workspace_root_missing");
  assert.equal(missingWorkspaceDeck.deck_creation_status, "export_failed");

  process.chdir(unsafeExactCwd);
  const exactUnsafeWorkspaceDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    slides: [
      {
        content: { title: "Exact unsafe workspace" },
      },
    ],
  });
  assert.equal("error" in exactUnsafeWorkspaceDeck, true);
  assert.equal(exactUnsafeWorkspaceDeck.error.code, "workspace_root_missing");
  assert.equal(exactUnsafeWorkspaceDeck.deck_creation_status, "export_failed");

  process.chdir(originalCwd);
  process.env.JUDGMENTKIT_WORKSPACE_ROOT = unsafeExactCwd;
  const envUnsafeWorkspaceDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    slides: [
      {
        content: { title: "Env unsafe workspace" },
      },
    ],
  });
  assert.equal("error" in envUnsafeWorkspaceDeck, true);
  assert.equal(envUnsafeWorkspaceDeck.error.code, "workspace_root_invalid");
  assert.equal(envUnsafeWorkspaceDeck.deck_creation_status, "export_failed");
  delete process.env.JUDGMENTKIT_WORKSPACE_ROOT;

  const unsafeSymlinkWorkspace = path.join(unsafeImplicitRoot, "workspace-link");
  fs.symlinkSync(unsafeExactCwd, unsafeSymlinkWorkspace);
  const symlinkUnsafeWorkspaceDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    runtime: {
      workspace_root: unsafeSymlinkWorkspace,
    },
    slides: [
      {
        content: { title: "Symlink unsafe workspace" },
      },
    ],
  });
  assert.equal("error" in symlinkUnsafeWorkspaceDeck, true);
  assert.equal(symlinkUnsafeWorkspaceDeck.error.code, "workspace_root_invalid");
  assert.equal(symlinkUnsafeWorkspaceDeck.deck_creation_status, "export_failed");

  const explicitWorkspaceDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    output: {
      path: `outputs/judgmentkit-slide-decks/explicit-workspace-${process.pid}.pptx`,
    },
    runtime: {
      artifact_tool_package: "/no/such/artifact-tool",
      workspace_root: originalCwd,
    },
    slides: [
      {
        content: { title: "Explicit workspace" },
      },
    ],
  });
  assert.equal("error" in explicitWorkspaceDeck, true);
  assert.equal(explicitWorkspaceDeck.error.code, "artifact_runtime_unavailable");
  assert.equal(explicitWorkspaceDeck.export_attempt.workspace_root, originalCwd);
} finally {
  process.chdir(originalCwd);
  restoreWorkspaceEnv(originalWorkspaceEnv);
  fs.rmSync(unsafeImplicitRoot, { recursive: true, force: true });
}

const existingOutputPath = path.join(
  process.cwd(),
  "outputs",
  "judgmentkit-slide-decks",
  "existing-output-test.pptx",
);
fs.mkdirSync(path.dirname(existingOutputPath), { recursive: true });
fs.writeFileSync(existingOutputPath, "existing");
try {
  const existingOutputDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    output: {
      path: "outputs/judgmentkit-slide-decks/existing-output-test.pptx",
    },
    runtime: {
      artifact_tool_package: "/no/such/artifact-tool",
    },
    slides: [
      {
        content: { title: "Existing output" },
      },
    ],
  });
  assert.equal("error" in existingOutputDeck, true);
  assert.equal(existingOutputDeck.error.code, "output_exists");
  assert.equal(existingOutputDeck.deck_creation_status, "export_failed");
} finally {
  fs.rmSync(existingOutputPath, { force: true });
}

const receiptExistsWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-receipt-exists-"));
try {
  const exportPath = "outputs/judgmentkit-slide-decks/receipt-exists-test.pptx";
  const receiptPath = path.join(receiptExistsWorkspace, `${exportPath}.receipt.json`);
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, "existing receipt", "utf8");
  const existingReceiptDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    output: { path: exportPath },
    runtime: {
      artifact_tool_package: "/no/such/artifact-tool",
      workspace_root: receiptExistsWorkspace,
    },
    slides: [
      {
        content: { title: "Existing receipt" },
      },
    ],
  });
  assert.equal("error" in existingReceiptDeck, true);
  assert.equal(existingReceiptDeck.error.code, "output_exists");
  assert.equal(existingReceiptDeck.error.details.target, "provenance receipt");
  assert.equal(fs.existsSync(path.join(receiptExistsWorkspace, exportPath)), false);
} finally {
  fs.rmSync(receiptExistsWorkspace, { recursive: true, force: true });
}

const receiptSymlinkWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-receipt-symlink-"));
try {
  const exportPath = "outputs/judgmentkit-slide-decks/receipt-symlink-test.pptx";
  const receiptPath = path.join(receiptSymlinkWorkspace, `${exportPath}.receipt.json`);
  const outsideReceiptTarget = path.join(receiptSymlinkWorkspace, "outside-receipt-target.json");
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(outsideReceiptTarget, "outside-before", "utf8");
  fs.symlinkSync(outsideReceiptTarget, receiptPath);
  const symlinkReceiptDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    output: { path: exportPath },
    runtime: {
      artifact_tool_package: "/no/such/artifact-tool",
      workspace_root: receiptSymlinkWorkspace,
    },
    slides: [
      {
        content: { title: "Receipt symlink" },
      },
    ],
  });
  assert.equal("error" in symlinkReceiptDeck, true);
  assert.equal(symlinkReceiptDeck.error.code, "unsafe_output_path");
  assert.equal(fs.readFileSync(outsideReceiptTarget, "utf8"), "outside-before");
  assert.equal(fs.existsSync(path.join(receiptSymlinkWorkspace, exportPath)), false);
} finally {
  fs.rmSync(receiptSymlinkWorkspace, { recursive: true, force: true });
}

const symlinkOutputWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-output-symlink-"));
const symlinkOutputOutside = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-output-outside-"));
try {
  const outputRoot = path.join(symlinkOutputWorkspace, "outputs", "judgmentkit-slide-decks");
  fs.mkdirSync(path.dirname(outputRoot), { recursive: true });
  fs.symlinkSync(symlinkOutputOutside, outputRoot);
  const symlinkOutputDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    output: { path: "outputs/judgmentkit-slide-decks/symlink-output-test.pptx" },
    runtime: {
      artifact_tool_package: "/no/such/artifact-tool",
      workspace_root: symlinkOutputWorkspace,
    },
    slides: [
      {
        content: { title: "Symlink output" },
      },
    ],
  });
  assert.equal("error" in symlinkOutputDeck, true);
  assert.equal(symlinkOutputDeck.error.code, "unsafe_output_path");
  assert.equal(fs.existsSync(path.join(symlinkOutputOutside, "symlink-output-test.pptx")), false);
} finally {
  fs.rmSync(symlinkOutputWorkspace, { recursive: true, force: true });
  fs.rmSync(symlinkOutputOutside, { recursive: true, force: true });
}

const nestedSymlinkWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-nested-symlink-"));
const nestedSymlinkOutside = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-nested-outside-"));
try {
  const linkPath = path.join(
    nestedSymlinkWorkspace,
    "outputs",
    "judgmentkit-slide-decks",
    "link",
  );
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(nestedSymlinkOutside, linkPath);
  const nestedSymlinkDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    output: { path: "outputs/judgmentkit-slide-decks/link/nested/deck.pptx" },
    runtime: {
      artifact_tool_package: "/no/such/artifact-tool",
      workspace_root: nestedSymlinkWorkspace,
    },
    slides: [
      {
        content: { title: "Nested symlink" },
      },
    ],
  });
  assert.equal("error" in nestedSymlinkDeck, true);
  assert.equal(nestedSymlinkDeck.error.code, "unsafe_output_path");
  assert.equal(fs.existsSync(path.join(nestedSymlinkOutside, "nested")), false);
} finally {
  fs.rmSync(nestedSymlinkWorkspace, { recursive: true, force: true });
  fs.rmSync(nestedSymlinkOutside, { recursive: true, force: true });
}

const receiptDirectoryWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-receipt-dir-"));
try {
  const exportPath = "outputs/judgmentkit-slide-decks/receipt-dir-test.pptx";
  const receiptPath = path.join(receiptDirectoryWorkspace, `${exportPath}.receipt.json`);
  fs.mkdirSync(receiptPath, { recursive: true });
  const receiptDirectoryDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    output: { path: exportPath },
    runtime: {
      artifact_tool_package: "/no/such/artifact-tool",
      workspace_root: receiptDirectoryWorkspace,
    },
    slides: [
      {
        content: { title: "Receipt directory" },
      },
    ],
  });
  assert.equal("error" in receiptDirectoryDeck, true);
  assert.equal(receiptDirectoryDeck.error.code, "output_exists");
  assert.equal(fs.existsSync(path.join(receiptDirectoryWorkspace, exportPath)), false);
} finally {
  fs.rmSync(receiptDirectoryWorkspace, { recursive: true, force: true });
}

const overwriteReceiptFailureWorkspace = fs.mkdtempSync(
  path.join(os.tmpdir(), "judgmentkit-overwrite-receipt-fail-"),
);
try {
  const exportPath = "outputs/judgmentkit-slide-decks/overwrite-receipt-fail-test.pptx";
  const outputPath = path.join(overwriteReceiptFailureWorkspace, exportPath);
  const receiptPath = path.join(overwriteReceiptFailureWorkspace, `${exportPath}.receipt.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, "existing deck", "utf8");
  fs.mkdirSync(receiptPath, { recursive: true });
  const overwriteReceiptFailureDeck = await handleToolCall("create_slide_deck", {
    dry_run: false,
    output: { path: exportPath, overwrite: true },
    runtime: {
      artifact_tool_package: "/no/such/artifact-tool",
      workspace_root: overwriteReceiptFailureWorkspace,
    },
    slides: [
      {
        content: { title: "Overwrite receipt failure" },
      },
    ],
  });
  assert.equal("error" in overwriteReceiptFailureDeck, true);
  assert.equal(overwriteReceiptFailureDeck.error.code, "output_exists");
  assert.equal(fs.readFileSync(outputPath, "utf8"), "existing deck");
} finally {
  fs.rmSync(overwriteReceiptFailureWorkspace, { recursive: true, force: true });
}

const artifactToolFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-artifact-fixture-"));
const artifactToolPackage = createFixtureArtifactToolPackage(artifactToolFixtureRoot);
try {
  const exportWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-export-"));
  const exportPath = "outputs/judgmentkit-slide-decks/repro-minimal-test.pptx";
  try {
    const exportedDeck = await handleToolCall("create_slide_deck", {
      deck: { deck_id: "repro minimal test" },
      dry_run: false,
      include_diagnostics: true,
      output: {
        path: exportPath,
      },
      runtime: {
        artifact_tool_package: artifactToolPackage,
        workspace_root: exportWorkspace,
      },
      slides: [
        {
          template_id: "slide-21",
          content: {
            title: "Minimal export",
            subtitle: "Workspace-root export proof.",
          },
        },
      ],
    });

    assert.equal("error" in exportedDeck, false);
    assert.equal(exportedDeck.deck_creation_status, "exported");
    assert.equal(exportedDeck.export_status, "exported");
    assert.equal(exportedDeck.artifact_ref.path, exportPath);
    assert.equal(exportedDeck.provenance_receipt.tool_name, "mcp__judgmentkit.create_slide_deck");
    assert.equal(exportedDeck.provenance_receipt.output_path, exportPath);
    assert.equal(exportedDeck.provenance_receipt.workspace_root, exportWorkspace);
    assert.equal(exportedDeck.provenance_receipt.sha256, exportedDeck.artifact_ref.sha256);
    assert.equal(exportedDeck.provenance_receipt.bytes, exportedDeck.artifact_ref.bytes);
    assert.equal(exportedDeck.provenance_receipt.mime_type, exportedDeck.artifact_ref.mime_type);
    assert.equal(exportedDeck.provenance_receipt.selected_templates[0].layout_id, "slide-21");
    assert.equal(exportedDeck.provenance_receipt.selected_templates[0].caller_specified, true);
    assert.equal(fs.existsSync(path.join(exportWorkspace, exportPath)), true);
    assert.equal(fs.existsSync(path.join(exportWorkspace, `${exportPath}.receipt.json`)), true);
    const writtenReceipt = JSON.parse(
      fs.readFileSync(path.join(exportWorkspace, `${exportPath}.receipt.json`), "utf8"),
    );
    assert.equal(writtenReceipt.sha256, exportedDeck.artifact_ref.sha256);
    assert.equal(writtenReceipt.bytes, exportedDeck.artifact_ref.bytes);
    assert.equal(writtenReceipt.mime_type, exportedDeck.artifact_ref.mime_type);
    assert.equal(
      exportedDeck.provenance_receipt.absolute_resolved_path.startsWith(exportWorkspace),
      true,
    );
    assert.equal(formatPlanningCard(exportedDeck).includes("Receipt"), true);
  } finally {
    fs.rmSync(exportWorkspace, { recursive: true, force: true });
  }
} finally {
  fs.rmSync(artifactToolFixtureRoot, { recursive: true, force: true });
}

const iconList = await handleToolCall("list_icon_catalog", { limit: 2 });
assert.equal("error" in iconList, false);
assert.equal(iconList.icons.length, 2);
assert.ok(iconList.total_count > 1000);
assert.equal(iconList.include_svg, false);
assert.equal("svg" in iconList.icons[0], false);
assert.equal(iconList.source.library, "lucide");

const iconSearch = await handleToolCall("search_icon_catalog", {
  query: "receipt text",
  limit: 3,
});
assert.equal("error" in iconSearch, false);
assert.equal(iconSearch.icons[0].id, "receipt-text");
assert.ok(iconSearch.icons[0].score > 0);

const iconSvg = await handleToolCall("get_icon_svg", { id: "check" });
assert.equal("error" in iconSvg, false);
assert.equal(iconSvg.id, "check");
assert.ok(iconSvg.inline_svg.includes("<svg"));
assert.ok(iconSvg.icon.elements.length > 0);

const unsupportedIcon = await handleToolCall("get_icon_svg", {
  id: "not-a-lucide-icon",
});
assert.equal("error" in unsupportedIcon, true);

const refundTriageCandidate = {
  activity_model: {
    activity: "Support lead reviews refund requests during daily triage workflow.",
    participants: ["support lead"],
    objective:
      "Decide whether a case should be approved, sent to policy review, or returned for missing evidence.",
    outcomes: ["Clear handoff with next action and decision reason."],
    domain_vocabulary: ["refund requests", "policy review", "missing evidence"],
  },
  interaction_contract: {
    primary_decision:
      "Decide whether a case should be approved, sent to policy review, or returned for missing evidence.",
    next_actions: ["Confirm the handoff path."],
    completion: "Clear handoff with next action and decision reason.",
    make_easy: ["Review decision options in domain language."],
  },
  disclosure_policy: {
    terms_to_use: ["refund requests", "policy review", "missing evidence"],
    hidden_implementation_terms: [],
    translation_candidates: [],
    diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
  },
};

const formFlowCandidate = {
  activity_model: {
    activity: "Support manager updates billing settings.",
    participants: ["support manager"],
    objective:
      "Enter required billing information, resolve validation errors, and submit saved settings.",
    outcomes: ["Saved settings confirmation."],
    domain_vocabulary: ["billing information", "settings"],
  },
  interaction_contract: {
    primary_decision:
      "Decide whether required billing information is complete enough to submit.",
    next_actions: ["Save settings", "Submit change"],
    completion: "Saved settings confirmation.",
  },
  disclosure_policy: {
    terms_to_use: ["billing information", "settings"],
  },
};

function readyActivityReview(candidate) {
  return {
    review_status: "ready_for_review",
    candidate,
    guardrails: {
      source_missing_evidence: {
        decision: false,
      },
    },
  };
}

const refundWorkflowCandidate = {
  workflow: {
    surface_name: "Refund escalation queue",
    topology: "workspace",
    work_units: ["Review evidence", "Choose path", "Prepare handoff"],
    primary_actions: ["Approve refund", "Send to policy review", "Return for evidence"],
    decision_points: [
      "Decide whether the case should be approved, sent to policy review, or returned for missing evidence.",
    ],
    completion_state: "Clear handoff with next action and decision reason.",
  },
  surface_set: [
    {
      name: "Refund escalation workspace",
      purpose: "Review evidence, choose the refund path, and send a handoff.",
      sections: ["Selected case", "Evidence checklist", "Policy review context", "Handoff"],
      controls: ["Approve refund", "Send to policy review", "Return for evidence", "Send handoff"],
      relationship_to_workflow: "Keeps evidence, decision controls, and handoff receipt together.",
    },
  ],
  handoff: {
    next_owner: "support agent",
    reason: "Receipt or support evidence is missing.",
    next_action: "Send handoff with next action and decision reason.",
  },
  diagnostics: {
    implementation_terms: [],
    reveal_contexts: ["setup", "debugging", "auditing", "integration"],
  },
};

function createUiImplementationContractFixture() {
  return {
    approved_primitives: ["queue", "detail panel", "decision controls", "handoff receipt"],
    required_states: ["selected item", "handoff sent"],
    static_rules: ["npm test"],
    browser_qa_checks: ["desktop review", "mobile review"],
  };
}

function coreAccessibilityEvidence() {
  return {
    automated_checks: {
      status: "pass",
      method: "static accessibility checks",
      artifacts: ["npm test"],
    },
    semantic_content: {
      status: "pass",
      method: "DOM inspection",
      notes: "Semantic content verified.",
    },
    landmarks_headings: {
      status: "pass",
      method: "accessibility tree inspection",
      notes: "Landmarks and headings verified.",
    },
    name_role_value: {
      status: "pass",
      method: "accessibility tree inspection",
      notes: "Names, roles, states, and values verified.",
    },
    keyboard_navigation: {
      status: "pass",
      method: "keyboard walkthrough",
      notes: "All actions are keyboard operable.",
    },
    focus_order: {
      status: "pass",
      method: "keyboard walkthrough",
      notes: "Focus order preserves meaning.",
    },
    focus_visible: {
      status: "pass",
      method: "browser review",
      notes: "Focus indicators remain visible.",
    },
    responsive_no_overflow: {
      status: "pass",
      method: "desktop and mobile browser review",
      notes: "No responsive overflow.",
    },
    non_text_contrast: {
      status: "pass",
      method: "computed contrast review",
      notes: "Control boundaries and state indicators meet non-text contrast.",
    },
    semantic_fallbacks: {
      status: "pass",
      method: "DOM inspection",
      notes: "Semantic HTML provides fallback structure for rendered content.",
    },
  };
}

function defaultDesignSystemProvenance() {
  return {
    source: "judgmentkit_default",
    token_source: "/design-system/visual-token-adapter.json",
    typography_source: "/design-system/visual-token-adapter.json",
    icon_source: "JudgmentKit icon catalog via get_icon_svg",
    renderer_component_source:
      "implementation_contract.default_ai_native_design_system.component_contracts",
    import_boundary:
      "No visual, typography, icon, or component package imports outside the active design-system source.",
    token_prefix_source: "implementation_contract.design_system_source.token_prefixes",
    source_exports: "implementation_contract.design_system_source.source_exports",
  };
}

function assertReviewEvidenceFieldsVisible(text, label) {
  assert.ok(
    text.includes("Review evidence fields"),
    `${label} should show review evidence fields`,
  );

  for (const evidenceField of [
    "visual_token_evidence",
    "design_system_provenance",
    "local_component_authority_evidence",
  ]) {
    assert.ok(
      text.includes(evidenceField),
      `${label} should show ${evidenceField}`,
    );
  }
}

{
  const result = await handleToolCall("analyze_implementation_brief", {
    brief:
      "A support operations manager is auditing an integration setup workflow. The activity is deciding whether a JSON schema change, data model update, prompt template change, and API endpoint change are safe to ship, then producing a handoff with the next action for the platform team.",
  });

  assert.equal("error" in result, false);
  assert.equal(result.contract_id, "judgmentkit.ai-ui-generation.activity-contract");
  assert.equal(result.status, "needs_review");
  assert.ok(
    result.implementation_terms_detected.some((entry) => entry.term === "JSON schema"),
  );
  assert.ok(
    result.implementation_terms_detected.some((entry) => entry.term === "data model"),
  );
  assert.ok(result.activity_model.observed_participants.includes("support operations manager"));
  assert.ok(result.activity_model.observed_domain_terms.includes("integration setup workflow"));
  assert.ok(result.ui_brief.terms_to_use.includes("platform team"));
  assert.equal(result.ui_brief.activity_focus.includes("JSON schema"), false);
  assert.ok(
    result.disclosure_policy.diagnostic_terms_detected.some(
      (entry) => entry.detected_term === "prompt template",
    ),
  );
}

{
  const result = await handleToolCall("create_activity_model_review", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
  });

  assert.equal("error" in result, false);
  assert.equal(result.contract_id, "judgmentkit.ai-ui-generation.activity-contract");
  assert.equal(result.review_status, "ready_for_review");
  assert.equal(result.collaboration_mode, "propose_then_review");
  assert.equal(result.source.mode, "deterministic");
  assert.ok(result.candidate.activity_model.activity.includes("refund requests"));
  assert.ok(result.candidate.activity_model.participants.includes("support lead"));
  assert.ok(result.candidate.interaction_contract.primary_decision.includes("case should be approved"));
}

{
  const result = await handleToolCall("create_activity_model_review", {
    brief:
      "A support operations manager is auditing an integration setup workflow. The activity is deciding whether a JSON schema change and prompt template update are safe to ship, then producing a handoff with the next action for the platform team.",
  });

  assert.equal("error" in result, false);
  assert.equal(result.review_status, "ready_for_review");
  assert.equal(result.guardrails.analyzer_status, "needs_review");
  assert.equal(
    JSON.stringify(result.candidate.activity_model).includes("JSON schema"),
    false,
  );
  assert.ok(
    result.candidate.disclosure_policy.hidden_implementation_terms.some(
      (entry) => entry.detected_term === "JSON schema",
    ),
  );
}

{
  const result = await handleToolCall("recommend_surface_types", {
    brief:
      "A product analyst is reviewing product analytics cohorts during weekly planning. The activity is comparing funnel evidence, deciding which experiment to prioritize, and handing the next action to the growth team. The outcome is a chosen experiment and handoff reason.",
  });

  assert.equal("error" in result, false);
  assert.equal(result.recommended_surface_type, "workbench");
  assert.equal(result.frontend_posture.density, "operational");
  assert.ok(result.interaction_implications.primary_structure.includes("Item selection"));
}

{
  const result = await handleToolCall("recommend_surface_types", {
    brief: "Build the provided surface.",
    activityReview: readyActivityReview(refundTriageCandidate),
  });

  assert.equal("error" in result, false);
  assert.equal(result.recommended_surface_type, "workbench");
  assert.equal("activityReview" in result, false);
  assert.equal("blockedSurfaceTypes" in result, false);
  assert.ok(Array.isArray(result.blocked_surface_types));
}

{
  const result = await handleToolCall("recommend_surface_types", {
    brief: "Build the provided surface.",
    activity_review: readyActivityReview(formFlowCandidate),
    activityReview: readyActivityReview(refundTriageCandidate),
  });

  assert.equal("error" in result, false);
  assert.equal(result.recommended_surface_type, "form_flow");
  assert.equal("activityReview" in result, false);
}

{
  const brief = `# Minimal Brief

Create a standalone HTML prototype for a same-day field-service dispatch workbench. A dispatcher is reviewing repair exceptions and needs to decide whether to reassign a technician, hold for parts, or escalate to customer care. Keep the selected visit, evidence, route impact, handoff owner, decision state, and next-action receipt visible together.

# Experiment Constraint

No design-system token, CSS variable, component rule, icon rule, or visual styling detail was manually added to the brief.

MCP endpoint: http://127.0.0.1:3333/mcp`;

  const result = await handleToolCall("recommend_surface_types", { brief });

  assert.equal("error" in result, false);
  assert.equal(result.recommended_surface_type, "workbench");
  assert.equal(result.frontend_posture.density, "operational");
  assert.ok(result.frontend_posture.navigation_shape.includes("queue-detail"));
  assert.equal(result.blocked_surface_types.includes("workbench"), false);

  const formattedText = formatPlanningCard(result);

  assert.ok(formattedText.includes('surface_type "workbench"'));
  assert.equal(
    /\b(?:use|pass|set|choose)\s+(?:the\s+)?surface_type\s+"form_flow"\b/i.test(
      formattedText,
    ),
    false,
  );
}

{
  const result = await handleToolCall("recommend_ui_workflow_profiles", {
    brief:
      "An operator reviews several AI agent findings, compares evidence and release risk, decides whether each finding is approved, blocked, deferred, tightened, or handed off, and leaves an audit receipt while raw tool call traces stay diagnostic.",
  });

  assert.equal("error" in result, false);
  assert.deepEqual(result.recommended_profile_ids, ["operator-review-ui"]);
  assert.deepEqual(result.blocked_profile_ids, []);
  assert.equal(result.recommendations[0].status, "recommended");
}

{
  const result = await handleToolCall("review_activity_model_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: refundTriageCandidate,
  });

  assert.equal("error" in result, false);
  assert.equal(result.review_status, "ready_for_review");
  assert.equal(result.source.mode, "model_assisted");
  assert.equal(result.source.proposer, "external_candidate");
  assert.ok(result.candidate.activity_model.activity.includes("refund requests"));
  assert.ok(result.candidate.interaction_contract.primary_decision.includes("case should be approved"));
  assert.deepEqual(result.guardrails.candidate_primary_terms_detected, []);
}

{
  const result = await handleToolCall("review_activity_model_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {
      ...refundTriageCandidate,
      activity_model: {
        ...refundTriageCandidate.activity_model,
        activity: "Support lead reviews the JSON schema.",
      },
    },
  });

  assert.equal("error" in result, false);
  assert.equal(result.review_status, "needs_source_context");
  assert.ok(
    result.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
  assert.equal(JSON.stringify(result.candidate.activity_model).includes("JSON schema"), false);
}

{
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: refundWorkflowCandidate,
    profile_id: "operator-review-ui",
    surface_type: "workbench",
  });

  assert.equal("error" in result, false);
  assert.equal(result.review_status, "ready_for_review");
  assert.equal(result.source.mode, "model_assisted");
  assert.equal(result.source.proposer, "external_candidate");
  assert.equal(result.guidance_profile.profile_id, "operator-review-ui");
  assert.equal(result.surface_type, "workbench");
  assert.ok(result.candidate.workflow.surface_name.includes("Refund escalation"));
  assert.ok(result.candidate.workflow.primary_actions.includes("Approve refund"));
  assert.deepEqual(result.guardrails.candidate_primary_terms_detected, []);
  assert.deepEqual(result.guardrails.candidate_primary_meta_terms_detected, []);

  const cognitiveReview = await handleToolCall("review_cognitive_dimensions_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: result,
    surface_type: "workbench",
  });

  assert.equal("error" in cognitiveReview, false);
  assert.equal(cognitiveReview.cognitive_dimensions_review_status, "ready_for_review");
  assert.equal(cognitiveReview.next_agent_action, "continue_to_handoff_or_implementation");
  assert.ok(
    cognitiveReview.checks.some(
      (check) => check.id === "visibility_juxtaposability" && check.status === "pass",
    ),
  );

  const implementationContract = await handleToolCall("create_ui_implementation_contract", {
    target_stack: "React",
    approved_primitives: ["queue", "detail panel", "decision controls", "handoff receipt"],
    static_rules: ["npm test"],
    browser_qa_checks: ["desktop review", "mobile review"],
  });

  assert.equal("error" in implementationContract, false);
  assert.equal(implementationContract.implementation_contract_status, "ready");
  assert.equal(
    implementationContract.implementation_contract.accessibility_policy.contrast_targets.normal_text_min_ratio,
    4.5,
  );
  assert.ok(
    Boolean(
      implementationContract.implementation_contract.accessibility_policy
        .conditional_evidence.visual_background_contrast,
    ),
  );
  assert.equal(
    implementationContract.implementation_contract.default_ai_native_design_system.mode,
    "contract_defaults",
  );
  assert.ok(
    implementationContract.implementation_contract.default_ai_native_design_system
      .component_contracts.some((entry) => entry.id === "action_button"),
  );
  assert.ok(
    implementationContract.implementation_contract.default_ai_native_design_system
      .pattern_contracts.some((entry) => entry.id === "workbench"),
  );
  assert.equal(
    implementationContract.implementation_contract.iteration_policy.default_max_attempts,
    3,
  );
  assert.equal(
    implementationContract.implementation_contract.visual_token_adapter.mode,
    "boundary_only",
  );
  assert.equal(
    implementationContract.implementation_contract.design_system_source.mode,
    "judgmentkit_default",
  );
  assert.equal(
    implementationContract.implementation_contract.design_system_source.fallback_policy,
    "fail_incomplete",
  );
  assert.ok(
    implementationContract.implementation_contract.visual_token_adapter.token_families.includes(
      "color",
    ),
  );
  assert.ok(
    implementationContract.implementation_contract.visual_token_adapter.font_roles.some(
      (entry) => entry.role === "body" && entry.stack.includes("system-ui"),
    ),
  );
  assert.ok(
    implementationContract.implementation_contract.visual_token_adapter.css_custom_properties.some(
      (entry) => entry.name === "--jk-color-surface" && entry.value === "#ffffff",
    ),
  );
  assert.ok(
    implementationContract.implementation_contract.visual_token_adapter.icon_catalog
      .icon_count > 1000,
  );
  assert.ok(
    implementationContract.implementation_contract.visual_token_adapter.icon_catalog
      .mcp_tools.includes("get_icon_svg"),
  );
  assert.equal(
    "icon_registry" in implementationContract.implementation_contract.visual_token_adapter,
    false,
  );
  assertReviewEvidenceFieldsVisible(
    formatPlanningCard(implementationContract),
    "implementation contract card",
  );

  const visualCompositionContract = await handleToolCall(
    "create_ui_implementation_contract",
    {
      visual_composition_policy:
        implementationContract.implementation_contract
          .visual_composition_policy,
    },
  );
  assert.equal("error" in visualCompositionContract, false);
  assert.equal(
    visualCompositionContract.implementation_contract.visual_composition_policy.id,
    "judgmentkit.visual-composition.adapter-v1",
  );
  assert.equal(
    visualCompositionContract.implementation_contract.visual_composition_policy.enforcement,
    "required_when_applicable",
  );
  const visualCompositionContractCard = formatPlanningCard(visualCompositionContract);
  assert.match(
    visualCompositionContractCard,
    /\*\*Visual composition policy:\*\* judgmentkit\.visual-composition\.adapter-v1/,
  );
  assert.match(
    visualCompositionContractCard,
    /\*\*Visual composition enforcement:\*\* required_when_applicable/,
  );
  assert.match(
    visualCompositionContractCard,
    /\*\*Visual composition evidence:\*\* visual_composition_evidence/,
  );

  const visualCompositionReview = await handleToolCall(
    "review_ui_implementation_candidate",
    {
      implementation_contract: visualCompositionContract,
      candidate: {
        visual_composition_manifest: {
          samples: [
            {
              rule_id: "shared_anchor.inline_start",
              calibration_ref: "judgmentkit.shared_anchor.inline_start",
              document_id: "fixture",
              viewport_id: "desktop",
              sample_id: "fixture-inline-start",
              component_family: "judgmentkit.shared_anchor.inline_start",
              selector: "[data-sample='fixture']",
              member_selector: "[data-part='member']",
            },
          ],
        },
      },
    },
  );
  assert.equal(visualCompositionReview.checks.visual_composition.status, "fail");
  assert.equal(
    visualCompositionReview.checks.visual_composition.reason,
    "missing_visual_composition_evidence",
  );
  const visualCompositionReviewCard = formatPlanningCard(visualCompositionReview);
  assert.match(visualCompositionReviewCard, /\*\*Visual composition:\*\* fail/);

  const missingProvenanceReview = await handleToolCall("review_ui_implementation_candidate", {
    implementation_contract: implementationContract,
    candidate: withNoApplicableVisualComposition({
      primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
      states_covered: implementationContract.implementation_contract.state_coverage.required_states,
      static_checks: ["npm test"],
      browser_qa: { desktop: "passed", mobile: "passed" },
      accessibility_evidence: coreAccessibilityEvidence(),
    }, implementationContract.implementation_contract),
  });

  assert.equal("error" in missingProvenanceReview, false);
  assert.equal(missingProvenanceReview.implementation_review_status, "failed");
  assert.equal(missingProvenanceReview.next_agent_action, "repair_and_resubmit");
  assert.equal(missingProvenanceReview.candidate_artifact_status, "not_an_artifact");
  assert.equal(missingProvenanceReview.design_system_acceptance_status, "failed");
  assert.equal(
    missingProvenanceReview.checks.design_system_provenance.status,
    "fail",
  );
  assert.equal(
    missingProvenanceReview.checks.design_system_provenance.provenance_present,
    false,
  );
  assert.ok(
    missingProvenanceReview.repair_instructions.groups.design_system_source.some(
      (entry) => entry.check === "design_system_provenance",
    ),
  );
  assert.ok(
    formatPlanningCard(missingProvenanceReview).includes("This is not an artifact"),
  );

  const implementationReview = await handleToolCall("review_ui_implementation_candidate", {
    implementation_contract: implementationContract,
    candidate: withNoApplicableVisualComposition({
      primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
      states_covered: implementationContract.implementation_contract.state_coverage.required_states,
      static_checks: ["npm test"],
      browser_qa: { desktop: "passed", mobile: "passed" },
      accessibility_evidence: coreAccessibilityEvidence(),
      design_system_provenance: defaultDesignSystemProvenance(),
    }, implementationContract.implementation_contract),
  });

  assert.equal("error" in implementationReview, false);
  assert.equal(implementationReview.implementation_review_status, "passed");
  assert.equal(implementationReview.candidate_artifact_status, "accepted_artifact");
  assert.equal(implementationReview.design_system_acceptance_status, "passed");
  assert.equal(implementationReview.next_agent_action, "accept");
  assert.equal(implementationReview.autofix_loop.status, "passed");
  assert.equal(implementationReview.checks.visual_tokens.status, "pass");
  assert.equal(implementationReview.checks.design_system_provenance.status, "pass");
  assert.equal(implementationReview.checks.component_contracts.status, "pass");
  assert.equal(implementationReview.checks.component_contracts.reviewed, false);
  assert.equal(implementationReview.checks.pattern_contracts.status, "pass");
  assert.equal(implementationReview.checks.pattern_contracts.reviewed, false);

  const selectedSurfaceImplementationReview = await handleToolCall("review_ui_implementation_candidate", {
    implementation_contract: implementationContract,
    surface_type: "operator_review",
    candidate: withNoApplicableVisualComposition({
      primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
      states_covered: implementationContract.implementation_contract.state_coverage.required_states,
      static_checks: ["npm test"],
      browser_qa: { desktop: "passed", mobile: "passed" },
      accessibility_evidence: coreAccessibilityEvidence(),
      design_system_provenance: defaultDesignSystemProvenance(),
      pattern_contract_evidence: {
        pattern_id: "workbench",
        regions_present: [
          "work queue",
          "detail workspace",
          "evidence",
          "decision or handoff",
        ],
        controls_present: [
          "selection",
          "filter or sort",
          "decision action",
          "handoff action",
        ],
      },
    }, implementationContract.implementation_contract),
  });

  assert.equal("error" in selectedSurfaceImplementationReview, false);
  assert.equal(selectedSurfaceImplementationReview.implementation_review_status, "failed");
  assert.equal(selectedSurfaceImplementationReview.checks.pattern_contracts.status, "fail");
  assert.equal(
    selectedSurfaceImplementationReview.checks.pattern_contracts.selected_surface_type,
    "operator_review",
  );
  assert.equal(
    selectedSurfaceImplementationReview.checks.pattern_contracts.required_surface_type,
    "workbench",
  );

  const repairReview = await handleToolCall("review_ui_implementation_candidate", {
    implementation_contract: implementationContract,
    iteration_context: { current_attempt: 2 },
    candidate: withNoApplicableVisualComposition({
      primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
      states_covered:
        implementationContract.implementation_contract.state_coverage.required_states,
      static_checks: ["npm test"],
      browser_qa: { desktop: "passed", mobile: "passed" },
      accessibility_evidence: coreAccessibilityEvidence(),
      design_system_provenance: defaultDesignSystemProvenance(),
      actions: ["Auto approve refund"],
      action_boundary_evidence: {},
    }, implementationContract.implementation_contract),
  });

  assert.equal("error" in repairReview, false);
  assert.equal(repairReview.implementation_review_status, "failed");
  assert.equal(repairReview.next_agent_action, "repair_and_resubmit");
  assert.equal(repairReview.autofix_loop.current_attempt, 2);
  assert.ok(repairReview.repair_instructions.groups.action_boundaries.length > 0);

  const stoppedReview = await handleToolCall("review_ui_implementation_candidate", {
    implementation_contract: implementationContract,
    iteration_context: { current_attempt: 3 },
    candidate: withNoApplicableVisualComposition({
      primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
      states_covered:
        implementationContract.implementation_contract.state_coverage.required_states,
      static_checks: ["npm test"],
      browser_qa: { desktop: "passed", mobile: "passed" },
      accessibility_evidence: coreAccessibilityEvidence(),
      design_system_provenance: defaultDesignSystemProvenance(),
      visible_text: ["JSON schema", "resource id"],
    }, implementationContract.implementation_contract),
  });

  assert.equal("error" in stoppedReview, false);
  assert.equal(stoppedReview.implementation_review_status, "failed");
  assert.equal(stoppedReview.next_agent_action, "stop_for_human");
  assert.equal(stoppedReview.autofix_loop.status, "stopped");
  assert.ok(stoppedReview.repair_instructions.groups.data_visibility.length > 0);

  const handoffResult = await handleToolCall("create_ui_generation_handoff", {
    workflow_review: result,
    implementation_contract: implementationContract,
  });

  assert.equal("error" in handoffResult, false);
  assert.equal(handoffResult.handoff_status, "ready_for_generation");
  assert.equal(handoffResult.guidance_profile.profile_id, "operator-review-ui");
  assert.equal(handoffResult.surface_type, "workbench");
  assert.ok(handoffResult.workflow.primary_actions.includes("Approve refund"));
  assert.equal("primary_surface" in handoffResult, false);
  assert.ok(handoffResult.surface_set[0].sections.includes("Evidence checklist"));

  const frontendContext = await handleToolCall("create_frontend_generation_context", {
    ui_generation_handoff: handoffResult,
    frontend_context: {
      target_runtime: "React",
      ui_library: "Material UI",
      approved_component_families: ["queue", "detail panel", "decision controls"],
      visual_requirements: ["substantive product image"],
      approved_visual_asset_sources: ["imagegen", "D3"],
    },
    verification: {
      commands: ["npm test"],
      states_to_verify: ["selected item", "handoff sent"],
    },
  });

  assert.equal("error" in frontendContext, false);
  assert.equal(frontendContext.frontend_context_status, "ready_for_frontend_implementation");
  assert.equal(frontendContext.surface_type, "workbench");
  assert.equal(
    frontendContext.selected_surface_profile.id,
    "judgmentkit.workbench.operational-v1",
  );
  assert.equal(frontendContext.selected_surface_profile.status, "supported");
  assert.ok(frontendContext.implementation_guidance.required_sections.includes("Evidence checklist"));
  assert.ok(frontendContext.implementation_guidance.verification_expectations.commands.includes("npm test"));
  assert.ok(frontendContext.frontend_context.visual_requirements.includes("substantive product image"));
  assert.ok(frontendContext.frontend_context.approved_visual_asset_sources.includes("D3"));
  assert.ok(
    frontendContext.implementation_guidance.visual_asset_policy.preferred_paths.some(
      (rule) => rule.includes("imagegen"),
    ),
  );
  assert.ok(
    Boolean(
      frontendContext.implementation_guidance.accessibility_policy.conditional_evidence
        .visual_background_contrast,
    ),
  );
  assertReviewEvidenceFieldsVisible(
    formatPlanningCard(frontendContext),
    "frontend context card",
  );

  const skillContext = await handleToolCall("create_frontend_implementation_skill_context", {
    frontend_generation_context: frontendContext,
    target_client: "codex",
    design_system_adapter: {
      design_system_name: "Material UI",
      design_system_package: "@mui/material",
      role: "visual renderer after context selection",
      components: ["Stack", "Button"],
      token_guidance: {
        token_families: ["color", "type"],
        css_custom_properties: [
          {
            name: "--mui-palette-background-paper",
            role: "surface",
            family: "color",
            value: "theme.palette.background.paper",
            usage: "Material UI Paper surfaces",
          },
          {
            name: "--mui-font-family",
            role: "text",
            family: "type",
            value: "theme.typography.fontFamily",
            usage: "Material UI Typography",
          },
        ],
      },
      font_guidance: {
        font_roles: {
          body: "var(--mui-font-family)",
          numeric: {
            stack: "var(--mui-font-family)",
            usage: "numeric values in review queues",
          },
        },
      },
      icon_guidance: {
        icon_roles: ["status", "action"],
        icon_catalog: {
          source: "external_design_system",
          library: "mui-icons-material",
          package: "@mui/icons-material",
          version: "repo-approved",
          icon_count: 2000,
          license: "MIT",
          notice: "Repo-approved Material UI icon adapter.",
          mcp_tools: [],
        },
      },
      constraint:
        "Material UI changes the renderer layer only; it does not supply activity fit.",
      pattern_contracts: [
        {
          id: "workbench",
          surface_type: "workbench",
          purpose: "Material UI workbench shell for review tasks.",
        },
      ],
    },
  });

  assert.equal("error" in skillContext, false);
  assert.equal(skillContext.skill_context_status, "ready");
  assert.equal(skillContext.source_skill.name, "frontend-ui-implementation");
  assert.equal(skillContext.source_skill.raw_skill_exposed, false);
  assert.equal(skillContext.design_system_policy.mode, "external_design_system");
  assert.ok(skillContext.design_system_policy.renderer_components.includes("Button"));
  assert.deepEqual(skillContext.token_guidance.token_families, ["color", "type"]);
  assert.ok(
    skillContext.token_guidance.css_custom_properties.some(
      (entry) =>
        entry.name === "--mui-palette-background-paper" &&
        entry.value === "theme.palette.background.paper",
    ),
  );
  assert.equal(
    skillContext.token_guidance.css_custom_properties.some(
      (entry) => entry.name === "--jk-color-surface",
    ),
    false,
  );
  assert.ok(skillContext.component_contracts.some((entry) => entry.id === "Button"));
  assert.ok(skillContext.pattern_contracts.some((entry) => entry.id === "workbench"));
  assert.ok(
    skillContext.evidence_field_mapping &&
      typeof skillContext.evidence_field_mapping === "object",
  );
  const evidenceFieldMappingText = JSON.stringify(
    skillContext.evidence_field_mapping,
  );
  for (const routedField of [
    "primitives_used",
    "implementation_contract.approved_primitives",
    "component_contract_evidence.components[].id",
    "component_contract_evidence.components[].states_covered",
    "pattern_contract_evidence.pattern_id",
    "visual_token_evidence",
    "implementation_contract.visual_token_adapter",
    "design_system_provenance",
    "implementation_contract.design_system_source",
    "local_component_authority_evidence",
    "implementation_contract.local_component_authority",
  ]) {
    assert.ok(
      evidenceFieldMappingText.includes(routedField),
      `frontend skill evidence_field_mapping should route ${routedField}`,
    );
  }
  assert.equal(
    skillContext.evidence_field_mapping.component_contract_evidence.source_path,
    "frontend_skill_context.design_system_adapter_compat.components",
  );
  assert.equal(
    skillContext.evidence_field_mapping.pattern_contract_evidence.source_path,
    "frontend_skill_context.design_system_adapter_compat.pattern_contracts",
  );
  assert.ok(
    skillContext.instruction_markdown.includes("Component contracts"),
  );
  assert.ok(
    skillContext.instruction_markdown.includes("Pattern contracts"),
  );
  assert.ok(
    skillContext.instruction_markdown.includes(
      "component_contract_evidence.components[].id",
    ),
  );
  assert.ok(
    skillContext.implementation_sequence.some((instruction) =>
      instruction.includes("component_contract_evidence.components[].id"),
    ),
  );
  assert.ok(
    skillContext.font_guidance.font_roles.some(
      (entry) => entry.role === "body" && entry.stack === "var(--mui-font-family)",
    ),
  );
  assert.equal(skillContext.icon_guidance.icon_catalog.library, "mui-icons-material");
  assertReviewEvidenceFieldsVisible(
    formatPlanningCard(skillContext),
    "frontend skill context card",
  );
  assert.ok(skillContext.instruction_markdown.includes("Font roles"));
  assert.ok(skillContext.instruction_markdown.includes("--mui-palette-background-paper"));
  assert.ok(skillContext.instruction_markdown.includes("Icon catalog"));
  assert.ok(skillContext.visual_requirements.includes("substantive product image"));
  assert.ok(
    skillContext.visual_asset_policy.preferred_paths.some((rule) =>
      rule.includes("D3"),
    ),
  );
  assert.ok(
    skillContext.accessibility_policy.evidence_model.conditional_required.includes(
      "reduced_motion",
    ),
  );
  assert.ok(skillContext.instruction_markdown.includes("Visual Asset Policy"));
  assert.ok(skillContext.instruction_markdown.includes("Accessibility Policy"));
  assert.ok(skillContext.instruction_markdown.includes("browser-rendered contrast"));
  assert.ok(skillContext.instruction_markdown.includes("Frontend Implementation Skill Context"));
  assert.equal(skillContext.next_recommended_tool, "review_ui_implementation_candidate");

  const conflictingPatternSkillContext = await handleToolCall(
    "create_frontend_implementation_skill_context",
    {
      frontend_generation_context: frontendContext,
      target_client: "codex",
      design_system_adapter: {
        design_system_name: "Material UI",
        design_system_package: "@mui/material",
        components: ["Stack"],
        token_guidance: {
          token_families: ["color"],
        },
        font_guidance: {
          font_roles: {
            body: "var(--mui-font-family)",
          },
        },
        icon_guidance: {
          icon_roles: ["status"],
          icon_catalog: {
            library: "mui-icons-material",
            package: "@mui/icons-material",
          },
        },
        pattern_contracts: [
          {
            id: "workbench",
            surface_type: "operator_review",
            purpose: "Conflicting external workbench contract.",
          },
        ],
      },
    },
  );

  assert.equal("error" in conflictingPatternSkillContext, true);
  assert.equal(conflictingPatternSkillContext.error.code, "invalid_input");
  assert.match(
    conflictingPatternSkillContext.error.message,
    /pattern contracts cannot redefine known pattern ids/i,
  );

  const conflictingCamelCasePatternSkillContext = await handleToolCall(
    "create_frontend_implementation_skill_context",
    {
      frontend_generation_context: frontendContext,
      target_client: "codex",
      design_system_adapter: {
        design_system_name: "Material UI",
        design_system_package: "@mui/material",
        components: ["Stack"],
        token_guidance: {
          token_families: ["color"],
        },
        font_guidance: {
          font_roles: {
            body: "var(--mui-font-family)",
          },
        },
        icon_guidance: {
          icon_roles: ["status"],
          icon_catalog: {
            library: "mui-icons-material",
            package: "@mui/icons-material",
          },
        },
        pattern_contracts: [
          {
            id: "workbench",
            surfaceType: "operator_review",
            purpose: "Conflicting external workbench contract.",
          },
        ],
      },
    },
  );

  assert.equal("error" in conflictingCamelCasePatternSkillContext, true);
  assert.equal(conflictingCamelCasePatternSkillContext.error.code, "invalid_input");
  assert.match(
    conflictingCamelCasePatternSkillContext.error.message,
    /pattern contracts cannot redefine known pattern ids/i,
  );
}

{
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {
      ...refundWorkflowCandidate,
      workflow: {
        ...refundWorkflowCandidate.workflow,
        surface_name: "ready_for_review JSON schema console",
      },
      surface_set: [
        {
          ...refundWorkflowCandidate.surface_set[0],
          sections: ["Activity", "Prompt template"],
        },
      ],
    },
  });

  assert.equal("error" in result, false);
  assert.equal(result.review_status, "needs_source_context");
  assert.ok(
    result.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
  assert.ok(
    result.guardrails.candidate_primary_meta_terms_detected.some(
      (entry) => entry.term === "ready_for_review",
    ),
  );
  assert.equal(JSON.stringify(result.candidate.workflow).includes("JSON schema"), false);
  assert.equal(JSON.stringify(result.candidate.surface_set).includes("Prompt template"), false);

  const handoffResult = await handleToolCall("create_ui_generation_handoff", {
    workflow_review: result,
    implementation_contract: createUiImplementationContractFixture(),
  });

  assert.equal("error" in handoffResult, true);
  assert.equal(handoffResult.error.code, "handoff_blocked");
  assert.equal(handoffResult.error.details.review_status, "needs_source_context");
  assert.ok(
    handoffResult.error.details.implementation_leakage_terms.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
}

{
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: refundWorkflowCandidate,
    profile_id: "missing-profile",
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
  assert.ok(result.error.message.includes("Unknown UI workflow guidance profile"));
}

{
  const result = await handleToolCall("analyze_implementation_brief", {
    brief: "  ",
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
}

{
  const result = await handleToolCall("create_activity_model_review", {
    brief: "  ",
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
}

{
  const result = await handleToolCall("review_activity_model_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {},
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
}

{
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {},
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
}

{
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {
      ...refundWorkflowCandidate,
      workflow: {
        ...refundWorkflowCandidate.workflow,
        steps: ["Review evidence", "Choose path"],
      },
    },
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
  assert.ok(result.error.message.includes("workflow.steps"));
}

{
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {
      ...refundWorkflowCandidate,
      primary_ui: {
        sections: ["Evidence checklist"],
        controls: ["Approve refund"],
      },
    },
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
  assert.ok(result.error.message.includes("primary_ui"));
}

{
  const result = await handleToolCall("create_ui_generation_handoff", {
    workflow_review: {},
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
}

{
  const result = await handleToolCall("get_workflow_bundle", {
    workflow_id: "workflow.ai-ui-generation",
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_request");
}

console.log("MCP library checks passed.");
