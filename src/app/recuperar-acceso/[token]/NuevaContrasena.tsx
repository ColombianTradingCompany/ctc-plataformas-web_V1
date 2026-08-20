"use client";

import { useState } from "react";
import styles from "@/components/panel/auth.module.css";
import propios from "../recuperar.module.css";
import { PasswordField } from "@/components/PasswordField";
import { MINIMO_CONTRASENA } from "@/lib/auth/veredicto";
import { guardarContrasenaNueva } from "../actions";

// El segundo paso. Mismo formulario que `/cambiar-contrasena` a propósito —
// misma tarea, mismas reglas (las de `validarContrasena`, que las dos pantallas
// comparten) y así nadie tiene que aprender dos.
export function NuevaContrasena({
  token,
  correo,
  nombrePuerta,
  volver,
}: {
  token: string;
  correo: string;
  nombrePuerta: string;
  volver: string;
}) {
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    const res = await guardarContrasenaNueva(token, nueva, confirmacion);
    setGuardando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // No se redirige sola: la persona acaba de cambiar su contraseña y conviene
    // que lea que quedó hecha antes de aterrizar en un login pidiéndosela.
    setListo(true);
  }

  if (listo) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1>Listo</h1>
          <p>
            Tu contraseña quedó cambiada. Entra a {nombrePuerta} con <b>{correo}</b> y la contraseña que acabas de
            elegir.
          </p>
          <p className={propios.dato}>
            Es la misma cuenta de toda la red CTC: esta contraseña te sirve en cualquier plataforma donde ya entrabas
            con este correo.
          </p>
          <a className="btn btn-solid" style={{ width: "100%", padding: 12, marginTop: 8 }} href={volver}>
            Entrar a {nombrePuerta}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1>Elige tu contraseña nueva</h1>
        <p>
          Para la cuenta <b>{correo}</b>. Mínimo {MINIMO_CONTRASENA} caracteres.
        </p>
        <form onSubmit={enviar}>
          {error && <span className={styles.err}>{error}</span>}
          <div className={styles.field}>
            <label htmlFor="nueva">Nueva contraseña</label>
            <PasswordField
              id="nueva"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              autoComplete="new-password"
              minLength={MINIMO_CONTRASENA}
              autoFocus
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nueva2">Confírmala</label>
            <PasswordField
              id="nueva2"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              autoComplete="new-password"
              minLength={MINIMO_CONTRASENA}
              required
            />
          </div>
          <button
            className="btn btn-solid"
            style={{ width: "100%", padding: 12 }}
            type="submit"
            disabled={guardando || !nueva || !confirmacion}
          >
            {guardando ? "Guardando…" : "Guardar y entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
