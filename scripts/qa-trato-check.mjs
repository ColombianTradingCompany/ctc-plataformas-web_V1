// Guardián de LOS TÉRMINOS DEL TRATO (V5.82, fase 5 del PLAN_CIRCUITO_DEL_LOTE): `src/lib/trato/terminos.ts` — y, desde la
// V5.84 (fase 7), de LO DERIVADO DEL TRATO (`src/lib/trato/mesAMes.ts`) y de la decisión 6 del owner.
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
import { execSync } from "node:child_process";
import { enMora, esPastCrop, mesEnCurso, moraDelMes, moraDelTrato, renovacionDebida, retiro } from "../src/lib/trato/mesAMes.ts";
import { decidirRecordatorioDeMora, MAX_RECORDATORIOS_MORA } from "../src/lib/trato/mora.ts";
import {
  CARGA_KG, COMPRA_INICIAL_CTCX_CARGAS, DECLARACIONES, MODIFICADOR_DIRECTA_PCT, MODIFICADOR_PAST_CROP_PCT, MORA,
  PAST_CROP_MESES, PENALIDAD_RETIRO_PCT, PERIODO_MESES, REEVALUACION, RENOVACION_DIAS, TARIFA_EVALUACION_COP, TRAMO_LIBRE_ACUMULADO_PCT,
  VENTANA_DIRECTA_DIAS, modificadorDeOferta, minimoKg, TERMINOS_VERSION,
} from "../src/lib/trato/terminos.ts";
import { PENALIZACION, TRAMO_LIBRE_ACUMULADO, MESES_DEL_PERIODO } from "../src/lib/pvc/compromiso.ts";
import { estadoDelCircuito } from "../src/lib/ocp/circuito.ts";
import { simularTrato } from "../src/lib/trato/simulador.ts";

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
  check("paso 15: la declaración es por trimestre o por 30 días (y, desde la V5.169, «Ahora y Siguiente»)", /\*\*trimestre\*\*[^|]*\*\*30 días\*\*/.test(paso(15)) && DECLARACIONES.join(",") === "trimestre,30_dias,ahora_y_siguiente");
  const tarifa = plan.match(/\*\*\$([\d.]+) COP es la tarifa plana\*\*/);
  check("respuesta 2: la tarifa plana", !!tarifa && TARIFA_EVALUACION_COP === num(tarifa[1]));
  check("folio 12 / respuesta 2: la re-evaluación va a tarifa plena con 80 % si sube de grado", /re-evaluación a tarifa plena \(\$200\.000\)\*\*, con \*\*80 % de reembolso si sube un grado\*\*/.test(paso(12)) && REEVALUACION.tarifaPlena === true && REEVALUACION.reembolsoPctSiSubeGrado === 80);
  const minimos = plan.match(/Black\/Red (\d+) cargas · Blue (\d+) cargas · Gold (\d+) kg/);
  check("respuesta 1: los mínimos por grado", !!minimos && minimoKg("black") === num(minimos[1]) * CARGA_KG && minimoKg("blue") === num(minimos[2]) * CARGA_KG && minimoKg("gold") === num(minimos[3]));
  check("Tyrian no tiene mínimo (owner, 2026-09-30): ni en terminos.ts ni en el plan", minimoKg("tyrian") === null && !/MOQ_SUBASTA_TYRIAN_KG/.test(lee("src/lib/trato/terminos.ts")) && /Tyrian sin mínimo/.test(plan));
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
  check("la oferta de temporada lleva la compra inicial de CTCx y el mínimo (el del grado, o el que CTCx confirma al emitir, V5.168)", emit.includes("compra_inicial_kg: kind === \"temporada\" ? COMPRA_INICIAL_CTCX_CARGAS * CARGA_KG : null") && emit.includes("min_kg: CON_DECLARACION.includes(kind) ? (minConfirmado ?? minimoKg(lot.grade)) : null") && emit.includes("lugar_entrega: lugarEntrega,") && emit.includes("|| LUGAR_DE_ENTREGA_POR_DEFECTO"));
  check("la directa lleva la ventana y su vencimiento", emit.includes("ventana_dias: esDirecta ? VENTANA_DIRECTA_DIAS : null") && emit.includes("expira_at: esDirecta"));
  check("y los términos con los que nace (también la excepción: es un Lote de Temporada)", emit.includes("terms_version: CON_DECLARACION.includes(kind) ? TERMINOS_VERSION : null") && ofertas.includes('const CON_DECLARACION: readonly OfferKind[] = ["temporada", "directa", "excepcion"]'));
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

