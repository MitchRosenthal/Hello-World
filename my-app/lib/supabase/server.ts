import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = options && typeof options === "object" ? { ...options } : {};
              delete (opts as Record<string, unknown>).name;
              cookieStore.set(name, value, opts);
            });
          } catch {
            // Cookies are read-only during Server Component render; ignore when Supabase tries to refresh session.
          }
        },
      },
    }
  );
}
