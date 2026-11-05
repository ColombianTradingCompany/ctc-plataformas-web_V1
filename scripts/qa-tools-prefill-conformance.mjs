// La conformidad del PRELLENADO del taller, en un navegador de verdad (TAR-121).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-tools-prefill-conformance.mjs
//
// NO necesita `next dev` ni la base: levanta un servidor estático propio sobre `public/` (las herramientas y el puente son
// archivos), una página «concha» mínima del MISMO origen y un doble de `/api/herramientas/cromatografia/fincas` que contesta
// tarde (1,2 s), como la red. Necesita Playwright y su Chromium (devDependency). Si el Chromium instalado no es el que espera
// Playwright, `PW_CHROMIUM=/ruta/al/chrome` lo indica.
//
// Lo que comprueba, con los campos EXACTOS que arma `construirPrefill()` (src/lib/tools/entrada.ts) para un lote y su finca:
//   · El puente (`public/tools/ctc-bridge.js`): el prellenado llega al campo y el autoguardado lo recoge en un trabajo nuevo;
//     en la sesión suelta el puente sigue inerte; los selectores hostiles se ignoran y los valores entran como TEXTO; un
//     mensaje que no viene del parent, o que viene de OTRO origen, no se atiende; un <select> cuyas opciones llegan tarde se
//     elige igual (reintento) y corre el manejador de la herramienta; `CTC.usarPrefill` registrado tarde recibe el registro;
//     restaurar un trabajo guardado NO lo vuelve a guardar, y el primer cambio de verdad sí.
//   · Las herramientas con contrato: `mermas-ctc` (notas), `cromatografia-suelo` («Su finca» cuando llega su lista, y lo que
//     su manejador pone), `green-datasheet` (producto, finca, departamento → municipio de la lista que pinta, msnm).
// La Coffee Datasheet (ruta de Next, React) la cubren `qa-coffee-datasheet-check` (lo puro) y la conformidad del puente.

import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { construirPrefill } from "../src/lib/tools/entrada.ts";

const PUB = fileURLToPath(new URL("../public", import.meta.url));
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff" };

const FINCA = { id: "99999999-2222-3333-4444-555555555555", referencia: "CTC-F-99999999", nombre: "El Roble", municipio: "Garzón", departamento: "Huila", altitud_m: 1500 };
const LOTE = { referencia: "CTC-L-6BA7B810", nombre: "Mitaca 2026", variedad: "Castillo", proceso: "Lavado", altitud_m: 1720, finca: FINCA };
const REGISTRO = { finca: FINCA, lote: LOTE };
const FINCAS_API = {
  disponible: true,
  motivo: null,
  cuenta: { nombre: "Prueba" },
  fincas: [
    { id: "11111111-2222-3333-4444-555555555555", nombre: "La Cumbre", municipio: "Pitalito", departamento: "Huila", altitud_m: 1650, pendiente: false, parcelas: [] },
    { id: FINCA.id, nombre: FINCA.nombre, municipio: FINCA.municipio, departamento: FINCA.departamento, altitud_m: FINCA.altitud_m, pendiente: false, parcelas: [] },
  ],
};
const CONCHA = `<!doctype html><body><iframe id="f" style="width:1200px;height:800px"></iframe><script>
  window.msgs = []; addEventListener("message", (e) => { if (e.source === document.getElementById("f").contentWindow) window.msgs.push(e.data); });
</script></body>`;

