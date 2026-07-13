"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { checkFileSizeMb } from "@/lib/fileSize";
import { fincaEudrStatus } from "@/lib/eudr";
import { EudrYesNo } from "./EudrYesNo";
import { EudrStatusBadge } from "./EudrStatusBadge";
import { FincaMapPicker } from "./FincaMapPicker";
import { FieldInfo } from "./ficha/panes/FieldInfo";
import { fincaCode, type Finca, type GeneralInfo } from "./data";
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
  onRequestHelp,
  onUploadPhoto,
  onUploadVideo,
  onUploadLegalDoc,
}: {
  open: boolean;
  onClose: () => void;
  finca: Finca | null; // null = creating new
  gi: GeneralInfo;
  onSave: (f: Finca) => Promise<boolean>;
  onRequestHelp: (f: Finca, text: string) => Promise<boolean>;
  onUploadPhoto: (file: File) => void;
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
          onRequestHelp={onRequestHelp}
          onUploadPhoto={onUploadPhoto}
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
  onRequestHelp,
  onUploadPhoto,
  onUploadVideo,
  onUploadLegalDoc,
}: {
  finca: Finca | null;
  gi: GeneralInfo;
  onSave: (f: Finca) => Promise<boolean>;
  onRequestHelp: (f: Finca, text: string) => Promise<boolean>;
  onUploadPhoto: (file: File) => void;
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
  const [saving, setSaving] = useState(false);
  // Centered "Datos de Finca Actualizados" confirmation that fades on its own.
  const [flash, setFlash] = useState(false);
  // "Ayuda" help-request composer state.
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpText, setHelpText] = useState("");
  const [helpSending, setHelpSending] = useState(false);

  async function sendHelp() {
    if (!finca || !helpText.trim() || helpSending) return;
    setHelpSending(true);
    const ok = await onRequestHelp(finca, helpText);
    setHelpSending(false);
    if (ok) {
      setHelpText("");
      setHelpOpen(false);
    }
  }
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
    status: finca?.status ?? "pending_review",
    certShared: finca?.certShared ?? false,
    vereda: finca?.vereda ?? "—",
    mun: finca?.mun ?? "—",
    depto: finca?.depto ?? "—",
    alt: finca?.alt ?? "—",
    ha,
    hist: finca?.hist ?? "—",
    carac: finca?.carac ?? "—",
    videoAssetId: finca?.videoAssetId ?? null,
    videoUrl: finca?.videoUrl ?? null,
    profilePhotoAssetId: finca?.profilePhotoAssetId ?? null,
    profilePhotoUrl: finca?.profilePhotoUrl ?? null,
    requiresEudrPolygon: finca?.requiresEudrPolygon ?? false,
    eudrLegalDocsUrl: finca?.eudrLegalDocsUrl ?? null,
    ...eudr,
  };
  const eudrStatus = fincaEudrStatus(previewFinca);
  const haNum = Number(ha.replace(",", "."));
  const needsPolygon = !isNaN(haNum) && haNum > 4;

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName || saving) return;
    setSaving(true);
    const ok = await onSave({
      id: finca?.id ?? "",
      name: trimmedName,
      // Carried for the Finca type only -- saveFinca() never writes these
      // (CTC-managed); the producer can't change their own review/share state.
      status: finca?.status ?? "pending_review",
      certShared: finca?.certShared ?? false,
      vereda: veredaRef.current?.value.trim() || "—",
      mun: munRef.current?.value.trim() || "—",
      depto: deptoRef.current?.value ?? defaultDepto,
      alt: altRef.current?.value.trim() || "—",
      ha: ha.trim() || "—",
      hist: histRef.current?.value.trim() || "—",
      carac: caracRef.current?.value.trim() || "—",
      videoAssetId: finca?.videoAssetId ?? null,
      videoUrl: finca?.videoUrl ?? null,
      profilePhotoAssetId: finca?.profilePhotoAssetId ?? null,
      profilePhotoUrl: finca?.profilePhotoUrl ?? null,
      requiresEudrPolygon: needsPolygon,
      eudrLegalDocsUrl: finca?.eudrLegalDocsUrl ?? null,
      ...eudr,
    });
    setSaving(false);
    if (ok) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1900);
    }
  }

  function handlePhotoFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 5);
    if (!ok) {
      showToast(`La foto pesa ${mb.toFixed(1)} MB — el máximo es 5 MB.`);
      return;
    }
    onUploadPhoto(file);
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
      {finca && <p className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: -4 }}>{fincaCode(finca.id)}</p>}
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
        <div className={styles.wide}><label>Historia de la finca</label><textarea ref={histRef} defaultValue={finca?.hist ?? ""} placeholder="Historia, microclima, comunidad…" /></div>
        <div className={styles.wide}><label>Características</label><input ref={caracRef} defaultValue={finca?.carac ?? ""} placeholder="Sombrío, variedades sembradas, beneficio propio…" /></div>
        <div className={styles.wide}>
          <label>Foto de perfil de la finca <small>(máx. 5 MB)</small></label>
          {finca ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {finca.profilePhotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                <img src={finca.profilePhotoUrl} alt={finca.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" }} />
              )}
              <input type="file" accept="image/*" onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Guarde la finca primero para poder subir su foto.</p>
          )}
        </div>
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
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "6px 0 14px" }}>
          {/* download (not target=_blank): these should save to disk, not open the
              in-browser PDF viewer. */}
          <a href="/docs/eudr/boletin-25-novedades-exportadores-ue-mayo-2026.pdf" download style={{ fontSize: 12.5 }}>
            📄 Boletín No. 25 · Novedades para exportadores a la UE (may. 2026)
          </a>
          <a href="/docs/eudr/eudr-guidance-document-deforestation-free-2026.pdf" download style={{ fontSize: 12.5 }}>
            📄 Guía oficial EUDR · Reglamento de deforestación (2026)
          </a>
          <a href="/docs/eudr/tabla-codigos-dane.pdf" download style={{ fontSize: 12.5 }}>
            📄 Tabla de códigos DANE · municipios y departamentos
          </a>
        </div>

        <div className={styles.grid} style={{ marginTop: 14 }}>
          <div>
            <label>
              Área en café (ha)
              <FieldInfo text="Superficie sembrada en café de este predio. A partir de 4 ha el EUDR exige delimitar el terreno con un polígono (en el mapa de abajo), no solo un punto." />
            </label>
            <input value={ha} onChange={(e) => setHa(e.target.value)} type="number" step="0.1" placeholder="3.5" />
          </div>
          <div>
            <label>Fecha de establecimiento del cultivo</label>
            <input type="date" value={eudr.eudrPlantingDate} onChange={(e) => patchEudr({ eudrPlantingDate: e.target.value })} />
          </div>
        </div>
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
          <label>
            El predio no presenta deforestación posterior al 31/12/2020
            <FieldInfo text="El EUDR exige que la respuesta sea Sí — es la fecha de corte del reglamento y no admite excepciones. 'No sé' no es una respuesta válida: si no tiene certeza, reúna la evidencia (fecha de siembra, fotos históricas, verificación satelital) antes de declarar, ya que una respuesta 'No' o sin sustento bloquea la exportación de este predio bajo EUDR." />
          </label>
          <EudrYesNo value={eudr.eudrDeforestationFree} onChange={(v) => patchEudr({ eudrDeforestationFree: v })} />
        </div>
        <div className={styles.wide} style={{ marginBottom: 14 }}>
          <label>
            Producción realizada en áreas legalmente establecidas
            <FieldInfo text="El EUDR exige que la respuesta sea Sí — el predio debe cumplir con la legislación colombiana aplicable (uso del suelo, tenencia de la tierra, laboral, ambiental, tributaria, de derechos de comunidades). 'No sé' no es una respuesta válida: verifique con las autoridades locales o su documento de respaldo antes de declarar." />
          </label>
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
          <label>
            Documento de respaldo (PDF) <small>(máx. 10 MB)</small>
            <FieldInfo text="Adjunte, si lo tiene disponible, un documento que respalde la tenencia de la tierra declarada arriba (escritura, certificado de tradición y libertad, contrato de arrendamiento, acta de la asociación, etc.). No es obligatorio para guardar la finca." />
          </label>
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

      {/* Floating save: always visible bottom-right, a diskette that expands to
          its label on hover/focus. */}
      <button className={styles.fab} onClick={save} disabled={saving} aria-label="Guardar finca">
        <span className={styles.fabIcon} aria-hidden>💾</span>
        <span className={styles.fabLabel}>{saving ? "Guardando…" : "Guardar Finca"}</span>
      </button>

      {/* Floating "Ayuda": sends a help request to CTC (only for a saved finca). */}
      {finca && (
        <button className={styles.fabHelp} onClick={() => setHelpOpen((v) => !v)} aria-label="Pedir ayuda a CTC">
          <span className={styles.fabIcon} aria-hidden>💬</span>
          <span className={styles.fabLabel}>Ayuda</span>
        </button>
      )}
      {finca && helpOpen && (
        <div className={styles.helpBox}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 6px" }}>¿En qué necesita ayuda con esta finca?</p>
          <textarea
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            rows={3}
            placeholder="Describa su duda o problema. CTC lo verá y le responderá en 'Retroalimentación y ayuda'."
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-sm btn-solid" onClick={sendHelp} disabled={!helpText.trim() || helpSending}>
              {helpSending ? "Enviando…" : "Enviar a CTC"}
            </button>
            <button className="btn btn-sm" onClick={() => setHelpOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {flash && (
        <div className={styles.flash} role="status" aria-live="polite">
          <span>✓ Datos de Finca Actualizados</span>
        </div>
      )}
    </>
  );
}
