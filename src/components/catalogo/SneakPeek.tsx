"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import type { SneakPeekLang, SneakPeekLot, SneakPeekPayload } from "@/lib/catalogo/sneakPeek";
import { CatalogoPopup } from "./CatalogoPopup";
import styles from "./SneakPeek.module.css";

// ── «Active Catalogue Sneak Peek» · el módulo reutilizable ───────────────────
// Una cinta de tarjetas de lote, SIN nada comercial, para que quien llega de
// fuera vea de un golpe qué hay y de dónde viene. El catálogo completo —precios,
// MOQ, kilos, reservas— vive detrás del login de Cherry Picked; esta cinta es lo
// que lo REEMPLAZA en las landings de la familia CP (decisión del owner,
// 2026-08-17) y lo que lo anuncia en CTC Home, en Kaffetal Regal y en CaaS.
// Plan: docs/V5_CONSOLAS_PLAN.md §1.
//
// LA TARJETA SE VOLTEA. Delante: foto, nombre, grado y variedad — lo que hace
// que alguien quiera mirar. Detrás: el puntaje, el origen completo, el proceso,
// las notas de cata, la rueda de catación y el botón que abre la FICHA TÉCNICA.
// Es el criterio de siempre: la cara pública enseña el café, no el negocio.
//
// Y AL PULSARLA, LA CINTA LA CENTRA ANTES DE VOLTEARLA (owner, 2026-08-17): la
// tarjeta se lleva al medio, crece un 15 % y solo entonces gira. Abrir el
// detalle de algo que está saliéndose por el borde no hay quien lo lea.
//
// ⚠️ LA CINTA NO ES UNA ANIMACIÓN CSS, y no es un capricho. Con `@keyframes` no
// se puede cambiar la velocidad ni el sentido sin que el navegador REINICIE la
// animación — que es exactamente lo que se veía al pasar el ratón por una
// flecha: la cinta saltaba al principio. Aquí la posición la lleva un
// `requestAnimationFrame` sobre un `translate3d` propio: la velocidad se
// persigue con suavidad, el sentido se invierte sin costura, y centrar una
// tarjeta es mover esa misma variable. Es más código, y es el único modo de que
// no dé el salto.
//
// Se pide desde el navegador (`/api/catalogo/sneak-peek`) por la misma razón que
// la cinta de mercado: así la página sigue siendo estática y un lote nuevo
// aparece sin volver a construir el sitio. Si la petición falla, la cinta NO se
// dibuja — una portada no se cae por un vistazo.
//
// EL IDIOMA LLEGA COMO PROP. Home, KR y CaaS usan `components/lang/i18n`; la
// familia Cherry Picked usa `components/cherry-picked/i18n`. Son dos proveedores
// con la misma unión de idiomas, así que este módulo no se engancha a ninguno:
// recibe el valor y ya. Es lo que lo hace montable en las siete superficies.

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
    flechaAnterior: string;
    flechaSiguiente: string;
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
    flechaAnterior: "Ver lotes anteriores",
    flechaSiguiente: "Ver más lotes",
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
    flechaAnterior: "Previous lots",
    flechaSiguiente: "More lots",
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
    flechaAnterior: "Vorherige Lots",
    flechaSiguiente: "Weitere Lots",
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
  /** Recibe el elemento de la tarjeta: la cinta necesita saber DÓNDE está para
   *  poder centrarla antes de voltearla. */
  onVoltear: (elemento: HTMLElement) => void;
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
  const cajaRef = useRef<HTMLDivElement | null>(null);
  const pulsar = () => cajaRef.current && onVoltear(cajaRef.current);

  return (
    <div className={`${styles.card} ${volteada ? styles.flipped : ""}`} ref={cajaRef}>
      <div className={styles.inner}>
        {/* ── La cara: foto, nombre, grado y variedad ──────────────────────── */}
        <button
          type="button"
          className={`${styles.face} ${styles.front}`}
          onClick={pulsar}
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

        {/* ── El reverso: el resto del lote, su rueda y su ficha ───────────── */}
        <div className={`${styles.face} ${styles.back}`} aria-hidden={!volteada}>
          <button type="button" className={styles.backTop} onClick={pulsar} tabIndex={inerte}>
            <span className={styles.backName}>{lot.name}</span>
            <span className={styles.backClose} aria-label={t.volver}>
              ×
            </span>
          </button>
          <span className={styles.scoreRow}>
            <span className={styles.score}>
              <i className={styles.sca}>{t.sca}</i>
              {lot.score}
              {lot.scoreEstimated && <i className={styles.est}>{t.est}</i>}
            </span>
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
          <span className={styles.origin}>
            {lot.finca}
            {origen && <> · {origen}</>}
          </span>
          {specs && <span className={styles.specs}>{specs}</span>}
          {lot.cup && <span className={styles.cup}>{lot.cup}</span>}
          {/* El extracto de la rueda de catación: los sectores del lote
              encendidos sobre la rueda SCA, el resto atenuado. Sin rótulos —
              a este tamaño serían ruido; los lleva la ficha en PDF. */}
          {lot.wheel && (
            <span className={styles.wheelBox}>
              <Image src={lot.wheel} alt="" width={520} height={520} sizes="230px" unoptimized />
            </span>
          )}
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
  /** Qué flecha está bajo el ratón o el foco: acelera la cinta hacia ese lado. */
  const [impulso, setImpulso] = useState<null | "izq" | "der">(null);
  const [popup, setPopup] = useState(false);

  const cintaRef = useRef<HTMLDivElement | null>(null);
  const pistaRef = useRef<HTMLDivElement | null>(null);
  /** Posición de la cinta, en píxeles de `translateX`. Vive en un ref y no en el
   *  estado: cambia sesenta veces por segundo y no debe repintar React. */
  const posRef = useRef(0);
  const velRef = useRef(0);
  /** A dónde queremos ir: una velocidad objetivo, o una posición cuando estamos
   *  centrando una tarjeta. La una excluye a la otra. */
  const objetivoVelRef = useRef(0);
  const destinoRef = useRef<number | null>(null);
  const alLlegarRef = useRef<(() => void) | null>(null);

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

  // ── El motor de la cinta ──────────────────────────────────────────────────
  // Un solo bucle mientras el módulo está montado. La velocidad PERSIGUE a su
  // objetivo (no salta a él), así que acelerar con una flecha o soltarla es un
  // cambio continuo; y cuando hay un destino —centrar una tarjeta— es la
  // posición la que persigue, y avisa al llegar.
  useEffect(() => {
    if (!data) return;
    const reducido =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let anterior = performance.now();

    const paso = (ahora: number) => {
      const dt = Math.min(0.064, (ahora - anterior) / 1000); // volver a la pestaña no dispara la cinta
      anterior = ahora;
      const pista = pistaRef.current;
      if (pista) {
        // El ancho de UNA copia: la pista lleva la tira dos veces, y es esa
        // mitad la que hace que el bucle no tenga costura.
        const w = pista.scrollWidth / 2 || 1;

        if (destinoRef.current !== null) {
          const d = destinoRef.current - posRef.current;
          if (Math.abs(d) < 0.6 || reducido) {
            posRef.current = destinoRef.current;
            destinoRef.current = null;
            velRef.current = 0;
            const cb = alLlegarRef.current;
            alLlegarRef.current = null;
            cb?.();
          } else {
            posRef.current += d * Math.min(1, dt * 9);
          }
        } else if (!reducido) {
          velRef.current += (objetivoVelRef.current - velRef.current) * Math.min(1, dt * 5);
          posRef.current += velRef.current * dt;
        }

        // El bucle: la posición vive en [-w, 0) y al salirse se envuelve.
        // ⚠️ SOLO cuando no estamos centrando. El destino de un centrado puede
        // caer fuera de ese rango, y envolver mientras se persigue lo aleja de
        // su objetivo en cada vuelta: la tarjeta no llegaba nunca al centro y
        // por tanto no se volteaba. Al terminar el centrado se envuelve otra vez.
        if (destinoRef.current === null) {
          if (posRef.current > 0) posRef.current -= w;
          if (posRef.current < -w) posRef.current += w;
        }
        pista.style.transform = `translate3d(${posRef.current}px,0,0)`;
      }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  // La velocidad que toca en cada momento. POSITIVA = la cinta corre hacia la
  // DERECHA, que es el sentido por defecto (owner, 2026-08-17). Con una tarjeta
  // abierta la cinta se para: el detalle recién abierto no puede irse solo.
  useEffect(() => {
    const BASE = 17;
    const RAPIDO = 155;
    objetivoVelRef.current = volteada
      ? 0
      : impulso === "izq"
      ? -RAPIDO
      : impulso === "der"
      ? RAPIDO
      : BASE;
  }, [impulso, volteada]);

  /** Lleva la tarjeta al centro de la cinta y, al llegar, la voltea. */
  const centrarYVoltear = useCallback(
    (elemento: HTMLElement, idLote: string) => {
      if (volteada === idLote) {
        setVolteada(null);
        return;
      }
      const cinta = cintaRef.current;
      const pista = pistaRef.current;
      if (!cinta || !pista) {
        setVolteada(idLote);
        return;
      }
      const w = pista.scrollWidth / 2 || 1;
      // `offsetLeft` es relativo a la pista, así que no arrastra el error de
      // dónde esté la cinta ahora mismo — justo lo que hace falta.
      const centroTarjeta = elemento.offsetLeft + elemento.offsetWidth / 2;
      let destino = cinta.clientWidth / 2 - centroTarjeta;
      // La tarjeta está dos veces (la tira y su copia): se va a la más cercana.
      while (destino - posRef.current > w / 2) destino -= w;
      while (posRef.current - destino > w / 2) destino += w;
      destinoRef.current = destino;
      alLlegarRef.current = () => setVolteada(idLote);
    },
    [volteada]
  );

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
            onVoltear={(el) => centrarYVoltear(el, lot.id)}
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
        <div className={styles.cinta} ref={cintaRef}>
          {/* Las dos flechas no navegan: ACELERAN el paso hacia su lado mientras
              el ratón (o el foco) está encima. Al soltar, la cinta vuelve a su
              ritmo de lectura SIN dar un salto — la velocidad se persigue, no se
              reinicia. Con movimiento reducido no hay marcha que acelerar, así
              que ahí además empujan el scroll al pulsarlas. */}
          {(["izq", "der"] as const).map((lado) => (
            <button
              key={lado}
              type="button"
              className={`${styles.flecha} ${lado === "izq" ? styles.flechaIzq : styles.flechaDer}`}
              aria-label={lado === "izq" ? t.flechaAnterior : t.flechaSiguiente}
              onMouseEnter={() => setImpulso(lado)}
              onMouseLeave={() => setImpulso(null)}
              onFocus={() => setImpulso(lado)}
              onBlur={() => setImpulso(null)}
              onClick={() => {
                pistaRef.current?.scrollBy({ left: lado === "izq" ? -640 : 640, behavior: "smooth" });
              }}
            >
              <span aria-hidden>{lado === "izq" ? "‹" : "›"}</span>
            </button>
          ))}
          {/* La pista lleva la tira DOS veces: es lo que hace que el bucle no
              tenga costura. La segunda copia es aria-hidden — quien usa lector
              de pantalla ya leyó la primera. */}
          <div className={styles.track} ref={pistaRef}>
            {tira(false)}
            <div aria-hidden>{tira(true)}</div>
          </div>
        </div>
      )}
      <div className="wrap">
        {/* El enlace sigue siendo un <a> con href real —para que se pueda abrir
            en otra pestaña y para que un buscador lo siga— pero el clic normal
            abre la ventana que explica dónde está el catálogo y que registrarse
            es gratis (owner, 2026-08-17). */}
        <a
          className={styles.cta}
          href={CHERRY_PICKED_HREF}
          onClick={(e) => {
            e.preventDefault();
            setPopup(true);
          }}
        >
          {t.cta} <span aria-hidden>→</span>
        </a>
      </div>
      <CatalogoPopup
        open={popup}
        onClose={() => setPopup(false)}
        lang={lang}
        href={CHERRY_PICKED_HREF}
        onOpenLogin={onOpenLogin}
      />
    </section>
  );
}
