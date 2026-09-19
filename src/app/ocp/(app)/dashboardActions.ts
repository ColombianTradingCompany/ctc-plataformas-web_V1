"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";


// Toggle a dashboard action item between "tbd" and "done". item_key is a
// synthetic per-item key (see bcp_task_state migration). Upsert so the first
// toggle of a never-seen item creates the row.
export async function setTaskState(itemKey: string, state: "tbd" | "done") {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const { error } = await service
    .from("bcp_task_state")
    .upsert({ item_key: itemKey, state, updated_by: adminId, updated_at: new Date().toISOString() }, { onConflict: "item_key" });
  if (error) throw new Error("No se pudo actualizar el estado de la tarea.");
  revalidatePath("/bcp");
}
