import { FieldInfo } from "./FieldInfo";
import { ReportFiles } from "./ReportFiles";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";
import bstyles from "./PaneB3.module.css";

// ── B3 · Caracterización Física (rediseño V5.20, owner 2026-08-21) ──────────
// Igual que B2, el productor ya no llena la granulometría malla a malla. Dos
// caminos, y basta con uno:
//   · «Solo sé información básica»: el Factor de Rendimiento (75–120) y/o la
//     Almendra Total (150–245 g; AT = 205 g − gramos de cisco), y la Densidad
//     en Verde (600–1000 g/L) que aquí es OBLIGATORIA.
//   · Adjuntar al menos un soporte (PDF o foto del análisis físico), con un
//     bloque opcional de Humedad en Pergamino, Humedad en Verde y Densidad en
//     Verde.
// Todo viaja con B2 como «Reportado por Productor». El detalle completo
// (mallas, defectos, factor de laboratorio) nace después, cuando CTCx analiza
// los soportes y compila las Fichas Técnicas del lote — aquí se listarán al
// existir. Los campos viejos (mesh_*, fa_*) siguen en el tipo por los
// datasheets guardados antes; computeFactor/computeMesh siguen vivos para el
// laboratorio del OCP.

// Rangos del owner (2026-08-21). Fuera de rango no se envía.
export const B3_RANGOS = {
  factor: { min: 75, max: 120 },
  almendra: { min: 150, max: 245 },
  densidad: { min: 600, max: 1000 },
} as const;

function num(v: string): number {
  return Number(v.replace(",", "."));
}

export function rangoValido(v: string, r: { min: number; max: number }): boolean {
  if (v.trim() === "") return false;
  const n = num(v);
  return Number.isFinite(n) && n >= r.min && n <= r.max;
}

