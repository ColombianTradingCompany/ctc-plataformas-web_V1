"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { MAX_TOOL_MB, type ToolClase, type ToolTier } from "@/lib/tools/catalog";

// ── ECP · Herramientas del café · el registro escribible ─────────────────────
// Todo lo que el owner puede hacer con una herramienta sin tocar el repositorio:
// subir una versión, publicarla, volver a una anterior, cambiar su reparto, su
// clase o su descripción, y archivarla.
//
// TODAS las acciones devuelven `{ok:false,error}` en vez de lanzar. No es estilo:
// un `throw` en una Server Action atada a <form action> revienta la página
// entera y en producción el mensaje va redactado (ver AGENTS.md). El único
// `throw` que queda es el de `requireActiveAdmin()`, que es una falta de
// permisos y no una rechazo de negocio.

const BUCKET = "kaffetal-media";

/** Las superficies que hay que repintar cuando algo cambia. Son las cuatro que
 *  montan un panel de herramientas más el propio tablero del ECP. */
const RUTAS = ["/ecp/herramientas", "/kaffetal-regal", "/cherry-picked-green", "/herramientas", "/directorio"];

export type ActionResult = { ok: true } | { ok: false; error: string };

function repintar() {
  for (const r of RUTAS) revalidatePath(r);
}

/** Un slug de herramienta: minúsculas, números y guiones. Es lo que va en la URL
 *  `/tools/h/<slug>`, así que no puede traer barras ni puntos — un punto abriría
 *  la puerta a que `..` se cuele en una ruta de Storage. */
function slugValido(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(s);
}

// ── Subir una versión ────────────────────────────────────────────────────────

/** Sube un HTML como versión NUEVA de una herramienta. No la publica: subir y
 *  publicar son dos gestos a propósito, para poder mirar antes de encender. */
export async function subirVersion(formData: FormData): Promise<ActionResult> {
  const adminId = await requireActiveAdmin();

  const toolId = String(formData.get("toolId") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim().slice(0, 500);
  const archivo = formData.get("archivo");

  if (!slugValido(toolId)) return { ok: false, error: "Identificador de herramienta inválido." };
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Elija un archivo .html para subir." };
  if (archivo.size > MAX_TOOL_MB * 1024 * 1024) {
    return { ok: false, error: `El archivo pesa más de ${MAX_TOOL_MB} MB. Una herramienta es un HTML autocontenido, no un video.` };
  }

  const service = createServiceRoleClient();
  const { data: tool } = await service.from("tools").select("id").eq("id", toolId).maybeSingle();
  if (!tool) return { ok: false, error: "Esa herramienta no existe en el registro." };

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const texto = buffer.toString("utf8");

  // Comprobación mínima de que es lo que dice ser. No es antivirus: es evitar
  // que un PDF renombrado a .html acabe publicado y la superficie enseñe basura.
  if (!/<html[\s>]/i.test(texto) && !/<!doctype\s+html/i.test(texto)) {
    return { ok: false, error: "El archivo no parece un documento HTML." };
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // ¿Ya existe una versión byte a byte idéntica? Volver a subir lo mismo no debe
  // ensuciar el historial con versiones gemelas.
  const { data: gemela } = await service
    .from("tool_versions")
    .select("numero")
    .eq("tool_id", toolId)
    .eq("sha256", sha256)
    .maybeSingle();
  if (gemela) return { ok: false, error: `Ese archivo es idéntico a la versión ${gemela.numero} que ya está subida.` };

  const { data: ultima } = await service
    .from("tool_versions")
    .select("numero")
    .eq("tool_id", toolId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  const numero = (ultima?.numero ?? 0) + 1;

  // Bajo `tools/…`, que NO cumple el patrón `{uid}/` de las políticas de
  // storage.objects — es decir, service-role-only, como `gvg/` y `buzon/`.
  const storagePath = `tools/${toolId}/v${numero}-${sha256.slice(0, 8)}.html`;
  const { error: upErr } = await service.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: "text/html; charset=utf-8", upsert: false });
  if (upErr) return { ok: false, error: "No se pudo guardar el archivo. Inténtelo de nuevo." };

  const { error } = await service.from("tool_versions").insert({
    tool_id: toolId,
    numero,
    origen: "subida",
    storage_path: storagePath,
    bytes: buffer.length,
    sha256,
    notas,
    subido_por: adminId,
  });
  if (error) {
    // La fila es la que manda: si no entra, el objeto huérfano se retira para no
    // dejar basura en Storage que nadie sabrá a qué pertenecía.
    await service.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: "No se pudo registrar la versión." };
  }

  await service.from("audit_log").insert({
    entity_type: "tool",
    entity_id: toolId,
    action: "version_subida",
    new_status: `v${numero}`,
    performed_by: adminId,
  });
  repintar();
  return { ok: true };
}

/** Publica una versión concreta: es a la vez «encender la nueva» y «volver a la
 *  anterior». Una sola acción para los dos gestos porque son el mismo. */
