import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import type {
  ContenidoDePartida, EstadoDePartida, OrigenDePartida, Partida, ReservaDeKit, ReservaDeMezcla, Salida, StockCrudo, TipoDeSalida,
  TipoDeTransformacion, Transformacion,
} from "./linaje";

// ── Stock CTCx · la carga y las raíces (V5.195) ────────────────────────────────────────────────────────────────────────────────
// `cargarStock` lee todo lo del Stock CTCx (son pocas filas: una bodega, no un almacén) con lo que la pantalla necesita para
// nombrar cada partida: su lote, su productor, de qué despacho o compra salió y en qué kit está. `crearRaizDeStock` es la ÚNICA
// puerta por la que el café entra al stock desde otro módulo (recibir un despacho, pagar el mes de una compra en firme, registrar
// una compra a mano, el ingreso a mano): llama a `stock_raiz`, que es idempotente por compra y por despacho. No tiene compuerta:
// la pasa la acción que la llama. Nunca lanza: devuelve `{ ok:false }` y lo escribe en el log del servidor.

export type LoteDelStock = { id: string; name: string; grade: string | null; publicCode: string | null; producerName: string; fincaName: string | null };
export type OrigenDeRaiz = { tipo: string; detalle: string; contractId: string | null };

export type StockCargado = StockCrudo & {
  lotes: Record<string, LoteDelStock>;
  /** De dónde salió cada raíz (por id de partida raíz): el despacho (saco · adelanto · vendido) o la compra (contrato · manual). */
  origenes: Record<string, OrigenDeRaiz>;
  kits: Record<string, { codigo: string; status: string }>;
};

type FilaPartida = {
  id: string; codigo: string; lot_id: string | null; origen_texto: string | null; estado: EstadoDePartida; contenido: ContenidoDePartida;
  kg: number | string; costo_cop_kg: number | string; equivalencia: number | string; raiz_id: string; madre_transformacion_id: string | null;
  origen: OrigenDePartida; despacho_id: string | null; compra_id: string | null; comprometido: boolean; ubicacion: string | null;
  presentacion: string | null; nota: string | null; created_at: string; anulada_at: string | null; anulada_motivo: string | null;
};
type FilaTx = {
  id: string; codigo: string; tipo: TipoDeTransformacion; madre_id: string; kg_entrada: number | string; merma_humedad_kg: number | string;
  residuos_kg: number | string; perdidas_kg: number | string; costo_operacion_cop: number | string; fecha: string; nota: string | null;
  anulada_at: string | null; anulada_motivo: string | null;
};
type FilaSalida = { id: string; partida_id: string; tipo: TipoDeSalida; kg: number | string; kit_id: string | null; motivo: string; fecha: string; anulada_at: string | null };

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export const COLUMNAS_PARTIDA =
  "id, codigo, lot_id, origen_texto, estado, contenido, kg, costo_cop_kg, equivalencia, raiz_id, madre_transformacion_id, origen, despacho_id, compra_id, comprometido, ubicacion, presentacion, nota, created_at, anulada_at, anulada_motivo";

export const aPartida = (r: FilaPartida): Partida => ({
  id: r.id,
  codigo: r.codigo,
  lotId: r.lot_id,
  origenTexto: r.origen_texto,
  estado: r.estado,
  contenido: r.contenido,
  kg: Number(r.kg),
  costoCopKg: Number(r.costo_cop_kg),
  equivalencia: Number(r.equivalencia),
  raizId: r.raiz_id,
  madreTransformacionId: r.madre_transformacion_id,
  origen: r.origen,
  despachoId: r.despacho_id,
  compraId: r.compra_id,
  comprometido: r.comprometido,
  ubicacion: r.ubicacion,
  presentacion: r.presentacion,
  nota: r.nota,
  createdAt: r.created_at,
  anulada: !!r.anulada_at,
  anuladaMotivo: r.anulada_motivo,
});

