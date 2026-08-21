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
          entregaron una hoja como las de abajo. <b>No necesita saber catación</b>: reporte el puntaje que le dieron y/o
          adjunte una foto o PDF de esa hoja, y CTC extrae el resto. Si nunca se lo han catado, marque{" "}
          <b>«No lo sé»</b> arriba — el Q-Grader de CTC lo determinará con su muestra.
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

      <p className={bstyles.divider}>Su estimación (Perfil de Taza)</p>
      <div className={styles.fgrid}>
        <div className={styles.ff}>
          <label>
            Puntaje reportado (0–100)
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
            Escala del puntaje
            <FieldInfo text="SCA es la escala clásica de 100 puntos; CVA es el sistema nuevo de evaluación de la misma asociación. Elija la que diga su hoja de catación." />
          </label>
          <select value={data.b2_scale} onChange={(e) => onChange({ b2_scale: e.target.value as "" | "sca" | "cva" })}>
            <option value="">Elegir…</option>
            <option value="sca">SCA</option>
            <option value="cva">CVA</option>
          </select>
        </div>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Perfil de Taza (notas descriptivas, opcional)</label>
          <textarea value={data.cupping_profile} onChange={(e) => onChange({ cupping_profile: e.target.value })} placeholder="En fragancia y aroma se perciben notas a…" />
        </div>
      </div>

      <ReportFiles
        titulo="Soportes del Perfil de Taza · hoja de catación, radar, rueda (hasta 7 PDFs y 7 fotos)"
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
