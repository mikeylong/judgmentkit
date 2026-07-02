#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { JUDGMENTKIT_MCP_TOOL_NAMES } from "./install-mcp.mjs";
import { validateParsed } from "./capture-model-ui-matrix.mjs";
import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  LEGACY_ALIASES,
} from "./model-ui-use-cases.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_BASE_URL = "https://judgmentkit.ai";
const PUBLIC_MCP_ROUTES = ["/mcp", "/mcp/"];
const PUBLIC_MCP_MAX_POST_BODY_BYTES = 128 * 1024;
const REDIRECT_HOSTS = [
  ["judgmentkit.design", "https://judgmentkit.design/docs/"],
  ["www.judgmentkit.design", "https://www.judgmentkit.design/examples/"],
  ["judgmentkit.com", "https://judgmentkit.com/install"],
  ["www.judgmentkit.com", "https://www.judgmentkit.com/mcp"],
];
const OLD_FRAMING = [
  "resource bundle",
  "workflow bundle",
  "MCP-first product",
  "get_workflow_bundle",
  "list_resources",
  "resolve_related",
  "judgmentkit2",
  "JudgmentKit 2",
  "judgmentkit-2",
];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function matrixCellCount(manifest) {
  return (manifest.comparison_rows ?? []).reduce(
    (total, row) => total + (row.cells?.length ?? 0),
    0,
  );
}

function assertDiagnosticCandidatesExcluded(manifest, label) {
  assert.ok(
    Array.isArray(manifest.diagnostic_candidates),
    `${label} manifest should expose diagnostic_candidates`,
  );

  for (const candidate of manifest.diagnostic_candidates) {
    assert.equal(candidate.release_evidence_status, "diagnostic_only");
    assert.equal(candidate.artifact_path ?? null, null);
    assert.equal(candidate.screenshot_path ?? null, null);
    assert.equal(candidate.next_agent_action, "repair_and_resubmit");
    assert.equal(
      (manifest.artifacts ?? []).some((artifact) => artifact.id === candidate.id),
      false,
      `${candidate.id} should not also be an accepted artifact`,
    );
  }

  const diagnosticCellIds = (manifest.comparison_rows ?? [])
    .flatMap((row) => row.cells ?? [])
    .filter((cell) => cell.release_evidence_status === "diagnostic_only")
    .map((cell) => cell.diagnostic_candidate_id)
    .filter(Boolean)
    .sort();
  const diagnosticCandidateIds = (manifest.diagnostic_candidates ?? [])
    .map((candidate) => candidate.id)
    .sort();
  assert.deepEqual(
    diagnosticCandidateIds,
    diagnosticCellIds,
    `${label} diagnostic_candidates should exactly match diagnostic matrix cells`,
  );
}

function assertArtifactDesignSystemMetadata(artifact, label) {
  if (artifact.design_system_mode === "material_ui") {
    assert.equal(artifact.design_system_name, "Material UI", `${label} should name Material UI`);
    assert.equal(artifact.design_system_package, "@mui/material", `${label} should name @mui/material`);
    assert.equal(artifact.design_system_render_mode, "static-ssr", `${label} should name static SSR rendering`);
    return;
  }

  if (artifact.judgmentkit_mode === "with_judgmentkit") {
    assert.equal(artifact.design_system_name, "JudgmentKit", `${label} should name the active JudgmentKit default source`);
    assert.equal(artifact.design_system_package, "judgmentkit", `${label} should name the JudgmentKit package`);
    assert.equal(artifact.design_system_render_mode, "static-html", `${label} should name static HTML rendering`);
    return;
  }

  assert.equal(artifact.design_system_name ?? null, null, `${label} should not name a design system`);
  assert.equal(artifact.design_system_package ?? null, null, `${label} should not name a design-system package`);
  assert.equal(artifact.design_system_render_mode ?? null, null, `${label} should not name a design-system render mode`);
}

function assertAcceptedCapturePassesCurrentValidation(capture, artifact, label) {
  validateParsed(capture.parsed, {
    ...artifact,
    artifact_id: artifact.id,
    render_mode: capture.render_mode,
    judgmentkit_mode: artifact.judgmentkit_mode,
    design_system_mode: artifact.design_system_mode,
  });

  assert.equal(
    artifact.capture_validation?.status,
    "passed",
    `${label} manifest should record passed current capture validation`,
  );
  assert.deepEqual(
    artifact.capture_validation?.failed_checks ?? null,
    [],
    `${label} manifest should not record capture validation failures`,
  );
}

function readModelUiProvenance(html, label) {
  const match = String(html).match(
    /<script type="application\/json" id="model-ui-provenance">([\s\S]*?)<\/script>/,
  );
  assert.ok(match, `${label} should include model UI provenance`);
  return JSON.parse(match[1]);
}

async function assertRouteNotPublic(baseUrl, route, label, { bytes = false } = {}) {
  const result = bytes
    ? await fetchBytes(baseUrl, route, { expectOk: false })
    : await fetchText(baseUrl, route, { expectOk: false });

  assert.equal(
    result.response.ok,
    false,
    `${label} should not be public at ${route}`,
  );
}

async function assertDiagnosticRoutesNotPublic(baseUrl, useCaseBaseRoute, manifest, label) {
  const diagnosticIds = new Set([
    ...(manifest.diagnostic_candidates ?? []).map((candidate) => candidate.id),
    ...(manifest.comparison_rows ?? [])
      .flatMap((row) => row.cells ?? [])
      .filter((cell) => cell.release_evidence_status === "diagnostic_only")
      .map((cell) => cell.diagnostic_candidate_id)
      .filter(Boolean),
  ]);

  for (const id of diagnosticIds) {
    await assertRouteNotPublic(
      baseUrl,
      `${useCaseBaseRoute}artifacts/${id}.html`,
      `${label}/${id} diagnostic artifact`,
    );
    await assertRouteNotPublic(
      baseUrl,
      `${useCaseBaseRoute}screenshots/${id}.png`,
      `${label}/${id} diagnostic screenshot`,
      { bytes: true },
    );
  }
}

async function assertInactiveLegacyAliasesNotPublic(baseUrl, useCaseBaseRoute, manifest) {
  if (manifest.use_case_id !== "refund-system-map") return;
  const activeAliasIds = new Set((manifest.legacy_aliases ?? []).map((alias) => alias.id));

  for (const alias of LEGACY_ALIASES) {
    if (activeAliasIds.has(alias.id)) continue;
    await assertRouteNotPublic(
      baseUrl,
      `${useCaseBaseRoute}${alias.artifact_path}`,
      `inactive legacy alias ${alias.id} artifact`,
    );
    await assertRouteNotPublic(
      baseUrl,
      `${useCaseBaseRoute}${alias.screenshot_path}`,
      `inactive legacy alias ${alias.id} screenshot`,
      { bytes: true },
    );
    if (alias.capture_file) {
      await assertRouteNotPublic(
        baseUrl,
        `${useCaseBaseRoute}${alias.capture_file}`,
        `inactive legacy alias ${alias.id} capture`,
      );
    }
  }
}

