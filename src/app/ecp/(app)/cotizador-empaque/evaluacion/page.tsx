import type { Metadata } from "next";
import Link from "next/link";
import { EvaluationBoard } from "./EvaluationBoard";
import { QUOTE_BASE_PATH } from "@/lib/cotizador/types";
import styles from "@/components/panel/shared.module.css";

export const metadata: Metadata = { title: "Evaluación de empaque · ECP", robots: { index: false, follow: false } };

// Cuadro de evaluación (2026-08-06): todas las configuraciones guardadas de
// costo de empaque, superpuestas y leídas por lentes. Ver EvaluationBoard.
export default function EvaluacionEmpaquePage() {
  return (
    <>
      <h1 className={styles.title}>Cuadro de evaluación · Costo de empaque</h1>
      <p className={styles.subtitle}>
        Las configuraciones guardadas, una encima de otra. Cada lente hace una pregunta distinta sobre las mismas
        cotizaciones: ninguna decide sola —la máquina más barata suele ser la de menor capacidad— y por eso se cambia de
        lente sin cambiar de comparación.
      </p>
      <p className={styles.meta} style={{ marginBottom: 14 }}>
        <Link className={styles.backLink} href={QUOTE_BASE_PATH.empaque}>← Volver al cotizador</Link>
      </p>
      <EvaluationBoard />
    </>
  );
}
