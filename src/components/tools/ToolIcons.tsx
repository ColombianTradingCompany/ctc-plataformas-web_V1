import type { ToolId } from "@/lib/tools/catalog";

// Iconos de línea para las herramientas. Mismo lenguaje visual que los iconos
// del hub del productor (LineIcon en AppDashboard): trazo de 1.6, currentColor,
// viewBox de 24, sin relleno. Así el icono se ve nativo en las tres superficies
// —cada una le da su propio color— y no aparece un segundo estilo gráfico.

function LineIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const TOOL_ICON: Record<ToolId, React.ReactNode> = {
  // Merma rápida: un embudo — entra mucho, sale poco — con el rayo de "rápida".
  "mermas-rapida": (
    <LineIcon>
      <path d="M4 4h16l-6 7v7l-4 2v-9L4 4Z" />
      <path d="M19.5 14.5 17 18h3l-2.5 3.5" />
    </LineIcon>
  ),
  // Merma detallada: el mismo peso perdiéndose etapa por etapa — barras que
  // decrecen sobre una línea base, que es justo lo que la herramienta audita.
  "mermas-detallada": (
    <LineIcon>
      <path d="M4 20h16" />
      <path d="M6.5 20V8.5M11 20v-6M15.5 20v-4M20 20v-2.5" />
      <path d="M4.5 5.5 20 5.5" strokeDasharray="2 2.4" />
    </LineIcon>
  ),
  // Agtron: un disco con aguja y marcas — el color de tueste leído en un dial.
  agtron: (
    <LineIcon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 12 15.4 8.6" />
      <path d="M12 4v1.6M20 12h-1.6M12 20v-1.6M4 12h1.6" />
      <circle cx="12" cy="12" r="1.05" fill="currentColor" stroke="none" />
    </LineIcon>
  ),
  // QR: las tres marcas de posicionamiento que hacen reconocible un QR.
  qr: (
    <LineIcon>
      <rect x="4" y="4" width="6" height="6" rx="1.4" />
      <rect x="14" y="4" width="6" height="6" rx="1.4" />
      <rect x="4" y="14" width="6" height="6" rx="1.4" />
      <path d="M14 14h2.5v2.5H14zM19 14h1M19 18.5h1M14.5 20h2M18 20v.01" />
    </LineIcon>
  ),
  // Mermas CTC: el mismo embudo de rendimiento, pero con la hoja de PDF que exporta.
  "mermas-ctc": (
    <LineIcon>
      <path d="M3 4h11l-4.5 5.5V15l-3 1.5V9.5L3 4Z" />
      <path d="M16 12.5h5v7.5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-7.5Z" />
      <path d="M17.5 15.5h2M17.5 18h2" />
    </LineIcon>
  ),
  // Catación: la rueda del sabor — un círculo con radios que la parten en sectores.
  catacion: (
    <LineIcon>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5V9M12 15v5.5M3.5 12H9M15 12h5.5M6 6l3 3M18 6l-3 3M6 18l3-3M18 18l-3-3" />
    </LineIcon>
  ),
  // Datasheet: una hoja técnica — documento con líneas de campos y una firma/dato.
  "green-datasheet": (
    <LineIcon>
      <path d="M6 3h8l4 4v14a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V3Z" />
      <path d="M14 3v4h4" />
      <path d="M8.5 11h7M8.5 14h7M8.5 17h4" />
    </LineIcon>
  ),
  // Fórmula de calidad: un matraz de laboratorio — la "fórmula" que define la calidad.
  "formula-calidad": (
    <LineIcon>
      <path d="M9.5 3h5M10.5 3v5.5L5.7 17a2 2 0 0 0 1.75 3h9.1a2 2 0 0 0 1.75-3L13.5 8.5V3" />
      <path d="M8 15h8" />
    </LineIcon>
  ),
};
