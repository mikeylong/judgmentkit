import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  createActivityModelReview,
  reviewActivityModelCandidate,
  recommendSurfaceTypes,
  reviewUiWorkflowCandidate,
  createUiImplementationContract,
  createUiGenerationHandoff,
  createFrontendGenerationContext,
  createFrontendImplementationSkillContext,
  loadActivityContract,
} from "../src/index.mjs";

const caseUrl = new URL("../examples/builder-workflow/inspector-preview-cancel.case.json", import.meta.url);
const sourceUrl = new URL("../examples/builder-workflow/inspector-preview-cancel.source.md", import.meta.url);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function loadInspectorBuilderCase() {
  return JSON.parse(fs.readFileSync(caseUrl, "utf8"));
}

export function checkInspectorSourceSnapshots(fixture, readFile = fs.readFileSync) {
  if (fixture.source_file !== "inspector-preview-cancel.source.md") {
    throw new Error("The synthetic rehearsal reads only its accompanying public source fixture.");
  }
  const rawSource = readFile(sourceUrl);
  const bytes = Buffer.isBuffer(rawSource) ? rawSource : Buffer.from(rawSource);
  return fixture.source_snapshots.map((snapshot) => {
    const context = fixture.context_items.find((item) => item.id === snapshot.context_id);
    if (!context || sha256(context.content) !== snapshot.content_sha256) {
      throw new Error(`Synthetic context snapshot is invalid: ${snapshot.context_id}`);
    }
    return {
      context_id: snapshot.context_id,
      recorded_file_sha256: fixture.source_file_sha256,
      current_file_sha256: sha256(bytes),
      whole_file_unchanged: sha256(bytes) === fixture.source_file_sha256,
      excerpt_matches_current_source: bytes.subarray(snapshot.start_byte, snapshot.end_byte).toString("utf8") === context.content,
      content_sha256: snapshot.content_sha256,
    };
  });
}

