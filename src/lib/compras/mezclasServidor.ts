import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { KG_MINIMOS_POR_COMPONENTE, type ComponenteDeMezcla, type GradoDeMezcla } from "./mezclas";

// ── Las mezclas · la carga desde la base (V5.87) ─────────────────────────────────────────────
// Lo que las acciones de Compras y la pantalla de una mezcla necesitan leer, en un solo sitio: la mezcla con sus
// componentes (cada uno con su compra, su lote, su productor y su variedad) y lo que queda DISPONIBLE de cada compra
// —comprado menos lo asignado a OTRAS mezclas no anuladas—, que es lo que la regla pura compara. Nada se escribe aquí.

export type ComponenteCargado = ComponenteDeMezcla & {
  id: string;
  lotId: string;
  lotName: string;
  fincaName: string | null;
  producerName: string;
  compraKg: number;
};

export type MezclaCargada = {
  id: string;
  codigo: string;
  nombre: string;
  grado: GradoDeMezcla;
  status: "borrador" | "cerrada" | "anulada";
  nota: string | null;
  anuladaMotivo: string | null;
  createdAt: string;
  cerradaAt: string | null;
  anuladaAt: string | null;
  componentes: ComponenteCargado[];
};

type CompraEmb = { id: string; kg: number | string; grado: string; lot_id: string; lots: LotEmb | LotEmb[] | null };
type LotEmb = { name: string; producer_id: string; ficha_variedad: string | null; fincas: { name: string } | { name: string }[] | null };
const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/** Kilos ya asignados a mezclas NO anuladas, por compra (opcionalmente sin contar una mezcla). */
export async function asignadoPorCompra(service: SupabaseClient, compraIds: string[], excluirMezclaId?: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!compraIds.length) return out;
  let q = service.from("mezcla_componentes").select("compra_id, kg, mezcla_id, mezclas!inner(status)").in("compra_id", compraIds).neq("mezclas.status", "anulada");
  if (excluirMezclaId) q = q.neq("mezcla_id", excluirMezclaId);
  const { data } = await q;
  for (const r of (data as { compra_id: string; kg: number | string }[] | null) ?? []) {
    out.set(r.compra_id, (out.get(r.compra_id) ?? 0) + Number(r.kg));
  }
  return out;
}

export async function cargarMezcla(service: SupabaseClient, mezclaId: string): Promise<MezclaCargada | null> {
  const [{ data: m }, { data: cRaw }] = await Promise.all([
    service.from("mezclas").select("id, codigo, nombre, grado, status, nota, anulada_motivo, created_at, cerrada_at, anulada_at").eq("id", mezclaId).maybeSingle(),
    service.from("mezcla_componentes").select("id, compra_id, kg, compras(id, kg, grado, lot_id, lots(name, producer_id, ficha_variedad, fincas(name)))").eq("mezcla_id", mezclaId).order("created_at"),
  ]);
  if (!m) return null;
  const filas = (cRaw as unknown as { id: string; compra_id: string; kg: number | string; compras: CompraEmb | CompraEmb[] | null }[] | null) ?? [];
  const asignadoEnOtras = await asignadoPorCompra(service, filas.map((f) => f.compra_id), mezclaId);
  const producers = await fetchProducerContacts(service, [...new Set(filas.map((f) => uno(uno(f.compras)?.lots)?.producer_id ?? "").filter(Boolean))]);
  const componentes: ComponenteCargado[] = filas.map((f) => {
    const compra = uno(f.compras);
    const lot = uno(compra?.lots);
    const compraKg = Number(compra?.kg ?? 0);
    return {
      id: f.id,
      compraId: f.compra_id,
      kg: Number(f.kg),
      producerId: lot?.producer_id ?? "",
      variedad: lot?.ficha_variedad ?? null,
      grado: compra?.grado ?? "",
      disponibleKg: Math.max(0, Math.round((compraKg - (asignadoEnOtras.get(f.compra_id) ?? 0)) * 10) / 10),
      lotId: compra?.lot_id ?? "",
      lotName: lot?.name ?? "—",
      fincaName: uno(lot?.fincas)?.name ?? null,
      producerName: producers.get(lot?.producer_id ?? "")?.fullName ?? "Productor",
      compraKg,
    };
  });
  return {
    id: m.id,
    codigo: m.codigo,
    nombre: m.nombre,
    grado: m.grado as GradoDeMezcla,
    status: m.status as MezclaCargada["status"],
    nota: m.nota,
    anuladaMotivo: m.anulada_motivo,
    createdAt: m.created_at,
    cerradaAt: m.cerrada_at,
    anuladaAt: m.anulada_at,
    componentes,
  };
}

export type CompraCandidata = {
  compraId: string;
  lotId: string;
  lotName: string;
  fincaName: string | null;
  producerId: string;
  producerName: string;
  variedad: string | null;
  grado: string;
  compraKg: number;
  disponibleKg: number;
};

/** Las compras del grado con al menos una carga sin asignar (menos las que ya están en la mezcla). */
export async function comprasDisponiblesPara(service: SupabaseClient, grado: GradoDeMezcla, mezclaId: string): Promise<CompraCandidata[]> {
  const [{ data: cRaw }, { data: enMezcla }] = await Promise.all([
    service.from("compras").select("id, kg, grado, lot_id, lots(name, producer_id, ficha_variedad, fincas(name))").eq("grado", grado).order("created_at", { ascending: false }),
    service.from("mezcla_componentes").select("compra_id").eq("mezcla_id", mezclaId),
  ]);
  const compras = (cRaw as unknown as CompraEmb[] | null) ?? [];
  const ya = new Set(((enMezcla as { compra_id: string }[] | null) ?? []).map((r) => r.compra_id));
  const asignado = await asignadoPorCompra(service, compras.map((c) => c.id));
  const producers = await fetchProducerContacts(service, [...new Set(compras.map((c) => uno(c.lots)?.producer_id ?? "").filter(Boolean))]);
  return compras
    .filter((c) => !ya.has(c.id))
    .map((c) => {
      const lot = uno(c.lots);
      const compraKg = Number(c.kg);
      return {
        compraId: c.id,
        lotId: c.lot_id,
        lotName: lot?.name ?? "—",
        fincaName: uno(lot?.fincas)?.name ?? null,
        producerId: lot?.producer_id ?? "",
        producerName: producers.get(lot?.producer_id ?? "")?.fullName ?? "Productor",
        variedad: lot?.ficha_variedad ?? null,
        grado: c.grado,
        compraKg,
        disponibleKg: Math.max(0, Math.round((compraKg - (asignado.get(c.id) ?? 0)) * 10) / 10),
      };
    })
    .filter((c) => c.disponibleKg >= KG_MINIMOS_POR_COMPONENTE);
}
