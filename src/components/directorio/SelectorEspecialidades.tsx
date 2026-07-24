"use client";

import { useState } from "react";
import { ESPECIALIDADES, ESP_INFO } from "./data";

// Rejilla de oficios con una «i» por opción que despliega qué incluye. La
// explicación es la razón de ser del componente: un caficultor que nunca ha
// oído "beneficio y fermentación" en esos términos no se marca solo.
export function SelectorEspecialidades({
  valor,
  onChange,
}: {
  valor: string[];
  onChange: (v: string[]) => void;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <div className="opciones">
      {ESPECIALIDADES.map((e) => (
        <div className="opcion" key={e}>
          <div className="opcion__fila">
            <label className="opcion__marca">
              <input
                type="checkbox"
                value={e}
                checked={valor.includes(e)}
                onChange={(ev) =>
                  onChange(ev.target.checked ? [...valor, e] : valor.filter((v) => v !== e))
                }
              />
              <span className="opcion__nombre">{e}</span>
            </label>
            <button
              type="button"
              className="info-btn"
              aria-expanded={abierta === e}
              aria-label={`Qué incluye ${e}`}
              onClick={() => setAbierta(abierta === e ? null : e)}
            >
              i
            </button>
          </div>
          <p className={`opcion__info${abierta === e ? " ver" : ""}`}>{ESP_INFO[e]}</p>
        </div>
      ))}
    </div>
  );
}
