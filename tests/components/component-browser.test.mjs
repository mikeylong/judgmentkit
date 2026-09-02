import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build as buildWithEsbuild } from "esbuild";

import { buildSite } from "../../site/build-site.mjs";
import {
  COMPONENT_IMPLEMENTATION_REGISTRY,
  COMPONENT_RUNTIME_ADAPTER,
} from "../../src/component-registry.mjs";
import {
  RUNTIME_COMPONENT_IDS,
  RUNTIME_COMPONENT_SCENARIOS,
} from "../../site/component-specimen-runtime.mjs";
import { listenSiteLocalServer } from "../../scripts/site-local-server.mjs";
import {
  captureElementScreenshot,
  captureScreenshot,
  evaluate,
  getAxNode,
  insertText,
  openPage,
  pointerActivate,
  pressKey,
  tabUntil,
  waitForExpression,
  withChromium,
} from "./support/chromium-harness.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const AXE_PATH = path.join(REPO_ROOT, "node_modules", "axe-core", "axe.min.js");
const SPECIMEN_SOURCES = Object.freeze([
  "site/component-specimen-runtime.mjs",
  "site/component-specimens.jsx",
]);
const EVIDENCE_BINDING_SOURCES = Object.freeze([
  "package.json",
  "package-lock.json",
  "src/component-registry.mjs",
  "src/index.mjs",
  "site/build-site.mjs",
  ...SPECIMEN_SOURCES,
  "tests/components/component-browser.test.mjs",
  "tests/components/component-package-surface.test.mjs",
  "tests/components/support/chromium-harness.mjs",
  "tests/components/support/indeterminate-browser-probe.jsx",
]);
const EXPECTED_COMPONENT_COUNT = 17;
const EXPECTED_SCENARIO_COUNT = 65;
const EXPECTED_PRESENTATION_COUNT = 260;
const APPEARANCES = Object.freeze(["light", "dark"]);
const AXE_SCAN_RECEIPTS = [];
const VIEWPORTS = Object.freeze([
  Object.freeze({
    id: "desktop",
    label: "1365x900",
    width: 1365,
    height: 900,
    mobile: false,
  }),
  Object.freeze({
    id: "mobile",
    label: "390x844",
    width: 390,
    height: 844,
    mobile: true,
  }),
]);

const COMPONENT_SELECTORS = Object.freeze({
  action_button: ".jk-action-button[data-jk-component='action_button']",
  action_group: ".jk-action-group[data-jk-component='action_group']",
  form_field: ".jk-form-field[data-jk-component='form_field']",
  text_field: ".jk-form-field[data-jk-component='text_field']",
  text_area: ".jk-form-field[data-jk-component='text_area']",
  select_field: ".jk-form-field[data-jk-component='select_field']",
  checkbox_group: ".jk-choice-group[data-jk-component='checkbox_group']",
  radio_group: ".jk-choice-group[data-jk-component='radio_group']",
  toggle: ".jk-toggle[data-jk-component='toggle']",
  tabs: ".jk-tabs[data-jk-component='tabs']",
  menu: ".jk-menu[data-jk-component='menu']",
  dialog: ".jk-dialog[data-jk-component='dialog']",
  alert: ".jk-alert[data-jk-component='alert']",
  table: ".jk-table-region[data-jk-component='table']",
  panel: ".jk-panel[data-jk-component='panel']",
  card: ".jk-card[data-jk-component='card']",
  status_message: ".jk-status-message[data-jk-component='status_message']",
});

const APPEARANCE_SELECTORS = Object.freeze({
  action_button: ".jk-action-button",
  action_group: ".jk-action-group",
  form_field: ".jk-form-field[data-jk-component='form_field']",
  text_field: ".jk-text-field",
  text_area: ".jk-text-area",
  select_field: ".jk-select-field",
  checkbox_group: ".jk-choice-group[data-jk-component='checkbox_group']",
  radio_group: ".jk-choice-group[data-jk-component='radio_group']",
  toggle: ".jk-toggle",
  tabs: ".jk-tabs",
  menu: ".jk-menu",
  dialog: ".jk-dialog",
  alert: ".jk-alert",
  table: ".jk-table-region",
  panel: ".jk-panel",
  card: ".jk-card",
  status_message: ".jk-status-message",
});

function parseArgs(argv) {
  let evidenceOut = null;
  let edgeOnly = false;
  let interactionsOnly = false;
  let focusedViewportId = "desktop";
  let focusedAppearance = "light";
  let focusedPresentationOption = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--evidence-out") {
      if (evidenceOut !== null) {
        throw new Error("--evidence-out may be supplied only once.");
      }
      const value = argv[++index];
      if (!value || value.startsWith("--")) {
        throw new Error("--evidence-out requires a directory path.");
      }
      evidenceOut = path.resolve(value);
      continue;
    }
    if (argument === "--edge-only") {
      if (edgeOnly) throw new Error("--edge-only may be supplied only once.");
      edgeOnly = true;
      continue;
    }
    if (argument === "--interactions-only") {
      if (interactionsOnly) {
        throw new Error("--interactions-only may be supplied only once.");
      }
      interactionsOnly = true;
      continue;
    }
    if (argument === "--viewport") {
      const value = argv[++index];
      if (!VIEWPORTS.some((viewport) => viewport.id === value)) {
        throw new Error("--viewport must be desktop or mobile.");
      }
      focusedViewportId = value;
      focusedPresentationOption = true;
      continue;
    }
    if (argument === "--appearance") {
      const value = argv[++index];
      if (!APPEARANCES.includes(value)) {
        throw new Error("--appearance must be light or dark.");
      }
      focusedAppearance = value;
      focusedPresentationOption = true;
      continue;
    }
    throw new Error(`Unsupported component browser-test argument: ${argument}`);
  }
  if ((edgeOnly || interactionsOnly) && evidenceOut) {
    throw new Error("Focused browser modes cannot emit a full evidence candidate.");
  }
  if (edgeOnly && interactionsOnly) {
    throw new Error("Supply only one focused browser mode.");
  }
  if (focusedPresentationOption && !interactionsOnly) {
    throw new Error("--viewport and --appearance require --interactions-only.");
  }
  return {
    evidenceOut,
    edgeOnly,
    interactionsOnly,
    focusedViewportId,
    focusedAppearance,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256Files(relativePaths) {
  const hash = crypto.createHash("sha256");
  for (const relativePath of [...relativePaths].sort()) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(REPO_ROOT, relativePath)));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function scenarioSelector(id) {
  return `[data-scenario-id="${id}"]`;
}

function withinScenario(scenario, selector) {
  return `${scenarioSelector(scenario.id)} ${selector}`;
}

function componentSelector(scenario) {
  const selector = COMPONENT_SELECTORS[scenario.contract_id];
  if (!selector) {
    throw new Error(`No component selector exists for ${scenario.contract_id}.`);
  }
  return withinScenario(scenario, selector);
}

function semanticSelector(scenario) {
  const root = scenarioSelector(scenario.id);
  switch (scenario.contract_id) {
    case "action_button":
      return `${root} .jk-action-button`;
    case "action_group":
      return `${root} .jk-action-group`;
    case "form_field":
    case "text_field":
      return `${root} input[type='text']`;
    case "text_area":
      return `${root} textarea`;
    case "select_field":
      return `${root} select`;
    case "checkbox_group":
    case "radio_group":
      return `${root} fieldset`;
    case "toggle":
      return `${root} [role='switch']`;
    case "tabs":
      return `${root} [role='tablist']`;
    case "menu":
      return `${root} .jk-menu__trigger`;
    case "dialog":
      return `${root} [data-scenario-dialog-trigger='true']`;
    case "alert":
      return `${root} [role='alert']`;
    case "table":
      return `${root} table`;
    case "panel":
      return `${root} [role='region']`;
    case "card":
      return `${root} article`;
    case "status_message":
      return `${root} [data-jk-component='status_message']`;
    default:
      throw new Error(`No semantic selector exists for ${scenario.contract_id}.`);
  }
}

function focusTargetSelector(scenario) {
  const root = scenarioSelector(scenario.id);
  switch (scenario.contract_id) {
    case "action_button":
      return `${root} .jk-action-button`;
    case "action_group":
      return `${root} .jk-action-group__actions .jk-action-button:first-of-type`;
    case "form_field":
    case "text_field":
      return `${root} input[type='text']`;
    case "text_area":
      return `${root} textarea`;
    case "select_field":
      return `${root} select`;
    case "checkbox_group":
      return `${root} input[type='checkbox']:first-of-type`;
    case "radio_group":
      return `${root} input[type='radio']:checked`;
    case "toggle":
      return `${root} [role='switch']`;
    case "tabs":
      return `${root} [role='tab'][aria-selected='true']`;
    case "menu":
      return `${root} .jk-menu__trigger`;
    case "dialog":
      return `${root} .jk-dialog__actions .jk-action-button`;
    case "alert":
      return `${root} .jk-alert__action .jk-action-button`;
    case "table":
      return `${root} tbody .jk-action-button:first-of-type`;
    case "card":
      return `${root} .jk-card__action`;
    case "status_message":
      return `${root} [data-scenario-status-action='true']`;
    default:
      throw new Error(`No focus selector exists for ${scenario.contract_id}.`);
  }
}

function expectedBaseState(scenario) {
  return scenario.state === "focus-visible" ? "ready" : scenario.state;
}

function expectedAxRole(scenario) {
  switch (scenario.contract_id) {
    case "action_button":
      return "button";
    case "action_group":
      return "group";
    case "form_field":
    case "text_field":
    case "text_area":
      return "textbox";
    case "select_field":
      return "combobox";
    case "checkbox_group":
    case "radio_group":
      return "group";
    case "toggle":
      return "switch";
    case "tabs":
      return "tablist";
    case "menu":
    case "dialog":
      return "button";
    case "alert":
      return "alert";
    case "table":
      return "table";
    case "panel":
      return "region";
    case "card":
      return "article";
    case "status_message":
      return scenario.state === "error" ? "alert" : "status";
    default:
      throw new Error(`No AX role expectation exists for ${scenario.contract_id}.`);
  }
}

function expectedAccessibleName(scenario) {
  switch (scenario.contract_id) {
    case "action_button":
      return scenario.state === "loading"
        ? scenario.fixture.loading_label
        : scenario.fixture.label;
    case "action_group":
      return scenario.fixture.label;
    case "form_field":
    case "text_field":
    case "text_area":
    case "select_field":
    case "toggle":
      return scenario.fixture.label;
    case "checkbox_group":
    case "radio_group":
      return scenario.fixture.legend;
    case "tabs":
      return scenario.fixture.label;
    case "menu":
      return scenario.fixture.label;
    case "dialog":
      return scenario.fixture.trigger_label;
    case "table":
      return scenario.fixture.caption;
    case "panel":
      return scenario.fixture.heading;
    case "card":
      return scenario.fixture.title;
    default:
      return null;
  }
}

function assertStringIncludes(actual, expected, message) {
  assert.equal(typeof actual, "string", `${message}: expected a string`);
  assert.ok(
    actual.includes(expected),
    `${message}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`,
  );
}

async function inspectScenario(client, sessionId, scenario) {
  const rootSelector = scenarioSelector(scenario.id);
  const ownerSelector = componentSelector(scenario);
  const targetSelector = semanticSelector(scenario);
  return evaluate(
    client,
    sessionId,
    `(() => {
      const scenario = document.querySelector(${JSON.stringify(rootSelector)});
      const owner = document.querySelector(${JSON.stringify(ownerSelector)});
      const target = document.querySelector(${JSON.stringify(targetSelector)});
      if (!scenario || !owner || !target) return null;
      const describedIds = (target.getAttribute("aria-describedby") || "")
        .split(/\\s+/)
        .filter(Boolean);
      const describedText = describedIds
        .map((id) => document.getElementById(id)?.textContent?.replace(/\\s+/g, " ").trim() || "")
        .filter(Boolean)
        .join(" ");
      const labels = target.labels ? [...target.labels] : [];
      const bounds = scenario.getBoundingClientRect();
      return {
        scenarioId: scenario.getAttribute("data-scenario-id"),
        contractId: scenario.getAttribute("data-contract-id"),
        contractState: scenario.getAttribute("data-contract-state"),
        scenarioStatus: scenario.getAttribute("data-scenario-status"),
        scenarioOverflow: scenario.scrollWidth - scenario.clientWidth,
        scenarioBounds: { left: bounds.left, right: bounds.right, width: bounds.width },
        ownerComponent: owner.getAttribute("data-jk-component"),
        ownerState: owner.getAttribute("data-jk-state"),
        ownerBaseState: owner.getAttribute("data-jk-base-state"),
        ownerDisabled: owner.getAttribute("data-jk-disabled"),
        ownerInvalid: owner.getAttribute("data-jk-invalid"),
        ownerOpen: owner.getAttribute("data-jk-open"),
        ownerInert: owner.inert === true,
        tag: target.tagName,
        type: target.getAttribute("type"),
        role: target.getAttribute("role"),
        disabled: "disabled" in target ? target.disabled : false,
        value: "value" in target ? target.value : null,
        checked: "checked" in target ? target.checked : null,
        text: target.textContent?.replace(/\\s+/g, " ").trim() || "",
        labelText: labels.map((label) => label.textContent?.replace(/\\s+/g, " ").trim()).join(" "),
        describedIds,
        describedText,
        ariaBusy: target.getAttribute("aria-busy"),
        ariaInvalid: target.getAttribute("aria-invalid"),
        ariaChecked: target.getAttribute("aria-checked"),
        ariaLive: target.getAttribute("aria-live"),
        ariaAtomic: target.getAttribute("aria-atomic"),
        ariaExpanded: target.getAttribute("aria-expanded"),
        ariaHasPopup: target.getAttribute("aria-haspopup"),
        ariaDisabled: target.getAttribute("aria-disabled"),
        interactionCount: Number(
          scenario.querySelector("[data-scenario-interaction-count]")?.getAttribute("data-scenario-interaction-count") || 0
        ),
      };
    })()`,
  );
}

async function inspectSelectComposition(client, sessionId, scenario) {
  return evaluate(
    client,
    sessionId,
    `(() => {
      const scenarioRoot = document.querySelector(${JSON.stringify(scenarioSelector(scenario.id))});
      const container = scenarioRoot?.querySelector(".jk-select-field__control");
      const select = container?.querySelector("select.jk-select-field");
      const value = container?.querySelector("[data-part='value']");
      const slot = container?.querySelector("[data-part='indicator-slot']");
      const indicator = slot?.querySelector("[data-part='indicator']");
      if (!container || !select || !value || !slot || !indicator) return null;
      const containerRect = container.getBoundingClientRect();
      const selectRect = select.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      const indicatorRect = indicator.getBoundingClientRect();
      const direction = getComputedStyle(container).direction;
      const selectStyle = getComputedStyle(select);
      return {
        appearance: selectStyle.appearance || selectStyle.webkitAppearance,
        containerWidth: containerRect.width,
        direction,
        valueText: select.selectedOptions[0]?.textContent?.trim() || "",
        valueStartInset: Number.parseFloat(selectStyle.paddingInlineStart),
        valueEndReserve: Number.parseFloat(selectStyle.paddingInlineEnd),
        slotWidth: slotRect.width,
        slotEndInset: direction === "rtl"
          ? slotRect.left - containerRect.left
          : containerRect.right - slotRect.right,
        indicatorSize: { width: indicatorRect.width, height: indicatorRect.height },
        slotCenterDelta: Math.abs(
          (slotRect.left + slotRect.right) / 2 -
          (indicatorRect.left + indicatorRect.right) / 2
        ),
        indicatorEndInset: direction === "rtl"
          ? indicatorRect.left - containerRect.left
          : containerRect.right - indicatorRect.right,
        nativeControlMatchesContainer:
          Math.abs(selectRect.left - containerRect.left) <= 0.5 &&
          Math.abs(selectRect.right - containerRect.right) <= 0.5 &&
          Math.abs(selectRect.top - containerRect.top) <= 0.5 &&
          Math.abs(selectRect.bottom - containerRect.bottom) <= 0.5,
        slotPointerEvents: getComputedStyle(slot).pointerEvents,
        overflowX: selectStyle.overflowX,
        textOverflow: selectStyle.textOverflow,
        whiteSpace: selectStyle.whiteSpace,
        selectedTextWidth: (() => {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) return null;
          context.font = selectStyle.font;
          return context.measureText(select.selectedOptions[0]?.textContent?.trim() || "").width;
        })(),
        availableValueWidth:
          selectRect.width -
          Number.parseFloat(selectStyle.paddingInlineStart) -
          Number.parseFloat(selectStyle.paddingInlineEnd),
        valueRegionToIndicatorGap: direction === "rtl"
          ? selectRect.left + Number.parseFloat(selectStyle.paddingInlineEnd) - indicatorRect.right
          : indicatorRect.left - (selectRect.right - Number.parseFloat(selectStyle.paddingInlineEnd)),
      };
    })()`,
  );
}

