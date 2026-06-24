import { NextResponse } from "next/server";
import { authorizeProject } from "@/lib/project-access";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authorizeProject(request, id);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const response = NextResponse.json({ established: true });
  response.cookies.set(`vg_${id}`, auth.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/"
  });
  return response;
}
