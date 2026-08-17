"use client";

// ── OCP · Transcripciones · ¿hay algún equipo escuchando? ────────────────────
// El panel decía «esperando al equipo con GPU» sin poder decir si HABÍA alguno
// encendido: una nota podía quedarse en Pendiente toda la noche sin que nada lo
// delatara. Esto lo dice.
//
// El matiz que importa y que la interfaz debe transmitir: la plataforma NO llama
// a ninguna máquina. Es el worker el que pregunta cada pocos segundos y el que
// deja su latido — por eso no hace falta IP fija, ni abrir puertos, ni que el
// equipo sea «alcanzable» desde internet; le basta con salida a la red. Y por eso
// mismo vale CUALQUIER equipo donde se arranque el worker, no uno en concreto.

import { useCallback, useEffect, useState } from "react";
import { listTranscriptWorkers } from "@/lib/transcripciones/actions";
import type { TranscriptWorker } from "@/lib/transcripciones/types";
import styles from "@/app/bcp/(app)/shared.module.css";
import css from "./transcripciones.module.css";

const REFRESH_MS = 20_000;

function ago(seconds: number): string {
  if (seconds < 60) return `hace ${seconds} s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `hace ${h} h` : "hace días";
}

export function useTranscriptWorkers() {
  const [workers, setWorkers] = useState<TranscriptWorker[] | null>(null);
  const refresh = useCallback(() => {
    listTranscriptWorkers().then(setWorkers).catch(() => setWorkers([]));
  }, []);
  useEffect(() => {
    refresh();
    const h = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(h);
  }, [refresh]);
  return workers;
}

/** Carpeta de la herramienta, RELATIVA a la carpeta del proyecto.
 *  A propósito sin ruta absoluta: este repo es público y la ruta lleva el nombre
 *  de usuario. Además cambia de un equipo a otro. */
const TOOL_FOLDER = "reference_html_tools\\_whatsapp-transcript-html";

/** Las instrucciones que faltaban: «enciende worker.ps1» daba por supuesto que
 *  quien lo lee sabe abrir PowerShell en una carpeta. Aquí es un doble clic. */
function HowToStart() {
  return (
    <details className={css.howto}>
      <summary>¿Cómo enciendo un equipo?</summary>
      <ol>
        <li>
          En el equipo que quieras usar (el que tiene la tarjeta gráfica), abre la carpeta{" "}
          <code>{TOOL_FOLDER}</code>, dentro de la carpeta <strong>CTC Web Platform</strong>.
        </li>
        <li>
          Doble clic en <strong><code>Iniciar transcriptor.bat</code></strong>. Se abre una ventana negra:{" "}
          <strong>déjala abierta</strong> mientras quieras que ese equipo trabaje.
        </li>
        <li>
          En menos de un minuto esta misma línea dirá que el equipo está en línea, y las
          transcripciones pendientes se irán haciendo solas.
        </li>
      </ol>
      <p>
        Para pararlo, cierra esa ventana. Si quieres que arranque solo cada vez que enciendas el PC,
        doble clic (una única vez) en <code>Arranque automatico.bat</code> y elige «Activar».
      </p>
      <p>
        La primera vez en un equipo nuevo hay que instalar la herramienta: clic derecho en{" "}
        <code>setup.ps1</code> → «Ejecutar con PowerShell». Descarga varios GB, así que tarda.
      </p>
    </details>
  );
}

/** Una línea: «Equipo GABRIEL-PC en línea» / «Ningún equipo conectado». */
export function WorkersBadge({ workers, verbose = false }: { workers: TranscriptWorker[] | null; verbose?: boolean }) {
  if (workers === null) return <span className={styles.meta}>Comprobando equipos…</span>;

  const online = workers.filter((w) => w.online);
  if (!online.length) {
    const last = workers[0];
    return (
      <div className={css.workers}>
        <span className={`${css.led} ${css.ledOff}`} />
        {/* div, no span: dentro van <details>/<ol>/<p>, que son bloques. */}
        <div>
          <strong>Ningún equipo conectado.</strong>{" "}
          {last && last.secondsAgo < 60 * 60 * 24 * 7
            ? `El último («${last.worker}») se vio ${ago(last.secondsAgo)}. `
            : ""}
          {verbose ? (
            <>
              El trabajo espera hasta que enciendas uno —o mándalo a la nube, que no depende de ninguno.
              <HowToStart />
            </>
          ) : (
            <>Las transcripciones pendientes esperan.</>
          )}
        </div>
      </div>
    );
  }

  const busy = online.filter((w) => w.status === "busy");
  return (
    <div className={css.workers}>
      <span className={`${css.led} ${busy.length ? css.ledBusy : css.ledOn}`} />
      <span>
        {online.map((w, i) => (
          <span key={w.worker}>
            {i > 0 && " · "}
            <strong>{w.worker}</strong>
            {w.gpu ? ` (${w.gpu})` : w.device ? ` (${w.device})` : ""}
            {w.status === "busy" ? " — transcribiendo" : " — libre"}
            <span className={styles.meta}> {ago(w.secondsAgo)}</span>
          </span>
        ))}
        {verbose && (
          <>
            {" "}
            <span className={styles.meta}>
              Vale cualquier equipo donde arranques el worker; no hace falta que sea alcanzable desde
              internet, solo que tenga salida a la red — es él quien pregunta.
            </span>
          </>
        )}
      </span>
    </div>
  );
}
