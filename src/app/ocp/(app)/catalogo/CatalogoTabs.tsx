"use client";

// ── Las pestañas de «OCP · Catálogo» (V5.63) ────────────────────────────────
// Hasta la V5.62 eran CUATRO y las mismas en todas las páginas —Ofertas · Catálogo · Contratos · Subastas—,
// porque el rail solo tenía UNA entrada para todo («Catálogo Cherry Picked»). El cuadro del owner le dio a
// cada una su entrada del rail, así que repetirlas aquí era tener dos menús para lo mismo. Quedan las que NO
// están en el rail, y solo en la página a la que pertenecen:
//   · «Catálogo Activo»      → Catálogo · Subastas Tyrian (Tyrian no se oferta: se subasta — D4)
//   · «Ofertas CP Aceptadas» → Contratos · Humedad (la lectura mensual del café bajo contrato — D4)
//   · «Pendiente Oferta»     → ninguna.

import Link from "next/link";
import { usePathname } from "next/navigation";

const GRUPOS: { href: string; label: string }[][] = [
  [
    { href: "/ocp/catalogo", label: "Catálogo" },
    { href: "/ocp/subastas", label: "Subastas Tyrian" },
  ],
  [
    { href: "/ocp/contratos", label: "Contratos" },
    { href: "/ocp/contratos/humedad", label: "Humedad" },
  ],
];

export function CatalogoTabs() {
  const pathname = usePathname();
  const cubre = (href: string) => pathname === href || pathname.startsWith(href + "/");
  // El grupo de la página actual. `/ocp/contratos/humedad` cae en el suyo por el prefijo de Contratos.
  const TABS = GRUPOS.find((g) => g.some((t) => cubre(t.href))) ?? [];
  if (!TABS.length) return null;
  // Gana la pestaña MÁS específica: en `/ocp/contratos/humedad` cubren las dos, y la activa es Humedad.
  const activa = [...TABS].filter((t) => cubre(t.href)).sort((x, y) => y.href.length - x.href.length)[0]?.href;
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--line)" }}>
      {TABS.map((t) => {
        const active = t.href === activa;
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "9px 15px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 13.5,
              color: active ? "var(--ink)" : "var(--muted)",
              borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