async function verifyLegacyAlias(baseUrl, useCaseBaseRoute, manifest, alias) {
  const canonical = (manifest.artifacts ?? []).find(
    (artifact) => artifact.id === alias.canonical_id,
  );
  assert.ok(
    canonical,
    `${manifest.use_case_id}/${alias.id} legacy alias should point to an accepted canonical artifact`,
  );

  const artifactRoute = `${useCaseBaseRoute}${alias.artifact_path}`;
  const aliasPage = await fetchText(baseUrl, artifactRoute);
  const provenance = readModelUiProvenance(aliasPage.text, artifactRoute);
  assert.equal(provenance.artifact_id, alias.id);
  assert.equal(provenance.canonical_artifact_id, alias.canonical_id);
  assert.equal(provenance.compatibility_alias, true);
  assert.equal(provenance.artifact_path, alias.artifact_path);
  assert.equal(provenance.screenshot_path, alias.screenshot_path);
  assert.equal(provenance.source_context_sha256, canonical.source_context_sha256);
  assert.equal(
    provenance.current_source_context_sha256,
    canonical.current_source_context_sha256,
  );
  assert.equal(provenance.source_context_status, canonical.source_context_status);

  const screenshotRoute = `${useCaseBaseRoute}${alias.screenshot_path}`;
  const screenshotResponse = await fetchBytes(baseUrl, screenshotRoute);
  assert.equal(
    screenshotResponse.bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
    true,
    `${alias.id} legacy screenshot should be a PNG`,
  );

  let captureRoute = null;
  if (alias.capture_file) {
    assert.ok(canonical.capture_file, `${alias.id} alias capture should have a canonical capture`);
    captureRoute = `${useCaseBaseRoute}${alias.capture_file}`;
    const canonicalCaptureRoute = `${useCaseBaseRoute}${canonical.capture_file}`;
    const aliasCapture = JSON.parse((await fetchText(baseUrl, captureRoute)).text);
    const canonicalCapture = JSON.parse((await fetchText(baseUrl, canonicalCaptureRoute)).text);
    assert.equal(aliasCapture.artifact_id, alias.id);
    assert.equal(aliasCapture.canonical_artifact_id, alias.canonical_id);
    assert.equal(aliasCapture.compatibility_alias, true);
    assert.equal(aliasCapture.source_context_sha256, canonicalCapture.source_context_sha256);
    assert.equal(
      aliasCapture.current_source_context_sha256,
      canonicalCapture.current_source_context_sha256,
    );
    assert.equal(
      aliasCapture.accepted_source_context_sha256,
      canonicalCapture.accepted_source_context_sha256,
    );
    assert.equal(aliasCapture.source_context_status, canonicalCapture.source_context_status);
  }

  return { artifactRoute, screenshotRoute, captureRoute };
}

export function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    skipInstall: false,
    skipRedirects: false,
    skipAnalyticsScript: false,
    expectRemoteMcp: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--base-url") {
      options.baseUrl = argv[++index];
    } else if (arg === "--skip-install") {
      options.skipInstall = true;
    } else if (arg === "--skip-redirects") {
      options.skipRedirects = true;
    } else if (arg === "--skip-analytics-script") {
      options.skipAnalyticsScript = true;
    } else if (arg === "--expect-remote-mcp") {
      options.expectRemoteMcp = true;
    } else if (arg === "--expect-metadata-only") {
      options.expectRemoteMcp = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }

  if (typeof options.baseUrl !== "string" || options.baseUrl.trim().length === 0) {
    throw new Error("--base-url requires a non-empty value.");
  }

  return options;
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node scripts/verify-public-release.mjs [--base-url <url>] [--skip-install] [--skip-redirects] [--skip-analytics-script] [--expect-metadata-only]",
      "",
      "By default the verifier expects /mcp and /mcp/ to work as hosted MCP Streamable HTTP endpoints.",
      "",
    ].join("\n"),
  );
}

function urlFor(baseUrl, route) {
  return new URL(route, baseUrl).toString();
}

async function readPackageVersion() {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(PROJECT_ROOT, "package.json"), "utf8"),
  );

  assert.equal(typeof packageJson.version, "string", "package.json must declare a version");
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/, "package.json version must be semver");

  return packageJson.version;
}

async function fetchText(baseUrl, route, options = {}) {
  const response = await fetch(urlFor(baseUrl, route), {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
    redirect: options.redirect ?? "follow",
  });
  const text = await response.text();

  if (options.expectStatus !== undefined) {
    assert.equal(response.status, options.expectStatus, `${route} should return ${options.expectStatus}`);
  } else if (options.expectOk !== false) {
    assert.equal(response.ok, true, `${route} should return a 2xx response, got ${response.status}`);
  }

  return { response, text };
}

async function fetchBytes(baseUrl, route, options = {}) {
  const response = await fetch(urlFor(baseUrl, route), {
    method: options.method ?? "GET",
    headers: options.headers,
    redirect: options.redirect ?? "follow",
  });
  const bytes = Buffer.from(await response.arrayBuffer());

  if (options.expectStatus !== undefined) {
    assert.equal(response.status, options.expectStatus, `${route} should return ${options.expectStatus}`);
  } else if (options.expectOk !== false) {
    assert.equal(response.ok, true, `${route} should return a 2xx response, got ${response.status}`);
  }

  return { response, bytes };
}

function assertIncludes(text, needles, label) {
  for (const needle of needles) {
    assert.ok(text.includes(needle), `${label} should include ${needle}`);
  }
}

function assertExcludes(text, needles, label) {
  for (const needle of needles) {
    assert.equal(text.includes(needle), false, `${label} should not include ${needle}`);
  }
}

function getAnalyticsScriptSrc(text, label) {
  assertIncludes(
    text,
    [
      "window.va = window.va || function",
      'data-sdkn="@vercel/analytics"',
      'data-sdkv="2.0.1"',
    ],
    `${label} analytics`,
  );

  for (const [scriptTag] of text.matchAll(/<script\b[^>]*><\/script>/g)) {
    if (!scriptTag.includes('data-sdkn="@vercel/analytics"')) {
      continue;
    }

    const sourceMatch = scriptTag.match(/\bsrc="([^"]+)"/);
    assert.ok(sourceMatch, `${label} Vercel Analytics script should include a src`);
    return sourceMatch[1];
  }

  assert.fail(`${label} should include the Vercel Analytics script`);
}

async function verifyAnalyticsScript(baseUrl, scriptSrc) {
  assert.ok(
    scriptSrc.startsWith("/") || /^(?:[a-z]+:)?\/\//i.test(scriptSrc),
    `Vercel Analytics script src should be root-relative or absolute, got ${scriptSrc}`,
  );
  const response = await fetch(new URL(scriptSrc, baseUrl));

  assert.equal(
    response.ok,
    true,
    `Vercel Analytics script should load from ${scriptSrc}, got ${response.status}. Enable Web Analytics in Vercel before running production verification.`,
  );

  return {
    script_src: scriptSrc,
    status: response.status,
  };
}

