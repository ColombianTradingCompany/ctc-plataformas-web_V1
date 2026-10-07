"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { LUGAR_DE_ENTREGA_POR_DEFECTO } from "@/lib/trato/terminos";
import { formatCop } from "@/lib/arena/inscriptions";
import { CONTRATO_VERSION, textoDelContrato } from "@/lib/trato/contrato";
import { validarDeclaracion } from "@/lib/trato/minimos";
import { plazoDelSaco } from "@/lib/trato/despachos";
import { hoyEnColombia } from "@/lib/pvc/servicio";
import { condicionesDeFirma, type CondicionesDeFirma, type OfertaParaVentana } from "./ventanaDeOferta";
import { sincronizarListado } from "@/lib/trato/ventanaServidor";
import { fleteDeLaFila } from "@/lib/trato/flete";
import { ctcLotReference } from "@/components/kaffetal-regal/data";

// ── La respuesta del productor a una oferta (V5.18 · con declaración desde la V5.83 · por ventanas desde la V5.175) ──────────
// lot_offers es de solo lectura para el productor (RLS select-own); TODA escritura pasa por aquí con service role — el mismo
// patrón de src/lib/arena/producerActions.ts. Devuelve resultado, nunca lanza.
//
// ACEPTAR ES DONDE NACE EL CONTRATO, lleno y firmado por el productor. Desde la V5.175 (docs/PLAN_CICLOS.md) una participación en
// Cherry Picked ya no elige modalidad: la FECHA DE FIRMA decide la ventana, el retiro libre y la regla de precio
// (`condicionesDeFirma`, la misma cuenta que enseña la calculadora). El productor declara una cantidad (>= el mínimo; o, si la
// existencia del lote no le alcanza, hasta la mitad sin retiro), CTCx compra el SACO fuera de lo declarado y su despacho queda
// con plazo al cierre de la semana. Rechazar cierra la oferta con la nota del productor — y no crea nada.

export type RespuestaOferta = { ok: true } | { ok: false; message: string };

/** V5.168 (owner): la firma del productor con el dedo — su nombre y el trazo en PNG (data URL). */
export type FirmaDeAceptacion = { nombre: string; imagenPng: string };

const FIRMA_PREFIJO = "data:image/png;base64,";
const FIRMA_MAX_BYTES = 600_000;

export type DeclaracionDelProductor = {
  /** Lo que declara disponible para la ventana, kg de CPS. */
  lockedKg: number;
  /** Marcó la casilla de las condiciones (ventana, despachos, pago y calidad, retiro). */
  aceptaTerminos: boolean;
};

async function requireProducer(): Promise<{ userId: string } | { error: string }> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { error: "Inicie sesión de nuevo." };
  const service = createServiceRoleClient();
  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "producer") return { error: "Solo las cuentas de productor pueden responder ofertas." };
  return { userId: user.id };
}

