"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { LangContext, LANGS, type Lang } from "./i18n";
import { useRandomBounce } from "./useRandomBounce";
import styles from "./FamilyBubble.module.css";

// Language switcher bubble — same shape and manners as FamilyBubble, stacked
// in the bottom-left bubble column. Replaces the old header LangSwitch.

const LANG_NAME: Record<Lang, string> = { en: "English", es: "Español", de: "Deutsch" };

const ARIA: Record<Lang, string> = {
  en: "Change language",
  es: "Cambiar idioma",
  de: "Sprache wechseln",
};

export function LangBubble({ bottom }: { bottom: number }) {
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
              style={{ ["--fbc" as string]: "var(--ink)" } as React.CSSProperties}
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
        style={{ ["--fbc" as string]: "var(--ink)" } as React.CSSProperties}
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
