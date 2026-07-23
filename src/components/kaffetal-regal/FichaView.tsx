"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import { useAutosave, AutosaveChip } from "@/lib/useAutosave";
import { fincaEudrStatus, lotEudrStatus, resolveSourceFincas, countryRiskFor, deriveChainComplexity, deriveProductRisk } from "@/lib/eudr";
import { ctcLotReference, ctcLotReferenceShort, type Finca, type Lot } from "./data";
import { EMPTY_FICHA, num, B1_OPTIONAL_FIELDS, deriveCertSchemes, pendingCertProofs, stripUnprovenCerts, type FichaFormData } from "./ficha/fichaData";
import { computeFactor, computeMesh, computeSca, varietyTotal } from "./ficha/fichaCalculations";
import { FichaNav, type PaneId } from "./ficha/FichaNav";
import { PaneA1 } from "./ficha/panes/PaneA1";
import { PaneA2 } from "./ficha/panes/PaneA2";
import { PaneA3 } from "./ficha/panes/PaneA3";
import { PaneA4 } from "./ficha/panes/PaneA4";
import { PaneA5Eudr } from "./ficha/panes/PaneA5Eudr";
import { PaneB1 } from "./ficha/panes/PaneB1";
import { PaneB2 } from "./ficha/panes/PaneB2";
import { PaneB3 } from "./ficha/panes/PaneB3";
import { PaneB4 } from "./ficha/panes/PaneB4";
import { FichaPreview } from "./ficha/FichaPreview";
import { ShipmentInstructionsModal } from "./ficha/ShipmentInstructionsModal";
import { OfficialScoreBanner } from "./ficha/OfficialScoreBanner";
import styles from "./FichaView.module.css";

export type { PaneProps } from "./ficha/panes/types";

// Which FichaNav pane opens by default for each intake_step (0-4) -- the
// first not-yet-submitted pane in that sub-stage, or the final preview once
// everything is locked in.
const FIRST_PANE_BY_STEP: PaneId[] = ["a1", "a3", "a5", "b4", "ficha"];
const PANE_SUBSTAGE: Record<PaneId, number> = { a1: 0, a2: 0, b1: 0, a3: 1, a4: 1, b2: 1, b3: 1, a5: 2, b4: 3, ficha: 4 };
// FT2's four panes can each be declared "no lo sé / no aplica" instead of
// filled in -- see fichaData.ts's ft2_*_na fields and FichaView's ft2Ready gate.
const FT2_NA_FIELD: Partial<Record<PaneId, "ft2_a3_na" | "ft2_a4_na" | "ft2_b2_na" | "ft2_b3_na">> = {
  a3: "ft2_a3_na",
  a4: "ft2_a4_na",
  b2: "ft2_b2_na",
  b3: "ft2_b3_na",
};

export type FichaSaveUpdate = {
  name?: string;
  finca?: string;
  datasheet: FichaFormData;
  completionPct: number;
  // Autosave: no insertar el snapshot de completitud (alimenta la sparkline) —
  // un autoguardado cada pocos segundos inundaría ficha_completion_snapshots.
  skipSnapshot?: boolean;
  // Present only when this save also advances the intake sub-stage (i.e. a
  // "Completar X y continuar" click, not a plain "Guardar"). 4 is the last
  // one (Video) -- reaching it is what flips `lots.stage` to "ficha_completa".
  intakeStep?: number;
  summary: {
    ficha_variedad: string | null;
    ficha_proceso: string | null;
    ficha_altitud_m: number | null;
    ficha_notas_cata: string | null;
    ficha_puntaje_estimado: number | null;
  };
  // Real `lots` columns, not just the datasheet jsonb -- so BCP's review pages
  // can read/filter/edit them directly. See src/lib/eudr.ts. Deliberately
  // EXCLUDES eudr_risk_level / eudr_mitigation_effective /
  // eudr_mitigation_responsible: those are CTC's determinations (updateLotEudr)
  // and the producer's save must never touch them.
  eudr: {
    eudr_custody_stages: string[];
    eudr_custody_method: string | null;
    eudr_custody_notes: string | null;
    eudr_country: string | null;
    eudr_country_risk: string;
    eudr_chain_complexity: string | null;
    eudr_product_risk: string | null;
    eudr_product_risk_factors: string[];
    eudr_illegality_indicators: boolean | null;
    eudr_docs_available: boolean | null;
    eudr_cert_scheme: string | null;
    eudr_mitigation_actions: string | null;
  };
};

