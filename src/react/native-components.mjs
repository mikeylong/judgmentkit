import React, {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const h = createElement;

const FIELD_STATES = new Set(["empty", "ready", "error", "disabled"]);
const TABLE_STATES = new Set(["empty", "ready", "loading", "error"]);
const PANEL_STATES = new Set(["ready", "loading", "error"]);
const ALERT_TONES = new Set(["neutral", "info", "success", "warning", "error"]);

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
    return Boolean(element?.matches?.(":focus-visible"));
  } catch {
    return false;
  }
}

function useFocusWithin({ onFocusCapture, onBlurCapture } = {}) {
  const [focusVisible, setFocusVisible] = useState(false);

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

  return {
    focusVisible,
    onFocusCapture: handleFocusCapture,
    onBlurCapture: handleBlurCapture,
  };
}

function useFocusVisible({ onFocus, onBlur } = {}) {
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

function assignRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref && typeof ref === "object") {
    ref.current = value;
  }
}

function FieldShell({
  componentId,
  controlId,
  label,
  helpText,
  errorMessage,
  disabledReason,
  required,
  disabled,
  baseState,
  className,
  children,
  onFocusCapture,
  onBlurCapture,
  ...wrapperProps
}) {
  const helpId = helpText ? `${controlId}-help` : undefined;
  const errorId = errorMessage ? `${controlId}-error` : undefined;
  const disabledReasonId = disabled && disabledReason
    ? `${controlId}-disabled-reason`
    : undefined;
  const focus = useFocusWithin({ onFocusCapture, onBlurCapture });
  const resolvedBaseState = normalizeState(baseState, FIELD_STATES, "ready");
  const resolvedState = focus.focusVisible ? "focus-visible" : resolvedBaseState;

  return h(
    "div",
    {
      ...wrapperProps,
      className: joinClassNames("jk-form-field", className),
      "data-jk-component": componentId,
      "data-jk-state": resolvedState,
      "data-jk-base-state": resolvedBaseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-disabled": disabled ? "true" : "false",
      "data-jk-invalid": errorMessage ? "true" : "false",
      onFocusCapture: focus.onFocusCapture,
      onBlurCapture: focus.onBlurCapture,
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
    h(
      "div",
      { className: "jk-form-field__control" },
      children({
        id: controlId,
        disabled: disabled || undefined,
        required: required || undefined,
        "aria-describedby": mergeIdRefs(helpId, errorId, disabledReasonId),
        "aria-errormessage": errorId,
        "aria-invalid": errorMessage ? "true" : undefined,
      }),
    ),
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

/** Collect longer written input with the shared labeled-field semantics. */
export function TextArea({
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
  className,
  textAreaClassName,
  rows = 4,
  ...textAreaProps
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = controlled ? value : internalValue;
  const controlId = useStableDomId(id, "jk-text-area");
  const empty = currentValue === "" || currentValue === null;
  const baseState = errorMessage
    ? "error"
    : disabled
      ? "disabled"
      : empty
        ? "empty"
        : "ready";

  function handleChange(event) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    if (!controlled) {
      setInternalValue(event.currentTarget.value);
    }
    onChange?.(event);
  }

  return h(
    FieldShell,
    {
      componentId: "text_area",
      controlId,
      label,
      helpText,
      errorMessage,
      disabledReason,
      required,
      disabled,
      baseState,
      className,
    },
    (accessibilityProps) =>
      h("textarea", {
        ...textAreaProps,
        ...accessibilityProps,
        className: joinClassNames("jk-text-area", textAreaClassName),
        rows,
        value: currentValue ?? "",
        "aria-describedby": mergeIdRefs(
          textAreaProps["aria-describedby"],
          accessibilityProps["aria-describedby"],
        ),
        "data-jk-component": "text_area",
        "data-jk-state": baseState,
        "data-jk-base-state": baseState,
        onChange: handleChange,
      }),
  );
}

function normalizeSelectOptions(options) {
  return options.map((option) => {
    if (option && typeof option === "object" && !isValidElement(option)) {
      return option;
    }
    return { value: option, label: String(option ?? "") };
  });
}

function collectSelectOptionValues(children) {
  const values = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      values.push(child.props.value ?? "");
      return;
    }
    if (child.type === "optgroup") {
      values.push(...collectSelectOptionValues(child.props.children));
    }
  });
  return values;
}

