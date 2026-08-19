"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./CarruselHerramientas.module.css";

// ── El carrusel de la landing de Herramientas (A8, 2026-08-19) ───────────────
// Palabra del owner: «a moving carrousel of print screens of the tools with its
// name and their short description, panning similarly to the sneak peek». Las
// herramientas ya NO se abren en la landing — se enseñan aquí y se trabajan en
// el taller, detrás de la puerta.
//
// LA MECÁNICA es la de las cintas de la casa (MarketTicker / SneakPeek): nada
// de @keyframes — un requestAnimationFrame sobre translate3d, porque con CSS
// puro cambiar velocidad al pasar el ratón REINICIA la animación y la cinta
// salta. La lista va dos veces seguidas; cuando la primera copia sale entera,
// se resta su ancho y el bucle no tiene costura.
//
// LAS CAPTURAS son archivos en public/images/herramientas/shots/<id>.jpg,
// generados con scripts/build-tool-shots.mjs (mismo modelo que las tarjetas
// OG: se corren a mano y se comitea el resultado). Una herramienta SIN captura
// —una recién subida por el ECP— cae a su tarjeta de texto con el logo de la
// superficie: el carrusel nunca enseña un hueco roto.

export type TarjetaCarrusel = {
  id: string;
  nombre: string;
  descripcion: string;
  esPlus: boolean;
  soportaMemoria: boolean;
};

const VELOCIDAD = 0.4; // px por frame a 60 fps — pasear, no marear
const DESTINO = "/herramientas/taller";

function Tarjeta({ t }: { t: TarjetaCarrusel }) {
  const [sinCaptura, setSinCaptura] = useState(false);
  return (
    <Link href={`${DESTINO}/${t.id}?volver=${encodeURIComponent(DESTINO)}`} className={styles.tarjeta} draggable={false}>
      <span className={styles.captura}>
        {sinCaptura ? (
          <span className={styles.capturaFalta} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeño de respaldo */}
            <img src="/images/shared/herramientas-logo.png" alt="" />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- captura estática ya dimensionada; next/image no aporta en una cinta duplicada
          <img
            src={`/images/herramientas/shots/${t.id}.jpg`}
            alt=""
            loading="lazy"
            draggable={false}
            onError={() => setSinCaptura(true)}
          />
        )}
        {t.esPlus && <span className={styles.selloPlus}>Plus</span>}
        {t.soportaMemoria && <span className={styles.selloMemoria}>Con memoria</span>}
      </span>
      <b>{t.nombre}</b>
      <span className={styles.desc}>{t.descripcion}</span>
    </Link>
  );
}

export function CarruselHerramientas({ tarjetas }: { tarjetas: TarjetaCarrusel[] }) {
  const cinta = useRef<HTMLDivElement | null>(null);
  const copia = useRef<HTMLDivElement | null>(null);
  const pausada = useRef(false);

  useEffect(() => {
    const el = cinta.current;
    if (!el || tarjetas.length === 0) return;
    // Sin movimiento automático para quien lo pidió: la cinta pasa a scroll
    // manual (el CSS deja overflow-x auto en ese caso).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = 0;
    let raf = 0;
    const paso = () => {
      if (!pausada.current) {
        x -= VELOCIDAD;
        const ancho = copia.current?.offsetWidth ?? 0;
        if (ancho > 0 && -x >= ancho) x += ancho; // costura del bucle
        el.style.transform = `translate3d(${x}px,0,0)`;
      }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [tarjetas.length]);

  if (tarjetas.length === 0) return null;

  return (
    <div
      className={styles.ventana}
      onMouseEnter={() => (pausada.current = true)}
      onMouseLeave={() => (pausada.current = false)}
      onFocusCapture={() => (pausada.current = true)}
      onBlurCapture={() => (pausada.current = false)}
    >
      <div className={styles.cinta} ref={cinta}>
        <div className={styles.tramo} ref={copia}>
          {tarjetas.map((t) => (
            <Tarjeta key={t.id} t={t} />
          ))}
        </div>
        <div className={styles.tramo} aria-hidden>
          {tarjetas.map((t) => (
            <Tarjeta key={`bis-${t.id}`} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
