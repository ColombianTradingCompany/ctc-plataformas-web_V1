"use client";

import { useState } from "react";
import { DEP_MUNI } from "@/components/kaffetal-regal/ficha/fichaData";
import styles from "@/components/panel/shared.module.css";

// ── V5.111 (owner, 2026-09-30): el departamento del Proveedor Desacoplado se elige de un selector, con «Otro…» que abre un
// campo libre. La lista es la MISMA que usa el productor en su Información general (`DEP_MUNI`, sin «Multi-Origin»), así el
// OCP y Kaffetal Regal escriben el departamento con la misma ortografía y los filtros de `/ocp/kr` lo agrupan bien.
// El formulario manda `department` (el selector) y `department_otro` (el texto); `crearProveedorDesacoplado` resuelve.

export const OTRO = "__otro__";
const DEPARTAMENTOS = Object.keys(DEP_MUNI)
  .filter((d) => d !== "Multi-Origin")
  .sort((a, b) => a.localeCompare(b, "es-CO"));

export function SelectorDepartamento() {
  const [valor, setValor] = useState("");
  return (
    <>
      <div className={styles.field}>
        <label htmlFor="department">Departamento (opcional)</label>
        <select id="department" name="department" value={valor} onChange={(e) => setValor(e.target.value)}>
          <option value="">Sin departamento</option>
          {DEPARTAMENTOS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value={OTRO}>Otro…</option>
        </select>
      </div>
      {valor === OTRO && (
        <div className={styles.field}>
          <label htmlFor="department_otro">¿Cuál?</label>
          <input id="department_otro" name="department_otro" placeholder="Escriba el departamento" autoFocus />
        </div>
      )}
    </>
  );
}
