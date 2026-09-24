"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/panel/ActionForm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { emitOffer } from "./ofertasActions";
import { renovacionDebida } from "@/lib/trato/mesAMes";
import { RENOVACION_DIAS } from "@/lib/trato/terminos";
import { esCompraEnFirme } from "@/lib/compras/reglas";


// Devuelve resultado en vez de lanzar: "ya fue firmado" y el gate del Club son
// rechazos alcanzables desde el botón de firmar, y un throw en una form action
// revienta la página (ver ActionForm.tsx).
export async function signContract(
  contractId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { data: contract } = await service
    .from("purchase_contracts")
    .select("status, lot_id, price_per_kg_locked, quantity_frozen_kg")
    .eq("id", contractId)
    .single();
  if (!contract) return { ok: false, error: "Contrato no encontrado." };
  if (contract.status !== "pending_signature") return { ok: false, error: "Este contrato ya fue firmado." };

  // V5.77: el gate del Kaffetal Club se retiró (PLAN_CIRCUITO_DEL_LOTE §3): la firma nace del trato.
  // V5.83 (fase 6): el contrato NACE LLENO de la oferta aceptada con la declaración del productor —precio, cantidad y
  // referencia ya están— y CTCx solo FIRMA. Nada se teclea aquí; `formData` queda por la firma de <ActionForm>.
  void formData;
  if (contract.price_per_kg_locked == null || contract.quantity_frozen_kg == null) {
    return { ok: false, error: "Este contrato nació sin precio o sin cantidad (anterior a la V5.83): retire la oferta y emita otra para que el productor acepte con su declaración." };
  }

  await service
    .from("purchase_contracts")
    .update({ signed_at: new Date().toISOString(), status: "active" })
    .eq("id", contractId);

  // V5.84 (fase 7): la escalera 50/75/100 de `contract_releases` se retiró. El trato se lleva MES A MES en
  // `contract_months` (pedir · enviar · pagar · retirar); `contract_releases` queda como espejo de cada envío para que
  // `lot_listings.total_kg` (trigger `contract_releases_sync_listing_total`) y `publishLot` sigan leyendo lo mismo.

  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contractId,
    action: "signed",
    previous_status: "pending_signature",
    new_status: "active",
    performed_by: adminId,
  });

  revalidatePath("/ocp/contratos");
  revalidatePath(`/ocp/contratos/${contractId}`);
  return { ok: true };
}

// ── El trato mes a mes (fase 7 del PLAN_CIRCUITO_DEL_LOTE, V5.84) ────────────────────────────
// Folio 8, pasos 16–18 y decisión 6 del owner. CTCx PIDE una cantidad del café declarado (paso 17), el productor la
// envía y CTC registra el recibo, CTC PAGA en la primera semana del mes siguiente; el productor RETIRA desde su panel
// (`src/lib/trato/producerActions.ts`). La mora y la ruptura potencial se DERIVAN (`src/lib/trato/mesAMes.ts`) y se
// pintan; la RUPTURA la declara el owner a mano y congela la cuenta; la RENOVACIÓN a los ~90 días emite una oferta
// nueva anclada al PVC vigente. Cada envío se espeja en `contract_releases` (una fila por mes, 100 %) porque el
// catálogo público lee de ahí su stock.

type MesRow = { id: string; mes: number; pedido_at: string | null; enviado_kg: number | string | null;
  enviado_at: string | null; pagado_at: string | null };

async function contratoYMeses(service: ReturnType<typeof createServiceRoleClient>, contractId: string) {
  const [{ data: contract }, { data: meses }] = await Promise.all([
    service.from("purchase_contracts").select("id, lot_id, status, quantity_frozen_kg, price_per_kg_locked, freeze_months, signed_at, grade_snapshot, offer_id, pvc_edition_id, modificador_pct, reference_price_source, lots(name, producer_id)").eq("id", contractId).maybeSingle(),
    service.from("contract_months").select("id, mes, pedido_at, enviado_kg, enviado_at, pagado_at").eq("contract_id", contractId),
  ]);
  const lot = (Array.isArray(contract?.lots) ? contract?.lots[0] : contract?.lots) as { name: string; producer_id: string } | null;
  return { contract, lot, meses: ((meses as MesRow[] | null) ?? []) };
}

