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

// Live Surfaces geometry is recorded in specs/site-header.md. Keep this test
// offline: a remote deployment changing must not silently redefine the contract.
const CASES = [
  { width: 1280, gutter: 80, menu: false },
  { width: 1121, gutter: 24, menu: false },
  { width: 1120, gutter: 24, menu: true },
  { width: 821, gutter: 24, menu: true },
  { width: 820, gutter: 16, menu: true },
  { width: 390, gutter: 16, menu: true },
  { width: 320, gutter: 16, menu: true },
];
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-header-"));
let server;

async function measure(client, sessionId) {
  return evaluate(client, sessionId, `(async () => {
    await document.fonts.ready;
    const nav = document.querySelector('[data-surfaces-navigation]');
    const brand = nav.querySelector('.surfaces-navigation-identifier');
    const mark = brand.querySelector('.surfaces-brand-mark');
    const text = brand.querySelector('span');
    const menu = nav.querySelector('[data-surfaces-primary-menu-button]');
    const rect = el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right };
    };
    const links = [...nav.querySelectorAll('.surfaces-navigation-sections a')];
    return {
      header: rect(nav), shell: rect(nav.firstElementChild),
      brand: rect(brand), mark: rect(mark), text: rect(text), button: rect(menu),
      markLoaded: mark.tagName === 'IMG' && mark.complete && mark.naturalWidth > 0,
      markSource: mark.getAttribute('src'),
      links: links.map(el => ({ href: el.getAttribute('href'), rect: rect(el) })),
      menuVisible: menu.getBoundingClientRect().height > 0,
      layoutWidth: document.body.getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      fontLoaded: [...document.fonts].some(f => f.family === 'Header Inter' && f.status === 'loaded'),
      background: getComputedStyle(nav).backgroundColor,
      weight: getComputedStyle(brand).fontWeight,
    };
  })()`);
}

try {
  await buildSite(outDir);
  const local = await listenSiteLocalServer({ siteDir: outDir, host: "127.0.0.1", port: 0 });
  server = local.server;
  const origin = local.url;
  const fontResponse = await fetch(`${origin}/assets/fonts/inter-latin.woff2`);
  assert.equal(fontResponse.headers.get("content-type"), "font/woff2");

  await withChromium(async (client) => {
    for (const colorScheme of ["light", "dark"]) {
      for (const expected of CASES) {
        const page = await openPage(client, {
          url: `${origin}/`, colorScheme,
          viewport: { width: expected.width, height: 844, mobile: false },
        });
        const sid = page.sessionId;
        try {
          const home = await measure(client, sid);
          const label = `${expected.width}px ${colorScheme}`;
          // Classic scrollbars consume layout width; overlay scrollbars do not.
          const gutter = Math.max(expected.width <= 820 ? 16 : 24, (home.layoutWidth - 1120) / 2);
          assert.equal(home.header.height, 72, label);
          assert.equal(home.header.y, 0, label);
          assert.equal(home.header.width, home.layoutWidth, label);
          assert.equal(home.shell.x, gutter, label);
          assert.equal(home.shell.right, home.layoutWidth - gutter, label);
          assert.deepEqual(home.mark, { x: gutter, y: 20, width: 32, height: 32, right: gutter + 32 }, label);
          assert.equal(home.markLoaded, true, `${label}: the JudgmentKit mark must load`);
          assert.equal(home.markSource, "/favicon.svg", `${label}: the header and favicon share one mark`);
          assert.equal(home.text.x, gutter + 42, label);
          assert.equal(home.brand.y, 14, label);
          assert.equal(home.brand.height, 44, label);
          assert.equal(home.menuVisible, expected.menu, label);
          assert.equal(home.overflow, false, label);
          assert.equal(home.fontLoaded, true, label);
          assert.equal(home.background, "rgba(11, 13, 14, 0.98)", label);
          assert.equal(home.weight, "600", label);
          assert.equal(home.links.at(-2).href, "https://handbooks.surfaces.systems/", label);
          assert.equal(home.links.at(-1).href, "https://surfaces.systems/", label);
          if (expected.menu) {
            assert.equal(home.button.y, 14, label);
            assert.equal(home.button.height, 44, label);
            assert.equal(home.button.right, home.layoutWidth - gutter, label);
            await tabUntil(client, sid, '[data-surfaces-primary-menu-button]');
            const focus = await evaluate(client, sid, `getComputedStyle(document.activeElement).outlineStyle`);
            assert.equal(focus, "solid", `${label}: menu focus must be visible`);
            await pressKey(client, sid, "Enter");
            assert.equal(await evaluate(client, sid, `document.querySelector('[data-surfaces-primary-menu-button]').getAttribute('aria-expanded')`), "true");
            const menu = await evaluate(client, sid, `(() => {
              const el = document.querySelector('[data-surfaces-primary-menu-list]');
              return { hidden: el.hidden, top: el.getBoundingClientRect().top, count: el.querySelectorAll('a').length, last: el.querySelector('a:last-child').href };
            })()`);
            assert.deepEqual(menu, { hidden: false, top: 72, count: 8, last: "https://surfaces.systems/" });
            await pressKey(client, sid, "Tab");
            await pressKey(client, sid, "Escape");
            assert.equal(await evaluate(client, sid, `document.activeElement.matches('[data-surfaces-primary-menu-button]') && document.querySelector('[data-surfaces-primary-menu-list]').hidden`), true);
            await pointerActivate(client, sid, '[data-surfaces-primary-menu-button]');
            // Click below the menu, where the actual outside-click backdrop is exposed.
            for (const type of ["mousePressed", "mouseReleased"]) {
              await client.send("Input.dispatchMouseEvent", { type, x: expected.width / 2, y: 830, button: "left", clickCount: 1 }, sid);
            }
            assert.equal(await evaluate(client, sid, `document.querySelector('[data-surfaces-primary-menu-list]').hidden`), true);
            await pointerActivate(client, sid, '[data-surfaces-primary-menu-button]');
          }
          const docsSelector = expected.menu
            ? '.surfaces-primary-menu-list a[href="/docs/"]'
            : '.surfaces-navigation-sections a[href="/docs/"]';
          await pointerActivate(client, sid, docsSelector);
          await waitForExpression(client, sid, `location.pathname === '/docs/' && document.readyState === 'complete'`);
          const docs = await measure(client, sid);
          for (const key of ["header", "shell", "brand", "mark", "text", "button", "links"]) {
            assert.deepEqual(docs[key], home[key], `${label}: ${key} must not move on navigation`);
          }
          assert.equal(await evaluate(client, sid, `document.querySelector('[data-surfaces-primary-menu-list]').hidden`), true);
          await evaluate(client, sid, "window.scrollTo(0, 400)");
          await waitForExpression(client, sid, "scrollY > 0");
          assert.equal((await measure(client, sid)).header.y, 0, `${label}: sticky header`);
          // Return through browser history rather than reload to exercise pageshow.
          await evaluate(client, sid, "history.back()");
          await waitForExpression(client, sid, "location.pathname === '/' && document.readyState === 'complete'");
          assert.equal(await evaluate(client, sid, `document.querySelector('[data-surfaces-primary-menu-list]').hidden`), true);
          assert.deepEqual((await measure(client, sid)).mark, home.mark, `${label}: Back must preserve alignment`);
          assert.deepEqual(page.runtimeExceptions, []);
        } finally {
          await page.close();
        }
      }
    }
  });
  console.log("Header browser checks passed: 14 viewport/appearance cases, navigation, font loading, keyboard menu, dismissal, sticky positioning, and Back restoration.");
} finally {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  fs.rmSync(outDir, { recursive: true, force: true });
}
