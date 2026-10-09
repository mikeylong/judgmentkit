import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildSite } from "./source/site/build-site.mjs";
import { listenSiteLocalServer } from "./source/scripts/site-local-server.mjs";
import { SYSTEM_MAP_NODES, SYSTEM_MAP_EDGES } from "./source/site/system-map-model.mjs";
import { evaluate, openPage, waitForExpression, withChromium } from "./source/tests/components/support/chromium-harness.mjs";

const runDir = path.dirname(new URL(import.meta.url).pathname);
const siteDir = path.join(runDir, "built-site");
const version = "judgmentkit-flow-evidence-admission-v2";
const expectedAssets = [`/assets/system-map-flow.js?v=${version}`, `/assets/system-map-flow.css?v=${version}`];
const root = "[data-system-map-flow-root]";
await buildSite(siteDir);
const local = await listenSiteLocalServer({ siteDir, host: "127.0.0.1", port: 0 });
try {
  const receipt = await withChromium(async (client, browserVersion) => {
    const page = await openPage(client, {
      url: `${local.url}/docs/#system-map`,
      viewport: { width: 1280, height: 900, mobile: false }, colorScheme: "light",
    });
    const sid = page.sessionId;
    const responses = [];
    const off = client.on("Network.responseReceived", event => {
      const url = new URL(event.response.url);
      if (url.pathname.includes("system-map-flow")) responses.push({
        url: `${url.pathname}${url.search}`, status: event.response.status,
        mime_type: event.response.mimeType, from_disk_cache: event.response.fromDiskCache ?? false,
      });
    }, sid);
    try {
      await client.send("Network.enable", {}, sid);
      const loaded = client.waitFor("Page.loadEventFired", sid);
      await client.send("Page.reload", { ignoreCache: true }, sid);
      await loaded;
      await waitForExpression(client, sid,
        `document.querySelector('${root}')?.dataset.systemMapFlowMounted === 'true' &&
          document.querySelectorAll('${root} .react-flow__node').length === 21 &&
          document.querySelectorAll('${root} .react-flow__edge').length === 25`,
        { label: "v2 map assets mount all nodes and arrows" });
      await evaluate(client, sid, "document.fonts.ready");
      const observed = await evaluate(client, sid, `(() => ({
        assets: [...document.querySelectorAll('script[src],link[href]')]
          .map(element => element.src || element.href)
          .filter(url => url.includes('/assets/system-map-flow.'))
          .map(value => { const url = new URL(value); return url.pathname + url.search; }),
        nodes: [...document.querySelectorAll('${root} .react-flow__node')].map(node => node.dataset.id).sort(),
        edges: [...document.querySelectorAll('${root} .react-flow__edge')].map(edge => ({
          id: edge.dataset.id, length: edge.querySelector('.react-flow__edge-path').getTotalLength(),
          arrow: !!edge.querySelector('.react-flow__edge-path').getAttribute('marker-end'),
        })).sort((a, b) => a.id.localeCompare(b.id)),
        mounted: document.querySelector('${root}').dataset.systemMapFlowMounted,
        fallback_hidden: document.querySelector('[data-system-map-fallback]').hidden,
      }))()`);
      assert.deepEqual(observed.assets.sort(), expectedAssets.sort());
      for (const asset of expectedAssets) assert.ok(responses.some(response =>
        response.url === asset && response.status === 200), `${asset} must load successfully through the browser`);
      assert.deepEqual(observed.nodes, SYSTEM_MAP_NODES.map(node => node.id).sort());
      assert.deepEqual(observed.edges.map(edge => edge.id), SYSTEM_MAP_EDGES.map(edge => edge.id).sort((a, b) => a.localeCompare(b)));
      assert.ok(observed.edges.every(edge => edge.length > 0 && edge.arrow));
      assert.equal(observed.mounted, "true");
      assert.equal(observed.fallback_hidden, true);
      assert.deepEqual(page.runtimeExceptions, []);
      assert.deepEqual(page.consoleErrors, []);
      return { status: "pass", scope: "desktop_v2_system_map_loader_smoke", browser: browserVersion.product,
        viewport: { width: 1280, height: 900 }, appearance: "light", responses, observed };
    } finally {
      off();
      await page.close();
    }
  });
  fs.writeFileSync(path.join(runDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ status: receipt.status, browser: receipt.browser,
    loaded_assets: receipt.responses, nodes: receipt.observed.nodes.length, arrows: receipt.observed.edges.length }));
} finally {
  await new Promise((resolve, reject) => local.server.close(error => error ? reject(error) : resolve()));
}
