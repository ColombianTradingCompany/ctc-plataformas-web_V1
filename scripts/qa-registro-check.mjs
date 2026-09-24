// Guardián del REGISTRO (V5.78, fase 2 del PLAN_CIRCUITO_DEL_LOTE): el chequeo EUDR de la finca, el estado
// de las certificaciones con sus recordatorios, y la transcripción de FT2 en la vista del lote.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-registro-check.mjs
//
// GRATIS y sin red: ejercita el módulo puro y lee las fuentes.
//
// QUÉ VIGILA. Las cifras salen del folio 7 del owner (2026-09-24), transcrito en `docs/PLAN_CIRCUITO_DEL_LOTE.md`
// §0 paso 4, NO del código: «un recordatorio debe llegar de manera periódica cada semana al productor …
// después de 4 recordatorios, cualquier certificación que no sea respaldada se retira del pasaporte, el
// registro de lo que sucedió queda». Y la regla de la casa: cada movimiento deja rastro (audit + feed),
// los correos salen por el remitente único, y solo el OCP mueve el estado.

import { readFileSync } from "node:fs";
import { decidirRecordatorio, DIAS_ENTRE_RECORDATORIOS, MAX_RECORDATORIOS, respaldaClaims } from "../src/lib/registro/reglas.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const dias = (n, desde = new Date("2026-10-01T12:00:00Z")) => new Date(desde.getTime() - n * 86400000).toISOString();
const HOY = new Date("2026-10-01T12:00:00Z");

// ── 1. La regla, desde el folio: semanal, cuatro veces, luego se retira ─────
{
  check("el folio dice CADA SEMANA", DIAS_ENTRE_RECORDATORIOS === 7);
  check("y CUATRO recordatorios", MAX_RECORDATORIOS === 4);
  const base = { status: "evidencia_pedida", evidencia_pedida_at: null, recordatorios: 0, ultimo_recordatorio_at: null };
  check("una certificación declarada no se recuerda", decidirRecordatorio({ ...base, status: "declarada", evidencia_pedida_at: dias(30) }, HOY) === "nada");
  check("ni una corroborada", decidirRecordatorio({ ...base, status: "corroborada", evidencia_pedida_at: dias(30) }, HOY) === "nada");
  check("ni una retirada", decidirRecordatorio({ ...base, status: "retirada", evidencia_pedida_at: dias(30) }, HOY) === "nada");
  check("sin fecha de pedido no hay reloj", decidirRecordatorio(base, HOY) === "nada");
  check("a los 3 días de pedir: nada", decidirRecordatorio({ ...base, evidencia_pedida_at: dias(3) }, HOY) === "nada");
  check("a los 7 días de pedir: el primer recordatorio", decidirRecordatorio({ ...base, evidencia_pedida_at: dias(7) }, HOY) === "recordar");
  check("el reloj se reinicia con cada recordatorio", decidirRecordatorio({ ...base, evidencia_pedida_at: dias(20), recordatorios: 1, ultimo_recordatorio_at: dias(2) }, HOY) === "nada");
  check("tres recordatorios y una semana: el cuarto", decidirRecordatorio({ ...base, evidencia_pedida_at: dias(40), recordatorios: 3, ultimo_recordatorio_at: dias(7) }, HOY) === "recordar");
  check("cuatro recordatorios y tres días: todavía nada", decidirRecordatorio({ ...base, evidencia_pedida_at: dias(40), recordatorios: 4, ultimo_recordatorio_at: dias(3) }, HOY) === "nada");
  check("cuatro recordatorios y una semana: se retira", decidirRecordatorio({ ...base, evidencia_pedida_at: dias(40), recordatorios: 4, ultimo_recordatorio_at: dias(7) }, HOY) === "retirar");
  check("solo la corroborada respalda claims", respaldaClaims("corroborada") && !respaldaClaims("declarada") && !respaldaClaims("evidencia_pedida") && !respaldaClaims("retirada"));
}

