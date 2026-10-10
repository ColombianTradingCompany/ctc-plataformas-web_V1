import { NextResponse } from "next/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cargarLead, urlFirmadaDeTarjeta } from "@/lib/leadForms/servidor";

// ── LCP · Interfaz de Leads · la foto de la tarjeta de un lead (V6.2) ───────────────────────────────────────────────────────
// `?lead=<id>` → 302 a una URL firmada de diez minutos del bucket privado. Solo con sesión de consola de la LCP: el bucket no se
// lee de otra forma. Se pide a demanda (al abrir el lead), no al pintar la tabla: una firma por foto que alguien mira.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireConsoleAccess("lcp");
  const id = new URL(request.url).searchParams.get("lead") ?? "";
  const service = createServiceRoleClient();
  const lead = await cargarLead(service, id);
  if (!lead?.card_photo_path) return NextResponse.json({ ok: false, error: "Sin foto." }, { status: 404 });
  const url = await urlFirmadaDeTarjeta(service, lead.card_photo_path);
  if (!url) return NextResponse.json({ ok: false, error: "No se pudo firmar la foto." }, { status: 500 });
  return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "no-store" } });
}
