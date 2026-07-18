import Link from "next/link";
import styles from "./consoleScaffold.module.css";

/**
 * `built` marca los módulos que YA existen, para que el scaffold no los niegue.
 * `href` los vuelve navegables: decir "CONSTRUIDO" y dejar al operador buscando
 * en la barra lateral es peor que no decir nada.
 */
export type ScaffoldModule = { name: string; desc: string; built?: boolean; href?: string };

/**
 * Placeholder dashboard for a console whose modules aren't built yet. Instead of
 * a bare "Próximamente" it lays out the planned modules from the v3 vision, so
 * the console reads as a real (if empty) surface.
 */
export function ConsoleScaffold({
  code,
  name,
  intro,
  accent,
  modules,
}: {
  code: string;
  name: string;
  intro: string;
  accent: string;
  modules: ScaffoldModule[];
}) {
  return (
    <div>
      <div className={styles.head}>
        <span className={styles.code} style={{ color: accent }}>
          {code}
        </span>
        <h1 className={styles.title}>{name}</h1>
        <p className={styles.intro}>{intro}</p>
        <span className={styles.badge}>
          {modules.some((m) => m.built)
            ? "Consola en construcción · algunos módulos ya operan"
            : "Scaffolding · módulos por construir"}
        </span>
      </div>
      <div className={styles.grid}>
        {modules.map((m) => {
          const body = (
            <>
              <span className={styles.cardName}>
                {m.name}
                {m.built && <> ✓</>}
              </span>
              <span className={styles.cardDesc}>{m.desc}</span>
            </>
          );
          const style = { borderLeftColor: accent, opacity: m.built ? 1 : 0.72 };
          return m.href ? (
            <Link key={m.name} href={m.href} className={styles.card} style={{ ...style, textDecoration: "none" }}>
              {body}
            </Link>
          ) : (
            <div key={m.name} className={styles.card} style={style}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