async function assertScenarioSemantics(client, sessionId, scenario, viewport) {
  const observed = await inspectScenario(client, sessionId, scenario);
  assert.ok(observed, `${scenario.id}: required DOM target is missing`);
  assert.equal(observed.scenarioId, scenario.id, `${scenario.id}: scenario id drifted`);
  assert.equal(observed.contractId, scenario.contract_id, `${scenario.id}: contract id drifted`);
  assert.equal(observed.contractState, scenario.state, `${scenario.id}: declared state drifted`);
  assert.ok(
    new Set(["unverified", "verified"]).has(observed.scenarioStatus),
    `${scenario.id}: scenario status is missing or invalid`,
  );
  assert.ok(
    observed.scenarioOverflow <= 1,
    `${scenario.id}: scenario overflows horizontally by ${observed.scenarioOverflow}px`,
  );
  assert.ok(observed.scenarioBounds.width > 0, `${scenario.id}: scenario has no rendered width`);
  assert.equal(
    observed.ownerComponent,
    scenario.contract_id,
    `${scenario.id}: runtime component marker drifted`,
  );
  if (scenario.contract_id === "status_message") {
    assert.equal(
      observed.ownerState,
      expectedBaseState(scenario),
      `${scenario.id}: component state drifted`,
    );
  } else {
    assert.equal(
      observed.ownerBaseState,
      expectedBaseState(scenario),
      `${scenario.id}: component base state drifted`,
    );
  }

  const ax = await getAxNode(client, sessionId, semanticSelector(scenario));
  assert.equal(ax.role, expectedAxRole(scenario), `${scenario.id}: AX role drifted`);
  const accessibleName = expectedAccessibleName(scenario);
  if (accessibleName) {
    assert.equal(ax.name, accessibleName, `${scenario.id}: AX name drifted`);
  }

  if (scenario.contract_id === "action_button") {
    const unavailable = scenario.state === "disabled" || scenario.state === "loading";
    assert.equal(observed.tag, "BUTTON", `${scenario.id}: must use a button`);
    assert.equal(observed.type, "button", `${scenario.id}: button type drifted`);
    assert.equal(observed.disabled, unavailable, `${scenario.id}: disabled behavior drifted`);
    assert.equal(
      observed.ariaBusy,
      scenario.state === "loading" ? "true" : null,
      `${scenario.id}: busy state drifted`,
    );
    assertStringIncludes(
      observed.text,
      scenario.state === "loading" ? scenario.fixture.loading_label : scenario.fixture.label,
      `${scenario.id}: visible action label drifted`,
    );
    if (unavailable) {
      assert.equal(ax.properties.disabled, true, `${scenario.id}: AX disabled missing`);
    }
    if (scenario.fixture.description) {
      assertStringIncludes(
        ax.description,
        scenario.fixture.description,
        `${scenario.id}: AX action description missing`,
      );
    }
  }

  if (scenario.contract_id === "action_group") {
    const group = await evaluate(
      client,
      sessionId,
      `(() => {
        const root = document.querySelector(${JSON.stringify(componentSelector(scenario))});
        return root ? {
          ariaDisabled: root.getAttribute("aria-disabled"),
          inert: root.inert,
          labels: [...root.querySelectorAll("button")].map((button) => button.textContent.trim()),
          disabled: [...root.querySelectorAll("button")].map((button) => button.disabled)
        } : null;
      })()`,
    );
    assert.deepEqual(group.labels, [scenario.fixture.primary_label, scenario.fixture.secondary_label]);
    assert.equal(group.inert, false, `${scenario.id}: labeled group must remain in the accessibility tree`);
    assert.equal(
      group.ariaDisabled,
      scenario.state === "disabled" ? "true" : null,
      `${scenario.id}: group disabled semantics drifted`,
    );
    assert.deepEqual(
      group.disabled,
      [scenario.state === "disabled", scenario.state === "disabled"],
      `${scenario.id}: child action availability drifted`,
    );
  }

  if (new Set(["form_field", "text_field", "text_area", "select_field"]).has(scenario.contract_id)) {
    const expectedTag = scenario.contract_id === "text_area"
      ? "TEXTAREA"
      : scenario.contract_id === "select_field"
        ? "SELECT"
        : "INPUT";
    assert.equal(observed.tag, expectedTag, `${scenario.id}: native control tag drifted`);
    if (expectedTag === "INPUT") {
      assert.equal(observed.type, "text", `${scenario.id}: input type drifted`);
    }
    assert.equal(observed.labelText, scenario.fixture.label, `${scenario.id}: native label drifted`);
    assert.equal(observed.value, scenario.fixture.value, `${scenario.id}: fixture value drifted`);
    assert.equal(observed.disabled, scenario.state === "disabled", `${scenario.id}: disabled drifted`);
    assertStringIncludes(observed.describedText, scenario.fixture.help_text, `${scenario.id}: help missing`);
    assertStringIncludes(ax.description, scenario.fixture.help_text, `${scenario.id}: AX help missing`);
    if (scenario.state === "error") {
      assert.equal(observed.ariaInvalid, "true", `${scenario.id}: aria-invalid missing`);
      assertStringIncludes(observed.describedText, scenario.fixture.error_message, `${scenario.id}: error missing`);
      assertStringIncludes(ax.description, scenario.fixture.error_message, `${scenario.id}: AX error missing`);
    } else {
      assert.equal(observed.ariaInvalid, null, `${scenario.id}: non-error marked invalid`);
    }
    if (scenario.state === "disabled") {
      assertStringIncludes(observed.describedText, scenario.fixture.disabled_reason, `${scenario.id}: disabled reason missing`);
      assert.equal(ax.properties.disabled, true, `${scenario.id}: AX disabled missing`);
    }
    if (scenario.contract_id === "select_field") {
      const composition = await inspectSelectComposition(client, sessionId, scenario);
      assert.ok(composition, `${scenario.id}: select composition parts are missing`);
      assert.equal(composition.appearance, "none", `${scenario.id}: browser-owned indicator remains active`);
      const expectedValueText = {
        operations: "Operations",
        policy: "Policy, compliance, and customer care escalation",
        support: "Customer support",
      }[scenario.fixture.value] ?? scenario.fixture.placeholder;
      assert.equal(composition.valueText, expectedValueText, `${scenario.id}: visible selected value drifted`);
      assert.ok(Math.abs(composition.valueStartInset - 16) <= 0.5, `${scenario.id}: selected value start inset drifted`);
      assert.ok(Math.abs(composition.valueEndReserve - 48) <= 0.5, `${scenario.id}: selected value trailing reserve drifted`);
      assert.ok(Math.abs(composition.slotWidth - 48) <= 0.5, `${scenario.id}: trailing indicator slot width drifted`);
      assert.ok(Math.abs(composition.slotEndInset) <= 0.5, `${scenario.id}: trailing indicator slot is not edge anchored`);
      assert.ok(Math.abs(composition.indicatorSize.width - 16) <= 0.5, `${scenario.id}: indicator width drifted`);
      assert.ok(Math.abs(composition.indicatorSize.height - 16) <= 0.5, `${scenario.id}: indicator height drifted`);
      assert.ok(composition.slotCenterDelta <= 0.5, `${scenario.id}: indicator is not centered in its slot`);
      assert.ok(Math.abs(composition.indicatorEndInset - 16) <= 0.5, `${scenario.id}: indicator end inset drifted`);
      assert.equal(composition.nativeControlMatchesContainer, true, `${scenario.id}: native hit target drifted from the visible field`);
      assert.equal(composition.slotPointerEvents, "none", `${scenario.id}: indicator slot blocks the native control`);
      assert.ok(
        ["clip", "hidden"].includes(composition.overflowX),
        `${scenario.id}: selected value overflow is not clipped`,
      );
      assert.equal(composition.textOverflow, "ellipsis", `${scenario.id}: selected value ellipsis is missing`);
      assert.equal(composition.whiteSpace, "nowrap", `${scenario.id}: selected value may wrap into the indicator slot`);
      assert.ok(composition.valueRegionToIndicatorGap >= 15.5, `${scenario.id}: selected value region reaches the indicator`);
      if (scenario.fixture.direction) {
        assert.equal(composition.direction, scenario.fixture.direction, `${scenario.id}: public direction prop did not reach the composition`);
      }
      if (viewport.mobile && scenario.id === "select_field.ready") {
        assert.ok(
          composition.selectedTextWidth > composition.availableValueWidth,
          `${scenario.id}: mobile fixture does not exercise selected-value truncation`,
        );
      }
      if (scenario.id === "select_field.ready") {
        await evaluate(
          client,
          sessionId,
          `(() => {
            const root = document.querySelector(${JSON.stringify(scenarioSelector(scenario.id))});
            const container = root?.querySelector(".jk-select-field__control");
            const select = container?.querySelector("select.jk-select-field");
            if (!container || !select) return false;
            const probe = document.createElement("style");
            probe.id = "jk-select-geometry-probe";
            probe.textContent = ".jk-select-field.jk-select-field--geometry-probe { box-sizing: content-box; width: 50%; min-inline-size: 30rem; margin-inline-start: 2rem; position: relative; inset-inline-start: 1rem; transform: translateX(0.5rem); translate: 0.5rem 0; }";
            document.head.append(probe);
            container.style.maxInlineSize = "15rem";
            select.classList.add("jk-select-field--geometry-probe");
            select.setAttribute("style", "box-sizing: content-box; inline-size: 50%; min-inline-size: 30rem; margin-inline-start: 2rem; position: relative; inset-inline-start: 1rem; transform: translateX(0.5rem); translate: 0.5rem 0");
            return true;
          })()`,
        );
        const guardedComposition = await inspectSelectComposition(client, sessionId, scenario);
        assert.ok(guardedComposition.containerWidth <= 240.5, `${scenario.id}: composition sizing hook was ignored`);
        assert.equal(guardedComposition.nativeControlMatchesContainer, true, `${scenario.id}: select customization detached the native field`);
        assert.ok(Math.abs(guardedComposition.slotEndInset) <= 0.5, `${scenario.id}: select customization detached the indicator slot`);
        assert.ok(Math.abs(guardedComposition.indicatorEndInset - 16) <= 0.5, `${scenario.id}: select customization detached the indicator`);
        await evaluate(
          client,
          sessionId,
          `(() => {
            const root = document.querySelector(${JSON.stringify(scenarioSelector(scenario.id))});
            const container = root?.querySelector(".jk-select-field__control");
            const select = container?.querySelector("select.jk-select-field");
            container?.removeAttribute("style");
            select?.classList.remove("jk-select-field--geometry-probe");
            select?.removeAttribute("style");
            document.querySelector("#jk-select-geometry-probe")?.remove();
          })()`,
        );
      }
      const options = await evaluate(
        client,
        sessionId,
        `(() => {
          const select = document.querySelector(${JSON.stringify(semanticSelector(scenario))});
          return select ? [...select.options].map((option) => ({
            value: option.value,
            label: option.textContent.trim(),
            selected: option.selected
          })) : null;
        })()`,
      );
      assert.equal(options.filter((option) => option.selected).length, 1, `${scenario.id}: native selected option drifted`);
      assert.equal(options.find((option) => option.selected)?.value, scenario.fixture.value, `${scenario.id}: selected value drifted`);
      assert.deepEqual(
        options.slice(1).map((option) => option.value),
        ["operations", "policy", "support"],
        `${scenario.id}: native option values drifted`,
      );
      assert.deepEqual(
        options.slice(1).map((option) => option.label),
        [
          "Operations",
          "Policy, compliance, and customer care escalation",
          "Customer support",
        ],
        `${scenario.id}: visible option labels drifted`,
      );
      assert.deepEqual(
        options[0],
        {
          value: "",
          label: scenario.fixture.placeholder,
          selected: scenario.fixture.value === "",
        },
        `${scenario.id}: visible empty option drifted`,
      );
    }
  }

  if (new Set(["checkbox_group", "radio_group"]).has(scenario.contract_id)) {
    const type = scenario.contract_id === "checkbox_group" ? "checkbox" : "radio";
    const group = await evaluate(
      client,
      sessionId,
      `(() => {
        const fieldset = document.querySelector(${JSON.stringify(componentSelector(scenario))});
        if (!fieldset) return null;
        return {
          tag: fieldset.tagName,
          legend: fieldset.querySelector("legend")?.textContent.trim() || "",
          describedText: (fieldset.getAttribute("aria-describedby") || "").split(/\\s+/).filter(Boolean)
            .map((id) => document.getElementById(id)?.textContent?.replace(/\\s+/g, " ").trim() || "")
            .filter(Boolean).join(" "),
          invalid: fieldset.getAttribute("aria-invalid"),
          disabled: fieldset.disabled,
          controls: [...fieldset.querySelectorAll(${JSON.stringify(`input[type='${type}']`)})].map((control) => ({
            name: [...control.labels].map((label) => label.textContent.replace(/\\s+/g, " ").trim()).join(" "),
            value: control.value,
            checked: control.checked,
            disabled: control.disabled
          }))
        };
      })()`,
    );
    assert.equal(group.tag, "FIELDSET", `${scenario.id}: group must use fieldset`);
    assert.equal(group.legend, scenario.fixture.legend, `${scenario.id}: legend drifted`);
    assert.equal(group.controls.length, scenario.contract_id === "checkbox_group" ? 3 : 2);
    assertStringIncludes(group.describedText, scenario.fixture.help_text, `${scenario.id}: group help missing`);
    assertStringIncludes(ax.description, scenario.fixture.help_text, `${scenario.id}: AX group help missing`);
    assert.equal(group.disabled, scenario.state === "disabled", `${scenario.id}: fieldset disabled drifted`);
    assert.equal(
      group.controls.every((control) => control.disabled),
      scenario.state === "disabled",
      `${scenario.id}: native option disabled state drifted`,
    );
    if (scenario.contract_id === "checkbox_group") {
      assert.deepEqual(
        group.controls.filter((control) => control.checked).map((control) => control.value),
        scenario.fixture.values,
        `${scenario.id}: checkbox group value drifted`,
      );
    } else {
      assert.deepEqual(
        group.controls.filter((control) => control.checked).map((control) => control.value),
        scenario.fixture.value ? [scenario.fixture.value] : [],
        `${scenario.id}: radio group value drifted`,
      );
    }
    if (scenario.state === "error") {
      assert.equal(group.invalid, "true", `${scenario.id}: group invalid semantics missing`);
      assertStringIncludes(group.describedText, scenario.fixture.error_message, `${scenario.id}: group error missing`);
    }
  }

  if (scenario.contract_id === "toggle") {
    assert.equal(observed.tag, "BUTTON", `${scenario.id}: toggle must use button`);
    assert.equal(observed.role, "switch", `${scenario.id}: switch role drifted`);
    assert.equal(observed.ariaChecked, String(Boolean(scenario.fixture.checked)), `${scenario.id}: checked drifted`);
    assert.equal(String(ax.properties.checked), String(Boolean(scenario.fixture.checked)), `${scenario.id}: AX checked drifted`);
    assert.equal(observed.disabled, scenario.state === "disabled", `${scenario.id}: disabled drifted`);
    assertStringIncludes(observed.describedText, scenario.fixture.description, `${scenario.id}: description missing`);
    assertStringIncludes(ax.description, scenario.fixture.description, `${scenario.id}: AX description missing`);
  }

  if (scenario.contract_id === "tabs") {
    const tabs = await evaluate(
      client,
      sessionId,
      `(() => {
        const root = document.querySelector(${JSON.stringify(componentSelector(scenario))});
        if (!root) return null;
        const tabs = [...root.querySelectorAll("[role='tab']")];
        const panels = [...root.querySelectorAll("[role='tabpanel']")];
        return {
          wrapperTabIndex: root.getAttribute("tabindex"),
          tabs: tabs.map((tab) => ({
            name: tab.textContent.trim(),
            selected: tab.getAttribute("aria-selected"),
            disabled: tab.disabled,
            tabIndex: tab.tabIndex
          })),
          visiblePanels: panels.filter((panel) => !panel.hidden).map((panel) => panel.textContent.trim())
        };
      })()`,
    );
    assert.equal(tabs.wrapperTabIndex, null, `${scenario.id}: component wrapper must not be a tab stop`);
    assert.equal(tabs.tabs.length, 3, `${scenario.id}: tab count drifted`);
    assert.equal(tabs.tabs.filter((tab) => tab.selected === "true").length, 1, `${scenario.id}: selected tab count drifted`);
    assert.equal(tabs.visiblePanels.length, 1, `${scenario.id}: visible panel count drifted`);
    assert.equal(
      tabs.tabs.every((tab) => tab.disabled),
      scenario.state === "disabled",
      `${scenario.id}: disabled tab state drifted`,
    );
    assert.equal(observed.role, "tablist", `${scenario.id}: tablist role drifted`);
  }

  if (scenario.contract_id === "menu") {
    const menu = await evaluate(
      client,
      sessionId,
      `(() => {
        const root = document.querySelector(${JSON.stringify(componentSelector(scenario))});
        const popup = root?.querySelector("[role='menu']");
        return root ? {
          wrapperTabIndex: root.getAttribute("tabindex"),
          popup: Boolean(popup),
          popupName: popup?.getAttribute("aria-label") || "",
          items: popup ? [...popup.querySelectorAll("[role='menuitem']")].map((item) => item.textContent.trim()) : [],
          disabledReason: root.querySelector(".jk-menu__disabled-reason")?.textContent.trim() || ""
        } : null;
      })()`,
    );
    assert.equal(menu.wrapperTabIndex, null, `${scenario.id}: menu wrapper must not be a tab stop`);
    assert.equal(observed.ariaHasPopup, "menu", `${scenario.id}: aria-haspopup drifted`);
    assert.equal(
      observed.ariaExpanded,
      scenario.fixture.default_open ? "true" : "false",
      `${scenario.id}: initial expanded state drifted`,
    );
    assert.equal(observed.disabled, scenario.state === "disabled", `${scenario.id}: trigger disabled drifted`);
    assert.equal(menu.popup, Boolean(scenario.fixture.default_open), `${scenario.id}: initial open state drifted`);
    if (menu.popup) {
      assert.equal(menu.popupName, scenario.fixture.menu_label, `${scenario.id}: menu name drifted`);
      assert.deepEqual(menu.items, ["Open receipt", "Assign policy review", "Return for evidence"]);
      assert.equal(
        await evaluate(
          client,
          sessionId,
          `document.activeElement === document.querySelector(${JSON.stringify(
            withinScenario(scenario, "[role='menuitem']:first-of-type"),
          )})`,
        ),
        true,
        `${scenario.id}: an initially open menu did not focus its first item`,
      );
    }
    if (scenario.state === "disabled") {
      assert.equal(menu.disabledReason, scenario.fixture.disabled_reason, `${scenario.id}: disabled reason drifted`);
      assertStringIncludes(ax.description, scenario.fixture.disabled_reason, `${scenario.id}: AX disabled reason missing`);
    }
  }

  if (scenario.contract_id === "dialog") {
    const dialog = await evaluate(
      client,
      sessionId,
      `(() => {
        const dialog = document.querySelector(${JSON.stringify(componentSelector(scenario))});
        return dialog ? {
          tag: dialog.tagName,
          open: dialog.open,
          dataOpen: dialog.getAttribute("data-jk-open")
        } : null;
      })()`,
    );
    assert.deepEqual(dialog, { tag: "DIALOG", open: false, dataOpen: "false" }, `${scenario.id}: dialog must start closed`);
  }

  if (scenario.contract_id === "alert") {
    assertStringIncludes(observed.text, scenario.fixture.title, `${scenario.id}: alert title missing`);
    assertStringIncludes(observed.text, scenario.fixture.message, `${scenario.id}: alert message missing`);
    const actionAx = await getAxNode(client, sessionId, focusTargetSelector(scenario));
    assert.equal(actionAx.role, "button", `${scenario.id}: alert action role drifted`);
    assert.equal(actionAx.name, scenario.fixture.action_label, `${scenario.id}: alert action name drifted`);
  }

  if (scenario.contract_id === "table") {
    const table = await evaluate(
      client,
      sessionId,
      `(() => {
        const table = document.querySelector(${JSON.stringify(semanticSelector(scenario))});
        const state = table?.querySelector("[data-jk-table-state]");
        return table ? {
          caption: table.querySelector("caption")?.textContent.trim() || "",
          busy: table.getAttribute("aria-busy"),
          invalid: table.getAttribute("aria-invalid"),
          stateRole: state?.getAttribute("role") || null,
          stateText: state?.textContent.trim() || "",
          rowCount: table.querySelectorAll("tbody tr").length
        } : null;
      })()`,
    );
    assert.equal(table.caption, scenario.fixture.caption, `${scenario.id}: caption drifted`);
    assert.equal(table.busy, scenario.state === "loading" ? "true" : null, `${scenario.id}: table busy drifted`);
    assert.equal(table.invalid, scenario.state === "error" ? "true" : null, `${scenario.id}: table invalid drifted`);
    if (new Set(["empty", "loading", "error"]).has(scenario.state)) {
      assert.equal(table.stateRole, scenario.state === "error" ? "alert" : "status", `${scenario.id}: state role drifted`);
      assert.equal(table.stateText, scenario.fixture.message, `${scenario.id}: state message drifted`);
    } else {
      assert.equal(table.rowCount, 2, `${scenario.id}: data row count drifted`);
    }
  }

  if (scenario.contract_id === "panel") {
    assertStringIncludes(observed.text, scenario.fixture.heading, `${scenario.id}: heading missing`);
    assertStringIncludes(observed.text, scenario.fixture.message, `${scenario.id}: message missing`);
    assert.equal(observed.ariaBusy, scenario.state === "loading" ? "true" : null, `${scenario.id}: panel busy drifted`);
    assert.equal(observed.ariaInvalid, scenario.state === "error" ? "true" : null, `${scenario.id}: panel invalid drifted`);
  }

  if (scenario.contract_id === "card") {
    const card = await evaluate(
      client,
      sessionId,
      `(() => {
        const root = document.querySelector(${JSON.stringify(componentSelector(scenario))});
        const action = root?.querySelector(".jk-card__action");
        return root ? {
          actionType: root.getAttribute("data-jk-action-type"),
          actionTag: action?.tagName || null,
          actionText: action?.textContent.trim() || "",
          actionDisabled: action?.disabled ?? action?.getAttribute("aria-disabled") ?? null,
          wrapperTabIndex: root.getAttribute("tabindex")
        } : null;
      })()`,
    );
    assert.equal(card.wrapperTabIndex, null, `${scenario.id}: card wrapper must remain noninteractive`);
    assert.equal(card.actionText, scenario.fixture.action_label, `${scenario.id}: action label drifted`);
    assert.notEqual(card.actionType, "none", `${scenario.id}: interactive card state must declare an action type`);
    if (scenario.state === "disabled") {
      assert.equal(card.actionTag, "SPAN", `${scenario.id}: disabled link must be noninteractive`);
      assert.equal(card.actionDisabled, "true", `${scenario.id}: disabled action semantics missing`);
    }
  }

  if (scenario.contract_id === "status_message") {
    const error = scenario.state === "error";
    assert.equal(observed.role, error ? "alert" : "status", `${scenario.id}: live-region role drifted`);
    assert.equal(observed.ariaLive, error ? "assertive" : "polite", `${scenario.id}: live politeness drifted`);
    assert.equal(observed.ariaAtomic, "true", `${scenario.id}: live region must be atomic`);
    assert.equal(observed.ariaBusy, scenario.state === "loading" ? "true" : null, `${scenario.id}: status busy drifted`);
    assertStringIncludes(observed.text, scenario.fixture.label, `${scenario.id}: status label missing`);
    assertStringIncludes(observed.text, scenario.fixture.message, `${scenario.id}: status message missing`);
    assert.equal(ax.properties.live, error ? "assertive" : "polite", `${scenario.id}: AX live politeness drifted`);
  }

  return { observed, ax };
}

