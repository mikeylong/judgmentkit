import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSite } from "../site/build-site.mjs";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";
import {
  evaluate,
  openPage,
  withChromium,
} from "./components/support/chromium-harness.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AXE_PATH = path.join(REPO_ROOT, "node_modules", "axe-core", "axe.min.js");
const VIEWPORTS = Object.freeze([
  Object.freeze({ id: "desktop", width: 1280, height: 900, mobile: false }),
  Object.freeze({ id: "mobile", width: 390, height: 844, mobile: true }),
]);
const EXPECTED_PATTERN_COUNT = 8;

function closeServer(server) {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function injectAxe(client, sessionId) {
  assert.ok(fs.existsSync(AXE_PATH), "The local axe-core browser bundle is missing.");
  await evaluate(client, sessionId, fs.readFileSync(AXE_PATH, "utf8"), {
    awaitPromise: false,
  });
  assert.equal(
    await evaluate(client, sessionId, `typeof globalThis.axe?.run === "function"`),
    true,
    "axe-core did not initialize on the Patterns page",
  );
}

async function inspectPatternsPage(client, page, viewport) {
  await injectAxe(client, page.sessionId);
  const observed = await evaluate(
    client,
    page.sessionId,
    `(async () => {
      const index = document.querySelector("[data-pattern-index]");
      const jumpLinks = [...(index?.querySelectorAll('a[href^="#"]') ?? [])];
      const rows = [...(index?.querySelectorAll("tbody tr") ?? [])];
      const specimens = [...document.querySelectorAll("[data-pattern-specimen]")];
      const surfaces = [...document.querySelectorAll("[data-pattern-surface]")];
      const axe = await globalThis.axe.run(document, {
        reporter: "v2",
        resultTypes: ["violations"]
      });
      return {
        innerWidth,
        innerHeight,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        jumpLinks: jumpLinks.map((link) => {
          const target = document.querySelector(link.getAttribute("href"));
          return {
            href: link.getAttribute("href"),
            text: link.textContent.trim(),
            targetExists: Boolean(target),
          };
        }),
        rows: rows.map((row) => ({
          display: getComputedStyle(row).display,
          overflow: row.scrollWidth - row.clientWidth,
          cells: [...row.cells].map((cell) => ({
            display: getComputedStyle(cell).display,
            label: cell.getAttribute("data-label"),
            generatedLabel: getComputedStyle(cell, "::before").content,
          })),
        })),
        specimens: specimens.map((specimen) => ({
          id: specimen.id,
          contract: specimen.getAttribute("data-pattern-specimen"),
          rect: (() => {
            const rect = specimen.getBoundingClientRect();
            return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          })(),
        })),
        surfaces: surfaces.map((surface) => {
          const rect = surface.getBoundingClientRect();
          return {
            contract: surface.getAttribute("data-pattern-surface"),
            layout: surface.getAttribute("data-surface-layout"),
            rect: { left: rect.left, right: rect.right, width: rect.width, height: rect.height },
            overflow: surface.scrollWidth - surface.clientWidth,
          };
        }),
        staticTabStops: [...document.querySelectorAll(
          "[data-pattern-surface] a, [data-pattern-surface] button, [data-pattern-surface] input, [data-pattern-surface] select, [data-pattern-surface] textarea"
        )].filter((element) => !element.disabled && element.tabIndex >= 0).map((element) => element.outerHTML),
        staticSelects: [...document.querySelectorAll("[data-pattern-surface] select")].map((select) => ({
          disabled: select.disabled,
          ariaDisabled: select.getAttribute("aria-disabled"),
        })),
        axeViolations: axe.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          targets: violation.nodes.flatMap((node) => node.target),
        })),
      };
    })()`,
  );

  assert.equal(observed.innerWidth, viewport.width, `${viewport.id}: viewport width drifted`);
  assert.equal(observed.innerHeight, viewport.height, `${viewport.id}: viewport height drifted`);
  assert.ok(observed.pageOverflow <= 1, `${viewport.id}: page overflows by ${observed.pageOverflow}px`);
  assert.equal(observed.jumpLinks.length, EXPECTED_PATTERN_COUNT, `${viewport.id}: jump-link count drifted`);
  assert.equal(observed.jumpLinks.every((link) => link.targetExists), true, `${viewport.id}: a jump-link target is missing`);
  assert.equal(new Set(observed.jumpLinks.map((link) => link.href)).size, EXPECTED_PATTERN_COUNT);
  assert.equal(observed.specimens.length, EXPECTED_PATTERN_COUNT, `${viewport.id}: specimen count drifted`);
  assert.equal(observed.surfaces.length, EXPECTED_PATTERN_COUNT, `${viewport.id}: surface count drifted`);
  assert.equal(new Set(observed.surfaces.map((surface) => surface.layout)).size, EXPECTED_PATTERN_COUNT);
  assert.equal(observed.staticTabStops.length, 0, `${viewport.id}: static examples entered the tab order`);
  assert.ok(observed.staticSelects.length > 0, `${viewport.id}: static select coverage is missing`);
  assert.equal(
    observed.staticSelects.every((select) => select.disabled && select.ariaDisabled === "true"),
    true,
    `${viewport.id}: a static select remains label-focusable or changeable`,
  );
  assert.deepEqual(observed.axeViolations, [], `${viewport.id}: page-level axe violations`);

  for (const specimen of observed.specimens) {
    assert.ok(specimen.rect.width > 0 && specimen.rect.height > 0, `${viewport.id}: ${specimen.contract} specimen has no visible geometry`);
    assert.ok(specimen.rect.left >= -1, `${viewport.id}: ${specimen.contract} specimen escapes the viewport start`);
    assert.ok(specimen.rect.right <= viewport.width + 1, `${viewport.id}: ${specimen.contract} specimen escapes the viewport end`);
  }
  for (const surface of observed.surfaces) {
    assert.ok(surface.rect.width > 0 && surface.rect.height > 0, `${viewport.id}: ${surface.contract} surface has no visible geometry`);
    assert.ok(surface.overflow <= 1, `${viewport.id}: ${surface.contract} surface overflows by ${surface.overflow}px`);
  }
  if (viewport.mobile) {
    assert.equal(observed.rows.length, EXPECTED_PATTERN_COUNT, "mobile: index row count drifted");
    for (const row of observed.rows) {
      assert.equal(row.display, "grid", "mobile: pattern index row did not stack");
      assert.ok(row.overflow <= 1, `mobile: pattern index row overflows by ${row.overflow}px`);
      assert.equal(row.cells.length, 4, "mobile: pattern index cell count drifted");
      for (const cell of row.cells) {
        assert.equal(cell.display, "grid", "mobile: pattern index cell did not stack its label");
        assert.ok(cell.label, "mobile: responsive index label is missing");
        assert.notEqual(cell.generatedLabel, "none", "mobile: responsive index label is not rendered");
      }
    }
  }

  for (const jumpLink of observed.jumpLinks) {
    const activation = await evaluate(
      client,
      page.sessionId,
      `(() => {
        const link = document.querySelector(${JSON.stringify(`[data-pattern-index] a[href="${jumpLink.href}"]`)});
        link?.click();
        const target = document.querySelector(${JSON.stringify(jumpLink.href)});
        const rect = target?.getBoundingClientRect();
        return {
          hash: location.hash,
          targetVisible: Boolean(rect && rect.bottom > 0 && rect.top < innerHeight),
        };
      })()`,
    );
    assert.equal(activation.hash, jumpLink.href, `${viewport.id}: ${jumpLink.href} did not activate`);
    assert.equal(activation.targetVisible, true, `${viewport.id}: ${jumpLink.href} target is not visible after activation`);
  }

  assert.deepEqual(page.runtimeExceptions, [], `${viewport.id}: uncaught page errors`);
  assert.deepEqual(page.consoleErrors, [], `${viewport.id}: console errors`);
  return observed;
}

const siteOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-patterns-browser-"));
let localServer;

try {
  await buildSite(siteOutDir);
  const listener = await listenSiteLocalServer({
    host: "127.0.0.1",
    port: 0,
    siteDir: siteOutDir,
  });
  localServer = listener.server;

  const receipts = await withChromium(async (client, browserVersion) => {
    const presentations = [];
    for (const viewport of VIEWPORTS) {
      const page = await openPage(client, {
        url: `${listener.url}/design-system/patterns/`,
        viewport,
        colorScheme: "light",
      });
      try {
        presentations.push({
          viewport: viewport.id,
          observed: await inspectPatternsPage(client, page, viewport),
        });
      } finally {
        await page.close();
      }
    }
    return { browser: browserVersion.product, presentations };
  });

  process.stdout.write(`${JSON.stringify({
    status: "pass",
    scope: "patterns_browser",
    browser: receipts.browser,
    presentations: receipts.presentations.map((entry) => ({
      viewport: entry.viewport,
      patterns: entry.observed.surfaces.length,
      jump_links: entry.observed.jumpLinks.length,
      axe_violations: entry.observed.axeViolations.length,
      page_overflow: entry.observed.pageOverflow,
    })),
  })}\n`);
} finally {
  await closeServer(localServer);
  fs.rmSync(siteOutDir, { recursive: true, force: true });
}