export async function respondToOffer(
  offerId: string,
  respuesta: "aceptar" | "rechazar",
  note?: string,
  declaracion?: DeclaracionDelProductor,
  firma?: FirmaDeAceptacion
): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();

  const { data: offer } = await service
    .from("lot_offers")
    .select(
      "id, lot_id, producer_id, status, kind, grade_snapshot, season_id, price_per_kg, quantity_kg, terms_version, min_kg, max_kg, compra_inicial_kg, reference_price_source, reference_price_snapshot, pvc_edition_id, modificador_pct, expira_at, lugar_entrega, season_label, temporada_hasta, temporada_desde, precio_tope_kg, price_next_kg, pvc_next_edition_id, saco_kg, es_renovacion, renovacion_de, flete_region, flete_carga, lots(name)"
    )
    .eq("id", offerId)
    .maybeSingle();
  if (!offer || offer.producer_id !== auth.userId) return { ok: false, message: "Oferta no encontrada." };
  // V5.84 (fase 7, decisión 6): una cuenta congelada por ruptura no acepta ofertas (la congela y la reactiva el owner).
  if (respuesta === "aceptar") {
    const { data: perfil } = await service.from("producer_profiles").select("estado_cuenta").eq("profile_id", auth.userId).maybeSingle();
    if (perfil?.estado_cuenta === "congelada") return { ok: false, message: "Su cuenta está congelada por ruptura contractual: no puede aceptar ofertas. Escríbale a CTC para revisar su caso." };
  }
  // V5.169: una Selection en contraoferta (le toca a CTCx) se puede DESISTIR, no aceptar.
  if (offer.status !== "emitida" && !(respuesta === "rechazar" && offer.status === "contraofertada")) {
    return { ok: false, message: offer.status === "contraofertada" ? "Su contraoferta está en manos de CTCx: espere su respuesta." : "Esta oferta ya fue respondida o retirada." };
  }

  const lot = (Array.isArray(offer.lots) ? offer.lots[0] : offer.lots) as { name: string } | null;
  const cleanNote = note?.trim() || null;
  const now = new Date().toISOString();

  if (respuesta === "rechazar") {
    await service
      .from("lot_offers")
      .update({ status: "rechazada", responded_at: now, response_note: cleanNote })
      .eq("id", offerId);
    if (offer.kind === "directa") {
      await service.from("lot_offer_rondas").insert({ offer_id: offerId, autor: "productor", accion: "desiste", nota: cleanNote, created_by: auth.userId });
    }
    await service.from("audit_log").insert({
      entity_type: "lot_offer",
      entity_id: offer.lot_id,
      action: "offer_rejected",
      previous_status: "emitida",
      new_status: "rechazada",
      performed_by: auth.userId,
      notes: cleanNote?.slice(0, 300) ?? null,
    });
    return { ok: true };
  }

  // Una directa vence: pasada su ventana ya no se acepta (queda «expirada», con rastro).
  if (offer.expira_at && new Date(offer.expira_at).getTime() < Date.now()) {
    await service.from("lot_offers").update({ status: "expirada", responded_at: now }).eq("id", offerId);
    await service.from("audit_log").insert({ entity_type: "lot_offer", entity_id: offer.lot_id, action: "offer_expired", previous_status: "emitida", new_status: "expirada", performed_by: auth.userId });
    return { ok: false, message: `Esta oferta venció el ${new Date(offer.expira_at).toLocaleDateString("es-CO")}. CTC puede emitir otra.` };
  }

  // V5.169 (owner): CTCx ofrece una de dos cosas. Una compra de CTCx SELECTION se acepta tal cual se negoció (precio y kilos de la
  // última propuesta de CTCx): no lleva declaración. La PARTICIPACIÓN EN CHERRY PICKED se acepta con la declaración y la ventana
  // que decide la fecha de firma (V5.175).
  const esSelection = offer.kind === "directa";
  const maxKg = offer.max_kg != null ? Number(offer.max_kg) : null;
  let lockedKg: number | null = offer.quantity_kg != null ? Number(offer.quantity_kg) : null;
  let cond: Extract<CondicionesDeFirma, { abierta: true }> | null = null;
  let sinRetiro = false;
  const hoy = hoyEnColombia();
  if (esSelection) {
    if (lockedKg == null || lockedKg <= 0) return { ok: false, message: "Esta propuesta no tiene la cantidad acordada: pídale a CTCx que la precise." };
  } else if (offer.terms_version) {
    if (!declaracion) return { ok: false, message: "Esta oferta se acepta con su declaración: cuánto deja disponible y las condiciones." };
    if (!declaracion.aceptaTerminos) return { ok: false, message: "Para aceptar hay que marcar las condiciones de la ventana, los despachos, el pago y el retiro." };
    const c = await condicionesDeFirma(service, offer as unknown as OfertaParaVentana, hoy);
    if (!c.abierta) return { ok: false, message: c.motivo + (c.reabre ? ` Se puede firmar desde el ${c.reabre}.` : "") };
    if (c.existenciaKg == null) return { ok: false, message: "Antes de aceptar, registre la existencia total del lote (Ficha · A2): con ella se calcula lo que puede declarar." };
    const v = validarDeclaracion({ kg: Number(declaracion.lockedKg), minimo: c.minimoKg, disponibleKg: c.disponibleKg });
    if (!v.ok) return { ok: false, message: v.motivo };
    if (maxKg != null && Number(declaracion.lockedKg) > maxKg) return { ok: false, message: `Esta oferta admite hasta ${maxKg} kg.` };
    lockedKg = Number(declaracion.lockedKg);
    sinRetiro = !v.conRetiro;
    cond = c;
  }

  // V5.168 · LA FIRMA DEL PRODUCTOR: aceptar es firmar. Se valida y se guarda ANTES de crear el contrato (si la imagen no se
  // puede guardar, no nace un contrato sin firma). El texto firmado es el que arma `textoDelContrato` con estos mismos datos —
  // la pantalla le enseñó exactamente ese— y se guarda su huella SHA-256.
  if (!firma) return { ok: false, message: "Para aceptar hay que firmar el contrato (su nombre y su firma con el dedo)." };
  const nombreFirma = String(firma.nombre ?? "").replace(/\s+/g, " ").trim();
  if (nombreFirma.length < 5) return { ok: false, message: "Escriba su nombre completo para firmar." };
  if (typeof firma.imagenPng !== "string" || !firma.imagenPng.startsWith(FIRMA_PREFIJO)) return { ok: false, message: "La firma no llegó bien. Fírmela de nuevo." };
  const firmaBytes = Buffer.from(firma.imagenPng.slice(FIRMA_PREFIJO.length), "base64");
  if (firmaBytes.length < 200 || firmaBytes.length > FIRMA_MAX_BYTES) return { ok: false, message: "La firma no llegó bien. Fírmela de nuevo." };
  const lugarEntrega = (offer as { lugar_entrega?: string | null }).lugar_entrega?.trim() || LUGAR_DE_ENTREGA_POR_DEFECTO;
  // V5.175: el precio del trato es el de la regla de su ventana (vigente · promedio · siguiente); Selection, el negociado.
  const copKgTrato = cond ? cond.precioKg : Number(offer.price_per_kg);
  const texto = textoDelContrato({
    tipo: esSelection ? "selection" : "cherry_picked",
    ventana: cond ? { tipo: cond.ventana.tipo, desde: cond.ventana.desde, hasta: cond.ventana.hasta, ciclos: cond.ventana.ciclos, retiroLibrePct: cond.ventana.retiroLibrePct, precio: cond.ventana.precio } : null,
    sinRetiro,
    sacoKg: cond ? cond.sacoKg : null,
    esRenovacion: cond?.esRenovacion ?? false,
    minimoKg: cond ? cond.minimoKg : null,
    calidad: cond?.calidad ?? null,
    flete: fleteDeLaFila(offer),
    productorNombre: nombreFirma,
    productorDocumento: null,
    loteNombre: lot?.name ?? "—",
    loteReferencia: ctcLotReference(offer.lot_id),
    grado: offer.grade_snapshot,
    copKg: copKgTrato,
    declaradoKg: lockedKg ?? 0,
    lugarEntrega,
    termsVersion: offer.terms_version ?? null,
    temporada: (offer as { season_label?: string | null }).season_label ?? null,
  });
  const huella = createHash("sha256").update(texto, "utf8").digest("hex");
  const rutaFirma = `contratos/oferta-${offer.id}/firma-productor-${Date.now()}.png`;
  const { error: errorFirma } = await service.storage.from("kaffetal-media").upload(rutaFirma, firmaBytes, { contentType: "image/png", upsert: false });
  if (errorFirma) return { ok: false, message: "No se pudo guardar su firma. Intente de nuevo." };
  const h = await headers();
  const metaFirma = {
    user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    firmado_en: now,
  };

  // Aceptar ⇒ el contrato nace aquí, LLENO y FIRMADO por el productor, pendiente de la firma de CTC.
  const { data: contract, error } = await service
    .from("purchase_contracts")
    .insert({
      lot_id: offer.lot_id,
      status: "pending_signature",
      grade_snapshot: offer.grade_snapshot,
      season_id: offer.season_id,
      offer_id: offer.id,
      price_per_kg_locked: copKgTrato,
      quantity_frozen_kg: lockedKg,
      reference_price_source: offer.reference_price_source ?? null,
      reference_price_snapshot: offer.reference_price_snapshot != null ? Number(offer.reference_price_snapshot) : null,
      // V5.175 · la ventana (docs/PLAN_CICLOS.md): la decidió la fecha de firma. Las columnas del trato por meses quedan vacías.
      freeze_months: null,
      terms_version: offer.terms_version ?? null,
      declaracion: null,
      vigencia_desde: cond?.ventana.desde ?? hoy,
      vigencia_hasta: cond?.ventana.hasta ?? null,
      ventana_tipo: cond?.ventana.tipo ?? null,
      ventana_ciclos: cond?.ventana.ciclos ?? null,
      precio_regla: cond?.ventana.precio ?? null,
      retiro_libre_pct: cond ? (sinRetiro ? 0 : cond.ventana.retiroLibrePct) : null,
      sin_retiro: sinRetiro,
      minimo_kg: cond?.minimoKg ?? null,
      saco_kg: cond?.sacoKg ?? null,
      existencia_al_firmar: cond?.existenciaKg ?? null,
      calidad_snapshot: cond?.calidad ?? null,
      // V5.177: el Flete a CTCx de la oferta, congelado en el contrato (el texto firmado lo cita).
      flete_region: fleteDeLaFila(offer)?.region ?? null,
      flete_carga: fleteDeLaFila(offer)?.carga ?? null,
      renovacion_de: (offer as { renovacion_de?: string | null }).renovacion_de ?? null,
      pvc_edition_id: cond?.edicionId ?? offer.pvc_edition_id ?? null,
      modificador_pct: offer.modificador_pct != null ? Number(offer.modificador_pct) : null,
      lugar_entrega: lugarEntrega,
      producer_signed_at: now,
      producer_signer_name: nombreFirma,
      producer_signature_path: rutaFirma,
      producer_signature_meta: metaFirma,
      contract_text_version: CONTRATO_VERSION,
      contract_text_sha256: huella,
    })
    .select("id")
    .single();
  if (error || !contract) return { ok: false, message: "No se pudo crear el contrato. Intente de nuevo." };

  // V5.176: si el lote ya está publicado (una renovación), lo declarado entra a la vitrina de Cherry Picked.
  if (cond) await sincronizarListado(service, offer.lot_id);
  // V5.175: el SACO (primer contrato) o el ADELANTO (renovación) queda con su despacho: sale al cierre de la semana de firma.
  if (cond && cond.sacoKg > 0) {
    await service.from("contract_despachos").insert({
      contract_id: contract.id,
      tipo: cond.esRenovacion ? "adelanto" : "saco",
      kg: cond.sacoKg,
      cop_kg: copKgTrato,
      total_cop: Math.round(cond.sacoKg * copKgTrato),
      plazo: plazoDelSaco(hoy),
    });
  }

  await service
    .from("lot_offers")
    .update({
      status: "aceptada",
      responded_at: now,
      response_note: cleanNote,
      contract_id: contract.id,
      ...(cond ? { locked_kg: lockedKg, terms_accepted_at: now } : {}),
    })
    .eq("id", offerId);
  const ventanaTxt = cond ? ` · ventana ${cond.ventana.desde} → ${cond.ventana.hasta} (${cond.ventana.tipo}, retiro libre ${sinRetiro ? 0 : cond.ventana.retiroLibrePct} %) · declaró ${lockedKg} kg${sinRetiro ? " sin retiro (existencia insuficiente)" : ""} · saco ${cond.sacoKg} kg · términos ${offer.terms_version}` : esSelection ? ` · compra CTCx Selection de ${lockedKg} kg` : "";
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contract.id,
    action: "created",
    new_status: "pending_signature",
    performed_by: auth.userId,
    notes: `Nace de la oferta ${offer.kind} aceptada y FIRMADA por el productor (${nombreFirma}, texto ${CONTRATO_VERSION}, sha256 ${huella.slice(0, 12)}…) · ${formatCop(copKgTrato)}/kg${lockedKg ? ` · ${lockedKg} kg` : ""}${ventanaTxt}.`,
  });
  await service.from("audit_log").insert({
    entity_type: "lot_offer",
    entity_id: offer.lot_id,
    action: "offer_accepted",
    previous_status: "emitida",
    new_status: "aceptada",
    performed_by: auth.userId,
    notes: ventanaTxt.trim() || null,
  });
  await service.from("producer_comm_log").insert({
    producer_id: auth.userId,
    context_label: lot ? `Lote ${lot.name}` : null,
    lot_id: offer.lot_id,
    note: cond
      ? `Usted aceptó la invitación de CTCx y declaró ${lockedKg} kg de CPS para la ventana del ${cond.ventana.desde} al ${cond.ventana.hasta}, a ${formatCop(copKgTrato)}/kg.${cond.sacoKg > 0 ? ` CTCx le compra ${cond.sacoKg} kg ${cond.esRenovacion ? "por adelantado" : "(el saco)"}: despáchelo a más tardar el ${plazoDelSaco(hoy)}.` : ""} El contrato queda vigente con la firma de CTCx; lo verá en «Contratos y Compras».`
      : "Usted aceptó la oferta de CTC. El contrato quedó creado con el precio de la oferta, pendiente de la firma de CTC — lo verá avanzar en «Contratos y Compras» → Contratos de Temporada.",
    created_by: auth.userId,
  });

  return { ok: true };
}

