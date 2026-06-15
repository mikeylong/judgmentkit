#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EVIDENCE_PACKET_JSON_FILENAME = "mcp-pilot-evidence-packet.json";
export const EVIDENCE_PACKET_MD_FILENAME = "mcp-pilot-evidence-packet.md";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function relativeToRoot(filePath) {
  return path.relative(ROOT_DIR, path.resolve(filePath)).split(path.sep).join("/");
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    primaryReport: null,
    comparisonReports: [],
    outputDir: null,
    changedFiles: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--primary-report") args.primaryReport = argv[++index];
    else if (arg === "--comparison-reports") {
      args.comparisonReports = argv[++index]?.split(",").filter(Boolean) ?? [];
    } else if (arg === "--changed-files") {
      args.changedFiles = argv[++index]?.split(",").filter(Boolean) ?? [];
    } else if (arg === "--output-dir") args.outputDir = argv[++index];
    else throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!args.primaryReport) throw new Error("--primary-report is required.");
  if (!args.outputDir) throw new Error("--output-dir is required.");

  return args;
}

function loadReport(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`MCP pilot evidence packet report not found: ${filePath}`);
  }
  return readJson(filePath);
}

function assertCompatibleReport(report, expectedMcpVersion, label) {
  const actualVersion = report?.mcp?.actual_version;
  const requiredVersion = report?.mcp?.required_version;
  const runVersion = report?.run?.mcp_release;
  const mismatches = [
    ["actual", actualVersion],
    ["required", requiredVersion],
    ["run", runVersion],
  ].filter(([, version]) => version !== expectedMcpVersion);

  if (mismatches.length > 0) {
    throw new Error(
      `${label} MCP version mismatch: expected ${expectedMcpVersion}, got ${mismatches
        .map(([kind, version]) => `${kind}=${version}`)
        .join(", ")}`,
    );
  }
}

function modelSummaries(report) {
  return (report.comparison?.models ?? []).map((model) => ({
    id: model.id,
    label: model.label,
    provider: model.provider,
    model: model.model,
    local: model.local,
    role: model.role ?? null,
  }));
}

function runSummary(report, reportPath) {
  const summary = report.summary ?? {};
  return {
    run_id: report.run?.run_id,
    run_path: report.run?.run_path,
    report_path: relativeToRoot(reportPath),
    capture_dir: report.capture_dir,
    status: summary.pilot_status,
    matrix_status: summary.matrix_status ?? null,
    cases: summary.cases,
    evaluated_cases: summary.evaluated_cases,
    passed: summary.passed,
    failed: summary.failed,
    guided_wins: summary.guided_wins,
    baseline_wins: summary.baseline_wins,
    ties: summary.ties,
    average_guided_delta: summary.average_guided_delta,
    invalid_outputs: summary.invalid_outputs,
    guided_critical_disclosure_leaks: summary.guided_critical_disclosure_leaks,
    standard_delta_passed: summary.standard_delta_passed ?? null,
    calibrated_only_passes: summary.calibrated_only_passes ?? null,
    calibrated_pass_reason_counts: summary.calibrated_pass_reason_counts ?? {},
  };
}

function proofSummary(report) {
  const summary = report.summary ?? {};
  return {
    repair_loop: {
      loop_cases: summary.loop_cases ?? 0,
      converged_cases: summary.converged_cases ?? 0,
      stopped_cases: summary.stopped_cases ?? 0,
      average_attempts_to_pass: summary.average_attempts_to_pass ?? 0,
      failure_category_counts: summary.failure_category_counts ?? {},
      proof_policy: report.repair_loop_proof_policy ?? null,
    },
    live_repair_observation: {
      observation_cases: summary.observation_cases ?? 0,
      observation_converged_cases: summary.observation_converged_cases ?? 0,
      observation_stopped_cases: summary.observation_stopped_cases ?? 0,
      observation_failed_cases: summary.observation_failed_cases ?? 0,
      observation_average_attempts_to_pass:
        summary.observation_average_attempts_to_pass ?? 0,
      proof_policy: report.repair_loop_observation_policy ?? null,
    },
    visual_token_adapter: {
      visual_token_cases: summary.visual_token_cases ?? 0,
      visual_token_passed_cases: summary.visual_token_passed_cases ?? 0,
      visual_token_failed_cases: summary.visual_token_failed_cases ?? 0,
      visual_token_failure_category_counts:
        summary.visual_token_failure_category_counts ?? {},
      proof_policy: report.visual_token_adapter_proof_policy ?? null,
    },
  };
}

