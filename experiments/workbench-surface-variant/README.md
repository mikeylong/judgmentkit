# Workbench surface presentation profile specimen

This directory preserves the spike and browser evidence that informed JudgmentKit's supported Workbench presentation profile. The specimen remains a review fixture; it is not runtime product code.

Profile: `judgmentkit.workbench.operational-v1`

Status: supporting evidence for a stable, supported profile

Surface type: `workbench`

## Decision

JudgmentKit supports a compact, flat, border-led presentation for grounded Workbench activity while preserving its activity-first, disclosure, action-boundary, and accessibility contracts.

The specimen keeps queue selection, request detail, evidence, decision, and handoff receipt adjacent on desktop. At responsive widths, it makes the same sequence explicit as Queue → Detail → Decision rather than compressing all three regions into an unreadable stack.

The product owner reviewed and visually approved the overall specimen direction on 2026-08-08. The title token later changed to a fixed `1.5rem`; that final adjustment passed a headless browser recheck but does not have a separate recorded human review. The decision promotes the versioned profile contract, not the specimen as a renderer or reusable component package. The architecture and activation decision are recorded in `docs/decisions/ADR-0001-workbench-surface-presentation-profile.md`.

## Activity fit

- Participants: a reviewer doing repeated work and a named next owner receiving a handoff.
- Objective: inspect a bounded request, compare the available evidence, choose an outcome, and leave a reason the next owner can use.
- Outcomes: advance, return for another pass, hold for context, or read a completed handoff receipt.
- Existing artifacts: a queue, request summary, supporting records, reviewer notes, due information, and prior handoff status.
- Rules and rituals: select one request, review evidence before deciding, give unavailable choices a visible reason, and leave a durable completion receipt.
- Division of labor: the surface organizes work and preserves the decision; the reviewer remains responsible for the judgment.
- Domain vocabulary used: request, evidence, decision, reason, next owner, handoff.
- Terms kept out of the primary surface: prompt, schema, resource id, MCP server, tool call, model configuration, trace, node, graph, and DAG.
- Diagnostic detail: appearance and state preview controls live in a visually separate specimen bar because this is a review fixture, not production product chrome.

## Interaction contract

- The user is trying to move repeated requests forward without losing selection context or reconstructing evidence.
- The user thinks in requests, supporting evidence, outcomes, reasons, and ownership—not implementation objects.
- The primary decision is what should happen next for the selected request.
- The surface makes selection, evidence comparison, unavailable-choice reasons, and handoff completion easy.
- It makes advancing without required evidence harder by disabling only the unsupported outcome and showing why.
- The single primary action is **Complete handoff**. **Save for later** remains secondary and explicitly leaves no handoff.
- Meaningful state changes are request selected, evidence available/missing/pending, outcome chosen, draft retained, and handoff recorded.
- The user should leave knowing which request was handled, why, what outcome was recorded, and who owns the next step.

## Running the specimen

The files have no dependencies and can be served from any static server rooted at the repository. Open:

```text
/experiments/workbench-surface-variant/index.html
```

The specimen also works when `index.html` is opened directly from disk. Query parameters make QA states reproducible:

```text
?theme=system&state=ready
?theme=light&state=loading
?theme=dark&state=error
?theme=system&state=empty
```

Both parameters can also be changed from the specimen bar. They update the URL without persisting a preference.

## Provenance and boundary

- Directional reference: `http://127.0.0.1:4180/?theme=system&rev=8`, reviewed on 2026-08-08.
- The local reference is not a runtime dependency, and no product-specific source, copy, graph model, or asset was copied into this specimen.
- Canonical JudgmentKit light/dark colors, spacing, radii, focus rings, font stacks, and appearance behavior are reproduced from the current JudgmentKit default design-system implementation contract in `src/index.mjs`.
- Inline status and action icons use shapes from JudgmentKit's committed Lucide 1.21.0 catalog. They remain paired with visible text and reasons.
- Workbench type and density properties use the required `--jk-` prefix and bind to the supported profile.
- This specimen directory is not a runtime dependency of surface recommendation, frontend generation context, the site build, or a renderer package. The canonical registry owns the matching profile metadata, and `/design-system/surface-presentation-profiles.json` publishes it for consumers.
- `surface_profile` defaults to `auto` for an independently supplied or sufficiently grounded Workbench. `none` opts out, and the exact profile id locks the supported version. A low-evidence fallback does not activate the presentation profile.
- An external design-system adapter remains authoritative when selected; it must not receive JudgmentKit Workbench styling as an implicit fallback.

