"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { PREFIJO_REFERENCIA, RUTA_PORTAL, cuerpoDeReferencia, normalizaReferencia } from "@/lib/catalogo/codigoPublico";
import type { SneakPeekLang, SneakPeekLot, SneakPeekPayload } from "@/lib/catalogo/sneakPeek";
// V5.202: un módulo SIN imports (no arrastra Supabase al cliente): el tramo de altitud con los separadores del idioma.
import { tramoDeAltitud } from "@/lib/catalogo/vitrinaVista";
import { CatalogoPopup } from "./CatalogoPopup";
import { descriptorLabel, familiaDe } from "@/lib/catacion/rueda";
import { IconoDeNota } from "@/components/catacion/IconosDeSabor";
import { BarraDeIntensidad, oscurece } from "@/components/kaffetal-regal/dossier/figuras";
import { RadarCvaTarjeta } from "./RadarCvaTarjeta";
import styles from "./SneakPeek.module.css";

// ── «Active Catalogue Sneak Peek» · el módulo reutilizable ───────────────────
// Una cinta de tarjetas de lote, SIN nada comercial, para que quien llega de
// fuera vea de un golpe qué hay y de dónde viene. El catálogo completo —precios,
// MOQ, kilos, reservas— vive detrás del login de Cherry Picked; esta cinta es lo
// que lo REEMPLAZA en las landings de la familia CP (decisión del owner,
// 2026-08-17) y lo que lo anuncia en CTC Home, en Kaffetal Regal y en CaaS.
// Plan: docs/V5_CONSOLAS_PLAN.md §1.
//
// LAS DOS CARAS (maquetas del owner, 2026-08-17; V5.198, con los lotes REALES del
// Triage). DELANTE va la FICHA del lote: la foto con «Ver detalle» encima (y
// «Próximamente» si todavía no está declarado en el Catálogo Activo), el nombre,
// variedad y altitud, las notas que marcó el Q-Grader y, abajo, el sello del grado
// frente al Punto (CVA) con la región (V5.202: ya no la finca ni el municipio; un
// lote de CTCx Selection lleva además su rótulo). DETRÁS va el ANÁLISIS: la
// telaraña de 8 esquinas del CVA, las notas de la rueda con su ícono y su
// intensidad, y el botón del Dossier público del lote (el que reemplazó a la ficha
// técnica).
// El reparto no es estético: delante va lo que identifica y hace querer mirar,
// detrás lo que explica POR QUÉ ese café puntúa lo que puntúa. Y en ninguna de
// las dos hay un dato comercial — la cara pública enseña el café, no el negocio.
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
// EN UNA PANTALLA TÁCTIL, LA CINTA SE LLEVA CON EL DEDO (owner, 2026-10-10, V5.201):
// «que siga moviéndose por defecto de izquierda a derecha, pero si se interactúa
// con él, se transforma para moverse con el dedo de lado a lado. Después de 20
// segundos de inactividad se vuelve a mover sola como al principio». Tocarla
// —arrastrarla, abrir una tarjeta, pulsar una flecha— la pone en MANUAL: deja de
// andar sola, sigue al dedo y, al soltarla con impulso, se desliza y frena. A los
// `INACTIVIDAD_MS` sin tocarla vuelve a andar, persiguiendo su velocidad como
// siempre (sin salto). Pasar por encima con el dedo para bajar por la página NO
// cuenta: eso lo decide el navegador (`touch-action: pan-y`) y no llega aquí como
// arrastre. El ratón no cambia: las flechas aceleran al pasar por encima.
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

/** A los cuántos milisegundos sin tocarla vuelve a andar sola una cinta que se tomó con el dedo (owner, 2026-10-10). */
const INACTIVIDAD_MS = 20_000;
/** Lo que tiene que correrse el dedo, en horizontal y más que en vertical, para que el toque sea un arrastre. */
const UMBRAL_ARRASTRE_PX = 8;

