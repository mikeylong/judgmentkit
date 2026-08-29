import React, {
  cloneElement,
  createElement,
  isValidElement,
  useId,
  useState,
} from "react";

const h = createElement;

const FIELD_READY_STATES = new Set(["empty", "ready"]);
const STATUS_STATES = new Set(["ready", "loading", "error"]);

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

function mergeIdRefs(...values) {
  const ids = values
    .flatMap((value) => (typeof value === "string" ? value.split(/\s+/u) : []))
    .filter(Boolean);

  return ids.length > 0 ? [...new Set(ids)].join(" ") : undefined;
}

function normalizeState(state, allowedStates, fallback) {
  return allowedStates.has(state) ? state : fallback;
}

function useStableDomId(explicitId, prefix) {
  const reactId = useId();
  const safeReactId = reactId.replace(/[^A-Za-z0-9_-]/gu, "");
  return explicitId || `${prefix}-${safeReactId || "control"}`;
}

function matchesFocusVisible(element) {
  try {
    return element.matches(":focus-visible");
  } catch {
    return false;
  }
}

function useFocusVisibleHandlers({ onFocus, onBlur } = {}) {
  const [focusVisible, setFocusVisible] = useState(false);

  function handleFocus(event) {
    setFocusVisible(matchesFocusVisible(event.currentTarget));
    onFocus?.(event);
  }

  function handleBlur(event) {
    setFocusVisible(false);
    onBlur?.(event);
  }

  return {
    focusVisible,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };
}

function FieldFrame({
  componentId,
  id,
  label,
  helpText,
  errorMessage,
  disabledReason,
  required = false,
  disabled = false,
  state,
  className,
  children,
  onFocusCapture,
  onBlurCapture,
  ...wrapperProps
}) {
  const childControlId =
    isValidElement(children) && children.type !== React.Fragment
      ? children.props?.id
      : undefined;
  const childDisabled =
    isValidElement(children) && children.type !== React.Fragment
      ? Boolean(children.props?.disabled)
      : false;
  const effectiveDisabled = disabled || childDisabled;
  const controlId = useStableDomId(id || childControlId, `jk-${componentId}`);
  const helpId = helpText ? `${controlId}-help` : undefined;
  const errorId = errorMessage ? `${controlId}-error` : undefined;
  const disabledReasonId = effectiveDisabled && disabledReason
    ? `${controlId}-disabled-reason`
    : undefined;
  const describedBy = mergeIdRefs(helpId, errorId, disabledReasonId);
  const invalid = Boolean(errorMessage);
  const requestedState = normalizeState(state, FIELD_READY_STATES, "ready");
  const baseState = invalid
    ? "error"
    : effectiveDisabled
      ? "disabled"
      : requestedState;
  const [focusVisible, setFocusVisible] = useState(false);

  const controlProps = {
    id: controlId,
    disabled: effectiveDisabled,
    required,
    "aria-describedby": describedBy,
    "aria-errormessage": errorId,
    "aria-invalid": invalid || undefined,
  };

  let control = children;
  if (typeof children === "function") {
    control = children(controlProps);
  } else if (isValidElement(children) && children.type !== React.Fragment) {
    const childProps = children.props ?? {};
    control = cloneElement(children, {
      id: controlId,
      disabled: effectiveDisabled || undefined,
      required: required || childProps.required || undefined,
      "aria-describedby": mergeIdRefs(
        childProps["aria-describedby"],
        describedBy,
      ),
      "aria-errormessage":
        childProps["aria-errormessage"] || errorId || undefined,
      "aria-invalid": invalid || childProps["aria-invalid"] || undefined,
    });
  }

  function handleFocusCapture(event) {
    setFocusVisible(matchesFocusVisible(event.target));
    onFocusCapture?.(event);
  }

  function handleBlurCapture(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusVisible(false);
    }
    onBlurCapture?.(event);
  }

  const resolvedState = focusVisible ? "focus-visible" : baseState;

  return h(
    "div",
    {
      ...wrapperProps,
      className: joinClassNames("jk-form-field", className),
      "data-jk-component": componentId,
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focusVisible ? "true" : "false",
      "data-jk-disabled": effectiveDisabled ? "true" : "false",
      "data-jk-invalid": invalid ? "true" : "false",
      onFocusCapture: handleFocusCapture,
      onBlurCapture: handleBlurCapture,
    },
    h(
      "label",
      { className: "jk-form-field__label", htmlFor: controlId },
      h("span", null, label),
      required
        ? h(
            "span",
            {
              className: "jk-form-field__required",
              title: "Required",
              "aria-hidden": "true",
            },
            " *",
          )
        : null,
    ),
    h("div", { className: "jk-form-field__control" }, control),
    helpText
      ? h(
          "div",
          { className: "jk-form-field__description", id: helpId },
          helpText,
        )
      : null,
    disabledReasonId
      ? h(
          "div",
          {
            className:
              "jk-form-field__description jk-form-field__disabled-reason",
            id: disabledReasonId,
          },
          disabledReason,
        )
      : null,
    errorMessage
      ? h(
          "div",
          {
            className: "jk-form-field__error",
            id: errorId,
            "data-jk-error": "true",
          },
          h("span", { className: "jk-form-field__error-label" }, "Error:"),
          " ",
          errorMessage,
        )
      : null,
  );
}

