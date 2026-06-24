"use client";

import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

export function AdminLogin({ supabaseUrl, supabaseKey }: { supabaseUrl?: string; supabaseKey?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const signIn = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setMessage("Supabase is not configured. Mock mode opens /admin directly.");
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` }
    });
    setMessage(error ? error.message : "Check your email for the secure admin link.");
  };
  return (
    <main className="page-shell">
      <section className="login-card">
        <p className="kicker">Restricted</p>
        <h1 className="serif">VoiceGift admin</h1>
        <p style={{ color: "var(--muted)" }}>Only emails listed in ADMIN_EMAILS are permitted.</p>
        <label className="field">Admin email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button className="button button-full" onClick={signIn}>Email me a sign-in link</button>
        {message ? <p>{message}</p> : null}
      </section>
    </main>
  );
}
