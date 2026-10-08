import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildSite } from "../site/build-site.mjs";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";
import {
  evaluate, openPage, pointerActivate, pressKey, tabUntil,
  waitForExpression, withChromium,
} from "./components/support/chromium-harness.mjs";

// The first-use disclosure must retain native keys while the embedded map is
// mounted. Its global pan shortcut previously consumed Space outside the map.
const VIEWPORTS = [
  { id: "desktop", width: 1280, height: 900, mobile: false },
  { id: "mobile", width: 390, height: 844, mobile: true },
];
const SUMMARY = "#first-use details > summary";
const MAP = "[data-system-map-flow-root]";
const MAP_VIEWPORT = `${MAP} .react-flow__viewport`;
const WORKSHOP_PROMPT = "Use JudgmentKit to build a signup form for a local workshop. Attendees pick an available session, enter their contact details, and receive a clear confirmation. Handle incomplete details and full sessions. Build and check the main task, then show what works and what remains unverified.";
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-first-use-"));
let server;

async function waitForReplay(client, sid, open, label) {
  await waitForExpression(client, sid,
    `document.querySelector('#first-use details').open === ${open}`,
    { label: `${label}: replay ${open ? "open" : "closed"}` });
  assert.equal(await evaluate(client, sid,
    `document.querySelector('#first-use details pre').checkVisibility()`),
  open, `${label}: replay content visibility must match its disclosure state`);
}

async function assertNoOverflow(client, sid, label) {
  const layout = await evaluate(client, sid, `(() => {
    const section = document.querySelector('#first-use');
    const rect = section.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    return {
      page: document.documentElement.scrollWidth > width + 1,
      section: section.scrollWidth > section.clientWidth + 1,
      outside: rect.left < -1 || rect.right > width + 1,
      sectionWidth: section.clientWidth,
      sectionScrollWidth: section.scrollWidth,
      clippedPre: [...section.querySelectorAll('pre')].some(el =>
        el.checkVisibility() && el.scrollWidth > el.clientWidth + 1),
      outlying: [...section.querySelectorAll('*')].filter(el =>
        el.checkVisibility() && el.getBoundingClientRect().right > rect.right + 1)
        .map(el => ({ tag: el.tagName, text: el.textContent.trim().slice(0, 100),
          right: el.getBoundingClientRect().right })),
    };
  })()`);
  assert.deepEqual({ page: layout.page, section: layout.section, outside: layout.outside,
    clippedPre: layout.clippedPre },
    { page: false, section: false, outside: false, clippedPre: false },
    `${label}: first-use content must fit the viewport; ${JSON.stringify(layout)}`);
}

async function assertMapLayout(client, sid, label) {
  const layout = await evaluate(client, sid, `(() => {
    const section = document.querySelector('#system-map');
    const cards = [...section.querySelectorAll('.rf-map-node,.rf-zone-node')];
    return {
      summaryOverflow: section.scrollWidth > section.clientWidth + 1,
      clippedCards: cards.filter(el => el.scrollWidth > el.clientWidth + 1 ||
        el.scrollHeight > el.clientHeight + 1).map(el => el.textContent),
    };
  })()`);
  assert.deepEqual(layout, { summaryOverflow: false, clippedCards: [] },
    `${label}: System Map cards and supporting code terms must fit`);
}

const transformExpression = `(() => {
  const matrix = new DOMMatrixReadOnly(getComputedStyle(document.querySelector(${JSON.stringify(MAP_VIEWPORT)})).transform);
  return { x: matrix.e, y: matrix.f, zoom: matrix.a };
})()`;

