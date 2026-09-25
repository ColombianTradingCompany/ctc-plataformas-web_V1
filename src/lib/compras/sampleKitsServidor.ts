import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { disponibleParaKits, type TipoDeKit } from "./sampleKits";

// ── El stock de Sample Kits · la carga (V5.90) ───────────────────────────────────────────────
// Las compras destinadas a `sample_kits`, lo que ya se asignó a kits no anulados y lo disponible (derivado); y cada kit con sus
// lotes. Lo leen `/ocp/sample-kits` y las acciones de Compras. Nada se escribe aquí.

type LotEmb = { name: string; producer_id: string; ficha_variedad: string | null; fincas: { name: string } | { name: string }[] | null };
const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export type CompraParaKits = {
  compraId: string;
  lotId: string;
  lotName: string;
  producerName: string;
  fincaName: string | null;
  grado: string;
  variedad: string | null;
  compradoKg: number;
  asignadoKg: number;
  disponibleKg: number;
  pagadaAt: string | null;
  ubicacion: string | null;
};

/** kg de CPS ya asignados a kits NO anulados, por compra (opcionalmente sin contar un kit). */
export async function asignadoAKitsPorCompra(service: SupabaseClient, compraIds: string[], excluirKitId?: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!compraIds.length) return out;
  let q = service.from("sample_kit_items").select("compra_id, kg_cps, kit_id, sample_kits!inner(status)").in("compra_id", compraIds).neq("sample_kits.status", "anulado");
  if (excluirKitId) q = q.neq("kit_id", excluirKitId);
  const { data } = await q;
  for (const r of (data as { compra_id: string; kg_cps: number | string }[] | null) ?? []) out.set(r.compra_id, (out.get(r.compra_id) ?? 0) + Number(r.kg_cps));
  return out;
}

export async function stockDeSampleKits(service: SupabaseClient): Promise<CompraParaKits[]> {
  const { data } = await service
    .from("compras")
    .select("id, lot_id, kg, grado, pagada_at, ubicacion, lots(name, producer_id, ficha_variedad, fincas(name))")
    .eq("destino", "sample_kits")
    .order("created_at", { ascending: false });
  const filas = (data as unknown as { id: string; lot_id: string; kg: number | string; grado: string; pagada_at: string | null; ubicacion: string | null; lots: LotEmb | LotEmb[] | null }[] | null) ?? [];
  const asignado = await asignadoAKitsPorCompra(service, filas.map((f) => f.id));
  const producers = await fetchProducerContacts(service, [...new Set(filas.map((f) => uno(f.lots)?.producer_id ?? "").filter(Boolean))]);
  return filas.map((f) => {
    const lot = uno(f.lots);
    const compradoKg = Number(f.kg);
    const asignadoKg = r3(asignado.get(f.id) ?? 0);
    return {
      compraId: f.id,
      lotId: f.lot_id,
      lotName: lot?.name ?? "—",
      producerName: producers.get(lot?.producer_id ?? "")?.fullName ?? "Productor",
      fincaName: uno(lot?.fincas)?.name ?? null,
      grado: f.grado,
      variedad: lot?.ficha_variedad ?? null,
      compradoKg,
      asignadoKg,
      disponibleKg: disponibleParaKits({ compradoKg, asignadoKg }),
      pagadaAt: f.pagada_at,
      ubicacion: f.ubicacion,
    };
  });
}

export type ItemCargado = { id: string; compraId: string; lotId: string; lotName: string; producerName: string; grado: string; kgCps: number; disponibleKg: number };
export type KitCargado = {
  id: string;
  codigo: string;
  tipo: TipoDeKit;
  destino: string | null;
  pedidoId: string | null;
  status: "armado" | "enviado" | "anulado";
  guia: string | null;
  notas: string | null;
  anuladoMotivo: string | null;
  createdAt: string;
  enviadoAt: string | null;
  anuladoAt: string | null;
  items: ItemCargado[];
};

export async function cargarKit(service: SupabaseClient, kitId: string): Promise<KitCargado | null> {
  const [{ data: k }, { data: iRaw }] = await Promise.all([
    service.from("sample_kits").select("id, codigo, tipo, destino, pedido_id, status, guia, notas, anulado_motivo, created_at, enviado_at, anulado_at").eq("id", kitId).maybeSingle(),
    service.from("sample_kit_items").select("id, compra_id, kg_cps, compras(id, kg, grado, lot_id, lots(name, producer_id, ficha_variedad, fincas(name)))").eq("kit_id", kitId).order("created_at"),
  ]);
  if (!k) return null;
  const filas = (iRaw as unknown as { id: string; compra_id: string; kg_cps: number | string; compras: { id: string; kg: number | string; grado: string; lot_id: string; lots: LotEmb | LotEmb[] | null } | { id: string; kg: number | string; grado: string; lot_id: string; lots: LotEmb | LotEmb[] | null }[] | null }[] | null) ?? [];
  const asignadoEnOtros = await asignadoAKitsPorCompra(service, filas.map((f) => f.compra_id), kitId);
  const producers = await fetchProducerContacts(service, [...new Set(filas.map((f) => uno(uno(f.compras)?.lots)?.producer_id ?? "").filter(Boolean))]);
  return {
    id: k.id,
    codigo: k.codigo,
    tipo: k.tipo as TipoDeKit,
    destino: k.destino,
    pedidoId: k.pedido_id,
    status: k.status as KitCargado["status"],
    guia: k.guia,
    notas: k.notas,
    anuladoMotivo: k.anulado_motivo,
    createdAt: k.created_at,
    enviadoAt: k.enviado_at,
    anuladoAt: k.anulado_at,
    items: filas.map((f) => {
      const compra = uno(f.compras);
      const lot = uno(compra?.lots);
      return {
        id: f.id,
        compraId: f.compra_id,
        lotId: compra?.lot_id ?? "",
        lotName: lot?.name ?? "—",
        producerName: producers.get(lot?.producer_id ?? "")?.fullName ?? "Productor",
        grado: compra?.grado ?? "",
        kgCps: Number(f.kg_cps),
        disponibleKg: disponibleParaKits({ compradoKg: Number(compra?.kg ?? 0), asignadoKg: asignadoEnOtros.get(f.compra_id) ?? 0 }),
      };
    }),
  };
}

export type KitEnLista = { id: string; codigo: string; tipo: TipoDeKit; destino: string | null; status: KitCargado["status"]; createdAt: string; enviadoAt: string | null; lotes: number; kgCps: number };

export async function listarKits(service: SupabaseClient): Promise<KitEnLista[]> {
  const { data } = await service.from("sample_kits").select("id, codigo, tipo, destino, status, created_at, enviado_at, sample_kit_items(kg_cps)").order("created_at", { ascending: false });
  return (((data as unknown as { id: string; codigo: string; tipo: TipoDeKit; destino: string | null; status: KitCargado["status"]; created_at: string; enviado_at: string | null; sample_kit_items: { kg_cps: number | string }[] }[] | null) ?? []).map((k) => ({
    id: k.id,
    codigo: k.codigo,
    tipo: k.tipo,
    destino: k.destino,
    status: k.status,
    createdAt: k.created_at,
    enviadoAt: k.enviado_at,
    lotes: k.sample_kit_items.length,
    kgCps: r3(k.sample_kit_items.reduce((a, i) => a + Number(i.kg_cps), 0)),
  })));
}
