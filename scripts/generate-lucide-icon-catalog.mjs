import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const lucideRoot = path.resolve(repoRoot, "node_modules/lucide-static");
const outputPath = path.resolve(repoRoot, "src/lucide-icon-catalog.generated.mjs");
const checkMode = process.argv.includes("--check");

const iconNodesPath = path.resolve(lucideRoot, "icon-nodes.json");
const tagsPath = path.resolve(lucideRoot, "tags.json");
const packagePath = path.resolve(lucideRoot, "package.json");
const licensePath = path.resolve(lucideRoot, "LICENSE");
const iconsDir = path.resolve(lucideRoot, "icons");

const defaultSvgAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toTitle(id) {
  return id
    .split("-")
    .map((part) => (part.length === 1 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function tokenize(value) {
  return String(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function attrNameToSvg(name) {
  return String(name).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function escapeXmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeNode(node) {
  const [tag, attrs = {}] = node;
  return {
    tag,
    attrs: Object.fromEntries(
      Object.entries(attrs).map(([key, value]) => [attrNameToSvg(key), String(value)]),
    ),
  };
}

function sortedAttrs(attrs) {
  return Object.fromEntries(Object.entries(attrs).sort(([left], [right]) => left.localeCompare(right)));
}

function nodeSignature(elements) {
  return JSON.stringify(
    elements.map((element) => [
      element.tag,
      sortedAttrs(element.attrs),
    ]),
  );
}

function parseSvgElements(svg) {
  const svgBody = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i)?.[1] ?? "";
  const elements = [];
  const elementPattern = /<([a-z][a-z0-9:-]*)\b([^<>]*?)\/>/gi;
  for (const match of svgBody.matchAll(elementPattern)) {
    const attrs = {};
    const attrPattern = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)="([^"]*)"/g;
    for (const attrMatch of match[2].matchAll(attrPattern)) {
      attrs[attrNameToSvg(attrMatch[1])] = attrMatch[2];
    }
    elements.push({ tag: match[1], attrs });
  }
  return elements;
}

function collectSvgAliases(iconNodes) {
  if (!fs.existsSync(iconsDir)) {
    return new Map();
  }

  const aliasesById = new Map(Object.keys(iconNodes).map((id) => [id, []]));
  const canonicalBySignature = new Map();

  for (const [id, nodes] of Object.entries(iconNodes)) {
    const signature = nodeSignature(nodes.map(normalizeNode));
    const existing = canonicalBySignature.get(signature) ?? [];
    existing.push(id);
    canonicalBySignature.set(signature, existing);
  }

  for (const fileName of fs.readdirSync(iconsDir).filter((name) => name.endsWith(".svg"))) {
    const aliasId = fileName.slice(0, -4);
    if (iconNodes[aliasId]) {
      continue;
    }

    const svg = fs.readFileSync(path.resolve(iconsDir, fileName), "utf8");
    const canonicalIds = canonicalBySignature.get(nodeSignature(parseSvgElements(svg))) ?? [];
    if (canonicalIds.length === 1) {
      aliasesById.get(canonicalIds[0])?.push(aliasId);
    }
  }

  return aliasesById;
}

function parseFeatherDerivedIds(licenseText) {
  const match = licenseText.match(
    /The following Lucide icons are derived from the Feather project:\s*([\s\S]*?)\s*The MIT License/i,
  );

  if (!match) {
    return new Set();
  }

  return new Set(
    match[1]
      .replaceAll("\n", " ")
      .split(",")
      .map((iconId) => iconId.trim())
      .filter(Boolean),
  );
}

function buildSvg(elements) {
  const svgAttrs = Object.entries(defaultSvgAttributes)
    .map(([key, value]) => `${key}="${escapeXmlAttribute(value)}"`)
    .join(" ");
  const body = elements
    .map((element) => {
      const attrs = Object.entries(element.attrs)
        .map(([key, value]) => `${key}="${escapeXmlAttribute(value)}"`)
        .join(" ");
      return `  <${element.tag}${attrs ? ` ${attrs}` : ""} />`;
    })
    .join("\n");

  return `<svg ${svgAttrs}>\n${body}\n</svg>`;
}

function buildCatalog() {
  const pkg = readJson(packagePath);
  const iconNodes = readJson(iconNodesPath);
  const tags = readJson(tagsPath);
  const licenseText = fs.readFileSync(licensePath, "utf8");
  const featherDerivedIds = parseFeatherDerivedIds(licenseText);
  const svgAliases = collectSvgAliases(iconNodes);
  const canonicalIds = Object.keys(iconNodes).sort((left, right) => left.localeCompare(right));
  const source = {
    library: "lucide",
    package: "lucide-static",
    version: pkg.version,
    homepage: pkg.homepage,
    repository: typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url,
    license: "ISC",
    notice:
      "Some Lucide icons are derived from Feather Icons and retain the Feather MIT notice; see THIRD_PARTY_NOTICES.md.",
    source_files: ["node_modules/lucide-static/icon-nodes.json", "node_modules/lucide-static/tags.json"],
    icon_count: canonicalIds.length,
    feather_mit_derived_count: [...featherDerivedIds].filter((id) => iconNodes[id]).length,
  };

  return {
    source,
    catalog: canonicalIds.map((id) => {
      const elements = iconNodes[id].map(normalizeNode);
      const aliases = unique([...(svgAliases.get(id) ?? [])]).sort((left, right) => left.localeCompare(right));
      const iconTags = Array.isArray(tags[id]) ? tags[id].map(String) : [];
      const searchTerms = unique([
        ...tokenize(id),
        ...aliases.flatMap(tokenize),
        ...iconTags,
        ...iconTags.flatMap(tokenize),
      ]).sort((left, right) => left.localeCompare(right));
      const featherMitDerived = featherDerivedIds.has(id);

      return {
        id,
        name: toTitle(id),
        aliases,
        categories: [],
        tags: iconTags,
        search_terms: searchTerms,
        viewBox: defaultSvgAttributes.viewBox,
        svg_attributes: defaultSvgAttributes,
        elements,
        paths: elements
          .filter((element) => element.tag === "path" && element.attrs.d)
          .map((element) => element.attrs.d),
        svg: buildSvg(elements),
        source: {
          library: "lucide",
          package: "lucide-static",
          version: pkg.version,
          source_icon_name: id,
          license: featherMitDerived ? "ISC AND MIT" : "ISC",
          feather_mit_derived: featherMitDerived,
          homepage: pkg.homepage,
        },
      };
    }),
  };
}

function moduleSource({ source, catalog }) {
  return `// Generated by scripts/generate-lucide-icon-catalog.mjs. Do not edit by hand.\n\nexport const LUCIDE_ICON_SOURCE = ${JSON.stringify(source, null, 2)};\n\nexport const LUCIDE_ICON_CATALOG = ${JSON.stringify(catalog, null, 2)};\n\nexport const LUCIDE_ICON_IDS = LUCIDE_ICON_CATALOG.map((icon) => icon.id);\n\nexport const LUCIDE_ICON_INDEX = new Map(LUCIDE_ICON_CATALOG.map((icon) => [icon.id, icon]));\n\nexport const LUCIDE_ICON_CATEGORIES = [...new Set(LUCIDE_ICON_CATALOG.flatMap((icon) => icon.categories))].sort();\n`;
}

const generated = moduleSource(buildCatalog());

if (checkMode) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== generated) {
    console.error("Lucide icon catalog is out of date. Run npm run icons:generate.");
    process.exit(1);
  }
  console.log("Lucide icon catalog is up to date.");
} else {
  fs.writeFileSync(outputPath, generated);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}.`);
}
