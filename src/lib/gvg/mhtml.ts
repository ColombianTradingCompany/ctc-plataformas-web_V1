// NOTE: no "server-only" — pure parsing helper, exercised directly by QA
// scripts. Nothing here touches clients or secrets.
import { simpleParser } from "mailparser";

// ── .mhtml → job posting text ────────────────────────────────────────────────
// A LinkedIn "Save as → Webpage, Single File (*.mhtml)" export is MIME
// multipart/related — exactly what mailparser already parses for the Buzón
// (quoted-printable + base64 decoding included). We take the main text/html
// part, strip it to visible text, and clip it for the AI matcher.

const MAX_CHARS = 60_000;

function htmlToText(html: string): string {
  return (
    html
      // drop non-content subtrees entirely
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // block-ish tags become newlines so structure survives
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)>/gi, "\n")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      // common entities
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      // collapse whitespace
      .replace(/[ \t\r\f\v]+/g, " ")
      .replace(/\n\s*\n\s*/g, "\n\n")
      .trim()
  );
}

export type ParsedJobPage = {
  text: string;
  /** <title> of the saved page — LinkedIn format is "Job Title | Company | LinkedIn". */
  pageTitle: string | null;
  jobTitleGuess: string | null;
  companyGuess: string | null;
};

export async function parseJobMhtml(buffer: Buffer): Promise<ParsedJobPage> {
  const parsed = await simpleParser(buffer);
  const html = typeof parsed.html === "string" ? parsed.html : null;
  const raw = html ?? parsed.text ?? "";

  const titleMatch = html?.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? htmlToText(titleMatch[1]).trim() || null : null;

  // "(3) Job Title | Company | LinkedIn" → title + company
  let jobTitleGuess: string | null = null;
  let companyGuess: string | null = null;
  if (pageTitle) {
    const cleaned = pageTitle.replace(/^\(\d+\)\s*/, "");
    const parts = cleaned.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      jobTitleGuess = parts[0] || null;
      companyGuess = /linkedin/i.test(parts[1]) ? null : parts[1] || null;
    } else if (parts.length === 1) {
      jobTitleGuess = parts[0] || null;
    }
  }

  const text = htmlToText(html ?? raw).slice(0, MAX_CHARS);
  return { text, pageTitle, jobTitleGuess, companyGuess };
}