## States included

The default fixture demonstrates ready, needs-attention, waiting, disabled-with-reason, selected, focus-visible, and completed-receipt work states. The Preview control and `state` query parameter add whole-surface loading, error, and empty states. Search also provides a no-results state.

Every status combines icon, label, and visible reason. Color is supplementary.

## Consumer QA expectations

The browser report records what this fixture passed. Every rendered consumer still needs evidence for the checks that apply to its implementation:

- Desktop: queue, detail/evidence, and decision/handoff remain simultaneously visible at 1280×800 and wider without clipped actions or text.
- Responsive: at 390×844 and 320 CSS pixels wide, the explicit Queue → Detail → Decision flow reflows without horizontal page scrolling.
- Appearance: system follows `prefers-color-scheme`; explicit light and dark override it; all canonical token values remain exact.
- Keyboard: tab order follows specimen controls → workbench flow → queue → detail → decision; every action is keyboard operable; focus remains visible and is not obscured.
- Selection: choosing a queue item updates detail, evidence, decision availability, and handoff ownership together.
- Status: ready, attention, waiting, missing, pending, completed, loading, error, empty, draft-saved, and receipt updates have text equivalents; asynchronous messages use status or alert semantics.
- Decision safety: unavailable outcomes are disabled with an adjacent reason; completion cannot happen without an available outcome; save-for-later does not create a receipt.
- Forced colors: selection, focus, control boundaries, primary action, and status meaning remain perceivable.
- Zoom and reflow: 200% zoom and 320 CSS pixel width preserve reading and operation without two-dimensional scrolling.
- Contrast: text targets WCAG 2.2 AA; meaningful custom boundaries and icons target 3:1 against adjacent colors. Each consumer needs computed browser evidence.
- Automated checks: parse JSON, syntax-check JavaScript, validate landmark/name-role-value behavior, and run an accessibility scan before accepting the rendered implementation.
- Content stress: long request names, participant names, evidence reasons, and 240-character notes wrap without collision or hidden controls.

## Files

- `index.html`: semantic regions, fixture controls, queue/detail/evidence/decision/handoff structure, and inline catalog icons.
- `styles.css`: canonical appearance tokens plus the Workbench profile's type, density, hierarchy, responsive, focus, and forced-colors rules.
- `app.js`: domain-neutral fixtures, selection, search, outcome constraints, handoff receipt, theme handling, and state previews.
- `specimen.json`: machine-readable profile metadata, activity and interaction contracts, states, provenance boundary, QA expectations, promotion decision, and ongoing requirements.
- `browser-qa.md`: recorded desktop/mobile, state, interaction, semantics, computed-contrast evidence, scoped human direction approval, final-token technical recheck, and remaining per-consumer checks.

## Limitations

- This is a generic specimen, not a renderer or reusable component package.
- The state data is local and ephemeral; reloading resets decisions.
- Search, save, and handoff behavior do not call an external system.
- The separate appearance control is justified only as specimen instrumentation; JudgmentKit's default production appearance policy does not require a visible toggle.
- Browser evidence, computed contrast, scoped human direction approval, and the final-token technical recheck are recorded in `browser-qa.md`; no separate human review of the final title token, visual-regression baseline, automated accessibility result, assistive-technology result, or forced-colors run is recorded.
- Mobile list/detail/decision navigation is intentionally linear, but browser and assistive-technology review must determine whether a back affordance or preserved scroll/focus behavior is needed.

## Promotion boundary

The stable profile includes only the adapter-layer guidance represented by the versioned registry: density, type hierarchy, region hierarchy, status and action emphasis, responsive expectations, and evidence requirements. The Workbench activity and pattern contracts remain upstream, while product layout details, reusable components, renderer choices, domain behavior, and authorization stay consumer-owned.

Second-domain validation remains required before promoting the specimen's individual UI techniques into shared JudgmentKit components. Component expansion is a later decision with its own contracts and evidence.
