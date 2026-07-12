"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") throw new Error("No autorizado.");
  return user.id;
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
