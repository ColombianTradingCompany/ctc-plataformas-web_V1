"use client";

import { useState, type ReactNode } from "react";
import { mapPreviewUrl } from "@/lib/eudr";
import { earthWebUrl, buildFincaGeoJson } from "@/lib/earthKml";
import { createClient } from "@/lib/supabase/client";
import { uploadKaffetalMedia } from "@/lib/kaffetalMedia";
import { LOCAL_INFRA, fincaCode } from "@/components/kaffetal-regal/data";
import styles from "../shared.module.css";

const INFRA_DICT: [string, string][] = LOCAL_INFRA.map(([k, l]) => [k, l]);

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

// Shows the producer's declared answer for a field and, when CTC's value
// differs, a one-click "Confirmar" to adopt it. Whatever ends up in the field
// is CTC's evaluated value (the one printed on the certificate).
function ProducerAnswerNote({
  show,
  producerLabel,
  matches,
  onConfirm,
}: {
  show: boolean;
  producerLabel: string;
  matches: boolean;
  onConfirm: () => void;
}) {
  if (!show) return null;
  return (
    <p className={styles.meta} style={{ margin: "4px 0 0", fontSize: 11.5 }}>
      Respuesta de Productor: <b>{producerLabel}</b>{" "}
      {matches ? (
        <span style={{ color: "#166534" }}>· confirmada</span>
      ) : (
        <button type="button" className="btn btn-sm" style={{ padding: "1px 8px", fontSize: 11 }} onClick={onConfirm}>
          Confirmar
        </button>
      )}
    </p>
  );
}

export type FincaEudrValues = {
  hectares: string | number | null;
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
  eudr_evidence_files: Record<string, { assetId: string; fileName: string }> | null;
  eudr_sustainability_files: Record<string, { assetId: string; fileName: string }> | null;
  eudr_local_infra: string[] | null;
};

// GeoJSON estándar (RFC 7946) en vez del JSON casero de antes: es el formato
// que acepta TRACES (el sistema de la UE para la declaración EUDR) y cualquier
// SIG. El casero no tenía ningún consumidor, así que no se pierde nada.
function downloadGeoJson(fincaId: string, fincaName: string, values: FincaEudrValues) {
  const payload = buildFincaGeoJson({
    name: fincaName,
    code: fincaCode(fincaId),
    lat: values.eudr_lat,
    lng: values.eudr_lng,
    polygon: values.eudr_polygon_geojson,
  });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finca-${fincaName.replace(/\s+/g, "_").toLowerCase()}-eudr.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ProducerAnswers = {
  deforestationFree: boolean | null;
  legalProduction: boolean | null;
  tenure: string;
  plantingDate: string;
  productionSystem: string;
  lat: string;
  lng: string;
  polygon: { lat: number; lng: number }[] | null;
} | null;

// ── Sub-pestañas de la sección EUDR (2026-07-23, pedido del owner) ──────────
// Tres grupos con icono minimalista, en LECTURA y en EDICIÓN:
//   1. Declaración de Productor — lo que el productor declara (ha, fecha de
//      siembra, sistema, no-deforestación, producción legal, tenencia, doc).
//   2. Análisis y Evidencia — coordenadas + mapa + la CONEXIÓN CON GOOGLE
//      EARTH (enlace directo al predio + archivo .kml autogenerado con la
//      info de la finca, para el análisis de imágenes satelitales históricas)
//      + la evidencia disponible.
//   3. Atributos Complementarios — áreas de legislación y sostenibilidad.
// En edición sigue habiendo UN solo <form>: los paneles inactivos se ocultan
// con display:none (los campos siguen montados y viajan completos al guardar).
type SubTab = "declaracion" | "analisis" | "atributos";

function SubTabIcon({ k }: { k: SubTab }) {
  const p: Record<SubTab, ReactNode> = {
    // Documento con lápiz: la declaración del productor.
    declaracion: <><path d="M5 2.5h7l3 3V17.5H5Z" /><path d="M12 2.5v3h3" /><path d="M7.5 9h5M7.5 11.5h3" /><path d="m11.5 15.5 4-4 1.5 1.5-4 4-2 .5Z" /></>,
    // Satélite sobre el globo: análisis de imágenes satelitales.
    analisis: <><circle cx="8" cy="12.5" r="5" /><path d="M5.5 10.5c1.7-.8 3.6-.8 5.3 0M5.5 14.5c1.7.8 3.6.8 5.3 0" /><path d="m12.5 4 3.5 3.5M14.5 3.5l2 2M12 6.5 14 4.5" /></>,
    // Capas: atributos complementarios.
    atributos: <><path d="M10 3 17 7l-7 4-7-4Z" /><path d="m3.5 10.5 6.5 3.7 6.5-3.7" /><path d="m3.5 14 6.5 3.7 6.5-3.7" /></>,
  };
  return (
    <svg viewBox="0 0 20 20" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p[k]}
    </svg>
  );
}

