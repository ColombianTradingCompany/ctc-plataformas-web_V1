// ── OCP · Cotizaciones · tipos compartidos ───────────────────────────────────
// Los dos cotizadores (lotes de café y logística) comparten TODO menos la
// matemática: código, destinatario, estado, vigencia, historial. Lo que cambia
// vive en `inputs`/`results` y lo interpreta cada módulo.

export type QuoteKind = "lote" | "logistico" | "empaque";
export type QuoteStatus = "borrador" | "emitida" | "aceptada" | "rechazada" | "vencida";
export type CounterpartyKind = "productor" | "comprador" | "lead" | "externo";

export const QUOTE_KIND_LABEL: Record<QuoteKind, string> = {
  lote: "Lotes de café",
  logistico: "Logístico",
  empaque: "Costo de empaque",
};

/** Dónde vive el tablero de cada módulo. Antes esto era un ternario repetido en
 *  cinco sitios de actions.ts, que al añadir un tercer módulo habría mandado
 *  `empaque` al cotizador logístico. */
export const QUOTE_BASE_PATH: Record<QuoteKind, string> = {
  lote: "/ocp/cotizador-lotes",
  logistico: "/ocp/cotizador-logistico",
  empaque: "/ocp/cotizador-empaque",
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

/** Una anotación de la bitácora. Se imprime al final de los documentos que se
 *  generen después de la primera emisión. */
export type QuoteChange = { at: string; action: string; note?: string | null; by?: string | null };

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
  changeLog: QuoteChange[];
  /** El espejo de Notion (F2). La plataforma manda sobre la cotización; lo
   *  único que vuelve de Notion es `notaComercial` — la conversación que hubo
   *  alrededor del número, que es justo lo que la plataforma no sabe. */
  notaComercial: string | null;
  notaComercialAt: string | null;
  notionUrl: string | null;
  notionSyncedAt: string | null;
};

/** Una fila de la lista — sin los jsonb pesados. La bitácora sí viaja: es corta
 *  y el tablero marca con ella las cotizaciones que se reabrieron. */
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
