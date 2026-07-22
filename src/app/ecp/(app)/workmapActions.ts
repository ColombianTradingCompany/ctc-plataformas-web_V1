"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { toWorkMapConfig, DEFAULT_WORK_MAP, type WorkMapConfig, type ProposalMeta } from "@/lib/workmap/schema";

// ── Mapa de Trabajo · Base + Propuestas ──────────────────────────────────────
// El Mapa BASE es la fuente de verdad: vive en código (DEFAULT_WORK_MAP), refleja
// el sistema REAL y solo cambia cuando el sistema cambia (yo lo actualizo junto
// con el cambio). "Guardar" NO toca el Base: guarda una PROPUESTA (iteración con
// nombre) en work_map_proposals — un cambio que el owner diseña para que CTC lo
// implemente. Ver = cualquier admin activo; editar/guardar/borrar propuestas =
// solo el owner (como el Admin Lock).

type Service = ReturnType<typeof createServiceRoleClient>;

/** El Mapa Base (sistema real). Solo lectura — no se persiste ni se sobrescribe. */
export async function getBaseMap(): Promise<WorkMapConfig> {
  await requireActiveAdmin();
  return DEFAULT_WORK_MAP;
}

/** La lista de propuestas guardadas (metadatos, sin el config completo). */
export async function listProposals(): Promise<ProposalMeta[]> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data } = await service
    .from("work_map_proposals")
    .select("id, name, note, updated_at")
    .order("updated_at", { ascending: false });
  return ((data as { id: string; name: string; note: string | null; updated_at: string }[] | null) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    note: p.note,
    updatedAt: p.updated_at,
  }));
}

/** El config completo de una propuesta. */
export async function getProposal(id: string): Promise<WorkMapConfig | null> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data } = await service.from("work_map_proposals").select("config").eq("id", id).maybeSingle();
  return data?.config ? toWorkMapConfig(data.config) : null;
}

async function isOwner(service: Service, adminId: string): Promise<boolean> {
  const { data: pu } = await service.from("panel_users").select("is_owner").eq("profile_id", adminId).maybeSingle();
  return pu ? pu.is_owner : true; // grandfathered (sin fila en panel_users) = owner
}

async function audit(service: Service, adminId: string, action: string, entityId: string) {
  await service.from("audit_log").insert({ entity_type: "work_map_proposal", entity_id: entityId, action, performed_by: adminId });
}

/** Crea (sin id) o actualiza (con id) una propuesta. Solo el owner. */
export async function saveProposal(input: {
  id?: string;
  name: string;
  note?: string;
  config: WorkMapConfig;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  if (!(await isOwner(service, adminId))) return { ok: false, error: "Solo el owner puede guardar propuestas." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escriba un nombre para la propuesta." };
  const clean = toWorkMapConfig(input.config); // nunca se guarda basura
  const note = input.note?.trim() || null;

  if (input.id) {
    const { error } = await service
      .from("work_map_proposals")
      .update({ name, note, config: clean, updated_at: new Date().toISOString() })
      .eq("id", input.id);
    if (error) return { ok: false, error: "No se pudo guardar la propuesta." };
    await audit(service, adminId, "work_map_proposal_updated", input.id);
    revalidatePath("/ecp/mapa");
    return { ok: true, id: input.id };
  }

  const { data, error } = await service
    .from("work_map_proposals")
    .insert({ name, note, config: clean, created_by: adminId })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear la propuesta." };
  await audit(service, adminId, "work_map_proposal_created", data.id);
  revalidatePath("/ecp/mapa");
  return { ok: true, id: data.id };
}

/** Borra una propuesta. Solo el owner. */
export async function deleteProposal(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  if (!(await isOwner(service, adminId))) return { ok: false, error: "Solo el owner puede borrar propuestas." };
  const { error } = await service.from("work_map_proposals").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar la propuesta." };
  await audit(service, adminId, "work_map_proposal_deleted", id);
  revalidatePath("/ecp/mapa");
  return { ok: true };
}