// ── V5.169 (owner, 2026-10-06) · la CONTRAOFERTA de una compra de CTCx Selection ─────────────────────────────────────────
// «El Productor puede contestar rebatiendo con una contraoferta, llevándolo de nuevo a OCP para que CTCx responda. Esto puede
// suceder las veces que se quiera hasta que alguno de los dos acepte o desista del todo.» La contraoferta queda en
// `lot_offer_rondas` y la oferta pasa a «contraofertada» (le toca a CTCx en «Pendiente de Oferta» → Abiertas).
export async function contraofertarSeleccion(offerId: string, precioKg: number, kg: number, nota?: string): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const { data: offer } = await service.from("lot_offers").select("id, lot_id, producer_id, status, kind, price_per_kg, lots(name)").eq("id", offerId).maybeSingle();
  if (!offer || offer.producer_id !== auth.userId) return { ok: false, message: "Oferta no encontrada." };
  if (offer.kind !== "directa") return { ok: false, message: "Solo una compra de CTCx Selection se negocia con contraofertas." };
  if (offer.status !== "emitida") return { ok: false, message: offer.status === "contraofertada" ? "Ya envió una contraoferta: espere la respuesta de CTCx." : "Esta propuesta ya no está abierta." };
  const p = Number(precioKg);
  const q = Number(kg);
  if (!Number.isFinite(p) || p <= 0) return { ok: false, message: "Escriba el precio por kg que propone." };
  if (!Number.isFinite(q) || q <= 0) return { ok: false, message: "Escriba cuántos kilos propone vender." };
  const limpia = nota?.trim().slice(0, 600) || null;
  const { error } = await service.from("lot_offer_rondas").insert({ offer_id: offerId, autor: "productor", accion: "contraoferta", price_per_kg: p, quantity_kg: q, nota: limpia, created_by: auth.userId });
  if (error) return { ok: false, message: "No se pudo enviar la contraoferta. Intente de nuevo." };
  await service.from("lot_offers").update({ status: "contraofertada" }).eq("id", offerId);
  const lot = (Array.isArray(offer.lots) ? offer.lots[0] : offer.lots) as { name: string } | null;
  await service.from("audit_log").insert({ entity_type: "lot_offer", entity_id: offer.lot_id, action: "offer_countered", previous_status: "emitida", new_status: "contraofertada", performed_by: auth.userId, notes: `Contraoferta del productor: ${formatCop(p)}/kg · ${q} kg${limpia ? ` · ${limpia.slice(0, 200)}` : ""}` });
  await service.from("producer_comm_log").insert({ producer_id: auth.userId, context_label: lot ? `Lote ${lot.name}` : null, lot_id: offer.lot_id, note: `Usted envió una contraoferta a CTCx Selection: ${formatCop(p)}/kg por ${q} kg. CTCx la responde (acepta, contraoferta o desiste).`, created_by: auth.userId });
  return { ok: true };
}

