import { env, isMockMode } from "@/lib/config";
import { apiError, noStoreJson } from "@/lib/http";
import { verifyVoiceSample } from "@/lib/providers/media";
import { authorizeProject } from "@/lib/project-access";
import { addAuditEvent, updateProject } from "@/lib/repository";
import { createSignedAssetUrl } from "@/lib/storage";
import { voiceCompleteSchema } from "@/lib/validation";
import { verifyVoiceChallenge } from "@/lib/crypto";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorizeProject(request, id);
    if (!auth) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
    const body = voiceCompleteSchema.safeParse(await request.json());
    if (!body.success || !body.data.path.startsWith(`projects/${id}/source/`)) {
      return apiError("Invalid voice upload.", 422, "INVALID_VOICE_PATH");
    }
    const phrase = verifyVoiceChallenge(body.data.challengeToken);
    const result = env.STRICT_VOICE_VERIFICATION
      ? await verifyVoiceSample({
          audioUrl: (await createSignedAssetUrl(body.data.path, 900)) ?? `${env.NEXT_PUBLIC_SITE_URL}/mock`,
          phrase
        })
      : { verified: true, confidence: 0.8 };
    if (!result.verified) {
      await addAuditEvent(id, "voice_verification_failed", { confidence: result.confidence });
      return apiError("We could not verify the phrase or audio quality.", 422, "VOICE_NOT_VERIFIED");
    }
    await updateProject(id, {
      voice_path: body.data.path,
      voice_verified_at: new Date().toISOString(),
      status: "preview_queued"
    });
    await addAuditEvent(id, "voice_verified", {
      confidence: result.confidence,
      mode: isMockMode ? "mock" : "live"
    });
    return noStoreJson({ verified: true });
  } catch (error) {
    console.error("voice completion failed", error);
    return apiError("Voice verification could not be completed.", 500, "VOICE_VERIFICATION_FAILED");
  }
}
