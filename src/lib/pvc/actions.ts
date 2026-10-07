"use server";

// ── BCP · PVC · Server Actions ───────────────────────────────────────────────
// Sólo lo que la interfaz llama. PUBLICAR no está aquí a propósito: el único
// camino para publicar una edición es el tablero embebido (ruta
// /ecp/pvc/tablero/embed/publicar), que es donde se ven los diales antes de fijar
// el número — dos caminos para el mismo acto habrían acabado con dos ediciones
// distintas del mismo código. La lectura de ediciones la hacen las páginas en el
// servidor (lib/pvc/servicio.ts). Ninguna action lanza: devuelve {ok:false,error}.
// V5.178: aprobar una CORRECCIÓN del ciclo sí publica aquí, pero no una edición nueva: la corregida de una ya publicada, con el
// PVC que la vigilancia propuso (`vigilancia.ts`); el número no se teclea, así que no compite con el tablero.

import { revalidatePath } from "next/cache";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";
import { getPanelUser, isPanelOwner } from "@/lib/panel/panelUsers";
import { PARAMS_V211, type PvcParams } from "./motor";
import { crearVersionModelo, guardarVariablesDeEdicion, type VariablesDeEdicion } from "./servicio";
import { validarCalendario } from "@/lib/trato/calendario";
import { aprobarCorreccion, rechazarCorreccion } from "./vigilancia";
import { prepararBorrador } from "./agente";
import { hoyEnColombia } from "./servicio";
import type { PvcResult } from "./tipos";

/** Registra una versión nueva del modelo (los parámetros completos, con nota de acta). Owner. */
export async function crearVersionModeloAction(version: string, params: Partial<PvcParams>, notes?: string): Promise<PvcResult> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return { ok: false, error: "No se pudo ejecutar: o tu sesión del BCP ya no está activa (vuelve a iniciar sesión), o tu nivel en el BCP es de lectura y borradores y esta acción emite, publica, cobra, notifica o borra." };
  if (!isPanelOwner(await getPanelUser(who.userId))) return { ok: false, error: "Registrar una versión del modelo es una decisión del owner." };
  const v = version.trim();
  if (!/^v\d+\.\d+(\.\d+)?$/.test(v)) return { ok: false, error: "La versión se escribe como v2.1.1." };
  const r = await crearVersionModelo({ version: v, params: { ...PARAMS_V211, ...params }, notes, userId: who.userId });
  if ("error" in r) return { ok: false, error: r.error.includes("duplicate") ? `La versión ${v} ya existe.` : r.error };
  revalidatePath("/ecp/pvc/parametros");
  return { ok: true, id: r.id };
}

/**
 * V5.174 (docs/PLAN_CICLOS.md §1, §4, §6) · las variables de una edición: fechas (lunes a domingo, ciclos 6 + 7 o 7 + 7),
 * mínimos por grado, rangos de calidad y (V5.177) el Flete a CTCx por región. Owner. Emite: cambia lo que leen las ofertas.
 */
export async function guardarVariablesDeEdicionAction(id: string, v: VariablesDeEdicion): Promise<PvcResult> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return { ok: false, error: "No se pudo ejecutar: o tu sesión ya no está activa (vuelve a iniciar sesión), o tu nivel es de lectura y borradores y esta acción emite." };
  if (!isPanelOwner(await getPanelUser(who.userId))) return { ok: false, error: "Las variables de una edición del PVC las fija el owner." };
  const malCal = validarCalendario({ desde: v.desde, ciclo1Hasta: v.ciclo1Hasta, hasta: v.hasta });
  if (malCal) return { ok: false, error: malCal };
  for (const g of ["black", "red", "blue", "gold"] as const) {
    const n = Number(v.minimosPorGrado[g]);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, error: `El mínimo de ${g} tiene que ser un número de kg mayor que 0.` };
  }
  const c = v.rangosCalidad;
  if (!(c.humedad_min > 0 && c.humedad_max > c.humedad_min && c.humedad_max < 30)) return { ok: false, error: "La humedad va de un mínimo a un máximo (en %, p. ej. 10 a 12)." };
  if (!(c.aw_max > 0 && c.aw_max < 1)) return { ok: false, error: "La actividad de agua máxima va entre 0 y 1 (p. ej. 0,70)." };
  for (const r of ["santander", "centro", "sur"] as const) {
    const f = Number(v.fletePorRegion?.[r]);
    if (!(Number.isInteger(f) && f >= 0)) return { ok: false, error: "El Flete a CTCx de cada región es un valor entero en pesos por carga." };
  }
  const r = await guardarVariablesDeEdicion(id, v, who.userId);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/ecp/pvc");
  return { ok: true, id };
}

/**
 * V5.178 (docs/PLAN_CICLOS.md §6) · aprobar la corrección (o enmienda) que propuso la vigilancia: publica la edición corregida
 * con el PVC nuevo. Aplica solo a lo que se firme después. Owner (el módulo es suyo en el rail). Emite.
 */
export async function aprobarCorreccionAction(id: string): Promise<PvcResult> {
  const who = await requireConsoleWrite("ecp", "emite");
  if (!who) return { ok: false, error: "No se pudo ejecutar: o tu sesión ya no está activa (vuelve a iniciar sesión), o tu nivel es de lectura y borradores y esta acción emite." };
  if (!isPanelOwner(await getPanelUser(who.userId))) return { ok: false, error: "Aprobar una corrección del PVC es una decisión del owner." };
  const r = await aprobarCorreccion(id, who.userId);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/ecp/pvc");
  revalidatePath("/ecp");
  return { ok: true, id };
}

/** V5.178 · rechazar la propuesta (con su motivo). En ese ciclo ya no se propone otra para ese PVC. Owner. Emite. */
export async function rechazarCorreccionAction(id: string, nota: string): Promise<PvcResult> {
  const who = await requireConsoleWrite("ecp", "emite");
  if (!who) return { ok: false, error: "No se pudo ejecutar: o tu sesión ya no está activa (vuelve a iniciar sesión), o tu nivel es de lectura y borradores y esta acción emite." };
  if (!isPanelOwner(await getPanelUser(who.userId))) return { ok: false, error: "Rechazar una corrección del PVC es una decisión del owner." };
  if (nota.trim().length < 5) return { ok: false, error: "Escriba por qué se rechaza (queda en el registro)." };
  const r = await rechazarCorreccion(id, who.userId, nota.trim());
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/ecp/pvc");
  revalidatePath("/ecp");
  return { ok: true, id };
}

/**
 * V5.179 (docs/PLAN_CICLOS.md §6) · que el agente prepare (o regenere) YA el borrador de la edición siguiente, sin esperar a la
 * semana 1 del ciclo 2. Gasta IA (el informe en dos pasos, ~US$0,15): la pantalla lo dice antes. Owner. Emite.
 */
export async function prepararBorradorAction(): Promise<PvcResult> {
  const who = await requireConsoleWrite("ecp", "emite");
  if (!who) return { ok: false, error: "No se pudo ejecutar: o tu sesión ya no está activa (vuelve a iniciar sesión), o tu nivel es de lectura y borradores y esta acción emite." };
  if (!isPanelOwner(await getPanelUser(who.userId))) return { ok: false, error: "Pedir el borrador del agente es una decisión del owner." };
  const r = await prepararBorrador({ hoy: hoyEnColombia(), porQuien: "owner", userId: who.userId });
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/ecp/pvc");
  revalidatePath("/ecp");
  return { ok: true, id: r.id };
}