async function checkMapControls(client, sid, label) {
  const baseline = await evaluate(client, sid, transformExpression);
  await pointerActivate(client, sid, `${MAP} .react-flow__controls-zoomin`);
  await waitForExpression(client, sid,
    `(${transformExpression}).zoom > ${baseline.zoom + 0.001}`,
    { label: `${label}: map zoom in` });
  const zoomed = await evaluate(client, sid, transformExpression);
  await pointerActivate(client, sid, `${MAP} .react-flow__controls-zoomout`);
  await waitForExpression(client, sid,
    `(${transformExpression}).zoom < ${zoomed.zoom - 0.001}`,
    { label: `${label}: map zoom out` });

  await evaluate(client, sid,
    `document.querySelector(${JSON.stringify(MAP)}).scrollIntoView({ block: 'center' })`);
  const drag = await evaluate(client, sid, `(() => {
    const rect = document.querySelector('${MAP} .react-flow__pane').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  const beforeDrag = await evaluate(client, sid, transformExpression);
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved", ...drag,
  }, sid);
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed", ...drag, button: "left", buttons: 1, clickCount: 1,
  }, sid);
  for (const distance of [16, 32, 48]) {
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved", x: drag.x + distance, y: drag.y + distance / 2,
      button: "left", buttons: 1,
    }, sid);
  }
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x: drag.x + 48, y: drag.y + 24,
    button: "left", buttons: 0, clickCount: 1,
  }, sid);
  await waitForExpression(client, sid, `(() => {
    const after = ${transformExpression};
    return (Math.abs(after.x - ${beforeDrag.x}) > 10 || Math.abs(after.y - ${beforeDrag.y}) > 10)
      && Math.abs(after.zoom - ${beforeDrag.zoom}) < 0.001;
  })()`, { label: `${label}: map pointer pan` });

  await pointerActivate(client, sid, `${MAP} .react-flow__controls-fitview`);
  await waitForExpression(client, sid, `(() => {
    const after = ${transformExpression};
    return Math.abs(after.x - ${baseline.x}) < 1 && Math.abs(after.y - ${baseline.y}) < 1
      && Math.abs(after.zoom - ${baseline.zoom}) < 0.001;
  })()`, { label: `${label}: fit view restores the map after pan` });
  assert.equal(await evaluate(client, sid,
    `document.querySelector(${JSON.stringify(MAP)}).dataset.systemMapFlowMounted`),
  "true", `${label}: the map must remain mounted after interaction`);
}

try {
  await buildSite(outDir);
  const local = await listenSiteLocalServer({ siteDir: outDir, host: "127.0.0.1", port: 0 });
  server = local.server;

  // A fresh browser profile per viewport keeps this check independent of owner
  // storage and of state left behind by the previous disclosure/map exercise.
  for (const viewport of VIEWPORTS) {
    await withChromium(async (client) => {
      const page = await openPage(client, {
        url: `${local.url}/docs/#first-use`, viewport, colorScheme: "light",
      });
      const sid = page.sessionId;
      const label = `${viewport.id} ${viewport.width}px`;
      try {
        await waitForExpression(client, sid,
          `document.querySelector(${JSON.stringify(MAP)})?.dataset.systemMapFlowMounted === 'true'`,
          { label: `${label}: embedded map mounted before keyboard checks` });
        await evaluate(client, sid, "document.fonts.ready");
        assert.equal(await evaluate(client, sid,
          `document.querySelector('#first-use h2').textContent.trim()`), "First 10 Minutes", label);
        assert.equal(await evaluate(client, sid,
          `document.querySelector('#first-use > pre code').textContent.trim()`), WORKSHOP_PROMPT, label);
        assert.equal(await evaluate(client, sid,
          `document.querySelector(${JSON.stringify(SUMMARY)}).textContent.trim()`),
        "Replay the review mechanism", label);
        await waitForReplay(client, sid, false, `${label}: default`);
        await assertNoOverflow(client, sid, `${label}: collapsed`);

        const tabSteps = await tabUntil(client, sid, SUMMARY);
        assert.ok(tabSteps > 0, `${label}: real Tab input must reach the replay summary`);
        for (const key of ["Enter", "Space"]) {
          await pressKey(client, sid, key);
          await waitForReplay(client, sid, true, `${label}: ${key}`);
          await pressKey(client, sid, key);
          await waitForReplay(client, sid, false, `${label}: ${key}`);
        }
        await pointerActivate(client, sid, SUMMARY);
        await waitForReplay(client, sid, true, `${label}: pointer`);
        await assertNoOverflow(client, sid, `${label}: expanded`);
        await pointerActivate(client, sid, SUMMARY);
        await waitForReplay(client, sid, false, `${label}: pointer`);

        await checkMapControls(client, sid, label);
        await assertMapLayout(client, sid, label);
        await assertNoOverflow(client, sid, `${label}: after map controls`);
        assert.deepEqual(page.runtimeExceptions, [], `${label}: no runtime exceptions`);
      } finally {
        await page.close();
      }
    });
  }
  console.log("First-use browser checks passed: desktop/mobile prompt, collapsed replay, Tab/Enter/Space and pointer toggles, no overflow, mounted map zoom, pan, and fit view.");
} finally {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  fs.rmSync(outDir, { recursive: true, force: true });
}