async function verifyEvalArchive(baseUrl, analyticsScriptSrc) {
  const index = await fetchText(baseUrl, "/evals/");
  assert.equal(getAnalyticsScriptSrc(index.text, "eval archive"), analyticsScriptSrc);
  assertIncludes(
    index.text,
    [
      "Evaluation evidence",
      "<h1>Evals</h1>",
      "Latest run",
      "Catalog JSON",
    ],
    "eval archive",
  );
  assertExcludes(index.text, ["/examples/evals/"], "eval archive");

  const catalogResponse = await fetchText(baseUrl, "/evals/index.json");
  const catalog = JSON.parse(catalogResponse.text);
  assert.equal(catalog.catalog_id, "judgmentkit-ui-generation-eval-runs");
  assert.ok(catalog.latest, "eval catalog should include latest run");
  assert.ok(Array.isArray(catalog.runs), "eval catalog should include runs");
  assert.ok(catalog.runs.length > 0, "eval catalog should include at least one run");

  const latestHtmlRoute = `/evals/${catalog.latest.html_report}`;
  const latestJsonRoute = `/evals/${catalog.latest.json_report}`;
  const latestHtml = await fetchText(baseUrl, latestHtmlRoute);
  assert.equal(getAnalyticsScriptSrc(latestHtml.text, latestHtmlRoute), analyticsScriptSrc);
  assertIncludes(
    latestHtml.text,
    [
      "JudgmentKit UI-Generation Eval",
      "not a statistically powered benchmark",
      "Claim level",
      "MCP release",
      "Visual evidence",
      "JSON report",
    ],
    "latest eval report",
  );

  const latestJson = JSON.parse((await fetchText(baseUrl, latestJsonRoute)).text);
  assert.equal(latestJson.eval_id, "judgmentkit-ui-generation-paired-artifact-v1");
  assert.equal(latestJson.run.html_report, catalog.latest.html_report);
  assert.equal(latestJson.run.json_report, catalog.latest.json_report);
  assert.equal(latestJson.visual_evidence.capture_engine, "chrome_devtools_protocol");
  const latestScreenshotPath = latestJson.results[0].variants[0].screenshots[0].path;
  assert.ok(latestScreenshotPath.endsWith(".png"), "latest eval JSON should include screenshot paths");
  const latestScreenshotRoute = `/evals/${latestScreenshotPath}`;
  await fetchText(baseUrl, latestScreenshotRoute);

  await fetchText(baseUrl, "/examples/evals/");
  await fetchText(baseUrl, "/examples/evals/index.json");
  await fetchText(baseUrl, `/examples/evals/${catalog.latest.html_report}`);
  await fetchText(baseUrl, `/examples/evals/${catalog.latest.json_report}`);
  await fetchText(baseUrl, `/examples/evals/${latestScreenshotPath}`);

  return {
    index_route: "/evals/",
    catalog_route: "/evals/index.json",
    latest_html_route: latestHtmlRoute,
    latest_json_route: latestJsonRoute,
    latest_screenshot_route: latestScreenshotRoute,
    compatibility_index_route: "/examples/evals/",
  };
}

