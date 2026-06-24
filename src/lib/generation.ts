import { env, isElevenLabsProvider, isMockMode } from "@/lib/config";
import { createShareSlug, decryptSecret } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { generateLyrics } from "@/lib/providers/lyrics";
import { submitMediaJob } from "@/lib/providers/media";
import {
  composeMusicWithElevenLabs,
  convertSpeechWithElevenLabs,
  createElevenLabsVoice,
  deleteElevenLabsVoice
} from "@/lib/providers/elevenlabs";
import {
  addAuditEvent,
  claimGeneration,
  createGeneration,
  getProject,
  updateGeneration,
  updateProject
} from "@/lib/repository";
import { createSignedAssetUrl, storeAssetBytes, storeRemoteAsset } from "@/lib/storage";
import type { GenerationKind } from "@/types/domain";

export async function startGeneration(projectId: string, kind: GenerationKind) {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");
  if (!project.voice_path || !project.voice_verified_at) throw new Error("Voice verification is incomplete");
  if (kind === "full" && project.payment_status !== "paid") throw new Error("Payment is required");

  const claimed = await claimGeneration(projectId, kind);
  if (!claimed) return;
  await addAuditEvent(projectId, `${kind}_generation_started`);

  try {
    const lyrics = project.lyrics ?? (await generateLyrics(project));
    const current = await updateProject(projectId, { lyrics });
    const generation = await createGeneration(projectId, kind, "music");

    if (isMockMode) {
      const demoPath = `mock://${kind}/${projectId}.mp3`;
      await updateGeneration(generation.id, { status: "succeeded", output_path: demoPath });
      if (kind === "preview") {
        await updateProject(projectId, {
          status: "preview_ready",
          preview_audio_path: demoPath,
          payment_status: "unpaid"
        });
      } else {
        await updateProject(projectId, {
          status: "completed",
          full_audio_path: demoPath,
          video_path: `mock://${kind}/${projectId}.mp4`,
          share_slug: project.share_slug ?? createShareSlug()
        });
        await sendCompletionEmail(project.customer_email, projectId, project.access_token_ciphertext);
      }
      return;
    }

    if (isElevenLabsProvider) {
      await runElevenLabsGeneration({
        project: current,
        kind,
        musicGenerationId: generation.id,
        accessTokenCiphertext: project.access_token_ciphertext
      });
      return;
    }

    const result = await submitMediaJob({
      stage: "music",
      project: current,
      kind,
      generationId: generation.id
    });
    await updateGeneration(generation.id, { provider_job_id: result.providerJobId });
  } catch (error) {
    await failProject(projectId, kind, error);
    throw error;
  }
}

async function runElevenLabsGeneration(input: {
  project: Awaited<ReturnType<typeof updateProject>>;
  kind: GenerationKind;
  musicGenerationId: string;
  accessTokenCiphertext: string;
}) {
  const musicAudio = await composeMusicWithElevenLabs({
    project: input.project,
    kind: input.kind
  });
  const guidePath = await storeAssetBytes(
    input.project.id,
    `${input.kind}-music-guide`,
    musicAudio,
    "mp3"
  );
  await updateGeneration(input.musicGenerationId, {
    status: "succeeded",
    output_path: guidePath,
    provider_job_id: `elevenlabs-music-${input.musicGenerationId}`
  });

  const voiceUrl = await createSignedAssetUrl(input.project.voice_path, 3600);
  if (!voiceUrl) throw new Error("Verified voice sample URL could not be created");

  let elevenLabsVoiceId: string | null = null;
  const voiceGeneration = await createGeneration(input.project.id, input.kind, "voice");
  try {
    elevenLabsVoiceId = await createElevenLabsVoice({
      projectId: input.project.id,
      voiceUrl
    });
    await updateGeneration(voiceGeneration.id, {
      provider_job_id: `elevenlabs-voice-${elevenLabsVoiceId}`
    });
    const convertedAudio = await convertSpeechWithElevenLabs({
      voiceId: elevenLabsVoiceId,
      sourceAudio: musicAudio
    });
    const finalAudioPath = await storeAssetBytes(input.project.id, `${input.kind}-voice`, convertedAudio, "mp3");
    await updateGeneration(voiceGeneration.id, {
      status: "succeeded",
      output_path: finalAudioPath
    });

    if (input.kind === "preview") {
      await updateProject(input.project.id, {
        status: "preview_ready",
        preview_audio_path: finalAudioPath,
        payment_status: "unpaid"
      });
      await safelySend(input.project.id, () =>
        sendPreviewEmail(input.project.customer_email, input.project.id, input.accessTokenCiphertext)
      );
      return;
    }

    await updateProject(input.project.id, {
      status: "completed",
      full_audio_path: finalAudioPath,
      share_slug: input.project.share_slug ?? createShareSlug()
    });
    await safelySend(input.project.id, () =>
      sendCompletionEmail(input.project.customer_email, input.project.id, input.accessTokenCiphertext)
    );
  } finally {
    if (elevenLabsVoiceId) await deleteElevenLabsVoice(elevenLabsVoiceId);
  }
}

