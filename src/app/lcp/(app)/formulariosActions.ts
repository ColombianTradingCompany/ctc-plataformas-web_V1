"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import type { ActionResult } from "@/components/panel/ActionForm";
import { ESTADOS_DE_LEAD } from "@/lib/leadForms/campos";
import { configDe, formulario, type FormularioDeLaBase } from "@/lib/leadForms/registro";
import { enviarCorreoInmediato, enviarSeguimiento } from "@/lib/leadForms/envios";

// ── LCP · Interfaz de Leads · las acciones (V6.2) ─────────────────────────────────────────────────────────────────────────────
// Encender un formulario (UNO a la vez: la portada enseña su insignia), guardar lo que el owner decide sin desplegar (agenda, aviso
// de privacidad, firma, Reply-To, los dos interruptores de correo), y trabajar un lead (etapa, nota, «ya respondió», baja a mano,
// reenviar el correo inmediato, mandar el seguimiento ahora para probarlo sin esperar siete días).
// Clases: encender/apagar y todo lo que manda correo o cambia la portada es `emite`; la etapa y la nota son `borrador` (lista blanca
// de `docs/BCP_USER_ADMIN_PLAN.md`). Ninguna lanza: devuelven {ok:false,error}.

const RUTA = "/lcp/formularios";

function revalidar(rutaPublica?: string | null) {
  revalidatePath(RUTA);
  revalidatePath("/"); // la cabecera de CTC Home
  if (rutaPublica) revalidatePath(rutaPublica);
}

async function filaDe(service: ReturnType<typeof createServiceRoleClient>, key: string): Promise<FormularioDeLaBase | null> {
  const { data } = await service.from("lead_forms").select("*").eq("key", key).maybeSingle();
  return (data as FormularioDeLaBase | null) ?? null;
}

