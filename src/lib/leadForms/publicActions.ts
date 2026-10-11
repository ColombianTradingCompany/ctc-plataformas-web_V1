"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { BUCKET_LEADS, codigoDeLead, limpiarComplemento, validarEnvio, venceElSeguimiento, type ComplementoDeFormulario, type EnvioDeFormulario } from "./campos";
import { configDe, formulario, formularioActivoDe, type FormularioDeLaBase } from "./registro";
import { enviarCorreoInmediato } from "./envios";
import { rutaDeCompletar, rutaDelPdf, selloValido, testigoDeBajaValido, testigoDeLead, testigoDeLeadValido } from "./sello";

// ── Interfaz de Leads · las acciones PÚBLICAS del formulario (V6.2) ──────────────────────────────────────────────────────────
// Lo que el visitante dispara desde su celular, sin sesión: pedir una URL firmada para la foto de la tarjeta, enviar el formulario
// y darse de baja desde el enlace del correo. Las tablas son solo service role (RLS sin políticas): el formulario público INSERTA
// aquí y nunca lee ni modifica (datos personales). Ninguna lanza: un `throw` en una Server Action tumba la página.
//
// Protecciones que el visitante no nota: el honeypot (`website`, un campo oculto que solo un bot llena: se responde ok y no se
// escribe nada), el sello de tiempo (`sello.ts`: un envío más joven que 3 s o más viejo que 24 h no es una persona) y la
// idempotencia (`idempotency_key`, un uuid que el navegador fija por envío: un doble toque o un reintento tras un corte no
// duplican el lead — la base lo rechaza y aquí se responde con el lead que ya existe).

const EXTENSION: Readonly<Record<string, string>> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

/** V6.4: el envío devuelve además el CÓDIGO del registro, el testigo (para completar el paso 2 desde la pantalla de gracias) y las dos
 *  rutas relativas: el PDF de confirmación y «completar». */
export type ResultadoDeEnvioPublico =
  | { ok: true; leadId: string; repetido: boolean; codigo: string; testigo: string; pdfHref: string; completarHref: string }
  | { ok: false; error: "cerrado" | "invalido" | "base"; campo?: string };

const resultadoDe = (def: { key: string; ruta: string }, leadId: string, repetido: boolean) => ({
  ok: true as const,
  leadId,
  repetido,
  codigo: codigoDeLead(def.key, leadId),
  testigo: testigoDeLead(leadId),
  pdfHref: rutaDelPdf(def.ruta, leadId),
  completarHref: rutaDeCompletar(def.ruta, leadId),
});

async function formularioAbierto(service: ReturnType<typeof createServiceRoleClient>, formKey: string) {
  const { data } = await service.from("lead_forms").select("*").eq("key", formKey).maybeSingle();
  if (!data) return null;
  const fila = data as FormularioDeLaBase;
  return formularioActivoDe([fila], new Date().toISOString()) ? fila : null;
}

/** El envío del formulario. */
export async function enviarLeadDeEvento(payload: EnvioDeFormulario): Promise<ResultadoDeEnvioPublico> {
  try {
    // Honeypot: se finge éxito y no se escribe nada.
    if (payload?.website && String(payload.website).trim() !== "") return { ok: true, leadId: "", repetido: false, codigo: "", testigo: "", pdfHref: "", completarHref: "" };
    const def = formulario(payload?.formKey);
    if (!def) return { ok: false, error: "cerrado" };
    if (!selloValido(payload.sello)) return { ok: false, error: "invalido", campo: "sello" };
    const v = validarEnvio(payload);
    if (!v.ok) return { ok: false, error: v.motivo === "form" || v.motivo === "lang" ? "cerrado" : "invalido", campo: v.campo };

    const service = createServiceRoleClient();
    const fila = await formularioAbierto(service, def.key);
    if (!fila) return { ok: false, error: "cerrado" };
    const config = configDe(fila.config);

    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;
    const ua = (h.get("user-agent") ?? "").slice(0, 300) || null;
    const ahora = new Date().toISOString();

    const { data: creado, error } = await service
      .from("event_leads")
      .insert({
        ...v.lead,
        submitted_ip: ip,
        user_agent: ua,
        consent_at: ahora,
        followup_due_at: venceElSeguimiento(ahora, config.seguimiento_dias),
      })
      .select("id")
      .maybeSingle();

    if (error) {
      // 23505 = ya existe un lead con esa idempotency_key: es el MISMO envío (doble toque o reintento). Se responde con él.
      if (error.code === "23505") {
        const { data: previo } = await service.from("event_leads").select("id").eq("idempotency_key", v.lead.idempotency_key).maybeSingle();
        if (previo) return resultadoDe(def, (previo as { id: string }).id, true);
      }
      console.error("[leads-evento] insert", error.message);
      return { ok: false, error: "base" };
    }
    if (!creado) return { ok: false, error: "base" };
    const leadId = (creado as { id: string }).id;

    // El correo inmediato, si el owner lo encendió. Su resultado queda en la fila; el lead ya está guardado pase lo que pase.
    if (config.correo_inmediato) await enviarCorreoInmediato(service, leadId);
    return resultadoDe(def, leadId, false);
  } catch (e) {
    console.error("[leads-evento] enviar", (e as Error).message);
    return { ok: false, error: "base" };
  }
}

