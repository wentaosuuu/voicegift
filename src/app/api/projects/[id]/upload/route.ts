import { authorizeProject } from "@/lib/project-access";
import { apiError, noStoreJson } from "@/lib/http";
import { createVoiceUpload } from "@/lib/storage";
import { uploadRequestSchema } from "@/lib/validation";
import { env, isMockMode, supabaseUrl } from "@/lib/config";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorizeProject(request, id);
    if (!auth) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
    const body = uploadRequestSchema.safeParse(await request.json());
    if (!body.success) return apiError("Unsupported voice file.", 422, "INVALID_FILE");
    const upload = await createVoiceUpload(id, body.data.fileName);
    return noStoreJson({
      ...upload,
      bucket: env.SUPABASE_AUDIO_BUCKET,
      mock: isMockMode,
      supabaseUrl: isMockMode ? null : supabaseUrl,
      supabaseKey: isMockMode ? null : env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error("voice upload initialization failed", error);
    return apiError("Could not prepare the upload.", 500, "UPLOAD_INIT_FAILED");
  }
}
