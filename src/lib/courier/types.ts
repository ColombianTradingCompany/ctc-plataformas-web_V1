// ── ECP · Herramientas Internas · Cotizador Courier · tipos ──────────────────────────────────────────

/** Dónde vive la pantalla. La lee `revalidatePath` y la contrasta `qa-rutas-consolas` (f-bis).
 *  Si el módulo se muda, se cambia AQUÍ y solo aquí. */
import type { Cotizacion, Entrada } from "./calculo";

export const COURIER_PATH = "/ecp/cotizador-courier";

export type ResultadoCourier = { ok: true; mensaje?: string } | { ok: false; error: string };

/** Lo que la pantalla necesita saber de las tablas, sin cargar las tarifas enteras. */
export type ResumenCourier = {
  destinos: { clave: string; pais: string; zona: string }[];
  guia: { vigenteDesde: string; fuente: string; filas: number } | null;
  acuerdo: { referencia: string; vigenteDesde: string; finGracia: string | null; modoSuma: string } | null;
  combustible: { id: string; valor: number; vigenteDesde: string; vigenteHasta: string | null; fuente: string; automatico: boolean }[];
};

export type CotizacionGuardada = {
  id: string; destino: string; pais: string | null; pesoRealKg: number | null; pesoFacturableKg: number;
  servicio: string | null; servicioEtiqueta: string | null; fechaEnvio: string | null;
  /** El item CaaS (tarjeta del CRM CP CaaS = lead del pilar `cocreate`) al que pertenece, si alguno. */
  leadId: string | null; itemCaas: string | null;
  totalUsd: number | null; nota: string | null; createdAt: string;
};

/** Un item CaaS visto desde el cotizador: lo justo para saber para quién se cotiza. */
export type ItemCaas = { id: string; nombre: string; marca: string | null; mercado: string | null; formato: string | null; vol: string | null };

/** Dónde vive la tarjeta del item en el LCP (el CRM CP CaaS; su ancla es `lead-<id>`, ver LeadsBoard). */
export const CRM_CAAS_PATH = "/lcp/crm/caas";

/** Una cotización guardada, abierta de nuevo: lo que se metió y el resultado CONGELADO de aquel día. */
export type CotizacionAbierta = CotizacionGuardada & { entradas: Entrada; snapshot: Cotizacion };
