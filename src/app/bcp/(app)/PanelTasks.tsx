"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setTaskState } from "./dashboardActions";
import styles from "./shared.module.css";

export type PanelTaskItem = {
  key: string;
  icon: string;
  label: string;
  sublabel?: string;
  href: string;
  state: "tbd" | "done";
};

export function PanelTasks({ items }: { items: PanelTaskItem[] }) {
  // Optimistic local state so a toggle feels instant; the server action also
  // revalidates /bcp so a reload reflects the same thing.
  const [states, setStates] = useState<Record<string, "tbd" | "done">>(
    () => Object.fromEntries(items.map((i) => [i.key, i.state]))
  );
  const [, startTransition] = useTransition();

  function toggle(key: string) {
    const next = (states[key] ?? "tbd") === "done" ? "tbd" : "done";
    setStates((s) => ({ ...s, [key]: next }));
    startTransition(async () => {
      try {
        await setTaskState(key, next);
      } catch {
        // Revert on failure.
        setStates((s) => ({ ...s, [key]: next === "done" ? "tbd" : "done" }));
      }
    });
  }

  if (!items.length) {
    return <p className={styles.empty}>Nada pendiente por ahora. Todo al día ✓</p>;
  }

  const tbd = items.filter((i) => (states[i.key] ?? "tbd") === "tbd");
  const done = items.filter((i) => (states[i.key] ?? "tbd") === "done");

  const row = (i: PanelTaskItem) => {
    const isDone = (states[i.key] ?? "tbd") === "done";
    return (
      <div key={i.key} className={`${styles.taskRow} ${isDone ? styles.taskDone : ""}`}>
        <button
          type="button"
          className={styles.taskCheck}
          aria-pressed={isDone}
          title={isDone ? "Marcar como pendiente (TBD)" : "Marcar como hecho"}
          onClick={() => toggle(i.key)}
        >
          {isDone ? "✓" : ""}
        </button>
        <span className={styles.taskIcon} aria-hidden>
          {i.icon}
        </span>
        <Link href={i.href} className={styles.taskLink}>
          <span className={styles.taskLabel}>{i.label}</span>
          {i.sublabel && <span className={styles.taskSub}>{i.sublabel}</span>}
        </Link>
        <span className={isDone ? styles.badgeGood : styles.badgeWarn}>{isDone ? "Hecho" : "TBD"}</span>
      </div>
    );
  };

  return (
    <div>
      <div className={styles.taskList}>{tbd.map(row)}</div>
      {done.length > 0 && (
        <details className={styles.doneWrap}>
          <summary className={styles.doneSummary}>Hechas ({done.length})</summary>
          <div className={styles.taskList}>{done.map(row)}</div>
        </details>
      )}
    </div>
  );
}
