# JudgmentKit public site header

Visitors evaluate JudgmentKit, read examples and documentation, or set up its MCP integration. They navigate with ordinary page links and may move between JudgmentKit and Surfaces. The site author maintains the navigation; visitors choose their destination. The header should make those destinations easy to find without requiring visitors to understand a platform ecosystem.

The primary decisions are where to learn about JudgmentKit and whether to visit Surfaces. Use JudgmentKit, Why JudgmentKit, How it works, Docs and Surfaces in the primary navigation. Keep Value, Design System, Examples, Evals, MCP, installation and Handbooks reachable from the existing detail routes and Docs resource links. Keep schemas, tool names, internal identifiers, and obsolete ecosystem descriptions out of the header. Setup details remain on the relevant destination pages.

## Interaction contract

1. The top-left home link contains the complete canonical JudgmentKit lockup from `brand/slab-j/lockups/horizontal-reversed.svg`. The header remains ink in both system appearances, so it uses the reversed asset in both modes. Keep the SVG canvas and its natural aspect ratio. The outlined Inter 780 wordmark and nickel return stay together. Name the link `JudgmentKit home` and treat its image as decorative.
2. Desktop navigation sits on the right with four links: Why JudgmentKit (`/#why-judgmentkit`), How it works (`/#how-it-works`), Docs (`/docs/`) and Surfaces (`https://surfaces.systems/`). All four open in the same tab. The Docs resource row retains Handbooks with the existing external-link icon and tooltip.
3. Current-page state is visible without changing font weight or link width. All links and controls have visible keyboard focus.
4. The mobile menu exposes the same destinations, supports keyboard activation, closes on Escape with focus returned to its button, and closes after link selection or an outside click. Restored pages and desktop resize do not retain an open menu.
5. Completion means the visitor reaches the chosen page. The header adds no confirmation or intermediate domain chooser.

## Cross-site alignment

The live Surfaces header measured on 2026-10-01 is the reference: a 72 px sticky header, no bottom border, a centered 1120 px shell with 24 px minimum side gutters, and 16 px gutters at widths up to 820 px. The canonical outlined lockup is displayed at a 56 px canvas height at every viewport width. Preserve the source ratio of 425.013342449 × 109 and its built-in padding. Scale the whole image uniformly. Do not crop the canvas, filter its colors, or reconstruct the wordmark as live text. Navigation uses 14 px Inter at weight 500, line height 1.45, 28 px gaps, and 44 px targets.

The four-link navigation becomes a Menu control at widths up to 820 px. The control keeps its visible Menu label and 18 px glyph at 390 px. The glyph changes from three bars to an X when aria-expanded is true. Below 390 px, use an 8 px header gap; below 375 px, the control is 44 px wide and its Menu text is visually hidden while retained in the DOM and accessible name. This narrow fit exception keeps the full 56 px lockup inside the 16 px gutters even when a classic scrollbar consumes 15 px of layout width. The brand and menu remain aligned with Surfaces at shared mobile widths. Both headers retain their geometry on scroll and page navigation. Reserve classic scrollbar space to prevent shorter pages from shifting the header; measure the shell against available layout width when scrollbars consume space. Website fonts are local and preloaded. The face covers weights 100–900 and uses swap display so the loaded Inter face replaces a fallback. Website text and chrome use antialiased/grayscale smoothing, matching Surfaces. Reference specimens retain their own font and smoothing contract.

Validate header dimensions, gutters, complete lockup bounds, asset loading, current-page width stability, menu operation, and horizontal overflow in light and dark modes across desktop, mobile, and breakpoint widths. Compare the local candidate with live Surfaces in both navigation directions, including Back/Forward. Full production round-trip verification requires the candidate to be released.

## Shared footer and favicon

Every shared footer stays Ink in both appearances and links home with the complete canonical `brand/slab-j/lockups/horizontal-reversed.svg`. It displays the full canvas at 56 px high, keeps a minimum 44 px link target, and wraps the release link when space is limited. At widths up to 820 px, its identity, description, copyright and release link form a stack with 12 px gaps and no extra paragraph margins or inline-image baseline gap. Both home links have the accessible name `JudgmentKit home`. Footer text uses Inter, with a supporting Rule-colored link and visible Ivory focus.

The site build copies both lockup files byte for byte to `/assets/brand/judgmentkit-lockup.svg` and `/assets/brand/judgmentkit-lockup-reversed.svg`. Browser and installed icons remain governed by [the site brand asset contract](site-brand-assets.md). The website presentation contract is [public website presentation](site-presentation.md).

## Links that open another tab or window

Every public page uses the same arrow-out-of-square icon beside links that open another tab or window. The convention includes page content, gallery dialogs, no-script navigation, and unlisted comparison pages. A link with `target="_blank"` has the title "Opens in a new tab" and `rel="noopener noreferrer"`. A named window target uses "Opens in a new window". Same-tab links keep their existing behavior.

Use a decorative 14 px SVG with `currentColor` so the icon follows the link in light and dark appearances. Keep the icon visible beside the link label at desktop and mobile widths. The site renderer shares its icon markup; standalone comparison navigation uses the same shape. Preserve the comparison prototypes and captured evidence.

The site test scans every built HTML page, including copied examples, reports, and experiments, and rejects a new tab or window link without the icon, title, or safe `rel` values. Browser checks cover the shared header at desktop, mobile, and breakpoint widths. The 320 px cases also reserve a real 15 px classic-scrollbar gutter and keep the menu aligned with the available layout edge.
