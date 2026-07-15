import { VARIETIES, type FichaFormData } from "../fichaData";
import { varietyTotal } from "../fichaCalculations";
import { FieldInfo } from "./FieldInfo";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";
import vstyles from "./PaneB1.module.css";

type OptField = "green_bean_humidity" | "green_bean_density" | "water_activity" | "yield_factor_producer";

// Proporciones cerradas en vez de número libre: reparto por cuartos (más 33%
// cuando hay exactamente 3 variedades y 100% para lote de una sola variedad).
const PCT_OPTIONS = ["100", "75", "50", "25"];

export function PaneB1({ data, onChange }: PaneProps) {
  const total = varietyTotal(data);
  const unknown = data.b1_unknown ?? [];
  const isBlend = data.origin_category === "Regional Blend" || data.origin_category === "Multi-Origin Blend";
  // Primera fila: 100% por defecto para Single Estate / Single Origin, 50%
  // para los blends. Se aplica cuando el productor elige la variedad y aún no
  // ha tocado la proporción.
  const defaultFirstPct = isBlend ? "50" : "100";
  const pctOptions = data.varieties.length === 3 ? ["100", "75", "50", "33", "25"] : PCT_OPTIONS;
  // "Mezcla" como especie solo tiene sentido si ninguna variedad domina al 100%.
  const hasFullVariety = data.varieties.some((v) => v.pct === "100");

  // Mark a measurement as "No lo sé aún": records the key and clears the value.
  function toggleUnknown(key: string, field: OptField, checked: boolean) {
    const next = checked ? [...unknown, key] : unknown.filter((k) => k !== key);
    const patch: Partial<FichaFormData> = { b1_unknown: next };
    if (checked) patch[field] = "";
    onChange(patch);
  }

  function updateRow(i: number, patch: Partial<{ pct: string; name: string }>) {
    const next = data.varieties.map((v, idx) => {
      if (idx !== i) return v;
      const merged = { ...v, ...patch };
      // Al elegir la variedad sin proporción aún: siembra el default (100/50
      // para la primera fila según categoría, 25 para las siguientes).
      if (patch.name && !merged.pct) merged.pct = i === 0 ? defaultFirstPct : "25";
      return merged;
    });
    onChange({ varieties: next });
  }
  function addRow() {
    onChange({ varieties: [...data.varieties, { pct: "", name: "" }] });
  }
  function removeRow(i: number) {
    onChange({ varieties: data.varieties.filter((_, idx) => idx !== i) });
  }

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B1</span> Variedades & Caracterización Básica</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        La suma de proporciones debe sumar exactamente 100%.
      </p>

      <div style={{ marginTop: 14 }}>
        {data.varieties.map((row, i) => {
          const meta = VARIETIES.find((v) => v.v === row.name);
          return (
            <div className={vstyles.row} key={i}>
              <select
                className={vstyles.pct}
                value={row.pct}
                onChange={(e) => updateRow(i, { pct: e.target.value })}
              >
                <option value="">%</option>
                {/* Una proporción guardada fuera de las opciones cerradas (lotes viejos) sigue visible. */}
                {row.pct && !pctOptions.includes(row.pct) && <option value={row.pct}>{row.pct}%</option>}
                {pctOptions.map((p) => <option key={p} value={p}>{p}%</option>)}
              </select>
              {/* input + datalist = buscador integrado en el propio campo, sin caja aparte. */}
              <input
                list="kr-variedades"
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                placeholder="Escriba para buscar la variedad…"
              />
              <button type="button" className={vstyles.del} onClick={() => removeRow(i)} aria-label="Eliminar">×</button>
              {meta && (
                <div className={vstyles.meta}>
                  <b>Especie:</b> {meta.e} · <b>Linaje:</b> {meta.l}
                  <br />
                  <span>{meta.c}</span>
                </div>
              )}
            </div>
          );
        })}
        <datalist id="kr-variedades">
          {VARIETIES.map((v) => <option key={v.v} value={v.v}>{v.l}</option>)}
        </datalist>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
          <button type="button" className={vstyles.add} onClick={addRow}>+ Añadir variedad</button>
          <span className={`${vstyles.total} ${total === 100 ? vstyles.good : total > 0 ? vstyles.bad : ""}`}>
            Proporción total: <b>{total}%</b>
          </span>
        </div>
      </div>

      <div className={styles.fgrid} style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
        <div className={styles.ff}>
          <label>Especie<FieldInfo text="La especie botánica del café — determina el perfil sensorial base y el mercado al que aplica. 'Mezcla' solo aplica cuando ninguna variedad representa el 100% del lote." /></label>
          <select value={data.species} onChange={(e) => onChange({ species: e.target.value })}>
            <option value="">—</option>
            <option>Arabica</option>
            <option>Robusta</option>
            <option>Liberica</option>
            <option disabled={hasFullVariety}>Mezcla</option>
          </select>
          {data.species === "Mezcla" && hasFullVariety && (
            <p className={styles.fexample} style={{ marginTop: 4, color: "var(--red, #C4402F)" }}>
              Hay una variedad al 100% — &quot;Mezcla&quot; solo aplica cuando ninguna domina el lote completo.
            </p>
          )}
        </div>
        <div className={styles.ff}>
          <label>Proceso Base<FieldInfo text="El método de beneficio: Lavado, Honey o Natural — define cómo se retira la pulpa y el mucílago antes del secado." /></label>
          <select value={data.base_processing} onChange={(e) => onChange({ base_processing: e.target.value })}>
            <option value="">—</option>
            <option>Lavado</option>
            <option>Honey</option>
            <option>Natural</option>
          </select>
        </div>
        <div className={styles.ff}>
          <label>Proceso Especial<FieldInfo text="Fermentaciones adicionales (anaeróbica, láctica, térmica) que se suman al proceso base para perfiles sensoriales diferenciados." /></label>
          <input value={data.special_processing} onChange={(e) => onChange({ special_processing: e.target.value })} placeholder="Anaeróbico, láctico, thermal…" />
        </div>
      </div>

      {/* Optional physical measurements -- the producer may not know these yet;
          "No lo sé aún" marks them for CTC to determine on evaluation. */}
      <p className={styles.fexample} style={{ marginTop: 16 }}>
        Datos físicos (opcionales). Si aún no los conoce, marque &quot;No lo sé aún&quot; — CTC los determinará durante la evaluación.
      </p>
      <div className={styles.fgrid} style={{ marginTop: 8 }}>
        <div className={styles.ff}>
          <label>Humedad del Grano (%)<FieldInfo text="Porcentaje de agua en el grano verde. Rango aceptable: 10–12%. Por debajo de 10% el grano se vuelve quebradizo; por encima de 12% compromete el almacenamiento y favorece hongos." /></label>
          <input type="number" step="0.1" value={unknown.includes("humidity") ? "" : data.green_bean_humidity} disabled={unknown.includes("humidity")} onChange={(e) => onChange({ green_bean_humidity: e.target.value })} placeholder={unknown.includes("humidity") ? "No lo sé aún" : "0.0"} />
          <label className={vstyles.unknownRow}><input type="checkbox" checked={unknown.includes("humidity")} onChange={(e) => toggleUnknown("humidity", "green_bean_humidity", e.target.checked)} /> No lo sé aún</label>
        </div>
        <div className={styles.ff}>
          <label>Densidad del Grano (g/L)<FieldInfo text="Masa por volumen del grano verde. Rango típico: 650–800 g/L — valores más altos suelen indicar mayor altitud de cultivo y mejor calidad física." /></label>
          <input type="number" step="1" value={unknown.includes("density") ? "" : data.green_bean_density} disabled={unknown.includes("density")} onChange={(e) => onChange({ green_bean_density: e.target.value })} placeholder={unknown.includes("density") ? "No lo sé aún" : "0"} />
          <label className={vstyles.unknownRow}><input type="checkbox" checked={unknown.includes("density")} onChange={(e) => toggleUnknown("density", "green_bean_density", e.target.checked)} /> No lo sé aún</label>
        </div>
        <div className={styles.ff}>
          <label>Actividad de Agua (aW)<FieldInfo text="Mide el agua disponible para reacciones químicas y microbianas, no solo el contenido total de humedad. Rango seguro para almacenamiento: 0.55–0.65 aW; por encima de 0.70 aumenta fuerte el riesgo de moho." /></label>
          <input type="number" step="0.001" value={unknown.includes("water_activity") ? "" : data.water_activity} disabled={unknown.includes("water_activity")} onChange={(e) => onChange({ water_activity: e.target.value })} placeholder={unknown.includes("water_activity") ? "No lo sé aún" : "0.000"} />
          <label className={vstyles.unknownRow}><input type="checkbox" checked={unknown.includes("water_activity")} onChange={(e) => toggleUnknown("water_activity", "water_activity", e.target.checked)} /> No lo sé aún</label>
        </div>
        <div className={styles.ff}>
          <label>Factor de Rendimiento (productor)<FieldInfo text="Kg de café pergamino necesarios para producir 70 kg de café verde exportable, según su propia estimación. El valor de referencia (par) en Colombia es 94; valores más bajos (87–93) indican mejor rendimiento físico." /></label>
          <input value={unknown.includes("yield_factor") ? "" : data.yield_factor_producer} disabled={unknown.includes("yield_factor")} onChange={(e) => onChange({ yield_factor_producer: e.target.value })} placeholder={unknown.includes("yield_factor") ? "No lo sé aún" : "kg pergamino / 70 kg verde"} />
          <label className={vstyles.unknownRow}><input type="checkbox" checked={unknown.includes("yield_factor")} onChange={(e) => toggleUnknown("yield_factor", "yield_factor_producer", e.target.checked)} /> No lo sé aún</label>
        </div>
      </div>
    </div>
  );
}
