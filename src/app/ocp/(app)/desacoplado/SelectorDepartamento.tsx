"use client";

import { useState } from "react";
import { DEPARTAMENTOS_DE_COLOMBIA } from "@/lib/geo/departamentos";
import styles from "@/components/panel/shared.module.css";

// ── V5.111 (owner, 2026-09-30): el departamento del Proveedor Desacoplado se elige de un selector, con «Otro…» que abre un
// campo libre. La lista es la MISMA que usa el productor en su Información general (`DEPARTAMENTOS_DE_COLOMBIA`; desde la V5.127, los 32 departamentos y Bogotá D.C.), así el
// OCP y Kaffetal Regal escriben el departamento con la misma ortografía y los filtros de `/ocp/kr` lo agrupan bien.
// El formulario manda `department` (el selector) y `department_otro` (el texto); `crearProveedorDesacoplado` resuelve.

export const OTRO = "__otro__";
const DEPARTAMENTOS = DEPARTAMENTOS_DE_COLOMBIA;

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
