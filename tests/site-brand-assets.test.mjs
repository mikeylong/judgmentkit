import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSite } from "../site/build-site.mjs";
import { applySiteBrandHead, SITE_BRAND } from "../site/brand-assets.mjs";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-site-brand-"));
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, key, a, b]) => [key.toLowerCase(), a ?? b]));
const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const pngSize = bytes => { assert.equal(bytes.subarray(1, 4).toString(), "PNG"); return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]; };
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
    for (const [rel, href] of [["icon", "/favicon.ico"], ["icon", "/favicon.svg"], ["icon", "/favicon-16x16.png"], ["icon", "/favicon-32x32.png"], ["apple-touch-icon", "/apple-touch-icon.png"], ["mask-icon", "/safari-pinned-tab.svg"], ["manifest", "/site.webmanifest"], ["image_src", SITE_BRAND.origin + SITE_BRAND.social.route]]) {
      assert.equal(links.filter(item => item.rel === rel && item.href === href).length, 1, `${label}: one ${href}`);
    }
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
    for (const key of ["og:image:alt", "twitter:image:alt"]) assert.equal(meta(key), "JudgmentKit. Before the UI.", label);
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

  const receipt = JSON.parse(fs.readFileSync("site/assets/brand-generation.json", "utf8"));
  for (const [file, expectedHash] of Object.entries(receipt.outputs)) assert.equal(hash(fs.readFileSync(file)), expectedHash, file);
  assert.equal(receipt.canonical_lockup_sha256, hash(fs.readFileSync(receipt.canonical_lockup)));
  const socialSvg = fs.readFileSync("site/assets/judgmentkit-social-thumbnail.svg", "utf8");
  assert.ok(socialSvg.includes(fs.readFileSync(receipt.canonical_lockup, "utf8").trim()), "embed complete approved source bytes");
  assert.equal(/<text[^>]*>JudgmentKit<\/text>/.test(socialSvg), false, "outlined wordmark");
  assert.deepEqual(pngSize(fs.readFileSync(SITE_BRAND.social.source)), [1200, 630]);
  const ico = fs.readFileSync(path.join(outDir, "favicon.ico"));
  assert.equal(ico.readUInt16LE(0), 0); assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  assert.deepEqual([0, 1, 2].map(index => [ico[6 + index * 16], ico[7 + index * 16]]), [[16, 16], [32, 32], [48, 48]]);
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
  const mounted = [...SITE_BRAND.copies, ...[SITE_BRAND.social.route, ...SITE_BRAND.social.aliases].map(route => ({ source: SITE_BRAND.social.source, route }))];
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
  console.log(`Website brand checks passed: ${htmlFiles.length - SITE_BRAND.head_exceptions.length} branded HTML heads + ${SITE_BRAND.head_exceptions.length} explicit sandboxed source exception, ${mounted.length} exact public asset routes, ICO frames, PNG dimensions, manifest purposes, complete canonical lockup, and current social aliases.`);
} finally {
  server?.closeAllConnections?.();
  if (server) await new Promise(resolve => server.close(resolve));
  fs.rmSync(outDir, { recursive: true, force: true });
}
