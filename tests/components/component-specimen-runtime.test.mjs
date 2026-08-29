import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ComponentSpecimenPreview,
  RUNTIME_COMPONENT_IDS,
  RUNTIME_COMPONENT_SCENARIOS,
  scenariosForComponent,
} from "../../site/component-specimen-runtime.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(__dirname, "../..");
const activityContract = JSON.parse(
  fs.readFileSync(
    path.join(
      repositoryRoot,
      "contracts",
      "ai-ui-generation.activity-contract.json",
    ),
    "utf8",
  ),
);

const EXPECTED_COMPONENT_IDS = Object.freeze([
  "action_button",
  "action_group",
  "form_field",
  "text_field",
  "text_area",
  "select_field",
  "checkbox_group",
  "radio_group",
  "toggle",
  "tabs",
  "menu",
  "dialog",
  "alert",
  "table",
  "panel",
  "card",
  "status_message",
]);

const PREVIOUS_SCENARIO_IDS = Object.freeze([
  "action_button.ready",
  "action_button.disabled",
  "action_button.focus-visible",
  "action_button.loading",
  "form_field.empty",
  "form_field.ready",
  "form_field.error",
  "form_field.disabled",
  "form_field.focus-visible",
  "text_field.empty",
  "text_field.ready",
  "text_field.error",
  "text_field.disabled",
  "text_field.focus-visible",
  "toggle.ready",
  "toggle.disabled",
  "toggle.focus-visible",
  "status_message.ready",
  "status_message.loading",
  "status_message.error",
  "action_group.ready",
  "action_group.disabled",
  "action_group.focus-visible",
  "text_area.empty",
  "text_area.ready",
  "text_area.error",
  "text_area.disabled",
  "text_area.focus-visible",
  "select_field.empty",
  "select_field.ready",
  "select_field.error",
  "select_field.disabled",
  "select_field.focus-visible",
  "checkbox_group.ready",
  "checkbox_group.error",
  "checkbox_group.disabled",
  "checkbox_group.focus-visible",
  "radio_group.empty",
  "radio_group.ready",
  "radio_group.error",
  "radio_group.disabled",
  "radio_group.focus-visible",
  "alert.ready",
  "alert.focus-visible",
  "table.empty",
  "table.ready",
  "table.loading",
  "table.error",
  "table.focus-visible",
  "panel.ready",
  "panel.loading",
  "panel.error",
  "card.ready",
  "card.disabled",
  "card.focus-visible",
]);

const NEW_COMPONENT_IDS = Object.freeze([
  "action_group",
  "text_area",
  "select_field",
  "checkbox_group",
  "radio_group",
  "alert",
  "table",
  "panel",
  "card",
  "tabs",
  "menu",
  "dialog",
]);
const contractById = new Map(
  activityContract.implementation_contract.default_ai_native_design_system
    .component_contracts.map((contract) => [contract.id, contract]),
);

assert.deepEqual(RUNTIME_COMPONENT_IDS, EXPECTED_COMPONENT_IDS);
assert.equal(RUNTIME_COMPONENT_SCENARIOS.length, 65);
assert.deepEqual(
  RUNTIME_COMPONENT_SCENARIOS.slice(0, 55).map((entry) => entry.id),
  PREVIOUS_SCENARIO_IDS,
  "the 55 existing specimen scenarios must remain unchanged and ordered",
);
assert.equal(
  new Set(RUNTIME_COMPONENT_SCENARIOS.map((entry) => entry.id)).size,
  RUNTIME_COMPONENT_SCENARIOS.length,
  "specimen scenario ids must be unique",
);

for (const entry of RUNTIME_COMPONENT_SCENARIOS) {
  assert.equal(entry.status, "unverified", `${entry.id} must not claim evidence`);
  assert.ok(Object.isFrozen(entry), `${entry.id} must be deterministic`);
  assert.ok(Object.isFrozen(entry.fixture), `${entry.id} fixture must be frozen`);
}

for (const componentId of EXPECTED_COMPONENT_IDS) {
  const contract = contractById.get(componentId);
  assert.ok(contract, `missing canonical contract for ${componentId}`);
  assert.deepEqual(
    scenariosForComponent(componentId).map((entry) => entry.state),
    contract.required_states,
    `${componentId} must render every required state exactly once`,
  );
}

