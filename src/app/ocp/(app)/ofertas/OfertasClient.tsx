"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decidirNoOfertar, emitOffer, reabrirDecision, retireOffer, type OfferKind } from "../ofertasActions";
import { formatCop } from "@/lib/arena/inscriptions";
import styles from "@/components/panel/shared.module.css";

// Controles cliente de /ocp/ofertas: emitir (temporada · directa · excepción · subasta), retirar y decidir no ofertar.
// Las ofertas Black NO se emiten aquí — nacen del desenlace «comprar» de su
// negociación (CTC Selection); esta pantalla solo las muestra.
// V5.82: el precio de temporada y directa VIENE del PVC (`anclaje`) y se enseña, no se teclea; solo la excepción lo
// teclea, con motivo. La subasta registra el mejor postor, como antes.

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

/** Lo que la página calculó del PVC vigente para el grado del lote (null = sin edición vigente). */
export type AnclajeDeOferta = {
  code: string;
  banda: string;
  mult: number;
  copKg: number;
  copCarga: number;
  copKgDirecta: number;
  minKg: number | null;
  compraInicialKg: number;
};

export function EmitOfferForm({
  lotId,
  kind,
  lotName,
  anclaje,
}: {
  lotId: string;
  kind: "temporada" | "subasta";
  lotName: string;
  anclaje: AnclajeDeOferta | null;
}) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [clase, setClase] = useState<OfferKind>(kind);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [maxKg, setMaxKg] = useState("");
  const [notes, setNotes] = useState("");
  const anclada = clase === "temporada" || clase === "directa";

  function emit() {
    run(async () => {
      const fd = new FormData();
      if (!anclada) fd.set("price_per_kg", price);
      if (quantity.trim()) fd.set("quantity_kg", quantity);
      if (maxKg.trim()) fd.set("max_kg", maxKg);
      if (notes.trim()) fd.set("notes", notes);
      const res = await emitOffer(lotId, clase, fd);
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
  const listo = anclada ? Boolean(anclaje) : price.trim() !== "" && (clase !== "excepcion" || notes.trim() !== "");
  return (
    <div style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "10px 12px", marginTop: 6, display: "grid", gap: 6 }}>
      {kind === "subasta" ? (
        <p className={styles.meta} style={{ margin: 0 }}>
          El mejor postor de la subasta de <b>{lotName}</b>: el productor verá este valor y decide.
        </p>
      ) : (
        <>
          <p className={styles.meta} style={{ margin: 0 }}>
            La oferta por <b>{lotName}</b> viaja con sus snapshots (Grado · Puntaje · Variedad · Proceso) y con su anclaje al PVC congelados.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {(["temporada", "directa", "excepcion"] as const).map((k) => (
              <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
                <input type="radio" name={`clase-${lotId}`} checked={clase === k} onChange={() => setClase(k)} />
                {k === "temporada" ? "Lote de Temporada (PVC)" : k === "directa" ? "Directa · CTCx Selection (PVC − 8 %, 30 días)" : "Excepción (precio a mano, con motivo)"}
              </label>
            ))}
          </div>
          {anclada &&
            (anclaje ? (
              <p className={styles.meta} style={{ margin: 0 }}>
                PVC {anclaje.code} · banda {anclaje.banda} ×{anclaje.mult} → <b>{formatCop(clase === "directa" ? anclaje.copKgDirecta : anclaje.copKg)}/kg</b> de CPS
                {clase === "temporada" && <> ({formatCop(anclaje.copCarga)}/carga · mínimo {anclaje.minKg ?? "—"} kg · CTC compra {anclaje.compraInicialKg} kg de inmediato)</>}
                . Si el lote es de la temporada pasada, se aplica −10 % al emitir.
              </p>
            ) : (
              <p className={styles.warn} style={{ margin: 0 }}>
                No hay una edición del PVC vigente hoy: publíquela en ECP · Modelo Económico, o emita una excepción con motivo.
              </p>
            ))}
        </>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {!anclada && <input placeholder="Precio COP/kg *" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} style={{ maxWidth: 140 }} />}
        {clase === "directa" ? (
          <input placeholder="Máximo kg (opcional)" inputMode="numeric" value={maxKg} onChange={(e) => setMaxKg(e.target.value)} style={{ maxWidth: 160 }} />
        ) : (
          clase !== "temporada" && <input placeholder="Cantidad kg (opcional)" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ maxWidth: 160 }} />
        )}
      </div>
      <textarea rows={2} placeholder={clase === "excepcion" ? "Motivo de la excepción (obligatorio; el productor lo ve)" : "Notas para el productor (opcional)"} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button className="btn btn-sm" onClick={() => setOpen(false)}>Cancelar</button>
        <button className="btn btn-sm btn-solid" disabled={pending || !listo} onClick={emit}>
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

/** Paso 13: «no tiene sentido comercial» — con motivo; el lote sale de la cola a «Sin oferta». */
export function NoOfertarForm({ lotId }: { lotId: string }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  if (!open) {
    return (
      <button className="btn btn-sm" onClick={() => setOpen(true)} style={{ marginLeft: 6 }}>
        No ofertar…
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
      <input placeholder="Motivo (el productor recibe una nota)" value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ maxWidth: 260 }} />
      <button
        className="btn btn-sm"
        disabled={pending || !motivo.trim()}
        onClick={() => {
          const fd = new FormData();
          fd.set("motivo", motivo);
          run(() => decidirNoOfertar(lotId, fd));
        }}
      >
        {pending ? "Guardando…" : "Confirmar: sin oferta"}
      </button>
      <button className="btn btn-sm" onClick={() => setOpen(false)}>Cancelar</button>
      <ErrorLine error={error} />
    </div>
  );
}

export function ReabrirDecisionButton({ lotId }: { lotId: string }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button className="btn btn-sm" disabled={pending} onClick={() => run(() => reabrirDecision(lotId))}>
        Volver a considerar
      </button>
      <ErrorLine error={error} />
    </span>
  );
}