// ── 5. Aceptar con claridad (V5.83, fase 6): la calculadora, la declaración y el contrato que nace lleno ──
{
  // La calculadora reproduce el ejemplo del §12.9 del PVC plan: 8 cargas de Red (×1,3) al PVC de $2.500.000 →
  // $3.250.000 por carga ($26.000/kg); retirando TODO: mes 1 $1.040.000 · mes 2 $780.000 · mes 3 $520.000 (4 %).
  const s = simularTrato({ declaradoKg: 1000, copKg: 26000, declaracion: "trimestre", grado: "red" });
  check("8 cargas de Red: retirar todo en el mes 1 cuesta $1.040.000", s.porMes[0].penalidadSiRetiraTodoCop === 1040000, `${s.porMes[0].penalidadSiRetiraTodoCop}`);
  check("en el mes 2, $780.000 (25 % libre)", s.porMes[1].penalidadSiRetiraTodoCop === 780000 && s.porMes[1].retiroLibrePct === 25);
  check("en el mes 3, $520.000 (50 % libre)", s.porMes[2].penalidadSiRetiraTodoCop === 520000 && s.porMes[2].retiroLibrePct === 50);
  check("CTC compra de inmediato una carga (125 kg) al precio de la oferta", s.compraInicial.kg === 125 && s.compraInicial.cop === 125 * 26000);
  check("el resto se reparte parejo en los tres meses y suma todo", s.porMes.reduce((a, m) => a + m.pedidoKg, 0) === 875 && s.totalCop === 1000 * 26000);
  check("por 30 días es un solo mes sin tramo libre", simularTrato({ declaradoKg: 500, copKg: 26000, declaracion: "30_dias" }).porMes.length === 1 && simularTrato({ declaradoKg: 500, copKg: 26000, declaracion: "30_dias" }).porMes[0].retiroLibrePct === 0);
  check("el mínimo del grado se mira (Red 6 cargas = 750 kg)", !simularTrato({ declaradoKg: 500, copKg: 26000, declaracion: "trimestre", grado: "red" }).cumpleMinimo && simularTrato({ declaradoKg: 750, copKg: 26000, declaracion: "trimestre", grado: "red" }).cumpleMinimo);
  const simulador = lee("src/lib/trato/simulador.ts").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  check("el simulador es puro y lee las cifras de terminos.ts", !/from "@\/lib\/supabase/.test(simulador) && /from "\.\/terminos"/.test(simulador));

  const kr = lee("src/lib/ofertas/producerActions.ts");
  check("aceptar una oferta con términos exige la declaración", kr.includes("if (offer.terms_version) {") && kr.includes("if (!declaracion) return"));
  check("la cantidad respeta el mínimo del grado y el máximo de la directa", kr.includes("kg < minKg") && kr.includes("kg > maxKg"));
  check("y hay que marcar las condiciones", kr.includes("if (!declaracion.aceptaTerminos) return"));
  check("el contrato NACE LLENO: precio de la oferta (V5.170: el de la modalidad), cantidad declarada, referencia, términos", ["price_per_kg_locked: copKgTrato", "quantity_frozen_kg: lockedKg", "reference_price_source: offer.reference_price_source", "terms_version: offer.terms_version", "declaracion: declarado", "compra_inicial_kg:"].every((x) => kr.includes(x)));
  check("y la oferta guarda lo declarado y cuándo aceptó los términos", kr.includes("locked_kg: lockedKg, declaracion: declarado, terms_accepted_at: now"));
  check("una directa vencida no se acepta (queda expirada)", kr.includes('status: "expirada"') && kr.includes("offer.expira_at"));
  const firma = lee("src/app/ocp/(app)/contractActions.ts");
  const sign = firma.slice(firma.indexOf("export async function signContract("), firma.indexOf("async function contratoYMeses("));
  check("signContract ya no teclea precio ni cantidad: solo firma", !/formData\.get\("price_per_kg_locked"\)/.test(sign) && !/formData\.get\("quantity_frozen_kg"\)/.test(sign) && sign.includes('update({ signed_at: new Date().toISOString(), status: "active" })'));
  check("y se niega si el contrato nació vacío", sign.includes("contract.price_per_kg_locked == null || contract.quantity_frozen_kg == null"));
  const tab = lee("src/components/kaffetal-regal/panel/ContratosTab.tsx");
  const calc = lee("src/components/kaffetal-regal/panel/CalculadoraDelTrato.tsx");
  const firmaUi = lee("src/components/kaffetal-regal/panel/FirmaDelContrato.tsx");
  check("el productor decide con la calculadora (V5.169: modalidades y escenarios de venta) y después FIRMA el contrato", tab.includes("<CalculadoraDelTrato") && tab.includes("<FirmaDelContrato") && calc.includes("simularVentas({ declaradoKg: kg, copKg: copModalidad, meses: cond.meses, compraInicialKg, ventaPct, patron, fncCargaRef })") && calc.includes("modalidadesDisponibles(diasHastaSiguiente, { precioKg: precioSiguienteKg, fechaLimite: fechaLimiteSiguiente })") && tab.includes("declaracion: decision.modalidad, aceptaTerminos: true") && tab.includes('respuesta === "aceptar" ? firma : undefined'));
  check("y no puede decidir por debajo del mínimo ni con una modalidad cerrada, ni firmar sin nombre, trazo y la casilla", calc.includes("const cumple = kg >= minimo && (maxKg == null || kg <= maxKg) && disp[modalidad].disponible;") && calc.includes("disabled={!cumple}") && firmaUi.includes("const listo = firmaSuficiente && nombre.trim().length >= 5 && leido && !ocupado;") && firmaUi.includes('touchAction: "none"'));
  check("«Mi trato» enseña lo declarado, la compra inicial y los tramos", tab.includes("CTC compra de inmediato") && tab.includes("retiro libre al cerrar cada mes"));
}

// ── 6. El trato mes a mes (V5.84, fase 7): lo derivado se deriva; la ruptura la declara el owner ──
// Folio 8, pasos 16–18, y la decisión 6 («nunca automática; se hace visible de manera automática»). Las cifras salen del
// plan (paso 16, paso 18 y el §12.9 del PVC plan), no de `mesAMes.ts`.
{
  const hoy = new Date("2026-10-01T00:00:00Z");
  const hace = (dias) => new Date(hoy.getTime() - dias * 86_400_000).toISOString();
  const mora = paso(16).match(/\*\*Mora\*\*: (\d+) semanas sin cargo, (\d+) más con (\d+) %/);
  const sinCargo = num(mora[1]);
  const conRecargo = num(mora[2]);
  const recargo = num(mora[3]);
  check("sin pedido no hay mora", moraDelMes({ pedidoAt: null, enviadoAt: null }, hoy).estado === "sin_pedido");
  check("un pedido enviado está cumplido, sin recargo", moraDelMes({ pedidoAt: hace(40), enviadoAt: hace(2) }, hoy).estado === "cumplido");
  const m1 = moraDelMes({ pedidoAt: hace(sinCargo * 7 - 1), enviadoAt: null }, hoy);
  check(`paso 16: dentro de las ${sinCargo} semanas, sin cargo`, m1.estado === "sin_cargo" && m1.recargoPct === 0);
  const m2 = moraDelMes({ pedidoAt: hace(sinCargo * 7), enviadoAt: null }, hoy);
  check(`paso 16: de la semana ${sinCargo} a la ${sinCargo + conRecargo}, recargo del ${recargo} %`, m2.estado === "con_recargo" && m2.recargoPct === recargo);
  const m3 = moraDelMes({ pedidoAt: hace((sinCargo + conRecargo) * 7), enviadoAt: null }, hoy);
  check("paso 16: después, ruptura POTENCIAL (decisión 6: la declara el owner, nunca la plataforma)", m3.estado === "ruptura_potencial");
  check("la mora del trato es la peor de sus meses", moraDelTrato([{ pedidoAt: hace(3), enviadoAt: null }, { pedidoAt: hace(20), enviadoAt: null }], hoy) === "con_recargo");
  check("«en mora» para el circuito empieza con el recargo: las semanas sin cargo no son mora", !enMora("sin_cargo") && !enMora("cumplido") && enMora("con_recargo") && enMora("ruptura_potencial"));

  // El retiro contra el §12.9 del PVC plan (mismo ejemplo que la calculadora): 1000 kg de Red a $26.000/kg.
  const r1 = retiro({ declaradoKg: 1000, mes: 1, retiradoLibreAcumKg: 0, retiraKg: 1000, copKg: 26000 });
  check("§12.9: retirar los 1000 kg en el mes 1 cuesta $1.040.000 (8 cargas al 4 %, nada libre)", r1.penalidadCop === 1040000 && r1.libreKg === 0 && r1.cargasPenalizadas === 8, `${r1.penalidadCop}`);
  const r2 = retiro({ declaradoKg: 1000, mes: 2, retiradoLibreAcumKg: 0, retiraKg: 1000, copKg: 26000 });
  check("en el mes 2, 250 kg libres (25 %) y $780.000", r2.libreKg === 250 && r2.penalizadoKg === 750 && r2.penalidadCop === 780000);
  const r3 = retiro({ declaradoKg: 1000, mes: 3, retiradoLibreAcumKg: 0, retiraKg: 1000, copKg: 26000 });
  check("en el mes 3, 500 kg libres (50 %) y $520.000", r3.libreKg === 500 && r3.penalidadCop === 520000);
  check("lo ya retirado libre descuenta del tramo acumulado", retiro({ declaradoKg: 1000, mes: 3, retiradoLibreAcumKg: 250, retiraKg: 300, copKg: 26000 }).libreKg === 250);
  check("retirar dentro del tramo no cuesta nada", retiro({ declaradoKg: 1000, mes: 2, retiradoLibreAcumKg: 0, retiraKg: 200, copKg: 26000 }).penalidadCop === 0);
  check("por 30 días (un solo mes) no hay tramo libre", retiro({ declaradoKg: 500, mes: 1, meses: 1, retiradoLibreAcumKg: 0, retiraKg: 100, copKg: 26000 }).libreKg === 0);
  check("el mes en curso corre en tramos de 30 días desde la firma y no pasa del periodo", mesEnCurso(hace(0), hoy) === 1 && mesEnCurso(hace(30), hoy) === 2 && mesEnCurso(hace(65), hoy) === 3 && mesEnCurso(hace(200), hoy) === 3);
  check(`paso 18: la renovación se debe a los ${RENOVACION_DIAS} días de la firma`, !renovacionDebida(hace(RENOVACION_DIAS - 1), hoy) && renovacionDebida(hace(RENOVACION_DIAS), hoy));
  check(`paso 18: past crop = recolección final a más de ${PAST_CROP_MESES} meses`, !esPastCrop("2026-01-15", hoy) && esPastCrop("2025-12-15", hoy));
  const mod = lee("src/lib/trato/mesAMes.ts").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  check("mesAMes.ts es puro (sin supabase) y lee las cifras de terminos.ts", !/from "@\/lib\/supabase/.test(mod) && /from "\.\/terminos"/.test(mod) && !/\.(update|insert|upsert)\(/.test(mod));

  // Decisión 6: nada derivado se guarda; la ruptura y la cuenta congelada las escribe SOLO el owner.
  const acciones = lee("src/app/ocp/(app)/contractActions.ts");
  const fn = (nombre, siguiente) => acciones.slice(acciones.indexOf(`export async function ${nombre}(`), acciones.indexOf(`export async function ${siguiente}(`));
  check("no existe una columna de mora: ni el código ni la migración escriben mora_estado", !/mora_estado/.test(acciones) && !/mora_estado/.test(lee("docs/migraciones/2026-09-24_trato_mes_a_mes.sql")));
  const ruptura = fn("declararRuptura", "descongelarCuenta");
  check("decisión 6: la ruptura la declara SOLO el owner, con motivo", ruptura.includes("if (!(await esOwner(service, adminId))) return") && ruptura.includes("if (!motivo) return"));
  check("y `status: \"ruptura\"` se escribe únicamente ahí", (acciones.match(/\{ status: "ruptura"/g) ?? []).length === 1 && ruptura.includes('{ status: "ruptura"'));
  check("y congela la cuenta del productor en el mismo acto (Identidad, autorizada por el owner)", ruptura.includes('estado_cuenta: "congelada"'));
  const descongela = fn("descongelarCuenta", "recordHumidityReading");
  check("descongelar también es del owner, con motivo", descongela.includes("esOwner(service, adminId)") && descongela.includes('estado_cuenta: "activa"') && descongela.includes("if (!motivo) return"));
  const escritores = execSync("git ls-files src", { encoding: "utf8" }).split(/\r?\n/).filter((f) => /\.tsx?$/.test(f)).filter((f) => /estado_cuenta: "/.test(readFileSync(f, "utf8")));
  check("estado_cuenta lo escribe SOLO contractActions.ts (declarar ruptura · descongelar)", escritores.length === 1 && escritores[0] === "src/app/ocp/(app)/contractActions.ts", escritores.join(", "));

  // Pasos 17–18: pedir → enviar → pagar; cierre; renovación.
  const pedir = fn("pedirDelMes", "registrarEnvioDelMes");
  check("CTCx pide el mes (paso 17) y no se cambia un mes ya enviado", pedir.includes("pedido_kg") && pedir.includes("Ese mes ya está enviado"));
  const envio = fn("registrarEnvioDelMes", "registrarPagoDelMes");
  check("el envío se espeja en contract_releases al 100 % (el stock del catálogo sigue leyendo lo mismo)", envio.includes('from("contract_releases")') && envio.includes('onConflict: "contract_id,month_number"') && envio.includes("max_release_pct: 100"));
  const pago = fn("registrarPagoDelMes", "ofrecerRenovacion");
  check("se paga lo enviado (primera semana del mes siguiente): sin envío no hay pago", pago.includes("registre primero el envío del mes"));
  check("con los meses enviados y pagados el trato se cierra solo (completed)", acciones.includes("async function cerrarSiCumplido(") && envio.includes("cerrarSiCumplido(service, contractId, adminId)") && pago.includes("cerrarSiCumplido(service, contractId, adminId)"));
  const renov = fn("ofrecerRenovacion", "declararRuptura");
  check(`paso 18: la renovación solo sobre un trato cumplido, a los ${RENOVACION_DIAS} días, con el PVC vigente (emitOffer)`, /"completed"/.test(renov) && renov.includes("renovacionDebida(contract.signed_at") && renov.includes('emitOffer(contract.lot_id, "temporada", fd)') && renov.includes('status: "renovado"'));
  const ofertas = lee("src/app/ocp/(app)/ofertasActions.ts");
  check("la oferta de renovación guarda de qué contrato viene y el past crop sale también de harvest_to", renov.includes('fd.set("renewal_of_contract_id", contractId)') && ofertas.includes("renewal_of_contract_id: renewalOf") && ofertas.includes("esPastCrop(lot.harvest_to, new Date())"));
  check("a una cuenta congelada no se le oferta (el owner la descongela primero)", ofertas.includes('perfilProductor?.estado_cuenta === "congelada"'));
  check("signContract ya no siembra la escalera 50/75/100 (retirada con recordContractRelease)", !acciones.includes("RELEASE_STAIRCASE") && !acciones.includes("recordContractRelease"));

  // KR: el retiro pasa por el servidor con la misma cuenta; la mora se deriva al cargar, no en el render.
  const kr = lee("src/lib/trato/producerActions.ts");
  check("el productor retira desde su panel con retiro() (misma cuenta) y solo de un trato vigente y hasta lo comprometido", kr.includes("retiro({") && kr.includes('contract.status !== "active"') && kr.includes("retira > vigenteKg"));
  check("y una cuenta congelada no retira ni acepta ofertas", kr.includes('perfil?.estado_cuenta === "congelada"') && lee("src/lib/ofertas/producerActions.ts").includes('perfil?.estado_cuenta === "congelada"'));
  const exp = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  check("KR deriva la mora al CARGAR con mesAMes.ts (nunca en el render, nunca guardada)", exp.includes("resumenDelTrato(") && exp.includes("moraDelMes(m, hoy)"));
  const tab = lee("src/components/kaffetal-regal/panel/ContratosTab.tsx");
  check("«Mi trato» enseña los meses con su mora, el retiro con la cuenta previa y la cuenta congelada", tab.includes("MORA_LABEL[") && tab.includes("previsualizarRetiro(") && tab.includes("retirarDelTrato(") && tab.includes('gi.estadoCuenta === "congelada"'));
  const ocp = lee("src/app/ocp/(app)/contratos/[id]/page.tsx");
  check("y el OCP pinta lo mismo con la misma función (moraDelMes); «Declarar ruptura» solo para el owner", ocp.includes("moraDelMes(") && ocp.includes("identity.isOwner") && ocp.includes("declararRuptura.bind"));
}

// ── 7. Los recordatorios de mora (V5.86): semanales, con tope, y NUNCA automáticos ──
// Fila «Recordatorios» del §4 del plan y su riesgo del §7 («solo dos disparadores … semanal, con tope ×4 y el remitente único»).
{
  const hoy = new Date("2026-10-01T00:00:00Z");
  const hace = (dias) => new Date(hoy.getTime() - dias * 86_400_000).toISOString();
  const fila = plan.match(/^\| \*\*Recordatorios\*\* \| consolas \| (.+?) \|/m)?.[1] ?? "";
  check("§4: el cron semanal recuerda la mora por correo y en el feed", /semanal/.test(fila) && /mora/.test(fila) && /correo al productor/.test(fila) && /nota en su feed/.test(fila));
  check("§7: el mismo tope ×4 de las certificaciones", /tope ×4/.test(plan) && MAX_RECORDATORIOS_MORA === 4);
  const base = { pedidoAt: null, enviadoAt: null, recordatoriosMora: 0, ultimoRecordatorioMoraAt: null };
  const decide = (m) => decidirRecordatorioDeMora({ ...base, ...m }, hoy);
  check("sin pedido: nada", decide({}) === "nada");
  check("pedido enviado: nada (la mora se deriva del envío)", decide({ pedidoAt: hace(30), enviadoAt: hace(1) }) === "nada");
  check("en las dos semanas sin cargo: nada — todavía no es mora", decide({ pedidoAt: hace(10) }) === "nada");
  check("al entrar en recargo: el primer recordatorio", decide({ pedidoAt: hace(14) }) === "recordar");
  check("tres días después del último: nada", decide({ pedidoAt: hace(20), recordatoriosMora: 1, ultimoRecordatorioMoraAt: hace(3) }) === "nada");
  check("una semana después: el siguiente", decide({ pedidoAt: hace(24), recordatoriosMora: 1, ultimoRecordatorioMoraAt: hace(7) }) === "recordar");
  check("en ruptura potencial sigue recordando (hasta el tope)", decide({ pedidoAt: hace(40), recordatoriosMora: 3, ultimoRecordatorioMoraAt: hace(8) }) === "recordar");
  check("cuatro mandados: nunca un quinto — y nada automático (decisión 6)", decide({ pedidoAt: hace(60), recordatoriosMora: 4, ultimoRecordatorioMoraAt: hace(14) }) === "nada");
  const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  const moraSrc = sinComentarios(lee("src/lib/trato/mora.ts"));
  check("mora.ts es puro, lee el tope de registro/reglas y la mora de mesAMes", !/supabase/.test(moraSrc) && moraSrc.includes('from "@/lib/registro/reglas"') && moraSrc.includes('from "./mesAMes"'));
  const runner = lee("src/lib/trato/moraRecordatorios.ts");
  check("el barrido mira solo tratos en curso, meses pedidos sin envío, y decide con la regla pura", runner.includes('.in("purchase_contracts.status", ["active", "reconditioning"])') && runner.includes('.is("enviado_at", null)') && runner.includes("decidirRecordatorioDeMora("));
  check("recuerda por correo (el remitente único) y en el feed, con rastro en audit_log", runner.includes("sendTransactionalEmail(") && runner.includes('from("producer_comm_log")') && runner.includes('action: "mora_recordatorio_enviado"'));
  check("y NO cambia el estado de nada", !/update\(\{[^}]*\bstatus\b/.test(sinComentarios(runner)) && !/estado_cuenta/.test(runner) && !/from\("purchase_contracts"\)/.test(runner) && (runner.match(/\.update\(/g) ?? []).length === 1);
  const cron = lee("src/app/api/cron/recordatorios/route.ts");
  // V5.103: el tercer barrido es el de la inactividad (owner, 2026-09-30); `qa-inactividad` lo vigila por dentro.
  check("el cron semanal corre los tres barridos y solo esos tres", cron.includes("correrRecordatorios(") && cron.includes("correrRecordatoriosDeMora(") && cron.includes("correrBarridoDeInactividad(") && (cron.match(/await correr/g) ?? []).length === 3);
  check("el OCP enseña cuántos recordatorios van", lee("src/app/ocp/(app)/contratos/[id]/page.tsx").includes("MAX_RECORDATORIOS_MORA"));
}

// ── V5.168 (owner, 2026-10-06) · la oferta se despliega y se confirma en el OCP; el productor calcula, decide y FIRMA con el dedo;
//    los documentos llevan marca de agua y se imprimen solo con contrato firmado ─────────────────────────────────────────
{
  const { clausulasDelContrato, textoDelContrato, CONTRATO_VERSION } = await import("../src/lib/trato/contrato.ts");
  const { contratoFirmado, textoDeMarca, ESTADOS_DE_CONTRATO_FIRMADO } = await import("../src/lib/kaffetal/blindaje.ts");
  const { LUGAR_DE_ENTREGA_POR_DEFECTO } = await import("../src/lib/trato/terminos.ts");
  const { condicionesDe } = await import("../src/lib/trato/modalidades.ts");
  const condTri = condicionesDe("trimestre", { hoy: "2026-10-06", temporadaHasta: "2026-12-15", declaradoKg: 750, grado: "red" });
  const datos = { tipo: "cherry_picked", condiciones: condTri, productorNombre: "Ana Pérez", productorDocumento: null, loteNombre: "Lote X", loteReferencia: "CTC-L-AAAA0000", grado: "red", copKg: 26000, declaradoKg: 750, lugarEntrega: LUGAR_DE_ENTREGA_POR_DEFECTO, termsVersion: "2026-09-24", temporada: "Q4 2026" };
  const cl = clausulasDelContrato(datos);
  const todo = cl.map((c) => c.texto).join(" ");
  check("contrato Cherry Picked · trece cláusulas con la modalidad, la vigencia, la compra con la firma y «sin compromiso de compra mensual»", cl.length === 13 && todo.includes("$26.000 COP por kg") && todo.includes("$3.250.000 COP por carga") && todo.includes("750 kg de CPS (6 cargas") && todo.includes("Bucaramanga") && todo.includes("«Declarar Siguiente Temporada Trimestral»") && todo.includes("del 16 de diciembre de 2026") && cl[4].titulo.includes("Sin compromiso de compra mensual") && todo.includes("Grado CTCx Red"));
  check("contrato · el texto es el mismo con «red» o «Red» (la pantalla y el servidor firman la misma huella)", textoDelContrato(datos) === textoDelContrato({ ...datos, grado: "Red" }) && CONTRATO_VERSION === "2026-10-06.4");
  const sel = clausulasDelContrato({ ...datos, tipo: "selection", condiciones: null, declaradoKg: 500, copKg: 22000 });
  check("contrato CTCx Selection · compra en firme de los kilos acordados, «hasta el PVC vigente menos el 8 %», sin modalidad", sel.length === 8 && sel.map((c) => c.texto).join(" ").includes("hasta el PVC vigente menos el 8 %") && sel.map((c) => c.texto).join(" ").includes("$11.000.000 COP"));
  const resp = lee("src/lib/ofertas/producerActions.ts");
  check("aceptar ES firmar: sin firma no hay contrato; la imagen se guarda en Storage privado ANTES de crear el contrato", resp.includes('if (!firma) return { ok: false, message: "Para aceptar hay que firmar el contrato') && resp.indexOf('storage.from("kaffetal-media").upload(rutaFirma') < resp.indexOf('.from("purchase_contracts")\n    .insert(') && resp.includes("FIRMA_MAX_BYTES"));
  check("la firma guarda nombre, fecha, dispositivo y la huella SHA-256 del texto firmado", ["producer_signed_at: now,", "producer_signer_name: nombreFirma,", "producer_signature_path: rutaFirma,", "producer_signature_meta: metaFirma,", "contract_text_version: CONTRATO_VERSION,", "contract_text_sha256: huella,"].every((k) => resp.includes(k)) && resp.includes('createHash("sha256").update(texto, "utf8")'));
  const contratoPag = lee("src/app/kaffetal-regal/contrato/[id]/page.tsx");
  check("el contrato del productor: solo el dueño, cláusulas regeneradas, huella comprobada, las dos firmas; se imprime firmado por las dos partes", contratoPag.includes("lote.producer_id !== user.id") && contratoPag.includes("const integro = huella === c.contract_text_sha256;") && contratoPag.includes("const puedeImprimir = contratoFirmado(c.status);") && contratoPag.includes("<MarcaDeAgua"));
  check("blindaje · «firmado» = CTCx ya firmó (active, reconditioning, completed, renovado); pendiente de firma NO imprime", contratoFirmado("active") && contratoFirmado("completed") && !contratoFirmado("pending_signature") && !contratoFirmado("cancelled") && ESTADOS_DE_CONTRATO_FIRMADO.length === 4);
  check("blindaje · la marca dice CTCx, la referencia, el productor y el uso exclusivo", textoDeMarca({ referencia: "CTC-L-AAAA0000", productor: "Ana Pérez", fecha: "2026-10-06T10:00:00Z" }) === "CTCx · CTC-L-AAAA0000 · Ana Pérez · Uso exclusivo con CTCx · 2026-10-06");
  const docs = {
    dossier: lee("src/components/kaffetal-regal/dossier/DossierCtcx.tsx"),
    visa: lee("src/components/kaffetal-regal/LotEudrCertDoc.tsx"),
    pasaporte: lee("src/components/kaffetal-regal/EudrDossierDoc.tsx"),
    ficha: lee("src/components/kaffetal-regal/ficha/FichaPreview.tsx"),
  };
  check("blindaje · dossier, Visa del lote, Pasaporte de la finca y Ficha: marca de agua y el botón de imprimir solo con contrato firmado", Object.values(docs).every((d) => d.includes("<MarcaDeAgua") && d.includes("<Blindaje")) && docs.dossier.includes("d.blindaje.puedeImprimir ? <BotonImprimir") && docs.visa.includes("blindaje.puedeImprimir ? <PrintButton />") && docs.ficha.includes("{puedeImprimir ? (") && lee("src/lib/kaffetal/blindajeServidor.ts").includes('.in("status", [...ESTADOS_DE_CONTRATO_FIRMADO])'));
  const blind = lee("src/components/kaffetal-regal/blindaje/Blindaje.tsx");
  check("blindaje · sin contrato: sin menú contextual ni copiar, sin atajos de imprimir/guardar; imprimir desde el navegador saca el aviso", blind.includes('"contextmenu", "copy", "cut", "dragstart", "selectstart"') && blind.includes('["p", "s", "c", "x", "a", "u"]') && blind.includes("body * { display: none !important; }"));
  const desp = lee("src/app/ocp/(app)/ofertas/OfertaDesplegable.tsx");
  check("OCP · el lote se despliega con su resumen y se confirma: mínimo, entrega (Bucaramanga por defecto), precio por kg y carga; cambiar el precio lo vuelve excepción con motivo", desp.includes("<details") && desp.includes("useState(LUGAR_DE_ENTREGA_POR_DEFECTO)") && desp.includes('etiqueta="Cantidad mínima disponible de CPS"') && desp.includes("etiqueta={`Precio por carga (${CARGA_KG} kg)`}") && desp.includes('const claseEfectiva: OfferKind = cambiaPrecio || precioAncla == null ? "excepcion" : clase;') && lee("src/app/ocp/(app)/ofertas/page.tsx").includes("<OfertaDesplegable"));
}

// ── V5.169 (owner, 2026-10-06) · CTCx ofrece una de dos cosas (Cherry Picked con tres modalidades, o una compra de CTCx Selection
//    que se negocia); escenarios de venta con KPIs frente a la FNC; nombres de archivo; la Visa enlaza los Pasaportes ───────────
{
  const { modalidadesDisponibles, condicionesDe, diasHastaLaSiguiente } = await import("../src/lib/trato/modalidades.ts");
  const { simularVentas } = await import("../src/lib/trato/simulador.ts");
  const { retiro } = await import("../src/lib/trato/mesAMes.ts");
  const d71 = modalidadesDisponibles(71), d40 = modalidadesDisponibles(40), d20 = modalidadesDisponibles(20);
  check("modalidades · «Declarar Ahora» con ≥ 30 días; «Ahora y Siguiente» con ≤ 50 días; «Siguiente» siempre", diasHastaLaSiguiente("2026-10-06", "2026-12-15") === 71 && d71["30_dias"].disponible && !d71.ahora_y_siguiente.disponible && d40["30_dias"].disponible && d40.ahora_y_siguiente.disponible && !d20["30_dias"].disponible && d20.ahora_y_siguiente.disponible && d20.trimestre.disponible);
  const ahora = condicionesDe("30_dias", { hoy: "2026-10-06", temporadaHasta: "2026-12-15", declaradoKg: 750, grado: "red" });
  const ays = condicionesDe("ahora_y_siguiente", { hoy: "2026-10-26", temporadaHasta: "2026-12-15", declaradoKg: 900, grado: "red" });
  check("«Declarar Ahora»: 30 días, CTCx compra entre 10 y 25 kg a su discreción, sin retiro libre", ahora.meses === 1 && ahora.hasta === "2026-11-05" && "minKg" in ahora.compraInicial && ahora.compraInicial.minKg === 10 && ahora.compraInicial.maxKg === 25 && ahora.retiroLibrePct === null);
  check("«Ahora y Siguiente»: desde hoy hasta el fin de la siguiente, 30 % libre, redeclara ≥ 70 % (y nunca menos del mínimo), CTCx compra 125 kg", ays.desde === "2026-10-26" && ays.meses === 5 && ays.retiroLibrePct === 30 && ays.redeclarar.minKg === 750 && ays.redeclarar.at === "2026-12-16" && "kg" in ays.compraInicial && ays.compraInicial.kg === 125);
  check("retiro · «Ahora y Siguiente» libera el 30 % desde el primer mes, sin escalones", retiro({ declaradoKg: 1000, mes: 1, meses: 5, retiradoLibreAcumKg: 0, retiraKg: 300, copKg: 26000, retiroLibrePct: 30 }).penalizadoKg === 0 && retiro({ declaradoKg: 1000, mes: 1, meses: 3, retiradoLibreAcumKg: 0, retiraKg: 300, copKg: 26000 }).penalizadoKg === 300);
  const v0 = simularVentas({ declaradoKg: 750, copKg: 26000, meses: 3, compraInicialKg: 125, ventaPct: 0, patron: "parejo", fncCargaRef: 2110000 });
  const v1 = simularVentas({ declaradoKg: 750, copKg: 26000, meses: 3, compraInicialKg: 125, ventaPct: 100, patron: "primer_dia", fncCargaRef: 2110000 });
  check("escenarios · aunque CTCx no venda nada, la compra con la firma ocurre; «todo apenas empieza» vende todo en el mes 1", v0.vendidoKg === 125 && v0.sinVenderKg === 625 && v1.porMes[0].kg === 625 && v1.porMes[1].kg === 0 && v1.vendidoPct === 100);
  check("escenarios · KPIs frente a la FNC del día de la oferta (prima %, diferencia en pesos)", v1.primaFncPct === 54 && v1.ingresoFncCop === Math.round(750 * 2110000 / 125) && v1.diferenciaFncCop === v1.ingresoCop - v1.ingresoFncCop);
  const ofertas = lee("src/app/ocp/(app)/ofertasActions.ts");
  const prod = lee("src/lib/ofertas/producerActions.ts");
  check("Selection · CTCx propone precio HASTA el tope (PVC − 8 %) y kilos; la oferta guarda el tope, la FNC y el fin de temporada", ofertas.includes("if (propuesto > precioTope) return") && ofertas.includes('if (quantity === null) return { ok: false, error: "Una compra de CTCx Selection propone cuántos kilos compra') && ofertas.includes("precio_tope_kg: precioTope,") && ofertas.includes("fnc_carga_ref: mercado.fncHoy,") && ofertas.includes("temporada_hasta: pvc?.edicion.validTo ?? null,"));
  check("Selection · la negociación: el productor contraoferta (queda «contraofertada»), CTCx acepta (si cabe en el tope), contraoferta o desiste; las rondas quedan guardadas", prod.includes("export async function contraofertarSeleccion(") && prod.includes('update({ status: "contraofertada" })') && ofertas.includes("export async function responderContraoferta(") && ofertas.includes("if (tope != null && precio > tope) return") && ofertas.includes('accion: accion === "aceptar" ? "acepta" : "contraoferta"'));
  check("Selection · se acepta tal cual se negoció (sin declaración) y se firma; Cherry Picked valida la modalidad con la fecha REAL de la temporada", prod.includes('const esSelection = offer.kind === "directa";') && prod.includes("const disp = modalidadesDisponibles(dias, { precioKg: precioSiguiente, fechaLimite: o.temporada_desde ? fechaLimitePvcSiguiente(o.temporada_desde) : null })[declaracion.declaracion];") && prod.includes("const vigente = await edicionVigente();"));
  check("«Declarar Ahora» se renueva en la ventana y enmienda la cantidad, sin compra adicional obligada", lee("src/lib/trato/producerActions.ts").includes("export async function renovarDeclaracionAhora(") && lee("src/lib/trato/producerActions.ts").includes("if (dias == null || dias < VENTANA_DECLARAR_AHORA_DIAS)"));
  const mig = lee("docs/migraciones/2026-10-06_modalidades_y_contraofertas.sql");
  check("migración · contraofertada cuenta como oferta abierta (una por lote) y las rondas solo las lee el dueño", mig.includes("where (status = any (array['emitida'::text, 'contraofertada'::text]))") && mig.includes("create policy lot_offer_rondas_select_own"));
  const { nombreDeArchivo } = await import("../src/lib/kaffetal/nombreDeArchivo.ts");
  check("nombres · «Documento · Nombre · Código», sin caracteres que un archivo no acepta", nombreDeArchivo(["Dossier del lote", "Gesha: Ragonvalia/W", "CTC-L-0B9C1C04"]) === "Dossier del lote · Gesha- Ragonvalia-W · CTC-L-0B9C1C04");
  const paginas = ["src/app/kaffetal-regal/dossier/[id]/page.tsx", "src/app/kaffetal-regal/certificacion-lote/[id]/page.tsx", "src/app/kaffetal-regal/certificacion/[id]/page.tsx", "src/app/kaffetal-regal/contrato/[id]/page.tsx", "src/app/ocp/(app)/kr/[id]/dossier/page.tsx"];
  check("nombres · dossier, Visa, Pasaporte (KR y OCP) y contrato generan su título en el servidor; la Ficha también al imprimir y descargar", paginas.every((p) => lee(p).includes("export async function generateMetadata(")) && lee("src/components/kaffetal-regal/ficha/FichaPreview.tsx").includes("a.download = `Ficha_Tecnica_${name}${codigo ? `_${codigo}` : \"\"}.html`;"));
  check("la Visa del lote enlaza el Pasaporte EUDR de cada finca de origen (y el dossier también)", lee("src/components/kaffetal-regal/LotEudrCertDoc.tsx").includes("href={`/kaffetal-regal/certificacion/${f.id}`}") && lee("src/components/kaffetal-regal/dossier/DossierCtcx.tsx").includes("t.verPasaporte(f.name, f.code)"));
}

// ── V5.170 (owner, 2026-10-06) · «Siguiente Temporada» va al PVC de la EDICIÓN SIGUIENTE (fijado en las primeras dos semanas del
//    segundo mes de la temporada anterior) ─────────────────────────────────────────────────────────────────────────────────
{
  const { fechaLimitePvcSiguiente, modalidadesDisponibles } = await import("../src/lib/trato/modalidades.ts");
  const { clausulasDelContrato } = await import("../src/lib/trato/contrato.ts");
  const { condicionesDe } = await import("../src/lib/trato/modalidades.ts");
  check("PVC siguiente · la fecha límite es el inicio del segundo mes de la temporada + 13 días (15-sep → 28-oct)", fechaLimitePvcSiguiente("2026-09-15") === "2026-10-28");
  const sinPvc = modalidadesDisponibles(71, { precioKg: null, fechaLimite: "2026-10-28" });
  const conPvc = modalidadesDisponibles(71, { precioKg: 27300, fechaLimite: "2026-10-28" });
  check("PVC siguiente · sin la edición siguiente publicada, «Siguiente Temporada» no se abre (y dice cuándo se fija); con ella, sí", !sinPvc.trimestre.disponible && sinPvc.trimestre.motivo.includes("28 de octubre de 2026") && conPvc.trimestre.disponible && sinPvc["30_dias"].disponible);
  const ofertas = lee("src/app/ocp/(app)/ofertasActions.ts");
  const prod = lee("src/lib/ofertas/producerActions.ts");
  check("PVC siguiente · la oferta guarda el precio de la edición siguiente (con el mismo % del trato) y el inicio de la temporada", ofertas.includes("await pvcParaGrado(lot.grade, proxima.validFrom, { modificadorPct })") && ofertas.includes("price_next_kg: pvcSiguiente ? pvcSiguiente.precio.copKgFinal : null,") && ofertas.includes("temporada_desde: pvc?.edicion.validFrom ?? null,"));
  check("PVC siguiente · al aceptar «Siguiente Temporada» el contrato fija ese precio y esa edición", prod.includes('const copKgTrato = declarado === "trimestre" && precioNext != null ? Number(precioNext) : Number(offer.price_per_kg);') && prod.includes("price_per_kg_locked: copKgTrato,") && prod.includes("pvc_edition_id: edicionTrato,"));
  const tri = clausulasDelContrato({ tipo: "cherry_picked", condiciones: condicionesDe("trimestre", { hoy: "2026-10-06", temporadaHasta: "2026-12-15", declaradoKg: 750, grado: "red" }), productorNombre: "Ana Pérez", productorDocumento: null, loteNombre: "Lote X", loteReferencia: "CTC-L-AAAA0000", grado: "red", copKg: 27300, declaradoKg: 750, lugarEntrega: "Bucaramanga.", termsVersion: null, temporada: null });
  check("PVC siguiente · el contrato dice que el precio es el PVC publicado para la siguiente Temporada Trimestral", tri.some((c) => c.texto.includes("publicado para la siguiente Temporada Trimestral") && c.texto.includes("$27.300 COP")));
  const calc = lee("src/components/kaffetal-regal/panel/CalculadoraDelTrato.tsx");
  check("PVC siguiente · la calculadora usa el precio de cada modalidad y lo lleva a la firma; el OCP avisa si aún no se publica", calc.includes('const precioDe = (m: Modalidad) => (m === "trimestre" ? precioSiguienteKg ?? copKg : copKg);') && calc.includes("copKg: copModalidad })") && lee("src/components/kaffetal-regal/panel/ContratosTab.tsx").includes("copKg: decision?.copKg ?? offer.pricePerKg,") && lee("src/app/ocp/(app)/ofertas/OfertaDesplegable.tsx").includes("El PVC de la siguiente temporada aún no se publica"));
}

// ── V5.171 (owner, 2026-10-06: «la opción 1, que quede en el 70 %») · la redeclaración de «Ahora y Siguiente»: se pide unos días
//    antes, nunca acepta menos del mínimo, y sin respuesta queda en el mínimo ──────────────────────────────────────────────
{
  const { estadoDeRedeclaracion, cantidadTrasRedeclarar, abreLaRedeclaracion, condicionesDe } = await import("../src/lib/trato/modalidades.ts");
  const { DIAS_ANTES_REDECLARAR } = await import("../src/lib/trato/terminos.ts");
  const { clausulasDelContrato } = await import("../src/lib/trato/contrato.ts");
  const base = { redeclararMinKg: 750, redeclararAt: "2026-12-16", redeclaradoAt: null, redeclaradoKg: null, redeclaracionOrigen: null };
  const f = (hoy, extra = {}) => estadoDeRedeclaracion({ ...base, ...extra, hoy }).fase;
  check("redeclaración · se abre unos días antes (10) del inicio de la siguiente temporada", DIAS_ANTES_REDECLARAR === 10 && abreLaRedeclaracion("2026-12-16") === "2026-12-06");
  check("redeclaración · pronto antes de abrirse, abierta desde ese día hasta el primer día de la temporada inclusive, vencida al día siguiente", f("2026-12-05") === "pronto" && f("2026-12-06") === "abierta" && f("2026-12-16") === "abierta" && f("2026-12-17") === "vencida");
  check("redeclaración · hecha (por el productor o al mínimo) pesa sobre la fecha; sin redeclarar_at no aplica", f("2026-12-20", { redeclaradoAt: "2026-12-10T12:00:00Z", redeclaradoKg: 800, redeclaracionOrigen: "productor" }) === "hecha" && estadoDeRedeclaracion({ ...base, redeclararAt: null, hoy: "2026-12-10" }).fase === "no_aplica" && estadoDeRedeclaracion({ ...base, redeclaradoAt: "x", redeclaradoKg: 750, redeclaracionOrigen: "automatica", hoy: "2026-12-20" }).origen === "automatica");
  check("redeclaración · lo redeclarado es lo DISPONIBLE para la siguiente: lo pedido y lo retirado se quedan", cantidadTrasRedeclarar({ pedidoKg: 250, retiradoKg: 100, redeclaradoKg: 750 }) === 1100);
  const ays = clausulasDelContrato({ tipo: "cherry_picked", condiciones: condicionesDe("ahora_y_siguiente", { hoy: "2026-10-26", temporadaHasta: "2026-12-15", declaradoKg: 1000, grado: "red" }), productorNombre: "Ana Pérez", productorDocumento: null, loteNombre: "El Mirador", loteReferencia: "CTC-L-0001", grado: "red", copKg: 26000, declaradoKg: 1000, lugarEntrega: "Bucaramanga.", termsVersion: null, temporada: null });
  check("redeclaración · el contrato dice el mínimo, cuándo se abre y que sin respuesta queda en el mínimo", ays.some((c) => c.texto.includes("al menos 750 kg") && c.texto.includes(`${DIAS_ANTES_REDECLARAR} días antes`) && c.texto.includes("queda en ese mínimo")));
  const acc = lee("src/lib/trato/producerActions.ts");
  const srv = lee("src/lib/trato/redeclaracion.ts");
  check("redeclaración · el botón del productor valida la modalidad, la ventana y el mínimo en el servidor", acc.includes("export async function redeclararSiguienteTemporada(") && acc.includes('if (e.fase !== "abierta")') && acc.includes("if (nuevo < (e.minKg ?? 0))") && acc.includes('c.declaracion !== "ahora_y_siguiente"'));
  check("redeclaración · el barrido pide al abrirse y, vencida sin respuesta, la deja en el mínimo (automática), con enmienda, auditoría y nota", srv.includes('e.fase === "abierta" && !c.redeclarar_aviso_at') && srv.includes('aplicarRedeclaracion(service, c, e.minKg, "automatica", null)') && srv.includes('tipo: "redeclaracion"') && srv.includes('"redeclaracion_automatica_minimo"') && srv.includes('.is("redeclarado_at", null)'));
  check("redeclaración · corre a diario (vercel.json) con CRON_SECRET", lee("vercel.json").includes('"/api/cron/redeclaraciones"') && lee("src/app/api/cron/redeclaraciones/route.ts").includes("Bearer ${secret}"));
  const tab = lee("src/components/kaffetal-regal/panel/ContratosTab.tsx");
  check("redeclaración · Mis contratos trae el botón «Redeclarar», que no deja bajar del mínimo; el OCP ve el estado", tab.includes("<Redeclaracion contractId={c.id}") && tab.includes("redeclararSiguienteTemporada(contractId") && tab.includes("No puede ser menos de {e.minKg} kg.") && lee("src/app/ocp/(app)/contratos/[id]/page.tsx").includes("estadoDeRedeclaracion({"));
}

// ── V5.172 (owner, 2026-10-06) · en «Confirmar la oferta» se ve que las cifras son dinero y kilos, y que se cambian ──
{
  const desp = lee("src/app/ocp/(app)/ofertas/OfertaDesplegable.tsx");
  const css = lee("src/components/panel/shared.module.css");
  check("oferta · precio por kg y por carga en cajas con $ y COP, los kilos con su unidad, separador de miles y lápiz; volver al precio del PVC", desp.includes('prefijo="$"') && desp.includes('sufijo="COP / kg"') && desp.includes('sufijo="COP / carga"') && desp.includes('sufijo="kg de CPS"') && desp.includes("onCambio(miles(e.target.value))") && desp.includes("volver a ese precio") && css.includes(".campoCifra:focus-within") && css.includes(".campoCifraLapiz"));
}

if (fallos.length) {
  console.error(`✗ qa-trato: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-trato: ${ok} comprobaciones OK, 0 fallos`);
