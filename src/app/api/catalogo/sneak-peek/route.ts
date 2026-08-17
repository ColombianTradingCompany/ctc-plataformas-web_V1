import { NextResponse } from "next/server";
import { getSneakPeekPayload } from "@/lib/catalogo/sneakPeek";

// ── El vistazo al Catálogo Activo ────────────────────────────────────────────
// Pública a propósito, y sin nada comercial dentro: solo las columnas de
// exhibición de la vista `public_lot_catalog` (nombre, grado, puntaje, finca,
// municipio, altitud, variedad, proceso, notas). Ni precios, ni MOQ, ni kilos —
// eso vive detrás del login de Cherry Picked. Ver `lib/catalogo/sneakPeek.ts`.
//
// Mismo montaje que la cinta de mercado de Home (`api/home/ticker`): la ruta no
// se congela en el build (`force-dynamic`) y encima va una cabecera de caché
// para que el CDN sirva la misma respuesta un cuarto de hora. Así la portada
// sigue siendo estática y la cinta se refresca sola sin volver a construir el
// sitio: un lote que se publica aparece solo, sin desplegar.
//
// Sin cookies y sin sesión: `getSneakPeekPayload` usa el cliente anónimo.

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    const payload = await getSneakPeekPayload();
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch (e) {
    // La cinta es un vistazo: si algo se rompe, devuelve vacío y el componente
    // no pinta nada. Una portada nunca se cae por un adorno informativo.
    return NextResponse.json(
      { lots: [], source: "mock", generatedAt: new Date().toISOString(), error: (e as Error).message },
      { status: 200 }
    );
  }
}
