// V5.168 · qué puede imprimir un productor: los lotes con contrato firmado y las fincas de donde salen (ver `blindaje.ts`).
import type { SupabaseClient } from "@supabase/supabase-js";
import { ESTADOS_DE_CONTRATO_FIRMADO } from "./blindaje";

export async function impresionDelProductor(service: SupabaseClient, producerId: string): Promise<{ lotes: Set<string>; fincas: Set<string> }> {
  const { data: lotes } = await service.from("lots").select("id, finca_id").eq("producer_id", producerId);
  const filas = (lotes as { id: string; finca_id: string | null }[] | null) ?? [];
  if (!filas.length) return { lotes: new Set(), fincas: new Set() };
  const { data: contratos } = await service
    .from("purchase_contracts")
    .select("lot_id")
    .in("lot_id", filas.map((l) => l.id))
    .in("status", [...ESTADOS_DE_CONTRATO_FIRMADO]);
  const conContrato = new Set(((contratos as { lot_id: string }[] | null) ?? []).map((c) => c.lot_id));
  if (!conContrato.size) return { lotes: conContrato, fincas: new Set() };
  const { data: aportes } = await service.from("lot_contributions").select("finca_id").in("lot_id", [...conContrato]);
  const fincas = new Set<string>([
    ...filas.filter((l) => conContrato.has(l.id) && l.finca_id).map((l) => l.finca_id as string),
    ...(((aportes as { finca_id: string }[] | null) ?? []).map((a) => a.finca_id)),
  ]);
  return { lotes: conContrato, fincas };
}
