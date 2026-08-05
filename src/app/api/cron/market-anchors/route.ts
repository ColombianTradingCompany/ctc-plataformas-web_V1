import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchFncPrice } from "@/lib/anclas/fnc";

// ── Cron diario · el precio de la FNC ────────────────────────────────────────
// Lo dispara Vercel Cron (ver vercel.json, 11:10 UTC ≈ 06:10 en Colombia, ya
// publicado el precio del día). Es el mismo camino que el botón «Consultar
// ahora» del módulo, con el gate cambiado: no hay sesión, hay secreto.
//
// Se pide autenticación SIEMPRE en producción: la ruta escribe en la base y una
// url pública que inserta filas es una invitación. Vercel manda
// `Authorization: Bearer $CRON_SECRET` cuando la variable existe.
//
// Idempotente por diseño: `market_anchors` tiene único (kind, as_of), así que
// dispararlo dos veces el mismo día corrige la fila, no la duplica.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret) {
      // Sin secreto configurado no se abre: mejor que el cron falle a que la
      // ruta quede abierta a cualquiera.
      return NextResponse.json({ ok: false, error: "CRON_SECRET sin configurar" }, { status: 503 });
    }
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const reading = await fetchFncPrice(AbortSignal.timeout(25_000));
    if (!reading) {
      // No se anota nada: una lectura que no se reconoce no es un precio.
      return NextResponse.json({ ok: false, skipped: "sin precio reconocible" }, { status: 200 });
    }

    const service = createServiceRoleClient();
    const { error } = await service.from("market_anchors").upsert(
      {
        kind: "fnc_carga",
        as_of: reading.asOf,
        value: reading.value,
        unit: "COP/carga",
        source: "fnc",
        source_url: reading.sourceUrl,
        automatic: true,
      },
      { onConflict: "kind,as_of" }
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, asOf: reading.asOf, value: reading.value });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
