import "server-only";

// ── Aceptar una oferta: la validación y el nacimiento del contrato, en UN sitio (V5.190) ───────────────────────────────────
// Hasta la V5.189 todo vivía dentro de `respondToOffer`. La V5.190 suma un segundo camino —la ACEPTACIÓN PROVISIONAL de CTCx en una
// sesión asistida (owner, 2026-10-08)— y los dos crean el mismo contrato: lo que cambia es QUIÉN acepta (el productor con su firma, o
// CTCx con el nombre de un responsable) y el estado con que nace. Un solo insert para los dos, para que un cambio de esquema no se
// arregle en uno y se olvide en el otro (así se escapó `freeze_months`: NOT NULL en la base, null en el insert — ver
// `docs/migraciones/2026-10-08_contrato_provisional.sql`).

import { headers } from "next/headers";
import { createSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";
import { esSesionAsistida } from "@/lib/asistencia/marca";
import { LUGAR_DE_ENTREGA_POR_DEFECTO } from "@/lib/trato/terminos";
import { validarDeclaracion } from "@/lib/trato/minimos";
import { plazoDelSaco } from "@/lib/trato/despachos";
import { hoyEnColombia } from "@/lib/pvc/servicio";
import { fechaParaElProductor } from "@/lib/trato/fechas";
import { fleteDeLaFila } from "@/lib/trato/flete";
import { condicionesDeFirma, type CondicionesDeFirma, type OfertaParaVentana } from "./ventanaDeOferta";

type Servicio = ReturnType<typeof createServiceRoleClient>;

export type DeclaracionDelProductor = {
  /** Lo que declara disponible para la ventana, kg de CPS. */
  lockedKg: number;
  /** Marcó la casilla de las condiciones (ventana, despachos, pago y calidad, retiro). */
  aceptaTerminos: boolean;
};

export async function requireProducer(): Promise<{ userId: string } | { error: string }> {
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

/** V5.190: ¿quien está delante es CTCx en una SESIÓN ASISTIDA de este productor? La marca (`marca.ts`) es solo un rótulo: lo que
 *  cuenta es que, además, el navegador traiga una sesión de CONSOLA de un colaborador del OCP con nivel para emitir (la cookie del
 *  panel es compartida en *.ctcexport.com). Devuelve el usuario de consola, o null. */
export async function operadorDeLaAsistida(producerId: string): Promise<{ userId: string } | null> {
  const h = await headers();
  if (!esSesionAsistida(h.get("cookie"), producerId)) return null;
  return requireConsoleWrite("ocp", "emite");
}

export const OFERTA_COLUMNAS =
  "id, lot_id, producer_id, status, kind, grade_snapshot, season_id, price_per_kg, quantity_kg, terms_version, min_kg, max_kg, compra_inicial_kg, reference_price_source, reference_price_snapshot, pvc_edition_id, modificador_pct, expira_at, lugar_entrega, season_label, temporada_hasta, temporada_desde, precio_tope_kg, price_next_kg, pvc_next_edition_id, saco_kg, es_renovacion, renovacion_de, flete_region, flete_carga, lots(name)";

/** La fila de `lot_offers` con lo que la aceptación usa (el cliente de Supabase no está tipado: se lee con esta forma). */
export type OfertaFila = {
  id: string;
  lot_id: string;
  producer_id: string;
  status: string;
  kind: string;
  grade_snapshot: string | null;
  season_id: string | null;
  price_per_kg: number | string;
  quantity_kg: number | string | null;
  terms_version: string | null;
  max_kg: number | string | null;
  reference_price_source: string | null;
  reference_price_snapshot: number | string | null;
  pvc_edition_id: string | null;
  modificador_pct: number | string | null;
  expira_at: string | null;
  lugar_entrega: string | null;
  season_label: string | null;
  renovacion_de: string | null;
  flete_region: string | null;
  flete_carga: number | string | null;
  lots: { name: string } | { name: string }[] | null;
};

type CondAbierta = Extract<CondicionesDeFirma, { abierta: true }>;

/** Todo lo que una aceptación ya validó y con lo que nace el contrato. */
export type Aceptable = {
  offer: OfertaFila;
  lot: { name: string } | null;
  esSelection: boolean;
  cond: CondAbierta | null;
  lockedKg: number | null;
  sinRetiro: boolean;
  copKgTrato: number;
  lugarEntrega: string;
  hoy: string;
  now: string;
};

export async function cargarOferta(service: Servicio, userId: string, offerId: string): Promise<OfertaFila | null> {
  const { data } = await service.from("lot_offers").select(OFERTA_COLUMNAS).eq("id", offerId).maybeSingle();
  const offer = data as OfertaFila | null;
  return offer && offer.producer_id === userId ? offer : null;
}

/** Valida una ACEPTACIÓN (cuenta no congelada, oferta abierta y vigente, la declaración y la ventana de hoy). La oferta vencida se
 *  marca «expirada», con rastro, como siempre. */
export async function validarAceptacion(service: Servicio, userId: string, offer: OfertaFila, declaracion: DeclaracionDelProductor | undefined): Promise<{ ok: true; a: Aceptable } | { ok: false; message: string }> {
  // V5.84 (fase 7, decisión 6): una cuenta congelada por ruptura no acepta ofertas (la congela y la reactiva el owner).
  const { data: perfil } = await service.from("producer_profiles").select("estado_cuenta").eq("profile_id", userId).maybeSingle();
  if (perfil?.estado_cuenta === "congelada") return { ok: false, message: "Su cuenta está congelada por ruptura contractual: no puede aceptar ofertas. Escríbale a CTCx para revisar su caso." };
  if (offer.status !== "emitida") {
    return { ok: false, message: offer.status === "contraofertada" ? "Su contraoferta está en manos de CTCx: espere su respuesta." : "Esta oferta ya fue respondida o retirada." };
  }
  const now = new Date().toISOString();
  // Una oferta vence: pasada su ventana ya no se acepta (queda «expirada», con rastro).
  if (offer.expira_at && new Date(offer.expira_at).getTime() < Date.now()) {
    await service.from("lot_offers").update({ status: "expirada", responded_at: now }).eq("id", offer.id);
    await service.from("audit_log").insert({ entity_type: "lot_offer", entity_id: offer.lot_id, action: "offer_expired", previous_status: "emitida", new_status: "expirada", performed_by: userId });
    return { ok: false, message: `Esta oferta venció el ${fechaParaElProductor(offer.expira_at)}. CTCx puede emitir otra.` };
  }
  // V5.169 (owner): una compra de CTCx SELECTION se acepta tal cual se negoció (precio y kilos de la última propuesta de CTCx): no lleva
  // declaración. La PARTICIPACIÓN EN CHERRY PICKED se acepta con la declaración y la ventana que decide la fecha de firma (V5.175).
  const esSelection = offer.kind === "directa";
  const maxKg = offer.max_kg != null ? Number(offer.max_kg) : null;
  let lockedKg: number | null = offer.quantity_kg != null ? Number(offer.quantity_kg) : null;
  let cond: CondAbierta | null = null;
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
  const lot = (Array.isArray(offer.lots) ? offer.lots[0] : offer.lots) ?? null;
  return {
    ok: true,
    a: {
      offer,
      lot,
      esSelection,
      cond,
      lockedKg,
      sinRetiro,
      // V5.175: el precio del trato es el de la regla de su ventana (vigente · promedio · siguiente); Selection, el negociado.
      copKgTrato: cond ? cond.precioKg : Number(offer.price_per_kg),
      lugarEntrega: offer.lugar_entrega?.trim() || LUGAR_DE_ENTREGA_POR_DEFECTO,
      hoy,
      now,
    },
  };
}

/** Quién acepta y cómo nace el contrato. */
export type Nacimiento = {
  /** El productor firmó (V5.168): nace pendiente de la firma de CTCx. */
  firmante: { nombre: string; documentoTipo: string; documentoNumero: string; rutaFirma: string; meta: Record<string, unknown> } | null;
  /** V5.190: CTCx aceptó provisionalmente en una sesión asistida: nace VIGENTE (firmado por CTCx) y sin firma del productor. */
  provisional: { responsable: string; operador: string } | null;
  textoVersion: string;
  textoSha256: string;
  /** Quién queda en `audit_log.performed_by`. */
  actor: string;
  notaAuditoria: string;
};

/** El insert del contrato y lo que lo acompaña (saco, vitrina, oferta aceptada, rastro). Devuelve el id, o el motivo con el código de
 *  Postgres: el detalle va al registro del servidor, el productor recibe un mensaje que se puede leer. */
export async function crearContratoDeOferta(service: Servicio, a: Aceptable, n: Nacimiento): Promise<{ ok: true; contractId: string } | { ok: false; message: string }> {
  const { offer, cond, lockedKg, sinRetiro, copKgTrato, now, hoy } = a;
  const { data: contract, error } = await service
    .from("purchase_contracts")
    .insert({
      lot_id: offer.lot_id,
      status: n.provisional ? "active" : "pending_signature",
      signed_at: n.provisional ? now : null,
      grade_snapshot: offer.grade_snapshot,
      season_id: offer.season_id,
      offer_id: offer.id,
      price_per_kg_locked: copKgTrato,
      quantity_frozen_kg: lockedKg,
      reference_price_source: offer.reference_price_source ?? null,
      reference_price_snapshot: offer.reference_price_snapshot != null ? Number(offer.reference_price_snapshot) : null,
      // V5.175 · la ventana (docs/PLAN_CICLOS.md): la decidió la fecha de firma. Las columnas del trato por meses quedan vacías
      // (`freeze_months` admite null desde la V5.190: la V5.175 la había dejado NOT NULL y el insert fallaba con 23502).
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
      renovacion_de: offer.renovacion_de ?? null,
      pvc_edition_id: cond?.edicionId ?? offer.pvc_edition_id ?? null,
      modificador_pct: offer.modificador_pct != null ? Number(offer.modificador_pct) : null,
      lugar_entrega: a.lugarEntrega,
      producer_signed_at: n.firmante ? now : null,
      producer_signer_name: n.firmante?.nombre ?? null,
      producer_signer_doc_tipo: n.firmante?.documentoTipo ?? null,
      producer_signer_doc_numero: n.firmante?.documentoNumero ?? null,
      producer_signature_path: n.firmante?.rutaFirma ?? null,
      producer_signature_meta: n.firmante?.meta ?? null,
      provisional_at: n.provisional ? now : null,
      provisional_responsable: n.provisional?.responsable ?? null,
      provisional_por: n.provisional?.operador ?? null,
      provisional_sha256: n.provisional ? n.textoSha256 : null,
      contract_text_version: n.textoVersion,
      contract_text_sha256: n.textoSha256,
    })
    .select("id")
    .single();
  if (error || !contract) {
    // El detalle (código, mensaje y pista de Postgres) va al registro del servidor; al productor, un mensaje con el código.
    console.error("crearContratoDeOferta: el insert de purchase_contracts falló", { offerId: offer.id, code: error?.code, message: error?.message, details: error?.details, hint: error?.hint });
    return { ok: false, message: `No se pudo crear el contrato${error?.code ? ` (código ${error.code})` : ""}. Intente de nuevo; si se repite, escríbale a CTCx con ese código.` };
  }

  // V5.176–V5.195 lo declarado entraba solo a la vitrina (`sincronizarListado`). Desde la V5.196 entra cuando CTCx lo declara en el
  // Triage de Catálogo Activo (`/ocp/contratos`), con su FOB mínimo: el contrato nuevo aparece allí como entrada por declarar.
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
    .update({ status: "aceptada", responded_at: now, contract_id: contract.id, ...(cond ? { locked_kg: lockedKg, terms_accepted_at: now } : {}) })
    .eq("id", offer.id);
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contract.id,
    action: n.provisional ? "accepted_provisionally" : "created",
    new_status: n.provisional ? "active" : "pending_signature",
    performed_by: n.actor,
    notes: n.notaAuditoria,
  });
  await service.from("audit_log").insert({
    entity_type: "lot_offer",
    entity_id: offer.lot_id,
    action: n.provisional ? "offer_accepted_provisionally" : "offer_accepted",
    previous_status: "emitida",
    new_status: "aceptada",
    performed_by: n.actor,
    notes: cond ? `ventana ${cond.ventana.desde} → ${cond.ventana.hasta} · declaró ${lockedKg} kg · saco ${cond.sacoKg} kg` : null,
  });
  return { ok: true, contractId: contract.id };
}