assert.equal(
  scenariosForComponent("text_area").find((entry) => entry.state === "ready")
    .fixture.control_mode,
  "controlled_update",
);
assert.equal(
  scenariosForComponent("select_field").find((entry) => entry.state === "error")
    .fixture.control_mode,
  "controlled_reject",
);
assert.equal(
  scenariosForComponent("checkbox_group").find(
    (entry) => entry.state === "focus-visible",
  ).fixture.control_mode,
  undefined,
);
assert.equal(
  scenariosForComponent("radio_group").find((entry) => entry.state === "empty")
    .fixture.control_mode,
  "controlled_update",
);
assert.equal(
  scenariosForComponent("menu").find((entry) => entry.state === "ready")
    .fixture.default_open,
  false,
  "the ready menu fixture must not steal focus or cover adjacent specimens on load",
);
assert.equal(
  scenariosForComponent("dialog").every(
    (entry) => entry.fixture.counter_label === "Dialog actions",
  ),
  true,
  "each dialog state must expose an interaction receipt",
);

const markupByComponent = new Map();
for (const componentId of NEW_COMPONENT_IDS) {
  const markup = renderToStaticMarkup(
    createElement(ComponentSpecimenPreview, {
      contractId: componentId,
      contractHash: `fixture-${componentId}`,
    }),
  );
  markupByComponent.set(componentId, markup);

  const scenarios = scenariosForComponent(componentId);
  assert.equal(
    [...markup.matchAll(/data-scenario-id=/gu)].length,
    scenarios.length,
    `${componentId} must render one public specimen per scenario`,
  );
  for (const scenario of scenarios) {
    assert.match(markup, new RegExp(`data-scenario-id="${scenario.id}"`));
    assert.match(markup, /data-scenario-status="unverified"/u);
  }

  const focusScenario = scenarios.find((entry) => entry.state === "focus-visible");
  if (focusScenario) {
    const focusMarkup = renderToStaticMarkup(
      createElement(ComponentSpecimenPreview, {
        contractId: componentId,
        scenarios: [focusScenario],
      }),
    );
    if (
      ["checkbox_group", "radio_group", "card", "tabs", "menu"].includes(
        componentId,
      )
    ) {
      assert.equal(
        [...focusMarkup.matchAll(/data-scenario-focus-target="true"/gu)].length,
        0,
        `${componentId} must let its semantic control remain the focus target`,
      );
      assert.doesNotMatch(
        focusMarkup,
        new RegExp(`data-jk-component="${componentId}"[^>]*tabindex=`),
        `${componentId} must not add a wrapper tab stop`,
      );
      if (componentId === "checkbox_group") {
        assert.match(focusMarkup, /type="checkbox"/u);
      } else if (componentId === "radio_group") {
        assert.match(focusMarkup, /type="radio"/u);
      } else if (componentId === "card") {
        assert.match(focusMarkup, /data-jk-card-action="link"/u);
        assert.match(focusMarkup, /data-jk-action-type="link"/u);
      } else if (componentId === "tabs") {
        assert.match(focusMarkup, /role="tab"[^>]*tabindex="0"/u);
      } else {
        assert.match(focusMarkup, /class="jk-menu__trigger"/u);
      }
    } else {
      assert.equal(
        [...focusMarkup.matchAll(/data-scenario-focus-target="true"/gu)].length,
        1,
        `${componentId} must expose one deterministic focus target`,
      );
    }
  }
}

assert.match(markupByComponent.get("action_group"), /role="group"/u);
assert.match(markupByComponent.get("action_group"), />Approve refund</u);

assert.match(markupByComponent.get("text_area"), /<textarea\b/u);
assert.match(markupByComponent.get("text_area"), />Review note</u);

assert.match(markupByComponent.get("select_field"), /<select\b/u);
assert.match(markupByComponent.get("select_field"), />Review owner</u);

assert.match(markupByComponent.get("checkbox_group"), /<fieldset\b/u);
assert.match(markupByComponent.get("checkbox_group"), /type="checkbox"/u);
assert.match(markupByComponent.get("checkbox_group"), />Evidence included</u);

assert.match(markupByComponent.get("radio_group"), /<fieldset\b/u);
assert.match(markupByComponent.get("radio_group"), /type="radio"/u);
assert.match(markupByComponent.get("radio_group"), />Refund decision</u);

assert.match(markupByComponent.get("alert"), /role="alert"/u);
assert.match(markupByComponent.get("alert"), />Evidence requires attention</u);

assert.match(markupByComponent.get("table"), /<table\b/u);
assert.match(markupByComponent.get("table"), /<caption[^>]*>Refund review queue/u);
assert.match(markupByComponent.get("table"), /scope="col"/u);

