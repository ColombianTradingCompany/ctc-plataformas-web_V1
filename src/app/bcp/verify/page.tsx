"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

export default function BcpVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/bcp/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error desconocido.");
      return;
    }
    router.push("/bcp");
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1>Confirma tu identidad</h1>
        <p>Enviamos un código de 6 dígitos al correo de seguridad de CTC.</p>
        <form onSubmit={submit}>
          {error && <span className={styles.err}>{error}</span>}
          <div className={styles.field}>
            <label htmlFor="code">Código de confirmación</label>
            <input
              id="code"
              className={styles.code}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
          </div>
          <button className="btn btn-solid" style={{ width: "100%", padding: 12 }} type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
