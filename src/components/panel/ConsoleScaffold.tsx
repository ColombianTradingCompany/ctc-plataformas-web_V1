import styles from "./consoleScaffold.module.css";

export type ScaffoldModule = { name: string; desc: string };

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
        <span className={styles.badge}>Scaffolding · módulos por construir</span>
      </div>
      <div className={styles.grid}>
        {modules.map((m) => (
          <div key={m.name} className={styles.card} style={{ borderLeftColor: accent }}>
            <span className={styles.cardName}>{m.name}</span>
            <span className={styles.cardDesc}>{m.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