function nextMilestonePlan() {
  return {
    id: "milestone-4-default-renderer-component-package",
    status: "deferred_planning_only",
    summary:
      "Default renderer/component package driven by implementation_contract.visual_token_adapter.",
    constraints: [
      "renderer consumes contract primitives and visual token semantics",
      "renderer does not create approved primitives",
      "renderer cannot satisfy or bypass implementation gates",
      "renderer does not introduce A2UI, a catalog compiler, or protocol compiler",
      "renderer is not visual-quality scoring",
    ],
    deferred_contract_pointer:
      "implementation_contract.visual_token_adapter.deferred_renderer remains deferred",
  };
}

function remainingFailures(report) {
  return (report.results ?? [])
    .filter((result) => result.status === "evaluated" && !result.passed)
    .map((result) => ({
      id: result.id,
      title: result.title,
      case_type: result.case_type,
      winner: result.winner,
      score_delta: result.score_delta,
      minimum_score_delta: result.minimum_score_delta,
      calibrated_pass_reason: result.calibrated_pass_reason ?? null,
      guided_score:
        result.variants?.find((variant) => variant.id === "judgmentkit_mcp")?.score ?? null,
      baseline_score:
        result.variants?.find((variant) => variant.id === "baseline_no_mcp")?.score ?? null,
      guided_critical_disclosure_leaks: result.guided_critical_disclosure_leaks ?? [],
    }));
}

