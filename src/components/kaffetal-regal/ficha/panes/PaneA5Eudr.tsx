"use client";

import { useMemo } from "react";
import { lotEudrStatus, fincaEudrStatus } from "@/lib/eudr";
import { EudrYesNo } from "../../EudrYesNo";
import { EudrStatusBadge } from "../../EudrStatusBadge";
import type { Finca } from "../../data";
import type { FichaFormData } from "../fichaData";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

const CUSTODY_STAGES: [string, string][] = [
  ["finca", "Finca"],
  ["beneficio", "Beneficio"],
  ["secado", "Secado"],
  ["trilla", "Trilla"],
  ["almacenamiento", "Almacenamiento"],
  ["exportacion", "Exportación"],
];

export function PaneA5Eudr({ data, onChange, fincas }: PaneProps) {
  const sourceFincas = useMemo(() => {
    const multi = !!data.origin_category && data.origin_category !== "Single Estate";
    if (multi) {
      return data.additional_estate_ids
        .map((id) => fincas.find((f) => f.id === id))
        .filter((f): f is Finca => !!f);
    }
    const f = fincas.find((f) => f.name === data.estate);
    return f ? [f] : [];
  }, [data.origin_category, data.additional_estate_ids, data.estate, fincas]);

  const status = lotEudrStatus(data, sourceFincas);

  function toggleStage(key: string, checked: boolean) {
    const next = checked ? [...data.eudr_custody_stages, key] : data.eudr_custody_stages.filter((k) => k !== key);
    onChange({ eudr_custody_stages: next });
  }

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A5</span> EUDR / Debida Diligencia</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 4px" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Estado EUDR de este lote:</span>
        <EudrStatusBadge status={status} />
      </div>
      <p className={styles.fexample}>
        Reglamento (UE) 2023/1115 · alineación voluntaria. El estado hereda el de la(s) finca(s) de origen.
      </p>

      <div style={{ margin: "14px 0" }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
          Finca(s) de origen ({sourceFincas.length || "sin resolver"})
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
            Seleccione la finca de origen en A2 para que este lote pueda trazarse.
          </p>
        )}
      </div>

      <div className={`${styles.ff} ${styles.fw}`} style={{ margin: "14px 0" }}>
        <label>Cadena de custodia</label>
        <p className={styles.fexample}>Confirme las etapas por las que pasa este lote.</p>
        <div className={styles.chips} style={{ marginTop: 6 }}>
          {CUSTODY_STAGES.map(([key, label]) => (
            <label className={styles.chip} key={key}>
              <input type="checkbox" checked={data.eudr_custody_stages.includes(key)} onChange={(e) => toggleStage(key, e.target.checked)} /> {label}
            </label>
          ))}
        </div>
        <textarea
          style={{ marginTop: 8 }}
          value={data.eudr_custody_notes}
          onChange={(e) => onChange({ eudr_custody_notes: e.target.value })}
          placeholder="Método de separación física / documental: sacos etiquetados, registro de báscula…"
        />
      </div>

      <div className={styles.fgrid} style={{ margin: "14px 0" }}>
        <div className={styles.ff}>
          <label>Riesgo país / región</label>
          <select value={data.eudr_country_risk} onChange={(e) => onChange({ eudr_country_risk: e.target.value })}>
            {["Bajo", "Estándar", "Alto"].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className={styles.ff}>
          <label>Complejidad de la cadena</label>
          <select value={data.eudr_chain_complexity} onChange={(e) => onChange({ eudr_chain_complexity: e.target.value })}>
            <option value="">Seleccione…</option>
            {["Bajo", "Medio", "Alto"].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className={styles.ff}>
          <label>Riesgo propio del producto (café)</label>
          <select value={data.eudr_product_risk} onChange={(e) => onChange({ eudr_product_risk: e.target.value })}>
            <option value="">Seleccione…</option>
            {["Bajo", "Medio", "Alto"].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className={styles.ff}>
          <label>Esquema de certificación / verificación (opcional)</label>
          <input value={data.eudr_cert_scheme} onChange={(e) => onChange({ eudr_cert_scheme: e.target.value })} placeholder="Rainforest Alliance, verificación propia…" />
        </div>
      </div>

      <div className={`${styles.ff} ${styles.fw}`} style={{ marginBottom: 14 }}>
        <label>¿Indicios de ilegalidad, deforestación o degradación en la cadena?</label>
        <EudrYesNo value={data.eudr_illegality_indicators} onChange={(v) => onChange({ eudr_illegality_indicators: v })} siLabel="Sí, hay indicios" noLabel="No hay indicios" />
      </div>
      <div className={`${styles.ff} ${styles.fw}`} style={{ marginBottom: 14 }}>
        <label>¿Documentos disponibles y verificables de inmediato?</label>
        <EudrYesNo value={data.eudr_docs_available} onChange={(v) => onChange({ eudr_docs_available: v })} />
      </div>

      <div className={`${styles.ff} ${styles.fw}`} style={{ marginBottom: 14 }}>
        <label>Nivel de riesgo determinado</label>
        <div className={styles.chips}>
          {(["insignificante", "no_insignificante"] as FichaFormData["eudr_risk_level"][]).map((v) => (
            <label className={styles.chip} key={v}>
              <input type="radio" name="eudr_risk_level" checked={data.eudr_risk_level === v} onChange={() => onChange({ eudr_risk_level: v })} />{" "}
              {v === "insignificante" ? "Insignificante" : "No insignificante"}
            </label>
          ))}
        </div>
      </div>

      {data.eudr_risk_level === "no_insignificante" && (
        <div className={styles.fsec} style={{ background: "var(--paper-2, #faf6ec)", borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--red)", margin: "0 0 8px" }}>
            Riesgo no insignificante: la mitigación es obligatoria antes de colocar el lote.
          </p>
          <div className={`${styles.ff} ${styles.fw}`}>
            <label>Acciones de mitigación adoptadas</label>
            <textarea
              value={data.eudr_mitigation_actions}
              onChange={(e) => onChange({ eudr_mitigation_actions: e.target.value })}
              placeholder="Geolocalización adicional, auditoría independiente, cambio de proveedor, verificación en campo…"
            />
          </div>
          <div className={`${styles.ff} ${styles.fw}`} style={{ marginTop: 10 }}>
            <label>¿La mitigación reduce el riesgo a insignificante?</label>
            <EudrYesNo
              value={data.eudr_mitigation_effective}
              onChange={(v) => onChange({ eudr_mitigation_effective: v })}
              siLabel="Sí, ahora es insignificante"
              noLabel="No"
            />
          </div>
          <div className={`${styles.ff} ${styles.fw}`} style={{ marginTop: 10 }}>
            <label>Responsable y fecha</label>
            <input
              value={data.eudr_mitigation_responsible}
              onChange={(e) => onChange({ eudr_mitigation_responsible: e.target.value })}
              placeholder="Nombre · cargo · fecha"
            />
          </div>
        </div>
      )}
    </div>
  );
}
