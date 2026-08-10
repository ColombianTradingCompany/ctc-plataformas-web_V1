"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import type { QuoteId, TickerPayload } from "@/lib/market/ticker";
import styles from "./MarketTicker.module.css";

// ── La cinta de mercado ──────────────────────────────────────────────────────
// Cierra el hero por abajo con lo que el oficio mira cada mañana: arábica en
// Nueva York, robusta en Londres, el precio interno de la Federación, las tres
// divisas del negocio y los titulares del día, cada uno enlazado a su fuente.
//
// Se pide desde el navegador (/api/home/ticker) a propósito: así la página
// sigue siendo estática y la cinta se refresca sola sin volver a construir el
// sitio. Si la petición falla, la cinta no aparece — nunca rompe el hero.

const LABEL: Record<Lang, Record<QuoteId, string>> = {
  es: {
    nyc: "NY-C · Arábica",
    robusta: "Londres · Robusta",
    fnc: "FNC · Precio interno",
    inventarios: "ICE · Inventarios certificados",
    usdcop: "USD/COP",
    eurusd: "EUR/USD",
    usdbrl: "USD/BRL",
  },
  en: {
    nyc: "NY-C · Arabica",
    robusta: "London · Robusta",
    fnc: "FNC · Colombian internal price",
    inventarios: "ICE · Certified stocks",
    usdcop: "USD/COP",
    eurusd: "EUR/USD",
    usdbrl: "USD/BRL",
  },
  de: {
    nyc: "NY-C · Arabica",
    robusta: "London · Robusta",
    fnc: "FNC · Binnenpreis Kolumbien",
    inventarios: "ICE · Zertifizierte Bestände",
    usdcop: "USD/COP",
    eurusd: "EUR/USD",
    usdbrl: "USD/BRL",
  },
};

const ARIA: Record<Lang, string> = {
  es: "Referencias de mercado y titulares del café",
  en: "Coffee market references and headlines",
  de: "Marktreferenzen und Schlagzeilen zum Kaffee",
};

const LOCALE: Record<Lang, string> = { es: "es-CO", en: "en-US", de: "de-DE" };

export function MarketTicker() {
  const lang = useLang();
  const [data, setData] = useState<TickerPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/home/ticker")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: TickerPayload) => alive && setData(j))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;

  const num = (v: number, decimals: number) =>
    new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);

  const cells: React.ReactNode[] = [];
  if (data) {
    for (const q of data.quotes) {
      // Una variación que redondea a 0,00 % no es una subida: dibujar «▲ 0,00 %»
      // (que es lo que salía con dos lecturas iguales de la FNC) miente.
      const moved = q.changePct !== null && Math.abs(q.changePct) >= 0.005;
      const up = (q.changePct ?? 0) >= 0;
      cells.push(
        <a
          key={`q:${q.id}`}
          className={styles.cell}
          href={q.href ?? undefined}
          target="_blank"
          rel="noopener"
          {...(q.asOf ? { title: q.asOf } : {})}
        >
          <span className={styles.label}>{LABEL[lang][q.id]}</span>
          <b className={styles.value}>
            {num(q.value, q.decimals)}
            <i>{q.unit}</i>
          </b>
          {moved && (
            <span className={up ? styles.up : styles.down}>
              {up ? "▲" : "▼"} {num(Math.abs(q.changePct as number), 2)}%
            </span>
          )}
        </a>
      );
    }
    for (const n of data.news) {
      cells.push(
        <a key={`n:${n.id}`} className={`${styles.cell} ${styles.news}`} href={n.url} target="_blank" rel="noopener">
          <span className={styles.label}>{n.source}</span>
          <span className={styles.headline}>{n.title}</span>
        </a>
      );
    }
  }

  // Cargada y vacía (todas las fuentes callaron): mejor no dibujar una barra
  // hueca que ocupa sitio y no dice nada.
  if (data && cells.length === 0) return null;

  const strip = (
    <div className={styles.strip}>
      {cells.map((c, i) => (
        <span className={styles.item} key={i}>
          {c}
          <Image className={styles.sep} src="/images/shared/ctc-logo-parrot.jpg" alt="" width={20} height={20} aria-hidden />
        </span>
      ))}
    </div>
  );

  return (
    <div className={styles.bar} role="region" aria-label={ARIA[lang]}>
      {!data ? (
        <div className={styles.loading} aria-hidden />
      ) : (
        <div className={styles.track}>
          {strip}
          {/* La segunda copia es lo que hace que el bucle no tenga costura. Es
              puramente visual: quien usa lector de pantalla ya leyó la primera. */}
          <div aria-hidden>{strip}</div>
        </div>
      )}
    </div>
  );
}
