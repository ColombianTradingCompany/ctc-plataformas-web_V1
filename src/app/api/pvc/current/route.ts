import { NextResponse } from "next/server";
import { pvcProximoPublico, pvcVigentePublico } from "@/lib/pvc/servicio";

// ── El PVC vigente, público ──────────────────────────────────────────────────
// Lo que cualquier superficie (Cherry Picked, Kaffetal Regal, el tablero, Make)
// necesita del PVC sin tocar las tablas: código, valor, vigencia, escalera,
// pila y KPIs. Sale de la vista `public_pvc_current` (sin entradas ni notas).
// Público a propósito: el PVC se publica con su método; es el número que se
// pone en la bolsa.
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    // Las dos, y cada una en su sitio: `proxima` es la que ya se publicó pero
    // todavía no rige (el PVC se publica 7–8 semanas antes de su fecha
    // efectiva). Quien solo quiera el precio de hoy sigue leyendo la raíz.
    const [current, proxima] = await Promise.all([pvcVigentePublico(), pvcProximoPublico()]);
    if (!current) return NextResponse.json({ ok: false, error: "Sin edición vigente.", proxima }, { status: 404, headers: { "cache-control": "public, s-maxage=60" } });
    return NextResponse.json({ ok: true, ...current, proxima }, { headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
