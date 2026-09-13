// Calibración de la compuerta del Lector de Cromatografía sobre una carpeta de fotos.
//
//   node scripts/cromatografia-calibrar.mjs <carpeta> [escala]
//
// Pasa cada foto por el motor real (public/tools/assets/cromatografia-rasgos.js) en
// Chromium sin cabeza, igual que la herramienta: lienzo de 900 px y resolución
// juzgada sobre la foto original. «escala» = cuántas veces más grande era la foto
// original que el archivo. Las 448 px de Martins et al. 2026 (Zenodo 18851814,
// raw_448px.zip) son reducciones de capturas de 8.096 px: escala 18.07. Fotos
// propias o las de ejemplo: escala 1.
//
// Imprime cuántas pasan, los motivos de rechazo, la razón de ejes, el diámetro y
// dónde caen las tres fronteras de zona. TODAS=1 lista cada foto; MAX=n limita.
// No es un guardián: es la herramienta para decidir umbrales con datos (DOC-03).

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = process.argv[2];
if (!DIR) {
  console.error("Uso: node scripts/cromatografia-calibrar.mjs <carpeta> [escala]");
  process.exit(2);
}
const ESCALA = Number(process.argv[3] || 1);
const motor = readFileSync(join(RAIZ, "public/tools/assets/cromatografia-rasgos.js"), "utf8");
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent("<body></body>");
await p.addScriptTag({ content: motor });

const filas = [];
for (const f of readdirSync(DIR).filter((x) => /\.(png|jpe?g|webp)$/i.test(x))) {
  const mime = /png$/i.test(f) ? "image/png" : /webp$/i.test(f) ? "image/webp" : "image/jpeg";
  const src = `data:${mime};base64,` + readFileSync(join(DIR, f)).toString("base64");
  const r = await p
    .evaluate(
      async ([s, esc]) => {
        const img = new Image();
        img.src = s;
        await img.decode();
        const k = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = Object.assign(document.createElement("canvas"), { width: Math.round(img.naturalWidth * k), height: Math.round(img.naturalHeight * k) });
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const res = CromaRasgos.analizar(c.getContext("2d").getImageData(0, 0, c.width, c.height), { escalaOriginal: (esc * img.naturalWidth) / c.width });
        return { v: res.validation_report, ri: res.rasgos?.radiality_index, fr: res.rasgos?.zone_boundaries_rel, fuente: res.rasgos?.zone_boundaries_source };
      },
      [src, ESCALA],
    )
    .catch((e) => ({ error: String(e) }));
  filas.push({ f, ...r });
}
await b.close();

const n = filas.filter((x) => !x.error);
const cuenta = (m) => n.filter((x) => x.v.motivos.includes(m)).length;
const q = (arr, pp) => {
  const s = arr.filter((x) => typeof x === "number").sort((a, c) => a - c);
  return s.length ? s[Math.min(s.length - 1, Math.floor(pp * s.length))] : null;
};
console.log(`${n.length} imágenes · pasan ${n.filter((x) => !x.v.motivos.length).length}`);
console.log(`motivos · sin_circulo ${cuenta("sin_circulo")} · nitidez ${cuenta("nitidez")} · resolucion ${cuenta("resolucion")} · recorte ${cuenta("recorte")} · fondo ${cuenta("fondo")} · oblicua ${cuenta("oblicua")}`);
const conCirculo = n.filter((x) => x.v.circulo_detectado);
const ejes = conCirculo.map((x) => x.v.razon_ejes);
const diam = conCirculo.map((x) => x.v.diametro_px);
console.log(`razón de ejes p5/p50/p95: ${q(ejes, 0.05)} / ${q(ejes, 0.5)} / ${q(ejes, 0.95)} · mínimo ${ejes.length ? Math.min(...ejes) : null}`);
console.log(`diámetro px p5/p50/p95: ${q(diam, 0.05)} / ${q(diam, 0.5)} / ${q(diam, 0.95)}`);
const fr = n.filter((x) => x.fr);
for (let i = 0; i < 3; i++) {
  const v = fr.map((x) => x.fr[i]);
  const medidas = fr.filter((x) => x.fuente[i] === "medida").length;
  console.log(`frontera ${i + 1}: p10/p50/p90 ${q(v, 0.1)} / ${q(v, 0.5)} / ${q(v, 0.9)} · medida en ${medidas} de ${fr.length}`);
}
for (const x of n.filter((x) => process.env.TODAS || x.v.motivos.length).slice(0, Number(process.env.MAX || 12))) {
  console.log(`  ${x.v.motivos.length ? "rechazo" : "pasa"} ${x.f}: ${x.v.motivos.join("+")} · ejes ${x.v.razon_ejes} · ${x.v.diametro_px} px · nitidez ${x.v.nitidez}`);
}
for (const x of filas.filter((x) => x.error)) console.log(`  error ${x.f}: ${x.error}`);
