"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { LangContext, LANGS, type Lang } from "./i18n";
import { useRandomBounce } from "./useRandomBounce";
import styles from "./LangBubble.module.css";

// Floating language switcher for the Spanish-first surfaces — same shape and
// manners as the Cherry Picked bubble column: hover-open, closes on selection /
// click-outside / Escape, hops on its own every 10-15 s.

const LANG_NAME: Record<Lang, string> = { es: "Español", en: "English", de: "Deutsch" };

const ARIA: Record<Lang, string> = {
  es: "Cambiar idioma",
  en: "Change language",
  de: "Sprache wechseln",
};

export function LangBubble({ bottom = 24 }: { bottom?: number }) {
  const { lang, setLang } = useContext(LangContext);
  const [open, setOpen] = useState(false);
  const bouncing = useRandomBounce();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={styles.wrap}
      style={{ ["--fb-bottom" as string]: `${bottom}px` } as React.CSSProperties}
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
    >
      {open && (
        <nav className={styles.panel} aria-label={ARIA[lang]}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className={`${styles.entry} ${l === lang ? styles.entryActive : ""}`}
              aria-pressed={l === lang}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
            >
              <span className={styles.code}>{l.toUpperCase()}</span>
              <span>{LANG_NAME[l]}</span>
            </button>
          ))}
        </nav>
      )}

      <button
        className={`${styles.fab} ${bouncing ? styles.bounce : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={ARIA[lang]}
      >
        <span className={styles.fabName} aria-hidden>
          {lang.toUpperCase()}
        </span>
      </button>
    </div>
  );
}
