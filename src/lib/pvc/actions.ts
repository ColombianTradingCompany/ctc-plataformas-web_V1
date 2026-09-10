"use server";

// ── BCP · PVC · Server Actions ───────────────────────────────────────────────
// Lectura con grant de escritura del BCP (el módulo es owner-only en el rail y
// publicar es una decisión del comité). Ninguna action lanza: devuelve
// {ok:false,error} y la pantalla lo muestra (regla del ActionForm).

import { revalidatePath } from "next/cache";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";
import { getPanelUser, isPanelOwner } from "@/lib/panel/panelUsers";
import { PARAMS_V211, type PvcEntradas, type PvcParams } from "./motor";
import { crearVersionModelo, listarEdiciones, listarVersionesModelo, publicarEdicion, versionModeloVigente } from "./servicio";
import type { PvcEdition, PvcModelVersion, PvcResult } from "./tipos";

const NO_AUTH: PvcResult = { ok: false, error: "Tu sesión del BCP no está activa. Vuelve a iniciar sesión." };
const NO_OWNER: PvcResult = { ok: false, error: "Publicar una edición o una versión del modelo es una decisión del owner." };

async function gateOwner(): Promise<{ userId: string } | PvcResult> {
  const who = await requireConsoleWrite("bcp");
  if (!who) return NO_AUTH;
  const row = await getPanelUser(who.userId);
  if (!isPanelOwner(row)) return NO_OWNER;
  return { userId: who.userId };
}

export async function cargarEdiciones(): Promise<PvcEdition[] | null> {
  const who = await requireConsoleWrite("bcp");
  if (!who) return null;
  return listarEdiciones();
}

export async function cargarVersionesModelo(): Promise<PvcModelVersion[] | null> {
  const who = await requireConsoleWrite("bcp");
  if (!who) return null;
  return listarVersionesModelo();
}

/** Publica una edición con los parámetros de la versión vigente del modelo. */
export async function publicarEdicionAction(entradas: PvcEntradas, notes?: string, correctionOf?: string | null): Promise<PvcResult> {
  const g = await gateOwner();
  if ("ok" in g) return g;
  const mv = await versionModeloVigente();
  if (!mv) return { ok: false, error: "No hay una versión del modelo registrada." };
  const r = await publicarEdicion({ params: mv.params, entradas, modelVersionId: mv.id, userId: g.userId, notes, correctionOf });
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/bcp/pvc");
  return { ok: true, id: r.id };
}

/** Registra una versión nueva del modelo (los parámetros completos). */
export async function crearVersionModeloAction(version: string, params: Partial<PvcParams>, notes?: string): Promise<PvcResult> {
  const g = await gateOwner();
  if ("ok" in g) return g;
  const v = version.trim();
  if (!/^v\d+\.\d+(\.\d+)?$/.test(v)) return { ok: false, error: "La versión se escribe como v2.1.1." };
  const r = await crearVersionModelo({ version: v, params: { ...PARAMS_V211, ...params }, notes, userId: g.userId });
  if ("error" in r) return { ok: false, error: r.error.includes("duplicate") ? `La versión ${v} ya existe.` : r.error };
  revalidatePath("/bcp/pvc/parametros");
  return { ok: true, id: r.id };
}
