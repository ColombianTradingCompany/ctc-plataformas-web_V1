"use server";

// ── ECP · Herramientas Internas · Cotizador Courier · Server Actions ─────────────────────────────────
// Lee las tablas `courier_*` (service-role-only: el acuerdo es CONFIDENCIAL) y cotiza en el servidor con
// el cálculo puro de `./calculo`. El navegador recibe el desglose de SU envío, no las tablas del acuerdo.

import { revalidatePath } from "next/cache";
import { requireConsoleWrite, quoteServiceClient } from "@/lib/panel/requireConsoleWrite";
import type { PanelConsoleKey } from "@/lib/panel/consoles";
import { cotizar, type Cotizacion, type Entrada, type Tablas } from "./calculo";
import { actualizarCombustible } from "./eia";
import { COURIER_PATH, type CotizacionAbierta, type CotizacionGuardada, type ResultadoCourier, type ResumenCourier } from "./types";

/** La consola donde vive este módulo. UNA vez; `qa-rutas-consolas` (f-bis) la contrasta con el rail. */
const CONSOLA: PanelConsoleKey = "ecp";
const TRANSPORTISTA = "fedex";

const NO_AUTH = { ok: false as const, error: "No se pudo ejecutar: o tu sesión ya no está activa (vuelve a iniciar sesión), o tu nivel en el ECP es de lectura y borradores y esta acción emite." };

type Db = ReturnType<typeof quoteServiceClient>;
/** Una fila cruda de PostgREST y el constructor de consultas: se tipan al mapearlas, más abajo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fila = any;

/** Todas las filas de una tabla (PostgREST corta en 1.000). */
async function todas<T>(db: Db, tabla: string, columnas: string, filtro: (q: Fila) => Fila = (q) => q): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await filtro(db.from(tabla).select(columnas)).range(desde, desde + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

async function leerTablas(db: Db): Promise<Tablas> {
  const porTransportista = (q: Fila) => q.eq("transportista", TRANSPORTISTA);
  const [tarifas, zonas, recargos, acuerdos] = await Promise.all([
    todas<Fila>(db, "courier_tarifas_base", "servicio, embalaje, zona, peso_desde, peso_hasta, modo, usd, vigente_desde, fuente", porTransportista),
    todas<Fila>(db, "courier_zonas", "pais_iso, pais, zona, vigente_desde, fuente", porTransportista),
    todas<Fila>(db, "courier_recargos", "id, concepto, tipo, valor, vigente_desde, vigente_hasta, fuente, automatico", porTransportista),
    todas<Fila>(db, "courier_acuerdos", "id, referencia, vigente_desde, fin_gracia, modo_suma, fuente", (q) => porTransportista(q).eq("estado", "vigente").order("vigente_desde", { ascending: false }).limit(1)),
  ]);
  const a = acuerdos[0];
  let acuerdo: Tablas["acuerdo"] = null;
  if (a) {
    const porAcuerdo = (q: Fila) => q.eq("acuerdo_id", a.id);
    const [descuentos, adquirido, bonificaciones] = await Promise.all([
      todas<Fila>(db, "courier_descuentos", "servicio, embalaje, zona, peso_desde, peso_hasta, pct, cargo_minimo_usd", (q) => porAcuerdo(q).eq("familia", "export")),
      todas<Fila>(db, "courier_descuento_adquirido", "grupo, servicios, pct_gracia, escalones", porAcuerdo),
      todas<Fila>(db, "courier_bonificaciones", "concepto, servicio, pct", porAcuerdo),
    ]);
    acuerdo = {
      referencia: a.referencia, vigenteDesde: a.vigente_desde, finGracia: a.fin_gracia, modoSuma: a.modo_suma, fuente: a.fuente,
      descuentos: descuentos.map((d) => ({ servicio: d.servicio, embalaje: d.embalaje, zona: d.zona, pesoDesde: Number(d.peso_desde), pesoHasta: d.peso_hasta === null ? null : Number(d.peso_hasta), pct: Number(d.pct), cargoMinimoUsd: Number(d.cargo_minimo_usd) })),
      adquirido: adquirido.map((g) => ({ grupo: g.grupo, servicios: g.servicios, pctGracia: Number(g.pct_gracia), escalones: g.escalones })),
      bonificaciones: bonificaciones.map((b) => ({ concepto: b.concepto, servicio: b.servicio, pct: Number(b.pct) })),
    };
  }
  return {
    tarifas: tarifas.map((t) => ({ servicio: t.servicio, embalaje: t.embalaje, zona: t.zona, pesoDesde: Number(t.peso_desde), pesoHasta: t.peso_hasta === null ? null : Number(t.peso_hasta), modo: t.modo, usd: Number(t.usd), vigenteDesde: t.vigente_desde, fuente: t.fuente })),
    zonas: zonas.map((z) => ({ paisIso: z.pais_iso, pais: z.pais, zona: z.zona, vigenteDesde: z.vigente_desde, fuente: z.fuente })),
    recargos: recargos.map((r) => ({ id: r.id, concepto: r.concepto, tipo: r.tipo, valor: Number(r.valor), vigenteDesde: r.vigente_desde, vigenteHasta: r.vigente_hasta, fuente: r.fuente, automatico: Boolean(r.automatico) })),
    acuerdo,
  };
}

export async function resumenCourier(): Promise<ResumenCourier | null> {
  if (!(await requireConsoleWrite(CONSOLA, "lectura"))) return null;
  const t = await leerTablas(quoteServiceClient());
  const ultimaGuia = t.tarifas.map((x) => x.vigenteDesde).sort().at(-1);
  const ultimaZona = t.zonas.map((z) => z.vigenteDesde).sort().at(-1);
  return {
    destinos: t.zonas.filter((z) => z.vigenteDesde === ultimaZona)
      .map((z) => ({ clave: z.paisIso, pais: z.pais, zona: z.zona }))
      .sort((a, b) => a.pais.localeCompare(b.pais, "es")),
    guia: ultimaGuia ? { vigenteDesde: ultimaGuia, fuente: t.tarifas.find((x) => x.vigenteDesde === ultimaGuia)!.fuente.replace(/ p\.\d+$/, ""), filas: t.tarifas.filter((x) => x.vigenteDesde === ultimaGuia).length } : null,
    acuerdo: t.acuerdo ? { referencia: t.acuerdo.referencia, vigenteDesde: t.acuerdo.vigenteDesde, finGracia: t.acuerdo.finGracia, modoSuma: t.acuerdo.modoSuma } : null,
    combustible: t.recargos.filter((r) => r.concepto === "combustible")
      .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde)).slice(0, 104)
      .map((r) => ({ id: r.id!, valor: r.valor, vigenteDesde: r.vigenteDesde, vigenteHasta: r.vigenteHasta, fuente: r.fuente, automatico: Boolean(r.automatico) })),
  };
}

