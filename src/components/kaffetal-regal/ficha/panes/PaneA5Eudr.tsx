"use client";

// ── A5 · Visa EUDR y Sello del Lote (2026-07-24, decisión del owner) ─────────
// La debida diligencia EUDR vive SOLO en la finca. La narrativa de viaje:
//   · el PRODUCTOR porta su Pasaporte (su identidad de proveedor CTC-P-…),
//   · cada FINCA obtiene su VISA (la aptitud EUDR que revisa y otorga BCP),
//   · cada LOTE recibe su SELLO — heredado por completo de la Visa de su(s)
//     finca(s) de origen.
// Este pane dejó de ser un cuestionario (país, custodia, factores de riesgo…):
// muestra de dónde hereda el lote y en qué estado va esa Visa. Los datos que el
// cuestionario viejo recogía quedan como histórico en la ficha — ya no se piden.

import { useMemo } from "react";
import { lotEudrStatus, fincaEudrStatus, resolveSourceFincas } from "@/lib/eudr";
import { EudrStatusBadge } from "../../EudrStatusBadge";
import { FieldInfo } from "./FieldInfo";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

const INFO = {
  visa: "La Visa EUDR es la debida diligencia de la FINCA (Reglamento (UE) 2023/1115): geolocalización o polígono, no deforestación posterior al 31/12/2020, producción legal, tenencia de la tierra y áreas de legislación verificadas. Se completa una sola vez por finca (desde 'Mis fincas' → Editar) y BCP la revisa y la otorga.",
  sello: "El Sello EUDR del lote se HEREDA de la Visa de su(s) finca(s) de origen: cuando la finca tiene su Visa vigente, todo lote que salga de ella queda sellado automáticamente — sin trámites adicionales por lote. Si la Visa está en trámite, el lote queda con bandera roja hasta que la finca la obtenga.",
};

export function PaneA5Eudr({ data, fincas }: PaneProps) {
  const sourceFincas = useMemo(
    () => resolveSourceFincas(data.origin_category, data.estate, data.additional_estate_ids, fincas),
    [data.origin_category, data.additional_estate_ids, data.estate, fincas]
  );

  const status = lotEudrStatus(data, sourceFincas);

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A5</span> Visa EUDR y Sello del Lote</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 4px" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Sello EUDR de este lote:</span>
        <EudrStatusBadge status={status} />
        <FieldInfo text={INFO.sello} />
      </div>
      <p className={styles.fexample}>
        Reglamento (UE) 2023/1115 · alineación voluntaria. El Sello del lote se hereda por completo de la Visa EUDR de
        su(s) finca(s) de origen — usted no diligencia nada adicional por lote.
      </p>

      <div style={{ margin: "16px 0" }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          Visa de la(s) finca(s) de origen ({sourceFincas.length || "sin resolver"})
          <FieldInfo text={INFO.visa} />
        </p>
        {sourceFincas.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--muted)" }}>
            {sourceFincas.map((f) => (
              <li key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {f.name} <EudrStatusBadge status={fincaEudrStatus(f)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.fexample}>
            Seleccione la finca de origen en A2 — sin origen no hay Visa que heredar ni Sello que emitir.
          </p>
        )}
      </div>

      {/* El camino según el estado: qué falta y dónde se resuelve. */}
      {status.code === "eudr_ready" ? (
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--green, #2E7D52)", background: "#EEF3EA", border: "1px solid var(--primary)", borderRadius: 10, padding: "10px 14px" }}>
          ✓ Visa vigente en la(s) finca(s) de origen — el Sello EUDR de este lote queda listo. Al evaluarse el lote podrá
          descargar su Sello desde «Certificación CTC».
        </p>
      ) : status.code === "sin_origen" ? null : (
        <p style={{ fontSize: 13, fontWeight: 600, color: "#8A6D1F", background: "#FBF2DD", border: "1px solid #E4CE8F", borderRadius: 10, padding: "10px 14px" }}>
          La Visa de su finca está {status.code === "bloqueado" ? "denegada o sin otorgar" : "en trámite"}: complete la
          información EUDR de la finca desde <b>Mis fincas → Editar</b> (ubicación o polígono, no deforestación,
          producción legal, tenencia y áreas legales). CTC la revisará y, al otorgarle la Visa, este lote quedará
          sellado automáticamente.
        </p>
      )}
    </div>
  );
}
