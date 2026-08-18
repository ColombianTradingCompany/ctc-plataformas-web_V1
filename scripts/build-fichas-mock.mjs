// Construye la FICHA TÉCNICA (PDF de TRES páginas) de cada lote mock de la cinta.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/build-fichas-mock.mjs
//
// POR QUÉ EXISTE. El botón «Ver ficha técnica» del reverso de la tarjeta abre el
// archivo del lote. Los lotes de verdad traerán el suyo; los siete mock no tenían
// ninguno — las hojas de cálculo que Notion enlaza viven en un Drive que no es el
// de la plataforma y no son públicas. Así que se generan aquí, con los MISMOS
// datos que enseña la tarjeta y sin un solo dato comercial.
//
// LAS TRES PÁGINAS (owner, 2026-08-17)
//   1. Resumen del lote — lo que la tarjeta enseña, en grande.
//   2. Ficha de café verde — los atributos físicos y analíticos, compactos
//      arriba, y debajo el ANÁLISIS INTRÍNSECO: la telaraña de los diez
//      atributos del formulario SCA. ⚠️ Esos números son INVENTADOS por encargo
//      del owner (2026-08-17) para que la ficha de muestra esté completa; son
//      plausibles y suman el puntaje real del lote, pero no son de laboratorio.
//      Por eso las tres páginas van selladas. Ver `lib/analisis-intrinseco.mjs`.
//   3. Rueda de catación — la rueda SCA del lote, generada por
//      `build-ruedas-mock.mjs` a partir de la herramienta de la casa.
//
// «RED TAPED». Las tres páginas van selladas: una cinta roja en diagonal y una
// marca de agua que dice MUESTRA. No es decoración — es lo que impide que una
// ficha de un lote de la temporada pasada circule por ahí como si fuera una
// oferta viva. Mismo criterio que el rótulo «Temporada anterior» de la tarjeta.
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
// Cómo se retiran: borre `public/docs/fichas-mock/` junto con `sneakPeekMock.ts`
// (la receta completa está en la cabecera de ese archivo).

import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SNEAK_PEEK_MOCK } from "../src/lib/catalogo/sneakPeekMock.ts";
import { GRADO_POR_ID } from "../src/lib/grados/definicion.ts";
import { CTC_LEGAL_LINE } from "../src/lib/legal.ts";
import { ANALISIS, ATRIBUTOS, radarSVG } from "./lib/analisis-intrinseco.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = `${RAIZ}/public/docs/fichas-mock`;
const RUEDAS = `${RAIZ}/public/images/catalogo/sneak-peek`;
const TEMPORAL = `${RAIZ}/.fichas-tmp`;
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

/** Un URL de fichero válido en Windows y en POSIX. Construirlo a mano con
 *  reemplazos de separador es justo lo que produce ERR_FILE_NOT_FOUND. */
const url = (ruta) => pathToFileURL(ruta).href;

