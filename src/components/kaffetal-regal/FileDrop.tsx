"use client";

// ── Soltar un archivo TAMBIÉN vale (V5.20, hallazgo del owner) ──────────────
// Un <input type="file"> pelado no maneja dragover, así que arrastrar una foto
// encima pintaba el cursor de PROHIBIDO (el no-drop del navegador) — parecía
// que reemplazar la imagen estuviera vetado. Esta envoltura convierte la fila
// del input en un destino de arrastre real: dragover con preventDefault (eso
// solo ya cambia el cursor a flecha/copiar) y drop que entrega el archivo al
// MISMO manejador del input. Envuelve; no re-estiliza.
export function FileDrop({
  onFile,
  children,
  style,
}: {
  onFile: (file: File) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", ...style }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      {children}
    </div>
  );
}
