import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { ECP_TOOL_IDS, type ToolId } from "@/lib/tools/catalog";
import styles from "@/app/bcp/(app)/shared.module.css";

// ECP · IT y Plataforma → Herramientas internas.
// Utilidades de trabajo del equipo, embebidas tal cual (ver ToolPanel). Viven en
// public/tools/ como las del productor: no contienen datos ni secretos — el
// generador de QR es una utilidad genérica con la marca CTC —, así que lo que se
// protege es la PÁGINA (esta consola), no el archivo.

const ECP_TOOL_COPY: Record<ToolId, { name: string; desc: string }> = {
  qr: {
    name: "Generador de códigos QR",
    desc: "Genera QR con la marca CTC para etiquetas, empaques y material impreso. Exporta a PNG y SVG; funciona sin conexión.",
  },
  agtron: { name: "Disco Agtron", desc: "Herramienta del productor." },
  "mermas-rapida": { name: "Calculadora rápida", desc: "Herramienta del productor." },
  "mermas-detallada": { name: "Calculadora detallada", desc: "Herramienta del productor." },
};

export default async function EcpHerramientasPage() {
  await requireConsoleAccess("ecp");

  return (
    <div>
      <h1 className={styles.title}>Herramientas internas</h1>
      <p className={styles.subtitle}>
        Utilidades de trabajo del equipo CTC, embebidas en la consola. Corren enteras en el navegador: no guardan
        nada ni mandan nada al servidor. Cada una también se puede abrir en su propia pestaña.
      </p>

      <ToolPanel
        tools={ECP_TOOL_IDS.map((id) => ({ id, ...ECP_TOOL_COPY[id] }))}
        labels={{
          openInTab: "Abrir en pestaña nueva ↗",
          choose: "Elija una herramienta para abrirla aquí.",
          groupAria: "Herramientas internas disponibles",
          frameTitle: (name) => `Herramienta: ${name}`,
        }}
        // Solo hay una: se abre directamente en vez de pedir un clic de más.
        initial={ECP_TOOL_IDS[0]}
      />
    </div>
  );
}
