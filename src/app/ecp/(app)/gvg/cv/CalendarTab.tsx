"use client";

import { useMemo, useState } from "react";
import type { GvgApplication, GvgEvent } from "@/lib/gvg/cvData";
import type { GvgReport } from "@/lib/gvg/reportActions";
import { openHtml } from "./ApplicationCard";
import { ApplicationCard } from "./ApplicationCard";
import { Timeline } from "./Timeline";
import styles from "./cv.module.css";

// ── charts (hand-rolled SVG: no chart dependency in this repo) ──────────────

const INK = "#0f2247";
const ACCENT = "#2e6be6";
const MUTED = "#4a608c";

function BarChart({ data, unit }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 320;
  const H = 150;
  const pad = { l: 6, r: 6, t: 10, b: 22 };
  const bw = (W - pad.l - pad.r) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label="Activity by week">
      {data.map((d, i) => {
        const h = ((H - pad.t - pad.b) * d.value) / max;
        const x = pad.l + i * bw;
        const y = H - pad.b - h;
        return (
          <g key={d.label}>
            <rect x={x + bw * 0.18} y={y} width={bw * 0.64} height={Math.max(h, d.value ? 2 : 0)} rx="2" fill={ACCENT} />
            {d.value > 0 && (
              <text x={x + bw / 2} y={y - 3} textAnchor="middle" fontSize="8" fill={INK} fontWeight="700">
                {d.value}
              </text>
            )}
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="7.5" fill={MUTED}>
              {d.label}
            </text>
          </g>
        );
      })}
      {unit && (
        <text x={pad.l} y={8} fontSize="7.5" fill={MUTED}>
          {unit}
        </text>
      )}
    </svg>
  );
}

function FunnelChart({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  const W = 320;
  const rowH = 26;
  const H = steps.length * rowH + 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label="Pipeline funnel">
      {steps.map((s, i) => {
        const w = ((W - 110) * s.value) / max;
        const y = i * rowH + 6;
        return (
          <g key={s.label}>
            <text x="0" y={y + 12} fontSize="8.5" fill={MUTED}>
              {s.label}
            </text>
            <rect x="96" y={y + 3} width={Math.max(w, s.value ? 3 : 0)} height="13" rx="2.5" fill={ACCENT} opacity={1 - i * 0.13} />
            <text x={96 + Math.max(w, 3) + 5} y={y + 13} fontSize="8.5" fill={INK} fontWeight="700">
              {s.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ScoreChart({ buckets }: { buckets: { label: string; value: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const W = 320;
  const H = 150;
  const pad = { l: 6, r: 6, t: 12, b: 22 };
  const bw = (W - pad.l - pad.r) / buckets.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label="Match score distribution">
      {buckets.map((b, i) => {
        const h = ((H - pad.t - pad.b) * b.value) / max;
        const x = pad.l + i * bw;
        const y = H - pad.b - h;
        return (
          <g key={b.label}>
            <rect x={x + bw * 0.16} y={y} width={bw * 0.68} height={Math.max(h, b.value ? 2 : 0)} rx="2" fill={INK} opacity={0.55 + i * 0.09} />
            {b.value > 0 && (
              <text x={x + bw / 2} y={y - 3} textAnchor="middle" fontSize="8" fill={INK} fontWeight="700">
                {b.value}
              </text>
            )}
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="7.5" fill={MUTED}>
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── the tab ─────────────────────────────────────────────────────────────────

type ChartTab = "activity" | "funnel" | "scores";

/** Gantt-style timeline of the whole search, with the stats dashboard docked
 *  on the right. */
export function CalendarTab({
  applications,
  events,
  reports,
}: {
  applications: GvgApplication[];
  events: GvgEvent[];
  reports: GvgReport[];
}) {
  const [chart, setChart] = useState<ChartTab>("activity");
  const [openApp, setOpenApp] = useState<GvgApplication | null>(null);

  // KPIs
  const total = applications.length;
  const sent = applications.filter((a) => a.status === "sent").length;
  const nextSteps = applications.filter((a) => a.followup_status === "next_steps").length;

  const activity = useMemo(() => {
    const weekStart = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
      return x;
    };
    const weeks: { label: string; value: number }[] = [];
    const now = weekStart(new Date());
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const value = events.filter((e) => {
        const t = new Date(e.at);
        return e.kind === "created" && t >= start && t < end;
      }).length;
      weeks.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, value });
    }
    return weeks;
  }, [events]);

  // Derived from the ROWS, not the event log: applications that predate the
  // event log have no "matched"/"rendered" marks, and counting events would
  // draw a funnel that says work never happened.
  const funnel = useMemo(
    () => [
      { label: "Created", value: applications.length },
      { label: "Matched", value: applications.filter((a) => !!a.match).length },
      { label: "Rendered", value: applications.filter((a) => !!a.cv_html).length },
      { label: "Sent", value: applications.filter((a) => a.status === "sent").length },
      { label: "Next steps", value: applications.filter((a) => a.followup_status === "next_steps").length },
    ],
    [applications]
  );

  const scores = useMemo(() => {
    const edges = [
      [0, 59],
      [60, 69],
      [70, 79],
      [80, 89],
      [90, 100],
    ];
    return edges.map(([lo, hi]) => ({
      label: lo === 0 ? "<60" : `${lo}s`,
      value: applications.filter((a) => {
        const s = a.match?.evaluation.overall_score;
        return typeof s === "number" && s >= lo && s <= hi;
      }).length,
    }));
  }, [applications]);

  return (
    <div className={styles.calWrap}>
      <div className={styles.calMain}>
        <Timeline
          applications={applications}
          events={events}
          reports={reports}
          onOpen={setOpenApp}
          onOpenReport={(r) => r.html && openHtml(r.html)}
        />
      </div>

      <aside className={styles.dash}>
        <div className={styles.kpiRow}>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{total}</span>
            <span className={styles.kpiLabel}>Applications</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{sent}</span>
            <span className={styles.kpiLabel}>Sent{total ? ` · ${Math.round((sent / total) * 100)}%` : ""}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{nextSteps}</span>
            <span className={styles.kpiLabel}>Next steps</span>
          </div>
        </div>

        <div className={styles.dashTabs} role="tablist" aria-label="Statistics">
          {(
            [
              ["activity", "Activity"],
              ["funnel", "Funnel"],
              ["scores", "Scores"],
            ] as [ChartTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={chart === key}
              className={`${styles.dashTab} ${chart === key ? styles.dashTabOn : ""}`}
              onClick={() => setChart(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.chartBox}>
          {chart === "activity" && <BarChart data={activity} unit="new applications per week" />}
          {chart === "funnel" && <FunnelChart steps={funnel} />}
          {chart === "scores" && <ScoreChart buckets={scores} />}
        </div>
      </aside>

      {openApp && (
        <div className={styles.overlay} onClick={() => setOpenApp(null)} role="presentation">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className={styles.modalTitle}>
              {openApp.job_title ?? "(untitled)"} {openApp.company ? `· ${openApp.company}` : ""}
            </h3>
            <ApplicationCard app={openApp} defaultOpen />
            <div className={styles.modalFoot}>
              <button type="button" className={styles.btnGhost} onClick={() => setOpenApp(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
