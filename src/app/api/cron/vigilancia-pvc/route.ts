import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hoyEnColombia } from "@/lib/pvc/servicio";
import { correrVigilancia } from "@/lib/pvc/vigilancia";

// ── Cron diario · la vigilancia de la corrección del PVC (V5.178 · docs/PLAN_CICLOS.md §6) ─────────────────────────────────────────
// Corre a las 11:25 UTC (vercel.json), después de que `/api/cron/market-anchors` (11:10) guarde la lectura FNC del día: mide el
// ciclo en curso contra el PVC vigente (y contra el siguiente, en el ciclo 2), propone la corrección que se cumpla —una por
// ciclo y por PVC—, avisa por correo y vence lo que nadie resolvió. La regla vive en `src/lib/pvc/{correccion,vigilancia}.ts`.
// Autenticación SIEMPRE en producción (escribe y manda correos), como los otros crons. Idempotente.

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
    const r = await correrVigilancia(createServiceRoleClient(), hoyEnColombia());
    return NextResponse.json(r, { status: r.errores.length ? 207 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
