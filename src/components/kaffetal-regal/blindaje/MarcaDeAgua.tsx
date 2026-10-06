// V5.168 · la marca de agua de los documentos del productor (`src/lib/kaffetal/blindaje.ts`). Va ENCIMA del contenido, con
// poca opacidad y sin capturar el puntero: se lee el documento y la marca sale en pantalla, en el PDF y en una captura.
// El contenedor padre debe tener `position: relative`.
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
