# JudgmentKit public site header

Visitors evaluate JudgmentKit, read examples and documentation, or set up its MCP integration. They navigate with ordinary page links and may move between JudgmentKit and Surfaces. The site author maintains the navigation; visitors choose their destination. The header should make those destinations easy to find without requiring visitors to understand a platform ecosystem.

The primary decisions are where to learn about JudgmentKit and whether to visit Surfaces. Use JudgmentKit, Value, Docs, Design System, Examples, Evals, MCP, Handbooks, and surfaces.systems. Keep schemas, tool names, internal identifiers, and obsolete ecosystem descriptions out of the header. Setup details remain on the relevant destination pages.

## Interaction contract

1. The top-left home link contains JudgmentKit's own logomark, using the same `/favicon.svg` asset as the browser favicon, followed by JudgmentKit. Treat the mark as decorative within the named home link. Preserve the 32 px mark slot and its alignment with Surfaces.
2. Desktop navigation sits on the right and retains all six JudgmentKit destinations, a Handbooks link to https://handbooks.surfaces.systems/, and a direct https://surfaces.systems/ link in the same tab.
3. Current-page state is visible without changing font weight or link width. All links and controls have visible keyboard focus.
4. The mobile menu exposes the same destinations, supports keyboard activation, closes on Escape with focus returned to its button, and closes after link selection or an outside click. Restored pages and desktop resize do not retain an open menu.
5. Completion means the visitor reaches the chosen page. The header adds no confirmation or intermediate domain chooser.

## Cross-site alignment

The live Surfaces header measured on 2026-10-01 is the reference: a 72 px sticky header, no bottom border, a centered 1120 px shell with 24 px minimum side gutters, and 16 px gutters at widths up to 820 px. The brand uses a 32 px mark, 10 px gap, 20 px Inter at weight 600 and line height 1.15. Navigation uses 14 px Inter at weight 500, line height 1.45, 28 px gaps, and 44 px targets.

JudgmentKit retains more links, so its menu appears at widths up to 1120 px. The brand and menu remain aligned with Surfaces at shared mobile widths. Both headers retain their geometry on scroll and page navigation. Reserve classic scrollbar space to prevent shorter pages from shifting the header; measure the shell against available layout width when scrollbars consume space. Header fonts are local and preloaded; optional font display avoids a late font swap. The header font does not change JudgmentKit's framework-neutral design-system font contract.

Validate header dimensions, gutters, mark placement, font loading, current-page width stability, menu operation, and horizontal overflow in light and dark modes across desktop, mobile, and breakpoint widths. Compare the local candidate with live Surfaces in both navigation directions, including Back/Forward. Full production round-trip verification requires the candidate to be released.
