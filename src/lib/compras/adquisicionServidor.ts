import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { equivalenteEnRaiz, movimientosDe } from "@/lib/stock/linaje";
import { cargarStock, type StockCargado } from "@/lib/stock/servidor";
import {
  esDeDespacho, listaDe, motivoParaNoAnular, motivoParaNoDestinar, origenLegible, precioLegible, raizVivaDe, siguientesPasos,
  type Destino, type PasoDeCompra,
} from "./adquisicion";
import { cambioAlAnular, esCompraSelection, textoDeVitrina, type FotoDeVitrina } from "./selection";

// ── Adquisición de Stock Café · la carga (V5.203, owner 2026-10-10) ────────────────────────────────────────────────────────────
// Todo lo que `/ocp/compras` pinta, leído una vez: las compras (vivas y anuladas) con su lote, su productor, su partida raíz en el Stock
// CTCx —el embed `stock_partidas` llega como OBJETO o null porque `compra_id` es UNIQUE: se normaliza con `listaDe` (bug B1, la caída
// del 2026-10-10)—, el disponible REAL de su familia (el de `movimientosDe`, que ya resta lo declarado), sus mezclas vivas y sus
// declaraciones en el Triage; lo que está POR RECIBIR (sacos y adelantos de los tratos por ventana vigentes); los tratos vivos por
// lote (el aviso del formulario a mano) y los lotes que se pueden comprar. Sin compuerta: la pasa el layout del OCP. Nada se escribe.
//
// V5.203 · corrección (nodo final, 2026-10-10):
//   · decisión 2 / H7 — lo que la VITRINA enseña de cada lote (`FotoDeVitrina`): la tabla y el alta piden confirmar cuando quitar o
//     poner la marca Selection cambia la cara de un lote que ya sale en la vitrina; las acciones lo repiten con la base fresca
//     (`leerVitrinaDelLote`, abajo) y las mismas funciones puras (`selection.ts`);
//   · H1/H2 — una compra de un saco o un adelanto encuentra su partida también por su DESPACHO (`compras.despacho_id`): el reintento
//     crea la compra que faltaba y la base no deja enlazar una partida que nació sin ella;
//   · H8 — si una lectura falla, `errorDeLectura` lo dice y la pantalla no pinta indicadores ni tablas vacías que mientan;
//   · H10 — lo libre en kg de CPS EQUIVALENTES (`equivalenteEnRaiz`), como dice la página; H15 — la fecha en que se REGISTRÓ.

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const r1 = (n: number) => Math.round(n * 10) / 10;

type MezclaEmb = { id: string; codigo: string; status: string };
type RaizEmb = { id: string; codigo: string; anulada_at: string | null; despacho_id: string | null; ubicacion: string | null };
type LoteEmb = { id: string; name: string; producer_id: string; grade: string | null; stage?: string | null; fincas: { name: string } | { name: string }[] | null };
type FilaCompra = {
  id: string; lot_id: string; contract_id: string | null; mes: number | null; grado: string; kg: number | string; cop_kg: number | string;
  total_cop: number | string; precio_fuente: string | null; modificador_pct: number | string | null; recibida_at: string | null;
  pagada_at: string | null; pago_ref: string | null; origen: string; nota: string | null; ubicacion: string | null; destino: Destino;
  created_at: string; anulada_at: string | null; anulada_motivo: string | null; despacho_id: string | null;
  lots: LoteEmb | LoteEmb[] | null;
  pvc_editions: { code: string } | { code: string }[] | null;
  mezcla_componentes: { kg: number | string; mezclas: MezclaEmb | MezclaEmb[] | null }[] | { kg: number | string; mezclas: MezclaEmb | MezclaEmb[] | null } | null;
  /** UNIQUE(compra_id): PostgREST lo trata como uno a uno — objeto o null (B1). */
  stock_partidas: RaizEmb | RaizEmb[] | null;
};

