import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  SCREENSHOT_READY_EXPRESSION,
  withChromeClient,
} from "../../scripts/capture-model-ui-screenshots.mjs";

const EXPERIMENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(EXPERIMENT_DIR, "../..");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function resolveArtifact(document) {
  const artifactPath = path.resolve(EXPERIMENT_DIR, document.artifact);
  const allowedRoots = [EXPERIMENT_DIR, ROOT_DIR];
  const allowed = allowedRoots.some((root) => {
    const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    return artifactPath === root || artifactPath.startsWith(prefix);
  });

  if (!allowed) {
    throw new Error(`Artifact escapes the experiment or repository root: ${document.artifact}`);
  }
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact does not exist: ${artifactPath}`);
  }

  return artifactPath;
}

function expectedForViewport(sample, viewport) {
  return sample.expected_by_viewport?.[viewport.id] ?? sample.expected;
}

function expectedCodeFor(sample, rule, viewport) {
  const expected = expectedForViewport(sample, viewport);
  if (sample.expected_code_by_viewport?.[viewport.id]) {
    return sample.expected_code_by_viewport[viewport.id];
  }
  if (sample.expected_code) return sample.expected_code;
  if (expected === "pass") return rule.id;
  if (expected === "fail") return rule.failure_code;
  if (expected === "pass_with_warning") return rule.warning_code;
  if (expected === "not_applicable") return "relationship_inactive_at_viewport";
  return null;
}

function calibrationFor(policy, sample) {
  if (!sample.calibration_ref) return null;
  const calibration = policy.calibrations?.[sample.calibration_ref];
  if (!calibration) {
    throw new Error(
      `Sample ${sample.id} references missing calibration ${sample.calibration_ref}.`,
    );
  }
  return calibration;
}

function canonicalAssetEvidence(policy, document, sample) {
  if (sample.rule_id !== "canonical_lockup.asset") return null;
  const rule = policy.rules.find((candidate) => candidate.id === sample.rule_id);
  const expected = rule?.lockups?.[sample.lockup_id];
  if (!expected?.asset_suffix || !expected?.sha256) {
    throw new Error(
      `Canonical lockup ${sample.lockup_id} needs an asset suffix and sha256 authority.`,
    );
  }
  const artifactPath = resolveArtifact(document);
  const assetPath = path.resolve(path.dirname(artifactPath), expected.asset_suffix);
  if (!fs.existsSync(assetPath)) {
    throw new Error(`Canonical lockup asset does not exist: ${assetPath}`);
  }
  const observedSha256 = sha256File(assetPath);
  if (observedSha256 !== expected.sha256) {
    throw new Error(
      `Canonical lockup digest mismatch for ${sample.lockup_id}: ${observedSha256}.`,
    );
  }
  return {
    lockup_id: sample.lockup_id,
    asset_suffix: expected.asset_suffix,
    sha256: observedSha256,
  };
}

function expressionFor(sample, rule, calibration) {
  return `(
    () => {
      const sample = ${JSON.stringify(sample)};
      const rule = ${JSON.stringify(rule)};
      const calibration = ${JSON.stringify(calibration)};
      const root = document.querySelector(sample.selector);
      const rect = (element) => {
        const value = element.getBoundingClientRect();
        return {
          x: value.x,
          y: value.y,
          width: value.width,
          height: value.height,
          top: value.top,
          right: value.right,
          bottom: value.bottom,
          left: value.left,
        };
      };
      const spread = (values) => Math.max(...values) - Math.min(...values);
      const isRendered = (element) => {
        const bounds = rect(element);
        const style = getComputedStyle(element);
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number.parseFloat(style.opacity || "1") > 0
        );
      };
      const fail = (code, message, evidence = {}) => ({
        status: "fail",
        code,
        message,
        evidence,
      });
      const pass = (evidence = {}) => ({
        status: "pass",
        code: rule.id,
        evidence,
      });
      const review = (code, message, evidence = {}) => ({
        status: "review",
        code,
        message,
        evidence,
      });
      const warn = (code, message, evidence = {}) => ({
        status: "pass_with_warning",
        code,
        message,
        evidence,
      });

      if (!root) {
        return fail("sample_root_missing", "The declared sample selector did not resolve.", {
          selector: sample.selector,
        });
      }
      if (!isRendered(root)) {
        return fail("sample_root_not_rendered", "The declared sample root is not visibly rendered.", {
          selector: sample.selector,
          root_rect: rect(root),
        });
      }

      if (rule.kind === "shared_anchor") {
        if (sample.active_query && !window.matchMedia(sample.active_query).matches) {
          return {
            status: "not_applicable",
            code: "relationship_inactive_at_viewport",
            evidence: { active_query: sample.active_query },
          };
        }
        const members = [...root.querySelectorAll(sample.member_selector)];
        if (members.length < 2) {
          return fail("relationship_members_missing", "The relationship needs at least two members.", {
            member_selector: sample.member_selector,
            count: members.length,
          });
        }
        if (members.some((member) => !isRendered(member))) {
          return fail(
            "relationship_member_not_rendered",
            "One or more declared relationship members are not visibly rendered.",
            { member_selector: sample.member_selector },
          );
        }
        const coordinate = rule.anchor === "block_start" ? "top" : "inline_start";
        const values = members.map((member) => {
          const memberRect = rect(member);
          if (coordinate === "top") return memberRect.top;
          return getComputedStyle(member).direction === "rtl"
            ? window.innerWidth - memberRect.right
            : memberRect.left;
        });
        const observed = spread(values);
        const limit = calibration?.max_spread_css_px;
        if (!Number.isFinite(limit)) {
          return review(
            "calibration_missing",
            "A design-system or repo-owned calibration is required before this relationship can block acceptance.",
            { calibration_ref: sample.calibration_ref },
          );
        }
        return observed <= limit
          ? pass({ coordinate, values, spread_css_px: observed, limit_css_px: limit })
          : fail(rule.failure_code, rule.message, {
              coordinate,
              values,
              spread_css_px: observed,
              limit_css_px: limit,
            });
      }

      if (rule.kind === "protected_atom") {
        const target = sample.target_selector
          ? root.matches(sample.target_selector)
            ? root
            : root.querySelector(sample.target_selector)
          : root;
        if (!target) {
          return fail("protected_atom_missing", "The declared protected atom did not resolve.");
        }
        if (!isRendered(target)) {
          return fail(
            "protected_atom_not_rendered",
            "The declared protected atom is not visibly rendered.",
          );
        }
        const range = document.createRange();
        range.selectNodeContents(target);
        const lineRects = [...range.getClientRects()].filter(
          (value) => value.width > 0 && value.height > 0,
        );
        const rootRect = rect(root);
        const targetRect = rect(target);
        const overflowsInline =
          targetRect.left < rootRect.left - 0.5 || targetRect.right > rootRect.right + 0.5;
        const limit = calibration?.max_text_line_boxes ?? 1;
        return lineRects.length <= limit && !overflowsInline
          ? pass({ line_box_count: lineRects.length, overflows_inline: false })
          : fail(rule.failure_code, rule.message, {
              line_box_count: lineRects.length,
              max_line_box_count: limit,
              overflows_inline: overflowsInline,
              target_rect: targetRect,
              container_rect: rootRect,
            });
      }

      if (rule.kind === "presentation_owner") {
        const owner = sample.presentation_owner;
        if (owner === "browser") {
          const control = root.matches("select") ? root : root.querySelector("select");
          if (!control) {
            return fail("select_control_missing", "The declared select control did not resolve.");
          }
          if (!isRendered(control)) {
            return fail(
              "select_control_not_rendered",
              "The browser-owned select is not visibly rendered.",
            );
          }
          const style = getComputedStyle(control);
          const appearance = style.appearance || style.webkitAppearance || "auto";
          const native = appearance !== "none";
          return native
            ? warn(
                rule.warning_code,
                "The browser owns native indicator painting; internal indicator geometry is not a DOM-measurable hard gate.",
                {
                  appearance,
                  padding_inline_start: style.paddingInlineStart,
                  padding_inline_end: style.paddingInlineEnd,
                  control_rect: rect(control),
                },
              )
            : review(
                "presentation_owner_mismatch",
                "The sample declares browser ownership but suppresses native appearance.",
                { appearance },
              );
        }
        if (owner !== "design_system") {
          return review(
            "presentation_owner_undeclared",
            "Select indicator ownership must be declared before evaluating its composition.",
          );
        }
        const container = sample.container_selector
          ? root.querySelector(sample.container_selector)
          : root;
        const label = root.querySelector(sample.label_selector);
        const indicator = root.querySelector(sample.indicator_selector);
        if (!container || !label || !indicator) {
          return fail("owned_select_parts_missing", "One or more governed select parts did not resolve.");
        }
        if (![container, label, indicator].every(isRendered)) {
          return fail(
            "owned_select_part_not_rendered",
            "One or more governed select parts are not visibly rendered.",
          );
        }
        const containerRect = rect(container);
        const labelRect = rect(label);
        const indicatorRect = rect(indicator);
        const direction = getComputedStyle(container).direction;
        if (sample.composition_variant === "centered_label_symmetric_rails") {
          const containerCenter = (containerRect.left + containerRect.right) / 2;
          const labelCenter = (labelRect.left + labelRect.right) / 2;
          const labelCenterDelta = Math.abs(containerCenter - labelCenter);
          const endInset = direction === "rtl"
            ? indicatorRect.left - containerRect.left
            : containerRect.right - indicatorRect.right;
          const indicatorWidth = indicatorRect.width;
          const trailingRailWidth = endInset * 2 + indicatorWidth;
          const expectedRailWidth = calibration?.accessory_rail_width_css_px;
          const railDelta = Number.isFinite(expectedRailWidth)
            ? Math.abs(trailingRailWidth - expectedRailWidth)
            : Number.POSITIVE_INFINITY;
          const centerLimit = calibration?.max_label_center_delta_css_px;
          const railLimit = calibration?.max_logical_rail_delta_css_px;
          if (![centerLimit, railLimit, expectedRailWidth].every(Number.isFinite)) {
            return review(
              "calibration_missing",
              "Centered-label select rails need owner-supplied center and rail calibrations.",
            );
          }
          return labelCenterDelta <= centerLimit && railDelta <= railLimit
            ? pass({
                direction,
                label_center_delta_css_px: labelCenterDelta,
                trailing_rail_width_css_px: trailingRailWidth,
                expected_rail_width_css_px: expectedRailWidth,
                rail_delta_css_px: railDelta,
                center_limit_css_px: centerLimit,
                rail_limit_css_px: railLimit,
              })
            : fail(rule.failure_code, rule.message, {
                direction,
                label_center_delta_css_px: labelCenterDelta,
                trailing_rail_width_css_px: trailingRailWidth,
                expected_rail_width_css_px: expectedRailWidth,
                rail_delta_css_px: railDelta,
                center_limit_css_px: centerLimit,
                rail_limit_css_px: railLimit,
              });
        }
        const startInset = direction === "rtl"
          ? containerRect.right - labelRect.right
          : labelRect.left - containerRect.left;
        const endInset = direction === "rtl"
          ? indicatorRect.left - containerRect.left
          : containerRect.right - indicatorRect.right;
        const delta = Math.abs(startInset - endInset);
        const limit = calibration?.max_logical_rail_delta_css_px;
        if (!Number.isFinite(limit)) {
          return review("calibration_missing", "Owned select rails need an owner-supplied calibration.");
        }
        return delta <= limit
          ? pass({ direction, start_inset_css_px: startInset, end_inset_css_px: endInset, delta_css_px: delta, limit_css_px: limit })
          : fail(rule.failure_code, rule.message, {
              direction,
              start_inset_css_px: startInset,
              end_inset_css_px: endInset,
              delta_css_px: delta,
              limit_css_px: limit,
            });
      }

      if (rule.kind === "canonical_lockup") {
        const expected = rule.lockups?.[sample.lockup_id];
        if (!expected) {
          return review("canonical_lockup_undeclared", "The requested canonical lockup is not in policy.");
        }
        const asset = root.matches(sample.asset_selector)
          ? root
          : root.querySelector(sample.asset_selector);
        if (!asset) {
          return fail(rule.failure_code, rule.message, {
            lockup_id: sample.lockup_id,
            expected_asset_suffix: expected.asset_suffix,
          });
        }
        if (!isRendered(asset)) {
          return fail(
            "canonical_lockup_not_rendered",
            "The declared canonical lockup asset is not visibly rendered.",
          );
        }
        const source = asset.getAttribute("src") ?? "";
        return source.endsWith(expected.asset_suffix)
          ? pass({ lockup_id: sample.lockup_id, source })
          : fail(rule.failure_code, rule.message, {
              lockup_id: sample.lockup_id,
              source,
              expected_asset_suffix: expected.asset_suffix,
            });
      }

      return review("unsupported_rule_kind", "The checker does not implement the declared rule kind.", {
        kind: rule.kind,
      });
    }
  )()`;
}

async function navigateAndPrepare(client, document, viewport) {
  const target = await client.send("Target.createTarget", { url: "about:blank" });
  const attached = await client.send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  });
  const sessionId = attached.sessionId;
  const artifactPath = resolveArtifact(document);

  try {
    await client.send("Page.enable", {}, sessionId);
    await client.send("Runtime.enable", {}, sessionId);
    await client.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.device_scale_factor ?? 1,
        mobile: viewport.mobile ?? false,
      },
      sessionId,
    );

    const loadEvent = client.waitFor("Page.loadEventFired", sessionId);
    await client.send(
      "Page.navigate",
      { url: pathToFileURL(artifactPath).href },
      sessionId,
    );
    await loadEvent;
    const styleOverride = [
      "*,*::before,*::after{animation:none!important;transition:none!important}",
      document.style_overrides ?? "",
    ].join("\n");
    await client.send(
      "Runtime.evaluate",
      {
        expression: `(() => {
          const style = document.createElement("style");
          style.dataset.visualCompositionProof = "";
          style.textContent = ${JSON.stringify(styleOverride)};
          document.head.append(style);
        })()`,
      },
      sessionId,
    );
    const ready = await client.send(
      "Runtime.evaluate",
      {
        expression: SCREENSHOT_READY_EXPRESSION,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    );

    const readyValue = ready.result?.value;
    if (readyValue?.scrollX !== 0 || readyValue?.scrollY !== 0) {
      throw new Error(`Unable to reset ${document.id} to the top-left measurement origin.`);
    }

    return { targetId: target.targetId, sessionId };
  } catch (error) {
    await client.send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
    throw error;
  }
}

async function captureEvidenceScreenshot(
  client,
  sessionId,
  document,
  viewport,
  samples,
  screenshotDir,
) {
  const overlays = samples.map((sample) => ({
    selector: document.samples.find((candidate) => candidate.id === sample.sample_id)?.selector,
    label: `${sample.sample_id}: ${sample.actual}`,
    status: sample.actual,
  }));
  await client.send(
    "Runtime.evaluate",
    {
      expression: `(() => {
        const entries = ${JSON.stringify(overlays)};
        const colors = {
          pass: "#176b45",
          fail: "#a4472d",
          pass_with_warning: "#936117",
          review: "#6746a3",
          not_applicable: "#68716d",
        };
        const layer = document.createElement("div");
        layer.dataset.visualCompositionOverlay = "";
        layer.style.cssText = "position:absolute;inset:0;z-index:2147483647;pointer-events:none";
        for (const entry of entries) {
          if (!entry.selector) continue;
          const target = document.querySelector(entry.selector);
          if (!target) continue;
          const rect = target.getBoundingClientRect();
          const color = colors[entry.status] ?? colors.review;
          const box = document.createElement("div");
          box.style.cssText = [
            "position:absolute",
            "left:" + (rect.left + window.scrollX) + "px",
            "top:" + (rect.top + window.scrollY) + "px",
            "width:" + rect.width + "px",
            "height:" + rect.height + "px",
            "border:2px dashed " + color,
            "border-radius:8px",
            "box-sizing:border-box",
          ].join(";");
          const label = document.createElement("span");
          label.textContent = entry.label;
          label.style.cssText = [
            "position:absolute",
            "left:0",
            "bottom:100%",
            "background:" + color,
            "color:white",
            "font:700 11px/1.2 system-ui,sans-serif",
            "padding:3px 5px",
            "border-radius:4px 4px 0 0",
            "white-space:nowrap",
          ].join(";");
          box.append(label);
          layer.append(box);
        }
        document.body.append(layer);
      })()`,
    },
    sessionId,
  );

  const metrics = await client.send("Page.getLayoutMetrics", {}, sessionId);
  const contentSize = metrics.cssContentSize ?? metrics.contentSize;
  const capture = await client.send(
    "Page.captureScreenshot",
    {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: true,
      clip: {
        x: 0,
        y: 0,
        width: Math.ceil(contentSize.width),
        height: Math.ceil(contentSize.height),
        scale: 1,
      },
    },
    sessionId,
  );
  const png = Buffer.from(capture.data, "base64");
  if (png.length < 4096 || !png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`Evidence screenshot capture failed for ${document.id}:${viewport.id}.`);
  }
  fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, `${document.id}-${viewport.id}.png`);
  fs.writeFileSync(screenshotPath, png);
  return {
    document_id: document.id,
    viewport_id: viewport.id,
    path: screenshotPath,
    width_css_px: Math.ceil(contentSize.width),
    height_css_px: Math.ceil(contentSize.height),
  };
}

function summarize(samples) {
  const counts = {
    pass: 0,
    fail: 0,
    pass_with_warning: 0,
    review: 0,
    not_applicable: 0,
  };
  for (const sample of samples) counts[sample.actual] += 1;
  return {
    ...counts,
    expectation_mismatches: samples.filter((sample) => !sample.expectation_met).length,
  };
}

export async function runVisualCompositionProof(options = {}) {
  const policyPath = path.resolve(options.policyPath ?? path.join(EXPERIMENT_DIR, "policy.json"));
  const specimenPath = path.resolve(options.specimenPath ?? path.join(EXPERIMENT_DIR, "specimen.json"));
  const policy = readJson(policyPath);
  const specimen = readJson(specimenPath);
  const browserVersion = {};
  const ruleById = new Map(policy.rules.map((rule) => [rule.id, rule]));
  const results = [];
  const screenshots = [];
  const documentOutcomes = [];

  await withChromeClient(async (client) => {
    Object.assign(browserVersion, await client.send("Browser.getVersion"));
    for (const document of specimen.documents) {
      const artifactSha256 = sha256File(resolveArtifact(document));
      const viewports = document.viewports ?? [document.viewport];
      for (const viewport of viewports) {
        const page = await navigateAndPrepare(client, document, viewport);
        try {
          const documentResults = [];
          for (const sample of document.samples) {
            const rule = ruleById.get(sample.rule_id);
            if (!rule) throw new Error(`Unknown rule ${sample.rule_id} in sample ${sample.id}.`);
            const calibration = calibrationFor(policy, sample);
            const canonicalAsset = canonicalAssetEvidence(policy, document, sample);
            const evaluated = await client.send(
              "Runtime.evaluate",
              {
                expression: expressionFor(sample, rule, calibration),
                returnByValue: true,
              },
              page.sessionId,
            );
            if (evaluated.exceptionDetails) {
              throw new Error(
                `Browser evaluation failed for ${sample.id}: ${evaluated.exceptionDetails.text}`,
              );
            }
            const observation = evaluated.result?.value;
            if (!observation?.status) {
              throw new Error(`Browser evaluation returned no status for ${sample.id}.`);
            }
            const expected = expectedForViewport(sample, viewport);
            const expectedCode = expectedCodeFor(sample, rule, viewport);
            const result = {
              document_id: document.id,
              artifact: document.artifact,
              artifact_sha256: artifactSha256,
              viewport: {
                id: viewport.id,
                width: viewport.width,
                height: viewport.height,
                device_scale_factor: viewport.device_scale_factor ?? 1,
              },
              sample_id: sample.id,
              rule_id: sample.rule_id,
              expected,
              ...(expectedCode ? { expected_code: expectedCode } : {}),
              actual: observation.status,
              expectation_met:
                expected === observation.status &&
                (!expectedCode || expectedCode === observation.code),
              code: observation.code,
              ...(observation.message ? { message: observation.message } : {}),
              selector: sample.selector,
              ...(sample.member_selector
                ? { member_selector: sample.member_selector }
                : {}),
              ...(sample.target_selector
                ? { target_selector: sample.target_selector }
                : {}),
              ...(sample.calibration_ref
                ? { calibration_ref: sample.calibration_ref }
                : {}),
              ...(sample.presentation_owner
                ? { presentation_owner: sample.presentation_owner }
                : {}),
              ...(sample.composition_variant
                ? { composition_variant: sample.composition_variant }
                : {}),
              ...(canonicalAsset ? { canonical_asset: canonicalAsset } : {}),
              evidence: observation.evidence ?? {},
            };
            results.push(result);
            documentResults.push(result);
          }
          if (document.capture_evidence && options.screenshotDir) {
            screenshots.push(
              await captureEvidenceScreenshot(
                client,
                page.sessionId,
                document,
                viewport,
                documentResults,
                options.screenshotDir,
              ),
            );
          }
          documentOutcomes.push({
            document_id: document.id,
            artifact: document.artifact,
            artifact_sha256: artifactSha256,
            viewport: {
              id: viewport.id,
              width: viewport.width,
              height: viewport.height,
              device_scale_factor: viewport.device_scale_factor ?? 1,
            },
            sample_count: documentResults.length,
            outcome:
              documentResults.length === 0
                ? "no_applicable_contract"
                : documentResults.some((sample) => sample.actual === "fail")
                  ? "fail"
                  : documentResults.some((sample) => sample.actual === "review")
                    ? "review"
                    : documentResults.some(
                          (sample) => sample.actual === "pass_with_warning",
                        )
                      ? "pass_with_warning"
                      : documentResults.every(
                            (sample) => sample.actual === "not_applicable",
                          )
                        ? "not_applicable"
                        : "pass",
          });
        } finally {
          await client.send("Target.closeTarget", { targetId: page.targetId }).catch(() => {});
        }
      }
    }
  });

  const summary = summarize(results);
  const receipt = {
    kind: "visual_composition_evidence",
    version: "0.1-experimental",
    policy_ref: {
      id: policy.id,
      version: policy.version,
      sha256: sha256File(policyPath),
    },
    specimen_ref: {
      id: specimen.id,
      version: specimen.version,
      sha256: sha256File(specimenPath),
    },
    runtime_ref: {
      artifact: "checker.mjs",
      sha256: sha256File(fileURLToPath(import.meta.url)),
    },
    environment: {
      engine: "chromium",
      browser_product: browserVersion.product,
      browser_revision: browserVersion.revision,
      user_agent: browserVersion.userAgent,
      javascript_version: browserVersion.jsVersion,
      measurement: "dom_geometry",
      fonts_ready: true,
      animations_settled_by: "two_animation_frames",
    },
    summary,
    documents: documentOutcomes,
    samples: results,
    screenshots,
    outcome: summary.expectation_mismatches === 0 ? "proof_passed" : "proof_failed",
  };

  if (options.receiptPath) {
    fs.mkdirSync(path.dirname(options.receiptPath), { recursive: true });
    fs.writeFileSync(options.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  }

  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const receipt = await runVisualCompositionProof();
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (receipt.outcome !== "proof_passed") process.exitCode = 1;
}
