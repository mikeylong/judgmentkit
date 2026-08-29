import React, { createElement, useRef, useState } from "react";
import {
  ActionButton,
  ActionGroup,
  Alert,
  Card,
  CheckboxField,
  CheckboxGroup,
  Dialog,
  FormField,
  Menu,
  Panel,
  RadioGroup,
  SelectField,
  StatusMessage,
  Table,
  TextArea,
  TextField,
  Tabs,
  Toggle,
} from "judgmentkit/react";

const h = createElement;

export const RUNTIME_COMPONENT_IDS = Object.freeze([
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

const scenario = (contractId, state, fixture) =>
  Object.freeze({
    id: `${contractId}.${state}`,
    contract_id: contractId,
    state,
    status: "unverified",
    fixture: Object.freeze(fixture),
  });

// These are deterministic render fixtures, not evidence claims. The build may
// provide current status and evidence metadata for the same scenario IDs.
export const RUNTIME_COMPONENT_SCENARIOS = Object.freeze([
  scenario("action_button", "ready", {
    label: "Approve refund",
    loading_label: "Approving refund…",
    tone: "decision",
    counter_label: "Activations",
    transition: "loading",
  }),
  scenario("action_button", "disabled", {
    label: "Approve refund",
    tone: "decision",
    description: "Unavailable until receipt evidence is complete.",
    counter_label: "Activations",
  }),
  scenario("action_button", "focus-visible", {
    label: "Approve refund",
    tone: "decision",
    counter_label: "Activations",
  }),
  scenario("action_button", "loading", {
    label: "Approve refund",
    loading_label: "Approving refund…",
    tone: "decision",
    description: "The decision is being recorded.",
    counter_label: "Activations",
  }),

  scenario("form_field", "empty", {
    label: "Decision reason",
    help_text: "Explain the policy basis for this decision.",
    value: "",
    counter_label: "Changes",
  }),
  scenario("form_field", "ready", {
    label: "Decision reason",
    help_text: "Explain the policy basis for this decision.",
    value: "Receipt confirms the eligible purchase.",
    counter_label: "Changes",
  }),
  scenario("form_field", "error", {
    label: "Decision reason",
    help_text: "Explain the policy basis for this decision.",
    value: "",
    error_message: "Add a reason before continuing.",
    counter_label: "Changes",
  }),
  scenario("form_field", "disabled", {
    label: "Decision reason",
    help_text: "Explain the policy basis for this decision.",
    value: "Waiting for receipt evidence",
    disabled_reason: "Editing unlocks when receipt evidence is complete.",
    counter_label: "Changes",
  }),
  scenario("form_field", "focus-visible", {
    label: "Decision reason",
    help_text: "Explain the policy basis for this decision.",
    value: "Receipt confirms the eligible purchase.",
    counter_label: "Changes",
  }),

  scenario("text_field", "empty", {
    label: "Case reference",
    help_text: "Use the reference shown on the receipt.",
    value: "",
    counter_label: "Changes",
  }),
  scenario("text_field", "ready", {
    label: "Case reference",
    help_text: "Use the reference shown on the receipt.",
    value: "RF-1842",
    counter_label: "Changes",
    control_mode: "controlled_update",
  }),
  scenario("text_field", "error", {
    label: "Case reference",
    help_text: "Use the reference shown on the receipt.",
    value: "1842",
    error_message: "Enter the full reference, including RF-.",
    counter_label: "Changes",
    control_mode: "controlled_reject",
  }),
  scenario("text_field", "disabled", {
    label: "Case reference",
    help_text: "Use the reference shown on the receipt.",
    value: "RF-1842",
    disabled_reason: "The reference is locked after review begins.",
    counter_label: "Changes",
  }),
  scenario("text_field", "focus-visible", {
    label: "Case reference",
    help_text: "Use the reference shown on the receipt.",
    value: "RF-1842",
    counter_label: "Changes",
  }),

  scenario("toggle", "ready", {
    label: "Require manager approval",
    description: "Keep this on for policy exceptions above $250.",
    checked: true,
    counter_label: "Changes",
    control_mode: "controlled_update",
  }),
  scenario("toggle", "disabled", {
    label: "Require manager approval",
    description: "This setting is locked while approval is pending.",
    checked: true,
    counter_label: "Changes",
  }),
  scenario("toggle", "focus-visible", {
    label: "Require manager approval",
    description: "Keep this on for policy exceptions above $250.",
    checked: false,
    counter_label: "Changes",
  }),

  scenario("status_message", "ready", {
    label: "Decision recorded",
    message: "Refund RF-1842 is ready for handoff.",
    action_label: "Open receipt",
    counter_label: "Activations",
    transition: "loading",
  }),
  scenario("status_message", "loading", {
    label: "Saving decision",
    message: "Recording the refund decision and receipt.",
  }),
  scenario("status_message", "error", {
    label: "Handoff blocked",
    message: "Add the missing receipt evidence before handoff.",
    action_label: "Review evidence",
    counter_label: "Activations",
  }),

  scenario("action_group", "ready", {
    label: "Refund review actions",
    primary_label: "Approve refund",
    secondary_label: "Return for evidence",
    counter_label: "Activations",
  }),
  scenario("action_group", "disabled", {
    label: "Refund review actions unavailable",
    primary_label: "Approve refund",
    secondary_label: "Return for evidence",
    counter_label: "Activations",
  }),
  scenario("action_group", "focus-visible", {
    label: "Refund review actions",
    primary_label: "Approve refund",
    secondary_label: "Return for evidence",
    counter_label: "Activations",
  }),

  scenario("text_area", "empty", {
    label: "Review note",
    help_text: "Summarize the evidence and decision rationale.",
    value: "",
    counter_label: "Changes",
  }),
  scenario("text_area", "ready", {
    label: "Review note",
    help_text: "Summarize the evidence and decision rationale.",
    value: "The receipt and policy both support a refund.",
    counter_label: "Changes",
    control_mode: "controlled_update",
  }),
  scenario("text_area", "error", {
    label: "Review note",
    help_text: "Summarize the evidence and decision rationale.",
    value: "",
    error_message: "Add the evidence basis before continuing.",
    counter_label: "Changes",
    control_mode: "controlled_reject",
  }),
  scenario("text_area", "disabled", {
    label: "Review note",
    help_text: "Summarize the evidence and decision rationale.",
    value: "Manager review is in progress.",
    disabled_reason: "Notes are locked while manager review is in progress.",
    counter_label: "Changes",
  }),
  scenario("text_area", "focus-visible", {
    label: "Review note",
    help_text: "Summarize the evidence and decision rationale.",
    value: "The receipt and policy both support a refund.",
    counter_label: "Changes",
  }),

  scenario("select_field", "empty", {
    label: "Review owner",
    help_text: "Assign the team responsible for the next decision.",
    value: "",
    placeholder: "Choose a review owner",
    counter_label: "Changes",
  }),
  scenario("select_field", "ready", {
    label: "Review owner",
    help_text: "Assign the team responsible for the next decision.",
    value: "policy",
    placeholder: "Choose a review owner",
    counter_label: "Changes",
    control_mode: "controlled_update",
  }),
  scenario("select_field", "error", {
    label: "Review owner",
    help_text: "Assign the team responsible for the next decision.",
    value: "",
    placeholder: "Choose a review owner",
    error_message: "Choose an owner before handoff.",
    counter_label: "Changes",
    control_mode: "controlled_reject",
  }),
  scenario("select_field", "disabled", {
    label: "Review owner",
    help_text: "Assign the team responsible for the next decision.",
    value: "policy",
    placeholder: "Choose a review owner",
    disabled_reason: "Ownership is locked after handoff begins.",
    counter_label: "Changes",
  }),
  scenario("select_field", "focus-visible", {
    label: "Review owner",
    help_text: "Assign the team responsible for the next decision.",
    value: "operations",
    placeholder: "Choose a review owner",
    counter_label: "Changes",
  }),

  scenario("checkbox_group", "ready", {
    legend: "Evidence included",
    help_text: "Choose every source used for this decision.",
    values: ["receipt", "policy"],
    counter_label: "Changes",
    control_mode: "controlled_update",
  }),
  scenario("checkbox_group", "error", {
    legend: "Evidence included",
    help_text: "Choose every source used for this decision.",
    values: [],
    error_message: "Choose at least one evidence source.",
    counter_label: "Changes",
    control_mode: "controlled_reject",
  }),
  scenario("checkbox_group", "disabled", {
    legend: "Evidence included",
    help_text: "Choose every source used for this decision.",
    values: ["receipt"],
    disabled_reason: "Evidence selections are locked after approval.",
    counter_label: "Changes",
  }),
  scenario("checkbox_group", "focus-visible", {
    legend: "Evidence included",
    help_text: "Choose every source used for this decision.",
    values: ["receipt"],
    counter_label: "Changes",
  }),

  scenario("radio_group", "empty", {
    legend: "Refund decision",
    help_text: "Choose one decision for this request.",
    value: "",
    counter_label: "Changes",
    control_mode: "controlled_update",
  }),
  scenario("radio_group", "ready", {
    legend: "Refund decision",
    help_text: "Choose one decision for this request.",
    value: "approve",
    counter_label: "Changes",
  }),
  scenario("radio_group", "error", {
    legend: "Refund decision",
    help_text: "Choose one decision for this request.",
    value: "",
    error_message: "Choose a decision before handoff.",
    counter_label: "Changes",
    control_mode: "controlled_reject",
  }),
  scenario("radio_group", "disabled", {
    legend: "Refund decision",
    help_text: "Choose one decision for this request.",
    value: "approve",
    disabled_reason: "The recorded decision cannot be changed during handoff.",
    counter_label: "Changes",
  }),
  scenario("radio_group", "focus-visible", {
    legend: "Refund decision",
    help_text: "Choose one decision for this request.",
    value: "return",
    counter_label: "Changes",
  }),

  scenario("alert", "ready", {
    title: "Evidence requires attention",
    message: "The receipt date differs from the request date.",
    tone: "warning",
    action_label: "Review receipt",
    counter_label: "Activations",
  }),
  scenario("alert", "focus-visible", {
    title: "Evidence requires attention",
    message: "The receipt date differs from the request date.",
    tone: "warning",
    action_label: "Review receipt",
    counter_label: "Activations",
  }),

  scenario("table", "empty", {
    caption: "Refund review queue",
    message: "No refund requests need review.",
  }),
  scenario("table", "ready", {
    caption: "Refund review queue",
    counter_label: "Activations",
  }),
  scenario("table", "loading", {
    caption: "Refund review queue",
    message: "Loading current refund requests.",
  }),
  scenario("table", "error", {
    caption: "Refund review queue",
    message: "The refund queue could not be loaded.",
  }),
  scenario("table", "focus-visible", {
    caption: "Refund review queue",
    counter_label: "Activations",
  }),

  scenario("panel", "ready", {
    heading: "Policy evidence",
    message: "The purchase is within the 30-day refund window.",
    action_label: "Add evidence",
    counter_label: "Activations",
  }),
  scenario("panel", "loading", {
    heading: "Policy evidence",
    message: "Loading the governing policy and receipt.",
  }),
  scenario("panel", "error", {
    heading: "Policy evidence",
    message: "Policy evidence is unavailable.",
    action_label: "Retry evidence",
    counter_label: "Activations",
  }),

  scenario("card", "ready", {
    title: "Refund RF-1842",
    summary: "Receipt and policy evidence are complete.",
    metadata: "Submitted today",
    action_label: "Review refund",
    counter_label: "Activations",
  }),
  scenario("card", "disabled", {
    title: "Refund RF-1842",
    summary: "Manager approval is still pending.",
    metadata: "Submitted today",
    action_label: "Review refund",
  }),
  scenario("card", "focus-visible", {
    title: "Refund RF-1842",
    summary: "Receipt and policy evidence are complete.",
    metadata: "Submitted today",
    action_label: "Open refund",
    counter_label: "Activations",
  }),

  scenario("tabs", "ready", {
    label: "Refund review sections",
    value: "evidence",
    counter_label: "Section changes",
  }),
  scenario("tabs", "disabled", {
    label: "Refund review sections",
    value: "evidence",
    counter_label: "Section changes",
  }),
  scenario("tabs", "focus-visible", {
    label: "Refund review sections",
    value: "policy",
    counter_label: "Section changes",
  }),

  scenario("menu", "ready", {
    label: "Refund commands",
    menu_label: "Commands for refund RF-1842",
    default_open: false,
    counter_label: "Commands chosen",
  }),
  scenario("menu", "disabled", {
    label: "Refund commands",
    menu_label: "Commands for refund RF-1842",
    disabled_reason: "Commands unlock when receipt evidence is complete.",
    default_open: false,
    counter_label: "Commands chosen",
  }),
  scenario("menu", "focus-visible", {
    label: "Refund commands",
    menu_label: "Commands for refund RF-1842",
    default_open: false,
    counter_label: "Commands chosen",
  }),

  scenario("dialog", "ready", {
    trigger_label: "Review refund handoff",
    title: "Confirm refund handoff",
    message: "Send refund RF-1842 and its evidence to the payments team.",
    action_label: "Confirm handoff",
    dismiss_label: "Cancel handoff",
    counter_label: "Dialog actions",
  }),
  scenario("dialog", "loading", {
    trigger_label: "Review refund handoff",
    title: "Confirm refund handoff",
    message: "Refund RF-1842 is being sent to the payments team.",
    loading_message: "Sending the refund handoff.",
    action_label: "Confirm handoff",
    dismiss_label: "Cancel handoff",
    counter_label: "Dialog actions",
  }),
  scenario("dialog", "error", {
    trigger_label: "Review blocked handoff",
    title: "Refund handoff blocked",
    message: "Keep the review open while the missing receipt is restored.",
    error_message: "The purchase receipt is unavailable.",
    action_label: "Retry handoff",
    dismiss_label: "Close handoff review",
    counter_label: "Dialog actions",
  }),
  scenario("dialog", "focus-visible", {
    trigger_label: "Review refund handoff",
    title: "Confirm refund handoff",
    message: "Send refund RF-1842 and its evidence to the payments team.",
    action_label: "Confirm handoff",
    dismiss_label: "Cancel handoff",
    counter_label: "Dialog actions",
  }),
]);

const FIXTURE_BY_SCENARIO_ID = new Map(
  RUNTIME_COMPONENT_SCENARIOS.map((entry) => [entry.id, entry]),
);

export function scenariosForComponent(contractId) {
  return RUNTIME_COMPONENT_SCENARIOS.filter(
    (entry) => entry.contract_id === contractId,
  );
}

function resolvedScenario(source) {
  const fixtureScenario = FIXTURE_BY_SCENARIO_ID.get(source.id);
  if (!fixtureScenario) {
    throw new Error(`No component fixture exists for scenario ${source.id}.`);
  }

  return {
    ...fixtureScenario,
    ...source,
    fixture: {
      ...fixtureScenario.fixture,
      ...(source.fixture ?? {}),
    },
    status: source.status ?? "unverified",
  };
}

function safeDomId(value) {
  return String(value).replace(/[^A-Za-z0-9_-]/gu, "-");
}

function interactionReceipt(label, count) {
  if (!label) return null;

  return h(
    "output",
    {
      className: "jk-component-scenario__interaction",
      "aria-live": "polite",
      "data-scenario-interaction-count": String(count),
    },
    `${label}: ${count}`,
  );
}

function renderActionButtonScenario(entry, runtime) {
  const { fixture, state } = entry;
  const descriptionId = fixture.description
    ? `${safeDomId(entry.id)}-description`
    : undefined;

  return h(
    React.Fragment,
    null,
    h(
      ActionButton,
      {
        disabled: state === "disabled",
        loading: state === "loading" || runtime.actionLoading,
        loadingLabel: fixture.loading_label,
        tone: fixture.tone,
        "aria-describedby": descriptionId,
        "data-scenario-focus-target":
          state === "focus-visible" ? "true" : undefined,
        onClick: runtime.handleAction,
      },
      fixture.label,
    ),
    fixture.description
      ? h(
          "p",
          {
            className: "jk-component-scenario__description",
            id: descriptionId,
          },
          fixture.description,
        )
      : null,
  );
}

function renderFormFieldScenario(entry, runtime) {
  const { fixture, state } = entry;
  const controlId = `${safeDomId(entry.id)}-control`;

  return h(
    FormField,
    {
      id: controlId,
      label: fixture.label,
      helpText: fixture.help_text,
      errorMessage: fixture.error_message,
      disabledReason: fixture.disabled_reason,
      disabled: state === "disabled",
      state: state === "empty" ? "empty" : "ready",
    },
    h("input", {
      className: "jk-text-field",
      type: "text",
      defaultValue: fixture.value,
      "data-jk-component": "form_field",
      "data-scenario-focus-target":
        state === "focus-visible" ? "true" : undefined,
      onChange: runtime.handleTextChange,
    }),
  );
}

function renderTextFieldScenario(entry, runtime) {
  const { fixture, state } = entry;
  const valueProps = fixture.control_mode
    ? { value: runtime.textValue }
    : { defaultValue: fixture.value };

  return h(TextField, {
    id: `${safeDomId(entry.id)}-control`,
    label: fixture.label,
    helpText: fixture.help_text,
    errorMessage: fixture.error_message,
    disabledReason: fixture.disabled_reason,
    disabled: state === "disabled",
    ...valueProps,
    "data-scenario-focus-target":
      state === "focus-visible" ? "true" : undefined,
    onChange: runtime.handleTextChange,
  });
}

function renderToggleScenario(entry, runtime) {
  const { fixture, state } = entry;
  const checkedProps = fixture.control_mode
    ? { checked: runtime.toggleChecked }
    : { defaultChecked: fixture.checked };

  return h(Toggle, {
    id: `${safeDomId(entry.id)}-control`,
    label: fixture.label,
    description: fixture.description,
    ...checkedProps,
    disabled: state === "disabled",
    "data-scenario-focus-target":
      state === "focus-visible" ? "true" : undefined,
    onCheckedChange: runtime.handleToggleChange,
  });
}

function renderStatusMessageScenario(entry, runtime) {
  const displayEntry = runtime.statusState === entry.state
    ? entry
    : FIXTURE_BY_SCENARIO_ID.get(`status_message.${runtime.statusState}`);
  const fixture = displayEntry?.fixture ?? entry.fixture;
  const action = runtime.statusState !== "loading" && fixture.action_label
    ? h(
        ActionButton,
        {
          tone: "secondary",
          onClick: runtime.handleStatusAction,
          "data-scenario-status-action": "true",
        },
        fixture.action_label,
      )
    : undefined;

  return h(
    StatusMessage,
    {
      state: runtime.statusState,
      label: fixture.label,
      action,
    },
    fixture.message,
  );
}

function renderActionGroupScenario(entry, runtime) {
  const { fixture, state } = entry;

  return h(
    ActionGroup,
    {
      id: `${safeDomId(entry.id)}-group`,
      label: fixture.label,
      disabled: state === "disabled",
    },
    h(
      ActionButton,
      {
        tone: "decision",
        "data-scenario-focus-target":
          state === "focus-visible" ? "true" : undefined,
        onClick: runtime.handleAction,
      },
      fixture.primary_label,
    ),
    h(
      ActionButton,
      { tone: "secondary", onClick: runtime.handleAction },
      fixture.secondary_label,
    ),
  );
}

function renderTextAreaScenario(entry, runtime) {
  const { fixture, state } = entry;
  const valueProps = fixture.control_mode
    ? { value: runtime.textValue }
    : { defaultValue: fixture.value };

  return h(TextArea, {
    id: `${safeDomId(entry.id)}-control`,
    label: fixture.label,
    helpText: fixture.help_text,
    errorMessage: fixture.error_message,
    disabledReason: fixture.disabled_reason,
    disabled: state === "disabled",
    rows: 4,
    ...valueProps,
    "data-scenario-focus-target":
      state === "focus-visible" ? "true" : undefined,
    onChange: runtime.handleTextChange,
  });
}

const REVIEW_OWNER_OPTIONS = Object.freeze([
  Object.freeze({ value: "operations", label: "Operations" }),
  Object.freeze({ value: "policy", label: "Policy" }),
  Object.freeze({ value: "support", label: "Customer support" }),
]);

function renderSelectFieldScenario(entry, runtime) {
  const { fixture, state } = entry;
  const valueProps = fixture.control_mode
    ? { value: runtime.selectValue }
    : { defaultValue: fixture.value };

  return h(SelectField, {
    id: `${safeDomId(entry.id)}-control`,
    label: fixture.label,
    helpText: fixture.help_text,
    errorMessage: fixture.error_message,
    disabledReason: fixture.disabled_reason,
    disabled: state === "disabled",
    placeholder: fixture.placeholder,
    options: REVIEW_OWNER_OPTIONS,
    ...valueProps,
    "data-scenario-focus-target":
      state === "focus-visible" ? "true" : undefined,
    onValueChange: runtime.handleSelectChange,
  });
}

const EVIDENCE_OPTIONS = Object.freeze([
  Object.freeze({ value: "receipt", label: "Purchase receipt" }),
  Object.freeze({ value: "policy", label: "Refund policy" }),
  Object.freeze({ value: "conversation", label: "Customer conversation" }),
]);

function renderCheckboxGroupScenario(entry, runtime) {
  const { fixture, state } = entry;
  const controlled = Boolean(fixture.control_mode);
  const valueProps = controlled
    ? { value: runtime.checkboxValues }
    : { defaultValue: fixture.values };

  return h(CheckboxGroup, {
    id: `${safeDomId(entry.id)}-group`,
    legend: fixture.legend,
    helpText: fixture.help_text,
    errorMessage: fixture.error_message,
    disabledReason: fixture.disabled_reason,
    disabled: state === "disabled",
    options: EVIDENCE_OPTIONS,
    ...valueProps,
    onValueChange: runtime.handleCheckboxChange,
  });
}

const DECISION_OPTIONS = Object.freeze([
  Object.freeze({ value: "approve", label: "Approve refund" }),
  Object.freeze({ value: "return", label: "Return for evidence" }),
]);

function renderRadioGroupScenario(entry, runtime) {
  const { fixture, state } = entry;
  const controlled = Boolean(fixture.control_mode);
  const valueProps = controlled
    ? { value: runtime.radioValue }
    : { defaultValue: fixture.value };

  return h(RadioGroup, {
    id: `${safeDomId(entry.id)}-group`,
    legend: fixture.legend,
    helpText: fixture.help_text,
    errorMessage: fixture.error_message,
    disabledReason: fixture.disabled_reason,
    disabled: state === "disabled",
    options: DECISION_OPTIONS,
    ...valueProps,
    onValueChange: runtime.handleRadioChange,
  });
}

function renderAlertScenario(entry, runtime) {
  const { fixture, state } = entry;
  const action = h(
    ActionButton,
    {
      tone: "secondary",
      "data-scenario-focus-target":
        state === "focus-visible" ? "true" : undefined,
      onClick: runtime.handleAction,
    },
    fixture.action_label,
  );

  return h(
    Alert,
    {
      title: fixture.title,
      tone: fixture.tone,
      action,
    },
    fixture.message,
  );
}

const REVIEW_QUEUE_ROWS = Object.freeze([
  Object.freeze({ id: "RF-1842", request: "RF-1842", status: "Needs decision" }),
  Object.freeze({ id: "RF-1843", request: "RF-1843", status: "Needs evidence" }),
]);

function renderTableScenario(entry, runtime) {
  const { fixture, state } = entry;
  const showRows = state === "ready" || state === "focus-visible";
  const columns = [
    { key: "request", header: "Request", rowHeader: true },
    { key: "status", header: "Review status" },
  ];

  if (showRows) {
    columns.push({
      key: "action",
      header: "Next action",
      cell(row, rowIndex) {
        return h(
          ActionButton,
          {
            tone: "secondary",
            "data-scenario-focus-target":
              state === "focus-visible" && rowIndex === 0 ? "true" : undefined,
            onClick: runtime.handleAction,
          },
          `Review ${row.request}`,
        );
      },
    });
  }

  return h(Table, {
    caption: fixture.caption,
    columns,
    rows: showRows ? REVIEW_QUEUE_ROWS : [],
    state: state === "focus-visible" ? "ready" : state,
    loadingMessage: fixture.message,
    emptyMessage: fixture.message,
    errorMessage: state === "error" ? fixture.message : undefined,
    rowKey: "id",
  });
}

function renderPanelScenario(entry, runtime) {
  const { fixture, state } = entry;
  const actions = fixture.action_label
    ? h(
        ActionButton,
        { tone: "secondary", onClick: runtime.handleAction },
        fixture.action_label,
      )
    : undefined;

  return h(
    Panel,
    {
      id: `${safeDomId(entry.id)}-panel`,
      heading: fixture.heading,
      headingLevel: 3,
      state,
      loadingMessage: fixture.message,
      errorMessage: fixture.message,
      actions,
    },
    state === "ready" ? fixture.message : null,
  );
}

function renderCardScenario(entry, runtime) {
  const { fixture, state } = entry;
  return h(Card, {
    id: `${safeDomId(entry.id)}-card`,
    title: fixture.title,
    summary: fixture.summary,
    metadata: fixture.metadata,
    disabled: state === "disabled",
    action: {
      type: state === "ready" ? "button" : "link",
      label: fixture.action_label,
      href:
        state === "ready"
          ? undefined
          : `#${safeDomId(entry.id)}-receipt`,
      onClick: runtime.handleAction,
    },
  });
}

const REFUND_REVIEW_TABS = Object.freeze([
  Object.freeze({
    value: "evidence",
    label: "Evidence",
    panel: "Receipt and policy evidence are complete.",
  }),
  Object.freeze({
    value: "policy",
    label: "Policy",
    panel: "The request is within the 30-day refund window.",
  }),
  Object.freeze({
    value: "history",
    label: "History",
    panel: "The customer submitted this request today.",
  }),
]);

function renderTabsScenario(entry, runtime) {
  const { fixture, state } = entry;

  return h(Tabs, {
    id: `${safeDomId(entry.id)}-tabs`,
    label: fixture.label,
    items: REFUND_REVIEW_TABS,
    value: runtime.tabsValue,
    disabled: state === "disabled",
    onValueChange: runtime.handleTabsChange,
  });
}

const REFUND_COMMAND_ITEMS = Object.freeze([
  Object.freeze({
    id: "open-receipt",
    value: "open-receipt",
    label: "Open receipt",
  }),
  Object.freeze({
    id: "assign-policy-review",
    value: "assign-policy-review",
    label: "Assign policy review",
  }),
  Object.freeze({
    id: "return-for-evidence",
    value: "return-for-evidence",
    label: "Return for evidence",
  }),
]);

function renderMenuScenario(entry, runtime) {
  const { fixture, state } = entry;

  return h(Menu, {
    id: `${safeDomId(entry.id)}-menu`,
    label: fixture.label,
    menuLabel: fixture.menu_label,
    items: REFUND_COMMAND_ITEMS,
    defaultOpen: fixture.default_open,
    disabled: state === "disabled",
    disabledReason: fixture.disabled_reason,
    onSelect: runtime.handleMenuSelect,
  });
}

function renderDialogScenario(entry, runtime) {
  const { fixture, state } = entry;
  const actions = h(
    ActionButton,
    {
      ref: runtime.dialogDecisionRef,
      tone: state === "error" ? "secondary" : "decision",
      "data-scenario-focus-target":
        state === "focus-visible" ? "true" : undefined,
      onClick: runtime.handleDialogDecision,
    },
    fixture.action_label,
  );

  return h(
    React.Fragment,
    null,
    h(
      ActionButton,
      {
        ref: runtime.dialogTriggerRef,
        tone: "secondary",
        "data-scenario-dialog-trigger": "true",
        onClick: runtime.handleDialogOpen,
      },
      fixture.trigger_label,
    ),
    h(
      Dialog,
      {
        id: `${safeDomId(entry.id)}-dialog`,
        title: fixture.title,
        open: runtime.dialogOpen,
        loading: state === "loading",
        loadingMessage: fixture.loading_message,
        errorMessage: fixture.error_message,
        dismissLabel: fixture.dismiss_label,
        initialFocusRef:
          state === "focus-visible" ? runtime.dialogDecisionRef : undefined,
        returnFocusRef: runtime.dialogTriggerRef,
        actions,
        onOpenChange: runtime.handleDialogOpenChange,
      },
      h("p", null, fixture.message),
    ),
  );
}

function renderScenarioControl(entry, runtime) {
  switch (entry.contract_id) {
    case "action_button":
      return renderActionButtonScenario(entry, runtime);
    case "form_field":
      return renderFormFieldScenario(entry, runtime);
    case "text_field":
      return renderTextFieldScenario(entry, runtime);
    case "toggle":
      return renderToggleScenario(entry, runtime);
    case "status_message":
      return renderStatusMessageScenario(entry, runtime);
    case "action_group":
      return renderActionGroupScenario(entry, runtime);
    case "text_area":
      return renderTextAreaScenario(entry, runtime);
    case "select_field":
      return renderSelectFieldScenario(entry, runtime);
    case "checkbox_group":
      return renderCheckboxGroupScenario(entry, runtime);
    case "radio_group":
      return renderRadioGroupScenario(entry, runtime);
    case "alert":
      return renderAlertScenario(entry, runtime);
    case "table":
      return renderTableScenario(entry, runtime);
    case "panel":
      return renderPanelScenario(entry, runtime);
    case "card":
      return renderCardScenario(entry, runtime);
    case "tabs":
      return renderTabsScenario(entry, runtime);
    case "menu":
      return renderMenuScenario(entry, runtime);
    case "dialog":
      return renderDialogScenario(entry, runtime);
    default:
      throw new Error(
        `No runtime specimen renderer exists for ${entry.contract_id}.`,
      );
  }
}

export function Scenario({ scenario: source }) {
  const entry = resolvedScenario(source);
  const [interactionCount, setInteractionCount] = useState(0);
  const [textValue, setTextValue] = useState(entry.fixture.value ?? "");
  const [selectValue, setSelectValue] = useState(entry.fixture.value ?? "");
  const [checkboxValues, setCheckboxValues] = useState(
    entry.fixture.values ?? [],
  );
  const [radioValue, setRadioValue] = useState(entry.fixture.value ?? "");
  const [toggleChecked, setToggleChecked] = useState(
    Boolean(entry.fixture.checked),
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [statusState, setStatusState] = useState(entry.state);
  const [tabsValue, setTabsValue] = useState(entry.fixture.value ?? "evidence");
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogTriggerRef = useRef(null);
  const dialogDecisionRef = useRef(null);
  const increment = () => setInteractionCount((count) => count + 1);
  const runtime = {
    actionLoading,
    checkboxValues,
    radioValue,
    selectValue,
    textValue,
    toggleChecked,
    statusState,
    tabsValue,
    dialogOpen,
    dialogTriggerRef,
    dialogDecisionRef,
    handleAction() {
      increment();
      if (entry.fixture.transition === "loading") setActionLoading(true);
    },
    handleTextChange(event) {
      increment();
      if (entry.fixture.control_mode === "controlled_update") {
        setTextValue(event.currentTarget.value);
      }
    },
    handleSelectChange(nextValue) {
      increment();
      if (entry.fixture.control_mode === "controlled_update") {
        setSelectValue(nextValue);
      }
    },
    handleCheckboxChange(nextValues) {
      increment();
      if (entry.fixture.control_mode === "controlled_update") {
        setCheckboxValues(nextValues);
      }
    },
    handleRadioChange(nextValue) {
      increment();
      if (entry.fixture.control_mode === "controlled_update") {
        setRadioValue(nextValue);
      }
    },
    handleToggleChange(nextChecked) {
      increment();
      if (entry.fixture.control_mode === "controlled_update") {
        setToggleChecked(nextChecked);
      }
    },
    handleStatusAction() {
      increment();
      if (entry.fixture.transition === "loading") setStatusState("loading");
    },
    handleTabsChange(nextValue) {
      increment();
      setTabsValue(nextValue);
    },
    handleMenuSelect() {
      increment();
    },
    handleDialogOpen() {
      increment();
      setDialogOpen(true);
    },
    handleDialogOpenChange(nextOpen) {
      if (!nextOpen) increment();
      setDialogOpen(nextOpen);
    },
    handleDialogDecision() {
      increment();
      setDialogOpen(false);
    },
  };

  return h(
    "section",
    {
      className: "jk-component-state jk-component-scenario",
      "data-scenario-id": entry.id,
      "data-contract-id": entry.contract_id,
      "data-contract-state": entry.state,
      "data-scenario-status": entry.status,
    },
    h(
      "div",
      { className: "jk-component-scenario__heading" },
      h(
        "span",
        {
          className: "jk-state-label",
          "data-scenario-state-label": "true",
        },
        entry.state.replaceAll("-", " "),
      ),
      h(
        "span",
        {
          className: "jk-component-scenario__status",
          "data-scenario-evidence-label": "true",
        },
        entry.status.replaceAll("_", " ").replaceAll("-", " "),
      ),
    ),
    h(
      "div",
      { className: "jk-component-scenario__control" },
      renderScenarioControl(entry, runtime),
    ),
    interactionReceipt(entry.fixture.counter_label, interactionCount),
  );
}

export function ComponentSpecimenPreview({
  contractId,
  contractHash,
  scenarios,
  style,
}) {
  if (!RUNTIME_COMPONENT_IDS.includes(contractId)) {
    throw new Error(`No runtime specimen exists for ${contractId}.`);
  }

  const sourceScenarios = scenarios ?? scenariosForComponent(contractId);
  const componentScenarios = sourceScenarios
    .filter((entry) => entry.contract_id === contractId)
    .map(resolvedScenario);

  return h(
    "div",
    {
      className: "jk-specimen-preview jk-component-preview",
      style,
      "data-specimen-id": `component.${contractId}`,
      "data-contract-id": contractId,
      "data-contract-hash": contractHash,
      "data-component-runtime": "judgmentkit/react",
    },
    h(
      "div",
      { className: "jk-component-state-grid" },
      componentScenarios.map((entry) =>
        h(Scenario, { key: entry.id, scenario: entry }),
      ),
    ),
  );
}
