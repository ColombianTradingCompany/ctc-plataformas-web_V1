"use client";

import { useEffect, useState } from "react";
import { CONSOLES, type PanelConsoleKey } from "@/lib/panel/consoles";
import { PanelSidebar } from "./PanelSidebar";
import styles from "./panel.module.css";

// ── Chrome de las consolas internas: rail plegable (2026-07-20) ──────────────
// El rail medía 240 px FIJOS de los 375 de un teléfono, y como html/body llevan
// overflow-x:hidden, los 965 px restantes del contenido quedaban recortados y
// SIN forma de llegar a ellos. Ahora el rail se pliega:
//   · < 1024 px  cajón fuera de pantalla, cerrado por defecto, se abre con el
//                botón ☰ de la barra superior y se cierra al tocar el fondo,
//                al elegir un enlace o con Escape.
//   · ≥ 1024 px  rail fijo como siempre, con un botón para MINIMIZARLO y darle
//                todo el ancho al kanban (lo que pidió el owner).
//
// El estado tiene tres valores a propósito: `null` = "manda el CSS" (visible en
// escritorio, oculto en móvil), y true/false solo cuando el usuario decidió. Así
// el primer render del servidor y el del cliente coinciden — nada de leer el
// ancho de la ventana ni localStorage durante el render.
const STORAGE_KEY = "ctc-panel-nav-open";

export function PanelChrome({
  consoleKey,
  identityName,
  accessibleConsoles,
  isOwner,
  children,
}: {
  consoleKey: PanelConsoleKey;
  identityName: string;
  accessibleConsoles: PanelConsoleKey[];
  isOwner: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean | null>(null);
  const active = CONSOLES[consoleKey];

  // Preferencia de escritorio (plegado/desplegado). En microtarea para no
  // llamar setState en el cuerpo del efecto — regla react-hooks/set-state-in-effect.
  useEffect(() => {
    Promise.resolve().then(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "0") setOpen(false);
    });
  }, []);

  // Escape cierra el cajón (solo cuando está explícitamente abierto).
  useEffect(() => {
    if (open !== true) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle(next: boolean) {
    setOpen(next);
    // Solo se recuerda el PLEGADO: si se guardara también el abierto, el cajón
    // aparecería abierto sobre el contenido al entrar desde un teléfono.
    try {
      if (next) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, "0");
    } catch {
      // Modo privado / almacenamiento bloqueado: la preferencia no persiste,
      // pero la navegación sigue funcionando. No es motivo para romper nada.
    }
  }

  const stateClass = open === true ? styles.navOpen : open === false ? styles.navClosed : "";

  return (
    <div className={`${styles.shell} ${stateClass}`}>
      {/* Barra superior — solo por debajo de 1024 px */}
      <div className={styles.topbar}>
        <button
          type="button"
          className={styles.burger}
          onClick={() => toggle(open !== true)}
          aria-expanded={open === true}
          aria-controls="panel-rail"
          aria-label={open === true ? "Cerrar el menú" : "Abrir el menú"}
        >
          <span aria-hidden>{open === true ? "✕" : "☰"}</span>
        </button>
        <span className={styles.topbarTitle}>
          {active.code} <span className={styles.topbarSub}>{active.name}</span>
        </span>
      </div>

      {/* Fondo del cajón: tocar fuera cierra. Solo existe con el cajón abierto. */}
      {open === true && <div className={styles.backdrop} onClick={() => toggle(false)} aria-hidden />}

      <div
        id="panel-rail"
        className={styles.rail}
        // Elegir un enlace cierra el cajón: sin esto quedaría tapando la página
        // recién abierta en el teléfono. Delegación — un solo manejador.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(null);
        }}
      >
        <PanelSidebar
          activeConsole={consoleKey}
          identityName={identityName}
          accessibleConsoles={accessibleConsoles}
          isOwner={isOwner}
          onMinimize={() => toggle(false)}
        />
      </div>

      <main className={styles.main}>{children}</main>

      {/* Con el rail minimizado en escritorio, esto es lo único que queda para
          traerlo de vuelta. En móvil lo cubre el ☰ de la barra superior. */}
      {open === false && (
        <button type="button" className={styles.restore} onClick={() => toggle(true)} aria-label="Mostrar el menú">
          <span aria-hidden>☰</span>
        </button>
      )}
    </div>
  );
}