/** Choose one bounded value through a browser-owned native select. */
export function SelectField({
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
  onValueChange,
  options = [],
  placeholder,
  children,
  className,
  selectClassName,
  ...selectProps
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = controlled ? value : internalValue;
  const controlId = useStableDomId(id, "jk-select-field");
  const normalizedOptions = children === undefined
    ? normalizeSelectOptions(options)
    : null;
  const optionValues = children === undefined
    ? normalizedOptions.map((option) => option.value)
    : collectSelectOptionValues(children);
  const empty =
    currentValue === "" ||
    currentValue === null ||
    currentValue === undefined ||
    !includesChoice(optionValues, currentValue);
  const baseState = errorMessage
    ? "error"
    : disabled
      ? "disabled"
      : empty
        ? "empty"
        : "ready";

  function handleChange(event) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    const nextValue = event.currentTarget.value;
    if (!controlled) {
      setInternalValue(nextValue);
    }
    onChange?.(event);
    if (!event.defaultPrevented) {
      onValueChange?.(nextValue, event);
    }
  }

  const hasExplicitEmptyOption = children === undefined
    ? normalizedOptions.some((option) => String(option.value ?? "") === "")
    : Children.toArray(children).some(
        (option) =>
          isValidElement(option) &&
          String(option.props.value ?? "") === "",
      );
  const optionNodes = children ?? normalizedOptions.map((option, index) =>
    h(
      "option",
      {
        key: option.key ?? `${String(option.value)}-${index}`,
        value: option.value,
        disabled: option.disabled || undefined,
      },
      option.label,
    ),
  );

  return h(
    FieldShell,
    {
      componentId: "select_field",
      controlId,
      label,
      helpText,
      errorMessage,
      disabledReason,
      required,
      disabled,
      baseState,
      className,
    },
    (accessibilityProps) =>
      h(
        "select",
        {
          ...selectProps,
          ...accessibilityProps,
          className: joinClassNames("jk-select-field", selectClassName),
          value: empty ? "" : currentValue,
          "aria-describedby": mergeIdRefs(
            selectProps["aria-describedby"],
            accessibilityProps["aria-describedby"],
          ),
          "data-jk-component": "select_field",
          "data-jk-state": baseState,
          "data-jk-base-state": baseState,
          onChange: handleChange,
        },
        placeholder !== undefined || (empty && !hasExplicitEmptyOption)
          ? h(
              "option",
              { value: "", disabled: required || undefined },
              placeholder ?? "Select an option",
            )
          : null,
        optionNodes,
      ),
  );
}

