"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_CRITERIA, type ReportCriterionId } from "@/lib/gvg/reportData";
import { deleteGvgReport, emitGvgReport, reinterpretGvgReport, type GvgReport } from "@/lib/gvg/reportActions";
import { downloadHtml, openHtml } from "./ApplicationCard";
import styles from "./cv.module.css";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const ALL: ReportCriterionId[] = REPORT_CRITERIA.map((c) => c.id);

// Seeded at module load, not during render: reading the clock while rendering
// is impure (react-hooks/purity) and these are only the picker's defaults.
const DEFAULT_END = iso(new Date());
const DEFAULT_START = iso(new Date(Date.now() - 30 * 86_400_000));

/** Emit Report: pick a timeframe, tick the criteria, and the figures are
 *  computed here while the reading is written by the model. */
export function ReportsTab({ reports }: { reports: GvgReport[] }) {
  const router = useRouter();
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState<ReportCriterionId[]>(ALL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const toggle = (id: ReportCriterionId) =>
    setCriteria((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const preset = (days: number) => {
    setStart(iso(new Date(Date.now() - days * 86_400_000)));
    setEnd(iso(new Date()));
  };

  async function emit() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await emitGvgReport({ title, start, end, criteria });
      if (!res.ok) setError(res.error);
      else setNote("Report emitted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The report failed.");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function reinterpret(r: GvgReport) {
    setBusy(true);
    setError(null);
    try {
      const res = await reinterpretGvgReport(r.id);
      if (!res.ok) setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The interpretation failed.");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function remove(r: GvgReport) {
    if (!window.confirm(`Delete the report "${r.title}"?`)) return;
    const res = await deleteGvgReport(r.id);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  return (
    <div>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Emit a report</h2>
        <p className={styles.cardHint}>
          The figures are computed from your application record; the reading of them is written by Claude. Each criterion is interpreted on
          its own, and the whole period is read together at the end.
        </p>

        <div className={styles.grid3}>
          <label className={styles.field}>
            <span className={styles.label}>From</span>
            <input className={styles.input} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>To</span>
            <input className={styles.input} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Title (optional)</span>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Job search report"
            />
          </label>
        </div>

        <div className={styles.presets}>
          <button type="button" className={styles.filterChip} onClick={() => preset(7)}>
            Last 7 days
          </button>
          <button type="button" className={styles.filterChip} onClick={() => preset(30)}>
            Last 30 days
          </button>
          <button type="button" className={styles.filterChip} onClick={() => preset(90)}>
            Last quarter
          </button>
        </div>

        <p className={styles.label} style={{ marginTop: 14 }}>
          Criteria to include
        </p>
        <div className={styles.critGrid}>
          {REPORT_CRITERIA.map((c) => {
            const on = criteria.includes(c.id);
            return (
              <label key={c.id} className={`${styles.crit} ${on ? styles.critOn : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
                <span>
                  <b>{c.label}</b>
                  <span className={styles.critBlurb}>{c.blurb}</span>
                </span>
              </label>
            );
          })}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {note && <p className={styles.okNote}>{note}</p>}
        <div className={styles.modalFoot}>
          <button type="button" className={styles.btn} onClick={() => void emit()} disabled={busy || !criteria.length}>
            {busy ? "Reading the period…" : "Emit Report"}
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Saved reports <span className={styles.colCount}>{reports.length}</span>
        </h2>
        {reports.length === 0 ? (
          <p className={styles.accEmpty}>No reports yet.</p>
        ) : (
          <div className={styles.rows}>
            {reports.map((r) => (
              <div key={r.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.rowTitle}>{r.title}</div>
                  <div className={styles.rowSub}>
                    {r.period_start} → {r.period_end} · {r.criteria.length} criteria · emitted{" "}
                    {new Date(r.created_at).toLocaleDateString("en-GB")}
                    {r.interpretation?.headline ? ` · ${r.interpretation.headline}` : ""}
                  </div>
                  {r.error && <div className={styles.error}>{r.error}</div>}
                </div>
                <div className={styles.rowActions}>
                  {r.html && (
                    <>
                      <button type="button" className={styles.btnGhost} onClick={() => openHtml(r.html!)}>
                        Open
                      </button>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => downloadHtml(r.html!, `Report_${r.period_start}_${r.period_end}.html`)}
                      >
                        ⬇
                      </button>
                    </>
                  )}
                  {!r.interpretation && (
                    <button type="button" className={styles.btnGhost} onClick={() => void reinterpret(r)} disabled={busy}>
                      Re-read
                    </button>
                  )}
                  <button type="button" className={styles.btnDanger} onClick={() => void remove(r)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
