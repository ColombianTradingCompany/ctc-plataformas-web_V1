// ── Las cuentas de prueba de la casa (V5.98, owner 2026-09-30) ──────────────────────────────
// PURO. El owner pidió DOS cuentas de auditoría —un productor y un comprador— bajo control del nodo final, para que
// `qa-guard-check` y `qa-checkout-check` vuelvan a correr. Viven en el dominio de pruebas de siempre y NUNCA reciben
// correo: el remitente único (`leadEmails.ts`, `send()`) las salta igual que a las etiquetas de los desacoplados.
// Sus credenciales están SOLO en `.env.local` (`QA_PRODUCER_EMAIL`, `QA_BUYER_EMAIL`, `QA_PASSWORD`), nunca en el repo.
// La Secretaría no las espeja (charter `secretaria`, regla de exclusión).

export const DOMINIO_PRUEBAS = "ctc-qa-test.co";

/** ¿Es un correo de una cuenta de prueba? (por dominio, sin importar mayúsculas ni espacios) */
export function esCorreoDePrueba(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return e.endsWith("@" + DOMINIO_PRUEBAS);
}
