"use client";

import { useState } from "react";
import { BANCO_CERT, TODAS_CERT, sinTildes } from "./data";

// Banco de certificaciones: buscador + grupos + una casilla "escríbela tú".
// Lo que el usuario añade a mano se muestra en un grupo aparte ("Añadidas por
// ti") para que no parezca que el banco ya la traía.
export function BancoCertificaciones({
  valor,
  onChange,
}: {
  valor: string[];
  onChange: (v: string[]) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [otra, setOtra] = useState("");

  const q = sinTildes(busqueda.trim());
  const propias = valor.filter((c) => !TODAS_CERT.includes(c));
  const grupos = propias.length
    ? [...BANCO_CERT, { g: "Añadidas por ti", items: propias }]
    : BANCO_CERT;
  const visibles = grupos
    .map((gr) => ({ g: gr.g, items: gr.items.filter((i) => !q || sinTildes(i).includes(q)) }))
    .filter((gr) => gr.items.length > 0);

  const alternar = (c: string, marcado: boolean) =>
    onChange(marcado ? (valor.includes(c) ? valor : [...valor, c]) : valor.filter((v) => v !== c));

  const anadirOtra = () => {
    const v = otra.trim();
    if (!v) return;
    if (!valor.includes(v)) onChange([...valor, v]);
    setOtra("");
    setBusqueda("");
  };

  return (
    <div>
      <div className="seleccionadas">
        {valor.length ? (
          valor.map((c) => (
            <span className="tag tag--cert" key={c}>
              {c}
              <button
                type="button"
                className="quitar"
                aria-label={`Quitar ${c}`}
                onClick={() => onChange(valor.filter((v) => v !== c))}
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="sin-sel">
            Ninguna seleccionada todavía. Si aprendiste en la práctica, marca «Autodidacta».
          </span>
        )}
      </div>

      <div className="banco">
        <input
          className="banco__buscar"
          type="search"
          aria-label="Buscar certificación"
          placeholder="Buscar… ej. SCA, Q Grader, BPA, HACCP"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="banco__lista">
          {visibles.length ? (
            visibles.map((gr) => (
              <div key={gr.g}>
                <p className="banco__grupo">{gr.g}</p>
                {gr.items.map((i) => (
                  <label className="banco__op" key={i}>
                    <input
                      type="checkbox"
                      value={i}
                      checked={valor.includes(i)}
                      onChange={(e) => alternar(i, e.target.checked)}
                    />
                    <span>{i}</span>
                  </label>
                ))}
              </div>
            ))
          ) : (
            <p className="banco__nada">
              Ninguna coincide con esa búsqueda. Escríbela abajo y añádela como «otra».
            </p>
          )}
        </div>
        <div className="banco__pie">
          <input
            aria-label="Otra certificación"
            placeholder="¿No está en la lista? Escríbela aquí"
            value={otra}
            onChange={(e) => setOtra(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                anadirOtra();
              }
            }}
          />
          <button type="button" className="btn btn--sm btn--fantasma" onClick={anadirOtra}>
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
