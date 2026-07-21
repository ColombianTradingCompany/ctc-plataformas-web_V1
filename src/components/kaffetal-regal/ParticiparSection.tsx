"use client";

import Image from "next/image";
import { InfoAccordion } from "@/components/InfoAccordion";
import { useToast } from "@/components/Toast";
import { useLang, type Lang } from "@/components/lang/i18n";
import { ProcessFlow } from "./ProcessFlow";
import styles from "./ParticiparSection.module.css";

type Dict = {
  eyebrow: string;
  h2: string;
  intro: string;
  steps: { h4: string; body: React.ReactNode; mini?: string }[];
  miniFicha: string;
  miniVideos: string;
  videosToast: string;
  flowTitle: string;
  flowSub: string;
  eudrTitle: string;
  eudrSub: string;
  eudrIntro: React.ReactNode;
  eudrPoints: React.ReactNode[];
  eudrWho: React.ReactNode;
  eudrTags: string[];
  sendEyebrow: string;
  sendTitle: string;
  sendMark: string;
  benchCap: string;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Cómo participar · Cinco pasos",
    h2: "Cinco pasos entre su lote y la Arena",
    intro:
      "Todo desde su cuenta, a su ritmo. Y si algo se le atraviesa —los videos, la ficha, la humedad— hay un video de capacitación esperándolo en cada paso.",
    steps: [
      {
        h4: "Cree su cuenta gratis",
        body: (
          <>
            Su información general se registra <strong>una sola vez</strong>: razón social, identificación legal
            (NIT/CC) y nombre del agricultor. Cinco minutos, sin costo.
          </>
        ),
      },
      {
        h4: "Registre sus fincas",
        body: (
          <>
            Un proveedor puede tener varias fincas. Cada una con su identidad propia: ubicación completa,{" "}
            <strong>geolocalización (requisito EUDR)</strong>, altura, historia y características. Son la cara de su
            café en Europa.
          </>
        ),
      },
      {
        h4: "Llene la ficha técnica del lote",
        body: (
          <>
            Cada café se asocia a una de sus fincas y hereda su origen. Usted completa lo propio del lote:
            variedades, proceso, perfil y caracterización física.
          </>
        ),
        mini: "ficha",
      },
      {
        h4: "Adjunte sus videos",
        body: (
          <>
            1–2 min cada uno: usted y su equipo · cada finca · cada café con su cosecha y beneficio. Con el celular
            y buena luz, queda perfecto.
          </>
        ),
        mini: "videos",
      },
      {
        h4: "Inscriba el lote y envíe la muestra",
        body: (
          <>
            La inscripción a la Arena cuesta <strong>$80.000 por lote</strong> —consúltenos por descuentos y
            exenciones— y la muestra son 2 kg de pergamino, por su cuenta, a nuestro laboratorio. Con la inscripción
            al día y la muestra recibida, su lote entra en fila para la Arena.
          </>
        ),
      },
    ],
    miniFicha: "▸ Ver la ficha técnica",
    miniVideos: "▸ Videos de muestra y capacitación",
    videosToast: "Videos de muestra y capacitación (demo)",
    flowTitle: "El camino completo: de su lote al galardón",
    flowSub: "El proceso real, paso a paso · toque para desplegar",
    eudrTitle: "EUDR: el pasaporte ambiental de su café hacia Europa",
    eudrSub: "Reglamento UE contra la deforestación · toque para desplegar",
    eudrIntro: (
      <>
        Desde su entrada en vigor, la Unión Europea solo permite comercializar café que demuestre no estar vinculado
        a deforestación. Es el <b>Reglamento (UE) 2023/1115, conocido como EUDR</b>, y aplica a todo café que toque
        puerto europeo — incluido el suyo. Lo que exige, en concreto:
      </>
    ),
    eudrPoints: [
      <><b>Libre de deforestación:</b> el café debe provenir de predios donde <b>no haya habido deforestación después del 31 de diciembre de 2020</b></>,
      <><b>Legalidad:</b> producido conforme a la ley colombiana — tenencia de la tierra, ambiente y derechos laborales</>,
      <><b>Geolocalización de cada predio:</b> coordenadas GPS del lugar exacto donde crece el café; si el predio supera las <b>4 hectáreas, se exige el polígono</b> completo, no solo un punto</>,
      <><b>Declaración de debida diligencia:</b> presentada en el sistema de información de la UE antes del despacho; su número de referencia acompaña cada embarque</>,
    ],
    eudrWho: (
      <>
        <b>¿Y quién hace todo ese papeleo? Nosotros.</b> Con la geolocalización de sus fincas (la captura al
        registrarlas, guiado por nuestro video de capacitación) y la trazabilidad del registro de la Arena —lote,
        finca, evaluación y sello criptográfico—, <b>CTC prepara y presenta la declaración de debida diligencia por
        usted</b>. Su único trabajo es georreferenciar sus predios con precisión y mantener su información al día.
        La aplicación plena para operadores llega escalonada entre finales de 2026 y mediados de 2027 según el
        tamaño de la empresa, pero la cadena europea ya lo está exigiendo desde hoy: llegar con la tarea hecha es
        llegar primero.
      </>
    ),
    eudrTags: ["Sin deforestación desde 31·dic·2020", "Geolocalización · polígono si > 4 ha", "CTC presenta la declaración por usted"],
    sendEyebrow: "Envío de muestras · 2 kg pergamino",
    sendTitle: "De su cosecha a nuestra mesa de pruebas",
    sendMark: "Marque el paquete con su código de lote (CTC_XXXXXX)",
    benchCap: "Su muestra, en nuestro banco de pruebas · Piedecuesta",
  },
  en: {
    eyebrow: "How to participate · Five steps",
    h2: "Five steps between your lot and the Arena",
    intro:
      "Everything from your account, at your pace. And if anything gets in your way — the videos, the datasheet, the moisture — a training video is waiting at every step.",
    steps: [
      {
        h4: "Create your free account",
        body: (
          <>
            Your general information is registered <strong>once</strong>: business name, legal ID (NIT/CC) and the
            grower&apos;s name. Five minutes, no cost.
          </>
        ),
      },
      {
        h4: "Register your farms",
        body: (
          <>
            One supplier can have several farms. Each with its own identity: full location,{" "}
            <strong>geolocation (an EUDR requirement)</strong>, altitude, history and character. They are your
            coffee&apos;s face in Europe.
          </>
        ),
      },
      {
        h4: "Fill in the lot's technical datasheet",
        body: (
          <>
            Each coffee is tied to one of your farms and inherits its origin. You complete what belongs to the lot:
            varieties, process, profile and physical characterization.
          </>
        ),
        mini: "ficha",
      },
      {
        h4: "Attach your videos",
        body: (
          <>
            1–2 min each: you and your team · each farm · each coffee with its harvest and processing. With a phone
            and good light, it comes out perfect.
          </>
        ),
        mini: "videos",
      },
      {
        h4: "Enter the lot and ship the sample",
        body: (
          <>
            The Arena entry costs <strong>$80,000 COP per lot</strong> — ask us about discounts and exemptions — and
            the sample is 2 kg of parchment, at your expense, to our laboratory. With the entry up to date and the
            sample received, your lot joins the queue for the Arena.
          </>
        ),
      },
    ],
    miniFicha: "▸ See the technical datasheet",
    miniVideos: "▸ Sample and training videos",
    videosToast: "Sample and training videos (demo)",
    flowTitle: "The full path: from your lot to the award",
    flowSub: "The real process, step by step · tap to expand",
    eudrTitle: "EUDR: your coffee's environmental passport to Europe",
    eudrSub: "EU deforestation regulation · tap to expand",
    eudrIntro: (
      <>
        Since it entered into force, the European Union only allows the sale of coffee proven to be unlinked to
        deforestation. It&apos;s <b>Regulation (EU) 2023/1115, known as the EUDR</b>, and it applies to every coffee
        that touches a European port — including yours. What it demands, concretely:
      </>
    ),
    eudrPoints: [
      <><b>Deforestation-free:</b> the coffee must come from plots where <b>no deforestation has occurred after December 31, 2020</b></>,
      <><b>Legality:</b> produced in accordance with Colombian law — land tenure, environment and labor rights</>,
      <><b>Geolocation of every plot:</b> GPS coordinates of the exact place the coffee grows; if the plot exceeds <b>4 hectares, the full polygon</b> is required, not just a point</>,
      <><b>Due-diligence statement:</b> filed in the EU information system before dispatch; its reference number accompanies every shipment</>,
    ],
    eudrWho: (
      <>
        <b>And who does all that paperwork? We do.</b> With your farms&apos; geolocation (captured when you register
        them, guided by our training video) and the traceability of the Arena&apos;s record — lot, farm, evaluation
        and cryptographic seal — <b>CTC prepares and files the due-diligence statement for you</b>. Your only job is
        to georeference your plots precisely and keep your information current. Full application for operators
        arrives in stages between late 2026 and mid-2027 depending on company size, but the European chain is
        already demanding it today: arriving with the homework done is arriving first.
      </>
    ),
    eudrTags: ["No deforestation since Dec 31, 2020", "Geolocation · polygon if > 4 ha", "CTC files the statement for you"],
    sendEyebrow: "Sample shipping · 2 kg parchment",
    sendTitle: "From your harvest to our test bench",
    sendMark: "Mark the package with your lot code (CTC_XXXXXX)",
    benchCap: "Your sample, on our test bench · Piedecuesta",
  },
  de: {
    eyebrow: "So nehmen Sie teil · Fünf Schritte",
    h2: "Fünf Schritte zwischen Ihrem Lot und der Arena",
    intro:
      "Alles aus Ihrem Konto, in Ihrem Tempo. Und wenn etwas dazwischenkommt — die Videos, das Datenblatt, die Feuchte — wartet bei jedem Schritt ein Schulungsvideo.",
    steps: [
      {
        h4: "Erstellen Sie Ihr kostenloses Konto",
        body: (
          <>
            Ihre allgemeinen Daten werden <strong>ein einziges Mal</strong> registriert: Firmenname, rechtliche ID
            (NIT/CC) und Name des Kaffeebauern. Fünf Minuten, kostenlos.
          </>
        ),
      },
      {
        h4: "Registrieren Sie Ihre Fincas",
        body: (
          <>
            Ein Lieferant kann mehrere Fincas haben. Jede mit eigener Identität: vollständiger Standort,{" "}
            <strong>Geolokalisierung (EUDR-Pflicht)</strong>, Höhe, Geschichte und Eigenheiten. Sie sind das Gesicht
            Ihres Kaffees in Europa.
          </>
        ),
      },
      {
        h4: "Füllen Sie das technische Datenblatt des Lots aus",
        body: (
          <>
            Jeder Kaffee gehört zu einer Ihrer Fincas und erbt ihren Ursprung. Sie ergänzen, was zum Lot gehört:
            Varietäten, Prozess, Profil und physische Charakterisierung.
          </>
        ),
        mini: "ficha",
      },
      {
        h4: "Hängen Sie Ihre Videos an",
        body: (
          <>
            Je 1–2 Min.: Sie und Ihr Team · jede Finca · jeder Kaffee mit Ernte und Aufbereitung. Mit dem Handy und
            gutem Licht wird es perfekt.
          </>
        ),
        mini: "videos",
      },
      {
        h4: "Melden Sie das Lot an und senden Sie das Muster",
        body: (
          <>
            Die Arena-Anmeldung kostet <strong>$80.000 COP pro Lot</strong> — fragen Sie uns nach Rabatten und
            Befreiungen — und das Muster sind 2 kg Pergamino, auf Ihre Kosten, an unser Labor. Mit aktueller
            Anmeldung und empfangenem Muster reiht sich Ihr Lot in die Warteschlange der Arena ein.
          </>
        ),
      },
    ],
    miniFicha: "▸ Das technische Datenblatt ansehen",
    miniVideos: "▸ Muster- und Schulungsvideos",
    videosToast: "Muster- und Schulungsvideos (Demo)",
    flowTitle: "Der ganze Weg: von Ihrem Lot zur Auszeichnung",
    flowSub: "Der echte Prozess, Schritt für Schritt · zum Aufklappen tippen",
    eudrTitle: "EUDR: der Umweltpass Ihres Kaffees nach Europa",
    eudrSub: "EU-Entwaldungsverordnung · zum Aufklappen tippen",
    eudrIntro: (
      <>
        Seit ihrem Inkrafttreten erlaubt die Europäische Union nur noch den Handel mit Kaffee, der nachweislich
        nicht mit Entwaldung verbunden ist. Es ist die <b>Verordnung (EU) 2023/1115, bekannt als EUDR</b>, und sie
        gilt für jeden Kaffee, der einen europäischen Hafen berührt — auch Ihren. Was sie konkret verlangt:
      </>
    ),
    eudrPoints: [
      <><b>Entwaldungsfrei:</b> Der Kaffee muss von Grundstücken stammen, auf denen <b>nach dem 31. Dezember 2020 keine Entwaldung stattgefunden hat</b></>,
      <><b>Legalität:</b> produziert nach kolumbianischem Recht — Landbesitz, Umwelt und Arbeitsrechte</>,
      <><b>Geolokalisierung jedes Grundstücks:</b> GPS-Koordinaten des genauen Ortes, an dem der Kaffee wächst; über <b>4 Hektar ist das vollständige Polygon</b> Pflicht, nicht nur ein Punkt</>,
      <><b>Sorgfaltserklärung:</b> eingereicht im EU-Informationssystem vor dem Versand; ihre Referenznummer begleitet jede Lieferung</>,
    ],
    eudrWho: (
      <>
        <b>Und wer macht diesen ganzen Papierkram? Wir.</b> Mit der Geolokalisierung Ihrer Fincas (erfasst bei der
        Registrierung, angeleitet von unserem Schulungsvideo) und der Rückverfolgbarkeit des Arena-Registers — Lot,
        Finca, Bewertung und kryptografisches Siegel — <b>bereitet CTC die Sorgfaltserklärung vor und reicht sie
        für Sie ein</b>. Ihre einzige Aufgabe: Ihre Grundstücke präzise zu georeferenzieren und Ihre Daten aktuell
        zu halten. Die volle Anwendung für Betreiber kommt gestaffelt zwischen Ende 2026 und Mitte 2027 je nach
        Unternehmensgröße, aber die europäische Kette verlangt es schon heute: Wer mit gemachten Hausaufgaben
        ankommt, kommt zuerst an.
      </>
    ),
    eudrTags: ["Keine Entwaldung seit 31.12.2020", "Geolokalisierung · Polygon bei > 4 ha", "CTC reicht die Erklärung für Sie ein"],
    sendEyebrow: "Musterversand · 2 kg Pergamino",
    sendTitle: "Von Ihrer Ernte auf unseren Prüfstand",
    sendMark: "Markieren Sie das Paket mit Ihrem Lot-Code (CTC_XXXXXX)",
    benchCap: "Ihr Muster, auf unserem Prüfstand · Piedecuesta",
  },
};