async function runAxeForSelector(client, sessionId, selector, label) {
  const result = await evaluate(
    client,
    sessionId,
    `(async () => {
      const root = document.querySelector(${JSON.stringify(selector)});
      if (!root) throw new Error(${JSON.stringify("Missing axe scope")});
      const result = await globalThis.axe.run(root, {
        reporter: "v2",
        resultTypes: ["violations", "incomplete"]
      });
      const checksFor = (node) => [
        ...(node.any ?? []),
        ...(node.all ?? []),
        ...(node.none ?? [])
      ];
      const simplifyNode = (node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary || "",
        geometry: (() => {
          const selector = Array.isArray(node.target) ? node.target.at(-1) : node.target;
          let element = null;
          try {
            element = typeof selector === "string" ? document.querySelector(selector) : null;
          } catch {
            return null;
          }
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          return {
            rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            color: style.color,
            backgroundColor: style.backgroundColor,
            stackAtCenter: document.elementsFromPoint(x, y).slice(0, 8).map((candidate) => ({
              tag: candidate.tagName,
              id: candidate.id || null,
              className: typeof candidate.className === "string" ? candidate.className : ""
            }))
          };
        })(),
        checks: checksFor(node).map((check) => ({
          id: check.id,
          message: check.message,
          data: check.data ?? null,
          relatedNodes: (check.relatedNodes ?? []).map((related) => ({
            html: related.html ?? null,
            target: related.target ?? []
          }))
        }))
      });
      const simplify = (entry) => ({
        id: entry.id,
        impact: entry.impact,
        help: entry.help,
        description: entry.description,
        nodes: entry.nodes.map(simplifyNode)
      });

      const describeElement = (element) => {
        const id = element.id ? "#" + element.id : "";
        const classes = typeof element.className === "string" && element.className.trim()
          ? "." + element.className.trim().split(/\\s+/u).join(".")
          : "";
        return element.tagName.toLowerCase() + id + classes;
      };
      const parseColor = (value) => {
        const channels = String(value).match(/[0-9.]+/gu)?.map(Number) ?? [];
        if (channels.length < 3 || channels.slice(0, 3).some((channel) => !Number.isFinite(channel))) {
          return null;
        }
        const alpha = channels.length >= 4 ? channels[3] : 1;
        if (!Number.isFinite(alpha)) return null;
        return { red: channels[0], green: channels[1], blue: channels[2], alpha };
      };
      const relativeLuminance = ({ red, green, blue }) => {
        const channel = (value) => {
          const normalized = value / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
      };
      const contrastRatio = (foreground, background) => {
        const foregroundLuminance = relativeLuminance(foreground);
        const backgroundLuminance = relativeLuminance(background);
        const lighter = Math.max(foregroundLuminance, backgroundLuminance);
        const darker = Math.min(foregroundLuminance, backgroundLuminance);
        return (lighter + 0.05) / (darker + 0.05);
      };
      const rejectResolution = (reason) => ({ resolved: false, reason });
      const resolveKnownNativeDialogFalseIncomplete = (entry, node) => {
        if (entry.id !== "color-contrast") return rejectResolution("rule_not_color_contrast");
        const checks = checksFor(node);
        if (
          checks.length === 0 ||
          checks.some((check) =>
            check?.data?.messageKey !== "elmPartiallyObscuring" ||
            (check.relatedNodes ?? []).length !== 0
          )
        ) {
          return rejectResolution("check_not_exact_elm_partially_obscuring");
        }

        const targetSelector = Array.isArray(node.target) ? node.target.at(-1) : node.target;
        if (typeof targetSelector !== "string") {
          return rejectResolution("target_selector_missing");
        }
        let element = null;
        try {
          element = document.querySelector(targetSelector);
        } catch {
          return rejectResolution("target_selector_invalid");
        }
        if (!element) return rejectResolution("target_element_missing");

        const isTitle = element.matches(".jk-dialog__title");
        const isBodyParagraph = element.matches(".jk-dialog__body > p");
        if (!isTitle && !isBodyParagraph) {
          return rejectResolution("target_not_exact_dialog_title_or_body_paragraph");
        }
        const dialog = element.closest("dialog.jk-dialog[data-jk-component='dialog'][open]");
        if (!dialog || dialog.open !== true) {
          return rejectResolution("target_not_in_open_native_component_dialog");
        }
        const immediateContainer = isTitle
          ? element.closest(".jk-dialog__header")
          : element.parentElement?.matches(".jk-dialog__body")
            ? element.parentElement
            : null;
        if (!immediateContainer || immediateContainer.parentElement !== dialog) {
          return rejectResolution("dialog_descendant_shape_drifted");
        }

        const range = document.createRange();
        range.selectNodeContents(element);
        const textRects = [...range.getClientRects()].filter(
          (rect) => rect.width >= 1 && rect.height >= 1,
        );
        range.detach();
        if (textRects.length === 0) return rejectResolution("no_live_text_rects");

        const expectedStack = [element, immediateContainer, dialog];
        const expectedSignature = expectedStack.map(describeElement);
        const liveTextRectStacks = [];
        for (const rect of textRects) {
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const stack = document.elementsFromPoint(x, y);
          const dialogIndex = stack.indexOf(dialog);
          if (dialogIndex < 0) {
            return rejectResolution("live_text_rect_stack_does_not_reach_dialog");
          }
          const throughDialog = stack.slice(0, dialogIndex + 1);
          if (
            throughDialog.length !== expectedStack.length ||
            throughDialog.some((candidate, index) => candidate !== expectedStack[index])
          ) {
            return rejectResolution("foreign_live_element_before_dialog");
          }
          liveTextRectStacks.push({
            rect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            },
            point: { x, y },
            stack_through_dialog: throughDialog.map(describeElement),
          });
        }
        if (
          liveTextRectStacks.some(
            (receipt) => JSON.stringify(receipt.stack_through_dialog) !== JSON.stringify(expectedSignature),
          )
        ) {
          return rejectResolution("live_text_rect_stacks_are_not_identical");
        }

        const foregroundValue = getComputedStyle(element).color;
        const foreground = parseColor(foregroundValue);
        if (!foreground || foreground.alpha < 0.999) {
          return rejectResolution("foreground_not_parseable_and_opaque");
        }
        let opaqueAncestor = element;
        let backgroundValue = null;
        let background = null;
        while (opaqueAncestor) {
          backgroundValue = getComputedStyle(opaqueAncestor).backgroundColor;
          background = parseColor(backgroundValue);
          if (background && background.alpha >= 0.999) break;
          opaqueAncestor = opaqueAncestor.parentElement;
        }
        if (!opaqueAncestor || !background || background.alpha < 0.999) {
          return rejectResolution("first_opaque_ancestor_not_found");
        }

        const requiredRatios = [...new Set(checks.map((check) =>
          Number.parseFloat(String(check.data?.expectedContrastRatio ?? "")),
        ))];
        if (requiredRatios.length !== 1 || !Number.isFinite(requiredRatios[0])) {
          return rejectResolution("expected_contrast_ratio_missing_or_ambiguous");
        }
        const observedRatio = contrastRatio(foreground, background);
        if (observedRatio + 0.0001 < requiredRatios[0]) {
          return rejectResolution("independent_contrast_check_failed");
        }

        return {
          resolved: true,
          resolution: {
            status: "resolved_known_axe_4_13_native_dialog_virtual_stack_false_incomplete",
            rule_id: entry.id,
            message_key: "elmPartiallyObscuring",
            target: node.target,
            target_kind: isTitle ? "dialog_title" : "dialog_body_paragraph",
            dialog: describeElement(dialog),
            text_rect_count: liveTextRectStacks.length,
            live_text_rect_stacks: liveTextRectStacks,
            foreground: foregroundValue,
            first_opaque_ancestor: describeElement(opaqueAncestor),
            background: backgroundValue,
            contrast_ratio: observedRatio,
            required_contrast_ratio: requiredRatios[0],
          }
        };
      };

      const resolved = [];
      const unresolved = [];
      for (const entry of result.incomplete) {
        for (const node of entry.nodes) {
          const resolution = resolveKnownNativeDialogFalseIncomplete(entry, node);
          if (resolution.resolved) {
            resolved.push({
              ...resolution.resolution,
              raw_node: simplifyNode(node),
            });
          } else {
            unresolved.push({
              rule_id: entry.id,
              reason: resolution.reason,
              raw_node: simplifyNode(node),
            });
          }
        }
      }
      return {
        violations: result.violations.map(simplify),
        incomplete: result.incomplete.map(simplify),
        violations_node_count: result.violations.reduce(
          (count, entry) => count + entry.nodes.length,
          0,
        ),
        incomplete_node_count: result.incomplete.reduce(
          (count, entry) => count + entry.nodes.length,
          0,
        ),
        resolved,
        unresolved,
      };
    })()`,
  );
  const receipt = {
    label,
    count_unit: "axe_result_node",
    violations_raw: result.violations_node_count,
    incomplete_raw: result.incomplete_node_count,
    incomplete_resolved: result.resolved.length,
    incomplete_unresolved: result.unresolved.length,
    raw_violations: result.violations,
    raw_incomplete: result.incomplete,
    resolved_findings: result.resolved,
    unresolved_findings: result.unresolved,
  };
  AXE_SCAN_RECEIPTS.push(receipt);
  assert.equal(
    receipt.violations_raw,
    0,
    `${label}: axe violations: ${JSON.stringify(receipt.raw_violations)}`,
  );
  assert.equal(
    receipt.incomplete_unresolved,
    0,
    `${label}: unresolved axe incomplete: ${JSON.stringify(receipt.unresolved_findings)}`,
  );
  assert.equal(
    receipt.incomplete_raw,
    receipt.incomplete_resolved,
    `${label}: axe incomplete accounting drifted`,
  );
  return {
    count_unit: receipt.count_unit,
    violations_raw: receipt.violations_raw,
    incomplete_raw: receipt.incomplete_raw,
    incomplete_resolved: receipt.incomplete_resolved,
    incomplete_unresolved: receipt.incomplete_unresolved,
  };
}

function summarizeAxeScanReceipts(receipts = AXE_SCAN_RECEIPTS) {
  return {
    count_unit: "axe_result_node",
    scan_count: receipts.length,
    violations_raw: receipts.reduce((count, receipt) => count + receipt.violations_raw, 0),
    incomplete_raw: receipts.reduce((count, receipt) => count + receipt.incomplete_raw, 0),
    incomplete_resolved: receipts.reduce(
      (count, receipt) => count + receipt.incomplete_resolved,
      0,
    ),
    incomplete_unresolved: receipts.reduce(
      (count, receipt) => count + receipt.incomplete_unresolved,
      0,
    ),
  };
}

function runAxeForScenario(client, sessionId, scenario, presentationLabel) {
  return runAxeForSelector(
    client,
    sessionId,
    withinScenario(scenario, ".jk-component-scenario__control"),
    `${scenario.id} at ${presentationLabel}`,
  );
}

async function assertFocusVisible(client, sessionId, scenario, selector = focusTargetSelector(scenario)) {
  await tabUntil(client, sessionId, selector, { maxSteps: 240 });
  const result = await evaluate(
    client,
    sessionId,
    `(() => {
      const target = document.querySelector(${JSON.stringify(selector)});
      const owner = document.querySelector(${JSON.stringify(componentSelector(scenario))});
      if (!target || !owner) return null;
      const style = getComputedStyle(target);
      return {
        active: document.activeElement === target,
        focusVisible: target.matches(":focus-visible"),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        ownerFocusVisible: owner.getAttribute("data-jk-focus-visible"),
        ownerState: owner.getAttribute("data-jk-state"),
        wrapperIsTarget: owner === target,
        actualControl: target.matches("button, a[href], input, select, textarea, [role='switch'], [role='tab'], [role='menuitem']"),
        declaredState: target.closest("[data-scenario-id]")?.getAttribute("data-contract-state") || null
      };
    })()`,
  );
  assert.ok(result, `${scenario.id}: focus target is missing`);
  assert.equal(result.active, true, `${scenario.id}: Tab did not focus the actual control`);
  assert.equal(result.actualControl, true, `${scenario.id}: focus target is not an actual control`);
  assert.equal(result.focusVisible, true, `${scenario.id}: actual control is not :focus-visible`);
  assert.notEqual(result.outlineStyle, "none", `${scenario.id}: focus outline missing`);
  assert.ok(Number.parseFloat(result.outlineWidth) >= 2, `${scenario.id}: focus outline is thinner than 2px`);
  assert.notEqual(result.outlineColor, "rgba(0, 0, 0, 0)", `${scenario.id}: focus outline transparent`);
  assert.equal(result.ownerFocusVisible, "true", `${scenario.id}: owner focus-visible data missing`);
  assert.equal(result.ownerState, "focus-visible", `${scenario.id}: owner state did not become focus-visible`);
  assert.equal(result.declaredState, "focus-visible", `${scenario.id}: fixture is not focus-visible`);
}

async function scenarioInteractionCount(client, sessionId, scenarioId) {
  return evaluate(
    client,
    sessionId,
    `Number(document.querySelector(${JSON.stringify(
      `${scenarioSelector(scenarioId)} [data-scenario-interaction-count]`,
    )})?.getAttribute("data-scenario-interaction-count") || 0)`,
  );
}