const esc = (s) =>
  String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ESTILO = (grado) => `
  @page{size:A4;margin:0}
  *{box-sizing:border-box}
  body{margin:0;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;color:#12101A;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .hoja{width:210mm;height:297mm;padding:16mm 18mm 12mm;display:flex;flex-direction:column;position:relative;overflow:hidden;page-break-after:always}
  .hoja:last-child{page-break-after:auto}

  /* ── El sello «red taped» ──────────────────────────────────────────────────
     Una cinta en diagonal arriba a la derecha y una marca de agua girada. Va en
     las TRES páginas: una ficha suelta no puede circular sin decir lo que es. */
  /* La geometría está calculada para que la cinta quepa ENTERA en la esquina:
     con 120 mm y un desplazamiento de -34 mm el texto se salía por el borde y se
     leía a medias («…A · NO ES OFERTA COMER»).
     OJO: nada de tildes invertidas en estos comentarios — todo este bloque es un
     template literal de JS y una sola cerraría la cadena. */
  .cinta{position:absolute;top:17mm;right:-15mm;width:102mm;transform:rotate(38deg);
         background:#C8102F;color:#fff;text-align:center;padding:3.5mm 0;
         font-size:8.5pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;
         box-shadow:0 1mm 3mm rgba(0,0,0,.18);z-index:5}
  .marca{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
         transform:rotate(-27deg);z-index:0;pointer-events:none}
  .marca span{font-size:58pt;font-weight:800;letter-spacing:.16em;color:rgba(200,16,47,.07);
              border:2mm solid rgba(200,16,47,.07);padding:6mm 12mm;border-radius:4mm;white-space:nowrap}
  .contenido{position:relative;z-index:1;display:flex;flex-direction:column;height:100%}

  .cab{display:flex;align-items:center;gap:7mm;border-bottom:2px solid #12101A;padding-bottom:7mm;padding-right:42mm}
  .cab img{height:14mm;width:auto;flex:none}
  .cab .tit{text-align:left}
  .cab .tit b{display:block;font-size:11pt;letter-spacing:.14em;text-transform:uppercase}
  .cab .tit span{display:block;font-size:8pt;color:#5A5568;letter-spacing:.06em;margin-top:1.5mm}
  .pie .pag{color:#8A8498}

  .nombre{font-size:24pt;font-weight:800;line-height:1.1;margin:9mm 0 0}
  .codigo{font-family:"Cascadia Mono",Consolas,monospace;font-size:9pt;color:#5A5568;letter-spacing:.1em;margin-top:2mm}
  .grado{display:flex;align-items:center;gap:6mm;margin:8mm 0 0}
  .sello{width:20mm;height:20mm;border-radius:50%;background:${grado.hex};display:flex;align-items:center;justify-content:center;overflow:hidden}
  .sello img{width:100%;height:100%;object-fit:cover}
  .gtxt b{display:block;font-size:14pt;font-weight:800;color:${grado.hex}}
  .gtxt span{display:block;font-size:8.5pt;color:#5A5568;margin-top:1mm}
  .puntaje{margin-left:auto;text-align:right}
  .puntaje b{display:block;font-size:28pt;font-weight:800;line-height:1}
  .puntaje span{display:block;font-size:8pt;letter-spacing:.14em;color:#5A5568;text-transform:uppercase}

  h2.sec{font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;color:#5A5568;margin:9mm 0 3mm}
  table{width:100%;border-collapse:collapse}
  td{padding:3mm 0;border-bottom:1px solid #E4E1EC;font-size:10pt;vertical-align:top}
  td.k{width:44mm;color:#5A5568;font-size:8.5pt;letter-spacing:.1em;text-transform:uppercase;padding-top:3.8mm}
  td.v em{font-style:normal;color:#9А94A8}
  .cata p{font-size:11.5pt;line-height:1.5;margin:0;max-width:150mm}

  /* La ficha de verde va COMPACTA arriba —dos columnas, sin bordes gruesos—
     para dejarle la mitad de la página a la telaraña. */
  .compacta{display:grid;grid-template-columns:1fr 1fr;gap:0 12mm}
  .compacta div{display:flex;justify-content:space-between;gap:4mm;padding:2.2mm 0;border-bottom:1px solid #ECE9F3}
  .compacta dt{color:#5A5568;font-size:8pt;letter-spacing:.08em;text-transform:uppercase;margin:0}
  .compacta dd{margin:0;font-size:9.5pt;font-weight:600;text-align:right}
  .radarCaja{display:flex;gap:8mm;align-items:center;margin-top:2mm}
  .radarCaja .leyenda{font-size:8.5pt;line-height:1.55;color:#3A3548;max-width:62mm}
  .radarCaja .leyenda b{display:block;font-size:9.5pt;margin-bottom:2mm}
  .radarCaja svg{flex:none}

  .aviso{margin-top:auto;background:#FDF3F5;border:1px solid #F3D3DA;border-left:4px solid #C8102F;padding:5mm 6mm;font-size:8.5pt;line-height:1.5;color:#3A3548}
  .aviso b{display:block;margin-bottom:1.5mm;letter-spacing:.1em;text-transform:uppercase;font-size:8pt;color:#C8102F}
  .pie{margin-top:5mm;border-top:1px solid #E4E1EC;padding-top:3.5mm;font-size:7.5pt;color:#5A5568;display:flex;justify-content:space-between}

  .rueda{flex:1;display:flex;align-items:center;justify-content:center;margin:6mm 0}
  .rueda svg{width:135mm;height:135mm}
  .notas{display:flex;flex-wrap:wrap;gap:2.5mm;margin-top:2mm}
  .notas span{border:1px solid #E4E1EC;border-radius:999px;padding:1.8mm 4mm;font-size:9pt;color:#3A3548}
`;

