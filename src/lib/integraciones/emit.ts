import "server-only";
import { after } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { dispatchPending } from "./dispatch";
import { limpiarError } from "./errores";
import type { Dominio } from "./dominios";

// ── Integraciones · emitir un evento ─────────────────────────────────────────
// La regla: las Server Actions NO llaman webhooks. Insertan una fila y siguen.
// Un despachador la envía después.
//
// Por qué importa: si Make está caído o lento, un `fetch` dentro de una action
// revienta —o cuelga— la operación del usuario. Una fila pendiente se reintenta
// sola y nadie se entera. Es el mismo criterio por el que el correo del llamado
// de Terratalento nunca bloquea el cambio de estado.
//
// `emitEvent` NUNCA lanza: emitir es un efecto secundario y no puede tumbar la
// operación que lo originó. Si falla el insert, se pierde el evento y se anota
// en consola —solo con un código, nunca con el mensaje— y devuelve `false`: es
// preferible a perder la cotización que el usuario acababa de emitir.
//
// CUÁNDO SALE (cambiado 2026-08-05). Antes un cron barría la cola cada cuarto de
// hora; el plan de Vercel de entonces no admitía un cron más frecuente que una
// vez al día, y una frecuencia mayor en vercel.json no se degrada: tumba el
// despliegue entero. Así que el evento se despacha AQUÍ, con `after()` de Next:
// la tarea corre cuando la respuesta ya salió, dentro de la misma invocación.
// El usuario no espera al webhook y el evento no espera al cron. (El plan es Pro
// desde 2026-08-17; el diseño se quedó porque es mejor así.)
//
// El cron diario de las 11:35 UTC es la RED DE SEGURIDAD: recoge lo que quedó
// pendiente porque Make estaba caído en ese momento. Los reintentos con techo
// de `dispatchPending` siguen siendo suyos.
//
// `after` NO sirve para trabajo que deba sobrevivir a la invocación: si la
// función se apaga antes, la tarea se pierde. Aquí da igual — la fila ya está
// en la base de datos y el barrido diario la encontrará.

/** Devuelve si la fila quedó guardada. */
export async function emitEvent(input: {
  dominio: Dominio;
  /** 'cotizacion.emitida', 'lote.galardonado', 'prueba.ping'… */
  tipo: string;
  payload?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const service = createServiceRoleClient();
    const { error } = await service.from("integration_events").insert({
      dominio: input.dominio,
      tipo: input.tipo,
      payload: input.payload ?? {},
    });
    if (error) {
      console.error("[integraciones] no se pudo emitir", input.tipo, "error_bd");
      return false;
    }
    // Ya está guardado. Sacarlo ahora es una mejora, no una obligación: si esto
    // falla, la fila sigue pendiente y el barrido diario la recoge.
    after(async () => {
      try {
        await dispatchPending();
      } catch (e) {
        console.error("[integraciones] el despacho inmediato falló", input.tipo, limpiarError(e));
      }
    });
    return true;
  } catch (e) {
    console.error("[integraciones] no se pudo emitir", input.tipo, limpiarError(e));
    return false;
  }
}
