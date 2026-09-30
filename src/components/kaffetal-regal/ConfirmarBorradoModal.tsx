"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

// ── V5.102 (owner, 2026-09-30): borrar un lote o una finca desde SU pantalla de edición, con un pop-up en el que el
// productor ESCRIBE «Borrar Lote» o «Borrar Finca». Un `window.confirm` se acepta sin leer; escribir la frase, no.
// La REGLA de qué se puede borrar no vive aquí: la deciden `isLotCommitted` / `fincaSelfDeletable` (`data.ts`), espejo
// de las políticas RLS `lots_delete_own_before_mue` y `fincas_delete_own_not_committed`. Este pop-up solo confirma, y el
// borrado real lo corre `ejecutarBorrado` en `KaffetalExperience` (con `.select("id")`: un DELETE que la RLS filtra no
// es error para PostgREST, son cero filas).

export type BorradoPendiente = {
  tipo: "lote" | "finca";
  id: string;
  nombre: string;
  /** Lo que se lleva por delante (la finca: sus lotes pendientes), dicho antes de escribir la frase. */
  detalle?: string;
};

export const FRASE_DE_BORRADO: Record<BorradoPendiente["tipo"], string> = { lote: "Borrar Lote", finca: "Borrar Finca" };

export function ConfirmarBorradoModal({
  pendiente,
  onClose,
  onConfirm,
}: {
  pendiente: BorradoPendiente | null;
  onClose: () => void;
  /** Devuelve `true` si borró (el pop-up se cierra desde fuera); `false` deja el pop-up abierto con el campo vacío. */
  onConfirm: () => Promise<boolean>;
}) {
  return (
    <Modal open={!!pendiente} onClose={onClose} ariaLabel="Confirmar borrado">
      {/* Con clave por lo que se borra: cada apertura arranca con el campo vacío (Modal nunca desmonta a sus hijos). */}
      {pendiente && <Cuerpo key={`${pendiente.tipo}:${pendiente.id}`} pendiente={pendiente} onClose={onClose} onConfirm={onConfirm} />}
    </Modal>
  );
}

function Cuerpo({ pendiente, onClose, onConfirm }: { pendiente: BorradoPendiente; onClose: () => void; onConfirm: () => Promise<boolean> }) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const frase = FRASE_DE_BORRADO[pendiente.tipo];
  const coincide = texto.trim() === frase;
  const que = pendiente.tipo === "lote" ? "el lote" : "la finca";

  async function confirmar() {
    if (!coincide || busy) return;
    setBusy(true);
    const ok = await onConfirm();
    setBusy(false);
    if (!ok) setTexto("");
  }

  return (
    <>
      <h3>¿Borrar {que} «{pendiente.nombre}»?</h3>
      <p>
        Esta acción no se puede deshacer.{pendiente.detalle ? ` ${pendiente.detalle}` : ""}
      </p>
      <label htmlFor="confirmar-borrado" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        Para confirmar, escriba <span className="mono">{frase}</span>
      </label>
      <input
        id="confirmar-borrado"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void confirmar();
        }}
        placeholder={frase}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontFamily: "var(--font-spline-mono), monospace", fontSize: 14 }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-sm" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-sm"
          style={{ borderColor: "var(--t-red)", color: coincide ? "#fff" : "var(--t-red)", background: coincide ? "var(--t-red)" : undefined }}
          disabled={!coincide || busy}
          onClick={confirmar}
        >
          {busy ? "Borrando…" : frase}
        </button>
      </div>
    </>
  );
}
