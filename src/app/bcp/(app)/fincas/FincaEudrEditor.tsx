"use client";

import { useState } from "react";
import styles from "../shared.module.css";

const EVIDENCE_TYPES: [string, string][] = [
  ["satelital", "Imágenes satelitales"], ["observatory", "EU Observatory 2020"],
  ["registros", "Registros productivos"], ["terreno", "Verificación en campo"], ["catastro", "Mapas catastrales"],
];
const LEGAL_AREAS: [string, string][] = [
  ["suelo", "Uso del suelo y forestal"], ["ambiental", "Protección ambiental"],
  ["laboral", "Laborales y humanos"], ["clpi", "CLPI / terceros"], ["fiscal", "Fiscal / anticorrupción / aduanas"],
];
const SUSTAINABILITY_TAGS: [string, string][] = [
  ["sa8000", "SA 8000 evaluación voluntaria"], ["familiar", "Agricultura familiar campesina"],
  ["inclusion", "Inclusión de mujeres y jóvenes"], ["paisaje", "Conservación de paisajes"],
];
const PRODUCTION_SYSTEM_LABEL: Record<string, string> = { sombra: "Café bajo sombra", agroforestal: "Agroforestal", tradicional: "Tradicional / pleno sol" };
const TENURE_LABEL: Record<string, string> = { propietario: "Propietario", poseedor: "Poseedor reconocido", asociacion: "Asociación" };

function yesNoLabel(v: boolean | null): string {
  if (v === true) return "Sí";
  if (v === false) return "No";
  return "Sin definir";
}
function triSelectValue(v: boolean | null): string {
  if (v === true) return "si";
  if (v === false) return "no";
  return "";
}
function labelsFor(keys: string[] | null, dict: [string, string][]): string {
  if (!keys?.length) return "Ninguna";
  const map = new Map(dict);
  return keys.map((k) => map.get(k) ?? k).join(", ");
}

export type FincaEudrValues = {
  eudr_lat: string | number | null;
  eudr_lng: string | number | null;
  eudr_polygon_geojson: { lat: number; lng: number }[] | null;
  eudr_planting_date: string | null;
  eudr_production_system: string | null;
  eudr_deforestation_free: boolean | null;
  eudr_legal_production: boolean | null;
  eudr_evidence_types: string[] | null;
  eudr_evidence_notes: string | null;
  eudr_legal_areas: string[] | null;
  eudr_tenure: string | null;
  eudr_legal_docs_asset_id: string | null;
  eudr_legal_docs_filename: string | null;
  eudr_sustainability_tags: string[] | null;
  eudr_sustainability_notes: string | null;
  eudr_google_earth_url: string | null;
};

// A plain <img> against Google's Static Maps API -- no JS SDK needed, so this
// renders instantly and can't hit the WebGL rendering issues the interactive
// picker (FincaMapPicker) has run into. Returns null when there's nothing to
// show yet, so callers can fall back to a placeholder.
function staticMapUrl(values: FincaEudrValues): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  const polygon = values.eudr_polygon_geojson;
  const params = new URLSearchParams({ size: "360x220", maptype: "hybrid", key: apiKey });
  if (polygon && polygon.length >= 3) {
    params.set("path", "color:0xffcc00ff|weight:3|" + polygon.map((p) => `${p.lat},${p.lng}`).join("|"));
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }
  if (values.eudr_lat != null && values.eudr_lng != null && values.eudr_lat !== "" && values.eudr_lng !== "") {
    params.set("center", `${values.eudr_lat},${values.eudr_lng}`);
    params.set("zoom", "15");
    params.set("markers", `color:red|${values.eudr_lat},${values.eudr_lng}`);
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }
  return null;
}

