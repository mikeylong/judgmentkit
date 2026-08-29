import assert from "node:assert/strict";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ActionGroup,
  Alert,
  Card,
  CheckboxField,
  CheckboxGroup,
  Panel,
  RadioGroup,
  SelectField,
  Table,
  TextArea,
} from "../../src/react/native-components.mjs";

const h = createElement;

function render(component, props, ...children) {
  return renderToStaticMarkup(h(component, props, ...children));
}

function count(markup, pattern) {
  return [...markup.matchAll(pattern)].length;
}

const actionGroupMarkup = render(
  ActionGroup,
  { id: "review-actions", label: "Review actions" },
  h("button", { type: "button" }, "Approve"),
  h("button", { type: "button" }, "Return"),
);
assert.match(actionGroupMarkup, /role="group"/);
assert.match(actionGroupMarkup, /aria-labelledby="review-actions-label"/);
assert.match(actionGroupMarkup, /data-jk-component="action_group"/);
assert.match(actionGroupMarkup, /data-jk-base-state="ready"/);
assert.equal(count(actionGroupMarkup, /<button/g), 2);

const externallyLabelledActionGroupMarkup = render(
  ActionGroup,
  {
    id: "external-review-actions",
    label: "Review actions",
    "aria-labelledby": "decision-heading external-action-context",
  },
  h("button", { type: "button" }, "Approve"),
);
assert.match(
  externallyLabelledActionGroupMarkup,
  /aria-labelledby="decision-heading external-action-context"/,
);
assert.doesNotMatch(
  externallyLabelledActionGroupMarkup,
  /aria-labelledby="external-review-actions-label"/,
);

const disabledActionGroupMarkup = render(
  ActionGroup,
  { id: "locked-actions", label: "Locked actions", disabled: true },
  h(
    Fragment,
    null,
    h("button", { type: "button" }, "Approve"),
    h("a", { href: "/policy" }, "Open policy"),
  ),
);
assert.match(disabledActionGroupMarkup, /data-jk-base-state="disabled"/);
assert.match(disabledActionGroupMarkup, /aria-disabled="true"/);
assert.doesNotMatch(disabledActionGroupMarkup, /inert=/);
assert.match(disabledActionGroupMarkup, /<button type="button" disabled=""/);
assert.doesNotMatch(disabledActionGroupMarkup, /href="\/policy"/);
assert.match(disabledActionGroupMarkup, /tabindex="-1"/);

const nestedDisabledActionGroupMarkup = render(
  ActionGroup,
  { id: "nested-actions", label: "Nested actions", disabled: true },
  h("div", null, h("button", { type: "button" }, "Nested action")),
);
assert.doesNotMatch(nestedDisabledActionGroupMarkup, /<div disabled=/);
assert.match(
  nestedDisabledActionGroupMarkup,
  /<button type="button" disabled="">Nested action<\/button>/,
);

const defaultTextAreaMarkup = render(TextArea, {
  id: "review-notes",
  label: "Review notes",
  defaultValue: "Needs policy evidence.",
  helpText: "Explain the decision.",
});
assert.match(defaultTextAreaMarkup, /for="review-notes"/);
assert.match(defaultTextAreaMarkup, /<textarea[^>]*id="review-notes"/);
assert.match(defaultTextAreaMarkup, /aria-describedby="review-notes-help"/);
assert.match(defaultTextAreaMarkup, />Needs policy evidence\.<\/textarea>/);
assert.match(defaultTextAreaMarkup, /data-jk-base-state="ready"/);

const controlledTextAreaMarkup = render(TextArea, {
  id: "required-notes",
  label: "Decision reason",
  value: "",
  required: true,
  errorMessage: "Decision reason is required.",
});
assert.match(controlledTextAreaMarkup, /required=""/);
assert.match(
  controlledTextAreaMarkup,
  /aria-describedby="required-notes-error"/,
);
assert.match(controlledTextAreaMarkup, /aria-errormessage="required-notes-error"/);
assert.match(controlledTextAreaMarkup, /aria-invalid="true"/);
assert.match(controlledTextAreaMarkup, /data-jk-base-state="error"/);

const disabledTextAreaMarkup = render(TextArea, {
  id: "locked-notes",
  label: "Decision reason",
  disabled: true,
  disabledReason: "The review is already approved.",
});
assert.match(disabledTextAreaMarkup, /disabled=""/);
assert.match(disabledTextAreaMarkup, /locked-notes-disabled-reason/);
assert.match(disabledTextAreaMarkup, /The review is already approved\./);
assert.match(disabledTextAreaMarkup, /data-jk-base-state="disabled"/);

