import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { env, isMockMode } from "@/lib/config";

export async function requireAdmin() {
  if (isMockMode) return { email: "mock-admin@voicegift.local" };
  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/admin/login");
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  const allowed = new Set(env.ADMIN_EMAILS.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  if (!email || !allowed.has(email)) redirect("/admin/login");
  return { email };
}

export async function getAdminUser() {
  if (isMockMode) return { email: "mock-admin@voicegift.local" };
  const supabase = await createSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  const allowed = new Set(env.ADMIN_EMAILS.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  return email && allowed.has(email) ? { email } : null;
}