/** Enciende o apaga un formulario. Al encender uno, los demás se apagan (la portada enseña uno solo). */
export async function activarFormulario(formData: FormData): Promise<ActionResult> {
  const p = await permisoDeEscritura("lcp", "emite");
  if (!p.ok) return { ok: false, error: p.error };
  const key = String(formData.get("key") ?? "");
  const activo = String(formData.get("activo") ?? "") === "true";
  const def = formulario(key);
  if (!def) return { ok: false, error: "Formulario desconocido." };
  const service = createServiceRoleClient();
  const fila = await filaDe(service, key);
  if (!fila) return { ok: false, error: "El formulario no está en la base." };
  if (activo) {
    const { error: e1 } = await service.from("lead_forms").update({ activo: false, updated_at: new Date().toISOString() }).eq("activo", true).neq("key", key);
    if (e1) return { ok: false, error: e1.message };
  }
  const { error } = await service.from("lead_forms").update({ activo, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return { ok: false, error: error.message };
  await service.from("audit_log").insert({ entity_type: "lead_form", entity_id: null, action: activo ? "formulario_encendido" : "formulario_apagado", performed_by: p.userId, notes: `${key} · ${def.ruta}` });
  revalidar(def.ruta);
  return { ok: true };
}

/** Lo que el owner configura sin desplegar. */
export async function guardarConfigDeFormulario(formData: FormData): Promise<ActionResult> {
  const p = await permisoDeEscritura("lcp", "emite");
  if (!p.ok) return { ok: false, error: p.error };
  const key = String(formData.get("key") ?? "");
  const def = formulario(key);
  if (!def) return { ok: false, error: "Formulario desconocido." };
  const service = createServiceRoleClient();
  const fila = await filaDe(service, key);
  if (!fila) return { ok: false, error: "El formulario no está en la base." };
  const actual = configDe(fila.config);
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  const nueva = configDe({
    ...actual,
    correo_inmediato: formData.get("correo_inmediato") === "on",
    seguimiento: formData.get("seguimiento") === "on",
    seguimiento_dias: Number(s("seguimiento_dias") || actual.seguimiento_dias),
    ja_correo_en: formData.get("ja_correo_en") !== null ? formData.get("ja_correo_en") === "on" : actual.ja_correo_en,
    agenda_url: s("agenda_url"),
    privacy_url: s("privacy_url"),
    reply_to: s("reply_to") || actual.reply_to,
    firma: s("firma"),
  });
  if (s("agenda_url") && !nueva.agenda_url) return { ok: false, error: "El enlace de agenda no es una URL válida (https://…)." };
  if (s("privacy_url") && !nueva.privacy_url) return { ok: false, error: "El aviso de privacidad no es una URL válida (https://… o /ruta)." };
  if (s("reply_to") && nueva.reply_to !== s("reply_to")) return { ok: false, error: "El correo de respuesta no tiene un formato válido." };
  const { error } = await service.from("lead_forms").update({ config: nueva, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return { ok: false, error: error.message };
  await service.from("audit_log").insert({ entity_type: "lead_form", entity_id: null, action: "formulario_configurado", performed_by: p.userId, notes: `${key} · correo inmediato ${nueva.correo_inmediato ? "ON" : "OFF"} · seguimiento ${nueva.seguimiento ? "ON" : "OFF"} (${nueva.seguimiento_dias} d)` });
  revalidar(def.ruta);
  return { ok: true };
}

/** La etapa del lead (borrador: reversible, solo la lee este tablero). */
export async function setEstadoLeadDeEvento(formData: FormData): Promise<ActionResult> {
  const p = await permisoDeEscritura("lcp", "borrador");
  if (!p.ok) return { ok: false, error: p.error };
  const leadId = String(formData.get("leadId") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!(ESTADOS_DE_LEAD as readonly string[]).includes(estado)) return { ok: false, error: "Etapa desconocida." };
  const service = createServiceRoleClient();
  const { error } = await service.from("event_leads").update({ status: estado, updated_at: new Date().toISOString() }).eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(RUTA);
  return { ok: true };
}

/** La nota interna, «ya respondió» y la baja a mano (borrador: reversible y sin correo). */
export async function anotarLeadDeEvento(formData: FormData): Promise<ActionResult> {
  const p = await permisoDeEscritura("lcp", "borrador");
  if (!p.ok) return { ok: false, error: p.error };
  const leadId = String(formData.get("leadId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000) || null;
  const respondio = formData.get("respondio") === "on";
  const baja = formData.get("baja") === "on";
  const service = createServiceRoleClient();
  const { data } = await service.from("event_leads").select("replied_at, unsubscribed_at").eq("id", leadId).maybeSingle();
  if (!data) return { ok: false, error: "Lead no encontrado." };
  const fila = data as { replied_at: string | null; unsubscribed_at: string | null };
  const ahora = new Date().toISOString();
  const { error } = await service
    .from("event_leads")
    .update({
      notes,
      replied_at: respondio ? (fila.replied_at ?? ahora) : null,
      unsubscribed_at: baja ? (fila.unsubscribed_at ?? ahora) : null,
      updated_at: ahora,
    })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(RUTA);
  return { ok: true };
}

/** Reenvía (o manda por primera vez, si el interruptor estaba apagado) el correo inmediato de un lead. */
export async function reenviarCorreoInmediato(formData: FormData): Promise<ActionResult> {
  const p = await permisoDeEscritura("lcp", "emite");
  if (!p.ok) return { ok: false, error: p.error };
  const leadId = String(formData.get("leadId") ?? "");
  const r = await enviarCorreoInmediato(createServiceRoleClient(), leadId, { forzar: true });
  revalidatePath(RUTA);
  return r.ok ? { ok: true, aviso: r.omitido ? `No salió: ${r.omitido}.` : undefined } : { ok: false, error: r.error };
}

/** Manda el seguimiento AHORA (para probarlo sin esperar los siete días, o a mano). Respeta la baja; salta «ya respondió» si se fuerza. */
export async function enviarSeguimientoAhora(formData: FormData): Promise<ActionResult> {
  const p = await permisoDeEscritura("lcp", "emite");
  if (!p.ok) return { ok: false, error: p.error };
  const leadId = String(formData.get("leadId") ?? "");
  const r = await enviarSeguimiento(createServiceRoleClient(), leadId, { forzar: formData.get("forzar") === "on" });
  revalidatePath(RUTA);
  return r.ok ? { ok: true, aviso: r.omitido ? `No salió: ${r.omitido}.` : undefined } : { ok: false, error: r.error };
}

/** Manda el correo inmediato a TODOS los leads del formulario que no lo recibieron (tras encender el interruptor). */
export async function enviarInmediatosPendientes(formData: FormData): Promise<ActionResult> {
  const p = await permisoDeEscritura("lcp", "emite");
  if (!p.ok) return { ok: false, error: p.error };
  const key = String(formData.get("key") ?? "");
  if (!formulario(key)) return { ok: false, error: "Formulario desconocido." };
  const service = createServiceRoleClient();
  const { data } = await service.from("event_leads").select("id").eq("form_key", key).is("email_immediate_sent_at", null).is("unsubscribed_at", null).order("created_at").limit(200);
  let enviados = 0;
  const errores: string[] = [];
  for (const l of (data as { id: string }[] | null) ?? []) {
    const r = await enviarCorreoInmediato(service, l.id);
    if (r.ok && !r.omitido) enviados += 1;
    else if (!r.ok) errores.push(r.error);
  }
  revalidatePath(RUTA);
  if (errores.length) return { ok: true, aviso: `${enviados} enviado(s); ${errores.length} con error (ver cada lead).` };
  return { ok: true, aviso: enviados ? `${enviados} correo(s) enviado(s).` : "No había correos pendientes." };
}
