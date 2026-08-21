"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { useAutosave, AutosaveChip } from "@/lib/useAutosave";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import { FileDrop } from "./FileDrop";
import { fincaReferencePoint, lookupElevation } from "@/lib/geo/elevation";
import { polygonAreaHa } from "@/lib/geo/area";
import { Modal } from "@/components/Modal";
import { checkFileSizeMb } from "@/lib/fileSize";
import { fincaEudrStatus, deriveChainComplexity, deriveProductRisk, deriveFincaRiskLevel, PRODUCT_RISK_AFFIRMATIONS, type ParcelaGeoFields } from "@/lib/eudr";
import { fincaLevelSchemes, CERT_REGISTRY } from "@/lib/certRegistry";
import { EudrYesNo } from "./EudrYesNo";
import { EudrStatusBadge } from "./EudrStatusBadge";
import { FincaMapPicker } from "./FincaMapPicker";
import { FieldInfo } from "./ficha/panes/FieldInfo";
import { ORIGIN_CERTS, INTL_CERTS, CERT_INFO } from "./ficha/fichaData";
import { fincaCode, LOCAL_INFRA, type Finca, type FincaCertificate, type GeneralInfo, type Parcela } from "./data";
import styles from "./FincaModal.module.css";

// Etiqueta humana de cada esquema del catálogo (A3 + A4 de la Ficha).
const SCHEME_LABEL: Record<string, string> = Object.fromEntries([
  ...ORIGIN_CERTS,
  ...INTL_CERTS.map(([key, , label]) => [key, label] as [string, string]),
]);

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

// Infraestructura local, agrupada POR ETAPA del proceso (2026-07-29). Son 18
// elementos: como una sola fila de chips era una mancha ilegible, se muestran
// en tarjetas seleccionables agrupadas por el momento en que el café las toca —
// así el productor recorre su propia finca de arriba abajo en vez de buscar
// palabras sueltas. Las claves son las de LOCAL_INFRA (data.ts), que sigue
// siendo la fuente única de etiquetas y explicaciones.
const INFRA_GROUPS: [string, string, string[]][] = [
  ["Vivero y campo", "🌱", ["semillero", "tractor"]],
  ["Beneficio húmedo", "💧", ["flotado", "lavado", "beneficio", "fermentadores"]],
  ["Secado", "☀️", ["patios", "marquesinas", "guardiolas", "silos"]],
  ["Trilla y clasificación", "⚙️", ["trilladora", "monitor_mallas", "optica"]],
  ["Almacenamiento y empaque", "📦", ["acopio", "vacio"]],
  ["Transformación", "🔥", ["tostadora", "molino", "empacadora_consumible"]],
];

