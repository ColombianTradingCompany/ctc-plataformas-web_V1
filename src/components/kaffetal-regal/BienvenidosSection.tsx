"use client";

import { useLang, type Lang } from "@/components/lang/i18n";
import { YtEmbed } from "@/components/YtEmbed";
import styles from "./BienvenidosSection.module.css";

// ── Bienvenidos al Kaffetal Regal (2026-08-14) ───────────────────────────────
// El bloque que el owner entregó en boceto: entre la portada y «La oportunidad,
// en números», el video de bienvenida con los seis pasos del productor al lado.
// Es la versión en 60 segundos de lo que la página desarrolla después — por eso
// va ANTES del argumento, no dentro de él, y por eso no está en el índice del
// QuickNav: es un vestíbulo, no una sección a la que se vuelve.
//
// El reproductor es el `YtEmbed` compartido (miniatura primero, iframe al
// clic). CAMBIAR EL VIDEO = cambiar este id (lo que va tras `watch?v=`).
const BIENVENIDA_VIDEO_ID = "Yird1_j6yqo";

type Dict = {
  eyebrow: string;
  h2: string;
  h2em: string;
  lead: string;
  steps: string[];
  closing: string;
  videoTitle: string;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Bienvenidos al Kaffetal Regal",
    h2: "Vende tu mejor café en el mundo, ",
    h2em: "desde tu celular.",
    lead: "El camino completo, en un minuto de video — y en seis pasos:",
    steps: [
      "Crea tu cuenta de Productor",
      "Registra tu Finca caficultora",
      "Agrega Lotes de esta cosecha",
      "Descubre el potencial de tu café",
      "Recibe una oferta fija de temporada",
      "Despacha a los mercados globales",
    ],
    closing: "La mejor oferta que valoran los expertos.",
    videoTitle: "Bienvenidos al Kaffetal Regal",
  },
  en: {
    eyebrow: "Welcome to Kaffetal Regal",
    h2: "Sell your best coffee to the world, ",
    h2em: "from your phone.",
    lead: "The whole path, in a one-minute video — and in six steps:",
    steps: [
      "Create your Producer account",
      "Register your coffee farm",
      "Add this harvest's lots",
      "Discover your coffee's potential",
      "Receive a fixed seasonal offer",
      "Ship to the global markets",
    ],
    closing: "The kind of offer experts value.",
    videoTitle: "Welcome to Kaffetal Regal",
  },
  de: {
    eyebrow: "Willkommen im Kaffetal Regal",
    h2: "Verkaufen Sie Ihren besten Kaffee in die Welt, ",
    h2em: "vom Handy aus.",
    lead: "Der ganze Weg, in einer Minute Video — und in sechs Schritten:",
    steps: [
      "Erstellen Sie Ihr Produzentenkonto",
      "Registrieren Sie Ihre Kaffee-Finca",
      "Fügen Sie die Lots dieser Ernte hinzu",
      "Entdecken Sie das Potenzial Ihres Kaffees",
      "Erhalten Sie ein festes Saisonangebot",
      "Versenden Sie in die globalen Märkte",
    ],
    closing: "Das Angebot, das Experten zu schätzen wissen.",
    videoTitle: "Willkommen im Kaffetal Regal",
  },
};

export function BienvenidosSection() {
  const t = T[useLang()];
  return (
    <section className={styles.sec}>
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.video}>
          <YtEmbed videoId={BIENVENIDA_VIDEO_ID} title={t.videoTitle} />
        </div>
        <div className={styles.copy}>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>
            {t.h2}
            <em>{t.h2em}</em>
          </h2>
          <p className={styles.lead}>{t.lead}</p>
          {/* Lista ORDENADA a propósito: son pasos, y el número es la mitad del
              mensaje («esto se hace en orden, y el primero es gratis»). */}
          <ol className={styles.steps}>
            {t.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className={styles.closing}>{t.closing}</p>
        </div>
      </div>
    </section>
  );
}
