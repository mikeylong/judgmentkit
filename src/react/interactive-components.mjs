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

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

function mergeIdRefs(...values) {
  const ids = values
    .flatMap((value) => String(value ?? "").split(/\s+/u))
    .filter(Boolean);
  return [...new Set(ids)].join(" ") || undefined;
}

function useStableDomId(explicitId, prefix) {
  const reactId = useId();
  const safeReactId = reactId.replace(/[^A-Za-z0-9_-]/gu, "");
  return explicitId || `${prefix}-${safeReactId || "control"}`;
}

function safeIdPart(value) {
  const safeValue = String(value ?? "item")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return safeValue || "item";
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

function includesValue(left, right) {
  return Object.is(left, right) || String(left) === String(right);
}

function normalizeTabs(items) {
  return items.map((item, index) => {
    if (item && typeof item === "object" && !isValidElement(item)) {
      return {
        ...item,
        value: item.value ?? item.id ?? index,
      };
    }
    return {
      value: index,
      label: String(item ?? ""),
      panel: null,
    };
  });
}

function nextEnabledIndex(items, startIndex, direction) {
  if (items.length === 0) return -1;

  for (let offset = 1; offset <= items.length; offset += 1) {
    const index = (startIndex + direction * offset + items.length) % items.length;
    if (!items[index]?.disabled) return index;
  }
  return -1;
}

/** Switch between peer sections with roving keyboard focus and associated panels. */
export function Tabs({
  id,
  label,
  items = [],
  value,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  activation = "automatic",
  disabled = false,
  className,
  tabListClassName,
  panelClassName,
  onFocusCapture,
  onBlurCapture,
  ...tabsProps
}) {
  if (!label) {
    throw new TypeError("Tabs require an accessible label.");
  }
  const tabsId = useStableDomId(id, "jk-tabs");
  const normalizedItems = normalizeTabs(items);
  const firstEnabledItem = normalizedItems.find((item) => !item.disabled);
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabledItem?.value,
  );
  const requestedValue = controlled ? value : internalValue;
  const requestedIndex = normalizedItems.findIndex((item) =>
    includesValue(item.value, requestedValue),
  );
  const selectedIndex = requestedIndex >= 0 && !normalizedItems[requestedIndex]?.disabled
    ? requestedIndex
    : normalizedItems.findIndex((item) => !item.disabled);
  const selectedValue = normalizedItems[selectedIndex]?.value;
  const tabRefs = useRef([]);
  const focus = useFocusWithin({ onFocusCapture, onBlurCapture });
  const resolvedOrientation = orientation === "vertical" ? "vertical" : "horizontal";
  const resolvedActivation = activation === "manual" ? "manual" : "automatic";
  const baseState = disabled ? "disabled" : "ready";
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;

  function selectItem(item, event) {
    if (disabled || item.disabled) {
      event?.preventDefault?.();
      return;
    }
    if (!controlled) {
      setInternalValue(item.value);
    }
    onValueChange?.(item.value, event);
  }

  function focusItem(index, event, selectOnFocus = resolvedActivation === "automatic") {
    if (index < 0 || !normalizedItems[index] || disabled) return;
    event?.preventDefault?.();
    tabRefs.current[index]?.focus();
    if (selectOnFocus) {
      selectItem(normalizedItems[index], event);
    }
  }

  function handleTabKeyDown(event, index) {
    const horizontalPrevious = event.key === "ArrowLeft" && resolvedOrientation === "horizontal";
    const horizontalNext = event.key === "ArrowRight" && resolvedOrientation === "horizontal";
    const verticalPrevious = event.key === "ArrowUp" && resolvedOrientation === "vertical";
    const verticalNext = event.key === "ArrowDown" && resolvedOrientation === "vertical";

    if (horizontalPrevious || verticalPrevious) {
      focusItem(nextEnabledIndex(normalizedItems, index, -1), event);
      return;
    }
    if (horizontalNext || verticalNext) {
      focusItem(nextEnabledIndex(normalizedItems, index, 1), event);
      return;
    }
    if (event.key === "Home") {
      focusItem(normalizedItems.findIndex((item) => !item.disabled), event);
      return;
    }
    if (event.key === "End") {
      const reversedIndex = [...normalizedItems]
        .reverse()
        .findIndex((item) => !item.disabled);
      const lastEnabledIndex = reversedIndex < 0
        ? -1
        : normalizedItems.length - reversedIndex - 1;
      focusItem(lastEnabledIndex, event);
      return;
    }
    if (
      resolvedActivation === "manual" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      selectItem(normalizedItems[index], event);
    }
  }

  return h(
    "div",
    {
      ...tabsProps,
      className: joinClassNames("jk-tabs", className),
      id: tabsId,
      "data-jk-component": "tabs",
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-disabled": disabled ? "true" : "false",
      "data-jk-orientation": resolvedOrientation,
      onFocusCapture: focus.onFocusCapture,
      onBlurCapture: focus.onBlurCapture,
    },
    h(
      "div",
      {
        className: joinClassNames("jk-tabs__list", tabListClassName),
        role: "tablist",
        "aria-label": label,
        "aria-orientation": resolvedOrientation,
      },
      ...normalizedItems.map((item, index) => {
        const selected = index === selectedIndex;
        const itemDisabled = disabled || Boolean(item.disabled);
        const valuePart = `${safeIdPart(item.id ?? item.value ?? index)}-${index + 1}`;
        const tabId = `${tabsId}-tab-${valuePart}`;
        const panelId = `${tabsId}-panel-${valuePart}`;
        return h(
          "button",
          {
            key: item.key ?? valuePart,
            ref: (node) => {
              tabRefs.current[index] = node;
            },
            className: joinClassNames("jk-tabs__tab", item.className),
            id: tabId,
            type: "button",
            role: "tab",
            disabled: itemDisabled || undefined,
            tabIndex: selected && !itemDisabled ? 0 : -1,
            "aria-selected": selected ? "true" : "false",
            "aria-controls": panelId,
            "data-jk-selected": selected ? "true" : "false",
            onClick: (event) => selectItem(item, event),
            onKeyDown: (event) => handleTabKeyDown(event, index),
          },
          item.label,
        );
      }),
    ),
    ...normalizedItems.map((item, index) => {
      const selected = index === selectedIndex;
      const valuePart = `${safeIdPart(item.id ?? item.value ?? index)}-${index + 1}`;
      const tabId = `${tabsId}-tab-${valuePart}`;
      const panelId = `${tabsId}-panel-${valuePart}`;
      return h(
        "div",
        {
          key: `panel-${item.key ?? valuePart}`,
          className: joinClassNames("jk-tabs__panel", panelClassName, item.panelClassName),
          id: panelId,
          role: "tabpanel",
          tabIndex: 0,
          hidden: selected ? undefined : true,
          "aria-labelledby": tabId,
          "data-jk-selected": selected ? "true" : "false",
        },
        item.panel ?? item.children ?? null,
      );
    }),
    selectedValue === undefined && normalizedItems.length === 0
      ? h("div", { className: "jk-tabs__empty" }, "No sections are available.")
      : null,
  );
}

