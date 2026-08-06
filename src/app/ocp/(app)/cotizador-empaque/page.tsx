import type { Metadata } from "next";
import Link from "next/link";
import { QuotesBoard } from "@/components/cotizador/QuotesBoard";
import styles from "@/app/bcp/(app)/shared.module.css";

export const metadata: Metadata = { title: "Costo de empaque · OCP", robots: { index: false, follow: false } };

// Cotizador de Costo de Empaque (2026-08-06). La herramienta es la misma que el
// banco público (`public/tools/costo-empaque.html`) — aquí gana memoria: cada
// configuración se guarda como una cotización más, con su destinatario y su
// historial, y se puede comparar contra las otras en el Cuadro de evaluación.
export default function CotizadorEmpaquePage() {
  return (
    <>
      <div className={styles.card} style={{ marginBottom: 16 }}>
        <div className={styles.sectionHead}>
          <strong>Cuadro de evaluación</strong>
          <Link className="btn btn-sm" href="/ocp/cotizador-empaque/evaluacion">
            Comparar configuraciones →
          </Link>
        </div>
        <p className={styles.meta}>
          Superpone todas las configuraciones guardadas para leerlas por lentes: costo por kilo, de qué se compone ese
          costo, capacidad diaria e inversión. Se elige cuáles entran.
        </p>
      </div>

      <QuotesBoard
        kind="empaque"
        basePath="/ocp/cotizador-empaque"
        title="Costo de empaque por kilo"
        subtitle="Cuánto cuesta empacar un kilo al vacío: bolsa, mano de obra y amortización de la máquina. Cada análisis se guarda con su bolsa y su máquina elegidas, y queda para consultar, comparar y volver a abrir."
      />
    </>
  );
}
