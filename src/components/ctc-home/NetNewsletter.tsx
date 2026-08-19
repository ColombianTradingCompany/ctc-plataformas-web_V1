"use client";

// ── El índice de la red · captación por puerta ───────────────────────────────
// Ocupa el sitio que dejó la puerta del Control Panel. Mientras el modelo está
// en desarrollo, la red no anuncia su acceso interno: ofrece avisar cuando
// abra. El login NO se ha tocado — /control-panel y /login siguen en pie.
//
// 2026-08-19 · A6 (revisión V5.0, palabra del owner): había UN solo formulario
// de correo, colgado de la ficha de Terratalento, haciendo de buzón para toda
// la red. Ahora **cada puerta pregunta lo suyo**:
//
//   ctc-home      correo                      (el aviso general, sin cambios)
//   directorio    correo + especialidad
//   herramientas  correo + herramienta de interés
//   terratalento  correo + rol + municipio     ← tabla propia, no lista de correo
//
// UN COMPONENTE PARAMETRIZADO, no cuatro copias — la misma regla que dejó
// InteresBoard con Roast/X/CTC Home: son el mismo gesto y la misma forma, y
// cuatro copias habrían divergido a la primera. Lo que cambia por puerta son
// los CAMPOS y el texto, así que eso es lo que se declara aquí.
//
// Terratalento escribe en `terratalento_interes` y las demás en
// `newsletter_subscribers`: es la única con dos preguntas cuya respuesta no
// sirve para escribir un correo, sino para saber dónde hay manos antes de abrir.

import { useState } from "react";
import { subscribeNewsletter } from "@/lib/newsletter/actions";
import { registrarInteresTerratalento } from "@/lib/terratalento/interesActions";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./EcosystemSection.module.css";

export type PuertaInteres = "ctc-home" | "directorio" | "herramientas" | "terratalento";

type Campo = {
  /** La clave que viaja al servidor. Tiene que estar en la lista blanca de esa
   *  fuente (`CAMPOS` en lib/newsletter/actions.ts) o se descarta en silencio. */
  key: string;
  label: Record<Lang, string>;
  /** Con `options` se pinta un desplegable; sin ellas, un campo de texto. */
  options?: { value: string; label: Record<Lang, string> }[];
};

const ESPECIALIDADES = ["Caficultor", "Barista", "Tostador", "Catador", "Formador", "Otro"];

const CAMPOS: Record<PuertaInteres, Campo[]> = {
  "ctc-home": [],
  directorio: [
    {
      key: "especialidad",
      label: { es: "Tu especialidad", en: "Your specialty", de: "Deine Spezialität" },
      options: ESPECIALIDADES.map((e) => ({ value: e, label: { es: e, en: e, de: e } })),
    },
  ],
  herramientas: [
    {
      key: "herramienta",
      label: {
        es: "¿Qué herramienta te interesa?",
        en: "Which tool are you after?",
        de: "Welches Werkzeug interessiert dich?",
      },
    },
  ],
  terratalento: [
    {
      key: "rol",
      label: { es: "¿De qué lado entras?", en: "Which side are you on?", de: "Von welcher Seite kommst du?" },
      options: [
        { value: "recolector", label: { es: "Recojo café", en: "I pick coffee", de: "Ich pflücke Kaffee" } },
        { value: "finca", label: { es: "Busco manos para mi finca", en: "I need hands for my farm", de: "Ich suche Hände für meine Finca" } },
      ],
    },
    {
      key: "municipio",
      label: { es: "Municipio", en: "Municipality", de: "Gemeinde" },
    },
  ],
};

type Copy = { title: string; sub: string; placeholder: string; cta: string; sending: string; done: string; invalid: string; failed: string };

const GENERAL = {
  es: {
    title: "Te avisamos cuando abra",
    sub: "La red está en construcción. Déjanos tu correo y te escribimos cuando cada puerta se abra de verdad.",
    placeholder: "tu@correo.com",
    cta: "Avísenme",
    sending: "Un momento…",
    done: "Listo — te escribiremos cuando haya algo que enseñar.",
    invalid: "Revisa los campos: falta alguno o el correo no se ve bien.",
    failed: "No se pudo guardar. Intenta de nuevo en un momento.",
  },
  en: {
    title: "We'll tell you when it opens",
    sub: "The network is still being built. Leave your email and we'll write when each door actually opens.",
    placeholder: "you@email.com",
    cta: "Keep me posted",
    sending: "One moment…",
    done: "Done — we'll write when there's something to show.",
    invalid: "Check the fields: one is missing, or the email doesn't look right.",
    failed: "Couldn't save it. Try again in a moment.",
  },
  de: {
    title: "Wir melden uns, wenn es öffnet",
    sub: "Das Netzwerk ist im Aufbau. Hinterlass uns deine E-Mail und wir schreiben, sobald jede Tür wirklich offen ist.",
    placeholder: "du@email.com",
    cta: "Benachrichtigt mich",
    sending: "Einen Moment…",
    done: "Fertig — wir schreiben, sobald es etwas zu zeigen gibt.",
    invalid: "Prüfe die Felder: eines fehlt oder die E-Mail sieht nicht richtig aus.",
    failed: "Konnte nicht gespeichert werden. Versuch es gleich noch einmal.",
  },
} satisfies Record<Lang, Copy>;