function normalizeMenuItems(items) {
  return items.map((item, index) => {
    if (item && typeof item === "object" && !isValidElement(item)) {
      return {
        type: item.type ?? "item",
        ...item,
        id: item.id ?? `item-${index + 1}`,
      };
    }
    return {
      id: `item-${index + 1}`,
      type: "item",
      label: String(item ?? ""),
    };
  });
}

function menuItemIndexes(items) {
  return items.flatMap((item, index) =>
    item.type === "item" ? [index] : [],
  );
}

/** Reveal a compact set of contextual commands with dismissal and focus return. */
export function Menu({
  id,
  label,
  menuLabel,
  items = [],
  open,
  defaultOpen = false,
  onOpenChange,
  onSelect,
  disabled = false,
  disabledReason,
  className,
  triggerClassName,
  menuClassName,
  onFocusCapture,
  onBlurCapture,
  ...menuProps
}) {
  if (!label) {
    throw new TypeError("Menu requires a visible trigger label.");
  }
  const menuId = useStableDomId(id, "jk-menu");
  const triggerId = `${menuId}-trigger`;
  const popupId = `${menuId}-popup`;
  const disabledReasonId = disabled && disabledReason
    ? `${menuId}-disabled-reason`
    : undefined;
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(Boolean(defaultOpen));
  const isOpen = controlled ? Boolean(open) : internalOpen;
  const normalizedItems = normalizeMenuItems(items);
  const itemIndexes = menuItemIndexes(normalizedItems);
  const [focusIndex, setFocusIndex] = useState(itemIndexes[0] ?? -1);
  const triggerRef = useRef(null);
  const rootRef = useRef(null);
  const itemRefs = useRef([]);
  const pendingFocusRef = useRef(null);
  const pendingReturnFocusRef = useRef(false);
  const previousOpenRef = useRef(false);
  const typeaheadRef = useRef({ value: "", at: 0 });
  const focus = useFocusWithin({ onFocusCapture, onBlurCapture });
  const baseState = disabled ? "disabled" : "ready";
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;

  function setOpen(nextOpen, reason, event) {
    if (disabled && nextOpen) {
      event?.preventDefault?.();
      return;
    }
    if (!controlled) {
      setInternalOpen(nextOpen);
    }
    if (nextOpen || (reason !== "selection" && reason !== "escape")) {
      pendingReturnFocusRef.current = false;
    }
    onOpenChange?.(nextOpen, { reason, event });
  }

  function closeAndReturnFocus(reason, event) {
    pendingReturnFocusRef.current = true;
    setOpen(false, reason, event);
  }

  function openWithFocus(position, event) {
    if (itemIndexes.length === 0) {
      setOpen(true, "trigger", event);
      return;
    }
    const nextIndex = position === "last"
      ? itemIndexes.at(-1)
      : itemIndexes[0];
    setFocusIndex(nextIndex);
    pendingFocusRef.current = nextIndex;
    setOpen(true, "trigger", event);
  }

  useEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = isOpen;

    if (isOpen) {
      const pendingIndex = pendingFocusRef.current;
      pendingFocusRef.current = null;
      const nextIndex = pendingIndex ?? (!wasOpen ? itemIndexes[0] : undefined);
      if (nextIndex !== undefined) {
        setFocusIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
      }
      return;
    }

    if (!wasOpen || !pendingReturnFocusRef.current) return;

    pendingReturnFocusRef.current = false;
    const requestFrame = globalThis.requestAnimationFrame ??
      ((callback) => setTimeout(callback, 0));
    requestFrame(() => triggerRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false, "outside-pointer", event);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, controlled]);

  function moveMenuFocus(direction, event) {
    if (itemIndexes.length === 0) return;
    event.preventDefault();
    const currentPosition = Math.max(itemIndexes.indexOf(focusIndex), 0);
    const nextPosition =
      (currentPosition + direction + itemIndexes.length) % itemIndexes.length;
    const nextIndex = itemIndexes[nextPosition];
    setFocusIndex(nextIndex);
    itemRefs.current[nextIndex]?.focus();
  }

  function moveMenuFocusByText(key, event) {
    if (itemIndexes.length === 0) return;
    const now = Date.now();
    const previous = typeaheadRef.current;
    const withinWindow = now - previous.at < 700;
    const buffered = `${withinWindow ? previous.value : ""}${key.toLocaleLowerCase()}`;
    const repeatedCharacter =
      buffered.length > 1 &&
      [...buffered].every((character) => character === buffered[0]);
    let query = repeatedCharacter ? buffered[0] : buffered;
    let nextIndex = findMenuItemByText(query);

    if (nextIndex === undefined && query.length > 1) {
      query = key.toLocaleLowerCase();
      nextIndex = findMenuItemByText(query);
    }

    typeaheadRef.current = { value: query, at: now };
    if (nextIndex === undefined) return;

    event.preventDefault();
    setFocusIndex(nextIndex);
    itemRefs.current[nextIndex]?.focus();
  }

  function findMenuItemByText(query) {
    const currentPosition = itemIndexes.indexOf(focusIndex);
    const orderedIndexes = [
      ...itemIndexes.slice(currentPosition + 1),
      ...itemIndexes.slice(0, currentPosition + 1),
    ];
    return orderedIndexes.find((index) =>
      String(normalizedItems[index]?.label ?? "")
        .trim()
        .toLocaleLowerCase()
        .startsWith(query),
    );
  }

  function handleMenuKeyDown(event) {
    if (event.key === "ArrowDown") {
      moveMenuFocus(1, event);
    } else if (event.key === "ArrowUp") {
      moveMenuFocus(-1, event);
    } else if (event.key === "Home") {
      if (itemIndexes.length === 0) return;
      event.preventDefault();
      const nextIndex = itemIndexes[0];
      setFocusIndex(nextIndex);
      itemRefs.current[nextIndex]?.focus();
    } else if (event.key === "End") {
      if (itemIndexes.length === 0) return;
      event.preventDefault();
      const nextIndex = itemIndexes.at(-1);
      setFocusIndex(nextIndex);
      itemRefs.current[nextIndex]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeAndReturnFocus("escape", event);
    } else if (event.key === "Tab") {
      setOpen(false, "tab", event);
    } else if (event.key === "Enter" || event.key === " ") {
      const menuItem = event.target.closest?.('[role="menuitem"]');
      if (menuItem) {
        event.preventDefault();
        menuItem.click();
      }
    } else if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      moveMenuFocusByText(event.key, event);
    }
  }

  function selectMenuItem(item, event) {
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    item.onSelect?.(item.value ?? item.id, event);
    onSelect?.(item.value ?? item.id, item, event);
    if (!event.defaultPrevented) {
      closeAndReturnFocus("selection", event);
    }
  }

  return h(
    "div",
    {
      ...menuProps,
      ref: rootRef,
      className: joinClassNames("jk-menu", className),
      id: menuId,
      "data-jk-component": "menu",
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-disabled": disabled ? "true" : "false",
      "data-jk-open": isOpen ? "true" : "false",
      onFocusCapture: focus.onFocusCapture,
      onBlurCapture: focus.onBlurCapture,
    },
    h(
      "button",
      {
        ref: triggerRef,
        className: joinClassNames("jk-menu__trigger", triggerClassName),
        id: triggerId,
        type: "button",
        disabled: disabled || undefined,
        "aria-haspopup": "menu",
        "aria-expanded": isOpen ? "true" : "false",
        "aria-describedby": disabledReasonId,
        onClick: (event) => {
          if (isOpen) {
            setOpen(false, "trigger", event);
          } else {
            openWithFocus("first", event);
          }
        },
        onKeyDown: (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openWithFocus(event.key === "ArrowUp" ? "last" : "first", event);
          } else if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            setOpen(false, "escape", event);
          }
        },
      },
      label,
    ),
    disabledReasonId
      ? h(
          "div",
          {
            className: "jk-menu__disabled-reason",
            id: disabledReasonId,
          },
          disabledReason,
        )
      : null,
    isOpen
      ? h(
          "div",
          {
            className: joinClassNames("jk-menu__popup", menuClassName),
            id: popupId,
            role: "menu",
            "aria-label": menuLabel || undefined,
            "aria-labelledby": menuLabel ? undefined : triggerId,
            onKeyDown: handleMenuKeyDown,
          },
          ...normalizedItems.map((item, index) => {
            if (item.type === "separator") {
              return h("div", {
                key: item.key ?? item.id,
                className: "jk-menu__separator",
                role: "separator",
              });
            }
            if (item.type === "heading") {
              return h(
                "div",
                {
                  key: item.key ?? item.id,
                  className: "jk-menu__heading",
                  role: "presentation",
                },
                item.label,
              );
            }

            const sharedProps = {
              ref: (node) => {
                itemRefs.current[index] = node;
              },
              className: joinClassNames("jk-menu__item", item.className),
              role: "menuitem",
              tabIndex: index === focusIndex ? 0 : -1,
              "aria-disabled": item.disabled ? "true" : undefined,
              "data-jk-menu-item": item.id,
              onFocus: () => setFocusIndex(index),
              onClick: (event) => selectMenuItem(item, event),
            };

            if (item.href && !item.disabled) {
              return h(
                "a",
                {
                  ...sharedProps,
                  key: item.key ?? item.id,
                  href: item.href,
                  target: item.target,
                  rel: item.rel,
                },
                item.label,
              );
            }

            return h(
              "button",
              {
                ...sharedProps,
                key: item.key ?? item.id,
                type: "button",
              },
              item.label,
            );
          }),
        )
      : null,
  );
}

