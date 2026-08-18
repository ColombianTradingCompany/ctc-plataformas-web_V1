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

// «Manejo de Plataformas» SALIÓ de esta tira el 2026-08-18 (PR-B del paso (ii)).
// Direccionamiento se mudó al BCP y Plataformas se quedó en el ECP, así que la
// tira habría cruzado dos consolas — y una pestaña que salta de consola no es
// una pestaña. Sigue alcanzable desde el rail del ECP, y en PR-C se convierte
// en módulo suelto (`/ecp/plataformas`, decisión F6).
const TABS = [
  { href: "/bcp/direccionamiento", label: "Definición de contexto", exact: true },
  { href: "/bcp/direccionamiento/grados", label: "Grados de Calidad" },
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
