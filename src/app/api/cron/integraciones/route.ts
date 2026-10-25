import { NextResponse } from "next/server";
import { dispatchPending } from "@/lib/integraciones/dispatch";
import { limpiarError } from "@/lib/integraciones/errores";
import { barrerCertificadosVencidos } from "@/lib/directorio/sweep";

// ── Cron · vaciar la cola de eventos salientes ───────────────────────────────
// Mismo gate que /api/cron/market-anchors: CRON_SECRET, y 503 si falta.
// Corre una vez al día (11:35 UTC, vercel.json) y es la RED DE SEGURIDAD: el
// camino normal es `emitEvent`, que despacha en seguida con `after()`. Aquí
// solo llega lo que quedó pendiente porque Make no respondió en su momento.
//
// De paso barre los soportes de certificación rechazados y vencidos (10 días),
// para no añadir otro cron por una tarea de una línea.
//
// Lo que responde es un código (`url_ausente`, `excepcion:…`), nunca el texto de
// una excepción: S0, `src/lib/integraciones/errores.ts`.

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
  try {
    const dispatched = await dispatchPending();
    // Best-effort: un fallo del barrido no debe tumbar el vaciado de la cola.
    let directorio = { retirados: 0 };
    try {
      directorio = await barrerCertificadosVencidos();
    } catch {
      /* se reintenta en la próxima corrida */
    }
    return NextResponse.json({ ok: true, ...dispatched, directorio });
  } catch (e) {
    return NextResponse.json({ ok: false, error: limpiarError(e) }, { status: 500 });
  }
}