function ChoiceOption({
  componentId,
  id,
  type,
  name,
  value,
  label,
  description,
  helpText,
  errorMessage,
  disabledReason,
  required,
  disabled,
  checked,
  indeterminate = false,
  onChange,
  className,
  inputClassName,
  inputRef,
  onFocus,
  onBlur,
  ...inputProps
}) {
  const descriptionCopy = description ?? helpText;
  const descriptionId = descriptionCopy ? `${id}-description` : undefined;
  const errorId = errorMessage ? `${id}-error` : undefined;
  const disabledReasonId = disabled && disabledReason
    ? `${id}-disabled-reason`
    : undefined;
  const focus = useFocusVisible({ onFocus, onBlur });
  const internalRef = useRef(null);
  const baseState = errorMessage ? "error" : disabled ? "disabled" : "ready";
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;

  useEffect(() => {
    if (type === "checkbox" && internalRef.current) {
      internalRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate, type]);

  const latestIndeterminateRef = useRef(Boolean(indeterminate));
  latestIndeterminateRef.current = Boolean(indeterminate);

  function handleChange(event) {
    onChange?.(event);
    if (type !== "checkbox") return;

    const enqueue = globalThis.queueMicrotask ??
      ((callback) => Promise.resolve().then(callback));
    enqueue(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = latestIndeterminateRef.current;
      }
    });
  }

  function setInputRef(node) {
    internalRef.current = node;
    assignRef(inputRef, node);
  }

  return h(
    "div",
    {
      className: joinClassNames("jk-choice-field", className),
      "data-jk-component": componentId,
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-disabled": disabled ? "true" : "false",
      "data-jk-invalid": errorMessage ? "true" : "false",
      "data-jk-checked": indeterminate ? "mixed" : checked ? "true" : "false",
    },
    h(
      "label",
      { className: "jk-choice-field__label", htmlFor: id },
      h("input", {
        ...inputProps,
        ref: setInputRef,
        className: joinClassNames("jk-choice-field__input", inputClassName),
        id,
        type,
        name,
        value,
        checked,
        disabled: disabled || undefined,
        required: required || undefined,
        "aria-checked": indeterminate ? "mixed" : undefined,
        "aria-describedby": mergeIdRefs(
          inputProps["aria-describedby"],
          descriptionId,
          errorId,
          disabledReasonId,
        ),
        "aria-errormessage": errorId,
        "aria-invalid": errorMessage ? "true" : undefined,
        "data-jk-component": componentId,
        "data-jk-state": resolvedState,
        "data-jk-base-state": baseState,
        onChange: handleChange,
        onFocus: focus.onFocus,
        onBlur: focus.onBlur,
      }),
      h("span", { className: "jk-choice-field__copy" }, label),
      required
        ? h(
            "span",
            {
              className: "jk-choice-field__required",
              title: "Required",
              "aria-hidden": "true",
            },
            " *",
          )
        : null,
    ),
    descriptionCopy
      ? h(
          "div",
          { className: "jk-choice-field__description", id: descriptionId },
          descriptionCopy,
        )
      : null,
    disabledReasonId
      ? h(
          "div",
          {
            className:
              "jk-choice-field__description jk-choice-field__disabled-reason",
            id: disabledReasonId,
          },
          disabledReason,
        )
      : null,
    errorMessage
      ? h(
          "div",
          {
            className: "jk-choice-field__error",
            id: errorId,
            "data-jk-error": "true",
          },
          h("span", { className: "jk-choice-field__error-label" }, "Error:"),
          " ",
          errorMessage,
        )
      : null,
  );
}

/** One independently selectable native checkbox option. */
export function CheckboxField({
  id,
  label,
  checked,
  defaultChecked = false,
  onChange,
  onCheckedChange,
  disabled = false,
  indeterminate = false,
  ...choiceProps
}) {
  const controlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
  const currentChecked = controlled ? Boolean(checked) : internalChecked;
  const controlId = useStableDomId(id, "jk-checkbox-field");

  function handleChange(event) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    const nextChecked = event.currentTarget.checked;
    if (!controlled) {
      setInternalChecked(nextChecked);
    }
    onChange?.(event);
    if (!event.defaultPrevented) {
      onCheckedChange?.(nextChecked, event);
    }
  }

  return h(ChoiceOption, {
    ...choiceProps,
    componentId: "checkbox_field",
    id: controlId,
    type: "checkbox",
    label,
    checked: currentChecked,
    disabled,
    indeterminate,
    onChange: handleChange,
  });
}

function normalizeChoiceOptions(options) {
  return options.map((option) => {
    if (option && typeof option === "object" && !isValidElement(option)) {
      return option;
    }
    return { value: option, label: String(option ?? "") };
  });
}

function includesChoice(values, candidate) {
  return values.some(
    (value) => Object.is(value, candidate) || String(value) === String(candidate),
  );
}

