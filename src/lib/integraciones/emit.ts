import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
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
// en consola — es preferible a perder la cotización que el usuario acababa de
// emitir.

export async function emitEvent(input: {
  dominio: Dominio;
  /** 'cotizacion.emitida', 'lote.galardonado', 'prueba.ping'… */
  tipo: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const service = createServiceRoleClient();
    const { error } = await service.from("integration_events").insert({
      dominio: input.dominio,
      tipo: input.tipo,
      payload: input.payload ?? {},
    });
    if (error) console.error("[integraciones] no se pudo emitir", input.tipo, error.message);
  } catch (e) {
    console.error("[integraciones] no se pudo emitir", input.tipo, (e as Error).message);
  }
}
