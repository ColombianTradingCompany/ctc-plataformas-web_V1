// Construye la FICHA TÉCNICA (PDF, una página) de cada lote mock de la cinta.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/build-fichas-mock.mjs
//
// POR QUÉ EXISTE. El botón «Ver ficha técnica» de la tarjeta abre el archivo del
// lote. Los lotes de verdad traerán el suyo; los siete mock no tenían ninguno —
// las hojas de cálculo que Notion enlaza viven en un Drive que no es el de la
// plataforma y no son públicas. Así que se generan aquí, con los MISMOS datos
// que enseña la tarjeta y sin un solo dato comercial.
//
// Mismo espíritu que `build-og-cards.mjs`: un script de taller que fabrica un
// activo estático y se vuelve a correr cuando el dato cambia. Si el owner corrige
// una ficha en `src/lib/catalogo/sneakPeekMock.ts`, se corre esto y ya.
//
// SALIDA: `public/docs/fichas-mock/<código>.pdf`. Va bajo `docs/` a propósito —
// es una de las tres carpetas que el proxy EXCLUYE del reescrito por subdominio
// (`images/`, `docs/`, `tools/`). Una carpeta nueva en la raíz daría 404 en los
// 18 subdominios, que es el error clásico de esta casa.
//
// Cómo se retiran: borre la carpeta `public/docs/fichas-mock/` junto con
// `sneakPeekMock.ts` (la receta completa está en la cabecera de ese archivo).

import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SNEAK_PEEK_MOCK } from "../src/lib/catalogo/sneakPeekMock.ts";
import { GRADO_POR_ID } from "../src/lib/grados/definicion.ts";
import { CTC_LEGAL_LINE } from "../src/lib/legal.ts";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = `${RAIZ}/public/docs/fichas-mock`;
const TEMPORAL = `${RAIZ}/.fichas-tmp`;
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

/** Un URL de fichero valido en Windows y en POSIX. Construirlo a mano con
 *  reemplazos de separador es justo lo que produce ERR_FILE_NOT_FOUND. */
const url = (ruta) => pathToFileURL(ruta).href;

