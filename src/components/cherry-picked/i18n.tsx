"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import styles from "./i18n.module.css";

// Shared trilingual runtime for the Cherry Picked family (Green / Roast / X).
// English is the canonical language of the storefront (the audience is
// European roasters); Spanish and German are full first-class translations,
// not machine passes. Every component keeps its own dictionary next to its
// JSX — this module only owns the language state and the switch UI.

export type Lang = "en" | "es" | "de";

export const LANGS: readonly Lang[] = ["en", "es", "de"] as const;

// Number/date formatting per language. German and Spanish share the
// continental 1.234,56 style; English gets 1,234.56.
export const LOCALE: Record<Lang, string> = { en: "en-GB", es: "es-ES", de: "de-DE" };

// The three storefronts live on sibling subdomains in production
// (src/proxy.ts) and on path routes in dev. NODE_ENV is a compile-time
// constant on both server and client, so this cannot hydration-mismatch —
// same pattern as QuickNav's casa-matriz link.
export const FAMILY_LINKS =
  process.env.NODE_ENV === "development"
    ? { green: "/cherry-picked", roast: "/cherry-picked-roast", x: "/cherry-picked-x" }
    : {
        green: "https://cherry-picked.ctcexport.com",
        roast: "https://cherry-picked-roast.ctcexport.com",
        x: "https://cherry-picked-x.ctcexport.com",
      };

const STORAGE_KEY = "cp-lang";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    // Deferred read: SSR markup stays deterministic (English) and the
    // effect body has no synchronous setState (react-hooks/set-state-in-effect).
    Promise.resolve().then(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "es" || saved === "de") setLangState(saved);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Private-mode storage failures just lose persistence, never the switch.
    }
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext).lang;
}

const SWITCH_LABEL: Record<Lang, string> = { en: "Language", es: "Idioma", de: "Sprache" };

export function LangSwitch() {
  const { lang, setLang } = useContext(LangContext);
  return (
    <div className={styles.switch} role="group" aria-label={SWITCH_LABEL[lang]}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={`${styles.pill} ${lang === l ? styles.active : ""}`}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
