"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { officialAverages, type EvaluationRow } from "@/lib/evaluations";
import { currentSeason, seasonKey, seasonLabel, type Season } from "@/lib/arena/seasons";
import { formatCop } from "@/lib/arena/inscriptions";
import { esGradoValido, type GradoId } from "@/lib/grados/definicion";
import { lecturaDeMercado, pvcParaGrado, type PvcDeGrado } from "@/lib/pvc/servicio";
import { esPastCrop } from "@/lib/trato/mesAMes";
import { LUGAR_DE_ENTREGA_POR_DEFECTO, modificadorDeOferta, TERMINOS_VERSION, VENTANA_DIRECTA_DIAS } from "@/lib/trato/terminos";
import { minimoDelGrado } from "@/lib/trato/minimos";
import { esRegionDeFlete, REGION_DE_FLETE_LABEL, type RegionDeFlete } from "@/lib/trato/flete";
import { ADELANTO_RENOVACION_KG, SACO_INICIAL_KG } from "@/lib/trato/terminos";

// ── Ofertas: CTCx decide y oferta, el productor acepta (V5.18 · anclada al PVC desde la V5.82) ────
// El circuito comercial del galardón, folio 8 del owner (pasos 13–14 y 19; fase 5 del PLAN_CIRCUITO_DEL_LOTE).
// CTCx decide si «tiene sentido comercial» ofertar (por defecto sí; puede no ofertar, sin devolución) y EMITE la
// oferta desde aquí; el productor la acepta o la rechaza desde «Contratos y Compras». EL CONTRATO NACE DE LA
// ACEPTACIÓN (src/lib/ofertas/producerActions.ts), no de la emisión ni del veredicto.
//
// EL PRECIO YA NO SE TECLEA (V5.82): sale de `pvcParaGrado` —la edición del PVC vigente el día de emitir, la banda
// del grado y el % de modificación del trato— y la oferta guarda de qué edición salió, el COP/kg base y el %:
//   · temporada — black | red | blue | gold (Black desde la V5.85): el «Lote de Temporada» del trimestre por comenzar, al PVC × multiplicador,
//     con el mínimo del grado (respuesta 1), los términos versionados y la compra inmediata de UNA carga por CTCx.
//     Si el lote es de la temporada pasada, −10 % (past crop).
//   · directa — black | red | blue | gold: CTCx Selection (paso 19): PVC − 8 %, ventana de 30 días, cantidad mín./máx.
//     Su aceptación es una COMPRA EN FIRME: al pagar el mes queda en `compras` (V5.85, fase 8).
//   · excepcion — black | red | blue | gold: precio a mano CON motivo. Existe para no bloquear la operación; deja rastro.
//   · black — clase HISTÓRICA (precio negociado a mano) de la compra directa de un Black; desde la V5.85 nadie la emite
//     (el CRM de `black_negotiations` se retiró): un Black va por `directa`. Sigue contando como compra en firme.
//   · subasta — tyrian: «el podio de los mejores, al mejor postor»; se registra el mejor postor (Tyrian no tiene
//     escalón en el PVC: se subasta — respuesta 3).
//
// Regla de temporada (owner): solo lotes galardonados EN esta temporada o en la pasada (seasonKey, diferencia ≤ 1).
// El encuadre viaja congelado en la oferta (season_label + lote_de_temporada_pasada).

type Result = { ok: true } | { ok: false; error: string };

const PATHS = ["/ocp/ofertas", "/ocp/contratos", "/ocp/ctc-selection", "/ocp/kr", "/bcp"];
function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

export type OfferKind = "temporada" | "directa" | "excepcion" | "black" | "subasta";

/** Las clases cuyo precio sale del PVC. */
const ANCLADAS: readonly OfferKind[] = ["temporada", "directa"];
/** Las clases que el productor acepta CON declaración (cantidad ≥ mínimo, trimestre | 30 días, términos): las de temporada. */
const CON_DECLARACION: readonly OfferKind[] = ["temporada", "directa", "excepcion"];

/** El grado que cada clase de oferta admite — la puerta es por CLASE. */
function kindAllowsGrade(kind: OfferKind, grade: GradoId): boolean {
  // V5.85 (fase 8): el CRM de Black se retiró — un Black recibe las mismas clases que Red/Blue/Gold (el PVC tiene su banda ×1,15 y
  // `terminos.ts` su mínimo de 6 cargas); `black` (precio negociado a mano) queda como clase histórica, solo para Black.
  if (kind === "temporada" || kind === "directa" || kind === "excepcion") return grade === "black" || grade === "red" || grade === "blue" || grade === "gold";
  if (kind === "black") return grade === "black";
  return grade === "tyrian";
}

