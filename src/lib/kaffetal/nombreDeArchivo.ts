// ── V5.169 (owner, 2026-10-06) · el nombre con que se guarda un documento ────────────────────────────────────────────────
// «Cuando se va a descargar/imprimir los Dossieres, Fichas técnicas, Visa, Pasaportes, etc., haz que el nombre recomendado para
// guardar sea tanto el nombre general como el código específico UID correspondiente al Lote, Finca o Productor.»
// El navegador propone como nombre del PDF el TÍTULO de la página. La forma: «Documento · Nombre · CTC-X-XXXXXXXX», sin los
// caracteres que un sistema de archivos no acepta. PURO: lo usan los títulos de las páginas (servidor) y la Ficha (cliente).
export function nombreDeArchivo(partes: (string | null | undefined)[]): string {
  return partes
    .filter((p): p is string => !!p && p.trim() !== "")
    .map((p) => p.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim())
    .join(" · ");
}
