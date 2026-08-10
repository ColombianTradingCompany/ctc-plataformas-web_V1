"use client";

// Las dos caras de Direccionamiento. Van juntas a propósito: la ficha de
// contexto redacta material de cliente, y los Grados de Calidad son la cifra
// que ese material NO puede inventarse (ver la memoria en direccionamientoActions).

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/bcp/(app)/shared.module.css";

const TABS = [
  { href: "/ecp/direccionamiento", label: "Definición de contexto", exact: true },
  { href: "/ecp/direccionamiento/grados", label: "Grados de Calidad" },
];

export function DireccionamientoTabs() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabs}>
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? styles.tabActive : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
