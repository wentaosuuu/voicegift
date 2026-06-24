import { env } from "@/lib/config";
import { continueProviderGeneration, failProject } from "@/lib/generation";
import { noStoreJson } from "@/lib/http";
import { findGenerationByProviderJob, updateGeneration } from "@/lib/repository";
import { providerWebhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== env.PROVIDER_WEBHOOK_SECRET) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }
  const body = providerWebhookSchema.safeParse(await request.json());
  if (!body.success) return noStoreJson({ error: "invalid payload" }, { status: 422 });
  const existing = await findGenerationByProviderJob(body.data.providerJobId);
  if (!existing) return noStoreJson({ error: "unknown job" }, { status: 404 });
  if (existing.status === "succeeded") return noStoreJson({ received: true, idempotent: true });
  if (body.data.status === "failed" || !body.data.outputUrl) {
    await updateGeneration(existing.id, {
      status: "failed",
      error_message: body.data.error ?? "Provider job failed"
    });
    await failProject(body.data.projectId, body.data.kind, body.data.error ?? "Provider job failed");
    return noStoreJson({ received: true });
  }
  await continueProviderGeneration({
    generationId: existing.id,
    projectId: body.data.projectId,
    kind: body.data.kind,
    stage: body.data.stage,
    outputUrl: body.data.outputUrl
  });
  return noStoreJson({ received: true });
}
