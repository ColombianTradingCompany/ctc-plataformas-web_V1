"use server";

// ── ECP · Direccionamiento · los cuatro enganches de «Definición de contexto» ──
// El módulo `DefinicionDeContexto.jsx` es autónomo a propósito: resuelve cada
// dependencia como prop → global → valor por defecto (ver docs/INTEGRACION.md
// del paquete). Este archivo es el extremo del sistema para tres de los cuatro
// enganches; el cuarto (`onChange`) no necesita servidor porque el guardado ya
// viaja por `adapter.save`.
//
//   adapter    → cargarContexto / guardarContexto   (tabla direccionamiento_context)
//   aiComplete → redactarContexto                   (cliente Claude compartido)
//   memory     → memoriaContexto                    (lo que la casa ya sabe)
//
// El fichero .jsx NO se toca: se integra por props desde el envoltorio de
// cliente. Así se puede resincronizar con la versión del autor sin rehacer el
// cableado.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { claude, parseJson, MODEL_WRITE } from "@/lib/coffeed/claude";
import { SISTEMA_REDACCION, textoMemoria } from "@/lib/direccionamiento/memoria";

export type ContextoScope = "record" | "assets";

const SCOPES: ContextoScope[] = ["record", "assets"];

function assertScope(scope: string): ContextoScope {
  if (!SCOPES.includes(scope as ContextoScope)) throw new Error("Ámbito no válido.");
  return scope as ContextoScope;
}

/* ── 1. Persistencia ───────────────────────────────────────────────────────── */

/** Devuelve la ficha guardada del ámbito pedido, o null si nunca se ha escrito. */
export async function cargarContexto(scope: string): Promise<Record<string, unknown> | null> {
  await requireActiveAdmin();
  const s = assertScope(scope);
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("direccionamiento_context")
    .select("data")
    .eq("scope", s)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as Record<string, unknown> | undefined) ?? null;
}

/** Guarda la ficha. El componente rebota 700 ms (900 ms para imágenes), así que
 *  esto NO se llama por tecla — pero sí es un upsert completo del ámbito. */
export async function guardarContexto(scope: string, data: unknown): Promise<void> {
  const userId = await requireActiveAdmin();
  const s = assertScope(scope);
  const service = createServiceRoleClient();
  const { error } = await service
    .from("direccionamiento_context")
    .upsert(
      { scope: s, data: data ?? {}, updated_at: new Date().toISOString(), updated_by: userId },
      { onConflict: "scope" }
    );
  if (error) throw new Error(error.message);
}

/* ── 2. Redacción ──────────────────────────────────────────────────────────── */

// El componente arma el prompt entero (contexto de compañía + memoria + brief +
// la pieza) y espera de vuelta el TEXTO de la respuesta, que él mismo parsea.
// Aquí se valida que sea JSON antes de devolverlo —`parseJson` rescata el primer
// bloque si el modelo antepone preámbulo— y se devuelve reserializado: el
// `JSON.parse` del navegador ya no puede fallar por una valla de markdown.
// El system prompt vive en el módulo puro para que el guardián pruebe la misma
// cadena que se manda en producción.
export async function redactarContexto(prompt: string): Promise<string> {
  await requireActiveAdmin();
  if (!prompt || prompt.length > 60_000) throw new Error("Petición no válida.");
  const raw = await claude({
    model: MODEL_WRITE,
    system: SISTEMA_REDACCION,
    user: prompt,
    maxTokens: 2000,
  });
  return JSON.stringify(parseJson<unknown>(raw));
}

/* ── 3. Memoria ────────────────────────────────────────────────────────────── */

// «Es lo que convierte la herramienta en parte del sistema»: este texto entra en
// CADA prompt dentro de <memoria_del_sistema>, ANTES del brief.
//
// El texto vive en `@/lib/direccionamiento/memoria` — módulo PURO, para que el
// guardián pueda comprobarlo sin levantar la consola y sin probar una copia.
// Aquí solo queda la compuerta.
export async function memoriaContexto(): Promise<string> {
  await requireActiveAdmin();
  return textoMemoria();
}
