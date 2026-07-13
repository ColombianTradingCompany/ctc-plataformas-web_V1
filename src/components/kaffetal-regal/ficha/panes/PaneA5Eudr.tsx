"use client";

import { useMemo } from "react";
import { lotEudrStatus, fincaEudrStatus, resolveSourceFincas } from "@/lib/eudr";
import { EudrYesNo } from "../../EudrYesNo";
import { EudrStatusBadge } from "../../EudrStatusBadge";
import { FieldInfo } from "./FieldInfo";
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

// Guidance texts grounded in the EU Commission's EUDR guidance (Reglamento
// (UE) 2023/1115) -- same sources the reference due-diligence tool cited.
const INFO = {
  custodia:
    "Marque cada etapa física por la que pasa este lote entre la finca y la exportación. Entre más procesadores e intermediarios haya en el camino, mayor es el riesgo de mezcla con café de origen desconocido — una cadena corta y bien separada facilita demostrar riesgo insignificante (Guía CE, Art. 10(2)(i)).",
  separacion:
    "El EUDR no acepta mezcla de café de origen conocido con desconocido, ni contabilidad de balance de masas: el lote físico debe poder conectarse con su(s) finca(s). Describa cómo se mantiene separado e identificado este lote, o use el estándar de CTC.",
  ctcStandard:
    "CTC Parchment Storage Standard: el pergamino se almacena en sacos de yute/fique con bolsa interior hermética (liner tipo GrainPro) que protege el grano de humedad y olores. Cada saco lleva una tarjeta indicadora de humedad (HIC — Humidity Indicator Card) que evidencia si el contenido superó el rango seguro durante el almacenamiento o transporte, y un código QR único vinculado al código CTC del lote, que conecta el saco físico con esta ficha, su finca de origen y su expediente EUDR. Con eso la separación física (saco sellado e identificado) y la documental (QR → lote → finca) quedan cubiertas de una vez.",
  riesgoPais:
    "Clasificación de riesgo del país o región de producción según la Comisión Europea. Si un país no tiene nivel asignado, cuenta como riesgo estándar — Colombia figura hoy como estándar (Art. 29; Reglamento de Ejecución (UE) 2025/1093).",
  complejidad:
    "Cuántos actores tocan el café entre la finca y el operador que lo coloca en la UE: acopiadores, cooperativas, trilladoras, comercializadores. Una cadena con pocos eslabones y actores conocidos es de complejidad baja.",
  riesgoProducto:
    "Riesgo propio del producto café en su presentación: el pergamino/verde trazado por lote es de riesgo más bajo que cafés mezclados en acopio masivo, donde el origen se diluye.",
  certificacion:
    "Las certificaciones de terceros (Rainforest Alliance, orgánico, etc.) son voluntarias y NO sustituyen la debida diligencia — no crean un \"carril verde\" — pero sí cuentan como evidencia complementaria en la evaluación de riesgo (Guía CE, Art. 10(2)(n)).",
  indicios:
    "¿Existe alguna señal de deforestación, degradación de bosque o producción ilegal en cualquier punto de la cadena de este lote? Denuncias, alertas satelitales, sanciones a proveedores, inconsistencias en documentos. Si hay indicios, el riesgo no puede considerarse insignificante sin mitigarlos.",
  documentos:
    "¿Puede presentar de inmediato los documentos que respaldan este expediente (geolocalización, tenencia, registros productivos, remisiones)? La disponibilidad y verificabilidad de la documentación es uno de los criterios explícitos del Art. 10(2).",
  nivelRiesgo:
    "Conclusión de la evaluación: si tras revisar todos los criterios no hay motivo de preocupación de incumplir el reglamento, el riesgo es insignificante y el lote puede colocarse. Si CUALQUIER criterio revela riesgo no insignificante, debe mitigarse antes de continuar (Art. 2(26); Art. 10).",
  mitigacion:
    "Medidas concretas para llevar el riesgo a insignificante: recolectar geolocalización faltante, auditoría independiente, verificación en campo, cambio de proveedor. Si tras mitigar el riesgo NO queda insignificante, el lote no debe colocarse ni exportarse (Art. 11).",
};

