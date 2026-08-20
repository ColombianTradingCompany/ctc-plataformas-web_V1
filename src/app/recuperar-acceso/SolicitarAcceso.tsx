"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/components/panel/auth.module.css";
import propios from "./recuperar.module.css";
import { MINUTOS_DEL_VALE } from "@/lib/auth/veredicto";
import { PUERTAS, type PuertaId } from "@/lib/auth/puertas";
import { solicitarRecuperacion, type Respuesta } from "./actions";

// ── La pantalla que DICE LA VERDAD (V5.12) ──────────────────────────────────
// Decisión del owner, 2026-08-20: si el correo no existe, se dice; si esa
// cuenta entra con Google, se dice. El porqué está en `veredicto.ts`. Lo que
// importa aquí es que cada veredicto termine en una SALIDA, no en un callejón:
// «no existe» ofrece crear cuenta, «solo Google» ofrece el botón de Google,
// «suspendida» ofrece escribir a CTC. Un mensaje de error sin siguiente paso
// deja a la persona exactamente igual de fuera que antes.

export function SolicitarAcceso({ puerta, volver }: { puerta: PuertaId; volver: string }) {
  const [correo, setCorreo] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [res, setRes] = useState<Respuesta | null>(null);

  const nombre = PUERTAS[puerta].nombre;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (estado === "enviando") return;
    setEstado("enviando");
    setRes(null);
    const r = await solicitarRecuperacion(correo, puerta);
    setEstado("idle");
    setRes(r);
  }

  // Enviado con éxito: la pantalla deja de ser un formulario. Volver a mostrar
  // el campo invita a pulsar otra vez y a quemar los tres intentos de la ventana.
  if (res?.estado === "enviado") {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1>Revisa tu correo</h1>
          <p>
            Enviamos un enlace a <b>{res.destino}</b>. Ábrelo para elegir una contraseña nueva.
          </p>
          <p className={propios.dato}>
            El enlace caduca en {MINUTOS_DEL_VALE} minutos y sirve una sola vez. Si no lo ves, mira en la carpeta de
            spam.
          </p>
          {res.destinoDistinto && (
            <p className={propios.dato}>
              Tu usuario de acceso no es un buzón de correo, así que el enlace viajó al correo personal que CTC tiene
              registrado para ti.
            </p>
          )}
          <a className="btn btn-solid" style={{ width: "100%", padding: 12, marginTop: 8 }} href={volver}>
            Volver a {nombre}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1>Recuperar acceso</h1>
        <p>
          Escribe el correo con el que entras a {nombre}. Miramos si existe una cuenta y te decimos qué hacer.
        </p>

        <form onSubmit={enviar}>
          <div className={styles.field}>
            <label htmlFor="rec-correo">Correo electrónico</label>
            <input
              id="rec-correo"
              type="email"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                // El veredicto anterior es de OTRO correo en cuanto se teclea:
                // dejarlo puesto haría que «no existe» siguiera en pantalla
                // mientras se corrige justamente ese error.
                if (res) setRes(null);
              }}
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          {res?.estado === "correo-invalido" && (
            <p className={propios.aviso}>Eso no parece un correo. Revísalo y vuelve a intentarlo.</p>
          )}

          {res?.estado === "sin-cuenta" && (
            <div className={propios.veredicto} data-tono="no">
              <b>No encontramos ninguna cuenta con ese correo.</b>
              <p>
                Revisa que esté bien escrito — un punto o una letra de más es lo más común. Si nunca creaste una
                cuenta, puedes hacerlo gratis en {nombre}.
              </p>
              <a className="btn btn-sm" href={volver}>
                Crear mi cuenta en {nombre}
              </a>
            </div>
          )}

          {res?.estado === "solo-google" && (
            <div className={propios.veredicto} data-tono="ok">
              <b>Esa cuenta entra con Google.</b>
              <p>
                No tiene contraseña que recuperar: se creó con «Continuar con Google», así que ese botón es tu
                entrada. Vuelve a {nombre} y úsalo.
              </p>
              <a className="btn btn-sm btn-solid" href={volver}>
                Entrar con Google en {nombre}
              </a>
            </div>
          )}

          {res?.estado === "bloqueada" && (
            <div className={propios.veredicto} data-tono="no">
              <b>Esa credencial está suspendida.</b>
              <p>{res.motivo}</p>
              <a className="btn btn-sm" href="mailto:info@ctcexport.com">
                Escribir a info@ctcexport.com
              </a>
            </div>
          )}

          {res?.estado === "demasiadas" && (
            <p className={propios.aviso}>
              Ya pediste varios enlaces seguidos. Espera unos minutos y vuelve a intentarlo — o busca el último
              correo que te enviamos, que sigue sirviendo.
            </p>
          )}

          {res?.estado === "fallo" && (
            <p className={propios.aviso}>
              No pudimos enviar el correo en este momento. Inténtalo de nuevo en un minuto; si sigue igual,
              escríbenos a info@ctcexport.com.
            </p>
          )}

          <button
            className="btn btn-solid"
            style={{ width: "100%", padding: 12, marginTop: 8 }}
            type="submit"
            disabled={estado === "enviando" || !correo.trim()}
          >
            {estado === "enviando" ? "Un momento…" : "Continuar"}
          </button>
        </form>

        <p className={propios.pie}>
          <Link href={volver}>← Volver a {nombre}</Link>
        </p>
      </div>
    </div>
  );
}
