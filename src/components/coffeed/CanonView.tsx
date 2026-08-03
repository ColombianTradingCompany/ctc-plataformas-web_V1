"use client";

// ── Coffeed · Canon ──────────────────────────────────────────────────────────
// La memoria narrativa, compartida por las dos consolas del reparto 2026-08-03:
//   · en el TALLER (Estudio · Source Wrapper) se ESCRIBE — el trigger
//     coffeed_update_canon mueve los hilos al aceptar un borrador.
//   · en el ECP se LEE en espejo: quien da luz verde necesita ver qué hilo
//     continúa una pieza antes de publicarla, pero no lo edita desde ahí.

import type { CoffeedThread } from "@/lib/coffeed/types";
import styles from "./coffeedConsole.module.css";

export function CanonView({ threads, mirror = false }: { threads: CoffeedThread[]; mirror?: boolean }) {
  return (
    <section>
      <div className={styles.viewhead}>
        <span className={styles.eyebrow}>Memoria narrativa</span>
        <h1>Canon</h1>
        <p>
          Lo que ya contamos y lo que quedó abierto. Sin esto, cada capítulo sería huérfano. {mirror ? "Se escribe en el taller; aquí se consulta." : "Se actualiza solo al aceptar un borrador:"} el
          hilo que el capítulo continúa se marca, y el que abre nace aquí.
        </p>
      </div>
      {threads.length === 0 ? (
        <div className={styles.empty}>
          <h3>El canon está por escribirse</h3>
          <p>Los hilos nacen cuando un capítulo publicado abre uno. El primero estrena la memoria.</p>
        </div>
      ) : (
        <div className={styles.threads}>
          {threads.map((t) => (
            <div key={t.id} className={styles.threadRow}>
              <div>
                <div className={styles.threadName}>{t.name}</div>
                <div className={styles.eyebrow}>
                  {t.openedIn != null ? `Abierto en cap. ${t.openedIn}` : "Origen sin registrar"}
                  {t.lastSeenIn != null ? ` · última mención: cap. ${t.lastSeenIn}` : ""}
                </div>
                {t.summary && <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{t.summary}</div>}
              </div>
              <span className={`${styles.stateChip} ${t.state === "open" ? styles.stateOpen : t.state === "paused" ? styles.statePaused : styles.stateClosed}`}>
                {t.state === "open" ? "Abierto" : t.state === "paused" ? "En pausa" : "Cerrado"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
