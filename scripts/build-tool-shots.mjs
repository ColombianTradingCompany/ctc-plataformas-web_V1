// ── Las capturas del carrusel de Herramientas (A8, 2026-08-19) ───────────────
//
//   1. npm run dev   (en otra terminal — las capturas se toman del server local)
//   2. node scripts/build-tool-shots.mjs            (todas)
//      node scripts/build-tool-shots.mjs <id> [<id>…] (solo esas: una herramienta nueva no reescribe las demás)
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
  "mermas-rapida": "/tools/mermas-rapida/mermas-rapida.html",
  "mermas-ctc": "/tools/mermas-ctc/mermas-ctc.html",
  agtron: "/tools/agtron/agtron-dial.html",
  "cogs-verde": "/tools/cogs-verde/cogs-cafe-verde.html",
  "costo-empaque": "/tools/costo-empaque/costo-empaque.html",
  "cool-pdf": "/tools/cool-pdf/cool-pdf.html",
  catacion: "/tools/catacion/rueda-del-cafe-v23.html", // V23 del owner (V5.7) — la captura sigue al publicado
  "green-datasheet": "/tools/green-datasheet/green-coffee-datasheet.html",
  "coffee-datasheet": "/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html?lang=es", // V5.132 — abre en la elección de método; ?lang=es porque sin él sigue al navegador (y el de la captura habla inglés)
  qr: "/tools/qr/generador-qr.html",
  "formula-calidad": "/tools/formula-calidad/formula-calidad.html",
  "viaje-cafe": "/tools/viaje-cafe/viaje-cafe.html",
  "mapa-variedades": "/tools/mapa-variedades/mapa-variedades.html",
  "defectos-cafe": "/tools/defectos-cafe/defectos-cafe.html",
  "cromatografia-suelo": "/tools/cromatografia-suelo/cromatografia-suelo.html",
  gulliver: "/tools/gulliver/gulliver-7-dias-a-tokio.html", // V5.149 — con un avance de ejemplo (PREPARAR): sin él sale la bienvenida
};

/** Herramientas que se capturan con un estado de ejemplo: se escribe en su localStorage y se recarga.
 *  La captura debe enseñar la herramienta EN USO, no su formulario vacío. */
const PREPARAR = {
  gulliver: {
    clave: "nihongo-scaj-2026-v1",
    estado: {
      v: 1,
      profile: { name: "Ana", country: "co", role: "prod", set: true },
      beans: 85,
      days: { 1: { learn: true, quiz: 90, build: 80 }, 2: { learn: true, quiz: 75, build: 70 }, 3: { learn: true } },
      ph: {},
      sound: true,
      updatedAt: 0,
    },
  },
};

mkdirSync(SALIDA, { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });

// V5.132: con ids por argumento se capturan solo esas (un id desconocido se dice y se sale: no se captura «nada» en silencio).
const pedidas = process.argv.slice(2);
const desconocidas = pedidas.filter((id) => !(id in HERRAMIENTAS));
if (desconocidas.length) {
  console.error(`✗ id(s) fuera del mapa: ${desconocidas.join(", ")}`);
  process.exit(1);
}
const lista = Object.entries(HERRAMIENTAS).filter(([id]) => !pedidas.length || pedidas.includes(id));

let ok = 0;
for (const [id, ruta] of lista) {
  try {
    await pagina.goto(BASE + ruta, { waitUntil: "networkidle", timeout: 30000 });
    const prep = PREPARAR[id];
    if (prep) {
      await pagina.evaluate(([k, v]) => localStorage.setItem(k, v), [prep.clave, JSON.stringify(prep.estado)]);
      await pagina.reload({ waitUntil: "networkidle", timeout: 30000 });
    }
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
console.log(`${ok}/${lista.length} capturas en public/images/herramientas/shots/`);
process.exit(ok === lista.length ? 0 : 1);
