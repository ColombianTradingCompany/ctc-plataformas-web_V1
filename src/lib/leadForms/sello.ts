import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { WWW_ORIGIN } from "@/lib/red/subdominios";

// ── Interfaz de Leads · los TESTIGOS firmados (V6.2) — solo servidor ──────────────────────────────────────────────────────────
// Dos usos, un mismo HMAC con secreto del servidor:
//  (1) el SELLO DE TIEMPO que la página del formulario recibe al pintarse y devuelve al enviar: un envío más joven que `MIN_MS` o
//      más viejo que `MAX_MS` no es de una persona llenando un formulario («alguna protección contra envíos automáticos que el
//      visitante no note», junto al honeypot);
//  (2) el TESTIGO DE BAJA que va en el enlace de cada correo: un id de lead sin su testigo no da de baja a nadie.
// El secreto: `LEAD_FORMS_SECRET` si existe; si no, la clave del service role (ya es un secreto del servidor y nunca sale de él).

const MIN_MS = 3_000;
const MAX_MS = 24 * 60 * 60 * 1000;

function secreto(): string {
  const s = process.env.LEAD_FORMS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Sin secreto para los testigos de la Interfaz de Leads (LEAD_FORMS_SECRET o SUPABASE_SERVICE_ROLE_KEY).");
  return s;
}
const firmar = (mensaje: string): string => createHmac("sha256", secreto()).update(mensaje).digest("hex").slice(0, 32);
const iguales = (a: string, b: string): boolean => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function selloDeTiempo(ahoraMs = Date.now()): string {
  const t = String(ahoraMs);
  return `${t}.${firmar(`sello:${t}`)}`;
}

export function selloValido(sello: string | null | undefined, ahoraMs = Date.now()): boolean {
  if (!sello || typeof sello !== "string") return false;
  const [t, firma] = sello.split(".");
  if (!t || !firma || !/^\d{10,16}$/.test(t)) return false;
  if (!iguales(firma, firmar(`sello:${t}`))) return false;
  const edad = ahoraMs - Number(t);
  return edad >= MIN_MS && edad <= MAX_MS;
}

export function testigoDeBaja(leadId: string): string {
  return firmar(`baja:${leadId.toLowerCase()}`);
}

export function testigoDeBajaValido(leadId: string, testigo: string | null | undefined): boolean {
  if (!testigo || typeof testigo !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) return false;
  return iguales(testigo, testigoDeBaja(leadId));
}

/** V6.4: el testigo de un LEAD, para volver a su registro desde el correo (completar el paso 2) y para descargar su PDF. Distinto
 *  del de baja a propósito: quien tenga el enlace de baja no edita; quien tenga el de completar no da de baja. */
export function testigoDeLead(leadId: string): string {
  return firmar(`lead:${leadId.toLowerCase()}`);
}
export function testigoDeLeadValido(leadId: string, testigo: string | null | undefined): boolean {
  if (!testigo || typeof testigo !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) return false;
  return iguales(testigo, testigoDeLead(leadId));
}
/** Las dos rutas RELATIVAS del lead (sirven en desarrollo y en producción; el correo las hace absolutas con `WWW_ORIGIN`). */
export function rutaDeCompletar(rutaDelFormulario: string, leadId: string): string {
  return `${rutaDelFormulario}/completar?id=${encodeURIComponent(leadId)}&t=${testigoDeLead(leadId)}`;
}
export function rutaDelPdf(rutaDelFormulario: string, leadId: string): string {
  return `${rutaDelFormulario}/confirmacion?id=${encodeURIComponent(leadId)}&t=${testigoDeLead(leadId)}`;
}
export const urlDeCompletar = (rutaDelFormulario: string, leadId: string): string => `${WWW_ORIGIN}${rutaDeCompletar(rutaDelFormulario, leadId)}`;
export const urlDelPdf = (rutaDelFormulario: string, leadId: string): string => `${WWW_ORIGIN}${rutaDelPdf(rutaDelFormulario, leadId)}`;

/** La URL de baja de un lead: `<www>/<ruta del formulario>/baja?id=…&t=…`. */
export function urlDeBaja(rutaDelFormulario: string, leadId: string): string {
  return `${WWW_ORIGIN}${rutaDelFormulario}/baja?id=${encodeURIComponent(leadId)}&t=${testigoDeBaja(leadId)}`;
}
