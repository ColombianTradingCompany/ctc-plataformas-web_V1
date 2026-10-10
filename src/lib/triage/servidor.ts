import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { evaluacionQueRige } from "@/lib/evaluations";
import { edicionVigente } from "@/lib/pvc/servicio";
import { cargarReferenciasEmpaque, type ReferenciaEmpaque } from "@/lib/produccion/referencias";
import { movimientosDe, type ContenidoDePartida, type EstadoDePartida } from "@/lib/stock/linaje";
import { cargarStock, ETIQUETA_DE_ORIGEN, type ClaseDeOrigen } from "@/lib/stock/servidor";
import { lotesSelection } from "@/lib/compras/selection";
import { CLAVE_AJUSTES_TRIAGE, conversionDeFactor, cuentaDelContrato, n2DelGrado } from "./fobMinimo";

// ── Triage de Catálogo Activo · la carga (V5.196) ──────────────────────────────────────────────────────────────────────────────
// Todo lo que la pantalla necesita para triar: los AJUSTES (el O&P y la trilla de CTCx, de `platform_settings` — su valor nunca
// está en el repositorio), la edición vigente del PVC (TRM y el N2 de cada banda, exhibido), las referencias vigentes de Empacado
// hasta FOB, las dos ENTRADAS —los tratos por ventana vigentes (kg de CPS que siguen en la finca) y las partidas libres del Stock
// CTCx—, las DECLARACIONES y los LISTADOS. Sin compuerta: la pasa la página (layout del OCP) o la acción que lo llama.

export type AjustesDelTriage = { opPct: number | null; trillaCopKgCps: number | null; actualizadoEl: string | null };

export type LoteDelTriage = { id: string; name: string; grade: string | null; producerName: string; fincaName: string | null; publicCode: string | null; fr: number | null };

export type EntradaContrato = {
  contractId: string;
  lote: LoteDelTriage;
  precioCopKgCps: number;
  declaradoKg: number;
  vendidoKg: number;
  retiradoKg: number;
  enCatalogoKg: number;
  porDeclararKg: number;
  deMasKg: number;
  conversion: number;
  conversionFuente: "factor" | "pvc";
  vigenciaHasta: string | null;
  ventanaTipo: string | null;
  /** V5.203: el lote tiene una compra CTCx Selection viva — la marca va por lote: TODO su listado sale con el perfil de CTCx (H2). */
  loteSelection: boolean;
};

/** V5.203 (owner, 2026-10-10): de dónde viene una entrada del stock, en las palabras del circuito (la de su raíz). */
export type OrigenDeEntrada = { clase: ClaseDeOrigen; etiqueta: string; compraId: string | null; contractId: string | null };

export type EntradaStock = {
  partidaId: string;
  codigo: string;
  lote: LoteDelTriage;
  estado: EstadoDePartida;
  contenido: ContenidoDePartida;
  presentacion: string | null;
  costoCopKg: number;
  disponibleKg: number;
  declaradoKg: number;
  conversion: number;
  conversionFuente: "uno" | "factor" | "pvc";
  /** Lo tostado (y lo empacado de tostado) se ve pero no se declara: la tienda vende verde (plan §6.10). */
  declarable: boolean;
  origen: OrigenDeEntrada;
  loteSelection: boolean;
};

/** V5.203 (hueco H10): lo que el Triage NO muestra del Stock CTCx y por qué (partidas vivas con café libre). */
export type ExcluidasDelTriage = { sinLote: number; comprometidas: number; tyrian: number };

