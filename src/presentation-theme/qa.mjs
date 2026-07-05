import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

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
const PUBLIC_ADAPTER_IMPORT = "judgmentkit/presentation-theme";
const HASH_ALGORITHM = "sha256";
const PPTX_EOCD_SIGNATURE = 0x06054b50;
const PPTX_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const PPTX_LOCAL_FILE_SIGNATURE = 0x04034b50;
const XML_DECODER = new TextDecoder("utf8");
const ALLOWED_DIAGNOSTIC_CONTEXTS = new Set([
  "setup",
  "debugging",
  "auditing",
  "integration",
  "source_inspection",
]);
const ALLOWED_NO_TEXT_PROOF_METHODS = new Set([
  "structural_inspection_plus_ocr_negative",
  "artifact_bound_ocr_negative",
]);
const ALLOWED_OCR_AUTHORITY_METHODS = new Set([
  "artifact_bound_ocr",
  "artifact_bound_ocr_extracted_text",
  "ocr_extracted_text",
]);
const ALLOWED_OCR_TEXT_ENTRY_KINDS = new Set(["ocr_text"]);
const TRUSTED_SOURCE_LINT_STATUSES = new Set(["passed", "failed"]);
const MIN_OCR_CONFIDENCE = 0.8;
const SLIDE_DISCLOSURE_PATTERNS = [
  { id: "ready_for_review", term: "ready_for_review", pattern: /\bready(?:[_ -]+)for(?:[_ -]+)review\b/i },
  { id: "activity_model", term: "activity_model", pattern: /\bactivity(?:[_ -]+)model\b/i },
  { id: "primary_user", term: "Primary user", pattern: /\bPrimary(?:[_ -]+)user\b/i },
  { id: "main_decision", term: "Main decision", pattern: /\bMain(?:[_ -]+)decision\b/i },
  { id: "json_schema", term: "JSON schema", pattern: /\bJSON\s+schema\b/i },
  { id: "mcp_server", term: "MCP server", pattern: /\bMCP\s+servers?\b/i },
  { id: "prompt_template", term: "prompt template", pattern: /\bprompt\s+templates?\b/i },
  { id: "resource_id", term: "resource id", pattern: /\bresource\s+ids?\b/i },
  { id: "review_status", term: "review_status", pattern: /\breview(?:[_ -]+)status\b/i },
  { id: "model_configuration", term: "model configuration", pattern: /\bmodel(?:[_ -]+)configurations?\b/i },
  { id: "data_model", term: "data model", pattern: /\bdata(?:[_ -]+)models?\b/i },
  { id: "database_table", term: "database table", pattern: /\bdatabase(?:[_ -]+)tables?\b/i },
  { id: "api_endpoint", term: "API endpoint", pattern: /\bAPI(?:[_ -]+)endpoints?\b/i },
  { id: "crud", term: "CRUD", pattern: /\bCRUD\b/i },
  { id: "system_mechanics", term: "system mechanics", pattern: /\b(?:raw(?:[_ -]+))?system(?:[_ -]+)mechanics?\b/i },
  {
    id: "implementation_trace",
    term: "trace",
    pattern:
      /\b(?:agent|tool|tool(?:[_ -]+)call|prompt(?:[_ -]+)tool(?:[_ -]+)call|debug|execution|export|implementation|schema|system)(?:[_ -]+)traces?\b|\btraces?\s+(?:details?|ids?|identifiers?|logs?|outputs?|payloads?)\b/i,
  },
  { id: "tool_call", term: "tool call", pattern: /\btool(?:[_ -]+)calls?\b/i },
  {
    id: "schema_context",
    term: "schema",
    pattern:
      /\b(?:data|API|database|model|payload|validation|field)(?:[_ -]+)schemas?\b|\bschemas?(?:[_ -]+)(?:field|fields|payload|validation|API|database|model)\b/i,
  },
  {
    id: "field_context",
    term: "field",
    pattern:
      /\b(?:schema|database|API|JSON|object|record)(?:[_ -]+)fields?\b|\bfields?(?:[_ -]+)(?:schema|database|API|JSON|object|record|listing|list)\b/i,
  },
];

function finding(id, severity, message, evidence = {}) {
  return { id, severity, message, evidence };
}

function collectMatches(pattern, source) {
  return [...String(source).matchAll(pattern)].map((match) => match[0].trim());
}

function isIdentifierChar(char) {
  return /[\w$]/.test(char ?? "");
}

function isWordAt(source, index, word) {
  return (
    source.slice(index, index + word.length) === word &&
    !isIdentifierChar(source[index - 1]) &&
    !isIdentifierChar(source[index + word.length])
  );
}