/** La URL firmada para subir la foto de la tarjeta al bucket PRIVADO (nombre aleatorio, carpeta del formulario). */
export async function urlDeSubidaDeTarjeta(formKey: string, tipo: string): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  try {
    const def = formulario(formKey);
    if (!def) return { ok: false, error: "cerrado" };
    const ext = EXTENSION[String(tipo ?? "").toLowerCase()];
    if (!ext) return { ok: false, error: "tipo" };
    const service = createServiceRoleClient();
    if (!(await formularioAbierto(service, def.key))) return { ok: false, error: "cerrado" };
    const path = `${def.key}/${randomUUID()}.${ext}`;
    const { data, error } = await service.storage.from(BUCKET_LEADS).createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: "subida" };
    return { ok: true, path, token: data.token };
  } catch {
    return { ok: false, error: "subida" };
  }
}

/** La baja desde el enlace del correo: `id` + testigo. Idempotente. */
export async function darseDeBaja(leadId: string, testigo: string): Promise<{ ok: boolean }> {
  try {
    if (!testigoDeBajaValido(leadId, testigo)) return { ok: false };
    const service = createServiceRoleClient();
    const { data } = await service.from("event_leads").select("id, unsubscribed_at").eq("id", leadId).maybeSingle();
    if (!data) return { ok: false };
    if (!(data as { unsubscribed_at: string | null }).unsubscribed_at) {
      await service.from("event_leads").update({ unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", leadId);
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** V6.4 · el PASO 2 (opcional): completa o corrige «Tu operación» y «Qué valoras» del lead `leadId`, desde la pantalla de gracias o
 *  desde el enlace firmado del correo. Solo toca sus columnas; lo del paso 1 no cambia desde aquí. Idempotente. */
export async function completarLeadDeEvento(payload: ComplementoDeFormulario): Promise<{ ok: true } | { ok: false; error: "cerrado" | "invalido" | "base" }> {
  try {
    const def = formulario(payload?.formKey);
    if (!def) return { ok: false, error: "cerrado" };
    if (!testigoDeLeadValido(String(payload.leadId ?? ""), payload.testigo)) return { ok: false, error: "invalido" };
    const service = createServiceRoleClient();
    const { data } = await service.from("event_leads").select("id, form_key, participant_type, extra").eq("id", payload.leadId).maybeSingle();
    if (!data) return { ok: false, error: "invalido" };
    const lead = data as { id: string; form_key: string; participant_type: string; extra: Record<string, unknown> | null };
    if (lead.form_key !== def.key) return { ok: false, error: "invalido" };
    const limpio = limpiarComplemento(payload, lead.participant_type);
    const { error } = await service
      .from("event_leads")
      .update({ ...limpio, extra: { ...(lead.extra ?? {}), ...limpio.extra }, updated_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (error) {
      console.error("[leads-evento] completar", error.message);
      return { ok: false, error: "base" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[leads-evento] completar", (e as Error).message);
    return { ok: false, error: "base" };
  }
}
