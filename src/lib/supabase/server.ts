import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, isMockMode, supabaseUrl } from "@/lib/config";

export async function createSupabaseServer() {
  if (isMockMode || !supabaseUrl || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot always write cookies; proxy.ts refreshes sessions.
          }
        }
      }
    }
  );
}
