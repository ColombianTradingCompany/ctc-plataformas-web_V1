"use client";

import { Modal } from "@/components/Modal";
import styles from "./InfoModal.module.css";

// ── CTC Home · la ventana de información compartida ──────────────────────────
// UNA sola ventana para las tres familias de botones que se abren en la página:
// las cuatro cualidades del hero, las puertas del índice de la red (que antes
// eran la sección «Oferta 3» entera) y los cinco conceptos del Contexto.
//
// Se hizo compartida a propósito: son tres sitios distintos con el mismo gesto
// —clic corto, información breve, una salida— y tenerlas separadas habría
// significado tres maquetados que se van despegando con el tiempo.

export type InfoEntry = {
  /** Identifica la entrada abierta. No se muestra. */
  key: string;
  /** La línea pequeña sobre el título (procedencia, familia, oferta…). */
  eyebrow?: string;
  title: string;
  /** Una o dos frases. Es lo primero que se lee. */
  lead?: React.ReactNode;
  /** Frases cortas. La ventana no es un artículo. */
  bullets?: React.ReactNode[];
  /** El pie: a dónde lleva esto, si lleva a alguna parte. */
  cta?: { href: string; label: string; external?: boolean };
  /** Color de acento de la ventana (el de la puerta, el del grado…). */
  accent?: string;
  /** Imagen de cabecera, si la entrada tiene cara propia. */
  image?: string;
  /** true cuando esa cara es un LOGOTIPO: se dibuja entero sobre plato claro
   *  en vez de recortarse a la franja, que le cortaría la mitad. */
  imageContain?: boolean;
  /** Contenido libre bajo los puntos: un gráfico, una tabla. Lo usa la cualidad
   *  «Catálogo de dos cosechas anuales», que enseña el calendario del año. */
  node?: React.ReactNode;
  /** Ventana ancha. Un calendario de doce meses no cabe en 560 px. */
  wide?: boolean;
};

export function InfoModal({ entry, onClose }: { entry: InfoEntry | null; onClose: () => void }) {
  return (
    <Modal
      open={!!entry}
      onClose={onClose}
      ariaLabel={entry?.title}
      className={`${styles.box}${entry?.wide ? ` ${styles.boxWide}` : ""}`}
    >
      {entry && (
        <div
          className={styles.inner}
          style={entry.accent ? ({ "--ia": entry.accent } as React.CSSProperties) : undefined}
        >
          {entry.image && (
            // eslint-disable-next-line @next/next/no-img-element -- fondo decorativo de la ventana, ya dimensionado
            <img
              className={`${styles.shot}${entry.imageContain ? ` ${styles.shotLogo}` : ""}`}
              src={entry.image}
              alt=""
              aria-hidden
            />
          )}
          {entry.eyebrow && <p className={styles.eyebrow}>{entry.eyebrow}</p>}
          <h3 className={styles.title}>{entry.title}</h3>
          {entry.lead && <p className={styles.lead}>{entry.lead}</p>}
          {entry.bullets && entry.bullets.length > 0 && (
            <ul className={styles.bullets}>
              {entry.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
          {entry.node && <div className={styles.node}>{entry.node}</div>}
          {entry.cta && (
            <div className={styles.foot}>
              <a
                className="btn btn-sm btn-solid"
                href={entry.cta.href}
                {...(entry.cta.external ? { target: "_blank", rel: "noopener" } : {})}
                // Un enlace a un ancla de ESTA página tiene que cerrar la ventana
                // al saltar: si no, el navegador baja a la sección y la deja
                // tapada con el velo del modal encima.
                onClick={entry.cta.href.startsWith("#") ? onClose : undefined}
              >
                {entry.cta.label}
              </a>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
