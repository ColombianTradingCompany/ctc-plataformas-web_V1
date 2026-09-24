// Guardián de LOS TÉRMINOS DEL TRATO (V5.82, fase 5 del PLAN_CIRCUITO_DEL_LOTE): `src/lib/trato/terminos.ts`.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-trato-check.mjs
//
// GRATIS y sin red: ejercita el módulo puro y lee las fuentes.
//
// QUÉ VIGILA (plan §7, riesgo 2: «un guardián copia la cifra del código y afirma en verde una regla equivocada»):
// TODAS las cifras de `terminos.ts` se comprueban contra el §0 y el §6 de `docs/PLAN_CIRCUITO_DEL_LOTE.md` —la
// transcripción de los folios del owner y sus respuestas—, NO contra el módulo. Y las reglas que ya gobiernan: el
// rechazo bajo Black es gratis, la re-evaluación va a tarifa plena con el 80 % si sube de grado, la decisión «sin
// oferta» lleva motivo, y la escalera de retiro del PVC plan (`compromiso.ts`) dice lo mismo que estos términos.

import { readFileSync } from "node:fs";
import {
  CARGA_KG, COMPRA_INICIAL_CTCX_CARGAS, DECLARACIONES, MODIFICADOR_DIRECTA_PCT, MODIFICADOR_PAST_CROP_PCT, MORA, MOQ_SUBASTA_TYRIAN_KG,
  PAST_CROP_MESES, PENALIDAD_RETIRO_PCT, PERIODO_MESES, REEVALUACION, RENOVACION_DIAS, TARIFA_EVALUACION_COP, TRAMO_LIBRE_ACUMULADO_PCT,
  VENTANA_DIRECTA_DIAS, modificadorDeOferta, minimoKg, TERMINOS_VERSION,
} from "../src/lib/trato/terminos.ts";
import { PENALIZACION, TRAMO_LIBRE_ACUMULADO, MESES_DEL_PERIODO } from "../src/lib/pvc/compromiso.ts";
import { estadoDelCircuito } from "../src/lib/ocp/circuito.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const plan = lee("docs/PLAN_CIRCUITO_DEL_LOTE.md");
const paso = (n) => plan.match(new RegExp(`^\\| ${n} \\| (.+?) \\|`, "m"))?.[1] ?? "";
const num = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));

