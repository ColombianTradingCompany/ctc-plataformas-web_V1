"use client";

import { useState } from "react";
import { simularVentasDeVentana, PATRON_LABEL_VENTANA, type PatronDeVenta } from "@/lib/trato/simulador";
import { CARGA_KG, PENALIDAD_RETIRO_PCT } from "@/lib/trato/terminos";
import { validarDeclaracion, PISO_EXISTENCIA_INSUFICIENTE } from "@/lib/trato/minimos";
import { fechaLarga } from "@/lib/trato/modalidades";
import type { CondicionesDeFirma } from "@/lib/ofertas/ventanaDeOferta";
import { formatCop } from "@/lib/arena/inscriptions";

// ── La calculadora de la participación en Cherry Picked (V5.168 · por ventanas desde la V5.175, docs/PLAN_CICLOS.md) ────────
// El productor ya no elige modalidad: la FECHA DE FIRMA decide su ventana, su retiro libre y la regla de precio, y esta pantalla
// se los ENSEÑA con la cuenta que hizo el servidor (`previsualizarOferta` → `condicionesDeFirma`; la misma que hará al aceptar).
// Aquí el productor decide cuánto declara (≥ el mínimo; o, si la existencia del lote no le alcanza, hasta la mitad sin retiro),
// juega con el escenario de ventas semana a semana —«CTCx no se compromete a comprar cantidades fijas»— y con el retiro. El
// saco que CTCx compra con la firma va FUERA de lo declarado y suma a lo que recibe.

export type DecisionDelTrato = { kg: number; sinRetiro: boolean };
type Abierta = Extract<CondicionesDeFirma, { abierta: true }>;

const cargasDe = (kg: number) => kg / CARGA_KG;
const fmtCargas = (kg: number) => `${cargasDe(kg).toLocaleString("es-CO", { maximumFractionDigits: 1 })} ${cargasDe(kg) === 1 ? "carga" : "cargas"}`;
const REGLA: Record<Abierta["ventana"]["precio"], string> = {
  vigente: "el PVC de esta temporada",
  promedio: "el promedio del PVC de esta temporada y el de la siguiente",
  siguiente: "el PVC de la siguiente temporada",
};