export type CompraDeAdquisicion = {
  id: string;
  lotId: string;
  lotName: string;
  producerName: string;
  fincaName: string | null;
  grado: string;
  kg: number;
  copKg: number;
  totalCop: number;
  /** La fecha de la fila: la del pago, o la del registro si no se ha pagado. */
  fecha: string;
  /** H15: cuándo se registró la compra (la columna «Registrada» enseñaba la del pago). */
  registradaAt: string;
  pagadaAt: string | null;
  recibidaAt: string | null;
  pagoRef: string | null;
  origen: string;
  origenCrudo: string;
  contractId: string | null;
  precio: string;
  nota: string | null;
  destino: Destino;
  anulada: boolean;
  anuladaAt: string | null;
  anuladaMotivo: string | null;
  /** La ubicación: la de la partida raíz si ya entró (una sola verdad, B7); si no, la de la compra. */
  ubicacion: string | null;
  raiz: { id: string; codigo: string } | null;
  /** H1/H2: la raíz se encontró por el DESPACHO de la compra (nació sin ella y la base no deja enlazarla después). */
  raizPorDespacho: boolean;
  /** H10: lo libre de la familia de la raíz en kg de CPS equivalentes. */
  disponibleKg: number;
  pasos: PasoDeCompra[];
  /** Por qué NO puede pasar a cada destino (null = puede). */
  noDestinable: Record<Destino, string | null>;
  /** Por qué NO se puede anular (null = se puede). */
  noAnulable: string | null;
  /** Decisión 2: qué dice la vitrina al pasar al OTRO destino, y si hay que confirmarlo. */
  vitrinaAlCambiar: { texto: string; confirmar: boolean };
  /** Decisión 2: el aviso que se confirma al anular (null = la vitrina no cambia de cara). */
  vitrinaAlAnular: string | null;
};

export type DespachoPorRecibir = {
  id: string;
  contractId: string;
  lotId: string;
  lotName: string;
  producerName: string;
  tipo: string;
  kg: number;
  copKg: number;
  totalCop: number;
  plazo: string | null;
  prorrogaHasta: string | null;
  estado: string;
  pago60: boolean;
};

export type TratoVivo = { contractId: string; precioCopKg: number; pvcCode: string | null };
export type LoteComprable = { id: string; name: string; fincaName: string | null; grade: string | null };

export type Adquisicion = {
  compras: CompraDeAdquisicion[];
  anuladas: CompraDeAdquisicion[];
  porRecibir: DespachoPorRecibir[];
  tratosVivos: Record<string, TratoVivo>;
  galardonados: LoteComprable[];
  /** Decisión 2 / H7: lo que la vitrina enseña de cada lote comprable (el alta a mano pide confirmar si cambia su cara). */
  vitrinaDeLotes: Record<string, FotoDeVitrina>;
  stock: StockCargado;
  /** H8: si una lectura falló, por qué (la pantalla lo dice y no pinta indicadores ni tablas vacías que mientan). */
  errorDeLectura: string | null;
};

/** La foto de la vitrina de cada lote, con lo ya leído: la MISMA condición que `public_lot_vitrina` (vía `saleEnLaVitrina`). */
function fotosDeVitrina(e: {
  lotes: { id: string; stage: string | null; grade: string | null }[];
  tratos: Set<string>;
  declarados: Set<string>;
  stock: StockCargado;
  compras: { id: string; lot_id: string; destino: string; anulada_at: string | null }[];
}): Record<string, FotoDeVitrina> {
  const out: Record<string, FotoDeVitrina> = {};
  for (const l of e.lotes) {
    if (out[l.id]) continue;
    out[l.id] = {
      stage: l.stage,
      grade: l.grade,
      tratoVivo: e.tratos.has(l.id),
      declaracionViva: e.declarados.has(l.id),
      partidasLibres: e.stock.partidas.filter((p) => p.lotId === l.id && !p.anulada && !p.comprometido).map((p) => p.id),
      comprasSelectionVivas: e.compras.filter((c) => c.lot_id === l.id && esCompraSelection(c)).map((c) => c.id),
    };
  }
  return out;
}