export function PaneA5Eudr({ data, onChange, fincas }: PaneProps) {
  const sourceFincas = useMemo(
    () => resolveSourceFincas(data.origin_category, data.estate, data.additional_estate_ids, fincas),
    [data.origin_category, data.additional_estate_ids, data.estate, fincas]
  );

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
        <label>Cadena de custodia<FieldInfo text={INFO.custodia} /></label>
        <p className={styles.fexample}>Confirme las etapas por las que pasa este lote.</p>
        <div className={styles.chips} style={{ marginTop: 6 }}>
          {CUSTODY_STAGES.map(([key, label]) => (
            <label className={styles.chip} key={key}>
              <input type="checkbox" checked={data.eudr_custody_stages.includes(key)} onChange={(e) => toggleStage(key, e.target.checked)} /> {label}
            </label>
          ))}
        </div>
      </div>

      <div className={`${styles.ff} ${styles.fw}`} style={{ margin: "14px 0" }}>
        <label>Método de separación física / documental<FieldInfo text={INFO.separacion} /></label>
        <div className={styles.chips} style={{ marginTop: 6 }}>
          <label className={styles.chip}>
            <input
              type="radio"
              name="eudr_custody_method"
              checked={data.eudr_custody_method === "ctc_standard"}
              onChange={() => onChange({ eudr_custody_method: "ctc_standard" })}
            />{" "}
            CTC Parchment Storage Standard
            <FieldInfo text={INFO.ctcStandard} />
          </label>
          <label className={styles.chip}>
            <input
              type="radio"
              name="eudr_custody_method"
              checked={data.eudr_custody_method === "custom"}
              onChange={() => onChange({ eudr_custody_method: "custom" })}
            />{" "}
            Método propio
          </label>
        </div>
        {data.eudr_custody_method === "ctc_standard" && (
          <p className={styles.fexample} style={{ marginTop: 8 }}>
            ✓ Sacos de yute con liner hermético, tarjeta indicadora de humedad (HIC) y código QR vinculado al código CTC
            de este lote — la separación física y documental queda cubierta por el estándar.
          </p>
        )}
        {data.eudr_custody_method === "custom" && (
          <textarea
            style={{ marginTop: 8 }}
            value={data.eudr_custody_notes}
            onChange={(e) => onChange({ eudr_custody_notes: e.target.value })}
            placeholder="Describa su método: sacos etiquetados por lote, registro de báscula, separación en bodega…"
          />
        )}
      </div>

      <div className={styles.fgrid} style={{ margin: "14px 0" }}>
        <div className={styles.ff}>
          <label>Riesgo país / región<FieldInfo text={INFO.riesgoPais} /></label>
          <select value={data.eudr_country_risk} onChange={(e) => onChange({ eudr_country_risk: e.target.value })}>
            {["Bajo", "Estándar", "Alto"].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className={styles.ff}>
          <label>Complejidad de la cadena<FieldInfo text={INFO.complejidad} /></label>
          <select value={data.eudr_chain_complexity} onChange={(e) => onChange({ eudr_chain_complexity: e.target.value })}>
            <option value="">Seleccione…</option>
            {["Bajo", "Medio", "Alto"].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className={styles.ff}>
          <label>Riesgo propio del producto (café)<FieldInfo text={INFO.riesgoProducto} /></label>
          <select value={data.eudr_product_risk} onChange={(e) => onChange({ eudr_product_risk: e.target.value })}>
            <option value="">Seleccione…</option>
            {["Bajo", "Medio", "Alto"].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className={styles.ff}>
          <label>Esquema de certificación / verificación (opcional)<FieldInfo text={INFO.certificacion} /></label>
          <input value={data.eudr_cert_scheme} onChange={(e) => onChange({ eudr_cert_scheme: e.target.value })} placeholder="Rainforest Alliance, verificación propia…" />
        </div>
      </div>

      <div className={`${styles.ff} ${styles.fw}`} style={{ marginBottom: 14 }}>
        <label>¿Indicios de ilegalidad, deforestación o degradación en la cadena?<FieldInfo text={INFO.indicios} /></label>
        <EudrYesNo value={data.eudr_illegality_indicators} onChange={(v) => onChange({ eudr_illegality_indicators: v })} siLabel="Sí, hay indicios" noLabel="No hay indicios" />
      </div>
      <div className={`${styles.ff} ${styles.fw}`} style={{ marginBottom: 14 }}>
        <label>¿Documentos disponibles y verificables de inmediato?<FieldInfo text={INFO.documentos} /></label>
        <EudrYesNo value={data.eudr_docs_available} onChange={(v) => onChange({ eudr_docs_available: v })} />
      </div>

      <div className={`${styles.ff} ${styles.fw}`} style={{ marginBottom: 14 }}>
        <label>
          Nivel de riesgo determinado
          <FieldInfo text="Lo determina CTC como evaluador a partir de los factores declarados arriba (Art. 10-11 EUDR). No lo selecciona el productor." />
        </label>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: data.eudr_risk_level === "no_insignificante" ? "var(--red)" : "var(--ink)" }}>
          {data.eudr_risk_level === "insignificante"
            ? "Insignificante"
            : data.eudr_risk_level === "no_insignificante"
            ? "No insignificante"
            : "Pendiente de evaluación por CTC"}
        </p>
      </div>

      {data.eudr_risk_level === "no_insignificante" && (
        <div className={styles.fsec} style={{ background: "var(--paper-2, #faf6ec)", borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--red)", margin: "0 0 8px" }}>
            Riesgo no insignificante: la mitigación es obligatoria antes de colocar el lote.
            <FieldInfo text={INFO.mitigacion} />
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
