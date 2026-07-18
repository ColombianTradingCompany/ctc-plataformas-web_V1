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
};
