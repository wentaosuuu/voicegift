import { apiError, noStoreJson } from "@/lib/http";
import { authorizeProject } from "@/lib/project-access";
import { addAuditEvent, createRevisionRequest } from "@/lib/repository";
import { z } from "zod";

const schema = z.object({ requestText: z.string().trim().min(5).max(500) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorizeProject(request, id);
    if (!auth) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
    if (auth.project.status !== "completed" || auth.project.payment_status !== "paid") {
      return apiError("The completed paid song is required.", 409, "INVALID_STATE");
    }
    const body = schema.safeParse(await request.json());
    if (!body.success) return apiError("Describe the requested change.", 422, "VALIDATION_ERROR");
    const revision = await createRevisionRequest(id, body.data.requestText);
    await addAuditEvent(id, "revision_requested", { revisionId: revision.id });
    return noStoreJson({ requested: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Revision request failed";
    return apiError(message, message.includes("already") ? 409 : 500, "REVISION_FAILED");
  }
}