// ── V5.175 (docs/PLAN_CICLOS.md §2–§4) · la VISTA PREVIA de lo que el productor firmaría hoy ─────────────────────────────────
// La calculadora no decide nada: le pide al servidor la misma cuenta que hará al aceptar (`condicionesDeFirma`).
export type VistaPreviaDeOferta = { ok: true; c: CondicionesDeFirma } | { ok: false; message: string };

export async function previsualizarOferta(offerId: string): Promise<VistaPreviaDeOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const { data: offer } = await service
    .from("lot_offers")
    .select("id, lot_id, producer_id, status, kind, grade_snapshot, price_per_kg, modificador_pct, min_kg, saco_kg, es_renovacion, flete_region, flete_carga, pvc_edition_id, reference_price_source")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer || offer.producer_id !== auth.userId) return { ok: false, message: "Oferta no encontrada." };
  if (offer.kind === "directa") return { ok: false, message: "Una compra de CTCx Selection no lleva ventana." };
  return { ok: true, c: await condicionesDeFirma(service, offer as unknown as OfertaParaVentana, hoyEnColombia()) };
}

// ── V5.175 (docs/PLAN_CICLOS.md §7) · la EXISTENCIA del lote, también cuando la Ficha ya no se edita ───────────────────────────
// El guard de `lots` impide al productor tocar un lote que avanzó en el circuito; la existencia (A2) se registra o reconfirma
// aquí, con service role, solo para su dueño, con auditoría — y se espeja en la Ficha (`datasheet.existencia_cps_kg`).
export async function registrarExistencia(lotId: string, kg: number): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const n = Math.round(Number(kg) * 10) / 10;
  if (!Number.isFinite(n) || n <= 0) return { ok: false, message: "Escriba la existencia del lote en kg de CPS." };
  const service = createServiceRoleClient();
  const { data: lot } = await service.from("lots").select("id, producer_id, existencia_cps_kg, datasheet").eq("id", lotId).maybeSingle();
  if (!lot || lot.producer_id !== auth.userId) return { ok: false, message: "Lote no encontrado." };
  const datasheet = { ...((lot.datasheet as Record<string, unknown> | null) ?? {}), existencia_cps_kg: String(n) };
  const { error } = await service.from("lots").update({ existencia_cps_kg: n, datasheet }).eq("id", lotId);
  if (error) return { ok: false, message: "No se pudo guardar la existencia: " + error.message };
  await service.from("audit_log").insert({ entity_type: "lot", entity_id: lotId, action: "existencia_registrada", performed_by: auth.userId, notes: `Existencia de CPS: ${lot.existencia_cps_kg ?? "—"} → ${n} kg.` });
  return { ok: true };
}
