// Guardián de CTCx Coffee Datasheet Tool (V6.6, `herramientas-cafe` · `coffee-datasheet`).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-coffee-datasheet-check.mjs
//
// GRATIS y sin red: ejecuta el estado puro de la herramienta (`components/tools/datasheet/estado.ts`) y lee sus fuentes.
// El recorrido con navegador es `qa-tools-puente-conformance` (sonda `coffee-datasheet`).
//
// QUÉ VIGILA, y por qué cada cosa:
//
//   1. UNA SOLA PLANILLA. El owner (2026-10-23): «it MUST be the SAME [interface as the Centro de Calidad]». La herramienta
//      RENDERIZA `LabEvalEditor` —el componente del Centro, el OCP y la Arena— y guarda `LabEvaluation` tal cual. Si alguien
//      vuelve a escribir una copia de la planilla aquí, esto falla.
//   2. LAS TRES PARTES PROPIAS —B1, extrínseca (SCA 105), comercial— no duplican un dato que ya tiene sitio: humedad, aw,
//      densidad y factor reportado son los campos `b3_*` de la planilla; variedad y proceso viven en B1; precio y cantidades
//      en la comercial. Y las cinco partes se apagan sin borrar nada (siempre queda una).
//   3. EL UID ES ÚNICO DE VERDAD (owner: «not just the date»): `CDT-XXXX-XXXX` del alfabeto Crockford de la casa, acuñado al
//      crear el lote, distinto de los que ya hay, nunca editable; un archivo con UIDs repetidos o inválidos los reacuña.
//   4. LA MARCA DE LA CASA en la ficha impresa: marca de agua, cabecera, UID, método, sitio web, correo, los teléfonos (cuando
//      estén en `legal.ts`), la línea legal y la reserva de derechos. Nunca un teléfono inventado.
//   5. LO QUE ENTRA SE NORMALIZA: un trabajo de la V1 (el HTML autocontenido), un archivo hostil, un `init` vacío.
//   6. EL PUENTE desde React obedece las mismas reglas que `ctc-bridge.js`; la página de paso lleva al destino; las listas del
//      repo (carpetas, capturas, conformidad, espejo SEO) conocen la ruta nueva.

import { readFileSync, existsSync } from "node:fs";
import {
  APP, CERT_OFICIALES, CERT_OTRAS, INCOTERMS, LOTES_RECOMENDADOS, MAX_LOTES, NORMAS_CALIDAD, PARTES, PROCESOS, UID_RE, UNIDADES_PRECIO, VERSION_ESTADO,
  casillasExtrinsecas, esUid, evaluacionVacia, loteVacio, normLote, normalizar, nuevoUid, partesConDatos, precioTx, resumen, vigenciaDe,
} from "../src/components/tools/datasheet/estado.ts";
import { TX } from "../src/components/tools/datasheet/textos.ts";
import { DESCRIPCION, TITULO } from "../src/components/tools/datasheet/meta.ts";
import { EMPTY_LAB_EVALUATION, computeCva, toLabEvaluation } from "../src/lib/arena/labEvaluation.ts";
import { INFO_PLANILLA } from "../src/lib/arena/planillaInfo.ts";
import { ALFABETO } from "../src/lib/catalogo/codigoPublico.ts";
import { CTC_EMAIL, CTC_TELEFONOS, CTC_WEB } from "../src/lib/legal.ts";
import { CARPETAS_HERRAMIENTAS } from "../src/lib/tools/carpetas.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const tool = lee("src/components/tools/datasheet/DatasheetTool.tsx");
const b1 = lee("src/components/tools/datasheet/BloqueB1.tsx");
const ext = lee("src/components/tools/datasheet/BloqueExtrinseca.tsx");
const com = lee("src/components/tools/datasheet/BloqueComercial.tsx");
const ficha = lee("src/components/tools/datasheet/FichaImpresa.tsx");
const puente = lee("src/components/tools/datasheet/usePuente.ts");
const pagina = lee("src/app/tools/coffee-datasheet/app/page.tsx");
const paso = lee("public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html");

