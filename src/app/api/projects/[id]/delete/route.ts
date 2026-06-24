import { apiError, noStoreJson } from "@/lib/http";
import { authorizeProject } from "@/lib/project-access";
import { addAuditEvent, updateProject } from "@/lib/repository";
import { deleteProjectAssets } from "@/lib/storage";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorizeProject(request, id);
    if (!auth) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
    await updateProject(id, { status: "deletion_requested", share_enabled: false });
    await deleteProjectAssets(id);
    await updateProject(id, {
      status: "deleted",
      recipient_name: "Deleted",
      memory: "[deleted]",
      message: null,
      customer_email: `deleted+${id}@invalid.local`,
      voice_path: null,
      preview_audio_path: null,
      full_audio_path: null,
      video_path: null,
      lyrics: null,
      access_token_ciphertext: "[deleted]"
    });
    await addAuditEvent(id, "project_deleted");
    return noStoreJson({ deleted: true });
  } catch (error) {
    console.error("project deletion failed", error);
    return apiError("Could not delete the project.", 500, "DELETE_FAILED");
  }
}
