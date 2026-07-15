"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/panel/auth.module.css";
import { changeOwnPassword } from "./actions";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await changeOwnPassword(password, confirm);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/panel");
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1>Crea tu contraseña</h1>
        <p>Tu contraseña temporal ya cumplió su trabajo. Elige una definitiva (mínimo 10 caracteres) para continuar.</p>
        <form onSubmit={submit}>
          {error && <span className={styles.err}>{error}</span>}
          <div className={styles.field}>
            <label htmlFor="pw">Nueva contraseña</label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={10}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pw2">Confírmala</label>
            <input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={10}
              required
            />
          </div>
          <button className="btn btn-solid" style={{ width: "100%", padding: 12 }} type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Guardar y entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
