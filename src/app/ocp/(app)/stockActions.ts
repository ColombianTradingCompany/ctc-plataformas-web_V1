"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/panel/ActionForm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { ESTADOS, SALIDAS_A_MANO, STOCK_PATH, TRANSFORMACIONES, erroresDeTransformacion, fmtKg, type ContenidoDePartida, type EstadoDePartida, type SolicitudDeTransformacion, type TipoDeSalida } from "@/lib/stock/linaje";
import { COLUMNAS_PARTIDA, aPartida, crearRaizDeStock, mensajeDeLaBase } from "@/lib/stock/servidor";

// ── OCP · Manejo de Stock Físico · Stock CTCx · Server Actions (V5.195) ─────────────────────────────────────────────────────────
// Plan `docs/PLAN_TRIAGE_CATALOGO.md` §2.1. Transformar (trilla · tostión · empaque), dar salida (venta · consumo · ajuste), ubicar,
// ingresar a mano y anular. Las operaciones de varias filas van por las funciones atómicas de la base (`stock_transformar`,
// `stock_anular_transformacion`, `stock_raiz`); las compuertas de la base repiten lo esencial (cuadre, disponible, nada se borra).
// Clase de todas: «emite» — lo que escriben es el stock que el Triage de Catálogo Activo declara (lo ve el comprador) y que surte
// los Sample Kits. Devuelven resultado, nunca lanzan.

const permiso = () => permisoDeEscritura("ocp", "emite");

const revalidar = () => {
  revalidatePath(STOCK_PATH);
  revalidatePath(`${STOCK_PATH}/sample-kits`);
  revalidatePath("/ocp/compras");
  // V5.203: el Triage y CTCx Selection leen el disponible del stock.
  revalidatePath("/ocp/contratos");
  revalidatePath("/ocp/ctc-selection");
};
const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(x) ? x : NaN;
};
const t = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max) || null;
const esUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

async function partida(service: ReturnType<typeof createServiceRoleClient>, id: string) {
  if (!esUuid(id)) return null;
  const { data } = await service.from("stock_partidas").select(COLUMNAS_PARTIDA).eq("id", id).maybeSingle();
  return data ? aPartida(data as Parameters<typeof aPartida>[0]) : null;
}

export type DatosDeTransformacion = SolicitudDeTransformacion & { fecha?: string | null; nota?: string | null };

/** Trilla, tostión o empaque de una partida: valida aquí con la regla pura y la base lo repite (cuadre ± 0,01 kg, disponible). */
export async function transformarPartida(partidaId: string, datos: DatosDeTransformacion): Promise<ActionResult & { codigo?: string }> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const service = createServiceRoleClient();
  const madre = await partida(service, partidaId);
  if (!madre) return { ok: false, error: "Partida no encontrada." };
  const { data: disp } = await service.rpc("stock_disponible", { p_partida: madre.id });
  const disponibleKg = Number(disp ?? 0);
  const s: SolicitudDeTransformacion = {
    tipo: datos?.tipo,
    kgEntrada: n(datos?.kgEntrada),
    hijas: (Array.isArray(datos?.hijas) ? datos.hijas : []).slice(0, 40).map((h) => ({ kg: n(h?.kg), ubicacion: t(h?.ubicacion, 200), presentacion: t(h?.presentacion, 120), nota: t(h?.nota, 500) })),
    humedadKg: n(datos?.humedadKg || 0),
    residuosKg: n(datos?.residuosKg || 0),
    perdidasKg: n(datos?.perdidasKg || 0),
    costoOperacionCop: n(datos?.costoOperacionCop || 0),
  };
  const errores = erroresDeTransformacion(madre, Math.round(disponibleKg * 1000) / 1000, s);
  if (errores.length) return { ok: false, error: errores.join(" ") };
  const fecha = typeof datos?.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) ? datos.fecha : null;
  const { data: txId, error } = await service.rpc("stock_transformar", {
    p_madre: madre.id,
    p_tipo: s.tipo,
    p_kg_entrada: s.kgEntrada,
    p_hijas: s.hijas,
    p_humedad: s.humedadKg,
    p_residuos: s.residuosKg,
    p_perdidas: s.perdidasKg,
    p_costo: s.costoOperacionCop,
    p_fecha: fecha,
    p_nota: t(datos?.nota, 500),
    p_por: p.userId,
  });
  if (error || !txId) return { ok: false, error: mensajeDeLaBase(error?.message) };
  const { data: tx } = await service.from("stock_transformaciones").select("codigo").eq("id", String(txId)).maybeSingle();
  const codigo = (tx as { codigo: string } | null)?.codigo ?? "";
  const salen = s.hijas.reduce((a, h) => a + h.kg, 0);
  await service.from("audit_log").insert({
    entity_type: "stock_partida",
    entity_id: madre.id,
    action: `stock_${s.tipo}`,
    performed_by: p.userId,
    notes: `${codigo} · ${madre.codigo} · ${TRANSFORMACIONES[s.tipo].nombre}: entran ${fmtKg(s.kgEntrada)} kg → ${s.hijas.length} partida(s) de ${TRANSFORMACIONES[s.tipo].hacia} (${fmtKg(salen)} kg) · humedad ${fmtKg(s.humedadKg)} · residuos ${fmtKg(s.residuosKg)} · pérdidas ${fmtKg(s.perdidasKg)}`,
  });
  revalidar();
  return { ok: true, codigo };
}

