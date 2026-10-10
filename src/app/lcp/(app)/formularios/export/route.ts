import { NextResponse } from "next/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { csvDeLeads } from "@/lib/leadForms/campos";
import { formulario } from "@/lib/leadForms/registro";
import { cargarLeads } from "@/lib/leadForms/servidor";

// ── LCP · Interfaz de Leads · exportar los leads de un formulario a CSV (V6.2) ──────────────────────────────────────────────
// `?form=scaj2026` (+ los filtros del tablero). Lectura de consola: la misma compuerta que la página (`requireConsoleAccess("lcp")`
// redirige al login si no hay sesión). UTF-8 con BOM, para que Excel lea bien los nombres en japonés.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireConsoleAccess("lcp");
  const url = new URL(request.url);
  const def = formulario(url.searchParams.get("form"));
  if (!def) return NextResponse.json({ ok: false, error: "Formulario desconocido." }, { status: 404 });
  const filas = await cargarLeads(createServiceRoleClient(), def.key, {
    tipo: url.searchParams.get("tipo"),
    estado: url.searchParams.get("estado"),
    texto: url.searchParams.get("q"),
  });
  const csv = csvDeLeads(filas);
  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${def.key}-${fecha}.csv"`,
      "cache-control": "no-store",
    },
  });
}
