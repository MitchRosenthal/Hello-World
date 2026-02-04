import { getSupabase } from "@/lib/supabase/client";
import type { Image } from "@/src/types/supabase";

const IMAGES_TABLE = "images";

/** Force server render per request so HTML matches client (avoids build-time empty state vs runtime data). */
export const dynamic = "force-dynamic";

async function getImages(): Promise<{
  data: Image[];
  error: string | null;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      data: [],
      error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    };
  }
  const { data, error } = await supabase.from(IMAGES_TABLE).select("*");

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Image[], error: null };
}

/** Resolve image URL from row (class DB may use `url` or `image_url`) */
function imageUrl(row: Image): string | null {
  const u = row.url ?? row.image_url;
  return typeof u === "string" ? u : null;
}

/** Resolve title/prompt for card (class DB may use `title` or `prompt`) */
function imageTitle(row: Image): string {
  const t = row.title ?? row.prompt;
  return typeof t === "string" && t ? t : "Image";
}

export default async function Home() {
  const { data: images, error } = await getImages();

  return (
    <main className="min-h-screen bg-[var(--background)] p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-[var(--foreground)]">
          Images
        </h1>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-700 dark:text-red-300">
            <p className="font-semibold">Supabase error</p>
            <p className="mt-1 font-mono text-sm">{error}</p>
            <p className="mt-2 text-sm opacity-90">
              Check .env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Use the class database; do not create tables.
            </p>
          </div>
        ) : images.length === 0 ? (
          <p className="text-[var(--foreground)]/70">
            No rows in the <code className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-sm">{IMAGES_TABLE}</code> table. The list is read-only.
          </p>
        ) : (
          <ul
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
          >
            {images.map((row) => {
              const src = imageUrl(row);
              const title = imageTitle(row);
              const date =
                typeof row.created_at === "string"
                  ? new Date(row.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : null;

              return (
                <li
                  key={row.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-[var(--foreground)]/10 bg-[var(--background)] shadow-md transition hover:shadow-lg"
                >
                  <div className="aspect-video w-full bg-[var(--foreground)]/5">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--foreground)]/40">
                        No image URL
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <h2 className="font-semibold text-[var(--foreground)] line-clamp-2">
                      {title}
                    </h2>
                    {date && (
                      <time
                        dateTime={typeof row.created_at === "string" ? row.created_at : undefined}
                        className="text-sm text-[var(--foreground)]/60"
                        suppressHydrationWarning
                      >
                        {date}
                      </time>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
