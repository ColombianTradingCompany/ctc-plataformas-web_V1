import Link from "next/link";
import { redirect } from "next/navigation";
import { CONSOLE_ORDER, CONSOLES } from "@/lib/panel/consoles";
import { requirePanelIdentity } from "@/lib/panel/requireConsoleAccess";
import { ConsoleGlyph } from "@/components/panel/ConsoleGlyph";
import styles from "./hub.module.css";

// The console hub: the neutral landing after the master login. Presents the
// three internal consoles as parallel surfaces. If the operator can reach only
// one, we forward straight into it.
export default async function PanelHubPage() {
  const identity = await requirePanelIdentity();
  const consoles = CONSOLE_ORDER.filter((k) => identity.consoles.includes(k));

  if (consoles.length === 1) redirect(CONSOLES[consoles[0]].home);

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>CTC Web Platform</span>
          <h1>{consoles.length ? "Elige una consola" : "Sin consolas asignadas"}</h1>
          <p>
            {consoles.length
              ? "Una sola sesión, tres consolas paralelas. Puedes cambiar entre ellas en cualquier momento desde la barra lateral."
              : "Tu cuenta no tiene ninguna consola asignada todavía. Pídele a un owner que te conceda acceso desde Usuarios y credenciales."}
          </p>
        </div>
        <div className={styles.grid}>
          {consoles.map((key) => {
            const c = CONSOLES[key];
            return (
              <Link key={key} href={c.home} className={styles.card} style={{ "--acc": c.accent } as React.CSSProperties}>
                <span className={styles.iconBox}>
                  <ConsoleGlyph console={key} size={24} />
                </span>
                <span className={styles.code}>{c.code}</span>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.tag}>{c.tagline}</span>
              </Link>
            );
          })}
        </div>
        <div className={styles.foot}>
          {identity.displayName && <span>Sesión de {identity.displayName}</span>}
          <form action="/api/panel/auth/logout" method="post" className={styles.logout}>
            <button className="btn btn-sm" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
