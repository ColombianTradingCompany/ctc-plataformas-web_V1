import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import type { ComponenteDeMezcla, GradoDeMezcla, TipoDeMezcla } from "./mezclas";

// ── Las mezclas · la carga desde la base (V5.87 · composición V5.91) ─────────────────────────
// Lo que las acciones de Compras y la pantalla de una mezcla necesitan leer, en un solo sitio: la mezcla con sus
// componentes (cada uno con su compra, su lote, su productor, su estate —la finca— y su composición: variedad, proceso y
// región) y lo que queda DISPONIBLE de cada compra —comprado menos lo asignado a OTRAS mezclas no anuladas—, que es lo
// que la regla pura compara. Nada se escribe aquí.

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
  tipo: TipoDeMezcla | null;
  temporada: string | null;
  objetivoTemporadaKg: number | null;
  nota: string | null;
  anuladaMotivo: string | null;
  createdAt: string;
  cerradaAt: string | null;
  anuladaAt: string | null;
  componentes: ComponenteCargado[];
};

type FincaEmb = { id: string; name: string; departamento: string | null };
type LotEmb = { name: string; producer_id: string; ficha_variedad: string | null; ficha_proceso: string | null; fincas: FincaEmb | FincaEmb[] | null };
type CompraEmb = { id: string; kg: number | string; grado: string; lot_id: string; lots: LotEmb | LotEmb[] | null };
const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
export const SELECT_LOTE_PARA_MEZCLA = "lots(name, producer_id, ficha_variedad, ficha_proceso, fincas(id, name, departamento))";

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

/** La composición de un lote tal como la lee la regla: estate, región, variedad y proceso de su ficha. */
export function composicionDelLote(lot: LotEmb | LotEmb[] | null | undefined) {
  const l = uno(lot);
  const finca = uno(l?.fincas);
  return {
    producerId: l?.producer_id ?? "",
    fincaId: finca?.id ?? null,
    fincaName: finca?.name ?? null,
    departamento: finca?.departamento ?? null,
    variedad: l?.ficha_variedad ?? null,
    proceso: l?.ficha_proceso ?? null,
    lotName: l?.name ?? "—",
  };
}

export async function cargarMezcla(service: SupabaseClient, mezclaId: string): Promise<MezclaCargada | null> {
  const [{ data: m }, { data: cRaw }] = await Promise.all([
    service.from("mezclas").select("id, codigo, nombre, grado, status, tipo, temporada, objetivo_temporada_kg, nota, anulada_motivo, created_at, cerrada_at, anulada_at").eq("id", mezclaId).maybeSingle(),
    service.from("mezcla_componentes").select(`id, compra_id, kg, compras(id, kg, grado, lot_id, ${SELECT_LOTE_PARA_MEZCLA})`).eq("mezcla_id", mezclaId).order("created_at"),
  ]);
  if (!m) return null;
  const filas = (cRaw as unknown as { id: string; compra_id: string; kg: number | string; compras: CompraEmb | CompraEmb[] | null }[] | null) ?? [];
  const asignadoEnOtras = await asignadoPorCompra(service, filas.map((f) => f.compra_id), mezclaId);
  const producers = await fetchProducerContacts(service, [...new Set(filas.map((f) => composicionDelLote(uno(f.compras)?.lots).producerId).filter(Boolean))]);
  const componentes: ComponenteCargado[] = filas.map((f) => {
    const compra = uno(f.compras);
    const c = composicionDelLote(compra?.lots);
    const compraKg = Number(compra?.kg ?? 0);
    return {
      id: f.id,
      compraId: f.compra_id,
      kg: Number(f.kg),
      producerId: c.producerId,
      fincaId: c.fincaId,
      departamento: c.departamento,
      variedad: c.variedad,
      proceso: c.proceso,
      grado: compra?.grado ?? "",
      disponibleKg: Math.max(0, Math.round((compraKg - (asignadoEnOtras.get(f.compra_id) ?? 0)) * 10) / 10),
      lotId: compra?.lot_id ?? "",
      lotName: c.lotName,
      fincaName: c.fincaName,
      producerName: producers.get(c.producerId)?.fullName ?? "Productor",
      compraKg,
    };
  });
  return {
    id: m.id,
    codigo: m.codigo,
    nombre: m.nombre,
    grado: m.grado as GradoDeMezcla,
    status: m.status as MezclaCargada["status"],
    tipo: (m.tipo as TipoDeMezcla | null) ?? null,
    temporada: m.temporada,
    objetivoTemporadaKg: m.objetivo_temporada_kg == null ? null : Number(m.objetivo_temporada_kg),
    nota: m.nota,
    anuladaMotivo: m.anulada_motivo,
    createdAt: m.created_at,
    cerradaAt: m.cerrada_at,
    anuladaAt: m.anulada_at,
    componentes,
  };
}

export type CompraCandidata = ComponenteDeMezcla & {
  lotId: string;
  lotName: string;
  fincaName: string | null;
  producerName: string;
  compraKg: number;
};

/** Las compras del grado con destino CTCx Selection y kilos sin asignar (menos las que ya están en la mezcla). */
export async function comprasDisponiblesPara(service: SupabaseClient, grado: GradoDeMezcla, mezclaId: string): Promise<CompraCandidata[]> {
  const [{ data: cRaw }, { data: enMezcla }] = await Promise.all([
    service.from("compras").select(`id, kg, grado, lot_id, ${SELECT_LOTE_PARA_MEZCLA}`).eq("grado", grado).eq("destino", "selection").order("created_at", { ascending: false }),
    service.from("mezcla_componentes").select("compra_id").eq("mezcla_id", mezclaId),
  ]);
  const compras = (cRaw as unknown as CompraEmb[] | null) ?? [];
  const ya = new Set(((enMezcla as { compra_id: string }[] | null) ?? []).map((r) => r.compra_id));
  const asignado = await asignadoPorCompra(service, compras.map((c) => c.id));
  const producers = await fetchProducerContacts(service, [...new Set(compras.map((c) => composicionDelLote(c.lots).producerId).filter(Boolean))]);
  return compras
    .filter((c) => !ya.has(c.id))
    .map((c) => {
      const comp = composicionDelLote(c.lots);
      const compraKg = Number(c.kg);
      return {
        compraId: c.id,
        kg: 0,
        producerId: comp.producerId,
        fincaId: comp.fincaId,
        departamento: comp.departamento,
        variedad: comp.variedad,
        proceso: comp.proceso,
        grado: c.grado,
        disponibleKg: Math.max(0, Math.round((compraKg - (asignado.get(c.id) ?? 0)) * 10) / 10),
        lotId: c.lot_id,
        lotName: comp.lotName,
        fincaName: comp.fincaName,
        producerName: producers.get(comp.producerId)?.fullName ?? "Productor",
        compraKg,
      };
    })
    .filter((c) => c.disponibleKg > 0);
}
