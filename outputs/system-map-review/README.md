# System Map audit before release

This report records the October 8, 2026 documentation audit and static previews before the landing release. Its deployment and Git state describe those checks; they do not describe later production state.

The corrected [System Map preview](https://judgmentkit-kls0sjyf8-surfaces-platform.vercel.app/docs/#system-map) reflects the current local review route. The diagram now places implementation authority before handoff, shows caller-owned model execution, and includes implementation review, bounded repair, deferred Inspector verification, and a separate human task result.

The audit compared the [public documentation](https://judgmentkit.ai/docs/#system-map), the existing diagram and fallback, current runtime exports, MCP handlers, CLI help, and source contracts. The documentation update describes the current working candidate. The preview contains static site output; it does not deploy the modified hosted MCP kernel.

## Findings and corrections

| Impact | Existing mismatch | Correction and source |
| --- | --- | --- |
| High | Design-system authority was selected after handoff and generation. | The implementation contract selects default or complete external authority before handoff. Incomplete external adapters fail without fallback. [Contract creation](../../src/index.mjs#L16699), [handoff normalization](../../src/index.mjs#L23373), [MCP requirement](../../src/mcp.mjs#L3910). |
| High | The diagram ended at generic draft review and omitted the implementation verdict. | Added implementation review and `accept`, `repair_and_resubmit`, `stop_for_human`, and `review_required`. Repairs belong to the implementing agent. [Review outcomes](../../src/index.mjs#L22974), [iteration contract](../../contracts/ai-ui-generation.activity-contract.json#L2214). |
| High | The diagram omitted verification limits and Inspector’s deferred acceptance. | Bounded browser composition is separate from application task checks. Inspector’s missing trusted interactive attestation remains unresolved with no automatic repair path. [Conditional MCP runtime](../../src/mcp.mjs#L3953), [runtime boundary](../../src/index.mjs#L23088), [Inspector authority](../../src/artifact-inspector-authority.mjs#L960). |
| Medium | Workflow review appeared to request a model; the provider and candidate nodes were disconnected. | Caller or explicit library helper invokes the injected proposer. Candidates return to deterministic review. [Injected workflow proposer](../../src/index.mjs#L10669), [explicit orchestration](../../src/index.mjs#L12354), [separate provider adapter](../../src/providers/openai-responses.mjs#L207). |
| Medium | Surface routing, frontend context, and portable implementation instructions were absent. | Added their actual stages and readiness dependencies. Unsupported selection remains unresolved. [Routing](../../src/index.mjs#L2590), [frontend gate](../../src/index.mjs#L24353), [portable skill gate](../../src/index.mjs#L25347). |
| Medium | Generic iteration mixed source correction, implementation repair, and human usefulness. | UI/evidence repairs return to implementation; a revised premise refreshes source-dependent reviews. Human task observations remain separate from acceptance. [Source continuity](../../specs/judgmentkit-kernel.md), [completion evidence](../../specs/build-useful-interfaces.md). |
| Low | The diagram implied a separate required analyzer step and a full CLI route; optional profile guidance was disconnected. | Activity review already includes brief analysis. CLI scope is activity analysis/review; library and MCP expose the broader route. Profiles are optional guidance. [Baseline analysis](../../src/index.mjs#L6596), [CLI commands](../../bin/judgmentkit.mjs#L119), [MCP inventory](../../src/mcp.mjs#L3690). |

## Changes

1. [Shared map model](../../site/system-map-model.mjs) supplies the interactive React Flow diagram and accessible static fallback: 20 nodes, 23 arrows, and 11 depicted tools. The map describes an integration route, not an automatic scheduler or exhaustive tool inventory. Presentation planning and local export remain a separate supporting note.
2. [Map renderer](../../site/system-map-flow.jsx) preserves pan, zoom, fit, and native disclosure keyboard behavior. Arrows render above zone backgrounds. Card text and mobile summary tool names wrap without clipping.
3. [Site builder](../../site/build-site.mjs) generates the fallback from the same nodes, arrows, and geometry. Supporting text explains the actual source, authority, evidence, and completion limits.
4. [System Map spec](../../specs/system-map.md) records actor ownership, artifact dependencies, conditional routes, and rendering checks.
5. [Drift tests](../../tests/system-map.test.mjs) compare depicted tools with real exports/MCP inventory and exercise authority, current-source continuity, readiness, attempt limits, and Inspector evidence limits. Site and first-use browser checks cover fallback parity, mounted content, wrapping, keyboard behavior, and map controls.

## Validation

| Check | Result |
| --- | --- |
| `npm run site:build` | Pass |
| `node tests/system-map.test.mjs` | Pass |
| `node tests/site.test.mjs` | Pass |
| `node tests/site-first-use-browser.test.mjs` | Pass, including desktop/mobile native Tab/Enter/Space, pointer disclosure, pan/zoom/fit, card containment, and summary wrapping |
| Local rendered map | 6/6 pass: desktop/mobile Light/Dark and no-JavaScript desktop/mobile fallback |
| Protected Vercel preview | Same 6/6 rendered cases pass |
| Preview identity | Docs HTML, map JavaScript, map CSS, and site CSS all HTTP 200 and byte-identical to the validated candidate |
| Independent source review | No remaining material mismatch |
| Syntax and `git diff --check` | Pass |

The followed contracts are [kernel](../../specs/judgmentkit-kernel.md), [interface/source continuity](../../specs/interface-contract.md), [AI UI generation](../../contracts/ai-ui-generation.activity-contract.json), and [builder completion](../../specs/build-useful-interfaces.md). Test planning followed [write-tests](../../skills/write-tests/SKILL.md).

Evidence: [candidate identity](candidate.json), [deployment result](deployment-result.json), [Vercel deployment metadata](vercel-metadata.json), [remote asset checks](remote-check.json), [local render cases](local-render-final/browser-qa.json), and [preview render cases](preview-render/browser-qa.json). Each rendered set includes screenshots. Intermediate narrow-summary failures remain in locally retained records; the successful corrected runs are separate.

## Final workflow note preview

The [final preview](https://judgmentkit-aw53zeokv-surfaces-platform.vercel.app/docs/#system-map) uses the approved explanatory copy and neutral text styling. The note says: “If a review cannot proceed, the agent explains what is missing and resolves it using available evidence. It asks you when a product decision or governing policy is needed.”

The [candidate record](neutral-note-update/candidate.json), [deployment result](neutral-note-update/deployment-result.json), [local checks](neutral-note-update/local-render/browser-qa.json), and [preview checks](neutral-note-update/preview-render/browser-qa.json) record this update. All four desktop/mobile and light/dark cases pass for each environment. The deployment contains static site output; it does not update the hosted MCP kernel.

## Delivery and limits

Preview deployment `dpl_Ec4u54sMF6Jw55D52t9DXYRjPPkP` is READY in `surfaces-platform/judgmentkit-ai`. Only 403 static public site files were uploaded. Private workflow evidence, tests, source, and runtime functions were excluded. The production alias still points to `dpl_6GfQ4NwaqcJQKBYTWvZYtX3jysbV`.

No new human encounter or generated product task was performed for this diagram audit. Inspector’s trusted interactive verification is still unavailable. No diagram-correctness questions remain open; production publication requires separate release work. Changes remain uncommitted, and earlier work was preserved. The full `npm test` suite was not rerun; the previously reported component browser matrix timeout remains outside this documentation change.