export function ParticiparSection({ onLogin }: { onLogin: () => void }) {
  const { showToast } = useToast();
  const t = T[useLang()];

  return (
    <section id="participar">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
          <p>{t.intro}</p>
        </div>
        <div className={styles.steps}>
          {t.steps.map((s) => (
            <div className={styles.step} key={s.h4}>
              <h4>{s.h4}</h4>
              <p>{s.body}</p>
              {s.mini === "ficha" && (
                <a className={styles.mini} href="#" onClick={(e) => { e.preventDefault(); onLogin(); }}>
                  {t.miniFicha}
                </a>
              )}
              {s.mini === "videos" && (
                <a className={styles.mini} href="#" onClick={(e) => { e.preventDefault(); showToast(t.videosToast); }}>
                  {t.miniVideos}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* El camino completo (2026-07-20): el diagrama del proceso REAL —
            los cinco pasos de arriba son la simplificación; esto es el mapa. */}
        <div style={{ marginTop: 20 }}>
          <InfoAccordion
            tone="accent"
            icon={
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="6" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="6" r="2.2" /><circle cx="12" cy="19" r="2.2" /><path d="M6.6 7.5 10.4 10.6M17.4 7.5 13.6 10.6M12 14.2v2.6" /></svg>
            }
            title={t.flowTitle}
            subtitle={t.flowSub}
          >
            <ProcessFlow />
          </InfoAccordion>
        </div>

        <div style={{ marginTop: 20 }}>
          <InfoAccordion
            tone="primary"
            icon={
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-5-4.4-8-7.6-8-11a8 8 0 0 1 16 0c0 3.4-3 6.6-8 11z" transform="rotate(180 12 12)" /><path d="M12 3v10M12 8c-1.6-.4-2.8-1.4-3.4-3M12 6c1.4-.3 2.5-1.1 3-2.5" /></svg>
            }
            title={t.eudrTitle}
            subtitle={t.eudrSub}
          >
            <p>{t.eudrIntro}</p>
            <ul>
              {t.eudrPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            <p>{t.eudrWho}</p>
            <div className={styles.tag3}>
              {t.eudrTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </InfoAccordion>
        </div>

        <div className={styles.sendgrid}>
          <div className={styles.addrband} style={{ backgroundImage: "url('/images/kaffetal-regal/32-cerezas-rama.jpg')" }}>
            <p className="eyebrow" style={{ color: "var(--accent-soft)" }}>{t.sendEyebrow}</p>
            <strong style={{ color: "#fff", fontFamily: "var(--font-fraunces)", fontSize: 21 }}>{t.sendTitle}</strong>
            <span className="mono" style={{ fontSize: 13.5, color: "#fff" }}>CTC · Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander</span>
            <span className="mono" style={{ color: "#C9A45C", fontSize: 12 }}>{t.sendMark}</span>
          </div>
          <figure className={styles.bench}>
            <Image src="/images/kaffetal-regal/33-banco-pruebas-real.jpg" alt="Banco de pruebas de café en Piedecuesta" fill sizes="(max-width: 820px) 100vw, 40vw" style={{ objectFit: "cover" }} />
            <span>{t.benchCap}</span>
          </figure>
        </div>
      </div>
    </section>
  );
}
