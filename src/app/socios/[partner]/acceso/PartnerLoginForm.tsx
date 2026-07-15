"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PartnerSlug } from "@/lib/partners/partners";
import styles from "../socios.module.css";

export function PartnerLoginForm({ slug, name }: { slug: PartnerSlug; name: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/socios/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, node: slug }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error desconocido.");
      return;
    }
    router.push(`/socios/${slug}/panel`);
  }

  return (
    <div className={styles.authCard}>
      <h1>{name}</h1>
      <p>Acceso de socios de la red CTC. Tu credencial la emite el equipo de CTC y abre únicamente este módulo.</p>
      <form onSubmit={submit}>
        {error && <span className={styles.err}>{error}</span>}
        <div className={styles.field}>
          <label htmlFor="pemail">Correo electrónico</label>
          <input id="pemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="ppass">Contraseña</label>
          <input id="ppass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        <button className="btn btn-solid" style={{ width: "100%", padding: 12 }} type="submit" disabled={loading}>
          {loading ? "Verificando…" : "Entrar"}
        </button>
      </form>
      <p className={styles.ctaNote} style={{ marginTop: 16 }}>
        <Link href={`/socios/${slug}`}>← Volver a la página del nodo</Link>
      </p>
    </div>
  );
}
