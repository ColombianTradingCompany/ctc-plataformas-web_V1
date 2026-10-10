"use client";

import { useEffect, useRef, useState } from "react";
import { List, X } from "lucide-react";
import s from "./dossier.module.css";

// V5.201 (owner, 2026-10-10): «quiero que [el Dossier que abre el carrusel] sea un html continuo con un botón en la parte
// inferior para navegar sus titulares». El botón flota abajo en el centro, dice en qué sección va el lector y abre la lista de
// las secciones; pulsar una lleva a ella (y le pasa el foco, para quien navega con el teclado). Solo lo monta el Dossier
// PÚBLICO: el del productor sigue en hojas A4.

export type SeccionDelDossier = { id: string; numero: string; titulo: string };

const movimientoReducido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function NavegacionDelDossier({
  secciones,
  etiqueta,
  aria,
  cerrar,
}: {
  secciones: SeccionDelDossier[];
  /** «Contenido» / «Contents». */
  etiqueta: string;
  /** El nombre de la lista para un lector de pantalla. */
  aria: string;
  /** El nombre del botón cuando la lista está abierta. */
  cerrar: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const [actual, setActual] = useState<string | null>(secciones[0]?.id ?? null);
  const cajaRef = useRef<HTMLDivElement | null>(null);

  // La sección en curso: la que cruza la franja de lectura (un tercio desde arriba de la ventana).
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = secciones.map((x) => document.getElementById(x.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setActual(e.target.id);
      },
      { rootMargin: "-30% 0px -65% 0px" }
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [secciones]);

  // Abierta, la lista se cierra con Escape o tocando fuera de ella.
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierta(false);
    };
    const fuera = (e: PointerEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierta(false);
    };
    window.addEventListener("keydown", tecla);
    window.addEventListener("pointerdown", fuera);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("pointerdown", fuera);
    };
  }, [abierta]);

  const ir = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const destino = document.getElementById(id);
    if (!destino) return;
    e.preventDefault();
    destino.scrollIntoView({ behavior: movimientoReducido() ? "auto" : "smooth", block: "start" });
    destino.focus({ preventScroll: true });
    window.history.replaceState(null, "", `#${id}`);
    setActual(id);
    setAbierta(false);
  };

  const enCurso = secciones.find((x) => x.id === actual) ?? null;

  return (
    <div className={s.nav} ref={cajaRef}>
      {abierta && (
        <nav className={s.navPanel} aria-label={aria} id="dossier-contenido">
          <ol>
            {secciones.map((x) => (
              <li key={x.id}>
                <a href={`#${x.id}`} aria-current={x.id === actual ? "true" : undefined} onClick={(e) => ir(e, x.id)}>
                  <span className={s.mono}>{x.numero}</span>
                  <span>{x.titulo}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <button
        type="button"
        className={s.navBoton}
        aria-expanded={abierta}
        aria-controls={abierta ? "dossier-contenido" : undefined}
        aria-label={abierta ? cerrar : undefined}
        onClick={() => setAbierta((v) => !v)}
      >
        {abierta ? <X size={18} strokeWidth={2.2} aria-hidden /> : <List size={18} strokeWidth={2.2} aria-hidden />}
        <span>{etiqueta}</span>
        {enCurso && !abierta && <span className={s.navActual}>{enCurso.titulo}</span>}
      </button>
    </div>
  );
}