assert.match(markupByComponent.get("panel"), /<section\b/u);
assert.match(markupByComponent.get("panel"), /role="region"/u);
assert.match(markupByComponent.get("panel"), />Policy evidence</u);

assert.match(markupByComponent.get("card"), /<article\b/u);
assert.match(markupByComponent.get("card"), />Refund RF-1842</u);
assert.match(markupByComponent.get("card"), /data-jk-card-action/u);

assert.match(markupByComponent.get("tabs"), /role="tablist"/u);
assert.match(markupByComponent.get("tabs"), /aria-label="Refund review sections"/u);
assert.match(markupByComponent.get("tabs"), /role="tab"/u);
assert.match(markupByComponent.get("tabs"), /role="tabpanel"/u);
assert.match(markupByComponent.get("tabs"), />Evidence</u);
assert.match(markupByComponent.get("tabs"), />Policy</u);
assert.equal(
  [...markupByComponent.get("tabs").matchAll(/data-scenario-interaction-count=/gu)]
    .length,
  3,
);

assert.match(markupByComponent.get("menu"), /aria-haspopup="menu"/u);
assert.match(markupByComponent.get("menu"), />Refund commands</u);
assert.doesNotMatch(markupByComponent.get("menu"), /role="menu"/u);
assert.doesNotMatch(markupByComponent.get("menu"), /role="menuitem"/u);
assert.equal(
  [...markupByComponent.get("menu").matchAll(/data-scenario-interaction-count=/gu)]
    .length,
  3,
);

assert.match(markupByComponent.get("dialog"), /<dialog\b/u);
assert.match(markupByComponent.get("dialog"), />Review refund handoff</u);
assert.match(markupByComponent.get("dialog"), />Confirm refund handoff</u);
assert.match(markupByComponent.get("dialog"), /aria-label="Cancel handoff"/u);
assert.match(markupByComponent.get("dialog"), /data-jk-icon="x"/u);
assert.doesNotMatch(markupByComponent.get("dialog"), />Cancel handoff</u);
assert.match(markupByComponent.get("dialog"), /data-scenario-dialog-trigger="true"/u);
assert.equal(
  [...markupByComponent.get("dialog").matchAll(/data-scenario-interaction-count=/gu)]
    .length,
  4,
);

const tabsDisabledMarkup = renderToStaticMarkup(
  createElement(ComponentSpecimenPreview, {
    contractId: "tabs",
    scenarios: [
      scenariosForComponent("tabs").find((entry) => entry.state === "disabled"),
    ],
  }),
);
assert.match(tabsDisabledMarkup, /data-jk-disabled="true"/u);
assert.equal(
  [...tabsDisabledMarkup.matchAll(/<button[^>]* disabled=""/gu)].length,
  3,
  "the disabled tabs fixture must suppress every tab",
);

const menuDisabledMarkup = renderToStaticMarkup(
  createElement(ComponentSpecimenPreview, {
    contractId: "menu",
    scenarios: [
      scenariosForComponent("menu").find((entry) => entry.state === "disabled"),
    ],
  }),
);
assert.match(menuDisabledMarkup, /data-jk-disabled="true"/u);
assert.match(menuDisabledMarkup, /disabled=""/u);
assert.match(
  menuDisabledMarkup,
  /Commands unlock when receipt evidence is complete\./u,
);

const dialogLoadingMarkup = renderToStaticMarkup(
  createElement(ComponentSpecimenPreview, {
    contractId: "dialog",
    scenarios: [
      scenariosForComponent("dialog").find((entry) => entry.state === "loading"),
    ],
  }),
);
assert.match(dialogLoadingMarkup, /aria-busy="true"/u);
assert.match(dialogLoadingMarkup, /role="status"/u);
assert.match(dialogLoadingMarkup, />Sending the refund handoff\.</u);

const dialogErrorMarkup = renderToStaticMarkup(
  createElement(ComponentSpecimenPreview, {
    contractId: "dialog",
    scenarios: [
      scenariosForComponent("dialog").find((entry) => entry.state === "error"),
    ],
  }),
);
assert.match(dialogErrorMarkup, /aria-invalid="true"/u);
assert.match(dialogErrorMarkup, /role="alert"/u);
assert.match(dialogErrorMarkup, />The purchase receipt is unavailable\.</u);

console.log("component specimen runtime tests passed");