async function waitForScenarioInteractionCount(client, sessionId, scenarioId, expected) {
  await waitForExpression(
    client,
    sessionId,
    `Number(document.querySelector(${JSON.stringify(
      `${scenarioSelector(scenarioId)} [data-scenario-interaction-count]`,
    )})?.getAttribute("data-scenario-interaction-count") || 0) === ${expected}`,
    { label: `${scenarioId} interaction count ${expected}` },
  );
}

function delay(milliseconds = 100) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function assertTextInteraction(client, sessionId, scenario, { expectedUpdate }) {
  const selector = focusTargetSelector(scenario);
  await tabUntil(client, sessionId, selector, { maxSteps: 240 });
  const before = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(selector)})?.value`,
  );
  await insertText(client, sessionId, "X");
  await waitForScenarioInteractionCount(client, sessionId, scenario.id, 1);
  if (expectedUpdate) {
    await waitForExpression(
      client,
      sessionId,
      `(() => {
        const value = document.querySelector(${JSON.stringify(selector)})?.value;
        return value !== ${JSON.stringify(before)} && value?.includes("X") === true;
      })()`,
      { label: `${scenario.id} text update` },
    );
  } else {
    await delay();
    assert.equal(
      await evaluate(
        client,
        sessionId,
        `document.querySelector(${JSON.stringify(selector)})?.value`,
      ),
      before,
      `${scenario.id}: controlled parent refusal was not preserved`,
    );
  }
}

async function assertActionInteractions(client, sessionId, scenarioById) {
  const ready = scenarioById.get("action_button.ready");
  await pointerActivate(client, sessionId, semanticSelector(ready));
  await waitForScenarioInteractionCount(client, sessionId, ready.id, 1);
  await waitForExpression(
    client,
    sessionId,
    `(() => {
      const button = document.querySelector(${JSON.stringify(semanticSelector(ready))});
      return button?.disabled === true &&
        button.getAttribute("aria-busy") === "true" &&
        button.textContent.includes("Approving refund");
    })()`,
    { label: "action_button.ready async loading transition" },
  );
  await pointerActivate(client, sessionId, semanticSelector(ready));
  await delay();
  assert.equal(
    await scenarioInteractionCount(client, sessionId, ready.id),
    1,
    "loading action repeated",
  );

  for (const id of ["action_button.disabled", "action_button.loading"]) {
    const scenario = scenarioById.get(id);
    await pointerActivate(client, sessionId, semanticSelector(scenario));
    await delay();
    assert.equal(
      await scenarioInteractionCount(client, sessionId, id),
      0,
      `${id}: unavailable action dispatched`,
    );
  }

  const focus = scenarioById.get("action_button.focus-visible");
  await assertFocusVisible(client, sessionId, focus);
  await pressKey(client, sessionId, "Enter");
  await waitForScenarioInteractionCount(client, sessionId, focus.id, 1);
}

async function assertFieldInteractions(client, sessionId, scenarioById) {
  for (const id of [
    "form_field.focus-visible",
    "text_field.focus-visible",
    "text_area.focus-visible",
  ]) {
    const scenario = scenarioById.get(id);
    await assertFocusVisible(client, sessionId, scenario);
    const selector = focusTargetSelector(scenario);
    const before = await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(selector)})?.value`,
    );
    await insertText(client, sessionId, "X");
    await waitForScenarioInteractionCount(client, sessionId, id, 1);
    await waitForExpression(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(selector)})?.value !== ${JSON.stringify(before)}`,
      { label: `${id} native text input` },
    );
  }
  await assertTextInteraction(
    client,
    sessionId,
    scenarioById.get("text_field.ready"),
    { expectedUpdate: true },
  );
  await assertTextInteraction(
    client,
    sessionId,
    scenarioById.get("text_field.error"),
    { expectedUpdate: false },
  );
  await assertTextInteraction(
    client,
    sessionId,
    scenarioById.get("text_area.ready"),
    { expectedUpdate: true },
  );
  await assertTextInteraction(
    client,
    sessionId,
    scenarioById.get("text_area.error"),
    { expectedUpdate: false },
  );

  for (const id of [
    "form_field.disabled",
    "text_field.disabled",
    "text_area.disabled",
  ]) {
    const scenario = scenarioById.get(id);
    assert.equal(
      await evaluate(
        client,
        sessionId,
        `document.querySelector(${JSON.stringify(semanticSelector(scenario))})?.disabled`,
      ),
      true,
      `${id}: native disabled state missing`,
    );
    assert.equal(await scenarioInteractionCount(client, sessionId, id), 0);
  }
}

async function assertSelectInteractions(client, sessionId, scenarioById) {
  const ready = scenarioById.get("select_field.ready");
  await tabUntil(client, sessionId, semanticSelector(ready), { maxSteps: 240 });
  const readyBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(semanticSelector(ready))})?.value`,
  );
  await pressKey(client, sessionId, "c");
  await waitForScenarioInteractionCount(client, sessionId, ready.id, 1);
  await waitForExpression(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(semanticSelector(ready))})?.value !== ${JSON.stringify(readyBefore)}`,
    { label: "select_field.ready controlled native-select update" },
  );

  const rejected = scenarioById.get("select_field.error");
  await tabUntil(client, sessionId, semanticSelector(rejected), { maxSteps: 240 });
  const rejectedBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(semanticSelector(rejected))})?.value`,
  );
  await pressKey(client, sessionId, "o");
  await waitForScenarioInteractionCount(client, sessionId, rejected.id, 1);
  await delay();
  assert.equal(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(semanticSelector(rejected))})?.value`,
    ),
    rejectedBefore,
    "select_field.error: controlled parent refusal was not preserved",
  );

  const focus = scenarioById.get("select_field.focus-visible");
  await assertFocusVisible(client, sessionId, focus);
  const focusBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(semanticSelector(focus))})?.value`,
  );
  await pressKey(client, sessionId, "p");
  await waitForScenarioInteractionCount(client, sessionId, focus.id, 1);
  assert.notEqual(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(semanticSelector(focus))})?.value`,
    ),
    focusBefore,
    "select_field.focus-visible: keyboard selection did not change",
  );

  const disabled = scenarioById.get("select_field.disabled");
  assert.equal(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(semanticSelector(disabled))})?.disabled`,
    ),
    true,
  );
  assert.equal(await scenarioInteractionCount(client, sessionId, disabled.id), 0);
}

async function assertChoiceInteractions(client, sessionId, scenarioById) {
  const checkboxReady = scenarioById.get("checkbox_group.ready");
  const readyBox = withinScenario(checkboxReady, "input[type='checkbox']:first-of-type");
  const readyBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(readyBox)})?.checked`,
  );
  await pointerActivate(client, sessionId, readyBox);
  await waitForScenarioInteractionCount(client, sessionId, checkboxReady.id, 1);
  assert.notEqual(
    await evaluate(client, sessionId, `document.querySelector(${JSON.stringify(readyBox)})?.checked`),
    readyBefore,
  );

  const checkboxError = scenarioById.get("checkbox_group.error");
  const errorBox = withinScenario(checkboxError, "input[type='checkbox']:first-of-type");
  const errorBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(errorBox)})?.checked`,
  );
  await pointerActivate(client, sessionId, errorBox);
  await waitForScenarioInteractionCount(client, sessionId, checkboxError.id, 1);
  await delay();
  assert.equal(
    await evaluate(client, sessionId, `document.querySelector(${JSON.stringify(errorBox)})?.checked`),
    errorBefore,
    "checkbox controlled refusal failed",
  );

  const checkboxFocus = scenarioById.get("checkbox_group.focus-visible");
  await assertFocusVisible(client, sessionId, checkboxFocus);
  const focusBox = focusTargetSelector(checkboxFocus);
  const focusBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(focusBox)})?.checked`,
  );
  await pressKey(client, sessionId, "Space");
  await waitForScenarioInteractionCount(client, sessionId, checkboxFocus.id, 1);
  assert.notEqual(
    await evaluate(client, sessionId, `document.querySelector(${JSON.stringify(focusBox)})?.checked`),
    focusBefore,
  );

  const checkboxDisabled = scenarioById.get("checkbox_group.disabled");
  const disabledBox = withinScenario(checkboxDisabled, "input[type='checkbox']:first-of-type");
  const disabledBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(disabledBox)})?.checked`,
  );
  await pointerActivate(client, sessionId, disabledBox);
  await delay();
  assert.equal(await scenarioInteractionCount(client, sessionId, checkboxDisabled.id), 0);
  assert.equal(
    await evaluate(client, sessionId, `document.querySelector(${JSON.stringify(disabledBox)})?.checked`),
    disabledBefore,
  );

  const radioEmpty = scenarioById.get("radio_group.empty");
  const emptyRadio = withinScenario(radioEmpty, "input[type='radio']:first-of-type");
  await pointerActivate(client, sessionId, emptyRadio);
  await waitForScenarioInteractionCount(client, sessionId, radioEmpty.id, 1);
  assert.equal(
    await evaluate(client, sessionId, `document.querySelector(${JSON.stringify(emptyRadio)})?.checked`),
    true,
  );

  const radioError = scenarioById.get("radio_group.error");
  const errorRadio = withinScenario(radioError, "input[type='radio']:first-of-type");
  await pointerActivate(client, sessionId, errorRadio);
  await waitForScenarioInteractionCount(client, sessionId, radioError.id, 1);
  await delay();
  assert.equal(
    await evaluate(client, sessionId, `document.querySelector(${JSON.stringify(errorRadio)})?.checked`),
    false,
    "radio controlled refusal failed",
  );

  const radioFocus = scenarioById.get("radio_group.focus-visible");
  await assertFocusVisible(client, sessionId, radioFocus);
  const selectedBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(scenarioSelector(radioFocus.id))})?.querySelector("input[type='radio']:checked")?.value`,
  );
  await pressKey(client, sessionId, "ArrowLeft");
  await waitForScenarioInteractionCount(client, sessionId, radioFocus.id, 1);
  assert.notEqual(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(scenarioSelector(radioFocus.id))})?.querySelector("input[type='radio']:checked")?.value`,
    ),
    selectedBefore,
    "radio keyboard interaction did not change selection",
  );
}

async function assertToggleAndStatusInteractions(client, sessionId, scenarioById) {
  const toggleReady = scenarioById.get("toggle.ready");
  const toggleReadySelector = semanticSelector(toggleReady);
  const checkedBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(toggleReadySelector)})?.getAttribute("aria-checked")`,
  );
  await pointerActivate(client, sessionId, toggleReadySelector);
  await waitForScenarioInteractionCount(client, sessionId, toggleReady.id, 1);
  assert.notEqual(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(toggleReadySelector)})?.getAttribute("aria-checked")`,
    ),
    checkedBefore,
    "toggle.ready: controlled update did not change aria-checked",
  );

  const toggleDisabled = scenarioById.get("toggle.disabled");
  await pointerActivate(client, sessionId, semanticSelector(toggleDisabled));
  await delay();
  assert.equal(
    await scenarioInteractionCount(client, sessionId, toggleDisabled.id),
    0,
    "toggle.disabled: pointer activation dispatched",
  );

  const toggleFocus = scenarioById.get("toggle.focus-visible");
  await assertFocusVisible(client, sessionId, toggleFocus);
  const focusCheckedBefore = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(semanticSelector(toggleFocus))})?.getAttribute("aria-checked")`,
  );
  await pressKey(client, sessionId, "Space");
  await waitForScenarioInteractionCount(client, sessionId, toggleFocus.id, 1);
  assert.notEqual(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(semanticSelector(toggleFocus))})?.getAttribute("aria-checked")`,
    ),
    focusCheckedBefore,
    "toggle.focus-visible: Space did not change the switch value",
  );

  const statusReady = scenarioById.get("status_message.ready");
  await pointerActivate(client, sessionId, focusTargetSelector(statusReady));
  await waitForScenarioInteractionCount(client, sessionId, statusReady.id, 1);
  await waitForExpression(
    client,
    sessionId,
    `(() => {
      const root = document.querySelector(${JSON.stringify(componentSelector(statusReady))});
      return root?.getAttribute("data-jk-state") === "loading" &&
        root.getAttribute("aria-busy") === "true" &&
        root.textContent.includes("Saving decision") &&
        root.textContent.includes("Recording the refund decision and receipt") &&
        !root.querySelector("[data-scenario-status-action='true']");
    })()`,
    { label: "status_message.ready async loading transition" },
  );

  const statusError = scenarioById.get("status_message.error");
  await tabUntil(client, sessionId, focusTargetSelector(statusError), { maxSteps: 240 });
  await pressKey(client, sessionId, "Enter");
  await waitForScenarioInteractionCount(client, sessionId, statusError.id, 1);

  const statusLoading = scenarioById.get("status_message.loading");
  assert.equal(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(scenarioSelector(statusLoading.id))})?.querySelector("button, a, input, select, textarea") === null`,
    ),
    true,
    "status_message.loading: an interactive action remained available",
  );
}

async function assertActionGroupAndContentInteractions(client, sessionId, scenarioById) {
  const groupReady = scenarioById.get("action_group.ready");
  await pointerActivate(
    client,
    sessionId,
    withinScenario(groupReady, ".jk-action-group__actions .jk-action-button:first-of-type"),
  );
  await waitForScenarioInteractionCount(client, sessionId, groupReady.id, 1);

  const groupDisabled = scenarioById.get("action_group.disabled");
  const disabledGroupSelector = componentSelector(groupDisabled);
  const disabledGroup = await evaluate(
    client,
    sessionId,
    `(() => {
      const group = document.querySelector(${JSON.stringify(disabledGroupSelector)});
      return group ? {
        inert: group.inert,
        ariaDisabled: group.getAttribute("aria-disabled"),
        buttonsDisabled: [...group.querySelectorAll("button")].every((button) => button.disabled)
      } : null;
    })()`,
  );
  assert.deepEqual(
    disabledGroup,
    { inert: false, ariaDisabled: "true", buttonsDisabled: true },
    "action_group.disabled: the labeled group must remain exposed while every action is inert",
  );
  await pointerActivate(
    client,
    sessionId,
    withinScenario(groupDisabled, ".jk-action-group__actions .jk-action-button:first-of-type"),
  );
  await delay();
  assert.equal(
    await scenarioInteractionCount(client, sessionId, groupDisabled.id),
    0,
    "action_group.disabled: behaviorally inert action dispatched",
  );

  const groupFocus = scenarioById.get("action_group.focus-visible");
  await assertFocusVisible(client, sessionId, groupFocus);
  await pressKey(client, sessionId, "Enter");
  await waitForScenarioInteractionCount(client, sessionId, groupFocus.id, 1);

  const alertReady = scenarioById.get("alert.ready");
  await pointerActivate(client, sessionId, focusTargetSelector(alertReady));
  await waitForScenarioInteractionCount(client, sessionId, alertReady.id, 1);
  const alertFocus = scenarioById.get("alert.focus-visible");
  await assertFocusVisible(client, sessionId, alertFocus);
  await pressKey(client, sessionId, "Enter");
  await waitForScenarioInteractionCount(client, sessionId, alertFocus.id, 1);

  const tableReady = scenarioById.get("table.ready");
  await pointerActivate(client, sessionId, focusTargetSelector(tableReady));
  await waitForScenarioInteractionCount(client, sessionId, tableReady.id, 1);
  const tableFocus = scenarioById.get("table.focus-visible");
  await assertFocusVisible(client, sessionId, tableFocus);
  await pressKey(client, sessionId, "Enter");
  await waitForScenarioInteractionCount(client, sessionId, tableFocus.id, 1);

  for (const id of ["panel.ready", "panel.error"]) {
    const scenario = scenarioById.get(id);
    const actionSelector = withinScenario(scenario, ".jk-panel__actions .jk-action-button");
    await pointerActivate(client, sessionId, actionSelector);
    await waitForScenarioInteractionCount(client, sessionId, id, 1);
  }
  const panelLoading = scenarioById.get("panel.loading");
  assert.equal(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(scenarioSelector(panelLoading.id))})?.querySelector("button, a, input, select, textarea") === null`,
    ),
    true,
    "panel.loading: an action remained available",
  );

  const cardReady = scenarioById.get("card.ready");
  await pointerActivate(client, sessionId, focusTargetSelector(cardReady));
  await waitForScenarioInteractionCount(client, sessionId, cardReady.id, 1);
  const cardDisabled = scenarioById.get("card.disabled");
  assert.equal(
    await evaluate(
      client,
      sessionId,
      `(() => {
        const action = document.querySelector(${JSON.stringify(focusTargetSelector(cardDisabled))});
        return action?.tagName === "SPAN" && action.getAttribute("aria-disabled") === "true" && action.tabIndex === -1;
      })()`,
    ),
    true,
    "card.disabled: action must be noninteractive",
  );
  assert.equal(await scenarioInteractionCount(client, sessionId, cardDisabled.id), 0);
  const cardFocus = scenarioById.get("card.focus-visible");
  await assertFocusVisible(client, sessionId, cardFocus);
  await pressKey(client, sessionId, "Enter");
  await waitForScenarioInteractionCount(client, sessionId, cardFocus.id, 1);
}

async function selectedTabLabel(client, sessionId, scenario) {
  return evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(
      withinScenario(scenario, "[role='tab'][aria-selected='true']"),
    )})?.textContent.trim()`,
  );
}

async function assertTabsInteractions(client, sessionId, scenarioById) {
  const ready = scenarioById.get("tabs.ready");
  await tabUntil(client, sessionId, focusTargetSelector(ready), { maxSteps: 240 });
  assert.equal(await selectedTabLabel(client, sessionId, ready), "Evidence");
  const steps = [
    ["ArrowRight", "Policy", 1],
    ["ArrowLeft", "Evidence", 2],
    ["End", "History", 3],
    ["Home", "Evidence", 4],
  ];
  for (const [key, expectedLabel, expectedCount] of steps) {
    await pressKey(client, sessionId, key);
    await waitForScenarioInteractionCount(client, sessionId, ready.id, expectedCount);
    await waitForExpression(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(
        withinScenario(ready, "[role='tab'][aria-selected='true']"),
      )})?.textContent.trim() === ${JSON.stringify(expectedLabel)}`,
      { label: `${ready.id} ${key} activation` },
    );
  }

  const disabled = scenarioById.get("tabs.disabled");
  const disabledSnapshot = await evaluate(
    client,
    sessionId,
    `(() => {
      const root = document.querySelector(${JSON.stringify(componentSelector(disabled))});
      return root ? {
        selected: root.querySelector("[role='tab'][aria-selected='true']")?.textContent.trim(),
        allDisabled: [...root.querySelectorAll("[role='tab']")].every((tab) => tab.disabled),
        focusable: [...root.querySelectorAll("[role='tab']")].some((tab) => tab.tabIndex >= 0)
      } : null;
    })()`,
  );
  assert.deepEqual(
    disabledSnapshot,
    { selected: "Evidence", allDisabled: true, focusable: false },
    "tabs.disabled: native suppression drifted",
  );
  assert.equal(await scenarioInteractionCount(client, sessionId, disabled.id), 0);

  const focus = scenarioById.get("tabs.focus-visible");
  await assertFocusVisible(client, sessionId, focus);
  assert.equal(await selectedTabLabel(client, sessionId, focus), "Policy");
  await pressKey(client, sessionId, "End");
  await waitForScenarioInteractionCount(client, sessionId, focus.id, 1);
  assert.equal(await selectedTabLabel(client, sessionId, focus), "History");
}

