import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { correrRecordatorios } from "@/lib/registro/certificados";
import { correrRecordatoriosDeMora } from "@/lib/trato/moraRecordatorios";

// ── Cron semanal · los recordatorios (V5.78 certificaciones · V5.86 mora; fila «Recordatorios» del §4 del plan) ──
// Lo dispara Vercel Cron los lunes 12:00 UTC (vercel.json). Recuerda DOS cosas, y solo dos (riesgo del §7 del plan: correos
// a productores que no los pidieron): las certificaciones de finca con evidencia pedida (folio 7: semanal, cuatro veces, y
// luego se retira del Pasaporte) y el pedido del mes del trato sin envío mientras esté en mora (semanal, cuatro veces, y
// nada más: la ruptura la declara el owner — decisión 6). Las reglas son puras (`src/lib/registro/reglas.ts`,
// `src/lib/trato/mora.ts`); esto solo las corre.
//
// Autenticación SIEMPRE en producción (escribe y manda correos), como los otros tres crons.
// Idempotente por diseño: cada recordatorio mueve su `ultimo_recordatorio_*_at`, así que correrlo dos veces el mismo día
// no manda dos correos.

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
    const service = createServiceRoleClient();
    const certificaciones = await correrRecordatorios(service);
    const mora = await correrRecordatoriosDeMora(service);
    const errores = [...certificaciones.errores, ...mora.errores];
    return NextResponse.json({ ok: true, certificaciones, mora, errores }, { status: errores.length ? 207 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
