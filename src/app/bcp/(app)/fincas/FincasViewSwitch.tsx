"use client";

// ── Fincas: Tablero ↔ Mapa (2026-07-23, pedido del owner) ────────────────────
// Un conmutador de vista sobre el tablero de Fincas: el kanban de siempre o un
// mapa con un pin por finca (color = estado de revisión). El tablero viene
// server-rendered como children y NUNCA se desmonta (display:none cuando el
// mapa está al frente) — así los modales anclados (#finca-<id>) siguen vivos:
// el enlace de la tarjetita de un pin cambia el hash, esto vuelve al tablero y
// FincaModalRow abre el modal por su listener de hashchange.

import { useEffect, useState, type ReactNode } from "react";
import { GeoMap, type GeoMarker } from "@/components/bcp/GeoMap";
import styles from "../shared.module.css";

export function FincasViewSwitch({ markers, children }: { markers: GeoMarker[]; children: ReactNode }) {
  const [view, setView] = useState<"board" | "map">("board");

  useEffect(() => {
    // Un pin enlazó a #finca-<id>: el modal vive en el tablero — al frente.
    const toBoard = () => {
      if (window.location.hash.startsWith("#finca-")) setView("board");
    };
    window.addEventListener("hashchange", toBoard);
    return () => window.removeEventListener("hashchange", toBoard);
  }, []);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, margin: "0 0 14px" }}>
        {(
          [
            { key: "board", label: "☰ Tablero" },
            { key: "map", label: "🗺 Mapa" },
          ] as const
        ).map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              aria-pressed={active}
              style={{
                padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${active ? "var(--primary)" : "var(--line)"}`,
                background: active ? "var(--primary)" : "transparent",
                color: active ? "#fff" : "var(--muted)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {view === "map" && (
        <div style={{ marginBottom: 18 }}>
          {!markers.length ? (
            <p className={styles.empty}>Ninguna finca tiene coordenadas todavía.</p>
          ) : (
            <GeoMap markers={markers} height={500} />
          )}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
            {(
              [
                ["#166534", "Aprobada"],
                ["#B45309", "En revisión"],
                ["#991B1B", "No aprobada"],
              ] as const
            ).map(([hex, label]) => (
              <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted)" }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: hex }} /> {label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: view === "board" ? "block" : "none" }}>{children}</div>
    </div>
  );
}
