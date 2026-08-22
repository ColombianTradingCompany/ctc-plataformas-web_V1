"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { officialAverages, type EvaluationRow } from "@/lib/evaluations";
import type { MembershipTier } from "@/lib/subastas/tipos";

// ── Subastas Tyrian · el lado de CTCx (V5.24) ───────────────────────────────
// CTCx ABRE la subasta sobre un lote Tyrian galardonado (por mitades o el
// lote completo, con precio de salida, incremento y cierre), la mira en vivo,
// la CIERRA y la ADJUDICA. Adjudicar marca las pujas vigentes como ganadoras
// y NADA MÁS: la oferta al productor sigue siendo COP/kg y la decide CTCx en
// /ocp/ofertas («Registrar mejor postor») — las monedas no se mezclan y el
// circuito oferta → aceptación → contrato (V5.18) no cambia.

type Result = { ok: true } | { ok: false; error: string };

const PATHS = ["/ocp/subastas", "/ocp/ofertas", "/cherry-picked-green"];
function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

export async function abrirSubasta(lotId: string, formData: FormData): Promise<Result> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const fracciones = Number(formData.get("fracciones")) === 1 ? 1 : 2;
  const kgTotal = Number(formData.get("kg_total"));
  const salida = Number(formData.get("precio_salida"));
  const incremento = Number(formData.get("incremento") || 0.5);
  const endsAtRaw = String(formData.get("ends_at") ?? "");
  const tierMinimo = (String(formData.get("tier_minimo") || "pinton") as MembershipTier);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!Number.isFinite(kgTotal) || kgTotal <= 0) return { ok: false, error: "Escriba los kilos totales del lote." };
  if (!Number.isFinite(salida) || salida <= 0) return { ok: false, error: "Escriba el precio de salida (EUR/kg)." };
  if (!Number.isFinite(incremento) || incremento <= 0) return { ok: false, error: "El incremento debe ser mayor que cero." };
  const endsAt = new Date(endsAtRaw);
  if (!endsAtRaw || Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
    return { ok: false, error: "La fecha de cierre debe estar en el futuro." };
  }
  if (!["verde", "pinton", "maduro"].includes(tierMinimo)) return { ok: false, error: "Nivel mínimo inválido." };

  const { data: lot } = await service
    .from("lots")
    .select("id, name, stage, grade, ficha_variedad, ficha_proceso, ficha_altitud_m, fincas(name)")
    .eq("id", lotId)
    .maybeSingle();
  if (!lot) return { ok: false, error: "El lote no existe." };
  if (lot.stage !== "galardonado" || lot.grade !== "tyrian") {
    return { ok: false, error: "Solo se subastan lotes galardonados de grado Tyrian." };
  }

  const { data: open } = await service.from("lot_auctions").select("id").eq("lot_id", lotId).eq("status", "abierta").maybeSingle();
  if (open) return { ok: false, error: "Este lote ya tiene una subasta abierta." };

  const { data: evals } = await service.from("lot_evaluations").select("source, status, sca_total, factor_rendimiento").eq("lot_id", lotId);
  const avg = officialAverages(((evals as EvaluationRow[] | null) ?? []));
  const finca = (Array.isArray(lot.fincas) ? lot.fincas[0] : lot.fincas) as { name: string } | null;

  const { error } = await service.from("lot_auctions").insert({
    lot_id: lotId,
    fracciones,
    kg_total: kgTotal,
    precio_salida_eur_kg: salida,
    incremento_eur_kg: incremento,
    tier_minimo: tierMinimo,
    ends_at: endsAt.toISOString(),
    lot_name: lot.name,
    finca_name: finca?.name ?? null,
    variety: lot.ficha_variedad ?? null,
    process: lot.ficha_proceso ?? null,
    altitude_m: lot.ficha_altitud_m ?? null,
    score: avg.scaAverage,
    notes,
    created_by: adminId,
  });
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true };
}

export async function cerrarSubasta(auctionId: string): Promise<Result> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { error } = await service
    .from("lot_auctions")
    .update({ status: "cerrada", closed_at: new Date().toISOString() })
    .eq("id", auctionId)
    .eq("status", "abierta");
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

/** Las pujas vigentes pasan a GANADORAS y la subasta queda adjudicada. No
 *  emite oferta: eso es COP/kg y se registra en /ocp/ofertas. */
export async function adjudicarSubasta(auctionId: string): Promise<Result> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: a } = await service.from("lot_auctions").select("id, status, ends_at").eq("id", auctionId).maybeSingle();
  if (!a) return { ok: false, error: "La subasta no existe." };
  if (a.status === "abierta" && new Date(a.ends_at).getTime() > Date.now()) {
    return { ok: false, error: "La subasta sigue abierta: ciérrela antes de adjudicar." };
  }
  if (a.status === "adjudicada" || a.status === "cancelada") return { ok: false, error: "Esta subasta ya no se puede adjudicar." };

  const { count } = await service.from("auction_bids").select("id", { count: "exact", head: true }).eq("auction_id", auctionId).eq("estado", "vigente");
  if (!count) return { ok: false, error: "Sin pujas vigentes: no hay a quién adjudicar. Cancele la subasta." };

  const { error: bidErr } = await service.from("auction_bids").update({ estado: "ganadora" }).eq("auction_id", auctionId).eq("estado", "vigente");
  if (bidErr) return { ok: false, error: bidErr.message };
  const { error } = await service
    .from("lot_auctions")
    .update({ status: "adjudicada", adjudicated_at: new Date().toISOString(), closed_at: a.status === "abierta" ? new Date().toISOString() : undefined })
    .eq("id", auctionId);
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true };
}

export async function cancelarSubasta(auctionId: string): Promise<Result> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { error } = await service
    .from("lot_auctions")
    .update({ status: "cancelada", closed_at: new Date().toISOString() })
    .eq("id", auctionId)
    .in("status", ["abierta", "cerrada"]);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}
