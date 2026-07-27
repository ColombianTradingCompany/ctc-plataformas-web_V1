"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EVENT_META, type GvgApplication, type GvgEvent } from "@/lib/gvg/cvData";
import type { GvgReport } from "@/lib/gvg/reportActions";
import styles from "./cv.module.css";

// ── Gantt-style timeline ─────────────────────────────────────────────────────
// A horizontal date axis with one lane per application: the bar spans from the
// day the application was created to the day it was sent (or to today while it
// is still in flight), board movements sit on the lane as icons, and a red rule
// marks today. Zoom changes the pixels-per-day; the whole range is rendered and
// scrolled rather than paged, so "Today" and the arrows are plain scrolls.

const DAY_PX = { week: 58, month: 26, quarter: 11 } as const;
type Zoom = keyof typeof DAY_PX;

const DAY_MS = 86_400_000;
const midnight = (d: Date | string) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const daysBetween = (a: Date, b: Date) => Math.round((midnight(b).getTime() - midnight(a).getTime()) / DAY_MS);
const addDays = (d: Date, n: number) => new Date(midnight(d).getTime() + n * DAY_MS);
const iso = (d: Date) => midnight(d).toISOString().slice(0, 10);
const pretty = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

type Lane = {
  app: GvgApplication;
  start: Date;
  end: Date;
  events: GvgEvent[];
  interview: Date | null;
  tone: "active" | "sent" | "next" | "rejected";
};

