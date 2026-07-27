import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "kaffetal-media";

// Storage keys reject many characters that are perfectly normal in real
// filenames (spaces, accents, parentheses -- think "Cédula catastral (2024).pdf"
// straight from a Windows desktop). Uploads with such names failed and, worse,
// used to fail silently. The display name is stored separately by callers; the
// key only needs to stay unique and readable.
function storageSafeName(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-120);
}

export async function uploadKaffetalMedia(
  supabase: SupabaseClient,
  userId: string,
  subpath: string,
  file: File,
  // Who performed the upload (media_assets.uploaded_by / RLS check). Defaults
  // to the folder owner -- pass the admin's id when BCP uploads into a
  // producer's folder from the browser.
  uploadedBy: string = userId
): Promise<{ assetId: string } | { error: string }> {
  const path = `${userId}/${subpath}/${Date.now()}-${storageSafeName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { data, error } = await supabase
    .from("media_assets")
    .insert({ bucket: BUCKET, path, mime_type: file.type, size_bytes: file.size, uploaded_by: uploadedBy })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "No se pudo registrar el archivo." };
  return { assetId: data.id as string };
}

// Same result as uploadKaffetalMedia, but reports byte-level upload progress so
// callers can show a live percentage. supabase-js's storage `.upload()` gives no
// progress events, so this takes the file to a signed upload URL
// (createSignedUploadUrl) and PUTs it with a raw XHR whose `upload.onprogress`
// drives `onProgress` (a 0..1 fraction). The request shape mirrors
// StorageFileApi.uploadToSignedUrl exactly (FormData with cacheControl + the file
// at key ""). Browser-only (XHR). If anything on the signed-URL path fails, it
// falls back to the plain upload so the file still lands (just without a live %).
export async function uploadKaffetalMediaWithProgress(
  supabase: SupabaseClient,
  userId: string,
  subpath: string,
  file: File,
  onProgress?: (fraction: number) => void,
  uploadedBy: string = userId
): Promise<{ assetId: string } | { error: string }> {
  const path = `${userId}/${subpath}/${Date.now()}-${storageSafeName(file.name)}`;

  const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (signErr || !signed?.signedUrl) {
    // Couldn't get a signed URL (e.g. transient) -- fall back to the plain path.
    return uploadKaffetalMedia(supabase, userId, subpath, file, uploadedBy);
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const uploadUrl = signed.signedUrl.startsWith("http")
    ? signed.signedUrl
    : `${base}/storage/v1${signed.signedUrl.startsWith("/") ? "" : "/"}${signed.signedUrl}`;

  try {
    await new Promise<void>((resolve, reject) => {
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("x-upsert", "true");
      if (apikey) xhr.setRequestHeader("apikey", apikey);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("network"));
      xhr.onabort = () => reject(new Error("abort"));
      xhr.send(form);
    });
  } catch {
    // Signed PUT failed -- retry via the plain upload (a new timestamped path);
    // any partial object left behind is a harmless orphan.
    return uploadKaffetalMedia(supabase, userId, subpath, file, uploadedBy);
  }
  onProgress?.(1);

  const { data, error } = await supabase
    .from("media_assets")
    .insert({ bucket: BUCKET, path, mime_type: file.type, size_bytes: file.size, uploaded_by: uploadedBy })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "No se pudo registrar el archivo." };
  return { assetId: data.id as string };
}

// PUT a file to an already-created signed upload URL (path + token from a
// server action's createSignedUploadUrl) with byte-progress. Same request shape
// as StorageFileApi.uploadToSignedUrl, but via XHR so `upload.onprogress` can
// drive a ring. Used where the caller already holds a signed path/token (e.g.
// BCP's batch/sondeo proof uploads) and records the path itself (no media_assets
// insert here). Returns ok/error rather than throwing.
export async function putSignedUrlWithProgress(
  path: string,
  token: string,
  // Blob, not File: callers may hand over a derived body (GVG trims a saved
  // .mhtml down to its html part before uploading). A File is a Blob, so every
  // existing call site is unaffected; the object name comes from `path`.
  file: Blob,
  onProgress?: (fraction: number) => void
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const url = `${base}/storage/v1/object/upload/sign/${BUCKET}/${path}?token=${encodeURIComponent(token)}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("x-upsert", "true");
      if (apikey) xhr.setRequestHeader("apikey", apikey);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("network"));
      xhr.send(form);
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "La subida falló." };
  }
  onProgress?.(1);
  return { ok: true };
}

export async function signedKaffetalMediaUrls(
  supabase: SupabaseClient,
  assetIds: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const ids = [...new Set(assetIds.filter((id): id is string => !!id))];
  if (!ids.length) return new Map();

  const { data: assets } = await supabase.from("media_assets").select("id, path").in("id", ids);
  const urlByAssetId = new Map<string, string>();
  for (const asset of (assets as { id: string; path: string }[] | null) ?? []) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(asset.path, 3600);
    if (data?.signedUrl) urlByAssetId.set(asset.id, data.signedUrl);
  }
  return urlByAssetId;
}
