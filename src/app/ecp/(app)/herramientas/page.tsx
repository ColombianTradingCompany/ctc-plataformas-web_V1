import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { ToolsAdmin } from "./ToolsAdmin";
import { getToolsConfig } from "@/lib/tools/toolAccess";
import { ALL_TOOL_IDS, type ToolId } from "@/lib/tools/catalog";
import styles from "@/app/bcp/(app)/shared.module.css";

// Consola interna → Herramientas.
// Desde 2026-07-20 aquí se ve TODO el instrumental de la plataforma, no solo lo
// interno: el equipo necesita poder abrir exactamente lo mismo que ve un
// productor o un comprador (para acompañarlo por teléfono, para comprobar que
// una herramienta sigue sirviendo). Arriba, el tablero que decide dónde se
// ofrece cada una y con qué nivel.
//
// Las herramientas viven en public/tools/ (la interna, tras un route handler
// autenticado): no contienen datos ni secretos, así que lo que se protege es la
// PÁGINA, no el archivo.

const TOOL_COPY: Record<ToolId, { name: string; desc: string }> = {
  qr: {
    name: "Generador de códigos QR",
    desc: "Genera QR con la marca CTC para etiquetas, empaques y material impreso. Exporta a PNG y SVG; funciona sin conexión. Interna del equipo.",
  },
  agtron: {
    name: "Disco Agtron",
    desc: "Escala de color de tueste: el idioma con el que el comprador y el tostador describen un café. Se ofrece a productores y compradores.",
  },
  "mermas-rapida": {
    name: "Calculadora rápida de mermas",
    desc: "La cuenta del día a día del caficultor: pergamino → verde, con el factor de rendimiento. Funciona sin internet.",
  },
  "mermas-detallada": {
    name: "Calculadora detallada de mermas",
    desc: "La versión completa: defectos, mallas y factor, para cuando hay que sustentar el número.",
  },
};

export default async function EcpHerramientasPage() {
  await requireConsoleAccess("ecp");
  const config = await getToolsConfig();

  return (
    <div>
      <h1 className={styles.title}>Herramientas</h1>
      <p className={styles.subtitle}>
        Todo el instrumental de la plataforma, embebido en la consola: lo interno del equipo y lo mismo que ven el
        productor y el comprador. Corren enteras en el navegador — no guardan ni envían nada. Cada una se puede abrir
        también en su propia pestaña.
      </p>

      <ToolsAdmin
        initial={config}
        names={Object.fromEntries(ALL_TOOL_IDS.map((id) => [id, TOOL_COPY[id].name])) as Record<ToolId, string>}
      />

      <ToolPanel
        tools={ALL_TOOL_IDS.map((id) => ({ id, ...TOOL_COPY[id] }))}
        labels={{
          openInTab: "Abrir en pestaña nueva ↗",
          choose: "Elija una herramienta para abrirla aquí.",
          groupAria: "Herramientas disponibles",
          framePrefix: "Herramienta",
        }}
      />
    </div>
  );
}
