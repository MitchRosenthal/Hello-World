import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a Supabase client only when NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set. Otherwise returns null so the build
 * and page collection can succeed without env (e.g. CI or missing .env.local).
 * Uses createBrowserClient so the client reads/writes the same cookies as the
 * server, keeping session in sync after OAuth callback.
 */
export function getSupabase(): ReturnType<typeof createBrowserClient> | null {
  if (cached !== null) return cached;
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const url = rawUrl.trim().replace(/\s/g, "");
  const key = rawKey.trim().replace(/\s/g, "");
  if (!url || !key) return null;
  cached = createBrowserClient(url, key);
  return cached;
}
