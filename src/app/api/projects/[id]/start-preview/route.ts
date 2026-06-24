import { after } from "next/server";
import { startGeneration } from "@/lib/generation";
import { apiError, noStoreJson } from "@/lib/http";
import { authorizeProject } from "@/lib/project-access";

export const maxDuration = 300;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorizeProject(request, id);
    if (!auth) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
    if (!["preview_queued", "failed"].includes(auth.project.status)) {
      return apiError("Preview generation is already active.", 409, "INVALID_STATE");
    }
    after(async () => {
      try {
        await startGeneration(id, "preview");
      } catch (error) {
        console.error("background preview generation failed", error);
      }
    });
    return noStoreJson({ accepted: true }, { status: 202 });
  } catch (error) {
    console.error("start preview failed", error);
    return apiError("Could not start the preview.", 500, "PREVIEW_START_FAILED");
  }
}
