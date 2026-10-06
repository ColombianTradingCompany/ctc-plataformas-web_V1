import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hoyEnColombia } from "@/lib/pvc/servicio";
import { correrRedeclaraciones } from "@/lib/trato/redeclaracion";

// ── Cron diario · la redeclaración de «Ahora y Siguiente» (V5.171, owner 2026-10-06: «la opción 1, que quede en el 70 %») ──
// Lo dispara Vercel Cron cada día a las 11:20 UTC (≈ 06:20 en Colombia; vercel.json). Hace dos cosas y solo dos: el día en que
// se abre la redeclaración se la PIDE al productor (nota y correo), y pasado el primer día de la siguiente Temporada Trimestral
// sin respuesta la deja en el mínimo (el 70 %, nunca menos del mínimo del grado), con su enmienda y su fila de auditoría. La
// regla es pura (`estadoDeRedeclaracion` en `src/lib/trato/modalidades.ts`); esto solo la corre.
//
// Autenticación SIEMPRE en producción (escribe y manda correos), como los otros crons.
// Idempotente: `redeclarar_aviso_at` y `redeclarado_at` marcan lo hecho; correrlo dos veces el mismo día no repite nada.

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
    const r = await correrRedeclaraciones(createServiceRoleClient(), hoyEnColombia());
    return NextResponse.json(r, { status: r.errores.length ? 207 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
