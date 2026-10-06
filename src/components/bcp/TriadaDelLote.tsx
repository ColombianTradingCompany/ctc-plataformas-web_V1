"use client";

import { ATRIBUTOS, NIVELES, ORDEN_TRIADA, letras, puntosCtc, type Nivel } from "@/lib/pvc/escala";
import { triadaDeLaFicha, type FichaParaTriada, type TriadaDelLote as Derivada } from "@/lib/pvc/triadaDelLote";
import { CurvaDeEscala } from "@/components/panel/pvc/CurvaDeEscala";

// ── V5.158 (owner, 2026-10-06) · «debe salir la escala A B C para cada parámetro de la tríada en la que cae» ──────────
// La tríada del lote (variedad · proceso · reconocimiento) derivada de su Ficha, con las tres letras de cada atributo y la
// elegida encendida —como en la calculadora del Modelo Económico—, los puntos que da la escala con el Punto de la taza, y
// la curva con el lote encima. V5.160: la escala GOBIERNA — el grado se lee de los puntos.
export function TriadaDelLote({ ficha, sca, ajuste = 0 }: { ficha: FichaParaTriada | null | undefined; sca: number | null; /** V5.162: puntos del ajuste CTCx. */ ajuste?: number }) {
  const d: Derivada = triadaDeLaFicha(ficha);
  const r = sca != null ? puntosCtc(sca, d.triada, ajuste) : null;
  const pill = (n: Nivel, on: boolean) => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, border: `1.5px solid ${on ? "var(--primary, #3C0A86)" : "var(--line)"}`,
    background: on ? "var(--primary, #3C0A86)" : "transparent", color: on ? "#fff" : "var(--muted)", fontWeight: on ? 700 : 500,
  }) as const;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {ORDEN_TRIADA.map((a) => {
          const razon = d[a];
          return (
            <div key={a} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{ATRIBUTOS[a].nombre}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="group" aria-label={`${ATRIBUTOS[a].nombre}: nivel ${razon.nivel}`}>
                {NIVELES.map((n) => (
                  <span key={n} style={pill(n, n === razon.nivel)} aria-current={n === razon.nivel ? "true" : undefined}>
                    <b>{n}</b> {ATRIBUTOS[a].niveles[n]}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>{razon.por}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5 }}>Tríada <b className="mono">{letras(d.triada)}</b></span>
        {r ? (
          <>
            <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{r.puntos.toLocaleString("es-CO")}</span>
            {r.banda && <span style={{ fontSize: 12.5, fontWeight: 700, color: r.banda.hex }}>● {r.banda.nombre}</span>}
            <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
              base {Math.round(r.base).toLocaleString("es-CO")} × {r.mult.toFixed(4).replace(".", ",")} (V {d.triada.variedad === "A" ? 2 : d.triada.variedad === "B" ? 1 : 0} · P {d.triada.proceso === "A" ? 2 : d.triada.proceso === "B" ? 1 : 0} · R {d.triada.reconocimiento === "A" ? 2 : d.triada.reconocimiento === "B" ? 1 : 0}){r.ajuste > 0 && <> + {r.ajuste} ajuste CTCx</>}
            </span>
            {r.puerta && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>· puerta: {r.puerta}</span>}
          </>
        ) : (
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>sin Punto todavía</span>
        )}
      </div>
      {sca != null && r && <CurvaDeEscala t={d.triada} sca={sca} puntos={r.puntos} />}
      <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted)" }}>
        La línea tenue es un café común (CCC); la marcada, la tríada del lote. La vertical punteada es el SCA 89, suelo de Tyrian. El grado se lee de los puntos (V5.160).
      </p>
    </div>
  );
}
