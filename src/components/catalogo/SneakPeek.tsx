"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import type { SneakPeekLang, SneakPeekLot, SneakPeekPayload } from "@/lib/catalogo/sneakPeek";
import styles from "./SneakPeek.module.css";

// ── «Active Catalogue Sneak Peek» · el módulo reutilizable ───────────────────
// Una cinta de tarjetas de lote, SIN nada comercial, para que quien llega de
// fuera vea de un golpe qué hay y de dónde viene. El catálogo completo —precios,
// MOQ, kilos, reservas— vive detrás del login de Cherry Picked; esta cinta es lo
// que lo REEMPLAZA en las landings de la familia CP (decisión del owner,
// 2026-08-17) y lo que lo anuncia en CTC Home y en la landing de Kaffetal Regal.
// Plan: docs/V5_CONSOLAS_PLAN.md §1.
//
// LA TARJETA SE VOLTEA (owner, 2026-08-17). Delante: foto, nombre, grado y
// variedad — lo que hace que alguien quiera mirar. Detrás, al pulsarla: el
// puntaje, el origen completo, el proceso, las notas de cata y el botón que abre
// la FICHA TÉCNICA del lote. Es el mismo criterio de siempre: la cara pública
// enseña el café, no el negocio.
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
  {
    eyebrow: string;
    head: string;
    tail: string;
    cta: string;
    aria: string;
    est: string;
    sca: string;
    ficha: string;
    verMas: string;
    volver: string;
    tarjetaAria: (n: string) => string;
  }
