"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "@/components/panel/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import {
  ATRIBUTOS, BANDAS_PUNTOS, K, NIVELES, ORDEN_TRIADA, PUNTOS_MAX, SCA_ENTRADA_PLENA, SCA_MINIMO_ESCALA,
  SCA_TYRIAN, TECHO_COMUN, VARIEDADES_EN_DUDA, VARIEDADES_SEMILLA, baseSca, letras, multiplicador,
  puntosCtc, revisarBaseFisica, scaMinimoPara, type Atributo, type BaseFisica, type Nivel, type Triada,
} from "@/lib/pvc/escala";
import { admiteSaco, empaqueDe, incrementoCargas, moqCargas } from "@/lib/pvc/lectura";
import type { Banda5 } from "@/lib/pvc/motor";

// ── BCP · Modelo Económico · Grados ──────────────────────────────────────────
// La escala «El Punto y la Tríada» (docs/PVC_BCP_PLAN.md §9.1) con su
// calculadora. Existe para que el owner la VALIDE antes de que la fase 2 la
// lleve a `definicion.ts` — que es, hasta entonces, la que gobierna de verdad
// (ALINEACION §1). Esta pantalla calcula y enseña; no escribe en ningún lote.

const cop0 = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const num = (v: number | null | undefined, d = 0) =>
  v == null ? "—" : v.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const pctK = (n: Nivel) => (n === "C" ? "0" : `+${((n === "A" ? 2 : 1) * K * 100).toFixed(2).replace(".", ",")} %`);

const TRIADAS_TABLA: { letras: string; t: Triada; nota: string }[] = [
  { letras: "CCC", t: { variedad: "C", proceso: "C", reconocimiento: "C" }, nota: "sin nada que contar" },
  { letras: "BCC", t: { variedad: "B", proceso: "C", reconocimiento: "C" }, nota: "= CBC = CCB" },
  { letras: "BBC", t: { variedad: "B", proceso: "B", reconocimiento: "C" }, nota: "= ACC y equivalentes" },
  { letras: "BBB", t: { variedad: "B", proceso: "B", reconocimiento: "B" }, nota: "= ABC y equivalentes" },
  { letras: "ABB", t: { variedad: "A", proceso: "B", reconocimiento: "B" }, nota: "= AAC" },
  { letras: "AAB", t: { variedad: "A", proceso: "A", reconocimiento: "B" }, nota: "" },
  { letras: "AAA", t: { variedad: "A", proceso: "A", reconocimiento: "A" }, nota: "todo" },
];

/** La curva: puntos contra SCA para la tríada elegida, sobre las cinco bandas.
 *  Enseña de un vistazo lo que ninguna tabla dice — que el surplus no desplaza
 *  la línea, la inclina. */
function CurvaDeEscala({ t, sca, puntos }: { t: Triada; sca: number; puntos: number }) {
  const W = 720, H = 300, L = 46, R = 12, T = 10, B = 28;
  const x = (s: number) => L + ((s - 78) / 22) * (W - L - R);
  const y = (p: number) => T + (1 - p / PUNTOS_MAX) * (H - T - B);
  const linea = (tri: Triada) => {
    let d = "";
    for (let s = 78; s <= 100.001; s += 0.25) {
      const p = puntosCtc(s, tri).puntos;
      d += `${d ? " L" : "M"}${x(s).toFixed(1)} ${y(p).toFixed(1)}`;
    }
    return d;
  };
  const ccc: Triada = { variedad: "C", proceso: "C", reconocimiento: "C" };
  const hayS = letras(t) !== "CCC";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
         aria-label="Puntos por puntaje SCA, con las cinco bandas de la escala">
      {BANDAS_PUNTOS.map((b) => (
        <g key={b.id}>
          <rect x={L} y={y(b.max)} width={W - L - R} height={Math.max(0, y(b.min) - y(b.max))} fill={b.hex} opacity="0.10" />
          <text x={W - R - 4} y={y(b.min) - 4} textAnchor="end" fontSize="10" fill={b.hex} fontWeight="600">{b.nombre}</text>
        </g>
      ))}
      {[1000, 1400, 1600, 1800, 2000, 2500].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" opacity="0.6" />
          <text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="9.5" fill="var(--muted)">{v}</text>
        </g>
      ))}
      {[80, 82, 84, 86, 88, 89, 92, 96, 100].map((s) => (
        <text key={s} x={x(s)} y={H - 10} textAnchor="middle" fontSize="9.5" fill="var(--muted)">{s}</text>
      ))}
      <line x1={x(SCA_TYRIAN)} x2={x(SCA_TYRIAN)} y1={T} y2={H - B} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      <path d={linea(ccc)} fill="none" stroke="var(--ink)" strokeWidth="1.5" opacity="0.45" />
      {hayS && <path d={linea(t)} fill="none" stroke="var(--accent, #8A5A2B)" strokeWidth="2.2" />}
      <circle cx={x(sca)} cy={y(puntos)} r="6" fill="var(--accent, #8A5A2B)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  );
}