async function verifyModelUiUseCases(baseUrl, analyticsScriptSrc) {
  const indexRoute = "/examples/model-ui/index.json";
  const index = JSON.parse((await fetchText(baseUrl, indexRoute)).text);
  assert.equal(index.default_use_case_id, "refund-system-map");
  assert.equal(index.use_cases?.length, 4, "model UI index should expose four use cases");

  const checked = [indexRoute];
  const captureRoutes = [];
  const screenshotRoutes = [];

  for (const useCase of index.use_cases) {
    assert.ok(useCase.id, "model UI use case should include id");
    assert.ok(useCase.label, `${useCase.id} should include label`);
    assert.ok(useCase.activity_summary, `${useCase.id} should include activity_summary`);
    assert.ok(useCase.index_path, `${useCase.id} should include index_path`);
    assert.ok(useCase.manifest_path, `${useCase.id} should include manifest_path`);

    const useCaseRoute = `/${useCase.index_path}`;
    const manifestRoute = `/${useCase.manifest_path}`;
    const useCasePage = await fetchText(baseUrl, useCaseRoute);
    assert.equal(getAnalyticsScriptSrc(useCasePage.text, useCaseRoute), analyticsScriptSrc);
    assertIncludes(
      useCasePage.text,
      [
        useCase.label,
        "model UI generation matrix",
        "Raw brief",
        "JudgmentKit skill context",
        "Material UI only",
        "JudgmentKit skill + Material UI",
      ],
      useCaseRoute,
    );
    checked.push(useCaseRoute);

    const manifest = JSON.parse((await fetchText(baseUrl, manifestRoute)).text);
    checked.push(manifestRoute);
    assert.equal(manifest.use_case_id, useCase.id);
    assert.equal(manifest.use_case_label, useCase.label);
    assert.equal(manifest.design_system_name, "Material UI");
    assert.equal(manifest.design_system_package, "@mui/material");
    assert.equal(manifest.design_system_render_mode, "static-ssr");
    assert.ok(
      manifest.generation_policy.includes("Material UI"),
      `${useCase.id} manifest should describe the Material UI adapter`,
    );
    assert.equal(
      manifest.comparison_rows?.length,
      COMPARISON_ROWS.length,
      `${useCase.id} manifest should expose three comparison rows`,
    );
    assert.equal(
      manifest.comparison_columns?.length,
      COMPARISON_COLUMNS.length,
      `${useCase.id} manifest should expose four comparison columns`,
    );
    assert.equal(
      matrixCellCount(manifest),
      COMPARISON_ROWS.length * COMPARISON_COLUMNS.length,
      `${useCase.id} manifest should expose twelve matrix cells`,
    );
    assertDiagnosticCandidatesExcluded(manifest, useCase.id);

    const useCaseBaseRoute = manifestRoute.replace(/manifest\.json$/, "");
    await assertDiagnosticRoutesNotPublic(baseUrl, useCaseBaseRoute, manifest, useCase.id);
    await assertInactiveLegacyAliasesNotPublic(baseUrl, useCaseBaseRoute, manifest);

    for (const artifact of manifest.artifacts) {
      assert.equal(artifact.release_evidence_status, "artifact");
      assert.equal(artifact.implementation_review_status, "passed");
      assert.equal(artifact.next_agent_action, "accept");
      assert.equal(artifact.candidate_artifact_status, "accepted_artifact");
      assert.equal(artifact.design_system_acceptance_status, "passed");
      assert.deepEqual(artifact.failed_checks ?? [], []);
      assert.ok(artifact.screenshot_path, `${artifact.id} should include a screenshot_path`);
      assert.ok(artifact.approach_title, `${artifact.id} should include an approach_title`);
      assert.ok(artifact.approach_caption, `${artifact.id} should include an approach_caption`);
      assert.ok(artifact.row_id, `${artifact.id} should include row_id`);
      assert.ok(artifact.column_id, `${artifact.id} should include column_id`);
      assert.ok(artifact.context_included, `${artifact.id} should include context_included`);
      assert.ok(artifact.render_source, `${artifact.id} should include render_source`);
      assert.equal(artifact.use_case_id, useCase.id, `${artifact.id} should record use_case_id`);
      if (artifact.judgmentkit_mode === "no_judgmentkit") {
        assert.equal(
          artifact.context_included.reviewed_handoff,
          false,
          `${artifact.id} should not include reviewed handoff context`,
        );
        assert.equal(
          artifact.context_included.frontend_skill_context,
          false,
          `${artifact.id} should not include frontend skill context`,
        );
      } else {
        assert.equal(artifact.frontend_context_status, "ready_for_frontend_implementation");
        assert.equal(artifact.frontend_skill_context_status, "ready");
        assert.equal(artifact.frontend_skill_context?.source_skill, "frontend-ui-implementation");
        assert.equal(artifact.frontend_skill_context?.raw_skill_exposed, false);
      }
      assertArtifactDesignSystemMetadata(artifact, `${useCase.id}/${artifact.id}`);
      if (artifact.design_system_mode === "material_ui") {
        assert.equal(
          artifact.context_included.material_ui_adapter,
          true,
          `${artifact.id} should include Material UI context`,
        );
      }
      if (artifact.row_id === "gpt55-xhigh-codex") {
        assert.equal(artifact.reasoning_effort, "xhigh", `${artifact.id} should record xhigh`);
      }

      const artifactRoute = `${useCaseBaseRoute}${artifact.artifact_path}`;
      const artifactPage = await fetchText(baseUrl, artifactRoute);
      assert.equal(getAnalyticsScriptSrc(artifactPage.text, artifactRoute), analyticsScriptSrc);
      checked.push(artifactRoute);

      const screenshotRoute = `${useCaseBaseRoute}${artifact.screenshot_path}`;
      const screenshotResponse = await fetchBytes(baseUrl, screenshotRoute);
      assert.equal(
        screenshotResponse.bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
        true,
        `${artifact.id} screenshot should be a PNG`,
      );
      screenshotRoutes.push(screenshotRoute);

      if (artifact.generation_source !== "captured_model_output") {
        continue;
      }

      assert.equal(
        artifact.capture_provenance.status,
        "captured",
        `${artifact.id} should be backed by a committed model capture transcript`,
      );
      assert.ok(artifact.capture_file, `${artifact.id} should include a capture_file`);
      const captureRoute = `${useCaseBaseRoute}${artifact.capture_file}`;
      const capture = JSON.parse((await fetchText(baseUrl, captureRoute)).text);

      assert.equal(capture.artifact_id, artifact.id);
      assert.equal(capture.use_case_id, useCase.id);
      assert.equal(capture.model_label, artifact.model_label);
      assert.equal(capture.row_id, artifact.row_id);
      assert.equal(capture.column_id, artifact.column_id);
      assert.equal(capture.judgmentkit_mode, artifact.judgmentkit_mode);
      assert.equal(capture.design_system_mode, artifact.design_system_mode);
      assert.deepEqual(capture.context_included, artifact.context_included);
      assert.equal(capture.frontend_context_status, artifact.frontend_context_status);
      assert.equal(capture.frontend_skill_context_status, artifact.frontend_skill_context_status);
      assert.deepEqual(capture.frontend_skill_context, artifact.frontend_skill_context);
      assert.equal(capture.source_context_sha256, artifact.capture_provenance.source_context_sha256);
      assert.ok(
        ["current", "legacy_accepted"].includes(artifact.capture_provenance.source_context_status),
        `${artifact.id} capture provenance should record source context freshness`,
      );
      assert.equal(
        artifact.source_context_status,
        artifact.capture_provenance.source_context_status,
        `${artifact.id} manifest should mirror capture provenance context status`,
      );
      assert.equal(
        artifact.capture_provenance.captured_source_context_sha256,
        capture.source_context_sha256,
        `${artifact.id} should record the captured source context hash`,
      );
      assert.equal(
        artifact.capture_provenance.accepted_source_context_sha256,
        artifact.source_context_sha256,
        `${artifact.id} should record the accepted source context hash`,
      );
      assert.equal(
        capture.accepted_source_context_sha256 ?? capture.source_context_sha256,
        artifact.source_context_sha256,
        `${artifact.id} capture should record accepted source context hash`,
      );
      assert.equal(
        capture.current_source_context_sha256 ?? artifact.current_source_context_sha256,
        artifact.current_source_context_sha256,
        `${artifact.id} capture should record current source context hash`,
      );
      if (artifact.capture_provenance.source_context_status === "legacy_accepted") {
        assert.notEqual(
          artifact.current_source_context_sha256,
          artifact.source_context_sha256,
          `${artifact.id} legacy capture should distinguish current and accepted context hashes`,
        );
        assert.match(
          artifact.capture_provenance.source_context_notes,
          /legacy capture/i,
          `${artifact.id} legacy capture should explain the context status`,
        );
      } else {
        assert.equal(
          artifact.current_source_context_sha256,
          artifact.source_context_sha256,
          `${artifact.id} current capture should use the current context hash`,
        );
      }
      assert.ok(capture.prompt_sha256, `${artifact.id} capture should include prompt_sha256`);
      assert.ok(capture.raw_response_sha256, `${artifact.id} capture should include raw_response_sha256`);
      if (artifact.row_id === "gpt55-xhigh-codex") {
        assert.equal(capture.reasoning_effort, "xhigh", `${artifact.id} capture should record xhigh`);
      }
      if (artifact.design_system_mode === "material_ui") {
        assert.equal(capture.design_system_name, "Material UI");
        assert.equal(capture.design_system_package, "@mui/material");
        assert.equal(capture.design_system_render_mode, "static-ssr");
        assert.equal(capture.render_mode, "material_ui");
        assert.ok(capture.parsed?.surface, `${artifact.id} capture should include surface data`);
      } else {
        assert.equal(capture.render_mode, "html");
        assert.ok(
          capture.parsed?.html?.includes("data-primary-surface"),
          `${artifact.id} capture should include parsed product surface HTML`,
        );
        assert.ok(capture.parsed?.css?.trim(), `${artifact.id} capture should include parsed CSS`);
      }
      assert.ok(capture.raw_response, `${artifact.id} capture should include raw_response`);
      assertAcceptedCapturePassesCurrentValidation(
        capture,
        artifact,
        `${useCase.id}/${artifact.id}`,
      );
      captureRoutes.push(captureRoute);
    }

    for (const alias of manifest.legacy_aliases ?? []) {
      const { artifactRoute, screenshotRoute, captureRoute } = await verifyLegacyAlias(
        baseUrl,
        useCaseBaseRoute,
        manifest,
        alias,
      );
      checked.push(artifactRoute);
      screenshotRoutes.push(screenshotRoute);
      if (captureRoute) {
        captureRoutes.push(captureRoute);
      }
    }

    await fetchText(baseUrl, `${useCaseBaseRoute}reviewed-handoff.fixture.json`);
    await fetchText(baseUrl, `${useCaseBaseRoute}design-system-adapter.json`);
    checked.push(
      `${useCaseBaseRoute}reviewed-handoff.fixture.json`,
      `${useCaseBaseRoute}design-system-adapter.json`,
    );
  }

  return {
    index_route: indexRoute,
    use_cases: index.use_cases.map((useCase) => useCase.id),
    checked,
    capture_routes: captureRoutes,
    screenshot_routes: screenshotRoutes,
  };
}

