"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/panel/shared.module.css";

// ── BCP · Modelo Económico · las caras del módulo ────────────────────────────
// Lectura (qué significa hoy el precio que rige), Ediciones (lo publicado y su
// historial), Tablero (el modelo con diales), Parámetros (las versiones del
// método) y Dossier (los PDF por versión).
//
// Lectura va primera porque es la pregunta que se hace al entrar; el refurbish
// completo (docs/PVC_BCP_PLAN.md §11) la convierte además en la de aterrizaje y
// añade Grados, Marco de mercado y MOQ. Hasta entonces `/bcp/pvc` sigue siendo
// Ediciones: mover la raíz es una mudanza de ruta, con su talón 308.
const TABS = [
  { href: "/bcp/pvc/lectura", label: "Lectura" },
  { href: "/bcp/pvc", label: "Ediciones", exact: true },
  { href: "/bcp/pvc/grados", label: "Grados" },
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
