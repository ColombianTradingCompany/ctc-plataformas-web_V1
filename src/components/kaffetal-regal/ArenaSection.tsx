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
    eyebrow: "Kaffetal Regal Arena · Formato de creación de contenido",
    h2: "Aquí no gana el que más grita. ",
    h2em: "Gana la taza.",
    p: (
      <>
        La Arena es nuestro formato primario de contenido para el mercado de especialidad: un espacio en vivo, de
        guion mínimo, donde seguimos el método de catación oficial de la mano de{" "}
        <strong style={{ color: "#F7F2E2" }}>Q-Graders invitados</strong> que evalúan una serie de cafés
        completamente a ciegas. Nadie sabe de quién es cada taza — ni nosotros. Al cierre se otorgan hasta{" "}
        <strong style={{ color: "#F7F2E2" }}>tres galardones</strong> entre los grados de calidad de CTC… o tal vez
        ninguno, si la taza no lo amerita. El nivel no se regala: se cata. Y por eso, cuando llega, vale.
      </>
    ),
    note: "Cada sesión queda grabada: si su lote es galardonado, viaja a Europa con el video de su propia consagración.",
    chainTitle: "⛓ Registro con testigos",
    chainBody: (
      <>
        Cada evaluación guarda sus testigos físicos y un sello criptográfico verificable (asistido con blockchain).
        La certificación CTC —gratuita para todos, galardonados o no— incluye puntaje, perfil sensorial y la
        retroalimentación de mejora del panel. Ese mismo registro, unido a la geolocalización de su finca, alimenta
        la trazabilidad que exige el <strong style={{ color: "#F7F2E2" }}>EUDR</strong> para entrar a Europa.
      </>
    ),
    cap: "Protocolo oficial · Evaluación a ciegas · Q-Graders invitados",
  },
  en: {
    eyebrow: "Kaffetal Regal Arena · A content-creation format",
    h2: "Here the loudest voice doesn't win. ",
    h2em: "The cup wins.",
    p: (
      <>
        The Arena is our primary content format for the specialty market: a live, minimally scripted space where we
        follow the official cupping method in the hands of{" "}
        <strong style={{ color: "#F7F2E2" }}>guest Q-Graders</strong> who evaluate a series of coffees completely
        blind. Nobody knows whose cup is whose — not even us. At the close, up to{" "}
        <strong style={{ color: "#F7F2E2" }}>three awards</strong> are granted among CTC&apos;s quality grades… or
        perhaps none, if the cup doesn&apos;t earn it. The level isn&apos;t given away: it&apos;s cupped. And that
        is why, when it comes, it&apos;s worth something.
      </>
    ),
    note: "Every session is recorded: if your lot is awarded, it travels to Europe with the video of its own consecration.",
    chainTitle: "⛓ A record with witnesses",
    chainBody: (
      <>
        Every evaluation keeps its physical witnesses and a verifiable cryptographic seal (blockchain-assisted). The
        CTC certification — free for everyone, awarded or not — includes score, sensory profile and the panel&apos;s
        improvement feedback. That same record, joined to your farm&apos;s geolocation, feeds the traceability the{" "}
        <strong style={{ color: "#F7F2E2" }}>EUDR</strong> demands to enter Europe.
      </>
    ),
    cap: "Official protocol · Blind evaluation · Guest Q-Graders",
  },
  de: {
    eyebrow: "Kaffetal Regal Arena · Ein Content-Format",
    h2: "Hier gewinnt nicht, wer am lautesten ruft. ",
    h2em: "Die Tasse gewinnt.",
    p: (
      <>
        Die Arena ist unser primäres Content-Format für den Spezialitätenmarkt: ein Live-Raum mit minimalem
        Drehbuch, in dem wir der offiziellen Verkostungsmethode folgen — in den Händen{" "}
        <strong style={{ color: "#F7F2E2" }}>eingeladener Q-Grader</strong>, die eine Reihe von Kaffees völlig blind
        bewerten. Niemand weiß, wessen Tasse welche ist — nicht einmal wir. Zum Abschluss werden bis zu{" "}
        <strong style={{ color: "#F7F2E2" }}>drei Prämierungen</strong> unter den Qualitätsgraden von CTC vergeben…
        oder vielleicht keine, wenn die Tasse es nicht verdient. Das Niveau wird nicht verschenkt: Es wird
        verkostet. Und deshalb zählt es, wenn es kommt.
      </>
    ),
    note: "Jede Session wird aufgezeichnet: Wird Ihr Lot prämiert, reist es mit dem Video seiner eigenen Krönung nach Europa.",
    chainTitle: "⛓ Ein Register mit Zeugen",
    chainBody: (
      <>
        Jede Bewertung bewahrt ihre physischen Zeugen und ein verifizierbares kryptografisches Siegel
        (blockchain-gestützt). Die CTC-Zertifizierung — kostenlos für alle, prämiert oder nicht — umfasst
        Punktzahl, sensorisches Profil und das Verbesserungs-Feedback des Panels. Dieses Register, verbunden mit
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
