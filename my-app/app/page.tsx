import { ImagesList } from "@/app/components/ImagesList";
import { createClient } from "@/lib/supabase/server";
import type { Image } from "@/src/types/supabase";
import { redirect } from "next/navigation";

const IMAGES_TABLE = "images";

export const dynamic = "force-dynamic";

async function getImages(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{
  data: Image[];
  error: string | null;
}> {
  const { data, error } = await supabase.from(IMAGES_TABLE).select("*");
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Image[], error: null };
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: images, error } = await getImages(supabase);

  return (
    <main className="min-h-screen bg-[var(--background)] p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-[var(--foreground)]">
          Images
        </h1>
        <ImagesList images={images} error={error} />
      </div>
    </main>
  );
}
