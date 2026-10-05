"use client";

import { useState, type ReactNode } from "react";
import styles from "../../socios.module.css";

// V5.155 (owner, 2026-10-06): «en el Centro de Calidad debe haber dentro de 01 Evaluación de lotes dos pestañas: Baches en
// Fila · Baches completados (una vez todos los lotes del bache son dados de alta y confirmados, llegan allí)». Las dos
// listas las arma el servidor (la página sigue sin leer nombres); esta pieza solo elige cuál se ve.
export function PestanasDeBaches({ enFila, completados, nFila, nCompletados }: { enFila: ReactNode; completados: ReactNode; nFila: number; nCompletados: number }) {
  const [pestana, setPestana] = useState<"fila" | "completados">("fila");
  const tab = (k: "fila" | "completados", rotulo: string, n: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={pestana === k}
      className={`btn btn-sm${pestana === k ? " btn-solid" : ""}`}
      onClick={() => setPestana(k)}
    >
      {rotulo} <span style={{ opacity: 0.8 }}>({n})</span>
    </button>
  );
  return (
    <div>
      <div role="tablist" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 12px" }}>
        {tab("fila", "Baches en Fila", nFila)}
        {tab("completados", "Baches completados", nCompletados)}
      </div>
      <div role="tabpanel" hidden={pestana !== "fila"}>
        {nFila === 0 ? <p className={styles.soon}>Ningún bache en fila ahora mismo.</p> : enFila}
      </div>
      <div role="tabpanel" hidden={pestana !== "completados"}>
        {nCompletados === 0 ? <p className={styles.soon}>Todavía ningún bache completado.</p> : completados}
      </div>
    </div>
  );
}
