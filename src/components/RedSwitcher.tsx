"use client";

import { useEffect, useRef, useState } from "react";
import { misPlataformasRed, type MisPlataformasRed } from "@/lib/identidad/matriz";

// ── El conmutador de red ("Mi red", owner 2026-08-02) ────────────────────────
// Una identidad, varias membresías: este submenú ofrece el salto a las OTRAS
// superficies donde esta cuenta ya pertenece — la sesión viaja sola con la
// cookie compartida (Domain=.ctcexport.com), así que el salto no pide login.
// Se monta en la cabecera de cada superficie azul (KR, CP, DC, Terratalento).
// Debajo de las membresías van los módulos abiertos de la red (Herramientas,
// Coffeed), que no exigen membresía. Sin sesión o sin otro destino: no pinta.

const PROD = process.env.NODE_ENV === "production";
const URLS = {
  kr: PROD ? "https://kaffetal-regal.ctcexport.com" : "/kaffetal-regal",
  // Green, no el hub: «Mi red» lleva a donde la cuenta HACE algo (su tienda),
  // no a la portada que presenta los cuatro programas.
  cp: PROD ? "https://cherry-picked-green.ctcexport.com" : "/cherry-picked-green",
  dc: PROD ? "https://directoriodelcafe.ctcexport.com" : "/directorio",
  tt: PROD ? "https://terratalento.ctcexport.com" : "/terratalento",
  herramientas: PROD ? "https://herramientas.ctcexport.com" : "/herramientas",
  coffeed: PROD ? "https://coffeed.ctcexport.com" : "/coffeed",
  panel: PROD ? "https://www.ctcexport.com/login" : "/login",
} as const;

const NOMBRES: Record<keyof MisPlataformasRed, string> = {
  kr: "Kaffetal Regal",
  cp: "Cherry Picked",
  dc: "Directorio del Café",
  tt: "Terratalento",
  interno: "CTC Control Panel",
};

export type RedActual = "kr" | "cp" | "dc" | "tt";

export function RedSwitcher({ actual, compact }: { actual: RedActual; compact?: boolean }) {
  const [red, setRed] = useState<MisPlataformasRed | null>(null);
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    misPlataformasRed().then((r) => vivo && setRed(r));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  if (!red) return null;

  const destinos = (Object.keys(NOMBRES) as (keyof MisPlataformasRed)[])
    .filter((k) => k !== actual && red[k])
    .map((k) => ({ key: k, nombre: NOMBRES[k], href: k === "interno" ? URLS.panel : URLS[k as RedActual] }));

  // Sin otra membresía, el conmutador no aporta nada — no pinta (los módulos
  // abiertos ya tienen su puerta en el índice de CTC Home).
  if (destinos.length === 0) return null;

  const S: Record<string, React.CSSProperties> = {
    wrap: { position: "relative", display: "inline-block" },
    menu: {
      position: "absolute",
      top: "calc(100% + 6px)",
      right: 0,
      zIndex: 90,
      minWidth: 230,
      background: "#fff",
      border: "1px solid var(--line, #ddd7cd)",
      borderRadius: 10,
      boxShadow: "0 8px 28px rgba(0,0,0,.14)",
      padding: "8px 0",
    },
    head: {
      fontSize: 10.5,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: "var(--muted, #6b6459)",
      padding: "4px 14px 6px",
    },
    item: {
      display: "block",
      padding: "8px 14px",
      fontSize: 13.5,
      color: "var(--ink, #2b2b2b)",
      textDecoration: "none",
    },
    divisor: { borderTop: "1px dashed var(--line, #e5e0d8)", margin: "6px 0" },
  };

  return (
    <div ref={wrapRef} style={S.wrap}>
      <button
        className="btn btn-sm"
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {compact ? "Mi red ▾" : `Mi red · ${destinos.length + 1} plataforma${destinos.length ? "s" : ""} ▾`}
      </button>
      {abierto && (
        <div style={S.menu} role="menu" aria-label="Mis plataformas de la red CTC">
          <div style={S.head}>Tu cuenta también entra en</div>
          {destinos.map((d) => (
            <a key={d.key} role="menuitem" style={S.item} href={d.href}>
              {d.nombre} ↗
            </a>
          ))}
          <div style={S.divisor} />
          <div style={S.head}>De la red · sin registro</div>
          <a role="menuitem" style={S.item} href={URLS.herramientas}>Herramientas del Café ↗</a>
          <a role="menuitem" style={S.item} href={URLS.coffeed}>Coffeed ↗</a>
        </div>
      )}
    </div>
  );
}
