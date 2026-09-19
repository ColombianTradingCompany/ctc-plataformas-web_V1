"use server";

// ── BCP · PVC · Server Actions ───────────────────────────────────────────────
// Sólo lo que la interfaz llama. PUBLICAR no está aquí a propósito: el único
// camino para publicar una edición es el tablero embebido (ruta
// /ecp/pvc/tablero/embed/publicar), que es donde se ven los diales antes de fijar
// el número — dos caminos para el mismo acto habrían acabado con dos ediciones
// distintas del mismo código. La lectura de ediciones la hacen las páginas en el
// servidor (lib/pvc/servicio.ts). Ninguna action lanza: devuelve {ok:false,error}.

import { revalidatePath } from "next/cache";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";
import { getPanelUser, isPanelOwner } from "@/lib/panel/panelUsers";
import { PARAMS_V211, type PvcParams } from "./motor";
import { crearVersionModelo } from "./servicio";
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
