import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
export const DEFAULT_OUTPUT_ROOT = path.resolve(
  REPO_ROOT,
  "outputs/presentation-theme-actual-tests",
);
export const OUTPUT_ROOT = path.resolve(
  REPO_ROOT,
  process.env.JUDGMENTKIT_PPTX_FIXTURE_DIR ?? "outputs/presentation-theme-actual-tests",
);

export const ACTUAL_CASES = Object.freeze([
  {
    id: "jk-theme-canonical-16x9",
    width: 1280,
    height: 720,
    slides: 4,
  },
  {
    id: "jk-theme-custom-4x3",
    width: 1024,
    height: 768,
    slides: 1,
  },
  {
    id: "jk-theme-compact-review",
    width: 960,
    height: 540,
    slides: 1,
  },
]);

export const OUTPUT_POLICY = Object.freeze({
  generatedBy: "scripts/presentation-theme/build-actual-fixtures.mjs",
  evidenceChecker: "scripts/presentation-theme/actual-evidence-check.mjs",
  structuralInspector: "scripts/presentation-theme/pptx-structural-inspector.mjs",
  allowedExtensions: new Set([".json", ".ndjson", ".md", ".png", ".pptx", ".webp"]),
  forbiddenExtensions: new Set([".mjs", ".js", ".ts", ".cjs", ".sh"]),
  forbiddenNames: new Set([
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "node_modules",
    ".cache",
  ]),
  maxBytesByKind: {
    evidence: 200_000,
    hashes: 500_000,
    inspect: 2_000_000,
    layout: 1_000_000,
    manifest: 500_000,
    montage: 5_000_000,
    png: 5_000_000,
    pptx: 10_000_000,
    readme: 200_000,
    structural: 500_000,
    webp: 5_000_000,
  },
});

export function repoRelative(filePath) {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
}

export function outputPath(...segments) {
  return path.join(OUTPUT_ROOT, ...segments);
}

export function isCommittedOutputRoot(outputRoot = OUTPUT_ROOT) {
  return path.resolve(outputRoot) === DEFAULT_OUTPUT_ROOT;
}

export function requireCommittedOutputUpdateGate(action = "write committed presentation-theme actual evidence") {
  if (!isCommittedOutputRoot()) {
    return;
  }

  if (process.env.JUDGMENTKIT_PPTX_ACTUAL !== "1" || process.env.JUDGMENTKIT_PPTX_UPDATE !== "1") {
    throw new Error(
      [
        "JUDGMENTKIT_UPDATE_NOT_ENABLED:",
        `${action} requires JUDGMENTKIT_PPTX_ACTUAL=1 and JUDGMENTKIT_PPTX_UPDATE=1.`,
      ].join(" "),
    );
  }
}
