# ADR-0002: Optional React component adapter

Status: Accepted

Date: 2026-08-28

## Decision

JudgmentKit will correct its component authority and provide an optional React adapter as an unreleased local candidate. The historical five-component pilot established the boundary; the current candidate implements all 17 canonical component contracts.

The adapter is an in-package subpath, not part of the kernel and not a separate package:

- JavaScript: `judgmentkit/react`
- Styles: `judgmentkit/react/styles.css`

The root `judgmentkit` export, CLI, and MCP remain framework-neutral. They do not re-export the adapter, import React or React DOM, reference browser globals, or load component CSS.

React `>=19 <20` is a consumer-supplied peer. The adapter uses native DOM semantics and plain CSS over JudgmentKit roles. MUI and Emotion are not its foundation.

## Canonical authority

The 17 semantic component contracts remain the source of component meaning. Each receives one runtime classification:

- `public_runtime_component`
- `composed_behavior`
- `internal_primitive`
- `contract_only`

Implementation metadata lives with that canonical registry. `renderer_components` is generated as a compatibility projection of entries whose implementation status is `implemented`; it is not a second capability list.

Each implemented entry names its contract id, public export, package subpath, stylesheet when applicable, implementation status, and evidence scenarios. A missing export, duplicate mapping, unknown contract, unapproved state, or stale evidence binding fails validation.

Figma remains reference evidence. It supplies the component-family and variant denominator without overriding JudgmentKit semantics, styling, or runtime admission. Standalone icons remain outside the component candidate; the existing icon library and APIs are unchanged.

## Runtime candidate

The historical pilot exports were:

- `FormField` → `form_field`
- `TextField` → `text_field`
- `ActionButton` → `action_button`
- `Toggle` → `toggle`
- `StatusMessage` → `status_message`

The current adapter has one local implementation candidate for each of the 17 canonical contract IDs and represents all 65 required-state scenarios. `CheckboxField` is an additional supporting primitive, so the React subpath exposes 18 named symbols. Availability and scenario representation do not become verified behavior until current evidence is bound.

`TextField`, `TextArea`, and `SelectField` compose the shared field structure rather than creating separate label, help, and error systems. Product vocabulary, data, authorization, geometry, and side effects remain consumer responsibilities.

## First consumer and styling boundary

`/design-system/components/` is the first consumer. Its interactive previews import the public adapter and stylesheet through the same subpaths available to a packed consumer. The page may retain contract metadata, but it cannot present parallel hand-authored controls as runtime evidence.

Styles load only when a consumer imports `judgmentkit/react/styles.css`. Component CSS owns the candidate's visual roles and state treatment. Consumer CSS may own placement and layout but cannot silently replace the adapter's component identity while claiming JudgmentKit runtime provenance.

## Evidence model

Every canonical `contract_id × required_state` pair has a scenario status:

- `visual_only`
- `unverified`
- `verified`
- `not_applicable`

Only `verified` scenarios produce covered-state claims. A verified scenario is bound to the current contract, implementation and specimen sources, browser run, viewport, appearance, package gate, accessibility gate, and machine-readable reviewer receipt. A static marker or copied required-state list is not verification.

The initial browser claim is limited to Chromium automation at 1365×900 and 390×844. Each evidence run records the exact `Browser.getVersion` value. Firefox, WebKit, and assistive-technology support require later evidence and are not implied by semantic markup or automated scanning.

Automated accessibility scanning, accessibility-tree assertions, real keyboard input, focus lifecycle checks, controlled acceptance and refusal, responsive checks, and packed-consumer checks are required. A separate reviewer-authored receipt binds the exact run ID, component IDs, scenario IDs, presentation count, hashes, browser, viewports, and appearances, and names unsupported claims.

## Consequences

- Consumers can opt into a bounded candidate runtime without importing the kernel into product UI.
- Framework-neutral consumers are unaffected unless they import the React subpath.
- The public component page becomes a consumer proof rather than a parallel mock implementation.
- Semantic contracts may remain guidance-only; library growth is not tied to the Figma family count.
- Adding a component requires contract classification, export provenance, complete scenarios, and a product-owner admission decision.
- External design systems stay authoritative and receive no implicit JudgmentKit component fallback.

## Release authority

Mike owns versioning, package publishing, deployment, release, and migration beyond the component page. This decision authorized local implementation and verification. On 2026-08-28, Mike separately authorized committing, pushing, and opening a review PR for the candidate; package publish, deployment, promotion, release, and broader migration remain unauthorized.
