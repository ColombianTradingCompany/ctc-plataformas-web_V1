// ── Cómo se paga la evaluación de un lote: el CARRIL DE PAGO (V5.129) — PURO ─────────────────────────────────────────
// NO hay pasarela de pago: el productor transfiere a la cuenta que CTCx le indica y CTCx confirma el pago a mano en
// OCP · Solicitudes de Evaluación.
//
// Hasta la V5.128 la cuenta vivía en este archivo (`NEQUI = { number: "", holder: "" }`) y NUNCA se llenó: el productor
// leía «escríbanos y le indicamos cómo pagar», y el owner lo dijo el 2026-10-01 — «debe ser más claro cuánto y dónde hay
// que pagar». Desde la V5.129 el carril es un dato que CTCx escribe en el OCP (`platform_settings`, clave
// `CLAVE_CARRIL_DE_PAGO`; ver `carrilServidor.ts`) y lo leen las dos caras: la tarjeta de la solicitud en Kaffetal Regal y
// la factura de cobro imprimible. No es secreto (es la cuenta a la que se le paga a CTCx), pero no se inventa: sin
// número, las dos caras lo DICEN y mandan a escribir a CTCx — nunca un número a medias.

export const PAYMENT_EMAIL = "info@ctcexport.com";

/** La clave de `platform_settings` con el carril de pago de la evaluación. */
export const CLAVE_CARRIL_DE_PAGO = "carril_de_pago_evaluacion";

export type CarrilDePago = {
  /** «Nequi», «Bancolombia · cuenta de ahorros», «Daviplata»… */
  medio: string;
  /** El celular o el número de cuenta, tal como se le dicta al productor. Vacío = sin configurar. */
  numero: string;
  /** A nombre de quién figura (para que el productor lo confirme antes de enviar). */
  titular: string;
  /** Una línea libre: NIT, tipo de cuenta, «llave», horario… */
  instrucciones: string;
  /** A dónde se manda el comprobante. */
  email: string;
};

export const CARRIL_SIN_CONFIGURAR: CarrilDePago = { medio: "Nequi", numero: "", titular: "", instrucciones: "", email: PAYMENT_EMAIL };

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Lee el valor de `platform_settings` sin fiarse de su forma. */
export function leerCarrilDePago(raw: unknown): CarrilDePago {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return CARRIL_SIN_CONFIGURAR;
  const x = raw as Record<string, unknown>;
  return {
    medio: texto(x.medio, 60) || CARRIL_SIN_CONFIGURAR.medio,
    numero: texto(x.numero, 40),
    titular: texto(x.titular, 120),
    instrucciones: texto(x.instrucciones, 300),
    email: PAYMENT_EMAIL,
  };
}

export function carrilConfigurado(c: CarrilDePago): boolean {
  return c.numero.trim().length > 0;
}

/**
 * La referencia que el productor escribe en el pago para que CTC lo concilie.
 * Se usa el código corto del lote — es lo que ya va en el paquete de la muestra.
 */
export function paymentReferenceFor(lotRefShort: string): string {
  return lotRefShort;
}
