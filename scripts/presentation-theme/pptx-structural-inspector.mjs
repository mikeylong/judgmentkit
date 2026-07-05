import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const XML_DECODER = new TextDecoder("utf8");

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }

  throw new Error("PPTX_ZIP_EOCD_MISSING: could not locate the ZIP end-of-central-directory record.");
}

function readZipEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map();
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("PPTX_ZIP_CENTRAL_DIRECTORY_INVALID: invalid central directory entry.");
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

function readZipEntry(buffer, entry) {
  const offset = entry.localHeaderOffset;

  if (buffer.readUInt32LE(offset) !== LOCAL_FILE_SIGNATURE) {
    throw new Error(`PPTX_ZIP_LOCAL_HEADER_INVALID: invalid local header for ${entry.name}.`);
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

  throw new Error(`PPTX_ZIP_UNSUPPORTED_COMPRESSION: ${entry.name} uses method ${entry.compressionMethod}.`);
}

function readXml(buffer, entries, name) {
  const entry = entries.get(name);

  if (!entry) {
    return null;
  }

  return XML_DECODER.decode(readZipEntry(buffer, entry));
}

function collectThemeColors(themeXml) {
  const colors = {};
  const slotPattern = /<a:(dk1|lt1|dk2|lt2|accent1|accent2|accent3|accent4|accent5|accent6|hlink|folHlink)>[\s\S]*?<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/g;

  for (const match of themeXml.matchAll(slotPattern)) {
    colors[match[1]] = `#${match[2].toLowerCase()}`;
  }

  return colors;
}

function inspectRelationships(entries, buffer) {
  const relationshipFiles = [...entries.keys()].filter((name) => name.endsWith(".rels"));
  const external = [];
  const absoluteTargets = [];
  const imageTargets = [];

  for (const name of relationshipFiles) {
    const xml = readXml(buffer, entries, name) ?? "";

    for (const rel of xml.matchAll(/<Relationship\b[^>]*>/g)) {
      const tag = rel[0];
      const target = tag.match(/\bTarget="([^"]+)"/)?.[1] ?? "";

      if (/\bTargetMode="External"/.test(tag)) {
        external.push({ rel: name, target });
      }

      if (/^(?:[A-Za-z]:[\\/]|file:)/.test(target) || target.includes("..")) {
        absoluteTargets.push({ rel: name, target });
      }

      if (/\/image$/.test(tag.match(/\bType="([^"]+)"/)?.[1] ?? "") || /(?:^|\/)media\//.test(target)) {
        imageTargets.push({ rel: name, target });
      }
    }
  }

  return { relationshipFiles, external, absoluteTargets, imageTargets };
}

function slideSortKey(name) {
  return Number(name.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
}

export function inspectPptx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const entries = readZipEntries(buffer);
  const names = [...entries.keys()].sort();
  const presentationXml = readXml(buffer, entries, "ppt/presentation.xml") ?? "";
  const contentTypesXml = readXml(buffer, entries, "[Content_Types].xml") ?? "";
  const themeEntries = names.filter((name) => /^ppt\/theme\/theme\d+\.xml$/.test(name));
  const slideEntries = names
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideSortKey(a) - slideSortKey(b));
  const relationships = inspectRelationships(entries, buffer);
  const slideSizeMatch = presentationXml.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  const slideSummaries = [];

  for (const slideEntry of slideEntries) {
    const xml = readXml(buffer, entries, slideEntry) ?? "";
    slideSummaries.push({
      path: slideEntry,
      blips: (xml.match(/<a:blip\b/g) ?? []).length,
      tables: (xml.match(/<a:tbl\b/g) ?? []).length,
      charts: (xml.match(/chart/g) ?? []).length,
      text_runs: (xml.match(/<a:t>/g) ?? []).length,
      graphic_frames: (xml.match(/<p:graphicFrame\b/g) ?? []).length,
      pictures: (xml.match(/<p:pic\b/g) ?? []).length,
      shapes: (xml.match(/<p:sp\b/g) ?? []).length,
    });
  }

  const themeColors = {};
  for (const themeEntry of themeEntries) {
    themeColors[themeEntry] = collectThemeColors(readXml(buffer, entries, themeEntry) ?? "");
  }

  const traversalEntries = names.filter((name) => name.includes("..") || path.isAbsolute(name));

  return {
    path: filePath,
    bytes: buffer.length,
    zip_entries: names.length,
    has_content_types: contentTypesXml.includes("presentationml.presentation.main+xml"),
    has_presentation_xml: presentationXml.length > 0,
    slide_count: slideEntries.length,
    slide_size_emu: slideSizeMatch
      ? { cx: Number(slideSizeMatch[1]), cy: Number(slideSizeMatch[2]) }
      : null,
    theme_entries: themeEntries,
    theme_colors: themeColors,
    slide_entries: slideSummaries,
    relationship_file_count: relationships.relationshipFiles.length,
    external_relationships: relationships.external,
    image_relationships: relationships.imageTargets,
    absolute_or_traversal_relationships: relationships.absoluteTargets,
    traversal_entries: traversalEntries,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pptxPath = process.argv[2];

  if (!pptxPath) {
    throw new Error("Usage: node scripts/presentation-theme/pptx-structural-inspector.mjs <deck.pptx>");
  }

  console.log(`${JSON.stringify(inspectPptx(pptxPath), null, 2)}\n`);
}
