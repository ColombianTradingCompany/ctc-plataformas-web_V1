import "server-only";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { esCorreoDePrueba } from "@/lib/email/cuentasDePrueba";
import { origenDeSuperficie, WWW_ORIGIN } from "@/lib/red/subdominios";
import type { LeadDeEvento } from "./campos";
import { construirCorreoInmediato, construirSeguimiento, type Correo, type EnlacesDeCorreo, type LeadParaCorreo } from "./correos";
import { configDe, formulario, type ConfigDeFormulario, type FormularioDeLaBase } from "./registro";
import { urlDeBaja } from "./sello";

// ── Interfaz de Leads · los ENVÍOS (V6.2) — solo servidor ─────────────────────────────────────────────────────────────────────
// Lo que toca la red: mandar el correo inmediato y el seguimiento (Resend, el remitente verificado `EMAIL_FROM`, Reply-To a lo que
// diga la configuración del formulario), dejar en la fila cuándo salió cada uno o qué falló (NUNCA se traga un fallo: la consola lo
// enseña y lo reintenta), y el barrido del cron que manda los seguimientos vencidos. Los textos son de `correos.ts` (puro).
//
// Dos interruptores en `lead_forms.config` (`correo_inmediato`, `seguimiento`) nacen APAGADOS: el owner aprueba los textos y los
// enciende desde la LCP. Mientras tanto, cada lead queda con su `followup_due_at` (el seguimiento no vence hasta siete días después).

const FROM = process.env.EMAIL_FROM || "Colombian Trading Company <onboarding@resend.dev>";

export type ResultadoDeEnvio = { ok: true; omitido?: string } | { ok: false; error: string };

