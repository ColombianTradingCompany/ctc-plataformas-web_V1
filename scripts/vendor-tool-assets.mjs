// Hace OFFLINE las herramientas embebidas: descarga a disco todo lo que cargaban
// desde internet (Google Fonts y el CDN de Tailwind) y reescribe los enlaces a
// rutas locales. Sin esto, una finca sin señal abría la calculadora rápida y la
// veía SIN NINGÚN ESTILO (Tailwind venía del CDN), y las demás perdían su
// tipografía.
//
// Es idempotente y repetible: si el owner actualiza una herramienta, se vuelve a
// copiar el original y se corre esto otra vez.
//
// Run:  node scripts/vendor-tool-assets.mjs

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const TOOLS_DIR = path.join(process.cwd(), "public", "tools");
const PRIVATE_DIR = path.join(process.cwd(), "private-tools");
const ASSETS_REL = "/tools/assets";
const FONTS_DIR = path.join(TOOLS_DIR, "assets", "fonts");
const VENDOR_DIR = path.join(TOOLS_DIR, "assets");

// Google Fonts sirve woff2 solo si el User-Agent lo soporta; con el UA por
// defecto de fetch devuelve ttf (mucho más pesado).
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function get(url, asText = true) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return asText ? res.text() : Buffer.from(await res.arrayBuffer());
}

function safeName(url) {
  return url.split("/").slice(-2).join("-").replace(/[^\w.-]/g, "_");
}

/** Descarga una hoja de Google Fonts + sus woff2, y la devuelve reescrita a local. */
async function vendorFontCss(cssUrl) {
  let css = await get(cssUrl);
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
  for (const fontUrl of urls) {
    const file = safeName(fontUrl);
    const bytes = await get(fontUrl, false);
    await writeFile(path.join(FONTS_DIR, file), bytes);
    css = css.split(fontUrl).join(`${ASSETS_REL}/fonts/${file}`);
  }
  return { css, count: urls.length };
}

async function processFile(fullPath) {
  const name = path.basename(fullPath);
  let html = await readFile(fullPath, "utf8");
  const before = html;
  const notes = [];

  // ── 1. Google Fonts ────────────────────────────────────────────────────────
  // Se sustituye el <link> por un <style> con la hoja ya local. Los <link
  // rel="preconnect"> a fonts.googleapis/gstatic quedan inútiles: se retiran.
  const linkRe = /<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"[^>]*>/g;
  const links = [...html.matchAll(linkRe)];
  for (const [tag, cssUrl] of links) {
    const { css, count } = await vendorFontCss(cssUrl.replace(/&amp;/g, "&"));
    html = html.replace(tag, `<style>/* fuentes locales (vendor-tool-assets.mjs) */\n${css}</style>`);
    notes.push(`${count} woff2`);
  }
  html = html.replace(/<link[^>]+rel="preconnect"[^>]*fonts\.(googleapis|gstatic)\.com"[^>]*>\s*/g, "");

  // ── 2. Tailwind Play CDN ───────────────────────────────────────────────────
  // Es el único fallo DURO: sin él la herramienta queda sin estilos.
  const twRe = /<script[^>]+src="https:\/\/cdn\.tailwindcss\.com[^"]*"[^>]*><\/script>/g;
  if (twRe.test(html)) {
    const tw = await get("https://cdn.tailwindcss.com");
    await writeFile(path.join(VENDOR_DIR, "tailwind.js"), tw, "utf8");
    html = html.replace(twRe, `<script src="${ASSETS_REL}/tailwind.js"></script>`);
    notes.push("tailwind");
  }

  if (html === before) {
    console.log(`  ${name.padEnd(26)} sin cambios (ya offline)`);
    return;
  }
  await writeFile(fullPath, html, "utf8");
  console.log(`  ${name.padEnd(26)} ${notes.join(" + ")}`);
}

await mkdir(FONTS_DIR, { recursive: true });

console.log("public/tools:");
for (const f of (await readdir(TOOLS_DIR)).filter((f) => f.endsWith(".html"))) {
  await processFile(path.join(TOOLS_DIR, f));
}

// Las privadas (servidas autenticadas) se procesan igual; sus assets sí viven en
// public/ — una tipografía no es secreto.
try {
  const priv = (await readdir(PRIVATE_DIR)).filter((f) => f.endsWith(".html"));
  if (priv.length) {
    console.log("private-tools:");
    for (const f of priv) await processFile(path.join(PRIVATE_DIR, f));
  }
} catch {
  /* aún no existe */
}

const remaining = [];
for (const dir of [TOOLS_DIR, PRIVATE_DIR]) {
  let files = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith(".html")); } catch { continue; }
  for (const f of files) {
    const html = await readFile(path.join(dir, f), "utf8");
    for (const m of html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)) remaining.push(`${f}: ${m[1]}`);
  }
}
console.log(`\nEnlaces externos restantes: ${remaining.length}`);
for (const r of [...new Set(remaining)]) console.log("  " + r);
console.log("(los que queden deben ser SOLO enlaces de lectura a artículos, no assets)");