export async function cotizarCourier(entrada: Entrada): Promise<Cotizacion | null> {
  if (!(await requireConsoleWrite(CONSOLA, "lectura"))) return null;
  return cotizar(await leerTablas(quoteServiceClient()), entrada);
}

/** El recargo de combustible de una semana. FedEx lo publica cada viernes para la semana siguiente. */
export async function anotarCombustible(input: { valor: number; vigenteDesde: string; vigenteHasta: string | null; fuente: string }): Promise<ResultadoCourier> {
  const who = await requireConsoleWrite(CONSOLA);
  if (!who) return NO_AUTH;
  if (!(input.valor >= 0 && input.valor < 100)) return { ok: false, error: "El recargo es un porcentaje entre 0 y 100." };
  if (!input.vigenteDesde) return { ok: false, error: "Falta la fecha desde la que rige." };
  if (input.vigenteHasta && input.vigenteHasta < input.vigenteDesde) return { ok: false, error: "La semana termina antes de empezar." };
  const { error } = await quoteServiceClient().from("courier_recargos").upsert({
    transportista: TRANSPORTISTA, concepto: "combustible", tipo: "pct", valor: input.valor,
    vigente_desde: input.vigenteDesde, vigente_hasta: input.vigenteHasta || null,
    fuente: input.fuente.trim() || "fedex.com/es-co/shipping/surcharges.html", created_by: who.userId,
  }, { onConflict: "transportista,concepto,vigente_desde" });
  if (error) return { ok: false, error: error.message };
  revalidatePath(COURIER_PATH);
  return { ok: true };
}

/** Borra una semana del recargo. Borrar nunca es un borrador (lista blanca de BCP_USER_ADMIN_PLAN): emite.
 *  Una semana AUTOMÁTICA borrada vuelve a anotarse en la próxima pasada del cron si la EIA aún la trae
 *  (las tres últimas semanas); una anotada a mano, no — y al borrarla, el automático puede ocupar su hueco. */