export type Declaracion = {
  id: string;
  codigo: string;
  lotId: string;
  listingId: string;
  tipo: "contrato" | "stock";
  contractId: string | null;
  partidaId: string | null;
  partidaCodigo: string | null;
  kgVerde: number;
  kgOrigen: number;
  conversion: number;
  precioOrigenCopKg: number;
  trillaCopKg: number;
  cafeCopKg: number;
  referenciaId: string;
  referenciaCodigo: string;
  empaqueCopKg: number;
  opPct: number;
  trm: number;
  fobCopKg: number;
  fobUsdKg: number;
  pvcN2UsdKg: number | null;
  viva: boolean;
  /** Para una declaración de contrato: si el trato sigue vigente (cancelado, cumplido o roto = hay que retirarla). null en stock. */
  contratoVigente: boolean | null;
  nota: string | null;
  creadaEl: string;
  retiradaEl: string | null;
  motivoRetiro: string | null;
};

export type Listado = {
  id: string;
  lotId: string;
  lotName: string;
  grade: string | null;
  publicCode: string | null;
  status: string;
  modo: string;
  unidadKg: number;
  moqKg: number;
  totalKg: number;
  vendidoKg: number;
  precioUsdKg: number;
  depositoPct: number;
  llegada: string | null;
  creditoTransparencia: boolean;
  anclaUsdKg: number | null;
};

export type Triage = {
  ajustes: AjustesDelTriage;
  edicion: { id: string; codigo: string; trm: number; n2: Record<string, number | null> } | null;
  referencias: ReferenciaEmpaque[];
  contratos: EntradaContrato[];
  stock: EntradaStock[];
  declaraciones: Declaracion[];
  listados: Listado[];
  excluidas: ExcluidasDelTriage;
};

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const num = (v: unknown) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export async function leerAjustesDelTriage(service: SupabaseClient): Promise<AjustesDelTriage> {
  const { data } = await service.from("platform_settings").select("value, updated_at").eq("key", CLAVE_AJUSTES_TRIAGE).maybeSingle();
  const v = ((data as { value: Record<string, unknown> | null } | null)?.value ?? {}) as Record<string, unknown>;
  return { opPct: num(v.op_pct), trillaCopKgCps: num(v.trilla_cop_kg_cps), actualizadoEl: (data as { updated_at?: string } | null)?.updated_at ?? null };
}

type FilaLote = { id: string; name: string; grade: string | null; public_code: string | null; producer_id: string; fincas: { name: string } | { name: string }[] | null };

/** El factor de rendimiento de la evaluación que RIGE cada lote (null si no hay). V5.203 · corrección (H5): exportado para que la franja
 *  del circuito (`lib/stock/circuito.ts`) convierta a verde con el MISMO FR que el Triage. */
export async function factoresQueRigen(service: SupabaseClient, ids: string[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!unicos.length) return out;
  const { data: eRaw } = await service.from("lot_evaluations").select("lot_id, status, sca_total, factor_rendimiento, rige_grado, source, created_at").in("lot_id", unicos);
  type FilaEv = { lot_id: string; status: "pending" | "accepted" | "rejected"; sca_total: number | null; factor_rendimiento: number | null; rige_grado: boolean | null; source: string | null; created_at: string | null };
  const evs = (eRaw as FilaEv[] | null) ?? [];
  for (const id of unicos) {
    const rige = evaluacionQueRige(evs.filter((e) => e.lot_id === id));
    out.set(id, rige?.factor_rendimiento != null ? Number(rige.factor_rendimiento) : null);
  }
  return out;
}

async function lotes(service: SupabaseClient, ids: string[]): Promise<Map<string, LoteDelTriage>> {
  const out = new Map<string, LoteDelTriage>();
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!unicos.length) return out;
  const [{ data: lRaw }, fr] = await Promise.all([
    service.from("lots").select("id, name, grade, public_code, producer_id, fincas(name)").in("id", unicos),
    factoresQueRigen(service, unicos),
  ]);
  const filas = (lRaw as unknown as FilaLote[] | null) ?? [];
  const productores = await fetchProducerContacts(service, filas.map((l) => l.producer_id));
  for (const l of filas) {
    out.set(l.id, {
      id: l.id,
      name: l.name,
      grade: l.grade,
      producerName: productores.get(l.producer_id)?.fullName ?? "Productor",
      fincaName: uno(l.fincas)?.name ?? null,
      publicCode: l.public_code,
      fr: fr.get(l.id) ?? null,
    });
  }
  return out;
}

