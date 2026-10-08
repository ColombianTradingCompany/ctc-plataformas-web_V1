import "server-only";

// ── La capa de texto de un PDF (V5.191) ──────────────────────────────────────────────────────────────────────────────────
// La lee `unpdf` (MIT, sin dependencias: trae su propio pdf.js para servidores). Es lo que el lector de reportes
// (`lectorDeReportes.ts`) recorre para proponer la planilla en formato CTCx. Un PDF escaneado no tiene capa de texto: sale «».
// Se importa adentro de la función para que pdf.js no viaje a ningún otro bundle.
export async function textoDelPdf(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  try {
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } finally {
    await pdf.loadingTask.destroy().catch(() => undefined);
  }
}
