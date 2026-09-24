import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { decidirRecordatorio, MAX_RECORDATORIOS, type EstadoCertificacion } from "./reglas";

// ── Las certificaciones de la finca: pedir evidencia, recordar, corroborar, retirar (V5.78) ──
// El servidor de las reglas de `./reglas.ts`. Cada movimiento deja TRES rastros: la fila
// (`finca_certificates.status` y sus fechas), `audit_log` y una nota en `producer_comm_log` que el
// productor ve en su feed; pedir evidencia y cada recordatorio le llegan además por correo (el
// remitente único, que ya filtra las etiquetas de los desacoplados). Lo llaman las acciones del OCP
// (`certificadosActions.ts`) y el cron semanal (`/api/cron/recordatorios`).

type CertRow = {
  id: string;
  finca_id: string;
  scheme: string;
  cert_number: string | null;
  status: EstadoCertificacion;
  nota_ctc: string | null;
  evidencia_pedida_at: string | null;
  recordatorios: number;
  ultimo_recordatorio_at: string | null;
  fincas: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null;
};

const SCHEME_NOMBRE: Record<string, string> = {
  origin_cert_fedecafe: "Certificado de origen · Fedecafé",
  origin_cert_do: "Denominación de origen",
};
const nombreDe = (c: CertRow) => `${SCHEME_NOMBRE[c.scheme] ?? c.scheme}${c.cert_number ? ` (N.º ${c.cert_number})` : ""}`;
const fincaDe = (c: CertRow) => (Array.isArray(c.fincas) ? c.fincas[0] : c.fincas) as { name: string; producer_id: string } | null;

async function cargar(service: SupabaseClient, certId: string): Promise<CertRow | null> {
  const { data } = await service
    .from("finca_certificates")
    .select("id, finca_id, scheme, cert_number, status, nota_ctc, evidencia_pedida_at, recordatorios, ultimo_recordatorio_at, fincas(name, producer_id)")
    .eq("id", certId)
    .maybeSingle();
  return (data as CertRow | null) ?? null;
}

async function correoDelProductor(service: SupabaseClient, producerId: string): Promise<string | null> {
  const { data } = await service.from("profiles").select("email").eq("id", producerId).maybeSingle();
  return (data as { email: string | null } | null)?.email ?? null;
}

async function rastro(
  service: SupabaseClient,
  c: CertRow,
  action: string,
  performedBy: string | null,
  nota: string,
  previo: EstadoCertificacion,
  nuevo: EstadoCertificacion
) {
  const finca = fincaDe(c);
  await service.from("audit_log").insert({
    entity_type: "finca",
    entity_id: c.finca_id,
    action,
    previous_status: previo,
    new_status: nuevo,
    performed_by: performedBy,
    notes: `${nombreDe(c)} · ${nota}`,
  });
  if (finca) {
    await service.from("producer_comm_log").insert({
      producer_id: finca.producer_id,
      context_label: `Finca ${finca.name}`,
      finca_id: c.finca_id,
      note: nota,
      created_by: performedBy,
    });
  }
}

const enlaceKr = () => `${origenDeSuperficie("/kaffetal-regal")}/kaffetal-regal`;

export type ResultadoCert = { ok: true } | { ok: false; error: string };

/** CTC pide el respaldo de una certificación declarada: estado, nota, correo y feed. Arranca el reloj de los recordatorios. */
export async function pedirEvidencia(service: SupabaseClient, certId: string, nota: string, adminId: string): Promise<ResultadoCert> {
  const c = await cargar(service, certId);
  if (!c) return { ok: false, error: "Certificado no encontrado." };
  if (c.status === "corroborada") return { ok: false, error: "Esta certificación ya está corroborada." };
  if (c.status === "retirada") return { ok: false, error: "Esta certificación fue retirada del Pasaporte; reábrala antes de pedir evidencia." };
  const ahora = new Date().toISOString();
  const { error } = await service
    .from("finca_certificates")
    .update({ status: "evidencia_pedida", nota_ctc: nota || null, evidencia_pedida_at: ahora, recordatorios: 0, ultimo_recordatorio_at: null, updated_at: ahora })
    .eq("id", c.id);
  if (error) return { ok: false, error: error.message };

  const finca = fincaDe(c);
  const texto = `CTCx necesita el respaldo de la certificación «${nombreDe(c)}» de la finca ${finca?.name ?? ""}${nota ? `: ${nota}` : "."} Adjunte el certificado (o su número y vigencia) en Kaffetal Regal → Mis fincas. Le recordaremos cada semana; tras ${MAX_RECORDATORIOS} recordatorios sin respaldo, la certificación sale del Pasaporte de la finca.`;
  await rastro(service, c, "cert_evidence_requested", adminId, texto, c.status, "evidencia_pedida");
  if (finca) {
    const correo = await correoDelProductor(service, finca.producer_id);
    if (correo) await sendTransactionalEmail(correo, `Respaldo de certificación · finca ${finca.name}`, `${texto}\n\n${enlaceKr()}`);
  }
  return { ok: true };
}

