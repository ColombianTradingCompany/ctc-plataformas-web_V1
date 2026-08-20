"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { MiRed } from "@/lib/tools/taller";
import styles from "./BarraHerramienta.module.css";

// ── La cinta de una herramienta abierta (owner, 2026-08-20 · V5.8) ──────────
// La queja, con su captura: al abrir una herramienta había CUATRO filas antes
// del contenido — la barra del taller, «Volver a Herramientas del Café», el
// título con su descripción, y la fila de «Mis trabajos». El owner pidió «only
// a very slim sliver at the top with the name and a Back to Tools button, and
// for all other options a gear wheel button».
//
// Esto es esa cinta: UNA fila. Nombre a la izquierda, «Volver» y la rueda
// dentada a la derecha. Todo lo demás —los trabajos, Mi Red, la cuenta, la
// salida— vive dentro del menú de la rueda, que se cierra al escoger, con Esc
// y al tocar fuera.

export function BarraHerramienta({
  nombre,
  email,
  red,
  volverHref,
  volverEtiqueta,
  conTrabajos = false,
}: {
  nombre: string;
  email: string | null;
  red: MiRed;
  volverHref: string;
  volverEtiqueta: string;
  /** Solo cuando la herramienta tiene memoria: el menú de trabajos existe. */
  conTrabajos?: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const caja = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    await createClient().auth.signOut();
    router.push("/herramientas");
    router.refresh();
  }

  return (
    <header className={styles.cinta}>
      <Image src="/images/shared/herramientas-logo.png" alt="" width={22} height={20} className={styles.logo} />
      <b className={styles.nombre}>{nombre}</b>

      <Link href={volverHref} className={styles.volver}>
        ← {volverEtiqueta}
      </Link>

      <div className={styles.menuCaja} ref={caja}>
        <button
          type="button"
          className={styles.rueda}
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-haspopup="menu"
          aria-label="Opciones"
          title="Opciones"
        >
          {/* Rueda dentada — inline, sin dependencia de iconos. */}
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden focusable="false">
            <path
              fill="currentColor"
              d="M19.4 13a7.8 7.8 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1l-.4-2.6h-4l-.4 2.6c-.6.2-1.2.6-1.7 1l-2.4-1-2 3.4L6.6 11a7.8 7.8 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.8 1.7 1l.4 2.6h4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z"
            />
          </svg>
        </button>

        {abierto && (
          <div className={styles.menu} role="menu">
            {conTrabajos && (
              <button
                type="button"
                role="menuitem"
                className={styles.item}
                onClick={() => {
                  setAbierto(false);
                  // La concha escucha esto (SesionHerramienta): la cinta la
                  // pinta la página y el menú vive dentro de la concha, así que
                  // se hablan por evento y no por prop.
                  window.dispatchEvent(new CustomEvent("ctc:mis-trabajos"));
                }}
              >
                Mis trabajos
              </button>
            )}
            <Link href="/herramientas/taller" role="menuitem" className={styles.item} onClick={() => setAbierto(false)}>
              Todas las herramientas
            </Link>

            {/* Mi Red (owner): las puertas de la persona, no todas las de la
                casa. KR o CP según lo que ya sea; si aún no es ninguna, no se
                nombra ninguna — ofrecer las dos sería empujar a elegir. */}
            {red.enlaces.length > 0 && (
              <>
                <span className={styles.grupo}>Mi Red</span>
                {red.enlaces.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    role="menuitem"
                    className={styles.item}
                    target="_blank"
                    rel="noopener"
                    onClick={() => setAbierto(false)}
                  >
                    {l.nombre} ↗
                  </a>
                ))}
              </>
            )}

            <div className={styles.separador} />
            {email && <span className={styles.cuenta}>{email}</span>}
            <button
              type="button"
              role="menuitem"
              className={`${styles.item} ${styles.salir}`}
              onClick={salir}
              disabled={saliendo}
              title="Cierra la sesión en toda la red CTC — es la misma cuenta en todas las plataformas"
            >
              {saliendo ? "Saliendo…" : "Salir de la red"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