export async function cargarStock(service: SupabaseClient): Promise<StockCargado> {
  const [{ data: pRaw }, { data: tRaw }, { data: sRaw }, { data: kRaw }, { data: mRaw }] = await Promise.all([
    service.from("stock_partidas").select(COLUMNAS_PARTIDA).order("created_at", { ascending: true }).limit(5000),
    service.from("stock_transformaciones").select("id, codigo, tipo, madre_id, kg_entrada, merma_humedad_kg, residuos_kg, perdidas_kg, costo_operacion_cop, fecha, nota, anulada_at, anulada_motivo").order("created_at", { ascending: true }).limit(5000),
    service.from("stock_salidas").select("id, partida_id, tipo, kg, kit_id, motivo, fecha, anulada_at").order("created_at", { ascending: true }).limit(5000),
    service.from("sample_kit_items").select("partida_id, kg, kit_id, sample_kits!inner(codigo, status)").not("partida_id", "is", null).limit(5000),
    service.from("mezcla_componentes").select("compra_id, kg, mezclas!inner(status)").neq("mezclas.status", "anulada").limit(5000),
  ]);
  const partidas = ((pRaw as FilaPartida[] | null) ?? []).map(aPartida);
  const transformaciones: Transformacion[] = ((tRaw as FilaTx[] | null) ?? []).map((t) => ({
    id: t.id,
    codigo: t.codigo,
    tipo: t.tipo,
    madreId: t.madre_id,
    kgEntrada: Number(t.kg_entrada),
    humedadKg: Number(t.merma_humedad_kg),
    residuosKg: Number(t.residuos_kg),
    perdidasKg: Number(t.perdidas_kg),
    costoOperacionCop: Number(t.costo_operacion_cop),
    fecha: t.fecha,
    nota: t.nota,
    anulada: !!t.anulada_at,
    anuladaMotivo: t.anulada_motivo,
  }));
  const salidas: Salida[] = ((sRaw as FilaSalida[] | null) ?? []).map((x) => ({ id: x.id, partidaId: x.partida_id, tipo: x.tipo, kg: Number(x.kg), kitId: x.kit_id, motivo: x.motivo, fecha: x.fecha, anulada: !!x.anulada_at }));

  type FilaItem = { partida_id: string; kg: number | string; kit_id: string; sample_kits: { codigo: string; status: string } | { codigo: string; status: string }[] | null };
  const kits: StockCargado["kits"] = {};
  const reservasKit: ReservaDeKit[] = [];
  for (const i of (kRaw as unknown as FilaItem[] | null) ?? []) {
    const k = uno(i.sample_kits);
    if (!k) continue;
    kits[i.kit_id] = { codigo: k.codigo, status: k.status };
    if (k.status === "armado") reservasKit.push({ partidaId: i.partida_id, kg: Number(i.kg), kitId: i.kit_id, kitCodigo: k.codigo });
  }
  // Los kits de las salidas (enviados) también se nombran.
  const kitIdsDeSalidas = [...new Set(salidas.map((x) => x.kitId).filter((id): id is string => !!id && !kits[id]))];
  if (kitIdsDeSalidas.length) {
    const { data } = await service.from("sample_kits").select("id, codigo, status").in("id", kitIdsDeSalidas);
    for (const k of (data as { id: string; codigo: string; status: string }[] | null) ?? []) kits[k.id] = { codigo: k.codigo, status: k.status };
  }
  const reservasMezcla: ReservaDeMezcla[] = ((mRaw as unknown as { compra_id: string; kg: number | string }[] | null) ?? []).map((m) => ({ compraId: m.compra_id, kg: Number(m.kg) }));

  // Los lotes, con su productor y su finca.
  const lotIds = [...new Set(partidas.map((p) => p.lotId).filter((id): id is string => !!id))];
  const lotes: StockCargado["lotes"] = {};
  if (lotIds.length) {
    const { data } = await service.from("lots").select("id, name, grade, public_code, producer_id, fincas(name)").in("id", lotIds);
    const filas = (data as unknown as { id: string; name: string; grade: string | null; public_code: string | null; producer_id: string; fincas: { name: string } | { name: string }[] | null }[] | null) ?? [];
    const productores = await fetchProducerContacts(service, filas.map((l) => l.producer_id));
    for (const l of filas) {
      lotes[l.id] = { id: l.id, name: l.name, grade: l.grade, publicCode: l.public_code, producerName: productores.get(l.producer_id)?.fullName ?? "Productor", fincaName: uno(l.fincas)?.name ?? null };
    }
  }

  // De dónde salió cada raíz.
  const origenes: StockCargado["origenes"] = {};
  const raices = partidas.filter((p) => p.raizId === p.id);
  const despachoIds = raices.map((p) => p.despachoId).filter((id): id is string => !!id);
  const compraIds = raices.map((p) => p.compraId).filter((id): id is string => !!id);
  const [{ data: dRaw }, { data: cRaw }] = await Promise.all([
    despachoIds.length ? service.from("contract_despachos").select("id, tipo, contract_id, recibido_at").in("id", despachoIds) : Promise.resolve({ data: [] }),
    compraIds.length ? service.from("compras").select("id, origen, destino, contract_id, mes").in("id", compraIds) : Promise.resolve({ data: [] }),
  ]);
  const despachos = new Map(((dRaw as { id: string; tipo: string; contract_id: string; recibido_at: string | null }[] | null) ?? []).map((d) => [d.id, d]));
  const compras = new Map(((cRaw as { id: string; origen: string; destino: string; contract_id: string | null; mes: number | null }[] | null) ?? []).map((c) => [c.id, c]));
  const TIPO_DESPACHO: Record<string, string> = { saco: "Saco", adelanto: "Adelanto", vendido: "Vendido (a nombre del productor)" };
  for (const p of raices) {
    const d = p.despachoId ? despachos.get(p.despachoId) : null;
    const c = p.compraId ? compras.get(p.compraId) : null;
    if (d) origenes[p.id] = { tipo: "Despacho recibido", detalle: TIPO_DESPACHO[d.tipo] ?? d.tipo, contractId: d.contract_id };
    else if (c) origenes[p.id] = { tipo: c.origen === "contrato" ? "Compra en firme" : "Compra a mano", detalle: `${c.destino === "selection" ? "CTCx Selection" : "solo stock"}${c.mes ? ` · mes ${c.mes}` : ""}`, contractId: c.contract_id };
    else origenes[p.id] = { tipo: "Ingreso a mano", detalle: p.origenTexto ?? "", contractId: null };
  }

  return { partidas, transformaciones, salidas, reservasKit, reservasMezcla, lotes, origenes, kits };
}

