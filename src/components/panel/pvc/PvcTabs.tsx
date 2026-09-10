"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/panel/shared.module.css";

// ── BCP · PVC · las cuatro caras del módulo ──────────────────────────────────
// Ediciones (lo publicado y su historial), Tablero (el modelo con diales),
// Parámetros (las versiones del método) y Dossier (los PDF por versión).
const TABS = [
  { href: "/bcp/pvc", label: "Ediciones", exact: true },
  { href: "/bcp/pvc/tablero", label: "Tablero" },
  { href: "/bcp/pvc/parametros", label: "Parámetros del modelo" },
  { href: "/bcp/pvc/dossier", label: "Dossier" },
];

export function PvcTabs() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabs}>
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={active ? styles.tabActive : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
