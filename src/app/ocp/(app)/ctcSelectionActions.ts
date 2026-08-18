"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

// ── CTC Selection · acciones del pipeline ────────────────────────────────────
// Sirven a las DOS ramas del paraguas (Black Stock y Selección): la etapa del
// kanban y el volumen objetivo son los mismos campos para un Black que para un
// Gold — de ahí que la mesa ganara una columna `grade` en vez de duplicarse.
//
// Se revalidan las dos pestañas a la vez a propósito: los KPI de la cabecera se
// calculan por rama, pero una negociación puede cambiar de sitio si alguien
// corrige su grado, y revalidar solo la pestaña actual dejaría la otra rancia.
// (Regla de la casa: un `revalidatePath` a una ruta que no existe NO avisa —
// ver el guardián `qa-rutas-consolas.mjs`.)
// La DECISIÓN (comprar/liberar) sigue siendo decideBlackNegotiation en
// contractActions.ts — aquí solo vive el SEGUIMIENTO de la negociación
// abierta: etapa del kanban y volumen objetivo. El enlace con el CRM
// CaaS (lead_id) tiene columna pero todavía no UI, a propósito.

const STAGES = ["nueva", "en_conversacion", "acuerdo_cerca"] as const;
export type BlackStage = (typeof STAGES)[number];

export async function setBlackNegotiationStage(
  negotiationId: string,
  stage: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  if (!STAGES.includes(stage as BlackStage)) return { ok: false, error: "Etapa inválida." };
  const service = createServiceRoleClient();

  const { data: neg } = await service.from("black_negotiations").select("id, status, stage").eq("id", negotiationId).maybeSingle();
  if (!neg) return { ok: false, error: "Negociación no encontrada." };
  if (neg.status !== "abierta") return { ok: false, error: "Esta negociación ya fue resuelta." };
  if (neg.stage === stage) return { ok: true };

  const { error } = await service.from("black_negotiations").update({ stage }).eq("id", negotiationId);
  if (error) return { ok: false, error: "No se pudo mover la negociación." };

  await service.from("audit_log").insert({
    entity_type: "black_negotiation",
    entity_id: negotiationId,
    action: "stage_changed",
    new_status: stage,
    performed_by: adminId,
  });
  revalidatePath("/ocp/ctc-selection");
  revalidatePath("/ocp/ctc-selection/seleccion");
  return { ok: true };
}

export async function setBlackNegotiationTarget(
  negotiationId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: neg } = await service.from("black_negotiations").select("id, status").eq("id", negotiationId).maybeSingle();
  if (!neg) return { ok: false, error: "Negociación no encontrada." };
  if (neg.status !== "abierta") return { ok: false, error: "Esta negociación ya fue resuelta." };

  const raw = String(formData.get("target_kg") ?? "").trim();
  const targetKg = raw === "" ? null : Number(raw);
  if (targetKg !== null && (!Number.isFinite(targetKg) || targetKg <= 0)) {
    return { ok: false, error: "El volumen objetivo debe ser un número positivo." };
  }
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await service.from("black_negotiations").update({ target_kg: targetKg, notes }).eq("id", negotiationId);
  if (error) return { ok: false, error: "No se pudo guardar el seguimiento." };

  await service.from("audit_log").insert({
    entity_type: "black_negotiation",
    entity_id: negotiationId,
    action: "target_updated",
    performed_by: adminId,
    notes: targetKg ? `${targetKg} kg` : null,
  });
  revalidatePath("/ocp/ctc-selection");
  revalidatePath("/ocp/ctc-selection/seleccion");
  return { ok: true };
}
