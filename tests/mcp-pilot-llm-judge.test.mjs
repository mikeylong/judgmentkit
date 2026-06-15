import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildLlmEvidenceReport,
  buildLlmJudgePrompt,
  blindedOrder,
  parseJudgeOutput,
} from "../evals/run-mcp-pilot-llm-judge.mjs";

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function testCase(id = "refund-schema-admin-translation") {
  return {
    id,
    title: "Refund schema admin translation",
    case_type: "activity_translation",
    task_prompt: "Plan the next agent response.",
    source_context: {
      brief:
        "A support lead reviews refund requests and decides whether to approve, send to policy review, or return for missing evidence.",
    },
    expected_next_action: "translate request into refund triage handoff",
  };
}

function capture(caseId, variantId, response) {
  return {
    case_id: caseId,
    variant_id: variantId,
    model_config_id: "test-model",
    mcp_version: "0.2.0",
    output_valid: true,
    parsed: {
      response,
      next_action: response,
      questions: [],
      handoff: `Decision: ${response}; Action: send handoff; Reason: source evidence.`,
      rationale: response,
    },
    raw_response: JSON.stringify({ response }),
  };
}

function report({ tempDir, caseId = "refund-schema-admin-translation" }) {
  const captureDir = path.join(tempDir, "captures");
  const captureRoot = path.join(captureDir, "mcp-0.2.0", "test-model", caseId);
  writeJson(
    path.join(captureRoot, "baseline_no_mcp.json"),
    capture(caseId, "baseline_no_mcp", "Expose JSON schema fields and ask generic questions."),
  );
  writeJson(
    path.join(captureRoot, "judgmentkit_mcp.json"),
    capture(
      caseId,
      "judgmentkit_mcp",
      "Create a refund triage handoff with decision, next action, reason, and evidence gap.",
    ),
  );

  return {
    eval_id: "mcp-pilot",
    capture_dir: captureDir,
    mcp: {
      required_version: "0.2.0",
      actual_version: "0.2.0",
    },
    run: {
      run_id: "run-test",
      run_path: "2026-06-15/mcp-0.2.0/run-test",
    },
    summary: {
      primary_model_id: "test-model",
      per_model: {
        "test-model": {
          passed: 1,
          evaluated_cases: 1,
          average_guided_delta: 50,
          guided_critical_disclosure_leaks: 0,
          invalid_outputs: 0,
        },
      },
    },
    results: [
      {
        id: caseId,
        title: "Refund schema admin translation",
        case_type: "activity_translation",
        model_config_id: "test-model",
        model_label: "Test model",
        status: "evaluated",
        passed: true,
        winner: "judgmentkit_mcp",
        score_delta: 50,
        expected_next_action: "translate request into refund triage handoff",
        variants: [
          {
            id: "baseline_no_mcp",
            capture: {
              capture_file: `mcp-0.2.0/test-model/${caseId}/baseline_no_mcp.json`,
            },
          },
          {
            id: "judgmentkit_mcp",
            capture: {
              capture_file: `mcp-0.2.0/test-model/${caseId}/judgmentkit_mcp.json`,
            },
          },
        ],
      },
    ],
  };
}

function judgeResponseForGuided(mapping) {
  const guidedBlindId = mapping.output_a === "judgmentkit_mcp" ? "output_a" : "output_b";
  const baselineBlindId = guidedBlindId === "output_a" ? "output_b" : "output_a";
  return JSON.stringify({
    winner: guidedBlindId,
    confidence: "high",
    rationale: "The guided output is more actionable and grounded.",
    decisive_differences: ["It names the decision, action, reason, and evidence gap."],
    evidence: [
      {
        output: guidedBlindId,
        quote: "decision, next action, reason, and evidence gap",
        why_it_matters: "This gives the next agent an operational handoff.",
      },
    ],
    output_a_quality: {
      score: guidedBlindId === "output_a" ? 9 : 3,
      strengths: guidedBlindId === "output_a" ? ["grounded"] : ["some context"],
      risks: guidedBlindId === "output_a" ? [] : ["generic"],
    },
    output_b_quality: {
      score: baselineBlindId === "output_b" ? 3 : 9,
      strengths: baselineBlindId === "output_b" ? ["some context"] : ["grounded"],
      risks: baselineBlindId === "output_b" ? ["generic"] : [],
    },
  });
}

{
  const sampleCase = testCase();
  const prompt = buildLlmJudgePrompt({
    testCase: sampleCase,
    result: {
      ...sampleCase,
      expected_next_action: sampleCase.expected_next_action,
    },
    outputA: { response: "A" },
    outputB: { response: "B" },
  });
  assert.equal(prompt.includes("baseline_no_mcp"), false);
  assert.equal(prompt.includes("judgmentkit_mcp"), false);
}

{
  const parsed = parseJudgeOutput(judgeResponseForGuided(blindedOrder("case")));
  assert.equal(parsed.output_valid, true);
  assert.equal(parseJudgeOutput("{}").output_valid, false);
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-llm-judge-test-"));
  const reportPath = path.join(tempDir, "report.json");
  writeJson(reportPath, report({ tempDir }));

  const evidence = await buildLlmEvidenceReport({
    reportPath,
    outputDir: path.join(tempDir, "out"),
    modelId: "test-model",
    judge: true,
    casesData: [testCase()],
    judgeFn: async ({ mapping }) => judgeResponseForGuided(mapping),
  });

  assert.equal(evidence.summary.valid_judgments, 1);
  assert.equal(evidence.summary.guided_preferred, 1);
  assert.equal(evidence.summary.baseline_preferred, 0);
  assert.equal(evidence.summary.average_guided_quality_delta, 6);
  assert.ok(fs.existsSync(path.join(tempDir, "out", "mcp-pilot-llm-evidence.json")));
  assert.ok(fs.existsSync(path.join(tempDir, "out", "mcp-pilot-llm-evidence.md")));
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-llm-judge-required-test-"));
  const reportPath = path.join(tempDir, "report.json");
  writeJson(reportPath, report({ tempDir }));

  const evidence = await buildLlmEvidenceReport({
    reportPath,
    outputDir: path.join(tempDir, "out"),
    modelId: "test-model",
    judge: false,
    casesData: [testCase()],
  });

  assert.equal(evidence.summary.valid_judgments, 0);
  assert.equal(evidence.summary.judge_required, 1);
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-llm-judge-invalid-test-"));
  const reportPath = path.join(tempDir, "report.json");
  writeJson(reportPath, report({ tempDir }));

  const evidence = await buildLlmEvidenceReport({
    reportPath,
    outputDir: path.join(tempDir, "out"),
    modelId: "test-model",
    judge: true,
    casesData: [testCase()],
    judgeFn: async () => "{}",
  });

  assert.equal(evidence.summary.valid_judgments, 0);
  assert.equal(evidence.summary.invalid_judgments, 1);
}

console.log("MCP pilot LLM judge checks passed.");
