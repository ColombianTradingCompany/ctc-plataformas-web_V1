import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { finDeSemana, plazoDelBache } from "./despachos";

// ── El trato por ventanas, del lado del servidor (V5.176 · docs/PLAN_CICLOS.md §3–§5, tanda 3) ─────────────────────────────────
// Dos piezas que comparten las acciones del productor y del OCP:
//   · `sincronizarListado`: en un trato por ventana el café declarado queda en venta en Cherry Picked mientras sigue en la finca
//     (owner, V5.169: «el café declarado queda disponible para la venta en Cherry Picked y CTCx lo compra a medida que se vende»).
//     El `total_kg` de la publicación del lote es lo declarado menos lo retirado, sumado sobre sus contratos por ventana; lo que se
//     vende lo lleva el propio catálogo (`sold_kg`). Los tratos viejos siguen con `contract_releases` (su trigger no se toca).
//   · `despachoDeLoVendido`: lo que CTCx confirma vendido se despacha por BACHES (V5.183): la venta se agrega al bache abierto del
//     contrato o abre uno nuevo, con plazo de hasta 5 semanas (antes, V5.175–V5.182: la semana 1 del ciclo siguiente).

export async function sincronizarListado(service: SupabaseClient, lotId: string): Promise<void> {
  const { data: contratos } = await service
    .from("purchase_contracts")
    .select("id, quantity_frozen_kg")
    .eq("lot_id", lotId)
    .not("ventana_tipo", "is", null)
    .in("status", ["pending_signature", "active", "reconditioning", "completed"]);
  const lista = (contratos ?? []) as { id: string; quantity_frozen_kg: number | string | null }[];
  if (!lista.length) return;
  const { data: retiros } = await service.from("contract_retiros").select("kg").in("contract_id", lista.map((c) => c.id));
  const declarado = lista.reduce((a, c) => a + (Number(c.quantity_frozen_kg) || 0), 0);
  const retirado = ((retiros ?? []) as { kg: number | string }[]).reduce((a, r) => a + (Number(r.kg) || 0), 0);
  const total = Math.max(0, Math.round((declarado - retirado) * 10) / 10);
  await service.from("lot_listings").update({ total_kg: total }).eq("lot_id", lotId).neq("status", "archived");
}

/** El total en venta de un lote por ventanas (lo que `publishLot` usa al publicar). null si el lote no tiene tratos por ventana. */
export async function totalEnVentaPorVentanas(service: SupabaseClient, lotId: string): Promise<number | null> {
  const { data: contratos } = await service.from("purchase_contracts").select("id, quantity_frozen_kg").eq("lot_id", lotId).not("ventana_tipo", "is", null).in("status", ["active", "completed"]);
  const lista = (contratos ?? []) as { id: string; quantity_frozen_kg: number | string | null }[];
  if (!lista.length) return null;
  const { data: retiros } = await service.from("contract_retiros").select("kg").in("contract_id", lista.map((c) => c.id));
  const declarado = lista.reduce((a, c) => a + (Number(c.quantity_frozen_kg) || 0), 0);
  const retirado = ((retiros ?? []) as { kg: number | string }[]).reduce((a, r) => a + (Number(r.kg) || 0), 0);
  return Math.max(0, Math.round((declarado - retirado) * 10) / 10);
}

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
