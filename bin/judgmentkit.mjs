#!/usr/bin/env node
import fs from "node:fs/promises";
import process from "node:process";

import {
  JudgmentKitInputError,
  analyzeImplementationBrief,
  createActivityModelReview,
  reviewActivityModelCandidate,
} from "../src/index.mjs";

function printUsage() {
  process.stderr.write(
    [
      "Usage:",
      "  judgmentkit analyze [--input <file>]",
      "  judgmentkit review [--input <file>]",
      "  judgmentkit review-candidate [--input <file>] --candidate <file>",
      "",
    ].join("\n"),
  );
}

async function readStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parseArgs(argv) {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  if (!["analyze", "review", "review-candidate"].includes(command)) {
    return { command: "unknown" };
  }

  const parsed = { command, inputPath: undefined, candidatePath: undefined };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--input") {
      const next = rest[index + 1];
      if (!next) {
        throw new JudgmentKitInputError("--input requires a file path.");
      }
      parsed.inputPath = next;
      index += 1;
      continue;
    }

    if (arg === "--candidate") {
      const next = rest[index + 1];
      if (!next) {
        throw new JudgmentKitInputError("--candidate requires a file path.");
      }
      parsed.candidatePath = next;
      index += 1;
      continue;
    }

    throw new JudgmentKitInputError(`Unsupported argument: ${arg}`);
  }

  if (parsed.command !== "review-candidate" && parsed.candidatePath) {
    throw new JudgmentKitInputError("--candidate is only supported for review-candidate.");
  }

  if (parsed.command === "review-candidate" && !parsed.candidatePath) {
    throw new JudgmentKitInputError("review-candidate requires --candidate <file>.");
  }

  return parsed;
}

async function readInput(inputPath) {
  return inputPath
    ? await fs.readFile(inputPath, "utf8")
    : await readStdin();
}

async function readCandidate(candidatePath) {
  try {
    return JSON.parse(await fs.readFile(candidatePath, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new JudgmentKitInputError("--candidate must point to a valid JSON file.");
    }

    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "help") {
    printUsage();
    return;
  }

  if (args.command === "unknown") {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const input = await readInput(args.inputPath);
  let result;

  if (args.command === "review") {
    result = createActivityModelReview(input);
  } else if (args.command === "review-candidate") {
    result = reviewActivityModelCandidate(input, await readCandidate(args.candidatePath));
  } else {
    result = analyzeImplementationBrief(input);
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const code = error instanceof JudgmentKitInputError ? error.code : "command_error";
  const message = error instanceof Error ? error.message : "Unknown JudgmentKit CLI error.";

  process.stderr.write(`${JSON.stringify({ error: { code, message } }, null, 2)}\n`);
  process.exitCode = 1;
});
