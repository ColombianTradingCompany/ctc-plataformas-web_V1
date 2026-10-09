import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { finDeSemana, plazoDelBache } from "./despachos";

// ── El trato por ventanas, del lado del servidor (V5.176 · docs/PLAN_CICLOS.md §3–§5, tanda 3) ─────────────────────────────────
// La pieza que comparten las acciones del productor y del OCP. (Hasta la V5.195 vivía aquí también `sincronizarListado`, que copiaba
// lo declarado − lo retirado al `total_kg` del listado en kg de CPS; desde la V5.196 el listado lo gobierna el Triage de Catálogo
// Activo, en kg de VERDE y con su FOB mínimo — `src/lib/triage/`.)
//   · `despachoDeLoVendido`: lo que CTCx confirma vendido se despacha por BACHES (V5.183): la venta se agrega al bache abierto del
//     contrato o abre uno nuevo, con plazo de hasta 5 semanas (antes, V5.175–V5.182: la semana 1 del ciclo siguiente).

/**
 * V5.183 (owner, 2026-10-07): lo vendido sale por BACHES. La venta confirmada en la semana `semana` (el lunes) se agrega al bache
 * ABIERTO del contrato —un despacho «vendido» pendiente cuyo plazo no ha pasado— o abre uno nuevo, con plazo al cierre de la 5.ª
 * semana contando esta (`plazoDelBache`). El productor lo despacha cuando quiera dentro de ese plazo (cada 2 o 3 semanas es lo
 * recomendado); al registrar su tiquete el bache se cierra y la venta siguiente abre otro. Sin ventas confirmadas, no hay bache.
 */
export async function despachoDeLoVendido(service: SupabaseClient, contractId: string, semana: string, kg: number, copKg: number): Promise<{ id: string; plazo: string } | { error: string }> {
  const { data: abiertos } = await service
    .from("contract_despachos")
    .select("id, kg, plazo")
    .eq("contract_id", contractId)
    .eq("tipo", "vendido")
    .eq("estado", "pendiente")
    .gte("plazo", finDeSemana(semana))
    .order("plazo", { ascending: true })
    .limit(1);
  const previo = ((abiertos ?? []) as { id: string; kg: number | string; plazo: string }[])[0];
  if (previo) {
    const nuevoKg = Math.round((Number(previo.kg) + kg) * 10) / 10;
    const { error } = await service.from("contract_despachos").update({ kg: nuevoKg, total_cop: Math.round(nuevoKg * copKg), updated_at: new Date().toISOString() }).eq("id", previo.id);
    return error ? { error: error.message } : { id: previo.id, plazo: previo.plazo };
  }
  const plazo = plazoDelBache(semana);
  const { data, error } = await service.from("contract_despachos").insert({ contract_id: contractId, tipo: "vendido", kg, cop_kg: copKg, total_cop: Math.round(kg * copKg), plazo }).select("id").single();
  return error || !data ? { error: error?.message ?? "No se pudo crear el despacho." } : { id: data.id as string, plazo };
}
