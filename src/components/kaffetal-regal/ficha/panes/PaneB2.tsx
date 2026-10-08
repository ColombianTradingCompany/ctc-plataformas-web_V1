import { SpiderChart } from "../SpiderChart";
import { FieldInfo } from "./FieldInfo";
import { ReportFiles } from "./ReportFiles";
import { FichasDelLote } from "./FichasDelLote";
import type { LotFicha } from "@/lib/fichas/tipos";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";
import bstyles from "./PaneB2.module.css";

// ── B2 · Perfil de Taza (rediseño V5.20, owner 2026-08-21) ──────────────────
// El productor YA NO digita los diez atributos SCA: o marca «No lo sé» (la
// casilla vive arriba, en la barra del pane), o reporta SU ESTIMACIÓN —
// puntaje + escala (SCA/CVA) + notas — y/o adjunta sus soportes (la hoja de
// catación en PDF o fotos, hasta 7 de cada una). Todo viaja como «Reportado
// por Productor»; el detalle atributo por atributo nace después, cuando CTCx
// analiza los soportes y compila las Fichas Técnicas del lote (seguimiento:
// el escáner visual del OCP — aquí mismo se listarán esas Fichas al existir).
// Como la pantalla queda liviana, lleva una explicación grande y dos bocetos
// de cómo suelen verse estos documentos (red de araña y rueda de sabores).
// V5.109 (owner, 2026-09-30): es O LO UNO O LO OTRO. «No lo sé» deja el puntaje, la escala y el perfil OPCIONALES;
// «Tengo un reporte de catación» los hace obligatorios junto con los soportes (PDF o fotos) y el nombre del Q-Grader /
// institución que lo emitió — y ESA es la solicitud de oficialización (antes se pedía aparte, con otro adjunto: era lo mismo).
// Las dos casillas se excluyen; la que se marca desmarca a la otra.

// Valores de MUESTRA para el boceto de la red de araña — no son datos.
const SKETCH_VALUES = [8, 7.75, 7.5, 7.75, 8, 7.75, 10, 10, 10, 8];

function TasteWheelSketch() {
  // Boceto minimalista de una rueda de sabores: anillos + radios + tres
  // sectores insinuados. Es ilustrativo, no interactivo.
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 12;
    return [Math.cos(a), Math.sin(a)];
  });
  return (
    <svg viewBox="-80 -80 160 160" aria-hidden className={bstyles.wheelSvg}>
      <circle r="72" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.85" />
      <circle r="48" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      <circle r="24" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      {spokes.map(([x, y], i) => (
        <line key={i} x1={x * 24} y1={y * 24} x2={x * 72} y2={y * 72} stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      ))}
      <path d="M 0 -24 A 24 24 0 0 1 20.8 -12 L 41.6 -24 A 48 48 0 0 0 0 -48 Z" fill="var(--accent, #C8102F)" opacity="0.35" />
      <path d="M 20.8 12 A 24 24 0 0 1 0 24 L 0 48 A 48 48 0 0 0 41.6 24 Z" fill="var(--primary, #3C0A86)" opacity="0.3" />
      <path d="M -24 0 A 24 24 0 0 1 -12 -20.8 L -24 -41.6 A 48 48 0 0 0 -48 0 Z" fill="var(--gold, #A87A14)" opacity="0.35" />
    </svg>
  );
}

