"use client";

import { useEffect, useState } from "react";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import type { SneakPeekLang, SneakPeekLot, SneakPeekPayload } from "@/lib/catalogo/sneakPeek";
import styles from "./SneakPeek.module.css";

// ── «Active Catalogue Sneak Peek» · el módulo reutilizable ───────────────────
// Una cinta con las tarjetas de los lotes del Catálogo Activo, SIN nada
// comercial, para que quien llega de fuera vea de un golpe qué hay y de dónde
// viene. El catálogo completo —precios, MOQ, kilos, reservas— vive detrás del
// login de Cherry Picked; esta cinta es lo que lo REEMPLAZA en las landings de
// la familia CP (decisión del owner, 2026-08-17) y lo que lo anuncia en CTC Home
// y en la landing de Kaffetal Regal. Plan: docs/V5_CONSOLAS_PLAN.md §1.
//
// Se pide desde el navegador (`/api/catalogo/sneak-peek`) por la misma razón que
// la cinta de mercado: así la página sigue siendo estática y un lote nuevo
// aparece sin volver a construir el sitio. Si la petición falla, la cinta NO se
// dibuja — una portada no se cae por un vistazo.
//
// EL IDIOMA LLEGA COMO PROP. Home y KR usan `components/lang/i18n`; la familia
// Cherry Picked usa `components/cherry-picked/i18n`. Son dos proveedores con la
// misma unión de idiomas, así que este módulo no se engancha a ninguno: recibe
// el valor y ya. Es lo que lo hace reutilizable en las seis superficies.

type Variant = "home" | "kr" | "cp";

const T: Record<
  SneakPeekLang,
  { eyebrow: string; head: string; tail: string; cta: string; aria: string; est: string; sca: string }
> = {
  es: {
    eyebrow: "Catálogo Activo",
    head: "Un vistazo a lo que hay ahora mismo",
    tail: "El catálogo completo se ve dentro de Cherry Picked.",
    cta: "Ver el catálogo completo",
    aria: "Vistazo al Catálogo Activo de CTC",
    est: "est.",
    sca: "SCA",
  },
  en: {
    eyebrow: "Active Catalogue",
    head: "A sneak peek at what is on the table",
    tail: "The full catalogue lives inside Cherry Picked.",
    cta: "See the full catalogue",
    aria: "A peek at CTC's Active Catalogue",
    est: "est.",
    sca: "SCA",
  },
  de: {
    eyebrow: "Aktiver Katalog",
    head: "Ein Blick auf das, was gerade da ist",
    tail: "Der vollständige Katalog liegt in Cherry Picked.",
    cta: "Den ganzen Katalog ansehen",
    aria: "Ein Blick in den aktiven Katalog von CTC",
    est: "gesch.",
    sca: "SCA",
  },
};

// La portada de Cherry Picked, desde cualquier superficie. Mismo patrón que
// `DIRECTORIO_HREF` y `FAMILY_LINKS`: en desarrollo no hay subdominios, así que
// vale la ruta; en producción tiene que ser ABSOLUTO o el proxy le antepone la
// base del subdominio en el que estemos (`/kaffetal-regal/cherry-picked` → 404).
// `NODE_ENV` es constante en compilación en servidor y cliente: no hay desajuste
// de hidratación.
const CHERRY_PICKED_HREF =
  process.env.NODE_ENV === "development" ? "/cherry-picked" : origenDeSuperficie("/cherry-picked");

function Tarjeta({ lot, lang, onOpenLogin }: { lot: SneakPeekLot; lang: SneakPeekLang; onOpenLogin?: () => void }) {
  const t = T[lang];
  const origen = [lot.municipio, lot.departamento].filter(Boolean).join(", ");
  const specs = [lot.variety, lot.process, lot.altitudeM != null ? `${lot.altitudeM} m` : null].filter(Boolean);

  const cuerpo = (
    <span className={styles.body}>
        <span className={styles.top}>
          <b className={styles.name}>{lot.name}</b>
          <span className={styles.code}>{lot.code}</span>
        </span>
        <span className={styles.line}>
          {/* El grado, con su nombre y su color oficial. Aquí NO va el sello de
              420×420: a 36 px se convierte en una mancha gris ilegible (se vio
              en la primera verificación) y encima no dice qué grado es. El sello
              es para las fichas de grado; en una tarjeta manda la palabra. */}
          <span className={styles.grade} style={{ background: `var(--t-${lot.grade})` }}>
            {GRADO_POR_ID[lot.grade].nombre}
          </span>
          <span className={styles.score}>
            <i className={styles.sca}>{t.sca}</i>
            {lot.score}
            {lot.scoreEstimated && <i className={styles.est}>{t.est}</i>}
          </span>
        </span>
        <span className={styles.origin}>
          {lot.finca}
          {origen && <> · {origen}</>}
        </span>
        {specs.length > 0 && <span className={styles.specs}>{specs.join(" · ")}</span>}
        {lot.cup && <span className={styles.cup}>{lot.cup}</span>}
        {/* El rótulo de temporada viene en el DATO, no aquí: así un mock no
            puede pintarse sin decir que es de la temporada pasada. */}
      <span className={lot.mock ? styles.seasonPast : styles.season}>{lot.season[lang]}</span>
    </span>
  );

  // En las superficies de Cherry Picked la tarjeta abre el login (es justo lo que
  // esta cinta vende); en Home y KR lleva a la portada de Cherry Picked.
  return onOpenLogin ? (
    <button type="button" className={styles.card} onClick={onOpenLogin}>
      {cuerpo}
    </button>
  ) : (
    <a className={styles.card} href={CHERRY_PICKED_HREF}>
      {cuerpo}
    </a>
  );
}

export function SneakPeek({
  lang,
  variant = "home",
  onOpenLogin,
  id,
}: {
  lang: SneakPeekLang;
  variant?: Variant;
  /** Si se pasa, las tarjetas abren el login en vez de navegar (familia CP). */
  onOpenLogin?: () => void;
  /** Ancla de sección. En la tienda hereda `grados`, que es el sitio que ocupa. */
  id?: string;
}) {
  const t = T[lang];
  const [data, setData] = useState<SneakPeekPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/catalogo/sneak-peek")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: SneakPeekPayload) => alive && setData(j))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;
  // Cargado y vacío: mejor no dibujar una cinta hueca que ocupa sitio y no dice
  // nada. Pasa el día que no haya lotes vivos y se hayan retirado los mock.
  if (data && data.lots.length === 0) return null;

  const strip = data && (
    <div className={styles.strip}>
      {data.lots.map((lot) => (
        <Tarjeta key={lot.id} lot={lot} lang={lang} onOpenLogin={onOpenLogin} />
      ))}
    </div>
  );

  return (
    <section
      id={id}
      className={variant === "cp" ? `${styles.wrapSection} ${styles.cp}` : styles.wrapSection}
      aria-label={t.aria}
    >
      <div className="wrap">
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 className={styles.head}>
          {t.head} <em>{t.tail}</em>
        </h2>
      </div>
      {!data ? (
        <div className={styles.loading} aria-hidden />
      ) : (
        <div className={styles.track}>
          {strip}
          {/* La segunda copia es lo que hace que el bucle no tenga costura. Es
              puramente visual: quien usa lector de pantalla ya leyó la primera. */}
          <div aria-hidden>{strip}</div>
        </div>
      )}
      <div className="wrap">
        <a className={styles.cta} href={CHERRY_PICKED_HREF} onClick={onOpenLogin ? (e) => { e.preventDefault(); onOpenLogin(); } : undefined}>
          {t.cta} <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
