import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Dialog,
  Menu,
  Tabs,
} from "../../src/react/interactive-components.mjs";

const h = createElement;
const render = (Component, props, ...children) =>
  renderToStaticMarkup(h(Component, props, ...children));

function count(source, expression) {
  return [...source.matchAll(expression)].length;
}

const tabsMarkup = render(Tabs, {
  id: "review-sections",
  label: "Review sections",
  defaultValue: "evidence",
  items: [
    { value: "summary", label: "Summary", panel: "Summary content" },
    { value: "evidence", label: "Evidence", panel: "Evidence content" },
    { value: "history", label: "History", panel: "History content", disabled: true },
  ],
});

assert.match(tabsMarkup, /role="tablist"/);
assert.match(tabsMarkup, /aria-label="Review sections"/);
assert.equal(count(tabsMarkup, /role="tab"/g), 3);
assert.equal(count(tabsMarkup, /role="tabpanel"/g), 3);
assert.match(tabsMarkup, /id="review-sections-tab-evidence-2"/);
assert.match(tabsMarkup, /aria-selected="true"/);
assert.match(tabsMarkup, /aria-controls="review-sections-panel-evidence-2"/);
assert.match(tabsMarkup, /id="review-sections-panel-evidence-2"/);
assert.match(tabsMarkup, /aria-labelledby="review-sections-tab-evidence-2"/);

const collidingTabSlugMarkup = render(Tabs, {
  id: "collision",
  label: "Collision-safe sections",
  items: [
    { value: "a b", label: "First", panel: "First panel" },
    { value: "a-b", label: "Second", panel: "Second panel" },
  ],
});
assert.match(collidingTabSlugMarkup, /id="collision-tab-a-b-1"/);
assert.match(collidingTabSlugMarkup, /id="collision-tab-a-b-2"/);
assert.match(collidingTabSlugMarkup, /id="collision-panel-a-b-1"/);
assert.match(collidingTabSlugMarkup, /id="collision-panel-a-b-2"/);
assert.match(tabsMarkup, /data-jk-base-state="ready"/);
assert.match(tabsMarkup, /<button[^>]*disabled=""[^>]*>History<\/button>/);
assert.equal(count(tabsMarkup, /hidden=""/g), 2);

const disabledTabsMarkup = render(Tabs, {
  id: "locked-sections",
  label: "Locked sections",
  disabled: true,
  items: [
    { value: "one", label: "One", panel: "One" },
    { value: "two", label: "Two", panel: "Two" },
  ],
});
assert.match(disabledTabsMarkup, /data-jk-base-state="disabled"/);
assert.equal(count(disabledTabsMarkup, /disabled=""/g), 2);
assert.equal(count(disabledTabsMarkup, /tabindex="-1"/g) >= 2, true);

const verticalTabsMarkup = render(Tabs, {
  id: "vertical-sections",
  label: "Vertical sections",
  orientation: "vertical",
  activation: "manual",
  items: [{ value: "one", label: "One", panel: "One" }],
});
assert.match(verticalTabsMarkup, /aria-orientation="vertical"/);
assert.match(verticalTabsMarkup, /data-jk-orientation="vertical"/);

assert.throws(
  () => render(Tabs, { items: [] }),
  /Tabs require an accessible label/,
);

const closedMenuMarkup = render(Menu, {
  id: "case-actions",
  label: "Case actions",
  items: [{ id: "assign", label: "Assign owner" }],
});
assert.match(closedMenuMarkup, /aria-haspopup="menu"/);
assert.match(closedMenuMarkup, /aria-expanded="false"/);
assert.doesNotMatch(closedMenuMarkup, /aria-controls=/);
assert.match(closedMenuMarkup, /data-jk-open="false"/);
assert.doesNotMatch(closedMenuMarkup, /role="menu"/);

const openMenuMarkup = render(Menu, {
  id: "case-actions-open",
  label: "Case actions",
  defaultOpen: true,
  items: [
    { id: "assign", label: "Assign owner" },
    { id: "divider", type: "separator" },
    { id: "archive", label: "Archive case", disabled: true },
    { id: "policy", label: "View policy", href: "/policy" },
  ],
});
assert.match(openMenuMarkup, /aria-expanded="true"/);
assert.match(openMenuMarkup, /role="menu"/);
assert.match(openMenuMarkup, /aria-labelledby="case-actions-open-trigger"/);
assert.equal(count(openMenuMarkup, /role="menuitem"/g), 3);
assert.match(openMenuMarkup, /role="separator"/);
assert.match(
  openMenuMarkup,
  /<button[^>]*role="menuitem"[^>]*aria-disabled="true"[^>]*>Archive case<\/button>/,
);
assert.doesNotMatch(
  openMenuMarkup,
  /<button[^>]*disabled=""[^>]*>Archive case<\/button>/,
);
assert.match(openMenuMarkup, /<a[^>]*href="\/policy"[^>]*>View policy<\/a>/);
assert.match(openMenuMarkup, /data-jk-base-state="ready"/);

