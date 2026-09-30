import { FieldInfo } from "./FieldInfo";
import { ReportFiles } from "./ReportFiles";
import { FichasDelLote } from "./FichasDelLote";
import { almendraDesdeFactor, factorDesdeAlmendra, B3_MUESTRA_G } from "../fichaCalculations";
import type { LotFicha } from "@/lib/fichas/tipos";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";
import bstyles from "./PaneB3.module.css";

// ── B3 · Caracterización Física (rediseño V5.20; afinado V5.21 y V5.64) ─────
// Igual que B2, el productor ya no llena la granulometría malla a malla. Los
// NÚMEROS van siempre a la vista (owner, V5.21): factor (75–120) y almendra
// total (150–245 g) arriba, y las humedades y la densidad opcionales abajo.
// Dos caminos para COMPLETAR (V5.109, owner 2026-09-30: es o lo uno o lo otro, como en B2):
//   · «No lo sé / solo información básica» (`b3_solo_basica`): los números quedan OPCIONALES — si conoce el factor
//     o la almendra total, UNO de los dos basta, porque son la misma medida y el que falte se DERIVA (V5.64, owner:
//     factor × AT = 17.500, ver almendraDesdeFactor/factorDesdeAlmendra en fichaCalculations).
//   · «Tengo un reporte de laboratorio» (`b3_tiene_reporte`): factor o almendra + al menos un soporte (PDF o foto)
//     + quién lo emitió, obligatorios. Y con eso sale sola la solicitud de oficialización (FichaView).
// La Densidad en Verde dejó de ser obligatoria en la V5.64 (owner) y bajó al
// bloque opcional, junto a las humedades.
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
  fichas = [],
}: PaneProps & {
  onUploadFile: (subpath: string, file: File, onProgress?: (fraction: number) => void) => Promise<{ assetId: string } | { error: string }>;
  onGetFileUrl: (assetId: string) => Promise<string | null>;
  /** V5.23: el set de Fichas Técnicas del lote — se lista al final del pane. */
  fichas?: LotFicha[];
}) {
  const fueraDeRango = (v: string, r: { min: number; max: number }) => v.trim() !== "" && !rangoValido(v, r);
  const conReporte = data.b3_tiene_reporte;
  const faltaSoporte = conReporte && data.b3_files_pdf.length + data.b3_files_foto.length === 0;

  // El par factor ↔ almendra: el productor reporta UNO y el otro se DERIVA.
  // Se muestra, no se guarda — así el OCP siempre sabe cuál de los dos declaró
  // (ALINEACION §1: «lo derivado no se persiste»).
  const factorOk = rangoValido(data.yield_factor_producer, B3_RANGOS.factor);
  const almendraOk = rangoValido(data.b3_almendra_total, B3_RANGOS.almendra);
  const almendraDerivada = !almendraOk && factorOk ? almendraDesdeFactor(num(data.yield_factor_producer)) : null;
  const factorDerivado = !factorOk && almendraOk ? factorDesdeAlmendra(num(data.b3_almendra_total)) : null;
  const derivado = (valor: number | null, unidad: string) =>
    valor == null ? null : (
      <p className={bstyles.derivado}>
        Derivado de lo que reportó: <b>{valor}{unidad}</b>. No hace falta que lo escriba — si lo conoce y no coincide,
        escríbalo y mandará el suyo.
      </p>
    );

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
          Es <b>lo uno o lo otro</b>. Si su cooperativa o un laboratorio ya le hizo el análisis, marque{" "}
          <b>«Tengo un reporte»</b>, escriba el factor <i>o</i> la almendra total y <b>adjunte esa hoja</b> (PDF o fotos) con el
          nombre de quien la emitió: con eso mismo CTC verifica y oficializa. Si no tiene análisis, marque{" "}
          <b>«No lo sé»</b> — y si conoce alguno de los dos números, repórtelo, que con uno basta.
        </p>
        <p className={styles.fexample} style={{ marginTop: 8 }}>
          🎥{" "}
          <a href="https://www.youtube.com/watch?v=fLzOAHJkuQg" target="_blank" rel="noopener noreferrer">
            Aprenda aquí cómo se calcula el factor de rendimiento
          </a>
          <FieldInfo text="Amigo caficultor, ¿sabe qué es el factor de rendimiento del café y cómo implementarlo? La Cooperativa de Caficultores te enseña cómo se realiza este paso clave en el proceso de compra. 🍒☕" />
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Caracterización física: No lo sé o Tengo un reporte">
        <label className={bstyles.toggleBasica}>
          <input
            type="checkbox"
            checked={data.b3_solo_basica}
            onChange={(e) => onChange({ b3_solo_basica: e.target.checked, ...(e.target.checked ? { b3_tiene_reporte: false } : {}) })}
          />{" "}
          No lo sé / solo información básica <small>(sin hoja de análisis; los números son opcionales)</small>
        </label>
        <label className={bstyles.toggleBasica}>
          <input
            type="checkbox"
            checked={conReporte}
            onChange={(e) => onChange({ b3_tiene_reporte: e.target.checked, ...(e.target.checked ? { b3_solo_basica: false } : {}) })}
          />{" "}
          Tengo un reporte de laboratorio <small>(un número, los soportes y quién lo emitió)</small>
        </label>
      </div>

      {/* Los números van SIEMPRE a la vista (owner, 2026-08-21): el productor
          no debería tener que marcar una casilla para descubrir qué se le
          pide. La casilla de arriba solo DECLARA que no habrá soportes — y con
          ella marcada, factor/almendra + densidad completan la sección. */}
      <div className={bstyles.basicaBox}>
          <p className={styles.fexample} style={{ marginTop: 0 }}>
            Reporte <b>uno de los dos</b> — el que le sea más fácil. Son la misma medida dicha de dos maneras, así que
            <b> el otro lo calculamos nosotros</b> a partir del que usted escriba.
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
              {derivado(factorDerivado, "")}
            </div>
            <div className={styles.ff}>
              <label>
                Almendra Total (g · {B3_RANGOS.almendra.min}–{B3_RANGOS.almendra.max})
                <FieldInfo text={`De la muestra de laboratorio de ${B3_MUESTRA_G} g de pergamino, los gramos de almendra (café verde) que quedan al quitar el cisco: AT = ${B3_MUESTRA_G} g − gramos de cisco. Otro número que suele dar la cooperativa. Es el mismo dato que el factor de rendimiento, visto al revés: factor × almendra = ${B3_MUESTRA_G * 70}.`} />
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
              {derivado(almendraDerivada, " g")}
            </div>
          </div>
      </div>

      {conReporte && (
        <div className={styles.ff} style={{ marginTop: 14 }}>
          <label>
            Laboratorio / institución que emitió el reporte<small style={{ fontWeight: 400, color: "var(--red, #C4402F)" }}> · obligatorio</small>
            <FieldInfo text="Quién hizo el análisis físico: el laboratorio, la cooperativa o el comprador que le entregó la hoja. Con esto CTC verifica el reporte." />
          </label>
          <input value={data.b3_reporte_ref} onChange={(e) => onChange({ b3_reporte_ref: e.target.value })} placeholder="Nombre del laboratorio / cooperativa" />
        </div>
      )}

      {/* V5.115 (owner, 2026-09-30): con «No lo sé / solo información básica» no hay nada que adjuntar — los soportes desaparecen. */}
      {data.b3_solo_basica && data.b3_files_pdf.length + data.b3_files_foto.length > 0 && (
        <p className={styles.fexample}>
          Con «No lo sé» no se piden soportes; los {data.b3_files_pdf.length + data.b3_files_foto.length} archivo(s) que ya subió siguen guardados en la Ficha.
        </p>
      )}
      {!data.b3_solo_basica && (
      <ReportFiles
        titulo={conReporte ? "Soportes del reporte · granulometría, factor, densidad — al menos un PDF o una foto (obligatorio)" : "Soportes del análisis físico · granulometría, factor, densidad (hasta 7 PDFs y 7 fotos)"}
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
      )}
      {faltaSoporte && <p className={bstyles.rangoError}>Con «Tengo un reporte» hace falta al menos un soporte: el PDF o una foto de la hoja de análisis.</p>}

      <div className={bstyles.opcionalBox}>
        <p className={styles.fexample} style={{ marginTop: 0, fontWeight: 600, color: "var(--ink)" }}>
          Si además conoce estos números, repórtelos (opcional)
        </p>
        <div className={styles.fgrid}>
          {/* V5.64 (owner): la Densidad en Verde bajó aquí. Sigue siendo el dato
              que más mira un comprador, pero ya no bloquea completar B3 — el que
              no la tenga medida no debería quedarse fuera por eso. */}
          <div className={styles.ff}>
            <label>
              Densidad en Verde (g/L · {B3_RANGOS.densidad.min}–{B3_RANGOS.densidad.max})
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
          <div className={styles.ff}>
            <label>Humedad en Pergamino (%)<FieldInfo text="Porcentaje de humedad del café pergamino. Rango sano: 10–12%." /></label>
            <input type="number" step="0.1" value={data.fa_parch_hum} onChange={(e) => onChange({ fa_parch_hum: e.target.value })} placeholder="Ej. 11.0" />
          </div>
          <div className={styles.ff}>
            <label>Humedad en Verde (%)<FieldInfo text="Porcentaje de humedad del café verde ya trillado. Rango sano: 10–12%." /></label>
            <input type="number" step="0.1" value={data.b3_humedad_verde} onChange={(e) => onChange({ b3_humedad_verde: e.target.value })} placeholder="Ej. 10.5" />
          </div>
        </div>
      </div>

      {/* V5.23: las Fichas Técnicas que CTC compiló de estos soportes —
          la cara física del set, la oficial primero. */}
      <FichasDelLote fichas={fichas} mostrar="fisico" />
    </div>
  );
}
