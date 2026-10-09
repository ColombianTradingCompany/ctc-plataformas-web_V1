import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ESTADO_INFO, movimientosDe, surteKit, type EstadoDePartida } from "@/lib/stock/linaje";
import { cargarStock } from "@/lib/stock/servidor";
import { contenidoDelKit, type TipoDeKit } from "./sampleKits";

// ── Los Sample Kits · la carga (V5.90 · sobre el Stock CTCx desde la V5.195) ─────────────────────────────────────────────────
// Cada kit con sus lotes (cada uno, una partida del Stock CTCx y sus kilos) y las partidas que pueden surtir un kit, con su
// disponible (el de la partida: lo mismo que `stock_disponible`). Lo leen `/ocp/stock/sample-kits` y las acciones de Compras.
// Nada se escribe aquí.

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export type PartidaDisponible = {
  partidaId: string;
  codigo: string;
  lotId: string;
  lotName: string;
  producerName: string;
  fincaName: string | null;
  grado: string | null;
  estado: EstadoDePartida;
  contenido: "pergamino" | "verde" | "tostado";
  presentacion: string | null;
  ubicacion: string | null;
  disponibleKg: number;
  comprometido: boolean;
};

/** Las partidas que pueden surtir un kit (con lote, sin comprometer, de verde o de pergamino) y lo que les queda. */
export async function partidasParaKits(service: SupabaseClient): Promise<PartidaDisponible[]> {
  const stock = await cargarStock(service);
  const out: PartidaDisponible[] = [];
  for (const p of stock.partidas) {
    if (!(surteKit(p, "verde") || surteKit(p, "pergamino"))) continue;
    const disponibleKg = movimientosDe(p, stock).disponibleKg;
    if (!(disponibleKg > 0)) continue;
    const lote = p.lotId ? stock.lotes[p.lotId] : null;
    if (!lote) continue;
    out.push({
      partidaId: p.id,
      codigo: p.codigo,
      lotId: lote.id,
      lotName: lote.name,
      producerName: lote.producerName,
      fincaName: lote.fincaName,
      grado: lote.grade,
      estado: p.estado,
      contenido: p.contenido,
      presentacion: p.presentacion,
      ubicacion: p.ubicacion,
      disponibleKg,
      comprometido: p.comprometido,
    });
  }
  return out.sort((a, b) => a.lotName.localeCompare(b.lotName) || a.codigo.localeCompare(b.codigo));
}

/** Las que sirven para un tipo de kit. */
export const paraElKit = (lista: PartidaDisponible[], tipo: TipoDeKit) => lista.filter((p) => p.contenido === contenidoDelKit(tipo) && !p.comprometido);

export type ItemCargado = {
  id: string;
  partidaId: string;
  codigo: string;
  estado: EstadoDePartida;
  estadoNombre: string;
  lotId: string;
  lotName: string;
  producerName: string;
  grado: string;
  kg: number;
  /** Lo que le queda a la partida para OTROS kits (lo de este ya está descontado). */
  disponibleKg: number;
};
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

type LotEmb = { id: string; name: string; grade: string | null; producer_id: string };
type PartidaEmb = { id: string; codigo: string; estado: EstadoDePartida; lot_id: string | null; lots: LotEmb | LotEmb[] | null };

export async function cargarKit(service: SupabaseClient, kitId: string): Promise<KitCargado | null> {
  if (!/^[0-9a-f-]{36}$/i.test(kitId)) return null;
  const [{ data: k }, { data: iRaw }] = await Promise.all([
    service.from("sample_kits").select("id, codigo, tipo, destino, pedido_id, status, guia, notas, anulado_motivo, created_at, enviado_at, anulado_at").eq("id", kitId).maybeSingle(),
    service.from("sample_kit_items").select("id, partida_id, kg, stock_partidas(id, codigo, estado, lot_id, lots(id, name, grade, producer_id))").eq("kit_id", kitId).not("partida_id", "is", null).order("created_at"),
  ]);
  if (!k) return null;
  const filas = (iRaw as unknown as { id: string; partida_id: string; kg: number | string; stock_partidas: PartidaEmb | PartidaEmb[] | null }[] | null) ?? [];
  const disponibles = filas.length ? await Promise.all(filas.map((f) => service.rpc("stock_disponible", { p_partida: f.partida_id }))) : [];
  const producers = await fetchProducerContacts(service, filas.map((f) => uno(uno(f.stock_partidas)?.lots)?.producer_id));
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
    items: filas.map((f, i) => {
      const p = uno(f.stock_partidas);
      const lot = uno(p?.lots);
      const estado = (p?.estado ?? "verde") as EstadoDePartida;
      return {
        id: f.id,
        partidaId: f.partida_id,
        codigo: p?.codigo ?? "—",
        estado,
        estadoNombre: ESTADO_INFO[estado]?.nombre ?? estado,
        lotId: lot?.id ?? "",
        lotName: lot?.name ?? "—",
        producerName: producers.get(lot?.producer_id ?? "")?.fullName ?? "Productor",
        grado: lot?.grade ?? "",
        kg: Number(f.kg),
        disponibleKg: r3(Number(disponibles[i]?.data ?? 0)),
      };
    }),
  };
}

export type KitEnLista = { id: string; codigo: string; tipo: TipoDeKit; destino: string | null; status: KitCargado["status"]; createdAt: string; enviadoAt: string | null; lotes: number; kg: number };

export async function listarKits(service: SupabaseClient): Promise<KitEnLista[]> {
  const { data } = await service.from("sample_kits").select("id, codigo, tipo, destino, status, created_at, enviado_at, sample_kit_items(kg)").order("created_at", { ascending: false });
  return (((data as unknown as { id: string; codigo: string; tipo: TipoDeKit; destino: string | null; status: KitCargado["status"]; created_at: string; enviado_at: string | null; sample_kit_items: { kg: number | string | null }[] }[] | null) ?? []).map((k) => ({
    id: k.id,
    codigo: k.codigo,
    tipo: k.tipo,
    destino: k.destino,
    status: k.status,
    createdAt: k.created_at,
    enviadoAt: k.enviado_at,
    lotes: k.sample_kit_items.length,
    kg: r3(k.sample_kit_items.reduce((a, i) => a + Number(i.kg ?? 0), 0)),
  })));
}
