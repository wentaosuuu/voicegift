import { randomUUID } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isMockMode } from "@/lib/config";
import { mockData } from "@/lib/mock-store";
import type { GenerationKind, Project, ProjectPublicView, ProjectStatus } from "@/types/domain";

type NewProject = Omit<
  Project,
  | "id"
  | "status"
  | "voice_path"
  | "preview_audio_path"
  | "full_audio_path"
  | "video_path"
  | "lyrics"
  | "share_slug"
  | "share_enabled"
  | "payment_status"
  | "paypal_order_id"
  | "paypal_capture_id"
  | "error_code"
  | "error_message"
  | "created_at"
  | "updated_at"
  | "expires_at"
> & { accessTokenHash: string; accessTokenCiphertext: string };

export async function insertProject(input: NewProject) {
  const now = new Date();
  const row = {
    id: randomUUID(),
    status: "uploading" as ProjectStatus,
    recipient_name: input.recipient_name,
    occasion: input.occasion,
    memory: input.memory,
    message: input.message,
    music_style: input.music_style,
    customer_email: input.customer_email,
    consent_version: input.consent_version,
    access_token_hash: input.accessTokenHash,
    access_token_ciphertext: input.accessTokenCiphertext,
    voice_path: null,
    voice_verified_at: null,
    preview_audio_path: null,
    full_audio_path: null,
    video_path: null,
    lyrics: null,
    share_slug: null,
    share_enabled: false,
    payment_status: "unpaid" as const,
    paypal_order_id: null,
    paypal_capture_id: null,
    error_code: null,
    error_message: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 30 * 86400000).toISOString()
  };

  if (isMockMode) {
    mockData.projects.set(row.id, row);
    return row;
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.from("projects").insert(row).select("*").single();
  if (error) throw error;
  return data as typeof row;
}

export async function getProject(id: string) {
  if (isMockMode) return mockData.projects.get(id) ?? null;
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as
    | (Project & {
        access_token_hash: string;
        access_token_ciphertext: string;
        voice_verified_at: string | null;
      })
    | null;
}

export async function getProjectByShareSlug(slug: string) {
  if (isMockMode) {
    return [...mockData.projects.values()].find((project) => project.share_slug === slug && project.share_enabled) ?? null;
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!
    .from("projects")
    .select("*")
    .eq("share_slug", slug)
    .eq("share_enabled", true)
    .maybeSingle();
  if (error) throw error;
  return data as Project | null;
}

export async function updateProject(id: string, updates: Record<string, unknown>) {
  const next = { ...updates, updated_at: new Date().toISOString() };
  if (isMockMode) {
    const current = mockData.projects.get(id);
    if (!current) throw new Error("Project not found");
    const updated = { ...current, ...next } as typeof current;
    mockData.projects.set(id, updated);
    return updated;
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.from("projects").update(next).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Project;
}

export async function createGeneration(projectId: string, kind: GenerationKind, stage: string) {
  const row = {
    id: randomUUID(),
    project_id: projectId,
    kind,
    stage,
    status: "running",
    provider_job_id: null,
    created_at: new Date().toISOString()
  };
  if (isMockMode) {
    mockData.generations.push(row);
    return row;
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.from("generation_jobs").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateGeneration(id: string, updates: Record<string, unknown>) {
  if (isMockMode) {
    const index = mockData.generations.findIndex((job) => job.id === id);
    if (index < 0) throw new Error("Generation not found");
    mockData.generations[index] = { ...mockData.generations[index], ...updates };
    return mockData.generations[index];
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.from("generation_jobs").update(updates).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function findGenerationByProviderJob(providerJobId: string) {
  if (isMockMode) return mockData.generations.find((job) => job.provider_job_id === providerJobId) ?? null;
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!
    .from("generation_jobs")
    .select("*")
    .eq("provider_job_id", providerJobId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addAuditEvent(projectId: string | null, eventType: string, payload: Record<string, unknown> = {}) {
  const row = { project_id: projectId, event_type: eventType, payload, created_at: new Date().toISOString() };
  if (isMockMode) {
    mockData.events.push(row);
    return;
  }
  const supabase = createSupabaseAdmin();
  const { error } = await supabase!.from("audit_events").insert(row);
  if (error) console.warn("audit event insert skipped", error);
}

export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  if (isMockMode) return true;
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });
  if (error) throw error;
  return Boolean(data);
}

export async function claimGeneration(projectId: string, kind: GenerationKind) {
  const nextStatus = kind === "preview" ? "preview_generating" : "full_generating";
  if (isMockMode) {
    const project = mockData.projects.get(projectId);
    if (!project) return false;
    const allowed =
      kind === "preview"
        ? ["preview_queued", "failed"].includes(project.status)
        : project.payment_status === "paid" && ["paid", "full_queued", "failed"].includes(project.status);
    if (!allowed) return false;
    mockData.projects.set(projectId, {
      ...project,
      status: nextStatus,
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString()
    });
    return true;
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.rpc("claim_generation", {
    p_project_id: projectId,
    p_kind: kind
  });
  if (error) throw error;
  return Boolean(data);
}

export async function listProjects(limit = 100) {
  if (isMockMode) return [...mockData.projects.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.from("projects").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as Project[];
}

export async function createRevisionRequest(projectId: string, requestText: string) {
  const row = {
    id: randomUUID(),
    project_id: projectId,
    request_text: requestText,
    status: "requested",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (isMockMode) {
    if (mockData.revisions.some((item) => item.project_id === projectId)) {
      throw new Error("A revision has already been requested");
    }
    mockData.revisions.push(row);
    return row;
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!.from("revision_requests").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

export async function listRevisionRequests() {
  if (isMockMode) return mockData.revisions;
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!
    .from("revision_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listExpiredProjects(limit = 100) {
  if (isMockMode) {
    const now = new Date().toISOString();
    return [...mockData.projects.values()]
      .filter((project) => project.expires_at < now && project.status !== "deleted")
      .slice(0, limit);
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase!
    .from("projects")
    .select("*")
    .lt("expires_at", new Date().toISOString())
    .neq("status", "deleted")
    .limit(limit);
  if (error) throw error;
  return data as Project[];
}

export function toPublicView(
  project: Project,
  urls: { previewUrl?: string | null; fullAudioUrl?: string | null; videoUrl?: string | null }
): ProjectPublicView {
  return {
    id: project.id,
    status: project.status,
    recipientName: project.recipient_name,
    occasion: project.occasion,
    musicStyle: project.music_style,
    paymentStatus: project.payment_status,
    previewUrl: urls.previewUrl ?? null,
    fullAudioUrl: urls.fullAudioUrl ?? null,
    videoUrl: urls.videoUrl ?? null,
    lyrics: project.lyrics,
    shareUrl: project.share_enabled && project.share_slug ? `/s/${project.share_slug}` : null,
    errorMessage: project.error_message
  };
}
