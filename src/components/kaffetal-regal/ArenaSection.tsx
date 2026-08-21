"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./ArenaSection.module.css";

type Dict = {
  eyebrow: string;
  h2: string;
  h2em: string;
  p: React.ReactNode;
  note: string;
  chainTitle: string;
  chainBody: React.ReactNode;
  cap: string;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "La vitrina de la temporada",
    h2: "Aquí el productor no vende café: ",
    h2em: "compite.",
    p: (
      <>
        Todo lote de la red se evalúa a ciegas con un{" "}
        <strong style={{ color: "#F7F2E2" }}>Q-Grader certificado</strong> — así nace su Grado CTC. La Arena es lo
        que viene después: nuestra gala en vivo, de guion mínimo y formato primario de contenido para el mercado de
        especialidad, donde los mejores cafés ya galardonados de la temporada — los grados{" "}
        <strong style={{ color: "#F7F2E2" }}>Blue, Gold y Tyrian</strong>, ya con contrato — se enfrentan taza a
        taza, otra vez a ciegas, por el <strong style={{ color: "#F7F2E2" }}>podio de la temporada</strong>. Nadie
        sabe de quién es cada taza — ni nosotros. El nivel no se regala: se cata. Y por eso, cuando llega, vale.
      </>
    ),
    note: "Cada sesión queda grabada: si su lote llega a la vitrina, viaja a Europa con el video de su propia consagración.",
    chainTitle: "⛓ Registro con testigos",
    chainBody: (
      <>
        Cada evaluación guarda sus testigos físicos y un sello criptográfico verificable (asistido con blockchain).
        La certificación CTC —para todo lote evaluado, galardonado o no— incluye puntaje, perfil sensorial y la
        retroalimentación de mejora del Q-Grader. Ese mismo registro, unido a la geolocalización de su finca, alimenta
        la trazabilidad que exige el <strong style={{ color: "#F7F2E2" }}>EUDR</strong> para entrar a Europa.
      </>
    ),
    cap: "Protocolo oficial · Evaluación a ciegas · Q-Graders invitados",
  },
  en: {
    eyebrow: "The showcase of the season",
    h2: "Here the producer doesn't sell coffee: ",
    h2em: "they compete.",
    p: (
      <>
        Every lot in the network is evaluated blind by a{" "}
        <strong style={{ color: "#F7F2E2" }}>certified Q-Grader</strong> — that is where its CTC Grade is born. The
        Arena is what comes after: our live, minimally scripted gala — and our primary content format for the
        specialty market — where the season&apos;s finest already-awarded coffees, the{" "}
        <strong style={{ color: "#F7F2E2" }}>Blue, Gold and Tyrian</strong> grades, already under contract, face
        each other cup to cup, blind once more, for the{" "}
        <strong style={{ color: "#F7F2E2" }}>podium of the season</strong>. Nobody knows whose cup is whose — not
        even us. The level isn&apos;t given away: it&apos;s cupped. And that is why, when it comes, it&apos;s worth
        something.
      </>
    ),
    note: "Every session is recorded: if your lot reaches the showcase, it travels to Europe with the video of its own consecration.",
    chainTitle: "⛓ A record with witnesses",
    chainBody: (
      <>
        Every evaluation keeps its physical witnesses and a verifiable cryptographic seal (blockchain-assisted). The
        CTC certification — for every evaluated lot, awarded or not — includes score, sensory profile and the
        Q-Grader&apos;s improvement feedback. That same record, joined to your farm&apos;s geolocation, feeds the traceability the{" "}
        <strong style={{ color: "#F7F2E2" }}>EUDR</strong> demands to enter Europe.
      </>
    ),
    cap: "Official protocol · Blind evaluation · Guest Q-Graders",
  },
  de: {
    eyebrow: "Die Bühne der Saison",
    h2: "Hier verkauft der Produzent keinen Kaffee: ",
    h2em: "er tritt an.",
    p: (
      <>
        Jedes Lot des Netzwerks wird blind von einem{" "}
        <strong style={{ color: "#F7F2E2" }}>zertifizierten Q-Grader</strong> bewertet — dort entsteht sein
        CTC-Grad. Die Arena ist, was danach kommt: unsere Live-Gala mit minimalem Drehbuch — und unser primäres
        Content-Format für den Spezialitätenmarkt —, in der die besten bereits prämierten Kaffees der Saison, die
        Grade <strong style={{ color: "#F7F2E2" }}>Blue, Gold und Tyrian</strong>, bereits unter Vertrag, Tasse
        gegen Tasse antreten, wieder blind, um das{" "}
        <strong style={{ color: "#F7F2E2" }}>Podium der Saison</strong>. Niemand weiß, wessen Tasse welche ist —
        nicht einmal wir. Das Niveau wird nicht verschenkt: Es wird verkostet. Und deshalb zählt es, wenn es kommt.
      </>
    ),
    note: "Jede Session wird aufgezeichnet: Erreicht Ihr Lot die Bühne, reist es mit dem Video seiner eigenen Krönung nach Europa.",
    chainTitle: "⛓ Ein Register mit Zeugen",
    chainBody: (
      <>
        Jede Bewertung bewahrt ihre physischen Zeugen und ein verifizierbares kryptografisches Siegel
        (blockchain-gestützt). Die CTC-Zertifizierung — für jedes bewertete Lot, prämiert oder nicht — umfasst
        Punktzahl, sensorisches Profil und das Verbesserungs-Feedback des Q-Graders. Dieses Register, verbunden mit
        der Geolokalisierung Ihrer Finca, speist die Rückverfolgbarkeit, die die{" "}
        <strong style={{ color: "#F7F2E2" }}>EUDR</strong> für den Eintritt nach Europa verlangt.
      </>
    ),
    cap: "Offizielles Protokoll · Blindbewertung · Eingeladene Q-Grader",
  },
};

