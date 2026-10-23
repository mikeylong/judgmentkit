# Agent Instructions

## Operating Rules

- Treat this as a fresh-start project. Do not import, copy, or preserve old JudgmentKit concepts unless the user explicitly asks.
- Read `README.md`, `DESIGN.md`, relevant files in `specs/`, and relevant files in `contracts/` before making product or UI changes.
- Start with activity fit, domain appropriateness, succinct interaction, and disclosure discipline.
- Do not make aesthetics, design tokens, component novelty, or visual polish the primary contract.
- When a design spec calls for substantive visuals, use image generation or premium rendering such as Three.js/WebGL/D3-style visualization; do not use rudimentary deterministic CSS/SVG/JS geometry as final visual assets.
- Preserve user work. Do not overwrite existing files unless the user explicitly asks for replacement.
- Keep changes scoped to the active spec and avoid unrelated refactors.
- Add or update tests for behavior, contracts, and drift risks that change.

## Activity-First Rule

Before generating or critiquing a UI, establish:

- the activity being supported
- participants
- objective and outcomes
- existing tools and artifacts
- rules and rituals
- division of labor
- domain vocabulary
- implementation concepts that must stay hidden
- diagnostic details that may be revealed only when useful

Then produce the interaction contract:

- what the user is trying to do
- how they think about the work
- primary decisions
- what the UI should make easy or harder
- terms to use and avoid
- state changes that matter
- what the user should leave knowing or having done

## Disclosure Rule

Primary user-facing UI should not expose machinery such as prompts, schemas, resource ids, MCP servers, tool names, or implementation traces unless the activity is explicitly setup, debugging, auditing, or integration work.

## Visual Asset Rule

Use deterministic CSS, SVG, and JavaScript for layout, text, UI chrome, icons, state, exact typography, simple diagrams, and accessible fallback structure. When the approved spec calls for substantive visuals such as imagery, hero/media assets, product/place/object visuals, domain scenes, or spatial/data visualization, use the `imagegen` skill or a premium rendering path such as Three.js/WebGL/D3-style visualization.

## Local Skills

- Use `skills/write-tests/SKILL.md` for test planning and implementation.

## Daily JudgmentKit Usage

- Use `docs/agent-usage-contract.md` before applying JudgmentKit to UI generation, UI critique, implementation planning, or handoff review.
- Use `docs/daily-agent-workflows.md` for MCP and CLI recipes.
- Prefer `create_activity_model_review` before generating UI from a brief.
- Prefer `review_activity_model_candidate` before trusting an externally proposed activity model.

## Handoff

Summaries should name the spec followed, contracts checked, tests run, and open questions that remain.


## Disposable browser VM default

When browser work needs a VM for isolation, background execution, or a consistent environment, use the local VM manager at `/Users/mike/Codex/local-vm-manager`. Read and follow the [local-vm-manager skill](/Users/mike/.codex/skills/local-vm-manager/SKILL.md) before starting. This is the default for new browser VMs; do not create an ad hoc Tart, Lima, or macOS browser VM.

1. Check `local-vm-manager` MCP `vm_inventory` for an active job or cleanup blocker. Use `vm_start` and `vm_capture` for page captures, or `vm_run_playwright` for supported, explicitly selected web specs with the exact expected test count. Preserve the project's locked browser dependencies and unchanged source tests. The current Playwright profile supports trusted npm web projects and `tests/browser/*.spec.ts`; inspect its web-only build command and required inputs first. Report an unsupported layout or engine requirement instead of substituting a screenshot, fixture, different engine, or larger VM for the requested checks.
2. Renew the lease with `vm_renew` at least every 30 seconds while provisioning or working. For captures, request `vm_finish` after success or failure and poll `vm_status` until cleanup ends. Playwright jobs export and delete automatically after execution. The host supervisor and launchd sweeper enforce crash cleanup; an agent's final message or `finally` block is not sufficient.
3. Keep reports, screenshots, traces, logs and source hashes in the manager's bounded evidence directory outside iCloud. Verify `vm_deleted`, `runtime_deleted`, `evidence_complete`, and `evidence_verified`, plus the required artifacts. A passing suite also requires `test_result.passed` and the exact test count. An interrupted suite may correctly fail while cleanup succeeds; report both outcomes. `cleanup_blocked` is unfinished work and prevents another guest.
4. The manager owns only its new private runtime namespaces. Never adopt, start, stop, resize, prune, or delete an existing VM to follow this default. Never export a guest disk, browser profile, credentials, dependency tree, or toolchain as routine evidence. Preserve unrelated source edits and historical evidence.
5. Keep native macOS/iOS, Xcode, simulator, device, Safari-specific and other native test workflows under their existing instructions and authorization. Do not route them through Linux or change their tests, configuration, existing VMs, or acceptance requirements. Ordinary host browser checks continue to use Safari MCP; this default does not require a VM for every browser action.

If the MCP connection has not loaded the manager's tools, use its CLI through the same controller. On this Mac, VM CLI execution requires approved execution outside the shell sandbox for that invocation. Never launch a host Chromium browser as a fallback.

```sh
/Users/mike/Codex/local-vm-manager/bin/lvm run --url https://example.com --label browser-check
```

For Playwright, use `/Users/mike/Codex/local-vm-manager/bin/lvm playwright --source /absolute/local/web/repo --test tests/browser/example.spec.ts --expected-tests 1 --label web-check`; substitute the actual supported source, selected files, and count. The CLI renews its lease and waits for deletion. See the [manager README](/Users/mike/Codex/local-vm-manager/README.md) for prerequisites and status interpretation.