/** Deshace una transformación: solo si ninguna de sus hijas se movió. Las hijas quedan anuladas y la madre recupera lo que entró. */
export async function anularTransformacion(transformacionId: string, motivo: string): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const m = t(motivo);
  if (!m || m.length < 3) return { ok: false, error: "Anular lleva motivo (queda en el rastro)." };
  if (!esUuid(transformacionId)) return { ok: false, error: "Transformación no encontrada." };
  const service = createServiceRoleClient();
  const { data: tx } = await service.from("stock_transformaciones").select("codigo, madre_id").eq("id", transformacionId).maybeSingle();
  if (!tx) return { ok: false, error: "Transformación no encontrada." };
  const { error } = await service.rpc("stock_anular_transformacion", { p_tx: transformacionId, p_motivo: m, p_por: p.userId });
  if (error) return { ok: false, error: mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "stock_partida", entity_id: (tx as { madre_id: string }).madre_id, action: "stock_transformacion_anulada", performed_by: p.userId, notes: `${(tx as { codigo: string }).codigo} · ${m}` });
  revalidar();
  return { ok: true };
}

export type DatosDeSalida = { tipo: Exclude<TipoDeSalida, "kit">; kg: number; motivo: string; fecha?: string | null };

/** Venta, consumo interno o ajuste de inventario (la salida de un kit la escribe sola su envío). */
export async function registrarSalida(partidaId: string, datos: DatosDeSalida): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const tipo = datos?.tipo;
  if (!SALIDAS_A_MANO.includes(tipo)) return { ok: false, error: "La salida es una venta, un consumo interno o un ajuste (la de un kit sale sola al enviarlo)." };
  const kg = n(datos?.kg);
  if (!(kg > 0)) return { ok: false, error: "Escriba los kg que salen." };
  const motivo = t(datos?.motivo);
  if (!motivo || motivo.length < 3) return { ok: false, error: "Una salida lleva su motivo (a quién, para qué, por qué)." };
  const service = createServiceRoleClient();
  const p0 = await partida(service, partidaId);
  if (!p0) return { ok: false, error: "Partida no encontrada." };
  const fecha = typeof datos?.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) ? datos.fecha : undefined;
  const { error } = await service.from("stock_salidas").insert({ partida_id: p0.id, tipo, kg, motivo, ...(fecha ? { fecha } : {}), created_by: p.userId });
  if (error) return { ok: false, error: mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "stock_partida", entity_id: p0.id, action: `stock_salida_${tipo}`, performed_by: p.userId, notes: `${p0.codigo} · ${fmtKg(kg)} kg · ${motivo}` });
  revalidar();
  return { ok: true };
}

/** Una salida registrada por error vuelve al stock (con motivo). La de un kit se deshace anulando el kit. */
export async function anularSalida(salidaId: string, motivo: string): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const m = t(motivo);
  if (!m || m.length < 3) return { ok: false, error: "Anular lleva motivo." };
  if (!esUuid(salidaId)) return { ok: false, error: "Salida no encontrada." };
  const service = createServiceRoleClient();
  const { data: s } = await service.from("stock_salidas").select("id, tipo, kg, partida_id, anulada_at").eq("id", salidaId).maybeSingle();
  if (!s) return { ok: false, error: "Salida no encontrada." };
  const fila = s as { id: string; tipo: TipoDeSalida; kg: number; partida_id: string; anulada_at: string | null };
  if (fila.anulada_at) return { ok: false, error: "Ya estaba anulada." };
  if (fila.tipo === "kit") return { ok: false, error: "La salida de un kit se deshace anulando el kit (Sample Kits)." };
  const { error } = await service.from("stock_salidas").update({ anulada_at: new Date().toISOString(), anulada_por: p.userId, anulada_motivo: m }).eq("id", fila.id).is("anulada_at", null);
  if (error) return { ok: false, error: mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "stock_partida", entity_id: fila.partida_id, action: "stock_salida_anulada", performed_by: p.userId, notes: `${fmtKg(Number(fila.kg))} kg · ${m}` });
  revalidar();
  return { ok: true };
}

