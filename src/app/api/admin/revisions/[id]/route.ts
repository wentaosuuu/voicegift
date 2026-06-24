import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { apiError, noStoreJson } from "@/lib/http";
import { isMockMode } from "@/lib/config";
import { mockData } from "@/lib/mock-store";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({ status: z.enum(["requested", "in_progress", "completed", "rejected"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  const { id } = await context.params;
  const body = schema.safeParse(await request.json());
  if (!body.success) return apiError("Invalid revision status.", 422, "VALIDATION_ERROR");
  if (isMockMode) {
    const revision = mockData.revisions.find((item) => item.id === id);
    if (!revision) return apiError("Revision not found.", 404, "NOT_FOUND");
    revision.status = body.data.status;
  } else {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase!.from("revision_requests").update({ status: body.data.status }).eq("id", id);
    if (error) throw error;
  }
  return noStoreJson({ updated: true });
}
