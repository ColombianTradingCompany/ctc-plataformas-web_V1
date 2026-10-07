import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── La existencia del lote (V5.181 · owner, 2026-10-07) ─────────────────────────────────────────────────────────────────────────
// «Es un valor no-obligatorio en A2, pero se vuelve obligatorio cuando se envía para la muestra, preguntándolo de nuevo si no fue
// ya registrado, y permite corregirlo.» Es la base de lo que el lote puede declarar en cada ventana (existencia − vendido −
// retirado, `ventanaDeOferta.ts`). Vive en `lots.existencia_cps_kg` y en la Ficha (`datasheet.existencia_cps_kg`, A2): este es el
// ÚNICO escritor fuera de la Ficha, para que las dos copias no se separen. Lo usan el productor (al solicitar la evaluación y en
// su invitación) y CTCx (OCP, en la vista del lote y al postular en su nombre). Cada cambio deja su fila de auditoría.
// V5.182: cada cambio, venga de donde venga (también la Ficha), lo guarda la base en `lot_existencia_historial` (ancla de
// control, inmutable); `controlDeExistencia.ts` lo califica.

/** kg de CPS con un decimal; null si no es un número positivo. Un texto se lee como se escribe en Colombia («5.000» = cinco mil,
 *  la coma es el decimal); un número llega tal cual. */
export function existenciaValida(kg: unknown): number | null {
  const crudo = typeof kg === "number" ? kg : Number(String(kg ?? "").trim().replace(/\./g, "").replace(",", "."));
  const n = Math.round(crudo * 10) / 10;
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? n : null;
}

/** Lo que se le dice a quien envía la muestra sin la existencia. */
export const EXISTENCIA_REQUERIDA = "Para enviar la muestra, registre la existencia total del lote (kg de café pergamino seco): con ella se calcula lo que podrá declarar en Cherry Picked.";

export async function guardarExistencia(
  service: SupabaseClient,
  input: { lotId: string; kg: number; porQuien: string | null; origen: "productor" | "ctcx" | "solicitud" },
): Promise<{ ok: true; antes: number | null; cambio: boolean } | { ok: false; error: string }> {
  const kg = existenciaValida(input.kg);
  if (kg == null) return { ok: false, error: "Escriba la existencia del lote en kg de CPS." };
  const { data: lot } = await service.from("lots").select("id, existencia_cps_kg, datasheet").eq("id", input.lotId).maybeSingle();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  const antes = lot.existencia_cps_kg != null ? Number(lot.existencia_cps_kg) : null;
  if (antes === kg) return { ok: true, antes, cambio: false };
  const datasheet = { ...((lot.datasheet as Record<string, unknown> | null) ?? {}), existencia_cps_kg: String(kg) };
  // V5.182: el punto de control y quién, para el historial (el trigger `lots_historial_existencia` los lee y los limpia).
  const existencia_origen = input.origen === "ctcx" ? "ocp" : input.origen === "solicitud" ? "solicitud" : "invitacion";
  const { error } = await service.from("lots").update({ existencia_cps_kg: kg, datasheet, existencia_origen, existencia_por: input.porQuien }).eq("id", input.lotId);
  if (error) return { ok: false, error: "No se pudo guardar la existencia: " + error.message };
  const quien = input.origen === "ctcx" ? "CTCx" : input.origen === "solicitud" ? "el productor, al solicitar la evaluación" : "el productor";
  await service.from("audit_log").insert({ entity_type: "lot", entity_id: input.lotId, action: "existencia_registrada", performed_by: input.porQuien, notes: `Existencia de CPS (${quien}): ${antes ?? "—"} → ${kg} kg.` });
  return { ok: true, antes, cambio: true };
}
