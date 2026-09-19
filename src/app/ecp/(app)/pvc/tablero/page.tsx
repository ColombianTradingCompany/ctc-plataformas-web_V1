import type { Metadata } from "next";
import styles from "@/components/panel/shared.module.css";

export const metadata: Metadata = { title: "PVC · Tablero · ECP", robots: { index: false, follow: false } };

// El tablero interactivo va en un <iframe> servido por el route handler
// autenticado de al lado (`embed/route.ts`): es un HTML autocontenido con su
// propio CSS y su propia lógica, y el iframe aísla las dos hojas de estilo —
// el mismo criterio que las herramientas embebidas (lib/tools/catalog.ts).
export default function PvcTableroPage() {
  return (
    <>
      <h1 className={styles.title}>Tablero del modelo</h1>
      <p className={styles.subtitle}>
        Diales, KPIs y el flujo completo de parámetros. «Publicar Reporte» escribe la edición en la base con la versión vigente del
        modelo; «Historial» lee lo publicado. Los reportes guardados sin publicar se quedan en este navegador.
      </p>
      <iframe
        src="/ecp/pvc/tablero/embed"
        title="Tablero PVC"
        style={{ width: "100%", height: "calc(100vh - 220px)", minHeight: 720, border: "1px solid var(--line)", borderRadius: 12, background: "#fff" }}
      />
    </>
  );
}
