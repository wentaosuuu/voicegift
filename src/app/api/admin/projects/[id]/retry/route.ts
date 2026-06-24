import { getAdminUser } from "@/lib/auth";
import { startGeneration } from "@/lib/generation";
import { apiError, noStoreJson } from "@/lib/http";
import { getProject, updateProject } from "@/lib/repository";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  const { id } = await context.params;
  const project = await getProject(id);
  if (!project) return apiError("Project not found.", 404, "NOT_FOUND");
  const kind = project.payment_status === "paid" ? "full" : "preview";
  await updateProject(id, { status: kind === "full" ? "full_queued" : "preview_queued" });
  await startGeneration(id, kind);
  return noStoreJson({ retried: true, kind });
}