function ChoiceGroupFrame({
  componentId,
  id,
  legend,
  helpText,
  errorMessage,
  disabledReason,
  disabled,
  empty,
  className,
  children,
  onFocusCapture,
  onBlurCapture,
  ...fieldsetProps
}) {
  const groupId = useStableDomId(id, `jk-${componentId}`);
  const helpId = helpText ? `${groupId}-help` : undefined;
  const errorId = errorMessage ? `${groupId}-error` : undefined;
  const disabledReasonId = disabled && disabledReason
    ? `${groupId}-disabled-reason`
    : undefined;
  const focus = useFocusWithin({ onFocusCapture, onBlurCapture });
  const baseState = errorMessage
    ? "error"
    : disabled
      ? "disabled"
      : empty
        ? "empty"
        : "ready";
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;

  return h(
    "fieldset",
    {
      ...fieldsetProps,
      className: joinClassNames("jk-choice-group", className),
      id: groupId,
      disabled: disabled || undefined,
      "aria-describedby": mergeIdRefs(
        fieldsetProps["aria-describedby"],
        helpId,
        errorId,
        disabledReasonId,
      ),
      "aria-errormessage": errorId,
      "aria-invalid": errorMessage ? "true" : undefined,
      "data-jk-component": componentId,
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-disabled": disabled ? "true" : "false",
      "data-jk-invalid": errorMessage ? "true" : "false",
      onFocusCapture: focus.onFocusCapture,
      onBlurCapture: focus.onBlurCapture,
    },
    h("legend", { className: "jk-choice-group__legend" }, legend),
    helpText
      ? h(
          "div",
          { className: "jk-choice-group__description", id: helpId },
          helpText,
        )
      : null,
    h("div", { className: "jk-choice-group__options" }, children(groupId)),
    disabledReasonId
      ? h(
          "div",
          {
            className:
              "jk-choice-group__description jk-choice-group__disabled-reason",
            id: disabledReasonId,
          },
          disabledReason,
        )
      : null,
    errorMessage
      ? h(
          "div",
          {
            className: "jk-choice-group__error",
            id: errorId,
            "data-jk-error": "true",
          },
          h("span", { className: "jk-choice-group__error-label" }, "Error:"),
          " ",
          errorMessage,
        )
      : null,
  );
}

/** Choose any number of independent options through native checkboxes. */
export function CheckboxGroup({
  id,
  legend,
  options = [],
  value,
  defaultValue = [],
  onValueChange,
  disabled = false,
  children,
  ...groupProps
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => [...defaultValue]);
  const currentValue = controlled ? value : internalValue;
  const normalizedOptions = normalizeChoiceOptions(options);

  function optionChanged(optionValue, checked, event) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    const nextValue = checked
      ? includesChoice(currentValue, optionValue)
        ? [...currentValue]
        : [...currentValue, optionValue]
      : currentValue.filter(
          (entry) => !Object.is(entry, optionValue) && String(entry) !== String(optionValue),
        );
    if (!controlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue, event);
  }

  return h(
    ChoiceGroupFrame,
    {
      ...groupProps,
      componentId: "checkbox_group",
      id,
      legend,
      disabled,
      empty: false,
    },
    (groupId) =>
      children ?? normalizedOptions.map((option, index) =>
        h(CheckboxField, {
          key: option.key ?? `${String(option.value)}-${index}`,
          id: option.id ?? `${groupId}-option-${index + 1}`,
          name: option.name,
          value: option.value,
          label: option.label,
          description: option.description,
          checked: includesChoice(currentValue, option.value),
          disabled: disabled || Boolean(option.disabled),
          disabledReason: option.disabledReason,
          indeterminate: Boolean(option.indeterminate),
          onCheckedChange: (checked, event) =>
            optionChanged(option.value, checked, event),
        }),
      ),
  );
}

/** Choose exactly one mutually exclusive option through native radios. */
export function RadioGroup({
  id,
  name,
  legend,
  options = [],
  value,
  defaultValue,
  onChange,
  onValueChange,
  disabled = false,
  children,
  ...groupProps
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = controlled ? value : internalValue;
  const normalizedOptions = normalizeChoiceOptions(options);
  const empty =
    currentValue === undefined ||
    currentValue === null ||
    currentValue === "" ||
    (children === undefined &&
      !normalizedOptions.some((option) =>
        includesChoice([currentValue], option.value),
      ));

  function optionChanged(optionValue, event) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    if (!controlled) {
      setInternalValue(optionValue);
    }
    onChange?.(event);
    if (!event.defaultPrevented) {
      onValueChange?.(optionValue, event);
    }
  }

  return h(
    ChoiceGroupFrame,
    {
      ...groupProps,
      componentId: "radio_group",
      id,
      legend,
      disabled,
      empty,
    },
    (groupId) => {
      const groupName = name || `${groupId}-choice`;
      return children ?? normalizedOptions.map((option, index) => {
        const checked = includesChoice([currentValue], option.value) && !empty;
        return h(ChoiceOption, {
          key: option.key ?? `${String(option.value)}-${index}`,
          componentId: "radio_option",
          id: option.id ?? `${groupId}-option-${index + 1}`,
          type: "radio",
          name: groupName,
          value: option.value,
          label: option.label,
          description: option.description,
          checked,
          disabled: disabled || Boolean(option.disabled),
          disabledReason: option.disabledReason,
          onChange: (event) => optionChanged(option.value, event),
        });
      });
    },
  );
}

