"use client";

import Image from "next/image";
import { useToast } from "@/components/Toast";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./TratoSection.module.css";

type Dict = {
  eyebrow: string;
  h2: string;
  h2em: string;
  intro: string;
  ctcH3: string;
  ctcPoints: React.ReactNode[];
  freezeH3: string;
  freezeIntro: string;
  stairs: { label: string; main: string; freed?: string }[];
  stairFinal: string;
  humidH3: string;
  humidPoints: React.ReactNode[];
  hicSummary: string;
  hicBody: React.ReactNode;
  cpEyebrow: string;
  cpH3: string;
  cpBody: string;
  cpToast: string;
  cpBtn: string;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Para los galardonados · Claro y por escrito",
    h2: "Tres meses, reglas simples, ",
    h2em: "pago completo.",
    intro:
      "Si su lote gana un grado, la oferta de Cherry Picked se pone sobre la mesa con todas las cartas boca arriba. Usted conserva el control de su café en todo momento — estas son las reglas del juego.",
    ctcH3: "Lo que hace CTC",
    ctcPoints: [
      <><strong>Recibe y gestiona el material de muestras</strong> de principio a fin: registro, custodia y preparación para el panel</>,
      <><strong>Administra, cataloga y reporta</strong> los resultados de las cataciones profesionales — su historial queda documentado y consultable</>,
      <>Le compra de entrada <strong>15 kg de pergamino</strong> para las muestras que vuelan a Europa</>,
      <>Publica su lote en Cherry Picked con su nombre, su finca, su ficha, sus videos y su grado</>,
      <>A medida que entran pedidos de tostadores, <strong>confirma por escrito cada aumento</strong> de la cantidad total a comprar (siempre en pergamino)</>,
      <><strong>Prepara y presenta por usted la declaración de debida diligencia EUDR</strong>: su café entra a Europa con el papeleo ambiental resuelto</>,
      <>Al final del mes 3: <strong>cuenta total y pago completo</strong>; el café viaja a nuestras instalaciones para trilla, empaque y consolidación del contenedor</>,
      <>Grado <strong>Black</strong>: además, puede negociar su participación como café base de la temporada (volúmenes de 2,5–4 toneladas)</>,
    ],
    freezeH3: "Lo que congela usted (y lo que puede soltar)",
    freezeIntro:
      "Usted congela una cantidad pactada de su stock por 3 meses bajo las condiciones de venta. Y si el mercado local le toca la puerta, el trato respira: al final de cada mes puede liberar parte. Ejemplo con 400 kg congelados:",
    stairs: [
      { label: "Inicio", main: "400 kg congelados" },
      { label: "Fin mes 1", main: "200 kg siguen", freed: "puede liberar hasta 200 kg" },
      { label: "Fin mes 2", main: "100 kg", freed: "hasta 100 kg más" },
      { label: "Fin mes 3", main: "" },
    ],
    stairFinal: "Corte de cuentas · pago total · despacho a CTC · renovable",
    humidH3: "El compromiso de humedad (innegociable, pero acompañado)",
    humidPoints: [
      <>Usted se compromete a <strong>comprar y usar bolsas de control de humedad</strong> para el stock congelado, y a <strong>confirmar el estado de humedad al final de cada mes</strong></>,
      <>CTC le envía <strong>papeletas HIC gratis</strong> para la verificación</>,
      <>¿No sabe dónde conseguir las bolsas o cómo usarlas? <strong>CTC le ayuda a conseguirlas y lo capacita</strong> — hay video paso a paso en su cuenta</>,
      <>La meta es una sola: que el café que consagró el panel sea exactamente el café que llega a Europa</>,
    ],
    hicSummary: "ⓘ ¿Qué es una papeleta HIC y cómo funciona?",
    hicBody: (
      <>
        HIC significa <strong>Humidity Indicator Card</strong> (tarjeta indicadora de humedad): una tarjeta con
        círculos impregnados de sales que <strong>cambian de color según la humedad relativa</strong> del aire
        dentro del empaque sellado. Se coloca dentro de la bolsa de control junto al café; al revisarla, el último
        círculo que viró de color le dice en qué rango está la humedad, sin abrir instrumentos ni adivinar. Si el
        indicador marca por encima del rango objetivo (equilibrio de un pergamino bien seco, ~10–11,5% de humedad
        en grano), es señal de reacondicionar el secado y avisar a CTC antes de que la calidad sufra. Es la forma
        más simple y barata de custodiar, mes a mes, la taza que ganó en la Arena.
      </>
    ),
    cpEyebrow: "El destino de los galardonados",
    cpH3: "Cherry Picked: donde su nombre viaja con su café",
    cpBody:
      "Tostadores de toda Europa compran fracciones de microlotes en nuestra vitrina, con la ficha, los videos y el grado de cada café a la vista. Cuando alguien en Berlín o Ámsterdam prepara su café, sabe quién lo cultivó y dónde. Ese es el punto de todo esto.",
    cpToast: "Cherry Picked · vitrina de microlotes en Europa (demo)",
    cpBtn: "Conocer Cherry Picked ↗",
  },
  en: {
    eyebrow: "For the awarded · Clear and in writing",
    h2: "Three months, simple rules, ",
    h2em: "full payment.",
    intro:
      "If your lot wins a grade, Cherry Picked's offer goes on the table with every card face up. You keep control of your coffee at all times — these are the rules of the game.",
    ctcH3: "What CTC does",
    ctcPoints: [
      <><strong>Receives and manages the sample material</strong> end to end: registration, custody and preparation for the panel</>,
      <><strong>Administers, catalogues and reports</strong> the results of the professional cuppings — your track record stays documented and consultable</>,
      <>Buys <strong>15 kg of parchment</strong> upfront for the samples that fly to Europe</>,
      <>Publishes your lot on Cherry Picked with your name, your farm, your datasheet, your videos and your grade</>,
      <>As roasters&apos; orders come in, <strong>confirms in writing every increase</strong> of the total quantity to be purchased (always in parchment)</>,
      <><strong>Prepares and files the EUDR due-diligence statement for you</strong>: your coffee enters Europe with the environmental paperwork solved</>,
      <>At the end of month 3: <strong>full settlement and full payment</strong>; the coffee travels to our facilities for milling, packing and container consolidation</>,
      <>Grade <strong>Black</strong>: you can additionally negotiate its participation as the season&apos;s base coffee (volumes of 2.5–4 tonnes)</>,
    ],
    freezeH3: "What you freeze (and what you can release)",
    freezeIntro:
      "You freeze an agreed quantity of your stock for 3 months under the sale conditions. And if the local market knocks on your door, the deal breathes: at the end of each month you can release part. Example with 400 kg frozen:",
    stairs: [
      { label: "Start", main: "400 kg frozen" },
      { label: "End of month 1", main: "200 kg remain", freed: "you may release up to 200 kg" },
      { label: "End of month 2", main: "100 kg", freed: "up to 100 kg more" },
      { label: "End of month 3", main: "" },
    ],
    stairFinal: "Settlement · full payment · dispatch to CTC · renewable",
    humidH3: "The moisture commitment (non-negotiable, but accompanied)",
    humidPoints: [
      <>You commit to <strong>buying and using moisture-control bags</strong> for the frozen stock, and to <strong>confirming the moisture status at the end of each month</strong></>,
      <>CTC sends you <strong>free HIC cards</strong> for verification</>,
      <>Don&apos;t know where to get the bags or how to use them? <strong>CTC helps you source them and trains you</strong> — there&apos;s a step-by-step video in your account</>,
      <>The goal is one and only: that the coffee the panel consecrated is exactly the coffee that arrives in Europe</>,
    ],
    hicSummary: "ⓘ What is an HIC card and how does it work?",
    hicBody: (
      <>
        HIC stands for <strong>Humidity Indicator Card</strong>: a card with salt-impregnated circles that{" "}
        <strong>change color with the relative humidity</strong> of the air inside the sealed package. It goes
        inside the control bag next to the coffee; when you check it, the last circle that changed color tells you
        the humidity range — no instruments to open, no guessing. If the indicator reads above the target range
        (the equilibrium of well-dried parchment, ~10–11.5% bean moisture), it&apos;s the signal to recondition the
        drying and alert CTC before quality suffers. It&apos;s the simplest, cheapest way to guard, month by month,
        the cup that won in the Arena.
      </>
    ),
    cpEyebrow: "The destination of the awarded",
    cpH3: "Cherry Picked: where your name travels with your coffee",
    cpBody:
      "Roasters across Europe buy microlot fractions in our storefront, with each coffee's datasheet, videos and grade in plain sight. When someone in Berlin or Amsterdam brews your coffee, they know who grew it and where. That is the point of all this.",
    cpToast: "Cherry Picked · microlot storefront in Europe (demo)",
    cpBtn: "Discover Cherry Picked ↗",
  },
  de: {
    eyebrow: "Für die Prämierten · Klar und schriftlich",
    h2: "Drei Monate, einfache Regeln, ",
    h2em: "volle Zahlung.",
    intro:
      "Gewinnt Ihr Lot einen Grad, kommt das Angebot von Cherry Picked mit allen Karten offen auf den Tisch. Sie behalten jederzeit die Kontrolle über Ihren Kaffee — das sind die Spielregeln.",
    ctcH3: "Was CTC macht",
    ctcPoints: [
      <><strong>Empfängt und verwaltet das Mustermaterial</strong> von Anfang bis Ende: Registrierung, Verwahrung und Vorbereitung für das Panel</>,
      <><strong>Verwaltet, katalogisiert und berichtet</strong> die Ergebnisse der professionellen Verkostungen — Ihre Historie bleibt dokumentiert und einsehbar</>,
      <>Kauft sofort <strong>15 kg Pergamino</strong> für die Muster, die nach Europa fliegen</>,
      <>Veröffentlicht Ihr Lot auf Cherry Picked mit Ihrem Namen, Ihrer Finca, Ihrem Datenblatt, Ihren Videos und Ihrem Grad</>,
      <>Sobald Bestellungen von Röstern eingehen, <strong>bestätigt es schriftlich jede Erhöhung</strong> der Gesamtkaufmenge (immer in Pergamino)</>,
      <><strong>Bereitet die EUDR-Sorgfaltserklärung vor und reicht sie für Sie ein</strong>: Ihr Kaffee kommt mit gelöstem Umwelt-Papierkram nach Europa</>,
      <>Am Ende von Monat 3: <strong>Gesamtabrechnung und volle Zahlung</strong>; der Kaffee reist zu unseren Anlagen für Schälung, Verpackung und Konsolidierung des Containers</>,
      <>Grad <strong>Black</strong>: Zusätzlich können Sie seine Teilnahme als Basiskaffee der Saison verhandeln (Volumen von 2,5–4 Tonnen)</>,
    ],
    freezeH3: "Was Sie einfrieren (und was Sie freigeben können)",
    freezeIntro:
      "Sie frieren eine vereinbarte Menge Ihres Bestands für 3 Monate unter den Verkaufsbedingungen ein. Und wenn der lokale Markt an Ihre Tür klopft, atmet der Vertrag: Am Ende jedes Monats können Sie einen Teil freigeben. Beispiel mit 400 kg eingefroren:",
    stairs: [
      { label: "Start", main: "400 kg eingefroren" },
      { label: "Ende Monat 1", main: "200 kg bleiben", freed: "bis zu 200 kg freigebbar" },
      { label: "Ende Monat 2", main: "100 kg", freed: "bis zu 100 kg mehr" },
      { label: "Ende Monat 3", main: "" },
    ],
    stairFinal: "Abrechnung · volle Zahlung · Versand an CTC · verlängerbar",
    humidH3: "Die Feuchte-Verpflichtung (nicht verhandelbar, aber begleitet)",
    humidPoints: [
      <>Sie verpflichten sich, <strong>Feuchtekontroll-Beutel zu kaufen und zu verwenden</strong> für den eingefrorenen Bestand, und <strong>den Feuchtezustand am Ende jedes Monats zu bestätigen</strong></>,
      <>CTC schickt Ihnen <strong>kostenlose HIC-Karten</strong> zur Überprüfung</>,
      <>Sie wissen nicht, wo Sie die Beutel bekommen oder wie man sie benutzt? <strong>CTC hilft bei der Beschaffung und schult Sie</strong> — ein Schritt-für-Schritt-Video liegt in Ihrem Konto</>,
      <>Das Ziel ist ein einziges: dass der Kaffee, den das Panel gekrönt hat, genau der Kaffee ist, der in Europa ankommt</>,
    ],
    hicSummary: "ⓘ Was ist eine HIC-Karte und wie funktioniert sie?",
    hicBody: (
      <>
        HIC steht für <strong>Humidity Indicator Card</strong> (Feuchteindikatorkarte): eine Karte mit
        salzimprägnierten Kreisen, die <strong>je nach relativer Luftfeuchte</strong> im versiegelten Beutel{" "}
        <strong>die Farbe wechseln</strong>. Sie liegt im Kontrollbeutel neben dem Kaffee; beim Prüfen sagt Ihnen
        der letzte verfärbte Kreis, in welchem Bereich die Feuchte liegt — ohne Instrumente, ohne Raten. Zeigt der
        Indikator über dem Zielbereich (Gleichgewicht eines gut getrockneten Pergaminos, ~10–11,5 % Kornfeuchte),
        ist das das Signal, die Trocknung nachzubessern und CTC zu informieren, bevor die Qualität leidet. Es ist
        die einfachste und günstigste Art, Monat für Monat die Tasse zu hüten, die in der Arena gewonnen hat.
      </>
    ),
    cpEyebrow: "Das Ziel der Prämierten",
    cpH3: "Cherry Picked: wo Ihr Name mit Ihrem Kaffee reist",
    cpBody:
      "Röster aus ganz Europa kaufen Microlot-Fraktionen in unserem Schaufenster, mit Datenblatt, Videos und Grad jedes Kaffees offen sichtbar. Wenn jemand in Berlin oder Amsterdam Ihren Kaffee aufbrüht, weiß er, wer ihn angebaut hat und wo. Genau darum geht es hier.",
    cpToast: "Cherry Picked · Microlot-Schaufenster in Europa (Demo)",
    cpBtn: "Cherry Picked entdecken ↗",
  },
};

