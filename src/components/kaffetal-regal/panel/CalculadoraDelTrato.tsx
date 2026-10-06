"use client";

import { useState } from "react";
import { simularTrato, type Declaracion, type SimulacionDelTrato } from "@/lib/trato/simulador";
import { CARGA_KG, PENALIDAD_RETIRO_PCT, TRAMO_LIBRE_ACUMULADO_PCT } from "@/lib/trato/terminos";
import { formatCop } from "@/lib/arena/inscriptions";

// ── V5.168 (owner, 2026-10-06) · la calculadora del trato, para el productor ─────────────────────────────────────────────
// «El Productor recibe esta oferta y con ella se activa una herramienta sencilla que permite entender las opciones y
// condiciones posibles (fijar disponibilidad del periodo siguiente o este […]). Esta calculadora muestra de manera intuitiva
// cómo funciona el sistema y qué podría esperar en cada caso.»
// Sobre el MISMO simulador del trato (`src/lib/trato/simulador.ts`, la lógica de la V5.83): cuánto compromete (en cargas),
// las dos maneras de comprometerlo lado a lado —este periodo (30 días) o el trimestre que empieza—, cómo llegan los pedidos
// y los pagos mes a mes y qué pasaría si necesitara retirar café. Al final, «Tomar la decisión» lleva al contrato.

export type DecisionDelTrato = { kg: number; declaracion: Declaracion };

const cargasDe = (kg: number) => kg / CARGA_KG;
const fmtCargas = (kg: number) => `${cargasDe(kg).toLocaleString("es-CO", { maximumFractionDigits: 1 })} ${cargasDe(kg) === 1 ? "carga" : "cargas"}`;

