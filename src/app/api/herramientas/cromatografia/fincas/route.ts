import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { contextoDeAcceso } from "@/lib/tools/toolGrants";
import { puedeAbrir } from "@/lib/tools/accesoHerramienta";

// ── Lector de Cromatografía de Suelo · las FINCAS de la cuenta ───────────────
// El owner (2026-09-12): «el mock HTML tiene referencias a fincas, lo cual deberá
// conectar con las fincas de la cuenta del productor (si viene de CP esto no
// será habilitado)».
//
// Devuelve SOLO lo que el formulario necesita para prellenar: nombre,
// departamento, municipio, altitud y parcelas. Nada de geolocalización, polígono
// EUDR ni documentos — la herramienta no pide coordenadas (kickoff §8) y esta
// ruta no debe ser un atajo para leerlas.
//
// CHERRY PICKED: `?superficie=cp` responde `disponible: false` sin consultar. La
// herramienta además lo detecta por la ruta de la concha; las dos cosas a la
// vez porque la segunda es del navegador y la primera no.
//
// V5.39: también devuelve `cuenta.nombre` (el `full_name` del perfil) para
// prellenar «Preparada por» en el informe del productor, que es opcional y se
// puede cambiar. Solo el nombre: ni correo ni documento.

const TOOL_ID = "cromatografia-suelo";

const responder = (cuerpo: Record<string, unknown>, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { "cache-control": "no-store" } });

type FilaFinca = {
  id: string;
  name: string;
  municipio: string | null;
  departamento: string | null;
  altitude_m: number | null;
  status: string;
  finca_parcelas: { id: string; name: string; position: number }[] | null;
};

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("superficie") === "cp") {
    return responder({ disponible: false, motivo: "superficie", fincas: [] });
  }

  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return responder({ disponible: false, motivo: "sin-cuenta", fincas: [] }, 401);

  const service = createServiceRoleClient();
  const { data: tool } = await service.from("tools").select("tier").eq("id", TOOL_ID).is("archivado_at", null).maybeSingle();
  if (!tool) return responder({ disponible: false, motivo: "sin-herramienta", fincas: [] }, 404);
  const veredicto = puedeAbrir(await contextoDeAcceso(), TOOL_ID, (tool as { tier: "default" | "plus" }).tier);
  if (!veredicto.abre) return responder({ disponible: false, motivo: veredicto.motivo, fincas: [] }, 403);

  // La propiedad va en la consulta: solo las fincas de ESTA cuenta.
  const [{ data, error }, { data: perfil }] = await Promise.all([
    service
      .from("fincas")
      .select("id, name, municipio, departamento, altitude_m, status, finca_parcelas(id, name, position)")
      .eq("producer_id", user.id)
      .neq("status", "rejected")
      .order("created_at", { ascending: true }),
    service.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const cuenta = { nombre: String((perfil as { full_name?: string | null } | null)?.full_name ?? "").trim() };
  if (error) {
    console.error("[cromatografia/fincas]", error.message);
    return responder({ disponible: false, motivo: "error", fincas: [], cuenta }, 500);
  }

  const fincas = ((data as FilaFinca[] | null) ?? []).map((f) => ({
    id: f.id,
    nombre: f.name,
    municipio: f.municipio,
    departamento: f.departamento,
    altitud_m: f.altitude_m,
    pendiente: f.status !== "approved",
    parcelas: (f.finca_parcelas ?? []).sort((a, b) => a.position - b.position).map((p) => ({ id: p.id, nombre: p.name })),
  }));
  return responder({ disponible: fincas.length > 0, motivo: fincas.length ? null : "sin-fincas", fincas, cuenta });
}