// ── 1. Las cifras, del folio al módulo ──────────────────────────────────────
{
  check("la versión de los términos es una fecha", /^\d{4}-\d{2}-\d{2}$/.test(TERMINOS_VERSION));
  const p14 = paso(14);
  const carga = p14.match(/compra inmediata de CTCx de una carga \((\d+) kg\)/);
  check("paso 14: CTCx compra de inmediato UNA carga de 125 kg", !!carga && COMPRA_INICIAL_CTCX_CARGAS === 1 && CARGA_KG === num(carga[1]));
  check("paso 14: la oferta cubre el trimestre", /trimestre por comenzar/.test(p14) && PERIODO_MESES === 3 && MESES_DEL_PERIODO === 3);
  const p16 = paso(16);
  const tramos = p16.match(/(\d+) % de lo declarado al cerrar el mes 1 sin penalidad, otro (\d+) %[^→]*→ el mes 3 ofrece mínimo el (\d+) %/);
  check("paso 16: los tramos libres son 25 % al cerrar el mes 1 y otro 25 % al cerrar el mes 2 (50 % en el mes 3)", !!tramos && TRAMO_LIBRE_ACUMULADO_PCT[1] === 0 && TRAMO_LIBRE_ACUMULADO_PCT[2] === num(tramos[1]) && TRAMO_LIBRE_ACUMULADO_PCT[3] === num(tramos[3]));
  const pen = p16.match(/paga \*\*(\d+) % sobre el precio de cada carga\*\*/);
  check("paso 16: la penalidad de retiro es el 4 %", !!pen && PENALIDAD_RETIRO_PCT === num(pen[1]));
  const mora = p16.match(/\*\*Mora\*\*: (\d+) semanas sin cargo, (\d+) más con (\d+) %/);
  check("paso 16: mora 2 semanas sin cargo + 2 con 5 %", !!mora && MORA.semanasSinCargo === num(mora[1]) && MORA.semanasConRecargo === num(mora[2]) && MORA.recargoPct === num(mora[3]));
  const p18 = paso(18);
  const renov = p18.match(/A los ~(\d+) días CTCx ofrece \*\*renovar\*\*/);
  check("paso 18: renovación a los ~90 días", !!renov && RENOVACION_DIAS === num(renov[1]));
  const past = p18.match(/más de 3 periodos \((\d+) meses\) → \*\*PVC − (\d+) %\*\*/);
  check("paso 18: past crop a los 9 meses, −10 %", !!past && PAST_CROP_MESES === num(past[1]) && MODIFICADOR_PAST_CROP_PCT === -num(past[2]));
  const p19 = paso(19);
  const ventana = p19.match(/\*\*ventana de (\d+) días\*\*/);
  const directa = p19.match(/\*\*PVC − (\d+) %\*\*/);
  check("paso 19: la directa es PVC − 8 % con ventana de 30 días", !!ventana && !!directa && VENTANA_DIRECTA_DIAS === num(ventana[1]) && MODIFICADOR_DIRECTA_PCT === -num(directa[1]));
  check("paso 15: la declaración es por trimestre o por 30 días", /\*\*trimestre\*\*[^|]*\*\*30 días\*\*/.test(paso(15)) && DECLARACIONES.join(",") === "trimestre,30_dias");
  const tarifa = plan.match(/\*\*\$([\d.]+) COP es la tarifa plana\*\*/);
  check("respuesta 2: la tarifa plana", !!tarifa && TARIFA_EVALUACION_COP === num(tarifa[1]));
  check("folio 12 / respuesta 2: la re-evaluación va a tarifa plena con 80 % si sube de grado", /re-evaluación a tarifa plena \(\$200\.000\)\*\*, con \*\*80 % de reembolso si sube un grado\*\*/.test(paso(12)) && REEVALUACION.tarifaPlena === true && REEVALUACION.reembolsoPctSiSubeGrado === 80);
  const minimos = plan.match(/Black\/Red (\d+) cargas · Blue (\d+) cargas · Gold (\d+) kg/);
  check("respuesta 1: los mínimos por grado", !!minimos && minimoKg("black") === num(minimos[1]) * CARGA_KG && minimoKg("blue") === num(minimos[2]) * CARGA_KG && minimoKg("gold") === num(minimos[3]));
  const moq = plan.match(/MOQ de Tyrian \*\*(\d+) kg de CPS\*\*/);
  check("respuesta 3: el MOQ de la subasta Tyrian", !!moq && MOQ_SUBASTA_TYRIAN_KG === num(moq[1]));
  check("el modificador de una oferta suma directa y past crop", modificadorDeOferta({}) === 0 && modificadorDeOferta({ directa: true }) === -8 && modificadorDeOferta({ pastCrop: true }) === -10 && modificadorDeOferta({ directa: true, pastCrop: true }) === -18);
}

// ── 2. La escalera de retiro del PVC plan dice lo mismo (una regla, dos módulos) ──
{
  check("compromiso.ts (§12.9 del PVC plan) y terminos.ts coinciden en los tramos", [1, 2, 3].every((m) => TRAMO_LIBRE_ACUMULADO[m] * 100 === TRAMO_LIBRE_ACUMULADO_PCT[m]));
  check("y en la penalidad del 4 %", PENALIZACION * 100 === PENALIDAD_RETIRO_PCT);
}

