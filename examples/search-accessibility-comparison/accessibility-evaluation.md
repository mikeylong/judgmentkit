# Search Page Accessibility Comparison

This comparison uses two static pages inspired by a familiar search-home pattern:

- `without-judgmentkit.html`: a plausible unguided baseline.
- `with-judgmentkit-mcp.html`: an implementation shaped by JudgmentKit MCP activity review, implementation contract, and implementation-review evidence.

The product UI in both pages uses generic Findly branding. JudgmentKit and MCP terms appear only in this evaluation artifact.

## Evaluation Criteria

Both pages were evaluated against the same WCAG 2.2 AA and JudgmentKit accessibility evidence categories:

- Semantics and landmarks.
- Programmatic labels and accessible names.
- Name, role, value for interactive controls.
- Keyboard navigation and focus order.
- Visible focus indication.
- Empty-query validation and status-message behavior.
- Text and non-text contrast.
- Target size for links and buttons.
- Reduced-motion handling.
- Responsive reflow and no horizontal overflow at 320px.

## Results

| Category | Unguided baseline | JudgmentKit MCP-guided |
| --- | --- | --- |
| Semantics and landmarks | Partial. Uses `header`, `main`, and `footer`, but the search form is not identified as a search landmark. | Pass. Uses semantic landmarks, named nav regions, and `role="search"` on the search form. |
| Programmatic labels | Fail. The search field relies on placeholder text and has no associated label. | Pass. The search input has a programmatic label and help/status descriptions. |
| Name, role, value | Partial. Buttons and links are semantic; the search input lacks a stable accessible name. | Pass. Links, buttons, input, invalid state, disabled state, and live status are programmatically determinable. |
| Keyboard navigation | Partial. Native controls are keyboard reachable, but missing focus indication makes position hard to determine. | Pass. Links, input, and buttons are reachable in source order; Enter submits the form. |
| Focus-visible | Fail. Focus outlines are removed for links, buttons, and input. | Pass. All interactive elements receive a high-contrast visible focus outline. |
| Status and errors | Fail. Empty-query feedback is visual text only and is not announced as a live status. | Pass. Empty-query feedback uses a text message, `role="status"`, `aria-live`, and `aria-invalid`. |
| Text contrast | Partial. Primary text is readable, but footer links, muted status text, and some button text are low contrast. | Pass. Text colors meet AA contrast targets against their backgrounds. |
| Non-text contrast | Partial. Search boundary and focus state are weak or absent. | Pass. Search boundary and focus treatments meet the 3:1 non-text contrast target. |
| Forced colors | Not checked. Custom colors and removed focus outlines have no high-contrast override. | Pass. A `forced-colors: active` media query preserves system borders and focus color. |
| Target size | Partial. Search box is large, but links and buttons use smaller click targets than the guided page. | Pass. Links and buttons use 44px-class targets. |
| Reduced motion | Not applicable. No animation or auto motion is used. | Pass. No meaningful motion is required; reduced-motion CSS is present for resilience. |
| Responsive reflow | Pass with caveat. The page reflows at narrow widths, but smaller controls remain harder to use. | Pass. The page avoids horizontal overflow at narrow widths while preserving target size. |

## JudgmentKit MCP Evidence

The guided page was generated after a JudgmentKit MCP activity review and implementation contract for the search-starting activity. `review_ui_implementation_candidate` passed the implementation gate for the guided page with approved primitives, required states, static checks, and desktop/mobile browser-QA evidence.

The expanded repo-local accessibility gate passed with core evidence and condition-specific evidence for form labels, form errors, status messages, non-text contrast, forced colors, target size, and reduced motion.

The baseline page is intentionally not reviewed as MCP-guided work. It is evaluated against the same criteria to show the accessibility gaps that a direct hand-built pass commonly leaves behind.

## Rendered Check Notes

Chrome headless checks at 1440px and 320px confirmed both pages fit the viewport. They also confirmed the intended accessibility difference:

- Baseline: zero associated input labels, no search landmark, no live status, no `:focus-visible` rule, no reduced-motion rule, no forced-colors rule, 36px buttons, and 15-16px link hit areas.
- JudgmentKit MCP-guided: one associated input label, search landmark present, live status present, `:focus-visible` present, reduced-motion and forced-colors rules present, 44px buttons, and 44px navigation/footer link targets.

The empty-query interaction check produced:

| Page | Focus after submit | Invalid state | Status semantics | Message |
| --- | --- | --- | --- | --- |
| Baseline | `body` | none | none | `Type something first.` |
| JudgmentKit MCP-guided | search input | `aria-invalid="true"` | `role="status"` and `aria-live="polite"` | `Enter a search term before continuing.` |