export type ArgsRaiz = {
  lotId: string | null;
  estado: EstadoDePartida;
  contenido?: ContenidoDePartida | null;
  kg: number;
  costoCopKg: number;
  origen: "despacho" | "compra" | "manual";
  despachoId?: string | null;
  compraId?: string | null;
  comprometido?: boolean;
  ubicacion?: string | null;
  presentacion?: string | null;
  nota?: string | null;
  origenTexto?: string | null;
  por: string | null;
};

/** El café entra al Stock CTCx (o se corrige su raíz, si aún no se movió). Idempotente por compra y por despacho. */
export async function crearRaizDeStock(service: SupabaseClient, a: ArgsRaiz): Promise<{ ok: true; id: string; codigo: string | null } | { ok: false; error: string }> {
  const { data, error } = await service.rpc("stock_raiz", {
    p_lot: a.lotId,
    p_estado: a.estado,
    p_contenido: a.contenido ?? null,
    p_kg: a.kg,
    p_costo_cop_kg: Math.max(0, Math.round((Number(a.costoCopKg) || 0) * 100) / 100),
    p_origen: a.origen,
    p_despacho: a.despachoId ?? null,
    p_compra: a.compraId ?? null,
    p_comprometido: !!a.comprometido,
    p_ubicacion: a.ubicacion ?? null,
    p_presentacion: a.presentacion ?? null,
    p_nota: a.nota ?? null,
    p_origen_texto: a.origenTexto ?? null,
    p_por: a.por,
  });
  if (error || !data) {
    console.error("crearRaizDeStock: stock_raiz falló", error);
    return { ok: false, error: error?.message ?? "sin respuesta" };
  }
  const id = String(data);
  const { data: fila } = await service.from("stock_partidas").select("codigo").eq("id", id).maybeSingle();
  return { ok: true, id, codigo: (fila as { codigo: string } | null)?.codigo ?? null };
}

/** El mensaje de la base sin el prefijo técnico: lo que la pantalla le dice al operador. */
export const mensajeDeLaBase = (m: string | null | undefined) => String(m ?? "").replace(/^ERROR:\s*/i, "").replace(/\s*CONTEXT:[\s\S]*$/, "").trim() || "La base no aceptó la operación.";
