import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { conversionDeFactor, cuentaDelContrato } from "@/lib/triage/fobMinimo";
import { factoresQueRigen } from "@/lib/triage/servidor";
import { movimientosDe } from "./linaje";
import { cargarStock, type StockCargado } from "./servidor";
import { esPartidaDeclarable, porDeclararEnVerde, type DatosDeLaFranja } from "./franja";

// ── La franja del circuito del stock · la carga (V5.203, owner 2026-10-10) ──────────────────────────────────────────────────────
// Los números de `franja.ts`, leídos de la base con las MISMAS cuentas que cada tablero: el disponible de `movimientosDe` (que ya resta
// lo declarado, como `stock_disponible`), lo que un trato puede ofrecer con `cuentaDelContrato` (declarado − retirado − lo ya en el
// catálogo), y lo pendiente de recibir de los tratos por ventana vigentes. Sin compuerta: la pasa el layout del OCP. Nunca lanza:
// una lectura que falla cuenta cero (la franja informa; los tableros mandan).
// V5.203 · corrección (nodo final, 2026-10-10): «Por declarar» en kg de VERDE con la cuenta del Triage —el FR que rige cada lote
// (`factoresQueRigen`) y `conversionDeFactor`— (H5); y una compra cuya partida está ANULADA no cuenta como «ya en el stock» (H13).

const r1 = (n: number) => Math.round(n * 10) / 10;

export async function cargarCircuitoDelStock(service: SupabaseClient, stockPrevio?: StockCargado): Promise<DatosDeLaFranja> {
  const [stock, { data: dRaw }, { data: cRaw }, { data: tRaw }, { data: fRaw }, { data: lRaw }] = await Promise.all([
    stockPrevio ? Promise.resolve(stockPrevio) : cargarStock(service),
    service.from("contract_despachos").select("kg, tipo, purchase_contracts!inner(status)").in("estado", ["pendiente", "despachado"]).in("tipo", ["saco", "adelanto"]).eq("purchase_contracts.status", "active"),
    service.from("compras").select("id, kg, anulada_at, despacho_id"),
    service.from("purchase_contracts").select("id, lot_id, quantity_frozen_kg, lots(grade)").eq("status", "active").not("ventana_tipo", "is", null),
    service.from("catalogo_fuentes").select("contract_id, kg_origen, kg_verde").eq("estado", "declarada"),
    service.from("lot_listings").select("status, sold_kg"),
  ]);

  // Por recibir: los sacos y adelantos pendientes, y las compras vivas sin partida en el stock.
  const despachos = (dRaw as { kg: number | string }[] | null) ?? [];
  // H13: solo las partidas VIVAS — la de una compra anulada se anula con ella y no la deja «en el stock».
  const conPartida = new Set(stock.partidas.filter((p) => !p.anulada).map((p) => p.compraId).filter((id): id is string => !!id));
  // V5.203 · verificación (nodo final, 2026-10-10 · H1/H2): la compra que creó «Reintentar la compra» no está enlazada a su partida (nació
  // sin ella); está en el stock por su DESPACHO — como la encuentra Adquisición (`cargarAdquisicion`), que no la lista «sin entrar».
  const despachoConPartida = new Set(stock.partidas.filter((p) => !p.anulada).map((p) => p.despachoId).filter((id): id is string => !!id));
  const sinRecibir = ((cRaw as { id: string; kg: number | string; anulada_at: string | null; despacho_id: string | null }[] | null) ?? []).filter(
    (c) => !c.anulada_at && !conPartida.has(c.id) && !(c.despacho_id && despachoConPartida.has(c.despacho_id))
  );

  // En stock y por declarar: partida a partida, con el disponible de la pantalla (= el de la base).
  let pergaminoKg = 0, verdeKg = 0, otrosKg = 0, partidas = 0, stockKg = 0, stockPartidas = 0;
  // H5: lo declarable, con sus kg de origen y su lote, para convertirlo a verde como el Triage.
  const declarables: { kg: number; lotId: string; verde: boolean }[] = [];
  for (const p of stock.partidas) {
    if (p.anulada || p.comprometido) continue;
    const disp = movimientosDe(p, stock).disponibleKg;
    if (!(disp > 0)) continue;
    partidas += 1;
    if (p.estado === "pergamino") pergaminoKg += disp;
    else if (p.estado === "verde") verdeKg += disp;
    else otrosKg += disp;
    const lote = p.lotId ? stock.lotes[p.lotId] : null;
    if (lote && esPartidaDeclarable(p, lote)) {
      stockKg += disp;
      stockPartidas += 1;
      declarables.push({ kg: disp, lotId: lote.id, verde: p.contenido === "verde" });
    }
  }

  // Los tratos por ventana: lo que aún pueden ofrecer (declarado − retirado − lo que ya está en el catálogo).
  const contratos = ((tRaw as unknown as { id: string; lot_id: string; quantity_frozen_kg: number | string | null; lots: { grade: string | null } | { grade: string | null }[] | null }[] | null) ?? []).filter((c) => {
    const lot = Array.isArray(c.lots) ? c.lots[0] : c.lots;
    return lot?.grade !== "tyrian";
  });
  const fuentes = (fRaw as { contract_id: string | null; kg_origen: number | string; kg_verde: number | string }[] | null) ?? [];
  let contratosKgCps = 0, contratosCon = 0;
  const tratosPorDeclarar: { kg: number; lotId: string }[] = [];
  if (contratos.length) {
    const { data: rRaw } = await service.from("contract_retiros").select("contract_id, kg").in("contract_id", contratos.map((c) => c.id));
    const retiros = (rRaw as { contract_id: string; kg: number | string }[] | null) ?? [];
    for (const c of contratos) {
      const cuenta = cuentaDelContrato({
        declaradoKg: Number(c.quantity_frozen_kg ?? 0),
        retiradoKg: retiros.filter((r) => r.contract_id === c.id).reduce((a, r) => a + Number(r.kg), 0),
        declaradoEnCatalogoKg: fuentes.filter((f) => f.contract_id === c.id).reduce((a, f) => a + Number(f.kg_origen), 0),
      });
      if (cuenta.porDeclararKg > 0) {
        contratosKgCps += cuenta.porDeclararKg;
        contratosCon += 1;
        tratosPorDeclarar.push({ kg: cuenta.porDeclararKg, lotId: c.lot_id });
      }
    }
  }

  // H5: a verde, con el FR que rige cada lote (sin FR válido, el de referencia del PVC), como el Triage.
  const fr = await factoresQueRigen(service, [...declarables.map((d) => d.lotId), ...tratosPorDeclarar.map((t) => t.lotId)]);
  const conv = (lotId: string) => conversionDeFactor(fr.get(lotId) ?? null).conversion;
  const verdePorDeclarar = porDeclararEnVerde([
    ...declarables.map((d) => ({ kg: d.kg, conversion: d.verde ? 1 : conv(d.lotId) })),
    ...tratosPorDeclarar.map((t) => ({ kg: t.kg, conversion: conv(t.lotId) })),
  ]);

  const listados = (lRaw as { status: string; sold_kg: number | string | null }[] | null) ?? [];
  return {
    porRecibir: {
      despachosKg: r1(despachos.reduce((a, d) => a + Number(d.kg), 0)),
      despachos: despachos.length,
      comprasKg: r1(sinRecibir.reduce((a, c) => a + Number(c.kg), 0)),
      compras: sinRecibir.length,
    },
    enStock: { pergaminoKg: r1(pergaminoKg), verdeKg: r1(verdeKg), otrosKg: r1(otrosKg), partidas },
    porDeclarar: { stockKg: r1(stockKg), stockPartidas, contratosKgCps: r1(contratosKgCps), contratos: contratosCon, verdeKg: verdePorDeclarar },
    enCatalogo: { kgVerde: r1(fuentes.reduce((a, f) => a + Number(f.kg_verde), 0)), declaraciones: fuentes.length, listados: listados.filter((l) => l.status !== "archived").length },
    vendido: listados.length ? { kgVerde: r1(listados.reduce((a, l) => a + Number(l.sold_kg ?? 0), 0)) } : null,
  };
}

