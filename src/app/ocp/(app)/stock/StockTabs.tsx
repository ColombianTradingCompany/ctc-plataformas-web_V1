import Link from "next/link";
import { STOCK_PATH } from "@/lib/stock/linaje";
import styles from "./stock.module.css";

// ── Las dos pestañas del Stock CTCx (V5.195): el linaje de las partidas y los Sample Kits que se arman con ellas ──────────────
export function StockTabs({ activa }: { activa: "linaje" | "kits" }) {
  const tabs = [
    { k: "linaje" as const, href: STOCK_PATH, label: "Linaje" },
    { k: "kits" as const, href: `${STOCK_PATH}/sample-kits`, label: "Sample Kits" },
  ];
  return (
    <nav className={styles.tabs} aria-label="Stock CTCx">
      {tabs.map((t) => (
        <Link key={t.k} href={t.href} className={`${styles.tab} ${activa === t.k ? styles.tabActiva : ""}`} aria-current={activa === t.k ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
