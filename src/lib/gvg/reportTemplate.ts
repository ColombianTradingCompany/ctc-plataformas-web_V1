// Pure report renderer: CSS layout + inline SVG charts, no dependency and no
// PDF engine. Same print path as the CV (open, then print to PDF). Every
// interpolated value goes through esc() — see HANDOFF gotcha 7.
import { REPORT_CRITERIA, sectionKpis, type ReportCriterionId, type ReportMetrics } from "./reportData";

const NAVY = "#1f3864";
const NAVY_DEEP = "#16294a";
const ACCENT = "#2e6be6";
const SOFT = "#edf0f8";
const MUTED = "#4a5a78";

/** A KPI cell. Long text values (a career-path name, say) get a smaller face
 *  so one wordy figure cannot stretch the whole row. */
function kpiCell(k: { label: string; value: string }): string {
  const long = k.value.length > 16;
  return `<div class="kpi"><span class="kpiV${long ? " kpiVSm" : ""}">${esc(k.value)}</span><span class="kpiL">${esc(k.label)}</span></div>`;
}

function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ReportInterpretation = {
  headline: string;
  sections: Partial<Record<ReportCriterionId, string>>;
  overall: string;
};

// ── SVG chart helpers (markup strings, not React) ───────────────────────────

function svgBars(data: { label: string; value: number }[], color = ACCENT): string {
  const W = 520;
  const H = 170;
  const pad = { t: 16, b: 26 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = W / Math.max(data.length, 1);
  const bars = data
    .map((d, i) => {
      const h = ((H - pad.t - pad.b) * d.value) / max;
      const x = i * bw;
      const y = H - pad.b - h;
      return `<rect x="${x + bw * 0.2}" y="${y}" width="${bw * 0.6}" height="${Math.max(h, d.value ? 2 : 0)}" rx="2.5" fill="${color}"/>
<text x="${x + bw / 2}" y="${y - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="${NAVY_DEEP}">${d.value || ""}</text>
<text x="${x + bw / 2}" y="${H - 9}" text-anchor="middle" font-size="8.5" fill="${MUTED}">${esc(d.label)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">${bars}</svg>`;
}

function svgGroupedBars(data: { label: string; created: number; sent: number }[]): string {
  const W = 520;
  const H = 180;
  const pad = { t: 18, b: 34 };
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.sent]));
  const gw = W / Math.max(data.length, 1);
  const body = data
    .map((d, i) => {
      const x = i * gw;
      const hc = ((H - pad.t - pad.b) * d.created) / max;
      const hs = ((H - pad.t - pad.b) * d.sent) / max;
      return `<rect x="${x + gw * 0.16}" y="${H - pad.b - hc}" width="${gw * 0.3}" height="${Math.max(hc, d.created ? 2 : 0)}" rx="2" fill="${ACCENT}"/>
<rect x="${x + gw * 0.52}" y="${H - pad.b - hs}" width="${gw * 0.3}" height="${Math.max(hs, d.sent ? 2 : 0)}" rx="2" fill="#2f8f5b"/>
<text x="${x + gw / 2}" y="${H - 17}" text-anchor="middle" font-size="8" fill="${MUTED}">${esc(d.label)}</text>`;
    })
    .join("");
  const legend = `<g>
<rect x="0" y="${H - 9}" width="9" height="9" rx="2" fill="${ACCENT}"/><text x="13" y="${H - 1.5}" font-size="8.5" fill="${MUTED}">created</text>
<rect x="70" y="${H - 9}" width="9" height="9" rx="2" fill="#2f8f5b"/><text x="83" y="${H - 1.5}" font-size="8.5" fill="${MUTED}">sent</text>
</g>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">${body}${legend}</svg>`;
}

