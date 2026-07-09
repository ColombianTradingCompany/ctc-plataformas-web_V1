import styles from "./shared.module.css";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.empty}>Próximamente. {description}</p>
    </div>
  );
}
