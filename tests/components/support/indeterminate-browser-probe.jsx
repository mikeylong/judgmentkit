import React, { createElement, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  ActionButton,
  CheckboxField,
  Dialog,
  Menu,
} from "../../../src/react/index.mjs";
import "../../../src/react/styles.css";

const h = createElement;
const root = document.getElementById("indeterminate-probe-root");

if (!root) {
  throw new Error("The indeterminate checkbox browser probe root is missing.");
}

function BrowserEdgeProbe() {
  const [dialogMounted, setDialogMounted] = useState(false);
  const [disabledMenuSelections, setDisabledMenuSelections] = useState(0);
  const [typeaheadMenuSelections, setTypeaheadMenuSelections] = useState(0);
  const [refusalDialogOpen, setRefusalDialogOpen] = useState(false);
  const [nondismissibleDialogMounted, setNondismissibleDialogMounted] = useState(false);
  const [loadingFormDialogMounted, setLoadingFormDialogMounted] = useState(false);
  const [loadingFormDialogLoading, setLoadingFormDialogLoading] = useState(true);
  const [loadingNoControlDialogOpen, setLoadingNoControlDialogOpen] = useState(false);
  const dialogTriggerRef = useRef(null);
  const refusalDialogTriggerRef = useRef(null);
  const nondismissibleDialogTriggerRef = useRef(null);
  const loadingFormDialogTriggerRef = useRef(null);
  const loadingNoControlDialogTriggerRef = useRef(null);

  return h(
    React.Fragment,
    null,
    h(CheckboxField, {
      id: "indeterminate-browser-probe",
      label: "Partially reviewed evidence",
      checked: false,
      indeterminate: true,
      description: "Some, but not all, evidence has been reviewed.",
      onCheckedChange() {
        // A controlled parent may intentionally retain the mixed value.
      },
    }),
    h(Menu, {
      id: "controlled-menu-refusal-probe",
      label: "Controlled commands",
      menuLabel: "Controlled command choices",
      open: true,
      style: { marginBlockEnd: "7rem" },
      onOpenChange() {
        // A controlled parent may intentionally refuse a close request.
      },
      items: [
        { id: "first", value: "first", label: "First controlled command" },
        { id: "second", value: "second", label: "Second controlled command" },
      ],
    }),
    h(Menu, {
      id: "disabled-menu-navigation-probe",
      label: "Commands with unavailable choices",
      menuLabel: "Commands including an unavailable choice",
      items: [
        { id: "enabled-first", value: "enabled-first", label: "First available command" },
        { id: "disabled-middle", value: "disabled-middle", label: "Unavailable command", disabled: true },
        { id: "enabled-last", value: "enabled-last", label: "Last available command" },
      ],
      onSelect() {
        setDisabledMenuSelections((count) => count + 1);
      },
    }),
    h(
      "output",
      { "data-edge-disabled-menu-selection-count": String(disabledMenuSelections) },
      `Disabled-menu selections: ${disabledMenuSelections}`,
    ),
    h(Menu, {
      id: "typeahead-href-menu-probe",
      label: "Typeahead link commands",
      menuLabel: "Commands with a link target",
      items: [
        { id: "alpha", value: "alpha", label: "Alpha command" },
        {
          id: "billing-receipt",
          value: "billing-receipt",
          label: "Billing receipt",
          href: "#browser-menu-href-target",
        },
        { id: "return", value: "return", label: "Return command" },
      ],
      onSelect() {
        setTypeaheadMenuSelections((count) => count + 1);
      },
    }),
    h(
      "output",
      { "data-edge-typeahead-menu-selection-count": String(typeaheadMenuSelections) },
      `Typeahead-menu selections: ${typeaheadMenuSelections}`,
    ),
    h("div", { id: "browser-menu-href-target" }, "Billing receipt destination"),
    h(
      ActionButton,
      {
        ref: dialogTriggerRef,
        tone: "secondary",
        "data-edge-dialog-trigger": "true",
        onClick() {
          setDialogMounted(true);
        },
      },
      "Open conditional dialog",
    ),
    dialogMounted
      ? h(
          Dialog,
          {
            id: "conditional-dialog-probe",
            title: "Conditional dialog",
            open: true,
            returnFocusRef: dialogTriggerRef,
            dismissLabel: "Close conditional dialog",
            onOpenChange(nextOpen) {
              if (!nextOpen) setDialogMounted(false);
            },
            actions: h(ActionButton, { tone: "decision" }, "Continue"),
          },
          "This controlled dialog unmounts when its parent accepts dismissal.",
        )
      : null,
    h(
      ActionButton,
      {
        ref: refusalDialogTriggerRef,
        tone: "secondary",
        "data-edge-refusal-dialog-trigger": "true",
        onClick() {
          setRefusalDialogOpen(true);
        },
      },
      "Open controlled refusal dialog",
    ),
    h(
      Dialog,
      {
        id: "controlled-dialog-refusal-probe",
        title: "Controlled refusal dialog",
        open: refusalDialogOpen,
        returnFocusRef: refusalDialogTriggerRef,
        dismissLabel: "Request controlled close",
        onOpenChange() {
          // A controlled parent may intentionally refuse native close requests.
        },
        actions: h(
          ActionButton,
          {
            tone: "decision",
            "data-edge-refusal-dialog-force-close": "true",
            onClick() {
              setRefusalDialogOpen(false);
            },
          },
          "Accept close",
        ),
      },
      "A refused native close must reopen the modal and keep focus inside.",
    ),
    h(
      ActionButton,
      {
        ref: nondismissibleDialogTriggerRef,
        tone: "secondary",
        "data-edge-nondismissible-dialog-trigger": "true",
        onClick() {
          setNondismissibleDialogMounted(true);
        },
      },
      "Open nondismissible dialog",
    ),
    nondismissibleDialogMounted
      ? h(
          Dialog,
          {
            id: "uncontrolled-nondismissible-dialog-probe",
            title: "Nondismissible dialog",
            defaultOpen: true,
            dismissible: false,
            returnFocusRef: nondismissibleDialogTriggerRef,
            actions: h(
              ActionButton,
              {
                tone: "decision",
                "data-edge-nondismissible-dialog-force-unmount": "true",
                onClick() {
                  setNondismissibleDialogMounted(false);
                },
              },
              "Finish nondismissible review",
            ),
          },
          "Native close requests must not dismiss this uncontrolled dialog.",
        )
      : null,
    h(
      ActionButton,
      {
        ref: loadingFormDialogTriggerRef,
        tone: "secondary",
        "data-edge-loading-form-dialog-trigger": "true",
        onClick() {
          setLoadingFormDialogLoading(true);
          setLoadingFormDialogMounted(true);
        },
      },
      "Open loading form dialog",
    ),
    loadingFormDialogMounted
      ? h(
          Dialog,
          {
            id: "loading-form-dialog-probe",
            title: "Loading form dialog",
            defaultOpen: true,
            loading: loadingFormDialogLoading,
            dismissible: !loadingFormDialogLoading,
            loadingMessage: "Submitting a native dialog form.",
            dismissLabel: "Close loading form dialog",
            returnFocusRef: loadingFormDialogTriggerRef,
            onOpenChange(nextOpen) {
              if (!nextOpen) setLoadingFormDialogMounted(false);
            },
          },
          h(
            "form",
            { method: "dialog" },
            h(
              "button",
              { type: "submit", "data-edge-loading-dialog-native-submit": "true" },
              "Submit native dialog form",
            ),
          ),
          h(
            "button",
            {
              type: "button",
              "data-edge-loading-dialog-stop-loading": "true",
              onClick() {
                setLoadingFormDialogLoading(false);
              },
            },
            "Finish loading",
          ),
        )
      : null,
    h(
      ActionButton,
      {
        ref: loadingNoControlDialogTriggerRef,
        tone: "secondary",
        "data-edge-loading-no-control-dialog-trigger": "true",
        onClick() {
          setLoadingNoControlDialogOpen(true);
        },
      },
      "Open loading dialog without enabled controls",
    ),
    h(
      Dialog,
      {
        id: "loading-no-control-dialog-probe",
        title: "Loading dialog without enabled controls",
        open: loadingNoControlDialogOpen,
        loading: true,
        dismissible: false,
        loadingMessage: "Loading without an enabled descendant control.",
        dismissLabel: "Close loading dialog",
        returnFocusRef: loadingNoControlDialogTriggerRef,
        actions: h(ActionButton, { tone: "decision" }, "Continue"),
        onOpenChange(nextOpen) {
          setLoadingNoControlDialogOpen(nextOpen);
        },
      },
      h("p", null, "The dialog element itself must retain focus during recovery."),
    ),
  );
}

createRoot(root).render(h(BrowserEdgeProbe));