export function CalculadoraDelTrato({
  copKg,
  grado,
  minKg,
  maxKg,
  compraInicialKg,
  lugarEntrega,
  declaracionInicial,
  onDecidir,
}: {
  copKg: number;
  grado: string | null;
  minKg: number | null;
  maxKg: number | null;
  compraInicialKg: number | null;
  lugarEntrega: string;
  declaracionInicial: Declaracion;
  onDecidir: (d: DecisionDelTrato) => void;
}) {
  const minimo = minKg ?? CARGA_KG;
  const tope = maxKg ?? Math.max(minimo * 4, 40 * CARGA_KG);
  const [kg, setKg] = useState(minimo);
  const [declaracion, setDeclaracion] = useState<Declaracion>(declaracionInicial);
  const [mesRetiro, setMesRetiro] = useState(2);
  const [pctRetiro, setPctRetiro] = useState(25);

  const sims: Record<Declaracion, SimulacionDelTrato> = {
    "30_dias": simularTrato({ declaradoKg: kg, copKg, declaracion: "30_dias", grado }),
    trimestre: simularTrato({ declaradoKg: kg, copKg, declaracion: "trimestre", grado }),
  };
  const sim = sims[declaracion];
  const pasos = [{ etiqueta: "Hoy", kg: compraInicialKg ? sim.compraInicial.kg : 0, cop: compraInicialKg ? sim.compraInicial.cop : 0, nota: "CTCx le compra una carga" }, ...sim.porMes.map((m) => ({ etiqueta: `Mes ${m.mes}`, kg: m.pedidoKg, cop: m.pagoCop, nota: "CTCx pide y paga al mes siguiente" }))].filter((p) => p.kg > 0);
  const maxPaso = Math.max(...pasos.map((p) => p.kg), 1);

  // ¿Y si necesito retirar? El tramo libre acumulado al cerrar el mes anterior; lo de encima paga la penalidad.
  const mesesDisponibles = declaracion === "30_dias" ? [1] : [1, 2, 3];
  const mesR = mesesDisponibles.includes(mesRetiro) ? mesRetiro : mesesDisponibles[mesesDisponibles.length - 1];
  const librePct = declaracion === "30_dias" ? 0 : TRAMO_LIBRE_ACUMULADO_PCT[mesR as 1 | 2 | 3] ?? 0;
  const retiroKg = (kg * pctRetiro) / 100;
  const libreKg = Math.min(retiroKg, (kg * librePct) / 100);
  const penalizadoKg = Math.max(0, retiroKg - libreKg);
  const penalidad = (cargasDe(penalizadoKg) * copKg * CARGA_KG * PENALIDAD_RETIRO_PCT) / 100;
  const cumple = kg >= minimo && (maxKg == null || kg <= maxKg);

  const opcion = (d: Declaracion) => {
    const s = sims[d];
    const activa = d === declaracion;
    return (
      <button
        type="button"
        onClick={() => setDeclaracion(d)}
        aria-pressed={activa}
        style={{
          textAlign: "left",
          border: `2px solid ${activa ? "var(--accent)" : "var(--line)"}`,
          background: activa ? "var(--paper)" : "var(--card)",
          borderRadius: 10,
          padding: "10px 12px",
          cursor: "pointer",
          display: "grid",
          gap: 4,
          minHeight: 44,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{d === "30_dias" ? "Opción A" : "Opción B"}</span>
        <b style={{ fontSize: 14 }}>{d === "30_dias" ? "Este periodo · 30 días" : "El próximo trimestre · 3 meses"}</b>
        <span style={{ fontSize: 12.5 }}>
          {d === "30_dias"
            ? "Compromete café para el mes en curso: CTCx lo pide en un solo pedido. Sin tramo libre de retiro."
            : `CTCx reparte los pedidos en 3 meses. Puede retirar sin costo hasta el ${TRAMO_LIBRE_ACUMULADO_PCT[2]} % al cerrar el mes 1 y el ${TRAMO_LIBRE_ACUMULADO_PCT[3]} % al cerrar el mes 2.`}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{formatCop(s.totalCop)}</span>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>en total por {fmtCargas(kg)}</span>
      </button>
    );
  };

  return (
    <div style={{ marginTop: 10, border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--card)", display: "grid", gap: 12 }}>
      <div>
        <b style={{ fontSize: 14 }}>Calcule su trato antes de decidir</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
          El precio queda fijo en <b>{formatCop(copKg)}/kg</b> ({formatCop(copKg * CARGA_KG)} por carga). Mueva la cantidad y compare las dos opciones.
        </div>
      </div>

      {/* 1 · La cantidad */}
      <div>
        <label htmlFor="kg-trato" style={{ fontSize: 12.5, fontWeight: 700 }}>
          1. ¿Cuánto café pergamino seco quiere comprometer?
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
                const v = Number(e.target.value.replace(",", "."));
                if (Number.isFinite(v)) setKg(v);
              }}
              style={{ width: 80, padding: "6px 8px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
              aria-label="Kilos de CPS"
            />
            kg · <b>{fmtCargas(kg)}</b>
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: kg < minimo ? "var(--accent)" : "var(--muted)", marginTop: 3, fontWeight: kg < minimo ? 700 : 400 }}>
          Mínimo para su grado: {minimo.toLocaleString("es-CO")} kg ({fmtCargas(minimo)}){maxKg != null ? ` · máximo de esta oferta: ${maxKg.toLocaleString("es-CO")} kg` : ""}.
        </div>
      </div>

      {/* 2 · Las dos opciones */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>2. ¿Para cuándo lo compromete?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          {opcion("30_dias")}
          {opcion("trimestre")}
        </div>
      </div>

      {/* 3 · Cómo se ve, paso a paso */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>3. Así llegarían los pedidos y los pagos</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${pasos.length}, 1fr)`, gap: 8, alignItems: "end" }}>
          {pasos.map((p) => (
            <div key={p.etiqueta} style={{ display: "grid", gap: 4, justifyItems: "center", textAlign: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700 }}>{formatCop(p.cop)}</span>
              <div style={{ width: "70%", height: Math.max(8, (p.kg / maxPaso) * 90), background: p.etiqueta === "Hoy" ? "var(--green)" : "var(--accent)", borderRadius: "6px 6px 0 0" }} aria-hidden />
              <b style={{ fontSize: 12.5 }}>{p.etiqueta}</b>
              <span style={{ fontSize: 11.5 }}>
                {p.kg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg
              </span>
              <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{p.nota}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
          Entrega: {lugarEntrega} CTCx paga cada pedido en la primera semana del mes siguiente. El reparto mensual es parejo para el ejemplo; el pedido real lo
          hace CTCx mes a mes.
        </div>
      </div>

      {/* 4 · ¿Y si necesito retirar? */}
      <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>4. ¿Y si necesito retirar café?</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 12.5 }}>
          <label>
            Retiro el{" "}
            <select value={pctRetiro} onChange={(e) => setPctRetiro(Number(e.target.value))} style={{ padding: "4px 6px" }}>
              {[10, 25, 50, 75, 100].map((v) => (
                <option key={v} value={v}>
                  {v} %
                </option>
              ))}
            </select>
          </label>
          <label>
            en el{" "}
            <select value={mesR} onChange={(e) => setMesRetiro(Number(e.target.value))} style={{ padding: "4px 6px" }}>
              {mesesDisponibles.map((m) => (
                <option key={m} value={m}>
                  mes {m}
                </option>
              ))}
            </select>
          </label>
        </div>
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
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-sm btn-solid-accent" type="button" disabled={!cumple} onClick={() => onDecidir({ kg, declaracion })}>
          Tomar la decisión · {fmtCargas(kg)} · {declaracion === "30_dias" ? "30 días" : "trimestre"}
        </button>
      </div>
    </div>
  );
}
