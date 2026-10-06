// ── El blindaje de los documentos del productor (V5.168, owner 2026-10-06) ─────────────────────────────────────────────
// «Quiero crear un "Moat" para que el Productor no tenga la opción (o se le haga muy difícil) de sacar la documentación del
// Dossier para usarlo sin nosotros y sacarnos del negocio; todos los archivos deben tener una marca de agua y todos podrán
// tener el botón para imprimir SOLO si ya tienen un contrato firmado.»
// La regla, en un sitio:
//   · TODO documento del productor lleva marca de agua con la referencia, su nombre y «Uso exclusivo con CTCx».
//   · Imprimir (y descargar) se habilita solo con un contrato FIRMADO (por el productor y por CTCx: `signed_at`) del lote; los
//     documentos de una finca, con un contrato firmado de un lote que salga de esa finca.
//   · Sin contrato: sin botón, y la página bloquea copiar, el menú contextual y los atajos de imprimir y guardar; si se imprime
//     desde el navegador, sale un aviso en vez del documento. Una captura de pantalla no se puede impedir: para eso está la marca.
// PURO (lo leen el servidor, los componentes y `qa-trato-check`).

/** Los estados de un contrato que cuentan como «firmado» (CTCx ya firmó: `signed_at`). */
export const ESTADOS_DE_CONTRATO_FIRMADO = ["active", "reconditioning", "completed", "renovado"] as const;

export function contratoFirmado(status: string | null | undefined): boolean {
  return (ESTADOS_DE_CONTRATO_FIRMADO as readonly string[]).includes(String(status ?? ""));
}

/** El texto de la marca de agua: quién, qué documento y para qué. */
export function textoDeMarca(o: { referencia: string; productor: string | null; fecha: Date | string; lang?: "es" | "en" }): string {
  const f = new Date(o.fecha).toISOString().slice(0, 10);
  const uso = o.lang === "en" ? "For use with CTCx only" : "Uso exclusivo con CTCx";
  return ["CTCx", o.referencia, o.productor || null, uso, f].filter(Boolean).join(" · ");
}

export const AVISO_SIN_CONTRATO = {
  es: "La impresión y la descarga se habilitan cuando su contrato con CTCx esté firmado.",
  en: "Printing and download are enabled once your contract with CTCx is signed.",
} as const;
