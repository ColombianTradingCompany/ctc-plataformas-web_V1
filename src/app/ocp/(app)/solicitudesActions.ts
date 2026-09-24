"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { formatCop, dueFor } from "@/lib/arena/inscriptions";
import { insertEntryCode } from "@/lib/arena/entryCodes";
import { recibirMuestra } from "@/lib/muestras/recibo";
import { PAGO_CONTRA_ENTREGA } from "@/lib/trato/terminos";

// ── OCP · Catálogo · Solicitudes de Evaluación (fase 3 del PLAN_CIRCUITO_DEL_LOTE, V5.80) ─────
// Folio 7, pasos 7–10: el productor SOLICITA la evaluación (y puede pedir un descuento por nota); CTCx
// «corrobora la solicitud y emite una factura de cobro» y DECIDE la subvención; el productor paga y manda
// los 2 kg contra entrega; con café Y pago recibidos el lote pasa a «Lotes a Evaluar».
//
// Tres acciones, todas `emite` (el productor ve la factura, la subvención y el recibo):
//   · decidirSubvencion — la subvención es una DECISIÓN de CTCx sobre la solicitud, no un código que el productor
//     teclea (§3 del plan). Para que el libro de la campaña siga siendo verdad, decidirla EMITE y canjea un código
//     KRX- de esa campaña a nombre del productor; quitarla acuña de nuevo el KRA- a precio pleno. Solo con el pago
//     pendiente; si ya había factura, la anula (se re-emite con el total nuevo) y queda en el rastro.
//   · emitirFactura — la referencia sale de la secuencia de la base (`next_factura_ref()`); el pago no se confirma
//     sin ella (`confirmInscriptionPayment`), salvo que CTCx asuma el costo.
//   · recibirMuestraAction — el recibo con los kilos reales, la partición del folio y la marca, en una acción
//     (`src/lib/muestras/recibo.ts`).
// Todas devuelven resultado — nunca lanzan (lección V12).

type Result = { ok: true } | { ok: false; error: string };

const PATHS = ["/ocp/solicitudes", "/ocp/a-evaluar", "/ocp/muestras", "/ocp/subvenciones", "/ocp/kr", "/ocp"];
function revalidar() {
  for (const p of PATHS) revalidatePath(p);
}

type InsRow = {
  id: string;
  lot_id: string;
  producer_id: string;
  status: string;
  phase: string;
  amount_cop: number;
  discount_pct: number;
  entry_code: string | null;
  entry_code_id: string | null;
  subvencion_id: string | null;
  factura_ref: string | null;
  lots: { name: string } | { name: string }[] | null;
};
const nombreDelLote = (ins: InsRow) => ((Array.isArray(ins.lots) ? ins.lots[0] : ins.lots) as { name: string } | null)?.name ?? "su lote";

async function cargarSolicitud(service: ReturnType<typeof createServiceRoleClient>, lotId: string): Promise<InsRow | null> {
  const { data } = await service
    .from("arena_inscriptions")
    .select("id, lot_id, producer_id, status, phase, amount_cop, discount_pct, entry_code, entry_code_id, subvencion_id, factura_ref, lots(name)")
    .eq("lot_id", lotId)
    .maybeSingle();
  return (data as InsRow | null) ?? null;
}

