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

// El tablero del OCP administra hoy SOLO la primera (`ANCHOR_KINDS[0]`, la que
// trae el cron). Las otras dos están declaradas porque la cinta de mercado de
// ctcexport.com las dibuja en cuanto `market_anchors` tenga una lectura suya:
// ninguna de las dos tiene fuente pública gratuita —se comprobó con Yahoo y
// Stooq el 2026-08-11— así que entran a mano. Ver src/lib/market/ticker.ts.
export const ANCHOR_KINDS = [
  { id: "fnc_carga", label: "Precio interno FNC", unit: "COP/carga", hint: "Carga de 125 kg de café pergamino seco" },
  { id: "robusta_londres", label: "Robusta · Londres", unit: "USD/t", hint: "Contrato de robusta de ICE Europa, por tonelada" },
  { id: "ice_certificados", label: "Inventarios certificados ICE", unit: "sacos", hint: "Existencias certificadas de arábica, en sacos de 60 kg" },
] as const;

export const SOURCE_LABEL: Record<string, string> = {
  fnc: "Federación", prensa: "Prensa", manual: "A mano", aprox: "Aproximado",
};
