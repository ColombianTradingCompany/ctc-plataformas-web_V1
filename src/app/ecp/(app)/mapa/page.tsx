import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { getBaseMap, listProposals } from "../workmapActions";
import { WorkMapCanvas } from "./WorkMapCanvas";
import styles from "./mapa.module.css";

// ── Mapa de Trabajo (ECP, 2026-07-21) ────────────────────────────────────────
// BASE = el sistema real (fuente de verdad, en código; solo lectura). Las
// PROPUESTAS son iteraciones que el owner diseña para proponer cambios; se
// guardan en work_map_proposals y las trae de vuelta para que CTC las implemente.

export default async function EcpMapaPage() {
  const identity = await requireConsoleAccess("ecp");
  const [base, proposals] = await Promise.all([getBaseMap(), listProposals()]);
  return (
    <div>
      <h1 className={styles.title}>Mapa de Trabajo</h1>
      <p className={styles.sub}>
        El <b>Base</b> es la foto real del sistema (solo lectura). Cree una <b>propuesta</b> para reorganizar/anotar un
        cambio que quiere que CTC implemente — se guarda en su lista, no toca el Base. Toque un nodo para ver sus UIs. Exporte a PDF.
      </p>
      <WorkMapCanvas base={base} proposals={proposals} canEdit={identity.isOwner} />
    </div>
  );
}
