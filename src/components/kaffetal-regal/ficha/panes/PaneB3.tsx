import type { FichaFormData } from "../fichaData";
import { FieldInfo } from "./FieldInfo";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";
import bstyles from "./PaneB3.module.css";

const MESH_INFO: Record<string, string> = {
  mesh_supremo_plus: "Grano retenido en malla 18 (>7.10 mm) — el tamaño más grande, típicamente el de mayor valor comercial.",
  mesh_supremo: "Grano retenido en malla 17 (~6.75–7.10 mm).",
  mesh_extra: "Grano retenido en malla 16 (~6.35–6.75 mm).",
  mesh_europa: "Grano retenido en malla 15 (~6.00–6.35 mm) — tamaño estándar de exportación a mercados europeos.",
  mesh_ugq: "Grano retenido en malla 14 (~5.60–6.00 mm) — Usual Good Quality, un grado por debajo del estándar de exportación.",
  mesh_peaberry: "Grano caracol: un solo grano redondo por cereza en vez de los dos planos habituales — se separa aparte.",
  mesh_residue: "Lo que no pasa por ninguna de las mallas anteriores — polvo, partículas y fragmentos muy pequeños.",
};

type Factor = { start: number; remainder: number; yieldLoss: number; healthy: number; yieldFactor: number | null };
type MeshRow = { key: string; label: string; grams: number; pct: number | null };
type Mesh = {
  rows: MeshRow[];
  sum: number;
  totalPct: number;
  bad: boolean;
  residueGrams: number;
  pendingGrams: number;
  residuePct: number;
  measuredSum: number;
  state: "sin_base" | "vacio" | "excede" | "residuo_alto" | "ok";
};

