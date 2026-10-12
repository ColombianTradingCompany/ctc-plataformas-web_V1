import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { configDe, formulario, type FormularioDeLaBase } from "@/lib/leadForms/registro";
import { cargarLead } from "@/lib/leadForms/servidor";
import { testigoDeLeadValido } from "@/lib/leadForms/sello";
import { pdfDeConfirmacion } from "@/lib/leadForms/pdf";
import { lotesDeInteres } from "@/lib/leadForms/vitrina";

// ── /scaj2026/confirmacion · el PDF de confirmación del registro (V6.4) ──────────────────────────────────────────────────────
// `?id=<lead>&t=<testigo>` → el PDF (A4, una página o dos; V6.5: con «Tus respuestas» y «Qué sigue» a la medida) con la confirmación arriba (SCAJ 2026, el código del registro, fecha y hora de
// Japón, nombre, empresa, correo), qué sigue, CTCx en pocas líneas, las plataformas y las redes con enlaces clicables, y la línea
// legal. Se descarga desde la pantalla de gracias, desde el correo y desde la consola. Sin testigo válido, 404 (no se confirma ni que
// el lead exista). `Content-Disposition: attachment` para que el celular lo guarde en vez de abrirlo en la pestaña.

export const dynamic = "force-dynamic";

const CLAVE = "scaj2026";

export async function GET(request: Request) {
  const def = formulario(CLAVE)!;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const t = url.searchParams.get("t");
  if (!testigoDeLeadValido(id, t)) return NextResponse.json({ ok: false }, { status: 404 });
  const service = createServiceRoleClient();
  const lead = await cargarLead(service, id);
  if (!lead || lead.form_key !== def.key) return NextResponse.json({ ok: false }, { status: 404 });
  const { data } = await service.from("lead_forms").select("config").eq("key", def.key).maybeSingle();
  const config = configDe((data as Pick<FormularioDeLaBase, "config"> | null)?.config);
  try {
    const pdf = await pdfDeConfirmacion(lead, { formKey: def.key, ruta: def.ruta, privacyUrl: config.privacy_url || `${def.ruta}/privacidad`, lotes: await lotesDeInteres(lead) });
    return new NextResponse(Buffer.from(pdf.bytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${pdf.nombreDeArchivo}"`,
        "cache-control": "private, no-store",
        "content-language": pdf.lang,
      },
    });
  } catch (e) {
    console.error("[leads-evento] pdf", (e as Error).message);
    return NextResponse.json({ ok: false, error: "No se pudo generar el PDF." }, { status: 500 });
  }
}
