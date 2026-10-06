"use client";

import { useEffect } from "react";

// V5.168 · sin contrato firmado, el documento se lee pero no se saca: sin menú contextual, sin copiar ni arrastrar, sin los
// atajos de imprimir y guardar, sin selección de texto; y si alguien imprime desde el menú del navegador, sale el aviso en vez
// del documento. Con contrato firmado no hace nada. (La regla: `src/lib/kaffetal/blindaje.ts`.)
export function Blindaje({ puedeImprimir, aviso }: { puedeImprimir: boolean; aviso: string }) {
  useEffect(() => {
    if (puedeImprimir) return;
    const bloquea = (e: Event) => e.preventDefault();
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "x", "a", "u"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const eventos = ["contextmenu", "copy", "cut", "dragstart", "selectstart"] as const;
    for (const ev of eventos) document.addEventListener(ev, bloquea);
    document.addEventListener("keydown", tecla);
    return () => {
      for (const ev of eventos) document.removeEventListener(ev, bloquea);
      document.removeEventListener("keydown", tecla);
    };
  }, [puedeImprimir]);
  if (puedeImprimir) return null;
  const seguro = aviso.replace(/["\\\n]/g, " ");
  return (
    <style>{`
      body { -webkit-user-select: none; user-select: none; }
      img { -webkit-user-drag: none; }
      @media print {
        body * { display: none !important; }
        body::before { content: "${seguro}"; display: block; padding: 60mm 20mm; font: 14pt system-ui, sans-serif; color: #17121F; text-align: center; }
      }
    `}</style>
  );
}
