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
import { RUEDA, DESCRIPTORES, normalizaRueda, descriptorLabel } from "../src/lib/catacion/rueda.ts";
import { CVA, CVA_SECCIONES, SCA2004, computeCva, computeSca2004, EMPTY_LAB_EVALUATION, labEvaluationHasData, labEvaluationScore, protocoloDelPunto, puntoDeLaPlanilla, toLabEvaluation } from "../src/lib/arena/labEvaluation.ts";
import { BANDA_SIN_CALIBRAR, CVA_PROPOSITO, LOTES_PARA_CALIBRAR, admiteTyrian, decidirPorPunto, gradoFirme, homologarCva, puntoDeFila, puntoHomologado, puntoNativo, techoDelPunto } from "../src/lib/arena/homologacion.ts";
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
  check("el editor tiene el conmutador de VISTA (SCA · CVA · Ambas), la fórmula y el propósito de la casa", editor.includes('type="radio" name="vista"') && editor.includes("CVA.coeficiente") && editor.includes("CVA_PROPOSITO") && editor.includes("rotuloDelPunto(punto)"));
  check("y enlaza (no embebe) Defectos y el Varieties Map (folio 11)", /defectos-cafe/.test(editor) && /mapa-variedades/.test(editor) && !/<iframe/.test(editor));
}

// ── 6. La rueda: UNA taxonomía, solo ids en la base ─────────────────────────
{
  check("nueve familias de la rueda SCA / WCR", RUEDA.length === 9 && RUEDA.map((f) => f.id).join(",") === "frutal,acido_fermentado,verde_vegetal,otros,tostado,especias,nuez_cacao,dulce,floral");
  check("todos los descriptores tienen id único y dos idiomas", new Set(DESCRIPTORES.map((x) => x.id)).size === DESCRIPTORES.length && DESCRIPTORES.every((x) => x.es && x.en));
  check("normalizaRueda tira lo que no existe y ordena como la rueda", JSON.stringify(normalizaRueda(["floral", "inventado", "berry", "berry", 3])) === JSON.stringify(["berry", "floral"]));
  check("un id viejo no revienta una etiqueta", descriptorLabel("inventado") === "inventado" && descriptorLabel("cocoa", "en") === "Cocoa");
  check("la rueda se guarda normalizada (solo ids)", acciones.includes("rueda: normalizaRueda(ev.rueda)") && nominados.includes("rueda: normalizaRueda(lastEval.rueda)"));
  const rueda = lee("src/lib/catacion/rueda.ts").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  check("rueda.ts es pura (no importa nada)", !/^\s*import\s/m.test(rueda));
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
  check("un 10 o un 7,5 es un error, no se recorta", computeCva(cva(conGeneral(7, 10))).total === null && computeCva(cva(conGeneral(7, "7.5"))).total === null);
  check("una taza defectuosa sin tipo no vale; cinco defectuosas por igual no son «no uniformes»", computeCva(cva(todo(7), [{ defectuosa: true }])).total === null && computeCva(cva(todo(7), Array(5).fill({ defectuosa: true, defecto: "papa" }))).u === 0 && computeCva(cva(todo(7), Array(5).fill({ defectuosa: true, defecto: "papa" }))).d === 5);
  const sca = (extra = {}) => toLabEvaluation({ vista: "sca", sca_fragrance: "8", sca_flavor: "8", sca_aftertaste: "8", sca_acidity: "8", sca_body: "8", sca_balance: "8", sca_uniformity: "10", sca_clean_cup: "10", sca_sweetness: "10", sca_cuppers: "8", ...extra });
  check("SCA 2004: diez atributos completos dan el total; taint −2 y fault −4 por taza", computeSca2004(sca()).total === 86 && computeSca2004(sca({ sca_taint_cups: "1" })).total === 84 && computeSca2004(sca({ sca_fault_cups: "1" })).total === 82 && SCA2004.min === 6 && SCA2004.paso === 0.25);
  check("SCA 2004: incompleto sin Punto; 5,5 en un escalado y 7 en Uniformidad son errores", computeSca2004(sca({ sca_body: "" })).total === null && computeSca2004(sca({ sca_flavor: "5.5" })).total === null && computeSca2004(sca({ sca_uniformity: "7" })).total === null);
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

if (fallos.length) {
  console.error(`✗ qa-centro-calidad: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-centro-calidad: ${ok} comprobaciones OK, 0 fallos`);
