"use client";

// ── OCP · Cotizador Logístico · el editor ────────────────────────────────────
// Andamiaje (2026-08-04): la matemática de `logistico/model.ts` es la de la V19
// completa; la presentación es sobria a propósito — la herramienta original
// tiene barras de flujo, torta y cascada que aún no se portan.
//
// Lo que SÍ está aquí y es el corazón del módulo: el Incoterm decide qué bloques
// paga el vendedor. Cambiarlo no toca un número, cambia qué entra en el total.

import { useCallback, useMemo, useState } from "react";
import {
  INCO_AEREO,
  INCO_DATA,
  INCO_MARITIMO,
  TARIFF_LABELS,
  applyIncoterm,
  computeLogistico,
  defaultLogisticoInputs,
  type Incoterm,
  type LogisticoInputs,
  type TariffCode,
  type TransportMode,
} from "@/lib/cotizador/logistico/model";
import { issueQuote, saveQuoteDraft } from "@/lib/cotizador/actions";
import type { Quote } from "@/lib/cotizador/types";
import { money } from "./QuotesBoard";
import styles from "@/app/bcp/(app)/shared.module.css";

const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const usdF = (v: number) => `US$ ${v.toFixed(2)}`;

function hydrate(raw: Record<string, unknown>): LogisticoInputs {
  const d = defaultLogisticoInputs();
  const r = raw as Partial<LogisticoInputs>;
  return { ...d, ...r, rows: { ...d.rows, ...(r.rows ?? {}) } };
}