export function TratoSection() {
  const { showToast } = useToast();
  const t = T[useLang()];
  return (
    <section id="trato">
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
        <div className={styles.dealGrid}>
          <div className={styles.panel}>
            <h3>{t.ctcH3}</h3>
            <ul>
              {t.ctcPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div className={styles.panel}>
            <h3>{t.freezeH3}</h3>
            <p style={{ fontSize: 14.5, color: "var(--muted)" }}>{t.freezeIntro}</p>
            <div className={styles.stairs}>
              <div className={styles.stair}>
                <span className={styles.sl}>{t.stairs[0].label}</span>
                <div className={styles.sbar} style={{ width: "100%" }}>{t.stairs[0].main}</div>
              </div>
              <div className={styles.stair}>
                <span className={styles.sl}>{t.stairs[1].label}</span>
                <div className={styles.row2} style={{ width: "100%" }}>
                  <div className={styles.sbar} style={{ width: "50%" }}>{t.stairs[1].main}</div>
                  <div className={`${styles.sbar} ${styles.freed}`} style={{ width: "50%" }}>{t.stairs[1].freed}</div>
                </div>
              </div>
              <div className={styles.stair}>
                <span className={styles.sl}>{t.stairs[2].label}</span>
                <div className={styles.row2} style={{ width: "100%" }}>
                  <div className={styles.sbar} style={{ width: "25%" }}>{t.stairs[2].main}</div>
                  <div className={`${styles.sbar} ${styles.freed}`} style={{ width: "25%" }}>{t.stairs[2].freed}</div>
                </div>
              </div>
              <div className={styles.stair}>
                <span className={styles.sl}>{t.stairs[3].label}</span>
                <div className={styles.sbar} style={{ width: "100%", background: "var(--accent)" }}>{t.stairFinal}</div>
              </div>
            </div>
          </div>
          <div className={`${styles.panel} ${styles.humid}`}>
            <div>
              <h3>{t.humidH3}</h3>
              <ul>
                {t.humidPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              <details className={styles.hic}>
                <summary>{t.hicSummary}</summary>
                <div className={styles.hbody}>{t.hicBody}</div>
              </details>
            </div>
            <Image src="/images/kaffetal-regal/35-humedad-marquesina.jpg" alt="Verificando humedad en la marquesina de secado" width={900} height={499} />
          </div>
        </div>
        <div className={styles.cpk}>
          <div className={styles.cpt}>
            <p className="eyebrow" style={{ color: "#E9B7D2" }}>{t.cpEyebrow}</p>
            <h3>{t.cpH3}</h3>
            <p>{t.cpBody}</p>
            <button className="btn" onClick={() => showToast(t.cpToast)}>
              {t.cpBtn}
            </button>
          </div>
          <Image src="/images/ctc-home/26-tostaduria-gabriel-jr-anna.jpg" alt="Tostaduría de especialidad en Europa" width={900} height={1195} />
        </div>
      </div>
    </section>
  );
}
