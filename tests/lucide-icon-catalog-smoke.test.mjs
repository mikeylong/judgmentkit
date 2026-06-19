import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const smokePath = path.join(rootDir, "examples", "lucide-icon-catalog-smoke.html");
const expectedScenarioIds = [
  "check",
  "info",
  "chevron-right",
  "list-filter",
  "send",
  "receipt-text",
  "settings",
  "calendar",
  "search",
  "download",
  "upload",
  "trash-2",
  "user",
  "bell",
  "chart-column",
  "circle-alert",
];

execFileSync("node", ["scripts/lucide-icon-catalog-smoke.mjs"], {
  cwd: rootDir,
  stdio: "pipe",
});

assert.equal(fs.existsSync(smokePath), true);
const html = fs.readFileSync(smokePath, "utf8");

assert.ok(html.startsWith("<!doctype html>"));
assert.equal(/<script\b(?![^>]*type="application\/json")/i.test(html), false);
assert.equal(/<link\b/i.test(html), false);
assert.equal(/\bsrc\s*=/i.test(html), false);
assert.equal(/\bhref\s*=\s*["']https?:/i.test(html), false);
assert.equal(/unpkg|jsdelivr|googleapis|gstatic|fontawesome|icons-material/i.test(html), false);

const metadataMatch = html.match(
  /<script type="application\/json" id="lucide-icon-smoke-data">([\s\S]*?)<\/script>/,
);
assert.ok(metadataMatch, "Smoke page must embed machine-readable metadata.");
const metadata = JSON.parse(metadataMatch[1]);

assert.equal(metadata.proof_id, "lucide-icon-catalog-smoke-v1");
assert.equal(metadata.source.package, "lucide-static");
assert.equal(metadata.source.version, "1.21.0");
assert.equal(metadata.source.icon_count, metadata.catalog_count);
assert.ok(metadata.catalog_count > 1000);
assert.equal(metadata.rendered_grid_count, metadata.catalog_count);
assert.deepEqual(metadata.tools_used, [
  "search_icon_catalog",
  "get_icon_svg",
  "list_icon_catalog",
]);
assert.equal(metadata.agent_scenarios.length, expectedScenarioIds.length);

for (const iconId of expectedScenarioIds) {
  const scenario = metadata.agent_scenarios.find(
    (entry) => entry.selected_icon_id === iconId,
  );
  assert.ok(scenario, `Expected scenario for ${iconId}.`);
  assert.equal(scenario.expected_icon_id, iconId);
  assert.ok(scenario.search_rank >= 1);
  assert.ok(scenario.inline_svg.includes("<svg viewBox=\"0 0 24 24\">"));
}

assert.ok(html.includes("data-agent-icon-card"));
assert.ok(html.includes("data-catalog-icon"));
assert.ok(html.includes("<svg viewBox=\"0 0 24 24\">"));
assert.equal(
  (html.match(/data-agent-icon-card=/g) ?? []).length,
  expectedScenarioIds.length,
);
assert.equal(
  (html.match(/data-catalog-icon=/g) ?? []).length,
  metadata.catalog_count,
);
assert.equal(metadata.grid_icon_ids.length, metadata.catalog_count);
assert.ok(metadata.grid_icon_ids.includes("receipt-text"));
assert.ok(metadata.grid_icon_ids.includes("chart-column"));

console.log("Lucide icon visual smoke checks passed.");