// ── 1. Una sola planilla: la del Centro de Calidad ───────────────────────────────────────────────────────────────────
check("la herramienta renderiza LabEvalEditor (el componente del Centro, el OCP y la Arena)", tool.includes('import { LabEvalEditor } from "@/components/bcp/LabEvalEditor"') && tool.includes("<LabEvalEditor value={lote.planilla} onChange={setPlanilla}"));
check("la planilla del lote ES una LabEvaluation (toLabEvaluation al entrar, EMPTY al nacer)", igual(loteVacio(0).planilla, EMPTY_LAB_EVALUATION) && igual(normLote({ planilla: { cva_flavor: "8", vista: "cva" } }, 0).planilla.cva_flavor, "8"));
check("sin grado: la herramienta pide ocultaGrado (el grado lo otorga el Centro, no una autoevaluación)", tool.includes("ocultaGrado"));
check("B2 y B3 se enseñan por `bloques`, con las partes activas", tool.includes('(["b2", "b3"] as BloqueDePlanilla[]).filter((b) => vivo.partes[b])'));
check("ninguna fórmula propia: todo cálculo se importa de labEvaluation / fichaCalculations", !/0\.65625|52\.75/.test(tool + b1 + ext + com + ficha));
check("la ficha impresa lee la MISMA aritmética (computeCva · computeSca2004 · computeFactor · computeMesh · puntoDeLaPlanilla)", ["computeCva", "computeSca2004", "computeFactor", "computeMesh", "puntoDeLaPlanilla", "equivalenteDeLaPlanilla", "rotuloDelPunto", "RadarDeTaza"].every((x) => ficha.includes(x)));
check("las «i» salen del mismo catálogo que la planilla (INFO_PLANILLA)", [tool, b1, ext, com].every((x) => x.includes("INFO_PLANILLA")) && ["b1_que", "uid", "c_que", "c_precios", "c_validez", "e_que", "e_cultivo", "e_proceso", "e_comercio", "e_certs", "e_otro", "sesion", "lotes", "partes", "f_hum", "f_aw", "f_dens", "f_factor_rep"].every((k) => INFO_PLANILLA.es[k]?.texto.length > 40 && INFO_PLANILLA.en[k]?.texto.length > 40));
check("el catálogo INFO es la fuente (ya no se genera del HTML)", !existsSync(new URL("../scripts/build-planilla-info.mjs", import.meta.url)) && !lee("src/lib/arena/planillaInfo.ts").startsWith("// GENERADO"));

