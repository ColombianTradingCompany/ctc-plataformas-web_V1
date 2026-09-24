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
import {
  CARGA_KG, COMPRA_INICIAL_CTCX_CARGAS, DECLARACIONES, MODIFICADOR_DIRECTA_PCT, MODIFICADOR_PAST_CROP_PCT, MORA, MOQ_SUBASTA_TYRIAN_KG,
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
  check("la oferta de temporada lleva la compra inicial de CTCx y el mínimo del grado", emit.includes("compra_inicial_kg: kind === \"temporada\" ? COMPRA_INICIAL_CTCX_CARGAS * CARGA_KG : null") && emit.includes("min_kg: CON_DECLARACION.includes(kind) ? minimoKg(lot.grade) : null"));
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
  check("el contrato NACE LLENO: precio de la oferta, cantidad declarada, referencia, términos", ["price_per_kg_locked: Number(offer.price_per_kg)", "quantity_frozen_kg: lockedKg", "reference_price_source: offer.reference_price_source", "terms_version: offer.terms_version", "declaracion: declarado", "compra_inicial_kg:"].every((x) => kr.includes(x)));
  check("y la oferta guarda lo declarado y cuándo aceptó los términos", kr.includes("locked_kg: lockedKg, declaracion: declarado, terms_accepted_at: now"));
  check("una directa vencida no se acepta (queda expirada)", kr.includes('status: "expirada"') && kr.includes("offer.expira_at"));
  const firma = lee("src/app/ocp/(app)/contractActions.ts");
  const sign = firma.slice(firma.indexOf("export async function signContract("), firma.indexOf("async function contratoYMeses("));
  check("signContract ya no teclea precio ni cantidad: solo firma", !/formData\.get\("price_per_kg_locked"\)/.test(sign) && !/formData\.get\("quantity_frozen_kg"\)/.test(sign) && sign.includes('update({ signed_at: new Date().toISOString(), status: "active" })'));
  check("y se niega si el contrato nació vacío", sign.includes("contract.price_per_kg_locked == null || contract.quantity_frozen_kg == null"));
  const tab = lee("src/components/kaffetal-regal/panel/ContratosTab.tsx");
  check("el productor decide con la calculadora (simularTrato) y marca las condiciones", tab.includes("simularTrato({ declaradoKg, copKg: offer.pricePerKg, declaracion") && tab.includes("aceptaTerminos: acepta"));
  check("y no puede aceptar por debajo del mínimo ni sin marcar", tab.includes("Boolean(sim?.cumpleMinimo) && cabeEnMaximo && acepta"));
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

if (fallos.length) {
  console.error(`✗ qa-trato: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-trato: ${ok} comprobaciones OK, 0 fallos`);