export async function borrarCombustible(id: string): Promise<ResultadoCourier> {
  const who = await requireConsoleWrite(CONSOLA);
  if (!who) return NO_AUTH;
  const { data, error } = await quoteServiceClient().from("courier_recargos")
    .delete().eq("id", id).eq("transportista", TRANSPORTISTA).eq("concepto", "combustible").select("vigente_desde, valor, automatico");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Esa semana ya no existe (¿la borró alguien más?)." };
  revalidatePath(COURIER_PATH);
  const b = data[0];
  return { ok: true, mensaje: `Borrada la semana del ${b.vigente_desde} (${b.valor} %, ${b.automatico ? "automática: el cron la vuelve a anotar si la EIA aún la trae" : "a mano"}).` };
}

/** Lo mismo que hace el cron del jueves, a demanda: EIA → tabla de FedEx → % de la semana. No pisa lo anotado a mano. */
export async function actualizarCombustibleAhora(): Promise<ResultadoCourier> {
  const who = await requireConsoleWrite(CONSOLA);
  if (!who) return NO_AUTH;
  const r = await actualizarCombustible(quoteServiceClient(), AbortSignal.timeout(25_000));
  revalidatePath(COURIER_PATH);
  if (!r.ok) return { ok: false, error: r.error ?? "No se pudo actualizar." };
  const partes = [
    ...r.anotadas.map((a) => `semana del ${a.semana}: ${a.pct} % (EIA $${a.usd})`),
    ...r.omitidas.map((o) => `semana del ${o.semana}: ${o.motivo}`),
  ];
  return { ok: true, mensaje: partes.length ? `EIA consultada. ${partes.join(" · ")}.` : "EIA consultada: nada nuevo que anotar." };
}

/** Guarda la cotización como acta: se recalcula AQUÍ (no se confía en lo que manda el navegador) y se congela. */
export async function guardarCotizacionCourier(entrada: Entrada, servicioElegido: string | null, nota: string): Promise<ResultadoCourier> {
  const who = await requireConsoleWrite(CONSOLA, "borrador");
  if (!who) return NO_AUTH;
  const c = cotizar(await leerTablas(quoteServiceClient()), entrada);
  if (!c.opciones.some((o) => o.disponible)) return { ok: false, error: "No hay ninguna opción cotizable para guardar." };
  const elegida = c.opciones.find((o) => `${o.servicio}:${o.embalaje}` === servicioElegido && o.disponible) ?? c.opciones.find((o) => o.disponible)!;
  const { error } = await quoteServiceClient().from("courier_cotizaciones").insert({
    transportista: TRANSPORTISTA, destino_iso: entrada.destino, peso_facturable_kg: c.pesoFacturableKg,
    servicio_elegido: `${elegida.servicio}:${elegida.embalaje}`, total_usd: elegida.totalUsd,
    entradas: entrada, snapshot: c, nota: nota.trim() || null, created_by: who.userId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(COURIER_PATH);
  return { ok: true };
}

const COLS_GUARDADA = "id, destino_iso, peso_facturable_kg, servicio_elegido, total_usd, nota, created_at, entradas, snapshot";

function aGuardada(r: Fila): CotizacionGuardada {
  const snap = r.snapshot as Cotizacion | null, ent = r.entradas as Entrada | null;
  const op = snap?.opciones.find((o) => `${o.servicio}:${o.embalaje}` === r.servicio_elegido);
  return {
    id: r.id, destino: r.destino_iso, pais: snap?.pais ?? null,
    pesoRealKg: snap?.pesoRealKg ?? (ent ? ent.piezas.reduce((s, p) => s + (p.kg || 0), 0) : null),
    pesoFacturableKg: Number(r.peso_facturable_kg), servicio: r.servicio_elegido, servicioEtiqueta: op?.etiqueta ?? null,
    fechaEnvio: ent?.fechaEnvio ?? null,
    totalUsd: r.total_usd === null ? null : Number(r.total_usd), nota: r.nota, createdAt: r.created_at,
  };
}

export async function listarCotizacionesCourier(): Promise<CotizacionGuardada[] | null> {
  if (!(await requireConsoleWrite(CONSOLA, "lectura"))) return null;
  const { data } = await quoteServiceClient().from("courier_cotizaciones")
    .select(COLS_GUARDADA).order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map(aGuardada);
}

/** Abre una cotización guardada: lo que se metió y el resultado tal como quedó (congelado). */
export async function abrirCotizacionCourier(id: string): Promise<CotizacionAbierta | null> {
  if (!(await requireConsoleWrite(CONSOLA, "lectura"))) return null;
  const { data } = await quoteServiceClient().from("courier_cotizaciones").select(COLS_GUARDADA).eq("id", id).maybeSingle();
  if (!data) return null;
  return { ...aGuardada(data), entradas: data.entradas as Entrada, snapshot: data.snapshot as Cotizacion };
}