const generatedTextAreaMarkup = render(TextArea, {
  label: "Generated identifier",
});
const generatedTextAreaId = generatedTextAreaMarkup.match(/for="([^"]+)"/)?.[1];
assert.ok(generatedTextAreaId);
assert.doesNotMatch(generatedTextAreaId, /:/);
assert.match(generatedTextAreaMarkup, new RegExp(`id="${generatedTextAreaId}"`));

const defaultSelectMarkup = render(SelectField, {
  id: "review-owner",
  label: "Review owner",
  defaultValue: "policy",
  options: [
    { value: "ops", label: "Operations" },
    { value: "policy", label: "Policy" },
  ],
});
assert.match(defaultSelectMarkup, /<select[^>]*id="review-owner"/);
assert.match(defaultSelectMarkup, /<option value="policy" selected="">Policy<\/option>/);
assert.match(defaultSelectMarkup, /data-jk-base-state="ready"/);

const implicitEmptySelectMarkup = render(SelectField, {
  id: "unassigned-owner",
  label: "Review owner",
  options: [
    { value: "ops", label: "Operations" },
    { value: "policy", label: "Policy" },
  ],
});
assert.match(
  implicitEmptySelectMarkup,
  /<option value="" selected="">Select an option<\/option>/,
);
assert.match(implicitEmptySelectMarkup, /data-jk-base-state="empty"/);

const unknownSelectValueMarkup = render(SelectField, {
  id: "unknown-owner",
  label: "Review owner",
  defaultValue: "missing",
  options: [
    { value: "ops", label: "Operations" },
    { value: "policy", label: "Policy" },
  ],
});
assert.match(unknownSelectValueMarkup, /data-jk-base-state="empty"/);
assert.match(
  unknownSelectValueMarkup,
  /<option value="" selected="">Select an option<\/option>/,
);

const controlledSelectMarkup = render(SelectField, {
  id: "review-state",
  label: "Review state",
  value: "",
  placeholder: "Choose a state",
  required: true,
  errorMessage: "Choose a review state.",
  options: ["Open", "Closed"],
});
assert.match(
  controlledSelectMarkup,
  /<option value="" disabled="" selected="">Choose a state<\/option>/,
);
assert.match(controlledSelectMarkup, /aria-errormessage="review-state-error"/);
assert.match(controlledSelectMarkup, /data-jk-base-state="error"/);

const disabledSelectMarkup = render(SelectField, {
  id: "locked-owner",
  label: "Review owner",
  defaultValue: "policy",
  disabled: true,
  disabledReason: "Ownership is fixed after assignment.",
  options: [{ value: "policy", label: "Policy" }],
});
assert.match(disabledSelectMarkup, /<select[^>]*disabled=""/);
assert.match(disabledSelectMarkup, /locked-owner-disabled-reason/);
assert.match(disabledSelectMarkup, /data-jk-base-state="disabled"/);

const defaultCheckboxMarkup = render(CheckboxField, {
  id: "include-evidence",
  label: "Include evidence",
  description: "Attach the current receipt.",
  defaultChecked: true,
});
assert.match(defaultCheckboxMarkup, /type="checkbox"/);
assert.match(defaultCheckboxMarkup, /checked=""/);
assert.match(defaultCheckboxMarkup, /data-jk-checked="true"/);
assert.match(
  defaultCheckboxMarkup,
  /aria-describedby="include-evidence-description"/,
);

const controlledCheckboxMarkup = render(CheckboxField, {
  id: "policy-confirmed",
  label: "Policy confirmed",
  checked: false,
  errorMessage: "Confirm the policy before approval.",
});
assert.doesNotMatch(controlledCheckboxMarkup, /checked=""/);
assert.match(controlledCheckboxMarkup, /aria-invalid="true"/);
assert.match(controlledCheckboxMarkup, /data-jk-base-state="error"/);

const mixedCheckboxMarkup = render(CheckboxField, {
  id: "partial-selection",
  label: "Select all evidence",
  indeterminate: true,
});
assert.match(mixedCheckboxMarkup, /aria-checked="mixed"/);
assert.match(mixedCheckboxMarkup, /data-jk-checked="mixed"/);

