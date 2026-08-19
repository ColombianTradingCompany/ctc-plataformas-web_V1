"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

// Newsletter capture for the Cherry Picked Roast / X "Coming Soon" landings.
// No account is created and no email is sent -- this only records the address
// so CTC can write when the 2027 programmes open. newsletter_subscribers is
// service-role-only (RLS, zero policies); this action is its only writer.

// "ctc-home" (2026-08-10): el índice de la red de CTC Home dejó de anunciar la
// puerta del Control Panel y ofrece esto en su lugar mientras el modelo está en
// desarrollo. Mismo mecanismo, fuente distinta — la clave única es (email,
// source), así que alguien puede estar en la lista de Roast y en ésta.
// "directorio" y "herramientas" (2026-08-19, A6): el índice de la red tenía UN
// solo formulario de correo, colgado de la ficha de Terratalento, que hacía de
// buzón para toda la red. Ahora cada puerta pregunta lo suyo — y como
// `qa-crm-interes-check` exige tablero por fuente, nacen con el suyo.
const SOURCES = ["roast", "x", "ctc-home", "directorio", "herramientas"] as const;
type Source = (typeof SOURCES)[number];

// Lo que cada fuente puede guardar en `fields`, y NADA más. La lista blanca es
// por fuente y no global a propósito: un formulario que empiece a mandar un
// campo que no le toca se queda fuera en silencio en vez de ensuciar la tabla.
// Sin entrada aquí = solo correo, que es el caso de las tres primeras fuentes.
const CAMPOS: Partial<Record<Source, readonly string[]>> = {
  directorio: ["especialidad"],
  herramientas: ["herramienta"],
};

/** Cada valor: texto corto, recortado. No se valida CONTRA una lista cerrada —
 *  el desplegable ya la impone en el navegador, y una lista repetida aquí se
 *  desincroniza el día que se añada una especialidad. Lo que sí se impone es el
 *  tamaño, que es lo que protege la tabla. */
function limpiaCampos(source: Source, entrada: Record<string, unknown> | undefined) {
  const permitidos = CAMPOS[source];
  if (!permitidos || !entrada) return {};
  const salida: Record<string, string> = {};
  for (const clave of permitidos) {
    const valor = String(entrada[clave] ?? "").trim().slice(0, 120);
    if (valor) salida[clave] = valor;
  }
  return salida;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type NewsletterPayload = {
  email: string;
  source: string;
  lang?: string;
  website?: string; // honeypot -- rendered hidden; bots fill it
  /** Campos propios de la fuente (A6). Se filtran por lista blanca. */
  fields?: Record<string, unknown>;
};

export type NewsletterResult = { ok: true } | { ok: false; error: "invalid" | "failed" };

export async function subscribeNewsletter(payload: NewsletterPayload): Promise<NewsletterResult> {
  // Honeypot: pretend success so bots learn nothing.
  if (payload.website) return { ok: true };

  const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 320);
  const source = payload.source as Source;
  if (!EMAIL_RE.test(email) || !SOURCES.includes(source)) return { ok: false, error: "invalid" };
  const lang = ["en", "es", "de"].includes(payload.lang ?? "") ? payload.lang : null;

  const fields = limpiaCampos(source, payload.fields);

  const service = createServiceRoleClient();
  const { error } = await service
    .from("newsletter_subscribers")
    .upsert({ email, source, lang, fields }, { onConflict: "email,source", ignoreDuplicates: true });

  if (error) return { ok: false, error: "failed" };
  return { ok: true };
}
