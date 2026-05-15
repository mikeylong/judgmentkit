import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createUiImplementationContract,
  reviewUiImplementationCandidate,
} from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const HTML_OUTPUT_PATH = path.join(
  ROOT_DIR,
  "examples/demo/modal-actions-evidence-demo.html",
);
const HTML_OUTPUT_DISPLAY = "examples/demo/modal-actions-evidence-demo.html";
const EVIDENCE_CAVEAT =
  "pass with reviewed: 0 means no modal-action evidence was inspected, not proof that the UI has no dialogs.";

const SCENARIOS = [
  {
    id: "omittedEvidence",
    title: "Omitted modal evidence",
    description:
      "Candidate uses ModalActions but does not provide modal_actions evidence.",
    expected: {
      implementation_review_status: "passed",
      modal_status: "pass",
      reviewed: 0,
    },
  },
  {
    id: "validEvidence",
    title: "Valid LTR completion order",
    description:
      "Cancel precedes the primary completion action, and Enter submits that primary action.",
    expected: {
      implementation_review_status: "passed",
      modal_status: "pass",
      reviewed: 1,
    },
    modalAction: {
      context: "New card modal",
      direction: "ltr",
      destructive: false,
      visual_order: ["Cancel", "Create card"],
      primary_action: "Create card",
      secondary_actions: ["Cancel"],
      form_submit_action: "Create card",
    },
  },
  {
    id: "invalidOrder",
    title: "Primary before cancel",
    description:
      "The primary completion action appears before the cancel action in an LTR dialog.",
    expected: {
      implementation_review_status: "failed",
      modal_status: "fail",
      reviewed: 1,
    },
    modalAction: {
      context: "New card modal",
      direction: "ltr",
      destructive: false,
      visual_order: ["Create card", "Cancel"],
      primary_action: "Create card",
      secondary_actions: ["Cancel"],
      form_submit_action: "Create card",
    },
  },
  {
    id: "primaryNotFinal",
    title: "Primary not visually final",
    description:
      "The cancel action is before the primary action, but another action appears after the primary action.",
    expected: {
      implementation_review_status: "failed",
      modal_status: "fail",
      reviewed: 1,
    },
    modalAction: {
      context: "Invite teammate modal",
      direction: "ltr",
      destructive: false,
      visual_order: ["Cancel", "Send invite", "Close"],
      primary_action: "Send invite",
      secondary_actions: ["Cancel"],
      form_submit_action: "Send invite",
    },
  },
  {
    id: "wrongSubmit",
    title: "Wrong form submit action",
    description:
      "The visible order is valid, but the form submit/default Enter action points at Cancel.",
    expected: {
      implementation_review_status: "failed",
      modal_status: "fail",
      reviewed: 1,
    },
    modalAction: {
      context: "New card modal",
      direction: "ltr",
      destructive: false,
      visual_order: ["Cancel", "Create card"],
      primary_action: "Create card",
      secondary_actions: ["Cancel"],
      form_submit_action: "Cancel",
    },
  },
  {
    id: "destructive",
    title: "Destructive dialog",
    description:
      "Destructive dialogs are outside this non-destructive ordering rule and need separate review.",
    expected: {
      implementation_review_status: "passed",
      modal_status: "not_applicable",
      reviewed: 1,
    },
    modalAction: {
      context: "Delete board modal",
      direction: "ltr",
      destructive: true,
      visual_order: ["Delete board", "Cancel"],
      primary_action: "Delete board",
      secondary_actions: ["Cancel"],
      form_submit_action: "Delete board",
    },
  },
  {
    id: "rtl",
    title: "RTL dialog",
    description:
      "RTL dialogs are outside this LTR visual-final rule and need direction-specific review.",
    expected: {
      implementation_review_status: "passed",
      modal_status: "not_applicable",
      reviewed: 1,
    },
    modalAction: {
      context: "RTL create modal",
      direction: "rtl",
      destructive: false,
      visual_order: ["Create card", "Cancel"],
      primary_action: "Create card",
      secondary_actions: ["Cancel"],
      form_submit_action: "Create card",
    },
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildImplementationContract() {
  return createUiImplementationContract({
    repo_name: "JudgmentKit",
    target_stack: "scripted modal action fixture",
    repo_evidence: [
      "contracts/ai-ui-generation.activity-contract.json",
      "src/index.mjs reviewUiImplementationCandidate modal_actions check",
      "tests/ui-generation-handoff.test.mjs modal action cases",
    ],
  }).implementation_contract;
}

function buildCandidate(scenario, implementationContract) {
  const candidate = {
    code: "renderModalActions({ primaryAction, secondaryActions })",
    primitives_used: ["FormField", "ModalActions"],
    states_covered: implementationContract.state_coverage.required_states,
    static_checks: ["npm run check"],
    browser_qa: {
      desktop: "desktop viewport modal footer order checked",
      mobile: "mobile viewport modal footer order checked",
    },
  };

  if (scenario.modalAction) {
    candidate.modal_actions = [scenario.modalAction];
  }

  return candidate;
}

function collectProblems(modalActions) {
  return modalActions.entries.flatMap((entry) => entry.problems ?? []);
}

function collectReasons(modalActions) {
  return modalActions.entries
    .map((entry) => entry.reason)
    .filter((reason) => typeof reason === "string" && reason.length > 0);
}

function validateOutcome(outcome) {
  const mismatches = [];

  if (
    outcome.review.implementation_review_status !==
    outcome.expected.implementation_review_status
  ) {
    mismatches.push(
      `implementation_review_status expected ${outcome.expected.implementation_review_status}, got ${outcome.review.implementation_review_status}`,
    );
  }

  if (outcome.modalActions.status !== outcome.expected.modal_status) {
    mismatches.push(
      `modal_actions.status expected ${outcome.expected.modal_status}, got ${outcome.modalActions.status}`,
    );
  }

  if (outcome.modalActions.reviewed !== outcome.expected.reviewed) {
    mismatches.push(
      `modal_actions.reviewed expected ${outcome.expected.reviewed}, got ${outcome.modalActions.reviewed}`,
    );
  }

  if (mismatches.length > 0) {
    throw new Error(
      `${outcome.id} demo expectation mismatch: ${mismatches.join("; ")}`,
    );
  }
}

function runScenario(scenario, implementationContract) {
  const review = reviewUiImplementationCandidate(
    buildCandidate(scenario, implementationContract),
    { implementation_contract: implementationContract },
  );
  const modalActions = review.checks.modal_actions;
  const outcome = {
    ...scenario,
    review,
    modalActions,
    modalFindings: review.findings.filter(
      (finding) => finding.check === "modal_actions",
    ),
    problems: collectProblems(modalActions),
    reasons: collectReasons(modalActions),
  };

  validateOutcome(outcome);

  return outcome;
}

function formatList(values) {
  return values.length > 0 ? values.join("; ") : "none";
}

function buildTranscript(outcomes) {
  const lines = [
    "# JudgmentKit Modal Action Evidence Demo",
    "",
    "This is a scripted fixture demo.",
    "It exercises reviewUiImplementationCandidate against curated modal action evidence.",
    `Static report: ${HTML_OUTPUT_DISPLAY}`,
    "",
    "## Evidence-driven caveat",
    "",
    EVIDENCE_CAVEAT,
    "",
    "## Scenario Results",
    "",
  ];

  for (const outcome of outcomes) {
    lines.push(
      `### ${outcome.id}`,
      "",
      outcome.description,
      "",
      `- Expected: implementation ${outcome.expected.implementation_review_status}, modal_actions.status ${outcome.expected.modal_status}, modal_actions.reviewed ${outcome.expected.reviewed}`,
      `- Implementation review status: ${outcome.review.implementation_review_status}`,
      `- modal_actions.status: ${outcome.modalActions.status}`,
      `- modal_actions.reviewed: ${outcome.modalActions.reviewed}`,
      `- Problems: ${formatList(outcome.problems)}`,
      `- Not applicable reasons: ${formatList(outcome.reasons)}`,
      `- Findings: ${formatList(
        outcome.modalFindings.map((finding) => finding.message),
      )}`,
      "",
    );
  }

  return lines.join("\n");
}

function renderInlineList(values) {
  if (values.length === 0) {
    return '<span class="muted">none</span>';
  }

  return `<ul>${values
    .map((value) => `<li>${escapeHtml(value)}</li>`)
    .join("")}</ul>`;
}

function statusClass(value) {
  return String(value).replace(/_/g, "-");
}

function renderScenarioRow(outcome) {
  return `
        <tr data-scenario-id="${escapeHtml(outcome.id)}">
          <th scope="row">
            <span>${escapeHtml(outcome.id)}</span>
            <small>${escapeHtml(outcome.title)}</small>
          </th>
          <td><span class="status status-${statusClass(outcome.review.implementation_review_status)}">${escapeHtml(outcome.review.implementation_review_status)}</span></td>
          <td><span class="status status-${statusClass(outcome.modalActions.status)}">${escapeHtml(outcome.modalActions.status)}</span></td>
          <td>${escapeHtml(outcome.modalActions.reviewed)}</td>
          <td>${renderInlineList([...outcome.problems, ...outcome.reasons])}</td>
        </tr>`;
}

function renderScenarioDetail(outcome) {
  const firstEntry = outcome.modalActions.entries[0] ?? {};
  const visualOrder = firstEntry.order?.join(" -> ") ?? "none supplied";

  return `
      <article class="scenario-detail" id="${escapeHtml(outcome.id)}-detail">
        <div>
          <p class="eyebrow">${escapeHtml(outcome.id)}</p>
          <h2>${escapeHtml(outcome.title)}</h2>
          <p>${escapeHtml(outcome.description)}</p>
        </div>
        <dl>
          <div>
            <dt>Visual order</dt>
            <dd>${escapeHtml(visualOrder)}</dd>
          </div>
          <div>
            <dt>Primary action</dt>
            <dd>${escapeHtml(firstEntry.primary_action ?? "none supplied")}</dd>
          </div>
          <div>
            <dt>Form submit action</dt>
            <dd>${escapeHtml(firstEntry.form_submit_action ?? "none supplied")}</dd>
          </div>
          <div>
            <dt>Findings and problems</dt>
            <dd>${renderInlineList([
              ...outcome.problems,
              ...outcome.reasons,
              ...outcome.modalFindings.map((finding) => finding.message),
            ])}</dd>
          </div>
        </dl>
      </article>`;
}

function buildHtml(outcomes) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JudgmentKit Modal Action Evidence Demo</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #17222d;
      --muted: #64717e;
      --line: #cfd8e3;
      --surface: #f6f8fb;
      --panel: #ffffff;
      --pass: #1f6b46;
      --fail: #9b2f28;
      --skip: #735c12;
      --accent: #245f73;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--ink);
      background: var(--surface);
    }

    main {
      max-width: 1160px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }

    header {
      display: grid;
      gap: 12px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--line);
    }

    h1,
    h2,
    p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 0;
      font-size: clamp(2rem, 5vw, 4rem);
      line-height: 1;
    }

    h2 {
      margin-bottom: 8px;
      font-size: 1.05rem;
    }

    p {
      line-height: 1.55;
    }

    code {
      padding: 2px 5px;
      border-radius: 4px;
      background: #e9eef4;
      font-size: 0.92em;
    }

    table {
      width: 100%;
      margin-top: 24px;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--line);
    }

    th,
    td {
      padding: 14px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    th small {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-weight: 500;
    }

    ul {
      margin: 0;
      padding-left: 18px;
    }

    .note {
      max-width: 760px;
      margin-bottom: 0;
      color: var(--muted);
    }

    .caveat {
      border-left: 4px solid var(--accent);
      padding: 12px 14px;
      background: #eaf3f6;
      color: var(--ink);
    }

    .status {
      display: inline-block;
      min-width: 92px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.78rem;
      font-weight: 760;
      text-align: center;
      text-transform: uppercase;
    }

    .status-passed,
    .status-pass {
      background: #e4f3eb;
      color: var(--pass);
    }

    .status-failed,
    .status-fail {
      background: #f8e8e6;
      color: var(--fail);
    }

    .status-not-applicable {
      background: #f6efd0;
      color: var(--skip);
    }

    .muted {
      color: var(--muted);
    }

    .scenario-details {
      display: grid;
      gap: 14px;
      margin-top: 24px;
    }

    .scenario-detail {
      display: grid;
      grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
      gap: 24px;
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    .eyebrow,
    dt {
      margin-bottom: 5px;
      color: var(--muted);
      font-size: 0.75rem;
      font-weight: 760;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    dl {
      display: grid;
      gap: 12px;
      margin: 0;
    }

    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }

    @media (max-width: 780px) {
      table {
        display: block;
        overflow-x: auto;
      }

      .scenario-detail {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">JudgmentKit scripted fixture</p>
      <h1>Modal Action Evidence Demo</h1>
      <p class="note">This local report shows how <code>reviewUiImplementationCandidate</code> evaluates structured <code>modal_actions</code> evidence for the <code>ModalActions</code> primitive.</p>
      <p class="caveat">${escapeHtml(EVIDENCE_CAVEAT)}</p>
    </header>

    <section aria-label="Scenario summary">
      <table>
        <thead>
          <tr>
            <th scope="col">Scenario</th>
            <th scope="col">Implementation</th>
            <th scope="col">modal_actions.status</th>
            <th scope="col">reviewed</th>
            <th scope="col">Findings / problems</th>
          </tr>
        </thead>
        <tbody>
          ${outcomes.map(renderScenarioRow).join("")}
        </tbody>
      </table>
    </section>

    <section class="scenario-details" aria-label="Scenario details">
      ${outcomes.map(renderScenarioDetail).join("")}
    </section>
  </main>
</body>
</html>
`;
}

async function main() {
  const implementationContract = buildImplementationContract();
  const outcomes = SCENARIOS.map((scenario) =>
    runScenario(scenario, implementationContract),
  );

  await fs.mkdir(path.dirname(HTML_OUTPUT_PATH), { recursive: true });
  await fs.writeFile(HTML_OUTPUT_PATH, buildHtml(outcomes));

  process.stdout.write(`${buildTranscript(outcomes)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown demo error.";

  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