// ── 2. Las partes propias no duplican datos; se apagan sin borrar ─────────────────────────────────────────────────────
check("cinco partes: b1 · b2 · b3 · ext · com", igual([...PARTES], ["b1", "b2", "b3", "ext", "com"]) && ["pB1", "pB2", "pB3", "pExt", "pCom"].every((k) => TX.es[k] && TX.en[k]));
check("B1 escribe humedad, densidad, aw y factor en la planilla (b3_*), no en campos propios", ["b3_humedad_verde", "b3_densidad_verde", "b3_actividad_agua", "b3_factor_reportado"].every((k) => b1.includes(`"${k}"`)) && !("humedad" in loteVacio(0).b1));
check("B1: la especie se deriva de las variedades (especieDelLote de la Ficha)", b1.includes("especieDelLote(") && !("especie" in loteVacio(0).b1));
check("B1: los procesos base son los de la Ficha más «Otro»", igual([...PROCESOS], ["Lavado", "Honey", "Natural", "Otro"]));
check("extrínseca: variedad, proceso, precio y tamaño se ENSEÑAN desde B1 y la comercial, no se vuelven a pedir", !("variedades" in loteVacio(0).ext) && !("tipo" in loteVacio(0).ext) && !("precio" in loteVacio(0).ext) && !("tamano" in loteVacio(0).ext) && ext.includes('derivado(t.xPrecio, precioTx(lote.com.farm_gate, lote.com.farm_gate_unidad), t.xDeCom, "precio")'));
check("extrínseca: las casillas del SCA 105 (8 · 6 · 7 · 6 · 1 = 28) se cuentan", (() => { const c = casillasExtrinsecas(loteVacio(0)).cuenta; return c.cultivo[1] === 8 && c.proceso[1] === 6 && c.comercio[1] === 7 && c.certs[1] === 6 && c.otro[1] === 1; })());
check("extrínseca: la casilla «precio» se enciende con el farm gate de la comercial", casillasExtrinsecas({ ...loteVacio(0), com: { ...loteVacio(0).com, farm_gate: "2950000" } }).marca.precio === true && casillasExtrinsecas(loteVacio(0)).marca.precio === false);
check("extrínseca: certificaciones oficiales del formato + las de la casa", igual([...CERT_OFICIALES], ["4c", "fair", "org", "ra", "food"]) && igual([...CERT_OTRAS], ["eudr", "bird", "cafe", "aaa", "gi"]) && [...CERT_OFICIALES, ...CERT_OTRAS].every((k) => TX.es.ce[k] && TX.en.ce[k]));
check("comercial: cantidades (pergamino · verde), farm gate, FOB con puerto, CIP/DDP con región, empaque, norma, condiciones y «válido hasta»", ["pergamino_kg", "verde_kg", "farm_gate", "fob", "fob_puerto", "incoterm", "destino_precio", "destino_region", "empaque", "norma", "condiciones", "valido_hasta"].every((k) => k in loteVacio(0).com));
check("comercial: incoterms CIP y DDP; unidades con COP/carga, US$/lb y US$/kg; UGQ entre las normas", igual([...INCOTERMS], ["", "CIP", "DDP"]) && ["COP/carga 125 kg", "US$/lb", "US$/kg"].every((u) => UNIDADES_PRECIO.includes(u)) && NORMAS_CALIDAD.includes("UGQ") && NORMAS_CALIDAD.includes("Otra"));
check("comercial: la vigencia se lee de «válido hasta» (vencida · vigente · sin fecha)", vigenciaDe("2026-10-01", "2026-10-23") === "vencida" && vigenciaDe("2026-12-31", "2026-10-23") === "vigente" && vigenciaDe("", "2026-10-23") === "");
check("comercial: la ficha impresa avisa en rojo si venció", ficha.includes('vig === "vencida"') && ficha.includes("t.vencida"));
check("las partes se apagan sin borrar, y siempre queda una", tool.includes("if (!PARTES.some((x) => partes[x])) {") && tool.includes("toast(t.unaParte)") && normalizar({ partes: { b1: false, b2: false, b3: false, ext: false, com: false } }).partes.b2 === true);
check("una parte apagada o vacía no se imprime", ficha.includes("const activa = (p: Parte) => ev.partes[p] && hay[p];") && igual(partesConDatos(loteVacio(0)), { b1: false, b2: false, b3: false, ext: false, com: false }));
check("precioTx: cifra + unidad, o nada", precioTx("12", "US$/lb") === "12 US$/lb" && precioTx("", "US$/lb") === "");

// ── 3. El UID: único de verdad ───────────────────────────────────────────────────────────────────────────────────────
{
  const uids = new Set();
  for (let i = 0; i < 2000; i++) uids.add(nuevoUid());
  check("UID: 2.000 seguidos, 2.000 distintos", uids.size === 2000);
  check("UID: la forma CDT-XXXX-XXXX con el alfabeto Crockford de la casa (sin I, L, O, U)", [...uids].every((u) => UID_RE.test(u) && [...u.replace(/^CDT-|-/g, "")].every((ch) => ALFABETO.includes(ch))));
  check("UID: no lleva la fecha", ![...uids].some((u) => u.includes(new Date().getFullYear().toString().slice(2))) || uids.size === 2000);
  check("UID: nunca repite uno que ya está en la evaluación", esUid(nuevoUid([...uids])) && !uids.has(nuevoUid([...uids])));
  const dos = normalizar({ lotes: [{ uid: "CDT-AAAA-BBBB" }, { uid: "CDT-AAAA-BBBB" }, { uid: "mal" }] });
  check("UID: un archivo con UIDs repetidos o inválidos los reacuña (los tres distintos y válidos)", new Set(dos.lotes.map((l) => l.uid)).size === 3 && dos.lotes.every((l) => esUid(l.uid)) && dos.lotes[0].uid === "CDT-AAAA-BBBB");
  check("UID: en pantalla es un rótulo (no se edita) con su «i»", tool.includes('data-prueba="uid"') && tool.includes('info("uid")') && !tool.includes("uid: e.target.value"));
  check("UID: duplicar un lote acuña otro UID", tool.includes('uid: "" })), e.lotes.length, uids)'));
}