async function verifyPublicRoutes(baseUrl, options = {}) {
  const home = await fetchText(baseUrl, "/");
  const analyticsScriptSrc = getAnalyticsScriptSrc(home.text, "homepage");
  assertIncludes(
    home.text,
    [
      "Judgment before generation.",
      "JudgmentKit catches implementation-shaped UI before it ships",
      "repair path grounded in the user's real work",
      '<link rel="canonical" href="https://judgmentkit.ai/">',
      '<link rel="icon" href="/favicon.svg"',
      '<meta property="og:site_name" content="JudgmentKit">',
    ],
    "homepage",
  );
  assertExcludes(home.text, OLD_FRAMING, "homepage");

  const docs = await fetchText(baseUrl, "/docs/");
  assert.equal(getAnalyticsScriptSrc(docs.text, "docs"), analyticsScriptSrc);
  assertIncludes(
    docs.text,
    [
      "curl -fsSL https://judgmentkit.ai/install | bash",
      "bash -s -- --client claude",
      "bash -s -- --client cursor",
      "https://judgmentkit.ai/mcp",
      "hosted Streamable HTTP endpoint",
      "create_activity_model_review",
      "recommend_surface_types",
      "review_ui_workflow_candidate",
      "review_cognitive_dimensions_candidate",
      "create_ui_generation_handoff",
      "create_ui_implementation_contract",
      "review_ui_implementation_candidate",
      "create_frontend_generation_context",
      "create_frontend_implementation_skill_context",
      "operator-review-ui",
    ],
    "docs",
  );

  const examples = await fetchText(baseUrl, "/examples/");
  assert.equal(getAnalyticsScriptSrc(examples.text, "examples"), analyticsScriptSrc);
  assertIncludes(
    examples.text,
    [
      "Model UI generation matrix",
      "<h1>Examples</h1>",
      "These matrix examples compare how the same activity changes across raw brief",
      "Gemma 4 (local LLM)",
      "GPT-5.5",
      "Support refund triage",
      "Field service dispatch",
      "Clinical intake review",
      "B2B renewal risk review",
      "data-model-ui-examples",
      "model-ui-use-case-select",
      "data-use-case-select",
      "useCaseId",
      "field-service-dispatch",
      "/examples/model-ui/refund-system-map/index.html",
      "/examples/model-ui/refund-system-map/manifest.json",
    ],
    "examples",
  );
  assertExcludes(
    examples.text,
    [
      "Static artifacts",
      "captured-fixture model UI paths",
      "Open default matrix",
      "Use-case index",
      "<h2>Model UI generation matrix</h2>",
      ">Close</button>",
      "pill-link example-gallery-modal-close",
      ">Open matrix</a>",
      ">Manifest</a>",
      "One-shot proof",
      "Refund triage comparison",
      "Dinner playlist comparison",
      "examples-rail",
      "example-menu",
      "model-ui-use-case-rail",
      "model-ui-use-case-menu",
      "model-ui-use-case-button",
      "<summary>Use cases</summary>",
      "model-ui-use-case-tabs",
      "data-example-id",
      "/examples/one-shot-demo.html",
      "/examples/comparison/refund/version-a.html",
      "/examples/comparison/refund/version-b.html",
      "/examples/comparison/music/version-a.html",
      "/examples/comparison/music/version-b.html",
      "/examples/comparison/music/facilitator-scorecard.md",
      "raw_brief_baseline",
      "judgmentkit_handoff",
      "UI generation eval report",
      "/examples/evals/",
    ],
    "examples",
  );

  const evalArchive = await verifyEvalArchive(baseUrl, analyticsScriptSrc);
  const modelUiArchive = await verifyModelUiUseCases(baseUrl, analyticsScriptSrc);

  await fetchText(baseUrl, "/favicon.svg");

  for (const artifactRoute of [
    "/examples/one-shot-demo.html",
    "/examples/comparison/refund/version-a.html",
    "/examples/comparison/refund/version-b.html",
    "/examples/model-ui/refund-system-map/index.html",
    "/examples/comparison/music/version-a.html",
    "/examples/comparison/music/version-b.html",
  ]) {
    const artifact = await fetchText(baseUrl, artifactRoute);
    assert.equal(getAnalyticsScriptSrc(artifact.text, artifactRoute), analyticsScriptSrc);
  }

  await fetchText(baseUrl, "/examples/comparison/music/facilitator-scorecard.md");
  const modelUiManifestResponse = await fetchText(
    baseUrl,
    "/examples/model-ui/refund-system-map/manifest.json",
  );
  const modelUiManifest = JSON.parse(modelUiManifestResponse.text);
  assert.equal(modelUiManifest.design_system_name, "Material UI");
  assert.equal(modelUiManifest.design_system_package, "@mui/material");
  assert.equal(modelUiManifest.design_system_render_mode, "static-ssr");
  assert.ok(
    modelUiManifest.generation_policy.includes("Material UI"),
    "model UI manifest should describe the Material UI adapter",
  );
  assert.equal(
    modelUiManifest.comparison_rows?.length,
    3,
    "model UI manifest should expose three comparison rows",
  );
  assert.equal(
    modelUiManifest.comparison_columns?.length,
    4,
    "model UI manifest should expose four comparison columns",
  );
  assert.equal(
    matrixCellCount(modelUiManifest),
    12,
    "model UI manifest should expose twelve matrix cells",
  );
  assertDiagnosticCandidatesExcluded(modelUiManifest, "model UI");
  await assertDiagnosticRoutesNotPublic(
    baseUrl,
    "/examples/model-ui/refund-system-map/",
    modelUiManifest,
    "model UI",
  );
  await assertInactiveLegacyAliasesNotPublic(
    baseUrl,
    "/examples/model-ui/refund-system-map/",
    modelUiManifest,
  );
  const modelUiCaptureRoutes = [];
  const modelUiScreenshotRoutes = [];

  for (const artifact of modelUiManifest.artifacts) {
    assert.equal(artifact.release_evidence_status, "artifact");
    assert.equal(artifact.implementation_review_status, "passed");
    assert.equal(artifact.next_agent_action, "accept");
    assert.equal(artifact.candidate_artifact_status, "accepted_artifact");
    assert.equal(artifact.design_system_acceptance_status, "passed");
    assert.deepEqual(artifact.failed_checks ?? [], []);
    assert.ok(artifact.screenshot_path, `${artifact.id} should include a screenshot_path`);
    assert.ok(artifact.approach_title, `${artifact.id} should include an approach_title`);
    assert.ok(artifact.approach_caption, `${artifact.id} should include an approach_caption`);
    assert.ok(artifact.row_id, `${artifact.id} should include row_id`);
    assert.ok(artifact.column_id, `${artifact.id} should include column_id`);
    assert.ok(artifact.context_included, `${artifact.id} should include context_included`);
    assert.ok(artifact.render_source, `${artifact.id} should include render_source`);
    if (artifact.judgmentkit_mode === "no_judgmentkit") {
      assert.equal(
        artifact.context_included.reviewed_handoff,
        false,
        `${artifact.id} should not include reviewed handoff context`,
      );
      assert.equal(
        artifact.context_included.frontend_skill_context,
        false,
        `${artifact.id} should not include frontend skill context`,
      );
    } else {
      assert.equal(artifact.frontend_context_status, "ready_for_frontend_implementation");
      assert.equal(artifact.frontend_skill_context_status, "ready");
      assert.equal(artifact.frontend_skill_context?.source_skill, "frontend-ui-implementation");
      assert.equal(artifact.frontend_skill_context?.raw_skill_exposed, false);
    }
    assertArtifactDesignSystemMetadata(artifact, `model UI ${artifact.id}`);
    if (artifact.design_system_mode === "material_ui") {
      assert.equal(
        artifact.context_included.material_ui_adapter,
        true,
        `${artifact.id} should include Material UI context`,
      );
    }
    if (artifact.row_id === "gpt55-xhigh-codex") {
      assert.equal(artifact.reasoning_effort, "xhigh", `${artifact.id} should record xhigh`);
    }

    const artifactRoute = `/examples/model-ui/refund-system-map/${artifact.artifact_path}`;
    const artifactPage = await fetchText(baseUrl, artifactRoute);
    assert.equal(getAnalyticsScriptSrc(artifactPage.text, artifactRoute), analyticsScriptSrc);

    const screenshotRoute = `/examples/model-ui/refund-system-map/${artifact.screenshot_path}`;
    const screenshotResponse = await fetchBytes(baseUrl, screenshotRoute);
    assert.equal(
      screenshotResponse.bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
      true,
      `${artifact.id} screenshot should be a PNG`,
    );
    modelUiScreenshotRoutes.push(screenshotRoute);

    if (artifact.generation_source !== "captured_model_output") {
      continue;
    }

    assert.equal(
      artifact.capture_provenance.status,
      "captured",
      `${artifact.id} should be backed by a committed model capture transcript`,
    );
    assert.ok(artifact.capture_file, `${artifact.id} should include a capture_file`);
    const captureRoute = `/examples/model-ui/refund-system-map/${artifact.capture_file}`;
    const captureResponse = await fetchText(baseUrl, captureRoute);
    const capture = JSON.parse(captureResponse.text);

    assert.equal(capture.artifact_id, artifact.id);
    assert.equal(capture.model_label, artifact.model_label);
    assert.equal(capture.row_id, artifact.row_id);
    assert.equal(capture.column_id, artifact.column_id);
    assert.equal(capture.judgmentkit_mode, artifact.judgmentkit_mode);
    assert.equal(capture.design_system_mode, artifact.design_system_mode);
    assert.deepEqual(capture.context_included, artifact.context_included);
    assert.equal(capture.frontend_context_status, artifact.frontend_context_status);
    assert.equal(capture.frontend_skill_context_status, artifact.frontend_skill_context_status);
    assert.deepEqual(capture.frontend_skill_context, artifact.frontend_skill_context);
    assert.equal(capture.source_context_sha256, artifact.capture_provenance.source_context_sha256);
    assert.ok(
      ["current", "legacy_accepted"].includes(artifact.capture_provenance.source_context_status),
      `${artifact.id} capture provenance should record source context freshness`,
    );
    assert.equal(
      artifact.source_context_status,
      artifact.capture_provenance.source_context_status,
      `${artifact.id} manifest should mirror capture provenance context status`,
    );
    assert.equal(
      artifact.capture_provenance.captured_source_context_sha256,
      capture.source_context_sha256,
      `${artifact.id} should record the captured source context hash`,
    );
    assert.equal(
      artifact.capture_provenance.accepted_source_context_sha256,
      artifact.source_context_sha256,
      `${artifact.id} should record the accepted source context hash`,
    );
    assert.equal(
      capture.accepted_source_context_sha256 ?? capture.source_context_sha256,
      artifact.source_context_sha256,
      `${artifact.id} capture should record accepted source context hash`,
    );
    assert.equal(
      capture.current_source_context_sha256 ?? artifact.current_source_context_sha256,
      artifact.current_source_context_sha256,
      `${artifact.id} capture should record current source context hash`,
    );
    if (artifact.capture_provenance.source_context_status === "legacy_accepted") {
      assert.notEqual(
        artifact.current_source_context_sha256,
        artifact.source_context_sha256,
        `${artifact.id} legacy capture should distinguish current and accepted context hashes`,
      );
      assert.match(
        artifact.capture_provenance.source_context_notes,
        /legacy capture/i,
        `${artifact.id} legacy capture should explain the context status`,
      );
    } else {
      assert.equal(
        artifact.current_source_context_sha256,
        artifact.source_context_sha256,
        `${artifact.id} current capture should use the current context hash`,
      );
    }
    assert.ok(capture.prompt_sha256, `${artifact.id} capture should include prompt_sha256`);
    assert.ok(capture.raw_response_sha256, `${artifact.id} capture should include raw_response_sha256`);
    if (artifact.row_id === "gpt55-xhigh-codex") {
      assert.equal(capture.reasoning_effort, "xhigh", `${artifact.id} capture should record xhigh`);
    }
    if (artifact.design_system_mode === "material_ui") {
      assert.equal(capture.design_system_name, "Material UI");
      assert.equal(capture.design_system_package, "@mui/material");
      assert.equal(capture.design_system_render_mode, "static-ssr");
      assert.equal(capture.render_mode, "material_ui");
      assert.ok(capture.parsed?.surface, `${artifact.id} capture should include surface data`);
    } else {
      assert.equal(capture.render_mode, "html");
      assert.ok(
        capture.parsed?.html?.includes("data-primary-surface"),
        `${artifact.id} capture should include parsed product surface HTML`,
      );
      assert.ok(capture.parsed?.css?.trim(), `${artifact.id} capture should include parsed CSS`);
    }
    assert.ok(capture.raw_response, `${artifact.id} capture should include raw_response`);
    assertAcceptedCapturePassesCurrentValidation(
      capture,
      artifact,
      `model UI ${artifact.id}`,
    );

    modelUiCaptureRoutes.push(captureRoute);
  }

  for (const alias of modelUiManifest.legacy_aliases ?? []) {
    await verifyLegacyAlias(
      baseUrl,
      "/examples/model-ui/refund-system-map/",
      modelUiManifest,
      alias,
    );
  }

  await fetchText(baseUrl, "/examples/model-ui/refund-system-map/reviewed-handoff.fixture.json");
  await fetchText(baseUrl, "/examples/model-ui/refund-system-map/design-system-adapter.json");

  const install = await fetchText(baseUrl, "/install");
  assert.ok(install.text.startsWith("#!/usr/bin/env bash"), "install route should return a shell script");
  assertIncludes(
    install.text,
    [
      "node --input-type=module -",
      "DEFAULT_MCP_URL",
      "--client codex|claude|cursor",
      "createCursorConfigBlock",
      "createClaudeInstallCommand",
    ],
    "install script",
  );
  assertExcludes(install.text, ["git clone", "npm install", "mcp:stdio"], "install script");

  return {
    checked: [
      "/",
      "/docs/",
      "/examples/",
      "/favicon.svg",
      "/install",
      "/examples/one-shot-demo.html",
      "/examples/comparison/refund/version-a.html",
      "/examples/comparison/refund/version-b.html",
      "/examples/model-ui/refund-system-map/index.html",
      "/examples/model-ui/refund-system-map/manifest.json",
      "/examples/model-ui/refund-system-map/reviewed-handoff.fixture.json",
      "/examples/model-ui/refund-system-map/design-system-adapter.json",
      ...modelUiManifest.artifacts.map(
        (artifact) => `/examples/model-ui/refund-system-map/${artifact.artifact_path}`,
      ),
      ...modelUiCaptureRoutes,
      ...modelUiScreenshotRoutes,
      ...modelUiArchive.checked,
      ...modelUiArchive.capture_routes,
      ...modelUiArchive.screenshot_routes,
      "/examples/comparison/music/version-a.html",
      "/examples/comparison/music/version-b.html",
      "/examples/comparison/music/facilitator-scorecard.md",
      evalArchive.index_route,
      evalArchive.catalog_route,
      evalArchive.latest_html_route,
      evalArchive.latest_json_route,
      evalArchive.latest_screenshot_route,
    ],
    eval_archive: evalArchive,
    model_ui_archive: modelUiArchive,
    analytics: options.skipAnalyticsScript
      ? "script_fetch_skipped"
      : await verifyAnalyticsScript(baseUrl, analyticsScriptSrc),
  };
}

