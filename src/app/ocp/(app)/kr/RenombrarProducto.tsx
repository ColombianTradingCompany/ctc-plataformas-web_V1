"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renombrarProducto } from "../actions";
import styles from "@/components/panel/shared.module.css";

// V5.150 (owner, 2026-10-05): el nombre del Producto de la FT se cambia desde el OCP, en línea. La acción escribe
// `lots.name` + `datasheet.product_name`, deja rastro en `audit_log` y avisa al productor en su feed.
export function RenombrarProducto({ lotId, nombre }: { lotId: string; nombre: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState(nombre);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  function guardar() {
    setError(null);
    startTransition(async () => {
      const res = await renombrarProducto(lotId, valor);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setHecho(res.nombre);
      setAbierto(false);
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <p className={styles.meta} style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        Producto: <b style={{ color: "var(--ink)" }}>{hecho ?? nombre}</b>
        <button type="button" className="btn btn-sm" onClick={() => { setValor(hecho ?? nombre); setAbierto(true); }}>
          ✎ Cambiar el nombre
        </button>
        {hecho && <span style={{ color: "#2E7D52", fontSize: 12 }}>Renombrado; el productor fue avisado.</span>}
      </p>
    );
  }
  return (
    <div style={{ margin: "0 0 10px", display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, color: "var(--muted)" }}>
        Nombre del producto (FT)
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          maxLength={120}
          autoFocus
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === "Enter") guardar();
            if (e.key === "Escape") setAbierto(false);
          }}
          style={{ display: "block", width: "100%", maxWidth: 560, marginTop: 4 }}
        />
      </label>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-sm btn-solid" onClick={guardar} disabled={pending || valor.trim().length < 3}>
          {pending ? "Guardando…" : "Guardar nombre"}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setAbierto(false)} disabled={pending}>
          Cancelar
        </button>
        <span className={styles.meta} style={{ margin: 0 }}>Cambia el nombre del lote y el «Producto» de su Ficha; queda en el rastro y el productor recibe el aviso.</span>
      </div>
      {error && <p style={{ color: "var(--red)", fontSize: 12.5, margin: 0 }}>{error}</p>}
    </div>
  );
}
