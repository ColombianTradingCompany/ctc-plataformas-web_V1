"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GeoMap, type GeoMarker } from "@/components/bcp/GeoMap";
import { GRADO_HEX, GRADO_LABEL, PASOS_DE_LA_FICHA } from "@/lib/ocp/etapas";
import { CIRCUITO_LABEL, ORDEN_DEL_CIRCUITO } from "@/lib/ocp/circuito";
import { SeasonRangeDial } from "./LotePiezas";
import type { KrFila, Tono } from "./carga";
import styles from "@/components/panel/shared.module.css";

// ── Productores, Fincas y Lotes · la tabla única y su mapa (V5.61) ───────────
// Dos vistas de LA MISMA consulta y con LOS MISMOS filtros: lo que se filtra en la tabla es lo que
// se ve en el mapa. Hasta la V5.60 eran tres tableros con tres mapas a medias (el de Fincas sin
// filtro de temporada, el de Lotes solo con los que iban camino de la Arena) y tres maneras distintas
// de elegir una temporada.
//
// Cada celda enlaza a la VISTA COMPLETA de lo que nombra —`?productor=`, `?finca=`, `?lote=`—, así
// que se navega en cualquier dirección: del lote a su finca, de la finca a su productor y de vuelta.

const TONO: Record<Tono, string> = { good: "badgeGood", bad: "badgeBad", warn: "badgeWarn", muted: "" };
const Insignia = ({ v }: { v: { label: string; tono: Tono } | null }) =>
  v ? <span className={`${styles.badge} ${TONO[v.tono] ? styles[TONO[v.tono]] : ""}`}>{v.label}</span> : <span style={{ color: "var(--muted)" }}>—</span>;

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontFamily: "var(--font-spline-mono), monospace",
  fontSize: 10,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--muted)",
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--line)",
};
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, verticalAlign: "top", borderBottom: "1px solid var(--line)" };
const enlace: React.CSSProperties = { color: "var(--ink)", fontWeight: 600, textDecoration: "none" };
const sub: React.CSSProperties = { display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 2 };

type Agrupar = "" | "productor" | "finca";
export type FiltroRapido = "" | "galardonados" | "sin-finca" | "sin-lote";