const ACTION_GROUP_NATIVE_DISABLE_TAGS = new Set([
  "button",
  "fieldset",
  "input",
  "optgroup",
  "select",
  "textarea",
]);

function suppressActionGroupInteraction(event) {
  event.preventDefault();
  event.stopPropagation();
}

function disableActionChildren(children) {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }
    if (child.type === React.Fragment) {
      return cloneElement(child, {
        children: disableActionChildren(child.props.children),
      });
    }
    const nextChildren = disableActionChildren(child.props.children);
    if (typeof child.type !== "string") {
      return cloneElement(child, {
        disabled: true,
        children: nextChildren,
      });
    }

    const tag = child.type.toLowerCase();
    if (tag === "a") {
      return cloneElement(child, {
        href: undefined,
        "aria-disabled": "true",
        tabIndex: -1,
        onClick: suppressActionGroupInteraction,
        children: nextChildren,
      });
    }
    if (ACTION_GROUP_NATIVE_DISABLE_TAGS.has(tag)) {
      return cloneElement(child, {
        disabled: true,
        children: nextChildren,
      });
    }

    const hasExplicitInteraction =
      typeof child.props.onClick === "function" ||
      Number(child.props.tabIndex) >= 0;
    return cloneElement(child, {
      ...(hasExplicitInteraction
        ? {
            "aria-disabled": "true",
            tabIndex: -1,
            onClick: suppressActionGroupInteraction,
            onKeyDown: suppressActionGroupInteraction,
          }
        : {}),
      children: nextChildren,
    });
  });
}

/** Keep related actions adjacent, labeled, and ordered as one decision group. */
export function ActionGroup({
  id,
  label,
  children,
  disabled = false,
  orientation = "horizontal",
  className,
  onFocusCapture,
  onBlurCapture,
  ...groupProps
}) {
  const groupId = useStableDomId(id, "jk-action-group");
  const labelId = label ? `${groupId}-label` : undefined;
  const focus = useFocusWithin({ onFocusCapture, onBlurCapture });
  const baseState = disabled ? "disabled" : "ready";
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;
  const renderedChildren = disabled ? disableActionChildren(children) : children;

  return h(
    "div",
    {
      ...groupProps,
      className: joinClassNames("jk-action-group", className),
      id: groupId,
      role: "group",
      "aria-labelledby":
        groupProps["aria-labelledby"] ??
        (groupProps["aria-label"] ? undefined : labelId),
      "aria-disabled": disabled ? "true" : undefined,
      "data-jk-component": "action_group",
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-disabled": disabled ? "true" : "false",
      "data-jk-orientation": orientation,
      onFocusCapture: focus.onFocusCapture,
      onBlurCapture: focus.onBlurCapture,
    },
    label
      ? h("div", { className: "jk-action-group__label", id: labelId }, label)
      : null,
    h("div", { className: "jk-action-group__actions" }, renderedChildren),
  );
}

function alertCueForTone(tone) {
  return {
    neutral: "Notice",
    info: "Information",
    success: "Success",
    warning: "Warning",
    error: "Error",
  }[tone];
}

