import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { PlusBoard } from "./PlusBoard";
import { ToolsAdmin } from "./ToolsAdmin";
import { cargarToolsAdmin } from "@/lib/tools/toolAccess";
import styles from "@/components/panel/shared.module.css";

// Consola interna → Herramientas del café.
// Desde 2026-07-20 aquí se ve TODO el instrumental de la plataforma, no solo lo
// interno: el equipo necesita poder abrir exactamente lo mismo que ve un
// productor o un comprador (para acompañarlo por teléfono, para comprobar que
// una herramienta sigue sirviendo).
//
// (2026-08-15) Arriba, el REGISTRO: subir versiones, elegir la publicada, marcar
// interna o compartible y repartir por superficie. El visor de abajo lista todas
// —incluidas las internas, que aquí sí se pueden abrir porque esta página exige
// sesión de consola— pero no las archivadas: retirar algo tiene que notarse
// también aquí, o el owner archiva y sigue viéndolo.
//
// Se rinde por request: publicar una versión debe verse al recargar, sin deploy.
export const dynamic = "force-dynamic";

export default async function EcpHerramientasPage() {
  await requireConsoleAccess("ecp");
  const tools = await cargarToolsAdmin();

  const abribles = tools.filter((t) => !t.archivada && t.src);

  return (
    <div>
      <h1 className={styles.title}>Herramientas del café</h1>
      <p className={styles.subtitle}>
        Todo el instrumental de la plataforma, embebido en la consola: lo interno del equipo y lo mismo que ven el
        productor y el comprador. Corren enteras en el navegador — no guardan ni envían nada. Cada una se puede abrir
        también en su propia pestaña.
      </p>

      <ToolsAdmin tools={tools} />

      <PlusBoard />

      <ToolPanel
        tools={abribles.map((t) => ({
          id: t.id,
          name: t.nombre,
          desc: t.descripcion,
          src: t.src,
          lang: t.lang,
        }))}
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