async function verifyMcpMetadataRoute(baseUrl, route, expectedVersion) {
  const { text } = await fetchText(baseUrl, route);
  const metadata = JSON.parse(text);
  const toolNames = metadata.capabilities.tools.map((tool) => tool.name);

  assert.equal(metadata.name, "JudgmentKit", `${route} should report the MCP server name`);
  assert.equal(metadata.version, expectedVersion, `${route} should report the package version`);
  assert.equal(metadata.transport, "streamable-http", `${route} should report the hosted transport`);
  assert.equal(metadata.public_route.role, "mcp_endpoint_and_metadata");
  assert.equal(metadata.public_route.hosted_mcp_endpoint, true);
  assert.deepEqual(toolNames, JUDGMENTKIT_MCP_TOOL_NAMES);
  assert.deepEqual(metadata.capabilities.prompts, []);

  for (const oldToolName of [
    "list_resources",
    "get_resource",
    "get_workflow_bundle",
    "get_page_markdown",
    "get_example",
    "resolve_related",
  ]) {
    assert.equal(toolNames.includes(oldToolName), false, `${route} must not expose ${oldToolName}`);
  }

  return { metadata, toolNames };
}

async function verifyMcpMetadata(baseUrl, expectedVersion) {
  const routes = [];
  let firstResult;

  for (const route of PUBLIC_MCP_ROUTES) {
    const result = await verifyMcpMetadataRoute(baseUrl, route, expectedVersion);
    firstResult ??= result;
    routes.push({
      route,
      version: result.metadata.version,
      hosted_mcp_endpoint: result.metadata.public_route.hosted_mcp_endpoint,
    });
  }

  return {
    name: firstResult.metadata.name,
    version: firstResult.metadata.version,
    transport: firstResult.metadata.transport,
    hosted_mcp_endpoint: firstResult.metadata.public_route.hosted_mcp_endpoint,
    tools: firstResult.toolNames,
    routes,
  };
}