function svgFunnel(steps: { label: string; value: number }[]): string {
  const W = 520;
  const rowH = 26;
  const H = steps.length * rowH + 6;
  const max = Math.max(1, ...steps.map((s) => s.value));
  const rows = steps
    .map((s, i) => {
      const w = ((W - 150) * s.value) / max;
      const y = i * rowH + 4;
      return `<text x="0" y="${y + 13}" font-size="9.5" fill="${MUTED}">${esc(s.label)}</text>
<rect x="110" y="${y + 3}" width="${Math.max(w, s.value ? 3 : 0)}" height="14" rx="3" fill="${ACCENT}" opacity="${1 - i * 0.13}"/>
<text x="${110 + Math.max(w, 3) + 6}" y="${y + 14}" font-size="9.5" font-weight="700" fill="${NAVY_DEEP}">${s.value}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">${rows}</svg>`;
}

function svgStacked(parts: { label: string; value: number; color: string }[]): string {
  const W = 520;
  const H = 92;
  const total = Math.max(
    1,
    parts.reduce((a, b) => a + b.value, 0)
  );
  let x = 0;
  const bar = parts
    .map((p) => {
      const w = (W * p.value) / total;
      const seg = `<rect x="${x}" y="10" width="${w}" height="26" fill="${p.color}"/>`;
      x += w;
      return seg;
    })
    .join("");
  const legend = parts
    .map((p, i) => {
      const lx = (i % 3) * 175;
      const ly = 56 + Math.floor(i / 3) * 18;
      return `<rect x="${lx}" y="${ly - 8}" width="9" height="9" rx="2" fill="${p.color}"/>
<text x="${lx + 13}" y="${ly}" font-size="9" fill="${MUTED}">${esc(p.label)} · ${p.value}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="chart"><g>${bar}</g>${legend}</svg>`;
}

function svgHBars(rows: { name: string; count: number }[]): string {
  const top = rows.slice(0, 6);
  const W = 520;
  const rowH = 24;
  const H = Math.max(top.length * rowH + 6, 30);
  const max = Math.max(1, ...top.map((r) => r.count));
  const body = top
    .map((r, i) => {
      const w = ((W - 190) * r.count) / max;
      const y = i * rowH + 4;
      const name = r.name.length > 26 ? `${r.name.slice(0, 25)}…` : r.name;
      return `<text x="0" y="${y + 13}" font-size="9.5" fill="${MUTED}">${esc(name)}</text>
<rect x="165" y="${y + 3}" width="${Math.max(w, 3)}" height="14" rx="3" fill="${NAVY}" opacity="${0.85 - i * 0.09}"/>
<text x="${165 + Math.max(w, 3) + 6}" y="${y + 14}" font-size="9.5" font-weight="700" fill="${NAVY_DEEP}">${r.count}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">${body}</svg>`;
}

// ── section bodies ──────────────────────────────────────────────────────────

function sectionChart(id: ReportCriterionId, m: ReportMetrics): string {
  switch (id) {
    case "pipeline":
      return m.pipeline
        ? svgFunnel([
            { label: "Created", value: m.pipeline.created },
            { label: "Matched", value: m.pipeline.matched },
            { label: "Rendered", value: m.pipeline.rendered },
            { label: "Sent", value: m.pipeline.sent },
            { label: "Next steps", value: m.pipeline.next_steps },
          ])
        : "";
    case "cadence":
      return m.cadence ? svgGroupedBars(m.cadence.weeks) : "";
    case "quality":
      return m.quality ? svgBars(m.quality.buckets, NAVY) : "";
    case "outcomes":
      return m.outcomes
        ? svgStacked([
            { label: "Awaiting", value: m.outcomes.awaiting, color: ACCENT },
            { label: "Cold", value: m.outcomes.cold, color: "#9aa8c2" },
            { label: "Next steps", value: m.outcomes.next_steps, color: "#b07d18" },
            { label: "Rejected", value: m.outcomes.rejected, color: "#c4544a" },
          ])
        : "";
    case "focus":
      return m.focus ? svgHBars(m.focus.by_career_path.map((p) => ({ name: p.name, count: p.count }))) : "";
  }
}

function sectionExtra(id: ReportCriterionId, m: ReportMetrics): string {
  if (id === "quality" && m.quality?.best.length) {
    const row = (x: { title: string; company: string | null; score: number }) =>
      `<li><b>${x.score}%</b> ${esc(x.title)}${x.company ? ` · ${esc(x.company)}` : ""}</li>`;
    // With a small sample there is no meaningful "weakest" group distinct from
    // the strongest, so show one honest ranked list instead of two identical ones.
    if (!m.quality.weakest.length) {
      return `<p class="miniLabel">Scored fits, strongest first</p><ul class="miniList">${m.quality.best.map(row).join("")}</ul>`;
    }
    return `<div class="twoCol">
  <div><p class="miniLabel">Strongest fits</p><ul class="miniList">${m.quality.best.map(row).join("")}</ul></div>
  <div><p class="miniLabel">Weakest fits</p><ul class="miniList">${m.quality.weakest.map(row).join("")}</ul></div>
</div>`;
  }
  if (id === "focus" && m.focus?.by_company.length) {
    return `<p class="miniLabel">Companies targeted</p><p class="chips">${m.focus.by_company
      .slice(0, 12)
      .map((c) => `<span class="chip">${esc(c.name)}${c.count > 1 ? ` ×${c.count}` : ""}</span>`)
      .join("")}</p>`;
  }
  return "";
}

export function renderReportHtml(input: {
  title: string;
  metrics: ReportMetrics;
  criteria: ReportCriterionId[];
  interpretation: ReportInterpretation | null;
}): string {
  const { title, metrics, criteria, interpretation } = input;
  const chosen = REPORT_CRITERIA.filter((c) => criteria.includes(c.id));

  const period = `${new Date(`${metrics.period.start}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} → ${new Date(`${metrics.period.end}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  // Headline KPI strip: the first three sections contribute one KPI each, so
  // the top of the report always answers "how much, how well, what came back".
  const headKpis = chosen.flatMap((c) => sectionKpis(c.id, metrics)).slice(0, 4);

  const sections = chosen
    .map(
      (c) => `<section class="sec">
  <div class="secHead"><h2>${esc(c.label)}</h2><span class="secBlurb">${esc(c.blurb)}</span></div>
  <div class="kpiRow">
    ${sectionKpis(c.id, metrics).map(kpiCell).join("")}
  </div>
  <div class="chartWrap">${sectionChart(c.id, metrics)}</div>
  ${sectionExtra(c.id, metrics)}
  ${
    interpretation?.sections?.[c.id]
      ? `<div class="interp"><p class="interpLabel">Reading</p><p>${esc(interpretation.sections[c.id])}</p></div>`
      : ""
  }
</section>`
    )
    .join("\n");

  const caveat = metrics.log_covers_period
    ? ""
    : `<p class="caveat">Movement counts (matched, rendered) come from the activity log, which starts ${
        metrics.log_starts_at ? esc(metrics.log_starts_at) : "later than this period"
      }. Applications handled before then are counted as created and sent, but their intermediate steps are not in the log.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #e8e8ec; }
  body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: #1c1c1e; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; box-shadow: 0 6px 30px rgba(0,0,0,.18); }
  @page { size: A4; margin: 12mm; }
  @media print { html, body { background: #fff; } .page { box-shadow: none; width: auto; min-height: 0; } }

  .top { background: ${NAVY}; color: #fff; padding: 14mm 14mm 10mm; }
  .kicker { font-size: 9pt; letter-spacing: .16em; text-transform: uppercase; color: #a9bce0; }
  .title { font-size: 22pt; font-weight: 800; line-height: 1.15; margin-top: 3mm; }
  .period { font-size: 10.5pt; color: #dde3f0; margin-top: 2mm; }
  .headline { font-size: 11pt; line-height: 1.5; color: #fff; margin-top: 5mm; padding-top: 4mm; border-top: 1px solid rgba(255,255,255,.25); }

  .strip { display: flex; gap: 0; background: ${SOFT}; border-bottom: 1px solid #d5ddee; }
  .strip .kpi { flex: 1; padding: 6mm 4mm; text-align: center; border-right: 1px solid #d5ddee; }
  .strip .kpi:last-child { border-right: none; }

  .body { padding: 10mm 14mm 14mm; }
  .sec { margin-bottom: 9mm; page-break-inside: avoid; break-inside: avoid; }
  .secHead { border-bottom: 2px solid ${NAVY}; padding-bottom: 2mm; margin-bottom: 4mm; }
  .secHead h2 { font-size: 13pt; color: ${NAVY_DEEP}; }
  .secBlurb { font-size: 9pt; color: ${MUTED}; }
  .kpiRow { display: flex; gap: 3mm; margin-bottom: 4mm; }
  .kpi { flex: 1; background: ${SOFT}; border-radius: 2mm; padding: 3mm 2mm; text-align: center; }
  .kpiV { display: block; font-size: 15pt; font-weight: 800; color: ${NAVY_DEEP}; line-height: 1.1; }
  .kpiVSm { font-size: 10pt; line-height: 1.25; }
  .kpiL { display: block; font-size: 8pt; color: ${MUTED}; margin-top: 1mm; }
  .chartWrap { margin-bottom: 3mm; }
  .chart { width: 100%; height: auto; display: block; }

  .interp { background: #f7faff; border-left: 3px solid ${ACCENT}; padding: 3mm 4mm; border-radius: 0 2mm 2mm 0; }
  .interpLabel { font-size: 7.5pt; letter-spacing: .12em; text-transform: uppercase; color: ${MUTED}; margin-bottom: 1mm; }
  .interp p { font-size: 9.5pt; line-height: 1.5; }

  .twoCol { display: flex; gap: 6mm; margin-bottom: 3mm; }
  .twoCol > div { flex: 1; }
  .miniLabel { font-size: 7.5pt; letter-spacing: .12em; text-transform: uppercase; color: ${MUTED}; margin-bottom: 1.5mm; }
  .miniList { list-style: none; }
  .miniList li { font-size: 9pt; line-height: 1.45; }
  .chips { display: flex; flex-wrap: wrap; gap: 1.5mm; }
  .chip { font-size: 8.5pt; background: ${SOFT}; border-radius: 99px; padding: 1mm 3mm; color: ${NAVY_DEEP}; }

  .overall { background: ${NAVY}; color: #fff; padding: 6mm 7mm; border-radius: 2mm; page-break-inside: avoid; }
  .overall h2 { font-size: 12pt; margin-bottom: 3mm; }
  .overall p { font-size: 10pt; line-height: 1.55; color: #eaeffa; }
  .caveat { font-size: 8pt; color: ${MUTED}; margin-top: 4mm; font-style: italic; }
  .foot { font-size: 8pt; color: ${MUTED}; margin-top: 6mm; text-align: center; }
</style>
</head>
<body>
<div class="page">
  <header class="top">
    <div class="kicker">CV App Manager · Report</div>
    <div class="title">${esc(title)}</div>
    <div class="period">${esc(period)} · ${metrics.period.days} days · ${metrics.population} applications</div>
    ${interpretation?.headline ? `<p class="headline">${esc(interpretation.headline)}</p>` : ""}
  </header>

  ${
    headKpis.length
      ? `<div class="strip">${headKpis.map(kpiCell).join("")}</div>`
      : ""
  }

  <div class="body">
    ${sections}
    ${
      interpretation?.overall
        ? `<div class="overall"><h2>Reading the period as a whole</h2><p>${esc(interpretation.overall)}</p></div>`
        : ""
    }
    ${caveat}
    <p class="foot">Generated ${esc(new Date().toLocaleString("en-GB"))} · figures computed from the application record, interpretation written by Claude.</p>
  </div>
</div>
</body>
</html>`;
}
