// ── Identidad legal de CTC, en UN solo sitio ─────────────────────────────────
// El NIT vivía cableado en 4 archivos (LegalFooter + tres documentos
// imprimibles que llegan a manos de clientes); si la razón social o la sede
// cambian, había que acordarse de los cuatro (auditoría 2026-08-13, ESTR-5).
// Módulo PURO a propósito — sin imports, sin "server-only": lo consumen un
// componente cliente (LegalFooter) y tres módulos de servidor por igual.
//
// NIT entregado por el owner el 2026-07-20 (9014834257), escrito en el formato
// colombiano estándar: 9 dígitos + dígito de verificación.

export const NIT = "NIT 901.483.425-7";
export const CTC_RAZON = "Colombian Trading Company";
export const CTC_SEDE = "Piedecuesta, Santander, Colombia";
export const CTC_EMAIL = "info@ctcexport.com";
/** El sitio web, como se imprime en un documento (sin protocolo). */
export const CTC_WEB = "www.ctcexport.com";
/** Los teléfonos de la casa, como se imprimen (Colombia y Alemania). Los entregó el owner el 2026-10-24 (V6.7) para el pie de la
 *  Coffee Datasheet Tool; una lista vacía hace que el pie omita la línea. Nunca un número inventado: se cambian solo aquí. */
export const CTC_TELEFONOS: readonly string[] = ["+57 315 2948371", "+49 176 42020 585"];

/** La línea legal completa de los documentos imprimibles. */
export const CTC_LEGAL_LINE = `${CTC_RAZON} · ${NIT} · ${CTC_SEDE} · ${CTC_EMAIL}`;
