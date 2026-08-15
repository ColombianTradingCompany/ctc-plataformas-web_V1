import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ── Manejo de Plataformas · la capa de excepciones ───────────────────────────
// El título y la descripción de cada superficie viven escritos en su `page.tsx`
// y ahí siguen: esto es una capa de EXCEPCIONES encima, para que el owner pueda
// corregir cómo se presenta una superficie a un buscador sin un deploy. Fila
// vacía = manda el código.
//
// ⚠️ POR QUÉ VA CACHEADO Y NO SE LEE A PELO. Estas superficies son páginas de
// marketing y varias se rinden ESTÁTICAS en el build. Una consulta a la base
// dentro de `generateMetadata` las volvería dinámicas a todas —se pagaría un
// viaje a Postgres por visita para pintar dos etiquetas <meta>—, así que se lee
// a través de `unstable_cache`: el valor se calcula una vez, se guarda con la
// etiqueta `TAG_SUPERFICIES` y el guardado del panel la invalida con
// `revalidateTag`. Es la primitiva correcta en este proyecto porque el flag
// `cacheComponents` de Next 16 NO está activado (ver next.config.ts).
//
// ⚠️ Y NUNCA LANZA. Esto corre DURANTE EL BUILD: si la base no contesta, un
// throw aquí no deja una superficie sin descripción — tumba el despliegue
// entero. Ante cualquier fallo devuelve un mapa vacío, que significa
// exactamente «manda el código», que es el estado bueno de todos modos.

export const TAG_SUPERFICIES = "seo-superficies";

export type OverrideSuperficie = {
  title: string | null;
  description: string | null;
  enSitemap: boolean;
  notas: string;
};

export type MapaOverrides = Record<string, OverrideSuperficie>;

async function leerDeLaBase(): Promise<MapaOverrides> {
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("platform_surfaces")
      .select("route, title, description, en_sitemap, notas");
    if (error || !data) return {};
    const out: MapaOverrides = {};
    for (const r of data as {
      route: string;
      title: string | null;
      description: string | null;
      en_sitemap: boolean;
      notas: string | null;
    }[]) {
      out[r.route] = {
        title: r.title,
        description: r.description,
        enSitemap: r.en_sitemap,
        notas: r.notas ?? "",
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** El mapa de excepciones, cacheado hasta que el panel lo invalide. */
export const overridesDeSuperficies = unstable_cache(leerDeLaBase, ["seo-superficies-v1"], {
  tags: [TAG_SUPERFICIES],
  // Una hora de red de seguridad: el camino normal es la invalidación por
  // etiqueta al guardar, esto solo cubre el caso de que esa señal se pierda.
  revalidate: 3600,
});