export async function continueProviderGeneration(input: {
  generationId: string;
  projectId: string;
  kind: GenerationKind;
  stage: "music" | "voice" | "video";
  outputUrl: string;
}) {
  const project = await getProject(input.projectId);
  if (!project) throw new Error("Project not found");
  const extension = input.stage === "video" ? "mp4" : "mp3";
  const storedPath = await storeRemoteAsset(
    input.projectId,
    `${input.kind}-${input.stage}`,
    input.outputUrl,
    extension
  );
  await updateGeneration(input.generationId, { status: "succeeded", output_path: storedPath });

  if (input.stage === "music") {
    const voiceUrl = await createSignedAssetUrl(project.voice_path, 3600);
    const sourceUrl = await createSignedAssetUrl(storedPath, 3600);
    const next = await createGeneration(project.id, input.kind, "voice");
    const submitted = await submitMediaJob({
      stage: "voice",
      project,
      kind: input.kind,
      generationId: next.id,
      sourceUrl: sourceUrl ?? input.outputUrl,
      voiceUrl: voiceUrl ?? undefined
    });
    await updateGeneration(next.id, { provider_job_id: submitted.providerJobId });
    return;
  }

  if (input.stage === "voice" && input.kind === "preview") {
    await updateProject(project.id, { status: "preview_ready", preview_audio_path: storedPath });
    await safelySend(project.id, () =>
      sendPreviewEmail(project.customer_email, project.id, project.access_token_ciphertext)
    );
    return;
  }

  if (input.stage === "voice") {
    await updateProject(project.id, { full_audio_path: storedPath });
    const sourceUrl = await createSignedAssetUrl(storedPath, 3600);
    const next = await createGeneration(project.id, input.kind, "video");
    const submitted = await submitMediaJob({
      stage: "video",
      project,
      kind: input.kind,
      generationId: next.id,
      sourceUrl: sourceUrl ?? input.outputUrl
    });
    await updateGeneration(next.id, { provider_job_id: submitted.providerJobId });
    return;
  }

  await updateProject(project.id, {
    status: "completed",
    video_path: storedPath,
    share_slug: project.share_slug ?? createShareSlug()
  });
  await safelySend(project.id, () =>
    sendCompletionEmail(project.customer_email, project.id, project.access_token_ciphertext)
  );
}

export async function failProject(projectId: string, kind: GenerationKind, error: unknown) {
  const message = error instanceof Error ? error.message : "Generation failed";
  await updateProject(projectId, {
    status: "failed",
    error_code: `${kind.toUpperCase()}_GENERATION_FAILED`,
    error_message: message.slice(0, 1000)
  });
  await addAuditEvent(projectId, `${kind}_generation_failed`, { message });
}

async function sendPreviewEmail(email: string, projectId: string, ciphertext: string) {
  const token = decryptSecret(ciphertext);
  await sendEmail({
    to: email,
    subject: "Your VoiceGift preview is ready",
    html: `<p>Your private preview is ready.</p><p><a href="${env.NEXT_PUBLIC_SITE_URL}/project/${projectId}?t=${encodeURIComponent(token)}">Open your song</a></p>`
  });
}

async function sendCompletionEmail(email: string, projectId: string, ciphertext: string) {
  const token = decryptSecret(ciphertext);
  await sendEmail({
    to: email,
    subject: "Your full VoiceGift song is ready",
    html: `<p>Your full song and lyric video are ready.</p><p><a href="${env.NEXT_PUBLIC_SITE_URL}/project/${projectId}?t=${encodeURIComponent(token)}">Download your files</a></p>`
  });
}

async function safelySend(projectId: string, send: () => Promise<void>) {
  try {
    await send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email failed";
    console.error("project email failed", projectId, error);
    await addAuditEvent(projectId, "email_delivery_failed", { message });
  }
}
