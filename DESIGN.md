# Activity-First Judgment Contract

## Principles

- Design from the activity, not from available data structures or implementation hooks.
- Prefer relevant, succinct, domain-appropriate UI over visually polished but conceptually wrong UI.
- Treat aesthetics as a later adapter layer. Visual systems can refine a correct activity model; they cannot fix a wrong one.
- Separate activity understanding from interaction behavior and from disclosure rules.
- Make state changes meaningful to the activity, not merely visible because the system has internal state.
- Keep diagnostic machinery available for setup and debugging, but out of the primary work surface.

## Contract Layers

### Activity Model

The activity model describes the world the UI enters: participants, objective, outcomes, tools, artifacts, rules, rituals, and division of labor.

### Interaction Contract

The interaction contract translates that activity into a surface: what the user is trying to do, what decisions need support, what should be easy or hard, what states matter, and what done means.

### Surface Type

The surface type classifies activity purpose before frontend implementation: marketing, workbench, operator review, artifact inspector, form flow, dashboard monitor, content/report, setup/debug tool, or conversation. It is interaction guidance, not a visual theme. Artifact Inspector applies only when one rendered artifact is primary, semantic locus selection is required, and supporting context is meaningful relative to that locus; layout vocabulary or a keyword alone is insufficient.

### Surface Presentation Profile

A surface presentation profile applies governed design-system guidance after the surface type is grounded. It can shape density, type hierarchy, region hierarchy, action emphasis, status treatment, and responsive behavior without reclassifying the activity or replacing the interaction contract.

The JudgmentKit default design system selects `judgmentkit.workbench.operational-v1` automatically for a Workbench supplied by the caller or recommended with medium or high confidence. It selects `judgmentkit.artifact-inspector.v1` for a grounded Artifact Inspector. `surface_profile: "none"` opts out, while an exact profile id locks that version. The neutral low-confidence Workbench fallback selects no profile. External design systems receive no JudgmentKit profile fallback.

Artifact Inspector has scoped visual authority rather than whole-surface JudgmentKit authority. JudgmentKit governs the inspector chrome and inspection overlay; the rendered artifact preserves its declared external authority. Reviews must report owned-scope, artifact-preservation, and boundary results separately and must not describe the external artifact as JudgmentKit-conformant. This contract release has no trusted interactive-attestation producer or verifier, so an otherwise valid implementation remains `review_required`.

Profiles remain adapter-layer contracts. JudgmentKit may expose an optional component adapter downstream of the kernel, but a profile does not select it or turn it into kernel authority. Product vocabulary, product geometry, data, runtime state, authorization truth, and side effects stay with the implementing product.

The Simple Design System (Community) inventory is JudgmentKit's component-and-variant reference denominator, not its styling authority. Every reference family and master must be accounted for, while JudgmentKit retains its own semantic contracts, interaction behavior, accessibility requirements, colors, typography, spacing, radii, effects, tokens, and brand expression. Patterns, templates, internal parts, and Figma authoring helpers count toward inventory parity without becoming public runtime exports.

Reference accounting, family disposition, variant-axis normalization, runtime availability, and current evidence are separate claims. Completing one layer never implies completion of the next.

### Disclosure Policy

The disclosure policy controls vocabulary and visibility. It decides what becomes user-facing, what gets translated into domain language, and what remains diagnostic.

## Review Checklist

- Is the activity named before the screen is named?
- Does the UI support the activity instead of exposing the source model?
- Does the surface type follow from the activity and purpose?
- If a surface presentation profile is selected, is it supported by grounded surface evidence and the active design-system source?
- Are domain terms preferred over implementation terms?
- Are prompts, schemas, resource ids, tools, servers, and traces hidden unless the user is doing setup, debugging, auditing, or integration work?
- Is the proposed UI succinct enough for the activity?
- Are aesthetics clearly secondary to activity fit and interaction quality?
