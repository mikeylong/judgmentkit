import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildSite } from "../site/build-site.mjs";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";
import { SYSTEM_MAP_EDGES, SYSTEM_MAP_NODES } from "../site/system-map-model.mjs";
import {
  captureElementScreenshot, evaluate, openPage, pointerActivate, pressKey, tabUntil,
  waitForExpression, withChromium,
} from "./components/support/chromium-harness.mjs";

// The first-use disclosure must retain native keys while the embedded map is
// mounted. Its global pan shortcut previously consumed Space outside the map.
const VIEWPORTS = [
  { id: "desktop", width: 1280, height: 900, mobile: false },
  { id: "mobile", width: 390, height: 844, mobile: true },
];
const APPEARANCES = ["light", "dark"];
const evidenceOut = process.env.JUDGMENTKIT_SYSTEM_MAP_EVIDENCE_OUT;
const mapReceipts = [];
if (evidenceOut) fs.mkdirSync(evidenceOut, { recursive: true });
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

function assertMapInventory(observed, label) {
  assert.deepEqual(observed.nodes.map(node => node.id).sort(),
    SYSTEM_MAP_NODES.map(node => node.id).sort(), `${label}: all model nodes must be rendered`);
  assert.deepEqual(observed.edges.map(edge => edge.id).sort(),
    SYSTEM_MAP_EDGES.map(edge => edge.id).sort(), `${label}: all model arrows must be rendered`);
  assert.ok(observed.edges.every(edge => edge.length > 0 && edge.painted && edge.arrow),
    `${label}: each arrow needs a painted path and a marker; ${JSON.stringify(observed.edges)}`);
  const preflight = SYSTEM_MAP_NODES.filter(node =>
    node.data.tools?.includes("preflight_ui_implementation_candidate"));
  assert.equal(preflight.length, 1, `${label}: evidence preflight must be a distinct stage`);
  for (const [source, target] of [["evidence", preflight[0].id], [preflight[0].id, "implementation-review"]]) {
    const edge = SYSTEM_MAP_EDGES.find(edge => edge.source === source && edge.target === target);
    assert.ok(edge && observed.edges.some(rendered => rendered.id === edge.id),
      `${label}: the mounted route must connect ${source} to ${target}`);
  }
}

async function assertMountedMapInventory(client, sid, label) {
  const observed = await evaluate(client, sid, `(() => {
    const root = document.querySelector('${MAP}');
    return {
      nodes: [...root.querySelectorAll('.react-flow__node')].map(node => ({ id: node.dataset.id })),
      edges: [...root.querySelectorAll('.react-flow__edge')].map(edge => {
        const path = edge.querySelector('.react-flow__edge-path');
        const style = path && getComputedStyle(path);
        return { id: edge.dataset.id, length: path?.getTotalLength() || 0,
          painted: !!style && style.stroke !== 'none' && Number(style.strokeWidth.replace('px', '')) > 0,
          arrow: !!path?.getAttribute('marker-end') };
      }),
      fallbackHidden: document.querySelector('[data-system-map-fallback]').hidden,
      colors: { background: getComputedStyle(root.querySelector('.react-flow')).backgroundColor,
        text: getComputedStyle(root.querySelector('.rf-map-node')).color },
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
    };
  })()`);
  assertMapInventory(observed, label);
  assert.equal(observed.fallbackHidden, true, `${label}: mounted map replaces its fallback`);
  return observed;
}