// ── Lo que el circuito le pide a alguien (V6.1; lo que la V5.203 dejó «sin hacer») ─────────────────────────────────────────────
// Dos tareas derivadas para el Tablero de Ejecución (`tareasCarga.ts`), deducidas del mismo estado que pintan Adquisición y el
// Triage: un saco o adelanto de un trato por ventana vigente, todavía `pendiente`, cuyo plazo (o su prórroga: la MISMA regla que
// «vencido» en Adquisición, `prorroga_hasta ?? plazo` contra el día de Colombia) ya pasó; y una partida libre del Stock CTCx que el
// Triage puede declarar y no ha declarado (`esPartidaDeclarable` + disponible > 0, la cuenta de «Por declarar»). Nunca lanza.

export type PendientesDelCircuito = {
  sacosVencidos: { id: string; contractId: string; lotName: string; tipo: "saco" | "adelanto"; kg: number; vence: string }[];
  partidasPorDeclarar: { id: string; codigo: string; lotName: string; kg: number; contenido: string }[];
};

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export async function pendientesDelCircuito(service: SupabaseClient, hoy: string): Promise<PendientesDelCircuito> {
  try {
    const [stock, { data: dRaw }] = await Promise.all([
      cargarStock(service),
      service
        .from("contract_despachos")
        .select("id, contract_id, tipo, kg, plazo, prorroga_hasta, purchase_contracts!inner(status, lots(name))")
        .eq("estado", "pendiente")
        .in("tipo", ["saco", "adelanto"])
        .eq("purchase_contracts.status", "active")
        .order("plazo", { ascending: true }),
    ]);
    type Fila = { id: string; contract_id: string; tipo: "saco" | "adelanto"; kg: number | string; plazo: string | null; prorroga_hasta: string | null; purchase_contracts: { lots: { name: string } | { name: string }[] | null } | { lots: { name: string } | { name: string }[] | null }[] | null };
    const sacosVencidos: PendientesDelCircuito["sacosVencidos"] = [];
    for (const d of (dRaw as unknown as Fila[] | null) ?? []) {
      const vence = d.prorroga_hasta ?? d.plazo;
      if (!vence || !(vence < hoy)) continue;
      sacosVencidos.push({ id: d.id, contractId: d.contract_id, lotName: uno(uno(d.purchase_contracts)?.lots)?.name ?? "—", tipo: d.tipo, kg: r1(Number(d.kg)), vence });
    }
    const partidasPorDeclarar: PendientesDelCircuito["partidasPorDeclarar"] = [];
    for (const p of stock.partidas) {
      const lote = p.lotId ? stock.lotes[p.lotId] : null;
      if (!esPartidaDeclarable(p, lote)) continue;
      const disp = movimientosDe(p, stock).disponibleKg;
      if (!(disp > 0)) continue;
      partidasPorDeclarar.push({ id: p.id, codigo: p.codigo, lotName: lote?.name ?? "—", kg: r1(disp), contenido: p.contenido });
    }
    return { sacosVencidos, partidasPorDeclarar };
  } catch {
    return { sacosVencidos: [], partidasPorDeclarar: [] };
  }
}
