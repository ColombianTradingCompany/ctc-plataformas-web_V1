"use client";

import { Printer } from "lucide-react";

/** V5.166: imprimir o guardar el dossier en PDF (el navegador respeta las hojas A4 de la hoja de estilos). */
export function BotonImprimir({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()}>
      <Printer size={16} strokeWidth={2} aria-hidden />
      {label}
    </button>
  );
}
