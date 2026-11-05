// Guardián de las calculadoras de los cotizadores, servidas solo con sesión de consola (TAR-119).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cotizador-apps-check.mjs
//
// LO QUE PROTEGE. Los cotizadores del ECP embeben dos HTML del owner (Mermas V15, CoGS V19) en un iframe. Hasta TAR-119
// vivían en `public/ocp-apps/` y cualquiera los abría sin sesión. Ahora viven en `private/ocp-apps/` y los sirve
// `src/app/ocp-apps/[archivo]/route.ts` en la misma URL, tras la puerta de la consola. Lo que puede deshacerlo sin que falle
// nada —ni tsc, ni eslint, ni el build—:
//   · que alguien vuelva a copiar un HTML a `public/ocp-apps/` (Next sirve `public/` estático: la ruta ni se entera);
//   · que la ruta lea el disco ANTES de la puerta, o arme la ruta del disco con lo que llegó en la URL;
//   · que la puerta escriba la consola a mano y se quede atrás en la próxima mudanza de los cotizadores (van tres);
//   · que `next.config.ts` deje de trazar la carpeta: en local funciona (el disco está entero) y en producción el iframe
//     sale vacío.
// Sin red, sin base, sin sesión: lee archivos y el módulo puro.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { APPS_COTIZADOR, CARPETA_APPS, appDelCotizador, segmentoDeApp } from "../src/lib/cotizador/apps.ts";
import { consolaDelModulo } from "../src/lib/panel/consoles.ts";

let ok = 0;
const fallos = [];
const check = (n, c, detalle) => (c ? ok++ : fallos.push(detalle ? `${n} (${detalle})` : n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const existe = (r) => existsSync(new URL(`../${r}`, import.meta.url));
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const archivos = Object.keys(APPS_COTIZADOR);

// ── 1 · no hay copia estática ─────────────────────────────────────────────
check("public/ocp-apps/ ya no existe (nada de las calculadoras se sirve estático)", !existe("public/ocp-apps"));
for (const a of archivos) check(`${a} no está en public/ (en ninguna carpeta de primer nivel)`, !existe(`public/${a}`));

// ── 2 · las dos apps están donde la ruta las busca, y nada más ────────────
check("la carpeta es private/ocp-apps", CARPETA_APPS === "private/ocp-apps");
for (const a of archivos) {
  check(`${CARPETA_APPS}/${a} existe`, existe(`${CARPETA_APPS}/${a}`));
  check(`${a} sigue siendo una app HTML entera`, existe(`${CARPETA_APPS}/${a}`) && /<html[\s>]/i.test(lee(`${CARPETA_APPS}/${a}`)));
}
{
  const html = readdirSync(new URL(`../${CARPETA_APPS}`, import.meta.url)).filter((f) => f.endsWith(".html"));
  check("cada .html de la carpeta tiene su línea en APPS_COTIZADOR (y al revés)",
    html.length === archivos.length && html.every((f) => archivos.includes(f)), html.join(","));
}

// ── 3 · la lista blanca es estrecha ───────────────────────────────────────
for (const a of archivos) check(`appDelCotizador acepta ${a}`, appDelCotizador(a) === a);
for (const malo of [
  "", null, undefined, "COTIZADOR-LOTES.HTML", "cotizador-lotes", "cotizador-lotes.html ", "../cotizador-lotes.html",
  "x/../cotizador-lotes.html", "cotizador-lotes.html/", "%2e%2e%2fpackage.json", "README.md", "constructor", "toString", "__proto__",
]) {
  check(`appDelCotizador rechaza ${JSON.stringify(malo)}`, appDelCotizador(malo) === null);
}

// ── 4 · la consola sale del rail, y es la del cotizador que monta la app ──
for (const a of archivos) {
  const seg = segmentoDeApp(a);
  const k = consolaDelModulo(seg);
  check(`${a} → el segmento «${seg}» está en el rail de una consola`, k !== null);
  check(`${a} → la consola del rail tiene la página del cotizador`, k !== null && existe(`src/app/${k}/(app)/${seg}/page.tsx`));
}

// ── 5 · la ruta: puerta primero, disco después, y el disco por la clave ───
const RUTA = "src/app/ocp-apps/[archivo]/route.ts";
check("la ruta existe", existe(RUTA));
{
  const t = sinComentarios(lee(RUTA));
  const iIdentidad = t.indexOf("await requirePanelIdentity()");
  const i404 = t.indexOf("status: 404");
  const iPuerta = t.indexOf("await requireConsoleAccess(consola)");
  const iDisco = t.indexOf("readFile(");
  check("un nombre desconocido pide sesión ANTES de responder 404", iIdentidad > -1 && i404 > iIdentidad);
  check("la puerta de la consola va ANTES de leer el disco", iPuerta > -1 && iDisco > iPuerta);
  check("la consola se lee del rail (consolaDelModulo), no se escribe a mano",
    t.includes("consolaDelModulo(segmentoDeApp(app))") && !/requireConsoleAccess\("/.test(t));
  // En LITERALES y no con CARPETA_APPS: con la constante, Turbopack traza el proyecto entero en la función (aviso del build).
  const literal = CARPETA_APPS.split("/").map((p) => `"${p}"`).join(", ");
  check("la ruta del disco se arma con la carpeta en literales (= CARPETA_APPS) y la clave de la lista blanca",
    t.includes(`readFile(path.join(process.cwd(), ${literal}, app))`) && !/readFile\([^)]*archivo/.test(t), literal);
  check("responde privado, sin caché y sin indexar", t.includes('"private, no-store"') && t.includes("noindex"));
  check("solo la enmarca la propia plataforma", t.includes("frame-ancestors 'self'"));
}

// ── 6 · producción lleva la carpeta ───────────────────────────────────────
check("next.config.ts traza private/ocp-apps para la ruta",
  lee("next.config.ts").includes('"/ocp-apps/[archivo]": ["./private/ocp-apps/**"]'));

// ── 7 · el iframe sigue pidiendo la misma URL, y solo apps de la lista ────
{
  const frame = lee("src/components/cotizador/AppFrame.tsx");
  const pedidas = [...frame.matchAll(/"\/ocp-apps\/([^"]+)"/g)].map((m) => m[1]);
  check("AppFrame monta las apps desde /ocp-apps/", pedidas.length === archivos.length);
  check("AppFrame solo pide apps de la lista blanca", pedidas.every((p) => appDelCotizador(p) === p), pedidas.join(","));
}

// ── 8 · ningún código vuelve a nombrar la carpeta pública ─────────────────
{
  const sucios = [];
  const recorre = (dir) => {
    for (const e of readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
      const r = `${dir}/${e.name}`;
      if (e.isDirectory()) recorre(r);
      else if (/\.(ts|tsx|mjs|js)$/.test(e.name) && sinComentarios(lee(r)).includes("public/ocp-apps")) sucios.push(r);
    }
  };
  recorre("src");
  check("el código de src/ no nombra public/ocp-apps (los comentarios que cuentan la historia, sí)", sucios.length === 0, sucios.join(","));
}

if (fallos.length) {
  console.error(`✗ qa-cotizador-apps: ${fallos.length} fallo(s), ${ok} OK`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-cotizador-apps: ${ok} comprobaciones OK, 0 fallos`);
