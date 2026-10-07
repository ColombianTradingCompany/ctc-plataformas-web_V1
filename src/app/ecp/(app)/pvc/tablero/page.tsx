import type { Metadata } from "next";
import styles from "@/components/panel/shared.module.css";

export const metadata: Metadata = { title: "PVC · Tablero · ECP", robots: { index: false, follow: false } };

// El tablero interactivo va en un <iframe> servido por el route handler
// autenticado de al lado (`embed/route.ts`): es un HTML autocontenido con su
// propio CSS y su propia lógica, y el iframe aísla las dos hojas de estilo —
// el mismo criterio que las herramientas embebidas (lib/tools/catalog.ts).
export default async function PvcTableroPage({ searchParams }: { searchParams: Promise<{ borrador?: string }> }) {
  // V5.179: desde «Edición siguiente» se abre el tablero con el borrador del agente cargado.
  const { borrador } = await searchParams;
  const b = borrador && /^[0-9a-f-]{36}$/i.test(borrador) ? borrador : null;
  return (
    <>
      <h1 className={styles.title}>Tablero del modelo</h1>
      <p className={styles.subtitle}>
        Diales, KPIs y el flujo completo de parámetros. «Publicar Reporte» escribe la edición en la base con la versión vigente del
        modelo; «Historial» lee lo publicado. Los reportes guardados sin publicar se quedan en este navegador.
        {b ? " Está cargado el BORRADOR del agente: revise lo arrastrado (C strip, diferencial, costo, escalamiento, score) antes de publicar." : ""}
      </p>
      <iframe
        src={b ? `/ecp/pvc/tablero/embed?borrador=${b}` : "/ecp/pvc/tablero/embed"}
        title="Tablero PVC"
        style={{ width: "100%", height: "calc(100vh - 220px)", minHeight: 720, border: "1px solid var(--line)", borderRadius: 12, background: "#fff" }}
      />
    </>
  );
}
