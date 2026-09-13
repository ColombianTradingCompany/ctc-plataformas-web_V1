// Recorrido completo del Lector de Cromatografía en Chromium sin cabeza (V5.38).
//
//   node scripts/cromatografia-recorrido.mjs [carpeta-salida] [lectura.json]
//
// Sirve public/ desde disco con page.route (sin servidor ni cuenta; /api responde
// 401) y recorre, en modo oscuro y claro: el «?» del paso 1 y una foto de ejemplo
// por la compuerta real, una lectura REAL del modelo inyectada por el camino de la
// concha (init del puente), la cara del laboratorio con la foto anotada, la
// identificación con RUT y firma, la exportación del Feedback Técnico, el «i» con
// recursos y PDF, y la restauración de un trabajo nuevo y de uno anterior a V5.38.
// Deja capturas, dos PDF impresos y recorrido.json en la carpeta de salida
// (por defecto <tmp>/croma-recorrido).
//
// La lectura sale del último <tmp>/croma-modelo-*.json que escribe
// scripts/qa-cromatografia-modelo.mjs (esa prueba sí gasta: ≈ US$ 0,02). No es un
// guardián de la compuerta: es la verificación visual antes de entregar.

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(RAIZ, "public");
const OUT = process.argv[2] || join(tmpdir(), "croma-recorrido");
mkdirSync(OUT, { recursive: true });
const archivoLectura = process.argv[3] || readdirSync(tmpdir()).filter((n) => n.startsWith("croma-modelo-")).map((n) => join(tmpdir(), n)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!archivoLectura) {
  console.error("No hay lectura: corre antes node scripts/qa-cromatografia-modelo.mjs o pasa un croma-modelo-*.json.");
  process.exit(2);
}
const lectura = JSON.parse(readFileSync(archivoLectura, "utf8")).reportes[0];
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf" };
const r = { lectura_de: archivoLectura };
const errores = [];

