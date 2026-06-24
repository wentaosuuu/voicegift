import { apiError, noStoreJson } from "@/lib/http";
import { authorizeProject } from "@/lib/project-access";
import { createShareSlug } from "@/lib/crypto";
import { updateProject } from "@/lib/repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorizeProject(request, id);
    if (!auth) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
    if (auth.project.status !== "completed") return apiError("The full song is not ready.", 409, "NOT_READY");
    const body = (await request.json().catch(() => ({}))) as { enabled?: boolean };
    const enabled = body.enabled === true;
    const shareSlug = auth.project.share_slug ?? createShareSlug();
    await updateProject(id, { share_enabled: enabled, share_slug: shareSlug });
    return noStoreJson({ enabled, shareUrl: enabled ? `/s/${shareSlug}` : null });
  } catch (error) {
    console.error("share update failed", error);
    return apiError("Could not update sharing.", 500, "SHARE_UPDATE_FAILED");
  }
}
