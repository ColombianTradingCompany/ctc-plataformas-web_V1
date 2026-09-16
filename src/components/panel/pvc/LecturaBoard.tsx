import styles from "@/components/panel/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import { GRADOS } from "@/lib/grados/definicion";
import { BANDAS5, type Banda5 } from "@/lib/pvc/motor";
import {
  CARGA_KG_CPS, SACO_KG_CPS, admiteSaco, desviacionDeMercado, embudoDeCarga, empaqueDe,
  holguraDisparador, incrementoCargas, moqCargas, primaMinima, sobreBasePergamino, verdeFobCop,
} from "@/lib/pvc/lectura";
import type { PvcEdition } from "@/lib/pvc/tipos";
import type { LecturaMercado } from "@/lib/pvc/servicio";

// ── BCP · Modelo Económico · Lectura ─────────────────────────────────────────
// Qué significa HOY la edición que rige (docs/PVC_BCP_PLAN.md §11.5). No
// recalcula ni publica nada: el precio está fijado por tres meses y esta
// pantalla mide la distancia entre lo que se fijó y lo que el mercado hace.
//
// Las tres cifras del owner, cada una con su dibujo:
//   · % de prima mínima      → la regla de precios (la escalera contra el FNC)
//   · $ sobre base pergamino → la carga apilada
//   · COP/kg de verde FOB    → el embudo de una carga (que además explica el MOQ)

const cop0 = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const pct = (v: number | null | undefined, d = 1) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d).replace(".", ",")} %`;
const num = (v: number | null | undefined, d = 0) =>
  v == null ? "—" : v.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const day = (d: string | null | undefined) =>
  d ? new Date(d.length > 10 ? d : `${d}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const HEX: Record<string, string> = Object.fromEntries(GRADOS.map((g) => [g.nombre, g.hex]));

function IconoRegla() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 17h18M6 17v-4M11 17v-8M16 17v-11M21 17v-3" strokeLinecap="round" />
    </svg>
  );
}
function IconoCarga() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 20h16M6 20V9l6-4 6 4v11" strokeLinejoin="round" />
      <path d="M9 20v-5h6v5" strokeLinejoin="round" />
    </svg>
  );
}
function IconoEmbudo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 4h18l-7 8v8l-4-2v-6z" strokeLinejoin="round" />
    </svg>
  );
}

/** La regla de precios: el FNC de hoy y los cuatro escalones de la casa, a
 *  escala real desde cero. El tramo sombreado entre el FNC y Black ES la prima
 *  mínima — el KPI y su explicación en el mismo dibujo. */
