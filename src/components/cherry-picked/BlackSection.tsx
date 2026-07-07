"use client";

import Image from "next/image";
import { LOTS } from "./data";
import { LotCard } from "./LotCard";
import styles from "./BlackSection.module.css";

const BLACK_LOTS = LOTS.filter((l) => l.grade === "Black");

export function BlackSection({
  myKg,
  openLots,
  loggedIn,
  onToggleOpen,
  onChangeQty,
}: {
  myKg: Record<string, number>;
  openLots: Record<string, boolean>;
  loggedIn: boolean;
  onToggleOpen: (id: string, open: boolean) => void;
  onChangeQty: (id: string, delta: number) => void;
}) {
  return (
    <section id="black">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Black · On spot · En bodega Ámsterdam · Envío en 2–5 días</p>
            <h2>El café que sostiene tu barra</h2>
          </div>
        </div>
        <div className={styles.blackIntro}>
          <p style={{ color: "var(--muted)", fontSize: 16.5, maxWidth: "62ch" }}>
            Antes de los reflectores está el trabajo diario: el espresso de la mañana, el filtrado de la casa, el
            blend que tus clientes piden sin mirar la carta. Para eso escogemos tres o cuatro lotes Black por
            cosecha —cafés de asociación, limpios, dulces y constantes— disponibles on spot durante los cinco meses
            de cada temporada de venta. Estos son los saldos de la cosecha principal (venta mar–jul); los Black de
            la mitaca arriban en agosto. Liner bag dentro de costal de 35 kg, desde 490 kg. Sin sorpresas, salvo lo
            bueno.
          </p>
          <Image src="/images/cherry-picked/22-black-scoop.jpg" alt="Granos de café verde y tostado" width={635} height={424} />
        </div>
        <div className={styles.lots}>
          {BLACK_LOTS.map((l) => (
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
