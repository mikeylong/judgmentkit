# JudgmentKit vision

JudgmentKit helps people build useful interfaces with AI agents. A useful interface lets its intended user complete the work correctly, understand the result, and recover when something goes wrong.

Mike selected this purpose in the [product review](docs/product-vision-and-improvement-plan.md). The product promise below is the direction to test. Reduced rework, easier assessment, and repeat use still need evidence from real builders and interface users.

## The person we start with

The starting user is a hands-on builder asking an AI agent to create or improve an interface. The builder knows the intended result but should not have to translate every product decision into implementation instructions. The eventual interface user supplies the decisive test: can that person complete a representative task?

The first encounter should use a recent task the builder already needs to finish. Creating a new interface and improving an existing one enter the same loop. We will choose the leading entry from observed use rather than assume every builder starts with a blank brief.

## The result we want

The builder leaves with a working interface, an understandable reason for its structure, and specific evidence about the important tasks. The agent explains consequential choices in the language of the work and repairs failures that prevent completion. The builder can correct the premise as understanding changes.

JudgmentKit helps the agent understand the activity, choose an interaction that supports it, and assess the implementation. The agent builds and repairs the interface. The builder owns the product decisions. Domain authorities supply governing rules when needed. Intended users demonstrate whether the result works for them.

The primary experience is a short loop:

1. Describe or show the work and the result someone needs.
2. Correct the agent's working premise when a consequential choice is wrong.
3. Build or revise the interface.
4. Try the important tasks and repair specific failures.
5. Leave with the result and a clear account of what was checked.

The agent handles JudgmentKit's packet assembly and tool selection. The builder sees the interface, the choices that shape it, and the changes that matter. Technical diagnostics remain available for setup, debugging, or audit.

## What JudgmentKit can claim

JudgmentKit can **guide** a design decision from a reviewed activity, **check** a declared requirement against supplied evidence, and **verify** a supported behavior when a trusted measurement establishes it for the tested artifact and conditions. Each claim needs its own evidence. See the [claim map](docs/product-claims-and-evidence.md).

A passing implementation review does not establish general usefulness. Observed task completion, builder effort, and return use supply that evidence. Unsupported or untested behavior stays visible. Artifact Inspector retains its current `review_required` status until trusted interactive attestation is available.

## What we preserve and defer

Activity fit, domain language, succinct interaction, disclosure discipline, accessibility, and readable presentation remain essential. Patterns follow the activity. Components and team standards support the result under the chosen implementation authority.

The initial product does not own the builder's agent, a new orchestration service, organizational approval policy, release authorization, or the implementing product's data and side effects. More patterns, chart checks, component expansion, project packs, and specialized attestation remain investments to justify through observed failures.

The next product decision depends on a complete builder encounter. If concise guidance provides the benefit and full JudgmentKit adds avoidable effort, simplify the builder loop. If value appears mainly in critique or one activity, narrow the starting offer. The [workflow spec](specs/build-useful-interfaces.md) defines the experience to test.
