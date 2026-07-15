"use client";

import { useState } from "react";
import { DEP_MUNI, ORIGIN_CATEGORIES } from "../fichaData";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

const DEPARTMENTS = Object.keys(DEP_MUNI).sort();

export function PaneA2({ data, onChange, fincas, onOpenNewFinca }: PaneProps) {
  const [muniManual, setMuniManual] = useState(false);
  const [catInfoOpen, setCatInfoOpen] = useState<string | null>(null);
  const selectedFinca = fincas.find((f) => f.name === data.estate) ?? null;
  const derived = !!selectedFinca;
  const municipalities = data.region_dep && DEP_MUNI[data.region_dep] ? DEP_MUNI[data.region_dep] : [];
  const showBlend = data.origin_category === "Regional Blend" || data.origin_category === "Multi-Origin Blend";
  const multiFinca = !!data.origin_category && data.origin_category !== "Single Estate";

  function toggleAdditionalEstate(id: string, checked: boolean) {
    const next = checked ? [...data.additional_estate_ids, id] : data.additional_estate_ids.filter((x) => x !== id);
    onChange({ additional_estate_ids: next });
  }

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
    // A finca is the source of truth for its own origin data -- once selected,
    // these fields track the finca record instead of being typed independently
    // (edit the finca itself, from "Mis fincas", if any of this changes).
    onChange({
      estate: finca.name,
      country: "Colombia",
      region_dep: finca.depto !== "—" ? finca.depto : "",
      county_muni: finca.mun !== "—" ? finca.mun : "",
      county_muni_text: "",
      masl: finca.alt !== "—" ? finca.alt : "",
      geo_ref: finca.lat && finca.lng ? `${finca.lat}, ${finca.lng}` : "",
    });
  }

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A2</span> Información de Origen</h3>
      <div className={`${styles.ff} ${styles.fw}`} style={{ marginTop: 14 }}>
        <label>Categoría de Origen</label>
        <div className={styles.catGrid}>
          {ORIGIN_CATEGORIES.map((c) => {
            const sel = data.origin_category === c.name;
            return (
              <label className={`${styles.catCard} ${sel ? styles.catCardSel : ""}`} key={c.name}>
                <input type="radio" name="origin_category" value={c.name} checked={sel} onChange={() => onChange({ origin_category: c.name })} />
                <span>{c.name}</span>
                <button
                  type="button"
                  className={styles.catInfoBtn}
                  aria-label={`Qué significa ${c.name}`}
                  aria-expanded={catInfoOpen === c.name}
                  onClick={(e) => {
                    e.preventDefault();
                    setCatInfoOpen((v) => (v === c.name ? null : c.name));
                  }}
                >
                  ⓘ
                </button>
              </label>
            );
          })}
          {catInfoOpen && (
            <p className={styles.catInfo}>
              <b>{catInfoOpen}:</b> {ORIGIN_CATEGORIES.find((c) => c.name === catInfoOpen)?.info}
            </p>
          )}
        </div>
      </div>
      <div className={styles.fgrid} style={{ marginTop: 14 }}>
        <div className={`${styles.ff} ${multiFinca ? styles.fw : ""}`}>
          <label>{multiFinca ? "Fincas incluidas" : "Finca (Estate)"}</label>
          {multiFinca ? (
            <div className={styles.chips}>
              {fincas.map((f) => (
                <label className={styles.chip} key={f.id}>
                  <input
                    type="checkbox"
                    checked={data.additional_estate_ids.includes(f.id)}
                    onChange={(e) => toggleAdditionalEstate(f.id, e.target.checked)}
                  />{" "}
                  {f.name} · {f.mun}, {f.depto}
                </label>
              ))}
              <button type="button" className="btn btn-sm" onClick={onOpenNewFinca}>+ Registrar finca nueva</button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
        <div className={styles.ff}>
          <label>País {derived && <small>(desde la finca)</small>}</label>
          {derived ? (
            <input value={data.country} readOnly />
          ) : (
            <select value={data.country} onChange={(e) => onChange({ country: e.target.value })}>
              <option value="">—</option>
              <option>Colombia</option>
              <option>Multi-Origin</option>
            </select>
          )}
        </div>
        <div className={styles.ff}>
          <label>Departamento {derived && <small>(desde la finca)</small>}</label>
          {derived ? (
            <input value={data.region_dep} readOnly />
          ) : (
            <select value={data.region_dep} onChange={(e) => onChange({ region_dep: e.target.value, county_muni: "" })}>
              <option value="">— Departamento —</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          )}
        </div>
        <div className={styles.ff}>
          <label>Municipio {derived && <small>(desde la finca)</small>}</label>
          {derived ? (
            <input value={data.county_muni} readOnly />
          ) : muniManual ? (
            <input value={data.county_muni_text} onChange={(e) => onChange({ county_muni_text: e.target.value })} placeholder="Municipio (texto libre)" />
          ) : (
            <select value={data.county_muni} onChange={(e) => onChange({ county_muni: e.target.value })}>
              <option value="">— Municipio —</option>
              {municipalities.map((m) => <option key={m}>{m}</option>)}
            </select>
          )}
          {!derived && (
            <button type="button" className={styles.fexample} style={{ marginTop: 4, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", color: "var(--primary)" }} onClick={() => setMuniManual((v) => !v)}>
              {muniManual ? "☰ Usar lista" : "✎ Escribir manualmente"}
            </button>
          )}
        </div>
        <div className={styles.ff}>
          <label>M.A.S.L. (msnm) {derived && <small>(desde la finca)</small>}</label>
          <input type="number" value={data.masl} readOnly={derived} onChange={(e) => onChange({ masl: e.target.value })} placeholder="1600" />
        </div>
        <div className={styles.ff}>
          <label>Geo Referencia <small>(EUDR{derived ? " · desde la finca" : ""})</small></label>
          <input value={data.geo_ref} readOnly={derived} onChange={(e) => onChange({ geo_ref: e.target.value })} placeholder="Lat, Lon o código" />
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