// ── 4. La marca de la casa en la ficha ───────────────────────────────────────────────────────────────────────────────
check("ficha: marca de agua CTCx (la del Dossier) y cabecera con el logo, el UID y el método", ficha.includes("cdt-agua") && ficha.includes('rotate(-30deg)') && ficha.includes("ctc-logo-parrot-black.webp") && ficha.includes("{lote.uid}") && ficha.includes("{protocolo}"));
check("ficha: sitio web, correo, teléfonos (si los hay), línea legal y reserva de derechos", ["CTC_WEB", "CTC_EMAIL", "CTC_TELEFONOS", "CTC_LEGAL_LINE", "t.derechos"].every((x) => ficha.includes(x)) && CTC_WEB === "www.ctcexport.com" && CTC_EMAIL === "info@ctcexport.com");
check("teléfonos: la lista vive en legal.ts y la ficha omite la línea si está vacía (nunca un número inventado)", Array.isArray(CTC_TELEFONOS) && ficha.includes("CTC_TELEFONOS.length > 0 &&") && CTC_TELEFONOS.every((x) => /^\+?[\d\s().-]{7,}$/.test(x)));
check("ficha: firma, fecha de generación y el descargo (sin grado CTCx, sin aval de la SCA)", ficha.includes("t.fiFirma") && ficha.includes("t.fiGenerada") && TX.es.fiAviso.includes("no otorga un Grado CTCx") && TX.en.fiAviso.includes("does not endorse"));
check("ficha: la hoja impresa no recibe el padding de <section> de globals.css (es un <div>)", !ficha.includes("<section "));
check("impresión: solo las fichas (cdt-no-print) y con los colores de la casa", tool.includes("@media print { .cdt-no-print { display: none !important; }") && tool.includes("print-color-adjust: exact"));

