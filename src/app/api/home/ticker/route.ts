import { NextResponse } from "next/server";
import { getTickerPayload } from "@/lib/market/ticker";

// ── La cinta de mercado de CTC Home ──────────────────────────────────────────
// Pública a propósito: solo devuelve referencias de bolsa, divisas, el precio
// interno de la Federación y titulares de medios abiertos. Nada de CTC.
//
// `force-dynamic` para que la ruta NO se congele en el build; el gasto de
// verdad —las llamadas a Yahoo y a los feeds— ya lo amortigua la caché de datos
// de Next dentro de `getTickerPayload`. Encima va una cabecera de caché para que
// el CDN sirva la misma respuesta durante cinco minutos.

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
  try {
    const payload = await getTickerPayload();
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=1800" },
    });
  } catch (e) {
    // La cinta es adorno informativo: si falla, la página no se entera.
    return NextResponse.json(
      { quotes: [], news: [], generatedAt: new Date().toISOString(), error: (e as Error).message },
      { status: 200 }
    );
  }
}
