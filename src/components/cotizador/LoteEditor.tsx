"use client";

// ── OCP · Cotizador de Lotes de Café · el editor ─────────────────────────────
// Andamiaje (2026-08-04): la matemática de `lote/model.ts` está completa y es la
// de la V15; lo que aquí es deliberadamente simple es la PRESENTACIÓN — la
// herramienta pública tiene campanas, embudos y curvas en SVG que aún no se
// portan. Primero que se pueda cotizar, guardar y recuperar; el vestido después.

import { useCallback, useMemo, useState } from "react";
import {
  ALL_ITEMS,
  COST_GROUPS,
  NODE_SHORT,
  UNIT_KG,
  activeStages,
  computeLote,
  defaultLoteInputs,
  type LoteInputs,
  type NodeIndex,
  type QuoteUnit,
} from "@/lib/cotizador/lote/model";
import { issueQuote, saveQuoteDraft } from "@/lib/cotizador/actions";
import type { Quote } from "@/lib/cotizador/types";
import { money } from "./QuotesBoard";
import styles from "@/app/bcp/(app)/shared.module.css";

const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

/** Los inputs guardados pueden ser de una versión anterior del modelo: se
 *  fusionan sobre los de por defecto para que nunca falte una clave nueva
 *  (misma lección que el datasheet de la Ficha Técnica). */
function hydrate(raw: Record<string, unknown>): LoteInputs {
  const d = defaultLoteInputs();
  const r = raw as Partial<LoteInputs>;
  return {
    ...d,
    ...r,
    mermas: { ...d.mermas, ...(r.mermas ?? {}) },
    costs: { ...d.costs, ...(r.costs ?? {}) },
  };
}