// ── 3. Lo que ya gobierna: rechazo gratis, re-evaluación, decisión comercial ──
{
  const nom = lee("src/app/ocp/(app)/nominadosActions.ts");
  const verdict = nom.slice(nom.indexOf("export async function recordEvaluationVerdict("), nom.indexOf("export async function reevaluar("));
  const rechazo = verdict.slice(verdict.lastIndexOf("} else {"));
  check("el rechazo bajo Black ya NO paga cashback (folio 12: gratis, con reporte)", !rechazo.includes("cashback_cop") && rechazo.includes("generateMejorasDoc(service, lotId)"));
  check("y le cuenta al productor la re-evaluación a tarifa plena", rechazo.includes("formatCop(TARIFA_EVALUACION_COP)") && rechazo.includes("REEVALUACION.reembolsoPctSiSubeGrado"));
  check("el galardón de una re-evaluación que SUBE de grado reembolsa el 80 %", verdict.includes("REEVALUACION.reembolsoPctSiSubeGrado / 100") && verdict.includes("(ins.reevaluaciones ?? 0) > 0"));
  const reev = nom.slice(nom.indexOf("export async function reevaluar("), nom.indexOf("export async function markCashbackPaid("));
  check("reevaluar exige el acuerdo de CTCx (qué mejora aseguraría la oferta)", reev.includes("if (!acuerdo) return"));
  check("y reinicia la solicitud a tarifa plena, sin subvención, sin factura, sin muestra (por el único escritor de la marca)", ["amount_cop: TARIFA_EVALUACION_COP", "discount_pct: 0", "factura_ref: null", "anularRecibo(service, lotId, adminId", "sondeo_batch_id: null"].every((s) => reev.includes(s)));
  check("guarda lo anterior (grado y resultado previos)", reev.includes("grado_previo: lot.grade") && reev.includes("reevaluacion_previa: previa"));
  check("nunca con oferta abierta o contrato vivo", reev.includes("Este lote tiene una oferta abierta") && reev.includes("Este lote tiene un contrato vivo"));
  const ofertas = lee("src/app/ocp/(app)/ofertasActions.ts");
  const decision = ofertas.slice(ofertas.indexOf("export async function decidirNoOfertar("), ofertas.indexOf("export async function reabrirDecision("));
  check("«no ofertar» (paso 13) exige motivo y queda en la solicitud", decision.includes("if (!motivo) return") && decision.includes('decision_comercial: "sin_oferta"'));
  check("y le avisa al productor sin devolución", decision.includes('from("producer_comm_log")') && !decision.includes("reembolso"));
  const emit = ofertas.slice(ofertas.indexOf("export async function emitOffer("), ofertas.indexOf("export async function retireOffer("));
  check("emitir una oferta reabre la decisión", emit.includes("decision_comercial: null"));
  check("la oferta de temporada lleva la compra inicial de CTCx y el mínimo del grado", emit.includes("compra_inicial_kg: kind === \"temporada\" ? COMPRA_INICIAL_CTCX_CARGAS * CARGA_KG : null") && emit.includes("min_kg: ANCLADAS.includes(kind) ? minimoKg(lot.grade) : null"));
  check("la directa lleva la ventana y su vencimiento", emit.includes("ventana_dias: esDirecta ? VENTANA_DIRECTA_DIAS : null") && emit.includes("expira_at: esDirecta"));
  check("y los términos con los que nace", emit.includes("terms_version: ANCLADAS.includes(kind) ? TERMINOS_VERSION : null"));
}

// ── 4. El circuito conoce las dos salidas laterales ─────────────────────────
{
  const base = { stage: "apto", registradoPorCtc: false, tieneInscripcion: true, pagoConfirmado: true, muestraRecibida: true, enBache: false, grado: null, ultimaOferta: null, contrato: null };
  check("no superó → «no superó» (lateral, sin grado)", estadoDelCircuito({ ...base, noSupero: true }).estado === "no_supero");
  check("galardonado con «sin oferta» → sin oferta", estadoDelCircuito({ ...base, grado: "blue", sinOferta: true }).estado === "sin_oferta");
  check("pero una oferta emitida manda sobre la decisión", estadoDelCircuito({ ...base, grado: "blue", sinOferta: true, ultimaOferta: "emitida" }).estado === "oferta_emitida");
  check("y un contrato vivo también", estadoDelCircuito({ ...base, grado: "blue", sinOferta: true, contrato: "active" }).estado === "catalogo_activo");
  check("la tabla del OCP alimenta los dos datos", lee("src/app/ocp/(app)/kr/carga.ts").includes('noSupero: ins?.phase === "retirado" && ins.sondeo_result === "rechazado"') && lee("src/app/ocp/(app)/kr/carga.ts").includes('sinOferta: ins?.decision_comercial === "sin_oferta"'));
}

if (fallos.length) {
  console.error(`✗ qa-trato: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-trato: ${ok} comprobaciones OK, 0 fallos`);
