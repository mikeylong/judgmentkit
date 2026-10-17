# Public website presentation

Visitors use the public website to understand JudgmentKit, compare its examples, and set it up in their agent. The homepage describes interaction guidance, implementation checks and repair instructions. Public claims follow [the website family copy contract](website-family-copy.md) and [the product claim map](../docs/product-claims-and-evidence.md). Value, examples and documentation retain the detailed journey and interactions.

The website shares Surfaces' public presentation. Its composition follows [the website family layout contract](website-family-layout.md), copied from the shared source after full-page review of https://www.surfaces.systems/ on October 16, 2026 at 1280×720 and 390×844. Typography and surface roles also follow the active `apps/surfaces-web/app/homepage.css` in `Surfaces-Platform/surfaces-webapps`. This presentation does not replace JudgmentKit's product adapters or the visual authority of an example.

## Website contract

1. Use the existing local variable Inter font at 16 px with a 1.45 line height. The face covers weights 100–900 with swap display. Match Surfaces with antialiased/grayscale text smoothing; reference specimens keep their prior smoothing. Website h1, h2 and h3 headings use 40, 32 and 24 px on desktop, then 32, 24 and 20 px at 620 px and below. Keep weight 600, a 1.15 line height and zero tracking in both layouts. Supporting text may use 20, 14 and 12 px. Keep reading widths of 820 and 980 px where the content needs them.
2. Use an 1120 px shell with 24 px desktop gutters and 16 px gutters at 820 px and below. The four-link header compacts at 820 px. Preserve its 72 px height, keyboard behavior and narrow-screen lockup geometry.
3. Light pages use Ivory `#F7F6F2`, Ink `#0B0D0E`, white panels and Rule `#DAD7CF`. Dark pages use Ink, Ivory, neutral `#24282b` panels and Nickel `#8B9096` supporting text and borders. Section labels follow the muted text role; description and copyright in the Ink footer use Nickel. Preserve the existing success, warning and risk state colors.
4. Keep the homepage hero and shared footer Ink in both appearances. Use the existing reversed whole lockup on those surfaces. Use the wide lens environment behind one left text stack, with a CSS readability overlay and no separate image card, border or radius. Desktop scene height is 560 px below the 72 px header. Compact scenes have a 528 px minimum height and position the lens at 72% center behind the existing readability overlay. Keep the original portrait as reference; [art provenance](../docs/site-homepage-art-provenance.json) records the new derivative.
5. Primary website actions have a minimum 48 px height, 14 px Inter text at weight 500 and a 4 px radius. The homepage uses ruled rows rather than cards. Panels on detailed pages retain an 8 px radius. Use quiet 120 ms color transitions, visible focus and the existing reduced-motion behavior.

## Scope and implementation

`site/build-site.mjs` applies `site-presentation` to its owned homepage, Value, Docs, Design System and Examples pages. It appends `site/website-presentation.css` to the generated stylesheet. The shared footer applies its Ink contract across generated pages. Its lockup, description, copyright and release utility form a desktop row and a left-aligned compact stack. Docs contains a compact resource row so evaluation evidence, MCP, the installer and Handbooks remain reachable after reducing primary navigation.

Evaluation and report bodies keep their existing typography, colors and wide-table layouts. Copied examples, experiments, reports and the immutable recording HTML do not receive the presentation class. Reference previews under `.jk-specimen-preview` retain their system font and adapter tokens; website heading rules exclude their descendants. Captured screenshots and the source visual-token adapters remain unchanged.

The repository has no sign-in route or provider-owned sign-in page. The website alignment adds no authentication surface or signed-in product styling.

## Verification

Run `npm run test:site` and `npm run site:build`. Site checks cover page scope, light/dark palette contrast, footer identity and the production appearance verifier. Browser checks measure Inter, responsive heading sizes, shell/gutters, scene coverage, desktop section position, CTA geometry, the three-item problem row and five-step workflow, alongside the existing navigation and first-use interactions. The homepage contains exactly three sections and no more than 220 main-content words. [Copy provenance](site-homepage-copy.md) records every shortened claim. Review the local homepage, Value, Docs and Examples pages at desktop and mobile widths in both appearances before release.
