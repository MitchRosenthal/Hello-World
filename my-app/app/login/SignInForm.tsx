"use client";

import { getSupabase } from "@/lib/supabase/client";
import { useState } from "react";

export function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    const { data, error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6">
        <h1 className="text-center text-2xl font-semibold">Sign in</h1>
        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full rounded-lg border px-4 py-3 disabled:opacity-50"
        >
          {loading ? "Redirecting…" : "Sign in with Google"}
        </button>
      </div>
    </main>
  );
}