// ── 5. Lo que entra se normaliza ─────────────────────────────────────────────────────────────────────────────────────
check("estado: app y versión", APP === "ctcx-coffee-datasheet" && VERSION_ESTADO === 2 && evaluacionVacia().v === 2 && MAX_LOTES === 12 && LOTES_RECOMENDADOS === 6);
check("un init vacío o basura da una evaluación limpia de un lote", normalizar(null).lotes.length === 1 && normalizar("x").lotes.length === 1 && normalizar({}).lotes[0].codigo === "L01");
// La concha manda `{}` para un trabajo nuevo: el lote nace con la planilla NUEVA (CVA, el protocolo principal), no con el valor por
// defecto de `toLabEvaluation` para una planilla guardada sin escala (SCA 2004) — por ahí la hoja abría en SCA dentro de la concha.
check("un lote sin planilla nace en CVA (como un lote nuevo), y una planilla guardada conserva su vista", normalizar({}).lotes[0].planilla.vista === "cva" && normalizar({ lotes: [{}] }).lotes[0].planilla.escala === "cva" && normalizar({ lotes: [{ planilla: { escala: "sca", vista: "sca" } }] }).lotes[0].planilla.vista === "sca");
{
  // Un trabajo de la V1 (el HTML autocontenido): campos planos, listas de la rueda por lado, fis_*, ext con variedades y tipo.
  const v1 = normalizar({ app: APP, v: 1, metodo: "cva", lang: "de", partes: { basico: true, sabor: true, fisico: false, extr: true }, lotes: [{
    codigo: "A01", nombre: "Viejo", cva_flavor: "8", cva_fragrance: "7", sca_rueda: ["frutal-citricos|lima"], cva_desc_nariz: ["floral"], cva_desc_boca: ["frutal-citricos|lima"],
    rueda_detalle: { "nariz:floral": { etapas: ["aroma"], intensidad: "12", nota: "" }, "boca:frutal-citricos|lima": { etapas: ["sabor"], intensidad: "9", nota: "ok" } },
    fis_humedad: "11.2", fis_aw: "0.58", fis_color: "c3", fis_def: { partido: "7" }, fa_green_remainder: "201", sca_notas: "perfil viejo",
    ext: { pais: "Colombia", variedades: [{ n: "Castillo", p: "100" }], tipo: "otro", tipo_cual: "Honey", precio: "2950000", certs: { org: true, eudr: true } },
  }] });
  const l = v1.lotes[0];
  check("V1: la vista sale del método y el idioma alemán cae al español", l.planilla.vista === "cva" && v1.lang === "es");
  check("V1: las tres listas de la rueda se funden en `rueda`, sin repetir, y el detalle pierde el prefijo nariz:/boca:", igual([...l.planilla.rueda].sort(), ["floral", "frutal-citricos|lima"]) && l.planilla.rueda_detalle["frutal-citricos|lima"]?.nota === "ok" && l.planilla.rueda_detalle.floral?.intensidad === 12);
  check("V1: fis_* van a los campos b3_* y al detalle de defectos; las notas de taza al perfil", l.planilla.b3_humedad_verde === "11.2" && l.planilla.b3_actividad_agua === "0.58" && l.planilla.fa_color === "verde" && l.planilla.defectos_detalle.partido === "7" && l.planilla.cupping_profile === "perfil viejo");
  check("V1: variedades y proceso van a B1 (otro + «Honey» = Honey); el precio, a la comercial; las certificaciones se quedan", l.b1.variedades[0].nombre === "Castillo" && l.b1.proceso === "Honey" && l.com.farm_gate === "2950000" && l.ext.certs.org === true && l.ext.certs.eudr === true && l.ext.pais === "Colombia");
  check("V1: las partes viejas se traducen (sabor→b2, fisico→b3, extr→ext, basico→b1) y la comercial nace encendida", v1.partes.b2 && !v1.partes.b3 && v1.partes.ext && v1.partes.b1 && v1.partes.com);
  check("V1: el puntaje CVA del lote viejo sigue calculándose con la planilla", computeCva(toLabEvaluation(l.planilla)).calificadas === 2);
}
{
  const hostil = normalizar({ lang: "zz", actual: 99, partes: "x", sesion: { evaluador: { a: 1 } }, lotes: [{ codigo: { a: 1 }, planilla: "x", b1: { variedades: "x", proceso: "Lavadísimo" }, ext: { certs: ["x"], descaf: "quizás" }, com: { incoterm: "EXW", farm_gate_unidad: "" } }, "basura", null] });
  check("hostil: idioma, índice, partes, sesión, lotes, B1, extrínseca y comercial se saneen sin tumbar nada", hostil.lang === "es" && hostil.actual === 2 && hostil.lotes.length === 3 && hostil.sesion.evaluador === "" && hostil.lotes[0].codigo === "L01" && hostil.lotes[0].b1.proceso === "" && hostil.lotes[0].b1.variedades.length === 1 && igual(hostil.lotes[0].ext.certs, {}) && hostil.lotes[0].ext.descaf === "" && hostil.lotes[0].com.incoterm === "" && hostil.lotes[0].com.farm_gate_unidad === UNIDADES_PRECIO[0]);
  check("hostil: más de MAX_LOTES se recortan", normalizar({ lotes: Array.from({ length: 40 }, () => ({})) }).lotes.length === MAX_LOTES);
}
check("resumen del trabajo: lotes y nombres, en el idioma, con tope", resumen(normalizar({ lotes: [{ nombre: "Uno" }, { nombre: "" }] })).startsWith("2 lotes · Uno, L02") && resumen(normalizar({ lang: "en", lotes: [{}] })).startsWith("1 lot ·"));
check("lo que se carga de un archivo se normaliza antes de pintarse, y un archivo ajeno se rechaza", tool.includes("setEv(normalizar(o.estado, lang))") && tool.includes("o.app !== APP"));

