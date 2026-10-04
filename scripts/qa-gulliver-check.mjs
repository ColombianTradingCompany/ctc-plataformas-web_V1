// Guardián de Gulliver · 7 días a Tokio (V5.149, 2026-10-04).
//
//   node scripts/qa-gulliver-check.mjs
//
// Puro: no toca la base ni la red, no necesita servidor. Lee el HTML servido
// (`public/tools/gulliver/`, la ruta sale de `src/lib/tools/carpetas.ts`) y
// ejecuta en Node sus partes sin DOM (los datos, las siluetas y el estado).
//
// LO QUE PROTEGE, y por qué existe aparte de los guardianes de todas:
//
//   1. LA FECHA DEL EVENTO EN UN SOLO SITIO. La V1.0 tenía «14 de octubre» en
//      cuatro lugares (la cuenta atrás, la meta de la tarjeta, su pie y el panel
//      «i»). La herramienta se va a reeditar para otra feria: con cuatro copias,
//      la cuenta atrás dice una fecha y el panel otra, y nada falla. Desde la
//      V1.1 todo sale del bloque `/*<EVENTO>*/`; fuera de él no hay fechas.
//   2. LA TRAMPA DEL NAVEGADOR. Un trabajo NUEVO llega con init sin estado y el
//      puente no llama a poner(): si dentro de la concha se leyera
//      localStorage, el trabajo nuevo heredaría el nombre y los sellos del
//      último abierto en ese navegador. Aquí se ejecuta `loadLocal()` con un
//      localStorage sembrado: en un marco devuelve null; suelta, lo lee.
//      (La prueba en un navegador de verdad es la sonda de
//      `qa-tools-puente-conformance`.)
//   3. LOS DESCARGOS DE LA CASA (brief, decisión 7, aprobados el 2026-10-04):
//      pie legal, panel «Acerca de» con sus seis apartados, línea legal del
//      impreso con el NIT de `src/lib/legal.ts`. Si un día el japonés lo revisa
//      un hablante nativo, se cambia el texto de «Créditos» Y la comprobación
//      que lo exige — la pantalla dice la verdad en los dos sentidos.
//   4. Toda frase con su silueta (la V1.0 solo lo avisaba con console.error),
//      sin CDN (autocontenida y sin internet) y el puente al pie.

import { readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

const raiz = new URL("../", import.meta.url);
const carpetas = readFileSync(new URL("src/lib/tools/carpetas.ts", raiz), "utf8");
const archivo = carpetas.match(/\{\s*id:\s*"gulliver",\s*archivos:\s*\["([^"]+)"/)?.[1];
check("carpetas.ts declara la carpeta gulliver", !!archivo);
if (!archivo) fin();

const html = readFileSync(new URL(`public/tools/gulliver/${archivo}`, raiz), "utf8");
const legal = readFileSync(new URL("src/lib/legal.ts", raiz), "utf8");
const NIT = legal.match(/export const NIT = "([^"]+)"/)?.[1];
check("legal.ts tiene el NIT", !!NIT);

// ── el documento ────────────────────────────────────────────────────────────
check('<html lang="es">', /<html[^>]*\blang="es"/.test(html));
check("<title> con el nombre", /<title>Gulliver · 7 días a Tokio[^<]*<\/title>/.test(html));
const i0 = html.indexOf("<script>");
const i1 = html.indexOf("</script>", i0); // el cierre del script PROPIO (el último es el del puente)
check("un solo <script> propio", i0 > 0 && html.indexOf("<script>", i0 + 1) < 0);
const js = html.slice(i0 + 8, i1);
try {
  new Function(js);
  check("el JavaScript compila", true);
} catch (e) {
  check(`el JavaScript compila (${e.message})`, false);
}

// ── sin CDN: todo dentro del archivo, salvo el puente (mismo origen) ────────
check("ningún <script src> externo", !/<script[^>]+src=["']https?:/i.test(html));
check("ningún <link> externo", !/<link[^>]+href=["']https?:/i.test(html));
check("ningún @import ni url(http…)", !/@import|url\(\s*["']?https?:/i.test(html));

// ── 1 · el evento: UN bloque ────────────────────────────────────────────────
const a = js.indexOf("/*<EVENTO>*/");
const b = js.indexOf("/*</EVENTO>*/");
check("bloque /*<EVENTO>*/ … /*</EVENTO>*/ una vez", a > 0 && b > a && js.indexOf("/*<EVENTO>*/", a + 1) < 0);
const fuera = js.slice(0, a) + js.slice(b);
const FECHAS = [
  [/new Date\(\s*\d{4}/, "un new Date(<año>…) cableado"],
  [/\b1[4-7] (al|de|oct)\b/, "un día del evento escrito a mano (14–17 …)"],
  [/SCAJ \d{4}/, "«SCAJ <año>» escrito a mano"],
  [/consultad[oa]s? el \d/, "una fecha de consulta escrita a mano"],
];
for (const [re, que] of FECHAS) check(`fuera del bloque EVENTO no hay ${que}`, !re.test(fuera));

// ── datos, siluetas y evento ejecutados en Node (sin DOM) ───────────────────
const d0 = js.indexOf("/* ---------- utilidades ---------- */");
const d1 = js.indexOf("/* ---------- números y monedas ---------- */");
let D = null;
try {
  D = new Function(js.slice(d0, d1) + ";return {DAYS,PH,ORDER,SIL,IX,ROLE_SIL,DAY_SIL,EVENTO,CORE_DAYS};")();
} catch (e) {
  check(`los datos se ejecutan sin DOM (${e.message})`, false);
}
if (D) {
  const E = D.EVENTO;
  const ini = new Date(...E.inicio);
  const fin_ = new Date(...E.fin);
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  check("EVENTO: el fin no es anterior al inicio", fin_ >= ini);
  check("EVENTO: la meta de la tarjeta es el día de inicio", E.meta === `${ini.getDate()} ${MES[ini.getMonth()]}`);
  check("EVENTO: «fechas» empieza en el inicio y nombra el fin", E.fechas.startsWith(`${ini.getDate()} `) && E.fechas.includes(` ${fin_.getDate()} `));
  const filaFechas = E.ficha.find((r) => r[0] === "Fechas");
  check("EVENTO: la fila «Fechas» del panel dice las mismas fechas", !!filaFechas && filaFechas[1].startsWith(E.fechas));
  check("EVENTO: el nombre lleva el año del inicio", E.nombre.endsWith(String(ini.getFullYear())));
  check("EVENTO: enlaces https", [E.web, ...E.enlaces].every((l) => /^https:\/\//.test(l[0]) && l[1]));

  check("98 frases o más", D.ORDER.length >= 98);
  const sinSil = D.ORDER.filter((id) => !D.PH[id].role && (!D.SIL[id] || !D.IX[D.SIL[id][0]]));
  check(`toda frase tiene silueta${sinSil.length ? " (faltan: " + sinSil.join(", ") + ")" : ""}`, sinSil.length === 0);
  check("cada rol tiene silueta", Object.values(D.ROLE_SIL).every((k) => D.IX[k]));
  check("cada día tiene silueta", Object.values(D.DAY_SIL).every((k) => D.IX[k]));
  check("siete días de ruta", D.CORE_DAYS.length === 7);
}

// ── 2 · la trampa del navegador: el estado, ejecutado con un window falso ───
const e0 = js.indexOf("/* ---------- números y monedas ---------- */");
const e1 = js.indexOf("/* ---------- frases ---------- */");
const SEMBRADO = JSON.stringify({ v: 1, profile: { name: "HEREDADO", country: "co", role: "fan", set: true }, beans: 999, days: {}, ph: {} });
function estado(enMarco) {
  const ventana = {};
  ventana.parent = enMarco ? {} : ventana;
  const almacen = { getItem: () => SEMBRADO, setItem() {}, removeItem() {} };
  return new Function("window", "localStorage", js.slice(e0, e1) + ";return {loadLocal,normalize,blank,state,modo,EN_MARCO,dondeSeGuarda};")(ventana, almacen);
}
try {
  const marco = estado(true);
  check("en un marco: EN_MARCO y modo «marco»", marco.EN_MARCO === true && marco.modo === "marco");
  check("en un marco: loadLocal() NO lee localStorage", marco.loadLocal() === null);
  check("en un marco: arranca en blanco", marco.state.profile.name === "" && marco.state.beans === 0 && !marco.state.profile.set);
  check("en un marco: dice que no guarda", /no se guarda/.test(marco.dondeSeGuarda()));
  const suelta = estado(false);
  check("suelta: loadLocal() sí lee localStorage", suelta.loadLocal()?.profile?.name === "HEREDADO" && suelta.state.beans === 999);
  check("suelta: dice que guarda en el navegador", /este navegador/.test(suelta.dondeSeGuarda()));
  const n = suelta.normalize({ profile: { name: "X" }, beans: "7", days: { 1: { learn: true } } });
  check("normalize() completa lo que falta", n.v === 1 && n.beans === 7 && n.sound === true && !!n.fx?.rates?.JPY);
  check("normalize() no revienta con basura", suelta.normalize("x").profile.name === "" && suelta.normalize(null).beans === 0);
} catch (e) {
  check(`el estado se ejecuta con un window falso (${e.message})`, false);
}
check("todo acceso a localStorage pasa por EN_MARCO", js.split("\n").filter((l) => l.includes("localStorage")).every((l) => l.includes("EN_MARCO") || /^\s*\/\//.test(l)));

// ── el puente ───────────────────────────────────────────────────────────────
check("la línea del puente justo antes de </body>", /<script src="\/tools\/ctc-bridge\.js"><\/script>\s*<\/body>/.test(html));
check("CTC.usarEstado registrado", /window\.CTC\.usarEstado\(/.test(js));
check("CTC.usarResumen registrado", /window\.CTC\.usarResumen\(resumenTrabajo\)/.test(js));
check("se registra en DOMContentLoaded y se vuelve a anunciar", /DOMContentLoaded',registrarPuente/.test(js) && /postMessage\(\{ctc:'ready',v:1\},window\.location\.origin\)/.test(js));
check("cada guardado avisa al puente (tocado en saveLocal)", /function saveLocal\(\)\{[^\n]*tocado\(\);\}/.test(js));
check("el init se escucha validando fuente y origen", /e\.source!==window\.parent\|\|e\.origin!==window\.location\.origin/.test(js));

// ── 3 · los descargos de la casa ────────────────────────────────────────────
const PIE = [
  "es una herramienta propiedad de CTCx · Colombian Trading Company S.A.S. Todos los derechos reservados. © 2026.",
  "Guía de bolsillo con fines educativos: no reemplaza un curso de japonés ni a un intérprete.",
  "ni avalada por ella. Prohibida su reproducción total o parcial sin autorización.",
  "Acerca de esta herramienta",
];
for (const s of PIE) check(`pie legal: «${s.slice(0, 48)}…»`, js.includes(s));
for (const s of ["Qué es", "Límites", "La feria", "Monedas", "Tus datos", "Créditos"]) check(`«Acerca de» tiene «${s}»`, js.includes(`sec('${s}',`));
const ACERCA = [
  "no reemplaza", // (el pie)
  "usa un intérprete o la información oficial",
  "esta herramienta no está afiliada a ellos ni los representa",
  "No es asesoría financiera",
  "No se envía a terceros",
  "SIL Open Font License 1.1",
  "M PLUS Rounded 1c, Shippori Mincho B1 y Anton",
  "Las frases están pendientes de revisión por un hablante nativo.",
];
for (const s of ACERCA) check(`descargo: «${s}»`, js.includes(s));
check("el «Acerca de» es un diálogo modal con «Cerrar»", /class:'about',role:'dialog','aria-modal':'true'/.test(js) && js.includes("'Cerrar')"));
check("el pie sale en la bienvenida, la ruta y la feria", (js.match(/credit\(\)/g) || []).length >= 3);
check(`la hoja impresa lleva el NIT de legal.ts (${NIT})`, !!NIT && new RegExp(`class:'print-legal'\\},'[^']*${NIT.replace(/\./g, "\\.")}`).test(js));
check("en la impresión se ve la línea legal y no el pie", /\.credit,\.about\{display:none!important\}/.test(html) && /\.print-legal\{display:block!important/.test(html));

// ── la voz prefiere una voz local ──────────────────────────────────────────
check("la voz prefiere localService", /x\.localService/.test(js));

fin();
function fin() {
  if (fallos.length) {
    console.error(`✗ qa-gulliver: ${fallos.length} fallo(s), ${ok} OK\n`);
    for (const f of fallos) console.error("   " + f);
    process.exit(1);
  }
  console.log(`✓ qa-gulliver: ${ok} comprobaciones OK, 0 fallos`);
  process.exit(0);
}
