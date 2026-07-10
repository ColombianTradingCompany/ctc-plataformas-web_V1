"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import { ctcLotReference, type Finca, type Lot } from "./data";
import { EMPTY_FICHA, num, type FichaFormData } from "./ficha/fichaData";
import { computeFactor, computeMesh, computeSca, varietyTotal } from "./ficha/fichaCalculations";
import { FichaNav, type PaneId } from "./ficha/FichaNav";
import { PaneA1 } from "./ficha/panes/PaneA1";
import { PaneA2 } from "./ficha/panes/PaneA2";
import { PaneA3 } from "./ficha/panes/PaneA3";
import { PaneA4 } from "./ficha/panes/PaneA4";
import { PaneB1 } from "./ficha/panes/PaneB1";
import { PaneB2 } from "./ficha/panes/PaneB2";
import { PaneB3 } from "./ficha/panes/PaneB3";
import { PaneB4 } from "./ficha/panes/PaneB4";
import { FichaPreview } from "./ficha/FichaPreview";
import { NextStepWidget } from "./ficha/NextStepWidget";
import { STAGES } from "./data";
import styles from "./FichaView.module.css";

export type { PaneProps } from "./ficha/panes/types";

export type FichaSaveUpdate = {
  name?: string;
  finca?: string;
  datasheet: FichaFormData;
  completionPct: number;
  finalize?: boolean;
  summary: {
    ficha_variedad: string | null;
    ficha_proceso: string | null;
    ficha_altitud_m: number | null;
    ficha_notas_cata: string | null;
    ficha_puntaje_estimado: number | null;
  };
};

