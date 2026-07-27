// Pure metrics engine for emitted reports. No clients, no secrets, no React —
// so a QA script can run it directly and assert on the numbers. The AI never
// computes a figure: it only interprets what this module produces.
import type { FollowupStatus, GvgApplication, GvgEvent } from "./cvData";

export type ReportCriterionId = "pipeline" | "cadence" | "quality" | "outcomes" | "focus";

export const REPORT_CRITERIA: { id: ReportCriterionId; label: string; blurb: string }[] = [
  { id: "pipeline", label: "Pipeline & throughput", blurb: "How many applications moved through each stage, and how fast." },
  { id: "cadence", label: "Activity cadence", blurb: "Week by week: how many started and how many went out." },
  { id: "quality", label: "Match quality", blurb: "Score distribution, averages, and the strongest and weakest fits." },
  { id: "outcomes", label: "Responses & outcomes", blurb: "What happened after sending: cold, next steps, rejected, interviews." },
  { id: "focus", label: "Target focus", blurb: "Which career paths and companies the search actually aimed at." },
];

const DAY_MS = 86_400_000;
const day = (d: string | Date) => new Date(d).toISOString().slice(0, 10);
const inPeriod = (iso: string | null, start: string, end: string) => !!iso && day(iso) >= start && day(iso) <= end;

export type PipelineMetrics = {
  created: number;
  matched: number;
  rendered: number;
  sent: number;
  next_steps: number;
  send_rate_pct: number;
  match_rate_pct: number;
  avg_days_create_to_send: number | null;
};

export type CadenceMetrics = {
  weeks: { label: string; created: number; sent: number }[];
  busiest_week: string | null;
  avg_created_per_week: number;
  silent_weeks: number;
};

export type QualityMetrics = {
  scored: number;
  avg_score: number | null;
  median_score: number | null;
  buckets: { label: string; value: number }[];
  best: { title: string; company: string | null; score: number }[];
  weakest: { title: string; company: string | null; score: number }[];
};

export type OutcomeMetrics = {
  sent: number;
  awaiting: number;
  cold: number;
  next_steps: number;
  rejected: number;
  interviews: number;
  response_rate_pct: number;
};

export type FocusMetrics = {
  by_career_path: { name: string; count: number; avg_score: number | null }[];
  by_company: { name: string; count: number }[];
  distinct_companies: number;
};

export type ReportMetrics = {
  period: { start: string; end: string; days: number };
  /** Applications created inside the period (the report's population). */
  population: number;
  /**
   * The event log started here. Movement counts (matched/rendered) can only be
   * derived from events, so a period that predates this is under-counted and
   * every consumer — including the model — must say so instead of implying the
   * work never happened.
   */
  log_starts_at: string | null;
  log_covers_period: boolean;
  pipeline?: PipelineMetrics;
  cadence?: CadenceMetrics;
  quality?: QualityMetrics;
  outcomes?: OutcomeMetrics;
  focus?: FocusMetrics;
};

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0);

