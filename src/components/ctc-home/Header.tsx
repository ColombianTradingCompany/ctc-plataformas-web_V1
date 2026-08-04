"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useContactModal } from "./ContactModal";
import { useLang, type Lang } from "@/components/lang/i18n";
import { PAGE_INDEX } from "./pageIndex";
import styles from "./Header.module.css";

const T: Record<Lang, { write: string; idxAria: string }> = {
  es: { write: "Escríbenos", idxAria: "Índice de la página" },
  en: { write: "Write to us", idxAria: "Page index" },
  de: { write: "Schreiben Sie uns", idxAria: "Seitenindex" },
};

export function Header() {
  const lang = useLang();
  const t = T[lang];
  // El MISMO índice que la burbuja «Navegar» (./pageIndex).
  const links = PAGE_INDEX[lang];
  const [hidden, setHidden] = useState(false);
  const [idxOpen, setIdxOpen] = useState(false);
  const lastY = useRef(0);
  const idxRef = useRef<HTMLDetailsElement>(null);
  const { openForm } = useContactModal();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY.current && y > 140) {
        setHidden(true);
        setIdxOpen(false);
      } else if (y < lastY.current) {
        setHidden(false);
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (idxOpen && idxRef.current && !idxRef.current.contains(e.target as Node)) {
        setIdxOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [idxOpen]);

  return (
    <header className={`${styles.header}${hidden ? " " + styles.hide : ""}`}>
      <div className={styles.nav}>
        <div className={styles.brandLogo}>
          <Image
            src="/images/shared/ctc-logo-full.png"
            alt="Colombian Trading Company · Cafés de Colombia, para el mundo"
            width={2234}
            height={1231}
            priority
          />
        </div>
        <button className="btn btn-sm btn-solid" onClick={() => openForm("general")}>
          {t.write}
        </button>
        <details className={styles.idx} ref={idxRef} open={idxOpen} onToggle={(e) => setIdxOpen(e.currentTarget.open)}>
          <summary aria-label={t.idxAria} title={t.idxAria}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
              <line x1="9" y1="6" x2="20.5" y2="6" />
              <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
              <line x1="9" y1="12" x2="20.5" y2="12" />
              <circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none" />
              <line x1="9" y1="18" x2="20.5" y2="18" />
            </svg>
          </summary>
          <div className={styles.idxMenu}>
            {links.map((l, i) => (
              <a key={l.id} href={`#${l.id}`} onClick={() => setIdxOpen(false)}>
                <span className={styles.n}>{String(i + 1).padStart(2, "0")}</span>
                <span>
                  {l.label}
                  <small>{l.sub}</small>
                </span>
              </a>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
