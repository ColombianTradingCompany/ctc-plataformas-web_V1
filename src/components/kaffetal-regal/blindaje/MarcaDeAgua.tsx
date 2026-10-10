// V5.168 · la marca de agua de los documentos del productor (`src/lib/kaffetal/blindaje.ts`). Va ENCIMA del contenido, con
// poca opacidad y sin capturar el puntero: se lee el documento y la marca sale en pantalla, en el PDF y en una captura.
// El contenedor padre debe tener `position: relative`.
// V5.202 (owner, 2026-10-10): también la lleva el Dossier PÚBLICO, una por sección, con la marca pública (`textoDeMarcaPublica`:
// no nombra al productor ni a la finca) y un poco menos de opacidad (0,06), porque allí se lee de corrido en pantalla. Desde la
// revisión del nodo final, en público va como MOSAICO SVG (`MarcaDeAguaMosaico`, abajo); estas líneas siguen en las hojas A4 del
// productor, que tienen un alto fijo.
export function MarcaDeAgua({ texto, opacidad = 0.075 }: { texto: string; opacidad?: number }) {
  const linea = `${texto}     ·     `.repeat(6);
  return (
    <div
      aria-hidden
      data-marca-de-agua
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", userSelect: "none" }}
    >
      <div
        style={{
          position: "absolute",
          left: "-60%",
          top: "-40%",
          width: "220%",
          height: "180%",
          transform: "rotate(-28deg)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around",
          opacity: opacidad,
          color: "#3D0A8A",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 14,
          whiteSpace: "nowrap",
        }}
      >
        {Array.from({ length: 22 }).map((_, i) => (
          <div key={i} style={{ paddingLeft: i % 2 ? 0 : 140 }}>
            {linea}
          </div>
        ))}
      </div>
    </div>
  );
}

/** V5.202 (nodo final, 2026-10-10): la marca del Dossier PÚBLICO, como MOSAICO SVG. Un `<pattern>` girado lleva el texto (con su
 *  copia escalonada) y un `<rect>` al 100 % lo repite: cubre cualquier alto —las secciones continuas miden lo que mida su contenido,
 *  y en móvil las 22 líneas giradas de `MarcaDeAgua` no llegaban a la esquina de abajo de una sección alta— y pesa poco: tres copias
 *  del texto por sección, no 132 (la página es indexable). El texto es `textoDeMarcaPublica` (no nombra a nadie). `id` distingue
 *  el patrón de cada sección: dos `id` iguales en un documento harían que todas pintaran el primero. */
export function MarcaDeAguaMosaico({ texto, id, opacidad = 0.06 }: { texto: string; id: string; opacidad?: number }) {
  // La baldosa: más ancha que el texto (≈105 caracteres a 14 px), con dos filas; la segunda va corrida media baldosa.
  const ANCHO = 1100;
  const ALTO = 150;
  const letra = { fill: "#3D0A8A", fillOpacity: opacidad, fontFamily: "system-ui, sans-serif", fontWeight: 700, fontSize: 14 } as const;
  return (
    <div aria-hidden data-marca-de-agua style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5, userSelect: "none" }}>
      <svg width="100%" height="100%" focusable="false" aria-hidden style={{ display: "block" }}>
        <defs>
          <pattern id={id} width={ANCHO} height={ALTO} patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
            <text x={20} y={50} {...letra}>
              {texto}
            </text>
            <text x={20 + ANCHO / 2} y={125} {...letra}>
              {texto}
            </text>
            <text x={20 - ANCHO / 2} y={125} {...letra}>
              {texto}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}
