import type { SupabaseClient } from "@supabase/supabase-js";

// ── Temporadas de la Arena ───────────────────────────────────────────────────
// La temporada es la unidad de registro y participación (2026-07-20):
//   · cada lote lleva su temporada de registro (lots.season_id, sellada al crear)
//   · cada inscripción lleva su temporada (arena_inscriptions.season_id)
//   · REGLA DEL OWNER: un lote puede participar en MÁXIMO 2 temporadas.
//     Hoy arena_inscriptions tiene UNIQUE(lot_id), así que la re-postulación en
//     otra temporada aún no es posible operativamente — el tope se valida igual
//     en postularLote para que el día que ese unique se relaje (segunda pasada
//     de la Arena) la regla ya esté puesta y probada.

export const MAX_SEASONS_PER_LOT = 2;

export type Season = {
  id: string;
  kind: string; // "principal" | "mitaca"
  year: number;
  arena_starts_at: string | null;
  arena_ends_at: string | null;
};

export function seasonLabel(s: Pick<Season, "kind" | "year"> | null | undefined): string {
  if (!s) return "Sin temporada";
  return `${s.kind === "mitaca" ? "Mitaca" : "Principal"} ${s.year}`;
}

/** La temporada "vigente": la que contiene HOY en su ventana de Arena; si
 *  ninguna la contiene, la más reciente (año desc, principal > mitaca no
 *  importa aquí — el desempate real es la fecha de inicio). */
export async function currentSeason(service: SupabaseClient): Promise<Season | null> {
  const { data } = await service
    .from("harvest_seasons")
    .select("id, kind, year, arena_starts_at, arena_ends_at")
    .order("year", { ascending: false });
  const seasons = (data as Season[] | null) ?? [];
  if (!seasons.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  const active = seasons.find(
    (s) => s.arena_starts_at && s.arena_ends_at && s.arena_starts_at <= today && today <= s.arena_ends_at
  );
  return active ?? seasons[0];
}

/** ¿Cuántas temporadas distintas ha jugado ya este lote? (para el tope de 2) */
export async function lotSeasonCount(service: SupabaseClient, lotId: string): Promise<number> {
  const { data } = await service.from("arena_inscriptions").select("season_id").eq("lot_id", lotId);
  return new Set(((data as { season_id: string | null }[] | null) ?? []).map((r) => r.season_id).filter(Boolean)).size;
}