const defaultCheckboxGroupMarkup = render(CheckboxGroup, {
  id: "evidence-types",
  legend: "Evidence types",
  helpText: "Choose every applicable source.",
  defaultValue: ["policy", "receipt"],
  options: [
    { value: "policy", label: "Policy" },
    { value: "receipt", label: "Receipt" },
    { value: "notes", label: "Notes" },
  ],
});
assert.match(defaultCheckboxGroupMarkup, /<fieldset[^>]*id="evidence-types"/);
assert.match(defaultCheckboxGroupMarkup, /<legend[^>]*>Evidence types<\/legend>/);
assert.match(defaultCheckboxGroupMarkup, /data-jk-component="checkbox_group"/);
assert.equal(count(defaultCheckboxGroupMarkup, /type="checkbox"/g), 3);
assert.equal(count(defaultCheckboxGroupMarkup, /checked=""/g), 2);

const controlledCheckboxGroupMarkup = render(CheckboxGroup, {
  id: "controlled-evidence",
  legend: "Evidence types",
  value: [],
  errorMessage: "Choose at least one evidence type.",
  options: [
    { value: "policy", label: "Policy" },
    { value: "receipt", label: "Receipt" },
  ],
});
assert.equal(count(controlledCheckboxGroupMarkup, /checked=""/g), 0);
assert.match(controlledCheckboxGroupMarkup, /aria-invalid="true"/);
assert.match(controlledCheckboxGroupMarkup, /data-jk-base-state="error"/);

const disabledCheckboxGroupMarkup = render(CheckboxGroup, {
  id: "locked-evidence",
  legend: "Evidence types",
  disabled: true,
  disabledReason: "Evidence is locked after approval.",
  options: [{ value: "policy", label: "Policy" }],
});
assert.match(disabledCheckboxGroupMarkup, /<fieldset[^>]*disabled=""/);
assert.match(disabledCheckboxGroupMarkup, /data-jk-base-state="disabled"/);
assert.match(disabledCheckboxGroupMarkup, /Evidence is locked after approval\./);

const emptyRadioGroupMarkup = render(RadioGroup, {
  id: "decision",
  name: "decision",
  legend: "Decision",
  value: null,
  options: [
    { value: "approve", label: "Approve" },
    { value: "return", label: "Return" },
  ],
});
assert.match(emptyRadioGroupMarkup, /<fieldset[^>]*data-jk-base-state="empty"/);
assert.equal(count(emptyRadioGroupMarkup, /type="radio"/g), 2);
assert.equal(count(emptyRadioGroupMarkup, /name="decision"/g), 2);
assert.equal(count(emptyRadioGroupMarkup, /checked=""/g), 0);

const defaultRadioGroupMarkup = render(RadioGroup, {
  id: "priority",
  legend: "Priority",
  defaultValue: "high",
  options: [
    { value: "low", label: "Low" },
    { value: "high", label: "High" },
  ],
});
assert.match(defaultRadioGroupMarkup, /data-jk-base-state="ready"/);
assert.equal(count(defaultRadioGroupMarkup, /checked=""/g), 1);
assert.match(defaultRadioGroupMarkup, /checked="" value="high"/);
const generatedRadioName = defaultRadioGroupMarkup.match(/name="([^"]+)"/)?.[1];
assert.ok(generatedRadioName);
assert.equal(count(defaultRadioGroupMarkup, new RegExp(`name="${generatedRadioName}"`, "g")), 2);

const unknownRadioValueMarkup = render(RadioGroup, {
  id: "unknown-decision",
  legend: "Decision",
  defaultValue: "missing",
  options: [
    { value: "approve", label: "Approve" },
    { value: "return", label: "Return" },
  ],
});
assert.match(unknownRadioValueMarkup, /data-jk-base-state="empty"/);
assert.equal(count(unknownRadioValueMarkup, /checked=""/g), 0);

const disabledRadioGroupMarkup = render(RadioGroup, {
  id: "locked-priority",
  legend: "Priority",
  disabled: true,
  defaultValue: "high",
  disabledReason: "Priority is fixed.",
  options: [{ value: "high", label: "High" }],
});
assert.match(disabledRadioGroupMarkup, /<fieldset[^>]*disabled=""/);
assert.match(disabledRadioGroupMarkup, /data-jk-base-state="disabled"/);

const informationalAlertMarkup = render(
  Alert,
  { tone: "info", title: "Evidence updated" },
  "The latest receipt is now attached.",
);
assert.match(informationalAlertMarkup, /role="status"/);
assert.match(informationalAlertMarkup, /aria-live="polite"/);
assert.match(informationalAlertMarkup, />Information:<\/span>/);
assert.match(informationalAlertMarkup, /data-jk-base-state="ready"/);

