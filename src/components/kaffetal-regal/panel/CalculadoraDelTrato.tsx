"use client";

import { useState } from "react";
import { simularVentas, PATRON_LABEL, type PatronDeVenta } from "@/lib/trato/simulador";
import { CARGA_KG, PENALIDAD_RETIRO_PCT } from "@/lib/trato/terminos";
import { tramoLibrePct } from "@/lib/trato/mesAMes";
import { condicionesDe, fechaLarga, modalidadesDisponibles, textoCompraInicial, MODALIDAD_LABEL, MODALIDADES, type CondicionesDeModalidad, type Modalidad } from "@/lib/trato/modalidades";
import { formatCop } from "@/lib/arena/inscriptions";

// ── La calculadora de la participación en Cherry Picked (V5.168 · modalidades y escenarios desde la V5.169) ─────────────
// Owner, 2026-10-06: el productor elige CÓMO participa —«Declarar para Temporada Actual» (lo que queda de la temporada en curso,
// si faltan ≥ 30 días; V5.173), «Declarar Siguiente Temporada Trimestral» (lo usual) o «Declarar Ahora y Siguiente
// Temporada» (si faltan ≤ 50 días)—, cuánto declara, y juega con el ESCENARIO de ventas: «CTCx no se compromete a comprar las
// fracciones mes a mes; puede no haber compra en un mes, o venderse todo el primer día». Los KPIs (% vendido, ingreso, prima
// sobre la referencia FNC, café que le queda) anclan la decisión. Las reglas viven en `modalidades.ts` y `simulador.ts`.

/** V5.170: `copKg` = el precio de la modalidad elegida (el PVC vigente, o el de la edición siguiente para «Siguiente Temporada»). */
export type DecisionDelTrato = { kg: number; modalidad: Modalidad; condiciones: CondicionesDeModalidad; copKg: number };

