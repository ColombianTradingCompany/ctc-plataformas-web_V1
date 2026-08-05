import { NextResponse } from "next/server";
import { dispatchPending } from "@/lib/integraciones/dispatch";

// ── Cron · vaciar la cola de eventos salientes ───────────────────────────────
// Mismo gate que /api/cron/market-anchors: CRON_SECRET, y 503 si falta.
// Corre cada 15 minutos; los eventos no son urgentes por diseño — si algo tiene
// que ser inmediato, no debería pasar por esta cola.

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
    return NextResponse.json({ ok: true, ...(await dispatchPending()) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