const numOpcional = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Emite una oferta sobre un lote galardonado. Reutilizable por la pantalla de
 * Ofertas (temporada · directa · excepcion · subasta) y por ofrecerRenovacion (temporada, V5.84).
 */
export async function emitOffer(lotId: string, kind: OfferKind, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const quantity = numOpcional(formData.get("quantity_kg"));
  if (quantity !== null && (Number.isNaN(quantity) || quantity <= 0)) {
    return { ok: false, error: "La cantidad, si se indica, debe ser mayor que 0 kg." };
  }
  const maxKg = numOpcional(formData.get("max_kg"));
  if (maxKg !== null && (Number.isNaN(maxKg) || maxKg <= 0)) return { ok: false, error: "El máximo, si se indica, debe ser mayor que 0 kg." };
  const notes = String(formData.get("notes") || "").trim() || null;
  // V5.168 (owner): CTCx CONFIRMA al emitir la cantidad mínima disponible de CPS y las condiciones de entrega.
  const minConfirmado = numOpcional(formData.get("min_kg"));
  if (minConfirmado !== null && (Number.isNaN(minConfirmado) || minConfirmado <= 0)) return { ok: false, error: "La cantidad mínima, si se indica, debe ser mayor que 0 kg." };
  const lugarEntrega = String(formData.get("lugar_entrega") ?? "").trim() || LUGAR_DE_ENTREGA_POR_DEFECTO;
  // V5.175 (docs/PLAN_CICLOS.md §3): el saco que CTCx compra con la firma (primer contrato del lote: 70–200 kg) o, si el lote ya
  // tuvo contrato, la compra adelantada de la renovación (0–200 kg). Por encima de 200 kg ya es CTCx Selection.
  const sacoPedido = numOpcional(formData.get("saco_kg"));
  if (sacoPedido !== null && Number.isNaN(sacoPedido)) return { ok: false, error: "El saco se escribe en kg de CPS." };
  // V5.177 (owner, 2026-10-07 · docs/PLAN_CICLOS.md §6): la región del Flete a CTCx (de dónde despacha el productor). Su valor por
  // carga sale de la edición del PVC y se suma al precio final; la oferta congela región y valor.
  const regionPedida = String(formData.get("flete_region") ?? "").trim();
  if (regionPedida && !esRegionDeFlete(regionPedida)) return { ok: false, error: "La región del Flete a CTCx no es válida." };
  const fleteRegion: RegionDeFlete | null = esRegionDeFlete(regionPedida) ? regionPedida : null;

  const { data: lot } = await service
    .from("lots")
    .select("id, name, stage, grade, producer_id, season_id, ficha_variedad, ficha_proceso, harvest_to")
    .eq("id", lotId)
    .maybeSingle();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  // V5.84 (fase 7, decisión 6): a una cuenta congelada por ruptura no se le oferta; el owner la descongela primero.
  const { data: perfilProductor } = await service.from("producer_profiles").select("estado_cuenta").eq("profile_id", lot.producer_id).maybeSingle();
  if (perfilProductor?.estado_cuenta === "congelada") return { ok: false, error: "La cuenta de este productor está congelada por ruptura contractual — descongélela (owner) antes de ofertar." };
  // V5.84 · renovación (paso 18): la oferta nueva nace del contrato cumplido; se guarda de cuál.
  const renewalOf = String(formData.get("renewal_of_contract_id") ?? "").trim() || null;
  if (lot.stage !== "galardonado") return { ok: false, error: "Solo un lote galardonado puede recibir una oferta." };
  if (!lot.grade || !esGradoValido(lot.grade)) return { ok: false, error: "El lote no tiene un Grado CTC válido." };
  if (!kindAllowsGrade(kind, lot.grade)) {
    return { ok: false, error: `Un lote ${lot.grade} no entra en una oferta de clase «${kind}».` };
  }

  // «De esta temporada o la pasada» — la temporada del GALARDÓN es la de la
  // inscripción que lo evaluó (fallback: la de registro del lote). Un lote sin
  // temporada registrada no se bloquea: es un hueco de datos, no un lote viejo.
  const [{ data: ins }, vigente] = await Promise.all([
    service.from("arena_inscriptions").select("id, season_id, decision_comercial").eq("lot_id", lotId).maybeSingle(),
    currentSeason(service),
  ]);
  const gradingSeasonId = ins?.season_id ?? lot.season_id ?? null;
  let lotePasado = false;
  if (gradingSeasonId && vigente) {
    const { data: gs } = await service
      .from("harvest_seasons")
      .select("id, kind, year, arena_starts_at, arena_ends_at")
      .eq("id", gradingSeasonId)
      .maybeSingle();
    if (gs) {
      const diff = seasonKey(vigente as Season) - seasonKey(gs as Season);
      if (diff > 1) {
        return { ok: false, error: `Ese lote se galardonó hace ${diff} temporadas (${seasonLabel(gs as Season)}) — solo se ofertan lotes de esta temporada o la pasada.` };
      }
      lotePasado = diff === 1;
    }
  }

  // ── El precio: del PVC para las ancladas; a mano, con motivo, para la excepción; el acordado o el mejor postor
  //    para black y subasta. Para todas se guarda la referencia del PVC si la hay.
  // Past crop (paso 18, V5.84): un lote de la temporada pasada O con recolección final a más de 9 meses → −10 %.
  const pastCrop = lotePasado || esPastCrop(lot.harvest_to, new Date());
  const modificadorPct = ANCLADAS.includes(kind) ? modificadorDeOferta({ directa: kind === "directa", pastCrop }) : 0;
  if (ANCLADAS.includes(kind) && !fleteRegion) return { ok: false, error: "Elija la región del Flete a CTCx (de dónde despacha el productor)." };
  const pvc: PvcDeGrado | null = lot.grade === "tyrian" ? null : await pvcParaGrado(lot.grade, undefined, { modificadorPct, fleteRegion });
  let price: number;
  // V5.169 (owner): una compra de CTCx SELECTION propone un precio HASTA el PVC − 8 % (el tope) y una cantidad; se negocia.
  const esSelection = kind === "directa";
  let precioTope: number | null = null;
  if (ANCLADAS.includes(kind)) {
    if (!pvc) {
      return { ok: false, error: "No hay una edición del PVC vigente hoy para ese grado — publíquela en ECP · Modelo Económico antes de ofertar (o emita una excepción con motivo)." };
    }
    price = pvc.precio.copKgFinal;
    if (esSelection) {
      precioTope = pvc.precio.copKgFinal;
      const propuesto = numOpcional(formData.get("price_per_kg"));
      if (propuesto !== null) {
        if (Number.isNaN(propuesto) || propuesto <= 0) return { ok: false, error: "El precio propuesto debe ser mayor que 0." };
        if (propuesto > precioTope) return { ok: false, error: `Una compra de CTCx Selection va hasta el PVC − 8 % más el flete: ${formatCop(precioTope)}/kg como máximo.` };
        price = propuesto;
      }
      if (quantity === null) return { ok: false, error: "Una compra de CTCx Selection propone cuántos kilos compra: escriba la cantidad." };
    }
  } else {
    const typed = Number(String(formData.get("price_per_kg") ?? "").replace(",", "."));
    if (!Number.isFinite(typed) || typed <= 0) return { ok: false, error: "Escriba el precio ofrecido por kg (COP)." };
    if (kind === "excepcion" && !notes) return { ok: false, error: "Una oferta de excepción lleva su motivo en las notas — es lo que queda en el rastro." };
    price = typed;
  }

  // Una sola oferta abierta por lote (el índice parcial lo garantiza; esto da
  // el error legible). Y un lote con contrato vivo no se re-oferta.
  const [{ data: abierta }, { data: contratoVivo }] = await Promise.all([
    service.from("lot_offers").select("id").eq("lot_id", lotId).in("status", ["emitida", "contraofertada"]).maybeSingle(),
    service.from("purchase_contracts").select("id, vigencia_hasta").eq("lot_id", lotId).in("status", ["pending_signature", "active", "reconditioning"]),
  ]);
  if (abierta) return { ok: false, error: "Este lote ya tiene una oferta abierta — retírela antes de emitir otra." };
  // V5.176 (docs/PLAN_CICLOS.md §5): la RENOVACIÓN de una ventana convive con el contrato que renueva (las ventanas se pueden
  // sobrelapar); cualquier otro contrato vivo impide re-ofertar.
  const vivos = ((contratoVivo as { id: string; vigencia_hasta: string | null }[] | null) ?? []).filter((c) => c.id !== renewalOf);
  if (vivos.length) return { ok: false, error: "Este lote ya tiene un contrato vivo." };
  const renovado = renewalOf ? ((contratoVivo as { id: string; vigencia_hasta: string | null }[] | null) ?? []).find((c) => c.id === renewalOf) ?? null : null;

  // El puntaje del snapshot: la evaluación que RIGE el grado (V5.77; antes el promedio de las aceptadas).
  const { data: evalRows } = await service
    .from("lot_evaluations")
    .select("status, sca_total, factor_rendimiento, rige_grado, source, created_at")
    .eq("lot_id", lotId);
  const media = officialAverages(((evalRows as EvaluationRow[] | null) ?? []));

  const now = new Date();
  const esDirecta = kind === "directa";
  // V5.175: ¿el lote ya tuvo un contrato por ventana? Entonces no se repite el saco: es una compra adelantada (0–200 kg).
  const { data: previos } = await service.from("purchase_contracts").select("id").eq("lot_id", lotId).not("ventana_tipo", "is", null).neq("status", "cancelled").limit(1);
  const continuacion = Boolean(renewalOf) || ((previos as unknown[] | null) ?? []).length > 0;
  let sacoKg: number | null = null;
  if (CON_DECLARACION.includes(kind)) {
    const min = continuacion ? 0 : SACO_INICIAL_KG.min;
    sacoKg = sacoPedido ?? (continuacion ? ADELANTO_RENOVACION_KG.tipicoMin : SACO_INICIAL_KG.min);
    if (sacoKg < min || sacoKg > SACO_INICIAL_KG.max) {
      return { ok: false, error: continuacion ? `La compra adelantada va de 0 a ${SACO_INICIAL_KG.max} kg.` : `El saco de la firma va de ${SACO_INICIAL_KG.min} a ${SACO_INICIAL_KG.max} kg de CPS; por encima ya es CTCx Selection.` };
    }
  }
  // V5.175: la invitación vence al terminar la edición del PVC con que se emitió (su precio es de esa edición).
  const venceConLaEdicion = renovado?.vigencia_hasta
    ? new Date(`${renovado.vigencia_hasta}T23:59:59-05:00`).toISOString() // la renovación vence al terminar la ventana que renueva
    : CON_DECLARACION.includes(kind) && pvc?.edicion.validTo
      ? new Date(`${pvc.edicion.validTo}T23:59:59-05:00`).toISOString()
      : null;
  // V5.169: la referencia FNC del día y el fin de la Temporada Trimestral viajan congelados (la calculadora del productor los usa).
  const mercado = await lecturaDeMercado(10);
  // V5.175: el precio del PVC siguiente ya no viaja en la oferta: lo calcula el servidor al firmar, si la ventana lo pide
  // (`condicionesDeFirma`, src/lib/ofertas/ventanaDeOferta.ts).
  const { data: insertada, error } = await service.from("lot_offers").insert({
    lot_id: lotId,
    producer_id: lot.producer_id,
    season_id: vigente?.id ?? null,
    season_label: seasonLabel(vigente),
    lote_de_temporada_pasada: lotePasado,
    kind,
    status: "emitida",
    grade_snapshot: lot.grade,
    score_snapshot: media.scaAverage,
    variety_snapshot: lot.ficha_variedad || null,
    process_snapshot: lot.ficha_proceso || null,
    price_per_kg: price,
    quantity_kg: quantity,
    notes,
    emitted_by: adminId,
    // V5.82 · el anclaje: de qué edición salió el precio, el COP/kg base y el % aplicado; los términos con los que nace.
    pvc_edition_id: pvc?.edicion.id ?? null,
    pvc_cop_kg: pvc?.precio.copKg ?? null,
    modificador_pct: modificadorPct,
    reference_price_source: pvc ? `PVC ${pvc.edicion.code}` : null,
    reference_price_snapshot: pvc?.precio.copKg ?? null,
    // V5.83: toda oferta de Lote de Temporada (también la excepción) lleva términos y mínimo: el productor DECLARA al aceptar.
    terms_version: CON_DECLARACION.includes(kind) ? TERMINOS_VERSION : null,
    // V5.174: sin mínimo confirmado, el de la edición vigente (Modelo Económico).
    min_kg: CON_DECLARACION.includes(kind) ? (minConfirmado ?? minimoDelGrado(lot.grade, pvc?.edicion.minimosPorGrado)) : null,
    lugar_entrega: lugarEntrega,
    max_kg: esDirecta ? maxKg : null,
    ventana_dias: esDirecta ? VENTANA_DIRECTA_DIAS : null,
    expira_at: esDirecta ? new Date(now.getTime() + VENTANA_DIRECTA_DIAS * 86_400_000).toISOString() : venceConLaEdicion,
    compra_inicial_kg: null,
    saco_kg: sacoKg,
    // V5.177: el Flete a CTCx congelado (ya sumado a price_per_kg en las ancladas; en la excepción, el precio a mano lo incluye).
    flete_region: fleteRegion,
    flete_carga: fleteRegion && pvc ? pvc.precio.fleteCarga : null,
    es_renovacion: continuacion,
    renovacion_de: renewalOf,
    renewal_of_contract_id: renewalOf,
    precio_tope_kg: precioTope,
    fnc_carga_ref: mercado.fncHoy,
    temporada_hasta: pvc?.edicion.validTo ?? null,
    temporada_desde: pvc?.edicion.validFrom ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: "No se pudo emitir la oferta: " + error.message };
  if (esSelection && insertada) {
    await service.from("lot_offer_rondas").insert({ offer_id: insertada.id, autor: "ctcx", accion: "propone", price_per_kg: price, quantity_kg: quantity, nota: notes, created_by: adminId });
  }

  // Emitir reabre una decisión de «sin oferta», si la había.
  if (ins?.decision_comercial) {
    await service.from("arena_inscriptions").update({ decision_comercial: null, decision_comercial_at: null, decision_comercial_motivo: null }).eq("id", ins.id);
  }

  const anclaje = pvc ? ` · PVC ${pvc.edicion.code} ${pvc.precio.banda} ×${pvc.precio.mult}${modificadorPct ? ` ${modificadorPct > 0 ? "+" : ""}${modificadorPct} %` : ""}${fleteRegion ? ` + flete ${REGION_DE_FLETE_LABEL[fleteRegion]} ${formatCop(pvc.precio.fleteCarga)}/carga` : ""}` : "";
  await service.from("audit_log").insert({
    entity_type: "lot_offer",
    entity_id: lotId,
    action: "offer_emitted",
    new_status: "emitida",
    performed_by: adminId,
    notes: `${kind} · ${lot.grade} · ${formatCop(price)}/kg${quantity ? ` · ${quantity} kg` : ""}${anclaje}${minConfirmado ? ` · mínimo confirmado ${minConfirmado} kg` : ""} · entrega: ${lugarEntrega}${kind === "excepcion" ? ` · motivo: ${notes}` : ""}`,
  });
  const donde = kind === "subasta" ? "Subastas Tyrian" : kind === "black" ? "Ofertas Black" : esSelection ? "Compra CTCx Selection" : "Participación en Cherry Picked";
  const detalle =
    kind === "temporada"
      ? ` Es una invitación a participar en Cherry Picked${continuacion ? " (renovación)" : ""}: ${formatCop(price)}/kg de CPS anclados al PVC vigente${pastCrop ? " (past crop, −10 %)" : ""}${fleteRegion && pvc ? `, con el Flete a CTCx de ${REGION_DE_FLETE_LABEL[fleteRegion]} (${formatCop(pvc.precio.fleteCarga)} por carga) ya sumado` : ""}. La fecha en que firme decide su ventana (un ciclo, o extendida al siguiente); usted declara cuánto deja disponible (mínimo ${minConfirmado ?? minimoDelGrado(lot.grade, pvc?.edicion.minimosPorGrado) ?? "—"} kg por ventana)${sacoKg ? ` y CTCx le compra ${sacoKg} kg ${continuacion ? "por adelantado" : "(un saco)"} fuera de lo declarado` : ""}.`
      : kind === "directa"
        ? ` Es una propuesta de compra de CTCx Selection: ${quantity} kg de CPS a ${formatCop(price)}/kg. Ese precio NO es el PVC actual: es hasta el PVC − 8 %. Puede aceptarla, contraofertar o desistir.`
        : ` ${formatCop(price)}/kg de CPS.`;
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: `CTCx le envió una oferta por su lote galardonado (${lot.grade}).${detalle} Entrega: ${lugarEntrega} Revísela en «Contratos y Compras» → ${donde} — usted decide si la acepta o la rechaza.`,
    created_by: adminId,
  });

  revalidateAll();
  return { ok: true };
}