const mesValido = (contract: { freeze_months: number | null } | null, mes: number) => {
  const meses = contract?.freeze_months && contract.freeze_months > 0 ? Math.min(3, contract.freeze_months) : 3;
  return Number.isInteger(mes) && mes >= 1 && mes <= meses;
};

/** Si todos los meses del periodo están enviados y pagados, el trato queda cumplido (sin tocar nada más). */
async function cerrarSiCumplido(service: ReturnType<typeof createServiceRoleClient>, contractId: string, adminId: string) {
  const { contract, meses } = await contratoYMeses(service, contractId);
  if (!contract || contract.status !== "active") return;
  const n = contract.freeze_months && contract.freeze_months > 0 ? Math.min(3, contract.freeze_months) : 3;
  const cerrado = meses.length >= n && meses.every((m) => m.enviado_at && m.pagado_at);
  if (!cerrado) return;
  await service.from("purchase_contracts").update({ status: "completed" }).eq("id", contractId);
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: contractId, action: "completed", previous_status: "active", new_status: "completed", performed_by: adminId });
}

/** Paso 17: CTCx pide la cantidad del mes. Desde aquí corre el reloj de la mora del productor. */
export async function pedirDelMes(contractId: string, mes: number, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const kg = Number(String(formData.get("pedido_kg") ?? "").replace(",", "."));
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, error: "Escriba los kilos que CTC pide este mes." };
  const { contract, lot, meses } = await contratoYMeses(service, contractId);
  if (!contract || !lot || contract.status !== "active") return { ok: false, error: "Solo se pide sobre un trato vigente (firmado)." };
  if (!mesValido(contract, mes)) return { ok: false, error: "Ese mes no está en el periodo del trato." };
  const fila = meses.find((m) => m.mes === mes);
  if (fila?.enviado_at) return { ok: false, error: "Ese mes ya está enviado." };
  const now = new Date().toISOString();
  const { error } = fila
    ? await service.from("contract_months").update({ pedido_kg: kg, pedido_at: now, pedido_por: adminId }).eq("id", fila.id)
    : await service.from("contract_months").insert({ contract_id: contractId, mes, pedido_kg: kg, pedido_at: now, pedido_por: adminId });
  if (error) return { ok: false, error: "No se pudo registrar el pedido: " + error.message };
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: contractId, action: `mes_${mes}_pedido`, performed_by: adminId, notes: `${kg} kg` });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: contract.lot_id,
    note: `CTC le pide ${kg} kg de CPS de su trato (mes ${mes}). Envíelos y CTC le paga en la primera semana del mes siguiente. Recuerde: dos semanas sin cargo; después corre el recargo del 5 %.`,
    created_by: adminId,
  });
  revalidatePath(`/ocp/contratos/${contractId}`);
  revalidatePath("/ocp/contratos");
  revalidatePath("/ocp/kr");
  return { ok: true };
}

/** El productor envió y CTC recibió: el mes queda enviado y se espeja en `contract_releases` (stock del catálogo). */
export async function registrarEnvioDelMes(contractId: string, mes: number, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const kg = Number(String(formData.get("enviado_kg") ?? "").replace(",", "."));
  const fecha = String(formData.get("enviado_at") ?? "").trim() || new Date().toISOString().slice(0, 10);
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, error: "Escriba los kilos que llegaron." };
  const { contract, meses } = await contratoYMeses(service, contractId);
  if (!contract || contract.status !== "active") return { ok: false, error: "Solo se registra sobre un trato vigente." };
  if (!mesValido(contract, mes)) return { ok: false, error: "Ese mes no está en el periodo del trato." };
  const fila = meses.find((m) => m.mes === mes);
  const { error } = fila
    ? await service.from("contract_months").update({ enviado_kg: kg, enviado_at: fecha }).eq("id", fila.id)
    : await service.from("contract_months").insert({ contract_id: contractId, mes, enviado_kg: kg, enviado_at: fecha });
  if (error) return { ok: false, error: "No se pudo registrar el envío: " + error.message };
  // El espejo que lee el catálogo público (`lot_listings.total_kg` por trigger) y la precondición de `publishLot`.
  await service
    .from("contract_releases")
    .upsert({ contract_id: contractId, month_number: mes, max_release_pct: 100, released_kg: kg, released_at: fecha, shipped_at: fecha }, { onConflict: "contract_id,month_number" });
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: contractId, action: `mes_${mes}_enviado`, performed_by: adminId, notes: `${kg} kg · ${fecha}` });
  await cerrarSiCumplido(service, contractId, adminId);
  revalidatePath(`/ocp/contratos/${contractId}`);
  revalidatePath("/ocp/contratos");
  revalidatePath("/ocp/kr");
  return { ok: true };
}

