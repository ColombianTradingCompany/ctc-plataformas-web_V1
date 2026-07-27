// NOTE: no "server-only" here on purpose — this module is PURE (no secrets, no
// clients), and QA scripts render it directly via --experimental-strip-types.
import type { GvgProfileData, MatchResult } from "./cvData";

// ── CV + cover letter renderers ──────────────────────────────────────────────
// Rebuild of "GVG CV - TEMPLATE.pdf" as a print-first A4 HTML document: navy
// sidebar (photo, summary, core skills, education, languages) + white body
// (header band, experience entries). The PDF export path is the browser's
// print dialog — the page is sized to A4 with print-color-adjust, so "Save as
// PDF" reproduces it 1:1. Every interpolated field goes through esc() — same
// rule as fichaPreviewHtml (see HANDOFF gotcha 7).

const NAVY = "#1f3864";
const NAVY_DEEP = "#16294a";

function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type CvRenderInput = {
  profile: GvgProfileData;
  /** data: URI for the photo (embedded so the document is self-contained). */
  photoDataUri: string | null;
  plan: MatchResult["cv_plan"];
  /** date_start/date_end/org/location per experience id, from gvg_experiences. */
  expMeta: Map<string, { org: string | null; location: string | null; date_start: string | null; date_end: string | null }>;
  fullName: string;
};

