"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { officialAverages, type EvaluationRow } from "@/lib/evaluations";
import type { MembershipTier } from "@/lib/subastas/tipos";
import { nombrePublicoDelLote, procesoPublico, variedadPublica } from "@/lib/catalogo/nombrePublico";
import { altitudPublica } from "@/lib/catalogo/vitrinaVista";

// ── Subastas Tyrian · el lado de CTCx (V5.24) ───────────────────────────────
// CTCx ABRE la subasta sobre un lote Tyrian galardonado (por mitades o el
// lote completo, con precio de salida, incremento y cierre), la mira en vivo,
// la CIERRA y la ADJUDICA. Adjudicar marca las pujas vigentes como ganadoras
// y NADA MÁS: la oferta al productor sigue siendo COP/kg y la decide CTCx en
// /ocp/ofertas («Registrar mejor postor») — las monedas no se mezclan y el
// circuito oferta → aceptación → contrato (V5.18) no cambia.
// V5.202 (owner, 2026-10-10): lo público debe «omitir info que haga fácil circumventar a CTCx para llegar al Productor». La vitrina
// Tyrian se ve SIN sesión (`buyerActions.listarSubastas`), así que la foto pública de la subasta ya no lleva `lots.name` (el
// productor lo escribe y solía llevar la finca) ni `finca_name`: lleva el nombre GENERADO (variedades canónicas + proceso · región
// + año, `nombrePublicoDelLote`, el espejo en TS de la función de la base), la variedad y el proceso solo si son canónicos, y la
// altitud en su tramo de 100 m. `finca_name` queda a null en las subastas nuevas (la consola la lee del lote).

type Result = { ok: true } | { ok: false; error: string };

const PATHS = ["/ocp/subastas", "/ocp/ofertas", "/cherry-picked-green"];
function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

export async function abrirSubasta(lotId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
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
    .select("id, stage, grade, ficha_variedad, ficha_proceso, ficha_altitud_m, harvest_from, harvest_to, created_at, datasheet->varieties, fincas(departamento, pais)")
    .eq("id", lotId)
    .maybeSingle();
  if (!lot) return { ok: false, error: "El lote no existe." };
  if (lot.stage !== "galardonado" || lot.grade !== "tyrian") {
    return { ok: false, error: "Solo se subastan lotes galardonados de grado Tyrian." };
  }

  const { data: open } = await service.from("lot_auctions").select("id").eq("lot_id", lotId).eq("status", "abierta").maybeSingle();
  if (open) return { ok: false, error: "Este lote ya tiene una subasta abierta." };

  const { data: evals } = await service.from("lot_evaluations").select("source, status, sca_total, factor_rendimiento, rige_grado, created_at").eq("lot_id", lotId);
  const avg = officialAverages(((evals as EvaluationRow[] | null) ?? []));
  const finca = (Array.isArray(lot.fincas) ? lot.fincas[0] : lot.fincas) as { departamento: string | null; pais: string | null } | null;
  const nombrePublico = nombrePublicoDelLote({
    lotId,
    varieties: (lot as { varieties?: unknown }).varieties,
    fichaVariedad: lot.ficha_variedad,
    fichaProceso: lot.ficha_proceso,
    departamento: finca?.departamento,
    pais: finca?.pais,
    harvestTo: lot.harvest_to,
    harvestFrom: lot.harvest_from,
    creado: lot.created_at,
  });

  const { error } = await service.from("lot_auctions").insert({
    lot_id: lotId,
    fracciones,
    kg_total: kgTotal,
    precio_salida_eur_kg: salida,
    incremento_eur_kg: incremento,
    tier_minimo: tierMinimo,
    ends_at: endsAt.toISOString(),
    lot_name: nombrePublico,
    finca_name: null,
    variety: variedadPublica(lot.ficha_variedad),
    process: procesoPublico(lot.ficha_proceso),
    altitude_m: altitudPublica(lot.ficha_altitud_m),
    score: avg.scaAverage,
    notes,
    created_by: adminId,
  });
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true };
}

export async function cerrarSubasta(auctionId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
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
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
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
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
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
