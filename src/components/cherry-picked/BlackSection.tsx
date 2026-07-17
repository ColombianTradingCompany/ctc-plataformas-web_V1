"use client";

import Image from "next/image";
import { useLang, type Lang } from "./i18n";
import type { Lot } from "./data";
import { LotCard } from "./LotCard";
import styles from "./BlackSection.module.css";

const EN = {
  eyebrow: "Black · On spot · In the Amsterdam warehouse · Ships in 2–5 days",
  h2: "The coffee your bar runs on",
  body: "Before the spotlight comes the daily work: the morning espresso, the house filter, the blend your customers order without looking at the menu. For that we choose three or four Black lots per harvest — clean, sweet, consistent coffees from producer associations — available on spot through the five months of each sales season. These are the remainders of the main harvest (sales Mar–Jul); the mitaca Blacks arrive in August. Liner bag inside a 35 kg sack, from 490 kg. No surprises, except good ones.",
  imgAlt: "Gabriel Sr. among coffee sacks in the warehouse",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Black · On spot · En bodega Ámsterdam · Envío en 2–5 días",
    h2: "El café que sostiene tu barra",
    body: "Antes de los reflectores está el trabajo diario: el espresso de la mañana, el filtrado de la casa, el blend que tus clientes piden sin mirar la carta. Para eso escogemos tres o cuatro lotes Black por cosecha —cafés de asociación, limpios, dulces y constantes— disponibles on spot durante los cinco meses de cada temporada de venta. Estos son los saldos de la cosecha principal (venta mar–jul); los Black de la mitaca arriban en agosto. Liner bag dentro de costal de 35 kg, desde 490 kg. Sin sorpresas, salvo lo bueno.",
    imgAlt: "Gabriel padre entre costales de café en la bodega",
  },
  de: {
    eyebrow: "Black · On Spot · Im Lager Amsterdam · Versand in 2–5 Tagen",
    h2: "Der Kaffee, der deine Bar trägt",
    body: "Vor dem Rampenlicht steht die tägliche Arbeit: der Espresso am Morgen, der Hausfilter, der Blend, den deine Gäste bestellen, ohne auf die Karte zu schauen. Dafür wählen wir pro Ernte drei oder vier Black-Lots aus — saubere, süße, konstante Kaffees von Erzeugergemeinschaften — on spot verfügbar über die fünf Monate jeder Verkaufssaison. Dies sind die Restmengen der Haupternte (Verkauf Mär–Jul); die Blacks der Mitaca kommen im August an. Liner Bag im 35-kg-Sack, ab 490 kg. Keine Überraschungen, außer guten.",
    imgAlt: "Gabriel Senior zwischen Kaffeesäcken im Lager",
  },
};

export function BlackSection({
  lots,
  myKg,
  openLots,
  loggedIn,
  onToggleOpen,
  onChangeQty,
}: {
  lots: Lot[];
  myKg: Record<string, number>;
  openLots: Record<string, boolean>;
  loggedIn: boolean;
  onToggleOpen: (id: string, open: boolean) => void;
  onChangeQty: (id: string, delta: number) => void;
}) {
  const lang = useLang();
  const t = T[lang];
  const blackLots = lots.filter((l) => l.grade === "Black");
  return (
    <section id="black">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
        </div>
        <div className={styles.blackIntro}>
          <p style={{ color: "var(--muted)", fontSize: 16.5, maxWidth: "62ch" }}>{t.body}</p>
          <Image src="/images/cherry-picked/27-bodega-costales.jpg" alt={t.imgAlt} width={543} height={355} />
        </div>
        <div className={styles.lots}>
          {blackLots.map((l) => (
            <LotCard
              key={l.id}
              lot={l}
              mine={myKg[l.id] ?? 0}
              loggedIn={loggedIn}
              open={openLots[l.id] ?? false}
              onToggleOpen={(open) => onToggleOpen(l.id, open)}
              onChange={(delta) => onChangeQty(l.id, delta)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
