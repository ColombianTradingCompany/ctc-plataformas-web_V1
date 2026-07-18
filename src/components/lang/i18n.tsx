"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Shared trilingual runtime for the Spanish-first surfaces (CTC Home and the
// Kaffetal Regal landing). Mirrors the Cherry Picked pattern — the language
// state + switch UI live here, every component keeps its own dictionary next
// to its JSX — but stays surface-agnostic: the mounting site chooses its
// localStorage key (subdomains are separate origins, so the preference is
// per-site by construction anyway) and its default language.
//
// Spanish is the canonical language of these two surfaces (the producer and
// the corporate visitor read Spanish first); English and German are
// first-class translations, not machine passes.

export type Lang = "es" | "en" | "de";

export const LANGS: readonly Lang[] = ["es", "en", "de"] as const;

// Number/date formatting per language. German and Spanish share the
// continental 1.234,56 style; English gets 1,234.56.
export const LOCALE: Record<Lang, string> = { es: "es-CO", en: "en-GB", de: "de-DE" };

// Exported for the LangBubble (the floating language switcher); everything
// else should keep using the read-only useLang().
export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "es",
  setLang: () => {},
});

export function LangProvider({
  children,
  storageKey,
  defaultLang = "es",
}: {
  children: ReactNode;
  storageKey: string;
  defaultLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  useEffect(() => {
    // Deferred read: SSR markup stays deterministic (the default language) and
    // the effect body has no synchronous setState (react-hooks/set-state-in-effect).
    Promise.resolve().then(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "es" || saved === "en" || saved === "de") setLangState(saved);
    });
  }, [storageKey]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(storageKey, l);
    } catch {
      // Private-mode storage failures just lose persistence, never the switch.
    }
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext).lang;
}