const cardBoundsExpression = (selector, cardSelector, idExpression) => `(() => {
  return [...document.querySelectorAll(${JSON.stringify(selector)})].map(wrapper => {
    const card = wrapper.querySelector(${JSON.stringify(cardSelector)});
    const bounds = card.getBoundingClientRect();
    const textBounds = [...card.querySelectorAll('strong,code,span')].map(child => {
      const range = document.createRange();
      range.selectNodeContents(child);
      const rect = range.getBoundingClientRect();
      return { text: child.textContent.trim(), left: rect.left, top: rect.top,
        right: rect.right, bottom: rect.bottom };
    });
    return { id: ${idExpression}, width: bounds.width, height: bounds.height,
      clipped: textBounds.filter(rect => rect.left < bounds.left - 1 || rect.top < bounds.top - 1 ||
        rect.right > bounds.right + 1 || rect.bottom > bounds.bottom + 1),
      scrollOverflow: card.scrollWidth > card.clientWidth + 1 || card.scrollHeight > card.clientHeight + 1 };
  });
})()`;

async function assertReadableCards(client, sid, label) {
  for (let step = 0; step < 20; step += 1) {
    if ((await evaluate(client, sid, transformExpression)).zoom >= 1) break;
    const before = await evaluate(client, sid, transformExpression);
    await pointerActivate(client, sid, `${MAP} .react-flow__controls-zoomin`);
    await waitForExpression(client, sid, `(${transformExpression}).zoom > ${before.zoom + 0.001}`,
      { label: `${label}: zoom to readable card size` });
  }
  const transform = await evaluate(client, sid, transformExpression);
  assert.ok(transform.zoom >= 1, `${label}: card content must be checked at readable zoom`);
  const cards = await evaluate(client, sid, cardBoundsExpression(
    `${MAP} .react-flow__node`, '.rf-map-node,.rf-zone-node', 'wrapper.dataset.id'));
  assert.deepEqual(cards.filter(card => card.clipped.length || card.scrollOverflow), [],
    `${label}: card text must fit its bounds at readable zoom`);
  assert.equal(cards.length, SYSTEM_MAP_NODES.length, `${label}: every card must be measured`);
  await activateFitControl(client, sid, `${label}: fit after readable-card check`);
  await waitForFittedMap(client, sid, `${label}: fit after readable-card check`);
  return { transform, cards };
}

