import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// ── V6.23 (owner, 2026-11-06, TAR-149) · leer los códigos CTC guardados ────────────────────────────────────────────────────
// Los códigos los asigna la base (`docs/migraciones/2026-11-07_codigos_ctc_a_ampliar.sql`) y viven en su fila:
// `producer_profiles.codigo`, `fincas.codigo` y `lots.public_code`. Lo normal es pedirlos en el MISMO select que ya trae la fila
// (`codigo`, `public_code`); estas dos funciones son para cuando la pantalla solo tiene ids:
//   · `codigosDeProductores`: el CTC-P- de cada cuenta (con el cliente que la pantalla ya usa; RLS decide qué ve).
//   · `codigosAnteriores`: el código VIEJO de cada registro (V5.100, derivado del uuid), del libro `codigos_ctc`. Solo service role
//     (el libro no tiene políticas). Sirve para que el OCP encuentre un registro por el código que la gente aún recuerda; NUNCA para
//     enseñarlo como vigente.

/** El código CTC-P- de cada productor, por id de cuenta. Los que no tienen fila en `producer_profiles` no salen. */
export async function codigosDeProductores(supabase: SupabaseClient, ids: readonly string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;
  const { data } = await supabase.from("producer_profiles").select("profile_id, codigo").in("profile_id", unicos);
  for (const r of (data ?? []) as { profile_id: string; codigo: string | null }[]) {
    if (r.codigo) mapa.set(r.profile_id, r.codigo);
  }
  return mapa;
}

/** V6.23 (TAR-149) · Códigos ANTERIORES → el código que los reemplazó (`reemplazado_por`), del libro `codigos_ctc`. Pide el cliente
 *  service role. Sirve para NOMBRAR lo que quedó guardado con un código viejo (los lotes que marcó un lead antes del paso C): el
 *  correo y el PDF dicen el código de hoy. No abre nada: no mira las segundas puertas ni la vitrina (eso es
 *  `referenciaDeCodigoAnterior`, en `lib/catalogo/vitrina.ts`). Lo que no está en el libro como anterior no sale en el mapa. */
export async function codigosQueReemplazan(
  service: SupabaseClient,
  codigos: readonly string[],
  tipo: "productor" | "finca" | "lote" = "lote"
): Promise<Map<string, string>> {
  const unicos = [...new Set(codigos.filter(Boolean).map((c) => c.trim().toUpperCase()))];
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;
  const { data, error } = await service
    .from("codigos_ctc")
    .select("codigo, reemplazado_por")
    .eq("tipo", tipo)
    .eq("vigente", false)
    .not("reemplazado_por", "is", null)
    .in("codigo", unicos);
  if (error) return mapa;
  for (const r of (data ?? []) as { codigo: string; reemplazado_por: string | null }[]) {
    if (r.reemplazado_por) mapa.set(r.codigo, r.reemplazado_por);
  }
  return mapa;
}

/** El código ANTERIOR (no vigente) de cada registro, por id de entidad, del libro `codigos_ctc`. Pide el cliente service role. */
export async function codigosAnteriores(service: SupabaseClient, ids: readonly string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;
  const { data, error } = await service.from("codigos_ctc").select("entidad_id, codigo").eq("vigente", false).in("entidad_id", unicos);
  if (error) return mapa;
  for (const r of (data ?? []) as { entidad_id: string; codigo: string }[]) {
    if (!mapa.has(r.entidad_id)) mapa.set(r.entidad_id, r.codigo);
  }
  return mapa;
}