// ── 2. El servidor de la regla: rastro en cada movimiento y correo por el remitente único ──
{
  const srv = lee("src/lib/registro/certificados.ts");
  const fn = (nombre) => {
    const i = srv.indexOf(`export async function ${nombre}(`);
    if (i < 0) return "";
    const j = srv.indexOf("\nexport async function ", i + 1);
    return srv.slice(i, j < 0 ? undefined : j);
  };
  for (const nombre of ["pedirEvidencia", "recordar", "retirar", "corroborar", "reabrir"]) {
    check(`${nombre} existe y deja rastro (audit_log + feed del productor)`, fn(nombre).includes("await rastro("));
  }
  check("el rastro escribe audit_log Y producer_comm_log", srv.includes('from("audit_log").insert') && srv.includes('from("producer_comm_log").insert'));
  for (const nombre of ["pedirEvidencia", "recordar", "retirar"]) {
    check(`${nombre} avisa por correo`, fn(nombre).includes("sendTransactionalEmail("));
  }
  check("el correo sale por el remitente único (nunca Resend directo)", srv.includes('from "@/lib/email/leadEmails"') && !/new Resend\(/.test(srv));
  check("el barrido decide con la regla pura", fn("correrRecordatorios").includes("decidirRecordatorio(") && fn("correrRecordatorios").includes('.eq("status", "evidencia_pedida")'));
  check("corroborar exige vigencia registrada", fn("corroborar").includes("valid_from") && fn("corroborar").includes("valid_to"));
  check("retirar apaga verified_by_ctc (los claims dejan de contar)", fn("retirar").includes("verified_by_ctc: false"));
}

// ── 3. Las acciones del OCP y el cron ───────────────────────────────────────
{
  const acciones = lee("src/app/ocp/(app)/certificadosActions.ts");
  for (const nombre of ["pedirEvidenciaCertificado", "corroborarCertificado", "retirarCertificado", "reabrirCertificado"]) {
    const i = acciones.indexOf(`export async function ${nombre}(`);
    const cuerpo = i < 0 ? "" : acciones.slice(i, acciones.indexOf("\n}", i));
    check(`${nombre} pide OCP · emite`, cuerpo.includes('permisoDeEscritura("ocp", "emite")'));
  }
  const cron = lee("src/app/api/cron/recordatorios/route.ts");
  check("el cron exige CRON_SECRET en producción", cron.includes("CRON_SECRET") && cron.includes('process.env.NODE_ENV === "production"') && cron.includes("Bearer ${secret}"));
  check("y corre el barrido", cron.includes("correrRecordatorios("));
  const vercel = JSON.parse(lee("vercel.json"));
  const entrada = vercel.crons.find((c) => c.path === "/api/cron/recordatorios");
  check("vercel.json lo programa", !!entrada);
  check("una vez por semana", !!entrada && /^\d+ \d+ \* \* [0-6]$/.test(entrada.schedule), entrada?.schedule);
}

// ── 4. El OCP enseña y mueve el estado; el productor no puede ───────────────
{
  const editor = lee("src/app/ocp/(app)/kr/FincaEudrEditor.tsx");
  for (const boton of ["Corroborar", "Pedir evidencia…", "Retirar…", "Reabrir"]) check(`el panel de certificaciones tiene «${boton}»`, editor.includes(boton));
  check("los rótulos de estado salen de la fuente (reglas.ts)", editor.includes("ESTADO_CERTIFICACION_LABEL[") && editor.includes('from "@/lib/registro/reglas"'));
  check("y enseña cuántos recordatorios van de cuatro", editor.includes("MAX_RECORDATORIOS"));
  const acta = lee("docs/migraciones/2026-09-24_registro_chequeo_y_certificados.sql");
  check("el acta declara el estado y sus fechas", ["status", "nota_ctc", "evidencia_pedida_at", "recordatorios", "ultimo_recordatorio_at", "retirada_at"].every((c) => acta.includes(c)));
  check("y que solo CTC mueve el estado (guard)", /guard_finca_cert_protected/.test(acta) && /INSERT fuerza status='declarada'/.test(acta));
  check("y que el chequeo EUDR es solo-CTC (guard)", acta.includes("eudr_chequeo_notas") && acta.includes("eudr_chequeo_files") && acta.includes("guard_finca_protected_columns"));
}

// ── 5. El chequeo contra bases EUDR y la transcripción de FT2 en la vista del lote ──
{
  const acciones = lee("src/app/ocp/(app)/actions.ts");
  check("updateFincaEudr guarda el chequeo (notas + adjuntos)", acciones.includes('eudr_chequeo_notas: textOrNull(formData, "eudr_chequeo_notas")') && acciones.includes("eudr_chequeo_files: [...chequeoExistentes, ...chequeoNuevos]"));
  const editor = lee("src/app/ocp/(app)/kr/FincaEudrEditor.tsx");
  check("el editor tiene el cuadro de texto y el adjunto del chequeo", editor.includes('name="eudr_chequeo_notas"') && editor.includes("chequeo_file_"));
  const fichas = lee("src/app/ocp/(app)/fichasActions.ts");
  check("la transcripción a mano existe y es la fuente «ctc»", fichas.includes("export async function crearFichaManual(") && fichas.includes('source: "ctc"'));
  check("y nunca inventa: un formulario vacío no crea ficha", fichas.includes("La ficha está vacía"));
  const cliente = lee("src/app/ocp/(app)/fichas/FichasClient.tsx");
  check("el formulario de transcripción vive en el set de fichas", cliente.includes("function FichaManualForm(") && cliente.includes("<FichaManualForm lotId={lotId} />"));
  const lote = lee("src/app/ocp/(app)/kr/LoteSeccion.tsx");
  check("la vista del lote monta el set de fichas (escáner · reporte · a mano · oficial)", lote.includes("<LotFichasCard") && lote.includes('from("lot_fichas")'));
  check("con los soportes de una sola fuente (src/lib/fichas/soportes.ts)", lote.includes('from "@/lib/fichas/soportes"') && lee("src/app/ocp/(app)/fichas/page.tsx").includes('from "@/lib/fichas/soportes"'));
}

// ── 6. V5.79 · lo que la fase 2 le tocó a Kaffetal Regal (con el sí del owner, línea en §3) ──
{
  // Folio 7: «B4 (Fotos y Video) debe suceder antes … el último paso es A5». El orden es FT · FT2 · FOTO · EUDR
  // en las TRES piezas que lo escriben: la Ficha, su navegación y la barra del lote — y en la etiqueta del OCP.
  const vista = lee("src/components/kaffetal-regal/FichaView.tsx");
  const nav = lee("src/components/kaffetal-regal/ficha/FichaNav.tsx");
  const barra = lee("src/components/kaffetal-regal/LotKanbanStepper.tsx");
  const etapas = lee("src/lib/ocp/etapas.ts");
  check("la Ficha abre B4 en el paso 2 y A5 en el 3", vista.includes('const FIRST_PANE_BY_STEP: PaneId[] = ["a1", "a3", "b4", "a5", "ficha"];'));
  check("y sus subetapas dicen lo mismo", vista.includes("b4: 2, a5: 3, ficha: 4"));
  check("las compuertas van en ese orden (fotos antes que EUDR)", vista.includes("const STAGE_READY = [ftReady, ft2Ready, fotosReady, eudrReady];"));
  check("el botón del último paso es el EUDR", vista.includes('"Completar EUDR y Enviar"') && vista.includes('"Completar Fotos y continuar"'));
  const iB4 = nav.indexOf('{ id: "b4"');
  const iA5 = nav.indexOf('{ id: "a5"');
  check("la navegación lista B4 antes que A5, con sus subetapas 2 y 3", iB4 > -1 && iA5 > iB4 && nav.includes('label: "Fotos y Video del Café", substage: 2') && nav.includes('label: "EUDR / Debida Diligencia", substage: 3'));
  check("y el rótulo de los grupos también", nav.includes('"FOTO · Fotos y video", "EUDR · Debida Diligencia", "Exportar"'));
  const iFoto = barra.indexOf('{ label: "FOTO"');
  const iEudr = barra.indexOf('{ label: "EUDR"');
  check("la barra del lote pinta FOTO en el paso 2 y EUDR en el 3", iFoto > -1 && iEudr > iFoto && barra.includes('label: "FOTO", title: "Fotos del lote (2 obligatorias) y video opcional", atStep: 2') && barra.includes('label: "EUDR", title: "Debida diligencia", atStep: 3'));
  check("y la tabla del OCP rotula los pasos igual", etapas.includes('export const PASOS_DE_LA_FICHA = ["FT", "FT2", "FOTO", "EUDR"] as const;'));
  // El productor VE el estado de cada certificación; el Pasaporte impreso no lista las retiradas.
  const modal = lee("src/components/kaffetal-regal/FincaModal.tsx");
  check("el productor ve «retirada del Pasaporte» y «CTC pidió el respaldo»", modal.includes("retirada del Pasaporte por CTC") && modal.includes("CTC pidió el respaldo"));
  check("con el conteo de recordatorios de la fuente", modal.includes("MAX_RECORDATORIOS") && modal.includes('from "@/lib/registro/reglas"'));
  const dossier = lee("src/components/kaffetal-regal/EudrDossierDoc.tsx");
  check("el Pasaporte impreso deja fuera las certificaciones retiradas", dossier.includes('c.status !== "retirada"'));
  check("y el cargador del dossier trae el estado", lee("src/lib/dossierExtras.ts").includes("verified_by_ctc, status"));
  // El dossier del lote, en dos idiomas.
  const doc = lee("src/components/kaffetal-regal/LotDossierDoc.tsx");
  const ruta = lee("src/app/kaffetal-regal/dossier/[id]/page.tsx");
  check("el dossier del lote existe en español e inglés", doc.includes("es: {") && doc.includes("en: {") && doc.includes('lang: Lang'));
  check("la ruta acepta ?lang= y exige ser el dueño", ruta.includes('sp.lang === "en"') && ruta.includes("lot.producer_id !== user.id"));
  check("solo imprime certificaciones corroboradas", ruta.includes('.eq("status", "corroborada")'));
  check("y la caracterización sale de la ficha oficial y de la evaluación que rige", ruta.includes('.eq("is_official", true)') && ruta.includes("evaluacionQueRige("));
  check("el galardón enlaza a los dos idiomas", lee("src/components/kaffetal-regal/panel/EvaluacionesTab.tsx").includes("/kaffetal-regal/dossier/${lot.id}?lang=en"));
}

if (fallos.length) {
  console.error(`✗ qa-registro: ${fallos.length} fallo(s), ${ok} OK`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-registro: ${ok} comprobaciones OK, 0 fallos`);
