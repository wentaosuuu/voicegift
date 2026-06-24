import { cookies } from "next/headers";
import { getProject } from "@/lib/repository";
import { secureTokenMatch } from "@/lib/crypto";

export async function authorizeProject(request: Request, projectId: string) {
  const headerToken = request.headers.get("x-project-token");
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(`vg_${projectId}`)?.value;
  const token = headerToken ?? cookieToken;
  if (!token) return null;
  const project = await getProject(projectId);
  if (!project || !secureTokenMatch(token, project.access_token_hash)) return null;
  return { project, token };
}

export async function authorizeProjectToken(projectId: string, token: string | undefined) {
  if (!token) return null;
  const project = await getProject(projectId);
  if (!project || !secureTokenMatch(token, project.access_token_hash)) return null;
  return project;
}
