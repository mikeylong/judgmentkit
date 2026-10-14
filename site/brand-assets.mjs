import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SITE_BRAND = JSON.parse(fsSync.readFileSync(new URL("./brand-assets.json", import.meta.url), "utf8"));

export function siteBrandHead({ title, description, canonicalUrl, existingContext = [] }) {
  const context = [
    ["property", "og:title", title], ["property", "og:description", description],
    ["property", "og:url", canonicalUrl], ["property", "og:type", "website"],
    ["name", "twitter:title", title], ["name", "twitter:description", description],
  ].filter(([, key]) => !existingContext.includes(key))
    .map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${value}">`).join("\n    ");
  const social = SITE_BRAND.origin + SITE_BRAND.social.route;
  return `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
    <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16">
    <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="${SITE_BRAND.ink}">
    <link rel="manifest" href="/site.webmanifest">
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
    ...SITE_BRAND.copies,
    ...[SITE_BRAND.social.route, ...SITE_BRAND.social.aliases].map(route => ({ source: SITE_BRAND.social.source, route })),
  ]) {
    const target = path.join(outDir, route.slice(1));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(ROOT, source), target);
  }
  const manifest = {
    id: "/", name: "JudgmentKit", short_name: "JudgmentKit", start_url: "/", scope: "/",
    display: "standalone", background_color: SITE_BRAND.ink, theme_color: SITE_BRAND.ink,
    icons: [
      ...[192, 512].map(size => ({ src: `/assets/brand/app-icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" })),
      ...[192, 512].map(size => ({ src: `/assets/brand/maskable-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" })),
    ],
  };
  await fs.writeFile(path.join(outDir, "site.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find(value => value !== undefined) ?? "";
}

// Copied examples and reports have independent HTML shells. Apply the same
// public identity to their heads without changing their body or page copy.
export function applySiteBrandHead(html, relativePath) {
  let found = false;
  const result = html.replace(/(<head\b[^>]*>)([\s\S]*?)(<\/head>)/i, (_, open, original, close) => {
    found = true;
    const active = original.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
    const title = active.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim() || "JudgmentKit";
    const descriptionTag = [...active.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]).find(tag => attribute(tag, "name").toLowerCase() === "description");
    const description = descriptionTag ? attribute(descriptionTag, "content") : "JudgmentKit is an activity-first judgment layer for AI-generated product work.";
    const canonicalTag = [...active.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]).find(tag => attribute(tag, "rel").toLowerCase() === "canonical");
    const route = "/" + relativePath.replace(/index\.html$/, "");
    const canonicalUrl = canonicalTag ? attribute(canonicalTag, "href") : SITE_BRAND.origin + route;
    const existingContext = [...active.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => (attribute(tag, "name") || attribute(tag, "property")).toLowerCase());
    const head = original.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:link|meta)\b[^>]*>/gi, tag => {
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