/** Retira una oferta abierta (emitida y sin responder). */
export async function retireOffer(offerId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const { data: offer } = await service.from("lot_offers").select("id, status, lot_id").eq("id", offerId).maybeSingle();
  if (!offer) return { ok: false, error: "Oferta no encontrada." };
  if (offer.status !== "emitida" && offer.status !== "contraofertada") return { ok: false, error: "Solo una oferta abierta puede retirarse." };
  await service.from("lot_offers").update({ status: "retirada", responded_at: new Date().toISOString() }).eq("id", offerId);
  await service.from("audit_log").insert({
    entity_type: "lot_offer",
    entity_id: offer.lot_id,
    action: "offer_retired",
    previous_status: "emitida",
    new_status: "retirada",
    performed_by: adminId,
  });
  revalidateAll();
  return { ok: true };
}

/**
 * V5.82 · Paso 13 del folio 8: «CTCx decide si tiene sentido comercial ofertar (por defecto sí; puede no ofertar, sin
 * devolución)». La decisión queda en la solicitud con su motivo; el lote sale de «Pendiente de Oferta» al estado
 * lateral «sin oferta» del circuito. Emitir una oferta después la reabre sola.
 */
export async function decidirNoOfertar(lotId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { ok: false, error: "Escriba por qué no se oferta — es lo que queda en el rastro." };

  const [{ data: lot }, { data: ins }, { data: abierta }] = await Promise.all([
    service.from("lots").select("id, name, stage, producer_id").eq("id", lotId).maybeSingle(),
    service.from("arena_inscriptions").select("id, decision_comercial").eq("lot_id", lotId).maybeSingle(),
    service.from("lot_offers").select("id").eq("lot_id", lotId).in("status", ["emitida", "contraofertada"]).maybeSingle(),
  ]);
  if (!lot || lot.stage !== "galardonado") return { ok: false, error: "Solo se decide sobre un lote galardonado." };
  if (!ins) return { ok: false, error: "Este lote no tiene solicitud de evaluación." };
  if (abierta) return { ok: false, error: "Este lote tiene una oferta abierta — retírela antes." };
  if (ins.decision_comercial === "sin_oferta") return { ok: false, error: "Ya se decidió no ofertar este lote." };

  const { error } = await service
    .from("arena_inscriptions")
    .update({ decision_comercial: "sin_oferta", decision_comercial_at: new Date().toISOString(), decision_comercial_motivo: motivo })
    .eq("id", ins.id);
  if (error) return { ok: false, error: "No se pudo guardar la decisión: " + error.message };
  await service.from("audit_log").insert({ entity_type: "lot", entity_id: lotId, action: "sin_oferta", performed_by: adminId, notes: motivo.slice(0, 300) });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: "CTCx decidió no emitir una oferta por su lote en esta temporada. Su galardón y su Ficha siguen vigentes; si las condiciones cambian, CTCx le escribirá.",
    created_by: adminId,
  });
  revalidateAll();
  return { ok: true };
}