/** Paso 17: CTC paga en la primera semana del mes siguiente. */
export async function registrarPagoDelMes(contractId: string, mes: number, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const cop = Number(String(formData.get("pagado_cop") ?? "").replace(/\./g, "").replace(",", "."));
  const ref = String(formData.get("pago_ref") ?? "").trim() || null;
  const fecha = String(formData.get("pagado_at") ?? "").trim() || new Date().toISOString().slice(0, 10);
  if (!Number.isFinite(cop) || cop <= 0) return { ok: false, error: "Escriba el valor pagado (COP)." };
  const { contract, lot, meses } = await contratoYMeses(service, contractId);
  if (!contract || !lot || contract.status !== "active") return { ok: false, error: "Solo se registra sobre un trato vigente." };
  const fila = meses.find((m) => m.mes === mes);
  if (!fila?.enviado_at) return { ok: false, error: "Se paga lo enviado: registre primero el envío del mes." };
  const { error } = await service.from("contract_months").update({ pagado_cop: cop, pagado_at: fecha, pago_ref: ref }).eq("id", fila.id);
  if (error) return { ok: false, error: "No se pudo registrar el pago: " + error.message };
  await service.from("contract_releases").update({ payment_confirmed_at: fecha }).eq("contract_id", contractId).eq("month_number", mes);
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: contractId, action: `mes_${mes}_pagado`, performed_by: adminId, notes: `${cop} COP${ref ? ` · ${ref}` : ""} · ${fecha}` });
  // V5.85 (fase 8, paso 19): el pago de un mes de un contrato de COMPRA EN FIRME (oferta directa · black) queda documentado en
  // Compras: ese café es de CTCx y se ofrece como CTCx Selection. Un Lote de Temporada NO pasa por aquí (se vende a nombre del productor).
  const { data: oferta } = contract.offer_id ? await service.from("lot_offers").select("kind").eq("id", contract.offer_id).maybeSingle() : { data: null };
  const kgComprados = Number(fila.enviado_kg ?? 0);
  if (oferta && esCompraEnFirme(oferta.kind) && contract.grade_snapshot && contract.grade_snapshot !== "tyrian" && kgComprados > 0) {
    const compra = {
      lot_id: contract.lot_id,
      contract_id: contractId,
      mes,
      grado: contract.grade_snapshot,
      kg: kgComprados,
      cop_kg: Number(contract.price_per_kg_locked ?? 0) || Math.round(cop / kgComprados),
      total_cop: cop,
      pvc_edition_id: contract.pvc_edition_id ?? null,
      modificador_pct: contract.modificador_pct ?? null,
      precio_fuente: contract.reference_price_source ?? `oferta ${oferta.kind}`,
      acordada_at: contract.signed_at,
      recibida_at: fila.enviado_at,
      pagada_at: fecha,
      pago_ref: ref,
      origen: "contrato",
      registrada_por: adminId,
    };
    const { data: previa } = await service.from("compras").select("id").eq("contract_id", contractId).eq("mes", mes).maybeSingle();
    const { data: guardada } = previa
      ? await service.from("compras").update(compra).eq("id", previa.id).select("id").single()
      : await service.from("compras").insert(compra).select("id").single();
    if (guardada) await service.from("audit_log").insert({ entity_type: "compra", entity_id: guardada.id, action: "compra_registrada", performed_by: adminId, notes: `${lot.name} · mes ${mes} · ${kgComprados} kg · contrato` });
    revalidatePath("/ocp/compras");
    revalidatePath("/ocp/ctc-selection");
  }
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: contract.lot_id,
    note: `CTC pagó el mes ${mes} de su trato: $${cop.toLocaleString("es-CO")}${ref ? ` (ref. ${ref})` : ""}.`,
    created_by: adminId,
  });
  await cerrarSiCumplido(service, contractId, adminId);
  revalidatePath(`/ocp/contratos/${contractId}`);
  revalidatePath("/ocp/contratos");
  return { ok: true };
}