export function createInspectorWorkflowCandidate(contract = loadActivityContract()) {
  const model = contract.interaction_models.artifact_inspector;
  return {
    workflow: {
      surface_name: "Exhibit plan inspection",
      topology: structuredClone(model.topology),
      work_units: structuredClone(model.work_units),
      artifact: { id: "artifact", boundary: "Rendered exhibit plan under review" },
      target_model: { ...structuredClone(model.target_model), artifact_id: "artifact" },
      state_groups: { core: structuredClone(model.state_groups.core) },
      primary_actions: ["Select finding", "Read evidence and source", "Preview correction", "Compare original", "Cancel preview"],
      decision_points: ["Does the target and source support the selected finding?", "Preview the correction or return to findings?"],
      completion_state: "The reviewer returns from preview with the saved artifact unchanged and the selected finding understood.",
    },
    surface_set: [{
      name: "Exhibit plan inspection",
      purpose: "Inspect the selected node, attached evidence and proposed correction beside the rendered artifact.",
      sections: ["Rendered exhibit plan", "Findings", "Selected target and evidence", "Correction preview"],
      controls: ["Select finding", "Preview correction", "Compare original", "Cancel preview"],
      relationship_to_workflow: "Keep the finding, rule, evidence and preview attached to the selected artifact node.",
    }],
    handoff: {
      next_owner: "Human reviewer",
      reason: "The correction remains a proposal until a separate human application decision.",
      next_action: "Continue inspecting the finding or return to findings.",
    },
    diagnostics: {
      implementation_terms: ["MCP", "schema", "fingerprint", "operation identifier"],
      reveal_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

export function rehearseInspectorBuilderWorkflow(fixture = loadInspectorBuilderCase(), { sourceCheck = true, readFile } = {}) {
  if (fixture.evidence_type !== "synthetic_fixture" || fixture.source_origin !== "authored_public_synthetic_fixture") {
    throw new Error("The public rehearsal requires explicitly synthetic inputs.");
  }
  const sourceSnapshots = sourceCheck ? checkInspectorSourceSnapshots(fixture, readFile) : [];
  if (sourceSnapshots.some((item) => !item.excerpt_matches_current_source)) {
    throw new Error("Synthetic source excerpts changed; refresh the fixture before rehearsing it.");
  }
  const brief = fixture.brief;
  const context_items = structuredClone(fixture.context_items);
  const packets = {};
  const requests = {};
  const stages = [];
  const blockers = [];
  function run(stage, request, callback) {
    requests[stage] = structuredClone(request);
    try {
      const packet = callback();
      packets[stage] = packet;
      const status = packet.review_status ?? packet.status ?? packet.implementation_contract_status ?? packet.handoff_status ?? packet.frontend_context_status ?? packet.skill_context_status;
      stages.push({ stage, status });
      return packet;
    } catch (error) {
      const failure = { code: error.code ?? "synthetic_rehearsal_error", message: error.message };
      stages.push({ stage, status: "blocked", error: failure });
      blockers.push({ stage, ...failure });
      return null;
    }
  }
  const baseline = run("baseline", { brief, context_items }, () => createActivityModelReview(brief, { context_items }));
  const activity = baseline && run("activity", { brief, context_items, candidate: fixture.activity_candidate }, () => reviewActivityModelCandidate(brief, fixture.activity_candidate, { context_items, proposer: "synthetic_source_fixture" }));
  const surface = activity && run("surface", { brief, activity_review: activity }, () => recommendSurfaceTypes(brief, { activity_review: activity }));
  const candidate = createInspectorWorkflowCandidate();
  const profile_id = surface?.profile_id;
  const workflow = surface?.status === "ready" && run("workflow", { brief, context_items, candidate, activity_review: activity, surface_review: surface, ...(profile_id ? { profile_id } : {}) }, () => reviewUiWorkflowCandidate(brief, candidate, { context_items, activity_review: activity, surface_review: surface, ...(profile_id ? { profile_id } : {}), proposer: "synthetic_source_fixture" }));
  for (const [stage, packet] of [["activity", activity], ["workflow", workflow]]) {
    if (packet && packet.review_status !== "ready_for_review") {
      blockers.push({ stage, code: "review_not_ready", status: packet.review_status });
    }
  }
  if (surface?.status === "review_required") {
    blockers.push({ stage: "surface", code: "routing_review_required", conflict: surface.routing_conflict ?? null });
  }
  const implementation = surface?.status === "ready" && run("implementation_contract", { surface_type: surface.recommended_surface_type }, () => createUiImplementationContract({ surface_type: surface.recommended_surface_type }));
  if (workflow?.review_status === "ready_for_review" && implementation) {
    const handoff = run("handoff", { workflow_review: workflow, brief, context_items, implementation_contract: implementation.implementation_contract }, () => createUiGenerationHandoff(workflow, { brief, context_items, implementation_contract: implementation.implementation_contract }));
    if (handoff?.handoff_status === "ready_for_generation") {
      const frontend = run("frontend", { ui_generation_handoff: handoff, brief, context_items }, () => createFrontendGenerationContext({ ui_generation_handoff: handoff, brief, context_items }));
      if (frontend?.frontend_context_status === "ready_for_frontend_implementation") {
        run("skill", { frontend_generation_context: frontend, brief, context_items }, () => createFrontendImplementationSkillContext({ frontend_generation_context: frontend, brief, context_items }));
      }
    }
  } else {
    stages.push({ stage: "handoff", status: "not_run", reason: "A ready workflow and implementation contract are required." });
  }
  const attestationGate = implementation?.generation_gates?.find((gate) => gate.id === "artifact_inspector_authority_gate");
  if (attestationGate?.status === "review_required") {
    blockers.push({ stage: "implementation_acceptance", code: "trusted_interactive_attestation_unavailable", status: "review_required" });
  }
  return {
    kind: "synthetic_inspector_builder_workflow_rehearsal",
    evidence_type: "synthetic_fixture_replay",
    source_origin: "authored_public_synthetic_fixture",
    transport: "direct_kernel",
    fresh_generation: false,
    browser_checks: "not_run",
    human_encounter: "not_run",
    usefulness: { status: "not_measured" },
    application: { executed: false, decision_owner: "human_reviewer", preview_authorizes_apply: false },
    artifact_authority: { owner: "Sample exhibit rules", scope: "primary_artifact", review_status: "external_not_reviewed" },
    implementation_acceptance: { status: "not_run", boundary: attestationGate?.status ?? "not_reached", reason: "No implementation was submitted; guidance does not replace trusted interactive attestation." },
    case_id: fixture.id,
    source_verification: sourceCheck ? "current_synthetic_excerpts_checked" : "not_run_snapshot_only",
    source_snapshots: sourceSnapshots,
    brief_sha256: sha256(brief),
    context_sha256: sha256(JSON.stringify(context_items)),
    kernel_source_sha256: sha256(fs.readFileSync(new URL("../src/index.mjs", import.meta.url))),
    stages,
    blockers,
    packets,
    requests,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = rehearseInspectorBuilderWorkflow();
  console.log(JSON.stringify({ evidence_type: result.evidence_type, transport: result.transport, source_verification: result.source_verification, stages: result.stages, blockers: result.blockers, implementation_acceptance: result.implementation_acceptance, human_encounter: result.human_encounter, usefulness: result.usefulness }, null, 2));
}