export function renderCvHtml(input: CvRenderInput): string {
  const { profile, photoDataUri, plan, expMeta, fullName } = input;

  const entries = plan.experiences
    .map((e) => {
      const meta = expMeta.get(e.experience_id);
      const dates = meta?.date_start ? `${meta.date_start} – ${meta.date_end || "Present"}` : "";
      const orgLine = [meta?.org, meta?.location].filter(Boolean).join(" · ");
      const bullets = e.bullets.map((b) => `<li>${esc(b)}</li>`).join("");
      return `<section class="job">
  <div class="jobHead"><h3>${esc(e.role_title)}</h3><span class="dates">${esc(dates)}</span></div>
  ${orgLine ? `<p class="org">${esc(orgLine)}</p>` : ""}
  <ul>${bullets}</ul>
</section>`;
    })
    .join("\n");

  const skills = plan.core_skills.map((s) => `<li>${esc(s)}</li>`).join("");
  // The sidebar is tailored per application; the profile is only the fallback
  // for rows whose match predates the tailored-sidebar plan (2026-07-27).
  const educationList = plan.education?.length ? plan.education : profile.education;
  const languageList = plan.languages?.length ? plan.languages : profile.languages;
  const education = educationList
    .map(
      (ed) => `<div class="edu">
  <p class="eduTitle">${esc(ed.title)}</p>
  ${ed.sub ? `<p class="eduSub">${esc(ed.sub)}</p>` : ""}
  ${ed.detail ? `<p class="eduSub">${esc(ed.detail)}</p>` : ""}
</div>`
    )
    .join("");
  const langs = languageList
    .map(
      (l) => `<div class="lang"><div class="langRing"><span class="langName">${esc(l.name)}</span><span class="langLevel">${esc(
        l.level
      )}</span></div></div>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CV · ${esc(fullName)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #e8e8ec; }
  body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: #1c1c1e; }
  .page {
    width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff;
    display: flex; box-shadow: 0 6px 30px rgba(0,0,0,.18);
  }
  @page { size: A4; margin: 0; }
  @media print { html, body { background: #fff; } .page { box-shadow: none; margin: 0; } }

  /* ── sidebar ── */
  .side { width: 35%; background: ${NAVY}; color: #eef1f7; padding: 10mm 6mm 8mm; display: flex; flex-direction: column; }
  .photoWrap { width: 44mm; height: 44mm; border-radius: 50%; margin: 0 auto 6mm; border: 2.5mm solid #fff; overflow: hidden; background: #fff; }
  .photoWrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .summary { font-size: 8.6pt; line-height: 1.45; text-align: center; color: #dbe2ef; }
  .sideBand { background: ${NAVY_DEEP}; text-align: center; font-size: 10.5pt; font-weight: 700; letter-spacing: .02em;
    padding: 2.2mm 0; margin: 6mm -6mm 3.5mm; }
  .skills { list-style: none; text-align: center; font-size: 8.8pt; line-height: 1.35; }
  .skills li { padding: 1.1mm 0; }
  .edu { margin-bottom: 2.8mm; }
  .eduTitle { font-size: 8.8pt; font-weight: 700; }
  .eduSub { font-size: 8pt; color: #c4cede; line-height: 1.3; }
  .langRow { display: flex; justify-content: center; gap: 2.5mm; flex-wrap: wrap; margin-top: 1mm; }
  .langRing { width: 15.5mm; height: 15.5mm; border-radius: 50%; border: 1mm solid #ffffff33; outline: 0.5mm solid #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5mm; }
  .langName { font-size: 6.6pt; font-weight: 700; }
  .langLevel { font-size: 7.4pt; color: #c4cede; }

  /* ── body ── */
  .main { width: 65%; display: flex; flex-direction: column; }
  .head { background: ${NAVY}; color: #fff; padding: 9mm 8mm 5mm; }
  .name { font-size: 27pt; font-weight: 800; letter-spacing: .01em; line-height: 1.05; }
  .headline { font-size: 10.5pt; margin-top: 2mm; color: #dbe2ef; }
  .tagline { font-size: 10.5pt; color: #dbe2ef; }
  .contact { display: flex; gap: 5mm; flex-wrap: wrap; font-size: 8.2pt; margin-top: 3.5mm; color: #eef1f7; }
  .contact span { display: inline-flex; align-items: center; gap: 1.4mm; }
  .dot { width: 3.4mm; height: 3.4mm; border-radius: 50%; background: #fff; color: ${NAVY}; display: inline-flex;
    align-items: center; justify-content: center; font-size: 6.5pt; }
  .jobs { padding: 4mm 8mm 8mm; }
  .job { margin-bottom: 3.6mm; border-bottom: 0.4mm solid ${NAVY}; padding-bottom: 2.6mm; }
  .job:last-child { border-bottom: none; }
  .jobHead { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
  .jobHead h3 { font-size: 11pt; font-weight: 700; }
  .dates { font-size: 8.8pt; font-weight: 700; white-space: nowrap; }
  .org { text-align: right; font-size: 8.6pt; font-weight: 700; margin-top: 0.4mm; }
  .job ul { margin: 1.4mm 0 0 4.5mm; }
  .job li { font-size: 8.4pt; line-height: 1.38; text-align: justify; margin-bottom: 0.9mm; }
</style>
</head>
<body>
<div class="page">
  <aside class="side">
    ${photoDataUri ? `<div class="photoWrap"><img src="${photoDataUri}" alt=""></div>` : ""}
    <p class="summary">${esc(plan.about)}</p>
    <div class="sideBand">Core Skills</div>
    <ul class="skills">${skills}</ul>
    <div class="sideBand">Education &amp; Certifications</div>
    ${education}
    <div class="sideBand">Languages</div>
    <div class="langRow">${langs}</div>
  </aside>
  <div class="main">
    <header class="head">
      <div class="name">${esc(fullName)}</div>
      <div class="headline">${esc(plan.headline)}</div>
      <div class="tagline">${esc(plan.tagline)}</div>
      <div class="contact">
        <span><span class="dot">✉</span>${esc(profile.contact.email)}</span>
        <span><span class="dot">✆</span>${esc(profile.contact.phone)}</span>
        <span><span class="dot">⌂</span>${esc(profile.contact.location)}</span>
      </div>
    </header>
    <div class="jobs">
      ${entries}
    </div>
  </div>
</div>
</body>
</html>`;
}

// ── cover letter (markdown → forced one-pager) ──────────────────────────────

function mdToHtml(md: string): string {
  const paragraphs = md
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs
    .map((p) => {
      const inline = esc(p)
        .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
        .replace(/\*([^*]+)\*/g, "<i>$1</i>")
        .replace(/\n/g, "<br>");
      return `<p>${inline}</p>`;
    })
    .join("\n");
}

export function renderCoverLetterHtml(input: {
  fullName: string;
  profile: GvgProfileData;
  company: string | null;
  jobTitle: string | null;
  markdown: string;
}): string {
  const { fullName, profile, company, jobTitle, markdown } = input;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cover Letter · ${esc(fullName)}${company ? ` · ${esc(company)}` : ""}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #e8e8ec; }
  body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: #1c1c1e; }
  .page { width: 210mm; height: 297mm; margin: 0 auto; background: #fff; padding: 18mm 20mm;
    display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 6px 30px rgba(0,0,0,.18); }
  @page { size: A4; margin: 0; }
  @media print { html, body { background: #fff; } .page { box-shadow: none; margin: 0; } }
  .top { border-bottom: 1mm solid ${NAVY}; padding-bottom: 4mm; margin-bottom: 6mm;
    display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; }
  .who { font-size: 16pt; font-weight: 800; color: ${NAVY}; }
  .whoSub { font-size: 9pt; color: #55606e; margin-top: 1mm; }
  .meta { text-align: right; font-size: 9pt; color: #55606e; line-height: 1.5; }
  .re { font-size: 10.5pt; font-weight: 700; margin-bottom: 5mm; }
  .body { flex: 1; min-height: 0; }
  /* Forced one-pager: the page has a fixed height and hides overflow — if the
     letter is too long the tail visibly clips, which is the signal to shorten
     the text, never to spill to page 2. */
  .body p { font-size: 10pt; line-height: 1.55; text-align: justify; margin-bottom: 3.4mm; }
  .sign { margin-top: 5mm; font-size: 10pt; }
  .sign .name { font-weight: 700; color: ${NAVY}; margin-top: 6mm; }
</style>
</head>
<body>
<div class="page">
  <div class="top">
    <div>
      <div class="who">${esc(fullName)}</div>
      <div class="whoSub">${esc(profile.headline)}</div>
    </div>
    <div class="meta">
      ${esc(profile.contact.email)}<br>${esc(profile.contact.phone)}<br>${esc(profile.contact.location)}<br>${esc(today)}
    </div>
  </div>
  ${jobTitle || company ? `<p class="re">Re: ${esc([jobTitle, company].filter(Boolean).join(" · "))}</p>` : ""}
  <div class="body">
    ${mdToHtml(markdown)}
  </div>
</div>
</body>
</html>`;
}