export async function publicarVersion(toolId: string, versionId: string): Promise<ActionResult> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: v } = await service
    .from("tool_versions")
    .select("id, numero, tool_id")
    .eq("id", versionId)
    .maybeSingle();
  if (!v || v.tool_id !== toolId) return { ok: false, error: "Esa versión no pertenece a esta herramienta." };

  const { error } = await service.from("tools").update({ version_publicada: versionId }).eq("id", toolId);
  if (error) {
    // El guardián de la base rechaza publicar una versión `repo` en una
    // herramienta interna: su mensaje ya explica el porqué, así que se pasa tal cual.
    return { ok: false, error: error.message };
  }

  await service.from("audit_log").insert({
    entity_type: "tool",
    entity_id: toolId,
    action: "version_publicada",
    new_status: `v${v.numero}`,
    performed_by: adminId,
  });
  repintar();
  return { ok: true };
}

// ── Ficha, reparto y clase ───────────────────────────────────────────────────

export type FichaTool = {
  nombre: string;
  descripcion: string;
  metaDescription: string;
  lang: "es" | "en";
  clase: ToolClase;
  familia: string;
  tier: ToolTier;
  kr: boolean;
  cp: boolean;
  web: boolean;
  dc: boolean;
  orden: number;
  /** ¿La versión publicada incluye /tools/ctc-bridge.js? Marca a mano del
   *  owner al publicar una versión que lo incorpore (A11): enciende el Home
   *  Menu de trabajos en la concha. */
  soportaMemoria: boolean;
};

export async function guardarFicha(toolId: string, ficha: FichaTool): Promise<ActionResult> {
  const adminId = await requireActiveAdmin();
  if (!ficha.nombre.trim()) return { ok: false, error: "La herramienta necesita un nombre." };
  if (!["interna", "compartible"].includes(ficha.clase)) return { ok: false, error: "Clase inválida." };
  if (!["default", "plus"].includes(ficha.tier)) return { ok: false, error: "Nivel inválido." };

  const service = createServiceRoleClient();
  const { error } = await service
    .from("tools")
    .update({
      nombre: ficha.nombre.trim(),
      descripcion: ficha.descripcion.trim(),
      // La descripción para buscadores es opcional; vacía se guarda como null
      // para que se distinga «no la he escrito» de «la escribí en blanco».
      meta_description: ficha.metaDescription.trim() || null,
      lang: ficha.lang,
      clase: ficha.clase,
      familia: ficha.familia.trim() || null,
      tier: ficha.tier,
      kr: ficha.kr,
      cp: ficha.cp,
      web: ficha.web,
      dc: ficha.dc,
      orden: ficha.orden,
      soporta_memoria: ficha.soportaMemoria,
    })
    .eq("id", toolId);
  if (error) return { ok: false, error: error.message };

  await service.from("audit_log").insert({
    entity_type: "tool",
    entity_id: toolId,
    action: "ficha_guardada",
    performed_by: adminId,
  });
  repintar();
  return { ok: true };
}

/** Archiva o desarchiva. Nunca borra: una herramienta retirada conserva su fila
 *  y todas sus versiones, y devolverla es quitar la fecha. */
export async function archivarTool(toolId: string, archivar: boolean): Promise<ActionResult> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { error } = await service
    .from("tools")
    .update({ archivado_at: archivar ? new Date().toISOString() : null })
    .eq("id", toolId);
  if (error) return { ok: false, error: "No se pudo actualizar la herramienta." };

  await service.from("audit_log").insert({
    entity_type: "tool",
    entity_id: toolId,
    action: archivar ? "archivada" : "restaurada",
    performed_by: adminId,
  });
  repintar();
  return { ok: true };
}

/** Da de alta una herramienta NUEVA. Nace sin versión publicada y archivada no:
 *  no se ofrece en ninguna parte hasta que se le suba y publique un archivo. */
export async function crearTool(formData: FormData): Promise<ActionResult> {
  const adminId = await requireActiveAdmin();
  const id = String(formData.get("id") ?? "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const clase = String(formData.get("clase") ?? "compartible") as ToolClase;

  if (!slugValido(id)) {
    return { ok: false, error: "El identificador va en minúsculas, con números y guiones (por ejemplo: costo-flete)." };
  }
  if (!nombre) return { ok: false, error: "La herramienta necesita un nombre." };
  if (!["interna", "compartible"].includes(clase)) return { ok: false, error: "Clase inválida." };

  const service = createServiceRoleClient();
  const { data: ya } = await service.from("tools").select("id").eq("id", id).maybeSingle();
  if (ya) return { ok: false, error: "Ya existe una herramienta con ese identificador." };

  const { error } = await service.from("tools").insert({ id, nombre, clase, orden: 100 });
  if (error) return { ok: false, error: "No se pudo crear la herramienta." };

  await service.from("audit_log").insert({
    entity_type: "tool",
    entity_id: id,
    action: "creada",
    performed_by: adminId,
  });
  repintar();
  return { ok: true };
}
