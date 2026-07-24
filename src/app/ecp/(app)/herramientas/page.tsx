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
// TODAS las herramientas viven en public/tools/ (2026-07-24 — el mecanismo de
// servido "privado" se retiró): no contienen datos ni secretos, y la tabla de
// Disponibilidad es el único control de dónde se ofrecen.

const TOOL_COPY: Record<ToolId, { name: string; desc: string }> = {
  qr: {
    name: "Generador de códigos QR",
    desc: "Genera QR con la marca CTC para etiquetas, empaques y material impreso. Exporta a PNG y SVG; funciona sin conexión. Se ofrece a productores.",
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
  "mermas-ctc": {
    name: "Calculadora de mermas · Café (CTC)",
    desc: "Rendimiento pergamino → verde con la marca CTC; exporta a PDF. Funciona sin conexión. Se ofrece a productores.",
  },
  catacion: {
    name: "Rueda de catación (rueda del sabor)",
    desc: "La rueda del sabor del café, interactiva: para nombrar aromas y sabores en la mesa de catación. Se ofrece a productores.",
  },
  "green-datasheet": {
    name: "Ficha de café verde (datasheet)",
    desc: "La hoja técnica de un lote de café verde, en el formato del comprador. En inglés. Se ofrece a productores.",
  },
  "formula-calidad": {
    name: "La fórmula de calidad del café",
    desc: "El marco de CTC para explicar cómo se compone la calidad de un café. Se ofrece a productores.",
  },
  "viaje-cafe": {
    name: "El viaje del café",
    desc: "El recorrido del café CTC, de la finca al destino, paso a paso. Se ofrece a productores.",
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
