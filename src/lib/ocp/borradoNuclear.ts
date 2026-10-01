import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { avisoAlProductor, type InventarioNuclear, type TipoNuclear } from "./borradoNuclearTexto";

// ── El borrado nuclear, del lado del servidor (V5.134, owner 2026-10-01) ─────────────────────────────────────────────
// Tres pasos, en este orden y sin atajos:
//   1. LA BASE borra, en UNA transacción (`nuclear_borrar`): guarda la instantánea en `borrados_nucleares` y borra el lote o
//      la finca con todo lo que cuelga. Si algo bloquea (pedidos de compradores, una mezcla, Sample Kits) no borra NADA
//      y devuelve el porqué. Lo que pasa aquí abajo ya no puede deshacer eso: por eso lo de abajo nunca lanza.
//   2. Los OBJETOS de Storage de los archivos cuyas filas ya se borraron. Si falla, queda escrito en el archivo.
//   3. EL AVISO al productor: la nota en su hilo (sin lote ni finca: ya no existen) y el correo. El resultado de cada uno
//      queda en el archivo — regla de la casa: ningún envío se traga un fallo en silencio.

type Archivo = { id: string; bucket: string; path: string };

export async function inventarioNuclear(service: SupabaseClient, tipo: TipoNuclear, id: string): Promise<{ ok: true; inventario: InventarioNuclear } | { ok: false; error: string }> {
  const { data, error } = await service.rpc("nuclear_inventario", { p_tipo: tipo, p_id: id });
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo leer el inventario." };
  return { ok: true, inventario: data as InventarioNuclear };
}

export type ResultadoNuclear = { ok: true; archivoId: string; avisos: string[] } | { ok: false; error: string };

export async function ejecutarBorradoNuclear(
  service: SupabaseClient,
  o: { tipo: TipoNuclear; id: string; codigo: string; adminId: string; adminNombre: string | null; motivo: string }
): Promise<ResultadoNuclear> {
  // 1 · La base.
  const { data: archivoId, error } = await service.rpc("nuclear_borrar", {
    p_tipo: o.tipo,
    p_id: o.id,
    p_codigo: o.codigo,
    p_admin: o.adminId,
    p_admin_nombre: o.adminNombre,
    p_motivo: o.motivo,
  });
  if (error || typeof archivoId !== "string") return { ok: false, error: (error?.message ?? "La base no devolvió el archivo del borrado.").replace(/^BLOQUEADO: /, "No se puede borrar todavía. ") };

  const avisos: string[] = [];
  const { data: fila } = await service
    .from("borrados_nucleares")
    .select("nombre, producer_id, productor_nombre, productor_email, archivos, snapshot")
    .eq("id", archivoId)
    .maybeSingle();
  const archivo = fila as { nombre: string; producer_id: string | null; productor_nombre: string | null; productor_email: string | null; archivos: Archivo[] | null; snapshot: { lots?: { name: string }[] } | null } | null;
  if (!archivo) return { ok: true, archivoId, avisos: ["El borrado se hizo, pero no se pudo releer su archivo para quitar los objetos y avisar al productor."] };

  // 2 · Los objetos de Storage.
  const archivos = archivo.archivos ?? [];
  let errorDeArchivos: string | null = null;
  for (const bucket of new Set(archivos.map((a) => a.bucket))) {
    const rutas = archivos.filter((a) => a.bucket === bucket).map((a) => a.path);
    const { error: e } = await service.storage.from(bucket).remove(rutas);
    if (e) errorDeArchivos = `${bucket}: ${e.message}`;
  }
  if (errorDeArchivos) avisos.push(`No se pudieron quitar todos los archivos del almacenamiento (${errorDeArchivos}).`);
  await service.from("borrados_nucleares").update({ archivos_borrados_at: errorDeArchivos ? null : new Date().toISOString(), archivos_error: errorDeArchivos }).eq("id", archivoId);

  // 3 · El aviso al productor.
  const aviso = avisoAlProductor({
    tipo: o.tipo,
    nombre: archivo.nombre,
    codigo: o.codigo,
    lotes: o.tipo === "finca" ? (archivo.snapshot?.lots ?? []).map((l) => l.name) : [],
    productor: archivo.productor_nombre,
  });
  let commAt: string | null = null;
  if (archivo.producer_id) {
    const { error: e } = await service.from("producer_comm_log").insert({
      producer_id: archivo.producer_id,
      context_label: `${o.tipo === "finca" ? "Finca" : "Lote"} ${archivo.nombre} (retirado por CTCx)`,
      note: aviso.nota,
      created_by: o.adminId,
    });
    if (e) avisos.push(`No se pudo dejar la nota en el hilo del productor (${e.message}).`);
    else commAt = new Date().toISOString();
  } else avisos.push("La cuenta del productor ya no existe: no hay a quién avisar.");

  let emailEstado = "sin_correo";
  let emailError: string | null = null;
  if (archivo.productor_email) {
    const envio = await sendTransactionalEmail(archivo.productor_email, aviso.subject, aviso.text);
    emailEstado = envio.ok ? "enviado" : "fallo";
    if (!envio.ok) {
      emailError = envio.error;
      avisos.push(`El correo al productor no salió (${emailError}).`);
    }
  }
  await service
    .from("borrados_nucleares")
    .update({ aviso_nota: aviso.nota, aviso_comm_at: commAt, aviso_email_estado: emailEstado, aviso_email_error: emailError })
    .eq("id", archivoId);

  return { ok: true, archivoId, avisos };
}