function ReglaDePrecios({ fnc, escalones }: { fnc: number; escalones: { banda: string; cop: number }[] }) {
  const W = 720, H = 132, L = 8, R = 8;
  const max = Math.max(fnc, ...escalones.map((e) => e.cop)) * 1.06;
  const x = (v: number) => L + (v / max) * (W - L - R);
  const yBar = 52, hBar = 22;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
         aria-label="Regla de precios: el precio de la Federación y los escalones de la casa">
      {/* el tramo de la prima */}
      <rect x={x(fnc)} y={yBar} width={Math.max(0, x(escalones[0]?.cop ?? fnc) - x(fnc))} height={hBar}
            fill={HEX.Black ?? "#1A1C1E"} opacity="0.14" />
      {/* la barra base hasta el FNC */}
      <rect x={L} y={yBar} width={x(fnc) - L} height={hBar} fill="var(--line)" />
      <line x1={L} x2={W - R} y1={yBar + hBar} y2={yBar + hBar} stroke="var(--line)" strokeWidth="1" />
      {/* el FNC */}
      <line x1={x(fnc)} x2={x(fnc)} y1={yBar - 14} y2={yBar + hBar + 10} stroke="var(--ink)" strokeWidth="2" />
      <text x={x(fnc)} y={yBar - 20} textAnchor="middle" fontSize="11" fill="var(--ink)" fontWeight="600">FNC hoy</text>
      <text x={x(fnc)} y={yBar + hBar + 24} textAnchor="middle" fontSize="10.5" fill="var(--muted)">{cop0(fnc)}</text>
      {/* los escalones */}
      {escalones.map((e, i) => {
        const px = x(e.cop);
        const arriba = i % 2 === 0;
        return (
          <g key={e.banda}>
            <line x1={px} x2={px} y1={arriba ? yBar - 10 : yBar + hBar} y2={arriba ? yBar : yBar + hBar + 10}
                  stroke={HEX[e.banda] ?? "var(--ink)"} strokeWidth="2" />
            <circle cx={px} cy={arriba ? yBar - 14 : yBar + hBar + 14} r="4.5" fill={HEX[e.banda] ?? "var(--ink)"} />
            <text x={px} y={arriba ? yBar - 22 : yBar + hBar + 30} textAnchor="middle" fontSize="10.5"
                  fill={HEX[e.banda] ?? "var(--ink)"} fontWeight="600">{e.banda}</text>
            <text x={px} y={arriba ? yBar - 34 : yBar + hBar + 42} textAnchor="middle" fontSize="9.5" fill="var(--muted)">
              {cop0(e.cop)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** La carga apilada: lo que paga la Federación por una carga, y encima lo que
 *  añade el escalón más bajo de la casa. */
function CargaApilada({ fnc, black }: { fnc: number; black: number }) {
  const W = 220, H = 190, bw = 86, x0 = (W - bw) / 2;
  const max = black * 1.08;
  const h = (v: number) => (v / max) * (H - 34);
  const hFnc = h(fnc), hSpread = h(black - fnc);
  const yFnc = H - 18 - hFnc, ySpread = yFnc - hSpread;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 240, height: "auto", display: "block" }} role="img"
         aria-label="Una carga: la base de la Federación y el sobreprecio de la casa">
      <rect x={x0} y={ySpread} width={bw} height={hSpread} fill={HEX.Black ?? "#1A1C1E"} opacity="0.85" />
      <rect x={x0} y={yFnc} width={bw} height={hFnc} fill="var(--line)" />
      <line x1={x0 - 6} x2={x0 + bw + 6} y1={H - 18} y2={H - 18} stroke="var(--line)" strokeWidth="1" />
      <text x={W / 2} y={ySpread + hSpread / 2 + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">
        +{num((black - fnc) / 1000)}k
      </text>
      <text x={W / 2} y={yFnc + hFnc / 2 + 4} textAnchor="middle" fontSize="11" fill="var(--muted)" fontWeight="600">
        {num(fnc / 1000)}k
      </text>
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--muted)">1 carga · {CARGA_KG_CPS} kg CPS</text>
    </svg>
  );
}

/** El embudo de una carga: de pergamino a unidades de empaque, con el COP/kg en
 *  cada escalón. Es el mismo dibujo que explica por qué el MOQ tiene colchón. */
function EmbudoDeCarga({ pasos, copPorKg }: { pasos: { paso: string; kg: number; nota: string }[]; copPorKg: (kg: number) => number | null }) {
  const W = 420, filaH = 46, H = pasos.length * filaH + 10;
  const max = Math.max(...pasos.map((p) => p.kg));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
         aria-label="De una carga de pergamino a las unidades de empaque">
      {pasos.map((p, i) => {
        const w = (p.kg / max) * (W * 0.46);
        const y = i * filaH + 8;
        const cpk = copPorKg(p.kg);
        return (
          <g key={p.paso}>
            <rect x={0} y={y} width={w} height={26} rx={3} fill={HEX.Black ?? "#1A1C1E"} opacity={0.82 - i * 0.16} />
            <text x={w + 8} y={y + 12} fontSize="11" fill="var(--ink)" fontWeight="600">{num(p.kg, p.kg % 1 ? 2 : 0)} kg</text>
            <text x={w + 8} y={y + 24} fontSize="9.5" fill="var(--muted)">{p.paso} · {p.nota}</text>
            {cpk != null && (
              <text x={W} y={y + 18} textAnchor="end" fontSize="10.5" fill="var(--muted)" fontFamily="var(--font-spline-mono), monospace">
                {cop0(cpk)}/kg
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function LecturaBoard({
  vigente, proxima, mercado, kgExcelsoPorCarga, kgGarantizados,
}: {
  vigente: PvcEdition | null;
  proxima: PvcEdition | null;
  mercado: LecturaMercado;
  kgExcelsoPorCarga: number;
  kgGarantizados: number;
}) {
  if (!vigente) {
    return (
      <>
        <h1 className={styles.title}>Lectura de mercado</h1>
        <p className={styles.empty}>
          {proxima
            ? `Ninguna edición rige hoy. La próxima (${proxima.code}) entra en vigor el ${day(proxima.validFrom)}.`
            : "No hay ninguna edición publicada: sin precio fijado no hay nada contra qué leer el mercado."}
        </p>
      </>
    );
  }

  const escalera = vigente.outputs?.escalera ?? [];
  const pila = vigente.outputs?.pila ?? [];
  const pvc = vigente.pvcCop ?? 0;
  const black = escalera.find((e) => e.banda === "Black");
  const multBlack = black?.mult ?? 1.15;
  const trm = vigente.inputs?.trm ?? 0;
  const fnc = mercado.fncHoy;

  const prima = fnc != null ? primaMinima(pvc, multBlack, fnc) : null;
  const sobre = fnc != null ? sobreBasePergamino(pvc, multBlack, fnc) : null;
  const pilaBlack = pila.find((f) => f.b === "Black");
  const fobCop = pilaBlack && trm ? verdeFobCop(pilaBlack.n2, trm) : null;
  const desv = fnc != null ? desviacionDeMercado(fnc, vigente.inputs?.fnc_30d ?? 0) : null;
  const holgura = fnc != null ? holguraDisparador(pvc, fnc) : null;

  const copBlackCarga = pvc * multBlack;
  const empaqueBlack = empaqueDe("Black");
  const pasos = embudoDeCarga(kgExcelsoPorCarga, kgGarantizados, empaqueBlack.formatosKg[0]);
  const copPorKg = (kg: number) => (kg > 0 ? copBlackCarga / kg : null);

  return (
    <>
      <h1 className={styles.title}>Lectura de mercado</h1>
      <p className={styles.subtitle}>
        Qué significa hoy la edición que rige. El precio está <strong>fijado por tres meses</strong> y esta pantalla no lo
        recalcula: mide la distancia entre lo que se fijó al corte y lo que el mercado hace ahora. Rige{" "}
        <strong>{vigente.code}</strong> ({cop0(pvc)}/carga) desde el {day(vigente.validFrom)} hasta el {day(vigente.validTo)}.
      </p>

      {fnc == null && (
        <p className={styles.warn}>
          Sin lectura del precio de la Federación en los últimos 90 días: el cron diario
          (<code>/api/cron/market-anchors</code>) no ha anotado nada. Las tres cifras necesitan ese dato.
        </p>
      )}

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiK}>Prima mínima</span>
            <span className={styles.kpiIcon}><IconoRegla /></span>
          </div>
          <span className={styles.kpiV} style={{ display: "block" }}>{pct(prima)}</span>
          <div className={styles.kpiSub}>
            El escalón Black ({cop0(copBlackCarga)}) contra el precio de la Federación del {day(mercado.fncAsOf)} ({cop0(fnc)}).
            Es lo mínimo que gana un productor por entrar en la escala.
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiK}>Sobre base pergamino</span>
            <span className={styles.kpiIcon}><IconoCarga /></span>
          </div>
          <span className={styles.kpiV} style={{ display: "block" }}>{sobre == null ? "—" : `+${num(sobre / 1000)}k`}</span>
          <div className={styles.kpiSub}>
            {cop0(sobre)} más por cada carga de {CARGA_KG_CPS} kg entregada. La misma prima, en pesos y en la unidad en la
            que el productor piensa.
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiK}>Verde empacado FOB</span>
            <span className={styles.kpiIcon}><IconoEmbudo /></span>
          </div>
          <span className={styles.kpiV} style={{ display: "block" }}>{fobCop == null ? "—" : `${num(fobCop / 1000, 1)}k`}</span>
          <div className={styles.kpiSub}>
            {cop0(fobCop)} por kg de verde en FCA Bogotá (≈ FOB), grado Black, a la TRM del corte ({num(trm, 2)}).
            Incluye trilla, empaque {empaqueBlack.nombre.toLowerCase()}, paletizado y exportación.
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>La regla de precios</strong></div>
        <p className={styles.meta}>
          A escala real desde cero. El tramo sombreado entre el FNC y Black es la prima mínima; los escalones siguientes
          son el mismo PVC multiplicado por su grado.
        </p>
        {fnc != null && escalera.length > 0 && (
          <ReglaDePrecios fnc={fnc} escalones={escalera.map((e) => ({ banda: e.banda, cop: e.cop }))} />
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>Una carga, y de una carga a las bolsas</strong></div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "0 0 240px" }}>
            {fnc != null && <CargaApilada fnc={fnc} black={copBlackCarga} />}
            <p className={styles.meta} style={{ marginTop: 6 }}>
              Lo que paga la Federación por una carga, y encima lo que añade el escalón más bajo de la casa.
            </p>
          </div>
          <div style={{ flex: "1 1 340px", minWidth: 300 }}>
            <EmbudoDeCarga pasos={pasos} copPorKg={copPorKg} />
            <p className={styles.meta} style={{ marginTop: 6 }}>
              El COP/kg sube en cada escalón porque el mismo dinero se reparte entre menos kilos: ahí está la merma, y ahí
              está el colchón que sostiene los MOQ. El último escalón usa el empaque de {empaqueBlack.formatosKg[0]} kg
              ({empaqueBlack.nombre}) del grado Black.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>Mínimos y empaque por grado</strong></div>
        <p className={styles.meta}>
          Black y Red son mezclas: su mínimo lo fija cuántos lotes las componen (cada lote aporta al menos una carga y la
          mezcla no baja de tres). El incremento después del mínimo es la mitad, y la casa puede bajar a cuartos para
          colocar el resto. Siempre limitado a la disponibilidad.
        </p>
        <div className={table.scroll}>
          <table className={table.t}>
            <thead>
              <tr>
                <th>Grado</th><th>Empaque</th><th>Formatos</th>
                <th style={{ textAlign: "right" }}>MOQ</th>
                <th style={{ textAlign: "right" }}>Incremento</th>
                <th style={{ textAlign: "right" }}>COP/carga</th>
                <th style={{ textAlign: "right" }}>FOB US$/kg</th>
              </tr>
            </thead>
            <tbody>
              {BANDAS5.map((b: Banda5) => {
                const emp = empaqueDe(b);
                const esMezcla = b === "Black" || b === "Red";
                const moq = moqCargas(b);
                const fila = pila.find((f) => f.b === b);
                return (
                  <tr key={b}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: HEX[b] ?? "var(--line)" }} />
                        <strong>{b}</strong>
                      </span>
                    </td>
                    <td>{emp.nombre}</td>
                    <td>{emp.formatosKg.map((f) => `${f} kg`).join(" · ")}</td>
                    <td style={{ textAlign: "right" }}>
                      {esMezcla ? "3 o 4 cargas" : `${moq} carga${moq === 1 ? "" : "s"}`}
                      {esMezcla && <div className={styles.kpiSub}>3 lotes → 3 · 2 o 4 lotes → 4</div>}
                      {admiteSaco(b) && <div className={styles.kpiSub}>excepción: 1 saco ({SACO_KG_CPS} kg CPS)</div>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {esMezcla ? "1,5 o 2 cargas" : `${num(incrementoCargas(moq), incrementoCargas(moq) % 1 ? 1 : 0)} carga${incrementoCargas(moq) === 1 ? "" : "s"}`}
                    </td>
                    <td style={{ textAlign: "right" }}>{cop0(fila?.copc ?? null)}</td>
                    <td style={{ textAlign: "right" }}>{fila ? num(fila.n2, 2) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={styles.meta}>
          Los MOQ y el empaque son la decisión del owner del 2026-09-16 (`docs/PVC_BCP_PLAN.md` §9.2). Todavía **no**
          gobiernan el precio: los parámetros del modelo vigente ({vigente.modelVersion ?? "—"}) siguen con la tabla
          anterior hasta la versión v2.2.0, que se registra con acta en Parámetros.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>Qué ha hecho el mercado desde el corte</strong></div>
        <p className={styles.meta}>
          Al corte del {day(vigente.cutDate)} la edición se calculó con un FNC de 30 días de{" "}
          <strong>{cop0(vigente.inputs?.fnc_30d ?? null)}</strong>. Hoy el promedio de 30 días es{" "}
          <strong>{cop0(mercado.fncPromedio30d)}</strong> y la última lectura, del {day(mercado.fncAsOf)}, es{" "}
          <strong>{cop0(fnc)}</strong> — una desviación de <strong>{pct(desv)}</strong> frente a lo que se supuso.
        </p>
        <p className={styles.meta}>
          El disparador de corrección al alza se cumple cuando el FNC alcanza el PVC ({cop0(pvc)}): al precio de hoy le
          faltaría subir <strong>{pct(holgura, 0)}</strong>. {mercado.serie.length} lecturas diarias en los últimos 90 días.
        </p>
        {proxima && (
          <p className={styles.meta}>
            Ya está publicada la próxima edición ({proxima.code}, {cop0(proxima.pvcCop)}), que entra en vigor el{" "}
            {day(proxima.validFrom)}. Hasta entonces manda la de arriba.
          </p>
        )}
      </div>
    </>
  );
}
