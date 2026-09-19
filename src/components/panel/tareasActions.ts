"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { consolasDeLaTarea, panelesDeLaTarea } from "@/lib/panel/tareas";

// La casilla de una tarea derivada: «pendiente» ↔ «hecho». `item_key` es la clave sintética de la
// tarea (`<tipo>:<id>`, ver `src/lib/panel/tareas.ts`); upsert, para que el primer clic sobre una
// tarea nunca vista cree su fila.
//
// Vive en `src/components/panel/` desde la V5.60: la usan el Tablero de Ejecución (ECP) y los
// Paneles del OCP y la LCP. Hasta entonces colgaba del OCP, pedía su consola y **revalidaba `/bcp`**
// —la casa de la que el Panel se había ido en la V4.24—: marcar una tarea no refrescaba nada.
export async function setTaskState(
  itemKey: string,
  state: "tbd" | "done"
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Quién puede marcarla sale de la CLAVE, no del cliente: la consola dueña de ese tipo de tarea y la
  // del Tablero. Una clave de tipo desconocido no abre ninguna consola, y la acción cierra.
  const consolas = consolasDeLaTarea(itemKey);
  if (!consolas.length) return { ok: false, error: "Esa tarea no existe." };
  const permiso = await permisoDeEscritura(consolas, "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  if (state !== "tbd" && state !== "done") return { ok: false, error: "Estado inválido." };

  const service = createServiceRoleClient();
  const { error } = await service
    .from("bcp_task_state")
    .upsert({ item_key: itemKey, state, updated_by: adminId, updated_at: new Date().toISOString() }, { onConflict: "item_key" });
  if (error) return { ok: false, error: "No se pudo actualizar el estado de la tarea." };

  for (const ruta of panelesDeLaTarea(itemKey)) revalidatePath(ruta);
  return { ok: true };
}