/** Solo lo que cambia por puerta. Lo que no se declara, se hereda de GENERAL —
 *  así una puerta nueva es tres líneas y no un diccionario entero. */
const POR_PUERTA: Partial<Record<PuertaInteres, Partial<Record<Lang, Partial<Copy>>>>> = {
  directorio: {
    es: { title: "Avísame cuando abran las inscripciones", sub: "Déjanos tu correo y tu especialidad, y te escribimos en cuanto el Directorio abra el registro." },
    en: { title: "Tell me when registration opens", sub: "Leave your email and your specialty, and we'll write as soon as the Directory opens." },
    de: { title: "Sag mir Bescheid, wenn die Anmeldung öffnet", sub: "Hinterlass E-Mail und Spezialität — wir schreiben, sobald das Verzeichnis öffnet." },
  },
  herramientas: {
    es: { title: "Avísame de herramientas nuevas", sub: "Dinos cuál te haría falta: las siguientes se construyen con lo que pidan más manos." },
    en: { title: "Tell me about new tools", sub: "Tell us which one you'd need — the next ones get built from what most hands ask for." },
    de: { title: "Informiert mich über neue Werkzeuge", sub: "Sag uns, welches dir fehlt — die nächsten entstehen aus dem, was am meisten gefragt wird." },
  },
  terratalento: {
    es: { title: "Terratalento abre pronto", sub: "Aún no está en pie. Cuéntanos de qué lado entras y desde dónde: así sabemos dónde hay manos antes de abrir.", cta: "Apuntarme" },
    en: { title: "Terratalento opens soon", sub: "It isn't live yet. Tell us which side you're on and where from, so we know where the hands are before opening.", cta: "Sign me up" },
    de: { title: "Terratalento öffnet bald", sub: "Noch nicht live. Sag uns, von welcher Seite du kommst und von wo — damit wir vor der Öffnung wissen, wo die Hände sind.", cta: "Anmelden" },
  },
};

export function NetNewsletter({ puerta = "ctc-home" }: { puerta?: PuertaInteres }) {
  const lang = useLang();
  const t: Copy = { ...GENERAL[lang], ...(POR_PUERTA[puerta]?.[lang] ?? {}) };
  const campos = CAMPOS[puerta];

  const [email, setEmail] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState(""); // señuelo para bots
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "invalid" | "failed">("idle");

  const falta = campos.some((c) => !extra[c.key]);

  async function submit() {
    if (status === "sending") return;
    setStatus("sending");
    const res =
      puerta === "terratalento"
        ? await registrarInteresTerratalento({ email, rol: extra.rol ?? "", municipio: extra.municipio ?? "", lang, website })
        : await subscribeNewsletter({ email, source: puerta, lang, website, fields: extra });
    if (res.ok) {
      setStatus("done");
      setEmail("");
      setExtra({});
    } else {
      setStatus(res.error);
    }
  }

  const set = (k: string, v: string) => setExtra((prev) => ({ ...prev, [k]: v }));

  return (
    <div className={styles.netNews}>
      <div className={styles.netNewsText}>
        <b>{t.title}</b>
        <span>{t.sub}</span>
      </div>

      {status === "done" ? (
        <p className={styles.netNewsDone}>{t.done}</p>
      ) : (
        <>
          {/* Los campos propios van ARRIBA del correo: se contestan antes de la
              dirección porque son la pregunta, y el correo es solo cómo
              volvemos. Cada uno lleva su etiqueta visible — un desplegable sin
              etiqueta obliga a adivinar qué se está eligiendo. */}
          {campos.map((c) => (
            <label key={c.key} className={styles.netNewsField}>
              <span>{c.label[lang]}</span>
              {c.options ? (
                <select value={extra[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)}>
                  <option value="">—</option>
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label[lang]}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={extra[c.key] ?? ""}
                  onChange={(e) => set(c.key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !falta) submit();
                  }}
                />
              )}
            </label>
          ))}

          <div className={styles.netNewsRow}>
            <input
              id={`nl-${puerta}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.placeholder}
              autoComplete="email"
              aria-label={t.title}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !falta) submit();
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
            <button className="btn btn-solid-accent" onClick={submit} disabled={status === "sending" || falta}>
              {status === "sending" ? t.sending : t.cta}
            </button>
          </div>
        </>
      )}

      {status === "invalid" && <p className={styles.netNewsErr}>{t.invalid}</p>}
      {status === "failed" && <p className={styles.netNewsErr}>{t.failed}</p>}
    </div>
  );
}
