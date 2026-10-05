// Guardián de CTCx Coffee Datasheet Tool (V5.132, `herramientas-cafe` · `coffee-datasheet`).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-coffee-datasheet-check.mjs
//
// GRATIS y sin red: lee el HTML de la herramienta, ejecuta en Node su NÚCLEO puro y lo compara con el código real de
// la plataforma. No levanta navegador (el recorrido con navegador es `qa-tools-puente-conformance`).
//
// QUÉ VIGILA, y por qué cada cosa:
//
//   1. LOS CATÁLOGOS NO SE ESCRIBEN A MANO. La rueda, los municipios, las variedades y las partidas arancelarias que
//      la herramienta trae embebidos salen de sus fuentes únicas (`build-coffee-datasheet.mjs`). Si la Rueda del Café o
//      la Ficha de Kaffetal Regal cambian y nadie regenera, hay tres ruedas en vez de una — y nada más fallaría.
//   2. UNA FÓRMULA, NO DOS. El puntaje SCA 2004 y el CVA que calcula la herramienta tienen que ser los de la planilla
//      del Centro de Calidad (`src/lib/arena/labEvaluation.ts`, corregida por el Q-Grader en la V5.92): mismos dominios,
//      misma regla de «incompleta no da puntaje», mismas tazas. Se comparan sobre cientos de planillas generadas.
//   3. LOS DOS MÉTODOS NO SE MEZCLAN. Es el encargo del owner (2026-10-01): «es FUNDAMENTAL hacer esta distinción y
//      lograr que el usuario identifique fácilmente cuál está haciendo». La cinta, la ficha y el archivo exportado dicen
//      el método; los campos de taza de uno no alimentan el puntaje del otro.
//   4. TRES IDIOMAS COMPLETOS (ALINEACION §1): toda clave de texto y todo botón «i» tiene ES · EN · DE, y no hay una
//      clave usada que no exista (saldría el nombre de la clave en pantalla).
//   5. AUTOCONTENIDA Y CON MEMORIA: nada de CDN (una finca sin señal la abre igual) y el puente con esquema propio.
//   6. LA MISMA HERRAMIENTA QUE LA PLANILLA, MÁS B1 (V5.137, owner 2026-10-01: «este tiene que ser la misma herramienta,
//      agregándole B1»). Los campos de B2 y B3 de la planilla del Centro de Calidad (`LabEvalEditor`) y los de esta
//      herramienta son los mismos: los tres atributos por taza como un número, taint y fault taza a taza con su tipo, el
//      CVA en cuartos de punto, etapa e intensidad por nota de la rueda, el tipo de acidez, las texturas, los defectos
//      físicos y el color. Si una de las dos cambia sola, hay dos planillas — y eso es lo que el owner pidió que no pase.

import { readFileSync } from "node:fs";
import { HERRAMIENTA, aplicar, leerRueda } from "./build-coffee-datasheet.mjs";
import { leerDatosDeLaHerramienta } from "./build-rueda-datos.mjs";
import { RUEDA as RUEDA_PLATAFORMA, ETAPAS_DE_LA_RUEDA, INTENSIDAD, MARCA_POR_DEFECTO, NOTA_MAX, ajustaIntensidad, alternaEtapa, normalizaEtapas } from "../src/lib/catacion/rueda.ts";
import { CVA as CVA_PLATAFORMA, SCA2004, SCA2004_POR_TAZAS, CVA_DEFECTOS, computeCva, computeSca2004, computeFactor, contarScaTazas, normalizaScaTazas } from "../src/lib/arena/labEvaluation.ts";
import { DEFECTOS_FISICOS, COLORES_DEL_VERDE, TEXTURAS_EN_BOCA, MAX_TEXTURAS, TIPOS_DE_ACIDEZ } from "../src/lib/catacion/fisico.ts";
import { CARPETAS_HERRAMIENTAS } from "../src/lib/tools/carpetas.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const html = lee(HERRAMIENTA).replace(/\r\n/g, "\n");
const js = html.slice(html.indexOf("<script>") + 8, html.indexOf("</script>"));

// ── 1. Los catálogos generados ────────────────────────────────────────────────────────────────────────────────────────
check("catálogos: el bloque generado coincide con sus fuentes (regenere con build-coffee-datasheet.mjs)", aplicar(html) === html);

const corte = (desde, hasta) => {
  const i = js.indexOf(desde), j = js.indexOf(hasta, i);
  if (i < 0 || j < 0) throw new Error(`no se encontró el tramo ${desde} … ${hasta}`);
  return js.slice(i, j + hasta.length);
};
const M = new Function(
  `${corte("/*<CATALOGOS-GENERADOS>*/", "/*</NUCLEO-PURO>*/")}\n${corte("const RUEDA_A_CATA = {", "const UI = {").replace(/const UI = \{$/, "")}
   return { RUEDA, DEP_MUNI, VARIEDADES, HS_CODES, TX, INFO, IDIOMAS, CATA, CATA_TX, RUEDA_A_CATA, HOJA_A_CATA, DEFECTOS, MALLAS_CVA, MALLAS_CO, TOPE, CVA_SEC, CVA_K, SCA_ATR, SCA_TAZ, SCA_K,
            calcCva, calcSca2004, calcDefectos, clasificaVerde, calcMallas, calcFactor, factorQueVale, cataCuenta, contarTazas, claseSca };`,
)();

