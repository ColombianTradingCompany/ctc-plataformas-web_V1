"use client";

import { useState } from "react";
import { subscribeNewsletter } from "@/lib/newsletter/actions";
import { useLang, type Lang } from "./i18n";
import styles from "./NewsletterForm.module.css";

const EN = {
  label: "Follow the story",
  placeholder: "you@yourroastery.eu",
  cta: "Keep me posted",
  sending: "One moment…",
  done: "You're on the list — we'll write as the story unfolds.",
  invalid: "That email doesn't look right — check it and try again.",
  failed: "Couldn't save your subscription. Try again in a moment.",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    label: "Sigue la historia",
    placeholder: "tu@tutostaduria.eu",
    cta: "Mantenerme al tanto",
    sending: "Un momento…",
    done: "Estás en la lista — te escribiremos a medida que la historia avance.",
    invalid: "Ese correo no se ve bien — revísalo e intenta de nuevo.",
    failed: "No se pudo guardar tu suscripción. Intenta de nuevo en un momento.",
  },
  de: {
    label: "Verfolge die Geschichte",
    placeholder: "du@deine-roesterei.de",
    cta: "Haltet mich auf dem Laufenden",
    sending: "Einen Moment…",
    done: "Du stehst auf der Liste — wir schreiben, sobald sich die Geschichte entwickelt.",
    invalid: "Diese E-Mail sieht nicht richtig aus — prüfe sie und versuch es erneut.",
    failed: "Deine Anmeldung konnte nicht gespeichert werden. Versuch es gleich noch einmal.",
  },
};

export function NewsletterForm({ source }: { source: "roast" | "x" }) {
  const lang = useLang();
  const t = T[lang];
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "invalid" | "failed">("idle");

  async function submit() {
    if (status === "sending") return;
    setStatus("sending");
    const res = await subscribeNewsletter({ email, source, lang, website });
    if (res.ok) {
      setStatus("done");
      setEmail("");
    } else {
      setStatus(res.error);
    }
  }

  if (status === "done") {
    return <p className={styles.done}>{t.done}</p>;
  }

  return (
    <div className={styles.form}>
      <label className={styles.label} htmlFor={`nl-${source}`}>
        {t.label}
      </label>
      <div className={styles.row}>
        <input
          id={`nl-${source}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.placeholder}
          autoComplete="email"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {/* Honeypot: visually hidden, tabbed past by humans, filled by bots. */}
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className={styles.hp}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
        />
        <button className="btn btn-solid-accent" onClick={submit} disabled={status === "sending"}>
          {status === "sending" ? t.sending : t.cta}
        </button>
      </div>
      {status === "invalid" && <p className={styles.err}>{t.invalid}</p>}
      {status === "failed" && <p className={styles.err}>{t.failed}</p>}
    </div>
  );
}
