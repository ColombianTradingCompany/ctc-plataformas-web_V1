"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/integraciones/emit";
import { contextoDeAcceso } from "./toolGrants";
import { puedeAbrir } from "./accesoHerramienta";

// ── Herramientas del Café · los TRABAJOS guardados (A11, 2026-08-19) ─────────
// Lo que el owner pidió con estas palabras: las herramientas «initialized
// directly there, to enable them not being stateless, and give them memory with
// the database» — con «a sort of Home Menu... a name and a time stamp list to
// retrieve them». Esto es la mitad servidor de esa frase; la otra mitad es el
// puente `public/tools/ctc-bridge.js` y el menú de la concha.
//
// LA REGLA DE PROPIEDAD, en cada verbo: la sesión dice quién es, y CADA
// consulta filtra por `user_id`. `tool_sessions` es service-role-only (RLS
// encendida, cero políticas) — todo pasa por aquí, y aquí se comprueba
// identidad Y veredicto de acceso a la herramienta antes de tocar nada. Un
// trabajo de una herramienta que ya no se puede abrir tampoco se puede leer:
// el estado guardado ES contenido de la herramienta.
//
// EL TAMAÑO. `estado` viene del navegador y se guarda tal cual; sin techo, un
// cliente hostil convertiría la tabla en su disco duro. 200 KB por trabajo da
// de sobra para formularios y cálculos (el criterio: si una herramienta
// necesita más, probablemente está guardando archivos — y eso va a Storage,
// no aquí).

const MAX_ESTADO_BYTES = 200 * 1024;
const MAX_TRABAJOS_POR_HERRAMIENTA = 40;

export type TrabajoResumen = {
  id: string;
  nombre: string;
  /** La línea derivada del estado que manda el puente (V5.7). */
  resumen: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResultadoTrabajos<T> = { ok: true; data: T } | { ok: false; error: string };

// El tipo de vuelta va EXPLÍCITO: con la inferencia, los cuatro literales
// `as const` de error hacían que `r.error` saliera opcional en el llamador.
type PuertaTrabajos =
  | { error: string }
  | { user: { id: string }; service: ReturnType<typeof createServiceRoleClient>; error?: undefined };

async function usuarioYVeredicto(toolId: string): Promise<PuertaTrabajos> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { error: "Entre con su cuenta para usar los trabajos guardados." };

  const service = createServiceRoleClient();
  const { data: tool } = await service
    .from("tools")
    .select("id, tier, clase, archivado_at, soporta_memoria")
    .eq("id", toolId)
    .eq("clase", "compartible")
    .is("archivado_at", null)
    .maybeSingle();
  if (!tool) return { error: "Esa herramienta no existe." };
  if (!tool.soporta_memoria) return { error: "Esta herramienta no guarda trabajos." };

  const ctx = await contextoDeAcceso();
  const veredicto = puedeAbrir(ctx, toolId, (tool as { tier: "default" | "plus" }).tier);
  if (!veredicto.abre) return { error: "Su cuenta no puede abrir esta herramienta." };

  return { user, service };
}

/** La lista del Home Menu: nombre y fechas, lo más reciente primero. */
export async function listarTrabajos(toolId: string): Promise<ResultadoTrabajos<TrabajoResumen[]>> {
  const r = await usuarioYVeredicto(toolId);
  if (r.error !== undefined) return { ok: false, error: r.error };

  const { data } = await r.service
    .from("tool_sessions")
    .select("id, nombre, resumen, created_at, updated_at")
    .eq("user_id", r.user.id)
    .eq("tool_id", toolId)
    .order("updated_at", { ascending: false })
    .limit(MAX_TRABAJOS_POR_HERRAMIENTA);

  return {
    ok: true,
    data: (
      (data as { id: string; nombre: string; resumen: string | null; created_at: string; updated_at: string }[] | null) ?? []
    ).map((f) => ({ id: f.id, nombre: f.nombre, resumen: f.resumen, createdAt: f.created_at, updatedAt: f.updated_at })),
  };
}

/** Crear un trabajo nuevo. Devuelve el id con el que la concha lo abre. */
export async function crearTrabajo(toolId: string, nombre: string): Promise<ResultadoTrabajos<{ id: string }>> {
  const r = await usuarioYVeredicto(toolId);
  if (r.error !== undefined) return { ok: false, error: r.error };

  const limpio = nombre.trim().slice(0, 80);
  if (!limpio) return { ok: false, error: "Póngale un nombre al trabajo." };

  // El techo de trabajos evita la lista infinita — y el mensaje dice QUÉ hacer,
  // no solo que no se pudo.
  const { count } = await r.service
    .from("tool_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", r.user.id)
    .eq("tool_id", toolId);
  if ((count ?? 0) >= MAX_TRABAJOS_POR_HERRAMIENTA)
    return { ok: false, error: "Ya tiene 40 trabajos en esta herramienta. Borre alguno viejo para crear otro." };

  const { data, error } = await r.service
    .from("tool_sessions")
    .insert({ tool_id: toolId, user_id: r.user.id, nombre: limpio })
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo crear el trabajo." };
  return { ok: true, data: { id: (data as { id: string }).id } };
}

