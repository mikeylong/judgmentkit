import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  ARTIFACT_INSPECTOR_SURFACE_PROFILE,
  ARTIFACT_INSPECTOR_SURFACE_PROFILE_ID,
  WORKBENCH_SURFACE_PROFILE,
  cloneArtifactInspectorSurfaceProfile,
  cloneSurfacePresentationProfile,
  cloneWorkbenchSurfaceProfile,
  getSurfacePresentationProfile,
  listSurfacePresentationProfiles,
} from "../src/surface-presentation-profiles.mjs";

const EXPECTED_PROFILE_ID = "judgmentkit.artifact-inspector.v1";
const EXPECTED_COMPONENT_ROLES = [
  "ArtifactViewport",
  "ArtifactBoundary",
  "ArtifactStatus",
  "ObservationMarker",
  "LocusSelection",
  "ContextAnchor",
  "AuthorityAnchor",
  "AnchorRail",
  "RelationPreview",
  "RelationConnector",
  "InlineReason",
  "ContextTray",
  "CommitBoundary",
  "ReceiptMarker",
  "BackAction",
  "ResetAction",
  "ZoomAndPanControls",
];
const EXPECTED_CORE_STATES = [
  "artifact loading",
  "artifact ready",
  "artifact unavailable or failed",
  "no active locus",
  "locus focused or selected",
  "context loading",
  "context ready",
  "relation or action preview",
  "supported",
  "incompatible",
  "unavailable",
  "stale",
  "ambiguous",
  "blocked",
  "cancelled or Back",
  "local error and retry",
];

function profileHash(profile) {
  return createHash("sha256")
    .update(JSON.stringify(profile))
    .digest("hex");
}

function scope(profile, scopeId) {
  return profile.authority.design_system_scopes.find(
    (entry) => entry.scope_id === scopeId,
  );
}

assert.equal(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE_ID,
  EXPECTED_PROFILE_ID,
);
assert.equal(ARTIFACT_INSPECTOR_SURFACE_PROFILE.id, EXPECTED_PROFILE_ID);
assert.equal(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.surface_type,
  "artifact_inspector",
);
assert.equal(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.workflow_profile_id,
  "artifact-inspector-ui",
);
assert.equal(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.interaction_topology_kind,
  "artifact_centered",
);
assert.equal(ARTIFACT_INSPECTOR_SURFACE_PROFILE.status, "proposed");
assert.equal(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.provenance.promotion_status,
  "proposed",
);
assert.equal(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.composition.hierarchy,
  "artifact_dominant",
);
assert.ok(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.composition.rules.some((rule) =>
    rule.includes("largest and most persistent visual region"),
  ),
);
assert.ok(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.composition.avoid_by_default.includes(
    "master-detail",
  ),
);
assert.deepEqual(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.state_coverage,
  EXPECTED_CORE_STATES,
);
assert.ok(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.responsive.wide.includes(
    "artifact central and persistent",
  ),
);
assert.ok(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.responsive.narrow.includes(
    "artifact primary",
  ),
);
assert.ok(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.responsive.invariant.includes(
    "same state machine",
  ),
);
assert.deepEqual(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.component_roles.map((role) => role.id),
  EXPECTED_COMPONENT_ROLES,
);

const chromeScope = scope(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE,
  "inspector_chrome",
);
const overlayScope = scope(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE,
  "inspection_overlay",
);
const artifactScope = scope(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE,
  "primary_artifact",
);
const boundary =
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.authority.boundary_contracts[0];

assert.deepEqual(chromeScope, {
  scope_id: "inspector_chrome",
  root_selector: "[data-jk-scope='inspector-chrome']",
  authority: "judgmentkit_default",
  enforcement: "required",
  style_isolation: "required",
});
assert.deepEqual(overlayScope, {
  scope_id: "inspection_overlay",
  root_selector: "[data-jk-scope='inspection-overlay']",
  authority: "judgmentkit_default",
  enforcement: "required",
  style_isolation: "required",
});
assert.deepEqual(artifactScope, {
  scope_id: "primary_artifact",
  root_selector: "[data-artifact-root]",
  authority: "external_declared",
  enforcement: "external_not_reviewed",
  style_isolation: "required",
});
assert.deepEqual(boundary, {
  from_scope: "inspection_overlay",
  to_scope: "primary_artifact",
  allowed_roles: [
    "locus_target",
    "annotation_overlay",
    "connector_endpoint",
  ],
  event_contract_required: true,
});
assert.ok(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.authority.review_result_policy.includes(
    "never describe the external artifact as JudgmentKit-conformant",
  ),
);
assert.ok(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.evidence_expectations.some((entry) =>
    entry.includes("style isolation in both directions"),
  ),
);
assert.ok(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.evidence_expectations.some((entry) =>
    entry.includes("artifact render fingerprint"),
  ),
);
assert.ok(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.evidence_expectations.some((entry) =>
    entry.includes("Report chrome conformance") &&
    entry.includes("external artifact preservation"),
  ),
);