export function KrTabla({
  filas,
  temporadas,
  vistaInicial,
  filtroInicial,
}: {
  filas: KrFila[];
  temporadas: { id: string; label: string }[];
  vistaInicial: "tabla" | "mapa";
  filtroInicial: FiltroRapido;
}) {
  const [vista, setVista] = useState<"tabla" | "mapa">(vistaInicial);
  const [texto, setTexto] = useState("");
  const [pais, setPais] = useState("");
  const [depto, setDepto] = useState("");
  const [grado, setGrado] = useState("");
  const [circuito, setCircuito] = useState("");
  const [rapido, setRapido] = useState<FiltroRapido>(filtroInicial);
  const [rango, setRango] = useState<[number, number] | null>(null);
  const [agrupar, setAgrupar] = useState<Agrupar>("");

  const paises = useMemo(() => [...new Set(filas.map((f) => f.pais).filter(Boolean))].sort(), [filas]);
  const deptos = useMemo(
    () => [...new Set(filas.filter((f) => !pais || f.pais === pais).map((f) => f.departamento).filter(Boolean))].sort(),
    [filas, pais]
  );

  const visibles = useMemo(() => {
    const q = texto.trim().toLocaleLowerCase("es-CO");
    const enRango = rango ? new Set(temporadas.slice(rango[0], rango[1] + 1).map((t) => t.id)) : null;
    return filas.filter((f) => {
      if (pais && f.pais !== pais) return false;
      if (depto && f.departamento !== depto) return false;
      if (grado && f.grado !== grado) return false;
      if (circuito && f.circuito?.estado !== circuito) return false;
      // Una temporada elegida deja fuera lo que no tiene lote: una finca sin lote no es «de» ninguna temporada.
      if (enRango && !(f.temporadaId && enRango.has(f.temporadaId))) return false;
      if (rapido === "galardonados" && !f.grado) return false;
      if (rapido === "sin-finca" && f.fincaId) return false;
      if (rapido === "sin-lote" && f.loteId) return false;
      if (q) {
        const pajar = [f.productorNombre, f.productorCodigo, f.fincaNombre, f.fincaCodigo, f.fincaLugar, f.loteNombre, f.loteRef]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("es-CO");
        if (!pajar.includes(q)) return false;
      }
      return true;
    });
  }, [filas, texto, pais, depto, grado, circuito, rapido, rango, temporadas]);

  // Al agrupar, las filas se ordenan por el grupo y cada una sabe si ABRE grupo (lleva la cabecera encima).
  const ordenadas = useMemo((): { fila: KrFila; cabecera: string | null }[] => {
    if (!agrupar) return visibles.map((fila) => ({ fila, cabecera: null }));
    const grupoDe = (f: KrFila) => (agrupar === "productor" ? f.productorNombre : f.fincaNombre ?? "Sin finca");
    const orden = [...visibles].sort((a, b) => grupoDe(a).localeCompare(grupoDe(b), "es-CO"));
    return orden.map((fila, i) => ({ fila, cabecera: i === 0 || grupoDe(orden[i - 1]) !== grupoDe(fila) ? grupoDe(fila) : null }));
  }, [visibles, agrupar]);

  // El mapa: un pin por FINCA (color = su Visa) y uno por LOTE (color = su grado) sobre la misma finca.
  // `GeoMap` abre en círculo los que comparten coordenada, así que los lotes de una finca se tocan por separado.
  const pines = useMemo((): GeoMarker[] => {
    const vistos = new Set<string>();
    const out: GeoMarker[] = [];
    for (const f of visibles) {
      if (f.lat == null || f.lng == null || !f.fincaId) continue;
      if (!vistos.has(f.fincaId)) {
        vistos.add(f.fincaId);
        out.push({
          id: `finca:${f.fincaId}`,
          lat: f.lat,
          lng: f.lng,
          color: f.visa?.tono === "good" ? "#166534" : f.visa?.tono === "bad" ? "#991B1B" : "#B45309",
          title: f.fincaNombre ?? "Finca",
          lines: [f.fincaCodigo ?? "", f.visa?.label ?? "", f.fincaLugar, f.productorNombre].filter(Boolean),
          link: { label: "Abrir la finca", href: `/ocp/kr?finca=${f.fincaId}` },
        });
      }
      if (f.loteId) {
        out.push({
          id: `lote:${f.loteId}`,
          lat: f.lat,
          lng: f.lng,
          color: f.grado ? GRADO_HEX[f.grado] ?? "#1A1C1E" : "#1A1C1E",
          title: f.loteNombre ?? "Lote",
          lines: [f.loteRef ?? "", f.gradoLabel ?? "Sin grado", f.etapaLabel ?? "", f.fincaNombre ?? ""].filter(Boolean),
          link: { label: "Abrir el lote", href: `/ocp/kr?lote=${f.loteId}` },
        });
      }
    }
    return out;
  }, [visibles]);

  const cuenta = {
    productores: new Set(visibles.map((f) => f.productorId)).size,
    fincas: new Set(visibles.map((f) => f.fincaId).filter(Boolean)).size,
    lotes: visibles.filter((f) => f.loteId).length,
  };

  const chip = (k: FiltroRapido, label: string) => (
    <button
      type="button"
      className={`btn btn-sm ${rapido === k ? "btn-solid" : ""}`}
      aria-pressed={rapido === k}
      onClick={() => setRapido(rapido === k ? "" : k)}
    >
      {label}
    </button>
  );

  return (
    <div>
      <nav className={styles.tabs} aria-label="Vista">
        <a href="#tabla" className={vista === "tabla" ? styles.tabActive : undefined} onClick={(e) => { e.preventDefault(); setVista("tabla"); }}>
          Tabla
        </a>
        <a href="#mapa" className={vista === "mapa" ? styles.tabActive : undefined} onClick={(e) => { e.preventDefault(); setVista("mapa"); }}>
          Mapa
        </a>
      </nav>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <input
          id="kr-buscar"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar productor, finca, lote o código…"
          aria-label="Buscar"
          style={{ flex: "1 1 240px", padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <select id="kr-pais" aria-label="País" value={pais} onChange={(e) => { setPais(e.target.value); setDepto(""); }}>
          <option value="">País</option>
          {paises.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select id="kr-depto" aria-label="Departamento" value={depto} onChange={(e) => setDepto(e.target.value)}>
          <option value="">Departamento</option>
          {deptos.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select id="kr-grado" aria-label="Grado" value={grado} onChange={(e) => setGrado(e.target.value)}>
          <option value="">Grado</option>
          {Object.entries(GRADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select id="kr-circuito" aria-label="Circuito" value={circuito} onChange={(e) => setCircuito(e.target.value)}>
          <option value="">Circuito</option>
          {[...ORDEN_DEL_CIRCUITO, "no_apto" as const].map((k) => <option key={k} value={k}>{CIRCUITO_LABEL[k]}</option>)}
        </select>
        {temporadas.length > 0 && <SeasonRangeDial seasons={temporadas} range={rango} onChange={setRango} />}
        <select id="kr-agrupar" aria-label="Agrupar" value={agrupar} onChange={(e) => setAgrupar(e.target.value as Agrupar)}>
          <option value="">Sin agrupar</option>
          <option value="productor">Por productor</option>
          <option value="finca">Por finca</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        {chip("galardonados", "Galardonados")}
        {chip("sin-finca", "Sin finca")}
        {chip("sin-lote", "Sin lote")}
        <span className={styles.meta} style={{ marginTop: 0 }}>
          {cuenta.productores} productores · {cuenta.fincas} fincas · {cuenta.lotes} lotes
        </span>
      </div>

      {vista === "mapa" ? (
        pines.length ? (
          <>
            <GeoMap markers={pines} height={520} />
            <p className={styles.meta}>
              Finca: verde = Pasaporte vigente o aprobado · ámbar = en trámite · rojo = rechazado o no apta. Lote: el color de su grado; negro,
              sin grado todavía. Lo que no tiene coordenadas no sale en el mapa — sí en la tabla.
            </p>
          </>
        ) : (
          <p className={styles.empty}>Nada de lo filtrado tiene coordenadas todavía.</p>
        )
      ) : !ordenadas.length ? (
        <p className={styles.empty}>Nada coincide con esos filtros.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "var(--card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {/* V5.73 · el vocabulario EUDR asentado en la V5.65 (`src/lib/eudr.ts`): PASAPORTE es de la finca,
                    VISA es del lote (el veredicto documental que aquí se llamaba «EVA»); EVA es la catación. */}
                {["Productor", "Finca", "Lote", "Circuito", "Pasaporte EUDR", "Ficha", "Visa", "Muestra", "Grado", "Oferta CP", "Trato"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenadas.map(({ fila: f, cabecera }) => {
                return [
                  cabecera !== null && (
                    <tr key={`g-${f.clave}`}>
                      <td colSpan={11} style={{ ...td, background: "var(--paper)", fontWeight: 700, fontSize: 12.5 }}>{cabecera}</td>
                    </tr>
                  ),
                  <tr key={f.clave}>
                    <td style={td}>
                      <Link href={`/ocp/kr?productor=${f.productorId}`} style={enlace}>{f.productorNombre}</Link>
                      <span style={sub}>{[f.productorCodigo, f.segmento, f.departamento].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td style={td}>
                      {f.fincaId ? (
                        <>
                          <Link href={`/ocp/kr?finca=${f.fincaId}`} style={enlace}>{f.fincaNombre}</Link>
                          <span style={sub}>{[f.fincaCodigo, f.fincaLugar].filter(Boolean).join(" · ")}</span>
                        </>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>sin finca</span>
                      )}
                    </td>
                    <td style={td}>
                      {f.loteId ? (
                        <>
                          <Link href={`/ocp/kr?lote=${f.loteId}`} style={enlace}>{f.loteNombre}</Link>
                          <span style={sub}>{[f.loteRef, f.etapaLabel, f.temporadaLabel].filter(Boolean).join(" · ")}</span>
                        </>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>sin lote</span>
                      )}
                    </td>
                    <td style={td}>
                      <Insignia v={f.circuito} />
                      {f.circuito && f.circuito.falta.length > 0 && <span style={sub}>Falta: {f.circuito.falta.join(" · ")}</span>}
                    </td>
                    <td style={td}>{f.fincaId ? <Link href={`/ocp/kr?finca=${f.fincaId}`} style={{ textDecoration: "none" }}><Insignia v={f.visa} /></Link> : <Insignia v={null} />}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {f.ficha ? (
                        <Link href={`/ocp/kr?lote=${f.loteId}`} style={{ textDecoration: "none", display: "inline-flex", gap: 4 }} title={PASOS_DE_LA_FICHA.map((p, i) => `${p} ${f.ficha![i] ? "✓" : "—"}`).join(" · ")}>
                          {PASOS_DE_LA_FICHA.map((p, i) => (
                            <span key={p} style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 5px", borderRadius: 4, background: f.ficha![i] ? "#DCFCE7" : "var(--line)", color: f.ficha![i] ? "#166534" : "var(--muted)" }}>
                              {p}
                            </span>
                          ))}
                        </Link>
                      ) : (
                        <Insignia v={null} />
                      )}
                    </td>
                    <td style={td}><Insignia v={f.eva} /></td>
                    <td style={td}><Insignia v={f.muestra} /></td>
                    <td style={td}>
                      {f.gradoLabel ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12.5 }}>
                          <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: GRADO_HEX[f.grado ?? ""] ?? "#1A1C1E" }} />
                          {f.gradoLabel}
                        </span>
                      ) : (
                        <Insignia v={null} />
                      )}
                    </td>
                    <td style={td}>{f.oferta ? <Link href="/ocp/ofertas" style={{ textDecoration: "none" }}><Insignia v={f.oferta} /></Link> : <Insignia v={null} />}</td>
                    <td style={td}>{f.trato ? <Link href={`/ocp/contratos/${f.trato.contratoId}`} style={{ textDecoration: "none" }}><Insignia v={f.trato} /></Link> : <Insignia v={null} />}</td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
