import { createOpaqueToken, encryptSecret, hashAccessToken } from "@/lib/crypto";
import { apiError, getClientIp, noStoreJson } from "@/lib/http";
import { addAuditEvent, consumeRateLimit, insertProject } from "@/lib/repository";
import { verifyTurnstile } from "@/lib/turnstile";
import { createProjectSchema } from "@/lib/validation";
import { moderateText } from "@/lib/moderation";

export async function POST(request: Request) {
  try {
    const body = createProjectSchema.safeParse(await request.json());
    if (!body.success) return apiError("Please check the song details.", 422, "VALIDATION_ERROR");
    const ip = getClientIp(request);
    const [captchaOk, rateLimitOk, moderation] = await Promise.all([
      safeCheck("turnstile", () => verifyTurnstile(body.data.turnstileToken, ip), true),
      safeCheck("rate_limit", () => consumeRateLimit(`create:${ip}`, 5, 3600), true),
      safeCheck("moderation", () => moderateText(`${body.data.recipientName}\n${body.data.memory}\n${body.data.message}`), {
        allowed: true
      })
    ]);
    if (!captchaOk) return apiError("Human verification failed.", 403, "CAPTCHA_FAILED");
    if (!rateLimitOk) return apiError("Too many attempts. Try again later.", 429, "RATE_LIMITED");
    if (!moderation.allowed) {
      return apiError("This request cannot be processed safely.", 422, "CONTENT_REJECTED");
    }

    const token = createOpaqueToken();
    const project = await insertProject({
      recipient_name: body.data.recipientName,
      occasion: body.data.occasion,
      memory: body.data.memory,
      message: body.data.message || null,
      music_style: body.data.musicStyle,
      customer_email: body.data.customerEmail.toLowerCase(),
      consent_version: "2026-06-22",
      accessTokenHash: hashAccessToken(token),
      accessTokenCiphertext: encryptSecret(token)
    });
    await addAuditEvent(project.id, "project_created", { ip });
    return noStoreJson(
      {
        projectId: project.id,
        accessToken: token,
        projectUrl: `/project/${project.id}?t=${encodeURIComponent(token)}`
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("create project failed", error);
    const message = error instanceof Error ? error.message : "Unknown server error";
    return apiError(`Could not create the song project: ${message}`, 500, "PROJECT_CREATE_FAILED");
  }
}

async function safeCheck<T>(label: string, check: () => Promise<T>, fallback: T) {
  try {
    return await check();
  } catch (error) {
    console.warn(`create project ${label} check skipped`, error);
    return fallback;
  }
}
