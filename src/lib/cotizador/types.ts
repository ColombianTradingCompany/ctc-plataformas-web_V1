// ── OCP · Cotizaciones · tipos compartidos ───────────────────────────────────
// Los dos cotizadores (lotes de café y logística) comparten TODO menos la
// matemática: código, destinatario, estado, vigencia, historial. Lo que cambia
// vive en `inputs`/`results` y lo interpreta cada módulo.

export type QuoteKind = "lote" | "logistico";
export type QuoteStatus = "borrador" | "emitida" | "aceptada" | "rechazada" | "vencida";
export type CounterpartyKind = "productor" | "comprador" | "lead" | "externo";

export const QUOTE_KIND_LABEL: Record<QuoteKind, string> = {
  lote: "Lotes de café",
  logistico: "Logístico",
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
};

export const COUNTERPARTY_LABEL: Record<CounterpartyKind, string> = {
  productor: "Productor",
  comprador: "Comprador",
  lead: "Lead",
  externo: "Contacto externo",
};

/** El destinatario, ya resuelto para pintar. */
export type Counterparty = {
  kind: CounterpartyKind;
  profileId: string | null;
  leadId: string | null;
  /** Copia congelada al cotizar: sigue diciendo a quién se le hizo. */
  name: string | null;
  email: string | null;
  /** Nombre ACTUAL, si la cuenta sigue existiendo — puede diferir del congelado. */
  currentName?: string | null;
};

export type Quote = {
  id: string;
  kind: QuoteKind;
  code: string;
  title: string;
  status: QuoteStatus;
  counterparty: Counterparty;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  currency: string;
  total: number | null;
  unitLabel: string | null;
  notes: string | null;
  validUntil: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  issuedAt: string | null;
  decidedAt: string | null;
};

/** Una fila de la lista — sin los jsonb, que pueden ser grandes. */
export type QuoteSummary = Omit<Quote, "inputs" | "results">;

export type QuoteResult = { ok: true; id?: string } | { ok: false; error: string };

/** Candidato del buscador de destinatarios. */
export type CounterpartyOption = {
  kind: CounterpartyKind;
  profileId: string | null;
  leadId: string | null;
  name: string;
  email: string | null;
  /** Contexto para desempatar homónimos: empresa, pilar del lead, etc. */
  hint: string | null;
};

/** Una cotización vencida lo está por fecha, no por que alguien la marque.
 *  Se deriva al leer para que la lista diga la verdad sin un cron. */
export function effectiveStatus(q: { status: QuoteStatus; validUntil: string | null }, today = new Date()): QuoteStatus {
  if (q.status !== "emitida" || !q.validUntil) return q.status;
  const d = new Date(`${q.validUntil}T23:59:59`);
  return Number.isFinite(d.getTime()) && d < today ? "vencida" : q.status;
}
