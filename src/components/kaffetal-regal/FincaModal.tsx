"use client";

import { useReducer, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { useAutosave, AutosaveChip } from "@/lib/useAutosave";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import { fincaReferencePoint, lookupElevation } from "@/lib/geo/elevation";
import { Modal } from "@/components/Modal";
import { checkFileSizeMb } from "@/lib/fileSize";
import { fincaEudrStatus, deriveChainComplexity, deriveProductRisk, deriveFincaRiskLevel, PRODUCT_RISK_QUESTIONS } from "@/lib/eudr";
import { EudrYesNo } from "./EudrYesNo";
import { EudrStatusBadge } from "./EudrStatusBadge";
import { FincaMapPicker } from "./FincaMapPicker";
import { FieldInfo } from "./ficha/panes/FieldInfo";
import { fincaCode, LOCAL_INFRA, type Finca, type GeneralInfo } from "./data";
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

// Documento de respaldo: tipos admitidos, incluida la documentación SICA
// (Sistema de Información Cafetera / cédula cafetera de la FNC) pedida por el owner.
const SUPPORT_DOC_TYPES: [string, string][] = [
  ["escritura", "Escritura pública"],
  ["tradicion_libertad", "Certificado de tradición y libertad"],
  ["arrendamiento", "Contrato de arrendamiento"],
  ["acta_asociacion", "Acta / certificación de la asociación"],
  ["sica", "Registro SICA / cédula cafetera (FNC)"],
  ["otro", "Otro documento de respaldo"],
];

// Etapas físicas por las que pasa el café entre la finca y la exportación —
// alimentan la complejidad de la cadena (deriveChainComplexity). Trasladadas
// desde el cuestionario del lote (PaneA5Eudr) a la finca el 2026-07-24.
const CUSTODY_STAGES: [string, string][] = [
  ["finca", "Finca"],
  ["beneficio", "Beneficio"],
  ["secado", "Secado"],
  ["trilla", "Trilla"],
  ["almacenamiento", "Almacenamiento"],
  ["exportacion", "Exportación"],
];

// Textos guía anclados en la Guía de la Comisión Europea (Reglamento (UE) 2023/1115).
const EUDR_INFO = {
  custodia:
    "Marque cada etapa física por la que pasa el café de esta finca entre el predio y la exportación. Entre más procesadores e intermediarios haya en el camino, mayor es el riesgo de mezcla con café de origen desconocido — una cadena corta y bien separada facilita demostrar riesgo insignificante (Guía CE, Art. 10(2)(i)).",
  separacion:
    "El EUDR no acepta mezcla de café de origen conocido con desconocido, ni contabilidad de balance de masas: el café físico debe poder conectarse con esta finca. Describa cómo se mantiene separado e identificado, o use el estándar de CTC.",
  ctcStandard:
    "CTC Parchment Storage Standard: el pergamino se almacena en sacos de yute/fique con bolsa interior hermética (liner tipo GrainPro) que protege el grano de humedad y olores. Cada saco lleva una tarjeta indicadora de humedad (HIC) y un código QR único vinculado al código CTC del lote, que conecta el saco físico con su finca de origen y su expediente EUDR — la separación física y documental queda cubierta de una vez.",
  complejidad:
    "Cuántos actores tocan el café entre la finca y el operador que lo coloca en la UE: acopiadores, cooperativas, trilladoras, comercializadores. Una cadena con pocos eslabones y actores conocidos es de complejidad baja.",
  riesgoProducto:
    "Riesgo propio del producto café en su presentación: el pergamino/verde trazado por finca es de riesgo más bajo que cafés mezclados en acopio masivo, donde el origen se diluye.",
  certificacion:
    "Las certificaciones de terceros (Rainforest Alliance, orgánico, etc.) son voluntarias y NO sustituyen la debida diligencia — no crean un «carril verde» — pero sí cuentan como evidencia complementaria en la evaluación de riesgo (Guía CE, Art. 10(2)(n)).",
  indicios:
    "¿Existe alguna señal de deforestación, degradación de bosque o producción ilegal en cualquier punto de la cadena de esta finca? Denuncias, alertas satelitales, sanciones a proveedores, inconsistencias en documentos. Si hay indicios, el riesgo no puede considerarse insignificante sin mitigarlos.",
  documentos:
    "¿Puede presentar de inmediato los documentos que respaldan este expediente (geolocalización, tenencia, registros productivos, remisiones)? La disponibilidad y verificabilidad de la documentación es uno de los criterios explícitos del Art. 10(2).",
  nivelRiesgo:
    "Conclusión de la evaluación: si tras revisar todos los criterios no hay motivo de preocupación de incumplir el reglamento, el riesgo es insignificante y el café de esta finca puede colocarse. Si CUALQUIER criterio revela riesgo no insignificante, debe mitigarse antes de continuar (Art. 2(26); Art. 10).",
  mitigacion:
    "Describa las medidas concretas para llevar el riesgo a insignificante: recolectar geolocalización faltante, auditoría independiente, verificación en campo, cambio de proveedor. CTC evaluará si la mitigación reduce el riesgo a insignificante (Art. 11).",
};

// Read-out coloreado para un nivel de riesgo derivado. Bajo = verde, Medio /
// Estándar = ámbar, Alto = rojo. Portado de PaneA5Eudr.
function RiskPill({ level }: { level: string }) {
  const tone =
    level === "Bajo"
      ? { bg: "#E8F3EC", fg: "var(--green, #2E7D52)" }
      : level === "Alto"
      ? { bg: "#FBE9E7", fg: "var(--red, #C4402F)" }
      : level
      ? { bg: "#FBF2DD", fg: "#8A6D1F" }
      : { bg: "var(--paper)", fg: "var(--muted)" };
  return (
    <span style={{ display: "inline-block", fontSize: 12.5, fontWeight: 700, padding: "3px 12px", borderRadius: 999, background: tone.bg, color: tone.fg }}>
      {level || "Pendiente"}
    </span>
  );
}

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
  | "eudrLocalInfra"
  | "eudrLegalDocsAssetId"
  | "eudrLegalDocsFilename"
  | "eudrSupportDocType"
  // Risk questionnaire (moved from the lot 2026-07-24), producer-declared here.
  | "eudrCustodyStages"
  | "eudrCustodyMethod"
  | "eudrCustodyNotes"
  | "eudrProductRiskFactors"
  | "eudrIllegalityIndicators"
  | "eudrDocsAvailable"
  | "eudrCertScheme"
  | "eudrMitigationActions"
  | "eudrMitigationResponsible"
  | "eudrMitigationEffective"
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
  eudrLocalInfra: [],
  eudrLegalDocsAssetId: null,
  eudrLegalDocsFilename: null,
  eudrSupportDocType: "",
  eudrCustodyStages: [],
  eudrCustodyMethod: "",
  eudrCustodyNotes: "",
  eudrProductRiskFactors: [],
  eudrIllegalityIndicators: null,
  eudrDocsAvailable: null,
  eudrCertScheme: "",
  eudrMitigationActions: "",
  eudrMitigationResponsible: "",
  eudrMitigationEffective: null,
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
  onUploadPhoto: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  onUploadVideo: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  onUploadLegalDoc: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
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
  onUploadPhoto: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  onUploadVideo: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  onUploadLegalDoc: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
}) {
  const { showToast } = useToast();
  const veredaRef = useRef<HTMLInputElement>(null);
  const munRef = useRef<HTMLInputElement>(null);
  const deptoRef = useRef<HTMLSelectElement>(null);
  const histRef = useRef<HTMLTextAreaElement>(null);
  const caracRef = useRef<HTMLInputElement>(null);

  const defaultDepto = finca?.depto && finca.depto !== "—" ? finca.depto : gi.department || "Santander";

  // name/ha stay as controlled state (not refs, unlike the fields above) because
  // the live EUDR status preview below needs to react to them as the producer types.
  const [name, setName] = useState(finca?.name ?? "");
  const [ha, setHa] = useState(finca?.ha ?? "");
  // Altura (msnm): el productor la trae del mapa con un botón (centro del
  // polígono si lo hay; si no, el punto marcado) vía la Elevation API de
  // Open-Meteo (sin clave, CORS abierto), o la escribe a mano. altFrom recuerda
  // de dónde salió el último valor traído; altErr marca un fallo de consulta.
  const [alt, setAlt] = useState(finca?.alt && finca.alt !== "—" ? finca.alt : "");
  const [altFrom, setAltFrom] = useState<"polygon" | "point" | null>(null);
  const [altBusy, setAltBusy] = useState(false);
  const [altErr, setAltErr] = useState(false);
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
  // The producer edits their OWN declarations, so seed from eudrProducerAnswers
  // (the producer's answer), falling back to the eudr* columns for legacy fincas
  // saved before the producer/CTC split existed.
  const pa = finca?.eudrProducerAnswers ?? null;
  const [eudr, setEudr] = useState<EudrDraft>(
    finca
      ? {
          lat: pa ? pa.lat : finca.lat,
          lng: pa ? pa.lng : finca.lng,
          eudrPolygon: pa ? pa.polygon : finca.eudrPolygon,
          eudrPlantingDate: pa ? pa.plantingDate : finca.eudrPlantingDate,
          eudrProductionSystem: pa ? pa.productionSystem : finca.eudrProductionSystem,
          eudrDeforestationFree: pa ? pa.deforestationFree : finca.eudrDeforestationFree,
          eudrLegalProduction: pa ? pa.legalProduction : finca.eudrLegalProduction,
          eudrTenure: pa ? pa.tenure : finca.eudrTenure,
          eudrLocalInfra: finca.eudrLocalInfra ?? [],
          eudrLegalDocsAssetId: finca.eudrLegalDocsAssetId,
          eudrLegalDocsFilename: finca.eudrLegalDocsFilename,
          // Risk questionnaire: seed from the producer's answer, falling back to
          // the finca's eudr_* columns for fincas saved before the questionnaire
          // moved here (`pa?.x ?? undefined` -> column value when the snapshot
          // predates the field).
          eudrSupportDocType: pa?.supportDocType ?? finca.eudrSupportDocType,
          eudrCustodyStages: pa?.custodyStages ?? finca.eudrCustodyStages,
          eudrCustodyMethod: pa?.custodyMethod ?? finca.eudrCustodyMethod,
          eudrCustodyNotes: pa?.custodyNotes ?? finca.eudrCustodyNotes,
          eudrProductRiskFactors: pa?.productRiskFactors ?? finca.eudrProductRiskFactors,
          eudrIllegalityIndicators: pa?.illegalityIndicators ?? finca.eudrIllegalityIndicators,
          eudrDocsAvailable: pa?.docsAvailable ?? finca.eudrDocsAvailable,
          eudrCertScheme: pa?.certScheme ?? finca.eudrCertScheme,
          eudrMitigationActions: pa?.mitigationActions ?? finca.eudrMitigationActions,
          eudrMitigationResponsible: pa?.mitigationResponsible ?? finca.eudrMitigationResponsible,
          eudrMitigationEffective: pa?.mitigationEffective ?? finca.eudrMitigationEffective,
          // Read-only carry-through -- BCP-only fields, see EudrDraft's comment.
          eudrEvidenceTypes: finca.eudrEvidenceTypes,
          eudrEvidenceNotes: finca.eudrEvidenceNotes,
          eudrLegalAreas: finca.eudrLegalAreas,
          eudrSustainabilityTags: finca.eudrSustainabilityTags,
          eudrSustainabilityNotes: finca.eudrSustainabilityNotes,
        }
      : EMPTY_EUDR_DRAFT
  );

  // Fields where CTC's evaluation (finca.eudr*) differs from what the producer
  // declared (pa) -- surfaced as a note so the producer sees CTC's value.
  const YESNO = (v: boolean | null) => (v === true ? "Sí" : v === false ? "No" : "sin definir");
  const TENURE_L: Record<string, string> = { propietario: "Propietario", poseedor: "Poseedor reconocido", asociacion: "Asociación" };
  const SYS_L: Record<string, string> = { sombra: "Café bajo sombra", agroforestal: "Agroforestal", tradicional: "Tradicional / pleno sol" };
  const ctcAdjustments: string[] = [];
  if (finca && pa) {
    if (pa.deforestationFree !== finca.eudrDeforestationFree) ctcAdjustments.push(`Libre de deforestación → ${YESNO(finca.eudrDeforestationFree)}`);
    if (pa.legalProduction !== finca.eudrLegalProduction) ctcAdjustments.push(`Producción legal → ${YESNO(finca.eudrLegalProduction)}`);
    if (pa.tenure !== finca.eudrTenure) ctcAdjustments.push(`Tenencia → ${finca.eudrTenure ? TENURE_L[finca.eudrTenure] : "sin definir"}`);
    if (pa.plantingDate !== finca.eudrPlantingDate) ctcAdjustments.push(`Fecha de siembra → ${finca.eudrPlantingDate || "sin definir"}`);
    if (pa.productionSystem !== finca.eudrProductionSystem) ctcAdjustments.push(`Sistema productivo → ${finca.eudrProductionSystem ? SYS_L[finca.eudrProductionSystem] : "sin definir"}`);
  }

  function patchEudr(patch: Partial<EudrDraft>) {
    setEudr((d) => ({ ...d, ...patch }));
  }

  // Altura (msnm): NO se auto-rellena. El productor la trae del mapa con un
  // botón explícito (centro del polígono si lo hay; si no, el punto marcado) o
  // la escribe a mano. refPoint es el punto que representa a la finca; si aún
  // no hay ubicación registrada, el botón queda deshabilitado.
  const refPoint = fincaReferencePoint(eudr.lat, eudr.lng, eudr.eudrPolygon);
  async function pullAltitude() {
    if (!refPoint || altBusy) return;
    setAltBusy(true);
    setAltErr(false);
    const m = await lookupElevation(refPoint.point);
    if (m != null) {
      setAlt(String(m));
      setAltFrom(refPoint.from);
    } else {
      setAltErr(true);
    }
    setAltBusy(false);
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
    eudrProducerAnswers: finca?.eudrProducerAnswers ?? null,
    ...eudr,
  };
  const eudrStatus = fincaEudrStatus(previewFinca);
  const haNum = Number(ha.replace(",", "."));
  const needsPolygon = !isNaN(haNum) && haNum > 4;

  // Which of the three tabs is showing. All three panels stay mounted (toggled
  // by `display`) so the ref-based inputs in the general tab keep their values
  // and never get read back as null on save.
  const [tab, setTab] = useState<"general" | "ubicacion" | "eudr">("general");

  // Derived risk read-outs (país implícito = Colombia => estándar). Same pure
  // functions the lot used, now sourced from the finca's questionnaire.
  const chainComplexity = deriveChainComplexity(eudr.eudrCustodyStages);
  const productRisk = deriveProductRisk(eudr.eudrProductRiskFactors);
  const fincaRiskLevel = deriveFincaRiskLevel({
    eudrIllegalityIndicators: eudr.eudrIllegalityIndicators,
    eudrDocsAvailable: eudr.eudrDocsAvailable,
    eudrMitigationEffective: eudr.eudrMitigationEffective,
  });
  // Dot on the "Cuestionario EUDR" tab while its determination isn't resolved.
  const eudrTabPending = fincaRiskLevel !== "insignificante";

  function toggleCustodyStage(key: string, checked: boolean) {
    patchEudr({ eudrCustodyStages: checked ? [...eudr.eudrCustodyStages, key] : eudr.eudrCustodyStages.filter((k) => k !== key) });
  }
  function toggleProductFactor(key: string, checked: boolean) {
    patchEudr({ eudrProductRiskFactors: checked ? [...eudr.eudrProductRiskFactors, key] : eudr.eudrProductRiskFactors.filter((k) => k !== key) });
  }

  async function save(showFlash = true): Promise<boolean> {
    const trimmedName = name.trim();
    if (!trimmedName || saving) return false;
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
      alt: alt.trim() || "—",
      ha: ha.trim() || "—",
      hist: histRef.current?.value.trim() || "—",
      carac: caracRef.current?.value.trim() || "—",
      videoAssetId: finca?.videoAssetId ?? null,
      videoUrl: finca?.videoUrl ?? null,
      profilePhotoAssetId: finca?.profilePhotoAssetId ?? null,
      profilePhotoUrl: finca?.profilePhotoUrl ?? null,
      requiresEudrPolygon: needsPolygon,
      eudrLegalDocsUrl: finca?.eudrLegalDocsUrl ?? null,
      eudrProducerAnswers: finca?.eudrProducerAnswers ?? null,
      ...eudr,
    });
    setSaving(false);
    // El autosave pasa showFlash=false: el overlay centrado "Datos de Finca
    // Actualizados" cada pocos segundos de tecleo sería insoportable.
    if (ok && showFlash) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1900);
    }
    return ok;
  }

  // Autosave (2026-07-23): SOLO para fincas ya existentes — autoguardar una
  // finca nueva la crearía a medio escribir. Los campos con ref (vereda,
  // municipio, historia…) no re-renderizan al teclear, así que el contenedor
  // sube un contador con onInput/onChange; los controlados viajan en el snapshot.
  const [rev, bumpRev] = useReducer((x: number) => x + 1, 0);
  const { status: autosaveStatus } = useAutosave({
    enabled: !!finca?.id,
    snapshot: { rev, name, ha, alt, eudr },
    save: () => save(false),
  });

  const photoUp = useUpload();
  const videoUp = useUpload();
  const docUp = useUpload();

  function handlePhotoFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 5);
    if (!ok) {
      showToast(`La foto pesa ${mb.toFixed(1)} MB — el máximo es 5 MB.`);
      return;
    }
    void photoUp.run(() => onUploadPhoto(file, photoUp.progress));
  }

  function handleVideoFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 100);
    if (!ok) {
      showToast(`El video pesa ${mb.toFixed(0)} MB — el máximo es 100 MB.`);
      return;
    }
    void videoUp.run(() => onUploadVideo(file, videoUp.progress));
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
    void docUp.run(() => onUploadLegalDoc(file, docUp.progress));
  }

  return (
    <>
      <h3 style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        {finca ? `Editar finca · ${finca.name}` : "Registrar finca nueva"}
        <AutosaveChip status={autosaveStatus} />
      </h3>
      {finca && <p className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: -4 }}>{fincaCode(finca.id)}</p>}
      <p>Cada finca se identifica una sola vez y queda disponible para asociar sus cafés. Su debida diligencia EUDR (la «Visa» del predio) vive aquí y todos los lotes que salgan de esta finca la heredan.</p>

      {/* Estado EUDR de la finca -- persistente sobre las tres pestañas. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 2px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Visa EUDR del predio:</span>
        <EudrStatusBadge status={eudrStatus} />
      </div>
      {ctcAdjustments.length > 0 && (
        <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: "9px 12px", margin: "8px 0", fontSize: 12.5, color: "#92400E" }}>
          <b>CTC ajustó su evaluación de estos campos:</b> {ctcAdjustments.join(" · ")}. Su respuesta original se conserva; los
          valores que muestra este formulario son los suyos y puede actualizarlos.
        </div>
      )}

      {/* Pestañas: 1) info general · 2) ubicación y respaldo · 3) cuestionario EUDR.
          Los tres paneles quedan MONTADOS (se ocultan con display) para que los
          inputs con ref del panel 1 nunca se lean como null al guardar. */}
      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "general"} className={tab === "general" ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab("general")}>
          1 · Información general
        </button>
        <button type="button" role="tab" aria-selected={tab === "ubicacion"} className={tab === "ubicacion" ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab("ubicacion")}>
          2 · Ubicación y respaldo
        </button>
        <button type="button" role="tab" aria-selected={tab === "eudr"} className={tab === "eudr" ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab("eudr")}>
          3 · Cuestionario EUDR {eudrTabPending && <span className={styles.tabDot} title="Faltan respuestas para determinar la Visa" />}
        </button>
      </div>

      <div onInput={bumpRev} onChange={bumpRev}>
        {/* ── PANEL 1 · Información general ─────────────────────────────── */}
        <div style={{ display: tab === "general" ? undefined : "none" }}>
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
            <div>
              <label>
                Área en café (ha)
                <FieldInfo text="Superficie sembrada en café de este predio. A partir de 4 ha el EUDR exige delimitar el terreno con un polígono (en la pestaña «Ubicación y respaldo»), no solo un punto." />
              </label>
              <input value={ha} onChange={(e) => setHa(e.target.value)} type="number" step="0.1" placeholder="3.5" />
            </div>
            <div>
              <label>
                Altura (msnm)
                <FieldInfo text="Tráigala del mapa con el botón «Traer del mapa»: usa el centro del polígono cuando lo hay (predios de más de 4 ha) o el punto marcado. Marque primero la ubicación en la pestaña «Ubicación y respaldo». También puede escribirla a mano si conoce el dato exacto." />
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <input
                  value={alt}
                  onChange={(e) => {
                    setAlt(e.target.value);
                    setAltFrom(null); // editada a mano ⇒ ya no viene del mapa
                    setAltErr(false);
                  }}
                  type="number"
                  placeholder="1680"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={pullAltitude}
                  disabled={!refPoint || altBusy}
                  title={refPoint ? "Traer la altura del punto/polígono registrado en el mapa" : "Marque primero la ubicación en «Ubicación y respaldo»"}
                  style={{ flex: "none", whiteSpace: "nowrap" }}
                >
                  {altBusy ? "Calculando…" : "Traer del mapa ⛰"}
                </button>
              </div>
              <p style={{ fontSize: 11, color: altErr ? "var(--red)" : "var(--muted)", margin: "3px 0 0" }}>
                {altBusy
                  ? "Consultando la altura del terreno…"
                  : altErr
                    ? "No se pudo obtener la altura; escríbala a mano."
                    : altFrom === "polygon"
                      ? "Traída del centro del polígono."
                      : altFrom === "point"
                        ? "Traída del punto marcado."
                        : !refPoint
                          ? "Marque la ubicación en «Ubicación y respaldo» para poder traerla, o escríbala a mano."
                          : "Toque «Traer del mapa» o escríbala a mano."}
              </p>
            </div>
            <div className={styles.wide}>
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
            <div>
              <label>Fecha de establecimiento del cultivo</label>
              <input type="date" value={eudr.eudrPlantingDate} onChange={(e) => patchEudr({ eudrPlantingDate: e.target.value })} />
            </div>
            <div className={styles.wide}><label>Historia de la finca</label><textarea ref={histRef} defaultValue={finca?.hist ?? ""} placeholder="Historia, microclima, comunidad…" /></div>
            <div className={styles.wide}><label>Características</label><input ref={caracRef} defaultValue={finca?.carac ?? ""} placeholder="Sombrío, variedades sembradas, beneficio propio…" /></div>
            <div className={styles.wide}>
              <label>Foto de perfil de la finca <small>(máx. 5 MB)</small></label>
              {finca ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {finca.profilePhotoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                    <img src={finca.profilePhotoUrl} alt={finca.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" }} />
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
                  <UploadProgressRing state={photoUp.state} />
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>Guarde la finca primero para poder subir su foto.</p>
              )}
            </div>
            <div className={styles.wide}>
              <label>Video de la finca <small>(máx. 100 MB)</small></label>
              {finca ? (
                <>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="file" accept="video/*" onChange={(e) => handleVideoFile(e.target.files?.[0])} />
                    <UploadProgressRing state={videoUp.state} />
                  </div>
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
        </div>

        {/* ── PANEL 2 · Ubicación y respaldo ───────────────────────────── */}
        <div style={{ display: tab === "ubicacion" ? undefined : "none" }}>
          <div className={styles.wide} style={{ margin: "14px 0" }}>
            <label>{needsPolygon ? "Polígono del predio (> 4 ha)" : "Ubicación del predio"}</label>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 6px" }}>
              {needsPolygon
                ? "Este predio supera las 4 ha: el EUDR exige delimitarlo con un polígono, no solo un punto."
                : "Marque el punto del predio en el mapa. Es la evidencia principal de geolocalización EUDR."}
            </p>
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

          {/* Documento de respaldo (respalda la tenencia declarada arriba). Ahora
              con un selector de tipo que admite documentación SICA / cédula cafetera. */}
          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>
              Documento de respaldo <small>(PDF, máx. 10 MB)</small>
              <FieldInfo text="Adjunte, si lo tiene disponible, un documento que respalde la tenencia de la tierra declarada arriba. Admite escritura, certificado de tradición y libertad, contrato de arrendamiento, acta de la asociación, o la documentación SICA (Registro SICA / cédula cafetera de la FNC). No es obligatorio para guardar la finca." />
            </label>
            <div className={styles.grid} style={{ margin: "6px 0" }}>
              <div className={styles.wide}>
                <label>Tipo de documento</label>
                <select value={eudr.eudrSupportDocType} onChange={(e) => patchEudr({ eudrSupportDocType: e.target.value })}>
                  <option value="">Seleccione…</option>
                  {SUPPORT_DOC_TYPES.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {finca ? (
              <>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="file" accept="application/pdf" onChange={(e) => handleDocFile(e.target.files?.[0])} />
                  <UploadProgressRing state={docUp.state} />
                </div>
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
        </div>

        {/* ── PANEL 3 · Cuestionario EUDR ──────────────────────────────── */}
        <div style={{ display: tab === "eudr" ? undefined : "none" }}>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "14px 0 8px" }}>
            Reglamento (UE) 2023/1115. Este cuestionario determina la «Visa» EUDR del predio, que sus lotes heredan como «Sello».
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "6px 0 16px" }}>
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

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>
              El predio presenta deforestación posterior al 31/12/2020
              <FieldInfo text="El EUDR exige que la respuesta sea No — es la fecha de corte del reglamento y no admite excepciones. 'No sé' no es una respuesta válida: si no tiene certeza, reúna la evidencia (fecha de siembra, fotos históricas, verificación satelital) antes de declarar, ya que una respuesta 'Sí' o sin sustento bloquea la exportación de este predio bajo EUDR." />
            </label>
            {/* Pregunta formulada en POSITIVO sobre el hecho (¿hay deforestación?),
                así que la respuesta buena es "No" (verde, goodAnswer={false}). El
                dato guardado NO cambia de sentido: eudr_deforestation_free sigue
                siendo true = libre de deforestación — aquí solo se invierte la
                presentación (valor mostrado = negación del campo). */}
            <EudrYesNo
              value={eudr.eudrDeforestationFree == null ? null : !eudr.eudrDeforestationFree}
              onChange={(v) => patchEudr({ eudrDeforestationFree: !v })}
              goodAnswer={false}
            />
          </div>
          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>
              Producción realizada en áreas legalmente establecidas
              <FieldInfo text="El EUDR exige que la respuesta sea Sí — el predio debe cumplir con la legislación colombiana aplicable (uso del suelo, tenencia de la tierra, laboral, ambiental, tributaria, de derechos de comunidades). 'No sé' no es una respuesta válida: verifique con las autoridades locales o su documento de respaldo antes de declarar." />
            </label>
            <EudrYesNo value={eudr.eudrLegalProduction} onChange={(v) => patchEudr({ eudrLegalProduction: v })} />
          </div>

          {/* País implícito: una finca del sistema está en Colombia => riesgo estándar. */}
          <p style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, margin: "6px 0 16px" }}>
            País / región de producción: <b style={{ color: "var(--ink)" }}>Colombia</b> · clasificación EUDR <RiskPill level="Estándar" />
          </p>

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>
              Método de separación física / documental
              <FieldInfo text={`${EUDR_INFO.separacion} Con el CTC Parchment Storage Standard le ayudamos a tener un mejor estándar: la separación física y documental queda resuelta de una vez.`} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label className={styles.chip}>
                <input type="radio" name="eudr_custody_method" checked={eudr.eudrCustodyMethod === "ctc_standard"} onChange={() => patchEudr({ eudrCustodyMethod: "ctc_standard" })} />{" "}
                CTC Parchment Storage Standard
                <FieldInfo text={EUDR_INFO.ctcStandard} />
              </label>
              <label className={styles.chip}>
                <input type="radio" name="eudr_custody_method" checked={eudr.eudrCustodyMethod === "custom"} onChange={() => patchEudr({ eudrCustodyMethod: "custom" })} />{" "}
                Método propio
              </label>
            </div>
            {eudr.eudrCustodyMethod === "ctc_standard" && (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                ✓ Sacos de yute con liner hermético, tarjeta indicadora de humedad (HIC) y código QR vinculado al código CTC — la separación física y documental queda cubierta por el estándar.
              </p>
            )}
            {eudr.eudrCustodyMethod === "custom" && (
              <textarea
                style={{ marginTop: 8, width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontFamily: "var(--font-instrument-sans),sans-serif", fontSize: 13, background: "var(--paper)", minHeight: 70, resize: "vertical" }}
                value={eudr.eudrCustodyNotes}
                onChange={(e) => patchEudr({ eudrCustodyNotes: e.target.value })}
                placeholder="Describa su método: sacos etiquetados por lote, registro de báscula, separación en bodega…"
              />
            )}
          </div>

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>Cadena de custodia<FieldInfo text={EUDR_INFO.custodia} /></label>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 6px" }}>Confirme las etapas por las que pasa el café de esta finca.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CUSTODY_STAGES.map(([key, label]) => (
                <label key={key} className={styles.chip}>
                  <input type="checkbox" checked={eudr.eudrCustodyStages.includes(key)} onChange={(e) => toggleCustodyStage(key, e.target.checked)} />{" "}
                  {label}
                </label>
              ))}
            </div>
            <p style={{ fontSize: 12.5, marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              Complejidad de la cadena (se calcula sola, {eudr.eudrCustodyStages.length} etapa{eudr.eudrCustodyStages.length === 1 ? "" : "s"}):
              <RiskPill level={chainComplexity} />
              <FieldInfo text={EUDR_INFO.complejidad} />
            </p>
          </div>

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>Riesgo propio del producto (café)<FieldInfo text={EUDR_INFO.riesgoProducto} /></label>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 6px" }}>
              Marque las situaciones que apliquen. Cada una diluye el origen o rompe la trazabilidad — el nivel se calcula solo.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {PRODUCT_RISK_QUESTIONS.map(([key, label]) => (
                <label key={key} style={{ display: "inline-flex", gap: 8, fontSize: 13, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={eudr.eudrProductRiskFactors.includes(key)} onChange={(e) => toggleProductFactor(key, e.target.checked)} style={{ width: 16, flex: "none", marginTop: 2 }} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              Riesgo del producto: <RiskPill level={productRisk} />
            </p>
          </div>

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>Esquemas de certificación / verificación<FieldInfo text={EUDR_INFO.certificacion} /></label>
            <input
              value={eudr.eudrCertScheme}
              onChange={(e) => patchEudr({ eudrCertScheme: e.target.value })}
              placeholder="Ej. Rainforest Alliance, orgánico, Fairtrade… (opcional)"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontFamily: "var(--font-spline-mono),monospace", fontSize: 13, background: "var(--paper)" }}
            />
          </div>

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>¿Indicios de ilegalidad, deforestación o degradación en la cadena?<FieldInfo text={EUDR_INFO.indicios} /></label>
            <EudrYesNo value={eudr.eudrIllegalityIndicators} onChange={(v) => patchEudr({ eudrIllegalityIndicators: v })} siLabel="Sí, hay indicios" noLabel="No hay indicios" goodAnswer={false} />
          </div>
          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>¿Documentos disponibles y verificables de inmediato?<FieldInfo text={EUDR_INFO.documentos} /></label>
            <EudrYesNo value={eudr.eudrDocsAvailable} onChange={(v) => patchEudr({ eudrDocsAvailable: v })} />
          </div>

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>Nivel de riesgo determinado<FieldInfo text={EUDR_INFO.nivelRiesgo} /></label>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: fincaRiskLevel === "no_insignificante" ? "var(--red)" : "var(--ink)" }}>
              {fincaRiskLevel === "insignificante"
                ? "Insignificante"
                : fincaRiskLevel === "no_insignificante"
                ? "No insignificante"
                : "Pendiente — responda «indicios» y «documentos» arriba"}
            </p>
          </div>

          {fincaRiskLevel === "no_insignificante" && (
            <div style={{ background: "var(--paper-2, #faf6ec)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--red)", margin: "0 0 8px" }}>
                Riesgo no insignificante: la mitigación es obligatoria antes de que el predio obtenga su Visa.
                <FieldInfo text={EUDR_INFO.mitigacion} />
              </p>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Acciones de mitigación adoptadas</label>
              <textarea
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontFamily: "var(--font-instrument-sans),sans-serif", fontSize: 13, background: "var(--paper)", minHeight: 70, resize: "vertical" }}
                value={eudr.eudrMitigationActions}
                onChange={(e) => patchEudr({ eudrMitigationActions: e.target.value })}
                placeholder="Geolocalización adicional, auditoría independiente, cambio de proveedor, verificación en campo…"
              />
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Describa lo que hizo para mitigar el riesgo. CTC evaluará si la mitigación lo reduce a insignificante y registrará al responsable de esa determinación.
              </p>
            </div>
          )}

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>
              Infraestructura local
              <FieldInfo text="Marque la infraestructura y maquinaria propia disponible en esta finca o cerca de ella. Cada elemento tiene una ⓘ que explica para qué sirve. Ayuda a evidenciar la capacidad de procesamiento y la trazabilidad de sus cafés." />
            </label>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 6px" }}>Seleccione todo lo que tenga disponible.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LOCAL_INFRA.map(([key, label, info]) => (
                <label key={key} className={styles.chip}>
                  <input
                    type="checkbox"
                    checked={eudr.eudrLocalInfra.includes(key)}
                    onChange={(e) => patchEudr({ eudrLocalInfra: e.target.checked ? [...eudr.eudrLocalInfra, key] : eudr.eudrLocalInfra.filter((k) => k !== key) })}
                  />{" "}
                  {label}
                  <FieldInfo text={info} />
                </label>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
            La evidencia de no deforestación, las áreas de legislación verificadas y el enfoque de sostenibilidad los completa CTC como parte de su propia revisión — no requieren acción suya aquí.
          </p>
        </div>
      </div>

      {/* Floating save: always visible bottom-right, a diskette that expands to
          its label on hover/focus. */}
      <button className={styles.fab} onClick={() => save()} disabled={saving} aria-label="Guardar finca">
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
