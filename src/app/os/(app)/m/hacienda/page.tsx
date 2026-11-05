import Link from "next/link";
import styles from "@/components/panel/shared.module.css";

// CTCx OS · módulo «Hacienda» (V6.19, F2 — el esqueleto). PROVISIONAL: la ruta existe, pasa la compuerta de la
// consola y su rail la enciende; todavía no lee nada, así que no enseña ninguna cifra.
export const dynamic = "force-dynamic";

export default function HaciendaPage() {
  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className={styles.title}>Hacienda</h1>
      <p className={styles.meta} style={{ fontSize: 14, marginBottom: 18 }}>
        Este módulo de la CTCx OS está en construcción: todavía no lee datos de la red.
      </p>
      <Link href="/os" className="btn btn-sm">
        Volver a Inicio
      </Link>
    </div>
  );
}
