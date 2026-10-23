"use client";

// ── El puente de trabajos, hablado desde React (V6.6) ─────────────────────────────────────────────────────────────────
// `public/tools/ctc-bridge.js` es para HTML autocontenidos. La Coffee Datasheet Tool es una página de Next desde la V6.6,
// así que habla el MISMO protocolo con la concha (`SesionHerramienta`), con las mismas reglas:
//   puente → concha   {ctc:"ready", v:1}            al montar (y cada vez que la concha dice «hola»)
//   concha → puente   {ctc:"init", nombre, estado}  al abrir el trabajo → se normaliza y se pinta
//   puente → concha   {ctc:"estado", estado, resumen} tras cambios (debounce 900 ms), solo después del init
// Fuera de la concha (la página abierta suelta) el puente queda inerte y el borrador vive en el navegador (localStorage):
// dentro de la concha NUNCA se usa localStorage, porque un borrador local cruzaría dos trabajos distintos.
// Solo se obedece al `parent`. El «ready» no lleva datos y sale con `*`, como en `ctc-bridge.js` (la concha valida `source` y
// `origin`); el «estado» se le manda AL ORIGEN QUE MANDÓ EL INIT (la concha real es https), y solo con `*` si ese origen es opaco
// (el arnés de `qa-tools-puente-conformance` monta la herramienta desde `about:blank`, igual que a las herramientas vendidas).

import { useEffect, useRef } from "react";

export const CLAVE_BORRADOR = "ctcx-coffee-datasheet-borrador-v2";
const DEBOUNCE_MS = 900;

export function enConcha(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

export function usePuente<T>({
  estado,
  resumen,
  alInit,
}: {
  /** `null` mientras el estado no ha nacido (antes de leer el borrador o el init): entonces no se guarda nada. */
  estado: T | null;
  resumen: string;
  /** Lo que la concha manda al abrir el trabajo (puede venir vacío: trabajo nuevo). */
  alInit: (estado: unknown) => void;
}) {
  const activo = useRef(false);
  const origenDeLaConcha = useRef<string>("*");
  const alInitRef = useRef(alInit);
  useEffect(() => {
    alInitRef.current = alInit;
  }, [alInit]);

  useEffect(() => {
    if (!enConcha()) return;
    const ready = () => window.parent.postMessage({ ctc: "ready", v: 1 }, "*");
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      const d = e.data as { ctc?: string; estado?: unknown } | null;
      if (!d || typeof d !== "object") return;
      if (d.ctc === "hola") {
        ready();
        return;
      }
      if (d.ctc !== "init") return;
      activo.current = true;
      origenDeLaConcha.current = e.origin.startsWith("https://") || e.origin.startsWith("http://") ? e.origin : "*";
      alInitRef.current(d.estado);
    };
    window.addEventListener("message", onMessage);
    ready();
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Cada cambio de estado se manda a la concha con debounce — la foto ENTERA, nunca un delta. Fuera de la concha, al borrador.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (estado == null) return;
    const t = setTimeout(() => {
      if (enConcha()) {
        if (!activo.current) return;
        window.parent.postMessage({ ctc: "estado", estado: JSON.parse(JSON.stringify(estado)), resumen: resumen.slice(0, 140) }, origenDeLaConcha.current);
      } else {
        try {
          localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(estado));
        } catch {
          /* sin almacenamiento: la herramienta sigue */
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [estado, resumen]);
}

/** El borrador del navegador, si lo hay y estamos fuera de la concha. */
export function leerBorrador(): unknown {
  if (enConcha()) return null;
  try {
    const b = localStorage.getItem(CLAVE_BORRADOR);
    return b ? JSON.parse(b) : null;
  } catch {
    return null;
  }
}
