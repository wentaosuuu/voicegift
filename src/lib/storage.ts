import { env, isMockMode } from "@/lib/config";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function createVoiceUpload(projectId: string, fileName: string) {
  const safeExtension = fileName.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webm";
  const path = `projects/${projectId}/source/voice.${safeExtension}`;
  if (isMockMode) return { path, signedUrl: `/api/mock-upload?path=${encodeURIComponent(path)}`, token: "mock" };
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.storage.from(env.SUPABASE_AUDIO_BUCKET).createSignedUploadUrl(path, {
    upsert: true
  });
  if (error) throw error;
  return { path, signedUrl: data.signedUrl, token: data.token };
}

export async function createSignedAssetUrl(path: string | null, expiresIn = 900) {
  if (!path) return null;
  if (isMockMode) return path.startsWith("http") ? path : `/demo-audio.svg?asset=${encodeURIComponent(path)}`;
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.storage.from(env.SUPABASE_AUDIO_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function storeRemoteAsset(projectId: string, kind: string, url: string, extension: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Provider asset download failed: ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 100 * 1024 * 1024) throw new Error("Provider asset exceeds 100MB");
  return storeAssetBytes(projectId, kind, bytes, extension);
}

export async function storeAssetBytes(projectId: string, kind: string, bytes: ArrayBuffer, extension: string) {
  if (bytes.byteLength > 100 * 1024 * 1024) throw new Error("Provider asset exceeds 100MB");
  const path = `projects/${projectId}/outputs/${kind}.${extension}`;
  if (isMockMode) return `mock://${kind}/${projectId}.${extension}`;
  const supabase = createSupabaseAdmin();
  const contentType = extension === "mp4" ? "video/mp4" : "audio/mpeg";
  const { error } = await supabase!.storage.from(env.SUPABASE_AUDIO_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true
  });
  if (error) throw error;
  return path;
}

export async function deleteProjectAssets(projectId: string) {
  if (isMockMode) return;
  const supabase = createSupabaseAdmin();
  const root = `projects/${projectId}`;
  const paths: string[] = [];
  async function walk(prefix: string) {
    const { data, error } = await supabase!.storage.from(env.SUPABASE_AUDIO_BUCKET).list(prefix, { limit: 1000 });
    if (error) throw error;
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.id) paths.push(path);
      else await walk(path);
    }
  }
  await walk(root);
  if (paths.length) {
    const { error: deleteError } = await supabase!.storage.from(env.SUPABASE_AUDIO_BUCKET).remove(paths);
    if (deleteError) throw deleteError;
  }
}
