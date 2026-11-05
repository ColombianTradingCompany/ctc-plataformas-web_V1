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

/** Keeps `<html lang>` in step with the language the surface is SHOWING.
 *
 *  The root layout (src/app/layout.tsx) can only write one static value, "es",
 *  for the whole network — and the Cherry Picked family renders English by
 *  default (its og:locale is en_GB), while every surface lets the visitor
 *  switch to EN or DE. Without this, an English page declared itself Spanish to
 *  screen readers (wrong voice), to the browser's translate prompt and to
 *  search engines, which read the rendered DOM. Both language providers call
 *  it, so the attribute follows the switch. On unmount it puts back what it
 *  found, so a client navigation to a surface without a provider doesn't keep
 *  the last surface's language.
 *
 *  What it can't fix: the FIRST byte still says "es" until hydration, because
 *  the attribute lives in the shared root layout. Serving it right from the
 *  server needs one root layout per language family — a bigger change that
 *  is the owner's call.
 *
 *  `null` leaves the attribute alone: a surface whose page text is Spanish
 *  only (at most its shared footer translates) keeps the layout's "es"
 *  even when the visitor picked EN or DE elsewhere on the network. */
export function useHtmlLang(lang: Lang | null) {
  useEffect(() => {
    if (!lang) return;
    const html = document.documentElement;
    const antes = html.lang;
    html.lang = lang;
    return () => {
      html.lang = antes;
    };
  }, [lang]);
}

export function LangProvider({
  children,
  storageKey,
  defaultLang = "es",
  declaraHtml = true,
}: {
  children: ReactNode;
  storageKey: string;
  defaultLang?: Lang;
  /** false on a surface whose page text is Spanish only (the shared footer
   *  still translates): the provider still runs
   *  (its children read the language), but `<html lang>` stays as the layout
   *  wrote it, because the page itself does not change language. */
  declaraHtml?: boolean;
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

  useHtmlLang(declaraHtml ? lang : null);

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
