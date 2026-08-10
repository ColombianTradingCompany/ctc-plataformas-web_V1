"use server";

import { revalidatePath } from "next/cache";
import { registrarConsumo, usoDesdeAnthropic, USOS } from "@/lib/ai/consumo";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireGvgOwner } from "./requireGvgOwner";
import { parseJobMhtml } from "./mhtml";
import { renderCoverLetterHtml, renderCvHtml } from "./cvTemplate";
import {
  EMPTY_PROFILE,
  sanitizeStrings,
  type FollowupStatus,
  type GvgApplication,
  type GvgEducationEntry,
  type GvgEvent,
  type GvgEventKind,
  type GvgLanguage,
  type GvgProgress,
  type MatchResult,
} from "./cvData";

const BUCKET = "kaffetal-media";
const CV_PATH = "/ecp/gvg/cv";
const FULL_NAME = "Gabriel Vasquez";

type Result = { ok: true } | { ok: false; error: string };

function normalizeApplication(a: Record<string, unknown>): GvgApplication {
  return {
    id: a.id as string,
    job_title: (a.job_title as string | null) ?? null,
    company: (a.company as string | null) ?? null,
    job_url: (a.job_url as string | null) ?? null,
    mhtml_path: (a.mhtml_path as string | null) ?? null,
    job_text: (a.job_text as string | null) ?? null,
    status: a.status as GvgApplication["status"],
    match: (a.match as MatchResult | null) ?? null,
    cv_html: (a.cv_html as string | null) ?? null,
    cl_html: (a.cl_html as string | null) ?? null,
    followup_status: (a.followup_status as FollowupStatus | null) ?? null,
    interview_date: (a.interview_date as string | null) ?? null,
    sent_at: (a.sent_at as string | null) ?? null,
    notes: (a.notes as string | null) ?? null,
    error: (a.error as string | null) ?? null,
    progress: (a.progress as GvgProgress | null) ?? null,
    created_at: (a.created_at as string) ?? "",
    updated_at: (a.updated_at as string) ?? "",
  };
}

/** Record a board movement. Never throws: a lost timeline entry must not fail
 *  the action that produced it. */
async function logEvent(
  service: ReturnType<typeof createServiceRoleClient>,
  applicationId: string,
  kind: GvgEventKind,
  detail?: string | null
): Promise<void> {
  try {
    await service.from("gvg_application_events").insert({ application_id: applicationId, kind, detail: detail ?? null });
  } catch {
    /* timeline is best-effort */
  }
}

export async function loadGvgEvents(limit = 400): Promise<GvgEvent[]> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { data } = await service
    .from("gvg_application_events")
    .select("id, application_id, kind, detail, at")
    .order("at", { ascending: false })
    .limit(limit);
  return ((data as Record<string, unknown>[] | null) ?? []).map((e) => ({
    id: e.id as string,
    application_id: e.application_id as string,
    kind: e.kind as GvgEventKind,
    detail: (e.detail as string | null) ?? null,
    at: e.at as string,
  }));
}

/** Signed link to the saved job page. The rendered CV and letter live in the
 *  row itself, so the card can open them without a round trip. */
export async function getGvgSourceUrl(applicationId: string): Promise<{ url: string | null }> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { data: app } = await service.from("gvg_applications").select("mhtml_path").eq("id", applicationId).maybeSingle();
  if (!app?.mhtml_path) return { url: null };
  const { data } = await service.storage.from(BUCKET).createSignedUrl(app.mhtml_path as string, 3600);
  return { url: data?.signedUrl ?? null };
}

/** Lightweight poll for the cards sitting in a transit column. */
export async function getGvgLiveStatus(
  ids: string[]
): Promise<{ id: string; status: GvgApplication["status"]; progress: GvgProgress | null; error: string | null }[]> {
  await requireGvgOwner();
  if (!ids.length) return [];
  const service = createServiceRoleClient();
  const { data } = await service.from("gvg_applications").select("id, status, progress, error").in("id", ids);
  return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as GvgApplication["status"],
    progress: (r.progress as GvgProgress | null) ?? null,
    error: (r.error as string | null) ?? null,
  }));
}

/**
 * The AI may CHOOSE and ORDER education/language entries, never author them.
 * Match its picks back to the profile by name/title and take the profile's own
 * strings — that is what stops "C2" turning into "Fluent (C2)" or a degree
 * sprouting an invented description (both seen live 2026-07-27).
 */
