// Guardián del CENTRO DE CALIDAD · Evaluación de Lotes (V5.81, fase 4 del PLAN_CIRCUITO_DEL_LOTE).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-centro-calidad-check.mjs
//
// GRATIS y sin red: ejercita los módulos puros y lee las fuentes.
//
// QUÉ VIGILA. El folio 7 del owner, paso 11, transcrito en `docs/PLAN_CIRCUITO_DEL_LOTE.md` §0: el Q-Grader «recibe
// baches; evalúa lote a lote, anónimos (solo UID), física y sensorialmente con la Datasheet Tool, sin "01 Extrínsecos"
// ni la variedad (sesgo); da de alta cada lote individualmente». Y sus respuestas: la credencial `centro-calidad`
// activa módulos (respuesta 5) y el nombre del Q-Grader deja de teclearse; registrar ≠ confirmar (§3); SCA y CVA se
// distinguen en la información (folio 11); la rueda tiene UNA taxonomía. Cada bloque cita de dónde sale.
// V5.92 (owner, 2026-09-25 — plan §10): la planilla es DUAL (vista SCA · CVA · Ambas), la fórmula CVA es la que corroboró el
// Q-Grader (los vectores se LEEN de la tabla del §10.2) y el Punto homologado obedece R1–R8 (banda k 1–2, piso, Tyrian nativo).

import { readFileSync } from "node:fs";
import { RUEDA, DESCRIPTORES, normalizaRueda, descriptorLabel, rutaDe, familiaDe, ETAPAS_DE_LA_RUEDA, ETAPA_LABEL, INTENSIDAD, MARCA_POR_DEFECTO, ZONA_LABEL, zonaDeIntensidad, normalizaDetalle, marcaLabel, ajustaIntensidad, NOTA_MAX, alternaEtapa, etapasLabel, limpiaNota, normalizaEtapas } from "../src/lib/catacion/rueda.ts";
import { generar as generarRuedaDatos, leerDatosDeLaHerramienta } from "./build-rueda-datos.mjs";
import { CVA, CVA_SECCIONES, SCA2004, computeCva, computeSca2004, contarScaTazas, normalizaScaTazas, EMPTY_LAB_EVALUATION, labEvaluationHasData, labEvaluationScore, protocoloDelPunto, puntoDeLaPlanilla, toLabEvaluation } from "../src/lib/arena/labEvaluation.ts";
import { BANDA_SIN_CALIBRAR, CVA_PROPOSITO, LOTES_PARA_CALIBRAR, admiteTyrian, decidirPorPunto, gradoFirme, homologarCva, puntoDeFila, puntoHomologado, puntoNativo, rotuloDelPunto, techoDelPunto } from "../src/lib/arena/homologacion.ts";
import { PL, SCA_ATTR_LABEL, CVA_SECCION_LABEL, MALLA_LABEL } from "../src/lib/arena/planillaI18n.ts";
import { estadoDelCircuito } from "../src/lib/ocp/circuito.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const cuerpoDe = (src, nombre) => {
  const i = src.indexOf(`export async function ${nombre}(`);
  if (i < 0) return "";
  const j = src.indexOf("\nexport async function ", i + 1);
  return src.slice(i, j < 0 ? undefined : j);
};

const plan = lee("docs/PLAN_CIRCUITO_DEL_LOTE.md");
const pagina = lee("src/app/socios/[partner]/panel/evaluacion/page.tsx");
const acciones = lee("src/app/socios/[partner]/panel/evaluacionActions.ts");
// Lo que se vigila es el CÓDIGO: los comentarios pueden nombrar lo que el código no toca.
const sinComentarios = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
const paginaCodigo = sinComentarios(pagina);
const accionesCodigo = sinComentarios(acciones);
const planilla = lee("src/app/socios/[partner]/panel/evaluacion/PlanillaCentro.tsx");
const PLANILLA_TXT = (texto) => planilla.includes(`"${texto}"`);
const SCA_ATTRS_KEYS = () => ["fragrance", "flavor", "aftertaste", "acidity", "body", "balance", "uniformity", "clean_cup", "sweetness", "cuppers"];
const nominados = lee("src/app/ocp/(app)/nominadosActions.ts");
const gate = lee("src/lib/partners/requirePartner.ts");

// ── 1. El folio: anónimos, solo el UID, sin extrínsecos ni variedad ─────────
{
  check("el plan transcribe el paso 11 (anónimos, solo UID, sin variedad)", /anónimos \(solo UID\)/.test(plan) && /sin «01 Extrínsecos» ni la variedad/.test(plan));
  const prohibido = ["full_name", "producer_id", "finca", "ficha_variedad", "datasheet", "fetchProducerContacts", "producer_profiles", "profiles"];
  for (const p of prohibido) {
    check(`la pantalla del Centro no lee «${p}»`, !paginaCodigo.includes(p));
    check(`ni sus acciones`, !accionesCodigo.includes(p));
  }
  check("el Centro identifica el lote solo por su código corto (uid_anonimo)", pagina.includes("ctcLotReferenceShort(l.lot_id)") && acciones.includes("uid_anonimo: ctcLotReferenceShort(lotId)"));
  check("y la pantalla dice que es a ciegas", /a ciegas/.test(pagina) || /a ciegas/.test(planilla));
}

// ── 2. La credencial activa el módulo (respuesta 5) y el nombre no se teclea ──
{
  check("la identidad del socio trae sus módulos", gate.includes("modulos: PartnerModulos") && gate.includes('select("org_name, contact_name, email, node_type, status, modulos")'));
  check("hay una versión que NO redirige, para las Server Actions", gate.includes("export async function getPartnerIdentity(") && gate.includes("return null"));
  check("la página exige la credencial del Centro y el módulo evaluacion", pagina.includes('requirePartner("centro-calidad")') && pagina.includes("if (!identity.modulos.evaluacion) redirect("));
  check("las acciones exigen lo mismo, con resultado y no con redirect", acciones.includes('getPartnerIdentity("centro-calidad")') && acciones.includes("identity.modulos.evaluacion") && !acciones.includes("redirect("));
  check("el Q-Grader firma con el contacto de su credencial — nadie lo teclea", acciones.includes("q_grader_reference: identity.contactName?.trim() || identity.orgName"));
  const env = cuerpoDe(nominados, "enviarAlCentro");
  check("al enviar el bache, el Q-Grader sale de la credencial elegida", env.includes("const qGrader = centro.contact_name?.trim() || centro.org_name") && !/formData\.get\("q_grader"\)/.test(env));
  check("y solo a una credencial con Evaluación de Lotes activa", nominados.includes('.contains("modulos", { evaluacion: true })') && env.includes("centrosConEvaluacion(service)"));
  const socios = lee("src/app/bcp/(app)/sociosActions.ts");
  check("los módulos los conmuta el owner en BCP · Socios (setPartnerModulos)", socios.includes("export async function setPartnerModulos(") && socios.includes("await requireOwner()") && socios.includes('target.node_type !== "centro-calidad"'));
  check("y la ficha del nodo tiene los dos conmutadores", lee("src/app/bcp/(app)/socios/[nodo]/page.tsx").includes('name="evaluacion"') && lee("src/app/bcp/(app)/socios/[nodo]/page.tsx").includes('name="procesamiento"'));
  const migracion = lee("docs/migraciones/2026-09-24_centro_calidad_evaluacion.sql");
  check("el acta añade `modulos` y las cuatro columnas de la evaluación", ["modulos jsonb not null default '{}'::jsonb", "batch_id uuid references public.sondeo_batches(id)", "escala text not null default 'sca'", "rueda jsonb not null default '[]'::jsonb", "uid_anonimo text"].every((c) => migracion.includes(c)));
}

// ── 3. Registrar ≠ confirmar (§3 del plan) ──────────────────────────────────
{
  const reg = cuerpoDe(acciones, "registrarEvaluacion");
  check("dar de alta inserta una lot_evaluations PENDIENTE con procedencia q_grader_batch", reg.includes('source: "q_grader_batch"') && reg.includes('status: "pending"'));
  // V5.144: la comprobación del bache vive en `bacheEnMisManos`, que usan el alta Y el borrador.
  const enMisManos = acciones.slice(acciones.indexOf("async function bacheEnMisManos("), acciones.indexOf("export async function guardarBorrador("));
  check("solo de un bache en_centro asignado a ESA credencial", reg.includes("await bacheEnMisManos(service, lotId, identity.userId)") && enMisManos.includes('batch.status !== "en_centro"') && enMisManos.includes("batch.centro_calidad_account_id !== userId") && enMisManos.includes('ins.phase !== "sondeo"'));
  check("una sola alta pendiente por lote y bache", reg.includes("Este lote ya está dado de alta"));
  check("sin Punto (planilla completa) no hay alta (V5.92)", reg.includes("if (!punto) return"));
  check("con rastro", reg.includes('action: "evaluacion_registrada_centro"'));
  check("el Q-Grader puede anular su alta mientras esté pendiente", cuerpoDe(acciones, "anularRegistro").includes('row.status !== "pending"') && cuerpoDe(acciones, "anularRegistro").includes("row.submitted_by !== auth.identity.userId"));
  check("el alta NO escribe el grado ni el stage del lote", !reg.includes("grade:") && !reg.includes("stage:"));
  const verdict = cuerpoDe(nominados, "recordEvaluationVerdict");
  check("CTCx CONFIRMA el alta (centroEvaluationId) en vez de teclear otra planilla", verdict.includes("extras?.centroEvaluationId") && verdict.includes('row.status !== "pending"'));
  check("la confirmación deja la fila accepted y rigiendo el grado", nominados.includes('.update({ status: "accepted", reviewed_by: adminId, reviewed_at: new Date().toISOString(), rige_grado: true })'));
  check("y también cuando el café no supera (la evaluación vale, el lote no pasa)", (verdict.match(/confirmarFilaDelCentro\(service, centroRow\.id, lotId, adminId\)/g) ?? []).length === 2);
  check("o la DEVUELVE al Centro con motivo (rejected)", cuerpoDe(nominados, "devolverEvaluacionAlCentro").includes('status: "rejected"') && cuerpoDe(nominados, "devolverEvaluacionAlCentro").includes("if (!razon) return"));
  const vista = lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx");
  check("Lotes en Evaluación enseña el alta pendiente y la confirma", vista.includes("ConfirmarCentroControls") && vista.includes('.in("status", ["pending", "rejected"])'));
  check("y el Centro ve la devolución para evaluar de nuevo", pagina.includes('e.status === "rejected"') && pagina.includes("Devuelta por CTC"));
}

// ── 4. El circuito conoce «evaluado» (registrado, sin confirmar) ────────────
{
  const base = { stage: "apto", registradoPorCtc: false, tieneInscripcion: true, pagoConfirmado: true, muestraRecibida: true, enBache: true, grado: null, ultimaOferta: null, contrato: null };
  check("en bache sin alta → en evaluación", estadoDelCircuito(base).estado === "en_evaluacion");
  check("en bache con alta pendiente → evaluado", estadoDelCircuito({ ...base, evaluacionPendiente: true }).estado === "evaluado");
  check("con grado confirmado → pendiente de oferta (el alta ya no manda)", estadoDelCircuito({ ...base, evaluacionPendiente: true, grado: "blue" }).estado === "pendiente_oferta");
  check("un alta suelta sin bache no adelanta al lote", estadoDelCircuito({ ...base, enBache: false, evaluacionPendiente: true }).estado === "a_evaluar");
  check("la tabla del OCP alimenta el dato", lee("src/app/ocp/(app)/kr/carga.ts").includes("evaluacionPendiente: pendientesDelCentro.has(l.id)"));
}

