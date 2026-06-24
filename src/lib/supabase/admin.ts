import { createClient } from "@supabase/supabase-js";
import { env, isMockMode, supabaseUrl } from "@/lib/config";

export function createSupabaseAdmin() {
  if (isMockMode) return null;
  if (!supabaseUrl || !env.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase admin configuration is missing");
  }
  return createClient(supabaseUrl, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
