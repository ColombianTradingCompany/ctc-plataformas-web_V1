import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { getWorkMap } from "../workmapActions";
import { WorkMapCanvas } from "./WorkMapCanvas";
import styles from "./mapa.module.css";

// ── Mapa de Trabajo (ECP, 2026-07-21) ────────────────────────────────────────
// El mapa exacto de cómo las tablas se construyen unas sobre otras a través de
// las compuertas del proceso, y en qué UI(s) se muestra cada una. Ver siempre;
// editar/guardar solo el owner (canEdit). Persistencia: platform_settings.work_map.

export default async function EcpMapaPage() {
  const identity = await requireConsoleAccess("ecp");
  const config = await getWorkMap();
  return (
    <div>
      <h1 className={styles.title}>Mapa de Trabajo</h1>
      <p className={styles.sub}>
        Cómo se construyen las tablas a través de las compuertas del proceso, y en qué UI(s) se muestra cada una.
        Toque un nodo para ver sus UIs{identity.isOwner ? " · «Editar» para reorganizar y guardar" : ""}. Exporte a PDF.
      </p>
      <WorkMapCanvas initial={config} canEdit={identity.isOwner} />
    </div>
  );
}
