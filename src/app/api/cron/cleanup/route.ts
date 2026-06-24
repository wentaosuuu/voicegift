import { env } from "@/lib/config";
import { noStoreJson } from "@/lib/http";
import { addAuditEvent, listExpiredProjects, updateProject } from "@/lib/repository";
import { deleteProjectAssets } from "@/lib/storage";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected && request.headers.get("authorization") !== `Bearer ${expected}`) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }
  const projects = await listExpiredProjects();
  let deleted = 0;
  for (const project of projects) {
    try {
      await deleteProjectAssets(project.id);
      await updateProject(project.id, {
        status: "deleted",
        share_enabled: false,
        recipient_name: "Deleted",
        memory: "[deleted]",
        message: null,
        customer_email: `deleted+${project.id}@invalid.local`,
        voice_path: null,
        preview_audio_path: null,
        full_audio_path: null,
        video_path: null,
        lyrics: null,
        access_token_ciphertext: "[deleted]"
      });
      await addAuditEvent(project.id, "project_expired_and_deleted", {
        retentionDays: Math.round((new Date(project.expires_at).getTime() - new Date(project.created_at).getTime()) / 86400000)
      });
      deleted += 1;
    } catch (error) {
      console.error("cleanup failed", project.id, error);
    }
  }
  return noStoreJson({ scanned: projects.length, deleted, mode: env.APP_MODE });
}
