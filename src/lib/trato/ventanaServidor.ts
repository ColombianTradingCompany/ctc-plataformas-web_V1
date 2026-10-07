import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarioDeLaEdicion, edicionVigente } from "@/lib/pvc/servicio";
import { ubicar } from "./calendario";
import { plazoDeLoVendido } from "./despachos";

// ── El trato por ventanas, del lado del servidor (V5.176 · docs/PLAN_CICLOS.md §3–§5, tanda 3) ─────────────────────────────────
// Dos piezas que comparten las acciones del productor y del OCP:
//   · `sincronizarListado`: en un trato por ventana el café declarado queda en venta en Cherry Picked mientras sigue en la finca
//     (owner, V5.169: «el café declarado queda disponible para la venta en Cherry Picked y CTCx lo compra a medida que se vende»).
//     El `total_kg` de la publicación del lote es lo declarado menos lo retirado, sumado sobre sus contratos por ventana; lo que se
//     vende lo lleva el propio catálogo (`sold_kg`). Los tratos viejos siguen con `contract_releases` (su trigger no se toca).
//   · `despachoDeLoVendido`: lo que CTCx confirma vendido en una semana se despacha en la semana 1 del ciclo siguiente: la venta
//     se agrega al despacho «vendido» pendiente de ese plazo (o lo crea).

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

/** El plazo de lo vendido en la semana `semana` (el lunes): el domingo de la semana 1 del ciclo siguiente al de esa semana. */
export async function plazoDeLoVendidoEn(semana: string): Promise<string | null> {
  const edicion = await edicionVigente(semana);
  const cal = edicion ? calendarioDeLaEdicion(edicion) : null;
  const u = cal ? ubicar(semana, cal) : null;
  return u ? plazoDeLoVendido(u.finCiclo) : null;
}

/** Agrega lo vendido al despacho «vendido» pendiente de su plazo (o lo crea). Devuelve el despacho. */
export async function despachoDeLoVendido(service: SupabaseClient, contractId: string, plazo: string, kg: number, copKg: number): Promise<{ id: string } | { error: string }> {
  const { data: previo } = await service.from("contract_despachos").select("id, kg").eq("contract_id", contractId).eq("tipo", "vendido").eq("estado", "pendiente").eq("plazo", plazo).maybeSingle();
  if (previo) {
    const nuevoKg = Math.round((Number(previo.kg) + kg) * 10) / 10;
    const { error } = await service.from("contract_despachos").update({ kg: nuevoKg, total_cop: Math.round(nuevoKg * copKg), updated_at: new Date().toISOString() }).eq("id", previo.id);
    return error ? { error: error.message } : { id: previo.id as string };
  }
  const { data, error } = await service.from("contract_despachos").insert({ contract_id: contractId, tipo: "vendido", kg, cop_kg: copKg, total_cop: Math.round(kg * copKg), plazo }).select("id").single();
  return error || !data ? { error: error?.message ?? "No se pudo crear el despacho." } : { id: data.id as string };
}
