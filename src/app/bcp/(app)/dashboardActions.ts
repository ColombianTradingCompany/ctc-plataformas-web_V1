"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

async function requireAdmin() {
  // Delegates to the shared write-path gate (bcp_admin + panel_users.status),
  // so suspending a collaborator revokes Server Actions instantly.
  return requireActiveAdmin();
}

// Toggle a dashboard action item between "tbd" and "done". item_key is a
// synthetic per-item key (see bcp_task_state migration). Upsert so the first
// toggle of a never-seen item creates the row.
export async function setTaskState(itemKey: string, state: "tbd" | "done") {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { error } = await service
    .from("bcp_task_state")
    .upsert({ item_key: itemKey, state, updated_by: adminId, updated_at: new Date().toISOString() }, { onConflict: "item_key" });
  if (error) throw new Error("No se pudo actualizar el estado de la tarea.");
  revalidatePath("/bcp");
}