/** Dónde está la partida (texto libre, como la ubicación de una compra). */
export async function ubicarPartida(partidaId: string, ubicacion: string): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const service = createServiceRoleClient();
  const p0 = await partida(service, partidaId);
  if (!p0) return { ok: false, error: "Partida no encontrada." };
  const u = t(ubicacion, 200);
  const { error } = await service.from("stock_partidas").update({ ubicacion: u }).eq("id", p0.id);
  if (error) return { ok: false, error: mensajeDeLaBase(error.message) };
  // V5.203 (B7): una sola verdad — la raíz de una compra lleva la ubicación de su compra (Adquisición enseña la misma).
  let aviso: string | undefined;
  if (p0.compraId && p0.raizId === p0.id) {
    const { error: e2 } = await service.from("compras").update({ ubicacion: u }).eq("id", p0.compraId).is("anulada_at", null);
    if (e2) aviso = `La partida quedó ubicada, pero su compra no (${mensajeDeLaBase(e2.message)}).`;
  } else if (p0.despachoId && p0.raizId === p0.id) {
    // V5.203 · corrección (H1/H2): la partida de un despacho que nació sin su compra la encuentra por el despacho (`compras.despacho_id`).
    const { error: e2 } = await service.from("compras").update({ ubicacion: u }).eq("despacho_id", p0.despachoId).is("anulada_at", null);
    if (e2) aviso = `La partida quedó ubicada, pero su compra no (${mensajeDeLaBase(e2.message)}).`;
  }
  await service.from("audit_log").insert({ entity_type: "stock_partida", entity_id: p0.id, action: "stock_ubicada", performed_by: p.userId, notes: `${p0.codigo} · ${u ?? "sin ubicación"}` });
  revalidar();
  return aviso ? { ok: true, aviso } : { ok: true };
}

export type DatosDeIngreso = {
  lotId: string | null;
  origenTexto: string | null;
  estado: EstadoDePartida;
  contenido: ContenidoDePartida | null;
  kg: number;
  costoCopKg: number;
  ubicacion: string | null;
  presentacion: string | null;
  nota: string;
};

/** El ingreso a mano (inventario inicial, café que llegó por fuera de la plataforma): siempre con su nota. */
export async function ingresarAlStock(datos: DatosDeIngreso): Promise<ActionResult & { codigo?: string }> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const estado = datos?.estado;
  if (!ESTADOS.includes(estado)) return { ok: false, error: "Elija el estado del café." };
  const contenido = estado === "empacado" ? datos?.contenido : (estado as ContenidoDePartida);
  if (!contenido || !["pergamino", "verde", "tostado"].includes(contenido)) return { ok: false, error: "Lo empacado dice qué café lleva dentro (pergamino, verde o tostado)." };
  const kg = n(datos?.kg);
  if (!(kg > 0)) return { ok: false, error: "Escriba los kg." };
  const costo = n(datos?.costoCopKg || 0);
  if (!(costo >= 0)) return { ok: false, error: "El costo por kg no es negativo." };
  const nota = t(datos?.nota, 500);
  if (!nota || nota.length < 3) return { ok: false, error: "Un ingreso a mano lleva su nota: de dónde sale ese café." };
  const service = createServiceRoleClient();
  let lotId: string | null = null;
  if (datos?.lotId) {
    if (!esUuid(datos.lotId)) return { ok: false, error: "Lote no encontrado." };
    const { data: lot } = await service.from("lots").select("id").eq("id", datos.lotId).maybeSingle();
    if (!lot) return { ok: false, error: "Lote no encontrado." };
    lotId = datos.lotId;
  }
  const origenTexto = t(datos?.origenTexto, 200);
  if (!lotId && !origenTexto) return { ok: false, error: "Sin lote de la plataforma, diga de dónde es el café (finca, productor, región)." };
  const r = await crearRaizDeStock(service, { lotId, origenTexto, estado, contenido, kg, costoCopKg: costo, origen: "manual", ubicacion: t(datos?.ubicacion, 200), presentacion: t(datos?.presentacion, 120), nota, por: p.userId });
  if (!r.ok) return { ok: false, error: mensajeDeLaBase(r.error) };
  await service.from("audit_log").insert({ entity_type: "stock_partida", entity_id: r.id, action: "stock_ingreso_manual", performed_by: p.userId, notes: `${r.codigo ?? ""} · ${estado} · ${fmtKg(kg)} kg · ${nota}` });
  revalidar();
  return { ok: true, codigo: r.codigo ?? undefined };
}

