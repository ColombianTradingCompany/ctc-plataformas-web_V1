import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { codigoHttp, limpiarError, validarWebhook, type CodigoSalida } from "./errores";

// ── Integraciones · el despachador ───────────────────────────────────────────
// Toma los eventos pendientes y los manda a Make por un webhook. Lo llaman
// `emitEvent` (en seguida, con `after()`) y el cron diario de las 11:35 UTC
// (`/api/cron/integraciones`, la red de seguridad), no una Server Action.
//
// Tres decisiones deliberadas:
//
// 1. **Un solo webhook de salida**, no uno por tipo de evento. Make enruta por
//    `dominio`/`tipo` dentro del escenario. Así, añadir un evento nuevo no
//    requiere tocar variables de entorno ni desplegar.
//
// 2. **Reintento con techo.** Un evento que falla 5 veces pasa a `fallido` y
//    deja de intentarse: un webhook mal configurado no puede quemar el
//    presupuesto de operaciones de Make reintentando para siempre.
//
// 3. **Solo códigos en `ultimo_error`** (S0, `errores.ts`). La url se valida
//    ANTES de cualquier `fetch` (https y un host de make.com), en producción no
//    se despacha sin `MAKE_WEBHOOK_SECRET`, y el secreto viaja en la cabecera
//    de clave de API de Make (`x-make-apikey`), nunca en el cuerpo.
//
// El cliente, el `fetch` y las variables se pueden inyectar: así el guardián
// `qa-integraciones-check` corre este mismo código contra dobles, sin red y sin
// tocar producción.

const MAX_INTENTOS = 5;
const LOTE = 25;

type Cliente = ReturnType<typeof createServiceRoleClient>;

export type DispatchResult = { enviados: number; fallidos: number; pendientes: number; motivo?: CodigoSalida };

export type DispatchDeps = {
  client?: Cliente;
  fetchImpl?: typeof fetch;
  url?: string;
  secret?: string;
  produccion?: boolean;
};

export async function dispatchPending(deps: DispatchDeps = {}): Promise<DispatchResult> {
  const url = "url" in deps ? deps.url : process.env.MAKE_WEBHOOK_URL;
  const secret = "secret" in deps ? deps.secret : process.env.MAKE_WEBHOOK_SECRET;
  const produccion = deps.produccion ?? process.env.NODE_ENV === "production";
  const doFetch = deps.fetchImpl ?? fetch;
  const service = deps.client ?? createServiceRoleClient();

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
  const webhook = validarWebhook(url);

  // Sin webhook configurado no se toca nada: los eventos se quedan esperando a
  // que exista, en vez de marcarse como fallidos por una variable que falta.
  if (!webhook.ok && webhook.codigo === "url_ausente") return { enviados: 0, fallidos: 0, pendientes, motivo: "url_ausente" };
  // Igual sin secreto en producción: falla cerrado, filas intactas.
  if (produccion && !secret) return { enviados: 0, fallidos: 0, pendientes, motivo: "secreto_ausente" };
  if (!pendientes) return { enviados: 0, fallidos: 0, pendientes: 0 };

  let enviados = 0;
  let fallidos = 0;

  for (const ev of rows ?? []) {
    let codigo: string;
    if (!webhook.ok) {
      // Una url que no es de Make cuenta como intento fallido, y no se llama.
      codigo = webhook.codigo;
    } else {
      try {
        const res = await doFetch(webhook.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(secret ? { "x-make-apikey": secret } : {}),
          },
          body: JSON.stringify({ id: ev.id, dominio: ev.dominio, tipo: ev.tipo, payload: ev.payload }),
          signal: AbortSignal.timeout(15_000),
        });
        if (res.ok) {
          await service.from("integration_events").update({ estado: "enviado", destino: "make", ultimo_error: null }).eq("id", ev.id);
          enviados++;
          continue;
        }
        codigo = codigoHttp(res.status);
      } catch (e) {
        codigo = limpiarError(e);
      }
    }
    const intentos = (ev.intentos ?? 0) + 1;
    await service
      .from("integration_events")
      .update({
        intentos,
        ultimo_error: codigo,
        // Al quinto intento se rinde, para no quemar operaciones de Make.
        estado: intentos >= MAX_INTENTOS ? "fallido" : "pendiente",
      })
      .eq("id", ev.id);
    fallidos++;
  }

  return { enviados, fallidos, pendientes, ...(webhook.ok ? {} : { motivo: webhook.codigo }) };
}
