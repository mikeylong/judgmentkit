import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build as buildWithEsbuild } from "esbuild";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
}

async function assertFrameworkNeutralGraph(entryPoint, label) {
  const result = await buildWithEsbuild({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    metafile: true,
    platform: "node",
    format: "esm",
    packages: "external",
    logLevel: "silent",
  });
  const graphText = JSON.stringify(result.metafile);
  assert.doesNotMatch(graphText, /(?:^|[\\/])src[\\/]react[\\/]/i, `${label} loaded the React adapter`);
  assert.doesNotMatch(graphText, /\.css(?:"|$)/i, `${label} loaded component CSS`);
  for (const output of Object.values(result.metafile.outputs)) {
    for (const imported of output.imports ?? []) {
      assert.doesNotMatch(imported.path, /^react(?:-dom)?(?:\/|$)/, `${label} imported ${imported.path}`);
    }
  }
}

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "judgmentkit-component-pack-"),
);

try {
  const packOutput = run("npm", [
    "pack",
    "--json",
    "--pack-destination",
    tempRoot,
  ], {
    env: {
      ...process.env,
      npm_config_cache: path.join(tempRoot, "npm-cache"),
    },
  });
  const packInfo = JSON.parse(packOutput)[0];
  const packedFiles = new Set(packInfo.files.map((entry) => entry.path));

  for (const requiredFile of [
    "src/react/index.mjs",
    "src/react/native-components.mjs",
    "src/react/interactive-components.mjs",
    "src/react/styles.css",
    "src/component-registry.mjs",
  ]) {
    assert.ok(packedFiles.has(requiredFile), `packed package is missing ${requiredFile}`);
  }

  const packageRoot = path.join(tempRoot, "node_modules", "judgmentkit");
  fs.mkdirSync(path.dirname(packageRoot), { recursive: true });
  run("tar", [
    "-xzf",
    path.join(tempRoot, packInfo.filename),
    "-C",
    tempRoot,
  ]);
  fs.renameSync(path.join(tempRoot, "package"), packageRoot);

  const packedPackage = JSON.parse(
    fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  );
  assert.equal(packedPackage.exports["./react"], "./src/react/index.mjs");
  assert.equal(
    packedPackage.exports["./react/styles.css"],
    "./src/react/styles.css",
  );
  assert.deepEqual(packedPackage.peerDependencies, {
    react: ">=19 <20",
    "react-dom": ">=19 <20",
  });
  assert.equal(packedPackage.peerDependenciesMeta.react.optional, true);
  assert.equal(packedPackage.peerDependenciesMeta["react-dom"].optional, true);

  fs.writeFileSync(
    path.join(tempRoot, "root-check.mjs"),
    [
      'import * as judgmentkit from "judgmentkit";',
      'if (typeof judgmentkit.createUiImplementationContract !== "function") throw new Error("root import failed");',
      'const expectedRendererIds = ["action_button", "action_group", "form_field", "text_field", "text_area", "select_field", "checkbox_group", "radio_group", "toggle", "tabs", "menu", "dialog", "alert", "table", "panel", "card", "status_message"];',
      'const actualRendererIds = judgmentkit.listRendererComponentIds();',
      'if (JSON.stringify(actualRendererIds) !== JSON.stringify(expectedRendererIds)) throw new Error(`registry projection failed: ${JSON.stringify(actualRendererIds)}`);',
    ].join("\n"),
  );
  run(process.execPath, [path.join(tempRoot, "root-check.mjs")], {
    cwd: tempRoot,
  });
  run(process.execPath, [
    path.join(packageRoot, "bin", "judgmentkit.mjs"),
    "--help",
  ], { cwd: tempRoot });

  await Promise.all([
    assertFrameworkNeutralGraph(
      path.join(packageRoot, "src", "index.mjs"),
      "root export",
    ),
    assertFrameworkNeutralGraph(
      path.join(packageRoot, "bin", "judgmentkit.mjs"),
      "CLI",
    ),
    assertFrameworkNeutralGraph(
      path.join(packageRoot, "src", "mcp.mjs"),
      "MCP",
    ),
    assertFrameworkNeutralGraph(
      path.join(packageRoot, "src", "mcp-http.mjs"),
      "MCP HTTP",
    ),
  ]);

  for (const dependency of ["react", "react-dom"]) {
    fs.symlinkSync(
      path.join(REPO_ROOT, "node_modules", dependency),
      path.join(tempRoot, "node_modules", dependency),
      "dir",
    );
  }

  fs.writeFileSync(
    path.join(tempRoot, "react-check.mjs"),
    [
      'import React, { createElement } from "react";',
      'import { renderToStaticMarkup } from "react-dom/server";',
      'import * as adapter from "judgmentkit/react";',
      'import {',
      '  ActionButton,',
      '  ActionGroup,',
      '  Alert,',
      '  Card,',
      '  CheckboxField,',
      '  CheckboxGroup,',
      '  Dialog,',
      '  FormField,',
      '  Menu,',
      '  Panel,',
      '  RadioGroup,',
      '  SelectField,',
      '  StatusMessage,',
      '  Table,',
      '  Tabs,',
      '  TextArea,',
      '  TextField,',
      '  Toggle,',
      '} from "judgmentkit/react";',
      'const expectedExports = ["ActionButton", "ActionGroup", "Alert", "Card", "CheckboxField", "CheckboxGroup", "Dialog", "FormField", "Menu", "Panel", "RadioGroup", "SelectField", "StatusMessage", "Table", "Tabs", "TextArea", "TextField", "Toggle"].sort();',
      'if (JSON.stringify(Object.keys(adapter).sort()) !== JSON.stringify(expectedExports)) throw new Error(`unexpected React adapter exports: ${JSON.stringify(Object.keys(adapter).sort())}`);',
      'const components = [',
      '  createElement(ActionButton, null, "Approve"),',
      '  createElement(ActionGroup, { label: "Review actions" }, createElement("button", { type: "button" }, "Cancel")),',
      '  createElement(Alert, { title: "Review required" }, "Confirm the change before continuing."),',
      '  createElement(Card, { title: "Policy review", summary: "One policy needs attention.", action: { type: "link", href: "/policy", label: "Open policy" } }),',
      '  createElement(CheckboxField, { id: "notify", label: "Notify reviewers" }),',
      '  createElement(CheckboxGroup, { legend: "Reviewers", options: [{ value: "owner", label: "Owner" }] }),',
      '  createElement(Dialog, { title: "Confirm decision" }, "This action records the decision."),',
      '  createElement(FormField, { id: "reason", label: "Reason" }, createElement("input")),',
      '  createElement(Menu, { label: "More actions", items: [{ id: "archive", label: "Archive" }] }),',
      '  createElement(Panel, { heading: "Decision context" }, "Current evidence is ready."),',
      '  createElement(RadioGroup, { legend: "Decision", defaultValue: "approve", options: [{ value: "approve", label: "Approve" }] }),',
      '  createElement(SelectField, { id: "priority", label: "Priority", defaultValue: "high", options: [{ value: "high", label: "High" }] }),',
      '  createElement(StatusMessage, null, "Ready for review."),',
      '  createElement(Table, { caption: "Review queue", columns: [{ key: "item", header: "Item", rowHeader: true }], rows: [{ id: "policy", item: "Policy" }] }),',
      '  createElement(Tabs, { label: "Review sections", items: [{ value: "summary", label: "Summary", panel: "Summary content" }] }),',
      '  createElement(TextArea, { id: "notes", label: "Notes", defaultValue: "Ready" }),',
      '  createElement(TextField, { id: "policy", label: "Policy", defaultValue: "Review" }),',
      '  createElement(Toggle, { id: "approval", label: "Require approval" }),',
      '];',
      'const html = renderToStaticMarkup(createElement(React.Fragment, null, ...components));',
      'const expectedComponentIds = ["action_button", "action_group", "alert", "card", "checkbox_field", "checkbox_group", "dialog", "form_field", "menu", "panel", "radio_group", "select_field", "status_message", "table", "tabs", "text_area", "text_field", "toggle"];',
      'for (const id of expectedComponentIds) if (!html.includes(`data-jk-component="${id}"`)) throw new Error(`missing ${id}`);',
      'console.log(React.version);',
    ].join("\n"),
  );
  const resolvedReactVersion = run(
    process.execPath,
    [path.join(tempRoot, "react-check.mjs")],
    { cwd: tempRoot },
  ).trim();
  assert.equal(resolvedReactVersion, "19.2.6");

  const adapterBundle = await buildWithEsbuild({
    stdin: {
      contents: 'export * from "judgmentkit/react";',
      resolveDir: tempRoot,
      sourcefile: "consumer-entry.mjs",
      loader: "js",
    },
    bundle: true,
    write: false,
    metafile: true,
    platform: "browser",
    format: "esm",
    external: ["react", "react-dom"],
    logLevel: "silent",
  });
  const adapterInputs = Object.keys(adapterBundle.metafile.inputs);
  assert.ok(
    adapterInputs.some((input) => input.endsWith("src/react/index.mjs")),
  );
  assert.equal(
    adapterInputs.some((input) => /node_modules[\\/]react(?:-dom)?[\\/]/.test(input)),
    false,
  );

  const cssBundle = await buildWithEsbuild({
    entryPoints: [path.join(packageRoot, "src", "react", "styles.css")],
    bundle: true,
    write: false,
    logLevel: "silent",
  });
  assert.ok(cssBundle.outputFiles[0].text.includes(".jk-action-button"));

  console.log("component package surface tests passed");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
