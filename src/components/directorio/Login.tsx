"use client";

import Image from "next/image";
import { useState } from "react";
import { LegalFooter } from "@/components/LegalFooter";
import { createClient } from "@/lib/supabase/client";

// Ingreso PROPIO del Directorio del Café (ya no depende de Kaffetal Regal ni de
// Cherry Picked). Es la misma Supabase Auth del ecosistema, así que entrar con
// el mismo correo o Google que ya usas en KR/CP te reconoce como la misma
// persona. Tras autenticarse, DirectorioExperience recarga y decide la vista
// (inscripción si aún no hay ficha, o la app).
export function Login({
  modoInicial = "entrar",
  onVolver,
}: {
  modoInicial?: "entrar" | "crear";
  onVolver: () => void;
}) {
  const [modo, setModo] = useState<"entrar" | "crear">(modoInicial);
  const [nombre, setNombre] = useState("");
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cambiar = (m: "entrar" | "crear") => {
    setModo(m);
    setError(null);
    setAviso(null);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mail.trim() || !pass) {
      setError("Escribe tu correo y contraseña.");
      return;
    }
    setError(null);
    setAviso(null);
    setCargando(true);
    const supabase = createClient();

    if (modo === "crear") {
      const { data, error: err } = await supabase.auth.signUp({
        email: mail.trim(),
        password: pass,
        options: { data: { full_name: nombre.trim() || undefined } },
      });
      setCargando(false);
      if (err) {
        setError(
          err.message.includes("already registered")
            ? "Ese correo ya tiene una cuenta. Usa «Entrar»."
            : "No se pudo crear la cuenta. Intenta de nuevo."
        );
        return;
      }
      if (!data.session) {
        setAviso("Cuenta creada. Revisa tu correo para confirmarla y luego entra con tu contraseña.");
      }
      // Con sesión inmediata, onAuthStateChange en el padre recarga y muestra la
      // inscripción.
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email: mail.trim(), password: pass });
    setCargando(false);
    if (err) {
      setError("Credenciales inválidas.");
      return;
    }
  };

  const conGoogle = async () => {
    setError(null);
    setAviso(null);
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/directorio/auth/callback` },
    });
  };

  return (
    <>
      <div className="pantalla-login">
        <div className="login">
          <div className="cinta login__cinta" />
          <div className="login__cuerpo">
            <div className="login__marca">
              <Image src="/images/shared/directorio-logo.png" alt="" width={900} height={900} />
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Directorio del café · Colombia</p>
                <h3 style={{ lineHeight: 1 }}>{modo === "crear" ? "Crear mi cuenta" : "Entrar al directorio"}</h3>
              </div>
            </div>

            <div className="segmento" role="group" aria-label="Modo">
              <button type="button" aria-pressed={modo === "entrar"} onClick={() => cambiar("entrar")}>
                <b>Entrar</b><span>Ya tengo cuenta</span>
              </button>
              <button type="button" aria-pressed={modo === "crear"} onClick={() => cambiar("crear")}>
                <b>Crear cuenta</b><span>Es mi primera vez</span>
              </button>
            </div>

            <form onSubmit={enviar}>
              {modo === "crear" ? (
                <div className="campo">
                  <label htmlFor="l-nombre">Nombre completo</label>
                  <input id="l-nombre" value={nombre} autoComplete="name"
                    placeholder="Ej. Marcela Rueda Ardila"
                    onChange={(e) => setNombre(e.target.value)} />
                </div>
              ) : null}
              <div className="campo">
                <label htmlFor="l-mail">Correo electrónico</label>
                <input id="l-mail" type="email" required value={mail} autoComplete="email"
                  placeholder="nombre@correo.com" onChange={(e) => setMail(e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="l-pass">Contraseña</label>
                <input id="l-pass" type="password" required value={pass}
                  autoComplete={modo === "crear" ? "new-password" : "current-password"}
                  placeholder="••••••••" onChange={(e) => setPass(e.target.value)} />
              </div>
              {error ? <p className="aviso-linea" style={{ color: "var(--rojo)" }}>{error}</p> : null}
              {aviso ? <p className="aviso-linea" style={{ color: "var(--verde, #1B3A2C)" }}>{aviso}</p> : null}
              <button className="btn" type="submit" disabled={cargando}
                style={{ width: "100%", justifyContent: "center" }}>
                {cargando ? "Un momento…" : modo === "crear" ? "Crear mi cuenta" : "Entrar a mi panel"}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: ".6rem", margin: ".95rem 0", color: "var(--gris)", fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".08em" }}>
              <span style={{ flex: 1, height: 1, background: "var(--linea, #e6ddf2)" }} />o<span style={{ flex: 1, height: 1, background: "var(--linea, #e6ddf2)" }} />
            </div>

            <button type="button" className="btn btn--fantasma"
              style={{ width: "100%", justifyContent: "center", gap: ".55rem" }} onClick={conGoogle}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.95v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.04l3.01-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.96l3.01 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
              </svg>
              Continuar con Google
            </button>

            <p className="login__pie">
              <a href="#" onClick={(e) => { e.preventDefault(); onVolver(); }}>Volver al inicio</a>
            </p>
          </div>
        </div>
      </div>
      <LegalFooter />
    </>
  );
}
