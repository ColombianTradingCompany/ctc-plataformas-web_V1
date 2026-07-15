"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BcpSidebar.module.css";

// El panel interno ahora se piensa como MÓDULOS: BCP (negocio, todo lo que ya
// existe), ECP (Execution Control Panel) y OCP (Operation Control Panel) — los
// dos últimos son scaffolding con "Próximamente"; el detalle viene después.
// "Administración" cierra con la futura gestión de usuarios colaboradores
// (ver docs/BCP_USER_ADMIN_PLAN.md).
type NavLink = { href: string; label: string; exact?: boolean };
type NavGroup = { label: string; links: NavLink[] };

const GROUPS: NavGroup[] = [
  {
    label: "BCP · Negocio",
    links: [
      { href: "/bcp", label: "Panel", exact: true },
      { href: "/bcp/productores", label: "Productores" },
      { href: "/bcp/club", label: "Kaffetal Club" },
      { href: "/bcp/fincas", label: "Fincas" },
      { href: "/bcp/lotes", label: "Lotes" },
      { href: "/bcp/arena", label: "Arena" },
      { href: "/bcp/evaluaciones", label: "Evaluaciones" },
      { href: "/bcp/contratos", label: "Contratos" },
      { href: "/bcp/catalogo", label: "Catálogo Cherry Picked" },
      { href: "/bcp/subastas", label: "Subastas Tyrian" },
      { href: "/bcp/leads", label: "Leads CTC Home" },
    ],
  },
  {
    label: "ECP · Ejecución",
    links: [{ href: "/bcp/ecp", label: "Panel ECP" }],
  },
  {
    label: "OCP · Operación",
    links: [{ href: "/bcp/ocp", label: "Panel OCP" }],
  },
  {
    label: "Administración",
    links: [{ href: "/bcp/usuarios", label: "Usuarios" }],
  },
];

export function BcpSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>CTC Control Panels</span>
        <span className={styles.adminName}>{adminName}</span>
      </div>
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className={styles.groupLabel}>{group.label}</p>
          <ul className={styles.links}>
            {group.links.map((link) => {
              const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link href={link.href} className={active ? styles.active : undefined}>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <form action="/api/bcp/auth/logout" method="post" className={styles.logout}>
        <button className="btn btn-sm" type="submit">
          Cerrar sesión
        </button>
      </form>
    </nav>
  );
}