function menuPopupSelector(scenario) {
  return withinScenario(scenario, "[role='menu']");
}

function menuItemSelector(scenario, position = "first") {
  const suffix = position === "last" ? ":last-of-type" : ":first-of-type";
  return withinScenario(scenario, `[role='menuitem']${suffix}`);
}

async function waitForMenuOpen(client, sessionId, scenario, expectedOpen) {
  await waitForExpression(
    client,
    sessionId,
    `(() => {
      const root = document.querySelector(${JSON.stringify(componentSelector(scenario))});
      return root?.getAttribute("data-jk-open") === ${JSON.stringify(String(expectedOpen))} &&
        Boolean(root.querySelector("[role='menu']")) === ${expectedOpen};
    })()`,
    { label: `${scenario.id} menu ${expectedOpen ? "open" : "closed"}` },
  );
}

async function activeMenuItem(client, sessionId, scenario) {
  return evaluate(
    client,
    sessionId,
    `(() => {
      const active = document.activeElement;
      return active?.closest(${JSON.stringify(scenarioSelector(scenario.id))}) && active.matches("[role='menuitem']")
        ? active.textContent.trim()
        : null;
    })()`,
  );
}

async function waitForMenuFocusReturned(client, sessionId, scenario, reason) {
  await waitForExpression(
    client,
    sessionId,
    `document.activeElement === document.querySelector(${JSON.stringify(semanticSelector(scenario))})`,
    { label: `${scenario.id} ${reason} focus return` },
  );
}

async function assertMenuInteractions(client, sessionId, scenarioById) {
  const ready = scenarioById.get("menu.ready");
  const readyTrigger = semanticSelector(ready);
  const readyWasOpen = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(componentSelector(ready))})?.getAttribute("data-jk-open") === "true"`,
  );
  if (readyWasOpen) {
    await pointerActivate(client, sessionId, readyTrigger);
    await waitForMenuOpen(client, sessionId, ready, false);
  }
  const closedLayout = await evaluate(
    client,
    sessionId,
    `(() => {
      const scenario = document.querySelector(${JSON.stringify(scenarioSelector(ready.id))});
      const control = scenario?.querySelector(".jk-component-scenario__control");
      const interaction = scenario?.querySelector(".jk-component-scenario__interaction");
      if (!scenario || !control || !interaction) return null;
      return {
        scenarioHeight: scenario.getBoundingClientRect().height,
        controlHeight: control.getBoundingClientRect().height,
        interactionTop: interaction.getBoundingClientRect().top + window.scrollY
      };
    })()`,
  );
  assert.ok(closedLayout, `${ready.id}: layout metrics are unavailable`);
  await pointerActivate(client, sessionId, readyTrigger);
  await waitForMenuOpen(client, sessionId, ready, true);
  const openLayout = await evaluate(
    client,
    sessionId,
    `(() => {
      const scenario = document.querySelector(${JSON.stringify(scenarioSelector(ready.id))});
      const control = scenario?.querySelector(".jk-component-scenario__control");
      const interaction = scenario?.querySelector(".jk-component-scenario__interaction");
      const popup = scenario?.querySelector(".jk-menu__popup");
      if (!scenario || !control || !interaction || !popup) return null;
      return {
        scenarioHeight: scenario.getBoundingClientRect().height,
        controlHeight: control.getBoundingClientRect().height,
        interactionTop: interaction.getBoundingClientRect().top + window.scrollY,
        popupPosition: getComputedStyle(popup).position
      };
    })()`,
  );
  assert.ok(openLayout, `${ready.id}: open layout metrics are unavailable`);
  assert.equal(
    openLayout.popupPosition,
    "absolute",
    `${ready.id}: popup no longer overlays from its trigger`,
  );
  for (const metric of ["scenarioHeight", "controlHeight", "interactionTop"]) {
    assert.ok(
      Math.abs(openLayout[metric] - closedLayout[metric]) <= 1,
      `${ready.id}: opening the popup reflowed ${metric}`,
    );
  }
  await waitForExpression(
    client,
    sessionId,
    `document.activeElement === document.querySelector(${JSON.stringify(menuItemSelector(ready))})`,
    { label: `${ready.id} pointer open initial focus` },
  );
  assert.equal(await activeMenuItem(client, sessionId, ready), "Open receipt");
  for (const [key, label] of [
    ["ArrowDown", "Assign policy review"],
    ["ArrowUp", "Open receipt"],
    ["End", "Return for evidence"],
    ["Home", "Open receipt"],
  ]) {
    await pressKey(client, sessionId, key);
    assert.equal(
      await activeMenuItem(client, sessionId, ready),
      label,
      `${ready.id}: ${key} focus movement drifted`,
    );
  }
  assert.equal(await scenarioInteractionCount(client, sessionId, ready.id), 0);

  await pressKey(client, sessionId, "Enter");
  await waitForScenarioInteractionCount(client, sessionId, ready.id, 1);
  await waitForMenuOpen(client, sessionId, ready, false);
  await waitForMenuFocusReturned(client, sessionId, ready, "selection");

  await pressKey(client, sessionId, "ArrowDown");
  await waitForMenuOpen(client, sessionId, ready, true);
  assert.equal(await activeMenuItem(client, sessionId, ready), "Open receipt");
  await pressKey(client, sessionId, "Escape");
  await waitForMenuOpen(client, sessionId, ready, false);
  await waitForMenuFocusReturned(client, sessionId, ready, "Escape");

  await pointerActivate(client, sessionId, semanticSelector(ready));
  await waitForMenuOpen(client, sessionId, ready, true);
  await pressKey(client, sessionId, "Tab");
  await waitForMenuOpen(client, sessionId, ready, false);

  await pointerActivate(client, sessionId, semanticSelector(ready));
  await waitForMenuOpen(client, sessionId, ready, true);
  await pointerActivate(client, sessionId, "[data-component-coverage='inventory']");
  await waitForMenuOpen(client, sessionId, ready, false);
  assert.equal(
    await scenarioInteractionCount(client, sessionId, ready.id),
    1,
    `${ready.id}: dismissal paths dispatched selections`,
  );

  const disabled = scenarioById.get("menu.disabled");
  await pointerActivate(client, sessionId, semanticSelector(disabled));
  await delay();
  assert.equal(await scenarioInteractionCount(client, sessionId, disabled.id), 0);
  assert.equal(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(menuPopupSelector(disabled))}) === null`,
    ),
    true,
    `${disabled.id}: disabled trigger opened a popup`,
  );

  const focus = scenarioById.get("menu.focus-visible");
  await assertFocusVisible(client, sessionId, focus);
  await pressKey(client, sessionId, "ArrowUp");
  await waitForMenuOpen(client, sessionId, focus, true);
  assert.equal(await activeMenuItem(client, sessionId, focus), "Return for evidence");
  await pressKey(client, sessionId, "Escape");
  await waitForMenuOpen(client, sessionId, focus, false);
  await waitForMenuFocusReturned(client, sessionId, focus, "Escape");
  assert.equal(await scenarioInteractionCount(client, sessionId, focus.id), 0);
}

async function waitForDialogOpen(client, sessionId, scenario, expectedOpen) {
  await waitForExpression(
    client,
    sessionId,
    `(() => {
      const dialog = document.querySelector(${JSON.stringify(componentSelector(scenario))});
      return dialog?.open === ${expectedOpen} &&
        dialog.getAttribute("data-jk-open") === ${JSON.stringify(String(expectedOpen))};
    })()`,
    { label: `${scenario.id} dialog ${expectedOpen ? "open" : "closed"}` },
  );
}

async function assertDialogFocusReturned(client, sessionId, scenario) {
  await waitForExpression(
    client,
    sessionId,
    `document.activeElement === document.querySelector(${JSON.stringify(semanticSelector(scenario))})`,
    { label: `${scenario.id} dialog focus return` },
  );
}

async function assertOpenDialogSemantics(client, sessionId, scenario) {
  await waitForDialogOpen(client, sessionId, scenario, true);
  const dialogSelector = componentSelector(scenario);
  const observed = await evaluate(
    client,
    sessionId,
    `(() => {
      const dialog = document.querySelector(${JSON.stringify(dialogSelector)});
      const actions = dialog?.querySelector(".jk-dialog__actions");
      const dismiss = dialog?.querySelector(".jk-dialog__dismiss");
      const decision = dialog?.querySelector(".jk-dialog__actions .jk-action-button");
      return dialog ? {
        tag: dialog.tagName,
        open: dialog.open,
        activeInside: dialog.contains(document.activeElement),
        baseState: dialog.getAttribute("data-jk-base-state"),
        busy: dialog.getAttribute("aria-busy"),
        invalid: dialog.getAttribute("aria-invalid"),
        actionsInert: actions?.inert ?? false,
        actionsDisabled: actions?.getAttribute("aria-disabled") ?? null,
        dismissDisabled: dismiss?.disabled ?? null,
        dismissName: dismiss?.getAttribute("aria-label") ?? null,
        dismissText: dismiss?.textContent.trim() ?? null,
        dismissIcon: dismiss?.querySelector("[data-jk-icon='x']")?.tagName ?? null,
        dismissIconHidden: dismiss?.querySelector("[data-jk-icon='x']")?.getAttribute("aria-hidden") ?? null,
        dismissWidth: dismiss?.getBoundingClientRect().width ?? 0,
        dismissHeight: dismiss?.getBoundingClientRect().height ?? 0,
        decisionDisabled: decision?.disabled ?? null,
        statusRole: dialog.querySelector(".jk-dialog__status")?.getAttribute("role") ?? null,
        statusText: dialog.querySelector(".jk-dialog__status")?.textContent.trim() ?? ""
      } : null;
    })()`,
  );
  assert.equal(observed.tag, "DIALOG", `${scenario.id}: native dialog element missing`);
  assert.equal(observed.open, true, `${scenario.id}: native modal is not open`);
  assert.equal(observed.activeInside, true, `${scenario.id}: focus escaped the modal`);
  assert.equal(observed.baseState, expectedBaseState(scenario), `${scenario.id}: open base state drifted`);
  assert.equal(observed.dismissName, scenario.fixture.dismiss_label, `${scenario.id}: dismiss name drifted`);
  assert.equal(observed.dismissText, "", `${scenario.id}: dismiss label is visually exposed`);
  assert.equal(observed.dismissIcon, "svg", `${scenario.id}: Lucide close icon is missing`);
  assert.equal(observed.dismissIconHidden, "true", `${scenario.id}: decorative close icon is exposed to assistive technology`);
  assert.ok(observed.dismissWidth >= 44, `${scenario.id}: dismiss target is narrower than 44px`);
  assert.ok(observed.dismissHeight >= 44, `${scenario.id}: dismiss target is shorter than 44px`);

  const ax = await getAxNode(client, sessionId, dialogSelector);
  assert.equal(ax.role, "dialog", `${scenario.id}: open AX role drifted`);
  assert.equal(ax.name, scenario.fixture.title, `${scenario.id}: open AX name drifted`);
  assert.equal(ax.properties.modal, true, `${scenario.id}: native dialog is not AX-modal`);
  const dismissAx = await getAxNode(
    client,
    sessionId,
    `${dialogSelector} .jk-dialog__dismiss`,
  );
  assert.equal(dismissAx.role, "button", `${scenario.id}: dismiss AX role drifted`);
  assert.equal(
    dismissAx.name,
    scenario.fixture.dismiss_label,
    `${scenario.id}: dismiss AX name drifted`,
  );

  if (scenario.state === "loading") {
    assert.equal(observed.busy, "true", `${scenario.id}: aria-busy missing`);
    assert.equal(observed.invalid, null, `${scenario.id}: loading marked invalid`);
    assert.equal(observed.actionsInert, true, `${scenario.id}: loading actions are not inert`);
    assert.equal(observed.actionsDisabled, "true", `${scenario.id}: loading action group is not disabled`);
    assert.equal(observed.dismissDisabled, false, `${scenario.id}: loading dismiss is disabled`);
    assert.equal(observed.decisionDisabled, true, `${scenario.id}: loading decision is enabled`);
    assert.equal(observed.statusRole, "status", `${scenario.id}: loading status role drifted`);
    assert.equal(observed.statusText, scenario.fixture.loading_message, `${scenario.id}: loading text drifted`);
  } else if (scenario.state === "error") {
    assert.equal(observed.busy, null, `${scenario.id}: error marked busy`);
    assert.equal(observed.invalid, "true", `${scenario.id}: recoverable error not marked invalid`);
    assert.equal(observed.actionsInert, false, `${scenario.id}: recoverable error actions are inert`);
    assert.equal(observed.dismissDisabled, false, `${scenario.id}: recoverable error cannot be dismissed`);
    assert.equal(observed.statusRole, "alert", `${scenario.id}: error alert role drifted`);
    assert.equal(observed.statusText, scenario.fixture.error_message, `${scenario.id}: error text drifted`);
  } else {
    assert.equal(observed.busy, null, `${scenario.id}: ready dialog marked busy`);
    assert.equal(observed.invalid, null, `${scenario.id}: ready dialog marked invalid`);
    assert.equal(observed.actionsInert, false, `${scenario.id}: ready actions are inert`);
    assert.equal(observed.dismissDisabled, false, `${scenario.id}: ready dismiss is disabled`);
    assert.equal(observed.decisionDisabled, false, `${scenario.id}: ready decision is disabled`);
  }
}

async function assertDialogInteractions(
  client,
  sessionId,
  scenarioById,
  presentationLabel,
) {
  const ready = scenarioById.get("dialog.ready");
  await pointerActivate(client, sessionId, semanticSelector(ready));
  await waitForScenarioInteractionCount(client, sessionId, ready.id, 1);
  await assertOpenDialogSemantics(client, sessionId, ready);
  assert.equal(
    await evaluate(
      client,
      sessionId,
      `document.activeElement === document.querySelector(${JSON.stringify(
        withinScenario(ready, ".jk-dialog__dismiss"),
      )})`,
    ),
    true,
    `${ready.id}: default initial focus did not reach the dismiss control`,
  );
  await runAxeForScenario(client, sessionId, ready, `${presentationLabel} open modal`);
  await pressKey(client, sessionId, "Escape");
  await waitForScenarioInteractionCount(client, sessionId, ready.id, 2);
  await waitForDialogOpen(client, sessionId, ready, false);
  await assertDialogFocusReturned(client, sessionId, ready);

  await tabUntil(client, sessionId, semanticSelector(ready), { maxSteps: 240 });
  await pressKey(client, sessionId, "Enter");
  await waitForScenarioInteractionCount(client, sessionId, ready.id, 3);
  await assertOpenDialogSemantics(client, sessionId, ready);
  await pointerActivate(client, sessionId, focusTargetSelector(ready));
  await waitForScenarioInteractionCount(client, sessionId, ready.id, 4);
  await waitForDialogOpen(client, sessionId, ready, false);
  await assertDialogFocusReturned(client, sessionId, ready);

  const error = scenarioById.get("dialog.error");
  await pointerActivate(client, sessionId, semanticSelector(error));
  await waitForScenarioInteractionCount(client, sessionId, error.id, 1);
  await assertOpenDialogSemantics(client, sessionId, error);
  await runAxeForScenario(client, sessionId, error, `${presentationLabel} open error modal`);
  await evaluate(
    client,
    sessionId,
    `(() => {
      const dialog = document.querySelector(${JSON.stringify(componentSelector(error))});
      window.__jkErrorDialogCloseSettled = new Promise((resolve) => {
        dialog.addEventListener("close", () => {
          setTimeout(() => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
          }, 0);
        }, { once: true });
      });
      return true;
    })()`,
  );
  await pointerActivate(client, sessionId, withinScenario(error, ".jk-dialog__dismiss"));
  await waitForScenarioInteractionCount(client, sessionId, error.id, 2);
  await waitForDialogOpen(client, sessionId, error, false);
  await assertDialogFocusReturned(client, sessionId, error);

  const focus = scenarioById.get("dialog.focus-visible");
  await tabUntil(client, sessionId, semanticSelector(focus), { maxSteps: 240 });
  await evaluate(
    client,
    sessionId,
    `window.__jkErrorDialogCloseSettled.then((result) => {
      delete window.__jkErrorDialogCloseSettled;
      return result;
    })`,
  );
  assert.equal(
    await evaluate(
      client,
      sessionId,
      `document.activeElement === document.querySelector(${JSON.stringify(
        semanticSelector(focus),
      )})`,
    ),
    true,
    `${focus.id}: a delayed prior-dialog restore pulled focus backward`,
  );
  await pressKey(client, sessionId, "Enter");
  await waitForExpression(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(componentSelector(focus))})?.open === true &&
      Number(document.querySelector(${JSON.stringify(
        `${scenarioSelector(focus.id)} [data-scenario-interaction-count]`,
      )})?.getAttribute("data-scenario-interaction-count") || 0) === 1 &&
      document.querySelector(${JSON.stringify(componentSelector(error))})?.open === false &&
      Number(document.querySelector(${JSON.stringify(
        `${scenarioSelector(error.id)} [data-scenario-interaction-count]`,
      )})?.getAttribute("data-scenario-interaction-count") || 0) === 2`,
    { label: `${focus.id} open after prior-dialog focus settlement` },
  );
  await assertOpenDialogSemantics(client, sessionId, focus);
  await assertFocusVisible(client, sessionId, focus);
  await runAxeForScenario(client, sessionId, focus, `${presentationLabel} open focused modal`);
  await pressKey(client, sessionId, "Escape");
  await waitForScenarioInteractionCount(client, sessionId, focus.id, 2);
  await waitForDialogOpen(client, sessionId, focus, false);
  await assertDialogFocusReturned(client, sessionId, focus);

  const loading = scenarioById.get("dialog.loading");
  await pointerActivate(client, sessionId, semanticSelector(loading));
  await waitForScenarioInteractionCount(client, sessionId, loading.id, 1);
  await assertOpenDialogSemantics(client, sessionId, loading);
  await runAxeForScenario(client, sessionId, loading, `${presentationLabel} open loading modal`);
  await pressKey(client, sessionId, "Escape");
  await waitForScenarioInteractionCount(client, sessionId, loading.id, 2);
  await waitForDialogOpen(client, sessionId, loading, false);
  await assertDialogFocusReturned(client, sessionId, loading);

  await pointerActivate(client, sessionId, semanticSelector(loading));
  await waitForScenarioInteractionCount(client, sessionId, loading.id, 3);
  await assertOpenDialogSemantics(client, sessionId, loading);
  await pointerActivate(client, sessionId, focusTargetSelector(loading));
  await delay();
  assert.equal(
    await scenarioInteractionCount(client, sessionId, loading.id),
    3,
    `${loading.id}: disabled decision dispatched while loading`,
  );
  assert.equal(
    await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(componentSelector(loading))})?.open`,
    ),
    true,
    `${loading.id}: disabled decision closed the loading dialog`,
  );
  await pointerActivate(client, sessionId, withinScenario(loading, ".jk-dialog__dismiss"));
  await waitForScenarioInteractionCount(client, sessionId, loading.id, 4);
  await waitForDialogOpen(client, sessionId, loading, false);
  await assertDialogFocusReturned(client, sessionId, loading);
}

