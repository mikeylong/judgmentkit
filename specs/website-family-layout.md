# Surfaces website family layout contract

## Reference and purpose

This contract records the rendered composition of [surfaces.systems](https://www.surfaces.systems/) observed on 16 October 2026 at 1280×720 and 390×844. It governs the shared public homepage composition. Preserve Surfaces' existing hero artwork and layout as the visual reference, including its content density and mobile composition. Matching fonts and colors alone does not satisfy this contract.

Public copy also follows [the website family copy contract](website-family-copy.md). Text may be narrowed without replacing the reference artwork or layout.

## Page composition

1. A 72px Ink header contains the complete reversed Nickel lockup at the left and no more than four primary navigation links at the right. Compact navigation becomes one Menu control. Main content aligns to the same 1120px container as the header and footer.
2. One full-width image hero sits behind one left-aligned text stack. At 1280px, the scene below the header is approximately 560px tall; the next section begins at y=632px. The image reaches every edge of the hero. A dark overlay protects the copy while retaining the artwork on the right. The image is not a separate column, rounded frame, bordered box, inset panel or card.
3. One problem section has a small eyebrow, one heading and a ruled row of three equal items. The section uses a quiet contrasting surface, 80px top padding and 56px bottom padding on desktop. Each item has a 12px ordinal, one short 20px/600 title and one brief 14px muted supporting phrase. Shared top/bottom rules, internal separators and small connector notches organize the row; there are no fully boxed items, rounded cards, shadows or floating tiles.
4. One workflow section follows with 96px vertical padding on desktop. A small eyebrow and one heading introduce one connected row of five steps. Each step has a 12px ordinal, a restrained outline icon in a 40–44px square frame with 4px corners, a short 20px/600 action title and a brief 14px muted explanation. Desktop ordinals sit above the icon frames. A small signal accent may identify the final step; it must not alter the logo. Additional branch labels appear only when the product has a documented branch to explain.
5. At most two short supporting sentences follow the workflow. The footer remains compact: reversed lockup, one short product description, copyright and any necessary access utility. Do not add feature-card grids, repeated CTAs, an FAQ, testimonials, installation instructions, evidence galleries or more marketing sections to the homepage. Detailed material remains on its existing destination pages.

## Hero hierarchy and copy budget

1. The hero text occupies roughly the left half of the desktop container, with a maximum width near 560px. The headline is the dominant text element; the image fills the environment around it.
2. Use one eyebrow of at most 12 words, one action- or purpose-led h1 of at most 10 words, and one supporting sentence of at most 32 words. An outcome claim needs the evidence required by the copy contract. The reference has no second explanatory paragraph, bullet list or extra bold positioning sentence in the hero.
3. Use exactly two hero actions. Primary is Ivory with Ink text; secondary is transparent with an Ivory rule. Both are at least 48px tall with 4px corners. At compact widths, actions stack and fill the available width. Recovery and other access utilities belong in the sign-in flow or footer rather than a third large hero action.
4. The homepage main-content budget is at most 220 words, including section headings, item labels and actions. The rendered Surfaces main content contains approximately 182 words. Shorter copy is acceptable when it explains the product. Shorten inherited copy that exceeds this budget rather than retaining every existing block.
5. Product capabilities and claims must match current behavior. A vision document establishes purpose, not shipped behavior or measured value. Copy may be shortened or recomposed without introducing capabilities, measured benefits, approval claims or invented proof. Keep a provenance map that distinguishes implemented behavior, illustrative examples and intended use. Each product retains its own purpose and actions.

## Image contract

1. Use a real raster hero asset with a wide composition, approximately 2.5:1. Match the full-width placement, left copy space and readable crop. Keep the cinematic 3D rendering, controlled lighting and tangible material language of the JudgmentKit and Surfaces images. Distinguish each product through its subject and composition rather than switching to flat illustration or stationery photography.
2. JudgmentKit's existing lens artwork becomes a wide environmental background. Preserve its recognizable subject and product metaphor, place the lens and ordered path primarily on the right, and extend the environment leftward for readable copy. It must no longer appear in a framed portrait panel beside the text.
3. Create a new Kanban image with a distinct card-and-flow concept in that same cinematic 3D language. Do not repeat Surfaces' three architectural slabs or JudgmentKit's lens. Show cards or work becoming organized, with the main composition toward the right and quiet space for the copy on the left. Present multiple rendered concepts before selecting the final artwork. The user rejected the flat cut-paper, graphic and stationery-photo directions. Do not copy the Surfaces mark or show a misleading application screenshot.
4. Do not bake text, controls, logos, labels or a gradient overlay into the image. Render the logo and copy as accessible page content. Apply the readability overlay in CSS so mobile cropping can be tuned independently.
5. At 390px, crop the image into a full-width background behind the entire hero stack. The artwork remains visible around the copy without creating a separate image section or pushing the next section down to accommodate an illustration card.

## Typography, surfaces and responsive behavior

1. Use Inter for website copy, with a variable 100–900 weight face, `font-display: swap` and the reference's antialiased/grayscale font smoothing on the public-page body. Desktop h1/h2 are 40/32px, weight 600, line height 1.15 and zero tracking. At 620px and below, use 32/24px. Hero supporting copy is regular 20px desktop and follows the reference's compact type at mobile widths. Body copy is regular 16px/1.45. Navigation and actions are 14px/500. Computed weights alone do not establish visual parity; inspect the rendered supporting text next to the reference.
2. Use Ink `#0B0D0E`, Ivory `#F7F6F2`, Nickel `#8B9096`, rule `#DAD7CF` and the reference's neutral surface roles. Hero and footer remain Ink in both appearances. Lower sections follow the reference's light/dark surface alternation. Lower-section eyebrows use quiet Nickel in dark appearance and `#555B60` in light appearance; footer supporting text uses Nickel. Preserve semantic form colors where they communicate real states.
3. Use a 1120px maximum container, 24px desktop gutters and 16px compact gutters. At 820px and below, navigation compacts, section padding becomes 52px vertically and the three-part row and five-step workflow become connected vertical rows.
4. On mobile, keep each workflow ordinal/icon in a narrow left column and its title/explanation in the right column. Align the title near the ordinal and place its explanation beneath. Use shared horizontal separators and downward connector notches. Do not turn the workflow into a loose stack of centered cards. The footer changes from a desktop row to a left-aligned stack of lockup, description and copyright.
5. Match the reference's restrained hierarchy, whitespace, image scale and section rhythm at full-page scale. The desktop homepage should be roughly the same overall length as Surfaces, with content length allowed to affect exact height. Do not force identical heights by adding empty sections or hiding content.

## Sign-in and preservation

1. Kanban's public homepage supplies its existing account-creation and Sign in actions; the signup label is Create account. Existing recovery, setup, passkey, verification, one-time recovery and sign-out behavior must remain available.
2. Sign-in forms use the family header, typography, neutral palette, controls and footer. Form grouping may use a compact panel; the prohibition on boxed artwork applies to homepage heroes.
3. Signed-in product screens, auth/session/data policies, native apps, canonical lockups, favicon geometry and social artwork stay outside this presentation change. JudgmentKit has no sign-in route in this repository; do not invent one.

## Acceptance

1. Inspect the Surfaces, JudgmentKit and kanban.cards public homepages visually at desktop and mobile widths in light and dark appearance. Save actual browser screenshots and compare full-page composition as well as the hero. Small thumbnails and computed-style tests alone are insufficient.
2. Verify that each hero has full-width background imagery, one text stack and two actions, with no separate image card. Confirm the three-item problem row, five-step workflow and compact footer.
3. Count the visible main-content words, check every claim against its provenance and confirm that detailed material remains reachable on existing pages.
4. Check image crop, text contrast, logo proportions, section spacing, mobile workflow alignment, focus and menu behavior, auth entry and signed-in style isolation. Run the affected build and regression checks after visual acceptance.
