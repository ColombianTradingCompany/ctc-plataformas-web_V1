"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Lang } from "./i18n";
import styles from "./LoginModal.module.css";

const EN = {
  aria: "Sign in to Cherry Picked",
  welcome: "Welcome to Cherry Picked",
  sub: "Your orders, points, samples and reserved fractions, in one place.",
  signin: "Sign in",
  signup: "Create account",
  name: "Name",
  namePh: "Your name",
  email: "Email",
  emailPh: "roast@yourroastery.eu",
  password: "Password",
  errEmpty: "Enter your email and password to continue.",
  errExists: "That email already has an account. Use “Sign in” instead of creating a new one.",
  errCreate: "The account couldn't be created. Try again.",
  errCreds: "Invalid credentials.",
  notice: "Account created. Check your email to confirm it, then sign in with your password.",
  loading: "One moment…",
  submitSignup: "Create my account",
  submitSignin: "Sign in",
  or: "or",
  google: "Continue with Google",
  noAccount: "Don't have an account yet? ",
  noAccountCta: "Create one for free",
  hasAccount: "Already have an account? ",
  hasAccountCta: "Sign in here",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    aria: "Iniciar sesión en Cherry Picked",
    welcome: "Bienvenido a Cherry Picked",
    sub: "Tus pedidos, puntos, muestras y fracciones reservadas, en un solo lugar.",
    signin: "Entrar",
    signup: "Crear cuenta",
    name: "Nombre",
    namePh: "Tu nombre",
    email: "Correo electrónico",
    emailPh: "tueste@tutostaduria.eu",
    password: "Contraseña",
    errEmpty: "Escribe tu correo y contraseña para continuar.",
    errExists: "Ese correo ya tiene una cuenta. Usa «Entrar» en vez de crear una nueva.",
    errCreate: "No se pudo crear la cuenta. Intenta de nuevo.",
    errCreds: "Credenciales inválidas.",
    notice: "Cuenta creada. Revisa tu correo para confirmarla y luego entra con tu contraseña.",
    loading: "Un momento…",
    submitSignup: "Crear mi cuenta",
    submitSignin: "Entrar",
    or: "o",
    google: "Continuar con Google",
    noAccount: "¿Aún no tienes cuenta? ",
    noAccountCta: "Crea una gratis",
    hasAccount: "¿Ya tienes cuenta? ",
    hasAccountCta: "Entra aquí",
  },
  de: {
    aria: "Bei Cherry Picked anmelden",
    welcome: "Willkommen bei Cherry Picked",
    sub: "Deine Bestellungen, Punkte, Muster und reservierten Fraktionen an einem Ort.",
    signin: "Anmelden",
    signup: "Konto erstellen",
    name: "Name",
    namePh: "Dein Name",
    email: "E-Mail",
    emailPh: "roestung@deine-roesterei.de",
    password: "Passwort",
    errEmpty: "Gib E-Mail und Passwort ein, um fortzufahren.",
    errExists: "Diese E-Mail hat bereits ein Konto. Nutze „Anmelden“ statt ein neues zu erstellen.",
    errCreate: "Das Konto konnte nicht erstellt werden. Versuch es erneut.",
    errCreds: "Ungültige Zugangsdaten.",
    notice: "Konto erstellt. Bestätige es über den Link in deiner E-Mail und melde dich dann mit deinem Passwort an.",
    loading: "Einen Moment…",
    submitSignup: "Mein Konto erstellen",
    submitSignin: "Anmelden",
    or: "oder",
    google: "Weiter mit Google",
    noAccount: "Noch kein Konto? ",
    noAccountCta: "Erstelle eins kostenlos",
    hasAccount: "Schon ein Konto? ",
    hasAccountCta: "Hier anmelden",
  },
};

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang();
  const t = T[lang];
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
      setError(t.errEmpty);
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
        options: { data: { role: "buyer", full_name: fullName.trim() || undefined } },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message.includes("already registered") ? t.errExists : t.errCreate);
        return;
      }
      if (!data.session) {
        setNotice(t.notice);
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) {
      setError(t.errCreds);
      return;
    }
    // Success: the parent's onAuthStateChange subscription picks up the new
    // session and closes this modal / switches to the logged-in view.
  }

  async function submitGoogle() {
    reset();
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/cherry-picked/auth/callback` },
    });
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel={t.aria}>
      <Image className={styles.mlogo} src="/images/shared/cherry-picked-logo.png" alt="" width={852} height={858} />
      <h3>{t.welcome}</h3>
      <p>{t.sub}</p>

      <div className={styles.tabs}>
        <button type="button" className={`${styles.tab} ${mode === "signin" ? styles.tabActive : ""}`} onClick={() => switchMode("signin")}>
          {t.signin}
        </button>
        <button type="button" className={`${styles.tab} ${mode === "signup" ? styles.tabActive : ""}`} onClick={() => switchMode("signup")}>
          {t.signup}
        </button>
      </div>

      {mode === "signup" && (
        <div className={styles.field}>
          <label htmlFor="cp-name">{t.name}</label>
          <input id="cp-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t.namePh} autoComplete="name" />
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor="cp-email">{t.email}</label>
        <input
          id="cp-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPh}
          autoComplete="email"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="cp-pass">{t.password}</label>
        <input
          id="cp-pass"
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
        {loading ? t.loading : mode === "signup" ? t.submitSignup : t.submitSignin}
      </button>

      <div className={styles.divider}><span>{t.or}</span></div>

      <button type="button" className={styles.googleBtn} onClick={submitGoogle}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.95v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.04l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.96l3.01 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
        </svg>
        {t.google}
      </button>

      <p className={styles.alt}>
        {mode === "signin" ? (
          <>{t.noAccount}<button type="button" className={styles.link} onClick={() => switchMode("signup")}>{t.noAccountCta}</button>.</>
        ) : (
          <>{t.hasAccount}<button type="button" className={styles.link} onClick={() => switchMode("signin")}>{t.hasAccountCta}</button>.</>
        )}
      </p>
    </Modal>
  );
}
