"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emitOffer, retireOffer, type OfferKind } from "../ofertasActions";
import styles from "@/components/panel/shared.module.css";

// Controles cliente de /ocp/ofertas: emitir (temporada · subasta) y retirar.
// Las ofertas Black NO se emiten aquí — nacen del desenlace «comprar» de su
// negociación (CTC Selection); esta pantalla solo las muestra.

type ActionResult = { ok: true } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };
  return { pending, error, run };
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className={styles.warn} style={{ marginTop: 6 }}>
      {error}
    </p>
  );
}

export function EmitOfferForm({ lotId, kind, lotName }: { lotId: string; kind: OfferKind; lotName: string }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  function emit() {
    run(async () => {
      const fd = new FormData();
      fd.set("price_per_kg", price);
      if (quantity.trim()) fd.set("quantity_kg", quantity);
      if (notes.trim()) fd.set("notes", notes);
      const res = await emitOffer(lotId, kind, fd);
      if (res.ok) setOpen(false);
      return res;
    });
  }

  if (!open) {
    return (
      <button className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>
        {kind === "subasta" ? "Registrar mejor postor…" : "Emitir oferta…"}
      </button>
    );
  }
  return (
    <div style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "10px 12px", marginTop: 6, display: "grid", gap: 6 }}>
      <p className={styles.meta} style={{ margin: 0 }}>
        {kind === "subasta"
          ? <>El mejor postor de la subasta de <b>{lotName}</b>: el productor verá este valor y decide.</>
          : <>La oferta por <b>{lotName}</b> viaja con sus snapshots (Grado · Puntaje · Variedad · Proceso) congelados.</>}
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input placeholder="Precio COP/kg *" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} style={{ maxWidth: 140 }} />
        <input placeholder="Cantidad kg (opcional)" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ maxWidth: 160 }} />
      </div>
      <textarea rows={2} placeholder="Notas para el productor (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button className="btn btn-sm" onClick={() => setOpen(false)}>Cancelar</button>
        <button className="btn btn-sm btn-solid" disabled={pending || !price.trim()} onClick={emit}>
          {pending ? "Emitiendo…" : kind === "subasta" ? "Registrar y ofertar" : "Emitir oferta"}
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function RetireOfferButton({ offerId }: { offerId: string }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button
        className="btn btn-sm"
        disabled={pending}
        onClick={() => {
          if (window.confirm("¿Retirar esta oferta? El productor dejará de verla.")) run(() => retireOffer(offerId));
        }}
      >
        Retirar
      </button>
      <ErrorLine error={error} />
    </span>
  );
}
