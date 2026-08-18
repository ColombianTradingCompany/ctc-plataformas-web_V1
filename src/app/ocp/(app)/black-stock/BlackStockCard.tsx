"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideBlackNegotiation } from "../contractActions";
import { setBlackNegotiationStage, setBlackNegotiationTarget } from "../blackStockActions";
import styles from "@/components/panel/shared.module.css";

// La tarjeta del pipeline Black Stock: seguimiento (etapa + volumen objetivo +
// notas) y la decisión final (comprar → contrato pending_signature / liberar).
// Evolución del BlackNegotiationCard que vivía suelto en /ocp/contratos.

const STAGES: { key: string; label: string }[] = [
  { key: "nueva", label: "Nueva" },
  { key: "en_conversacion", label: "En conversación" },
  { key: "acuerdo_cerca", label: "Acuerdo cerca" },
];

export function BlackStockCard({
  id,
  stage,
  targetKg,
  notes,
  lotName,
  fincaName,
  producerName,
}: {
  id: string;
  stage: string;
  targetKg: number | null;
  notes: string | null;
  lotName: string;
  fincaName: string;
  producerName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"seguimiento" | "comprar" | "liberado" | null>(null);
  const [price, setPrice] = useState("");
  const [decideNotes, setDecideNotes] = useState("");
  const [kg, setKg] = useState(targetKg ? String(targetKg) : "");
  const [followNotes, setFollowNotes] = useState(notes ?? "");

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setMode(null);
        router.refresh();
      } else setError(res.error);
    });
  }

  function decide(outcome: "comprar" | "liberado") {
    const fd = new FormData();
    if (price) fd.set("agreed_price_per_kg", price);
    if (decideNotes) fd.set("notes", decideNotes);
    run(() => decideBlackNegotiation(id, outcome, fd));
  }

  function saveFollowup() {
    const fd = new FormData();
    fd.set("target_kg", kg);
    fd.set("notes", followNotes);
    run(() => setBlackNegotiationTarget(id, fd));
  }

  return (
    <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h3>{lotName}</h3>
          <p className={styles.meta}>
            {producerName} · {fincaName}
          </p>
        </div>
        <span className={styles.badge}>Black</span>
      </div>
      <p className={styles.meta} style={{ margin: "6px 0 0" }}>
        {targetKg ? <b style={{ color: "var(--ink)" }}>{targetKg} kg</b> : "Sin volumen objetivo"}
        {notes && <> · {notes}</>}
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {STAGES.map((s) => (
          <button
            key={s.key}
            className={`btn btn-sm ${s.key === stage ? "btn-solid" : ""}`}
            disabled={pending || s.key === stage}
            onClick={() => run(() => setBlackNegotiationStage(id, s.key))}
          >
            {s.label}
          </button>
        ))}
      </div>

      {mode === null && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button className="btn btn-sm" disabled={pending} onClick={() => setMode("seguimiento")}>
            Seguimiento…
          </button>
          <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => setMode("comprar")}>
            Negociar compra…
          </button>
          <button className="btn btn-sm" disabled={pending} onClick={() => setMode("liberado")}>
            Liberar…
          </button>
        </div>
      )}
      {mode === "seguimiento" && (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <input placeholder="Volumen objetivo (kg)" value={kg} onChange={(e) => setKg(e.target.value)} type="number" step="1" />
          <textarea placeholder="Notas de seguimiento" rows={2} value={followNotes} onChange={(e) => setFollowNotes(e.target.value)} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-sm btn-solid" disabled={pending} onClick={saveFollowup}>
              {pending ? "Guardando…" : "Guardar seguimiento"}
            </button>
            <button className="btn btn-sm" onClick={() => setMode(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {mode === "comprar" && (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <input placeholder="Precio acordado ($/kg)" value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" />
          <textarea placeholder="Notas de la negociación" rows={2} value={decideNotes} onChange={(e) => setDecideNotes(e.target.value)} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => decide("comprar")}>
              {pending ? "Guardando…" : "Crear contrato Black (por firmar)"}
            </button>
            <button className="btn btn-sm" onClick={() => setMode(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {mode === "liberado" && (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <textarea placeholder="Motivo de liberar el lote" rows={2} value={decideNotes} onChange={(e) => setDecideNotes(e.target.value)} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-sm" disabled={pending} onClick={() => decide("liberado")}>
              {pending ? "Guardando…" : "Liberar lote (no se compra)"}
            </button>
            <button className="btn btn-sm" onClick={() => setMode(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className={styles.warn} style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
