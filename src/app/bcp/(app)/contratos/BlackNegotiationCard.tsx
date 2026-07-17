"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideBlackNegotiation } from "../contractActions";
import styles from "../shared.module.css";

// Un lote Black se negocia aparte: comprar (crea contrato pending_signature) o
// liberar. Patrón resultado-inline (V12), nunca lanza.
export function BlackNegotiationCard({
  id,
  lotName,
  fincaName,
  producerName,
}: {
  id: string;
  lotName: string;
  fincaName: string;
  producerName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"comprar" | "liberado" | null>(null);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  function decide(outcome: "comprar" | "liberado") {
    setError(null);
    const fd = new FormData();
    if (price) fd.set("agreed_price_per_kg", price);
    if (notes) fd.set("notes", notes);
    start(async () => {
      const res = await decideBlackNegotiation(id, outcome, fd);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h3>{lotName}</h3>
          <p className={styles.meta}>{producerName} · {fincaName}</p>
        </div>
        <span className={styles.badge}>Black</span>
      </div>
      {mode === null ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => setMode("comprar")}>
            Negociar compra…
          </button>
          <button className="btn btn-sm" disabled={pending} onClick={() => setMode("liberado")}>
            Liberar…
          </button>
        </div>
      ) : mode === "comprar" ? (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <input placeholder="Precio acordado ($/kg)" value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" />
          <textarea placeholder="Notas de la negociación" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => decide("comprar")}>
              {pending ? "Guardando…" : "Crear contrato Black (por firmar)"}
            </button>
            <button className="btn btn-sm" onClick={() => setMode(null)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <textarea placeholder="Motivo de liberar el lote" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-sm" disabled={pending} onClick={() => decide("liberado")}>
              {pending ? "Guardando…" : "Liberar lote (no se compra)"}
            </button>
            <button className="btn btn-sm" onClick={() => setMode(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {error && <p className={styles.warn} style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