async function verifyRedirects() {
  const results = [];

  for (const [host, url] of REDIRECT_HOSTS) {
    const response = await fetch(url, { redirect: "manual" });
    const location = response.headers.get("location") ?? "";

    assert.ok(
      [301, 302, 307, 308].includes(response.status),
      `${host} should redirect, got ${response.status}`,
    );
    assert.ok(
      location.startsWith("https://judgmentkit.ai"),
      `${host} should redirect to judgmentkit.ai, got ${location}`,
    );

    results.push({ host, status: response.status, location });
  }

  return results;
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

async function probeRemoteMcpRoute(baseUrl, route) {
  const endpointUrl = urlFor(baseUrl, route);
  const initializeBody = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: {
        name: "judgmentkit-public-release-verifier",
        version: "1.0.0",
      },
    },
  });
  const postResponse = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: initializeBody,
  });
  const postText = await postResponse.text();
  let postBody;

  try {
    postBody = JSON.parse(postText);
  } catch {
    postBody = null;
  }

  let transport;
  let client;
  let sdkSupported = false;
  let tools = [];
  let reviewStatus;
  let errorMessage = "";

  try {
    transport = new StreamableHTTPClientTransport(new URL(endpointUrl));
    client = new Client({
      name: "judgmentkit-public-url-probe",
      version: "1.0.0",
    });

    await withTimeout(client.connect(transport), 8_000, "public MCP connect");
    const toolsResponse = await withTimeout(client.listTools(), 8_000, "public MCP tools/list");
    tools = toolsResponse.tools.map((tool) => tool.name);
    const reviewResponse = await withTimeout(
      client.callTool({
        name: "create_activity_model_review",
        arguments: {
          brief:
            "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
        },
      }),
      8_000,
      "public MCP tool call",
    );
    reviewStatus = reviewResponse.structuredContent?.review_status;
    sdkSupported = true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  } finally {
    if (client) {
      await withTimeout(client.close(), 1_000, "public MCP client close").catch(() => {});
    }
    if (transport) {
      await withTimeout(transport.close(), 1_000, "public MCP close").catch(() => {});
    }
  }

  return {
    route,
    endpoint: endpointUrl,
    raw_post: {
      status: postResponse.status,
      ok: postResponse.ok,
      content_type: postResponse.headers.get("content-type"),
      jsonrpc: postBody?.jsonrpc,
      server_name: postBody?.result?.serverInfo?.name,
      server_version: postBody?.result?.serverInfo?.version,
      body_preview: postText.slice(0, 200),
    },
    sdk: {
      supported: sdkSupported,
      error: errorMessage,
      review_status: reviewStatus,
      tools,
    },
  };
}

export async function probeRemoteMcpEndpoint(baseUrl, expectRemoteMcp) {
  if (!expectRemoteMcp) {
    return {
      expected_remote_mcp: false,
      skipped: true,
      reason: "metadata_only",
      routes: PUBLIC_MCP_ROUTES,
      supported: false,
      tools: [],
    };
  }

  const routes = [];

  for (const route of PUBLIC_MCP_ROUTES) {
    routes.push(await probeRemoteMcpRoute(baseUrl, route));
  }

  for (const routeResult of routes) {
    assert.equal(
      routeResult.raw_post.ok,
      true,
      `${routeResult.route} JSON-RPC POST should succeed, got ${routeResult.raw_post.status}`,
    );
    assert.equal(routeResult.raw_post.jsonrpc, "2.0", `${routeResult.route} should return JSON-RPC`);
    assert.equal(
      routeResult.raw_post.server_name,
      "JudgmentKit",
      `${routeResult.route} raw initialize should return JudgmentKit server info`,
    );
    assert.equal(
      routeResult.sdk.supported,
      true,
      `Expected ${routeResult.endpoint} to work as a remote MCP endpoint: ${routeResult.sdk.error}`,
    );
    assert.deepEqual(routeResult.sdk.tools, JUDGMENTKIT_MCP_TOOL_NAMES);
    assert.equal(routeResult.sdk.review_status, "ready_for_review");
  }

  const firstSupportedRoute = routes.find((routeResult) => routeResult.sdk.supported);

  return {
    expected_remote_mcp: expectRemoteMcp,
    supported: routes.every((routeResult) => routeResult.sdk.supported),
    routes,
    tools: firstSupportedRoute?.sdk.tools ?? [],
  };
}

