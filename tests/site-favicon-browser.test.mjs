import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSite } from "../site/build-site.mjs";
import { SITE_BRAND_ICON_BUNDLE } from "../site/brand-assets.mjs";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";
import { evaluate, openPage, waitForExpression, withChromium } from "./components/support/chromium-harness.mjs";

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-favicon-browser-"));
const results = [], requests = [];
let server;
const icons = theme => SITE_BRAND_ICON_BUNDLE.routes[`/assets/brand/favicon-${theme}.ico`];
const stateExpression = `(() => ({
  scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  links: [...document.querySelectorAll('link[rel="icon"]')].map(link => ({
    href: new URL(link.href).pathname, type: link.type, sizes: link.sizes.value,
    managed: link.hasAttribute('data-brand-favicon'),
  })),
  firstBody: window.__faviconAtFirstBody,
}))()`;
try {
  await buildSite(outDir);
  // Fixture-only early body observation proves the external script ran during
  // parsing, before the document load event, rather than in a later effect.
  for (const file of ["index.html", "docs/index.html"]) {
    const target = path.join(outDir, file);
    const probe = `<script>window.__faviconAtFirstBody=[...document.querySelectorAll('link[rel="icon"]')].map(link=>new URL(link.href).pathname);</script>`;
    fs.writeFileSync(target, fs.readFileSync(target, "utf8").replace(/<body\b[^>]*>/i, match => match + probe));
  }
  const local = await listenSiteLocalServer({ siteDir: outDir, host: "127.0.0.1", port: 0 });
  server = local.server;
  server.on("request", request => {
    if (/favicon.*\.(?:ico|js)(?:\?|$)/.test(request.url)) requests.push({ url: request.url, method: request.method });
  });
  await withChromium(async client => {
    for (const route of ["/", "/docs/"]) for (const initial of ["light", "dark"]) {
      const page = await openPage(client, { url: new URL(route, local.url).href, colorScheme: initial, viewport: { width: 390, height: 844 } });
      try {
        const before = await evaluate(client, page.sessionId, stateExpression);
        assert.equal(before.scheme, initial);
        assert.deepEqual(before.firstBody, [icons(initial)], "one correct ICO before body parsing");
        assert.deepEqual(before.links, [{ href: icons(initial), type: "image/x-icon", sizes: "16x16 32x32 48x48", managed: true }]);
        await evaluate(client, page.sessionId, "window.__originalFavicon = document.querySelector('link[rel=icon]')");
        const changed = initial === "light" ? "dark" : "light";
        await client.send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-color-scheme", value: changed }] }, page.sessionId);
        await waitForExpression(client, page.sessionId, `document.querySelector('link[rel=icon]')?.getAttribute('href') === ${JSON.stringify(icons(changed))}`, { label: "same ICO link follows scheme change" });
        const after = await evaluate(client, page.sessionId, stateExpression);
        assert.equal(after.scheme, changed);
        assert.deepEqual(after.links, [{ href: icons(changed), type: "image/x-icon", sizes: "16x16 32x32 48x48", managed: true }]);
        assert.equal(await evaluate(client, page.sessionId, "window.__originalFavicon === document.querySelector('link[rel=icon]')"), true);
        assert.deepEqual(page.runtimeExceptions, [], "controller introduces no runtime exceptions");
        results.push({ route, initial, before, after });
      } finally { await page.close(); }
    }
    const page = await openPage(client, { url: local.url, colorScheme: "light", viewport: { width: 390, height: 844 } });
    try {
      await client.send("Emulation.setScriptExecutionDisabled", { value: true }, page.sessionId);
      const loaded = client.waitFor("Page.loadEventFired", page.sessionId);
      await client.send("Page.navigate", { url: new URL("/docs/", local.url).href }, page.sessionId);
      await loaded;
      const fallback = await evaluate(client, page.sessionId, stateExpression);
      assert.deepEqual(fallback.links, [{ href: icons("light"), type: "image/x-icon", sizes: "16x16 32x32 48x48", managed: false }]);
      assert.equal(fallback.firstBody, undefined, "page scripts are disabled in this fixture");
      results.push({ route: "/docs/", javascript: false, fallback });
    } finally { await page.close(); }
  });
  const evidenceDir = process.env.JUDGMENTKIT_FAVICON_QA_DIR;
  if (evidenceDir) {
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, "browser-regression.json"), JSON.stringify({
      status: "passed", bundleKey: SITE_BRAND_ICON_BUNDLE.key, cases: results,
      nativeRequestsObserved: requests.filter(request => request.url.endsWith(".ico")),
      requestLog: requests,
      limits: "Chromium DOM, parsing and request evidence. No Safari or native toolbar-pixel claim; no explicit icon image probes ran.",
    }, null, 2) + "\n");
  }
  console.log("Favicon browser checks passed: home/docs light/dark initial parsing, four dynamic scheme changes, one retained typed ICO, and no-script light fallback.");
} finally {
  server?.closeAllConnections?.();
  if (server) await new Promise(resolve => server.close(resolve));
  fs.rmSync(outDir, { recursive: true, force: true });
}