export function computeReportMetrics(input: {
  applications: GvgApplication[];
  events: GvgEvent[];
  start: string;
  end: string;
  criteria: ReportCriterionId[];
}): ReportMetrics {
  const { applications, events, start, end, criteria } = input;

  const born = applications.filter((a) => inPeriod(a.created_at, start, end));
  const sentInPeriod = applications.filter((a) => inPeriod(a.sent_at, start, end));
  const eventsInPeriod = events.filter((e) => inPeriod(e.at, start, end));
  const logStart = events.length ? day([...events].sort((a, b) => (a.at < b.at ? -1 : 1))[0].at) : null;

  const metrics: ReportMetrics = {
    period: { start, end, days: Math.round((new Date(end).getTime() - new Date(start).getTime()) / DAY_MS) + 1 },
    population: born.length,
    log_starts_at: logStart,
    log_covers_period: !!logStart && logStart <= start,
  };

  if (criteria.includes("pipeline")) {
    const uniqueBy = (kind: GvgEvent["kind"]) => new Set(eventsInPeriod.filter((e) => e.kind === kind).map((e) => e.application_id)).size;
    const spans = sentInPeriod
      .map((a) => (a.created_at && a.sent_at ? (new Date(a.sent_at).getTime() - new Date(a.created_at).getTime()) / DAY_MS : null))
      .filter((n): n is number => n !== null && n >= 0);
    metrics.pipeline = {
      created: born.length,
      matched: uniqueBy("matched"),
      rendered: uniqueBy("rendered"),
      sent: sentInPeriod.length,
      next_steps: sentInPeriod.filter((a) => a.followup_status === "next_steps").length,
      send_rate_pct: pct(sentInPeriod.length, born.length),
      match_rate_pct: pct(uniqueBy("matched"), born.length),
      avg_days_create_to_send: spans.length ? Math.round((spans.reduce((a, b) => a + b, 0) / spans.length) * 10) / 10 : null,
    };
  }

  if (criteria.includes("cadence")) {
    const weeks: { label: string; created: number; sent: number }[] = [];
    const cursor = new Date(`${start}T00:00:00`);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // Monday anchor
    const endTime = new Date(`${end}T23:59:59`).getTime();
    while (cursor.getTime() <= endTime && weeks.length < 60) {
      const wStart = day(cursor);
      const wEndDate = new Date(cursor);
      wEndDate.setDate(wEndDate.getDate() + 6);
      const wEnd = day(wEndDate);
      weeks.push({
        label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
        created: applications.filter((a) => inPeriod(a.created_at, wStart, wEnd) && inPeriod(a.created_at, start, end)).length,
        sent: applications.filter((a) => inPeriod(a.sent_at, wStart, wEnd) && inPeriod(a.sent_at, start, end)).length,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
    const busiest = weeks.reduce<{ label: string; created: number } | null>(
      (best, w) => (!best || w.created > best.created ? { label: w.label, created: w.created } : best),
      null
    );
    metrics.cadence = {
      weeks,
      busiest_week: busiest && busiest.created > 0 ? busiest.label : null,
      avg_created_per_week: weeks.length ? Math.round((born.length / weeks.length) * 10) / 10 : 0,
      silent_weeks: weeks.filter((w) => w.created === 0 && w.sent === 0).length,
    };
  }

  if (criteria.includes("quality")) {
    const scored = born
      .map((a) => ({ app: a, score: a.match?.evaluation.overall_score }))
      .filter((x): x is { app: GvgApplication; score: number } => typeof x.score === "number");
    const nums = scored.map((s) => s.score);
    const ranked = [...scored].sort((a, b) => b.score - a.score);
    const label = (x: { app: GvgApplication; score: number }) => ({
      title: x.app.job_title ?? "(untitled)",
      company: x.app.company,
      score: x.score,
    });
    metrics.quality = {
      scored: scored.length,
      avg_score: nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null,
      median_score: median(nums),
      buckets: [
        [0, 59, "<60"],
        [60, 69, "60s"],
        [70, 79, "70s"],
        [80, 89, "80s"],
        [90, 100, "90+"],
      ].map(([lo, hi, lab]) => ({
        label: lab as string,
        value: nums.filter((n) => n >= (lo as number) && n <= (hi as number)).length,
      })),
      best: ranked.slice(0, 3).map(label),
      // Strictly the items NOT in `best`, worst first. Taking the bottom three
      // outright meant that with three scored applications both lists showed
      // the same rows, which reads as a bug rather than a small sample.
      weakest: ranked.slice(3).reverse().slice(0, 3).map(label),
    };
  }

  if (criteria.includes("outcomes")) {
    const by = (s: FollowupStatus) => sentInPeriod.filter((a) => a.followup_status === s).length;
    const answered = by("next_steps") + by("rejected");
    metrics.outcomes = {
      sent: sentInPeriod.length,
      awaiting: sentInPeriod.filter((a) => !a.followup_status || a.followup_status === "sent").length,
      cold: by("cold"),
      next_steps: by("next_steps"),
      rejected: by("rejected"),
      interviews: sentInPeriod.filter((a) => !!a.interview_date).length,
      response_rate_pct: pct(answered, sentInPeriod.length),
    };
  }

  if (criteria.includes("focus")) {
    const paths = new Map<string, { count: number; scores: number[] }>();
    const companies = new Map<string, number>();
    for (const a of born) {
      const p = a.match?.evaluation.career_path?.trim();
      if (p) {
        const entry = paths.get(p) ?? { count: 0, scores: [] };
        entry.count++;
        if (typeof a.match?.evaluation.overall_score === "number") entry.scores.push(a.match.evaluation.overall_score);
        paths.set(p, entry);
      }
      const c = a.company?.trim();
      if (c) companies.set(c, (companies.get(c) ?? 0) + 1);
    }
    metrics.focus = {
      by_career_path: [...paths.entries()]
        .map(([name, v]) => ({
          name,
          count: v.count,
          avg_score: v.scores.length ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : null,
        }))
        .sort((a, b) => b.count - a.count),
      by_company: [...companies.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      distinct_companies: companies.size,
    };
  }

  return metrics;
}

/** The KPI trio a section contributes to the report's top strip. */
export function sectionKpis(id: ReportCriterionId, m: ReportMetrics): { label: string; value: string }[] {
  switch (id) {
    case "pipeline":
      return m.pipeline
        ? [
            { label: "Created", value: String(m.pipeline.created) },
            { label: "Sent", value: `${m.pipeline.sent} · ${m.pipeline.send_rate_pct}%` },
            {
              label: "Avg days to send",
              value: m.pipeline.avg_days_create_to_send === null ? "—" : String(m.pipeline.avg_days_create_to_send),
            },
          ]
        : [];
    case "cadence":
      return m.cadence
        ? [
            { label: "Avg / week", value: String(m.cadence.avg_created_per_week) },
            { label: "Busiest week", value: m.cadence.busiest_week ?? "—" },
            { label: "Silent weeks", value: String(m.cadence.silent_weeks) },
          ]
        : [];
    case "quality":
      return m.quality
        ? [
            { label: "Scored", value: String(m.quality.scored) },
            { label: "Average", value: m.quality.avg_score === null ? "—" : `${m.quality.avg_score}%` },
            { label: "Median", value: m.quality.median_score === null ? "—" : `${m.quality.median_score}%` },
          ]
        : [];
    case "outcomes":
      return m.outcomes
        ? [
            { label: "Sent", value: String(m.outcomes.sent) },
            { label: "Next steps", value: String(m.outcomes.next_steps) },
            { label: "Response rate", value: `${m.outcomes.response_rate_pct}%` },
          ]
        : [];
    case "focus":
      return m.focus
        ? [
            { label: "Career paths", value: String(m.focus.by_career_path.length) },
            { label: "Companies", value: String(m.focus.distinct_companies) },
            { label: "Top path", value: m.focus.by_career_path[0]?.name ?? "—" },
          ]
        : [];
  }
}
