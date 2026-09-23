import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { actualizarCombustible } from "@/lib/courier/eia";

// ── Cron semanal · el recargo de combustible de FedEx ────────────────────────────────────────────────
// Lo dispara Vercel Cron los jueves 13:30 UTC (vercel.json): la EIA publica los miércoles el precio de la
// semana que cerró el viernes anterior, y ese precio rige desde el lunes siguiente — así que el jueves ya
// se sabe el recargo de la semana que viene (FedEx lo anuncia el viernes). Deriva el % en vez de leerlo
// de fedex.com porque fedex.com no le responde a un servidor: ver `src/lib/courier/combustible.ts`.
//
// Autenticación SIEMPRE en producción (escribe en la base), como `/api/cron/market-anchors`.
// Idempotente: único (transportista, concepto, vigente_desde); y nunca pisa un valor anotado a mano.

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
    const r = await actualizarCombustible(createServiceRoleClient(), AbortSignal.timeout(25_000));
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
