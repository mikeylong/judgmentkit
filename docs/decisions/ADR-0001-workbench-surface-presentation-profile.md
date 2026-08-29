# ADR-0001: Workbench surface presentation profile

Status: Accepted
Date: 2026-08-08

## Decision

JudgmentKit supports `judgmentkit.workbench.operational-v1` as the stable, supported presentation profile for grounded Workbench surfaces using the JudgmentKit default design system.

The profile sits in the adapter layer. It gives an implementation agent governed guidance for density, type hierarchy, region hierarchy, action emphasis, status treatment, and responsive transitions after the activity, interaction contract, and Workbench pattern are already established.

The existing `workbench` pattern remains the interaction contract. It continues to define the purpose, required regions, expected controls, disclosure boundary, and completion or handoff behavior. The presentation profile does not classify the activity or change that pattern.

## Activation contract

`create_frontend_generation_context` accepts `surface_profile` with three forms:

| Request | Result |
| --- | --- |
| Omitted or `"auto"` | Select the stable profile when Workbench was independently provided or recommended with medium or high confidence. |
| `"none"` | Do not select a surface presentation profile. |
| `"judgmentkit.workbench.operational-v1"` | Select that exact version for an independently provided or grounded Workbench. Reject a mismatched surface or design-system source. |

The neutral low-confidence Workbench fallback is not enough evidence for either automatic or exact profile selection. A Workbench supplied directly through `surface_type` is provided evidence. A ready handoff preserves the originating surface confidence, so only provided, medium-, or high-confidence handoff lineage is eligible.

External design systems remain authoritative. `auto` selects no JudgmentKit profile when `implementation_contract.design_system_source.mode` is `external_design_system`; an exact JudgmentKit profile request under that source is an input error. JudgmentKit does not fall back to its own profile tokens, typography, or presentation rules.

## Contract ownership and public export

The canonical surface-presentation-profile registry is separate from surface classification and pattern contracts. The stable registry owns the profile id, compatible surface type, activation rules, token bindings, composition guidance, state coverage, responsive expectations, product-adapter boundary, and verification expectations.

The public design-system export at `/design-system/surface-presentation-profiles.json` is generated from that registry. It is a public projection of the canonical data, not a second source to maintain by hand.

When selected, the canonical profile travels with the frontend generation context and compiled frontend implementation guidance. Downstream agents can name the selected version and verify their implementation against the same contract.

## Boundaries

The profile owns presentation guidance only. It does not provide:

- a runtime renderer or component package
- reusable Workbench components
- product-specific vocabulary or geometry
- graph, node, or DAG layout rules
- runtime state, authorization, or side-effect truth
- evidence that a downstream implementation passed accessibility or browser QA

Products remain responsible for domain language, product-specific components, data and authorization behavior, and any spatial or graph visualization.

## Evidence and verification

The product owner reviewed and visually approved the generic Workbench direction on 2026-08-08 before the title token changed to a fixed `1.5rem`. The final token was rechecked in headless Playwright, but a separate human review of that token adjustment is not recorded. The combined evidence supports the profile's compact, flat, border-led direction in JudgmentKit light and dark appearances.

The approval promotes the profile contract. It does not promote the specimen into runtime code or certify every future implementation. Each consumer must still verify keyboard order, focus visibility, assistive-technology behavior, forced colors, automated accessibility, actual 200% zoom, responsive overflow, content stress, and relevant browser coverage for its own rendered UI.

## Consequences

- Grounded Workbench work receives a consistent JudgmentKit presentation profile by default.
- Callers can opt out with `surface_profile: "none"` or lock the supported version by id.
- Low-evidence fallback classification cannot silently introduce a visual direction.
- External design-system contracts stay isolated from JudgmentKit presentation defaults.
- Profile evolution requires a new versioned id when a change would alter downstream implementation guidance.

## Deferred work

The component library remained unchanged in this decision. ADR-0002 later approved a separate optional React pilot with its own contracts, states, accessibility checks, and runtime boundary. This presentation profile still does not supply or select those components.
