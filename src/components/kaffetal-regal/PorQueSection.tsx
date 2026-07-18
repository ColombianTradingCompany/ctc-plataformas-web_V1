"use client";

import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./PorQueSection.module.css";

// El "¿por qué?" del productor. La sección de Oportunidad responde cuánto vale;
// esta responde por qué vale la pena ENTRAR, QUEDARSE y TERMINAR — los tres
// argumentos de la visión v3 traducidos a la voz del caficultor:
//   1. el dato es suyo aunque no gane, 2. la red le fija la prima,
//   3. el historial se acumula y la demanda vuelve con su nombre.

type Reason = { k: string; title: string; lead: string; body: React.ReactNode };

type Dict = {
  eyebrow: string;
  h2: string;
  h2em: string;
  intro: string;
  reasons: Reason[];
  closeBody: React.ReactNode;
  cta: string;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Por qué vale la pena",
    h2: "Aquí el productor no vende café: ",
    h2em: "compite.",
    intro:
      "Y en cada paso deja un dato que la red reutiliza y que ningún actor tendría solo. Por eso lo que gana no se acaba con el lote: se acumula.",
    reasons: [
      {
        k: "01",
        title: "Aunque no gane, se lleva algo",
        lead: "Por qué inscribirse",
        body: (
          <>
            <p>
              Registrar su finca y armar la ficha no cuesta nada. Inscribir un lote a la Arena cuesta <b>$80.000</b>{" "}
              — y lo que recibe de vuelta <b>queda suyo</b>: puntaje, perfil sensorial y el feedback técnico de
              Q-Graders profesionales, gane o no gane. Es el diagnóstico que otros pagan en dólares y que ninguna
              cooperativa le entrega.
            </p>
            <p>
              El <b>polígono de su finca</b> se levanta una sola vez y vale para toda la vida del predio: es la
              llave que vuelve su café exportable a la Unión Europea. Se hace ahora, sirve para siempre.
            </p>
          </>
        ),
      },
      {
        k: "02",
        title: "Su prima no la decide CTC. La decide la red.",
        lead: "Por qué la comunidad",
        body: (
          <>
            <p>
              Cada tostador que entra a <b>Cherry Picked</b> mejora la prima que podemos ofrecerle —{" "}
              <b>sin que usted cambie una sola cosa de su café</b>. Y cada productor que entra hace el catálogo más
              atractivo, lo que atrae más tostadores. Más red, mejor precio: para todos, al mismo tiempo.
            </p>
            <p>
              Por eso la membresía del <b>Kaffetal Club</b> no es un trámite: es la diferencia entre venderle a un
              comprador de paso y pertenecer a una red que negocia por usted, cosecha tras cosecha.
            </p>
          </>
        ),
      },
      {
        k: "03",
        title: "De proveedor a marca de origen",
        lead: "Por qué llegar hasta el final",
        body: (
          <>
            <p>
              Cada lote que completa suma a un <b>historial que solo usted tiene</b>: qué varietal a qué altura, qué
              fermentación repite puntaje. Ese acervo se construye cosecha a cosecha, no se compra con dinero — y es
              lo que CTC Tech usa para recomendarle qué ajustar en la próxima.
            </p>
            <p>
              Y al final del camino, su nombre y su finca viajan en el QR de la bolsa al otro lado del Atlántico.
              Cuando el consumidor pide <b>su</b> café por su nombre, usted deja de ser un proveedor: la demanda
              vuelve, con nombre propio, a su finca.
            </p>
          </>
        ),
      },
    ],
    closeBody: (
      <>
        <b>Por qué la inscripción cuesta $80.000 y no es gratis:</b> porque una catación a ciegas ante Q-Graders, el
        factor de rendimiento y la certificación cuestan de verdad — y porque a la mesa se sienta quien se la
        juega. Aun así, es la palanca de CTC, no una barrera: <b>descontamos o eximimos la inscripción</b> a los
        productores que queremos ver compitiendo. Escríbanos antes de inscribir su primer lote.
      </>
    ),
    cta: "Registrar mi primer lote",
  },
  en: {
    eyebrow: "Why it's worth it",
    h2: "Here the producer doesn't sell coffee: ",
    h2em: "they compete.",
    intro:
      "And at every step they leave a piece of data the network reuses — one no single actor would have alone. That's why what you earn doesn't end with the lot: it accumulates.",
    reasons: [
      {
        k: "01",
        title: "Even if you don't win, you take something home",
        lead: "Why enter",
        body: (
          <>
            <p>
              Registering your farm and building the datasheet costs nothing. Entering a lot into the Arena costs{" "}
              <b>$80,000 COP</b> — and what you get back <b>stays yours</b>: score, sensory profile and technical
              feedback from professional Q-Graders, win or lose. It&apos;s the diagnosis others pay for in dollars
              and no cooperative ever hands you.
            </p>
            <p>
              Your farm&apos;s <b>polygon</b> is surveyed once and holds for the life of the plot: it&apos;s the key
              that makes your coffee exportable to the European Union. Done now, useful forever.
            </p>
          </>
        ),
      },
      {
        k: "02",
        title: "Your premium isn't set by CTC. It's set by the network.",
        lead: "Why the community",
        body: (
          <>
            <p>
              Every roaster who joins <b>Cherry Picked</b> improves the premium we can offer you —{" "}
              <b>without you changing a single thing about your coffee</b>. And every producer who joins makes the
              catalogue more attractive, which attracts more roasters. More network, better price: for everyone, at
              the same time.
            </p>
            <p>
              That&apos;s why <b>Kaffetal Club</b> membership is no formality: it&apos;s the difference between
              selling to a passing buyer and belonging to a network that negotiates for you, harvest after harvest.
            </p>
          </>
        ),
      },
      {
        k: "03",
        title: "From supplier to origin brand",
        lead: "Why go all the way",
        body: (
          <>
            <p>
              Every lot you complete adds to a <b>track record only you have</b>: which varietal at which altitude,
              which fermentation repeats its score. That asset is built harvest by harvest, not bought with money —
            and it&apos;s what CTC Tech uses to recommend what to adjust next time.
            </p>
            <p>
              And at the end of the road, your name and your farm travel in the bag&apos;s QR across the Atlantic.
              When a consumer asks for <b>your</b> coffee by name, you stop being a supplier: demand comes back,
              with a name of its own, to your farm.
            </p>
          </>
        ),
      },
    ],
    closeBody: (
      <>
        <b>Why the entry costs $80,000 COP and isn&apos;t free:</b> because a blind cupping before Q-Graders, the
        yield factor and the certification cost real money — and because the table is for those with skin in the
        game. Even so, it&apos;s CTC&apos;s lever, not a barrier: <b>we discount or waive the entry</b> for
        producers we want to see competing. Write to us before entering your first lot.
      </>
    ),
    cta: "Register my first lot",
  },
  de: {
    eyebrow: "Warum es sich lohnt",
    h2: "Hier verkauft der Produzent keinen Kaffee: ",
    h2em: "er tritt an.",
    intro:
      "Und bei jedem Schritt hinterlässt er ein Datum, das das Netzwerk wiederverwendet — eines, das kein Akteur allein hätte. Deshalb endet das, was Sie gewinnen, nicht mit dem Lot: Es akkumuliert sich.",
    reasons: [
      {
        k: "01",
        title: "Auch ohne Sieg nehmen Sie etwas mit",
        lead: "Warum anmelden",
        body: (
          <>
            <p>
              Die Finca zu registrieren und das Datenblatt zu erstellen kostet nichts. Ein Lot zur Arena anzumelden
              kostet <b>$80.000 COP</b> — und was Sie zurückbekommen, <b>bleibt Ihres</b>: Punktzahl, sensorisches
              Profil und das technische Feedback professioneller Q-Grader, ob Sie gewinnen oder nicht. Es ist die
              Diagnose, die andere in Dollar bezahlen und die Ihnen keine Kooperative je aushändigt.
            </p>
            <p>
              Das <b>Polygon Ihrer Finca</b> wird ein einziges Mal vermessen und gilt für die Lebensdauer des
              Grundstücks: Es ist der Schlüssel, der Ihren Kaffee in die Europäische Union exportierbar macht.
              Jetzt gemacht, für immer nützlich.
            </p>
          </>
        ),
      },
      {
        k: "02",
        title: "Ihre Prämie bestimmt nicht CTC. Sie bestimmt das Netzwerk.",
        lead: "Warum die Gemeinschaft",
        body: (
          <>
            <p>
              Jeder Röster, der zu <b>Cherry Picked</b> kommt, verbessert die Prämie, die wir Ihnen bieten können —{" "}
              <b>ohne dass Sie irgendetwas an Ihrem Kaffee ändern</b>. Und jeder Produzent, der dazukommt, macht den
              Katalog attraktiver, was mehr Röster anzieht. Mehr Netzwerk, besserer Preis: für alle, gleichzeitig.
            </p>
            <p>
              Deshalb ist die Mitgliedschaft im <b>Kaffetal Club</b> keine Formalität: Sie ist der Unterschied
              zwischen dem Verkauf an einen Käufer auf der Durchreise und der Zugehörigkeit zu einem Netzwerk, das
              Ernte für Ernte für Sie verhandelt.
            </p>
          </>
        ),
      },
      {
        k: "03",
        title: "Vom Lieferanten zur Ursprungsmarke",
        lead: "Warum bis zum Ende gehen",
        body: (
          <>
            <p>
              Jedes abgeschlossene Lot baut an einer <b>Historie, die nur Sie besitzen</b>: welche Varietät auf
              welcher Höhe, welche Fermentation ihre Punktzahl wiederholt. Dieses Kapital entsteht Ernte für Ernte,
              nicht mit Geld — und CTC Tech nutzt es, um Ihnen zu empfehlen, was Sie beim nächsten Mal anpassen
              sollten.
            </p>
            <p>
              Und am Ende des Weges reisen Ihr Name und Ihre Finca im QR der Tüte über den Atlantik. Wenn der
              Konsument <b>Ihren</b> Kaffee beim Namen verlangt, sind Sie kein Lieferant mehr: Die Nachfrage kehrt,
              mit eigenem Namen, zu Ihrer Finca zurück.
            </p>
          </>
        ),
      },
    ],
    closeBody: (
      <>
        <b>Warum die Anmeldung $80.000 COP kostet und nicht gratis ist:</b> weil eine Blindverkostung vor
        Q-Gradern, der Ausbeutefaktor und die Zertifizierung wirklich etwas kosten — und weil am Tisch sitzt, wer
        etwas riskiert. Trotzdem ist es CTCs Hebel, keine Barriere: <b>Wir rabattieren oder erlassen die
        Anmeldung</b> für Produzenten, die wir antreten sehen wollen. Schreiben Sie uns, bevor Sie Ihr erstes Lot
        anmelden.
      </>
    ),
    cta: "Mein erstes Lot registrieren",
  },
};

export function PorQueSection({ onLogin }: { onLogin: () => void }) {
  const t = T[useLang()];
  return (
    <section id="porque">
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

        <div className={styles.grid}>
          {t.reasons.map((r) => (
            <article key={r.k} className={styles.card}>
              <span className={styles.k}>{r.k}</span>
              <p className={styles.lead}>{r.lead}</p>
              <h3 className={styles.title}>{r.title}</h3>
              <div className={styles.body}>{r.body}</div>
            </article>
          ))}
        </div>

        <div className={styles.close}>
          <p>{t.closeBody}</p>
          <button className="btn btn-solid-accent" onClick={onLogin}>
            {t.cta}
          </button>
        </div>
      </div>
    </section>
  );
}