function downloadCoordinatesJson(fincaName: string, values: FincaEudrValues) {
  const payload = {
    finca: fincaName,
    point: values.eudr_lat != null && values.eudr_lng != null ? { lat: Number(values.eudr_lat), lng: Number(values.eudr_lng) } : null,
    polygon: values.eudr_polygon_geojson ?? null,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fincaName.replace(/\s+/g, "_").toLowerCase()}-coordenadas.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// BCP's own EUDR assist form used to be always-expanded raw <select>/<input>
// fields under a <details> -- fine for the one BCP admin who built it, hard
// to scan for anyone else. This shows a plain read summary by default and
// only reveals the edit form when BCP explicitly clicks "Editar".
export function FincaEudrEditor({
  fincaName,
  values,
  legalDocUrl,
  saveAction,
}: {
  fincaName: string;
  values: FincaEudrValues;
  legalDocUrl: string | undefined;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const mapUrl = staticMapUrl(values);

  // A plain <form action={saveAction}> looks like it "does nothing" after
  // submit: the server action's revalidatePath() refreshes `values`, but this
  // component stays mounted with `editing` still true (React preserves local
  // state across the prop update), and the edit inputs are uncontrolled
  // (defaultValue), so they never visually reflect the save either. Awaiting
  // the action directly lets us flip back to the read view -- which reads
  // straight from `values`, not defaultValue -- once the save actually lands.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await saveAction(new FormData(e.currentTarget));
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar la información EUDR.");
    } finally {
      setSaving(false);
    }
  }
  const hasCoords = !!(mapUrl && (values.eudr_polygon_geojson?.length || (values.eudr_lat && values.eudr_lng)));

  const mapBlock = (
    <div style={{ marginTop: 10 }}>
      {mapUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google Static Maps URL, not a local asset
        <img src={mapUrl} alt={`Mapa de ${fincaName}`} style={{ borderRadius: 8, border: "1px solid var(--line)", display: "block" }} />
      ) : (
        <p className={styles.meta} style={{ margin: 0 }}>Sin coordenadas capturadas todavía.</p>
      )}
      {hasCoords && (
        <button type="button" className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => downloadCoordinatesJson(fincaName, values)}>
          Descargar coordenadas (.json)
        </button>
      )}
    </div>
  );

  if (!editing) {
    return (
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>Información EUDR (asistencia BCP)</span>
          <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>Editar</button>
        </div>
        {mapBlock}
        <div className={styles.meta} style={{ marginTop: 8, lineHeight: 1.9 }}>
          <div>Ubicación: {values.eudr_lat && values.eudr_lng ? `${values.eudr_lat}, ${values.eudr_lng}` : "no capturada"}</div>
          <div>Fecha de siembra: {values.eudr_planting_date || "sin definir"}</div>
          <div>Sistema productivo: {values.eudr_production_system ? PRODUCTION_SYSTEM_LABEL[values.eudr_production_system] : "sin definir"}</div>
          <div>Libre de deforestación: {yesNoLabel(values.eudr_deforestation_free)}</div>
          <div>Producción legal: {yesNoLabel(values.eudr_legal_production)}</div>
          <div>Tenencia: {values.eudr_tenure ? TENURE_LABEL[values.eudr_tenure] : "sin definir"}</div>
          <div>Evidencia: {labelsFor(values.eudr_evidence_types, EVIDENCE_TYPES)}</div>
          <div>Áreas legales verificadas: {labelsFor(values.eudr_legal_areas, LEGAL_AREAS)}</div>
          <div>
            Documento: {values.eudr_legal_docs_filename ? (
              <>{values.eudr_legal_docs_filename}{legalDocUrl && <> · <a href={legalDocUrl} target="_blank" rel="noopener noreferrer">ver</a></>}</>
            ) : "no adjuntado"}
          </div>
          <div>Sostenibilidad: {labelsFor(values.eudr_sustainability_tags, SUSTAINABILITY_TAGS)}</div>
          <div>
            Google Earth: {values.eudr_google_earth_url ? (
              <a href={values.eudr_google_earth_url} target="_blank" rel="noopener noreferrer">ver enlace</a>
            ) : "sin enlace"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>Editando información EUDR</span>
        <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
      </div>
      {mapBlock}
      {saveError && <p style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 8 }}>{saveError}</p>}
      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Latitud (WGS84)</label>
            <input name="eudr_lat" defaultValue={values.eudr_lat ?? ""} placeholder="4.712345" />
          </div>
          <div className={styles.field}>
            <label>Longitud (WGS84)</label>
            <input name="eudr_lng" defaultValue={values.eudr_lng ?? ""} placeholder="-75.612345" />
          </div>
          <div className={styles.field}>
            <label>
              URL de Google Earth
              <span style={{ fontWeight: 400, color: "var(--muted)" }}> (opcional -- integración futura)</span>
            </label>
            <input name="eudr_google_earth_url" type="url" defaultValue={values.eudr_google_earth_url ?? ""} placeholder="https://earth.google.com/..." />
          </div>
          <div className={styles.field}>
            <label>Fecha de establecimiento del cultivo</label>
            <input type="date" name="eudr_planting_date" defaultValue={values.eudr_planting_date ?? ""} />
          </div>
          <div className={styles.field}>
            <label>Sistema productivo</label>
            <select name="eudr_production_system" defaultValue={values.eudr_production_system ?? ""}>
              <option value="">Seleccione…</option>
              <option value="sombra">Café bajo sombra</option>
              <option value="agroforestal">Agroforestal</option>
              <option value="tradicional">Tradicional / pleno sol</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>¿Libre de deforestación posterior al 31/12/2020?</label>
            <select name="eudr_deforestation_free" defaultValue={triSelectValue(values.eudr_deforestation_free)}>
              <option value="">Sin definir</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>¿Producción en áreas legalmente establecidas?</label>
            <select name="eudr_legal_production" defaultValue={triSelectValue(values.eudr_legal_production)}>
              <option value="">Sin definir</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Tenencia de la tierra</label>
            <select name="eudr_tenure" defaultValue={values.eudr_tenure ?? ""}>
              <option value="">Seleccione…</option>
              <option value="propietario">Propietario</option>
              <option value="poseedor">Poseedor reconocido</option>
              <option value="asociacion">Asociación</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label>Evidencia disponible</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {EVIDENCE_TYPES.map(([key, label]) => (
              <label key={key} style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 400 }}>
                <input type="checkbox" name="eudr_evidence_types" value={key} defaultChecked={values.eudr_evidence_types?.includes(key)} /> {label}
              </label>
            ))}
          </div>
          <textarea name="eudr_evidence_notes" defaultValue={values.eudr_evidence_notes ?? ""} placeholder="Fechas, fuente, quién verificó…" />
        </div>

        <div className={styles.field}>
          <label>Áreas de legislación verificadas</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {LEGAL_AREAS.map(([key, label]) => (
              <label key={key} style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 400 }}>
                <input type="checkbox" name="eudr_legal_areas" value={key} defaultChecked={values.eudr_legal_areas?.includes(key)} /> {label}
              </label>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label>Documento de respaldo</label>
          {values.eudr_legal_docs_filename ? (
            <p className={styles.meta} style={{ margin: 0 }}>
              {values.eudr_legal_docs_filename}
              {legalDocUrl && <> · <a href={legalDocUrl} target="_blank" rel="noopener noreferrer">ver</a></>}
            </p>
          ) : (
            <p className={styles.meta} style={{ margin: 0 }}>El productor todavía no ha adjuntado ningún documento.</p>
          )}
        </div>

        <div className={styles.field}>
          <label>Sostenibilidad y enfoque social</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {SUSTAINABILITY_TAGS.map(([key, label]) => (
              <label key={key} style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 400 }}>
                <input type="checkbox" name="eudr_sustainability_tags" value={key} defaultChecked={values.eudr_sustainability_tags?.includes(key)} /> {label}
              </label>
            ))}
          </div>
          <textarea name="eudr_sustainability_notes" defaultValue={values.eudr_sustainability_notes ?? ""} />
        </div>

        <button className="btn btn-solid" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar información EUDR"}</button>
      </form>
    </div>
  );
}