async function normalizeDefaultOpenMenuClosed(client, sessionId, scenarioById) {
  const menu = scenarioById.get("menu.ready");
  const open = await evaluate(
    client,
    sessionId,
    `document.querySelector(${JSON.stringify(componentSelector(menu))})?.getAttribute("data-jk-open") === "true"`,
  );
  if (!open) return;
  await pointerActivate(client, sessionId, semanticSelector(menu));
  await waitForMenuOpen(client, sessionId, menu, false);
}

async function assertInteractionsIsolated(
  client,
  { componentUrl, viewport, appearance, presentationLabel },
) {
  const interactionGroups = [
    {
      id: "actions",
      run: assertActionInteractions,
    },
    {
      id: "fields",
      run: assertFieldInteractions,
    },
    {
      id: "native-select",
      run: assertSelectInteractions,
    },
    {
      id: "choices",
      run: assertChoiceInteractions,
    },
    {
      id: "toggle-status",
      run: assertToggleAndStatusInteractions,
    },
    {
      id: "action-group-content",
      run: assertActionGroupAndContentInteractions,
    },
    {
      id: "tabs",
      run: assertTabsInteractions,
    },
    {
      id: "menu",
      run: assertMenuInteractions,
    },
    {
      id: "dialog",
      axe: true,
      run: (browserClient, sessionId, scenarioById) =>
        assertDialogInteractions(
          browserClient,
          sessionId,
          scenarioById,
          presentationLabel,
        ),
    },
  ];

  for (const group of interactionGroups) {
    const page = await openPage(client, {
      url: componentUrl,
      viewport,
      colorScheme: appearance,
    });
    try {
      await assertPageReady(client, page.sessionId, page, viewport, appearance);
      const scenarioById = new Map(
        RUNTIME_COMPONENT_SCENARIOS.map((scenario) => [scenario.id, scenario]),
      );
      if (group.id !== "menu") {
        await normalizeDefaultOpenMenuClosed(client, page.sessionId, scenarioById);
      }
      if (group.axe) await injectAxe(client, page.sessionId);
      await group.run(client, page.sessionId, scenarioById);
      assert.equal(
        await evaluate(
          client,
          page.sessionId,
          `document.querySelectorAll("[data-component-specimen-error]").length`,
        ),
        0,
        `${presentationLabel} ${group.id}: a component specimen error appeared after interaction`,
      );
      assert.ok(
        await evaluate(
          client,
          page.sessionId,
          `document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1`,
        ),
        `${presentationLabel} ${group.id}: interactions introduced page overflow`,
      );
      await assertPageClean(page, `${presentationLabel} ${group.id} interactions`);
    } finally {
      await page.close();
    }
  }
}

function canonicalizeJsonValue(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeJsonValue(value[key])]),
    );
  }
  return value;
}