const SELLO_TEXTO = "Muestra · no es oferta";

function cabecera(sub) {
  return `<div class="cab">
      <img src="${url(`${RAIZ}/public/images/shared/ctc-logo-full.png`)}" alt="">
      <div class="tit"><b>Ficha técnica de café</b><span>${esc(sub)}</span></div>
    </div>`;
}

const sellos = `<div class="cinta">${esc(SELLO_TEXTO)}</div><div class="marca"><span>MUESTRA</span></div>`;

function avisoLegal(lote) {
  return `<div class="aviso">
      <b>Documento de referencia — no es una oferta</b>
      Este lote corresponde a una <strong>temporada anterior</strong> y se publica como muestra del tipo de
      café que CTC lleva a Europa. No incluye precios, mínimos de compra ni disponibilidad, y no constituye
      una oferta comercial. El catálogo vigente, con sus condiciones, se consulta dentro de Cherry Picked.
      ${lote.scoreEstimated ? "El puntaje de esta ficha es <strong>estimado</strong> y no proviene de una catación oficial." : ""}
    </div>`;
}

const pie = (n) =>
  `<div class="pie"><span>${esc(CTC_LEGAL_LINE)}</span><span>ctcexport.com · <span class="pag">${n} / 3</span></span></div>`;

function paginaResumen(lote, grado) {
  const origen = [lote.municipio, lote.departamento].filter(Boolean).join(", ");
  const filas = [
    ["Finca", lote.finca],
    ["Origen", origen],
    ["Altitud", lote.altitudeM != null ? `${lote.altitudeM} m s. n. m.` : "—"],
    ["Variedad", lote.variety],
    ["Proceso", lote.process],
    ["Temporada", lote.season.es],
  ];
  return `<div class="hoja">${sellos}<div class="contenido">
    ${cabecera("Café verde de origen · Colombia")}
    <h1 class="nombre">${esc(lote.name)}</h1>
    <div class="codigo">${esc(lote.code)}</div>
    <div class="grado">
      <div class="sello"><img src="${url(`${RAIZ}/public${grado.logo}`)}" alt=""></div>
      <div class="gtxt"><b>Grado ${esc(grado.nombre)}</b><span>${esc(grado.lema)} · SCA ${grado.scaMin}–${grado.scaMax}</span></div>
      <div class="puntaje"><b>${esc(lote.score)}</b><span>Puntaje SCA${lote.scoreEstimated ? " · estimado" : ""}</span></div>
    </div>
    <h2 class="sec">Identificación del lote</h2>
    <table>${filas.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join("")}</table>
    <div class="cata"><h2 class="sec">Notas de cata</h2><p>${esc(lote.cup)}</p></div>
    ${avisoLegal(lote)}${pie(1)}
  </div></div>`;
}