export async function cargarAdquisicion(service: SupabaseClient): Promise<Adquisicion> {
  const [stock, { data: cRaw, error: errorCompras }, { data: fRaw, error: errorFuentes }, { data: dRaw, error: errorDespachos }, { data: tRaw, error: errorTratos }, { data: gRaw, error: errorLotes }] = await Promise.all([
    cargarStock(service),
    service
      .from("compras")
      .select(
        "id, lot_id, contract_id, mes, grado, kg, cop_kg, total_cop, precio_fuente, modificador_pct, recibida_at, pagada_at, pago_ref, origen, nota, ubicacion, destino, created_at, anulada_at, anulada_motivo, despacho_id, lots(id, name, producer_id, grade, stage, fincas(name)), pvc_editions(code), mezcla_componentes(kg, mezclas(id, codigo, status)), stock_partidas(id, codigo, anulada_at, despacho_id, ubicacion)"
      )
      .order("created_at", { ascending: false }),
    service.from("catalogo_fuentes").select("codigo, lot_id, partida_id, kg_verde, created_at").eq("estado", "declarada").order("created_at"),
    service
      .from("contract_despachos")
      .select("id, contract_id, tipo, kg, cop_kg, total_cop, plazo, prorroga_hasta, estado, pago_despacho_at, purchase_contracts!inner(lot_id, status, lots(id, name, producer_id))")
      .in("estado", ["pendiente", "despachado"])
      .eq("purchase_contracts.status", "active")
      .order("plazo", { ascending: true }),
    service.from("purchase_contracts").select("id, lot_id, price_per_kg_locked, pvc_editions(code)").eq("status", "active").not("ventana_tipo", "is", null),
    service.from("lots").select("id, name, grade, stage, fincas(name)").eq("stage", "galardonado").neq("grade", "tyrian").order("name"),
  ]);

  const filas = (cRaw as unknown as FilaCompra[] | null) ?? [];
  type FilaDespacho = { id: string; contract_id: string; tipo: string; kg: number | string; cop_kg: number | string; total_cop: number | string; plazo: string | null; prorroga_hasta: string | null; estado: string; pago_despacho_at: string | null; purchase_contracts: { lot_id: string; status: string; lots: LoteEmb | LoteEmb[] | null } | { lot_id: string; status: string; lots: LoteEmb | LoteEmb[] | null }[] | null };
  const despachos = (dRaw as unknown as FilaDespacho[] | null) ?? [];
  const producers = await fetchProducerContacts(service, [
    ...filas.map((c) => uno(c.lots)?.producer_id),
    ...despachos.map((d) => uno(uno(d.purchase_contracts)?.lots)?.producer_id),
  ]);
  const fuentes = (fRaw as { codigo: string; lot_id: string; partida_id: string | null; kg_verde: number | string }[] | null) ?? [];
  const primeraDelLote = new Map<string, string>();
  for (const f of fuentes) if (!primeraDelLote.has(f.lot_id)) primeraDelLote.set(f.lot_id, f.codigo);

  const tratosVivos: Record<string, TratoVivo> = {};
  for (const t of (tRaw as unknown as { id: string; lot_id: string; price_per_kg_locked: number | string | null; pvc_editions: { code: string } | { code: string }[] | null }[] | null) ?? []) {
    if (!tratosVivos[t.lot_id]) tratosVivos[t.lot_id] = { contractId: t.id, precioCopKg: Number(t.price_per_kg_locked ?? 0), pvcCode: uno(t.pvc_editions)?.code ?? null };
  }
  const galardonadosRaw = (gRaw as unknown as { id: string; name: string; grade: string | null; stage: string | null; fincas: { name: string } | { name: string }[] | null }[] | null) ?? [];
  const vitrina = fotosDeVitrina({
    lotes: [
      ...filas.map((c) => uno(c.lots)).filter((l): l is LoteEmb => !!l).map((l) => ({ id: l.id, stage: l.stage ?? null, grade: l.grade })),
      ...galardonadosRaw.map((l) => ({ id: l.id, stage: l.stage, grade: l.grade })),
    ],
    tratos: new Set(Object.keys(tratosVivos)),
    declarados: new Set(primeraDelLote.keys()),
    stock,
    compras: filas,
  });

  const aCompra = (c: FilaCompra): CompraDeAdquisicion => {
    const lot = uno(c.lots);
    const anulada = !!c.anulada_at;
    // La raíz por su compra; si no, la del DESPACHO de la compra (H1/H2: una compra creada al reintentar no puede enlazar la partida
    // que nació sin ella —la base no deja cambiar el vínculo de una partida—, pero se encuentran por el despacho).
    const porCompra = anulada ? null : raizVivaDe(c.stock_partidas);
    const porDespacho = !anulada && !porCompra && c.despacho_id ? stock.partidas.find((p) => p.despachoId === c.despacho_id && p.raizId === p.id && !p.anulada) ?? null : null;
    const raiz = porCompra ? { id: porCompra.id, codigo: porCompra.codigo, ubicacion: porCompra.ubicacion } : porDespacho ? { id: porDespacho.id, codigo: porDespacho.codigo, ubicacion: porDespacho.ubicacion } : null;
    const despachoId = c.despacho_id ?? listaDe(c.stock_partidas).find((p) => p.despacho_id)?.despacho_id ?? null;
    const mezclas = listaDe(c.mezcla_componentes)
      .map((m) => ({ kg: Number(m.kg), mezcla: uno(m.mezclas) }))
      .filter((m) => m.mezcla && m.mezcla.status !== "anulada")
      .map((m) => ({ id: m.mezcla!.id, codigo: m.mezcla!.codigo, kg: r1(m.kg) }));
    // La familia de la raíz (la raíz y lo que salió de ella): su disponible real, lo declarable y lo declarado.
    const familia = raiz ? stock.partidas.filter((p) => p.raizId === raiz.id && !p.anulada) : [];
    let disponibleCps = 0;
    let declarable: { partidaId: string; kg: number } | null = null;
    let conMovimientos = false;
    for (const p of familia) {
      const m = movimientosDe(p, stock);
      // H10: en kg de CPS equivalentes (la raíz de una compra es pergamino): el verde y el tostado se cuentan por lo que fueron.
      disponibleCps += equivalenteEnRaiz(p, m.disponibleKg);
      if (p.id === raiz?.id) conMovimientos = m.transformadoKg > 0 || m.salidoKg > 0 || m.reservadoKitKg > 0 || m.declaradoKg > 0;
      const declarableAqui = !p.comprometido && !!p.lotId && lot?.grade !== "tyrian" && (p.contenido === "pergamino" || p.contenido === "verde");
      if (declarableAqui && m.disponibleKg > (declarable?.kg ?? 0)) declarable = { partidaId: p.id, kg: r1(m.disponibleKg) };
    }
    const ids = new Set(familia.map((p) => p.id));
    const declaraciones = fuentes.filter((f) => f.partida_id && ids.has(f.partida_id)).map((f) => ({ codigo: f.codigo, partidaId: f.partida_id as string, kgVerde: r1(Number(f.kg_verde)) }));
    const reglas = {
      actual: c.destino,
      anulada,
      enMezclaViva: mezclas.length > 0,
      deDespacho: esDeDespacho({ precioFuente: c.precio_fuente, raizDespachoId: despachoId }),
      declaracionViva: primeraDelLote.get(c.lot_id) ?? null,
    };
    const otro: Destino = c.destino === "selection" ? "stock" : "selection";
    const foto = vitrina[c.lot_id] ?? null;
    return {
      id: c.id,
      lotId: c.lot_id,
      lotName: lot?.name ?? "—",
      producerName: producers.get(lot?.producer_id ?? "")?.fullName ?? "Productor",
      fincaName: uno(lot?.fincas)?.name ?? null,
      grado: c.grado,
      kg: Number(c.kg),
      copKg: Number(c.cop_kg),
      totalCop: Number(c.total_cop),
      fecha: c.pagada_at ?? c.created_at,
      registradaAt: c.created_at,
      pagadaAt: c.pagada_at,
      recibidaAt: c.recibida_at,
      pagoRef: c.pago_ref,
      origen: origenLegible({ origen: c.origen, mes: c.mes, precioFuente: c.precio_fuente }),
      origenCrudo: c.origen,
      contractId: c.contract_id,
      precio: precioLegible({ pvcCode: uno(c.pvc_editions)?.code ?? null, precioFuente: c.precio_fuente, modificadorPct: c.modificador_pct == null ? null : Number(c.modificador_pct) }),
      nota: c.nota,
      destino: c.destino,
      anulada,
      anuladaAt: c.anulada_at,
      anuladaMotivo: c.anulada_motivo,
      ubicacion: raiz ? raiz.ubicacion : c.ubicacion,
      raiz: raiz ? { id: raiz.id, codigo: raiz.codigo } : null,
      raizPorDespacho: !!porDespacho,
      disponibleKg: r1(disponibleCps),
      pasos: siguientesPasos({ anulada, raiz: raiz ? { id: raiz.id, codigo: raiz.codigo } : null, disponibleKg: r1(disponibleCps), declarable, declaraciones, mezclas }),
      noDestinable: {
        selection: c.destino === "selection" ? null : motivoParaNoDestinar({ ...reglas, nuevo: "selection" }),
        stock: c.destino === "stock" ? null : motivoParaNoDestinar({ ...reglas, nuevo: "stock" }),
      },
      noAnulable: motivoParaNoAnular({ anulada, origen: c.origen, enMezclaViva: mezclas.length > 0, raizCodigo: raiz?.codigo ?? null, raizConMovimientos: conMovimientos }),
      vitrinaAlCambiar: anulada ? { texto: "", confirmar: false } : textoDeVitrina(foto, otro, c.id),
      vitrinaAlAnular: anulada || !foto ? null : cambioAlAnular(foto, c.id, raiz?.id ?? null),
    };
  };
  const todas = filas.map(aCompra);

  const porRecibir: DespachoPorRecibir[] = despachos.map((d) => {
    const pc = uno(d.purchase_contracts);
    const lot = uno(pc?.lots);
    return {
      id: d.id,
      contractId: d.contract_id,
      lotId: pc?.lot_id ?? "",
      lotName: lot?.name ?? "—",
      producerName: producers.get(lot?.producer_id ?? "")?.fullName ?? "Productor",
      tipo: d.tipo,
      kg: Number(d.kg),
      copKg: Number(d.cop_kg),
      totalCop: Number(d.total_cop),
      plazo: d.plazo,
      prorrogaHasta: d.prorroga_hasta,
      estado: d.estado,
      pago60: !!d.pago_despacho_at,
    };
  });

  const galardonados = galardonadosRaw.map((l) => ({ id: l.id, name: l.name, fincaName: uno(l.fincas)?.name ?? null, grade: l.grade }));
  const vitrinaDeLotes: Record<string, FotoDeVitrina> = {};
  for (const l of galardonados) if (vitrina[l.id]) vitrinaDeLotes[l.id] = vitrina[l.id];

  // H8: la primera lectura que falló (las compras primero: sin ellas nada de la pantalla es cierto).
  const fallo = [
    ["las compras", errorCompras],
    ["el Catálogo Activo", errorFuentes],
    ["los despachos por recibir", errorDespachos],
    ["los tratos por ventana", errorTratos],
    ["los lotes galardonados", errorLotes],
  ].find(([, e]) => !!e) as [string, { message: string }] | undefined;
  if (fallo) console.error(`cargarAdquisicion: no se pudieron leer ${fallo[0]}`, fallo[1]);
  return {
    compras: todas.filter((c) => !c.anulada),
    anuladas: todas.filter((c) => c.anulada),
    porRecibir,
    tratosVivos,
    galardonados,
    vitrinaDeLotes,
    stock,
    errorDeLectura: fallo ? `${fallo[0]}: ${fallo[1].message}` : null,
  };
}