function reconcileSidebar(
  plan: MatchResult["cv_plan"],
  profileEducation: GvgEducationEntry[],
  profileLanguages: GvgLanguage[]
): MatchResult["cv_plan"] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18);

  const eduPicked = (plan.education ?? [])
    .map((e) => profileEducation.find((p) => norm(p.title) === norm(e.title)))
    .filter((e): e is GvgEducationEntry => !!e);
  const education = eduPicked.length ? dedupeBy(eduPicked, (e) => e.title) : profileEducation;

  const langPicked = (plan.languages ?? [])
    .map((l) => profileLanguages.find((p) => norm(p.name) === norm(l.name)))
    .filter((l): l is GvgLanguage => !!l);
  // Any profile language the AI dropped is appended — the CV should never look
  // like a language was lost, only reordered.
  const languages = langPicked.length
    ? dedupeBy([...langPicked, ...profileLanguages], (l) => l.name)
    : profileLanguages;

  return { ...plan, education, languages };
}

function dedupeBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = key(i).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function loadGvgApplications(): Promise<GvgApplication[]> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { data } = await service.from("gvg_applications").select("*").order("created_at", { ascending: false });
  return ((data as Record<string, unknown>[] | null) ?? []).map(normalizeApplication);
}

/** New Application: register the uploaded .mhtml + URL, extract the job text
 *  and a title/company guess from the saved page's <title>. */
