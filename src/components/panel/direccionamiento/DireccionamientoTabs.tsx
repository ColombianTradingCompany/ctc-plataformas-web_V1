"use client";

// Las TRES caras de Direccionamiento. Van juntas a propósito: la ficha de
// contexto redacta material de cliente, los Grados de Calidad son la cifra que
// ese material NO puede inventarse (ver la memoria en direccionamientoActions),
// y Manejo de Plataformas es cómo se presenta cada superficie hacia afuera.
//
// Manejo de Plataformas se pidió al principio bajo ECP → IT y Plataforma y el
// owner lo movió aquí (2026-08-15): «tiene que estar fusionado en uno». La
// razón se sostiene sola — son la misma pregunta, qué dice la casa de sí misma;
// tenerlo en dos módulos habría acabado con dos respuestas distintas, que es
// exactamente el problema que los Grados vinieron a arreglar.

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/panel/shared.module.css";

const TABS = [
  { href: "/ecp/direccionamiento", label: "Definición de contexto", exact: true },
  { href: "/ecp/direccionamiento/grados", label: "Grados de Calidad" },
  { href: "/ecp/direccionamiento/plataformas", label: "Manejo de Plataformas" },
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