> = {
  es: {
    eyebrow: "Catálogo Activo",
    head: "Un vistazo a lo que hay ahora mismo",
    tail: "El catálogo completo se ve dentro de Cherry Picked.",
    cta: "Ver el catálogo completo",
    aria: "Vistazo al Catálogo Activo de CTC",
    est: "est.",
    sca: "SCA",
    ficha: "Ver ficha técnica",
    verMas: "Ver detalle",
    volver: "Volver",
    tarjetaAria: (n) => `${n} — ver el detalle del lote`,
  },
  en: {
    eyebrow: "Active Catalogue",
    head: "A sneak peek at what is on the table",
    tail: "The full catalogue lives inside Cherry Picked.",
    cta: "See the full catalogue",
    aria: "A peek at the CTC Active Catalogue",
    est: "est.",
    sca: "SCA",
    ficha: "See datasheet",
    verMas: "See detail",
    volver: "Back",
    tarjetaAria: (n) => `${n} — see the lot detail`,
  },
  de: {
    eyebrow: "Aktiver Katalog",
    head: "Ein Blick auf das, was gerade da ist",
    tail: "Der vollständige Katalog liegt in Cherry Picked.",
    cta: "Den ganzen Katalog ansehen",
    aria: "Ein Blick in den aktiven Katalog von CTC",
    est: "gesch.",
    sca: "SCA",
    ficha: "Datenblatt ansehen",
    verMas: "Details ansehen",
    volver: "Zurück",
    tarjetaAria: (n) => `${n} — Details des Lots ansehen`,
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

function Tarjeta({
  lot,
  lang,
  volteada,
  onVoltear,
  duplicada,
}: {
  lot: SneakPeekLot;
  lang: SneakPeekLang;
  volteada: boolean;
  onVoltear: () => void;
  /** La copia que hace el bucle sin costura. Se puede pulsar con el ratón (si no,
   *  media cinta sería inerte), pero no recibe foco ni la lee un lector: la
   *  primera copia ya está anunciada. */
  duplicada?: boolean;
}) {
  const t = T[lang];
  const grado = GRADO_POR_ID[lot.grade];
  const origen = [lot.municipio, lot.departamento].filter(Boolean).join(", ");
  const specs = [lot.process, lot.altitudeM != null ? `${lot.altitudeM} m` : null].filter(Boolean).join(" · ");
  const inerte = duplicada || !volteada ? -1 : undefined;

  return (
    <div className={`${styles.card} ${volteada ? styles.flipped : ""}`}>
      <div className={styles.inner}>
        {/* ── La cara: foto, nombre, grado y variedad ──────────────────────── */}
        <button
          type="button"
          className={`${styles.face} ${styles.front}`}
          onClick={onVoltear}
          aria-label={t.tarjetaAria(lot.name)}
          aria-expanded={volteada}
          tabIndex={duplicada ? -1 : undefined}
        >
          <span className={styles.photo}>
            {lot.image ? (
              <Image src={lot.image} alt="" width={660} height={440} sizes="300px" />
            ) : (
              // Sin foto, el sello del grado: es la cara oficial de cada grado y
              // nunca falta. Aquí sí cabe a tamaño legible, al revés que en la
              // línea de datos, donde a 36 px quedaba en una mancha.
              <span className={styles.photoFallback} style={{ background: grado.hex }}>
                <Image src={grado.logo} alt="" width={420} height={420} sizes="120px" />
              </span>
            )}
            {lot.mock && <span className={styles.seasonTag}>{lot.season[lang]}</span>}
          </span>
          <span className={styles.frontBody}>
            <b className={styles.name}>{lot.name}</b>
            <span className={styles.line}>
              <span className={styles.grade} style={{ background: `var(--t-${lot.grade})` }}>
                {grado.nombre}
              </span>
              {lot.variety && <span className={styles.variety}>{lot.variety}</span>}
            </span>
            <span className={styles.more} aria-hidden>
              {t.verMas} +
            </span>
          </span>
        </button>

        {/* ── El reverso: el resto del lote y su ficha ─────────────────────── */}
        <div className={`${styles.face} ${styles.back}`} aria-hidden={!volteada}>
          <button type="button" className={styles.backTop} onClick={onVoltear} tabIndex={inerte}>
            <span className={styles.backName}>{lot.name}</span>
            <span className={styles.backClose} aria-label={t.volver}>
              ×
            </span>
          </button>
          <span className={styles.score}>
            <i className={styles.sca}>{t.sca}</i>
            {lot.score}
            {lot.scoreEstimated && <i className={styles.est}>{t.est}</i>}
          </span>
          <span className={styles.origin}>
            {lot.finca}
            {origen && <> · {origen}</>}
          </span>
          {specs && <span className={styles.specs}>{specs}</span>}
          {lot.cup && <span className={styles.cup}>{lot.cup}</span>}
          <span className={styles.backFoot}>
            {/* La ficha solo existe si el lote la tiene. Hoy la traen los mock;
                los lotes vivos, cuando la plataforma tenga dónde guardarla. */}
            {lot.datasheetUrl && (
              <a
                className={styles.ficha}
                href={lot.datasheetUrl}
                target="_blank"
                rel="noopener"
                tabIndex={inerte}
                onClick={(e) => e.stopPropagation()}
              >
                {t.ficha} <span aria-hidden>↗</span>
              </a>
            )}
          </span>
        </div>
      </div>
    </div>
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
  /** Si se pasa, el enlace de pie abre el login en vez de navegar (familia CP). */
  onOpenLogin?: () => void;
  /** Ancla de sección. En la tienda hereda `grados`, que es el sitio que ocupa. */
  id?: string;
}) {
  const t = T[lang];
  const [data, setData] = useState<SneakPeekPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [volteada, setVolteada] = useState<string | null>(null);

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

  // Escape cierra la tarjeta abierta: si algo se despliega, tiene que poder
  // cerrarse sin buscar el sitio exacto donde volver a pulsar.
  useEffect(() => {
    if (!volteada) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVolteada(null);
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [volteada]);

  if (failed) return null;
  // Cargado y vacío: mejor no dibujar una cinta hueca que ocupa sitio y no dice
  // nada. Pasa el día que no haya lotes vivos y se hayan retirado los mock.
  if (data && data.lots.length === 0) return null;

  const tira = (duplicada: boolean) =>
    data && (
      <div className={styles.strip}>
        {data.lots.map((lot) => (
          <Tarjeta
            key={lot.id}
            lot={lot}
            lang={lang}
            duplicada={duplicada}
            volteada={volteada === lot.id}
            onVoltear={() => setVolteada((v) => (v === lot.id ? null : lot.id))}
          />
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
        // Con una tarjeta abierta la cinta SE PARA: si siguiera andando, el
        // detalle que alguien acaba de abrir se le iría de la pantalla.
        <div className={`${styles.track} ${volteada ? styles.paused : ""}`}>
          {tira(false)}
          {/* La segunda copia es lo que hace que el bucle no tenga costura. Es
              aria-hidden: quien usa lector de pantalla ya leyó la primera. */}
          <div aria-hidden>{tira(true)}</div>
        </div>
      )}
      <div className="wrap">
        <a
          className={styles.cta}
          href={CHERRY_PICKED_HREF}
          onClick={
            onOpenLogin
              ? (e) => {
                  e.preventDefault();
                  onOpenLogin();
                }
              : undefined
          }
        >
          {t.cta} <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
