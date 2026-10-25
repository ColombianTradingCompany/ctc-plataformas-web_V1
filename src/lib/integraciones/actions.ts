"use server";

// ── BCP · Configuración del Sistema · Automatizaciones · Server Actions ──────────────────────────────────
// El registro de automatizaciones y la cola de eventos. Vive en IT y Plataforma
// porque es infraestructura: qué automatismos existen, para qué, y si siguen
// vivos.
//
// Gate: `requireConsoleWrite(CONSOLA)`, y CONSOLA es el BCP. El módulo se mudó del ECP al BCP en la V4.25
// (PR-B): la RUTA se corrigió —`revalidatePath("/ecp/automatizaciones")`— y la CLAVE no, porque una
// consola escrita como identificador no lleva barras y ninguna reescritura de rutas la toca. Estuvo un
// mes pidiendo permiso del ECP desde una pantalla del BCP, sin fallarle a nadie (el owner tiene las tres
// consolas). Lo cazó `qa-rutas-consolas` (f-bis) el día que aprendió a mirar `src/lib/` (V5.56).
//
// ⚠️ En un módulo "use server" TODO export tiene que ser una función async
// (lección del 2026-07-30) — los tipos se importan desde ./types.

import { revalidatePath } from "next/cache";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Automation, AutomationResult, IntegrationEvent, UltimoLatido } from "./types";
import { CRONS } from "./registroCrons";
import { errorParaMostrar } from "./errores";
import { emitEvent } from "./emit";
import type { PanelConsoleKey } from "@/lib/panel/consoles";

/** La consola donde vive este módulo. UNA vez, y `qa-rutas-consolas` (f-bis) la contrasta con el rail. */
const CONSOLA: PanelConsoleKey = "ecp";

const NO_AUTH: AutomationResult = { ok: false, error: "No se pudo ejecutar: o tu sesión del BCP ya no está activa (vuelve a iniciar sesión), o tu nivel en el BCP es de lectura y borradores y esta acción emite, publica, cobra, notifica o borra." };

type Row = {
  id: string; nombre: string; make_scenario_id: string | number | null; proposito: string; clave: string | null;
  dominio: string; disparador: string; sistemas: string[] | null; criticidad: string; etapa: string;
  notas: string | null; ultima_corrida: string | null; errores_recientes: number; ops_mes: number | null;
  sincronizado_at: string | null; created_at: string; updated_at: string;
};

