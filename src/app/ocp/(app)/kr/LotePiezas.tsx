"use client";

// ── Piezas de los lotes que sobrevivieron a la tabla única (V5.61) ────────────
// Este archivo era `lotes/LotesViews.tsx`: las tres vistas (Mapa · Lista · No aptos) de los lotes que ya
// pasaron el intake. La tabla única `/ocp/kr` las absorbió —el mapa y la lista son ahora vistas de UNA
// consulta, con los mismos filtros— y aquí quedan las tres piezas que no eran «vista»:
//   · `SeasonRangeDial`   — el dial de temporadas de dos perillas (desde / hasta), que el mapa conserva;
//   · `RevertNoAptoButton` — reabrir la evaluación de un lote No apto (el veredicto es reversible);
//   · `RegisterDdsButton`  — registrar la referencia de la DDS que CTC presenta ante la UE.
// Las dos últimas viven ahora en la vista completa del lote.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revertNoApto } from "../actions";
import { registerLotDds } from "../actions";
import styles from "@/components/panel/shared.module.css";

// ── El dial de temporadas: botón → popover con DOS perillas (desde/hasta) ────
export function SeasonRangeDial({
  seasons,
  range,
  onChange,
}: {
  /** Ordenadas de la más vieja a la más nueva. */
  seasons: { id: string; label: string }[];
  range: [number, number] | null; // índices inclusive; null = todas
  onChange: (r: [number, number] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const max = seasons.length - 1;
  const [from, to] = range ?? [0, max];
  const label = range ? `${seasons[from]?.label} — ${seasons[to]?.label}` : "Todas las temporadas";

  if (!seasons.length) return null;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        🗓 {label} ▾
      </button>
      {open && (
        <div
          style={{
            position: "absolute", zIndex: 30, top: "calc(100% + 6px)", left: 0, minWidth: 260,
            background: "var(--card)", border: "1.5px solid var(--line)", borderRadius: 12, padding: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,.14)",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", margin: "0 0 8px" }}>
            Rango de temporadas
          </p>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
            Desde: <span style={{ color: "var(--primary)" }}>{seasons[from]?.label}</span>
            <input
              type="range" min={0} max={max} value={from}
              onChange={(e) => {
                const v = Math.min(Number(e.target.value), to);
                onChange([v, to]);
              }}
              style={{ width: "100%", accentColor: "var(--primary)" }}
            />
          </label>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginTop: 6 }}>
            Hasta: <span style={{ color: "var(--primary)" }}>{seasons[to]?.label}</span>
            <input
              type="range" min={0} max={max} value={to}
              onChange={(e) => {
                const v = Math.max(Number(e.target.value), from);
                onChange([from, v]);
              }}
              style={{ width: "100%", accentColor: "var(--primary)" }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn btn-sm" onClick={() => onChange(null)}>Todas</button>
            <button type="button" className="btn btn-sm btn-solid" onClick={() => setOpen(false)}>Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RevertNoAptoButton({ lotId }: { lotId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <button
        className="btn btn-sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await revertNoApto(lotId);
            if (res.ok) router.refresh();
            else setError(res.error);
          });
        }}
      >
        {pending ? "Reabriendo…" : "Reabrir evaluación"}
      </button>
      {error && <span className={styles.warn}> {error}</span>}
    </span>
  );
}

// CTC presenta la DDS en el Information System de la UE y aquí pega su
// artefacto: referencia + código de verificación. El primer registro CONGELA el
// snapshot del Art. 12 (server-side); volver a usarlo solo corrige la
// referencia — el snapshot nunca se recalcula.
export function RegisterDdsButton({ lotId, ddsReference }: { lotId: string; ddsReference: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run() {
    const ref = window.prompt(
      ddsReference
        ? `Corregir la referencia de la DDS (actual: ${ddsReference}). El snapshot congelado NO se recalcula.`
        : "Referencia de la DDS (la genera el Information System de la UE al presentar):",
      ddsReference ?? ""
    );
    if (ref == null || !ref.trim()) return;
    const code = window.prompt("Código de verificación (opcional):", "") ?? "";
    startTransition(async () => {
      const res = await registerLotDds(lotId, ref, code);
      setError(res.ok ? null : res.error);
    });
  }
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 2, marginLeft: 6 }}>
      <button type="button" className="btn btn-sm" disabled={pending} onClick={run}
        title={ddsReference ? "DDS registrada — clic para corregir la referencia (el snapshot no cambia)" : "Registrar la DDS presentada para este lote"}>
        {pending ? "…" : ddsReference ? `DDS ✓ ${ddsReference}` : "Registrar DDS"}
      </button>
      {error && <span style={{ fontSize: 10.5, color: "var(--red)", maxWidth: 260, whiteSpace: "normal", textAlign: "right" }}>{error}</span>}
    </span>
  );
}
