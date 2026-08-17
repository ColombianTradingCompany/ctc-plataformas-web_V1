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

/** Una línea: «Equipo GABRIEL-PC en línea» / «Ningún equipo conectado». */
export function WorkersBadge({ workers, verbose = false }: { workers: TranscriptWorker[] | null; verbose?: boolean }) {
  if (workers === null) return <span className={styles.meta}>Comprobando equipos…</span>;

  const online = workers.filter((w) => w.online);
  if (!online.length) {
    const last = workers[0];
    return (
      <span className={css.workers}>
        <span className={`${css.led} ${css.ledOff}`} />
        <span>
          <strong>Ningún equipo conectado.</strong>{" "}
          {last && last.secondsAgo < 60 * 60 * 24 * 7
            ? `El último («${last.worker}») se vio ${ago(last.secondsAgo)}. `
            : ""}
          {verbose && (
            <>
              Enciende <code>.\worker.ps1</code> en la carpeta de la herramienta y la cola se vacía sola
              —o manda el trabajo a la nube, que no depende de ningún equipo.
            </>
          )}
        </span>
      </span>
    );
  }

  const busy = online.filter((w) => w.status === "busy");
  return (
    <span className={css.workers}>
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
    </span>
  );
}