// Textos guía anclados en la Guía de la Comisión Europea (Reglamento (UE) 2023/1115).
const EUDR_INFO = {
  custodia:
    "Marque cada etapa física por la que pasa el café de esta finca entre el predio y la exportación. Entre más procesadores e intermediarios haya en el camino, mayor es el riesgo de mezcla con café de origen desconocido — una cadena corta y bien separada facilita demostrar riesgo insignificante (Guía CE, Art. 10(2)(i)).",
  separacion:
    "El EUDR no acepta mezcla de café de origen conocido con desconocido, ni contabilidad de balance de masas: el café físico debe poder conectarse con esta finca. Describa cómo se mantiene separado e identificado, o use el estándar de CTC.",
  ctcStandard:
    "Estándar CTC de Almacenamiento de Pergamino (CTC Parchment Storage Standard): el pergamino se almacena en sacos de yute/fique con bolsa interior hermética (liner tipo GrainPro) que protege el grano de humedad y olores. Cada saco lleva una tarjeta indicadora de humedad (HIC) y un código QR único vinculado al código CTC del lote, que conecta el saco físico con su finca de origen y su expediente EUDR — la separación física y documental queda cubierta de una vez.",
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
// /ocp/fincas as part of their own review, not self-declared by the
// producer) -- see EudrDraft below, which only covers what the producer
// still edits here. Their values round-trip on save; the producer can't see
// or change them from here. Since 2026-08-06 they no longer feed
// fincaEudrStatus() either: they document CTC's review, they don't gate the
// Visa (a BCP-only field can't count as a gap in the producer's declaration).
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

// F1 (2026-07-29): parcelas y certificados viajan como props ya filtrados por
// finca, con CRUD inmediato por fila (fuera del autosave — ver KaffetalExperience).
type ParcelaDraft = { id?: string; fincaId: string; name: string; areaHa: string; lat: string; lng: string; polygon: { lat: number; lng: number }[] | null };
type CertDraft = { id?: string; fincaId: string; scheme: string; certNumber: string; validFrom: string; validTo: string; holderNote: string };

type FincaModalExtras = {
  parcelas: Parcela[];
  certificates: FincaCertificate[];
  onSaveParcela: (draft: ParcelaDraft) => Promise<boolean>;
  onDeleteParcela: (id: string) => Promise<boolean>;
  onSaveCert: (draft: CertDraft) => Promise<boolean>;
  onDeleteCert: (id: string) => Promise<boolean>;
  onUploadCertSupport: (certId: string, fincaId: string, file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
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
  ...extras
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
} & FincaModalExtras) {
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
          {...extras}
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
  parcelas,
  certificates,
  onSaveParcela,
  onDeleteParcela,
  onSaveCert,
  onDeleteCert,
  onUploadCertSupport,
}: {
  finca: Finca | null;
  gi: GeneralInfo;
  onSave: (f: Finca) => Promise<boolean>;
  onRequestHelp: (f: Finca, text: string) => Promise<boolean>;
  onUploadPhoto: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  onUploadVideo: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  onUploadLegalDoc: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
} & FincaModalExtras) {
  const { showToast } = useToast();

  const defaultDepto = finca?.depto && finca.depto !== "—" ? finca.depto : gi.department || "Santander";

  // TODOS los campos son estado controlado (2026-07-29). Vereda, municipio,
  // departamento, historia y características vivían en refs para ahorrar
  // re-renders, y eso causó una PÉRDIDA DE DATOS SILENCIOSA en cuanto se añadió
  // el flush-al-desmontar del autosave: React suelta las refs ANTES de correr
  // la limpieza de los efectos, así que el guardado de salida leía
  // `veredaRef.current` = null y escribía "—" (→ null en la base) encima de lo
  // que el productor ya tenía. Reproducido en vivo: abrir la finca, cambiar solo
  // «Tipo de documento», cerrar ⇒ vereda, municipio, historia y características
  // BORRADAS. Con estado no hay refs que soltar y el flush guarda lo que se ve.
  const [name, setName] = useState(finca?.name ?? "");
  const [vereda, setVereda] = useState(finca?.vereda && finca.vereda !== "—" ? finca.vereda : "");
  const [mun, setMun] = useState(finca?.mun && finca.mun !== "—" ? finca.mun : "");
  const [depto, setDepto] = useState(defaultDepto);
  const [hist, setHist] = useState(finca?.hist && finca.hist !== "—" ? finca.hist : "");
  const [carac, setCarac] = useState(finca?.carac && finca.carac !== "—" ? finca.carac : "");
  const [ha, setHa] = useState(finca?.ha ?? "");
  // Altura (msnm): el productor la trae del mapa con un botón (centro del
  // polígono si lo hay; si no, el punto marcado) vía la Elevation API de
  // Open-Meteo (sin clave, CORS abierto), o la escribe a mano. altFrom recuerda
  // de dónde salió el último valor traído; altErr marca un fallo de consulta.
  const [alt, setAlt] = useState(finca?.alt && finca.alt !== "—" ? finca.alt : "");
  const [altFrom, setAltFrom] = useState<"polygon" | "point" | null>(null);
  const [altBusy, setAltBusy] = useState(false);
  // «Estoy aquí»: el GPS del dispositivo marcando el punto del cafetal.
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [geoPrecision, setGeoPrecision] = useState<number | null>(null);
  const [altErr, setAltErr] = useState(false);
  // Área (ha): mismo trato que la altura — se calcula del polígono dibujado con
  // un botón explícito, nunca sola. areaFromPoly marca que el valor que se ve
  // salió de la geometría (y deja de marcarlo en cuanto el productor lo edita,
  // porque el área SEMBRADA puede ser menor que el predio delimitado).
  const [areaFromPoly, setAreaFromPoly] = useState(false);
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

  // ── «Estoy aquí»: el punto sale del GPS, no del pulso ─────────────────────
  // `enableHighAccuracy` porque esto es evidencia de geolocalización EUDR y la
  // red móvil sola puede errar cientos de metros; 20 s de tope porque bajo los
  // árboles el primer arreglo tarda; `maximumAge:0` para que no devuelva la
  // posición de la finca anterior guardada en caché.
  function usarUbicacionActual() {
    if (geoBusy) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Este dispositivo no permite ubicación automática. Marque el punto a mano en el mapa.");
      return;
    }
    setGeoBusy(true);
    setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // 6 decimales ≈ 11 cm: más dígitos son ruido del sensor, no precisión.
        patchEudr({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        setGeoPrecision(pos.coords.accuracy ?? null);
        setGeoBusy(false);
      },
      (err) => {
        setGeoBusy(false);
        setGeoPrecision(null);
        // Un mensaje por causa: «no se pudo» no le dice a nadie qué hacer.
        setGeoErr(
          err.code === err.PERMISSION_DENIED
            ? "Su navegador no dio permiso de ubicación. Actívelo para este sitio, o marque el punto a mano en el mapa."
            : err.code === err.TIMEOUT
              ? "El GPS tardó demasiado. Salga a cielo abierto e inténtelo otra vez, o marque el punto a mano."
              : "No se pudo obtener su ubicación. Marque el punto a mano en el mapa."
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

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
  // F1: la completitud geográfica del preview se juzga por PARCELAS — la 1 sale
  // del borrador (el mapa de este modal ES la parcela 1) y las demás de props.
  const extraParcelas = parcelas.filter((p) => p.position > 0).sort((a, b) => a.position - b.position);

  // Área desde la geometría: pura geometría, sin red (a diferencia de la altura,
  // que sí consulta un servicio). El campo guarda el TOTAL de la finca, así que
  // el cálculo es: polígono del Cafetal 1 (el mapa de esta pestaña) + las áreas
  // declaradas de los cafetales adicionales. Con un solo cafetal, finca y
  // parcela son la misma superficie y el total ES el polígono. Igual que la
  // altura, el botón REESCRIBE el campo (2026-08-06, pedido del owner — la
  // versión anterior lo deshabilitaba con cafetales adicionales y se leía como
  // roto); el productor puede ajustar el número después si sembró menos.
  const polyArea = polygonAreaHa(eudr.eudrPolygon);
  const extrasAreas = extraParcelas.map((p) => (p.areaHa.trim() ? Number(p.areaHa.replace(",", ".")) : NaN));
  const extrasArea = Math.round(extrasAreas.reduce((s, n) => s + (isNaN(n) ? 0 : n), 0) * 100) / 100;
  const extrasSinArea = extrasAreas.filter((n) => isNaN(n)).length;
  const totalPolyArea = polyArea != null ? Math.round((polyArea + extrasArea) * 100) / 100 : null;
  function pullArea() {
    if (totalPolyArea == null) return;
    setHa(String(totalPolyArea));
    setAreaFromPoly(true);
  }

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
  const haNum = Number(ha.replace(",", "."));
  // Con parcelas adicionales, el área de la parcela 1 es la suya propia (la
  // finca guarda el TOTAL); con una sola, el área de la finca es la de la parcela.
  const parcelaUno = parcelas.find((p) => p.position === 0);
  const parcelaUnoArea =
    extraParcelas.length > 0 && parcelaUno?.areaHa.trim()
      ? Number(parcelaUno.areaHa.replace(",", "."))
      : !isNaN(haNum) && ha.trim()
        ? haNum
        : null;
  const previewParcelas: ParcelaGeoFields[] = [
    {
      areaHa: parcelaUnoArea,
      hasPoint: eudr.lat.trim() !== "" && eudr.lng.trim() !== "",
      hasPolygon: (eudr.eudrPolygon?.length ?? 0) >= 3,
    },
    ...extraParcelas.map((p) => ({
      areaHa: p.areaHa.trim() ? Number(p.areaHa.replace(",", ".")) : null,
      hasPoint: p.lat !== "" && p.lng !== "",
      hasPolygon: (p.polygon?.length ?? 0) >= 3,
    })),
  ];
  const eudrStatus = fincaEudrStatus(previewFinca, previewParcelas);
  const needsPolygon = !isNaN(haNum) && haNum > 4;

  // Which of the four tabs is showing. All four panels stay mounted (toggled by
  // `display`) so nothing remounts —y por tanto nada se reinicia— al cambiar de
  // pestaña con trabajo a medio hacer.
  const [tab, setTab] = useState<"general" | "ubicacion" | "eudr" | "certs">("general");

  // Los esquemas de certificación ya NO se escriben a mano en el cuestionario:
  // se derivan de las credenciales registradas en la pestaña 4 (una sola fuente
  // de verdad). Este resumen es lo que viaja a `eudr_cert_scheme`, que es lo que
  // leen el dossier de la Visa y el panel de BCP.
  const certSchemeSummary = certificates.map((c) => SCHEME_LABEL[c.scheme] ?? c.scheme).join(", ");

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
  // OJO con el sentido: la casilla se enuncia EN POSITIVO («el café se mantiene
  // separado…») pero lo que se guarda sigue siendo la lista de FACTORES DE
  // RIESGO. Marcar la afirmación = quitar el factor. Invertir aquí y no en la
  // base es lo que permite cambiar la redacción sin reinterpretar ni una sola
  // finca ya registrada. Ver PRODUCT_RISK_AFFIRMATIONS en lib/eudr.ts.
  function toggleProductAffirmation(key: string, cumple: boolean) {
    patchEudr({
      eudrProductRiskFactors: cumple
        ? eudr.eudrProductRiskFactors.filter((k) => k !== key)
        : [...new Set([...eudr.eudrProductRiskFactors, key])],
    });
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
      vereda: vereda.trim() || "—",
      mun: mun.trim() || "—",
      depto: depto || defaultDepto,
      alt: alt.trim() || "—",
      ha: ha.trim() || "—",
      hist: hist.trim() || "—",
      carac: carac.trim() || "—",
      videoAssetId: finca?.videoAssetId ?? null,
      videoUrl: finca?.videoUrl ?? null,
      profilePhotoAssetId: finca?.profilePhotoAssetId ?? null,
      profilePhotoUrl: finca?.profilePhotoUrl ?? null,
      requiresEudrPolygon: needsPolygon,
      eudrLegalDocsUrl: finca?.eudrLegalDocsUrl ?? null,
      eudrProducerAnswers: finca?.eudrProducerAnswers ?? null,
      ...eudr,
      // Derivado de la pestaña 4, nunca tecleado (ver certSchemeSummary).
      eudrCertScheme: certSchemeSummary,
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
  // finca nueva la crearía a medio escribir. Desde 2026-07-29 TODO el formulario
  // es estado controlado, así que el snapshot es literalmente lo que se ve: ya
  // no hace falta el contador `rev` que espiaba los onInput de los campos con
  // ref, y el flush-al-desmontar guarda valores reales en vez de refs sueltas.
  const { status: autosaveStatus } = useAutosave({
    enabled: !!finca?.id,
    snapshot: { name, vereda, mun, depto, hist, carac, ha, alt, eudr, certSchemeSummary },
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

      {/* Pestañas (reordenadas 2026-07-29, petición del owner): 1) identidad y
          papeles del predio · 2) todo lo que sale del mapa (área, altura,
          parcelas) · 3) el cuestionario de riesgo · 4) credenciales.
          Los cuatro paneles quedan MONTADOS (se ocultan con display) para que
          cambiar de pestaña nunca reinicie trabajo a medio hacer. */}
      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "general"} className={tab === "general" ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab("general")}>
          1 · Información general
        </button>
        <button type="button" role="tab" aria-selected={tab === "ubicacion"} className={tab === "ubicacion" ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab("ubicacion")}>
          2 · Ubicación y medidas
        </button>
        <button type="button" role="tab" aria-selected={tab === "eudr"} className={tab === "eudr" ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab("eudr")}>
          3 · Cuestionario EUDR {eudrTabPending && <span className={styles.tabDot} title="Faltan respuestas para determinar la Visa" />}
        </button>
        {/* F1: los certificados son CREDENCIALES de la finca (número + vigencia),
            no casillas del lote — nota "¿Finca o Lote?". Pestaña opcional. */}
        <button type="button" role="tab" aria-selected={tab === "certs"} className={tab === "certs" ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab("certs")}>
          4 · Certificaciones
        </button>
      </div>

      <div>
        {/* ── PANEL 1 · Información general ─────────────────────────────── */}
        <div style={{ display: tab === "general" ? undefined : "none" }}>
          <div className={styles.grid}>
            <div className={styles.wide}>
              <label>Nombre de la finca</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. La Primavera" autoFocus />
            </div>
            <div><label>Vereda</label><input value={vereda} onChange={(e) => setVereda(e.target.value)} placeholder="Ej. El Encanto" /></div>
            <div><label>Municipio</label><input value={mun} onChange={(e) => setMun(e.target.value)} placeholder="Ej. Piedecuesta" /></div>
            <div className={styles.wide}>
              <label>Departamento</label>
              <select value={depto} onChange={(e) => setDepto(e.target.value)}>
                {["Santander", "Huila", "Cauca", "Nariño", "Tolima", "Antioquia", "Quindío", "Caldas", "Otro"].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
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
            <div className={styles.wide}>
              <label>Fecha de establecimiento del cultivo</label>
              <input type="date" value={eudr.eudrPlantingDate} onChange={(e) => patchEudr({ eudrPlantingDate: e.target.value })} />
            </div>

            {/* ── Los papeles del predio (traídos de las pestañas 2 y 3 el
                2026-07-29) ─────────────────────────────────────────────────
                Tenencia, el documento que la respalda y la pregunta de si esos
                documentos están a la mano son UNA sola conversación: quién es
                el dueño y qué puede mostrar. Estaban repartidas entre el mapa y
                el cuestionario de riesgo, donde nadie las leía juntas. */}
            <div className={styles.wide}>
              <hr className={styles.sep} />
              <h4 className={styles.sectionTitle}>Titularidad y documentos</h4>
            </div>
            <div className={styles.wide}>
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
            <div className={styles.wide}>
              <label>
                Tipo de documento de respaldo
                <FieldInfo text="El documento que respalda la tenencia declarada arriba. Admite escritura, certificado de tradición y libertad, contrato de arrendamiento, acta de la asociación, o la documentación SICA (Registro SICA / cédula cafetera de la FNC). No es obligatorio para guardar la finca." />
              </label>
              <select value={eudr.eudrSupportDocType} onChange={(e) => patchEudr({ eudrSupportDocType: e.target.value })}>
                <option value="">Seleccione…</option>
                {SUPPORT_DOC_TYPES.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className={styles.wide}>
              <label>Documento de respaldo <small>(PDF, máx. 10 MB)</small></label>
              {finca ? (
                <>
                  <FileDrop onFile={(f) => handleDocFile(f)}>
                    <input type="file" accept="application/pdf" onChange={(e) => handleDocFile(e.target.files?.[0])} />
                    <UploadProgressRing state={docUp.state} />
                  </FileDrop>
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
            <div className={styles.wide}>
              <label>¿Documentos disponibles y verificables de inmediato?<FieldInfo text={EUDR_INFO.documentos} /></label>
              <EudrYesNo value={eudr.eudrDocsAvailable} onChange={(v) => patchEudr({ eudrDocsAvailable: v })} />
            </div>

            <div className={styles.wide}>
              <hr className={styles.sep} />
              <h4 className={styles.sectionTitle}>Su finca, contada</h4>
            </div>
            <div className={styles.wide}><label>Historia de la finca</label><textarea value={hist} onChange={(e) => setHist(e.target.value)} placeholder="Historia, microclima, comunidad…" /></div>
            <div className={styles.wide}><label>Características</label><input value={carac} onChange={(e) => setCarac(e.target.value)} placeholder="Sombrío, variedades sembradas, beneficio propio…" /></div>
            <div className={styles.wide}>
              <label>Foto de perfil de la finca <small>(máx. 5 MB)</small></label>
              {finca ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {finca.profilePhotoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                    <img src={finca.profilePhotoUrl} alt={finca.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" }} />
                  )}
                  <FileDrop onFile={(f) => handlePhotoFile(f)} style={{ display: "inline-flex" }}>
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
                    <UploadProgressRing state={photoUp.state} />
                  </FileDrop>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>Guarde la finca primero para poder subir su foto.</p>
              )}
            </div>
            <div className={styles.wide}>
              <label>Video de la finca <small>(máx. 100 MB)</small></label>
              {finca ? (
                <>
                  <FileDrop onFile={(f) => handleVideoFile(f)}>
                    <input type="file" accept="video/*" onChange={(e) => handleVideoFile(e.target.files?.[0])} />
                    <UploadProgressRing state={videoUp.state} />
                  </FileDrop>
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

        {/* ── PANEL 2 · Ubicación y medidas ─────────────────────────────
            Área y altura viven aquí desde el 2026-07-29 (petición del owner):
            las dos SALEN del mapa que está justo debajo, y el área además
            decide si el EUDR exige polígono. Tenerlas en la pestaña 1, a dos
            clics de la geometría que las produce, obligaba a ir y volver. */}
        <div style={{ display: tab === "ubicacion" ? undefined : "none" }}>
          <div className={styles.grid} style={{ marginBottom: 4 }}>
            <div>
              <label>
                Área en café (ha)
                <FieldInfo text="Superficie sembrada en café de este predio. Dibuje el polígono en el mapa de abajo y tóquele «Calcular del polígono» para traerla, o escríbala a mano: el área SEMBRADA puede ser menor que el predio delimitado. A partir de 4 ha el EUDR exige el polígono, no basta el punto." />
              </label>
              <div className={styles.fieldRow}>
                <input
                  value={ha}
                  onChange={(e) => {
                    setHa(e.target.value);
                    setAreaFromPoly(false); // editada a mano ⇒ ya no viene del polígono
                  }}
                  type="number"
                  step="0.1"
                  placeholder="3.5"
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={pullArea}
                  disabled={totalPolyArea == null}
                  title={
                    totalPolyArea != null
                      ? extraParcelas.length > 0
                        ? "Reescribir el campo con el total: polígono del Cafetal 1 + cafetales adicionales"
                        : "Reescribir el campo con el área del polígono dibujado en el mapa"
                      : needsPolygon
                        ? "Termine el polígono en el mapa de abajo para poder calcularla"
                        : "Escríbala a mano — con más de 4 ha el mapa le pedirá el polígono y podrá calcularla de ahí"
                  }
                >
                  Calcular del polígono 📐
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--muted)", margin: "3px 0 0" }}>
                {/* El área del polígono solo se puede traer cuando el polígono
                    está TERMINADO: mientras se dibuja, la forma ya se ve en el
                    mapa pero aún no es la geometría de la finca. Decirlo aquí
                    evita el «no funciona» de tocar un botón deshabilitado. */}
                {totalPolyArea == null
                  ? needsPolygon
                    ? "Dibuje el polígono en el mapa y toque «Terminar polígono» para poder calcularla, o escríbala a mano."
                    : "Escríbala a mano. Con más de 4 ha, el mapa le pedirá delimitar el polígono y podrá calcularla de ahí."
                  : areaFromPoly
                    ? extraParcelas.length > 0
                      ? `Calculada: Cafetal 1 (${polyArea} ha del polígono) + ${extraParcelas.length} cafetal(es) adicional(es) (${extrasArea} ha)${extrasSinArea > 0 ? ` — ${extrasSinArea} sin área definida, no incluido(s)` : ""}. Ajústela si sembró menos.`
                      : `Calculada del polígono (${eudr.eudrPolygon?.length ?? 0} vértices). Ajústela si sembró menos.`
                    : extraParcelas.length > 0
                      ? `El total medido es ${totalPolyArea} ha (polígono del Cafetal 1 + cafetales adicionales). Toque «Calcular del polígono» para usarla.`
                      : `El polígono dibujado mide ${polyArea} ha. Toque «Calcular del polígono» para usarla.`}
              </p>
            </div>
            <div>
              <label>
                Altura (msnm)
                <FieldInfo text="Tráigala del mapa con el botón «Traer del mapa»: usa el centro del polígono cuando lo hay (predios de más de 4 ha) o el punto marcado. También puede escribirla a mano si conoce el dato exacto." />
              </label>
              <div className={styles.fieldRow}>
                <input
                  value={alt}
                  onChange={(e) => {
                    setAlt(e.target.value);
                    setAltFrom(null); // editada a mano ⇒ ya no viene del mapa
                    setAltErr(false);
                  }}
                  type="number"
                  placeholder="1680"
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={pullAltitude}
                  disabled={!refPoint || altBusy}
                  title={refPoint ? "Traer la altura del punto/polígono registrado en el mapa" : "Marque primero la ubicación en el mapa de abajo"}
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
                          ? "Marque la ubicación en el mapa de abajo para poder traerla, o escríbala a mano."
                          : "Toque «Traer del mapa» o escríbala a mano."}
              </p>
            </div>
          </div>
          <div className={styles.wide} style={{ margin: "14px 0" }}>
            <label>
              {extraParcelas.length > 0
                ? `Parcela 1 · ${parcelaUno?.name ?? "Cafetal principal"}`
                : needsPolygon
                  ? "Polígono del cafetal (> 4 ha)"
                  : "Ubicación del cafetal"}
              <FieldInfo text="Para la UE, la unidad que cuenta es la PARCELA: cada cafetal (área continua de café) con su propia ubicación. Si todo su café crece en un solo cafetal, este mapa es todo lo que necesita. Un polígono no puede cubrir dos cafetales separados." />
            </label>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 6px" }}>
              {needsPolygon && extraParcelas.length === 0
                ? "Este cafetal supera las 4 ha: el EUDR exige delimitarlo con un polígono, no solo un punto."
                : "Marque el punto del cafetal en el mapa. Es la evidencia principal de geolocalización EUDR."}
            </p>

            {/* «Estoy aquí» (owner, 2026-08-20) ──────────────────────────────
                Pedido para el caso de >4 ha: quien está PARADO en la mitad de
                su predio no debería tener que encontrarse a sí mismo en un mapa
                satelital arrastrando con el dedo — el GPS del teléfono ya sabe
                dónde está, y con mejor precisión que el pulso de nadie sobre una
                pantalla de 5 pulgadas.
                Con polígono NO lo sustituye: el punto sigue siendo el centro
                declarado y el polígono se dibuja aparte; por eso el texto de
                abajo lo dice en vez de dejar creer que ya está todo hecho. */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, margin: "0 0 10px" }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={usarUbicacionActual}
                disabled={geoBusy}
                title="Usa el GPS de este dispositivo para marcar el punto donde usted está ahora"
              >
                {geoBusy ? "Buscando su ubicación…" : "📍 Estoy aquí · usar mi ubicación actual"}
              </button>
              <p style={{ fontSize: 11, color: geoErr ? "var(--red)" : "var(--muted)", margin: 0 }}>
                {geoErr
                  ? geoErr
                  : geoPrecision != null
                    ? `Ubicación tomada del GPS (precisión ±${Math.round(geoPrecision)} m).${needsPolygon ? " Falta dibujar el polígono: este punto es el centro, no el lindero." : " Compruébela en el mapa y ajústela si hace falta."}`
                    : needsPolygon
                      ? "Párese en la mitad del cafetal y tóquelo: marca el punto central. El polígono se dibuja aparte, abajo."
                      : "Párese en el cafetal y tóquelo, o marque el punto a mano en el mapa."}
              </p>
            </div>

            <FincaMapPicker
              lat={eudr.lat}
              lng={eudr.lng}
              polygon={eudr.eudrPolygon}
              needsPolygon={needsPolygon}
              onChangePoint={(lat, lng) => patchEudr({ lat, lng })}
              onChangePolygon={(polygon) => patchEudr({ eudrPolygon: polygon })}
            />
          </div>

          {/* F1: cafetales adicionales — una parcela por cada área de café
              separada. La parcela 1 es el mapa de arriba (se espeja al guardar). */}
          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>
              ¿Su café crece en varios cafetales separados?
              <FieldInfo text="Una finca puede tener varios cafetales que no se tocan entre sí (separados por potrero, bosque o carretera). La UE los cuenta uno a uno: cada cafetal separado necesita su propio punto — y su propio polígono si supera 4 ha." />
            </label>
            {finca ? (
              <ParcelasExtra
                fincaId={finca.id}
                extras={extraParcelas}
                onSave={onSaveParcela}
                onDelete={onDeleteParcela}
              />
            ) : (
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Guarde la finca primero para poder marcar cafetales adicionales.</p>
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
              <FieldInfo text={`${EUDR_INFO.separacion} Con el Estándar CTC de Almacenamiento de Pergamino le ayudamos a tener un mejor estándar: la separación física y documental queda resuelta de una vez.`} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* En español primero (owner, 2026-08-20). El nombre registrado
                  sigue siendo el inglés —así viaja en el expediente y en el
                  certificado del lote, que los lee un comprador europeo— pero
                  al caficultor que está eligiendo su método de separación hay
                  que decírselo en su idioma. El inglés queda como lo que es: el
                  nombre propio del estándar, entre paréntesis. */}
              <label className={styles.chip}>
                <input type="radio" name="eudr_custody_method" checked={eudr.eudrCustodyMethod === "ctc_standard"} onChange={() => patchEudr({ eudrCustodyMethod: "ctc_standard" })} />{" "}
                Estándar CTC de Almacenamiento de Pergamino
                <small style={{ color: "var(--muted)", fontWeight: 400 }}>(CTC Parchment Storage Standard)</small>
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
            <label>Trazabilidad de su café<FieldInfo text={EUDR_INFO.riesgoProducto} /></label>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 6px" }}>
              Marque lo que <b>sí</b> se cumple en su finca. Cada casilla marcada protege el origen de su café — el nivel de
              riesgo se calcula solo con lo que quede sin marcar.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {PRODUCT_RISK_AFFIRMATIONS.map(([key, label]) => (
                <label key={key} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={!eudr.eudrProductRiskFactors.includes(key)}
                    onChange={(e) => toggleProductAffirmation(key, e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              Riesgo del producto: <RiskPill level={productRisk} />
            </p>
          </div>

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            {/* Ya NO se teclea aquí (2026-07-29): la pestaña 4 registra cada
                certificado con número y vigencia, así que preguntar otra vez
                "¿qué esquemas tiene?" era pedir el mismo dato dos veces y
                abrir la puerta a que las dos respuestas se contradijeran. Este
                bloque muestra lo registrado y es lo que viaja al expediente. */}
            <label>Esquemas de certificación / verificación<FieldInfo text={EUDR_INFO.certificacion} /></label>
            {certificates.length > 0 ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {certificates.map((c) => (
                  <span key={c.id} className={styles.readChip}>
                    {SCHEME_LABEL[c.scheme] ?? c.scheme}
                    {c.verifiedByCtc ? " ✓" : ""}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 0" }}>Ninguno registrado.</p>
            )}
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>
              Se toman de la pestaña{" "}
              <button type="button" className={styles.linkBtn} onClick={() => setTab("certs")}>
                4 · Certificaciones
              </button>
              , donde cada uno lleva su número y su vigencia.
            </p>
          </div>

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>¿Indicios de ilegalidad, deforestación o degradación en la cadena?<FieldInfo text={EUDR_INFO.indicios} /></label>
            <EudrYesNo value={eudr.eudrIllegalityIndicators} onChange={(v) => patchEudr({ eudrIllegalityIndicators: v })} siLabel="Sí, hay indicios" noLabel="No hay indicios" goodAnswer={false} />
          </div>

          <div className={styles.wide} style={{ marginBottom: 14 }}>
            <label>Nivel de riesgo determinado<FieldInfo text={EUDR_INFO.nivelRiesgo} /></label>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: fincaRiskLevel === "no_insignificante" ? "var(--red)" : "var(--ink)" }}>
              {fincaRiskLevel === "insignificante"
                ? "Insignificante"
                : fincaRiskLevel === "no_insignificante"
                ? "No insignificante"
                : "Pendiente — falta responder alguna pregunta"}
            </p>
            {/* La disponibilidad de documentos se responde ahora en la pestaña 1
                (junto al documento de respaldo), pero SIGUE pesando aquí: es uno
                de los dos insumos de esta determinación. Se dice de dónde sale
                para que nadie la busque en esta pantalla. */}
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>
              Sale de «indicios» (arriba) y de{" "}
              <button type="button" className={styles.linkBtn} onClick={() => setTab("general")}>
                ¿Documentos disponibles y verificables de inmediato?
              </button>{" "}
              — hoy: {eudr.eudrDocsAvailable === true ? "sí" : eudr.eudrDocsAvailable === false ? "no" : "sin responder"}.
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
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 8px" }}>
              Seleccione todo lo que tenga disponible · {eudr.eudrLocalInfra.length} de {LOCAL_INFRA.length} marcados.
            </p>
            {/* Tarjetas agrupadas por etapa en vez de 18 chips en una sola fila
                (2026-07-29): el productor recorre su finca de arriba abajo. */}
            {INFRA_GROUPS.map(([groupLabel, icon, keys]) => (
              <div key={groupLabel} className={styles.infraGroup}>
                <p className={styles.infraGroupTitle}>
                  <span aria-hidden>{icon}</span> {groupLabel}
                </p>
                <div className={styles.infraGrid}>
                  {keys.map((key) => {
                    const entry = LOCAL_INFRA.find(([k]) => k === key);
                    if (!entry) return null;
                    const [, label, info] = entry;
                    const on = eudr.eudrLocalInfra.includes(key);
                    return (
                      <label key={key} className={on ? `${styles.infraCard} ${styles.infraCardOn}` : styles.infraCard}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            patchEudr({
                              eudrLocalInfra: e.target.checked
                                ? [...eudr.eudrLocalInfra, key]
                                : eudr.eudrLocalInfra.filter((k) => k !== key),
                            })
                          }
                        />
                        <span className={styles.infraCardLabel}>{label}</span>
                        <FieldInfo text={info} />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
            La evidencia de no deforestación, las áreas de legislación verificadas y el enfoque de sostenibilidad los completa CTC como parte de su propia revisión — no requieren acción suya aquí.
          </p>
        </div>

        {/* ── PANEL 4 · Certificaciones (F1) ───────────────────────────── */}
        <div style={{ display: tab === "certs" ? undefined : "none" }}>
          <div className={styles.wide} style={{ margin: "14px 0" }}>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}>
              Registre aquí los certificados que <b>su finca u organización ya tiene</b>: número y vigencia (y el PDF si lo tiene a mano).
              Con ellos, cada café que salga de esta finca podrá presumir el sello ante el comprador.
            </p>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px", fontStyle: "italic" }}>
              No tener certificados <b>no le impide exportar</b> — la normativa europea (EUDR) no los exige.
            </p>
            {/* La pregunta del owner (2026-07-29): ¿la vigencia es obligatoria?
                Para REGISTRAR no — se puede guardar solo con el esquema. Para
                que el certificado RESPALDE un sello en un café sí, porque la
                prueba es temporal: la cosecha del lote tiene que caer dentro de
                la vigencia (F2, deriveClaims). Se dice aquí en una frase en vez
                de dejar al productor descubrirlo cuando su sello no aparece. */}
            <p className={styles.noteBox}>
              <b>Sobre las fechas:</b> puede registrar un certificado sin ellas y quedará guardado. Pero el sello solo viaja con
              un café cuando la <b>cosecha de ese lote cae dentro de la vigencia</b> del certificado — sin fechas no hay forma de
              probarlo, y el café sale sin sello. Si tiene el documento a la mano, cópielas ahora.
            </p>
            {finca ? (
              <FincaCerts
                fincaId={finca.id}
                certificates={certificates}
                onSave={onSaveCert}
                onDelete={onDeleteCert}
                onUploadSupport={onUploadCertSupport}
              />
            ) : (
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Guarde la finca primero para poder registrar sus certificados.</p>
            )}
          </div>
        </div>
      </div>

      {/* La botonera, PEGADA AL PIE DEL POP-UP (2026-08-20).
          Iba `position:fixed` en la esquina del VIEWPORT: flotaba por encima
          del propio formulario y le comía la última fila —el mismo defecto que
          en la Ficha, donde tapaba «Completar … y continuar»—. Como `.modal`
          desplaza por dentro (`overflow:auto`), un `position:sticky` la deja
          siempre a la vista SIN salirse del pop-up y, al ocupar su sitio en el
          flujo, ya no hay nada debajo que tapar. Apiladas en vertical contra la
          derecha, que es la regla de la casa. */}
      <div className={styles.fabDock}>
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
        {finca && (
          <button className={styles.fabHelp} onClick={() => setHelpOpen((v) => !v)} aria-label="Pedir ayuda a CTC">
            <span className={styles.fabIcon} aria-hidden>💬</span>
            <span className={styles.fabLabel}>Ayuda</span>
          </button>
        )}
        <button className={styles.fab} onClick={() => save()} disabled={saving} aria-label="Guardar finca">
          <span className={styles.fabIcon} aria-hidden>💾</span>
          <span className={styles.fabLabel}>{saving ? "Guardando…" : "Guardar Finca"}</span>
        </button>
      </div>

      {flash && (
        <div className={styles.flash} role="status" aria-live="polite">
          <span>✓ Datos de Finca Actualizados</span>
        </div>
      )}
    </>
  );
}

// ── F1 · Cafetales adicionales (parcelas 2..N) ───────────────────────────────
// Un editor expandido a la vez: cada cafetal adicional tiene su propio borrador
// y su propio FincaMapPicker, y se guarda INMEDIATO por fila (fuera del
// autosave del modal, para no tejer dos ciclos de guardado).
function ParcelasExtra({
  fincaId,
  extras,
  onSave,
  onDelete,
}: {
  fincaId: string;
  extras: Parcela[];
  onSave: (draft: ParcelaDraft) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [openId, setOpenId] = useState<string | null>(null); // "new" | parcela id
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {extras.map((p, i) => (
        <ParcelaCard
          key={p.id}
          index={i + 2}
          parcela={p}
          fincaId={fincaId}
          open={openId === p.id}
          onToggle={() => setOpenId(openId === p.id ? null : p.id)}
          onSave={onSave}
          onDelete={onDelete}
        />
      ))}
      {openId === "new" ? (
        <ParcelaCard
          index={extras.length + 2}
          parcela={null}
          fincaId={fincaId}
          open
          onToggle={() => setOpenId(null)}
          onSave={async (d) => {
            const ok = await onSave(d);
            if (ok) setOpenId(null);
            return ok;
          }}
          onDelete={onDelete}
        />
      ) : (
        <button type="button" className="btn btn-sm" style={{ justifySelf: "start" }} onClick={() => setOpenId("new")}>
          + Agregar otro cafetal
        </button>
      )}
    </div>
  );
}

function ParcelaCard({
  index,
  parcela,
  fincaId,
  open,
  onToggle,
  onSave,
  onDelete,
}: {
  index: number;
  parcela: Parcela | null; // null = nueva
  fincaId: string;
  open: boolean;
  onToggle: () => void;
  onSave: (draft: ParcelaDraft) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(parcela?.name ?? "Cafetal " + index);
  const [areaHa, setAreaHa] = useState(parcela?.areaHa ?? "");
  const [lat, setLat] = useState(parcela?.lat ?? "");
  const [lng, setLng] = useState(parcela?.lng ?? "");
  const [polygon, setPolygon] = useState<{ lat: number; lng: number }[] | null>(parcela?.polygon ?? null);
  const [busy, setBusy] = useState(false);
  const areaNum = Number(areaHa.replace(",", "."));
  const needsPolygon = !isNaN(areaNum) && areaNum > 4;
  const located = (lat.trim() !== "" && lng.trim() !== "") || (polygon?.length ?? 0) >= 3;
  const geoOk = located && (!needsPolygon || (polygon?.length ?? 0) >= 3);

  async function save() {
    if (busy) return;
    setBusy(true);
    await onSave({ id: parcela?.id, fincaId, name, areaHa, lat, lng, polygon });
    setBusy(false);
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13 }}>
          Parcela {index} · {parcela?.name ?? name}
        </b>
        <span style={{ fontSize: 11.5, color: geoOk ? "#2E7D52" : "var(--muted)" }}>
          {geoOk ? "✓ geolocalizada" : needsPolygon ? "falta el polígono (> 4 ha)" : located ? "revise el área" : "sin ubicar"}
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-sm" onClick={onToggle}>
          {open ? "Cerrar" : "Editar"}
        </button>
        {parcela && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: "var(--red)", borderColor: "var(--red)" }}
            onClick={() => {
              if (window.confirm("¿Eliminar \"" + parcela.name + "\"? Su geometría se pierde.")) void onDelete(parcela.id);
            }}
          >
            Eliminar
          </button>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 190px", gap: 10 }}>
            <div>
              <label>Nombre del cafetal</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={"Cafetal " + index} />
            </div>
            <div>
              <label>Área (ha)</label>
              <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                <input value={areaHa} onChange={(e) => setAreaHa(e.target.value)} type="number" step="0.1" placeholder="1.5" style={{ flex: 1, minWidth: 0 }} />
                {/* Mismo gesto que en la finca: el polígono ya dibujado sabe
                    cuánto mide, no hay por qué medirlo otra vez a ojo. */}
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    const a = polygonAreaHa(polygon);
                    if (a != null) setAreaHa(String(a));
                  }}
                  disabled={polygonAreaHa(polygon) == null}
                  title={polygonAreaHa(polygon) != null ? "Calcular el área del polígono dibujado" : "Dibuje primero el polígono"}
                  style={{ flex: "none" }}
                >
                  📐
                </button>
              </div>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 6px" }}>
              {needsPolygon
                ? "Este cafetal supera las 4 ha: delimítelo con su propio polígono."
                : "Marque el punto de ESTE cafetal (no el de la casa ni el del cafetal principal)."}
            </p>
            <FincaMapPicker
              lat={lat}
              lng={lng}
              polygon={polygon}
              needsPolygon={needsPolygon}
              onChangePoint={(la, lo) => {
                setLat(la);
                setLng(lo);
              }}
              onChangePolygon={setPolygon}
            />
          </div>
          <div>
            <button type="button" className="btn btn-sm btn-solid" onClick={save} disabled={busy}>
              {busy ? "Guardando…" : parcela ? "Guardar cafetal" : "Agregar cafetal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── F1 · Certificaciones de la finca ─────────────────────────────────────────
// Credenciales con número + vigencia (nota "¿Finca o Lote?"): el catálogo sale
// de certRegistry (solo niveles finca/org — la DDS EUDR y los premios son del
// lote, y las membresías tipo IWCA son narrativa, no certificado).
function FincaCerts({
  fincaId,
  certificates,
  onSave,
  onDelete,
  onUploadSupport,
}: {
  fincaId: string;
  certificates: FincaCertificate[];
  onSave: (draft: CertDraft) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onUploadSupport: (certId: string, fincaId: string, file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
}) {
  const [adding, setAdding] = useState(false);
  const schemes = fincaLevelSchemes();
  const available = schemes.filter(([key]) => !certificates.some((c) => c.scheme === key));
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {certificates.map((c) => (
        <CertCard key={c.id} cert={c} fincaId={fincaId} onSave={onSave} onDelete={onDelete} onUploadSupport={onUploadSupport} />
      ))}
      {certificates.length === 0 && !adding && (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>Aún no ha registrado certificados para esta finca.</p>
      )}
      {adding ? (
        <CertEditor
          fincaId={fincaId}
          cert={null}
          schemes={available}
          onCancel={() => setAdding(false)}
          onSave={async (d) => {
            const ok = await onSave(d);
            if (ok) setAdding(false);
            return ok;
          }}
        />
      ) : (
        available.length > 0 && (
          <button type="button" className="btn btn-sm" style={{ justifySelf: "start" }} onClick={() => setAdding(true)}>
            + Registrar certificado
          </button>
        )
      )}
    </div>
  );
}

function CertCard({
  cert,
  fincaId,
  onSave,
  onDelete,
  onUploadSupport,
}: {
  cert: FincaCertificate;
  fincaId: string;
  onSave: (draft: CertDraft) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onUploadSupport: (certId: string, fincaId: string, file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const up = useUpload();
  const reg = CERT_REGISTRY[cert.scheme];
  const label = SCHEME_LABEL[cert.scheme] ?? cert.scheme;
  const hasValidity = cert.validFrom !== "" && cert.validTo !== "";
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13 }}>{label}</b>
        {cert.verifiedByCtc ? (
          <span style={{ fontSize: 11.5, color: "#2E7D52" }}>✓ verificado por CTC</span>
        ) : hasValidity ? (
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
            declarado · vigencia {cert.validFrom} → {cert.validTo}
          </span>
        ) : (
          <span style={{ fontSize: 11.5, color: "#B45309" }}>sin vigencia — no respalda sellos</span>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-sm" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cerrar" : "Editar"}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          style={{ color: "var(--red)", borderColor: "var(--red)" }}
          onClick={() => {
            if (window.confirm("¿Eliminar el certificado \"" + label + "\"?")) void onDelete(cert.id);
          }}
        >
          Eliminar
        </button>
      </div>
      {cert.certNumber !== "" && !editing && (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>N.º {cert.certNumber}</p>
      )}
      {editing && (
        <div style={{ marginTop: 10 }}>
          <CertEditor
            fincaId={fincaId}
            cert={cert}
            schemes={reg ? [[cert.scheme, reg]] : []}
            onCancel={() => setEditing(false)}
            onSave={async (d) => {
              const ok = await onSave(d);
              if (ok) setEditing(false);
              return ok;
            }}
          />
        </div>
      )}

      {/* El soporte se sube SIEMPRE desde la tarjeta (2026-07-29). Antes vivía
          dentro del editor, así que había que registrar el certificado, volver
          a tocar «Editar» y recién ahí aparecía el campo — el productor decía,
          con razón, que no podía adjuntar nada. El campo necesita que la fila
          exista (la subida se cuelga de cert.id), y en la tarjeta ya existe. */}
      <FileDrop
        onFile={(file) => void up.run(() => onUploadSupport(cert.id, fincaId, file, up.progress))}
        style={{ marginTop: 8 }}
      >
        <label style={{ fontSize: 12, fontWeight: 600 }}>Soporte del certificado <small style={{ fontWeight: 400 }}>(PDF o imagen, opcional)</small></label>
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void up.run(() => onUploadSupport(cert.id, fincaId, file, up.progress));
          }}
        />
        <UploadProgressRing state={up.state} />
        {cert.supportFilename && <span style={{ fontSize: 12, color: "#2E7D52" }}>✓ {cert.supportFilename}</span>}
      </FileDrop>
      {reg && (
        <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "6px 0 0" }}>
          CTC lo contrasta contra:{" "}
          <a href={reg.url} target="_blank" rel="noopener noreferrer">
            {reg.registry}
          </a>
          {reg.note ? " — " + reg.note : ""}
        </p>
      )}
    </div>
  );
}

function CertEditor({
  fincaId,
  cert,
  schemes,
  onSave,
  onCancel,
}: {
  fincaId: string;
  cert: FincaCertificate | null;
  schemes: [string, (typeof CERT_REGISTRY)[string]][];
  onSave: (draft: CertDraft) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [scheme, setScheme] = useState(cert?.scheme ?? "");
  const [certNumber, setCertNumber] = useState(cert?.certNumber ?? "");
  const [validFrom, setValidFrom] = useState(cert?.validFrom ?? "");
  const [validTo, setValidTo] = useState(cert?.validTo ?? "");
  const [holderNote, setHolderNote] = useState(cert?.holderNote ?? "");
  const [busy, setBusy] = useState(false);
  const entry = scheme ? CERT_REGISTRY[scheme] : null;
  const badOrder = validFrom !== "" && validTo !== "" && validTo < validFrom;

  async function save() {
    if (!scheme || busy || badOrder) return;
    setBusy(true);
    await onSave({ id: cert?.id, fincaId, scheme, certNumber, validFrom, validTo, holderNote });
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gap: 10, border: cert ? undefined : "1px dashed var(--line)", borderRadius: 10, padding: cert ? 0 : "10px 12px" }}>
      {!cert && (
        <div>
          <label>Certificado</label>
          <select value={scheme} onChange={(e) => setScheme(e.target.value)}>
            <option value="">Seleccione…</option>
            {schemes.map(([key]) => (
              <option key={key} value={key}>
                {SCHEME_LABEL[key] ?? key}
              </option>
            ))}
          </select>
          {scheme && CERT_INFO[scheme] && <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "4px 0 0" }}>{CERT_INFO[scheme]}</p>}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label>
            N.º de certificado
            {entry && (entry.validate === "number" || entry.validate === "both") && (
              <FieldInfo text={"Este esquema se verifica por número contra el registro público (" + entry.registry + "). Escríbalo tal como aparece en el documento."} />
            )}
          </label>
          <input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="Como aparece en el documento" />
        </div>
        <div>
          <label>
            Vigente desde
            <FieldInfo text="Fecha de emisión o inicio de vigencia que aparece en el certificado. Sin las dos fechas el certificado queda registrado, pero ningún café podrá presumir su sello: la prueba es temporal — la cosecha del lote debe caer dentro de esta ventana." />
          </label>
          <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </div>
        <div>
          <label>Vigente hasta</label>
          <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
        </div>
      </div>
      {(validFrom === "" || validTo === "") && (
        <p style={{ fontSize: 11.5, color: "#B45309", margin: 0 }}>
          Sin las dos fechas puede guardarlo, pero no respaldará sellos en sus cafés.
        </p>
      )}
      {entry?.level === "org" && (
        <div>
          <label>
            Titular (organización)
            <FieldInfo text="Este esquema lo certifica una organización o grupo (cooperativa, asociación) y la finca participa como miembro. Escriba el nombre del titular del certificado." />
          </label>
          <input value={holderNote} onChange={(e) => setHolderNote(e.target.value)} placeholder="Ej. Cooperativa COOP-77" />
        </div>
      )}
      {badOrder && <p style={{ fontSize: 12, color: "var(--red)", margin: 0 }}>La fecha final no puede ser anterior a la inicial.</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-sm btn-solid" onClick={save} disabled={!scheme || busy || badOrder}>
          {busy ? "Guardando…" : cert ? "Guardar cambios" : "Registrar certificado"}
        </button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
