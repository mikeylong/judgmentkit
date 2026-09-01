# Deck Creation

Use this skill for JudgmentKit slide deck requests. Read this reference only when the user asks to create, draft, generate, export, or turn source material into a slide deck, presentation, PowerPoint, or PPTX.

## Establish The Deck Activity

Infer audience, the decision or progress the deck should support, source material and evidence authority, confidentiality boundary, deck form, target format, and delivery path from available context. Ask one consequential question only when the missing answer changes the deck's purpose, evidence boundary, or export route.

Keep primary slide copy in domain language. Do not expose prompts, schemas, resource ids, MCP server names, tool names, traces, or model configuration unless the deck is explicitly for setup, debugging, auditing, or integration.

## Choose The Export Route

Choose the route before export:

- **MCP template export** uses `mcp__judgmentkit.create_slide_deck`. Choose it when the user requires true `create_slide_deck` provenance, a fast template-backed draft, or stock JudgmentKit templates.
- **JudgmentKit-theme-backed local export** may use a local `@oai/artifact-tool` generator with the real JudgmentKit presentation-theme source, tokens, and helpers. Choose it when premium visual craft is the priority. Describe the result as `JudgmentKit-theme-backed; locally exported with @oai/artifact-tool`, not as an MCP export.

If the user asks for both true `create_slide_deck` provenance and premium polish, state the trade-off before treating either route as final. When `$deck-polish` or an equivalent premium deck skill is active, follow its visual-craft workflow while preserving truthful JudgmentKit provenance.

## Deck Workflow

1. Use the reviewed activity context and allowed source material.
2. Call the deck creation MCP tool only when the selected route is MCP template export or when a dry-run plan is useful before a local premium build. The active endpoint must expose the tool. For local PPTX export through that runtime, use a repo-relative `output.path` and pass the active workspace root separately when required.
3. Treat dry-run planning as JudgmentKit guidance only when the response uses `schema: "judgmentkit.mcp.slide-deck/v1"` and `deck_creation_status: "planned"`.
4. Treat an exported PPTX as JudgmentKit MCP output only when the response or sidecar receipt confirms `tool_name: "mcp__judgmentkit.create_slide_deck"`, `deck_creation_status: "exported"`, and matching `sha256`, `bytes`, and `mime_type` artifact fields. An output folder is not provenance by itself.
5. For portfolio or case-study MCP template exports, pass explicit `template_id` values or strong selection metadata when layout variety matters; heed layout-repetition warnings.
6. If premium craft requires layouts beyond exposed template slots, use the theme-backed local route and label it as a local export unless an MCP receipt proves otherwise.

If no deck creation tool is listed by the active endpoint, state that the current JudgmentKit endpoint cannot create the MCP export. Do not fabricate a JudgmentKit packet, deck, or MCP result. Continue with a deterministic outline, requirements summary, or truthfully labeled local route only when the user wants that fallback.

## Provenance Edge Cases

- Do not substitute a local theme-backed generator as the only final artifact when the user explicitly requires an MCP `create_slide_deck` export without stating that the provenance changed.
- Do not treat a flat but valid template export as sufficient for a premium portfolio or case-study request merely because it has a clean receipt.
- If local JudgmentKit presentation-theme sources are unavailable, do not claim theme-backed conformance. Continue only with source-backed MCP export or a non-conformance content and QA pass.
- If a local generator uses JudgmentKit tokens with custom layouts, describe it as JudgmentKit-theme-backed and locally exported, not as JudgmentKit MCP-exported.