export function ArenaSection() {
  const t = T[useLang()];
  return (
    <section className={styles.arena} id="arena">
      <div className={`wrap ${styles.grid}`}>
        <div>
          <p className="eyebrow" style={{ color: "var(--accent-soft)" }}>{t.eyebrow}</p>
          <h2 className={styles.h2}>
            {t.h2}
            <em>{t.h2em}</em>
          </h2>
          <p className={styles.p}>{t.p}</p>
          <div className={styles.medals}>
            <span className={styles.medal} style={{ background: "var(--t-black)" }}>Black</span>
            <span className={styles.medal} style={{ background: "var(--t-red)" }}>Red</span>
            <span className={styles.medal} style={{ background: "var(--t-blue)" }}>Blue</span>
            <span className={styles.medal} style={{ background: "var(--t-gold)" }}>Gold</span>
            <span className={styles.medal} style={{ background: "var(--t-tyrian)" }}>Tyrian</span>
          </div>
          <p className={styles.note}>{t.note}</p>
          <div className={styles.chain}>
            <span>{t.chainTitle}</span>
            <span>·</span>
            <span>{t.chainBody}</span>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.panelbg}>
            <Image className={styles.cupper} src="/images/kaffetal-regal/34-arena-catacion.jpg" alt="Evaluación en la mesa de catación de la Arena" width={568} height={251} />
          </div>
          <div className={styles.duo}>
            <Image src="/images/kaffetal-regal/10-servida-de-agua-en-la-mesa-de-catacion.jpg" alt="Servida de agua en la mesa de catación" width={300} height={130} />
            <Image src="/images/kaffetal-regal/11-rompiendo-la-costra-en-la-catacion.jpg" alt="Rompiendo la costra en la catación" width={300} height={130} />
          </div>
          <p className={styles.cap}>{t.cap}</p>
        </div>
      </div>
    </section>
  );
}
