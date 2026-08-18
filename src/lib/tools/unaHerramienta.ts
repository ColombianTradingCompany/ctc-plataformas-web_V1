"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { srcDeVersion } from "./catalog";
import { contextoDeAcceso } from "./toolGrants";
import { puedeAbrir, type Veredicto } from "./accesoHerramienta";
import { type SuperficieHerramientas } from "./volverSeguro";

// ── Una sola herramienta, resuelta para la concha (V4.34) ───────────────────
// `loadToolAccess()` devuelve la LISTA de una superficie; la concha necesita
// UNA, con su veredicto de acceso. Se resuelve aquí y no en la página para que
// las dos superficies —KR y Cherry Picked— compartan exactamente la misma regla:
// dos copias habrían divergido, y divergir en una compuerta significa que una
// de las dos abre lo que la otra cierra.

export type HerramientaResuelta = {
  id: string;
  nombre: string;
  descripcion: string;
  esPlus: boolean;
  /** URL del iframe, ya resuelta. `null` si no hay versión publicada. */
  src: string | null;
  veredicto: Veredicto;
};

/** El campo de `tools` que dice si la herramienta se ofrece en esa superficie. */
const COLUMNA: Record<SuperficieHerramientas, "kr" | "cp"> = {
  "kaffetal-regal": "kr",
  "cherry-picked-green": "cp",
};

export async function resolverHerramienta(
  superficie: SuperficieHerramientas,
  slug: string
): Promise<HerramientaResuelta | null> {
  const service = createServiceRoleClient();

  // `clase = compartible` y el filtro por superficie van en la CONSULTA, no en
  // el render: una herramienta interna no debe salir de la base hacia una
  // superficie pública ni para decir que existe. Misma regla que la lista.
  const { data: t } = await service
    .from("tools")
    .select("id, nombre, descripcion, tier, version_publicada, clase, archivado_at, kr, cp")
    .eq("id", slug)
    .eq("clase", "compartible")
    .is("archivado_at", null)
    .eq(COLUMNA[superficie], true)
    .maybeSingle();
  if (!t) return null;

  const fila = t as {
    id: string;
    nombre: string;
    descripcion: string;
    tier: "default" | "plus";
    version_publicada: string | null;
  };

  const { data: v } = fila.version_publicada
    ? await service
        .from("tool_versions")
        .select("id, tool_id, numero, origen, src_publico, storage_path, bytes, notas, subido_at, subido_por")
        .eq("id", fila.version_publicada)
        .maybeSingle()
    : { data: null };

  const version = v
    ? {
        id: (v as { id: string }).id,
        origen: (v as { origen: "repo" | "subida" }).origen,
        srcPublico: (v as { src_publico: string | null }).src_publico,
      }
    : null;

  const ctx = await contextoDeAcceso();

  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    esPlus: fila.tier === "plus",
    src: srcDeVersion(fila.id, version as never),
    veredicto: puedeAbrir(ctx, fila.id, fila.tier),
  };
}