function skipQuoted(source, index) {
  const quote = source[index];
  let current = index + 1;
  let escaped = false;

  while (current < source.length) {
    const char = source[current];

    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === quote) {
      return current + 1;
    }

    current += 1;
  }

  return current;
}

function skipLineComment(source, index) {
  let current = index + 2;

  while (current < source.length && source[current] !== "\n") {
    current += 1;
  }

  return current;
}

function skipBlockComment(source, index) {
  let current = index + 2;

  while (
    current < source.length &&
    !(source[current] === "*" && source[current + 1] === "/")
  ) {
    current += 1;
  }

  return Math.min(source.length, current + 2);
}

function skipWhitespaceAndComments(source, index) {
  let current = index;

  while (current < source.length) {
    const char = source[current];
    const next = source[current + 1];

    if (/\s/.test(char)) {
      current += 1;
    } else if (char === "/" && next === "/") {
      current = skipLineComment(source, current);
    } else if (char === "/" && next === "*") {
      current = skipBlockComment(source, current);
    } else {
      break;
    }
  }

  return current;
}

function readStringLiteral(source, index) {
  const quote = source[index];

  if (quote !== "\"" && quote !== "'") {
    return null;
  }

  let value = "";
  let current = index + 1;
  let escaped = false;

  while (current < source.length) {
    const char = source[current];

    if (escaped) {
      value += char;
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === quote) {
      return { value, end: current + 1 };
    } else {
      value += char;
    }

    current += 1;
  }

  return null;
}

function scanStaticImportSpecifier(source, index) {
  let current = skipWhitespaceAndComments(source, index);
  const bareSpecifier = readStringLiteral(source, current);

  if (bareSpecifier) {
    return bareSpecifier;
  }

  while (current < source.length) {
    const char = source[current];
    const next = source[current + 1];

    if (char === "\"" || char === "'" || char === "`") {
      current = skipQuoted(source, current);
      continue;
    }

    if (char === "/" && next === "/") {
      current = skipLineComment(source, current);
      continue;
    }

    if (char === "/" && next === "*") {
      current = skipBlockComment(source, current);
      continue;
    }

    if (char === ";") {
      return null;
    }

    if (isWordAt(source, current, "from")) {
      return readStringLiteral(source, skipWhitespaceAndComments(source, current + 4));
    }

    current += 1;
  }

  return null;
}

function scanDynamicImportSpecifier(source, index) {
  const current = skipWhitespaceAndComments(source, index + 1);
  return readStringLiteral(source, current);
}

function collectImportSpecifiers(source) {
  const sourceText = String(source ?? "");
  const specifiers = [];
  let index = 0;

  while (index < sourceText.length) {
    const char = sourceText[index];
    const next = sourceText[index + 1];

    if (char === "\"" || char === "'" || char === "`") {
      index = skipQuoted(sourceText, index);
      continue;
    }

    if (char === "/" && next === "/") {
      index = skipLineComment(sourceText, index);
      continue;
    }

    if (char === "/" && next === "*") {
      index = skipBlockComment(sourceText, index);
      continue;
    }

    if (isWordAt(sourceText, index, "import")) {
      const afterImport = skipWhitespaceAndComments(sourceText, index + "import".length);
      const result =
        sourceText[afterImport] === "("
          ? scanDynamicImportSpecifier(sourceText, afterImport)
          : scanStaticImportSpecifier(sourceText, afterImport);

      if (result) {
        specifiers.push(result.value);
        index = result.end;
        continue;
      }
    }

    index += 1;
  }

  return specifiers;
}

function hasPublicAdapterImport(source) {
  return collectImportSpecifiers(source).includes(PUBLIC_ADAPTER_IMPORT);
}

