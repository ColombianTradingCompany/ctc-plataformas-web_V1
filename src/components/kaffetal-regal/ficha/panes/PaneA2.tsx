"use client";

import { useState } from "react";
import { DEP_MUNI } from "../fichaData";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

const CATEGORIES = ["Single Estate", "Single Origin", "Regional Blend", "Multi-Origin Blend"];
const DEPARTMENTS = Object.keys(DEP_MUNI).sort();

export function PaneA2({ data, onChange, fincas, onOpenNewFinca }: PaneProps) {
  const [muniManual, setMuniManual] = useState(false);
  const municipalities = data.region_dep && DEP_MUNI[data.region_dep] ? DEP_MUNI[data.region_dep] : [];
  const showBlend = data.origin_category === "Regional Blend" || data.origin_category === "Multi-Origin Blend";

  function selectFinca(name: string) {
    if (name === "__new__") {
      onOpenNewFinca();
      return;
    }
    const finca = fincas.find((f) => f.name === name);
    if (!finca) {
      onChange({ estate: name });
      return;
    }
    onChange({
      estate: finca.name,
      country: data.country || "Colombia",
      region_dep: data.region_dep || finca.depto,
      county_muni: data.county_muni || finca.mun,
      masl: data.masl || finca.alt,
      geo_ref: data.geo_ref || finca.geo || "",
    });
  }

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A2</span> Información de Origen</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Single Estate = una sola finca. Single Origin = un municipio/vereda. Regional Blend = departamento.
        Multi-Origin Blend = múltiples orígenes o países.
      </p>
      <div className={`${styles.ff} ${styles.fw}`} style={{ marginTop: 14 }}>
        <label>Categoría de Origen</label>
        <div className={styles.chips}>
          {CATEGORIES.map((c) => (
            <label className={styles.chip} key={c}>
              <input type="radio" name="origin_category" value={c} checked={data.origin_category === c} onChange={() => onChange({ origin_category: c })} /> {c}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.fgrid} style={{ marginTop: 14 }}>
        <div className={styles.ff}>
          <label>Finca (Estate)</label>
          <select value={fincas.some((f) => f.name === data.estate) ? data.estate : ""} onChange={(e) => selectFinca(e.target.value)}>
            <option value="">— Seleccione una de sus fincas —</option>
            {fincas.map((f) => (
              <option key={f.name} value={f.name}>{f.name} · {f.mun}, {f.depto}</option>
            ))}
            <option value="__new__">＋ Registrar una finca nueva</option>
          </select>
          {!fincas.some((f) => f.name === data.estate) && (
            <input style={{ marginTop: 6 }} value={data.estate} onChange={(e) => onChange({ estate: e.target.value })} placeholder="O escriba el nombre de la finca" />
          )}
        </div>
        <div className={styles.ff}>
          <label>País</label>
          <select value={data.country} onChange={(e) => onChange({ country: e.target.value })}>
            <option value="">—</option>
            <option>Colombia</option>
            <option>Multi-Origin</option>
          </select>
        </div>
        <div className={styles.ff}>
          <label>Departamento</label>
          <select value={data.region_dep} onChange={(e) => onChange({ region_dep: e.target.value, county_muni: "" })}>
            <option value="">— Departamento —</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className={styles.ff}>
          <label>Municipio</label>
          {muniManual ? (
            <input value={data.county_muni_text} onChange={(e) => onChange({ county_muni_text: e.target.value })} placeholder="Municipio (texto libre)" />
          ) : (
            <select value={data.county_muni} onChange={(e) => onChange({ county_muni: e.target.value })}>
              <option value="">— Municipio —</option>
              {municipalities.map((m) => <option key={m}>{m}</option>)}
            </select>
          )}
          <button type="button" className={styles.fexample} style={{ marginTop: 4, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", color: "var(--primary)" }} onClick={() => setMuniManual((v) => !v)}>
            {muniManual ? "☰ Usar lista" : "✎ Escribir manualmente"}
          </button>
        </div>
        <div className={styles.ff}>
          <label>M.A.S.L. (msnm)</label>
          <input type="number" value={data.masl} onChange={(e) => onChange({ masl: e.target.value })} placeholder="1600" />
        </div>
        <div className={styles.ff}>
          <label>Geo Referencia <small>(EUDR)</small></label>
          <input value={data.geo_ref} onChange={(e) => onChange({ geo_ref: e.target.value })} placeholder="Lat, Lon o código" />
        </div>
        <div className={styles.ff}>
          <label>Edad Plantación (años)</label>
          <input type="number" value={data.plantation_age} onChange={(e) => onChange({ plantation_age: e.target.value })} placeholder="Ej. 5" />
        </div>
        {showBlend && (
          <div className={`${styles.ff} ${styles.fw}`}>
            <label>Especificaciones del Blend</label>
            <textarea value={data.multi_origin_specs} onChange={(e) => onChange({ multi_origin_specs: e.target.value })} placeholder="Ej. 60% Huila · 30% Santander · 10% Nariño…" />
          </div>
        )}
      </div>
    </div>
  );
}
