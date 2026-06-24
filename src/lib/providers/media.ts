import { env, isMockMode } from "@/lib/config";
import type { GenerationKind, Project } from "@/types/domain";

type Stage = "music" | "voice" | "video";

function stagePath(stage: Stage) {
  if (stage === "music") return env.MEDIA_PROVIDER_MUSIC_PATH;
  if (stage === "voice") return env.MEDIA_PROVIDER_VOICE_PATH;
  return env.MEDIA_PROVIDER_VIDEO_PATH;
}

export async function submitMediaJob(input: {
  stage: Stage;
  project: Project;
  kind: GenerationKind;
  generationId: string;
  sourceUrl?: string;
  voiceUrl?: string;
}) {
  if (isMockMode) return { providerJobId: `mock-${input.stage}-${input.generationId}` };
  if (!env.MEDIA_PROVIDER_BASE_URL || !env.MEDIA_PROVIDER_API_KEY) {
    throw new Error("Media provider is not configured");
  }
  const callbackUrl = new URL("/api/webhooks/provider", env.NEXT_PUBLIC_SITE_URL);
  callbackUrl.searchParams.set("secret", env.PROVIDER_WEBHOOK_SECRET);
  const response = await fetch(`${env.MEDIA_PROVIDER_BASE_URL}${stagePath(input.stage)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MEDIA_PROVIDER_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.generationId
    },
    body: JSON.stringify({
      externalId: input.generationId,
      projectId: input.project.id,
      kind: input.kind,
      stage: input.stage,
      callbackUrl: callbackUrl.toString(),
      durationSeconds: input.kind === "preview" ? 15 : 75,
      lyrics: input.project.lyrics,
      style: input.project.music_style,
      recipientName: input.project.recipient_name,
      sourceUrl: input.sourceUrl,
      voiceUrl: input.voiceUrl,
      safety: {
        verifiedSelfVoice: true,
        prohibitArtistImitation: true,
        originalCompositionOnly: true
      }
    }),
    signal: AbortSignal.timeout(30000)
  });
  const data = (await response.json()) as { id?: string; jobId?: string; error?: string };
  if (!response.ok) throw new Error(data.error || `Media provider submission failed: ${response.status}`);
  const providerJobId = data.jobId ?? data.id;
  if (!providerJobId) throw new Error("Media provider returned no job id");
  return { providerJobId };
}

export async function verifyVoiceSample(input: { audioUrl: string; phrase: string }) {
  if (isMockMode) return { verified: true, confidence: 0.99 };
  if (!env.MEDIA_PROVIDER_BASE_URL || !env.MEDIA_PROVIDER_API_KEY) {
    throw new Error("Media provider is not configured");
  }
  const response = await fetch(`${env.MEDIA_PROVIDER_BASE_URL}${env.MEDIA_PROVIDER_VERIFY_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MEDIA_PROVIDER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      audioUrl: input.audioUrl,
      expectedPhrase: input.phrase,
      checks: ["speech_match", "liveness", "single_speaker", "audio_quality"]
    }),
    signal: AbortSignal.timeout(60000)
  });
  const data = (await response.json()) as { verified?: boolean; confidence?: number; reason?: string };
  if (!response.ok) throw new Error(data.reason || `Voice verification failed: ${response.status}`);
  return { verified: data.verified === true, confidence: data.confidence ?? 0 };
}
