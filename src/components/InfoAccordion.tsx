import styles from "./InfoAccordion.module.css";

export function InfoAccordion({
  icon,
  title,
  subtitle,
  tone = "accent",
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone?: "accent" | "primary";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className={`${styles.box} ${tone === "primary" ? styles.primary : ""}`} open={defaultOpen}>
      <summary>
        <span className={styles.badge}>{icon}</span>
        <span className={styles.titleWrap}>
          {title}
          <small>{subtitle}</small>
        </span>
        <span className={styles.chev}>▾</span>
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
