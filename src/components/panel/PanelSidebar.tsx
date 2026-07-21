"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONSOLE_ORDER, CONSOLES, type PanelConsoleKey } from "@/lib/panel/consoles";
import { BUILD_SHA, VERSION_LABEL } from "@/lib/version";
import styles from "./panel.module.css";

/**
 * Shared rail for the three internal consoles. The switcher at the top lets an
 * operator hop between the consoles they can access (one session, parallel
 * surfaces); below it is the active console's own navigation.
 */
export function PanelSidebar({
  activeConsole,
  identityName,
  accessibleConsoles,
  isOwner,
  onMinimize,
}: {
  activeConsole: PanelConsoleKey;
  identityName: string;
  accessibleConsoles: PanelConsoleKey[];
  isOwner: boolean;
  /** Pliega el rail (solo escritorio; el botón se oculta bajo 1024 px). */
  onMinimize?: () => void;
}) {
  const pathname = usePathname();
  const active = CONSOLES[activeConsole];
  const switchable = CONSOLE_ORDER.filter((k) => accessibleConsoles.includes(k));
  // El gate corre en DOS niveles: el grupo entero, y cada link. Un grupo cuyos
  // links son todos owner-only desaparece completo para un no-owner (nada de
  // encabezados vacíos).
  const navGroups = active.nav
    .filter((g) => !g.ownerOnly || isOwner)
    .map((g) => ({ ...g, links: g.links.filter((l) => !l.ownerOnly || isOwner) }))
    .filter((g) => g.links.length > 0);

  return (
    <nav className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>
          CTC Web Platform
          <span className={styles.brandVersion} title={`Versión ${VERSION_LABEL} · build ${BUILD_SHA}`}>
            {VERSION_LABEL}
          </span>
        </span>
        <span className={styles.brandSub}>Consolas internas · una sesión</span>
        {identityName && <span className={styles.identity}>{identityName}</span>}
      </div>

      {switchable.length > 1 && (
        <div className={styles.switcher} role="group" aria-label="Cambiar de consola">
          {switchable.map((key) => {
            const c = CONSOLES[key];
            const isActive = key === activeConsole;
            return (
              <Link
                key={key}
                href={c.home}
                className={`${styles.switch} ${isActive ? styles.switchActive : ""}`}
                style={isActive ? { background: c.accent } : undefined}
                aria-current={isActive ? "page" : undefined}
                title={c.name}
              >
                {c.code}
              </Link>
            );
          })}
        </div>
      )}
      <span className={styles.switchTag}>{active.name}</span>

      {navGroups.map((group, i) => (
        // Sin label ⇒ submenú separado solo por un divisor (no encabezado).
        <div key={group.label ?? `g${i}`} className={i > 0 ? styles.navGroup : undefined}>
          {group.label && <p className={styles.groupLabel}>{group.label}</p>}
          <ul className={styles.links}>
            {group.links.map((link) => {
              const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link href={link.href} className={isActive ? styles.active : undefined}>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div style={{ flex: 1 }} />
      {onMinimize && (
        <button type="button" className={styles.minimize} onClick={onMinimize}>
          ← Minimizar menú
        </button>
      )}
      <form action="/api/panel/auth/logout" method="post" className={styles.logout}>
        <button className="btn btn-sm" type="submit">
          Cerrar sesión
        </button>
      </form>
    </nav>
  );
}
