import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildSite } from "../site/build-site.mjs";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";
import {
  captureScreenshot, evaluate, getAxNode, openPage, pointerActivate, pressKey, tabUntil,
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
  { width: 320, gutter: 16, menu: true, scrollbarMode: "classic-15px" },
];
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-header-"));
let server;
const artifactDir = process.env.JUDGMENTKIT_BRAND_QA_DIR;
if (artifactDir) fs.mkdirSync(artifactDir, { recursive: true });
const brandQa = [];
const menuQa = [];
const schemeChanges = [];
const LOCKUP_RATIO = 425.013342449 / 109;

async function applyScrollbarMode(client, sessionId, mode) {
  if (mode !== 'classic-15px') return;
  await evaluate(client, sessionId, `(() => {
    let style = document.querySelector('[data-test-classic-scrollbar]');
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-test-classic-scrollbar', '');
      document.head.append(style);
    }
    style.textContent = 'html::-webkit-scrollbar { width: 15px; height: 15px; }';
  })()`);
}

async function measure(client, sessionId) {
  return evaluate(client, sessionId, `(async () => {
    const imageSelectors = ['.surfaces-brand-lockup', '.site-brand-lockup'];
    const readiness = () => ({
      document: document.readyState, fonts: document.fonts.status,
      images: imageSelectors.map(selector => {
        const image = document.querySelector(selector);
        return { selector, src: image?.getAttribute('src'), currentSrc: image?.currentSrc,
          complete: image?.complete, width: image?.naturalWidth, height: image?.naturalHeight };
      }),
    });
    const imagesReady = state => state.document === 'complete' && state.fonts === 'loaded'
      && state.images.every(image => image.currentSrc && image.complete && image.width > 0 && image.height > 0);
    const layout = () => ['[data-surfaces-navigation]', '.surfaces-navigation-identifier', ...imageSelectors]
      .map(selector => {
        const bounds = document.querySelector(selector)?.getBoundingClientRect();
        return bounds && [bounds.x, bounds.y, bounds.width, bounds.height];
      });
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const deadline = performance.now() + 10000;
    const notReady = () => new Error('Brand images/fonts/layout not ready after 10000ms: ' + JSON.stringify(readiness()));
    let timer;
    try {
      await Promise.race([
        (async () => {
          while (performance.now() < deadline) {
            const state = readiness();
            if (imagesReady(state)) {
              try {
                await Promise.all([document.fonts.ready, ...imageSelectors.map(selector => document.querySelector(selector).decode())]);
              } catch (error) {
                const changed = readiness();
                if (JSON.stringify(changed.images) === JSON.stringify(state.images)) {
                  throw new Error('Brand image decode failed: ' + JSON.stringify(changed), { cause: error });
                }
                await new Promise(resolve => setTimeout(resolve, 25));
                continue;
              }
              const before = layout();
              await frame();
              await frame();
              const after = readiness();
              if (imagesReady(after) && after.images.every((image, index) => image.currentSrc === state.images[index].currentSrc)
                && before.every(bounds => bounds && bounds[2] > 0 && bounds[3] > 0)
                && JSON.stringify(before) === JSON.stringify(layout())) return;
            }
            await new Promise(resolve => setTimeout(resolve, 25));
          }
          throw notReady();
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(notReady()), 10000); }),
      ]);
    } finally { clearTimeout(timer); }
    const nav = document.querySelector('[data-surfaces-navigation]');
    const brand = nav.querySelector('.surfaces-navigation-identifier');
    const lockup = brand.querySelector('.surfaces-brand-lockup');
    const footer = document.querySelector('.site-footer');
    const footerBrand = footer.querySelector('.site-footer-brand');
    const footerLockup = footerBrand.querySelector('.site-brand-lockup');
    const menu = nav.querySelector('[data-surfaces-primary-menu-button]');
    const rect = el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right };
    };
    const background = el => {
      for (let current = el; current; current = current.parentElement) {
        const color = getComputedStyle(current).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
      }
      return 'transparent';
    };
    const image = el => ({
      src: el.getAttribute('src'), currentSrc: new URL(el.currentSrc).pathname,
      loaded: el.complete && el.naturalWidth > 0,
      naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight,
      naturalRatio: el.naturalWidth / el.naturalHeight,
      rendered: rect(el), renderedRatio: el.getBoundingClientRect().width / el.getBoundingClientRect().height,
      filter: getComputedStyle(el).filter, objectFit: getComputedStyle(el).objectFit,
    });
    const links = [...nav.querySelectorAll('.surfaces-navigation-sections a')];
    return {
      header: rect(nav), shell: rect(nav.firstElementChild),
      brand: rect(brand), lockup: rect(lockup), button: rect(menu),
      headerImage: image(lockup), footerImage: image(footerLockup),
      headerAccessibleName: brand.getAttribute('aria-label'), footerAccessibleName: footerBrand.getAttribute('aria-label'),
      footerTarget: { ...rect(footerBrand), href: footerBrand.getAttribute('href') },
      headerBackground: background(nav), footerBackground: background(footer),
      links: links.map(el => ({ href: el.getAttribute('href'), rect: rect(el) })),
      menuVisible: menu.getBoundingClientRect().height > 0,
      layoutWidth: document.body.getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      fontLoaded: [...document.fonts].some(f => f.family === 'Header Inter' && f.status === 'loaded'),
      background: getComputedStyle(nav).backgroundColor,
      separateWordmark: brand.querySelector('span') !== null,
    };
  })()`);
}

