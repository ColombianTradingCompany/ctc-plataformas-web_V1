"use server";

// ── ECP · Automatizaciones · Server Actions ──────────────────────────────────
// El registro de automatizaciones y la cola de eventos. Vive en IT y Plataforma
// porque es infraestructura: qué automatismos existen, para qué, y si siguen
// vivos.
//
// Gate: `requireConsoleWrite("ecp")`.
//
// ⚠️ En un módulo "use server" TODO export tiene que ser una función async
// (lección del 2026-07-30) — los tipos se importan desde ./types.

import { revalidatePath } from "next/cache";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Automation, AutomationResult, IntegrationEvent } from "./types";

const NO_AUTH: AutomationResult = { ok: false, error: "Tu sesión del ECP no está activa. Vuelve a iniciar sesión." };

type Row = {
  id: string; nombre: string; make_scenario_id: string | number | null; proposito: string;
  dominio: string; disparador: string; sistemas: string[] | null; criticidad: string; etapa: string;
  notas: string | null; ultima_corrida: string | null; errores_recientes: number; ops_mes: number | null;
  sincronizado_at: string | null; created_at: string; updated_at: string;
};

const toAutomation = (r: Row): Automation => ({
  id: r.id,
  nombre: r.nombre,
  makeScenarioId: r.make_scenario_id === null ? null : Number(r.make_scenario_id),
  proposito: r.proposito,
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
  const who = await requireConsoleWrite("ecp");
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

/** Los últimos eventos de la espina — para ver si la cola respira. */
export async function listRecentEvents(limit = 30): Promise<IntegrationEvent[] | null> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return null;
  const service = createServiceRoleClient();
  const { data } = await service
    .from("integration_events")
    .select("id, dominio, tipo, estado, intentos, ultimo_error, destino, created_at, dispatched_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as IntegrationEvent[];
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
  const who = await requireConsoleWrite("ecp");
  if (!who) return NO_AUTH;
  if (!input.nombre.trim()) return { ok: false, error: "Ponle nombre." };
  // La regla del registro: si no se puede escribir para qué existe, no se
  // debería construir.
  if (!input.proposito.trim()) return { ok: false, error: "Escribe el propósito: una frase que diga por qué existe." };

  const service = createServiceRoleClient();
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
  revalidatePath("/bcp/automatizaciones");
  return { ok: true };
}

export async function deleteAutomation(id: string): Promise<AutomationResult> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service.from("automations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/bcp/automatizaciones");
  return { ok: true };
}

/** Reintentar los eventos que se rindieron, tras arreglar lo que fallaba. */
export async function retryFailedEvents(): Promise<AutomationResult> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service
    .from("integration_events")
    .update({ estado: "pendiente", intentos: 0, ultimo_error: null })
    .eq("estado", "fallido");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/bcp/automatizaciones");
  return { ok: true };
}

/** Emitir un ping por la espina — la prueba de vida de F1. */
export async function emitPing(): Promise<AutomationResult> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service.from("integration_events").insert({
    dominio: "it_plataforma",
    tipo: "prueba.ping",
    payload: { emitidoPor: who.userId, at: new Date().toISOString() },
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/bcp/automatizaciones");
  return { ok: true };
}
