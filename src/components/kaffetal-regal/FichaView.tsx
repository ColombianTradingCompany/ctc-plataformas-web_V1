"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import type { Finca, Lot } from "./data";
import { EMPTY_FICHA, type FichaFormData } from "./ficha/fichaData";
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
import { downloadFichaCSV, parseFichaCSV } from "./ficha/fichaCsv";
import styles from "./FichaView.module.css";

export type { PaneProps } from "./ficha/panes/types";

export function FichaView({
  lot,
  fincas,
  gi,
  onBack,
  onSave,
  onOpenNewFinca,
}: {
  lot: Lot;
  fincas: Finca[];
  gi: import("./data").GeneralInfo;
  onBack: () => void;
  onSave: (updates: { name?: string; finca?: string }) => void;
  onOpenNewFinca: () => void;
}) {
  const { showToast } = useToast();
  const [active, setActive] = useState<PaneId>("a1");
  const [data, setData] = useState<FichaFormData>({
    ...EMPTY_FICHA,
    product_name: lot.name !== "Lote nuevo · sin nombre" ? lot.name : "",
    razon_social: gi.razon !== "—" ? gi.razon : "",
  });
  const [declared, setDeclared] = useState(false);

  function onChange(patch: Partial<FichaFormData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  const factor = useMemo(() => computeFactor(data), [data]);
  const mesh = useMemo(() => computeMesh(data, factor.remainder), [data, factor.remainder]);
  const sca = useMemo(() => computeSca(data), [data]);
  const vTotal = useMemo(() => varietyTotal(data), [data]);

  const completed = useMemo<Partial<Record<PaneId, boolean>>>(
    () => ({
      a1: !!data.product_name && !!data.species,
      a2: !!data.estate || !!data.region_dep,
      a3: data.origin_cert_dor || data.origin_cert_do || data.origin_cert_igp || data.origin_cert_fedecafe || !!data.awards,
      a4: [data.intl_eudr, data.intl_rainforest, data.intl_organic, data.intl_fairtrade].some(Boolean),
      b1: vTotal > 0,
      b2: sca.total > 0,
      b3: factor.remainder > 0,
      b4: !!data.analysis_notes || !!data.qgrader_1,
    }),
    [data, vTotal, sca.total, factor.remainder]
  );

  const overallPct = Math.round((Object.values(completed).filter(Boolean).length / 8) * 100);

  function save() {
    if (!declared) {
      showToast("Marque la declaración de veracidad antes de guardar.");
      return;
    }
    onSave({ name: data.product_name.trim() || undefined, finca: data.estate || undefined });
    showToast("Ficha guardada. Con la muestra de 2 kg recibida, su lote entra en fila para la Arena.");
    onBack();
  }

  function handleLoadCSV(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setData((d) => parseFichaCSV(String(reader.result), d));
        showToast("Configuración cargada correctamente");
      } catch {
        showToast("Error al leer el CSV");
      }
    };
    reader.readAsText(file);
  }

  const paneProps = { data, onChange, fincas, onOpenNewFinca };

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

      <div className="wrap">
        <div className={styles.fprog}>
          <div className={styles.bar}><div className={styles.fill} style={{ width: `${overallPct}%` }} /></div>
          <div className={styles.pt}><span>Progreso de la ficha</span><span>{overallPct}% completado</span></div>
        </div>
      </div>

      <div className={`wrap ${styles.fichaMain}`}>
        <p className="eyebrow">Lote <span className="mono">CTC_2601{lot.id.replace(/\D/g, "").padStart(2, "0")}</span></p>
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
          <label className={styles.chip}>
            <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} /> Declaro que la información
            es veraz y que enviaré la muestra de 2 kg de pergamino marcada con el código del lote.
          </label>
          <div className={styles.csvRow}>
            <input
              type="file"
              accept=".csv"
              id="ficha-csv-input"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLoadCSV(f);
                e.target.value = "";
              }}
            />
            <button className="btn btn-sm" onClick={() => document.getElementById("ficha-csv-input")?.click()}>Cargar CSV</button>
            <button className="btn btn-sm" onClick={() => downloadFichaCSV(data)}>Guardar CSV</button>
            <button className="btn btn-solid-accent" onClick={save}>Guardar y poner en fila para la Arena</button>
          </div>
        </div>
      </div>
    </div>
  );
}