function SubTabBar({ tab, setTab }: { tab: SubTab; setTab: (t: SubTab) => void }) {
  const tabs: { key: SubTab; label: string }[] = [
    { key: "declaracion", label: "Declaración de Productor" },
    { key: "analisis", label: "Análisis y Evidencia" },
    { key: "atributos", label: "Atributos Complementarios" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 12px" }}>
      {tabs.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={active}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${active ? "var(--primary)" : "var(--line)"}`,
              background: active ? "var(--primary)" : "transparent",
              color: active ? "#fff" : "var(--muted)",
            }}
          >
            <SubTabIcon k={t.key} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function FincaEudrEditor({
  fincaId,
  fincaName,
  producerId,
  values,
  legalDocUrl,
  fileUrls,
  producerAnswers,
  saveAction,
}: {
  fincaId: string;
  fincaName: string;
  producerId: string;
  values: FincaEudrValues;
  legalDocUrl: string | undefined;
  fileUrls: Record<string, string>;
  producerAnswers: ProducerAnswers;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [supabase] = useState(() => createClient());
  const [editing, setEditing] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("declaracion");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // The 5 producer declarations are controlled so CTC can either keep the
  // producer's answer (Confirmar) or type a different value (override). What is
  // stored in eudr_* is CTC's evaluated value -- that's what the certificate
  // prints; "Respuesta de Productor" is shown for reference only.
  const [evalPlanting, setEvalPlanting] = useState(values.eudr_planting_date ?? "");
  const [evalSystem, setEvalSystem] = useState(values.eudr_production_system ?? "");
  const [evalDefor, setEvalDefor] = useState(triSelectValue(values.eudr_deforestation_free));
  const [evalLegal, setEvalLegal] = useState(triSelectValue(values.eudr_legal_production));
  const [evalTenure, setEvalTenure] = useState(values.eudr_tenure ?? "");
  // Controlled so a per-item file input appears only for checked evidence /
  // sustainability keys.
  const [evidence, setEvidence] = useState<string[]>(values.eudr_evidence_types ?? []);
  const [sustain, setSustain] = useState<string[]>(values.eudr_sustainability_tags ?? []);
  const evidenceFiles = values.eudr_evidence_files ?? {};
  const sustainabilityFiles = values.eudr_sustainability_files ?? {};
  function toggle(list: string[], set: (v: string[]) => void, key: string, on: boolean) {
    set(on ? [...list, key] : list.filter((k) => k !== key));
  }
  const mapUrl = mapPreviewUrl({ lat: values.eudr_lat, lng: values.eudr_lng, polygon: values.eudr_polygon_geojson });
  // El polígono también cuenta: una finca solo-polígono (>4 ha sin punto
  // marcado) enlaza a Earth por su centroide.
  const earthUrl = earthWebUrl(values.eudr_lat, values.eudr_lng, values.eudr_polygon_geojson);
  const hasCoords = !!(values.eudr_polygon_geojson?.length || (values.eudr_lat && values.eudr_lng));

  // A plain <form action={saveAction}> looks like it "does nothing" after
  // submit: the server action's revalidatePath() refreshes `values`, but this
  // component stays mounted with `editing` still true (React preserves local
  // state across the prop update), and the edit inputs are uncontrolled
  // (defaultValue), so they never visually reflect the save either. Awaiting
  // the action directly lets us flip back to the read view -- which reads
  // straight from `values`, not defaultValue -- once the save actually lands.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // The supporting files are uploaded straight from the browser to Supabase
    // Storage (like every producer-side upload) and only their assetId/name
    // travel through the server action. Squeezing the raw files through the
    // action is a dead end: Next caps action bodies at 1 MB by default and
    // Vercel hard-caps request bodies at ~4.5 MB, so 5 MB attachments
    // "saved fine" locally and silently never arrived in production.
    const staged: { field: string; group: string; key: string; file: File }[] = [];
    for (const [k, v] of fd.entries()) {
      const m = k.match(/^(evidence|sustainability)_file_(.+)$/);
      if (!m || !(v instanceof File)) continue;
      if (v.size > 5 * 1024 * 1024) {
        setSaveError(`El archivo "${v.name}" supera 5 MB. Adjunte uno más liviano.`);
        return;
      }
      if (v.size > 0) staged.push({ field: k, group: m[1], key: m[2], file: v });
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (staged.length) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión BCP expirada; vuelva a iniciar sesión.");
        for (const s of staged) {
          const result = await uploadKaffetalMedia(supabase, producerId, `eudr-${s.group}/${s.key}`, s.file, user.id);
          if ("error" in result) throw new Error(`No se pudo subir "${s.file.name}": ${result.error}`);
          fd.set(`${s.group}_asset_${s.key}`, result.assetId);
          fd.set(`${s.group}_name_${s.key}`, s.file.name);
        }
      }
      // Never ship File payloads (even empty ones) through the action.
      for (const k of [...fd.keys()]) {
        if (/^(evidence|sustainability)_file_/.test(k)) fd.delete(k);
      }
      await saveAction(fd);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar la información EUDR.");
    } finally {
      setSaving(false);
    }
  }

  // Mapa + conexión con Google Earth: vive en "Análisis y Evidencia". El .kml
  // autogenerado (ruta autenticada) lleva punto + polígono + ficha de la finca;
  // el enlace directo abre Earth web centrado en el predio para revisar las
  // imágenes satelitales (históricas incluidas — la fecha de corte es 31/12/2020).
  const mapBlock = (
    <div style={{ marginTop: 4, marginBottom: 12 }}>
      {mapUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google Static Maps URL, not a local asset
        <img src={mapUrl} alt={`Mapa de ${fincaName}`} style={{ borderRadius: 8, border: "1px solid var(--line)", display: "block" }} />
      ) : (
        <p className={styles.meta} style={{ margin: 0 }}>Sin coordenadas capturadas todavía.</p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {earthUrl && (
          <a className="btn btn-sm btn-solid" href={earthUrl} target="_blank" rel="noopener noreferrer">
            Abrir en Google Earth ↗
          </a>
        )}
        {hasCoords && (
          <>
            <a className="btn btn-sm" href={`/bcp/fincas/${fincaId}/kml`}>
              Archivo Google Earth (.kml) ⤓
            </a>
            <button type="button" className="btn btn-sm" onClick={() => downloadGeoJson(fincaId, fincaName, values)}>
              GeoJSON (.geojson) ⤓
            </button>
          </>
        )}
      </div>
      {hasCoords && (
        <p className={styles.meta} style={{ margin: "6px 0 0", fontSize: 11.5, lineHeight: 1.7 }}>
          El enlace abre Earth con un <b>pin</b> sobre el predio; el <b>polígono</b> no puede viajar por URL — va en el
          .kml. Para verlo y dejarlo guardado: en Earth, <b>Proyectos → Nuevo proyecto → Importar archivo KML</b> — el
          pin y el polígono quedan dibujados y guardados en su proyecto. Use las <b>imágenes históricas</b> para
          verificar que no hay deforestación posterior al 31/12/2020, y pegue abajo la URL del proyecto donde guardó el
          análisis. El .geojson es el mismo par punto+polígono en el formato estándar que pide la UE (TRACES).
        </p>
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
        <SubTabBar tab={subTab} setTab={setSubTab} />

        {subTab === "declaracion" && (
          <div className={styles.meta} style={{ lineHeight: 1.9 }}>
            <div>Área cultivada en café: {values.hectares != null && String(values.hectares).trim() !== "" && Number(values.hectares) > 0 ? `${values.hectares} ha` : "sin definir"}</div>
            <div>Fecha de establecimiento del cultivo: {values.eudr_planting_date || "sin definir"}</div>
            <div>Sistema productivo: {values.eudr_production_system ? PRODUCTION_SYSTEM_LABEL[values.eudr_production_system] : "sin definir"}</div>
            <div>Libre de deforestación posterior al 31/12/2020: {yesNoLabel(values.eudr_deforestation_free)}</div>
            <div>Producción en áreas legalmente establecidas: {yesNoLabel(values.eudr_legal_production)}</div>
            <div>Tenencia de la tierra: {values.eudr_tenure ? TENURE_LABEL[values.eudr_tenure] : "sin definir"}</div>
            <div>
              Documento de respaldo: {values.eudr_legal_docs_filename ? (
                <>{values.eudr_legal_docs_filename}{legalDocUrl && <> · <a href={legalDocUrl} target="_blank" rel="noopener noreferrer">ver</a></>}</>
              ) : "no adjuntado"}
            </div>
          </div>
        )}

        {subTab === "analisis" && (
          <div>
            {mapBlock}
            <div className={styles.meta} style={{ lineHeight: 1.9 }}>
              <div>
                Ubicación:{" "}
                {values.eudr_polygon_geojson?.length
                  ? `Polígono de ${values.eudr_polygon_geojson.length} vértices`
                  : values.eudr_lat && values.eudr_lng
                    ? `${values.eudr_lat}, ${values.eudr_lng}`
                    : "no capturada"}
              </div>
              <div>
                Proyecto Google Earth guardado: {values.eudr_google_earth_url ? (
                  <a href={values.eudr_google_earth_url} target="_blank" rel="noopener noreferrer">ver enlace</a>
                ) : "sin enlace"}
              </div>
              <div>Evidencia: {labelsFor(values.eudr_evidence_types, EVIDENCE_TYPES)}</div>
              {values.eudr_evidence_notes && <div>Notas de evidencia: {values.eudr_evidence_notes}</div>}
            </div>
          </div>
        )}

        {subTab === "atributos" && (
          <div className={styles.meta} style={{ lineHeight: 1.9 }}>
            <div>Áreas de legislación verificadas: {labelsFor(values.eudr_legal_areas, LEGAL_AREAS)}</div>
            <div>Sostenibilidad y enfoque social: {labelsFor(values.eudr_sustainability_tags, SUSTAINABILITY_TAGS)}</div>
            {values.eudr_sustainability_notes && <div>Notas de sostenibilidad: {values.eudr_sustainability_notes}</div>}
            <div>Infraestructura local: {labelsFor(values.eudr_local_infra, INFRA_DICT)}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>Editando información EUDR</span>
        <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
      </div>
      <SubTabBar tab={subTab} setTab={setSubTab} />
      {saveError && <p style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 8 }}>{saveError}</p>}

      {/* UN solo formulario para las tres sub-pestañas: los paneles inactivos se
          OCULTAN (display:none), nunca se desmontan — así todos los campos viajan
          juntos al guardar sin importar en cuál pestaña esté parado BCP. */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: subTab === "declaracion" ? "block" : "none" }}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Área cultivada en café (ha)</label>
              <input name="hectares" type="number" step="0.01" min="0" defaultValue={values.hectares ?? ""} placeholder="Ej. 3.5" />
            </div>
            <div className={styles.field}>
              <label>Fecha de establecimiento del cultivo</label>
              <input type="date" name="eudr_planting_date" value={evalPlanting} onChange={(e) => setEvalPlanting(e.target.value)} />
              <ProducerAnswerNote
                show={!!producerAnswers}
                producerLabel={producerAnswers?.plantingDate || "sin definir"}
                matches={(producerAnswers?.plantingDate ?? "") === evalPlanting}
                onConfirm={() => setEvalPlanting(producerAnswers?.plantingDate ?? "")}
              />
            </div>
            <div className={styles.field}>
              <label>Sistema productivo</label>
              <select name="eudr_production_system" value={evalSystem} onChange={(e) => setEvalSystem(e.target.value)}>
                <option value="">Seleccione…</option>
                <option value="sombra">Café bajo sombra</option>
                <option value="agroforestal">Agroforestal</option>
                <option value="tradicional">Tradicional / pleno sol</option>
              </select>
              <ProducerAnswerNote
                show={!!producerAnswers}
                producerLabel={PRODUCTION_SYSTEM_LABEL[producerAnswers?.productionSystem ?? ""] ?? "sin definir"}
                matches={(producerAnswers?.productionSystem ?? "") === evalSystem}
                onConfirm={() => setEvalSystem(producerAnswers?.productionSystem ?? "")}
              />
            </div>
            <div className={styles.field}>
              <label>¿Libre de deforestación posterior al 31/12/2020?</label>
              <select name="eudr_deforestation_free" value={evalDefor} onChange={(e) => setEvalDefor(e.target.value)}>
                <option value="">Sin definir</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
              <ProducerAnswerNote
                show={!!producerAnswers}
                producerLabel={yesNoLabel(producerAnswers?.deforestationFree ?? null)}
                matches={triSelectValue(producerAnswers?.deforestationFree ?? null) === evalDefor}
                onConfirm={() => setEvalDefor(triSelectValue(producerAnswers?.deforestationFree ?? null))}
              />
            </div>
            <div className={styles.field}>
              <label>¿Producción en áreas legalmente establecidas?</label>
              <select name="eudr_legal_production" value={evalLegal} onChange={(e) => setEvalLegal(e.target.value)}>
                <option value="">Sin definir</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
              <ProducerAnswerNote
                show={!!producerAnswers}
                producerLabel={yesNoLabel(producerAnswers?.legalProduction ?? null)}
                matches={triSelectValue(producerAnswers?.legalProduction ?? null) === evalLegal}
                onConfirm={() => setEvalLegal(triSelectValue(producerAnswers?.legalProduction ?? null))}
              />
            </div>
          </div>

          {/* Tenencia + su documento de respaldo van JUNTOS: el documento del
              productor respalda precisamente la tenencia declarada. */}
          <div style={{ borderTop: "1px dashed var(--line)", borderBottom: "1px dashed var(--line)", padding: "14px 0", margin: "4px 0 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className={styles.field} style={{ marginBottom: 0 }}>
              <label>Tenencia de la tierra</label>
              <select name="eudr_tenure" value={evalTenure} onChange={(e) => setEvalTenure(e.target.value)}>
                <option value="">Seleccione…</option>
                <option value="propietario">Propietario</option>
                <option value="poseedor">Poseedor reconocido</option>
                <option value="asociacion">Asociación</option>
              </select>
              <ProducerAnswerNote
                show={!!producerAnswers}
                producerLabel={TENURE_LABEL[producerAnswers?.tenure ?? ""] ?? "sin definir"}
                matches={(producerAnswers?.tenure ?? "") === evalTenure}
                onConfirm={() => setEvalTenure(producerAnswers?.tenure ?? "")}
              />
            </div>
            <div className={styles.field} style={{ marginBottom: 0 }}>
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
          </div>
        </div>

        <div style={{ display: subTab === "analisis" ? "block" : "none" }}>
          {mapBlock}
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
                URL de proyecto Google Earth
                <span style={{ fontWeight: 400, color: "var(--muted)" }}> (pegue aquí el enlace del proyecto donde guardó su análisis)</span>
              </label>
              <input name="eudr_google_earth_url" type="url" defaultValue={values.eudr_google_earth_url ?? ""} placeholder="https://earth.google.com/..." />
            </div>
          </div>

          <div className={styles.field}>
            <label>Evidencia disponible</label>
            <div style={{ display: "grid", gap: 8 }}>
              {EVIDENCE_TYPES.map(([key, label]) => {
                const on = evidence.includes(key);
                const existing = evidenceFiles[key];
                return (
                  <div key={key}>
                    <label style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        name="eudr_evidence_types"
                        value={key}
                        checked={on}
                        onChange={(e) => toggle(evidence, setEvidence, key, e.target.checked)}
                      />{" "}
                      {label}
                    </label>
                    {on && (
                      <div style={{ margin: "4px 0 0 24px", fontSize: 12 }}>
                        {existing && (
                          <p className={styles.meta} style={{ margin: "0 0 3px" }}>
                            ✓ {existing.fileName}
                            {fileUrls[existing.assetId] && <> · <a href={fileUrls[existing.assetId]} target="_blank" rel="noopener noreferrer">ver</a></>}
                          </p>
                        )}
                        <input type="file" name={`evidence_file_${key}`} accept="image/*,application/pdf" style={{ fontSize: 12 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <textarea name="eudr_evidence_notes" defaultValue={values.eudr_evidence_notes ?? ""} placeholder="Fechas, fuente, quién verificó…" style={{ marginTop: 8 }} />
            <p className={styles.meta} style={{ margin: "4px 0 0" }}>Puede adjuntar un archivo de respaldo (≤ 5 MB) por cada evidencia marcada.</p>
          </div>
        </div>

        <div style={{ display: subTab === "atributos" ? "block" : "none" }}>
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
            <label>Sostenibilidad y enfoque social</label>
            <div style={{ display: "grid", gap: 8 }}>
              {SUSTAINABILITY_TAGS.map(([key, label]) => {
                const on = sustain.includes(key);
                const existing = sustainabilityFiles[key];
                return (
                  <div key={key}>
                    <label style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        name="eudr_sustainability_tags"
                        value={key}
                        checked={on}
                        onChange={(e) => toggle(sustain, setSustain, key, e.target.checked)}
                      />{" "}
                      {label}
                    </label>
                    {on && (
                      <div style={{ margin: "4px 0 0 24px", fontSize: 12 }}>
                        {existing && (
                          <p className={styles.meta} style={{ margin: "0 0 3px" }}>
                            ✓ {existing.fileName}
                            {fileUrls[existing.assetId] && <> · <a href={fileUrls[existing.assetId]} target="_blank" rel="noopener noreferrer">ver</a></>}
                          </p>
                        )}
                        <input type="file" name={`sustainability_file_${key}`} accept="image/*,application/pdf" style={{ fontSize: 12 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <textarea name="eudr_sustainability_notes" defaultValue={values.eudr_sustainability_notes ?? ""} style={{ marginTop: 8 }} />
            <p className={styles.meta} style={{ margin: "4px 0 0" }}>Puede adjuntar un archivo de respaldo (≤ 5 MB) por cada ítem marcado.</p>
          </div>
        </div>

        <button className="btn btn-solid" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar información EUDR"}</button>
      </form>
    </div>
  );
}