async function captureBrandElement(client, sessionId, selector, outputPath) {
  const clip = await evaluate(client, sessionId, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const bounds = element.getBoundingClientRect();
    return { x: bounds.left + scrollX, y: bounds.top + scrollY, width: bounds.width, height: bounds.height, scale: 1 };
  })()`);
  // Every brand target fits in the viewport. Keeping capture within it prevents
  // screenshot capture from hiding a classic scrollbar and changing the layout.
  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true, captureBeyondViewport: false, clip,
  }, sessionId);
  assert.ok(screenshot.data, `${selector}: screenshot pixels`);
  fs.writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
}

async function assertBrand(client, sessionId, measurement, context) {
  const label = `${context.width}px ${context.colorScheme} ${context.route} ${context.scrollbarMode}`;
  assert.equal(measurement.headerImage.currentSrc, '/assets/brand/judgmentkit-lockup-reversed.svg', `${label}: fixed ink header uses reversed asset`);
  assert.equal(measurement.footerImage.currentSrc, context.colorScheme === 'dark'
    ? '/assets/brand/judgmentkit-lockup-reversed.svg' : '/assets/brand/judgmentkit-lockup.svg', `${label}: footer follows its surface`);
  assert.equal(measurement.footerBackground, context.colorScheme === 'dark' ? 'rgb(16, 19, 18)' : 'rgb(248, 247, 242)', label);
  assert.equal(measurement.separateWordmark, false, `${label}: whole outlined lockup`);
  for (const image of [measurement.headerImage, measurement.footerImage]) {
    assert.equal(image.loaded, true, `${label}: lockup loaded`);
    assert.equal(image.filter, 'none', `${label}: no recoloring`);
    assert.equal(image.objectFit, 'contain', `${label}: full SVG canvas retained`);
    assert.ok(Math.abs(image.renderedRatio - LOCKUP_RATIO) < 0.002, `${label}: natural aspect ratio`);
    assert.ok(image.rendered.x >= 0 && image.rendered.right <= measurement.layoutWidth, `${label}: image bounds inside page`);
  }
  assert.ok(measurement.footerTarget.height >= 44, `${label}: footer home target`);
  assert.equal(measurement.footerTarget.href, '/', label);
  for (const selector of ['.surfaces-navigation-identifier', '.site-footer-brand']) {
    const node = await getAxNode(client, sessionId, selector);
    assert.equal(node.role, 'link', label);
    assert.equal(node.name, 'JudgmentKit home', `${label}: accessible home link`);
    measurement[selector === '.site-footer-brand' ? 'footerAccessibility' : 'headerAccessibility'] = { role: node.role, name: node.name };
  }
  assert.equal(measurement.overflow, false, label);
  brandQa.push({ ...context, ...measurement });
  if (artifactDir && [1280, 390, 320].includes(context.width)) {
    const prefix = `${context.route === '/' ? 'home' : 'docs'}-${context.width}-${context.colorScheme}${context.scrollbarMode === 'classic-15px' ? '-classic-15px' : ''}`;
    await captureScreenshot(client, sessionId, path.join(artifactDir, `${prefix}.png`));
    await captureBrandElement(client, sessionId, '[data-surfaces-navigation]', path.join(artifactDir, `${prefix}-header.png`));
    await captureBrandElement(client, sessionId, '.surfaces-navigation-identifier', path.join(artifactDir, `${prefix}-header-brand.png`));
    await captureBrandElement(client, sessionId, '.site-footer', path.join(artifactDir, `${prefix}-footer.png`));
    await captureBrandElement(client, sessionId, '.site-footer-brand', path.join(artifactDir, `${prefix}-footer-brand.png`));
    await evaluate(client, sessionId, 'window.scrollTo(0, 0)');
  }
}

async function assertVisibleExternalLink(client, sessionId, label) {
  const links = await evaluate(client, sessionId, `(() => {
    return [...document.querySelectorAll('[data-surfaces-navigation] a[target="_blank"]')]
      .filter(link => link.getBoundingClientRect().height > 0)
      .map(link => {
        const icon = link.querySelector('.external-link-icon');
        const bounds = icon?.getBoundingClientRect();
        return {
          title: link.title,
          rel: [...link.relList].sort(),
          decorative: icon?.getAttribute('aria-hidden'),
          width: bounds?.width,
          height: bounds?.height,
          color: icon && getComputedStyle(icon).color,
          linkColor: getComputedStyle(link).color,
        };
      });
  })()`);
  assert.equal(links.length, 1, `${label}: one visible Handbooks link`);
  const [link] = links;
  assert.equal(link.title, "Opens in a new tab", label);
  assert.deepEqual(link.rel, ["noopener", "noreferrer"], label);
  assert.equal(link.decorative, "true", label);
  assert.equal(link.width, 14, `${label}: visible external-link icon width`);
  assert.equal(link.height, 14, `${label}: visible external-link icon height`);
  assert.equal(link.color, link.linkColor, `${label}: icon follows link color`);
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
          await applyScrollbarMode(client, sid, expected.scrollbarMode);
          const home = await measure(client, sid);
          const label = `${expected.width}px ${colorScheme} ${expected.scrollbarMode ?? 'system'}`;
          if (expected.scrollbarMode === 'classic-15px') {
            assert.equal(home.layoutWidth, expected.width - 15, `${label}: fixture reserves a real scrollbar gutter`);
          }
          // Classic scrollbars consume layout width; overlay scrollbars do not.
          const gutter = Math.max(expected.width <= 820 ? 16 : 24, (home.layoutWidth - 1120) / 2);
          assert.equal(home.header.height, 72, label);
          assert.equal(home.header.y, 0, label);
          assert.equal(home.header.width, home.layoutWidth, label);
          assert.equal(home.shell.x, gutter, label);
          assert.equal(home.shell.right, home.layoutWidth - gutter, label);
          const lockupHeight = expected.width < 360 ? 44 : expected.width <= 820 ? 48 : 56;
          assert.equal(home.lockup.x, gutter, label);
          assert.equal(home.lockup.height, lockupHeight, label);
          assert.equal(home.brand.y, (72 - lockupHeight) / 2, label);
          assert.equal(home.brand.height, lockupHeight, label);
          await assertBrand(client, sid, home, { route: '/', width: expected.width, colorScheme, scrollbarMode: expected.scrollbarMode ?? 'system' });
          if (expected.width === 390) {
            const alternate = colorScheme === 'light' ? 'dark' : 'light';
            await client.send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-color-scheme', value: alternate }] }, sid);
            await waitForExpression(client, sid, `document.querySelector('.site-brand-lockup').currentSrc && new URL(document.querySelector('.site-brand-lockup').currentSrc).pathname === '${alternate === 'dark' ? '/assets/brand/judgmentkit-lockup-reversed.svg' : '/assets/brand/judgmentkit-lockup.svg'}'`);
            assert.equal((await measure(client, sid)).headerImage.currentSrc, '/assets/brand/judgmentkit-lockup-reversed.svg');
            schemeChanges.push({ width: expected.width, from: colorScheme, to: alternate, footerUpdated: true, fixedInkHeaderPreserved: true });
            await client.send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-color-scheme', value: colorScheme }] }, sid);
            await waitForExpression(client, sid, `document.querySelector('.site-brand-lockup').currentSrc && new URL(document.querySelector('.site-brand-lockup').currentSrc).pathname === '${colorScheme === 'dark' ? '/assets/brand/judgmentkit-lockup-reversed.svg' : '/assets/brand/judgmentkit-lockup.svg'}'`);
          }
          assert.equal(home.menuVisible, expected.menu, label);
          assert.equal(home.overflow, false, label);
          assert.equal(home.fontLoaded, true, label);
          assert.equal(home.background, "rgba(11, 13, 14, 0.98)", label);

          assert.equal(home.links.at(-2).href, "https://handbooks.surfaces.systems/", label);
          assert.equal(home.links.at(-1).href, "https://surfaces.systems/", label);
          if (!expected.menu) await assertVisibleExternalLink(client, sid, label);
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
            await assertVisibleExternalLink(client, sid, label);
            menuQa.push({ width: expected.width, colorScheme, scrollbarMode: expected.scrollbarMode ?? 'system', ...menu });
            if (artifactDir && expected.width === 390) {
              await captureScreenshot(client, sid, path.join(artifactDir, `home-390-${colorScheme}-menu-open.png`));
            }
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
          await applyScrollbarMode(client, sid, expected.scrollbarMode);
          const docs = await measure(client, sid);
          await assertBrand(client, sid, docs, { route: '/docs/', width: expected.width, colorScheme, scrollbarMode: expected.scrollbarMode ?? 'system' });
          for (const key of ["header", "shell", "brand", "lockup", "button", "links"]) {
            assert.deepEqual(docs[key], home[key], `${label}: ${key} must not move on navigation`);
          }
          assert.equal(await evaluate(client, sid, `document.querySelector('[data-surfaces-primary-menu-list]').hidden`), true);
          await evaluate(client, sid, "window.scrollTo(0, 400)");
          await waitForExpression(client, sid, "scrollY > 0");
          assert.equal((await measure(client, sid)).header.y, 0, `${label}: sticky header`);
          // Return through browser history rather than reload to exercise pageshow.
          await evaluate(client, sid, "history.back()");
          await waitForExpression(client, sid, "location.pathname === '/' && document.readyState === 'complete'");
          await applyScrollbarMode(client, sid, expected.scrollbarMode);
          const restored = await measure(client, sid);
          assert.equal(await evaluate(client, sid, `document.querySelector('[data-surfaces-primary-menu-list]').hidden`), true);
          assert.deepEqual(restored.lockup, home.lockup, `${label}: Back must preserve alignment`);
          assert.deepEqual(page.runtimeExceptions, []);
        } finally {
          await page.close();
        }
      }
    }
  });
  if (artifactDir) fs.writeFileSync(path.join(artifactDir, 'browser-qa.json'), JSON.stringify({ status: 'passed', canonicalRatio: LOCKUP_RATIO, cases: brandQa, menuCases: menuQa, runtimeSchemeChanges: schemeChanges }, null, 2) + '\n');
  console.log("Header/footer browser checks passed: 14 system viewport/appearance cases plus 2 forced classic-scrollbar cases on home and docs, canonical asset selection and ratios, accessible names, runtime theme changes, external-link indicators, keyboard menu, dismissal, sticky positioning, and Back restoration.");
} finally {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  fs.rmSync(outDir, { recursive: true, force: true });
}
