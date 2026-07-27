"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unlockGvgSpace } from "@/lib/gvg/lockActions";
import styles from "./gvg.module.css";

/** Password gate for the GVG-Space. On success the server sets the unlock
 *  cookie, so a refresh re-renders the layout with the space open. */
export function GvgGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await unlockGvgSpace(password);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
        setBusy(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.gateWrap}>
      <form className={styles.gateCard} onSubmit={submit}>
        <div className={styles.gateGlyph} aria-hidden>
          🔒
        </div>
        <h1 className={styles.gateTitle}>GVG-Space</h1>
        <p className={styles.gateSub}>Personal workspace. Enter the space password to continue.</p>
        <input
          className={styles.gateInput}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="off"
          aria-label="GVG-Space password"
        />
        <button className={styles.gateBtn} type="submit" disabled={busy || !password}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
        {error && <p className={styles.gateError}>{error}</p>}
      </form>
    </div>
  );
}
