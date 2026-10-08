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

const mapMeasurementExpression = `(() => {
  const hostElement = document.querySelector('${MAP} .react-flow');
  const host = hostElement.getBoundingClientRect();
  const ancestors = [];
  for (let element = hostElement; element && ancestors.length < 8; element = element.parentElement) {
    ancestors.push({ tag: element.tagName, id: element.id, class: element.className,
      scrollLeft: element.scrollLeft, scrollTop: element.scrollTop,
      clientWidth: element.clientWidth, clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight });
  }
  const nodes = [...document.querySelectorAll('${MAP} .react-flow__node')].map(el => {
    const rect = el.getBoundingClientRect();
    return { id: el.dataset.id, visible: el.checkVisibility(),
      left: rect.left - host.left, top: rect.top - host.top,
      right: rect.right - host.left, bottom: rect.bottom - host.top,
      width: rect.width, height: rect.height };
  });
  return { transform: ${transformExpression}, width: host.width, height: host.height, nodes, ancestors,
    dimensions: { offsetWidth: hostElement.offsetWidth, offsetHeight: hostElement.offsetHeight,
      clientWidth: hostElement.clientWidth, clientHeight: hostElement.clientHeight,
      scrollWidth: hostElement.scrollWidth, scrollHeight: hostElement.scrollHeight },
    bounds: { left: Math.min(...nodes.map(node => node.left)),
      top: Math.min(...nodes.map(node => node.top)),
      right: Math.max(...nodes.map(node => node.right)),
      bottom: Math.max(...nodes.map(node => node.bottom)) } };
})()`;

async function waitForFittedMap(client, sid, label) {
  // onInit's mounted marker precedes React Flow's queued fit and node
  // measurements. Observe current rendered bounds across layout frames instead
  // of treating the first mounted transform as the fitted reference.
  try {
    await waitForExpression(client, sid, `(async () => {
    const before = ${mapMeasurementExpression};
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const after = ${mapMeasurementExpression};
    const { bounds, width, height, nodes } = after;
    const sameNodes = before.nodes.length === nodes.length && nodes.every((node, index) =>
      node.id === before.nodes[index].id && node.visible === before.nodes[index].visible);
    const nodeDelta = sameNodes ? Math.max(0, ...nodes.flatMap((node, index) =>
      ['left', 'top', 'right', 'bottom', 'width', 'height'].map(key =>
        Math.abs(node[key] - before.nodes[index][key])))) : Infinity;
    const deltas = { node: nodeDelta, width: Math.abs(width - before.width),
      height: Math.abs(height - before.height),
      x: Math.abs(after.transform.x - before.transform.x),
      y: Math.abs(after.transform.y - before.transform.y),
      zoom: Math.abs(after.transform.zoom - before.transform.zoom) };
    const checks = {
      stable: sameNodes && deltas.node < 1 && deltas.width < 1 && deltas.height < 1
        && deltas.x < 1 && deltas.y < 1 && deltas.zoom < 0.001,
      measured: nodes.length > 0 && nodes.every(node => node.visible && node.width > 0 && node.height > 0),
      enclosed: bounds.left >= -1 && bounds.top >= -1
        && bounds.right <= width + 1 && bounds.bottom <= height + 1,
      centeredX: Math.abs((bounds.left + bounds.right) / 2 - width / 2) < 1,
      centeredY: Math.abs((bounds.top + bounds.bottom) / 2 - height / 2) < 1,
    };
    globalThis.__jkFirstUseFitObservation = { before, after, checks, deltas,
      click: { before: globalThis.__jkFirstUseBeforeFit, events: globalThis.__jkFirstUseFitClicks },
      viewport: { innerWidth, innerHeight, clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight, scrollX, scrollY,
        visual: visualViewport ? { width: visualViewport.width, height: visualViewport.height,
          scale: visualViewport.scale, offsetLeft: visualViewport.offsetLeft,
          offsetTop: visualViewport.offsetTop } : null },
      fitControl: (() => {
        const button = document.querySelector('${MAP} .react-flow__controls-fitview');
        const rect = button.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          hitTag: hit?.tagName, hitClass: hit?.getAttribute('class'),
          hitsButton: hit === button || button.contains(hit) };
      })() };
    return Object.values(checks).every(Boolean);
  })()`, { label: `${label}: fit centers and encloses the current measured nodes after layout settles` });
  } catch (error) {
    const observed = await evaluate(client, sid, "globalThis.__jkFirstUseFitObservation");
    throw new Error(`${error.message}\nFit geometry: ${JSON.stringify(observed)}`, { cause: error });
  }
  if (process.env.JUDGMENTKIT_FIRST_USE_FIT_DIAGNOSTICS === "1") {
    console.log(JSON.stringify({ label, fit: await evaluate(client, sid, "globalThis.__jkFirstUseFitObservation") }));
  }
}

async function activateFitControl(client, sid, label) {
  await evaluate(client, sid, `(() => {
    globalThis.__jkFirstUseFitClicks = [];
    globalThis.__jkFirstUseBeforeFit = { geometry: ${mapMeasurementExpression},
      dragClickSuppressionPending: (window.__on ?? []).some(listener => listener.type === 'click' && listener.name === 'drag') };
  })()`);
  await pointerActivate(client, sid, `${MAP} .react-flow__controls-fitview`);
  const click = await evaluate(client, sid, `({ before: globalThis.__jkFirstUseBeforeFit,
    after: ${mapMeasurementExpression}, events: globalThis.__jkFirstUseFitClicks })`);
  assert.equal(click.events.length, 1, `${label}: one real fit click must reach its button; ${JSON.stringify(click)}`);
  assert.equal(click.events[0].trusted, true, `${label}: fit click must be trusted`);
}

async function checkMapControls(client, sid, label) {
  await evaluate(client, sid, `document.querySelector('${MAP} .react-flow__controls-fitview').addEventListener('click', event => {
    globalThis.__jkFirstUseFitClicks.push({ trusted: event.isTrusted, defaultPrevented: event.defaultPrevented });
  }, { capture: true })`);
  await activateFitControl(client, sid, `${label}: initial fit`);
  await waitForFittedMap(client, sid, `${label}: initial fit`);
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

  // D3 suppresses the drag's trailing click until its queued release cleanup.
  // Let that browser task finish before the next deliberate pointer action.
  await evaluate(client, sid,
    "new Promise(resolve => setTimeout(() => requestAnimationFrame(resolve), 0))");
  await activateFitControl(client, sid, `${label}: fit after pan`);
  await waitForFittedMap(client, sid, `${label}: fit after pan`);
  await waitForExpression(client, sid, `(() => {
    const after = ${transformExpression};
    return Math.abs(after.x - ${baseline.x}) < 1 && Math.abs(after.y - ${baseline.y}) < 1
      && Math.abs(after.zoom - ${baseline.zoom}) < 0.001;
  })()`, { label: `${label}: fit view restores the stable fitted transform after pan` });
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
