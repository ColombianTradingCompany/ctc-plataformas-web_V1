"use client";

import { useState } from "react";
import s from "./os.module.css";

// ── CTCx OS · «Copiar contexto para Tailor» (V6.19, F2) ──────────────────────
// El botón dice lo que hace (PLAN §7.4, crítica 27): COPIA un resumen (solo conteos, estados y
// la hora de lectura: `contextoParaTailor`) para pegarlo en Tailor. No abre ni habla con nadie.
// El aviso sale DESPUÉS de que el portapapeles confirma; si falla (permiso negado, navegador sin
// portapapeles), lo dice y deja el texto a la vista para copiarlo a mano.

type Estado = "quieto" | "copiado" | "fallo";

export function CopiarContexto({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<Estado>("quieto");
  const copiar = () => {
    const portapapeles = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!portapapeles) {
      setEstado("fallo");
      return;
    }
    portapapeles.writeText(texto).then(
      () => setEstado("copiado"),
      () => setEstado("fallo")
    );
  };
  return (
    <div className={s.copiar}>
      <button type="button" className="btn btn-sm" onClick={copiar}>
        Copiar contexto para Tailor
      </button>
      <div role="status" aria-live="polite" className={s.copiarAviso}>
        {estado === "copiado" && "Contexto copiado al portapapeles: péguelo en su conversación con Tailor."}
        {estado === "fallo" && "No se pudo copiar. Seleccione el texto de abajo y cópielo a mano."}
      </div>
      {estado === "fallo" && <textarea className={s.copiarTexto} readOnly value={texto} rows={6} aria-label="Contexto para Tailor" />}
    </div>
  );
}