/** Communicate important status or risk with a visible, non-color cue. */
export function Alert({
  children,
  title,
  label,
  tone = "neutral",
  action,
  role,
  className,
  onFocusCapture,
  onBlurCapture,
  ...alertProps
}) {
  const resolvedTone = ALERT_TONES.has(tone) ? tone : "neutral";
  const resolvedRole = role ||
    (resolvedTone === "warning" || resolvedTone === "error" ? "alert" : "status");
  const focus = useFocusWithin({ onFocusCapture, onBlurCapture });
  const resolvedState = focus.focusVisible ? "focus-visible" : "ready";

  return h(
    "div",
    {
      ...alertProps,
      className: joinClassNames("jk-alert", className),
      role: resolvedRole,
      "aria-live": resolvedRole === "alert" ? "assertive" : "polite",
      "aria-atomic": "true",
      "data-jk-component": "alert",
      "data-jk-state": resolvedState,
      "data-jk-base-state": "ready",
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-tone": resolvedTone,
      onFocusCapture: focus.onFocusCapture,
      onBlurCapture: focus.onBlurCapture,
    },
    h(
      "span",
      { className: "jk-alert__cue" },
      `${label || alertCueForTone(resolvedTone)}:`,
    ),
    h(
      "div",
      { className: "jk-alert__content" },
      title ? h("div", { className: "jk-alert__title" }, title) : null,
      h("div", { className: "jk-alert__message" }, children),
    ),
    action ? h("div", { className: "jk-alert__action" }, action) : null,
  );
}

function normalizeColumns(columns) {
  return columns.map((column) => {
    if (typeof column === "string") {
      return { key: column, header: column };
    }
    return column;
  });
}

function cellContent(column, row, rowIndex) {
  if (typeof column.render === "function") {
    return column.render(row[column.key], row, rowIndex);
  }
  if (typeof column.cell === "function") {
    return column.cell(row, rowIndex);
  }
  return row?.[column.key];
}

/** Compare structured records through a native table with explicit data states. */
export function Table({
  caption,
  columns = [],
  rows = [],
  state,
  loading = false,
  loadingMessage = "Loading records.",
  emptyMessage = "No records to show.",
  errorMessage,
  rowKey,
  className,
  tableClassName,
  onFocusCapture,
  onBlurCapture,
  ...tableProps
}) {
  const normalizedColumns = normalizeColumns(columns);
  const requestedState = normalizeState(state, TABLE_STATES, "ready");
  const baseState = requestedState === "error" || errorMessage
    ? "error"
    : requestedState === "loading" || loading
      ? "loading"
      : requestedState === "empty" || rows.length === 0
        ? "empty"
        : "ready";
  const focus = useFocusWithin({ onFocusCapture, onBlurCapture });
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;
  const colSpan = Math.max(normalizedColumns.length, 1);
  const stateMessage = baseState === "error"
    ? errorMessage || "The records could not be loaded."
    : baseState === "loading"
      ? loadingMessage
      : baseState === "empty"
        ? emptyMessage
        : null;

  return h(
    "div",
    {
      className: joinClassNames("jk-table-region", className),
      "data-jk-component": "table",
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      onFocusCapture: focus.onFocusCapture,
      onBlurCapture: focus.onBlurCapture,
    },
    h(
      "table",
      {
        ...tableProps,
        className: joinClassNames("jk-table", tableClassName),
        "aria-busy": baseState === "loading" ? "true" : undefined,
        "aria-invalid": baseState === "error" ? "true" : undefined,
        "data-jk-component": "table",
        "data-jk-state": resolvedState,
        "data-jk-base-state": baseState,
      },
      caption !== undefined
        ? h("caption", { className: "jk-table__caption" }, caption)
        : null,
      normalizedColumns.length > 0
        ? h(
            "thead",
            null,
            h(
              "tr",
              null,
              ...normalizedColumns.map((column, index) =>
                h(
                  "th",
                  {
                    key: column.key ?? index,
                    scope: "col",
                    abbr: column.abbr,
                  },
                  column.header,
                ),
              ),
            ),
          )
        : null,
      h(
        "tbody",
        null,
        stateMessage
          ? h(
              "tr",
              { "data-jk-table-state-row": baseState },
              h(
                "td",
                { colSpan },
                h(
                  "div",
                  {
                    role: baseState === "error" ? "alert" : "status",
                    "aria-live": baseState === "error" ? "assertive" : "polite",
                    "aria-atomic": "true",
                    "data-jk-table-state": baseState,
                  },
                  stateMessage,
                ),
              ),
            )
          : rows.map((row, rowIndex) => {
              const resolvedRowKey = typeof rowKey === "function"
                ? rowKey(row, rowIndex)
                : typeof rowKey === "string"
                  ? row?.[rowKey]
                  : row?.id ?? rowIndex;
              return h(
                "tr",
                { key: resolvedRowKey },
                ...normalizedColumns.map((column, columnIndex) => {
                  const CellTag = column.rowHeader ? "th" : "td";
                  return h(
                    CellTag,
                    {
                      key: column.key ?? columnIndex,
                      scope: column.rowHeader ? "row" : undefined,
                    },
                    cellContent(column, row, rowIndex),
                  );
                }),
              );
            }),
      ),
    ),
  );
}

