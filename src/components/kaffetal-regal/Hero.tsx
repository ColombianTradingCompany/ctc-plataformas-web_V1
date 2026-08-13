"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./Hero.module.css";

// La promesa (`HeroPromesa`, con su pipeline y el bloque "Lo que hace CTC")
// vivió aquí hasta el 2026-08-13: quedó huérfana en el rediseño del 2026-08-11
// (su contenido drenó al FAQ) y se retiró en el repaso siguiente, tal como lo
// dejó anotado el log de V30. Su diccionario trilingüe se fue con ella.
type Dict = {
  portal: string;
  h1: string;
  h1em: string;
  ctaRegister: string;
  ctaRegisterLead: string;
  ctaWhy: string;
  ctaWhyLead: string;
};

const T: Record<Lang, Dict> = {
  es: {
    portal: "Portal del Productor",
    h1: "¡Reconocemos el valor de un trabajo sobresaliente, ",
    h1em: "que logra un grano extraordinario!",
    ctaRegister: "Registrar mi primer lote",
    ctaRegisterLead: "Su finca y su lote, sin costo",
    ctaWhy: "¿Por qué especialidad?",
    ctaWhyLead: "Antes de empezar",
  },
  en: {
    portal: "Producer Portal",
    h1: "We recognise the value of outstanding work, ",
    h1em: "the kind that yields an extraordinary bean.",
    ctaRegister: "Register my first lot",
    ctaRegisterLead: "Your farm and your lot, at no cost",
    ctaWhy: "Why specialty?",
    ctaWhyLead: "Before you start",
  },
  de: {
    portal: "Produzentenportal",
    h1: "Wir würdigen den Wert herausragender Arbeit, ",
    h1em: "die eine außergewöhnliche Bohne hervorbringt.",
    ctaRegister: "Mein erstes Lot registrieren",
    ctaRegisterLead: "Ihre Finca und Ihr Lot, kostenlos",
    ctaWhy: "Warum Spezialität?",
    ctaWhyLead: "Bevor Sie anfangen",
  },
};

export function Hero({ onLogin, onGo }: { onLogin: () => void; onGo: (id: string) => void }) {
  const t = T[useLang()];

  return (
    <>
      {/* ── La franja de entrada ───────────────────────────────────────────────
          Antes era una foto de paisaje a la derecha y el texto a la izquierda,
          sobre papel. Ahora la portada es el zoom infinito del logo de CTC
          corriendo de fondo, atenuado, y encima solo tres cosas: la frase, los
          dos botones y el logo completo de Kaffetal Regal.

          El bucle NO pasa por next/image a propósito: lo rasterizaría a un solo
          fotograma. Y no decora nada que el texto no diga, así que va oculto a
          los lectores de pantalla; quien garantiza que la frase se lea es el
          velo, no la suerte del fotograma. */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- WebP animado, no debe pasar por next/image */}
          <img src="/images/kaffetal-regal/hero-zoom-logo.webp" alt="" />
        </div>
        <div className={styles.scrim} aria-hidden />

        <div className={`wrap ${styles.band}`}>
          <div className={styles.bandCopy}>
            <h1 className={styles.h1}>
              {t.h1}
              <em>{t.h1em}</em>
            </h1>
            {/* Los mismos botones de ctcexport.com — el sistema `.ctcb` de
                globals.css. El que abre la cuenta lleva el oro con el que la
                casa matriz nombra a Kaffetal Regal; el otro va en tinta para
                que se lea como lo que es: el paso previo, no la puerta. */}
            <div className={styles.heroCta}>
              <button className={`ctcb ctcb-costal ctcb-gold ${styles.big}`} onClick={onLogin}>
                <span className="ctcb-txt">
                  <span className="ctcb-lead">{t.ctaRegisterLead}</span>
                  <span className="ctcb-ask">{t.ctaRegister}</span>
                </span>
                <span className="ctcb-arw" aria-hidden>
                  →
                </span>
              </button>
              <button className={`ctcb ctcb-costal ctcb-ink ${styles.big}`} onClick={() => onGo("oportunidad")}>
                <span className="ctcb-txt">
                  <span className="ctcb-lead">{t.ctaWhyLead}</span>
                  <span className="ctcb-ask">{t.ctaWhy}</span>
                </span>
                <span className="ctcb-arw" aria-hidden>
                  ↓
                </span>
              </button>
            </div>
          </div>

          {/* El logo COMPLETO, no la insignia redonda que llevaba el pie de la
              foto: monograma, palabra y lema. Va en la versión crema con alfa
              —el original es verde oscuro sobre blanco y sobre este fondo
              desaparecería dos veces: por el plato blanco y por la tinta. */}
          <div className={styles.bandMark}>
            <span className={styles.portal}>{t.portal}</span>
            <Image
              className={styles.krfull}
              src="/images/shared/kaffetal-regal-logo-cream.webp"
              alt="Kaffetal Regal · cafés de Colombia, para el mundo"
              width={874}
              height={718}
              preload
            />
          </div>
        </div>
      </section>
    </>
  );
}