function disableDialogActions(children, disabled) {
  if (!disabled) return children;
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === React.Fragment) {
      return cloneElement(child, {
        children: disableDialogActions(child.props.children, disabled),
      });
    }
    if (child.type === "a") {
      return cloneElement(child, {
        href: undefined,
        "aria-disabled": "true",
        tabIndex: -1,
        onClick: (event) => event.preventDefault(),
      });
    }
    return cloneElement(child, { disabled: true });
  });
}

function focusFirstDialogControl(dialog, preferredRef) {
  const preferred = preferredRef?.current;
  if (preferred && dialog.contains(preferred)) {
    preferred.focus();
    return;
  }
  const target = dialog.querySelector(
    "[autofocus], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
  );
  (target ?? dialog).focus();
}

function DialogDismissIcon() {
  return h(
    "svg",
    {
      className: "jk-dialog__dismiss-icon",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      focusable: "false",
      "aria-hidden": "true",
      "data-jk-icon": "x",
    },
    h("path", { d: "M18 6 6 18" }),
    h("path", { d: "m6 6 12 12" }),
  );
}

/** Present a bounded blocking decision using the native dialog element. */
export function Dialog({
  id,
  title,
  children,
  actions,
  open,
  defaultOpen = false,
  onOpenChange,
  onDismiss,
  dismissLabel = "Close",
  dismissible = true,
  loading = false,
  loadingMessage = "Working on this decision.",
  errorMessage,
  initialFocusRef,
  returnFocusRef,
  className,
  onFocusCapture,
  onBlurCapture,
  onClose,
  ...dialogProps
}) {
  if (
    !title &&
    !dialogProps["aria-label"] &&
    !dialogProps["aria-labelledby"]
  ) {
    throw new TypeError(
      "Dialog requires a title, aria-label, or aria-labelledby.",
    );
  }
  const dialogId = useStableDomId(id, "jk-dialog");
  const titleId = `${dialogId}-title`;
  const descriptionId = errorMessage
    ? `${dialogId}-error`
    : loading
      ? `${dialogId}-loading`
      : undefined;
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(Boolean(defaultOpen));
  const isOpen = controlled ? Boolean(open) : internalOpen;
  const dialogRef = useRef(null);
  const priorFocusRef = useRef(null);
  const isOpenRef = useRef(isOpen);
  const restorePendingRef = useRef(false);
  const restoreCompletedRef = useRef(false);
  const reconciledCloseEventsRef = useRef(0);
  const controlledRef = useRef(controlled);
  const dismissibleRef = useRef(dismissible);
  const isLoadingRef = useRef(false);
  const initialFocusRefProp = useRef(initialFocusRef);
  const returnFocusRefProp = useRef(returnFocusRef);
  const onOpenChangeRef = useRef(onOpenChange);
  const onCloseRef = useRef(onClose);
  isOpenRef.current = isOpen;
  const focus = useFocusWithin({ onFocusCapture, onBlurCapture });
  const isLoading = Boolean(loading && !errorMessage);
  controlledRef.current = controlled;
  dismissibleRef.current = dismissible;
  isLoadingRef.current = isLoading;
  initialFocusRefProp.current = initialFocusRef;
  returnFocusRefProp.current = returnFocusRef;
  onOpenChangeRef.current = onOpenChange;
  onCloseRef.current = onClose;
  const baseState = errorMessage ? "error" : isLoading ? "loading" : "ready";
  const resolvedState = focus.focusVisible ? "focus-visible" : baseState;
  const resolvedDismissLabel =
    typeof dismissLabel === "string" && dismissLabel.trim()
      ? dismissLabel.trim()
      : "Close";

  function setOpen(nextOpen, reason, event) {
    if (!controlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen, { reason, event });
  }

  function requestFocusRestore() {
    if (restorePendingRef.current || restoreCompletedRef.current) return;
    const target = returnFocusRefProp.current?.current ?? priorFocusRef.current;
    if (!target) return;
    restorePendingRef.current = true;
    const requestFrame = globalThis.requestAnimationFrame ??
      ((callback) => setTimeout(callback, 0));
    requestFrame(() => {
      restorePendingRef.current = false;
      if (restoreCompletedRef.current) return;
      const dialog = dialogRef.current;
      if (!dialog || !dialog.open || !isOpenRef.current) {
        target.focus?.();
        restoreCompletedRef.current =
          !target.ownerDocument || target.ownerDocument.activeElement === target;
      }
    });
  }

  function requestDismiss(reason, event) {
    if (!dismissible || isLoading) {
      event?.preventDefault?.();
      return;
    }
    onDismiss?.({ reason, event });
    if (!event?.defaultPrevented) {
      requestFocusRestore();
      setOpen(false, reason, event);
    }
  }

  useEffect(
    () => () => {
      if (isOpenRef.current) {
        requestFocusRestore();
      }
    },
    [],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    function handleNativeClose(event) {
      onCloseRef.current?.(event);
      const reconciledClose = reconciledCloseEventsRef.current > 0;
      if (reconciledClose) {
        reconciledCloseEventsRef.current -= 1;
      }
      const nativeCloseAllowed =
        dismissibleRef.current && !isLoadingRef.current;
      if (
        !nativeCloseAllowed &&
        isOpenRef.current &&
        !dialog.open
      ) {
        if (typeof dialog.showModal === "function") {
          dialog.showModal();
        } else {
          dialog.setAttribute("open", "");
        }
        focusFirstDialogControl(dialog, initialFocusRefProp.current);
        return;
      }

      if (!reconciledClose && nativeCloseAllowed && isOpenRef.current) {
        if (!controlledRef.current) {
          setInternalOpen(false);
        }
        onOpenChangeRef.current?.(false, {
          reason: "native-close",
          event,
        });
      }

      setTimeout(() => {
        if (
          controlledRef.current &&
          isOpenRef.current &&
          !dialog.open
        ) {
          if (typeof dialog.showModal === "function") {
            dialog.showModal();
          } else {
            dialog.setAttribute("open", "");
          }
          focusFirstDialogControl(dialog, initialFocusRefProp.current);
          return;
        }
        requestFocusRestore();
      }, 0);
    }

    dialog.addEventListener("close", handleNativeClose);
    return () => dialog.removeEventListener("close", handleNativeClose);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      restoreCompletedRef.current = false;
      if (typeof document !== "undefined" && !dialog.open) {
        priorFocusRef.current = document.activeElement;
      }
      if (!dialog.open) {
        if (typeof dialog.showModal === "function") {
          dialog.showModal();
        } else {
          dialog.setAttribute("open", "");
        }
      }
      const requestFrame = globalThis.requestAnimationFrame ?? ((callback) => setTimeout(callback, 0));
      requestFrame(() => focusFirstDialogControl(dialog, initialFocusRef));
    } else if (dialog.open) {
      if (typeof dialog.close === "function") {
        reconciledCloseEventsRef.current += 1;
        try {
          dialog.close();
          const target =
            returnFocusRefProp.current?.current ?? priorFocusRef.current;
          if (
            target?.ownerDocument &&
            target.ownerDocument.activeElement === target
          ) {
            restoreCompletedRef.current = true;
          }
        } catch (error) {
          reconciledCloseEventsRef.current -= 1;
          throw error;
        }
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [isOpen, initialFocusRef]);

  return h(
    "dialog",
    {
      ...dialogProps,
      ref: dialogRef,
      className: joinClassNames("jk-dialog", className),
      id: dialogId,
      tabIndex: dialogProps.tabIndex ?? -1,
      "aria-labelledby":
        dialogProps["aria-labelledby"] ??
        (dialogProps["aria-label"] ? undefined : titleId),
      "aria-describedby": mergeIdRefs(
        dialogProps["aria-describedby"],
        descriptionId,
      ),
      "aria-busy": isLoading ? "true" : undefined,
      "aria-invalid": errorMessage ? "true" : undefined,
      "data-jk-component": "dialog",
      "data-jk-state": resolvedState,
      "data-jk-base-state": baseState,
      "data-jk-focus-visible": focus.focusVisible ? "true" : "false",
      "data-jk-open": isOpen ? "true" : "false",
      onFocusCapture: focus.onFocusCapture,
      onBlurCapture: focus.onBlurCapture,
      onCancel: (event) => {
        if (!dismissible || isLoading) {
          event.preventDefault();
          return;
        }
        onDismiss?.({ reason: "escape", event });
        if (!event.defaultPrevented) {
          // Keep the native element controlled by React, then close through
          // the same state transition used by the visible dismiss action.
          event.preventDefault();
          requestFocusRestore();
          setOpen(false, "escape", event);
        }
      },
    },
    h(
      "div",
      { className: "jk-dialog__header" },
      title
        ? h("h2", { className: "jk-dialog__title", id: titleId }, title)
        : null,
      dismissible
        ? h(
            "button",
            {
              className: "jk-dialog__dismiss",
              type: "button",
              disabled: isLoading || undefined,
              "aria-label": resolvedDismissLabel,
              onClick: (event) => requestDismiss("dismiss-button", event),
            },
            h(DialogDismissIcon),
          )
        : null,
    ),
    isLoading
      ? h(
          "div",
          {
            className: "jk-dialog__status",
            id: descriptionId,
            role: "status",
            "aria-live": "polite",
            "aria-atomic": "true",
          },
          loadingMessage,
        )
      : null,
    errorMessage
      ? h(
          "div",
          {
            className: "jk-dialog__status",
            id: descriptionId,
            role: "alert",
            "aria-live": "assertive",
            "aria-atomic": "true",
          },
          errorMessage,
        )
      : null,
    h("div", { className: "jk-dialog__body" }, children),
    actions
      ? h(
          "div",
          {
            className: "jk-dialog__actions",
            "aria-disabled": isLoading ? "true" : undefined,
            inert: isLoading ? true : undefined,
          },
          disableDialogActions(actions, isLoading),
        )
      : null,
  );
}