/**
 * Paso 18: a los ~90 días CTCx ofrece renovar con el PVC nuevo y una cantidad nueva. Emite una oferta de temporada
 * anclada (con past crop si toca) y deja el contrato cumplido como «renovado». Solo sobre un trato CUMPLIDO: uno
 * vigente se cierra primero (envíos y pagos).
 */
export async function ofrecerRenovacion(contractId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const { contract } = await contratoYMeses(service, contractId);
  if (!contract) return { ok: false, error: "Contrato no encontrado." };
  if (contract.status !== "completed") return { ok: false, error: "La renovación se ofrece sobre un trato cumplido (todos los meses enviados y pagados)." };
  if (!renovacionDebida(contract.signed_at, new Date())) return { ok: false, error: `La renovación se ofrece a los ${RENOVACION_DIAS} días de la firma.` };
  const fd = new FormData();
  fd.set("renewal_of_contract_id", contractId);
  fd.set("notes", "Renovación del trato: PVC vigente y cantidad nueva a declarar.");
  const res = await emitOffer(contract.lot_id, "temporada", fd);
  if (!res.ok) return res;
  const { data: nueva } = await service.from("lot_offers").select("id").eq("lot_id", contract.lot_id).eq("status", "emitida").order("emitted_at", { ascending: false }).limit(1).maybeSingle();
  await service.from("purchase_contracts").update({ status: "renovado", renovado_at: new Date().toISOString(), renewal_offer_id: nueva?.id ?? null }).eq("id", contractId);
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: contractId, action: "renovacion_ofrecida", previous_status: "completed", new_status: "renovado", performed_by: adminId, notes: nueva?.id ?? null });
  revalidatePath(`/ocp/contratos/${contractId}`);
  revalidatePath("/ocp/contratos");
  revalidatePath("/ocp/ofertas");
  return { ok: true };
}

/** Solo un owner del panel declara la ruptura o descongela una cuenta (decisión 6: nunca automática). */
async function esOwner(service: ReturnType<typeof createServiceRoleClient>, userId: string): Promise<boolean> {
  const { data } = await service.from("panel_users").select("is_owner, status").eq("profile_id", userId).maybeSingle();
  return Boolean(data?.is_owner && data?.status === "active");
}

/**
 * Paso 16: «después, Ruptura Contractual (cuenta congelada, demanda). Excepción: causa legítima comunicada antes».
 * La plataforma la hace VISIBLE (mora → ruptura potencial); declararla es del owner, a mano, con motivo, y congela la
 * cuenta del productor (`producer_profiles.estado_cuenta`).
 */