const movimientoReducido = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const T: Record<
  SneakPeekLang,
  {
    eyebrow: string;
    head: string;
    tail: string;
    cta: string;
    portalAria: string;
    fmlEtiqueta: string;
    fmlBuscar: string;
    fmlError: string;
    aria: string;
    dossier: string;
    proximamente: string;
    notas: string;
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
    portalAria: "Find my Lot: el catálogo público de CTCx, donde cada lote se busca por su referencia",
    fmlEtiqueta: "Referencia del lote: los ocho caracteres después de CTC-L-",
    fmlBuscar: "Buscar el lote",
    fmlError: "Son ocho caracteres (cifras y letras de la A a la F) después de «CTC-L-».",
    aria: "Vistazo al Catálogo Activo de CTC",
    dossier: "Ver el Dossier del lote",
    proximamente: "Próximamente",
    notas: "Notas de la rueda del sabor, con su intensidad de 0 a 15",
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
    portalAria: "Find my Lot: the CTCx public catalogue, where each lot is found by its reference",
    fmlEtiqueta: "Lot reference: the eight characters after CTC-L-",
    fmlBuscar: "Find the lot",
    fmlError: "It is eight characters (digits and letters A to F) after «CTC-L-».",
    aria: "A peek at the CTC Active Catalogue",
    dossier: "See the lot dossier",
    proximamente: "Coming soon",
    notas: "Flavour wheel notes, with their intensity from 0 to 15",
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
    portalAria: "Find my Lot: der öffentliche CTCx-Katalog, in dem jedes Los über seine Referenz gefunden wird",
    fmlEtiqueta: "Losreferenz: die acht Zeichen nach CTC-L-",
    fmlBuscar: "Los suchen",
    fmlError: "Es sind acht Zeichen (Ziffern und Buchstaben A bis F) nach «CTC-L-».",
    aria: "Ein Blick in den aktiven Katalog von CTC",
    dossier: "Los-Dossier ansehen",
    proximamente: "Demnächst",
    notas: "Noten des Aromarads, mit ihrer Intensität von 0 bis 15",
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

// El portal público del lote (V5.49), desde las SIETE superficies donde está
// montada esta cinta.
//
// ⚠️ AQUÍ EL ABSOLUTO NO ES UNA MEJORA, ES LA ÚNICA FORMA QUE FUNCIONA. Cherry
// Picked tiene subdominio propio, así que `origenDeSuperficie` devuelve su host
// y la ruta sobra. `/ctcx-public-catalogue` NO tiene subdominio —vive en
// `RUTAS_SOLO_WWW`— así que `origenDeSuperficie` devuelve la casa matriz y hay
// que añadirle la ruta. Y si se dejara relativa, el proxy la reescribiría en los
// seis hosts que no son `www` (`kaffetal-regal.ctcexport.com/ctcx-public-catalogue`
// → `/kaffetal-regal/ctcx-public-catalogue`) y daría 404 en todos menos uno.
const PORTAL_HREF =
  process.env.NODE_ENV === "development" ? RUTA_PORTAL : `${origenDeSuperficie(RUTA_PORTAL)}${RUTA_PORTAL}`;

// El Dossier público de cada lote (V5.198) cuelga del mismo portal: ABSOLUTO contra la casa matriz por la misma razón que
// `PORTAL_HREF`. El documento habla español e inglés; la página en alemán abre el inglés.
const PORTAL_BASE = process.env.NODE_ENV === "development" ? "" : origenDeSuperficie(RUTA_PORTAL);

/** El nombre de una nota de la rueda en el idioma de la página (la rueda está en español e inglés; el alemán lee el inglés). */
const nombreDeNota = (id: string, lang: SneakPeekLang) => descriptorLabel(id, lang === "de" ? "en" : lang);
/** El locale de cada idioma de la cinta (separadores de miles y decimales). */
const LOCALE: Record<SneakPeekLang, string> = { es: "es-CO", en: "en-GB", de: "de-DE" };
const fmtIntensidad = (v: number, lang: SneakPeekLang) => v.toLocaleString(LOCALE[lang], { maximumFractionDigits: 1 });

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
  // V5.202 (nodo final): la altitud en su tramo de 100 m («1.700–1.800 m»), nunca la exacta.
  const specs = [lot.variety, lot.altitudeM != null ? tramoDeAltitud(lot.altitudeM, LOCALE[lang]) : null].filter(Boolean).join("  ·  ");
  // Las notas que marcó el Q-Grader, las más intensas primero: lo que el café SABE, en una línea.
  const notas = lot.notes.slice(0, 5).map((x) => nombreDeNota(x.id, lang)).join(" · ");
  const inerte = duplicada || !volteada ? -1 : undefined;
  const cajaRef = useRef<HTMLDivElement | null>(null);
  const pulsar = () => cajaRef.current && onVoltear(cajaRef.current);

  return (
    <div className={`${styles.card} ${volteada ? styles.flipped : ""}`} ref={cajaRef}>
      <div className={styles.inner}>
        {/* ── La cara: la ficha del lote ───────────────────────────────────── */}
        <button
          type="button"
          className={`${styles.face} ${styles.front}`}
          onClick={pulsar}
          aria-label={t.tarjetaAria(`${lot.name} · ${lot.code}`)}
          aria-expanded={volteada}
          tabIndex={duplicada ? -1 : undefined}
        >
          <span className={styles.photo}>
            {lot.image ? (
              // La foto del lote la sirve `/api/catalogo/foto/…` ya recortada y en WebP: sin segundo rodeo por el optimizador.
              <Image src={lot.image} alt="" width={660} height={440} sizes="320px" unoptimized={lot.image.startsWith("/api/")} />
            ) : (
              // Sin foto, el sello del grado a lo grande: es la cara oficial de
              // cada grado y nunca falta.
              <span className={styles.photoFallback} style={{ background: grado.hex }}>
                <Image src={grado.logo} alt="" width={420} height={420} sizes="140px" />
              </span>
            )}
            {/* «Ver detalle» va SOBRE la foto, arriba a la derecha: es la única
                acción de esta cara y ahí no le quita sitio a ningún dato. */}
            <span className={styles.verDetalle} aria-hidden>
              {t.verMas} +
            </span>
            {/* V5.198: un lote del Triage que todavía no se declaró en el Catálogo Activo no se puede comprar aún: se dice. */}
            {!lot.inCatalogue && <span className={styles.seasonTag}>{t.proximamente}</span>}
          </span>

          <span className={styles.frontBody}>
            <b className={styles.name}>{lot.name}</b>
            {/* V5.202 (nodo final): la referencia, bajo el nombre. El nombre es GENERADO y dos lotes pueden compartirlo; la referencia
                los distingue (y es lo que se busca en «Find my Lot»). */}
            <span className={styles.code} translate="no">
              {lot.code}
            </span>
            {specs && <span className={styles.specs}>{specs}</span>}
            {notas && <span className={styles.cup}>{notas}</span>}

            {/* El pie de la cara: el sello del grado frente al puntaje y al
                origen. Aquí el sello SÍ cabe a tamaño legible — el que quedaba
                en una mancha gris era el de 36 px de la primera versión.
                V5.202 (owner, 2026-10-10): lo público omite lo que lleva al
                productor, así que el origen es la REGIÓN («Santander, Colombia»),
                en negrita donde antes iba la finca; un lote de CTCx Selection
                lleva su rótulo en esa línea y la región debajo. */}
            <span className={styles.frontFoot}>
              <Image
                className={styles.sello}
                src={grado.logo}
                alt={grado.nombre}
                width={420}
                height={420}
                sizes="72px"
              />
              <span className={styles.frontFootDatos}>
                <span className={styles.score}>
                  <i className={styles.sca}>{lot.scoreProtocol}</i>
                  {lot.score}
                </span>
                {lot.rotulo ? (
                  <>
                    <span className={styles.rotulo}>{lot.rotulo}</span>
                    {lot.region && <span className={styles.origin}>{lot.region}</span>}
                  </>
                ) : (
                  lot.region && <span className={styles.region}>{lot.region}</span>
                )}
              </span>
            </span>
          </span>
        </button>

        {/* ── El reverso: el análisis ──────────────────────────────────────── */}
        <div className={`${styles.face} ${styles.back}`} aria-hidden={!volteada}>
          <button type="button" className={styles.backTop} onClick={pulsar} tabIndex={inerte}>
            <span className={styles.backName}>{lot.name}</span>
            <span className={styles.backClose} aria-label={t.volver}>
              ×
            </span>
          </button>

          {/* La telaraña de 8 esquinas del CVA (la evaluación afectiva que rige el grado). */}
          {lot.cva && (
            <span className={styles.radarBox}>
              <RadarCvaTarjeta valores={lot.cva} lang={lang} />
            </span>
          )}

          {/* Las notas de la rueda con su ícono y su intensidad (0 a 15): la evaluación descriptiva. */}
          {lot.notes.length > 0 && (
            <ul className={styles.notasTarjeta} aria-label={t.notas}>
              {lot.notes.slice(0, lot.cva ? 5 : 6).map((x) => {
                const color = familiaDe(x.id)?.color ?? "#8A8F98";
                return (
                  <li key={x.id}>
                    <span className={styles.notaIcono} style={{ background: `${color}24`, color: oscurece(color, 0.2) }}>
                      <IconoDeNota id={x.id} size={24} strokeWidth={1.8} />
                    </span>
                    <span className={styles.notaNombre}>{nombreDeNota(x.id, lang)}</span>
                    <span className={styles.notaBarra}>
                      <BarraDeIntensidad valor={x.intensidad} color={color} />
                    </span>
                    <span className={styles.notaValor}>{fmtIntensidad(x.intensidad, lang)}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* El Dossier público, al pie y a lo ancho: es la acción del reverso (V5.198: reemplaza a la ficha técnica). */}
          <a
            className={`${styles.ficha} ${styles.fichaAlPie}`}
            href={`${PORTAL_BASE}${lot.dossierPath}${lang === "es" ? "" : "?lang=en"}`}
            target="_blank"
            rel="noopener"
            tabIndex={inerte}
            onClick={(e) => e.stopPropagation()}
          >
            {t.dossier} <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * «Find my Lot» en el pie de la cinta (V5.199, owner 2026-10-10: «En la página de CTCx, KR y CP debe haber mención de "Find my
 * Lot" para ir a esta herramienta, con la cual debo escribir solo los 8 dígitos después de "CTC-L-"»). El acceso al portal y,
 * al lado, el campo con el prefijo FIJO: quien busca escribe los ocho caracteres y llega al Dossier público del lote. La navegación
 * es ABSOLUTA contra la casa matriz (`PORTAL_HREF`): el portal solo responde en `www` y esta cinta vive en siete hosts.
 */
function FindMyLot({ lang }: { lang: SneakPeekLang }) {
  const t = T[lang];
  const [valor, setValor] = useState("");
  const [malo, setMalo] = useState(false);
  const idError = useId();
  return (
    <form
      className={styles.fml}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const referencia = normalizaReferencia(valor);
        if (!referencia) {
          setMalo(true);
          return;
        }
        // Navegación COMPLETA y no `router.push`: en producción el portal está en otro host (`www`) que el de esta superficie. La
        // dirección se resuelve ABSOLUTA (en desarrollo `PORTAL_HREF` es relativa): así no es una página «interna» de este host.
        const destino = new URL(`${PORTAL_HREF}/${referencia}${lang === "es" ? "" : "?lang=en"}`, window.location.href);
        window.location.assign(destino.href);
      }}
    >
      {/* «Find my Lot» es el NOMBRE de la función y no se traduce (como «Cherry Picked»): ver `CatalogoPublicoLanding.tsx`. */}
      <a className={styles.portal} href={PORTAL_HREF} aria-label={t.portalAria}>
        <span aria-hidden>⌕</span> Find my Lot
      </a>
      <span className={styles.fmlCampo} data-invalido={malo || undefined}>
        <span className={styles.fmlPrefijo} aria-hidden>
          {PREFIJO_REFERENCIA}
        </span>
        <input
          className={styles.fmlEntrada}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXXXXXX"
          aria-label={t.fmlEtiqueta}
          aria-invalid={malo}
          aria-describedby={malo ? idError : undefined}
          value={valor}
          onChange={(e) => {
            setValor(cuerpoDeReferencia(e.target.value));
            if (malo) setMalo(false);
          }}
        />
        <button type="submit" className={styles.fmlBoton} aria-label={t.fmlBuscar}>
          <span aria-hidden>→</span>
        </button>
      </span>
      {malo && (
        <span id={idError} className={styles.fmlError} role="alert">
          {t.fmlError}
        </span>
      )}
    </form>
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
  /** El dedo (V5.201). MANUAL: alguien tocó la cinta y no ha pasado `INACTIVIDAD_MS`; no anda sola. */
  const manualRef = useRef(false);
  /** El toque en curso: dónde empezó, dónde va, y la velocidad del dedo (px/s) para la inercia al soltar. */
  const arrastreRef = useRef<{ id: number; x0: number; y0: number; x: number; t: number; vel: number; movido: boolean } | null>(null);
  /** Un arrastre que acaba ENCIMA de una tarjeta no la abre (ni sigue el enlace del Dossier): hasta aquí se tragan los clics. */
  const sinClicHastaRef = useRef(0);
  /** El reloj de la inactividad, y con qué se tocó la cinta la última vez (una flecha pulsada con el dedo no «pasa por encima»). */
  const relojRef = useRef<number | undefined>(undefined);
  const ultimoPunteroRef = useRef<string>("mouse");

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
        } else if (arrastreRef.current?.movido) {
          // El dedo la lleva: la posición ya la movió `onPointerMove`; aquí solo se pinta.
        } else if (manualRef.current) {
          // Suelta tras un arrastre: sigue por inercia y frena sola. No vuelve a andar hasta que pase la inactividad.
          velRef.current *= Math.exp(-dt * 3.2);
          if (Math.abs(velRef.current) < 4) velRef.current = 0;
          posRef.current += velRef.current * dt;
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
    // V5.202: la tarjeta se identifica por su referencia (`CTC-L-…`); el `lot_id` ya no viaja al navegador.
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

  // El reloj de la inactividad no sobrevive al módulo.
  useEffect(() => {
    const reloj = relojRef;
    return () => window.clearTimeout(reloj.current);
  }, []);

  /** Alguien tocó la cinta: deja de andar sola hasta que pasen `INACTIVIDAD_MS` sin tocarla. */
  const tomarElMando = () => {
    manualRef.current = true;
    window.clearTimeout(relojRef.current);
  };
  const armarReloj = () => {
    window.clearTimeout(relojRef.current);
    relojRef.current = window.setTimeout(() => {
      manualRef.current = false;
    }, INACTIVIDAD_MS);
  };

  const alApoyar = (e: React.PointerEvent<HTMLDivElement>) => {
    ultimoPunteroRef.current = e.pointerType;
    if (e.pointerType === "mouse" || movimientoReducido()) return;
    arrastreRef.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t: e.timeStamp, vel: 0, movido: false };
  };

  const alMover = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastreRef.current;
    if (!a || a.id !== e.pointerId) return;
    if (!a.movido) {
      const dx0 = e.clientX - a.x0;
      if (Math.abs(dx0) < UMBRAL_ARRASTRE_PX || Math.abs(dx0) < Math.abs(e.clientY - a.y0)) return;
      // Empieza el arrastre: la cinta pasa a manual, se olvida de cualquier centrado y cierra la tarjeta abierta (quien arrastra
      // está mirando la cinta otra vez, no esa tarjeta).
      a.movido = true;
      tomarElMando();
      destinoRef.current = null;
      alLlegarRef.current = null;
      velRef.current = 0;
      setVolteada(null);
    }
    const dx = e.clientX - a.x;
    const dt = Math.max(1, e.timeStamp - a.t) / 1000;
    posRef.current += dx;
    a.vel = a.vel * 0.6 + (dx / dt) * 0.4;
    a.x = e.clientX;
    a.t = e.timeStamp;
  };

  const alSoltar = (e: React.PointerEvent<HTMLDivElement>, cancelado: boolean) => {
    const a = arrastreRef.current;
    if (!a || a.id !== e.pointerId) return;
    arrastreRef.current = null;
    if (a.movido) {
      // La inercia sale de la velocidad del dedo, salvo que se quedara quieto antes de levantarlo.
      velRef.current = e.timeStamp - a.t > 90 ? 0 : Math.max(-2400, Math.min(2400, a.vel));
      sinClicHastaRef.current = performance.now() + 400;
      armarReloj();
    } else if (!cancelado) {
      // Un toque sin arrastre (abrir una tarjeta, una flecha) también es tocar la cinta.
      tomarElMando();
      velRef.current = 0;
      armarReloj();
    }
    // `cancelado` sin arrastre = el navegador se quedó el gesto para bajar por la página: eso no es tocar la cinta.
  };

  /** En táctil una flecha no puede «pasar por encima»: al pulsarla desliza la cinta una tarjeta hacia su lado. */
  const empujarUnaTarjeta = (lado: "izq" | "der") => {
    const pista = pistaRef.current;
    const tarjeta = pista?.querySelector<HTMLElement>(`.${styles.card}`);
    if (!pista || !tarjeta) return;
    const paso = tarjeta.offsetWidth + 18; // la tarjeta y sus dos márgenes de 9 px
    setVolteada(null);
    destinoRef.current = posRef.current + (lado === "der" ? paso : -paso);
    alLlegarRef.current = null;
  };

  /** El foco solo acelera si es de TECLADO: el que deja un toque en el móvil se quedaría pegado acelerando la cinta. */
  const focoDeTeclado = (el: HTMLElement) => {
    try {
      return el.matches(":focus-visible");
    } catch {
      return true;
    }
  };

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

  // Sin cinta —la petición falló, o todavía no hay lotes en el Triage— no se dibuja una cinta hueca que ocupa sitio y no dice
  // nada; pero «Find my Lot» se queda (V5.199): la mención del portal tiene que estar en CTC, KR y CP aunque no haya tarjetas.
  if (failed || (data && data.lots.length === 0)) {
    return (
      <section id={id} className={variant === "cp" ? `${styles.wrapSection} ${styles.soloFml} ${styles.cp}` : `${styles.wrapSection} ${styles.soloFml}`} aria-label={t.aria}>
        <div className="wrap">
          <div className={styles.pie}>
            <FindMyLot lang={lang} />
          </div>
        </div>
      </section>
    );
  }

  const tira = (duplicada: boolean) =>
    data && (
      <div className={styles.strip}>
        {data.lots.map((lot) => (
          <Tarjeta
            key={lot.code}
            lot={lot}
            lang={lang}
            duplicada={duplicada}
            volteada={volteada === lot.code}
            onVoltear={(el) => centrarYVoltear(el, lot.code)}
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
        <div
          className={styles.cinta}
          ref={cintaRef}
          onPointerDown={alApoyar}
          onPointerMove={alMover}
          onPointerUp={(e) => alSoltar(e, false)}
          onPointerCancel={(e) => alSoltar(e, true)}
          onClickCapture={(e) => {
            if (performance.now() < sinClicHastaRef.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
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
              onPointerEnter={(e) => e.pointerType === "mouse" && setImpulso(lado)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setImpulso(null)}
              onFocus={(e) => focoDeTeclado(e.currentTarget) && setImpulso(lado)}
              onBlur={() => setImpulso(null)}
              onClick={() => {
                if (movimientoReducido()) {
                  pistaRef.current?.scrollBy({ left: lado === "izq" ? -640 : 640, behavior: "smooth" });
                } else if (ultimoPunteroRef.current !== "mouse") {
                  empujarUnaTarjeta(lado);
                }
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
        {/* Las DOS puertas del pie (V5.49). A la izquierda la de siempre: el
            catálogo COMPLETO, que vive tras el login de Cherry Picked. A la
            derecha la pública: quien ya tiene un café en la mano no quiere el
            catálogo, quiere SU lote — y para eso no hace falta cuenta.
            Van juntas porque son la misma pregunta con dos respuestas según de
            dónde venga quien mira. */}
        <div className={styles.pie}>
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
          {/* Éste NO abre ventana: es una navegación de verdad, y a un sitio que no pide nada. Absoluto a la casa matriz — ver
              `PORTAL_HREF`. V5.199: con el campo de la referencia al lado (`FindMyLot`). */}
          <FindMyLot lang={lang} />
        </div>
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
