import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hoyEnColombia } from "@/lib/pvc/servicio";
import { correrRenovaciones } from "@/lib/trato/renovaciones";

// ── Cron diario · las ventanas de Cherry Picked (V5.176 · docs/PLAN_CICLOS.md §5) ─────────────────────────────────────────────────
// Reemplaza `/api/cron/redeclaraciones` (la redeclaración de la V5.171, que ningún contrato usó). Lo dispara Vercel Cron cada día a
// las 11:20 UTC (≈ 06:20 en Colombia; vercel.json): recuerda una vez la renovación que vence en 7 días, expira las invitaciones
// vencidas y cierra las ventanas cumplidas. La regla vive en `src/lib/trato/renovaciones.ts`; esto solo la corre.
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
    const r = await correrRenovaciones(createServiceRoleClient(), hoyEnColombia());
    return NextResponse.json(r, { status: r.errores.length ? 207 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
