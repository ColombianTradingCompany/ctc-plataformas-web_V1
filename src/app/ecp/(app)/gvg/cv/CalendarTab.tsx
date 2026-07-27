"use client";

import { useMemo, useState } from "react";
import { EVENT_META, type GvgApplication, type GvgEvent, type GvgEventKind } from "@/lib/gvg/cvData";
import { ApplicationCard } from "./ApplicationCard";
import styles from "./cv.module.css";

// ── helpers ─────────────────────────────────────────────────────────────────

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function dayLabel(key: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(`${key}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Monday-anchored week key, used by the activity chart. */
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

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

/**
 * Calendar in timeline form: every board movement as an icon on the day it
 * happened, newest first, with a stats dashboard docked on the right. The
 * timeline reads from the event log rather than the rows' mutable timestamps,
 * so a card that moved three times shows three marks.
 */
export function CalendarTab({ applications, events }: { applications: GvgApplication[]; events: GvgEvent[] }) {
  const [chart, setChart] = useState<ChartTab>("activity");
  const [openApp, setOpenApp] = useState<GvgApplication | null>(null);
  const [filter, setFilter] = useState<GvgEventKind | "all">("all");

  const appById = useMemo(() => new Map(applications.map((a) => [a.id, a])), [applications]);

  // Upcoming interviews are the one thing that looks FORWARD; everything else
  // in the log is history, so they get their own strip at the top.
  const upcoming = useMemo(
    () =>
      applications
        .filter((a) => a.interview_date && a.interview_date >= new Date().toISOString().slice(0, 10))
        .sort((a, b) => (a.interview_date! < b.interview_date! ? -1 : 1)),
    [applications]
  );

  const days = useMemo(() => {
    const shown = filter === "all" ? events : events.filter((e) => e.kind === filter);
    const map = new Map<string, GvgEvent[]>();
    for (const e of shown) {
      const k = dayKey(e.at);
      const list = map.get(k);
      if (list) list.push(e);
      else map.set(k, [e]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [events, filter]);

  // KPIs
  const total = applications.length;
  const sent = applications.filter((a) => a.status === "sent").length;
  const nextSteps = applications.filter((a) => a.followup_status === "next_steps").length;

  // Charts
  const activity = useMemo(() => {
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

  const kinds = useMemo(() => [...new Set(events.map((e) => e.kind))], [events]);

  return (
    <div className={styles.calWrap}>
      <div className={styles.calMain}>
        {upcoming.length > 0 && (
          <div className={styles.upcoming}>
            <p className={styles.accLabel}>Upcoming</p>
            {upcoming.map((a) => (
              <button key={a.id} type="button" className={styles.upcomingRow} onClick={() => setOpenApp(a)}>
                <span aria-hidden>⭐</span>
                <b>{a.interview_date}</b>
                <span>
                  {a.job_title ?? "(untitled)"}
                  {a.company ? ` · ${a.company}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.calFilters}>
          <button
            type="button"
            className={`${styles.filterChip} ${filter === "all" ? styles.filterChipOn : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              title={EVENT_META[k].label}
              className={`${styles.filterChip} ${filter === k ? styles.filterChipOn : ""}`}
              onClick={() => setFilter(k)}
            >
              <span aria-hidden>{EVENT_META[k].icon}</span>
            </button>
          ))}
        </div>

        {days.length === 0 && <p className={styles.accEmpty}>No activity yet.</p>}

        <div className={styles.timeline}>
          {days.map(([key, list]) => (
            <div key={key} className={styles.tlDay}>
              <p className={styles.tlDayHead}>
                {dayLabel(key)} <span className={styles.colCount}>{list.length}</span>
              </p>
              {list.map((e) => {
                const meta = EVENT_META[e.kind];
                const app = appById.get(e.application_id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={styles.tlRow}
                    onClick={() => app && setOpenApp(app)}
                    disabled={!app}
                    title={app ? "Open this application" : "This application was deleted"}
                  >
                    <span className={`${styles.tlIcon} ${styles[`tone_${meta.tone}` as const]}`} aria-hidden>
                      {meta.icon}
                    </span>
                    <span className={styles.tlTime}>{time(e.at)}</span>
                    <span className={styles.tlLabel}>
                      <b>{meta.label}</b>
                      {app ? (
                        <span className={styles.tlApp}>
                          {app.job_title ?? "(untitled)"}
                          {app.company ? ` · ${app.company}` : ""}
                        </span>
                      ) : (
                        <span className={styles.tlApp}>{e.detail ?? "deleted application"}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
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