const esc = (s) =>
  String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function html(lote) {
  const grado = GRADO_POR_ID[lote.grade];
  const origen = [lote.municipio, lote.departamento].filter(Boolean).join(", ");
  const filas = [
    ["Finca", lote.finca],
    ["Origen", origen],
    ["Altitud", lote.altitudeM != null ? `${lote.altitudeM} m s. n. m.` : "—"],
    ["Variedad", lote.variety],
    ["Proceso", lote.process],
    ["Temporada", lote.season.es],
  ];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  @page{size:A4;margin:0}
  *{box-sizing:border-box}
  body{margin:0;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;color:#12101A;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .hoja{width:210mm;height:297mm;padding:18mm 18mm 14mm;display:flex;flex-direction:column}
  .cab{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #12101A;padding-bottom:9mm}
  .cab img{height:16mm;width:auto}
  .cab .tit{text-align:right}
  .cab .tit b{display:block;font-size:12pt;letter-spacing:.14em;text-transform:uppercase}
  .cab .tit span{display:block;font-size:8.5pt;color:#5A5568;letter-spacing:.06em;margin-top:1.5mm}
  .nombre{font-size:26pt;font-weight:800;line-height:1.1;margin:11mm 0 0}
  .codigo{font-family:"Cascadia Mono",Consolas,monospace;font-size:9.5pt;color:#5A5568;letter-spacing:.1em;margin-top:2mm}
  .grado{display:flex;align-items:center;gap:6mm;margin:9mm 0 0}
  .sello{width:22mm;height:22mm;border-radius:50%;background:${grado.hex};display:flex;align-items:center;justify-content:center}
  .sello img{width:100%;height:100%;border-radius:50%;object-fit:cover}
  .gtxt b{display:block;font-size:15pt;font-weight:800;color:${grado.hex}}
  .gtxt span{display:block;font-size:9pt;color:#5A5568;margin-top:1mm}
  .puntaje{margin-left:auto;text-align:right}
  .puntaje b{display:block;font-size:30pt;font-weight:800;line-height:1}
  .puntaje span{display:block;font-size:8.5pt;letter-spacing:.14em;color:#5A5568;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin-top:11mm}
  td{padding:3.4mm 0;border-bottom:1px solid #E4E1EC;font-size:10.5pt;vertical-align:top}
  td.k{width:38mm;color:#5A5568;font-size:8.5pt;letter-spacing:.1em;text-transform:uppercase;padding-top:4.2mm}
  .cata{margin-top:10mm}
  .cata h2{font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;color:#5A5568;margin:0 0 3mm}
  .cata p{font-size:12pt;line-height:1.5;margin:0;max-width:150mm}
  .aviso{margin-top:auto;background:#F7F6FB;border:1px solid #DDD9EE;border-left:4px solid ${grado.hex};padding:5mm 6mm;font-size:8.5pt;line-height:1.5;color:#3A3548}
  .aviso b{display:block;margin-bottom:1.5mm;letter-spacing:.1em;text-transform:uppercase;font-size:8pt}
  .pie{margin-top:6mm;border-top:1px solid #E4E1EC;padding-top:4mm;font-size:7.5pt;color:#5A5568;display:flex;justify-content:space-between}
  </style></head><body><div class="hoja">
    <div class="cab">
      <img src="${url(`${RAIZ}/public/images/shared/ctc-logo-full.png`)}" alt="">
      <div class="tit"><b>Ficha técnica de café</b><span>Café verde de origen · Colombia</span></div>
    </div>
    <h1 class="nombre">${esc(lote.name)}</h1>
    <div class="codigo">${esc(lote.code)}</div>
    <div class="grado">
      <div class="sello"><img src="${url(`${RAIZ}/public${grado.logo}`)}" alt=""></div>
      <div class="gtxt"><b>Grado ${esc(grado.nombre)}</b><span>${esc(grado.lema)} · SCA ${grado.scaMin}–${grado.scaMax}</span></div>
      <div class="puntaje"><b>${esc(lote.score)}</b><span>Puntaje SCA${lote.scoreEstimated ? " · estimado" : ""}</span></div>
    </div>
    <table>${filas
      .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`)
      .join("")}</table>
    <div class="cata"><h2>Notas de cata</h2><p>${esc(lote.cup)}</p></div>
    <div class="aviso">
      <b>Documento de referencia</b>
      Este lote corresponde a una temporada anterior y se publica como muestra del tipo de café que
      CTC lleva a Europa. <strong>No constituye una oferta comercial</strong>: no incluye precios,
      mínimos de compra ni disponibilidad. El catálogo vigente, con sus condiciones, se consulta
      dentro de Cherry Picked.${lote.scoreEstimated ? " El puntaje de esta ficha es estimado y no proviene de una catación oficial." : ""}
    </div>
    <div class="pie"><span>${esc(CTC_LEGAL_LINE)}</span><span>ctcexport.com</span></div>
  </div></body></html>`;
}

if (!existsSync(CHROME)) {
  console.error(`No encuentro Chrome en ${CHROME}. Defina CHROME_PATH y vuelva a correr.`);
  process.exit(1);
}

mkdirSync(SALIDA, { recursive: true });
mkdirSync(TEMPORAL, { recursive: true });

for (const lote of SNEAK_PEEK_MOCK) {
  const fuente = `${TEMPORAL}/${lote.code}.html`;
  writeFileSync(fuente, html(lote), "utf8");
  execFileSync(CHROME, [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${SALIDA}/${lote.code}.pdf`,
    url(fuente),
  ]);
  console.log(`${lote.code}.pdf  ${lote.name}`);
}

rmSync(TEMPORAL, { recursive: true, force: true });
console.log(`\n${SNEAK_PEEK_MOCK.length} fichas en public/docs/fichas-mock/`);
