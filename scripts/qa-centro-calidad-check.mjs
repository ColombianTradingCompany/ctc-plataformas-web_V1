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

import { readFileSync } from "node:fs";
import { RUEDA, DESCRIPTORES, normalizaRueda, descriptorLabel } from "../src/lib/catacion/rueda.ts";
import { CVA, CVA_SECCIONES, computeCva, EMPTY_LAB_EVALUATION, labEvaluationHasData, labEvaluationScore, toLabEvaluation } from "../src/lib/arena/labEvaluation.ts";
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
  check("sin puntaje no hay alta", reg.includes("if (puntaje == null) return"));
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

// ── 5. SCA y CVA se distinguen en la información (folio 11) ─────────────────
{
  check("el plan pide distinguir SCA y CVA en la información", /distinguir SCA y CVA/.test(plan));
  check("la planilla lleva su escala y el vacío es SCA", EMPTY_LAB_EVALUATION.escala === "sca" && toLabEvaluation({ escala: "cva" }).escala === "cva" && toLabEvaluation({ escala: "otra" }).escala === "sca");
  check("la escala no cuenta como dato (una planilla vacía sigue vacía)", !labEvaluationHasData(EMPTY_LAB_EVALUATION) && !labEvaluationHasData({ ...EMPTY_LAB_EVALUATION, escala: "cva" }));
  check("el CVA tiene las siete secciones del formulario afectivo", CVA_SECCIONES.length === 7 && CVA_SECCIONES.map(([k]) => k).join(",") === "fragrance,flavor,aftertaste,acidity,sweetness,mouthfeel,overall");
  const todo = (n) => Object.fromEntries(CVA_SECCIONES.map(([k]) => [`cva_${k}`, String(n)]));
  const nueves = { ...EMPTY_LAB_EVALUATION, escala: "cva", ...todo(9), cva_nonuniform: "", cva_defective: "" };
  const unos = { ...EMPTY_LAB_EVALUATION, escala: "cva", ...todo(1) };
  check("todo en 9 da 100 (la fórmula del SCA con la impresión general doble)", computeCva(nueves).total === 100);
  check("todo en 1 da 58, el mínimo del CVA", computeCva(unos).total === 58);
  check("cada taza no uniforme resta 2 y cada defectuosa 4", computeCva({ ...nueves, cva_nonuniform: "1" }).total === 98 && computeCva({ ...nueves, cva_defective: "1" }).total === 96);
  check("las constantes están nombradas para cambiarlas en UN sitio", CVA.coeficiente === 0.65625 && CVA.base === 52.75 && CVA.pesoImpresionGeneral === 2);
  check("labEvaluationScore usa la escala elegida", labEvaluationScore(nueves) === 100 && labEvaluationScore({ ...EMPTY_LAB_EVALUATION, ...todo(9) }) === null);
  check("el CVA no se guarda como total tecleado: sale de las secciones", !acciones.includes("cva_total"));
  const editor = lee("src/components/bcp/LabEvalEditor.tsx");
  check("el editor enseña la escala como información (radio SCA / CVA) y la fórmula", editor.includes('type="radio" name="escala"') && editor.includes("CVA.coeficiente"));
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

if (fallos.length) {
  console.error(`✗ qa-centro-calidad: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-centro-calidad: ${ok} comprobaciones OK, 0 fallos`);
