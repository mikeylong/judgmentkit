import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const skillDir = path.join(root, "skills", "ui-generation-eval-report");
const skillPath = path.join(skillDir, "SKILL.md");
const openAiYamlPath = path.join(skillDir, "agents", "openai.yaml");
const frontendSkillPath = path.join(root, "skills", "frontend-ui-implementation", "SKILL.md");

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, "skill should have YAML frontmatter");

  return Object.fromEntries(
    match[1].split("\n").map((line) => {
      const separator = line.indexOf(":");
      assert.ok(separator > 0, `frontmatter line should be key/value: ${line}`);
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      return [key, value];
    }),
  );
}

assert.equal(fs.existsSync(skillPath), true);
assert.equal(fs.existsSync(openAiYamlPath), true);
assert.equal(fs.existsSync(frontendSkillPath), true);

const skill = fs.readFileSync(skillPath, "utf8");
const frontmatter = parseFrontmatter(skill);

assert.equal(frontmatter.name, "ui-generation-eval-report");
assert.ok(frontmatter.description.includes("UI-generation eval reports"));
assert.equal(/[<>]/.test(frontmatter.description), false);

for (const requiredText of [
  "npm run eval:ui",
  "node tests/ui-generation-evals.test.mjs",
  "npm run site:build",
  "npm run site:dev -- --host 127.0.0.1 --port 4173",
  "evals/reports/<date>/mcp-<version>/run-NNN/ui-generation-report.json",
  "evals/reports/index.json",
  "http://127.0.0.1:4173/evals/",
  "JudgmentKit UI Eval Runs",
  "JudgmentKit UI-Generation Eval",
  "benchmark disclaimer",
  "claim level",
  "visual evidence screenshots",
  "screenshot archive path",
  "activity-fit evidence",
  "implementation leakage findings",
  "create_activity_model_review",
  "review_ui_workflow_candidate",
  "create_ui_generation_handoff",
  "MCP review was skipped",
]) {
  assert.ok(skill.includes(requiredText), `skill should reference ${requiredText}`);
}

const openAiYaml = fs.readFileSync(openAiYamlPath, "utf8");

assert.ok(openAiYaml.includes('display_name: "UI Generation Eval Report"'));
assert.ok(
  openAiYaml.includes('short_description: "Generate and QA JudgmentKit UI eval reports"'),
);
assert.ok(
  openAiYaml.includes(
    'default_prompt: "Use $ui-generation-eval-report to refresh the UI eval report and QA the generated HTML."',
  ),
);

const frontendSkill = fs.readFileSync(frontendSkillPath, "utf8");
const frontendFrontmatter = parseFrontmatter(frontendSkill);

assert.equal(frontendFrontmatter.name, "frontend-ui-implementation");
assert.ok(frontendFrontmatter.description.includes("selected surface type"));

for (const requiredText of [
  "create_activity_model_review",
  "recommend_surface_types",
  "review_ui_workflow_candidate",
  "create_ui_implementation_contract",
  "create_ui_generation_handoff",
  "review_ui_implementation_candidate",
  "create_frontend_generation_context",
  "create_frontend_implementation_skill_context",
  "ready_for_generation",
  "surface_type",
  "marketing",
  "workbench",
  "operator_review",
  "form_flow",
  "dashboard_monitor",
  "content_report",
  "setup_debug_tool",
  "conversation",
  "disclosure boundary",
  "implementation contract",
  "raw controls",
  "static checks",
  "verification commands",
  "compiled frontend implementation skill context",
]) {
  assert.ok(frontendSkill.includes(requiredText), `frontend skill should reference ${requiredText}`);
}

console.log("skill checks passed.");
