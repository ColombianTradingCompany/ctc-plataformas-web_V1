import Link from "next/link";
import { CONSOLES } from "@/lib/panel/consoles";
import styles from "@/components/panel/shared.module.css";

// CTCx OS · Inicio (V6.19, F2 — el esqueleto). PROVISIONAL: la ruta existe y pasa la compuerta, pero todavía no
// lee nada. Los lectores (solo lectura, solo cifras y enlaces a la consola dueña de cada pieza) llegan en los
// pasos siguientes de F2; hasta entonces esta página no enseña ni una cifra, para no enseñar una inventada.
export const dynamic = "force-dynamic";

export default function OsInicioPage() {
  const c = CONSOLES.os;
  const modulos = c.nav.flatMap((g) => g.links).filter((l) => l.href !== c.home);
  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className={styles.title}>{c.name}</h1>
      <p className={styles.meta} style={{ fontSize: 14, marginBottom: 18 }}>
        {c.tagline}. Esta consola está en construcción: todavía no lee datos de la red.
      </p>
      <ul style={{ listStyle: "none", display: "grid", gap: 12 }}>
        {modulos.map((m) => (
          <li key={m.href} className={styles.card}>
            <h3>{m.label}</h3>
            <Link href={m.href} className="btn btn-sm">
              Abrir
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
