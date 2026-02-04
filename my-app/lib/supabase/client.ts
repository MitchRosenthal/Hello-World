import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Returns a Supabase client only when NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set. Otherwise returns null so the build
 * and page collection can succeed without env (e.g. CI or missing .env.local).
 */
export function getSupabase(): SupabaseClient | null {
  if (cached !== null) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  cached = createClient(url, key);
  return cached;
}
