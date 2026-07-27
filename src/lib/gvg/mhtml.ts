// NOTE: no "server-only" — pure parsing helper, exercised directly by QA
// scripts. Nothing here touches clients or secrets.
import { simpleParser } from "mailparser";

// ── .mhtml → job posting text ────────────────────────────────────────────────
// A LinkedIn "Save as → Webpage, Single File (*.mhtml)" export is MIME
// multipart/related — exactly what mailparser already parses for the Buzón
// (quoted-printable + base64 decoding included).
//
// TWO THINGS BIT HERE, both worth keeping in mind before "simplifying" this:
//
// 1. mailparser CONCATENATES every text/html part into `.html`. A saved
//    LinkedIn page carries the main document plus one sub-document per iframe
//    (ads, trackers), so the string holds several complete <html> documents
//    back to back. The main document is the first one, hence the body slice.
//
// 2. Tag-stripping regexes MUST use a word boundary on the tag name. Without
//    it `<head` also matches `<header`, and since the next literal `</head>`
//    belongs to the NEXT sub-document, one `.replace()` silently deleted
//    ~215 KB — the entire job description — leaving only the page chrome
//    (measured 2026-07-27 on a real 5.8 MB export: 1.21 MB of HTML collapsed
//    to 165 characters of "Skip to search / Recaptcha requires verification").

const MAX_CHARS = 60_000;
/** Below this the <main> slice is treated as a miss and we keep the whole body. */
const MIN_MAIN_CHARS = 400;

/** The first complete document in the concatenated stream, narrowed to its
 *  <main> when the page has one (drops nav, rail and footer noise). */
function mainDocument(html: string): string {
  const bodyOpen = html.search(/<body\b[^>]*>/i);
  if (bodyOpen < 0) return html;
  const bodyClose = html.indexOf("</body>", bodyOpen);
  const body = html.slice(bodyOpen, bodyClose > 0 ? bodyClose : undefined);

  const mainOpen = body.search(/<main\b[^>]*>/i);
  if (mainOpen < 0) return body;
  const mainClose = body.indexOf("</main>", mainOpen);
  const main = body.slice(mainOpen, mainClose > 0 ? mainClose : undefined);
  return main.length >= MIN_MAIN_CHARS ? main : body;
}

function htmlToText(html: string): string {
  return (
    html
      // drop non-content subtrees entirely — \b so <head> never matches <header>
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
      .replace(/<head\b[\s\S]*?<\/head\s*>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, " ")
      .replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // block-ish tags become newlines so structure survives
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)\s*>/gi, "\n")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      // common entities
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      // collapse whitespace
      .replace(/[ \t\r\f\v]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
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

  // The <title> lives in the head we're about to drop, and mailparser also
  // surfaces it as the MIME subject — take whichever we can get.
  const titleMatch = html?.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i);
  const pageTitle = (titleMatch ? htmlToText(titleMatch[1]).trim() : parsed.subject?.trim()) || null;

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

  const source = html ? mainDocument(html) : (parsed.text ?? "");
  const text = htmlToText(source).slice(0, MAX_CHARS);
  return { text, pageTitle, jobTitleGuess, companyGuess };
}
