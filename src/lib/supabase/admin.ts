import { createClient } from "@supabase/supabase-js";
import { env, isMockMode } from "@/lib/config";

export function createSupabaseAdmin() {
  if (isMockMode) return null;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase admin configuration is missing");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
