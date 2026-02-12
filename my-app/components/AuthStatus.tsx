"use client";

import { getSupabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <span className="text-sm text-[var(--foreground)]/60">Loading…</span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--foreground)]/80">
          Signed in as {user.email ?? "user"}
        </span>
        <button
          type="button"
          onClick={async () => {
            const supabase = getSupabase();
            if (supabase) await supabase.auth.signOut();
            window.location.href = "/auth/signout";
          }}
          className="rounded-lg border border-[var(--foreground)]/20 px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--foreground)]/5"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${location.origin}/auth/callback`,
            queryParams: { prompt: "select_account" },
          },
        });
        if (data?.url) window.location.href = data.url;
      }}
      className="rounded-lg border border-[var(--foreground)]/20 px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--foreground)]/5"
    >
      Sign in with Google
    </button>
  );
}
