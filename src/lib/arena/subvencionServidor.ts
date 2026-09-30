import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CAMPANA_KR_NOMBRE, SUBVENCION_KR_PCT } from "./subvencion";

// ── La campaña por defecto de Kaffetal Regal (V5.95, owner 2026-09-30) ─────────────────────────
// Toda solicitud que entra por el panel del productor nace con el 30 % de subvención. La campaña es una fila normal de
// `club_campaigns` (para que Solicitudes de Evaluación la enseñe y la pueda cambiar por otra), buscada por su nombre y
// creada la primera vez que hace falta. Si alguien le cambió el % en la base, manda la base: es SU campaña.

export async function campanaPorDefecto(service: SupabaseClient): Promise<{ id: string; name: string; discount_pct: number }> {
  const { data } = await service.from("club_campaigns").select("id, name, discount_pct").eq("name", CAMPANA_KR_NOMBRE).maybeSingle();
  if (data) return data as { id: string; name: string; discount_pct: number };
  const { data: creada, error } = await service
    .from("club_campaigns")
    .insert({ name: CAMPANA_KR_NOMBRE, discount_pct: SUBVENCION_KR_PCT, created_by: null })
    .select("id, name, discount_pct")
    .single();
  if (error || !creada) throw new Error("No se pudo crear la campaña por defecto de Kaffetal Regal" + (error ? `: ${error.message}` : "."));
  return creada as { id: string; name: string; discount_pct: number };
}