/** El remitente único de la Interfaz de Leads: nunca lanza; salta las cuentas de prueba; sin clave, escribe al log (desarrollo). */
export async function mandarCorreo(to: string, correo: Correo, replyTo: string): Promise<ResultadoDeEnvio> {
  if (esCorreoDePrueba(to)) return { ok: true, omitido: "cuenta de prueba" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[leads-evento · sin RESEND_API_KEY] to=${to} replyTo=${replyTo} subject="${correo.subject}"\n${correo.text}`);
    return { ok: true, omitido: "sin RESEND_API_KEY (desarrollo)" };
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM, to, replyTo, subject: correo.subject, text: correo.text });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Fallo desconocido al enviar el correo." };
  }
}

export function enlacesDeCorreo(rutaDelFormulario: string, leadId: string): EnlacesDeCorreo {
  return {
    baja: urlDeBaja(rutaDelFormulario, leadId),
    cherryPicked: origenDeSuperficie("/cherry-picked"),
    kaffetalRegal: origenDeSuperficie("/kaffetal-regal"),
    catalogo: `${WWW_ORIGIN}/ctcx-public-catalogue`,
  };
}

type Contexto = { lead: LeadDeEvento; fila: FormularioDeLaBase; config: ConfigDeFormulario; ruta: string };

async function contextoDe(service: SupabaseClient, leadId: string): Promise<Contexto | { error: string }> {
  const { data: lead, error } = await service.from("event_leads").select("*").eq("id", leadId).maybeSingle();
  if (error || !lead) return { error: "Lead no encontrado." };
  const l = lead as LeadDeEvento;
  const { data: fila } = await service.from("lead_forms").select("*").eq("key", l.form_key).maybeSingle();
  if (!fila) return { error: "Formulario no encontrado." };
  const def = formulario(l.form_key);
  if (!def) return { error: "El formulario no existe en el código." };
  return { lead: l, fila: fila as FormularioDeLaBase, config: configDe((fila as FormularioDeLaBase).config), ruta: def.ruta };
}

/** Los dos correos de un lead, construidos (para la vista previa de la consola). */
export async function vistaPreviaDeCorreos(service: SupabaseClient, leadId: string): Promise<{ inmediato: Correo; seguimiento: Correo } | { error: string }> {
  const c = await contextoDe(service, leadId);
  if ("error" in c) return c;
  const enlaces = enlacesDeCorreo(c.ruta, c.lead.id);
  const l = c.lead as LeadParaCorreo;
  return { inmediato: construirCorreoInmediato(l, c.config, enlaces), seguimiento: construirSeguimiento(l, c.config, enlaces) };
}

/** Manda el correo inmediato y deja el resultado en la fila. `forzar` lo reenvía aunque ya haya salido (reintento a mano). */
export async function enviarCorreoInmediato(service: SupabaseClient, leadId: string, opts: { forzar?: boolean } = {}): Promise<ResultadoDeEnvio> {
  const c = await contextoDe(service, leadId);
  if ("error" in c) return { ok: false, error: c.error };
  if (c.lead.unsubscribed_at) return { ok: false, error: "El lead se dio de baja: no se le escribe." };
  if (c.lead.email_immediate_sent_at && !opts.forzar) return { ok: true, omitido: "ya enviado" };
  const correo = construirCorreoInmediato(c.lead as LeadParaCorreo, c.config, enlacesDeCorreo(c.ruta, c.lead.id));
  const r = await mandarCorreo(c.lead.email, correo, c.config.reply_to);
  await service
    .from("event_leads")
    .update(r.ok ? { email_immediate_sent_at: new Date().toISOString(), email_immediate_error: null, updated_at: new Date().toISOString() } : { email_immediate_error: r.error, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  return r;
}

/** ¿El lead ya nos respondió? Un correo entrante del Buzón desde su dirección, después del correo inmediato (o del envío). */
export async function yaRespondio(service: SupabaseClient, lead: Pick<LeadDeEvento, "email" | "email_immediate_sent_at" | "created_at" | "replied_at">): Promise<boolean> {
  if (lead.replied_at) return true;
  const desde = lead.email_immediate_sent_at ?? lead.created_at;
  const { data } = await service
    .from("inbound_emails")
    .select("id")
    .ilike("from_email", `%${lead.email.toLowerCase()}%`)
    .gt("received_at", desde)
    .limit(1);
  return !!(data && data.length);
}

/** Manda el seguimiento y deja el resultado en la fila. Sin `forzar`, respeta las tres condiciones de la especificación: no si ya
 *  salió, no si se dio de baja, no si ya respondió al primero. */
export async function enviarSeguimiento(service: SupabaseClient, leadId: string, opts: { forzar?: boolean } = {}): Promise<ResultadoDeEnvio> {
  const c = await contextoDe(service, leadId);
  if ("error" in c) return { ok: false, error: c.error };
  if (c.lead.unsubscribed_at) return { ok: false, error: "El lead se dio de baja: no se le escribe." };
  if (c.lead.followup_sent_at && !opts.forzar) return { ok: true, omitido: "ya enviado" };
  if (!opts.forzar && (await yaRespondio(service, c.lead))) {
    if (!c.lead.replied_at) await service.from("event_leads").update({ replied_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", leadId);
    return { ok: true, omitido: "ya respondió al primer correo" };
  }
  const correo = construirSeguimiento(c.lead as LeadParaCorreo, c.config, enlacesDeCorreo(c.ruta, c.lead.id));
  const r = await mandarCorreo(c.lead.email, correo, c.config.reply_to);
  await service
    .from("event_leads")
    .update(r.ok ? { followup_sent_at: new Date().toISOString(), followup_error: null, updated_at: new Date().toISOString() } : { followup_error: r.error, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  return r;
}

export type BarridoDeSeguimientos = { formularios: number; vencidos: number; enviados: number; omitidos: number; errores: string[] };

/** El barrido del cron: por cada formulario con el seguimiento ENCENDIDO, los leads cuyo seguimiento venció y no ha salido. Idempotente:
 *  cada envío mueve `followup_sent_at`, así que correrlo dos veces en la misma hora no manda dos correos. */
export async function correrSeguimientos(service: SupabaseClient, ahoraIso = new Date().toISOString()): Promise<BarridoDeSeguimientos> {
  const out: BarridoDeSeguimientos = { formularios: 0, vencidos: 0, enviados: 0, omitidos: 0, errores: [] };
  const { data: formularios, error } = await service.from("lead_forms").select("*");
  if (error) {
    out.errores.push(`lead_forms: ${error.message}`);
    return out;
  }
  for (const f of (formularios as FormularioDeLaBase[] | null) ?? []) {
    const config = configDe(f.config);
    if (!config.seguimiento) continue;
    out.formularios += 1;
    const { data: vencidos, error: e2 } = await service
      .from("event_leads")
      .select("id")
      .eq("form_key", f.key)
      .is("followup_sent_at", null)
      .is("unsubscribed_at", null)
      .lte("followup_due_at", ahoraIso)
      .order("followup_due_at", { ascending: true })
      .limit(200);
    if (e2) {
      out.errores.push(`${f.key}: ${e2.message}`);
      continue;
    }
    for (const v of (vencidos as { id: string }[] | null) ?? []) {
      out.vencidos += 1;
      const r = await enviarSeguimiento(service, v.id);
      if (!r.ok) out.errores.push(`${v.id}: ${r.error}`);
      else if (r.omitido) out.omitidos += 1;
      else out.enviados += 1;
    }
  }
  return out;
}
