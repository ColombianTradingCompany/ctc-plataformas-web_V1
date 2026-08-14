"use client";

import { useState } from "react";
import styles from "./YtEmbed.module.css";

// ── El reproductor de YouTube de la casa (2026-08-14) ────────────────────────
// Un solo componente para todos los videos de YouTube de la red (hoy: la
// sección de las tres ofertas en CTC Home y «Bienvenidos al Kaffetal Regal»).
//
// NO monta el iframe de entrada — enseña la MINIATURA del video (imagen
// estática de i.ytimg.com) con un botón de play encima, y solo al clic carga el
// iframe con autoplay. Es el patrón «lite embed» y aquí no es una finura: el
// iframe de YouTube arrastra ~1 MB de JS de terceros, y estas páginas ya pagan
// sus propios videos y animaciones. Quien no toca el video no paga nada.
//
// El dominio es youtube-nocookie.com a propósito: mismo reproductor, sin
// cookies de seguimiento hasta que el usuario da play — cuenta para la política
// de privacidad GDPR pendiente (una preocupación menos que declarar).
//
// El enlace «Ver en YouTube ↗» de debajo siempre está, cargue o no el iframe:
// es la salida a pantalla completa/app que pidió el owner.

/** Cambiar el video de una superficie = cambiar el id que le pasa quien lo
 *  monta (búsquese `YtEmbed` para ver dónde está cada uno). El id es lo que va
 *  tras `watch?v=` en la URL del video. */
export function YtEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className={styles.box}>
      <div className={styles.frame}>
        {playing ? (
          <iframe
            className={styles.iframe}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button type="button" className={styles.poster} onClick={() => setPlaying(true)} aria-label={`▶ ${title}`}>
            {/* hqdefault existe para TODO video (maxresdefault no); 480 px dan
                de sobra para un reproductor que se monta pequeño a propósito. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota de YouTube, fuera del optimizador */}
            <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className={styles.play} aria-hidden>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <figcaption className={styles.caption}>
        <span>{title}</span>
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener">
          YouTube ↗
        </a>
      </figcaption>
    </figure>
  );
}
