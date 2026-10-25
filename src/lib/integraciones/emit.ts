import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { dispatchPending } from "./dispatch";
import { limpiarError } from "./errores";
import type { Dominio } from "./dominios";

// ── Integraciones · emitir un evento ─────────────────────────────────────────
// La regla: las Server Actions NO llaman webhooks por su cuenta. Insertan una
// fila y se la pasan al despachador, que la intenta enviar en seguida con un
// techo corto; si no sale, se queda en la cola.
//
// Por qué importa: si Make está caído o lento, un `fetch` sin techo dentro de
// una action revienta —o cuelga— la operación del usuario. Una fila pendiente
// se reintenta sola y nadie se entera. Es el mismo criterio por el que el
// correo del llamado de Terratalento nunca bloquea el cambio de estado.
//
// `emitEvent` NUNCA lanza: emitir es un efecto secundario y no puede tumbar la
// operación que lo originó. Si falla el insert, se pierde el evento y se anota
// en consola —solo con un código, nunca con el mensaje— y devuelve `false`: es
// preferible a perder la cotización que el usuario acababa de emitir.
//
// CUÁNDO SALE (cambiado 2026-10-25, V6.9). Desde el 2026-08-05 el evento se
// despachaba con `after()` de Next, después de responder. La prueba de vida del
// 2026-10-25 (P1 de la unificación) enseñó que desde un botón de la consola ese
// despacho no ocurría: la fila quedaba `pendiente` sin intento ni error, y solo
// salió cuando corrió el cron. Ahora sale DENTRO de la misma petición, esperado
// de verdad, pero acotado: SOLO la fila recién creada y con un techo de 3 s por
// llamada, así que un Make lento le suma como mucho eso a la acción del usuario.
// Si no sale (Make caído, techo alcanzado), la fila sigue `pendiente` y la
// recoge el cron, que ahora corre cada 10 minutos (vercel.json) y reintenta con
// techo. El plan de Vercel es Pro desde 2026-08-17: esa frecuencia ya no tumba
// el despliegue.

/** Devuelve si la fila quedó guardada (haya salido ya o no). */
export async function emitEvent(input: {
  dominio: Dominio;
  /** 'cotizacion.emitida', 'lote.galardonado', 'prueba.ping'… */
  tipo: string;
  payload?: Record<string, unknown>;
}): Promise<boolean> {
  let id: string;
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("integration_events")
      .insert({ dominio: input.dominio, tipo: input.tipo, payload: input.payload ?? {} })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[integraciones] no se pudo emitir", input.tipo, "error_bd");
      return false;
    }
    id = (data as { id: string }).id;
  } catch (e) {
    console.error("[integraciones] no se pudo emitir", input.tipo, limpiarError(e));
    return false;
  }
  // Ya está guardado. Sacarlo ahora es una mejora, no una obligación: si esto
  // falla, la fila sigue pendiente y el cron la recoge.
  try {
    await dispatchPending({ soloId: id, timeoutMs: 3_000 });
  } catch (e) {
    console.error("[integraciones] el despacho inmediato falló", input.tipo, limpiarError(e));
  }
  return true;
}