type FilaFuente = {
  id: string; codigo: string; lot_id: string; listing_id: string; tipo: "contrato" | "stock"; contract_id: string | null; partida_id: string | null;
  kg_verde: number | string; kg_origen: number | string; conversion: number | string; precio_origen_cop_kg: number | string; trilla_cop_kg: number | string;
  cafe_cop_kg: number | string; referencia_id: string; empaque_cop_kg: number | string; op_pct: number | string; trm: number | string;
  fob_min_cop_kg: number | string; fob_min_usd_kg: number | string; pvc_n2_usd_kg: number | string | null; estado: string; nota: string | null;
  created_at: string; retirada_at: string | null; retirada_motivo: string | null;
  empaque_fob_referencias: { codigo: string } | { codigo: string }[] | null; stock_partidas: { codigo: string } | { codigo: string }[] | null;
};

export async function cargarTriage(service: SupabaseClient): Promise<Triage> {
  const [ajustes, edicion, referencias, stockCrudo, { data: cRaw }, { data: fRaw }, { data: lRaw }, { data: coRaw }] = await Promise.all([
    leerAjustesDelTriage(service),
    edicionVigente(),
    cargarReferenciasEmpaque(service, { soloVigentes: true }),
    cargarStock(service),
    service.from("purchase_contracts").select("id, lot_id, status, ventana_tipo, quantity_frozen_kg, price_per_kg_locked, vigencia_hasta").eq("status", "active").not("ventana_tipo", "is", null).order("created_at", { ascending: false }),
    service.from("catalogo_fuentes").select("id, codigo, lot_id, listing_id, tipo, contract_id, partida_id, kg_verde, kg_origen, conversion, precio_origen_cop_kg, trilla_cop_kg, cafe_cop_kg, referencia_id, empaque_cop_kg, op_pct, trm, fob_min_cop_kg, fob_min_usd_kg, pvc_n2_usd_kg, estado, nota, created_at, retirada_at, retirada_motivo, empaque_fob_referencias(codigo), stock_partidas(codigo)").order("created_at", { ascending: false }).limit(500),
    service.from("lot_listings").select("id, lot_id, status, commercial_mode, unit_kg, moq_kg, total_kg, sold_kg, price_per_kg, deposit_pct, arrival_date, transparency_credit_enabled, lots(name, grade, public_code)").order("created_at", { ascending: false }),
    // V5.203: qué lotes salen en la vitrina como CTCx Selection (la misma regla que la vitrina: `esCompraSelection`).
    service.from("compras").select("lot_id, destino, anulada_at"),
  ]);
  const selection = lotesSelection((coRaw as { lot_id: string; destino: string; anulada_at: string | null }[] | null) ?? []);

  const declaraciones: Declaracion[] = ((fRaw as unknown as FilaFuente[] | null) ?? []).map((f) => ({
    id: f.id,
    codigo: f.codigo,
    lotId: f.lot_id,
    listingId: f.listing_id,
    tipo: f.tipo,
    contractId: f.contract_id,
    partidaId: f.partida_id,
    partidaCodigo: uno(f.stock_partidas)?.codigo ?? null,
    kgVerde: Number(f.kg_verde),
    kgOrigen: Number(f.kg_origen),
    conversion: Number(f.conversion),
    precioOrigenCopKg: Number(f.precio_origen_cop_kg),
    trillaCopKg: Number(f.trilla_cop_kg),
    cafeCopKg: Number(f.cafe_cop_kg),
    referenciaId: f.referencia_id,
    referenciaCodigo: uno(f.empaque_fob_referencias)?.codigo ?? "—",
    empaqueCopKg: Number(f.empaque_cop_kg),
    opPct: Number(f.op_pct),
    trm: Number(f.trm),
    fobCopKg: Number(f.fob_min_cop_kg),
    fobUsdKg: Number(f.fob_min_usd_kg),
    pvcN2UsdKg: f.pvc_n2_usd_kg != null ? Number(f.pvc_n2_usd_kg) : null,
    viva: f.estado === "declarada",
    contratoVigente: f.tipo === "contrato" ? true : null,
    nota: f.nota,
    creadaEl: f.created_at,
    retiradaEl: f.retirada_at,
    motivoRetiro: f.retirada_motivo,
  }));
  const vivas = declaraciones.filter((d) => d.viva);

  // Una declaración viva de un contrato que ya no está vigente (cancelado, cumplido, roto) se marca para retirarla.
  const activos = new Set(((cRaw as { id: string }[] | null) ?? []).map((c) => c.id));
  for (const d of vivas) if (d.tipo === "contrato" && d.contractId && !activos.has(d.contractId)) d.contratoVigente = false;

  const contratos = (cRaw as { id: string; lot_id: string; ventana_tipo: string | null; quantity_frozen_kg: number | string | null; price_per_kg_locked: number | string | null; vigencia_hasta: string | null }[] | null) ?? [];
  const contratoIds = contratos.map((c) => c.id);
  const [{ data: vRaw }, { data: rRaw }] = await Promise.all([
    contratoIds.length ? service.from("contract_ventas").select("contract_id, kg").in("contract_id", contratoIds).is("anulada_at", null) : Promise.resolve({ data: [] }),
    contratoIds.length ? service.from("contract_retiros").select("contract_id, kg").in("contract_id", contratoIds) : Promise.resolve({ data: [] }),
  ]);
  const suma = (rows: { contract_id: string; kg: number | string }[] | null, id: string) => (rows ?? []).filter((r) => r.contract_id === id).reduce((a, r) => a + (Number(r.kg) || 0), 0);

  const partidasLibres = stockCrudo.partidas.filter((p) => !p.anulada && !p.comprometido && !!p.lotId);
  const loteDe = await lotes(service, [...contratos.map((c) => c.lot_id), ...partidasLibres.map((p) => p.lotId ?? ""), ...vivas.map((d) => d.lotId)]);

  const entradasContrato: EntradaContrato[] = [];
  for (const c of contratos) {
    const lote = loteDe.get(c.lot_id);
    if (!lote || lote.grade === "tyrian") continue;
    const enCatalogoKg = vivas.filter((d) => d.contractId === c.id).reduce((a, d) => a + d.kgOrigen, 0);
    const retiradoKg = suma(rRaw as { contract_id: string; kg: number | string }[] | null, c.id);
    const cuenta = cuentaDelContrato({ declaradoKg: Number(c.quantity_frozen_kg ?? 0), retiradoKg, declaradoEnCatalogoKg: enCatalogoKg });
    const conv = conversionDeFactor(lote.fr);
    entradasContrato.push({
      contractId: c.id,
      lote,
      precioCopKgCps: Number(c.price_per_kg_locked ?? 0),
      declaradoKg: Number(c.quantity_frozen_kg ?? 0),
      vendidoKg: suma(vRaw as { contract_id: string; kg: number | string }[] | null, c.id),
      retiradoKg,
      enCatalogoKg: Math.round(enCatalogoKg * 10) / 10,
      porDeclararKg: cuenta.porDeclararKg,
      deMasKg: cuenta.deMasKg,
      conversion: conv.conversion,
      conversionFuente: conv.fuente,
      vigenciaHasta: c.vigencia_hasta,
      ventanaTipo: c.ventana_tipo,
      loteSelection: selection.has(lote.id),
    });
  }

  const entradasStock: EntradaStock[] = [];
  // V5.203 (H10): lo que se queda fuera, contado (partidas vivas con café libre) para decirlo en pantalla.
  const excluidas: ExcluidasDelTriage = { sinLote: 0, comprometidas: 0, tyrian: 0 };
  for (const p of stockCrudo.partidas) {
    if (p.anulada || !(movimientosDe(p, stockCrudo).disponibleKg > 0)) continue;
    if (!p.lotId) excluidas.sinLote += 1;
    else if (p.comprometido) excluidas.comprometidas += 1;
  }
  for (const p of partidasLibres) {
    const lote = p.lotId ? loteDe.get(p.lotId) : null;
    if (lote?.grade === "tyrian" && movimientosDe(p, stockCrudo).disponibleKg > 0) excluidas.tyrian += 1;
    if (!lote || lote.grade === "tyrian") continue;
    const m = movimientosDe(p, stockCrudo);
    const declaradoKg = vivas.filter((d) => d.partidaId === p.id).reduce((a, d) => a + d.kgOrigen, 0);
    if (!(m.disponibleKg > 0) && !(declaradoKg > 0)) continue;
    const esVerde = p.contenido === "verde";
    const conv = conversionDeFactor(lote.fr);
    entradasStock.push({
      partidaId: p.id,
      codigo: p.codigo,
      lote,
      estado: p.estado,
      contenido: p.contenido,
      presentacion: p.presentacion,
      costoCopKg: p.costoCopKg,
      disponibleKg: m.disponibleKg,
      declaradoKg: Math.round(declaradoKg * 1000) / 1000,
      conversion: esVerde ? 1 : conv.conversion,
      conversionFuente: esVerde ? "uno" : conv.fuente,
      declarable: p.contenido === "verde" || p.contenido === "pergamino",
      origen: (() => {
        const o = stockCrudo.origenes[p.raizId];
        return o ? { clase: o.clase, etiqueta: o.etiqueta, compraId: o.compraId, contractId: o.contractId } : { clase: "manual" as const, etiqueta: ETIQUETA_DE_ORIGEN.manual, compraId: null, contractId: null };
      })(),
      loteSelection: selection.has(lote.id),
    });
  }

  const pila = edicion?.outputs?.pila ?? [];
  const n2: Record<string, number | null> = {};
  for (const g of ["black", "red", "blue", "gold", "tyrian"]) n2[g] = n2DelGrado(pila, g);

  type FilaListado = { id: string; lot_id: string; status: string; commercial_mode: string; unit_kg: number | string; moq_kg: number | string; total_kg: number | string; sold_kg: number | string; price_per_kg: number | string; deposit_pct: number | string; arrival_date: string | null; transparency_credit_enabled: boolean; lots: { name: string; grade: string | null; public_code: string | null } | { name: string; grade: string | null; public_code: string | null }[] | null };
  const listados: Listado[] = ((lRaw as unknown as FilaListado[] | null) ?? []).map((l) => {
    const lot = uno(l.lots);
    const anclas = vivas.filter((d) => d.listingId === l.id).map((d) => d.fobUsdKg);
    return {
      id: l.id,
      lotId: l.lot_id,
      lotName: lot?.name ?? "—",
      grade: lot?.grade ?? null,
      publicCode: lot?.public_code ?? null,
      status: l.status,
      modo: l.commercial_mode,
      unidadKg: Number(l.unit_kg),
      moqKg: Number(l.moq_kg),
      totalKg: Number(l.total_kg),
      vendidoKg: Number(l.sold_kg),
      precioUsdKg: Number(l.price_per_kg),
      depositoPct: Number(l.deposit_pct),
      llegada: l.arrival_date,
      creditoTransparencia: l.transparency_credit_enabled,
      anclaUsdKg: anclas.length ? Math.max(...anclas) : null,
    };
  });

  return {
    ajustes,
    edicion: edicion ? { id: edicion.id, codigo: edicion.code, trm: Number(edicion.inputs?.trm ?? 0), n2 } : null,
    referencias,
    contratos: entradasContrato,
    stock: entradasStock,
    declaraciones,
    listados,
    excluidas,
  };
}
