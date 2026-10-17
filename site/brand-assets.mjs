import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fsSync.readFileSync(new URL("./brand-assets.json", import.meta.url), "utf8"));
const socialHash = crypto.createHash("sha256").update(fsSync.readFileSync(path.join(ROOT, config.social.source))).digest("hex");
export const SITE_BRAND = { ...config, social: { ...config.social, route: `${config.social.route_prefix}-${socialHash.slice(0, 16)}.png` } };

// Favicon stores may retain an old URL independently of ordinary page caching.
// A new canonical icon byte changes every advertised identity/cache URL.
export function createSiteBrandIconBundle(root = ROOT) {
  const sources = SITE_BRAND.copies.filter(entry => entry.content_versioned);
  const assetHashes = sources.map(({ source, route }) => ({ route, sha256: crypto.createHash("sha256").update(fsSync.readFileSync(path.join(root, source))).digest("hex") }))
    .sort((a, b) => a.route < b.route ? -1 : a.route > b.route ? 1 : 0);
  const logicalManifest = {
    ...SITE_BRAND.manifest.content,
    icons: [
      ...[192, 512].map(size => ({ src: `/assets/brand/app-icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" })),
      ...[192, 512].map(size => ({ src: `/assets/brand/maskable-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" })),
    ],
  };
  const sha256 = crypto.createHash("sha256").update(JSON.stringify({ assets: assetHashes, manifest: logicalManifest })).digest("hex");
  const key = sha256.slice(0, SITE_BRAND.icon_cache.hex_length);
  const versioned = route => {
    const file = path.parse(route);
    return `${SITE_BRAND.icon_cache.prefix}/${file.name}-${key}${file.ext}`;
  };
  const routes = Object.fromEntries(sources.map(entry => [entry.route, versioned(entry.route)]));
  const copies = sources.map(entry => ({ ...entry, alias: entry.route, route: routes[entry.route] }));
  const manifest = { ...logicalManifest, icons: logicalManifest.icons.map(icon => ({ ...icon, src: routes[icon.src] })) };
  return { key, sha256, routes, copies, manifest, manifestRoute: versioned(SITE_BRAND.manifest.route) };
}
export const SITE_BRAND_ICON_BUNDLE = createSiteBrandIconBundle();

// Native favicon stores can remember an older published URL. Keep only the
// recorded routes, resolving each to its current equivalent without changing
// the content-derived bundle or advertising the old addresses again.
export const SITE_BRAND_LEGACY_ICON_COPIES = SITE_BRAND.legacy_icon_aliases
  .filter(entry => entry.target !== SITE_BRAND.manifest.route)
  .map(({ route, target }) => {
    const active = SITE_BRAND.copies.find(entry => entry.route === target);
    if (!active) throw new Error(`Unknown legacy icon target: ${target}`);
    return { route, source: active.source };
  });
export const SITE_BRAND_LEGACY_MANIFEST_ROUTES = SITE_BRAND.legacy_icon_aliases
  .filter(entry => entry.target === SITE_BRAND.manifest.route)
  .map(entry => entry.route);

// Titles are owned by these published pages, independently of their visible headings.
const PUBLIC_PAGE_PURPOSES = Object.freeze({
  "/": "Interface Design Guidance for AI Agents",
  "/value/": "Interface checks and repair examples",
  "/docs/": "Setup and agent workflow",
  "/examples/": "Interface examples and repair fixtures",
  "/design-system/": "Interface design system reference",
  "/design-system/tokens/": "Design token reference",
  "/design-system/fonts/": "Interface typography reference",
  "/design-system/icons/": "Interface icon reference",
  "/design-system/components/": "Component contracts and states",
  "/design-system/patterns/": "Activity-based interface patterns",
  "/design-system/accessibility/": "Accessibility evidence requirements",
  "/evals/": "Historical UI evaluation reports",
  "/evals/judgmentkit-mcp/": "Historical paired-artifact evaluation",
  "/evals/site-rebuild-log/": "Website rebuild evidence log"
});

export function siteBrandHead({ title, description, canonicalUrl, existingContext = [] }) {
  const context = [
    ["property", "og:title", title], ["property", "og:description", description],
    ["property", "og:url", canonicalUrl], ["property", "og:type", "website"],
    ["name", "twitter:title", title], ["name", "twitter:description", description],
  ].filter(([, key]) => !existingContext.includes(key))
    .map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${value}">`).join("\n    ");
  const social = SITE_BRAND.origin + SITE_BRAND.social.route;
  return `<script src="${SITE_BRAND_ICON_BUNDLE.routes["/assets/brand/favicon-theme.js"]}" data-brand-favicon-controller data-light-icon="${SITE_BRAND_ICON_BUNDLE.routes["/assets/brand/favicon-light.ico"]}" data-dark-icon="${SITE_BRAND_ICON_BUNDLE.routes["/assets/brand/favicon-dark.ico"]}"></script>
    <noscript data-brand-favicon-fallback><link rel="icon" href="${SITE_BRAND_ICON_BUNDLE.routes["/assets/brand/favicon-light.ico"]}" type="image/x-icon" sizes="16x16 32x32 48x48"></noscript>
    <link rel="apple-touch-icon" href="${SITE_BRAND_ICON_BUNDLE.routes["/apple-touch-icon.png"]}" sizes="180x180">
    <link rel="mask-icon" href="${SITE_BRAND_ICON_BUNDLE.routes["/safari-pinned-tab.svg"]}" color="${SITE_BRAND.ink}">
    <link rel="manifest" href="${SITE_BRAND_ICON_BUNDLE.manifestRoute}">
    <meta name="application-name" content="JudgmentKit">
    <meta name="apple-mobile-web-app-title" content="JudgmentKit">
    <meta name="theme-color" content="${SITE_BRAND.ink}">
    <link rel="image_src" href="${social}">
    <meta property="og:site_name" content="JudgmentKit">
    ${context}
    <meta property="og:image" content="${social}">
    <meta property="og:image:secure_url" content="${social}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="${SITE_BRAND.social.width}">
    <meta property="og:image:height" content="${SITE_BRAND.social.height}">
    <meta property="og:image:alt" content="${SITE_BRAND.social.alt}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${social}">
    <meta name="twitter:image:alt" content="${SITE_BRAND.social.alt}">`;
}

export async function copySiteBrandAssets(outDir) {
  for (const { source, route } of [
    ...SITE_BRAND.copies, ...SITE_BRAND_ICON_BUNDLE.copies, ...SITE_BRAND_LEGACY_ICON_COPIES,
    ...[SITE_BRAND.social.route, ...SITE_BRAND.social.aliases].map(route => ({ source: SITE_BRAND.social.source, route })),
  ]) {
    const target = path.join(outDir, route.slice(1));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(ROOT, source), target);
  }
  const manifest = JSON.stringify(SITE_BRAND_ICON_BUNDLE.manifest, null, 2) + "\n";
  for (const route of [SITE_BRAND.manifest.route, SITE_BRAND_ICON_BUNDLE.manifestRoute, ...SITE_BRAND_LEGACY_MANIFEST_ROUTES]) {
    const target = path.join(outDir, route.slice(1));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, manifest);
  }
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find(value => value !== undefined) ?? "";
}

// Authored routes receive their approved document/social titles. Copied examples
// and reports keep their original titles and context; every body stays unchanged.
export function applySiteBrandHead(html, relativePath) {
  let found = false;
  const result = html.replace(/(<head\b[^>]*>)([\s\S]*?)(<\/head>)/i, (_, open, original, close) => {
    found = true;
    const active = original.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
    const route = "/" + relativePath.replace(/index\.html$/, "");
    const purpose = PUBLIC_PAGE_PURPOSES[route];
    const title = purpose
      ? `${purpose} | JudgmentKit`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      : active.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim() || "JudgmentKit";
    const descriptionTag = [...active.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]).find(tag => attribute(tag, "name").toLowerCase() === "description");
    const description = descriptionTag ? attribute(descriptionTag, "content") : "JudgmentKit is an activity-first judgment layer for AI-generated product work.";
    const canonicalTag = [...active.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]).find(tag => attribute(tag, "rel").toLowerCase() === "canonical");
    const canonicalUrl = canonicalTag ? attribute(canonicalTag, "href") : SITE_BRAND.origin + route;
    const existingContext = [...active.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => (attribute(tag, "name") || attribute(tag, "property")).toLowerCase());
    const titled = original.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, tag => purpose ? `<title>${title}</title>` : tag)
      .replace(/<meta\b[^>]*>/gi, tag => {
        const key = (attribute(tag, "name") || attribute(tag, "property")).toLowerCase();
        return purpose && ["og:title", "twitter:title"].includes(key)
          ? tag.replace(/(\bcontent\s*=\s*)(["'])([\s\S]*?)\2/i, (_, prefix, quote) => `${prefix}${quote}${title}${quote}`)
          : tag;
      });
    const head = titled.replace(/<noscript\b[^>]*\bdata-brand-favicon-fallback[^>]*>[\s\S]*?<\/noscript\s*>/gi, "").replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:link|meta)\b[^>]*>/gi, tag => {
      if (/^<script\b/i.test(tag) && /\bdata-brand-favicon-controller(?:\s|=|>)/i.test(tag)) return "";
      if (/^<!--|^<(?:script|style)\b/i.test(tag)) return tag;
      const rel = attribute(tag, "rel").toLowerCase();
      const meta = (attribute(tag, "name") || attribute(tag, "property")).toLowerCase();
      if (["icon", "shortcut icon", "apple-touch-icon", "apple-touch-icon-precomposed", "mask-icon", "manifest", "image_src"].includes(rel)
        || /^og:image(?::|$)/.test(meta) || /^twitter:image(?::|$)/.test(meta)
        || ["og:site_name", "twitter:card"].includes(meta)
        || ["application-name", "apple-mobile-web-app-title", "theme-color"].includes(meta)) return "";
      return tag;
    });
    const escapeQuote = value => value.replace(/"/g, "&quot;");
    return open + head + (canonicalTag ? "" : `\n    <link rel="canonical" href="${escapeQuote(canonicalUrl)}">`)
      + "\n    " + siteBrandHead({ title: escapeQuote(title), description: escapeQuote(description), canonicalUrl: escapeQuote(canonicalUrl), existingContext }) + "\n  " + close;
  });
  if (!found) throw new Error(`Published HTML has no head: ${relativePath}`);
  return result;
}

export async function applyPublishedBrandHeads(outDir, directory = outDir) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await applyPublishedBrandHeads(outDir, file);
    else if (entry.name.endsWith(".html")) {
      const relative = path.relative(outDir, file).split(path.sep).join("/");
      if (SITE_BRAND.head_exceptions.some(entry => entry.route === "/" + relative)) continue;
      await fs.writeFile(file, applySiteBrandHead(await fs.readFile(file, "utf8"), relative));
    }
  }
}
