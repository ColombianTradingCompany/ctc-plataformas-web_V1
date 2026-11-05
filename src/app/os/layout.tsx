import type { Metadata } from "next";
// Shared internal-panel Tailwind entry (see login/layout.tsx for the note).
import "@/app/bcp/tailwind.css";

export const metadata: Metadata = {
  title: "CTCx OS",
  robots: { index: false, follow: false },
};

// Layout RAÍZ de la CTCx OS, la quinta consola (V6.19, fase F2). Mismo contrato que el de la LCP
// (`src/app/lcp/layout.tsx`, que faltó al nacer y solo lo vio una captura): pone `data-theme="bcp"` —sin él
// la consola hereda los tokens de otro tema—, el Tailwind del panel y el `noindex`. `qa-rutas-consolas` (h)
// exige uno por cada consola de `CONSOLE_ORDER`. Las fichas del juego (sus tokens propios) no van aquí: van
// en una envoltura interior, para que el tema de la casa siga mandando en el rail y en la cabecera.
export default function OsLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="bcp">{children}</div>;
}
