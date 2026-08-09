# Workbench specimen browser QA

Date: 2026-08-08
Profile: `judgmentkit.workbench.operational-v1`
Status: supporting evidence for the promoted profile; partial rendered QA

The specimen was served from the repository root and exercised in the Codex in-app browser. The product owner reviewed and visually approved its overall direction on 2026-08-08 before the title token changed to a fixed `1.5rem`. The final token adjustment was technically rechecked below but does not have a separate recorded human review. These checks cover the generic local fixture only; the approval does not turn the specimen into a renderer or certify downstream implementations.

## Passed checks

- At 1440×900, queue, detail/evidence, and decision/handoff remained simultaneously visible. The document and viewport widths were both 1440 CSS pixels.
- At 390×844 and 320×844, the explicit Queue → Detail → Decision navigation showed one work region at a time. Document width equaled viewport width at both sizes, including dark mode at 390×844.
- `system` resolved through the current browser preference; explicit `light` and `dark` overrides selected the exact canonical JudgmentKit canvas, surface, text, and border values.
- Mobile navigation moved focus to the newly visible region heading. Focus styling on native controls computed to a 2px canonical focus outline plus the canonical 3px focus-ring shadow.
- Selecting a different request updated its detail, evidence, available outcomes, note, and next owner together.
- A request missing evidence disabled only **Ready to hand off** and showed the adjacent reason: “Add the missing comparison note before handing this forward.”
- Completing an eligible request hid the decision form, focused a live handoff receipt, named the recorded outcome and next owner, and reduced the open count.
- Loading, error, empty, and no-search-results previews exposed distinct readable states. Error regions used alert semantics; empty and loading regions used status semantics.
- A 240-character handoff note remained within the textarea, updated the visible character count to 240, and introduced no page-width overflow.
- Browser accessibility snapshots exposed named banner, main, queue/detail/decision regions, search, radios, disabled controls, alert/status content, and receipt content without implementation vocabulary in the product surface.

## Promotion recheck

The supported profile was rechecked in headless Playwright after the title token changed from viewport scaling to the fixed `1.5rem` required by the design-system typography guidance.

- At 1440×900 in light mode, the title resolved to 24px, all three work regions stayed visible, and document width matched the 1440px viewport.
- At 390×844 in dark mode, the title remained 24px, the explicit mobile flow showed one work region, and document width matched the 390px viewport.
- The generated Patterns page exposed one supported profile row at 1280px. At 390px, the page itself had no horizontal overflow; the existing table wrapper contained its wider 720px contract table as a local scroll region.
- The local static servers produced no application JavaScript errors. Their console noise was limited to missing production analytics or favicon assets that the static QA servers do not provide.

Local screenshot evidence is in `output/playwright/workbench-surface-profile/`. The directory is intentionally ignored and is not release evidence by itself.

## Contrast evidence

Ratios below were calculated from browser-computed colors against the active surface. They are checks of the supplied fixture, not a general proof for downstream products.

| Role | Light | Dark |
| --- | ---: | ---: |
| Primary text | 17.93:1 | 15.41:1 |
| Muted text | 6.23:1 | 9.18:1 |
| Workbench control boundary | 3.32:1 | 5.39:1 |
| Focus color against surface | 7.10:1 | 7.63:1 |
| Warning | 5.91:1 | 8.63:1 |
| Disabled | 3.27:1 | 4.50:1 |
| Receipt | 7.13:1 | 9.17:1 |

Canonical `--jk-color-border` remains a subtle divider token at 1.50:1 in light mode and 1.65:1 in dark mode. Interactive boundaries therefore use the profile-specific `--jk-workbench-control-border`, derived from canonical muted and surface tokens; passive panel and section dividers continue to use the canonical border token.

## Not yet verified

- Full sequential keyboard traversal and focus-not-obscured behavior across every control.
- Assistive-technology behavior in VoiceOver or another screen reader.
- Forced-colors rendering in a browser that can emulate or run that mode.
- An automated accessibility scan.
- Actual 200% browser zoom; the 320 CSS pixel reflow check is supporting evidence, not a substitute.
- Cross-browser visual regression baselines or saved screenshot artifacts.
- A second genuinely different domain specimen.

These remain per-consumer verification requirements and evidence for any later component-system expansion. They are not recorded as passed by the profile decision.