export function LogisticoEditor({ quote, onSaved }: { quote: Quote; onSaved: () => void }) {
  const [inp, setInp] = useState<LogisticoInputs>(() => hydrate(quote.inputs));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const locked = quote.status !== "borrador";

  const res = useMemo(() => computeLogistico(inp), [inp]);
  const set = useCallback((patch: Partial<LogisticoInputs>) => setInp((s) => ({ ...s, ...patch })), []);

  /** Cambiar de Incoterm o de modo RE-APLICA la cobertura sobre las filas. */
  const setIncoterm = useCallback((incoterm: Incoterm, transportMode: TransportMode) => {
    setInp((s) => applyIncoterm({ ...s, incoterm, transportMode }));
  }, []);

  const incoList = inp.transportMode === "maritimo" ? INCO_MARITIMO : inp.transportMode === "aereo" ? INCO_AEREO : (["DDP"] as Incoterm[]);

  async function save(alsoIssue: boolean) {
    setBusy(true);
    setError("");
    setMsg("");
    const r = await saveQuoteDraft(quote.id, {
      inputs: inp as unknown as Record<string, unknown>,
      results: res as unknown as Record<string, unknown>,
      total: Number(res.precioVentaTotal.toFixed(2)),
      unitLabel: `${nf.format(res.kgFinal)} kg · ${res.coverage.effective}`,
    });
    if (!r.ok) { setError(r.error); setBusy(false); return; }
    if (alsoIssue) {
      const e = await issueQuote(quote.id);
      if (!e.ok) { setError(e.error); setBusy(false); return; }
    }
    setBusy(false);
    setMsg(alsoIssue ? "Cotización emitida: el cálculo queda congelado." : "Borrador guardado.");
    onSaved();
  }

  return (
    <>
      {/* ── Términos de entrega: lo que gobierna todo ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Términos de entrega</strong>
          <span className={styles.badge}>{res.coverage.effective}</span>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ minWidth: 160 }}>
            <label htmlFor="mode">Transporte</label>
            <select id="mode" value={inp.transportMode} disabled={locked}
              onChange={(e) => {
                const m = e.target.value as TransportMode;
                const first = m === "maritimo" ? "FOB" : m === "aereo" ? "FCA" : "DDP";
                setIncoterm(first as Incoterm, m);
              }}>
              <option value="maritimo">Marítimo</option>
              <option value="aereo">Aéreo</option>
              <option value="courrier">Courier</option>
            </select>
          </div>
          <div className={styles.field} style={{ minWidth: 160 }}>
            <label htmlFor="inco">Incoterm</label>
            <select id="inco" value={inp.incoterm} disabled={locked || inp.transportMode === "courrier"}
              onChange={(e) => setIncoterm(e.target.value as Incoterm, inp.transportMode)}>
              {incoList.map((c) => <option key={c} value={c}>{c} · {INCO_DATA[c].name}</option>)}
            </select>
          </div>
          <div className={styles.field} style={{ minWidth: 190 }}>
            <label htmlFor="tar">Partida arancelaria</label>
            <select id="tar" value={inp.tariff} disabled={locked} onChange={(e) => set({ tariff: e.target.value as TariffCode })}>
              {(Object.keys(TARIFF_LABELS) as TariffCode[]).map((c) => <option key={c} value={c}>{TARIFF_LABELS[c]}</option>)}
            </select>
          </div>
          <div className={styles.field} style={{ minWidth: 130 }}>
            <label htmlFor="fx">USD/COP</label>
            <input id="fx" type="number" step="any" value={inp.usdCop} disabled={locked} onChange={(e) => set({ usdCop: Number(e.target.value) })} />
          </div>
        </div>
        <p className={styles.meta}>{INCO_DATA[res.coverage.effective].point}</p>
        <ul className={styles.auditList}>
          <li>Flete internacional: <strong>{res.coverage.sellerPaysFreight ? "lo paga CTC" : "lo paga el comprador"}</strong></li>
          <li>Seguro de transporte: <strong>{res.coverage.sellerInsures ? "lo paga CTC" : "lo paga el comprador"}</strong></li>
          <li>Importación en destino: <strong>{res.coverage.sellerImportsAtDestination ? "la gestiona CTC" : "la gestiona el comprador"}</strong></li>
          <li>Última milla: <strong>{res.coverage.sellerDoesLastMile ? "la cubre CTC" : "la cubre el comprador"}</strong></li>
        </ul>
        {res.warnings.length > 0 && <ul className={styles.warn}>{res.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      </div>

      {/* ── Rendimiento ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Rendimiento del lote</strong>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ minWidth: 150 }}>
            <label htmlFor="kgf">kg de producto final</label>
            <input id="kgf" type="number" step="any" value={inp.kgFinal} disabled={locked} onChange={(e) => set({ kgFinal: Number(e.target.value) })} />
          </div>
          <div className={styles.field} style={{ minWidth: 190 }}>
            <label htmlFor="fr">Factor: kg pergamino por 70 kg verde</label>
            <input id="fr" type="number" step="any" value={inp.kgPergPor70} disabled={locked} onChange={(e) => set({ kgPergPor70: Number(e.target.value) })} />
          </div>
          <div className={styles.field} style={{ minWidth: 150 }}>
            <label htmlFor="ma">Merma adicional (%)</label>
            <input id="ma" type="number" step="any" value={inp.mermaAdicionalPct} disabled={locked} onChange={(e) => set({ mermaAdicionalPct: Number(e.target.value) })} />
          </div>
          <div className={styles.field} style={{ minWidth: 170 }}>
            <label htmlFor="pp">Precio al productor (COP/carga)</label>
            <input id="pp" type="number" step="any" value={inp.precioProductorPorCarga ?? 0} disabled={locked}
              onChange={(e) => set({ precioProductorPorCarga: Number(e.target.value), sobreOn: false })} />
          </div>
        </div>
        <div className={styles.digestGrid}>
          {[
            ["Verde necesario", `${nf.format(res.kgVerdeNecesario)} kg`],
            ["Pergamino necesario", `${nf.format(res.kgPergNecesario)} kg`],
            ["Cargas a comprar", `${res.cargas} (${nf.format(res.kgPergComprado)} kg)`],
            ["Exceso por redondeo", `${nf.format(res.excesoPctCargas)}%`],
            ["Factor de carga", `${nf.format(res.factorCarga)} kg verde/carga`],
            ["Sobreprecio vs piso", `${nf.format(res.sobrePct)}%`],
          ].map(([k, v]) => (
            <div key={String(k)} className={styles.digestCard}>
              <span className={styles.digestK}>{k}</span>
              <span className={styles.digestV}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bloques de costo ── */}
      {res.blocks.filter((b) => b.rows.length > 0 || b.total > 0).map((b) => (
        <div key={b.block} className={styles.card}>
          <div className={styles.sectionHead}>
            <strong>{b.label}</strong>
            <span className={styles.badge}>{money(b.total)}</span>
          </div>
          {b.rows.length === 0 ? (
            <p className={styles.meta}>Se calcula a partir del bloque anterior.</p>
          ) : (
            <div className={styles.list}>
              {b.rows.map((r) => (
                <div key={r.id} className={styles.fincaRow}>
                  <label className={styles.taskCheck} style={{ minWidth: 220 }}>
                    <input type="checkbox" checked={r.on} disabled={locked}
                      onChange={(e) => set({ rows: { ...inp.rows, [r.id]: { ...inp.rows[r.id], on: e.target.checked } } })} />
                    {r.label}
                  </label>
                  <input type="number" step="any" style={{ maxWidth: 130 }} disabled={locked || !r.on} value={r.unitVal}
                    onChange={(e) => set({ rows: { ...inp.rows, [r.id]: { ...inp.rows[r.id], val: Number(e.target.value) } } })} />
                  <span className={styles.meta} style={{ minWidth: 150 }}>× {nf.format(r.qty)}</span>
                  <strong style={{ marginLeft: "auto" }}>{r.on ? money(r.total) : "—"}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* ── El número ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Resultado</strong>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ minWidth: 150 }}>
            <label htmlFor="mg">Margen (%)</label>
            <input id="mg" type="number" step="any" value={inp.margenPct} disabled={locked} onChange={(e) => set({ margenPct: Number(e.target.value) })} />
          </div>
        </div>
        <div className={styles.digestGrid}>
          {[
            ["CoGS total", money(res.cogsTotal)],
            ["CoGS por kg", money(res.cogsPorKg)],
            ["CoGS USD/kg", usdF(res.cogsUsdPorKg)],
            [`Cubierto por CTC hasta ${res.coverage.effective}`, money(res.costoHastaIncoterm)],
            ["A cargo del comprador", money(res.costoComprador)],
            ["Margen", money(res.margen)],
            ["Precio de venta", money(res.precioVentaTotal)],
            ["Precio USD/kg", usdF(res.precioVentaUsdPorKg)],
            ["Precio USD/lb", usdF(res.precioVentaUsdPorLb)],
          ].map(([k, v]) => (
            <div key={String(k)} className={styles.digestCard}>
              <span className={styles.digestK}>{k}</span>
              <span className={styles.digestV}>{v}</span>
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          Valor recuperable del excedente de pergamino: {money(res.valorMermas)} — informativo, no se descuenta del CoGS (igual que en la V19).
        </p>

        {!locked && (
          <div className={styles.actions} style={{ marginTop: 12 }}>
            <button className="btn btn-sm" type="button" disabled={busy} onClick={() => save(false)}>Guardar borrador</button>
            <button className="btn btn-sm btn-solid" type="button" disabled={busy || res.precioVentaTotal <= 0} onClick={() => save(true)}>
              Emitir cotización
            </button>
          </div>
        )}
        {locked && <p className={styles.meta}>Emitida. El cálculo está congelado; duplícala para rehacerla.</p>}
        {msg && <p className={styles.meta}>{msg}</p>}
        {error && <p className={styles.warn}>{error}</p>}
      </div>
    </>
  );
}
