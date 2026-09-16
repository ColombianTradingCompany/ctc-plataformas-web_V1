import Link from "next/link";
import styles from "./consoleScaffold.module.css";

/**
 * `built` marca los módulos que YA existen, para que el scaffold no los niegue.
 * `href` los vuelve navegables: decir "CONSTRUIDO" y dejar al operador buscando
 * en la barra lateral es peor que no decir nada.
 */
export type ScaffoldModule = { name: string; desc: string; built?: boolean; href?: string };

/**
 * El panel de aterrizaje de una consola: la cabecera, un espacio para cifras y
 * el índice de módulos.
 *
 * Nació como andamio para consolas sin módulos construidos, y sigue sirviendo
 * para eso (el ECP). Desde V5.45 acepta `kpis`: cuando una consola YA tiene
 * cifras propias que valga la pena mirar de un vistazo, deja de ser un índice y
 * pasa a ser un tablero — que es exactamente lo que el propio archivo del BCP
 * pedía desde que el pasaporte del lote se fue al OCP. Sin `kpis` se comporta
 * igual que antes.
 */
export function ConsoleScaffold({
  code,
  name,
  intro,
  accent,
  modules,
  kpis,
  badge,
}: {
  code: string;
  name: string;
  intro: string;
  accent: string;
  modules: ScaffoldModule[];
  /** Las cifras de la consola, entre la cabecera y el índice. */
  kpis?: React.ReactNode;
  /** Sustituye la etiqueta de estado. Una consola con cifras ya no está «en construcción». */
  badge?: string;
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
          {badge ??
            (modules.some((m) => m.built)
              ? "Consola en construcción · algunos módulos ya operan"
              : "Scaffolding · módulos por construir")}
        </span>
      </div>
      {kpis}
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