function headingTag(level) {
  const normalizedLevel = Number(level);
  return Number.isInteger(normalizedLevel) && normalizedLevel >= 2 && normalizedLevel <= 6
    ? `h${normalizedLevel}`
    : "h2";
}

/** Group one coherent concern in a labeled region. */
export function Panel({
  as = "section",
  id,
  heading,
  headingLevel = 2,
  children,
  actions,
  state = "ready",
  loadingMessage = "Loading content.",
  errorMessage = "This content could not be loaded.",
  className,
  role,
  ...panelProps
}) {
  const panelId = useStableDomId(id, "jk-panel");
  const headingId = heading ? `${panelId}-heading` : undefined;
  const resolvedState = normalizeState(state, PANEL_STATES, "ready");
  const HeadingTag = headingTag(headingLevel);
  const resolvedRole = role ??
    (heading || panelProps["aria-label"] || panelProps["aria-labelledby"]
      ? "region"
      : undefined);

  return h(
    as,
    {
      ...panelProps,
      className: joinClassNames("jk-panel", className),
      id: panelId,
      role: resolvedRole,
      "aria-labelledby":
        panelProps["aria-labelledby"] ??
        (panelProps["aria-label"] ? undefined : headingId),
      "aria-busy": resolvedState === "loading" ? "true" : undefined,
      "aria-invalid": resolvedState === "error" ? "true" : undefined,
      "data-jk-component": "panel",
      "data-jk-state": resolvedState,
      "data-jk-base-state": resolvedState,
    },
    heading
      ? h(HeadingTag, { className: "jk-panel__heading", id: headingId }, heading)
      : null,
    resolvedState === "loading"
      ? h(
          "div",
          {
            className: "jk-panel__status",
            role: "status",
            "aria-live": "polite",
            "aria-atomic": "true",
          },
          loadingMessage,
        )
      : null,
    resolvedState === "error"
      ? h(
          "div",
          {
            className: "jk-panel__status",
            role: "alert",
            "aria-live": "assertive",
            "aria-atomic": "true",
          },
          errorMessage,
        )
      : null,
    h("div", { className: "jk-panel__content" }, children),
    actions ? h("div", { className: "jk-panel__actions" }, actions) : null,
  );
}

function renderCardAction(action, disabled) {
  if (!action) {
    return null;
  }
  if (action.type !== "link" && action.type !== "button") {
    throw new TypeError("Card action.type must be 'link' or 'button'.");
  }
  if (action.label === undefined || action.label === null || action.label === "") {
    throw new TypeError("Card actions require a visible label.");
  }

  const actionDisabled = disabled || Boolean(action.disabled);
  if (action.type === "link") {
    if (!action.href) {
      throw new TypeError("Card link actions require href.");
    }
    if (actionDisabled) {
      return h(
        "span",
        {
          className: joinClassNames("jk-card__action", action.className),
          "aria-disabled": "true",
          "data-jk-card-action": "link",
        },
        action.label,
      );
    }
    return h(
      "a",
      {
        className: joinClassNames("jk-card__action", action.className),
        href: action.href,
        target: action.target,
        rel: action.rel,
        download: action.download,
        onClick: action.onClick,
        "data-jk-card-action": "link",
      },
      action.label,
    );
  }

  return h(
    "button",
    {
      className: joinClassNames("jk-card__action", action.className),
      type: action.buttonType || "button",
      disabled: actionDisabled || undefined,
      name: action.name,
      value: action.value,
      onClick: action.onClick,
      "data-jk-card-action": "button",
    },
    action.label,
  );
}