export function PaneB3({ data, onChange, factor, mesh }: PaneProps & { factor: Factor; mesh: Mesh }) {
  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B3</span> Caracterización Física · Granulometría & Factor</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        El &quot;Trillado Verde Restante&quot; es el dato central: los defectos se restan de él para obtener el Grano Sano, base del Factor de Rendimiento y de la granulometría (las mallas se tamizan sobre el grano ya sano, sin defectos).
      </p>
      <p className={styles.fexample} style={{ marginTop: 4 }}>
        🎥{" "}
        <a href="https://www.youtube.com/watch?v=fLzOAHJkuQg" target="_blank" rel="noopener noreferrer">
          Aprenda aquí cómo calcular el factor de rendimiento
        </a>
        <FieldInfo text="Amigo caficultor, ¿sabe qué es el factor de rendimiento del café y cómo implementarlo? La Cooperativa de Caficultores te enseña cómo se realiza este paso clave en el proceso de compra. 🍒☕" />
      </p>

      <div className={bstyles.layout}>
        <div>
          <div className={bstyles.primary}>
            <label>Trillado Verde Restante (g) ← dato principal<FieldInfo text="El peso de café verde que queda tras trillar el pergamino — el dato base sobre el que se calculan mermas, defectos y el factor de rendimiento." /></label>
            <input type="number" step="0.1" value={data.fa_green_remainder} onChange={(e) => onChange({ fa_green_remainder: e.target.value })} placeholder="212.7" />
          </div>
          <div className={styles.fgrid} style={{ marginTop: 10 }}>
            <div className={styles.ff}>
              <label>Muestra Pergamino Inicial (g)<FieldInfo text="El peso de la muestra de café pergamino antes de trillar — el punto de partida del cálculo físico. El estándar de laboratorio es una muestra de 250 g." /></label>
              <input type="number" step="0.1" value={data.fa_start} onChange={(e) => onChange({ fa_start: e.target.value })} placeholder="250.0" />
            </div>
            <div className={styles.ff}>
              <label>Humedad Pergamino (%)<FieldInfo text="Porcentaje de humedad del café pergamino antes de trillar. Rango aceptable: 10–12%, igual que el grano verde." /></label>
              <input type="number" step="0.1" value={data.fa_parch_hum} onChange={(e) => onChange({ fa_parch_hum: e.target.value })} placeholder="0.0" />
            </div>
          </div>
          <p className={bstyles.divider}>Análisis de mermas y defectos</p>
          <div className={styles.fgrid}>
            <div className={styles.ff}>
              <label>Pérdida por Trilla (g) — derivado<FieldInfo text="Diferencia entre el pergamino inicial y el trillado verde restante — se calcula sola, no se ingresa a mano." /></label>
              <input readOnly value={factor.start > 0 && factor.remainder > 0 ? factor.yieldLoss.toFixed(1) : ""} placeholder="Calculado automáticamente" />
            </div>
            <div className={styles.ff}>
              <label>Grano Sano (g) — derivado<FieldInfo text="El trillado verde restante menos los defectos primario y secundario — la base real del Factor de Rendimiento." /></label>
              <input readOnly value={factor.remainder > 0 ? factor.healthy.toFixed(1) : ""} placeholder="Calculado automáticamente" />
            </div>
            <div className={styles.ff}>
              <label>Defecto Primario (g)<FieldInfo text="Peso en gramos de los defectos físicos más graves (grano negro, agrio, con hongo, etc.). Para grado Especialidad (SCA) sobre una muestra de 350 g: 0 defectos primarios permitidos." /></label>
              <input type="number" step="0.1" value={data.fa_primary_defect} onChange={(e) => onChange({ fa_primary_defect: e.target.value })} placeholder="0.0" />
            </div>
            <div className={styles.ff}>
              <label>Defecto Secundario (g)<FieldInfo text="Peso en gramos de defectos menores (partido, inmaduro, picado, etc.). Para grado Especialidad (SCA) sobre una muestra de 350 g: máximo 5 defectos equivalentes." /></label>
              <input type="number" step="0.1" value={data.fa_secondary_defect} onChange={(e) => onChange({ fa_secondary_defect: e.target.value })} placeholder="0.0" />
            </div>
          </div>
          <div className={bstyles.yieldBox}>
            Factor de Rendimiento: <strong>{factor.yieldFactor !== null ? factor.yieldFactor.toFixed(2) : "—"}</strong>
            <span className={bstyles.yieldNote}>= 70 × Pergamino Inicial ÷ Grano Sano</span>
          </div>

          {/* ── Su propio factor, al lado del calculado (owner, 2026-08-20) ──
              Muchos caficultores YA conocen el factor de su café: se lo da la
              cooperativa en cada compra. El campo existía, pero enterrado en B1
              —otra sub-etapa, otra pantalla—, así que aquí, donde el número se
              está calculando delante de sus ojos, no había forma de decir «a mí
              me dio otro». Es OPCIONAL y no toca el cálculo: se guarda aparte
              (`yield_factor_producer`) y viaja a CTC como lo que es, un dato
              declarado por el productor, para contrastarlo con el de
              laboratorio. */}
          <div className={styles.ff} style={{ marginTop: 12 }}>
            <label>
              Su factor de rendimiento <small>(opcional)</small>
              <FieldInfo text="Si su cooperativa o su propia trilla ya le dio un factor para este café, escríbalo aquí. No reemplaza al calculado arriba: los dos viajan juntos y CTC contrasta el suyo con el del laboratorio. Dejarlo vacío no le resta nada a su ficha." />
            </label>
            <input
              value={data.yield_factor_producer}
              onChange={(e) => onChange({ yield_factor_producer: e.target.value })}
              placeholder="Ej. 92.5 — kg de pergamino por 70 kg de verde"
            />
            {data.yield_factor_producer.trim() !== "" && factor.yieldFactor !== null && (
              <p className={styles.fexample} style={{ marginTop: 4 }}>
                {(() => {
                  const suyo = Number(data.yield_factor_producer.replace(",", "."));
                  if (!Number.isFinite(suyo) || suyo <= 0) return "Escriba solo el número (por ejemplo 92.5).";
                  const dif = Math.abs(suyo - factor.yieldFactor);
                  return dif <= 2
                    ? `✓ Su factor y el calculado se parecen (diferencia de ${dif.toFixed(1)}).`
                    : `Su factor difiere en ${dif.toFixed(1)} del calculado aquí. No es un error: puede que la muestra no sea la misma. CTC lo tendrá en cuenta.`;
                })()}
              </p>
            )}
          </div>
        </div>

        <div>
          {/* Qué hay que hacer aquí, antes de la tabla. Sin esto, la tabla es
              siete casillas sin instrucción: el owner no sabía «qué debo poner».
              Se dice el método (tamizar el GRANO SANO, no el trillado entero) y
              se recuerda que el Residuo no se teclea. */}
          <p className={styles.fexample} style={{ marginTop: 0, marginBottom: 8 }}>
            Tamice el <b>grano sano</b> (el trillado verde ya sin defectos) por cada malla y pese lo que quede retenido en
            cada una. El <b>Residuo</b> no se escribe: es lo que sobra y se calcula solo.
          </p>
          <div className={bstyles.tblWrap}>
          <table className={bstyles.tbl}>
            <thead>
              <tr><th>Granulometría</th><th style={{ textAlign: "right" }}>Peso (g)</th><th style={{ textAlign: "right" }}>%</th></tr>
            </thead>
            <tbody>
              {mesh.rows.map((r) => {
                // El Residuo no se digita: es la diferencia que lleva la suma
                // siempre a 100% del grano sano -- se calcula solo y su % va
                // en rojo para que se lea como "lo que se pierde".
                const isResidue = r.key === "mesh_residue";
                return (
                  <tr key={r.key}>
                    <td>{r.label}{MESH_INFO[r.key] && <FieldInfo text={MESH_INFO[r.key]} />}</td>
                    <td>
                      {isResidue ? (
                        <input readOnly value={factor.healthy > 0 ? mesh.residueGrams.toFixed(1) : ""} placeholder="Se calcula solo" />
                      ) : (
                        <input
                          type="number"
                          step="0.1"
                          value={data[r.key as keyof FichaFormData] as string}
                          onChange={(e) => onChange({ [r.key]: e.target.value } as Partial<FichaFormData>)}
                          placeholder="0.0"
                        />
                      )}
                    </td>
                    <td className={bstyles.pct} style={isResidue ? { color: "var(--red, #C4402F)", fontWeight: 700 } : undefined}>
                      {r.pct !== null ? r.pct.toFixed(1) + "%" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total mallas</td>
                <td className={bstyles.pct}>{mesh.sum.toFixed(1)} g</td>
                <td className={bstyles.pct}>{factor.healthy > 0 ? mesh.totalPct.toFixed(1) + "%" : "—"}</td>
              </tr>
            </tfoot>
          </table>
          </div>
          {/* ── El veredicto, en los dos sentidos ──────────────────────────
              El aviso viejo enseñaba «Suma de mallas: 100,0 %» pasara lo que
              pasara mientras no se excediera el grano sano, porque el Residuo
              tapaba cualquier hueco. Aquí se dice lo que de verdad ocurre: si
              se pasó, en cuánto; si falta por pesar, cuántos gramos; y si está
              bien, que está bien. Ver el comentario de computeMesh(). */}
          <div className={`${bstyles.meshAlert} ${mesh.state === "excede" || mesh.state === "residuo_alto" ? bstyles.meshBad : ""}`}>
            {mesh.state === "sin_base" ? (
              <>Escriba primero el <b>Trillado Verde Restante</b> y los defectos: la granulometría se mide sobre el <b>Grano Sano</b>, y sin él no hay contra qué comparar.</>
            ) : mesh.state === "vacio" ? (
              <>Grano sano: <b>{factor.healthy.toFixed(1)} g</b> por repartir entre las mallas. Todavía no ha pesado ninguna.</>
            ) : mesh.state === "excede" ? (
              <>
                <b>Se pasó por {Math.abs(mesh.pendingGrams).toFixed(1)} g.</b> Las mallas suman {mesh.measuredSum.toFixed(1)} g,
                más que los {factor.healthy.toFixed(1)} g de grano sano. Revise la balanza o el Trillado Verde Restante — una
                malla no puede contener grano que no existe.
              </>
            ) : mesh.state === "residuo_alto" ? (
              <>
                <b>Faltan mallas por pesar.</b> Quedan <b>{mesh.pendingGrams.toFixed(1)} g</b> sin repartir
                ({mesh.residuePct.toFixed(0)} % del grano sano), y eso es demasiado para ser residuo real —el polvo y los
                fragmentos rara vez pasan del 5 %—. Pese las mallas que le falten.
              </>
            ) : (
              <>
                ✓ Cuadra: {mesh.measuredSum.toFixed(1)} g repartidos en mallas y {mesh.residueGrams.toFixed(1)} g de residuo
                ({mesh.residuePct.toFixed(1)} %) sobre {factor.healthy.toFixed(1)} g de grano sano.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
