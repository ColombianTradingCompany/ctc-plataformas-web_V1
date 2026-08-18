"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { SUBDOMAIN_ROUTES } from "@/lib/red/subdominios";
import { TAG_SUPERFICIES } from "@/lib/seo/superficies";
import { cargarToolsAdmin } from "@/lib/tools/toolAccess";

// ── ECP · Direccionamiento · Manejo de Plataformas ───────────────────────────
// Decisión del owner (2026-08-15): este módulo NO se crea aparte bajo IT y
// Plataforma — vive DENTRO de Direccionamiento, como tercera pestaña. Es la
// misma pregunta que las otras dos («qué dice la casa de sí misma, y con qué
// cifras»), y partirla en dos módulos garantiza dos respuestas distintas.

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Toda superficie pública, ordenada. `/` es la casa matriz y no está en el mapa
 *  de subdominios porque no es uno — se añade a mano y va primera. */
function rutasDeLaRed(): string[] {
  const rutas = [...new Set(Object.values(SUBDOMAIN_ROUTES))].filter((r) => r !== "/co-create").sort();
  return ["/", ...rutas];
}

export type FilaSuperficie = {
  route: string;
  /** El subdominio que la sirve, si tiene uno propio. */
  subdominio: string | null;
  title: string;
  description: string;
  enSitemap: boolean;
  notas: string;
};

export async function cargarSuperficies(): Promise<FilaSuperficie[]> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data } = await service.from("platform_surfaces").select("route, title, description, en_sitemap, notas");

  const porRuta = new Map(
    ((data ?? []) as { route: string; title: string | null; description: string | null; en_sitemap: boolean; notas: string | null }[]).map(
      (r) => [r.route, r]
    )
  );
  const inverso = new Map(Object.entries(SUBDOMAIN_ROUTES).map(([sub, ruta]) => [ruta, sub]));

  return rutasDeLaRed().map((route) => {
    const f = porRuta.get(route);
    return {
      route,
      subdominio: inverso.get(route) ?? null,
      title: f?.title ?? "",
      description: f?.description ?? "",
      enSitemap: f?.en_sitemap ?? true,
      notas: f?.notas ?? "",
    };
  });
}

export async function guardarSuperficie(fila: FilaSuperficie): Promise<ActionResult> {
  const adminId = await requireActiveAdmin();
  if (!rutasDeLaRed().includes(fila.route)) return { ok: false, error: "Esa superficie no existe en el mapa de la red." };

  const service = createServiceRoleClient();
  const { error } = await service.from("platform_surfaces").upsert(
    {
      route: fila.route,
      // Vacío se guarda como null: «devuélvele el mando al código», que no es lo
      // mismo que «déjala sin título».
      title: fila.title.trim() || null,
      description: fila.description.trim() || null,
      en_sitemap: fila.enSitemap,
      notas: fila.notas.trim(),
      actualizado_at: new Date().toISOString(),
      actualizado_por: adminId,
    },
    { onConflict: "route" }
  );
  if (error) return { ok: false, error: "No se pudo guardar la superficie." };

  await service.from("audit_log").insert({
    entity_type: "platform_surface",
    entity_id: adminId,
    action: "superficie_guardada",
    new_status: fila.route,
    performed_by: adminId,
  });

  // El mapa de excepciones va cacheado con esta etiqueta (lib/seo/superficies.ts):
  // sin esto el cambio no se vería hasta que caducara la hora de red de seguridad.
  //
  // ⚠️ DOS ARGUMENTOS. En este Next `revalidateTag(tag)` a secas está DEPRECADA y
  // no compila; la firma es `(tag, profile)`. Con `"max"` la entrada se marca
  // rancia y se sirve mientras se regenera por detrás — la superficie pública
  // puede enseñar el texto anterior UNA petición más. No es un problema aquí: el
  // panel no lee por esta caché (`cargarSuperficies` va directo a la base), así
  // que quien acaba de guardar siempre se ve a sí mismo.
  revalidateTag(TAG_SUPERFICIES, "max");
  revalidatePath("/ecp/plataformas");
  revalidatePath(fila.route);
  return { ok: true };
}

// ── El inventario que motivó el módulo ───────────────────────────────────────
// «De los 12 tools indexables solo DOS llevan meta description» fue el dato que
// abrió el tema. Aquí se ve entero y en un solo sitio.

export type FilaHerramienta = {
  id: string;
  nombre: string;
  metaDescription: string | null;
  /** `repo` = su HTML vive en public/tools/ y su <title> está DENTRO del
   *  archivo: se corrige editando el fichero, no desde aquí. */
  origen: "repo" | "subida" | null;
  srcPublico: string | null;
  indexable: boolean;
};

export async function cargarHerramientasSeo(): Promise<FilaHerramienta[]> {
  await requireActiveAdmin();
  const tools = await cargarToolsAdmin();
  return tools
    .filter((t) => !t.archivada)
    .map((t) => {
      const v = t.versiones.find((x) => x.id === t.versionPublicadaId) ?? null;
      return {
        id: t.id,
        nombre: t.nombre,
        metaDescription: t.metaDescription,
        origen: v?.origen ?? null,
        srcPublico: v?.srcPublico ?? null,
        // Solo las del repositorio son URL pública indexable. Las subidas se
        // sirven por route handler con X-Robots-Tag: noindex, y las internas
        // ni siquiera se entregan sin sesión.
        indexable: v?.origen === "repo" && t.clase === "compartible",
      };
    });
}