/** Decisión 2 (nodo final, 2026-10-10): la foto de la vitrina de UN lote, con la base fresca — la leen las acciones antes de cambiar la
 *  marca Selection (anular, «Es de», el alta a mano) y la pasan por las mismas funciones puras que la pantalla (`selection.ts`).
 *  V5.203 · verificación (nodo final, 2026-10-10): si una lectura falla devuelve `{ error }` y la acción NO sigue —falla cerrada—: con
 *  las compras sin leer, `comprasSelectionVivas` saldría vacía y el cambio de cara pasaría sin la confirmación que exige la decisión 2. */
export async function leerVitrinaDelLote(service: SupabaseClient, lotId: string): Promise<FotoDeVitrina | null | { error: string }> {
  const [{ data: lot, error: e0 }, { data: tratos, error: e1 }, { data: cf, error: e2 }, { data: partidas, error: e3 }, { data: compras, error: e4 }] = await Promise.all([
    service.from("lots").select("stage, grade").eq("id", lotId).maybeSingle(),
    service.from("purchase_contracts").select("id").eq("lot_id", lotId).eq("status", "active").not("ventana_tipo", "is", null).limit(1),
    service.from("catalogo_fuentes").select("id").eq("lot_id", lotId).eq("estado", "declarada").limit(1),
    service.from("stock_partidas").select("id").eq("lot_id", lotId).is("anulada_at", null).eq("comprometido", false),
    service.from("compras").select("id, lot_id, destino, anulada_at").eq("lot_id", lotId).eq("destino", "selection"),
  ]);
  const fallo = e0 ?? e1 ?? e2 ?? e3 ?? e4;
  if (fallo) {
    console.error("leerVitrinaDelLote: no se pudo leer la vitrina del lote", fallo);
    return { error: `No se pudo comprobar qué enseña la vitrina de este lote (${fallo.message}): no se cambió nada. Vuelva a intentarlo.` };
  }
  if (!lot) return null;
  const l = lot as { stage: string | null; grade: string | null };
  return {
    stage: l.stage,
    grade: l.grade,
    tratoVivo: ((tratos as unknown[] | null) ?? []).length > 0,
    declaracionViva: ((cf as unknown[] | null) ?? []).length > 0,
    partidasLibres: ((partidas as { id: string }[] | null) ?? []).map((p) => p.id),
    comprasSelectionVivas: ((compras as { id: string; destino: string; anulada_at: string | null }[] | null) ?? []).filter(esCompraSelection).map((c) => c.id),
  };
}
