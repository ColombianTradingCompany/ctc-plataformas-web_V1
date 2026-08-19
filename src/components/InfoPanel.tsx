"use client";

import { Modal } from "@/components/Modal";
import styles from "./InfoPanel.module.css";

// ── La ventana de información, compartida ────────────────────────────────────
// UNA sola ventana para todos los botones que explican algo sin sacar al lector
// de la página: las cualidades del hero de CTC Home, las puertas del índice de
// la red, los conceptos del Contexto y —desde el 2026-08-11— los grados de
// calidad y los tres factores de Kaffetal Regal.
//
// Vivía en `ctc-home/` y subió aquí el día que Kaffetal Regal necesitó el mismo
// gesto: clic corto, información breve, una salida. Tener dos habría sido tener
// dos maquetados que se despegan con el tiempo.

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
  /** Salidas adicionales, cuando una sola no basta (2026-08-14: la ficha de
   *  Cherry Picked lleva la portada Y CaaS). Se pintan tras `cta`, con el
   *  estilo secundario — la primera salida sigue siendo la principal. */
  ctas?: { href: string; label: string; external?: boolean }[];
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
  /** Letra pequeña al pie, bajo la salida: la nota legal o la aclaración que
   *  debe estar pero no debe competir con la entradilla (2026-08-19 · A5, la
   *  Ley 1581 en la ficha del Directorio). */
  footnote?: React.ReactNode;
};

export function InfoPanel({ entry, onClose }: { entry: InfoEntry | null; onClose: () => void }) {
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
          {(entry.cta || entry.ctas?.length) && (
            <div className={styles.foot}>
              {[...(entry.cta ? [entry.cta] : []), ...(entry.ctas ?? [])].map((cta, i) => (
                <a
                  key={cta.href}
                  className={`btn btn-sm ${i === 0 ? "btn-solid" : ""}`}
                  href={cta.href}
                  {...(cta.external ? { target: "_blank", rel: "noopener" } : {})}
                  // Un enlace a un ancla de ESTA página tiene que cerrar la ventana
                  // al saltar: si no, el navegador baja a la sección y la deja
                  // tapada con el velo del modal encima.
                  onClick={cta.href.startsWith("#") ? onClose : undefined}
                >
                  {cta.label}
                </a>
              ))}
            </div>
          )}
          {/* Va al FINAL, después de la salida: es letra pequeña que debe estar
              y poder leerse, no un obstáculo antes de la acción. */}
          {entry.footnote && <p className={styles.footnote}>{entry.footnote}</p>}
        </div>
      )}
    </Modal>
  );
}