function statusFromFindings(findings) {
  return findings.length > 0 ? "failed" : "passed";
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function lintJudgmentKitPresentationSource(source, options = {}) {
  const sourceText = String(source ?? "");
  const findings = [];

  if (options.requireAdapterImport !== false && !hasPublicAdapterImport(sourceText)) {
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

function sha256(value) {
  return crypto.createHash(HASH_ALGORITHM).update(String(value)).digest("hex");
}

function sha256Buffer(value) {
  return crypto.createHash(HASH_ALGORITHM).update(value).digest("hex");
}

function normalizeEvidenceText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function textLengthBucket(value) {
  const length = normalizeEvidenceText(value).length;

  if (length === 0) {
    return "0";
  }

  if (length <= 20) {
    return "1-20";
  }

  if (length <= 80) {
    return "21-80";
  }

  if (length <= 200) {
    return "81-200";
  }

  return "201+";
}

function confidenceBucket(value) {
  if (!Number.isFinite(value)) {
    return "missing";
  }

  if (value >= 0.95) {
    return "0.95-1.00";
  }

  if (value >= MIN_OCR_CONFIDENCE) {
    return "0.80-0.94";
  }

  return "below-0.80";
}

function hashValue(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return value.sha256 ?? value.value;
  }

  return undefined;
}

function normalizeSourceLint(value) {
  const sourceLint = isObject(value) ? value : {};
  const findings = Array.isArray(sourceLint.findings) ? sourceLint.findings : [];
  const status =
    typeof sourceLint.status === "string" ? sourceLint.status : "skipped";

  return {
    ...sourceLint,
    status,
    findings,
  };
}

function sourceLintBinding(sourceLint = {}) {
  const nestedSource = isObject(sourceLint.source) ? sourceLint.source : {};
  const sourceHash =
    sourceLint.source_hash ??
    sourceLint.sourceHash ??
    hashValue(sourceLint.hash) ??
    nestedSource.source_hash ??
    nestedSource.sourceHash ??
    nestedSource.sha256 ??
    hashValue(nestedSource.hash);
  const sourceRef =
    sourceLint.source_ref ??
    sourceLint.sourceRef ??
    sourceLint.ref ??
    nestedSource.source_ref ??
    nestedSource.sourceRef ??
    nestedSource.ref;

  return {
    sourceHash: typeof sourceHash === "string" ? sourceHash : undefined,
    sourceRef,
  };
}

function isPortablePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  return !(
    value.startsWith("/") ||
    value.startsWith("file://") ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.includes("\\") ||
    value.split("/").includes("..")
  );
}

function normalizeArtifactRef(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const sha = source.sha256 ?? hashValue(source.hash);

  return {
    kind: source.kind ?? "pptx",
    path: typeof source.path === "string" ? source.path : undefined,
    sha256: typeof sha === "string" ? sha : undefined,
  };
}

function toPortableRepoPath(value) {
  return String(value).split(path.sep).join("/");
}

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isGitTracked(repoRoot, absolutePath) {
  const relativePath = toPortableRepoPath(path.relative(repoRoot, absolutePath));

  try {
    execFileSync("git", ["ls-files", "--error-unmatch", relativePath], {
      cwd: repoRoot,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function findPptxEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === PPTX_EOCD_SIGNATURE) {
      return offset;
    }
  }

  throw new Error("PPTX_ZIP_EOCD_MISSING");
}

function readPptxZipEntries(buffer) {
  const eocdOffset = findPptxEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map();
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== PPTX_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("PPTX_ZIP_CENTRAL_DIRECTORY_INVALID");
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");

    entries.set(name, {
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readPptxZipEntry(buffer, entry) {
  const offset = entry.localHeaderOffset;

  if (buffer.readUInt32LE(offset) !== PPTX_LOCAL_FILE_SIGNATURE) {
    throw new Error(`PPTX_ZIP_LOCAL_HEADER_INVALID:${entry.name}`);
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return compressed;
  }

  if (entry.compressionMethod === 8) {
    return zlib.inflateRawSync(compressed);
  }

  throw new Error(`PPTX_ZIP_UNSUPPORTED_COMPRESSION:${entry.name}`);
}

function readPptxXml(buffer, entries, name) {
  const entry = entries.get(name);
  return entry ? XML_DECODER.decode(readPptxZipEntry(buffer, entry)) : "";
}

function decodeXmlText(value) {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function inspectPptxArtifactBuffer(buffer) {
  const entries = readPptxZipEntries(buffer);
  const names = [...entries.keys()];
  const contentTypesXml = readPptxXml(buffer, entries, "[Content_Types].xml");
  const presentationXml = readPptxXml(buffer, entries, "ppt/presentation.xml");
  const slideEntries = names
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) =>
      Number(left.match(/slide(\d+)\.xml$/)?.[1] ?? 0) -
      Number(right.match(/slide(\d+)\.xml$/)?.[1] ?? 0),
    );
  let textRunCount = 0;

  for (const slideEntry of slideEntries) {
    const slideXml = readPptxXml(buffer, entries, slideEntry);
    for (const match of slideXml.matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g)) {
      if (decodeXmlText(match[1]).trim().length > 0) {
        textRunCount += 1;
      }
    }
  }

  return {
    hasContentTypes: contentTypesXml.includes("presentationml.presentation.main+xml"),
    hasPresentationXml: presentationXml.length > 0,
    slideCount: slideEntries.length,
    textRunCount,
  };
}

function bindArtifactRef(value = {}, options = {}) {
  const artifactRef = normalizeArtifactRef(value);
  const findings = [];

  if (!artifactRef.path) {
    return { artifactRef, findings };
  }

  if (!isPortablePath(artifactRef.path)) {
    findings.push(
      finding(
        "invalid_artifact_path",
        "High",
        "Presentation artifact paths must be repo-relative and must not contain absolute paths, backslashes, or parent traversal.",
      ),
    );
    return { artifactRef, findings };
  }

  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const absolutePath = path.resolve(repoRoot, artifactRef.path);
  let realRepoRoot;
  let realArtifactPath;

  try {
    realRepoRoot = fs.realpathSync(repoRoot);
    realArtifactPath = fs.realpathSync(absolutePath);
  } catch {
    findings.push(
      finding(
        "artifact_file_missing",
        "High",
        "Presentation evidence must reference an existing PPTX artifact under the repository root.",
      ),
    );
    return { artifactRef, findings };
  }

  if (!isPathInside(realRepoRoot, realArtifactPath)) {
    findings.push(
      finding(
        "artifact_path_escapes_repo",
        "High",
        "Presentation evidence artifact paths must resolve under the repository root.",
      ),
    );
    return { artifactRef, findings };
  }

  const artifactBytes = fs.readFileSync(realArtifactPath);
  const computedSha256 = sha256Buffer(artifactBytes);
  let artifactStructure;

  if (artifactRef.kind === "pptx") {
    try {
      artifactStructure = inspectPptxArtifactBuffer(artifactBytes);
    } catch {
      findings.push(
        finding(
          "invalid_pptx_artifact",
          "High",
          "Presentation PPTX evidence must reference a valid PPTX ZIP with presentation XML.",
          { path: artifactRef.path },
        ),
      );
    }

    if (
      artifactStructure &&
      (!artifactStructure.hasContentTypes ||
        !artifactStructure.hasPresentationXml ||
        artifactStructure.slideCount <= 0)
    ) {
      findings.push(
        finding(
          "invalid_pptx_artifact",
          "High",
          "Presentation PPTX evidence must include content types, presentation XML, and at least one slide.",
          {
            path: artifactRef.path,
            slide_count: artifactStructure.slideCount,
          },
        ),
      );
    }
  }

  if (artifactRef.sha256 && artifactRef.sha256 !== computedSha256) {
    findings.push(
      finding(
        "artifact_hash_mismatch",
        "High",
        "Presentation artifact sha256 must match the artifact bytes in the repository.",
        {
          path: artifactRef.path,
          expected_sha256: artifactRef.sha256,
          observed_sha256: computedSha256,
        },
      ),
    );
  }

  artifactRef.sha256 = computedSha256;

  if (options.requireTrackedArtifact && !isGitTracked(realRepoRoot, realArtifactPath)) {
    findings.push(
      finding(
        "artifact_not_git_tracked",
        "High",
        "Release evidence must reference a git-tracked PPTX artifact.",
        { path: artifactRef.path },
      ),
    );
  }

  return {
    artifactRef,
    findings,
    absolutePath: realArtifactPath,
    slideCount: artifactStructure?.slideCount,
    textRunCount: artifactStructure?.textRunCount,
  };
}

function artifactRefsMatch(left, right) {
  return (
    left.kind === right.kind &&
    left.path === right.path &&
    left.sha256 &&
    right.sha256 &&
    left.sha256 === right.sha256
  );
}

function normalizeSlideEntry(entry = {}, objectIndex = 0) {
  const slideIndex =
    Number.isInteger(entry.slide_index)
      ? entry.slide_index
      : Number.isInteger(entry.slideIndex)
        ? entry.slideIndex
        : Number.isInteger(entry.slide_number)
          ? entry.slide_number - 1
          : Number.isInteger(entry.slide)
            ? entry.slide - 1
            : 0;
  const slideNumber =
    Number.isInteger(entry.slide_number)
      ? entry.slide_number
      : Number.isInteger(entry.slideNumber)
        ? entry.slideNumber
        : slideIndex + 1;

  return {
    slide_index: slideIndex,
    slide_number: slideNumber,
    object_index: objectIndex,
    kind: typeof entry.kind === "string" ? entry.kind : "text",
    text: normalizeEvidenceText(entry.text ?? entry.value),
    confidence: Number.isFinite(entry.confidence)
      ? entry.confidence
      : Number.isFinite(entry.ocr_confidence)
        ? entry.ocr_confidence
        : undefined,
  };
}

function buildTextAuthority(input = {}) {
  const source = input.extracted_deck_text ?? input.extractedDeckText ?? input.text_authority;
  const rawSource = source && typeof source === "object" ? source : {};
  const rawEntries = Array.isArray(rawSource.entries) ? rawSource.entries : [];
  const entries = rawEntries.map((entry, index) => normalizeSlideEntry(entry, index));
  const slideCount = Number.isInteger(rawSource.slide_count)
    ? rawSource.slide_count
    : Math.max(0, ...entries.map((entry) => entry.slide_number));
  const bySlide = new Map();

  for (const entry of entries) {
    if (!bySlide.has(entry.slide_number)) {
      bySlide.set(entry.slide_number, []);
    }

    bySlide.get(entry.slide_number).push(entry);
  }

  const normalizedTextHashes = [];
  const textLengthBuckets = [];
  const confidenceBuckets = [];
  const locators = [];

  for (const slideNumber of [...bySlide.keys()].sort((a, b) => a - b)) {
    const slideEntries = bySlide.get(slideNumber);
    const joined = normalizeEvidenceText(slideEntries.map((entry) => entry.text).join(" "));

    if (joined.length > 0) {
      normalizedTextHashes.push(sha256(joined));
      textLengthBuckets.push(textLengthBucket(joined));
    }

    for (const entry of slideEntries) {
      locators.push({
        slide_index: entry.slide_index,
        slide_number: entry.slide_number,
        object_index: entry.object_index,
        kind: entry.kind,
      });
    }
  }

  const artifactRef = normalizeArtifactRef(
    rawSource.artifact_ref ?? rawSource.artifact ?? input.artifact_ref ?? input.artifact,
  );
  const confidences = entries
    .map((entry) => entry.confidence)
    .filter((entry) => Number.isFinite(entry));

  for (const entry of entries) {
    if (entry.text.length > 0) {
      confidenceBuckets.push(confidenceBucket(entry.confidence));
    }
  }

  return {
    raw: rawSource,
    entries,
    public: {
      status: rawSource.status ?? (source ? "missing" : "missing"),
      method: rawSource.method ?? rawSource.extraction?.method ?? "pptx_extract",
      artifact_sha256: artifactRef.sha256,
      extractor_id: rawSource.extractor_id ?? rawSource.extraction?.extractor,
      extractor_version: rawSource.extractor_version ?? rawSource.extraction?.version,
      config_sha256: rawSource.config_sha256,
      slide_count: slideCount,
      authoritative_slide_count: [...bySlide.values()].filter((slideEntries) =>
        slideEntries.some((entry) => entry.text.length > 0),
      ).length,
      text_run_count: entries.filter((entry) => entry.text.length > 0).length,
      raster_text_region_count: rawSource.raster_text_region_count ?? 0,
      min_confidence: confidences.length > 0 ? Math.min(...confidences) : undefined,
      confidence_buckets: confidenceBuckets,
      normalized_text_hashes: normalizedTextHashes,
      text_length_buckets: textLengthBuckets,
      locators,
    },
  };
}

function isDiagnosticDisclosureContext(context) {
  const value = typeof context === "string" ? context : context?.mode ?? context?.type;
  return ALLOWED_DIAGNOSTIC_CONTEXTS.has(value);
}

function isOcrTextAuthority(status) {
  return status === "ocr_extracted_text" || status === "ocr_authoritative";
}

function reviewTextAuthority(textAuthority, artifactRef, options = {}) {
  const findings = [];
  const warnings = [];
  const status = textAuthority.public.status;
  const legacySlides = Array.isArray(options.legacySlides) ? options.legacySlides : [];
  const artifactSlideCount = Number.isInteger(options.artifactSlideCount)
    ? options.artifactSlideCount
    : undefined;
  const artifactTextRunCount = Number.isInteger(options.artifactTextRunCount)
    ? options.artifactTextRunCount
    : undefined;

  if (legacySlides.length > 0) {
    warnings.push({
      id: "legacy_slides_non_authoritative",
      message:
        "Handwritten slide summaries are retained as supplemental context but cannot satisfy presentation acceptance.",
    });
  }

  if (status === "no_user_facing_text_proven") {
    const proofRef = normalizeArtifactRef(
      textAuthority.raw.artifact_ref ?? textAuthority.raw.artifact,
    );
    const proofIsBound =
      artifactRef.kind === "pptx" &&
      isPortablePath(artifactRef.path) &&
      artifactRef.sha256 &&
      artifactRefsMatch(artifactRef, proofRef);
    const proofMethod = textAuthority.public.method;
    const proofComplete =
      proofIsBound &&
      ALLOWED_NO_TEXT_PROOF_METHODS.has(proofMethod) &&
      textAuthority.public.extractor_id &&
      textAuthority.public.config_sha256 &&
      Number.isInteger(textAuthority.public.slide_count) &&
      textAuthority.public.slide_count > 0 &&
      (artifactSlideCount === undefined || textAuthority.public.slide_count === artifactSlideCount) &&
      (artifactTextRunCount === undefined || artifactTextRunCount === 0) &&
      textAuthority.public.text_run_count === 0 &&
      textAuthority.public.authoritative_slide_count === 0 &&
      textAuthority.public.raster_text_region_count === 0;

    if (!proofIsBound) {
      findings.push(
        finding(
          "no_text_proof_not_artifact_bound",
          "High",
          "Visual-only no-text proof must be bound to the same repo-relative PPTX artifact path and sha256.",
        ),
      );
    }

    if (!proofComplete) {
      findings.push(
        finding(
          "no_text_proof_incomplete",
          "High",
          "Visual-only decks must include artifact-bound no-user-facing-text proof.",
          {
            method: proofMethod,
            has_extractor_id: Boolean(textAuthority.public.extractor_id),
            has_config_sha256: Boolean(textAuthority.public.config_sha256),
            slide_count: textAuthority.public.slide_count,
            artifact_slide_count: artifactSlideCount,
            artifact_text_run_count: artifactTextRunCount,
            text_run_count: textAuthority.public.text_run_count,
            raster_text_region_count: textAuthority.public.raster_text_region_count,
          },
        ),
      );
    }

    return { findings, warnings };
  }

  const ocrTextAuthority = isOcrTextAuthority(status);

  if (status !== "extracted" && status !== "authoritative" && !ocrTextAuthority) {
    const statusFindingId =
      status === "ocr_required"
        ? "ocr_required"
        : status === "ocr_inconclusive"
          ? "ocr_inconclusive"
          : "missing_authoritative_text";

    findings.push(
      finding(
        statusFindingId,
        "High",
        "Presentation evidence must include artifact-bound authoritative extracted primary slide text.",
      ),
    );

    return { findings, warnings };
  }

  const extractionRef = normalizeArtifactRef(
    textAuthority.raw.artifact_ref ?? textAuthority.raw.artifact,
  );
  const extractionIsBound =
    artifactRef.kind === "pptx" &&
    isPortablePath(artifactRef.path) &&
    artifactRef.sha256 &&
    artifactRefsMatch(artifactRef, extractionRef);

  if (!extractionIsBound) {
    findings.push(
      finding(
        "extraction_not_artifact_bound",
        "High",
        "Authoritative presentation text must be bound to the same repo-relative PPTX artifact path and sha256.",
      ),
    );
  }

  if (ocrTextAuthority) {
    const textEntries = textAuthority.entries.filter((entry) => entry.text.length > 0);
    const lowConfidenceCount = textEntries.filter(
      (entry) => !Number.isFinite(entry.confidence) || entry.confidence < MIN_OCR_CONFIDENCE,
    ).length;
    const nonOcrTextEntryCount = textEntries.filter(
      (entry) => !ALLOWED_OCR_TEXT_ENTRY_KINDS.has(entry.kind),
    ).length;
    const ocrComplete =
      extractionIsBound &&
      ALLOWED_OCR_AUTHORITY_METHODS.has(textAuthority.public.method) &&
      textAuthority.public.extractor_id &&
      textAuthority.public.extractor_version &&
      textAuthority.public.config_sha256 &&
      textAuthority.public.raster_text_region_count > 0 &&
      nonOcrTextEntryCount === 0 &&
      lowConfidenceCount === 0;

    if (!ocrComplete) {
      findings.push(
        finding(
          "ocr_inconclusive",
          "High",
          "OCR evidence must be artifact-bound, pinned to an extractor version and config hash, and meet the confidence floor.",
          {
            method: textAuthority.public.method,
            has_extractor_id: Boolean(textAuthority.public.extractor_id),
            has_extractor_version: Boolean(textAuthority.public.extractor_version),
            has_config_sha256: Boolean(textAuthority.public.config_sha256),
            raster_text_region_count: textAuthority.public.raster_text_region_count,
            confidence_floor: MIN_OCR_CONFIDENCE,
            low_confidence_entry_count: lowConfidenceCount,
            non_ocr_text_entry_count: nonOcrTextEntryCount,
          },
        ),
      );
    }
  }

  const slideCount = textAuthority.public.slide_count;
  const coveredSlides = new Set();
  const invalidSlides = [];

  if (artifactSlideCount !== undefined && slideCount !== artifactSlideCount) {
    findings.push(
      finding(
        "artifact_slide_count_mismatch",
        "High",
        "Authoritative presentation text slide count must match the bound PPTX artifact slide count.",
        {
          artifact_slide_count: artifactSlideCount,
          declared_slide_count: slideCount,
        },
      ),
    );
  }

  for (const entry of textAuthority.entries) {
    if (
      !Number.isInteger(entry.slide_index) ||
      !Number.isInteger(entry.slide_number) ||
      entry.slide_index < 0 ||
      entry.slide_number !== entry.slide_index + 1 ||
      entry.slide_number < 1 ||
      entry.slide_number > slideCount
    ) {
      invalidSlides.push(entry.object_index);
      continue;
    }

    if (entry.text.length > 0) {
      coveredSlides.add(entry.slide_number);
    }
  }

  if (
    !Number.isInteger(slideCount) ||
    slideCount <= 0 ||
    coveredSlides.size !== slideCount ||
    invalidSlides.length > 0
  ) {
    findings.push(
      finding(
        "missing_authoritative_text",
        "High",
        "Authoritative presentation text must cover every slide with valid slide locators.",
        {
          slide_count: slideCount,
          covered_slide_count: coveredSlides.size,
          invalid_locator_count: invalidSlides.length,
        },
      ),
    );
  }

  if (
    !ocrTextAuthority &&
    Number.isInteger(artifactTextRunCount) &&
    artifactTextRunCount > 0 &&
    textAuthority.public.text_run_count < artifactTextRunCount
  ) {
    findings.push(
      finding(
        "incomplete_text_authority",
        "High",
        "Authoritative presentation text must account for every text run in the bound PPTX artifact.",
        {
          artifact_text_run_count: artifactTextRunCount,
          extracted_text_run_count: textAuthority.public.text_run_count,
        },
      ),
    );
  }

  if (textAuthority.public.raster_text_region_count > 0 && !ocrTextAuthority) {
    findings.push(
      finding(
        "ocr_required",
        "High",
        "Raster text regions require an artifact-bound OCR authority before presentation evidence can be accepted.",
        {
          raster_text_region_count: textAuthority.public.raster_text_region_count,
        },
      ),
    );
  }

  if (isDiagnosticDisclosureContext(options.disclosureContext)) {
    return { findings, warnings };
  }

  const matches = [];
  for (const entry of textAuthority.entries) {
    for (const rule of SLIDE_DISCLOSURE_PATTERNS) {
      if (rule.pattern.test(entry.text)) {
        matches.push({
          rule_id: rule.id,
          term: rule.term,
          slide_index: entry.slide_index,
          slide_number: entry.slide_number,
          object_index: entry.object_index,
          text_hash: sha256(entry.text),
          text_length_bucket: textLengthBucket(entry.text),
        });
      }
    }
  }

  if (matches.length > 0) {
    findings.push(
      finding(
        "slide_disclosure_leak",
        "High",
        "Presentation slide evidence must not expose implementation or review machinery in primary slide copy.",
        {
          matches: matches.slice(0, 20),
          omitted: Math.max(0, matches.length - 20),
        },
      ),
    );
  }

  return { findings, warnings };
}

function normalizeSourceRef(value) {
  if (typeof value === "string") {
    return { path: value };
  }

  if (!isObject(value)) {
    return undefined;
  }

  return {
    kind: typeof value.kind === "string" ? value.kind : undefined,
    path: typeof value.path === "string" ? value.path : undefined,
    sha256: typeof value.sha256 === "string" ? value.sha256 : undefined,
  };
}

function sourceRefsMatch(left, right) {
  const normalizedLeft = normalizeSourceRef(left);
  const normalizedRight = normalizeSourceRef(right);

  if (!normalizedLeft?.path || !normalizedRight?.path) {
    return false;
  }

  return (
    normalizedLeft.path === normalizedRight.path &&
    (normalizedLeft.kind === undefined ||
      normalizedRight.kind === undefined ||
      normalizedLeft.kind === normalizedRight.kind) &&
    (normalizedLeft.sha256 === undefined ||
      normalizedRight.sha256 === undefined ||
      normalizedLeft.sha256 === normalizedRight.sha256)
  );
}

function createSourceLintReview(evidence = {}, findings) {
  if (typeof evidence.source === "string") {
    const computedSourceHash = sha256(evidence.source);

    if (
      typeof evidence.source_hash === "string" &&
      evidence.source_hash !== computedSourceHash
    ) {
      findings.push(
        finding(
          "source_hash_mismatch",
          "High",
          "Presentation source_hash must match the supplied generated source text.",
          {
            expected_sha256: evidence.source_hash,
            observed_sha256: computedSourceHash,
          },
        ),
      );
    }

    const sourceReview = lintJudgmentKitPresentationSource(evidence.source);
    return {
      ...sourceReview,
      source_hash: computedSourceHash,
      source_ref: normalizeSourceRef(evidence.source_ref),
    };
  }

  const sourceReview = normalizeSourceLint(evidence.source_lint);
  const binding = sourceLintBinding(sourceReview);
  const hasSourcePointer = Boolean(evidence.source_ref || evidence.source_hash);
  const lintStatus = sourceReview.status;
  const lintFindings = sourceReview.findings;
  const trustedStatus = TRUSTED_SOURCE_LINT_STATUSES.has(lintStatus);
  const hashBound =
    typeof evidence.source_hash === "string" &&
    binding.sourceHash === evidence.source_hash;
  const refBound =
    evidence.source_ref &&
    binding.sourceRef &&
    sourceRefsMatch(binding.sourceRef, evidence.source_ref);
  const bindingConflict =
    (typeof evidence.source_hash === "string" &&
      typeof binding.sourceHash === "string" &&
      binding.sourceHash !== evidence.source_hash) ||
    (evidence.source_ref &&
      binding.sourceRef &&
      !sourceRefsMatch(binding.sourceRef, evidence.source_ref));

  if (!hasSourcePointer) {
    findings.push(
      finding(
        "missing_source",
        "High",
        "Presentation evidence must include generated source so the adapter import and off-token styles can be audited.",
      ),
    );
  } else if (!sourceReview || lintStatus === "skipped" || !trustedStatus) {
    findings.push(
      finding(
        "missing_source_lint",
        "High",
        "Presentation evidence with source_ref or source_hash must include a non-skipped source lint result.",
      ),
    );
  } else if (bindingConflict || (!hashBound && !refBound)) {
    findings.push(
      finding(
        "unbound_source_lint",
        "High",
        "Presentation source lint must be bound to the same source_hash or source_ref as the evidence.",
      ),
    );
  }

  if (lintStatus === "failed") {
    findings.push(
      finding(
        "source_lint_failed",
        "High",
        "Presentation source lint must pass before evidence can be accepted.",
        { source_finding_count: lintFindings.length },
      ),
    );
  }

  return {
    status: lintStatus,
    findings: lintFindings,
    source_hash: binding.sourceHash,
    source_ref: normalizeSourceRef(binding.sourceRef),
  };
}

export function reviewJudgmentKitPresentationEvidence(evidence = {}) {
  const findings = [];
  const warnings = [];
  const artifactBinding = bindArtifactRef(
    evidence.artifact_ref ?? evidence.artifact ?? {
      path: evidence.deck_path,
      kind: "pptx",
    },
    {
      repoRoot: evidence.repo_root,
      requireTrackedArtifact: evidence.require_tracked_artifact,
    },
  );
  const artifactRef = artifactBinding.artifactRef;
  const textAuthority = buildTextAuthority(evidence);

  findings.push(...artifactBinding.findings);

  const sourceReview = createSourceLintReview(evidence, findings);

  findings.push(...sourceReview.findings);
  const textReview = reviewTextAuthority(textAuthority, artifactRef, {
    legacySlides: evidence.slides,
    disclosureContext: evidence.disclosure_context,
    artifactSlideCount: artifactBinding.slideCount,
    artifactTextRunCount: artifactBinding.textRunCount,
  });
  findings.push(...textReview.findings);
  warnings.push(...textReview.warnings);

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

  if (!artifactRef.path) {
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
    warnings,
    findings,
  };
}

export function createJudgmentKitPresentationEvidence(input = {}) {
  const styleIds = input.theme?.style_ids ?? input.theme?.styleIds;
  const hasSourceText = typeof input.source === "string";
  const inputSourceLintBinding = sourceLintBinding(normalizeSourceLint(input.source_lint));
  const computedSourceHash = hasSourceText ? sha256(input.source) : undefined;
  const sourceHash = hasSourceText
    ? input.source_hash ?? computedSourceHash
    : input.source_hash ?? inputSourceLintBinding.sourceHash;
  const sourceRef = input.source_ref ?? inputSourceLintBinding.sourceRef;
  const sourceReview = hasSourceText
    ? {
        ...lintJudgmentKitPresentationSource(input.source),
        source_hash: computedSourceHash,
        source_ref: normalizeSourceRef(sourceRef),
      }
    : input.source_lint;
  const artifactBinding = bindArtifactRef(
    input.artifact_ref ?? input.artifact ?? {
      path: input.deck_path,
      kind: "pptx",
    },
    {
      repoRoot: input.repo_root,
      requireTrackedArtifact: input.require_tracked_artifact,
    },
  );
  const artifactRef = artifactBinding.artifactRef;
  const textAuthority = buildTextAuthority(input);
  const evidence = {
    adapter: JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
    artifact_ref: artifactRef,
    source_ref: sourceRef,
    source_hash: sourceHash,
    source_lint: sourceReview,
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
    text_authority: textAuthority.public,
    legacy_slides: {
      authority: "non_authoritative",
      count: Array.isArray(input.slides) ? input.slides.length : 0,
      omitted: true,
    },
    evidence_sources: {
      slides: { authority: "non_authoritative", role: "supplemental_summary" },
    },
  };

  return {
    ...evidence,
    review: reviewJudgmentKitPresentationEvidence({
      ...input,
      source_lint: sourceReview,
      source_ref: sourceRef,
      source_hash: sourceHash,
      artifact_ref: artifactRef,
      repo_root: input.repo_root,
      require_tracked_artifact: input.require_tracked_artifact,
    }),
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
