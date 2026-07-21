"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./Hero.module.css";

type Dict = {
  eyebrow: string;
  h1: string;
  h1em: string;
  lead: React.ReactNode;
  ctaRegister: string;
  ctaWhy: string;
  photoTag: string;
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
    eyebrow: "Cafés de Colombia, para el mundo",
    h1: "Su cosecha puede ser la mejor taza que alguien pruebe este año. ",
    h1em: "Que se pague como tal.",
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
    ctaWhy: "¿Por qué especialidad?",
    photoTag: "PAISAJE CAFETERO · SANTANDER",
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
    eyebrow: "Coffees of Colombia, for the world",
    h1: "Your harvest could be the best cup someone tastes this year. ",
    h1em: "Let it be paid as such.",
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
    ctaWhy: "Why specialty?",
    photoTag: "COFFEE LANDSCAPE · SANTANDER",
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
    eyebrow: "Kaffees aus Kolumbien, für die Welt",
    h1: "Ihre Ernte könnte die beste Tasse sein, die jemand dieses Jahr probiert. ",
    h1em: "Sie soll auch so bezahlt werden.",
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
    ctaWhy: "Warum Spezialität?",
    photoTag: "KAFFEELANDSCHAFT · SANTANDER",
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
  const PIPE_ICONS = [
    <svg key="1" viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /><path d="M10 12h6M10 16h6" /></svg>,
    <svg key="2" viewBox="0 0 24 24"><path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2" /><path d="M8 4c0 1-1 1.5 0 3M12 4c0 1-1 1.5 0 3" /></svg>,
    <svg key="3" viewBox="0 0 24 24"><circle cx="12" cy="9" r="5.5" /><path d="M9.5 9l1.8 1.8L14.8 7.4" /><path d="M9 13.5 7.5 21l4.5-2.4L16.5 21 15 13.5" /></svg>,
    <svg key="4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c3 2.6 3 14.4 0 17-3-2.6-3-14.4 0-17z" /></svg>,
  ];

  return (
    <section className={styles.hero}>
      <div className="wrap">
        <div className={styles.heroGrid}>
          <div>
            <p className="eyebrow">
              {t.eyebrow}{" "}
              <span className={styles.coldots}>
                <i /><i /><i /><i />
              </span>
            </p>
            <h1 className={styles.h1}>
              {t.h1}
              <em>{t.h1em}</em>
            </h1>
            <p className={styles.lead}>{t.lead}</p>
            <div className={styles.heroCta}>
              <button className="btn btn-solid-accent" onClick={onLogin}>
                {t.ctaRegister}
              </button>
              <button className="btn" onClick={() => onGo("oportunidad")}>
                {t.ctaWhy}
              </button>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <Image
              className={styles.photo}
              src="/images/kaffetal-regal/30-hero-paisaje.jpg"
              alt="Montañas cafeteras de Santander"
              width={900}
              height={678}
            />
            <span className={styles.tag}>{t.photoTag}</span>
            <Image className={styles.krlogo} src="/images/shared/kaffetal-regal-logo.png" alt="Kaffetal Regal" width={1254} height={1254} />
          </div>
        </div>

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
              href="https://cherry-picked.ctcexport.com"
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
