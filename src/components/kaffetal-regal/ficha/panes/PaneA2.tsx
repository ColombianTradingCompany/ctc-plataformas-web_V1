"use client";

// F2 (2026-07-29, docs/EUDR_RESTRUCTURE_PLAN.md): el origen dejó de preguntarse.
// El productor declara HECHOS — de qué fincas sale este café (con kg por finca)
// y cuándo se recolectó — y el TIPO de lote (Single Estate / Single Origin /
// Regional / Multi-Origin) se CALCULA del conjunto de fincas y se muestra de
// solo lectura. El viejo radio "Categoría de Origen" se retiró: dejaba elegir
// una etiqueta que es un hecho comprobable, y la prima de Single Estate no
// puede depender de una casilla. Si el chip calculado "no cuadra", lo que está
// mal es la lista de fincas — ese es el error útil.

import { deriveArchetype, ARCHETYPE_LABEL, ARCHETYPE_INFO, type ContributionInput } from "@/lib/lotComposition";
import { FieldInfo } from "./FieldInfo";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

export function PaneA2({ data, onChange, fincas, onOpenNewFinca }: PaneProps) {
  const contribs = data.contributions;
  const contribInputs: ContributionInput[] = contribs
    .map((c) => {
      const f = fincas.find((x) => x.id === c.finca_id);
      if (!f) return null;
      return {
        fincaId: f.id,
        fincaName: f.name,
        weightKg: c.weight_kg.trim() ? Number(c.weight_kg.replace(",", ".")) : null,
        municipio: f.mun !== "—" ? f.mun : "",
        departamento: f.depto !== "—" ? f.depto : "",
        pais: "Colombia",
      };
    })
    .filter((x): x is ContributionInput => !!x);
  const archetype = deriveArchetype(contribInputs);
  const primary = contribs.length ? fincas.find((f) => f.id === contribs[0].finca_id) ?? null : null;
  const availableFincas = fincas.filter((f) => !contribs.some((c) => c.finca_id === f.id));

  function patchContribution(i: number, patch: Partial<{ finca_id: string; weight_kg: string }>) {
    const next = contribs.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    syncFromPrimary(next);
  }

  function addContribution(fincaId: string) {
    if (fincaId === "__new__") {
      onOpenNewFinca();
      return;
    }
    if (!fincaId || contribs.some((c) => c.finca_id === fincaId)) return;
    syncFromPrimary([...contribs, { finca_id: fincaId, weight_kg: "" }]);
  }

  function removeContribution(i: number) {
    syncFromPrimary(contribs.filter((_, idx) => idx !== i));
  }

  // La finca PRIMARIA (primer aporte) sigue alimentando los campos de contexto
  // (país/depto/municipio/msnm/geo) y el legacy `estate`, para que la vista
  // final, el intake de BCP y los impresos existentes no pierdan su fuente.
  function syncFromPrimary(next: { finca_id: string; weight_kg: string }[]) {
    const f = next.length ? fincas.find((x) => x.id === next[0].finca_id) : null;
    onChange({
      contributions: next,
      estate: f?.name ?? "",
      country: f ? "Colombia" : data.country,
      region_dep: f && f.depto !== "—" ? f.depto : "",
      county_muni: f && f.mun !== "—" ? f.mun : "",
      county_muni_text: "",
      masl: f && f.alt !== "—" ? f.alt : "",
      geo_ref: f && f.lat && f.lng ? `${f.lat}, ${f.lng}` : "",
    });
  }

  const badHarvestOrder = data.harvest_from !== "" && data.harvest_to !== "" && data.harvest_to < data.harvest_from;

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A2</span> Información de Origen</h3>

      {/* ── Los aportes: de qué fincas sale este café ─────────────────────── */}
      <div className={`${styles.ff} ${styles.fw}`} style={{ marginTop: 14 }}>
        <label>
          ¿De qué fincas sale este café?
          <FieldInfo text="Un lote puede salir de una sola finca o combinar varias. Registre cada finca aportante y, si el lote combina más de una, los kilogramos que aporta cada una — con eso el sistema calcula el tipo de lote y qué sellos puede presumir." />
        </label>
        {contribs.length === 0 && (
          <p className={styles.fexample} style={{ marginTop: 2 }}>Seleccione la finca de la que sale este café. Si aún no la ha registrado, créela primero.</p>
        )}
        <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
          {contribs.map((c, i) => {
            const f = fincas.find((x) => x.id === c.finca_id);
            return (
              <div key={c.finca_id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ flex: "1 1 220px", fontSize: 13.5 }}>
                  <b>{f?.name ?? "Finca eliminada"}</b>
                  {f && f.mun !== "—" && <span style={{ color: "var(--muted)" }}> · {f.mun}, {f.depto}</span>}
                </span>
                {contribs.length > 1 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={c.weight_kg}
                      onChange={(e) => patchContribution(i, { weight_kg: e.target.value })}
                      placeholder="kg"
                      style={{ width: 96 }}
                    />
                    <small style={{ color: "var(--muted)" }}>kg</small>
                  </span>
                )}
                <button type="button" className="btn btn-sm" onClick={() => removeContribution(i)}>Quitar</button>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value="" onChange={(e) => addContribution(e.target.value)} style={{ maxWidth: 340 }}>
              <option value="">{contribs.length ? "＋ Agregar otra finca aportante…" : "— Seleccione una de sus fincas —"}</option>
              {availableFincas.map((f) => (
                <option key={f.id} value={f.id}>{f.name} · {f.mun}, {f.depto}</option>
              ))}
              <option value="__new__">＋ Registrar una finca nueva</option>
            </select>
          </div>
        </div>
        {contribs.length > 1 && (
          <p className={styles.fexample} style={{ marginTop: 6 }}>
            Con más de una finca, los kilogramos por finca son los que permiten calcular la cobertura de cada sello (A4).
          </p>
        )}
      </div>

      {/* ── El tipo de lote: calculado, nunca elegido ─────────────────────── */}
      <div className={`${styles.ff} ${styles.fw}`} style={{ marginTop: 14 }}>
        <label>
          Tipo de lote <small>(calculado)</small>
          <FieldInfo text={archetype ? ARCHETYPE_INFO[archetype] : "El tipo de lote (Single Estate, Single Origin, Regional Blend o Multi-Origin Blend) se determina solo, contando las fincas aportantes y sus municipios. No se elige: es un hecho sobre el conjunto de fincas."} />
        </label>
        <div>
          <span
            className="mono"
            style={{
              display: "inline-block", padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
              letterSpacing: ".06em", textTransform: "uppercase",
              background: archetype ? "var(--primary)" : "var(--line)", color: archetype ? "#fff" : "var(--muted)",
            }}
          >
            {archetype ? ARCHETYPE_LABEL[archetype] : "Elija sus fincas"}
          </span>
          {archetype && <p className={styles.fexample} style={{ marginTop: 6 }}>{ARCHETYPE_INFO[archetype]}</p>}
        </div>
      </div>

      {/* ── La ventana de cosecha: la prueba temporal de los sellos ───────── */}
      <div className={styles.fgrid} style={{ marginTop: 14 }}>
        <div className={styles.ff}>
          <label>
            Recolección · desde
            <FieldInfo text="La ventana de recolección de ESTE lote. Es la fecha que decide qué certificados lo respaldan: un sello vale si estaba vigente cuando se recogió el café, no cuando se exporta." />
          </label>
          <input type="date" value={data.harvest_from} onChange={(e) => onChange({ harvest_from: e.target.value })} />
        </div>
        <div className={styles.ff}>
          <label>Recolección · hasta</label>
          <input type="date" value={data.harvest_to} onChange={(e) => onChange({ harvest_to: e.target.value })} />
          {badHarvestOrder && <p style={{ fontSize: 12, color: "var(--red)", margin: "3px 0 0" }}>La fecha final no puede ser anterior a la inicial.</p>}
        </div>
        <div className={styles.ff}>
          <label>País {primary && <small>(desde la finca)</small>}</label>
          <input value={primary ? "Colombia" : data.country} readOnly />
        </div>
        <div className={styles.ff}>
          <label>Departamento {primary && <small>(desde la finca)</small>}</label>
          <input value={data.region_dep} readOnly />
        </div>
        <div className={styles.ff}>
          <label>Municipio {primary && <small>(desde la finca)</small>}</label>
          <input value={data.county_muni} readOnly />
        </div>
        <div className={styles.ff}>
          <label>M.A.S.L. (msnm) {primary && <small>(desde la finca)</small>}</label>
          <input type="number" value={data.masl} readOnly={!!primary} onChange={(e) => onChange({ masl: e.target.value })} placeholder="1600" />
        </div>
        <div className={styles.ff}>
          <label>Geo Referencia <small>(EUDR{primary ? " · desde la finca" : ""})</small></label>
          <input value={data.geo_ref} readOnly={!!primary} onChange={(e) => onChange({ geo_ref: e.target.value })} placeholder="Lat, Lon o código" />
        </div>
        <div className={styles.ff}>
          <label>Edad Plantación (años)</label>
          <input type="number" value={data.plantation_age} onChange={(e) => onChange({ plantation_age: e.target.value })} placeholder="Ej. 5" />
        </div>
        {(archetype === "regional_blend" || archetype === "multiorigin_blend") && (
          <div className={`${styles.ff} ${styles.fw}`}>
            <label>
              Notas del Blend <small>(narrativa)</small>
              <FieldInfo text="Descripción comercial del blend para el comprador. La composición REAL (fincas y kilogramos) es la lista de arriba — esta nota no reemplaza esos datos." />
            </label>
            <textarea value={data.multi_origin_specs} onChange={(e) => onChange({ multi_origin_specs: e.target.value })} placeholder="Ej. perfil buscado, historia de las fincas…" />
          </div>
        )}
      </div>
    </div>
  );
}