assert.ok(Object.isFrozen(ARTIFACT_INSPECTOR_SURFACE_PROFILE));
assert.ok(Object.isFrozen(ARTIFACT_INSPECTOR_SURFACE_PROFILE.authority));
assert.ok(
  Object.isFrozen(
    ARTIFACT_INSPECTOR_SURFACE_PROFILE.authority.design_system_scopes,
  ),
);
assert.ok(Object.isFrozen(artifactScope));
assert.ok(
  Object.isFrozen(ARTIFACT_INSPECTOR_SURFACE_PROFILE.component_roles[0]),
);

const clonedArtifactProfile = cloneArtifactInspectorSurfaceProfile();
const clonedById = cloneSurfacePresentationProfile(EXPECTED_PROFILE_ID);
const lookedUpProfile = getSurfacePresentationProfile(
  `  ${EXPECTED_PROFILE_ID}  `,
);

for (const candidate of [clonedArtifactProfile, clonedById, lookedUpProfile]) {
  assert.deepEqual(candidate, ARTIFACT_INSPECTOR_SURFACE_PROFILE);
  assert.notStrictEqual(candidate, ARTIFACT_INSPECTOR_SURFACE_PROFILE);
  assert.notStrictEqual(
    candidate.authority,
    ARTIFACT_INSPECTOR_SURFACE_PROFILE.authority,
  );
  assert.notStrictEqual(
    candidate.authority.design_system_scopes,
    ARTIFACT_INSPECTOR_SURFACE_PROFILE.authority.design_system_scopes,
  );
}

clonedArtifactProfile.name = "Mutated clone";
clonedArtifactProfile.authority.design_system_scopes[0].authority =
  "mutated-authority";
assert.equal(
  ARTIFACT_INSPECTOR_SURFACE_PROFILE.name,
  "JudgmentKit Artifact Inspector",
);
assert.equal(
  scope(ARTIFACT_INSPECTOR_SURFACE_PROFILE, "inspector_chrome").authority,
  "judgmentkit_default",
);
assert.equal(cloneSurfacePresentationProfile("unknown.profile"), null);
assert.equal(getSurfacePresentationProfile(null), null);

const listedProfiles = listSurfacePresentationProfiles();
assert.deepEqual(
  listedProfiles.map((profile) => profile.id),
  [WORKBENCH_SURFACE_PROFILE.id, EXPECTED_PROFILE_ID],
);
assert.notStrictEqual(listedProfiles[0], WORKBENCH_SURFACE_PROFILE);
assert.notStrictEqual(
  listedProfiles[1],
  ARTIFACT_INSPECTOR_SURFACE_PROFILE,
);
listedProfiles[1].component_roles[0].id = "MutatedRole";
assert.equal(
  listSurfacePresentationProfiles()[1].component_roles[0].id,
  "ArtifactViewport",
);

const clonedWorkbench = cloneWorkbenchSurfaceProfile();
assert.deepEqual(clonedWorkbench, WORKBENCH_SURFACE_PROFILE);
assert.notStrictEqual(clonedWorkbench, WORKBENCH_SURFACE_PROFILE);
assert.equal(JSON.stringify(WORKBENCH_SURFACE_PROFILE).length, 5463);
assert.equal(
  profileHash(WORKBENCH_SURFACE_PROFILE),
  "e602ac05657defdfd247221b3d97a9e9454460c28202b1e47475f3d58cf56dbb",
  "The existing Workbench profile must remain byte-compatible.",
);

console.log("artifact inspector surface profile checks passed.");
