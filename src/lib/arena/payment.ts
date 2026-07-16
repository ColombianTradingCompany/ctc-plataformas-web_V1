// ── Cómo se paga la inscripción de Arena ─────────────────────────────────────
// NO hay pasarela de pago: el productor paga por Nequi (billetera móvil
// colombiana, se transfiere a un número de celular) y CTC confirma manualmente
// en /bcp/club. Estos datos son públicos de cara al productor — no son secreto,
// por eso viven en código y no en una env var.
//
// ⚠️ PENDIENTE: falta la cuenta Nequi real de CTC. Mientras NEQUI.number esté
// vacío, la vista "Mis inscripciones" oculta las instrucciones y le dice al
// productor que escriba a CTC — nunca muestra un número a medias.

export const NEQUI = {
  /** Celular Nequi de CTC, formato "300 123 4567". Vacío = aún sin configurar. */
  number: "",
  /** A nombre de quién figura la cuenta (para que el productor confirme antes de enviar). */
  holder: "",
};

export const PAYMENT_EMAIL = "info@ctcexport.com";

export function nequiConfigured(): boolean {
  return NEQUI.number.trim().length > 0;
}

/**
 * La referencia que el productor escribe en el pago para que CTC lo concilie.
 * Se usa el código corto del lote — es lo que ya va en el paquete de la muestra.
 */
export function paymentReferenceFor(lotRefShort: string): string {
  return lotRefShort;
}
