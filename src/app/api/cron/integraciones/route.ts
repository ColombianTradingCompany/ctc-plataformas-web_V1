import { NextResponse } from "next/server";
import { dispatchPending } from "@/lib/integraciones/dispatch";
import { limpiarError } from "@/lib/integraciones/errores";
import { barrerCertificadosVencidos } from "@/lib/directorio/sweep";
import { conLatido } from "@/lib/integraciones/latido";

// ── Cron · vaciar la cola de eventos salientes ───────────────────────────────
// Mismo gate que /api/cron/market-anchors: CRON_SECRET, y 503 si falta.
// Corre cada 10 minutos (vercel.json, desde la V6.9) y es la RED DE SEGURIDAD:
// el camino normal es `emitEvent`, que intenta enviar la fila en seguida con un
// techo de 3 s. Aquí llega lo que quedó pendiente porque Make no respondió.
//
// De paso, UNA vez al día (la vuelta que cae entre las 11:30 y las 11:39 UTC,
// la hora de siempre) barre los soportes de certificación rechazados y vencidos
// (10 días): esa tarea no necesita la nueva frecuencia.
//
// Lo que responde es un código (`url_ausente`, `excepcion:…`), nunca el texto de
// una excepción: S0, `src/lib/integraciones/errores.ts`.
//
// El latido (B6.0): cada corrida deja su fila en `latidos`; la vuelta diaria
// purga además los latidos de más de 400 días.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET sin configurar" }, { status: 503 });
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }
  }
  const ahora = new Date();
  const vueltaDiaria = ahora.getUTCHours() === 11 && ahora.getUTCMinutes() >= 30 && ahora.getUTCMinutes() < 40;
  return conLatido("/api/cron/integraciones", async () => {
    try {
      const dispatched = await dispatchPending();
      // Best-effort: un fallo del barrido no debe tumbar el vaciado de la cola.
      let directorio = { retirados: 0 };
      if (vueltaDiaria) {
        try {
          directorio = await barrerCertificadosVencidos();
        } catch {
          /* se reintenta mañana */
        }
      }
      return NextResponse.json({ ok: true, ...dispatched, directorio });
    } catch (e) {
      return NextResponse.json({ ok: false, error: limpiarError(e) }, { status: 500 });
    }
  }, { purgar: vueltaDiaria });
}
