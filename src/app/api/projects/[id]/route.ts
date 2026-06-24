import { apiError, noStoreJson } from "@/lib/http";
import { authorizeProject } from "@/lib/project-access";
import { createSignedAssetUrl } from "@/lib/storage";
import { toPublicView } from "@/lib/repository";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorizeProject(request, id);
    if (!auth) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
    const [previewUrl, fullAudioUrl, videoUrl] = await Promise.all([
      createSignedAssetUrl(auth.project.preview_audio_path),
      createSignedAssetUrl(auth.project.full_audio_path),
      createSignedAssetUrl(auth.project.video_path)
    ]);
    return noStoreJson(toPublicView(auth.project, { previewUrl, fullAudioUrl, videoUrl }));
  } catch (error) {
    console.error("project status failed", error);
    return apiError("Could not load the project.", 500, "PROJECT_LOAD_FAILED");
  }
}
