import process from "node:process";

import { createModelAssistedUiWorkflowReview } from "../src/index.mjs";
import { createOpenAIResponsesUiWorkflowProposer } from "../src/providers/openai-responses.mjs";

const REFUND_TRIAGE_BRIEF = `
  A support lead is reviewing refund requests during the daily triage workflow.
  The activity is deciding whether a case should be approved, sent to policy review,
  or returned to the agent for missing evidence. The outcome is a clear handoff
  with the next action and the reason for the decision.
`;

function printResult(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function skip(reason) {
  printResult({
    skipped: true,
    reason,
  });
}

if (process.env.JUDGMENTKIT_OPENAI_SMOKE !== "1") {
  skip("Set JUDGMENTKIT_OPENAI_SMOKE=1 to run the OpenAI UI workflow smoke test.");
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY || !process.env.JUDGMENTKIT_OPENAI_MODEL) {
  skip(
    "Set OPENAI_API_KEY and JUDGMENTKIT_OPENAI_MODEL to run the OpenAI UI workflow smoke test.",
  );
  process.exit(0);
}

const propose = createOpenAIResponsesUiWorkflowProposer();
const packet = await createModelAssistedUiWorkflowReview(REFUND_TRIAGE_BRIEF, {
  propose,
});
const ok = packet.review_status === "ready_for_review";

printResult({
  ok,
  review_status: packet.review_status,
  confidence: packet.review.confidence,
  targeted_questions_count: packet.review.targeted_questions.length,
  surface_name: packet.candidate.workflow.surface_name,
  model: process.env.JUDGMENTKIT_OPENAI_MODEL,
});

if (!ok) {
  process.exitCode = 1;
}