export function Timeline({
  applications,
  events,
  reports = [],
  onOpen,
  onOpenReport,
}: {
  applications: GvgApplication[];
  events: GvgEvent[];
  /** Emitted reports get their own lane: the span is the period covered, the
   *  marker is the day it was emitted. */
  reports?: GvgReport[];
  onOpen: (app: GvgApplication) => void;
  onOpenReport?: (report: GvgReport) => void;
}) {
  const [zoom, setZoom] = useState<Zoom>("month");
  const scroller = useRef<HTMLDivElement>(null);
  const dayPx = DAY_PX[zoom];
  const today = midnight(new Date());

  const eventsByApp = useMemo(() => {
    const m = new Map<string, GvgEvent[]>();
    for (const e of events) {
      const list = m.get(e.application_id);
      if (list) list.push(e);
      else m.set(e.application_id, [e]);
    }
    for (const list of m.values()) list.sort((a, b) => (a.at < b.at ? -1 : 1));
    return m;
  }, [events]);

  const lanes: Lane[] = useMemo(() => {
    return applications
      .map((app) => {
        const evs = eventsByApp.get(app.id) ?? [];
        const start = midnight(evs[0]?.at ?? app.created_at);
        const interview = app.interview_date ? midnight(app.interview_date) : null;
        // Still in flight? The bar runs to today, so an open application always
        // reaches the red line instead of stopping at its last movement.
        const lastMove = midnight(evs[evs.length - 1]?.at ?? app.updated_at ?? app.created_at);
        const end = app.status === "sent" ? lastMove : today > lastMove ? today : lastMove;
        const tone: Lane["tone"] =
          app.followup_status === "rejected"
            ? "rejected"
            : app.followup_status === "next_steps"
              ? "next"
              : app.status === "sent"
                ? "sent"
                : "active";
        return { app, start, end, events: evs, interview, tone };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [applications, eventsByApp, today]);

  // Full range: a little air on both sides, and always far enough right to
  // include a scheduled interview.
  const { rangeStart, totalDays } = useMemo(() => {
    if (!lanes.length) return { rangeStart: addDays(today, -7), totalDays: 21 };
    const mins = [
      ...lanes.map((l) => l.start.getTime()),
      ...reports.map((r) => midnight(r.period_start).getTime()),
    ];
    const maxs = [
      ...lanes.flatMap((l) => [l.end.getTime(), l.interview?.getTime() ?? 0]),
      ...reports.map((r) => midnight(r.period_end).getTime()),
    ];
    const s = addDays(new Date(Math.min(...mins)), -3);
    const e = addDays(new Date(Math.max(...maxs, today.getTime())), 7);
    return { rangeStart: s, totalDays: Math.max(daysBetween(s, e), 14) };
  }, [lanes, reports, today]);

  const x = (d: Date) => daysBetween(rangeStart, d) * dayPx;
  const width = totalDays * dayPx;
  const todayX = x(today);

  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i)),
    [rangeStart, totalDays]
  );

  /** Month bands across the header, one per calendar month in range. */
  const months = useMemo(() => {
    const out: { label: string; left: number; width: number }[] = [];
    let i = 0;
    while (i < days.length) {
      const m = days[i].getMonth();
      let j = i;
      while (j < days.length && days[j].getMonth() === m) j++;
      out.push({
        label: days[i].toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        left: i * dayPx,
        width: (j - i) * dayPx,
      });
      i = j;
    }
    return out;
  }, [days, dayPx]);

  const scrollToToday = () => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: Math.max(0, todayX - el.clientWidth / 2), behavior: "smooth" });
  };
  const page = (dir: -1 | 1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  // Land on today the first time, and whenever the zoom changes the scale.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, todayX - el.clientWidth / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-centre on zoom only
  }, [zoom]);

  return (
    <div className={styles.gantt}>
      <div className={styles.ganttBar}>
        <div className={styles.ganttTitle}>Timeline</div>
        <div className={styles.ganttCtl}>
          <select className={styles.zoomSel} value={zoom} onChange={(e) => setZoom(e.target.value as Zoom)} aria-label="Zoom">
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
          </select>
          <button type="button" className={styles.navBtn} onClick={() => page(-1)} aria-label="Scroll back">
            ‹
          </button>
          <button type="button" className={styles.todayBtn} onClick={scrollToToday}>
            Today
          </button>
          <button type="button" className={styles.navBtn} onClick={() => page(1)} aria-label="Scroll forward">
            ›
          </button>
        </div>
      </div>

      <div className={styles.ganttScroll} ref={scroller}>
        <div className={styles.ganttCanvas} style={{ width }}>
          <div className={styles.ganttMonths}>
            {months.map((m) => (
              <span key={m.label} className={styles.ganttMonth} style={{ left: m.left, width: m.width }}>
                {m.label}
              </span>
            ))}
          </div>

          <div className={styles.ganttDays}>
            {days.map((d, i) => {
              const isToday = d.getTime() === today.getTime();
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <span
                  key={i}
                  className={`${styles.ganttDay} ${weekend ? styles.ganttWeekend : ""}`}
                  style={{ left: i * dayPx, width: dayPx }}
                >
                  <b className={isToday ? styles.ganttDayToday : undefined}>
                    {dayPx >= 18 ? d.getDate() : d.getDate() % 5 === 0 ? d.getDate() : ""}
                  </b>
                </span>
              );
            })}
          </div>

          <div className={styles.ganttBody}>
            {/* day grid + weekend shading behind the lanes */}
            {days.map((d, i) => (
              <span
                key={i}
                className={`${styles.ganttGrid} ${d.getDay() === 0 || d.getDay() === 6 ? styles.ganttGridWeekend : ""}`}
                style={{ left: i * dayPx, width: dayPx }}
              />
            ))}
            <span className={styles.ganttToday} style={{ left: todayX }} aria-hidden />

            {reports.length > 0 && (
              <div className={styles.lane}>
                {reports.map((r) => {
                  const rs = midnight(r.period_start);
                  const re = midnight(r.period_end);
                  const left = x(rs);
                  const w = Math.max((daysBetween(rs, re) + 1) * dayPx, 6);
                  return (
                    <span key={r.id}>
                      <span className={styles.reportSpan} style={{ left, width: w }} title={`${r.title} covers ${r.period_start} to ${r.period_end}`} />
                      <button
                        type="button"
                        className={`${styles.laneIcon} ${styles.reportPin}`}
                        style={{ left: x(midnight(r.created_at)) + dayPx / 2 - 8 }}
                        title={`${r.title} · emitted ${new Date(r.created_at).toLocaleDateString("en-GB")}`}
                        onClick={() => onOpenReport?.(r)}
                      >
                        📊
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {lanes.length === 0 && <p className={styles.accEmpty}>No applications yet.</p>}

            {lanes.map((l) => {
              const left = x(l.start);
              const w = Math.max((daysBetween(l.start, l.end) + 1) * dayPx, 8);
              const wide = w >= 130;
              return (
                <div key={l.app.id} className={styles.lane}>
                  <button
                    type="button"
                    className={`${styles.laneBar} ${styles[`bar_${l.tone}` as const]}`}
                    style={{ left, width: w }}
                    onClick={() => onOpen(l.app)}
                    title={`${l.app.job_title ?? "(untitled)"} · ${pretty(l.start)} → ${pretty(l.end)}`}
                  >
                    {wide && <span className={styles.laneBarText}>{l.app.job_title ?? "(untitled)"}</span>}
                  </button>

                  {!wide && (
                    <button type="button" className={styles.laneLabel} style={{ left: left + w + 6 }} onClick={() => onOpen(l.app)}>
                      {l.app.job_title ?? "(untitled)"}
                    </button>
                  )}

                  {wide && (
                    <span className={styles.laneDates} style={{ left: left + w }}>
                      {`${pretty(l.start)} → ${pretty(l.end)}`}
                    </span>
                  )}

                  {/* board movements as icons on the lane */}
                  {dayPx >= 18 &&
                    l.events.map((e) => {
                      const meta = EVENT_META[e.kind];
                      return (
                        <button
                          key={e.id}
                          type="button"
                          className={styles.laneIcon}
                          style={{ left: x(midnight(e.at)) + dayPx / 2 - 8 }}
                          title={`${meta.label} · ${pretty(e.at)}`}
                          onClick={() => onOpen(l.app)}
                        >
                          {meta.icon}
                        </button>
                      );
                    })}

                  {l.interview && (
                    <button
                      type="button"
                      className={`${styles.laneIcon} ${styles.laneStar}`}
                      style={{ left: x(l.interview) + dayPx / 2 - 8 }}
                      title={`Interview · ${pretty(l.interview)}`}
                      onClick={() => onOpen(l.app)}
                    >
                      ⭐
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.ganttLegend}>
        <span>
          <i className={`${styles.legendDot} ${styles.bar_active}`} /> In progress
        </span>
        <span>
          <i className={`${styles.legendDot} ${styles.bar_sent}`} /> Sent
        </span>
        <span>
          <i className={`${styles.legendDot} ${styles.bar_next}`} /> Next steps
        </span>
        <span>
          <i className={`${styles.legendDot} ${styles.bar_rejected}`} /> Rejected
        </span>
        <span>
          <span aria-hidden>📊</span> Report
        </span>
        <span className={styles.legendSep} />
        <span>{iso(today) === iso(new Date()) ? "Red line = today" : ""}</span>
      </div>
    </div>
  );
}
