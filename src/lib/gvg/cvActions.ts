"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireGvgOwner } from "./requireGvgOwner";
import {
  EMPTY_PROFILE,
  EMPTY_SECTIONS,
  MAX_COVER_LETTER_SAMPLES,
  type ExperienceSections,
  type GvgCareerPath,
  type GvgCoverLetterSample,
  type GvgExperience,
  type GvgProfileData,
} from "./cvData";

const BUCKET = "kaffetal-media";
const CV_PATH = "/ecp/gvg/cv";

type Result = { ok: true } | { ok: false; error: string };

// ── Load everything the Setup tab needs ─────────────────────────────────────

export type CvSetupData = {
  profile: GvgProfileData;
  photoUrl: string | null;
  experiences: GvgExperience[];
  careerPaths: GvgCareerPath[];
  coverLetters: GvgCoverLetterSample[];
};

export async function loadCvSetup(): Promise<CvSetupData> {
  await requireGvgOwner();
  const service = createServiceRoleClient();

  const [{ data: prof }, { data: exps }, { data: paths }, { data: letters }] = await Promise.all([
    service.from("gvg_profile").select("*").eq("id", true).maybeSingle(),
    service.from("gvg_experiences").select("*").order("position").order("created_at"),
    service.from("gvg_career_paths").select("*").order("position").order("created_at"),
    service.from("gvg_cover_letter_samples").select("*").order("created_at"),
  ]);

  const profile: GvgProfileData = prof
    ? {
        about: prof.about ?? "",
        photo_path: prof.photo_path ?? null,
        headline: prof.headline ?? "",
        tagline: prof.tagline ?? "",
        contact: { ...EMPTY_PROFILE.contact, ...(prof.contact ?? {}) },
        languages: Array.isArray(prof.languages) ? prof.languages : [],
        education: Array.isArray(prof.education) ? prof.education : [],
      }
    : EMPTY_PROFILE;

  let photoUrl: string | null = null;
  if (profile.photo_path) {
    const { data } = await service.storage.from(BUCKET).createSignedUrl(profile.photo_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  return {
    profile,
    photoUrl,
    experiences: ((exps as Record<string, unknown>[] | null) ?? []).map(normalizeExperience),
    careerPaths: ((paths as Record<string, unknown>[] | null) ?? []).map((p) => ({
      id: p.id as string,
      name: (p.name as string) ?? "",
      definition: (p.definition as string | null) ?? null,
      core_focus: (p.core_focus as string | null) ?? null,
      skills: (p.skills as string | null) ?? null,
      active: (p.active as boolean) ?? true,
      position: (p.position as number) ?? 0,
    })),
    coverLetters: ((letters as Record<string, unknown>[] | null) ?? []).map((l) => ({
      id: l.id as string,
      title: (l.title as string) ?? "",
      asset_path: (l.asset_path as string | null) ?? null,
      extracted_text: (l.extracted_text as string | null) ?? null,
      created_at: (l.created_at as string) ?? "",
    })),
  };
}

function normalizeExperience(e: Record<string, unknown>): GvgExperience {
  const raw = (e.sections ?? {}) as Partial<ExperienceSections>;
  return {
    id: e.id as string,
    kind: e.kind as GvgExperience["kind"],
    title: (e.title as string) ?? "",
    org: (e.org as string | null) ?? null,
    location: (e.location as string | null) ?? null,
    date_start: (e.date_start as string | null) ?? null,
    date_end: (e.date_end as string | null) ?? null,
    context: (e.context as string | null) ?? null,
    sections: { ...EMPTY_SECTIONS, ...raw },
    position: (e.position as number) ?? 0,
  };
}

// ── Profile ─────────────────────────────────────────────────────────────────

export async function saveGvgProfile(profile: GvgProfileData): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { error } = await service.from("gvg_profile").upsert(
    {
      id: true,
      about: profile.about,
      photo_path: profile.photo_path,
      headline: profile.headline,
      tagline: profile.tagline,
      contact: profile.contact,
      languages: profile.languages,
      education: profile.education,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) return { ok: false, error: "Could not save the profile." };
  revalidatePath(CV_PATH);
  return { ok: true };
}

// ── Uploads (signed-URL pattern: mint here, PUT client-side with progress) ──

function storageSafeName(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-120);
}

/** Mint a signed upload URL under gvg/ (service role — the gvg/ prefix is not
 *  reachable by any user JWT under the {uid}/ storage policies, on purpose). */
export async function prepareGvgUpload(
  subpath: "photo" | "cover-letters" | "jobs",
  fileName: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const path = `gvg/${subpath}/${Date.now()}-${storageSafeName(fileName)}`;
  const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Could not prepare the upload." };
  return { ok: true, path, token: data.token };
}

// ── Master Experience ───────────────────────────────────────────────────────

export type ExperienceInput = Omit<GvgExperience, "id"> & { id?: string };

export async function saveGvgExperience(input: ExperienceInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireGvgOwner();
  if (!input.title.trim()) return { ok: false, error: "The item needs a title." };
  const service = createServiceRoleClient();
  const row = {
    kind: input.kind,
    title: input.title.trim(),
    org: input.org?.trim() || null,
    location: input.location?.trim() || null,
    date_start: input.date_start?.trim() || null,
    date_end: input.date_end?.trim() || null,
    context: input.context?.trim() || null,
    sections: input.sections,
    position: input.position,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { error } = await service.from("gvg_experiences").update(row).eq("id", input.id);
    if (error) return { ok: false, error: "Could not save the item." };
    revalidatePath(CV_PATH);
    return { ok: true, id: input.id };
  }
  const { data, error } = await service.from("gvg_experiences").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "Could not create the item." };
  revalidatePath(CV_PATH);
  return { ok: true, id: data.id as string };
}