function sha256Text(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function hashCanonical(value) {
  return sha256Text(JSON.stringify(canonicalizeJsonValue(value)));
}

function expectedImplementationBinding() {
  const sourcePaths = [
    ...new Set([
      ...COMPONENT_IMPLEMENTATION_REGISTRY
        .filter((entry) => entry.implementation_status === "implemented")
        .flatMap((entry) => entry.implementation_sources),
      ...EVIDENCE_BINDING_SOURCES,
    ]),
  ];
  return {
    hash: hashCanonical({
      adapter: COMPONENT_RUNTIME_ADAPTER,
      sources: sourcePaths.map((sourcePath) => ({
        path: sourcePath,
        hash: sha256Text(fs.readFileSync(path.join(REPO_ROOT, sourcePath), "utf8")),
      })),
    }),
    sourcePaths,
  };
}

function validateBuiltAdapter(siteOutDir) {
  const registry = readJson(
    path.join(siteOutDir, "design-system", "component-registry.json"),
  );
  const specimens = readJson(
    path.join(siteOutDir, "design-system", "component-specimens.json"),
  );
  const contracts = readJson(
    path.join(siteOutDir, "design-system", "component-contracts.json"),
  );
  const contractRecords = contracts.contracts ?? contracts;
  const expectedIds = [...RUNTIME_COMPONENT_IDS];
  const expectedScenarioIds = RUNTIME_COMPONENT_SCENARIOS.map((scenario) => scenario.id);
  const implementationBinding = expectedImplementationBinding();

  assert.equal(expectedIds.length, EXPECTED_COMPONENT_COUNT);
  assert.equal(new Set(expectedIds).size, EXPECTED_COMPONENT_COUNT);
  assert.equal(expectedScenarioIds.length, EXPECTED_SCENARIO_COUNT);
  assert.equal(new Set(expectedScenarioIds).size, EXPECTED_SCENARIO_COUNT);
  assert.equal(
    VIEWPORTS.length * APPEARANCES.length * EXPECTED_SCENARIO_COUNT,
    EXPECTED_PRESENTATION_COUNT,
  );
  assert.deepEqual(registry.renderer_components, expectedIds);
  assert.deepEqual(
    registry.scenarios.map((scenario) => scenario.id).sort(),
    [...expectedScenarioIds].sort(),
    "built scenario registry drifted from runtime fixtures",
  );
  assert.equal(specimens.specimens.length, EXPECTED_COMPONENT_COUNT);
  assert.deepEqual(
    specimens.specimens.map((specimen) => specimen.contract_id),
    expectedIds,
  );
  assert.equal(
    registry.evidence.implementation_hash,
    implementationBinding.hash,
    "built implementation hash is not bound to all adapter and specimen sources",
  );
  assert.deepEqual(
    [...registry.evidence.implementation_sources].sort(),
    [...implementationBinding.sourcePaths].sort(),
    "built implementation source inventory drifted",
  );

  const contractById = new Map(
    contractRecords.map((contract) => [contract.id, contract]),
  );
  const outputHashes = {};
  const fixtureOutputHashes = {};
  const contractHashes = {};
  const implementationHashes = {};
  for (const specimen of specimens.specimens) {
    const contract = contractById.get(specimen.contract_id);
    assert.ok(contract, `${specimen.contract_id}: built contract is missing`);
    assert.equal(
      specimen.contract_hash,
      hashCanonical(contract),
      `${specimen.contract_id}: contract hash drifted`,
    );
    assert.equal(
      specimen.implementation_hash,
      implementationBinding.hash,
      `${specimen.contract_id}: implementation hash drifted`,
    );
    assert.equal(
      specimen.output_hash,
      sha256Text(specimen.rendered_html),
      `${specimen.contract_id}: rendered output hash drifted`,
    );
    assert.equal(
      specimen.fixture_output_hash,
      registry.evidence.fixture_output_hashes[specimen.contract_id],
      `${specimen.contract_id}: fixture output hash drifted`,
    );
    assert.match(
      specimen.fixture_output_hash,
      /^sha256:[a-f0-9]{64}$/u,
      `${specimen.contract_id}: fixture output hash is malformed`,
    );
    assert.deepEqual(
      specimen.scenarios.map((scenario) => scenario.id),
      RUNTIME_COMPONENT_SCENARIOS
        .filter((scenario) => scenario.contract_id === specimen.contract_id)
        .map((scenario) => scenario.id),
      `${specimen.contract_id}: specimen scenario scope drifted`,
    );
    outputHashes[specimen.contract_id] = specimen.output_hash;
    fixtureOutputHashes[specimen.contract_id] = specimen.fixture_output_hash;
    contractHashes[specimen.contract_id] = specimen.contract_hash;
    implementationHashes[specimen.contract_id] = specimen.implementation_hash;
  }

  return {
    registry,
    specimens,
    contractHashes,
    implementationHash: implementationBinding.hash,
    implementationHashes,
    implementationSources: implementationBinding.sourcePaths,
    fixtureOutputHashes,
    outputHashes,
  };
}

async function buildBrowserEdgeProbe(siteOutDir) {
  const probeDirectory = path.join(siteOutDir, "component-browser-probe");
  fs.mkdirSync(probeDirectory, { recursive: true });
  await buildWithEsbuild({
    entryPoints: [
      path.join(
        REPO_ROOT,
        "tests",
        "components",
        "support",
        "indeterminate-browser-probe.jsx",
      ),
    ],
    outfile: path.join(probeDirectory, "probe.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    jsx: "automatic",
    sourcemap: false,
    logLevel: "silent",
  });
  const probeCss = path.join(probeDirectory, "probe.css");
  fs.writeFileSync(
    path.join(probeDirectory, "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Component browser edge probe</title>
    ${fs.existsSync(probeCss) ? '<link rel="stylesheet" href="/component-browser-probe/probe.css">' : ""}
  </head>
  <body>
    <main id="indeterminate-probe-root"></main>
    <script type="module" src="/component-browser-probe/probe.js"></script>
  </body>
</html>\n`,
  );
}

async function injectAxe(client, sessionId) {
  assert.ok(fs.existsSync(AXE_PATH), "The local axe-core browser bundle is missing.");
  await evaluate(
    client,
    sessionId,
    fs.readFileSync(AXE_PATH, "utf8"),
    { awaitPromise: false },
  );
  assert.equal(
    await evaluate(client, sessionId, `typeof globalThis.axe?.run === "function"`),
    true,
    "axe-core did not load from the local dependency",
  );
}

async function assertPageReady(client, sessionId, page, viewport, appearance) {
  await waitForExpression(
    client,
    sessionId,
    `document.querySelectorAll("[data-component-specimen-mounted='true']").length === ${EXPECTED_COMPONENT_COUNT}`,
    { label: `${viewport.label} ${appearance} component hydration` },
  );
  const observed = await evaluate(
    client,
    sessionId,
    `(() => ({
      origin: location.origin,
      width: innerWidth,
      height: innerHeight,
      colorScheme: matchMedia(${JSON.stringify(`(prefers-color-scheme: ${appearance})`)}).matches,
      roots: document.querySelectorAll("[data-component-specimen-runtime]").length,
      mounted: document.querySelectorAll("[data-component-specimen-mounted='true']").length,
      errors: [...document.querySelectorAll("[data-component-specimen-error]")].map((root) => ({
        component: root.getAttribute("data-component-specimen-runtime"),
        error: root.getAttribute("data-component-specimen-error")
      })),
      scenarios: [...document.querySelectorAll("[data-scenario-id]")].map((root) => root.getAttribute("data-scenario-id")),
      coverage: [...document.querySelectorAll("[data-component-coverage]")].map((root) => root.getAttribute("data-component-coverage")),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }))()`,
  );
  assert.equal(observed.width, viewport.width, `${viewport.label}: inner width drifted`);
  assert.equal(observed.height, viewport.height, `${viewport.label}: inner height drifted`);
  assert.equal(observed.colorScheme, true, `${appearance}: emulation was not applied`);
  assert.equal(observed.roots, EXPECTED_COMPONENT_COUNT);
  assert.equal(observed.mounted, EXPECTED_COMPONENT_COUNT);
  assert.deepEqual(observed.errors, [], "component hydration or recoverable errors were marked");
  assert.equal(observed.scenarios.length, EXPECTED_SCENARIO_COUNT);
  assert.equal(new Set(observed.scenarios).size, EXPECTED_SCENARIO_COUNT);
  assert.deepEqual(
    [...observed.scenarios].sort(),
    RUNTIME_COMPONENT_SCENARIOS.map((scenario) => scenario.id).sort(),
  );
  assert.deepEqual(observed.coverage, ["inventory", "normalization", "runtime"]);
  assert.ok(observed.overflow <= 1, `page overflows horizontally by ${observed.overflow}px`);
  assert.deepEqual(page.runtimeExceptions, [], "uncaught page errors occurred");
  assert.deepEqual(page.consoleErrors, [], "console error/assert calls occurred");
  return observed;
}

async function assertPageClean(page, label) {
  await delay(50);
  assert.deepEqual(page.runtimeExceptions, [], `${label}: uncaught page errors occurred`);
  assert.deepEqual(page.consoleErrors, [], `${label}: console error/assert calls occurred`);
}

async function verifyExternalNetworkBlocked(client, sessionId) {
  return evaluate(
    client,
    sessionId,
    `(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      try {
        await fetch("https://example.com/judgmentkit-component-browser-network-probe", {
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal
        });
        return false;
      } catch {
        return true;
      } finally {
        clearTimeout(timeout);
      }
    })()`,
  );
}

async function componentAppearanceFingerprint(client, sessionId) {
  const targets = RUNTIME_COMPONENT_SCENARIOS.map((scenario) => ({
    scenarioId: scenario.id,
    componentId: scenario.contract_id,
    selector: withinScenario(
      scenario,
      APPEARANCE_SELECTORS[scenario.contract_id],
    ),
  }));
  return evaluate(
    client,
    sessionId,
    `(() => ${JSON.stringify(targets)}.map(({ scenarioId, componentId, selector }) => {
      const element = document.querySelector(selector);
      if (!element) return { scenarioId, componentId, selector, missing: true };
      const style = getComputedStyle(element);
      return {
        scenarioId,
        componentId,
        selector,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderTopColor: style.borderTopColor,
        borderRightColor: style.borderRightColor,
        outlineColor: style.outlineColor,
        fill: style.fill
      };
    }))()`,
  );
}

async function verifyReducedMotionRules(client, baseUrl) {
  const page = await openPage(client, {
    url: `${baseUrl}/design-system/components/`,
    viewport: VIEWPORTS[0],
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  try {
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelectorAll("[data-component-specimen-mounted='true']").length === ${EXPECTED_COMPONENT_COUNT}`,
      { label: "reduced-motion component hydration" },
    );
    const observed = await evaluate(
      client,
      page.sessionId,
      `(() => {
        const actionProgress = document.querySelector(${JSON.stringify(
          `${scenarioSelector("action_button.loading")} .jk-action-button__progress`,
        )});
        const statusProgress = document.querySelector(${JSON.stringify(
          `${scenarioSelector("status_message.loading")} .jk-status-message__progress`,
        )});
        const toggleThumb = document.querySelector(${JSON.stringify(
          `${scenarioSelector("toggle.ready")} .jk-toggle__thumb`,
        )});
        const actionStyle = actionProgress ? getComputedStyle(actionProgress) : null;
        const statusStyle = statusProgress ? getComputedStyle(statusProgress) : null;
        const toggleStyle = toggleThumb ? getComputedStyle(toggleThumb) : null;
        return {
          matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
          action: actionStyle ? {
            animationName: actionStyle.animationName,
            borderTopStyle: actionStyle.borderTopStyle
          } : null,
          status: statusStyle ? {
            animationName: statusStyle.animationName,
            borderTopStyle: statusStyle.borderTopStyle
          } : null,
          toggle: toggleStyle ? {
            transitionDuration: toggleStyle.transitionDuration,
            transitionProperty: toggleStyle.transitionProperty
          } : null,
          specimenErrors: document.querySelectorAll("[data-component-specimen-error]").length
        };
      })()`,
    );
    assert.equal(observed.matches, true, "reduced-motion emulation did not apply");
    assert.deepEqual(
      observed.action,
      { animationName: "none", borderTopStyle: "dashed" },
      "reduced-motion action spinner rules drifted",
    );
    assert.deepEqual(
      observed.status,
      { animationName: "none", borderTopStyle: "dashed" },
      "reduced-motion status spinner rules drifted",
    );
    assert.equal(observed.toggle.transitionDuration, "0s", "toggle transition was not suppressed");
    assert.equal(observed.specimenErrors, 0);
    await assertPageClean(page, "reduced-motion page");
    return observed;
  } finally {
    await page.close();
  }
}

async function verifyForcedColorsRules(client, baseUrl) {
  const page = await openPage(client, {
    url: `${baseUrl}/design-system/components/`,
    viewport: VIEWPORTS[0],
    colorScheme: "light",
    forcedColors: "active",
  });
  try {
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelectorAll("[data-component-specimen-mounted='true']").length === ${EXPECTED_COMPONENT_COUNT}`,
      { label: "forced-colors component hydration" },
    );
    const scenario = RUNTIME_COMPONENT_SCENARIOS.find(
      (entry) => entry.id === "action_button.focus-visible",
    );
    const selectScenario = RUNTIME_COMPONENT_SCENARIOS.find(
      (entry) => entry.id === "select_field.ready",
    );
    await assertFocusVisible(client, page.sessionId, scenario);
    const observed = await evaluate(
      client,
      page.sessionId,
      `(() => {
        const target = document.querySelector(${JSON.stringify(focusTargetSelector(scenario))});
        const style = target ? getComputedStyle(target) : null;
        const select = document.querySelector(${JSON.stringify(semanticSelector(selectScenario))});
        const selectStyle = select ? getComputedStyle(select) : null;
        const selectSlot = document.querySelector(${JSON.stringify(
          `${scenarioSelector(selectScenario.id)} .jk-select-field__indicator-slot`,
        )});
        return {
          matches: matchMedia("(forced-colors: active)").matches,
          boxShadow: style?.boxShadow ?? null,
          outlineStyle: style?.outlineStyle ?? null,
          outlineWidth: style?.outlineWidth ?? null,
          select: {
            appearance: selectStyle?.appearance || selectStyle?.webkitAppearance || null,
            paddingInlineStart: selectStyle?.paddingInlineStart ?? null,
            paddingInlineEnd: selectStyle?.paddingInlineEnd ?? null,
            slotDisplay: selectSlot ? getComputedStyle(selectSlot).display : null,
          },
          specimenErrors: document.querySelectorAll("[data-component-specimen-error]").length
        };
      })()`,
    );
    assert.equal(observed.matches, true, "forced-colors emulation did not apply");
    assert.equal(observed.boxShadow, "none", "forced-colors focus kept a shadow-only cue");
    assert.notEqual(observed.outlineStyle, "none", "forced-colors focus outline missing");
    assert.ok(Number.parseFloat(observed.outlineWidth) >= 2, "forced-colors focus outline is too thin");
    assert.notEqual(observed.select.appearance, "none", "forced-colors select kept the custom appearance");
    assert.equal(observed.select.paddingInlineStart, "12px", "forced-colors select start padding drifted");
    assert.equal(observed.select.paddingInlineEnd, "12px", "forced-colors select end padding drifted");
    assert.equal(observed.select.slotDisplay, "none", "forced-colors custom indicator remained visible");
    assert.equal(observed.specimenErrors, 0);
    await assertPageClean(page, "forced-colors page");
    return observed;
  } finally {
    await page.close();
  }
}

async function verifyBrowserEdgeProbe(client, baseUrl) {
  const axeReceiptStart = AXE_SCAN_RECEIPTS.length;
  const page = await openPage(client, {
    url: `${baseUrl}/component-browser-probe/`,
    viewport: VIEWPORTS[0],
    colorScheme: "light",
  });
  try {
    await waitForExpression(
      client,
      page.sessionId,
      `Boolean(document.querySelector("#indeterminate-browser-probe")) &&
        Boolean(document.querySelector("#controlled-menu-refusal-probe")) &&
        Boolean(document.querySelector("[data-edge-dialog-trigger='true']"))`,
      { label: "browser edge probe render" },
    );
    await injectAxe(client, page.sessionId);
    await runAxeForSelector(
      client,
      page.sessionId,
      "#indeterminate-probe-root",
      "component browser edge probe",
    );

    const programmaticMenuFocus = await evaluate(
      client,
      page.sessionId,
      `(() => {
        const root = document.querySelector("#controlled-menu-refusal-probe");
        return root ? {
          open: root.getAttribute("data-jk-open"),
          activeFirstItem:
            document.activeElement === root.querySelector("[role='menuitem']:first-of-type")
        } : null;
      })()`,
    );
    assert.deepEqual(
      programmaticMenuFocus,
      { open: "true", activeFirstItem: true },
      "a programmatically open controlled Menu did not focus its first item",
    );

    const checkboxSelector = "#indeterminate-browser-probe";
    const before = await evaluate(
      client,
      page.sessionId,
      `(() => {
        const input = document.querySelector(${JSON.stringify(checkboxSelector)});
        return input ? {
          checked: input.checked,
          indeterminate: input.indeterminate,
          ariaChecked: input.getAttribute("aria-checked")
        } : null;
      })()`,
    );
    assert.deepEqual(
      before,
      { checked: false, indeterminate: true, ariaChecked: "mixed" },
      "indeterminate checkbox DOM state drifted before activation",
    );
    const checkboxAx = await getAxNode(client, page.sessionId, checkboxSelector);
    assert.equal(checkboxAx.role, "checkbox");
    assert.equal(checkboxAx.name, "Partially reviewed evidence");
    assertStringIncludes(
      checkboxAx.description,
      "Some, but not all, evidence has been reviewed.",
      "indeterminate checkbox AX description missing",
    );
    assert.equal(checkboxAx.properties.checked, "mixed");
    await pointerActivate(client, page.sessionId, checkboxSelector);
    await delay();
    const after = await evaluate(
      client,
      page.sessionId,
      `(() => {
        const input = document.querySelector(${JSON.stringify(checkboxSelector)});
        return input ? {
          checked: input.checked,
          indeterminate: input.indeterminate,
          ariaChecked: input.getAttribute("aria-checked")
        } : null;
      })()`,
    );
    assert.deepEqual(
      after,
      { checked: false, indeterminate: true, ariaChecked: "mixed" },
      "controlled indeterminate checkbox lost its declarative DOM state after activation",
    );

    const controlledMenuItem = "#controlled-menu-refusal-probe [role='menuitem']:first-of-type";
    await tabUntil(client, page.sessionId, controlledMenuItem, { maxSteps: 20 });
    await pressKey(client, page.sessionId, "Escape");
    await delay();
    const controlledMenu = await evaluate(
      client,
      page.sessionId,
      `(() => {
        const root = document.querySelector("#controlled-menu-refusal-probe");
        return root ? {
          open: root.getAttribute("data-jk-open"),
          popup: Boolean(root.querySelector("[role='menu']")),
          activeItem: document.activeElement?.matches("#controlled-menu-refusal-probe [role='menuitem']") === true,
          triggerFocused: document.activeElement === root.querySelector(".jk-menu__trigger")
        } : null;
      })()`,
    );
    assert.deepEqual(
      controlledMenu,
      { open: "true", popup: true, activeItem: true, triggerFocused: false },
      "controlled Menu close refusal moved focus outside an open popup",
    );

    const disabledMenuRoot = "#disabled-menu-navigation-probe";
    const disabledMenuTrigger = `${disabledMenuRoot} .jk-menu__trigger`;
    await pointerActivate(client, page.sessionId, disabledMenuTrigger);
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelector(${JSON.stringify(disabledMenuRoot)})?.getAttribute("data-jk-open") === "true"`,
      { label: "disabled-item navigation menu open" },
    );
    assert.equal(
      await evaluate(
        client,
        page.sessionId,
        `document.activeElement === document.querySelector(${JSON.stringify(
          `${disabledMenuRoot} [role='menuitem']:first-of-type`,
        )})`,
      ),
      true,
      "programmatic menu open did not focus the first item",
    );
    await pressKey(client, page.sessionId, "ArrowDown");
    const disabledItem = await evaluate(
      client,
      page.sessionId,
      `(() => {
        const item = document.querySelector(${JSON.stringify(
          `${disabledMenuRoot} [data-jk-menu-item='disabled-middle']`,
        )});
        return item ? {
          tag: item.tagName,
          nativeDisabled: item.disabled,
          ariaDisabled: item.getAttribute("aria-disabled"),
          tabIndex: item.tabIndex,
          active: document.activeElement === item
        } : null;
      })()`,
    );
    assert.deepEqual(
      disabledItem,
      {
        tag: "BUTTON",
        nativeDisabled: false,
        ariaDisabled: "true",
        tabIndex: 0,
        active: true,
      },
      "disabled Menu item was removed from roving focus or exposed as natively disabled",
    );
    await pressKey(client, page.sessionId, "Enter");
    await delay();
    assert.equal(
      await evaluate(
        client,
        page.sessionId,
        `document.querySelector("[data-edge-disabled-menu-selection-count]")?.getAttribute("data-edge-disabled-menu-selection-count")`,
      ),
      "0",
      "disabled Menu item dispatched selection",
    );
    assert.equal(
      await evaluate(
        client,
        page.sessionId,
        `document.querySelector(${JSON.stringify(disabledMenuRoot)})?.getAttribute("data-jk-open")`,
      ),
      "true",
      "disabled Menu item dismissed the menu",
    );
    await pressKey(client, page.sessionId, "ArrowDown");
    assert.equal(
      await evaluate(
        client,
        page.sessionId,
        `document.activeElement?.textContent.trim()`,
      ),
      "Last available command",
      "Arrow traversal did not continue past the disabled Menu item",
    );
    await pressKey(client, page.sessionId, "Enter");
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelector("[data-edge-disabled-menu-selection-count]")?.getAttribute("data-edge-disabled-menu-selection-count") === "1" &&
        document.querySelector(${JSON.stringify(disabledMenuRoot)})?.getAttribute("data-jk-open") === "false"`,
      { label: "enabled Menu item selection after disabled-item traversal" },
    );

    const typeaheadMenuRoot = "#typeahead-href-menu-probe";
    const typeaheadMenuTrigger = `${typeaheadMenuRoot} .jk-menu__trigger`;
    await pointerActivate(client, page.sessionId, typeaheadMenuTrigger);
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelector(${JSON.stringify(typeaheadMenuRoot)})?.getAttribute("data-jk-open") === "true" &&
        document.activeElement === document.querySelector(${JSON.stringify(
          `${typeaheadMenuRoot} [role='menuitem']:first-of-type`,
        )})`,
      { label: "typeahead Menu open and initial focus" },
    );
    await pressKey(client, page.sessionId, "b");
    const hrefMenuItem = await waitForExpression(
      client,
      page.sessionId,
      `(() => {
        const active = document.activeElement;
        return active?.matches(${JSON.stringify(
          `${typeaheadMenuRoot} a[role='menuitem'][data-jk-menu-item='billing-receipt']`,
        )}) ? {
          tag: active.tagName,
          role: active.getAttribute("role"),
          name: active.textContent.trim(),
          href: active.getAttribute("href")
        } : null;
      })()`,
      { label: "Menu typeahead focus on href item" },
    );
    assert.deepEqual(
      hrefMenuItem,
      {
        tag: "A",
        role: "menuitem",
        name: "Billing receipt",
        href: "#browser-menu-href-target",
      },
      "Menu typeahead did not focus the matching href item",
    );
    await pressKey(client, page.sessionId, "Space");
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelector("[data-edge-typeahead-menu-selection-count]")?.getAttribute("data-edge-typeahead-menu-selection-count") === "1" &&
        document.querySelector(${JSON.stringify(typeaheadMenuRoot)})?.getAttribute("data-jk-open") === "false" &&
        location.hash === "#browser-menu-href-target"`,
      { label: "href Menu item Space activation" },
    );
    await waitForExpression(
      client,
      page.sessionId,
      `document.activeElement === document.querySelector(${JSON.stringify(typeaheadMenuTrigger)})`,
      { label: "href Menu selection focus return" },
    );

    const dialogTrigger = "[data-edge-dialog-trigger='true']";
    await tabUntil(client, page.sessionId, dialogTrigger, { maxSteps: 20 });
    await pressKey(client, page.sessionId, "Enter");
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelector("#conditional-dialog-probe")?.open === true`,
      { label: "conditional controlled dialog open" },
    );
    await runAxeForSelector(
      client,
      page.sessionId,
      "#conditional-dialog-probe",
      "conditional controlled dialog open",
    );
    await pressKey(client, page.sessionId, "Escape");
    await waitForExpression(
      client,
      page.sessionId,
      `!document.querySelector("#conditional-dialog-probe")`,
      { label: "conditional controlled dialog unmount" },
    );
    await waitForExpression(
      client,
      page.sessionId,
      `document.activeElement === document.querySelector(${JSON.stringify(dialogTrigger)})`,
      { label: "conditional controlled dialog focus return" },
    );

    const refusalDialogTrigger = "[data-edge-refusal-dialog-trigger='true']";
    await tabUntil(client, page.sessionId, refusalDialogTrigger, { maxSteps: 20 });
    await pressKey(client, page.sessionId, "Enter");
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelector("#controlled-dialog-refusal-probe")?.open === true`,
      { label: "controlled refusal dialog open" },
    );
    await runAxeForSelector(
      client,
      page.sessionId,
      "#controlled-dialog-refusal-probe",
      "controlled native-close refusal dialog",
    );
    await evaluate(
      client,
      page.sessionId,
      `document.querySelector("#controlled-dialog-refusal-probe")?.close()`,
    );
    await waitForExpression(
      client,
      page.sessionId,
      `(() => {
        const dialog = document.querySelector("#controlled-dialog-refusal-probe");
        return dialog?.open === true && dialog.contains(document.activeElement);
      })()`,
      { label: "controlled native-close refusal modal recovery" },
    );
    await pointerActivate(
      client,
      page.sessionId,
      "[data-edge-refusal-dialog-force-close='true']",
    );
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelector("#controlled-dialog-refusal-probe")?.open === false`,
      { label: "controlled refusal dialog accepted cleanup" },
    );
    await waitForExpression(
      client,
      page.sessionId,
      `document.activeElement === document.querySelector(${JSON.stringify(refusalDialogTrigger)})`,
      { label: "controlled refusal dialog cleanup focus return" },
    );

    const nondismissibleTrigger = "[data-edge-nondismissible-dialog-trigger='true']";
    await tabUntil(client, page.sessionId, nondismissibleTrigger, { maxSteps: 30 });
    await pressKey(client, page.sessionId, "Enter");
    await waitForExpression(
      client,
      page.sessionId,
      `document.querySelector("#uncontrolled-nondismissible-dialog-probe")?.open === true`,
      { label: "uncontrolled nondismissible dialog open" },
    );
    await runAxeForSelector(
      client,
      page.sessionId,
      "#uncontrolled-nondismissible-dialog-probe",
      "uncontrolled nondismissible dialog",
    );
    await evaluate(
      client,
      page.sessionId,
      `document.querySelector("#uncontrolled-nondismissible-dialog-probe")?.close()`,
    );
    await waitForExpression(
      client,
      page.sessionId,
      `(() => {
        const dialog = document.querySelector("#uncontrolled-nondismissible-dialog-probe");
        return dialog?.open === true && dialog.contains(document.activeElement);
      })()`,
      { label: "uncontrolled nondismissible native-close refusal" },
    );
    await pointerActivate(
      client,
      page.sessionId,
      "[data-edge-nondismissible-dialog-force-unmount='true']",
    );
    await waitForExpression(
      client,
      page.sessionId,
      `!document.querySelector("#uncontrolled-nondismissible-dialog-probe")`,
      { label: "uncontrolled nondismissible dialog cleanup" },
    );
    await waitForExpression(
      client,
      page.sessionId,
      `document.activeElement === document.querySelector(${JSON.stringify(nondismissibleTrigger)})`,
      { label: "uncontrolled nondismissible dialog focus return" },
    );

    const loadingFormTrigger = "[data-edge-loading-form-dialog-trigger='true']";
    await tabUntil(client, page.sessionId, loadingFormTrigger, { maxSteps: 30 });
    await pressKey(client, page.sessionId, "Enter");
    await waitForExpression(
      client,
      page.sessionId,
      `(() => {
        const dialog = document.querySelector("#loading-form-dialog-probe");
        return dialog?.open === true && dialog.getAttribute("aria-busy") === "true";
      })()`,
      { label: "loading form dialog open" },
    );
    await runAxeForSelector(
      client,
      page.sessionId,
      "#loading-form-dialog-probe",
      "loading dialog with native form",
    );
    await pointerActivate(
      client,
      page.sessionId,
      "[data-edge-loading-dialog-native-submit='true']",
    );
    await waitForExpression(
      client,
      page.sessionId,
      `(() => {
        const dialog = document.querySelector("#loading-form-dialog-probe");
        return dialog?.open === true &&
          dialog.getAttribute("aria-busy") === "true" &&
          dialog.contains(document.activeElement);
      })()`,
      { label: "loading dialog native form-close refusal" },
    );
    await pointerActivate(
      client,
      page.sessionId,
      "[data-edge-loading-dialog-stop-loading='true']",
    );
    await waitForExpression(
      client,
      page.sessionId,
      `(() => {
        const dialog = document.querySelector("#loading-form-dialog-probe");
        return dialog?.getAttribute("aria-busy") === null &&
          dialog.querySelector(".jk-dialog__dismiss")?.disabled === false;
      })()`,
      { label: "loading form dialog completion" },
    );
    await pointerActivate(
      client,
      page.sessionId,
      "#loading-form-dialog-probe .jk-dialog__dismiss",
    );
    await waitForExpression(
      client,
      page.sessionId,
      `!document.querySelector("#loading-form-dialog-probe")`,
      { label: "loading form dialog cleanup" },
    );
    await waitForExpression(
      client,
      page.sessionId,
      `document.activeElement === document.querySelector(${JSON.stringify(loadingFormTrigger)})`,
      { label: "loading form dialog focus return" },
    );

    const loadingNoControlTrigger =
      "[data-edge-loading-no-control-dialog-trigger='true']";
    await tabUntil(client, page.sessionId, loadingNoControlTrigger, { maxSteps: 30 });
    await pressKey(client, page.sessionId, "Enter");
    await waitForExpression(
      client,
      page.sessionId,
      `(() => {
        const dialog = document.querySelector("#loading-no-control-dialog-probe");
        return dialog?.open === true &&
          dialog.getAttribute("aria-busy") === "true" &&
          document.activeElement === dialog;
      })()`,
      { label: "loading no-control dialog initial focus" },
    );
    await runAxeForSelector(
      client,
      page.sessionId,
      "#loading-no-control-dialog-probe",
      "loading dialog without enabled descendant controls",
    );
    await pressKey(client, page.sessionId, "Escape");
    await pointerActivate(
      client,
      page.sessionId,
      "#loading-no-control-dialog-probe .jk-dialog__actions .jk-action-button",
    );
    await delay();
    assert.equal(
      await evaluate(
        client,
        page.sessionId,
        `document.querySelector("#loading-no-control-dialog-probe")?.open`,
      ),
      true,
      "loading no-control Dialog was dismissed before native-close probing",
    );
    await evaluate(
      client,
      page.sessionId,
      `document.querySelector("#loading-no-control-dialog-probe")?.close()`,
    );
    await delay(250);
    const loadingNoControlRecovery = await evaluate(
      client,
      page.sessionId,
      `(() => {
        const dialog = document.querySelector("#loading-no-control-dialog-probe");
        return dialog ? {
          open: dialog.open,
          busy: dialog.getAttribute("aria-busy"),
          activeInside: dialog.contains(document.activeElement),
          activeIsDialog: document.activeElement === dialog,
          activeTag: document.activeElement?.tagName ?? null,
          activeId: document.activeElement?.id ?? null
        } : null;
      })()`,
    );
    assert.deepEqual(
      loadingNoControlRecovery,
      {
        open: true,
        busy: "true",
        activeInside: true,
        activeIsDialog: true,
        activeTag: "DIALOG",
        activeId: "loading-no-control-dialog-probe",
      },
      "loading Dialog without enabled controls did not recover native close and focus",
    );
    await assertPageClean(page, "component browser edge probe");
    const axe = summarizeAxeScanReceipts(AXE_SCAN_RECEIPTS.slice(axeReceiptStart));
    assert.equal(axe.scan_count, 6, "browser edge probe axe scan count drifted");
    return {
      indeterminate_checkbox: { before, after, ax_checked: checkboxAx.properties.checked },
      programmatic_menu_initial_focus: programmaticMenuFocus,
      controlled_menu_close_refusal: controlledMenu,
      disabled_menu_roving_focus: disabledItem,
      menu_typeahead_href_space_activation: hrefMenuItem,
      conditional_dialog_focus_return: "pass",
      controlled_native_dialog_close_refusal: "pass",
      uncontrolled_nondismissible_native_close_refusal: "pass",
      loading_form_dialog_native_close_refusal: "pass",
      loading_no_control_native_close_refusal: loadingNoControlRecovery,
      axe,
    };
  } finally {
    await page.close();
  }
}

