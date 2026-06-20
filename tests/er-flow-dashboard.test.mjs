import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dashboardPath = path.join(process.cwd(), "examples", "er-flow-dashboard", "index.html");
const html = fs.readFileSync(dashboardPath, "utf8");

function visibleText(source) {
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const visible = visibleText(html);

assert.ok(html.includes("<title>ED Flow Board</title>"));
assert.ok(html.includes("data-er-flow-board"));
assert.ok(html.includes("<h1>ED Flow Board</h1>"));
assert.ok(html.includes("Central ED - active shift"));

for (const requiredText of [
  "Open staffed rooms",
  "Occupied",
  "Turnover",
  "Critical rooms",
  "Waiting",
  "Staffed capacity",
  "Zone occupancy grid",
  "Needs attention",
  "Selected detail",
  "Disposition bottlenecks",
  "Shift huddle note",
  "Feedback questions",
  "Privacy mode",
  "Last-known view",
  "Refresh sample state",
  "Verify in the care record before action.",
]) {
  assert.ok(visible.includes(requiredText), `${requiredText} should be visible in the MVP.`);
}

for (const zone of ["Main ED", "Resus", "Fast track", "Behavioral health", "Observation"]) {
  assert.ok(html.includes(`name: "${zone}"`), `${zone} should be represented in sample room data.`);
}

for (const stateClass of [
  "state-open",
  "state-occupied",
  "state-cleaning",
  "state-hold",
  "state-critical",
  "state-closed",
]) {
  assert.ok(html.includes(stateClass), `${stateClass} should have a visible room state style.`);
}

for (const stateName of [
  "Open clean",
  "Occupied",
  "Turnover",
  "Admit hold",
  "Safety setup",
  "Closed",
]) {
  assert.ok(html.includes(stateName), `${stateName} should appear as a text status.`);
}

for (const acuity of ["ESI 1", "ESI 2", "ESI 3", "ESI 4", "ESI 5"]) {
  assert.ok(html.includes(acuity), `${acuity} should appear as a text acuity label.`);
}

for (const selector of [
  "data-filter=\"all\"",
  "data-filter=\"open\"",
  "data-filter=\"cleaning\"",
  "data-filter=\"critical\"",
  "data-filter=\"hold\"",
  "data-privacy-toggle",
  "data-stale-toggle",
  "data-refresh",
  "data-attention-list",
  "data-detail-panel",
]) {
  assert.ok(html.includes(selector), `${selector} should be present.`);
}

for (const state of ["data-state=\"loading\"", "data-state=\"error\"", "data-state=\"empty\""]) {
  assert.ok(html.includes(state), `${state} should be represented.`);
}

assert.ok(html.includes("role=\"status\" aria-live=\"polite\""));
assert.ok(html.includes("aria-label=\"Filter rooms by status\""));
assert.ok(html.includes("aria-pressed=\"false\""));
assert.ok(html.includes("button:disabled"));
assert.ok(html.includes("button.disabled = true"));
assert.ok(html.includes("aria-disabled"));
assert.ok(html.includes("button:focus-visible"));
assert.ok(html.includes("min-height: 44px;"));
assert.ok(html.includes("prefers-reduced-motion"));

assert.ok(html.includes("<svg"));
assert.ok(html.includes("viewBox=\"0 0 24 24\""));
assert.equal(html.includes("https://lucide.dev"), false);
assert.equal(html.includes("cdn"), false);

for (const privacyRisk of ["MRN", "DOB", "Full name", "Insurance", "Payment"]) {
  assert.equal(visible.includes(privacyRisk), false, `${privacyRisk} should not be visible.`);
}

for (const hiddenTerm of [
  "MCP",
  "prompt",
  "schema",
  "tool call",
  "resource id",
  "trace",
  "API",
]) {
  assert.equal(visible.includes(hiddenTerm), false, `${hiddenTerm} should not be visible in product UI.`);
}

assert.ok(html.includes("body.privacy-on .maskable"));
assert.ok(html.includes("Details masked"));
assert.ok(html.includes("Last known sample"));
assert.ok(html.includes("Last known room state remains visible"));
assert.ok(html.includes("Mark for huddle"));
assert.ok(html.includes("Discuss assignment"));
assert.ok(html.includes("Flag turnover"));
assert.ok(html.includes("Flag escalation"));
