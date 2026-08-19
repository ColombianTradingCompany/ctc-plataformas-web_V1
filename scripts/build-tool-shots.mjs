// ── Las capturas del carrusel de Herramientas (A8, 2026-08-19) ───────────────
//
//   1. npm run dev   (en otra terminal — las capturas se toman del server local)
//   2. node scripts/build-tool-shots.mjs
//   3. comitear public/images/herramientas/shots/
//
// El MISMO modelo que scripts/build-og-cards.mjs: se corre a mano y el
// resultado se comitea — nada se genera en build. El carrusel de la landing
// (`CarruselHerramientas`) busca `shots/<id>.jpg` por convención y cae a una
// tarjeta de texto si no existe, así que una herramienta nueva subida por el
// ECP funciona desde el primer día y gana su captura la próxima vez que
// alguien corra esto.
//
// La LISTA no se consulta a la base a propósito: este script corre sin
// credenciales. Es el mapa id → archivo de public/tools/ del día en que se
// corre; una herramienta subida por el ECP (Storage) se captura contra
// /tools/h/<id>. Mantenerlo al día es parte de correr el script.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.SHOTS_BASE ?? "http://localhost:3000";
const SALIDA = new URL("../public/images/herramientas/shots/", import.meta.url);

/** id del registro `tools` → ruta que sirve su versión publicada. */
const HERRAMIENTAS = {
  "mermas-rapida": "/tools/mermas-rapida.html",
  "mermas-ctc": "/tools/mermas-ctc.html",
  agtron: "/tools/agtron-dial.html",
  "cogs-verde": "/tools/cogs-cafe-verde.html",
  "costo-empaque": "/tools/costo-empaque.html",
  "cool-pdf": "/tools/cool-pdf.html",
  catacion: "/tools/rueda-catacion.html",
  "green-datasheet": "/tools/green-coffee-datasheet.html",
  qr: "/tools/generador-qr.html",
  "formula-calidad": "/tools/formula-calidad.html",
  "viaje-cafe": "/tools/viaje-cafe.html",
};

mkdirSync(SALIDA, { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });

let ok = 0;
for (const [id, ruta] of Object.entries(HERRAMIENTAS)) {
  try {
    await pagina.goto(BASE + ruta, { waitUntil: "networkidle", timeout: 30000 });
    // Un respiro para animaciones de entrada: la captura debe parecer la
    // herramienta en uso, no su esqueleto a medio pintar.
    await pagina.waitForTimeout(1800);
    // fileURLToPath y no `.pathname`: pathname codifica los espacios como %20
    // y en Windows este repo vive en «CTC Web Platform» — la primera corrida
    // escribió las once capturas en una carpeta literal `%20` sin fallar nada.
    await pagina.screenshot({ path: fileURLToPath(new URL(`${id}.jpg`, SALIDA)), type: "jpeg", quality: 82 });
    console.log(`✓ ${id}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${id}: ${e.message.split("\n")[0]}`);
  }
}

await navegador.close();
console.log(`${ok}/${Object.keys(HERRAMIENTAS).length} capturas en public/images/herramientas/shots/`);
process.exit(ok === Object.keys(HERRAMIENTAS).length ? 0 : 1);