/**
 * Shared labeled-field structure for an approved control.
 * Pass one control element, or a render function that receives its accessible
 * id, description, error, required, and disabled props.
 */
export function FormField(props) {
  return h(FieldFrame, { ...props, componentId: "form_field" });
}

/** Collect one short text or numeric value with shared field semantics. */
export function TextField({
  id,
  label,
  helpText,
  errorMessage,
  disabledReason,
  required = false,
  disabled = false,
  value,
  defaultValue = "",
  onChange,
  onFocus,
  onBlur,
  className,
  inputClassName,
  type = "text",
  ...inputProps
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = controlled ? value : internalValue;
  const empty = currentValue === "" || currentValue === null;
  const baseState = errorMessage
    ? "error"
    : disabled
      ? "disabled"
      : empty
        ? "empty"
        : "ready";

  function handleChange(event) {
    if (!controlled) {
      setInternalValue(event.currentTarget.value);
    }
    onChange?.(event);
  }

  return h(
    FieldFrame,
    {
      componentId: "text_field",
      id,
      label,
      helpText,
      errorMessage,
      disabledReason,
      required,
      disabled,
      state: baseState,
      className,
    },
    (accessibilityProps) => {
      const describedBy = mergeIdRefs(
        inputProps["aria-describedby"],
        accessibilityProps["aria-describedby"],
      );

      return h("input", {
        ...inputProps,
        ...accessibilityProps,
        className: joinClassNames("jk-text-field", inputClassName),
        type,
        value: currentValue ?? "",
        "aria-describedby": describedBy,
        "data-jk-component": "text_field",
        "data-jk-state": baseState,
        onChange: handleChange,
        onFocus,
        onBlur,
      });
    },
  );
}

/** Trigger one bounded action without repeat activation while loading. */
export function ActionButton({
  children,
  loading = false,
  loadingLabel = "Working…",
  disabled = false,
  tone = "decision",
  type = "button",
  className,
  onClick,
  onFocus,
  onBlur,
  ...buttonProps
}) {
  const focus = useFocusVisibleHandlers({ onFocus, onBlur });
  const unavailable = disabled || loading;
  const baseState = loading ? "loading" : disabled ? "disabled" : "ready";
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;

  function handleClick(event) {
    if (unavailable) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return h(
    "button",
    {
      ...buttonProps,
      className: joinClassNames("jk-action-button", className),
      type,
      disabled: unavailable,
      "aria-busy": loading ? "true" : undefined,
      "data-jk-component": "action_button",
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-tone": tone,
      onClick: handleClick,
      onFocus: focus.onFocus,
      onBlur: focus.onBlur,
    },
    loading
      ? h("span", {
          className: "jk-action-button__progress",
          "aria-hidden": "true",
        })
      : null,
    h(
      "span",
      {
        className: "jk-action-button__label",
        "aria-live": loading ? "polite" : undefined,
        "aria-atomic": loading ? "true" : undefined,
      },
      loading ? loadingLabel : children,
    ),
  );
}

/** Change one persistent binary value with native button keyboard behavior. */
export function Toggle({
  id,
  label,
  description,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  onLabel = "On",
  offLabel = "Off",
  className,
  onClick,
  onFocus,
  onBlur,
  ...buttonProps
}) {
  const controlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
  const currentChecked = controlled ? Boolean(checked) : internalChecked;
  const controlId = useStableDomId(id, "jk-toggle");
  const labelId = `${controlId}-label`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const focus = useFocusVisibleHandlers({ onFocus, onBlur });
  const baseState = disabled ? "disabled" : "ready";
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;

  function handleClick(event) {
    if (disabled) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    const nextChecked = !currentChecked;
    if (!controlled) {
      setInternalChecked(nextChecked);
    }
    onCheckedChange?.(nextChecked, event);
  }

  return h(
    "div",
    {
      className: joinClassNames("jk-toggle", className),
      "data-jk-component": "toggle",
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-checked": currentChecked ? "true" : "false",
    },
    h(
      "button",
      {
        ...buttonProps,
        className: "jk-toggle__control",
        id: controlId,
        type: "button",
        role: "switch",
        disabled,
        "aria-checked": currentChecked,
        "aria-labelledby":
          buttonProps["aria-labelledby"] ??
          (buttonProps["aria-label"] ? undefined : labelId),
        "aria-describedby": mergeIdRefs(
          buttonProps["aria-describedby"],
          descriptionId,
        ),
        "data-jk-component": "toggle",
        "data-jk-state": resolvedState,
        onClick: handleClick,
        onFocus: focus.onFocus,
        onBlur: focus.onBlur,
      },
      h(
        "span",
        { className: "jk-toggle__track", "aria-hidden": "true" },
        h("span", { className: "jk-toggle__thumb" }),
      ),
      h(
        "span",
        { className: "jk-toggle__copy" },
        h("span", { className: "jk-toggle__label", id: labelId }, label),
        h(
          "span",
          { className: "jk-toggle__state", "aria-hidden": "true" },
          currentChecked ? onLabel : offLabel,
        ),
      ),
    ),
    description
      ? h(
          "div",
          { className: "jk-toggle__description", id: descriptionId },
          description,
        )
      : null,
  );
}

/** Report user-relevant progress, results, or errors without an icon dependency. */
export function StatusMessage({
  children,
  state = "ready",
  label,
  action,
  className,
  role,
  ...messageProps
}) {
  const resolvedState = normalizeState(state, STATUS_STATES, "ready");
  const cue = label ||
    (resolvedState === "loading"
      ? "In progress"
      : resolvedState === "error"
        ? "Error"
        : "Status");
  const resolvedRole = role || (resolvedState === "error" ? "alert" : "status");

  return h(
    "div",
    {
      ...messageProps,
      className: joinClassNames("jk-status-message", className),
      role: resolvedRole,
      "aria-live": resolvedRole === "alert" ? "assertive" : "polite",
      "aria-atomic": "true",
      "aria-busy": resolvedState === "loading" ? "true" : undefined,
      "data-jk-component": "status_message",
      "data-jk-state": resolvedState,
    },
    resolvedState === "loading"
      ? h("span", {
          className: "jk-status-message__progress",
          "aria-hidden": "true",
        })
      : null,
    h("span", { className: "jk-status-message__cue" }, `${cue}:`),
    h("span", { className: "jk-status-message__body" }, children),
    action
      ? h("span", { className: "jk-status-message__action" }, action)
      : null,
  );
}

export {
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
} from "./native-components.mjs";

export {
  Dialog,
  Menu,
  Tabs,
} from "./interactive-components.mjs";