async function checkMapFallback(client, { url, viewport, appearance, label }) {
  // Disable application scripts before this navigation. Reading the rendered
  // fallback through CDP does not mount the React Flow application.
  const page = await openPage(client, { url: new URL('/404.html', url).href, viewport, colorScheme: appearance });
  const sid = page.sessionId;
  try {
    await client.send("Emulation.setScriptExecutionDisabled", { value: true }, sid);
    const loaded = client.waitFor("Page.loadEventFired", sid);
    await client.send("Page.navigate", { url }, sid);
    await loaded;
    await evaluate(client, sid, "document.fonts.ready");
    const observed = await evaluate(client, sid, `(() => {
      const fallback = document.querySelector('[data-system-map-fallback]');
      return {
        nodes: [...fallback.querySelectorAll('[data-node-id]')].map(node => ({ id: node.dataset.nodeId })),
        edges: [...fallback.querySelectorAll('[data-edge-id]')].map(edge => {
          const path = edge.querySelector('path');
          const style = getComputedStyle(path);
          return { id: edge.dataset.edgeId, length: path.getTotalLength(),
            painted: style.stroke !== 'none' && Number(style.strokeWidth.replace('px', '')) > 0,
            arrow: style.markerEnd !== 'none' };
        }),
        visible: fallback.checkVisibility(),
        applicationMounted: document.querySelector('${MAP}').dataset.systemMapFlowMounted === 'true',
        accessibleName: document.querySelector('[data-system-map-svg-fallback] title').textContent.trim(),
        colors: { background: getComputedStyle(fallback.closest('[data-system-map-flow-viewer]')).backgroundColor,
          text: getComputedStyle(fallback.querySelector('.map-node-text')).color },
        dark: matchMedia('(prefers-color-scheme: dark)').matches,
      };
    })()`);
    assertMapInventory(observed, `${label}: fallback`);
    assert.equal(observed.visible, true, `${label}: fallback must be visible without application scripts`);
    assert.equal(observed.applicationMounted, false, `${label}: this must exercise the actual fallback`);
    assert.equal(observed.dark, appearance === 'dark', `${label}: fallback uses the requested appearance`);
    assert.ok(observed.accessibleName, `${label}: fallback has an accessible name`);
    const cards = await evaluate(client, sid, cardBoundsExpression(
      '[data-system-map-fallback] [data-node-id]', '.map-node-content,.map-zone-content', 'wrapper.dataset.nodeId'));
    assert.deepEqual(cards.filter(card => card.clipped.length || card.scrollOverflow), [],
      `${label}: fallback text must fit its foreignObject bounds`);
    assert.equal(cards.length, SYSTEM_MAP_NODES.length);
    await assertNoOverflow(client, sid, `${label}: fallback`);
    assert.deepEqual(page.runtimeExceptions, [], `${label}: fallback has no runtime exceptions`);
    if (evidenceOut) await captureElementScreenshot(client, sid, '[data-system-map-fallback]',
      path.join(evidenceOut, `${viewport.id}-${appearance}-fallback.png`));
    return { ...observed, cards };
  } finally {
    await page.close();
  }
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
      // React Flow floors applied padding, which can shift a centered fit by
      // one CSS pixel. Retain that limit with a small measurement epsilon.
      centeredX: Math.abs((bounds.left + bounds.right) / 2 - width / 2) <= 1.01,
      centeredY: Math.abs((bounds.top + bounds.bottom) / 2 - height / 2) <= 1.01,
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

  // A fresh profile per presentation keeps this independent of owner storage
  // and of state left behind by the previous disclosure/map exercise.
  for (const viewport of VIEWPORTS) {
    for (const appearance of APPEARANCES) {
      await withChromium(async (client) => {
        const page = await openPage(client, {
          url: `${local.url}/docs/#first-use`, viewport, colorScheme: appearance,
        });
      const sid = page.sessionId;
      const label = `${viewport.id} ${viewport.width}px ${appearance}`;
      let mounted;
      let readable;
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
        mounted = await assertMountedMapInventory(client, sid, label);
        assert.equal(mounted.dark, appearance === 'dark', `${label}: mounted map uses the requested appearance`);
        readable = await assertReadableCards(client, sid, label);
        await assertMapLayout(client, sid, label);
        await assertNoOverflow(client, sid, `${label}: after map controls`);
        assert.deepEqual(page.runtimeExceptions, [], `${label}: no runtime exceptions`);
        if (evidenceOut) await captureElementScreenshot(client, sid, MAP,
          path.join(evidenceOut, `${viewport.id}-${appearance}-mounted.png`));
      } finally {
        await page.close();
      }
      const fallback = await checkMapFallback(client, {
        url: `${local.url}/docs/#system-map`, viewport, appearance, label,
      });
      mapReceipts.push({ viewport: viewport.id, appearance, mounted, readable, fallback });
    });
    }
  }
  for (const viewport of VIEWPORTS) {
    const light = mapReceipts.find(receipt => receipt.viewport === viewport.id && receipt.appearance === 'light');
    const dark = mapReceipts.find(receipt => receipt.viewport === viewport.id && receipt.appearance === 'dark');
    for (const kind of ['mounted', 'fallback']) {
      assert.notEqual(light[kind].colors.background, dark[kind].colors.background,
        `${viewport.id}: ${kind} background responds to appearance`);
      assert.notEqual(light[kind].colors.text, dark[kind].colors.text,
        `${viewport.id}: ${kind} text responds to appearance`);
    }
  }
  if (evidenceOut) fs.writeFileSync(path.join(evidenceOut, "system-map-browser-receipts.json"),
    `${JSON.stringify({ status: "pass", presentations: mapReceipts }, null, 2)}\n`);
  console.log("First-use browser checks passed: desktop/mobile Light/Dark prompt and disclosure, mounted map nodes/arrows/preflight route, readable card bounds, zoom/pan/fit, no-JavaScript fallback, no overflow or runtime exceptions.");
} finally {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  fs.rmSync(outDir, { recursive: true, force: true });
}
