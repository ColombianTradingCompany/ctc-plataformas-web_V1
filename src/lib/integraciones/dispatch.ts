import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ── Integraciones · el despachador ───────────────────────────────────────────
// Toma los eventos pendientes y los manda a Make por un webhook. Lo llama el
// cron (`/api/cron/integraciones`), no una Server Action.
//
// Dos decisiones deliberadas:
//
// 1. **Un solo webhook de salida**, no uno por tipo de evento. Make enruta por
//    `dominio`/`tipo` dentro del escenario. Así, añadir un evento nuevo no
//    requiere tocar variables de entorno ni desplegar.
//
// 2. **Reintento con techo.** Un evento que falla 5 veces pasa a `fallido` y
//    deja de intentarse: un webhook mal configurado no puede quemar el
//    presupuesto de operaciones de Make reintentando para siempre.

const MAX_INTENTOS = 5;
const LOTE = 25;

export type DispatchResult = { enviados: number; fallidos: number; pendientes: number; motivo?: string };

export async function dispatchPending(): Promise<DispatchResult> {
  const url = process.env.MAKE_WEBHOOK_URL;
  const service = createServiceRoleClient();

  const { data: rows } = await service
    .from("integration_events")
    .select("id, dominio, tipo, payload, intentos")
    .eq("estado", "pendiente")
    // SOLO lo saliente. Un evento ENTRANTE nace con `destino` sellado
    // ('entrada:make') y no debe volver a salir: sin este filtro, lo que Make
    // nos manda se le devuelve en el siguiente barrido y queda un bucle.
    // (Cazado en la prueba de vida de F1, no en la lectura del código.)
    .is("destino", null)
    .lt("intentos", MAX_INTENTOS)
    .order("created_at")
    .limit(LOTE);

  const pendientes = rows?.length ?? 0;
  // Sin webhook configurado no se toca nada: los eventos se quedan esperando a
  // que exista, en vez de marcarse como fallidos por una variable que falta.
  if (!url) return { enviados: 0, fallidos: 0, pendientes, motivo: "MAKE_WEBHOOK_URL sin configurar" };
  if (!pendientes) return { enviados: 0, fallidos: 0, pendientes: 0 };

  let enviados = 0;
  let fallidos = 0;

  for (const ev of rows ?? []) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Deja que el escenario compruebe que viene de nosotros.
          ...(process.env.MAKE_WEBHOOK_SECRET ? { "x-ctc-secret": process.env.MAKE_WEBHOOK_SECRET } : {}),
        },
        body: JSON.stringify({ id: ev.id, dominio: ev.dominio, tipo: ev.tipo, payload: ev.payload }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await service.from("integration_events").update({ estado: "enviado", destino: "make" }).eq("id", ev.id);
      enviados++;
    } catch (e) {
      const intentos = (ev.intentos ?? 0) + 1;
      await service
        .from("integration_events")
        .update({
          intentos,
          ultimo_error: (e as Error).message.slice(0, 300),
          // Al quinto intento se rinde, para no quemar operaciones de Make.
          estado: intentos >= MAX_INTENTOS ? "fallido" : "pendiente",
        })
        .eq("id", ev.id);
      fallidos++;
    }
  }

  return { enviados, fallidos, pendientes };
}