export function FichaView({
  lot,
  fincas,
  gi,
  onBack,
  onSave,
  onAdviceUpdate,
  onOpenNewFinca,
  onUploadFile,
  onUploadLotVideo,
}: {
  lot: Lot;
  fincas: Finca[];
  gi: import("./data").GeneralInfo;
  onBack: () => void;
  onSave: (updates: FichaSaveUpdate) => void;
  onAdviceUpdate: (lotId: string, advice: string, context: Record<string, unknown>) => void;
  onOpenNewFinca: () => void;
  onUploadFile: (subpath: string, file: File) => Promise<{ assetId: string } | { error: string }>;
  onUploadLotVideo: (file: File) => void;
}) {
  const { showToast } = useToast();
  const [active, setActive] = useState<PaneId>("a1");
  const [data, setData] = useState<FichaFormData>(() => {
    // Merge onto EMPTY_FICHA (not lot.datasheet ?? EMPTY_FICHA) so a lot saved
    // before a field existed in FichaFormData (e.g. cert_attachments, added
    // 2026-07-10) still gets that field's default instead of `undefined` --
    // reading `undefined[key]` in A3/A4 crashed the whole Ficha for old lots.
    const base: FichaFormData = { ...EMPTY_FICHA, ...(lot.datasheet ?? {}) };
    // A few fields aren't independently editable inside the Ficha -- they're owned
    // elsewhere (the producer's profile, the lot record itself) and always win over
    // whatever was last saved in the datasheet, so the two can never drift apart.
    return {
      ...base,
      product_name: lot.name !== "Lote nuevo · sin nombre" ? lot.name : base.product_name,
      razon_social: gi.razon !== "—" ? gi.razon : "",
      nit_rut: gi.nit !== "—" ? gi.nit : "",
      productor: gi.agri !== "—" ? gi.agri : "",
      ctc_uid: ctcLotReference(lot.id),
      country: base.country || gi.country,
      region_dep: base.region_dep || gi.department,
    };
  });
  const [declared, setDeclared] = useState(false);
  const [showDeclare, setShowDeclare] = useState(false);

  function onChange(patch: Partial<FichaFormData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  const factor = useMemo(() => computeFactor(data), [data]);
  const mesh = useMemo(() => computeMesh(data, factor.remainder), [data, factor.remainder]);
  const sca = useMemo(() => computeSca(data), [data]);
  const vTotal = useMemo(() => varietyTotal(data), [data]);

  const completed = useMemo<Partial<Record<PaneId, boolean>>>(
    () => ({
      a1: !!data.product_name,
      a2: !!data.estate || !!data.region_dep,
      a3: data.origin_cert_dor || data.origin_cert_do || data.origin_cert_igp || data.origin_cert_fedecafe || !!data.awards,
      a4: [data.intl_eudr, data.intl_rainforest, data.intl_organic, data.intl_fairtrade].some(Boolean),
      b1: vTotal > 0 && !!data.species,
      b2: sca.total > 0,
      b3: factor.remainder > 0,
      b4: !!lot.videoUrl,
    }),
    [data, vTotal, sca.total, factor.remainder, lot.videoUrl]
  );

  const overallPct = Math.round((Object.values(completed).filter(Boolean).length / 8) * 100);
  const readyToComplete = !!completed.a1 && !!completed.a2 && !!completed.b1;

  function buildUpdate(source: FichaFormData, finalize: boolean): FichaSaveUpdate {
    const topVariety = source.varieties.find((v) => num(v.pct) > 0);
    return {
      name: source.product_name.trim() || undefined,
      finca: source.estate || undefined,
      datasheet: source,
      completionPct: overallPct,
      finalize,
      summary: {
        ficha_variedad: topVariety?.name || null,
        ficha_proceso: source.base_processing || null,
        ficha_altitud_m: source.masl ? Math.round(num(source.masl)) : null,
        ficha_notas_cata: source.analysis_notes || null,
        ficha_puntaje_estimado: sca.total > 0 ? sca.total : null,
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

  function save() {
    onSave(buildUpdate(withRevisionDate(), false));
    showToast("Progreso guardado ✓");
  }

  function completeAndSend() {
    if (!readyToComplete) {
      showToast("Complete primero Identidad & Comercio (A1), Información de Origen (A2) y Variedades & Básica (B1).");
      return;
    }
    if (!showDeclare) {
      setShowDeclare(true);
      return;
    }
    if (!declared) {
      showToast("Marque la declaración de veracidad antes de continuar.");
      return;
    }
    onSave(buildUpdate(withRevisionDate(), true));
    showToast("Ficha completada. Con la muestra de 2 kg recibida, su lote entra en fila para la Arena.");
    onBack();
  }

  async function uploadCert(certKey: string, file: File) {
    const result = await onUploadFile(`lots/${lot.id}/certs/${certKey}`, file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    onChange({ cert_attachments: { ...data.cert_attachments, [certKey]: { assetId: result.assetId, fileName: file.name } } });
  }

  const paneProps = { data, onChange, fincas, onOpenNewFinca, lot, gi, onUploadCertFile: uploadCert, onUploadLotVideo };

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
          <FichaNav active={active} completed={completed} onSelect={setActive} />
          <div className={styles.content}>
            {active === "a1" && <PaneA1 {...paneProps} />}
            {active === "a2" && <PaneA2 {...paneProps} />}
            {active === "a3" && <PaneA3 {...paneProps} />}
            {active === "a4" && <PaneA4 {...paneProps} />}
            {active === "b1" && <PaneB1 {...paneProps} />}
            {active === "b2" && <PaneB2 {...paneProps} sca={sca} />}
            {active === "b3" && <PaneB3 {...paneProps} factor={factor} mesh={mesh} />}
            {active === "b4" && <PaneB4 {...paneProps} />}
            {active === "ficha" && <FichaPreview data={data} factor={factor} mesh={mesh} sca={sca} varTotal={vTotal} />}
          </div>
        </div>

        <div className={styles.footer}>
          {showDeclare && (
            <label className={styles.chip}>
              <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} autoFocus /> Declaro que la información
              es veraz y que enviaré la muestra de 2 kg de pergamino marcada con el código del lote.
            </label>
          )}
          <div className={styles.csvRow}>
            <button className="btn btn-sm" onClick={save}>Guardar</button>
            <button
              className="btn btn-solid-accent"
              onClick={completeAndSend}
              aria-disabled={!readyToComplete}
              style={!readyToComplete ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
              title={readyToComplete ? undefined : "Complete Identidad & Comercio, Información de Origen y Variedades & Básica primero"}
            >
              {showDeclare ? "Confirmar y Enviar" : "Completar y Enviar"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <NextStepWidget
            lotId={lot.id}
            lotCode={ctcLotReference(lot.id)}
            stageLabel={STAGES[lot.stage]}
            data={data}
            completed={completed}
            scaTotal={sca.total}
            cachedAdvice={lot.nextStepAdvice}
            onAdviceUpdate={(advice, context) => onAdviceUpdate(lot.id, advice, context)}
          />
        </div>
      </div>
    </div>
  );
}