const servidor = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/__concha.html") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(CONCHA);
  }
  if (u.pathname === "/api/herramientas/cromatografia/fincas") {
    setTimeout(() => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(FINCAS_API));
    }, 1200);
    return;
  }
  const p = join(PUB, decodeURIComponent(u.pathname));
  if (!p.startsWith(PUB) || !existsSync(p) || statSync(p).isDirectory()) {
    res.writeHead(404);
    return res.end("no");
  }
  res.writeHead(200, { "content-type": TIPOS[extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
const PUERTO = servidor.address().port;
const BASE = `http://localhost:${PUERTO}`;
const OTRO_ORIGEN = `http://127.0.0.1:${PUERTO}`;

const navegador = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ["--headless", "--no-sandbox"] } : {});
const pagina = await navegador.newPage();
let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

async function abrir(ruta, concha = BASE) {
  await pagina.goto(`${concha}/__concha.html`);
  await pagina.evaluate((s) => {
    window.msgs = [];
    document.getElementById("f").src = s;
  }, BASE + ruta);
  await pagina.waitForFunction(() => window.msgs.some((m) => m && m.ctc === "ready"), null, { timeout: 30000 });
}
const enviar = (m) => pagina.evaluate((m) => document.getElementById("f").contentWindow.postMessage(m, "*"), m);
const marco = () => pagina.frames().find((f) => f !== pagina.mainFrame());
const valor = (sel) => marco().$eval(sel, (e) => e.value);
const estados = () => pagina.evaluate(() => window.msgs.filter((m) => m.ctc === "estado"));
const espera = (ms) => pagina.waitForTimeout(ms);
const prefill = (id) => {
  const p = construirPrefill(id, REGISTRO);
  return { ctc: "prefill", campos: p.campos, registro: p.registro };
};

try {
  // ── 1. El puente ─────────────────────────────────────────────────────────────────────────────────────────────────
  const MERMAS = "/tools/mermas-ctc/mermas-ctc.html";
  const notas = construirPrefill("mermas-ctc", REGISTRO).campos[0].valor;

  await abrir(MERMAS);
  await enviar({ ctc: "init", nombre: "Mitaca", estado: {} });
  await enviar(prefill("mermas-ctc"));
  await espera(1500);
  check("trabajo nuevo: el prellenado llega al campo", (await valor("#notes")) === notas);
  check("trabajo nuevo: el autoguardado lo recoge", (await estados()).some((m) => m.estado["i:notes"] === notas));

  await abrir(MERMAS);
  await enviar(prefill("mermas-ctc"));
  await espera(1500);
  check("sesión suelta: el prellenado llega", (await valor("#notes")) === notas);
  check("sesión suelta: el puente sigue inerte (nada se guarda)", (await estados()).length === 0);

  await abrir(MERMAS);
  await enviar({ ctc: "init", nombre: "x", estado: {} });
  // `#notes, #qtyIn` alcanzaría `#qtyIn` (va antes en el documento) si el puente perdiera su lista blanca
  // (`SELECTOR_SIMPLE`): el campo numérico tiene que quedar como estaba.
  const qtyAntes = await valor("#qtyIn");
  await enviar({
    ctc: "prefill",
    campos: [{ sel: "body *", valor: "x" }, { sel: "#notes, #qtyIn", valor: "x" }, { sel: "img[src=x]", valor: "x" }, { sel: "#notes", valor: "<img src=x onerror=alert(1)>" }],
    registro: null,
  });
  await espera(1200);
  check(
    "selectores hostiles ignorados y el valor entra como texto",
    (await valor("#notes")) === "<img src=x onerror=alert(1)>" && (await marco().$$("img[src=x]")).length === 0 && (await valor("#qtyIn")) === qtyAntes,
  );

  await abrir(MERMAS);
  await marco().evaluate(() => window.postMessage({ ctc: "prefill", campos: [{ sel: "#notes", valor: "intruso" }] }, "*"));
  await espera(800);
  check("un prellenado que no viene del parent no se atiende", (await valor("#notes")) === "");

  await abrir(MERMAS, OTRO_ORIGEN);
  await enviar({ ctc: "prefill", campos: [{ sel: "#notes", valor: "de otro origen" }], registro: null });
  await espera(900);
  check("un prellenado de OTRO origen no se atiende", (await valor("#notes")) === "");

  await abrir(MERMAS);
  await enviar({ ctc: "prefill", campos: [], registro: { finca: { nombre: "La Cumbre" }, lote: null } });
  await espera(400);
  const tarde = await marco().evaluate(() => new Promise((r) => window.CTC.usarPrefill((reg) => r(reg && reg.finca && reg.finca.nombre))));
  check("CTC.usarPrefill registrado tarde recibe el registro", tarde === "La Cumbre");

  await abrir(MERMAS);
  await enviar({ ctc: "init", nombre: "Guardado", estado: { __ctc: 1, "i:notes": "guardado antes" } });
  await espera(1600);
  check("restaurar: el campo vuelve", (await valor("#notes")) === "guardado antes");
  check("restaurar: abrir un trabajo no lo vuelve a guardar", (await estados()).length === 0);
  await marco().fill("#notes", "cambio de verdad");
  await espera(1500);
  check("restaurar: el primer cambio de verdad sí se guarda", (await estados()).some((m) => m.estado["i:notes"] === "cambio de verdad"));

  // ── 2. Lector de Cromatografía: «Su finca» llega 1,2 s tarde ────────────────────────────────────────────────────────
  await abrir("/tools/cromatografia-suelo/cromatografia-suelo.html");
  await enviar({ ctc: "init", nombre: "Croma", estado: {} });
  await enviar(prefill("cromatografia-suelo"));
  await espera(3500);
  check("cromatografía: «Su finca» se elige cuando llega la lista", (await valor("#fincaSel")) === FINCA.id);
  check("cromatografía: su manejador pone municipio y altitud", (await valor("#municipio")) === FINCA.municipio && (await valor("#altitud")) === String(FINCA.altitud_m));
  check("cromatografía: la variedad del lote", (await valor("#variedad")) === LOTE.variedad);
  check("cromatografía: no pidió el registro, no lo recibe", construirPrefill("cromatografia-suelo", REGISTRO).registro === null);
  check("cromatografía: el trabajo nuevo guarda el contexto prellenado", (await estados()).some((m) => JSON.stringify(m.estado).includes(FINCA.municipio)));

  // ── 3. Ficha de café verde: el departamento pinta los municipios ───────────────────────────────────────────────────
  await abrir("/tools/green-datasheet/green-coffee-datasheet.html");
  await enviar({ ctc: "init", nombre: "Ficha", estado: {} });
  await enviar(prefill("green-datasheet"));
  await espera(1500);
  check("ficha verde: nombre del producto = nombre del lote", (await valor('[data-field="product_name"]')) === LOTE.nombre);
  check("ficha verde: la finca", (await valor('[data-field="estate"]')) === FINCA.nombre);
  check("ficha verde: el departamento", (await valor("#region_dep")) === FINCA.departamento);
  check("ficha verde: el municipio, de la lista que pintó el departamento", (await valor("#county_muni")) === FINCA.municipio);
  check("ficha verde: msnm = la altitud del lote", (await valor('[data-field="masl"]')) === String(LOTE.altitud_m));
  check("ficha verde: el trabajo nuevo lo guarda", (await estados()).some((m) => JSON.stringify(m.estado).includes(FINCA.nombre)));
} finally {
  await navegador.close();
  servidor.close();
}

if (fallos.length) {
  console.error(`✗ qa-tools-prefill-conformance: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-tools-prefill-conformance: ${ok} comprobaciones OK, 0 fallos (puente + mermas-ctc + cromatografia-suelo + green-datasheet, en Chromium)`);
