"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { checkFileSizeMb } from "@/lib/fileSize";
import { fincaEudrStatus } from "@/lib/eudr";
import { EudrYesNo } from "./EudrYesNo";
import { EudrStatusBadge } from "./EudrStatusBadge";
import { FincaMapPicker } from "./FincaMapPicker";
import type { Finca, GeneralInfo } from "./data";
import styles from "./FincaModal.module.css";

const PRODUCTION_SYSTEMS: [Finca["eudrProductionSystem"], string][] = [
  ["sombra", "Café bajo sombra"],
  ["agroforestal", "Agroforestal"],
  ["tradicional", "Tradicional / pleno sol"],
];
const TENURE_OPTIONS: [Finca["eudrTenure"], string][] = [
  ["propietario", "Propietario"],
  ["poseedor", "Poseedor reconocido"],
  ["asociacion", "Asociación"],
];

// Evidencia disponible, Áreas de legislación verificadas, y Sostenibilidad y
// enfoque social are BCP-only fields now (filled in by CTC staff on
// /bcp/fincas as part of their own review, not self-declared by the
// producer) -- see EudrDraft below, which only covers what the producer
// still edits here. Their existing values still feed fincaEudrStatus() and
// round-trip on save; the producer just can't see or change them from here.
type EudrDraft = Pick<
  Finca,
  | "lat"
  | "lng"
  | "eudrPolygon"
  | "eudrPlantingDate"
  | "eudrProductionSystem"
  | "eudrDeforestationFree"
  | "eudrLegalProduction"
  | "eudrTenure"
  | "eudrLegalDocsAssetId"
  | "eudrLegalDocsFilename"
> & {
  eudrEvidenceTypes: Finca["eudrEvidenceTypes"];
  eudrEvidenceNotes: Finca["eudrEvidenceNotes"];
  eudrLegalAreas: Finca["eudrLegalAreas"];
  eudrSustainabilityTags: Finca["eudrSustainabilityTags"];
  eudrSustainabilityNotes: Finca["eudrSustainabilityNotes"];
};

const EMPTY_EUDR_DRAFT: EudrDraft = {
  lat: "",
  lng: "",
  eudrPolygon: null,
  eudrPlantingDate: "",
  eudrProductionSystem: "",
  eudrDeforestationFree: null,
  eudrLegalProduction: null,
  eudrTenure: "",
  eudrLegalDocsAssetId: null,
  eudrLegalDocsFilename: null,
  eudrEvidenceTypes: [],
  eudrEvidenceNotes: "",
  eudrLegalAreas: [],
  eudrSustainabilityTags: [],
  eudrSustainabilityNotes: "",
};

export function FincaModal({
  open,
  onClose,
  finca,
  gi,
  onSave,
  onUploadVideo,
  onUploadLegalDoc,
}: {
  open: boolean;
  onClose: () => void;
  finca: Finca | null; // null = creating new
  gi: GeneralInfo;
  onSave: (f: Finca) => void;
  onUploadVideo: (file: File) => void;
  onUploadLegalDoc: (file: File) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Identidad de la finca">
      {/* Keyed on the finca id (or "new") so switching what's being edited remounts
          this body with fresh initial state, instead of an effect that resets state
          imperatively on every open -- Modal itself never unmounts its children. */}
      {open && (
        <FincaModalBody
          key={finca?.id ?? "new"}
          finca={finca}
          gi={gi}
          onSave={onSave}
          onUploadVideo={onUploadVideo}
          onUploadLegalDoc={onUploadLegalDoc}
        />
      )}
    </Modal>
  );
}

