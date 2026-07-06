# JudgmentKit Slide Deck MCP Export

Use `create_slide_deck` only when the user explicitly asks JudgmentKit to create or plan a deck. Primary slide content should use domain language. Do not put prompts, schemas, MCP tool names, resource ids, traces, or model configuration into slide copy unless the deck is explicitly for setup, debugging, auditing, or integration work.

## Path Contract

`output.path` is always repo-relative and must stay under:

```text
outputs/judgmentkit-slide-decks/
```

For local PPTX export from Codex Desktop, pass the active workspace root separately:

```json
{
  "output": {
    "path": "outputs/judgmentkit-slide-decks/repro-minimal.pptx"
  },
  "runtime": {
    "workspace_root": "/absolute/path/to/active/workspace",
    "artifact_tool_package": "/absolute/path/to/@oai/artifact-tool"
  }
}
```

If `workspace_root` is missing and the MCP runtime cannot determine a safe active workspace, export fails with `workspace_root_missing`. The tool must not silently write under `/var/task`, `.codex`, or the bundled Codex runtime cache.

## Minimal Codex Desktop Example

First plan the deck without writing a file:

```json
{
  "deck": {
    "deck_id": "quarterly-review",
    "title": "Quarterly review"
  },
  "slides": [
    {
      "template_id": "slide-21",
      "content": {
        "title": "Quarterly review",
        "subtitle": "Evidence and decisions for the product team."
      }
    }
  ],
  "dry_run": true
}
```

Then export from a local runtime:

```json
{
  "deck": {
    "deck_id": "quarterly-review",
    "title": "Quarterly review"
  },
  "output": {
    "path": "outputs/judgmentkit-slide-decks/quarterly-review.pptx"
  },
  "runtime": {
    "workspace_root": "/Users/mike/example-workspace",
    "artifact_tool_package": "/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool"
  },
  "dry_run": false,
  "slides": [
    {
      "template_id": "slide-21",
      "content": {
        "title": "Quarterly review",
        "subtitle": "Evidence and decisions for the product team."
      }
    }
  ]
}
```

A successful export returns `deck_creation_status: "exported"`, `artifact_ref`, and `provenance_receipt`. The tool also writes a sidecar receipt next to the PPTX, for example:

```text
outputs/judgmentkit-slide-decks/quarterly-review.pptx.receipt.json
```

Treat dry-run planning as JudgmentKit guidance when the MCP response uses `schema: "judgmentkit.mcp.slide-deck/v1"` and `deck_creation_status: "planned"`.

Treat a deck as JudgmentKit-generated only when the MCP response or sidecar receipt confirms:

```json
{
  "tool_name": "mcp__judgmentkit.create_slide_deck",
  "deck_creation_status": "exported",
  "sha256": "<matching PPTX SHA-256>",
  "bytes": 12345,
  "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "adapter_manifest_id": "judgmentkit.presentation-theme.adapter-v1",
  "template_registry_version": "0.1.0"
}
```

## Portfolio Or Case-Study Example

For portfolio, pitch, and case-study decks, pass explicit `template_id` values or strong `selection` metadata. Do not rely on broad defaults when layout variety matters.

```json
{
  "deck": {
    "deck_id": "case-study-review",
    "title": "Case study review"
  },
  "output": {
    "path": "outputs/judgmentkit-slide-decks/case-study-review.pptx"
  },
  "runtime": {
    "workspace_root": "/Users/mike/example-workspace",
    "artifact_tool_package": "/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool"
  },
  "dry_run": false,
  "slides": [
    {
      "template_id": "slide-21",
      "content": { "title": "Case study review", "subtitle": "Decision context and outcomes." }
    },
    {
      "template_id": "slide-06",
      "content": { "title": "Problem and solution", "body": "Compare the starting constraint with the repaired workflow." }
    },
    {
      "template_id": "slide-08",
      "content": { "title": "Evidence table", "rows": [{ "signal": "Review debt", "value": "Rising" }] }
    },
    {
      "template_id": "slide-64",
      "content": { "title": "Trend evidence", "chart": { "type": "line" } }
    },
    {
      "template_id": "slide-62",
      "content": { "title": "Outcome metrics", "metrics": [{ "label": "Saved time", "value": "32%" }] }
    },
    {
      "template_id": "slide-80",
      "content": { "title": "Recommendation", "body": "Name the next decision and owner." }
    }
  ]
}
```

For decks with at least four slides, if more than half the deck uses the same layout or layout family, the response includes a repetition warning with suggested template families.