const idsDe = (rueda, subs, hojas) => rueda.flatMap((f) => [f.id, ...f[subs].flatMap((s) => [s.id, ...s[hojas].map((h) => `${s.id}|${h.id}`)])]);
const idsHerramienta = idsDe(M.RUEDA, "s", "h");
check("rueda: 9 familias", M.RUEDA.length === 9);
check("rueda: mismos ids que la Rueda del Café publicada", JSON.stringify(idsHerramienta) === JSON.stringify(idsDe(leerDatosDeLaHerramienta(), "subs", "hojas")));
check("rueda: mismos ids que la planilla del Centro de Calidad (rueda.ts)", JSON.stringify(idsHerramienta) === JSON.stringify(idsDe(RUEDA_PLATAFORMA, "subs", "hojas")));
check("rueda: el script y el archivo dicen lo mismo", JSON.stringify(M.RUEDA) === JSON.stringify(leerRueda()));
for (const f of M.RUEDA) {
  check(`rueda · ${f.id}: nombre y descripción en tres idiomas`, f.n.length === 3 && f.d.length === 3 && [...f.n, ...f.d].every((x) => typeof x === "string" && x.trim()));
  for (const s of f.s) for (const h of s.h) check(`rueda · ${s.id}|${h.id}: tres idiomas`, h.n.length === 3 && h.n.every((x) => x && x.trim()));
}
check("catálogos: departamentos y variedades presentes", Object.keys(M.DEP_MUNI).length >= 20 && M.VARIEDADES.length >= 50 && M.HS_CODES.length >= 1);

// ── 2. La rueda cae en las casillas CATA del formato descriptivo (SCA 103) ────────────────────────────────────────────
const cajas = new Set(M.CATA.map((c) => c[0]));
check("CATA: 24 casillas (9 categorías + 15 subcategorías del formato)", M.CATA.length === 24 && M.CATA.filter((c) => c[1] === null).length === 9);
check("CATA: toda hija nombra una madre que existe", M.CATA.every((c) => c[1] === null || cajas.has(c[1])));
for (const c of M.CATA) check(`CATA · ${c[0]}: rótulo en tres idiomas`, Array.isArray(M.CATA_TX[c[0]]) && M.CATA_TX[c[0]].length === 3 && M.CATA_TX[c[0]].every((x) => x && x.trim()));
for (const f of M.RUEDA) {
  check(`rueda → CATA: la familia ${f.id} tiene casilla`, cajas.has(M.RUEDA_A_CATA[f.id]));
  for (const s of f.s) check(`rueda → CATA: la subcategoría ${s.id} tiene casilla`, cajas.has(M.RUEDA_A_CATA[s.id]));
}
for (const [hoja, caja] of Object.entries(M.HOJA_A_CATA)) check(`rueda → CATA: la excepción ${hoja} existe en la rueda y en el formato`, idsHerramienta.includes(hoja) && cajas.has(caja));
check("CATA: topes del formato (5 casillas · 2 gustos · 2 texturas)", M.TOPE.cata === 5 && M.TOPE.gustos === 2 && M.TOPE.textura === 2);
check("CATA: la madre con una hija marcada no cuenta dos veces", M.cataCuenta(["fruity", "berry"]) === 1 && M.cataCuenta(["fruity"]) === 1 && M.cataCuenta(["berry", "citrus", "floral"]) === 3);

// ── 3. Una fórmula, no dos: el núcleo contra la planilla de la plataforma ─────────────────────────────────────────────
check("CVA: mismas constantes que la planilla", M.CVA_K.coef === CVA_PLATAFORMA.coeficiente && M.CVA_K.base === CVA_PLATAFORMA.base && M.CVA_K.nu === CVA_PLATAFORMA.castigoNoUniforme && M.CVA_K.def === CVA_PLATAFORMA.castigoDefectuosa && M.CVA_K.tazas === CVA_PLATAFORMA.tazas);
check("SCA 2004: mismas constantes que la planilla", M.SCA_K.min === SCA2004.min && M.SCA_K.max === SCA2004.max && M.SCA_K.paso === SCA2004.paso && M.SCA_K.taint === SCA2004.castigoTaint && M.SCA_K.fault === SCA2004.castigoFault);
check("CVA: ocho 9 = 100 · ocho 5 = 79 · ocho 1 = 58 (SCA 104 · 7.1)", [[9, 100], [5, 79], [1, 58]].every(([v, s]) => M.calcCva(Object.fromEntries(M.CVA_SEC.map((k) => [`cva_${k}`, String(v)]))).total === s));

