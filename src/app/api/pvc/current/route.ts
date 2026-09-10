import { NextResponse } from "next/server";
import { pvcVigentePublico } from "@/lib/pvc/servicio";

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
    const current = await pvcVigentePublico();
    if (!current) return NextResponse.json({ ok: false, error: "Sin edición publicada." }, { status: 404, headers: { "cache-control": "public, s-maxage=60" } });
    return NextResponse.json({ ok: true, ...current }, { headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