const cargasDe = (kg: number) => kg / CARGA_KG;
const fmtCargas = (kg: number) => `${cargasDe(kg).toLocaleString("es-CO", { maximumFractionDigits: 1 })} ${cargasDe(kg) === 1 ? "carga" : "cargas"}`;
const fmtFecha = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export function CalculadoraDelTrato({
  copKg,
  grado,
  minKg,
  maxKg,
  lugarEntrega,
  fncCargaRef,
  temporadaHasta,
  hoy,
  diasHastaSiguiente,
  precioSiguienteKg,
  pvcSiguienteCode,
  fechaLimiteSiguiente,
  onDecidir,
}: {
  copKg: number;
  grado: string | null;
  minKg: number | null;
  maxKg: number | null;
  lugarEntrega: string;
  fncCargaRef: number | null;
  temporadaHasta: string | null;
  hoy: string;
  diasHastaSiguiente: number | null;
  precioSiguienteKg: number | null;
  pvcSiguienteCode: string | null;
  fechaLimiteSiguiente: string | null;
  onDecidir: (d: DecisionDelTrato) => void;
}) {
  const disp = modalidadesDisponibles(diasHastaSiguiente, { precioKg: precioSiguienteKg, fechaLimite: fechaLimiteSiguiente });
  // V5.170: «Siguiente Temporada» va al PVC de la edición siguiente; «Temporada Actual» y «Ahora y Siguiente», al de esta temporada.
  const precioDe = (m: Modalidad) => (m === "trimestre" ? precioSiguienteKg ?? copKg : copKg);
  const minimo = minKg ?? CARGA_KG;
  const tope = maxKg ?? Math.max(minimo * 4, 40 * CARGA_KG);
  const [modalidad, setModalidad] = useState<Modalidad>(disp.ahora_y_siguiente.disponible ? "ahora_y_siguiente" : disp.trimestre.disponible ? "trimestre" : "temporada_actual");
  const [kg, setKg] = useState(minimo);
  const [ventaPct, setVentaPct] = useState(60);
  const [patron, setPatron] = useState<PatronDeVenta>("parejo");
  const [retiroPct, setRetiroPct] = useState(25);
  const [mesRetiro, setMesRetiro] = useState(2);

  const cond = condicionesDe(modalidad, { hoy, temporadaHasta, declaradoKg: kg, grado });
  // «Temporada Actual»: CTCx compra entre 10 y 25 kg a su discreción; el escenario usa lo mínimo (10 kg), lo que seguro ocurre.
  const compraInicialKg = "kg" in cond.compraInicial ? cond.compraInicial.kg : cond.compraInicial.minKg;
  const copModalidad = precioDe(modalidad);
  const v = simularVentas({ declaradoKg: kg, copKg: copModalidad, meses: cond.meses, compraInicialKg, ventaPct, patron, fncCargaRef });
  const pasos = [{ etiqueta: "Firma", kg: v.compraInicial.kg, cop: v.compraInicial.cop }, ...v.porMes.map((m) => ({ etiqueta: `Mes ${m.mes}`, kg: m.kg, cop: m.cop }))];
  const maxPaso = Math.max(...pasos.map((p) => p.kg), 1);

  // ¿Y si retiro café? V5.173: la escalera repartida en los meses del trato (`tramoLibrePct`): «Siguiente» 0 · 25 · 50 %; «Temporada
  // Actual» con dos meses 0 · 37,5 % (con uno, nada); «Ahora y Siguiente» el 30 % en cualquier momento.
  const mesR = Math.min(cond.meses, Math.max(1, mesRetiro));
  const libreModalidad = tramoLibrePct(mesR, cond.meses, cond.retiroLibrePct);
  const escalera =
    cond.retiroLibrePct != null
      ? `${cond.retiroLibrePct} % libre en cualquier momento, sin escalones.`
      : cond.meses <= 1
        ? "Un solo mes: no hay tramo libre."
        : `Libre sin costo, acumulado: ${Array.from({ length: cond.meses }, (_, i) => `mes ${i + 1}: ${tramoLibrePct(i + 1, cond.meses).toLocaleString("es-CO")} %`).join(" · ")}.`;
  const retiroKg = (kg * retiroPct) / 100;
  const libreKg = Math.min(retiroKg, (kg * libreModalidad) / 100);
  const penalizadoKg = Math.max(0, retiroKg - libreKg);
  const penalidad = (cargasDe(penalizadoKg) * copModalidad * CARGA_KG * PENALIDAD_RETIRO_PCT) / 100;
  const cumple = kg >= minimo && (maxKg == null || kg <= maxKg) && disp[modalidad].disponible;

  const kpi = (titulo: string, valor: string, nota?: string, color?: string) => (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", background: "var(--paper)", display: "grid", gap: 2 }}>
      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{titulo}</span>
      <b style={{ fontSize: 17, color }}>{valor}</b>
      {nota && <span style={{ fontSize: 11, color: "var(--muted)" }}>{nota}</span>}
    </div>
  );

  return (
    <div style={{ marginTop: 10, border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--card)", display: "grid", gap: 14 }}>
      <div>
        <b style={{ fontSize: 14 }}>Calcule su participación en Cherry Picked</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
          PVC de esta temporada: <b>{formatCop(copKg)}/kg</b> ({formatCop(copKg * CARGA_KG)} por carga).{" "}
          {precioSiguienteKg != null ? (
            <>
              PVC de la siguiente{pvcSiguienteCode ? ` (${pvcSiguienteCode})` : ""}: <b>{formatCop(precioSiguienteKg)}/kg</b>.
            </>
          ) : (
            <>El PVC de la siguiente temporada aún no se publica{fechaLimiteSiguiente ? ` (se fija a más tardar el ${fechaLarga(fechaLimiteSiguiente)})` : ""}.</>
          )}
          {diasHastaSiguiente != null && temporadaHasta && <> La siguiente Temporada Trimestral empieza en {diasHastaSiguiente} días.</>}
        </div>
      </div>

      {/* 1 · La modalidad */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>1. ¿Cómo quiere participar?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8 }}>
          {MODALIDADES.map((m) => {
            const d = disp[m];
            const c = condicionesDe(m, { hoy, temporadaHasta, declaradoKg: kg, grado });
            const activa = m === modalidad;
            return (
              <button
                key={m}
                type="button"
                disabled={!d.disponible}
                onClick={() => setModalidad(m)}
                aria-pressed={activa}
                style={{
                  textAlign: "left",
                  border: `2px solid ${activa ? "var(--accent)" : "var(--line)"}`,
                  background: activa ? "var(--paper)" : "var(--card)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  cursor: d.disponible ? "pointer" : "not-allowed",
                  opacity: d.disponible ? 1 : 0.55,
                  display: "grid",
                  gap: 4,
                  minHeight: 44,
                }}
              >
                <b style={{ fontSize: 13.5 }}>{MODALIDAD_LABEL[m]}</b>
                <span style={{ fontSize: 12 }}>
                  {m === "temporada_actual"
                    ? `Lo que queda de esta temporada, al PVC actual: ${c.meses} ${c.meses === 1 ? "mes" : "meses"} de pedidos.`
                    : m === "trimestre"
                      ? "La siguiente Temporada Trimestral completa. Lo usual."
                      : "Desde hoy y toda la siguiente temporada. Retiro libre del 30 %; al empezar la siguiente, redeclara al menos el 70 %."}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {fmtFecha(c.desde)} a {fmtFecha(c.hasta)} · con la firma CTCx compra {textoCompraInicial(c.compraInicial)}
                  {d.disponible && <> · {formatCop(precioDe(m))}/kg ({m === "trimestre" ? "PVC siguiente" : "PVC actual"})</>}
                </span>
                {!d.disponible && <span style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 700 }}>{d.motivo}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2 · La cantidad */}
      <div>
        <label htmlFor="kg-trato" style={{ fontSize: 12.5, fontWeight: 700 }}>
          2. ¿Cuánto café pergamino seco declara disponible?
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
          <input
            id="kg-trato"
            type="range"
            min={minimo}
            max={tope}
            step={CARGA_KG / 5}
            value={Math.min(tope, Math.max(minimo, kg))}
            onChange={(e) => setKg(Number(e.target.value))}
            style={{ flex: "1 1 220px", accentColor: "var(--accent)", minHeight: 32 }}
          />
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5 }}>
            <input
              inputMode="decimal"
              value={String(kg)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(",", "."));
                if (Number.isFinite(n)) setKg(n);
              }}
              style={{ width: 80, padding: "6px 8px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
              aria-label="Kilos de CPS"
            />
            kg · <b>{fmtCargas(kg)}</b>
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: kg < minimo ? "var(--accent)" : "var(--muted)", marginTop: 3, fontWeight: kg < minimo ? 700 : 400 }}>
          Mínimo para su grado: {minimo.toLocaleString("es-CO")} kg ({fmtCargas(minimo)}).
          {cond.redeclarar && <> Al empezar la siguiente temporada redeclara al menos {cond.redeclarar.minKg.toLocaleString("es-CO")} kg.</>}
        </div>
      </div>

      {/* 3 · El escenario de ventas */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>3. Juegue con el escenario: ¿cuánto vende CTCx y cuándo?</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", margin: "2px 0 6px" }}>
          CTCx no se compromete a comprar fracciones fijas mes a mes: puede no comprar en un mes, o venderse todo el primer día. Lo que no se vende sigue
          siendo suyo.
        </div>
        <label htmlFor="venta-pct" style={{ fontSize: 12.5 }}>
          CTCx termina comprando el <b>{ventaPct} %</b> de lo declarado
        </label>
        <input id="venta-pct" type="range" min={0} max={100} step={5} value={ventaPct} onChange={(e) => setVentaPct(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)", minHeight: 32 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 8px" }}>
          {(Object.keys(PATRON_LABEL) as PatronDeVenta[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPatron(p)}
              aria-pressed={p === patron}
              className="btn btn-sm"
              style={p === patron ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" } : undefined}
            >
              {PATRON_LABEL[p]}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${pasos.length}, 1fr)`, gap: 6, alignItems: "end" }}>
          {pasos.map((p) => (
            <div key={p.etiqueta} style={{ display: "grid", gap: 3, justifyItems: "center", textAlign: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{p.cop ? formatCop(p.cop) : "—"}</span>
              <div style={{ width: "72%", height: Math.max(4, (p.kg / maxPaso) * 80), background: p.etiqueta === "Firma" ? "var(--green)" : "var(--accent)", borderRadius: "6px 6px 0 0", opacity: p.kg ? 1 : 0.25 }} aria-hidden />
              <b style={{ fontSize: 12 }}>{p.etiqueta}</b>
              <span style={{ fontSize: 11 }}>{p.kg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 10 }}>
          {kpi("Vendido a CTCx", `${v.vendidoPct.toLocaleString("es-CO")} %`, `${v.vendidoKg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg`)}
          {kpi("Usted recibe", formatCop(v.ingresoCop), "pagos en la primera semana del mes siguiente")}
          {v.primaFncPct != null &&
            kpi("Precio frente a la FNC", `${v.primaFncPct >= 0 ? "+" : ""}${v.primaFncPct.toLocaleString("es-CO")} %`, `FNC del día de la oferta: ${formatCop(fncCargaRef ?? 0)}/carga`, v.primaFncPct >= 0 ? "var(--green)" : "var(--red)")}
          {v.diferenciaFncCop != null && kpi("Más que vendiendo a la FNC", formatCop(v.diferenciaFncCop), "por lo vendido a CTCx", v.diferenciaFncCop >= 0 ? "var(--green)" : "var(--red)")}
          {kpi("Le queda sin vender", `${v.sinVenderKg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg`, "sigue siendo suyo")}
        </div>
      </div>

      {/* 4 · ¿Y si necesito retirar café? */}
      <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>4. ¿Y si necesito retirar café de lo declarado?</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 12.5 }}>
          <label>
            Retiro el{" "}
            <select value={retiroPct} onChange={(e) => setRetiroPct(Number(e.target.value))} style={{ padding: "4px 6px" }}>
              {[10, 25, 30, 50, 75, 100].map((n) => (
                <option key={n} value={n}>
                  {n} %
                </option>
              ))}
            </select>
          </label>
          {cond.retiroLibrePct == null && cond.meses > 1 && (
            <label>
              en el{" "}
              <select value={mesR} onChange={(e) => setMesRetiro(Number(e.target.value))} style={{ padding: "4px 6px" }}>
                {Array.from({ length: cond.meses }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    mes {m}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{escalera}</div>
        <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
          <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "var(--line)" }} aria-hidden>
            <div style={{ width: `${(libreKg / Math.max(kg, 1)) * 100}%`, background: "var(--green)" }} />
            <div style={{ width: `${(penalizadoKg / Math.max(kg, 1)) * 100}%`, background: "var(--accent)" }} />
          </div>
          <span style={{ fontSize: 12.5 }}>
            Retira {retiroKg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg: <b style={{ color: "var(--green)" }}>{libreKg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg sin costo</b>
            {penalizadoKg > 0 ? (
              <>
                {" "}y <b style={{ color: "var(--accent)" }}>{penalizadoKg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg con penalidad</b> ({PENALIDAD_RETIRO_PCT} % del precio de cada carga):{" "}
                <b>{formatCop(penalidad)}</b>.
              </>
            ) : (
              "."
            )}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>Entrega: {lugarEntrega}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-sm btn-solid-accent" type="button" disabled={!cumple} onClick={() => onDecidir({ kg, modalidad, condiciones: cond, copKg: copModalidad })}>
          Tomar la decisión · {MODALIDAD_LABEL[modalidad]} · {fmtCargas(kg)}
        </button>
      </div>
    </div>
  );
}
