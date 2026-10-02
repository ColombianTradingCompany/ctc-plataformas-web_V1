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
  check("solo de un bache en_centro asignado a ESA credencial", reg.includes('batch.status !== "en_centro"') && reg.includes("batch.centro_calidad_account_id !== identity.userId"));
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
  check("R4/R6: el grado firme se lee del piso y un homologado nunca da Tyrian (tope Gold); el techo se enseña", gradoFirme(puntoHomologado(89.5))?.id === "blue" && techoDelPunto(puntoHomologado(89.5))?.id === "tyrian" && gradoFirme(puntoHomologado(99))?.id === "gold" && !admiteTyrian(puntoHomologado(99)) && gradoFirme(puntoNativo(89))?.id === "tyrian" && admiteTyrian(puntoNativo(89)) && techoDelPunto(puntoNativo(89)) === null);
  check("R5: si el intervalo cruza los 80, pendiente de recata; si el techo no llega, sin grado", decidirPorPunto(puntoHomologado(80.5)).tipo === "pendiente_recata" && decidirPorPunto(puntoHomologado(78)).tipo === "sin_grado" && decidirPorPunto(puntoNativo(79.75)).tipo === "sin_grado" && decidirPorPunto(puntoNativo(80)).tipo === "galardon");
  check("las filas viejas de lot_evaluations son nativas; las nuevas traen su procedencia", puntoDeFila({ sca_total: 86 })?.origen === "nativo" && puntoDeFila({ sca_total: 84.25, punto: puntoHomologado(89.5) })?.origen === "homologado" && puntoDeFila({ sca_total: null }) === null);
  check("el veredicto decide por el Punto: grado firme, y «pendiente de recata» bloquea galardón y rechazo", nominados.includes("decidirPorPunto(puntoEfectivo)") && (nominados.match(/pendiente_recata/g) ?? []).length >= 2 && nominados.includes("punto: puntoEfectivo,"));
  const arena = lee("src/app/bcp/(app)/arenaActions.ts");
  check("la apreciación de la Arena y «la que rige» pasan por la misma decisión", arena.includes("puntoDeLaPlanilla(evaluation)") && arena.includes("decidirPorPunto(punto)") && arena.includes("puntoDeFila(ev)"));
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

if (fallos.length) {
  console.error(`✗ qa-centro-calidad: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-centro-calidad: ${ok} comprobaciones OK, 0 fallos`);
