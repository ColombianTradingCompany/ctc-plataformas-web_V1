import type { Metadata } from "next";
import styles from "@/components/panel/shared.module.css";
import { ParametrosBoard } from "@/components/panel/pvc/ParametrosBoard";
import { listarVersionesModelo } from "@/lib/pvc/servicio";

export const metadata: Metadata = { title: "PVC · Parámetros · BCP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PvcParametrosPage() {
  const versiones = await listarVersionesModelo();
  return (
    <>
      <h1 className={styles.title}>Parámetros del modelo</h1>
      <p className={styles.subtitle}>
        Cada versión es el conjunto completo de parámetros del método (D2 §13.3): decisiones, calibrados y estimados. Una versión no
        se edita; se registra otra, con su nota de acta, y las ediciones posteriores la usan.
      </p>
      <ParametrosBoard versiones={versiones} />
    </>
  );
}
