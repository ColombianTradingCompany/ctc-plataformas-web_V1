"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import type { Finca, Lot } from "./data";
import styles from "./FichaView.module.css";

const CERT_OPTIONS = [
  "Orgánico UE", "Orgánico USDA", "Orgánico JAS (Japón)", "Rainforest Alliance", "Fairtrade", "4C",
  "C.A.F.E. Practices", "Nespresso AAA", "Bird Friendly (Smithsonian)", "D.O. Café de Colombia",
  "BPA / GlobalG.A.P.", "Otro certificado",
];

type TrackedFields = {
  nombre: string;
  fincaSel: string;
  tipo: string;
  variedades: string;
  proceso: string;
  fecha: string;
  perg: string;
  declaracion: boolean;
};

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
  const [fields, setFields] = useState<TrackedFields>({
    nombre: lot.name !== "Lote nuevo · sin nombre" ? lot.name : "",
    fincaSel: "",
    tipo: "",
    variedades: "",
    proceso: "",
    fecha: "",
    perg: "",
    declaracion: false,
  });
  const [videoInfo, setVideoInfo] = useState<Record<string, { ok: boolean; text: string }>>({});

  const pct = useMemo(() => {
    const total = 8;
    let filled = 0;
    if (fields.nombre.trim()) filled++;
    if (fields.fincaSel) filled++;
    if (fields.tipo) filled++;
    if (fields.variedades.trim()) filled++;
    if (fields.proceso) filled++;
    if (fields.fecha) filled++;
    if (fields.perg.trim()) filled++;
    if (fields.declaracion) filled++;
    return Math.round((filled / total) * 100);
  }, [fields]);

  const selectedFinca = fincas.find((f) => f.name === fields.fincaSel);
  const verde = fields.perg.trim() ? (parseFloat(fields.perg) * 0.72).toFixed(1) + " kg verde aprox." : "";

  function set<K extends keyof TrackedFields>(key: K, value: TrackedFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleFincaChange(v: string) {
    if (v === "__new__") {
      onOpenNewFinca();
      return;
    }
    set("fincaSel", v);
  }

  function checkVideo(key: string, file: File | undefined) {
    if (!file) {
      setVideoInfo((v) => ({ ...v, [key]: { ok: true, text: "" } }));
      return;
    }
    const mb = file.size / 1048576;
    if (mb > 100) {
      setVideoInfo((v) => ({ ...v, [key]: { ok: false, text: `✕ ${file.name} pesa ${mb.toFixed(0)} MB — el máximo es 100 MB. Compártalo en menor resolución.` } }));
      showToast("El video supera los 100 MB. Redúzcalo e intente de nuevo.");
    } else {
      setVideoInfo((v) => ({ ...v, [key]: { ok: true, text: `✓ ${file.name} · ${mb.toFixed(1)} MB adjuntado` } }));
    }
  }

  function save() {
    onSave({ name: fields.nombre.trim() || undefined, finca: fields.fincaSel || undefined });
    showToast("Ficha guardada. Con la muestra de 2 kg recibida, su lote entra en fila para la Arena.");
    onBack();
  }

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
          <div className={styles.bar}><div className={styles.fill} style={{ width: `${pct}%` }} /></div>
          <div className={styles.pt}><span>Progreso de la ficha</span><span>{pct}% completado</span></div>
        </div>
      </div>

      <div className={`wrap ${styles.fichaMain}`}>
        <p className="eyebrow">Lote <span className="mono">CTC_2601{lot.id.replace(/\D/g, "").padStart(2, "0")}</span></p>
        <h1 style={{ marginTop: 8 }}>Cuéntenos todo sobre este café</h1>
        <p style={{ color: "var(--muted)", marginTop: 10, maxWidth: "64ch" }}>
          Esta ficha es la hoja de vida de su lote: la leen el panel de la Arena y, después, los tostadores en
          Europa. Entre más completa y honesta, mejor le va a su café. Se guarda automáticamente.
        </p>

        <div className={styles.fsec}>
          <h3><span className={styles.fn}>01</span> Identidad del lote</h3>
          <div className={styles.inherit}>
            Proveedor: <b>{gi.razon}</b> · NIT/CC verificado ✓ — estos datos se registran <b>una sola vez</b> en su
            perfil y aplican a todos sus lotes.
          </div>
          <div className={styles.fgrid}>
            <div className={styles.ff}>
              <label>Nombre comercial del café</label>
              <input value={fields.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Colombia Santander Gesha Natural" />
            </div>
            <div className={styles.ff}>
              <label>Finca asociada <small>(el lote hereda su origen)</small></label>
              <select value={fields.fincaSel} onChange={(e) => handleFincaChange(e.target.value)}>
                <option value="">Seleccione una de sus fincas…</option>
                {fincas.map((f) => (
                  <option key={f.name} value={f.name}>{f.name} · {f.mun}, {f.depto} · {f.alt} msnm</option>
                ))}
                <option value="__new__">＋ Registrar una finca nueva</option>
              </select>
            </div>
            <div className={`${styles.ff} ${styles.fw}`}>
              <label>Tipo de lote</label>
              <div className={styles.chips}>
                {["Single Estate", "Single Origin", "Regional Blend", "Multi-Origin Blend"].map((t) => (
                  <label className={styles.chip} key={t}>
                    <input type="radio" name="ftipo" checked={fields.tipo === t} onChange={() => set("tipo", t)} /> {t}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.fsec}>
          <h3><span className={styles.fn}>02</span> Origen · heredado de la finca</h3>
          <div className={styles.inherit}>
            {selectedFinca ? (
              <>Este lote hereda de <b>{selectedFinca.name}</b>: {selectedFinca.vereda} · {selectedFinca.mun}, {selectedFinca.depto} · {selectedFinca.alt} msnm · {selectedFinca.hist} ✓. Ajuste abajo solo lo propio del lote.</>
            ) : (
              "Seleccione la finca en la sección 01: el municipio, la vereda, la altitud, la historia y las características se heredan automáticamente. Aquí solo agrega lo propio de este lote."
            )}
          </div>
          <div className={styles.fgrid}>
            <div className={styles.ff}><label>Sublote / tabla <small>(opcional)</small></label><input placeholder="Ej. Tabla 3 · La Cuchilla" /></div>
            <div className={styles.ff}><label>Altitud del lote <small>(si difiere de la finca)</small></label><input type="number" placeholder="1600" /></div>
            <div className={`${styles.ff} ${styles.fw}`}><label>Historia de este lote <small>(cosecha, microclima, comunidad…)</small></label><textarea placeholder="Historia, altitud, microclima, comunidad…" /></div>
            <div className={`${styles.ff} ${styles.fw}`}>
              <label>Composición regional <small>(solo blends)</small></label>
              <input placeholder="Ej. 60% Huila · 30% Santander · 10% Nariño…" />
              <p className={styles.fexample}>Déjelo vacío si es Single Estate / Single Origin.</p>
            </div>
          </div>
        </div>

        <div className={styles.fsec}>
          <h3><span className={styles.fn}>03</span> Certificaciones & Reconocimientos</h3>
          <div className={styles.fgrid}>
            <div className={`${styles.ff} ${styles.fw}`}>
              <label>Certificados internacionales <small>(marque todos los que apliquen)</small></label>
              <div className={styles.chips}>
                {CERT_OPTIONS.map((c) => (
                  <label className={styles.chip} key={c}><input type="checkbox" /> {c}</label>
                ))}
              </div>
            </div>
            <div className={`${styles.ff} ${styles.fw}`}><label>Otro certificado <small>(si marcó &quot;Otro&quot;)</small></label><input placeholder="Nombre del certificado…" /></div>
            <div className={`${styles.ff} ${styles.fw}`}><label>Reconocimientos <small>(concursos, ferias)</small></label><input placeholder="Ej. Cup of Excellence 2024 · Top 10…" /></div>
          </div>
        </div>

        <div className={styles.fsec}>
          <h3><span className={styles.fn}>04</span> Variedades & Caracterización Básica</h3>
          <div className={styles.fgrid}>
            <div className={styles.ff}><label>Variedades del lote</label><input value={fields.variedades} onChange={(e) => set("variedades", e.target.value)} placeholder="Ej. Pink Bourbon, Castillo…" /></div>
            <div className={styles.ff}>
              <label>Proceso</label>
              <select value={fields.proceso} onChange={(e) => set("proceso", e.target.value)}>
                <option value="">Seleccione…</option>
                <option>Lavado</option><option>Honey</option><option>Natural</option><option>Experimental / otro</option>
              </select>
            </div>
            <div className={styles.ff}><label>Detalle del proceso</label><input placeholder="Anaeróbico, láctico, thermal…" /></div>
            <div className={styles.ff}><label>Fecha de cosecha</label><input type="date" value={fields.fecha} onChange={(e) => set("fecha", e.target.value)} /></div>
            <div className={styles.ff}><label>Cantidad disponible <small>(kg pergamino)</small></label><input type="number" value={fields.perg} onChange={(e) => set("perg", e.target.value)} placeholder="240.0" /></div>
            <div className={styles.ff}><label>Equivalente en verde <small>(≈ factor 0,72)</small></label><input value={verde} placeholder="Calculado automáticamente" readOnly /></div>
          </div>
        </div>

        <div className={styles.fsec}>
          <h3><span className={styles.fn}>05</span> Perfil de Taza · Puntaje SCA</h3>
          <div className={styles.fgrid}>
            <div className={styles.ff}><label>Puntaje total SCA <small>(si lo conoce)</small></label><input type="number" step="0.25" placeholder="0.00" /></div>
            <div className={styles.ff}><label>Catador de referencia</label><input placeholder="Nombre · Puntaje · Fecha" /></div>
            <div className={`${styles.ff} ${styles.fw}`}><label>Notas sensoriales</label><textarea placeholder="En fragancia y aroma se perciben notas a…" /></div>
          </div>
          <p className={styles.fexample} style={{ marginTop: 10 }}>¿No tiene puntaje? Tranquilo: para eso existe la Arena. El panel de Q-Graders lo evaluará a ciegas.</p>
        </div>

        <div className={styles.fsec}>
          <h3><span className={styles.fn}>06</span> Caracterización Física · Granulometría & Factor</h3>
          <div className={styles.fgrid}>
            <div className={styles.ff}><label>Humedad <small>(%)</small></label><input type="number" step="0.1" placeholder="0.0" /></div>
            <div className={styles.ff}><label>Actividad de agua <small>(aw)</small></label><input type="number" step="0.001" placeholder="0.000" /></div>
            <div className={styles.ff}><label>Factor de rendimiento</label><input type="number" placeholder="Ej. 88" /></div>
            <div className={styles.ff}><label>Malla 15+ <small>(%)</small></label><input type="number" placeholder="Ej. 5" /></div>
            <div className={`${styles.ff} ${styles.fw}`}><label>Defectos observados</label><input placeholder="Grupo 1 / Grupo 2, breve descripción…" /></div>
          </div>
        </div>

        <div className={styles.fsec}>
          <h3><span className={styles.fn}>07</span> Videos del lote <span className={styles.fn} style={{ color: "var(--muted)" }}>1–2 min c/u</span></h3>
          <div className={styles.fgrid}>
            {[
              { key: "productor", label: "Video del productor y su equipo", small: "(adjunte el archivo · máx. 100 MB)" },
              { key: "finca", label: "Video de la finca", small: "(uno por cada finca · máx. 100 MB)" },
              { key: "cafe", label: "Video del café", small: "(cosecha y poscosecha · máx. 100 MB)" },
            ].map((v) => (
              <div className={`${styles.ff} ${styles.fw}`} key={v.key}>
                <label>{v.label} <small>{v.small}</small></label>
                <input type="file" accept="video/*" onChange={(e) => checkVideo(v.key, e.target.files?.[0])} />
                {videoInfo[v.key]?.text && (
                  <p className={`${styles.fexample} ${videoInfo[v.key].ok ? styles.okv : styles.badv}`}>{videoInfo[v.key].text}</p>
                )}
              </div>
            ))}
          </div>
          <p className={styles.fexample} style={{ marginTop: 10 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); showToast("Videos de muestra y capacitación (demo)"); }} style={{ color: "var(--primary)", fontWeight: 600 }}>
              ▸ Vea los videos de muestra y la capacitación
            </a>{" "}
            — con el celular y buena luz es suficiente.
          </p>
        </div>

        <div className={styles.fsec} style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <label className={styles.chip} style={{ maxWidth: "64ch" }}>
            <input type="checkbox" checked={fields.declaracion} onChange={(e) => set("declaracion", e.target.checked)} /> Declaro que la información
            es veraz y que enviaré la muestra de 2 kg de pergamino marcada con el código del lote.
          </label>
          <button className="btn btn-solid-accent" onClick={save}>Guardar y poner en fila para la Arena</button>
        </div>
      </div>
    </div>
  );
}
