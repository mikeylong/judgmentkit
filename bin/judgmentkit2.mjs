#!/usr/bin/env node
import fs from "node:fs/promises";
import process from "node:process";

import { JudgmentKitInputError, analyzeImplementationBrief } from "../src/index.mjs";

function printUsage() {
  process.stderr.write("Usage: judgmentkit2 analyze [--input <file>]\n");
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

  if (command !== "analyze") {
    return { command: "unknown" };
  }

  const parsed = { command, inputPath: undefined };

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

    throw new JudgmentKitInputError(`Unsupported argument: ${arg}`);
  }

  return parsed;
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

  const input = args.inputPath
    ? await fs.readFile(args.inputPath, "utf8")
    : await readStdin();
  const result = analyzeImplementationBrief(input);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const code = error instanceof JudgmentKitInputError ? error.code : "command_error";
  const message = error instanceof Error ? error.message : "Unknown JudgmentKit 2 CLI error.";

  process.stderr.write(`${JSON.stringify({ error: { code, message } }, null, 2)}\n`);
  process.exitCode = 1;
});
