"use client";

// Pestañas del módulo "Catálogo Cherry Picked" (2026-07-21): Contratos y
// Subastas Tyrian dejaron de ser entradas del menú y viven como pestañas aquí.
// Se renderiza al tope de las tres páginas (catalogo, contratos, subastas).

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  // Ofertas primero (V5.18): es donde el trato NACE — el contrato y el
  // catálogo vienen después de que el productor acepte.
  { href: "/ocp/ofertas", label: "Ofertas" },
  { href: "/ocp/catalogo", label: "Catálogo" },
  { href: "/ocp/contratos", label: "Contratos" },
  { href: "/ocp/subastas", label: "Subastas Tyrian" },
];

export function CatalogoTabs() {
  const pathname = usePathname();
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--line)" }}>
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
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
