// ── ECP · Herramientas Internas · Cotizador Courier · tipos ──────────────────────────────────────────

/** Dónde vive la pantalla. La lee `revalidatePath` y la contrasta `qa-rutas-consolas` (f-bis).
 *  Si el módulo se muda, se cambia AQUÍ y solo aquí. */
export const COURIER_PATH = "/ecp/cotizador-courier";

export type ResultadoCourier = { ok: true } | { ok: false; error: string };

/** Lo que la pantalla necesita saber de las tablas, sin cargar las tarifas enteras. */
export type ResumenCourier = {
  destinos: { clave: string; pais: string; zona: string }[];
  guia: { vigenteDesde: string; fuente: string; filas: number } | null;
  acuerdo: { referencia: string; vigenteDesde: string; finGracia: string | null; modoSuma: string } | null;
  combustible: { valor: number; vigenteDesde: string; vigenteHasta: string | null; fuente: string; automatico: boolean }[];
};

export type CotizacionGuardada = {
  id: string; destino: string; pesoFacturableKg: number; servicio: string | null;
  totalUsd: number | null; nota: string | null; createdAt: string;
};
