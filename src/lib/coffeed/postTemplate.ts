// ── Coffeed · el render determinista del post ────────────────────────────────
// PURO y sin `server-only` a propósito (patrón cvTemplate.ts de GVG): así el QA
// puede importarlo con --experimental-strip-types. La IA escribe los paneles;
// la MAQUETA no la decide un modelo, la decide esta plantilla — es lo que hace
// que todos los posts se vean de la misma familia.
//
// El PDF es el "Imprimir" del navegador sobre este mismo HTML (mismo camino que
// el CV de GVG): una hoja A4 por post, sin dependencias externas.

import { coffeedFontStack } from "./types";

export type PostPanel = { position: number; role: string | null; text: string; ref: string | null; srcKey: string | null };
export type PostSource = { key: string; title: string; outlet: string; url: string; publishedAt: string | null };

export type PostRenderInput = {
  chapterNo: number;
  title: string;
  hook: string | null;
  date: string;
  panels: PostPanel[];
  sources: PostSource[];
  brand: {
    companyName: string;
    slogan: string | null;
    logoDataUri: string | null;
    palette: string[];
    fontFamily: string;
  };
};

function esc(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** Legibilidad del texto sobre un color de la paleta (W3C relative luminance). */
function readableOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#000000";
  const n = parseInt(m[1], 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  // Contraste contra blanco vs. negro; se queda con el que más separa.
  return (1.05) / (L + 0.05) >= (L + 0.05) / 0.05 ? "#FFFFFF" : "#000000";
}

export function renderCoffeedPost(input: PostRenderInput): string {
  const { brand } = input;
  // Blanco y negro SIEMPRE disponibles; los propios rellenan de ahí en adelante.
  const ink = brand.palette[0] ?? "#15201B";
  const accent = brand.palette[2] ?? brand.palette[1] ?? "#A3241B";
  const soft = brand.palette[4] ?? "#F2F3EE";
  const onInk = readableOn(ink);
  const font = coffeedFontStack(brand.fontFamily);

  const panels = input.panels
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((p, i, arr) => {
      const last = i === arr.length - 1;
      return `<article class="panel${i === 0 ? " panel--open" : ""}${last ? " panel--close" : ""}">
        <div class="panel__bar"><span>${String(p.position).padStart(2, "0")}${p.role ? ` · ${esc(p.role)}` : ""}</span>${
          p.srcKey ? `<span class="panel__src">${esc(p.srcKey.toUpperCase())}</span>` : ""
        }</div>
        <p class="panel__text">${esc(p.text)}</p>
        ${p.ref ? `<p class="panel__ref">${esc(p.ref)}</p>` : ""}
      </article>`;
    })
    .join("\n");

  const sources = input.sources
    .map(
      (s) => `<li><b>${esc(s.key.toUpperCase())}</b> ${esc(s.outlet)} · ${esc(s.title)}${
        s.publishedAt ? ` <span class="dim">(${esc(s.publishedAt.slice(0, 10))})</span>` : ""
      }<br><a href="${esc(s.url)}">${esc(s.url)}</a></li>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brand.companyName)} · Coffeed cap. ${input.chapterNo} — ${esc(input.title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #fff; color: ${ink};
    font-family: ${font};
    font-size: 15px; line-height: 1.5;
  }
  .sheet { max-width: 820px; margin: 0 auto; padding: 32px 28px 48px; }
  .masthead { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid ${ink}; padding-bottom: 14px; }
  .masthead img { height: 46px; width: auto; }
  .brandname { font-weight: 800; font-size: 20px; letter-spacing: -0.02em; }
  .slogan { font-size: 12px; opacity: .72; }
  .kicker { margin-left: auto; text-align: right; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: ${accent}; }
  h1 { font-size: 34px; line-height: 1.08; letter-spacing: -0.03em; margin: 26px 0 0; }
  .hook { margin: 12px 0 0; font-size: 16px; opacity: .78; border-left: 3px solid ${accent}; padding-left: 12px; }
  .panels { margin: 30px 0 0; display: grid; gap: 12px; }
  .panel { border: 1px solid ${ink}33; background: ${soft}; padding: 16px 18px; break-inside: avoid; }
  .panel__bar { display: flex; justify-content: space-between; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; opacity: .6; margin-bottom: 8px; }
  .panel__src { border: 1px solid currentColor; padding: 0 5px; }
  .panel__text { margin: 0; font-size: 19px; line-height: 1.28; font-weight: 600; letter-spacing: -0.01em; }
  .panel__ref { margin: 8px 0 0; font-size: 11px; opacity: .55; }
  .panel--open .panel__text { font-size: 23px; }
  .panel--close { background: ${ink}; border-color: ${ink}; color: ${onInk}; }
  .panel--close .panel__bar { opacity: .7; }
  .sources { margin: 34px 0 0; border-top: 1px solid ${ink}33; padding-top: 14px; }
  .sources h2 { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 10px; color: ${accent}; }
  .sources ul { margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; }
  .sources a { color: inherit; opacity: .7; word-break: break-all; }
  .dim { opacity: .55; }
  .foot { margin-top: 28px; border-top: 1px solid ${ink}33; padding-top: 12px; font-size: 11px; opacity: .6; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  @media print { .sheet { padding: 0; } }
</style></head>
<body><div class="sheet">
  <header class="masthead">
    ${brand.logoDataUri ? `<img src="${brand.logoDataUri}" alt="">` : ""}
    <div>
      <div class="brandname">${esc(brand.companyName)}</div>
      ${brand.slogan ? `<div class="slogan">${esc(brand.slogan)}</div>` : ""}
    </div>
    <div class="kicker">Coffeed<br>Capítulo ${input.chapterNo}<br>${esc(input.date)}</div>
  </header>

  <h1>${esc(input.title)}</h1>
  ${input.hook ? `<p class="hook">${esc(input.hook)}</p>` : ""}

  <section class="panels">
${panels}
  </section>

  ${sources ? `<section class="sources"><h2>Fuentes</h2><ul>${sources}</ul></section>` : ""}

  <footer class="foot">
    <span>${esc(brand.companyName)} · Coffeed</span>
    <span>Cada dato de este post está trazado a la fuente que lo sostiene.</span>
  </footer>
</div></body></html>`;
}

/** Primer panel = el gancho; sirve de resumen en las tarjetas y en el muro. */
export function postExcerpt(panels: PostPanel[]): string {
  return panels.slice().sort((a, b) => a.position - b.position)[0]?.text ?? "";
}
