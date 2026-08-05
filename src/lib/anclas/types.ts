// ── OCP · Anclas de mercado · tipos ──────────────────────────────────────────

export type MarketAnchor = {
  id: string;
  /** Qué se mide. Hoy solo `fnc_carga`; el campo deja sitio a más. */
  kind: string;
  /** El día al que corresponde la lectura, no cuándo se guardó. */
  asOf: string;
  value: number;
  unit: string;
  /** fnc | prensa | manual | aprox */
  source: string;
  sourceUrl: string | null;
  note: string | null;
  /** true = la trajo el cron diario. */
  automatic: boolean;
  createdAt: string;
};

export type AnchorResult = { ok: true } | { ok: false; error: string };

export const ANCHOR_KINDS = [
  { id: "fnc_carga", label: "Precio interno FNC", unit: "COP/carga", hint: "Carga de 125 kg de café pergamino seco" },
] as const;

export const SOURCE_LABEL: Record<string, string> = {
  fnc: "Federación", prensa: "Prensa", manual: "A mano", aprox: "Aproximado",
};
