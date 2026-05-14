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

The surface type classifies activity purpose before frontend implementation: marketing, workbench, operator review, form flow, dashboard monitor, content/report, setup/debug tool, or conversation. It is interaction guidance, not a visual theme.

### Disclosure Policy

The disclosure policy controls vocabulary and visibility. It decides what becomes user-facing, what gets translated into domain language, and what remains diagnostic.

## Review Checklist

- Is the activity named before the screen is named?
- Does the UI support the activity instead of exposing the source model?
- Does the surface type follow from the activity and purpose?
- Are domain terms preferred over implementation terms?
- Are prompts, schemas, resource ids, tools, servers, and traces hidden unless the user is doing setup, debugging, auditing, or integration work?
- Is the proposed UI succinct enough for the activity?
- Are aesthetics clearly secondary to activity fit and interaction quality?
