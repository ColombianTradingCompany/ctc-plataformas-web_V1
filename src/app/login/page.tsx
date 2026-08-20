"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/components/panel/auth.module.css";
import { PasswordField } from "@/components/PasswordField";
import { hrefRecuperar } from "@/lib/auth/puertas";

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
            <PasswordField id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="btn btn-solid" style={{ width: "100%", padding: 12 }} type="submit" disabled={loading}>
            {loading ? "Verificando…" : "Continuar"}
          </button>
        </form>
        {/* Recuperar aquí NO salta el segundo factor: cambia la contraseña, y
            el código de 6 dígitos sigue pidiéndose al entrar. Para un usuario
            @ctcexport.com sin buzón, el enlace va a su `delivery_email` —
            el mismo campo al que ya viaja su OTP. */}
        <p style={{ fontSize: 13, marginTop: 18, marginBottom: 0, textAlign: "center" }}>
          <Link href={hrefRecuperar("panel")}>¿Olvidaste tu contraseña?</Link>
        </p>
      </div>
    </div>
  );
}
