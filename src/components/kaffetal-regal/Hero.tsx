"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./Hero.module.css";

type Dict = {
  portal: string;
  h1: string;
  h1em: string;
  introHead: string;
  introEm: string;
  lead: React.ReactNode;
  ctaRegister: string;
  ctaRegisterLead: string;
  ctaWhy: string;
  ctaWhyLead: string;
  pipeAria: string;
  pipeHead: string;
  pipeSub: string;
  pipeCells: [string, string][];
  doAria: string;
  doHead: string;
  doSub: string;
  doCells: React.ReactNode[];
  cpQ: React.ReactNode;
  cpToast: string;
  cpBtn: string;
};

const T: Record<Lang, Dict> = {
  es: {
    portal: "Portal del Productor",
    h1: "¡Reconocemos el valor de un trabajo sobresaliente, ",
    h1em: "que logra un grano extraordinario!",
    introHead: "Su cosecha puede ser la mejor taza que alguien pruebe este año. ",
    introEm: "Que se pague como tal.",
    lead: (
      <>
        Durante generaciones, el café colombiano salió al mundo sin el nombre de quien lo hizo posible. Kaffetal
        Regal existe para acabar con eso: usted registra su finca y arma la ficha de sus lotes sin pagar nada, e
        inscribe a la Arena el lote que quiera medir. Se presenta a ciegas ante Q-Graders y, si su taza habla,
        entra con nombre propio a <strong>Cherry Picked</strong>, nuestra vitrina de microlotes en Europa. Y si
        esta vez no alcanza el galardón, la inscripción igual le deja algo que ningún intermediario le ha dado
        jamás: una evaluación seria, una certificación y el mapa exacto de cómo mejorar.
      </>
    ),
    ctaRegister: "Registrar mi primer lote",
    ctaRegisterLead: "Su finca y su lote, sin costo",
    ctaWhy: "¿Por qué especialidad?",
    ctaWhyLead: "Antes de empezar",
    pipeAria: "El camino de su café",
    pipeHead: "El camino de su café",
    pipeSub: "2 cosechas al año · 2 oportunidades",
    pipeCells: [
      ["1 · Kaffetal Regal", "Registra y arma su ficha"],
      ["2 · Cupping Arena", "La taza habla, a ciegas"],
      ["3 · Certificación CTC", "Para todos, con feedback"],
      ["4 · Cherry Picked", "Su nombre, en Europa"],
    ],
    doAria: "Lo que hace CTC",
    doHead: "Lo que hace CTC",
    doSub: "De la muestra al contenedor",
    doCells: [
      <><b>Recibe y gestiona el material de muestras</b>: registro, custodia y preparación para el panel</>,
      <><b>Administra, cataloga y reporta</b> los resultados de las cataciones profesionales</>,
      <><b>Certifica a todos los inscritos</b>, ganen o no, con feedback de mejora del panel</>,
      <><b>Publica los lotes galardonados en Cherry Picked</b>: su nombre, su finca, sus videos y su grado</>,
      <><b>Confirma por escrito cada aumento</b> de compra a medida que entran pedidos de Europa</>,
      <><b>Corte, pago total y logística</b> al final del mes 3: trilla, empaque y consolidación del contenedor</>,
    ],
    cpQ: (
      <>
        <b>¿Y qué es Cherry Picked?</b> Es la vitrina de CTC en Europa: la plataforma donde tostadores de todo el
        continente compran fracciones de los microlotes galardonados en la Arena — con el nombre del productor, su
        finca, sus videos y su grado a la vista en cada compra.
      </>
    ),
    cpToast: "Cherry Picked · vitrina de microlotes en Europa (demo)",
    cpBtn: "Conocer Cherry Picked ↗",
  },
  en: {
    portal: "Producer Portal",
    h1: "We recognise the value of outstanding work, ",
    h1em: "the kind that yields an extraordinary bean.",
    introHead: "Your harvest could be the best cup someone tastes this year. ",
    introEm: "Let it be paid as such.",
    lead: (
      <>
        For generations, Colombian coffee went out into the world without the name of the person who made it
        possible. Kaffetal Regal exists to end that: you register your farm and build your lots&apos; datasheet
        at no cost, and enter into the Arena the lot you want to measure. You stand blind before Q-Graders and, if
        your cup speaks, you enter <strong>Cherry Picked</strong>, our microlot storefront in Europe, under your
        own name. And if the award doesn&apos;t come this time, the entry still leaves you something no middleman
        has ever given you: a serious evaluation, a certification, and the exact map of how to improve.
      </>
    ),
    ctaRegister: "Register my first lot",
    ctaRegisterLead: "Your farm and your lot, at no cost",
    ctaWhy: "Why specialty?",
    ctaWhyLead: "Before you start",
    pipeAria: "Your coffee's journey",
    pipeHead: "Your coffee's journey",
    pipeSub: "2 harvests a year · 2 opportunities",
    pipeCells: [
      ["1 · Kaffetal Regal", "Register and build your datasheet"],
      ["2 · Cupping Arena", "The cup speaks, blind"],
      ["3 · CTC Certification", "For everyone, with feedback"],
      ["4 · Cherry Picked", "Your name, in Europe"],
    ],
    doAria: "What CTC does",
    doHead: "What CTC does",
    doSub: "From the sample to the container",
    doCells: [
      <><b>Receives and manages the sample material</b>: registration, custody and preparation for the panel</>,
      <><b>Administers, catalogues and reports</b> the results of the professional cuppings</>,
      <><b>Certifies every entrant</b>, win or lose, with improvement feedback from the panel</>,
      <><b>Publishes awarded lots on Cherry Picked</b>: your name, your farm, your videos and your grade</>,
      <><b>Confirms every purchase increase in writing</b> as orders come in from Europe</>,
      <><b>Settlement, full payment and logistics</b> at the end of month 3: milling, packing and container consolidation</>,
    ],
    cpQ: (
      <>
        <b>And what is Cherry Picked?</b> It&apos;s CTC&apos;s storefront in Europe: the platform where roasters
        across the continent buy fractions of the microlots awarded in the Arena — with the producer&apos;s name,
        farm, videos and grade in plain sight on every purchase.
      </>
    ),
    cpToast: "Cherry Picked · microlot storefront in Europe (demo)",
    cpBtn: "Discover Cherry Picked ↗",
  },
  de: {
    portal: "Produzentenportal",
    h1: "Wir würdigen den Wert herausragender Arbeit, ",
    h1em: "die eine außergewöhnliche Bohne hervorbringt.",
    introHead: "Ihre Ernte könnte die beste Tasse sein, die jemand dieses Jahr probiert. ",
    introEm: "Sie soll auch so bezahlt werden.",
    lead: (
      <>
        Über Generationen ging kolumbianischer Kaffee ohne den Namen derer in die Welt, die ihn möglich machten.
        Kaffetal Regal existiert, um damit Schluss zu machen: Sie registrieren Ihre Finca und erstellen das
        Datenblatt Ihrer Lots kostenlos, und melden das Lot zur Arena an, das Sie messen wollen. Sie treten blind
        vor Q-Grader an — und wenn Ihre Tasse spricht, kommen Sie unter eigenem Namen zu{" "}
        <strong>Cherry Picked</strong>, unserem Microlot-Schaufenster in Europa. Und wenn es diesmal nicht zur
        Prämierung reicht, hinterlässt die Anmeldung trotzdem etwas, das Ihnen kein Zwischenhändler je gegeben
        hat: eine seriöse Bewertung, eine Zertifizierung und die genaue Karte, wie Sie besser werden.
      </>
    ),
    ctaRegister: "Mein erstes Lot registrieren",
    ctaRegisterLead: "Ihre Finca und Ihr Lot, kostenlos",
    ctaWhy: "Warum Spezialität?",
    ctaWhyLead: "Bevor Sie anfangen",
    pipeAria: "Der Weg Ihres Kaffees",
    pipeHead: "Der Weg Ihres Kaffees",
    pipeSub: "2 Ernten pro Jahr · 2 Chancen",
    pipeCells: [
      ["1 · Kaffetal Regal", "Registrieren und Datenblatt erstellen"],
      ["2 · Cupping Arena", "Die Tasse spricht, blind"],
      ["3 · CTC-Zertifizierung", "Für alle, mit Feedback"],
      ["4 · Cherry Picked", "Ihr Name, in Europa"],
    ],
    doAria: "Was CTC macht",
    doHead: "Was CTC macht",
    doSub: "Vom Muster bis zum Container",
    doCells: [
      <><b>Empfängt und verwaltet das Mustermaterial</b>: Registrierung, Verwahrung und Vorbereitung für das Panel</>,
      <><b>Verwaltet, katalogisiert und berichtet</b> die Ergebnisse der professionellen Verkostungen</>,
      <><b>Zertifiziert alle Angemeldeten</b>, ob sie gewinnen oder nicht, mit Verbesserungs-Feedback des Panels</>,
      <><b>Veröffentlicht die prämierten Lots auf Cherry Picked</b>: Ihr Name, Ihre Finca, Ihre Videos und Ihr Grad</>,
      <><b>Bestätigt jede Kauferhöhung schriftlich</b>, sobald Bestellungen aus Europa eingehen</>,
      <><b>Abrechnung, volle Zahlung und Logistik</b> am Ende von Monat 3: Schälung, Verpackung und Konsolidierung des Containers</>,
    ],
    cpQ: (
      <>
        <b>Und was ist Cherry Picked?</b> Das Schaufenster von CTC in Europa: die Plattform, auf der Röster des
        ganzen Kontinents Fraktionen der in der Arena prämierten Microlots kaufen — mit dem Namen des Produzenten,
        seiner Finca, seinen Videos und seinem Grad bei jedem Kauf sichtbar.
      </>
    ),
    cpToast: "Cherry Picked · Microlot-Schaufenster in Europa (Demo)",
    cpBtn: "Cherry Picked entdecken ↗",
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

// ── La promesa · lo que Kaffetal Regal es, por escrito ───────────────────────
// Vivía dentro de la portada y sale de ella el 2026-08-11: el owner puso el
// separador «La cadena completa» pegado al primer vistazo, así que esto bajó
// con el resto de lo que explica, detrás de «Por qué vale la pena».
//
// Sigue en ESTE archivo y no en uno propio porque comparte el diccionario `T`
// con la portada — la promesa es literalmente la frase que la portada dejó de
// decir, y separarlas en dos archivos era duplicar tres lenguas para nada.
export function HeroPromesa() {
  const t = T[useLang()];
  const PIPE_ICONS = [
    <svg key="1" viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /><path d="M10 12h6M10 16h6" /></svg>,
    <svg key="2" viewBox="0 0 24 24"><path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2" /><path d="M8 4c0 1-1 1.5 0 3M12 4c0 1-1 1.5 0 3" /></svg>,
    <svg key="3" viewBox="0 0 24 24"><circle cx="12" cy="9" r="5.5" /><path d="M9.5 9l1.8 1.8L14.8 7.4" /><path d="M9 13.5 7.5 21l4.5-2.4L16.5 21 15 13.5" /></svg>,
    <svg key="4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c3 2.6 3 14.4 0 17-3-2.6-3-14.4 0-17z" /></svg>,
  ];

  return (
    <section className={styles.after}>
        <div className="wrap">
          <h2 className={styles.introHead}>
            {t.introHead}
            <em>{t.introEm}</em>
          </h2>
          <p className={styles.lead}>{t.lead}</p>

          <div className={styles.pipeline} role="group" aria-label={t.pipeAria}>
            <div className={styles.pipelineHead}>
              <span>{t.pipeHead}</span>
              <span>{t.pipeSub}</span>
            </div>
            <div className={styles.pipelineGrid}>
              {t.pipeCells.map(([k, v], i) => (
                <div className={styles.pipelineCell} key={k}>
                  <div className={styles.pic}>{PIPE_ICONS[i]}</div>
                  <span className={styles.k}>{k}</span>
                  <div className={styles.v}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.ctcdo} role="group" aria-label={t.doAria}>
            <div className={styles.ctcdoHead}>
              <span>{t.doHead}</span>
              <span>{t.doSub}</span>
            </div>
            <div className={styles.ctcdoGrid}>
              {t.doCells.map((c, i) => (
                <div className={styles.ctcdoCell} key={i}>
                  <span className={styles.gd}>—</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
            <div className={styles.ctcdoFoot}>
              <div className={styles.ftxt}>
                <Image className={styles.cplogo} src="/images/shared/cherry-picked-logo.png" alt="Cherry Picked" width={852} height={858} />
                <p>{t.cpQ}</p>
              </div>
              <a
                className="btn btn-sm"
                href="https://cherry-picked-green.ctcexport.com"
                target="_blank"
                rel="noopener"
                style={{ borderColor: "var(--t-tyrian)", color: "var(--t-tyrian)" }}
              >
                {t.cpBtn}
              </a>
            </div>
          </div>
        </div>
    </section>
  );
}
