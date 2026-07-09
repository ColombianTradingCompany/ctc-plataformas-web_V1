"use client";

import Image from "next/image";
import { InfoAccordion } from "@/components/InfoAccordion";
import type { Grade, Lot } from "./data";
import { LotCard } from "./LotCard";
import styles from "./GradosSection.module.css";

const TAB_COLOR: Record<string, string> = { Red: "var(--t-red)", Blue: "var(--t-blue)", Gold: "var(--t-gold)" };

export function GradosSection({
  lots,
  myKg,
  openLots,
  loggedIn,
  activeGrade,
  onSetGrade,
  onToggleOpen,
  onChangeQty,
}: {
  lots: Lot[];
  myKg: Record<string, number>;
  openLots: Record<string, boolean>;
  loggedIn: boolean;
  activeGrade: "all" | Grade;
  onSetGrade: (g: "all" | Grade) => void;
  onToggleOpen: (id: string, open: boolean) => void;
  onChangeQty: (id: string, delta: number) => void;
}) {
  const preLots = lots.filter((l) => l.mode === "pre");
  const shown = activeGrade === "all" ? preLots : preLots.filter((l) => l.grade === activeGrade);

  return (
    <section id="grados">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Cosecha de mitaca · Arribo en agosto · Últimas fracciones · Prepago 30% reembolsable</p>
            <h2>La cosecha, grado a grado</h2>
          </div>
        </div>
        <div className={styles.gradeIntro}>
          <Image src="/images/cherry-picked/23-cerezas-rama.png" alt="Cerezas de café madurando en la rama" width={566} height={256} />
          <p style={{ color: "var(--muted)", fontSize: 16.5, maxWidth: "62ch" }}>
            Como las cerezas en la rama, no todos los cafés maduran igual. Nuestro comité cata cada lote de la
            cosecha y le asigna un <strong style={{ color: "var(--ink)" }}>Grado de Calidad</strong>:{" "}
            <span className="mono" style={{ fontSize: 13 }}>RED</span> para la especialidad que rota,{" "}
            <span className="mono" style={{ fontSize: 13 }}>BLUE</span> para los single origin con carácter,{" "}
            <span className="mono" style={{ fontSize: 13 }}>GOLD</span> para las ediciones que se recuerdan. Reserva
            tu fracción en kilos, desde el mínimo de cada lote, con un prepago del 30% que te devolvemos si el café
            no llega o no cumple. El resto lo pagas cuando el contenedor toque puerto.
          </p>
        </div>

        <InfoAccordion
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21c-5-4.4-8-7.6-8-11a8 8 0 0 1 16 0c0 3.4-3 6.6-8 11z" transform="rotate(180 12 12)" />
              <path d="M12 3v10M12 8c-1.6-.4-2.8-1.4-3.4-3M12 6c1.4-.3 2.5-1.1 3-2.5" />
            </svg>
          }
          title="Cumplimiento EUDR incluido en cada lote"
          subtitle="Reglamento UE contra la deforestación · toque para desplegar"
        >
          <p>
            Como operador o comerciante en la UE, el <b>Reglamento (UE) 2023/1115 (EUDR)</b> te exige que el café
            que comercializas sea <b>libre de deforestación</b> (predios sin deforestación después del 31 de
            diciembre de 2020), producido legalmente y trazable hasta el predio con <b>geolocalización</b> —
            polígono incluido cuando la finca supera 4 hectáreas.
          </p>
          <p>
            <b>Con Cherry Picked, esa tarea llega hecha.</b> Cada lote de este catálogo viene de un productor
            registrado en Kaffetal Regal, con sus predios georreferenciados, su evaluación sellada
            criptográficamente y su <b>declaración de debida diligencia (DDS) presentada por CTC</b>: el número de
            referencia DDS acompaña cada despacho y queda visible en tu factura y en la ficha técnica del lote.
            Trazabilidad al predio, verificable, sin que tengas que perseguir a nadie.
          </p>
        </InfoAccordion>

        <div className={styles.tabs} role="tablist" aria-label="Filtrar por grado">
          <button className={`${styles.tab} ${activeGrade === "all" ? styles.active : ""}`} role="tab" onClick={() => onSetGrade("all")}>
            Todos <span className={styles.n}>{preLots.length}</span>
          </button>
          {(["Red", "Blue", "Gold"] as Grade[]).map((g) => (
            <button
              key={g}
              className={`${styles.tab} ${activeGrade === g ? styles.active : ""}`}
              role="tab"
              style={{ ["--tcc" as string]: TAB_COLOR[g] } as React.CSSProperties}
              onClick={() => onSetGrade(g)}
            >
              <span className={styles.cdot} />
              {g} <span className={styles.n}>{preLots.filter((l) => l.grade === g).length}</span>
            </button>
          ))}
        </div>

        <div className={styles.lots}>
          {shown.map((l) => (
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
