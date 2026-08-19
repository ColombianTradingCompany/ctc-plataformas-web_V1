// Guardián del escaparate de las herramientas (V4.37).
//
//   node scripts/qa-tools-seo-check.mjs
//
// LO QUE PROTEGE: las 12 páginas de `public/tools/` son ARCHIVOS ESTÁTICOS.
// No las pinta Next, así que NO PASAN por `generateMetadata` ni por ningún
// layout: lo que no esté escrito a mano dentro del `<head>` del propio archivo
// sencillamente no existe. Y son URLs públicas e indexables.
//
// Sin descripción, Google no deja el hueco en blanco: recorta un trozo del
// cuerpo de la página y lo pone de titular. En una calculadora, ese trozo suele
// ser una etiqueta de formulario. Nada falla, no hay error en ningún log, y la
// herramienta se anuncia sola con la primera palabra que encontró el robot.
// De las 12, DIEZ estaban así hasta V4.37.
//
// ⚠️ Y hay una trampa peor que faltar: sobrar mal. `mermas-ctc.html` SÍ tenía
// descripción, y describía la calculadora Rápida — pero la base dice que ese
// archivo es la Detallada. Una descripción equivocada es peor que ninguna,
// porque nadie vuelve a mirarla. Por eso aquí no se comprueba solo que exista.
//
// ⚠️ NO SE VALIDA CONTRA `tools.meta_description` (la columna de la base), y es
// a propósito: hoy esa columna NO LA LEE NADIE para servir. El admin del ECP
// deja escribirla, pero ni estos archivos estáticos ni `/tools/h/[slug]` la
// inyectan en ningún sitio. La fuente de verdad de lo que ve Google es el
// archivo. Si algún día se enchufa la columna, este guardián se reapunta.

import { readFileSync, readdirSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

const DIR = new URL("../public/tools/", import.meta.url);
const SUFIJO = "Colombian Trading Company SAS · ctcexport.com";

// Google recorta el resultado alrededor de los 160. Por debajo de 70 no se
// alcanza a decir qué hace la herramienta, que es justo el trabajo del campo.
const MIN = 70;
const MAX = 165;

// Frases de ADMINISTRACIÓN que viven en `tools.descripcion` porque dicen a
// quién se le muestra la herramienta. Son ciertas y son útiles — dentro del
// ECP. En un resultado de búsqueda no las lee el destinatario correcto.
const INTERNAS = [/se ofrece a/i, /reemplazad[ao]/i, /solo para/i, /uso interno/i, /deprecad[ao]/i, /\btest\b/i];

const archivos = readdirSync(DIR).filter((f) => f.endsWith(".html")).sort();
check("hay páginas de herramientas que revisar", archivos.length >= 12);

const vistas = new Map();

for (const nombre of archivos) {
  const html = readFileSync(new URL(nombre, DIR), "utf8");
  const cab = html.slice(0, html.search(/<\/head>/i) + 1 || html.length);

  // ── el título ───────────────────────────────────────────────────────────
  const t = cab.match(/<title>([\s\S]*?)<\/title>/i);
  check(`${nombre}: tiene <title>`, !!t && t[1].trim().length > 0);

  // ── la descripción ──────────────────────────────────────────────────────
  const todas = [...cab.matchAll(/<meta[^>]*name=["']description["'][^>]*>/gi)];
  check(`${nombre}: tiene meta description`, todas.length >= 1);
  // Dos etiquetas es peor que una mala: el robot elige, y no se sabe cuál.
  check(`${nombre}: una sola meta description`, todas.length <= 1);
  if (todas.length !== 1) continue;

  const c = todas[0][0].match(/content=["']([^"']*)["']/i);
  check(`${nombre}: la descripción tiene content`, !!c && c[1].trim().length > 0);
  if (!c) continue;
  const desc = c[1].trim();

  check(`${nombre}: descripción de largo útil (${desc.length})`, desc.length >= MIN && desc.length <= MAX);
  check(`${nombre}: lleva el sufijo de la casa`, desc.endsWith(SUFIJO));

  const cuerpo = desc.slice(0, desc.length - SUFIJO.length).trim();
  check(`${nombre}: dice algo antes del sufijo`, cuerpo.length >= 40);
  for (const re of INTERNAS) {
    check(`${nombre}: sin nota de admin (${re.source})`, !re.test(cuerpo));
  }

  // Dos herramientas con la misma descripción es lo mismo que una sin ella:
  // Google colapsa duplicados y decide él cuál enseña.
  const previa = vistas.get(cuerpo);
  check(`${nombre}: descripción propia`, !previa);
  if (!previa) vistas.set(cuerpo, nombre);

  // ── el idioma ───────────────────────────────────────────────────────────
  // Esto se comprueba porque ya pasó: la ficha del café verde declara
  // `lang="es"` y tiene toda la interfaz en español, y aun así se le escribió
  // primero una descripción en inglés. Un resultado de búsqueda en otro idioma
  // que la página no es un error de nada: es una página que no se abre.
  const lang = (html.match(/<html[^>]*\blang=["']([a-z-]+)["']/i)?.[1] || "").slice(0, 2);
  check(`${nombre}: declara <html lang>`, lang === "es" || lang === "en");
  const marcasES = /\b(de|la|el|del|para|con|que|los|las|un|una)\b/i;
  const marcasEN = /\b(the|of|a|an|to|for|with|and|in|your)\b/i;
  if (lang === "es") check(`${nombre}: descripción en español, como la página`, marcasES.test(cuerpo));
  if (lang === "en") check(`${nombre}: descripción en inglés, como la página`, marcasEN.test(cuerpo));
}

if (fallos.length) {
  console.error(`✗ qa-tools-seo: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-tools-seo: ${ok} comprobaciones OK, 0 fallos (${archivos.length} herramientas)`);