const namedOpenMenuMarkup = render(Menu, {
  id: "named-menu",
  label: "More",
  menuLabel: "More case actions",
  defaultOpen: true,
  items: [{ id: "copy", label: "Copy reference" }],
});
assert.match(namedOpenMenuMarkup, /role="menu" aria-label="More case actions"/);
assert.doesNotMatch(namedOpenMenuMarkup, /aria-labelledby="named-menu-trigger"/);

const disabledMenuMarkup = render(Menu, {
  id: "locked-menu",
  label: "Case actions",
  disabled: true,
  disabledReason: "Actions unlock when evidence is complete.",
});
assert.match(disabledMenuMarkup, /data-jk-base-state="disabled"/);
assert.match(disabledMenuMarkup, /<button[^>]*disabled=""/);
assert.match(disabledMenuMarkup, /aria-describedby="locked-menu-disabled-reason"/);
assert.match(disabledMenuMarkup, /Actions unlock when evidence is complete\./);

assert.throws(
  () => render(Menu, { items: [] }),
  /Menu requires a visible trigger label/,
);

const readyDialogMarkup = render(
  Dialog,
  {
    id: "approval-dialog",
    title: "Approve exception",
    "aria-describedby": "approval-dialog-description",
    defaultOpen: true,
    actions: h(
      React.Fragment,
      null,
      h("button", { type: "button" }, "Cancel"),
      h("button", { type: "button" }, "Approve"),
    ),
  },
  h("p", null, "Confirm the policy exception before continuing."),
);
assert.match(readyDialogMarkup, /^<dialog/);
assert.match(readyDialogMarkup, /tabindex="-1"/);
assert.match(readyDialogMarkup, /aria-labelledby="approval-dialog-title"/);
assert.match(
  readyDialogMarkup,
  /aria-describedby="approval-dialog-description"/,
);
assert.match(readyDialogMarkup, /data-jk-component="dialog"/);
assert.match(readyDialogMarkup, /data-jk-base-state="ready"/);
assert.match(readyDialogMarkup, /data-jk-open="true"/);
assert.doesNotMatch(readyDialogMarkup, /<dialog[^>]* open=""/);
assert.match(readyDialogMarkup, /<h2[^>]*>Approve exception<\/h2>/);
assert.match(readyDialogMarkup, /aria-label="Close"/);
assert.equal(count(readyDialogMarkup, /<button/g), 3);

const loadingDialogMarkup = render(Dialog, {
  id: "saving-dialog",
  title: "Save decision",
  defaultOpen: true,
  loading: true,
  loadingMessage: "Saving the decision and receipt.",
  "aria-describedby": "saving-dialog-context",
  actions: h("button", { type: "button" }, "Save"),
});
assert.match(loadingDialogMarkup, /data-jk-base-state="loading"/);
assert.match(loadingDialogMarkup, /aria-busy="true"/);
assert.match(loadingDialogMarkup, /role="status"/);
assert.match(loadingDialogMarkup, /Saving the decision and receipt\./);
assert.match(
  loadingDialogMarkup,
  /aria-describedby="saving-dialog-context saving-dialog-loading"/,
);
assert.match(loadingDialogMarkup, /inert=""/);
assert.equal(count(loadingDialogMarkup, /disabled=""/g), 2);

const errorDialogMarkup = render(Dialog, {
  id: "error-dialog",
  title: "Approve exception",
  defaultOpen: true,
  loading: true,
  errorMessage: "Receipt evidence is missing.",
});
assert.match(errorDialogMarkup, /data-jk-base-state="error"/);
assert.match(errorDialogMarkup, /aria-invalid="true"/);
assert.match(errorDialogMarkup, /role="alert"/);
assert.match(errorDialogMarkup, /Receipt evidence is missing\./);
assert.doesNotMatch(errorDialogMarkup, /role="status"/);
assert.doesNotMatch(errorDialogMarkup, /aria-busy="true"/);
assert.doesNotMatch(errorDialogMarkup, /inert=""/);
assert.doesNotMatch(errorDialogMarkup, /disabled=""/);
assert.equal(count(errorDialogMarkup, /id="error-dialog-error"/g), 1);

const ariaNamedDialogMarkup = render(Dialog, {
  id: "aria-named-dialog",
  "aria-label": "Focused decision",
  defaultOpen: true,
});
assert.match(ariaNamedDialogMarkup, /aria-label="Focused decision"/);
assert.doesNotMatch(ariaNamedDialogMarkup, /aria-labelledby=/);

const externallyLabelledDialogMarkup = render(Dialog, {
  id: "externally-labelled-dialog",
  "aria-labelledby": "decision-title decision-context",
  defaultOpen: true,
});
assert.match(
  externallyLabelledDialogMarkup,
  /aria-labelledby="decision-title decision-context"/,
);
assert.doesNotMatch(
  externallyLabelledDialogMarkup,
  /aria-labelledby="externally-labelled-dialog-title"/,
);

assert.throws(
  () => render(Dialog, { defaultOpen: true }),
  /Dialog requires a title, aria-label, or aria-labelledby/,
);

console.log("interactive component tests passed");
