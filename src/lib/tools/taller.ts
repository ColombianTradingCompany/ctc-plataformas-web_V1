"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { srcDeVersion } from "./catalog";
import { contextoDeAcceso } from "./toolGrants";
import { esMiembroHC, puedeAbrir, type Veredicto } from "./accesoHerramienta";

// ── El TALLER de Herramientas del Café (A8/A9, 2026-08-19) ───────────────────
// La vista de trabajo de herramientas.ctcexport.com: TODO el catálogo
// compartible con versión publicada, cada herramienta con su veredicto. La
// decisión A9 del owner manda aquí: una Plus bloqueada SE LISTA, con su candado
// y su «Solicitar» — esconderla «vaciaba de sentido tener herramientas visibles
// pero bloqueadas para crear deseo».
//
// ⚠️ El taller NO filtra por la columna `web`. Es la CASA de las herramientas:
// ofrece el catálogo entero, y el reparto por superficie sigue gobernando lo
// que KR, CP y el DC embeben en SUS paneles. Lo que sí se respeta a rajatabla:
// `interna` no sale de la base (va en la consulta) y `archivada` tampoco.

export type HerramientaTaller = {
  id: string;
  nombre: string;
  descripcion: string;
  lang: "es" | "en";
  esPlus: boolean;
  soportaMemoria: boolean;
  veredicto: Veredicto;
  /** Trabajos guardados del usuario en ESTA herramienta (V5.7, para el
   *  reverso de la carátula). 0 sin sesión. */
  trabajos: number;
};

export type Taller = {
  autenticado: boolean;
  esMiembro: boolean;
  /** El correo de la sesión, para la barra («quién está dentro»). */
  email: string | null;
  herramientas: HerramientaTaller[];
};

export async function cargarTaller(): Promise<Taller> {
  const service = createServiceRoleClient();

  let email: string | null = null;
  let userId: string | null = null;
  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    email = user?.email ?? null;
    userId = user?.id ?? null;
  } catch {
    // Sin sesión legible, la barra simplemente no enseña correo.
  }

  const [ctx, { data: filas }] = await Promise.all([
    contextoDeAcceso(),
    service
      .from("tools")
      .select("id, nombre, descripcion, lang, tier, orden, version_publicada, soporta_memoria")
      .eq("clase", "compartible")
      .is("archivado_at", null)
      .order("orden"),
  ]);

  const tools = (filas ?? []) as {
    id: string;
    nombre: string;
    descripcion: string;
    lang: "es" | "en";
    tier: "default" | "plus";
    version_publicada: string | null;
    soporta_memoria: boolean;
  }[];

  // Los trabajos del usuario, contados de una pasada (para el reverso de las
  // carátulas). Las filas son pocas por diseño (techo de 40 por herramienta).
  const porHerramienta = new Map<string, number>();
  if (userId) {
    const { data: filasTrabajos } = await service
      .from("tool_sessions")
      .select("tool_id")
      .eq("user_id", userId);
    for (const f of (filasTrabajos as { tool_id: string }[] | null) ?? [])
      porHerramienta.set(f.tool_id, (porHerramienta.get(f.tool_id) ?? 0) + 1);
  }

  const publicadas = tools.map((t) => t.version_publicada).filter((x): x is string => !!x);
  const { data: vs } = publicadas.length
    ? await service.from("tool_versions").select("id, origen, src_publico").in("id", publicadas)
    : { data: [] };
  const versionPorId = new Map(
    ((vs ?? []) as { id: string; origen: "repo" | "subida"; src_publico: string | null }[]).map((v) => [
      v.id,
      { id: v.id, origen: v.origen, srcPublico: v.src_publico },
    ])
  );

  const herramientas: HerramientaTaller[] = [];
  for (const t of tools) {
    const version = t.version_publicada ? versionPorId.get(t.version_publicada) ?? null : null;
    // Sin versión publicada no hay nada que abrir NI que anunciar.
    if (!srcDeVersion(t.id, version as never)) continue;
    herramientas.push({
      id: t.id,
      nombre: t.nombre,
      descripcion: t.descripcion,
      lang: t.lang,
      esPlus: t.tier === "plus",
      soportaMemoria: t.soporta_memoria,
      veredicto: puedeAbrir(ctx, t.id, t.tier),
      trabajos: porHerramienta.get(t.id) ?? 0,
    });
  }

  return { autenticado: ctx.autenticado, esMiembro: esMiembroHC(ctx), email, herramientas };
}