export async function declararRuptura(contractId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  if (!(await esOwner(service, adminId))) return { ok: false, error: "Solo el owner declara una ruptura contractual." };
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { ok: false, error: "Escriba el motivo — queda en el rastro y el productor lo lee." };
  const { contract, lot } = await contratoYMeses(service, contractId);
  if (!contract || !lot) return { ok: false, error: "Contrato no encontrado." };
  if (contract.status !== "active" && contract.status !== "reconditioning") return { ok: false, error: "Solo se declara sobre un trato vigente." };
  const now = new Date().toISOString();
  const { error } = await service.from("purchase_contracts").update({ status: "ruptura", ruptura_at: now, ruptura_motivo: motivo }).eq("id", contractId);
  if (error) return { ok: false, error: "No se pudo declarar la ruptura: " + error.message };
  await service.from("producer_profiles").update({ estado_cuenta: "congelada", estado_cuenta_at: now, estado_cuenta_motivo: motivo }).eq("profile_id", lot.producer_id);
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: contractId, action: "ruptura_declarada", previous_status: contract.status, new_status: "ruptura", performed_by: adminId, notes: motivo.slice(0, 300) });
  await service.from("audit_log").insert({ entity_type: "producer_profile", entity_id: lot.producer_id, action: "cuenta_congelada", performed_by: adminId, notes: motivo.slice(0, 300) });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: contract.lot_id,
    note: `CTC declaró la ruptura contractual de su trato: ${motivo} Su cuenta queda congelada mientras se resuelve. Si hubo una causa legítima, escríbanos por este hilo.`,
    created_by: adminId,
  });
  revalidatePath(`/ocp/contratos/${contractId}`);
  revalidatePath("/ocp/contratos");
  revalidatePath("/ocp/kr");
  return { ok: true };
}

/** El owner descongela la cuenta (la ruptura del contrato queda como historia). */
export async function descongelarCuenta(producerId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  if (!(await esOwner(service, adminId))) return { ok: false, error: "Solo el owner descongela una cuenta." };
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { ok: false, error: "Escriba por qué se descongela." };
  const { error } = await service.from("producer_profiles").update({ estado_cuenta: "activa", estado_cuenta_at: new Date().toISOString(), estado_cuenta_motivo: motivo }).eq("profile_id", producerId);
  if (error) return { ok: false, error: "No se pudo descongelar: " + error.message };
  await service.from("audit_log").insert({ entity_type: "producer_profile", entity_id: producerId, action: "cuenta_descongelada", performed_by: adminId, notes: motivo.slice(0, 300) });
  await service.from("producer_comm_log").insert({ producer_id: producerId, note: `CTC reactivó su cuenta: ${motivo}`, created_by: adminId });
  revalidatePath("/ocp/contratos");
  revalidatePath("/ocp/kr");
  return { ok: true };
}

export async function recordHumidityReading(contractId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  await service.from("humidity_readings").insert({
    contract_id: contractId,
    reading_month: Number(formData.get("reading_month")),
    humidity_pct: Number(formData.get("humidity_pct")),
    notes: String(formData.get("notes") || "") || null,
    source: "bcp_manual_entry",
    entered_by_admin_id: adminId,
  });

  revalidatePath(`/ocp/contratos/${contractId}`);
  revalidatePath("/ocp/contratos/humedad");
  revalidatePath("/bcp");
  return { ok: true };
}

export async function markReconditioning(contractId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  await service.from("purchase_contracts").update({ status: "reconditioning" }).eq("id", contractId);
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contractId,
    action: "marked_reconditioning",
    new_status: "reconditioning",
    performed_by: adminId,
  });

  revalidatePath(`/ocp/contratos/${contractId}`);
  revalidatePath("/ocp/contratos/humedad");
  revalidatePath("/ocp/contratos");
  return { ok: true };
}

export async function resolveReconditioning(contractId: string, outcome: "active" | "cancelled"): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  await service.from("purchase_contracts").update({ status: outcome }).eq("id", contractId);
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contractId,
    action: outcome === "active" ? "reconditioning_resolved" : "cancelled",
    previous_status: "reconditioning",
    new_status: outcome,
    performed_by: adminId,
  });

  revalidatePath(`/ocp/contratos/${contractId}`);
  revalidatePath("/ocp/contratos");
  return { ok: true };
}

// V5.85 (fase 8 del PLAN_CIRCUITO_DEL_LOTE): `decideBlackNegotiation` y el CRM de `black_negotiations` se retiraron. La compra en
// firme de un lote (Black incluido) es una oferta `directa` (o la histórica `black`) emitida desde Pendiente Oferta; lo comprado
// se documenta en `compras` al pagar el mes (`registrarPagoDelMes`). La tabla queda dormida (0 filas), sin escritor.
