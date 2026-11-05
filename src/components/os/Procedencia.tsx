"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { PanelConsoleKey } from "@/lib/panel/consoles";
import s from "./os.module.css";

// ── CTCx OS · quién mira y si quiere ver las fuentes (V6.19, F2) ─────────────
// Un solo contexto para todo el OS:
//   · `consolas` e `isOwner` de quien mira: «Abrir» solo lleva a una pantalla que su rail le
//     enseña (`enlaceVisible`, la regla del rail, crítica 12);
//   · `nombre`: el que pinta el HUD;
//   · `ver`: el interruptor «Ver fuentes» del HUD. Encendido, cada `Cifra` dice de qué columna (o
//     función) de la plataforma sale. Se recuerda en este navegador (localStorage, siempre dentro de
//     un try: en una ventana privada o con el almacenamiento bloqueado, se recuerda solo en memoria).
// Lo monta el layout de la OS; la demostración monta el suyo, con una identidad inventada.

const LLAVE = "ctcx-os:ver-fuentes";
let enMemoria = false;
// Una lista (no un Set): el guardián del OS lee `.delete(` como una escritura en la base.
let oyentes: (() => void)[] = [];

function leerVer(): boolean {
  try {
    const v = window.localStorage.getItem(LLAVE);
    return v === null ? enMemoria : v === "1";
  } catch {
    return enMemoria;
  }
}

function suscribir(avisar: () => void): () => void {
  oyentes = [...oyentes, avisar];
  const alCambiarOtraPestana = (e: StorageEvent) => {
    if (e.key === LLAVE) avisar();
  };
  window.addEventListener("storage", alCambiarOtraPestana);
  return () => {
    oyentes = oyentes.filter((f) => f !== avisar);
    window.removeEventListener("storage", alCambiarOtraPestana);
  };
}

function guardarVer(v: boolean) {
  enMemoria = v;
  try {
    window.localStorage.setItem(LLAVE, v ? "1" : "0");
  } catch {
    // sin almacenamiento: queda en memoria
  }
  for (const f of oyentes) f();
}

type Procedencia = {
  ver: boolean;
  alternar: () => void;
  consolas: readonly PanelConsoleKey[];
  isOwner: boolean;
  nombre: string;
};

const Contexto = createContext<Procedencia | null>(null);

export function ProcedenciaProvider({
  consolas,
  isOwner,
  nombre,
  children,
}: {
  consolas: readonly PanelConsoleKey[];
  isOwner: boolean;
  nombre: string;
  children: React.ReactNode;
}) {
  const ver = useSyncExternalStore(suscribir, leerVer, () => false);
  const alternar = useCallback(() => guardarVer(!leerVer()), []);
  const valor = useMemo(() => ({ ver, alternar, consolas, isOwner, nombre }), [ver, alternar, consolas, isOwner, nombre]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Sin proveedor (una vista montada fuera de la OS) no hay fuentes ni «Abrir»: nunca se enlaza de más. */
export function useProcedencia(): Procedencia {
  return useContext(Contexto) ?? { ver: false, alternar: () => {}, consolas: [], isOwner: false, nombre: "" };
}

/**
 * El interruptor «Ver fuentes» (va en el HUD). Es un botón de alternar: su nombre NO cambia, su estado lo dice
 * `aria-pressed` (y el estilo de `.hudBoton[aria-pressed="true"]`). Cambiar también el texto haría que un lector de
 * pantalla anunciara «Ocultar fuentes, activado», que se contradice.
 */
export function VerFuentes() {
  const { ver, alternar } = useProcedencia();
  return (
    <button type="button" className={s.hudBoton} aria-pressed={ver} onClick={alternar}>
      Ver fuentes
    </button>
  );
}
