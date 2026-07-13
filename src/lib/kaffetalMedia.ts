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
