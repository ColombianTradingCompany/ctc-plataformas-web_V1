"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BcpSidebar.module.css";

const LINKS = [
  { href: "/bcp", label: "Panel", exact: true },
  { href: "/bcp/productores", label: "Productores" },
  { href: "/bcp/fincas", label: "Fincas" },
  { href: "/bcp/lotes", label: "Lotes" },
  { href: "/bcp/arena", label: "Arena" },
  { href: "/bcp/evaluaciones", label: "Evaluaciones" },
  { href: "/bcp/contratos", label: "Contratos" },
  { href: "/bcp/catalogo", label: "Catálogo Cherry Picked" },
  { href: "/bcp/subastas", label: "Subastas Tyrian" },
  { href: "/bcp/leads", label: "Leads CTC Home" },
];

export function BcpSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>CTC Business Control Panel</span>
        <span className={styles.adminName}>{adminName}</span>
      </div>
      <ul className={styles.links}>
        {LINKS.map((link) => {
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
      <form action="/api/bcp/auth/logout" method="post" className={styles.logout}>
        <button className="btn btn-sm" type="submit">
          Cerrar sesión
        </button>
      </form>
    </nav>
  );
}
