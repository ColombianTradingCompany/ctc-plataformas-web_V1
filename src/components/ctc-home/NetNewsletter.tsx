"use client";

// ── El índice de la red · captación de correo ────────────────────────────────
// Ocupa el sitio que dejó la puerta del Control Panel. Mientras el modelo está
// en desarrollo, la red no anuncia su acceso interno: ofrece avisar cuando
// abra. El login NO se ha tocado — /control-panel y /login siguen en pie y
// funcionando, simplemente ya no se anuncian desde aquí.
//
// Reutiliza `subscribeNewsletter` (la misma que usan Roast y X) con fuente
// propia "ctc-home". Sin cuenta, sin correo de vuelta: solo queda la dirección.

import { useState } from "react";
import { subscribeNewsletter } from "@/lib/newsletter/actions";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./EcosystemSection.module.css";

const ES = {
  title: "Te avisamos cuando abra",
  sub: "La red está en construcción. Déjanos tu correo y te escribimos cuando cada puerta se abra de verdad.",
  placeholder: "tu@correo.com",
  cta: "Avísenme",
  sending: "Un momento…",
  done: "Listo — te escribiremos cuando haya algo que enseñar.",
  invalid: "Ese correo no se ve bien. Revísalo e intenta de nuevo.",
  failed: "No se pudo guardar. Intenta de nuevo en un momento.",
};

const T: Record<Lang, typeof ES> = {
  es: ES,
  en: {
    title: "We'll tell you when it opens",
    sub: "The network is still being built. Leave your email and we'll write when each door actually opens.",
    placeholder: "you@email.com",
    cta: "Keep me posted",
    sending: "One moment…",
    done: "Done — we'll write when there's something to show.",
    invalid: "That email doesn't look right. Check it and try again.",
    failed: "Couldn't save it. Try again in a moment.",
  },
  de: {
    title: "Wir melden uns, wenn es öffnet",
    sub: "Das Netzwerk ist im Aufbau. Hinterlass uns deine E-Mail und wir schreiben, sobald jede Tür wirklich offen ist.",
    placeholder: "du@email.com",
    cta: "Benachrichtigt mich",
    sending: "Einen Moment…",
    done: "Fertig — wir schreiben, sobald es etwas zu zeigen gibt.",
    invalid: "Diese E-Mail sieht nicht richtig aus. Bitte prüfen.",
    failed: "Konnte nicht gespeichert werden. Versuch es gleich noch einmal.",
  },
};

export function NetNewsletter() {
  const lang = useLang();
  const t = T[lang];
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // señuelo para bots
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "invalid" | "failed">("idle");

  async function submit() {
    if (status === "sending") return;
    setStatus("sending");
    const res = await subscribeNewsletter({ email, source: "ctc-home", lang, website });
    if (res.ok) {
      setStatus("done");
      setEmail("");
    } else {
      setStatus(res.error);
    }
  }

  return (
    <div className={styles.netNews}>
      <div className={styles.netNewsText}>
        <b>{t.title}</b>
        <span>{t.sub}</span>
      </div>

      {status === "done" ? (
        <p className={styles.netNewsDone}>{t.done}</p>
      ) : (
        <div className={styles.netNewsRow}>
          <input
            id="nl-ctc-home"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.placeholder}
            autoComplete="email"
            aria-label={t.title}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          {/* Señuelo: invisible para una persona, irresistible para un bot. */}
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={styles.netNewsHp}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
          />
          <button className="btn btn-solid-accent" onClick={submit} disabled={status === "sending"}>
            {status === "sending" ? t.sending : t.cta}
          </button>
        </div>
      )}

      {status === "invalid" && <p className={styles.netNewsErr}>{t.invalid}</p>}
      {status === "failed" && <p className={styles.netNewsErr}>{t.failed}</p>}
    </div>
  );
}