export function EscalaBoard({
  edicionCode, escalera,
}: {
  edicionCode: string | null;
  escalera: { banda: string; cop: number; mult: number }[];
}) {
  const [sca, setSca] = useState(86);
  const [t, setT] = useState<Triada>({ variedad: "C", proceso: "C", reconocimiento: "C" });
  const [fisica, setFisica] = useState<BaseFisica>({ factor: 92.8, humedad: 11, densidadEnRango: true });

  const r = useMemo(() => puntosCtc(sca, t), [sca, t]);
  const fis = useMemo(() => revisarBaseFisica(fisica, r.banda?.nombre ?? null), [fisica, r.banda]);
  const umbrales = useMemo(
    () => TRIADAS_TABLA.map((row) => ({
      ...row,
      min: BANDAS_PUNTOS.map((b) => ({ banda: b.nombre, sca: scaMinimoPara(b.nombre, row.t) })),
    })),
    []
  );

  const nombreBanda = r.banda?.nombre ?? null;
  const escalon = nombreBanda ? escalera.find((e) => e.banda === nombreBanda) ?? null : null;
  const bandaComoBanda5 = (nombreBanda ?? "Black") as Banda5;
  const emp = nombreBanda ? empaqueDe(bandaComoBanda5) : null;
  const esMezcla = nombreBanda === "Black" || nombreBanda === "Red";

  const PUERTA: Record<NonNullable<typeof r.puerta>, string> = {
    "sin-especialidad": `Debajo de ${SCA_MINIMO_ESCALA} no hay café de especialidad: el surplus no se aplica y el total nunca llega a 1000.`,
    "umbral-sin-surplus": `Entre ${SCA_MINIMO_ESCALA} y ${SCA_ENTRADA_PLENA - 0.01}, un café sin nada que contar se queda fuera. Con al menos un B entra.`,
    "umbral-con-surplus": `Entra por el umbral: con surplus, un café de ${SCA_MINIMO_ESCALA}–${SCA_ENTRADA_PLENA - 0.01} computa como si fuera un ${SCA_ENTRADA_PLENA}. La casa le abre la puerta por lo que promete, no le regala una banda.`,
    "tope-tyrian": `Topado en 2000: Tyrian exige SCA ≥ ${SCA_TYRIAN} **y** surplus. Le sobra origen y le falta taza.`,
    techo: `Techo de la escala: ${PUNTOS_MAX} puntos.`,
  };

  return (
    <>
      <h1 className={styles.title}>Grados · El Punto y la Tríada</h1>
      <p className={styles.subtitle}>
        La escala que viene: el grado se lee de los <strong>puntos</strong>, que salen del puntaje SCA (la base) y de las
        tres letras de la Tríada (el surplus). Sirve para <strong>validarla</strong> antes de llevarla al código.
      </p>

      <p className={styles.warn}>
        <strong>Esto todavía no gobierna.</strong> La fuente única de grados sigue siendo <code>definicion.ts</code> — la
        escala SCA de dos en dos, que es la que se aplica hoy en la Ficha, el catálogo y las ofertas. Puede verla en{" "}
        <Link href="/ecp/direccionamiento/grados">Direccionamiento · Grados de Calidad</Link>. Esta pantalla calcula y
        enseña; no escribe en ningún lote.
      </p>

      {/* ── La doctrina ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>La taza es el suelo; el surplus es la altura</strong></div>
        <p className={styles.meta}>
          El puntaje SCA dice qué tan bien está resuelto un café en la taza, y por eso es el ancla: sin taza no hay grado
          y ningún atributo la maquilla. Pero la taza no dice cuán difícil es que ese café exista. Eso lo dicen tres cosas
          que la taza no puede ver: <strong>de qué planta viene</strong>, <strong>qué manos y qué riesgo hubo en el
          beneficio</strong> y <strong>quién más lo ha mirado</strong>. A eso la casa lo llama el surplus.
        </p>
        <p className={styles.meta}>
          Y <strong>multiplica, no suma</strong>: un varietal raro en una taza de 82 es una promesa; en una de 90 es un
          hecho. Cada B vale {pctK("B")} y cada A {pctK("A")}; los tres A juntos (×{multiplicador({ variedad: "A", proceso: "A", reconocimiento: "A" }).toFixed(4).replace(".", ",")})
          son exactamente el tramo que separa el techo de un café común ({num(TECHO_COMUN)}) del techo de la escala ({num(PUNTOS_MAX)}).
          K no se elige a mano: sale de esa igualdad.
        </p>
      </div>

      {/* ── La calculadora ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>Calculadora</strong></div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 300px", display: "grid", gap: 14, alignContent: "start" }}>
            <label className={styles.field}>
              Puntaje SCA — <strong>{num(sca, 2)}</strong>
              <input type="range" min={78} max={100} step={0.1} value={sca}
                     onChange={(e) => setSca(Number(e.target.value))} style={{ width: "100%" }} />
              <input type="number" min={78} max={100} step={0.01} value={sca}
                     onChange={(e) => setSca(Math.min(100, Math.max(78, Number(e.target.value) || 78)))} />
            </label>

            {ORDEN_TRIADA.map((a: Atributo) => (
              <div key={a} className={styles.field}>
                {ATRIBUTOS[a].nombre}
                <div role="group" aria-label={ATRIBUTOS[a].nombre} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, marginTop: 4 }}>
                  {NIVELES.map((n) => (
                    <button key={n} type="button" aria-pressed={t[a] === n}
                            onClick={() => setT({ ...t, [a]: n })}
                            className={t[a] === n ? "btn btn-sm btn-solid" : "btn btn-sm"}
                            style={{ minHeight: 44, lineHeight: 1.15 }}>
                      {n}
                      <small style={{ display: "block", fontSize: 9.5, opacity: 0.75 }}>{ATRIBUTOS[a].niveles[n]}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: "1 1 340px", minWidth: 300 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <span className={styles.kpiV} style={{ fontSize: 46 }}>{num(r.puntos)}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 18 }}>
                <span style={{ width: 16, height: 16, borderRadius: 999, background: r.banda?.hex ?? "var(--line)" }} />
                {r.banda?.nombre ?? "Sin grado"}
              </span>
              <span className={styles.badge}>{letras(t)}</span>
            </div>
            <p className={styles.meta} style={{ fontFamily: "var(--font-spline-mono), monospace" }}>
              base {num(baseSca(sca), 0)} × {r.mult.toFixed(4).replace(".", ",")}
              {" "}(V {pctK(t.variedad)} · P {pctK(t.proceso)} · R {pctK(t.reconocimiento)})
            </p>
            {r.puerta && <p className={styles.meta} style={{ color: "var(--warn, #B7791F)" }}>{PUERTA[r.puerta].replace(/\*\*/g, "")}</p>}

            <CurvaDeEscala t={t} sca={sca} puntos={r.puntos} />
            <p className={styles.meta}>
              La línea tenue es un café común (CCC); la marcada, la tríada elegida. La vertical punteada es el SCA {SCA_TYRIAN},
              suelo de Tyrian.
            </p>
          </div>
        </div>
      </div>

      {/* ── Lo que ese grado vale y exige ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Lo que ese grado vale hoy</strong>
          {edicionCode && <span className={styles.badge}>{edicionCode}</span>}
        </div>
        {!r.banda ? (
          <p className={styles.empty}>Sin grado no hay escalón de precio.</p>
        ) : !escalon && r.banda.nombre === "Tyrian" ? (
          <p className={styles.meta}>
            Tyrian no tiene escalón fijo: su precio sale de la subasta, con el excedente repartido 80 % al productor y
            20 % a CTC.
          </p>
        ) : (
          <p className={styles.meta}>
            Escalón <strong>{r.banda.nombre}</strong> = PVC × {num(escalon?.mult ?? 0, 2)} ={" "}
            <strong>{cop0(escalon?.cop ?? null)}</strong> por carga.{" "}
            {emp && (
              <>
                Se entrega en <strong>{emp.nombre.toLowerCase()}</strong> de {emp.formatosKg.map((f) => `${f} kg`).join(" · ")}.{" "}
                MOQ{" "}
                {esMezcla
                  ? "3 o 4 cargas: una por cada productor de la mezcla (que es de 3 o de 4)"
                  : `${moqCargas(bandaComoBanda5)} carga${moqCargas(bandaComoBanda5) === 1 ? "" : "s"}`}
                {admiteSaco(bandaComoBanda5) && ", con piso excepcional de un saco (70 kg CPS)"}; el incremento siguiente es{" "}
                {esMezcla ? "1,5 o 2 cargas" : `${num(incrementoCargas(moqCargas(bandaComoBanda5)), 1)} carga(s)`}.
              </>
            )}
          </p>
        )}
      </div>

      {/* ── La Base física ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>La Base física · la puerta previa</strong></div>
        <p className={styles.meta}>
          No suma ni resta puntos: da el <strong>derecho</strong> a que el lote lleve un grado. Un lote que no la cumple
          queda «apto en taza, pendiente de físico». La expectativa acordada es que al menos 1 de cada 5 cafés no pase.
        </p>
        <div className={styles.formGrid}>
          <label className={styles.field}>Factor de rendimiento
            <input type="number" step={0.1} value={fisica.factor ?? ""}
                   onChange={(e) => setFisica({ ...fisica, factor: e.target.value === "" ? null : Number(e.target.value) })} />
          </label>
          <label className={styles.field}>Humedad (%)
            <input type="number" step={0.1} value={fisica.humedad ?? ""}
                   onChange={(e) => setFisica({ ...fisica, humedad: e.target.value === "" ? null : Number(e.target.value) })} />
          </label>
          <label className={styles.field}>Densidad en el rango de su variedad
            <select value={fisica.densidadEnRango === null ? "" : String(fisica.densidadEnRango)}
                    onChange={(e) => setFisica({ ...fisica, densidadEnRango: e.target.value === "" ? null : e.target.value === "true" })}>
              <option value="true">Sí</option>
              <option value="false">No</option>
              <option value="">Sin dato</option>
            </select>
          </label>
        </div>
        <ul className={styles.list}>
          {fis.checks.map((c) => (
            <li key={c.id}>
              <span className={c.ok === true ? styles.badgeGood : c.ok === false ? styles.badgeBad : styles.badge}>
                {c.ok === true ? "cumple" : c.ok === false ? "no cumple" : "sin dato"}
              </span>{" "}
              <strong>{c.nombre}</strong> — {c.detalle}
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          {fis.cumple
            ? `Base física cumplida: el lote puede llevar el grado ${r.banda?.nombre ?? "que le corresponda"}.`
            : fis.pendiente
              ? "Falta algún dato físico: el grado no se puede nombrar todavía."
              : "No cumple la Base física: apto en taza, pendiente de físico."}{" "}
          La tabla de densidades de referencia por variedad está pendiente del comité.
        </p>
      </div>

      {/* ── Umbrales ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>El SCA mínimo para cada grado, según el surplus</strong></div>
        <div className={table.scroll}>
          <table className={table.t}>
            <thead>
              <tr>
                <th>Tríada</th><th>Σw</th>
                {BANDAS_PUNTOS.map((b) => <th key={b.id} style={{ textAlign: "right" }}>{b.nombre}</th>)}
              </tr>
            </thead>
            <tbody>
              {umbrales.map((row) => (
                <tr key={row.letras}>
                  <td><strong>{row.letras}</strong>{row.nota && <div className={styles.kpiSub}>{row.nota}</div>}</td>
                  <td>{[row.t.variedad, row.t.proceso, row.t.reconocimiento].reduce((a, n) => a + (n === "A" ? 2 : n === "B" ? 1 : 0), 0)}</td>
                  {row.min.map((m) => (
                    <td key={m.banda} style={{ textAlign: "right", fontFamily: "var(--font-spline-mono), monospace" }}>
                      {m.sca == null ? <span className={styles.badge}>nunca</span> : num(m.sca, 2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.meta}>
          El surplus adelanta cada banda pero nunca la regala: Black siempre pide {SCA_ENTRADA_PLENA} sin nada que contar
          y {SCA_MINIMO_ESCALA} con algo. Tyrian tiene un suelo que no se mueve ({SCA_TYRIAN}) y un techo que solo el
          surplus abre — un café común no llega nunca.
        </p>
      </div>

      {/* ── Bandas y catálogo ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>Las cinco bandas</strong></div>
        <div className={table.scroll}>
          <table className={table.t}>
            <thead><tr><th>Grado</th><th style={{ textAlign: "right" }}>Puntos</th><th>Banda SCA de referencia</th></tr></thead>
            <tbody>
              {BANDAS_PUNTOS.map((b) => (
                <tr key={b.id}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: b.hex }} />
                      <strong>{b.nombre}</strong>
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-spline-mono), monospace" }}>
                    {num(b.min)} – {b.id === "tyrian" ? `${num(b.max)}` : num(b.max)}
                  </td>
                  <td className={styles.meta}>
                    {b.id === "black" ? "80–83,9" : b.id === "red" ? "84–85,9" : b.id === "blue" ? "86–87,9" : b.id === "gold" ? "88–88,9" : "≥ 89"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>Catálogo de variedades (semilla)</strong></div>
        <p className={styles.meta}>
          La clasificación definitiva saldrá del <strong>marco de mercado</strong>, que se publica en enero y julio. Esto
          es lo que vale mientras no haya marco. Toda variedad fuera del catálogo se trata como C hasta que el comité la
          clasifique, y el catálogo se revisa al menos cada tres meses.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          {NIVELES.map((n) => (
            <div key={n}>
              <div className={styles.kpiK}>{n} · {ATRIBUTOS.variedad.niveles[n]}</div>
              <ul className={styles.list} style={{ marginTop: 6 }}>
                {VARIEDADES_SEMILLA[n].map((v) => (
                  <li key={v}>
                    {v}
                    {VARIEDADES_EN_DUDA.includes(v) && <> <span className={styles.badgeWarn}>por confirmar</span></>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
