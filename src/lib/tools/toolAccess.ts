"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { tienePlusActivo } from "./plusGrants";
import {
  seOfreceEn,
  srcDeVersion,
  type ToolAdmin,
  type ToolPublico,
  type ToolSurface,
  type ToolVersion,
} from "./catalog";

// ── Acceso a las herramientas embebidas ──────────────────────────────────────
// El reparto por superficie, el nivel (Default/Plus) y ahora también la CLASE y
// la VERSIÓN PUBLICADA viven en la tabla `tools` — service-role-only, así que
// NADA de esto se resuelve en el cliente: la superficie pide su lista con una
// server action y recibe ya filtrada la que le corresponde a ESE usuario, con el
// `src` del iframe ya resuelto.
//
// (2026-08-15) Antes esto leía `platform_settings.tools_config`. Esa clave se
// quedó en la base como respaldo histórico de lo que había el día de la
// migración, pero YA NO SE LEE NI SE ESCRIBE: si alguien la edita a mano no pasa
// nada, y por eso no debe usarse para diagnosticar.
//
// QUÉ DA EL NIVEL "PLUS" (regla del owner, 2026-08-02): una ACTIVACIÓN
// explícita en tools_plus_grants — el productor, el comprador o el experto del
// DC la solicita desde su plataforma y el ECP la aprueba o rechaza (a futuro,
// con pago). Ver src/lib/tools/plusGrants.ts.

type FilaTool = {
  id: string;
  nombre: string;
  descripcion: string;
  lang: "es" | "en";
  clase: "interna" | "compartible";
  familia: string | null;
  kr: boolean;
  cp: boolean;
  web: boolean;
  dc: boolean;
  tier: "default" | "plus";
  orden: number;
  meta_description: string | null;
  archivado_at: string | null;
  version_publicada: string | null;
  soporta_memoria: boolean;
  guia: string | null;
};

type FilaVersion = {
  id: string;
  tool_id: string;
  numero: number;
  origen: "repo" | "subida";
  src_publico: string | null;
  storage_path: string | null;
  bytes: number | null;
  notas: string;
  subido_at: string;
  subido_por: string | null;
};

const COLS_TOOL =
  "id, nombre, descripcion, lang, clase, familia, kr, cp, web, dc, tier, orden, meta_description, archivado_at, version_publicada, soporta_memoria, guia";
const COLS_VERSION = "id, tool_id, numero, origen, src_publico, storage_path, bytes, notas, subido_at, subido_por";

function aVersion(v: FilaVersion): ToolVersion {
  return {
    id: v.id,
    numero: v.numero,
    origen: v.origen,
    srcPublico: v.src_publico,
    storagePath: v.storage_path,
    bytes: v.bytes,
    notas: v.notas ?? "",
    subidoAt: v.subido_at,
    subidoPor: v.subido_por,
  };
}

export type ToolAccess = {
  /** Las herramientas que este usuario puede abrir en esta superficie, ya
   *  resueltas (nombre, descripción y `src` del iframe). */
  tools: ToolPublico[];
  /** ¿Tiene el nivel Plus? (para explicar lo que le falta, no para ocultar) */
  isPlus: boolean;
  /** Cuántas herramientas Plus existen en la superficie y no está viendo. */
  lockedCount: number;
};

/**
 * La lista que le toca al usuario actual en una superficie. Sin sesión devuelve
 * solo las Default: las páginas públicas de KR/CP también muestran herramientas.
 */
export async function loadToolAccess(surface: ToolSurface): Promise<ToolAccess> {
  const service = createServiceRoleClient();

  // Plus por ACTIVACIÓN: kr→producer, cp→buyer, dc→dc; la superficie web acepta
  // cualquier activación (la cookie compartida la reconoce sola).
  let isPlus = false;
  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (user) {
      const audiencia = surface === "kr" ? "producer" : surface === "cp" ? "buyer" : surface === "dc" ? "dc" : undefined;
      isPlus = await tienePlusActivo(user.id, audiencia);
    }
  } catch {
    // Sin sesión válida se queda en Default — nunca es motivo para romper la página.
  }

  // Una `interna` ni siquiera sale de la base hacia una superficie: el filtro va
  // en la consulta, no solo en el render.
  const { data: filas } = await service
    .from("tools")
    .select(COLS_TOOL)
    .eq("clase", "compartible")
    .is("archivado_at", null)
    .eq(surface, true)
    .order("orden");

  const tools = (filas ?? []) as FilaTool[];
  if (!tools.length) return { tools: [], isPlus, lockedCount: 0 };

  const publicadas = tools.map((t) => t.version_publicada).filter((x): x is string => !!x);
  const { data: vs } = publicadas.length
    ? await service.from("tool_versions").select(COLS_VERSION).in("id", publicadas)
    : { data: [] };
  const porId = new Map(((vs ?? []) as FilaVersion[]).map((v) => [v.id, aVersion(v)]));

  const visibles: ToolPublico[] = [];
  let lockedCount = 0;

  for (const t of tools) {
    const version = t.version_publicada ? porId.get(t.version_publicada) ?? null : null;
    const src = srcDeVersion(t.id, version);
    // Una herramienta SIN versión publicada no se ofrece: no hay nada que abrir.
    // Tampoco cuenta como "bloqueada" — no es que le falte nivel al usuario.
    if (!src) continue;

    if (!seOfreceEn({ ...t, archivada: false }, surface, isPlus)) {
      if (t.tier === "plus") lockedCount += 1;
      continue;
    }
    visibles.push({
      id: t.id,
      nombre: t.nombre,
      descripcion: t.descripcion,
      lang: t.lang,
      src,
      familia: t.familia,
    });
  }

  return { tools: visibles, isPlus, lockedCount };
}

/** El registro COMPLETO con todo su historial — solo para la consola interna.
 *  Lo consume el tablero del ECP; el gate lo pone quien lo llama. */
export async function cargarToolsAdmin(): Promise<ToolAdmin[]> {
  const service = createServiceRoleClient();
  const [{ data: filas }, { data: vs }] = await Promise.all([
    service.from("tools").select(COLS_TOOL).order("orden"),
    service.from("tool_versions").select(COLS_VERSION).order("numero", { ascending: false }),
  ]);

  const versionesPorTool = new Map<string, ToolVersion[]>();
  for (const v of (vs ?? []) as FilaVersion[]) {
    const lista = versionesPorTool.get(v.tool_id) ?? [];
    lista.push(aVersion(v));
    versionesPorTool.set(v.tool_id, lista);
  }

  return ((filas ?? []) as FilaTool[]).map((t) => {
    const versiones = versionesPorTool.get(t.id) ?? [];
    const publicada = versiones.find((v) => v.id === t.version_publicada) ?? null;
    return {
      id: t.id,
      nombre: t.nombre,
      descripcion: t.descripcion,
      lang: t.lang,
      src: srcDeVersion(t.id, publicada) ?? "",
      familia: t.familia,
      clase: t.clase,
      tier: t.tier,
      kr: t.kr,
      cp: t.cp,
      web: t.web,
      dc: t.dc,
      orden: t.orden,
      metaDescription: t.meta_description,
      archivada: t.archivado_at !== null,
      soportaMemoria: t.soporta_memoria,
      guia: t.guia,
      versionPublicadaId: t.version_publicada,
      versiones,
    };
  });
}