export async function createGvgApplication(input: {
  job_url: string;
  mhtml_path: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireGvgOwner();
  const service = createServiceRoleClient();

  const { data: blob, error: dlErr } = await service.storage.from(BUCKET).download(input.mhtml_path);
  if (dlErr || !blob) return { ok: false, error: "Could not read the uploaded .mhtml." };

  let text = "";
  let jobTitleGuess: string | null = null;
  let companyGuess: string | null = null;
  try {
    const parsed = await parseJobMhtml(Buffer.from(await blob.arrayBuffer()));
    text = parsed.text;
    jobTitleGuess = parsed.jobTitleGuess;
    companyGuess = parsed.companyGuess;
  } catch {
    return { ok: false, error: "The file could not be parsed as .mhtml (save the page as 'Webpage, Single File')." };
  }
  if (text.length < 200) {
    return { ok: false, error: "The saved page has almost no text — re-export the job posting as .mhtml." };
  }

  const { data, error } = await service
    .from("gvg_applications")
    .insert({
      job_url: input.job_url.trim() || null,
      mhtml_path: input.mhtml_path,
      job_text: text,
      job_title: jobTitleGuess,
      company: companyGuess,
      status: "nueva",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Could not create the application." };
  await logEvent(service, data.id as string, "created", jobTitleGuess);
  revalidatePath(CV_PATH);
  return { ok: true, id: data.id as string };
}

// ── The AI match ────────────────────────────────────────────────────────────
// Raw fetch against the Anthropic API (this repo's deliberate convention — see
// HANDOFF "Stack"), on the current API surface: claude-opus-5 (thinking on by
// default, no sampling params), the web_search server tool for the company
// research, and server-side refusal fallbacks on by default.

const MATCH_SYSTEM = `You are the matching engine inside GVG-Space CV App Manager — a private tool where Gabriel Vasquez tailors his CV and cover letter to specific job postings.

You receive:
- A JOB POSTING (text extracted from a saved LinkedIn page) and its URL.
- Gabriel's MASTER EXPERIENCE repository: every experience deconstructed into Strategic & Business Translation Capabilities, Operational & Management Learnings, Technical Competencies, Hard Skills, Soft Skills, and Tools (with aptitude %). Items carry an "id" — you must reference these ids.
- His ACTIVE CAREER PATHS (the directions the search is steering toward).
- Up to 4 of his real COVER LETTERS (writing-style samples).
- His profile (about, headline, contact).

Use web_search to briefly research the company (what it does, size, recent news, culture signals) and — if possible — identify the hiring contact (the posting text often names the hiring team; otherwise search). Keep research tight: a handful of searches at most.

Then produce your full analysis as ONE JSON object in a \`\`\`json fenced block at the very END of your response. Nothing after the fence. Schema:

{
  "evaluation": {
    "overall_score": 0-100,
    "verdict": "one sentence: is this worth applying to and why",
    "axes": [
      {"name": "Role & Responsibilities Fit", "score": 0-100, "note": "…"},
      {"name": "Hard Skills & Tools", "score": 0-100, "note": "…"},
      {"name": "Experience Depth", "score": 0-100, "note": "…"},
      {"name": "Career Path Alignment", "score": 0-100, "note": "which active career path this maps to and how well"},
      {"name": "Location, Language & Logistics", "score": 0-100, "note": "…"}
    ],
    "career_path": "name of the best-matching active career path",
    "company_notes": "3-5 sentence digest of the company research",
    "hiring_contact": "Name · role" or null
  },
  "cv_plan": {
    "headline": "pipe-separated headline tailored to this job, ≤ 70 chars",
    "tagline": "one line, the value proposition for THIS role",
    "about": "sidebar summary, 55-80 words, tailored",
    "core_skills": [exactly 9 short skill labels, most job-relevant first],
    "education": [{"title": "…", "sub": "…", "detail": "…"}],
    "languages": [{"name": "…", "level": "…"}],
    "experiences": [
      {"experience_id": "id from the Master Experience", "role_title": "THE ROLE ONLY", "org_line": "Employer · client or function · city", "bullets": ["up to 3 bullets, 15-24 words each, drawn from that item's capabilities and skills, angled at this job"]}
    ]
  },
  "cover_letter_md": "the full cover letter in markdown, ≤ 320 words, one page"
}

Rules:
- MORE RECENT experiences must always weigh more; never stretch far-back experience to force a match.
- EVERY visible part of the CV is tailored to this job: the headline, the tagline, the About summary, the 9 core skills, and the order of the education and language blocks. The profile you receive is the BASELINE to select and reorder from.
- cv_plan.education: reproduce entries from the profile's education list VERBATIM (same title/sub/detail strings) but choose which to include and in what order — most job-relevant first (e.g. lead with a certification the posting names). Include 4-5 of them. Never invent or reword a degree, institution or certification.
- cv_plan.languages: the same profile languages, reordered by relevance to this posting (e.g. German first for a German-language role). Never change a level.
- cv_plan.experiences: pick the 6 most relevant items of kind "job", in reverse chronological order (ids must be real). Bullets state facts from the repository; never invent employers, dates, metrics, or tools.
- role_title is THE ROLE AND NOTHING ELSE: "Project Manager, AI Initiative". Never append the employer, never append the dates. They are rendered in their own slots and repeating them looks broken. Put the employer, the client or function, and the city in org_line instead, separated by " · ".
- The CV is ONE PAGE. Keep to 3 bullets per entry, 15-24 words each, and the About summary under 60 words.
- The cover letter must imitate the tone, structure and voice of the provided samples (direct opening, concrete evidence, warm close). Address the hiring contact by name if known, otherwise "Dear Hiring Team". Be company-specific: mention something real about the company from your research.
- NEVER use an em dash (—) anywhere in your output. Not in the headline, the tagline, the About text, a skill label, a bullet, or the cover letter. Use a comma, a full stop, a colon, or rewrite the sentence. This is the single most recognisable tell of AI-written copy and the owner has banned it outright.
- Everything in English.`;

type AnthropicBlock = { type: string; text?: string };

export async function runGvgMatch(applicationId: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY is not configured." };

  const { data: app } = await service.from("gvg_applications").select("*").eq("id", applicationId).maybeSingle();
  if (!app) return { ok: false, error: "Application not found." };
  if (!app.job_text) return { ok: false, error: "This application has no extracted job text." };
  if (app.status === "sent") return { ok: false, error: "This application was already sent." };

  const setProgress = (step: number, label: string) =>
    service
      .from("gvg_applications")
      .update({ progress: { step, total: 3, label }, updated_at: new Date().toISOString() })
      .eq("id", applicationId);

  await service
    .from("gvg_applications")
    .update({
      status: "matching",
      error: null,
      progress: { step: 1, total: 3, label: "Reading the posting and your repository" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  await logEvent(service, applicationId, "match_started", app.job_title as string | null);
  revalidatePath(CV_PATH);

  try {
    const [{ data: prof }, { data: exps }, { data: paths }, { data: letters }] = await Promise.all([
      service.from("gvg_profile").select("*").eq("id", true).maybeSingle(),
      service.from("gvg_experiences").select("id, kind, title, org, date_start, date_end, context, sections").order("position"),
      service.from("gvg_career_paths").select("name, definition, core_focus, skills").eq("active", true).order("position"),
      service.from("gvg_cover_letter_samples").select("title, extracted_text"),
    ]);

    const userContent = `## JOB POSTING
URL: ${app.job_url ?? "(none)"}
Title guess: ${app.job_title ?? "(unknown)"}
Company guess: ${app.company ?? "(unknown)"}

${app.job_text}

## PROFILE
${JSON.stringify({ name: FULL_NAME, headline: prof?.headline, tagline: prof?.tagline, about: prof?.about, contact: prof?.contact }, null, 1)}

## ACTIVE CAREER PATHS
${JSON.stringify(paths ?? [], null, 1)}

## MASTER EXPERIENCE
${JSON.stringify(exps ?? [], null, 1)}

## COVER LETTER STYLE SAMPLES
${((letters as { title: string; extracted_text: string | null }[] | null) ?? [])
  .map((l) => `### ${l.title}\n${l.extracted_text ?? ""}`)
  .join("\n\n")}`;

    await setProgress(2, "Researching the company and matching");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 16000,
        fallbacks: "default",
        system: [{ type: "text", text: MATCH_SYSTEM, cache_control: { type: "ephemeral" } }],
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 400)}`);
    }
    const json = (await res.json()) as { stop_reason?: string; content?: AnthropicBlock[] };
    void registrarConsumo({ proveedor: "anthropic", modelo: "claude-opus-5", superficie: USOS.gvgMatch,
      uso: usoDesdeAnthropic((json as { usage?: unknown }).usage), ok: json.stop_reason !== "refusal",
      error: json.stop_reason === "refusal" ? "refusal" : null });
    if (json.stop_reason === "refusal") {
      throw new Error("The model declined this request (safety classifier). Try again or adjust the posting text.");
    }

    const fullText = (json.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");
    await setProgress(3, "Writing the CV plan and cover letter");

    const fenceMatch = fullText.match(/```json\s*([\s\S]*?)```\s*$/) ?? fullText.match(/```json\s*([\s\S]*?)```/);
    if (!fenceMatch) throw new Error("The model returned no JSON block.");
    const raw = JSON.parse(fenceMatch[1]) as MatchResult;
    if (!raw.evaluation || !raw.cv_plan || !raw.cover_letter_md) {
      throw new Error("The model's JSON is missing required sections.");
    }

    const match = sanitizeStrings(raw);
    match.cv_plan = reconcileSidebar(
      match.cv_plan,
      Array.isArray(prof?.education) ? prof.education : [],
      Array.isArray(prof?.languages) ? prof.languages : []
    );

    await service
      .from("gvg_applications")
      .update({
        status: "analysis",
        match,
        // The AI's read on title/company beats the <title> guess when present.
        job_title: app.job_title ?? null,
        error: null,
        progress: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);
    await logEvent(service, applicationId, "matched", `${match.evaluation.overall_score}% · ${app.job_title ?? ""}`.trim());
    revalidatePath(CV_PATH);
    return { ok: true };
  } catch (err) {
    await service
      .from("gvg_applications")
      .update({
        status: "nueva",
        error: err instanceof Error ? err.message : "Unknown matching error.",
        progress: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);
    await logEvent(service, applicationId, "match_failed", err instanceof Error ? err.message.slice(0, 120) : null);
    revalidatePath(CV_PATH);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown matching error." };
  }
}

/** Persist the edits made in the Analysis Ready stage. */
export async function saveGvgMatchEdits(applicationId: string, match: MatchResult, jobTitle: string, company: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  // Hand edits go through the same dash hygiene as generated copy — pasting a
  // sentence back in from elsewhere is exactly how one slips through.
  const { error } = await service
    .from("gvg_applications")
    .update({
      match: sanitizeStrings(match),
      job_title: jobTitle.trim() || null,
      company: company.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("status", "analysis");
  if (error) return { ok: false, error: "Could not save the edits." };
  revalidatePath(CV_PATH);
  return { ok: true };
}

/** Render Resources: deterministic template fill from the (edited) plan. */
export async function renderGvgResources(applicationId: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();

  const { data: app } = await service.from("gvg_applications").select("*").eq("id", applicationId).maybeSingle();
  if (!app || !app.match) return { ok: false, error: "No analysis to render." };
  if (app.status !== "analysis") return { ok: false, error: "This application is not in Analysis Ready." };

  const setProgress = (step: number, label: string) =>
    service
      .from("gvg_applications")
      .update({ progress: { step, total: 3, label }, updated_at: new Date().toISOString() })
      .eq("id", applicationId);

  await service
    .from("gvg_applications")
    .update({
      status: "rendering",
      progress: { step: 1, total: 3, label: "Loading your profile" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  revalidatePath(CV_PATH);

  try {
    const [{ data: prof }, { data: exps }] = await Promise.all([
      service.from("gvg_profile").select("*").eq("id", true).maybeSingle(),
      service.from("gvg_experiences").select("id, org, location, date_start, date_end"),
    ]);
    const profile = prof
      ? {
          ...EMPTY_PROFILE,
          about: prof.about ?? "",
          photo_path: prof.photo_path ?? null,
          headline: prof.headline ?? "",
          tagline: prof.tagline ?? "",
          contact: { ...EMPTY_PROFILE.contact, ...(prof.contact ?? {}) },
          languages: Array.isArray(prof.languages) ? prof.languages : [],
          education: Array.isArray(prof.education) ? prof.education : [],
        }
      : EMPTY_PROFILE;

    await setProgress(2, "Embedding the photo");

    let photoDataUri: string | null = null;
    if (profile.photo_path) {
      const { data: blob } = await service.storage.from(BUCKET).download(profile.photo_path);
      if (blob) {
        const buf = Buffer.from(await blob.arrayBuffer());
        photoDataUri = `data:${blob.type || "image/jpeg"};base64,${buf.toString("base64")}`;
      }
    }

    const expMeta = new Map(
      (((exps as { id: string; org: string | null; location: string | null; date_start: string | null; date_end: string | null }[] | null) ?? [])).map(
        (e) => [e.id, { org: e.org, location: e.location, date_start: e.date_start, date_end: e.date_end }]
      )
    );

    await setProgress(3, "Rendering CV and cover letter");

    const match = app.match as MatchResult;
    const cvHtml = renderCvHtml({ profile, photoDataUri, plan: match.cv_plan, expMeta, fullName: FULL_NAME });
    const clHtml = renderCoverLetterHtml({
      fullName: FULL_NAME,
      profile,
      company: app.company ?? null,
      jobTitle: app.job_title ?? null,
      markdown: match.cover_letter_md,
    });

    await service
      .from("gvg_applications")
      .update({ status: "ready", cv_html: cvHtml, cl_html: clHtml, error: null, progress: null, updated_at: new Date().toISOString() })
      .eq("id", applicationId);
    await logEvent(service, applicationId, "rendered", app.job_title as string | null);
    revalidatePath(CV_PATH);
    return { ok: true };
  } catch (err) {
    await service
      .from("gvg_applications")
      .update({
        status: "analysis",
        error: err instanceof Error ? err.message : "Render failed.",
        progress: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);
    revalidatePath(CV_PATH);
    return { ok: false, error: err instanceof Error ? err.message : "Render failed." };
  }
}

/** "Application Sent": leaves the process board, enters the follow-up board. */
export async function markGvgSent(applicationId: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { error } = await service
    .from("gvg_applications")
    .update({ status: "sent", followup_status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("status", "ready");
  if (error) return { ok: false, error: "Could not mark as sent." };
  await logEvent(service, applicationId, "sent");
  revalidatePath(CV_PATH);
  return { ok: true };
}

export async function updateGvgFollowup(
  applicationId: string,
  input: { followup_status: FollowupStatus; interview_date: string | null; notes: string | null }
): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { error } = await service
    .from("gvg_applications")
    .update({
      followup_status: input.followup_status,
      interview_date: input.interview_date,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("status", "sent");
  if (error) return { ok: false, error: "Could not update the follow-up." };
  // Only log a state the card actually moved INTO, so re-saving a note doesn't
  // litter the timeline with duplicate "went cold" markers.
  const { data: prev } = await service
    .from("gvg_application_events")
    .select("kind")
    .eq("application_id", applicationId)
    .order("at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prev?.kind !== input.followup_status && input.followup_status !== "sent") {
    await logEvent(service, applicationId, input.followup_status as GvgEventKind);
  }
  if (input.interview_date) {
    const { count } = await service
      .from("gvg_application_events")
      .select("id", { count: "exact", head: true })
      .eq("application_id", applicationId)
      .eq("kind", "interview_set")
      .eq("detail", input.interview_date);
    if (!count) await logEvent(service, applicationId, "interview_set", input.interview_date);
  }
  revalidatePath(CV_PATH);
  return { ok: true };
}

export async function deleteGvgApplication(applicationId: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { error } = await service.from("gvg_applications").delete().eq("id", applicationId);
  if (error) return { ok: false, error: "Could not delete the application." };
  revalidatePath(CV_PATH);
  return { ok: true };
}