export function PaneB2({
  data,
  onChange,
  lot,
  viewingLocked,
  onUploadFile,
  onGetFileUrl,
  fichas = [],
}: PaneProps & {
  onUploadFile: (subpath: string, file: File, onProgress?: (fraction: number) => void) => Promise<{ assetId: string } | { error: string }>;
  onGetFileUrl: (assetId: string) => Promise<string | null>;
  /** V5.23: el set de Fichas Técnicas del lote — se lista al final del pane. */
  fichas?: LotFicha[];
}) {
  const score = Number(data.b2_score.replace(",", "."));
  const scoreValido = data.b2_score.trim() !== "" && Number.isFinite(score) && score >= 0 && score <= 100;
  const conReporte = data.b2_tiene_reporte;
  const obligatorio = (si: boolean) => (si ? <small style={{ fontWeight: 400, color: "var(--red, #C4402F)" }}> · obligatorio</small> : <small style={{ fontWeight: 400, color: "var(--muted)" }}> · opcional</small>);
  const faltaSoporte = conReporte && data.b2_files_pdf.length + data.b2_files_foto.length === 0;

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B2</span> Perfil de Taza · Puntaje</h3>
      <p className={styles.reportadoTag}>Reportado por Productor · junto con B3 forma su reporte del café</p>

      {/* La explicación GRANDE: qué es esto y por qué no hay que saberlo. */}
      <div className={bstyles.intro}>
        <p className={bstyles.introBig}>
          El <b>Perfil de Taza</b> es la evaluación sensorial de su café: un catador certificado lo prueba y le da un{" "}
          <b>puntaje</b> (0–100) junto a notas de aroma y sabor.
        </p>
        <p className={bstyles.introSub}>
          Si alguna vez le han catado este café —la cooperativa, un laboratorio, un comprador— probablemente le
          entregaron una hoja como las de abajo. <b>No necesita saber catación</b>. Es <b>lo uno o lo otro</b>: si tiene esa hoja, marque{" "}
          <b>«Tengo un reporte»</b>, escriba el puntaje y adjúntela con el nombre de quien la firmó — con eso mismo CTCx
          revisa y oficializa su puntaje. Si nunca se lo han catado, marque <b>«No lo sé»</b>: puede dejar su estimación
          si la tiene, y el Q-Grader de CTCx lo determinará con su muestra.
        </p>
      </div>

      {/* Los dos bocetos: así suelen verse estos documentos. */}
      <div className={bstyles.sketches} aria-hidden>
        <figure className={bstyles.sketch}>
          <SpiderChart values={SKETCH_VALUES} />
          <figcaption className={bstyles.cap}>La «red de araña»: los 10 atributos SCA en un radar</figcaption>
        </figure>
        <figure className={bstyles.sketch}>
          <TasteWheelSketch />
          <figcaption className={bstyles.cap}>La rueda de sabores: las notas de cata por familias</figcaption>
        </figure>
      </div>

      <p className={bstyles.divider}>Su Perfil de Taza · elija uno</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 12px" }} role="group" aria-label="Perfil de Taza: No lo sé o Tengo un reporte">
        <label className={styles.chip}>
          <input type="checkbox" checked={data.ft2_b2_na} onChange={(e) => onChange({ ft2_b2_na: e.target.checked, ...(e.target.checked ? { b2_tiene_reporte: false } : {}) })} />{" "}
          No lo sé <small style={{ fontWeight: 400, color: "var(--muted)" }}>(nunca le han catado este café; lo de abajo es opcional)</small>
        </label>
        <label className={styles.chip}>
          <input type="checkbox" checked={conReporte} onChange={(e) => onChange({ b2_tiene_reporte: e.target.checked, ...(e.target.checked ? { ft2_b2_na: false } : {}) })} />{" "}
          Tengo un reporte de catación <small style={{ fontWeight: 400, color: "var(--muted)" }}>(puntaje, escala, perfil, soportes y quién lo emitió)</small>
        </label>
      </div>
      <div className={styles.fgrid}>
        <div className={styles.ff}>
          <label>
            Puntaje reportado (0–100){obligatorio(conReporte)}
            <FieldInfo text="El puntaje total que le dieron a este café. En la escala SCA, 80 o más ya es café de especialidad." />
          </label>
          <input
            type="number"
            step="0.25"
            min={0}
            max={100}
            value={data.b2_score}
            onChange={(e) => onChange({ b2_score: e.target.value })}
            placeholder="Ej. 84.50"
          />
          {data.b2_score.trim() !== "" && !scoreValido && (
            <p className={styles.fexample} style={{ color: "var(--red, #C4402F)" }}>El puntaje va de 0 a 100.</p>
          )}
        </div>
        <div className={styles.ff}>
          <label>
            Escala del puntaje{obligatorio(conReporte)}
            <FieldInfo text="SCA es la escala clásica de 100 puntos; CVA es el sistema nuevo de evaluación de la misma asociación. Elija la que diga su hoja de catación." />
          </label>
          <select value={data.b2_scale} onChange={(e) => onChange({ b2_scale: e.target.value as "" | "sca" | "cva" })}>
            <option value="">Elegir…</option>
            <option value="sca">SCA</option>
            <option value="cva">CVA</option>
          </select>
        </div>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Perfil de Taza (notas descriptivas){obligatorio(conReporte)}</label>
          <textarea value={data.cupping_profile} onChange={(e) => onChange({ cupping_profile: e.target.value })} placeholder="En fragancia y aroma se perciben notas a…" />
        </div>
      </div>

      {conReporte && (
        <div className={styles.ff} style={{ marginTop: 14 }}>
          <label>
            Q-Grader / institución que emitió el reporte<small style={{ fontWeight: 400, color: "var(--red, #C4402F)" }}> · obligatorio</small>
            <FieldInfo text="Quién firmó la hoja de catación: el nombre del Q-Grader, o el laboratorio o la cooperativa, y su certificación si la tiene. Con esto CTCx verifica el reporte y oficializa su puntaje." />
          </label>
          <input value={data.b2_reporte_ref} onChange={(e) => onChange({ b2_reporte_ref: e.target.value })} placeholder="Nombre del Q-Grader / laboratorio · certificación" />
        </div>
      )}

      {/* V5.115 (owner, 2026-09-30): con «No lo sé» marcado no hay nada que adjuntar — los soportes desaparecen. Si ya había
          archivos subidos, se dicen en una línea (siguen guardados en la Ficha) para que nadie crea que se perdieron. */}
      {data.ft2_b2_na && data.b2_files_pdf.length + data.b2_files_foto.length > 0 && (
        <p className={styles.fexample}>
          Con «No lo sé» no se piden soportes; los {data.b2_files_pdf.length + data.b2_files_foto.length} archivo(s) que ya subió siguen guardados en la Ficha.
        </p>
      )}
      {!data.ft2_b2_na && (
      <ReportFiles
        titulo={conReporte ? "Soportes del reporte · hoja de catación, radar, rueda — al menos un PDF o una foto (obligatorio)" : "Soportes del Perfil de Taza · hoja de catación, radar, rueda (hasta 7 PDFs y 7 fotos)"}
        pdfs={data.b2_files_pdf}
        fotos={data.b2_files_foto}
        subpathBase={`lots/${lot.id}/b2`}
        locked={!!viewingLocked}
        onChange={(patch) =>
          onChange({
            ...(patch.pdfs ? { b2_files_pdf: patch.pdfs } : {}),
            ...(patch.fotos ? { b2_files_foto: patch.fotos } : {}),
          })
        }
        onUploadFile={onUploadFile}
        onGetFileUrl={onGetFileUrl}
      />
      )}
      {faltaSoporte && <p className={styles.fexample} style={{ color: "var(--red, #C4402F)" }}>Con «Tengo un reporte» hace falta al menos un soporte: el PDF o una foto de la hoja de catación.</p>}

      {/* El bloque «Notas de Análisis & Referencia Q-Grader» salió de B2
          (owner, 2026-08-21): esa información no es del reporte del productor
          — la referencia del Q-Grader vive en «Solicitar oficialización» (al
          pie de la Ficha) y las notas de análisis son del laboratorio. Los
          campos quedan en el tipo por los datasheets guardados antes. */}

      {/* V5.23: las Fichas Técnicas que CTC compiló de estos soportes —
          la cara sensorial del set, la oficial primero. */}
      <FichasDelLote fichas={fichas} mostrar="sensorial" />
    </div>
  );
}