export function PaneB3({
  data,
  onChange,
  lot,
  viewingLocked,
  onUploadFile,
  onGetFileUrl,
}: PaneProps & {
  onUploadFile: (subpath: string, file: File, onProgress?: (fraction: number) => void) => Promise<{ assetId: string } | { error: string }>;
  onGetFileUrl: (assetId: string) => Promise<string | null>;
}) {
  const fueraDeRango = (v: string, r: { min: number; max: number }) => v.trim() !== "" && !rangoValido(v, r);
  const tieneAdjuntos = data.b3_files_pdf.length + data.b3_files_foto.length > 0;

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B3</span> Caracterización Física</h3>
      <p className={styles.reportadoTag}>Reportado por Productor · junto con B2 forma su reporte del café</p>

      <div className={bstyles.intro}>
        <p className={bstyles.introBig}>
          La <b>caracterización física</b> dice cuánto café exportable hay de verdad en su pergamino: el factor de
          rendimiento, el tamaño del grano y su densidad.
        </p>
        <p className={bstyles.introSub}>
          Si su cooperativa o un laboratorio ya le hizo el análisis, <b>adjunte esa hoja</b> (PDF o fotos) y CTC extrae
          el detalle. Si solo conoce los números básicos —el factor que le dan al comprarle, o la almendra total—
          marque <b>«Solo sé información básica»</b> y repórtelos aquí.
        </p>
        <p className={styles.fexample} style={{ marginTop: 8 }}>
          🎥{" "}
          <a href="https://www.youtube.com/watch?v=fLzOAHJkuQg" target="_blank" rel="noopener noreferrer">
            Aprenda aquí cómo se calcula el factor de rendimiento
          </a>
          <FieldInfo text="Amigo caficultor, ¿sabe qué es el factor de rendimiento del café y cómo implementarlo? La Cooperativa de Caficultores te enseña cómo se realiza este paso clave en el proceso de compra. 🍒☕" />
        </p>
      </div>

      <label className={bstyles.toggleBasica}>
        <input
          type="checkbox"
          checked={data.b3_solo_basica}
          onChange={(e) => onChange({ b3_solo_basica: e.target.checked })}
        />{" "}
        Solo sé información básica <small>(sin hoja de análisis que adjuntar)</small>
      </label>

      {data.b3_solo_basica && (
        <div className={bstyles.basicaBox}>
          <p className={styles.fexample} style={{ marginTop: 0 }}>
            Reporte <b>al menos uno</b> de los dos primeros; la <b>Densidad en Verde</b> es obligatoria.
          </p>
          <div className={styles.fgrid}>
            <div className={styles.ff}>
              <label>
                Factor de Rendimiento ({B3_RANGOS.factor.min}–{B3_RANGOS.factor.max})
                <FieldInfo text="Los kilos de pergamino que se necesitan para 70 kg de café verde excelso. Se lo da la cooperativa en cada compra; entre más bajo, mejor rinde su café." />
              </label>
              <input
                type="number"
                step="0.1"
                value={data.yield_factor_producer}
                onChange={(e) => onChange({ yield_factor_producer: e.target.value })}
                placeholder="Ej. 92.5"
              />
              {fueraDeRango(data.yield_factor_producer, B3_RANGOS.factor) && (
                <p className={bstyles.rangoError}>Debe estar entre {B3_RANGOS.factor.min} y {B3_RANGOS.factor.max}.</p>
              )}
            </div>
            <div className={styles.ff}>
              <label>
                Almendra Total (g · {B3_RANGOS.almendra.min}–{B3_RANGOS.almendra.max})
                <FieldInfo text="De una muestra de 205 g de pergamino, los gramos de almendra (café verde) que quedan al quitar el cisco: AT = 205 g − gramos de cisco. Otro número que suele dar la cooperativa." />
              </label>
              <input
                type="number"
                step="0.1"
                value={data.b3_almendra_total}
                onChange={(e) => onChange({ b3_almendra_total: e.target.value })}
                placeholder="Ej. 168.0"
              />
              {fueraDeRango(data.b3_almendra_total, B3_RANGOS.almendra) && (
                <p className={bstyles.rangoError}>Debe estar entre {B3_RANGOS.almendra.min} y {B3_RANGOS.almendra.max} g.</p>
              )}
            </div>
            <div className={styles.ff}>
              <label>
                Densidad en Verde (g/L · {B3_RANGOS.densidad.min}–{B3_RANGOS.densidad.max}) · obligatoria
                <FieldInfo text="Cuánto pesa un litro de su café verde. Un grano denso (más de 700 g/L) suele venir de buena altura y desarrollarse completo — es de los primeros números que mira un comprador." />
              </label>
              <input
                type="number"
                step="1"
                value={data.b3_densidad_verde}
                onChange={(e) => onChange({ b3_densidad_verde: e.target.value })}
                placeholder="Ej. 720"
              />
              {fueraDeRango(data.b3_densidad_verde, B3_RANGOS.densidad) && (
                <p className={bstyles.rangoError}>Debe estar entre {B3_RANGOS.densidad.min} y {B3_RANGOS.densidad.max} g/L.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <ReportFiles
        titulo="Soportes del análisis físico · granulometría, factor, densidad (hasta 7 PDFs y 7 fotos)"
        pdfs={data.b3_files_pdf}
        fotos={data.b3_files_foto}
        subpathBase={`lots/${lot.id}/b3`}
        locked={!!viewingLocked}
        onChange={(patch) =>
          onChange({
            ...(patch.pdfs ? { b3_files_pdf: patch.pdfs } : {}),
            ...(patch.fotos ? { b3_files_foto: patch.fotos } : {}),
          })
        }
        onUploadFile={onUploadFile}
        onGetFileUrl={onGetFileUrl}
      />

      {tieneAdjuntos && (
        <div className={bstyles.opcionalBox}>
          <p className={styles.fexample} style={{ marginTop: 0, fontWeight: 600, color: "var(--ink)" }}>
            Si además conoce estos números, repórtelos (opcional)
          </p>
          <div className={styles.fgrid}>
            <div className={styles.ff}>
              <label>Humedad en Pergamino (%)<FieldInfo text="Porcentaje de humedad del café pergamino. Rango sano: 10–12%." /></label>
              <input type="number" step="0.1" value={data.fa_parch_hum} onChange={(e) => onChange({ fa_parch_hum: e.target.value })} placeholder="Ej. 11.0" />
            </div>
            <div className={styles.ff}>
              <label>Humedad en Verde (%)<FieldInfo text="Porcentaje de humedad del café verde ya trillado. Rango sano: 10–12%." /></label>
              <input type="number" step="0.1" value={data.b3_humedad_verde} onChange={(e) => onChange({ b3_humedad_verde: e.target.value })} placeholder="Ej. 10.5" />
            </div>
            <div className={styles.ff}>
              <label>Densidad en Verde (g/L)<FieldInfo text="Cuánto pesa un litro de su café verde — aquí es opcional porque su hoja adjunta normalmente ya la trae." /></label>
              <input type="number" step="1" value={data.b3_densidad_verde} onChange={(e) => onChange({ b3_densidad_verde: e.target.value })} placeholder="Ej. 720" />
              {fueraDeRango(data.b3_densidad_verde, B3_RANGOS.densidad) && (
                <p className={bstyles.rangoError}>Debe estar entre {B3_RANGOS.densidad.min} y {B3_RANGOS.densidad.max} g/L.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