function aggregateViewportResults(presentations) {
  return VIEWPORTS.map((viewport) => {
    const appearanceResults = APPEARANCES.map((appearance) => {
      const result = presentations.find(
        (entry) => entry.viewport === viewport.label && entry.appearance === appearance,
      );
      assert.ok(result, `Missing ${viewport.label} ${appearance} presentation`);
      return {
        appearance,
        status: result.status,
        axe: result.axe,
        interactions: result.interactions,
      };
    });
    return {
      viewport: viewport.label,
      status: appearanceResults.every((entry) => entry.status === "pass")
        ? "pass"
        : "fail",
      appearances: appearanceResults,
    };
  });
}

function ensureFreshEvidenceDirectory(evidenceOut) {
  if (!evidenceOut) return;
  const approvedTemporaryRoots = [os.tmpdir(), "/tmp", "/private/tmp"];
  const isTemporaryPath = approvedTemporaryRoots.some((temporaryRoot) => {
    const relative = path.relative(temporaryRoot, evidenceOut);
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  });
  assert.ok(
    isTemporaryPath,
    `Browser evidence must be written beneath an explicit temporary directory (${approvedTemporaryRoots.join(", ")}).`,
  );
  if (fs.existsSync(evidenceOut)) {
    assert.deepEqual(
      fs.readdirSync(evidenceOut),
      [],
      `Evidence directory must be fresh and empty: ${evidenceOut}`,
    );
  } else {
    fs.mkdirSync(evidenceOut, { recursive: true });
  }
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  const {
    evidenceOut,
    edgeOnly,
    interactionsOnly,
    focusedViewportId,
    focusedAppearance,
  } = parseArgs(process.argv.slice(2));
  ensureFreshEvidenceDirectory(evidenceOut);
  const siteOutDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "judgmentkit-component-browser-site-"),
  );
  let localServer;

  try {
    await buildSite(siteOutDir);
    await buildBrowserEdgeProbe(siteOutDir);
    const built = validateBuiltAdapter(siteOutDir);
    const listener = await listenSiteLocalServer({
      host: "127.0.0.1",
      port: 0,
      siteDir: siteOutDir,
    });
    localServer = listener.server;
    const baseUrl = listener.url;
    const componentUrl = `${baseUrl}/design-system/components/`;
    if (edgeOnly) {
      const edgeResult = await withChromium(async (client, browserGetVersion) => ({
        browserGetVersion,
        browserEdgeProbe: await verifyBrowserEdgeProbe(client, baseUrl),
      }));
      process.stdout.write(
        `${JSON.stringify({
          status: "pass",
          scope: "component_browser_edge_probe",
          browser: edgeResult.browserGetVersion.product,
          receipts: edgeResult.browserEdgeProbe,
        })}\n`,
      );
      return;
    }
    if (interactionsOnly) {
      const focusedViewport = VIEWPORTS.find(
        (viewport) => viewport.id === focusedViewportId,
      );
      const focusedResult = await withChromium(async (client, browserGetVersion) => {
        await assertInteractionsIsolated(client, {
          componentUrl,
          viewport: focusedViewport,
          appearance: focusedAppearance,
          presentationLabel: `${focusedViewport.label} ${focusedAppearance}`,
        });
        return {
          browserGetVersion,
          axe: summarizeAxeScanReceipts(),
        };
      });
      process.stdout.write(
        `${JSON.stringify({
          status: "pass",
          scope: "isolated_component_interaction_groups",
          browser: focusedResult.browserGetVersion.product,
          groups: 9,
          viewport: focusedViewport.label,
          appearance: focusedAppearance,
          axe: focusedResult.axe,
        })}\n`,
      );
      return;
    }
    const presentationByScenario = new Map(
      RUNTIME_COMPONENT_SCENARIOS.map((scenario) => [scenario.id, []]),
    );
    const networkReceipts = [];
    const appearanceReceipts = [];
    const screenshotReceipts = [];
    const componentScreenshotById = new Map();
    const screenshotsDirectory = evidenceOut
      ? path.join(evidenceOut, "screenshots")
      : null;
    if (screenshotsDirectory) fs.mkdirSync(screenshotsDirectory, { recursive: true });

    const browserResult = await withChromium(async (client, browserGetVersion) => {
      for (const viewport of VIEWPORTS) {
        for (const appearance of APPEARANCES) {
          const presentationLabel = `${viewport.label} ${appearance}`;
          const page = await openPage(client, {
            url: componentUrl,
            viewport,
            colorScheme: appearance,
          });
          try {
            const ready = await assertPageReady(
              client,
              page.sessionId,
              page,
              viewport,
              appearance,
            );
            const networkBlocked = await verifyExternalNetworkBlocked(
              client,
              page.sessionId,
            );
            assert.equal(
              networkBlocked,
              true,
              `${presentationLabel}: external network request was not blocked`,
            );
            networkReceipts.push({
              viewport: viewport.label,
              appearance,
              origin: ready.origin,
              external_request_blocked: networkBlocked,
              isolation: "unreachable_loopback_proxy_with_explicit_loopback_bypass",
            });

            await injectAxe(client, page.sessionId);
            const fingerprint = await componentAppearanceFingerprint(
              client,
              page.sessionId,
            );
            assert.equal(fingerprint.length, EXPECTED_SCENARIO_COUNT);
            assert.equal(
              fingerprint.some((entry) => entry.missing),
              false,
              `${presentationLabel}: an appearance target is missing`,
            );
            appearanceReceipts.push({
              viewport: viewport.label,
              appearance,
              fingerprint,
            });

            for (const scenario of RUNTIME_COMPONENT_SCENARIOS) {
              await assertScenarioSemantics(client, page.sessionId, scenario, viewport);
              const axe = await runAxeForScenario(
                client,
                page.sessionId,
                scenario,
                presentationLabel,
              );
              presentationByScenario.get(scenario.id).push({
                viewport: viewport.label,
                appearance,
                status: "pass",
                axe,
                interactions: "pass",
              });
            }

            if (screenshotsDirectory && viewport.id === "desktop" && appearance === "light") {
              for (const componentId of RUNTIME_COMPONENT_IDS) {
                const filename = `component-${componentId}.png`;
                await captureElementScreenshot(
                  client,
                  page.sessionId,
                  `[data-component-contract=${JSON.stringify(componentId)}]`,
                  path.join(screenshotsDirectory, filename),
                );
                const relativePath = `screenshots/${filename}`;
                componentScreenshotById.set(componentId, relativePath);
                screenshotReceipts.push({
                  path: relativePath,
                  scope: "one_component_all_rendered_scenarios",
                  component_id: componentId,
                  scenario_ids: RUNTIME_COMPONENT_SCENARIOS
                    .filter((scenario) => scenario.contract_id === componentId)
                    .map((scenario) => scenario.id),
                  viewport: viewport.label,
                  appearance,
                });
              }
            }

            if (screenshotsDirectory) {
              const filename = `overview-${viewport.id}-${appearance}.png`;
              await captureScreenshot(
                client,
                page.sessionId,
                path.join(screenshotsDirectory, filename),
              );
              screenshotReceipts.push({
                path: `screenshots/${filename}`,
                scope: "viewport_top_only_not_scenario_evidence",
                component_id: null,
                scenario_ids: [],
                viewport: viewport.label,
                appearance,
              });
            }

            await assertPageClean(page, `${presentationLabel} static presentation`);
          } finally {
            await page.close();
          }
          await assertInteractionsIsolated(client, {
            componentUrl,
            viewport,
            appearance,
            presentationLabel,
          });
        }
      }

      for (const viewport of VIEWPORTS) {
        const light = appearanceReceipts.find(
          (entry) => entry.viewport === viewport.label && entry.appearance === "light",
        );
        const dark = appearanceReceipts.find(
          (entry) => entry.viewport === viewport.label && entry.appearance === "dark",
        );
        assert.ok(light && dark, `${viewport.label}: appearance receipts are incomplete`);
        for (const scenario of RUNTIME_COMPONENT_SCENARIOS) {
          const lightFingerprint = light.fingerprint.find(
            (entry) => entry.scenarioId === scenario.id,
          );
          const darkFingerprint = dark.fingerprint.find(
            (entry) => entry.scenarioId === scenario.id,
          );
          const appearanceFields = ({
            scenarioId: _scenarioId,
            componentId: _componentId,
            selector: _selector,
            ...fields
          }) => fields;
          assert.notDeepEqual(
            appearanceFields(lightFingerprint),
            appearanceFields(darkFingerprint),
            `${scenario.id} did not respond to dark mode at ${viewport.label}`,
          );
        }
      }

      const reducedMotion = await verifyReducedMotionRules(client, baseUrl);
      const forcedColors = await verifyForcedColorsRules(client, baseUrl);
      const browserEdgeProbe = await verifyBrowserEdgeProbe(client, baseUrl);
      return {
        browserGetVersion,
        reducedMotion,
        forcedColors,
        browserEdgeProbe,
      };
    });

    for (const [scenarioId, presentations] of presentationByScenario) {
      assert.equal(
        presentations.length,
        VIEWPORTS.length * APPEARANCES.length,
        `${scenarioId}: presentation count drifted`,
      );
    }
    const presentationCount = [...presentationByScenario.values()]
      .reduce((total, entries) => total + entries.length, 0);
    assert.equal(presentationCount, EXPECTED_PRESENTATION_COUNT);
    assert.equal(networkReceipts.length, VIEWPORTS.length * APPEARANCES.length);
    const axeSummary = summarizeAxeScanReceipts();
    assert.equal(
      axeSummary.scan_count,
      EXPECTED_PRESENTATION_COUNT + VIEWPORTS.length * APPEARANCES.length * 4 + 6,
      "full browser evidence axe scan count drifted",
    );
    assert.equal(axeSummary.violations_raw, 0, "raw axe violations escaped the gate");
    assert.equal(
      axeSummary.incomplete_unresolved,
      0,
      "unresolved axe incomplete escaped the gate",
    );
    assert.equal(
      axeSummary.incomplete_raw,
      axeSummary.incomplete_resolved,
      "axe incomplete resolution accounting drifted",
    );

    const generatedAt = new Date().toISOString();
    const runId = `component-adapter-browser-${generatedAt}`;
    const fixtureHash = sha256Files(SPECIMEN_SOURCES);
    const scenarios = RUNTIME_COMPONENT_SCENARIOS.map((scenario) => {
      const componentScreenshot = componentScreenshotById.get(scenario.contract_id);
      const presentations = presentationByScenario.get(scenario.id);
      return {
        id: scenario.id,
        contract_id: scenario.contract_id,
        state: scenario.state,
        status: "browser_candidate_pass",
        contract_hash: built.contractHashes[scenario.contract_id],
        implementation_hash: built.implementationHashes[scenario.contract_id],
        specimen_fixture_hash: fixtureHash,
        fixture_output_hash: built.fixtureOutputHashes[scenario.contract_id],
        output_hash: built.outputHashes[scenario.contract_id],
        evidence_refs: [
          "tests/components/component-browser.test.mjs",
          ...(componentScreenshot ? [componentScreenshot] : []),
        ],
        viewport_results: aggregateViewportResults(presentations),
      };
    });
    const candidate = {
      schema_version: 1,
      evidence_kind: "component_library_adapter_browser_candidate",
      candidate: true,
      verification_claim: "browser_gate_pass_only_not_current_verified_evidence",
      run_id: runId,
      generated_at: generatedAt,
      adapter: {
        id: COMPONENT_RUNTIME_ADAPTER.id,
        status: COMPONENT_RUNTIME_ADAPTER.status,
      },
      browser_version: browserResult.browserGetVersion.product,
      browser_get_version: browserResult.browserGetVersion,
      package_status: "not_run_requires_separate_package_gate",
      automated_accessibility_status: "pass",
      reviewer_receipt: null,
      reviewer_receipt_requirement:
        "A new machine-readable reviewer receipt bound to all 17 components, 65 scenarios, 260 presentations, current hashes, and this run is required before any scenario may become verified.",
      historical_pilot_receipt_reused: false,
      unsupported_claims: [...COMPONENT_RUNTIME_ADAPTER.support_limits],
      component_count: EXPECTED_COMPONENT_COUNT,
      scenario_count: EXPECTED_SCENARIO_COUNT,
      presentation_count: EXPECTED_PRESENTATION_COUNT,
      component_ids: [...RUNTIME_COMPONENT_IDS],
      scenario_ids: RUNTIME_COMPONENT_SCENARIOS.map((scenario) => scenario.id),
      required_viewports: VIEWPORTS.map((viewport) => viewport.label),
      required_appearances: [...APPEARANCES],
      axe: {
        version: readJson(path.join(REPO_ROOT, "node_modules", "axe-core", "package.json")).version,
        resolution_policy:
          "Raw axe incomplete nodes are retained. Only color-contrast elmPartiallyObscuring nodes on an exact open native JudgmentKit Dialog title or body paragraph may be resolved, and only after every live text-rect stack reaches the same dialog with no foreign element before it and an independent WCAG contrast calculation passes against the first opaque ancestor. All other incomplete nodes fail the gate.",
        ...axeSummary,
        presentation_scans: EXPECTED_PRESENTATION_COUNT,
        open_dialog_scans: VIEWPORTS.length * APPEARANCES.length * 4,
        browser_edge_probe_scans: 6,
        resolution_receipts: AXE_SCAN_RECEIPTS
          .filter((receipt) => receipt.incomplete_raw > 0)
          .map((receipt) => ({
            label: receipt.label,
            count_unit: receipt.count_unit,
            incomplete_raw: receipt.incomplete_raw,
            incomplete_resolved: receipt.incomplete_resolved,
            incomplete_unresolved: receipt.incomplete_unresolved,
            raw_incomplete: receipt.raw_incomplete,
            resolved_findings: receipt.resolved_findings,
            unresolved_findings: receipt.unresolved_findings,
          })),
      },
      contract_hashes: built.contractHashes,
      implementation_hash: built.implementationHash,
      implementation_hashes: built.implementationHashes,
      implementation_sources: built.implementationSources,
      specimen_sources: [...SPECIMEN_SOURCES],
      specimen_fixture_hash: fixtureHash,
      fixture_output_hashes: built.fixtureOutputHashes,
      output_hashes: built.outputHashes,
      network_isolation: {
        policy: "unreachable_loopback_proxy_with_explicit_loopback_bypass",
        local_origin: baseUrl,
        external_network: "blocked",
        receipts: networkReceipts,
      },
      appearance_receipts: appearanceReceipts,
      media_feature_receipts: {
        reduced_motion: browserResult.reducedMotion,
        forced_colors: browserResult.forcedColors,
      },
      browser_edge_receipts: browserResult.browserEdgeProbe,
      screenshot_scope:
        "Scenario references include only the desktop-light per-component capture containing that scenario. Viewport-top overview captures are explicitly excluded from scenario evidence refs.",
      screenshots: screenshotReceipts,
      scenarios,
    };
    const {
      reviewer_receipt: _excludedReviewerReceipt,
      automated_evidence_hash: _excludedAutomatedEvidenceHash,
      ...automatedEvidencePayload
    } = candidate;
    candidate.automated_evidence_hash = hashCanonical(automatedEvidencePayload);

    let candidatePath = null;
    if (evidenceOut) {
      candidatePath = path.join(
        evidenceOut,
        "component-library-adapter-browser-candidate.json",
      );
      fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
    }
    process.stdout.write(
      `${JSON.stringify({
        status: "pass",
        run_id: runId,
        browser: browserResult.browserGetVersion.product,
        components: EXPECTED_COMPONENT_COUNT,
        scenarios: EXPECTED_SCENARIO_COUNT,
        presentations: EXPECTED_PRESENTATION_COUNT,
        axe: axeSummary,
        candidate_path: candidatePath,
        reviewer_receipt: null,
      })}\n`,
    );
  } finally {
    await closeServer(localServer);
    fs.rmSync(siteOutDir, { recursive: true, force: true });
  }
}

await main();
