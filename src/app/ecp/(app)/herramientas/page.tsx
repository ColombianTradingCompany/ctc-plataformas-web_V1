import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { PlusBoard } from "./PlusBoard";
import { ToolsAdmin } from "./ToolsAdmin";
import { getToolsConfig } from "@/lib/tools/toolAccess";
import { ALL_TOOL_IDS, type ToolId } from "@/lib/tools/catalog";
import { TOOL_COPY } from "@/lib/tools/toolCopy";
import styles from "@/app/bcp/(app)/shared.module.css";

// Consola interna → Herramientas.
// Desde 2026-07-20 aquí se ve TODO el instrumental de la plataforma, no solo lo
// interno: el equipo necesita poder abrir exactamente lo mismo que ve un
// productor o un comprador (para acompañarlo por teléfono, para comprobar que
// una herramienta sigue sirviendo). Arriba, el tablero que decide dónde se
// ofrece cada una y con qué nivel.
//
// TODAS las herramientas viven en public/tools/ (2026-07-24 — el mecanismo de
// servido "privado" se retiró): no contienen datos ni secretos, y la tabla de
// Disponibilidad es el único control de dónde se ofrecen.


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

      <PlusBoard />

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
