"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import styles from "./LoginModal.module.css";

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setError(null);
    setNotice(null);
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    reset();
  }

  async function submit() {
    if (!email.trim() || !password) {
      setError("Escriba su correo y contraseña para continuar.");
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { role: "producer", full_name: fullName.trim() || undefined } },
      });
      setLoading(false);
      if (signUpError) {
        setError(
          signUpError.message.includes("already registered")
            ? "Ese correo ya tiene una cuenta. Use «Entrar» en vez de crear una nueva."
            : "No se pudo crear la cuenta. Intente de nuevo."
        );
        return;
      }
      if (!data.session) {
        setNotice("Cuenta creada. Revise su correo para confirmarla y luego entre con su contraseña.");
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) {
      setError("Credenciales inválidas.");
      return;
    }
    // Success: the parent's onAuthStateChange subscription picks up the new
    // session and closes this modal / switches to the dashboard.
  }

  async function submitGoogle() {
    reset();
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/kaffetal-regal/auth/callback` },
    });
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Bienvenido a Kaffetal Regal">
      <Image className={styles.mlogo} src="/images/shared/kaffetal-regal-logo.png" alt="" width={1254} height={1254} />
      <h3>Bienvenido a Kaffetal Regal</h3>
      <p>Cuenta gratuita. Registre sus fincas y sus lotes, siga su fila para la Arena y administre sus tratos con CTC.</p>

      <div className={styles.tabs}>
        <button type="button" className={`${styles.tab} ${mode === "signin" ? styles.tabActive : ""}`} onClick={() => switchMode("signin")}>
          Entrar
        </button>
        <button type="button" className={`${styles.tab} ${mode === "signup" ? styles.tabActive : ""}`} onClick={() => switchMode("signup")}>
          Crear cuenta
        </button>
      </div>

      {mode === "signup" && (
        <div className={styles.field}>
          <label htmlFor="kr-name">Nombre del agricultor</label>
          <input id="kr-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="María Rodríguez" autoComplete="name" />
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor="kr-email">Correo electrónico</label>
        <input
          id="kr-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="maria@fincaelroble.co"
          autoComplete="email"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="kr-pass">Contraseña</label>
        <input
          id="kr-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {error && <span className={styles.err}>{error}</span>}
        {notice && <span className={styles.notice}>{notice}</span>}
      </div>
      <button className="btn btn-solid" style={{ width: "100%", marginTop: 8, padding: 12 }} onClick={submit} disabled={loading}>
        {loading ? "Un momento…" : mode === "signup" ? "Crear mi cuenta" : "Entrar a mi panel"}
      </button>

      <div className={styles.divider}><span>o</span></div>

      <button type="button" className={styles.googleBtn} onClick={submitGoogle}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.95v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.04l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.96l3.01 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
        </svg>
        Continuar con Google
      </button>

      <p className={styles.alt}>
        {mode === "signin" ? (
          <>¿Primera vez? <button type="button" className={styles.link} onClick={() => switchMode("signup")}>Cree su cuenta gratis</button>.</>
        ) : (
          <>¿Ya tiene cuenta? <button type="button" className={styles.link} onClick={() => switchMode("signin")}>Entre aquí</button>.</>
        )}
      </p>
    </Modal>
  );
}
