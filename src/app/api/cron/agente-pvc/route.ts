import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hoyEnColombia } from "@/lib/pvc/servicio";
import { correrAgente } from "@/lib/pvc/agente";

// ── Cron diario · el agente de la edición siguiente del PVC (V5.179 · docs/PLAN_CICLOS.md §6) ─────────────────────────────────────
// 11:40 UTC (vercel.json), después de la lectura FNC (11:10) y de la vigilancia (11:25). Desde la semana 1 del ciclo 2 deja el
// borrador de la edición siguiente si no existe (una vez: después solo recuerda el plazo, 3 días antes y al vencer). Gasta IA una
// vez por trimestre (el informe, `pvc:agente` en el libro). La regla vive en `src/lib/pvc/agente.ts`; esto solo la corre.
// Autenticación SIEMPRE en producción, como los otros crons. Idempotente.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET sin configurar" }, { status: 503 });
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }
  }
  try {
    return NextResponse.json(await correrAgente(createServiceRoleClient(), hoyEnColombia()));
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
