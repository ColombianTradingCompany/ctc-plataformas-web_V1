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

import { readFileSync } from "node:fs";
import { HERRAMIENTA, aplicar, leerRueda } from "./build-coffee-datasheet.mjs";
import { leerDatosDeLaHerramienta } from "./build-rueda-datos.mjs";
import { RUEDA as RUEDA_PLATAFORMA } from "../src/lib/catacion/rueda.ts";
import { CVA as CVA_PLATAFORMA, SCA2004, computeCva, computeSca2004, computeFactor } from "../src/lib/arena/labEvaluation.ts";
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
            calcCva, calcSca2004, calcDefectos, clasificaVerde, calcMallas, calcFactor, cataCuenta, contarTazas, claseSca };`,
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
  "d_moho", "d_fenol", "d_papa", ...["4c", "fair", "org", "ra", "food", "eudr", "bird", "cafe", "aaa", "gi"].map((c) => `ce_${c}`),
  "tu1", "tu2", "tu3", "tu4", "tu5", "alta", "media", "baja", "pesado", "medio", "ligero",
  ...["sca", "cva"].flatMap((m) => [`${m}Nom`, `${m}Sub`, `${m}Tag`, `${m}Btn`, ...[1, 2, 3, 4, 5].map((n) => `${m}L${n}`)]),
];
for (const k of [...usadas, ...dinamicas]) check(`texto · «${k}» se usa y existe`, k in M.TX);
const infos = new Set([...js.matchAll(/\bib\("([a-z_0-9]+)"\)/g), ...js.matchAll(/info:"([a-z_0-9]+)"/g), ...js.matchAll(/data-v=\\"([a-z_0-9]+)\\">"\+t\("eligeDif"\)/g)].map((m) => m[1]));
for (const k of [...infos, ...["fragrance", "flavor", "aftertaste", "acidity", "body", "balance", "cuppers", "uniformity", "clean_cup", "sweetness"].map((x) => `sca_${x}`), ...M.CVA_SEC.map((x) => `sec_${x}`), "dif", "prep", "partes", "lotes", "sesion"])
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
check("las tres partes se pueden apagar, y siempre queda una", js.includes('t("unaParte")') && ["pSabor", "pFisico", "pExtr"].every((k) => k in M.TX));
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

if (fallos.length) {
  console.error(`✗ qa-coffee-datasheet: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-coffee-datasheet: ${ok} comprobaciones OK, 0 fallos (${Object.keys(M.TX).length} textos × 3 idiomas · ${Object.keys(M.INFO).length} botones «i» · 1.200 planillas contra la plataforma)`);