const toAutomation = (r: Row): Automation => ({
  id: r.id,
  nombre: r.nombre,
  makeScenarioId: r.make_scenario_id === null ? null : Number(r.make_scenario_id),
  proposito: r.proposito,
  clave: r.clave,
  dominio: r.dominio as Automation["dominio"],
  disparador: r.disparador,
  sistemas: r.sistemas ?? [],
  criticidad: r.criticidad as Automation["criticidad"],
  etapa: r.etapa as Automation["etapa"],
  notas: r.notas,
  ultimaCorrida: r.ultima_corrida,
  erroresRecientes: r.errores_recientes,
  opsMes: r.ops_mes,
  sincronizadoAt: r.sincronizado_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function listAutomations(): Promise<Automation[] | null> {
  const who = await requireConsoleWrite(CONSOLA, "lectura");
  if (!who) return null;
  const service = createServiceRoleClient();
  const { data } = await service
    .from("automations")
    .select("*")
    .order("etapa")
    .order("dominio")
    .order("nombre");
  return ((data ?? []) as Row[]).map(toAutomation);
}

/** Los últimos eventos de la espina — para ver si la cola respira. `ultimo_error`
 *  pasa por `errorParaMostrar`: lo que no sea un código de la lista cerrada se
 *  ve como «texto retirado» y nunca llega al navegador (S0). */
export async function listRecentEvents(limit = 30): Promise<IntegrationEvent[] | null> {
  const who = await requireConsoleWrite(CONSOLA, "lectura");
  if (!who) return null;
  const service = createServiceRoleClient();
  const { data } = await service
    .from("integration_events")
    .select("id, dominio, tipo, estado, intentos, ultimo_error, destino, created_at, dispatched_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as IntegrationEvent[]).map((e) => ({ ...e, ultimo_error: errorParaMostrar(e.ultimo_error) }));
}

/** El último latido FINAL de cada cron de `vercel.json` (B6.0): una consulta pequeña por clave, en vez de
 *  traer días de latidos (el despachador escribe 144 al día). Es lectura: la ve cualquier nivel. */
export async function listUltimosLatidos(): Promise<UltimoLatido[] | null> {
  const who = await requireConsoleWrite(CONSOLA, "lectura");
  if (!who) return null;
  const service = createServiceRoleClient();
  const filas = await Promise.all(
    CRONS.map(async (c) => {
      const { data } = await service
        .from("latidos")
        .select("clave, inicio, fin, estado, codigo_error")
        .eq("clave", c.clave)
        .neq("estado", "en_curso")
        .order("inicio", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as UltimoLatido | null) ?? null;
    })
  );
  return filas.filter((f): f is UltimoLatido => f !== null);
}

export async function saveAutomation(input: {
  id?: string;
  nombre: string;
  proposito: string;
  dominio: string;
  disparador: string;
  sistemas: string[];
  criticidad: string;
  etapa: string;
  makeScenarioId: number | null;
  notas: string;
}): Promise<AutomationResult> {
  const who = await requireConsoleWrite(CONSOLA);
  if (!who) return NO_AUTH;
  if (!input.nombre.trim()) return { ok: false, error: "Ponle nombre." };
  // La regla del registro: si no se puede escribir para qué existe, no se
  // debería construir.
  if (!input.proposito.trim()) return { ok: false, error: "Escribe el propósito: una frase que diga por qué existe." };

  const service = createServiceRoleClient();
  // Las filas de cron las siembra `registroCrons.ts` y solo una tanda con versión las cambia: ni se crean
  // aquí ni se les cambia el disparador o la etapa (un cron se para con un deploy, no con este formulario).
  if (!input.id && input.disparador === "cron") {
    return { ok: false, error: "Las filas de cron no se crean aquí: nacen con su cron, en la misma tanda que lo añade a vercel.json." };
  }
  if (input.id) {
    const { data: actual } = await service.from("automations").select("disparador, etapa").eq("id", input.id).maybeSingle();
    if (actual?.disparador === "cron" && (input.disparador !== "cron" || input.etapa !== actual.etapa)) {
      return { ok: false, error: "Esta fila es un cron de la plataforma: su disparador y su etapa no se cambian desde aquí." };
    }
    if (actual && actual.disparador !== "cron" && input.disparador === "cron") {
      return { ok: false, error: "«cron» queda reservado a las filas que siembra la plataforma." };
    }
  }
  const row = {
    nombre: input.nombre.trim(),
    proposito: input.proposito.trim(),
    dominio: input.dominio,
    disparador: input.disparador,
    sistemas: input.sistemas,
    criticidad: input.criticidad,
    etapa: input.etapa,
    make_scenario_id: input.makeScenarioId,
    notas: input.notas.trim() || null,
  };

  // El trigger `automations_touch` rechaza activa/pausada sin escenario de Make.
  const { error } = input.id
    ? await service.from("automations").update(row).eq("id", input.id)
    : await service.from("automations").insert({ ...row, created_by: who.userId });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/ecp/automatizaciones");
  return { ok: true };
}

export async function deleteAutomation(id: string): Promise<AutomationResult> {
  const who = await requireConsoleWrite(CONSOLA);
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { data: fila } = await service.from("automations").select("disparador").eq("id", id).maybeSingle();
  if (fila?.disparador === "cron") {
    return { ok: false, error: "Esta fila es un cron de la plataforma: sale del registro solo cuando su cron sale de vercel.json." };
  }
  const { error } = await service.from("automations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ecp/automatizaciones");
  return { ok: true };
}

/** Reintentar los eventos SALIENTES que se rindieron, tras arreglar lo que fallaba.
 *  Solo `destino is null`: un entrante fallido no se reencola, porque el despachador
 *  nunca lo recoge y se quedaba `pendiente` para siempre. */
export async function retryFailedEvents(): Promise<AutomationResult> {
  const who = await requireConsoleWrite(CONSOLA);
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service
    .from("integration_events")
    .update({ estado: "pendiente", intentos: 0, ultimo_error: null })
    .eq("estado", "fallido")
    .is("destino", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ecp/automatizaciones");
  return { ok: true };
}

/** Emitir un ping por la espina — la prueba de vida de F1. Va por `emitEvent`
 *  como cualquier evento: sale en seguida (techo de 3 s), y si Make no responde
 *  lo recoge el despachador cada 10 minutos. El payload es solo la hora. */
export async function emitPing(): Promise<AutomationResult> {
  const who = await requireConsoleWrite(CONSOLA);
  if (!who) return NO_AUTH;
  const guardado = await emitEvent({ dominio: "it_plataforma", tipo: "prueba.ping", payload: { at: new Date().toISOString() } });
  if (!guardado) return { ok: false, error: "No se pudo guardar el ping (error_bd)." };
  revalidatePath("/ecp/automatizaciones");
  return { ok: true };
}