const b = await chromium.launch();
async function contexto(esquema) {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: esquema });
  await ctx.route("http://ctc.local/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.startsWith("/api/")) return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ disponible: false, fincas: [] }) });
    const f = join(PUBLIC, decodeURIComponent(ruta));
    if (!existsSync(f)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, contentType: TIPOS[extname(f)] || "application/octet-stream", body: readFileSync(f) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errores.push(`${esquema}: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error" && !m.text().includes("401")) errores.push(`${esquema} consola: ${m.text()}`); });
  await p.goto("http://ctc.local/tools/cromatografia-suelo.html", { waitUntil: "load" });
  await p.waitForTimeout(700);
  return { ctx, p };
}

for (const esquema of ["dark", "light"]) {
  const R = (r[esquema] = {});
  const { ctx, p } = await contexto(esquema);
  R.colores = await p.evaluate(() => ({ fondo: getComputedStyle(document.body).backgroundColor, tarjeta: getComputedStyle(document.querySelector(".card")).backgroundColor, texto: getComputedStyle(document.body).color }));
  await (await p.$("#paso-foto")).screenshot({ path: join(OUT, `paso1-${esquema}.png`) });

  // 1 · «?» y una foto de ejemplo por la compuerta real
  await p.click("#btnAyudaCroma");
  await p.waitForTimeout(300);
  R.dialogo_croma = await p.evaluate(() => ({ abierto: document.querySelector("#dlgCroma").open, puntos: document.querySelectorAll("#dlgCroma .cinco li").length, ejemplos_cargan: [...document.querySelectorAll("#dlgCroma .ejemplo img")].map((i) => i.complete && i.naturalWidth > 0) }));
  await p.screenshot({ path: join(OUT, `dialogo-que-es-${esquema}.png`) });
  await p.click('[data-ejemplo="2"]');
  await p.waitForTimeout(5000);
  R.ejemplo = await p.evaluate(() => ({ compuerta: document.querySelector("#gateProductor").textContent, guardado: JSON.parse(localStorage.getItem("ctc-croma-ultimo")).foto_ejemplo }));

  // 2 · Lectura real del modelo por el camino de la concha
  await p.evaluate(({ lectura }) => {
    const e = JSON.parse(localStorage.getItem("ctc-croma-ultimo"));
    e.estado = "con-lectura";
    e.lectura = lectura;
    e.meta = { prompt_version: "recorrido", rules_version: "recorrido", model_name: "claude-haiku-4-5-20251001", timestamp: new Date().toISOString(), intentos: 1 };
    Object.assign(e.contexto, { departamento: "Caldas", municipio: "Chinchiná", manejo: "orgánico", fecha_muestra: "2026-09-08", papel: "whatman-4", dilucion: "100", dias_revelado: "7" });
    window.postMessage({ ctc: "init", nombre: "demo", estado: e }, "*");
  }, { lectura });
  await p.waitForTimeout(1500);
  R.productor = await p.evaluate(() => ({ meta: document.querySelector("#pMeta").textContent, figura: !document.querySelector("#pFigura").hidden, flechas: document.querySelectorAll("#pFiguraSvg line.flecha").length }));
  await p.screenshot({ path: join(OUT, `cara-productor-${esquema}.png`), fullPage: true });

  // 3 · Laboratorio: foto anotada, identificación y firma
  await p.click('nav.caras button[data-cara="laboratorio"]');
  await p.waitForTimeout(1200);
  await p.fill("#fbLab", "Laboratorio de Suelos de Prueba");
  await p.fill("#fbRut", "800.197.268-5");
  R.rut_mal = await p.textContent("#fbRutAviso");
  await p.fill("#fbRut", "800.197.268-4");
  R.rut_bien = await p.textContent("#fbRutAviso");
  await p.fill("#fbNombre", "Técnica de Prueba");
  await p.fill("#fbRol", "Ingeniera agrónoma");
  // El lienzo debe estar a la vista: el mouse no firma fuera de la ventana.
  await p.$eval("#fbFirma", (el) => el.scrollIntoView({ block: "center" }));
  await p.waitForTimeout(200);
  const lienzo = await (await p.$("#fbFirma")).boundingBox();
  await p.mouse.move(lienzo.x + 40, lienzo.y + lienzo.height * 0.7);
  await p.mouse.down();
  for (let k = 0; k <= 30; k++) await p.mouse.move(lienzo.x + 40 + k * 12, lienzo.y + lienzo.height * (0.5 + 0.25 * Math.sin(k / 3)), { steps: 2 });
  await p.mouse.up();
  await p.waitForTimeout(200);
  R.laboratorio = await p.evaluate(() => ({
    figura_visible: !document.querySelector("#lFigura").hidden,
    flechas: document.querySelectorAll("#lFiguraSvg line.flecha").length,
    etiquetas: [...document.querySelectorAll("#lFiguraSvg text tspan[font-size='13']")].map((t) => t.textContent),
    marcadores: [...document.querySelectorAll("marker")].map((m) => m.id),
    firma: document.querySelector("#fbFirmaEstado").textContent,
  }));
  await p.screenshot({ path: join(OUT, `cara-laboratorio-${esquema}.png`), fullPage: true });
  await (await p.$("#labFeedback")).screenshot({ path: join(OUT, `feedback-identificacion-${esquema}.png`) });

  // 4 · Exportar el Feedback Técnico
  R.export = await p.evaluate(async () => {
    let capturado = null;
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { capturado = { href: this.href, name: this.download }; };
    document.querySelector("#btnExportarFeedback").click();
    HTMLAnchorElement.prototype.click = original;
    const j = JSON.parse(await (await fetch(capturado.href)).text());
    return { archivo: capturado.name, esquema: j.esquema, laboratorio: j.feedback.laboratorio, tecnico: j.feedback.tecnico.nombre, firma_png: /^data:image\/png;base64,/.test(j.feedback.tecnico.firma || ""), tamano_kb: Math.round(JSON.stringify(j).length / 1024) };
  });

  // 5 · «i»: método, recursos y documentos (fetch dentro de la página: p.request no pasa por ctx.route)
  await p.click("#btnInfoMetodo");
  await p.waitForTimeout(300);
  R.dialogo_metodo = await p.evaluate(() => ({ abierto: document.querySelector("#dlgMetodo").open, acordeones_cerrados: [...document.querySelectorAll("#dlgMetodo details")].every((d) => !d.open), palabras: document.querySelector("#dlgMetodo .metodo").textContent.trim().split(/\s+/).length }));
  await p.evaluate(() => document.querySelectorAll("#dlgMetodo details").forEach((d) => (d.open = true)));
  const pdfs = await p.evaluate(() => [...document.querySelectorAll("#dlgMetodo .docs a")].map((a) => a.getAttribute("href")));
  R.pdfs = [];
  for (const href of pdfs) R.pdfs.push(await p.evaluate(async (h) => { const x = await fetch(h); return [h, x.status, x.headers.get("content-type")]; }, href));
  await p.evaluate(() => document.querySelector("#dlgMetodo .docs").scrollIntoView());
  await p.screenshot({ path: join(OUT, `dialogo-metodo-${esquema}.png`) });
  await p.keyboard.press("Escape");

  // 6 · Restaurar: el trabajo vuelve con identificación y firma; uno anterior a V5.38 no rompe
  const guardado = await p.evaluate(() => localStorage.getItem("ctc-croma-ultimo"));
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(600);
  await p.evaluate((g) => window.postMessage({ ctc: "init", nombre: "demo", estado: JSON.parse(g) }, "*"), guardado);
  await p.waitForTimeout(900);
  R.restaurado = await p.evaluate(() => ({ lab: document.querySelector("#fbLab").value, firma: document.querySelector("#fbFirmaEstado").textContent }));
  await p.evaluate((g) => { const e = JSON.parse(g); e.feedback = { tecnico: { nombre: "Viejo", rol: "" }, general: { calidad_foto: "", valoracion: "", comentario: "" }, items: {}, actualizado: null }; window.postMessage({ ctc: "init", nombre: "demo", estado: e }, "*"); }, guardado);
  await p.waitForTimeout(700);
  await p.fill("#fbLab", "Institución nueva");
  R.migrado = await p.evaluate(() => ({ nombre: document.querySelector("#fbNombre").value, lab: document.querySelector("#fbLab").value }));

  if (esquema === "light") {
    await p.evaluate(() => { document.body.dataset.imprime = "laboratorio"; });
    await p.pdf({ path: join(OUT, "feedback-laboratorio.pdf"), format: "A4", printBackground: true, margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" } });
    await p.evaluate(() => { document.querySelectorAll("#informeProductor details").forEach((d) => d.setAttribute("open", "")); document.body.dataset.imprime = "productor"; });
    await p.pdf({ path: join(OUT, "informe-productor.pdf"), format: "A4", printBackground: true, margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" } });
  }
  await ctx.close();
}
r.errores = errores;
writeFileSync(join(OUT, "recorrido.json"), JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
console.log(`\nCapturas y PDF en ${OUT}`);
await b.close();
process.exit(errores.length ? 1 : 0);
