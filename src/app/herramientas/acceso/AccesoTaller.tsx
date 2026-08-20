"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import styles from "./acceso.module.css";
import { hrefRecuperar } from "@/lib/auth/puertas";

// ── La puerta del taller (A8, 2026-08-19) ────────────────────────────────────
// Palabra del owner: «Herramientas del Café will be ALSO working with a login,
// which may match the credentials of DC and either KR or CP». No hay cuenta
// nueva que crear: es LA identidad única de la red — el mismo correo y la misma
// contraseña de Kaffetal Regal, Cherry Picked o el Directorio entran aquí,
// porque la cookie es una sola y viaja entre subdominios (cookieDomain.ts).
//
// Por lo mismo, quien ya tiene sesión en cualquiera de las tres NI ve esta
// pantalla: la página de servidor lo manda directo al taller.

const PLATAFORMAS =
  process.env.NODE_ENV === "production"
    ? [
        { n: "Kaffetal Regal", href: "https://kaffetal-regal.ctcexport.com" },
        { n: "Cherry Picked", href: "https://cherry-picked-green.ctcexport.com" },
        { n: "Directorio del Café", href: "https://directoriodelcafe.ctcexport.com" },
      ]
    : [
        { n: "Kaffetal Regal", href: "/kaffetal-regal" },
        { n: "Cherry Picked", href: "/cherry-picked-green" },
        { n: "Directorio del Café", href: "/directorio" },
      ];

export function AccesoTaller() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function conGoogle() {
    setError(null);
    // El patrón de la casa (Directorio/KR): el redirect vuelve al callback de
    // ESTA superficie, que canjea el código y manda al taller. La cuenta de
    // Google es la misma identidad única — si ya existe con ese correo, entra
    // a la misma cuenta de siempre.
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/herramientas/auth/callback` },
    });
  }

  async function entrar() {
    if (estado === "enviando") return;
    setEstado("enviando");
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (err) {
      setEstado("error");
      // Un mensaje, no dos: decir si falló el correo O la contraseña confirma
      // qué cuentas existen.
      setError("Correo o contraseña incorrectos. Revisa e intenta de nuevo.");
      return;
    }
    // La cookie ya está puesta; el servidor decide a dónde (el taller).
    router.push("/herramientas/taller");
    router.refresh();
  }

  return (
    <div className={styles.caja}>
      {/* El logotipo de la superficie corona la puerta (owner, V5.8): quien
          llega desde un enlace suelto tiene que ver DÓNDE está entrando. */}
      <Image
        className={styles.marca}
        src="/images/shared/herramientas-logo.png"
        alt="Herramientas del Café"
        width={720}
        height={675}
        priority
      />
      <h1>Entrar al taller</h1>
      <p className={styles.explica}>
        Con tu cuenta de la red — la misma de <b>Kaffetal Regal</b>, <b>Cherry Picked</b> o el{" "}
        <b>Directorio del Café</b>. Aquí no hay registro aparte.
      </p>

      <label className={styles.campo}>
        <span>Correo</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          onKeyDown={(e) => {
            if (e.key === "Enter" && email && pass) entrar();
          }}
        />
      </label>
      <label className={styles.campo}>
        <span>Contraseña</span>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter" && email && pass) entrar();
          }}
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}

      {/* Apilados abajo a la derecha, la convención de la casa: la entrada
          principal encima, Google debajo como alternativa. */}
      <div className={styles.acciones}>
        <button type="button" className="btn btn-solid" onClick={entrar} disabled={estado === "enviando" || !email || !pass}>
          {estado === "enviando" ? "Un momento…" : "Entrar"}
        </button>
        <button type="button" className="btn" onClick={conGoogle} disabled={estado === "enviando"}>
          Entrar con Google
        </button>
      </div>

      <p className={styles.alternativa}>
        <a href={hrefRecuperar("herramientas")}>¿Olvidaste tu contraseña?</a>
      </p>

      <p className={styles.alternativa}>
        ¿Todavía no tienes cuenta? Créala en la plataforma que te corresponda y vuelve — esta página la reconoce sola:
        <br />
        {PLATAFORMAS.map((p, i) => (
          <span key={p.n}>
            {i > 0 && " · "}
            <a href={p.href}>{p.n}</a>
          </span>
        ))}
      </p>
    </div>
  );
}