// Aviso centrado (compuerta bloqueada): aparece al centro con fade y se va
// solo. El timer vive aquí para que el overlay se auto-desmonte.
function CenterNotice({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={styles.noticeOverlay}>
      <div className={styles.notice} role="alert" onClick={onDone}>
        <b>Aún falta algo:</b>
        <br />
        {text}
      </div>
    </div>
  );
}

type Celebration = { emoji: string; title: string; body: string };

// Mini-celebración al completar una etapa: anima a seguir y adelanta qué viene.
function StageCelebration({ c, onDone }: { c: Celebration; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={styles.noticeOverlay}>
      <div className={styles.celebration} role="status" onClick={onDone}>
        <span className={styles.celebEmoji} aria-hidden>{c.emoji}</span>
        <h4>{c.title}</h4>
        <p>{c.body}</p>
      </div>
    </div>
  );
}

export function FichaView({
  lot,
  fincas,
  gi,
  onBack,
  onSave,
  onOpenNewFinca,
  onUploadFile,
  onUploadLotVideo,
  onRequestHelp,
  onSubmitOfficializationClaim,
}: {
  lot: Lot;
  fincas: Finca[];
  gi: import("./data").GeneralInfo;
  onBack: () => void;
  // Resolves true only when the row actually persisted -- the buttons below
  // await this so success toasts / stage advances never fire on a failed save.
  onSave: (updates: FichaSaveUpdate) => Promise<boolean>;
  onOpenNewFinca: () => void;
  onUploadFile: (subpath: string, file: File) => Promise<{ assetId: string } | { error: string }>;
  onUploadLotVideo: (file: File) => void;
  onRequestHelp: (text: string) => Promise<boolean>;
  onSubmitOfficializationClaim: (qGraderRef: string, file: File | null, scaTotal: number | null, factorRendimiento: number | null) => void;
}) {
  const { showToast } = useToast();
  // Lots that predate the intake_step system (or that BCP moved along) can be
  // past "borrador" while their intake_step bookkeeping still reads 0. Once a
  // lot's stage left borrador the whole intake is locked-in by definition, so
  // everything downstream treats it as fully complete -- otherwise an already
  // galardonado lot would absurdly show "Completar FT y continuar" and lock
  // its own panes out of view.
  const effectiveIntakeStep = lot.stage >= 1 ? 4 : lot.intakeStep;
  const [active, setActive] = useState<PaneId>(FIRST_PANE_BY_STEP[Math.min(effectiveIntakeStep, 4)]);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<FichaFormData>(() => {
    // Merge onto EMPTY_FICHA (not lot.datasheet ?? EMPTY_FICHA) so a lot saved
    // before a field existed in FichaFormData (e.g. cert_attachments, added
    // 2026-07-10) still gets that field's default instead of `undefined` --
    // reading `undefined[key]` in A3/A4 crashed the whole Ficha for old lots.
    const base: FichaFormData = { ...EMPTY_FICHA, ...(lot.datasheet ?? {}) };
    // A few fields aren't independently editable inside the Ficha -- they're owned
    // elsewhere (the producer's profile, the lot record itself) and always win over
    // whatever was last saved in the datasheet, so the two can never drift apart.
    // The eudr_* fields are in this group too: their real source of truth is the
    // `lots` row (not the datasheet blob), specifically so that BCP filling them
    // in on the producer's behalf (the "aided by BCP" edit path) always shows up
    // here even if the producer's local datasheet copy predates that edit.
    return {
      ...base,
      product_name: lot.name !== "Lote nuevo · sin nombre" ? lot.name : base.product_name,
      razon_social: gi.razon !== "—" ? gi.razon : "",
      nit_rut: gi.nit !== "—" ? gi.nit : "",
      productor: gi.agri !== "—" ? gi.agri : "",
      ctc_uid: ctcLotReference(lot.id),
      country: base.country || gi.country,
      region_dep: base.region_dep || gi.department,
      eudr_custody_stages: lot.eudrCustodyStages,
      eudr_custody_method: lot.eudrCustodyMethod,
      eudr_custody_notes: lot.eudrCustodyNotes,
      eudr_country: lot.eudrCountry,
      eudr_country_risk: lot.eudrCountryRisk,
      eudr_chain_complexity: lot.eudrChainComplexity,
      eudr_product_risk: lot.eudrProductRisk,
      eudr_product_risk_factors: lot.eudrProductRiskFactors,
      eudr_illegality_indicators: lot.eudrIllegalityIndicators,
      eudr_docs_available: lot.eudrDocsAvailable,
      eudr_cert_scheme: lot.eudrCertScheme,
      eudr_risk_level: lot.eudrRiskLevel,
      eudr_mitigation_actions: lot.eudrMitigationActions,
      eudr_mitigation_effective: lot.eudrMitigationEffective,
      eudr_mitigation_responsible: lot.eudrMitigationResponsible,
    };
  });
  const [declared, setDeclared] = useState(false);
  // Caja de soportes pendientes al pie: colapsada por defecto (el titular ya
  // avisa), se abre para adjuntar sin salir del pane en el que se está.
  const [proofsOpen, setProofsOpen] = useState(false);
  const [showDeclare, setShowDeclare] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  // Aviso de compuerta (centrado, con fade) y celebración de etapa completada.
  const [notice, setNotice] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<Celebration | null>(null);
  // FAB "Ayuda" → nota al feed "Retroalimentación y ayuda" (producer_comm_log).
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpText, setHelpText] = useState("");
  const [helpSending, setHelpSending] = useState(false);

  function onChange(patch: Partial<FichaFormData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  const factor = useMemo(() => computeFactor(data), [data]);
  // Granulometry is sieved from the healthy beans only -- defects are
  // physically sorted out before mesh sizing, so the mesh weights should sum
  // to (and their percentages should be relative to) Grano Sano, not the
  // full Trillado Verde Restante (which still includes the defects).
  const mesh = useMemo(() => computeMesh(data, factor.healthy), [data, factor.healthy]);
  const sca = useMemo(() => computeSca(data), [data]);
  const vTotal = useMemo(() => varietyTotal(data), [data]);

  const completed = useMemo<Partial<Record<PaneId, boolean>>>(
    () => ({
      a1: !!data.product_name,
      a2: !!data.estate || !!data.region_dep,
      a3: data.origin_cert_dor || data.origin_cert_do || data.origin_cert_igp || data.origin_cert_fedecafe || !!data.awards,
      a4: [data.intl_eudr, data.intl_rainforest, data.intl_organic, data.intl_fairtrade].some(Boolean),
      // EUDR sub-stage is "done" when the PRODUCER's own inputs are in --
      // country, custody chain + separation method, and the two yes/no
      // factors. The final "Nivel de riesgo determinado" is CTC/BCP's call
      // (Art. 10-11), so it is deliberately NOT part of this gate; requiring it
      // used to lock the producer out of "Completar EUDR y continuar".
      a5:
        !!data.eudr_country &&
        data.eudr_custody_stages.length > 0 &&
        !!data.eudr_custody_method &&
        data.eudr_illegality_indicators !== null &&
        data.eudr_docs_available !== null,
      b1: vTotal > 0 && !!data.species,
      b2: sca.total > 0,
      b3: factor.remainder > 0,
      b4: !!lot.videoUrl,
    }),
    [data, vTotal, sca.total, factor.remainder, lot.videoUrl]
  );

  const overallPct = Math.round((Object.values(completed).filter(Boolean).length / 9) * 100);

  const sourceFincas = useMemo(
    () => resolveSourceFincas(data.origin_category, data.estate, data.additional_estate_ids, fincas),
    [data.origin_category, data.additional_estate_ids, data.estate, fincas]
  );
  // The IMPORTANT rule: EUDR can't be submitted until every source finca has
  // finished its own due diligence (fincaEudrStatus "apta") -- see PaneA5Eudr
  // for the same resolution logic applied to the live status badge.
  const allFincasApta = sourceFincas.length > 0 && sourceFincas.every((f) => fincaEudrStatus(f).code === "apta");
  // "EUDR Ready" gates the downloadable lot certificate (vista final button).
  const lotIsEudrReady = lotEudrStatus(data, sourceFincas).code === "eudr_ready";

  // The four sequential intake gates. Each corresponds to one `intake_step`
  // value (0->1, 1->2, 2->3, 3->4) and its own "Completar X y continuar"
  // action -- see submitCurrentStage(). FT2 lets each of A3/A4/B2/B3 be
  // either genuinely complete or explicitly declared "no lo sé / no aplica".
  const ftReady = !!completed.a1 && !!completed.a2 && !!completed.b1;
  const ft2Ready =
    (!!completed.a3 || data.ft2_a3_na) &&
    (!!completed.a4 || data.ft2_a4_na) &&
    (!!completed.b2 || data.ft2_b2_na) &&
    (!!completed.b3 || data.ft2_b3_na);
  // La aptitud EUDR de las fincas ya NO bloquea en duro: si es lo único que
  // falta, se puede continuar al video con la bandera roja del lote pendiente
  // (ver el confirm en submitCurrentStage) -- la finca completa lo suyo en
  // paralelo sin frenar la Ficha.
  const eudrReady = !!completed.a5;
  const videoReady = !!completed.b4;
  const STAGE_READY = [ftReady, ft2Ready, eudrReady, videoReady];
  const currentStepReady = effectiveIntakeStep < 4 ? STAGE_READY[effectiveIntakeStep] : true;

  function buildUpdate(source: FichaFormData, intakeStep?: number): FichaSaveUpdate {
    const topVariety = source.varieties.find((v) => num(v.pct) > 0);
    return {
      name: source.product_name.trim() || undefined,
      finca: source.estate || undefined,
      datasheet: source,
      completionPct: overallPct,
      intakeStep,
      summary: {
        ficha_variedad: topVariety?.name || null,
        ficha_proceso: source.base_processing || null,
        ficha_altitud_m: source.masl ? Math.round(num(source.masl)) : null,
        ficha_notas_cata: source.analysis_notes || null,
        ficha_puntaje_estimado: sca.total > 0 ? sca.total : null,
      },
      eudr: {
        eudr_custody_stages: source.eudr_custody_stages,
        eudr_custody_method: source.eudr_custody_method || null,
        // The CTC standard covers custody notes on its own, so a producer who
        // picked it never fills the free-text box -- clear any stale note.
        eudr_custody_notes: source.eudr_custody_method === "custom" ? source.eudr_custody_notes || null : null,
        // País lo declara el productor; complejidad, riesgo de producto y esquemas
        // de certificación se derivan y se persisten para que BCP y el dossier
        // los lean ya calculados (ver src/lib/eudr.ts y deriveCertSchemes).
        eudr_country: source.eudr_country || null,
        eudr_country_risk: countryRiskFor(source.eudr_country),
        eudr_chain_complexity: deriveChainComplexity(source.eudr_custody_stages) || null,
        eudr_product_risk: deriveProductRisk(source.eudr_product_risk_factors),
        eudr_product_risk_factors: source.eudr_product_risk_factors,
        eudr_illegality_indicators: source.eudr_illegality_indicators,
        eudr_docs_available: source.eudr_docs_available,
        eudr_cert_scheme: deriveCertSchemes(source).join(", ") || null,
        // El productor aporta las Acciones de mitigación; el "Nivel de riesgo
        // determinado", la efectividad de la mitigación y el responsable son
        // determinaciones de CTC/BCP (updateLotEudr) y NUNCA se escriben desde
        // aquí -- el guard de BD (guard_lot_protected_columns) además lo
        // impide para cualquier escritura del productor.
        eudr_mitigation_actions: source.eudr_mitigation_actions || null,
      },
    };
  }

  // "Fecha de Revisión" is stamped automatically on every save -- it tracks
  // when the Ficha was last touched, not something the producer types by hand.
  function withRevisionDate(): FichaFormData {
    const revision_date = new Date().toISOString().slice(0, 10);
    const stamped = { ...data, revision_date };
    setData(stamped);
    return stamped;
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    const ok = await onSave(buildUpdate(withRevisionDate()));
    setSaving(false);
    // Only claim success once the row actually persisted -- on failure,
    // saveFicha already showed its own error toast.
    if (ok) showToast("Progreso guardado ✓");
  }

  // Autosave del borrador (2026-07-23): mientras la Ficha siga editable, cada
  // pausa de escritura persiste el progreso por el MISMO camino que Guardar —
  // pero sin sellar revision_date (evita un bucle de estado) y sin snapshot de
  // completitud (no inundar la sparkline). Nunca avanza intake_step.
  const { status: autosaveStatus } = useAutosave({
    enabled: effectiveIntakeStep < 4 && !saving,
    snapshot: data,
    save: () => onSave({ ...buildUpdate(data), skipSnapshot: true }),
  });

  // Submits whichever intake sub-stage is currently active for this lot (FT,
  // FT2, EUDR, or Video), validating that stage's own gate first. Advancing
  // past Video is what finally locks the Ficha in and moves the lot to
  // "ficha_completa" -- see KaffetalExperience.tsx's saveFicha(). The success
  // toast and pane advance only happen after the save confirms -- otherwise a
  // failed network call would tell the producer their stage was submitted
  // when the DB never heard about it.
  async function submitCurrentStage() {
    if (saving) return;
    const step = effectiveIntakeStep;
    if (step === 0) {
      if (!ftReady) {
        setNotice("Complete Identidad & Comercio (A1), Información de Origen (A2) y Variedades & Básica (B1).");
        return;
      }
      // If the producer marked physical measurements as "No lo sé aún",
      // reassure (per field) that CTC will determine them objectively before
      // sending the FT.
      const unknownWhy = B1_OPTIONAL_FIELDS.filter((f) => (data.b1_unknown ?? []).includes(f.key)).map((f) => `• ${f.why}`);
      if (unknownWhy.length > 0) {
        const msg =
          'Marcó algunos datos físicos como "No lo sé aún". No hay problema: CTC los determinará con objetividad y método durante la evaluación de su muestra.\n\n' +
          unknownWhy.join("\n") +
          "\n\n¿Desea enviar la FT y continuar?";
        if (!window.confirm(msg)) return;
      }
      setSaving(true);
      const ok = await onSave(buildUpdate(withRevisionDate(), 1));
      setSaving(false);
      if (!ok) return;
      setCelebrate({
        emoji: "🎉",
        title: "¡FT enviada a CTC!",
        body: "Primera etapa completa. Ahora viene FT2: certificados, perfil de taza y análisis físico — cuéntenos qué hace especial a este café.",
      });
      setActive("a3");
      return;
    }
    if (step === 1) {
      if (!ft2Ready) {
        setNotice('Complete A3, A4, B2 y B3 — o marque "No lo sé / no aplica" en cada uno.');
        return;
      }
      // Compuerta SUAVE de soportes: certificados marcados sin archivo no
      // bloquean, pero el productor debe saber que sin prueba se desmarcarán
      // al enviar la Ficha (afirmar una certificación exige confirmarla).
      const pending = pendingCertProofs(data);
      if (pending.length > 0) {
        const msg =
          "Estos certificados quedaron marcados SIN archivo de soporte:\n\n" +
          pending.map((p) => `• ${p.label}`).join("\n") +
          "\n\nPuede continuar y adjuntar los soportes hasta el envío final de la Ficha. Los que sigan sin prueba en ese momento se desmarcarán y el lote seguirá sin ellos.\n\n¿Continuar con FT2?";
        if (!window.confirm(msg)) return;
      }
      setSaving(true);
      const ok = await onSave(buildUpdate(withRevisionDate(), 2));
      setSaving(false);
      if (!ok) return;
      setCelebrate({
        emoji: "🏅",
        title: "¡FT2 enviada a CTC!",
        body: "Su café ya tiene perfil y análisis. Sigue el EUDR: la debida diligencia que le abre la puerta del mercado europeo.",
      });
      setActive("a5");
      return;
    }
    if (step === 2) {
      if (!completed.a5) {
        setNotice("En EUDR: indique el país, marque la cadena de custodia y su método, y responda las dos preguntas de sí/no.");
        return;
      }
      // Si lo ÚNICO que falta es la aptitud de la(s) finca(s), se puede seguir
      // al video -- el lote queda con su bandera roja EUDR pendiente hasta que
      // la finca complete su propia debida diligencia.
      if (!allFincasApta) {
        const msg =
          'La(s) finca(s) de origen aún no completan su propia debida diligencia (estado distinto de "Apta").\n\nPuede continuar con el video, pero el lote quedará marcado en rojo y PENDIENTE de EUDR hasta que su(s) finca(s) queden Aptas.\n\n¿Continuar de todas formas?';
        if (!window.confirm(msg)) return;
      }
      setSaving(true);
      const ok = await onSave(buildUpdate(withRevisionDate(), 3));
      setSaving(false);
      if (!ok) return;
      setCelebrate({
        emoji: "🌍",
        title: allFincasApta ? "¡EUDR enviado a CTC!" : "EUDR enviado — pendiente de la finca",
        body: allFincasApta
          ? "Trazabilidad lista para Europa. Último paso: el video del café — tres tomas sencillas de ~30 segundos bastan."
          : "Quedó registrado con la aptitud de la finca pendiente (bandera roja). Último paso: el video del café — tres tomas sencillas de ~30 segundos bastan.",
      });
      setActive("b4");
      return;
    }
    if (step === 3) {
      if (!videoReady) {
        setNotice("Suba al menos el video principal del café antes de continuar.");
        return;
      }
      if (!showDeclare) {
        setShowDeclare(true);
        return;
      }
      if (!declared) {
        setNotice("Marque la declaración de veracidad antes de continuar.");
        return;
      }
      // ÚLTIMO recordatorio de soportes: lo que siga sin prueba se desmarca y
      // la Ficha se envía sin esos certificados.
      let source = withRevisionDate();
      const pending = pendingCertProofs(source);
      if (pending.length > 0) {
        const msg =
          "ÚLTIMO RECORDATORIO — certificados marcados sin soporte:\n\n" +
          pending.map((p) => `• ${p.label}`).join("\n") +
          "\n\nSi envía ahora, estas selecciones se DESMARCARÁN y la Ficha seguirá sin ellas. Cancele si prefiere adjuntar los soportes primero (A3/A4).\n\n¿Enviar la Ficha sin esos certificados?";
        if (!window.confirm(msg)) return;
        source = stripUnprovenCerts(source);
        setData(source);
      }
      setSaving(true);
      const ok = await onSave(buildUpdate(source, 4));
      setSaving(false);
      if (!ok) return;
      setShowShipmentModal(true);
    }
  }

  async function uploadCert(certKey: string, file: File) {
    const result = await onUploadFile(`lots/${lot.id}/certs/${certKey}`, file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    onChange({ cert_attachments: { ...data.cert_attachments, [certKey]: { assetId: result.assetId, fileName: file.name } } });
  }

  // Videos 2 y 3 de B4: van al mismo bucket (misma convención de ruta) pero se
  // registran en el datasheet, no en lots.video_asset_id (que sigue siendo el
  // video principal).
  async function uploadExtraVideo(slot: number, file: File) {
    const result = await onUploadFile(`lots/${lot.id}/video-extra-${slot + 1}`, file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const next = [...(data.extra_video_assets ?? [])];
    next[slot] = { assetId: result.assetId, fileName: file.name };
    onChange({ extra_video_assets: next });
    showToast(`Video ${slot + 2} subido ✓ · recuerde Guardar`);
  }

  async function sendHelp() {
    if (!helpText.trim() || helpSending) return;
    setHelpSending(true);
    const ok = await onRequestHelp(helpText);
    setHelpSending(false);
    if (ok) {
      setHelpText("");
      setHelpOpen(false);
    }
  }

  const viewingLocked = PANE_SUBSTAGE[active] < effectiveIntakeStep;
  const paneProps = { data, onChange, fincas, onOpenNewFinca, lot, gi, onUploadCertFile: uploadCert, onUploadLotVideo, onUploadExtraVideo: uploadExtraVideo, viewingLocked };
  const STAGE_BUTTON_LABEL = [
    "Completar FT y continuar",
    "Completar FT2 y continuar",
    "Completar EUDR y continuar",
    showDeclare ? "Confirmar y Enviar" : "Completar Video y Enviar",
  ];

  return (
    <div>
      <div className={styles.appTop}>
        <div className={`wrap ${styles.nav}`}>
          <a href="#" className={styles.brand} onClick={(e) => { e.preventDefault(); onBack(); }}>
            <Image className={styles.krl} src="/images/shared/kaffetal-regal-logo.png" alt="Kaffetal Regal" width={1254} height={1254} />
            <span>
              <span className={styles.name}>Ficha Técnica</span>
              <span className={styles.by}>CTC · Green Coffee Datasheet · V5</span>
            </span>
          </a>
          <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={onBack}>← Volver al panel</button>
        </div>
      </div>

      <div className={`wrap ${styles.fichaMain}`}>
        <p className="eyebrow">Lote <span className="mono">{ctcLotReference(lot.id)}</span></p>
        <h1 style={{ marginTop: 8 }}>Cuéntenos todo sobre este café</h1>
        <p style={{ color: "var(--muted)", marginTop: 10, maxWidth: "64ch" }}>
          Esta ficha es la hoja de vida de su lote: la leen el panel de la Arena y, después, los tostadores en
          Europa. Recorra cada sección con el menú de la izquierda — puede ir y volver cuando quiera.
        </p>

        <div className={styles.shell} style={{ marginTop: 24 }}>
          <FichaNav active={active} completed={completed} intakeStep={effectiveIntakeStep} onSelect={setActive} />
          <div className={styles.content}>
            {viewingLocked && (
              <p style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                🔒 Esta sección ya fue enviada a CTC y quedó registrada para revisión.
              </p>
            )}
            {!viewingLocked && FT2_NA_FIELD[active] && (
              <label
                className={styles.chip}
                style={{ display: "inline-flex", marginBottom: 14 }}
              >
                <input
                  type="checkbox"
                  checked={data[FT2_NA_FIELD[active]!]}
                  onChange={(e) => onChange({ [FT2_NA_FIELD[active]!]: e.target.checked })}
                />{" "}
                No lo sé / no aplica para este lote
              </label>
            )}
            {/* (La caja de soportes pendientes vivía aquí, solo en A3/A4, lo que
                obligaba a navegar hacia atrás para adjuntar. Ahora vive al pie,
                junto a Guardar/Enviar, y está disponible desde cualquier pane.) */}
            {/* disabled fieldset = every input/button inside a submitted-and-
                locked section is genuinely read-only, not just banner-decorated.
                "Completar y Enviar" locks the information in; without this, a
                producer could keep editing FT after submitting it and Guardar
                would silently push the changes to what BCP is reviewing. */}
            <fieldset disabled={viewingLocked} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
              {active === "a1" && <PaneA1 {...paneProps} />}
              {active === "a2" && <PaneA2 {...paneProps} />}
              {active === "a3" && <PaneA3 {...paneProps} />}
              {active === "a4" && <PaneA4 {...paneProps} />}
              {active === "a5" && <PaneA5Eudr {...paneProps} />}
              {active === "b1" && <PaneB1 {...paneProps} />}
              {active === "b2" && <PaneB2 {...paneProps} sca={sca} />}
              {active === "b3" && <PaneB3 {...paneProps} factor={factor} mesh={mesh} />}
              {active === "b4" && <PaneB4 {...paneProps} />}
              {active === "ficha" && (
                <>
                  <FichaPreview data={data} factor={factor} mesh={mesh} sca={sca} varTotal={vTotal} scorings={lot.scaScorings} />
                  {lotIsEudrReady && (
                    <div style={{ marginTop: 14 }}>
                      <a className="btn btn-sm btn-solid" href={`/kaffetal-regal/certificacion-lote/${lot.id}`} target="_blank" rel="noopener noreferrer">
                        Certificación EUDR del lote ↗
                      </a>
                      <p className={styles.fexample} style={{ marginTop: 6 }}>
                        Documento del lote de la Certificación Voluntaria EUDR — se complementa con el Expediente EUDR de la finca.
                      </p>
                    </div>
                  )}
                </>
              )}
            </fieldset>
            {/* Los banners de oficialización viven DEBAJO del pane y FUERA del
                fieldset que bloquea: pedir el puntaje oficial es justamente una
                acción post-envío, y en B2 queda al pie del bloque Q-Grader
                (referencia diligenciada → solicitar con el adjunto). */}
            {active === "b2" && (
              <OfficialScoreBanner
                lot={lot}
                selfEstimate={sca.total}
                kind="sca"
                defaultRef={[data.qgrader_name, data.qgrader_lab, data.qgrader_cert].filter(Boolean).join(" · ")}
                onSubmitClaim={(qGraderRef, file) => onSubmitOfficializationClaim(qGraderRef, file, sca.total, factor.remainder)}
              />
            )}
            {active === "b3" && (
              <OfficialScoreBanner
                lot={lot}
                selfEstimate={factor.remainder}
                kind="factor"
                onSubmitClaim={(qGraderRef, file) => onSubmitOfficializationClaim(qGraderRef, file, sca.total, factor.remainder)}
              />
            )}
          </div>
        </div>

        {/* Soportes pendientes, al alcance del botón de envío. Antes esta caja
            solo existía DENTRO de A3/A4, así que al toparse con el aviso de
            "se van a desmarcar" había que navegar hacia atrás para adjuntar —
            y encima el input de la tarjeta del certificado está deshabilitado
            por el fieldset de la sección enviada. Aquí vive fuera del fieldset
            y en cualquier pane: el aviso y la solución quedan en el mismo sitio. */}
        {effectiveIntakeStep < 4 && pendingCertProofs(data).length > 0 && (
          <div className={styles.pendProofs}>
            <button
              type="button"
              className={styles.pendProofsHead}
              aria-expanded={proofsOpen}
              onClick={() => setProofsOpen((v) => !v)}
            >
              <span>
                ⚠️ {pendingCertProofs(data).length} certificado{pendingCertProofs(data).length === 1 ? "" : "s"} sin soporte —
                adjúntelo{pendingCertProofs(data).length === 1 ? "" : "s"} aquí antes de enviar
              </span>
              <span aria-hidden>{proofsOpen ? "▾" : "▸"}</span>
            </button>
            {proofsOpen && (
              <div className={styles.pendProofsBody}>
                <p className={styles.fexample} style={{ margin: "0 0 8px" }}>
                  Si envía la Ficha sin la prueba, estas selecciones <b>se desmarcarán</b>. No hace falta volver a A3/A4:
                  adjunte aquí y pulse Guardar.
                </p>
                {pendingCertProofs(data).map((p) => (
                  <div key={p.key} className={styles.pendProofsRow}>
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ fontSize: 11.5 }}
                      aria-label={`Soporte para ${p.label}`}
                      onChange={(e) => e.target.files?.[0] && uploadCert(p.key, e.target.files[0])}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.footer}>
          {showDeclare && (
            <label className={styles.chip}>
              <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} autoFocus /> Declaro que la información
              es veraz y que enviaré la muestra de 2 kg de pergamino marcada con el código del lote.
            </label>
          )}
          <div className={styles.csvRow}>
            {effectiveIntakeStep >= 4 ? (
              // "en revisión" only while the lot is actually sitting with CTC
              // (ficha_completa) -- past that (arena queue, evaluado,
              // galardonado) the state chip on the dashboard tells the story.
              <span className={styles.chip}>{lot.stage <= 1 ? "✓ Ficha enviada a CTC · en revisión" : "✓ Ficha registrada en CTC"}</span>
            ) : (
              <>
                <AutosaveChip status={autosaveStatus} />
                <button className="btn btn-sm" onClick={save} disabled={saving}>
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  className="btn btn-solid-accent"
                  onClick={submitCurrentStage}
                  aria-disabled={!currentStepReady || saving}
                  style={!currentStepReady || saving ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                >
                  {saving ? "Enviando…" : STAGE_BUTTON_LABEL[effectiveIntakeStep]}
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* FABs flotantes (como en el panel de Finca): Guardar siempre a mano y
          Ayuda directo al feed de retroalimentación, con el lote como contexto. */}
      {effectiveIntakeStep < 4 && (
        <button className={styles.fab} onClick={save} disabled={saving} aria-label="Guardar ficha">
          <span className={styles.fabIcon} aria-hidden>💾</span>
          <span className={styles.fabLabel}>{saving ? "Guardando…" : "Guardar Ficha"}</span>
        </button>
      )}
      <button className={styles.fabHelp} style={effectiveIntakeStep >= 4 ? { bottom: 24 } : undefined} onClick={() => setHelpOpen((v) => !v)} aria-label="Pedir ayuda a CTC">
        <span className={styles.fabIcon} aria-hidden>💬</span>
        <span className={styles.fabLabel}>Ayuda</span>
      </button>
      {helpOpen && (
        <div className={styles.helpBox}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 6px" }}>¿En qué necesita ayuda con esta ficha?</p>
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

      {notice && <CenterNotice text={notice} onDone={() => setNotice(null)} />}
      {celebrate && <StageCelebration c={celebrate} onDone={() => setCelebrate(null)} />}

      <ShipmentInstructionsModal
        open={showShipmentModal}
        onClose={() => {
          setShowShipmentModal(false);
          onBack();
        }}
        lotCode={ctcLotReference(lot.id)}
        shortRef={ctcLotReferenceShort(lot.id)}
      />
    </div>
  );
}