// ── 5. La planilla DUAL: SCA 2004 y/o CVA, distinguidos en la información (folio 11 · owner 2026-09-25) ──
{
  check("el plan pide distinguir SCA y CVA en la información", /distinguir SCA y CVA/.test(plan));
  check("el plan §10 transcribe lo que el owner fijó: SCA nativo por defecto, CVA homologado, banco comparativo con toggle", /SCA nativo significa que es la evaluación que se busca hacer por defecto/.test(plan) && /banco comparativo/.test(plan) && /toggle/.test(plan));
  check("la planilla lleva vista y escala; el vacío es SCA; la escala vieja se respeta", EMPTY_LAB_EVALUATION.escala === "sca" && EMPTY_LAB_EVALUATION.vista === "sca" && toLabEvaluation({ escala: "cva" }).escala === "cva" && toLabEvaluation({ escala: "cva" }).vista === "cva" && toLabEvaluation({ vista: "ambas" }).vista === "ambas" && toLabEvaluation({ escala: "otra" }).escala === "sca");
  check("ni la escala ni la vista cuentan como dato (una planilla vacía sigue vacía)", !labEvaluationHasData(EMPTY_LAB_EVALUATION) && !labEvaluationHasData({ ...EMPTY_LAB_EVALUATION, escala: "cva", vista: "ambas" }));
  check("el CVA tiene las OCHO secciones del SCA-104, Fragancia y Aroma aparte, en su orden", CVA_SECCIONES.length === 8 && CVA_SECCIONES.map(([k]) => k).join(",") === "fragrance,aroma,flavor,aftertaste,acidity,sweetness,mouthfeel,overall");
  check("las constantes están nombradas para cambiarlas en UN sitio, y la general ya no pesa doble", CVA.coeficiente === 0.65625 && CVA.base === 52.75 && CVA.castigoNoUniforme === 2 && CVA.castigoDefectuosa === 4 && CVA.paso === 0.25 && CVA.tazas === 5 && !("pesoImpresionGeneral" in CVA));
  check("los dos contadores de la V5.81 se reparten taza a taza al leer datos viejos", toLabEvaluation({ cva_nonuniform: "2", cva_defective: "1" }).cva_tazas.filter((t) => t.noUniforme).length === 2 && toLabEvaluation({ cva_nonuniform: "2", cva_defective: "1" }).cva_tazas.filter((t) => t.defectuosa).length === 1);
  check("el CVA no se guarda como total tecleado: sale de las secciones (cva_total = el del Punto)", !/cva_total:\s*(raw|Number\(|formData)/.test(acciones) && acciones.includes("cva_total: punto.cvaTotal"));
  check("dar de alta exige un Punto (planilla completa) y guarda su procedencia y el protocolo que rige", acciones.includes("const punto = puntoDeLaPlanilla(ev);") && acciones.includes("erroresDePlanilla(ev)") && acciones.includes("escala: protocoloDelPunto(ev),") && /^\s*punto,$/m.test(acciones) && acciones.includes("vista: ev.vista"));
  const editor = lee("src/components/bcp/LabEvalEditor.tsx");
  check("el editor tiene el conmutador de VISTA (SCA · CVA · Ambas), la fórmula y el propósito de la casa", editor.includes('type="radio" name="vista"') && editor.includes("CVA.coeficiente") && editor.includes("CVA_PROPOSITO") && editor.includes("rotuloDelPunto(punto, lang)"));
  check("y enlaza (no embebe) Defectos y el Varieties Map (folio 11)", /defectos-cafe/.test(editor) && /mapa-variedades/.test(editor) && !/<iframe/.test(editor));
}

// ── 6. La rueda: UNA taxonomía, solo ids en la base ─────────────────────────
{
  check("nueve familias de la rueda SCA / WCR", RUEDA.length === 9 && RUEDA.map((f) => f.id).join(",") === "floral,frutal,acido,verde,otros,especias,tostado,cacao,dulce"); // V5.131: el orden y los ids de la herramienta
  check("todos los descriptores tienen id único y dos idiomas", new Set(DESCRIPTORES.map((x) => x.id)).size === DESCRIPTORES.length && DESCRIPTORES.every((x) => x.es && x.en));
  check("normalizaRueda tira lo que no existe y ordena como la rueda", JSON.stringify(normalizaRueda(["frutal-bayas", "inventado", "floral", "floral", 3])) === JSON.stringify(["floral", "frutal-bayas"]));
  check("un id viejo no revienta una etiqueta", descriptorLabel("inventado") === "inventado" && descriptorLabel("cocoa", "en") === "Cocoa");
  check("la rueda se guarda normalizada (solo ids)", acciones.includes("rueda: normalizaRueda(ev.rueda)") && nominados.includes("rueda: normalizaRueda(lastEval.rueda)"));
  const rueda = lee("src/lib/catacion/rueda.ts").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  // V5.131: lo único que importa es su hoja de datos, generada de la herramienta — y esa no importa nada.
  check("rueda.ts es pura (solo importa su hoja de datos generada)", (rueda.match(/^\s*import\s.*$/gm) ?? []).every((l) => l.includes('from "./ruedaDatos"')) && !/^\s*import\s/m.test(lee("src/lib/catacion/ruedaDatos.ts")));
}

// ── 7. El veredicto del Q-Grader (2026-09-25, plan §10): la fórmula CVA, el SCA 2004 y el Punto homologado ──
// Los vectores se LEEN de la tabla del §10.2 del plan; el código se contrasta contra ella, no contra sí mismo.
{
  const s10 = plan.slice(plan.indexOf("## 10 · El Q-Grader corrobora"));
  check("el plan tiene el §10 con las seis respuestas, los vectores, R1–R8 y las seis decisiones", s10.length > 0 && /### 10\.1/.test(s10) && /### 10\.2/.test(s10) && /R1 · Origen/.test(s10) && /### 10\.4/.test(s10));
  const secciones = (vals) => Object.fromEntries(CVA_SECCIONES.map(([k], i) => [`cva_${k}`, String(vals[i])]));
  const cva = (vals, tazas = []) => {
    const ev = toLabEvaluation({ vista: "cva", escala: "cva", ...secciones(vals) });
    tazas.forEach((t, i) => (ev.cva_tazas[i] = { ...ev.cva_tazas[i], ...t }));
    return ev;
  };
  const todo = (n) => Array(8).fill(n);
  const conGeneral = (n, g) => [...Array(7).fill(n), g];
  const CASOS = {
    "Todo 9": cva(todo(9)), "Todo 8": cva(todo(8)), "Todo 7": cva(todo(7)), "Todo 6": cva(todo(6)), "Todo 5": cva(todo(5)), "Todo 1": cva(todo(1)),
    "Todo 7, una taza no uniforme": cva(todo(7), [{ noUniforme: true }]),
    "Siete 7 e Impresión general 8": cva(conGeneral(7, 8)),
    "Todo 7, una taza defectuosa": cva(todo(7), [{ defectuosa: true, defecto: "moho" }]),
    "Todo 6 e Impresión general 8": cva(conGeneral(6, 8)),
    "Todo 7 e Impresión general 5": cva(conGeneral(7, 5)),
    "Fragancia 8, Aroma 6, resto 7": cva([8, 6, 7, 7, 7, 7, 7, 7]),
  };
  const filas = [...s10.matchAll(/^\| (.+?) \| (\d) · (\d) \| [^|]+ \| ([\d.]+) \|$/gm)];
  check("el §10.2 trae los doce vectores del informe", filas.length === 12 && filas.every((f) => f[1] in CASOS));
  for (const [, caso, u, d, oficial] of filas) {
    const ev = CASOS[caso];
    if (!ev) continue;
    const r = computeCva(ev);
    check(`CVA «${caso}» = ${oficial} (u ${u} · d ${d})`, r.total === Number(oficial) && r.u === Number(u) && r.d === Number(d), `dio ${r.total} (u ${r.u} · d ${r.d})`);
  }
  check("menos de ocho secciones → Incompleto, sin puntaje", computeCva(cva([7, 7, 7, 7, 7, 7, 7, ""])).total === null && computeCva(cva([7, 7, 7, 7, 7, 7, 7, ""])).errores.some((e) => /incompleto/i.test(e)));
  // V5.135 (owner): el CVA admite cuartos de punto — 7,5 ya vale; un 10 o un 7,3 siguen siendo un error, no se recortan.
  check("un 10 o un 7,3 es un error, no se recorta; un 7,5 vale (cuartos de punto)", computeCva(cva(conGeneral(7, 10))).total === null && computeCva(cva(conGeneral(7, "7.3"))).total === null && computeCva(cva(conGeneral(7, "7.5"))).total === 89.75 && computeCva(cva(conGeneral(7, "0.75"))).total === null);
  check("una taza defectuosa sin tipo no vale; cinco defectuosas por igual no son «no uniformes»", computeCva(cva(todo(7), [{ defectuosa: true }])).total === null && computeCva(cva(todo(7), Array(5).fill({ defectuosa: true, defecto: "papa" }))).u === 0 && computeCva(cva(todo(7), Array(5).fill({ defectuosa: true, defecto: "papa" }))).d === 5);
  const sca = (extra = {}) => toLabEvaluation({ vista: "sca", sca_fragrance: "8", sca_flavor: "8", sca_aftertaste: "8", sca_acidity: "8", sca_body: "8", sca_balance: "8", sca_uniformity: "10", sca_clean_cup: "10", sca_sweetness: "10", sca_cuppers: "8", ...extra });
  check("SCA 2004: diez atributos completos dan el total; taint −2 y fault −4 por taza", computeSca2004(sca()).total === 86 && computeSca2004(sca({ sca_taint_cups: "1" })).total === 84 && computeSca2004(sca({ sca_fault_cups: "1" })).total === 82 && SCA2004.min === 6 && SCA2004.paso === 0.25);
  // V5.135 (owner): Uniformidad, Taza limpia y Dulzor se teclean como los demás (0,25), de 0 a 10 — un 7 o un 7,25 valen.
  check("SCA 2004: incompleto sin Punto; 5,5 en un escalado es un error; Uniformidad admite 7 y 7,25 pero no 7,3 ni 10,5", computeSca2004(sca({ sca_body: "" })).total === null && computeSca2004(sca({ sca_flavor: "5.5" })).total === null && computeSca2004(sca({ sca_uniformity: "7" })).total === 83 && computeSca2004(sca({ sca_uniformity: "7.25" })).total === 83.25 && computeSca2004(sca({ sca_uniformity: "7.3" })).total === null && computeSca2004(sca({ sca_uniformity: "10.5" })).total === null && computeSca2004(sca({ sca_sweetness: "0" })).total === 76);
  const homolog = [...s10.matchAll(/CVA ([\d,]+) → (?:Punto )?([\d,]+)–([\d,]+)/g)].map((m) => m.slice(1).map((x) => Number(x.replace(",", "."))));
  check("la banda sin calibrar es la del plan (79 + (CVA − 79) / k, k de 1 a 2) y reproduce sus ejemplos", homolog.length >= 2 && BANDA_SIN_CALIBRAR.pivote === 79 && BANDA_SIN_CALIBRAR.kMin === 1 && BANDA_SIN_CALIBRAR.kMax === 2 && homolog.every(([c, b, a]) => homologarCva(c).bajo === b && homologarCva(c).alto === a));
  check("R2: con las dos planillas completas rige el SCA nativo y el CVA queda registrado (banco comparativo)", (() => { const ev = toLabEvaluation({ ...sca(), ...secciones(todo(7)), vista: "ambas" }); const p = puntoDeLaPlanilla(ev); return p?.origen === "nativo" && p.valor === 86 && p.cvaTotal === 89.5 && protocoloDelPunto(ev) === "sca" && labEvaluationScore(ev) === 86; })());
  check("con «Ambas», si falta una de las dos no hay Punto; con «cva» el SCA viejo no cuenta", puntoDeLaPlanilla(toLabEvaluation({ ...sca(), vista: "ambas" })) === null && puntoDeLaPlanilla(toLabEvaluation({ ...sca(), vista: "cva" })) === null);
  check("solo CVA → Punto homologado con intervalo; rige el piso", (() => { const p = puntoDeLaPlanilla(cva(todo(7))); return p?.origen === "homologado" && p.bajo === 84.25 && p.alto === 89.5 && p.cvaTotal === 89.5 && p.modelo === "banda-k1-2" && labEvaluationScore(cva(todo(7))) === 84.25 && protocoloDelPunto(cva(todo(7))) === "cva"; })());
  // V5.160: el grado es El Punto y la Tríada — todas las decisiones llevan la tríada (aquí BBB, con surplus, y CCC, común).
  const BBB = { variedad: "B", proceso: "B", reconocimiento: "B" }, CCC = { variedad: "C", proceso: "C", reconocimiento: "C" }, BCC = { variedad: "B", proceso: "C", reconocimiento: "C" };
  check("R4/R6: el grado firme se lee del piso con la tríada y un homologado nunca da Tyrian (tope Gold); el techo se enseña", gradoFirme(puntoHomologado(89.5), BBB)?.id === "red" && techoDelPunto(puntoHomologado(89.5), BBB)?.id === "tyrian" && gradoFirme(puntoHomologado(99), BBB)?.id === "gold" && !admiteTyrian(puntoHomologado(99)) && gradoFirme(puntoNativo(89), BBB)?.id === "tyrian" && admiteTyrian(puntoNativo(89)) && techoDelPunto(puntoNativo(89), BBB) === null && gradoFirme(puntoNativo(89), CCC)?.id === "gold");
  check("R5: si el intervalo cruza los 80, pendiente de recata; si el techo no llega, sin grado; a 80 un común no entra y uno con una B sí", decidirPorPunto(puntoHomologado(80.5), CCC).tipo === "pendiente_recata" && decidirPorPunto(puntoHomologado(78), BBB).tipo === "sin_grado" && decidirPorPunto(puntoNativo(79.75), BBB).tipo === "sin_grado" && decidirPorPunto(puntoNativo(80), CCC).tipo === "sin_grado" && decidirPorPunto(puntoNativo(80), BCC).tipo === "galardon");
  check("las filas viejas de lot_evaluations son nativas; las nuevas traen su procedencia", puntoDeFila({ sca_total: 86 })?.origen === "nativo" && puntoDeFila({ sca_total: 84.25, punto: puntoHomologado(89.5) })?.origen === "homologado" && puntoDeFila({ sca_total: null }) === null);
  check("el veredicto decide por el Punto: grado firme, y «pendiente de recata» bloquea galardón y rechazo", nominados.includes("decidirPorPunto(puntoEfectivo, triada)") && (nominados.match(/pendiente_recata/g) ?? []).length >= 2 && nominados.includes("punto: puntoEfectivo,"));
  const arena = lee("src/app/bcp/(app)/arenaActions.ts");
  check("la apreciación de la Arena y «la que rige» pasan por la misma decisión", arena.includes("puntoDeLaPlanilla(evaluation)") && arena.includes("decidirPorPunto(punto, triadaDeLaFicha(") && arena.includes("puntoDeFila(ev)"));
  check("las pantallas enseñan la procedencia (nunca un homologado como un SCA catado)", pagina.includes("rotuloDelPunto") && lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx").includes("rotuloDelPunto") && lee("src/components/kaffetal-regal/panel/EvaluacionesTab.tsx").includes("Homologado desde CVA"));
  const acta = lee("docs/migraciones/2026-09-25_evaluaciones_punto_homologado.sql").replace(/^--.*$/gm, "");
  check("la base guarda la procedencia y el CVA (banco comparativo); sca_total sigue siendo lo que leen todos", /add column if not exists punto jsonb/.test(acta) && /add column if not exists cva_total numeric/.test(acta) && !/drop column sca_total/.test(acta));
  check("el propósito CVA de la casa y el presupuesto de calibración son los del plan §10.4", CVA_PROPOSITO.length > 10 && s10.includes(`«${CVA_PROPOSITO}»`) && new RegExp(`\\*\\*${LOTES_PARA_CALIBRAR} lotes catados en las dos escalas\\*\\*`).test(s10));
}

// ── 8. V5.130 (owner, 2026-10-01) · la planilla con las piezas de la Datasheet Tool, sin espacio muerto y en dos idiomas ──
{
  const editor = lee("src/components/bcp/LabEvalEditor.tsx");
  const piezas = lee("src/components/bcp/PlanillaPiezas.tsx");
  const i18n = lee("src/lib/arena/planillaI18n.ts");
  const centro = lee("src/app/socios/[partner]/panel/evaluacion/PlanillaCentro.tsx");
  check("la hoja abre con el radar vivo y el puntaje grande (la cabecera de Intrínsecos de la Datasheet Tool)", editor.includes("<RadarDeTaza ejes={ejes}") && piezas.includes("export function RadarDeTaza") && editor.includes("CLASE_LABEL[lang][clase]"));
  check("la rueda es una RUEDA sobre la taxonomía única (no una lista de botones), y se marca tocándola", editor.includes("<RuedaDeSabores elegidos={value.rueda} onToggle={toggleDescriptor}") && piezas.includes('import { RUEDA, idDeNota, rutaDe } from "@/lib/catacion/rueda";') && piezas.includes('role="checkbox"') && !editor.includes("{RUEDA.map((f) => ("));
  check("la granulometría lleva una barra por malla, el total y su estado", editor.includes("<BarraDeMalla pct={r.pct}") && editor.includes("ESTADO_DE_MALLAS[lang][mesh.state]") && editor.includes("t.totalMallas"));
  check("dos columnas donde caben: SCA y CVA lado a lado con Ambas, los pesos junto a las mallas", editor.includes("<div style={S.dosCol}>") && editor.includes("verSca && verCva ? S.dosCol") && editor.includes('gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))"') && editor.includes("style={S.pares}"));
  check("el conmutador ES · EN está en la planilla y quien la aloja puede controlarlo", editor.includes("IDIOMAS_DE_PLANILLA.map") && editor.includes("onLang ? onLang(l) : setLangPropio(l)") && centro.includes("lang={lang} onLang={setLang}"));
  check("el inglés tiene las MISMAS claves que el español (lo exige el tipo) y ningún rótulo vacío", i18n.includes("const EN: typeof ES = {") && Object.keys(PL.es).join() === Object.keys(PL.en).join() && [SCA_ATTR_LABEL, CVA_SECCION_LABEL, MALLA_LABEL].every((m) => Object.keys(m.es).join() === Object.keys(m.en).join() && Object.values(m.en).every(Boolean)));
  const conError = toLabEvaluation({ vista: "sca", sca_fragrance: "8", sca_flavor: "8", sca_aftertaste: "8", sca_acidity: "8", sca_body: "5.5", sca_balance: "8", sca_uniformity: "10", sca_clean_cup: "10", sca_sweetness: "10", sca_cuppers: "8" });
  check("los errores de la aritmética salen en el idioma pedido; sin idioma, en español como siempre", computeSca2004(conError, "en").errores.some((e) => /from 6\.00 to 10\.00/.test(e)) && computeSca2004(conError).errores.some((e) => /de 6\.00 a 10\.00/.test(e)) && computeSca2004(conError, "en").total === null);
  check("el rótulo del Punto también: nunca un homologado se lee como un SCA catado, en ninguno de los dos", rotuloDelPunto(puntoNativo(86)) === "SCA 2004 nativo 86.00" && rotuloDelPunto(puntoNativo(86), "en") === "Native SCA 2004 86.00" && /not cupped in SCA/.test(rotuloDelPunto(puntoHomologado(88), "en")) && /no catado en SCA/.test(rotuloDelPunto(puntoHomologado(88))));
  check("el idioma no toca los datos ni las fórmulas: el mismo total en los dos", computeCva(toLabEvaluation({ vista: "cva", cva_fragrance: "7", cva_aroma: "7", cva_flavor: "7", cva_aftertaste: "7", cva_acidity: "7", cva_sweetness: "7", cva_mouthfeel: "7", cva_overall: "7" }), "en").total === computeCva(toLabEvaluation({ vista: "cva", cva_fragrance: "7", cva_aroma: "7", cva_flavor: "7", cva_aftertaste: "7", cva_acidity: "7", cva_sweetness: "7", cva_mouthfeel: "7", cva_overall: "7" })).total);
  check("sigue sin embeber herramientas: las piezas son SVG nativo", !/<iframe/.test(piezas) && !/<iframe/.test(editor));
}

// ── 9. V5.131 (owner, 2026-10-01 — «deben ser iguales») · la rueda de la planilla ES la Rueda del Café del taller ──
{
  const herramienta = lee("public/tools/catacion/rueda-del-cafe-v23.html");
  const piezas = lee("src/components/bcp/PlanillaPiezas.tsx");
  const editor = lee("src/components/bcp/LabEvalEditor.tsx");
  const enDisco = lee("src/lib/catacion/ruedaDatos.ts").replace(/\r\n/g, "\n");
  check("la hoja de datos es la que sale HOY de la herramienta (si no: node scripts/build-rueda-datos.mjs)", enDisco === generarRuedaDatos());
  check("la taxonomía es la de la herramienta, nota por nota: mismos ids, nombres ES/EN, colores e iconos", JSON.stringify(RUEDA) === JSON.stringify(leerDatosDeLaHerramienta()));
  const subs = RUEDA.flatMap((f) => f.subs);
  check("nueve familias → 22 subcategorías → 85 notas", RUEDA.length === 9 && subs.length === 22 && subs.reduce((n, s) => n + s.hojas.length, 0) === 85);
  check("se marca en cualquier nivel: 116 puntos con id único (la nota lleva su subcategoría: hay familia «verde» y nota «verde»)", DESCRIPTORES.length === 116 && new Set(DESCRIPTORES.map((x) => x.id)).size === 116 && DESCRIPTORES.some((x) => x.id === "verde" && x.nivel === 1) && DESCRIPTORES.some((x) => x.id === "verde-vegetal|verde" && x.nivel === 3));
  check("una marca se lee del centro al borde, en los dos idiomas", rutaDe("frutal-citricos|lima") === "Frutal › Cítricos › Lima" && rutaDe("frutal-citricos|lima", "en") === "Fruity › Citrus Fruit › Lime" && rutaDe("floral-te|te-negro") === "Floral › Té negro" && rutaDe("dulce") === "Dulce" && familiaDe("frutal-citricos|lima")?.color === "#e2434b");
  check("los ids de la rueda resumida (V5.81–V5.130) se traducen, no se pierden", JSON.stringify(normalizaRueda(["citrus", "vanilla", "berry"])) === JSON.stringify(["frutal-bayas", "frutal-citricos", "dulce-vainilla|vainilla"]) && descriptorLabel("citrus") === "Cítricos");
  // La geometría: los mismos radios, separaciones y matices que el «GEOMETRY ENGINE» y el «RENDER» de la herramienta.
  const numero = (texto, nombre) => Number((texto.match(new RegExp(`\\b${nombre}\\s*=\\s*([0-9.]+)`)) ?? [])[1]);
  const medidas = ["R0", "R1", "R2", "R3", "OB0", "OB1", "GAP_FAM", "GAP_SUB", "GAP_LEAF"];
  check("los radios y las separaciones son los de la herramienta", medidas.every((m) => Number.isFinite(numero(piezas, m)) && numero(piezas, m) === numero(herramienta, m)), medidas.map((m) => `${m}: ${numero(piezas, m)} vs ${numero(herramienta, m)}`).join(" · "));
  check("los matices también: subcategoría +16 %, nota +34 %, banda −22 %", ["shade(fam.color, 0.16)", "shade(fam.color, 0.34)", "shade(fam.color, -0.22)"].every((x) => herramienta.includes(x)) && ["matiz(fam.f.color, 0.16)", "matiz(fam.f.color, 0.34)", "matiz(fam.f.color, -0.22)"].every((x) => piezas.includes(x)));
  check("tres anillos y la banda exterior, con el icono de la familia y los rótulos donde caben (los mismos umbrales)", piezas.includes("sector(R0, R1,") && piezas.includes("sector(R1, R2,") && piezas.includes("sector(R2, R3,") && piezas.includes("sector(OB0, OB1,") && piezas.includes("{fam.f.icono}") && piezas.includes("sub.a1 - sub.a0 > 9") && piezas.includes("hoja.a1 - hoja.a0 > 3.4") && herramienta.includes("(sub.endAngle - sub.startAngle) > 9") && herramienta.includes("(leaf.endAngle - leaf.startAngle) > 3.4"));
  check("cada marca deja su aguja, del centro al borde de su anillo (como el modo Catar)", piezas.includes("polar(blanco.radio + 16, blanco.angulo)") && herramienta.includes("polar(radius + 16, angle)") && piezas.includes('role="checkbox"'));
  check("la planilla la pinta a tamaño de lectura, con las marcas listadas por su camino", editor.includes('flex: "4 1 620px"') && editor.includes("normalizaRueda(value.rueda).map((id) => {") && editor.includes("{rutaDe(id, lang)}"));
}

// ── 10. V5.133 (owner, 2026-10-01) · cada marca de la rueda lleva su ETAPA y su INTENSIDAD, como el modo Catar ──
{
  const herramienta = lee("public/tools/catacion/rueda-del-cafe-v23.html");
  const editor = lee("src/components/bcp/LabEvalEditor.tsx");
  const obj = (o) => `{ ${ETAPAS_DE_LA_RUEDA.map((e) => `${e}:'${o[e]}'`).join(", ")} }`;
  check("las cuatro etapas son las de la herramienta, con sus rótulos en ES y EN", ETAPAS_DE_LA_RUEDA.join() === "fragancia,aroma,sabor,residual" && herramienta.includes(`cvaCheckpoints:${obj(ETAPA_LABEL.es)}`) && herramienta.includes(`cvaCheckpoints:${obj(ETAPA_LABEL.en)}`));
  check("la intensidad es la de la herramienta: 0–15 en pasos de 0,5, por defecto sabor · 10", herramienta.includes(`min="${INTENSIDAD.min}" max="${INTENSIDAD.max}" step="${INTENSIDAD.paso}"`) && herramienta.includes(`checkpoint: '${MARCA_POR_DEFECTO.etapas[0]}', intensity: ${MARCA_POR_DEFECTO.intensidad},`));
  check("las zonas también: baja < 5 ≤ media < 10 ≤ alta, con sus rótulos", zonaDeIntensidad(4.5) === "baja" && zonaDeIntensidad(5) === "media" && zonaDeIntensidad(9.5) === "media" && zonaDeIntensidad(10) === "alta" && /if\(val < 5\) return I18N\(\)\.cvaIntensityLow;\s*if\(val < 10\) return I18N\(\)\.cvaIntensityMid;/.test(herramienta) && herramienta.includes(`cvaIntensityLow:'${ZONA_LABEL.es.baja}', cvaIntensityMid:'${ZONA_LABEL.es.media}', cvaIntensityHigh:'${ZONA_LABEL.es.alta}'`) && herramienta.includes(`cvaIntensityLow:'${ZONA_LABEL.en.baja}', cvaIntensityMid:'${ZONA_LABEL.en.media}', cvaIntensityHigh:'${ZONA_LABEL.en.alta}'`));
  const ids = ["frutal-citricos|lima", "dulce"];
  const limpio = normalizaDetalle({ "frutal-citricos|lima": { etapa: "aroma", intensidad: 7.3 }, dulce: { etapa: "inventada", intensidad: 40 }, "floral-te": { etapa: "sabor", intensidad: 3 } }, ids);
  check("el detalle se limpia: UNA entrada por marca, la etapa válida o «sabor», la intensidad en la rejilla y sin pasarse", JSON.stringify(limpio) === JSON.stringify({ "frutal-citricos|lima": { etapas: ["aroma"], intensidad: 7.5, nota: "" }, dulce: { etapas: ["sabor"], intensidad: 15, nota: "" } }) && ajustaIntensidad(-3) === 0 && ajustaIntensidad("x") === 10);
  check("una marca sin detalle (evaluación anterior) toma el valor por defecto; el de un id resumido se lee con su id vigente", JSON.stringify(normalizaDetalle(null, ["dulce"])) === JSON.stringify({ dulce: { etapas: ["sabor"], intensidad: 10, nota: "" } }) && normalizaDetalle({ citrus: { etapa: "residual", intensidad: 4 } }, ["frutal-citricos"])["frutal-citricos"].etapas.join() === "residual");
  check("una marca completa se lee en una línea, en los dos idiomas", marcaLabel("frutal-citricos|lima", limpio) === "Frutal › Cítricos › Lima · Aroma · 7.5/15" && marcaLabel("dulce", limpio, "en") === "Sweet · Flavor · 15/15");
  const conMarcas = toLabEvaluation({ rueda: ["citrus", "dulce"], rueda_detalle: { citrus: { etapa: "fragancia", intensidad: 12 } } });
  check("la planilla normaliza las marcas y su detalle juntos", JSON.stringify(conMarcas.rueda) === JSON.stringify(["frutal-citricos", "dulce"]) && conMarcas.rueda_detalle["frutal-citricos"].etapas.join() === "fragancia" && conMarcas.rueda_detalle.dulce.intensidad === 10 && Object.keys(conMarcas.rueda_detalle).length === 2);
  check("una planilla vacía sigue sin datos (el `{}` del detalle no cuenta como digitado)", labEvaluationHasData(EMPTY_LAB_EVALUATION) === false && labEvaluationHasData(toLabEvaluation({})) === false && labEvaluationHasData(conMarcas) === true);
  check("el editor: tocar la marca abre las cuatro etapas y el deslizador; marcar crea el detalle y desmarcar lo borra", editor.includes("ETAPAS_DE_LA_RUEDA.map((etapa) => (") && editor.includes('type="range"') && editor.includes("max={INTENSIDAD.max}") && editor.includes("detalle[id] = detalleDe(null, id);") && editor.includes("delete detalle[id];") && editor.includes("onChange({ rueda: [...set], rueda_detalle: detalle });"));
  check("se guarda con la evaluación (Centro y «Registrar a mano») y lo leen el OCP y el Centro", acciones.includes("rueda_detalle: normalizaDetalle(ev.rueda_detalle, normalizaRueda(ev.rueda))") && nominados.includes("rueda_detalle: normalizaDetalle(lastEval.rueda_detalle, normalizaRueda(lastEval.rueda))") && lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx").includes("marcaLabel(id, normalizaDetalle(pendiente.rueda_detalle, ids))") && lee("src/app/socios/[partner]/panel/evaluacion/page.tsx").includes("marcaLabel(id, normalizaDetalle(pendiente.rueda_detalle, ids))"));
  // V5.140 (owner, 2026-10-02): una nota se resalta en UNA O VARIAS etapas y puede llevar un comentario.
  check("varias etapas: en el orden de la cata, sin repetir, y lo que no es una etapa se descarta", normalizaEtapas(["sabor", "fragancia", "sabor", "inventada"]).join() === "fragancia,sabor" && normalizaEtapas(ETAPAS_DE_LA_RUEDA).length === 4);
  check("varias etapas: nunca queda vacía (cae en «sabor») y lee la `etapa` suelta de la V5.133", normalizaEtapas([]).join() === "sabor" && normalizaEtapas(undefined, "aroma").join() === "aroma" && normalizaEtapas(["residual"], "aroma").join() === "aroma,residual");
  check("alternar una etapa la enciende o la apaga; la última encendida no se apaga", alternaEtapa(["sabor"], "fragancia").join() === "fragancia,sabor" && alternaEtapa(["fragancia", "sabor"], "sabor").join() === "fragancia" && alternaEtapa(["sabor"], "sabor").join() === "sabor");
  check("el comentario se guarda en una línea, sin espacios de sobra y con tope", limpiaNota("  a  cáscara\n de lima ") === "a cáscara de lima" && limpiaNota("x".repeat(NOTA_MAX + 50)).length === NOTA_MAX && limpiaNota(null) === "" && limpiaNota(7) === "");
  const varias = normalizaDetalle({ "frutal-citricos|lima": { etapas: ["sabor", "fragancia", "aroma"], intensidad: 8, nota: "  a cáscara " }, dulce: { etapa: "residual" } }, ids);
  check("el detalle guarda las etapas y el comentario de cada marca", JSON.stringify(varias) === JSON.stringify({ "frutal-citricos|lima": { etapas: ["fragancia", "aroma", "sabor"], intensidad: 8, nota: "a cáscara" }, dulce: { etapas: ["residual"], intensidad: 10, nota: "" } }));
  check("la marca en una línea nombra todas sus etapas y cita el comentario", marcaLabel("frutal-citricos|lima", varias) === "Frutal › Cítricos › Lima · Fragancia + Aroma + Sabor · 8/15 — «a cáscara»" && marcaLabel("dulce", varias, "en") === "Sweet · Aftertaste · 10/15" && etapasLabel(["fragancia", "residual"]) === "Fragancia + Sabor residual");
  check("el editor: las etapas son píldoras que se encienden por separado (ya no una sola)", editor.includes("aria-pressed={d.etapas.includes(etapa)}") && editor.includes("setDetalle(id, { etapas: alternaEtapa(d.etapas, etapa) })") && !editor.includes("aria-checked={d.etapa"));
  check("el editor: cada marca tiene su comentario opcional, con tope, y se lee con la marca cerrada", editor.includes("maxLength={NOTA_MAX}") && editor.includes("setDetalle(id, { nota: e.target.value.slice(0, NOTA_MAX) })") && editor.includes("{!abierta && d.nota.trim() &&"));
  check("el acta de la migración `lot_evaluations.rueda_detalle` existe", lee("docs/migraciones/2026-10-01_lot_evaluations_rueda_detalle.sql").includes("add column if not exists rueda_detalle jsonb not null default '{}'::jsonb"));
}

// ── 11. V5.135 (owner, 2026-10-01) · siete correcciones sobre la planilla del Centro de Calidad ──
{
  const editor = lee("src/components/bcp/LabEvalEditor.tsx");
  const piezas = lee("src/components/bcp/PlanillaPiezas.tsx");
  const fisicoTs = lee("src/lib/catacion/fisico.ts");
  const datasheet = lee("public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html");
  const F = await import("../src/lib/catacion/fisico.ts");

  // (a) los tres atributos por taza, como los demás.
  check("Uniformidad, Taza limpia y Dulzor se teclean igual que los demás (ya no un selector de pares)", !editor.includes("[0, 2, 4, 6, 8, 10].map") && editor.includes("min: SCA2004_POR_TAZAS.includes(key) ? 0 : SCA2004.min"));
  // (b) el CVA en cuartos.
  check("el CVA admite aumentos de 0,25", CVA.pasoSeccion === 0.25 && editor.includes("step: String(CVA.pasoSeccion)") && computeCva(toLabEvaluation({ vista: "cva", cva_fragrance: "7.25", cva_aroma: "7.25", cva_flavor: "7.25", cva_aftertaste: "7.25", cva_acidity: "7.25", cva_sweetness: "7.25", cva_mouthfeel: "7.25", cva_overall: "7.25" })).total === 90.75);
  // (c) el radar desde 0.
  check("el radar va de 0: el centro es 0, no el mínimo del formulario", piezas.includes("const fraccion = (v: number) => Math.min(1, Math.max(0, v / max));") && editor.includes("marcas={radarSca ? [2, 4, 6, 8, 10] : [3, 6, 9]}") && !/RadarDeTaza[^>]*\bmin=/.test(editor));
  // (d) taint y fault, taza a taza.
  const viejas = normalizaScaTazas(undefined, "2", "3");
  check("taint y fault se anotan taza a taza: los contadores de antes se reparten y los nuevos se derivan", JSON.stringify(contarScaTazas(viejas)) === JSON.stringify({ taint: 2, fault: 3 }) && viejas.length === 5 && JSON.stringify(contarScaTazas(normalizaScaTazas([{ estado: "taint", defecto: "moho" }, { estado: "x" }, { estado: "fault" }]))) === JSON.stringify({ taint: 1, fault: 1 }));
  const conTazas = toLabEvaluation({ vista: "sca", sca_tazas: [{ estado: "fault", defecto: "fenol" }, { estado: "taint", defecto: "" }], sca_taint_cups: "4", sca_fault_cups: "4" });
  check("las tazas mandan sobre los contadores, y la fórmula sigue leyendo los contadores", conTazas.sca_taint_cups === "1" && conTazas.sca_fault_cups === "1" && toLabEvaluation({ sca_taint_cups: "2" }).sca_tazas.filter((t) => t.estado === "taint").length === 2 && toLabEvaluation({ sca_taint_cups: "2" }).sca_taint_cups === "2");
  check("el editor: cinco tazas con limpia · taint · fault, el tipo de defecto del CVA, y una «i» para cada uno", editor.includes("value.sca_tazas.map((x, i) => (") && editor.includes("<Info texto={t.infoTaint} />") && editor.includes("<Info texto={t.infoFault} />") && (editor.match(/CVA_DEFECTOS\.map\(\(\[id\]\) => \(/g) ?? []).length === 2 && editor.includes('sca_taint_cups: n.taint ? String(n.taint) : ""') && !editor.includes('numInput("sca_taint_cups"'));
  // (e) B3: el detalle de los defectos y el color.
  check("16 defectos físicos: 6 de categoría 1 y 10 de categoría 2, con su equivalencia", F.DEFECTOS_FISICOS.length === 16 && F.DEFECTOS_FISICOS.filter((d) => d.cat === 1).length === 6 && F.DEFECTOS_FISICOS.filter((d) => d.cat === 2).length === 10);
  check("son los de la CTCx Coffee Datasheet Tool: mismas claves, categorías, equivalencias y rótulos ES/EN", F.DEFECTOS_FISICOS.every((d) => datasheet.includes(`["${d.key}",${d.cat},${d.granos}]`) && datasheet.includes(`df_${d.key}:["${d.es}","${d.en}"`)), F.DEFECTOS_FISICOS.filter((d) => !(datasheet.includes(`["${d.key}",${d.cat},${d.granos}]`) && datasheet.includes(`df_${d.key}:["${d.es}","${d.en}"`))).map((d) => d.key).join(", "));
  const cuenta = F.calcDefectos({ negro: "2", insecto_grave: "9", negro_parcial: "7", insecto_leve: "25", inventado: "9" });
  check("granos → defectos completos (solo enteros), por categoría", cuenta.cat1 === 3 && cuenta.cat2 === 4 && cuenta.total === 7 && cuenta.filas.insecto_grave.completos === 1 && cuenta.filas.negro_parcial.completos === 2 && cuenta.granos === 43);
  check("ocho colores del grano verde, los de la herramienta", F.COLORES_DEL_VERDE.length === 8 && F.COLORES_DEL_VERDE.every((c, i) => datasheet.includes(`col${i + 1}:["${c.es}","${c.en}"`)));
  check("el editor: la (R) de «Registrar detalle» en cada defecto, la tabla del detalle y el selector de color; los gramos siguen", (editor.match(/setDetalleAbierto\(detalleAbierto === cat \? null : cat\)/g) ?? []).length === 1 && editor.includes("DEFECTOS_FISICOS.filter((d) => d.cat === detalleAbierto)") && editor.includes("COLORES_DEL_VERDE.map((o) => (") && editor.includes('numInput(cat === 1 ? "fa_primary_defect" : "fa_secondary_defect")'));
  check("el detalle NO entra en el factor: la aritmética sigue con los gramos", !/defectos_detalle|fa_color/.test(lee("src/components/kaffetal-regal/ficha/fichaCalculations.ts")));
  // (f) acidez y sensación en boca.
  check("sensación en boca: cinco texturas, hasta dos; acidez: dos tipos, uno", F.TEXTURAS_EN_BOCA.length === 5 && F.MAX_TEXTURAS === 2 && F.TIPOS_DE_ACIDEZ.length === 2 && JSON.stringify(F.normalizaTexturas(["metallic", "rough", "oily", "x"])) === JSON.stringify(["rough", "oily"]) && F.TEXTURAS_EN_BOCA.every((o) => datasheet.includes(`b_${o.key}:["${o.es}","${o.en}"`)));
  check("el editor las ofrece con su intensidad 0–15, y no entran en el puntaje", editor.includes('intensidadDe("acidez_intensidad")') && editor.includes('intensidadDe("boca_intensidad")') && editor.includes("TIPOS_DE_ACIDEZ.map((o) => (") && editor.includes("value.boca_texturas.length >= MAX_TEXTURAS") && !/acidez_|boca_/.test(lee("src/lib/arena/homologacion.ts")));
  const llena = toLabEvaluation({ fa_color: "verde", defectos_detalle: { negro: "2", x: "1", agrio: "0" }, acidez_tipo: "dulce", boca_texturas: ["smooth", "oily", "rough"], acidez_intensidad: "9" });
  check("la planilla normaliza lo nuevo y una vacía sigue sin datos", llena.fa_color === "verde" && JSON.stringify(llena.defectos_detalle) === JSON.stringify({ negro: "2" }) && llena.boca_texturas.length === 2 && toLabEvaluation({ fa_color: "morado", acidez_tipo: "x" }).fa_color === "" && labEvaluationHasData(toLabEvaluation({})) === false && labEvaluationHasData(toLabEvaluation({ fa_color: "verde" })) === true && labEvaluationHasData(toLabEvaluation({ sca_tazas: [{ estado: "taint" }] })) === true);
  check("fisico.ts es puro (no importa nada)", !/^\s*import\s/m.test(fisicoTs.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
  check("todo lo nuevo está en los dos idiomas", ["tazasSca", "infoTaint", "infoFault", "color", "detalle", "thGranos", "thCompletos", "totalDefectos", "acidez", "boca", "elijaUna", "hastaDos", "sinRegistrar"].every((k) => PL.es[k] && PL.en[k]) && F.DEFECTOS_FISICOS.every((d) => d.es && d.en));
}

// ── V5.144 (owner, 2026-10-02) · borrador, código interno, comentarios, humedad del verde y la base de las mallas ───────
{
  const { computeFactor, computeMesh } = await import("../src/components/kaffetal-regal/ficha/fichaCalculations.ts");
  const { ESTADO_DE_MALLAS } = await import("../src/lib/arena/planillaI18n.ts");
  const editor = lee("src/components/bcp/LabEvalEditor.tsx").replace(/\r\n/g, "\n");
  const acta = lee("docs/migraciones/2026-10-02_evaluacion_borradores_y_codigo_interno.sql");
  const borr = cuerpoDe(acciones, "guardarBorrador"), reg = cuerpoDe(acciones, "registrarEvaluacion");

  // «Guardar y terminar más tarde»
  check("borrador: misma compuerta que el alta (credencial + módulo + bache en sus manos)", borr.includes("await identidadConModulo()") && borr.includes("await bacheEnMisManos(service, lotId, auth.identity.userId)"));
  check("borrador: uno por lote y credencial (guardar otra vez lo reemplaza)", borr.includes('.from("evaluacion_borradores").upsert(') && borr.includes('onConflict: "lot_id,account_id"') && acta.includes("primary key (lot_id, account_id)"));
  check("borrador: NO es un alta — no escribe lot_evaluations ni exige la planilla completa", !borr.includes("lot_evaluations") && !borr.includes("puntoDeLaPlanilla") && !borr.includes("labEvaluationHasData"));
  check("borrador: el alta lo borra", reg.includes('.from("evaluacion_borradores").delete().eq("lot_id", lotId).eq("account_id", identity.userId)'));
  check("borrador: la tabla es solo del service role (RLS sin políticas) y se va con el lote", acta.includes("alter table public.evaluacion_borradores enable row level security;") && !/create policy/.test(acta) && acta.includes("references public.lots(id) on delete cascade"));
  check("borrador: la página carga SOLO los de esta credencial y la planilla arranca con lo guardado", pagina.includes('.from("evaluacion_borradores").select("lot_id, planilla, notas, codigo_interno, updated_at, reference_asset_id, reference_file_name").eq("account_id", identity.userId)') && planilla.includes("borrador ? toLabEvaluation(borrador.planilla) : EMPTY_LAB_EVALUATION") && pagina.includes('key={semilla?.guardadoEl ?? "nuevo"}'));
  check("borrador: el botón existe en los dos idiomas y se enciende con cualquier dato", PLANILLA_TXT("Guardar y terminar más tarde") && PLANILLA_TXT("Save and finish later") && planilla.includes("guardarBorrador(lotId, ev, notas, codigoInterno, reporte)"));
  check("la página del Centro sigue sin leer nombres (el borrador tampoco los trae)", !/full_name|producer_id|fincas\(|ficha_variedad/.test(paginaCodigo));

  // El código interno de la muestra
  // V5.147 (owner): «arriba a la derecha, que se despliegue si se elige usarlo».
  check("código interno: arriba a la derecha del título, PLEGADO; un botón lo despliega y con borrador llega abierto", planilla.includes("{codigoAbierto ? (") && planilla.indexOf("{codigoAbierto ? (") < planilla.indexOf("<LabEvalEditor") && planilla.includes("useState(!!borrador?.codigoInterno)") && planilla.includes("onClick={() => setCodigoAbierto(true)}") && planilla.includes("{tx.codigoBoton}") && planilla.includes("maxLength={80}"));
  check("código interno: vacío se vuelve a plegar; el botón existe en los dos idiomas", planilla.includes("if (!codigoInterno.trim()) setCodigoAbierto(false);") && PLANILLA_TXT("Usar mi código interno (opcional)") && PLANILLA_TXT("Use my internal code (optional)"));
  check("código interno: viaja con el alta y con el borrador, limpio", reg.includes("codigo_interno: codigoLimpio(codigoInterno)") && borr.includes("codigo_interno: codigoLimpio(codigoInterno)") && acciones.includes('.replace(/\\s+/g, " ").trim().slice(0, 80)'));
  check("código interno: es del laboratorio — el código de CTCx sigue siendo el que identifica el lote", reg.includes("uid_anonimo: ctcLotReferenceShort(lotId)") && acta.includes("add column if not exists codigo_interno text"));
  check("código interno: lo ven el Centro en su lista y CTCx en «Lotes en Evaluación»", pagina.includes("su código:") && lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx").includes("código del laboratorio:"));

  // Comentarios y humedad del verde
  const conNotas = toLabEvaluation({ acidez_nota: "cítrica, viva", boca_nota: "x".repeat(400), b3_humedad_verde: 10.8 });
  check("comentario opcional en Acidez y en Sensación en boca, con tope", conNotas.acidez_nota === "cítrica, viva" && conNotas.boca_nota.length === 240 && toLabEvaluation({}).acidez_nota === "" && toLabEvaluation({ boca_nota: 7 }).boca_nota === "");
  check("el editor trae los dos comentarios", editor.includes('{comentarioDe("acidez_nota", t.acidez)}') && editor.includes('{comentarioDe("boca_nota", t.boca)}') && ["es", "en"].every((l) => PL[l].comentarioPh));
  check("B3 trae la humedad del VERDE además de la del pergamino (el campo de la Ficha)", conNotas.b3_humedad_verde === "10.8" && editor.includes('{numInput("b3_humedad_verde")}') && editor.includes('{numInput("fa_parch_hum")}') && PL.es.humedadVerde === "Humedad verde (%)" && reg.includes("b3_humedad_verde: ev.b3_humedad_verde"));
  check("un comentario solo ya cuenta como dato de la planilla", labEvaluationHasData(toLabEvaluation({ acidez_nota: "viva" })));

  // La base de las mallas: el trillado verde restante (los defectos ya van dentro)
  const caso = { fa_start: "250", fa_green_remainder: "207.7", fa_primary_defect: "", fa_secondary_defect: "5", mesh_supremo_plus: "39.4", mesh_supremo: "76", mesh_extra: "47", mesh_europa: "31.5", mesh_ugq: "9.8", mesh_peaberry: "3.3", mesh_residue: "" };
  const f = computeFactor(caso);
  const bien = computeMesh(caso, f.remainder), antes = computeMesh(caso, f.healthy);
  check("el caso del owner: 207,0 g de mallas contra 207,7 g de trillado verde CUADRA (residuo 0,7 g)", bien.state === "ok" && bien.residueGrams === 0.7 && Math.round(bien.totalPct) === 100, `${bien.state} · ${bien.residueGrams}`);
  check("contra el grano sano (202,7 g) ese mismo análisis salía como «las mallas pesan más» (el fallo que se arregló)", antes.state === "excede" && f.healthy === 202.7);
  check("el factor de rendimiento NO cambia: sigue sobre el grano sano", Math.round(f.yieldFactor * 100) / 100 === 86.33);
  check("la planilla y la Ficha del productor usan la MISMA base", editor.includes("const mesh = computeMesh(value, factor.remainder);") && lee("src/components/kaffetal-regal/FichaView.tsx").includes("computeMesh(data, factor.remainder)") && !editor.includes("computeMesh(value, factor.healthy)"));
  check("los avisos nombran el trillado verde restante, no el grano sano", ["es", "en"].every((l) => !/grano sano|sound beans/.test(ESTADO_DE_MALLAS[l].sin_base + ESTADO_DE_MALLAS[l].excede)) && ESTADO_DE_MALLAS.es.excede.includes("trillado verde restante"));
}

// ── V5.145 (owner, 2026-10-02) · «que la sesión del Centro de Calidad dure al menos 10 horas sin cerrarse» ─────────────
// No había un límite de tiempo: la sesión del socio vivía en la cookie COMPARTIDA de las plataformas públicas y cualquier
// otra cosa del navegador se la llevaba (una sesión asistida, Kaffetal Regal, un cierre de sesión). Ahora vive en SU
// cookie. Aquí se ejecuta la librería REAL contra el almacén de cookies REAL de Next, con Auth simulado.
{
  const { createRequire } = await import("node:module");
  const { createServerClient } = await import("@supabase/ssr");
  const { unaPorNombre } = await import("../src/lib/supabase/cookiesDeSesion.ts");
  const { ResponseCookies } = createRequire(import.meta.url)("next/dist/compiled/@edge-runtime/cookies");
  const servidor = lee("src/lib/supabase/server.ts"), proxy = lee("src/proxy.ts").replace(/\r\n/g, "\n");
  const COOKIE = /export const PARTNER_AUTH_COOKIE = "([^"]+)";/.exec(servidor)?.[1];
  const URL_SB = "https://abcdefghijklmnop.supabase.co", COMPARTIDA = "sb-abcdefghijklmnop-auth-token", DOMINIO = ".ctcexport.com";
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = (sub) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}.${Buffer.from("firma-de-prueba").toString("base64url")}`;
  const sesionDe = (sub) => ({ access_token: jwt(sub), refresh_token: `r-${sub}`, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: sub, aud: "authenticated", email: `${sub}@ctc-qa-test.co` } });
  const enCookie = (sesion) => "base64-" + Buffer.from(JSON.stringify(sesion)).toString("base64url");
  const responde = (status, cuerpo) => async () => new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });
  // El navegador en miniatura: una cookie es (nombre, dominio); Max-Age=0 la borra.
  const tarro = new Map();
  const recibe = (cabeceras) => {
    for (const h of cabeceras) {
      const [par, ...attrs] = h.split("; ");
      const name = par.slice(0, par.indexOf("=")), value = decodeURIComponent(par.slice(par.indexOf("=") + 1));
      const domain = (attrs.find((a) => a.startsWith("Domain=")) ?? "Domain=centro-calidad.ctcexport.com").slice(7);
      if (attrs.includes("Max-Age=0")) tarro.delete(`${name}|${domain}`);
      else tarro.set(`${name}|${domain}`, { name, value, maxAge: Number((attrs.find((a) => a.startsWith("Max-Age=")) ?? "Max-Age=0").slice(8)) });
    }
  };
  const envia = () => [...tarro.values()].map(({ name, value }) => ({ name, value }));
  const cliente = (nombre, fetch, salida) =>
    createServerClient(URL_SB, "anon", {
      global: { fetch },
      cookieOptions: { ...(nombre ? { name: nombre } : {}), domain: DOMINIO, path: "/" },
      cookies: { getAll: () => envia(), setAll: (lista) => { const h = new Headers(), jar = new ResponseCookies(h); unaPorNombre(lista).forEach(({ name, value, options }) => jar.set(name, value, options)); const out = h.getSetCookie(); salida?.push(...out); recibe(out); } },
    });
  const silencio = async (f) => { const w = console.warn; console.warn = () => {}; try { return await f(); } finally { console.warn = w; } };
  const tokenDe = async (nombre) => (await cliente(nombre, responde(200, {})).auth.getSession()).data.session?.user?.id ?? (await cliente(nombre, responde(200, {})).auth.getSession()).data.session?.access_token ?? null;

  await silencio(async () => {
    // (a) El socio entra: su sesión va a SU cookie, con vida de sobra para una jornada.
    const escritas = [];
    const socio = sesionDe("socio");
    await cliente(COOKIE, responde(200, socio.user), escritas).auth.setSession({ access_token: socio.access_token, refresh_token: socio.refresh_token });
    const nombres = [...tarro.values()].map((x) => x.name);
    check("socio · la cookie tiene nombre propio y no es la del panel ni la compartida", COOKIE === "ctc-socios-auth" && COOKIE !== "ctc-panel-auth" && !COOKIE.startsWith("sb-"));
    check("socio · al entrar, la sesión se escribe en SU cookie y NO en la compartida", nombres.length > 0 && nombres.every((n) => n.startsWith(COOKIE)) && !nombres.some((n) => n.startsWith("sb-")), nombres.join(","));
    check("socio · la cookie viaja a todos los subdominios y vive mucho más de 10 horas", escritas.every((h) => h.includes(`Domain=${DOMINIO}`)) && [...tarro.values()].every((x) => x.maxAge >= 10 * 3600), [...tarro.values()].map((x) => x.maxAge).join(","));
    // (b) En el MISMO navegador se abre una sesión asistida de un productor (la cookie compartida) y luego se cierra.
    tarro.set(`${COMPARTIDA}|${DOMINIO}`, { name: COMPARTIDA, value: enCookie(sesionDe("productor")), maxAge: 1 });
    await cliente(undefined, responde(403, { code: 403, error_code: "user_not_found", msg: "x" })).auth.signOut({ scope: "local" });
    check("socio · cerrar una sesión asistida (o salir de Kaffetal Regal) borra la compartida y deja la del socio", ![...tarro.values()].some((x) => x.name.startsWith("sb-")) && [...tarro.values()].some((x) => x.name.startsWith(COOKIE)));
    const quien = (await cliente(COOKIE, responde(200, {})).auth.getSession()).data.session;
    check("socio · su sesión sigue siendo la suya", quien?.access_token === socio.access_token);
    // (c) Y al revés: lo público no ve al socio (Kaffetal Regal ya no lo encuentra para cerrarlo).
    const publico = (await cliente(undefined, responde(200, {})).auth.getSession()).data.session;
    check("socio · las plataformas públicas no ven la sesión del socio", publico === null);
    // (d) El socio sale: se borra SU cookie.
    await cliente(COOKIE, responde(200, {})).auth.signOut();
    check("socio · al salir se borra su cookie", ![...tarro.values()].some((x) => x.name.startsWith(COOKIE)), [...tarro.keys()].join(","));
  });

  // Quién la usa
  const usa = (ruta) => lee(ruta).includes("createPartnerSessionClient()");
  check("socios · entrar, salir, la compuerta, cambiar la contraseña y el taller del Estudio leen la cookie del socio", ["src/app/api/socios/auth/login/route.ts", "src/app/api/socios/auth/logout/route.ts", "src/lib/partners/requirePartner.ts", "src/app/socios/[partner]/panel/actions.ts", "src/lib/coffeed/studioGate.ts"].every(usa));
  check("socios · ninguno de ellos toca ya la cookie compartida", ["src/app/api/socios/auth/login/route.ts", "src/app/api/socios/auth/logout/route.ts", "src/lib/partners/requirePartner.ts", "src/app/socios/[partner]/panel/actions.ts", "src/lib/coffeed/studioGate.ts"].every((r) => !/\bcreateSessionClient\b/.test(lee(r))));
  check("socios · la factoría pasa por `unaPorNombre` (un cierre en el servidor sí borra la cookie)", /export async function createPartnerSessionClient\(\)[\s\S]{0,520}name: PARTNER_AUTH_COOKIE[\s\S]{0,260}unaPorNombre\(cookiesToSet\)/.test(servidor));
  check("proxy · renueva la cookie del socio, y solo en las rutas de /socios", proxy.includes('if (hasPartnerCookie) await renew("ctc-socios-auth");') && proxy.includes('(rutaEfectiva === "/socios" || rutaEfectiva.startsWith("/socios/"))') && proxy.includes("if (!hasAuthCookie && !hasPanelCookie && !hasPartnerCookie) return build();"));
  const viva = lee("src/app/socios/[partner]/panel/SesionViva.tsx");
  const minutos = Number(/MINUTOS_ENTRE_LATIDOS = (\d+)/.exec(viva)?.[1]);
  check("latido · la pantalla del Centro mantiene viva la sesión (cada menos de una hora, y al volver a la pestaña)", minutos > 0 && minutos < 60 && viva.includes("latidoDeSocio()") && viva.includes('"visibilitychange"') && pagina.includes('<SesionViva acceso="/socios/centro-calidad/acceso" />'));
  check("latido · si la sesión se cerró, avisa sin perder lo digitado; un corte de red no cuenta como cierre", viva.includes("Su sesión se cerró.") && viva.includes("} catch {") && lee("src/app/socios/[partner]/panel/actions.ts").includes("export async function latidoDeSocio(): Promise<{ viva: boolean }>"));
}

// ── V5.147 (owner, 2026-10-02) · el número de tazas usadas en «Defectos de taza, taza a taza» — V5.153: de 1 a 5 ───────
{
  const { TAZAS_SCA, tazasUsadas } = await import("../src/lib/arena/labEvaluation.ts");
  const editor = lee("src/components/bcp/LabEvalEditor.tsx").replace(/\r\n/g, "\n");
  check("tazas: de 1 a 5, cinco por protocolo; lo que no es un entero en rango (o más de cinco) cae a cinco", TAZAS_SCA.min === 1 && TAZAS_SCA.max === 5 && TAZAS_SCA.porDefecto === SCA2004.tazas && [["3", 3], [5, 5], ["", 5], ["0", 5], ["6", 5], ["10", 5], ["2.5", 5], [null, 5], ["x", 5]].every(([v, n]) => tazasUsadas(v) === n));
  check("tazas: una planilla anterior (sin el dato) sigue con cinco", toLabEvaluation({}).sca_num_tazas === "5" && toLabEvaluation({}).sca_tazas.length === 5 && EMPTY_LAB_EVALUATION.sca_num_tazas === "5");
  const tres = toLabEvaluation({ sca_num_tazas: "3", sca_tazas: [{ estado: "taint", defecto: "moho" }, { estado: "" }, { estado: "fault", defecto: "papa" }, { estado: "fault" }, { estado: "fault" }] });
  check("tazas: con 3 hay 3 tazas para marcar — las que sobran se quitan y los contadores salen de las que quedan", tres.sca_tazas.length === 3 && tres.sca_taint_cups === "1" && tres.sca_fault_cups === "1");
  const dos = toLabEvaluation({ sca_num_tazas: 2, sca_tazas: [{ estado: "taint" }] });
  check("tazas: con 2 hay 2 — la que falta nace limpia; una planilla de la V5.147 con 8 vuelve a cinco", dos.sca_tazas.length === 2 && dos.sca_tazas[1].estado === "" && dos.sca_taint_cups === "1" && toLabEvaluation({ sca_num_tazas: "8", sca_tazas: Array(8).fill({ estado: "taint" }) }).sca_tazas.length === 5);
  const diez = Object.fromEntries(SCA_ATTRS_KEYS().map((k) => [`sca_${k}`, "8"]));
  check("tazas: el tope de tazas con defecto es el número de tazas usadas", computeSca2004({ ...diez, sca_num_tazas: "3", sca_taint_cups: "3", sca_fault_cups: "" }).total === 80 - 6 && computeSca2004({ ...diez, sca_num_tazas: "3", sca_taint_cups: "4", sca_fault_cups: "" }).total === null && computeSca2004({ ...diez, sca_num_tazas: "4", sca_taint_cups: "", sca_fault_cups: "4" }).total === 80 - 16 && computeSca2004({ ...diez, sca_taint_cups: "", sca_fault_cups: "6" }).total === null);
  check("tazas: elegir el número no cuenta como dato (una planilla vacía sigue vacía)", labEvaluationHasData(toLabEvaluation({ sca_num_tazas: "4" })) === false);
  check("tazas: el editor trae el selector junto a «Defectos de taza» y ajusta las tazas al cambiarlo", editor.includes("{t.tazasUsadas}") && editor.includes("onChange={(e) => setNumTazas(e.target.value)}") && editor.includes("normalizaScaTazas(value.sca_tazas, undefined, undefined, n)") && PL.es.tazasUsadas === "Tazas usadas" && PL.en.tazasUsadas === "Cups used");
}

// ── V5.153 (owner, 2026-10-05) · tazas del CVA (1–5); B3 reporta factor, aw y densidad; «i» en todos los conceptos ─────
{
  const { TAZAS_CVA, tazasCvaUsadas, computeCva, factorDeLaPlanilla } = await import("../src/lib/arena/labEvaluation.ts");
  const { INFO_PLANILLA } = await import("../src/lib/arena/planillaInfo.ts");
  const editor = lee("src/components/bcp/LabEvalEditor.tsx").replace(/\r\n/g, "\n");
  check("tazas CVA: de 1 a 5, cinco por protocolo; lo demás cae a cinco", TAZAS_CVA.min === 1 && TAZAS_CVA.max === 5 && [["2", 2], [5, 5], ["", 5], ["0", 5], ["6", 5], ["x", 5]].every(([v, n]) => tazasCvaUsadas(v) === n) && EMPTY_LAB_EVALUATION.cva_num_tazas === "5");
  const dosCva = toLabEvaluation({ cva_num_tazas: "2", cva_tazas: [{ defectuosa: true, defecto: "papa" }, {}, { defectuosa: true, defecto: "papa" }] });
  check("tazas CVA: con 2 hay 2 para marcar; las que sobran se quitan y una planilla anterior sigue con cinco", dosCva.cva_tazas.length === 2 && dosCva.cva_num_tazas === "2" && toLabEvaluation({}).cva_tazas.length === 5);
  const ocho = Object.fromEntries(["fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel", "overall"].map((k) => [`cva_${k}`, "7"]));
  const papa = { noUniforme: true, defectuosa: true, defecto: "papa" };
  check("tazas CVA: u y d se cuentan sobre las tazas usadas — todas defectuosas por igual ⇒ u = 0, sea cual sea N", computeCva(toLabEvaluation({ ...ocho, cva_num_tazas: "2", cva_tazas: [papa, papa] })).u === 0 && computeCva(toLabEvaluation({ ...ocho, cva_num_tazas: "2", cva_tazas: [papa, papa] })).d === 2 && computeCva(toLabEvaluation({ ...ocho, cva_num_tazas: "3", cva_tazas: [papa, papa, {}] })).u === 2);
  check("tazas CVA: elegir el número no cuenta como dato; el editor trae el selector junto a las tazas", labEvaluationHasData(toLabEvaluation({ cva_num_tazas: "3" })) === false && editor.includes("onChange={(e) => setNumTazasCva(e.target.value)}") && editor.includes("normalizaTazas(value.cva_tazas, undefined, undefined, n)"));
  // B3: lo que el laboratorio reporta
  const conPesos = toLabEvaluation({ fa_start: "250", fa_green_remainder: "200", b3_factor_reportado: "88.5" });
  check("B3: factor, aw y densidad están en la planilla; el factor derivado de los pesos manda y el reportado vale sin pesos", "b3_factor_reportado" in EMPTY_LAB_EVALUATION && "b3_actividad_agua" in EMPTY_LAB_EVALUATION && "b3_densidad_verde" in EMPTY_LAB_EVALUATION && factorDeLaPlanilla(conPesos) === 87.5 && factorDeLaPlanilla(toLabEvaluation({ b3_factor_reportado: "88,5" })) === 88.5 && factorDeLaPlanilla(toLabEvaluation({ b3_factor_reportado: "-1" })) === null && factorDeLaPlanilla(toLabEvaluation({})) === null);
  check("B3: el editor pide los tres (aw al milésimo, densidad entera, factor al centésimo) y enseña el factor que vale", editor.includes('numInput("b3_actividad_agua", { step: "0.001", max: 1 })') && editor.includes('numInput("b3_densidad_verde", { step: "1" })') && editor.includes('numInput("b3_factor_reportado", { step: "0.01" })') && editor.includes("const factorQueVale = factorDeLaPlanilla(value);") && editor.includes("{factorQueVale !== null ? factorQueVale.toFixed(2)"));
  const acciones = lee("src/app/socios/[partner]/panel/evaluacionActions.ts");
  check("B3: el alta del Centro guarda los tres en `physical_data` y `factor_rendimiento` es el que vale; CTCx y la Arena igual", acciones.includes("b3_factor_reportado: ev.b3_factor_reportado") && acciones.includes("b3_actividad_agua: ev.b3_actividad_agua") && acciones.includes("b3_densidad_verde: ev.b3_densidad_verde") && acciones.includes("factor_rendimiento: factorDeLaPlanilla(ev)") && lee("src/app/ocp/(app)/nominadosActions.ts").includes("factor_rendimiento: factorDeLaPlanilla(lastEval)") && lee("src/app/bcp/(app)/arenaActions.ts").includes("factor_rendimiento: factorDeLaPlanilla(evaluation)"));
  // «i» en todos los conceptos: los textos son los de la herramienta (generados) y cada concepto de la hoja lleva el suyo
  const claves = [...editor.matchAll(/info\("([a-z_]+)"\)|info\(`([a-z_]+)\$\{key\}` as ClaveDeInfo\)/g)].map((m) => m[1] ?? m[2]);
  const fijas = claves.filter((k) => !k.endsWith("_"));
  check("«i»: la planilla trae un botón por concepto — vista, escalas, atributos, tazas, puntajes, rueda, acidez, boca, perfil y todo B3", ["dif", "sca_esc", "sca_def", "sca_punt", "cva_dos", "cva_aff", "cva_tazas", "cva_punt", "rueda", "cva_acidez", "cva_textura", "perfil", "f_factor", "f_muestra", "f_hum", "f_aw", "f_dens", "f_def", "f_color", "f_factor_rep", "f_mallas"].every((k) => fijas.includes(k)) && claves.includes("sca_") && claves.includes("sec_"), fijas.join(","));
  check("«i»: cada clave usada existe en el catálogo, en los dos idiomas, con título, texto y norma", fijas.every((k) => ["es", "en"].every((l) => INFO_PLANILLA[l][k] && INFO_PLANILLA[l][k].titulo && INFO_PLANILLA[l][k].texto.length > 40 && INFO_PLANILLA[l][k].std)) && ["fragrance", "flavor", "aftertaste", "acidity", "body", "balance", "uniformity", "clean_cup", "sweetness", "cuppers"].every((k) => INFO_PLANILLA.es[`sca_${k}`]) && ["fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel", "overall"].every((k) => INFO_PLANILLA.en[`sec_${k}`]));
  check("«i»: los textos son texto plano (sin HTML) y la pieza enseña título y norma", Object.values(INFO_PLANILLA.es).every((x) => !/<[a-z]/i.test(x.texto)) && lee("src/components/bcp/PlanillaPiezas.tsx").includes("{titulo && <b style={{ display: \"block\", marginBottom: 3 }}>{titulo}</b>}"));
}

// ── V5.148 (owner, 2026-10-02) · la planilla del Centro de Calidad no enseña el grado (depende también de B1) ──────────────
{
  const editor = lee("src/components/bcp/LabEvalEditor.tsx").replace(/\r\n/g, "\n");
  const uso = (ruta) => lee(ruta).split("\n").filter((l) => l.includes("<LabEvalEditor "));
  const centro = uso("src/app/socios/[partner]/panel/evaluacion/PlanillaCentro.tsx");
  const deCtcx = [...uso("src/app/ocp/(app)/nominados/NominadosClient.tsx"), ...uso("src/app/bcp/(app)/arena/ArenaClient.tsx")];
  check("grado: el editor lo oculta a pedido — ni «grado firme» ni «sin grado»; el Punto que rige se sigue enseñando", editor.includes("ocultaGrado = false,") && editor.includes('{!ocultaGrado && decision?.tipo === "galardon" && (') && editor.includes('{!ocultaGrado && decision?.tipo === "sin_grado" &&') && editor.includes("{t.puntoQueRige}: <b"));
  check("grado: la planilla del Centro de Calidad lo pide oculto", centro.length === 1 && centro[0].includes(" ocultaGrado "));
  check("grado: CTCx («Registrar a mano» y el informe del Centro, V5.155) y la Arena lo siguen viendo", deCtcx.length === 3 && deCtcx.every((l) => !l.includes("ocultaGrado")));
}

// ── V5.151 (owner, 2026-10-05) · el reporte ORIGINAL del Q-Grader, adjunto a la evaluación (opcional) ──────────────────
// «En cada evaluación de Lote, la opción de agregar un archivo adjunto… en su propio formato institucional (opcional).
// También si se registra desde OCP.»
{
  const { motivoDeRechazo, reporteDeFila, REPORTE_MAX_BYTES } = await import("../src/lib/evaluaciones/reporteReglas.ts");
  const { rutaDeReporte, columnasDeReporte } = await import("../src/lib/evaluaciones/reporte.ts");
  const pdf = { fileName: "Reporte SCA 2026-0147.pdf", mime: "application/pdf", size: 350_000 };
  check("reporte: acepta PDF, imagen y Office; rechaza vacío, pesado y otros tipos", motivoDeRechazo(pdf) === null && motivoDeRechazo({ fileName: "foto.heic", mime: "", size: 10 }) === null && motivoDeRechazo({ fileName: "hoja.xlsx", mime: "", size: 10 }) === null && motivoDeRechazo({ ...pdf, size: 0 }) !== null && motivoDeRechazo({ ...pdf, size: REPORTE_MAX_BYTES + 1 }) !== null && motivoDeRechazo({ fileName: "virus.exe", mime: "application/octet-stream", size: 10 }) !== null);
  check("reporte: la ruta en Storage es POR LOTE (la evaluación es a ciegas) y con nombre seguro", /^evaluaciones\/L1\/q-grader\/\d+-Reporte_SCA_2026-0147\.pdf$/.test(rutaDeReporte("L1", "Reporte SCA 2026-0147.pdf")));
  check("reporte: las columnas van juntas (asset + nombre) y sin adjunto quedan en null", columnasDeReporte({ assetId: "A", fileName: "  r.pdf " }).reference_file_name === "r.pdf" && columnasDeReporte(null).reference_asset_id === null && reporteDeFila({ reference_asset_id: "A", reference_file_name: null })?.fileName === "Reporte del Q-Grader" && reporteDeFila({ reference_asset_id: null }) === null);
  const lib = lee("src/lib/evaluaciones/reporte.ts").replace(/\r\n/g, "\n");
  check("reporte: registrar comprueba que el objeto EXISTA en Storage y que la ruta sea del lote", lib.includes('if (!args.path.startsWith(prefijo) || args.path.includes(".."))') && lib.includes(".list(prefijo.slice(0, -1), { search: nombre, limit: 5 })") && lib.includes("lista?.some((o) => o.name === nombre)"));
  const accionesCentro = lee("src/app/socios/[partner]/panel/evaluacionActions.ts").replace(/\r\n/g, "\n");
  const trasCompuerta = (nombre) => { const i = accionesCentro.indexOf(`export async function ${nombre}(`); const cuerpo = accionesCentro.slice(i, accionesCentro.indexOf("\n}\n", i)); return cuerpo.includes("identidadConModulo()") && cuerpo.includes("bacheEnMisManos(service, lotId, auth.identity.userId)"); };
  check("centro: firmar y registrar el reporte pasan por la credencial Y el bache en sus manos", trasCompuerta("prepararReporteQGrader") && trasCompuerta("confirmarReporteQGrader"));
  check("centro: el alta y el borrador guardan el adjunto (asset + nombre)", accionesCentro.includes("registrarEvaluacion(lotId: string, raw: LabEvaluation, notas: string, codigoInterno = \"\", reporte: ReporteAdjunto | null = null)") && (accionesCentro.match(/\.\.\.columnasDeReporte\(reporte\)/g) ?? []).length === 2);
  check("centro: la planilla monta el adjunto compartido con sus dos acciones, en los dos idiomas, y el borrador lo trae de vuelta", planilla.includes("<AdjuntoReporteQGrader") && planilla.includes("preparar={(meta) => prepararReporteQGrader(lotId, meta)}") && planilla.includes("confirmar={(path, meta) => confirmarReporteQGrader(lotId, path, meta)}") && planilla.includes("lang={lang}") && planilla.includes("useState<ReporteAdjunto | null>(borrador?.reporte ?? null)") && planilla.includes("registrarEvaluacion(lotId, ev, notas, codigoInterno, reporte)"));
  check("centro: la página enseña el reporte del alta con URL firmada", pagina.includes("urlsDeReportes(service, evaluaciones.map((e) => e.reference_asset_id))") && pagina.includes("reporte: reporteDeFila(b)") && pagina.includes('rel="noopener noreferrer">{rep.fileName}</a>'));
  const pieza = lee("src/components/bcp/AdjuntoReporteQGrader.tsx").replace(/\r\n/g, "\n");
  check("pieza: valida antes de subir, sube con URL firmada y solo guarda {assetId, fileName}; siempre opcional", pieza.includes("const motivo = motivoDeRechazo(meta);") && pieza.includes("putSignedUrlWithProgress(prep.path, prep.token, file, up.progress)") && pieza.includes("onChange(res.reporte)") && pieza.includes("(opcional)") && pieza.includes("(optional)"));
  // V5.152 (owner): es un BOTÓN que abre el selector; el input nativo va oculto.
  check("pieza: se ve como un botón (abre el selector de archivos; el input nativo está oculto)", pieza.includes("onClick={() => input.current?.click()}") && pieza.includes('style={{ display: "none" }}') && pieza.includes("📎 ${t.boton}"));
  // OCP: lo mismo desde «Registrar a mano»
  const ocpAcc = lee("src/app/ocp/(app)/nominadosActions.ts").replace(/\r\n/g, "\n");
  const ocpUi = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx").replace(/\r\n/g, "\n");
  check("ocp: firmar y registrar son acciones `emite`; la planilla a mano lleva su adjunto y pasa a `lot_evaluations` al galardonar", ocpAcc.includes("export async function prepararReporteQGraderOcp(") && ocpAcc.includes("export async function confirmarReporteQGraderOcp(") && ocpAcc.includes("addSondeoEvaluation(lotId: string, evaluation: LabEvaluation, reporte: ReporteAdjunto | null = null)") && ocpAcc.includes("reporte_asset_id: reporte.assetId, reporte_file_name: reporte.fileName") && ocpAcc.includes("...columnasDeReporte(reporteDeFila({ reference_asset_id: (lastEval as"));
  check("ocp: «Registrar a mano» monta la misma pieza y lista el adjunto de cada planilla; Lotes en Evaluación enseña el del alta del Centro", ocpUi.includes("<AdjuntoReporteQGrader") && ocpUi.includes("preparar={(meta) => prepararReporteQGraderOcp(lotId, meta)}") && ocpUi.includes("addSondeoEvaluation(lotId, ev, reporte)") && ocpUi.includes("{adjunto && <> · 📎 {adjunto}</>}") && lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx").includes("{enlaceDeReporte(pendiente)}"));
}

// ── V5.154 (owner, 2026-10-06) · % de almendra defectuosa (derivado); la «i» en la R; la broca de primera ──────────────
{
  const { computeFactor } = await import("../src/components/kaffetal-regal/ficha/fichaCalculations.ts");
  const { INFO_PLANILLA } = await import("../src/lib/arena/planillaInfo.ts");
  const editor = lee("src/components/bcp/LabEvalEditor.tsx").replace(/\r\n/g, "\n");
  const f = computeFactor({ fa_start: "250", fa_green_remainder: "207.7", fa_primary_defect: "2.3", fa_secondary_defect: "3" });
  check("almendra defectuosa: (primarios + secundarios) ÷ verde restante × 100; sin verde, nada; nunca pasa de 100", Math.abs(f.defectivePct - 2.5518) < 0.001 && computeFactor({ fa_start: "250", fa_green_remainder: "", fa_primary_defect: "2", fa_secondary_defect: "" }).defectivePct === null && computeFactor({ fa_start: "250", fa_green_remainder: "10", fa_primary_defect: "20", fa_secondary_defect: "" }).defectivePct === 100);
  check("almendra defectuosa: el editor la enseña derivada, junto al grano sano", editor.includes("{t.almendraDefectuosa} {info(\"f_def\")}") && editor.includes("factor.defectivePct != null ? factor.defectivePct.toFixed(1)") && PL.es.almendraDefectuosa === "% de almendra defectuosa" && PL.en.almendraDefectuosa === "% defective beans");
  // V5.156 (owner): «las "i" debían estar para cada tipo de defecto, en frente de ellos, no doble» — una por defecto en el detalle.
  check("defectos: una «i» en frente de CADA defecto del detalle (def_<clave>, en el catálogo, ES/EN), y ninguna doble junto a la R", editor.includes('{d[lang]} {info(`def_${d.key}` as ClaveDeInfo)}') && !editor.includes('{info("f_registro")}') && (await import("../src/lib/catacion/fisico.ts")).DEFECTOS_FISICOS.every((d) => INFO_PLANILLA.es[`def_${d.key}`]?.texto.length > 40 && INFO_PLANILLA.en[`def_${d.key}`]?.titulo));
  const F = await import("../src/lib/catacion/fisico.ts");
  const datasheet = lee("public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html");
  const primarios = F.DEFECTOS_FISICOS.filter((d) => d.cat === 1);
  check("la broca va de primera en los primarios, con su nombre, en la plataforma y en la herramienta", primarios[0].key === "insecto_grave" && primarios[0].es === "Daño por insecto grave (Broca)" && /borer/.test(primarios[0].en) && datasheet.includes('["insecto_grave",1,5],["negro",1,1]') && datasheet.includes('df_insecto_grave:["Daño por insecto grave (Broca)"'));
}

// ── V5.155 (owner, 2026-10-06) · el OCP abre el informe del Centro (solo lectura) antes de decidir; el Centro tiene dos
//    pestañas (Baches en Fila · Baches completados) con baches desplegables ────────────────────────────────────────────
{
  const ocpUi = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx").replace(/\r\n/g, "\n");
  const vista = lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx").replace(/\r\n/g, "\n");
  check("ocp · el alta pendiente abre el INFORME: la planilla completa, deshabilitada, con código interno y reporte adjunto", ocpUi.includes("Abrir el informe del Centro y decidir…") && ocpUi.includes("<LabEvalEditor value={alta.planilla} onChange={() => {}} disabled />") && ocpUi.includes("Ver la planilla completa (solo lectura)") && vista.includes("planilla: toLabEvaluation(pendiente.physical_data?.planilla)") && vista.includes("codigo_interno, reference_asset_id, reference_file_name, physical_data"));
  check("ocp · desde el informe se confirma (galardonar / no supera) o se devuelve al Centro con una nota", ocpUi.includes("Enviar de vuelta al Centro para revisión") && ocpUi.includes('placeholder="Nota para el Centro: qué revisar"') && ocpUi.includes("devolverEvaluacionAlCentro(alta.id, motivo)") && ocpUi.includes('centroEvaluationId: alta.id'));
  const pestanas = lee("src/app/socios/[partner]/panel/evaluacion/PestanasDeBaches.tsx");
  check("centro · dos pestañas: Baches en Fila · Baches completados; cada bache es un bloque desplegable", pestanas.includes('"Baches en Fila"') && pestanas.includes('"Baches completados"') && pagina.includes("<PestanasDeBaches enFila={pinta(enFila, true)} completados={pinta(completados, false)}") && pagina.includes("<details key={b.id}") && pagina.includes("<summary"));
  check("centro · completado = todos los lotes dados de alta y confirmados (ninguno sigue en sondeo) o cerrado por CTC; la página carga también los cerrados", pagina.includes('b.status === "cerrado" || (lotesDe(b).length > 0 && lotesDe(b).every((l) => l.phase !== "sondeo"))') && pagina.includes('.in("status", ["en_centro", "cerrado"])'));
}

// ── V5.157 (owner, 2026-10-06) · el informe del OCP trae el B1 del lote (Ficha completa) y el Punto sobre la franja de grados
{
  const ocpUi = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx").replace(/\r\n/g, "\n");
  const vista = lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx").replace(/\r\n/g, "\n");
  check("informe · el B1 del lote viaja al informe (finca, variedades con proceso, especie, altitud, humedad, densidad, aw, factor y puntaje del productor)", vista.includes("const b1DelLote = (l: LotJoin) => {") && vista.includes("b1={b1DelLote(i.lot!)}") && ["finca", "variedades", "especie", "altitud", "humedad", "densidad", "aw", "factorProductor", "puntajeEstimado", "noLoSabe"].every((k) => ocpUi.includes(`b1.${k}`)) && ocpUi.includes("B1 · Variedades & Caracterización básica (lo que declaró el productor)"));
}

// ── V5.158 (owner, 2026-10-06) · el informe trae la Ficha completa (todos los datos) y la tríada A·B·C del lote ─────────
{
  const { triadaDeLaFicha, nivelDeVariedad, nivelDeProceso, nivelDeReconocimiento } = await import("../src/lib/pvc/triadaDelLote.ts");
  const { letras, puntosCtc } = await import("../src/lib/pvc/escala.ts");
  check("tríada · variedad: catálogo semilla con sinónimos — Gesha A · Maragogipe B · Castillo (General) C · Bourbon Rosado B · desconocida null", nivelDeVariedad("Gesha") === "A" && nivelDeVariedad("Maragogipe") === "B" && nivelDeVariedad("Castillo (General)") === "C" && nivelDeVariedad("Bourbon Rosado") === "B" && nivelDeVariedad("Variedad Inventada XYZ") === null);
  check("tríada · proceso: Lavado C · Honey/Natural B · fermentación anaeróbica A · infusión B", nivelDeProceso("Lavado", "").nivel === "C" && nivelDeProceso("Honey", "").nivel === "B" && nivelDeProceso("Natural", "").nivel === "B" && nivelDeProceso("Honey", "Fermentación anaeróbica alcohólica").nivel === "A" && nivelDeProceso("Lavado", "Infusión de frutas").nivel === "B");
  check("tríada · reconocimiento: 0 → C, 1–3 → B, 4+ → A (una línea o «;» por premio; «·» no separa)", nivelDeReconocimiento("").nivel === "C" && nivelDeReconocimiento("Cup of Excellence 2024 · Top 10").nivel === "B" && nivelDeReconocimiento("Cup of Excellence 2024 · Top 10").por.startsWith("1 reconocimiento") && nivelDeReconocimiento("a\nb\nc").nivel === "B" && nivelDeReconocimiento("a; b; c; d").nivel === "A");
  const gesha = triadaDeLaFicha({ varieties: [{ name: "Gesha", pct: "100", base: "Lavado", special: "" }], awards: "" });
  const mezcla = triadaDeLaFicha({ varieties: [{ name: "Maragogipe", pct: "50", base: "Lavado", special: "" }, { name: "Castillo (General)", pct: "50", base: "Lavado", special: "" }], awards: "" });
  check("tríada · del lote: la variedad DOMINANTE (en empate, la primera) y su proceso; fuera del catálogo cae a C con el porqué", letras(gesha.triada) === "ACC" && letras(mezcla.triada) === "BCC" && /dominante/.test(mezcla.variedad.por) && triadaDeLaFicha({ varieties: [{ name: "Inventada", pct: "100" }] }).variedad.por.includes("catálogo semilla") && letras(triadaDeLaFicha(null).triada) === "CCC");
  check("tríada · los puntos salen de la escala (ACC a 86 ≈ 1540 × 1,0854; CCC a 86 = 1540)", puntosCtc(86, gesha.triada).puntos === Math.round(1540 * (1 + ((2500 / 1990 - 1) / 6) * 2)) && puntosCtc(86, { variedad: "C", proceso: "C", reconocimiento: "C" }).puntos === 1540);
  const ocpUi = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx").replace(/\r\n/g, "\n");
  check("informe · la Ficha Técnica COMPLETA de solo lectura (mismo renderizador que la Vista de Ficha), abierta por defecto", ocpUi.includes("<FichaCompletaLectura datasheet={ficha} />") && ocpUi.includes("const [verFicha, setVerFicha] = useState(true);") && lee("src/components/bcp/FichaCompletaLectura.tsx").includes("renderFichaHtml(data, factor, mesh, sca, varietyTotal(data)") && lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx").includes("ficha={i.lot!.datasheet ?? null}"));
  check("informe · la tríada A·B·C por parámetro, con la elegida encendida, los puntos y la MISMA curva del Modelo Económico", ocpUi.includes("<TriadaDelLote ficha={ficha} sca={alta.punto?.bajo ?? null} ajuste={ajuste} />") && lee("src/components/bcp/TriadaDelLote.tsx").includes("{NIVELES.map((n) => (") && lee("src/components/bcp/TriadaDelLote.tsx").includes('<CurvaDeEscala t={d.triada} sca={sca} puntos={r.puntos} />') && lee("src/components/panel/pvc/EscalaBoard.tsx").includes('import { CurvaDeEscala } from "./CurvaDeEscala";'));
}

// ── V5.160 (owner, 2026-10-06: «la franja SCA es OBSOLETA: retirarla de TODOS LADOS y dejar solo el Punto y la Tríada») ──
{
  const ocpUi = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx").replace(/\r\n/g, "\n");
  const tri = lee("src/components/bcp/TriadaDelLote.tsx").replace(/\r\n/g, "\n");
  const { existsSync } = await import("node:fs");
  check("informe · la franja SCA se retiró (no existe el componente ni se importa) y la tríada es LA regla del grado", !existsSync(new URL("../src/components/bcp/FranjaDeGrados.tsx", import.meta.url)) && !ocpUi.includes("FranjaDeGrados") && ocpUi.includes("El grado · El Punto y la Tríada") && !ocpUi.includes("todavía no gobierna") && !tri.includes("gradoHoy"));
  check("informe · el grado del alta se decide con la tríada de la Ficha y el botón lo dice", ocpUi.includes("const triada = triadaDeLaFicha(ficha).triada;") && ocpUi.includes("decidirPorPunto(alta.punto, triada, ajuste)") && ocpUi.includes("× tríada <span className=\"mono\">"));
  check("«Registrar a mano» previsualiza con la tríada y pasa la tríada al editor", ocpUi.includes("gradoDelLote(puntaje, triada).grado") && ocpUi.includes("triada={triada} />") && lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx").includes("ficha={i.lot!.datasheet ?? null}"));
  check("el Centro sigue sin ver el grado (ocultaGrado) y sin tríada el editor no lo deriva", lee("src/components/bcp/LabEvalEditor.tsx").includes("const decision = punto && triada ? decidirPorPunto(punto, triada) : null;"));
}

// ── V5.161 (owner, 2026-10-06) · un alta DEVUELTA se reabre con todo lo registrado (nunca con la hoja vacía) ─────────────
{
  const { separaNotasDevueltas, notasAlDevolver, MARCA_DEVOLUCION } = await import("../src/lib/evaluaciones/devolucion.ts");
  const real = "Este es un ensayo, no representa un Lote real. · Devuelta por CTC: Revisa por favor las notas de analisis";
  const sep = separaNotasDevueltas(real);
  check("devolución · las notas se separan: lo del Q-Grader vuelve a su casilla y el motivo de CTC va aparte (caso real CTC-L-0B9C1C04)", sep.notasQGrader === "Este es un ensayo, no representa un Lote real." && sep.motivo === "Revisa por favor las notas de analisis");
  const dos = notasAlDevolver(notasAlDevolver("Notas del QG", "primera"), "segunda");
  check("devolución · devolver dos veces no apila motivos dentro de las notas del Q-Grader; sin motivo, todo es del Q-Grader", separaNotasDevueltas(dos).notasQGrader === "Notas del QG" && separaNotasDevueltas(dos).motivo === "segunda" && separaNotasDevueltas("solo notas").motivo === null && notasAlDevolver(null, "x") === MARCA_DEVOLUCION + "x");
  const accion = lee("src/app/ocp/(app)/nominadosActions.ts").replace(/\r\n/g, "\n");
  const cuerpo = accion.slice(accion.indexOf("export async function devolverEvaluacionAlCentro("), accion.indexOf("\n}\n", accion.indexOf("export async function devolverEvaluacionAlCentro(")));
  check("devolución · la acción solo cambia estado, revisor y notas — no toca la planilla, el código interno ni el reporte", cuerpo.includes("notes: notasAlDevolver(row.notes, razon)") && !/physical_data|codigo_interno|reference_asset_id|sca_data|delete\(/.test(cuerpo.replace(/\/\/.*$/gm, "")));
  check("centro · un alta devuelta siembra la planilla (planilla, notas sin el motivo, código interno, reporte); si hay borrador posterior, manda el borrador", pagina.includes("const semilla = borrador ?? (devuelta ? semillaDeDevuelta(devuelta) : null);") && pagina.includes("planilla: e.physical_data?.planilla ?? {},") && pagina.includes("notas: separaNotasDevueltas(e.notes).notasQGrader || null,") && pagina.includes("codigoInterno: e.codigo_interno,") && pagina.includes("reporte: reporteDeFila(e),") && pagina.includes("reference_file_name, physical_data\")"));
  const planillaReal = { rueda: ["floral-floral|jazmin", "frutal-otras|granada"], vista: "sca", sca_fragrance: "9", sca_flavor: "7", sca_aftertaste: "8", sca_acidity: "9", sca_body: "8", sca_balance: "9", sca_uniformity: "10", sca_clean_cup: "10", sca_sweetness: "9", sca_cuppers: "8", sca_num_tazas: "3", sca_tazas: [{ estado: "taint", defecto: "papa" }, { estado: "" }, { estado: "" }], fa_start: "250", fa_green_remainder: "207.7", fa_primary_defect: "2.3", fa_secondary_defect: "3", b3_actividad_agua: "0.6", b3_densidad_verde: "780", defectos_detalle: { insecto_grave: "7", negro: "1" } };
  const reabierta = toLabEvaluation(planillaReal);
  check("centro · la planilla devuelta reabre con sus datos: atributos, tazas, rueda, B3 y detalle de defectos", labEvaluationHasData(reabierta) && reabierta.sca_fragrance === "9" && reabierta.sca_tazas.length === 3 && reabierta.sca_taint_cups === "1" && reabierta.rueda.length === 2 && reabierta.b3_densidad_verde === "780" && reabierta.defectos_detalle.insecto_grave === "7" && computeSca2004(reabierta).total != null);
}

// ── V5.162 (owner, 2026-10-06) · el log de devoluciones al final; el ajuste CTCx de hasta +100 puntos con argumento ───────
{
  const accion = lee("src/app/ocp/(app)/nominadosActions.ts").replace(/\r\n/g, "\n");
  const ocpUi = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx").replace(/\r\n/g, "\n");
  const vista = lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx").replace(/\r\n/g, "\n");
  const { AJUSTE_CTCX_MAX, AJUSTE_CTCX_JUSTIFICACION_MIN } = await import("../src/lib/pvc/escala.ts");
  check("ajuste · tope 100 puntos y argumento de al menos 30 caracteres (la base lo exige también)", AJUSTE_CTCX_MAX === 100 && AJUSTE_CTCX_JUSTIFICACION_MIN === 30 && lee("docs/migraciones/2026-10-06_evaluaciones_ajuste_ctcx.sql").includes("length(btrim(ajuste_ctcx_justificacion)) >= 30"));
  check("ajuste · el veredicto lo valida en el servidor, decide CON él y lo guarda en la evaluación que rige, con rastro", accion.includes("if (ajuste > 0 && justificacion.length < AJUSTE_CTCX_JUSTIFICACION_MIN) {") && accion.includes("const decision = decidirPorPunto(puntoEfectivo, triada, ajuste);") && accion.includes('.update(columnasAjuste).eq("id", centroRow.id)') && accion.includes('action: "ajuste_ctcx"') && accion.includes("...columnasAjuste,"));
  check("ajuste · «la que rige» de la Arena recalcula el grado con el ajuste guardado", lee("src/app/bcp/(app)/arenaActions.ts").includes("Number(ev.ajuste_ctcx_puntos ?? 0)"));
  check("ajuste · el informe: puntos 0–100, argumento obligatorio, cuánto falta al siguiente grado, y Galardonar bloqueado sin argumento", ocpUi.includes('aria-label="Puntos del ajuste CTCx"') && ocpUi.includes('aria-label="Argumento del ajuste CTCx"') && ocpUi.includes("le faltan <b>{faltan}</b> puntos") && ocpUi.includes("faltaArgumento, sinPunto: puntaje == null });") && ocpUi.includes("ajusteCtcx: { puntos: ajuste, justificacion }") && ocpUi.includes("<TriadaDelLote ficha={ficha} sca={alta.punto?.bajo ?? null} ajuste={ajuste} />"));
  check("log · al final del informe del OCP, cada devolución con su fecha y su motivo (más reciente primero)", ocpUi.includes("<LogDeDevoluciones devoluciones={devoluciones} />") && ocpUi.includes("Log · comentarios enviados de vuelta al Centro") && vista.includes('.filter((a) => a.status === "rejected")') && vista.includes("motivo: separaNotasDevueltas(a.notes).motivo") && vista.includes("reviewed_at, codigo_interno"));
  check("log · y al final de la planilla del Centro", lee("src/app/socios/[partner]/panel/evaluacion/PlanillaCentro.tsx").includes('aria-label="Log de devoluciones de CTC"') && pagina.includes("borrador={semilla} devoluciones={devoluciones} />"));
}

// ── V5.163/V5.164 (owner, 2026-10-06) · ningún botón del veredicto queda mudo; el resumen es OPCIONAL y va junto a los botones;
//    el avance (qué corre, cuánto lleva, cuánto falta) se extiende a las acciones largas de las consolas ─────────────────
{
  const ocpUi = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx").replace(/\r\n/g, "\n");
  const progreso = lee("src/components/panel/ProgresoDeAccion.tsx").replace(/\r\n/g, "\n");
  const accion = lee("src/app/ocp/(app)/nominadosActions.ts").replace(/\r\n/g, "\n");
  const informe = ocpUi.slice(ocpUi.indexOf("export function ConfirmarCentroControls("), ocpUi.indexOf("\nexport function", ocpUi.indexOf("export function ConfirmarCentroControls(") + 10));
  check("veredicto · los botones solo se deshabilitan mientras corre la acción; si falta algo, lo dicen", !/disabled=\{pending \|\| !notes\.trim\(\)/.test(ocpUi) && !/disabled=\{pending \|\| uploading \|\| !notes\.trim\(\)/.test(ocpUi) && (informe.match(/avisa\(bloqueo\)/g) ?? []).length === 2 && informe.includes("Para enviarlo de vuelta falta: escribir la nota para el Centro"));
  check("veredicto · el mensaje nombra lo que falta (Punto, puntos para Black, argumento, Q-Grader, recata) — ya NO el resumen", ocpUi.includes("function bloqueoDelVeredicto(") && ["registrar una planilla con Punto", "que los puntos lleguen a Black", "escribir el argumento del ajuste CTCx", "definir el Q-Grader del bache", "no se galardona ni se registra «No supera» sin una recata"].every((t) => ocpUi.includes(t)) && !ocpUi.includes("escribir el «Resumen del resultado»"));
  check("resumen · opcional y JUNTO a los botones (informe y «Registrar a mano»); el campo lejano se retiró", (ocpUi.match(/placeholder="Resumen para el productor \(opcional\)"/g) ?? []).length === 2 && !ocpUi.includes("<label>Resumen del resultado (el productor lo verá)</label>") && informe.indexOf('placeholder="Resumen para el productor (opcional)"') < informe.indexOf("Galardonar"));
  check("resumen · el servidor ya no lo exige: si falta, escribe uno por defecto (grado y Punto) — las mejoras IA tienen de dónde partir", !accion.includes('return { ok: false, error: "Escriba el resultado de la evaluación') && accion.includes("let cleanNotes = notes.trim();") && accion.includes("cleanNotes = `Galardonado ${grado.nombre} · ${rotuloDelPunto(puntoEfectivo)}.`;") && accion.includes("cleanNotes = `No superó la evaluación esta vez") && (accion.match(/resultCols\.sondeo_result_notes = cleanNotes;/g) ?? []).length === 2);
  check("veredicto · el mensaje y el avance salen JUSTO debajo de los botones del veredicto", informe.indexOf("No supera (reporte de mejoras, sin costo)") < informe.indexOf("<ErrorLine error={error} enCurso={enCurso} />") && informe.indexOf("<ErrorLine error={error} enCurso={enCurso} />") < informe.indexOf("Enviar de vuelta al Centro para revisión"));
  check("avance · qué corre, cuánto lleva y cuánto falta (estimado que aprende); si tarda más, lo dice", progreso.includes('role="status"') && progreso.includes("faltan ~{Math.max(1, seg(faltan))} s (estimado)") && progreso.includes("tarda más de lo habitual; sigue en curso") && progreso.includes("export function aprendeDuracion(") && progreso.includes("export function useAvance()") && progreso.includes("} finally {\n      setEnCurso(null);"));
  const conAvance = (ruta, claves) => { const f = lee(ruta); return f.includes("useAvance") && claves.every((k) => f.includes(`AVANCE.${k}`)) && f.includes("<ProgresoDeAccion enCurso={enCurso} />") || (ruta.endsWith("NominadosClient.tsx") && claves.every((k) => f.includes(`AVANCE.${k}`))); };
  check("avance · OCP: galardonar, No supera, devolver, factura, enviar al Centro, re-evaluar y mejoras IA", conAvance("src/app/ocp/(app)/nominados/NominadosClient.tsx", ["galardonar", "noSupera", "devolver", "factura", "alCentro", "reevaluar", "mejoras"]) && (ocpUi.match(/<ErrorLine error=\{error\} enCurso=\{enCurso\} \/>/g) ?? []).length >= 5);
  check("avance · OCP Fichas (escaneo IA, compilar), BCP Socios y Usuarios (correos), LCP Buzón (responder), ECP Definición de Contexto (redactar IA), Terratalento (reenviar)", conAvance("src/app/ocp/(app)/kr/FichasClient.tsx", ["escanear", "compilar"]) && conAvance("src/app/bcp/(app)/socios/SociosClient.tsx", ["invitarSocio", "reenviarSocio"]) && conAvance("src/app/bcp/(app)/usuarios/UsuariosClient.tsx", ["invitarUsuario", "reenviarUsuario", "restablecer"]) && conAvance("src/app/lcp/(app)/buzon/BuzonMail.tsx", ["responderBuzon"]) && lee("src/components/panel/direccionamiento/DefinicionDeContexto.tsx").includes("AVANCE.redactarIa") && lee("src/app/bcp/(app)/terratalento/page.tsx").includes("<EnviarConAvance progreso={AVANCE.reenviarLlamado}>"));
}

if (fallos.length) {
  console.error(`✗ qa-centro-calidad: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-centro-calidad: ${ok} comprobaciones OK, 0 fallos`);