// ── 6. El puente, la página de paso y las listas del repo ────────────────────────────────────────────────────────────
check("puente React: ready al montar y al «hola» (con `*`, como ctc-bridge.js), solo obedece al parent, y el estado va al origen que mandó el init", puente.includes('{ ctc: "ready", v: 1 }, "*")') && puente.includes('d.ctc === "hola"') && puente.includes("e.source !== window.parent") && puente.includes('e.origin.startsWith("https://") || e.origin.startsWith("http://") ? e.origin : "*"') && puente.includes("}, origenDeLaConcha.current);") && !puente.includes("window.location.origin"));
check("puente React: el estado sale solo tras el init, con debounce y la foto entera", puente.includes("if (!activo.current) return;") && puente.includes("DEBOUNCE_MS = 900") && puente.includes("JSON.parse(JSON.stringify(estado))"));
check("puente React: nada se guarda mientras el estado no ha nacido (StrictMode corre los efectos dos veces)", puente.includes("if (estado == null) return;") && tool.includes("usePuente({ estado: ev,"));
check("puente React: dentro de la concha jamás localStorage; fuera, el borrador v2", puente.includes("if (enConcha()) return null;") && puente.includes('CLAVE_BORRADOR = "ctcx-coffee-datasheet-borrador-v2"'));
check("la página cuelga de /tools (fuera del proxy), con tema bcp y los metadatos de meta.ts", pagina.includes('data-theme="bcp"') && pagina.includes("title: TITULO") && pagina.includes("description: DESCRIPCION") && TITULO.includes("CTCx Coffee Datasheet Tool") && DESCRIPCION.endsWith("Colombian Trading Company SAS · ctcexport.com"));
check("la página de paso (HTML viejo) lleva a la ruta, con el mismo título y descripción, y sin puente", paso.includes("url=/tools/coffee-datasheet/app") && paso.includes(`<title>${TITULO}</title>`) && paso.includes(`content="${DESCRIPCION}"`) && !paso.includes("ctc-bridge.js") && paso.length < 2000);
check("carpetas.ts conoce la página de paso", CARPETAS_HERRAMIENTAS.some((c) => c.id === "coffee-datasheet" && c.archivos[0] === "ctcx-coffee-datasheet-tool.html"));
check("build-tool-shots captura la ruta nueva", lee("scripts/build-tool-shots.mjs").includes('"coffee-datasheet": "/tools/coffee-datasheet/app?lang=es"'));
check("la conformidad del puente sondea la ruta nueva", lee("scripts/qa-tools-puente-conformance.mjs").includes('"coffee-datasheet": "/tools/coffee-datasheet/app"') && lee("scripts/qa-tools-puente-conformance.mjs").includes("[data-prueba=nombre]"));
check("qa-tools-seo-espejo sabe leer una versión repo que es una RUTA", lee("scripts/qa-tools-seo-espejo.mjs").includes("src/app${src}/page.tsx"));
check("el generador de catálogos de la V1 se retiró (los catálogos se importan)", !existsSync(new URL("../scripts/build-coffee-datasheet.mjs", import.meta.url)) && b1.includes('from "@/components/kaffetal-regal/ficha/fichaData"') && ext.includes("DEP_MUNI"));
check("los textos propios están en ES y EN, con las mismas claves", igual(Object.keys(TX.es).sort(), Object.keys(TX.en).sort()) && Object.keys(TX.es).every((k) => typeof TX.es[k] === typeof TX.en[k]));

if (fallos.length) {
  console.error(`✗ qa-coffee-datasheet: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-coffee-datasheet: ${ok} comprobaciones OK, 0 fallos (la planilla del Centro, más B1 · extrínseca · comercial; UID; marca de la casa; V1 → V2)`);