let semilla = 20261001;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const elige = (a) => a[Math.floor(azar() * a.length)];
let difCva = 0, difSca = 0, conPuntajeCva = 0, conPuntajeSca = 0;
for (let n = 0; n < 600; n++) {
  // CVA: enteros 1–9, a veces vacío, a veces fuera de dominio; tazas con y sin tipo.
  const ev = {};
  for (const k of M.CVA_SEC) ev[`cva_${k}`] = azar() < 0.06 ? "" : azar() < 0.04 ? elige(["0", "10", "7.5", "x"]) : String(1 + Math.floor(azar() * 9));
  ev.cva_tazas = [0, 1, 2, 3, 4].map(() => {
    const def = azar() < 0.12;
    return { noUniforme: azar() < 0.15, defectuosa: def, defecto: def && azar() < 0.85 ? elige(["moho", "fenol", "papa"]) : "" };
  });
  if (n % 97 === 0) ev.cva_tazas = ev.cva_tazas.map(() => ({ noUniforme: true, defectuosa: true, defecto: "papa" })); // las cinco iguales
  // V5.153: el número de tazas usadas en el CVA (1–5; a veces sin dato o inválido) — las dos cuentan u y d sobre las usadas.
  ev.cva_num_tazas = azar() < 0.3 ? "" : azar() < 0.1 ? elige(["0", "6", "x"]) : String(1 + Math.floor(azar() * 5));
  const a = M.calcCva(ev), b = computeCva(ev);
  if (a.total !== b.total || a.completa !== b.completa || a.u !== b.u || a.d !== b.d || a.suma !== b.suma) difCva++;
  if (a.total != null) conPuntajeCva++;

  // SCA 2004: 6,00–10,00 al 0,25; tres por tazas; defectos por taza.
  const sc = {};
  for (const k of M.SCA_ATR) {
    if (azar() < 0.05) sc[`sca_${k}`] = "";
    else if (M.SCA_TAZ.includes(k)) sc[`sca_${k}`] = azar() < 0.05 ? "7" : String(2 * Math.floor(azar() * 6));
    else sc[`sca_${k}`] = azar() < 0.05 ? elige(["5.75", "10.25", "7.3", "abc"]) : (6 + 0.25 * Math.floor(azar() * 17)).toFixed(2);
  }
  sc.sca_taint_cups = azar() < 0.7 ? "" : elige(["1", "2", "6", "1.5"]);
  sc.sca_fault_cups = azar() < 0.8 ? "" : elige(["1", "3", "9"]);
  const c = M.calcSca2004(sc), d = computeSca2004(sc);
  if (c.total !== d.total || c.completa !== d.completa || c.defectos !== d.defectos || c.calificados !== d.calificados) difSca++;
  if (c.total != null) conPuntajeSca++;
}
check("CVA: 600 planillas dan lo mismo aquí y en la planilla del Centro de Calidad", difCva === 0, `${difCva} distintas`);
check("SCA 2004: 600 planillas dan lo mismo aquí y en la planilla del Centro de Calidad", difSca === 0, `${difSca} distintas`);
check("la batería ejercita los dos lados (con puntaje y sin él)", conPuntajeCva > 100 && conPuntajeCva < 600 && conPuntajeSca > 100 && conPuntajeSca < 600, `cva ${conPuntajeCva} · sca ${conPuntajeSca}`);
check("CVA: una taza defectuosa sin tipo deja la planilla sin puntaje", M.calcCva({ ...Object.fromEntries(M.CVA_SEC.map((k) => [`cva_${k}`, "7"])), cva_tazas: [{ defectuosa: true, noUniforme: true, defecto: "" }] }).total === null);
check("SCA 2004: nueve de diez atributos no dan puntaje", M.calcSca2004({ ...Object.fromEntries(M.SCA_ATR.map((k) => [`sca_${k}`, M.SCA_TAZ.includes(k) ? "10" : "8"])), sca_balance: "" }).total === null);
check("SCA 2004: clasificación del total (90 · 85 · 80)", M.claseSca(90) === "cls90" && M.claseSca(89.75) === "cls85" && M.claseSca(84.75) === "cls80" && M.claseSca(79.75) === "cls0");
const fa = { fa_start: "250", fa_green_remainder: "201", fa_primary_defect: "2", fa_secondary_defect: "6" };
check("factor de rendimiento: la aritmética de la Ficha de Kaffetal Regal", M.calcFactor(fa).factor === computeFactor(fa).yieldFactor && M.calcFactor(fa).sano === computeFactor(fa).healthy);

// ── 4. Lo físico: equivalencias del formato y la referencia de café verde ─────────────────────────────────────────────
const eq = Object.fromEntries(M.DEFECTOS.map((d) => [d[0], d[2]]));
check("defectos: 6 de categoría 1 y 10 de categoría 2 (formato físico CVA)", M.DEFECTOS.filter((d) => d[1] === 1).length === 6 && M.DEFECTOS.filter((d) => d[1] === 2).length === 10);
check("defectos: equivalencias del formato (1:1 · 3:1 · 5:1 · 10:1)", eq.negro === 1 && eq.agrio === 1 && eq.cereza === 1 && eq.hongos === 1 && eq.extrana === 1 && eq.insecto_grave === 5 && eq.negro_parcial === 3 && eq.agrio_parcial === 3 && eq.partido === 5 && eq.insecto_leve === 10);
const df = M.calcDefectos({ partido: "7", inmaduro: "5", negro: "1", insecto_leve: "9" });
check("defectos: solo cuentan los completos (7 partidos = 1; 9 de insecto leve = 0)", df.filas.partido.completos === 1 && df.filas.insecto_leve.completos === 0 && df.cat1 === 1 && df.cat2 === 2 && df.total === 3);
check("café verde: un primario impide el grado especialidad", M.clasificaVerde(df, "0") === "prem" && M.clasificaVerde(M.calcDefectos({ partido: "25" }), "") === "spec" && M.clasificaVerde(M.calcDefectos({ partido: "30" }), "") === "prem");
check("café verde: quakers bajan de especialidad", M.clasificaVerde(M.calcDefectos({ partido: "5" }), "1") === "prem" && M.clasificaVerde(M.calcDefectos({ partido: "5" }), "4") === "exch");
check("café verde: sin datos no hay veredicto", M.clasificaVerde(M.calcDefectos({}), "") === "");
check("mallas: 14 del formato CVA (10 a 23) y 6 agrupaciones de Colombia", M.MALLAS_CVA.length === 14 && Math.min(...M.MALLAS_CVA) === 10 && Math.max(...M.MALLAS_CVA) === 23 && M.MALLAS_CO.length === 6);
check("mallas: cuadra · falta · excede · sin base", M.calcMallas(["180", "110", "45"], "350").estado === "ok" && M.calcMallas(["100"], "350").estado === "falta" && M.calcMallas(["300", "100"], "350").estado === "excede" && M.calcMallas(["100"], "").estado === "sin_base");

