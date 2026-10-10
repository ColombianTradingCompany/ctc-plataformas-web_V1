"use server";

// ── V5.202 (owner, 2026-10-10) · CTCx APRUEBA (o retira) una foto del lote para lo público ───────────────────────────────────
// El owner: lo público debe «omitir info que haga fácil circumventar a CTCx para llegar al Productor». Las fotos B4 las sube el
// productor; antes de esta tanda salían tal cual en la cinta, la vitrina y el Dossier público (una era el primer plano de una
// cara). Decisión del nodo final: ninguna foto de la cámara del productor sale en público sin que CTCx la apruebe, una por una,
// desde la vista del lote (`FotosPublicas.tsx`). La tabla es `lot_fotos_publicas` (`docs/migraciones/2026-10-10_fotos_publicas.sql`,
// solo service role) y la leen los tres que enseñan una foto sin sesión (`lib/catalogo/fotosPublicas.ts`).
//
// CLASE: `emite` (las dos acciones). Lo que escriben lo ve CUALQUIERA sin sesión —la cinta del Catálogo Activo en siete
// superficies, `/api/catalogo/foto/…` y el Dossier público—, así que un «viewer» del OCP no las usa (regla de `niveles.ts`: la
// clase la decide quién lee lo que se escribe). Cada una deja su fila en `audit_log` (entidad `lot`).
// Nunca lanzan: devuelven `{ ok:false, error }` (van en un `<form action>` a través de `ActionForm`).

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { TABLA_FOTOS_PUBLICAS, fotosB4 } from "@/lib/catalogo/fotosPublicas";

type Resultado = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El error de una tabla que todavía no existe (la migración no se aplicó): se dice qué falta, no el mensaje crudo. */
const SIN_TABLA = "La aprobación de fotos públicas se activa al aplicar la migración docs/migraciones/2026-10-10_fotos_publicas.sql.";
const faltaLaTabla = (e: { code?: string; message?: string }) => e.code === "42P01" || e.code === "PGRST205" || /lot_fotos_publicas/.test(e.message ?? "");

/** ¿Es `assetId` una foto B4 de ESTE lote? Solo eso se aprueba: ni un archivo de otro lote ni uno cualquiera de Storage. */
async function esFotoDelLote(lotId: string, assetId: string): Promise<boolean> {
  const service = createServiceRoleClient();
  const { data } = await service.from("lots").select("datasheet->b4_files_foto").eq("id", lotId).maybeSingle();
  const b4 = fotosB4((data as { b4_files_foto?: unknown } | null)?.b4_files_foto);
  return b4.some((x) => x.toLowerCase() === assetId.toLowerCase());
}

async function dejaRastro(lotId: string, assetId: string, accion: "foto_publica_aprobada" | "foto_publica_retirada", userId: string): Promise<string | null> {
  const service = createServiceRoleClient();
  const { error } = await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: accion,
    new_status: accion === "foto_publica_aprobada" ? "publica" : "privada",
    performed_by: userId,
    notes: `Foto B4 ${assetId}`,
  });
  return error ? error.message : null;
}

function revalidar() {
  // La consola se ve al instante; la cinta y la foto pública tienen su caché de CDN (10 minutos, `/api/catalogo/foto`).
  revalidatePath("/ocp/kr");
}

/** CTCx aprueba una foto B4 del lote para lo público (la cinta, la vitrina y la portada del Dossier público). CLASE: emite. */
export async function aprobarFotoPublica(lotId: string, assetId: string): Promise<Resultado> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  if (!UUID.test(lotId) || !UUID.test(assetId)) return { ok: false, error: "Foto o lote inválidos." };
  if (!(await esFotoDelLote(lotId, assetId))) return { ok: false, error: "Esa foto no es una foto B4 de este lote (puede que el productor la haya cambiado): recargue la página." };

  const service = createServiceRoleClient();
  const { error } = await service
    .from(TABLA_FOTOS_PUBLICAS)
    .upsert({ lot_id: lotId, asset_id: assetId.toLowerCase(), aprobada_por: permiso.userId, aprobada_at: new Date().toISOString() }, { onConflict: "lot_id,asset_id" });
  if (error) return { ok: false, error: faltaLaTabla(error) ? SIN_TABLA : `No se pudo aprobar la foto: ${error.message}` };

  const rastro = await dejaRastro(lotId, assetId, "foto_publica_aprobada", permiso.userId);
  revalidar();
  // La aprobación quedó; si el rastro no, se dice (nunca se traga en silencio) y repetir es inofensivo (upsert).
  if (rastro) return { ok: false, error: `La foto quedó aprobada, pero no se pudo dejar su fila en audit_log (${rastro}). Vuelva a pulsar «Aprobar» para registrarla.` };
  return { ok: true };
}

/** CTCx retira una foto de lo público (vuelve a ser privada: la ven el productor y la consola). CLASE: emite. */
export async function retirarFotoPublica(lotId: string, assetId: string): Promise<Resultado> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  if (!UUID.test(lotId) || !UUID.test(assetId)) return { ok: false, error: "Foto o lote inválidos." };

  const service = createServiceRoleClient();
  const { error } = await service.from(TABLA_FOTOS_PUBLICAS).delete().eq("lot_id", lotId).eq("asset_id", assetId.toLowerCase());
  if (error) return { ok: false, error: faltaLaTabla(error) ? SIN_TABLA : `No se pudo retirar la foto: ${error.message}` };

  const rastro = await dejaRastro(lotId, assetId, "foto_publica_retirada", permiso.userId);
  revalidar();
  if (rastro) return { ok: false, error: `La foto ya no es pública, pero no quedó su fila en audit_log (${rastro}).` };
  return { ok: true };
}