/** Deshace un «sin oferta» (el lote vuelve a Pendiente de Oferta). */
export async function reabrirDecision(lotId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  const { data: ins } = await service.from("arena_inscriptions").select("id, decision_comercial").eq("lot_id", lotId).maybeSingle();
  if (!ins || ins.decision_comercial !== "sin_oferta") return { ok: false, error: "Este lote no tiene una decisión de «sin oferta»." };
  await service.from("arena_inscriptions").update({ decision_comercial: null, decision_comercial_at: null, decision_comercial_motivo: null }).eq("id", ins.id);
  await service.from("audit_log").insert({ entity_type: "lot", entity_id: lotId, action: "sin_oferta_reabierta", performed_by: permiso.userId });
  revalidateAll();
  return { ok: true };
}

/**
 * V5.169 (owner, 2026-10-06) · CTCx RESPONDE la contraoferta del productor en una compra de CTCx Selection: la acepta (si cabe en el
 * tope PVC − 8 %: la propuesta queda con el precio y los kilos del productor y él firma), contraoferta (precio ≤ tope y kilos) o
 * desiste. «Esto puede suceder las veces que se quiera hasta que alguno de los dos acepte o desista del todo.»
 */
export async function responderContraoferta(offerId: string, accion: "aceptar" | "contraofertar" | "desistir", formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const { data: offer } = await service.from("lot_offers").select("id, lot_id, producer_id, status, kind, precio_tope_kg, price_per_kg, quantity_kg, lots(name)").eq("id", offerId).maybeSingle();
  if (!offer || offer.kind !== "directa") return { ok: false, error: "Oferta de CTCx Selection no encontrada." };
  if (offer.status !== "contraofertada") return { ok: false, error: "Esta propuesta no está esperando la respuesta de CTCx." };
  const { data: ultima } = await service.from("lot_offer_rondas").select("price_per_kg, quantity_kg").eq("offer_id", offerId).eq("autor", "productor").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const tope = offer.precio_tope_kg != null ? Number(offer.precio_tope_kg) : null;
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 600) || null;
  const lot = (Array.isArray(offer.lots) ? offer.lots[0] : offer.lots) as { name: string } | null;
  let precio = Number(offer.price_per_kg);
  let kg = offer.quantity_kg != null ? Number(offer.quantity_kg) : null;
  let aviso = "";

  if (accion === "desistir") {
    await service.from("lot_offers").update({ status: "retirada", responded_at: new Date().toISOString() }).eq("id", offerId);
    await service.from("lot_offer_rondas").insert({ offer_id: offerId, autor: "ctcx", accion: "desiste", nota, created_by: adminId });
    aviso = "CTCx desistió de la compra de CTCx Selection. Su galardón y su Ficha siguen vigentes.";
  } else {
    if (accion === "aceptar") {
      if (!ultima?.price_per_kg) return { ok: false, error: "No hay una contraoferta del productor que aceptar." };
      precio = Number(ultima.price_per_kg);
      kg = ultima.quantity_kg != null ? Number(ultima.quantity_kg) : kg;
      if (tope != null && precio > tope) return { ok: false, error: `La contraoferta (${formatCop(precio)}/kg) supera el tope de PVC − 8 % (${formatCop(tope)}/kg): contraoferte o desista.` };
      aviso = `CTCx ACEPTÓ su contraoferta: ${kg} kg a ${formatCop(precio)}/kg. Solo falta que usted firme el contrato.`;
    } else {
      const p = numOpcional(formData.get("price_per_kg"));
      const q = numOpcional(formData.get("quantity_kg"));
      if (p === null || Number.isNaN(p) || p <= 0) return { ok: false, error: "Escriba el precio por kg de la contraoferta." };
      if (tope != null && p > tope) return { ok: false, error: `Hasta PVC − 8 %: ${formatCop(tope)}/kg como máximo.` };
      if (q !== null && (Number.isNaN(q) || q <= 0)) return { ok: false, error: "La cantidad debe ser mayor que 0." };
      precio = p;
      kg = q ?? kg;
      aviso = `CTCx respondió con una contraoferta: ${kg} kg a ${formatCop(precio)}/kg. Puede aceptarla, contraofertar de nuevo o desistir.`;
    }
    const { error } = await service.from("lot_offers").update({ status: "emitida", price_per_kg: precio, quantity_kg: kg }).eq("id", offerId);
    if (error) return { ok: false, error: "No se pudo responder: " + error.message };
    await service.from("lot_offer_rondas").insert({ offer_id: offerId, autor: "ctcx", accion: accion === "aceptar" ? "acepta" : "contraoferta", price_per_kg: precio, quantity_kg: kg, nota, created_by: adminId });
  }
  await service.from("audit_log").insert({ entity_type: "lot_offer", entity_id: offer.lot_id, action: `selection_${accion}`, performed_by: adminId, notes: `${accion} · ${formatCop(precio)}/kg${kg ? ` · ${kg} kg` : ""}${nota ? ` · ${nota.slice(0, 200)}` : ""}` });
  await service.from("producer_comm_log").insert({ producer_id: offer.producer_id, context_label: lot ? `Lote ${lot.name}` : null, lot_id: offer.lot_id, note: `${aviso}${nota ? ` Nota de CTCx: ${nota}` : ""}`, created_by: adminId });
  revalidateAll();
  return { ok: true };
}
