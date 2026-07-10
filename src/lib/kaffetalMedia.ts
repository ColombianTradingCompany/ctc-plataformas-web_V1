import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "kaffetal-media";

export async function uploadKaffetalMedia(
  supabase: SupabaseClient,
  userId: string,
  subpath: string,
  file: File
): Promise<{ assetId: string } | { error: string }> {
  const path = `${userId}/${subpath}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { data, error } = await supabase
    .from("media_assets")
    .insert({ bucket: BUCKET, path, mime_type: file.type, size_bytes: file.size, uploaded_by: userId })
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
