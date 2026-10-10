import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { correrSeguimientos } from "@/lib/leadForms/envios";

// ── Cron horario · los seguimientos de la Interfaz de Leads (V6.2) ──────────────────────────────────────────────────────────
// Lo dispara Vercel Cron cada hora (vercel.json, minuto 5). Manda el seguimiento de cada lead de feria cuyo `followup_due_at` ya
// pasó —exactamente N días después del envío, a la misma hora, con la granularidad de la hora— SOLO en los formularios cuyo
// interruptor `seguimiento` esté encendido en la LCP, y nunca a quien se dio de baja o ya respondió al primer correo (el Buzón).
// Idempotente: cada envío mueve `followup_sent_at`. Autenticación siempre en producción, como los demás crons.
// Para probar sin esperar siete días: la LCP tiene «Enviar el seguimiento ahora» por lead.

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
    const barrido = await correrSeguimientos(createServiceRoleClient());
    return NextResponse.json({ ok: true, ...barrido }, { status: barrido.errores.length ? 207 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