const riskAlertMarkup = render(
  Alert,
  {
    tone: "error",
    action: h("button", { type: "button" }, "Review evidence"),
  },
  "Approval is blocked.",
);
assert.match(riskAlertMarkup, /role="alert"/);
assert.match(riskAlertMarkup, /aria-live="assertive"/);
assert.match(riskAlertMarkup, />Error:<\/span>/);
assert.match(riskAlertMarkup, /<button type="button">Review evidence<\/button>/);

const readyTableMarkup = render(Table, {
  caption: "Review queue",
  columns: [
    { key: "request", header: "Request", rowHeader: true },
    { key: "status", header: "Status" },
  ],
  rows: [
    { id: "r-1", request: "Refund 104", status: "Needs evidence" },
    { id: "r-2", request: "Refund 105", status: "Ready" },
  ],
});
assert.match(readyTableMarkup, /<caption[^>]*>Review queue<\/caption>/);
assert.equal(count(readyTableMarkup, /scope="col"/g), 2);
assert.equal(count(readyTableMarkup, /scope="row"/g), 2);
assert.match(readyTableMarkup, /data-jk-base-state="ready"/);
assert.doesNotMatch(readyTableMarkup, /data-jk-table-state-row/);

const emptyTableMarkup = render(Table, {
  caption: "Review queue",
  columns: [{ key: "request", header: "Request" }],
  rows: [],
  emptyMessage: "No reviews need attention.",
});
assert.match(emptyTableMarkup, /data-jk-base-state="empty"/);
assert.match(emptyTableMarkup, /data-jk-table-state-row="empty"/);
assert.match(emptyTableMarkup, /role="status"/);
assert.match(emptyTableMarkup, /No reviews need attention\./);

const loadingTableMarkup = render(Table, {
  caption: "Review queue",
  columns: [{ key: "request", header: "Request" }],
  rows: [{ request: "Stale row" }],
  loading: true,
  loadingMessage: "Loading current reviews.",
});
assert.match(loadingTableMarkup, /aria-busy="true"/);
assert.match(loadingTableMarkup, /data-jk-base-state="loading"/);
assert.match(loadingTableMarkup, /Loading current reviews\./);
assert.doesNotMatch(loadingTableMarkup, /Stale row/);

const errorTableMarkup = render(Table, {
  "aria-label": "Review queue",
  columns: [{ key: "request", header: "Request" }],
  rows: [],
  errorMessage: "The review queue could not be loaded.",
});
assert.match(errorTableMarkup, /aria-label="Review queue"/);
assert.match(errorTableMarkup, /aria-invalid="true"/);
assert.match(errorTableMarkup, /data-jk-base-state="error"/);
assert.match(errorTableMarkup, /role="alert"/);

const panelMarkup = render(
  Panel,
  {
    id: "policy-evidence",
    heading: "Policy evidence",
    headingLevel: 3,
    actions: h("button", { type: "button" }, "Add evidence"),
  },
  "Current policy receipt",
);
assert.match(panelMarkup, /<section[^>]*role="region"/);
assert.match(panelMarkup, /aria-labelledby="policy-evidence-heading"/);
assert.match(panelMarkup, /<h3[^>]*id="policy-evidence-heading"/);
assert.match(panelMarkup, /data-jk-base-state="ready"/);

const externallyLabelledPanelMarkup = render(
  Panel,
  {
    id: "external-policy-evidence",
    "aria-labelledby": "policy-heading policy-context",
  },
  "Current policy receipt",
);
assert.match(externallyLabelledPanelMarkup, /role="region"/);
assert.match(
  externallyLabelledPanelMarkup,
  /aria-labelledby="policy-heading policy-context"/,
);

const loadingPanelMarkup = render(
  Panel,
  {
    id: "loading-evidence",
    heading: "Policy evidence",
    state: "loading",
    loadingMessage: "Loading evidence.",
  },
  "Previous evidence",
);
assert.match(loadingPanelMarkup, /aria-busy="true"/);
assert.match(loadingPanelMarkup, /role="status"/);
assert.match(loadingPanelMarkup, /data-jk-base-state="loading"/);

const errorPanelMarkup = render(Panel, {
  id: "failed-evidence",
  heading: "Policy evidence",
  state: "error",
  errorMessage: "Evidence is unavailable.",
});
assert.match(errorPanelMarkup, /aria-invalid="true"/);
assert.match(errorPanelMarkup, /role="alert"/);
assert.match(errorPanelMarkup, /data-jk-base-state="error"/);