const CARD_NATIVE_DISABLE_TAGS = new Set([
  "button",
  "fieldset",
  "input",
  "optgroup",
  "select",
  "textarea",
]);
const CARD_INTERACTIVE_ROLES = new Set([
  "button",
  "checkbox",
  "combobox",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
]);

function suppressCardInteraction(event) {
  event.preventDefault();
  event.stopPropagation();
}

function disableCardDescendants(content) {
  return Children.map(content, (child) => {
    if (!isValidElement(child)) {
      return child;
    }
    if (child.type === React.Fragment) {
      return cloneElement(child, {
        children: disableCardDescendants(child.props.children),
      });
    }

    const nextChildren = disableCardDescendants(child.props.children);
    if (typeof child.type !== "string") {
      return cloneElement(child, {
        disabled: true,
        children: nextChildren,
      });
    }

    const tag = child.type.toLowerCase();
    if (tag === "a") {
      return cloneElement(child, {
        href: undefined,
        "aria-disabled": "true",
        tabIndex: -1,
        onClick: suppressCardInteraction,
        children: nextChildren,
      });
    }
    if (CARD_NATIVE_DISABLE_TAGS.has(tag)) {
      return cloneElement(child, {
        disabled: true,
        children: nextChildren,
      });
    }

    const role = String(child.props.role ?? "").toLowerCase();
    const hasExplicitInteraction =
      CARD_INTERACTIVE_ROLES.has(role) ||
      typeof child.props.onClick === "function" ||
      Number(child.props.tabIndex) >= 0;
    return cloneElement(child, {
      ...(hasExplicitInteraction
        ? {
            "aria-disabled": "true",
            tabIndex: -1,
            onClick: suppressCardInteraction,
            onKeyDown: suppressCardInteraction,
          }
        : {}),
      children: nextChildren,
    });
  });
}

/** Summarize one item while keeping any link or button a distinct focus target. */
export function Card({
  as = "article",
  id,
  title,
  headingLevel = 3,
  summary,
  metadata,
  children,
  action,
  disabled = false,
  className,
  onFocusCapture,
  onBlurCapture,
  onClick,
  ...cardProps
}) {
  if (onClick) {
    throw new TypeError("Card wrappers are noninteractive; use the action prop.");
  }
  const cardId = useStableDomId(id, "jk-card");
  const headingId = title ? `${cardId}-heading` : undefined;
  const focus = useFocusWithin({ onFocusCapture, onBlurCapture });
  const baseState = disabled ? "disabled" : "ready";
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;
  const HeadingTag = headingTag(headingLevel);
  const renderedSummary = disabled
    ? disableCardDescendants(summary)
    : summary;
  const renderedMetadata = disabled
    ? disableCardDescendants(metadata)
    : metadata;
  const renderedChildren = disabled
    ? disableCardDescendants(children)
    : children;

  return h(
    as,
    {
      ...cardProps,
      className: joinClassNames("jk-card", className),
      id: cardId,
      "aria-labelledby":
        cardProps["aria-labelledby"] ??
        (cardProps["aria-label"] ? undefined : headingId),
      "aria-disabled": disabled ? "true" : undefined,
      "data-jk-component": "card",
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-disabled": disabled ? "true" : "false",
      "data-jk-action-type": action?.type ?? "none",
      onFocusCapture: focus.onFocusCapture,
      onBlurCapture: focus.onBlurCapture,
    },
    title
      ? h(HeadingTag, { className: "jk-card__title", id: headingId }, title)
      : null,
    renderedSummary
      ? h("div", { className: "jk-card__summary" }, renderedSummary)
      : null,
    renderedMetadata
      ? h("div", { className: "jk-card__metadata" }, renderedMetadata)
      : null,
    renderedChildren
      ? h("div", { className: "jk-card__content" }, renderedChildren)
      : null,
    action
      ? h("div", { className: "jk-card__actions" }, renderCardAction(action, disabled))
      : null,
  );
}
