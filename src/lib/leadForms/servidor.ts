import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { WWW_ORIGIN } from "@/lib/red/subdominios";
import { BUCKET_LEADS, type LeadDeEvento } from "./campos";
import { FORMULARIOS, formularioActivoDe, type FormularioActivo, type FormularioDeLaBase } from "./registro";

// ── Interfaz de Leads · las CARGAS (V6.2) — solo servidor ────────────────────────────────────────────────────────────────────
// Lo que leen la portada de CTC Home (el formulario activo, para su cabecera) y el módulo de la LCP (los formularios, sus leads, la
// foto de una tarjeta con URL firmada corta, el QR). Nunca lanzan: la portada no puede caerse porque la base no responda.

/** El formulario que la cabecera de CTC Home enseña, o null. La portada lo llama con el service role y lo cachea (`revalidate`). */
export async function formularioActivo(service: SupabaseClient): Promise<FormularioActivo | null> {
  try {
    const { data } = await service.from("lead_forms").select("*").eq("activo", true).limit(2);
    return formularioActivoDe((data as FormularioDeLaBase[] | null) ?? [], new Date().toISOString());
  } catch {
    return null;
  }
}

/** Los formularios de la base, en el orden del registro del código; los que el código conoce y la base no, se crean apagados. */
export async function cargarFormularios(service: SupabaseClient): Promise<FormularioDeLaBase[]> {
  const { data } = await service.from("lead_forms").select("*");
  const filas = (data as FormularioDeLaBase[] | null) ?? [];
  const faltan = Object.values(FORMULARIOS).filter((d) => !filas.some((f) => f.key === d.key));
  if (faltan.length) {
    await service.from("lead_forms").insert(faltan.map((d) => ({ key: d.key, nombre: d.nombre, ruta: d.ruta, etiqueta_cabecera: d.etiquetaCabecera, activo: false })));
    const { data: otra } = await service.from("lead_forms").select("*");
    return ordenar((otra as FormularioDeLaBase[] | null) ?? []);
  }
  return ordenar(filas);
}
const ordenar = (filas: FormularioDeLaBase[]) => {
  const orden = Object.keys(FORMULARIOS);
  return [...filas].sort((a, b) => (orden.indexOf(a.key) === -1 ? 99 : orden.indexOf(a.key)) - (orden.indexOf(b.key) === -1 ? 99 : orden.indexOf(b.key)));
};

export type FiltroDeLeads = { tipo?: string | null; estado?: string | null; texto?: string | null };

export async function cargarLeads(service: SupabaseClient, formKey: string, filtro: FiltroDeLeads = {}): Promise<LeadDeEvento[]> {
  let q = service.from("event_leads").select("*").eq("form_key", formKey).order("created_at", { ascending: false }).limit(2000);
  if (filtro.tipo) q = q.eq("participant_type", filtro.tipo);
  if (filtro.estado) q = q.eq("status", filtro.estado);
  const { data } = await q;
  let filas = (data as LeadDeEvento[] | null) ?? [];
  const t = (filtro.texto ?? "").trim().toLowerCase();
  if (t) filas = filas.filter((l) => [l.full_name, l.company, l.email, l.country_city ?? ""].some((s) => s.toLowerCase().includes(t)));
  return filas;
}

export async function cargarLead(service: SupabaseClient, leadId: string): Promise<LeadDeEvento | null> {
  const { data } = await service.from("event_leads").select("*").eq("id", leadId).maybeSingle();
  return (data as LeadDeEvento | null) ?? null;
}

/** Cuántos leads por formulario y cuántos por tipo (para las tarjetas del módulo). */
export async function contarLeads(service: SupabaseClient): Promise<Record<string, { total: number; nuevos: number; sinCorreo: number; seguimientosVencidos: number }>> {
  const { data } = await service.from("event_leads").select("form_key, status, email_immediate_sent_at, followup_due_at, followup_sent_at, unsubscribed_at");
  const ahora = Date.now();
  const out: Record<string, { total: number; nuevos: number; sinCorreo: number; seguimientosVencidos: number }> = {};
  for (const l of (data as { form_key: string; status: string; email_immediate_sent_at: string | null; followup_due_at: string; followup_sent_at: string | null; unsubscribed_at: string | null }[] | null) ?? []) {
    const c = (out[l.form_key] ??= { total: 0, nuevos: 0, sinCorreo: 0, seguimientosVencidos: 0 });
    c.total += 1;
    if (l.status === "nuevo") c.nuevos += 1;
    if (!l.email_immediate_sent_at && !l.unsubscribed_at) c.sinCorreo += 1;
    if (!l.followup_sent_at && !l.unsubscribed_at && Date.parse(l.followup_due_at) <= ahora) c.seguimientosVencidos += 1;
  }
  return out;
}

/** La foto de la tarjeta, con una URL firmada de 10 minutos (el bucket es privado). */
export async function urlFirmadaDeTarjeta(service: SupabaseClient, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await service.storage.from(BUCKET_LEADS).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

/** La URL pública de un formulario con su parámetro de origen (uno por QR impreso). */
export function urlPublicaDelFormulario(ruta: string, source: string): string {
  return `${WWW_ORIGIN}${ruta}?source=${encodeURIComponent(source)}`;
}

/** El QR como SVG (para imprimir): margen corto, corrección media. */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 512 });
}