export function CalculadoraDelTrato({ c, maxKg, lugarEntrega, fncCargaRef, onDecidir }: { c: Abierta; maxKg: number | null; lugarEntrega: string; fncCargaRef: number | null; onDecidir: (d: DecisionDelTrato) => void }) {
  const insuficiente = c.disponibleKg != null && c.disponibleKg < c.minimoKg;
  const piso = insuficiente ? Math.round(c.minimoKg * PISO_EXISTENCIA_INSUFICIENTE * 10) / 10 : c.minimoKg;
  const tope = Math.max(piso, Math.min(maxKg ?? Infinity, c.disponibleKg ?? Math.max(c.minimoKg * 4, 40 * CARGA_KG)));
  const [kg, setKg] = useState(insuficiente ? Math.min(tope, c.disponibleKg ?? piso) : c.minimoKg);
  const [ventaPct, setVentaPct] = useState(60);
  const [patron, setPatron] = useState<PatronDeVenta>("parejo");
  const [retiroPct, setRetiroPct] = useState(20);
  const [acepta, setAcepta] = useState(false);

  const decl = validarDeclaracion({ kg, minimo: c.minimoKg, disponibleKg: c.disponibleKg });
  const sinRetiro = decl.ok && !decl.conRetiro;
  const v = simularVentasDeVentana({ declaradoKg: kg, copKg: c.precioKg, semanas: c.semanas, sacoKg: c.sacoKg, ventaPct, patron, fncCargaRef });
  const pasos = [{ etiqueta: "Firma", kg: v.saco.kg }, ...v.porSemana.map((s) => ({ etiqueta: `S${s.semana}`, kg: s.kg }))];
  const maxPaso = Math.max(...pasos.map((p) => p.kg), 1);

  // ¿Y si retiro café? Solo de lo no vendido; libre hasta el % de la ventana (nada si la declaración es reducida).
  const libreTotal = sinRetiro ? 0 : (kg * c.ventana.retiroLibrePct) / 100;
  const retiroKg = (kg * retiroPct) / 100;
  const noVendido = Math.max(0, kg - v.vendidoKg);
  const retiroPosible = Math.min(retiroKg, noVendido);
  const libreKg = Math.min(retiroPosible, libreTotal);
  const penalizadoKg = Math.max(0, retiroPosible - libreKg);
  const penalidad = (cargasDe(penalizadoKg) * c.precioKg * CARGA_KG * PENALIDAD_RETIRO_PCT) / 100;
  const cumple = decl.ok && acepta;

  const kpi = (titulo: string, valor: string, nota?: string, color?: string) => (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", background: "var(--paper)", display: "grid", gap: 2 }}>
      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{titulo}</span>
      <b style={{ fontSize: 16, color }}>{valor}</b>
      {nota && <span style={{ fontSize: 11, color: "var(--muted)" }}>{nota}</span>}
    </div>
  );

  return (
    <div style={{ marginTop: 10, border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--card)", display: "grid", gap: 14 }}>
      {/* La ventana que decide la fecha de hoy */}
      <div>
        <b style={{ fontSize: 14 }}>Si firma hoy, su ventana es</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 6 }}>
          {kpi("Ventana", `${fechaLarga(c.ventana.desde)} → ${fechaLarga(c.ventana.hasta)}`, `${c.semanas} semanas · ${c.ventana.ciclos.join(" y ")}`)}
          {kpi("Precio", `${formatCop(c.precioKg)}/kg`, `${formatCop(c.precioKg * CARGA_KG)} por carga · ${REGLA[c.ventana.precio]}${c.auxilioCarga > 0 ? ` · incluye ${formatCop(c.auxilioCarga)}/carga de auxilio de transporte` : ""}`)}
          {kpi("Retiro libre", sinRetiro ? "Sin retiro" : `${c.ventana.retiroLibrePct} %`, sinRetiro ? "declaración reducida" : "de lo declarado, solo de lo no vendido")}
          {c.sacoKg > 0 && kpi(c.esRenovacion ? "Compra adelantada" : "Saco que CTCx le compra", `${c.sacoKg} kg`, `${formatCop(c.sacoKg * c.precioKg)} · fuera de lo declarado · sale esta semana`)}
        </div>
        {c.ventana.tipo === "extendida" && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Firma después de la semana 1 del ciclo: la ventana se extiende al ciclo siguiente para que las muestras de su lote viajen en el flete consolidado (semana 3).
          </div>
        )}
      </div>

      {/* 1 · La cantidad */}
      <div>
        <label htmlFor="kg-trato" style={{ fontSize: 12.5, fontWeight: 700 }}>
          1. ¿Cuánto café pergamino seco deja disponible en esta ventana?
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
          <input
            id="kg-trato"
            type="range"
            min={piso}
            max={tope}
            step={Math.max(1, Math.round(CARGA_KG / 5))}
            value={Math.min(tope, Math.max(piso, kg))}
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
        <div style={{ fontSize: 11.5, color: decl.ok ? "var(--muted)" : "var(--accent)", marginTop: 3, fontWeight: decl.ok ? 400 : 700 }}>
          Mínimo para su grado: {c.minimoKg.toLocaleString("es-CO")} kg ({fmtCargas(c.minimoKg)}).
          {c.disponibleKg != null && <> Le quedan <b>{c.disponibleKg.toLocaleString("es-CO")} kg</b> en el lote.</>}
          {insuficiente && <> La existencia no alcanza el mínimo: puede declarar hasta la mitad ({piso} kg), sin derecho a retiro.</>}
          {!decl.ok && <> {decl.motivo}</>}
        </div>
      </div>

      {/* 2 · El escenario de ventas, por semanas */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>2. Juegue con el escenario: ¿cuánto vende CTCx y cuándo?</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", margin: "2px 0 6px" }}>
          CTCx no se compromete a comprar cantidades fijas: puede no vender en una semana, o venderse todo el primer día. Cada semana le confirma lo vendido; lo vendido se despacha al empezar el
          ciclo siguiente. Lo que no se vende sigue siendo suyo.
        </div>
        <label htmlFor="venta-pct" style={{ fontSize: 12.5 }}>
          CTCx termina vendiendo el <b>{ventaPct} %</b> de lo declarado
        </label>
        <input id="venta-pct" type="range" min={0} max={100} step={5} value={ventaPct} onChange={(e) => setVentaPct(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)", minHeight: 32 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 8px" }}>
          {(Object.keys(PATRON_LABEL_VENTANA) as PatronDeVenta[]).map((p) => (
            <button key={p} type="button" onClick={() => setPatron(p)} aria-pressed={p === patron} className="btn btn-sm" style={p === patron ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" } : undefined}>
              {PATRON_LABEL_VENTANA[p]}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))`, gap: 4, alignItems: "end" }}>
          {pasos.map((p) => (
            <div key={p.etiqueta} style={{ display: "grid", gap: 3, justifyItems: "center", textAlign: "center" }}>
              <div style={{ width: "72%", height: Math.max(4, (p.kg / maxPaso) * 70), background: p.etiqueta === "Firma" ? "var(--green)" : "var(--accent)", borderRadius: "5px 5px 0 0", opacity: p.kg ? 1 : 0.25 }} aria-hidden />
              <b style={{ fontSize: 11 }}>{p.etiqueta}</b>
              <span style={{ fontSize: 10.5 }}>{p.kg.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 10 }}>
          {kpi("Vendido a CTCx", `${v.vendidoPct.toLocaleString("es-CO")} %`, `${v.vendidoKg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg de lo declarado`)}
          {kpi("Usted recibe", formatCop(v.ingresoCop), c.sacoKg > 0 ? `incluye el ${c.esRenovacion ? "adelanto" : "saco"} · 60 % al despachar, 40 % al recibir` : "60 % al despachar, 40 % al recibir")}
          {v.primaFncPct != null && kpi("Precio frente a la FNC", `${v.primaFncPct >= 0 ? "+" : ""}${v.primaFncPct.toLocaleString("es-CO")} %`, `FNC del día de la oferta: ${formatCop(fncCargaRef ?? 0)}/carga`, v.primaFncPct >= 0 ? "var(--green)" : "var(--red)")}
          {v.diferenciaFncCop != null && kpi("Más que vendiendo a la FNC", formatCop(v.diferenciaFncCop), "por lo vendido a CTCx", v.diferenciaFncCop >= 0 ? "var(--green)" : "var(--red)")}
          {kpi("Le queda sin vender", `${v.sinVenderKg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg`, "sigue siendo suyo")}
        </div>
      </div>

      {/* 3 · ¿Y si necesito retirar café? */}
      <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>3. ¿Y si necesito retirar café de lo declarado?</div>
        <label style={{ fontSize: 12.5 }}>
          Retiro el{" "}
          <select value={retiroPct} onChange={(e) => setRetiroPct(Number(e.target.value))} style={{ padding: "4px 6px" }}>
            {[10, 20, 25, 30, 50, 75, 100].map((n) => (
              <option key={n} value={n}>
                {n} %
              </option>
            ))}
          </select>{" "}
          de lo declarado
        </label>
        <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
          <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "var(--line)" }} aria-hidden>
            <div style={{ width: `${(libreKg / Math.max(kg, 1)) * 100}%`, background: "var(--green)" }} />
            <div style={{ width: `${(penalizadoKg / Math.max(kg, 1)) * 100}%`, background: "var(--accent)" }} />
          </div>
          <span style={{ fontSize: 12.5 }}>
            {retiroPosible < retiroKg && <>En este escenario solo quedan {noVendido.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg sin vender (lo vendido ya es de CTCx). </>}
            Retira {retiroPosible.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg: <b style={{ color: "var(--green)" }}>{libreKg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg sin costo</b>
            {penalizadoKg > 0 ? (
              <>
                {" "}y <b style={{ color: "var(--accent)" }}>{penalizadoKg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg con penalidad</b> ({PENALIDAD_RETIRO_PCT} % del precio de cada carga): <b>{formatCop(penalidad)}</b>.
              </>
            ) : (
              "."
            )}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
          Entrega: {lugarEntrega} El despacho lo paga usted (el PVC le reconoce el auxilio de transporte). Al recibir, CTCx mide la humedad
          {c.calidad ? ` (${c.calidad.humedad_min}–${c.calidad.humedad_max} %)` : ""} y la actividad de agua{c.calidad ? ` (≤ ${c.calidad.aw_max})` : ""}.
        </div>
      </div>

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} style={{ marginTop: 3 }} />
        <span>
          {c.esRenovacion && <>Confirmo que esta cantidad está disponible y que la humedad y el bodegaje del café son los adecuados. </>}
          Entiendo la ventana, los plazos de despacho ({c.sacoKg > 0 ? `${c.esRenovacion ? "la compra adelantada" : "el saco"} sale esta semana; ` : ""}lo vendido, al empezar el ciclo siguiente), el pago 60/40 con la calidad, y el retiro.
        </span>
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-sm btn-solid-accent" type="button" disabled={!cumple} onClick={() => onDecidir({ kg, sinRetiro })}>
          Tomar la decisión · {fmtCargas(kg)}
        </button>
      </div>
    </div>
  );
}
