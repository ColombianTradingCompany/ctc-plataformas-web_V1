import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { correrRecordatorios } from "@/lib/registro/certificados";
import { correrRecordatoriosDeMora } from "@/lib/trato/moraRecordatorios";
import { correrBarridoDeInactividad } from "@/lib/inactividad/barrido";

// ── Cron semanal · los recordatorios (V5.78 certificaciones · V5.86 mora · V5.103 inactividad; fila «Recordatorios» del §4 del plan) ──
// Lo dispara Vercel Cron los lunes 12:00 UTC (vercel.json). Recuerda TRES cosas, y solo tres (riesgo del §7 del plan: correos
// a productores que no los pidieron): las certificaciones de finca con evidencia pedida (folio 7: semanal, cuatro veces, y
// luego se retira del Pasaporte), el pedido del mes del trato sin envío mientras esté en mora (semanal, cuatro veces, y
// nada más: la ruptura la declara el owner — decisión 6) y, desde la V5.103 (owner, 2026-09-30), la cuenta «Marchitando» sin
// finca ni lote: un recordatorio, un mes después el aviso, un mes después se borra sola (nunca las protegidas, las de prueba
// ni las que lleva CTCx). Las reglas son puras (`src/lib/registro/reglas.ts`, `src/lib/trato/mora.ts`,
// `src/lib/inactividad/reglas.ts`); esto solo las corre.
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
    const inactividad = await correrBarridoDeInactividad(service);
    const errores = [...certificaciones.errores, ...mora.errores, ...inactividad.errores];
    return NextResponse.json({ ok: true, certificaciones, mora, inactividad, errores }, { status: errores.length ? 207 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
