"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/components/panel/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import type { PvcEdition } from "@/lib/pvc/tipos";

// ── BCP · PVC · Ediciones ────────────────────────────────────────────────────
// La edición vigente arriba con sus KPIs; debajo el historial. Publicar se hace
// desde el Tablero (que es donde se ven los diales antes de fijar el número):
// esta pantalla es la lectura y el registro, no el formulario.

const cop = (v: number | null | undefined) => (v == null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v));
const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d).replace(".", ",")}%`);
const num = (v: number | null | undefined, d = 2) => (v == null ? "—" : v.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }));
const day = (d: string | null) => (d ? new Date(d.length > 10 ? d : `${d}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const ESTADO: Record<string, { label: string; cls: string }> = {
  published: { label: "Publicada", cls: styles.badgeGood },
  corrected: { label: "Corrección al alza", cls: styles.badgeWarn },
  superseded: { label: "Sustituida", cls: styles.badge },
  computed: { label: "Calculada", cls: styles.badge },
  draft: { label: "Borrador", cls: styles.badge },
};

export function EdicionesBoard({
  ediciones, modeloVersion, vigenteId, proximaId,
}: { ediciones: PvcEdition[]; modeloVersion: string | null; vigenteId: string | null; proximaId: string | null }) {
  // Vigente y próxima llegan RESUELTAS del servidor (ventana de vigencia). No
  // se deriva aquí: «la última publicada» no es «la que rige» — hay 7–8 semanas
  // entre publicar y entrar en vigor.
  const vigente = ediciones.find((e) => e.id === vigenteId) ?? null;
  const proxima = ediciones.find((e) => e.id === proximaId) ?? null;
  const [abierta, setAbierta] = useState<PvcEdition | null>(null);
  const k = vigente?.outputs?.kpis;
  const ed = vigente?.outputs?.edicion;
  const black = vigente?.outputs?.pila?.[0];

  return (
    <>
      <h1 className={styles.title}>PVC · Ponderación de Valor de Cosecha</h1>
      <p className={styles.subtitle}>
        La referencia de valor en pesos por carga: <strong>se fija por tres meses</strong> y se publica <strong>siete u ocho
        semanas antes</strong> de su fecha efectiva. Lo que rige hoy es lo que leen la escalera, los contratos y el precio al
        comprador — no lo último publicado. Modelo vigente: <strong>{modeloVersion ?? "sin versión"}</strong>.
      </p>

      {vigente ? (
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiTop}><span className={styles.kpiK}>{vigente.code} · {ESTADO[vigente.status]?.label}</span></span>
            <span className={styles.kpiV} style={{ display: "block" }}>{cop(vigente.pvcCop)}</span>
            <span className={styles.kpiSub}>por carga FR 94 · vigente {day(vigente.validFrom)} → {day(vigente.validTo)} · gobierna {ed?.gob ?? "—"}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiTop}><span className={styles.kpiK}>Prima sobre la cooperativa</span></span>
            <span className={styles.kpiV} style={{ display: "block" }}>{pct(k?.prima_coop)}</span>
            <span className={styles.kpiSub}>vs PEC del corte {cop(ed?.pec_corte)}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiTop}><span className={styles.kpiK}>Retorno de la finca Black</span></span>
            <span className={styles.kpiV} style={{ display: "block" }}>{num(k?.retorno_black)}×</span>
            <span className={styles.kpiSub}>sobre costo FEPCafé {cop(ed?.costo)}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiTop}><span className={styles.kpiK}>Sobreprecio FCA Black</span></span>
            <span className={styles.kpiV} style={{ display: "block" }}>{pct(k?.sobre_fca_black, 0)}</span>
            <span className={styles.kpiSub}>US$ {num(black?.n2)}/kg FCA · {num(k?.taza_black, 1)} ¢ por taza</span>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>
          {proxima
            ? `Ninguna edición rige hoy. La próxima (${proxima.code}) entra en vigor el ${day(proxima.validFrom)}.`
            : "No hay ninguna edición publicada. Publique la primera desde el Tablero."}
        </p>
      )}

      {proxima && (
        <div className={styles.card}>
          <div className={styles.sectionHead}>
            <strong>Próxima edición · {proxima.code}</strong>
            <span className={styles.badge}>publicada, aún no rige</span>
          </div>
          <p className={styles.meta}>
            <strong>{cop(proxima.pvcCop)}</strong> por carga · entra en vigor el <strong>{day(proxima.validFrom)}</strong> y rige hasta {day(proxima.validTo)} ·
            modelo {proxima.modelVersion ?? "—"} · gobierna {proxima.outputs?.edicion?.gob ?? "—"}.
            {vigente ? ` Hasta entonces manda ${vigente.code} (${cop(vigente.pvcCop)}).` : ""}
          </p>
          <p className={styles.meta}>
            El PVC se publica siete u ocho semanas antes de su fecha efectiva: esta cifra ya es pública y sirve para que
            productores y compradores vean con antelación el precio que viene, pero <strong>no es la que rige hoy</strong>.
          </p>
        </div>
      )}

      {vigente && (
        <div className={styles.card}>
          <div className={styles.sectionHead}><strong>Escalera y pila de precios de la edición vigente</strong></div>
          <div className={table.scroll}>
            <table className={table.t}>
              <thead><tr><th>Banda</th><th>Puntaje</th><th style={{ textAlign: "right" }}>Mult.</th><th style={{ textAlign: "right" }}>COP / carga</th><th style={{ textAlign: "right" }}>MOQ kg</th><th style={{ textAlign: "right" }}>N2 FCA US$/kg</th><th style={{ textAlign: "right" }}>N3 CIP al MOQ</th><th style={{ textAlign: "right" }}>N4 DDP</th></tr></thead>
              <tbody>
                {vigente.outputs.pila.map((f) => (
                  <tr key={f.b}>
                    <td><strong>{f.b}</strong></td>
                    <td>{f.b === "Tyrian" ? "≥ 89 · subasta desde Gold" : vigente.outputs.escalera.find((x) => x.banda === f.b)?.rango}</td>
                    <td style={{ textAlign: "right" }}>{f.b === "Tyrian" ? `cierre ej. ×${f.m}` : `×${f.m}`}</td>
                    <td style={{ textAlign: "right" }}>{cop(f.copc)}</td>
                    <td style={{ textAlign: "right" }}>{f.moq}</td>
                    <td style={{ textAlign: "right" }}>{num(f.n2)}</td>
                    <td style={{ textAlign: "right" }}>{num(f.n3)}</td>
                    <td style={{ textAlign: "right" }}>{num(f.n4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.meta}>
            Precios al comprador en US$ a la TRM del corte ({num(vigente.inputs.trm)}) sobre kilos garantizados por carga; FCA Bogotá (≈FOB) → CIP aeropuerto (≈CIF) → DDP en destinos habilitados. Los costos de la pila son estimados hasta tener cotizaciones (D2 §13.1).
          </p>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Historial de ediciones</strong>
          <span className={styles.actions}>
            <Link href="/ecp/pvc/tablero" className="btn btn-sm btn-solid">Abrir el Tablero para publicar</Link>
          </span>
        </div>
        {ediciones.length === 0 ? (
          <p className={styles.empty}>Todavía no hay ediciones.</p>
        ) : (
          <div className={table.scroll}>
            <table className={table.t}>
              <thead><tr><th>Código</th><th>Estado</th><th>Corte</th><th>Publicada</th><th style={{ textAlign: "right" }}>PVC</th><th style={{ textAlign: "right" }}>Prima coop.</th><th>Gobierna</th><th>Modelo</th><th>Huella</th><th></th></tr></thead>
              <tbody>
                {ediciones.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.code}</strong>
                      {e.id === vigenteId && <> <span className={styles.badgeGood}>rige hoy</span></>}
                      {e.id === proximaId && <> <span className={styles.badge}>próxima</span></>}
                    </td>
                    <td><span className={ESTADO[e.status]?.cls ?? styles.badge}>{ESTADO[e.status]?.label ?? e.status}</span></td>
                    <td>{day(e.cutDate)}</td>
                    <td>{day(e.publishedAt)}</td>
                    <td style={{ textAlign: "right" }}>{cop(e.pvcCop)}</td>
                    <td style={{ textAlign: "right" }}>{pct(e.outputs?.kpis?.prima_coop)}</td>
                    <td>{e.outputs?.edicion?.gob ?? "—"}</td>
                    <td>{e.modelVersion ?? "—"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{e.hash ?? "—"}</td>
                    <td style={{ textAlign: "right" }}><button type="button" className="btn btn-sm" onClick={() => setAbierta(e)}>Ver entradas</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {abierta && (
        <div role="dialog" aria-modal="true" onClick={() => setAbierta(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div className={styles.card} onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 720, width: "100%", maxHeight: "85vh", overflow: "auto", margin: 0 }}>
            <div className={styles.sectionHead}><strong>{abierta.code} · entradas y salida</strong></div>
            <p className={styles.meta}>
              FNC 30 d {cop(abierta.inputs.fnc_30d)} · FNC corte {cop(abierta.inputs.fnc_corte)} · TRM {num(abierta.inputs.trm)} · C {num(abierta.inputs.c_strip, 1)} · costo FEPCafé {cop(abierta.inputs.costo)} (+{pct(abierta.inputs.escalamiento, 0).replace("+", "")})
            </p>
            <p className={styles.meta}>
              L {cop(abierta.outputs.edicion.L)} · P {cop(abierta.outputs.edicion.P)} · ancla {cop(abierta.outputs.edicion.ancla)} · PEC 30 d {cop(abierta.outputs.edicion.pec30)} · mínimo de atractivo {cop(abierta.outputs.edicion.min_atr)} · piso {cop(abierta.outputs.edicion.piso)} · modificador {pct(abierta.outputs.edicion.modificador, 2)} → <strong>PVC {cop(abierta.pvcCop)}</strong> (gobierna {abierta.outputs.edicion.gob})
            </p>
            <p className={styles.meta}>
              Back-proof: prima media {pct(abierta.outputs.backproof.prima_media)}, mínima {pct(abierta.outputs.backproof.prima_min)}, {abierta.outputs.backproof.disparos} disparos en {abierta.outputs.backproof.n} franjas · cifra de salida {cop(abierta.outputs.cifra_salida)} por carga.
            </p>
            <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", background: "var(--bg-soft, #f6f4fb)", padding: 10, borderRadius: 8 }}>{JSON.stringify(abierta.inputs, null, 1)}</pre>
            <div className={styles.actions} style={{ justifyContent: "flex-end", display: "flex" }}>
              <button type="button" className="btn btn-sm btn-solid" onClick={() => setAbierta(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