async function fetchJsonProbe(endpointUrl, options = {}) {
  const response = await fetch(endpointUrl, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
  });
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }

  return {
    response,
    body,
    text,
  };
}

async function verifyMcpAppGuardRoute(baseUrl, route) {
  const endpointUrl = urlFor(baseUrl, route);
  const optionsResponse = await fetch(endpointUrl, { method: "OPTIONS" });

  assert.equal(optionsResponse.status, 204, `${route} OPTIONS should return 204`);
  assert.equal(
    optionsResponse.headers.get("access-control-allow-methods"),
    "GET, POST, DELETE, OPTIONS",
    `${route} OPTIONS should advertise MCP methods`,
  );

  const unsupportedMedia = await fetchJsonProbe(endpointUrl, {
    method: "POST",
    headers: {
      "content-type": "text/plain",
    },
    body: "{}",
  });

  assert.equal(
    unsupportedMedia.response.status,
    415,
    `${route} non-JSON POST should return 415`,
  );
  assert.equal(
    unsupportedMedia.body?.error?.message,
    "Unsupported media type: POST /mcp requires application/json.",
    `${route} non-JSON POST should return the app guard message`,
  );

  const oversized = await fetchJsonProbe(endpointUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ value: "x".repeat(PUBLIC_MCP_MAX_POST_BODY_BYTES) }),
  });

  assert.equal(oversized.response.status, 413, `${route} oversized POST should return 413`);
  assert.equal(
    oversized.body?.error?.message,
    "Request body too large: POST /mcp is limited to 128KB.",
    `${route} oversized POST should return the app guard message`,
  );

  const malformed = await fetchJsonProbe(endpointUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: "{",
  });

  assert.equal(malformed.response.status, 400, `${route} malformed JSON should return 400`);
  assert.equal(malformed.body?.error?.code, -32700, `${route} malformed JSON should be a parse error`);

  return {
    route,
    endpoint: endpointUrl,
    options_status: optionsResponse.status,
    non_json_status: unsupportedMedia.response.status,
    oversized_status: oversized.response.status,
    malformed_json_status: malformed.response.status,
    malformed_json_error_code: malformed.body?.error?.code,
  };
}

async function verifyMcpAppGuards(baseUrl, expectRemoteMcp) {
  if (!expectRemoteMcp) {
    return {
      skipped: true,
      reason: "metadata_only",
      routes: PUBLIC_MCP_ROUTES,
    };
  }

  const routes = [];

  for (const route of PUBLIC_MCP_ROUTES) {
    routes.push(await verifyMcpAppGuardRoute(baseUrl, route));
  }

  return {
    skipped: false,
    routes,
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`${command} ${args.join(" ")} timed out after ${options.timeoutMs}ms.`));
    }, options.timeoutMs ?? 180_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code}.\n${stdout}\n${stderr}`.trim(),
        ),
      );
    });

    child.stdin.end(options.input ?? "");
  });
}

function parseLastJsonObject(output) {
  const starts = [...output.matchAll(/\{/g)].map((match) => match.index).reverse();

  for (const startIndex of starts) {
    try {
      return JSON.parse(output.slice(startIndex));
    } catch {
      // Try the next opening brace; command output may include npm status text first.
    }
  }

  throw new Error("Could not parse installer JSON output.");
}

async function verifyHostedInstall(baseUrl) {
  const { text: script } = await fetchText(baseUrl, "/install");
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-public-install-"));
  const mcpUrl = urlFor(baseUrl, "/mcp");
  const configPath = path.join(tempDir, "config.toml");
  const dryRuns = {};

  for (const client of ["codex", "claude", "cursor"]) {
    const { stdout } = await runCommand(
      "bash",
      ["-s", "--", "--client", client, "--mcp-url", mcpUrl, "--dry-run"],
      {
        input: script,
        timeoutMs: 60_000,
      },
    );
    const dryRun = parseLastJsonObject(stdout);

    assert.equal(dryRun.status, "dry_run");
    assert.equal(dryRun.client, client);
    assert.equal(dryRun.mcp_url, mcpUrl);
    assert.deepEqual(dryRun.tools, JUDGMENTKIT_MCP_TOOL_NAMES);
    dryRuns[client] = dryRun;
  }

  const { stdout } = await runCommand(
    "bash",
    ["-s", "--", "--client", "codex", "--mcp-url", mcpUrl, "--config-path", configPath],
    {
      input: script,
      timeoutMs: 120_000,
    },
  );
  const result = parseLastJsonObject(stdout);
  const configText = await fs.readFile(configPath, "utf8");

  assert.equal(result.status, "installed");
  assert.equal(result.client, "codex");
  assert.equal(result.mcp_url, mcpUrl);
  assert.equal(result.config_path, configPath);
  assert.equal(result.verification.verified, true);
  assert.deepEqual(result.verification.tools, JUDGMENTKIT_MCP_TOOL_NAMES);
  assert.ok(configText.includes("[mcp_servers.judgmentkit]"));
  assert.ok(configText.includes(`url = ${JSON.stringify(mcpUrl)}`));

  return {
    temp_dir: tempDir,
    config_path: configPath,
    dry_runs: Object.fromEntries(
      Object.entries(dryRuns).map(([client, dryRun]) => [
        client,
        {
          status: dryRun.status,
          mcp_url: dryRun.mcp_url,
        },
      ]),
    ),
    verified: result.verification.verified,
    tools: result.verification.tools,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const baseUrl = new URL(options.baseUrl);
  const packageVersion = await readPackageVersion();
  const report = {
    base_url: baseUrl.toString(),
    package_version: packageVersion,
    routes: await verifyPublicRoutes(baseUrl.toString(), {
      skipAnalyticsScript: options.skipAnalyticsScript,
    }),
    mcp_metadata: await verifyMcpMetadata(baseUrl.toString(), packageVersion),
    mcp_app_guards: await verifyMcpAppGuards(baseUrl.toString(), options.expectRemoteMcp),
    public_mcp_endpoint_probe: await probeRemoteMcpEndpoint(
      baseUrl.toString(),
      options.expectRemoteMcp,
    ),
    redirects: options.skipRedirects ? "skipped" : await verifyRedirects(),
    hosted_install: options.skipInstall ? "skipped" : await verifyHostedInstall(baseUrl.toString()),
  };

  process.stdout.write(`${JSON.stringify({ ok: true, ...report }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`Public release verification failed:\n${message}\n`);
    process.exitCode = 1;
  });
}
