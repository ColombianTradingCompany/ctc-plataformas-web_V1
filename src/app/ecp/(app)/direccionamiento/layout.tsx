import { DireccionamientoTabs } from "@/components/panel/direccionamiento/DireccionamientoTabs";

// ── ECP · Direccionamiento ───────────────────────────────────────────────────
// El módulo donde se decide QUÉ dice la casa y CON QUÉ CIFRAS. Dos pestañas:
// la ficha viva de Definición de contexto (GTM y comunicación de CTCX, Kaffetal
// Regal y Cherry Picked) y los Grados de Calidad, que se mudaron aquí desde su
// entrada suelta del nav — son la definición que el contenido tiene que citar.
export default function DireccionamientoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DireccionamientoTabs />
      {children}
    </>
  );
}