export function LoteEditor({ quote, onSaved }: { quote: Quote; onSaved: () => void }) {
  const [inp, setInp] = useState<LoteInputs>(() => hydrate(quote.inputs));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const locked = quote.status !== "borrador";

  const res = useMemo(() => computeLote(inp), [inp]);
  const active = useMemo(() => activeStages(inp), [inp]);
  const set = useCallback((patch: Partial<LoteInputs>) => setInp((s) => ({ ...s, ...patch })), []);

  async function save(alsoIssue: boolean) {
    setBusy(true);
    setError("");
    setMsg("");
    // Se guarda el resultado COMPLETO, no solo el total: una cotización emitida
    // tiene que poder explicarse aunque el modelo cambie después.
    const r = await saveQuoteDraft(quote.id, {
      inputs: inp as unknown as Record<string, unknown>,
      results: res as unknown as Record<string, unknown>,
      total: Number(res.quoteTotal.toFixed(2)),
      unitLabel: `${nf.format(res.finalKg)} kg de ${NODE_SHORT[inp.end].toLowerCase()}`,
    });
    if (!r.ok) {
      setError(r.error);
      setBusy(false);
      return;
    }
    if (alsoIssue) {
      const e = await issueQuote(quote.id);
      if (!e.ok) {
        setError(e.error);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    setMsg(alsoIssue ? "Cotización emitida: el cálculo queda congelado." : "Borrador guardado.");
    onSaved();
  }

  return (
    <>
      {/* ── El lote ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>El lote</strong>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ minWidth: 130 }}>
            <label htmlFor="qty">Cantidad</label>
            <input id="qty" type="number" min={0} step="any" value={inp.qty} disabled={locked}
              onChange={(e) => set({ qty: Number(e.target.value) })} />
          </div>
          <div className={styles.field} style={{ minWidth: 120 }}>
            <label htmlFor="unit">Unidad</label>
            <select id="unit" value={inp.unit} disabled={locked} onChange={(e) => set({ unit: e.target.value as QuoteUnit })}>
              {(Object.keys(UNIT_KG) as QuoteUnit[]).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className={styles.field} style={{ minWidth: 150 }}>
            <label htmlFor="start">Entra como</label>
            <select id="start" value={inp.start} disabled={locked} onChange={(e) => set({ start: Number(e.target.value) as NodeIndex })}>
              {NODE_SHORT.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
          </div>
          <div className={styles.field} style={{ minWidth: 150 }}>
            <label htmlFor="end">Sale como</label>
            <select id="end" value={inp.end} disabled={locked} onChange={(e) => set({ end: Number(e.target.value) as NodeIndex })}>
              {NODE_SHORT.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
          </div>
          <div className={styles.field} style={{ minWidth: 190 }}>
            <label htmlFor="marg">Margen sobre el costo (%)</label>
            <input id="marg" type="number" step="any" value={inp.marginPct} disabled={locked}
              onChange={(e) => set({ marginPct: Number(e.target.value) })} />
          </div>
          <label className={styles.taskCheck} style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={inp.storage} disabled={locked} onChange={(e) => set({ storage: e.target.checked })} />
            Incluir almacenamiento y transporte
          </label>
        </div>
        {res.warnings.length > 0 && (
          <ul className={styles.warn}>
            {res.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
      </div>

      {/* ── Mermas ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Mermas por etapa</strong>
          <span className={styles.meta}>Conversión {nf.format(res.conversionFactor)} : 1 · merma total {nf.format(res.totalMermaPct)}%</span>
        </div>
        {active.length === 0 ? (
          <p className={styles.meta}>Con ese tramo el lote no atraviesa ninguna transformación.</p>
        ) : (
          <div className={styles.formGrid}>
            {active.map((s) => {
              const v = inp.mermas[s.id] ?? s.mean;
              const z = s.std > 0 ? (v - s.mean) / s.std : 0;
              return (
                <div key={s.id} className={styles.field} style={{ minWidth: 220 }}>
                  <label htmlFor={`m-${s.id}`}>
                    {s.name} (%)
                    <span className={styles.meta}> típico {s.mean}% ±{s.std}</span>
                  </label>
                  <input id={`m-${s.id}`} type="number" step="any" min={s.min} max={s.max} value={v} disabled={locked}
                    onChange={(e) => set({ mermas: { ...inp.mermas, [s.id]: Number(e.target.value) } })} />
                  {Math.abs(z) >= 1 && (
                    <span className={Math.abs(z) >= 2 ? styles.warn : styles.meta}>
                      {nf.format(Math.abs(z))}σ {z > 0 ? "por encima" : "por debajo"} del promedio
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className={styles.list} style={{ marginTop: 10 }}>
          {res.chain.map((c) => (
            <div key={c.stageId} className={styles.fincaRow}>
              <span>{c.stageName} → <strong>{NODE_SHORT[c.node]}</strong></span>
              <span className={styles.meta}>
                {nf.format(c.kgFrom)} kg → {nf.format(c.kgTo)} kg <em>(−{nf.format(c.merma)} kg)</em>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Costos ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Costos</strong>
          <span className={styles.meta}>Vacío = el de referencia a esta cantidad</span>
        </div>
        {COST_GROUPS.map((g) => {
          const rows = res.costRows.filter((r) => r.groupId === g.id);
          if (rows.length === 0) return null;
          const gTotal = rows.filter((r) => r.on).reduce((a, r) => a + r.total, 0);
          return (
            <div key={g.id} style={{ marginBottom: 12 }}>
              <p className={styles.meta}>
                <strong>{g.name}</strong> · {g.flow} · {money(gTotal)}
              </p>
              <div className={styles.list}>
                {rows.map((r) => {
                  const item = ALL_ITEMS.find((i) => i.id === r.itemId)!;
                  const st = inp.costs[r.itemId] ?? { on: item.on, val: null };
                  return (
                    <div key={r.itemId} className={styles.fincaRow}>
                      <label className={styles.taskCheck} style={{ minWidth: 210 }}>
                        <input type="checkbox" checked={st.on} disabled={locked}
                          onChange={(e) => set({ costs: { ...inp.costs, [r.itemId]: { ...st, on: e.target.checked } } })} />
                        {r.name}
                      </label>
                      <span className={styles.meta} style={{ minWidth: 150 }}>
                        sobre {nf.format(r.qty)} kg de {NODE_SHORT[r.base].toLowerCase()}
                      </span>
                      <input
                        type="number" step="any" placeholder={String(Math.round(r.ref))} disabled={locked || !st.on}
                        value={st.val ?? ""} style={{ maxWidth: 120 }}
                        onChange={(e) => set({ costs: { ...inp.costs, [r.itemId]: { ...st, val: e.target.value === "" ? null : Number(e.target.value) } } })}
                      />
                      <span className={styles.meta} style={{ minWidth: 110 }}>$/kg</span>
                      <span className={Math.abs(r.z) >= 2 ? styles.warn : styles.meta} style={{ minWidth: 120 }}>
                        {Math.abs(r.z) < 0.15 ? "en la referencia" : `${nf.format(Math.abs(r.z))}σ ${r.z > 0 ? "arriba" : "abajo"}`}
                      </span>
                      <strong style={{ marginLeft: "auto" }}>{r.on ? money(r.total) : "—"}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── El número ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Resultado</strong>
        </div>
        <div className={styles.digestGrid}>
          {[
            ["Producto final", `${nf.format(res.finalKg)} kg de ${NODE_SHORT[inp.end].toLowerCase()}`],
            ["Costo total", money(res.costTotal)],
            ["Costo por kg final", money(res.costPerFinalKg)],
            ["Margen", money(res.margin)],
            ["Total cotizado", money(res.quoteTotal)],
            ["Precio por kg final", money(res.pricePerFinalKg)],
          ].map(([k, v]) => (
            <div key={String(k)} className={styles.digestCard}>
              <span className={styles.digestK}>{k}</span>
              <span className={styles.digestV}>{v}</span>
            </div>
          ))}
        </div>

        {!locked && (
          <div className={styles.actions} style={{ marginTop: 12 }}>
            <button className="btn btn-sm" type="button" disabled={busy} onClick={() => save(false)}>
              Guardar borrador
            </button>
            <button className="btn btn-sm btn-solid" type="button" disabled={busy || res.quoteTotal <= 0} onClick={() => save(true)}>
              Emitir cotización
            </button>
          </div>
        )}
        {locked && <p className={styles.meta}>Emitida el {new Date(quote.issuedAt ?? quote.updatedAt).toLocaleDateString("es-CO")}. El cálculo está congelado; duplícala para rehacerla.</p>}
        {msg && <p className={styles.meta}>{msg}</p>}
        {error && <p className={styles.warn}>{error}</p>}
      </div>
    </>
  );
}
