// ── La imagen por defecto de una finca o de un lote sin foto (V5.143, owner 2026-10-02) ────────────────────────────────
// «Las fotos y videos del café en B4 deben ser todas siempre opcionales… [si no hay ninguna] haz que se utilice por
// defecto la imagen que te adjunto.» Es la ilustración de CTCx «Fincas y lotes de origen respaldado».
//
// UNA constante para todas las pantallas: la finca sin foto de perfil y el lote sin fotos se ven con ella —en Kaffetal
// Regal y en el OCP hoy; en la vitrina cuando pinte fotos de lote—. Nunca se guarda en la base como si fuera la foto
// del productor: es lo que se pinta cuando NO hay foto, así que en cuanto él sube la suya, la reemplaza sola.

export const IMAGEN_DE_ORIGEN_POR_DEFECTO = "/images/kaffetal-regal/origen-respaldado.webp";
export const ALT_DE_LA_IMAGEN_POR_DEFECTO = "Fincas y lotes de origen respaldado — ilustración de CTCx";

/** La foto si la hay; si no, la imagen por defecto. */
export const imagenDeOrigen = (url: string | null | undefined): string => (url && url.trim() ? url : IMAGEN_DE_ORIGEN_POR_DEFECTO);
