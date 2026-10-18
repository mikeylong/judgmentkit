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
  { width: 1120, gutter: 24, menu: false },
  { width: 821, gutter: 24, menu: false },
  { width: 820, gutter: 16, menu: true },
  { width: 621, gutter: 16, menu: true },
  { width: 620, gutter: 16, menu: true },
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
    const bodyStyle = getComputedStyle(document.body);
    const headingStyle = getComputedStyle(document.querySelector('main h1'));
    const subheadingStyle = getComputedStyle(document.querySelector('main h2'));
    const hero = document.querySelector('.homepage-hero');
    const action = document.querySelector('.hero-action');
    const scene = document.querySelector('.homepage-scene');
    const problem = document.querySelector('.homepage-problem');
    const workflow = document.querySelector('.family-workflow-row');
    const rowGap = section => {
      if (!section) return null;
      const heading = section.querySelector('.homepage-section-heading').getBoundingClientRect();
      const row = section.querySelector('.family-problem-row,.family-workflow-row').getBoundingClientRect();
      return row.top - heading.bottom;
    };
    const detailPage = document.querySelector('.docs-page,.design-system-page');
    const detailLayout = document.querySelector('.doc-layout,.design-system-layout');
    return {
      header: rect(nav), shell: rect(nav.firstElementChild),
      brand: rect(brand), lockup: rect(lockup), button: rect(menu),
      headerImage: image(lockup), footerImage: image(footerLockup),
      headerAccessibleName: brand.getAttribute('aria-label'), footerAccessibleName: footerBrand.getAttribute('aria-label'),
      footerTarget: { ...rect(footerBrand), href: footerBrand.getAttribute('href') },
      footerItems: [...footer.querySelector('.site-footer-inner').children].map(rect),
      footerParagraphMargin: getComputedStyle(footer.querySelector('.site-footer-description')).margin,
      menuLabelClip: getComputedStyle(menu.querySelector('span')).clipPath,
      menuGlyphs: [...menu.querySelectorAll('path')].filter(path => getComputedStyle(path).display !== 'none').map(path => path.getAttribute('d')),
      headerBackground: background(nav), footerBackground: background(footer),
      links: links.map(el => ({ href: el.getAttribute('href'), rect: rect(el) })),
      menuVisible: menu.getBoundingClientRect().height > 0,
      layoutWidth: document.body.getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      fontLoaded: [...document.fonts].some(f => f.family === 'Header Inter' && f.status === 'loaded'),
      background: getComputedStyle(nav).backgroundColor,
      separateWordmark: brand.querySelector('span') !== null,
      presentation: {
        bodyFont: bodyStyle.fontFamily, fontSize: bodyStyle.fontSize, lineHeight: bodyStyle.lineHeight,
        detailPadding: detailPage && { outer: getComputedStyle(detailPage).paddingTop, inner: getComputedStyle(detailLayout).paddingTop },
        fontSmoothing: bodyStyle.getPropertyValue('-webkit-font-smoothing'),
        footerDescriptionColor: getComputedStyle(footer.querySelector('.site-footer-description')).color,
        bodyBackground: bodyStyle.backgroundColor,
        shellWidth: bodyStyle.getPropertyValue('--site-shell-width').trim(),
        gutter: bodyStyle.getPropertyValue('--site-gutter').trim(),
        headingSize: headingStyle.fontSize, headingWeight: headingStyle.fontWeight,
        headingLineHeight: headingStyle.lineHeight,
        headingTracking: headingStyle.letterSpacing,
        subheadingSize: subheadingStyle.fontSize, subheadingWeight: subheadingStyle.fontWeight,
        subheadingLineHeight: subheadingStyle.lineHeight,
        heroBackground: hero && getComputedStyle(hero).backgroundColor,
        action: action && { height: rect(action).height, size: getComputedStyle(action).fontSize,
          weight: getComputedStyle(action).fontWeight, radius: getComputedStyle(action).borderRadius },
        hero: hero && rect(hero),
        scene: scene && { ...rect(scene), position: getComputedStyle(scene).position, radius: getComputedStyle(scene).borderRadius,
          border: getComputedStyle(scene).borderWidth, fit: getComputedStyle(scene).objectFit,
          crop: getComputedStyle(scene).objectPosition, loaded: scene.complete && scene.naturalWidth > 0,
          src: scene.getAttribute('src') },
        separateImageCard: document.querySelector('.homepage-hero-visual,.homepage-hero-art') !== null,
        copyStacks: document.querySelectorAll('.homepage-hero-copy').length,
        actions: hero && hero.querySelectorAll('.hero-action').length,
        nextSectionY: problem && problem.getBoundingClientRect().top,
        problemItems: document.querySelectorAll('.family-problem-row > li').length,
        problemRowGap: rowGap(problem),
        workflowRowGap: rowGap(document.querySelector('.homepage-workflow')),
        sectionEyebrowColor: problem && getComputedStyle(problem.querySelector('.eyebrow')).color,
        workflow: workflow && [...workflow.children].map(step => {
          const title = step.querySelector('h3'), description = step.querySelector('p'), ordinal = step.querySelector('.family-ordinal'), icon = step.querySelector('.family-workflow-icon');
          return { bounds: rect(step), title: rect(title), icon: rect(icon), ordinal: rect(ordinal),
            titleSize: getComputedStyle(title).fontSize, titleWeight: getComputedStyle(title).fontWeight,
            descriptionSize: getComputedStyle(description).fontSize, ordinalSize: getComputedStyle(ordinal).fontSize,
            radius: getComputedStyle(step).borderRadius, shadow: getComputedStyle(step).boxShadow };
        }),
      },
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
  assert.equal(measurement.footerImage.currentSrc, '/assets/brand/judgmentkit-lockup-reversed.svg', `${label}: fixed Ink footer uses reversed asset`);
  assert.equal(measurement.footerBackground, 'rgb(11, 13, 14)', label);
  const presentation = measurement.presentation;
  assert.ok(presentation.bodyFont.includes('Header Inter'), `${label}: shared Inter text`);
  assert.equal(presentation.fontSize, '16px', label);
  assert.equal(presentation.lineHeight, '23.2px', label);
  assert.equal(presentation.fontSmoothing, 'antialiased', `${label}: Surfaces text rendering`);
  assert.equal(presentation.footerDescriptionColor, 'rgb(139, 144, 150)', `${label}: quiet Nickel footer copy`);
  assert.equal(presentation.shellWidth, '1120px', label);
  assert.equal(presentation.gutter, context.width <= 820 ? '16px' : '24px', label);
  assert.equal(presentation.bodyBackground, context.colorScheme === 'dark' ? 'rgb(11, 13, 14)' : 'rgb(247, 246, 242)', label);
  assert.equal(presentation.headingSize, context.width <= 620 ? '32px' : '40px', label);
  assert.equal(presentation.headingWeight, '600', label);
  assert.equal(presentation.headingLineHeight, context.width <= 620 ? '36.8px' : '46px', label);
  assert.equal(presentation.headingTracking, 'normal', label);
  assert.equal(presentation.subheadingSize, context.width <= 620 ? '24px' : '32px', label);
  assert.equal(presentation.subheadingWeight, '600', label);
  assert.equal(presentation.subheadingLineHeight, context.width <= 620 ? '27.6px' : '36.8px', label);
  if (context.route === '/docs/') {
    assert.ok(presentation.detailPadding, `${label}: detailed-page wrapper exists`);
    assert.equal(presentation.detailPadding.inner, '0px', `${label}: nested layout must not add a second top inset`);
    const outerInset = Number.parseFloat(presentation.detailPadding.outer);
    assert.ok(outerInset >= 36 && outerInset <= 62, `${label}: outer wrapper uses the intended page inset`);
  }
  if (context.route === '/') {
    assert.equal(presentation.heroBackground, 'rgb(11, 13, 14)', `${label}: fixed Ink hero`);
    assert.deepEqual(presentation.action, { height: 48, size: '14px', weight: '500', radius: '4px' }, label);
    assert.equal(presentation.separateImageCard, false, label);
    assert.equal(presentation.copyStacks, 1, label);
    assert.equal(presentation.actions, 2, label);
    assert.equal(presentation.scene.loaded, true, label);
    assert.equal(presentation.scene.src, '/assets/judgment-lens-environment-v2.webp', label);
    assert.equal(presentation.scene.position, 'absolute', label);
    assert.equal(presentation.scene.fit, 'cover', label);
    assert.equal(presentation.scene.crop, context.width <= 820 ? '72% 50%' : '56% 50%', label);
    assert.equal(presentation.scene.radius, '0px', label);
    assert.equal(presentation.scene.border, '0px', label);
    assert.equal(presentation.scene.x, 0, label);
    assert.equal(presentation.scene.width, measurement.layoutWidth, label);
    assert.equal(presentation.scene.height, presentation.hero.height, label);
    if (context.width > 820) assert.equal(presentation.nextSectionY, 632, `${label}: desktop header72 + hero560`);
    else assert.ok(presentation.hero.height >= 528, `${label}: mobile environment retains its minimum scene height`);
    assert.equal(presentation.problemItems, 3, label);
    assert.equal(presentation.problemRowGap, 40, `${label}: problem heading-to-row gap`);
    assert.equal(presentation.workflowRowGap, 48, `${label}: workflow heading-to-row gap`);
    assert.equal(presentation.sectionEyebrowColor, context.colorScheme === 'dark' ? 'rgb(139, 144, 150)' : 'rgb(85, 91, 96)', `${label}: muted section label`);
    assert.equal(presentation.workflow.length, 5, label);
    for (const step of presentation.workflow) {
      assert.equal(step.titleSize, '20px', label);
      assert.equal(step.titleWeight, '600', label);
      assert.equal(step.descriptionSize, '14px', label);
      assert.equal(step.ordinalSize, '12px', label);
      assert.equal(step.radius, '0px', label);
      assert.equal(step.shadow, 'none', label);
      assert.equal(step.icon.width, context.width <= 820 ? 40 : 44, label);
      if (context.width <= 820) {
        assert.equal(step.icon.x, step.ordinal.x, `${label}: icon and ordinal left rail`);
        assert.ok(step.title.x >= step.icon.right + 15, `${label}: workflow text right of left rail`);
      }
    }
    const positions = presentation.workflow.map(step => step.bounds.x);
    assert.equal(new Set(positions).size, context.width <= 820 ? 1 : 5, `${label}: connected workflow follows viewport`);
  }
  assert.equal(measurement.separateWordmark, false, `${label}: whole outlined lockup`);
  for (const image of [measurement.headerImage, measurement.footerImage]) {
    assert.equal(image.loaded, true, `${label}: lockup loaded`);
    assert.equal(image.filter, 'none', `${label}: no recoloring`);
    assert.equal(image.objectFit, 'contain', `${label}: full SVG canvas retained`);
    assert.ok(Math.abs(image.renderedRatio - LOCKUP_RATIO) < 0.002, `${label}: natural aspect ratio`);
    assert.ok(image.rendered.x >= 0 && image.rendered.right <= measurement.layoutWidth, `${label}: image bounds inside page`);
  }
  assert.ok(measurement.footerTarget.height >= 44, `${label}: footer home target`);
  assert.equal(measurement.footerImage.rendered.height, 56, `${label}: full footer lockup height`);
  assert.equal(measurement.footerParagraphMargin, '0px', `${label}: footer copy adds no margin`);
  if (context.width <= 820) {
    for (let index = 1; index < measurement.footerItems.length; index++) {
      const previous = measurement.footerItems[index - 1], current = measurement.footerItems[index];
      assert.equal(current.y - previous.y - previous.height, 12, `${label}: compact footer rhythm`);
    }
  }
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

async function assertPrimaryDestinations(client, sessionId, label) {
  const links = await evaluate(client, sessionId, `(() => [...document.querySelectorAll('.surfaces-navigation-sections a')].map(link => ({ href: link.getAttribute('href'), target: link.getAttribute('target') })))()`);
  assert.deepEqual(links, ["/#why-judgmentkit", "/#how-it-works", "/docs/", "https://surfaces.systems/"].map(href => ({ href, target: null })), `${label}: four compact primary destinations`);
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
          const lockupHeight = 56;
          assert.equal(home.lockup.x, gutter, label);
          assert.equal(home.lockup.height, lockupHeight, label);
          assert.equal(home.brand.y, (72 - lockupHeight) / 2, label);
          assert.equal(home.brand.height, lockupHeight, label);
          await assertBrand(client, sid, home, { route: '/', width: expected.width, colorScheme, scrollbarMode: expected.scrollbarMode ?? 'system' });
          if (expected.width === 390) {
            const alternate = colorScheme === 'light' ? 'dark' : 'light';
            await client.send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-color-scheme', value: alternate }] }, sid);
            const alternateMeasurement = await measure(client, sid);
            assert.equal(alternateMeasurement.headerImage.currentSrc, '/assets/brand/judgmentkit-lockup-reversed.svg');
            assert.equal(alternateMeasurement.footerImage.currentSrc, '/assets/brand/judgmentkit-lockup-reversed.svg');
            assert.equal(alternateMeasurement.footerBackground, 'rgb(11, 13, 14)');
            schemeChanges.push({ width: expected.width, from: colorScheme, to: alternate, fixedInkFooterPreserved: true, fixedInkHeaderPreserved: true });
            await client.send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-color-scheme', value: colorScheme }] }, sid);
            await measure(client, sid);
          }
          assert.equal(home.menuVisible, expected.menu, label);
          assert.equal(home.overflow, false, label);
          assert.equal(home.fontLoaded, true, label);
          assert.equal(home.background, "rgba(11, 13, 14, 0.98)", label);

          assert.equal(home.links.at(-1).href, "https://surfaces.systems/", label);
          await assertPrimaryDestinations(client, sid, label);
          if (expected.menu) {
            assert.equal(home.button.y, 14, label);
            assert.equal(home.button.height, 44, label);
            assert.equal(home.button.right, home.layoutWidth - gutter, label);
            assert.deepEqual(home.menuGlyphs, ['M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'], `${label}: closed menu glyph`);
            if (expected.width < 375) {
              assert.equal(home.button.width, 44, `${label}: narrow fit target`);
              assert.equal(home.menuLabelClip, 'inset(50%)', `${label}: narrow label remains in the DOM`);
            } else {
              assert.ok(home.button.width > 44, `${label}: Menu label retains its natural width`);
              assert.equal(home.menuLabelClip, 'none', `${label}: Menu label stays visible`);
            }
            await tabUntil(client, sid, '[data-surfaces-primary-menu-button]');
            const focus = await evaluate(client, sid, `getComputedStyle(document.activeElement).outlineStyle`);
            assert.equal(focus, "solid", `${label}: menu focus must be visible`);
            await pressKey(client, sid, "Enter");
            assert.equal(await evaluate(client, sid, `document.querySelector('[data-surfaces-primary-menu-button]').getAttribute('aria-expanded')`), "true");
            assert.deepEqual(await evaluate(client, sid, `[...document.querySelectorAll('[data-surfaces-primary-menu-button] path')].filter(path => getComputedStyle(path).display !== 'none').map(path => path.getAttribute('d'))`), ['M6 18 18 6M6 6l12 12'], `${label}: open menu uses the Surfaces X glyph`);
            const menu = await evaluate(client, sid, `(() => {
              const el = document.querySelector('[data-surfaces-primary-menu-list]');
              return { hidden: el.hidden, top: el.getBoundingClientRect().top, count: el.querySelectorAll('a').length, last: el.querySelector('a:last-child').href };
            })()`);
            assert.deepEqual(menu, { hidden: false, top: 72, count: 4, last: "https://surfaces.systems/" });
            await assertPrimaryDestinations(client, sid, label);
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
  console.log(`Header/footer and website presentation browser checks passed: ${CASES.length * 2} viewport/appearance cases including forced classic scrollbars, home/docs responsive type and surfaces, canonical asset selection and ratios, accessible names, runtime theme changes, compact primary destinations, keyboard menu, dismissal, sticky positioning, and Back restoration.`);
} finally {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  fs.rmSync(outDir, { recursive: true, force: true });
}