/** CTCx decide la subvención de una solicitud: una campaña (30–70 %) o ninguna (`campaign_id` vacío). */
export async function decidirSubvencion(lotId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const ins = await cargarSolicitud(service, lotId);
  if (!ins) return { ok: false, error: "Solicitud no encontrada." };
  if (ins.status !== "pendiente") return { ok: false, error: "El pago ya está confirmado — la subvención quedó cerrada." };
  if (ins.phase !== "postulacion") return { ok: false, error: "Esta solicitud ya avanzó." };

  const campaignId = String(formData.get("campaign_id") ?? "").trim() || null;
  if (campaignId === ins.subvencion_id) return { ok: false, error: "Esa ya es la subvención de esta solicitud." };

  let codeRow;
  let campaignName: string | null = null;
  try {
    if (campaignId) {
      const { data: campaign } = await service.from("club_campaigns").select("id, name, discount_pct").eq("id", campaignId).maybeSingle();
      if (!campaign) return { ok: false, error: "Campaña no encontrada." };
      campaignName = campaign.name;
      codeRow = await insertEntryCode(service, {
        kind: "campana",
        prefix: "KRX",
        discountPct: campaign.discount_pct,
        campaignId: campaign.id,
        assignedTo: ins.producer_id,
        lotId,
        createdBy: adminId,
      });
    } else {
      codeRow = await insertEntryCode(service, { kind: "lote", prefix: "KRA", discountPct: 0, lotId, assignedTo: ins.producer_id, createdBy: adminId });
    }
    await service.from("arena_entry_codes").update({ redeemed_at: new Date().toISOString() }).eq("id", codeRow.id);
  } catch {
    return { ok: false, error: "No se pudo emitir el código de la subvención." };
  }
  if (ins.entry_code_id) {
    await service.from("arena_entry_codes").update({ revoked_at: new Date().toISOString() }).eq("id", ins.entry_code_id);
  }

  const teniaFactura = ins.factura_ref;
  const { error } = await service
    .from("arena_inscriptions")
    .update({
      discount_pct: codeRow.discount_pct,
      entry_code: codeRow.code,
      entry_code_id: codeRow.id,
      subvencion_id: campaignId,
      // Una factura emitida con otro total ya no vale: se anula y se vuelve a emitir.
      ...(teniaFactura ? { factura_ref: null, factura_emitida_at: null, factura_emitida_by: null } : {}),
    })
    .eq("id", ins.id);
  if (error) return { ok: false, error: "No se pudo guardar la subvención: " + error.message };

  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "subvencion_decidida",
    performed_by: adminId,
    notes: campaignId
      ? `Subvención «${campaignName}» ${codeRow.discount_pct}% · código ${codeRow.code} · a pagar ${formatCop(dueFor(codeRow.discount_pct, ins.amount_cop))}${teniaFactura ? ` · factura ${teniaFactura} anulada` : ""}`
      : `Sin subvención · código ${codeRow.code} · a pagar ${formatCop(ins.amount_cop)}${teniaFactura ? ` · factura ${teniaFactura} anulada` : ""}`,
  });
  revalidar();
  return { ok: true };
}

/** CTCx corrobora la solicitud y emite la factura de cobro (folio 7, paso 8). */
export async function emitirFactura(lotId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const ins = await cargarSolicitud(service, lotId);
  if (!ins) return { ok: false, error: "Solicitud no encontrada." };
  if (ins.status !== "pendiente") return { ok: false, error: "El pago ya está confirmado — no hay nada que facturar." };
  if (ins.factura_ref) return { ok: false, error: `Esta solicitud ya tiene la factura ${ins.factura_ref}.` };

  const { data: ref, error: refError } = await service.rpc("next_factura_ref");
  if (refError || typeof ref !== "string") return { ok: false, error: "No se pudo numerar la factura." };
  const now = new Date().toISOString();
  const { error } = await service
    .from("arena_inscriptions")
    .update({ factura_ref: ref, factura_emitida_at: now, factura_emitida_by: adminId, pago_contra_entrega: PAGO_CONTRA_ENTREGA })
    .eq("id", ins.id);
  if (error) return { ok: false, error: "No se pudo emitir la factura: " + error.message };

  const total = dueFor(ins.discount_pct, ins.amount_cop);
  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "factura_emitida",
    performed_by: adminId,
    notes: `Factura ${ref} · ${formatCop(total)}${ins.discount_pct > 0 ? ` (subvención ${ins.discount_pct}%)` : ""}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: ins.producer_id,
    context_label: `Lote ${nombreDelLote(ins)}`,
    lot_id: lotId,
    note: `CTC corroboró su solicitud de evaluación y emitió la factura ${ref} por ${formatCop(total)}${ins.discount_pct > 0 ? ` (con subvención del ${ins.discount_pct}%)` : ""}. Puede verla e imprimirla en «Evaluar mi Café». Envíe la muestra de 2 kg contra entrega: el flete lo paga CTC al recibirla.`,
    created_by: adminId,
  });
  revalidar();
  return { ok: true };
}

/** El recibo físico: los kilos que llegaron, dónde quedan, y la marca — en una sola acción. */
export async function recibirMuestraAction(lotId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  const kgRaw = String(formData.get("kg") ?? "").replace(",", ".").trim();
  const res = await recibirMuestra(service, {
    lotId,
    kgRecibidos: kgRaw ? Number(kgRaw) : null,
    ubicacion: String(formData.get("ubicacion") ?? ""),
    custodio: String(formData.get("custodio") ?? ""),
    notas: String(formData.get("notas") ?? ""),
    adminId: permiso.userId,
  });
  if (!res.ok) return res;
  revalidar();
  revalidatePath("/bcp");
  return { ok: true };
}