/** Un ingreso a mano registrado por error se anula, si no se movió. Las raíces de un despacho o de una compra no se anulan aquí. */
export async function anularIngreso(partidaId: string, motivo: string): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const m = t(motivo);
  if (!m || m.length < 3) return { ok: false, error: "Anular lleva motivo." };
  const service = createServiceRoleClient();
  const p0 = await partida(service, partidaId);
  if (!p0) return { ok: false, error: "Partida no encontrada." };
  if (p0.origen !== "manual" || p0.madreTransformacionId) return { ok: false, error: "Solo se anula aquí un ingreso a mano. Lo que salió de una transformación se deshace anulando la transformación." };
  if (p0.anulada) return { ok: false, error: "Ya estaba anulada." };
  const { error } = await service.from("stock_partidas").update({ anulada_at: new Date().toISOString(), anulada_por: p.userId, anulada_motivo: m }).eq("id", p0.id);
  if (error) return { ok: false, error: mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "stock_partida", entity_id: p0.id, action: "stock_ingreso_anulado", performed_by: p.userId, notes: `${p0.codigo} · ${m}` });
  revalidar();
  return { ok: true };
}

/** Una compra que aún no está en el stock (registrada antes de llegar) entra, con sus kg y su costo. Para `<ActionForm>`. */
export async function entrarCompraAlStock(compraId: string, formData: FormData): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  if (!esUuid(compraId)) return { ok: false, error: "Compra no encontrada." };
  const service = createServiceRoleClient();
  const { data: c } = await service.from("compras").select("id, lot_id, kg, cop_kg, total_cop, ubicacion, anulada_at, despacho_id").eq("id", compraId).maybeSingle();
  if (!c) return { ok: false, error: "Compra no encontrada." };
  const compra = c as { id: string; lot_id: string; kg: number | string; cop_kg: number | string; total_cop: number | string; ubicacion: string | null; anulada_at: string | null; despacho_id: string | null };
  // V5.203: una compra anulada no entra al stock (la base lo repite: `guard_stock_partida_compra`).
  if (compra.anulada_at) return { ok: false, error: "Esa compra está anulada: no entra al Stock CTCx." };
  const ubicacion = t(formData?.get("ubicacion"), 200) ?? compra.ubicacion;
  // V5.203 · corrección (H1/H2): la compra de un saco o un adelanto entra con SU despacho. Si la partida del despacho ya existe (nació
  // sin la compra), no se crea otra —duplicaría el café— ni se toca la suya (`stock_raiz` le reescribiría kg y costo).
  if (compra.despacho_id) {
    const { data: delDespacho } = await service.from("stock_partidas").select("codigo").eq("despacho_id", compra.despacho_id).maybeSingle();
    if (delDespacho) return { ok: false, error: `Esa compra ya está en el Stock CTCx: es la partida ${(delDespacho as { codigo: string }).codigo} de su despacho.` };
  }
  const kg = Number(compra.kg);
  const r = await crearRaizDeStock(
    service,
    compra.despacho_id
      ? { lotId: compra.lot_id, estado: "pergamino", kg, costoCopKg: kg > 0 && Number(compra.total_cop) > 0 ? Number(compra.total_cop) / kg : Number(compra.cop_kg), origen: "despacho", despachoId: compra.despacho_id, compraId: compra.id, ubicacion, por: p.userId }
      : { lotId: compra.lot_id, estado: "pergamino", kg, costoCopKg: Number(compra.cop_kg), origen: "compra", compraId: compra.id, ubicacion, por: p.userId }
  );
  if (!r.ok) return { ok: false, error: mensajeDeLaBase(r.error) };
  await service.from("compras").update({ recibida_at: new Date().toISOString() }).eq("id", compra.id).is("recibida_at", null);
  await service.from("audit_log").insert({ entity_type: "compra", entity_id: compra.id, action: "compra_al_stock", performed_by: p.userId, notes: `${r.codigo ?? ""} · ${fmtKg(Number(compra.kg))} kg de pergamino` });
  revalidar();
  return { ok: true };
}
