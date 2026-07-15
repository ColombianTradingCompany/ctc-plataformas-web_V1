"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/panel/auth.module.css";

export default function PanelLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/panel/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error desconocido.");
      return;
    }
    router.push("/verify");
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1>CTC Web Platform</h1>
        <p>Acceso interno. La misma llave abre BCP, ECP y OCP.</p>
        <form onSubmit={submit}>
          {error && <span className={styles.err}>{error}</span>}
          <div className={styles.field}>
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="btn btn-solid" style={{ width: "100%", padding: 12 }} type="submit" disabled={loading}>
            {loading ? "Verificando…" : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
