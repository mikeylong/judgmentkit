(() => {
  "use strict";

  const root = document.documentElement;
  const mobileQuery = window.matchMedia("(max-width: 56.25rem)");

  const items = [
    {
      id: "RQ-4821",
      title: "Extend review window",
      submittedBy: "Avery Chen",
      due: "Today · 3:00 PM",
      updated: "12 min ago",
      status: {
        kind: "ready",
        label: "Ready",
        reason: "Required evidence is present",
      },
      summary:
        "Extend the current review window by five business days so the final comparison can include a newly received record.",
      question:
        "Does the available evidence support moving this request to the next owner?",
      evidence: [
        {
          title: "Original request",
          state: "Available",
          reason: "The requested change and rationale are complete.",
          tone: "success",
        },
        {
          title: "Comparison record",
          state: "Available",
          reason: "The current and proposed dates are shown together.",
          tone: "success",
        },
        {
          title: "Owner note",
          state: "Available",
          reason: "The next owner confirmed they can accept the handoff.",
          tone: "success",
        },
      ],
      nextOwner: "Coordination review",
      decision: "advance",
      disabledChoices: {},
      note: "",
      completed: false,
    },
    {
      id: "RQ-4816",
      title: "Replace supporting record",
      submittedBy: "Jordan Ellis",
      due: "Tomorrow · 10:00 AM",
      updated: "38 min ago",
      status: {
        kind: "attention",
        label: "Needs attention",
        reason: "One comparison note is missing",
      },
      summary:
        "Replace an outdated supporting record before the request advances to its final review.",
      question:
        "Should this return for another pass, or can the available context support a handoff?",
      evidence: [
        {
          title: "Original request",
          state: "Available",
          reason: "The requested replacement is named clearly.",
          tone: "success",
        },
        {
          title: "Replacement record",
          state: "Available",
          reason: "The newer record is attached and dated.",
          tone: "success",
        },
        {
          title: "Comparison note",
          state: "Missing",
          reason: "The reviewer has not explained what changed.",
          tone: "warning",
        },
      ],
      nextOwner: "Request owner",
      decision: "revise",
      disabledChoices: {
        advance: "Add the missing comparison note before handing this forward.",
      },
      note: "Please add a short comparison of the old and new records.",
      completed: false,
    },
    {
      id: "RQ-4809",
      title: "Confirm review coverage",
      submittedBy: "Morgan Reyes",
      due: "Friday · 1:00 PM",
      updated: "1 hr ago",
      status: {
        kind: "waiting",
        label: "Waiting",
        reason: "Confirmation requested from another owner",
      },
      summary:
        "Confirm that the planned review includes every affected item before the work is scheduled.",
      question:
        "Should the request remain on hold until the outstanding confirmation arrives?",
      evidence: [
        {
          title: "Coverage summary",
          state: "Available",
          reason: "The known items are listed in one place.",
          tone: "success",
        },
        {
          title: "Owner confirmation",
          state: "Pending",
          reason: "A response was requested this morning.",
          tone: "warning",
        },
        {
          title: "Prior review note",
          state: "Available",
          reason: "The most recent decision and rationale are included.",
          tone: "success",
        },
      ],
      nextOwner: "Coverage owner",
      decision: "hold",
      disabledChoices: {
        advance: "Owner confirmation is still outstanding.",
      },
      note: "Hold until the coverage owner confirms the remaining item.",
      completed: false,
    },
    {
      id: "RQ-4798",
      title: "Clarify next-owner note",
      submittedBy: "Samira Patel",
      due: "Completed",
      updated: "24 min ago",
      status: {
        kind: "complete",
        label: "Handed off",
        reason: "Decision and reason recorded",
      },
      summary:
        "Clarify the note that accompanies this request so the next owner can act without reconstructing the prior review.",
      question: "Is the handoff explicit enough for the next owner to continue?",
      evidence: [
        {
          title: "Original request",
          state: "Available",
          reason: "The requested clarification is included.",
          tone: "success",
        },
        {
          title: "Review note",
          state: "Available",
          reason: "The decision and supporting reason are adjacent.",
          tone: "success",
        },
      ],
      nextOwner: "Final review",
      decision: "advance",
      disabledChoices: {},
      note: "The note now names the decision, supporting evidence, and next action.",
      completed: true,
      receiptCopy: "This request was handed off 24 minutes ago with its decision and reason.",
    },
  ];

  const statusPresentation = {
    ready: { icon: "circle-check", tone: "success" },
    attention: { icon: "alert", tone: "warning" },
    waiting: { icon: "clock", tone: "warning" },
    complete: { icon: "circle-check", tone: "receipt" },
  };

  const evidencePresentation = {
    success: { icon: "circle-check", tone: "success" },
    warning: { icon: "alert", tone: "warning" },
    risk: { icon: "alert", tone: "risk" },
    muted: { icon: "circle", tone: "muted" },
  };

  const outcomeLabels = {
    advance: "Ready to hand off",
    revise: "Needs another pass",
    hold: "Hold for context",
  };

  const validThemes = new Set(["system", "light", "dark"]);
  const validPreviewStates = new Set(["ready", "loading", "error", "empty"]);
  const validViews = new Set(["queue", "detail", "decision"]);

  const elements = {
    themeSelect: document.querySelector("#theme-select"),
    stateSelect: document.querySelector("#state-select"),
    search: document.querySelector("#queue-search"),
    queueFeedback: document.querySelector("#queue-feedback"),
    queueList: document.querySelector("#queue-list"),
    queueCount: document.querySelector("#queue-count"),
    queueState: document.querySelector("#queue-state"),
    openCount: document.querySelector("#open-count"),
    waitingCount: document.querySelector("#waiting-count"),
    detailTitle: document.querySelector("#detail-title"),
    detailStatus: document.querySelector("#detail-status"),
    detailId: document.querySelector("#detail-id"),
    detailOwner: document.querySelector("#detail-owner"),
    detailDue: document.querySelector("#detail-due"),
    detailUpdated: document.querySelector("#detail-updated"),
    detailSummary: document.querySelector("#detail-summary"),
    detailQuestion: document.querySelector("#detail-question"),
    evidenceList: document.querySelector("#evidence-list"),
    evidenceCount: document.querySelector("#evidence-count"),
    detailContent: document.querySelector("#detail-content"),
    detailState: document.querySelector("#detail-state"),
    decisionForm: document.querySelector("#decision-form"),
    handoffNote: document.querySelector("#handoff-note"),
    noteCount: document.querySelector("#note-count"),
    actionBoundary: document.querySelector("#action-boundary"),
    completeHandoff: document.querySelector("#complete-handoff"),
    disabledActionReason: document.querySelector("#action-disabled-reason"),
    saveDraft: document.querySelector("#save-draft"),
    receipt: document.querySelector("#handoff-receipt"),
    receiptCopy: document.querySelector("#receipt-copy"),
    receiptOutcome: document.querySelector("#receipt-outcome"),
    receiptOwner: document.querySelector("#receipt-owner"),
    decisionState: document.querySelector("#decision-state"),
    toast: document.querySelector("#toast"),
  };

  let selectedId = items[0].id;
  let toastTimer;

  function createIcon(iconId, className = "icon") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", `#icon-${iconId}`);
    svg.append(use);
    return svg;
  }

  function getSelectedItem() {
    return items.find((item) => item.id === selectedId) || items[0];
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("theme", root.dataset.theme);
    url.searchParams.set("state", root.dataset.previewState);
    window.history.replaceState({}, "", url);
  }

  function setTheme(theme, shouldUpdateUrl = true) {
    const nextTheme = validThemes.has(theme) ? theme : "system";
    root.dataset.theme = nextTheme;
    elements.themeSelect.value = nextTheme;
    if (shouldUpdateUrl) updateUrl();
  }

  function setView(view, moveFocus = false) {
    const nextView = validViews.has(view) ? view : "queue";
    root.dataset.activeView = nextView;

    document.querySelectorAll(".flow-step").forEach((button) => {
      if (button.dataset.viewTarget === nextView) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    if (moveFocus && mobileQuery.matches) {
      const heading = {
        queue: document.querySelector("#queue-title"),
        detail: elements.detailTitle,
        decision: document.querySelector("#decision-heading"),
      }[nextView];
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    }
  }

  function renderQueue() {
    const query = elements.search.value.trim().toLowerCase();
    const filteredItems = items.filter((item) => {
      const searchable = `${item.id} ${item.title} ${item.submittedBy} ${item.status.label}`.toLowerCase();
      return searchable.includes(query);
    });

    elements.queueList.replaceChildren();
    elements.queueCount.textContent = String(filteredItems.length);
    elements.queueCount.setAttribute(
      "aria-label",
      `${filteredItems.length} ${filteredItems.length === 1 ? "request" : "requests"}`,
    );
    elements.queueFeedback.textContent = query
      ? `${filteredItems.length} ${filteredItems.length === 1 ? "match" : "matches"}`
      : `${filteredItems.length} requests · sorted by due time`;

    if (filteredItems.length === 0) {
      const item = document.createElement("li");
      item.className = "state-card";
      const title = document.createElement("h3");
      title.textContent = "No matching requests";
      const copy = document.createElement("p");
      copy.textContent = "Try a request number, title, person, or status.";
      item.append(createIcon("search"), title, copy);
      elements.queueList.append(item);
      return;
    }

    filteredItems.forEach((item) => {
      const presentation = statusPresentation[item.status.kind];
      const listItem = document.createElement("li");
      listItem.className = "queue-item";

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.itemId = item.id;
      button.setAttribute("aria-current", String(item.id === selectedId));
      button.setAttribute(
        "aria-label",
        `${item.title}, ${item.id}, ${item.status.label}: ${item.status.reason}`,
      );

      const top = document.createElement("span");
      top.className = "queue-row-top";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const id = document.createElement("span");
      id.className = "queue-id";
      id.textContent = item.id;
      top.append(title, id);

      const status = document.createElement("span");
      status.className = "queue-status";
      status.dataset.tone = presentation.tone;
      const statusCopy = document.createElement("span");
      const statusLabel = document.createElement("strong");
      statusLabel.textContent = `${item.status.label} · `;
      statusCopy.append(statusLabel, document.createTextNode(item.status.reason));
      status.append(createIcon(presentation.icon), statusCopy);

      const meta = document.createElement("span");
      meta.className = "queue-row-meta";
      const owner = document.createElement("span");
      owner.textContent = item.submittedBy;
      const due = document.createElement("span");
      due.textContent = item.due;
      meta.append(owner, due);

      button.append(top, status, meta);
      button.addEventListener("click", () => selectItem(item.id, true));
      listItem.append(button);
      elements.queueList.append(listItem);
    });
  }

  function renderStatusBadge(item) {
    const presentation = statusPresentation[item.status.kind];
    elements.detailStatus.replaceChildren(
      createIcon(presentation.icon),
      document.createTextNode(item.status.label),
    );
    elements.detailStatus.dataset.tone = presentation.tone;
    elements.detailStatus.title = item.status.reason;
    elements.detailStatus.setAttribute(
      "aria-label",
      `${item.status.label}: ${item.status.reason}`,
    );
  }

  function renderEvidence(item) {
    elements.evidenceList.replaceChildren();
    elements.evidenceCount.textContent = `${item.evidence.length} items`;

    item.evidence.forEach((evidence) => {
      const presentation = evidencePresentation[evidence.tone];
      const listItem = document.createElement("li");
      listItem.className = "evidence-item";

      const icon = createIcon(presentation.icon, "evidence-icon");
      icon.dataset.tone = presentation.tone;

      const copy = document.createElement("span");
      copy.className = "evidence-copy";
      const title = document.createElement("strong");
      title.textContent = evidence.title;
      const reason = document.createElement("small");
      reason.textContent = evidence.reason;
      copy.append(title, reason);

      const state = document.createElement("span");
      state.className = "evidence-state";
      state.dataset.tone = presentation.tone;
      state.textContent = evidence.state;

      listItem.append(icon, copy, state);
      elements.evidenceList.append(listItem);
    });
  }

  function renderDecision(item) {
    document.querySelectorAll(".decision-choice").forEach((label) => {
      const input = label.querySelector("input");
      const disabledReason = label.querySelector("[data-disabled-reason]");
      const reason = item.disabledChoices[input.value] || "";
      input.disabled = Boolean(reason);
      input.checked = input.value === item.decision && !input.disabled;
      disabledReason.textContent = reason;
    });

    if (!document.querySelector('input[name="decision"]:checked')) {
      const firstEnabled = document.querySelector('input[name="decision"]:not(:disabled)');
      if (firstEnabled) {
        firstEnabled.checked = true;
        item.decision = firstEnabled.value;
      }
    }

    elements.handoffNote.value = item.note;
    elements.noteCount.textContent = String(item.note.length);

    if (item.completed) {
      elements.decisionForm.hidden = true;
      showReceipt(item, false);
    } else {
      elements.decisionForm.hidden = false;
      elements.receipt.hidden = true;
      updateActionState(item);
    }
  }

  function renderSelected() {
    const item = getSelectedItem();
    elements.detailTitle.textContent = item.title;
    elements.detailId.textContent = item.id;
    elements.detailOwner.textContent = item.submittedBy;
    elements.detailDue.textContent = item.due;
    elements.detailUpdated.textContent = item.updated;
    elements.detailSummary.textContent = item.summary;
    elements.detailQuestion.textContent = item.question;
    renderStatusBadge(item);
    renderEvidence(item);
    renderDecision(item);
  }

  function selectItem(itemId, advanceOnMobile = false) {
    selectedId = itemId;
    renderQueue();
    renderSelected();
    if (advanceOnMobile && mobileQuery.matches) {
      setView("detail", true);
    }
  }

  function updateActionState(item = getSelectedItem()) {
    const selectedDecision = document.querySelector('input[name="decision"]:checked');
    const isDisabled = !selectedDecision || item.completed;
    elements.completeHandoff.disabled = isDisabled;
    elements.disabledActionReason.hidden = !isDisabled;
    elements.disabledActionReason.textContent = item.completed
      ? "This request already has a completed handoff."
      : "Choose an available outcome before completing the handoff.";

    if (selectedDecision) {
      item.decision = selectedDecision.value;
      elements.actionBoundary.textContent = `${outcomeLabels[selectedDecision.value]} will be recorded for ${item.nextOwner}.`;
    }
  }

  function showReceipt(item, announce = true) {
    elements.receiptCopy.textContent =
      item.receiptCopy || "The decision and supporting reason are now available to the next owner.";
    elements.receiptOutcome.textContent = outcomeLabels[item.decision];
    elements.receiptOwner.textContent = item.nextOwner;
    elements.receipt.hidden = false;
    if (announce) {
      elements.receipt.setAttribute("tabindex", "-1");
      elements.receipt.focus();
    }
  }

  function updateSummaryCounts() {
    elements.openCount.textContent = String(items.filter((item) => !item.completed).length);
    elements.waitingCount.textContent = String(
      items.filter((item) => item.status.kind === "waiting").length,
    );
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2600);
  }

  function makeStateCard({ icon, title, copy, tone = "muted", action }) {
    const card = document.createElement("div");
    card.className = "state-card";
    card.dataset.tone = tone;
    card.setAttribute("role", tone === "risk" ? "alert" : "status");
    card.append(createIcon(icon));

    const heading = document.createElement("h3");
    heading.textContent = title;
    const description = document.createElement("p");
    description.textContent = copy;
    card.append(heading, description);

    if (action) {
      const button = document.createElement("button");
      button.className = "button button-secondary";
      button.type = "button";
      button.append(createIcon("refresh"), document.createTextNode(action.label));
      button.addEventListener("click", action.onClick);
      card.append(button);
    }

    return card;
  }

  function makeLoadingCard(label) {
    const card = makeStateCard({
      icon: "clock",
      title: label,
      copy: "The current work remains in place while this view refreshes.",
    });
    const stack = document.createElement("span");
    stack.className = "loading-stack";
    stack.setAttribute("aria-hidden", "true");
    stack.append(
      Object.assign(document.createElement("span"), { className: "loading-line" }),
      Object.assign(document.createElement("span"), { className: "loading-line" }),
      Object.assign(document.createElement("span"), { className: "loading-line" }),
    );
    card.append(stack);
    return card;
  }

  function showPreviewPanels(previewState) {
    const isReady = previewState === "ready";
    elements.search.disabled = !isReady;
    elements.queueList.hidden = !isReady;
    elements.queueFeedback.hidden = !isReady;
    elements.detailContent.hidden = !isReady;
    elements.decisionForm.hidden = !isReady || getSelectedItem().completed;
    elements.receipt.hidden = !isReady || !getSelectedItem().completed;

    [elements.queueState, elements.detailState, elements.decisionState].forEach((panel) => {
      panel.hidden = isReady;
      panel.replaceChildren();
    });

    if (isReady) return;

    if (previewState === "loading") {
      elements.queueState.append(makeLoadingCard("Loading requests"));
      elements.detailState.append(makeLoadingCard("Loading request detail"));
      elements.decisionState.append(makeLoadingCard("Preparing decisions"));
      return;
    }

    if (previewState === "error") {
      const retry = () => setPreviewState("ready");
      elements.queueState.append(
        makeStateCard({
          icon: "alert",
          title: "Requests could not be refreshed",
          copy: "The current queue is unavailable. Try again before making a decision.",
          tone: "risk",
          action: { label: "Try again", onClick: retry },
        }),
      );
      elements.detailState.append(
        makeStateCard({
          icon: "alert",
          title: "Detail unavailable",
          copy: "Request context stays hidden until the queue can be refreshed.",
          tone: "risk",
        }),
      );
      elements.decisionState.append(
        makeStateCard({
          icon: "alert",
          title: "Decision unavailable",
          copy: "No handoff can be completed without the current request and evidence.",
          tone: "risk",
        }),
      );
      return;
    }

    elements.queueState.append(
      makeStateCard({
        icon: "inbox",
        title: "The queue is clear",
        copy: "There are no requests needing a decision right now.",
      }),
    );
    elements.detailState.append(
      makeStateCard({
        icon: "file",
        title: "No request selected",
        copy: "Request context will appear when new work enters the queue.",
      }),
    );
    elements.decisionState.append(
      makeStateCard({
        icon: "circle-check",
        title: "No decision needed",
        copy: "Every current request already has an outcome or handoff.",
        tone: "receipt",
      }),
    );
  }

  function setPreviewState(previewState, shouldUpdateUrl = true) {
    const nextState = validPreviewStates.has(previewState) ? previewState : "ready";
    root.dataset.previewState = nextState;
    elements.stateSelect.value = nextState;

    if (nextState === "ready") {
      renderQueue();
      renderSelected();
      updateSummaryCounts();
    } else if (nextState === "empty") {
      elements.queueCount.textContent = "0";
      elements.openCount.textContent = "0";
      elements.waitingCount.textContent = "0";
    }

    showPreviewPanels(nextState);
    if (shouldUpdateUrl) updateUrl();
  }

  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewTarget, true));
  });

  elements.themeSelect.addEventListener("change", (event) => setTheme(event.target.value));
  elements.stateSelect.addEventListener("change", (event) =>
    setPreviewState(event.target.value),
  );
  elements.search.addEventListener("input", renderQueue);

  document.querySelectorAll('input[name="decision"]').forEach((input) => {
    input.addEventListener("change", () => updateActionState());
  });

  elements.handoffNote.addEventListener("input", () => {
    const item = getSelectedItem();
    item.note = elements.handoffNote.value;
    elements.noteCount.textContent = String(item.note.length);
  });

  elements.saveDraft.addEventListener("click", () => {
    const item = getSelectedItem();
    item.note = elements.handoffNote.value;
    showToast(`Saved ${item.id} for later. No handoff was made.`);
  });

  elements.decisionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = getSelectedItem();
    const selectedDecision = document.querySelector('input[name="decision"]:checked');
    if (!selectedDecision || item.completed) {
      updateActionState(item);
      return;
    }

    item.decision = selectedDecision.value;
    item.note = elements.handoffNote.value;
    item.completed = true;
    item.updated = "Just now";
    item.due = "Completed";
    item.status = {
      kind: "complete",
      label: "Handed off",
      reason: "Decision and reason recorded",
    };
    item.receiptCopy = "The decision and supporting reason are now available to the next owner.";

    elements.decisionForm.hidden = true;
    showReceipt(item, true);
    renderStatusBadge(item);
    renderQueue();
    updateSummaryCounts();
  });

  const params = new URLSearchParams(window.location.search);
  setTheme(params.get("theme") || "system", false);
  setPreviewState(params.get("state") || "ready", false);
  setView("queue", false);
})();