/** El recordatorio semanal (lo dispara el cron). */
export async function recordar(service: SupabaseClient, certId: string): Promise<ResultadoCert> {
  const c = await cargar(service, certId);
  if (!c || c.status !== "evidencia_pedida") return { ok: false, error: "No está en evidencia pedida." };
  const n = c.recordatorios + 1;
  const ahora = new Date().toISOString();
  const { error } = await service.from("finca_certificates").update({ recordatorios: n, ultimo_recordatorio_at: ahora, updated_at: ahora }).eq("id", c.id);
  if (error) return { ok: false, error: error.message };
  const finca = fincaDe(c);
  const texto = `Recordatorio ${n} de ${MAX_RECORDATORIOS}: la certificación «${nombreDe(c)}» de la finca ${finca?.name ?? ""} sigue sin respaldo. ${n >= MAX_RECORDATORIOS ? "Es el último aviso: si no llega, la certificación sale del Pasaporte de la finca." : "Adjunte el certificado en Kaffetal Regal → Mis fincas."}`;
  await rastro(service, c, "cert_reminder_sent", null, texto, "evidencia_pedida", "evidencia_pedida");
  if (finca) {
    const correo = await correoDelProductor(service, finca.producer_id);
    if (correo) await sendTransactionalEmail(correo, `Recordatorio ${n}/${MAX_RECORDATORIOS} · certificación de la finca ${finca.name}`, `${texto}\n\n${enlaceKr()}`);
  }
  return { ok: true };
}

/** Sale del Pasaporte (a mano desde el OCP, o por el cron tras los recordatorios). El registro queda. */
export async function retirar(service: SupabaseClient, certId: string, motivo: string, adminId: string | null): Promise<ResultadoCert> {
  const c = await cargar(service, certId);
  if (!c) return { ok: false, error: "Certificado no encontrado." };
  if (c.status === "retirada") return { ok: false, error: "Ya estaba retirada." };
  const ahora = new Date().toISOString();
  const { error } = await service
    .from("finca_certificates")
    .update({ status: "retirada", retirada_at: ahora, verified_by_ctc: false, verified_at: null, nota_ctc: motivo || c.nota_ctc, updated_at: ahora })
    .eq("id", c.id);
  if (error) return { ok: false, error: error.message };
  const finca = fincaDe(c);
  const texto = `La certificación «${nombreDe(c)}» de la finca ${finca?.name ?? ""} se retiró del Pasaporte${motivo ? `: ${motivo}` : " por falta de respaldo tras los recordatorios."} Sigue registrada; si consigue el respaldo, escríbanos y la reabrimos.`;
  await rastro(service, c, "cert_retired", adminId, texto, c.status, "retirada");
  if (finca) {
    const correo = await correoDelProductor(service, finca.producer_id);
    if (correo) await sendTransactionalEmail(correo, `Certificación retirada del Pasaporte · finca ${finca.name}`, `${texto}\n\n${enlaceKr()}`);
  }
  return { ok: true };
}

/** CTC la contrastó con el registro público: corroborada (y `verified_by_ctc`, que leen los claims). Exige vigencia. */
export async function corroborar(service: SupabaseClient, certId: string, adminId: string): Promise<ResultadoCert> {
  const c = await cargar(service, certId);
  if (!c) return { ok: false, error: "Certificado no encontrado." };
  const { data: fechas } = await service.from("finca_certificates").select("valid_from, valid_to").eq("id", certId).maybeSingle();
  if (!fechas?.valid_from || !fechas?.valid_to) {
    return { ok: false, error: "El certificado no tiene vigencia registrada — pida al productor las fechas antes de corroborarlo." };
  }
  const ahora = new Date().toISOString();
  const { error } = await service
    .from("finca_certificates")
    .update({ status: "corroborada", verified_by_ctc: true, verified_at: ahora, updated_at: ahora })
    .eq("id", c.id);
  if (error) return { ok: false, error: error.message };
  const finca = fincaDe(c);
  await rastro(service, c, "cert_verified", adminId, `CTCx corroboró la certificación «${nombreDe(c)}» de la finca ${finca?.name ?? ""}: ya respalda el Pasaporte.`, c.status, "corroborada");
  return { ok: true };
}

/** Vuelve a «declarada» (deshacer un retiro o una corroboración): contadores en cero. */
export async function reabrir(service: SupabaseClient, certId: string, adminId: string): Promise<ResultadoCert> {
  const c = await cargar(service, certId);
  if (!c) return { ok: false, error: "Certificado no encontrado." };
  if (c.status === "declarada") return { ok: false, error: "Ya está en «declarada»." };
  const ahora = new Date().toISOString();
  const { error } = await service
    .from("finca_certificates")
    .update({ status: "declarada", verified_by_ctc: false, verified_at: null, evidencia_pedida_at: null, recordatorios: 0, ultimo_recordatorio_at: null, retirada_at: null, updated_at: ahora })
    .eq("id", c.id);
  if (error) return { ok: false, error: error.message };
  await rastro(service, c, "cert_reopened", adminId, `CTCx reabrió la certificación «${nombreDe(c)}»: vuelve a «declarada».`, c.status, "declarada");
  return { ok: true };
}

/** El barrido semanal: por cada certificación con evidencia pedida decide recordar o retirar (`decidirRecordatorio`). */
export async function correrRecordatorios(service: SupabaseClient, ahora = new Date()): Promise<{ ok: true; recordadas: number; retiradas: number; errores: string[] }> {
  const { data } = await service
    .from("finca_certificates")
    .select("id, status, evidencia_pedida_at, recordatorios, ultimo_recordatorio_at")
    .eq("status", "evidencia_pedida");
  const filas = (data as { id: string; status: EstadoCertificacion; evidencia_pedida_at: string | null; recordatorios: number; ultimo_recordatorio_at: string | null }[] | null) ?? [];
  let recordadas = 0;
  let retiradas = 0;
  const errores: string[] = [];
  for (const f of filas) {
    const decision = decidirRecordatorio(f, ahora);
    if (decision === "nada") continue;
    const r = decision === "recordar" ? await recordar(service, f.id) : await retirar(service, f.id, "", null);
    if (!r.ok) errores.push(`${f.id.slice(0, 8)}: ${r.error}`);
    else if (decision === "recordar") recordadas++;
    else retiradas++;
  }
  return { ok: true, recordadas, retiradas, errores };
}
