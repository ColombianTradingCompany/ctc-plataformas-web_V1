"use client";

import { resumenDelHud, type Tablero } from "@/lib/os/tablero";
import { Cifra, Hora } from "./Cifra";
import { VerFuentes, useProcedencia } from "./Procedencia";
import s from "./os.module.css";

// ── CTCx OS · el HUD (V6.19, F2) ─────────────────────────────────────────────
// La barra del turno, en el morado de la casa (`--primary`, PLAN §7.3 y crítica 26: el
// `--primary-deep` es la barra superior del panel en el teléfono y las dos se fundirían).
// Lleva «CTCx» en Fraunces (el logo oficial va una vez, en Inicio), la hora de la lectura, quien
// mira, cuatro cifras —tareas abiertas y vencidas, despachos pendientes y eventos fallidos de la
// espina, cada una por `Cifra`, con su fuente— y el interruptor «Ver fuentes».
// Sin monedas, gemas, corazones, botón de sincronizar ni modo noche.

export function Hud({ tablero }: { tablero: Tablero | null }) {
  const { nombre } = useProcedencia();
  const r = tablero ? resumenDelHud(tablero) : null;
  return (
    <header className={s.hud} aria-label="Barra del turno">
      <div className={s.hudCabeza}>
        <span className={s.hudMarca}>
          CTCx <span className={s.hudMarcaOs}>OS</span>
        </span>
        <span className={s.hudDato}>
          <span className={s.hudK}>Turno</span>
          {tablero ? <Hora iso={tablero.leidoAt} /> : "Sin lectura"}
        </span>
        {nombre && (
          <span className={s.hudDato}>
            <span className={s.hudK}>En el turno</span>
            {nombre}
          </span>
        )}
      </div>
      {r && (
        <ul className={s.hudChips} aria-label="Cifras del turno">
          <li>
            <span className={s.hudK}>Tareas abiertas</span>
            <Cifra medida={r.abiertas} sinFuente />
          </li>
          <li>
            <span className={s.hudK}>Vencidas</span>
            <Cifra medida={r.vencidas} sinFuente />
          </li>
          <li>
            <span className={s.hudK}>Despachos pendientes</span>
            <Cifra medida={r.despachosPendientes} sinFuente />
          </li>
          <li>
            <span className={s.hudK}>Eventos fallidos</span>
            <Cifra medida={r.colaFallida} sinFuente />
          </li>
        </ul>
      )}
      <div className={s.hudAcciones}>
        <VerFuentes />
      </div>
    </header>
  );
}
