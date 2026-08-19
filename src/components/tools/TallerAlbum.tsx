"use client";

import { useState } from "react";
import Link from "next/link";
import { CapturaMiniatura } from "./CapturaMiniatura";
import styles from "./TallerAlbum.module.css";

// ── El taller como CARÁTULAS (owner, 2026-08-20 · V5.7) ─────────────────────
// «Instead of a block list for the apps, an Album Cover type pane, touching
// one flips the album cover to see more.» La carátula es la captura de la
// herramienta; tocarla la VOLTEA (rotateY, la mecánica de las tarjetas del
// Sneak Peek) y el reverso trae el detalle: qué es, tu estado Plus dicho con
// todas las letras (la queja del owner: tenía Plus y nada se lo decía), tus
// trabajos guardados y las salidas — apiladas abajo a la derecha, la
// convención de la casa.
//
// El reverso NO es un enlace gigante a propósito: la carátula voltea, y solo
// los botones del reverso navegan. Tocar para mirar y tocar para abrir son
// dos gestos distintos — mezclarlos abre herramientas sin querer.

export type AlbumHerramienta = {
  id: string;
  nombre: string;
  descripcion: string;
  esPlus: boolean;
  soportaMemoria: boolean;
  abre: boolean;
  /** Solo cuando esPlus y abre: cómo — para decir «activa en tu cuenta». */
  viaPlus: "permiso" | "comodin-heredado" | null;
  sePuedeSolicitar: boolean;
  trabajos: number;
};

export function TallerAlbum({ herramientas }: { herramientas: AlbumHerramienta[] }) {
  const [volteada, setVolteada] = useState<string | null>(null);

  return (
    <div className={styles.rejilla}>
      {herramientas.map((h) => {
        const abierta = volteada === h.id;
        return (
          <div key={h.id} className={`${styles.celda}${abierta ? ` ${styles.girada}` : ""}`}>
            <div className={styles.carta}>
              {/* Carátula */}
              <button
                type="button"
                className={styles.cara}
                onClick={() => setVolteada(abierta ? null : h.id)}
                aria-expanded={abierta}
                aria-label={`${h.nombre} — tocar para ver el detalle`}
              >
                <CapturaMiniatura toolId={h.id} className={styles.portada} />
                <span className={styles.banda}>
                  <b>{h.nombre}</b>
                  <span className={styles.bandaSellos}>
                    {h.esPlus && (
                      <i className={h.abre ? styles.selloActiva : styles.selloPlus}>{h.abre ? "Plus ✓" : "Plus"}</i>
                    )}
                    {h.soportaMemoria && <i className={styles.selloMemoria}>Memoria</i>}
                  </span>
                </span>
              </button>

              {/* Reverso */}
              <div className={styles.reverso} aria-hidden={!abierta}>
                <button
                  type="button"
                  className={styles.cerrar}
                  onClick={() => setVolteada(null)}
                  tabIndex={abierta ? 0 : -1}
                  aria-label="Volver a la carátula"
                >
                  ×
                </button>
                <h2>{h.nombre}</h2>
                {h.esPlus && (
                  <p className={h.abre ? styles.plusActiva : styles.plusBloqueada}>
                    {h.abre
                      ? h.viaPlus === "comodin-heredado"
                        ? "Plus · ACTIVA en tu cuenta (activación de la red)"
                        : "Plus · ACTIVA en tu cuenta"
                      : "Plus · se activa por solicitud"}
                  </p>
                )}
                <p className={styles.desc}>{h.descripcion}</p>
                {h.soportaMemoria && (
                  <p className={styles.trabajos}>
                    {h.trabajos > 0
                      ? `${h.trabajos} trabajo${h.trabajos === 1 ? "" : "s"} guardado${h.trabajos === 1 ? "" : "s"}`
                      : "Guarda trabajos con nombre y fecha"}
                  </p>
                )}
                <div className={styles.acciones}>
                  <Link
                    href={`/herramientas/taller/${h.id}?volver=${encodeURIComponent("/herramientas/taller")}`}
                    className="btn btn-sm btn-solid"
                    tabIndex={abierta ? 0 : -1}
                  >
                    {h.abre ? "Abrir →" : h.sePuedeSolicitar ? "Ver y solicitar →" : "Ver →"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
