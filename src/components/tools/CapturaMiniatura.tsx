"use client";

import { useState } from "react";

// La miniatura de una herramienta: la MISMA captura del carrusel de la landing
// (convención shots/<id>.jpg), con la misma regla — si no existe, logo sobre
// plato y nunca un hueco roto. Cliente solo por el onError.
export function CapturaMiniatura({ toolId, className }: { toolId: string; className?: string }) {
  const [falta, setFalta] = useState(false);
  if (falta) {
    return (
      <span className={className} data-falta aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeño de respaldo */}
        <img src="/images/shared/herramientas-logo.png" alt="" style={{ width: "38%", opacity: 0.5 }} />
      </span>
    );
  }
  return (
    <span className={className} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- captura estática ya dimensionada */}
      <img src={`/images/herramientas/shots/${toolId}.jpg`} alt="" loading="lazy" onError={() => setFalta(true)} />
    </span>
  );
}
