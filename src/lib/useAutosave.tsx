"use client";

import { useEffect, useRef, useState } from "react";

// ── Autosave compartido (2026-07-23, pedido del owner) ───────────────────────
// Guarda solo el TRABAJO EN CURSO de los formularios grandes — nunca dispara
// transiciones de estado (Completar y Enviar, veredictos, publicaciones: esos
// siguen siendo explícitos). Dos maneras de detectar cambios:
//   · Formularios CONTROLADOS (estado React): pase el estado como `snapshot` —
//     el hook compara su serialización y agenda el guardado al quedar quieto.
//   · Formularios con REFS (inputs no controlados): pase un contador que se
//     incremente en el onInput del contenedor (useReducer x=>x+1) — el guardado
//     arma el payload desde los refs en el momento de disparar.
// El guardado corre `delayMs` después del ÚLTIMO cambio; si algo cambia durante
// un guardado en vuelo, se re-agenda solo. Un fallo queda en "error" y se
// reintenta con el siguiente cambio — nunca en bucle.

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export function useAutosave({
  enabled,
  snapshot,
  save,
  delayMs = 3500,
}: {
  enabled: boolean;
  snapshot: unknown;
  /** Devuelve false (o lanza) si el guardado falló. */
  save: () => Promise<boolean | void>;
  delayMs?: number;
}): { status: AutosaveStatus } {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const serialized = JSON.stringify(snapshot ?? null);
  // Lo último GUARDADO (o el estado inicial: abrir un formulario no debe
  // disparar un guardado por sí solo).
  const lastSavedRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  // La referencia al save se refresca en un efecto (no durante el render — la
  // regla react-hooks/refs lo prohíbe) para que el disparo use siempre el
  // closure más reciente sin re-agendar el temporizador.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastSavedRef.current === null) {
      lastSavedRef.current = serialized;
      return;
    }
    if (!enabled || serialized === lastSavedRef.current) return;

    // Microtarea para no llamar setState sincrónicamente en el cuerpo del
    // efecto (regla react-hooks/set-state-in-effect — gotcha #3 del repo).
    Promise.resolve().then(() => setStatus((s) => (s === "saving" ? s : "pending")));

    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      if (savingRef.current) return; // el efecto re-agenda al terminar el vuelo
      savingRef.current = true;
      const atFire = serialized;
      setStatus("saving");
      try {
        const ok = await saveRef.current();
        if (ok === false) throw new Error("save returned false");
        lastSavedRef.current = atFire;
        setStatus("saved");
      } catch {
        setStatus("error");
      } finally {
        savingRef.current = false;
      }
    }, delayMs);

    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [serialized, enabled, delayMs]);

  return { status };
}

/** Chip de estado del autosave — póngalo junto al botón de guardar manual. */
export function AutosaveChip({ status }: { status: AutosaveStatus }) {
  if (status === "idle") return null;
  const [text, color] =
    status === "pending"
      ? ["Cambios sin guardar…", "var(--muted)"]
      : status === "saving"
        ? ["Guardando…", "var(--muted)"]
        : status === "saved"
          ? ["Guardado automático ✓", "#166534"]
          : ["No se pudo autoguardar", "#B45309"];
  return (
    <span aria-live="polite" style={{ fontSize: 11.5, fontWeight: 600, color, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}
