// NOTE: no "server-only" here on purpose — this module is PURE (no secrets, no
// clients), and QA scripts render it directly via --experimental-strip-types.
import type { GvgProfileData, MatchResult } from "./cvData";

// ── CV + cover letter renderers ──────────────────────────────────────────────
// Rebuild of the owner's "GVG CV - TEMPLATE.pdf" as a print-first A4 HTML
// document. Geometry was measured off the template render rather than guessed
// (2026-07-27), because the first pass got the colour structure backwards:
//
//   · a NAVY band across the FULL page width holds the name, headline, tagline
//     and contacts; the photo sits over the left third and hangs ~11 mm below
//     the band into the sidebar,
//   · the sidebar below it is LIGHT (#edf0f8) with dark text — only the section
//     headers (Core Skills / Education / Languages) are navy bands,
//   · the right column is white: role title left, dates right, the employer
//     context line right-aligned under it, then justified bullets.
//
// The PDF export path is the browser's print dialog — the page is sized to A4
// with print-color-adjust, so "Save as PDF" reproduces it 1:1. Every
// interpolated field goes through esc() — same rule as fichaPreviewHtml (see
// HANDOFF gotcha 7).

const NAVY = "#1f3864";
const NAVY_DEEP = "#16294a";
const SIDE_BG = "#edf0f8";
const SIDE_SUB = "#4a5a78";

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
      const dates = meta?.date_start ? `${meta.date_start} - ${meta.date_end || "Present"}` : "";
      // The AI supplies the context line ("Pixida · Mercedes-Benz Consultant ·
      // Munich"); fall back to whatever the repository row carries.
      const orgLine = e.org_line?.trim() || [meta?.org, meta?.location].filter(Boolean).join(" · ");
      const bullets = e.bullets
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => `<li>${esc(b)}</li>`)
        .join("");
      return `<section class="job">
  <div class="jobHead"><h3>${esc(e.role_title)}</h3><span class="dates">${esc(dates)}</span></div>
  ${orgLine ? `<p class="org">${esc(orgLine)}</p>` : ""}
  <ul>${bullets}</ul>
</section>`;
    })
    .join("\n");

  const skills = plan.core_skills
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `<li>${esc(s)}</li>`)
    .join("");

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
      (l) => `<div class="langRing"><span class="langName">${esc(l.name)}</span><span class="langLevel">${esc(l.level)}</span></div>`
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
  /* No overflow:hidden here (unlike the cover letter): a CV that runs long must
     visibly spill to a second page, never silently lose its last role. The
     type below is tuned so six entries with three bullets each fit one page. */
  .page {
    position: relative;
    width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff;
    display: flex; flex-direction: column;
    box-shadow: 0 6px 30px rgba(0,0,0,.18);
  }
  @page { size: A4; margin: 0; }
  @media print { html, body { background: #fff; } .page { box-shadow: none; margin: 0; } }

  /* ── full-width navy header ── */
  .top { height: 49mm; background: ${NAVY}; color: #fff; display: flex; flex: none; }
  .topSpacer { width: 35%; flex: none; }
  .ident { flex: 1; min-width: 0; padding: 9mm 8mm 0 2mm; }
  .name { font-size: 30pt; font-weight: 800; letter-spacing: .005em; line-height: 1.02; }
  .headline { font-size: 11pt; margin-top: 2.4mm; color: #dde3f0; line-height: 1.35; }
  .tagline { font-size: 11pt; color: #dde3f0; line-height: 1.35; }
  .contact { display: flex; gap: 5mm; flex-wrap: wrap; font-size: 8pt; margin-top: 3.2mm; color: #f0f3fa; }
  .contact span { display: inline-flex; align-items: center; gap: 1.5mm; }
  .dot { width: 3.6mm; height: 3.6mm; border-radius: 50%; background: #fff; color: ${NAVY};
    display: inline-flex; align-items: center; justify-content: center; font-size: 6.5pt; flex: none; }

  /* photo: sits over the header and hangs into the sidebar, as in the template */
  .photo {
    position: absolute; top: 5mm; left: 9.7mm; width: 54mm; height: 54mm;
    border-radius: 50%; overflow: hidden; border: 1.6mm solid #fff; background: #fff; z-index: 2;
  }
  .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .cols { flex: 1; display: flex; min-height: 0; }

  /* ── sidebar (light, navy bands) ── */
  .side { width: 35%; flex: none; background: ${SIDE_BG}; padding: 14mm 6mm 8mm; color: #22304d; }
  .summary { font-size: 8.4pt; line-height: 1.5; text-align: center; color: #22304d; }
  .band {
    background: ${NAVY}; color: #fff; text-align: center; font-size: 11pt; font-weight: 600;
    letter-spacing: .01em; padding: 1.9mm 0; margin: 6mm -6mm 3.4mm;
  }
  .skills { list-style: none; text-align: center; font-size: 9pt; line-height: 1.4; }
  .skills li { padding: 1.15mm 0; }
  .edu { margin-bottom: 2.6mm; }
  .eduTitle { font-size: 8.8pt; font-weight: 700; line-height: 1.25; }
  .eduSub { font-size: 7.8pt; color: ${SIDE_SUB}; line-height: 1.3; }
  /* Four rings must sit on ONE row like the template: at 6mm side padding the
     usable width is 61.5mm, so 4 x 14mm + 3 x 1.4mm = 60.2mm fits, and the row
     bleeds 2mm into the padding for headroom. A wrapped 4th ring pushed the
     whole document onto a second page (measured 2026-07-27). */
  .langRow { display: flex; justify-content: center; gap: 1.4mm; flex-wrap: nowrap; margin: 1mm -2mm 0; }
  .langRing {
    width: 14mm; height: 14mm; flex: none; border-radius: 50%; border: 0.8mm solid ${NAVY}; background: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2mm; text-align: center;
    overflow: hidden;
  }
  .langName { font-size: 6.1pt; font-weight: 700; line-height: 1.08; }
  .langLevel { font-size: 6.8pt; color: ${SIDE_SUB}; line-height: 1.08; }

  /* ── experience column ── */
  .main { flex: 1; min-width: 0; padding: 4mm 7mm 6mm; }
  .job { margin-bottom: 2.5mm; padding-bottom: 1.8mm; border-bottom: 0.4mm solid ${NAVY};
    page-break-inside: avoid; break-inside: avoid; }
  .job:last-child { border-bottom: none; }
  .jobHead { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
  .jobHead h3 { font-size: 10.8pt; font-weight: 700; color: ${NAVY_DEEP}; line-height: 1.18; }
  .dates { font-size: 8.6pt; font-weight: 700; white-space: nowrap; color: ${NAVY_DEEP}; }
  .org { text-align: right; font-size: 8.2pt; font-weight: 700; color: ${NAVY_DEEP}; margin-top: 0.4mm; }
  .job ul { margin: 1.2mm 0 0 4.2mm; }
  .job li { font-size: 8.1pt; line-height: 1.33; text-align: justify; margin-bottom: 0.6mm; }
</style>
</head>
<body>
<div class="page">
  ${photoDataUri ? `<div class="photo"><img src="${photoDataUri}" alt=""></div>` : ""}
  <header class="top">
    <div class="topSpacer"></div>
    <div class="ident">
      <div class="name">${esc(fullName)}</div>
      <div class="headline">${esc(plan.headline)}</div>
      <div class="tagline">${esc(plan.tagline)}</div>
      <div class="contact">
        <span><span class="dot">✉</span>${esc(profile.contact.email)}</span>
        <span><span class="dot">✆</span>${esc(profile.contact.phone)}</span>
        <span><span class="dot">⌂</span>${esc(profile.contact.location)}</span>
      </div>
    </div>
  </header>
  <div class="cols">
    <aside class="side">
      <p class="summary">${esc(plan.about)}</p>
      <div class="band">Core Skills</div>
      <ul class="skills">${skills}</ul>
      <div class="band">Education &amp; Certifications</div>
      ${education}
      <div class="band">Languages</div>
      <div class="langRow">${langs}</div>
    </aside>
    <div class="main">
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
  .whoSub { font-size: 9pt; color: ${SIDE_SUB}; margin-top: 1mm; }
  .meta { text-align: right; font-size: 9pt; color: ${SIDE_SUB}; line-height: 1.5; }
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
