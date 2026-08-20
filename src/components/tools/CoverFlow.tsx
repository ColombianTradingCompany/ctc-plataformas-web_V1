"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CapturaMiniatura } from "./CapturaMiniatura";
import styles from "./CoverFlow.module.css";

// ── Cover Flow (owner, 2026-08-20 · V5.8) ───────────────────────────────────
// «I asked for an Album Cover style instead of the list of blocks, meaning
// something like the Cover Flow from Cool PDF.» Así que la mecánica se toma de
// ahí LITERALMENTE — `RENDER.flow` de public/tools/cool-pdf.html:
//
//   o  = i - centro - frac        desplazamiento respecto al centro
//   x  = signo·(w·.30·min(1,ab) + max(0,ab-1)·w·.20)
//   ry = -signo·min(1,ab)·54deg
//   z  = -min(1,ab)·170 - max(0,ab-1)·55
//   sc = 1 - min(1,ab)·.14        y brightness(1 - min(1,ab)·.38)
//
// con `perspective:1500px` en el escenario. Las mismas constantes: si la de
// Cool PDF se siente bien, ésta se siente igual — que era el encargo.
//
// Se conduce con arrastre, rueda horizontal, flechas del teclado y tocando una
// portada lateral (la trae al centro). La del centro NO navega sola: su ficha
// —descripción, estado Plus, trabajos— vive debajo, y ahí está el botón que
// abre. Mirar y abrir siguen siendo dos gestos distintos.

export type CoverItem = {
  id: string;
  nombre: string;
  descripcion: string;
  esPlus: boolean;
  soportaMemoria: boolean;
  abre: boolean;
  viaPlus: "permiso" | "comodin-heredado" | null;
  sePuedeSolicitar: boolean;
  trabajos: number;
};

export function CoverFlow({ items, idPrefijo }: { items: CoverItem[]; idPrefijo: string }) {
  const [centro, setCentro] = useState(0);
  const escenario = useRef<HTMLDivElement | null>(null);
  const cartas = useRef<(HTMLDivElement | null)[]>([]);
  const frac = useRef(0);
  const arrastre = useRef<{ x0: number; activo: boolean }>({ x0: 0, activo: false });

  // El layout escribe transforms DIRECTAMENTE en el DOM (no por estado de
  // React): durante el arrastre se recalcula por frame, y pasar eso por render
  // convertiría un gesto suave en una cascada de renders.
  const layout = useCallback(() => {
    const caja = escenario.current;
    if (!caja) return;
    const w = Math.min(320, Math.max(180, caja.clientWidth * 0.36));
    const h = w; // carátula cuadrada, como una funda
    cartas.current.forEach((el, i) => {
      if (!el) return;
      const o = i - centro - frac.current;
      const a = Math.abs(o);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      if (a > 4.6) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }
      el.style.opacity = a > 3.4 ? ".12" : "1";
      el.style.pointerEvents = "auto";
      el.style.zIndex = String(200 - Math.round(a * 10));
      const s = Math.sign(o);
      const ab = Math.min(a, 5);
      const x = s * (w * 0.3 * Math.min(1, ab) + Math.max(0, ab - 1) * w * 0.2);
      const ry = -s * Math.min(1, ab) * 54;
      const z = -Math.min(1, ab) * 170 - Math.max(0, ab - 1) * 55;
      const sc = 1 - Math.min(1, ab) * 0.14;
      el.style.transform = `translate(-50%,-50%) translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg) scale(${sc})`;
      el.style.filter = ab < 0.5 ? "none" : `brightness(${1 - Math.min(1, ab) * 0.38})`;
    });
  }, [centro]);

  useEffect(() => {
    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, [layout]);

  const ir = useCallback(
    (d: number) => setCentro((c) => Math.max(0, Math.min(items.length - 1, c + d))),
    [items.length]
  );

  // Arrastre: sin `anim` mientras el dedo va, con `anim` al soltar — igual que
  // Cool PDF, para que el seguimiento sea directo y el asentamiento suave.
  function onPointerDown(e: React.PointerEvent) {
    arrastre.current = { x0: e.clientX, activo: true };
    cartas.current.forEach((el) => el?.classList.remove(styles.anim));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!arrastre.current.activo) return;
    frac.current = -(e.clientX - arrastre.current.x0) / 220;
    layout();
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!arrastre.current.activo) return;
    const dx = e.clientX - arrastre.current.x0;
    arrastre.current.activo = false;
    cartas.current.forEach((el) => el?.classList.add(styles.anim));
    const n = Math.max(-3, Math.min(3, Math.round(-dx / 150)));
    frac.current = 0;
    if (n !== 0) ir(n);
    else layout();
  }

  const actual = items[centro];
  if (!actual) return null;

  return (
    <div className={styles.envoltura}>
      <div
        className={styles.escenario}
        ref={escenario}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 16) ir(e.deltaX > 0 ? 1 : -1);
        }}
        role="listbox"
        aria-label="Herramientas"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); ir(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); ir(-1); }
        }}
      >
        {items.map((h, i) => (
          <div
            key={h.id}
            ref={(el) => { cartas.current[i] = el; }}
            className={`${styles.carta} ${styles.anim}`}
            role="option"
            aria-selected={i === centro}
            aria-label={h.nombre}
            onClick={() => { if (i !== centro) setCentro(i); }}
          >
            <CapturaMiniatura toolId={h.id} className={styles.portada} />
            <span className={styles.banda}>
              <b>{h.nombre}</b>
              {h.esPlus && <i className={h.abre ? styles.selloActiva : styles.selloPlus}>{h.abre ? "Plus ✓" : "Plus"}</i>}
            </span>
          </div>
        ))}
      </div>

      {/* Los controles y la ficha, bajo el escenario. La flecha izquierda y la
          derecha existen para quien no arrastra ni tiene rueda horizontal. */}
      <div className={styles.mando}>
        <button type="button" className={styles.flecha} onClick={() => ir(-1)} disabled={centro === 0} aria-label="Anterior">
          ←
        </button>
        <span className={styles.contador} aria-hidden>
          {centro + 1} / {items.length}
        </span>
        <button
          type="button"
          className={styles.flecha}
          onClick={() => ir(1)}
          disabled={centro === items.length - 1}
          aria-label="Siguiente"
        >
          →
        </button>
      </div>

      <div className={styles.ficha} aria-live="polite">
        <h3 id={`${idPrefijo}-titulo`}>{actual.nombre}</h3>
        {actual.esPlus && (
          <p className={actual.abre ? styles.plusActiva : styles.plusBloqueada}>
            {actual.abre
              ? actual.viaPlus === "comodin-heredado"
                ? "Plus · ACTIVA en tu cuenta (activación de la red)"
                : "Plus · ACTIVA en tu cuenta"
              : "Plus · se activa por solicitud"}
          </p>
        )}
        <p className={styles.desc}>{actual.descripcion}</p>
        <div className={styles.pie}>
          <span className={styles.meta}>
            {actual.soportaMemoria
              ? actual.trabajos > 0
                ? `${actual.trabajos} trabajo${actual.trabajos === 1 ? "" : "s"} guardado${actual.trabajos === 1 ? "" : "s"}`
                : "Guarda trabajos con nombre y fecha"
              : ""}
          </span>
          <Link
            href={`/herramientas/taller/${actual.id}?volver=${encodeURIComponent("/herramientas/taller")}`}
            className="btn btn-sm btn-solid"
          >
            {actual.abre ? "Abrir →" : actual.sePuedeSolicitar ? "Ver y solicitar →" : "Ver →"}
          </Link>
        </div>
      </div>
    </div>
  );
}