const staticCardMarkup = render(
  Card,
  {
    id: "request-104",
    title: "Refund 104",
    summary: "Needs policy evidence.",
    metadata: "Submitted today",
  },
  "No action is available yet.",
);
assert.match(staticCardMarkup, /^<article/);
assert.match(staticCardMarkup, /aria-labelledby="request-104-heading"/);
assert.match(staticCardMarkup, /data-jk-action-type="none"/);
assert.match(staticCardMarkup, /data-jk-base-state="ready"/);
assert.doesNotMatch(staticCardMarkup, /<(?:a|button)\b/);

const externallyLabelledCardMarkup = render(
  Card,
  {
    id: "request-external",
    title: "Refund external",
    "aria-labelledby": "queue-heading request-context",
  },
  "External naming context.",
);
assert.match(
  externallyLabelledCardMarkup,
  /aria-labelledby="queue-heading request-context"/,
);
assert.doesNotMatch(
  externallyLabelledCardMarkup,
  /aria-labelledby="request-external-heading"/,
);

const linkCardMarkup = render(Card, {
  id: "request-105",
  title: "Refund 105",
  summary: h("a", { href: "/policy" }, "Open governing policy"),
  action: {
    type: "link",
    label: "Review refund",
    href: "/reviews/105",
  },
});
assert.match(linkCardMarkup, /^<article/);
assert.match(linkCardMarkup, /data-jk-action-type="link"/);
assert.equal(count(linkCardMarkup, /<a\b/g), 2);
assert.match(linkCardMarkup, /href="\/reviews\/105"/);
assert.doesNotMatch(linkCardMarkup, /<a[^>]*>[^<]*<a/u);

const buttonCardMarkup = render(Card, {
  id: "request-106",
  title: "Refund 106",
  action: {
    type: "button",
    label: "Approve refund",
    onClick() {},
  },
});
assert.match(buttonCardMarkup, /<button[^>]*type="button"/);
assert.match(buttonCardMarkup, /data-jk-card-action="button"/);
assert.match(buttonCardMarkup, /data-jk-action-type="button"/);

const disabledLinkCardMarkup = render(Card, {
  id: "request-107",
  title: "Refund 107",
  disabled: true,
  action: {
    type: "link",
    label: "Review refund",
    href: "/reviews/107",
  },
});
assert.match(disabledLinkCardMarkup, /data-jk-base-state="disabled"/);
assert.match(disabledLinkCardMarkup, /aria-disabled="true"/);
assert.doesNotMatch(disabledLinkCardMarkup, /href="\/reviews\/107"/);
assert.doesNotMatch(disabledLinkCardMarkup, /<a\b/);

const actionOnlyDisabledCardMarkup = render(
  Card,
  {
    id: "request-action-disabled",
    title: "Refund action disabled",
    action: {
      type: "button",
      label: "Review refund",
      disabled: true,
    },
  },
  h("button", { type: "button" }, "Independent child action"),
);
assert.match(actionOnlyDisabledCardMarkup, /data-jk-base-state="ready"/);
assert.match(actionOnlyDisabledCardMarkup, /data-jk-disabled="false"/);
assert.match(
  actionOnlyDisabledCardMarkup,
  /<button[^>]*disabled=""[^>]*>Review refund<\/button>/,
);
assert.match(
  actionOnlyDisabledCardMarkup,
  /<button type="button">Independent child action<\/button>/,
);

const disabledCardDescendantsMarkup = render(
  Card,
  {
    id: "request-108",
    title: "Refund 108",
    summary: h("a", { href: "/policy" }, "Open policy"),
    disabled: true,
    action: {
      type: "button",
      label: "Review refund",
    },
  },
  h("button", { type: "button" }, "Secondary action"),
);
assert.doesNotMatch(disabledCardDescendantsMarkup, /href="\/policy"/);
assert.match(
  disabledCardDescendantsMarkup,
  /<a aria-disabled="true" tabindex="-1">Open policy<\/a>/,
);
assert.match(
  disabledCardDescendantsMarkup,
  /<button type="button" disabled="">Secondary action<\/button>/,
);

assert.throws(
  () => render(Card, { title: "Unsafe card", onClick() {} }),
  /wrappers are noninteractive/,
);
assert.throws(
  () => render(Card, {
    title: "Ambiguous card",
    action: { type: "link", href: "/ambiguous" },
  }),
  /visible label/,
);
assert.throws(
  () => render(Card, {
    title: "Broken link card",
    action: { type: "link", label: "Open" },
  }),
  /require href/,
);

console.log("native component tests passed");
