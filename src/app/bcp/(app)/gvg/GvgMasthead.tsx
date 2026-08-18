"use client";

import { useRouter } from "next/navigation";
import { lockGvgSpace } from "@/lib/gvg/lockActions";
import styles from "./gvg.module.css";

/** Blue masthead shared by every GVG-Space page, with the re-lock button. */
export function GvgMasthead({ sub }: { sub?: string }) {
  const router = useRouter();
  return (
    <header className={styles.masthead}>
      <div>
        <h1 className={styles.brand}>GVG-Space</h1>
        <span className={styles.brandSub}>{sub ?? "Personal workspace · Gabriel Vasquez"}</span>
      </div>
      <div className={styles.mastActions}>
        <button
          type="button"
          className={styles.lockBtn}
          onClick={async () => {
            await lockGvgSpace();
            router.refresh();
          }}
        >
          🔒 Lock space
        </button>
      </div>
    </header>
  );
}