export async function deleteGvgExperience(id: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { error } = await service.from("gvg_experiences").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the item." };
  revalidatePath(CV_PATH);
  return { ok: true };
}

// ── Career paths ────────────────────────────────────────────────────────────

export type CareerPathInput = Omit<GvgCareerPath, "id"> & { id?: string };

export async function saveGvgCareerPath(input: CareerPathInput): Promise<Result> {
  await requireGvgOwner();
  if (!input.name.trim()) return { ok: false, error: "The career path needs a name." };
  const service = createServiceRoleClient();
  const row = {
    name: input.name.trim(),
    definition: input.definition?.trim() || null,
    core_focus: input.core_focus?.trim() || null,
    skills: input.skills?.trim() || null,
    active: input.active,
    position: input.position,
  };
  const { error } = input.id
    ? await service.from("gvg_career_paths").update(row).eq("id", input.id)
    : await service.from("gvg_career_paths").insert(row);
  if (error) return { ok: false, error: "Could not save the career path." };
  revalidatePath(CV_PATH);
  return { ok: true };
}

export async function deleteGvgCareerPath(id: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { error } = await service.from("gvg_career_paths").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the career path." };
  revalidatePath(CV_PATH);
  return { ok: true };
}

// ── Cover letter samples ────────────────────────────────────────────────────

export async function addGvgCoverLetter(input: {
  title: string;
  asset_path: string | null;
  extracted_text: string;
}): Promise<Result> {
  await requireGvgOwner();
  if (!input.title.trim()) return { ok: false, error: "The sample needs a title." };
  const service = createServiceRoleClient();
  const { count } = await service.from("gvg_cover_letter_samples").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_COVER_LETTER_SAMPLES) {
    return { ok: false, error: `Up to ${MAX_COVER_LETTER_SAMPLES} samples — delete one first.` };
  }
  const { error } = await service.from("gvg_cover_letter_samples").insert({
    title: input.title.trim(),
    asset_path: input.asset_path,
    extracted_text: input.extracted_text.trim() || null,
  });
  if (error) return { ok: false, error: "Could not save the sample." };
  revalidatePath(CV_PATH);
  return { ok: true };
}

export async function updateGvgCoverLetterText(id: string, extracted_text: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { error } = await service
    .from("gvg_cover_letter_samples")
    .update({ extracted_text: extracted_text.trim() || null })
    .eq("id", id);
  if (error) return { ok: false, error: "Could not save the text." };
  revalidatePath(CV_PATH);
  return { ok: true };
}

export async function deleteGvgCoverLetter(id: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { error } = await service.from("gvg_cover_letter_samples").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the sample." };
  revalidatePath(CV_PATH);
  return { ok: true };
}