/** Abrir un trabajo: devuelve su estado y sella `abierto_at`. */
export async function abrirTrabajo(
  toolId: string,
  trabajoId: string
): Promise<ResultadoTrabajos<{ nombre: string; estado: Record<string, unknown> }>> {
  const r = await usuarioYVeredicto(toolId);
  if (r.error !== undefined) return { ok: false, error: r.error };

  const { data } = await r.service
    .from("tool_sessions")
    .select("id, nombre, estado")
    .eq("id", trabajoId)
    .eq("user_id", r.user.id)
    .eq("tool_id", toolId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Ese trabajo ya no existe." };

  await r.service.from("tool_sessions").update({ abierto_at: new Date().toISOString() }).eq("id", trabajoId).eq("user_id", r.user.id);

  const fila = data as { nombre: string; estado: Record<string, unknown> };
  return { ok: true, data: { nombre: fila.nombre, estado: fila.estado ?? {} } };
}

/** El autoguardado de la concha. Reemplaza el estado entero — el puente manda
 *  siempre la foto completa, no deltas, para que un guardado perdido no deje
 *  un estado a medias. */
export async function guardarTrabajo(
  toolId: string,
  trabajoId: string,
  estado: Record<string, unknown>,
  resumen?: string
): Promise<ResultadoTrabajos<{ guardadoAt: string }>> {
  const r = await usuarioYVeredicto(toolId);
  if (r.error !== undefined) return { ok: false, error: r.error };

  let serializado: string;
  try {
    serializado = JSON.stringify(estado ?? {});
  } catch {
    return { ok: false, error: "El estado no se pudo serializar." };
  }
  if (serializado.length > MAX_ESTADO_BYTES)
    return { ok: false, error: "El trabajo pesa demasiado para guardarse (máx. 200 KB)." };

  const ahora = new Date().toISOString();
  const { error, count } = await r.service
    .from("tool_sessions")
    .update(
      { estado: JSON.parse(serializado), resumen: String(resumen ?? "").trim().slice(0, 140) || null, updated_at: ahora },
      { count: "exact" }
    )
    .eq("id", trabajoId)
    .eq("user_id", r.user.id)
    .eq("tool_id", toolId);
  if (error) return { ok: false, error: "No se pudo guardar." };
  if (!count) return { ok: false, error: "Ese trabajo ya no existe." };
  return { ok: true, data: { guardadoAt: ahora } };
}

/** Borrar un trabajo. Definitivo — el menú lo confirma antes de llamar. */
export async function borrarTrabajo(toolId: string, trabajoId: string): Promise<ResultadoTrabajos<null>> {
  const r = await usuarioYVeredicto(toolId);
  if (r.error !== undefined) return { ok: false, error: r.error };

  const { error } = await r.service
    .from("tool_sessions")
    .delete()
    .eq("id", trabajoId)
    .eq("user_id", r.user.id)
    .eq("tool_id", toolId);
  if (error) return { ok: false, error: "No se pudo borrar." };
  return { ok: true, data: null };
}

/** El canal hacia el resto del ecosistema (petición del owner: las
 *  herramientas «push info (sometimes) to other parts of the ecosystem»).
 *  Una herramienta lo usa vía `CTC.emitir(evento, payload)` del puente; aquí
 *  se convierte en una fila de `integration_events` bajo el dominio de
 *  plataforma, con el rastro de quién y desde qué herramienta. `emitEvent`
 *  nunca lanza, así que esto tampoco tumba a la herramienta. */
export async function emitirDesdeHerramienta(
  toolId: string,
  evento: string,
  payload: Record<string, unknown>
): Promise<ResultadoTrabajos<null>> {
  const r = await usuarioYVeredicto(toolId);
  if (r.error !== undefined) return { ok: false, error: r.error };

  const tipo = `herramienta.${toolId}.${String(evento).trim().slice(0, 60) || "evento"}`;
  await emitEvent({
    dominio: "it_plataforma",
    tipo,
    payload: { herramienta: toolId, usuario: r.user.id, ...payload },
  });
  return { ok: true, data: null };
}