// ── 5. Tres idiomas completos, y ninguna clave fantasma ───────────────────────────────────────────────────────────────
check("idiomas: ES · EN · DE", JSON.stringify(M.IDIOMAS) === JSON.stringify(["es", "en", "de"]));
for (const [k, v] of Object.entries(M.TX)) check(`texto · ${k}: tres idiomas`, Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "string" && x.trim()));
for (const [k, v] of Object.entries(M.INFO)) {
  check(`«i» · ${k}: cita su estándar`, typeof v.std === "string" && v.std.trim().length > 3);
  for (const lang of M.IDIOMAS) check(`«i» · ${k} · ${lang}: título y cuerpo`, Array.isArray(v[lang]) && v[lang].length === 2 && v[lang][0].trim() && v[lang][1].includes("<p>"));
}
// Solo las claves LITERALES — `t("clave")` o `t("clave", …)` —; las que se arman con un prefijo (`t("a_"+k)`) van en `dinamicas`.
const usadas = new Set([...js.matchAll(/\bt\("([A-Za-z0-9_]+)"\s*[,)]/g)].map((m) => m[1]));
const dinamicas = [
  ...M.SCA_ATR.flatMap((k) => [`a_${k}`, `r_${k}`]), ...M.CVA_SEC.flatMap((k) => [`s_${k}`, `r_${k}`]), ...M.DEFECTOS.map((d) => `df_${d[0]}`),
  ...M.MALLAS_CO.map((k) => `m_${k.replace("mesh_", "")}`), ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `col${n}`), ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `e${n}`),
  "q6", "q7", "q8", "q9", "cls90", "cls85", "cls80", "cls0", "cls_spec", "cls_prem", "cls_exch", "cls_below", "cls_off", "cat1", "cat2",
  ...["salty", "sour", "sweet", "bitter", "umami"].map((g) => `g_${g}`), ...["rough", "oily", "smooth", "drying", "metallic"].map((b) => `b_${b}`),
  "d_moho", "d_fenol", "d_papa", "d_otro", "et_fragancia", "et_aroma", "et_sabor", "et_residual", "ac_seca", "ac_dulce", ...["4c", "fair", "org", "ra", "food", "eudr", "bird", "cafe", "aaa", "gi"].map((c) => `ce_${c}`),
  "tu1", "tu2", "tu3", "tu4", "tu5", "alta", "media", "baja", "pesado", "medio", "ligero",
  ...["sca", "cva"].flatMap((m) => [`${m}Nom`, `${m}Sub`, `${m}Tag`, `${m}Btn`, ...[1, 2, 3, 4, 5].map((n) => `${m}L${n}`)]),
];
for (const k of [...usadas, ...dinamicas]) check(`texto · «${k}» se usa y existe`, k in M.TX);
const infos = new Set([...js.matchAll(/\bib\("([a-z_0-9]+)"\)/g), ...js.matchAll(/info:"([a-z_0-9]+)"/g), ...js.matchAll(/data-v=\\"([a-z_0-9]+)\\">"\+t\("eligeDif"\)/g)].map((m) => m[1]));
for (const k of [...infos, ...["fragrance", "flavor", "aftertaste", "acidity", "body", "balance", "cuppers", "uniformity", "clean_cup", "sweetness"].map((x) => `sca_${x}`), ...M.CVA_SEC.map((x) => `sec_${x}`), "dif", "prep", "partes", "lotes", "sesion", "sca_taint", "sca_fault", "cva_acidez"])
  check(`«i» · «${k}» se usa y existe`, k in M.INFO);
check("hay botones «i» suficientes para asistir la evaluación", Object.keys(M.INFO).length >= 40, String(Object.keys(M.INFO).length));

// ── 6. Los dos métodos, siempre a la vista y nunca mezclados ──────────────────────────────────────────────────────────
check("método: la pantalla entera obedece a body[data-m]", html.includes('body[data-m="sca"]') && html.includes('body[data-m="cva"]') && js.includes('document.body.setAttribute("data-m"'));
check("método: sin método elegido no hay formulario (primero se elige)", js.includes("if(!S.metodo || UI.elegir){ app.innerHTML = vistaElegir(); return; }"));
check("método: la cinta fija dice cuál", js.includes('class=\\"sello\\"') && /\.cinta\{position:sticky/.test(html));
check("método: la ficha impresa y el HTML exportado lo llevan", js.includes('class=\\"f-met\\"') && js.includes('t(sca?"fiMetSca":"fiMetCva")') && js.includes('data-m=\\""+S.metodo'));
check("método: el archivo exportado lo lleva en el nombre", js.includes('(S.metodo==="sca"?"SCA2004":"CVA")'));
check("método: los dos avisos de «no son intercambiables»", M.TX.eligeAviso.every((x) => x.includes("84")) && M.INFO.dif.es[1].includes("no son comparables"));
check("método: el puntaje SCA sale solo de campos sca_* y el CVA solo de cva_*", !/cva_/.test(corte("function calcSca2004", "function claseSca")) && !/sca_/.test(corte("function calcCva", "/** SCA 2004")));
check("CVA: descriptiva y afectiva en columnas separadas, con su estándar", js.includes('class=\\"col-d\\"') && js.includes('class=\\"col-a\\"') && js.includes("SCA 103") && js.includes("SCA 104"));
check("CVA: la intensidad no entra en la fórmula", !/cva_int/.test(corte("function calcCva", "/** SCA 2004")));
check("SCA 2004: la parte extrínseca avisa que no es del protocolo", M.TX.extScaNota[0].includes("no tiene parte extrínseca"));
check("las cuatro partes se pueden apagar, y siempre queda una", js.includes('t("unaParte")') && ["pBasico", "pSabor", "pFisico", "pExtr"].every((k) => k in M.TX));
check("varios lotes, con tope", /MAX_LOTES = \d+/.test(js) && js.includes('case "masLote": case "dupLote"'));

// ── 7. Autocontenida, con memoria y en las listas ─────────────────────────────────────────────────────────────────────
check("sin CDN: ningún recurso de otro origen", !/<link\b/i.test(html) && !/(?:src|href)=\\?["']https?:/i.test(html) && !/@import|url\(\s*["']?https?:/i.test(html));
check("un solo <script src>: el puente", (html.match(/<script[^>]+src=/g) ?? []).length === 1 && html.includes('<script src="/tools/ctc-bridge.js"></script>'));
check("memoria con esquema propio (CTC.usarEstado + resumen)", js.includes("window.CTC.usarEstado(") && js.includes("window.CTC.usarResumen(resumen)") && js.includes("window.CTC.tocado()"));
check("fuera de la concha el borrador no cruza trabajos", js.includes("if(ENCONCHA) return;") && js.includes("if(!ENCONCHA){ try{ const b = localStorage.getItem(LS)"));
check("lo que se carga de un archivo se normaliza antes de pintarse", js.includes("S = normalizar(o.estado)") && js.includes("o.app!==APP"));
check("lo que escribe el usuario se escapa al pintar", js.includes('function esc(s)') && !/innerHTML\s*=\s*[^;]*\.value\b/.test(js));
check("carpetas.ts conoce la herramienta", CARPETAS_HERRAMIENTAS.some((c) => c.id === "coffee-datasheet" && c.archivos[0] === "ctcx-coffee-datasheet-tool.html"));
check("build-tool-shots la captura", lee("scripts/build-tool-shots.mjs").includes('"coffee-datasheet"'));
check("la conformidad del puente la sondea", lee("scripts/qa-tools-puente-conformance.mjs").includes('"coffee-datasheet": {'));
check("los enlaces a otras herramientas van a su carpeta", ["/tools/defectos-cafe/defectos-cafe.html", "/tools/mapa-variedades/mapa-variedades.html", "/tools/agtron/agtron-dial.html"].every((u) => html.includes(u)));

// ── 8. La MISMA herramienta que la planilla del Centro de Calidad, más B1 (V5.137) ────────────────────────────────────
// El estado de la herramienta (qué campos tiene un lote y cómo se normaliza un archivo) se ejecuta aquí, sin navegador.
const tramo = (desde, hasta) => { const x = corte(desde, hasta); return x.slice(0, x.length - hasta.length); };
const E = new Function(
  "IDX",
  `${corte("/*<CATALOGOS-GENERADOS>*/", "/*</NUCLEO-PURO>*/")}
   const APP = "ctcx-coffee-datasheet", VER = 1, MAX_LOTES = 12; let S = null;
   ${tramo("const GUSTOS = [", "const PAISES = [")}
   ${tramo("const RUEDA_A_CATA = {", "const UI = {")}
   ${tramo("function hoy(){", "let tBorrador = null;")}
   return { DEF_CVA, ETAPAS, ACIDECES, TEXTURAS, NOTA_MAX, loteVacio, estadoVacio, normLote, normalizar, evSca, normDetalle, etapasDe, alternaEtapa };`,
)(Object.fromEntries(idsHerramienta.map((id) => [id, true])));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const vacio = E.loteVacio(0);

// B2 · SCA 2004 — los tres atributos por taza son un número, como los demás; taint y fault, taza a taza.
check("planilla · SCA: Uniformidad, Taza limpia y Dulzor son un número (no cinco casillas)", SCA2004_POR_TAZAS.every((k) => vacio[`sca_${k}`] === "") && !("sca_cups" in vacio) && !js.includes('data-a=\\"copa\\"'));
check("planilla · SCA: los tres por taza van de 0 a 10 al 0,25; los demás de 6 a 10", js.includes("min = SCA_TAZ.indexOf(k)>=0 ? 0 : SCA_K.min") && js.includes('max=\\"10\\" step=\\"0.25\\" data-k=\\"sca_"') && igual(M.SCA_TAZ, SCA2004_POR_TAZAS));
check("planilla · SCA: cinco tazas con su estado (limpia · taint · fault) y su tipo", vacio.sca_tazas.length === SCA2004.tazas && vacio.sca_tazas.every((x) => x.estado === "" && x.defecto === "") && js.includes('data-a=\\"scaTz\\"') && js.includes('data-k=\\"sca_tazas."'));
check("planilla · SCA: el tipo de defecto es el mismo selector de la taza defectuosa del CVA", igual(E.DEF_CVA, CVA_DEFECTOS.map((d) => d[0])));
check("planilla · SCA: taint y fault se explican con su «i»", js.includes('ib("sca_taint")') && js.includes('ib("sca_fault")') && M.INFO.sca_taint.es[1].includes("2 puntos") && M.INFO.sca_fault.es[1].includes("4 puntos"));
{
  const conTazas = E.normLote({ sca_tazas: [{ estado: "taint", defecto: "moho" }, { estado: "fault", defecto: "inventado" }, { estado: "raro" }, {}, {}] }, 0);
  const cuenta = contarScaTazas(normalizaScaTazas(conTazas.sca_tazas));
  check("planilla · SCA: los contadores salen de las tazas, como en la planilla", conTazas.sca_taint_cups === String(cuenta.taint) && conTazas.sca_fault_cups === String(cuenta.fault) && cuenta.taint === 1 && cuenta.fault === 1);
  check("planilla · SCA: un tipo de defecto desconocido no se guarda", conTazas.sca_tazas[0].defecto === "moho" && conTazas.sca_tazas[1].defecto === "" && conTazas.sca_tazas[2].estado === "");
  // Un archivo guardado ANTES de la V5.137 (cinco casillas por atributo y dos contadores) se abre sin perder nada.
  const viejo = E.normLote({ sca_cups: { uniformity: [1, 1, 0, 1, 1], clean_cup: [1, 1, 1, 1, 1], sweetness: [0, 0, 1, 1, 1] }, sca_taint_cups: "1", sca_fault_cups: "2" }, 0);
  const cv = contarScaTazas(normalizaScaTazas(undefined, "1", "2"));
  check("planilla · SCA: un archivo anterior convierte sus casillas a puntos (2 por taza)", viejo.sca_uniformity === "8" && viejo.sca_clean_cup === "10" && viejo.sca_sweetness === "6");
  check("planilla · SCA: un archivo anterior reparte sus contadores en tazas", viejo.sca_tazas.filter((x) => x.estado === "taint").length === cv.taint && viejo.sca_tazas.filter((x) => x.estado === "fault").length === cv.fault && cv.taint === 1 && cv.fault === 2);
  const lleno = E.normLote({ ...Object.fromEntries(M.SCA_ATR.map((k) => [`sca_${k}`, "8.25"])), sca_uniformity: "9.75", sca_tazas: [{ estado: "taint", defecto: "papa" }] }, 0);
  const a = M.calcSca2004(E.evSca(lleno)), b = computeSca2004(E.evSca(lleno));
  check("planilla · SCA: el puntaje con cuartos por taza y un taint es el de la planilla", a.total != null && a.total === b.total && Math.abs(a.total - (8.25 * 9 + 9.75 - 2)) < 1e-9, `${a.total} vs ${b.total}`);
}

// B2 · CVA — cuartos de punto en la afectiva y el tipo de acidez del formato descriptivo.
check("planilla · CVA: la afectiva admite cuartos de punto (casilla fina 1–9 al 0,25)", M.CVA_K.paso === CVA_PLATAFORMA.pasoSeccion && CVA_PLATAFORMA.pasoSeccion === 0.25 && js.includes('class=\\"fino\\" type=\\"number\\" min=\\"1\\" max=\\"9\\" step=\\"0.25\\"'));
check("planilla · CVA: los nueve botones siguen (el sondeo del puente los usa)", js.includes('data-a=\\"aff\\" data-v=\\""+k+"\\" data-i=\\""+n+"\\" aria-pressed='));
check("planilla · CVA: la palabra de la escala solo acompaña a los enteros", js.includes("Number.isInteger(n) && n>=1 && n<=9 ? n+\" · \"+esc(t(\"e\"+n)) : nf(n)"));
check("planilla · CVA: tipo de acidez — las dos de la planilla, se elige una", igual(E.ACIDECES, TIPOS_DE_ACIDEZ.map((o) => o.key)) && E.normLote({ cva_acidez: ["seca", "dulce", "x"] }, 0).cva_acidez.length === 1 && js.includes('topes("acTipos","cva_acidez","cva_acidez",ACIDECES,"ac_",1)'));
check("planilla · CVA: los textos del tipo de acidez son los de la planilla", TIPOS_DE_ACIDEZ.every((o) => M.TX[`ac_${o.key}`][0] === o.es && M.TX[`ac_${o.key}`][1] === o.en));
check("planilla · CVA: las texturas en boca y su tope son los de la planilla", igual(E.TEXTURAS, TEXTURAS_EN_BOCA.map((o) => o.key)) && M.TOPE.textura === MAX_TEXTURAS);

// La rueda — cada nota marcada lleva su etapa y su intensidad.
check("planilla · rueda: las cuatro etapas", igual(E.ETAPAS, ETAPAS_DE_LA_RUEDA) && E.ETAPAS.every((e) => `et_${e}` in M.TX));
check("planilla · rueda: en CVA la etapa sale de dónde se marcó (nariz: fragancia · aroma; boca: sabor · residual)", igual(E.etapasDe("nariz"), ["fragancia", "aroma"]) && igual(E.etapasDe("boca"), ["sabor", "residual"]) && igual(E.etapasDe(""), ETAPAS_DE_LA_RUEDA));
check("planilla · rueda: la marca nace como en la planilla (sabor · 10)", igual(E.normDetalle(null, ""), { etapas: [...MARCA_POR_DEFECTO.etapas], intensidad: String(MARCA_POR_DEFECTO.intensidad), nota: MARCA_POR_DEFECTO.nota }));
check("planilla · rueda: la intensidad va de 0 a 15 al 0,5", INTENSIDAD.min === 0 && INTENSIDAD.max === 15 && INTENSIDAD.paso === 0.5 && js.includes('type=\\"range\\" min=\\"0\\" max=\\"15\\" step=\\"0.5\\" data-k=\\"rueda_detalle."'));
for (const v of [-3, 0, 0.2, 7.3, 7.75, 12.5, 15, 99, "8,5"]) check(`planilla · rueda: la intensidad ${v} se ajusta igual`, Number(E.normDetalle({ intensidad: v }, "").intensidad) === ajustaIntensidad(v));
{
  const id = idsHerramienta[3], otro = idsHerramienta[7];
  const l = E.normLote({ sca_rueda: [id], cva_desc_boca: [otro], rueda_detalle: { [id]: { etapa: "aroma", intensidad: "12.5" }, [`boca:${otro}`]: { etapa: "fragancia", intensidad: 3 }, fantasma: { etapa: "sabor", intensidad: 5 } } }, 0);
  check("planilla · rueda: el detalle se conserva al abrir un archivo", igual(l.rueda_detalle[id], { etapas: ["aroma"], intensidad: "12.5", nota: "" }));
  check("planilla · rueda: una etapa que no es de la boca vuelve a «sabor»", igual(l.rueda_detalle[`boca:${otro}`], { etapas: ["sabor"], intensidad: "3", nota: "" }));
  check("planilla · rueda: no queda detalle de una nota que no está marcada", igual(Object.keys(l.rueda_detalle).sort(), [id, `boca:${otro}`].sort()));
  check("planilla · rueda: quitar o cambiar una nota poda su detalle", (js.match(/podaDetalle\(l\)/g) ?? []).length >= 3);
}

// V5.140 (owner, 2026-10-02): una nota se resalta en UNA O VARIAS etapas y puede llevar un comentario — igual que en la planilla.
{
  const combos = [[], ["sabor"], ["sabor", "fragancia"], ["residual", "aroma", "aroma"], ["inventada"], [...ETAPAS_DE_LA_RUEDA].reverse()];
  check("planilla · rueda: varias etapas se normalizan igual (orden de la cata, sin repetir, nunca vacía)", combos.every((x) => igual(E.normDetalle({ etapas: x }, "").etapas, normalizaEtapas(x))), combos.map((x) => E.normDetalle({ etapas: x }, "").etapas.join("+")).join(" | "));
  check("planilla · rueda: la `etapa` suelta de un archivo anterior se lee como una lista de una", igual(E.normDetalle({ etapa: "residual" }, "").etapas, normalizaEtapas(undefined, "residual")));
  check("planilla · rueda: alternar una etapa hace lo mismo, y la última no se apaga", [[["sabor"], "fragancia"], [["fragancia", "sabor"], "sabor"], [["sabor"], "sabor"], [["aroma", "residual"], "sabor"]].every(([de, e]) => igual(E.alternaEtapa(de, e), alternaEtapa(de, e))));
  check("planilla · rueda: en CVA las etapas de una nota son las de donde se marcó, una o las dos", igual(E.normDetalle({ etapas: ["aroma", "fragancia", "sabor"] }, "nariz").etapas, ["fragancia", "aroma"]) && igual(E.normDetalle({ etapas: ["residual", "fragancia"] }, "boca").etapas, ["residual"]));
  check("planilla · rueda: el comentario de cada nota, con el mismo tope", E.NOTA_MAX === NOTA_MAX && E.normDetalle({ nota: "x".repeat(NOTA_MAX + 9) }, "").nota.length === NOTA_MAX && E.normDetalle({ nota: 7 }, "").nota === "");
  check("planilla · rueda: la pantalla enciende las etapas por separado y trae el campo del comentario", js.includes("x.etapas = alternaEtapa(x.etapas, d.i);") && js.includes('aria-pressed=\\""+(d.etapas.indexOf(e)>=0)+"\\"') && js.includes('data-k=\\"rueda_detalle."+esc(clave)+".nota\\"') && !js.includes("d.etapa===e"));
  const l2 = E.normLote({ sca_rueda: [idsHerramienta[3]], rueda_detalle: { [idsHerramienta[3]]: { etapas: ["sabor", "fragancia"], intensidad: 9, nota: "a cáscara" } } }, 0);
  check("planilla · rueda: etapas y comentario sobreviven a guardar y volver a abrir", igual(l2.rueda_detalle[idsHerramienta[3]], { etapas: ["fragancia", "sabor"], intensidad: "9", nota: "a cáscara" }));
}

// V5.147 (owner, 2026-10-02): el número de tazas usadas (1–10; cinco por protocolo) — el mismo tope en la herramienta y en la planilla.
{
  const diez = Object.fromEntries(M.SCA_ATR.map((k) => [`sca_${k}`, "8"]));
  const casos = [["3", "3", ""], ["3", "4", ""], ["8", "", "7"], ["10", "10", ""], ["", "", "6"], ["", "5", ""], ["x", "2", "1"], ["1", "", "1"], ["1", "1", "1"]];
  check("planilla · tazas: el puntaje con N tazas es el de la planilla, y pasarse del tope lo anula igual", casos.every(([n, t, f]) => { const ev = { ...diez, sca_num_tazas: n, sca_taint_cups: t, sca_fault_cups: f }; return M.calcSca2004(ev).total === computeSca2004(ev).total; }), casos.map(([n, t, f]) => { const ev = { ...diez, sca_num_tazas: n, sca_taint_cups: t, sca_fault_cups: f }; return `${M.calcSca2004(ev).total}/${computeSca2004(ev).total}`; }).join(" "));
  check("planilla · tazas: el lote guarda tantas tazas como se eligieron (1–5); sin dato o con uno inválido —o más de cinco, V5.153—, cinco", E.normLote({ sca_num_tazas: "3" }, 0).sca_tazas.length === 3 && E.normLote({ sca_num_tazas: "9", sca_tazas: [{ estado: "taint" }] }, 0).sca_tazas.length === 5 && E.normLote({}, 0).sca_tazas.length === 5 && E.normLote({ sca_num_tazas: "40" }, 0).sca_num_tazas === "5");
  // V5.153 (owner): también en el CVA, de 1 a 5 — el mismo selector, el mismo ajuste; y el factor reportado cuando no hay pesos.
  check("planilla · tazas CVA: el lote guarda tantas tazas como se eligieron (1–5); sin dato, cinco", E.normLote({ cva_num_tazas: "2", cva_tazas: [{ defectuosa: true, defecto: "papa" }, {}, { defectuosa: true, defecto: "papa" }] }, 0).cva_tazas.length === 2 && E.normLote({}, 0).cva_tazas.length === 5 && E.normLote({ cva_num_tazas: "7" }, 0).cva_num_tazas === "5");
  check("planilla · tazas CVA: con N tazas todas defectuosas por igual, u = 0 (como con cinco)", M.calcCva({ ...Object.fromEntries(M.CVA_SEC.map((k) => [`cva_${k}`, "7"])), cva_num_tazas: "2", cva_tazas: [{ defectuosa: true, defecto: "papa" }, { defectuosa: true, defecto: "papa" }] }).u === 0 && M.calcCva({ ...Object.fromEntries(M.CVA_SEC.map((k) => [`cva_${k}`, "7"])), cva_num_tazas: "3", cva_tazas: [{ defectuosa: true, defecto: "papa" }, { defectuosa: true, defecto: "papa" }, {}] }).u === 2);
  check("planilla · tazas CVA: el selector está junto a las tazas y al cambiarlo se repinta; el SCA va de 1 a 5", js.includes('<select data-k=\\"cva_num_tazas\\"') && js.includes('if(el.dataset.k==="cva_num_tazas"){ ajustaTazasCva(lote()); pintarPanel(); cambio(); return; }') && js.includes('[1,2,3,4,5].map(function(n){ return "<option value=\\""+n+"\\""+(String(n)===l.sca_num_tazas') && !js.includes("[1,2,3,4,5,6,7,8,9,10]"));
  check("planilla · B3: el factor reportado vale cuando no hay pesos; con pesos manda el derivado", M.factorQueVale({ fa_start: "", fa_green_remainder: "", fa_factor_reportado: "88.5" }) === 88.5 && M.factorQueVale({ fa_start: "250", fa_green_remainder: "200", fa_primary_defect: "", fa_secondary_defect: "", fa_factor_reportado: "88.5" }) === 87.5 && M.factorQueVale({ fa_factor_reportado: "" }) === null && M.factorQueVale({ fa_factor_reportado: "-3" }) === null);
  check("planilla · B3: humedad, aw, densidad, factor reportado y las notas de taza llevan su «i»", ["f_hum", "f_aw", "f_dens", "f_factor_rep", "perfil"].every((k) => M.INFO[k] && js.includes(`info:"${k}"`) || (k === "perfil" && js.includes('ib("perfil")'))));
  check("planilla · tazas: el selector está junto a los defectos de taza y al cambiarlo se repinta", js.includes('<select data-k=\\"sca_num_tazas\\"') && js.includes('if(el.dataset.k==="sca_num_tazas"){ ajustaTazasSca(lote()); pintarPanel(); cambio(); return; }') && js.includes("sca_num_tazas:l.sca_num_tazas"));
}

// V5.153 (owner, 2026-10-05): los botones «i» de la planilla de la plataforma leen los textos de ESTA herramienta
// (`scripts/build-planilla-info.mjs` → `src/lib/arena/planillaInfo.ts`). Si cambia el catálogo INFO, se regenera.
{
  const { generar } = await import("./build-planilla-info.mjs");
  const generado = lee("src/lib/arena/planillaInfo.ts").replace(/\r\n/g, "\n");
  check("planilla · «i»: `planillaInfo.ts` está al día con el catálogo INFO de la herramienta (node scripts/build-planilla-info.mjs)", generado === generar().replace(/\r\n/g, "\n"));
}

// El radar: el centro es 0 (antes el 6 del formulario quedaba en el centro y la figura se deformaba).
check("planilla · radar: el centro es 0 en los dos métodos", js.includes("return n/10;") && !js.includes("(n-5)/5") && js.includes("n/9") && js.includes("n/15"));

// B3 · lo físico — los mismos defectos y los mismos colores que la planilla.
check("planilla · B3: los 16 defectos, con su categoría y su equivalencia", igual(M.DEFECTOS, DEFECTOS_FISICOS.map((d) => [d.key, d.cat, d.granos])));
check("planilla · B3: los 8 colores del verde", COLORES_DEL_VERDE.length === 8 && [1, 2, 3, 4, 5, 6, 7, 8].every((n) => `col${n}` in M.TX));

// B1 · variedades y caracterización básica — una parte más, con los MISMOS campos de las partes 2 y 3 (no una copia).
check("B1: es la primera pestaña y la primera parte", js.includes('[["basico","pBasico","tBasico"],["sabor","pSabor"') && js.includes('const ps = [["basico","pBasico"],["sabor","pSabor"]'));
check("B1: un estado nuevo la trae encendida, y un archivo anterior también", E.estadoVacio().partes.basico === true && E.normalizar({ metodo: "sca", partes: { sabor: true, fisico: false, extr: true } }).partes.basico === true && E.normalizar({ partes: { basico: false, sabor: true } }).partes.basico === false);
{
  const b1 = corte("function basico(){", "function tieneBasico(");
  check("B1: variedad, especie, proceso, humedad, densidad, actividad de agua y el factor", ["variedadesCampo(false)", '"ext.especie"', 'seg("ext.tipo"', '"ext.proc_otro"', '"fis_humedad"', '"fis_densidad"', '"fis_aw"', 'data-o=\\"factor\\"'].every((x) => b1.includes(x)), b1.length + " caracteres");
  check("B1: no inventa campos — escribe en los de las partes 2 y 3", !/data-k=\\"b1|"b1_|basico\./.test(b1) && corte("function extr(){", "function ").length > 0 && js.includes("variedadesCampo(true)"));
  check("B1: sale en la ficha, y se puede apagar", js.includes("if(S.partes.basico && tieneBasico(l)) cuerpo += fichaBasico(l);") && js.includes('if(UI.tab==="basico") return basico();'));
  check("B1: las variedades se validan en B1 igual que en la parte extrínseca", js.includes('if(UI.tab==="extr" || UI.tab==="basico"){'));
}

if (fallos.length) {
  console.error(`✗ qa-coffee-datasheet: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-coffee-datasheet: ${ok} comprobaciones OK, 0 fallos (${Object.keys(M.TX).length} textos × 3 idiomas · ${Object.keys(M.INFO).length} botones «i» · 1.200 planillas contra la plataforma)`);
