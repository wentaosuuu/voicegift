import { isMockMode } from "@/lib/config";
import { apiError } from "@/lib/http";

export async function PUT(request: Request) {
  if (!isMockMode) return apiError("Not found.", 404, "NOT_FOUND");
  await request.arrayBuffer();
  return new Response(null, { status: 200 });
}