function paginaVerde(lote) {
  const a = ANALISIS[lote.id] || {};
  const filas = [
    ["Variedad", lote.variety],
    ["Proceso", lote.process],
    ["Finca", lote.finca],
    ["Municipio", [lote.municipio, lote.departamento].filter(Boolean).join(", ")],
    ["Altitud", lote.altitudeM != null ? lote.altitudeM + " m s. n. m." : "—"],
    ["Clase de lote", a.tipo],
    ["Cosecha", lote.harvestQuarter || lote.season.es],
    ["Humedad", a.humedad],
    ["Actividad de agua", a.aw],
    ["Densidad", a.densidad ? a.densidad + " g/L" : "—"],
    ["Factor de rendimiento", a.factor],
    ["Granulometría (malla)", a.malla],
    ["Defectos", a.defectos],
    ["Puntaje SCA", lote.score],
  ];
  const total = ATRIBUTOS.reduce((s, at) => s + (a.sca ? a.sca[at.clave] : 0), 0);
  return `<div class="hoja">${sellos}<div class="contenido">
    ${cabecera("Ficha de café verde")}
    <h1 class="nombre" style="font-size:17pt;margin-top:7mm">${esc(lote.name)}</h1>
    <div class="codigo">${esc(lote.code)}</div>
    <h2 class="sec" style="margin-top:6mm">Atributos físicos y analíticos</h2>
    <dl class="compacta">${filas
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
      .join("")}</dl>
    <h2 class="sec">Análisis intrínseco · formulario SCA</h2>
    <div class="radarCaja">
      ${a.sca ? radarSVG(a.sca, { size: 330 }) : ""}
      <div class="leyenda">
        <b>${total.toFixed(2)} puntos</b>
        Los diez atributos del formulario SCA, cada uno de 6 a 10. Uniformidad, taza limpia y dulzor
        puntúan 10 en una taza sin defectos; el carácter del lote se lee en el resto — dónde se abre la
        figura es dónde destaca este café.
        <br><br>
        <strong>Valores de muestra.</strong> Este documento es una MUESTRA: los datos analíticos y el
        reparto de atributos son representativos, no lecturas de laboratorio de un lote real. El puntaje
        total, la variedad, el proceso, la finca y las notas de cata sí son los del lote.
      </div>
    </div>
    ${avisoLegal(lote)}${pie(2)}
  </div></div>`;
}

function paginaRueda(lote) {
  const ruta = `${RUEDAS}/rueda-${lote.id}.svg`;
  const svg = existsSync(ruta) ? readFileSync(ruta, "utf8") : "";
  const notas = String(lote.cup || "")
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return `<div class="hoja">${sellos}<div class="contenido">
    ${cabecera("Rueda de catación")}
    <h1 class="nombre" style="font-size:19pt">${esc(lote.name)}</h1>
    <div class="codigo">${esc(lote.code)} · ${esc(lote.score)} SCA</div>
    <div class="rueda">${svg || '<p style="color:#5A5568">Sin rueda para este lote.</p>'}</div>
    <h2 class="sec" style="margin-top:0">Descriptores registrados</h2>
    <div class="notas">${notas.map((n) => `<span>${esc(n)}</span>`).join("")}</div>
    <p style="font-size:8.5pt;color:#5A5568;margin:4mm 0 0;line-height:1.5">
      Los sectores encendidos son los descriptores de este lote sobre la rueda de sabores de la SCA; el resto
      de la rueda queda atenuado. Dibujada con la misma herramienta de catación de la casa
      (<code>rueda-catacion</code>), para que la ficha y la mesa de cata hablen el mismo idioma.
    </p>
    ${avisoLegal(lote)}${pie(3)}
  </div></div>`;
}

function html(lote) {
  const grado = GRADO_POR_ID[lote.grade];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${ESTILO(grado)}</style></head><body>
    ${paginaResumen(lote, grado)}
    ${paginaVerde(lote)}
    ${paginaRueda(lote)}
  </body></html>`;
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
console.log(`\n${SNEAK_PEEK_MOCK.length} fichas de 3 páginas en public/docs/fichas-mock/`);
