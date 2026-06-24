import { AdminLogin } from "@/components/admin-login";

export default function AdminLoginPage() {
  return (
    <AdminLogin
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
      supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
    />
  );
}
