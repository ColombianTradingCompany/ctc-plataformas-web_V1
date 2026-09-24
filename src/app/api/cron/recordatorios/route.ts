import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { correrRecordatorios } from "@/lib/registro/certificados";

// ── Cron semanal · los recordatorios del registro (V5.78, fase 2 del PLAN_CIRCUITO_DEL_LOTE) ──
// Lo dispara Vercel Cron los lunes 12:00 UTC (vercel.json). Hoy recuerda UNA cosa: las certificaciones
// de finca con evidencia pedida (folio 7 del owner: recordatorio semanal, cuatro veces, y luego se retira
// del Pasaporte). La regla es pura (`src/lib/registro/reglas.ts`); esto solo la corre. Cuando lleguen la
// mora del trato y demás avisos periódicos (fase 7), se suman aquí.
//
// Autenticación SIEMPRE en producción (escribe y manda correos), como los otros tres crons.
// Idempotente por diseño: cada recordatorio mueve `ultimo_recordatorio_at`, así que correrlo dos veces
// el mismo día no manda dos correos.

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
    const r = await correrRecordatorios(createServiceRoleClient());
    return NextResponse.json(r, { status: r.errores.length ? 207 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
