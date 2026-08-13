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

/** La línea legal completa de los documentos imprimibles. */
export const CTC_LEGAL_LINE = `${CTC_RAZON} · ${NIT} · ${CTC_SEDE} · ${CTC_EMAIL}`;
