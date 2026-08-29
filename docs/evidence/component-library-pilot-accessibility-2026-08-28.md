# Component library pilot accessibility receipt

Status: Pass for the bounded local pilot

Date: 2026-08-28

Reviewer: Codex, using source inspection, deterministic Chromium interaction, accessibility-tree assertions, automated scanning, and direct image inspection. This receipt is not a human screen-reader or assistive-technology evaluation.

## Bound evidence

- Browser run: `component-pilot-browser-2026-08-28T20:02:23.987Z`
- Browser: `Chrome/152.0.7977.65` from `Browser.getVersion`
- Implementation hash: `sha256:97c6d91310f4b4e5bfac630fe6f71527e8374879e4f2577c3406c567f69d1508`
- Components: `FormField`, `TextField`, `ActionButton`, `Toggle`, and `StatusMessage`
- Scenarios: 20 required component-state scenarios
- Presentations: 80 total across 1365 x 900 and 390 x 844, each in light and dark color schemes
- Accessibility scan: local `axe-core` 4.13.0, with zero violations and zero incomplete results in every presentation
- Network policy: an unreachable loopback proxy with an explicit loopback bypass; the test page stayed on its loopback origin and the external-request probe was blocked in all four viewport and appearance combinations

The run is bound to the current contract hashes and implementation hash in `component-library-pilot-evidence.json`. Missing or stale hashes, a missing or changed receipt, an incomplete presentation, or a failed package gate causes the registry to remove the affected verified-state claim.

## Keyboard, focus, and interaction walkthrough

- Real Chrome DevTools Protocol key events moved focus with Tab and activated applicable controls with Enter or Space.
- Real pointer events activated applicable controls, and text input used real key events rather than direct DOM value assignment.
- The browser asserted the actual focused element and a computed visible focus treatment of at least two CSS pixels for every focus-visible scenario.
- Ready controls accepted applicable input. Controlled-accept, controlled-reject, and uncontrolled field or toggle behavior were exercised without hiding the consumer-owned state boundary.
- Ready actions transitioned to loading and suppressed repeat activation. The ready status-message action transitioned to loading and removed its action while work was in progress.
- Disabled and loading controls suppressed keyboard and pointer activation.

## Semantics and announcements

- Controls exposed expected accessible names, roles, values, checked states, descriptions, error associations, invalid state, disabled state, and busy state where applicable.
- Field labels, help text, error text, and disabled reasons remained programmatically associated with their controls.
- Status messages exposed the intended status or alert behavior, live-region politeness, atomic updates, and loading state.
- Recoverable React hydration errors, uncaught page errors, and component specimen error markers were treated as failures; none remained in the bound run.

## Responsive and appearance review

- Every presentation had zero unintended horizontal overflow at both verified viewport sizes.
- Computed component color fingerprints differed between light and dark at both viewports, proving that the component layer responded to the requested color scheme.
- Five component-specific desktop-light captures were directly inspected, covering all 20 required states. The desktop and mobile page-shell captures were also inspected as global layout evidence. These temporary review images are not attached to individual scenarios or treated as durable per-scenario evidence.
- No unresolved required-behavior or visual-legibility finding remained.

Two defects discovered by the gate were corrected before this receipt: the disabled-reason text failed color contrast, and the status-message action layout overflowed at a narrow width.

## Package boundary

The packed-consumer gate passed against React 19.2.6. It resolved all five public exports and the explicit stylesheet, used exactly one React runtime, kept React external to the adapter bundle, and confirmed that the root library, CLI, and MCP entry points do not load React, React DOM, browser globals, or component CSS.

## Unsupported claims

This receipt does not establish:

- Firefox or WebKit compatibility
- screen-reader or other assistive-technology compatibility beyond the inspected DOM and Chromium accessibility semantics
- runtime behavior under forced-colors or reduced-motion preferences; those preferences currently have static CSS coverage only
- pixel parity with Figma
- support for components outside the five-export pilot
- standalone icon parity, icon mappings, or icon API changes

## Authority boundary

This pass authorizes no release action. Commit, push, PR, package publish, deployment, migration beyond `/design-system/components/`, and expansion beyond the five pilot components remain product-owner decisions.
