"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura, requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

export type BuzonActionResult = { ok: true } | { ok: false; error: string };

// ── El Buzón es HISTORIAL DE SOLO LECTURA (D-013 5.4 · unificación P18) ──────────────────────────────────────────────────
// Congelado el 2026-07-16: el correo nuevo del dominio se lee y se contesta en Gmail (con su «Enviar como»). En P18 se
// retiraron de este archivo responder/reenviar (`sendBuzonReply`, borrado: una Server Action borrada no tiene endpoint) y el
// movimiento remoto de archivar/eliminar; «Sincronizar» se niega aquí dentro, no solo en la pantalla, porque una Server Action
// se puede llamar directamente. Lo que queda: listar, abrir, etiquetar, leído/no leído y los adjuntos.
// Si P19 necesita su única importación (fallback 1), su propia micro-release aprobada pone este interruptor en false, la corre
// y lo devuelve a true. No se exporta: un archivo «use server» solo exporta funciones async.
const BUZON_CONGELADO = true;

// Identity for Buzón permissions: owners act on ANY mail; a collaborator only on
// mail addressed to their own @ctcexport.com label (same rule as the list view).
// ⚠️ Esto decide DE QUIÉN es el correo, no QUÉ puede hacer con él. `requireActiveAdmin()` no mira el nivel: las
// acciones que escriben piden además `permisoDeEscritura("lcp", clase)` (la consola del Buzón desde la V5.59). En la V5.57 se escaparon justo por
// estar detrás de este ayudante y no de la compuerta a la vista — un viewer podía responder correos (V5.58).
async function buzonIdentity() {
  const userId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const [{ data: pu }, { data: prof }] = await Promise.all([
    service.from("panel_users").select("is_owner, status, display_name").eq("profile_id", userId).maybeSingle(),
    service.from("profiles").select("email, full_name").eq("id", userId).maybeSingle(),
  ]);
  const isOwner = pu ? pu.is_owner && pu.status === "active" : true;
  return {
    userId,
    isOwner,
    email: (prof?.email ?? "").toLowerCase(),
    displayName: pu?.display_name || prof?.full_name || "CTC",
    service,
  };
}

type MailRow = { id: string; message_id: string | null; from_email: string | null; to_email: string | null; subject: string | null; text_body: string | null; received_at: string; attachments: { filename: string | null; storage_path?: string }[] | null };

async function loadIfAllowed(id: string) {
  const identity = await buzonIdentity();
  const { data } = await identity.service
    .from("inbound_emails")
    .select("id, message_id, from_email, to_email, subject, text_body, received_at, attachments")
    .eq("id", id)
    .single();
  const row = data as MailRow | null;
  if (!row) throw new Error("Correo no encontrado.");
  if (!identity.isOwner && !(row.to_email ?? "").toLowerCase().includes(identity.email)) {
    throw new Error("No autorizado para este correo.");
  }
  return { identity, row };
}

// P18: ninguna pantalla la llama ya (los botones Archivar y Eliminar se retiraron). Se conserva porque las pestañas Archivados
// y Papelera siguen mostrando los estados ya puestos y es la única vía para corregir uno a mano. Solo cambia la base de datos:
// el movimiento remoto en Hostinger se retiró con `mailClient.ts`. Sigue siendo `emite` (admin), como antes.
export async function setBuzonStatus(id: string, status: "archived" | "deleted"): Promise<BuzonActionResult> {
  const permiso = await permisoDeEscritura("lcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const { identity } = await loadIfAllowed(id);
  await identity.service.from("inbound_emails").update({ status }).eq("id", id);
  revalidatePath("/lcp/buzon");
  return { ok: true };
}

export async function setBuzonTags(id: string, tags: string[]): Promise<BuzonActionResult> {
  // Etiquetar es orden interno, reversible y sin efecto fuera de la consola: un viewer puede (lista blanca del plan).
  const permiso = await permisoDeEscritura("lcp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const { identity } = await loadIfAllowed(id);
  const clean = Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 8).map((t) => t.slice(0, 24));
  await identity.service.from("inbound_emails").update({ tags: clean }).eq("id", id);
  revalidatePath("/lcp/buzon");
  return { ok: true };
}

export async function getBuzonAttachmentUrls(id: string): Promise<{ filename: string; url: string }[]> {
  const { identity, row } = await loadIfAllowed(id);
  const out: { filename: string; url: string }[] = [];
  for (const a of row.attachments ?? []) {
    if (!a.storage_path) continue;
    const { data } = await identity.service.storage.from("kaffetal-media").createSignedUrl(a.storage_path, 3600);
    if (data?.signedUrl) out.push({ filename: a.filename ?? "adjunto", url: data.signedUrl });
  }
  return out;
}

export async function syncBuzonNow() {
  if (BUZON_CONGELADO) return { ok: false as const, error: "Buzón congelado (Ronda 5)" };
  const permiso = await permisoDeEscritura("lcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const { syncBuzon } = await import("@/lib/buzon/syncBuzon");
  const result = await syncBuzon();
  revalidatePath("/lcp/buzon");
  return result;
}

export async function markInboundEmailRead(id: string, read: boolean): Promise<BuzonActionResult> {
  // Leído / no leído: lo mismo — si un viewer no pudiera, abrir su propio correo fallaría en silencio.
  const permiso = await permisoDeEscritura("lcp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const { identity } = await loadIfAllowed(id);
  await identity.service
    .from("inbound_emails")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/lcp/buzon");
  return { ok: true };
}
