import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { buildSite } from "../site/build-site.mjs";
import { applySiteBrandHead, createSiteBrandIconBundle, SITE_BRAND, SITE_BRAND_ICON_BUNDLE } from "../site/brand-assets.mjs";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-site-brand-"));
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, key, a, b]) => [key.toLowerCase(), a ?? b]));
const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const pngSize = bytes => { assert.equal(bytes.subarray(1, 4).toString(), "PNG"); return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]; };
// Decode the committed RGB/RGBA PNGs, including PNG frames inside the ICO.
// Pixel checks catch a light fallback or white edge even when dimensions match.
const pngPixels = bytes => {
  const [width, height] = pngSize(bytes);
  assert.equal(bytes[24], 8, "8-bit channel exports");
  assert.ok([2, 6].includes(bytes[25]), "RGB or RGBA export");
  const channels = bytes[25] === 6 ? 4 : 3, chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString();
    if (type === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels;
  const pixels = Buffer.alloc(width * height * 4), rows = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  assert.equal(raw.length, height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert.ok(filter <= 4, "supported PNG row filter");
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? rows[y * stride + x - channels] : 0;
      const up = y ? rows[(y - 1) * stride + x] : 0;
      const diagonal = y && x >= channels ? rows[(y - 1) * stride + x - channels] : 0;
      rows[y * stride + x] = raw[y * (stride + 1) + x + 1] + [0, left, up, Math.floor((left + up) / 2), paeth(left, up, diagonal)][filter];
    }
    for (let x = 0; x < width; x++) {
      rows.copy(pixels, (y * width + x) * 4, y * stride + x * channels, y * stride + x * channels + 3);
      pixels[(y * width + x) * 4 + 3] = channels === 4 ? rows[y * stride + x * channels + 3] : 255;
    }
  }
  return pixels;
};
let server;
try {
  await buildSite(outDir);
  const htmlFiles = files(outDir).filter(file => file.endsWith(".html"));
  for (const file of htmlFiles) {
    const label = path.relative(outDir, file);
    const html = fs.readFileSync(file, "utf8");
    const exception = SITE_BRAND.head_exceptions.find(entry => entry.route === "/" + label.split(path.sep).join("/"));
    if (exception) {
      assert.equal(html, fs.readFileSync(exception.source, "utf8"), `${label}: authored source bytes`);
      assert.match(html, /name="robots" content="noindex, nofollow"/);
      assert.match(html, /img-src data:/);
      assert.match(html, /rel="icon" href="data:,"/);
      continue;
    }
    const redecorated = applySiteBrandHead(html, label.split(path.sep).join("/"));
    assert.equal(redecorated.match(/<body\b[^>]*>[\s\S]*?<\/body>/i)[0], html.match(/<body\b[^>]*>[\s\S]*?<\/body>/i)[0], `${label}: branding pass preserves every body byte`);
    assert.equal(redecorated.match(/<title\b[^>]*>[\s\S]*?<\/title>/i)[0], html.match(/<title\b[^>]*>[\s\S]*?<\/title>/i)[0], `${label}: page title preserved`);
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
    assert.ok(head, label);
    const tags = head.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
    const links = [...tags.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attrs(tag));
    const metas = [...tags.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attrs(tag));
    const meta = key => {
      const matches = metas.filter(item => (item.name || item.property) === key);
      assert.equal(matches.length, 1, `${label}: one ${key}`);
      return matches[0].content;
    };
    for (const [rel, alias] of [["icon", "/favicon.ico"], ...["light", "dark"].flatMap(theme => [["icon", `/assets/brand/favicon-${theme}.svg`], ...[16, 32].map(size => ["icon", `/assets/brand/favicon-${theme}-${size}.png`])]), ["apple-touch-icon", "/apple-touch-icon.png"], ["mask-icon", "/safari-pinned-tab.svg"]]) {
      const href = SITE_BRAND_ICON_BUNDLE.routes[alias];
      assert.equal(links.filter(item => item.rel === rel && item.href === href).length, 1, `${label}: one content-versioned ${href}`);
      assert.equal(links.some(item => item.rel === rel && item.href === alias), false, `${label}: do not advertise cached legacy ${alias}`);
    }
    assert.equal(links.filter(item => item.rel === "icon").length, 7, `${label}: ICO plus both themes of SVG/16px/32px PNG`);
    for (const theme of ["light", "dark"]) {
      const themed = links.filter(item => item.rel === "icon" && item.href.includes(`favicon-${theme}`));
      assert.equal(themed.length, 3, `${label}: explicit ${theme} alternatives`);
      for (const link of themed) assert.equal(link.media, `(prefers-color-scheme: ${theme})`, `${label}: Safari PNG and SVG media`);
    }
    for (const alias of ["/favicon.svg", "/favicon-16x16.png", "/favicon-32x32.png"]) assert.equal(links.some(item => item.href === alias), false);
    for (const [rel, href] of [["manifest", SITE_BRAND_ICON_BUNDLE.manifestRoute], ["image_src", SITE_BRAND.origin + SITE_BRAND.social.route]]) {
      assert.equal(links.filter(item => item.rel === rel && item.href === href).length, 1, `${label}: one ${href}`);
    }
    assert.equal(links.some(item => item.rel === "manifest" && item.href === "/site.webmanifest"), false, `${label}: version the manifest cache URL`);
    assert.equal(links.find(item => item.rel === "mask-icon").color, SITE_BRAND.ink);
    const canonical = links.filter(item => item.rel === "canonical");
    assert.equal(canonical.length, 1, label);
    assert.ok(canonical[0].href.startsWith(SITE_BRAND.origin + "/"), label);
    assert.equal(meta("og:url"), canonical[0].href, label);
    assert.equal(meta("og:site_name"), "JudgmentKit", label);
    assert.equal(meta("application-name"), "JudgmentKit", label);
    assert.equal(meta("apple-mobile-web-app-title"), "JudgmentKit", label);
    assert.equal(meta("theme-color"), SITE_BRAND.ink, label);
    for (const key of ["og:image", "og:image:secure_url", "twitter:image"]) assert.equal(meta(key), SITE_BRAND.origin + SITE_BRAND.social.route, label);
    assert.equal(meta("og:image:type"), "image/png", label);
    assert.equal(meta("og:image:width"), "1200", label);
    assert.equal(meta("og:image:height"), "630", label);
    assert.equal(meta("twitter:card"), "summary_large_image", label);
    for (const key of ["og:image:alt", "twitter:image:alt"]) assert.equal(meta(key), "JudgmentKit", label);
    assert.equal(meta("og:title"), meta("twitter:title"), label);
    assert.equal(meta("og:description"), meta("twitter:description"), label);
    assert.ok(meta("og:title").length > 0 && meta("og:description").length > 0, label);
    assert.equal(tags.includes("judgmentkit-social-thumbnail-20260723-v2.png"), false, `${label}: fresh sharing cache key`);
  }
  assert.ok(htmlFiles.length >= 115, "include copied reports, examples, and experiments");

  const body = '<body><h1>A copied example</h1><script>const label="JudgmentKit";</script></body>';
  const input = '<html><head><title>Specific &amp; useful</title><meta name="description" content="Existing page copy"><link rel="icon" href="old.ico"><meta property="og:image" content="old.png"></head>' + body + '</html>';
  const decorated = applySiteBrandHead(input, "examples/specific/index.html");
  assert.equal(decorated.match(/<body>[\s\S]*<\/body>/)[0], body, "copied page body unchanged");
  assert.ok(decorated.includes('<title>Specific &amp; useful</title>'));
  assert.ok(decorated.includes('property="og:title" content="Specific &amp; useful"'));
  assert.ok(decorated.includes('property="og:description" content="Existing page copy"'));
  assert.ok(decorated.includes('rel="canonical" href="https://judgmentkit.ai/examples/specific/"'));

  const specificContext = '<meta property="og:title" content="An article title"><meta property="og:description" content="Article-specific description"><meta property="og:type" content="article"><meta property="og:url" content="https://judgmentkit.ai/article/"><meta property="og:locale" content="en_US"><meta property="og:video" content="https://judgmentkit.ai/video.mp4"><meta name="twitter:creator" content="@specific"><meta name="twitter:title" content="A specific tweet"><meta property="og:image" content="old.png"><meta name="twitter:image" content="old.png">';
  const contextual = applySiteBrandHead('<html><head><title>Page title</title>' + specificContext + '</head>' + body + '</html>', 'article/index.html');
  for (const tag of specificContext.match(/<meta[^>]+>/g).filter(tag => !/og:image|twitter:image/.test(tag))) assert.ok(contextual.includes(tag), `preserve existing social context: ${tag}`);
  assert.equal(contextual.match(/property="og:title"/g).length, 1);
  assert.equal(contextual.match(/name="twitter:title"/g).length, 1);
  assert.equal(contextual.includes('content="old.png"'), false);
  assert.ok(contextual.includes(SITE_BRAND.origin + SITE_BRAND.social.route));
  assert.equal(contextual.match(/<body>[\s\S]*<\/body>/)[0], body);

  const iconSourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-icon-source-"));
  try {
    for (const { source } of SITE_BRAND_ICON_BUNDLE.copies) {
      const target = path.join(iconSourceRoot, source);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
    const first = createSiteBrandIconBundle(iconSourceRoot);
    assert.equal(first.key, SITE_BRAND_ICON_BUNDLE.key, "identical source bytes produce identical cache URLs");
    fs.appendFileSync(path.join(iconSourceRoot, "site/assets/brand/favicon-light.svg"), "<!-- changed source fixture -->\n");
    const changed = createSiteBrandIconBundle(iconSourceRoot);
    assert.notEqual(changed.key, first.key, "canonical source byte changes invalidate the identity bundle automatically");
    for (const alias of Object.keys(first.routes)) assert.notEqual(changed.routes[alias], first.routes[alias], alias);
    assert.notEqual(changed.manifestRoute, first.manifestRoute);
    for (const key of ["id", "start_url", "scope"]) assert.equal(changed.manifest[key], "/", "app identity survives cache-key changes");
  } finally { fs.rmSync(iconSourceRoot, { recursive: true, force: true }); }

  const receipt = JSON.parse(fs.readFileSync("site/assets/brand-generation.json", "utf8"));
  for (const [file, expectedHash] of Object.entries(receipt.outputs)) assert.equal(hash(fs.readFileSync(file)), expectedHash, file);
  assert.equal(receipt.canonical_lockup_sha256, hash(fs.readFileSync(receipt.canonical_lockup)));
  const socialSvg = fs.readFileSync("site/assets/judgmentkit-social-thumbnail.svg", "utf8");
  assert.ok(socialSvg.includes(fs.readFileSync(receipt.canonical_lockup, "utf8").trim()), "embed complete approved source bytes");
  assert.equal(/<text\b/.test(socialSvg), false, "sharing art contains only the approved outlined lockup");
  assert.equal(socialSvg.includes("Before the UI."), false, "no in-image tagline");
  assert.ok(socialSvg.includes('<rect width="1200" height="630" fill="#0B0D0E"/>'));
  assert.equal(receipt.canonical_lockup, "brand/slab-j/lockups/horizontal-reversed.svg");
  const sourceViewBox = fs.readFileSync(receipt.canonical_lockup, "utf8").match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
  assert.deepEqual(receipt.social_placement.source_viewBox, sourceViewBox, "source dimensions cannot be shadowed by icon height");
  const scale = Math.min(2.8, 960 / sourceViewBox[2]);
  assert.equal(receipt.social_placement.scale, scale);
  assert.deepEqual(receipt.social_placement.translation, [(1200 - sourceViewBox[2] * scale) / 2, (630 - sourceViewBox[3] * scale) / 2]);
  assert.equal(SITE_BRAND.social.route, `${SITE_BRAND.social.route_prefix}-${hash(fs.readFileSync(SITE_BRAND.social.source)).slice(0, 16)}.png`, "sharing URL follows content bytes");
  assert.ok(SITE_BRAND.social.aliases.includes("/assets/judgmentkit-social-thumbnail-20261014-slab-j-v1.png"));

  assert.equal(SITE_BRAND.web_icons.raster_density, 384);
  assert.equal(SITE_BRAND.web_icons.fallback_theme, "dark");
  assert.equal(SITE_BRAND.social.raster_density, 192);
  const geometry = JSON.parse(fs.readFileSync("brand/slab-j/geometry.json", "utf8"));
  const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} vs ${expected}`);
  const inspectGroup = (group, parts, height, fills) => {
    const attributes = attrs(group[1]);
    const polygons = [...group[2].matchAll(/<polygon\b([^>]+)>/g)].map(([, tag]) => attrs(tag));
    assert.deepEqual(polygons.map(p => p.points), parts, "retain exact approved polygon coordinates");
    assert.deepEqual(polygons.map(p => p.fill), fills);
    const transform = attributes.transform.match(/^translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)$/);
    assert.ok(transform, "one uniform external transform");
    const [, tx, ty, factor] = transform.map(Number);
    const points = parts.flatMap(p => p.split(" ").map(point => point.split(",").map(Number))).map(([x, y]) => [x * factor + tx, y * factor + ty]);
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    close(Math.max(...ys) - Math.min(...ys), height, "visible height");
    close((Math.max(...xs) + Math.min(...xs)) / 2, 32, "actual ink horizontal center");
    close((Math.max(...ys) + Math.min(...ys)) / 2, 32, "actual ink vertical center");
    return Math.max(...points.map(([x, y]) => Math.hypot(x - 32, y - 32)));
  };
  for (const theme of ["light", "dark"]) {
    const svg = fs.readFileSync(`site/assets/brand/favicon-${theme}.svg`, "utf8");
    const rect = attrs(svg.match(/<rect\b([^>]+)>/)[1]);
    assert.equal(rect.rx, "8"); assert.equal(rect.fill, SITE_BRAND[theme === "light" ? "ivory" : "ink"]);
    assert.match(svg, /@media\(max-width:20px\)/);
    const groups = [...svg.matchAll(/<g\b([^>]*)>([\s\S]*?)<\/g>/g)];
    assert.deepEqual(groups.map(g => attrs(g[1]).id), ["canonical", "optical"]);
    for (const [index, parts] of [geometry.canonical, geometry.optical_16].entries()) inspectGroup(groups[index], parts, 48, [SITE_BRAND[theme === "light" ? "ink" : "ivory"], SITE_BRAND[theme === "light" ? "ink" : "ivory"], SITE_BRAND.nickel]);
    for (const size of [16, 32]) {
      const png = fs.readFileSync(`site/assets/brand/favicon-${theme}-${size}.png`);
      assert.deepEqual(pngSize(png), [size, size]);
      assert.equal(png[25], 6, "browser PNG preserves alpha outside rounded corners");
    }
  }
  for (const [name, height] of [["app-icon", 48], ["maskable", 36]]) {
    const svg = fs.readFileSync(`site/assets/brand/${name}.svg`, "utf8");
    const rect = attrs(svg.match(/<rect\b([^>]+)>/)[1]);
    assert.equal(rect.rx, "0", "platform owns rounding");
    assert.equal(rect.fill, SITE_BRAND.ink, "installed app fallback uses Ink plate");
    const radius = inspectGroup([...svg.matchAll(/<g\b([^>]*)>([\s\S]*?)<\/g>/g)][0], geometry.canonical, height, [SITE_BRAND.ivory, SITE_BRAND.ivory, SITE_BRAND.nickel]);
    if (name === "maskable") assert.ok(radius < 25.6, "36-unit alternate fits central80% diameter safe circle");
  }
  const pinned = fs.readFileSync("site/assets/brand/safari-pinned-tab.svg", "utf8");
  assert.equal(pinned.includes("<rect"), false, "pinned icon is a single-color silhouette");
  inspectGroup([...pinned.matchAll(/<g\b([^>]*)>([\s\S]*?)<\/g>/g)][0], geometry.canonical, 48, ["#000000", "#000000", "#000000"]);
  for (const [route, source] of [["favicon.svg", "favicon-dark.svg"], ["favicon-16x16.png", "favicon-dark-16.png"], ["favicon-32x32.png", "favicon-dark-32.png"]]) assert.deepEqual(fs.readFileSync(path.join(outDir, route)), fs.readFileSync(`site/assets/brand/${source}`), "legacy icon fallback is dark");
  assert.deepEqual(pngSize(fs.readFileSync(SITE_BRAND.social.source)), [1200, 630]);
  const ico = fs.readFileSync(path.join(outDir, "favicon.ico"));
  assert.equal(ico.readUInt16LE(0), 0); assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  assert.deepEqual([0, 1, 2].map(index => [ico[6 + index * 16], ico[7 + index * 16]]), [[16, 16], [32, 32], [48, 48]]);
  for (const [index, size] of [16, 32, 48].entries()) {
    const png = fs.readFileSync(`site/assets/brand/favicon-dark-${size}.png`), dark = pngPixels(png);
    const entry = 6 + index * 16, length = ico.readUInt32LE(entry + 8), offset = ico.readUInt32LE(entry + 12);
    assert.deepEqual(pngPixels(ico.subarray(offset, offset + length)), dark, `${size}px ICO frame preserves every dark fallback pixel`);
    let partial = 0;
    for (let pixel = 0; pixel < dark.length; pixel += 4) if (dark[pixel + 3] > 0 && dark[pixel + 3] < 255) {
      assert.deepEqual([...dark.subarray(pixel, pixel + 3)], [11, 13, 14], "partial-alpha outer edge has Ink RGB, without a white matte");
      partial++;
    }
    assert.ok(partial > 0, "rounded tile has antialiased edges");
  }
  for (const name of ["apple-touch-icon", "app-icon-192", "app-icon-512", "maskable-192", "maskable-512"]) {
    const pixels = pngPixels(fs.readFileSync(`site/assets/brand/${name}.png`));
    assert.deepEqual([...pixels.subarray(0, 4)], [11, 13, 14, 255], `${name}: opaque Ink corner`);
    for (let pixel = 3; pixel < pixels.length; pixel += 4) assert.equal(pixels[pixel], 255, `${name}: platform icon is opaque`);
  }
  for (const [route, size] of [["favicon-16x16.png", 16], ["favicon-32x32.png", 32], ["apple-touch-icon.png", 180]]) assert.deepEqual(pngSize(fs.readFileSync(path.join(outDir, route))), [size, size]);
  const placement = JSON.parse(fs.readFileSync("brand/slab-j/placement.json", "utf8"));
  assert.ok(placement.maximum_mark_vertex_radius < placement.safe_zone_radius, "canonical mark fits maskable safe zone");
  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "site.webmanifest"), "utf8"));
  assert.equal(manifest.name, "JudgmentKit"); assert.equal(manifest.short_name, "JudgmentKit");
  assert.equal(manifest.start_url, "/"); assert.equal(manifest.scope, "/"); assert.equal(manifest.id, "/");
  assert.equal(manifest.theme_color, SITE_BRAND.ink); assert.equal(manifest.background_color, SITE_BRAND.ink);
  assert.deepEqual(manifest.icons.map(icon => [icon.sizes, icon.purpose]), [["192x192", "any"], ["512x512", "any"], ["192x192", "maskable"], ["512x512", "maskable"]]);
  for (const icon of manifest.icons) assert.equal(pngSize(fs.readFileSync(path.join(outDir, icon.src.slice(1)))).join("x"), icon.sizes);

  const local = await listenSiteLocalServer({ siteDir: outDir, host: "127.0.0.1", port: 0 }); server = local.server;
  const mounted = [...SITE_BRAND.copies, ...SITE_BRAND_ICON_BUNDLE.copies, ...[SITE_BRAND.social.route, ...SITE_BRAND.social.aliases].map(route => ({ source: SITE_BRAND.social.source, route }))];
  for (const { source, route } of mounted) {
    const response = await fetch(new URL(route, local.url));
    assert.equal(response.status, 200, route);
    const expectedType = route.endsWith(".ico") ? "image/x-icon" : route.endsWith(".png") ? "image/png" : "image/svg+xml; charset=utf-8";
    assert.equal(response.headers.get("content-type"), expectedType, route);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(source), `${route}: canonical bytes`);
    const head = await fetch(new URL(route, local.url), { method: "HEAD" });
    assert.equal(head.status, 200, route); assert.equal((await head.arrayBuffer()).byteLength, 0, route);
  }
  const response = await fetch(new URL("/site.webmanifest", local.url));
  assert.equal(response.headers.get("content-type"), "application/manifest+json; charset=utf-8");
  assert.deepEqual(await response.json(), manifest);
  const versionedManifest = await fetch(new URL(SITE_BRAND_ICON_BUNDLE.manifestRoute, local.url));
  assert.equal(versionedManifest.headers.get("content-type"), "application/manifest+json; charset=utf-8");
  assert.deepEqual(await versionedManifest.json(), manifest, "legacy and advertised manifest bytes share stable app identity");
  assert.deepEqual(manifest, SITE_BRAND_ICON_BUNDLE.manifest);
  for (const icon of manifest.icons) assert.ok(icon.src.includes(SITE_BRAND_ICON_BUNDLE.key), "version all app/maskable icon cache URLs");
  console.log(`Website brand checks passed: ${htmlFiles.length - SITE_BRAND.head_exceptions.length} branded HTML heads + ${SITE_BRAND.head_exceptions.length} explicit sandboxed source exception, ${mounted.length} exact public asset routes, ICO frames, PNG dimensions, manifest purposes, complete canonical lockup, and current social aliases.`);
} finally {
  server?.closeAllConnections?.();
  if (server) await new Promise(resolve => server.close(resolve));
  fs.rmSync(outDir, { recursive: true, force: true });
}