function FincaModalBody({
  finca,
  gi,
  onSave,
  onUploadVideo,
  onUploadLegalDoc,
}: {
  finca: Finca | null;
  gi: GeneralInfo;
  onSave: (f: Finca) => void;
  onUploadVideo: (file: File) => void;
  onUploadLegalDoc: (file: File) => void;
}) {
  const { showToast } = useToast();
  const veredaRef = useRef<HTMLInputElement>(null);
  const munRef = useRef<HTMLInputElement>(null);
  const deptoRef = useRef<HTMLSelectElement>(null);
  const altRef = useRef<HTMLInputElement>(null);
  const histRef = useRef<HTMLTextAreaElement>(null);
  const caracRef = useRef<HTMLInputElement>(null);

  const defaultDepto = finca?.depto && finca.depto !== "—" ? finca.depto : gi.department || "Santander";

  // name/ha stay as controlled state (not refs, unlike the fields above) because
  // the live EUDR status preview below needs to react to them as the producer types.
  const [name, setName] = useState(finca?.name ?? "");
  const [ha, setHa] = useState(finca?.ha ?? "");
  const [eudr, setEudr] = useState<EudrDraft>(
    finca
      ? {
          lat: finca.lat,
          lng: finca.lng,
          eudrPolygon: finca.eudrPolygon,
          eudrPlantingDate: finca.eudrPlantingDate,
          eudrProductionSystem: finca.eudrProductionSystem,
          eudrDeforestationFree: finca.eudrDeforestationFree,
          eudrLegalProduction: finca.eudrLegalProduction,
          eudrTenure: finca.eudrTenure,
          eudrLegalDocsAssetId: finca.eudrLegalDocsAssetId,
          eudrLegalDocsFilename: finca.eudrLegalDocsFilename,
          // Read-only carry-through -- BCP-only fields, see EudrDraft's comment.
          eudrEvidenceTypes: finca.eudrEvidenceTypes,
          eudrEvidenceNotes: finca.eudrEvidenceNotes,
          eudrLegalAreas: finca.eudrLegalAreas,
          eudrSustainabilityTags: finca.eudrSustainabilityTags,
          eudrSustainabilityNotes: finca.eudrSustainabilityNotes,
        }
      : EMPTY_EUDR_DRAFT
  );

  function patchEudr(patch: Partial<EudrDraft>) {
    setEudr((d) => ({ ...d, ...patch }));
  }

  // Approximate live preview only -- vereda/mun/depto come from the finca prop
  // (not the refs above, which don't trigger re-renders as the producer types),
  // so this can lag slightly for the address-fallback geo path. The lat/lng
  // path (the primary one) is always accurate since it's controlled state.
  const previewFinca: Finca = {
    id: finca?.id ?? "",
    name,
    vereda: finca?.vereda ?? "—",
    mun: finca?.mun ?? "—",
    depto: finca?.depto ?? "—",
    alt: finca?.alt ?? "—",
    ha,
    hist: finca?.hist ?? "—",
    carac: finca?.carac ?? "—",
    videoAssetId: finca?.videoAssetId ?? null,
    videoUrl: finca?.videoUrl ?? null,
    requiresEudrPolygon: finca?.requiresEudrPolygon ?? false,
    eudrLegalDocsUrl: finca?.eudrLegalDocsUrl ?? null,
    ...eudr,
  };
  const eudrStatus = fincaEudrStatus(previewFinca);
  const haNum = Number(ha.replace(",", "."));
  const needsPolygon = !isNaN(haNum) && haNum > 4;

  function save() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave({
      id: finca?.id ?? "",
      name: trimmedName,
      vereda: veredaRef.current?.value.trim() || "—",
      mun: munRef.current?.value.trim() || "—",
      depto: deptoRef.current?.value ?? defaultDepto,
      alt: altRef.current?.value.trim() || "—",
      ha: ha.trim() || "—",
      hist: histRef.current?.value.trim() || "—",
      carac: caracRef.current?.value.trim() || "—",
      videoAssetId: finca?.videoAssetId ?? null,
      videoUrl: finca?.videoUrl ?? null,
      requiresEudrPolygon: needsPolygon,
      eudrLegalDocsUrl: finca?.eudrLegalDocsUrl ?? null,
      ...eudr,
    });
  }

  function handleVideoFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 100);
    if (!ok) {
      showToast(`El video pesa ${mb.toFixed(0)} MB — el máximo es 100 MB.`);
      return;
    }
    onUploadVideo(file);
  }

  function handleDocFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      showToast("El documento de respaldo debe ser un PDF.");
      return;
    }
    const { ok, mb } = checkFileSizeMb(file, 10);
    if (!ok) {
      showToast(`El documento pesa ${mb.toFixed(1)} MB — el máximo es 10 MB.`);
      return;
    }
    onUploadLegalDoc(file);
  }

  return (
    <>
      <h3>{finca ? `Editar finca · ${finca.name}` : "Registrar finca nueva"}</h3>
      <p>Cada finca se identifica una vez y queda disponible para asociar sus cafés. Esta es la cara de su café en Europa.</p>
      <div className={styles.grid}>
        <div className={styles.wide}>
          <label>Nombre de la finca</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. La Primavera" autoFocus />
        </div>
        <div><label>Vereda</label><input ref={veredaRef} defaultValue={finca?.vereda ?? ""} placeholder="Ej. El Encanto" /></div>
        <div><label>Municipio</label><input ref={munRef} defaultValue={finca?.mun ?? ""} placeholder="Ej. Piedecuesta" /></div>
        <div>
          <label>Departamento</label>
          <select ref={deptoRef} defaultValue={defaultDepto}>
            {["Santander", "Huila", "Cauca", "Nariño", "Tolima", "Antioquia", "Quindío", "Caldas", "Otro"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div><label>Altura (msnm)</label><input ref={altRef} defaultValue={finca?.alt ?? ""} type="number" placeholder="1680" /></div>
        <div><label>Área en café (ha)</label><input value={ha} onChange={(e) => setHa(e.target.value)} type="number" step="0.1" placeholder="3.5" /></div>
        <div className={styles.wide}><label>Historia de la finca</label><textarea ref={histRef} defaultValue={finca?.hist ?? ""} placeholder="Historia, microclima, comunidad…" /></div>
        <div className={styles.wide}><label>Características</label><input ref={caracRef} defaultValue={finca?.carac ?? ""} placeholder="Sombrío, variedades sembradas, beneficio propio…" /></div>
        <div className={styles.wide}>
          <label>Video de la finca <small>(máx. 100 MB)</small></label>
          {finca ? (
            <>
              <input type="file" accept="video/*" onChange={(e) => handleVideoFile(e.target.files?.[0])} />
              {finca.videoUrl && (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  ✓ Video actual: <a href={finca.videoUrl} target="_blank" rel="noopener noreferrer">ver / reemplazar arriba</a>
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Guarde la finca primero para poder subir su video.</p>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1.5px solid var(--line)", paddingTop: 16, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h4 style={{ margin: 0 }}>EUDR · Debida diligencia</h4>
          <EudrStatusBadge status={eudrStatus} />
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
          Reglamento (UE) 2023/1115. Este predio se declara una sola vez y se reutiliza en todos los lotes que salgan de él.
        </p>

        <div className={styles.wide} style={{ marginTop: 14, marginBottom: 14 }}>
          <label>{needsPolygon ? "Polígono del predio (> 4 ha)" : "Ubicación del predio"}</label>
          <FincaMapPicker
            lat={eudr.lat}
            lng={eudr.lng}
            polygon={eudr.eudrPolygon}
            needsPolygon={needsPolygon}
            onChangePoint={(lat, lng) => patchEudr({ lat, lng })}
            onChangePolygon={(polygon) => patchEudr({ eudrPolygon: polygon })}
          />
        </div>
        <div className={styles.grid} style={{ marginTop: 14 }}>
          <div>
            <label>Fecha de establecimiento del cultivo</label>
            <input type="date" value={eudr.eudrPlantingDate} onChange={(e) => patchEudr({ eudrPlantingDate: e.target.value })} />
          </div>
        </div>

        <div className={styles.wide} style={{ marginBottom: 14 }}>
          <label>Sistema productivo</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRODUCTION_SYSTEMS.map(([key, label]) => (
              <label key={key} className={styles.chip}>
                <input
                  type="radio"
                  name="eudr_production_system"
                  checked={eudr.eudrProductionSystem === key}
                  onChange={() => patchEudr({ eudrProductionSystem: key })}
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.wide} style={{ marginBottom: 14 }}>
          <label>El predio no presenta deforestación posterior al 31/12/2020</label>
          <EudrYesNo value={eudr.eudrDeforestationFree} onChange={(v) => patchEudr({ eudrDeforestationFree: v })} />
        </div>
        <div className={styles.wide} style={{ marginBottom: 14 }}>
          <label>Producción realizada en áreas legalmente establecidas</label>
          <EudrYesNo value={eudr.eudrLegalProduction} onChange={(v) => patchEudr({ eudrLegalProduction: v })} />
        </div>

        <div className={styles.wide} style={{ marginBottom: 14 }}>
          <label>Tenencia de la tierra</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TENURE_OPTIONS.map(([key, label]) => (
              <label key={key} className={styles.chip}>
                <input
                  type="radio"
                  name="eudr_tenure"
                  checked={eudr.eudrTenure === key}
                  onChange={() => patchEudr({ eudrTenure: key })}
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className={styles.wide} style={{ marginBottom: 14 }}>
          <label>Documento de respaldo (PDF) <small>(máx. 10 MB)</small></label>
          {finca ? (
            <>
              <input type="file" accept="application/pdf" onChange={(e) => handleDocFile(e.target.files?.[0])} />
              {eudr.eudrLegalDocsFilename && (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  ✓ {eudr.eudrLegalDocsFilename}
                  {finca.eudrLegalDocsUrl && (
                    <>
                      {" · "}
                      <a href={finca.eudrLegalDocsUrl} target="_blank" rel="noopener noreferrer">ver</a>
                    </>
                  )}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Guarde la finca primero para poder adjuntar el documento.</p>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
          La evidencia de no deforestación, las áreas de legislación verificadas y el enfoque de sostenibilidad los completa CTC como parte de su propia revisión — no requieren acción suya aquí.
        </p>
      </div>

      <button className="btn btn-solid" onClick={save}>Guardar finca</button>
    </>
  );
}