export function buildEvidencePacket({
  primaryReport,
  primaryReportPath,
  comparisonReports = [],
  comparisonReportPaths = [],
  changedFiles = [],
}) {
  const expectedMcpVersion = primaryReport?.mcp?.actual_version;
  if (!expectedMcpVersion) {
    throw new Error("Primary MCP pilot report is missing mcp.actual_version.");
  }

  assertCompatibleReport(primaryReport, expectedMcpVersion, "primary report");
  comparisonReports.forEach((report, index) => {
    assertCompatibleReport(report, expectedMcpVersion, `comparison report ${index + 1}`);
  });

  return {
    packet_id: "judgmentkit-mcp-private-pilot-evidence-v1",
    evidence_type: "repo-local saved-capture product proof",
    methodology:
      "Deterministic scoring of saved baseline and JudgmentKit-guided model captures. JudgmentKit MCP supplies context but is not used as the judge.",
    checkpoint_policy:
      "Checkpoint means a reproducible evidence packet plus scoped file manifest; no git commit is implied.",
    mcp: {
      required_version: primaryReport.mcp.required_version,
      actual_version: primaryReport.mcp.actual_version,
      package_version: primaryReport.mcp.package_version,
      local_metadata_sha256: primaryReport.mcp.local_metadata_sha256,
      endpoint_metadata_sha256: primaryReport.mcp.endpoint_metadata_sha256,
    },
    scoring_policy: {
      metric_scale: primaryReport.metric_scale,
      pass_bar:
        "Pilot passes when at least 75% of evaluated cases pass, average guided delta is at least +10, and guided critical disclosure leaks are zero.",
      calibration:
        "Calibrated pass reasons preserve raw scores while allowing high absolute guided scores and verified implementation repair-loop evidence to pass.",
    },
    primary: {
      ...runSummary(primaryReport, primaryReportPath),
      proofs: proofSummary(primaryReport),
      models: modelSummaries(primaryReport),
      remaining_failures: remainingFailures(primaryReport),
    },
    comparisons: comparisonReports.map((report, index) => ({
      ...runSummary(report, comparisonReportPaths[index]),
      models: modelSummaries(report),
    })),
    artifact_paths: {
      primary_report: relativeToRoot(primaryReportPath),
      comparison_reports: comparisonReportPaths.map(relativeToRoot),
      primary_html_report: primaryReport.run?.html_report ?? null,
      primary_capture_dir: primaryReport.capture_dir,
    },
    scoped_changed_file_manifest: {
      policy:
        "Intentional proof-package scope. Existing unrelated capture/report artifacts are preserved outside this manifest.",
      files: changedFiles.map(relativeToRoot),
    },
    next_milestone: nextMilestonePlan(),
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => String(value ?? "")).join(" | ")} |`),
  ].join("\n");
}

export function renderEvidencePacketMarkdown(packet) {
  const primary = packet.primary;
  const comparisonRows = [primary, ...packet.comparisons].map((run) => [
    run.run_id,
    run.status,
    `${run.passed}/${run.evaluated_cases}`,
    run.average_guided_delta,
    run.guided_wins,
    run.invalid_outputs,
    run.guided_critical_disclosure_leaks,
  ]);
  const failureRows =
    primary.remaining_failures.length === 0
      ? [["none", "", "", "", ""]]
      : primary.remaining_failures.map((failure) => [
          failure.id,
          failure.case_type,
          failure.winner,
          failure.score_delta,
          `${failure.guided_score}/${failure.baseline_score}`,
        ]);
  const modelRows = primary.models.map((model) => [
    model.id,
    model.label,
    model.provider,
    model.model,
    model.local ? "yes" : "no",
  ]);
  const changedFileRows =
    packet.scoped_changed_file_manifest.files.length === 0
      ? [["none"]]
      : packet.scoped_changed_file_manifest.files.map((filePath) => [filePath]);

  return `${[
    "# JudgmentKit MCP Pilot Evidence Packet",
    "",
    "## Summary",
    "",
    `Primary run: \`${primary.run_id}\` (${primary.status})`,
    `Result: ${primary.passed}/${primary.evaluated_cases} passed, average guided delta ${primary.average_guided_delta}, guided leaks ${primary.guided_critical_disclosure_leaks}, invalid outputs ${primary.invalid_outputs}.`,
    "",
    "## Methodology",
    "",
    packet.methodology,
    "",
    "## MCP Version Lock",
    "",
    `Required version: \`${packet.mcp.required_version}\``,
    `Actual version: \`${packet.mcp.actual_version}\``,
    `Package version: \`${packet.mcp.package_version}\``,
    `Metadata SHA256: \`${packet.mcp.endpoint_metadata_sha256}\``,
    "",
    "## Model Runtime",
    "",
    markdownTable(["ID", "Label", "Provider", "Model", "Local"], modelRows),
    "",
    "## Before/After",
    "",
    markdownTable(
      ["Run", "Status", "Passed", "Avg Delta", "Guided Wins", "Invalid", "Guided Leaks"],
      comparisonRows,
    ),
    "",
    "## Scoring Calibration",
    "",
    `Standard delta passes: ${primary.standard_delta_passed}`,
    `Calibrated-only passes: ${primary.calibrated_only_passes}`,
    `Pass reason counts: \`${JSON.stringify(primary.calibrated_pass_reason_counts)}\``,
    "",
    "## Proof Summary",
    "",
    `Repair loop: ${primary.proofs.repair_loop.converged_cases}/${primary.proofs.repair_loop.loop_cases} converged, ${primary.proofs.repair_loop.stopped_cases} stopped, average attempts to pass ${primary.proofs.repair_loop.average_attempts_to_pass}.`,
    `Live observation: ${primary.proofs.live_repair_observation.observation_converged_cases}/${primary.proofs.live_repair_observation.observation_cases} converged, ${primary.proofs.live_repair_observation.observation_stopped_cases} stopped, ${primary.proofs.live_repair_observation.observation_failed_cases} failed.`,
    `Visual token adapter: ${primary.proofs.visual_token_adapter.visual_token_passed_cases}/${primary.proofs.visual_token_adapter.visual_token_cases} proof cases passed, ${primary.proofs.visual_token_adapter.visual_token_failed_cases} failed.`,
    "",
    "## Remaining Failures",
    "",
    markdownTable(["Case", "Type", "Winner", "Delta", "Guided/Baseline"], failureRows),
    "",
    "## Artifact Paths",
    "",
    `Primary report: \`${packet.artifact_paths.primary_report}\``,
    `Primary capture dir: \`${packet.artifact_paths.primary_capture_dir}\``,
    `Comparison reports: ${packet.artifact_paths.comparison_reports.map((item) => `\`${item}\``).join(", ")}`,
    "",
    "## Scoped Changed Files",
    "",
    packet.scoped_changed_file_manifest.policy,
    "",
    markdownTable(["Path"], changedFileRows),
    "",
    "## Next Milestone",
    "",
    `Status: \`${packet.next_milestone.status}\``,
    packet.next_milestone.summary,
    "",
    markdownTable(["Constraint"], packet.next_milestone.constraints.map((constraint) => [constraint])),
    "",
  ].join("\n")}\n`;
}

export function writeEvidencePacket({ packet, outputDir }) {
  const jsonPath = path.join(outputDir, EVIDENCE_PACKET_JSON_FILENAME);
  const markdownPath = path.join(outputDir, EVIDENCE_PACKET_MD_FILENAME);
  writeJson(jsonPath, packet);
  fs.writeFileSync(markdownPath, renderEvidencePacketMarkdown(packet));
  return { jsonPath, markdownPath };
}

export function buildEvidencePacketFromFiles({
  primaryReportPath,
  comparisonReportPaths,
  outputDir,
  changedFiles = [],
}) {
  const primaryReport = loadReport(primaryReportPath);
  const comparisonReports = comparisonReportPaths.map(loadReport);
  const packet = buildEvidencePacket({
    primaryReport,
    primaryReportPath,
    comparisonReports,
    comparisonReportPaths,
    changedFiles,
  });
  return { packet, ...writeEvidencePacket({ packet, outputDir }) };
}

async function main() {
  const args = parseArgs();
  const { jsonPath, markdownPath } = buildEvidencePacketFromFiles({
    primaryReportPath: args.primaryReport,
    comparisonReportPaths: args.comparisonReports,
    outputDir: args.outputDir,
    changedFiles: args.changedFiles,
  });
  console.log(`# JudgmentKit MCP Pilot Evidence Packet`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${markdownPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
