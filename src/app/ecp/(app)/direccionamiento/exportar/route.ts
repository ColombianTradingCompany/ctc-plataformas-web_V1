import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { contextoComoMarkdown, nombreDeArchivo, unidadValida } from "@/lib/direccionamiento/markdown";

// ── ECP · Definición de Contexto · exportar como Markdown (TAR-122) ──────────
// `GET /ecp/direccionamiento/exportar` descarga la ficha GUARDADA como `.md`, para subirla como conocimiento a un proyecto de
// Claude Chat. `?unidad=ctcx|kr|chp|ecosistema` (lista blanca, `unidadValida`) exporta solo esa unidad con los generales y la
// memoria; cualquier otro valor es un 400, nunca «todo» en silencio.
//
// Es LECTURA de consola: la misma puerta que la página (`requireConsoleAccess("ecp")` redirige al login maestro sin sesión, y
// al selector sin el grant del ECP); un viewer también exporta. Un route handler NO hereda el layout del grupo (app), por eso la
// puerta va aquí mismo (como `ocp/(app)/borrados/[id]/json/route.ts`). El texto lo arma el módulo puro, y no lleva quién editó.
export const dynamic = "force-dynamic";

const SIN_CACHE = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };

export async function GET(request: Request) {
  await requireConsoleAccess("ecp");

  const pedida = new URL(request.url).searchParams.get("unidad");
  const unidad = unidadValida(pedida);
  if (pedida !== null && !unidad) {
    return new Response("Unidad desconocida: use ctcx, kr, chp o ecosistema, o ninguna para la ficha entera.", {
      status: 400,
      headers: { ...SIN_CACHE, "content-type": "text/plain; charset=utf-8" },
    });
  }

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("direccionamiento_context")
    .select("data, updated_at")
    .eq("scope", "record")
    .maybeSingle();
  if (error) {
    return new Response("No se pudo leer la Definición de Contexto. Inténtelo de nuevo.", {
      status: 500,
      headers: { ...SIN_CACHE, "content-type": "text/plain; charset=utf-8" },
    });
  }

  const fila = data as { data: { values?: Record<string, unknown> } | null; updated_at: string | null } | null;
  const exportadoEl = new Date().toISOString();
  const md = contextoComoMarkdown({
    values: fila?.data?.values ?? null,
    actualizadoEl: fila?.updated_at ?? null,
    exportadoEl,
    unidad,
  });

  return new Response(md, {
    headers: {
      ...SIN_CACHE,
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${nombreDeArchivo(exportadoEl, unidad)}"`,
    },
  });
}
