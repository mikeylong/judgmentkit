import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { REPO_ROOT } from "./actual-constants.mjs";

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-pack-smoke-"));

try {
  const packOutput = run("npm", ["pack", "--json", "--pack-destination", tempRoot]);
  const packInfo = JSON.parse(packOutput)[0];
  const files = packInfo.files.map((entry) => entry.path).sort();

  for (const forbiddenPrefix of ["outputs/", "scripts/", "tests/", "evals/", "packages/"]) {
    if (files.some((file) => file.startsWith(forbiddenPrefix))) {
      fail(`Packed package should not include ${forbiddenPrefix} files.`);
    }
  }

  if (!files.includes("src/presentation-theme/index.mjs")) {
    fail("Packed package should include the presentation-theme public module.");
  }

  const packageRoot = path.join(tempRoot, "node_modules", "judgmentkit");
  fs.mkdirSync(path.dirname(packageRoot), { recursive: true });
  run("tar", ["-xzf", path.join(tempRoot, packInfo.filename), "-C", tempRoot]);
  fs.renameSync(path.join(tempRoot, "package"), packageRoot);

  fs.writeFileSync(
    path.join(tempRoot, "check.mjs"),
    [
      'import * as root from "judgmentkit";',
      'import * as provider from "judgmentkit/providers/openai-responses";',
      'import * as theme from "judgmentkit/presentation-theme";',
      'if (!root || !provider || !theme.createJudgmentKitPresentation) throw new Error("missing public import");',
      'console.log("imports ok");',
      "",
    ].join("\n"),
  );

  run(process.execPath, [path.join(tempRoot, "check.mjs")], { cwd: tempRoot });
  run(process.execPath, [path.join(packageRoot, "bin", "judgmentkit.mjs"), "--help"], { cwd: tempRoot });

  console.log("presentation-theme package surface smoke passed");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
