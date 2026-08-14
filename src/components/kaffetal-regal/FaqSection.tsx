"use client";

import { useState } from "react";
import { InfoPanel, type InfoEntry } from "@/components/InfoPanel";
import { useLang } from "@/components/lang/i18n";
import { FAQ } from "@/lib/kaffetal/faq";
import styles from "./FaqSection.module.css";

// ── Preguntas frecuentes (2026-08-11) ────────────────────────────────────────
// Esta sección NO es contenido nuevo: es el desagüe de la reforma. Al dejar la
// página en franjas y titulares, se cayeron del recorrido bloques que decían
// cosas que un caficultor necesita saber antes de abrir una cuenta — cuánto
// cuesta, qué pasa si no gana, cómo se pacta el precio, qué es el EUDR, qué es
// Cherry Picked, los cinco pasos para participar.
//
// Nada de eso se tiró. Vive aquí, en once fichas que se abren al tocarlas: quien
// viene a mirar recorre la página sin tropezar con letra pequeña, y quien viene
// a decidir encuentra TODA la letra pequeña junta y en un solo sitio.
//
// Las respuestas son las de los bloques originales, no un resumen: si el owner
// cambia una cifra, este es el archivo donde se cambia.


export function FaqSection() {
  const t = FAQ[useLang()];
  const [entry, setEntry] = useState<InfoEntry | null>(null);

  return (
    <section id="faq">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>
              {t.h2}
              <em>{t.h2em}</em>
            </h2>
          </div>
          <p>{t.intro}</p>
        </div>

        <p className={styles.hint}>{t.hint}</p>

        <div className={styles.groups}>
          {t.groups.map((g) => (
            <div className={styles.group} key={g.label}>
              <p className={styles.groupLabel}>{g.label}</p>
              <ul className={styles.list}>
                {g.items.map((f) => (
                  <li key={f.q}>
                    <button
                      className={styles.q}
                      onClick={() =>
                        setEntry({
                          key: f.q,
                          eyebrow: g.label,
                          title: f.q,
                          lead: f.lead,
                          bullets: f.bullets,
                          accent: "var(--accent)",
                        })
                      }
                    >
                      <span>{f.q}</span>
                      <i aria-hidden>+</i>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <InfoPanel entry={entry} onClose={() => setEntry(null)} />
    </section>
  );
}
